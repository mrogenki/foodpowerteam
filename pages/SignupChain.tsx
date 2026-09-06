import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, MapPin, ChevronLeft, Loader2, CreditCard, CheckCircle2 } from 'lucide-react';
import liff from '@line/liff';
import { Activity, SignupSettings, SignupEntry } from '../types';
import { supabase } from '../utils/supabaseClient';

// 接龍報名 LIFF app（在 LINE 內開啟時綁定 LINE 身分、引導加好友）。非機密，允許 env 覆寫。
const SIGNUP_LIFF_ID = ((import.meta as any)?.env?.VITE_LIFF_SIGNUP_ID as string) || '2010533806-UAyCj3qx';

// ── 接龍報名（免登入）：名單即時公開，正取者導去付款 ──

interface MySignup { id: string; cancel_token: string; name: string; }

const storageKey = (activityId: string) => `foodpowerteam_signup_${activityId}`;
const readMine = (activityId: string): MySignup[] => {
  try { return JSON.parse(localStorage.getItem(storageKey(activityId)) || '[]'); } catch { return []; }
};
const saveMine = (activityId: string, list: MySignup[]) => {
  localStorage.setItem(storageKey(activityId), JSON.stringify(list));
};

const SignupChain: React.FC = () => {
  const { activityId: pathActivityId } = useParams<{ activityId: string }>();
  // 活動 id 來源：路徑 /signup/:id、或 LIFF 開啟時的 ?a=（含 liff.state 包裹）
  const activityId = useMemo(() => {
    if (pathActivityId) return pathActivityId;
    const sp = new URLSearchParams(window.location.search);
    let a = sp.get('a');
    if (!a) {
      const state = sp.get('liff.state');
      if (state) { const s = new URLSearchParams(state.startsWith('?') ? state.slice(1) : state); a = s.get('a'); }
    }
    return a || undefined;
  }, [pathActivityId]);

  // 在 LINE App 內、且是直接開 /signup/:id（非 LIFF）→ 轉到 liff.line.me 以正式 LIFF 開啟，才能可靠取得 LINE 身分
  useEffect(() => {
    if (pathActivityId && SIGNUP_LIFF_ID && /Line\//i.test(navigator.userAgent)) {
      window.location.replace(`https://liff.line.me/${SIGNUP_LIFF_ID}?a=${encodeURIComponent(pathActivityId)}`);
    }
  }, [pathActivityId]);

  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [settings, setSettings] = useState<SignupSettings | null>(null);
  const [entries, setEntries] = useState<SignupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySignups, setMySignups] = useState<MySignup[]>([]);
  const lineUserIdRef = useRef<string>('');
  const [lineName, setLineName] = useState<string>(''); // 綁到 LINE 身分時顯示（狀態提示）
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [companyTitle, setCompanyTitle] = useState('');
  const [taxId, setTaxId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [referrer, setReferrer] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // 折扣券
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [couponMsg, setCouponMsg] = useState('');
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, err = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, err });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  const fetchList = async (id: string) => {
    if (!supabase) return;
    const [{ data: settingsData }, { data: rosterData, error: rosterError }] = await Promise.all([
      supabase.from('signup_settings').select('*').eq('activity_id', id).maybeSingle(),
      // 合併名單：接龍 + 一般活動報名（伺服端 RPC，只回公開欄位，不含 phone/email）
      supabase.rpc('public_activity_roster', { p_activity_id: id }),
    ]);
    setSettings((settingsData as SignupSettings) || null);
    if (!rosterError && rosterData) {
      const mapped = (rosterData as any[]).map(r => ({
        id: r.entry_id, name: r.name, company: r.company,
        status: r.status, payment_status: r.payment_status, source: r.source,
      }));
      setEntries(mapped as unknown as SignupEntry[]);
      // 清掉伺服器上已不存在的本機報名紀錄（僅比對接龍來源的 id）
      const signupIds = new Set(mapped.filter(e => e.source === 'signup').map(e => e.id));
      const local = readMine(id);
      const alive = local.filter(m => signupIds.has(m.id));
      if (alive.length !== local.length) saveMine(id, alive);
      // 合併「以 LINE 身分綁定」的報名（跨裝置/session 持久，解決 LINE 不留 localStorage）
      let merged: MySignup[] = alive;
      const luid = lineUserIdRef.current;
      if (luid && supabase) {
        const { data: mine } = await supabase.rpc('my_signups_by_line', { p_line_user_id: luid });
        const lineForThis = ((mine as any[]) || [])
          .filter(r => r.activity_id === id)
          .map(r => ({ id: String(r.entry_id), cancel_token: String(r.cancel_token), name: r.name }));
        const seen = new Set(alive.map(m => m.id));
        merged = [...alive, ...lineForThis.filter(m => !seen.has(m.id))];
      }
      setMySignups(merged);
    }
  };

  useEffect(() => {
    if (!activityId) return;
    // 即將轉址到 LIFF（LINE 內直接開 /signup/:id）→ 不做初始化，避免競爭
    if (pathActivityId && SIGNUP_LIFF_ID && /Line\//i.test(navigator.userAgent)) return;
    setMySignups(readMine(activityId));
    const init = async () => {
      setLoading(true);
      // LINE 身分綁定（僅在 LINE App 內；登入會順帶引導加官方帳號好友）
      try {
        await liff.init({ liffId: SIGNUP_LIFF_ID });
        if (liff.isInClient()) {
          if (!liff.isLoggedIn()) { liff.login({ redirectUri: window.location.href }); return; }
          const prof = await liff.getProfile();
          lineUserIdRef.current = prof.userId;
          setLineName(prof.displayName || 'LINE 使用者');
        }
      } catch { /* 非 LINE 環境或初始化失敗 → 走 web 備援 */ }
      if (supabase) {
        const { data: actData } = await supabase.from('activities').select('*').eq('id', activityId).maybeSingle();
        if (actData) setActivity(actData as Activity);
      }
      await fetchList(activityId);
      setLoading(false);
    };
    init();
    window.scrollTo(0, 0);

    const timer = setInterval(() => fetchList(activityId), 20000);
    const onVisible = () => { if (!document.hidden) fetchList(activityId); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  const confirmed = entries.filter(e => e.status === 'confirmed');
  const waitlist = entries.filter(e => e.status === 'waitlist');
  const capacity = settings?.capacity ?? 0;
  const remain = Math.max(0, capacity - confirmed.length);
  const isFull = remain <= 0;
  const myIds = new Set(mySignups.map(m => m.id));

  const selfCollect = settings?.payment_mode === 'self';
  const isFree = (settings?.fee_amount || 0) <= 0;   // 免費活動：無需繳費
  const hasMemberPrice = settings?.member_fee_amount != null && settings.member_fee_amount !== settings.fee_amount;
  const goPay = (id: string, token: string) => navigate(`/pay-signup/${id}?token=${token}`);

  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code || !activityId || !supabase) return;
    setCouponStatus('validating'); setCouponMsg('');
    try {
      const { data } = await supabase.from('coupons').select('*').eq('code', code).maybeSingle();
      if (!data) { setCouponStatus('invalid'); setCouponMsg('無效的折扣碼'); return; }
      if (String(data.activity_id) !== String(activityId)) { setCouponStatus('invalid'); setCouponMsg('此折扣碼不適用於本活動'); return; }
      if (data.is_used) { setCouponStatus('invalid'); setCouponMsg(data.is_free ? '此邀請連結已被使用' : '此折扣碼已被使用'); return; }
      if (data.is_free) { setCouponStatus('valid'); setCouponMsg('✓ VIP 免費券已套用，本次報名免費'); return; }
      const d = Number(data.discount_amount) || 0;
      setCouponStatus('valid');
      setCouponMsg(`✓ 折扣碼適用，折抵 NT$${d.toLocaleString()}（實付金額於付款頁確認）`);
    } catch {
      setCouponStatus('invalid'); setCouponMsg('驗證失敗，請稍後再試');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityId || !supabase) return;
    if (!name.trim())  { showToast('請填寫姓名', true); return; }
    if (!phone.trim()) { showToast('請填寫聯絡電話', true); return; }
    if (!email.trim()) { showToast('請填寫 Email', true); return; }
    if (!company.trim())  { showToast('請填寫公司/品牌名稱', true); return; }
    if (!jobTitle.trim()) { showToast('請填寫職務', true); return; }
    setSubmitting(true);
    const regName = name.trim();
    const regEmail = email.trim();
    try {
      const { data, error } = await supabase.rpc('signup_register', {
        p_activity_id: activityId, p_name: name, p_phone: phone, p_email: email, p_company: company,
        p_company_title: companyTitle, p_tax_id: taxId, p_title: jobTitle, p_referrer: referrer, p_notes: notes,
        p_coupon_code: couponStatus === 'valid' ? couponCode.trim() : '',
        p_line_user_id: lineUserIdRef.current || null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const next = [...readMine(activityId), { id: row.id, cancel_token: row.cancel_token, name: name.trim() }];
      saveMine(activityId, next);
      setMySignups(next);
      setName(''); setPhone(''); setEmail(''); setCompany('');
      setCompanyTitle(''); setTaxId(''); setJobTitle(''); setReferrer(''); setNotes('');
      setCouponCode(''); setCouponStatus('idle'); setCouponMsg('');
      await fetchList(activityId);
      if (row.status === 'confirmed') {
        // 報名確認信改由 Resend（send-email Edge Function）寄送：版型寫在程式碼、繳費連結為真正的按鈕。
        const payLink = `${window.location.origin}/pay-signup/${row.id}?token=${row.cancel_token}`;
        const mode = isFree ? 'free' : (selfCollect ? 'self_collect' : 'online');
        supabase.functions.invoke('send-email', {
          body: {
            template: 'signup_confirm',
            params: {
              to_name: regName, to_email: regEmail,
              activity_title: activity?.title || '',
              activity_date: activity?.date || '',
              activity_time: activity?.time || '',
              activity_location: activity?.location || '',
              fee: Number(row.fee_amount ?? settings?.fee_amount ?? 0),
              is_member: !!row.is_member,
              is_free: isFree,
              mode,
              pay_link: isFree ? '' : payLink,
              collect_note: selfCollect ? (settings?.collect_note || '') : '',
            },
          },
        }).catch(err => console.error('接龍確認信寄送失敗', err));

        if (isFree) {
          showToast('報名成功！🎉');
        } else if (selfCollect) {
          showToast('報名成功！繳費方式與回填連結已寄到你的 Email 🎉');
        } else {
          showToast('報名成功！繳費連結已寄到你的 Email，正在前往付款…');
          setTimeout(() => goPay(row.id, row.cancel_token), 700);
        }
      } else {
        showToast((selfCollect || isFree) ? '已加入候補，有人取消會自動遞補 ⏳' : '已加入候補，遞補為正取後可付款 ⏳');
      }
    } catch (err: any) {
      showToast(err.message || '報名失敗，請稍後再試', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string, token: string) => {
    if (!activityId || !supabase) return;
    if (!window.confirm('確定要取消這筆報名嗎？')) return;
    try {
      const { error } = await supabase.rpc('signup_cancel', { p_id: id, p_token: token });
      if (error) throw error;
      const next = readMine(activityId).filter(m => m.id !== id);
      saveMine(activityId, next);
      setMySignups(next);
      showToast('已取消報名');
      await fetchList(activityId);
    } catch (err: any) {
      showToast(err.message || '取消失敗', true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-red-600" size={44} />
      </div>
    );
  }

  if (!activity || !settings) {
    return (
      <div className="pt-32 min-h-screen bg-gray-50 text-center px-4">
        <div className="text-4xl mb-4">🍽️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">此活動尚未開放接龍報名</h1>
        <p className="text-gray-500 mb-8">主辦方還沒有為這場活動開啟報名接龍。</p>
        <Link to={activity ? `/activity/${activity.id}` : '/activities'} className="inline-block bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 transition-colors">
          {activity ? '返回活動頁' : '查看所有活動'}
        </Link>
      </div>
    );
  }

  const entryRow = (entry: SignupEntry, index: number, isWaitlist: boolean) => (
    <li
      key={entry.id}
      className={`flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-b-0 ${myIds.has(entry.id) ? 'bg-amber-50 rounded-xl' : ''}`}
    >
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${isWaitlist ? 'bg-amber-100 text-amber-600' : 'bg-orange-50 text-orange-600'}`}>
        {isWaitlist ? `候${index + 1}` : index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <span className="font-bold text-gray-800">
          {entry.name}
          {myIds.has(entry.id) && <span className="ml-2 text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full align-middle">我</span>}
          {entry.payment_status === 'paid' && <span className="ml-2 text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full align-middle">已付款</span>}
        </span>
        {entry.company && <p className="text-xs text-gray-400 truncate">{entry.company}</p>}
      </div>
    </li>
  );

  return (
    <div className="pt-24 min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <Link to={`/activity/${activity.id}`} className="inline-flex items-center gap-2 text-gray-400 hover:text-red-600 mb-6 text-sm font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" /> 返回活動頁
        </Link>

        {/* 活動資訊卡（有封面圖則鋪底 + 深色遮罩，否則用漸層）*/}
        <div className="bg-gradient-to-br from-red-600 via-orange-500 to-amber-500 rounded-3xl p-8 text-white shadow-xl shadow-orange-200 relative overflow-hidden">
          {activity.picture ? (
            <>
              <img src={activity.picture} alt={activity.title} className="absolute inset-0 w-full h-full object-cover" loading="eager" />
              <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/55 to-black/65" />
            </>
          ) : (
            <div className="absolute -right-2 -top-4 text-7xl opacity-15 rotate-[-8deg] select-none">🍢🍻</div>
          )}
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold mb-1">{activity.title}</h1>
            <p className="text-orange-100 text-sm mb-6">接龍報名・名單即時公開</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {activity.date && <div className="flex items-center gap-2"><Calendar className="w-4 h-4 shrink-0 opacity-80" />{activity.date}</div>}
              {activity.time && <div className="flex items-center gap-2"><Clock className="w-4 h-4 shrink-0 opacity-80" />{activity.time}</div>}
              {activity.location && <div className="flex items-center gap-2 sm:col-span-2"><MapPin className="w-4 h-4 shrink-0 opacity-80" />{activity.location}</div>}
              {settings.fee_amount > 0 && (
                hasMemberPrice ? (
                  <div className="sm:col-span-2 font-bold flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>一般 NT$ {settings.fee_amount.toLocaleString()}</span>
                    <span className="text-amber-200">會員 NT$ {settings.member_fee_amount!.toLocaleString()}</span>
                    {selfCollect && <span className="font-normal text-orange-100">（向主辦繳交）</span>}
                    <span className="w-full font-normal text-orange-100 text-xs">📱 報名填會員手機自動套用會員價</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 font-bold">
                    費用 NT$ {settings.fee_amount.toLocaleString()}{selfCollect && <span className="font-normal text-orange-100">（向主辦繳交）</span>}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* 自主收款說明 */}
        {selfCollect && settings.collect_note && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800 whitespace-pre-wrap">
            <span className="font-bold">💰 繳費方式：</span>{settings.collect_note}
          </div>
        )}

        {/* 主辦人聯絡資訊 */}
        {(settings.host_name || settings.host_phone) && (
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-bold">📞 有問題請聯絡主辦人</span>
            {settings.host_name && <span>{settings.host_name}</span>}
            {settings.host_phone && (
              <a href={`tel:${settings.host_phone.replace(/[^0-9+]/g, '')}`} className="font-bold underline hover:text-blue-600">{settings.host_phone}</a>
            )}
          </div>
        )}

        {/* 統計列 */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-emerald-500">{confirmed.length}</p>
            <p className="text-xs text-gray-400 mt-1">正取</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
            <p className={`text-2xl font-bold ${isFull ? 'text-orange-500' : 'text-emerald-500'}`}>{isFull ? '滿' : remain}</p>
            <p className="text-xs text-gray-400 mt-1">{isFull ? '已額滿' : '剩餘名額'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-500">{waitlist.length}</p>
            <p className="text-xs text-gray-400 mt-1">候補</p>
          </div>
        </div>
        <div className="h-2.5 bg-orange-100 rounded-full overflow-hidden mt-3">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${capacity > 0 ? Math.min(100, (confirmed.length / capacity) * 100) : 0}%` }} />
        </div>

        {/* 報名表單 */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📝 我要報名</h2>
          {lineName && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm text-emerald-700 font-medium flex items-center gap-2">
              <span className="text-base">🟢</span> 已透過 LINE 連結：{lineName}（報名會記住你，換裝置也找得回）
            </div>
          )}
          {!settings.registration_open ? (
            <div className="bg-red-50 border border-red-100 text-red-500 rounded-2xl px-5 py-4 text-center text-sm font-medium">報名目前已關閉</div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">姓名 <span className="text-red-600">*</span></label>
                <input value={name} onChange={e => setName(e.target.value)} maxLength={40} autoComplete="name" placeholder="您的稱呼" required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">聯絡電話 <span className="text-red-600">*</span></label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} autoComplete="tel" inputMode="tel" placeholder="手機號碼" required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-600">*</span></label>
                  <input value={email} onChange={e => setEmail(e.target.value)} maxLength={80} type="email" autoComplete="email" placeholder="收據寄送信箱" required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">公司 / 品牌名稱 <span className="text-red-600">*</span></label>
                <input value={company} onChange={e => setCompany(e.target.value)} maxLength={60} placeholder="您的公司/品牌（會顯示在公開名單上）" required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">職務 <span className="text-red-600">*</span></label>
                <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} maxLength={40} placeholder="您目前的職位" required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">公司抬頭（收據用，選填）</label>
                  <input value={companyTitle} onChange={e => setCompanyTitle(e.target.value)} maxLength={60} placeholder="若需開立收據抬頭請填寫"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">統一編號（選填）</label>
                  <input value={taxId} onChange={e => setTaxId(e.target.value)} maxLength={8} inputMode="numeric" placeholder="8 位數字"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">引薦人（選填）</label>
                <input value={referrer} onChange={e => setReferrer(e.target.value)} maxLength={40} placeholder="引薦您的夥伴姓名"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">備註（選填）</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={300} rows={2} placeholder="若有特殊需求請在此說明"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent" />
              </div>
              {!isFree && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">折扣碼（選填）</label>
                  <div className="flex gap-2">
                    <input value={couponCode}
                      onChange={e => { setCouponCode(e.target.value); if (couponStatus !== 'idle') { setCouponStatus('idle'); setCouponMsg(''); } }}
                      maxLength={40} placeholder="輸入折扣碼"
                      className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent" />
                    <button type="button" onClick={applyCoupon} disabled={couponStatus === 'validating' || !couponCode.trim()}
                      className="px-5 py-3 rounded-xl bg-gray-900 text-white font-bold text-sm disabled:opacity-40 whitespace-nowrap">
                      {couponStatus === 'validating' ? '驗證中…' : couponStatus === 'valid' ? '已套用' : '套用'}
                    </button>
                  </div>
                  {couponMsg && (
                    <p className={`text-xs mt-1.5 ${couponStatus === 'valid' ? 'text-emerald-600' : 'text-red-500'}`}>{couponMsg}</p>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-400">🔒 電話與 Email 不會公開，只有主辦看得到。名單僅顯示姓名與公司/品牌。</p>
              {isFull && (
                <div className="bg-amber-50 border border-amber-100 text-amber-600 rounded-2xl px-4 py-3 text-xs">
                  ⚠️ 正取名額已滿，送出後將排入候補，若有人取消會自動遞補。
                </div>
              )}
              <button type="submit" disabled={submitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-lg shadow-lg shadow-orange-200 hover:opacity-90 transition-all disabled:opacity-50">
                {submitting ? '送出中...' : isFull ? '排候補報名 ⏳' : selfCollect ? '送出報名 🍢' : '送出報名並付款 🍢'}
              </button>
            </form>
          )}
        </div>

        {/* 我的報名 */}
        {mySignups.length > 0 && (
          <div className="bg-orange-50 border border-dashed border-orange-200 rounded-3xl p-6 mt-6">
            <h3 className="font-bold text-gray-800 mb-3">✅ 我的報名</h3>
            <div className="space-y-3">
              {mySignups.map(m => {
                const entry = entries.find(e => e.id === m.id);
                if (!entry) return null;
                const needPay = !selfCollect && !isFree && entry.status === 'confirmed' && entry.payment_status !== 'paid';
                const needSelfReport = selfCollect && !isFree && entry.status === 'confirmed' && entry.payment_status !== 'paid';
                return (
                  <div key={m.id} className="flex flex-wrap items-center gap-3">
                    <span className="flex-1 min-w-[120px] text-sm font-medium text-gray-700">
                      {entry.name}
                      <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full text-white ${entry.status === 'confirmed' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                        {entry.status === 'confirmed' ? '正取' : '候補'}
                      </span>
                      {entry.payment_status === 'paid' && (
                        <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full text-white bg-red-600">已付款</span>
                      )}
                    </span>
                    {needPay && (
                      <button onClick={() => goPay(m.id, m.cancel_token)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-white bg-red-600 px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors">
                        <CreditCard size={14} /> 前往付款
                      </button>
                    )}
                    {needSelfReport && (
                      <button onClick={() => goPay(m.id, m.cancel_token)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-white bg-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors">
                        <CreditCard size={14} /> 填寫繳費資訊
                      </button>
                    )}
                    {entry.payment_status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                        <CheckCircle2 size={14} /> 已完成
                      </span>
                    ) : (
                      <button onClick={() => handleCancel(m.id, m.cancel_token)}
                        className="text-xs font-bold text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        取消報名
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 正取名單 */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3 px-1">
            <h2 className="text-lg font-bold text-gray-900">🍻 報名接龍</h2>
            <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2.5 py-0.5 rounded-full">{confirmed.length} 人</span>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-3 py-2">
            {confirmed.length > 0 ? (
              <ol>{confirmed.map((entry, i) => entryRow(entry, i, false))}</ol>
            ) : (
              <p className="text-center text-gray-400 text-sm py-10">還沒有人報名，搶頭香吧！</p>
            )}
          </div>
        </div>

        {/* 候補名單 */}
        {waitlist.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3 px-1">
              <h2 className="text-lg font-bold text-gray-900">⏳ 候補名單</h2>
              <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2.5 py-0.5 rounded-full">{waitlist.length} 人</span>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-3 py-2">
              <ol>{waitlist.map((entry, i) => entryRow(entry, i, true))}</ol>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-10">名單每 20 秒自動更新・食在力量</p>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] px-6 py-3 rounded-full text-white text-sm font-medium shadow-2xl max-w-[90vw] ${toast.err ? 'bg-red-600' : 'bg-gray-900'}`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SignupChain;
