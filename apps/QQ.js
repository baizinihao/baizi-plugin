import plugin from '../../../lib/plugins/plugin.js';

export class QQHead extends plugin {
  constructor() {
    super({
      name: "QQ头像获取",
      dsc: "通过QQ号查询头像",
      event: "message",
      priority: 5000,
      rule: [{ reg: "^#?(QQ|qq)头像\\s*(\\d+)$", fnc: "getQQHead" }]
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
      return res.ok ? await res.json() : { code: 0 };
    } catch (e) {
      return { code: 0 };
    }
  }

  async getQQHead(e) {
    const matchRes = e.msg.match(/^#?(QQ|qq)头像\s*(\d+)$/);
    if (!matchRes || !matchRes[2]) {
      return await e.reply("请输入正确格式：qq头像10001 或 QQ头像 123456", true);
    }
    const qq = matchRes[2];
    const data = await this.requestApi(qq);
    if (!data.data || typeof data.data !== 'string' || !data.data.startsWith('http')) {
      return await e.reply(data.msg || "头像链接无效", true);
    }
    await e.reply(segment.image(data.data), true);
  }
}