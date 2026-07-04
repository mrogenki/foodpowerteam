import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { SignupSettings, SignupEntry } from '../types';
import { ListChecks, Copy, RefreshCw, Loader2 } from 'lucide-react';

// 後台：單一協會活動的接龍報名管理（開關 / 容量 / 逾時釋放 / 費用 / 名單 / 複製接龍文字）
const SignupAdminPanel: React.FC<{ activityId: string }> = ({ activityId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false); // 是否已建立接龍設定
  const [open, setOpen] = useState(true);
  const [capacity, setCapacity] = useState(0);
  const [feeAmount, setFeeAmount] = useState(0);
  const [deadlineHours, setDeadlineHours] = useState<string>(''); // 空 = 不自動釋放
  const [entries, setEntries] = useState<SignupEntry[]>([]);

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
        p_deadline_hours: dh,
        p_fee_amount: Math.max(0, feeAmount || 0),
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

  const confirmed = entries.filter(e => e.status === 'confirmed');
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
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">逾時釋放時數（空 = 不自動釋放）</label>
              <input type="number" min={1} value={deadlineHours} onChange={e => setDeadlineHours(e.target.value)} placeholder="例如 24"
                className="w-full p-2 border rounded" />
            </div>
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
                <span>已付款 {entries.filter(e => e.payment_status === 'paid').length}</span>
              </div>
              {entries.length > 0 && (
                <div className="overflow-x-auto bg-white rounded-lg border">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-3 py-2">#</th><th className="px-3 py-2">姓名</th><th className="px-3 py-2">公司/品牌</th>
                        <th className="px-3 py-2">電話</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">狀態</th><th className="px-3 py-2">付款</th>
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
                          <td className="px-3 py-2">{r.status === 'confirmed' ? '正取' : '候補'}</td>
                          <td className="px-3 py-2">{r.payment_status === 'paid' ? <span className="text-emerald-600 font-bold">已付</span> : <span className="text-gray-400">未付</span>}</td>
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
