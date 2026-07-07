
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import emailjs from '@emailjs/browser';
import { UserPlus, Save, Loader2, Building2, User, Phone, Briefcase, FileText, CreditCard, Gift, Zap, Users, Target, Globe, Award } from 'lucide-react';
import { IndustryCategories, PaymentStatus } from '../types';
import { EMAIL_CONFIG } from '../constants';
import { submitNewebPayForm } from '../utils/newebpay';
import { notifyAdmin } from '../utils/notification';
import { supabase } from '../utils/supabaseClient';

const ANNUAL_FEE = 5000;

const MemberJoin: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    // 基本資料
    name: '',
    id_number: '',
    birthday: '',
    referrer: '',
    
    // 聯絡方式
    phone: '',
    email: '',
    home_phone: '',
    address: '',
    
    // 事業資料
    industry_category: IndustryCategories[0],
    brand_name: '',
    company_title: '',
    tax_id: '',
    job_title: '',
    website: '',
    main_service: '',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── 入會折扣券（會籍券：coupons.activity_id 為 NULL）──
  const [searchParams] = useSearchParams();
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [couponMsg, setCouponMsg] = useState('');
  const [coupon, setCoupon] = useState<{ id: string; discount: number; isFree: boolean } | null>(null);

  const finalFee = coupon ? (coupon.isFree ? 0 : Math.max(0, ANNUAL_FEE - coupon.discount)) : ANNUAL_FEE;

  const applyCoupon = async (raw?: string) => {
    const code = (raw ?? couponCode).trim().toUpperCase();
    if (!code) { setCouponStatus('invalid'); setCouponMsg('請輸入折扣碼'); return; }
    if (!supabase) return;
    setCouponStatus('checking'); setCouponMsg('');
    try {
      const { data, error } = await supabase.from('coupons').select('*').eq('code', code).maybeSingle();
      if (error || !data) { setCoupon(null); setCouponStatus('invalid'); setCouponMsg('查無此折扣碼'); return; }
      if (data.activity_id) { setCoupon(null); setCouponStatus('invalid'); setCouponMsg('此折扣碼僅適用於活動報名，不適用入會'); return; }
      if (data.is_used) { setCoupon(null); setCouponStatus('invalid'); setCouponMsg(data.is_free ? '此邀請連結已被使用' : '此折扣碼已被使用'); return; }
      setCoupon({ id: String(data.id), discount: data.discount_amount || 0, isFree: !!data.is_free });
      setCouponCode(code);
      setCouponStatus('valid');
      setCouponMsg(data.is_free ? '已套用：入會費全額減免' : `已套用：折抵 NT$ ${(data.discount_amount || 0).toLocaleString()}`);
    } catch {
      setCoupon(null); setCouponStatus('invalid'); setCouponMsg('驗證失敗，請稍後再試');
    }
  };

  // 網址帶 ?c=CODE 時自動套用（後台發的會籍券連結）
  useEffect(() => {
    const c = searchParams.get('c');
    if (c) { setCouponCode(c.toUpperCase()); applyCoupon(c); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendJoinConfirmationEmail = async (memberData: any) => {
    // 檢查 EmailJS 設定是否存在
    if (!EMAIL_CONFIG.SERVICE_ID || EMAIL_CONFIG.SERVICE_ID === 'YOUR_NEW_SERVICE_ID') {
      console.warn('EmailJS 未設定，跳過發送');
      return false;
    }

    try {
      // 構建詳細的申請資料內容 (完整欄位)
      const details = `
【基本資料】
姓名：${memberData.name}
身分證字號：${memberData.id_number}
生日：${memberData.birthday}
引薦人：${memberData.referrer || '(未填寫)'}

【聯絡方式】
手機：${memberData.phone}
Email：${memberData.email}
室內電話：${memberData.home_phone}
通訊地址：${memberData.address}

【事業資料】
產業分類：${memberData.industry_category}
品牌名稱：${memberData.brand_name}
公司抬頭：${memberData.company_title}
統一編號：${memberData.tax_id}
職稱：${memberData.job_title}
公司網站：${memberData.website || '(未填寫)'}
主要服務/產品：
${memberData.main_service}

【備註】
${memberData.notes || '(無)'}
      `;

      // 使用 Email 模板參數進行映射
      const templateParams = {
        to_name: memberData.name,
        // 增加 to_email 與 reply_to 以確保模板能正確抓到收件人
        email: memberData.email,
        to_email: memberData.email,
        reply_to: memberData.email,
        
        phone: memberData.phone,
        company: memberData.company_title || memberData.brand_name,
        job_title: memberData.job_title,
        
        // 專為會員申請設定的標題與資訊
        activity_title: '【食在力量】會員入會申請',
        activity_date: new Date().toISOString().slice(0, 10), // 申請日期
        activity_time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        activity_location: '線上申請 (前往繳費)', 
        activity_price: `NT$ ${ANNUAL_FEE.toLocaleString()} (入會費/年費)`,
        
        // 詳細資料區塊
        message: details 
      };

      // 使用新的 MEMBER_JOIN_TEMPLATE_ID
      await emailjs.send(EMAIL_CONFIG.SERVICE_ID, EMAIL_CONFIG.MEMBER_JOIN_TEMPLATE_ID, templateParams, EMAIL_CONFIG.PUBLIC_KEY);
      console.log('Confirmation email sent successfully to:', memberData.email);
      return true;
    } catch (error) {
      console.error('入會確認信發送失敗:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setIsSubmitting(true);

    try {
      // 0. 檢查是否已經是會員 (避免重複申請)
      const { data: existingMember, error: checkError } = await supabase
        .from('members')
        .select('id, name, member_no')
        .eq('id_number', formData.id_number.trim())
        .maybeSingle();

      if (checkError) {
        console.error('Check existing member error:', checkError);
      }

      if (existingMember) {
        alert(`系統偵測到您已是本會會員 (編號: ${existingMember.member_no})。\n\n舊會員請直接辦理「會員續約」，不須重新申請入會。`);
        navigate('/renew');
        setIsSubmitting(false);
        return;
      }

      // 1. 準備寫入資料 (寫入 member_applications 表)
      const merchantOrderNo = `JOIN_${Date.now()}`;
      const newApplication = {
        id: crypto.randomUUID(),
        status: 'pending', // 狀態為待審核
        created_at: new Date().toISOString(),
        
        name: formData.name,
        id_number: formData.id_number,
        birthday: formData.birthday,
        referrer: formData.referrer,
        
        phone: formData.phone,
        email: formData.email,
        home_phone: formData.home_phone,
        address: formData.address,
        
        industry_category: formData.industry_category,
        brand_name: formData.brand_name,
        company_title: formData.company_title,
        tax_id: formData.tax_id,
        job_title: formData.job_title,
        website: formData.website,
        main_service: formData.main_service,
        notes: formData.notes,

        // 金流資訊
        payment_status: finalFee === 0 ? PaymentStatus.PAID : PaymentStatus.PENDING,
        payment_method: finalFee === 0 ? 'coupon_free' : null,
        merchant_order_no: merchantOrderNo,
        paid_amount: finalFee,
        coupon_code: coupon ? couponCode : null,
      };

      // 2. 寫入資料庫 (member_applications)
      const { error: insertError } = await supabase.from('member_applications').insert([newApplication]);

      if (insertError) throw insertError;

      // 標記折扣券已使用（沿用活動券模式：送出即核銷）
      if (coupon) {
        await supabase.from('coupons').update({ is_used: true, used_at: new Date().toISOString() }).eq('id', coupon.id);
      }

      // 全額減免（0 元）→ 無需付款，直接完成申請、待審核
      if (finalFee === 0) {
        alert(`申請資料已送出！\n\n您已使用減免券，入會費 0 元、無需付款。\n待管理員審核後即完成入會。`);
        navigate('/');
        return;
      }

      // 3. 轉導至藍新金流付款（金額為折扣後的實付金額）
      alert(`申請資料已送出！\n\n即將轉導至付款頁面，請完成繳費以完成入會程序。`);

      await submitNewebPayForm({
        MerchantOrderNo: merchantOrderNo,
        Amt: finalFee,
        ItemDesc: `食在力量會員年費 (${newApplication.name})`,
        Email: newApplication.email
      });

    } catch (error: any) {
      console.error('Registration failed:', error);
      alert('報名失敗：' + error.message);
      setIsSubmitting(false);
    } 
    // finally 不要在這裡設為 false，因為要轉導頁面
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl text-white mb-4 shadow-lg shadow-red-200">
            <UserPlus size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">加入食在力量會員</h1>
          <p className="text-gray-500">填寫以下資料，立即成為我們的一份子，共享產業資源。</p>
        </div>

        {/* 1. 會員權益與說明區塊 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          {/* 年度費用 */}
          <div className="bg-red-600 text-white p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 relative z-10">
              <CreditCard className="text-red-200" /> 年度費用說明
            </h2>
            <div className="flex flex-col md:flex-row gap-6 md:gap-12 relative z-10">
              <div className="bg-red-700/50 p-4 rounded-xl flex-1 backdrop-blur-sm border border-red-500/30">
                <div className="text-red-200 text-sm font-bold mb-1 flex items-center gap-2"><CreditCard size={14}/> 會員費</div>
                {coupon ? (
                  <div>
                    <div className="text-lg font-bold line-through opacity-60">NT$ {ANNUAL_FEE.toLocaleString()} / 年</div>
                    <div className="text-2xl font-extrabold">{finalFee === 0 ? '入會費全免 🎉' : `NT$ ${finalFee.toLocaleString()} / 年`}</div>
                  </div>
                ) : (
                  <div className="text-xl font-bold">NT$ 5,000 / 年（自加入日起一年到期）</div>
                )}
                {/* 折扣券（會籍券）*/}
                <div className="mt-3">
                  <div className="flex gap-2">
                    <input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus('idle'); setCoupon(null); }}
                      placeholder="輸入折扣碼（選填）"
                      className="flex-1 px-3 py-2 rounded-lg text-gray-900 text-sm outline-none uppercase font-mono placeholder:text-gray-400 placeholder:normal-case" />
                    <button type="button" onClick={() => applyCoupon()} disabled={couponStatus === 'checking'}
                      className="px-4 py-2 rounded-lg bg-white text-red-700 font-bold text-sm hover:bg-red-50 disabled:opacity-50 shrink-0">
                      {couponStatus === 'checking' ? '驗證中' : coupon ? '重新套用' : '套用'}
                    </button>
                  </div>
                  {couponMsg && <p className={`text-xs mt-1 ${couponStatus === 'valid' ? 'text-green-200' : 'text-yellow-200'}`}>{couponMsg}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {/* 會員權益 */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Gift className="text-red-600" /> 會員權益（報名優惠、限量活動）
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  '講座論壇：講座型交流會（台北/台中/高雄）',
                  '美食小聚：聚餐型交流會（台北/台中/高雄）',
                  '企業參訪：實地走訪優質企業',
                  '線上分享會：隨時隨地學習產業新知',
                  '專案活動：美食市集、燒肉季、火鍋季、通路節'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-700 bg-gray-50 p-3 rounded-lg">
                    <Zap className="text-red-500 shrink-0 mt-0.5" size={16} fill="currentColor" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-gray-100 my-6"></div>

            {/* 美食 PT 計畫 */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Award className="text-red-600" /> 【美食PT計畫】協會會員專屬
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 品牌協作 */}
                <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
                  <h4 className="font-bold text-lg text-orange-800 mb-4 flex items-center gap-2">
                    <Target size={20}/> 品牌協作
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <div className="font-bold text-gray-800 mb-1">1. 餐飲人俱樂部</div>
                      <p className="text-sm text-gray-600">匯集各專業夥伴一起來服務餐飲品牌。如果您的目標客戶也是餐飲店家，歡迎一起加入運作！</p>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 mb-1">2. 食品人俱樂部</div>
                      <p className="text-sm text-gray-600">匯集各專業夥伴一起來服務食品品牌。如果您的目標客戶也是食品業者，歡迎一起加入運作！</p>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 mb-1">3. 品牌研究室</div>
                      <p className="text-sm text-gray-600">品牌論壇、專業課程、品牌顧問諮詢、企業輔導資源對接。</p>
                    </div>
                  </div>
                </div>

                {/* 通路協作 */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                  <h4 className="font-bold text-lg text-blue-800 mb-4 flex items-center gap-2">
                    <Globe size={20}/> 通路協作
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <div className="font-bold text-gray-800 mb-1">1. 企業福委PT</div>
                      <p className="text-sm text-gray-600">成立企業服務小組，匯集各專業夥伴一起來服務企業客戶。如果您的目標客戶也是中小企業，歡迎一起加入運作！</p>
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 mb-1">2. 國際市場PT</div>
                      <p className="text-sm text-gray-600">對接國外市場，協助抱團參展共同行銷。如果您也想把產品推廣到海外市場，歡迎一起加入運作！</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* 基本資料 */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
              <User className="text-red-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">基本資料</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">姓名 <span className="text-red-500">*</span></label>
                <input required name="name" type="text" value={formData.name} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="請輸入真實姓名" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">身分證字號 <span className="text-red-500">*</span></label>
                <input required name="id_number" type="text" value={formData.id_number} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="用於建檔識別" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">生日 <span className="text-red-500">*</span></label>
                <input required name="birthday" type="date" value={formData.birthday} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">引薦人</label>
                <input name="referrer" type="text" value={formData.referrer} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="若是經由會員介紹請填寫" />
              </div>
            </div>
          </div>

          {/* 聯絡方式 */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
              <Phone className="text-red-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">聯絡方式</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">手機 <span className="text-red-500">*</span></label>
                <input required name="phone" type="tel" value={formData.phone} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="09xx-xxx-xxx" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">電子信箱 <span className="text-red-500">*</span></label>
                <input required name="email" type="email" value={formData.email} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="example@mail.com" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">室內電話 <span className="text-red-500">*</span></label>
                <input required name="home_phone" type="tel" value={formData.home_phone} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="02-xxxx-xxxx" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">通訊地址 <span className="text-red-500">*</span></label>
                <input required name="address" type="text" value={formData.address} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="請輸入完整地址" />
              </div>
            </div>
          </div>

          {/* 事業資料 */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
              <Briefcase className="text-red-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">事業資料</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">產業分類 <span className="text-red-500">*</span></label>
                <select required name="industry_category" value={formData.industry_category} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all bg-white">
                  {IndustryCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">品牌名稱 <span className="text-red-500">*</span></label>
                <input required name="brand_name" type="text" value={formData.brand_name} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="店名或品牌名" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">公司抬頭 <span className="text-red-500">*</span></label>
                <input required name="company_title" type="text" value={formData.company_title} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="公司登記名稱" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">統一編號 <span className="text-red-500">*</span></label>
                <input required name="tax_id" type="text" value={formData.tax_id} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">職稱 <span className="text-red-500">*</span></label>
                <input required name="job_title" type="text" value={formData.job_title} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="例如：負責人、店長" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">公司網站</label>
                <input name="website" type="url" value={formData.website} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="https://..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">主要服務/產品 <span className="text-red-500">*</span></label>
                <textarea required name="main_service" rows={3} value={formData.main_service} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="請簡述您的主要營業項目或產品"></textarea>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">備註</label>
                <textarea name="notes" rows={2} value={formData.notes} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" placeholder="其他補充事項"></textarea>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-red-200"
          >
            {isSubmitting ? <><Loader2 className="animate-spin" /> 處理中...</> : <><Save /> {finalFee === 0 ? '送出申請（免費入會）' : `送出申請，並前往付款 $${finalFee.toLocaleString()}`}</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MemberJoin;
