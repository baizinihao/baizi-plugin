import plugin from '../../../../lib/plugins/plugin.js';
import axios from 'axios';

export default class 光遇随机叫声 extends plugin {
  constructor() {
    super({
      name: '随机光遇叫声',
      dsc: '调用指定接口返回随机光遇叫声',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: /^#?(随机)?光遇叫声$/,
          fnc: 'getSkySound'
        }
      ]
    });
  }

  async getSkySound(e) {
    const apiUrl = 'http://baizihaoxiao.xin/API/sky3.php';
    const hasHash = e.msg.startsWith('#');
    const prefix = hasHash ? '#' : '';

    try {
      const response = await axios.get(apiUrl);
      const soundText = response.data || '光遇叫声触发成功～';
      await e.reply(`${prefix}${soundText}`);
    } catch (error) {
      await e.reply(`${prefix}接口调用失败，请稍后再试～`);
      console.error('光遇叫声插件错误：', error);
    }
  }
}