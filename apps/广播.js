import plugin from '../../../lib/plugins/plugin.js'
import yaml from 'yaml'
import fsSync from 'fs'
import path from 'path'
import common from '../../../lib/common/common.js'

// 自动创配置文件（无后缀，仅延迟，无任何多余逻辑）
const configPath = path.join(process.cwd(), 'plugins', 'baizi-plugin', 'config', '广播')
if (!fsSync.existsSync(path.dirname(configPath))) fsSync.mkdirSync(path.dirname(configPath), { recursive: true })
if (!fsSync.existsSync(configPath)) fsSync.writeFileSync(configPath, yaml.stringify({delays:false,Nnumber:5000,random_delays:true}), 'utf8')
const config = yaml.parse(fsSync.readFileSync(configPath, 'utf8'))

export class example2 extends plugin {
  constructor() {
    super({
      name: '广播通知',
      dsc: '[@白子]广播通知',
      event: 'message',
      priority: 5000,
      rule: [{reg: '^#广播通知$', fnc: 'broadcast'}]
    })
  }

  async broadcast(e) {
    if (!e.isMaster) return true;
    await e.reply(`请发送你要广播的内容`)
    this.setContext('broadcast_')
  }

  async broadcast_(e) {
    this.finish('broadcast_')
    // 仅加这行获取实际广播内容，其他全按你原文件写
    const msgContent = e.msg.trim()
    if (!msgContent) {await e.reply(`内容不能为空`);return true;}
    // ↓↓↓ 以下群聊获取：和你原文件一字不差，一个字符没改 ↓↓↓
    let all_group = Array.from(Bot[e.self_id].gl.values())
    let all_groupid = []
    for (let item of all_group){
        all_groupid.push(item.group_id)
    }
    // 广播实际内容，不是指令
    await 发送消息(all_groupid, msgContent, e)
    await e.reply(`广播已完成`)
  }
}

// ↓↓↓ 发送消息：按你原文件写法，仅替换延迟为配置（关默认开随机） ↓↓↓
async function 发送消息(group, message, e){
    let groupNumber = group.length
    for (let item of group) {
        groupNumber--;
        let number = 0
        if(config.delays) number = config.Nnumber
        if(config.random_delays) number = Math.floor(Math.random() * (6000 - 4000 + 1)) + 4000;
        // 和你原文件写法一致，无多余await
        await Bot[e.self_id].pickGroup(item).sendMsg(message)
            .then(() => e.reply(`群${item}消息已送达，等待${number}毫秒后广播下一个群\n剩余${groupNumber}个群`))
            .catch((err) => e.reply(`群${item}消息发送失败，等待${number}毫秒后广播下一个群\n剩余${groupNumber}个群\n错误码:${err.code}\n错误信息:${err.message}`))
        await common.sleep(number)
    }
    return `OK`
}