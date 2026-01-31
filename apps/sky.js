import plugin from '../../../lib/plugins/plugin.js';

const CONFIG = {
  skyVoiceUrl: 'http://baizihaoxiao.xin/API/sky4.php',
  supportRoles: ['欧若拉', '绊爱']
};

export default class SkyVoiceAPI extends plugin {
  constructor() {
    super({
      name: '光遇叫声API',
      dsc: '获取光遇指定角色叫声音频',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: new RegExp(`^#?光遇叫声(${CONFIG.supportRoles.join('|')})$`),
          fnc: 'sendSkyVoice'
        }
      ]
    });
  }

  async sendSkyVoice(e) {
    try {
      const match = e.msg.match(new RegExp(`^#?光遇叫声(${CONFIG.supportRoles.join('|')})$`));
      const role = match[1];
      const reqUrl = `${CONFIG.skyVoiceUrl}?yn=${encodeURIComponent(role)}`;
      
      const res = await fetch(reqUrl, { timeout: 15000 });
      if (!res.ok) throw new Error(`状态码：${res.status}`);
      
      await e.reply([segment.record(reqUrl)]);
    } catch (err) {
      logger.error(`[光遇叫声API] 调用失败：`, err);
      await e.reply('光遇叫声获取失败，请稍后重试~');
    }
  }
}