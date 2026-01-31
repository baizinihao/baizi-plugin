import plugin from '../../../lib/plugins/plugin.js';

export class ChongMingQuery extends plugin {
  constructor() {
    super({
      name: '重名查询',
      dsc: '重名查询，支持单字，JSON解析',
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
      await e.reply('格式：重名查询 姓名', true);
      return;
    }

    const name = match[1].trim();
    const url = `http://baizihaoxiao.xin/API/zn.php?name=${encodeURIComponent(name)}`;
    const msgList = [];

    try {
      const res = await fetch(url, { timeout: 10000 });
      if (!res.ok) throw new Error('请求失败');
      
      const data = await res.json();
      msgList.push({
        message: `查询姓名：${name}`,
        nickname: '重名查询',
        user_id: e.bot.uin
      });
      msgList.push({
        message: JSON.stringify(data),
        nickname: '重名查询',
        user_id: e.bot.uin
      });

    } catch (err) {
      msgList.push({
        message: `查询姓名：${name}`,
        nickname: '重名查询',
        user_id: e.bot.uin
      });
      msgList.push({
        message: '查询失败：' + err.message,
        nickname: '重名查询',
        user_id: e.bot.uin
      });
    }

    const forwardMsg = e.group ? await e.group.makeForwardMsg(msgList) : await e.friend.makeForwardMsg(msgList);
    await e.reply(forwardMsg);
  }
}