// 會員價驗證：輸入「完整手機號碼」→ 伺服端精準比對是否為會員。
// 只回傳套用會員價所需的最小資訊（是否會員/會籍是否有效/編號/姓名/點數），
// 不回傳信箱、公司、身分證等，且無法用姓名瀏覽他人 → 消除個資外洩面。
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1"

declare const Deno: { env: { get(key: string): string | undefined } }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 台灣手機正規化：去非數字、886/+886 開頭轉回 0
const normPhone = (p: string): string => {
  const d = String(p ?? '').replace(/\D/g, '')
  return d.startsWith('886') ? '0' + d.slice(3) : d
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const body = await req.json().catch(() => ({}))
    const want = normPhone(body.phone)

    // 必須輸入完整手機（至少 9 碼）才查詢，避免用片段列舉
    if (want.length < 9) return json({ is_member: false })

    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, serviceKey)

    const { data, error } = await admin
      .from('members')
      .select('id,member_no,name,phone,status,membership_expiry_date,points_balance')
    if (error) throw error

    const match = (data ?? []).find((m: any) => normPhone(m.phone || '') === want)
    if (!match) return json({ is_member: false })

    const today = new Date().toISOString().slice(0, 10)
    const active =
      match.status === 'active' &&
      !(match.membership_expiry_date && match.membership_expiry_date < today)

    // 只回最小必要欄位
    return json({
      is_member: true,
      active,
      id: match.id,
      member_no: match.member_no,
      name: match.name,
      points_balance: match.points_balance ?? 0,
    })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
