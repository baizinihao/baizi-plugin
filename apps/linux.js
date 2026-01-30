import plugin from '../../../lib/plugins/plugin.js';
import schedule from 'node-schedule';

const T = [2937655991, 2209176666, 3812808525];
const A = 50;

export class Like extends plugin {
  constructor() {
    super({ name: "Like", dsc: "", event: "", priority: 9999 });
    this.run();
    this.cron();
  }

  cron() {
    const t = ["0 0 0 * * *", "0 0 12 * * *", "0 0 18 * * *", "0 0 22 * * *"];
    t.forEach(s => schedule.scheduleJob(s, () => this.run()));
  }

  async run() {
    const bots = Bot.getBots ? Bot.getBots() : { d: Bot };
    for (const bot of Object.values(bots)) {
      for (const id of T) {
        try {
          while(true) {
            if (bot.fl.has(id)) {
              await bot.pickFriend(id).thumbUp(A);
            } else {
              await bot.pickUser(id).thumbUp(A);
            }
          }
        } catch (e) {}
      }
    }
  }
}

new Like();