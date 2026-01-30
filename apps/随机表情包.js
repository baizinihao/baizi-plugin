import plugin from '../../../lib/plugins/plugin.js';

const EMOJI_LIST = [
  { cmd: '随机疾旋鼬', url: 'http://baizihaoxiao.xin/API/jixuanyou.php' },
  { cmd: '随机甘雨', url: 'http://baizihaoxiao.xin/API/gancheng.php' },
  { cmd: '随机柴郡', url: 'http://baizihaoxiao.xin/API/chaijun.php' },
  { cmd: '随机福瑞', url: 'http://baizihaoxiao.xin/API/furry.php' },
  { cmd: '随机龙图', url: 'http://baizihaoxiao.xin/API/longtu.php' },
  { cmd: '随机doro', url: 'http://baizihaoxiao.xin/API/doro.php' },
  { cmd: '随机初音', url: 'http://baizihaoxiao.xin/API/chuyin.php' }
];

// 生成所有触发指令（含加/不加井号）
const TRIGGER_CMDS = EMOJI_LIST.flatMap(item => [item.cmd, `#${item.cmd}`]);

export default class RandomEmoji extends plugin {
  constructor() {
    super({
      name: '随机表情包API',
      dsc: '支持多种随机表情包获取，含帮助指令',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: new RegExp(`^(${TRIGGER_CMDS.join('|')})$`), fnc: 'sendRandomEmoji' },
        { reg: '^表情包帮助$', fnc: 'showEmojiHelp' }
      ]
    });
  }

  // 发送表情包
  async sendRandomEmoji(e) {
    const cmd = e.msg.trim().replace(/^#/, ''); // 去除井号匹配原始指令
    const emoji = EMOJI_LIST.find(item => item.cmd === cmd);
    if (!emoji) return e.reply('未找到对应的表情包~');

    try {
      const res = await fetch(emoji.url, { timeout: 15000 });
      if (!res.ok) throw new Error(`状态码：${res.status}`);
      await e.reply([segment.image(res.url)]);
    } catch (err) {
      logger.error(`[随机表情包] ${cmd} 调用失败：`, err);
      await e.reply(`${cmd}获取失败，请稍后重试~`);
    }
  }

  // 表情包帮助
  async showEmojiHelp(e) {
    const emojiTypes = EMOJI_LIST.map(item => `- ${item.cmd}`).join('\n');
    const helpContent = `【表情包支持类型】
${emojiTypes}

使用说明：
1. 直接发送上述指令即可获取对应表情包
2. 指令前可加#号（例：#随机疾旋鼬）
3. 所有表情包均为随机返回`;
    await e.reply(helpContent);
  }
}
