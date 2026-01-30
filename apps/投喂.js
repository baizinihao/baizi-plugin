import fs from 'fs';
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
      // 使用15秒超时
      const response = await axios.get(`http://baizihaoxiao.xin/API/qqap.php?qq=${qqnumber}`, {
        timeout: 15000, // 15秒超时
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      console.log(`QQ ${qqnumber} 头像API响应:`, JSON.stringify(response.data));
      
      // 根据提供的API返回格式解析
      if (response.data && response.data.code === 0 && response.data.data) {
        return response.data.data; // 直接返回头像URL
      }
      
      console.log(`QQ ${qqnumber} 头像API返回格式不符合预期:`, response.data);
      // 如果API返回格式不符合预期，使用默认QQ头像
      return `https://q1.qlogo.cn/g?b=qq&nk=${qqnumber}&s=640`;
    } catch (e) {
      console.error(`获取QQ头像失败 (${qqnumber}):`, e.message);
      // 如果获取失败（包括超时），使用默认QQ头像
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

  async showZanzhu(e) {
    try {
      await e.reply('正在整理各位大大的投喂...\n请等一下噢 ⸜(๑\'ᵕ\'๑)⸝⋆*');
      
      const data = await this.getData();
      if (data.length === 0) {
        return await e.reply('暂无赞助数据，快来成为第一个投喂者吧！(๑•̀ㅂ•́)و✧');
      }

      // 创建赞助者信息数组
      const sponsors = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const hiddenQQ = this.hideQQNumber(item.qqnumber);
        
        sponsors.push({
          ...item,
          rankIcon: this.getRankIcon(i),
          moneyStr: this.formatMoney(item.money),
          hiddenQQ,
          displayName: hiddenQQ // 使用隐藏的QQ号作为显示名称
        });
      }

      // 构建消息数组
      const messageParts = [];
      
      // 标题部分
      messageParts.push('💖 白子の投喂榜 💖\n\n');
      
      // 获取前三名的头像URL（并发获取，超时15秒）
      const topThree = sponsors.slice(0, 3);
      const avatarPromises = topThree.map(sponsor => this.getQQAvatar(sponsor.qqnumber));
      
      try {
        // 设置15秒超时获取所有头像
        const avatarUrls = await Promise.race([
          Promise.allSettled(avatarPromises),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('头像获取超时')), 15000)
          )
        ]);
        
        // 显示前三名带头像
        for (let i = 0; i < topThree.length; i++) {
          const sponsor = topThree[i];
          let avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${sponsor.qqnumber}&s=640`; // 默认头像
          
          if (avatarUrls[i] && avatarUrls[i].status === 'fulfilled') {
            avatarUrl = avatarUrls[i].value;
          }
          
          // 直接使用网络图片URL
          messageParts.push(segment.image(avatarUrl));
          messageParts.push('\n');
          messageParts.push(`${sponsor.rankIcon} ${sponsor.displayName}\n`);
          messageParts.push(`💰 金额: ${sponsor.moneyStr}\n`);
          
          // 添加分隔线（除了最后一个）
          if (i < topThree.length - 1 || sponsors.length > 3) {
            messageParts.push('══════════════════════\n');
          }
        }
      } catch (avatarError) {
        console.error('获取头像超时或失败:', avatarError.message);
        // 如果头像获取失败，前三名只显示文字
        for (let i = 0; i < topThree.length; i++) {
          const sponsor = topThree[i];
          messageParts.push(`${sponsor.rankIcon} ${sponsor.displayName}\n`);
          messageParts.push(`💰 金额: ${sponsor.moneyStr}\n`);
          
          if (i < topThree.length - 1 || sponsors.length > 3) {
            messageParts.push('══════════════════════\n');
          }
        }
      }
      
      // 第四名及之后显示文字列表
      if (sponsors.length > 3) {
        messageParts.push('\n🏆 其他投喂者:\n');
        
        // 限制显示数量，避免消息过长
        const maxDisplay = Math.min(sponsors.length, 20); // 最多显示20名
        const others = sponsors.slice(3, maxDisplay);
        
        for (let i = 0; i < others.length; i++) {
          const sponsor = others[i];
          const rankNumber = i + 4; // 从第4名开始
          messageParts.push(`${rankNumber}. ${sponsor.displayName} - ${sponsor.moneyStr}\n`);
        }
        
        // 如果还有更多赞助者，显示省略号
        if (sponsors.length > maxDisplay) {
          const remaining = sponsors.length - maxDisplay;
          messageParts.push(`...等 ${remaining} 位投喂者\n`);
        }
        
        messageParts.push('\n');
      }
      
      // 计算统计信息
      const totalAmount = sponsors.reduce((sum, item) => sum + item.money, 0);
      const totalSponsors = sponsors.length;
      const avgAmount = totalSponsors > 0 ? totalAmount / totalSponsors : 0;
      const maxAmount = sponsors.length > 0 ? Math.max(...sponsors.map(item => item.money)) : 0;

      // 添加统计信息
      messageParts.push('📊 统计信息:\n');
      messageParts.push('══════════════════════\n');
      messageParts.push(`✨ 累计金额: ${this.formatMoney(totalAmount)}\n`);
      messageParts.push(`👥 投喂人数: ${totalSponsors}人\n`);
      messageParts.push(`📈 人均投喂: ${this.formatMoney(avgAmount)}\n`);
      messageParts.push(`🏅 最高投喂: ${this.formatMoney(maxAmount)}\n`);
      messageParts.push('══════════════════════\n');
      messageParts.push('💕 感谢各位大大的支持！\n');
      messageParts.push('© liusu 2024-2026');

      // 发送消息 - 直接传递消息数组
      await e.reply(messageParts);
      
    } catch (err) {
      console.error('showZanzhu 执行失败:', err);
      console.error('错误详情:', err.stack);
      await e.reply('生成榜单时发生错误，请稍后重试');
    }
  }
}