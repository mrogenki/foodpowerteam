import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Member, PaymentStatus } from '../types';
import { requestRefund } from '../utils/newebpay';
import { Loader2, Search, CheckCircle, XCircle, Send, RefreshCcw, Ban, CreditCard } from 'lucide-react';
import ReceiptModal, { ReceiptData } from '../components/ReceiptModal';

interface MemberRenewal {
  id: string;
  member_id: string;
  member_name: string; // Joined
  member_no: string;   // Joined
  member_email?: string; // Joined
  member_tax_id?: string; // Joined
  renewal_date: string;
  amount: number;
  payment_status: string;
  merchant_order_no: string;
  created_at: string;
  payment_method?: string;
  receipt_status?: string;
}

const translatePaymentMethod = (method?: string) => {
  if (!method) return '-';
  const map: Record<string, string> = {
    'CREDIT': '信用卡',
    'VACC': 'ATM轉帳',
    'WEBATM': 'WebATM',
    'CVS': '超商代碼',
    'BARCODE': '超商條碼',
    'LINEPAY': 'Line Pay',
    'manual_admin': '手動標記',
    'ALIPAY': '支付寶',
    'WECHATPAY': '微信支付'
  };
  return map[method] || method;
};

const MemberRenewalManager: React.FC<{ isSuperAdmin?: boolean }> = ({ isSuperAdmin }) => {
  const [renewals, setRenewals] = useState<MemberRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string[]>([]);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const fetchRenewals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('member_renewals')
        .select(`
          *,
          member:members (
            name,
            member_no,
            email,
            tax_id,
            brand_name,
            company_title
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch receipts to check status
      const { data: receiptsData } = await supabase
        .from('receipts')
        .select('order_no, status');

      const receiptMap: Record<string, string> = {};
      if (receiptsData) {
        receiptsData.forEach((r: any) => {
          if (r.order_no) receiptMap[r.order_no] = r.status;
        });
      }

      const formattedData = data.map((item: any) => ({
        ...item,
        member_name: item.member?.name || '未知會員',
        member_no: item.member?.member_no || '---',
        member_email: item.member?.email,
        member_tax_id: item.member?.tax_id || '',
        member_company: item.member?.company_title || '',
        receipt_status: item.merchant_order_no ? receiptMap[item.merchant_order_no] : undefined
      }));

      setRenewals(formattedData);
    } catch (err) {
      console.error('Error fetching renewals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRenewals();
  }, []);

  const handleMarkAsPaid = async (renewal: MemberRenewal) => {
    if (!confirm(`確定將 ${renewal.member_name} 的續約標記為已付款？\n這將會自動更新會員的會籍到期日與繳費紀錄。`)) return;

    try {
      setLoading(true);
      
      // Use RPC to handle both member_renewals and members update in one transaction
      const { error: rpcError } = await supabase.rpc('handle_renewal_payment', {
        p_order_no: renewal.merchant_order_no || null,
        p_amount: renewal.amount || 0,
        p_pay_time: new Date().toISOString(),
        p_pay_method: 'manual_admin',
        p_renewal_id: renewal.id
      });

      if (rpcError) throw rpcError;

      alert('更新成功！會籍已延長並新增繳費紀錄。');
      fetchRenewals();

    } catch (err: any) {
      console.error('Error updating status:', err);
      alert('更新失敗: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (renewal: MemberRenewal) => {
    if (!confirm(`即將處理 ${renewal.member_name} 續費的退款（成功後會自動縮回會籍 1 年）。\n\n按「確定」繼續。`)) return;
    try {
      setLoading(true);
      const res = await requestRefund(renewal.merchant_order_no, 'renewal');
      if (res.ok) {
        alert(`✅ 藍新刷退成功（${res.mode === 'cancel_auth' ? '取消授權／未請款交易' : '退款／已請款交易'}）\n已自動縮回會籍 1 年，請確認會員到期日。\n藍新交易序號：${res.tradeNo || '—'}`);
        fetchRenewals();
      } else {
        alert(`❌ 藍新刷退失敗：\n${res.message || res.error}`);
      }
    } catch (err: any) {
      alert('刷退失敗：' + (err.message || '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = async (renewal: any) => {
    if (!renewal.member_email) {
      alert('此會員無 Email 資料');
      return;
    }
    
    if (!confirm(`確定重寄付款連結給 ${renewal.member_name}?`)) return;

    setSendingEmail(prev => [...prev, renewal.id]);
    
    const renewalPaymentLink = `${window.location.origin}/pay-renewal/${renewal.id}`;

    try {
      await supabase.functions.invoke('send-email', {
        body: {
          template: 'payment_notice',
          params: {
            to_email: renewal.member_email,
            to_name: renewal.member_name,
            subject: '【食在力量】會員續約繳費通知',
            intro: '您的會員續約訂單尚未完成付款，請點下方按鈕完成繳費。',
            rows: [['訂單單號', renewal.merchant_order_no]],
            pay_link: renewalPaymentLink,
          },
        },
      });
      
      // Copy to clipboard for manual sharing
      await navigator.clipboard.writeText(renewalPaymentLink);
      alert('已發送 Email 連結，且付款連結已複製到剪貼簿，您可以直接貼上傳送給會員。');
    } catch (e: any) {
      console.error(e);
      alert('發送失敗');
    } finally {
      setSendingEmail(prev => prev.filter(id => id !== renewal.id));
    }
  };

  const handleMarkAsProcessed = async (renewal: MemberRenewal) => {
    if (!confirm(`確定將 ${renewal.member_name} 的續約標記為「已處理」？\n(這表示您已經開立收據並完成相關人工確認)`)) return;

    try {
      const { error: updateError } = await supabase
        .from('member_renewals')
        .update({ 
          payment_status: 'processed'
        })
        .eq('id', renewal.id);

      if (updateError) throw updateError;

      alert('已標記為已處理！');
      fetchRenewals();
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert('更新失敗: ' + err.message);
    }
  };

  const handleBatchMarkAsProcessed = async () => {
    const toProcess = processedRenewals.filter(r => r.payment_status !== 'processed');
    if (toProcess.length === 0) return;
    
    if (!confirm(`確定要將這 ${toProcess.length} 筆已開立收據的紀錄全部標記為「已處理」嗎？\n這將會清除側邊欄的紅色數字提醒。`)) return;

    try {
      const { error } = await supabase
        .from('member_renewals')
        .update({ payment_status: 'processed' })
        .in('id', toProcess.map(r => r.id));

      if (error) throw error;
      fetchRenewals();
      alert('已全部標記為已處理');
    } catch (err: any) {
      console.error('Error batch marking as processed:', err);
      alert('更新失敗: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要永久刪除這筆續約紀錄嗎？此操作無法復原。')) return;

    try {
      const { data, error } = await supabase
        .from('member_renewals')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('權限不足或找不到該筆資料 (請確認資料庫 RLS 刪除權限已開啟)');
      }
      
      alert('已刪除紀錄');
      fetchRenewals();
    } catch (err: any) {
      console.error('Error deleting renewal:', err);
      alert('刪除失敗: ' + err.message);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  const pendingRenewals = renewals.filter(r => r.payment_status !== 'processed' && r.receipt_status !== 'sent');
  const processedRenewals = renewals.filter(r => r.payment_status === 'processed' || r.receipt_status === 'sent');

  const renderTable = (items: MemberRenewal[], isProcessed: boolean) => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-8">
      <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">{isProcessed ? '已處理續約' : '待處理續約'} <span className="text-sm font-normal text-gray-500 ml-2">共 {items.length} 筆</span></h2>
        {isProcessed && items.some(r => r.payment_status !== 'processed') && (
          <button 
            onClick={handleBatchMarkAsProcessed}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 font-bold"
          >
            一鍵歸檔所有已開立收據
          </button>
        )}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="p-4">申請日期</th>
              <th className="p-4">會員</th>
              <th className="p-4">金額</th>
              <th className="p-4">狀態</th>
              <th className="p-4">付款方式</th>
              <th className="p-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(renewal => (
              <tr key={renewal.id} className="hover:bg-gray-50">
                <td className="p-4 text-sm text-gray-500">{renewal.renewal_date}</td>
                <td className="p-4">
                  <div className="font-bold text-gray-900">{renewal.member_name}</div>
                  <div className="text-xs text-gray-400">{renewal.member_no}</div>
                  {renewal.merchant_order_no && <div className="text-[10px] text-gray-400 font-mono">#{renewal.merchant_order_no}</div>}
                </td>
                <td className="p-4 font-mono">NT$ {renewal.amount.toLocaleString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    renewal.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                    renewal.payment_status === 'processed' ? 'bg-gray-100 text-gray-700' :
                    renewal.payment_status === 'refunded' ? 'bg-gray-200 text-gray-500' :
                    renewal.payment_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {renewal.payment_status === 'paid' ? '已付款' :
                     renewal.payment_status === 'processed' ? '已處理' :
                     renewal.payment_status === 'refunded' ? '已退費' :
                     renewal.payment_status === 'failed' ? '失敗' : '待付款'}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {translatePaymentMethod(renewal.payment_method)}
                  </span>
                </td>
                <td className="p-4 flex gap-2 flex-wrap">
                  {(renewal.payment_status === 'paid' || renewal.payment_status === 'processed') && (
                    <button
                      onClick={() => setReceiptData({
                        payerName: renewal.member_name,
                        companyName: (renewal as any).member_company,
                        taxId: renewal.member_tax_id,
                        amount: renewal.amount || 5000,
                        paymentMethod: translatePaymentMethod(renewal.payment_method),
                        feeType: 'annual',
                        orderNo: renewal.merchant_order_no || '',
                        email: renewal.member_email || ''
                      })}
                      disabled={renewal.receipt_status === 'sent'}
                      className={`text-xs px-2 py-1 rounded font-bold border ${
                        renewal.receipt_status === 'sent' 
                          ? 'bg-green-50 text-green-700 border-green-200 cursor-default' 
                          : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {renewal.receipt_status === 'sent' ? '已開立' : '開立收據'}
                    </button>
                  )}
                  {isSuperAdmin && renewal.payment_status === 'paid' && (
                    <button
                      onClick={() => handleRefund(renewal)}
                      className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 font-bold flex items-center gap-1"
                      title="向藍新真實刷退（成功後自動縮回會籍 1 年）"
                    >
                      <RefreshCcw size={10} /> 刷退
                    </button>
                  )}
                  {!isProcessed && renewal.payment_status !== 'paid' && renewal.receipt_status !== 'sent' && (
                    <>
                      <button
                        onClick={() => handleMarkAsPaid(renewal)}
                        className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100 font-bold"
                      >
                        標記已付
                      </button>
                      <button 
                        onClick={() => handleResendLink(renewal)}
                        disabled={sendingEmail.includes(renewal.id)}
                        className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold flex items-center gap-1"
                      >
                        {sendingEmail.includes(renewal.id) ? <Loader2 size={10} className="animate-spin"/> : <Send size={10}/>}
                        重寄
                      </button>
                    </>
                  )}
                  {isProcessed && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <CheckCircle size={12}/> {renewal.receipt_status === 'sent' ? '已開立寄出' : '完成'}
                      </span>
                      {renewal.payment_status !== 'processed' && (
                        <button 
                          onClick={() => handleMarkAsProcessed(renewal)}
                          className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-100 font-bold"
                          title="將此紀錄狀態改為「已處理」以從待辦清單中移除"
                        >
                          標記為已處理
                        </button>
                      )}
                    </div>
                  )}
                  <button 
                    onClick={() => handleDelete(renewal.id)}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors ml-auto flex items-center gap-1"
                    title="刪除紀錄"
                  >
                    <XCircle size={14} /> 刪除
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">目前無{isProcessed ? '已處理' : '待處理'}續約申請</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 手機版卡片視圖 */}
      <div className="md:hidden divide-y divide-gray-100">
        {items.map(renewal => (
          <div key={renewal.id} className="p-4">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="font-bold text-gray-900">{renewal.member_name}</div>
                <div className="text-xs text-gray-400">{renewal.member_no}</div>
                {renewal.merchant_order_no && <div className="text-[10px] text-gray-400 font-mono">#{renewal.merchant_order_no}</div>}
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold shrink-0 ${
                renewal.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                renewal.payment_status === 'processed' ? 'bg-gray-100 text-gray-700' :
                renewal.payment_status === 'refunded' ? 'bg-gray-200 text-gray-500' :
                renewal.payment_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {renewal.payment_status === 'paid' ? '已付款' :
                 renewal.payment_status === 'processed' ? '已處理' :
                 renewal.payment_status === 'refunded' ? '已退費' :
                 renewal.payment_status === 'failed' ? '失敗' : '待付款'}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-sm">
              <span className="font-mono">NT$ {renewal.amount.toLocaleString()}</span>
              <span className="text-xs text-gray-500">{renewal.renewal_date} · {translatePaymentMethod(renewal.payment_method)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              {(renewal.payment_status === 'paid' || renewal.payment_status === 'processed') && (
                <button
                  onClick={() => setReceiptData({ payerName: renewal.member_name, companyName: (renewal as any).member_company, taxId: renewal.member_tax_id, amount: renewal.amount || 5000, paymentMethod: translatePaymentMethod(renewal.payment_method), feeType: 'annual', orderNo: renewal.merchant_order_no || '', email: renewal.member_email || '' })}
                  disabled={renewal.receipt_status === 'sent'}
                  className={`text-xs px-2 py-1.5 rounded font-bold border ${renewal.receipt_status === 'sent' ? 'bg-green-50 text-green-700 border-green-200 cursor-default' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                >
                  {renewal.receipt_status === 'sent' ? '已開立' : '開立收據'}
                </button>
              )}
              {isSuperAdmin && renewal.payment_status === 'paid' && (
                <button onClick={() => handleRefund(renewal)} className="text-xs bg-red-50 text-red-600 px-2 py-1.5 rounded hover:bg-red-100 font-bold flex items-center gap-1" title="向藍新真實刷退（成功後自動縮回會籍 1 年）"><RefreshCcw size={10} /> 刷退</button>
              )}
              {!isProcessed && renewal.payment_status !== 'paid' && renewal.receipt_status !== 'sent' && (
                <>
                  <button onClick={() => handleMarkAsPaid(renewal)} className="text-xs bg-green-50 text-green-600 px-2 py-1.5 rounded hover:bg-green-100 font-bold">標記已付</button>
                  <button onClick={() => handleResendLink(renewal)} disabled={sendingEmail.includes(renewal.id)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1.5 rounded hover:bg-blue-100 font-bold flex items-center gap-1">
                    {sendingEmail.includes(renewal.id) ? <Loader2 size={10} className="animate-spin"/> : <Send size={10}/>} 重寄
                  </button>
                </>
              )}
              {isProcessed && renewal.payment_status !== 'processed' && (
                <button onClick={() => handleMarkAsProcessed(renewal)} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-1 rounded hover:bg-blue-100 font-bold">標記為已處理</button>
              )}
              <button onClick={() => handleDelete(renewal.id)} className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded transition-colors ml-auto flex items-center gap-1"><XCircle size={14} /> 刪除</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="p-8 text-center text-gray-400">目前無{isProcessed ? '已處理' : '待處理'}續約申請</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">會員續約管理</h2>
          <p className="text-gray-500 text-sm mt-1">此處顯示會員的續約紀錄，確認款項與開立收據後，可標記為「已處理」。</p>
        </div>
        <button onClick={fetchRenewals} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
          <RefreshCcw size={18} /> 重新整理
        </button>
      </div>

      {renderTable(pendingRenewals, false)}
      {renderTable(processedRenewals, true)}

      {receiptData && (
        <ReceiptModal
          isOpen={!!receiptData}
          onClose={() => {
            setReceiptData(null);
            fetchRenewals();
          }}
          initialData={receiptData}
        />
      )}
    </div>
  );
};

export default MemberRenewalManager;
