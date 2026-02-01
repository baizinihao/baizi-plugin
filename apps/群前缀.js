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
            dsc: '群专属前缀配置，带触发校验',
            event: 'message',
            priority: 1,
            rule: [
                { reg: '^#群前缀(开启|关闭)$', fnc: 'openPrefix' },
                { reg: '^#设置前缀.*$', fnc: 'setPrefix' },
                { reg: '^.*$', fnc: 'beforeDeal', before: true }
            ]
        });
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        this.configDir = path.join(__dirname, 'config');
        this.jsonFile = path.join(this.configDir, '群前缀.json');
        if (!fs.existsSync(this.configDir)) fs.mkdirSync(this.configDir, { recursive: true });
        this.jsonReader = new JsonReader(this.jsonFile);
    }

    async beforeDeal(e) {
        if (!e.isGroup) return true;
        const groupId = e.group_id.toString();
        const onlyReplyAt = this.jsonReader.get(`${groupId}.onlyReplyAt`) || 0;
        const botAlias = this.jsonReader.get(`${groupId}.botAlias`) || [];
        if (onlyReplyAt !== 1) return true;
        if (e.isAt || e.msg.startsWith('#')) return true;
        for (const alias of botAlias) {
            if (e.msg.startsWith(alias)) return true;
        }
        return false;
    }

    async openPrefix(e) {
        if (!e.isGroup) return await e.reply('此功能仅群聊可用');
        if (!e.isMaster) return await e.reply('权限不足，仅主人可操作');
        const groupId = e.group_id.toString();
        const text = e.msg.replace(/#|群前缀/g, "").trim();
        const value = text === '开启' ? 1 : 0;
        this.jsonReader.set(`${groupId}.onlyReplyAt`, value);
        await e.reply(`群前缀回复功能已${text}!`);
    }

    async setPrefix(e) {
        if (!e.isGroup) return await e.reply('此功能仅群聊可用');
        if (!e.isMaster) return await e.reply('权限不足，仅主人可操作');
        const name = e.msg.replace("#设置前缀", "").trim();
        if (!name) return await e.reply('群前缀不能为空！');
        const groupId = e.group_id.toString();
        this.jsonReader.set(`${groupId}.botAlias`, [name]);
        await e.reply(`群前缀已设置为【${name}】!`);
    }
}