import plugin from '../../../lib/plugins/plugin.js'
import axios from 'axios'
import segment from '../../../lib/segment.js'

export class SkySound extends plugin {
  constructor() {
    super({
      name: '光遇随机叫声',
      dsc: '光遇叫声/随机光遇叫声，带/不带#均可触发',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: '^#?光遇叫声$', fnc: 'getSound' },
        { reg: '^#?随机光遇叫声$', fnc: 'getSound' }
      ]
    })
  }

  async getSound(e) {
    try {
      await e.reply('正在获取光遇叫声～', true)
      // 硬编码调用你的接口，5秒超时
      const res = await axios.get('http://baizihaoxiao.xin/API/sky3.php', {
        timeout: 5000,
        responseType: 'text'
      })
      // 清洗链接（去空格/换行/空字符）
      const audioUrl = res.data.replace(/\s|\n|\r/g, '').trim()
      // 校验有效音频链接
      if (!audioUrl || !audioUrl.startsWith('http')) {
        return await e.reply('获取失败，接口未返回有效音频链接', true)
      }
      // 发送音频（TRSS原生segment）
      await e.reply([segment.audio(audioUrl)])
    } catch (err) {
      await e.reply(`获取失败：${err.message || '网络/接口异常'}`, true)
    }
  }
}