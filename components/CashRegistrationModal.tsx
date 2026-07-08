import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Activity, MemberActivity } from '../types';
import { X, Banknote, Loader2 } from 'lucide-react';

// 現場現金收款：一次完成「建立報名 + 標記現金已付 + 記入收支（選配開收據）」
const CashRegistrationModal: React.FC<{
  activity: Activity | MemberActivity;
  onClose: () => void;
  onDone: () => void;
}> = ({ activity, onClose, onDone }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [companyTitle, setCompanyTitle] = useState('');
  const [taxId, setTaxId] = useState('');
  const [amount, setAmount] = useState<number>(Number((activity as any).price) || 0);
  const [issueReceipt, setIssueReceipt] = useState(false);
  const [checkIn, setCheckIn] = useState(true);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!supabase) return;
    if (!name.trim()) { alert('請填寫姓名'); return; }
    if (issueReceipt && amount <= 0) { alert('金額為 0 無法開立收據，請取消勾選或填入金額'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('handle_cash_registration', {
        p_activity_id: String(activity.id),
        p_name: name, p_phone: phone, p_email: email,
        p_company: company, p_company_title: companyTitle, p_tax_id: taxId, p_title: title,
        p_amount: Math.max(0, Math.round(amount) || 0),
        p_issue_receipt: issueReceipt,
        p_check_in: checkIn,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      alert(`✅ 已完成現金收款\n姓名：${name}\n金額：NT$ ${amount.toLocaleString()}${checkIn ? '\n已同時標記報到' : ''}${row?.receipt_no ? `\n收據號：${row.receipt_no}` : ''}`);
      onDone();
      onClose();
    } catch (err: any) {
      alert(err.message || '建立失敗');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-red-500';

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Banknote className="text-green-600" size={22} />
            <h3 className="text-lg font-bold text-gray-900">現場現金收款</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={22} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            活動：<span className="font-bold text-gray-700">{activity.title}</span>　完成後將建立一筆「已付款（現金）」報名並記入收支管理。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">姓名 <span className="text-red-600">*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="參加者姓名" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">電話</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="手機號碼" inputMode="tel" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">公司 / 品牌</label>
              <input value={company} onChange={e => setCompany(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">職務</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1">收款金額 (NT$) <span className="text-red-600">*</span></label>
              <input type="number" min={0} value={amount} onChange={e => setAmount(parseInt(e.target.value, 10) || 0)} className={inputCls} />
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={checkIn} onChange={e => setCheckIn(e.target.checked)} className="w-4 h-4" />
              同時標記已報到（現場人已到）
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={issueReceipt} onChange={e => setIssueReceipt(e.target.checked)} className="w-4 h-4" />
              同時開立收據
            </label>
            {issueReceipt && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Email（寄送收據）</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="收據寄送信箱" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">公司抬頭</label>
                  <input value={companyTitle} onChange={e => setCompanyTitle(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">統一編號</label>
                  <input value={taxId} onChange={e => setTaxId(e.target.value)} className={inputCls} placeholder="8 位數字" inputMode="numeric" maxLength={8} />
                </div>
                <p className="sm:col-span-2 text-[11px] text-gray-400">收據建立後為「已開立」，如需寄送 email 可於報名名單再寄。</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold hover:bg-gray-200">取消</button>
          <button onClick={submit} disabled={saving} className="px-6 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2">
            {saving ? <><Loader2 size={16} className="animate-spin" /> 處理中…</> : <><Banknote size={16} /> 收款並建單</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CashRegistrationModal;
