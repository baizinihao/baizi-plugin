import plugin from '../../../lib/plugins/plugin.js';

export class ChongMingQuery extends plugin {
  constructor() {
    super({
      name: '重名查询',
      dsc: '重名查询接口调用',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#?重名查询\\s+.+$',
          fnc: 'queryName'
        }
      ]
    });
  }

  async queryName() {
    const e = this.e;
    const reg = /^#?重名查询\s+(.+)$/;
    const match = e.msg.match(reg);
    if (!match) return;
    const name = match[1];
    const url = `http://baizihaoxiao.xin/API/zn.php?name=${encodeURIComponent(name)}`;
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!res.ok) throw new Error();
      const data = await res.text();
      await e.reply(data || '查询结果为空', true);
    } catch (err) {
      await e.reply('重名查询失败，请稍后再试', true);
    }
  }
}