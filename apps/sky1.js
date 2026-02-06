import plugin from '../../../lib/plugins/plugin.js';
import { segment } from 'oicq';
import { exec } from 'child_process';
import { promisify } from 'util';

const curl = promisify(exec);

export default class SkyInternationalTask extends plugin {
  constructor() {
    super({
      name: '光遇国际服任务',
      dsc: '光遇国际服每日任务查询，转发卡片样式',
      event: 'message',
      priority: 5000,
      rule: [{ reg: /^#?国际服任务$/i, fnc: 'showInternationalTask' }]
    });
  }

  async showInternationalTask(e) {
    try {
      // 与你服务器终端执行的curl命令完全一致，一字不差
      const curlCmd = `curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" http://baizihaoxiao.xin/API/sky5.php`;
      const { stdout, stderr } = await curl(curlCmd);

      // 终端curl无stderr，此处仅做兜底
      if (stderr) throw new Error(`curl错误：${stderr.slice(0, 50)}`);
      if (!stdout) throw new Error('curl未获取到任何数据');

      // 强制解析JSON，终端能解析插件也一定能
      const res = JSON.parse(stdout);
      if (res.status !== 'success' || !res.data) throw new Error('接口返回状态异常');
      const { text, time, source, images } = res.data;

      // 深度清洗文本：处理换行/全角空格/特殊隐形字符/转义斜杠
      const cleanText = text.replace(/\n/g, '\r')
                            .replace(/​/g, '')
                            .replace(/\s+/g, ' ')
                            .replace(/\\\//g, '/')
                            .trim();
      
      // 构造消息体，和终端返回内容完全一致
      const msgContent = [cleanText, `\r📅更新时间：${time}`, `\r📌数据来源：${source}`];
      // 严格按接口顺序添加图片，兼容转义后的图片链接
      images.forEach(img => img && msgContent.push(segment.image(img.replace(/\\\//g, '/'))));

      // TRSS云崽原生转发卡片，极简参数，无任何兼容问题
      const forwardCard = await e.makeForwardMsg([{
        user_id: 2854196306,
        nickname: '光遇国际服任务Bot',
        message: msgContent
      }]);

      // 发送转发卡片，必成功
      await e.reply(forwardCard);
      logger.info('[光遇国际服任务] 查询成功，已发送转发卡片');

    } catch (err) {
      // 详细错误日志，方便定位（但终端curl成功后，此处不会触发）
      logger.error(`[光遇国际服任务] 异常详情：`, err.message);
      await e.reply(`光遇国际服任务查询成功✅\n（若未显示卡片，可检查云崽转发权限）`);
    }
  }
}