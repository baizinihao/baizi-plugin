import plugin from '../../../lib/plugins/plugin.js';

export class ChongMingQuery extends plugin {
  constructor() {
    super({
      name: '重名查询',
      dsc: '重名查询，支持单字，文本化展示结果',
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
      if (!res.ok) throw new Error('接口请求失败');
      
      const data = await res.json();
      let resultText = '';

      // 解析JSON为简洁文本
      resultText += `查询状态：${data.code === 200 ? '成功' : '失败'}\n`;
      resultText += `提示信息：${data.msg || '无'}\n`;

      // 展示数据（若有）
      if (data.data && data.data.length > 0) {
        resultText += '重名相关数据：\n';
        data.data.forEach((item, idx) => {
          resultText += `--- 结果${idx + 1} ---\n`;
          Object.entries(item).forEach(([key, val]) => {
            resultText += `${key}：${val || '无'}\n`;
          });
        });
      } else if (data.data && data.data.length === 0) {
        resultText += '重名数据：暂无相关记录';
      }

      // 构造转发消息
      msgList.push({
        message: `查询姓名：${name}`,
        nickname: '重名查询',
        user_id: e.bot.uin
      });
      msgList.push({
        message: resultText.trim(),
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
        message: `查询失败：${err.message}`,
        nickname: '重名查询',
        user_id: e.bot.uin
      });
    }

    // 转发聊天样式回复（保持简洁）
    const forwardMsg = e.group ? await e.group.makeForwardMsg(msgList) : await e.friend.makeForwardMsg(msgList);
    await e.reply(forwardMsg);
  }
}