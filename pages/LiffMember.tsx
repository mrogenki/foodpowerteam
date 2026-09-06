import React, { useEffect, useState } from 'react';
import liff from '@line/liff';
import { supabase } from '../utils/supabaseClient';
import { Loader2, UserCheck, Coins, CalendarClock, ClipboardList, CreditCard, AlertCircle, CheckCircle2, Share2, User, Pencil, Camera, X, Save } from 'lucide-react';
import { MemberCardData, buildMemberShareMessages } from '../utils/memberCard';
import { IndustryCategories } from '../types';

// 會員可自助編輯的欄位（會籍/繳費/點數/會員編號/身分欄位皆鎖定，不在此列）
interface EditForm {
  phone: string; home_phone: string; email: string; address: string;
  brand_name: string; company_title: string; tax_id: string; job_title: string;
  industry_category: string;
  website: string; main_service: string; picture: string;
}
const EMPTY_EDIT: EditForm = {
  phone: '', home_phone: '', email: '', address: '',
  brand_name: '', company_title: '', tax_id: '', job_title: '',
  industry_category: '', website: '', main_service: '', picture: '',
};

// 會員專區 LIFF（LINE 內）：綁定 LINE 身分 → 查會籍 / 點數 / 報名
const MEMBER_LIFF_ID = ((import.meta as any)?.env?.VITE_LIFF_MEMBER_ID as string) || '2010533806-E7Dmp1Mc';

