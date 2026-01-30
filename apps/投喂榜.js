import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import plugin from '../../../lib/plugins/plugin.js';
import cfg from '../../../lib/config/config.js';
import axios from 'axios';
import segment from '../../../lib/segment.js';

const zanzhuPath = path.join(process.cwd(), 'plugins', 'baizi-plugin', 'config', 'zanzhu.json');
if (!fs.existsSync(path.dirname(zanzhuPath))) fs.mkdirSync(path.dirname(zanzhuPath), { recursive: true });
if (!fs.existsSync(zanzhuPath)) fs.writeFileSync(zanzhuPath, JSON.stringify([], null, 2), 'utf8');

export class ZanzhuPlugin extends plugin {
  constructor() {
    super({
      name: '赞助榜',
      dsc: '生成投喂榜单截图',
      event: 'message',
      priority: -1,
      rule: [{ reg: '^#?(赞助|投喂)榜$', fnc: 'showZanzhu' }]
    });
    this.browser = null;
    this.screenshotDir = path.join(process.cwd(), 'data', 'temp');
    if (!fs.existsSync(this.screenshotDir)) fs.mkdirSync(this.screenshotDir, { recursive: true });
  }

  async getData() {
    try {
      return JSON.parse(fs.readFileSync(zanzhuPath, 'utf8')).sort((a, b) => b.money - a.money);
    } catch (e) {
      return [];
    }
  }

  hideQQNumber(qqnumber) {
    const s = String(qqnumber);
    return s.length <= 4 ? s : s.slice(0,2)+'****'+s.slice(-2);
  }

  async getQQNickname(qq) {
    try {
      const res = await axios.get(`http://api.ilingku.com/int/v1/qqname?qq=${qq}`, { timeout: 5000 });
      return res.data.code === 200 ? (res.data.name || '未知') : '匿名';
    } catch (e) {
      return '匿名';
    }
  }

  async generateHTML(data) {
    const total = data.reduce((s, i) => s + i.money, 0);
    const items = await Promise.all(data.map(async (i, idx) => {
      const name = await this.getQQNickname(i.qqnumber);
      const cls = idx ===0 ? 'first' : idx===1 ? 'second' : idx===2 ? 'third' : '';
      const frame = idx <3 ? '<div class="avatar-frame"></div>' : '';
      return `
        <div class="card ${cls}">
          <div class="rank">${idx+1}</div>
          <div class="avatar-box">
            <img src="http://q1.qlogo.cn/g?b=qq&nk=${i.qqnumber}&s=100" class="avatar">
            ${frame}
          </div>
          <div class="info">
            <div class="nick">昵称: ${name}</div>
            <div class="id">ID: ${this.hideQQNumber(i.qqnumber)}</div>
            <div class="money">投喂: ¥${i.money.toFixed(2)}</div>
          </div>
        </div>
      `;
    }));
    const totalCard = `
      <div class="card total">
        <div class="total-info">
          <div>✿ 总投喂金额: ¥${total.toFixed(2)}</div>
          <div>✿ 总投喂人数: ${data.length}</div>
        </div>
      </div>
    `;
    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <style>
          *{margin:0;padding:0;box-sizing:border-box;}
          body{font-family:"微软雅黑",SimSun,Arial,sans-serif;background:#f8f9fa;padding:20px;display:flex;flex-direction:column;align-items:center;}
          h1{color:#7F5AF0;font-size:24px;margin-bottom:20px;}
          .list{width:100%;max-width:400px;}
          .card{background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;display:flex;align-items:center;position:relative;box-shadow:0 4px 12px rgba(0,0,0,0.1);}
          .first{border:2px solid #FFD700;}
          .second{border:2px solid #C0C0C0;}
          .third{border:2px solid #CD7F32;}
          .total{background:#7F5AF0;color:#fff;text-align:center;justify-content:center;}
          .rank{font-size:24px;margin-right:10px;}
          .avatar-box{position:relative;width:60px;height:60px;margin-right:16px;}
          .avatar{width:100%;height:100%;border-radius:50%;border:2px solid #7F5AF0;}
          .avatar-frame{position:absolute;top:-10px;left:-10px;width:150%;height:150%;background:url(http://8.134.11.131/image/tx.png) no-repeat center/cover;pointer-events:none;}
          .info{flex:1;}
          .nick{font-size:16px;font-weight:600;color:#2B2C34;margin-bottom:4px;}
          .id{font-size:14px;color:#666;margin-bottom:4px;}
          .money{font-size:16px;font-weight:600;color:#2CB67D;}
          .total-info{font-size:18px;font-weight:600;}
          h2{color:#d2d2d2;font-size:12px;font-weight:normal;margin-top:20px;}
        </style>
      </head>
      <body>
        <h1>🐾 baizi の投喂榜 🐾</h1>
        <div class="list">${totalCard}${items.join('')}</div>
        <h2>© liusu 2024-2025</h2>
      </body>
      </html>
    `;
  }

  async generateScreenshot(html) {
    if (!this.browser) {
      try {
        this.browser = await puppeteer.launch({
          headless: true,
          args: ['--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--disable-setuid-sandbox'],
          executablePath: cfg?.bot?.chromium_path
        });
      } catch (e) {
        return null;
      }
    }
    const page = await this.browser.newPage();
    try {
      await page.setViewport({ width: 550, height: 800, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const p = path.join(this.screenshotDir, `zanzhu_${Date.now()}.png`);
      await page.screenshot({ path: p, fullPage: true });
      return p;
    } catch (e) {
      return null;
    } finally {
      await page.close();
    }
  }

  async showZanzhu(e) {
    try {
      const data = await this.getData();
      if (data.length === 0) return await e.reply('暂无投喂数据');
      await e.reply('正在整理各位大大的投喂...\n请等一下噢 ⸜(๑\'ᵕ\'๑)⸝⋆*');
      const html = await this.generateHTML(data);
      const img = await this.generateScreenshot(html);
      if (!img) return await e.reply('生成截图失败，请稍后重试');
      await e.reply([segment.image(`file:///${img}`)]);
    } catch (e) {
      await e.reply('发生错误，请稍后重试');
    }
  }
}