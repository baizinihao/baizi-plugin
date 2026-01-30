import plugin from '../../../lib/plugins/plugin.js';

export default class 光遇叫声 extends plugin {
  constructor() {
    super({
      name: '光遇叫声',
      event: 'message',
      priority: 9999,
      rule: [
        { reg: /^#?随机光遇叫声$/, fnc: 'skySound' },
        { reg: /^#?光遇叫声$/, fnc: 'skySound' }
      ]
    });
  }

  async skySound(e) {
    const pre = e.msg.startsWith('#') ? '#' : '';
    try {
      const res = await fetch('http://baizihaoxiao.xin/API/sky3.php');
      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      await e.reply(`${pre}[CQ:voice,base64=${base64}]`);
    } catch {
      await e.reply(`${pre}光遇叫声获取失败，请稍后再试～`);
    }
  }
}