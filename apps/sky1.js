import plugin from '../../../lib/plugins/plugin.js';
import common from '../../../lib/common/common.js'; // 重新导入common模块
import { segment } from 'oicq';
import { exec } from 'child_process';
import { promisify } from 'util';

const curl = promisify(exec);

export class SkyInternationalTask extends plugin {
    constructor() {
        super({
            name: '光遇国际服任务',
            dsc: '光遇国际服每日任务查询（自定义头像+昵称）',
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
            // 1. 请求头像接口：获取sky助手的头像链接
            const avatarCmd = `curl -s http://baizihaoxiao.xin/API/qqap.php?qq=3812808525`;
            const { stdout: avatarStdout } = await curl(avatarCmd);
            const avatarRes = JSON.parse(avatarStdout);
            if (avatarRes.code !== 0) throw new Error("头像获取失败");
            const skyAvatarUrl = avatarRes.data;


            // 2. 请求光遇任务接口：获取最新数据
            const taskCmd = `curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" http://baizihaoxiao.xin/API/sky5.php`;
            const { stdout: taskStdout } = await curl(taskCmd);
            const taskRes = JSON.parse(taskStdout);
            if (taskRes.status !== 'success' || !taskRes.data) throw new Error("任务接口数据异常");
            const { text, time, source, images } = taskRes.data;


            // 3. 清洗文本+合并为紧凑块（无空格）
            const cleanText = text.replace(/\n/g, '\r')
                                  .replace(/​/g, '')
                                  .replace(/\\\//g, '/')
                                  .trim();
            const mainContent = [
                cleanText,
                `📅 数据更新时间：${time}`,
                `📌 数据来源：${source}`
            ].join('\r');


            // 4. 构造消息列表（每个消息块指定发送者：sky助手+自定义头像）
            let MsgList = [
                {
                    nickname: "sky助手",
                    avatar: skyAvatarUrl,
                    content: mainContent
                }
            ];
            // 按顺序添加图片（同发送者信息）
            images.forEach(imgUrl => {
                MsgList.push({
                    nickname: "sky助手",
                    avatar: skyAvatarUrl,
                    content: segment.image(imgUrl.replace(/\\\//g, '/'))
                });
            });


            // 5. 用common.makeForwardMsg生成转发卡片（你环境中验证可行的方法）
            const forwardMsg = await common.makeForwardMsg(e, MsgList, "光遇国际服每日任务");
            e.reply(forwardMsg);
            return true;

        } catch (err) {
            console.error(`[光遇国际服任务] 异常：`, err.message);
            e.reply('光遇国际服任务查询失败，请稍后重试~', true);
            return true;
        }
    }
}