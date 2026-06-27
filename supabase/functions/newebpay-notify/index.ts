
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
          const amount = result.Amt
          const payTime = result.PayTime 
          const paymentMethod = result.PaymentType 

          // Init Supabase
          const supabase = createClient(SupabaseUrl, SupabaseKey)

          // Defensive Date Parsing (防止日期格式錯誤導致寫入失敗)
          let paidAtISO = new Date().toISOString();
          if (payTime) {
              const parsedDate = new Date(payTime);
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

          // Helper: Send Email via EmailJS REST API
          const sendEmail = async (templateId: string, params: any) => {
            const serviceId = Deno.env.get('EMAILJS_SERVICE_ID');
            const publicKey = Deno.env.get('EMAILJS_PUBLIC_KEY');
            const privateKey = Deno.env.get('EMAILJS_PRIVATE_KEY'); // Optional: Private Key (accessToken)
            
            if (!serviceId || !publicKey) {
              console.warn('[Notify] EmailJS env variables missing, skipping email');
              return;
            }

            try {
              const payload: any = {
                service_id: serviceId,
                template_id: templateId,
                user_id: publicKey,
                template_params: params
              };

              // If private key is provided, add it as accessToken
              if (privateKey) {
                payload.accessToken = privateKey;
              }

              console.log(`[Notify] Sending email payload to EmailJS:`, JSON.stringify({
                ...payload,
                accessToken: payload.accessToken ? '***HIDDEN***' : undefined,
                user_id: '***HIDDEN***'
              }));

              const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              
              if (response.ok) {
                console.log(`[Notify] Email sent successfully to ${params.email || params.to_email}`);
              } else {
                const errText = await response.text();
                console.error(`[Notify] Email sending failed with status ${response.status}:`, errText);
              }
            } catch (e) {
              console.error('[Notify] Email sending network/fetch error:', e);
            }
          };

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
                  sendEmail(Deno.env.get('EMAILJS_TEMPLATE_ID') || 'template_ih0plai', {
                    to_name: festData.contact_name,
                    email: festData.contact_email,
                    activity_title: `【食在力量】${festivalLabel}報名`,
                    activity_date: new Date().toISOString().slice(0, 10),
                    activity_time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
                    activity_location: `${festivalLabel}（已完成繳費）`,
                    activity_price: festData.paid_amount || 0
                  }),
                  sendTelegram(`${festivalLabel}報名 (已付款)`, `品牌：${festData.brand_name}\n聯絡人：${festData.contact_name}\n電話：${festData.contact_phone}\nEmail：${festData.contact_email}\n抬頭：${festData.invoice_title || '—'}\n統編：${festData.tax_id || '—'}\n品牌數：${festData.brand_count}\n網紅影音升級：${festData.influencer_video_count}\n金額：NT$ ${festData.paid_amount?.toLocaleString()}`)
                ]);
              } catch (emailErr) {
                console.error(`[Notify] Festival email process error:`, emailErr);
              }
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
                sendEmail(Deno.env.get('EMAILJS_TEMPLATE_ID') || 'template_ih0plai', {
                  to_name: recipientName,
                  email: recipientEmail,
                  activity_title: activityTitle,
                  activity_date: activityDate,
                  activity_time: activityTime,
                  activity_location: activityLocation,
                  activity_price: regData.paid_amount || 0
                }),
                sendTelegram(label, telegramBody)
              ]);
            } catch (emailErr) {
              console.error(`[Notify] Email process error:`, emailErr);
            }
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
                    sendEmail(Deno.env.get('EMAILJS_MEMBER_JOIN_TEMPLATE_ID') || 'template_gu7mwvm', {
                      to_name: appData.name,
                      to_email: appData.email,
                      activity_title: '【食在力量】會員入會申請',
                      activity_date: new Date().toISOString().slice(0, 10),
                      activity_time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
                      activity_location: '線上申請 (已完成繳費)',
                      activity_price: `NT$ ${appData.paid_amount?.toLocaleString()}`,
                      message: `您的入會申請已收到並完成繳費，管理員將於 3-5 個工作天內完成審核。`
                    }),
                    sendTelegram('新會員申請 (已付款)', `姓名：${appData.name}\n公司：${appData.company_title || '無'}\n電話：${appData.phone}\nEmail：${appData.email}\n金額：NT$ ${appData.paid_amount?.toLocaleString()}`)
                  ]);
                  console.log(`[Notify] Finished awaiting notifications for member application`);
                } catch (emailErr) {
                  console.error(`[Notify] Email process error:`, emailErr);
                }
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
                        sendEmail(Deno.env.get('EMAILJS_RENEWAL_TEMPLATE_ID') || 'template_3bgk8ts', {
                          to_name: memberName,
                          to_email: memberEmail,
                          activity_title: '【食在力量】會員續約成功',
                          activity_date: new Date().toISOString().slice(0, 10),
                          activity_time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
                          activity_location: '線上續約 (已完成繳費)',
                          activity_price: `NT$ ${renewData.amount?.toLocaleString()}`,
                          message: `您的會員續約已完成繳費，會籍已自動延長。`
                        }),
                        sendTelegram('會員續約申請 (已付款)', `會員：${memberName}\n金額：NT$ ${renewData.amount?.toLocaleString()}`)
                      ]);
                      console.log(`[Notify] Finished awaiting notifications for member renewal`);
                    } catch (emailErr) {
                      console.error(`[Notify] Email process error:`, emailErr);
                    }
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
