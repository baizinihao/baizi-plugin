import plugin from '../../../lib/plugins/plugin.js';

export class ApiQuery extends plugin {
  constructor() {
    super({
      name: "API查询",
      dsc: "更新日志|调用统计|延迟测试",
      event: "message",
      priority: 5000,
      rule: [
        { reg: "^#?更新日志$", fnc: "getLog" },
        { reg: "^#?调用统计$", fnc: "getCount" },
        { reg: "^#?延迟测试$", fnc: "getDelay" }
      ]
    });
  }

  async requestApi(url) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error();
      return await res.text();
    } catch (e) {
      return "获取失败，请稍后重试";
    }
  }

  // 通用合并转发发送方法
  async sendForward(e, cmd, content) {
    const forwardNodes = [
      {
        user_id: '3812808525',
        message: cmd
      },
      {
        user_id: '3812808525',
        message: content
      }
    ];
    try {
      if (e.isGroup) {
        const forwardMsg = await e.group.makeForwardMsg(forwardNodes);
        await e.reply(forwardMsg);
      } else {
        await e.reply(forwardNodes);
      }
    } catch (error) {
      await e.reply(content);
    }
  }

  async getLog(e) {
    const cmd = "更新日志";
    const res = await this.requestApi("http://baizihaoxiao.xin/API/gn.php");
    await this.sendForward(e, cmd, res);
  }

  async getCount(e) {
    const cmd = "调用统计";
    const res = await this.requestApi("https://baizihaoxiao.xin/API/ti.php");
    await this.sendForward(e, cmd, res);
  }

  async getDelay(e) {
    const cmd = "延迟测试";
    const res = await this.requestApi("http://baizihaoxiao.xin/API/ys.php");
    await this.sendForward(e, cmd, res);
  }
}