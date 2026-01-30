import plugin from '../../../lib/plugins/plugin.js'
import yaml from 'yaml'
import { promises as fs } from 'fs'
import fsSync from 'fs'
import path from 'path'
import common from '../../../lib/common/common.js'

const configPath = path.join(process.cwd(), 'plugins', 'baizi-plugin', 'config', '广播')
let config = { delays: false, Nnumber: 5000, random_delays: true }

// 自动检测创建配置文件
function initConfig() {
    if (!fsSync.existsSync(path.dirname(configPath))) {
        fsSync.mkdirSync(path.dirname(configPath), { recursive: true })
    }
    if (!fsSync.existsSync(configPath)) {
        fsSync.writeFileSync(configPath, yaml.stringify(config), 'utf8')
    } else {
        const file = fsSync.readFileSync(configPath, 'utf8')
        config = yaml.parse(file) || config
    }
}
initConfig()

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
    // 仅加这行：获取你后续发的实际广播内容（核心修复，其他全按原文件）
    const broadcastContent = e.msg.trim()
    if (!broadcastContent) {
      await e.reply(`广播内容不能为空`)
      return true
    }
    // ↓↓↓ 以下群聊获取代码：和你原文件一字不差！↓↓↓
    let all_group = Array.from(Bot[e.self_id].gl.values())
    let all_groupid = []
    for (let item of all_group){
        all_groupid.push(item.group_id)
    }
    // ↓↓↓ 和原文件一致，仅加群聊判空提示 ↓↓↓
    if (all_groupid.length === 0) {
      await e.reply(`未获取到任何群聊，广播失败`)
      return true
    }
    // 广播实际内容（不是指令）
    await 发送消息(all_groupid, broadcastContent, e)
    await e.reply(`广播已完成`)
  }
}

// ↓↓↓ 发送消息逻辑：基本和原文件一致，仅用配置的延迟 ↓↓↓
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
        // ↓↓↓ 和原文件一致的发送+错误提示 ↓↓↓
        await Bot[e.self_id].pickGroup(item).sendMsg(message)
            .then(() => e.reply(`群${item}消息已送达，等待${number}毫秒后广播下一个群\n剩余${groupNumber}个群`))
            .catch((err) => e.reply(`群${item}消息发送失败，等待${number}毫秒后广播下一个群\n剩余${groupNumber}个群\n错误码:${err.code}\n错误信息:${err.message}`))
        await common.sleep(number)
    }
    return `OK`
}