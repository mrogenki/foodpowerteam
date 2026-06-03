import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { submitNewebPayForm } from '../utils/newebpay';
import { Loader2, CheckCircle2, AlertCircle, CreditCard, Home } from 'lucide-react';

const FESTIVAL_LABEL: Record<string, string> = {
  yakiniku: '燒肉祭',
  hotpot: '火鍋祭',
  both: '燒肉祭與火鍋祭',
};

const FestivalRegistrationPayment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reg, setReg] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReg = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('festival_registrations')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        if (data) setReg(data);
        else setError('找不到此繳費資料或連結已失效');
      } catch (err) {
        console.error('Error fetching festival registration:', err);
        setError('讀取資料發生錯誤');
      } finally {
        setLoading(false);
      }
    };
    fetchReg();
  }, [id]);

  const handlePayment = async () => {
    if (!reg) return;
    // 重新產生訂單編號（保留 FEST_ 前綴，讓金流回呼正確路由），避免重複單號
    const merchantOrderNo = `FEST_${Date.now()}`;
    try {
      const { error } = await supabase
        .from('festival_registrations')
        .update({ merchant_order_no: merchantOrderNo })
        .eq('id', id);
      if (error) {
        console.error('Failed to update order no:', error);
        alert('系統錯誤，無法建立訂單編號，請稍後再試');
        return;
      }
      submitNewebPayForm({
        MerchantOrderNo: merchantOrderNo,
        Amt: reg.amount,
        ItemDesc: `${FESTIVAL_LABEL[reg.festival_type] || '燒肉/火鍋祭'}報名-${reg.brand_name}`.slice(0, 50),
        Email: reg.contact_email,
      });
    } catch (err) {
      console.error('Payment initiation error:', err);
      alert('系統錯誤，請稍後再試');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-red-600" size={48} />
      </div>
    );
  }

  if (error || !reg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">無法讀取資料</h2>
          <p className="text-gray-500 mb-6">{error || '請確認連結是否正確'}</p>
          <button onClick={() => navigate('/festival')} className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-200">
            返回活動介紹
          </button>
        </div>
      </div>
    );
  }

  const isPaid = reg.payment_status === 'paid';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">燒肉祭 / 火鍋祭 報名費繳納</h1>
          <p className="text-gray-500">請確認以下資訊並完成繳費</p>
        </div>

        <div className="space-y-4 mb-8 bg-gray-50 p-6 rounded-xl">
          <div className="flex justify-between">
            <span className="text-gray-500">報名場次</span>
            <span className="font-bold text-gray-900">{FESTIVAL_LABEL[reg.festival_type] || reg.festival_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">品牌名稱</span>
            <span className="font-bold text-gray-900 text-right max-w-[220px] truncate">{reg.brand_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">聯絡人</span>
            <span className="font-bold text-gray-900">{reg.contact_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-bold text-gray-900 break-all text-right pl-4">{reg.contact_email}</span>
          </div>
          <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
            <span className="text-gray-900 font-bold">應付金額</span>
            <span className="text-2xl font-bold text-red-600">NT$ {Number(reg.amount).toLocaleString()}</span>
          </div>
        </div>

        {isPaid ? (
          <div className="text-center space-y-6">
            <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center justify-center gap-2 font-bold">
              <CheckCircle2 size={20} />
              此報名已完成繳費
            </div>
            <button onClick={() => navigate('/festival')} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
              <Home size={20} /> 返回活動介紹
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handlePayment}
              className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2 text-lg"
            >
              <CreditCard size={24} /> 立即前往繳費
            </button>
            <p className="text-xs text-center text-gray-400">點擊後將轉導至藍新金流安全支付頁面</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FestivalRegistrationPayment;
