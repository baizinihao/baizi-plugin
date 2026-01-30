import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';
import common from '../../../lib/common/common.js';

const configPath = path.join(process.cwd(), 'plugins', 'baizi-plugin', 'config', '广播.json');
if (!fs.existsSync(path.dirname(configPath))) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
}
if (!fs.existsSync(configPath)) {
  const defaultConfig = {
    delays: true,
    Nnumber: 5000,
    random_delays: false,
    whiteGroup: [],
    blackGroup: []
  };
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export class example2 extends plugin {
  constructor() {
    super({
      name: '广播通知',
      dsc: '广播通知，兼容带/不带#，支持全群/白名单/黑名单',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#?(白名单|黑名单)?广播通知$',
          fnc: 'broadcast'
        }
      ]
    });
  }

  async broadcast(e) {
    if (!e.isMaster) return true;
    await e.reply(`请发送需要广播的内容，发送后将立即执行对应广播`);
    this.setContext('broadcast_');
    this.broadcastType = e.msg.match(/^#?(白名单|黑名单)?广播通知$/)[1];
  }

  async broadcast_(e) {
    this.finish('broadcast_');
    const broadcastContent = e.msg.trim();
    if (!broadcastContent) {
      await e.reply(`广播内容不能为空，请重新触发指令并发送内容`);
      return true;
    }
    const type = this.broadcastType;
    let targetGroups = [];
    // 兼容TRSS/Yunzai，获取机器人实例和群列表
    const botInstance = Bot[e.self_id] || Bot;
    if (!botInstance) {
      await e.reply(`未获取到机器人实例，广播失败`);
      return true;
    }

    // 全群广播 - TRSS通用群列表获取方式
    if (!type) {
      // 兼容gl/GroupList多种群列表属性
      const groupList = botInstance.gl || botInstance.GroupList || [];
      if (!groupList || groupList.size === 0) {
        await e.reply(`未获取到任何群聊，机器人未加入群或群列表加载失败，广播失败`);
        return true;
      }
      // 统一解析群号，兼容Map/数组格式
      targetGroups = Array.from(groupList).map(item => item.group_id || item[1].group_id || item);
      targetGroups = targetGroups.filter(id => id && !isNaN(id));
    } 
    // 白名单广播
    else if (type === '白名单') {
      if (!config.whiteGroup || config.whiteGroup.length === 0) {
        await e.reply(`广播配置中白名单为空，广播失败\n可前往plugins/baizi-plugin/config/广播.json配置`);
        return true;
      }
      targetGroups = config.whiteGroup.filter(id => !isNaN(id));
    } 
    // 黑名单广播
    else if (type === '黑名单') {
      if (!config.blackGroup || config.blackGroup.length === 0) {
        await e.reply(`广播配置中黑名单为空，广播失败\n可前往plugins/baizi-plugin/config/广播.json配置`);
        return true;
      }
      const groupList = botInstance.gl || botInstance.GroupList || [];
      if (!groupList || groupList.size === 0) {
        await e.reply(`未获取到任何群聊，广播失败`);
        return true;
      }
      let allGroupIds = Array.from(groupList).map(item => item.group_id || item[1].group_id || item);
      allGroupIds = allGroupIds.filter(id => id && !isNaN(id));
      // 过滤黑名单群
      targetGroups = allGroupIds.filter(id => !config.blackGroup.includes(id));
      if (targetGroups.length === 0) {
        await e.reply(`所有群均在黑名单中，无可用广播群`);
        return true;
      }
    }

    // 最终判空有效群号
    if (targetGroups.length === 0) {
      await e.reply(`未筛选到有效群号，广播失败`);
      return true;
    }

    await e.reply(`开始执行${type || '全群'}广播，共${targetGroups.length}个有效目标群`);
    await 发送消息(targetGroups, broadcastContent, e);
    await e.reply(`${type || '全群'}广播已完成，本次共向${targetGroups.length}个群发送内容`);
    return true;
  }
}

async function 发送消息(group, message, e) {
  let groupNumber = group.length;
  const { delays, Nnumber, random_delays } = config;
  const botInstance = Bot[e.self_id] || Bot;
  for (const item of group) {
    groupNumber--;
    let number = 0;
    if (delays) {
      number = Nnumber;
    }
    if (delays && random_delays) {
      number = Math.floor(Math.random() * (6000 - 4000 + 1)) + 4000;
    }
    // 兼容多种发消息方式
    await botInstance.pickGroup(item).sendMsg(message)
      .then(async () => await e.reply(`群${item}消息已送达，等待${number}毫秒后广播下一个群\n剩余${groupNumber}个群`))
      .catch(async (err) => await e.reply(`群${item}消息发送失败，等待${number}毫秒后广播下一个群\n剩余${groupNumber}个群\n错误：${err.message || err}`));
    await common.sleep(number);
  }
  return `OK`;
}