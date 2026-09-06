import React, { useEffect, useState } from 'react';
import liff from '@line/liff';
import { supabase } from '../utils/supabaseClient';
import { Loader2, UserCheck, Coins, CalendarClock, ClipboardList, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';

// 會員專區 LIFF（LINE 內）：綁定 LINE 身分 → 查會籍 / 點數 / 報名
const MEMBER_LIFF_ID = ((import.meta as any)?.env?.VITE_LIFF_MEMBER_ID as string) || '2010533806-E7Dmp1Mc';

interface Portal {
  member_no: string; name: string; industry_category: string | null; company: string | null;
  membership_expiry_date: string | null; status: string | null; is_active: boolean;
  points_balance: number; phone: string | null; email: string | null;
}
interface Ledger { change: number; balance_after: number; type: string | null; reason: string | null; created_at: string; }
interface Reg { source: string; title: string | null; activity_date: string | null; status: string; payment_status: string; amount: number; ref_id: string; token: string | null; created_at: string; }

type Phase = { kind: 'loading'; msg: string } | { kind: 'bind' } | { kind: 'portal' } | { kind: 'error'; msg: string };

const twDate = (ts: string) => { try { return new Date(ts).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }); } catch { return ts; } };

export default function LiffMember() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading', msg: '初始化 LINE...' });
  const [userId, setUserId] = useState('');
  const [portal, setPortal] = useState<Portal | null>(null);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [tab, setTab] = useState<'membership' | 'points' | 'regs'>('membership');
  // 綁定表單
  const [bPhone, setBPhone] = useState('');
  const [bName, setBName] = useState('');
  const [bBirthday, setBBirthday] = useState('');
  const [binding, setBinding] = useState(false);

  const loadPortal = async (uid: string) => {
    if (!supabase) return false;
    const { data } = await supabase.rpc('member_portal_by_line', { p_line_user_id: uid });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return false;
    setPortal(row as Portal);
    const [{ data: led }, { data: rg }] = await Promise.all([
      supabase.rpc('member_points_ledger_by_line', { p_line_user_id: uid }),
      supabase.rpc('member_registrations_by_line', { p_line_user_id: uid }),
    ]);
    setLedger((led as Ledger[]) || []);
    setRegs((rg as Reg[]) || []);
    return true;
  };

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) { setPhase({ kind: 'error', msg: '系統未連線，請稍後再試' }); return; }
        try { await liff.init({ liffId: MEMBER_LIFF_ID }); }
        catch (e: any) { setPhase({ kind: 'error', msg: 'LINE 初始化失敗：' + (e?.message || e) }); return; }
        if (!liff.isLoggedIn()) { liff.login({ redirectUri: window.location.href }); return; }
        const prof = await liff.getProfile();
        setUserId(prof.userId);
        setBName(prof.displayName || '');
        setPhase({ kind: 'loading', msg: '載入會員資料...' });
        const ok = await loadPortal(prof.userId);
        setPhase(ok ? { kind: 'portal' } : { kind: 'bind' });
      } catch (e: any) {
        setPhase({ kind: 'error', msg: '發生錯誤：' + (e?.message ?? String(e)) });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitBind = async () => {
    if (!supabase || !userId) return;
    if (!bPhone.trim() || !bName.trim() || !bBirthday.trim()) { alert('請填寫手機、姓名、生日'); return; }
    setBinding(true);
    try {
      const { error } = await supabase.rpc('member_bind_line', {
        p_line_user_id: userId, p_phone: bPhone.trim(), p_name: bName.trim(), p_birthday: bBirthday.trim(),
      });
      if (error) throw error;
      setPhase({ kind: 'loading', msg: '綁定成功，載入中...' });
      const ok = await loadPortal(userId);
      setPhase(ok ? { kind: 'portal' } : { kind: 'error', msg: '綁定後讀取失敗，請重試' });
    } catch (e: any) {
      alert(e?.message || '綁定失敗，請確認資料是否與入會時一致');
    } finally {
      setBinding(false);
    }
  };

  const goPaySignup = (r: Reg) => { if (r.token) window.location.href = `/pay-signup/${r.ref_id}?token=${r.token}`; };
  const goPayActivity = (r: Reg) => { window.location.href = `/pay-activity/${r.ref_id}`; };

  if (phase.kind === 'loading' || phase.kind === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          {phase.kind === 'loading' ? (
            <><Loader2 className="animate-spin text-red-600 mx-auto mb-4" size={40} /><p className="text-gray-600">{phase.msg}</p></>
          ) : (
            <><div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={28} /></div><p className="text-red-600 font-medium">{phase.msg}</p></>
          )}
        </div>
      </div>
    );
  }

  if (phase.kind === 'bind') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-6 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3"><UserCheck size={28} /></div>
            <h1 className="text-xl font-bold text-gray-900">綁定會員身分</h1>
            <p className="text-sm text-gray-500 mt-1">首次使用請驗證，之後免再輸入</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">手機號碼</label>
              <input value={bPhone} onChange={e => setBPhone(e.target.value)} inputMode="tel" placeholder="入會時填的手機"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">姓名</label>
              <input value={bName} onChange={e => setBName(e.target.value)} placeholder="真實姓名"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">生日</label>
              <input type="date" value={bBirthday} onChange={e => setBBirthday(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600" />
            </div>
            <button onClick={submitBind} disabled={binding}
              className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-red-200 disabled:opacity-50">
              {binding ? '驗證中…' : '綁定'}
            </button>
            <p className="text-xs text-center text-gray-400">需與入會登記的手機、姓名、生日一致</p>
          </div>
        </div>
      </div>
    );
  }

  // portal
  const p = portal!;
  const expiryLabel = p.membership_expiry_date || '—';
  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-md mx-auto px-4 pt-6">
        {/* 會員抬頭 */}
        <div className="bg-gradient-to-br from-red-600 to-orange-500 rounded-3xl p-6 text-white shadow-lg shadow-orange-200 mb-4">
          <p className="text-orange-100 text-xs">食在力量 會員專區</p>
          <h1 className="text-2xl font-bold mt-1">{p.name}</h1>
          <p className="text-orange-100 text-sm mt-0.5">會員編號 #{(p.member_no || '').padStart(5, '0')}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-sm font-bold">
            {p.is_active ? <><CheckCircle2 size={15} /> 會籍有效</> : <><AlertCircle size={15} /> 會籍已過期</>}
          </div>
        </div>

        {/* 分頁 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {([['membership', '會籍', CalendarClock], ['points', '點數', Coins], ['regs', '報名', ClipboardList]] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`py-2.5 rounded-xl text-sm font-bold flex flex-col items-center gap-1 border transition-all ${tab === k ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-500 border-gray-200'}`}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>

        {/* 會籍 */}
        {tab === 'membership' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 text-sm">
            <Row label="姓名" value={p.name} />
            <Row label="會員編號" value={`#${(p.member_no || '').padStart(5, '0')}`} />
            {p.company && <Row label="公司/品牌" value={p.company} />}
            {p.industry_category && <Row label="產業別" value={p.industry_category} />}
            <Row label="會籍到期日" value={expiryLabel} />
            <Row label="會籍狀態" value={p.is_active ? '有效' : '已過期／未生效'} valueClass={p.is_active ? 'text-emerald-600' : 'text-red-500'} />
            {!p.is_active && (
              <a href="/renew" className="block mt-2 w-full bg-red-600 text-white py-3 rounded-xl font-bold text-center">前往續費</a>
            )}
          </div>
        )}

        {/* 點數 */}
        {tab === 'points' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
              <p className="text-xs text-gray-400 font-bold">目前點數</p>
              <p className="text-4xl font-extrabold text-red-600 mt-1">{p.points_balance.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-bold text-gray-700 mb-2">點數明細</p>
              {ledger.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">尚無點數紀錄</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {ledger.map((l, i) => (
                    <li key={i} className="flex items-center justify-between py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 truncate">{l.reason || l.type || '點數異動'}</p>
                        <p className="text-xs text-gray-400">{twDate(l.created_at)}</p>
                      </div>
                      <span className={`font-bold text-sm shrink-0 ml-3 ${l.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {l.change >= 0 ? '+' : ''}{l.change.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* 報名 */}
        {tab === 'regs' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            {regs.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">目前沒有報名紀錄</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {regs.map((r, i) => {
                  const paid = r.payment_status === 'paid';
                  const needPay = !paid && r.status === 'confirmed' && r.amount > 0;
                  return (
                    <li key={i} className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 text-sm truncate">{r.title || '活動'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {r.activity_date || ''}・{r.source === 'signup' ? '接龍報名' : '活動報名'}
                            {r.status === 'waitlist' && '・候補'}
                          </p>
                        </div>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${paid ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {paid ? '已付款' : r.amount > 0 ? '未付款' : '免費'}
                        </span>
                      </div>
                      {needPay && (
                        <button onClick={() => r.source === 'signup' ? goPaySignup(r) : goPayActivity(r)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-white bg-red-600 px-3 py-1.5 rounded-lg">
                          <CreditCard size={13} /> {r.source === 'signup' ? '前往付款／填繳費' : '前往付款'}（NT$ {r.amount.toLocaleString()}）
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}</span>
      <span className={`font-bold text-gray-900 text-right ${valueClass || ''}`}>{value}</span>
    </div>
  );
}
