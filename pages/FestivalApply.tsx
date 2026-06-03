import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { Loader2, Flame, AlertCircle, CheckCircle2, FileText } from 'lucide-react';

type FestivalType = 'yakiniku' | 'hotpot' | 'both';

const FESTIVAL_OPTIONS: { v: FestivalType; label: string }[] = [
  { v: 'yakiniku', label: '燒肉祭' },
  { v: 'hotpot', label: '火鍋祭' },
  { v: 'both', label: '燒肉祭與火鍋祭' },
];

// ⚠️ 合作期間日期請依實際檔期確認/調整
const ACTIVITY_INFO: Record<FestivalType, { name: string; period: string }> = {
  yakiniku: { name: '燒肉祭', period: '2026/08/01 起至 2026/09/30 止' },
  hotpot: { name: '火鍋祭', period: '2026/10/01 起至 2026/11/30 止' },
  both: { name: '燒肉祭與火鍋祭', period: '2026/08/01 起至 2026/11/30 止' },
};

const EXPOSURE_WAVES = [
  '第一波 6/8–6/14',
  '第二波 6/22–6/28',
  '第三波 7/6–7/12',
  '第四波 7/20–7/26',
];

const KOL_SIGNUP_URL = 'https://partner.koltoaction.com/signup';
const KOL_INVITE_CODE = 'meet2024';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

