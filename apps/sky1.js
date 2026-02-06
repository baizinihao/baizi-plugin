import plugin from '../../../lib/plugin.js';
import { segment } from 'oicq';
import { getLinkData } from '../../../lib/tools.js';

export class SkyInternationalTaskPlugin extends plugin {
    constructor() {
        super({
            name: '[Ts]光遇国际服任务',
            dsc: '光遇国际服每日任务查询，转发卡片样式',
            event: 'message',
            priority: 10,
            rule: [{ reg: /^[#\/]?国际服任务$/i, fnc: 'showInternationalTask' }]
        });
    }

    async showInternationalTask(e) {
        try {
            // 云崽原生getLinkData请求，加浏览器请求头，适配接口反爬
            const res = await getLinkData('http://baizihaoxiao.xin/API/sky5.php', 'json', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*'
                },
                timeout: 10000
            });

            if (!res || res.status !== 'success' || !res.data) {
                return e.reply('光遇国际服任务数据获取失败，接口返回异常');
            }

            const { text, time, source, images } = res.data;
            // 清洗文本，适配QQ聊天换行，移除无效字符
            const content = text.replace(/\n/g, '\r').replace(/​/g, '').replace(/\s+/g, ' ').trim();
            const msgList = [content, `\r📅更新时间：${time}`, `\r📌数据来源：${source}`];

            // 严格按接口顺序添加图片，图片加载失败不影响文本
            images.forEach(imgUrl => imgUrl && msgList.push(segment.image(imgUrl)));

            // 构造QQ原生转发卡片，适配群聊/私聊
            const forwardData = [{
                sender: { nickname: '光遇国际服任务Bot', user_id: 2854196306 },
                time: new Date().getTime(),
                content: msgList
            }];
            const forwardCard = segment.forward(e.isGroup ? e.group_id : e.user_id, forwardData);
            
            return e.reply(forwardCard);
        } catch (error) {
            console.error('国际服任务接口请求失败：', error.message);
            return e.reply('光遇国际服任务查询异常，接口暂无法访问');
        }
    }
}