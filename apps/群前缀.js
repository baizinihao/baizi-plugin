import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import lodash from 'lodash';

class JsonReader {
    constructor(filePath) {
        this.filePath = filePath;
        this.config = this.loadConfig();
    }
    loadConfig() {
        if (fs.existsSync(this.filePath)) {
            try {
                const file = fs.readFileSync(this.filePath, 'utf8');
                return JSON.parse(file) || {};
            } catch (e) {
                return {};
            }
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
            priority: 0,
            rule: [
                { reg: '^#群前缀(开启|关闭)$', fnc: 'openPrefix' },
                { reg: '^#设置前缀\\s+(.+)$', fnc: 'setPrefix' },
                { reg: '^.*$', fnc: 'checkPrefix', before: true }
            ]
        });
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        this.configDir = path.join(__dirname, 'config');
        this.jsonFile = path.join(this.configDir, '群前缀.json');
        if (!fs.existsSync(this.configDir)) fs.mkdirSync(this.configDir, { recursive: true });
        this.jsonReader = new JsonReader(this.jsonFile);
    }

    async checkPrefix(e) {
        if (!e.isGroup) return true;
        const groupId = String(e.group_id);
        const open = this.jsonReader.get(`${groupId}.onlyReplyAt`);
        if (open !== 1) return true;
        const msg = e.msg.trim();
        if (e.isAt || msg.startsWith('#')) return true;
        const alias = this.jsonReader.get(`${groupId}.botAlias`) || [];
        for (const pre of alias) {
            if (msg.startsWith(pre)) return true;
        }
        return false;
    }

    async openPrefix(e) {
        if (!e.isMaster) return await e.reply('权限不足，仅主人可操作');
        const groupId = String(e.group_id);
        const type = e.msg.includes('开启') ? 1 : 0;
        const text = type === 1 ? '开启' : '关闭';
        this.jsonReader.set(`${groupId}.onlyReplyAt`, type);
        await e.reply(`群前缀回复功能已${text}!`);
    }

    async setPrefix(e) {
        if (!e.isMaster) return await e.reply('权限不足，仅主人可操作');
        const groupId = String(e.group_id);
        const name = e.msg.replace('#设置前缀', '').trim();
        if (!name) return await e.reply('群前缀不能为空！');
        this.jsonReader.set(`${groupId}.botAlias`, [name]);
        await e.reply(`群前缀已设置为【${name}】!`);
    }
}