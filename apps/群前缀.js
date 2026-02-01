import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import lodash from 'lodash';
import chokidar from 'chokidar';

class JsonReader {
    constructor(filePath, watch = false) {
        this.filePath = filePath;
        this.config = this.loadConfig();
        if (watch) {
            chokidar.watch(this.filePath).on('change', () => {
                this.config = this.loadConfig();
            });
        }
    }

    loadConfig() {
        if (fs.existsSync(this.filePath)) {
            const file = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(file) || {};
        }
        fs.writeFileSync(this.filePath, JSON.stringify({}, null, 2), 'utf8');
        return {};
    }

    saveConfig() {
        const jsonStr = JSON.stringify(this.config, null, 2);
        fs.writeFileSync(this.filePath, jsonStr, 'utf8');
    }

    get(keyPath) {
        return lodash.get(this.config, keyPath);
    }

    set(keyPath, value) {
        lodash.set(this.config, keyPath, value);
        this.saveConfig();
    }
}

export class qianzhui extends plugin {
    constructor() {
        super({
            name: '群前缀设置',
            dsc: '群专属前缀配置',
            event: 'message',
            priority: 50,
            rule: [
                { reg: '^#群前缀(开启|关闭)$', fnc: 'openPrefix' },
                { reg: '^#设置前缀.*$', fnc: 'setPrefix' }
            ]
        });
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        this.configDir = path.join(__dirname, 'config');
        this.jsonFile = path.join(this.configDir, '群前缀.json');
        if (!fs.existsSync(this.configDir)) fs.mkdirSync(this.configDir, { recursive: true });
        this.jsonReader = new JsonReader(this.jsonFile, false);
    }

    async openPrefix(e) {
        if (!e.isGroup) return await e.reply('此功能仅群聊可用');
        if (!e.isMaster) return await e.reply('权限不足，仅主人可操作');
        const groupId = e.group_id;
        const text = e.msg.replace(/#|群前缀/g, "").trim();
        const keyPath = `${groupId}.onlyReplyAt`;
        const value = text === '开启' ? 1 : 0;
        this.jsonReader.set(keyPath, value);
        await e.reply(`群前缀回复功能已${text}!`);
    }

    async setPrefix(e) {
        if (!e.isGroup) return await e.reply('此功能仅群聊可用');
        if (!e.isMaster) return await e.reply('权限不足，仅主人可操作');
        const name = e.msg.replace("#设置前缀", "").trim();
        if (!name) return await e.reply('群前缀不能为空！');
        const groupId = e.group_id;
        const keyPath = `${groupId}.botAlias`;
        this.jsonReader.set(keyPath, [name]);
        await e.reply(`群前缀已设置为【${name}】!`);
    }
}