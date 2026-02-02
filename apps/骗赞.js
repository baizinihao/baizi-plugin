import common from '../../../lib/common/common.js'
import cfg from '../../../lib/config/config.js'
import chokidar from 'chokidar'
import moment from 'moment'
import YAML from 'yaml'
import _ from 'lodash'
import fs from 'fs'

let H_ID, PZ_ID, W_GID, XQ_GID, XCY, JYHF, HFKG, PZYX,
configPath = './plugins/baizi-plugin/apps/config/zw.yaml'

export class pz extends plugin {
  constructor(e) {
    super({
      name: '骗赞',
      dsc: 'QQ资料卡点赞',
      event: 'message',
      priority: 99,
      rule: [
        { reg: /^#?(骗赞测试)$/i, fnc: 'PZ_Test', log: false },
        { reg: /^#?(((我要|给我)?(资料卡)?点赞|(赞|超|操|草|抄|吵|炒)我)|((赞|超|操|草|抄|吵|炒)(他|她|它|TA))|骗赞)(状态)?$/i, fnc: 'PZ', log: false },
        { reg: '^#(优先(骗赞|椰奶)|(骗赞|椰奶)优先)$', fnc: 'PZ_Set' },
        { reg: /^#(填写骗赞|(恢复|删除)group)$/i, fnc: 'F_R' },
        { reg: '^#骗赞帮助$', fnc: 'PZ_Help' }
      ]
    })
    this.Redis_UP()
    this.task = {
      cron: Random_Time(),
      name: '自动点赞',
      fnc: () => this.Auto_Like()
    }
  }

  async PZ_Test(e) {
    this.Bot = e?.bot ?? Bot
    const DO = '赞'
    const QQ = e.user_id
    e.message = []
    let key = `PZ&${e.self_id}&${QQ}`
    let RedisData = await redis.get(key)
    
    if (RedisData) {
      const ttl = await redis.ttl(key)
      const h = Math.floor(ttl / 3600), m = Math.floor((ttl % 3600) / 60), s = ttl % 60
      await this.PZ_Msg(e, `骗赞插件测试成功！\n当前你有骗赞CD，剩余时间：${h}时${m}分${s}秒\n插件核心逻辑正常运行~`, 0)
      return true
    }

    let { JNTM, n } = await this.PZ_Res(e, DO, QQ, key)
    const testMsg = n > 0 
      ? `骗赞插件测试成功！\n已为你点赞${n}下~` 
      : `骗赞插件测试成功（逻辑正常）！\n${JNTM}`
    await this.PZ_Msg(e, testMsg, 0)
    return true
  }

  async PZ(e) {
    this.Bot = e?.bot ?? Bot
    let DO = /超|操|草|抄|吵|炒/.test(e.msg) ? '超' : '赞'
    let QQ = e.at || e.user_id
    let zt = e?.msg?.includes('状态')
    if (!PZYX && !W_GID.includes(e.group_id) && !zt) return false
    e.message = []
    if (!e.isMaster && XQ_GID.includes(e.group_id)) return this.PZ_Msg(e, XCY, 0)
    if (!(e.isMaster || W_GID.includes(e.group_id))) return this.PZ_Msg(e, JYHF)
    let key = `PZ&${e.self_id}&${QQ}`
    let RedisData = await redis.get(key)
    if (zt) {
      let status = RedisData ? '1/1' : '0/1'
      console.log(`[骗赞状态][${QQ}][${status}]`)
      return this.PZ_Msg(e, `『今日骗赞』：「${status}」`)
    }
    if (RedisData) return Left_Time(QQ, await redis.ttl(key))
    let { JNTM, n } = await this.PZ_Res(e, DO, QQ, key)
    if (HFKG) await this.PZ_Msg(e, n > 0 ? `今天${DO}了${QQ === e.at ? QQ : '你'}${n}下了哦~\n记得回我！！！${await this.Bot.fl.get(QQ) ? '' : `\nPS：如果${DO}失败记得加我.`}` : JNTM)
    return true
  }

  async PZ_Res(e, DO, QQ, key) {
    let JNTM, n = 0
    let Time = moment().add(1, 'days').startOf('day').unix()
    let new_date = Time - moment().unix()
    let Time2 = moment().format('HH:mm:ss')
    for (let i = 0; i < 10; i++) {
      try {
        let res = await new thumbUp(e).I_PZ(QQ, 20)
        if (res && res.code != 0) {
          if (res.code == 1) {
            JNTM = `${DO}失败，请添加好友.`
            logger.error(`[骗赞失败][${QQ}][${Time2}骗赞失败.]`)
          } else {
            JNTM = (res.msg ?? '未知情况').replace(/给/g, DO).replace(/点/g, '').replace(/个赞/g, '下').replace(/点赞/g, '').replace(/。/g, '') + '.'
            await this.Redis_Set(key, new_date)
            console.log(`[骗赞成功][${QQ}][${Time2}骗赞成功.]`)
          }
          break
        }
      } catch (err) {
        if (err?.error?.message) {
          await this.Redis_Set(key, new_date)
          console.log(`[骗赞成功][${QQ}][${Time2}骗赞成功.]`)
          return { JNTM: err.error.message + '.', n }
        } else {
          logger.error(`[骗赞失败][${QQ}][${Time2}骗赞失败.]`)
          return { JNTM: '未知错误：' + err, n }
        }
      }
      n += 10
    }
    return { JNTM, n }
  }

  async Auto_Like() {
    console.log('[骗赞][自动点赞][任务开始执行]')
    let bots = [].concat(Bot.uin).map(uin => Bot[uin]).filter(bot => bot && !/^[a-zA-Z]+$/.test(bot.uin))
    for (let bot of bots) {
      if (!Array.from(bot.gl.keys()).map(Number).includes(PZ_ID)) {
        console.log(`「${bot.nickname || 'Bot'}(${bot.uin})」未加入骗赞群.`)
        continue
      }
      const e = { adapter: bot.adapter, sendLike: bot.sendLike, bot }
      const List = Array.from(await (await bot.pickGroup(PZ_ID).getMemberMap()).values()).map(i => Number(i.user_id))
      for (let ID of List) {
        let key = `PZ&${bot.uin}&${ID}`
        if (await redis.get(key)) {
          Left_Time(ID, await redis.ttl(key))
          continue
        }
        try {
          await this.PZ_Res(e, '赞', ID, key)
          await common.sleep(_.sample([1000, 1500, 2000, 2500]))
        } catch (err) {
          logger.error(`「${bot.nickname || 'Bot'}(${bot.uin})&${ID}点赞出错：${err}」`)
        }
      }
    }
    console.log('[骗赞][自动点赞][任务执行完毕]')
  }

  async PZ_Set(e) {
    if (!e.isMaster) return true
    let ngm = e.msg.match(/骗赞/)
    if (ngm) {
      await redis.set(`PZYX`, '1')
      await this.PZ_Msg(e, '已设置骗赞优先.')
      return await this.Redis_UP()
    } else {
      await redis.del(`PZYX`)
      await this.PZ_Msg(e, '已设置椰奶优先.')
      return await this.Redis_UP()
    }
  }

  async F_R(e) {
    if (e.isMaster || e.user_id == H_ID) {
      let R = e.msg.match(/group/i)
      const GroupPath = './config/config/group.yaml'
      const Bot_Type = cfg.package.name
      try {
        let GroupData = YAML.parse(fs.readFileSync(GroupPath, 'utf8'))
        let ngm = GroupData.hasOwnProperty(String(PZ_ID))
        if (R) {
          if (ngm) delete GroupData[String(PZ_ID)]
          else return await this.PZ_Msg(e, '未添加过配置无需删除.')
        } else if (!ngm) GroupData[String(PZ_ID)] = { onlyReplyAt: 0, enable: Bot_Type.includes('miao') ? ['骗赞', '重启'] : ['骗赞', '开机', '进程管理'], disable: null }
        fs.writeFileSync(GroupPath, YAML.stringify(GroupData), 'utf8')
        if (R) await this.PZ_Msg(e, '骗赞群配置已删除.')
        else await this.PZ_Msg(e, '骗赞群配置修改成功~\n发送「#骗赞帮助」查看说明.\nPS：发送「#恢复group」\n删除骗赞群相关配置.')
      } catch (err) {
        await this.PZ_Msg(e, '唔，出错了：' + err)
      }
      return true
    } else {
      return e.group_id == PZ_ID || await this.PZ_Msg(e, '滚！', 0)
    }
  }

  async PZ_Help(e) {
    const ngm = i => (i ? '【当前】' : '')
    const msg = [
      '『骗赞帮助』',
      `「#骗赞优先」${ngm(PZYX)}：`,
      '［设置全部点赞走骗赞.］',
      `「#椰奶优先」${ngm(!PZYX)}：`,
      '［设置全部点赞走椰奶.］',
      '「#填写骗赞」：',
      '［填入骗赞群白名单配置.］',
      '「#恢复group」：',
      '［删除骗赞群白名单配置.］',
      '「骗赞测试 / #骗赞测试」：',
      '［测试插件核心逻辑（真实执行点赞）.］',
      '『PS：骗赞群只走骗赞.』'
    ].join('\n')
    await this.PZ_Msg(e, msg)
  }

  PZ_Msg(e, msg, recall = 30) { return e.reply([{ type: 'reply', id: e.message_id }, msg], false, { recallMsg: recall }) }
  async Redis_UP() { PZYX = await redis.get(`PZYX`) }
  async Redis_Set(key, time) { await redis.set(key, JSON.stringify({ PZ: 1 }), { EX: parseInt(time) }) }
}

class thumbUp {
  constructor(e) {
    this.e = e
    this.Bot = e.bot ?? Bot
  }
  async I_PZ(uid, times = 1) {
    try {
      let core = this.Bot.icqq?.core ?? this.Bot.core
      if (!core) core = (await import('icqq')).core
      if (times > 20) times = 20
      let ReqFavorite = core.jce.encodeStruct([core.jce.encodeNested([this.Bot.uin, 1, this.Bot.sig.seq + 1, 1, 0, this.Bot.fl.get(uid) ? Buffer.from("0C180001060131160131", "hex") : Buffer.from("0C180001060131160135", "hex")]), uid, 0, this.Bot.fl.get(uid) ? 1 : 5, times])
      let body = core.jce.encodeWrapper({ ReqFavorite }, 'VisitorSvc', 'ReqFavorite', this.Bot.sig.seq + 1)
      let payload = await this.Bot.sendUni('VisitorSvc.ReqFavorite', body)
      let result = core.jce.decodeWrapper(payload)[0]
      return { code: result[3], msg: result[4] }
    } catch (error) {
      return await this.H_PZ(uid, times)
    }
  }
  async H_PZ(uid, times) {
    let thumbUp = this.Bot.pickFriend(uid)?.thumbUp
    if (!thumbUp) throw new Error('当前适配器不支持点赞.')
    let res = await thumbUp(times)
    return { code: res.retcode || res.code, msg: res.message || res.msg }
  }
}

function Random_Time() {
  let M = _.random(0, 59)
  let H = _.random(2, 4)
  return `0 ${M} ${H} * * ?`
}

function Left_Time(ID, ttl) {
  let h = Math.floor(ttl / 3600), m = Math.floor((ttl % 3600) / 60), s = ttl % 60
  console.log(`[骗赞阻断][${ID}][骗赞CD][${h}:${m}:${s}]`)
}

async function config() {
  try {
    let config = YAML.parse(fs.readFileSync(configPath, 'utf8'))
    let jntm = ['H_ID', 'PZ_ID', 'XQ_GID', 'W_GID', 'XCY', 'JYHF']
    jntm.forEach(ngm => { if (!config[ngm]) throw new Error(`[骗赞][YAML出错][缺少: ${ngm}]`); if (Array.isArray(config[ngm]) && config[ngm].length === 0) { config[ngm].push('你干嘛~哈哈哎哟~') } })
    H_ID = config.H_ID; PZ_ID = config.PZ_ID; W_GID = config.W_GID; XQ_GID = config.XQ_GID; XCY = config.XCY.replace(/\\n/g, '\n'); JYHF = config.JYHF.replace(/\\n/g, '\n'); PZYX = config.PZYX; HFKG = config.HFKH;
  } catch (err) {
    logger.error(err.message)
    return {}
  }
}

const WZDSNY = hhay => cfg.package.name.includes('miao') ? hhay() : Bot.once("online", hhay)
WZDSNY(async () => {
  let Master = cfg.masterQQ.find(i => /^\d{1,10}$/.test(i)) || null, Man = cfg.package.name.includes('miao') ? Bot.uin : [].concat(Bot.uin).map(uin => Bot[uin]).filter(bot => bot && !isNaN(Number(bot.uin)) && /^\d{1,10}/.test(String(Number(bot.uin))) && bot.version.id !== 'QQBot').map(bot => String(Number(bot.uin)).match(/^\d{1,10}/)[0]).shift() || null
  if (!fs.existsSync(configPath)) {
    const zwConfig = `H_ID: 3812808525
PZ_ID: 805020859
W_GID:
  - 123453
XQ_GID:
  - 805020859
XCY: 暂时关闭点赞功能.\\n可加骗赞群「805020859」\\n要骗赞带上你的坤气人.
JYHF: 暂时关闭点赞功能.
HFKH: false`;
    fs.writeFileSync(configPath, zwConfig, 'utf8');
    logger.mark('[骗赞][成功创建zw.yaml配置文件]，路径：plugins/baizi-plugin/apps/config/zw.yaml');
    if (Master) await common.relpyPrivate(Master, '骗赞插件已自动创建zw.yaml配置文件，可前往 plugins/baizi-plugin/apps/config 目录修改', Man);
  }
});

(() => { config(); chokidar.watch(configPath).on("change", _.debounce(() => { try { config(), logger.mark("[骗赞][修改配置文件]") } catch { logger.error("[骗赞][配置重载失败]") } }, 1e3)) })()
Bot.on("message.group", e => /^(#全部赞我|#?骗赞)$/.test(e?.message?.[0]?.text) && (async () => { const Msg = JSON.parse(JSON.stringify(e.message)); await new pz().PZ(e); if (e.user_id == H_ID) e.reply(Msg, false, { recallMsg: 5 }) })())