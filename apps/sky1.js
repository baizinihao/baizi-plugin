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
            // 加浏览器请求头，避免被接口拦截
            const response = await fetch('http://baizihaoxiao.xin/API/sky5.php', {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Connection': 'keep-alive'
                },
                timeout: 10000
            });
            // 校验接口响应状态（200-299为成功）
            if (!response.ok) throw new Error(`接口响应失败，状态码：${response.status}`);
            // 解析JSON
            const res = await response.json();
            // 校验接口返回状态
            if (res.status !== 'success') return e.reply('光遇国际服任务数据获取失败，接口返回异常');
            
            const { text, time, source, images } = res.data;
            const content = text.replace(/\n/g, '\r').replace(/​/g, '').trim();
            const msgList = [content, `\r📅更新时间：${time}`, `\r📌数据来源：${source}`];
            
            // 按顺序添加图片
            images.forEach(imgUrl => msgList.push(segment.image(imgUrl)));

            // 构造转发卡片
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
            // 打印详细错误日志（控制台可看），方便排查
            console.error('光遇国际服任务查询错误：', error.message);
            return e.reply('光遇国际服任务查询异常，请稍后再试');
        }
    }
}