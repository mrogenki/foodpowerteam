// Vercel serverless function: server-rendered OG tags for share links.
// 對應 vercel.json rewrite：/share/:id → /api/share?id=:id
// 支援兩種 id：
//   1. STATIC_SHARES 中的 key（如 "festival"）— 走自訂分享卡
//   2. activity UUID — 從 Supabase 撈活動資料動態產生

type VercelHandler = (req: any, res: any) => Promise<void>;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const extractPlainText = (raw: string | null | undefined): string => {
  if (!raw) return '';
  // 嘗試解析 BlockEditor 格式 (Editor.js)
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.blocks && Array.isArray(parsed.blocks)) {
      return parsed.blocks
        .map((b: any) => b?.data?.text || b?.data?.caption || '')
        .join(' ')
        .replace(/<[^>]+>/g, '')
        .trim();
    }
  } catch {}
  // 一般 string 或 HTML：剝掉標籤
  return String(raw).replace(/<[^>]+>/g, '').trim();
};

// 靜態分享卡：固定頁面（非活動 UUID）對應的 OG 設定
const STATIC_SHARES: Record<string, { title: string; description: string; image: string; redirect: string }> = {
  festival: {
    title: '燒肉祭 × 火鍋祭｜食在力量招商中',
    description: '全台餐飲業者獨家整合行銷祭典。上架費 NT$3,000，優惠券價值 NT$20,000，行銷總價值 NT$100,000+。',
    image: '/festival/og-festival.jpg',
    redirect: '/#/festival',
  },
};

const handler: VercelHandler = async (req, res) => {
  const id = req.query?.id;
  if (!id || typeof id !== 'string') {
    res.status(400).send('Missing id');
    return;
  }

  const origin = `https://${req.headers?.host || 'www.foodpowerteam.com'}`;

  // 命中靜態分享卡 → 直接回 HTML，不打 Supabase
  const staticEntry = STATIC_SHARES[id];
  if (staticEntry) {
    const shareUrl = `${origin}/share/${encodeURIComponent(id)}`;
    const imageUrl = staticEntry.image.startsWith('http') ? staticEntry.image : `${origin}${staticEntry.image}`;
    const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(staticEntry.title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="食在力量">
<meta property="og:title" content="${escapeHtml(staticEntry.title)}">
<meta property="og:description" content="${escapeHtml(staticEntry.description)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${escapeHtml(shareUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(staticEntry.title)}">
<meta name="twitter:description" content="${escapeHtml(staticEntry.description)}">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">
<script>window.location.replace(${JSON.stringify(staticEntry.redirect)});</script>
</head>
<body style="font-family:system-ui;padding:2em;text-align:center;color:#444">
<p>正在開啟頁面...</p>
<p><a href="${escapeHtml(staticEntry.redirect)}">如未自動跳轉請點此</a></p>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.status(200).send(html);
    return;
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).send('Supabase env not configured');
    return;
  }

  let activity: any = null;
  try {
    const apiUrl = `${SUPABASE_URL}/rest/v1/activities?id=eq.${encodeURIComponent(id)}&select=id,title,date,time,location,picture,description`;
    const r = await fetch(apiUrl, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (r.ok) {
      const data = await r.json();
      activity = Array.isArray(data) ? data[0] : null;
    }
  } catch {
    // fall through — render fallback page
  }

  const redirectTarget = `/#/activity/${encodeURIComponent(id)}`;
  const shareUrl = `${origin}/share/${encodeURIComponent(id)}`;

  const title = activity?.title ? `${activity.title} - 食在力量` : '食在力量活動';
  const descBody = extractPlainText(activity?.description).slice(0, 80);
  const descMeta = activity
    ? [activity.date, activity.time, activity.location].filter(Boolean).join(' ') + (descBody ? ` — ${descBody}` : '')
    : '點擊查看活動詳情';
  const picture = activity?.picture || `${origin}/logo.svg`;

  const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="食在力量">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(descMeta)}">
<meta property="og:image" content="${escapeHtml(picture)}">
<meta property="og:url" content="${escapeHtml(shareUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(descMeta)}">
<meta name="twitter:image" content="${escapeHtml(picture)}">
<script>window.location.replace(${JSON.stringify(redirectTarget)});</script>
</head>
<body style="font-family:system-ui;padding:2em;text-align:center;color:#444">
<p>正在開啟活動頁面...</p>
<p><a href="${escapeHtml(redirectTarget)}">如未自動跳轉請點此</a></p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  res.status(200).send(html);
};

export default handler;
