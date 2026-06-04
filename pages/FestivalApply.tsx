import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { Loader2, Flame, AlertCircle, CheckCircle2, FileText, Plus, Trash2 } from 'lucide-react';

type FestivalType = 'yakiniku' | 'hotpot' | 'both';

const FESTIVAL_OPTIONS: { v: FestivalType; label: string }[] = [
  { v: 'yakiniku', label: '燒肉祭' },
  { v: 'hotpot', label: '火鍋祭' },
  { v: 'both', label: '兩者皆參加' },
];
const FESTIVAL_LABEL: Record<FestivalType, string> = { yakiniku: '燒肉祭', hotpot: '火鍋祭', both: '燒肉祭與火鍋祭' };

const EXPOSURE_WAVES = ['第一波 6/8–6/14', '第二波 6/22–6/28', '第三波 7/6–7/12', '第四波 7/20–7/26'];
const KOL_SIGNUP_URL = 'https://partner.koltoaction.com/signup';
const KOL_INVITE_CODE = 'meet2024';

const BRAND_UNIT_PRICE = 3000;
const INFLUENCER_UNIT_PRICE = 4500;

interface Brand {
  brand_name: string;
  festival_type: FestivalType;
  brand_website: string;
  social_link: string;
  mkt_contact_name: string;
  mkt_contact_lineid: string;
  mkt_contact_phone: string;
  mkt_contact_email: string;
  booking_system: string;
  booking_link: string;
  sponsor_plan: 'A' | 'B' | '';
  shooting_address: string;
  meal_detail: string;
  exposure_waves: string[];
  kol_email_diff_confirmed: boolean;
  kol_invite_code_confirmed: boolean;
  kol_account_created_confirmed: boolean;
}

const emptyBrand = (): Brand => ({
  brand_name: '',
  festival_type: 'yakiniku',
  brand_website: '',
  social_link: '',
  mkt_contact_name: '',
  mkt_contact_lineid: '',
  mkt_contact_phone: '',
  mkt_contact_email: '',
  booking_system: '',
  booking_link: '',
  sponsor_plan: '',
  shooting_address: '',
  meal_detail: '',
  exposure_waves: [],
  kol_email_diff_confirmed: false,
  kol_invite_code_confirmed: false,
  kol_account_created_confirmed: false,
});

const brandAmount = (b: Brand) =>
  BRAND_UNIT_PRICE * (b.festival_type === 'both' ? 2 : 1) + (b.sponsor_plan === 'B' ? INFLUENCER_UNIT_PRICE : 0);

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

