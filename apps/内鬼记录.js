import plugin from '../../lib/plugins/plugin.js';
import fs from 'fs';
import YAML from 'yaml';
import path from 'path';
import { fileURLToPath } from 'url';

export class GroupMemberManager extends plugin {
  constructor() {
    super({
      name: '内鬼管理',
      dsc: '管理内鬼列表和信任列表',
      event: 'message',
      priority: 1,
      rule: [
        { reg: '^#?内鬼列表$', fnc: 'getSuspectList' },
        { reg: '^#?信任列表$', fnc: 'getTrustedList' },
        { reg: '^#?重置列表$', fnc: 'resetList' },
        { reg: '^#?他不是内鬼$', fnc: 'markAsNotSuspect' },
        { reg: '^#?跑路列表$', fnc: 'getEscapedList' },
        { reg: '^#?内鬼帮助$', fnc: 'showHelp' }
      ]
    });
    
    // 配置文件路径：插件目录/config/uid.yaml（使用已存在的config目录）
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.uidFile = path.join(__dirname, 'config', 'uid.yaml'); // 直接指向已有的config目录
    this.initializeUidFile();
  }

  normalizeIdArray(arr) {
    const out = [];
    const seen = new Set();
    for (const v of (arr || [])) {
      const n = typeof v === 'number' ? v : parseInt(v, 10);
      if (Number.isFinite(n) && !seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    }
    return out;
  }

  // 仅创建配置文件（不创建config目录，默认目录已存在）
  initializeUidFile() {
    if (!fs.existsSync(this.uidFile)) {
      fs.writeFileSync(this.uidFile, '{}', 'utf8');
    }
  }

  readUidData() {
    try {
      const fileContents = fs.readFileSync(this.uidFile, 'utf8');
      return YAML.parse(fileContents) || {};
    } catch (error) {
      console.error('读取UID文件失败:', error);
      return {};
    }
  }

  saveUidData(data) {
    try {
      const yamlStr = YAML.stringify(data);
      fs.writeFileSync(this.uidFile, yamlStr, 'utf8');
      return true;
    } catch (error) {
      console.error('保存UID文件失败:', error);
      return false;
    }
  }

  getGroupUidData(e) {
    const uidData = this.readUidData();
    const groupId = e.group_id.toString();
    
    if (!uidData[groupId]) {
      uidData[groupId] = { allMembers: [], excluded: [], escaped: [] };
      this.saveUidData(uidData);
    } else {
      uidData[groupId].allMembers = uidData[groupId].allMembers || [];
      uidData[groupId].excluded = uidData[groupId].excluded || [];
      uidData[groupId].escaped = uidData[groupId].escaped || [];
    }

    uidData[groupId].allMembers = this.normalizeIdArray(uidData[groupId].allMembers);
    uidData[groupId].excluded = this.normalizeIdArray(uidData[groupId].excluded);
    uidData[groupId].escaped = this.normalizeIdArray(uidData[groupId].escaped);
    this.saveUidData(uidData);
    
    return uidData[groupId];
  }

  async getSuspectList(e) {
    if (!e.isGroup) { await e.reply('此功能只能在群聊中使用'); return true; }
    try {
      const BotInstance = e.bot ?? Bot;
      const memberMap = await BotInstance.pickGroup(e.group_id).getMemberMap(true);
      if (!memberMap || memberMap.size === 0) { await e.reply('获取群成员列表失败，请稍后再试'); return true; }

      const memberIds = Array.from(memberMap.keys()).map(v => typeof v === 'number' ? v : parseInt(v, 10)).filter(n => Number.isFinite(n)).sort((a, b) => a - b);
      const totalCount = memberIds.length;
      const groupUidData = this.getGroupUidData(e);
      const previousMembers = Array.from(groupUidData.allMembers || []);
      const excludedSet = new Set(groupUidData.excluded || []);
      const escapedSet = new Set(groupUidData.escaped || []);

      const prevSet = new Set(previousMembers);
      const currSet = new Set(memberIds);
      const newMembers = memberIds.filter(id => !prevSet.has(id));
      if (newMembers.length > 0) console.log(`[内鬼管理] 群${e.group_id} 检测到新成员: ${newMembers.join(', ')}`);

      const removedMembers = previousMembers.filter(id => !currSet.has(id));
      if (removedMembers.length > 0) {
        console.log(`[内鬼管理] 群${e.group_id} 检测到已跑路: ${removedMembers.join(', ')}`);
        removedMembers.forEach(id => escapedSet.add(id));
      }

      const rejoined = Array.from(escapedSet).filter(id => currSet.has(id));
      if (rejoined.length > 0) {
        console.log(`[内鬼管理] 群${e.group_id} 检测到回归成员: ${rejoined.join(', ')}`);
        rejoined.forEach(id => escapedSet.delete(id));
      }

      const allData = this.readUidData();
      const groupId = e.group_id.toString();
      allData[groupId] = { allMembers: memberIds, excluded: Array.from(excludedSet), escaped: Array.from(escapedSet) };
      this.saveUidData(allData);

      const suspectMembers = memberIds.filter(id => !excludedSet.has(id));
      const suspectCount = suspectMembers.length;
      const currentTrustedCount = memberIds.reduce((acc, id) => acc + (excludedSet.has(id) ? 1 : 0), 0);

      const msgList = [];
      msgList.push({ message: [
        `群号: ${e.group_id}\n`,
        `总成员数: ${totalCount}人\n`,
        `已信任成员: ${currentTrustedCount}人\n`,
        `可疑成员: ${suspectCount}人\n`,
        `已跑路成员: ${escapedSet.size}人\n`,
        newMembers.length ? `新加入成员: ${newMembers.length}人\n` : '',
        removedMembers.length ? `新检测到跑路: ${removedMembers.length}人\n` : '',
        `\n以下是可疑成员列表：`
      ].join(''), nickname: '内鬼管理系统', user_id: e.bot.uin });

      const pageSize = 100;
      const pages = Math.ceil((suspectMembers.length || 0) / pageSize) || 1;
      for (let i = 0; i < pages; i++) {
        const startIdx = i * pageSize;
        const endIdx = Math.min(startIdx + pageSize, suspectMembers.length);
        const pageMembers = suspectMembers.slice(startIdx, endIdx);
        msgList.push({
          message: pageMembers.length ? `【可疑成员列表 ${i + 1}/${pages}】\n${pageMembers.join('\n')}` : `【可疑成员列表 1/1】\n暂无`,
          nickname: '内鬼管理系统', user_id: e.bot.uin
        });
      }

      const escapedList = Array.from(escapedSet);
      if (escapedList.length > 0) {
        const pagesEscaped = Math.ceil(escapedList.length / pageSize);
        for (let i = 0; i < pagesEscaped; i++) {
          const startIdx = i * pageSize;
          const endIdx = Math.min(startIdx + pageSize, escapedList.length);
          const pageMembers = escapedList.slice(startIdx, endIdx);
          msgList.push({ message: `【已跑路成员 ${i + 1}/${pagesEscaped}】\n${pageMembers.join('\n')}`, nickname: '内鬼管理系统', user_id: e.bot.uin });
        }
      } else msgList.push({ message: '【已跑路成员】\n暂无', nickname: '内鬼管理系统', user_id: e.bot.uin });

      msgList.push({ message: '可用指令：#他不是内鬼 @用户、#信任列表、#重置列表、#跑路列表、#内鬼帮助', nickname: '内鬼管理系统', user_id: e.bot.uin });
      const forwardMsg = await e.group.makeForwardMsg(msgList);
      await e.reply(forwardMsg);
      return true;
    } catch (error) {
      console.error('获取内鬼列表失败:', error);
      await e.reply(`获取内鬼列表失败: ${error.message}`);
      return true;
    }
  }

  async getTrustedList(e) {
    if (!e.isGroup) { await e.reply('此功能只能在群聊中使用'); return true; }
    try {
      const groupUidData = this.getGroupUidData(e);
      const trustedMembers = groupUidData.excluded || [];
      const trustedCount = trustedMembers.length;

      if (trustedCount === 0) { await e.reply('⚠️ 本群还没有任何信任成员'); return true; }
      const msgList = [];
      msgList.push({ message: [`群号: ${e.group_id}\n`, `信任成员总数: ${trustedCount}人\n`, `\n以下是信任成员列表：`].join(''), nickname: '内鬼管理系统', user_id: e.bot.uin });

      const pageSize = 100;
      const pages = Math.ceil(trustedCount / pageSize);
      for (let i = 0; i < pages; i++) {
        const startIdx = i * pageSize;
        const endIdx = Math.min(startIdx + pageSize, trustedCount);
        const pageMembers = trustedMembers.slice(startIdx, endIdx);
        msgList.push({ message: `【信任成员列表 ${i + 1}/${pages}】\n${pageMembers.join('\n')}`, nickname: '内鬼管理系统', user_id: e.bot.uin });
      }

      msgList.push({ message: '可用指令：#他不是内鬼 @用户、#信任列表、#重置列表、#跑路列表、#内鬼帮助', nickname: '内鬼管理系统', user_id: e.bot.uin });
      const forwardMsg = await e.group.makeForwardMsg(msgList);
      await e.reply(forwardMsg);
      return true;
    } catch (error) {
      console.error('获取信任列表失败:', error);
      await e.reply(`获取信任列表失败: ${error.message}`);
      return true;
    }
  }

  async getEscapedList(e) {
    if (!e.isGroup) { await e.reply('此功能只能在群聊中使用'); return true; }
    try {
      const groupUidData = this.getGroupUidData(e);
      const escapedMembers = groupUidData.escaped || [];
      const escapedCount = escapedMembers.length;

      const msgList = [];
      msgList.push({ message: [`群号: ${e.group_id}\n`, `已跑路成员总数: ${escapedCount}人\n`, `\n以下是已跑路成员列表：`].join(''), nickname: '内鬼管理系统', user_id: e.bot.uin });

      const pageSize = 100;
      const pages = Math.ceil((escapedCount || 0) / pageSize) || 1;
      for (let i = 0; i < pages; i++) {
        const startIdx = i * pageSize;
        const endIdx = Math.min(startIdx + pageSize, escapedCount);
        const pageMembers = escapedMembers.slice(startIdx, endIdx);
        msgList.push({ message: pageMembers.length ? `【已跑路成员 ${i + 1}/${pages}】\n${pageMembers.join('\n')}` : `【已跑路成员 1/1】\n暂无`, nickname: '内鬼管理系统', user_id: e.bot.uin });
      }

      msgList.push({ message: '可用指令：#他不是内鬼 @用户、#信任列表、#重置列表、#跑路列表、#内鬼帮助', nickname: '内鬼管理系统', user_id: e.bot.uin });
      const forwardMsg = await e.group.makeForwardMsg(msgList);
      await e.reply(forwardMsg);
      return true;
    } catch (error) {
      console.error('获取已跑路列表失败:', error);
      await e.reply(`获取已跑路列表失败: ${error.message}`);
      return true;
    }
  }

  async resetList(e) {
    if (!e.isGroup) { await e.reply('此功能只能在群聊中使用'); return true; }
    const isAdmin = e.member.is_admin;
    const isOwner = e.member.is_owner;
    if (!isAdmin && !isOwner) return true;

    try {
      const uidData = this.readUidData();
      const groupId = e.group_id.toString();
      if (uidData[groupId]) {
        uidData[groupId].excluded = this.normalizeIdArray(uidData[groupId].excluded);
        const previousCount = (uidData[groupId].excluded || []).length;
        uidData[groupId].excluded = [];
        if (this.saveUidData(uidData)) await e.reply(`✅ 已重置信任列表，移除了 ${previousCount} 个信任成员\n可用指令：#他不是内鬼 @用户、#信任列表、#重置列表、#跑路列表、#内鬼帮助`);
        else await e.reply('❌ 重置失败，请重试');
      } else await e.reply('⚠️ 本群还没有任何信任记录');
      return true;
    } catch (error) {
      console.error('重置列表失败:', error);
      await e.reply(`重置列表失败: ${error.message}`);
      return true;
    }
  }

  async markAsNotSuspect(e) {
    if (!e.isGroup) { await e.reply('此功能只能在群聊中使用'); return true; }
    const isAdmin = e.member.is_admin;
    const isOwner = e.member.is_owner;
    if (!isAdmin && !isOwner) return true;

    try {
      let targetUserId = e.at;
      if (Array.isArray(targetUserId)) targetUserId = targetUserId[0];
      const targetNum = typeof targetUserId === 'number' ? targetUserId : parseInt(targetUserId, 10);
      if (!Number.isFinite(targetNum)) { await e.reply('请@一个有效的群成员后再使用此命令'); return true; }

      const uidData = this.readUidData();
      const groupId = e.group_id.toString();
      if (!uidData[groupId]) uidData[groupId] = { allMembers: [], excluded: [], escaped: [] };
      uidData[groupId].excluded = this.normalizeIdArray(uidData[groupId].excluded);
      uidData[groupId].escaped = this.normalizeIdArray(uidData[groupId].escaped);
      uidData[groupId].allMembers = this.normalizeIdArray(uidData[groupId].allMembers);
      uidData[groupId].escaped = uidData[groupId].escaped.filter(id => id !== targetNum);

      if (!uidData[groupId].excluded.includes(targetNum)) {
        uidData[groupId].excluded.push(targetNum);
        uidData[groupId].excluded = this.normalizeIdArray(uidData[groupId].excluded);
        if (this.saveUidData(uidData)) await e.reply(`✅ 已标记用户 ${targetNum} 为可信任成员\n可用指令：#他不是内鬼 @用户、#信任列表、#重置列表、#跑路列表、#内鬼帮助`);
        else await e.reply('❌ 保存数据失败，请重试');
      } else await e.reply(`⚠️ 用户 ${targetNum} 已在信任列表中`);
      return true;
    } catch (error) {
      console.error('标记用户失败:', error);
      await e.reply(`标记用户失败: ${error.message}`);
      return true;
    }
  }

  async showHelp(e) {
    const helpMsg = `内鬼管理插件可用指令：
1. #他不是内鬼 @用户
2. #信任列表
3. #重置列表
4. #跑路列表
（指令支持带#或不带#）`;
    await e.reply(helpMsg, true);
    return true;
  }
}