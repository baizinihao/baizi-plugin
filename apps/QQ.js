import plugin from '../../../lib/plugins/plugin.js';

export class QQHead extends plugin {
  constructor() {
    super({
      name: "QQ头像获取",
      dsc: "通过QQ号查询头像",
      event: "message",
      priority: 5000,
      rule: [
        { reg: "^#?(QQ|qq)头像\\s*(\\d+)$", fnc: "getQQHead" }
      ]
    });
  }

  async requestApi(qq) {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`http://baizihaoxiao.xin/API/qqap.php?qq=${encodeURIComponent(qq)}`, {
        signal: controller.signal,
        method: "GET"
      });
      if (!res.ok) throw new Error();
      return await res.json();
    } catch (e) {
      return { code: 0, msg: "头像查询失败，请稍后重试" };
    }
  }

  async getQQHead(e) {
    const qq = e.msg.match(/^#?(QQ|qq)头像\\s*(\\d+)$/)[2];
    const data = await this.requestApi(qq);
    if (data.code !== 1 || !data.data) {
      return await e.reply(data.msg || "查询失败，可能是QQ号无效", true);
    }
    
    await e.reply(segment.image(data.data), true);
  }
}