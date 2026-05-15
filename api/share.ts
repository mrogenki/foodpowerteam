// Vercel serverless function: server-rendered OG tags for activity share links.
// 對應 vercel.json rewrite：/share/:id → /api/share?id=:id

type VercelHandler = (req: any, res: any) => Promise<void>;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const NON_TEXT_BLOCK_TYPES = new Set(['image', 'video', 'embed', 'attachment', 'file', 'divider']);

const extractPlainText = (raw: string | null | undefined): string => {
  if (!raw) return '';
  let blocks: any[] | null = null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) blocks = parsed;
    else if (parsed?.blocks && Array.isArray(parsed.blocks)) blocks = parsed.blocks;
  } catch {
    // raw 不是 JSON，留待 fallback 處理
  }
  if (blocks) {
    return blocks
      .filter((b: any) => !NON_TEXT_BLOCK_TYPES.has(String(b?.type || '').toLowerCase()))
      .map((b: any) => b?.content || b?.data?.text || b?.data?.caption || b?.text || '')
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return String(raw).replace(/<[^>]+>/g, '').trim();
};

const handler: VercelHandler = async (req, res) => {
  const id = req.query?.id;
  if (!id || typeof id !== 'string') {
    res.status(400).send('Missing id');
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
  const origin = `https://${req.headers?.host || 'www.foodpowerteam.com'}`;
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
