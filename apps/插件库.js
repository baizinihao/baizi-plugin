import plugin from '../../../lib/plugins/plugin.js'
export class example extends plugin {
  constructor () {
    super({
      name: '插件库',
      dsc: 'MD跳转插件库',
      event: 'message',
      priority: -114514,
      rule: [
        {
          reg: '^#?插件库$',
          fnc: 'cjk'
        }
      ]
    })
  }
  
  async cjk(e) {
    e.reply(
      "「云崽插件索引库」：https://gitee.com/yhArcadia/Yunzai-Bot-plugins-index", true, { recallMsg: 30 });
    return;
  }
}
