import plugin from '../../../lib/plugins/plugin.js'
import yaml from 'yaml'
import { promises as fs } from 'fs'
import common from '../../../lib/common/common.js'
import path from 'path'

// 默认配置
const defaultConfig = {
  延迟发送: true,          // 是否开启延迟
  延迟时间: 5000,          // 发送消息延迟（毫秒）
  随机延迟: false,         // 是否开启随机延迟
  启用状态: true,          // 插件是否启用
  日志保留: 30             // 日志保留天数
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
          reg: '^(#)?广播帮助$',
          fnc: 'broadcastHelp',
          permission: 'master'
        },
        {
          reg: '^(#)?(白名单|黑名单)?广播通知$',
          fnc: 'broadcast',
          permission: 'master'
        },
        {
          reg: '^(#)?广播开启$',
          fnc: 'broadcastOpen',
          permission: 'master'
        },
        {
          reg: '^(#)?广播关闭$',
          fnc: 'broadcastClose',
          permission: 'master'
        },
        {
          reg: '^(#)?广播设置$',
          fnc: 'broadcastSetting',
          permission: 'master'
        },
        {
          reg: '^(#)?广播状态$',
          fnc: 'broadcastStatus',
          permission: 'master'
        },
        {
          reg: '^(#)?广播日志$',
          fnc: 'broadcastLog',
          permission: 'master'
        },
        {
          reg: '^(#)?清理广播日志$',
          fnc: 'cleanupLogs',
          permission: 'master'
        },
        {
          reg: '^(#)?(延迟发送|延迟时间|随机延迟|日志保留)(开启|关闭|[0-9]+)$',
          fnc: 'quickSet',
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
      '广播通知插件指令说明',
      '',
      '主指令:',
      '广播通知 - 向所有群发送广播',
      '白名单广播通知 - 向白名单群组发送广播',
      '黑名单广播通知 - 向黑名单群组发送广播',
      '',
      '配置指令:',
      '广播开启 - 启用广播功能',
      '广播关闭 - 禁用广播功能',
      '广播设置 - 设置广播参数',
      '广播状态 - 查看广播状态',
      '广播日志 - 查看最近广播记录',
      '清理广播日志 - 清理过期日志',
      '广播帮助 - 显示此帮助信息',
      '',
      '快速设置:',
      '延迟发送开启 - 开启延迟发送',
      '延迟发送关闭 - 关闭延迟发送',
      '延迟时间5000 - 设置延迟时间为5000毫秒',
      '随机延迟开启 - 开启随机延迟',
      '随机延迟关闭 - 关闭随机延迟',
      '日志保留30 - 设置日志保留30天',
      '',
      '使用示例:',
      '1. 广播开启',
      '2. 延迟发送开启',
      '3. 延迟时间3000',
      '4. 广播通知'
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

  // 广播开启
  async broadcastOpen(e) {
    const config = await this.initConfig()
    config.启用状态 = true
    await this.saveConfig(config)
    await e.reply('广播通知功能已开启')
  }

  // 广播关闭
  async broadcastClose(e) {
    const config = await this.initConfig()
    config.启用状态 = false
    await this.saveConfig(config)
    await e.reply('广播通知功能已关闭')
  }

  // 快速设置
  async quickSet(e) {
    const config = await this.initConfig()
    const match = e.msg.match(/^(#)?(延迟发送|延迟时间|随机延迟|日志保留)(开启|关闭|[0-9]+)$/)
    
    if (!match) return true
    
    const setting = match[2]
    const value = match[3]
    
    switch (setting) {
      case '延迟发送':
        if (value === '开启') {
          config.延迟发送 = true
          await this.saveConfig(config)
          await e.reply('已开启延迟发送')
        } else if (value === '关闭') {
          config.延迟发送 = false
          await this.saveConfig(config)
          await e.reply('已关闭延迟发送')
        }
        break
        
      case '延迟时间':
        const time = parseInt(value)
        if (!isNaN(time) && time >= 0) {
          config.延迟时间 = time
          await this.saveConfig(config)
          await e.reply(`延迟时间已设置为 ${time} 毫秒`)
        }
        break
        
      case '随机延迟':
        if (value === '开启') {
          config.随机延迟 = true
          await this.saveConfig(config)
          await e.reply('已开启随机延迟')
        } else if (value === '关闭') {
          config.随机延迟 = false
          await this.saveConfig(config)
          await e.reply('已关闭随机延迟')
        }
        break
        
      case '日志保留':
        const days = parseInt(value)
        if (!isNaN(days) && days > 0) {
          config.日志保留 = days
          await this.saveConfig(config)
          await e.reply(`日志保留时间已设置为 ${days} 天`)
        }
        break
    }
  }

  // 广播设置菜单
  async broadcastSetting(e) {
    const config = await this.initConfig()
    
    const settings = [
      '当前设置:',
      `启用状态：${config.启用状态 ? '已启用' : '已禁用'}`,
      `延迟发送：${config.延迟发送 ? '已开启' : '已关闭'}`,
      `延迟时间：${config.延迟时间} 毫秒`,
      `随机延迟：${config.随机延迟 ? '已开启' : '已关闭'}`,
      `日志保留：${config.日志保留} 天`,
      '',
      '请选择要修改的选项:',
      '1. 延迟发送开启/关闭',
      '2. 修改延迟时间',
      '3. 随机延迟开启/关闭',
      '4. 修改日志保留天数',
      '',
      '回复数字选择，回复"取消"退出'
    ]
    
    await e.reply(settings.join('\n'))
    this.setContext('setting_menu')
  }

  async setting_menu(e) {
    this.finish('setting_menu')
    
    const config = await this.initConfig()
    const input = e.msg.trim()
    
    if (input === '取消') {
      await e.reply('设置已取消')
      return
    }
    
    switch (input) {
      case '1':
        await e.reply(`当前延迟发送：${config.延迟发送 ? '开启' : '关闭'}\n回复"开启"或"关闭"来修改`)
        this.setContext('set_delay_enable')
        break
      case '2':
        await e.reply(`当前延迟时间：${config.延迟时间} 毫秒\n回复新的延迟时间（毫秒）`)
        this.setContext('set_delay_time')
        break
      case '3':
        await e.reply(`当前随机延迟：${config.随机延迟 ? '开启' : '关闭'}\n回复"开启"或"关闭"来修改`)
        this.setContext('set_random_delay')
        break
      case '4':
        await e.reply(`当前日志保留：${config.日志保留} 天\n回复新的保留天数`)
        this.setContext('set_log_days')
        break
      default:
        await e.reply('请输入有效数字1-4，或回复"取消"退出')
        this.setContext('setting_menu')
    }
  }

  async set_delay_enable(e) {
    this.finish('set_delay_enable')
    const config = await this.initConfig()
    const input = e.msg.trim()
    
    if (input === '开启') {
      config.延迟发送 = true
      await this.saveConfig(config)
      await e.reply('已开启延迟发送')
    } else if (input === '关闭') {
      config.延迟发送 = false
      await this.saveConfig(config)
      await e.reply('已关闭延迟发送')
    } else {
      await e.reply('请输入"开启"或"关闭"')
      this.setContext('set_delay_enable')
    }
  }

  async set_delay_time(e) {
    this.finish('set_delay_time')
    const config = await this.initConfig()
    const input = e.msg.trim()
    const time = parseInt(input)
    
    if (!isNaN(time) && time >= 0) {
      config.延迟时间 = time
      await this.saveConfig(config)
      await e.reply(`延迟时间已设置为 ${time} 毫秒`)
    } else {
      await e.reply('请输入有效的毫秒数')
      this.setContext('set_delay_time')
    }
  }

  async set_random_delay(e) {
    this.finish('set_random_delay')
    const config = await this.initConfig()
    const input = e.msg.trim()
    
    if (input === '开启') {
      config.随机延迟 = true
      await this.saveConfig(config)
      await e.reply('已开启随机延迟')
    } else if (input === '关闭') {
      config.随机延迟 = false
      await this.saveConfig(config)
      await e.reply('已关闭随机延迟')
    } else {
      await e.reply('请输入"开启"或"关闭"')
      this.setContext('set_random_delay')
    }
  }

  async set_log_days(e) {
    this.finish('set_log_days')
    const config = await this.initConfig()
    const input = e.msg.trim()
    const days = parseInt(input)
    
    if (!isNaN(days) && days > 0) {
      config.日志保留 = days
      await this.saveConfig(config)
      await e.reply(`日志保留时间已设置为 ${days} 天`)
    } else {
      await e.reply('请输入有效的天数（大于0）')
      this.setContext('set_log_days')
    }
  }

  // 广播状态
  async broadcastStatus(e) {
    const config = await this.initConfig()
    const status = [
      '广播通知状态',
      `启用状态：${config.启用状态 ? '已启用' : '已禁用'}`,
      `延迟发送：${config.延迟发送 ? '已开启' : '已关闭'}`,
      `延迟时间：${config.延迟时间} 毫秒`,
      `随机延迟：${config.随机延迟 ? '已开启' : '已关闭'}`,
      `日志保留：${config.日志保留} 天`
    ]
    
    // 获取日志目录信息
    try {
      await fs.access(this.logDir)
      const files = await fs.readdir(this.logDir)
      const logFiles = files.filter(f => f.endsWith('.json'))
      status.push(`日志文件：${logFiles.length} 个`)
    } catch (error) {
      status.push('日志目录：尚未创建')
    }
    
    await e.reply(status.join('\n'))
  }

  // 广播日志
  async broadcastLog(e) {
    try {
      await fs.access(this.logDir)
      const files = await fs.readdir(this.logDir)
      const logFiles = files.filter(f => f.endsWith('.json')).sort().reverse()
      
      if (logFiles.length === 0) {
        await e.reply('暂无广播日志记录')
        return
      }
      
      const logs = []
      for (let i = 0; i < Math.min(3, logFiles.length); i++) {
        const filePath = path.join(this.logDir, logFiles[i])
        const content = await fs.readFile(filePath, 'utf-8')
        const fileLogs = JSON.parse(content)
        
        if (Array.isArray(fileLogs)) {
          fileLogs.forEach(log => {
            logs.push(log)
          })
        }
      }
      
      // 按时间排序，取最近的5条
      logs.sort((a, b) => new Date(b.time) - new Date(a.time))
      const recentLogs = logs.slice(0, 5)
      
      const logInfo = ['最近5次广播记录:']
      
      recentLogs.forEach((log, index) => {
        logInfo.push(`${index + 1}. ${log.time ? new Date(log.time).toLocaleString() : '未知时间'}`)
        logInfo.push(`   类型：${log.type || '未知'}`)
        logInfo.push(`   结果：${log.success || 0}成功/${log.fail || 0}失败`)
        logInfo.push(`   成功率：${log.success_rate || 0}%`)
      })
      
      await e.reply(logInfo.join('\n'))
      
    } catch (error) {
      console.error('[广播通知] 读取日志失败:', error)
      await e.reply('读取广播日志失败')
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
        await e.reply('暂无广播日志可清理')
        return
      }
      
      let deletedCount = 0
      const retentionDays = config.日志保留 || 30
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
      
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
      
      await e.reply(`已清理 ${deletedCount} 个过期日志文件`)
      
    } catch (error) {
      console.error('[广播通知] 清理日志失败:', error)
      await e.reply('清理广播日志失败')
    }
  }

  // 主广播功能
  async broadcast(e) {
    if (!e.isMaster) return true
    
    const config = await this.initConfig()
    if (!config.启用状态) {
      await e.reply('广播通知功能已关闭，请使用"广播开启"来启用')
      return true
    }
    
    const match = e.msg.match(/^(#)?(白名单|黑名单)?广播通知$/)
    if (!match) return true
    
    const broadcastType = match[2] || '全部'
    await e.reply(`请发送你要广播的内容（${broadcastType}）\n输入"取消"可以退出`)
    
    this.broadcastType = broadcastType
    this.setContext('broadcast_content')
  }

  async broadcast_content(e) {
    this.finish('broadcast_content')
    
    if (e.msg === '取消') {
      await e.reply('广播已取消')
      return true
    }
    
    try {
      const config = await this.initConfig()
      const message = e.message
      const broadcastType = this.broadcastType
      
      if (!message || message.trim().length === 0) {
        await e.reply('广播内容不能为空，请重新发送广播内容或输入"取消"退出')
        this.broadcastType = broadcastType
        this.setContext('broadcast_content')
        return true
      }
      
      let groups = []
      let description = ''
      
      try {
        switch (broadcastType) {
          case '全部':
            if (!Bot[e.self_id] || !Bot[e.self_id].gl) {
              await e.reply('机器人未登录或群列表为空')
              return true
            }
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
      } catch (error) {
        console.error('[广播通知] 获取群列表失败:', error)
        await e.reply('获取群列表失败')
        return true
      }
      
      if (groups.length === 0) {
        await e.reply(`${description}为空，广播失败`)
        return true
      }
      
      const preview = [
        `广播预览（${description}）：`,
        `${message}`,
        `共 ${groups.length} 个群组`,
        `延迟发送：${config.延迟发送 ? '开启' : '关闭'}`,
        `随机延迟：${config.随机延迟 ? '开启' : '关闭'}`,
        '',
        `是否确认发送？`,
        `回复"确认"开始广播，输入"取消"退出`
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
      this.setContext('broadcast_confirm')
      
    } catch (error) {
      console.error('[广播通知] 处理广播内容失败:', error)
      await e.reply('处理广播内容失败')
    }
  }

  async broadcast_confirm(e) {
    this.finish('broadcast_confirm')
    
    if (e.msg !== '确认') {
      await e.reply('广播已取消')
      return true
    }
    
    const { groups, message, description, config, userId, selfId } = this.broadcastData
    
    await e.reply(`开始广播，共 ${groups.length} 个${description}`)
    
    let successCount = 0
    let failCount = 0
    const failDetails = []
    
    for (let i = 0; i < groups.length; i++) {
      const groupId = groups[i]
      
      try {
        // 计算延迟
        let delay = 0
        if (config.延迟发送) {
          delay = config.延迟时间
          if (config.随机延迟) {
            delay = Math.floor(Math.random() * 2000) + 4000 // 4-6秒随机
          }
        }
        
        // 发送消息
        await Bot[selfId].pickGroup(groupId).sendMsg(message)
        successCount++
        
        // 每10个群报告一次进度
        if ((i + 1) % 10 === 0 || i === groups.length - 1) {
          await e.reply(`进度：${i + 1}/${groups.length} 成功：${successCount} 失败：${failCount}`)
        }
        
        // 延迟
        if (delay > 0 && i < groups.length - 1) {
          await common.sleep(delay)
        }
        
      } catch (error) {
        failCount++
        const errorMsg = `群 ${groupId} 发送失败: ${error.message || '未知原因'}`
        failDetails.push(errorMsg)
      }
    }
    
    // 生成报告
    const successRate = groups.length > 0 ? ((successCount / groups.length) * 100).toFixed(2) : '0.00'
    const report = [
      '广播完成报告',
      `总群数：${groups.length}`,
      `成功：${successCount}`,
      `失败：${failCount}`,
      `成功率：${successRate}%`
    ]
    
    if (failCount > 0) {
      report.push('失败详情：')
      failDetails.slice(0, 5).forEach((detail, index) => {
        report.push(`${index + 1}. ${detail}`)
      })
    }
    
    await e.reply(report.join('\n'))
    
    // 保存日志
    await this.saveBroadcastLog({
      time: new Date().toISOString(),
      master: userId,
      type: description,
      total: groups.length,
      success: successCount,
      fail: failCount,
      success_rate: successRate,
      message: message.slice(0, 100) + (message.length > 100 ? '...' : '')
    })
  }

  // 保存广播日志
  async saveBroadcastLog(logData) {
    try {
      await fs.mkdir(this.logDir, { recursive: true })
      
      const today = new Date().toISOString().split('T')[0]
      const logFile = path.join(this.logDir, `${today}.json`)
      let logs = []
      
      try {
        const existingLogs = await fs.readFile(logFile, 'utf-8')
        logs = JSON.parse(existingLogs)
      } catch (error) {}
      
      logs.unshift(logData)
      if (logs.length > 50) {
        logs = logs.slice(0, 50)
      }
      
      await fs.writeFile(logFile, JSON.stringify(logs, null, 2), 'utf-8')
      
    } catch (error) {
      console.error('[广播通知] 保存日志失败:', error)
    }
  }
}