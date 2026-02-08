  }
}import fs from 'fs';
import path from 'path';
import plugin from '../../../lib/plugins/plugin.js';
import axios from 'axios';
import { fileURLToPath } from 'url';

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const zanzhuPath = path.join(process.cwd(), 'plugins', 'baizi-plugin', 'config', 'zanzhu.json');

export class ZanzhuPlugin extends plugin {
  constructor() {
    super({
      name: '赞助管理',
      dsc: '赞助记录管理和榜单生成',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: '^#?赞助添加\\s+(\\d+):(\\d+(\\.\\d+)?)$',
          fnc: 'addZanzhu'
        },
        {
          reg: '^#?赞助修改\\s+(\\d+):(\\d+(\\.\\d+)?)$',
          fnc: 'updateZanzhu'
        },
        {
          reg: '^#?赞助删除\\s+(\\d+)$',
          fnc: 'deleteZanzhu'
        },
        {
          reg: '^#?(赞助|投喂)榜$',
          fnc: 'showZanzhu'
        }
      ]
    });
  }

  async getData() {
    try {
      if (!fs.existsSync(zanzhuPath)) {
        return [];
      }
      const data = JSON.parse(fs.readFileSync(zanzhuPath, 'utf8'));
      return data.map(item => ({
        qqnumber: String(item.qqnumber),
        money: parseFloat(item.money)
      })).sort((a, b) => b.money - a.money);
    } catch (e) {
      console.error('读取数据失败:', e.message);
      return [];
    }
  }

  async saveData(data) {
    try {
      const dirPath = path.dirname(zanzhuPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(zanzhuPath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('保存数据失败:', e.message);
    }
  }

  async checkPermission(e) {
    const senderQQ = e.sender.user_id.toString();
    const ownerQQ = '2937655991';
    if (senderQQ !== ownerQQ) {
      await e.reply('您没有权限执行此操作，仅限主人操作。');
      return false;
    }
    return true;
  }

  async addZanzhu(e) {
    if (!(await this.checkPermission(e))) return;

    const match = e.msg.match(/^#?赞助添加\s+(\d+):(\d+(?:\.\d+)?)$/);
    if (!match) {
      await e.reply('指令格式错误，请使用：#赞助添加 QQ号:金额\n例如：#赞助添加 10001:50.00');
      return;
    }

    const qqnumber = match[1];
    const money = parseFloat(match[2]);
    if (isNaN(money)) {
      await e.reply('金额格式错误，请输入有效的金额。');
      return;
    }

    const data = await this.getData();
    const existingRecord = data.find(item => item.qqnumber === qqnumber);

    if (existingRecord) {
      existingRecord.money += money;
      await this.saveData(data);
      await e.reply(`已更新 QQ:${qqnumber} 的赞助记录，新增金额：¥${money.toFixed(2)}，累计金额：¥${existingRecord.money.toFixed(2)}`);
    } else {
      data.push({ qqnumber, money });
      await this.saveData(data);
      await e.reply(`已添加 QQ:${qqnumber} 的赞助记录，金额：¥${money.toFixed(2)}`);
    }
  }

  async updateZanzhu(e) {
    if (!(await this.checkPermission(e))) return;

    const match = e.msg.match(/^#?赞助修改\s+(\d+):(\d+(?:\.\d+)?)$/);
    if (!match) {
      await e.reply('指令格式错误，请使用：#赞助修改 QQ号:新金额\n例如：#赞助修改 10001:100.00');
      return;
    }

    const qqnumber = match[1];
    const newMoney = parseFloat(match[2]);
    if (isNaN(newMoney)) {
      await e.reply('金额格式错误，请输入有效的金额。');
      return;
    }

    const data = await this.getData();
    const recordIndex = data.findIndex(item => item.qqnumber === qqnumber);

    if (recordIndex === -1) {
      await e.reply(`未找到 QQ:${qqnumber} 的赞助记录`);
    } else {
      data[recordIndex].money = newMoney;
      await this.saveData(data);
      await e.reply(`已将 QQ:${qqnumber} 的赞助金额修改为 ¥${newMoney.toFixed(2)}`);
    }
  }

  async deleteZanzhu(e) {
    if (!(await this.checkPermission(e))) return;

    const match = e.msg.match(/^#?赞助删除\s+(\d+)$/);
    if (!match) {
      await e.reply('指令格式错误，请使用：#赞助删除 QQ号\n例如：#赞助删除 10001');
      return;
    }

    const qqnumber = match[1];
    const data = await this.getData();
    const recordIndex = data.findIndex(item => item.qqnumber === qqnumber);

    if (recordIndex === -1) {
      await e.reply(`未找到 QQ:${qqnumber} 的赞助记录`);
    } else {
      data.splice(recordIndex, 1);
      await this.saveData(data);
      await e.reply(`已删除 QQ:${qqnumber} 的赞助记录`);
    }
  }

  hideQQNumber(qqnumber) {
    const qqStr = String(qqnumber);
    if (qqStr.length <= 4) return qqStr;
    const prefix = qqStr.slice(0, 2);
    const suffix = qqStr.slice(-2);
    return `${prefix}****${suffix}`;
  }

  async getQQAvatar(qqnumber) {
    try {
      const response = await axios.get(`http://baizihaoxiao.xin/API/qqap.php?qq=${qqnumber}`, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.data && response.data.code === 0 && response.data.data) {
        return response.data.data;
      }
      return `https://q1.qlogo.cn/g?b=qq&nk=${qqnumber}&s=640`;
    } catch (e) {
      console.error(`获取QQ头像失败 (${qqnumber}):`, e.message);
      return `https://q1.qlogo.cn/g?b=qq&nk=${qqnumber}&s=640`;
    }
  }

  formatMoney(money) {
    return `¥${money.toFixed(2)}`;
  }

  getRankIcon(index) {
    if (index === 0) return '👑';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  }

  // 合并转发通用方法
  async sendForward(e, cmd, msgObjects) {
    const forwardNodes = [
      {
        user_id: '3812808525',
        message: [{ type: 'text', data: { text: cmd } }]
      },
      {
        user_id: '3812808525',
        message: msgObjects
      }
    ];
    try {
      let forwardMsg = e.isGroup 
        ? await e.group.makeForwardMsg(forwardNodes)
        : await e.friend.makeForwardMsg(forwardNodes);
      await e.reply(forwardMsg);
    } catch (forwardError) {
      await e.reply(msgObjects);
    }
  }

  async showZanzhu(e) {
    try {
      await e.reply('正在整理各位大大的投喂...\n请等一下噢 ⸜(๑\'ᵕ\'๑)⸝⋆*');
      
      const cmd = e.msg.includes('赞助') ? '赞助榜' : '投喂榜';
      const data = await this.getData();
      
      // 空数据处理
      if (data.length === 0) {
        const emptyMsg = [{ type: 'text', data: { text: `暂无${cmd}数据，快来成为第一个投喂者吧！(๑•̀ㅂ•́)و✧` } }];
        return await this.sendForward(e, cmd, emptyMsg);
      }

      // 组装赞助者信息
      const sponsors = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        sponsors.push({
          ...item,
          rankIcon: this.getRankIcon(i),
          moneyStr: this.formatMoney(item.money),
          hiddenQQ: this.hideQQNumber(item.qqnumber),
          displayName: this.hideQQNumber(item.qqnumber)
        });
      }

      // 组装标准消息对象数组
      const msgObjects = [];
      
      // 标题文本
      msgObjects.push({ type: 'text', data: { text: `❄️ 白子の${cmd} ❄️\n\n` } });
      
      // 前三名（带头像）
      const topThree = sponsors.slice(0, 3);
      const avatarPromises = topThree.map(sponsor => this.getQQAvatar(sponsor.qqnumber));
      
      try {
        const avatarUrls = await Promise.race([
          Promise.allSettled(avatarPromises),
          new Promise((_, reject) => setTimeout(() => reject(new Error('超时')), 15000))
        ]);
        
        for (let i = 0; i < topThree.length; i++) {
          const sponsor = topThree[i];
          let avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${sponsor.qqnumber}&s=640`;
          
          if (avatarUrls[i]?.status === 'fulfilled') {
            avatarUrl = avatarUrls[i].value;
          }
          
          // 添加头像图片
          msgObjects.push({ type: 'image', data: { file: avatarUrl } });
          // 添加文字信息
          msgObjects.push({ type: 'text', data: { text: `\n${sponsor.rankIcon} ${sponsor.displayName}\n💰 金额: ${sponsor.moneyStr}\n` } });
          // 添加分隔线
          if (i < topThree.length - 1 || sponsors.length > 3) {
            msgObjects.push({ type: 'text', data: { text: '══════════════════════\n' } });
          }
        }
      } catch (avatarError) {
        // 头像获取失败则只显示文字
        for (let i = 0; i < topThree.length; i++) {
          const sponsor = topThree[i];
          msgObjects.push({ type: 'text', data: { text: `${sponsor.rankIcon} ${sponsor.displayName}\n💰 金额: ${sponsor.moneyStr}\n` } });
          if (i < topThree.length - 1 || sponsors.length > 3) {
            msgObjects.push({ type: 'text', data: { text: '══════════════════════\n' } });
          }
        }
      }
      
      // 其他投喂者
      if (sponsors.length > 3) {
        msgObjects.push({ type: 'text', data: { text: '\n🏆 其他投喂者:\n' } });
        const maxDisplay = Math.min(sponsors.length, 20);
        const others = sponsors.slice(3, maxDisplay);
        
        for (let i = 0; i < others.length; i++) {
          const sponsor = others[i];
          const rankNumber = i + 4;
          msgObjects.push({ type: 'text', data: { text: `${rankNumber}. ${sponsor.displayName} - ${sponsor.moneyStr}\n` } });
        }
        
        if (sponsors.length > maxDisplay) {
          const remaining = sponsors.length - maxDisplay;
          msgObjects.push({ type: 'text', data: { text: `...等 ${remaining} 位投喂者\n` } });
        }
      }
      
      // 统计信息
      const totalAmount = sponsors.reduce((sum, item) => sum + item.money, 0);
      const totalSponsors = sponsors.length;
      const avgAmount = totalSponsors > 0 ? totalAmount / totalSponsors : 0;
      const maxAmount = sponsors.length > 0 ? Math.max(...sponsors.map(item => item.money)) : 0;

      msgObjects.push({ type: 'text', data: { text: '\n📊 统计信息:\n══════════════════════\n' } });
      msgObjects.push({ type: 'text', data: { text: `✨ 累计金额: ${this.formatMoney(totalAmount)}\n` } });
      msgObjects.push({ type: 'text', data: { text: `👥 投喂人数: ${totalSponsors}人\n` } });
      msgObjects.push({ type: 'text', data: { text: `📈 人均投喂: ${this.formatMoney(avgAmount)}\n` } });
      msgObjects.push({ type: 'text', data: { text: `🏅 最高投喂: ${this.formatMoney(maxAmount)}\n` } });
      msgObjects.push({ type: 'text', data: { text: '══════════════════════\n🌚 感谢各位大大的支持！\n© liusu 2024-2026' } });

      // 发送合并转发
      await this.sendForward(e, cmd, msgObjects);
      
    } catch (err) {
      console.error('showZanzhu 执行失败:', err);
      await e.reply('生成榜单时发生错误，请稍后重试');
    }
  }
}