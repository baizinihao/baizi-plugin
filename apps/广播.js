import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';
import common from '../../../lib/common/common.js';

// 配置文件自动生成/读取（仅延迟+黑白名单，群聊全自动获取）
const configPath = path.join(process.cwd(), 'plugins', 'baizi-plugin', 'config', '广播.json');
if (!fs.existsSync(path.dirname(configPath))) fs.mkdirSync(path.dirname(configPath), { recursive: true });
if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, JSON.stringify({
  delays: true,
  Nnumber: 5000,
  random_delays: false,
  whiteGroup: [],
  blackGroup: []
}, null, 2), 'utf8');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export class example2 extends plugin {
  constructor() {
    super({
      name: '广播通知',
      dsc: 'TRSS全自动获取群聊，兼容带/不带#，全群/白/黑名单广播',
      event: 'message',
      priority: 5000,
      rule: [{ reg: '^#?(白名单|黑名单)?广播通知$', fnc: 'broadcast' }]
    });
  }

  async broadcast(e) {
    if (!e.isMaster) return true;
    await e.reply(`请发送需要广播的内容，发送后将**自动获取机器人已入群聊**并执行广播`);
    this.setContext('broadcast_');
    this.broadcastType = e.msg.match(/^#?(白名单|黑名单)?广播通知$/)[1];
  }

  async broadcast_(e) {
    this.finish('broadcast_');
    // 校验广播内容
    const broadcastContent = e.msg.trim();
    if (!broadcastContent) {
      await e.reply(`广播内容不能为空，请重新触发指令`);
      return true;
    }
    const type = this.broadcastType;

    // ===== 核心：全自动获取TRSS群聊（带临时加载重试，确保获取到）=====
    const bot = Bot[e.self_id];
    if (!bot) {
      await e.reply(`未获取到机器人实例，广播失败`);
      return true;
    }
    // 自动获取群聊+重试（防止TRSS启动后群列表未及时加载）
    let allGroupIds = [];
    for (let i = 0; i < 2; i++) {
      // TRSS原生全自动拉取已入群聊，无需任何手动配置
      allGroupIds = Array.isArray(bot.groups) 
        ? bot.groups.map(g => g.group_id).filter(id => id && !isNaN(id)) 
        : [];
      if (allGroupIds.length > 0) break;
      await common.sleep(500); // 重试间隔
    }
    // 最终判空
    if (allGroupIds.length === 0) {
      await e.reply(`全自动获取群聊失败！\n1. 确认机器人已加入至少1个群聊\n2. 确认TRSS已正常加载群列表`);
      return true;
    }

    // ===== 基于自动获取的群聊，自动过滤黑白名单 =====
    let targetGroups = [];
    if (!type) {
      // 全群广播：直接使用自动获取的所有群聊
      targetGroups = allGroupIds;
    } else if (type === '白名单') {
      // 白名单广播：自动过滤→仅保留「自动获取的群聊」中在白名单里的
      targetGroups = allGroupIds.filter(id => config.whiteGroup.includes(id));
      if (targetGroups.length === 0) {
        await e.reply(`白名单过滤后无可用群聊！\n- 机器人已入群：${allGroupIds.join(', ')}\n- 配置白名单：${config.whiteGroup.join(', ')}`);
        return true;
      }
    } else if (type === '黑名单') {
      // 黑名单广播：自动过滤→排除「自动获取的群聊」中在黑名单里的
      targetGroups = allGroupIds.filter(id => !config.blackGroup.includes(id));
      if (targetGroups.length === 0) {
        await e.reply(`黑名单过滤后无可用群聊！所有已入群都在黑名单中`);
        return true;
      }
    }

    // ===== 自动执行广播 =====
    await e.reply(`✅ 全自动获取群聊成功！\n📢 开始${type || '全群'}广播，共${targetGroups.length}个有效群聊\n${type ? `🔍 过滤后群号：${targetGroups.join(', ')}` : ''}`);
    await 发送消息(targetGroups, broadcastContent, bot, e);
    await e.reply(`📢 ${type || '全群'}广播完成！本次共向${targetGroups.length}个群发送内容`);
    return true;
  }
}

// 全自动适配发送，无需手动干预
async function 发送消息(groupIds, message, bot, e) {
  let remain = groupIds.length;
  const { delays, Nnumber, random_delays } = config;
  for (const gid of groupIds) {
    remain--;
    // 自动计算延迟（无需手动配置）
    const delay = delays ? (random_delays ? Math.floor(Math.random() * 2000) + 4000 : Nnumber) : 0;
    try {
      // 全自动发送到自动获取的群聊
      await bot.pickGroup(gid).sendMsg(message);
      await e.reply(`✅ 群${gid} 发送成功\n⏳ 等待${delay}ms | 剩余${remain}个群`);
    } catch (err) {
      await e.reply(`❌ 群${gid} 发送失败：${err.message || '网络/权限问题'}\n⏳ 等待${delay}ms | 剩余${remain}个群`);
    }
    if (delay > 0) await common.sleep(delay);
  }
  return 'OK';
}