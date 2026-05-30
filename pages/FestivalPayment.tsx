import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { submitNewebPayForm } from '../utils/newebpay';
import { Loader2, CreditCard, Flame, Minus, Plus, AlertCircle } from 'lucide-react';

const BRAND_UNIT_PRICE = 3000;
const INFLUENCER_UNIT_PRICE = 4500;

type FestivalType = 'yakiniku' | 'hotpot';

const FESTIVAL_LABEL: Record<FestivalType, string> = {
  yakiniku: '燒肉祭',
  hotpot: '火鍋祭',
};

const FestivalPayment: React.FC = () => {
  const navigate = useNavigate();

  const [festivalType, setFestivalType] = useState<FestivalType>('yakiniku');
  const [brandName, setBrandName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [taxId, setTaxId] = useState('');
  const [brandCount, setBrandCount] = useState(1);
  const [influencerCount, setInfluencerCount] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => brandCount * BRAND_UNIT_PRICE + influencerCount * INFLUENCER_UNIT_PRICE,
    [brandCount, influencerCount]
  );

  const clamp = (n: number, min: number) => (Number.isFinite(n) && n >= min ? Math.floor(n) : min);

  const handlePayment = async () => {
    setError(null);

    if (!brandName.trim() || !contactName.trim() || !contactEmail.trim() || !contactPhone.trim()) {
      setError('請完整填寫品牌名稱與聯絡資料');
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim());
    if (!emailOk) {
      setError('請輸入正確的 Email 格式');
      return;
    }
    if (taxId.trim() && !/^\d{8}$/.test(taxId.trim())) {
      setError('統編須為 8 位數字');
      return;
    }
    if (brandCount < 1) {
      setError('品牌數至少為 1');
      return;
    }

    setSubmitting(true);
    try {
      const merchantOrderNo = `FEST_${Date.now()}`;

      const { error: insertError } = await supabase.from('festival_registrations').insert({
        festival_type: festivalType,
        brand_name: brandName.trim(),
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        invoice_title: invoiceTitle.trim() || null,
        tax_id: taxId.trim() || null,
        brand_count: brandCount,
        influencer_video_count: influencerCount,
        amount: total,
        merchant_order_no: merchantOrderNo,
        payment_status: 'pending',
      });

      if (insertError) {
        console.error('Failed to create festival registration:', insertError);
        setError('系統錯誤，無法建立報名資料，請稍後再試');
        setSubmitting(false);
        return;
      }

      submitNewebPayForm({
        MerchantOrderNo: merchantOrderNo,
        Amt: total,
        ItemDesc: `${FESTIVAL_LABEL[festivalType]}報名-${brandName.trim()}`.slice(0, 50),
        Email: contactEmail.trim(),
      });
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError('系統錯誤，請稍後再試');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-red-50 to-white flex flex-col items-center justify-center p-4 py-10">
      <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full border border-orange-100 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-orange-500 px-8 py-8 text-center text-white">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Flame size={28} />
          </div>
          <h1 className="text-2xl font-bold mb-1">燒肉祭 / 火鍋祭 報名繳費</h1>
          <p className="text-white/80 text-sm">填寫品牌資料並選擇方案，立即完成報名</p>
        </div>

        <div className="p-8 space-y-6">
          {/* 祭典選擇 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">報名祭典</label>
            <div className="grid grid-cols-2 gap-3">
              {(['yakiniku', 'hotpot'] as FestivalType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFestivalType(t)}
                  className={`py-3 rounded-xl font-bold border-2 transition-colors ${
                    festivalType === t
                      ? 'border-red-600 bg-red-50 text-red-600'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {FESTIVAL_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* 聯絡資料 */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">品牌名稱</label>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="例：食在力量燒肉"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">聯絡人</label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="聯絡人姓名"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">電話</label>
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  發票抬頭 <span className="font-normal text-gray-400">（選填）</span>
                </label>
                <input
                  value={invoiceTitle}
                  onChange={(e) => setInvoiceTitle(e.target.value)}
                  placeholder="公司抬頭"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  統一編號 <span className="font-normal text-gray-400">（選填）</span>
                </label>
                <input
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="8 位數字"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 方案選擇 */}
          <div className="space-y-4 bg-gray-50 p-5 rounded-2xl">
            <Stepper
              title="報名品牌數"
              subtitle={`每個品牌 NT$ ${BRAND_UNIT_PRICE.toLocaleString()}`}
              value={brandCount}
              min={1}
              onChange={(v) => setBrandCount(clamp(v, 1))}
            />
            <div className="border-t border-gray-200" />
            <Stepper
              title="網紅影音曝光升級"
              subtitle={`每個 NT$ ${INFLUENCER_UNIT_PRICE.toLocaleString()}（3則影音）｜不升級則為 2 篇圖文`}
              value={influencerCount}
              min={0}
              onChange={(v) => setInfluencerCount(clamp(v, 0))}
            />
          </div>

          {/* 金額 */}
          <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
            <span className="text-gray-900 font-bold">應付總額</span>
            <span className="text-3xl font-bold text-red-600">NT$ {total.toLocaleString()}</span>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={submitting}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={22} /> 處理中...
              </>
            ) : (
              <>
                <CreditCard size={24} /> 立即前往繳費
              </>
            )}
          </button>
          <p className="text-xs text-center text-gray-400">點擊後將轉導至藍新金流安全支付頁面</p>
          <button
            onClick={() => navigate('/festival')}
            className="w-full text-sm text-gray-400 hover:text-gray-600"
          >
            返回活動介紹
          </button>
        </div>
      </div>
    </div>
  );
};

interface StepperProps {
  title: string;
  subtitle: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}

const Stepper: React.FC<StepperProps> = ({ title, subtitle, value, min, onChange }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <p className="font-bold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Minus size={16} />
      </button>
      <span className="w-8 text-center font-bold text-lg text-gray-900">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100"
      >
        <Plus size={16} />
      </button>
    </div>
  </div>
);

export default FestivalPayment;
