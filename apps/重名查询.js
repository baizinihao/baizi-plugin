import plugin from '../../../lib/plugins/plugin.js';

export class ChongMingQuery extends plugin {
  constructor() {
    super({
      name: '重名查询',
      dsc: '调用重名查询接口',
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
    const msgList = [];

    try {
      const res = await fetch(url, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!res.ok) throw new Error(`接口返回状态码：${res.status}`);
      
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error('接口返回格式异常，非标准JSON');
      }

      msgList.push({
        message: `📋 重名查询结果`,
        nickname: '重名查询系统',
        user_id: e.bot.uin
      });

      msgList.push({
        message: `查询姓名：${name}`,
        nickname: '重名查询系统',
        user_id: e.bot.uin
      });

      if (data.code === 200 && data.data && data.data.length > 0) {
        msgList.push({
          message: `✅ 查询成功`,
          nickname: '重名查询系统',
          user_id: e.bot.uin
        });
        data.data.forEach((item, index) => {
          const itemStr = Object.entries(item).map(([key, val]) => `${key}：${val}`).join('\n');
          msgList.push({
            message: `📄 结果${index + 1}：\n${itemStr}`,
            nickname: '重名查询系统',
            user_id: e.bot.uin
          });
        });
      } else {
        msgList.push({
          message: `⚠️ 查询提示：${data.msg || '暂无相关重名数据'}`,
          nickname: '重名查询系统',
          user_id: e.bot.uin
        });
      }

      msgList.push({
        message: `💡 支持格式：\n重名查询 单字\n#重名查询 多字姓名`,
        nickname: '重名查询系统',
        user_id: e.bot.uin
      });

    } catch (err) {
      msgList.push({
        message: `❌ 查询失败`,
        nickname: '重名查询系统',
        user_id: e.bot.uin
      });
      msgList.push({
        message: `失败原因：${err.message || '网络异常或接口无响应'}`,
        nickname: '重名查询系统',
        user_id: e.bot.uin
      });
    }

    const forwardMsg = await e.group?.makeForwardMsg(msgList) || await e.friend?.makeForwardMsg(msgList);
    if (forwardMsg) {
      await e.reply(forwardMsg);
    } else {
      const text = msgList.map(item => `${item.nickname}：${item.message}`).join('\n\n');
      await e.reply(text, true);
    }
  }
}