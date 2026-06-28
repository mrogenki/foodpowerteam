import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1"
import CryptoJS from "https://esm.sh/crypto-js@4.2.0"

declare const Deno: { env: { get(key: string): string | undefined } }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// 藍新信用卡 API（正式環境）
// Close：請款/退款（CloseType 1/2）— 用於「已請款」交易退款
// Cancel：取消授權 — 用於「授權成功但尚未請款」交易（款項從未真正扣，直接放棄授權）
const CLOSE_URL = 'https://core.newebpay.com/API/CreditCard/Close'
const CANCEL_URL = 'https://core.newebpay.com/API/CreditCard/Cancel'
const MERCHANT_ID = Deno.env.get('NEWEB_MERCHANT_ID') || 'BVS00509918'

// 與付款表單相同的 AES-256-CBC 加密（HashKey utf8 當 key、HashIV utf8 當 iv，輸出 hex 大寫）
const encrypt = (data: string, hashKey: string, hashIV: string): string => {
  const key = CryptoJS.enc.Utf8.parse(hashKey)
  const iv = CryptoJS.enc.Utf8.parse(hashIV)
  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase()
}

// 對應前端送單的來源表
type Source = 'registration' | 'application' | 'renewal'
const TABLE_BY_SOURCE: Record<Source, string> = {
  registration: 'registrations',
  application: 'member_applications',
  renewal: 'member_renewals',
}

