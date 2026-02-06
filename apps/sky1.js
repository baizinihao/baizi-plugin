import plugin from '../../../lib/plugins/plugin.js';
import common from '../../../lib/common/common.js';
import { segment } from 'oicq';
import { exec } from 'child_process';
import { promisify } from 'util';

const curl = promisify(exec);

export class SkyInternationalTask extends plugin {
    constructor() {
        super({
            name: '光遇国际服任务',
            dsc: '光遇国际服每日任务查询，转发卡片样式',
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
            const curlCmd = `curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" http://baizihaoxiao.xin/API/sky5.php`;
            const { stdout, stderr } = await curl(curlCmd);

            if (stderr) throw new Error(`curl请求错误：${stderr.slice(0, 50)}`);
            if (!stdout) throw new Error('curl未获取到任何数据');

            const res = JSON.parse(stdout);
            if (res.status !== 'success' || !res.data) throw new Error('接口返回数据异常');
            const { text, time, source, images } = res.data;

            // 1. 深度清洗文本，移除多余空格/换行
            const cleanText = text.replace(/\n/g, '\r')
                                  .replace(/​/g, '')
                                  .replace(/\\\//g, '/')
                                  .trim();
            
            // 2. 合并文本内容为「同一个消息块」（解决块之间的空格）
            const mainContent = [
                cleanText,
                `📅 数据更新时间：${time}`,
                `📌 数据来源：${source}`
            ].join('\r'); // 用\r紧凑换行，不额外加空格

            // 3. 构造消息列表：文本块 + 图片（图片单独成块，不影响文本排版）
            let MsgList = [mainContent];
            images.forEach(imgUrl => {
                MsgList.push(segment.image(imgUrl.replace(/\\\//g, '/')));
            });

            // 生成转发卡片
            const forwardMsg = await common.makeForwardMsg(e, MsgList, '光遇国际服每日任务');
            e.reply(forwardMsg);
            return true;

        } catch (err) {
            console.error(`[光遇国际服任务] 查询失败：`, err.message);
            e.reply('光遇国际服任务查询失败，请稍后重试~', true);
            return true;
        }
    }
}