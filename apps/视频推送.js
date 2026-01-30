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

const saveConfig = (newConfig) => {
  CONFIG = { ...CONFIG, ...newConfig };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG, null, 2));
  SceneryVideo.initPushTimer();
};

// 带浏览器请求头（防反爬）+ 超时的fetch，适配直返视频API
const fetchWithTimeout = async (url, timeout = 20000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'http://baizihaoxiao.xin/',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      }
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

export default class SceneryVideo extends plugin {
  static pushTimer = null;

  constructor() {
    super({
      name: '风景视频API',
      dsc: '获取随机风景视频，默认1小时定时推送，支持手动触发和推送管理',
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
    SceneryVideo.initPushTimer();
  }

  static initPushTimer() {
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }
    this.schedulePushJob();
  }

  static schedulePushJob() {
    if (!CONFIG.autoPush.groupList.length || CONFIG.autoPush.interval < 1) return;
    const now = new Date();
    const intervalMs = CONFIG.autoPush.interval * 60 * 1000;
    const nextPush = new Date(now.getTime() + intervalMs - (now.getTime() % intervalMs));
    const delay = nextPush - now;
    this.pushTimer = setTimeout(async () => {
      try {
        await this.doPush();
      } catch (err) {
        logger.error('[风景视频推送] 执行失败：', err);
      } finally {
        this.schedulePushJob();
      }
    }, delay);
  }

  static async doPush() {
    if (CONFIG.autoPush.isRunning) return;
    CONFIG.autoPush.isRunning = true;
    const uniqueGroups = [...new Set(CONFIG.autoPush.groupList)].filter(Boolean);
    if (!uniqueGroups.length) {
      CONFIG.autoPush.isRunning = false;
      return;
    }
    try {
      const res = await fetchWithTimeout(CONFIG.videoUrl);
      if (!res.ok) throw new Error(`状态码：${res.status}`);
      const videoUrl = res.url; // 直取视频链接
      for (const gid of uniqueGroups) {
        try {
          await Bot.sendGroupMsg(gid, [segment.video(videoUrl)]);
          logger.info(`[风景视频推送] 群${gid}推送成功`);
        } catch (err) {
          logger.error(`[风景视频推送] 群${gid}推送失败：`, err);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      logger.error(`[风景视频推送] 接口调用失败：`, err);
    } finally {
      CONFIG.autoPush.isRunning = false;
    }
  }

  async sendVideo(e) {
    try {
      const res = await fetchWithTimeout(CONFIG.videoUrl);
      if (!res.ok) throw new Error(`状态码：${res.status}`);
      await e.reply([segment.video(res.url)]); // 直取视频链接
    } catch (err) {
      logger.error(`[风景视频] 手动调用失败：`, err);
      await e.reply('风景视频获取失败，请稍后重试~');
    }
  }

  async addPushGroup(e) {
    if (!e.group) return e.reply('仅群聊可用');
    const gid = String(e.group_id);
    if (CONFIG.autoPush.groupList.includes(gid)) return e.reply('当前群已在风景推送列表');
    const newGroupList = [...CONFIG.autoPush.groupList, gid];
    saveConfig({ autoPush: { ...CONFIG.autoPush, groupList: newGroupList } });
    e.reply('已添加当前群到风景推送列表（默认1小时推送一次）');
  }

  async delPushGroup(e) {
    if (!e.group) return e.reply('仅群聊可用');
    const gid = String(e.group_id);
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
- 推送间隔：${CONFIG.autoPush.interval}分钟
- 推送群列表：
- ${groups}`);
  }

  async testPush(e) {
    const groupList = [...new Set(CONFIG.autoPush.groupList)].filter(Boolean);
    if (!groupList.length) return e.reply('暂无风景推送群，无法测试');
    try {
      const res = await fetchWithTimeout(CONFIG.videoUrl);
      if (!res.ok) throw new Error(`接口请求失败，状态码：${res.status}`);
      const videoUrl = res.url;
      let success = 0, fail = 0;
      for (const gid of groupList) {
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
当前推送间隔：${CONFIG.autoPush.interval}分钟
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
      return e.reply('请输入10-1440之间的数字（单位：分钟），例：设置风景推送间隔60');
    }
    saveConfig({ autoPush: { ...CONFIG.autoPush, interval } });
    e.reply(`已设置风景推送间隔为${interval}分钟，将按整间隔精准推送`);
  }
}