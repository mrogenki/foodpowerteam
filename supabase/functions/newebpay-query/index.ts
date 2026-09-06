import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1"
import CryptoJS from "https://esm.sh/crypto-js@4.2.0"

declare const Deno: { env: { get(key: string): string | undefined } }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// 藍新查詢交易 API（正式環境）
const QUERY_URL = 'https://core.newebpay.com/API/QueryTradeInfo'
const MERCHANT_ID = Deno.env.get('NEWEB_MERCHANT_ID') || 'BVS00509918'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const { order_no } = await req.json()
    if (!order_no) return json({ status: 'error', error: 'order_no required' }, 400)

    const HashKey = Deno.env.get('NEWEB_HASH_KEY')
    const HashIV = Deno.env.get('NEWEB_HASH_IV')
    const SupabaseUrl = Deno.env.get('SUPABASE_URL')
    const SupabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
    if (!HashKey || !HashIV || !SupabaseUrl || !SupabaseKey) throw new Error('Missing env variables')

    const supabase = createClient(SupabaseUrl, SupabaseKey)

    // 1. 先查 DB 目前狀態與「應付金額」（查詢藍新需要 Amt）
    const { data: statusRows, error: statusErr } = await supabase.rpc('check_payment_status', { order_no })
    if (statusErr) throw statusErr

    if (!statusRows || statusRows.length === 0) {
      return json({ status: 'not_found' })
    }

    const row = statusRows[0]
    const dbStatus = row.res_status as string
    const amount = Number(row.res_amount)

    // 已是已付款 → 直接回報，不需打藍新
    if (dbStatus === 'paid') {
      return json({ status: 'paid', source: 'db' })
    }

    if (!amount || amount <= 0) {
      // 無金額無法組 CheckValue（例如免費單）；回報目前 DB 狀態
      return json({ status: dbStatus === 'paid' ? 'paid' : 'pending', source: 'db' })
    }

    // 2. 組 CheckValue 並查詢藍新
    // CheckValue = SHA256(IV={HashIV}&Amt={Amt}&MerchantID={MID}&MerchantOrderNo={No}&Key={HashKey}) 大寫
    const checkStr = `IV=${HashIV}&Amt=${amount}&MerchantID=${MERCHANT_ID}&MerchantOrderNo=${order_no}&Key=${HashKey}`
    const checkValue = CryptoJS.SHA256(checkStr).toString(CryptoJS.enc.Hex).toUpperCase()

    const form = new URLSearchParams()
    form.append('MerchantID', MERCHANT_ID)
    form.append('Version', '1.3')
    form.append('RespondType', 'JSON')
    form.append('CheckValue', checkValue)
    form.append('MerchantOrderNo', order_no)
    form.append('Amt', String(amount))
    form.append('TimeStamp', Math.floor(Date.now() / 1000).toString())

    const resp = await fetch(QUERY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // 藍新 API 前置 Akamai WAF 會擋掉無 User-Agent 的請求，需帶瀏覽器 UA
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
      body: form.toString(),
    })
    const rawText = await resp.text()
    let queryData: any
    try {
      queryData = JSON.parse(rawText)
    } catch {
      console.error(`[Query] Non-JSON response for ${order_no}:`, rawText.slice(0, 500))
      return json({ status: 'error', error: 'newebpay_non_json', raw: rawText.slice(0, 500) }, 502)
    }
    console.log(`[Query] ${order_no} ->`, JSON.stringify(queryData))

    const result = queryData?.Result
    const tradeStatus = result?.TradeStatus // '1'=已付款 '0'=未付款 '2'=付款失敗 '3'=取消 '6'=退款

    if (queryData?.Status !== 'SUCCESS' || !result) {
      return json({ status: 'pending', source: 'newebpay', raw: queryData?.Status })
    }

    if (tradeStatus === '1') {
      // 3. 藍新確認已付款 → 補寫 DB（冪等）
      const paidAmt = Number(result.Amt) || amount
      const payMethod = result.PaymentType || 'CREDIT'
      const { data: confirmType, error: confirmErr } = await supabase.rpc('confirm_payment_paid', {
        p_order_no: order_no,
        p_amount: paidAmt,
        p_pay_method: payMethod,
      })
      if (confirmErr) console.error('[Query] confirm_payment_paid error:', confirmErr)

      // 後備路徑補齊 notify 的副作用：開線上收據 + 寄連結 + 記收入（RPC 冪等，與 notify 不衝突）
      if (confirmType) {
        const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.foodpowerteam.com'
        // 透過 send-email Edge Function（Resend）寄信
        const sendEmail = async (template: string, params: any) => {
          try {
            await fetch(`${SupabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SupabaseKey}`, 'apikey': SupabaseKey as string },
              body: JSON.stringify({ template, params }),
            })
          } catch (e) { console.error('[Query] email error:', e) }
        }
        try {
          const { data: rcpt, error: rErr } = await supabase.rpc('issue_receipt_for_order', { p_order_no: order_no, p_source: confirmType })
          if (rErr) console.error('[Query] issue_receipt_for_order error:', rErr)
          else if (rcpt?.ok && !rcpt.already && rcpt.email) {
            await sendEmail('receipt', {
              to_email: rcpt.email, to_name: rcpt.payer_name, order_id: rcpt.receipt_no, amount: rcpt.amount, receipt_link: `${SITE_URL}/receipt/${rcpt.token}`,
            })
            await supabase.from('receipts').update({ status: 'sent' }).eq('receipt_no', rcpt.receipt_no)
            console.log('[Query] receipt issued & sent (fallback):', rcpt.receipt_no)
          }
        } catch (e) { console.error('[Query] issue_receipt exception:', e) }
        try {
          const { error: finErr } = await supabase.rpc('add_income_for_order', { p_order_no: order_no, p_source: confirmType })
          if (finErr) console.error('[Query] add_income_for_order error:', finErr)
        } catch (e) { console.error('[Query] add_income exception:', e) }
      }

      // 通知管理員此單為「返回頁補確認」（NotifyURL 可能漏接）
      try {
        const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
        const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
        if (token && chatId && confirmType) {
          const text = `🔔 <b>新通知：付款補確認（返回頁觸發）</b>\n\n訂單：${order_no}\n類型：${confirmType}\n金額：NT$ ${paidAmt.toLocaleString()}\n付款方式：${payMethod}\n\n※ 此單由返回頁主動向藍新查詢確認，請留意 NotifyURL 是否漏接。`
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
          })
        }
      } catch (e) {
        console.error('[Query] telegram error:', e)
      }

      return json({ status: 'paid', source: 'newebpay', type: confirmType })
    }

    if (tradeStatus === '2' || tradeStatus === '3') {
      return json({ status: 'failed', source: 'newebpay' })
    }

    return json({ status: 'pending', source: 'newebpay' })
  } catch (e) {
    console.error('[Query] error:', e)
    return json({ status: 'error', error: (e as Error).message }, 500)
  }
})
