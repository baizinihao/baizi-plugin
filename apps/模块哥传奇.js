import plugin from '../../../lib/plugins/plugin.js'

export class PracticeMore extends plugin {
  constructor() {
    super({
      name: '模块哥传奇',
      dsc: '模块哥传奇',
      event: 'message',
      priority: -10,
      rule: [
        {
          reg: '^#?(模块|模块哥)传奇$',
          fnc: 'practiceMore'
        }
      ]
    })
  }

  async practiceMore(e) {
    logger.info('[baizi-plugin]')
    let voiceFilePath = process.cwd() + "/plugins/baizi-plugin/resources/voice/模块哥传奇.mp3"
    await this.e.reply(segment.record(voiceFilePath))
    let msg = "云端不是最强的，模块才是王道"
    await this.e.reply(msg, true, { at: true })
    return true
  }
}
