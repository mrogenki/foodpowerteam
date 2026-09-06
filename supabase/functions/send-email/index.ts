// send-email — 共用寄信 Edge Function（Resend）
//
// 目的：取代前端 EmailJS 直接寄信。所有信件版型寫在程式碼（可版控、可自由排版），
// 由前端 supabase.functions.invoke('send-email', { body: { template, params } }) 呼叫，
// API key 只存在伺服器端（RESEND_API_KEY）。
//
// 需要的環境變數（Supabase secrets）：
//   RESEND_API_KEY   （必要）Resend API key
//   RESEND_FROM      寄件人，預設 "食在力量 <noreply@foodpowerteam.com>"（網域需先在 Resend 驗證）
//   RESEND_REPLY_TO  （選填）回覆信箱
//   SITE_URL         （選填）網站網址，預設 https://www.foodpowerteam.com

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: { env: { get(key: string): string | undefined } };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LINE_ID = '@foodpowerteam';

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const money = (n: unknown) => `NT$ ${Number(n ?? 0).toLocaleString('en-US')}`;

/** 品牌外框：紅橘漸層抬頭 + 內容 + 頁尾（官方 LINE） */
function layout(opts: { title: string; bodyHtml: string }) {
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f3f4f6;font-family:-apple-system,'PingFang TC','Microsoft JhengHei',Helvetica,Arial,sans-serif;color:#1f2937;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.06);">
      <div style="background:linear-gradient(135deg,#dc2626,#ea580c);padding:22px 24px;">
        <div style="color:#fff;font-size:18px;font-weight:800;letter-spacing:.5px;">食在力量</div>
        <div style="color:#ffe4d6;font-size:12px;margin-top:2px;">美食產業交流協會</div>
      </div>
      <div style="padding:24px;">${opts.bodyHtml}</div>
      <div style="padding:18px 24px;border-top:1px solid #f3f4f6;background:#fafafa;">
        <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.7;">
          若有任何疑問，歡迎隨時透過官方 LINE 與我們聯繫。<br>
          官方 LINE ID：<strong style="color:#dc2626;">${LINE_ID}</strong>
        </p>
        <p style="margin:10px 0 0;font-size:12px;color:#c4c4c4;">食在力量 敬上</p>
      </div>
    </div>
  </div>
</body></html>`;
}

/** 明細列 */
function rows(pairs: Array<[string, string]>) {
  return `<table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;">
    ${pairs
      .filter(([, v]) => v && String(v).trim())
      .map(
        ([k, v]) =>
          `<tr>
            <td style="padding:6px 0;color:#9ca3af;white-space:nowrap;vertical-align:top;width:88px;">${esc(k)}</td>
            <td style="padding:6px 0;color:#1f2937;font-weight:600;">${v}</td>
          </tr>`
      )
      .join('')}
  </table>`;
}

/** 主要 CTA 按鈕 */
function button(label: string, url: string) {
  return `<div style="margin:22px 0 6px;">
    <a href="${esc(url)}" style="display:block;text-align:center;background:#dc2626;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 20px;border-radius:12px;">${esc(label)}</a>
  </div>
  <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;word-break:break-all;">若按鈕無法點擊，請複製此連結貼到瀏覽器：<br>${esc(url)}</p>`;
}

