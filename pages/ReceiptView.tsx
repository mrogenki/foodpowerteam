import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { RECEIPT_STAMP_BUCKET, RECEIPT_STAMP_PATH } from '../constants';
import { Loader2, Printer, AlertTriangle } from 'lucide-react';

interface ReceiptRow {
  receipt_no: string;
  payer_name: string;
  tax_id?: string | null;
  amount: number;
  payment_method: string;
  fee_type: string;
  order_no?: string | null;
  issue_date: string;
  handler_name: string;
  note?: string | null;
  status?: string | null;
  created_at?: string;
}

const FEE_LABELS: Record<string, string> = {
  initiation: '入會費',
  annual: '年費',
  donation: '捐款',
  goods_donation: '捐物',
};

const formatDate = (d?: string) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${dt.getFullYear()}年${String(dt.getMonth() + 1).padStart(2, '0')}月${String(dt.getDate()).padStart(2, '0')}日`;
};

const ReceiptView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [receipt, setReceipt] = useState<ReceiptRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stampOk, setStampOk] = useState(true);

  const stampUrl = supabase
    ? supabase.storage.from(RECEIPT_STAMP_BUCKET).getPublicUrl(RECEIPT_STAMP_PATH).data.publicUrl
    : '';

  useEffect(() => {
    const fetchReceipt = async () => {
      if (!supabase || !token) { setError('連結無效'); setLoading(false); return; }
      try {
        const { data, error } = await supabase.rpc('get_receipt_by_token', { p_token: token });
        if (error) throw error;
        if (!data) { setError('查無此收據，連結可能已失效'); }
        else setReceipt(data as ReceiptRow);
      } catch (err: any) {
        console.error(err);
        setError('讀取收據時發生錯誤');
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="animate-spin text-red-600" size={40} />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-500 gap-3 px-6 text-center">
        <AlertTriangle size={40} className="text-yellow-500" />
        <p className="font-bold">{error || '查無此收據'}</p>
      </div>
    );
  }

  const cancelled = receipt.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <style>{`
        @media print {
          body { background: white !important; }
          /* 列印時只保留收據本體，隱藏全站 Header/Footer 與工具列 */
          body * { visibility: hidden !important; }
          .receipt-paper, .receipt-paper * { visibility: visible !important; }
          .receipt-paper { position: absolute !important; left: 0; top: 0; margin: 0 !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* 工具列 */}
      <div className="no-print max-w-[900px] mx-auto mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">食在力量美食產業交流協會 — 電子收據</p>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-bold shadow"
        >
          <Printer size={18} /> 列印 / 存成 PDF
        </button>
      </div>

      {/* 收據紙張 */}
      <div className="receipt-paper relative max-w-[900px] mx-auto bg-white text-black p-8 sm:p-12 shadow-xl" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
        {cancelled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-red-500/30 font-black border-8 border-red-500/30 rounded-2xl px-10 py-4" style={{ fontSize: '90px', transform: 'rotate(-20deg)' }}>已作廢</span>
          </div>
        )}

        {/* 抬頭 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-widest mb-2">食在力量美食產業交流協會</h1>
          <h2 className="text-xl sm:text-2xl font-bold tracking-[0.8em] ml-[0.8em]">收據</h2>
        </div>

        {/* 上方資訊 */}
        <div className="mb-3 text-base sm:text-lg space-y-1">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p>立案字號：台內團字第1130012253號</p>
            <p>日期：<span className="font-bold">{formatDate(receipt.issue_date)}</span></p>
          </div>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p>統一編號：00509918</p>
            <p>編號：<span className="font-bold text-red-600">{receipt.receipt_no}</span></p>
          </div>
        </div>

        {/* 主表 */}
        <table className="w-full border-collapse border border-black text-base sm:text-lg text-center">
          <tbody>
            <tr>
              <td className="border border-black bg-gray-100 font-bold py-3 w-[13%] whitespace-nowrap">茲收到</td>
              <td className="border border-black py-3 text-left px-4 w-[57%]" colSpan={3}>
                <span className="font-bold">{receipt.payer_name}</span>
              </td>
              <td className="border border-black bg-gray-100 font-bold py-3 w-[15%]">統一編號</td>
              <td className="border border-black py-3 w-[15%] font-bold">{receipt.tax_id || '—'}</td>
            </tr>
            <tr>
              <td className="border border-black bg-gray-100 font-bold py-3">NT$</td>
              <td className="border border-black py-3 text-left px-4 font-bold" colSpan={3}>
                {receipt.amount.toLocaleString()} 元整
              </td>
              <td className="border border-black bg-gray-100 font-bold py-3">支付方式</td>
              <td className="border border-black py-3 font-bold">{receipt.payment_method}</td>
            </tr>
            <tr>
              <td className="border border-black bg-gray-100 font-bold py-3 whitespace-nowrap">款項項目</td>
              <td className="border border-black py-3 px-4 text-left" colSpan={5}>
                <div className="flex flex-wrap gap-x-8 gap-y-2 items-center font-bold">
                  {(['initiation', 'annual', 'donation', 'goods_donation'] as const).map((ft) => (
                    <span key={ft} className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-5 h-5 border-2 border-gray-500 rounded-sm ${receipt.fee_type === ft ? 'bg-blue-600 border-blue-600' : ''}`}>
                        {receipt.fee_type === ft && <span className="text-white text-xs leading-none">✓</span>}
                      </span>
                      {FEE_LABELS[ft]}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-black bg-gray-100 font-bold py-3 whitespace-nowrap">訂單編號</td>
              <td className="border border-black py-3 px-4 text-left font-mono" colSpan={5}>{receipt.order_no || '—'}</td>
            </tr>
            <tr>
              <td className="border border-black bg-gray-100 font-bold py-3 whitespace-nowrap">備註</td>
              <td className="border border-black py-3 px-4 text-left" colSpan={5}>{receipt.note || '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* 下方 */}
        <div className="mt-6 flex justify-between items-end text-base sm:text-lg gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">本收據由系統自動開立，電子文件具同等效力。</p>
          </div>
          <div className="text-right shrink-0">
            {stampUrl && stampOk && (
              <img
                src={stampUrl}
                alt="協會印章"
                onError={() => setStampOk(false)}
                className="ml-auto h-24 sm:h-28 object-contain pointer-events-none select-none"
                style={{ mixBlendMode: 'multiply' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptView;
