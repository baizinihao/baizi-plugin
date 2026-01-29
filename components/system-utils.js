import { exec } from 'child_process'
import util from 'util'
import os from 'os'

const execPromise = util.promisify(exec)

// 系统数据收集工具类
export default class SystemUtils {
  // 收集所有系统数据
  static async collectSystemData() {
    const data = {}
    
    try {
      // 获取操作系统信息
      data.os = await this.getOsInfo()
      
      // 获取CPU信息
      data.cpu = await this.getCpuInfo()
      
      // 获取内存信息
      data.memory = this.getMemoryInfo()
      
      // 获取磁盘信息
      data.disk = await this.getDiskInfo()
      
      // 获取网络信息
      data.network = await this.getNetworkInfo()
      
      // 获取进程信息
      data.processes = await this.getProcessInfo()
      
      // 获取Bot信息
      data.bot = await this.getBotInfo()
      
      // 获取负载历史
      data.loadHistory = await this.getLoadHistory()
      
      // 添加插件信息
      data.plugins = {
        count: '0',
        jsCount: '0',
        pluginsList: []
      }
      
      return data;
    } catch (error) {
      console.error('收集系统数据失败:', error);
      // 返回默认数据结构以防报错
      return {
        os: {
          type: 'Unknown',
          platform: 'Unknown',
          release: 'Unknown',
          hostname: 'Unknown',
          uptime: '0秒',
          loadavg: [0, 0, 0]
        },
        cpu: {
          model: 'Unknown CPU',
          cores: 1,
          usage: 0,
          arch: os.arch() || 'Unknown',
          avgSpeed: 'N/A',
          maxSpeed: 'N/A'
        },
        memory: {
          total: '0 B',
          free: '0 B',
          used: '0 B',
          usage: '0%'
        },
        disk: [],
        network: [],
        processes: [],
        bot: {
          name: 'YM Bot',
          version: '1.0.0',
          uptime: '0秒',
          nodeVersion: process.version || 'Unknown',
          memoryUsage: {
            rss: '0 B',
            heapTotal: '0 B',
            heapUsed: '0 B',
            external: '0 B',
            percentage: '0%'
          },
          accounts: []
        },
        plugins: {
          count: '0',
          jsCount: '0',
          pluginsList: []
        },
        loadHistory: {
          times: [],
          cpu: [],
          memory: [],
          network: []
        }
      };
    }
  }

  // 获取操作系统信息
  static async getOsInfo() {
    try {
      // 检测真实系统类型
      let realPlatform = os.platform()
      let realType = os.type()

      // 尝试读取 /proc/version 来识别 Android 系统
      try {
        const { stdout } = await execPromise('cat /proc/version')
        if (stdout.toLowerCase().includes('android')) {
          realPlatform = 'android'
          realType = 'Android'
        }
      } catch (error) {
        // 忽略错误，使用默认值
      }

      return {
        type: realType,
        platform: realPlatform,
        release: os.release(),
        hostname: os.hostname(),
        uptime: this.formatUptime(os.uptime()),
        loadavg: os.loadavg()
      }
    } catch (error) {
      console.error('获取系统信息失败:', error)
      return {
        type: 'Unknown',
        platform: 'Unknown',
        release: 'Unknown',
        hostname: 'Unknown',
        uptime: '0秒',
        loadavg: [0, 0, 0]
      }
    }
  }

