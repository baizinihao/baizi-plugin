import { segment } from 'oicq';

export class SkyInternationalTaskPlugin extends plugin {
    constructor() {
        super({
            name: '[Ts]光遇国际服任务',
            dsc: '光遇国际服每日任务查询，转发卡片样式',
            event: 'message',
            priority: 10,
            rule: [
                { reg: /^[#\/]?国际服任务$/i, fnc: 'showInternationalTask' }
            ]
        });
    }

    async showInternationalTask(e) {
        try {
            const response = await fetch('http://baizihaoxiao.xin/API/sky5.php');
            const res = await response.json();
            if (res.status !== 'success') return e.reply('光遇国际服任务数据获取失败');
            
            const { text, time, source, images } = res.data;
            const content = text.replace(/\n/g, '\r').replace(/​/g, '').trim();
            const msgList = [content, `\r📅更新时间：${time}`, `\r📌数据来源：${source}`];
            
            images.forEach(imgUrl => msgList.push(segment.image(imgUrl)));

            const forwardData = [
                {
                    sender: { nickname: '光遇国际服任务Bot', user_id: 2854196306 },
                    time: new Date().getTime(),
                    content: msgList
                }
            ];

            const forwardCard = segment.forward(e.isGroup ? e.group_id : e.user_id, forwardData);
            return e.reply(forwardCard);
        } catch (error) {
            return e.reply('光遇国际服任务查询异常，请稍后再试');
        }
    }
}