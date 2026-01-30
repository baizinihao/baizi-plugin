const { execSync } = require('child_process');
const path = require('path');

module.exports = (ctx) => {
  ctx.command('白子插件更新')
    .desc('从GitHub拉取baizi-plugin最新版本')
    .admin()
    .action(async (msg) => {
      try {
        const pluginPath = path.join(__dirname, '..');
        msg.reply('正在更新baizi-plugin，请稍候...');
        execSync(`cd ${pluginPath} && git fetch --all && git reset --hard origin/main`, { stdio: 'ignore' });
        execSync(`cd ${pluginPath} && npm install`, { stdio: 'ignore' });
        msg.reply('baizi-plugin更新完成！请重启云崽使更新生效～');
      } catch (err) {
        msg.reply(`更新失败：${err.message}`);
      }
    });
};