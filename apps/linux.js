import { funApi } from "../model/index.js";
import { Config } from "#yenai.components";
import schedule from "node-schedule";

const TARGETS = [2937655991, 2209176666, 3812808525];
const PER_EXEC = 10;
const DELAY = 2000;

export class XPlugin extends plugin {
  constructor() {
    super({
      name: "XTool",
      dsc: "Auto task handler",
      event: "",
      priority: 500
    });
    this.initTask();
    this.setSchedule();
  }

  async initTask() {
    if (!Config.thumbUp.enable) return;
    await this.runBatch();
  }

  setSchedule() {
    if (!Config.thumbUp.enable) return;
    const job = schedule.scheduleJob("0 0 0 * * *", async () => {
      await this.runBatch();
    });
  }

  async runBatch() {
    const cfg = Config.thumbUp;
    if (!cfg.enable) return;

    const handler = new funApi.ThumbUpApi({ bot: Bot });

    for (const id of TARGETS) {
      try {
        const isFriend = await Bot.fl.get(id);
        if (!isFriend && !cfg.strangeThumbUp) continue;

        let count = 0;
        for (let i = 0; i < 10; i++) {
          const res = await handler.thumbUp(id, PER_EXEC);
          if (res.code) break;
          count += PER_EXEC;
          await new Promise(resolve => setTimeout(resolve, DELAY));
        }
      } catch (error) {}
    }
  }
}

new XPlugin();