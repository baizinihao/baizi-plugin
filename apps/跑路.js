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
    const startTime = Date.now();
    const steps = [
      'Gitee删除中.....',
      'Gitee删除完成',
      'GitHub删除中.....',
      'GitHub删除完成',
      'MySQL清除中......',
      'MySQL清除成功',
      '正在执行命令：sudo rm -rf ./TRSS-Yunzai',
      '指令执行成功'
    ];
    for (const step of steps) {
      await e.reply(step, false, { at: false });
      const delayTime = this.randomDelay();
      await this.delay(delayTime);
    }
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    await e.reply(`\n跑路完成，用时${totalTime}秒喵～`, false, { at: true });
  }
}