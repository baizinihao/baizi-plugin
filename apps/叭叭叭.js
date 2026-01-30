import axios from 'axios';
import { createRequire } from 'module';
import path from 'path';

// TRSS ES模块兼容导入：彻底解决plugin/segment找不到问题
const require = createRequire(import.meta.url);
const rootPath = process.cwd();
const plugin = require(path.join(rootPath, 'lib/plugins/plugin.js'));
const segment = require(path.join(rootPath, 'lib/segment.js'));

export class SkySound extends plugin {
  constructor() {
    super({
      name: '光遇随机叫声',
      dsc: '触发光遇随机叫声，支持#光遇叫声/随机光遇叫声',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#?光遇叫声$',
          fnc: 'skySound'
        },
        {
          reg: '^#?随机光遇叫声$',
          fnc: 'skySound'
        }
      ]
    });
  }

  async skySound(e) {
    try {
      // 加载提示，让你知道插件触发了
      await e.reply('正在获取光遇叫声～', true);
      // 硬编码调用你给的接口，5秒超时
      const res = await axios.get('http://baizihaoxiao.xin/API/sky3.php', {
        timeout: 5000,
        responseType: 'text'
      });
      // 清洗接口返回的链接（去空格/换行）
      const audioUrl = res.data.replace(/\s/g, '');
      // 判空有效链接
      if (!audioUrl || !audioUrl.startsWith('http')) {
        return await e.reply('获取失败，接口未返回有效音频链接', true);
      }
      // 发送音频（TRSS原生segment写法）
      await e.reply([segment.audio(audioUrl)]);
    } catch (err) {
      // 详细错误提示，方便排查
      await e.reply(`光遇叫声获取失败：${err.message || '网络/接口异常'}`, true);
    }
  }
}