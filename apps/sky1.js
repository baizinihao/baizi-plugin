import plugin from '../../../lib/plugins/plugin.js';
import { segment } from 'oicq';

export default class SkyInternationalTask extends plugin {
  constructor() {
    super({
      name: '光遇国际服任务',
      dsc: '光遇国际服每日任务查询，转发卡片样式',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: /^#?国际服任务$/i,
          fnc: 'showInternationalTask'
        }
      ]
    });
  }

  async showInternationalTask(e) {
    try {
      // 实时请求接口，和你光遇叫声插件请求逻辑一致
      const res = await fetch('http://baizihaoxiao.xin/API/sky5.php', {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        }
      });

      if (!res.ok) throw new Error(`接口响应失败：${res.status}`);
      const data = await res.json();
      if (data.status !== 'success' || !data.data) throw new Error('接口返回数据异常');

      // 清洗文本，适配QQ聊天换行，移除无效字符
      const { text, time, source, images } = data.data;
      const content = text.replace(/\n/g, '\r').replace(/​/g, '').trim();
      const msgList = [content, `\r📅更新时间：${time}`, `\r📌数据来源：${source}`];

      // 严格按接口顺序添加图片，和你要求一致
      images.forEach(imgUrl => msgList.push(segment.image(imgUrl)));

      // 构造QQ原生转发聊天记录卡片，适配群聊/私聊
      const forwardData = [
        {
          sender: { nickname: '光遇国际服任务Bot', user_id: 2854196306 },
          time: new Date().getTime(),
          content: msgList
        }
      ];
      const forwardCard = segment.forward(e.isGroup ? e.group_id : e.user_id, forwardData);
      await e.reply(forwardCard);

    } catch (err) {
      // 和你光遇叫声插件一致的日志方式
      logger.error(`[光遇国际服任务] 查询失败：`, err);
      await e.reply('光遇国际服任务查询失败，请稍后重试~');
    }
  }
}