  // 获取CPU信息
  static async getCpuInfo() {
    try {
      let model = 'Unknown CPU'
      let cores = 1
      let usage = 0
      let arch = os.arch() || 'Unknown'
      let avgSpeed = 'N/A'
      let maxSpeed = 'N/A'
      
      try {
        model = await this.getCpuModel()
      } catch (error) {
        console.error('获取CPU型号失败:', error)
      }
      
      try {
        const cpus = os.cpus()
        cores = cpus ? cpus.length : 1
        
        // 尝试获取CPU速度
        if (cpus && cpus.length > 0) {
          const speeds = cpus.map(cpu => cpu.speed)
          avgSpeed = Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) + ' MHz'
          maxSpeed = Math.max(...speeds) + ' MHz'
        }
      } catch (error) {
        console.error('获取CPU核心数据失败:', error)
      }
      
      try {
        usage = await this.getCpuUsage()
      } catch (error) {
        console.error('获取CPU使用率失败:', error)
      }

      return { 
        model, 
        cores, 
        usage,
        arch,
        avgSpeed,
        maxSpeed
      }
    } catch (error) {
      console.error('获取CPU信息失败:', error)
      return { 
        model: 'Unknown CPU', 
        cores: 1, 
        usage: 0,
        arch: os.arch() || 'Unknown',
        avgSpeed: 'N/A',
        maxSpeed: 'N/A'
      }
    }
  }

  // 获取CPU型号
  static async getCpuModel() {
    try {
      const platform = os.platform()
      if (platform === 'linux') {
        const { stdout } = await execPromise('cat /proc/cpuinfo | grep "model name" | head -n 1')
        const model = stdout.split(':')[1]
        return model ? model.trim() : os.cpus()[0]?.model || 'Unknown CPU'
      } else if (platform === 'darwin') {
        const { stdout } = await execPromise('sysctl -n machdep.cpu.brand_string')
        return stdout.trim() || os.cpus()[0]?.model || 'Unknown CPU'
      } else if (platform === 'win32') {
        const { stdout } = await execPromise('wmic cpu get name')
        const lines = stdout.split('\n').filter(line => line.trim())
        return lines[1]?.trim() || os.cpus()[0]?.model || 'Unknown CPU'
      }
      return os.cpus()[0]?.model || 'Unknown CPU'
    } catch (error) {
      console.error('获取CPU型号失败:', error)
      return os.cpus()[0]?.model || 'Unknown CPU'
    }
  }

  // 获取CPU使用率
  static async getCpuUsage() {
    try {
      const startCpu = os.cpus()
      if (!startCpu || startCpu.length === 0) {
        throw new Error('无法获取CPU信息')
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const endCpu = os.cpus()
      if (!endCpu || endCpu.length === 0) {
        throw new Error('无法获取CPU信息')
      }

      let idleDifference = 0
      let totalDifference = 0

      for (let i = 0; i < startCpu.length; i++) {
        const start = startCpu[i].times
        const end = endCpu[i].times

        if (!start || !end) continue

        const startTotal = start.user + start.nice + start.sys + start.idle + start.irq
        const endTotal = end.user + end.nice + end.sys + end.idle + end.irq

        idleDifference += (end.idle - start.idle)
        totalDifference += (endTotal - startTotal)
      }

      if (totalDifference === 0) return 0

      return Math.round(((1 - idleDifference / totalDifference) * 100) * 100) / 100
    } catch (error) {
      console.error('获取CPU使用率失败:', error)
      return 0
    }
  }

  // 获取内存信息
  static getMemoryInfo() {
    try {
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      
      if (!totalMem || !freeMem) {
        throw new Error('无法获取内存信息')
      }

      return {
        total: this.formatBytes(totalMem),
        free: this.formatBytes(freeMem),
        used: this.formatBytes(totalMem - freeMem),
        usage: Math.round((totalMem - freeMem) / totalMem * 100) + '%'
      }
    } catch (error) {
      console.error('获取内存信息失败:', error)
      return {
        total: '0 B',
        free: '0 B',
        used: '0 B',
        usage: '0%'
      }
    }
  }

  // 获取磁盘信息
  static async getDiskInfo() {
    try {
      if (os.platform() === 'win32') {
        const { stdout } = await execPromise('wmic logicaldisk get size,freespace,caption')
        const lines = stdout.split('\n').slice(1).filter(Boolean)
        return lines.map(line => {
          const parts = line.trim().split(/\s+/)
          const size = parseInt(parts[1])
          const free = parseInt(parts[0])
          return {
            filesystem: parts[2],
            size: this.formatBytes(size),
            used: this.formatBytes(size - free),
            available: this.formatBytes(free),
            percent: Math.round((size - free) / size * 100) + '%',
            mount: parts[2]
          }
        })
      } else {
        const { stdout } = await execPromise('df -h')
        const lines = stdout.split('\n').filter(line => line.includes('/dev/'))
        return lines.map(line => {
          const parts = line.trim().split(/\s+/)
          return {
            filesystem: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            percent: parts[4],
            mount: parts[5]
          }
        })
      }
    } catch (error) {
      console.error('获取磁盘信息失败:', error)
      return []
    }
  }

  // 获取网络信息
  static async getNetworkInfo() {
    try {
      const netInterfaces = os.networkInterfaces()
      const result = []
      
      for (const [name, interfaces] of Object.entries(netInterfaces)) {
        if (!interfaces) continue
        
        for (const iface of interfaces) {
          if (!iface.internal) {
            result.push({
              name,
              address: iface.address,
              netmask: iface.netmask,
              family: iface.family,
              mac: iface.mac
            })
          }
        }
      }

      if (os.platform() === 'linux') {
        try {
          const initialData = await this.getNetworkBytes()
          await new Promise(resolve => setTimeout(resolve, 1000))
          const finalData = await this.getNetworkBytes()
          
          for (const name in initialData) {
            const initialRx = initialData[name].rx
            const initialTx = initialData[name].tx
            const finalRx = finalData[name].rx
            const finalTx = finalData[name].tx
            
            const networkInterface = result.find(iface => iface.name === name)
            if (networkInterface) {
              networkInterface.rxSpeed = this.formatBytes(finalRx - initialRx) + '/s'
              networkInterface.txSpeed = this.formatBytes(finalTx - initialTx) + '/s'
            }
          }
        } catch (error) {
          console.error('获取网络速度失败:', error)
        }
      }
      
      return result
    } catch (error) {
      console.error('获取网络信息失败:', error)
      return []
    }
  }

  // 获取网络字节流量
  static async getNetworkBytes() {
    if (os.platform() !== 'linux') return {}
    
    try {
      const { stdout } = await execPromise('cat /proc/net/dev')
      const lines = stdout.split('\n').filter(line => line.includes(':'))
      
      const result = {}
      for (const line of lines) {
        const parts = line.trim().split(':')
        const name = parts[0].trim()
        const values = parts[1].trim().split(/\s+/)
        
        result[name] = {
          rx: parseInt(values[0]),
          tx: parseInt(values[8])
        }
      }
      
      return result
    } catch (error) {
      console.error('读取网络字节数失败:', error)
      return {}
    }
  }

  // 获取进程信息
  static async getProcessInfo() {
    try {
      let cmd = ''
      const platform = os.platform()
      
      if (platform === 'linux' || platform === 'darwin') {
        cmd = 'ps -eo pid,ppid,user,%cpu,%mem,comm --sort=-%cpu | head -n 11'
      } else if (platform === 'win32') {
        cmd = 'tasklist /fo csv /nh'
      } else {
        return []
      }
      
      const { stdout } = await execPromise(cmd)
      const lines = stdout.split('\n').filter(Boolean)
      
      if (platform === 'linux' || platform === 'darwin') {
        lines.shift() // 移除头部
        return lines.map(line => {
          const parts = line.trim().split(/\s+/)
          return {
            pid: parts[0],
            ppid: parts[1],
            user: parts[2],
            cpu: parseFloat(parts[3]) || 0,
            memory: parseFloat(parts[4]) || 0,
            name: parts.slice(5).join(' ')
          }
        })
      } else if (platform === 'win32') {
        return lines.map(line => {
          const parts = line.replace(/"/g, '').split(',')
          return {
            pid: parts[1],
            ppid: '0',
            user: 'N/A',
            cpu: 0,
            memory: 0,
            name: parts[0]
          }
        })
      }
    } catch (error) {
      console.error('获取进程信息失败:', error)
      return []
    }
  }

  // 获取Bot信息
  static async getBotInfo() {
    try {
      const memUsage = process.memoryUsage()
      const memoryUsagePercentage = (memUsage.heapUsed / memUsage.heapTotal * 100).toFixed(2) + '%';
      
      return {
        name: 'YM Bot',
        version: '1.0.0',
        uptime: this.formatUptime(process.uptime()),
        runtime: this.formatUptime(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        memoryUsage: {
          rss: this.formatBytes(memUsage.rss),
          heapTotal: this.formatBytes(memUsage.heapTotal),
          heapUsed: this.formatBytes(memUsage.heapUsed),
          external: this.formatBytes(memUsage.external || 0),
          percentage: memoryUsagePercentage
        },
        total: this.formatBytes(memUsage.rss),
        heap: this.formatBytes(memUsage.heapTotal),
        heapUsed: this.formatBytes(memUsage.heapUsed),
        external: this.formatBytes(memUsage.external || 0),
        usagePercentage: memoryUsagePercentage,
        accounts: []
      }
    } catch (error) {
      console.error('获取Bot信息失败:', error)
      return {
        name: 'YM Bot',
        version: '1.0.0',
        uptime: '0秒',
        runtime: '0秒',
        nodeVersion: process.version || 'Unknown',
        platform: process.platform || 'Unknown',
        arch: process.arch || 'Unknown', 
        pid: process.pid || 0,
        memoryUsage: {
          rss: '0 B',
          heapTotal: '0 B',
          heapUsed: '0 B',
          external: '0 B',
          percentage: '0%'
        },
        total: '0 B',
        heap: '0 B',
        heapUsed: '0 B',
        external: '0 B',
        usagePercentage: '0%',
        accounts: []
      }
    }
  }

  // 获取负载历史（模拟数据）
  static async getLoadHistory() {
    const history = {
      times: [],
      cpu: [],
      memory: [],
      network: []
    }
    
    const now = Date.now()
    for (let i = 0; i < 24; i++) {
      const time = new Date(now - (23 - i) * 3600000)
      history.times.push(time.getHours() + ':00')
      history.cpu.push(Math.floor(Math.random() * 80) + 10)
      history.memory.push(Math.floor(Math.random() * 70) + 20)
      history.network.push(Math.floor(Math.random() * 50))
    }
    
    return history
  }

  // 格式化字节大小
  static formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
  }

  // 格式化运行时间
  static formatUptime(seconds) {  
    if (!seconds || seconds < 0) return '0秒'
    
    const days = Math.floor(seconds / (3600 * 24))
    const hours = Math.floor((seconds % (3600 * 24)) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    let result = ''
    if (days > 0) result += `${days}天, `
    if (hours > 0 || days > 0) result += `${hours}小时, `
    if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}分钟, `
    result += `${secs}秒`
    
    return result
  }
}