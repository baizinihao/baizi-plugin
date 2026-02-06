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
            // 与终端完全一致的curl命令，实时请求接口最新数据
            const curlCmd = `curl -s -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" http://baizihaoxiao.xin/API/sky5.php`;
            const { stdout, stderr } = await curl(curlCmd);

            if (stderr) throw new Error(`curl请求错误：${stderr.slice(0, 50)}`);
            if (!stdout) throw new Error('curl未获取到任何数据');

            // 解析接口JSON数据
            const res = JSON.parse(stdout);
            if (res.status !== 'success' || !res.data) throw new Error('接口返回数据异常');
            const { text, time, source, images } = res.data;

            // 深度清洗文本，适配QQ聊天排版
            const cleanText = text.replace(/\n/g, '\r')
                                  .replace(/​/g, '')
                                  .replace(/\\\//g, '/')
                                  .trim();
            
            // 构造消息列表（参考插件写法，数组形式）
            let MsgList = [cleanText];
            // 添加更新时间和数据源
            MsgList.push(`\r📅 数据更新时间：${time}`);
            MsgList.push(`\r📌 数据来源：${source}`);
            // 严格按接口顺序添加3张图片，和参考插件一致的segment用法
            images.forEach(imgUrl => {
                MsgList.push(segment.image(imgUrl.replace(/\\\//g, '/')));
            });

            // 用你参考插件中**验证可行**的方法创建转发卡片！
            const forwardMsg = await common.makeForwardMsg(e, MsgList, '光遇国际服每日任务');
            // 发送转发卡片，和参考插件一致的回复方式
            e.reply(forwardMsg);
            return true;

        } catch (err) {
            console.error(`[光遇国际服任务] 查询失败：`, err.message);
            e.reply('光遇国际服任务查询失败，请稍后重试~', true);
            return true;
        }
    }
}