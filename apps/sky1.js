import plugin from '../../../lib/plugins/plugin.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const curl = promisify(exec);

export class SkyInternationalTask extends plugin {
    constructor() {
        super({
            name: '光遇国际服任务',
            dsc: '光遇国际服每日任务查询',
            event: 'message',
            priority: 2000,
            rule: [{ reg: /^#?国际服任务$/i, fnc: 'showInternationalTask' }]
        });
    }

    async showInternationalTask() {
        let e = this.e;
        try {
            const taskCmd = `curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" http://baizihaoxiao.xin/API/sky5.php`;
            const { stdout: taskStdout } = await curl(taskCmd);
            const taskRes = JSON.parse(taskStdout);
            if (taskRes.status !== 'success' || !taskRes.data) throw new Error();

            const { text, time, source, images } = taskRes.data;
            const cleanText = text.replace(/\n/g, '\r').replace(/​/g, '').replace(/\\\//g, '/').trim();
            const fullText = `【sky助手】光遇国际服每日任务\r\r${cleanText}\r\r📅更新时间：${time}\r©️来源：${source}\r🔗 接口支持：baizihaoxiao.xin`;

            const msgArray = [{ type: 'text', data: { text: fullText } }];
            images.forEach(imgUrl => msgArray.push({ type: 'image', data: { file: imgUrl.replace(/\\\//g, '/') } }));

            await e.reply(msgArray);
            return true;
        } catch {
            await e.reply({ type: 'text', data: { text: '【sky助手】光遇国际服任务查询失败，请稍后重试~' } }, true);
            return true;
        }
    }
}