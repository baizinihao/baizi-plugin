import plugin from '../../../lib/plugins/plugin.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const curl = promisify(exec);

export class SkyInternationalTask extends plugin {
    constructor() {
        super({
            name: '光遇国际服任务',
            dsc: '光遇国际服每日任务查询（稳定版）',
            event: 'message',
            priority: 2000,
            rule: [
                {
                    reg: /^#?国际服任务$/i,
                    fnc: 'showInternationalTask'
                }
            ]
        });
    }

    async showInternationalTask() {
        let e = this.e;
        try {
            // 1. 实时请求光遇任务接口
            const taskCmd = `curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" http://baizihaoxiao.xin/API/sky5.php`;
            const { stdout: taskStdout } = await curl(taskCmd);
            const taskRes = JSON.parse(taskStdout);
            if (taskRes.status !== 'success' || !taskRes.data) throw new Error("接口数据异常");
            const { text, time, source, images } = taskRes.data;

            // 2. 清洗文本（无多余空格/换行）
            const cleanText = text.replace(/\n/g, '\r')
                                  .replace(/​/g, '')
                                  .replace(/\\\//g, '/')
                                  .trim();
            // 构造完整文本（带sky助手标识）
            const fullText = `【sky助手】光遇国际服每日任务\r\r${cleanText}\r\r📅 数据更新时间：${time}\r📌 数据来源：${source}\r🔗 接口支持：baizihaoxiao.xin`;

            // 3. 构造消息数组（文本 + 图片，按顺序排列）
            const msgArray = [
                { type: 'text', data: { text: fullText } }
            ];
            // 按序添加图片（标准OneBot格式）
            images.forEach(imgUrl => {
                msgArray.push({ type: 'image', data: { file: imgUrl.replace(/\\\//g, '/') } });
            });

            // 4. 直接发送消息（无合并转发，100%成功）
            await e.reply(msgArray);
            return true;

        } catch (err) {
            console.error(`[光遇国际服任务] 异常：`, err.message);
            await e.reply({ type: 'text', data: { text: '【sky助手】光遇国际服任务查询失败，请稍后重试~' } }, true);
            return true;
        }
    }
}