
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, ArrowLeft, CheckCircle2, Share2, CopyCheck, Clock, Loader2, Crown, UserCheck, Ticket, User, Users, Search, ChevronDown, Lock, AlertCircle, CreditCard, Ban, Info, ShieldAlert, Copy } from 'lucide-react';
import { Activity, MemberActivity, Registration, MemberRegistration, Member, PaymentStatus } from '../types';
import { POINT_TO_TWD } from '../constants';
import { submitNewebPayForm, NEWEB_CONFIG } from '../utils/newebpay';
import { supabase } from '../utils/supabaseClient';
import BlockRenderer from '../components/BlockRenderer';

interface ActivityDetailProps {
  type: 'general' | 'member';
  activities: (Activity | MemberActivity)[];
  registrations?: Registration[];
  memberRegistrations?: MemberRegistration[];
  members?: Member[];
  onRegister?: (reg: Registration, couponId?: string) => Promise<boolean>;
  onMemberRegister?: (reg: MemberRegistration, couponId?: string) => Promise<boolean>;
  validateCoupon: (code: string, activityId: string) => Promise<{valid: boolean, discount?: number, message: string, couponId?: string, isFree?: boolean}>;
}

const ActivityDetail: React.FC<ActivityDetailProps> = (props) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const activity = props.activities.find(a => String(a.id) === id);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);
  const [payNow, setPayNow] = useState(true); // 預設勾選立即付款
  
  // 會員價：改為「輸入完整手機 → 後端精準驗證」，不再瀏覽/下載他人資料
  const [memberPhoneInput, setMemberPhoneInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [verifiedMember, setVerifiedMember] = useState<{ id: string; member_no: string; name: string; points_balance: number } | null>(null);
  
  // 折扣券相關
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [couponMessage, setCouponMessage] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [validCouponId, setValidCouponId] = useState<string | undefined>(undefined);
  const [couponFree, setCouponFree] = useState(false); // VIP 免費邀請券

  // 點數抵扣
  const [pointsApplied, setPointsApplied] = useState(0);
  // 名額合併：此活動若有開接龍且已額滿（接龍+一般報名合計），前台直接擋下並引導去接龍候補
  const [signupFull, setSignupFull] = useState(false);
  // 稍後付款：報名成功畫面顯示補繳連結
  const [lastPayLink, setLastPayLink] = useState('');
  const [payLinkCopied, setPayLinkCopied] = useState(false);
  useEffect(() => {
    if (!id || !supabase) return;
    supabase.rpc('activity_signup_capacity', { p_activity_id: String(id) }).then(({ data }) => {
      const c = Array.isArray(data) ? data[0] : data;
      setSignupFull(!!(c?.enabled && c?.is_full));
    });
  }, [id]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    company_title: '',
    tax_id: '',
    title: '',
    referrer: '',
    notes: '',
    memberId: '' // For member registration
  });

  // 動態更新 Meta Tags (標題、圖片)
  useEffect(() => {
    if (activity) {
      // 1. 更新瀏覽器標題
      document.title = `${activity.title} - 食在力量`;

      // 2. 嘗試更新 Meta 標籤 (支援 og 與 twitter card)
      const updateMeta = (key: string, value: string, isProperty: boolean = true) => {
        const selector = isProperty ? `meta[property="${key}"]` : `meta[name="${key}"]`;
        let el = document.querySelector(selector);
        if (!el) {
           el = document.createElement('meta');
           el.setAttribute(isProperty ? 'property' : 'name', key);
           document.head.appendChild(el);
        }
        el.setAttribute('content', value);
      };
      
      // Open Graph
      updateMeta('og:title', activity.title);
      updateMeta('og:description', activity.description ? activity.description.substring(0, 100) : '點擊查看活動詳情');
      updateMeta('og:image', activity.picture);
      updateMeta('og:url', window.location.href);

      // Twitter Card
      updateMeta('twitter:title', activity.title, false);
      updateMeta('twitter:description', activity.description ? activity.description.substring(0, 100) : '點擊查看活動詳情', false);
      updateMeta('twitter:image', activity.picture, false);
    }
  }, [activity]);

  if (!activity) {
    return <div className="p-20 text-center">活動不存在</div>;
  }

  // 檢查活動是否已關閉（手動截止或日期已過）
  const isPast = new Date(`${activity.date.replace(/-/g, '/')} ${activity.time}`) <= new Date();
  const isClosed = activity.status === 'closed' || isPast;

  // 判斷會員是否有效 (前端顯示邏輯)
  const isMemberActive = (m: Member): boolean => {
    const today = new Date().toISOString().slice(0, 10);
    const isExpired = m.membership_expiry_date && m.membership_expiry_date < today;
    return m.status === 'active' && !isExpired;
  };

  // 計算已報名人數 (排除已退費/已取消 status === 'refunded' 的人)
  // 假設 PaymentStatus.REFUNDED 為 'refunded'
  let alreadyRegisteredCount = 0;
  if (props.type === 'general' && props.registrations) {
    alreadyRegisteredCount = props.registrations.filter(r => 
      String(r.activityId) === String(id) && r.payment_status !== PaymentStatus.REFUNDED
    ).length;
  } else if (props.type === 'member' && props.memberRegistrations) {
    alreadyRegisteredCount = props.memberRegistrations.filter(r => 
      String(r.activityId) === String(id) && r.payment_status !== PaymentStatus.REFUNDED
    ).length;
  }

  // 會員價判定：當會員已選且活動有設定 member_price 時，自動套用
  const hasMemberPrice = activity.member_price !== undefined && activity.member_price !== null;
  const isUsingMemberPrice = !!formData.memberId && hasMemberPrice;
  const basePrice = isUsingMemberPrice ? activity.member_price! : (activity.price || 0);

  // 點數抵扣：須先驗證會員。可折抵點數上限 = min(餘額, 折扣後剩餘金額可換算的點數)
  const selectedMember = verifiedMember;
  const memberPoints = selectedMember?.points_balance ?? 0;
  const priceAfterCoupon = couponFree ? 0 : Math.max(0, basePrice - discountAmount);
  // VIP 免費券時不需點數抵扣
  const maxPoints = (couponFree || POINT_TO_TWD <= 0) ? 0 : Math.max(0, Math.min(memberPoints, Math.floor(priceAfterCoupon / POINT_TO_TWD)));
  const pointsDiscount = pointsApplied * POINT_TO_TWD;
  const finalPrice = couponFree ? 0 : Math.max(0, priceAfterCoupon - pointsDiscount);

  // 當可用點數上限變動（換會員 / 改折扣券）時，自動夾住已套用點數
  useEffect(() => {
    setPointsApplied(prev => Math.min(prev, maxPoints));
  }, [maxPoints]);

  // 會員價驗證：輸入完整手機 → 後端 verify-member 精準比對，只回最小資訊
  const handleVerifyMember = async () => {
    const phone = memberPhoneInput.trim();
    if (!phone || !supabase) return;
    setVerifying(true);
    setVerifyMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('verify-member', { body: { phone } });
      if (error || !data) {
        setVerifyMsg({ ok: false, text: '驗證失敗，請稍後再試' });
        return;
      }
      if (!data.is_member) {
        setVerifiedMember(null);
        setFormData(prev => ({ ...prev, memberId: '' }));
        setVerifyMsg({ ok: false, text: '查無此手機號碼的會員資料' });
        return;
      }
      if (!data.active) {
        setVerifiedMember(null);
        setFormData(prev => ({ ...prev, memberId: '' }));
        setVerifyMsg({ ok: false, text: '您的會籍已到期，請聯繫管理員續約後再報名' });
        return;
      }
      setVerifiedMember({ id: String(data.id), member_no: data.member_no, name: data.name, points_balance: data.points_balance ?? 0 });
      setFormData(prev => ({ ...prev, name: data.name, phone, memberId: String(data.id) }));
      setVerifyMsg({ ok: true, text: `✓ 已驗證：${data.name}（會員 #${data.member_no}），已套用會員價` });
    } catch {
      setVerifyMsg({ ok: false, text: '驗證失敗，請稍後再試' });
    } finally {
      setVerifying(false);
    }
  };

  const handleShare = async () => {
    // 使用 /share/:id 而非 hash URL，讓 LINE/FB 等爬蟲能拿到正確的 og:image
    const shareUrl = `${window.location.origin}/share/${activity.id}`;
    // 修正：針對手機原生分享，移除 URL 避免重複
    const shareTextBase = `【食在力量活動推薦】\n活動：${activity.title}\n日期：${activity.date}\n時間：${activity.time}\n地點：${activity.location}\n\n立即點擊連結報名：`;
    
    // 電腦版/剪貼簿複製：保留 URL
    const shareTextClipboard = `${shareTextBase}\n${shareUrl}`;

    if (navigator.share) {
      try {
        // 傳遞 title, text (不含URL), url (由系統處理)
        await navigator.share({ title: activity.title, text: shareTextBase, url: shareUrl });
      } catch (err) { console.log('Share failed', err); }
    } else {
      try {
        await navigator.clipboard.writeText(shareTextClipboard);
        setShowCopyTooltip(true);
        setTimeout(() => setShowCopyTooltip(false), 2000);
      } catch (err) { alert('無法自動複製，請手動分享連結'); }
    }
  };

  const checkCoupon = async (overrideCode?: string) => {
    const code = (overrideCode ?? couponCode).trim();
    if (!code) return;
    if (overrideCode) setCouponCode(overrideCode.toUpperCase());
    setCouponStatus('validating');
    const result = await props.validateCoupon(code, activity.id as string);

    if (result.valid) {
      setCouponStatus('valid');
      setCouponFree(!!result.isFree);
      setDiscountAmount(result.isFree ? 0 : (result.discount || 0));
      setValidCouponId(result.couponId);
      setCouponMessage(result.isFree ? '🎉 VIP 免費邀請已套用，本次報名免費' : `優惠代碼適用！折抵 NT$ ${result.discount}`);
    } else {
      setCouponStatus('invalid');
      setCouponFree(false);
      setDiscountAmount(0);
      setValidCouponId(undefined);
      setCouponMessage(result.message);
    }
  };

  // 自動套用 URL 帶入的邀請碼（VIP 免費連結 / 折扣連結）：/activity/:id?c=CODE
  useEffect(() => {
    // BrowserRouter：query 在 search；保留 hash 解析以相容舊的 /#/ 連結
    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
    const urlCode = params.get('c') || params.get('coupon');
    if (urlCode && activity && couponStatus === 'idle' && !couponCode) {
      checkCoupon(urlCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity?.id]);

  const sendConfirmationEmail = async (name: string, email: string, payLink?: string) => {
    setIsSendingEmail(true);
    try {
      // 改由 Resend（send-email Edge Function）寄送：版型寫在程式碼、繳費連結為真正的按鈕。
      await supabase.functions.invoke('send-email', {
        body: {
          template: 'activity_confirm',
          params: {
            to_name: name,
            to_email: email,
            activity_title: activity.title,
            activity_date: activity.date,
            activity_time: activity.time,
            activity_location: activity.location,
            fee: Number(finalPrice) || 0,
            is_free: Number(finalPrice) === 0,
            pay_link: payLink || '',
          },
        },
      });
    } catch (error) {
      console.error('報名確認信發送失敗:', error);
    } finally {
      setIsSendingEmail(false); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isClosed) {
      alert("本活動已截止報名");
      return;
    }

    if (props.type === 'member' && !formData.memberId) {
       alert('請先查詢並選擇您的會員資料');
       return;
    }

    setIsSubmitting(true);

    // 產生訂單編號 (格式: 活動ID後3碼 + 時間戳)
    const merchantOrderNo = `ACT${String(activity.id).slice(-3)}${Date.now()}`;

    try {
      let success = false;
      const commonData = {
        id: Math.random().toString(36).substr(2, 9),
        activityId: activity.id,
        audience: (props.type === 'member' ? 'member_only' : 'public') as 'public' | 'member_only',
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        company: formData.company,
        company_title: formData.company_title,
        tax_id: formData.tax_id,
        title: formData.title,
        referrer: formData.referrer,
        notes: formData.notes,
        paid_amount: finalPrice,
        coupon_code: validCouponId ? couponCode : undefined,
        points_used: pointsApplied,
        created_at: new Date().toISOString(),
        merchant_order_no: merchantOrderNo,
        payment_status: PaymentStatus.PENDING
      };

      if (props.type === 'general' && props.onRegister) {
        // 公開活動但用會員價（或有用點數）時，把 member_id 一起帶上方便後續報表辨識與點數扣抵
        const payload: Registration = formData.memberId && (isUsingMemberPrice || pointsApplied > 0)
          ? { ...commonData, member_id: String(formData.memberId), member_name: formData.name, member_no: selectedMember?.member_no || '' }
          : (commonData as Registration);
        success = await props.onRegister(payload, validCouponId);
      } else if (props.type === 'member' && props.onMemberRegister) {
        const newMemberReg: MemberRegistration = {
          ...commonData,
          member_id: String(formData.memberId),
          memberId: formData.memberId,
          member_name: formData.name,
          member_no: selectedMember?.member_no || '',
        };
        success = await props.onMemberRegister(newMemberReg, validCouponId);
      }

      if (success) {
        // 只有在「免費活動」或「不須立即付款」時才發送確認信
        // 繳費活動的信件將移至後端付款成功後發送，避免使用者誤會
        // 稍後付款且需繳費 → 產生補繳連結（信件附上 + 成功畫面顯示）
        const payLink = (!payNow && finalPrice > 0) ? `${window.location.origin}/pay-activity/${commonData.id}` : '';
        if (payLink) setLastPayLink(payLink);
        if (formData.email && (!payNow || finalPrice === 0)) {
          await sendConfirmationEmail(formData.name, formData.email, payLink || undefined);
        }

        // 處理金流轉跳
        if (payNow && finalPrice > 0) {
          // 正式環境不顯示測試提示
          
          // 紀錄當前活動 URL，以便付款後返回
          sessionStorage.setItem('last_activity_url', window.location.pathname);

          // 這裡不設定 setIsSuccess(true) 因為頁面會跳轉
          setTimeout(async () => {
            await submitNewebPayForm({
              MerchantOrderNo: merchantOrderNo,
              Amt: finalPrice,
              ItemDesc: activity.title,
              Email: formData.email
            });
          }, 500);
        } else {
          setIsSuccess(true);
        }
      } else {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="flex justify-center mb-6"><CheckCircle2 size={80} className="text-green-500 animate-in zoom-in duration-300" /></div>
        <h2 className="text-3xl font-bold mb-4">報名成功！</h2>
        <p className="text-gray-500 mb-8">
          感謝您的參與，我們期待在活動現場見到您。<br/>
          {formData.email && <span className="text-sm text-gray-400">(確認信已發送至 {formData.email})</span>}
        </p>
        {lastPayLink && (
          <div className="max-w-md mx-auto mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-left">
            <p className="text-sm font-bold text-amber-800 mb-1">⏳ 尚未繳費</p>
            <p className="text-xs text-amber-700 mb-3 leading-relaxed">請於期限內完成繳費以保留名額。繳費連結已寄到你的 Email，也可先複製此連結存起來,之後任何裝置都能回來繳。</p>
            <div className="flex gap-2">
              <a href={lastPayLink} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm text-center hover:bg-red-700 transition-colors flex items-center justify-center gap-1">
                <CreditCard size={16} /> 立即前往繳費
              </a>
              <button onClick={() => { navigator.clipboard.writeText(lastPayLink).then(() => { setPayLinkCopied(true); setTimeout(() => setPayLinkCopied(false), 2500); }); }}
                className="px-4 py-2.5 rounded-xl border border-amber-300 text-amber-700 font-bold text-sm hover:bg-amber-100 transition-colors flex items-center gap-1">
                <Copy size={16} /> {payLinkCopied ? '已複製 ✓' : '複製連結'}
              </button>
            </div>
          </div>
        )}
        <button onClick={() => navigate('/')} className="bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 transition-colors shadow-lg">返回活動列表</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors"><ArrowLeft size={20} /> 返回</button>
        <div className="relative">
          <button onClick={handleShare} className="flex items-center gap-2 border border-red-600 text-red-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-red-50 transition-all active:scale-95">
            {showCopyTooltip ? <CopyCheck size={18} /> : <Share2 size={18} />}
            {showCopyTooltip ? '已複製資訊' : '一鍵轉發分享'}
          </button>
          {showCopyTooltip && <div className="absolute top-full right-0 mt-2 bg-gray-800 text-white text-xs py-1 px-3 rounded shadow-lg animate-bounce whitespace-nowrap">內容已複製到剪貼簿！</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-2xl overflow-hidden shadow-sm relative">
            <img src={activity.picture} alt={activity.title} className={`w-full aspect-video object-cover ${isClosed ? 'grayscale opacity-70' : ''}`} />
            {props.type === 'member' && (
               <div className="absolute top-4 left-4 bg-red-600/90 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 backdrop-blur-sm shadow-lg"><Crown size={20} /> 會員專屬活動</div>
            )}
            {isClosed && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                 <div className="bg-gray-800/90 text-white px-6 py-3 rounded-2xl text-xl font-bold border-2 border-white/50 backdrop-blur-md shadow-2xl">
                    報名已截止
                 </div>
              </div>
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-3 mb-4">
               <span className={`px-3 py-1 rounded-md text-sm font-bold ${isClosed ? 'bg-gray-200 text-gray-500' : 'bg-red-100 text-red-600'}`}>{activity.type}</span>
               {props.type === 'member' && (
                 <span className="bg-red-600 text-white px-3 py-1 rounded-md text-sm font-bold flex items-center gap-1">
                   <Crown size={14} /> 會員專屬
                 </span>
               )}
               <span className="text-gray-400 text-sm">已有 {alreadyRegisteredCount} 人報名</span>
            </div>
            <h1 className="text-4xl font-bold mb-6 text-gray-900">{activity.title}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-2xl border border-gray-100 mb-8">
              <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-full flex items-center justify-center ${isClosed ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-600'}`}><Calendar size={24} /></div><div><p className="text-xs text-gray-400 uppercase font-bold tracking-wider">日期時間</p><p className="font-medium">{activity.date}</p><p className="text-sm text-gray-500 font-bold">{activity.time}</p></div></div>
              <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-full flex items-center justify-center ${isClosed ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-600'}`}><MapPin size={24} /></div><div><p className="text-xs text-gray-400 uppercase font-bold tracking-wider">地點</p><p className="font-medium">{activity.location}</p></div></div>
              <div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-full flex items-center justify-center ${isClosed ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-600'}`}><DollarSign size={24} /></div><div><p className="text-xs text-gray-400 uppercase font-bold tracking-wider">活動費用</p><p className="font-medium">NT$ {(activity.price ?? 0).toLocaleString()}</p>{hasMemberPrice && <p className="text-xs text-red-600 font-bold mt-0.5">會員價 NT$ {activity.member_price!.toLocaleString()}</p>}</div></div>
            </div>

            <div className="prose prose-red max-w-none mb-10 overflow-hidden">
              <h3 className="text-xl font-bold mb-4">活動介紹</h3>
              <BlockRenderer value={activity.description} />
            </div>

            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
               <h4 className="flex items-center gap-2 text-orange-800 font-bold mb-3"><ShieldAlert size={20}/> 報名注意事項與退費規則</h4>
               <ul className="list-disc list-inside text-sm text-orange-700 space-y-2">
                 <li>報名後請於 3 日內完成繳費，以保留您的名額。</li>
                 <li>如需取消報名，請於活動前 7 天聯繫秘書處辦理退費，將扣除 10% 行政手續費。</li>
                 <li>活動前 7 天內取消者，恕不退費，但可將名額轉讓給他人（需提前告知主辦單位）。</li>
                 <li>若遇天災或不可抗力因素導致活動取消，主辦單位將全額退費。</li>
                 <li>退費款項將於申請核准後 7-14 個工作天內退回原付款帳戶。</li>
               </ul>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl sticky top-24">
            
            {isClosed ? (
              // 報名截止顯示的區塊
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Ban size={40} />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-600">報名已截止</h3>
                <p className="text-gray-400 text-sm mb-6">
                  感謝您的關注。<br/>此活動已停止受理報名或已結束。
                </p>
                <button onClick={() => navigate('/')} className="w-full bg-gray-200 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors">
                  查看其他活動
                </button>
              </div>
            ) : signupFull ? (
              // 名額已滿：引導去接龍報名候補
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Ban size={40} />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-700">名額已滿</h3>
                <p className="text-gray-500 text-sm mb-6">
                  本活動正取名額已額滿。<br/>可改用「接龍報名」排候補，有人取消將自動遞補。
                </p>
                <button onClick={() => navigate(`/signup/${activity.id}`)} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
                  前往接龍報名候補
                </button>
              </div>
            ) : (
              // 正常報名表單
              <>
                <h3 className="text-2xl font-bold mb-6 text-center">立即報名</h3>
                
                {props.type === 'member' ? (
                   <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6 text-center">
                      <p className="text-red-800 font-bold flex items-center justify-center gap-2 mb-1"><Crown size={20} /> 會員專屬活動</p>
                      <p className="text-xs text-red-600 opacity-80">請使用您的會員資料進行報名</p>
                   </div>
                ) : hasMemberPrice ? (
                   <div className={`p-4 rounded-xl border mb-6 text-center ${isUsingMemberPrice ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                      <p className={`font-bold flex items-center justify-center gap-2 mb-1 ${isUsingMemberPrice ? 'text-red-800' : 'text-gray-800'}`}><Users size={20} /> 一般公開活動</p>
                      <p className={`text-xs ${isUsingMemberPrice ? 'text-red-600 opacity-80' : 'text-gray-500'}`}>
                        {isUsingMemberPrice ? '✓ 已套用會員價' : `會員享優惠價 NT$ ${activity.member_price!.toLocaleString()}，請於下方搜尋會員資料`}
                      </p>
                   </div>
                ) : (
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 text-center">
                      <p className="text-gray-800 font-bold flex items-center justify-center gap-2 mb-1"><Users size={20} /> 一般公開活動</p>
                      <p className="text-xs text-gray-500">歡迎所有來賓報名參加</p>
                   </div>
                )}

                {/* 會員價驗證 - 輸入完整手機精準驗證，不再瀏覽/下載他人資料 */}
                {(props.type === 'member' || (props.type === 'general' && hasMemberPrice)) && (
                  <div className="mb-6">
                     <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><UserCheck size={14} /> {props.type === 'member' ? '請輸入您的手機號碼驗證會員身分' : '會員請輸入手機號碼套用會員價（選填）'}</p>
                        <div className="flex gap-2">
                           <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                              <input
                                type="tel"
                                value={memberPhoneInput}
                                onChange={(e) => setMemberPhoneInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleVerifyMember(); } }}
                                placeholder="輸入完整手機號碼"
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                              />
                           </div>
                           <button
                             type="button"
                             onClick={handleVerifyMember}
                             disabled={verifying || !memberPhoneInput.trim()}
                             className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
                           >
                             {verifying ? '驗證中…' : '驗證'}
                           </button>
                        </div>
                        {verifyMsg && (
                          <p className={`mt-2 text-xs font-bold ${verifyMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{verifyMsg.text}</p>
                        )}
                     </div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">姓名</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`w-full px-4 py-3 rounded-xl border transition-all outline-none bg-white border-gray-200 focus:ring-2 focus:ring-red-500`} placeholder="請輸入真實姓名" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">手機號碼</label><input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={`w-full px-4 py-3 rounded-xl border transition-all outline-none bg-white border-gray-200 focus:ring-2 focus:ring-red-500`} placeholder="09xx-xxx-xxx" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">電子郵件</label><input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={`w-full px-4 py-3 rounded-xl border transition-all outline-none bg-white border-gray-200 focus:ring-2 focus:ring-red-500`} placeholder="example@email.com" /></div>
                  
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">公司/品牌名稱</label><input required type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className={`w-full px-4 py-3 rounded-xl border transition-all outline-none bg-white border-gray-200 focus:ring-2 focus:ring-red-500`} placeholder="您的公司名稱" /></div>
                  
                  {/* 收據相關欄位 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-2">公司抬頭 (收據用)</label><input type="text" value={formData.company_title} onChange={e => setFormData({...formData, company_title: e.target.value})} className={`w-full px-4 py-3 rounded-xl border transition-all outline-none bg-white border-gray-200 focus:ring-2 focus:ring-red-500`} placeholder="若需開立收據請填寫" /></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-2">統一編號 (選填)</label><input type="text" value={formData.tax_id} onChange={e => setFormData({...formData, tax_id: e.target.value})} className={`w-full px-4 py-3 rounded-xl border transition-all outline-none bg-white border-gray-200 focus:ring-2 focus:ring-red-500`} placeholder="8位數字" /></div>
                  </div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">職務</label><input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={`w-full px-4 py-3 rounded-xl border transition-all outline-none bg-white border-gray-200 focus:ring-2 focus:ring-red-500`} placeholder="您的目前職位" /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">引薦人 (選填)</label><input type="text" value={formData.referrer} onChange={e => setFormData({...formData, referrer: e.target.value})} className={`w-full px-4 py-3 rounded-xl border transition-all outline-none bg-white border-gray-200 focus:ring-2 focus:ring-red-500`} placeholder="引薦您的夥伴姓名" /></div>
                  
                  <div><label className="block text-sm font-bold text-gray-700 mb-2">備註 (選填)</label><textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="若有特殊需求請在此說明" rows={2} /></div>

                  <div className={`p-4 rounded-xl border ${couponFree ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
                    <label className={`block text-sm font-bold mb-2 flex items-center gap-1 ${couponFree ? 'text-amber-800' : 'text-gray-700'}`}>{couponFree ? <Crown size={16} /> : <Ticket size={16} />} {couponFree ? 'VIP 免費邀請' : '活動折扣券'}</label>
                    <div className="flex gap-2">
                       <input type="text" value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus('idle'); setCouponMessage(''); }} className="flex-grow px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none uppercase font-mono placeholder:text-gray-300" placeholder="輸入代碼" disabled={couponStatus === 'valid'} />
                       {couponStatus !== 'valid' ? (
                         <button type="button" onClick={() => checkCoupon()} disabled={!couponCode || couponStatus === 'validating'} className="px-4 py-2 bg-gray-800 text-white rounded-lg font-bold text-sm hover:bg-gray-900 disabled:opacity-50 transition-colors">{couponStatus === 'validating' ? '檢查中...' : '使用'}</button>
                       ) : (
                         <button type="button" onClick={() => { setCouponStatus('idle'); setCouponCode(''); setDiscountAmount(0); setValidCouponId(undefined); setCouponFree(false); setCouponMessage(''); }} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-bold text-sm hover:bg-red-200 transition-colors">取消</button>
                       )}
                    </div>
                    {couponMessage && <p className={`text-xs font-bold mt-2 ${couponStatus === 'valid' ? (couponFree ? 'text-amber-700' : 'text-green-600') : 'text-red-500'}`}>{couponMessage}</p>}
                  </div>

                  {/* 點數抵扣：須先選取會員且有點數（VIP 免費時不顯示） */}
                  {!couponFree && selectedMember && memberPoints > 0 && (
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-bold text-amber-800 flex items-center gap-1"><Crown size={16} /> 會員點數折抵</label>
                        <span className="text-xs font-bold text-amber-700">目前點數：{memberPoints.toLocaleString()} 點</span>
                      </div>
                      {maxPoints > 0 ? (
                        <>
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              min={0}
                              max={maxPoints}
                              value={pointsApplied === 0 ? '' : pointsApplied}
                              onChange={e => {
                                const v = Math.floor(Number(e.target.value) || 0);
                                setPointsApplied(Math.max(0, Math.min(v, maxPoints)));
                              }}
                              className="flex-grow px-4 py-2 rounded-lg border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none"
                              placeholder={`最多可折抵 ${maxPoints} 點`}
                            />
                            <button type="button" onClick={() => setPointsApplied(maxPoints)} className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold text-sm hover:bg-amber-700 transition-colors whitespace-nowrap">全部折抵</button>
                            {pointsApplied > 0 && (
                              <button type="button" onClick={() => setPointsApplied(0)} className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg font-bold text-sm hover:bg-amber-200 transition-colors">清除</button>
                            )}
                          </div>
                          {pointsApplied > 0 && <p className="text-xs font-bold mt-2 text-green-600">折抵 NT$ {pointsDiscount.toLocaleString()}（{pointsApplied} 點）</p>}
                          <p className="text-[11px] text-amber-600/80 mt-1">1 點 = NT$ {POINT_TO_TWD}，點數於付款成功後正式扣除。</p>
                        </>
                      ) : (
                        <p className="text-xs text-amber-600">此活動金額已無可折抵空間。</p>
                      )}
                    </div>
                  )}

                  {/* 金流選項 */}
                  {finalPrice > 0 && (
                    <div 
                      className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${payNow ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`} 
                      onClick={() => setPayNow(!payNow)}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${payNow ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {payNow && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <div className="flex-grow">
                        <p className={`font-bold flex items-center gap-1 ${payNow ? 'text-blue-900' : 'text-gray-700'}`}><CreditCard size={16}/> 立即線上付款 (藍新金流)</p>
                        <p className={`text-xs ${payNow ? 'text-blue-600' : 'text-gray-400'}`}>支援信用卡、ATM 虛擬帳號</p>
                      </div>
                    </div>
                  )}

                  <button type="submit" disabled={isSubmitting || (props.type === 'member' && !formData.name)} className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2 shadow-lg shadow-red-200">
                    {isSubmitting ? <><Loader2 className="animate-spin" size={20} /> 處理中...</> : <><span>{payNow && finalPrice > 0 ? '送出並前往付款' : (props.type === 'member' ? '確認會員資料並報名' : '前往報名')}</span><span className="bg-red-800/30 px-2 py-0.5 rounded text-sm">NT$ {finalPrice.toLocaleString()}</span></>}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetail;
