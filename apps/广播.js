import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';
import common from '../../../lib/common/common.js';

// 配置文件路径：plugins/baizi-plugin/config/广播.json
const configPath = path.join(process.cwd(), 'plugins', 'baizi-plugin', 'config', '广播.json');
// 自动创建配置目录和文件（含延迟+白/黑名单所有配置）
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
// 读取统一配置
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export class example2 extends plugin {
  constructor() {
    super({
      name: '广播通知',
      dsc: '[@白子]广播通知',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#(白名单|黑名单)?广播通知$',
          fnc: 'broadcast'
        }
      ]
    });
  }

  async broadcast(e) {
    if (!e.isMaster) return true;
    await e.reply(`请发送你要广播的内容`);
    this.setContext('broadcast_');
  }

  async broadcast_(e) {
    this.finish('broadcast_');
    const msg = e.msg.match(/^#(白名单|黑名单)?广播通知$/);
    console.log(e.msg);
    let targetGroups = [];
    // 全群广播
    if (!msg[1]) {
      const all_group = Array.from(Bot[e.self_id].gl.values());
      targetGroups = all_group.map(item => item.group_id);
      if (targetGroups.length === 0) {
        await e.reply(`未获取到任何群聊，广播失败`);
        return true;
      }
    } 
    // 白名单广播
    else if (msg[1] === '白名单') {
      if (!config.whiteGroup || config.whiteGroup.length === 0) {
        await e.reply(`广播配置中白名单为空，广播失败\n可前往plugins/baizi-plugin/config/广播.json配置`);
        return true;
      }
      targetGroups = config.whiteGroup;
    } 
    // 黑名单广播（排除黑名单，发送其余所有群）
    else if (msg[1] === '黑名单') {
      if (!config.blackGroup || config.blackGroup.length === 0) {
        await e.reply(`广播配置中黑名单为空，广播失败\n可前往plugins/baizi-plugin/config/广播.json配置`);
        return true;
      }
      const all_group = Array.from(Bot[e.self_id].gl.values());
      const allGroupIds = all_group.map(item => item.group_id);
      // 过滤掉黑名单群
      targetGroups = allGroupIds.filter(id => !config.blackGroup.includes(id));
      if (targetGroups.length === 0) {
        await e.reply(`所有群均在黑名单中，无可用广播群`);
        return true;
      }
    }
    // 执行广播
    await 发送消息(targetGroups, e.message, e);
    await e.reply(`广播已完成，本次共向${targetGroups.length}个群发送消息`);
    return true;
  }
}

async function 发送消息(group, message, e) {
  let groupNumber = group.length;
  const { delays, Nnumber, random_delays } = config;
  for (const item of group) {
    groupNumber--;
    let number = 0;
    if (delays) {
      number = Nnumber;
    }
    if (delays && random_delays) {
      number = Math.floor(Math.random() * (6000 - 4000 + 1)) + 4000;
    }
    await Bot[e.self_id].pickGroup(item).sendMsg(message)
      .then(async () => await e.reply(`群${item}消息已送达，等待${number}毫秒后广播下一个群\n剩余${groupNumber}个群`))
      .catch(async (err) => await e.reply(`群${item}消息发送失败，等待${number}毫秒后广播下一个群\n剩余${groupNumber}个群\n错误码:${err.code}\n错误信息:${err.message}`));
    await common.sleep(number);
  }
  return `OK`;
}