// member-photo — 會員專區自助上傳大頭照（Resend 之外的第二支自助函式）
//
// LIFF 會員為 anon 身分、無法直接寫 storage，故由本函式以 service role 上傳並更新 members.picture。
// 僅接受「已綁定 line_user_id」的會員，且只更新該會員自己的照片。
//
// 需要的環境變數：SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY（Edge Function 預設已注入）
//
// 請求 body：{ line_user_id, file_base64（純 base64，不含 data: 前綴）, ext（jpg/png/webp…）}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BUCKET = 'activity-images';
const FOLDER = 'member-self';
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const MAX_BYTES = 6 * 1024 * 1024; // 6MB

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !key) return json(500, { ok: false, error: '伺服器設定不足' });
    const supabase = createClient(url, key);

    const { line_user_id, file_base64, ext } = await req.json().catch(() => ({} as any));
    if (!line_user_id || !file_base64) return json(400, { ok: false, error: '缺少參數' });

    const cleanExt = String(ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!ALLOWED_EXT.has(cleanExt)) return json(400, { ok: false, error: '不支援的圖片格式' });

    // 綁定驗證：line_user_id 必須對應到一位會員
    const { data: member, error: mErr } = await supabase
      .from('members').select('id').eq('line_user_id', line_user_id).limit(1).maybeSingle();
    if (mErr) return json(500, { ok: false, error: '查詢會員失敗' });
    if (!member?.id) return json(403, { ok: false, error: '尚未綁定會員身分' });

    // 解 base64
    let bytes: Uint8Array;
    try {
      const raw = String(file_base64).includes(',') ? String(file_base64).split(',')[1] : String(file_base64);
      const bin = atob(raw);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch {
      return json(400, { ok: false, error: '圖片解析失敗' });
    }
    if (bytes.byteLength > MAX_BYTES) return json(400, { ok: false, error: '圖片過大（上限 6MB）' });

    const contentType = cleanExt === 'png' ? 'image/png'
      : cleanExt === 'webp' ? 'image/webp'
      : cleanExt === 'gif' ? 'image/gif' : 'image/jpeg';
    const path = `${FOLDER}/${member.id}_${Date.now()}.${cleanExt}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      cacheControl: '3600', upsert: false, contentType,
    });
    if (upErr) return json(502, { ok: false, error: '上傳失敗：' + upErr.message });

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { error: updErr } = await supabase.from('members').update({ picture: publicUrl }).eq('id', member.id);
    if (updErr) return json(500, { ok: false, error: '更新照片失敗：' + updErr.message });

    return json(200, { ok: true, url: publicUrl });
  } catch (e) {
    console.error('[member-photo] error', e);
    return json(500, { ok: false, error: String((e as any)?.message ?? e) });
  }
});
