import plugin from '../../../lib/plugins/plugin.js'
import yaml from 'yaml'
import { promises as fs } from 'fs'
import common from '../../../lib/common/common.js'
import path from 'path'

// 默认配置
const defaultConfig = {
  延迟发送: true,
  延迟时间: 5000,
  随机延迟: false,
  启用状态: true,
  日志保留: 30
}

export class broadcastNotice extends plugin {
  constructor() {
    super({
      name: '广播通知',
      dsc: '管理广播通知功能',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^广播帮助$',
          fnc: 'broadcastHelp'
        },
        {
          reg: '^(全部|白名单|黑名单)?广播$',
          fnc: 'broadcast'
        },
        {
          reg: '^广播(开启|关闭|状态|日志)$',
          fnc: 'broadcastCmd'
        },
        {
          reg: '^清理广播日志$',
          fnc: 'cleanupLogs'
        },
        {
          reg: '^延迟(开|关)$',
          fnc: 'setDelay'
        },
        {
          reg: '^延迟时间(\\d+)$',
          fnc: 'setDelayTime'
        },
        {
          reg: '^随机延迟(开|关)$',
          fnc: 'setRandomDelay'
        }
      ]
    })
    
    this.configPath = path.join(process.cwd(), 'plugins/baizi-plugin/config/广播.json')
    this.logDir = path.join(process.cwd(), 'plugins/baizi-plugin/logs/broadcast')
  }

  // 显示帮助
  async broadcastHelp(e) {
    const help = [
      '广播插件使用说明',
      '',
      '广播命令:',
      '广播 - 向所有群发送广播',
      '白名单广播 - 向白名单群组发送',
      '黑名单广播 - 向黑名单群组发送',
      '',
      '设置命令:',
      '广播开启 - 启用广播功能',
      '广播关闭 - 禁用广播功能',
      '延迟开 - 开启延迟发送',
      '延迟关 - 关闭延迟发送',
      '延迟时间5000 - 设置延迟时间(毫秒)',
      '随机延迟开 - 开启随机延迟',
      '随机延迟关 - 关闭随机延迟',
      '',
      '其他命令:',
      '广播状态 - 查看当前状态',
      '广播日志 - 查看广播记录',
      '清理广播日志 - 清理旧日志',
      '广播帮助 - 显示此帮助'
    ]
    
    await e.reply(help.join('\n'))
  }

  // 初始化配置
  async initConfig() {
    try {
      const configDir = path.dirname(this.configPath)
      await fs.mkdir(configDir, { recursive: true })
      
      try {
        await fs.access(this.configPath)
        const configData = await fs.readFile(this.configPath, 'utf-8')
        return JSON.parse(configData)
      } catch {
        await fs.writeFile(this.configPath, JSON.stringify(defaultConfig, null, 2))
        return { ...defaultConfig }
      }
    } catch (error) {
      console.error('[广播] 配置文件初始化失败:', error)
      return { ...defaultConfig }
    }
  }

  // 保存配置
  async saveConfig(config) {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2))
      return true
    } catch (error) {
      console.error('[广播] 保存配置失败:', error)
      return false
    }
  }

  // 通用命令处理
  async broadcastCmd(e) {
    const config = await this.initConfig()
    const cmd = e.msg.match(/^广播(开启|关闭|状态|日志)$/)[1]
    
    switch (cmd) {
      case '开启':
        config.启用状态 = true
        await this.saveConfig(config)
        await e.reply('广播功能已开启')
        break
      case '关闭':
        config.启用状态 = false
        await this.saveConfig(config)
        await e.reply('广播功能已关闭')
        break
      case '状态':
        await this.showStatus(e, config)
        break
      case '日志':
        await this.showLogs(e)
        break
    }
  }

  // 设置延迟
  async setDelay(e) {
    const config = await this.initConfig()
    const action = e.msg.match(/^延迟(开|关)$/)[1]
    
    if (action === '开') {
      config.延迟发送 = true
      await this.saveConfig(config)
      await e.reply('延迟发送已开启')
    } else {
      config.延迟发送 = false
      await this.saveConfig(config)
      await e.reply('延迟发送已关闭')
    }
  }

  // 设置延迟时间
  async setDelayTime(e) {
    const config = await this.initConfig()
    const time = parseInt(e.msg.match(/^延迟时间(\\d+)$/)[1])
    
    if (time >= 0) {
      config.延迟时间 = time
      await this.saveConfig(config)
      await e.reply(`延迟时间已设置为 ${time} 毫秒`)
    }
  }

  // 设置随机延迟
  async setRandomDelay(e) {
    const config = await this.initConfig()
    const action = e.msg.match(/^随机延迟(开|关)$/)[1]
    
    if (action === '开') {
      config.随机延迟 = true
      await this.saveConfig(config)
      await e.reply('随机延迟已开启')
    } else {
      config.随机延迟 = false
      await this.saveConfig(config)
      await e.reply('随机延迟已关闭')
    }
  }

  // 显示状态
  async showStatus(e, config) {
    const status = [
      '广播功能状态',
      `启用状态: ${config.启用状态 ? '已启用' : '已禁用'}`,
      `延迟发送: ${config.延迟发送 ? '已开启' : '已关闭'}`,
      `延迟时间: ${config.延迟时间} 毫秒`,
      `随机延迟: ${config.随机延迟 ? '已开启' : '已关闭'}`
    ]
    
    await e.reply(status.join('\n'))
  }

  // 显示日志
  async showLogs(e) {
    try {
      await fs.access(this.logDir)
      const files = await fs.readdir(this.logDir)
      const logFiles = files.filter(f => f.endsWith('.json')).sort().reverse()
      
      if (logFiles.length === 0) {
        await e.reply('暂无广播记录')
        return
      }
      
      let allLogs = []
      for (let i = 0; i < Math.min(3, logFiles.length); i++) {
        const filePath = path.join(this.logDir, logFiles[i])
        const content = await fs.readFile(filePath, 'utf-8')
        const logs = JSON.parse(content)
        allLogs = allLogs.concat(logs)
      }
      
      allLogs.sort((a, b) => new Date(b.time) - new Date(a.time))
      const recentLogs = allLogs.slice(0, 5)
      
      if (recentLogs.length === 0) {
        await e.reply('暂无广播记录')
        return
      }
      
      const logInfo = ['最近广播记录:']
      recentLogs.forEach((log, index) => {
        const time = log.time ? new Date(log.time).toLocaleString() : '未知时间'
        logInfo.push(`${index + 1}. ${time} (${log.type || '未知'})`)
        logInfo.push(`   结果: ${log.success || 0}成功/${log.fail || 0}失败`)
      })
      
      await e.reply(logInfo.join('\n'))
      
    } catch (error) {
      await e.reply('暂无广播记录')
    }
  }

  // 清理日志
  async cleanupLogs(e) {
    try {
      const config = await this.initConfig()
      await fs.access(this.logDir)
      const files = await fs.readdir(this.logDir)
      const logFiles = files.filter(f => f.endsWith('.json'))
      
      if (logFiles.length === 0) {
        await e.reply('没有可清理的日志')
        return
      }
      
      const retentionDays = config.日志保留 || 30
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
      
      let deletedCount = 0
      for (const file of logFiles) {
        const match = file.match(/^(\d{4})-(\d{2})-(\d{2})\.json$/)
        if (match) {
          const fileDate = new Date(`${match[1]}-${match[2]}-${match[3]}`)
          if (fileDate < cutoffDate) {
            const filePath = path.join(this.logDir, file)
            await fs.unlink(filePath)
            deletedCount++
          }
        }
      }
      
      await e.reply(`已清理 ${deletedCount} 个旧日志文件`)
      
    } catch (error) {
      await e.reply('清理日志失败')
    }
  }

  // 主广播功能
  async broadcast(e) {
    if (!e.isMaster) return true
    
    const config = await this.initConfig()
    if (!config.启用状态) {
      await e.reply('广播功能已关闭，请使用"广播开启"启用')
      return true
    }
    
    const match = e.msg.match(/^(全部|白名单|黑名单)?广播$/)
    if (!match) return true
    
    const type = match[1] || '全部'
    await e.reply(`请发送要广播的内容（${type}）`)
    
    this.broadcastType = type
    this.setContext('get_broadcast_content')
  }

  async get_broadcast_content(e) {
    this.finish('get_broadcast_content')
    
    if (e.msg === '取消') {
      await e.reply('广播已取消')
      return true
    }
    
    const config = await this.initConfig()
    const message = e.raw_message || e.message
    
    if (!message || message.trim().length === 0) {
      await e.reply('广播内容不能为空')
      this.setContext('get_broadcast_content')
      return true
    }
    
    const type = this.broadcastType
    let groups = []
    let description = ''
    
    try {
      switch (type) {
        case '全部':
          groups = Array.from(Bot[e.self_id]?.gl?.values() || []).map(g => g.group_id)
          description = '所有群'
          break
        case '白名单':
          const other1 = await fs.readFile('./config/config/other.yaml', 'utf-8')
          const data1 = yaml.parse(other1)
          groups = data1.whiteGroup || []
          description = '白名单群组'
          break
        case '黑名单':
          const other2 = await fs.readFile('./config/config/other.yaml', 'utf-8')
          const data2 = yaml.parse(other2)
          groups = data2.blackGroup || []
          description = '黑名单群组'
          break
      }
    } catch (error) {
      console.error('[广播] 读取群列表失败:', error)
      await e.reply('读取群列表失败，请检查配置文件')
      return true
    }
    
    if (groups.length === 0) {
      await e.reply(`${description}为空，无法广播`)
      return true
    }
    
    const preview = [
      `广播预览（${description}）：`,
      `${message}`,
      `群组数量：${groups.length}`,
      `延迟发送：${config.延迟发送 ? '开启' : '关闭'}`,
      `随机延迟：${config.随机延迟 ? '开启' : '关闭'}`,
      '',
      `是否开始广播？`,
      `回复"是"开始，回复"否"取消`
    ]
    
    await e.reply(preview.join('\n'))
    this.broadcastData = {
      groups,
      message,
      description,
      config,
      userId: e.user_id,
      selfId: e.self_id
    }
    this.setContext('confirm_broadcast')
  }

  async confirm_broadcast(e) {
    this.finish('confirm_broadcast')
    
    if (e.msg !== '是') {
      await e.reply('广播已取消')
      return true
    }
    
    const { groups, message, description, config, selfId } = this.broadcastData
    
    await e.reply(`开始广播，共 ${groups.length} 个${description}`)
    
    let successCount = 0
    let failCount = 0
    const failDetails = []
    
    for (let i = 0; i < groups.length; i++) {
      const groupId = groups[i]
      
      try {
        if (config.延迟发送 && i > 0) {
          let delay = config.延迟时间
          if (config.随机延迟) {
            delay = Math.floor(Math.random() * 2000) + 4000
          }
          await common.sleep(delay)
        }
        
        await Bot[selfId].pickGroup(groupId).sendMsg(message)
        successCount++
        
        if ((i + 1) % 10 === 0 || i === groups.length - 1) {
          await e.reply(`进度: ${i + 1}/${groups.length} (成功:${successCount} 失败:${failCount})`)
        }
        
      } catch (error) {
        failCount++
        failDetails.push(`群 ${groupId}: ${error.message || '发送失败'}`)
      }
    }
    
    const successRate = ((successCount / groups.length) * 100).toFixed(2)
    const report = [
      '广播完成',
      `总群数: ${groups.length}`,
      `成功: ${successCount}`,
      `失败: ${failCount}`,
      `成功率: ${successRate}%`
    ]
    
    if (failCount > 0) {
      report.push('失败详情:')
      failDetails.slice(0, 5).forEach((detail, index) => {
        report.push(`${index + 1}. ${detail}`)
      })
    }
    
    await e.reply(report.join('\n'))
    
    // 保存日志
    await this.saveLog({
      time: new Date().toISOString(),
      type: description,
      total: groups.length,
      success: successCount,
      fail: failCount,
      success_rate: successRate,
      message: message.slice(0, 50) + (message.length > 50 ? '...' : '')
    })
  }

  // 保存日志
  async saveLog(logData) {
    try {
      await fs.mkdir(this.logDir, { recursive: true })
      
      const today = new Date().toISOString().split('T')[0]
      const logFile = path.join(this.logDir, `${today}.json`)
      let logs = []
      
      try {
        const data = await fs.readFile(logFile, 'utf-8')
        logs = JSON.parse(data)
      } catch (error) {
        // 文件不存在，创建新文件
      }
      
      logs.unshift(logData)
      if (logs.length > 50) {
        logs = logs.slice(0, 50)
      }
      
      await fs.writeFile(logFile, JSON.stringify(logs, null, 2))
    } catch (error) {
      console.error('[广播] 保存日志失败:', error)
    }
  }
}