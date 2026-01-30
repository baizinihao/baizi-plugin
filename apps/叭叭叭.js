import plugin from '@/lib/plugins/plugin.js';

export default class 光遇叫声 extends plugin {
  constructor() {
    super({
      name: '光遇随机叫声',
      dsc: '调用接口返回光遇叫声，支持多指令触发',
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
      const data = await res.text();
      await e.reply(pre + (data || '光遇叫声～'));
    } catch {
      await e.reply(pre + '光遇叫声接口调用失败～');
    }
  }
}