import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';
import { segment, logger, Bot } from 'koishi'; // 补全koishi内置对象

const CONFIG_PATH = path.resolve(process.cwd(), './plugins/baizi-plugin/apps/config/报时.json');

const initConfig = () => {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      maleUrl: 'http://baizihaoxiao.xin/API/bl2.php',
      femaleUrl: 'http://baizihaoxiao.xin/API/bl.php',
      defaultType: 'male',
      autoPush: { enable: true, groupList: [] },
      triggerCmds: ['整点报时', '#整点报时', '女版整点报时', '#女版整点报时']
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
};

let CONFIG = initConfig();
let scheduleTimer = null; // 单例定时器，防止重复任务
let isReporting = false; // 全局推送锁，防止重复发送

const saveConfig = (newConfig) => {
  CONFIG = { ...CONFIG, ...newConfig };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG, null, 2));
  restartSchedule(); // 配置变更，重新调度
};

// 计算下一个整点的时间
const getNextHour = () => {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0); // 下一个整点，分秒毫秒置0
  return nextHour;
};

// 整点调度核心方法（单例保障）
const scheduleHourlyPush = () => {
  if (scheduleTimer) return; // 已有定时器，直接返回，防止重复
  const nextHour = getNextHour();
  const delay = nextHour - Date.now();
  logger.info(`[整点报时] 下次整点推送：${nextHour.toLocaleString()}，延迟：${Math.round(delay/1000)}秒`);

  scheduleTimer = setTimeout(async () => {
    if (!CONFIG.autoPush.enable || CONFIG.autoPush.groupList.length === 0 || isReporting) {
      scheduleTimer = null;
      scheduleHourlyPush();
      return;
    }
    isReporting = true;
    try {
      const url = CONFIG.defaultType === 'male' ? CONFIG.maleUrl : CONFIG.femaleUrl;
      const uniqueGroups = [...new Set(CONFIG.autoPush.groupList)];
      // 逐群推送，增加间隔避免风控，且先预取音频链接（避免重复请求接口）
      let audioUrl = '';
      const res = await fetch(url, { timeout: 15000 });
      if (res.ok) audioUrl = res.url;
      if (!audioUrl) throw new Error('音频链接获取失败');

      for (const gid of uniqueGroups) {
        try {
          await Bot.sendGroupMsg(gid, [segment.record(audioUrl)]);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒间隔，防止刷屏
        } catch (err) {
          logger.error(`[整点报时] 群${gid}推送失败：`, err);
        }
      }
    } catch (err) {
      logger.error(`[整点报时] 推送失败：`, err);
    } finally {
      isReporting = false;
      scheduleTimer = null;
      scheduleHourlyPush(); // 调度下一个整点
    }
  }, delay);
};

// 停止调度
const stopSchedule = () => {
  if (scheduleTimer) {
    clearTimeout(scheduleTimer);
    scheduleTimer = null;
  }
  isReporting = false;
};

// 重启调度
const restartSchedule = () => {
  stopSchedule();
  scheduleHourlyPush();
};

export default class HourlyReport extends plugin {
  constructor() {
    super({
      name: '整点报时API',
      dsc: '整点自动推送报时音频，支持男/女版，手动触发和群推送管理',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: new RegExp(`^(${CONFIG.triggerCmds.join('|')})$`), fnc: 'sendReport' },
        { reg: '^加整点报时$', fnc: 'addPushGroup', permission: 'master' },
        { reg: '^删整点报时$', fnc: 'delPushGroup', permission: 'master' },
        { reg: '^查看整点报时群$', fnc: 'showPushGroups', permission: 'master' },
        { reg: '^报时测试$', fnc: 'testPush', permission: 'master' },
        { reg: '^切换报时版本.*$', fnc: 'switchType', permission: 'master' }
      ]
    });
    scheduleHourlyPush(); // 初始化启动单例调度
  }

  async sendReport(e) {
    try {
      let url = CONFIG.maleUrl;
      if (e.msg.includes('女版')) url = CONFIG.femaleUrl;
      const res = await fetch(url, { timeout: 15000 });
      if (!res.ok) throw new Error(`状态码：${res.status}`);
      await e.reply([segment.record(res.url)]);
    } catch (err) {
      logger.error(`[整点报时] 调用失败：`, err);
      await e.reply('报时音频获取失败，请稍后重试~');
    }
  }

  async addPushGroup(e) {
    if (!e.group) return e.reply('仅群聊可用');
    const gid = e.group_id.toString();
    if (CONFIG.autoPush.groupList.includes(gid)) return e.reply('当前群已在整点报时推送列表');
    const newGroupList = [...CONFIG.autoPush.groupList, gid];
    saveConfig({ autoPush: { ...CONFIG.autoPush, groupList: newGroupList } });
    e.reply('已添加当前群到整点报时推送列表，将在下次整点推送');
  }

  async delPushGroup(e) {
    if (!e.group) return e.reply('仅群聊可用');
    const gid = e.group_id.toString();
    const newGroupList = CONFIG.autoPush.groupList.filter(id => id !== gid);
    if (newGroupList.length === CONFIG.autoPush.groupList.length) return e.reply('当前群不在整点报时推送列表');
    saveConfig({ autoPush: { ...CONFIG.autoPush, groupList: newGroupList } });
    e.reply('已从整点报时推送列表移除当前群');
  }

  async showPushGroups(e) {
    const groups = CONFIG.autoPush.groupList.length 
      ? CONFIG.autoPush.groupList.join('\n- ') 
      : '无';
    e.reply(`【整点报时推送群列表】
- ${groups}
当前自动推送版本：${CONFIG.defaultType === 'male' ? '男版' : '女版'}
自动推送状态：${CONFIG.autoPush.enable ? '开启' : '关闭'}`);
  }

  async testPush(e) {
    if (CONFIG.autoPush.groupList.length === 0) return e.reply('暂无整点报时推送群，无法测试');
    try {
      const url = CONFIG.defaultType === 'male' ? CONFIG.maleUrl : CONFIG.femaleUrl;
      const res = await fetch(url, { timeout: 15000 });
      if (!res.ok) throw new Error(`接口请求失败，状态码：${res.status}`);
      const audioUrl = res.url;
      const uniqueGroups = [...new Set(CONFIG.autoPush.groupList)];
      let success = 0, fail = 0;
      for (const gid of uniqueGroups) {
        try {
          await Bot.sendGroupMsg(gid, [segment.record(audioUrl)]);
          success++;
        } catch (err) {
          logger.error(`[整点报时测试] 群${gid}推送失败：`, err);
          fail++;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      e.reply(`报时测试推送完成！
当前推送版本：${CONFIG.defaultType === 'male' ? '男版' : '女版'}
成功：${success}个群
失败：${fail}个群`);
    } catch (err) {
      logger.error(`[整点报时测试] 接口调用失败：`, err);
      e.reply('报时音频接口调用失败，无法测试推送~');
    }
  }

  async switchType(e) {
    const type = e.msg.replace('切换报时版本', '').trim();
    if (!['男版', '女版'].includes(type)) return e.reply('请输入正确版本，例：切换报时版本男版 / 切换报时版本女版');
    const newType = type === '男版' ? 'male' : 'female';
    saveConfig({ defaultType: newType });
    e.reply(`已成功切换自动推送版本为：${type}，下次整点生效`);
  }
}