const FestivalApply: React.FC = () => {
  const navigate = useNavigate();

  // 基本資料
  const [festivalType, setFestivalType] = useState<FestivalType>('yakiniku');
  const [brandName, setBrandName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [representative, setRepresentative] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [projectContact, setProjectContact] = useState('');
  const [projectContactPhone, setProjectContactPhone] = useState('');

  // 呼叫KOL 合作細節
  const [brandWebsite, setBrandWebsite] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [mktName, setMktName] = useState('');
  const [mktLineId, setMktLineId] = useState('');
  const [mktPhone, setMktPhone] = useState('');
  const [mktEmail, setMktEmail] = useState('');
  const [bookingSystem, setBookingSystem] = useState('');
  const [bookingLink, setBookingLink] = useState('');
  const [sponsorPlan, setSponsorPlan] = useState<'A' | 'B' | ''>('');
  const [shootingAddress, setShootingAddress] = useState('');
  const [mealDetail, setMealDetail] = useState('');
  const [kolEmailDiff, setKolEmailDiff] = useState(false);
  const [kolInviteCode, setKolInviteCode] = useState(false);
  const [kolAccountCreated, setKolAccountCreated] = useState(false);
  const [waves, setWaves] = useState<string[]>([]);

  // 合約同意
  const [agreed, setAgreed] = useState(false);
  const [signerName, setSignerName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const activity = ACTIVITY_INFO[festivalType];

  const toggleWave = (w: string) =>
    setWaves((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));

  const handleSubmit = async () => {
    setError(null);

    const requiredText: [string, string][] = [
      [brandName, '參加品牌名稱'],
      [companyName, '公司登記名稱'],
      [taxId, '公司統編'],
      [representative, '公司負責人'],
      [contactEmail, '聯絡信箱'],
      [companyAddress, '公司登記地址'],
      [projectContact, '專案聯絡人'],
      [projectContactPhone, '專案聯絡人手機'],
      [shootingAddress, '合作拍攝店點地址'],
      [signerName, '簽署人姓名'],
    ];
    for (const [v, label] of requiredText) {
      if (!v.trim()) {
        setError(`請填寫「${label}」`);
        return;
      }
    }
    if (!/^\d{8}$/.test(taxId.trim())) {
      setError('公司統編須為 8 位數字');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setError('請輸入正確的聯絡信箱格式');
      return;
    }
    if (sponsorPlan !== 'A' && sponsorPlan !== 'B') {
      setError('請選擇贊助合作方案（A 或 B）');
      return;
    }
    if (!kolEmailDiff || !kolInviteCode || !kolAccountCreated) {
      setError('請確認並勾選呼叫KOL 平台帳號的三項提醒');
      return;
    }
    if (!agreed) {
      setError('請詳閱合約並勾選「我已詳閱並同意」');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('festival-apply', {
        body: {
          festival_type: festivalType,
          brand_name: brandName.trim(),
          company_name: companyName.trim(),
          tax_id: taxId.trim(),
          representative: representative.trim(),
          contact_email: contactEmail.trim(),
          company_address: companyAddress.trim(),
          project_contact: projectContact.trim(),
          project_contact_phone: projectContactPhone.trim(),
          brand_website: brandWebsite.trim(),
          social_link: socialLink.trim(),
          mkt_contact_name: mktName.trim(),
          mkt_contact_lineid: mktLineId.trim(),
          mkt_contact_phone: mktPhone.trim(),
          mkt_contact_email: mktEmail.trim(),
          booking_system: bookingSystem.trim(),
          booking_link: bookingLink.trim(),
          sponsor_plan: sponsorPlan,
          shooting_address: shootingAddress.trim(),
          meal_detail: mealDetail.trim(),
          kol_email_diff_confirmed: kolEmailDiff,
          kol_invite_code_confirmed: kolInviteCode,
          kol_account_created_confirmed: kolAccountCreated,
          exposure_waves: waves,
          contract_agreed: true,
          signer_name: signerName.trim(),
        },
      });

      if (fnError || !data?.ok) {
        console.error('festival-apply error:', fnError, data);
        setError((data && data.error) || '送出失敗，請稍後再試或聯繫協會');
        setSubmitting(false);
        return;
      }

      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('submit error:', err);
      setError('系統錯誤，請稍後再試');
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-10 text-center border border-orange-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">報名已送出</h1>
          <p className="text-gray-600 mb-2">感謝您的報名！我們已收到您的合作申請與合約同意。</p>
          <p className="text-gray-600 mb-8">協會專員將於 <strong className="text-red-600">1 個工作天內</strong>與您聯繫，並寄送繳費連結。</p>
          <button
            onClick={() => navigate('/festival')}
            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors"
          >
            返回活動介紹
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-red-50 to-white py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-orange-100 overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-orange-500 px-8 py-8 text-center text-white">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Flame size={28} />
          </div>
          <h1 className="text-2xl font-bold mb-1">燒肉祭 / 火鍋祭 合作報名表</h1>
          <p className="text-white/80 text-sm">填寫資料並閱讀同意合作合約，協會將於 1 個工作天內聯繫</p>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* 基本資料 */}
          <Section title="基本資料">
            <div>
              <Label required>選擇您這次想參加的活動</Label>
              <div className="grid grid-cols-3 gap-2">
                {FESTIVAL_OPTIONS.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setFestivalType(o.v)}
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                      festivalType === o.v ? 'border-red-600 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <Input label="參加本次活動的品牌名稱" required value={brandName} onChange={setBrandName} />
            <Input label="公司登記名稱" required value={companyName} onChange={setCompanyName} />
            <Input label="公司統編" required value={taxId} onChange={setTaxId} placeholder="8 位數字" inputMode="numeric" maxLength={8} />
            <Input label="公司負責人" required value={representative} onChange={setRepresentative} />
            <Input label="聯絡信箱" required type="email" value={contactEmail} onChange={setContactEmail} placeholder="name@example.com" />
            <Input label="公司登記地址" required value={companyAddress} onChange={setCompanyAddress} />
            <Input label="專案聯絡人" required value={projectContact} onChange={setProjectContact} />
            <Input label="專案聯絡人手機" required value={projectContactPhone} onChange={setProjectContactPhone} placeholder="0912345678" />
          </Section>

          {/* 呼叫KOL 合作細節 */}
          <Section title="呼叫KOL・合作細節確認">
            <Input label="品牌官網（若無，可填 Google Map 連結或「無」）" value={brandWebsite} onChange={setBrandWebsite} />
            <Input label="官方社群連結（IG 或 FB 擇一，IG 佳）" value={socialLink} onChange={setSocialLink} />
            <p className="text-xs text-gray-500 -mb-2">以下為主要行銷窗口（後續訂位、菜單等聯絡，可與專案聯絡人不同）</p>
            <Input label="行銷窗口姓名" value={mktName} onChange={setMktName} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="窗口 LineID" value={mktLineId} onChange={setMktLineId} />
              <Input label="窗口手機" value={mktPhone} onChange={setMktPhone} />
              <Input label="窗口 E-mail" value={mktEmail} onChange={setMktEmail} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="主要訂位系統（無則填「無」）" value={bookingSystem} onChange={setBookingSystem} placeholder="Inline、ODDLE、肚肚…" />
              <Input label="訂位連結（若無填「無」）" value={bookingLink} onChange={setBookingLink} />
            </div>

            {/* 贊助方案 */}
            <div>
              <Label required>選擇本次的贊助合作方案</Label>
              <div className="space-y-2">
                <PlanOption
                  selected={sponsorPlan === 'A'}
                  onClick={() => setSponsorPlan('A')}
                  title="【A 免費方案】2 位 IG 圖文創作"
                  price="免費"
                />
                <PlanOption
                  selected={sponsorPlan === 'B'}
                  onClick={() => setSponsorPlan('B')}
                  title="【B 超值方案】升級為 3 位影音"
                  price="NT$ 4,500"
                />
              </div>
            </div>

            <Input label="預計合作拍攝的店點地址" required value={shootingAddress} onChange={setShootingAddress} />

            {/* KOL 平台帳號 */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
              <p className="text-sm text-gray-700">
                <strong>呼叫KOL 平台福利：</strong>本專案需先
                <a href={KOL_SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="text-red-600 underline font-bold mx-1">申請帳號</a>
                方可啟動。申請時填寫邀請碼
                <span className="font-mono font-bold mx-1 px-1.5 py-0.5 bg-white rounded border border-amber-300">{KOL_INVITE_CODE}</span>
                即可領取免費發案鑽石（價值 2,400）。
              </p>
              <CheckRow checked={kolEmailDiff} onChange={setKolEmailDiff}>
                若已下載「呼叫KOL APP」，本次申請「商家帳號後台」的 Email 及手機，請勿與其相同
              </CheckRow>
              <CheckRow checked={kolInviteCode} onChange={setKolInviteCode}>
                申請帳號時已填寫邀請碼 <span className="font-mono font-bold">{KOL_INVITE_CODE}</span>，以領取發案鑽石
              </CheckRow>
              <CheckRow checked={kolAccountCreated} onChange={setKolAccountCreated}>
                帳號已申請完成
              </CheckRow>
            </div>

            <div>
              <Label>餐點提供細節</Label>
              <p className="text-xs text-gray-500 mb-2">每位 KOL 需提供 2 人份餐點（價值 1,000 元以上，可攜一位同行）。請說明餐點內容。</p>
              <textarea
                value={mealDetail}
                onChange={(e) => setMealDetail(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
              />
            </div>

            {/* 曝光波段 */}
            <div>
              <Label>曝光時間優先次序（可複選）</Label>
              <p className="text-xs text-gray-500 mb-2">曝光時間由呼叫網紅安排，以下為您的優先參考，不保證完全依期程上線。</p>
              <div className="grid grid-cols-2 gap-2">
                {EXPOSURE_WAVES.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => toggleWave(w)}
                    className={`py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                      waves.includes(w) ? 'border-red-600 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* 合約 */}
          <Section title="活動合作協議書">
            <p className="text-xs text-gray-500">請完整閱讀以下協議書內容，乙方欄位將依您上方填寫的資料自動帶入。</p>
            <div className="h-72 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-5 text-[13px] leading-relaxed text-gray-700 space-y-3">
              <p className="text-center text-base font-bold text-gray-900">活動合作協議書</p>
              <p>立協議書人</p>
              <p>
                <strong>甲方：</strong>食在力量美食產業交流協會（以下簡稱甲方）<br />
                <strong>乙方：</strong>{companyName || '（公司登記名稱）'}（以下簡稱乙方）
              </p>
              <p>
                茲因甲、乙雙方為促進企業資源整合、共創雙贏利基，乙方願加入甲方所舉辦之
                <strong>{activity.name}</strong>活動（下稱本活動）使用，合作期間為 <strong>{activity.period}</strong>。
                雙方同意秉持著誠信、互惠原則共同合作，特立以下之條款，以為共同遵守之依據：
              </p>
              <p className="font-bold">一、甲方：</p>
              <p>(1) 甲方應為本活動之內容宣傳及行銷。</p>
              <p>(2) 甲方使用乙方之品牌不得有抵損乙方商譽之行為。</p>
              <p className="font-bold">二、乙方：</p>
              <p>(1) 乙方同意支付新台幣 3,000 元給甲方，作為品牌上架費。</p>
              <p>(2) 乙方同意提供下列資源供本活動使用，並作為本活動內容宣傳及行銷用：a) 品牌 Logo；b) 價值 20,000 元以上的優惠券。</p>
              <p>
                (3) 乙方同意之活動方案：a) 方案A：免費提供 2 位 IG 圖文創作；b) 方案B：方案A 升級成 3 位 IG reels（影音），需另給付新台幣 4,500 元。
                <br />
                <span className="text-red-600 font-bold">（本次乙方選擇：{sponsorPlan === 'A' ? '方案A' : sponsorPlan === 'B' ? '方案B' : '尚未選擇'}）</span>
              </p>
              <p>(4) 乙方應提供本活動所需宣傳之品牌 LOGO、負責人肖像或其他著作物供甲方使用與曝光，但甲方於贊助文宣曝光前應提供乙方確認文宣內容後始得發布。另，乙方應保證前開提供甲方之宣傳內容皆屬合法授權。</p>
              <p>(5) 乙方應配合本活動之活動政策規定，不得任意取消本次合作或擅自更改約定之活動方案。</p>
              <p>(6) 本活動乙方所提供之文宣（包括但不限於品牌 LOGO、負責人肖像或其他著作物），甲方除於本活動期間得使用外，於活動結束後亦得繼續使用，包括但不限於甲方之官方網站、FB、IG 等相關社群媒體、甲方簡報及其他媒體曝光。惟若文宣使用引發不良效應，乙方得隨時通知甲方修改或撤文；若無不良效應，乙方不得要求甲方修改或撤文。</p>
              <p className="font-bold">三、其他重要約定事項：</p>
              <p>1. 除經他方事先同意，甲、乙雙方皆不得以移轉、讓與或其他方式，使第三人取得本協議書權利義務之全部或一部分。</p>
              <p>2. 本活動合作內容雙方應負保密義務。</p>
              <p>3. 本活動所製作之所有文宣品及其他著作物之著作權皆屬甲方所有。</p>
              <p>4. 雙方同意本於誠信原則履行本協議書內容，如因本協議書涉訟時，雙方同意以臺灣臺北地方法院為第一審管轄法院。</p>
              <p>5. 本協議書於乙方線上點選同意後始生效力。</p>
              <div className="border-t border-gray-300 pt-3 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="font-bold">甲方</p>
                  <p>食在力量美食產業交流協會</p>
                  <p>理事長：許淳凱</p>
                  <p>地址：臺北市中正區羅斯福路3段126號3樓</p>
                  <p>電話：0925-981577</p>
                  <p>立案證號：1130022533</p>
                </div>
                <div>
                  <p className="font-bold">乙方</p>
                  <p>公司：{companyName || '—'}</p>
                  <p>代表人：{representative || '—'}</p>
                  <p>統一編號：{taxId || '—'}</p>
                  <p>地址：{companyAddress || '—'}</p>
                  <p>聯絡人：{projectContact || '—'}</p>
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 accent-red-600 shrink-0"
              />
              <span className="text-sm text-gray-800 font-medium">
                本人已詳細閱讀並同意上述「活動合作協議書」之全部條款，並代表乙方公司確認簽署。
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="簽署人姓名" required value={signerName} onChange={setSignerName} placeholder="代表簽署人" />
              <div>
                <Label>簽署日期</Label>
                <div className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-600">{todayStr()}</div>
              </div>
            </div>
          </Section>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={22} /> 送出中...
              </>
            ) : (
              <>
                <FileText size={22} /> 送出報名與合約同意
              </>
            )}
          </button>
          <p className="text-xs text-center text-gray-400">送出後協會專員將於 1 個工作天內與您聯繫並寄送繳費連結</p>
        </div>
      </div>
    </div>
  );
};

// ---- 小元件 ----

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-4">
    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
      <span className="w-1.5 h-5 bg-red-600 rounded-full" /> {title}
    </h2>
    {children}
  </div>
);

const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block text-sm font-bold text-gray-700 mb-1.5">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
);

interface InputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'email' | 'tel';
  maxLength?: number;
}

const Input: React.FC<InputProps> = ({ label, value, onChange, required, type = 'text', placeholder, inputMode, maxLength }) => (
  <div>
    <Label required={required}>{label}</Label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      maxLength={maxLength}
      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
    />
  </div>
);

const PlanOption: React.FC<{ selected: boolean; onClick: () => void; title: string; price: string }> = ({ selected, onClick, title, price }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
      selected ? 'border-red-600 bg-red-50' : 'border-gray-200 hover:border-gray-300'
    }`}
  >
    <span className={`text-sm font-bold ${selected ? 'text-red-600' : 'text-gray-700'}`}>{title}</span>
    <span className={`text-sm font-bold shrink-0 ${selected ? 'text-red-600' : 'text-gray-500'}`}>{price}</span>
  </button>
);

const CheckRow: React.FC<{ checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }> = ({ checked, onChange, children }) => (
  <label className="flex items-start gap-3 cursor-pointer">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 w-5 h-5 accent-red-600 shrink-0" />
    <span className="text-sm text-gray-700">{children}</span>
  </label>
);

export default FestivalApply;
