import plugin from '../../../lib/plugins/plugin.js';
import common from '../../../lib/common/common.js';
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

            // 去掉MsgList里的重复标题，只保留内容文本
            let MsgList = [fullText];
            // 图片仍用消息段对象渲染
            images.forEach(imgUrl => {
                MsgList.push({ type: 'image', data: { file: imgUrl.replace(/\\\//g, '/') } });
            });

            // 仅通过makeForwardMsg的第三个参数设置唯一标题
            const forwardMsg = await common.makeForwardMsg(e, MsgList, '光遇国际服每日任务');
            await e.reply(forwardMsg);
            return true;
        } catch {
            await e.reply('【sky助手】光遇国际服任务查询失败，请稍后重试~', true);
            return true;
        }
    }
}