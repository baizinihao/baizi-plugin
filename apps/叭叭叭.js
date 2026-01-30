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
    try {
      // 直接调用接口，极简配置（和你手动访问完全一致）
      const res = await axios.get('http://baizihaoxiao.xin/API/sky3.php', {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      // 仅做简单去空格，完全保留接口返回的链接
      const audioUrl = res.data.trim()
      // 直接构造音频CQ码，加true关闭转义（核心修复！）
      await e.reply(`[CQ:audio,url=${audioUrl}]`, true)
    } catch (err) {
      // 极简错误提示，接口正常则不会走到这步
      await e.reply(`获取失败：${err.message}`)
    }
  }
}