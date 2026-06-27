
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Home, Mail, ArrowLeft, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const PaymentResult: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderNo = searchParams.get('order_no');
  const [lastActivityUrl, setLastActivityUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'paid' | 'pending' | 'failed' | 'not_found'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkCount, setCheckCount] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  // 觸發重新查詢（含主動向藍新確認）
  const retry = () => { setErrorMsg(null); setCheckCount(0); setStatus('loading'); setRetryKey(k => k + 1); };

  useEffect(() => {
    const url = sessionStorage.getItem('last_activity_url');
    if (url) setLastActivityUrl(url);
  }, []);

  useEffect(() => {
    if (!orderNo) {
      setStatus('paid');
      return;
    }

    let cancelled = false;
    let interval: any;

    // 快速讀取 DB 目前狀態（NotifyURL 已寫入時會立即反映）
    const readDbStatus = async (): Promise<string | null> => {
      const { data, error } = await supabase.rpc('check_payment_status', { order_no: orderNo });
      if (error) throw error;
      if (!data || data.length === 0) return 'not_found';
      return data[0].res_status || data[0].out_status || data[0].status || 'pending';
    };

    // 主動向藍新查詢真實交易狀態，並在已付款時補寫 DB（後備機制，防 NotifyURL 漏接）
    const activeConfirm = async (): Promise<string | null> => {
      try {
        const { data, error } = await supabase.functions.invoke('newebpay-query', {
          body: { order_no: orderNo },
        });
        if (error) {
          console.debug('newebpay-query unavailable, fallback to DB read:', error.message);
          return null;
        }
        return (data as any)?.status || null;
      } catch (err: any) {
        console.debug('newebpay-query exception, fallback to DB read:', err?.message);
        return null;
      }
    };

    const applyStatus = (s: string | null) => {
      if (cancelled || !s) return false;
      if (s === 'paid') { setStatus('paid'); return true; }
      if (s === 'failed') { setStatus('failed'); return true; }
      if (s === 'not_found') { setStatus('not_found'); return true; }
      setStatus('pending');
      return false;
    };

    const run = async () => {
      try {
        // 1. 先快速讀 DB；已付款就結束
        const dbStatus = await readDbStatus();
        if (applyStatus(dbStatus === 'paid' ? 'paid' : 'pending') && dbStatus === 'paid') return;
        if (dbStatus === 'not_found') { applyStatus('not_found'); /* 仍嘗試藍新查詢 */ }

        // 2. 主動向藍新確認（會在已付款時補寫 DB）
        const confirmed = await activeConfirm();
        if (confirmed && applyStatus(confirmed)) {
          if (confirmed === 'paid' || confirmed === 'failed') return;
        }

        // 3. 仍未確定 → 每 3 秒讀一次 DB，最多 10 次（等 NotifyURL 補到）
        interval = setInterval(async () => {
          if (cancelled) return clearInterval(interval);
          setCheckCount(prev => {
            if (prev >= 10) { clearInterval(interval); return prev; }
            return prev + 1;
          });
          try {
            const s = await readDbStatus();
            if (s === 'paid' || s === 'failed') {
              clearInterval(interval);
              applyStatus(s);
            }
          } catch { /* 忽略單次輪詢錯誤 */ }
        }, 3000);
      } catch (err: any) {
        if (cancelled) return;
        console.error('Payment status check exception:', err);
        setErrorMsg(err.message || '未知錯誤');
        setStatus('failed');
      }
    };

    run();

    return () => { cancelled = true; clearInterval(interval); };
  }, [orderNo, retryKey]);

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="text-center py-12">
          <Loader2 className="animate-spin text-red-600 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-900">正在確認付款結果...</h2>
          <p className="text-gray-500 mt-2">請稍候，系統正在與金流平台同步資訊</p>
        </div>
      );
    }

    if (status === 'failed') {
      return (
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">查詢失敗</h1>
          <p className="text-gray-600 mb-4">
            系統在查詢訂單時遇到問題：<br/>
            <span className="text-red-500 font-mono text-sm">{errorMsg}</span>
          </p>
          <button
            onClick={retry}
            className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors mb-6"
          >
            重試查詢
          </button>
        </div>
      );
    }

    if (status === 'not_found') {
      return (
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">找不到交易紀錄</h1>
          <p className="text-gray-600 mb-8">
            無法查詢到此訂單編號 ({orderNo}) 的付款資訊。<br/>
            請確認您是否已完成付款，或聯繫客服人員協助。
          </p>
          <button
            onClick={retry}
            className="bg-gray-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-700 transition-colors mb-6"
          >
            重新查詢
          </button>
        </div>
      );
    }

    if (status === 'pending') {
      return (
        <div className="text-center">
          <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <RefreshCw size={40} className="animate-spin" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">付款確認中 / 未完成</h1>
          <p className="text-gray-600 mb-8">
            系統尚未收到您的付款成功通知。<br/>
            若您剛剛已完成付款，請稍候片刻並點擊下方按鈕重新整理。<br/>
            若您尚未付款或付款失敗，請返回重新操作。
          </p>
          <button
            onClick={retry}
            className="bg-yellow-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-yellow-600 transition-colors mb-6"
          >
            重新整理狀態
          </button>
        </div>
      );
    }

    // status === 'paid'
    return (
      <>
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">付款程序完成</h1>
        
        <div className="space-y-4 text-gray-600 mb-8">
          <p>
            感謝您的報名與付款！<br/>
            第三方金流平台已接收您的款項。
          </p>
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800 text-left">
            <p className="font-bold mb-1 flex items-center gap-2"><CheckCircle2 size={14} /> 系統已核銷：</p>
            <p>
              您的報名狀態已更新為「已付款」。<br/>
              您可以隨時在會員專區查看您的報名紀錄。
            </p>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm text-gray-600 text-left mt-2">
            <p className="font-bold mb-1 flex items-center gap-1"><Mail size={14}/> 收信提醒：</p>
            <p>
              若您未收到報名確認信，請檢查您的「垃圾郵件夾」或「促銷內容」分頁。
            </p>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full text-center border border-gray-100 animate-in zoom-in duration-500">
        {renderContent()}

        <div className="flex gap-4 justify-center">
          <Link to="/" className="flex items-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
            <Home size={18} /> 回首頁
          </Link>
          
          {lastActivityUrl && (
            <Link to={lastActivityUrl} className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200">
              <ArrowLeft size={18} /> 返回活動
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentResult;
