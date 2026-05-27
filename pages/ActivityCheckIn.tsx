import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, Loader2, CheckCircle2, Search, UserCheck, AlertCircle, ChevronLeft, AlertTriangle } from 'lucide-react';
import { Activity, Registration, PaymentStatus } from '../types';
import { supabase } from '../utils/supabaseClient';

type Status = 'loading' | 'ready' | 'not_found' | 'error';

// 付款狀態判斷：未繳費（pending / failed）→ 顯示但標警示
const isUnpaid = (ps?: PaymentStatus | string): boolean =>
  ps === PaymentStatus.PENDING || ps === PaymentStatus.FAILED;

const maskPhone = (phone?: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  const head = digits.slice(0, Math.min(4, digits.length - 3));
  const tail = digits.slice(-3);
  return `${head}****${tail}`;
};

const ActivityCheckIn: React.FC = () => {
  const { activityId } = useParams<{ activityId: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [submittingId, setSubmittingId] = useState<string | number | null>(null);
  const [successReg, setSuccessReg] = useState<Registration | null>(null);

  // 抓活動 + 該活動的所有報名
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!activityId || !supabase) {
        setStatus('error');
        return;
      }

      const [actRes, regsRes] = await Promise.all([
        supabase.from('activities').select('*').eq('id', activityId).maybeSingle(),
        supabase.from('registrations').select('*').eq('activityId', activityId),
      ]);

      if (cancelled) return;

      if (actRes.error || !actRes.data) {
        setStatus('not_found');
        return;
      }
      setActivity(actRes.data as Activity);
      // 已退款者過濾掉（他們已取消，避免誤報到）
      const allRegs = (regsRes.data as Registration[]) || [];
      const visibleRegs = allRegs.filter(r => r.payment_status !== PaymentStatus.REFUNDED);
      setRegistrations(visibleRegs);
      setStatus('ready');

      document.title = `${actRes.data.title} - 活動報到`;
    };
    load();
    return () => { cancelled = true; };
  }, [activityId]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const qDigits = q.replace(/\D/g, '');
    return registrations.filter(r => {
      const name = (r.name || r.member_name || '').toLowerCase();
      const phone = (r.phone || '').replace(/\D/g, '');
      if (name.includes(q)) return true;
      if (qDigits.length >= 2 && phone.includes(qDigits)) return true;
      return false;
    });
  }, [searchTerm, registrations]);

  const handleCheckIn = async (reg: Registration) => {
    if (!supabase) return;
    if (reg.check_in_status) return;

    // 未繳費者額外警示
    if (isUnpaid(reg.payment_status)) {
      const statusLabel = reg.payment_status === PaymentStatus.FAILED ? '付款失敗' : '尚未繳費';
      if (!confirm(`⚠️ 您的繳費狀態為「${statusLabel}」\n\n仍要繼續報到嗎？請現場洽工作人員完成繳費。`)) return;
    } else {
      if (!confirm(`確認您是 ${reg.name || reg.member_name}？確認後即完成報到。`)) return;
    }

    setSubmittingId(reg.id);
    const { error } = await supabase
      .from('registrations')
      .update({ check_in_status: true })
      .eq('id', reg.id);

    setSubmittingId(null);

    if (error) {
      console.error(error);
      alert('報到失敗，請洽現場工作人員。');
      return;
    }

    setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, check_in_status: true } : r));
    setSuccessReg({ ...reg, check_in_status: true });
  };

  // ---------- Render ----------
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <Loader2 className="animate-spin text-red-600" size={40} />
        <p className="text-gray-500 font-medium">載入活動資訊中...</p>
      </div>
    );
  }

  if (status === 'not_found' || status === 'error' || !activity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 px-4">
        <AlertCircle className="text-red-500" size={48} />
        <h1 className="text-xl font-bold text-gray-800">找不到此活動</h1>
        <p className="text-gray-500 text-center">活動連結可能已失效，請聯絡主辦單位。</p>
        <Link to="/" className="mt-4 px-6 py-3 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition">回首頁</Link>
      </div>
    );
  }

  // 報到成功畫面
  if (successReg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-green-50 to-emerald-50 px-4">
        <div className="bg-white rounded-3xl shadow-2xl shadow-green-100 p-10 max-w-md w-full text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="text-green-600" size={64} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">報到成功</h1>
          <p className="text-lg text-gray-600 mb-1">歡迎</p>
          <p className="text-2xl font-bold text-red-600 mb-6">{successReg.name || successReg.member_name}</p>
          <div className="bg-gray-50 rounded-2xl p-4 text-left text-sm text-gray-600 space-y-2">
            <div className="flex items-center gap-2"><Calendar size={16} className="text-gray-400" />{activity.date}</div>
            {activity.time && <div className="flex items-center gap-2"><Clock size={16} className="text-gray-400" />{activity.time}</div>}
            {activity.location && <div className="flex items-center gap-2"><MapPin size={16} className="text-gray-400" />{activity.location}</div>}
          </div>
          <p className="mt-6 text-xs text-gray-400">請出示此畫面給現場工作人員</p>
        </div>
        <button
          onClick={() => { setSuccessReg(null); setSearchTerm(''); }}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          換人報到
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 活動標題區 */}
      <div className="bg-gradient-to-br from-red-600 to-orange-500 text-white px-4 py-8 shadow-lg">
        <div className="max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-3">
            <UserCheck size={14} />
            <span>活動報到</span>
          </div>
          <h1 className="text-2xl font-black mb-3 leading-tight">{activity.title}</h1>
          <div className="space-y-1.5 text-sm text-white/90">
            <div className="flex items-center gap-2"><Calendar size={14} />{activity.date}{activity.time ? ` ・ ${activity.time}` : ''}</div>
            {activity.location && <div className="flex items-center gap-2"><MapPin size={14} />{activity.location}</div>}
          </div>
        </div>
      </div>

      {/* 搜尋 */}
      <div className="max-w-xl mx-auto px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-md p-5">
          <label className="block text-sm font-bold text-gray-700 mb-2">輸入您的姓名或手機號碼</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="例：王小明 或 0912"
              className="w-full pl-11 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
              autoFocus
              inputMode="text"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">至少輸入 2 個字元</p>
        </div>
      </div>

      {/* 搜尋結果 */}
      <div className="max-w-xl mx-auto px-4 mt-4">
        {searchTerm.trim().length >= 2 && filtered.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center">
            <AlertCircle className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500 font-bold mb-1">找不到符合的報名資料</p>
            <p className="text-xs text-gray-400">請確認輸入內容，或洽現場工作人員</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-bold px-1">找到 {filtered.length} 筆，請點選您本人：</p>
            {filtered.map(reg => {
              const isCheckedIn = !!reg.check_in_status;
              const isSubmitting = submittingId === reg.id;
              const unpaid = isUnpaid(reg.payment_status);
              const unpaidLabel = reg.payment_status === PaymentStatus.FAILED ? '付款失敗' : '未繳費';
              return (
                <button
                  key={String(reg.id)}
                  onClick={() => handleCheckIn(reg)}
                  disabled={isCheckedIn || isSubmitting}
                  className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 transition-all active:scale-[0.98] ${
                    isCheckedIn
                      ? 'border-green-200 bg-green-50/50 cursor-default'
                      : unpaid
                      ? 'border-red-200 hover:border-red-400 hover:shadow-md'
                      : 'border-transparent hover:border-red-300 hover:shadow-md'
                  } disabled:cursor-wait`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-lg font-bold text-gray-900">{reg.name || reg.member_name}</span>
                        {reg.member_no && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">會員 {reg.member_no}</span>}
                        {unpaid && (
                          <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                            <AlertTriangle size={11} /> {unpaidLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{maskPhone(reg.phone)}</p>
                    </div>
                    {isCheckedIn ? (
                      <div className="flex items-center gap-1 text-green-600 font-bold text-sm shrink-0">
                        <CheckCircle2 size={20} /> 已報到
                      </div>
                    ) : isSubmitting ? (
                      <Loader2 className="animate-spin text-red-500 shrink-0" size={24} />
                    ) : (
                      <div className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold shrink-0">
                        我是這位
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {searchTerm.trim().length < 2 && (
          <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-400">
            開始輸入後將自動列出符合的報名資料
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="max-w-xl mx-auto px-4 mt-8 text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          <ChevronLeft size={14} /> 食在力量首頁
        </Link>
      </div>
    </div>
  );
};

export default ActivityCheckIn;
