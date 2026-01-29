import plugin from '../../../lib/plugins/plugin.js'

export class LeadAhead extends plugin {
  constructor() {
    super({
      name: '遥遥领先',
      dsc: '有很严重的杂音',
      event: 'message',
      priority: -10,
      rule: [
        {
          reg: '^#?遥遥领先$',
          fnc: 'playAudio'
        }
      ]
    })
  }

  async playAudio(e) {
    logger.info('[遥遥领先.js]')
    let url = encodeURI(`https://img.kookapp.cn/attachments/2023-09/14/65027028d1a83.mp3`)
    await this.e.reply(segment.record(url))
  }
}