const SYSTEM_OWNERS = ['mr.ogenki@gmail.com']

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const HashKey = Deno.env.get('NEWEB_HASH_KEY')
    const HashIV = Deno.env.get('NEWEB_HASH_IV')
    const SupabaseUrl = Deno.env.get('SUPABASE_URL')
    const ServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
    const AnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ServiceKey
    if (!HashKey || !HashIV || !SupabaseUrl || !ServiceKey) throw new Error('Missing env variables')

    // ── 1. 驗證呼叫者為 SUPER_ADMIN（伺服端強制，前端隱藏只是 UX）──
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader) return json({ status: 'error', error: 'unauthorized' }, 401)

    const userClient = createClient(SupabaseUrl, AnonKey!, { global: { headers: { Authorization: authHeader } } })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    const email = userData?.user?.email
    if (userErr || !email) return json({ status: 'error', error: 'unauthorized' }, 401)

    const supabase = createClient(SupabaseUrl, ServiceKey)

    let isSuperAdmin = SYSTEM_OWNERS.some((o) => o.toLowerCase() === email.toLowerCase())
    if (!isSuperAdmin) {
      const { data: adminRow } = await supabase.from('admins').select('role').ilike('email', email).single()
      isSuperAdmin = adminRow?.role === 'SUPER_ADMIN'
    }
    if (!isSuperAdmin) return json({ status: 'error', error: 'forbidden', message: '僅總管理員可執行刷退' }, 403)

    // ── 2. 解析輸入並取出訂單 ──
    const { order_no, source } = await req.json() as { order_no?: string; source?: Source }
    if (!order_no || !source || !TABLE_BY_SOURCE[source]) {
      return json({ status: 'error', error: 'order_no 與 source 為必填' }, 400)
    }
    const table = TABLE_BY_SOURCE[source]

    const { data: rec, error: recErr } = await supabase
      .from(table)
      .select('*')
      .eq('merchant_order_no', order_no)
      .single()
    if (recErr || !rec) return json({ status: 'error', error: 'order_not_found' }, 404)

    if (rec.payment_status !== 'paid') {
      return json({ status: 'error', error: 'not_paid', message: '此訂單非「已付款」狀態，無法刷退' }, 409)
    }

    const amount = Number(rec.paid_amount ?? rec.amount ?? 0)
    if (!amount || amount <= 0) {
      return json({ status: 'error', error: 'no_amount', message: '查無有效金額' }, 409)
    }

    // 只有信用卡能用 API 刷退；ATM/其他需人工匯款
    const payMethod = String(rec.payment_method || '').toUpperCase()
    const isCredit = payMethod.includes('CREDIT')
    if (!isCredit) {
      return json({
        status: 'error',
        error: 'not_credit_card',
        message: `付款方式為 ${rec.payment_method || '未知'}，藍新無法 API 刷退，請至銀行人工匯款後再手動標記已退費`,
      }, 422)
    }

    // ── 3. 呼叫藍新：先試「退款」(Close)，未請款時自動改「取消授權」(Cancel) ──
    const callNewebPay = async (kind: 'refund' | 'cancel_auth') => {
      const params = new URLSearchParams()
      params.append('RespondType', 'JSON')
      params.append('Amt', String(amount))
      params.append('MerchantOrderNo', order_no)
      params.append('TimeStamp', Math.floor(Date.now() / 1000).toString())
      params.append('IndexType', '1') // 1 = 以商店訂單編號查詢
      let url: string
      if (kind === 'refund') {
        params.append('Version', '1.1')
        params.append('CloseType', '2') // 2 = 退款（已請款交易）
        url = CLOSE_URL
      } else {
        params.append('Version', '1.0')
        url = CANCEL_URL // 取消授權（尚未請款交易，款項從未扣款）
      }

      const postData = encrypt(params.toString(), HashKey, HashIV)
      const form = new URLSearchParams()
      form.append('MerchantID_', MERCHANT_ID)
      form.append('PostData_', postData)

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // 藍新 API 前置 Akamai WAF 會擋掉無 User-Agent 的請求
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
        },
        body: form.toString(),
      })
      const raw = await resp.text()
      let parsed: any
      try { parsed = JSON.parse(raw) } catch { parsed = { Status: 'PARSE_ERROR', Message: raw.slice(0, 300) } }
      console.log(`[Refund] ${order_no} ${kind} ->`, JSON.stringify(parsed))
      return parsed
    }

    let mode: 'refund' | 'cancel_auth' = 'refund'
    let api = await callNewebPay('refund')
    if (api?.Status !== 'SUCCESS') {
      // 退款失敗（多半因尚未請款）→ 改走取消授權
      console.log(`[Refund] ${order_no} refund failed (${api?.Status}: ${api?.Message}), retry cancel_auth`)
      const cancelApi = await callNewebPay('cancel_auth')
      if (cancelApi?.Status === 'SUCCESS') {
        mode = 'cancel_auth'
        api = cancelApi
      } else {
        return json({
          status: 'error',
          error: 'newebpay_failed',
          message: `藍新刷退失敗。退款：${api?.Status}/${api?.Message}；取消授權：${cancelApi?.Status}/${cancelApi?.Message}`,
        }, 502)
      }
    }

    // ── 4. 藍新成功 → 更新 DB（標記已退費）──
    const tradeNo = api?.Result?.TradeNo || null
    const refundedAtISO = new Date().toISOString()
    let pointsReturned = 0

    if (source === 'renewal') {
      // 續費：用 RPC 標記退費並縮回會籍（−1 年）
      const { error: rpcErr } = await supabase.rpc('handle_renewal_refund', {
        p_order_no: order_no,
        p_refund_amount: amount,
        p_refund_trade_no: tradeNo,
      })
      if (rpcErr) console.error('[Refund] handle_renewal_refund error:', rpcErr)
    } else {
      const { error: updErr } = await supabase
        .from(table)
        .update({
          payment_status: 'refunded',
          refunded_at: refundedAtISO,
          refund_amount: amount,
          refund_trade_no: tradeNo,
        })
        .eq('merchant_order_no', order_no)
      if (updErr) console.error(`[Refund] ${table} update error:`, updErr)

      // 活動報名：若有用點數折抵（已核銷 redeemed），回補點數（RPC 冪等）
      if (source === 'registration') {
        const { data: ptData, error: ptErr } = await supabase.rpc('points_refund_redeemed', { p_order_no: order_no })
        if (ptErr) console.error('[Refund] points_refund_redeemed error:', ptErr)
        else if (ptData?.points) pointsReturned = Number(ptData.points) || 0
      }
    }

    // ── 4a2. 退款 → 刪除連動的收入財務記錄（活動/入會/續費）──
    let incomeDeleted = false
    {
      const { data: finRows, error: finErr } = await supabase
        .from('financial_records')
        .delete()
        .eq('order_no', order_no)
        .select('id')
      if (finErr) console.error('[Refund] delete financial_records error:', finErr)
      else if (finRows && finRows.length > 0) incomeDeleted = true
    }

    // ── 4b. 作廢對應收據（若有開立）──
    let receiptCancelled = false
    {
      const { data: rcRows, error: rcErr } = await supabase
        .from('receipts')
        .update({ status: 'cancelled', cancelled_at: refundedAtISO })
        .eq('order_no', order_no)
        .neq('status', 'cancelled')
        .select('receipt_no')
      if (rcErr) console.error('[Refund] cancel receipt error:', rcErr)
      else if (rcRows && rcRows.length > 0) receiptCancelled = true
    }

    // ── 5. Telegram 通知 ──
    try {
      const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
      const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
      if (token && chatId) {
        const sourceLabel = source === 'registration' ? '活動報名' : source === 'application' ? '入會申請' : '會員續費'
        const modeLabel = mode === 'refund' ? '退款（已請款交易）' : '取消授權（未請款交易）'
        const who = rec.name || rec.member_name || rec.contact_name || rec.email || ''
        const pointsNote = pointsReturned > 0 ? `\n已回補點數：${pointsReturned} 點` : ''
        const receiptNote = receiptCancelled ? '\n收據：已自動作廢' : ''
        const incomeNote = incomeDeleted ? '\n收支管理：已刪除活動收入' : ''
        const text = `💸 <b>新通知：藍新刷退成功（${sourceLabel}）</b>\n\n對象：${who}\n訂單：${order_no}\n金額：NT$ ${amount.toLocaleString()}\n方式：${modeLabel}\n藍新交易序號：${tradeNo || '—'}${pointsNote}${receiptNote}${incomeNote}\n操作者：${email}${source === 'renewal' ? '\n\n※ 已自動縮回會籍 1 年，請確認會員到期日。' : ''}`
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        })
      }
    } catch (e) {
      console.error('[Refund] telegram error:', e)
    }

    return json({ status: 'success', mode, amount, trade_no: tradeNo, points_returned: pointsReturned, receipt_cancelled: receiptCancelled, income_deleted: incomeDeleted, message: api?.Message })
  } catch (e) {
    console.error('[Refund] error:', e)
    return json({ status: 'error', error: (e as Error).message }, 500)
  }
})
