import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Loader2, RefreshCcw, CheckCircle, XCircle, Link2, Eye, X, Flame, Receipt } from 'lucide-react';
import ReceiptModal, { ReceiptData } from '../components/ReceiptModal';

interface BrandDetail {
  brand_name: string;
  festival_type: 'yakiniku' | 'hotpot' | 'both';
  brand_website?: string;
  social_link?: string;
  mkt_contact_name?: string;
  mkt_contact_lineid?: string;
  mkt_contact_phone?: string;
  mkt_contact_email?: string;
  booking_system?: string;
  booking_link?: string;
  sponsor_plan?: 'A' | 'B' | '';
  shooting_address?: string;
  meal_detail?: string;
  exposure_waves?: string[];
  kol_email_diff_confirmed?: boolean;
  kol_invite_code_confirmed?: boolean;
  kol_account_created_confirmed?: boolean;
}

interface FestivalApplication {
  id: string;
  company_name: string;
  tax_id: string;
  representative: string;
  contact_email: string;
  company_address: string;
  project_contact: string;
  project_contact_phone: string;
  brands?: BrandDetail[];
  // 相容：舊單品牌欄位
  brand_name?: string;
  festival_type?: 'yakiniku' | 'hotpot' | 'both';
  sponsor_plan?: 'A' | 'B' | null;
  contract_agreed?: boolean;
  signer_name?: string;
  agreed_at?: string;
  agreed_ip?: string;
  attend_press_conference?: boolean;
  press_conference_attendees?: number | null;
  press_conference_attendee_names?: string[] | null;
  attend_forum?: boolean;
  forum_attendees?: number | null;
  forum_attendee_names?: string[] | null;
  waive_listing_fee?: boolean;
  status: string;
  registration_id?: string | null;
  payment_link?: string | null;
  created_at: string;
}

interface FestivalRegistration {
  id: string;
  created_at?: string;
  amount?: number;
  paid_amount?: number | null;
  paid_at?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  merchant_order_no?: string | null;
  invoice_title?: string | null;
  tax_id?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  brand_name?: string | null;
  festival_type?: string | null;
  brand_count?: number | null;
  influencer_video_count?: number | null;
  application_id?: string | null;
}

const FESTIVAL_LABEL: Record<string, string> = {
  yakiniku: '燒肉祭',
  hotpot: '火鍋祭',
  both: '燒肉祭與火鍋祭',
};

const planLabel = (p?: string | null) =>
  p === 'B' ? 'B 超值方案（3位影音 +4,500）' : p === 'A' ? 'A 免費方案（2位圖文）' : '未選';

const listingOf = (app: FestivalApplication) => (app.waive_listing_fee ? 0 : 3000);

const brandAmount = (b: BrandDetail, listingPrice: number) =>
  listingPrice * (b.festival_type === 'both' ? 2 : 1) + (b.sponsor_plan === 'B' ? 4500 : 0);

// 取得品牌陣列（相容舊單品牌資料）
const brandsOf = (app: FestivalApplication): BrandDetail[] => {
  if (app.brands && app.brands.length > 0) return app.brands;
  if (app.brand_name && app.festival_type) {
    return [{ brand_name: app.brand_name, festival_type: app.festival_type, sponsor_plan: (app.sponsor_plan as any) || '' }];
  }
  return [];
};

const suggestAmount = (app: FestivalApplication) => brandsOf(app).reduce((s, b) => s + brandAmount(b, listingOf(app)), 0);

