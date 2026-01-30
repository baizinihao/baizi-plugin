import plugin from '../../../lib/plugins/plugin.js';
import yaml from 'yaml';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
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
    random_delays: false
  };
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
}
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
    const otherYamlPath = path.join(process.cwd(), 'config', 'other.yaml');
    const otheryaml = await fsPromises.readFile(otherYamlPath, 'utf-8');
    const other = yaml.parse(otheryaml);
    let targetGroups = [];
    if (!msg[1]) {
      const all_group = Array.from(Bot[e.self_id].gl.values());
      targetGroups = all_group.map(item => item.group_id);
    } else if (msg[1] === '白名单') {
      if (!other.whiteGroup || other.whiteGroup.length === 0) {
        await e.reply(`白名单为空，广播失败`);
        return true;
      }
      targetGroups = other.whiteGroup;
    } else if (msg[1] === '黑名单') {
      if (!other.blackGroup || other.blackGroup.length === 0) {
        await e.reply(`黑名单为空，广播失败`);
        return true;
      }
      targetGroups = other.blackGroup;
    }
    await 发送消息(targetGroups, e.message, e);
    await e.reply(`广播已完成`);
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