import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1"

declare const Deno: { env: { get(key: string): string | undefined } }

const SITE = 'https://www.foodpowerteam.com'

// 排程呼叫：逾時未付款 → 取消前寄「繳費提醒」、取消時寄「報名已取消」，接龍與一般報名皆適用。
// 自主收款（payment_mode=self）不處理（釋位由人工操作）。
serve(async (req) => {
  // 僅允許帶正確 x-cron-secret 的呼叫（cron 以 pg_net 帶入）
  const secret = Deno.env.get('CRON_SECRET')
  if (secret && req.headers.get('x-cron-secret') !== secret) {
    return new Response('forbidden', { status: 403 })
  }

  const SupabaseUrl = Deno.env.get('SUPABASE_URL')!
  const ServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const sb = createClient(SupabaseUrl, ServiceKey)

  const fmtDeadline = (createdAt: string, hours: number) => {
    const d = new Date(new Date(createdAt).getTime() + hours * 3600 * 1000)
    return d.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const sendEmail = async (template: string, params: Record<string, unknown>) => {
    if (!params.to_email) return
    try {
      await fetch(`${SupabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ServiceKey}`, 'apikey': ServiceKey },
        body: JSON.stringify({ template, params }),
      })
    } catch (e) { console.error('[release-expired] email error', template, e) }
  }

  const summary = { cancelled: 0, reminded: 0, activities: 0 }

  // 只處理：線上收款 + 有設逾時時數 + 活動日期尚未過（避免對已結束活動的舊報名寄取消信）
  const todayTPE = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }) // YYYY-MM-DD
  const { data: acts } = await sb.from('activities')
    .select('id,title,date,time,location,payment_deadline_hours,payment_mode')
    .not('payment_deadline_hours', 'is', null)
    .eq('payment_mode', 'online')
    .gte('date', todayTPE)

  for (const a of (acts || [])) {
    const H = Number(a.payment_deadline_hours)
    if (!H || H <= 0) continue
    summary.activities++
    const lead = Math.max(1, Math.round(H * 0.3))
    const nowMs = Date.now()
    const cutoffCancel = new Date(nowMs - H * 3600 * 1000).toISOString()        // created_at 早於此 → 逾時
    const cutoffRemind = new Date(nowMs - (H - lead) * 3600 * 1000).toISOString() // created_at 早於此 → 進入提醒窗
    const meta = { activity_title: a.title, activity_date: a.date, activity_time: a.time, activity_location: a.location }

    // ── 取消：接龍正取逾時未付 ──
    const { data: expEntries } = await sb.from('signup_entries')
      .select('id,name,email,activity_id').eq('activity_id', a.id)
      .eq('status', 'confirmed').eq('payment_status', 'unpaid').lt('created_at', cutoffCancel)
    for (const e of (expEntries || [])) {
      await sendEmail('registration_cancelled', { to_name: e.name, to_email: e.email, ...meta })
      await sb.from('signup_entries').delete().eq('id', e.id)
      summary.cancelled++
    }

    // ── 取消：一般報名逾時未付（先退凍結點數） ──
    const { data: expRegs } = await sb.from('registrations')
      .select('id,name,email,merchant_order_no,points_status').eq('activityId', a.id)
      .eq('payment_status', 'pending').lt('created_at', cutoffCancel)
    for (const r of (expRegs || [])) {
      await sendEmail('registration_cancelled', { to_name: r.name, to_email: r.email, ...meta })
      if (r.points_status === 'frozen' && r.merchant_order_no) {
        try { await sb.rpc('points_refund', { p_order_no: r.merchant_order_no }) } catch (_) { /* ignore */ }
      }
      await sb.from('registrations').delete().eq('id', r.id)
      summary.cancelled++
    }

    // 釋位後遞補候補
    try { await sb.rpc('signup_fill', { p_activity_id: a.id }) } catch (_) { /* ignore */ }

    // ── 提醒：接龍正取，進入提醒窗、尚未提醒、尚未逾時 ──
    const { data: remEntries } = await sb.from('signup_entries')
      .select('id,name,email,fee_amount,cancel_token,created_at').eq('activity_id', a.id)
      .eq('status', 'confirmed').eq('payment_status', 'unpaid')
      .is('reminder_sent_at', null).lt('created_at', cutoffRemind).gte('created_at', cutoffCancel)
    for (const e of (remEntries || [])) {
      await sendEmail('payment_reminder', {
        to_name: e.name, to_email: e.email, ...meta, fee: e.fee_amount,
        pay_link: `${SITE}/pay-signup/${e.id}?token=${e.cancel_token}`,
        deadline_text: fmtDeadline(e.created_at, H),
      })
      await sb.from('signup_entries').update({ reminder_sent_at: new Date().toISOString() }).eq('id', e.id)
      summary.reminded++
    }

    // ── 提醒：一般報名 ──
    const { data: remRegs } = await sb.from('registrations')
      .select('id,name,email,paid_amount,created_at').eq('activityId', a.id)
      .eq('payment_status', 'pending')
      .is('reminder_sent_at', null).lt('created_at', cutoffRemind).gte('created_at', cutoffCancel)
    for (const r of (remRegs || [])) {
      await sendEmail('payment_reminder', {
        to_name: r.name, to_email: r.email, ...meta, fee: r.paid_amount,
        pay_link: `${SITE}/pay-activity/${r.id}`,
        deadline_text: fmtDeadline(r.created_at, H),
      })
      await sb.from('registrations').update({ reminder_sent_at: new Date().toISOString() }).eq('id', r.id)
      summary.reminded++
    }
  }

  return new Response(JSON.stringify({ ok: true, ...summary }), { headers: { 'Content-Type': 'application/json' } })
})
