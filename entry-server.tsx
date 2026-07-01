// SSR 預渲染進入點：用 react-dom/server 把指定路由渲染成 HTML（不需瀏覽器）。
// renderToPipeableStream + onAllReady 會等所有 Suspense（含 React.lazy 頁面）解析完成。
import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { Writable } from 'node:stream';
import App from './App';
import { headTagsHtml, PRERENDER_ROUTES } from './seo/routeMeta';

export { PRERENDER_ROUTES };

export function render(url: string): Promise<{ appHtml: string; headHtml: string }> {
  (globalThis as any).__SSR_URL__ = url;
  return new Promise((resolve, reject) => {
    let settled = false;
    let html = '';
    const sink = new Writable({
      write(chunk, _enc, cb) { html += chunk.toString(); cb(); },
      final(cb) { cb(); },
    });
    sink.on('finish', () => { if (!settled) { settled = true; resolve({ appHtml: html, headHtml: headTagsHtml(url) }); } });

    const { pipe, abort } = renderToPipeableStream(<App />, {
      onAllReady() { pipe(sink); },
      onError(err) { if (!settled) { settled = true; reject(err); } },
    });
    // 安全閥：避免某頁卡住
    setTimeout(() => { try { abort(); } catch { /* noop */ } }, 20000);
  });
}
