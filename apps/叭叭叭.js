import plugin from '../../../lib/plugins/plugin.js'
import axios from 'axios'
import segment from '../../../lib/segment.js'

export class SkyRandomSound extends plugin {
  constructor() {
    super({
      name: '光遇随机叫声',
      dsc: '光遇随机叫声',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#?(随机)?光遇叫声$',
          fnc: 'getSkySound'
        }
      ]
    })
  }

  async getSkySound(e) {
    try {
      const res = await axios.get('http://baizihaoxiao.xin/API/sky3.php', {timeout:5000})
      const audioUrl = res.data.trim()
      if (!audioUrl) return await e.reply('获取失败，接口未返回有效音频链接')
      await e.reply([segment.audio(audioUrl)])
    } catch (err) {
      await e.reply(`光遇叫声获取失败：${err.message || '网络/接口异常'}`)
    }
  }
}