import plugin from '../../../lib/plugins/plugin.js';
export class ZanzhuPlugin extends plugin {
  constructor() {
    super({
      name: '投喂榜',
      dsc: '测试加载',
      event: 'message',
      priority: -1,
      rule: [{reg: '#测试投喂榜', fnc: 'test'}]
    });
  }
  async test(e) {
    await e.reply('插件加载成功！');
  }
}