// 預渲染用：各公開路由的 <head> meta（與 App.tsx 路由層的 <Seo> 內容保持一致）
const SITE = 'https://www.foodpowerteam.com';
const DEFAULT_DESC =
  '食在力量 - 連結產業，創造共好。匯聚各產業菁英，提供講座論壇、企業參訪、專業課程等活動報名與會員管理服務。';
const DEFAULT_IMAGE = `${SITE}/og-brand.jpg`;

interface RouteMeta { title: string; description?: string }

export const ROUTE_META: Record<string, RouteMeta> = {
  '/': { title: '食在力量 - 連結產業，創造共好' },
  '/about': { title: '關於我們', description: '認識食在力量美食產業交流協會的理念、組織與服務，連結餐飲與美食產業菁英。' },
  '/activities': { title: '協會活動', description: '食在力量協會活動：講座論壇、企業參訪、美食小聚等，立即線上報名。' },
  '/members': { title: '會員名單', description: '食在力量會員名單，匯聚餐飲服務、美食產品、通路行銷等各領域產業夥伴。' },
  '/join': { title: '加入會員', description: '加入食在力量會員，共享產業資源、活動優惠與商務連結。年費 NT$ 5,000。' },
  '/renew': { title: '會員續費', description: '食在力量會員續費，延續會籍與產業夥伴連結。' },
  '/milestones': { title: '協會大事記', description: '食在力量發展歷程與重要里程碑回顧。' },
  '/festival': { title: '燒肉祭・火鍋祭', description: '食在力量燒肉祭・火鍋祭，匯聚美食品牌的產業合作盛會。' },
  '/articles': { title: '產業專欄', description: '食在力量產業專欄：產業資訊、專家觀點與協會動態，掌握餐飲與美食產業第一手洞見。' },
};

// 動態頁（文章）用：由 prerender 傳入每篇的 meta，短路 ROUTE_META 查表
export interface PageMeta {
  title: string;
  description?: string;
  image?: string;
  path: string;           // e.g. /article/my-slug
  type?: 'website' | 'article';
  publishedTime?: string;
  author?: string;
  jsonLd?: unknown;       // 結構化資料物件（會 JSON.stringify）
}

export const PRERENDER_ROUTES = Object.keys(ROUTE_META);

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function headTagsHtml(path: string, meta?: PageMeta): string {
  // 動態頁（文章）：用傳入的 meta；否則查 ROUTE_META
  const title = meta ? meta.title : (ROUTE_META[path] || ROUTE_META['/']).title;
  const desc = (meta ? meta.description : (ROUTE_META[path] || ROUTE_META['/']).description) || DEFAULT_DESC;
  const image = (meta && meta.image) || DEFAULT_IMAGE;
  const type = (meta && meta.type) || 'website';
  const full = title.includes('食在力量') ? title : `${title}｜食在力量`;
  const url = `${SITE}${(meta ? meta.path : path) === '/' ? '' : (meta ? meta.path : path)}`;
  const tags = [
    `<title>${esc(full)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta name="robots" content="index, follow">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:title" content="${esc(full)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:site_name" content="食在力量">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(full)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
  ];
  if (meta && meta.type === 'article') {
    if (meta.publishedTime) tags.push(`<meta property="article:published_time" content="${esc(meta.publishedTime)}">`);
    if (meta.author) tags.push(`<meta property="article:author" content="${esc(meta.author)}">`);
  }
  if (meta && meta.jsonLd) {
    // JSON-LD：只需防止提前關閉 </script>
    tags.push(`<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`);
  }
  return tags.join('\n    ');
}
