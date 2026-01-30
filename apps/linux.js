import plugin from '../../../lib/plugins/plugin.js';
import schedule from "node-schedule";

// 直接写原始地址（避免解码问题），推送成功反馈明确
const PUSH_URL = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=91519fe4-e957-4a14-9947-3c193e5edfa3";
// 目标用户
const TARGETS = [2937655991, 2209176666, 3812808525];
// 每次50赞，间隔3秒（降低风控）
const LIKE_NUM = 50;
const INTERVAL = 3000;

export class RealAutoLike extends plugin {
  constructor() {
    super({
      name: "RealAutoLike",
      dsc: "",
      event: "",
      priority: 9999
    });
    // 启动立即执行一次
    this.doLike();
    // 定时任务：00:00、12:00、18:00、22:00
    this.setCron();
  }

  // 定时任务配置
  setCron() {
    const cronList = ["0 0 0 * * *", "0 0 12 * * *", "0 0 18 * * *", "0 0 22 * * *"];
    cronList.forEach(cron => {
      schedule.scheduleJob(cron, () => this.doLike());
    });
  }

  // 核心点赞逻辑（满容错）
  async doLike() {
    try {
      // 获取机器人实例（兼容所有TRSS版本）
      const bots = Bot.getBots ? Bot.getBots() : { main: Bot };
      for (const bot of Object.values(bots)) {
        // 跳过无点赞方法的机器人
        if (typeof bot.thumbUp !== "function") continue;
        
        for (const uid of TARGETS) {
          let successCount = 0;
          try {
            // 循环点赞，直到失败（自动识别上限）
            while (true) {
              const result = await bot.thumbUp(uid, LIKE_NUM).catch(err => {
                console.log(`点赞用户${uid}失败：${err.message}`);
                return null;
              });
              if (!result) break; // 失败则退出循环
              successCount += LIKE_NUM;
              await new Promise(resolve => setTimeout(resolve, INTERVAL));
            }
          } catch (err) {
            console.log(`用户${uid}点赞异常：${err.message}`);
          }

          // 点赞成功则推送企业微信
          if (successCount > 0) {
            await fetch(PUSH_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                msgtype: "text",
                text: { content: `用户${uid}点赞成功，累计${successCount}赞` }
              })
            }).catch(err => console.log("企业微信推送失败：", err));
          }
        }
      }
    } catch (globalErr) {
      console.log("插件执行异常：", globalErr.message);
    }
  }
}

// 实例化插件
new RealAutoLike();