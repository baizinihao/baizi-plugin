import plugin from '../../../lib/plugins/plugin.js'
import yaml from 'yaml'
import { promises as fs } from 'fs'
import fsSync from 'fs'
import path from 'path'
import common from '../../../lib/common/common.js'

const configPath = path.join(process.cwd(), 'plugins', 'baizi-plugin', 'config', '广播')
if (!fsSync.existsSync(path.dirname(configPath))) {
    fsSync.mkdirSync(path.dirname(configPath), { recursive: true })
}
if (!fsSync.existsSync(configPath)) {
    const defaultConfig = {
        delays: false,
        Nnumber: 5000,
        random_delays: true
    }
    fsSync.writeFileSync(configPath, yaml.stringify(defaultConfig), 'utf8')
}
const configFile = await fs.readFile(configPath, 'utf8')
const config = yaml.parse(configFile)

export class example2 extends plugin {
  constructor() {
    super({
      name: '广播通知',
      dsc: '[@白子]广播通知',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#广播通知$',
          fnc: 'broadcast'
        }
      ]
    })
  }

  async broadcast(e) {
    if (!e.isMaster) return true;
    await e.reply(`请发送你要广播的内容`)
    this.setContext('broadcast_')
  }

  async broadcast_(e) {
    this.finish('broadcast_')
    let all_group = Array.from(Bot[e.self_id].gl.values())
    let all_groupid = []
    for (let item of all_group) {
        all_groupid.push(item.group_id)
    }
    if (all_groupid.length === 0) {
      await e.reply(`未获取到任何群聊，广播失败`)
      return true
    }
    await 发送消息(all_groupid, e.message, e)
    await e.reply(`广播已完成`)
  }
}

async function 发送消息(group, message, e){
    let groupNumber = group.length
    for (let item of group) {
        groupNumber--;
        let number = 0
        if(config.delays){
            number = config.Nnumber
        }
        if(config.random_delays){
            number = Math.floor(Math.random() * (6000 - 4000 + 1)) + 4000;
        }
        await Bot[e.self_id].pickGroup(item).sendMsg(message)
            .then(async () => await e.reply(`群${item}消息已送达，等待${number}毫秒后广播下一个群\n剩余${groupNumber}个群`))
            .catch(async (err) => await e.reply(`群${item}消息发送失败，等待${number}毫秒后广播下一个群\n剩余${groupNumber}个群\n错误码:${err.code}\n错误信息:${err.message}`))
        await common.sleep(number)
    }
    return `OK`
}