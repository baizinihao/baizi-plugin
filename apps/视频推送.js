import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.resolve(process.cwd(), './plugins/baizi-plugin/apps/config/风景视频.json');

const initConfig = () => {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      videoUrl: 'http://baizihaoxiao.xin/API/feng.php',
      autoPush: {
        groupList: [],
        interval: 60,
        isRunning: false
      },
      triggerCmds: ['风景视频', '#风景视频']
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
};

let CONFIG = initConfig();
let pushTimer = null;
let isPushing = false;

const saveConfig = (newConfig) => {
  CONFIG = { ...CONFIG, ...newConfig };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG, null, 2));
  restartPushJob();
};

const getNextPushTime = () => {
  const now = new Date();
  const intervalMin = CONFIG.autoPush.interval;
  const nextTime = new Date(now);
  if (intervalMin >= 60) {
    nextTime.setMinutes(0, 0, 0);
    nextTime.setHours(nextTime.getHours() + Math.ceil(intervalMin / 60));
  } else {
    nextTime.setMinutes(Math.ceil(now.getMinutes() / intervalMin) * intervalMin, 0, 0);
    if (nextTime.getMinutes() === 60) {
      nextTime.setHours(nextTime.getHours() + 1);
      nextTime.setMinutes(0);
    }
  }
  return nextTime;
};

const startPushJob = () => {
  if (CONFIG.autoPush.groupList.length === 0 || pushTimer) return;
  const nextTime = getNextPushTime();
  const delay = nextTime - Date.now();
  logger.info(`[风景视频] 下次推送时间：${nextTime.toLocaleString()}，延迟：${Math.round(delay/1000)}秒`);
  
  pushTimer = setTimeout(async () => {
    if (isPushing) return;
    isPushing = true;
    try {
      const res = await fetch(CONFIG.videoUrl, { timeout: 20000 });
      if (!res.ok) throw new Error(`状态码：${res.status}`);
      const videoUrl = res.url;
      const uniqueGroups = [...new Set(CONFIG.autoPush.groupList)];
      for (const gid of uniqueGroups) {
        try {
          await Bot.sendGroupMsg(gid, [segment.video(videoUrl)]);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          logger.error(`[风景视频推送] 群${gid}推送失败：`, err);
        }
      }
    } catch (err) {
      logger.error(`[风景视频推送] 接口调用失败：`, err);
    } finally {
      isPushing = false;
      pushTimer = null;
      startPushJob();
    }
  }, delay);
};

const stopPushJob = () => {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  isPushing = false;
};

const restartPushJob = () => {
  stopPushJob();
  startPushJob();
};

export default class SceneryVideo extends plugin {
  constructor() {
    super({
      name: '风景视频API',
      dsc: '获取随机风景视频，整点定时推送，支持手动触发和推送管理',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: new RegExp(`^(${CONFIG.triggerCmds.join('|')})$`), fnc: 'sendVideo' },
        { reg: '^加风景推送$', fnc: 'addPushGroup', permission: 'master' },
        { reg: '^删风景推送$', fnc: 'delPushGroup', permission: 'master' },
        { reg: '^查看风景推送群$', fnc: 'showPushGroups', permission: 'master' },
        { reg: '^风景推送测试$', fnc: 'testPush', permission: 'master' },
        { reg: '^设置风景推送间隔.*$', fnc: 'setPushInterval', permission: 'master' }
      ]
    });
    startPushJob();
  }

  async sendVideo(e) {
    try {
      const res = await fetch(CONFIG.videoUrl, { timeout: 20000 });
      if (!res.ok) throw new Error(`状态码：${res.status}`);
      await e.reply([segment.video(res.url)]);
    } catch (err) {
      logger.error(`[风景视频] 调用失败：`, err);
      await e.reply('风景视频获取失败，请稍后重试~');
    }
  }

  async addPushGroup(e) {
    if (!e.group) return e.reply('仅群聊可用');
    const gid = e.group_id.toString();
    if (CONFIG.autoPush.groupList.includes(gid)) return e.reply('当前群已在风景推送列表');
    const newGroupList = [...CONFIG.autoPush.groupList, gid];
    saveConfig({ autoPush: { ...CONFIG.autoPush, groupList: newGroupList } });
    e.reply('已添加当前群到风景推送列表，将在整点开始推送');
  }

  async delPushGroup(e) {
    if (!e.group) return e.reply('仅群聊可用');
    const gid = e.group_id.toString();
    const newGroupList = CONFIG.autoPush.groupList.filter(id => id !== gid);
    if (newGroupList.length === CONFIG.autoPush.groupList.length) return e.reply('当前群不在风景推送列表');
    saveConfig({ autoPush: { ...CONFIG.autoPush, groupList: newGroupList } });
    e.reply('已从风景推送列表移除当前群');
  }

  async showPushGroups(e) {
    const groups = CONFIG.autoPush.groupList.length 
      ? CONFIG.autoPush.groupList.join('\n- ') 
      : '无';
    e.reply(`【风景视频推送配置】
- 推送间隔：${CONFIG.autoPush.interval}分钟（整点推送）
- 推送群列表：
- ${groups}`);
  }

  async testPush(e) {
    if (CONFIG.autoPush.groupList.length === 0) return e.reply('暂无风景推送群，无法测试');
    try {
      const res = await fetch(CONFIG.videoUrl, { timeout: 20000 });
      if (!res.ok) throw new Error(`状态码：${res.status}`);
      const videoUrl = res.url;
      const uniqueGroups = [...new Set(CONFIG.autoPush.groupList)];
      let success = 0, fail = 0;
      for (const gid of uniqueGroups) {
        try {
          await Bot.sendGroupMsg(gid, [segment.video(videoUrl)]);
          success++;
        } catch (err) {
          logger.error(`[风景推送测试] 群${gid}推送失败：`, err);
          fail++;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      e.reply(`风景推送测试完成！
当前推送间隔：${CONFIG.autoPush.interval}分钟（整点）
成功：${success}个群
失败：${fail}个群`);
    } catch (err) {
      logger.error(`[风景推送测试] 接口调用失败：`, err);
      e.reply('风景视频接口调用失败，无法测试推送~');
    }
  }

  async setPushInterval(e) {
    const interval = parseInt(e.msg.replace('设置风景推送间隔', '').trim());
    if (isNaN(interval) || interval < 10 || interval > 1440) {
      return e.reply('请输入10-1440之间的数字（单位：分钟），例：设置风景推送间隔60（默认1小时）');
    }
    saveConfig({ autoPush: { ...CONFIG.autoPush, interval } });
    e.reply(`已设置风景推送间隔为${interval}分钟，将在整点开始推送`);
  }
}