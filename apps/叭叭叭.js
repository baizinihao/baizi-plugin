const plugin = require('@cloudflare/cli-plugin');
const axios = require('axios');

// 核心功能不变，适配指定存放路径
plugin.registerCommand('随机光遇叫声', {
  desc: '调用接口返回随机光遇叫声，支持加/不加井号',
  args: [{ name: 'hasHash', type: 'boolean', optional: true, desc: '是否带井号（默认不加）' }],
  async action(args) {
    const apiUrl = 'http://baizihaoxiao.xin/API/sky3.php';
    const prefix = args.hasHash ? '#' : '';
    try {
      const response = await axios.get(apiUrl);
      return `${prefix}${response.data || '光遇叫声已触发～'}`;
    } catch (error) {
      return `${prefix}接口调用失败，换个时间试试呀～`;
    }
  }
});

module.exports = plugin;