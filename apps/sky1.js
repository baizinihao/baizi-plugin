import plugin from '../../../lib/plugins/plugin.js';
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
            const { stdout: avatarStdout, stderr: avatarStderr } = await curl(avatarCmd);
            if (avatarStderr) throw new Error(`头像接口请求失败：${avatarStderr}`);
            const avatarRes = JSON.parse(avatarStdout);
            if (avatarRes.code !== 0) throw new Error("头像获取失败");
            const skyAvatarUrl = avatarRes.data; // 接口返回的头像链接


            // 2. 请求光遇任务接口：获取最新数据
            const taskCmd = `curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" http://baizihaoxiao.xin/API/sky5.php`;
            const { stdout: taskStdout, stderr: taskStderr } = await curl(taskCmd);
            if (taskStderr) throw new Error(`任务接口请求失败：${taskStderr}`);
            if (!taskStdout) throw new Error("任务数据为空");
            const taskRes = JSON.parse(taskStdout);
            if (taskRes.status !== 'success' || !taskRes.data) throw new Error("任务接口数据异常");
            const { text, time, source, images } = taskRes.data;


            // 3. 清洗文本（无多余空格/换行）
            const cleanText = text.replace(/\n/g, '\r')
                                  .replace(/​/g, '')
                                  .replace(/\\\//g, '/')
                                  .trim();
            // 合并文本为单个紧凑块（解决空格问题）
            const mainContent = [
                cleanText,
                `📅 数据更新时间：${time}`,
                `📌 数据来源：${source}`
            ].join('\r');


            // 4. 构造转发卡片节点（自定义昵称+头像）
            const forwardNodes = [
                {
                    sender: {
                        nickname: "sky助手", // 昵称改为sky助手
                        user_id: 3812808525  // 对应头像接口的QQ号
                    },
                    time: Date.now(),
                    content: mainContent,
                    avatar: skyAvatarUrl  // 用接口获取的头像链接
                }
            ];
            // 按顺序添加图片（保持相同昵称+头像）
            images.forEach(imgUrl => {
                forwardNodes.push({
                    sender: { nickname: "sky助手", user_id: 3812808525 },
                    time: Date.now(),
                    content: segment.image(imgUrl.replace(/\\\//g, '/')),
                    avatar: skyAvatarUrl
                });
            });


            // 5. 生成并发送转发卡片
            const forwardMsg = await e.makeForwardMsg(forwardNodes);
            e.reply(forwardMsg);
            return true;

        } catch (err) {
            console.error(`[光遇国际服任务] 异常：`, err.message);
            e.reply('光遇国际服任务查询失败，请稍后重试~', true);
            return true;
        }
    }
}