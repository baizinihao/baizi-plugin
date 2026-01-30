import plugin from '../../../lib/plugins/plugin.js'
import yaml from 'yaml'
import fsSync from 'fs'
import path from 'path'
import common from '../../../lib/common/common.js'

// 按你要求的配置文件，极简读取
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
    // 1. 获取你实际发的广播内容，不是指令
    const sendContent = e.msg.trim()
    if (!sendContent) {await e.reply(`广播内容不能为空`);return true;}
    // 2. 原文件一字不差的群聊获取
    let all_group = Array.from(Bot[e.self_id].gl.values())
    let all_groupid = []
    for (let item of all_group){all_groupid.push(item.group_id);}
    // 🔥 核心修复：加群聊判空，没群聊直接提示，不返回广播完成
    if (all_groupid.length === 0) {await e.reply(`未获取到任何群聊，广播失败`);return true;}
    // 3. 实际发送内容，发完才回广播完成
    await 发送消息(all_groupid, sendContent, e)
    await e.reply(`广播已完成`)
  }
}

// 原文件一字不差的发送逻辑，仅用你要求的延迟配置
async function 发送消息(group, message, e){
    let groupNumber = group.length
    for (let item of group) {
        groupNumber--;
        let number = 0
        if(config.delays) number = config.Nnumber
        if(config.random_delays) number = Math.floor(Math.random()*(6000-4000+1))+4000;
        await Bot[e.self_id].pickGroup(item).sendMsg(message)
        .then(()=>e.reply(`群${item}消息已送达，等待${number}毫秒后广播下一个群\n剩余${groupNumber}个群`))
        .catch((err)=>e.reply(`群${item}消息发送失败，等待${number}毫秒后广播下一个群\n剩余${groupNumber}个群\n错误码:${err.code}\n错误信息:${err.message}`))
        await common.sleep(number)
    }
    return `OK`
}