import fs from 'fs';
import path from 'path';
import plugin from '../../../lib/plugins/plugin.js';

const zanzhuPath = path.join(process.cwd(), 'plugins', 'baizi-plugin', 'config', 'zanzhu.json');
if (!fs.existsSync(path.dirname(zanzhuPath))) {
  fs.mkdirSync(path.dirname(zanzhuPath), { recursive: true });
}
if (!fs.existsSync(zanzhuPath)) {
  fs.writeFileSync(zanzhuPath, JSON.stringify([], null, 2), 'utf8');
}

export class AddZanzhuPlugin extends plugin {
  constructor() {
    super({
      name: '赞助管理',
      dsc: '添加、修改或删除赞助记录',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: '^#?(赞助|投喂)添加\\s*(\\d+):(\\d+(\\.\\d+)?)$',
          fnc: 'addZanzhu'
        },
        {
          reg: '^#?(赞助|投喂)修改\\s*(\\d+):(\\d+(\\.\\d+)?)$',
          fnc: 'updateZanzhu'
        },
        {
          reg: '^#?(赞助|投喂)删除\\s*(\\d+)$',
          fnc: 'deleteZanzhu'
        }
      ]
    });
  }

  async getData() {
    try {
      const data = JSON.parse(fs.readFileSync(zanzhuPath, 'utf8'));
      const formattedData = data.map(item => ({
        qqnumber: String(item.qqnumber),
        money: item.money
      }));
      return formattedData;
    } catch (e) {
      return [];
    }
  }

  async saveData(data) {
    try {
      fs.writeFileSync(zanzhuPath, JSON.stringify(data, null, 2));
    } catch (e) {}
  }

  async checkPermission(e) {
    const senderQQ = e.sender.user_id.toString();
    const ownerQQ = '2209176666';
    if (senderQQ !== ownerQQ) {
      await e.reply('您没有权限执行此操作，仅限主人操作。');
      return false;
    }
    return true;
  }

  async addZanzhu(e) {
    if (!(await this.checkPermission(e))) return;

    const match = e.msg.match(/^#?(赞助|投喂)添加\s*(\d+):(\d+(\.\d+)?)$/);
    if (!match) {
      await e.reply('指令格式错误，请使用：#赞助添加 QQ号:金额 或 #投喂添加 QQ号:金额');
      return;
    }

    const qqnumber = match[2];
    const money = parseFloat(match[3]);

    if (isNaN(money)) {
      await e.reply('金额格式错误，请输入有效的金额。');
      return;
    }

    const data = await this.getData();
    const existingRecord = data.find(item => item.qqnumber === qqnumber);

    if (existingRecord) {
      existingRecord.money += money;
      await this.saveData(data);
      await e.reply(`已更新 QQ:${qqnumber} 的投喂记录，新增金额：¥${money.toFixed(2)}，累计金额：¥${existingRecord.money.toFixed(2)}`);
    } else {
      data.push({ qqnumber, money });
      await this.saveData(data);
      await e.reply(`已添加 QQ:${qqnumber} 的投喂记录，金额：¥${money.toFixed(2)}`);
    }
  }

  async updateZanzhu(e) {
    if (!(await this.checkPermission(e))) return;

    const match = e.msg.match(/^#?(赞助|投喂)修改\s*(\d+):(\d+(\.\d+)?)$/);
    if (!match) {
      await e.reply('指令格式错误，请使用：#赞助修改 QQ号:新金额 或 #投喂修改 QQ号:新金额');
      return;
    }

    const qqnumber = match[2];
    const newMoney = parseFloat(match[3]);

    if (isNaN(newMoney)) {
      await e.reply('金额格式错误，请输入有效的金额。');
      return;
    }

    const data = await this.getData();
    const recordIndex = data.findIndex(item => item.qqnumber === qqnumber);

    if (recordIndex === -1) {
      await e.reply(`未找到 QQ:${qqnumber} 的投喂记录`);
    } else {
      data[recordIndex].money = newMoney;
      await this.saveData(data);
      await e.reply(`已将 QQ:${qqnumber} 的投喂金额修改为 ¥${newMoney.toFixed(2)}`);
    }
  }

  async deleteZanzhu(e) {
    if (!(await this.checkPermission(e))) return;

    const match = e.msg.match(/^#?(赞助|投喂)删除\s*(\d+)$/);
    if (!match) {
      await e.reply('指令格式错误，请使用：#赞助删除 QQ号 或 #投喂删除 QQ号');
      return;
    }

    const qqnumber = match[2];
    const data = await this.getData();
    const recordIndex = data.findIndex(item => item.qqnumber === qqnumber);

    if (recordIndex === -1) {
      await e.reply(`未找到 QQ:${qqnumber} 的投喂记录`);
    } else {
      data.splice(recordIndex, 1);
      await this.saveData(data);
      await e.reply(`已删除 QQ:${qqnumber} 的投喂记录`);
    }
  }
}