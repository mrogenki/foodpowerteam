// trigger-rebuild — 後台一鍵觸發 Vercel 重新部署（讓 DB 內容變更重新 prerender 到靜態頁）
//
// 為什麼要伺服器端：Vercel Deploy Hook 網址是機密（任何人拿到就能觸發建置），不可放前端。
// 由本函式持有 secret 並代為 POST；verify_jwt=true 確保只有登入的後台管理員能呼叫。
//
// 需要的 secret：VERCEL_DEPLOY_HOOK_URL（在 Vercel Project Settings → Git → Deploy Hooks 建立後貼入）

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const hook = Deno.env.get('VERCEL_DEPLOY_HOOK_URL');
    if (!hook) return json(500, { ok: false, error: 'VERCEL_DEPLOY_HOOK_URL 未設定' });

    const res = await fetch(hook, { method: 'POST' });
    if (!res.ok) {
      const detail = await res.text();
      console.error('[trigger-rebuild] hook failed', res.status, detail);
      return json(502, { ok: false, error: `Vercel 觸發失敗 (${res.status})` });
    }
    const data = await res.json().catch(() => ({}));
    return json(200, { ok: true, job: data?.job ?? null });
  } catch (e) {
    console.error('[trigger-rebuild] error', e);
    return json(500, { ok: false, error: String((e as any)?.message ?? e) });
  }
});
