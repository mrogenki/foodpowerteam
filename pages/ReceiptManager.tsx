import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Receipt } from '../types';
import { Loader2, Search, Printer, Trash2, RefreshCcw, FileText, Plus, Download, Stamp, UploadCloud } from 'lucide-react';
import ReceiptModal, { ReceiptData } from '../components/ReceiptModal';
import { RECEIPT_STAMP_BUCKET, RECEIPT_STAMP_PATH } from '../constants';
import * as XLSX from 'xlsx';

const translateFeeType = (type: string) => {
  const map: Record<string, string> = {
    'initiation': '入會費',
    'annual': '年費',
    'donation': '捐款',
    'goods_donation': '捐物'
  };
  return map[type] || type;
};

const ReceiptManager: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [stampVer, setStampVer] = useState(0); // 上傳後用來破快取
  const [stampExists, setStampExists] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);

  const stampUrl = supabase
    ? `${supabase.storage.from(RECEIPT_STAMP_BUCKET).getPublicUrl(RECEIPT_STAMP_PATH).data.publicUrl}?v=${stampVer}`
    : '';

  const handleUploadStamp = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;
    if (!file.type.startsWith('image/')) { alert('請上傳圖片檔（建議去背 PNG）'); return; }
    setUploadingStamp(true);
    try {
      const { error } = await supabase.storage
        .from(RECEIPT_STAMP_BUCKET)
        .upload(RECEIPT_STAMP_PATH, file, { contentType: file.type, cacheControl: '300', upsert: true });
      if (error) throw error;
      setStampExists(true);
      setStampVer(Date.now());
      alert('收據印章已更新！線上收據將自動蓋上此印章。');
    } catch (err: any) {
      console.error('upload stamp error:', err);
      alert('上傳失敗：' + (err.message || '未知錯誤'));
    } finally {
      setUploadingStamp(false);
      e.target.value = '';
    }
  };

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (err) {
      console.error('Error fetching receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleDelete = async (id: string, receiptNo: string) => {
    if (!confirm(`確定要刪除收據編號 ${receiptNo} 的紀錄嗎？此操作無法復原。`)) return;

    try {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      alert('已刪除收據紀錄');
      fetchReceipts();
    } catch (err: any) {
      console.error('Error deleting receipt:', err);
      alert('刪除失敗: ' + err.message);
    }
  };

  const handlePrint = (receipt: Receipt) => {
    // Convert YYYY-MM-DD to Gregorian year format
    let formattedDate = receipt.issue_date;
    try {
      const dateObj = new Date(receipt.issue_date);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      formattedDate = `${year}年${month}月${day}日`;
    } catch (e) {
      // Ignore
    }

    setSelectedReceipt({
      receiptNo: receipt.receipt_no,
      issueDate: formattedDate,
      handlerName: receipt.handler_name,
      payerName: receipt.payer_name,
      taxId: receipt.tax_id || '',
      amount: receipt.amount,
      paymentMethod: receipt.payment_method,
      feeType: receipt.fee_type as any,
      orderNo: receipt.order_no || '',
      remarks: receipt.note || '',
      status: receipt.status,
      email: receipt.email || ''
    });
  };

  const handleManualCreate = () => {
    setSelectedReceipt({
      payerName: '',
      amount: 0,
      feeType: 'donation',
      paymentMethod: '現金'
    });
  };

  const handleExportExcel = () => {
    if (filteredReceipts.length === 0) {
      alert('沒有資料可匯出');
      return;
    }

    const exportData = filteredReceipts.map(r => ({
      '開立日期': r.issue_date,
      '收據編號': r.receipt_no,
      '付款人': r.payer_name,
      '統一編號': r.tax_id || '',
      '費用項目': translateFeeType(r.fee_type),
      '訂單編號': r.order_no || '',
      '金額': r.amount,
      '支付方式': r.payment_method,
      '狀態': r.status === 'sent' ? '已開立寄出' : '已開立',
      '備註': r.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '收據清單');
    
    // Auto-size columns
    const maxWidths = Object.keys(exportData[0]).map(key => {
      return Math.max(
        key.length * 2,
        ...exportData.map(row => String(row[key as keyof typeof row]).length * 1.5)
      );
    });
    worksheet['!cols'] = maxWidths.map(w => ({ wch: w }));

    XLSX.writeFile(workbook, `收據清單_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredReceipts = receipts.filter(r => 
    r.receipt_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.payer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.order_no && r.order_no.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">收據管理</h2>
          <p className="text-gray-500 text-sm mt-1">檢視與管理所有已開立的收據紀錄。</p>
        </div>
        <div className="flex items-center gap-4">
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold shadow-lg cursor-pointer ${uploadingStamp ? 'bg-gray-300 text-gray-500' : 'bg-gray-700 text-white hover:bg-gray-800 shadow-gray-100'}`}>
            {uploadingStamp ? <Loader2 size={18} className="animate-spin" /> : <Stamp size={18} />}
            {stampExists ? '更換收據印章' : '上傳收據印章'}
            <input type="file" accept="image/*" className="hidden" onChange={handleUploadStamp} disabled={uploadingStamp} />
          </label>
          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold shadow-lg shadow-green-100">
            <Download size={18} /> 匯出 Excel
          </button>
          <button onClick={handleManualCreate} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-bold shadow-lg shadow-red-100">
            <Plus size={18} /> 手動新增收據
          </button>
          <button onClick={fetchReceipts} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
            <RefreshCcw size={18} /> 重新整理
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 font-bold whitespace-nowrap">線上收據印章</span>
          <div className="h-16 w-28 border border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
            {/* 始終嘗試載入：成功→顯示並標記存在；失敗→顯示提示 */}
            <img
              src={stampUrl}
              alt="收據印章"
              onLoad={() => setStampExists(true)}
              onError={() => setStampExists(false)}
              className={`max-h-14 max-w-full object-contain ${stampExists ? '' : 'hidden'}`}
              style={{ mixBlendMode: 'multiply' }}
            />
            {!stampExists && <span className="text-[11px] text-gray-400 flex items-center gap-1"><UploadCloud size={14} />尚未設定</span>}
          </div>
          <span className="text-[11px] text-gray-400 max-w-[180px] hidden lg:block">建議上傳去背 PNG；會自動蓋在「繳費自動開立」的線上收據右下角。</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜尋收據編號、付款人或訂單編號..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="p-4">開立日期</th>
                  <th className="p-4">收據編號</th>
                  <th className="p-4">付款人 / 統編</th>
                  <th className="p-4">費用項目</th>
                  <th className="p-4">金額 / 支付方式</th>
                  <th className="p-4">狀態</th>
                  <th className="p-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReceipts.map(receipt => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="p-4 text-sm text-gray-500">{receipt.issue_date}</td>
                    <td className="p-4 font-mono font-bold text-red-600">{receipt.receipt_no}</td>
                    <td className="p-4">
                      <div className="font-bold text-gray-900">{receipt.payer_name}</div>
                      {receipt.tax_id && <div className="text-xs text-gray-500">統編: {receipt.tax_id}</div>}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700">
                        {translateFeeType(receipt.fee_type)}
                      </span>
                      {receipt.order_no && <div className="text-[10px] text-gray-400 font-mono mt-1">#{receipt.order_no}</div>}
                    </td>
                    <td className="p-4">
                      <div className="font-bold">NT$ {receipt.amount.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{receipt.payment_method}</div>
                    </td>
                    <td className="p-4">
                      {receipt.status === 'sent' ? (
                        <span className="px-2 py-1 rounded text-xs font-bold bg-green-50 text-green-700">
                          已開立寄出
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-bold bg-gray-50 text-gray-500">
                          已開立
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handlePrint(receipt)}
                          className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 font-bold flex items-center gap-1"
                        >
                          <FileText size={14} /> 檢視
                        </button>
                        <button 
                          onClick={() => handleDelete(receipt.id, receipt.receipt_no)}
                          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded transition-colors"
                          title="刪除紀錄"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredReceipts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-400">
                      <FileText size={48} className="mx-auto mb-4 opacity-20" />
                      <p>目前沒有收據紀錄</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 手機版卡片視圖 */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredReceipts.map(receipt => (
              <div key={receipt.id} className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-red-600 text-sm">{receipt.receipt_no}</div>
                    <div className="font-bold text-gray-900 mt-0.5">{receipt.payer_name}</div>
                    {receipt.tax_id && <div className="text-xs text-gray-500">統編: {receipt.tax_id}</div>}
                  </div>
                  {receipt.status === 'sent' ? (
                    <span className="px-2 py-1 rounded text-xs font-bold bg-green-50 text-green-700 shrink-0">已開立寄出</span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs font-bold bg-gray-50 text-gray-500 shrink-0">已開立</span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700">{translateFeeType(receipt.fee_type)}</span>
                  <div className="text-right">
                    <div className="font-bold">NT$ {receipt.amount.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{receipt.payment_method}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-400">
                  <span>{receipt.issue_date}{receipt.order_no ? ` · #${receipt.order_no}` : ''}</span>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handlePrint(receipt)} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 font-bold flex items-center gap-1"><FileText size={14} /> 檢視</button>
                    <button onClick={() => handleDelete(receipt.id, receipt.receipt_no)} className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
            {filteredReceipts.length === 0 && (
              <div className="p-12 text-center text-gray-400">
                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                <p>目前沒有收據紀錄</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedReceipt && (
        <ReceiptModal
          isOpen={!!selectedReceipt}
          onClose={() => {
            setSelectedReceipt(null);
            fetchReceipts(); // Refresh list after closing modal (in case of save)
          }}
          initialData={selectedReceipt}
        />
      )}
    </div>
  );
};

export default ReceiptManager;
