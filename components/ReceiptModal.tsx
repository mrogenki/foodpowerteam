import React, { useState, useRef, useEffect } from 'react';
import { X, Printer, Save, Loader2, Send, Mail } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import html2pdf from 'html2pdf.js';
import emailjs from '@emailjs/browser';
import { EMAIL_CONFIG, RECEIPT_STAMP_BUCKET, RECEIPT_STAMP_PATH } from '../constants';

export interface ReceiptData {
  receiptNo?: string;
  issueDate?: string;
  handlerName?: string;
  payerName: string;
  companyName?: string;
  taxId?: string;
  amount: number;
  paymentMethod?: string;
  feeType: 'initiation' | 'annual' | 'donation' | 'goods_donation';
  orderNo?: string;
  remarks?: string;
  email?: string;
  status?: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: ReceiptData;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, initialData }) => {
  // Convert current date to Gregorian year format (e.g., 2026年03月05日)
  const getFormattedDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  };

  const [date, setDate] = useState(initialData.issueDate || getFormattedDate());
  const [receiptNo, setReceiptNo] = useState(initialData.receiptNo || '');
  const [payerName, setPayerName] = useState(() => {
    if (initialData.companyName && !initialData.payerName.includes(initialData.companyName)) {
      return `${initialData.payerName}（${initialData.companyName}）`;
    }
    return initialData.payerName;
  });
  const [taxId, setTaxId] = useState(initialData.taxId || '');
  const [amount, setAmount] = useState(initialData.amount);
  const [paymentMethod, setPaymentMethod] = useState(initialData.paymentMethod || '信用卡');
  
  const [selectedFeeType, setSelectedFeeType] = useState(initialData.feeType);
  
  const [orderNo, setOrderNo] = useState(initialData.orderNo || '');
  const [remarks, setRemarks] = useState(initialData.remarks || '');
  const [handler, setHandler] = useState(() => {
    if (initialData.handlerName === '許暐梃') return '許暐脡';
    return initialData.handlerName || '許暐脡';
  });
  const [email, setEmail] = useState(initialData.email || '');
  const [status, setStatus] = useState(initialData.status || 'issued');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateReceipt, setDuplicateReceipt] = useState<any>(null);
  
  const [sealImage, setSealImage] = useState<string | null>(() => {
    return localStorage.getItem('receipt_seal_image') || null;
  });

  useEffect(() => {
    const checkDuplicate = async () => {
      // If we are editing an existing receipt, don't show duplicate warning for itself
      if (isOpen && orderNo && (!initialData.receiptNo || orderNo !== initialData.orderNo)) {
        setIsCheckingDuplicate(true);
        try {
          const { data, error } = await supabase
            .from('receipts')
            .select('*')
            .eq('order_no', orderNo)
            .neq('receipt_no', receiptNo || '')
            .maybeSingle();

          if (error) throw error;
          setDuplicateReceipt(data || null);
        } catch (err) {
          console.error('Error checking duplicate receipt:', err);
          setDuplicateReceipt(null);
        } finally {
          setIsCheckingDuplicate(false);
        }
      } else {
        setDuplicateReceipt(null);
      }
    };

    const timer = setTimeout(() => {
      checkDuplicate();
    }, 500); // Debounce check

    return () => clearTimeout(timer);
  }, [isOpen, orderNo, initialData.receiptNo, receiptNo, initialData.orderNo]);

  // 上傳印章 → 同步到 Storage（線上收據與所有收據共用同一顆），並轉 dataURL 即時預覽
  const handleSealUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setSealImage(base64String);
      localStorage.setItem('receipt_seal_image', base64String);
    };
    reader.readAsDataURL(file);
    if (!supabase) return;
    try {
      const { error } = await supabase.storage
        .from(RECEIPT_STAMP_BUCKET)
        .upload(RECEIPT_STAMP_PATH, file, { contentType: file.type, cacheControl: '300', upsert: true });
      if (error) throw error;
    } catch (err: any) {
      console.error('upload seal error:', err);
      alert('印章已套用於此收據，但上傳雲端失敗（線上收據可能無法同步）：' + (err.message || ''));
    }
  };

  // 開啟收據時，從 Storage 載入「統一印章」（轉 dataURL 以利 PDF 產生），沒設定就沿用 localStorage
  useEffect(() => {
    if (!isOpen || !supabase) return;
    const loadStamp = async () => {
      try {
        const baseUrl = supabase.storage.from(RECEIPT_STAMP_BUCKET).getPublicUrl(RECEIPT_STAMP_PATH).data.publicUrl;
        const resp = await fetch(`${baseUrl}?t=${Date.now()}`);
        if (!resp.ok) return;
        const blob = await resp.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const d = reader.result as string;
          setSealImage(d);
          localStorage.setItem('receipt_seal_image', d);
        };
        reader.readAsDataURL(blob);
      } catch (_) {
        /* 保留 localStorage 備援 */
      }
    };
    loadStamp();
  }, [isOpen]);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !initialData.receiptNo) {
      const generateReceiptNo = async () => {
        try {
          // Get today's date in YYYYMMDD format
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          const datePrefix = `${year}${month}${day}`;

          // Query the latest receipt for today
          const { data, error } = await supabase
            .from('receipts')
            .select('receipt_no')
            .like('receipt_no', `${datePrefix}%`)
            .order('receipt_no', { ascending: false })
            .limit(1);

          if (error) throw error;

          let nextSeq = 1;
          if (data && data.length > 0) {
            const lastNo = data[0].receipt_no;
            const lastSeqStr = lastNo.substring(8);
            const lastSeq = parseInt(lastSeqStr, 10);
            if (!isNaN(lastSeq)) {
              nextSeq = lastSeq + 1;
            }
          }

          const newReceiptNo = `${datePrefix}${String(nextSeq).padStart(3, '0')}`;
          setReceiptNo(newReceiptNo);
        } catch (err) {
          console.error('Error generating receipt number:', err);
        }
      };

      generateReceiptNo();
    }
  }, [isOpen, initialData.receiptNo]);

  if (!isOpen) return null;

  const performSave = async (silent = false, newStatus?: string) => {
    const finalStatus = newStatus || status;
    if (!receiptNo) {
      if (!silent) alert('請輸入收據編號');
      return false;
    }

    // Check for duplicate order_no if this is a new receipt or order_no changed
    if (orderNo && (!initialData.receiptNo || orderNo !== initialData.orderNo)) {
      try {
        const { data, error } = await supabase
          .from('receipts')
          .select('receipt_no')
          .eq('order_no', orderNo)
          .neq('receipt_no', receiptNo || '') // Exclude current receipt if updating
          .maybeSingle();
        
        if (data) {
          if (!silent) alert(`訂單編號 ${orderNo} 已經開立過收據 (編號: ${data.receipt_no})，不可重複開立。`);
          return false;
        }
      } catch (err) {
        console.error('Duplicate check error:', err);
      }
    }

    try {
      // 轉換為西元年儲存
      const match = date.match(/(\d+)年(\d+)月(\d+)日/);
      let issueDate = new Date().toISOString().split('T')[0];
      if (match) {
        const year = match[1];
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        issueDate = `${year}-${month}-${day}`;
      }

      const { error } = await supabase.from('receipts').upsert({
        receipt_no: receiptNo,
        payer_name: payerName,
        tax_id: taxId || null,
        amount: amount,
        payment_method: paymentMethod,
        fee_type: selectedFeeType,
        order_no: orderNo || null,
        issue_date: issueDate,
        handler_name: handler,
        note: remarks || null,
        status: finalStatus,
        email: email || null
      }, { onConflict: 'receipt_no' });

      if (error) throw error;
      if (newStatus) setStatus(newStatus);
      return true;
    } catch (err: any) {
      console.error('Error saving receipt:', err);
      if (!silent) alert('儲存失敗: ' + err.message);
      return false;
    }
  };

  const handleEmailReceipt = async () => {
    if (!email) {
      alert('請輸入收件人信箱');
      return;
    }
    if (!receiptNo) {
      alert('請先輸入收據編號');
      return;
    }

    setIsSending(true);
    try {
      if (!supabase) throw new Error('Supabase 客戶端未初始化');

      // 0. 先檢查是否有重複訂單編號 (如果是新收據或訂單編號已更改)
      if (orderNo && (!initialData.receiptNo || orderNo !== initialData.orderNo)) {
        const { data: dupData } = await supabase
          .from('receipts')
          .select('receipt_no')
          .eq('order_no', orderNo)
          .neq('receipt_no', receiptNo || '')
          .maybeSingle();
        
        if (dupData) {
          throw new Error(`訂單編號 ${orderNo} 已經開立過收據 (編號: ${dupData.receipt_no})，不可重複開立。`);
        }
      }

      // 1. 產生 PDF Blob
      const element = printRef.current;
      if (!element) throw new Error('找不到列印內容');

      element.classList.add('pdf-generating');

      const opt = {
        margin:       10,
        filename:     `收據_${receiptNo}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, windowWidth: 1200, scrollX: 0, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a5', orientation: 'landscape' as const }
      };
      
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      
      element.classList.remove('pdf-generating');

      // 2. 上傳到 Supabase Storage
      const fileName = `${Date.now()}_${receiptNo}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, pdfBlob, { contentType: 'application/pdf' });

      if (uploadError) throw new Error(`上傳失敗: ${uploadError.message}`);

      // 3. 取得公開連結
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // 4. 透過 EmailJS 寄送
      const templateParams = {
        email: email,        // 對應模板中的 {{email}}
        to_name: payerName,  // 對應模板中的 {{to_name}}
        order_id: receiptNo, // 對應模板中的 {{order_id}}
        amount: amount,      // 對應模板中的 {{amount}}
        receipt_link: publicUrl // 對應模板中的 {{receipt_link}}
      };

      const emailResponse = await emailjs.send(
        EMAIL_CONFIG.SERVICE_ID,
        EMAIL_CONFIG.RECEIPT_TEMPLATE_ID,
        templateParams,
        EMAIL_CONFIG.PUBLIC_KEY
      );

      if (emailResponse.status !== 200) {
        throw new Error(`EmailJS 寄送失敗: ${emailResponse.text}`);
      }

      // 自動儲存收據到資料庫，並標記為已寄出
      const saved = await performSave(true, 'sent');

      if (saved) {
        alert('收據已成功寄出並儲存！');
      } else {
        alert('收據已寄出，但儲存到資料庫時失敗 (可能是收據編號重複或網路問題)。');
      }
    } catch (err: any) {
      console.error('Email receipt error:', err);
      let errorMsg = '';
      
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === 'string') {
        errorMsg = err;
      } else if (err && typeof err === 'object') {
        errorMsg = err.text || err.message || JSON.stringify(err);
      }
      
      if (!errorMsg || errorMsg === 'undefined' || errorMsg === '{}') {
        errorMsg = '請檢查網路連線、EmailJS 模板設定 (template_receipt) 或 Supabase 儲存空間權限。';
      }
      
      alert('寄送失敗: ' + errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await performSave();
    if (success) {
      alert('收據儲存成功！');
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:p-0 print:bg-transparent">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto print:overflow-visible print:max-h-none print:shadow-none print:rounded-none">
        
        {/* Header - Hidden in print */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b print:hidden gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">開立收據</h2>
            {isCheckingDuplicate && <Loader2 size={18} className="animate-spin text-blue-500" />}
            {duplicateReceipt && (
              <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold animate-pulse">
                警告：此訂單已開立過收據 ({duplicateReceipt.receipt_no})
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border flex-grow md:flex-grow-0">
              <Mail size={18} className="text-gray-400" />
              <input 
                type="email" 
                placeholder="收件人信箱" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full md:w-48"
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleSave} 
                disabled={isSaving || !!duplicateReceipt}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                儲存
              </button>
              <button 
                onClick={handleEmailReceipt} 
                disabled={isSending || !email || !!duplicateReceipt}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold disabled:opacity-50"
              >
                {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} 
                寄送收據
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full ml-2">
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Printable Area Wrapper */}
        <div className="overflow-x-auto w-full">
          {/* Printable Area */}
          <div id="receipt-print-area" ref={printRef} className="p-8 print:p-0 bg-white text-black mx-auto" style={{ fontFamily: "'Noto Sans TC', sans-serif", width: '1000px', minWidth: '1000px' }}>
            
            {/* Receipt Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold tracking-widest mb-2">食在力量美食產業交流協會</h1>
            <h2 className="text-2xl font-bold tracking-[1em] ml-[1em]">收據</h2>
          </div>

          {/* Top Info */}
          <div className="mb-2 text-xl space-y-2">
            <div className="flex justify-between items-center">
              <p>立案字號：台內團字第1130012253號</p>
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 min-w-[280px]">
                <span>日期：</span>
                <input type="text" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent border-none outline-none flex-grow text-left print:appearance-none font-bold" />
                <span className="pdf-text flex-grow text-left font-bold">{date}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <p>統一編號：00509918</p>
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 min-w-[280px]">
                <span>編號：</span>
                <input type="text" value={receiptNo} onChange={e => setReceiptNo(e.target.value)} className="bg-transparent border-none outline-none flex-grow text-red-600 font-bold print:appearance-none" placeholder="00000" />
                <span className="pdf-text flex-grow text-red-600 font-bold">{receiptNo || '00000'}</span>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <table className="w-full border-collapse border border-black text-xl text-center">
            <tbody>
              {/* Row 1 */}
              <tr>
                <td className="border border-black bg-gray-100 font-bold py-3 w-[13%] whitespace-nowrap">茲收到</td>
                <td className="border border-black py-3 w-[57%] text-left px-4" colSpan={3}>
                  <input type="text" value={payerName} onChange={e => setPayerName(e.target.value)} className="w-full outline-none print:appearance-none font-bold" />
                  <span className="pdf-text w-full font-bold">{payerName}</span>
                </td>
                <td className="border border-black bg-gray-100 font-bold py-3 w-[15%]">統一編號</td>
                <td className="border border-black py-3 w-[15%]">
                  <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)} className="w-full outline-none text-center print:appearance-none font-bold" />
                  <span className="pdf-text w-full text-center font-bold">{taxId}</span>
                </td>
              </tr>
              
              {/* Row 2 */}
              <tr>
                <td className="border border-black bg-gray-100 font-bold py-3">NT$</td>
                <td className="border border-black py-3 text-left px-4" colSpan={3}>
                  <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full outline-none print:appearance-none font-bold" />
                  <span className="pdf-text w-full font-bold">{amount}</span>
                </td>
                <td className="border border-black bg-gray-100 font-bold py-3">支付方式</td>
                <td className="border border-black py-3">
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full outline-none text-center bg-transparent print:appearance-none font-bold">
                    <option value="信用卡">信用卡</option>
                    <option value="匯款">匯款</option>
                    <option value="現金">現金</option>
                    <option value="其他">其他</option>
                  </select>
                  <span className="pdf-text w-full text-center font-bold">{paymentMethod}</span>
                </td>
              </tr>

              {/* Row 3 - Combined Income Types */}
              <tr>
                <td className="border border-black bg-gray-100 font-bold py-3 whitespace-nowrap">款項項目</td>
                <td className="border border-black py-3 px-4" colSpan={5}>
                  <div className="grid grid-cols-4 gap-4 items-center w-full">
                    <label className="flex items-center gap-2 cursor-pointer relative whitespace-nowrap">
                      <input type="checkbox" checked={selectedFeeType === 'initiation'} onChange={() => setSelectedFeeType('initiation')} className="w-6 h-6 cursor-pointer" />
                      <div className="pdf-checkbox hidden w-6 h-6 border-2 border-gray-400 rounded-sm flex items-center justify-center bg-white flex-shrink-0">
                        {selectedFeeType === 'initiation' ? <div className="w-3 h-3 bg-blue-600 rounded-sm"></div> : <div className="w-3 h-3"></div>}
                      </div>
                      <span className="font-bold">入會費</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer relative whitespace-nowrap">
                      <input type="checkbox" checked={selectedFeeType === 'annual'} onChange={() => setSelectedFeeType('annual')} className="w-6 h-6 cursor-pointer" />
                      <div className="pdf-checkbox hidden w-6 h-6 border-2 border-gray-400 rounded-sm flex items-center justify-center bg-white flex-shrink-0">
                        {selectedFeeType === 'annual' ? <div className="w-3 h-3 bg-blue-600 rounded-sm"></div> : <div className="w-3 h-3"></div>}
                      </div>
                      <span className="font-bold">年費</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer relative whitespace-nowrap">
                      <input type="checkbox" checked={selectedFeeType === 'donation'} onChange={() => setSelectedFeeType('donation')} className="w-6 h-6 cursor-pointer" />
                      <div className="pdf-checkbox hidden w-6 h-6 border-2 border-gray-400 rounded-sm flex items-center justify-center bg-white flex-shrink-0">
                        {selectedFeeType === 'donation' ? <div className="w-3 h-3 bg-blue-600 rounded-sm"></div> : <div className="w-3 h-3"></div>}
                      </div>
                      <span className="font-bold">捐款</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer relative whitespace-nowrap">
                      <input type="checkbox" checked={selectedFeeType === 'goods_donation'} onChange={() => setSelectedFeeType('goods_donation')} className="w-6 h-6 cursor-pointer" />
                      <div className="pdf-checkbox hidden w-6 h-6 border-2 border-gray-400 rounded-sm flex items-center justify-center bg-white flex-shrink-0">
                        {selectedFeeType === 'goods_donation' ? <div className="w-3 h-3 bg-blue-600 rounded-sm"></div> : <div className="w-3 h-3"></div>}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-bold">捐物</span>
                        <span className="text-gray-400 text-[10px] font-normal leading-none">(若為捐物請於備註說明品項)</span>
                      </div>
                    </label>
                  </div>
                </td>
              </tr>

              {/* Row 5 */}
              <tr>
                <td className="border border-black bg-gray-100 font-bold py-3">訂單編號</td>
                <td className="border border-black py-3 text-left px-4" colSpan={3}>
                  <input type="text" value={orderNo} onChange={e => setOrderNo(e.target.value)} className="w-full outline-none print:appearance-none font-bold" />
                  <span className="pdf-text w-full font-bold">{orderNo}</span>
                </td>
                <td className="border border-black bg-gray-100 font-bold py-3" colSpan={2}>協會簽章</td>
              </tr>

              {/* Row 6 */}
              <tr>
                <td className="border border-black bg-gray-100 font-bold py-3 h-36 align-top pt-4">備註</td>
                <td className="border border-black py-3 text-left px-4 align-top pt-4" colSpan={3}>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full h-full outline-none resize-none print:appearance-none font-bold" rows={4} />
                  <span className="pdf-text w-full h-full font-bold whitespace-pre-wrap">{remarks}</span>
                </td>
                <td className="border border-black py-3 px-2 relative group align-middle text-center" colSpan={2}>
                  {sealImage ? (
                    <img
                      src={sealImage}
                      alt="協會簽章"
                      className="inline-block max-w-full object-contain opacity-90"
                      style={{ height: '110px' }}
                    />
                  ) : (
                    <span className="text-gray-400 text-xl">尚未設定印章</span>
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer print:hidden">
                    <span className="text-sm font-bold">{sealImage ? '更換印章' : '上傳印章'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleSealUpload} />
                  </label>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
        </div>
      </div>
      
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        /* PDF Generation Fallback Styles for html2canvas */
        .pdf-generating {
          background-color: white !important;
          padding: 20px !important;
        }
        .pdf-generating table {
          width: 100% !important;
          border-collapse: collapse !important;
          border: 1px solid black !important;
        }
        .pdf-generating td, .pdf-generating th {
          border: 1px solid black !important;
        }
        .pdf-generating .bg-gray-100 {
          background-color: #f3f4f6 !important;
        }
        .pdf-generating .text-red-600 {
          color: #dc2626 !important;
        }
        .pdf-generating .bg-blue-600 {
          background-color: #2563eb !important;
        }
        .pdf-generating .border-gray-400 {
          border: 2px solid #9ca3af !important;
        }
        .pdf-generating .print\:hidden {
          display: none !important;
        }
        .pdf-generating .grid {
          display: grid !important;
        }
        .pdf-generating .grid-cols-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }
        .pdf-generating .whitespace-nowrap {
          white-space: nowrap !important;
        }
        .pdf-generating .flex-shrink-0 {
          flex-shrink: 0 !important;
        }
        .pdf-generating .flex {
          display: flex !important;
        }
        .pdf-generating .items-center {
          align-items: center !important;
        }
        .pdf-generating .justify-between {
          justify-content: space-between !important;
        }
        .pdf-generating .justify-around {
          justify-content: space-around !important;
        }
        .pdf-generating .justify-center {
          justify-content: center !important;
        }
        .pdf-generating .flex-wrap {
          flex-wrap: wrap !important;
        }
        .pdf-generating .flex-grow {
          flex-grow: 1 !important;
        }
        .pdf-generating .font-bold {
          font-weight: bold !important;
        }
        .pdf-generating .text-center {
          text-align: center !important;
        }
        .pdf-generating .text-left {
          text-align: left !important;
        }
        .pdf-generating .gap-2 { gap: 0.5rem !important; }
        .pdf-generating .gap-4 { gap: 1rem !important; }
        .pdf-generating .gap-6 { gap: 1.5rem !important; }
        .pdf-generating .py-3 { padding-top: 0.75rem !important; padding-bottom: 0.75rem !important; }
        .pdf-generating .px-4 { padding-left: 1rem !important; padding-right: 1rem !important; }
        .pdf-generating .px-3 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
        .pdf-generating .py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
        .pdf-generating .pt-4 { padding-top: 1rem !important; }
        .pdf-generating .mb-2 { margin-bottom: 0.5rem !important; }
        .pdf-generating .mb-6 { margin-bottom: 1.5rem !important; }
        .pdf-generating .mt-4 { margin-top: 1rem !important; }
        .pdf-generating .ml-2 { margin-left: 0.5rem !important; }
        .pdf-generating .ml-1 { margin-left: 0.25rem !important; }
        .pdf-generating .w-full { width: 100% !important; }
        .pdf-generating .w-\[13\%\] { width: 13% !important; }
        .pdf-generating .w-\[57\%\] { width: 57% !important; }
        .pdf-generating .w-\[15\%\] { width: 15% !important; }
        .pdf-generating .min-w-\[280px\] { min-width: 280px !important; }
        .pdf-generating .h-full { height: 100% !important; }
        .pdf-generating .h-\[100px\] { height: 100px !important; }
        .pdf-generating .w-6 { width: 1.5rem !important; }
        .pdf-generating .h-6 { height: 1.5rem !important; }
        .pdf-generating .w-3 { width: 0.75rem !important; }
        .pdf-generating .h-3 { height: 0.75rem !important; }
        .pdf-generating .border-2 { border-width: 2px !important; }
        .pdf-generating .rounded-sm { border-radius: 0.125rem !important; }
        .pdf-generating .whitespace-pre-wrap { white-space: pre-wrap !important; }
        .pdf-generating .align-top { vertical-align: top !important; }
        .pdf-generating .align-middle { vertical-align: middle !important; }
        .pdf-generating .inline-block { display: inline-block !important; }
        .pdf-generating .relative { position: relative !important; }
        .pdf-generating .absolute { position: absolute !important; }
        .pdf-generating .inset-0 { top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important; }
        .pdf-generating .p-2 { padding: 0.5rem !important; }
        .pdf-generating .opacity-90 { opacity: 0.9 !important; }
        .pdf-generating .tracking-widest { letter-spacing: 0.1em !important; }
        .pdf-generating .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
        .pdf-generating .text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
        .pdf-generating .text-2xl { font-size: 1.5rem !important; line-height: 2rem !important; }
        .pdf-generating .text-3xl { font-size: 1.875rem !important; line-height: 2.25rem !important; }
        .pdf-generating .font-normal { font-weight: normal !important; }
        .pdf-generating .text-gray-400 { color: #9ca3af !important; }

        .pdf-generating input, .pdf-generating select, .pdf-generating textarea {
          display: none !important;
        }
        .pdf-generating .pdf-text {
          display: block !important;
        }
        .pdf-generating .pdf-checkbox {
          display: flex !important;
        }
        .pdf-text {
          display: none !important;
        }
        
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed.inset-0 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: transparent;
          }
          .fixed.inset-0 > div {
            box-shadow: none;
            max-width: 100%;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:appearance-none {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            border: none;
            background: transparent;
            color: black;
          }
          select.print\\:appearance-none {
            background-image: none;
          }
          input, textarea, select {
            font-family: 'Noto Sans TC', sans-serif !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            line-height: 1.5 !important;
            padding-top: 2px !important;
            padding-bottom: 2px !important;
          }
          /* Make sure the printable area and its children are visible */
          .fixed.inset-0, .fixed.inset-0 * {
            visibility: visible;
          }
          /* Hide scrollbars */
          ::-webkit-scrollbar {
            display: none;
          }
          /* Ensure the print area takes up the full width of the page */
          @page {
            size: A5 landscape;
            margin: 8mm;
          }
        }
      `}} />
    </div>
  );
};

export default ReceiptModal;
