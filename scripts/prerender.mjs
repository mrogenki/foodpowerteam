// Build 後 Node SSR 預渲染（不需瀏覽器，Vercel 可靠運作）：
// 1) 產生 app.html（乾淨 SPA shell）作為非預渲染路由的 fallback（失敗即 fail build）。
// 2) 載入 SSR bundle，對每個「靜態公開路由」渲染 HTML，注入 <head> meta 與 #root 內容。
// 3) 從 Supabase 撈「已發布文章」，逐篇預渲染 /article/<slug>（含正文 + per-article meta + JSON-LD）。
// 4) 產生 dist/sitemap.xml（靜態頁 + 每篇文章）。
//    每頁為非致命：失敗就跳過，爬蟲退回 shell。
import { copyFile, writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const SITE = 'https://www.foodpowerteam.com';
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

const template = await readFile(indexHtml, 'utf8');
const mod = await import(pathToFileURL(ssrEntry).href);
const render = mod.render;

// 把一次 render() 結果寫成 dist/<route>/index.html
async function writeRoute(route, ssrData, headMeta) {
  const { appHtml: body, headHtml } = await render(route, ssrData, headMeta);
  let html = template.replace(/<title>[\s\S]*?<\/title>\s*/i, '');
  html = html.replace('</head>', `    ${headHtml}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  const outDir = route === '/' ? dist : path.join(dist, route);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'index.html'), html);
}

// ── 2) 靜態公開路由 ──
const staticRoutes = mod.PRERENDER_ROUTES || ['/', '/about', '/activities', '/members', '/join', '/renew', '/milestones', '/festival', '/articles'];
for (const route of staticRoutes) {
  try { await writeRoute(route); console.log('[prerender] prerendered', route); }
  catch (e) { console.warn('[prerender] skip', route, '-', e.message); }
}

// ── 3) 文章：撈已發布、逐篇預渲染（含正文 + meta + JSON-LD）──
const sitemapArticles = [];
try {
  // 與 utils/supabaseClient.ts 相同的東京預設值：確保 Vercel 未設 env 時文章仍能預渲染（anon key、RLS 只回 published）
  const DEFAULT_URL = 'https://igowitmbnlvzznqgfpfl.supabase.co';
  const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnb3dpdG1ibmx2enpucWdmcGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NjE2MzcsImV4cCI6MjA5OTMzNzYzN30.XovQ0zXKOZ58jEOUJvM7HYZWNW5OsJPTq3hlNWwfh70';
  const SUPA_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_URL;
  const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_KEY;
  if (!SUPA_URL || !SUPA_KEY) {
    console.warn('[prerender] 缺 Supabase 連線資訊，略過文章預渲染（非致命）');
  } else {
    const supabase = createClient(SUPA_URL, SUPA_KEY);
    const { data: articles, error } = await supabase
      .from('articles').select('*').eq('status', 'published').order('published_at', { ascending: false });
    if (error) throw error;
    for (const a of (articles || [])) {
      const url = `${SITE}/article/${a.slug}`;
      const headMeta = {
        title: a.title,
        description: a.excerpt || undefined,
        image: a.cover || undefined,
        path: `/article/${a.slug}`,
        type: 'article',
        publishedTime: a.published_at || a.created_at || undefined,
        author: a.author_name || undefined,
        jsonLd: {
          '@context': 'https://schema.org', '@type': 'Article',
          headline: a.title, description: a.excerpt || undefined, image: a.cover || undefined,
          datePublished: a.published_at || a.created_at || undefined,
          dateModified: a.updated_at || a.published_at || undefined,
          author: a.author_name ? { '@type': 'Person', name: a.author_name, jobTitle: a.author_title || undefined } : { '@type': 'Organization', name: '食在力量' },
          publisher: { '@type': 'Organization', name: '食在力量美食產業交流協會' },
          mainEntityOfPage: url, articleSection: a.category || undefined,
        },
      };
      try {
        await writeRoute(`/article/${a.slug}`, a, headMeta);
        sitemapArticles.push({ slug: a.slug, lastmod: (a.updated_at || a.published_at || a.created_at || '').slice(0, 10) });
        console.log('[prerender] prerendered /article/' + a.slug);
      } catch (e) { console.warn('[prerender] skip /article/' + a.slug, '-', e.message); }
    }
    console.log(`[prerender] articles prerendered: ${sitemapArticles.length}`);
  }
} catch (e) {
  console.warn('[prerender] 文章預渲染略過（非致命）：', e.message);
}

// ── 4) 產生 sitemap.xml（靜態頁 + 文章）──
try {
  const staticUrls = [
    { loc: `${SITE}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE}/about`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${SITE}/activities`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE}/members`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${SITE}/milestones`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE}/festival`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${SITE}/articles`, changefreq: 'daily', priority: '0.8' },
    { loc: `${SITE}/join`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${SITE}/renew`, changefreq: 'monthly', priority: '0.4' },
  ];
  const urlXml = (u) => `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
  const articleUrls = sitemapArticles.map(a => ({ loc: `${SITE}/article/${a.slug}`, lastmod: a.lastmod || undefined, changefreq: 'monthly', priority: '0.7' }));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls, ...articleUrls].map(urlXml).join('\n')}\n</urlset>\n`;
  await writeFile(path.join(dist, 'sitemap.xml'), xml);
  console.log(`[prerender] sitemap.xml written (${staticUrls.length + articleUrls.length} urls)`);
} catch (e) {
  console.warn('[prerender] sitemap 產生略過（非致命）：', e.message);
}

console.log('[prerender] done');
