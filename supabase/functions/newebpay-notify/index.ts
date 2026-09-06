
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1"
import CryptoJS from "https://esm.sh/crypto-js@4.2.0"

// Declare Deno for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 藍新查詢交易 API（正式環境）
const QUERY_URL = 'https://core.newebpay.com/API/QueryTradeInfo'
// 藍新 API 前置 Akamai WAF 會擋掉無 User-Agent 的請求
const QUERY_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// 不信任 callback：向藍新官方反查該訂單是否真的已付款（TradeStatus=1），確認後才認定已付。
// HashKey/HashIV 由平台商控管無法輪換，此為阻擋「以外洩金鑰偽造付款成功通知」的核心防線。
// 回傳 { ok, amount, payMethod, reason }。
async function verifyPaidWithNewebPay(
  orderNo: string,
  HashKey: string,
  HashIV: string,
  supabase: any
): Promise<{ ok: boolean; amount?: number; payMethod?: string | null; reason?: string }> {
  try {
    const MERCHANT_ID = Deno.env.get('NEWEB_MERCHANT_ID') || 'BVS00509918'
    const { data: statusRows, error } = await supabase.rpc('check_payment_status', { order_no: orderNo })
    if (error) return { ok: false, reason: 'db_error:' + error.message }
    if (!statusRows || statusRows.length === 0) return { ok: false, reason: 'order_not_found' }

    const row = statusRows[0]
    // 已是已付款（藍新重送通知或先前已確認）→ 冪等放行
    if (row.res_status === 'paid') return { ok: true, amount: Number(row.res_amount) || 0, payMethod: null }

    const amount = Number(row.res_amount)
    if (!amount || amount <= 0) return { ok: false, reason: 'no_amount' }

    // CheckValue = SHA256(IV=..&Amt=..&MerchantID=..&MerchantOrderNo=..&Key=..) 大寫
    const checkStr = `IV=${HashIV}&Amt=${amount}&MerchantID=${MERCHANT_ID}&MerchantOrderNo=${orderNo}&Key=${HashKey}`
    const checkValue = CryptoJS.SHA256(checkStr).toString(CryptoJS.enc.Hex).toUpperCase()

    const form = new URLSearchParams()
    form.append('MerchantID', MERCHANT_ID)
    form.append('Version', '1.3')
    form.append('RespondType', 'JSON')
    form.append('CheckValue', checkValue)
    form.append('MerchantOrderNo', orderNo)
    form.append('Amt', String(amount))
    form.append('TimeStamp', Math.floor(Date.now() / 1000).toString())

    const resp = await fetch(QUERY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': QUERY_UA,
        'Accept': 'application/json, text/plain, */*',
      },
      body: form.toString(),
    })
    const rawText = await resp.text()
    let q: any
    try {
      q = JSON.parse(rawText)
    } catch {
      console.error(`[Notify] 反查回應非 JSON (${orderNo}):`, rawText.slice(0, 300))
      return { ok: false, reason: 'newebpay_non_json' }
    }
    const r = q?.Result
    if (q?.Status !== 'SUCCESS' || !r) return { ok: false, reason: 'query_status_' + (q?.Status || 'none') }
    // TradeStatus: '1'=已付款
    if (r.TradeStatus === '1') return { ok: true, amount: Number(r.Amt) || amount, payMethod: r.PaymentType }
    return { ok: false, reason: 'trade_status_' + r.TradeStatus }
  } catch (e) {
    return { ok: false, reason: 'exception:' + ((e as Error)?.message || e) }
  }
}

