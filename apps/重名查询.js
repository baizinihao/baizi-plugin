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
        },
        {
          reg: '^#?查询重名\\s(.+)$',
          fnc: 'queryName'
        }
      ]
    });
  }

  async queryName() {
    const e = this.e;
    const match = e.msg.match(/^#?(重名查询|查询重名)\s(.+)$/);
    if (!match || !match[2]) {
      await e.reply('请输入格式：重名查询 姓名', true);
      return;
    }
    const name = match[2].trim();
    
    if (name.length > 4) {
      await e.reply('姓名长度不能超过4个字符', true);
      return;
    }
    
    const url = `http://baizihaoxiao.xin/API/zn.php?name=${encodeURIComponent(name)}`;
    
    try {
      const res = await fetch(url, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!res.ok) throw new Error(`请求失败: ${res.status}`);
      
      let data = await res.text();
      
      if (!data || data.trim() === '') {
        await e.reply('暂无该姓名的重名查询结果', true);
        return;
      }
      
      try {
        const jsonData = JSON.parse(data);
        await this.sendForwardMessage(name, jsonData);
      } catch {
        await this.sendForwardMessage(name, { raw: data });
      }
      
    } catch (err) {
      await e.reply(`重名查询失败: ${err.message}`, true);
    }
  }

  async sendForwardMessage(name, data) {
    const e = this.e;
    
    try {
      let resultText = '';
      
      if (data.raw) {
        resultText = `查询姓名：${name}\n\n${data.raw}`;
      } else {
        resultText = `查询姓名：${name}\n\n`;
        resultText += this.formatJson(data, 0);
      }
      
      const forwardMessages = [];
      
      forwardMessages.push({
        user_id: e.user_id,
        nickname: e.sender.nickname || e.sender.card || '用户',
        message: `查询姓名：${name}`
      });
      
      forwardMessages.push({
        user_id: 10000,
        nickname: '重名查询助手',
        message: resultText
      });
      
      if (e.isGroup) {
        const forwardMsg = await e.group.makeForwardMsg(forwardMessages);
        await e.reply(forwardMsg);
      } else {
        await e.reply(resultText);
      }
      
    } catch (error) {
      const resultText = `查询姓名：${name}\n\n${JSON.stringify(data, null, 2)}`;
      await e.reply(resultText);
    }
  }

  formatJson(obj, indentLevel) {
    const indent = '  '.repeat(indentLevel);
    let result = '';
    
    if (Array.isArray(obj)) {
      result += '[\n';
      obj.forEach((item, index) => {
        result += indent + '  ';
        if (typeof item === 'object' && item !== null) {
          result += this.formatJson(item, indentLevel + 1);
        } else {
          result += JSON.stringify(item);
        }
        if (index < obj.length - 1) result += ',';
        result += '\n';
      });
      result += indent + ']';
    } else if (typeof obj === 'object' && obj !== null) {
      result += '{\n';
      const keys = Object.keys(obj);
      keys.forEach((key, index) => {
        result += indent + '  "' + key + '": ';
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          result += this.formatJson(obj[key], indentLevel + 1);
        } else {
          result += JSON.stringify(obj[key]);
        }
        if (index < keys.length - 1) result += ',';
        result += '\n';
      });
      result += indent + '}';
    } else {
      result += JSON.stringify(obj);
    }
    
    return result;
  }
}