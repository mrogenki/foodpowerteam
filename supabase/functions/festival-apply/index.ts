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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })

  try {
    const body = await req.json()

    // 必填欄位驗證
    const required = ['festival_type','brand_name','company_name','tax_id','representative','contact_email','company_address','project_contact','project_contact_phone','signer_name']
    for (const k of required) {
      if (!body[k] || String(body[k]).trim() === '') {
        return new Response(JSON.stringify({ ok: false, error: `缺少必填欄位: ${k}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }
    if (body.contract_agreed !== true) {
      return new Response(JSON.stringify({ ok: false, error: '需勾選同意合約' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const SupabaseUrl = Deno.env.get('SUPABASE_URL')
    const SupabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
    if (!SupabaseUrl || !SupabaseKey) throw new Error('Missing Supabase env')

    const supabase = createClient(SupabaseUrl, SupabaseKey)

    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null

    const insertPayload = {
      festival_type: body.festival_type,
      brand_name: body.brand_name,
      company_name: body.company_name,
      tax_id: body.tax_id,
      representative: body.representative,
      contact_email: body.contact_email,
      company_address: body.company_address,
      project_contact: body.project_contact,
      project_contact_phone: body.project_contact_phone,
      brand_website: body.brand_website || null,
      social_link: body.social_link || null,
      mkt_contact_name: body.mkt_contact_name || null,
      mkt_contact_lineid: body.mkt_contact_lineid || null,
      mkt_contact_phone: body.mkt_contact_phone || null,
      mkt_contact_email: body.mkt_contact_email || null,
      booking_system: body.booking_system || null,
      booking_link: body.booking_link || null,
      sponsor_plan: body.sponsor_plan === 'A' || body.sponsor_plan === 'B' ? body.sponsor_plan : null,
      shooting_address: body.shooting_address || null,
      kol_email_diff_confirmed: !!body.kol_email_diff_confirmed,
      kol_invite_code_confirmed: !!body.kol_invite_code_confirmed,
      kol_account_created_confirmed: !!body.kol_account_created_confirmed,
      meal_detail: body.meal_detail || null,
      exposure_waves: Array.isArray(body.exposure_waves) ? body.exposure_waves : [],
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
      return new Response(JSON.stringify({ ok: false, error: '寫入失敗，請稍後再試' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Telegram 通知
    try {
      const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
      const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
      if (token && chatId) {
        const planLabel = insertPayload.sponsor_plan === 'B' ? 'B 超值方案 (3位影音 +4500)' : insertPayload.sponsor_plan === 'A' ? 'A 免費方案 (2位圖文)' : '未選'
        const text = `🔔 <b>新通知：燒肉/火鍋祭合作報名 (待審核)</b>\n\n場次：${FESTIVAL_LABEL[insertPayload.festival_type] || insertPayload.festival_type}\n品牌：${insertPayload.brand_name}\n公司：${insertPayload.company_name} (統編 ${insertPayload.tax_id})\n負責人：${insertPayload.representative}\n專案聯絡人：${insertPayload.project_contact} / ${insertPayload.project_contact_phone}\nEmail：${insertPayload.contact_email}\n方案：${planLabel}\n簽署人：${insertPayload.signer_name}\n同意時間：${insertPayload.agreed_at}`
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
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
