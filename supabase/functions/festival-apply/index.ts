import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1"

declare const Deno: { env: { get(key: string): string | undefined } }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FESTIVAL_LABEL: Record<string, string> = {
  yakiniku: '燒肉祭',
  hotpot: '火鍋祭',
  both: '燒肉祭與火鍋祭',
}

const brandAmount = (b: any) =>
  3000 * (b.festival_type === 'both' ? 2 : 1) + (b.sponsor_plan === 'B' ? 4500 : 0)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })

  const fail = (msg: string, status = 400) =>
    new Response(JSON.stringify({ ok: false, error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const body = await req.json()

    // 公司必填欄位
    const required = ['company_name', 'tax_id', 'representative', 'contact_email', 'company_address', 'project_contact', 'project_contact_phone', 'signer_name']
    for (const k of required) {
      if (!body[k] || String(body[k]).trim() === '') return fail(`缺少必填欄位: ${k}`)
    }
    if (body.contract_agreed !== true) return fail('需勾選同意合約')

    // 品牌明細
    const brands = Array.isArray(body.brands) ? body.brands : []
    if (brands.length === 0) return fail('至少需填寫一個參加品牌')
    for (let i = 0; i < brands.length; i++) {
      const b = brands[i]
      const tag = `品牌 ${i + 1}`
      if (!b.brand_name || String(b.brand_name).trim() === '') return fail(`${tag} 缺少品牌名稱`)
      if (!['yakiniku', 'hotpot', 'both'].includes(b.festival_type)) return fail(`${tag} 場次不正確`)
      if (b.sponsor_plan !== 'A' && b.sponsor_plan !== 'B') return fail(`${tag} 未選擇方案`)
      if (!b.shooting_address || String(b.shooting_address).trim() === '') return fail(`${tag} 缺少拍攝店點地址`)
    }

    const SupabaseUrl = Deno.env.get('SUPABASE_URL')
    const SupabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
    if (!SupabaseUrl || !SupabaseKey) throw new Error('Missing Supabase env')

    const supabase = createClient(SupabaseUrl, SupabaseKey)
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null
    const first = brands[0]

    const insertPayload = {
      // 公司
      company_name: body.company_name,
      tax_id: body.tax_id,
      representative: body.representative,
      contact_email: body.contact_email,
      company_address: body.company_address,
      project_contact: body.project_contact,
      project_contact_phone: body.project_contact_phone,
      // 7/8 啟動記者會
      attend_press_conference: body.attend_press_conference === true,
      press_conference_attendees: body.attend_press_conference === true ? (parseInt(body.press_conference_attendees, 10) || 1) : null,
      // 品牌明細（完整陣列）
      brands,
      // 相容用：以第一個品牌填入舊單品牌欄位
      brand_name: first.brand_name,
      festival_type: first.festival_type,
      brand_website: first.brand_website || null,
      social_link: first.social_link || null,
      mkt_contact_name: first.mkt_contact_name || null,
      mkt_contact_lineid: first.mkt_contact_lineid || null,
      mkt_contact_phone: first.mkt_contact_phone || null,
      mkt_contact_email: first.mkt_contact_email || null,
      booking_system: first.booking_system || null,
      booking_link: first.booking_link || null,
      sponsor_plan: first.sponsor_plan,
      shooting_address: first.shooting_address || null,
      meal_detail: first.meal_detail || null,
      exposure_waves: Array.isArray(first.exposure_waves) ? first.exposure_waves : [],
      kol_email_diff_confirmed: !!first.kol_email_diff_confirmed,
      kol_invite_code_confirmed: !!first.kol_invite_code_confirmed,
      kol_account_created_confirmed: !!first.kol_account_created_confirmed,
      // 合約
      contract_agreed: true,
      signer_name: body.signer_name,
      agreed_at: new Date().toISOString(),
      agreed_ip: ip,
      status: 'pending',
    }

    const { data, error } = await supabase
      .from('festival_applications')
      .insert(insertPayload)
      .select('id')
      .single()

    if (error) {
      console.error('[festival-apply] insert error:', error)
      return fail('寫入失敗，請稍後再試', 500)
    }

    // Telegram 通知
    try {
      const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
      const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
      if (token && chatId) {
        const total = brands.reduce((s: number, b: any) => s + brandAmount(b), 0)
        const brandLines = brands
          .map((b: any, i: number) => `${i + 1}. ${b.brand_name}（${FESTIVAL_LABEL[b.festival_type] || b.festival_type}・${b.sponsor_plan === 'B' ? '方案B+4500' : '方案A'}）`)
          .join('\n')
        const pressLine = insertPayload.attend_press_conference ? `出席 7/8 記者會：是（${insertPayload.press_conference_attendees} 位）` : '出席 7/8 記者會：否'
        const text = `🔔 <b>新通知：燒肉/火鍋祭合作報名 (待審核)</b>\n\n公司：${body.company_name}（統編 ${body.tax_id}）\n負責人：${body.representative}\n專案聯絡人：${body.project_contact} / ${body.project_contact_phone}\nEmail：${body.contact_email}\n簽署人：${body.signer_name}\n${pressLine}\n\n參加品牌（${brands.length}）：\n${brandLines}\n\n預估合計：NT$ ${total.toLocaleString()}\n同意時間：${insertPayload.agreed_at}`
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        })
      }
    } catch (e) {
      console.error('[festival-apply] telegram error:', e)
    }

    return new Response(JSON.stringify({ ok: true, id: data.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('[festival-apply] error:', e)
    return fail((e as Error).message, 500)
  }
})
