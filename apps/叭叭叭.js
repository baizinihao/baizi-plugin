import plugin from '../../../lib/plugins/plugin.js';

const CONFIG = {
  skyVoiceUrl: 'http://baizihaoxiao.xin/API/sky3.php',
  triggerCmds: ['光遇叫声', '随机光遇叫声', '#光遇叫声', '#随机光遇叫声']
};

export default class SkyVoiceAPI extends plugin {
  constructor() {
    super({
      name: '光遇叫声API',
      dsc: '调用光遇随机叫声接口，返回音频',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: new RegExp(`^(${CONFIG.triggerCmds.join('|')})$`),
          fnc: 'sendSkyVoice'
        }
      ]
    });
  }

  async sendSkyVoice(e) {
    try {
      const res = await fetch(CONFIG.skyVoiceUrl, { timeout: 15000 });
      if (!res.ok) throw new Error(`接口请求失败，状态码：${res.status}`);
      await e.reply([segment.record(res.url)]);
    } catch (err) {
      logger.error(`[光遇叫声API] 调用失败：`, err);
      await e.reply('光遇叫声获取失败，请稍后重试~');
    }
  }
}