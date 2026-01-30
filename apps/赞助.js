import fs from 'fs';
import path from 'path';
import plugin from '../../../lib/plugins/plugin.js';
import axios from 'axios';
import https from 'https';

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
          reg: '^#?赞助添加\\s*(\\d+):(\\d+(\\.\d+)?)$',
          fnc: 'addZanzhu'
        },
        {
          reg: '^#?赞助修改\\s*(\\d+):(\\d+(\\.\d+)?)$',
          fnc: 'updateZanzhu'
        },
        {
          reg: '^#?赞助删除\\s*(\\d+)$',
          fnc: 'deleteZanzhu'
        },
        {
          reg: '^#?(赞助|投喂)榜$',
          fnc: 'showZanzhu'
        }
      ]
    });
    
    // 创建临时目录用于保存下载的头像
    this.tempDir = path.join(process.cwd(), 'plugins', 'baizi-plugin', 'data', 'temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async getData() {
    try {
      if (!fs.existsSync(zanzhuPath)) {
        return [];
      }
      const data = JSON.parse(fs.readFileSync(zanzhuPath, 'utf8'));
      return data.map(item => ({
        qqnumber: String(item.qqnumber),
        money: item.money
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

    const match = e.msg.match(/^#?赞助添加\s*(\d+):(\d+(\.\d+)?)$/);
    if (!match) {
      await e.reply('指令格式错误，请使用：#赞助添加 QQ号:金额');
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

    const match = e.msg.match(/^#?赞助修改\s*(\d+):(\d+(\.\d+)?)$/);
    if (!match) {
      await e.reply('指令格式错误，请使用：#赞助修改 QQ号:新金额');
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

    const match = e.msg.match(/^#?赞助删除\s*(\d+)$/);
    if (!match) {
      await e.reply('指令格式错误，请使用：#赞助删除 QQ号');
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

  async getQQInfo(qqnumber) {
    try {
      const response = await axios.get(`http://baizihaoxiao.xin/API/qqapi.php?qq=${qqnumber}`, { 
        timeout: 5000 
      });
      
      if (response.data.code === 1 && response.data.data) {
        const data = response.data.data;
        return {
          success: true,
          nickname: data.name || `用户${this.hideQQNumber(qqnumber)}`,
          avatar: data.imgurl || `http://q1.qlogo.cn/g?b=qq&nk=${qqnumber}&s=640`,
          uin: data.uin || qqnumber
        };
      }
      return {
        success: false,
        nickname: `用户${this.hideQQNumber(qqnumber)}`,
        avatar: `http://q1.qlogo.cn/g?b=qq&nk=${qqnumber}&s=640`,
        uin: qqnumber
      };
    } catch (e) {
      console.error(`获取QQ信息失败 (${qqnumber}):`, e.message);
      return {
        success: false,
        nickname: `用户${this.hideQQNumber(qqnumber)}`,
        avatar: `http://q1.qlogo.cn/g?b=qq&nk=${qqnumber}&s=640`,
        uin: qqnumber
      };
    }
  }

  formatMoney(money) {
    return `¥${money.toFixed(2)}`;
  }

  getRankEmoji(index) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  }

  async downloadImage(url, filename) {
    return new Promise((resolve, reject) => {
      const filePath = path.join(this.tempDir, filename);
      
      // 如果文件已存在，直接返回路径
      if (fs.existsSync(filePath)) {
        resolve(filePath);
        return;
      }
      
      const file = fs.createWriteStream(filePath);
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`下载失败: ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(filePath);
        });
      }).on('error', (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
    });
  }

  async showZanzhu(e) {
    try {
      await e.reply('正在整理各位大大的投喂...\n请等一下噢 ⸜(๑\'ᵕ\'๑)⸝⋆*');
      
      const data = await this.getData();
      if (data.length === 0) {
        return await e.reply('暂无赞助数据，快来成为第一个投喂者吧！(๑•̀ㅂ•́)و✧');
      }

      // 获取所有赞助者的QQ信息
      const qqInfoPromises = data.map(item => this.getQQInfo(item.qqnumber));
      const qqInfoResults = await Promise.allSettled(qqInfoPromises);
      
      const sponsors = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const infoResult = qqInfoResults[i];
        let qqInfo;
        
        if (infoResult.status === 'fulfilled') {
          qqInfo = infoResult.value;
        } else {
          qqInfo = {
            success: false,
            nickname: `用户${this.hideQQNumber(item.qqnumber)}`,
            avatar: `http://q1.qlogo.cn/g?b=qq&nk=${item.qqnumber}&s=640`,
            uin: item.qqnumber
          };
        }
        
        sponsors.push({
          ...item,
          qqInfo,
          rank: this.getRankEmoji(i),
          moneyStr: this.formatMoney(item.money),
          hiddenQQ: this.hideQQNumber(item.qqnumber)
        });
      }

      // 计算统计信息
      const totalAmount = data.reduce((sum, item) => sum + item.money, 0);
      const totalSponsors = data.length;
      const avgAmount = totalSponsors > 0 ? totalAmount / totalSponsors : 0;
      const maxAmount = data.length > 0 ? Math.max(...data.map(item => item.money)) : 0;

      // 生成赞助榜消息
      let message = '';
      
      // 顶部标题
      message += '┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n';
      message += '┃      🐾 白子の投喂榜 🐾      ┃\n';
      message += '┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n';
      
      // 显示每个赞助者的信息
      for (let i = 0; i < sponsors.length; i++) {
        const sponsor = sponsors[i];
        
        // 发送头像图片
        try {
          // 下载并发送头像图片
          const filename = `avatar_${sponsor.qqnumber}_${Date.now()}.jpg`;
          const avatarPath = await this.downloadImage(sponsor.qqInfo.avatar, filename);
          
          // 发送图片消息
          await e.reply([
            segment.image(`file:///${avatarPath}`),
            `\n${sponsor.rank} ${sponsor.qqInfo.nickname}\n`,
            `ID: ${sponsor.hiddenQQ}\n`,
            `金额: ${sponsor.moneyStr}\n`
          ].join(''));
        } catch (err) {
          console.error(`发送头像失败 (QQ: ${sponsor.qqnumber}):`, err.message);
          
          // 如果发送图片失败，只发送文字信息
          await e.reply(
            `${sponsor.rank} ${sponsor.qqInfo.nickname}\n` +
            `ID: ${sponsor.hiddenQQ}\n` +
            `金额: ${sponsor.moneyStr}\n`
          );
        }
        
        // 添加间隔
        if (i < sponsors.length - 1) {
          await e.reply('─'.repeat(24));
        }
      }
      
      // 发送统计信息
      const statsMessage = 
        '📊 投喂统计 📊\n' +
        '═'.repeat(24) + '\n' +
        `✨ 累计金额: ${this.formatMoney(totalAmount)}\n` +
        `👥 投喂人数: ${totalSponsors}人\n` +
        `📈 人均投喂: ${this.formatMoney(avgAmount)}\n` +
        `🏆 最高投喂: ${this.formatMoney(maxAmount)}\n` +
        '═'.repeat(24) + '\n' +
        '💕 感谢各位大大的支持！ 💕\n' +
        '© liusu 2024-2026';
      
      await e.reply(statsMessage);
      
    } catch (err) {
      console.error('showZanzhu 执行失败:', err);
      console.error('错误详情:', err.stack);
      await e.reply('发生错误，请稍后重试');
    }
  }
}