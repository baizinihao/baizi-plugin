import plugin from '../../../lib/plugins/plugin.js';

export class JinRiYunShi extends plugin {
  constructor() {
    super({
      name: "今日运势",
      dsc: "查询生肖/星座今日运势",
      event: "message",
      priority: 5000,
      rule: [
        { reg: "^#?(今日)?运势\\s*(\\S*)$", fnc: "yunshi" }
      ]
    });
  }

  async requestApi(val) {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`http://baizihaoxiao.xin/API/she.php?val=${encodeURIComponent(val)}`, {
        signal: controller.signal,
        method: "GET"
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch (e) {
      return { code: 500, msg: "运势查询失败，请稍后重试" };
    }
  }

  async yunshi(e) {
    let val = e.msg.match(/^#?(今日)?运势\s*(\S*)$/)[2] || "";
    if (!val) {
      return await e.reply("请输入查询参数，示例：\n运势 鼠\n运势 白羊\n运势 随机", true);
    }
    const data = await this.requestApi(val);
    if (data.code !== 200) {
      return await e.reply(data.msg || "查询失败", true);
    }
    let msg = `【今日运势】\n查询日期：${data.data['查询日期']}\n`;
    msg += data.data['生肖'] ? `生肖：${data.data['生肖']}\n` : `星座：${data.data['星座']}\n`;
    msg += `整体：${data.data['整体']}\n爱情：${data.data['爱情']}\n`;
    msg += `事业：${data.data['事业']}\n财运：${data.data['财运']}\n`;
    msg += `幸运色：${data.data['幸运色']}\n幸运数字：${data.data['幸运数字']}`;
    await e.reply(msg, true);
  }
}