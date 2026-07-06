import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { Loader2, CreditCard, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { submitNewebPayForm } from '../utils/newebpay';

const RenewalPayment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [renewal, setRenewal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRenewal = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase.rpc('get_renewal_payment_info', { renewal_id: id });
        
        if (error) throw error;
        if (!data || data.length === 0) {
          setError('找不到續約資料');
          return;
        }

        setRenewal(data[0]);
      } catch (err: any) {
        console.error('Error fetching renewal:', err);
        setError('讀取資料失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchRenewal();
  }, [id]);

  const handlePayment = async () => {
    if (!renewal) return;

    // 產生新的訂單編號
    const merchantOrderNo = `RENEW_${Date.now()}`;
    const amount = renewal.amount;

    try {
      // 更新資料庫
      const { error } = await supabase.rpc('update_payment_order_no', { 
        reg_id: renewal.id, 
        new_order_no: merchantOrderNo 
      });

      if (error) {
        console.error('Failed to update order no:', error);
        alert('系統錯誤，無法建立訂單編號');
        return;
      }

      await submitNewebPayForm({
        MerchantOrderNo: merchantOrderNo,
        Amt: amount,
        ItemDesc: `食在力量會員續約 (${renewal.member_name})`,
        Email: renewal.member_email || ''
      });
    } catch (err) {
      console.error('Payment error:', err);
      alert('系統錯誤');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-red-600" size={48} />
      </div>
    );
  }

  if (error || !renewal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-gray-100">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">發生錯誤</h2>
          <p className="text-gray-500 mb-8">{error || '資料不存在'}</p>
          <button onClick={() => navigate('/')} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">返回首頁</button>
        </div>
      </div>
    );
  }

  if (renewal.payment_status === 'paid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-gray-100">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">已完成付款</h2>
          <p className="text-gray-500 mb-8">此續約訂單已完成付款，感謝您的支持。</p>
          <button onClick={() => navigate('/')} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">返回首頁</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-red-600 mb-8 transition-colors">
          <ArrowLeft size={20} /> 返回首頁
        </button>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-red-600 p-8 text-white text-center">
            <CreditCard className="mx-auto mb-4" size={48} />
            <h1 className="text-2xl font-bold">會員續約繳費</h1>
            <p className="text-red-100 opacity-80 mt-1">請確認以下資訊並完成付款</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <span className="text-gray-500">會員姓名</span>
                <span className="font-bold text-gray-900">{renewal.member_name}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <span className="text-gray-500">項目</span>
                <span className="font-bold text-gray-900">會籍續約 (一年)</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <span className="text-gray-500">應付金額</span>
                <span className="text-2xl font-black text-red-600">NT$ {renewal.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-500 leading-relaxed">
              點擊下方按鈕後，將導向藍新金流安全付款頁面。付款完成後，您的會籍將自動延長。
            </div>

            <button
              onClick={handlePayment}
              className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95 flex items-center justify-center gap-2"
            >
              <CreditCard size={20} />
              立即前往繳費
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenewalPayment;
