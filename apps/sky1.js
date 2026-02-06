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
            dsc: '光遇国际服每日任务查询（适配Napcat）',
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
            // 1. 请求光遇任务接口
            const taskCmd = `curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" http://baizihaoxiao.xin/API/sky5.php`;
            const { stdout: taskStdout } = await curl(taskCmd);
            const taskRes = JSON.parse(taskStdout);
            if (taskRes.status !== 'success' || !taskRes.data) throw new Error("任务接口数据异常");
            const { text, time, source, images } = taskRes.data;


            // 2. 清洗文本+构造标准消息段（text类型）
            const cleanText = text.replace(/\n/g, '\r')
                                  .replace(/​/g, '')
                                  .replace(/\\\//g, '/')
                                  .trim();
            const textContent = [
                cleanText,
                `📅 数据更新时间：${time}`,
                `📌 数据来源：${source}`
            ].join('\r');
            // 标准文本消息段
            const textSegment = segment.text(textContent);


            // 3. 构造图片消息段（image类型）
            const imageSegments = images.map(imgUrl => segment.image(imgUrl.replace(/\\\//g, '/')));


            // 4. 构造合并转发节点（严格符合OneBot规范）
            // 注意：OneBot合并转发的头像由uin决定，这里用3812808525（对应你指定的QQ），头像会自动匹配
            const forwardNodes = [
                {
                    user_id: 3812808525,  // 必须填QQ号（uin），决定头像
                    nickname: "sky助手",   // 显示的昵称
                    message: [textSegment] // 消息段数组
                }
            ];
            // 添加图片节点（同uin+昵称）
            imageSegments.forEach(imgSeg => {
                forwardNodes.push({
                    user_id: 3812808525,
                    nickname: "sky助手",
                    message: [imgSeg]
                });
            });


            // 5. 生成并发送合并转发（适配Napcat）
            const forwardMsg = await common.makeForwardMsg(e, forwardNodes, "光遇国际服每日任务");
            e.reply(forwardMsg);
            return true;

        } catch (err) {
            console.error(`[光遇国际服任务] 异常：`, err.message);
            e.reply('光遇国际服任务查询失败，请稍后重试~', true);
            return true;
        }
    }
}