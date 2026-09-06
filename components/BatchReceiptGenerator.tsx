import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import html2pdf from 'html2pdf.js';
import { ReceiptData } from './ReceiptModal';

interface BatchReceiptGeneratorProps {
  receiptsToProcess: ReceiptData[];
  onProgress: (current: number, total: number) => void;
  onComplete: (successCount: number, failCount: number) => void;
}

const BatchReceiptGenerator: React.FC<BatchReceiptGeneratorProps> = ({ receiptsToProcess, onProgress, onComplete }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sealImage, setSealImage] = useState<string | null>(() => {
    return localStorage.getItem('receipt_seal_image') || null;
  });

  useEffect(() => {
    if (receiptsToProcess.length > 0 && !isProcessing && currentIndex === 0) {
      setIsProcessing(true);
      processNext();
    }
  }, [receiptsToProcess]);

  const processNext = async () => {
    if (currentIndex >= receiptsToProcess.length) {
      onComplete(successCount, failCount);
      setIsProcessing(false);
      return;
    }

    const currentReceipt = receiptsToProcess[currentIndex];
    onProgress(currentIndex + 1, receiptsToProcess.length);

    try {
      // Wait for React to render the current receipt
      await new Promise(resolve => setTimeout(resolve, 500));

      const element = printRef.current;
      if (!element) throw new Error('找不到列印內容');

      element.classList.add('pdf-generating');

      const opt = {
        margin:       10,
        filename:     `收據_${currentReceipt.receiptNo}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, windowWidth: 1200, scrollX: 0, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
      };
      
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      
      element.classList.remove('pdf-generating');

      if (currentReceipt.email) {
        const fileName = `${Date.now()}_${currentReceipt.receiptNo}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, pdfBlob, { contentType: 'application/pdf' });

        if (uploadError) throw new Error(`上傳失敗: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);

        const { data: emailResult, error: fnErr } = await supabase.functions.invoke('send-email', {
          body: {
            template: 'receipt',
            params: {
              to_email: currentReceipt.email,
              to_name: currentReceipt.payerName,
              order_id: currentReceipt.receiptNo,
              amount: currentReceipt.amount,
              receipt_link: publicUrl,
            },
          },
        });
        if (fnErr || !(emailResult as any)?.ok) {
          throw new Error(`收據寄送失敗: ${fnErr?.message || (emailResult as any)?.error || '未知錯誤'}`);
        }
      }

      // Update status to sent if email was provided, else keep as issued
      const finalStatus = currentReceipt.email ? 'sent' : 'issued';

      const { error } = await supabase.from('receipts').upsert({
        receipt_no: currentReceipt.receiptNo,
        payer_name: currentReceipt.payerName,
        tax_id: currentReceipt.taxId || null,
        amount: currentReceipt.amount,
        payment_method: currentReceipt.paymentMethod,
        fee_type: currentReceipt.feeType,
        order_no: currentReceipt.orderNo || null,
        issue_date: currentReceipt.issueDate,
        handler_name: currentReceipt.handlerName,
        note: currentReceipt.remarks || null,
        status: finalStatus,
        email: currentReceipt.email || null
      }, { onConflict: 'receipt_no' });

      if (error) throw error;

      setSuccessCount(prev => prev + 1);
    } catch (err) {
      console.error(`Error processing receipt ${currentReceipt.receiptNo}:`, err);
      setFailCount(prev => prev + 1);
    }

    setCurrentIndex(prev => prev + 1);
  };

  useEffect(() => {
    if (isProcessing && currentIndex > 0 && currentIndex <= receiptsToProcess.length) {
      processNext();
    }
  }, [currentIndex]);

  if (receiptsToProcess.length === 0 || currentIndex >= receiptsToProcess.length) return null;

  const currentReceipt = receiptsToProcess[currentIndex];

  return (
    <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
      <div id="receipt-print-area" ref={printRef} className="p-8 print:p-0 bg-white text-black mx-auto" style={{ fontFamily: "'Noto Sans TC', sans-serif", width: '1000px', minWidth: '1000px' }}>
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold tracking-widest mb-2">食在力量美食產業交流協會</h1>
          <h2 className="text-2xl font-bold tracking-[1em] ml-[1em]">收據</h2>
        </div>

        <div className="mb-2 text-xl space-y-2">
          <div className="flex justify-between items-center">
            <p>立案字號：台內團字第1130012253號</p>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 min-w-[280px]">
              <span>日期：</span>
              <span className="pdf-text flex-grow text-left font-bold">{currentReceipt.issueDate}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <p>統一編號：00509918</p>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 min-w-[280px]">
              <span>編號：</span>
              <span className="pdf-text flex-grow text-red-600 font-bold">{currentReceipt.receiptNo}</span>
            </div>
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-xl text-center">
          <tbody>
            <tr>
              <td className="border border-black bg-gray-100 font-bold py-3 w-[13%] whitespace-nowrap">茲收到</td>
              <td className="border border-black py-3 w-[57%] text-left px-4" colSpan={3}>
                <span className="pdf-text w-full font-bold">{currentReceipt.payerName}</span>
              </td>
              <td className="border border-black bg-gray-100 font-bold py-3 w-[15%]">統一編號</td>
              <td className="border border-black py-3 w-[15%]">
                <span className="pdf-text w-full text-center font-bold">{currentReceipt.taxId || ''}</span>
              </td>
            </tr>
            
            <tr>
              <td className="border border-black bg-gray-100 font-bold py-3">NT$</td>
              <td className="border border-black py-3 text-left px-4" colSpan={3}>
                <span className="pdf-text w-full font-bold">{currentReceipt.amount}</span>
              </td>
              <td className="border border-black bg-gray-100 font-bold py-3">支付方式</td>
              <td className="border border-black py-3">
                <span className="pdf-text w-full text-center font-bold">{currentReceipt.paymentMethod}</span>
              </td>
            </tr>

            <tr>
              <td className="border border-black bg-gray-100 font-bold py-3 whitespace-nowrap">款項項目</td>
              <td className="border border-black py-3 px-4" colSpan={5}>
                <div className="flex flex-wrap items-center justify-around gap-4">
                  <label className="flex items-center gap-2 relative">
                    <div className="pdf-checkbox w-6 h-6 border-2 border-gray-400 rounded-sm flex items-center justify-center bg-white">
                      {currentReceipt.feeType === 'initiation' && <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>}
                    </div>
                    <span className="font-bold">入會費</span>
                  </label>
                  <label className="flex items-center gap-2 relative">
                    <div className="pdf-checkbox w-6 h-6 border-2 border-gray-400 rounded-sm flex items-center justify-center bg-white">
                      {currentReceipt.feeType === 'annual' && <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>}
                    </div>
                    <span className="font-bold">年費</span>
                  </label>
                  <label className="flex items-center gap-2 relative">
                    <div className="pdf-checkbox w-6 h-6 border-2 border-gray-400 rounded-sm flex items-center justify-center bg-white">
                      {currentReceipt.feeType === 'donation' && <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>}
                    </div>
                    <span className="font-bold">捐款</span>
                  </label>
                  <label className="flex items-center gap-2 relative">
                    <div className="pdf-checkbox w-6 h-6 border-2 border-gray-400 rounded-sm flex items-center justify-center bg-white">
                      {currentReceipt.feeType === 'goods_donation' && <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>}
                    </div>
                    <span className="font-bold">捐物</span>
                    <span className="text-gray-400 text-sm font-normal ml-1">(若為捐物請於備註說明品項)</span>
                  </label>
                </div>
              </td>
            </tr>

            <tr>
              <td className="border border-black bg-gray-100 font-bold py-3">訂單編號</td>
              <td className="border border-black py-3 text-left px-4" colSpan={3}>
                <span className="pdf-text w-full font-bold">{currentReceipt.orderNo || ''}</span>
              </td>
              <td className="border border-black bg-gray-100 font-bold py-3" colSpan={2}>協會簽章</td>
            </tr>

            <tr>
              <td className="border border-black bg-gray-100 font-bold py-3 h-36 align-top pt-4">備註</td>
              <td className="border border-black py-3 text-left px-4 align-top pt-4" colSpan={3}>
                <span className="pdf-text w-full h-full font-bold whitespace-pre-wrap">{currentReceipt.remarks || ''}</span>
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
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-between items-center mt-4 text-xl font-bold">
          <div>理事長：<span className="ml-2">許淳凱</span></div>
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-1">
            <span>經手人：</span>
            <span className="pdf-text font-bold">{currentReceipt.handlerName}</span>
          </div>
        </div>

        <div className="mt-4 text-red-600 font-bold text-xl flex gap-6">
          <span>台北富邦-古亭分行</span>
          <span>戶名：食在力量美食產業交流協會</span>
          <span>帳號：82120000168305</span>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
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
          border-color: #9ca3af !important;
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
        .pdf-generating .pdf-text { display: block !important; }
        .pdf-generating .pdf-checkbox { display: flex !important; }
      `}} />
    </div>
  );
};

export default BatchReceiptGenerator;
