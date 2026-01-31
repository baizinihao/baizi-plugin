import plugin from '../../../lib/plugins/plugin.js';

export class ChongMingQuery extends plugin {
  constructor() {
    super({
      name: '重名查询',
      dsc: '调用重名查询接口，支持单字查询',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#?重名查询\\s(.+)$',
          fnc: 'queryName'
        }
      ]
    });
  }

  async queryName() {
    const e = this.e;
    const match = e.msg.match(/^#?重名查询\s(.+)$/);
    if (!match || !match[1]) {
      await e.reply('请输入格式：重名查询 姓名（支持单字）', true);
      return;
    }
    const name = match[1].trim();
    const url = `http://baizihaoxiao.xin/API/zn.php?name=${encodeURIComponent(name)}`;
    try {
      const res = await fetch(url, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!res.ok) throw new Error('接口请求失败');
      let data = await res.text();
      data = data.trim() || '暂无该姓名的重名查询结果';
      await e.reply(data, true);
    } catch (err) {
      await e.reply('重名查询失败，请稍后重试', true);
    }
  }
}