import plugin from '../../../lib/plugins/plugin.js';
export class AddZanzhuPlugin extends plugin {
  constructor() {
    super({
      name: '投喂配置',
      dsc: '测试加载',
      event: 'message',
      priority: 1,
      rule: [{reg: '#测试配置', fnc: 'test'}]
    });
  }
  async test(e) {
    await e.reply('配置插件加载成功！');
  }
}