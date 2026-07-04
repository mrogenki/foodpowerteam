import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { SignupSettings, SignupEntry } from '../types';
import { requestRefund } from '../utils/newebpay';
import { ListChecks, Copy, RefreshCw, RefreshCcw, Loader2 } from 'lucide-react';

// 後台：單一協會活動的接龍報名管理（開關 / 容量 / 逾時釋放 / 費用 / 名單 / 複製接龍文字 / 刷退）
const SignupAdminPanel: React.FC<{ activityId: string; isSuperAdmin?: boolean }> = ({ activityId, isSuperAdmin }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false); // 是否已建立接龍設定
  const [open, setOpen] = useState(true);
  const [capacity, setCapacity] = useState(0);
  const [feeAmount, setFeeAmount] = useState(0);
  const [deadlineHours, setDeadlineHours] = useState<string>(''); // 空 = 不自動釋放
  const [paymentMode, setPaymentMode] = useState<'online' | 'self'>('online');
  const [collectNote, setCollectNote] = useState('');
  const [entries, setEntries] = useState<SignupEntry[]>([]);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const load = async () => {
    if (!supabase || !activityId) return;
    setLoading(true);
    const [{ data: s }, { data: e }] = await Promise.all([
      supabase.from('signup_settings').select('*').eq('activity_id', activityId).maybeSingle(),
      supabase.from('signup_entries').select('*').eq('activity_id', activityId).order('created_at', { ascending: true }),
    ]);
    if (s) {
      const ss = s as SignupSettings;
      setEnabled(true);
      setOpen(ss.registration_open);
      setCapacity(ss.capacity);
      setFeeAmount(ss.fee_amount);
      setDeadlineHours(ss.payment_deadline_hours != null ? String(ss.payment_deadline_hours) : '');
      setPaymentMode(ss.payment_mode === 'self' ? 'self' : 'online');
      setCollectNote(ss.collect_note || '');
    } else {
      setEnabled(false);
    }
    setEntries((e as SignupEntry[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activityId]);

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    try {
      const dh = deadlineHours.trim() === '' ? null : Math.max(1, parseInt(deadlineHours, 10) || 0);
      const { error } = await supabase.rpc('signup_admin_update', {
        p_activity_id: activityId,
        p_capacity: Math.max(0, capacity || 0),
        p_open: open,
        p_deadline_hours: paymentMode === 'self' ? null : dh,
        p_fee_amount: Math.max(0, feeAmount || 0),
        p_payment_mode: paymentMode,
        p_collect_note: paymentMode === 'self' ? collectNote : '',
      });
      if (error) throw error;
      alert(enabled ? '已更新接龍報名設定' : '已開啟接龍報名！');
      await load();
    } catch (err: any) {
      alert(err.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async (entry: SignupEntry) => {
    if (!entry.merchant_order_no) { alert('此筆無金流單號，無法 API 刷退'); return; }
    if (!window.confirm(`確定要向藍新刷退「${entry.name}」的 NT$ 這筆款項嗎？\n成功後會自動釋出名額並遞補候補、作廢收據、沖銷收入。`)) return;
    setRefundingId(entry.id);
    try {
      const res = await requestRefund(entry.merchant_order_no, 'signup');
      if (res.ok) {
        const extra = `${res.receiptCancelled ? '\n對應收據已作廢' : ''}${res.incomeDeleted ? '\n收支管理已刪除收入' : ''}`;
        alert(`✅ 藍新刷退成功（${res.mode === 'cancel_auth' ? '取消授權／未請款交易' : '退款／已請款交易'}）\n藍新交易序號：${res.tradeNo || '—'}${extra}`);
        await load();
      } else {
        alert(`刷退失敗：${res.message || '未知錯誤'}`);
      }
    } catch (err: any) {
      alert(err.message || '刷退失敗');
    } finally {
      setRefundingId(null);
    }
  };

  const confirmed = entries.filter(e => e.status === 'confirmed' && e.payment_status !== 'refunded');
  const waitlist = entries.filter(e => e.status === 'waitlist');

  const copyChainText = () => {
    let text = confirmed.map((r, i) => `${i + 1}.${r.name}${r.company ? '/' + r.company : ''}`).join('\n');
    if (waitlist.length) {
      text += '\n額滿————\n' + waitlist.map((r, i) => `候補${i + 1} ${r.name}${r.company ? '/' + r.company : ''}`).join('\n');
    }
    navigator.clipboard.writeText(text).then(() => alert('已複製接龍文字')).catch(() => alert('複製失敗'));
  };

  const signupUrl = `${window.location.origin}/signup/${activityId}`;

  return (
    <div className="md:col-span-2 border-2 border-amber-200 bg-amber-50/40 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <ListChecks className="text-amber-600" size={20} />
        <h3 className="font-bold text-gray-900">接龍報名管理</h3>
        {enabled && <span className={`text-[11px] px-2 py-0.5 rounded-full text-white ${open ? 'bg-emerald-500' : 'bg-gray-400'}`}>{open ? '開放中' : '已關閉'}</span>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-4"><Loader2 className="animate-spin" size={16} /> 載入中…</div>
      ) : (
        <>
          {/* 收款方式 */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-600 mb-1">收款方式</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPaymentMode('online')}
                className={`px-4 py-2 rounded-lg text-sm font-bold border ${paymentMode === 'online' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                線上金流（藍新）
              </button>
              <button type="button" onClick={() => setPaymentMode('self')}
                className={`px-4 py-2 rounded-lg text-sm font-bold border ${paymentMode === 'self' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                發起人自主收款
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {paymentMode === 'online' ? '報名確認後導向藍新繳費；可設逾時未付款自動釋放名額。' : '不經線上金流，由主辦自行收款（現場/匯款等）；不做逾時釋放。'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={open} onChange={e => setOpen(e.target.checked)} className="w-4 h-4" />
              開放報名
            </label>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">正取容量</label>
              <input type="number" min={0} value={capacity} onChange={e => setCapacity(parseInt(e.target.value, 10) || 0)}
                className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">報名費用 (NT$)</label>
              <input type="number" min={0} value={feeAmount} onChange={e => setFeeAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full p-2 border rounded" />
            </div>
            {paymentMode === 'online' && (
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">逾時釋放時數（空 = 不自動釋放）</label>
                <input type="number" min={1} value={deadlineHours} onChange={e => setDeadlineHours(e.target.value)} placeholder="例如 24"
                  className="w-full p-2 border rounded" />
              </div>
            )}
            {paymentMode === 'self' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">繳費說明（顯示給報名者，例如匯款帳號/現場繳費）</label>
                <textarea value={collectNote} onChange={e => setCollectNote(e.target.value)} rows={2} placeholder="例：請匯款至 玉山銀行 808 帳號 xxxx，並私訊主辦。"
                  className="w-full p-2 border rounded" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button type="button" onClick={handleSave} disabled={saving}
              className="bg-amber-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-amber-700 transition-colors disabled:opacity-50">
              {saving ? '儲存中…' : enabled ? '更新設定' : '開啟接龍報名'}
            </button>
            <button type="button" onClick={load} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
              <RefreshCw size={14} /> 重新整理
            </button>
            {enabled && (
              <button type="button" onClick={copyChainText} className="inline-flex items-center gap-1 text-sm font-bold text-amber-700 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100">
                <Copy size={14} /> 複製接龍文字
              </button>
            )}
          </div>

          {enabled && (
            <div className="mt-4 text-xs">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-gray-500">報名連結：</span>
                <code className="bg-white border px-2 py-1 rounded text-gray-700 break-all">{signupUrl}</code>
                <button type="button" onClick={() => navigator.clipboard.writeText(signupUrl).then(() => alert('已複製連結'))} className="text-amber-700 font-bold">複製</button>
              </div>
              <div className="flex gap-4 mb-2 text-gray-600 font-medium">
                <span>正取 {confirmed.length}/{capacity}</span>
                <span>候補 {waitlist.length}</span>
                {paymentMode === 'online' && <span>已付款 {entries.filter(e => e.payment_status === 'paid').length}</span>}
              </div>
              {entries.length > 0 && (
                <div className="overflow-x-auto bg-white rounded-lg border">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-3 py-2">#</th><th className="px-3 py-2">姓名</th><th className="px-3 py-2">公司/品牌</th>
                        <th className="px-3 py-2">電話</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">狀態</th><th className="px-3 py-2">付款</th>
                        {isSuperAdmin && <th className="px-3 py-2">操作</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((r, i) => (
                        <tr key={r.id} className="border-t">
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{r.name}</td>
                          <td className="px-3 py-2">{r.company || '—'}</td>
                          <td className="px-3 py-2">{r.phone || '—'}</td>
                          <td className="px-3 py-2">{r.email || '—'}</td>
                          <td className="px-3 py-2">{r.payment_status === 'refunded' ? <span className="text-gray-400">—</span> : r.status === 'confirmed' ? '正取' : '候補'}</td>
                          <td className="px-3 py-2">
                            {r.payment_status === 'paid' ? <span className="text-emerald-600 font-bold">已付</span>
                              : r.payment_status === 'refunded' ? <span className="text-gray-400">已退費</span>
                              : <span className="text-gray-400">未付</span>}
                          </td>
                          {isSuperAdmin && (
                            <td className="px-3 py-2">
                              {r.payment_status === 'paid' && (
                                <button type="button" onClick={() => handleRefund(r)} disabled={refundingId === r.id}
                                  className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-bold inline-flex items-center gap-1 hover:bg-red-100 disabled:opacity-50"
                                  title="向藍新真實刷退（自動釋位遞補、作廢收據、沖銷收入）">
                                  <RefreshCcw size={12} /> {refundingId === r.id ? '刷退中…' : '刷退'}
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SignupAdminPanel;
