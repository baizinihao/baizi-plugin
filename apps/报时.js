import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';

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

const saveConfig = (newConfig) => {
  CONFIG = { ...CONFIG, ...newConfig };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG, null, 2));
};

const scheduleHourlyPush = () => {
  const now = new Date();
  const nextHour = new Date(now.setHours(now.getHours() + 1, 0, 0, 0));
  const delay = nextHour - Date.now();

  setTimeout(async () => {
    if (CONFIG.autoPush.enable && CONFIG.autoPush.groupList.length > 0) {
      const url = CONFIG.defaultType === 'male' ? CONFIG.maleUrl : CONFIG.femaleUrl;
      const uniqueGroups = [...new Set(CONFIG.autoPush.groupList)];
      for (const gid of uniqueGroups) {
        try {
          const res = await fetch(url, { timeout: 15000 });
          if (res.ok) await Bot.sendGroupMsg(gid, [segment.record(res.url)]);
        } catch (err) {
          logger.error(`[整点报时] 群${gid}推送失败：`, err);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    scheduleHourlyPush();
  }, delay);
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
    scheduleHourlyPush();
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
    e.reply('已添加当前群到整点报时推送列表');
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
    e.reply(`【整点报时推送群列表】\n- ${groups}\n当前自动推送版本：${CONFIG.defaultType === 'male' ? '男版' : '女版'}`);
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
      e.reply(`报时测试推送完成！\n当前推送版本：${CONFIG.defaultType === 'male' ? '男版' : '女版'}\n成功：${success}个群\n失败：${fail}个群`);
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
    e.reply(`已成功切换自动推送版本为：${type}`);
  }
}