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

  const summary = { cancelled: 0, reminded: 0, apps_reminded: 0, activities: 0 }
  const REMIND_AFTER_MS = 24 * 3600 * 1000 // 報名/申請後 24 小時提醒
  const nowMs = Date.now()
  const reminderCutoff = new Date(nowMs - REMIND_AFTER_MS).toISOString() // created_at 早於此＝已滿 24h

  // 線上收款 + 活動日期尚未過（有無截止都處理：有截止→到時取消；提醒一律報名後 24h）
  const todayTPE = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }) // YYYY-MM-DD
  const { data: acts } = await sb.from('activities')
    .select('id,title,date,time,location,payment_deadline,payment_mode')
    .eq('payment_mode', 'online')
    .gte('date', todayTPE)

  for (const a of (acts || [])) {
    summary.activities++
    const deadlineMs = a.payment_deadline ? new Date(a.payment_deadline).getTime() : null
    const deadlineText = deadlineMs ? new Date(deadlineMs).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
    const meta = { activity_title: a.title, activity_date: a.date, activity_time: a.time, activity_location: a.location }

    // ── 逾時取消（有設截止且已超過）──
    if (deadlineMs && nowMs >= deadlineMs) {
      const { data: expEntries } = await sb.from('signup_entries')
        .select('id,name,email').eq('activity_id', a.id)
        .eq('status', 'confirmed').eq('payment_status', 'unpaid')
      for (const e of (expEntries || [])) {
        await sendEmail('registration_cancelled', { to_name: e.name, to_email: e.email, ...meta })
        await sb.from('signup_entries').delete().eq('id', e.id)
        summary.cancelled++
      }
      const { data: expRegs } = await sb.from('registrations')
        .select('id,name,email,merchant_order_no,points_status').eq('activityId', a.id)
        .eq('payment_status', 'pending')
      for (const r of (expRegs || [])) {
        await sendEmail('registration_cancelled', { to_name: r.name, to_email: r.email, ...meta })
        if (r.points_status === 'frozen' && r.merchant_order_no) {
          try { await sb.rpc('points_refund', { p_order_no: r.merchant_order_no }) } catch (_) { /* ignore */ }
        }
        await sb.from('registrations').delete().eq('id', r.id)
        summary.cancelled++
      }
      try { await sb.rpc('signup_fill', { p_activity_id: a.id }) } catch (_) { /* ignore */ }
      continue // 已截止就不再寄提醒
    }

    // ── 繳費提醒（報名後滿 24h、尚未提醒、尚未付款）──
    const { data: remEntries } = await sb.from('signup_entries')
      .select('id,name,email,fee_amount,cancel_token').eq('activity_id', a.id)
      .eq('status', 'confirmed').eq('payment_status', 'unpaid')
      .is('reminder_sent_at', null).lt('created_at', reminderCutoff)
    for (const e of (remEntries || [])) {
      await sendEmail('payment_reminder', {
        to_name: e.name, to_email: e.email, ...meta, fee: e.fee_amount,
        pay_link: `${SITE}/pay-signup/${e.id}?token=${e.cancel_token}`, deadline_text: deadlineText,
      })
      await sb.from('signup_entries').update({ reminder_sent_at: new Date().toISOString() }).eq('id', e.id)
      summary.reminded++
    }
    const { data: remRegs } = await sb.from('registrations')
      .select('id,name,email,paid_amount').eq('activityId', a.id)
      .eq('payment_status', 'pending')
      .is('reminder_sent_at', null).lt('created_at', reminderCutoff)
    for (const r of (remRegs || [])) {
      await sendEmail('payment_reminder', {
        to_name: r.name, to_email: r.email, ...meta, fee: r.paid_amount,
        pay_link: `${SITE}/pay-activity/${r.id}`, deadline_text: deadlineText,
      })
      await sb.from('registrations').update({ reminder_sent_at: new Date().toISOString() }).eq('id', r.id)
      summary.reminded++
    }
  }

  // ── 新會員申請：入會費逾 24h 未繳 → 提醒一次 ──
  const { data: apps } = await sb.from('member_applications')
    .select('id,name,email,paid_amount')
    .eq('payment_status', 'pending')
    .is('reminder_sent_at', null).lt('created_at', reminderCutoff)
  for (const ap of (apps || [])) {
    await sendEmail('application_payment_reminder', {
      to_name: ap.name, to_email: ap.email, fee: ap.paid_amount || 5000,
      pay_link: `${SITE}/pay-application/${ap.id}`,
    })
    await sb.from('member_applications').update({ reminder_sent_at: new Date().toISOString() }).eq('id', ap.id)
    summary.apps_reminded++
  }

  return new Response(JSON.stringify({ ok: true, ...summary }), { headers: { 'Content-Type': 'application/json' } })
})
