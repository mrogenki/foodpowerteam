// Build 後 Node SSR 預渲染（不需瀏覽器，Vercel 可靠運作）：
// 1) 產生 app.html（乾淨 SPA shell）作為非預渲染路由的 fallback（失敗即 fail build）。
// 2) 載入 SSR bundle，對每個公開路由渲染 HTML，注入 <head> meta 與 #root 內容，寫成靜態檔。
//    每頁為非致命：失敗就跳過，爬蟲退回 shell。
import { copyFile, writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const indexHtml = path.join(dist, 'index.html');
const appHtml = path.join(dist, 'app.html');
const ssrEntry = path.join(root, 'dist-server', 'entry-server.js');

// ── 1) app.html（fallback shell）──
try {
  await copyFile(indexHtml, appHtml);
  console.log('[prerender] app.html created (SPA fallback shell)');
} catch (e) {
  console.error('[prerender] FATAL: 無法建立 app.html：', e.message);
  process.exit(1);
}

// ── 2) SSR 預渲染（非致命）──
try {
  const template = await readFile(indexHtml, 'utf8');
  const mod = await import(pathToFileURL(ssrEntry).href);
  const render = mod.render;
  const routes = mod.PRERENDER_ROUTES || ['/', '/about', '/activities', '/members', '/join', '/renew', '/milestones', '/festival'];

  for (const route of routes) {
    try {
      const { appHtml: body, headHtml } = await render(route);
      // 移除模板靜態 <title>，改用該頁 meta（避免重複 title）
      let html = template.replace(/<title>[\s\S]*?<\/title>\s*/i, '');
      html = html.replace('</head>', `    ${headHtml}\n  </head>`);
      html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
      const outDir = route === '/' ? dist : path.join(dist, route);
      await mkdir(outDir, { recursive: true });
      await writeFile(path.join(outDir, 'index.html'), html);
      console.log('[prerender] prerendered', route);
    } catch (e) {
      console.warn('[prerender] skip', route, '-', e.message);
    }
  }
} catch (e) {
  console.warn('[prerender] 預渲染略過（非致命）：', e.message);
}
console.log('[prerender] done');