const FestivalApplicationManager: React.FC = () => {
  const [apps, setApps] = useState<FestivalApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<FestivalApplication | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [regMap, setRegMap] = useState<Record<string, FestivalRegistration>>({});
  const [regs, setRegs] = useState<FestivalRegistration[]>([]);
  const [receiptMap, setReceiptMap] = useState<Record<string, string>>({});
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('festival_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setApps((data as FestivalApplication[]) || []);
    } catch (err) {
      console.error('Error fetching festival applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('festival_registrations')
        .select('id, created_at, amount, paid_amount, paid_at, payment_status, payment_method, merchant_order_no, invoice_title, tax_id, contact_name, contact_email, contact_phone, brand_name, festival_type, brand_count, influencer_video_count, application_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data as FestivalRegistration[] | null) || [];
      const map: Record<string, FestivalRegistration> = {};
      list.forEach((r) => {
        if (r.id) map[r.id] = r;
      });
      setRegMap(map);
      setRegs(list);
    } catch (err) {
      console.error('Error fetching festival registrations:', err);
    }
  };

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase.from('receipts').select('order_no, status');
      if (error) throw error;
      const map: Record<string, string> = {};
      (data as any[] | null)?.forEach((r) => {
        if (r.order_no) map[r.order_no] = r.status;
      });
      setReceiptMap(map);
    } catch (err) {
      console.error('Error fetching receipts:', err);
    }
  };

  useEffect(() => {
    fetchApps();
    fetchRegistrations();
    fetchReceipts();
  }, []);

  const setStatus = async (app: FestivalApplication, status: string) => {
    const label = status === 'approved' ? '核准' : status === 'rejected' ? '退件' : status;
    if (!confirm(`確定將「${app.company_name}」標記為「${label}」？`)) return;
    setBusyId(app.id);
    try {
      const { error } = await supabase.from('festival_applications').update({ status }).eq('id', app.id);
      if (error) throw error;
      await fetchApps();
    } catch (err: any) {
      alert('更新失敗: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleGenerateLink = async (app: FestivalApplication) => {
    const list = brandsOf(app);
    if (list.length === 0) {
      alert('此申請沒有品牌明細，無法產生連結');
      return;
    }
    const suggested = suggestAmount(app);
    const breakdown = list.map((b) => `${b.brand_name}（${FESTIVAL_LABEL[b.festival_type]}・${b.sponsor_plan === 'B' ? '方案B' : '方案A'}）= NT$ ${brandAmount(b, listingOf(app)).toLocaleString()}`).join('\n');
    const input = prompt(
      `產生繳費連結（整個集團一次付清）\n\n公司：${app.company_name}\n品牌數：${list.length}\n\n${breakdown}\n\n請確認總金額（NT$）：`,
      String(suggested)
    );
    if (input === null) return;
    const amount = parseInt(input.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('金額不正確');
      return;
    }

    // 場次：全部相同則用該場次，否則 both
    const types = Array.from(new Set(list.map((b) => b.festival_type)));
    const regFestival = types.length === 1 ? types[0] : 'both';
    const brandCount = list.length;
    const influencerCount = list.filter((b) => b.sponsor_plan === 'B').length;

    setBusyId(app.id);
    try {
      const merchantOrderNo = `FEST_${Date.now()}`;
      const { data: reg, error: regErr } = await supabase
        .from('festival_registrations')
        .insert({
          festival_type: regFestival,
          brand_name: `${app.company_name}（${brandCount} 品牌）`,
          contact_name: app.project_contact,
          contact_email: app.contact_email,
          contact_phone: app.project_contact_phone,
          brand_count: brandCount,
          influencer_video_count: influencerCount,
          amount,
          invoice_title: app.company_name,
          tax_id: app.tax_id,
          merchant_order_no: merchantOrderNo,
          payment_status: 'pending',
          application_id: app.id,
        })
        .select('id')
        .single();
      if (regErr) throw regErr;

      const link = `${window.location.origin}/#/pay-festival/${reg.id}`;

      const { error: upErr } = await supabase
        .from('festival_applications')
        .update({ status: 'approved', registration_id: reg.id, payment_link: link })
        .eq('id', app.id);
      if (upErr) throw upErr;

      try {
        await navigator.clipboard.writeText(link);
        alert(`繳費連結已產生並複製到剪貼簿（金額 NT$ ${amount.toLocaleString()}）：\n\n${link}\n\n請貼給品牌方完成繳費。`);
      } catch {
        prompt('繳費連結已產生，請手動複製：', link);
      }
      await fetchApps();
      await fetchRegistrations();
    } catch (err: any) {
      console.error('Generate link error:', err);
      alert('產生連結失敗: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (app: FestivalApplication) => {
    if (!confirm(`確定永久刪除「${app.company_name}」的申請？此操作無法復原。`)) return;
    setBusyId(app.id);
    try {
      const { data, error } = await supabase.from('festival_applications').delete().eq('id', app.id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('權限不足或找不到資料');
      await fetchApps();
    } catch (err: any) {
      alert('刪除失敗: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  const pending = apps.filter((a) => a.status === 'pending');
  const processed = apps.filter((a) => a.status !== 'pending');

  const statusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      pending: ['待審核', 'bg-yellow-100 text-yellow-700'],
      approved: ['已核准', 'bg-green-100 text-green-700'],
      rejected: ['已退件', 'bg-red-100 text-red-700'],
    };
    const [label, cls] = map[status] || [status, 'bg-gray-100 text-gray-600'];
    return <span className={`px-2 py-1 rounded text-xs font-bold ${cls}`}>{label}</span>;
  };

  // 取得申請對應的繳費紀錄
  const regOf = (app: FestivalApplication) => (app.registration_id ? regMap[app.registration_id] : undefined);
  const isPaidOf = (app: FestivalApplication) => regOf(app)?.payment_status === 'paid';
  const orderNoOf = (reg?: FestivalRegistration) => reg?.merchant_order_no || (reg ? `MANUAL_${reg.id}` : '');
  const receiptIssued = (reg?: FestivalRegistration) => {
    const ono = orderNoOf(reg);
    return !!ono && (receiptMap[ono] === 'sent' || receiptMap[ono] === 'issued');
  };

  const openReceipt = (app: FestivalApplication) => {
    const reg = regOf(app);
    if (!reg) return;
    setReceiptData({
      payerName: reg.contact_name || app.project_contact || app.company_name,
      companyName: reg.invoice_title || app.company_name,
      taxId: reg.tax_id || app.tax_id || '',
      amount: reg.paid_amount || reg.amount || suggestAmount(app),
      paymentMethod: '信用卡',
      feeType: 'donation',
      orderNo: orderNoOf(reg),
      email: reg.contact_email || app.contact_email || '',
    });
  };

  const paymentBadge = (app: FestivalApplication) => {
    const reg = regOf(app);
    if (!reg) return <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-500">尚未產生連結</span>;
    const paid = reg.payment_status === 'paid';
    return (
      <div>
        <span className={`px-2 py-1 rounded text-xs font-bold ${paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {paid ? '已付款' : '待付款'}
        </span>
        <div className="text-xs text-gray-400 mt-1">NT$ {(reg.paid_amount || reg.amount || 0).toLocaleString()}</div>
        {paid && reg.paid_at && <div className="text-[10px] text-gray-400">{new Date(reg.paid_at).toLocaleString('zh-TW')}</div>}
      </div>
    );
  };

  // ===== 自助繳費（品牌自行從 #/festival/pay 付款，無申請表）=====
  const selfServiceRegs = regs.filter((r) => !r.application_id);

  const handleDeleteReg = async (reg: FestivalRegistration) => {
    if (!confirm(`確定永久刪除自助繳費紀錄「${reg.brand_name || ''}」？此操作無法復原。`)) return;
    setBusyId(reg.id);
    try {
      const { data, error } = await supabase.from('festival_registrations').delete().eq('id', reg.id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('權限不足或找不到資料');
      await fetchRegistrations();
    } catch (err: any) {
      alert('刪除失敗: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const openReceiptReg = (reg: FestivalRegistration) => {
    setReceiptData({
      payerName: reg.contact_name || reg.brand_name || '',
      companyName: reg.invoice_title || reg.brand_name || '',
      taxId: reg.tax_id || '',
      amount: reg.paid_amount || reg.amount || 0,
      paymentMethod: '信用卡',
      feeType: 'donation',
      orderNo: orderNoOf(reg),
      email: reg.contact_email || '',
    });
  };

  const paymentBadgeReg = (reg: FestivalRegistration) => {
    const paid = reg.payment_status === 'paid';
    return (
      <div>
        <span className={`px-2 py-1 rounded text-xs font-bold ${paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {paid ? '已付款' : '待付款'}
        </span>
        <div className="text-xs text-gray-400 mt-1">NT$ {(reg.paid_amount || reg.amount || 0).toLocaleString()}</div>
        {paid && reg.paid_at && <div className="text-[10px] text-gray-400">{new Date(reg.paid_at).toLocaleString('zh-TW')}</div>}
      </div>
    );
  };

  const renderSelfServiceTable = () => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-8">
      <div className="p-4 border-b border-gray-50 bg-gray-50/50">
        <h2 className="text-lg font-bold text-gray-800">
          自助繳費
          <span className="text-sm font-normal text-gray-500 ml-2">共 {selfServiceRegs.length} 筆</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1">品牌自行從付款頁（/#/festival/pay）填寫並繳費，無申請表。</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="p-4">繳費時間</th>
              <th className="p-4">品牌 / 場次</th>
              <th className="p-4">聯絡</th>
              <th className="p-4">發票抬頭 / 統編</th>
              <th className="p-4">繳費狀態</th>
              <th className="p-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {selfServiceRegs.map((reg) => (
              <tr key={reg.id} className="hover:bg-gray-50 align-top">
                <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                  {reg.created_at ? new Date(reg.created_at).toLocaleString('zh-TW') : '—'}
                  {reg.merchant_order_no && <div className="text-[10px] text-gray-400 font-mono mt-0.5">#{reg.merchant_order_no}</div>}
                </td>
                <td className="p-4 text-sm">
                  <div className="font-bold text-gray-900">{reg.brand_name || '—'}</div>
                  <div className="text-xs text-gray-500">
                    {reg.festival_type ? FESTIVAL_LABEL[reg.festival_type] || reg.festival_type : '—'}
                    {typeof reg.brand_count === 'number' && reg.brand_count > 0 && `・${reg.brand_count} 品牌`}
                    {typeof reg.influencer_video_count === 'number' && reg.influencer_video_count > 0 && `・${reg.influencer_video_count} 影音`}
                  </div>
                </td>
                <td className="p-4 text-sm">
                  <div className="text-gray-800">{reg.contact_name || '—'}</div>
                  <div className="text-xs text-gray-400">{reg.contact_phone}</div>
                  <div className="text-xs text-gray-400">{reg.contact_email}</div>
                </td>
                <td className="p-4 text-sm">
                  <div className="text-gray-800">{reg.invoice_title || '—'}</div>
                  <div className="text-xs text-gray-400">{reg.tax_id ? `統編 ${reg.tax_id}` : ''}</div>
                </td>
                <td className="p-4">{paymentBadgeReg(reg)}</td>
                <td className="p-4">
                  <div className="flex gap-2 flex-wrap">
                    {reg.payment_status === 'paid' && (
                      <button
                        onClick={() => openReceiptReg(reg)}
                        disabled={receiptIssued(reg)}
                        className={`text-xs px-2 py-1 rounded font-bold flex items-center gap-1 border ${
                          receiptIssued(reg)
                            ? 'bg-green-50 text-green-700 border-green-200 cursor-default'
                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        <Receipt size={12} /> {receiptIssued(reg) ? '已開立' : '開立收據'}
                      </button>
                    )}
                    <button onClick={() => handleDeleteReg(reg)} disabled={busyId === reg.id} className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50">
                      <XCircle size={14} /> 刪除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {selfServiceRegs.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">目前無自助繳費紀錄</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTable = (items: FestivalApplication[], isProcessed: boolean) => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-8">
      <div className="p-4 border-b border-gray-50 bg-gray-50/50">
        <h2 className="text-lg font-bold text-gray-800">
          {isProcessed ? '已處理' : '待審核'}
          <span className="text-sm font-normal text-gray-500 ml-2">共 {items.length} 筆</span>
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="p-4">申請時間</th>
              <th className="p-4">公司 / 聯絡</th>
              <th className="p-4">參加品牌</th>
              <th className="p-4">合約同意</th>
              <th className="p-4">狀態</th>
              <th className="p-4">繳費狀態</th>
              <th className="p-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((app) => {
              const list = brandsOf(app);
              return (
                <tr key={app.id} className="hover:bg-gray-50 align-top">
                  <td className="p-4 text-sm text-gray-500 whitespace-nowrap">{new Date(app.created_at).toLocaleString('zh-TW')}</td>
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{app.company_name}</div>
                    <div className="text-xs text-gray-400">統編 {app.tax_id}</div>
                    <div className="text-xs text-gray-400">{app.project_contact} / {app.project_contact_phone}</div>
                  </td>
                  <td className="p-4 text-sm">
                    <div className="font-medium text-gray-800">{list.length} 個品牌</div>
                    <div className="text-xs text-gray-500 max-w-[220px]">
                      {list.map((b, i) => (
                        <div key={i}>{b.brand_name}（{FESTIVAL_LABEL[b.festival_type]}・{b.sponsor_plan === 'B' ? 'B' : 'A'}）</div>
                      ))}
                    </div>
                    <div className="text-xs text-red-600 font-bold mt-0.5">
                      預估 NT$ {suggestAmount(app).toLocaleString()}
                      {app.waive_listing_fee && <span className="ml-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">免上架費</span>}
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    {app.contract_agreed ? (
                      <span className="text-green-700 font-medium flex items-center gap-1"><CheckCircle size={14} /> 已同意</span>
                    ) : (
                      <span className="text-gray-400">未同意</span>
                    )}
                    {app.signer_name && <div className="text-xs text-gray-400 mt-0.5">簽署：{app.signer_name}</div>}
                  </td>
                  <td className="p-4">{statusBadge(app.status)}</td>
                  <td className="p-4">{paymentBadge(app)}</td>
                  <td className="p-4">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setDetail(app)} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 font-bold flex items-center gap-1">
                        <Eye size={12} /> 明細
                      </button>
                      <button
                        onClick={() => handleGenerateLink(app)}
                        disabled={busyId === app.id}
                        className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 font-bold flex items-center gap-1 disabled:opacity-50"
                      >
                        {busyId === app.id ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                        {app.payment_link ? '重新產生連結' : '產生繳費連結'}
                      </button>
                      {isPaidOf(app) && (
                        <button
                          onClick={() => openReceipt(app)}
                          disabled={receiptIssued(regOf(app))}
                          className={`text-xs px-2 py-1 rounded font-bold flex items-center gap-1 border ${
                            receiptIssued(regOf(app))
                              ? 'bg-green-50 text-green-700 border-green-200 cursor-default'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          <Receipt size={12} /> {receiptIssued(regOf(app)) ? '已開立' : '開立收據'}
                        </button>
                      )}
                      {!isProcessed && (
                        <>
                          <button onClick={() => setStatus(app, 'approved')} disabled={busyId === app.id} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100 font-bold disabled:opacity-50">核准</button>
                          <button onClick={() => setStatus(app, 'rejected')} disabled={busyId === app.id} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-100 font-bold disabled:opacity-50">退件</button>
                        </>
                      )}
                      {isProcessed && app.status === 'rejected' && (
                        <button onClick={() => setStatus(app, 'pending')} disabled={busyId === app.id} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 font-bold disabled:opacity-50">改回待審</button>
                      )}
                      <button onClick={() => handleDelete(app)} disabled={busyId === app.id} className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50">
                        <XCircle size={14} /> 刪除
                      </button>
                    </div>
                    {app.payment_link && (
                      <div className="text-[10px] text-gray-400 font-mono mt-1 break-all max-w-[260px]">{app.payment_link}</div>
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">目前無{isProcessed ? '已處理' : '待審核'}申請</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Flame className="text-red-600" size={24} /> 燒肉/火鍋祭 合作報名</h2>
          <p className="text-gray-500 text-sm mt-1">前台網頁報名表（含合約同意）送來的申請。審核後可一鍵產生繳費連結（整個集團一次付清）寄給品牌方。</p>
        </div>
        <button onClick={() => { fetchApps(); fetchRegistrations(); fetchReceipts(); }} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
          <RefreshCcw size={18} /> 重新整理
        </button>
      </div>

      {renderTable(pending, false)}
      {renderTable(processed, true)}
      {renderSelfServiceTable()}

      {detail && <DetailModal app={detail} onClose={() => setDetail(null)} />}

      {receiptData && (
        <ReceiptModal
          isOpen={!!receiptData}
          onClose={() => {
            setReceiptData(null);
            fetchReceipts();
          }}
          initialData={receiptData}
        />
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-[110px_1fr] gap-2 py-1.5 border-b border-gray-50 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="text-gray-900 break-words">{value || '—'}</span>
  </div>
);

const DetailModal: React.FC<{ app: FestivalApplication; onClose: () => void }> = ({ app, onClose }) => {
  const list = brandsOf(app);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">{app.company_name} — 申請明細</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={22} /></button>
        </div>
        <div className="p-6 space-y-5">
          <section>
            <h4 className="font-bold text-gray-800 mb-1">公司基本資料</h4>
            <Row label="公司登記名稱" value={app.company_name} />
            <Row label="公司統編" value={app.tax_id} />
            <Row label="公司負責人" value={app.representative} />
            <Row label="聯絡信箱" value={app.contact_email} />
            <Row label="公司登記地址" value={app.company_address} />
            <Row label="專案聯絡人" value={`${app.project_contact} / ${app.project_contact_phone}`} />
            <Row
              label="7/8 記者會"
              value={
                app.attend_press_conference
                  ? `出席（${app.press_conference_attendees ?? '-'} 位）${app.press_conference_attendee_names?.length ? `：${app.press_conference_attendee_names.join('、')}` : ''}`
                  : '不出席'
              }
            />
            <Row
              label="7/8 產業論壇"
              value={
                app.attend_forum
                  ? `出席（${app.forum_attendees ?? '-'} 位）${app.forum_attendee_names?.length ? `：${app.forum_attendee_names.join('、')}` : ''}`
                  : '不出席'
              }
            />
            <Row label="上架費" value={app.waive_listing_fee ? '免收（專案優惠）' : '正常收取'} />
          </section>

          <section>
            <h4 className="font-bold text-gray-800 mb-2">參加品牌（{list.length}）</h4>
            <div className="space-y-3">
              {list.map((b, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-3">
                  <div className="font-bold text-gray-900 mb-1">
                    {i + 1}. {b.brand_name}
                    <span className="ml-2 text-xs font-normal text-gray-500">{FESTIVAL_LABEL[b.festival_type]}・{planLabel(b.sponsor_plan)}・小計 NT$ {brandAmount(b, listingOf(app)).toLocaleString()}</span>
                  </div>
                  <Row label="品牌官網" value={b.brand_website} />
                  <Row label="官方社群" value={b.social_link} />
                  <Row label="行銷窗口" value={b.mkt_contact_name} />
                  <Row label="窗口 LineID" value={b.mkt_contact_lineid} />
                  <Row label="窗口手機" value={b.mkt_contact_phone} />
                  <Row label="窗口 Email" value={b.mkt_contact_email} />
                  <Row label="訂位系統" value={b.booking_system} />
                  <Row label="訂位連結" value={b.booking_link} />
                  <Row label="拍攝店點" value={b.shooting_address} />
                  <Row label="餐點細節" value={b.meal_detail} />
                  <Row label="曝光波段" value={(b.exposure_waves || []).join('、')} />
                  <Row
                    label="KOL 帳號"
                    value={
                      <span className="text-xs">
                        {b.kol_email_diff_confirmed ? '✅' : '⬜'} Email/手機不同
                        {b.kol_invite_code_confirmed ? '✅' : '⬜'} 邀請碼
                        {b.kol_account_created_confirmed ? '✅' : '⬜'} 已申請
                      </span>
                    }
                  />
                </div>
              ))}
            </div>
            <p className="text-right font-bold text-red-600 mt-2">預估合計：NT$ {suggestAmount(app).toLocaleString()}</p>
          </section>

          <section>
            <h4 className="font-bold text-gray-800 mb-1">合約同意紀錄</h4>
            <Row label="同意合約" value={app.contract_agreed ? '是' : '否'} />
            <Row label="簽署人" value={app.signer_name} />
            <Row label="同意時間" value={app.agreed_at ? new Date(app.agreed_at).toLocaleString('zh-TW') : '—'} />
            <Row label="同意來源 IP" value={app.agreed_ip} />
          </section>

          {app.payment_link && (
            <section>
              <h4 className="font-bold text-gray-800 mb-1">繳費連結</h4>
              <div className="text-xs font-mono text-gray-600 break-all bg-gray-50 p-3 rounded-lg">{app.payment_link}</div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default FestivalApplicationManager;
