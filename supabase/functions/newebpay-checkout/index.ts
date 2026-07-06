// 藍新結帳簽章（伺服端）：HashKey/HashIV 只存在 Supabase secret，前端不再持有金鑰。
// 與 newebpay-notify 使用同一組 crypto（AES-256-CBC hex 大寫 + SHA256）。
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import CryptoJS from "https://esm.sh/crypto-js@4.2.0"

declare const Deno: { env: { get(key: string): string | undefined } }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY = 'https://core.newebpay.com/MPG/mpg_gateway'
const VERSION = '2.0'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const MerchantID = Deno.env.get('NEWEB_MERCHANT_ID') || 'BVS00509918'
    const HashKey = Deno.env.get('NEWEB_HASH_KEY')
    const HashIV = Deno.env.get('NEWEB_HASH_IV')
    const SupabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!HashKey || !HashIV || !SupabaseUrl) {
      return json({ error: 'server_misconfigured' }, 500)
    }

    const body = await req.json().catch(() => ({}))
    const MerchantOrderNo = String(body.MerchantOrderNo ?? '').trim()
    const Amt = Math.trunc(Number(body.Amt))
    const ItemDesc = String(body.ItemDesc ?? '').slice(0, 50)
    const Email = String(body.Email ?? '')
    const origin = String(body.origin ?? '')

    if (!MerchantOrderNo || !Number.isFinite(Amt) || Amt <= 0) {
      return json({ error: 'invalid_params' }, 400)
    }

    const params = new URLSearchParams()
    params.append('MerchantID', MerchantID)
    params.append('RespondType', 'JSON')
    params.append('TimeStamp', Math.floor(Date.now() / 1000).toString())
    params.append('Version', VERSION)
    params.append('MerchantOrderNo', MerchantOrderNo)
    params.append('Amt', String(Amt))
    params.append('ItemDesc', ItemDesc)
    params.append('Email', Email)
    params.append('LoginType', '0')
    params.append('CREDIT', '1')
    params.append('VACC', '1')
    // 只接受本站來源，避免被拿去當任意導轉
    if (/^https?:\/\//.test(origin)) {
      params.append('ClientBackURL', `${origin}/payment-result?order_no=${MerchantOrderNo}`)
    }
    params.append('NotifyURL', `${SupabaseUrl}/functions/v1/newebpay-notify`)

    const key = CryptoJS.enc.Utf8.parse(HashKey)
    const iv = CryptoJS.enc.Utf8.parse(HashIV)
    const encrypted = CryptoJS.AES.encrypt(params.toString(), key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    })
    const TradeInfo = encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase()
    const TradeSha = CryptoJS.SHA256(`HashKey=${HashKey}&${TradeInfo}&HashIV=${HashIV}`)
      .toString(CryptoJS.enc.Hex)
      .toUpperCase()

    return json({
      action: GATEWAY,
      fields: { MerchantID, TradeInfo, TradeSha, Version: VERSION },
    })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
