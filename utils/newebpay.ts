
import CryptoJS from 'crypto-js';
import { supabase } from './supabaseClient';

// ==========================================
// 藍新金流設定 (正式環境 Production)
// ==========================================

const getConfig = (key: string, defaultValue: string = ''): string => {
  return (import.meta as any).env?.[key] || defaultValue;
};

export const NEWEB_CONFIG = {
  // 【請填入您的正式商店資料】
  // 建議：正式上線時，將這些金鑰移至 .env 檔案中透過 import.meta.env 讀取，避免寫死在程式碼中
  MerchantID: 'BVS00509918', 
  HashKey: 'emPRlQwL0sksVZ29P7RQUD9FGm5Yp9bP',
  HashIV: 'PLLHXbZoddtQvJqC',
  
  // 若您已設定 .env，可改用以下方式：
  // MerchantID: getConfig('VITE_NEWEB_MERCHANT_ID', ''),
  // HashKey: getConfig('VITE_NEWEB_HASH_KEY', ''),
  // HashIV: getConfig('VITE_NEWEB_HASH_IV', ''),

  Version: '2.0',
  
  // 【正式環境 URL】 (注意：測試環境是 ccore，正式環境是 core)
  URL: 'https://core.newebpay.com/MPG/mpg_gateway', 
};

// 產生 AES 加密字串
const encrypt = (data: string): string => {
  const key = CryptoJS.enc.Utf8.parse(NEWEB_CONFIG.HashKey);
  const iv = CryptoJS.enc.Utf8.parse(NEWEB_CONFIG.HashIV);
  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return encrypted.ciphertext.toString(CryptoJS.enc.Hex).toUpperCase();
};

// 產生 SHA256 雜湊
const hash = (aes: string): string => {
  const str = `HashKey=${NEWEB_CONFIG.HashKey}&${aes}&HashIV=${NEWEB_CONFIG.HashIV}`;
  return CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex).toUpperCase();
};

export interface NewebPayData {
  MerchantOrderNo: string;
  Amt: number;
  ItemDesc: string;
  Email: string;
}

// 產生提交給藍新的表單資料
export const generateNewebPayForm = (data: NewebPayData) => {
  // Double check
  if (!NEWEB_CONFIG.MerchantID || NEWEB_CONFIG.MerchantID.includes('請填入') || !NEWEB_CONFIG.HashKey || !NEWEB_CONFIG.HashIV) {
    alert("請先至 utils/newebpay.ts 填入正式環境的 MerchantID, HashKey 與 HashIV");
    return { action: '', fields: {} };
  }

  console.log("Preparing NewebPay Form for MerchantID:", NEWEB_CONFIG.MerchantID);

  // 1. 準備交易參數 (URL Encoded String)
  const params = new URLSearchParams();
  params.append('MerchantID', NEWEB_CONFIG.MerchantID);
  params.append('RespondType', 'JSON');
  params.append('TimeStamp', Math.floor(Date.now() / 1000).toString());
  params.append('Version', NEWEB_CONFIG.Version);
  params.append('MerchantOrderNo', data.MerchantOrderNo);
  params.append('Amt', data.Amt.toString());
  params.append('ItemDesc', data.ItemDesc); // 商品描述
  params.append('Email', data.Email);
  params.append('LoginType', '0'); // 0: 不須登入藍新會員
  params.append('CREDIT', '1'); // 啟用信用卡
  params.append('VACC', '1');   // 啟用 ATM 轉帳 (即時對帳)
  
  // 回傳網址設定
  const baseUrl = window.location.origin;

  // [前端返回] 讓使用者付款後點擊按鈕返回網站 (GET)
  params.append('ClientBackURL', `${baseUrl}/payment-result?order_no=${data.MerchantOrderNo}`);
  
  // [後端通知] 讓藍新在背景通知 Supabase Edge Function (POST)
  const SUPABASE_PROJECT_ID = 'kpltydyspvzozgxfiwra';
  const DEFAULT_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/newebpay-notify`;
  
  const notifyUrl = getConfig('VITE_SUPABASE_FUNCTION_URL', DEFAULT_FUNCTION_URL);
  
  console.log('Setting NotifyURL to:', notifyUrl);
  params.append('NotifyURL', notifyUrl);
  
  // 2. 加密 TradeInfo
  const tradeInfo = encrypt(params.toString());
  
  // 3. 產生 TradeSha
  const tradeSha = hash(tradeInfo);

  return {
    action: NEWEB_CONFIG.URL,
    fields: {
      MerchantID: NEWEB_CONFIG.MerchantID,
      TradeInfo: tradeInfo,
      TradeSha: tradeSha,
      Version: NEWEB_CONFIG.Version
    }
  };
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

export const submitNewebPayForm = (data: NewebPayData) => {
  const formInfo = generateNewebPayForm(data);
  
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
