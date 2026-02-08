import plugin from '../../../lib/plugins/plugin.js';

export class ApiSearch extends plugin {
  constructor() {
    super({
      name: '接口搜索',
      dsc: '调用接口搜索API，支持关键词查询接口信息',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: /^#?搜索接口\s+(.+)$/,
          fnc: 'searchApi'
        }
      ]
    });
  }

  async searchApi() {
    const e = this.e;
    const match = e.msg.match(/^#?搜索接口\s+(.+)$/);
    if (!match || !match[1]) {
      await e.reply('请输入格式：搜索接口 关键词（例：搜索接口 云盘）', true);
      return;
    }
    const keyword = match[1].trim();
    
    if (keyword.length > 20) {
      await e.reply('搜索关键词长度不能超过20个字符', true);
      return;
    }
    
    const url = `http://baizihaoxiao.xin/API/sn.php?sn=${encodeURIComponent(keyword)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error(`接口请求失败（状态码：${res.status}）`);
      
      const dataText = await res.text();
      if (!dataText.trim()) {
        await e.reply('暂无相关接口查询结果', true);
        return;
      }
      
      let data;
      try {
        data = JSON.parse(dataText);
      } catch {
        data = { raw: dataText };
      }
      
      await this.sendForwardMessage(keyword, data);
      
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err.name === 'AbortError' 
        ? '接口搜索请求超时，请稍后再试' 
        : `接口搜索失败：${err.message}`;
      await e.reply(msg, true);
    }
  }

  async sendForwardMessage(keyword, data) {
    const e = this.e;
    let resultText = `搜索关键词：${keyword}\n`;
    
    if (data.raw) {
      resultText += data.raw;
    } else {
      if (data.状态码 === 200 && data.数据列表 && data.数据列表.length > 0) {
        resultText += `搜索结果：共找到${data.数据列表.length}个相关接口\n\n`;
        data.数据列表.forEach((api, index) => {
          resultText += `【${index + 1}】接口名称：${api.接口名称}\n`;
          resultText += `调用地址：${api.调用地址}\n`;
          resultText += `接口状态：${api.接口状态} | 添加时间：${api.添加时间}\n`;
          resultText += `调用次数：${api.调用次数} | 访问权限：${api.访问权限}\n`;
          
          if (api.请求参数 && api.请求参数.length > 0) {
            resultText += `请求参数：\n`;
            api.请求参数.forEach((param, pIndex) => {
              resultText += `  ${pIndex + 1}. ${param.参数名}（类型：${param.类型} | 必填：${param.必填}）\n`;
              resultText += `     说明：${param.说明}\n`;
            });
          } else {
            resultText += `请求参数：无\n`;
          }
          if (index < data.数据列表.length - 1) {
            resultText += `\n`;
          }
        });
      } else {
        resultText += data.搜索结果 || '未找到相关接口';
      }
    }

    // 改用框架要求的“name”字段（显示名称）+“uin”字段（头像对应的QQ号）
    const forwardNodes = [
      {
        name: e.sender.nickname || e.sender.card || '用户', // 第一个节点：用户的名称
        uin: e.user_id, // 第一个节点：用户的QQ号
        message: `搜索接口：${keyword}`
      },
      {
        name: '白子API', // 第二个节点：强制显示的名称
        uin: 3812808525, // 第二个节点：头像对应的QQ号
        message: resultText
      }
    ];
    
    try {
      if (e.isGroup) {
        // 调用框架原生合并转发方法，传入标准节点结构
        const forwardMsg = await e.group.makeForwardMsg(forwardNodes);
        await e.reply(forwardMsg);
      } else {
        await e.reply(forwardNodes);
      }
    } catch (error) {
      await e.reply(resultText);
    }
  }
}