import { supabase } from './supabaseClient';

// ==========================================
// 藍新金流設定（正式環境）
// 注意：HashKey / HashIV 已移至後端 Supabase secret（NEWEB_HASH_KEY / NEWEB_HASH_IV），
// 由 edge function `newebpay-checkout` 進行簽章，前端不再持有任何金鑰。
// ==========================================
export const NEWEB_CONFIG = {
  MerchantID: 'BVS00509918', // 商店代號非機密，可留前端
  Version: '2.0',
  URL: 'https://core.newebpay.com/MPG/mpg_gateway',
};

export interface NewebPayData {
  MerchantOrderNo: string;
  Amt: number;
  ItemDesc: string;
  Email: string;
}

interface NewebPayForm {
  action: string;
  fields: Record<string, string>;
}

// 向後端 edge function 取得已簽章的表單欄位（金鑰只在伺服端）
export const generateNewebPayForm = async (data: NewebPayData): Promise<NewebPayForm> => {
  if (!supabase) {
    alert('系統未連線，請稍後再試');
    return { action: '', fields: {} };
  }

  const { data: res, error } = await supabase.functions.invoke('newebpay-checkout', {
    body: {
      MerchantOrderNo: data.MerchantOrderNo,
      Amt: data.Amt,
      ItemDesc: data.ItemDesc,
      Email: data.Email,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    },
  });

  if (error || !res?.action || !res?.fields?.TradeInfo) {
    console.error('newebpay-checkout error:', error);
    alert('金流連線失敗，請稍後再試');
    return { action: '', fields: {} };
  }

  return res as NewebPayForm;
};

// ==========================================
// 藍新刷退（呼叫 newebpay-refund Edge Function）
// 由 Edge Function 伺服端強制驗證 SUPER_ADMIN 並實際呼叫藍新 Close API
// ==========================================
export type RefundSource = 'registration' | 'application' | 'renewal' | 'festival' | 'signup';

export interface RefundResult {
  ok: boolean;
  mode?: 'refund' | 'cancel_auth'; // refund=退款(已請款) / cancel_auth=取消授權(未請款)
  amount?: number;
  tradeNo?: string | null;
  pointsReturned?: number; // 活動報名退費時回補的折抵點數
  receiptCancelled?: boolean; // 對應收據是否已作廢
  incomeDeleted?: boolean; // 連動收入是否已刪除
  error?: string;
  message?: string;
}

export const requestRefund = async (orderNo: string, source: RefundSource): Promise<RefundResult> => {
  if (!supabase) return { ok: false, error: 'no_client', message: '系統未連線' };
  if (!orderNo) return { ok: false, error: 'no_order_no', message: '此筆無金流單號，無法 API 刷退，請人工處理' };

  const { data, error } = await supabase.functions.invoke('newebpay-refund', {
    body: { order_no: orderNo, source },
  });

  // FunctionsHttpError：真正的錯誤訊息在 context.json()
  if (error) {
    let msg = error.message || '刷退失敗';
    const ctx = (error as any)?.context;
    if (ctx && typeof ctx.json === 'function') {
      try { const b = await ctx.json(); if (b?.message || b?.error) msg = b.message || b.error; } catch (_) {}
    }
    return { ok: false, error: 'request_failed', message: msg };
  }

  if (data?.status === 'success') {
    return { ok: true, mode: data.mode, amount: data.amount, tradeNo: data.trade_no, pointsReturned: data.points_returned, receiptCancelled: data.receipt_cancelled, incomeDeleted: data.income_deleted, message: data.message };
  }
  return { ok: false, error: data?.error || 'unknown', message: data?.message || '刷退失敗' };
};

export const submitNewebPayForm = async (data: NewebPayData) => {
  const formInfo = await generateNewebPayForm(data);

  if (!formInfo.action) return;

  // 建立隱藏表單
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = formInfo.action;
  form.style.display = 'none';

  // 加入欄位
  Object.entries(formInfo.fields).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value as string;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  
  // 清除表單
  setTimeout(() => document.body.removeChild(form), 1000);
};
