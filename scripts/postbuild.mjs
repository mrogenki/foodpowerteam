// Build 後處理：
// 1) 產生 app.html（乾淨 SPA shell）作為 Vercel 對「非預渲染路由」的 fallback。
//    此步驟失敗 → build 失敗（Vercel 保留前一個正常部署，不影響線上）。
// 2) 用 puppeteer 對公開頁拍「預渲染快照」寫入靜態 HTML，讓不執行 JS 的爬蟲/AI 也能讀到內容與每頁 meta。
//    此步驟為「非致命」：失敗就跳過，爬蟲退回乾淨 shell，網站照常運作。
import { copyFile, writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const indexHtml = path.join(dist, 'index.html');
const appHtml = path.join(dist, 'app.html');

// ── 1) app.html（fallback shell）── 失敗即讓 build 失敗
try {
  await copyFile(indexHtml, appHtml);
  console.log('[postbuild] app.html created (SPA fallback shell)');
} catch (e) {
  console.error('[postbuild] FATAL: 無法建立 app.html：', e.message);
  process.exit(1);
}

// ── 2) 預渲染（非致命）──
const ROUTES = ['/', '/about', '/activities', '/members', '/join', '/renew', '/milestones', '/festival'];
const PORT = 41789;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml',
};

let browser, server;
try {
  const puppeteer = (await import('puppeteer-core')).default;
  // Vercel/Lambda 環境缺 chromium 系統庫，改用 @sparticuz/chromium 打包版
  let launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];
  let executablePath;
  let headless = true;
  try {
    const chromium = (await import('@sparticuz/chromium')).default;
    launchArgs = chromium.args;
    executablePath = await chromium.executablePath();
    headless = chromium.headless ?? true;
  } catch (e) {
    console.warn('[postbuild] @sparticuz/chromium 載入失敗，改用系統 Chrome：', e.message);
    executablePath = undefined; // 本機退回（若有系統 Chrome 由 channel 指定）
  }

  server = http.createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let fp = path.join(dist, urlPath);
      // 目錄（例如 public/festival 複製來的 logo 夾）→ 找其 index.html
      if (existsSync(fp) && statSync(fp).isDirectory()) fp = path.join(fp, 'index.html');
      // 不存在或非檔案 → 退回乾淨 shell（讓 SPA 自行 client-render 該頁，再擷取）
      if (!fp.startsWith(dist) || !existsSync(fp) || statSync(fp).isDirectory()) fp = appHtml;
      const data = await readFile(fp);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise((r) => server.listen(PORT, r));

  browser = await puppeteer.launch({
    args: launchArgs,
    headless,
    ...(executablePath ? { executablePath } : { channel: 'chrome' }),
  });

  for (const route of ROUTES) {
    const page = await browser.newPage();
    try {
      await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 800)); // 等 React 渲染與 Seo meta 寫入
      const html = '<!DOCTYPE html>\n' + (await page.content()).replace(/^<!DOCTYPE html>/i, '');
      const outDir = route === '/' ? dist : path.join(dist, route);
      await mkdir(outDir, { recursive: true });
      await writeFile(path.join(outDir, 'index.html'), html);
      console.log('[postbuild] prerendered', route);
    } catch (e) {
      console.warn('[postbuild] skip', route, '-', e.message);
    } finally {
      await page.close().catch(() => {});
    }
  }
} catch (e) {
  console.warn('[postbuild] 預渲染略過（非致命）：', e.message);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.close();
}
console.log('[postbuild] done');
