import plugin from '../../../lib/plugins/plugin.js';

export class example2 extends plugin {
  constructor () {
    super({
      name: '跑路',
      dsc: '发送特定内容（带随机延迟，仅主人可用）',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#?跑路$',
          fnc: 'runAway',
          permission: 'master'
        }
      ]
    });
  }

  randomDelay() {
    return Math.floor(Math.random() * 20000);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runAway() {
    const e = this.e;
    if (!e.isMaster) return true;
    const totalStartTime = Date.now();
    const ops = ['Gitee', 'GitHub', 'API', 'MySQL'];
    for (const op of ops) {
      await e.reply(`${op}删除中.....`, false, { at: false });
      const delay = this.randomDelay();
      await this.delay(delay);
      const cost = (delay / 1000).toFixed(2);
      await e.reply(`${op}删除完成 耗时${cost}秒`, false, { at: false });
    }
    await e.reply('正在执行命令：sudo rm -rf ./Yunzai-Bot', false, { at: false });
    const cmdDelay = this.randomDelay();
    await this.delay(cmdDelay);
    const cmdCost = (cmdDelay / 1000).toFixed(2);
    await e.reply(`指令执行成功 耗时${cmdCost}秒`, false, { at: false });
    const totalCost = ((Date.now() - totalStartTime) / 1000).toFixed(2);
    await e.reply(`\n跑路完成，总用时${totalCost}秒喵～`, false, { at: true });
  }
}