import plugin from '../../../lib/plugins/plugin.js';

export class ChongMingQuery extends plugin {
  constructor() {
    super({
      name: '重名查询',
      dsc: '重名查询，支持单字，解析JSON为易懂文本',
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
    // 匹配指令，提取姓名（兼容单字/多字，带/不带#）
    const match = e.msg.match(/^#?重名查询\s+(.+)$/);
    if (!match || !match[1]) {
      await e.reply('使用格式：重名查询 姓名（支持单字）', true);
      return;
    }
    const name = match[1].trim();
    const url = `http://baizihaoxiao.xin/API/zn.php?name=${encodeURIComponent(name)}`;
    const msgList = [];

    try {
      // 简单请求接口，兼容大部分场景
      const res = await fetch(url, { 
        timeout: 10000,
        method: 'GET'
      });
      if (!res.ok) throw new Error(`接口请求异常，状态码：${res.status}`);
      
      // 解析JSON
      const jsonData = await res.json();
      // 解析JSON为易懂的纯文本，遍历所有键值对
      let resultText = '';
      for (const [key, val] of Object.entries(jsonData)) {
        // 处理值为对象/数组的简单情况，转成字符串不杂乱
        const value = typeof val === 'object' && val !== null 
          ? JSON.stringify(val).replace(/{|}|"|\[|\]/g, '').replace(/,/g, '，') 
          : val;
        resultText += `${key}：${value}\n`;
      }
      // 构造转发消息的内容，简洁无多余装饰
      msgList.push({
        message: `查询姓名：${name}`,
        nickname: '重名查询',
        user_id: e.bot.uin
      });
      msgList.push({
        message: resultText.trim() || '查询结果为空',
        nickname: '重名查询',
        user_id: e.bot.uin
      });

    } catch (err) {
      // 异常处理，简洁提示
      msgList.push({
        message: `查询姓名：${name}`,
        nickname: '重名查询',
        user_id: e.bot.uin
      });
      msgList.push({
        message: `查询失败：${err.message.replace(/Error: /g, '')}`,
        nickname: '重名查询',
        user_id: e.bot.uin
      });
    }

    // 生成转发聊天记录样式，兼容群聊/私聊
    const forwardMsg = e.group 
      ? await e.group.makeForwardMsg(msgList) 
      : await e.friend.makeForwardMsg(msgList);
    await e.reply(forwardMsg);
  }
}