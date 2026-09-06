import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { submitNewebPayForm } from '../utils/newebpay';
import { Loader2, CheckCircle2, AlertCircle, CreditCard, Home, Clock, Copy } from 'lucide-react';

// ── 接龍報名付款頁（免登入，憑 token 認領）──

interface SignupPayInfo {
  name: string;
  email: string;
  amount: number;
  activity_title: string;
  activity_picture?: string | null;
  payment_status: 'unpaid' | 'paid';
  status: 'confirmed' | 'waitlist';
  is_member?: boolean;
  has_coupon?: boolean;
  payment_mode?: 'online' | 'self';
  collect_note?: string | null;
  self_pay_method?: string | null;
  self_pay_ref?: string | null;
}

const SELF_PAY_METHODS = ['轉帳', 'LINE Pay', '現金'];

const SignupPayment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<SignupPayInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  // 自主收款回填繳費資訊
  const [selfMethod, setSelfMethod] = useState('轉帳');
  const [selfRef, setSelfRef] = useState('');
  const [selfSubmitting, setSelfSubmitting] = useState(false);
  const [selfDone, setSelfDone] = useState(false);

  useEffect(() => {
    if (info?.self_pay_method) { setSelfMethod(info.self_pay_method); setSelfDone(true); }
    if (info?.self_pay_ref) setSelfRef(info.self_pay_ref);
  }, [info]);

  const submitSelfPay = async () => {
    if (!id || !token || !supabase) return;
    if (selfMethod === '轉帳' && !selfRef.trim()) { alert('請填寫轉帳末五碼'); return; }
    setSelfSubmitting(true);
    try {
      const { error } = await supabase.rpc('signup_submit_payment_info', {
        p_id: id, p_token: token, p_method: selfMethod, p_ref: selfRef.trim(),
      });
      if (error) throw error;
      setSelfDone(true);
      alert('已回報繳費資訊！主辦確認後會將您標記為已付款。');
    } catch (err: any) {
      alert(err.message || '送出失敗，請稍後再試');
    } finally {
      setSelfSubmitting(false);
    }
  };

  const copyMyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2500); })
      .catch(() => alert('複製失敗，請手動複製上方網址列的連結'));
  };

  useEffect(() => {
    const load = async () => {
      if (!id || !token || !supabase) { setError('連結不完整或已失效'); setLoading(false); return; }
      try {
        const { data, error } = await supabase.rpc('get_signup_payment_info', { p_id: id, p_token: token });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) { setError('找不到此報名資料或連結已失效'); }
        else setInfo(row as SignupPayInfo);
      } catch (err: any) {
        setError(err.message || '讀取資料發生錯誤');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, token]);

  const handlePayment = async () => {
    if (!id || !token || !supabase) return;
    setPaying(true);
    const merchantOrderNo = `SIGNUP_${Date.now()}`;
    try {
      const { data, error } = await supabase.rpc('update_signup_order_no', {
        p_id: id, p_token: token, p_order_no: merchantOrderNo,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || !row.amount) { alert('系統錯誤，無法建立訂單編號，請稍後再試'); setPaying(false); return; }
      try { sessionStorage.setItem('last_signup_url', window.location.pathname + window.location.search); } catch {}
      await submitNewebPayForm({
        MerchantOrderNo: merchantOrderNo,
        Amt: row.amount,
        ItemDesc: row.item_desc,
        Email: row.email,
      });
    } catch (err: any) {
      alert(err.message || '系統錯誤，請稍後再試');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-red-600" size={48} />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">無法讀取資料</h2>
          <p className="text-gray-500 mb-6">{error || '請確認連結是否正確'}</p>
          <button onClick={() => navigate('/')} className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-200">回首頁</button>
        </div>
      </div>
    );
  }

  const isPaid = info.payment_status === 'paid';
  const isWaitlist = info.status !== 'confirmed';
  const isFree = (info.amount || 0) <= 0;   // 免費活動：無需繳費
  const isSelf = info.payment_mode === 'self'; // 發起人自主收款

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full border border-gray-100">
        <div className="text-center mb-8">
          {info.activity_picture && (
            <img src={info.activity_picture} alt={info.activity_title}
              className="w-full h-36 object-cover rounded-2xl mb-5 shadow-sm" loading="eager" />
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">接龍報名費繳納</h1>
          <p className="text-gray-500">{isSelf ? '請依繳費方式繳費後，於下方回報繳費資訊' : '請確認以下資訊並完成繳費'}</p>
        </div>

        <div className="space-y-4 mb-8 bg-gray-50 p-6 rounded-xl">
          <div className="flex justify-between">
            <span className="text-gray-500">活動名稱</span>
            <span className="font-bold text-gray-900 text-right max-w-[220px] truncate">{info.activity_title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">報名者</span>
            <span className="font-bold text-gray-900">{info.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-bold text-gray-900 break-all text-right pl-4">{info.email}</span>
          </div>
          <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
            <span className="text-gray-900 font-bold flex items-center gap-2 flex-wrap">
              應付金額
              {info.is_member && <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">已套用會員價</span>}
              {info.has_coupon && <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">已套用折扣券</span>}
            </span>
            <span className="text-2xl font-bold text-red-600">NT$ {info.amount.toLocaleString()}</span>
          </div>
        </div>

        {isFree && !isPaid ? (
          <div className="text-center space-y-6">
            <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center justify-center gap-2 font-bold">
              <CheckCircle2 size={20} /> 此活動免費，報名已完成，無需繳費
            </div>
            <button onClick={() => navigate('/')} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
              <Home size={20} /> 回首頁
            </button>
          </div>
        ) : isPaid ? (
          <div className="text-center space-y-6">
            <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center justify-center gap-2 font-bold">
              <CheckCircle2 size={20} /> 此報名已完成繳費
            </div>
            <button onClick={() => navigate('/')} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
              <Home size={20} /> 回首頁
            </button>
          </div>
        ) : isWaitlist ? (
          <div className="text-center space-y-6">
            <div className="bg-amber-50 text-amber-700 p-4 rounded-xl flex items-center justify-center gap-2 font-bold">
              <Clock size={20} /> 您目前為候補，遞補為正取後即可付款
            </div>
            <button onClick={() => navigate(-1)} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">返回名單</button>
          </div>
        ) : isSelf ? (
          <div className="space-y-4">
            {info.collect_note && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 whitespace-pre-wrap">
                <span className="font-bold">💰 繳費方式：</span>{'\n'}{info.collect_note}
              </div>
            )}
            {selfDone && (
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm">
                <CheckCircle2 size={18} /> 已回報繳費資訊，等待主辦確認
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">繳費方式</label>
              <div className="grid grid-cols-3 gap-2">
                {SELF_PAY_METHODS.map(m => (
                  <button key={m} type="button" onClick={() => setSelfMethod(m)}
                    className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${selfMethod === m ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {selfMethod === '轉帳' ? '轉帳帳號末五碼' : '備註（選填）'}
                {selfMethod === '轉帳' && <span className="text-red-600"> *</span>}
              </label>
              <input value={selfRef} onChange={e => setSelfRef(e.target.value)} maxLength={40}
                placeholder={selfMethod === '轉帳' ? '例：12345' : selfMethod === 'LINE Pay' ? '例：已用 LINE Pay 轉帳' : '例：現場繳交現金'}
                inputMode={selfMethod === '轉帳' ? 'numeric' : 'text'}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent" />
            </div>
            <button onClick={submitSelfPay} disabled={selfSubmitting}
              className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2 text-lg disabled:opacity-50">
              {selfSubmitting ? '送出中…' : selfDone ? '更新繳費資訊' : '回報繳費資訊'}
            </button>
            <p className="text-xs text-center text-gray-400">繳費後回填此表，主辦核對後會將您標記為已付款。</p>
            <div className="pt-3 border-t border-gray-100">
              <button onClick={copyMyLink}
                className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <Copy size={16} /> {linkCopied ? '已複製 ✓' : '複製此連結（之後可回來更新）'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={handlePayment} disabled={paying}
              className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2 text-lg disabled:opacity-50">
              <CreditCard size={24} /> {paying ? '前往中…' : '立即前往繳費'}
            </button>
            <p className="text-xs text-center text-gray-400">點擊後將轉導至藍新金流安全支付頁面</p>

            <div className="pt-3 border-t border-gray-100">
              <button onClick={copyMyLink}
                className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <Copy size={18} /> {linkCopied ? '已複製 ✓' : '複製我的專屬繳費連結'}
              </button>
              <p className="text-xs text-center text-amber-600 mt-2 leading-relaxed">
                ⚠️ 用 LINE 開啟可能不會記住你的報名。<br />建議先「複製連結」貼到自己的 LINE 或記事本，之後即可隨時回來補繳。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignupPayment;
