import plugin from '../../../lib/plugins/plugin.js'
import yaml from 'yaml'
import { promises as fs } from 'fs'
import common from '../../../lib/common/common.js'
import path from 'path'

// 默认配置
const defaultConfig = {
  delays: true,          // 是否开启延迟
  Nnumber: 5000,         // 发送消息延迟（毫秒）
  random_delays: false,  // 是否开启随机延迟
  enable: true,          // 插件是否启用
  log_retention_days: 30 // 日志保留天数
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
          reg: '^#广播帮助$',
          fnc: 'broadcastHelp',
          permission: 'master'
        },
        {
          reg: '^#(白名单|黑名单)?广播通知$',
          fnc: 'broadcast',
          permission: 'master'
        },
        {
          reg: '^#广播(开启|关闭|设置|状态|日志)$',
          fnc: 'configBroadcast',
          permission: 'master'
        },
        {
          reg: '^#清理广播日志$',
          fnc: 'cleanupLogs',
          permission: 'master'
        }
      ]
    })
    
    // 插件配置文件路径
    this.configPath = path.join(process.cwd(), 'plugins/baizi-plugin/config/广播.json')
    // 广播日志目录
    this.logDir = path.join(process.cwd(), 'plugins/baizi-plugin/logs/broadcast')
  }

  // 显示广播帮助
  async broadcastHelp(e) {
    const helpText = [
      '📚 广播通知插件帮助 📚',
      '',
      '👑 主指令:',
      '  #广播通知 - 向所有群发送广播',
      '  #白名单广播通知 - 向白名单群组发送广播',
      '  #黑名单广播通知 - 向黑名单群组发送广播',
      '',
      '⚙️ 配置指令:',
      '  #广播开启 - 启用广播功能',
      '  #广播关闭 - 禁用广播功能',
      '  #广播设置 - 设置广播参数',
      '  #广播状态 - 查看广播状态',
      '  #广播日志 - 查看最近广播记录',
      '  #清理广播日志 - 清理过期日志',
      '  #广播帮助 - 显示此帮助信息',
      '',
      '🔧 参数设置格式:',
      '  延迟 开/关 - 开启/关闭发送延迟',
      '  延迟时间 毫秒数 - 设置延迟时间 (如: 延迟时间 5000)',
      '  随机延迟 开/关 - 开启/关闭随机延迟 (4-6秒随机)',
      '  日志保留 天数 - 设置日志保留天数 (如: 日志保留 30)',
      '',
      '📝 使用流程:',
      '  1. 使用 #广播设置 配置参数',
      '  2. 使用 #广播状态 确认配置',
      '  3. 使用 #广播通知 或 #白名单广播通知 或 #黑名单广播通知 开始广播',
      '  4. 按照提示发送广播内容',
      '  5. 输入 "确认" 开始发送',
      '',
      '⚠️ 注意事项:',
      '  - 广播内容不能为空',
      '  - 操作需要机器人管理员权限',
      '  - 建议在低峰时段进行广播',
      '  - 广播过程中请勿中断机器人运行'
    ]
    
    await e.reply(helpText.join('\n'))
  }

  // 初始化配置文件
  async initConfig() {
    try {
      // 确保目录存在
      const configDir = path.dirname(this.configPath)
      await fs.mkdir(configDir, { recursive: true })
      
      // 检查配置文件是否存在
      try {
        await fs.access(this.configPath)
        const configData = await fs.readFile(this.configPath, 'utf-8')
        const config = JSON.parse(configData)
        
        // 确保新配置项存在
        Object.keys(defaultConfig).forEach(key => {
          if (config[key] === undefined) {
            config[key] = defaultConfig[key]
          }
        })
        
        return config
      } catch (error) {
        // 配置文件不存在，创建默认配置
        console.log('[广播通知] 配置文件不存在，创建默认配置...')
        await fs.writeFile(this.configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8')
        return { ...defaultConfig }
      }
    } catch (error) {
      console.error('[广播通知] 配置文件初始化失败:', error)
      return { ...defaultConfig }
    }
  }

  // 保存配置
  async saveConfig(config) {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8')
      return true
    } catch (error) {
      console.error('[广播通知] 保存配置失败:', error)
      return false
    }
  }

  // 广播配置管理
  async configBroadcast(e) {
    const config = await this.initConfig()
    const action = e.msg.match(/^#广播(开启|关闭|设置|状态|日志)$/)[1]
    
    switch (action) {
      case '开启':
        config.enable = true
        await this.saveConfig(config)
        await e.reply('✅ 广播通知功能已开启')
        break
        
      case '关闭':
        config.enable = false
        await this.saveConfig(config)
        await e.reply('❌ 广播通知功能已关闭')
        break
        
      case '设置':
        await this.setBroadcastConfig(e, config)
        break
        
      case '状态':
        await this.showBroadcastStatus(e, config)
        break
        
      case '日志':
        await this.showBroadcastLogs(e, config)
        break
    }
  }

  // 显示广播状态
  async showBroadcastStatus(e, config) {
    const status = [
      '📊 广播通知状态',
      `⚙️ 启用状态：${config.enable ? '✅ 已启用' : '❌ 已禁用'}`,
      `⏱️ 延迟发送：${config.delays ? '✅ 已开启' : '❌ 已关闭'}`,
      `⌛ 延迟时间：${config.Nnumber} 毫秒`,
      `🎲 随机延迟：${config.random_delays ? '✅ 已开启' : '❌ 已关闭'}`,
      `📅 日志保留：${config.log_retention_days} 天`
    ]
    
    // 获取日志目录信息
    try {
      await fs.access(this.logDir)
      const files = await fs.readdir(this.logDir)
      const logFiles = files.filter(f => f.endsWith('.json'))
      status.push(`📁 日志文件：${logFiles.length} 个`)
      
      if (logFiles.length > 0) {
        // 获取最新的日志文件
        const latestLog = await this.getLatestLog()
        if (latestLog) {
          status.push(`📝 最近广播：${latestLog.time ? new Date(latestLog.time).toLocaleString() : '无记录'}`)
          status.push(`👤 操作者：${latestLog.master || '未知'}`)
        }
      }
    } catch (error) {
      status.push('📁 日志目录：尚未创建')
    }
    
    await e.reply(status.join('\n'))
  }

  // 显示广播日志
  async showBroadcastLogs(e, config) {
    try {
      await fs.access(this.logDir)
      const files = await fs.readdir(this.logDir)
      const logFiles = files.filter(f => f.endsWith('.json')).sort().reverse()
      
      if (logFiles.length === 0) {
        await e.reply('📭 暂无广播日志记录')
        return
      }
      
      const logs = []
      for (let i = 0; i < Math.min(5, logFiles.length); i++) {
        const filePath = path.join(this.logDir, logFiles[i])
        const content = await fs.readFile(filePath, 'utf-8')
        const fileLogs = JSON.parse(content)
        
        if (Array.isArray(fileLogs)) {
          fileLogs.forEach(log => {
            logs.push({
              file: logFiles[i],
              ...log
            })
          })
        }
      }
      
      // 按时间排序，取最近的5条
      logs.sort((a, b) => new Date(b.time) - new Date(a.time))
      const recentLogs = logs.slice(0, 5)
      
      const logInfo = [
        `📋 最近5次广播记录（共${logs.length}条记录）:`
      ]
      
      recentLogs.forEach((log, index) => {
        logInfo.push(`\n${index + 1}. ${log.time ? new Date(log.time).toLocaleString() : '未知时间'}`)
        logInfo.push(`   类型：${log.type || '未知'}`)
        logInfo.push(`   操作者：${log.master || '未知'}`)
        logInfo.push(`   结果：${log.success || 0}成功/${log.fail || 0}失败`)
        logInfo.push(`   总群数：${log.total || 0}`)
      })
      
      await e.reply(logInfo.join('\n'))
      
    } catch (error) {
      console.error('[广播通知] 读取日志失败:', error)
      await e.reply('❌ 读取广播日志失败，日志目录可能不存在')
    }
  }

  // 设置广播参数
  async setBroadcastConfig(e, config) {
    const currentSettings = [
      '📝 当前设置:',
      `延迟发送：${config.delays ? '开启' : '关闭'}`,
      `延迟时间：${config.Nnumber} 毫秒`,
      `随机延迟：${config.random_delays ? '开启' : '关闭'}`,
      `日志保留：${config.log_retention_days} 天`,
      '',
      '请发送设置参数，格式：',
      '延迟 开/关',
      '延迟时间 毫秒数',
      '随机延迟 开/关',
      '日志保留 天数',
      '',
      '示例：延迟 开'
    ]
    
    await e.reply(currentSettings.join('\n'))
    this.setContext('set_config_')
  }

  async set_config_(e) {
    this.finish('set_config_')
    const config = await this.initConfig()
    const input = e.msg.trim()
    
    if (input === '取消' || input === 'exit') {
      await e.reply('❌ 设置已取消')
      return
    }
    
    if (input.includes('延迟 开')) {
      config.delays = true
      await this.saveConfig(config)
      await e.reply('✅ 已开启延迟发送')
    } else if (input.includes('延迟 关')) {
      config.delays = false
      await this.saveConfig(config)
      await e.reply('✅ 已关闭延迟发送')
    } else if (input.startsWith('延迟时间 ')) {
      const time = parseInt(input.replace('延迟时间 ', ''))
      if (!isNaN(time) && time >= 0) {
        config.Nnumber = time
        await this.saveConfig(config)
        await e.reply(`✅ 延迟时间已设置为 ${time} 毫秒`)
      } else {
        await e.reply('❌ 请输入有效的毫秒数')
      }
    } else if (input.includes('随机延迟 开')) {
      config.random_delays = true
      await this.saveConfig(config)
      await e.reply('✅ 已开启随机延迟')
    } else if (input.includes('随机延迟 关')) {
      config.random_delays = false
      await this.saveConfig(config)
      await e.reply('✅ 已关闭随机延迟')
    } else if (input.startsWith('日志保留 ')) {
      const days = parseInt(input.replace('日志保留 ', ''))
      if (!isNaN(days) && days > 0) {
        config.log_retention_days = days
        await this.saveConfig(config)
        await e.reply(`✅ 日志保留时间已设置为 ${days} 天`)
      } else {
        await e.reply('❌ 请输入有效的天数（大于0）')
      }
    } else {
      await e.reply('❌ 设置格式错误，请重试\n输入"取消"退出设置')
    }
  }

  // 清理过期日志
  async cleanupLogs(e) {
    try {
      const config = await this.initConfig()
      await fs.access(this.logDir)
      const files = await fs.readdir(this.logDir)
      const logFiles = files.filter(f => f.endsWith('.json'))
      
      if (logFiles.length === 0) {
        await e.reply('📭 暂无广播日志可清理')
        return
      }
      
      let deletedCount = 0
      const retentionDays = config.log_retention_days || 30
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
      
      for (const file of logFiles) {
        // 从文件名提取日期（假设格式为 YYYY-MM-DD.json）
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
      
      await e.reply(`🧹 已清理 ${deletedCount} 个过期日志文件（保留 ${retentionDays} 天内）`)
      
    } catch (error) {
      console.error('[广播通知] 清理日志失败:', error)
      await e.reply('❌ 清理广播日志失败')
    }
  }

  // 主广播功能
  async broadcast(e) {
    if (!e.isMaster) return true
    
    const config = await this.initConfig()
    if (!config.enable) {
      await e.reply('❌ 广播通知功能已关闭，请使用 #广播开启 来启用')
      return true
    }
    
    const match = e.msg.match(/^#(白名单|黑名单)?广播通知$/)
    if (!match) return true
    
    const broadcastType = match[1] || '全部'
    await e.reply(`请发送你要广播的内容（${broadcastType}）\n\n⚠️ 广播内容不能为空，输入"取消"可以退出广播模式`)
    
    // 保存广播类型到上下文
    this.broadcastType = broadcastType
    this.setContext('broadcast_content_')
  }

  async broadcast_content_(e) {
    this.finish('broadcast_content_')
    
    // 检查用户是否要取消
    if (e.msg === '取消' || e.msg === 'exit') {
      await e.reply('❌ 广播已取消')
      return true
    }
    
    try {
      const config = await this.initConfig()
      const message = e.message
      const broadcastType = this.broadcastType
      
      // 检查消息是否为空
      if (!message || message.trim().length === 0) {
        await e.reply('❌ 广播内容不能为空，请重新发送广播内容或输入"取消"退出')
        // 重新设置上下文等待用户输入
        this.broadcastType = broadcastType
        this.setContext('broadcast_content_')
        return true
      }
      
      // 获取群列表
      let groups = []
      let description = ''
      
      switch (broadcastType) {
        case '全部':
          groups = Array.from(Bot[e.self_id].gl.values()).map(g => g.group_id)
          description = '所有群'
          break
          
        case '白名单':
          const otheryaml = await fs.readFile('./config/config/other.yaml', 'utf-8')
          const other = yaml.parse(otheryaml)
          groups = other.whiteGroup || []
          description = '白名单群组'
          break
          
        case '黑名单':
          const otheryaml2 = await fs.readFile('./config/config/other.yaml', 'utf-8')
          const other2 = yaml.parse(otheryaml2)
          groups = other2.blackGroup || []
          description = '黑名单群组'
          break
      }
      
      if (groups.length === 0) {
        await e.reply(`❌ ${description}为空，广播失败`)
        return true
      }
      
      // 显示广播预览
      const preview = [
        `📝 广播预览（${description}）：`,
        `────────────────`,
        `${message}`,
        `────────────────`,
        `📊 共 ${groups.length} 个群组`,
        `⏱️ 延迟发送：${config.delays ? '开启' : '关闭'}`,
        `⌛ 延迟时间：${config.delays ? config.Nnumber + ' 毫秒' : '无'}`,
        `🎲 随机延迟：${config.random_delays ? '开启' : '关闭'}`,
        ``,
        `是否确认发送？`,
        `回复"确认"开始广播，输入"取消"退出`
      ]
      
      await e.reply(preview.join('\n'))
      this.broadcastData = { groups, message, description, config }
      this.setContext('broadcast_confirm_')
      
    } catch (error) {
      console.error('[广播通知] 处理广播内容失败:', error)
      await e.reply('❌ 处理广播内容时出现错误')
    }
  }

  async broadcast_confirm_(e) {
    this.finish('broadcast_confirm_')
    
    if (e.msg !== '确认') {
      await e.reply('❌ 广播已取消')
      return true
    }
    
    const { groups, message, description, config } = this.broadcastData
    
    // 开始广播
    await e.reply(`🚀 开始广播，共 ${groups.length} 个${description}`)
    
    let successCount = 0
    let failCount = 0
    const results = []
    const failDetails = []
    
    for (let i = 0; i < groups.length; i++) {
      const groupId = groups[i]
      
      try {
        // 计算延迟
        let delay = 0
        if (config.delays) {
          delay = config.Nnumber
          if (config.random_delays) {
            delay = Math.floor(Math.random() * 2000) + 4000 // 4-6秒
          }
        }
        
        // 发送消息
        await Bot[e.self_id].pickGroup(groupId).sendMsg(message)
        successCount++
        results.push(`✅ 群 ${groupId} 发送成功`)
        
        // 每10个群报告一次进度
        if ((i + 1) % 10 === 0 || i === groups.length - 1) {
          await e.reply(`进度：${i + 1}/${groups.length}\n成功：${successCount} 失败：${failCount}`)
        }
        
        // 延迟
        if (delay > 0 && i < groups.length - 1) {
          await common.sleep(delay)
        }
        
      } catch (error) {
        failCount++
        const errorMsg = `群 ${groupId} 发送失败: ${error.code || '未知错误'} - ${error.message || '未知原因'}`
        results.push(`❌ ${errorMsg}`)
        failDetails.push(errorMsg)
        console.error(`[广播通知] 发送到群 ${groupId} 失败:`, error)
      }
    }
    
    // 生成报告
    const successRate = ((successCount / groups.length) * 100).toFixed(2)
    const report = [
      '📊 广播完成报告',
      `📈 总群数：${groups.length}`,
      `✅ 成功：${successCount}`,
      `❌ 失败：${failCount}`,
      `📋 成功率：${successRate}%`,
      `⏱️ 总耗时：约 ${Math.round((groups.length - 1) * (config.delays ? config.Nnumber : 0) / 1000)} 秒`
    ]
    
    if (failCount > 0) {
      report.push('\n❌ 失败详情（前10个）：')
      failDetails.slice(0, 10).forEach((detail, index) => {
        report.push(`${index + 1}. ${detail}`)
      })
      if (failDetails.length > 10) {
        report.push(`... 还有 ${failDetails.length - 10} 个失败`)
      }
    } else {
      report.push('\n🎉 所有群组发送成功！')
    }
    
    await e.reply(report.join('\n'))
    
    // 保存日志到广播目录
    await this.saveBroadcastLog({
      time: new Date().toISOString(),
      master: e.user_id,
      type: description,
      total: groups.length,
      success: successCount,
      fail: failCount,
      success_rate: successRate,
      message: message.slice(0, 100) + (message.length > 100 ? '...' : '') // 只保存前100字符
    })
  }

  // 保存广播日志到广播目录
  async saveBroadcastLog(logData) {
    try {
      // 确保广播日志目录存在
      await fs.mkdir(this.logDir, { recursive: true })
      
      // 按日期创建日志文件
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const logFile = path.join(this.logDir, `${today}.json`)
      let logs = []
      
      try {
        const existingLogs = await fs.readFile(logFile, 'utf-8')
        logs = JSON.parse(existingLogs)
      } catch (error) {
        // 文件不存在，创建新文件
      }
      
      logs.unshift(logData)
      // 只保留当天最近的50条日志
      if (logs.length > 50) {
        logs = logs.slice(0, 50)
      }
      
      await fs.writeFile(logFile, JSON.stringify(logs, null, 2), 'utf-8')
      
      console.log(`[广播通知] 日志已保存到: ${logFile}`)
    } catch (error) {
      console.error('[广播通知] 保存日志失败:', error)
    }
  }

  // 获取最新的日志记录
  async getLatestLog() {
    try {
      await fs.access(this.logDir)
      const files = await fs.readdir(this.logDir)
      const logFiles = files.filter(f => f.endsWith('.json')).sort().reverse()
      
      if (logFiles.length === 0) return null
      
      // 读取最新的日志文件
      const latestFile = path.join(this.logDir, logFiles[0])
      const content = await fs.readFile(latestFile, 'utf-8')
      const logs = JSON.parse(content)
      
      return logs.length > 0 ? logs[0] : null
    } catch (error) {
      console.error('[广播通知] 获取最新日志失败:', error)
      return null
    }
  }
}