const FestivalApply: React.FC = () => {
  const navigate = useNavigate();

  // 公司基本資料（填一次）
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [representative, setRepresentative] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [projectContact, setProjectContact] = useState('');
  const [projectContactPhone, setProjectContactPhone] = useState('');

  // 7/8 啟動記者會
  const [attendPress, setAttendPress] = useState<'yes' | 'no' | ''>('');
  const [pressAttendees, setPressAttendees] = useState(1);

  // 品牌明細（可多筆）
  const [brands, setBrands] = useState<Brand[]>([emptyBrand()]);

  // 合約同意
  const [agreed, setAgreed] = useState(false);
  const [signerName, setSignerName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const total = useMemo(() => brands.reduce((s, b) => s + brandAmount(b), 0), [brands]);

  const updateBrand = (i: number, patch: Partial<Brand>) =>
    setBrands((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const addBrand = () => setBrands((prev) => [...prev, emptyBrand()]);
  const removeBrand = (i: number) => setBrands((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  const toggleWave = (i: number, w: string) =>
    setBrands((prev) =>
      prev.map((b, idx) =>
        idx === i ? { ...b, exposure_waves: b.exposure_waves.includes(w) ? b.exposure_waves.filter((x) => x !== w) : [...b.exposure_waves, w] } : b
      )
    );

  const handleSubmit = async () => {
    setError(null);

    const companyRequired: [string, string][] = [
      [companyName, '公司登記名稱'],
      [taxId, '公司統編'],
      [representative, '公司負責人'],
      [contactEmail, '聯絡信箱'],
      [companyAddress, '公司登記地址'],
      [projectContact, '專案聯絡人'],
      [projectContactPhone, '專案聯絡人手機'],
      [signerName, '簽署人姓名'],
    ];
    for (const [v, label] of companyRequired) {
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
    if (attendPress !== 'yes' && attendPress !== 'no') {
      setError('請選擇是否出席 7/8 啟動記者會');
      return;
    }
    if (attendPress === 'yes' && pressAttendees < 1) {
      setError('請填寫記者會出席人數');
      return;
    }

    for (let i = 0; i < brands.length; i++) {
      const b = brands[i];
      const tag = `品牌 ${i + 1}`;
      if (!b.brand_name.trim()) {
        setError(`請填寫「${tag}」的品牌名稱`);
        return;
      }
      if (b.sponsor_plan !== 'A' && b.sponsor_plan !== 'B') {
        setError(`請選擇「${tag}」的贊助合作方案（A 或 B）`);
        return;
      }
      if (!b.shooting_address.trim()) {
        setError(`請填寫「${tag}」的合作拍攝店點地址`);
        return;
      }
      if (!b.kol_email_diff_confirmed || !b.kol_invite_code_confirmed || !b.kol_account_created_confirmed) {
        setError(`請確認並勾選「${tag}」呼叫KOL 平台帳號的三項提醒`);
        return;
      }
    }
    if (!agreed) {
      setError('請詳閱合約並勾選「我已詳閱並同意」');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('festival-apply', {
        body: {
          company_name: companyName.trim(),
          tax_id: taxId.trim(),
          representative: representative.trim(),
          contact_email: contactEmail.trim(),
          company_address: companyAddress.trim(),
          project_contact: projectContact.trim(),
          project_contact_phone: projectContactPhone.trim(),
          attend_press_conference: attendPress === 'yes',
          press_conference_attendees: attendPress === 'yes' ? pressAttendees : null,
          brands: brands.map((b) => ({
            brand_name: b.brand_name.trim(),
            festival_type: b.festival_type,
            brand_website: b.brand_website.trim(),
            social_link: b.social_link.trim(),
            mkt_contact_name: b.mkt_contact_name.trim(),
            mkt_contact_lineid: b.mkt_contact_lineid.trim(),
            mkt_contact_phone: b.mkt_contact_phone.trim(),
            mkt_contact_email: b.mkt_contact_email.trim(),
            booking_system: b.booking_system.trim(),
            booking_link: b.booking_link.trim(),
            sponsor_plan: b.sponsor_plan,
            shooting_address: b.shooting_address.trim(),
            meal_detail: b.meal_detail.trim(),
            exposure_waves: b.exposure_waves,
            kol_email_diff_confirmed: b.kol_email_diff_confirmed,
            kol_invite_code_confirmed: b.kol_invite_code_confirmed,
            kol_account_created_confirmed: b.kol_account_created_confirmed,
          })),
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
          <button onClick={() => navigate('/festival')} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
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
          <p className="text-white/80 text-sm">公司資料填一次，旗下每個品牌各填一組明細，閱讀同意合約即完成報名</p>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* 公司基本資料 */}
          <Section title="公司基本資料（集團填一次）">
            <Input label="公司登記名稱" required value={companyName} onChange={setCompanyName} />
            <Input label="公司統編" required value={taxId} onChange={setTaxId} placeholder="8 位數字" inputMode="numeric" maxLength={8} />
            <Input label="公司負責人" required value={representative} onChange={setRepresentative} />
            <Input label="聯絡信箱" required type="email" value={contactEmail} onChange={setContactEmail} placeholder="name@example.com" />
            <Input label="公司登記地址" required value={companyAddress} onChange={setCompanyAddress} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="專案聯絡人" required value={projectContact} onChange={setProjectContact} />
              <Input label="專案聯絡人手機" required value={projectContactPhone} onChange={setProjectContactPhone} placeholder="0912345678" />
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
              <Label required>是否出席 7/8 啟動記者會？</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAttendPress('yes')}
                  className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                    attendPress === 'yes' ? 'border-red-600 bg-red-50 text-red-600' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  出席
                </button>
                <button
                  type="button"
                  onClick={() => setAttendPress('no')}
                  className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
                    attendPress === 'no' ? 'border-red-600 bg-red-50 text-red-600' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }`}
                >
                  不出席
                </button>
              </div>
              {attendPress === 'yes' && (
                <div className="mt-3 flex items-center justify-between gap-4">
                  <Label>出席人數</Label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setPressAttendees((n) => Math.max(1, n - 1))} className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100">−</button>
                    <span className="w-8 text-center font-bold text-lg text-gray-900">{pressAttendees}</span>
                    <button type="button" onClick={() => setPressAttendees((n) => n + 1)} className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100">＋</button>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* 品牌明細 */}
          <Section title={`參加品牌明細（共 ${brands.length} 個品牌）`}>
            <p className="text-xs text-gray-500 -mt-2">每個品牌各自選擇場次與方案、各填一組呼叫KOL 合作細節。多品牌請點下方「新增品牌」。</p>
            {brands.map((b, i) => (
              <BrandCard
                key={i}
                index={i}
                brand={b}
                canRemove={brands.length > 1}
                onChange={(patch) => updateBrand(i, patch)}
                onRemove={() => removeBrand(i)}
                onToggleWave={(w) => toggleWave(i, w)}
              />
            ))}
            <button
              type="button"
              onClick={addBrand}
              className="w-full py-3 rounded-xl border-2 border-dashed border-red-300 text-red-600 font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} /> 新增品牌
            </button>
          </Section>

          {/* 合約 */}
          <Section title="活動合作協議書">
            <p className="text-xs text-gray-500">請完整閱讀以下協議書，乙方欄位與參加品牌將依您上方填寫的資料自動帶入。</p>
            <p className="text-xs text-gray-500">為響應環保，本次「活動合作協議書」將以線上電子填寫方式完成簽約，由甲方留存，不另提供實體紙本合約。經乙方填寫完畢將資料送出即完成本「活動合作協議書」之簽署。</p>
            <div className="h-72 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-5 text-[13px] leading-relaxed text-gray-700 space-y-3">
              <p className="text-center text-base font-bold text-gray-900">活動合作協議書</p>
              <p>立協議書人</p>
              <p>
                <strong>甲方：</strong>食在力量美食產業交流協會（以下簡稱甲方）<br />
                <strong>乙方：</strong>{companyName || '（公司登記名稱）'}（以下簡稱乙方）
              </p>
              <p>
                茲因甲、乙雙方為促進企業資源整合、共創雙贏利基，乙方願以旗下品牌加入甲方所舉辦之燒肉祭／火鍋祭活動（下稱本活動）。
                雙方同意秉持著誠信、互惠原則共同合作，特立以下之條款，以為共同遵守之依據：
              </p>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="font-bold mb-1">本次參加品牌與方案：</p>
                <ol className="list-decimal pl-5 space-y-0.5">
                  {brands.map((b, i) => (
                    <li key={i}>
                      {b.brand_name || `（品牌 ${i + 1}）`}　—　{FESTIVAL_LABEL[b.festival_type]}　—
                      {b.sponsor_plan === 'A' ? '方案A（免費）' : b.sponsor_plan === 'B' ? '方案B（影音 +4,500）' : '尚未選方案'}
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-red-600 font-bold">預估費用合計：NT$ {total.toLocaleString()}（以協會專員確認金額為準）</p>
              </div>
              <p className="font-bold">一、甲方：</p>
              <p>(1) 甲方應為本活動之內容宣傳及行銷。</p>
              <p>(2) 甲方使用乙方之品牌不得有抵損乙方商譽之行為。</p>
              <p className="font-bold">二、乙方：</p>
              <p>(1) 乙方同意就每一參加品牌支付新台幣 3,000 元給甲方，作為品牌上架費（每品牌每場次計）。</p>
              <p>(2) 乙方同意提供下列資源供本活動使用，並作為本活動內容宣傳及行銷用：a) 品牌 Logo；b) 價值 20,000 元以上的優惠券。</p>
              <p>(3) 乙方同意之活動方案：a) 方案A：免費提供 2 位 IG 圖文創作；b) 方案B：方案A 升級成 3 位 IG reels（影音），需另給付新台幣 4,500 元（每品牌計）。各品牌實際選擇如上表。</p>
              <p>(4) 乙方應提供本活動所需宣傳之品牌 LOGO、負責人肖像或其他著作物供甲方使用與曝光，但甲方於贊助文宣曝光前應提供乙方確認文宣內容後始得發布。另，乙方應保證前開提供甲方之宣傳內容皆屬合法授權。</p>
              <p>(5) 乙方應配合本活動之活動政策規定，不得任意取消本次合作或擅自更改約定之活動方案。</p>
              <p>(6) 本活動乙方所提供之文宣（包括但不限於品牌 LOGO、負責人肖像或其他著作物），甲方除於本活動期間得使用外，於活動結束後亦得繼續使用，包括但不限於甲方之官方網站、FB、IG 等相關社群媒體、甲方簡報及其他媒體曝光。惟若文宣使用引發不良效應，乙方得隨時通知甲方修改或撤文；若無不良效應，乙方不得要求甲方修改或撤文。</p>
              <p className="font-bold">三、其他重要約定事項：</p>
              <p>1. 除經他方事先同意，甲、乙雙方皆不得以移轉、讓與或其他方式，使第三人取得本協議書權利義務之全部或一部分。</p>
              <p>2. 本活動合作內容雙方應負保密義務。</p>
              <p>3. 本活動所製作之所有文宣品及其他著作物之著作權皆屬甲方所有。</p>
              <p>4. 雙方同意本於誠信原則履行本協議書內容，如因本協議書涉訟時，雙方同意以臺灣臺北地方法院為第一審管轄法院。</p>
              <p>5. 本協議書於乙方線上點選同意後即生效力。</p>
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
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 w-5 h-5 accent-red-600 shrink-0" />
              <span className="text-sm text-gray-800 font-medium">
                本人已詳細閱讀並同意上述「活動合作協議書」之全部條款，且經乙方合法授權，得代表乙方確認並簽署(填寫)本協議。
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

// ---- 品牌卡片 ----

interface BrandCardProps {
  index: number;
  brand: Brand;
  canRemove: boolean;
  onChange: (patch: Partial<Brand>) => void;
  onRemove: () => void;
  onToggleWave: (w: string) => void;
}

const BrandCard: React.FC<BrandCardProps> = ({ index, brand, canRemove, onChange, onRemove, onToggleWave }) => (
  <div className="rounded-2xl border-2 border-orange-100 bg-orange-50/30 p-4 sm:p-5 space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="font-bold text-gray-900 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">{index + 1}</span>
        品牌 {index + 1}
        <span className="text-xs font-normal text-gray-400">（小計 NT$ {brandAmount(brand).toLocaleString()}）</span>
      </h3>
      {canRemove && (
        <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-600 flex items-center gap-1 text-sm">
          <Trash2 size={16} /> 移除
        </button>
      )}
    </div>

    <Input label="品牌名稱" required value={brand.brand_name} onChange={(v) => onChange({ brand_name: v })} />

    <div>
      <Label required>參加場次</Label>
      <div className="grid grid-cols-3 gap-2">
        {FESTIVAL_OPTIONS.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange({ festival_type: o.v })}
            className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${
              brand.festival_type === o.v ? 'border-red-600 bg-red-50 text-red-600' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>

    <Input label="品牌官網（若無，可填 Google Map 連結或「無」）" value={brand.brand_website} onChange={(v) => onChange({ brand_website: v })} />
    <Input label="官方社群連結（IG 或 FB 擇一，IG 佳）" value={brand.social_link} onChange={(v) => onChange({ social_link: v })} />
    <p className="text-xs text-gray-500 -mb-2">主要行銷窗口（後續訂位、菜單等聯絡，可與專案聯絡人不同）</p>
    <Input label="行銷窗口姓名" value={brand.mkt_contact_name} onChange={(v) => onChange({ mkt_contact_name: v })} />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Input label="窗口 LineID" value={brand.mkt_contact_lineid} onChange={(v) => onChange({ mkt_contact_lineid: v })} />
      <Input label="窗口手機" value={brand.mkt_contact_phone} onChange={(v) => onChange({ mkt_contact_phone: v })} />
      <Input label="窗口 E-mail" value={brand.mkt_contact_email} onChange={(v) => onChange({ mkt_contact_email: v })} />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Input label="主要訂位系統（無則填「無」）" value={brand.booking_system} onChange={(v) => onChange({ booking_system: v })} placeholder="Inline、ODDLE、肚肚…" />
      <Input label="訂位連結（若無填「無」）" value={brand.booking_link} onChange={(v) => onChange({ booking_link: v })} />
    </div>

    <div>
      <Label required>選擇本品牌的贊助合作方案</Label>
      <div className="space-y-2">
        <PlanOption selected={brand.sponsor_plan === 'A'} onClick={() => onChange({ sponsor_plan: 'A' })} title="【A 免費方案】2 位 IG 圖文創作" price="免費" />
        <PlanOption selected={brand.sponsor_plan === 'B'} onClick={() => onChange({ sponsor_plan: 'B' })} title="【B 超值方案】升級為 3 位影音" price="NT$ 4,500" />
      </div>
    </div>

    <Input label="預計合作拍攝的店點地址" required value={brand.shooting_address} onChange={(v) => onChange({ shooting_address: v })} />

    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
      <p className="text-sm text-gray-700">
        <strong>呼叫KOL 平台福利：</strong>本專案需先
        <a href={KOL_SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="text-red-600 underline font-bold mx-1">申請帳號</a>
        方可啟動。申請時填寫邀請碼
        <span className="font-mono font-bold mx-1 px-1.5 py-0.5 bg-white rounded border border-amber-300">{KOL_INVITE_CODE}</span>
        即可領取免費發案鑽石（價值 2,400）。
      </p>
      <CheckRow checked={brand.kol_email_diff_confirmed} onChange={(v) => onChange({ kol_email_diff_confirmed: v })}>
        若已下載「呼叫KOL APP」，本次申請「商家帳號後台」的 Email 及手機，請勿與其相同
      </CheckRow>
      <CheckRow checked={brand.kol_invite_code_confirmed} onChange={(v) => onChange({ kol_invite_code_confirmed: v })}>
        申請帳號時已填寫邀請碼 <span className="font-mono font-bold">{KOL_INVITE_CODE}</span>，以領取發案鑽石
      </CheckRow>
      <CheckRow checked={brand.kol_account_created_confirmed} onChange={(v) => onChange({ kol_account_created_confirmed: v })}>
        帳號已申請完成
      </CheckRow>
    </div>

    <div>
      <Label>餐點提供細節</Label>
      <p className="text-xs text-gray-500 mb-2">每位 KOL 需提供 2 人份餐點（價值 1,000 元以上，可攜一位同行）。請說明餐點內容。</p>
      <textarea
        value={brand.meal_detail}
        onChange={(e) => onChange({ meal_detail: e.target.value })}
        rows={2}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none"
      />
    </div>

    <div>
      <Label>曝光時間優先次序（可複選）</Label>
      <div className="grid grid-cols-2 gap-2">
        {EXPOSURE_WAVES.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => onToggleWave(w)}
            className={`py-2 rounded-xl text-sm font-medium border-2 transition-colors ${
              brand.exposure_waves.includes(w) ? 'border-red-600 bg-red-50 text-red-600' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  </div>
);

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
      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none bg-white"
    />
  </div>
);

const PlanOption: React.FC<{ selected: boolean; onClick: () => void; title: string; price: string }> = ({ selected, onClick, title, price }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
      selected ? 'border-red-600 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
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
