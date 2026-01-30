import plugin from '../../../lib/plugins/plugin.js'
import axios from 'axios'

export class SkySound extends plugin {
  constructor() {
    super({
      name: '光遇随机叫声',
      dsc: '光遇叫声/随机光遇叫声',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: '^#?光遇叫声$', fnc: 'getSound' },
        { reg: '^#?随机光遇叫声$', fnc: 'getSound' }
      ]
    })
  }

  async getSound(e) {
    // 直接请求接口，无任何多余配置
    const res = await axios.get('http://baizihaoxiao.xin/API/sky3.php', {timeout:10000})
    // 直接构造MP3音频CQ码，强制不转义（核心）
    await e.reply(`[CQ:audio,url=${res.data.trim()}]`, true)
  }
}