// 反查未通過時通知管理員（可能為藍新延遲或偽造通知），請人工核對，不自動放行。
async function alertAdminUnverified(orderNo: string, reason: string) {
  try {
    const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
    if (!token || !chatId) return
    const text = `⚠️ <b>付款通知未通過反查，未標記已付</b>\n\n訂單：${orderNo}\n原因：${reason}\n\n※ 收到「付款成功」通知，但向藍新官方反查未獲「已付款」確認。可能為藍新延遲或偽造通知；請人工至藍新後台核對後再處理，切勿直接放行。`
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch (_) {
    /* 靜默 */
  }
}

// --- Main Handler ---
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("[Notify] Received request");
    
    // 1. Parse Form Data
    const formData = await req.formData()
    const TradeInfo = formData.get('TradeInfo') as string
    
    if (!TradeInfo) {
      console.error('[Notify] Error: No TradeInfo received')
      return new Response('No TradeInfo', { status: 400 })
    }

    // 2. Get Secrets & Init DB
    const HashKey = Deno.env.get('NEWEB_HASH_KEY')
    const HashIV = Deno.env.get('NEWEB_HASH_IV')
    const SupabaseUrl = Deno.env.get('SUPABASE_URL')
    
    // Fallback: Try Service Key first, then Anon Key (Works if RLS is disabled)
    // 這裡做了權限救援：如果 Service Role Key 沒設定好，會嘗試用 Anon Key
    const SupabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!HashKey || !HashIV || !SupabaseUrl || !SupabaseKey) {
      console.error('[Notify] Error: Missing env variables (Check NEWEB_HASH_KEY, NEWEB_HASH_IV, SUPABASE_URL)')
      throw new Error('Missing environment variables')
    }

    // 3. Decrypt TradeInfo
    try {
        const key = CryptoJS.enc.Utf8.parse(HashKey)
        const iv = CryptoJS.enc.Utf8.parse(HashIV)
        
        // Hex -> Base64 -> Decrypt
        // 藍新回傳的是 Hex 字串，必須先轉為 Base64 才能讓 CryptoJS 解密
        const encryptedHex = CryptoJS.enc.Hex.parse(TradeInfo)
        const encryptedBase64 = CryptoJS.enc.Base64.stringify(encryptedHex)

        const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        })
        
        const rawDecryptedText = decrypted.toString(CryptoJS.enc.Utf8)
        
        if (!rawDecryptedText) {
          throw new Error('Decrypted string is empty')
        }

        // 4. Clean String (CRITICAL STEP - 重點修正)
        // 移除所有隱藏的控制字元 (0x00-0x1F)，這些字元會導致 JSON.parse 崩潰 (500 Error 的主因)
        const cleanJsonString = rawDecryptedText.replace(/[\x00-\x1F\x7F]/g, '');

        // 5. Parse JSON
        let paymentData;
        try {
            paymentData = JSON.parse(cleanJsonString)
        } catch (e) {
            console.error('[Notify] JSON Parse Failed. Raw:', rawDecryptedText);
            throw new Error('JSON Parse error: ' + e.message);
        }

        console.log(`[Notify] Decoded Order: ${paymentData.Result?.MerchantOrderNo}, Status: ${paymentData.Status}`)

        // 6. Process Payment
        if (paymentData.Status === 'SUCCESS') {
          const result = paymentData.Result
          const merchantOrderNo = result.MerchantOrderNo
          const payTime = result.PayTime

          // Init Supabase
          const supabase = createClient(SupabaseUrl, SupabaseKey)

          // === 安全防線：不信任 callback，向藍新官方反查真實付款狀態，確認後才認定已付 ===
          // 阻擋以外洩金鑰偽造的假「付款成功」通知（金鑰由平台商控管無法輪換）
          const verified = await verifyPaidWithNewebPay(merchantOrderNo, HashKey, HashIV, supabase)
          if (!verified.ok) {
            console.warn(`[Notify] 反查未確認，拒絕標記已付: ${merchantOrderNo} (${verified.reason})`)
            await alertAdminUnverified(merchantOrderNo, verified.reason || 'unknown')
            return new Response('OK (unverified)', { status: 200, headers: corsHeaders })
          }
          // 一律採用藍新反查回報的真實金額/付款方式，而非 callback 帶入值
          const amount = verified.amount
          const paymentMethod = verified.payMethod || result.PaymentType

          // Defensive Date Parsing (防止日期格式錯誤導致寫入失敗)
          // 藍新 PayTime 為台灣時間且無時區標記；在 UTC 環境(Deno)若直接解析會被當成 UTC，
          // 導致前端再 +8 顯示（晚 8 小時）。故補上 +08:00 解讀成正確 UTC instant。
          let paidAtISO = new Date().toISOString();
          if (payTime) {
              const normalized = String(payTime).trim().replace(' ', 'T');
              const hasTz = /([+-]\d{2}:?\d{2}|Z)$/.test(normalized);
              let parsedDate = new Date(hasTz ? normalized : normalized + '+08:00');
              if (isNaN(parsedDate.getTime())) parsedDate = new Date(payTime); // 退回原始解析
              if (!isNaN(parsedDate.getTime())) {
                  paidAtISO = parsedDate.toISOString();
              }
          }

          const updatePayload = {
            payment_status: 'paid',
            paid_amount: amount,
            paid_at: paidAtISO,
            merchant_order_no: merchantOrderNo,
            payment_method: paymentMethod
          }

          // Helper: Send Telegram Notification
          const sendTelegram = async (action: string, details: string) => {
            const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
            const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
            if (!token || !chatId) {
              console.warn('[Notify] Telegram env variables missing, skipping Telegram notification');
              return;
            }
            
            const message = `🔔 <b>新通知：${action}</b>\n\n${details}`;
            try {
              console.log(`[Notify] Sending Telegram notification for ${action}`);
              const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: message,
                  parse_mode: 'HTML'
                }),
              });
              if (!response.ok) {
                const errText = await response.text();
                console.error(`[Notify] Telegram sending failed with status ${response.status}:`, errText);
              } else {
                console.log(`[Notify] Telegram notification sent successfully`);
              }
            } catch (e) {
              console.error('[Notify] Telegram sending network/fetch error:', e);
            }
          };

          // Helper: 透過 send-email Edge Function（Resend）寄信。template=我方模板名稱，params=模板參數。
          const sendEmail = async (template: string, params: any) => {
            try {
              const response = await fetch(`${SupabaseUrl}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SupabaseKey}`,
                  'apikey': SupabaseKey as string,
                },
                body: JSON.stringify({ template, params }),
              });
              if (response.ok) {
                console.log(`[Notify] Email(${template}) sent to ${params.to_email || params.email}`);
              } else {
                const errText = await response.text();
                console.error(`[Notify] Email(${template}) failed status ${response.status}:`, errText);
              }
            } catch (e) {
              console.error('[Notify] Email sending network/fetch error:', e);
            }
          };

          // Helper: 自動開立線上收據並寄出連結（活動/入會/續費）。RPC 冪等，重複回呼安全。
          const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.foodpowerteam.com';
          const issueAndEmailReceipt = async (src: 'registration' | 'application' | 'renewal' | 'festival' | 'signup', orderNo: string) => {
            try {
              const { data: rcpt, error: rErr } = await supabase.rpc('issue_receipt_for_order', { p_order_no: orderNo, p_source: src });
              if (rErr) { console.error('[Notify] issue_receipt_for_order error:', rErr); return; }
              if (!rcpt?.ok) { console.warn('[Notify] issue_receipt skip:', rcpt?.reason); return; }
              if (rcpt.already) { console.log(`[Notify] receipt already exists for ${orderNo}`); return; }
              if (!rcpt.email) { console.warn(`[Notify] receipt has no email, skip send: ${orderNo}`); return; }
              const link = `${SITE_URL}/receipt/${rcpt.token}`;
              await sendEmail('receipt', {
                to_email: rcpt.email,
                to_name: rcpt.payer_name,
                order_id: rcpt.receipt_no,
                amount: rcpt.amount,
                receipt_link: link,
              });
              await supabase.from('receipts').update({ status: 'sent' }).eq('receipt_no', rcpt.receipt_no);
              console.log(`[Notify] receipt issued & sent: ${rcpt.receipt_no} -> ${rcpt.email}`);
            } catch (e) {
              console.error('[Notify] issueAndEmailReceipt exception:', e);
            }
          };

          // Helper: 各來源付款成功 → 新增收入到收支管理（RPC 冪等）
          const addIncome = async (src: 'registration' | 'application' | 'renewal' | 'festival' | 'signup', orderNo: string) => {
            try {
              const { error: finErr } = await supabase.rpc('add_income_for_order', { p_order_no: orderNo, p_source: src });
              if (finErr) console.error(`[Notify] add_income_for_order(${src}) error:`, finErr);
            } catch (e) {
              console.error(`[Notify] add_income_for_order(${src}) exception:`, e);
            }
          };

          // 6.-1 接龍報名 (獨立自助付款頁，訂單編號前綴 SIGNUP_)
          if (merchantOrderNo.startsWith('SIGNUP_')) {
            console.log(`[Notify] Attempting to update signup_entries via RPC for ${merchantOrderNo}`);
            const { error: signupError } = await supabase.rpc('handle_signup_payment', {
              p_order_no: merchantOrderNo,
              p_amount: amount,
              p_pay_time: paidAtISO,
              p_pay_method: paymentMethod
            })
            if (signupError) console.error(`[Notify] handle_signup_payment RPC error:`, signupError);

            const { data: sEntry } = await supabase
              .from('signup_entries').select('*').eq('merchant_order_no', merchantOrderNo).maybeSingle();

            if (sEntry) {
              console.log(`[Notify] Success! Updated Signup Entry: ${merchantOrderNo}`)
              let sTitle = '接龍報名確認', sDate = '', sTime = '', sLoc = '';
              if (sEntry.activity_id) {
                const { data: actData } = await supabase.from('activities').select('*').eq('id', sEntry.activity_id).single();
                if (actData) { sTitle = actData.title || sTitle; sDate = actData.date || ''; sTime = actData.time || ''; sLoc = actData.location || ''; }
              }
              try {
                await Promise.all([
                  sendEmail('paid_confirm', {
                    to_name: sEntry.name,
                    to_email: sEntry.email,
                    kind: '接龍報名',
                    activity_title: sTitle,
                    activity_date: sDate,
                    activity_time: sTime,
                    activity_location: sLoc,
                    amount: sEntry.paid_amount || 0
                  }),
                  sendTelegram('接龍報名 (已付款)', `活動：${sTitle}\n姓名：${sEntry.name}\n電話：${sEntry.phone || ''}\nEmail：${sEntry.email}\n公司：${sEntry.company || '—'}\n金額：NT$ ${sEntry.paid_amount?.toLocaleString()}`)
                ]);
              } catch (emailErr) {
                console.error(`[Notify] Signup email process error:`, emailErr);
              }

              // 自動開立並寄送線上收據 + 收入連動收支管理（皆冪等）
              await issueAndEmailReceipt('signup', merchantOrderNo);
              await addIncome('signup', merchantOrderNo);
            } else {
              console.warn(`[Notify] Warning: Signup order not found: ${merchantOrderNo}`)
            }

            return new Response('OK', {
              headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
              status: 200
            })
          }

          // 6.0 燒肉祭/火鍋祭報名 (獨立自助付款頁，訂單編號前綴 FEST_)
          if (merchantOrderNo.startsWith('FEST_')) {
            console.log(`[Notify] Attempting to update festival_registrations via RPC for ${merchantOrderNo}`);

            // 用 RPC (SECURITY DEFINER) 處理，繞過 PostgREST/RLS 邊際問題
            // RPC 內同時比對 merchant_order_no 與 order_no_history，確保歷史訂單號也能命中
            const { data: festData, error: festError } = await supabase.rpc('handle_festival_payment', {
              p_order_no: merchantOrderNo,
              p_amount: amount,
              p_pay_time: paidAtISO,
              p_pay_method: paymentMethod
            })

            if (festError) {
              console.error(`[Notify] handle_festival_payment RPC error:`, festError);
            }

            if (festData) {
              console.log(`[Notify] Success! Updated Festival Registration: ${merchantOrderNo}`)
              const festivalLabel = festData.festival_type === 'hotpot' ? '火鍋祭' : festData.festival_type === 'both' ? '燒肉祭與火鍋祭' : '燒肉祭';
              try {
                await Promise.all([
                  sendEmail('paid_confirm', {
                    to_name: festData.contact_name,
                    to_email: festData.contact_email,
                    kind: festivalLabel,
                    activity_title: `【食在力量】${festivalLabel}報名`,
                    activity_date: new Date().toISOString().slice(0, 10),
                    activity_time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
                    activity_location: `${festivalLabel}（已完成繳費）`,
                    amount: festData.paid_amount || 0
                  }),
                  sendTelegram(`${festivalLabel}報名 (已付款)`, `品牌：${festData.brand_name}\n聯絡人：${festData.contact_name}\n電話：${festData.contact_phone}\nEmail：${festData.contact_email}\n抬頭：${festData.invoice_title || '—'}\n統編：${festData.tax_id || '—'}\n品牌數：${festData.brand_count}\n網紅影音升級：${festData.influencer_video_count}\n金額：NT$ ${festData.paid_amount?.toLocaleString()}`)
                ]);
              } catch (emailErr) {
                console.error(`[Notify] Festival email process error:`, emailErr);
              }

              // 自動開立並寄送線上收據（款項項目：捐款）
              await issueAndEmailReceipt('festival', merchantOrderNo);
              // 燒肉/火鍋祭收入自動連動「收支管理」（冪等）
              await addIncome('festival', merchantOrderNo);
            } else {
              console.warn(`[Notify] Warning: Festival order not found: ${merchantOrderNo}`)
            }

            return new Response('OK', {
              headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
              status: 200
            })
          }

          // 6.1 Update 'registrations' (統一活動表 — 含公開與會員專屬，以 audience 區分)
          console.log(`[Notify] Attempting to update registrations for ${merchantOrderNo}`);
          const { data: regData, error: regError } = await supabase
            .from('registrations')
            .update(updatePayload)
            .eq('merchant_order_no', merchantOrderNo)
            .select()
            .single()

          if (regError && regError.code !== 'PGRST116') {
            console.error(`[Notify] registrations update error:`, regError);
          }

          if (regData) {
            const isMemberOnly = regData.audience === 'member_only';
            console.log(`[Notify] Success! Updated Registration (${regData.audience}): ${merchantOrderNo}`)

            // 點數核銷（commit）：把報名時凍結的點數正式扣除。RPC 為冪等，重複回呼安全。
            try {
              const { error: commitErr } = await supabase.rpc('points_commit', { p_order_no: merchantOrderNo });
              if (commitErr) console.error(`[Notify] points_commit error:`, commitErr);
            } catch (e) {
              console.error(`[Notify] points_commit exception:`, e);
            }

            // 從統一 activities 表取活動資訊
            let activityTitle = '活動報名確認';
            let activityDate = '';
            let activityTime = '';
            let activityLocation = '';
            let recipientEmail = regData.email || '';
            let recipientName = regData.name || regData.member_name || '';

            const actId = regData.activityId || regData.activity_id;
            if (actId) {
              const { data: actData } = await supabase.from('activities').select('*').eq('id', actId).single();
              if (actData) {
                activityTitle = actData.title || activityTitle;
                activityDate = actData.date || activityDate;
                activityTime = actData.time || activityTime;
                activityLocation = actData.location || activityLocation;
              }
            }

            // 會員活動：補抓會員 email（registrations.email 可能為空，要回頭 join members）
            if (isMemberOnly && !recipientEmail) {
              const memId = regData.member_id || regData.memberId;
              if (memId) {
                const { data: memberRec } = await supabase.from('members').select('email').eq('id', memId).single();
                if (memberRec?.email) recipientEmail = memberRec.email;
              }
            }

            try {
              const label = isMemberOnly ? '會員專屬活動報名 (已付款)' : '一般活動報名 (已付款)';
              const telegramBody = isMemberOnly
                ? `活動：${activityTitle}\n會員：${recipientName}\n金額：NT$ ${regData.paid_amount?.toLocaleString()}`
                : `活動：${activityTitle}\n姓名：${recipientName}\n電話：${regData.phone || ''}\n金額：NT$ ${regData.paid_amount?.toLocaleString()}`;

              console.log(`[Notify] Sending ${isMemberOnly ? 'member' : 'general'} activity email to ${recipientEmail}`);
              await Promise.all([
                sendEmail('paid_confirm', {
                  to_name: recipientName,
                  to_email: recipientEmail,
                  kind: '活動報名',
                  activity_title: activityTitle,
                  activity_date: activityDate,
                  activity_time: activityTime,
                  activity_location: activityLocation,
                  amount: regData.paid_amount || 0
                }),
                sendTelegram(label, telegramBody)
              ]);
            } catch (emailErr) {
              console.error(`[Notify] Email process error:`, emailErr);
            }

            // 自動開立並寄送線上收據
            await issueAndEmailReceipt('registration', merchantOrderNo);

            // 收入自動連動「收支管理」（冪等）
            await addIncome('registration', merchantOrderNo);
          }

          if (!regData) {
              // 6.2 If not found, Update 'member_applications' (新會員入會)
              console.log(`[Notify] Attempting to update member_applications for ${merchantOrderNo}`);
              const { data: appData, error: appError } = await supabase
                .from('member_applications')
                .update(updatePayload)
                .eq('merchant_order_no', merchantOrderNo)
                .select()
                .single()

              if (appError && appError.code !== 'PGRST116') {
                console.error(`[Notify] member_applications update error:`, appError);
              }
              
              if (appData) {
                console.log(`[Notify] Success! Updated Member Application: ${merchantOrderNo}`)
                
                // Send Email & Telegram
                try {
                  console.log(`[Notify] Sending member join email to ${appData.email} for ${appData.name}`);
                  await Promise.all([
                    sendEmail('payment_notice', {
                      to_name: appData.name,
                      to_email: appData.email,
                      subject: '【食在力量】會員入會申請 — 繳費成功',
                      intro: '您的入會申請已收到並完成繳費，管理員將於 3-5 個工作天內完成審核，審核通過後會再通知您。感謝您加入食在力量！',
                      rows: [['已付金額', `NT$ ${(appData.paid_amount || 0).toLocaleString()}`]],
                    }),
                    sendTelegram('新會員申請 (已付款)', `姓名：${appData.name}\n公司：${appData.company_title || '無'}\n電話：${appData.phone}\nEmail：${appData.email}\n金額：NT$ ${appData.paid_amount?.toLocaleString()}`)
                  ]);
                  console.log(`[Notify] Finished awaiting notifications for member application`);
                } catch (emailErr) {
                  console.error(`[Notify] Email process error:`, emailErr);
                }

                // 自動開立並寄送線上收據（入會費）
                await issueAndEmailReceipt('application', merchantOrderNo);
                // 入會費收入自動連動「收支管理」
                await addIncome('application', merchantOrderNo);
              }

                if (!appData) {
                  // 6.4 If not found, Update 'member_renewals' (會員續約)
                  console.log(`[Notify] Attempting to update member_renewals via RPC for ${merchantOrderNo}`);
                  
                  // Use RPC to handle both member_renewals and members update in one transaction
                  // This also bypasses RLS issues when running as anon
                  const { error: rpcError } = await supabase.rpc('handle_renewal_payment', {
                    p_order_no: merchantOrderNo,
                    p_amount: amount,
                    p_pay_time: paidAtISO,
                    p_pay_method: paymentMethod
                  });

                  if (rpcError) {
                    console.error(`[Notify] handle_renewal_payment RPC error:`, rpcError);
                    // Fallback to manual update if RPC fails (though it shouldn't)
                    await supabase
                      .from('member_renewals')
                      .update({
                        payment_status: 'paid',
                        paid_at: paidAtISO,
                        payment_method: paymentMethod
                      })
                      .eq('merchant_order_no', merchantOrderNo);
                  }
                  
                  // Fetch the updated record to send notifications
                  const { data: renewData } = await supabase
                    .from('member_renewals')
                    .select('*')
                    .eq('merchant_order_no', merchantOrderNo)
                    .single();
                  
                  if (renewData) {
                    console.log(`[Notify] Success! Processed Member Renewal: ${merchantOrderNo}`)
                    
                    let memberName = '';
                    let memberEmail = '';
                    if (renewData.member_id) {
                       const { data: memberRec } = await supabase.from('members').select('name, email').eq('id', renewData.member_id).single();
                       if (memberRec) {
                          memberName = memberRec.name;
                          memberEmail = memberRec.email;
                       }
                    }

                    // Send Email & Telegram
                    try {
                      console.log(`[Notify] Sending renewal email to ${memberEmail} for member ${memberName}`);
                      await Promise.all([
                        sendEmail('payment_notice', {
                          to_name: memberName,
                          to_email: memberEmail,
                          subject: '【食在力量】會員續約成功',
                          intro: '您的會員續約已完成繳費，會籍已自動延長。感謝您持續支持食在力量！',
                          rows: [['已付金額', `NT$ ${(renewData.amount || 0).toLocaleString()}`]],
                        }),
                        sendTelegram('會員續約申請 (已付款)', `會員：${memberName}\n金額：NT$ ${renewData.amount?.toLocaleString()}`)
                      ]);
                      console.log(`[Notify] Finished awaiting notifications for member renewal`);
                    } catch (emailErr) {
                      console.error(`[Notify] Email process error:`, emailErr);
                    }

                    // 自動開立並寄送線上收據（年費）
                    await issueAndEmailReceipt('renewal', merchantOrderNo);
                    // 年費收入自動連動「收支管理」
                    await addIncome('renewal', merchantOrderNo);
                  } else {
                    console.warn(`[Notify] Warning: Order not found in any table: ${merchantOrderNo}`)
                  }
                }
          }
        } else {
            console.log(`[Notify] Payment Status is not SUCCESS: ${paymentData.Status}`)
            // 付款失敗/取消：回補報名時凍結的點數（RPC 冪等，非 frozen 單自動 no-op）
            try {
              const failedOrderNo = paymentData.Result?.MerchantOrderNo;
              if (failedOrderNo) {
                const supabaseFail = createClient(SupabaseUrl, SupabaseKey)
                const { error: refundErr } = await supabaseFail.rpc('points_refund', { p_order_no: failedOrderNo });
                if (refundErr) console.error(`[Notify] points_refund error:`, refundErr);
                else console.log(`[Notify] points_refund processed for ${failedOrderNo}`);
              }
            } catch (e) {
              console.error(`[Notify] points_refund exception:`, e);
            }
        }

        return new Response('OK', { 
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
          status: 200 
        })

    } catch (innerError: any) {
        console.error('[Notify] Logic Error:', innerError.message)
        throw innerError // Re-throw to be caught by outer block
    }

  } catch (error: any) {
    console.error('[Notify] Critical Error:', error.message)
    // 回傳 500 給藍新，這樣您才會收到那封「觸發失敗通知信」，方便我們除錯
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
