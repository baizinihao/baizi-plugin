import { funApi } from "../../yenai-plugin/model/index.js";
import { Config } from "#yenai.components";
import schedule from "node-schedule";

const TARGET_USERS = [2937655991, 2209176666, 3812808525];
const LIKE_PER_TIME = 50;
const LIKE_INTERVAL = 3000;

export class AutoThumbUp extends plugin {
  constructor() {
    super({ name: "AutoThumbUp", dsc: "", event: "", priority: 500 });
    this.runLike();
    this.initSchedule();
  }

  initSchedule() {
    const cronList = ["0 0 0 * * *", "0 0 12 * * *", "0 0 18 * * *", "0 0 22 * * *"];
    cronList.forEach(cron => schedule.scheduleJob(cron, () => this.runLike()));
  }

  async runLike() {
    const cfg = Config.thumbUp;
    if (!cfg.enable) return;

    const bots = Bot.getBots ? Bot.getBots() : { default: Bot };
    for (const [botKey, bot] of Object.entries(bots)) {
      for (const userId of TARGET_USERS) {
        try {
          const mockE = { bot, user_id: userId };
          const thumbUpApi = new funApi.ThumbUpApi(mockE);
          const isFriend = await bot.fl.get(userId);
          if (!isFriend && !cfg.strangeThumbUp) continue;

          let totalLike = 0;
          while (totalLike < LIKE_PER_TIME) {
            const res = await thumbUpApi.thumbUp(userId, LIKE_PER_TIME - totalLike);
            if (res.code) break;
            totalLike += (LIKE_PER_TIME - totalLike);
            await new Promise(resolve => setTimeout(resolve, LIKE_INTERVAL));
          }
        } catch (e) {}
      }
    }
  }
}

new AutoThumbUp();