/** ---------- 信件模板 ---------- */
type Built = { subject: string; html: string };
const templates: Record<string, (p: any) => Built> = {
  // 接龍報名確認信
  signup_confirm: (p): Built => {
    const title = String(p.activity_title || '活動');
    const feeLine = p.is_free
      ? '免費'
      : `${money(p.fee)}${p.is_member ? '（會員價）' : ''}`;
    const detail = rows([
      ['活動名稱', esc(title)],
      ['日期', esc(p.activity_date)],
      ['時間', esc(p.activity_time)],
      ['地點', esc(p.activity_location)],
      ['費用', feeLine],
    ]);
    const who = esc(p.to_name || '');

    let intro = '';
    let cta = '';
    if (p.is_free) {
      intro = `您已成功報名（正取），本次免費，無需繳費。`;
    } else if (p.mode === 'self_collect') {
      intro = `您已成功報名（正取）。完成繳費後，請點下方按鈕回填繳費資訊（轉帳末五碼／LINE Pay／現金），主辦核對後會將您標記為已付款。`;
      cta = p.pay_link ? button('回填繳費資訊', p.pay_link) : '';
      if (p.collect_note) {
        cta += `<div style="margin-top:16px;padding:14px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;font-size:13px;color:#9a3412;white-space:pre-wrap;">【繳費方式】\n${esc(p.collect_note)}</div>`;
      }
    } else {
      intro = `您已成功報名（正取）。請點下方按鈕完成繳費以保留名額。此連結可隨時回來繳費（換手機／瀏覽器亦適用）。`;
      cta = p.pay_link ? button('前往繳費', p.pay_link) : '';
    }

    const body = `
      <p style="margin:0 0 4px;font-size:15px;">親愛的 <strong>${who}</strong> 您好：</p>
      <p style="margin:0 0 18px;font-size:14px;color:#4b5563;line-height:1.8;">感謝您報名參加「食在力量」的活動！我們已收到您的報名資訊。<br>${esc(intro)}</p>
      <div style="padding:16px;background:#f9fafb;border-radius:12px;">${detail}</div>
      ${cta}
    `;
    return { subject: `【接龍報名】${title} — 報名確認`, html: layout({ title, bodyHtml: body }) };
  },

  // 一般活動報名確認信（免費 or 稍後付款；立即付款者由付款成功後另寄）
  activity_confirm: (p): Built => {
    const title = String(p.activity_title || '活動');
    const detail = rows([
      ['活動名稱', esc(title)],
      ['日期', esc(p.activity_date)],
      ['時間', esc(p.activity_time)],
      ['地點', esc(p.activity_location)],
      ['費用', p.is_free ? '免費' : money(p.fee)],
    ]);
    const who = esc(p.to_name || '');

    let intro = '';
    let cta = '';
    if (p.is_free || !p.pay_link) {
      intro = `您已完成報名，我們已收到您的報名資訊。`;
    } else {
      intro = `您已完成報名，本次選擇稍後付款。請點下方按鈕完成繳費以保留名額（任何裝置皆可）。`;
      cta = button('前往繳費', p.pay_link);
    }

    const body = `
      <p style="margin:0 0 4px;font-size:15px;">親愛的 <strong>${who}</strong> 您好：</p>
      <p style="margin:0 0 18px;font-size:14px;color:#4b5563;line-height:1.8;">感謝您報名參加「食在力量」的活動！<br>${esc(intro)}</p>
      <div style="padding:16px;background:#f9fafb;border-radius:12px;">${detail}</div>
      ${cta}
    `;
    return { subject: `【活動報名】${title} — 報名確認`, html: layout({ title, bodyHtml: body }) };
  },

  // 線上收據信（附線上收據連結）
  receipt: (p): Built => {
    const who = esc(p.to_name || '');
    const detail = rows([
      ['收據編號', esc(p.order_id)],
      ['金額', money(p.amount)],
    ]);
    const cta = p.receipt_link ? button('查看／下載收據', p.receipt_link) : '';
    const body = `
      <p style="margin:0 0 4px;font-size:15px;">親愛的 <strong>${who}</strong> 您好：</p>
      <p style="margin:0 0 18px;font-size:14px;color:#4b5563;line-height:1.8;">感謝您的支持，您的款項已收到，以下為本次的電子收據。</p>
      <div style="padding:16px;background:#f9fafb;border-radius:12px;">${detail}</div>
      ${cta}
    `;
    return { subject: `【食在力量】電子收據 ${esc(p.order_id)}`, html: layout({ title: '電子收據', bodyHtml: body }) };
  },

  // 通用繳費通知（入會、活動補寄、續費補寄…）：一段說明 + 可選明細 + 可選繳費按鈕
  payment_notice: (p): Built => {
    const who = esc(p.to_name || '');
    const pairs: Array<[string, string]> = Array.isArray(p.rows)
      ? p.rows.map((r: any[]) => [String(r[0]), esc(r[1])] as [string, string])
      : [];
    const detail = pairs.length
      ? `<div style="padding:16px;background:#f9fafb;border-radius:12px;">${rows(pairs)}</div>`
      : '';
    const cta = p.pay_link ? button(p.button_label || '前往繳費', p.pay_link) : '';
    const intro = esc(p.intro || '');
    const body = `
      <p style="margin:0 0 4px;font-size:15px;">親愛的 <strong>${who}</strong> 您好：</p>
      <p style="margin:0 0 18px;font-size:14px;color:#4b5563;line-height:1.8;white-space:pre-wrap;">${intro}</p>
      ${detail}
      ${cta}
    `;
    return { subject: String(p.subject || '食在力量 通知'), html: layout({ title: String(p.subject || '通知'), bodyHtml: body }) };
  },

  // 會籍續約／喚醒通知（到期前提醒）
  renewal_reminder: (p): Built => {
    const who = esc(p.to_name || '');
    const isWake = String(p.notice_type || '').includes('喚醒');
    const detail = rows([['會籍到期日', esc(p.expiry_date)]]);
    const intro = isWake
      ? '好久不見！您的會籍已到期，誠摯邀請您回來續會，繼續與產業夥伴交流、共創商機。'
      : '提醒您，您的會籍即將到期。為確保會員權益不中斷，敬請及早完成續費。';
    const body = `
      <p style="margin:0 0 4px;font-size:15px;">親愛的 <strong>${who}</strong> 您好：</p>
      <p style="margin:0 0 18px;font-size:14px;color:#4b5563;line-height:1.8;">${esc(intro)}</p>
      <div style="padding:16px;background:#f9fafb;border-radius:12px;">${detail}</div>
      ${button('前往續費', p.renew_link || 'https://www.foodpowerteam.com/renew')}
    `;
    return { subject: `【食在力量】${esc(p.notice_type || '續約通知')}`, html: layout({ title: '續約通知', bodyHtml: body }) };
  },
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return json(500, { ok: false, error: 'RESEND_API_KEY 未設定' });

    const from = Deno.env.get('RESEND_FROM') || '食在力量 <noreply@foodpowerteam.com>';
    const replyTo = Deno.env.get('RESEND_REPLY_TO') || undefined;

    const { template, params, to, subject, html } = await req.json().catch(() => ({} as any));

    let toEmail = to || params?.to_email || params?.email;
    let finalSubject = subject;
    let finalHtml = html;

    if (template) {
      const build = templates[template];
      if (!build) return json(400, { ok: false, error: `未知的模板：${template}` });
      const built = build(params || {});
      finalSubject = built.subject;
      finalHtml = built.html;
    }

    if (!toEmail) return json(400, { ok: false, error: '缺少收件人 email' });
    if (!finalHtml || !finalSubject) return json(400, { ok: false, error: '缺少信件內容' });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject: finalSubject,
        html: finalHtml,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[send-email] Resend failed', res.status, errText);
      return json(502, { ok: false, error: `Resend 寄送失敗 (${res.status})`, detail: errText });
    }
    const data = await res.json();
    return json(200, { ok: true, id: data?.id });
  } catch (e) {
    console.error('[send-email] error', e);
    return json(500, { ok: false, error: String((e as any)?.message ?? e) });
  }
});