interface Portal {
  member_no: string; name: string;
  industry_chain: string | null; industry_category: string | null;
  company: string | null; company_title: string | null; job_title: string | null;
  membership_expiry_date: string | null; status: string | null; is_active: boolean;
  points_balance: number;
  picture: string | null;
  phone: string | null; home_phone: string | null; address: string | null; email: string | null;
  main_service: string | null; tax_id: string | null;
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
  const [canShare, setCanShare] = useState(false);
  const [sharingCard, setSharingCard] = useState(false);
  // 編輯資料
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT);
  const [savingEdit, setSavingEdit] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
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
        // isApiAvailable 在 iOS LINE 內建瀏覽器有時誤報 false，
        // 故只要在 LINE 內(isInClient)就允許嘗試，實際能否用交給 shareTargetPicker try/catch。
        setCanShare(liff.isInClient() || liff.isApiAvailable('shareTargetPicker'));
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

  // 分享「自己的」電子名片：以綁定的 line_user_id 直接取本人名片 → shareTargetPicker
  const shareMyCard = async () => {
    if (!supabase || !userId) return;
    if (typeof (liff as any).shareTargetPicker !== 'function') {
      alert('此環境不支援分享，請在 LINE App 內開啟本頁');
      return;
    }
    setSharingCard(true);
    try {
      const { data, error } = await supabase.rpc('member_card_by_line', { p_line_user_id: userId });
      const card = (Array.isArray(data) ? data[0] : data) as MemberCardData | undefined;
      if (error || !card) { alert('取得名片資料失敗，請稍後再試'); return; }
      const { messages } = buildMemberShareMessages([card]);
      await liff.shareTargetPicker(messages);
    } catch (e: any) {
      alert('分享失敗：' + (e?.message ?? String(e)));
    } finally {
      setSharingCard(false);
    }
  };

  // 進入編輯：載入可編輯欄位原始值
  const openEdit = async () => {
    if (!supabase || !userId) return;
    try {
      const { data } = await supabase.rpc('member_editable_by_line', { p_line_user_id: userId });
      const row = (Array.isArray(data) ? data[0] : data) || {};
      setEditForm({
        phone: row.phone || '', home_phone: row.home_phone || '', email: row.email || '', address: row.address || '',
        brand_name: row.brand_name || '', company_title: row.company_title || '', tax_id: row.tax_id || '', job_title: row.job_title || '',
        industry_category: row.industry_category || '',
        website: row.website || '', main_service: row.main_service || '', picture: row.picture || '',
      });
      setEditing(true);
    } catch (e: any) {
      alert('載入資料失敗，請稍後再試');
    }
  };

  const setField = (k: keyof EditForm, v: string) => setEditForm(prev => ({ ...prev, [k]: v }));

  // 上傳大頭照（走 member-photo Edge Function，service role 上傳並更新 picture）
  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !supabase || !userId) return;
    if (file.size > 6 * 1024 * 1024) { alert('圖片過大，請小於 6MB'); return; }
    setPhotoBusy(true);
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1] || '');
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const { data, error } = await supabase.functions.invoke('member-photo', {
        body: { line_user_id: userId, file_base64: base64, ext },
      });
      if (error || !(data as any)?.ok) { alert('照片上傳失敗：' + (error?.message || (data as any)?.error || '')); return; }
      setField('picture', (data as any).url);
    } catch (err: any) {
      alert('照片上傳失敗：' + (err?.message || String(err)));
    } finally {
      setPhotoBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!supabase || !userId) return;
    setSavingEdit(true);
    try {
      // picture 已由上傳當下即時寫入 DB；此處送其餘欄位（含 picture 亦無妨）
      const { data, error } = await supabase.rpc('member_update_by_line', {
        p_line_user_id: userId,
        p_patch: { ...editForm },
      });
      if (error || data === false) throw new Error(error?.message || '更新失敗');
      await loadPortal(userId);
      setEditing(false);
      alert('資料已更新 ✅');
    } catch (e: any) {
      alert('儲存失敗：' + (e?.message || String(e)));
    } finally {
      setSavingEdit(false);
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

  // 編輯資料畫面
  if (editing) {
    // 注意：用函式回傳 JSX（非內嵌元件），避免每次 render 重新掛載導致輸入框失焦
    const field = (label: string, k: keyof EditForm, type = 'text', placeholder?: string) => (
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
        <input
          type={type} value={editForm[k]} onChange={e => setField(k, e.target.value)} placeholder={placeholder}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>
    );
    return (
      <div className="min-h-screen bg-gray-50 pb-28">
        <div className="max-w-md mx-auto px-4 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">編輯我的資料</h1>
            <button onClick={() => setEditing(false)} className="text-gray-400 p-1"><X size={22} /></button>
          </div>

          {/* 照片 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
              {editForm.picture ? (
                <img src={editForm.picture} alt="大頭照" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : <User size={32} className="text-gray-300" />}
            </div>
            <label className={`cursor-pointer bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 ${photoBusy ? 'opacity-60' : ''}`}>
              <Camera size={18} /> {photoBusy ? '上傳中…' : '更換照片'}
              <input type="file" accept="image/*" className="hidden" disabled={photoBusy} onChange={onPickPhoto} />
            </label>
          </div>

          {/* 鎖定的身分/會籍欄位（唯讀提示） */}
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 mb-4 text-sm text-gray-500">
            <p className="font-bold text-gray-600 mb-1">以下由協會維護，如需修改請聯繫管理員</p>
            <p>姓名：{p.name}　會員編號：#{(p.member_no || '').padStart(5, '0')}</p>
          </div>

          {/* 聯絡資訊 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 space-y-3">
            <p className="text-xs font-bold text-gray-400">聯絡資訊</p>
            {field('手機', 'phone', 'tel')}
            {field('電話（市話）', 'home_phone', 'tel')}
            {field('Email', 'email', 'email')}
            {field('通訊地址', 'address')}
          </div>

          {/* 事業資料 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 space-y-3">
            <p className="text-xs font-bold text-gray-400">事業資料</p>
            {field('品牌名稱', 'brand_name')}
            {field('公司抬頭', 'company_title')}
            {field('統一編號', 'tax_id')}
            {field('職稱', 'job_title')}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">產業別</label>
              <select value={editForm.industry_category} onChange={e => setField('industry_category', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 bg-white">
                <option value="">（未選擇）</option>
                {(IndustryCategories as readonly string[]).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {field('公司網站', 'website', 'text', 'https://')}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">主要服務/產品</label>
              <textarea value={editForm.main_service} onChange={e => setField('main_service', e.target.value)} rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600" />
            </div>
          </div>
        </div>

        {/* 底部固定儲存列 */}
        <div className="fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-gray-100">
          <div className="max-w-md mx-auto p-4 flex gap-3">
            <button onClick={() => setEditing(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold">取消</button>
            <button onClick={saveEdit} disabled={savingEdit || photoBusy}
              className="flex-[2] bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              <Save size={18} /> {savingEdit ? '儲存中…' : '儲存'}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          {/* 分享自己的電子名片：一鍵傳給好友/群組，免去官網找自己 */}
          <button
            onClick={shareMyCard}
            disabled={sharingCard || !canShare}
            className="mt-4 w-full bg-white text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm active:opacity-80 disabled:opacity-60"
          >
            <Share2 size={18} />
            {sharingCard ? '開啟分享中…' : '分享我的電子名片'}
          </button>
          {!canShare && (
            <p className="text-center text-[11px] text-orange-100 mt-2">請從 LINE App 內開啟才能分享名片</p>
          )}
          <button
            onClick={openEdit}
            className="mt-2 w-full bg-white/15 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 active:opacity-80"
          >
            <Pencil size={16} /> 編輯我的資料
          </button>
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

        {/* 會籍（本人專屬畫面，顯示完整會員資訊） */}
        {tab === 'membership' && (
          <div className="space-y-4">
            {/* 照片 + 姓名 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                {p.picture ? (
                  <img src={p.picture} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={32} className="text-gray-300" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">{p.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">會員編號 #{(p.member_no || '').padStart(5, '0')}</p>
                {(p.company_title || p.job_title) && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {[p.company_title, p.job_title].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>

            {/* 會籍 / 產業 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 text-sm">
              <p className="text-xs font-bold text-gray-400 mb-1">會籍</p>
              <Row label="會籍到期日" value={expiryLabel} />
              <Row label="會籍狀態" value={p.is_active ? '有效' : '已過期／未生效'} valueClass={p.is_active ? 'text-emerald-600' : 'text-red-500'} />
              {p.industry_category && <Row label="產業別" value={p.industry_category} />}
              {!p.is_active && (
                <a href="/renew" className="block mt-2 w-full bg-red-600 text-white py-3 rounded-xl font-bold text-center">前往續費</a>
              )}
            </div>

            {/* 公司 / 品牌 */}
            {(p.company || p.company_title || p.main_service || p.tax_id) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 text-sm">
                <p className="text-xs font-bold text-gray-400 mb-1">公司 / 品牌</p>
                {p.company && <Row label="公司/品牌" value={p.company} />}
                {p.company_title && <Row label="抬頭" value={p.company_title} />}
                {p.tax_id && <Row label="統一編號" value={p.tax_id} />}
                {p.main_service && <Row label="主要服務/產品" value={p.main_service} />}
              </div>
            )}

            {/* 聯絡資訊 */}
            {(p.phone || p.home_phone || p.email || p.address) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 text-sm">
                <p className="text-xs font-bold text-gray-400 mb-1">聯絡資訊</p>
                {p.phone && <Row label="手機" value={p.phone} />}
                {p.home_phone && <Row label="電話" value={p.home_phone} />}
                {p.email && <Row label="信箱" value={p.email} />}
                {p.address && <Row label="地址" value={p.address} />}
              </div>
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
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={`font-bold text-gray-900 text-right break-words min-w-0 ${valueClass || ''}`}>{value}</span>
    </div>
  );
}
