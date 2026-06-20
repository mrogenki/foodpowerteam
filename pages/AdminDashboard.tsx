import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, LogOut, ChevronRight, Search, FileDown, Plus, Edit, Edit2, Trash2, CheckCircle, XCircle, Shield, UserPlus, DollarSign, TrendingUp, BarChart3, Mail, User, Clock, Image as ImageIcon, UploadCloud, Loader2, Smartphone, Building2, Briefcase, Globe, FileUp, Download, ClipboardList, CheckSquare, AlertCircle, RotateCcw, MapPin, Filter, X, Eye, EyeOff, Ticket, Cake, CreditCard, Home, Hash, Crown, ArrowLeft, RefreshCcw, Ban, UserCheck, ExternalLink, BellRing, Send, History, FileText, QrCode, Printer, Copy, Flame, Menu } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import emailjs from '@emailjs/browser';
import html2pdf from 'html2pdf.js';
import { supabase } from '../utils/supabaseClient';
import MemberRenewalManager from './MemberRenewalManager';
import FestivalApplicationManager from './FestivalApplicationManager';
import MemberBirthdayManager from './MemberBirthdayManager';
import ReceiptManager from './ReceiptManager';
import ReceiptModal, { ReceiptData } from '../components/ReceiptModal';
import BatchReceiptGenerator from '../components/BatchReceiptGenerator';
import BlockEditor from '../components/BlockEditor';
import { Activity, MemberActivity, Registration, MemberRegistration, ActivityType, AdminUser, UserRole, Member, AttendanceRecord, AttendanceStatus, Coupon, IndustryCategories, PaymentStatus, MemberApplication, ClubActivity, Milestone, FinancialType, FinancialRecord, PointsLedgerEntry } from '../types';
import { EMAIL_CONFIG } from '../constants';

interface AdminDashboardProps {
  currentUser: AdminUser;
  onLogout: () => void;
  activities: Activity[];
  memberActivities: MemberActivity[];
  registrations: Registration[];
  memberRegistrations: MemberRegistration[];
  users: AdminUser[];
  members: Member[];
  memberApplications: MemberApplication[]; // 新增：會員申請列表
  milestones: Milestone[];
  coupons: Coupon[];
  clubActivities: ClubActivity[];
  onUpdateActivity: (act: Activity) => void;
  onAddActivity: (act: Activity) => void;
  onDeleteActivity: (id: string | number) => void;
  onUpdateMemberActivity: (act: MemberActivity) => void;
  onAddMemberActivity: (act: MemberActivity) => void;
  onDeleteMemberActivity: (id: string | number) => void;
  onUpdateClubActivity: (act: ClubActivity) => void;
  onAddClubActivity: (act: ClubActivity) => void;
  onDeleteClubActivity: (id: string | number) => void;
  onUpdateRegistration: (reg: Registration) => void;
  onDeleteRegistration: (id: string | number) => void;
  onUpdateMemberRegistration: (reg: MemberRegistration) => void;
  onDeleteMemberRegistration: (id: string | number) => void;
  onAddRegistrations?: (regs: Registration[]) => void;
  onAddMemberRegistrations?: (regs: MemberRegistration[]) => void;
  onRefreshRegistrations?: () => void;
  onAddUser: (user: AdminUser) => void;
  onDeleteUser: (id: string) => void;
  onAddMember: (member: Member) => void;
  onAddMembers?: (members: Member[]) => void;
  onUpdateMember: (member: Member) => void;
  onDeleteMember: (id: string | number) => void;
  onAdjustPoints?: (memberId: string, delta: number, reason: string) => Promise<boolean>;
  onFetchPointsLedger?: (memberId: string) => Promise<PointsLedgerEntry[]>;
  onUploadImage: (file: File) => Promise<string>;
  onGenerateCoupons?: (activityId: string, amount: number, memberIds: string[], sendEmail: boolean, note?: string) => void;
  onGenerateVipInvites?: (activityId: string, count: number, note?: string) => Promise<Coupon[]>;
  onApproveMemberApplication: (app: MemberApplication) => void; // 新增：核准
  onDeleteMemberApplication: (id: string | number) => void; // 新增：拒絕
  onAddMilestone: (milestone: Milestone) => void;
  onUpdateMilestone: (milestone: Milestone) => void;
  onDeleteMilestone: (id: string | number) => void;
  financialRecords: FinancialRecord[];
  onAddFinancialRecord: (record: FinancialRecord) => void;
  onUpdateFinancialRecord: (record: FinancialRecord) => void;
  onDeleteFinancialRecord: (id: string | number) => void;
}

// 輔助函式：翻譯藍新付款方式
const translatePaymentMethod = (method?: string) => {
  if (!method) return '-';
  const map: Record<string, string> = {
    'CREDIT': '信用卡',
    'VACC': 'ATM轉帳',
    'WEBATM': 'WebATM',
    'CVS': '超商代碼',
    'BARCODE': '超商條碼',
    'LINEPAY': 'Line Pay',
    'manual_admin': '手動標記',
    'ALIPAY': '支付寶',
    'WECHATPAY': '微信支付'
  };
  return map[method] || method;
};

// 獨立的輸入元件
const PaidAmountInput: React.FC<{ value?: number; onSave: (val: number) => void }> = ({ value, onSave }) => {
  const [localValue, setLocalValue] = useState(value?.toString() || '0');
  useEffect(() => { setLocalValue(value?.toString() || '0'); }, [value]);
  const handleBlur = () => {
    const num = parseInt(localValue);
    if (!isNaN(num) && num !== (value || 0)) onSave(num);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); };
  return <input type="number" className="border rounded px-2 py-1 w-24 text-sm focus:ring-1 focus:ring-red-500 outline-none transition-all text-right" value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown} placeholder="0" />;
};

const NotesInput: React.FC<{ value?: string; onSave: (val: string) => void }> = ({ value, onSave }) => {
  const [localValue, setLocalValue] = useState(value || '');
  useEffect(() => { setLocalValue(value || ''); }, [value]);
  const handleBlur = () => {
    if (localValue !== (value || '')) onSave(localValue);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); };
  return <textarea className="border rounded px-2 py-1 w-full text-xs focus:ring-1 focus:ring-red-500 outline-none transition-all min-h-[40px] resize-y" rows={1} value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={handleBlur} onKeyDown={handleKeyDown} placeholder="點擊編輯備註..." />;
};

// Sidebar
const Sidebar: React.FC<{ user: AdminUser; onLogout: () => void; pendingCount: number; mobileOpen?: boolean; onClose?: () => void }> = ({ user, onLogout, pendingCount, mobileOpen = false, onClose }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  
  const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
  const isManager = user.role === UserRole.MANAGER || isSuperAdmin;
  const isStaff = user.role === UserRole.STAFF;

  const [pendingRenewalCount, setPendingRenewalCount] = useState(0);
  const [pendingFestivalCount, setPendingFestivalCount] = useState(0);

  useEffect(() => {
    const fetchPendingFestival = async () => {
      try {
        const { count } = await supabase
          .from('festival_applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingFestivalCount(count || 0);
      } catch (err) {
        console.error('Error fetching pending festival applications:', err);
      }
    };
    fetchPendingFestival();
    const interval = setInterval(fetchPendingFestival, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchPendingRenewals = async () => {
      try {
        // Fetch renewals that are not marked as processed
        const { data: renewals, error: renewalError } = await supabase
          .from('member_renewals')
          .select('merchant_order_no')
          .neq('payment_status', 'processed');
        
        if (!renewalError && renewals) {
          const orderNos = renewals.map(r => r.merchant_order_no).filter(Boolean);
          if (orderNos.length > 0) {
            // Check which of these have receipts sent
            const { data: receipts, error: receiptError } = await supabase
              .from('receipts')
              .select('order_no')
              .in('order_no', orderNos)
              .eq('status', 'sent');
            
            if (!receiptError && receipts) {
              const receiptOrderNos = new Set(receipts.map(r => r.order_no));
              // A renewal is pending if it's not processed AND has no receipt sent
              const actualPendingCount = renewals.filter(r => !r.merchant_order_no || !receiptOrderNos.has(r.merchant_order_no)).length;
              setPendingRenewalCount(actualPendingCount);
            } else {
              setPendingRenewalCount(renewals.length);
            }
          } else {
            setPendingRenewalCount(renewals.length);
          }
        }
      } catch (err) {
        console.error('Error fetching pending renewals:', err);
      }
    };

    fetchPendingRenewals();
    const interval = setInterval(fetchPendingRenewals, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[80vw] bg-gray-900 text-gray-400 flex flex-col transform transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:translate-x-0 lg:min-h-screen lg:max-w-none shrink-0 ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 bg-red-600 rounded-md flex items-center justify-center text-white font-bold">食</div>
            <span className="font-bold tracking-tight">管理系統</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white p-1 -mr-1" aria-label="關閉選單"><X size={22} /></button>
        </div>
        <div className="mt-4 px-3 py-2 rounded bg-gray-800 border border-gray-700">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{user.role}</p>
          <p className="text-sm text-white font-medium truncate">{user.name}</p>
        </div>
      </div>
      <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
        <Link to="/admin" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive('/admin') ? 'bg-red-600 text-white' : 'hover:bg-gray-800'}`}><LayoutDashboard size={20} /><span>儀表板</span></Link>
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-gray-800 text-gray-400 hover:text-white"><ExternalLink size={20} /><span>預覽前台網站</span></a>
        
        <div className="pt-4 pb-2 px-3 text-xs font-bold text-gray-600 uppercase">活動報到 (工作人員)</div>
        <Link to="/admin/check-in" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname.startsWith('/admin/check-in') ? 'bg-red-600 text-white' : 'hover:bg-gray-800'}`}><CheckSquare size={20} /><span>活動報到</span></Link>

        {isManager && (<>
          <div className="pt-4 pb-2 px-3 text-xs font-bold text-gray-600 uppercase">活動管理</div>
          <Link to="/admin/activities" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname.startsWith('/admin/activities') ? 'bg-red-600 text-white' : 'hover:bg-gray-800'}`}><Calendar size={20} /><span>活動管理</span></Link>
          <Link to="/admin/club" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname.startsWith('/admin/club') ? 'bg-red-600 text-white' : 'hover:bg-gray-800'}`}><Crown size={20} /><span>俱樂部管理</span></Link>
          <Link to="/admin/milestones" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname.startsWith('/admin/milestones') ? 'bg-red-600 text-white' : 'hover:bg-gray-800'}`}><History size={20} /><span>大事記管理</span></Link>
          <Link to="/admin/festival-applications" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname.startsWith('/admin/festival-applications') ? 'bg-red-600 text-white' : 'hover:bg-gray-800'}`}>
            <Flame size={20} />
            <div className="flex-grow flex justify-between items-center">
                <span>燒肉/火鍋祭報名</span>
                {pendingFestivalCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingFestivalCount}</span>}
            </div>
          </Link>

          <div className="pt-4 pb-2 px-3 text-xs font-bold text-gray-600 uppercase">會員/營運</div>
          <Link to="/admin/members" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname.startsWith('/admin/members') ? 'bg-red-600 text-white' : 'hover:bg-gray-800'}`}><Building2 size={20} /><span>會員資料庫</span></Link>
          <Link to="/admin/member-applications" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname.startsWith('/admin/member-applications') ? 'bg-red-600 text-white' : 'hover:bg-gray-800'}`}>
            <UserPlus size={20} />
            <div className="flex-grow flex justify-between items-center">
                <span>新會員申請</span>
                {pendingCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
            </div>
          </Link>
          <Link to="/admin/member-renewals" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname.startsWith('/admin/member-renewals') ? 'bg-red-600 text-white' : 'hover:bg-gray-800'}`}>
            <RefreshCcw size={20} />
            <div className="flex-grow flex justify-between items-center">
                <span>會員續約管理</span>
                {pendingRenewalCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingRenewalCount}</span>}
            </div>
          </Link>
          <Link to="/admin/receipts" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname.startsWith('/admin/receipts') ? 'bg-red-600 text-white' : 'hover:bg-gray-800'}`}><FileText size={20} /><span>收據管理</span></Link>
          <Link to="/admin/birthdays" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname.startsWith('/admin/birthdays') ? 'bg-red-600 text-white' : 'hover:bg-gray-800'}`}><Cake size={20} /><span>會員生日管理</span></Link>
          <Link to="/admin/coupons" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname.startsWith('/admin/coupons') ? 'bg-red-600 text-white' : 'hover:bg-gray-800'}`}><Ticket size={20} /><span>折扣券管理</span></Link>
          <Link to="/admin/finances" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname.startsWith('/admin/finances') ? 'bg-red-600 text-white' : 'hover:bg-gray-800'}`}><DollarSign size={20} /><span>收支管理</span></Link>
        </>)}

        {isSuperAdmin && (<>
            <div className="pt-4 pb-2 px-3 text-xs font-bold text-gray-600 uppercase">系統管理</div>
            <Link to="/admin/users" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname.startsWith('/admin/users') ? 'bg-red-600 text-white' : 'hover:bg-gray-800'}`}><Shield size={20} /><span>帳號權限</span></Link>
        </>)}
      </nav>
      <div className="p-4 border-t border-gray-800"><button onClick={onLogout} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-600/10 hover:text-red-500 transition-colors"><LogOut size={20} /><span>登出</span></button></div>
    </div>
  );
};

interface DashboardHomeProps {
  currentUser: AdminUser;
  members: Member[];
  activities: Activity[];
  memberActivities: MemberActivity[];
  registrations: Registration[];
  memberRegistrations: MemberRegistration[];
  memberApplications: MemberApplication[];
}

const ClubManager: React.FC<{
  activities: ClubActivity[];
  onUpdate: (act: ClubActivity) => void;
  onAdd: (act: ClubActivity) => void;
  onDelete: (id: string | number) => void;
  onUploadImage: (file: File) => Promise<string>;
}> = ({ activities, onUpdate, onAdd, onDelete, onUploadImage }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentAct, setCurrentAct] = useState<Partial<ClubActivity>>({});
  const [search, setSearch] = useState('');

  const filtered = activities.filter(a => a.title.toLowerCase().includes(search.toLowerCase()));

  const handleSave = () => {
    if (!currentAct.title || !currentAct.date || !currentAct.picture) {
      alert('請填寫完整資訊');
      return;
    }
    if (currentAct.id) {
      onUpdate(currentAct as ClubActivity);
    } else {
      onAdd(currentAct as ClubActivity);
    }
    setIsEditing(false);
    setCurrentAct({});
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">俱樂部活動管理</h2>
        <button onClick={() => { setIsEditing(true); setCurrentAct({ status: 'active' }); }} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-all">
          <Plus size={18} /> 新增活動
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
        <Search className="text-gray-400" size={20} />
        <input type="text" placeholder="搜尋活動名稱..." className="flex-grow outline-none text-gray-700" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(act => (
          <div key={act.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
            <div className="relative aspect-video">
              <img src={act.picture} alt={act.title} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 flex gap-2">
                <button onClick={() => { setIsEditing(true); setCurrentAct(act); }} className="p-2 bg-white/90 backdrop-blur rounded-lg text-gray-600 hover:text-blue-600 shadow-sm transition-all"><Edit size={16} /></button>
                <button onClick={() => confirm('確定刪除？') && onDelete(act.id)} className="p-2 bg-white/90 backdrop-blur rounded-lg text-gray-600 hover:text-red-600 shadow-sm transition-all"><Trash2 size={16} /></button>
              </div>
              <div className={`absolute bottom-2 left-2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${act.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                {act.status === 'active' ? '進行中' : '已結束'}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-gray-900 mb-1">{act.title}</h3>
              <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12} /> {act.date}</p>
            </div>
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">{currentAct.id ? '編輯活動' : '新增活動'}</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">活動名稱</label>
                <input type="text" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-red-500" value={currentAct.title || ''} onChange={(e) => setCurrentAct({ ...currentAct, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">日期</label>
                  <input type="date" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-red-500" value={currentAct.date || ''} onChange={(e) => setCurrentAct({ ...currentAct, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">狀態</label>
                  <select className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-red-500" value={currentAct.status || 'active'} onChange={(e) => setCurrentAct({ ...currentAct, status: e.target.value as any })}>
                    <option value="active">進行中</option>
                    <option value="closed">已結束</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">跳轉連結 (選填)</label>
                <input type="text" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-red-500" value={currentAct.link || ''} onChange={(e) => setCurrentAct({ ...currentAct, link: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">活動封面</label>
                <div className="flex items-center gap-4">
                  {currentAct.picture && <img src={currentAct.picture} className="w-20 h-20 object-cover rounded-lg border" />}
                  <label className="flex-grow flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:bg-gray-50 transition-all">
                    <UploadCloud size={24} className="text-gray-400" />
                    <span className="text-sm text-gray-500 font-bold">點擊上傳圖片</span>
                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        const url = await onUploadImage(e.target.files[0]);
                        setCurrentAct({ ...currentAct, picture: url });
                      }
                    }} />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">簡短說明</label>
                <textarea className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-red-500" rows={3} value={currentAct.description || ''} onChange={(e) => setCurrentAct({ ...currentAct, description: e.target.value })} />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
              <button onClick={() => setIsEditing(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-white transition-all">取消</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-100 transition-all">儲存活動</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 儀表板首頁元件
const DashboardHome: React.FC<DashboardHomeProps> = ({ currentUser, members, activities, memberActivities, registrations, memberRegistrations, memberApplications }) => {
  const isStaff = currentUser.role === UserRole.STAFF;
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const stats = useMemo(() => {
    // 有效會員總數 (不受月份影響，顯示當前總數)
    const activeMembers = members.filter(m => {
       if (m.membership_expiry_date) {
          return m.membership_expiry_date >= new Date().toISOString().slice(0, 10);
       }
       return m.status === 'active';
    }).length;

    // 該月新會員申請數與營收
    const newMembersThisMonth = members.filter(m => m.join_date && m.join_date.startsWith(selectedMonth));
    const newMemberCount = newMembersThisMonth.length;
    
    let newMemberRevenue = 0;
    let renewalRevenue = 0;
    let renewalCount = 0;

    members.forEach(m => {
      if (m.payment_records) {
        try {
          const records = typeof m.payment_records === 'string' ? JSON.parse(m.payment_records) : m.payment_records;
          records.forEach((r: any) => {
            if (r.date && r.date.startsWith(selectedMonth)) {
              if (r.note && r.note.includes('入會費')) {
                newMemberRevenue += (r.amount || 0);
              } else if (r.note && r.note.includes('會籍續約')) {
                renewalRevenue += (r.amount || 0);
                renewalCount += 1;
              }
            }
          });
        } catch (e) {}
      }
    });

    // 該月活動數與營收
    const activitiesThisMonth = activities.filter(a => a.date && a.date.startsWith(selectedMonth));
    const memberActivitiesThisMonth = memberActivities.filter(a => a.date && a.date.startsWith(selectedMonth));
    const activityCount = activitiesThisMonth.length + memberActivitiesThisMonth.length;

    const calculateActivityStats = (act: Activity | MemberActivity, regs: Registration[] | MemberRegistration[]) => {
       const actRegs = regs.filter(r => String(r.activityId) === String(act.id));
       const regCount = actRegs.length;
       const paidRegs = actRegs.filter(r => r.payment_status === PaymentStatus.PAID || r.payment_status === PaymentStatus.PROCESSED);
       const paidCount = paidRegs.length;
       const checkInCount = actRegs.filter(r => r.check_in_status).length;
       const revenue = paidRegs.reduce((sum, r) => sum + (r.paid_amount || 0), 0);
       return { id: act.id, title: act.title, date: act.date, status: act.status || 'active', regCount, paidCount, checkInCount, revenue };
    };

    const generalStats = activitiesThisMonth.map(a => ({...calculateActivityStats(a, registrations), category: '一般'}));
    const memberStats = memberActivitiesThisMonth.map(a => ({...calculateActivityStats(a, memberRegistrations), category: '會員'}));
    
    const allActivityStats = [...generalStats, ...memberStats].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const activityRevenue = allActivityStats.reduce((sum, a) => sum + a.revenue, 0);
    const totalRevenue = newMemberRevenue + renewalRevenue + activityRevenue;

    return { 
      activeMembers, 
      newMemberCount, newMemberRevenue,
      renewalCount, renewalRevenue,
      activityCount, activityRevenue,
      totalRevenue,
      allActivityStats 
    };
  }, [members, activities, memberActivities, registrations, memberRegistrations, selectedMonth]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系統概況</h1>
          <p className="text-gray-500">{isStaff ? '您好，請使用左側選單進行活動報到。' : '歡迎回到管理後台，以下是目前的營運數據。'}</p>
        </div>
        {!isStaff && (
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
            <Calendar size={18} className="text-gray-500" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border-none focus:ring-0 text-gray-700 font-medium outline-none bg-transparent"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {!isStaff && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Users size={20} /></div>
              <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded">截至目前</span>
            </div>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">有效會員總數</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeMembers}<span className="text-sm text-gray-400 font-normal ml-1">人</span></p>
          </div>
        )}
        
        {!isStaff && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600"><UserPlus size={20} /></div>
              <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">{selectedMonth}</span>
            </div>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">新會員申請</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">{stats.newMemberCount}<span className="text-sm text-gray-400 font-normal ml-1">人</span></p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
              <span className="text-xs text-gray-500">營收</span>
              <span className="text-sm font-bold text-gray-900">NT$ {stats.newMemberRevenue.toLocaleString()}</span>
            </div>
          </div>
        )}
        
        {!isStaff && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600"><RefreshCcw size={20} /></div>
              <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">{selectedMonth}</span>
            </div>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">會員續約</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">{stats.renewalCount}<span className="text-sm text-gray-400 font-normal ml-1">人</span></p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
              <span className="text-xs text-gray-500">營收</span>
              <span className="text-sm font-bold text-gray-900">NT$ {stats.renewalRevenue.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600"><Calendar size={20} /></div>
            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">{selectedMonth}</span>
          </div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">活動概況</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{stats.activityCount}<span className="text-sm text-gray-400 font-normal ml-1">場</span></p>
          </div>
          {!isStaff && (
            <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
              <span className="text-xs text-gray-500">營收</span>
              <span className="text-sm font-bold text-gray-900">NT$ {stats.activityRevenue.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {!isStaff && (
        <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">{selectedMonth} 總營收</p>
            <p className="text-4xl font-bold">NT$ {stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
            <DollarSign size={32} className="text-green-400" />
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
           <h3 className="text-lg font-bold text-gray-900">{selectedMonth} 各活動營運狀態</h3>
        </div>
        <div className="hidden md:block overflow-x-auto">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="p-4">活動名稱 / 日期</th>
                    <th className="p-4">類別</th>
                    <th className="p-4 text-center">報名 / 已付款</th>
                    <th className="p-4 text-center">出席人數</th>
                    {!isStaff && <th className="p-4 text-right">累積營收</th>}
                    <th className="p-4 text-center">狀態</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                 {stats.allActivityStats.map((act: any) => (
                    <tr key={`${act.category}-${act.id}`} className="hover:bg-gray-50">
                       <td className="p-4">
                          <div className="font-bold text-gray-900">{act.title}</div>
                          <div className="text-xs text-gray-400">{act.date}</div>
                       </td>
                       <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${act.category === '會員' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                             {act.category}
                          </span>
                       </td>
                       <td className="p-4 text-center font-medium">
                          <span className="text-gray-900">{act.regCount}</span>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="text-blue-600 font-bold">{act.paidCount}</span>
                       </td>
                       <td className="p-4 text-center">
                          <span className={`font-bold ${act.checkInCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                             {act.checkInCount}
                          </span> 
                          <span className="text-gray-400 text-xs"> / {act.regCount}</span>
                       </td>
                       {!isStaff && (
                         <td className="p-4 text-right font-mono font-bold text-gray-700">
                            NT$ {act.revenue.toLocaleString()}
                         </td>
                       )}
                       <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${act.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                             {act.status === 'active' ? '進行中' : '已結束'}
                          </span>
                       </td>
                    </tr>
                 ))}
                 {stats.allActivityStats.length === 0 && (
                    <tr><td colSpan={isStaff ? 5 : 6} className="p-6 text-center text-gray-400">尚無活動資料</td></tr>
                 )}
              </tbody>
           </table>
        </div>
        {/* 手機版卡片視圖 */}
        <div className="md:hidden divide-y divide-gray-100">
           {stats.allActivityStats.map((act: any) => (
              <div key={`${act.category}-${act.id}`} className="p-4">
                 <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                       <div className="font-bold text-gray-900">{act.title}</div>
                       <div className="text-xs text-gray-400">{act.date}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold shrink-0 ${act.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{act.status === 'active' ? '進行中' : '已結束'}</span>
                 </div>
                 <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                    <span className={`px-2 py-1 rounded font-bold ${act.category === '會員' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{act.category}</span>
                    <span className="text-gray-500">報名/已付：<span className="text-gray-900 font-bold">{act.regCount}</span> / <span className="text-blue-600 font-bold">{act.paidCount}</span></span>
                    <span className="text-gray-500">出席：<span className={`font-bold ${act.checkInCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>{act.checkInCount}</span> / {act.regCount}</span>
                 </div>
                 {!isStaff && <div className="mt-1 text-sm font-mono font-bold text-gray-700">累積營收 NT$ {act.revenue.toLocaleString()}</div>}
              </div>
           ))}
           {stats.allActivityStats.length === 0 && (
              <div className="p-6 text-center text-gray-400">尚無活動資料</div>
           )}
        </div>
      </div>
    </div>
  );
};

const MemberApplicationManager: React.FC<{
  applications: MemberApplication[]; 
  onApprove: (app: MemberApplication) => void;
  onDelete: (id: string | number) => void; 
}> = ({ applications, onApprove, onDelete }) => {
  const [selectedApp, setSelectedApp] = useState<MemberApplication | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | number | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptMap, setReceiptMap] = useState<Record<string, string>>({});

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('order_no, status');
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((r: any) => {
        if (r.order_no) map[r.order_no] = r.status;
      });
      setReceiptMap(map);
    } catch (err) {
      console.error('Error fetching receipts:', err);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleMarkAsPaid = async (app: MemberApplication) => {
    if (!confirm(`確定要將 ${app.name} 的申請狀態手動標記為「已付款」嗎？`)) return;

    try {
      const { error } = await supabase
        .from('member_applications')
        .update({ 
          payment_status: PaymentStatus.PAID,
          paid_at: new Date().toISOString(),
          payment_method: 'manual_admin'
        })
        .eq('id', app.id);

      if (error) throw error;
      
      alert('已更新為已付款狀態');
      // 重新整理頁面或通知父組件更新列表 (這裡簡單做 reload，理想上應該有 callback)
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert('更新失敗: ' + (err.message || '未知錯誤'));
    }
  };

  const handleResendPaymentLink = async (app: MemberApplication, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`確定要重新發送繳費連結給 ${app.name} (${app.email})？`)) return;
    
    setSendingEmailId(app.id);
    const paymentLink = `${window.location.origin}/#/pay-application/${app.id}`;
    
    if (!EMAIL_CONFIG.SERVICE_ID || EMAIL_CONFIG.SERVICE_ID === 'YOUR_NEW_SERVICE_ID') {
      alert('EmailJS 尚未設定，無法發送郵件');
      setSendingEmailId(null);
      return;
    }

    try {
      // 使用既有的入會通知模板，將繳費連結放入 message
      const templateParams = {
        to_name: app.name,
        email: app.email,
        to_email: app.email,
        reply_to: app.email,
        phone: app.phone,
        company: app.company_title || app.brand_name || '',
        job_title: app.job_title,
        activity_title: '【食在力量】會員入會繳費通知',
        activity_date: new Date().toISOString().slice(0, 10),
        activity_time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        activity_location: '線上繳費',
        activity_price: `NT$ ${(app.paid_amount || 5000).toLocaleString()}`,
        message: `親愛的 ${app.name} 您好，\n\n您的入會申請已收到，請點擊以下連結完成繳費程序以正式加入會員：\n\n${paymentLink}\n\n若您已完成繳費，請忽略此信件。`
      };

      await emailjs.send(EMAIL_CONFIG.SERVICE_ID, EMAIL_CONFIG.MEMBER_JOIN_TEMPLATE_ID, templateParams, EMAIL_CONFIG.PUBLIC_KEY);
      alert('繳費連結已發送！');
    } catch (error) {
      console.error(error);
      alert('發送失敗，請稍後再試');
    } finally {
      setSendingEmailId(null);
    }
  };

  const pendingApps = applications.filter(app => app.status !== 'approved');
  const approvedApps = applications.filter(app => app.status === 'approved');

  const renderTable = (apps: MemberApplication[], isApproved: boolean) => (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mb-8">
      <div className="p-4 border-b border-gray-50 bg-gray-50/50">
        <h2 className="text-lg font-bold text-gray-800">{isApproved ? '已處理申請' : '待處理申請'} <span className="text-sm font-normal text-gray-500 ml-2">共 {apps.length} 筆</span></h2>
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500">
              <th className="p-4">申請日期</th>
              <th className="p-4">姓名</th>
              <th className="p-4">引薦人</th>
              <th className="p-4">公司/職稱</th>
              <th className="p-4">聯繫方式</th>
              <th className="p-4">繳費狀態</th>
              <th className="p-4">付款方式</th>
              <th className="p-4">備註</th>
              <th className="p-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {apps.map(app => {
              const isPaid = app.payment_status === PaymentStatus.PAID;
              return (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="p-4 text-gray-500">{new Date(app.created_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{app.name}</div>
                    {app.merchant_order_no && <div className="text-[10px] text-gray-400 font-mono">#{app.merchant_order_no}</div>}
                  </td>
                  <td className="p-4 text-gray-500">{app.referrer || '-'}</td>
                  <td className="p-4">
                    <div className="font-bold">{app.company_title || app.brand_name}</div>
                    <div className="text-xs text-gray-500">{app.job_title}</div>
                  </td>
                  <td className="p-4">
                     <div>{app.phone}</div>
                     <div className="text-xs text-gray-400">{app.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {isPaid ? '已付款' : '待付款'}
                      </span>
                      {!isPaid && !isApproved && (
                        <>
                          <button 
                            onClick={(e) => handleResendPaymentLink(app, e)}
                            disabled={sendingEmailId === app.id}
                            className="text-blue-600 hover:text-blue-800 text-xs underline disabled:opacity-50 mr-2"
                          >
                            {sendingEmailId === app.id ? '發送中...' : '補寄連結'}
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(app); }}
                            className="text-green-600 hover:text-green-800 text-xs underline"
                          >
                            標記已付
                          </button>
                        </>
                      )}
                    </div>
                    {app.paid_amount && <div className="text-xs text-gray-400 mt-1">NT$ {app.paid_amount.toLocaleString()}</div>}
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {translatePaymentMethod(app.payment_method)}
                    </span>
                  </td>
                  <td className="p-4 min-w-[150px]">
                    <NotesInput 
                      value={app.notes} 
                      onSave={async (val) => {
                        try {
                          const { error } = await supabase
                            .from('member_applications')
                            .update({ notes: val })
                            .eq('id', app.id);
                          if (error) throw error;
                          // Update local state if possible, or just reload
                          // Since we don't have a local update function passed down, reload is safer for now
                          // but better to have a way to update parent state.
                          // For now, let's just assume it works or the user reloads.
                          // Actually, we can just alert or toast.
                        } catch (err) {
                          console.error(err);
                          alert('更新備註失敗');
                        }
                      }} 
                    />
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {isPaid && (
                        <button
                          onClick={() => {
                            const orderNo = app.merchant_order_no || `MANUAL_${app.id}`;
                            setReceiptData({
                              payerName: app.name,
                              companyName: app.company_title || '',
                              taxId: app.tax_id || '',
                              amount: app.paid_amount || 5000,
                              paymentMethod: translatePaymentMethod(app.payment_method),
                              feeType: 'initiation',
                              orderNo: orderNo,
                              email: app.email || ''
                            });
                          }}
                          disabled={(app.merchant_order_no || `MANUAL_${app.id}`) ? (receiptMap[app.merchant_order_no || `MANUAL_${app.id}`] === 'sent' || receiptMap[app.merchant_order_no || `MANUAL_${app.id}`] === 'issued') : false}
                          className={`px-3 py-2 rounded-lg font-bold text-xs transition-colors border ${
                            (app.merchant_order_no || `MANUAL_${app.id}`) && (receiptMap[app.merchant_order_no || `MANUAL_${app.id}`] === 'sent' || receiptMap[app.merchant_order_no || `MANUAL_${app.id}`] === 'issued')
                              ? 'bg-green-50 text-green-700 border-green-200 cursor-default'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {(app.merchant_order_no || `MANUAL_${app.id}`) && (receiptMap[app.merchant_order_no || `MANUAL_${app.id}`] === 'sent' || receiptMap[app.merchant_order_no || `MANUAL_${app.id}`] === 'issued') ? '已開立' : '開立收據'}
                        </button>
                      )}
                      <button 
                        onClick={() => setSelectedApp(app)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-700 transition-colors shadow-blue-200 shadow-sm"
                      >
                        {isApproved ? '詳細資料' : '審核 / 詳細資料'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {apps.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">目前沒有{isApproved ? '已處理' : '待審核'}的申請</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 手機版卡片視圖 */}
      <div className="md:hidden divide-y divide-gray-100">
        {apps.map(app => {
          const isPaid = app.payment_status === PaymentStatus.PAID;
          const orderNo = app.merchant_order_no || `MANUAL_${app.id}`;
          const receiptIssued = receiptMap[orderNo] === 'sent' || receiptMap[orderNo] === 'issued';
          return (
            <div key={app.id} className="p-4">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-gray-900">{app.name}</div>
                  <div className="text-xs text-gray-500">{app.company_title || app.brand_name}{app.job_title ? ` · ${app.job_title}` : ''}</div>
                  {app.merchant_order_no && <div className="text-[10px] text-gray-400 font-mono">#{app.merchant_order_no}</div>}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold shrink-0 ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{isPaid ? '已付款' : '待付款'}</span>
              </div>
              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                <div>{app.phone}{app.email ? ` · ${app.email}` : ''}</div>
                <div>引薦人：{app.referrer || '-'} · {translatePaymentMethod(app.payment_method)}{app.paid_amount ? ` · NT$ ${app.paid_amount.toLocaleString()}` : ''}</div>
              </div>
              {!isPaid && !isApproved && (
                <div className="mt-2 flex gap-3 text-xs">
                  <button onClick={(e) => handleResendPaymentLink(app, e)} disabled={sendingEmailId === app.id} className="text-blue-600 hover:text-blue-800 underline disabled:opacity-50">{sendingEmailId === app.id ? '發送中...' : '補寄連結'}</button>
                  <button onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(app); }} className="text-green-600 hover:text-green-800 underline">標記已付</button>
                </div>
              )}
              <div className="mt-2 flex items-start gap-1 text-xs"><span className="font-bold text-gray-400 shrink-0 mt-0.5">備註:</span>
                <NotesInput value={app.notes} onSave={async (val) => { try { const { error } = await supabase.from('member_applications').update({ notes: val }).eq('id', app.id); if (error) throw error; } catch (err) { console.error(err); alert('更新備註失敗'); } }} />
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                {isPaid && (
                  <button
                    onClick={() => setReceiptData({ payerName: app.name, companyName: app.company_title || '', taxId: app.tax_id || '', amount: app.paid_amount || 5000, paymentMethod: translatePaymentMethod(app.payment_method), feeType: 'initiation', orderNo, email: app.email || '' })}
                    disabled={receiptIssued}
                    className={`px-3 py-2 rounded-lg font-bold text-xs transition-colors border ${receiptIssued ? 'bg-green-50 text-green-700 border-green-200 cursor-default' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                  >
                    {receiptIssued ? '已開立' : '開立收據'}
                  </button>
                )}
                <button onClick={() => setSelectedApp(app)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-700 transition-colors ml-auto">{isApproved ? '詳細資料' : '審核 / 詳細資料'}</button>
              </div>
            </div>
          );
        })}
        {apps.length === 0 && (
          <div className="p-8 text-center text-gray-400">目前沒有{isApproved ? '已處理' : '待審核'}的申請</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新會員申請管理</h1>
      <p className="text-gray-500">此處顯示前台提交的會員申請表，請確認已繳費後再進行核准。</p>
      
      {renderTable(pendingApps, false)}
      {renderTable(approvedApps, true)}

      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-2xl rounded-2xl p-8 max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold">申請內容詳情</h2>
               <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} /></button>
             </div>
             <div className="space-y-6">
               <div className={`p-4 rounded-xl border flex items-start gap-3 ${selectedApp.payment_status === PaymentStatus.PAID ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`}>
                 {selectedApp.payment_status === PaymentStatus.PAID ? <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={20} /> : <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />}
                 <div>
                   <p className={`font-bold ${selectedApp.payment_status === PaymentStatus.PAID ? 'text-green-800' : 'text-yellow-800'}`}>
                     {selectedApp.payment_status === PaymentStatus.PAID ? '已完成繳費' : '尚未完成繳費'}
                   </p>
                   <p className={`text-sm ${selectedApp.payment_status === PaymentStatus.PAID ? 'text-green-700' : 'text-yellow-700'}`}>
                     {selectedApp.payment_status === PaymentStatus.PAID 
                       ? '確認款項無誤後，即可核准加入會員。' 
                       : '請確認申請人是否已繳費。若尚未繳費，請勿核准。您可以補寄繳費連結給申請人。'}
                   </p>
                   {selectedApp.payment_status !== PaymentStatus.PAID && (
                      <div className="flex gap-2 mt-2">
                        <button 
                          onClick={(e) => handleResendPaymentLink(selectedApp, e)}
                          disabled={sendingEmailId === selectedApp.id}
                          className="text-sm bg-white border border-yellow-200 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-100 transition-colors"
                        >
                          {sendingEmailId === selectedApp.id ? '發送中...' : '補寄繳費連結'}
                        </button>
                        <button 
                          onClick={() => handleMarkAsPaid(selectedApp)}
                          className="text-sm bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded hover:bg-green-100 transition-colors"
                        >
                          手動標記為已付款
                        </button>
                      </div>
                   )}
                 </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                 <div><span className="text-gray-500 block mb-1">姓名</span><p className="font-bold text-lg">{selectedApp.name}</p></div>
                 <div><span className="text-gray-500 block mb-1">申請日期</span><p className="font-bold">{new Date(selectedApp.created_at).toLocaleString()}</p></div>
                 
                 <div className="col-span-2 border-t pt-4 mt-2"><h3 className="font-bold text-gray-900 mb-2">基本資料</h3></div>
                 <div><span className="text-gray-500 block">身分證字號</span><p>{selectedApp.id_number}</p></div>
                 <div><span className="text-gray-500 block">生日</span><p>{selectedApp.birthday}</p></div>
                 <div><span className="text-gray-500 block">引薦人</span><p>{selectedApp.referrer || '無'}</p></div>
                 
                 <div className="col-span-2 border-t pt-4 mt-2"><h3 className="font-bold text-gray-900 mb-2">聯絡方式</h3></div>
                 <div><span className="text-gray-500 block">手機</span><p>{selectedApp.phone}</p></div>
                 <div><span className="text-gray-500 block">Email</span><p>{selectedApp.email}</p></div>
                 <div><span className="text-gray-500 block">室內電話</span><p>{selectedApp.home_phone}</p></div>
                 <div className="md:col-span-2"><span className="text-gray-500 block">通訊地址</span><p>{selectedApp.address}</p></div>
                 
                 <div className="col-span-2 border-t pt-4 mt-2"><h3 className="font-bold text-gray-900 mb-2">事業資料</h3></div>
                 <div><span className="text-gray-500 block">產業分類</span><p className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs font-bold">{selectedApp.industry_category}</p></div>
                 <div><span className="text-gray-500 block">品牌名稱</span><p>{selectedApp.brand_name}</p></div>
                 <div><span className="text-gray-500 block">公司抬頭</span><p>{selectedApp.company_title}</p></div>
                 <div><span className="text-gray-500 block">統一編號</span><p>{selectedApp.tax_id}</p></div>
                 <div><span className="text-gray-500 block">職稱</span><p>{selectedApp.job_title}</p></div>
                 <div><span className="text-gray-500 block">公司網站</span><p className="text-blue-600 truncate">{selectedApp.website}</p></div>
                 <div className="md:col-span-2"><span className="text-gray-500 block">主要服務/產品</span><p className="bg-gray-50 p-2 rounded">{selectedApp.main_service}</p></div>
                 <div className="md:col-span-2"><span className="text-gray-500 block">備註</span><p className="bg-gray-50 p-2 rounded">{selectedApp.notes || '無'}</p></div>
                 
                 {selectedApp.payment_status === PaymentStatus.PAID && (
                   <>
                     <div className="col-span-2 border-t pt-4 mt-2"><h3 className="font-bold text-gray-900 mb-2">付款資訊</h3></div>
                     <div><span className="text-gray-500 block">繳費狀態</span><p className="font-bold text-green-600">已付款</p></div>
                     <div><span className="text-gray-500 block">付款方式</span><p>{translatePaymentMethod(selectedApp.payment_method)}</p></div>
                     <div><span className="text-gray-500 block">繳費金額</span><p>NT$ {selectedApp.paid_amount?.toLocaleString() || 0}</p></div>
                     <div><span className="text-gray-500 block">繳費時間</span><p>{selectedApp.paid_at ? new Date(selectedApp.paid_at).toLocaleString() : '-'}</p></div>
                     <div className="md:col-span-2"><span className="text-gray-500 block">訂單編號</span><p className="font-mono text-xs">{selectedApp.merchant_order_no || '-'}</p></div>
                   </>
                 )}
               </div>
             </div>
             <div className="flex gap-4 mt-8 pt-6 border-t">
               <button onClick={() => { onDelete(selectedApp.id); setSelectedApp(null); }} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition-colors">刪除紀錄</button>
               {selectedApp.status !== 'approved' && (
                 <button 
                   onClick={() => { 
                      if (selectedApp.payment_status !== PaymentStatus.PAID) {
                          if (!confirm('警告：此申請尚未完成繳費。確定要強制核准嗎？')) return;
                      }
                      onApprove(selectedApp); 
                      setSelectedApp(null); 
                   }} 
                   className={`flex-[2] text-white py-3 rounded-xl font-bold transition-colors shadow-lg flex items-center justify-center gap-2 ${selectedApp.payment_status === PaymentStatus.PAID ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-gray-400 hover:bg-gray-500 shadow-gray-200'}`}
                 >
                   <CheckCircle size={20} /> {selectedApp.payment_status === PaymentStatus.PAID ? '確認無誤，核准並加入會員' : '強制核准 (未繳費)'}
                 </button>
               )}
             </div>
           </div>
        </div>
      )}

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

const ActivityManager: React.FC<{
  type: 'general' | 'member' | 'unified';
  activities: (Activity | MemberActivity)[];
  registrations: (Registration | MemberRegistration)[];
  onAdd: (act: any) => void;
  onUpdate: (act: any) => void;
  onDelete: (id: string | number) => void;
  onUpdateReg: (reg: any) => void;
  onDeleteReg: (id: string | number) => void;
  onAddRegs?: (regs: any[]) => void;
  onUploadImage: (file: File) => Promise<string>;
  members?: Member[];
}> = ({ type, activities, registrations, onAdd, onUpdate, onDelete, onUpdateReg, onDeleteReg, onAddRegs, onUploadImage, members }) => {
  // unified 模式：當活動的 audience 為 member_only 時，視為「會員活動」行為
  const isMemberMode = (act?: any) => {
    if (type === 'member') return true;
    if (type === 'general') return false;
    return (act?.audience || 'public') === 'member_only';
  };
  const [view, setView] = useState<'list' | 'edit' | 'registrations'>('list');
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [regSearch, setRegSearch] = useState('');
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptMap, setReceiptMap] = useState<Record<string, string>>({});
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  const [isBatchIssuing, setIsBatchIssuing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchReceiptData, setBatchReceiptData] = useState<any>(null);

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('order_no, status');
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((r: any) => {
        if (r.order_no) map[r.order_no] = r.status;
      });
      setReceiptMap(map);
    } catch (err) {
      console.error('Error fetching receipts:', err);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const currentActivity = activities.find(a => a.id === editingId);
  const currentRegistrations = registrations.filter(r => String(r.activityId) === String(editingId));
  
  const filteredRegs = currentRegistrations.filter((r: any) => {
    const term = regSearch.toLowerCase();
    const name = r.name || r.member_name || '';
    return name.toLowerCase().includes(term) || (r.phone && r.phone.includes(term)) || (r.email && r.email.toLowerCase().includes(term)) || (r.merchant_order_no && r.merchant_order_no.includes(term));
  });

  const handleEdit = (act: any) => { setEditingId(act.id); setFormData({ ...act, audience: act.audience || (type === 'member' ? 'member_only' : 'public') }); setView('edit'); };
  const handleCreate = () => {
    const defaultAudience = type === 'member' ? 'member_only' : 'public';
    setEditingId(null);
    setFormData({ audience: defaultAudience, type: ActivityType.GATHERING, title: '', date: '', time: '', location: '', price: 0, picture: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1', description: '', status: 'active' });
    setView('edit');
  };
  const handleSave = async (e: React.FormEvent) => { e.preventDefault(); if (editingId) onUpdate(formData); else onAdd(formData); setView('list'); };
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const url = await onUploadImage(e.target.files[0]); if (url) setFormData({ ...formData, picture: url }); } };

  const sendToTelegram = async () => {
    if (!currentActivity || currentRegistrations.length === 0) {
      alert('目前沒有報名資料');
      return;
    }
    
    setIsSendingTelegram(true);
    try {
      const botToken = (import.meta as any).env.TELEGRAM_BOT_TOKEN || (import.meta as any).env.VITE_TELEGRAM_BOT_TOKEN;
      const chatId = (import.meta as any).env.TELEGRAM_CHAT_ID || (import.meta as any).env.VITE_TELEGRAM_CHAT_ID;
      
      if (!botToken || !chatId) {
        alert('請先在環境變數設定 TELEGRAM_BOT_TOKEN 與 TELEGRAM_CHAT_ID');
        return;
      }

      let message = `【${currentActivity.title}】\n`;
      
      // 依據報名時間排序 (越早報名排在越上面)
      const sortedRegs = [...currentRegistrations].sort((a: any, b: any) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      sortedRegs.forEach((r: any, index: number) => {
        const member = members?.find(m => String(m.id) === String(r.memberId));
        const name = r.name || r.member_name || member?.name || '';
        const company = r.company_title || r.company || member?.company_title || member?.company || '';
        const isPaid = r.payment_status === PaymentStatus.PAID;
        const statusText = isPaid ? '✅已付款' : '❌待付款';
        
        message += `${index + 1}. ${name} / ${company}${company ? ' ' : ''}${statusText}\n`;
      });

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
      });

      if (!response.ok) {
        throw new Error('傳送失敗');
      }

      alert('已成功傳送名單至 Telegram！');
    } catch (error) {
      console.error('Telegram send error:', error);
      alert('傳送失敗，請檢查網路或設定。');
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const exportCSV = () => {
    const data = currentRegistrations.map((r: any) => {
      const member = members?.find(m => String(m.id) === String(r.memberId));
      const name = r.name || r.member_name || member?.name || '';
      const phone = r.phone || member?.phone || '';
      const email = r.email || member?.email || '';
      
      const company = r.company_title || r.company || member?.company_title || member?.company || '';
      const title = r.title || member?.job_title || '';
      const companyTitle = company && title ? `${company}/${title}` : (company || title || '');

      return {
        '報名時間': new Date(r.created_at).toLocaleString(),
        '姓名': name,
        '電話': phone,
        'Email': email,
        '單位/職稱': companyTitle,
        '統一編號': r.tax_id || member?.tax_id || '',
        '報到狀態': r.check_in_status ? '已報到' : '未報到',
        '付款狀態': r.payment_status === PaymentStatus.PAID ? '已付款' : (r.payment_status === 'refunded' ? '已退費' : '待付款'),
        '付款金額': r.paid_amount,
        '金流單號': r.merchant_order_no,
        '折扣碼': r.coupon_code,
        '備註': r.notes
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "報名名單");
    XLSX.writeFile(wb, `${currentActivity?.title}_報名名單.xlsx`);
  };
  
  const handlePaymentStatusToggle = (reg: any) => {
     if (reg.payment_status === PaymentStatus.PENDING || !reg.payment_status) { onUpdateReg({ ...reg, payment_status: PaymentStatus.PAID }); return; }
     if (reg.payment_status === PaymentStatus.PAID) { if (confirm("【已付款】訂單操作：\n\n按「確定」將狀態標記為【已退費】\n按「取消」詢問是否回復為【待付款】")) { onUpdateReg({ ...reg, payment_status: PaymentStatus.REFUNDED }); } else { if (confirm("是否要將此訂單回復為【待付款】？")) { onUpdateReg({ ...reg, payment_status: PaymentStatus.PENDING }); } } return; }
     if (reg.payment_status === PaymentStatus.REFUNDED) { if (confirm("是否將此【已退費】訂單重新開啟為【待付款】？")) { onUpdateReg({ ...reg, payment_status: PaymentStatus.PENDING }); } return; }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentActivity || !onAddRegs) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws) as any[];

          if (data.length === 0) {
            alert('檔案中沒有資料');
            return;
          }

          const newRegs = data.map(row => {
            const baseReg = {
              id: crypto.randomUUID(),
              activityId: currentActivity.id,
              payment_status: PaymentStatus.PAID, // 批量匯入預設為已付款
              payment_method: 'manual_admin',
              paid_amount: Number(row['報名金額'] || row['金額'] || row['Amount'] || currentActivity.price || 0),
              notes: row['備註（選填）'] || row['備註'] || row['Notes'] || '批量匯入',
              created_at: new Date().toISOString()
            };

            if (isMemberMode(currentActivity)) {
              const memberName = row['姓名'] || row['Name'] || '';
              const memberPhone = String(row['手機號碼'] || row['電話'] || row['Phone'] || '');
              const member = members?.find(m => m.name === memberName || (memberPhone && m.phone === memberPhone));
              
              return {
                ...baseReg,
                memberId: member?.id || '',
                member_name: memberName,
                member_no: member?.member_no || '',
              };
            } else {
              return {
                ...baseReg,
                name: row['姓名'] || row['Name'] || '',
                phone: String(row['手機號碼'] || row['電話'] || row['Phone'] || ''),
                email: row['電子郵件'] || row['Email'] || '',
                company: row['公司/品牌名稱'] || row['公司名稱'] || row['公司'] || row['Company'] || '',
                company_title: row['公司抬頭 (收據用)'] || row['公司抬頭'] || '',
                title: row['職務'] || row['職稱'] || row['Title'] || '',
                tax_id: String(row['統一編號 (收據用)'] || row['統一編號'] || row['統編'] || row['TaxID'] || ''),
                referrer: row['引薦人 (選填)'] || row['引薦人'] || row['Referrer'] || '',
              };
            }
          });

          if (confirm(`確定要匯入 ${newRegs.length} 筆報名資料嗎？`)) {
            await onAddRegs(newRegs);
          }
        } catch (err: any) {
          alert('解析檔案失敗：' + err.message);
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      alert('讀取檔案失敗：' + err.message);
      setIsImporting(false);
    }
  };

  const handleBatchIssueReceipts = async () => {
    const regsToIssue = filteredRegs.filter(r => {
      const orderNo = r.merchant_order_no || `MANUAL_${r.id}`;
      return selectedRegIds.includes(String(r.id)) && 
             r.payment_status === PaymentStatus.PAID &&
             receiptMap[orderNo] !== 'sent' && receiptMap[orderNo] !== 'issued';
    });

    if (regsToIssue.length === 0) {
      alert('請選擇已付款且尚未開立收據的報名者。');
      return;
    }

    if (!confirm(`確定要批量開立並寄送 ${regsToIssue.length} 份收據嗎？\n這將會自動產生收據編號、儲存紀錄並寄出 Email。`)) return;

    setIsBatchIssuing(true);
    setBatchProgress({ current: 0, total: regsToIssue.length });

    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const datePrefix = `${year}${month}${day}`;

      const { data: latestData } = await supabase
        .from('receipts')
        .select('receipt_no')
        .like('receipt_no', `${datePrefix}%`)
        .order('receipt_no', { ascending: false })
        .limit(1);

      let nextSeq = 1;
      if (latestData && latestData.length > 0) {
        const lastNo = latestData[0].receipt_no;
        const lastSeq = parseInt(lastNo.substring(8), 10);
        if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
      }

      const receiptsToProcess: ReceiptData[] = regsToIssue.map((reg, index) => {
        const member = members?.find(m => String(m.id) === String(reg.memberId));
        const name = reg.name || reg.member_name || member?.name || '';
        const company = reg.company_title || reg.company || member?.company_title || member?.company || '';
        const email = reg.email || member?.email || '';

        return {
          receiptNo: `${datePrefix}${String(nextSeq + index).padStart(3, '0')}`,
          payerName: company ? `${name}（${company}）` : name,
          taxId: reg.tax_id || member?.tax_id || '',
          amount: reg.paid_amount || 0,
          paymentMethod: translatePaymentMethod(reg.payment_method),
          feeType: 'donation',
          orderNo: reg.merchant_order_no || `MANUAL_${reg.id}`,
          issueDate: today.toISOString().split('T')[0],
          handlerName: '許暐脡',
          remarks: `活動：${currentActivity?.title || ''}`,
          email: email
        };
      });

      setBatchReceiptData(receiptsToProcess);
    } catch (err) {
      console.error('Batch issue error:', err);
      alert('準備批量處理資料時發生錯誤');
      setIsBatchIssuing(false);
    }
  };

  const handleBatchComplete = (successCount: number, failCount: number) => {
    alert(`批量開立完成！\n成功：${successCount} 份\n失敗：${failCount} 份`);
    fetchReceipts();
    setSelectedRegIds([]);
    setIsBatchIssuing(false);
    setBatchReceiptData(null);
  };

  const toggleSelectAll = () => {
    if (selectedRegIds.length === filteredRegs.length && filteredRegs.length > 0) {
      setSelectedRegIds([]);
    } else {
      setSelectedRegIds(filteredRegs.map(r => String(r.id)));
    }
  };

  if (view === 'registrations' && currentActivity) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between">
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900"><ChevronRight className="rotate-180" size={20} /> 返回列表</button>
          <div className="flex gap-2">
            <button onClick={sendToTelegram} disabled={isSendingTelegram} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold text-sm disabled:opacity-50">
              {isSendingTelegram ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 
              傳送名單至 Telegram
            </button>
            <button onClick={() => {
              const template = [['姓名', '手機號碼', '電子郵件', '公司/品牌名稱', '公司抬頭 (收據用)', '統一編號 (收據用)', '職務', '引薦人 (選填)', '報名金額', '備註（選填）']];
              const ws = XLSX.utils.aoa_to_sheet(template);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "匯入範本");
              XLSX.writeFile(wb, "活動報名匯入範本.xlsx");
            }} className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-bold text-sm">
              <Download size={16} />
              下載範本
            </button>
            <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-bold text-sm disabled:opacity-50">
              {isImporting ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
              批量匯入
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx, .xls, .csv" className="hidden" />
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm"><FileDown size={16} /> 匯出名單</button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100">
          <h2 className="text-2xl font-bold mb-2">{currentActivity.title}</h2>
          <div className="flex gap-4 text-sm text-gray-500 mb-6"><span>總報名: {currentRegistrations.length} 人</span><span>已付款: {currentRegistrations.filter(r => r.payment_status === PaymentStatus.PAID).length} 人</span><span>已退費: {currentRegistrations.filter(r => r.payment_status === 'refunded').length} 人</span><span>已報到: {currentRegistrations.filter(r => r.check_in_status).length} 人</span></div>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="搜尋姓名、電話、金流單號..." value={regSearch} onChange={e => setRegSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
            {selectedRegIds.length > 0 && (
              <button 
                onClick={handleBatchIssueReceipts}
                disabled={isBatchIssuing}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-bold shadow-lg shadow-red-100 transition-all disabled:opacity-50"
              >
                {isBatchIssuing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    處理中 ({batchProgress.current}/{batchProgress.total})
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    批量開立收據 ({selectedRegIds.length})
                  </>
                )}
              </button>
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4 rounded-tl-lg w-10">
                    <input
                      type="checkbox"
                      checked={selectedRegIds.length === filteredRegs.length && filteredRegs.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </th>
                  <th className="p-4">姓名/資訊</th>
                  {!isMemberMode(currentActivity) && <th className="p-4">引薦人</th>}
                  <th className="p-4">備註</th>
                  <th className="p-4">報到狀態</th>
                  <th className="p-4">付款狀態 (點擊切換)</th>
                  <th className="p-4">付款方式</th>
                  <th className="p-4">金額</th>
                  <th className="p-4 rounded-tr-lg text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredRegs.map((reg: any) => {
                  const member = members?.find(m => String(m.id) === String(reg.memberId));
                  const name = reg.name || reg.member_name || member?.name || '';
                  const phone = reg.phone || member?.phone || '';
                  const company = reg.company_title || reg.company || member?.company_title || member?.company || '';
                  const title = reg.title || member?.job_title || '';
                  
                  return (
                  <tr key={reg.id} className={`hover:bg-gray-50 ${reg.payment_status === 'refunded' ? 'bg-gray-50' : ''}`}>
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        checked={selectedRegIds.includes(String(reg.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRegIds(prev => [...prev, String(reg.id)]);
                          } else {
                            setSelectedRegIds(prev => prev.filter(id => id !== String(reg.id)));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </td>
                    <td className="p-4">
                      <div className={`font-bold flex items-center gap-2 ${reg.payment_status === 'refunded' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {name}
                        {reg.payment_status === 'refunded' && <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded font-bold no-underline">已退費</span>}
                      </div>
                      <div className="text-xs text-gray-400">{phone}</div>
                      {(company || title) && <div className="text-xs text-gray-500 mt-0.5">{company}{company && title ? ' / ' : ''}{title}</div>}
                      {reg.merchant_order_no && <div className="text-[10px] text-gray-400 font-mono mt-0.5">#{reg.merchant_order_no}</div>}
                    </td>
                    {!isMemberMode(currentActivity) && <td className="p-4 text-xs text-gray-500">{reg.referrer || '-'}</td>}
                    <td className="p-4 min-w-[150px]">
                      <NotesInput value={reg.notes} onSave={(val) => onUpdateReg({...reg, notes: val})} />
                    </td>
                    <td className="p-4"><button onClick={() => onUpdateReg({...reg, check_in_status: !reg.check_in_status})} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${reg.check_in_status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{reg.check_in_status ? <CheckCircle size={14}/> : <XCircle size={14}/>} {reg.check_in_status ? '已報到' : '未報到'}</button></td>
                    <td className="p-4"><button onClick={() => handlePaymentStatusToggle(reg)} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors ${reg.payment_status === PaymentStatus.PAID ? 'bg-green-100 text-green-700 hover:bg-green-200' : (reg.payment_status === 'refunded' ? 'bg-gray-200 text-gray-500 hover:bg-gray-300' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200')}`} title={reg.payment_status === PaymentStatus.PAID ? '點擊進行退費' : '點擊變更狀態'}>{reg.payment_status === PaymentStatus.PAID ? '已付款' : (reg.payment_status === 'refunded' ? '已退費' : '待付款')}{reg.payment_status === PaymentStatus.PAID && <RefreshCcw size={10} className="ml-1 opacity-50"/>}{reg.payment_status === 'refunded' && <Ban size={10} className="ml-1 opacity-50"/>}</button></td>
                    <td className="p-4">
                      <span className="text-xs text-gray-500">
                        {translatePaymentMethod(reg.payment_method)}
                      </span>
                    </td>
                    <td className="p-4"><PaidAmountInput value={reg.paid_amount} onSave={(val) => onUpdateReg({...reg, paid_amount: val})} /></td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {reg.payment_status === PaymentStatus.PAID && (
                          <button
                            onClick={() => {
                              const orderNo = reg.merchant_order_no || `MANUAL_${reg.id}`;
                              setReceiptData({
                                payerName: name,
                                companyName: company,
                                taxId: reg.tax_id || member?.tax_id || '',
                                amount: reg.paid_amount || 0,
                                paymentMethod: translatePaymentMethod(reg.payment_method),
                                feeType: 'donation',
                                orderNo: orderNo,
                                email: reg.email || member?.email || '',
                                remarks: `活動：${currentActivity?.title || ''}`
                              });
                            }}
                            disabled={(reg.merchant_order_no || `MANUAL_${reg.id}`) ? (receiptMap[reg.merchant_order_no || `MANUAL_${reg.id}`] === 'sent' || receiptMap[reg.merchant_order_no || `MANUAL_${reg.id}`] === 'issued') : false}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border ${
                              (reg.merchant_order_no || `MANUAL_${reg.id}`) && (receiptMap[reg.merchant_order_no || `MANUAL_${reg.id}`] === 'sent' || receiptMap[reg.merchant_order_no || `MANUAL_${reg.id}`] === 'issued')
                                ? 'bg-green-50 text-green-700 border-green-200 cursor-default'
                                : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                            }`}
                          >
                            {(reg.merchant_order_no || `MANUAL_${reg.id}`) && (receiptMap[reg.merchant_order_no || `MANUAL_${reg.id}`] === 'sent' || receiptMap[reg.merchant_order_no || `MANUAL_${reg.id}`] === 'issued') ? '已開立' : '開立收據'}
                          </button>
                        )}
                        <button onClick={() => { if(confirm('確定刪除此報名資料？')) onDeleteReg(reg.id); }} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>

          {/* 手機版卡片視圖 */}
          <div className="md:hidden space-y-3">
            {filteredRegs.map((reg: any) => {
              const member = members?.find(m => String(m.id) === String(reg.memberId));
              const name = reg.name || reg.member_name || member?.name || '';
              const phone = reg.phone || member?.phone || '';
              const company = reg.company_title || reg.company || member?.company_title || member?.company || '';
              const title = reg.title || member?.job_title || '';
              const receiptKey = reg.merchant_order_no || `MANUAL_${reg.id}`;
              const receiptIssued = receiptMap[receiptKey] === 'sent' || receiptMap[receiptKey] === 'issued';
              return (
                <div key={reg.id} className={`border rounded-xl p-4 shadow-sm ${reg.payment_status === 'refunded' ? 'bg-gray-50 border-gray-100' : 'border-gray-100'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <input type="checkbox" checked={selectedRegIds.includes(String(reg.id))} onChange={(e) => { if (e.target.checked) { setSelectedRegIds(prev => [...prev, String(reg.id)]); } else { setSelectedRegIds(prev => prev.filter(id => id !== String(reg.id))); } }} className="w-4 h-4 mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500 shrink-0" />
                      <div className="min-w-0">
                        <div className={`font-bold flex items-center gap-2 flex-wrap ${reg.payment_status === 'refunded' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {name}
                          {reg.payment_status === 'refunded' && <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded font-bold no-underline">已退費</span>}
                        </div>
                        {phone && <div className="text-xs text-gray-400">{phone}</div>}
                        {(company || title) && <div className="text-xs text-gray-500 mt-0.5">{company}{company && title ? ' / ' : ''}{title}</div>}
                        {!isMemberMode(currentActivity) && reg.referrer && <div className="text-xs text-gray-500">引薦：{reg.referrer}</div>}
                      </div>
                    </div>
                    <button onClick={() => { if(confirm('確定刪除此報名資料？')) onDeleteReg(reg.id); }} className="text-red-400 hover:text-red-600 p-2 shrink-0" aria-label="刪除"><Trash2 size={16} /></button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button onClick={() => onUpdateReg({...reg, check_in_status: !reg.check_in_status})} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${reg.check_in_status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{reg.check_in_status ? <CheckCircle size={14}/> : <XCircle size={14}/>} {reg.check_in_status ? '已報到' : '未報到'}</button>
                    <button onClick={() => handlePaymentStatusToggle(reg)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${reg.payment_status === PaymentStatus.PAID ? 'bg-green-100 text-green-700' : (reg.payment_status === 'refunded' ? 'bg-gray-200 text-gray-500' : 'bg-yellow-100 text-yellow-700')}`}>{reg.payment_status === PaymentStatus.PAID ? '已付款' : (reg.payment_status === 'refunded' ? '已退費' : '待付款')}{reg.payment_status === PaymentStatus.PAID && <RefreshCcw size={10} className="ml-1 opacity-50"/>}{reg.payment_status === 'refunded' && <Ban size={10} className="ml-1 opacity-50"/>}</button>
                    <span className="text-xs text-gray-400">{translatePaymentMethod(reg.payment_method)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm"><span className="text-xs text-gray-400">金額</span><PaidAmountInput value={reg.paid_amount} onSave={(val) => onUpdateReg({...reg, paid_amount: val})} /></div>
                  <div className="mt-2 flex items-start gap-1 text-xs"><span className="font-bold text-gray-400 shrink-0 mt-0.5">備註:</span> <NotesInput value={reg.notes} onSave={(val) => onUpdateReg({...reg, notes: val})} /></div>
                  {reg.payment_status === PaymentStatus.PAID && (
                    <button
                      onClick={() => setReceiptData({ payerName: name, companyName: company, taxId: reg.tax_id || member?.tax_id || '', amount: reg.paid_amount || 0, paymentMethod: translatePaymentMethod(reg.payment_method), feeType: 'donation', orderNo: receiptKey, email: reg.email || member?.email || '', remarks: `活動：${currentActivity?.title || ''}` })}
                      disabled={receiptIssued}
                      className={`mt-3 px-3 py-2 rounded-lg font-bold text-xs transition-colors border ${receiptIssued ? 'bg-green-50 text-green-700 border-green-200 cursor-default' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                    >
                      {receiptIssued ? '已開立收據' : '開立收據'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
  }

  if (view === 'edit') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
         <div className="flex items-center gap-4"><button onClick={() => setView('list')} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><ChevronRight className="rotate-180" size={20} /></button><h2 className="text-2xl font-bold">{editingId ? '編輯活動' : '新增活動'}</h2></div>
         <form onSubmit={handleSave} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {type === 'unified' && (
                 <div className="md:col-span-2">
                   <label className="block text-sm font-bold text-gray-700 mb-2">活動對象</label>
                   <div className="flex gap-2">
                     <label className={`flex-1 p-3 border rounded-lg cursor-pointer text-center font-bold transition-all ${(formData.audience || 'public') === 'public' ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                       <input type="radio" name="audience" value="public" checked={(formData.audience || 'public') === 'public'} onChange={() => setFormData({ ...formData, audience: 'public' })} className="hidden" />
                       公開活動
                     </label>
                     <label className={`flex-1 p-3 border rounded-lg cursor-pointer text-center font-bold transition-all ${formData.audience === 'member_only' ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                       <input type="radio" name="audience" value="member_only" checked={formData.audience === 'member_only'} onChange={() => setFormData({ ...formData, audience: 'member_only' })} className="hidden" />
                       會員專屬
                     </label>
                   </div>
                 </div>
               )}
               <div><label className="block text-sm font-bold text-gray-700 mb-2">活動標題</label><input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500"/></div>
               <div><label className="block text-sm font-bold text-gray-700 mb-2">活動類型</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500">{Object.values(ActivityType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
               <div><label className="block text-sm font-bold text-gray-700 mb-2">日期</label><input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500"/></div>
               <div><label className="block text-sm font-bold text-gray-700 mb-2">時間</label><input required type="time" lang="en-GB" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500"/></div>
               <div><label className="block text-sm font-bold text-gray-700 mb-2">地點</label><input required type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500"/></div>
               <div><label className="block text-sm font-bold text-gray-700 mb-2">費用</label><input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500"/></div>
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">會員價 (選填)</label>
                 <input
                   type="number"
                   placeholder="留空表示無會員優惠"
                   value={formData.member_price ?? ''}
                   onChange={e => setFormData({...formData, member_price: e.target.value === '' ? null : Number(e.target.value)})}
                   className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500"
                 />
                 <p className="text-xs text-gray-400 mt-1">設定後，會員報名自動套用此價格</p>
               </div>
               <div><label className="block text-sm font-bold text-gray-700 mb-2">報名狀態</label><select value={formData.status || 'active'} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500"><option value="active">開放報名</option><option value="closed">報名截止</option></select></div>
               <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700 mb-2">活動封面圖片</label><div className="flex items-center gap-4"><img src={formData.picture} alt="Preview" className="w-32 h-20 object-cover rounded-lg border bg-gray-50"/><label className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 flex items-center gap-2"><UploadCloud size={18} /> 上傳圖片<input type="file" className="hidden" accept="image/*" onChange={handleImageChange} /></label></div></div>
               <div className="md:col-span-2">
                 <label className="block text-sm font-bold text-gray-700 mb-2">活動描述 (區塊編輯器)</label>
                 <BlockEditor 
                   value={formData.description} 
                   onChange={val => setFormData({...formData, description: val})} 
                   onUploadImage={onUploadImage}
                 />
               </div>
               <div className="md:col-span-2 flex justify-end gap-4 pt-6 border-t">
                  <button type="button" onClick={() => setView('list')} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">取消</button>
                  <button type="submit" className="px-8 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-200">儲存活動</button>
               </div>
            </div>
         </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{type === 'general' ? '一般活動管理' : type === 'member' ? '會員活動管理' : '活動管理'}</h2>
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold transition-colors shadow-lg shadow-red-200"><Plus size={20} /> 新增活動</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(act => (
          <div key={act.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
            <div className="relative h-48">
              <img src={act.picture} alt={act.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => handleEdit(act)} className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm hover:bg-white transition-colors text-gray-600"><Edit2 size={18} /></button>
                <button onClick={() => onDelete(act.id)} className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm hover:bg-white transition-colors text-red-500"><Trash2 size={18} /></button>
              </div>
              <div className="absolute bottom-4 left-4 flex gap-2">
                <span className="px-3 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-bold text-gray-700 shadow-sm">{act.type}</span>
                {(act as any).audience === 'member_only' && (
                  <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold shadow-sm flex items-center gap-1"><Crown size={12} /> 會員專屬</span>
                )}
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-2 line-clamp-1">{act.title}</h3>
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-500"><Calendar size={16} /> {act.date} {act.time}</div>
                <div className="flex items-center gap-2 text-sm text-gray-500"><MapPin size={16} /> {act.location}</div>
                <div className="flex items-center gap-2 text-sm text-gray-500"><DollarSign size={16} /> NT$ {(act.price ?? 0).toLocaleString()}{(act as any).member_price != null && <span className="text-red-600 font-bold ml-1">/ 會員 NT$ {(act as any).member_price.toLocaleString()}</span>}</div>
                <div className="flex items-center gap-2 text-sm text-gray-500"><Users size={16} /> {registrations.filter(r => String(r.activityId) === String(act.id)).length} 人已報名</div>
              </div>
              <button onClick={() => { setEditingId(act.id); setView('registrations'); }} className="w-full py-3 bg-gray-50 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">管理報名名單 <ChevronRight size={18} /></button>
            </div>
          </div>
        ))}
      </div>
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
      {batchReceiptData && (
        <BatchReceiptGenerator
          receiptsToProcess={batchReceiptData}
          onProgress={(current, total) => setBatchProgress({ current, total })}
          onComplete={handleBatchComplete}
        />
      )}
    </div>
  );
};

const CheckInQrModal: React.FC<{ activity: Activity | MemberActivity; onClose: () => void }> = ({ activity, onClose }) => {
  const checkInUrl = `${window.location.origin}/#/checkin/${activity.id}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(checkInUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert('複製失敗，請手動複製連結');
    }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) { alert('請允許瀏覽器彈出視窗'); return; }
    const svg = document.getElementById('check-in-qr-svg')?.outerHTML || '';
    w.document.write(`
      <html><head><title>${activity.title} - 報到 QR</title>
      <style>
        body { font-family: -apple-system, sans-serif; text-align: center; padding: 40px 20px; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        .meta { color: #666; margin-bottom: 32px; font-size: 14px; }
        .qr { display: inline-block; padding: 24px; background: white; border: 2px solid #eee; border-radius: 16px; }
        .qr svg { width: 320px; height: 320px; }
        .tip { margin-top: 24px; color: #999; font-size: 13px; }
        .url { margin-top: 8px; color: #aaa; font-size: 11px; word-break: break-all; }
      </style></head><body>
        <h1>${activity.title}</h1>
        <div class="meta">${activity.date}${activity.time ? ' ・ ' + activity.time : ''}</div>
        <div class="qr">${svg}</div>
        <div class="tip">📱 請掃描 QR Code 進行報到</div>
        <div class="url">${checkInUrl}</div>
        <script>window.onload = () => { window.print(); };</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-black text-gray-900">報到 QR Code</h3>
            <p className="text-sm text-gray-500 truncate">{activity.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" aria-label="關閉">
            <X size={20} />
          </button>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 flex items-center justify-center mb-4">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <QRCodeSVG
              id="check-in-qr-svg"
              value={checkInUrl}
              size={256}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 mb-4">
          <input
            type="text"
            readOnly
            value={checkInUrl}
            className="flex-1 bg-transparent text-xs text-gray-600 outline-none truncate"
            onFocus={e => e.currentTarget.select()}
          />
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
          >
            {copied ? <><CheckCircle size={14} /> 已複製</> : <><Copy size={14} /> 複製</>}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition"
          >
            <Printer size={18} /> 列印
          </button>
          <a
            href={checkInUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition"
          >
            <ExternalLink size={18} /> 預覽
          </a>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          現場將此 QR 印出或顯示，報名者掃描後即可自助報到
        </p>
      </div>
    </div>
  );
};

const ActivityCheckInManager: React.FC<{
  type: 'general' | 'member' | 'unified';
  activities: (Activity | MemberActivity)[];
  registrations: (Registration | MemberRegistration)[];
  onUpdateReg: (reg: any) => void;
  members?: Member[];
}> = ({ type, activities, registrations, onUpdateReg, members }) => {
  const [selectedActivityId, setSelectedActivityId] = useState<string | number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingEmail, setSendingEmail] = useState<string[]>([]);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [receiptMap, setReceiptMap] = useState<Record<string, string>>({});
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  const [isBatchIssuing, setIsBatchIssuing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchReceiptData, setBatchReceiptData] = useState<any>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('order_no, status');
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((r: any) => {
        if (r.order_no) map[r.order_no] = r.status;
      });
      setReceiptMap(map);
    } catch (err) {
      console.error('Error fetching receipts:', err);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleResendPaymentLink = async (reg: any) => {
    if (!confirm(`確定要重新發送付款連結給 ${reg.name || reg.member_name}？`)) return;
    
    let email = reg.email;
    const isMemberReg = reg.audience === 'member_only' || type === 'member';
    if (isMemberReg && !email && members) {
       const member = members.find(m => String(m.id) === String(reg.memberId || reg.member_id));
       if (member) email = member.email;
    }

    if (!email) {
      alert('找不到此報名者的 Email，無法發送');
      return;
    }

    const activity = activities.find(a => String(a.id) === String(reg.activityId));
    if (!activity) {
        alert('找不到活動資料');
        return;
    }

    const paymentLink = `${window.location.origin}/#/pay-activity/${reg.id}`;
    
    setSendingEmail(prev => [...prev, String(reg.id)]);

    try {
      await emailjs.send(
        EMAIL_CONFIG.SERVICE_ID,
        EMAIL_CONFIG.TEMPLATE_ID,
        {
            to_name: reg.name || reg.member_name,
            email: email,
            phone: reg.phone || '',
            activity_title: activity.title,
            activity_date: activity.date,
            activity_time: activity.time,
            activity_location: `${activity.location} (請點擊此連結完成繳費: ${paymentLink})`,
            activity_price: reg.paid_amount || activity.price,
            payment_link: paymentLink
        },
        EMAIL_CONFIG.PUBLIC_KEY
      );
      
      alert(`已發送付款連結至 ${email}`);
    } catch (e: any) {
      console.error('Email Error:', e);
      alert('發送失敗: ' + (e.text || e.message));
    } finally {
      setSendingEmail(prev => prev.filter(id => id !== String(reg.id)));
    }
  };

  const currentActivity = activities.find(a => a.id === selectedActivityId);
  const currentRegistrations = registrations.filter(r => String(r.activityId) === String(selectedActivityId));
  const filteredRegs = currentRegistrations.filter((r: any) => {
    const term = searchTerm.toLowerCase();
    const name = r.name || r.member_name || '';
    return name.toLowerCase().includes(term) || (r.phone && r.phone.includes(term)) || (r.merchant_order_no && r.merchant_order_no.includes(term));
  });

  const handlePaymentStatusToggle = (reg: any) => {
    if (reg.payment_status === PaymentStatus.PENDING || !reg.payment_status) {
      onUpdateReg({ ...reg, payment_status: PaymentStatus.PAID });
      return;
    }
    if (reg.payment_status === PaymentStatus.PAID) {
      if (confirm("【已付款】訂單操作：\n\n按「確定」將狀態標記為【已退費】\n按「取消」詢問是否回復為【待付款】")) {
        onUpdateReg({ ...reg, payment_status: PaymentStatus.REFUNDED });
      } else {
        if (confirm("是否要將此訂單回復為【待付款】？")) {
          onUpdateReg({ ...reg, payment_status: PaymentStatus.PENDING });
        }
      }
      return;
    }
    if (reg.payment_status === PaymentStatus.REFUNDED) {
      if (confirm("是否將此【已退費】訂單重新開啟為【待付款】？")) {
        onUpdateReg({ ...reg, payment_status: PaymentStatus.PENDING });
      }
      return;
    }
  };

  const handleBatchIssueReceipts = async () => {
    const regsToIssue = filteredRegs.filter(r => {
      const orderNo = r.merchant_order_no || `MANUAL_${r.id}`;
      return selectedRegIds.includes(String(r.id)) && 
             r.payment_status === PaymentStatus.PAID &&
             receiptMap[orderNo] !== 'sent' && receiptMap[orderNo] !== 'issued';
    });

    if (regsToIssue.length === 0) {
      alert('請選擇已付款且尚未開立收據的報名者。');
      return;
    }

    if (!confirm(`確定要批量開立並寄送 ${regsToIssue.length} 份收據嗎？\n這將會自動產生收據編號、儲存紀錄並寄出 Email。`)) return;

    setIsBatchIssuing(true);
    setBatchProgress({ current: 0, total: regsToIssue.length });

    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const datePrefix = `${year}${month}${day}`;

      const { data: latestData } = await supabase
        .from('receipts')
        .select('receipt_no')
        .like('receipt_no', `${datePrefix}%`)
        .order('receipt_no', { ascending: false })
        .limit(1);

      let nextSeq = 1;
      if (latestData && latestData.length > 0) {
        const lastNo = latestData[0].receipt_no;
        const lastSeq = parseInt(lastNo.substring(8), 10);
        if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
      }

      const receiptsToProcess: ReceiptData[] = regsToIssue.map((reg, index) => {
        const member = members?.find(m => String(m.id) === String(reg.memberId));
        const name = reg.name || reg.member_name || member?.name || '';
        const company = reg.company_title || reg.company || member?.company_title || member?.company || '';
        const email = reg.email || member?.email || '';

        return {
          receiptNo: `${datePrefix}${String(nextSeq + index).padStart(3, '0')}`,
          payerName: company ? `${name}（${company}）` : name,
          taxId: reg.tax_id || member?.tax_id || '',
          amount: reg.paid_amount || 0,
          paymentMethod: translatePaymentMethod(reg.payment_method),
          feeType: 'donation',
          orderNo: reg.merchant_order_no || `MANUAL_${reg.id}`,
          issueDate: today.toISOString().split('T')[0],
          handlerName: '許暐脡',
          remarks: `活動：${currentActivity?.title || ''}`,
          email: email
        };
      });

      setBatchReceiptData(receiptsToProcess);
    } catch (err) {
      console.error('Batch issue error:', err);
      alert('準備批量處理資料時發生錯誤');
      setIsBatchIssuing(false);
    }
  };

  const handleBatchComplete = (successCount: number, failCount: number) => {
    alert(`批量開立完成！\n成功：${successCount} 份\n失敗：${failCount} 份`);
    fetchReceipts();
    setSelectedRegIds([]);
    setIsBatchIssuing(false);
    setBatchReceiptData(null);
  };

  const toggleSelectAll = () => {
    if (selectedRegIds.length === filteredRegs.length && filteredRegs.length > 0) {
      setSelectedRegIds([]);
    } else {
      setSelectedRegIds(filteredRegs.map(r => String(r.id)));
    }
  };

  const toggleSelectReg = (id: string) => {
    setSelectedRegIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (!selectedActivityId) {
    const sortedActivities = [...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{type === 'general' ? '一般活動' : type === 'member' ? '會員活動' : '活動'}報到</h1>
        <p className="text-gray-500">請選擇要進行報到的活動：</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedActivities.map(act => {
            const regCount = registrations.filter(r => String(r.activityId) === String(act.id)).length;
            const checkedInCount = registrations.filter(r => String(r.activityId) === String(act.id) && r.check_in_status).length;
            return (
              <button 
                key={act.id} 
                onClick={() => setSelectedActivityId(act.id)} 
                className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-red-200 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 font-bold text-sm">
                    {new Date(act.date).getDate()}
                    <span className="text-[10px] ml-0.5">日</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${act.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {act.status === 'active' ? '進行中' : '已結束'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 mb-2">{act.title}</h3>
                <p className="text-sm text-gray-500 mb-4">{act.date} {act.time}</p>
                <div className="flex items-center justify-between text-sm border-t pt-4">
                  <span className="text-gray-500 font-medium">報名 {regCount} 人</span>
                  <span className="text-red-600 font-bold">已到 {checkedInCount} 人</span>
                </div>
              </button>
            );
          })}
          {sortedActivities.length === 0 && <div className="text-gray-400 p-10 text-center col-span-full">目前無活動資料</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
       <div className="flex items-center gap-4">
         <button onClick={() => { setSelectedActivityId(null); setSelectedRegIds([]); }} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200">
           <ArrowLeft size={20} />
         </button>
         <div className="flex-1">
           <h2 className="text-2xl font-bold">{currentActivity?.title}</h2>
           <p className="text-sm text-gray-500">報到管理列表</p>
         </div>
         <button
           onClick={() => setShowQrModal(true)}
           className="flex items-center gap-2 bg-gradient-to-br from-red-600 to-orange-500 text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-red-100 hover:shadow-lg hover:-translate-y-0.5 transition-all"
         >
           <QrCode size={18} /> 顯示報到 QR
         </button>
       </div>

       {showQrModal && currentActivity && (
         <CheckInQrModal activity={currentActivity} onClose={() => setShowQrModal(false)} />
       )}

       <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
           <div className="relative flex-grow max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input type="text" placeholder="搜尋姓名、手機末三碼、單號..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-gray-50 focus:bg-white transition-all" autoFocus/>
           </div>
           <div className="flex items-center gap-4">
             {selectedRegIds.length > 0 && (
               <button 
                 onClick={handleBatchIssueReceipts}
                 disabled={isBatchIssuing}
                 className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-bold shadow-lg shadow-red-100 transition-all disabled:opacity-50"
               >
                 {isBatchIssuing ? (
                   <>
                     <Loader2 size={18} className="animate-spin" />
                     處理中 ({batchProgress.current}/{batchProgress.total})
                   </>
                 ) : (
                   <>
                     <FileText size={18} />
                     批量開立收據 ({selectedRegIds.length})
                   </>
                 )}
               </button>
             )}
             <div className="flex gap-4 text-sm font-bold text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
               <span>總計: {currentRegistrations.length}</span>
               <span className="text-green-600">已到: {currentRegistrations.filter(r => r.check_in_status).length}</span>
               <span className="text-gray-400">未到: {currentRegistrations.length - currentRegistrations.filter(r => r.check_in_status).length}</span>
             </div>
           </div>
         </div>
         
         <div className="hidden md:block overflow-x-auto">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                 <th className="p-4 rounded-tl-lg w-10">
                   <input
                     type="checkbox"
                     checked={selectedRegIds.length === filteredRegs.length && filteredRegs.length > 0}
                     onChange={toggleSelectAll}
                     className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                   />
                 </th>
                 <th className="p-4">參加者</th>
                 <th className="p-4">備註{(type === 'general' || (type === 'unified' && (currentActivity as any)?.audience !== 'member_only')) && '/引薦人'}</th>
                 <th className="p-4">報到操作 (點擊切換)</th>
                 <th className="p-4">付款狀態</th>
                 <th className="p-4">付款方式</th>
                 <th className="p-4 rounded-tr-lg">金額</th>
                 <th className="p-4"></th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
               {filteredRegs.map((reg: any) => {
                 const member = members?.find(m => String(m.id) === String(reg.memberId));
                 const name = reg.name || reg.member_name || member?.name || '';
                 const phone = reg.phone || member?.phone || '';
                 const company = reg.company_title || reg.company || member?.company_title || member?.company || '';
                 const title = reg.title || member?.job_title || '';
                 
                 return (
                   <tr key={reg.id} className={`hover:bg-gray-50 transition-colors ${reg.check_in_status ? 'bg-green-50/30' : ''} ${reg.payment_status === 'refunded' ? 'bg-gray-50' : ''}`}>
                     <td className="p-4">
                       <input 
                         type="checkbox" 
                         checked={selectedRegIds.includes(String(reg.id))}
                         onChange={() => toggleSelectReg(String(reg.id))}
                         className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                       />
                     </td>
                     <td className="p-4">
                       <div className={`font-bold text-lg flex items-center gap-2 ${reg.payment_status === 'refunded' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                         {name}
                         {reg.payment_status === 'refunded' && <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded font-bold no-underline">已退費</span>}
                       </div>
                       <div className="text-sm text-gray-500">{phone}</div>
                       {(company || title) && <div className="text-xs text-gray-500 mt-0.5">{company}{company && title ? ' / ' : ''}{title}</div>}
                     </td>
                     <td className="p-4">
                       <div className="text-xs text-gray-600 max-w-[200px] space-y-2">
                         {reg.audience !== 'member_only' && reg.referrer && <div><span className="font-bold text-gray-400">引薦:</span> {reg.referrer}</div>}
                         <div><span className="font-bold text-gray-400">備註:</span> <NotesInput value={reg.notes} onSave={(val) => onUpdateReg({...reg, notes: val})} /></div>
                       </div>
                     </td>
                     <td className="p-4">
                       <button onClick={() => onUpdateReg({...reg, check_in_status: !reg.check_in_status})} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-sm active:scale-95 ${reg.check_in_status ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
                         {reg.check_in_status ? <CheckCircle size={20}/> : <XCircle size={20}/>} {reg.check_in_status ? '已報到' : '未報到'}
                       </button>
                     </td>
                     <td className="p-4">
                       <div className="flex flex-col gap-2 items-start">
                         <button onClick={() => handlePaymentStatusToggle(reg)} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors ${reg.payment_status === PaymentStatus.PAID ? 'bg-green-100 text-green-700 hover:bg-green-200' : (reg.payment_status === 'refunded' ? 'bg-gray-200 text-gray-500 hover:bg-gray-300' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200')}`}>
                           {reg.payment_status === PaymentStatus.PAID ? '已付款' : (reg.payment_status === 'refunded' ? '已退費' : '待付款')}
                           {reg.payment_status === PaymentStatus.PAID && <RefreshCcw size={10} className="ml-1 opacity-50"/>}
                           {reg.payment_status === 'refunded' && <Ban size={10} className="ml-1 opacity-50"/>}
                         </button>
                         {(reg.payment_status === PaymentStatus.PENDING || !reg.payment_status) && (
                           <button onClick={() => handleResendPaymentLink(reg)} disabled={sendingEmail.includes(String(reg.id))} className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1 disabled:opacity-50">
                             {sendingEmail.includes(String(reg.id)) ? <Loader2 size={10} className="animate-spin"/> : <Send size={10}/>} 重寄連結
                           </button>
                         )}
                       </div>
                     </td>
                     <td className="p-4">
                       <span className="text-xs text-gray-500">{translatePaymentMethod(reg.payment_method)}</span>
                     </td>
                     <td className="p-4 font-mono text-gray-600">NT$ {reg.paid_amount}</td>
                     <td className="p-4 text-right">
                       {reg.payment_status === PaymentStatus.PAID && (
                         <button
                           onClick={() => {
                             const orderNo = reg.merchant_order_no || `MANUAL_${reg.id}`;
                             setReceiptData({
                               payerName: name,
                               companyName: company,
                               taxId: reg.tax_id || member?.tax_id || '',
                               amount: reg.paid_amount || 0,
                               paymentMethod: translatePaymentMethod(reg.payment_method),
                               feeType: 'donation',
                               orderNo: orderNo,
                               email: reg.email || member?.email || '',
                               remarks: `活動：${currentActivity?.title || ''}`
                             });
                           }}
                           disabled={(reg.merchant_order_no || `MANUAL_${reg.id}`) ? (receiptMap[reg.merchant_order_no || `MANUAL_${reg.id}`] === 'sent' || receiptMap[reg.merchant_order_no || `MANUAL_${reg.id}`] === 'issued') : false}
                           className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border ${
                             (reg.merchant_order_no || `MANUAL_${reg.id}`) && (receiptMap[reg.merchant_order_no || `MANUAL_${reg.id}`] === 'sent' || receiptMap[reg.merchant_order_no || `MANUAL_${reg.id}`] === 'issued')
                               ? 'bg-green-50 text-green-700 border-green-200 cursor-default'
                               : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                           }`}
                         >
                           {(reg.merchant_order_no || `MANUAL_${reg.id}`) && (receiptMap[reg.merchant_order_no || `MANUAL_${reg.id}`] === 'sent' || receiptMap[reg.merchant_order_no || `MANUAL_${reg.id}`] === 'issued') ? '已開立' : '開立收據'}
                         </button>
                       )}
                     </td>
                   </tr>
                 );
               })}
               {filteredRegs.length === 0 && (
                 <tr>
                   <td colSpan={8} className="p-8 text-center text-gray-400">查無資料，請嘗試其他關鍵字</td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>

         {/* 手機版卡片視圖 */}
         <div className="md:hidden space-y-3">
           {filteredRegs.length > 0 && (
             <label className="flex items-center gap-2 text-sm text-gray-500 px-1">
               <input type="checkbox" checked={selectedRegIds.length === filteredRegs.length && filteredRegs.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
               全選
             </label>
           )}
           {filteredRegs.map((reg: any) => {
             const member = members?.find(m => String(m.id) === String(reg.memberId));
             const name = reg.name || reg.member_name || member?.name || '';
             const phone = reg.phone || member?.phone || '';
             const company = reg.company_title || reg.company || member?.company_title || member?.company || '';
             const title = reg.title || member?.job_title || '';
             const receiptKey = reg.merchant_order_no || `MANUAL_${reg.id}`;
             const receiptIssued = receiptMap[receiptKey] === 'sent' || receiptMap[receiptKey] === 'issued';
             return (
               <div key={reg.id} className={`border rounded-xl p-4 shadow-sm ${reg.check_in_status ? 'border-green-200 bg-green-50/30' : 'border-gray-100'} ${reg.payment_status === 'refunded' ? 'bg-gray-50' : ''}`}>
                 <div className="flex justify-between items-start gap-2">
                   <div className="flex items-start gap-2 min-w-0">
                     <input type="checkbox" checked={selectedRegIds.includes(String(reg.id))} onChange={() => toggleSelectReg(String(reg.id))} className="w-4 h-4 mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500 shrink-0" />
                     <div className="min-w-0">
                       <div className={`font-bold flex items-center gap-2 flex-wrap ${reg.payment_status === 'refunded' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                         {name}
                         {reg.payment_status === 'refunded' && <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded font-bold no-underline">已退費</span>}
                       </div>
                       {phone && <div className="text-sm text-gray-500">{phone}</div>}
                       {(company || title) && <div className="text-xs text-gray-500 mt-0.5">{company}{company && title ? ' / ' : ''}{title}</div>}
                     </div>
                   </div>
                   <div className="text-right shrink-0">
                     <div className="font-mono text-gray-700 text-sm">NT$ {reg.paid_amount}</div>
                     <div className="text-[11px] text-gray-400">{translatePaymentMethod(reg.payment_method)}</div>
                   </div>
                 </div>

                 <div className="mt-3 flex flex-wrap items-center gap-2">
                   <button onClick={() => onUpdateReg({...reg, check_in_status: !reg.check_in_status})} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-sm transition-all active:scale-95 ${reg.check_in_status ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                     {reg.check_in_status ? <CheckCircle size={16}/> : <XCircle size={16}/>} {reg.check_in_status ? '已報到' : '未報到'}
                   </button>
                   <button onClick={() => handlePaymentStatusToggle(reg)} className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-bold transition-colors ${reg.payment_status === PaymentStatus.PAID ? 'bg-green-100 text-green-700' : (reg.payment_status === 'refunded' ? 'bg-gray-200 text-gray-500' : 'bg-yellow-100 text-yellow-700')}`}>
                     {reg.payment_status === PaymentStatus.PAID ? '已付款' : (reg.payment_status === 'refunded' ? '已退費' : '待付款')}
                     {reg.payment_status === PaymentStatus.PAID && <RefreshCcw size={10} className="ml-1 opacity-50"/>}
                     {reg.payment_status === 'refunded' && <Ban size={10} className="ml-1 opacity-50"/>}
                   </button>
                   {(reg.payment_status === PaymentStatus.PENDING || !reg.payment_status) && (
                     <button onClick={() => handleResendPaymentLink(reg)} disabled={sendingEmail.includes(String(reg.id))} className="text-xs text-blue-600 underline flex items-center gap-1 disabled:opacity-50">
                       {sendingEmail.includes(String(reg.id)) ? <Loader2 size={10} className="animate-spin"/> : <Send size={10}/>} 重寄連結
                     </button>
                   )}
                   {reg.payment_status === PaymentStatus.PAID && (
                     <button
                       onClick={() => setReceiptData({ payerName: name, companyName: company, taxId: reg.tax_id || member?.tax_id || '', amount: reg.paid_amount || 0, paymentMethod: translatePaymentMethod(reg.payment_method), feeType: 'donation', orderNo: receiptKey, email: reg.email || member?.email || '', remarks: `活動：${currentActivity?.title || ''}` })}
                       disabled={receiptIssued}
                       className={`px-3 py-2 rounded-lg font-bold text-xs transition-colors border ${receiptIssued ? 'bg-green-50 text-green-700 border-green-200 cursor-default' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                     >
                       {receiptIssued ? '已開立收據' : '開立收據'}
                     </button>
                   )}
                 </div>

                 <div className="mt-3 text-xs text-gray-600 space-y-1 border-t border-gray-100 pt-2">
                   {reg.audience !== 'member_only' && reg.referrer && <div><span className="font-bold text-gray-400">引薦:</span> {reg.referrer}</div>}
                   <div className="flex items-start gap-1"><span className="font-bold text-gray-400 shrink-0">備註:</span> <NotesInput value={reg.notes} onSave={(val) => onUpdateReg({...reg, notes: val})} /></div>
                 </div>
               </div>
             );
           })}
           {filteredRegs.length === 0 && <div className="p-8 text-center text-gray-400">查無資料，請嘗試其他關鍵字</div>}
         </div>
       </div>

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
       {batchReceiptData && (
         <BatchReceiptGenerator
           receiptsToProcess={batchReceiptData}
           onProgress={(current, total) => setBatchProgress({ current, total })}
           onComplete={handleBatchComplete}
         />
       )}
    </div>
  );
};

const MemberManager: React.FC<{ members: Member[]; onAdd: (m: Member) => void; onUpdate: (m: Member) => void; onDelete: (id: string | number) => void; onImport: (ms: Member[]) => void; onAdjustPoints?: (memberId: string, delta: number, reason: string) => Promise<boolean>; onFetchPointsLedger?: (memberId: string) => Promise<PointsLedgerEntry[]> }> = ({ members, onAdd, onUpdate, onDelete, onImport, onAdjustPoints, onFetchPointsLedger }) => {
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // 點數調整 / 明細
  const [pointsDelta, setPointsDelta] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [pointsBusy, setPointsBusy] = useState(false);
  const [ledger, setLedger] = useState<PointsLedgerEntry[]>([]);
  const [showLedger, setShowLedger] = useState(false);

  const loadLedger = async (memberId: string) => {
    if (!onFetchPointsLedger) return;
    setLedger(await onFetchPointsLedger(memberId));
  };

  const handleAdjustPointsClick = async (sign: 1 | -1) => {
    if (!onAdjustPoints || !editingId) return;
    const n = Math.floor(Number(pointsDelta) || 0);
    if (n <= 0) { alert('請輸入大於 0 的點數'); return; }
    if (!pointsReason.trim()) { alert('請填寫調整原因'); return; }
    setPointsBusy(true);
    const ok = await onAdjustPoints(String(editingId), sign * n, pointsReason.trim());
    setPointsBusy(false);
    if (ok) {
      setPointsDelta(''); setPointsReason('');
      setFormData((prev: any) => ({ ...prev, points_balance: (prev.points_balance || 0) + sign * n }));
      loadLedger(String(editingId));
    }
  };
  
  // Payment Records State
  interface PaymentRecord {
    id: number;
    date: string;
    amount: number;
    note: string;
  }
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [newPayment, setNewPayment] = useState({ date: new Date().toISOString().slice(0, 10), amount: 5000, note: '' });

  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [activeRenewalTab, setActiveRenewalTab] = useState<'expiring' | 'expired'>('expiring');
  
  const [sendingRenewal, setSendingRenewal] = useState<string[]>([]);
  
  // LocalStorage logic for sent status
  const [renewalSent, setRenewalSent] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('sent_renewals');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === new Date().toISOString().slice(0, 10)) {
          return parsed.ids || [];
        }
      }
    } catch (e) { console.error(e); }
    return [];
  });

  const expiringMembers = useMemo(() => {
     return members.filter(m => {
        if (!m.membership_expiry_date) return false;
        if (m.status !== 'active') return false; 
        
        const today = new Date();
        const expiry = new Date(m.membership_expiry_date);
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // 放寬範圍：顯示 60 天內到期的會員 (原本是 40~50 天)
        return diffDays > 0 && diffDays <= 60;
     }).sort((a, b) => (a.membership_expiry_date || '').localeCompare(b.membership_expiry_date || ''));
  }, [members]);

  const expiredMembers = useMemo(() => {
     const today = new Date().toISOString().slice(0, 10);
     return members.filter(m => {
        if (!m.membership_expiry_date) return false;
        return m.membership_expiry_date < today;
     }).sort((a, b) => (b.membership_expiry_date || '').localeCompare(a.membership_expiry_date || '')); 
  }, [members]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let active = 0;
    let inactive = 0;
    members.forEach(m => {
       const isExpired = m.membership_expiry_date && m.membership_expiry_date < today;
       if (m.status === 'active' && !isExpired) { active++; } else { inactive++; }
    });
    return { total: members.length, active, inactive };
  }, [members]);

  const filtered = members.filter(m => m.name.includes(searchTerm) || m.member_no.includes(searchTerm) || m.phone?.includes(searchTerm));

  const handleEdit = (m: Member) => { 
      setEditingId(m.id); 
      setFormData({ ...m, member_no: (m.member_no || '').toString().padStart(5, '0') });
      
      // Parse Payment Records
      try {
          const records = typeof m.payment_records === 'string' ? JSON.parse(m.payment_records) : (m.payment_records || []);
          setPaymentRecords(records);
      } catch (e) {
          setPaymentRecords([]);
      }

      // 重置點數調整 UI 並載入明細
      setPointsDelta(''); setPointsReason(''); setShowLedger(false); setLedger([]);
      loadLedger(String(m.id));

      setIsFormOpen(true);
  };

  const handleAdd = () => { 
      setEditingId(null); 
      const maxNo = members.reduce((max, m) => { const num = parseInt(m.member_no); return !isNaN(num) && num > max ? num : max; }, 0); 
      const nextNo = (maxNo + 1).toString().padStart(5, '0'); 
      setFormData({ member_no: nextNo, name: '', status: 'active', industry_category: '其他' }); 
      setPaymentRecords([]);
      setIsFormOpen(true); 
  };

  const handleAddPaymentRecord = () => {
      const record: PaymentRecord = {
          id: Date.now(),
          date: newPayment.date,
          amount: Number(newPayment.amount),
          note: newPayment.note
      };
      const updatedRecords = [...paymentRecords, record];
      setPaymentRecords(updatedRecords);
      // Automatically update formData
      setFormData({ ...formData, payment_records: JSON.stringify(updatedRecords) });
      // Reset input
      setNewPayment({ date: new Date().toISOString().slice(0, 10), amount: 5000, note: '' });
  };

  const handleDeletePaymentRecord = (id: number) => {
      const updatedRecords = paymentRecords.filter(r => r.id !== id);
      setPaymentRecords(updatedRecords);
      setFormData({ ...formData, payment_records: JSON.stringify(updatedRecords) });
  };

  const totalPaymentAmount = useMemo(() => {
      return paymentRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [paymentRecords]);

  const handleSave = (e: React.FormEvent) => { e.preventDefault(); if (editingId) onUpdate(formData); else onAdd(formData); setIsFormOpen(false); };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const file = e.target.files?.[0]; 
    if (!file) return; 
    const reader = new FileReader(); 
    reader.onload = (evt) => { 
      const arrayBuffer = evt.target?.result; 
      const wb = XLSX.read(arrayBuffer, { type: 'array' }); 
      const wsname = wb.SheetNames[0]; 
      const ws = wb.Sheets[wsname]; 
      const data = XLSX.utils.sheet_to_json(ws) as any[]; 
      const newMembers = data.map((row: any) => ({ 
        id: crypto.randomUUID(), 
        member_no: String(row['會員編號'] || ''), 
        name: row['姓名'], 
        industry_category: row['產業分類'] || '其他', 
        brand_name: row['品牌名稱'] || row['公司名稱'], 
        phone: String(row['手機'] || ''), 
        status: 'active' as const 
      })); 
      onImport(newMembers); 
    }; 
    reader.readAsArrayBuffer(file); 
  };
  const handleExport = () => { 
    const exportData = members.map(m => ({ 
      '會員編號': (m.member_no || '').toString().padStart(5, '0'), 
      '姓名': m.name, 
      '狀態': (m.status === 'active' && (!m.membership_expiry_date || m.membership_expiry_date >= new Date().toISOString().slice(0, 10))) ? '有效' : '失效', 
      '會籍到期日': m.membership_expiry_date, 
      '手機': m.phone, 
      '信箱': m.email, 
      '身分證字號': m.id_number,
      '生日': m.birthday,
      '室內電話': m.home_phone,
      '通訊地址': m.address,
      '產業分類': m.industry_category, 
      '品牌名稱': m.brand_name, 
      '公司抬頭': m.company_title, 
      '統一編號': m.tax_id, 
      '職稱': m.job_title, 
      '主要服務': m.main_service, 
      '公司網站': m.website, 
      '引薦人': m.referrer,
      '加入日期': m.join_date,
      '退出日期': m.quit_date,
      '備註': m.notes,
      '繳費紀錄': typeof m.payment_records === 'string' ? m.payment_records : JSON.stringify(m.payment_records || [])
    })); 
    const ws = XLSX.utils.json_to_sheet(exportData); 
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "會員資料"); 
    XLSX.writeFile(wb, `會員名單_${new Date().toISOString().split('T')[0]}.xlsx`); 
  };

  const handleSendRenewalNotice = async (member: Member, type: 'renewal' | 'wakeup') => {
    if (!member.email) {
      alert(`會員 ${member.name} 未填寫 Email，無法發送`);
      return;
    }
    if (!EMAIL_CONFIG.RENEWAL_TEMPLATE_ID) {
        alert('尚未設定通知信 Template ID');
        return;
    }
    
    setSendingRenewal(prev => [...prev, String(member.id)]);
    
    try {
        await emailjs.send(
            EMAIL_CONFIG.SERVICE_ID,
            EMAIL_CONFIG.RENEWAL_TEMPLATE_ID,
            {
                to_name: member.name,
                to_email: member.email,
                expiry_date: member.membership_expiry_date,
                phone: member.phone,
                notice_type: type === 'renewal' ? '續約通知' : '喚醒通知',
            },
            EMAIL_CONFIG.PUBLIC_KEY
        );
        
        setRenewalSent(prev => {
           const updated = [...prev, String(member.id)];
           localStorage.setItem('sent_renewals', JSON.stringify({
              date: new Date().toISOString().slice(0, 10),
              ids: updated
           }));
           return updated;
        });

    } catch (error) {
        console.error('Email Error:', error);
        alert(`發送給 ${member.name} 失敗，請稍後再試。`);
    } finally {
        setSendingRenewal(prev => prev.filter(id => id !== String(member.id)));
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">會員資料庫</h1>
          <div className="flex gap-3">
             <button 
               onClick={() => setShowRenewalModal(true)}
               className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg font-bold hover:bg-yellow-200 flex items-center gap-2 relative"
             >
                <BellRing size={18} /> 會員狀態通知
                {expiringMembers.length > 0 && <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full absolute -top-2 -right-2 border-2 border-white">{expiringMembers.length}</span>}
             </button>
             <button onClick={handleExport} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200"><FileDown size={18} /> 匯出 Excel</button>
             <label className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2 cursor-pointer"><FileUp size={18} /> 匯入 Excel<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload}/></label>
             <button onClick={handleAdd} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2"><Plus size={18} /> 新增會員</button>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"><div><p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">名單總數</p><p className="text-3xl font-bold text-gray-900">{stats.total}<span className="text-sm font-normal text-gray-400 ml-1">人</span></p></div><div className="w-12 h-12 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center"><Users size={24}/></div></div><div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"><div><p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">有效會員</p><p className="text-3xl font-bold text-gray-900">{stats.active}<span className="text-sm font-normal text-gray-400 ml-1">人</span></p></div><div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center"><CheckCircle size={24}/></div></div><div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"><div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">失效會員</p><p className="text-3xl font-bold text-gray-900">{stats.inactive}<span className="text-sm font-normal text-gray-400 ml-1">人</span></p></div><div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center"><XCircle size={24}/></div></div></div>
       
       {showRenewalModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex-shrink-0 bg-white z-10">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2"><BellRing className="text-yellow-500" /> 會員會籍狀態通知</h2>
                            <p className="text-sm text-gray-500 mt-1">請選擇要執行的通知類型</p>
                        </div>
                        <button onClick={() => setShowRenewalModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
                    </div>

                    <div className="flex gap-6">
                        <button 
                            onClick={() => setActiveRenewalTab('expiring')}
                            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeRenewalTab === 'expiring' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            即將到期 (60天內)
                            <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[10px]">{expiringMembers.length}</span>
                        </button>
                        <button 
                            onClick={() => setActiveRenewalTab('expired')}
                            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeRenewalTab === 'expired' ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            已過期 (喚醒)
                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">{expiredMembers.length}</span>
                        </button>
                    </div>
                </div>
                
                <div className="flex-grow overflow-y-auto p-6 bg-gray-50/50">
                    {activeRenewalTab === 'expiring' ? (
                        <>
                            <div className="bg-yellow-50 rounded-xl p-4 mb-6 text-sm text-yellow-800 border border-yellow-100 shadow-sm">
                                <p className="font-bold mb-1 flex items-center gap-2"><AlertCircle size={14}/> 說明：</p>
                                <p>列表顯示即將在 60 天內到期的有效會員。請發送續約通知提醒繳費。</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-4 bg-gray-50">會員姓名</th>
                                            <th className="p-4 bg-gray-50">到期日</th>
                                            <th className="p-4 bg-gray-50">剩餘天數</th>
                                            <th className="p-4 bg-gray-50">Email</th>
                                            <th className="p-4 bg-gray-50 text-right">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {expiringMembers.map(m => {
                                            const daysLeft = Math.ceil((new Date(m.membership_expiry_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                            const isTarget = daysLeft <= 45;
                                            const isSent = renewalSent.includes(String(m.id));
                                            const isSending = sendingRenewal.includes(String(m.id));

                                            return (
                                                <tr key={m.id} className={`hover:bg-gray-50 ${isTarget ? 'bg-yellow-50/50' : ''}`}>
                                                    <td className="p-4 font-bold">{m.name}</td>
                                                    <td className="p-4 font-mono">{m.membership_expiry_date}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${isTarget ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'}`}>
                                                            {daysLeft} 天
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-gray-500 text-xs">{m.email || <span className="text-red-400">未填寫</span>}</td>
                                                    <td className="p-4 text-right">
                                                        {isSent ? (
                                                            <span className="text-green-600 font-bold flex items-center justify-end gap-1"><CheckCircle size={16} /> 已發送</span>
                                                        ) : (
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleSendRenewalNotice(m, 'renewal')} 
                                                                disabled={isSending || !m.email}
                                                                className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1 ml-auto shadow-sm"
                                                            >
                                                                {isSending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} 
                                                                發送通知
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {expiringMembers.length === 0 && (
                                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">目前沒有 60 天內到期的會員</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-600 border border-gray-200 shadow-sm">
                                <p className="font-bold mb-1 flex items-center gap-2"><RefreshCcw size={14}/> 說明：</p>
                                <p>列表顯示會籍已過期的會員。您可以發送喚醒通知，邀請他們重新加入。</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-4 bg-gray-50">會員姓名</th>
                                            <th className="p-4 bg-gray-50">到期日</th>
                                            <th className="p-4 bg-gray-50">過期天數</th>
                                            <th className="p-4 bg-gray-50">Email</th>
                                            <th className="p-4 bg-gray-50 text-right">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {expiredMembers.map(m => {
                                            const daysOverdue = Math.abs(Math.ceil((new Date(m.membership_expiry_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                                            const isSent = renewalSent.includes(String(m.id));
                                            const isSending = sendingRenewal.includes(String(m.id));

                                            return (
                                                <tr key={m.id} className="hover:bg-gray-50">
                                                    <td className="p-4 font-bold">{m.name}</td>
                                                    <td className="p-4 font-mono text-red-500">{m.membership_expiry_date}</td>
                                                    <td className="p-4">
                                                        <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-bold">
                                                            已過期 {daysOverdue} 天
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-gray-500 text-xs">{m.email || <span className="text-red-400">未填寫</span>}</td>
                                                    <td className="p-4 text-right">
                                                        {isSent ? (
                                                            <span className="text-green-600 font-bold flex items-center justify-end gap-1"><CheckCircle size={16} /> 已發送</span>
                                                        ) : (
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleSendRenewalNotice(m, 'wakeup')} 
                                                                disabled={isSending || !m.email}
                                                                className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-900 disabled:opacity-50 flex items-center gap-1 ml-auto shadow-sm"
                                                            >
                                                                {isSending ? <Loader2 className="animate-spin" size={14} /> : <BellRing size={14} />} 
                                                                發送喚醒通知
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {expiredMembers.length === 0 && (
                                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">目前沒有已過期的會員</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
         </div>
       )}

       {isFormOpen && (
       <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-3xl rounded-2xl p-8 max-h-[90vh] overflow-y-auto">
               <h2 className="text-2xl font-bold mb-6">{editingId ? '編輯會員' : '新增會員'}</h2>
               <form onSubmit={handleSave} className="space-y-6">
                   <div>
                       <h3 className="text-sm font-bold text-gray-500 mb-3 border-b pb-1">基本資料</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div><label className="block text-sm font-bold mb-1">會員編號 (自動產生)</label><input type="text" value={formData.member_no} readOnly className="w-full p-2 border rounded outline-none bg-gray-100 text-gray-500 cursor-not-allowed"/></div>
                           <div><label className="block text-sm font-bold mb-1">姓名</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"/></div>
                           <div><label className="block text-sm font-bold mb-1">身分證字號</label><input type="text" value={formData.id_number || ''} onChange={e => setFormData({...formData, id_number: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"/></div>
                           <div><label className="block text-sm font-bold mb-1">生日</label><input type="date" value={formData.birthday || ''} onChange={e => setFormData({...formData, birthday: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"/></div>
                           <div><label className="block text-sm font-bold mb-1">引薦人</label><input type="text" value={formData.referrer || ''} onChange={e => setFormData({...formData, referrer: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"/></div>
                       </div>
                   </div>
                   
                   <div>
                       <h3 className="text-sm font-bold text-gray-500 mb-3 border-b pb-1">聯絡方式</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div><label className="block text-sm font-bold mb-1">手機</label><input type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"/></div>
                           <div><label className="block text-sm font-bold mb-1">信箱</label><input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"/></div>
                           <div><label className="block text-sm font-bold mb-1">室內電話</label><input type="text" value={formData.home_phone || ''} onChange={e => setFormData({...formData, home_phone: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"/></div>
                           <div className="md:col-span-2"><label className="block text-sm font-bold mb-1">通訊地址</label><input type="text" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"/></div>
                       </div>
                   </div>
                   
                   <div>
                       <h3 className="text-sm font-bold text-gray-500 mb-3 border-b pb-1">事業資料</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div><label className="block text-sm font-bold mb-1">產業分類</label><select value={formData.industry_category} onChange={e => setFormData({...formData, industry_category: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500">{IndustryCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                           <div><label className="block text-sm font-bold mb-1">品牌名稱</label><input type="text" value={formData.brand_name || ''} onChange={e => setFormData({...formData, brand_name: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"/></div>
                           <div><label className="block text-sm font-bold mb-1">公司抬頭</label><input type="text" value={formData.company_title || ''} onChange={e => setFormData({...formData, company_title: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"/></div>
                           <div><label className="block text-sm font-bold mb-1">統一編號</label><input type="text" value={formData.tax_id || ''} onChange={e => setFormData({...formData, tax_id: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"/></div>
                           <div><label className="block text-sm font-bold mb-1">職稱</label><input type="text" value={formData.job_title || ''} onChange={e => setFormData({...formData, job_title: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"/></div>
                           <div><label className="block text-sm font-bold mb-1">公司網站</label><input type="text" value={formData.website || ''} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"/></div>
                           <div className="md:col-span-2"><label className="block text-sm font-bold mb-1">主要服務/產品</label><textarea rows={3} value={formData.main_service || ''} onChange={e => setFormData({...formData, main_service: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"></textarea></div>
                       </div>
                   </div>
                   
                   <div>
                       <h3 className="text-sm font-bold text-gray-500 mb-3 border-b pb-1">會籍資料</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div><label className="block text-sm font-bold mb-1">會籍到期日</label><input type="date" value={formData.membership_expiry_date || ''} onChange={e => setFormData({...formData, membership_expiry_date: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"/></div>
                           <div><label className="block text-sm font-bold mb-1">狀態</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"><option value="active">有效</option><option value="inactive">失效</option></select></div>
                           <div className="md:col-span-2"><label className="block text-sm font-bold mb-1">備註</label><textarea rows={2} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-red-500"></textarea></div>
                       </div>
                   </div>

                   {/* 會籍繳費紀錄區塊 */}
                   <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                       <div className="flex items-center justify-between mb-3 border-b border-blue-100 pb-2">
                           <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2"><History size={16} /> 會籍繳費紀錄</h3>
                           <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded">總金額: NT$ {totalPaymentAmount.toLocaleString()}</span>
                       </div>
                       
                       {/* 列表 */}
                       <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                           {paymentRecords.length > 0 ? (
                               <table className="w-full text-xs text-left">
                                   <thead className="text-gray-500 bg-blue-50/50 sticky top-0">
                                       <tr>
                                           <th className="p-2">繳費日期</th>
                                           <th className="p-2">金額</th>
                                           <th className="p-2">備註</th>
                                           <th className="p-2 text-right">操作</th>
                                       </tr>
                                   </thead>
                                   <tbody>
                                       {paymentRecords.map((record) => (
                                           <tr key={record.id} className="border-b border-blue-50 last:border-0 hover:bg-blue-50/80">
                                               <td className="p-2">{record.date}</td>
                                               <td className="p-2 font-mono">NT$ {record.amount}</td>
                                               <td className="p-2 text-gray-500">{record.note || '-'}</td>
                                               <td className="p-2 text-right">
                                                   <button type="button" onClick={() => handleDeletePaymentRecord(record.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                               </td>
                                           </tr>
                                       ))}
                                   </tbody>
                               </table>
                           ) : (
                               <p className="text-center text-gray-400 text-xs py-4">目前尚無繳費紀錄</p>
                           )}
                       </div>

                       {/* 新增表單 */}
                       <div className="bg-white p-3 rounded-lg border border-blue-100 flex flex-wrap gap-2 items-end">
                           <div className="flex-1 min-w-[120px]">
                               <label className="block text-[10px] font-bold text-gray-500 mb-1">日期</label>
                               <input type="date" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} className="w-full p-1.5 border rounded text-xs"/>
                           </div>
                           <div className="w-24">
                               <label className="block text-[10px] font-bold text-gray-500 mb-1">金額</label>
                               <input type="number" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})} className="w-full p-1.5 border rounded text-xs"/>
                           </div>
                           <div className="flex-[2] min-w-[150px]">
                               <label className="block text-[10px] font-bold text-gray-500 mb-1">備註 (選填)</label>
                               <input type="text" value={newPayment.note} onChange={e => setNewPayment({...newPayment, note: e.target.value})} className="w-full p-1.5 border rounded text-xs" placeholder="例：現金/匯款"/>
                           </div>
                           <button type="button" onClick={handleAddPaymentRecord} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1 h-[30px] mb-[1px]">
                               <Plus size={14} /> 新增
                           </button>
                       </div>
                   </div>

                   {/* 點數管理區塊（僅編輯既有會員時可調整） */}
                   {editingId && onAdjustPoints && (
                   <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100">
                       <div className="flex items-center justify-between mb-3 border-b border-amber-100 pb-2">
                           <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2"><Crown size={16} /> 會員點數</h3>
                           <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">目前點數: {(formData.points_balance || 0).toLocaleString()} 點</span>
                       </div>

                       <div className="bg-white p-3 rounded-lg border border-amber-100 flex flex-wrap gap-2 items-end">
                           <div className="w-28">
                               <label className="block text-[10px] font-bold text-gray-500 mb-1">點數</label>
                               <input type="number" min={1} value={pointsDelta} onChange={e => setPointsDelta(e.target.value)} className="w-full p-1.5 border rounded text-xs" placeholder="數量"/>
                           </div>
                           <div className="flex-1 min-w-[150px]">
                               <label className="block text-[10px] font-bold text-gray-500 mb-1">原因</label>
                               <input type="text" value={pointsReason} onChange={e => setPointsReason(e.target.value)} className="w-full p-1.5 border rounded text-xs" placeholder="例：活動贈點 / 修正"/>
                           </div>
                           <button type="button" disabled={pointsBusy} onClick={() => handleAdjustPointsClick(1)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 h-[30px] mb-[1px]"><Plus size={14} /> 加點</button>
                           <button type="button" disabled={pointsBusy} onClick={() => handleAdjustPointsClick(-1)} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 disabled:opacity-50 flex items-center gap-1 h-[30px] mb-[1px]"><X size={14} /> 扣點</button>
                       </div>

                       <button type="button" onClick={() => setShowLedger(s => !s)} className="text-xs font-bold text-amber-700 mt-3 flex items-center gap-1 hover:underline"><History size={14} /> {showLedger ? '收合明細' : `點數明細 (${ledger.length})`}</button>
                       {showLedger && (
                           <div className="mt-2 max-h-48 overflow-y-auto bg-white rounded-lg border border-amber-100">
                               {ledger.length > 0 ? (
                                   <table className="w-full text-xs text-left">
                                       <thead className="text-gray-500 bg-amber-50/50 sticky top-0"><tr><th className="p-2">時間</th><th className="p-2">類型</th><th className="p-2 text-right">異動</th><th className="p-2 text-right">餘額</th><th className="p-2">原因</th></tr></thead>
                                       <tbody>
                                           {ledger.map(l => (
                                               <tr key={l.id} className="border-b border-amber-50 last:border-0">
                                                   <td className="p-2 text-gray-400 whitespace-nowrap">{(l.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                                                   <td className="p-2">{({ earn: '賺取', freeze: '預扣', redeem: '核銷', refund: '回補', adjust: '調整' } as Record<string, string>)[l.type] || l.type}</td>
                                                   <td className={`p-2 text-right font-mono font-bold ${l.change > 0 ? 'text-green-600' : l.change < 0 ? 'text-red-500' : 'text-gray-400'}`}>{l.change > 0 ? `+${l.change}` : l.change}</td>
                                                   <td className="p-2 text-right font-mono text-gray-500">{l.balance_after ?? '-'}</td>
                                                   <td className="p-2 text-gray-500">{l.reason || '-'}{l.created_by ? ` (${l.created_by})` : ''}</td>
                                               </tr>
                                           ))}
                                       </tbody>
                                   </table>
                               ) : <p className="text-center text-gray-400 text-xs py-4">尚無點數異動紀錄</p>}
                           </div>
                       )}
                   </div>
                   )}

                   <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white pb-2">
                       <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600 font-bold hover:bg-gray-200">取消</button>
                       <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200">儲存資料</button>
                   </div>
               </form>
           </div>
       </div>
       )}
       <div className="bg-white p-6 rounded-2xl border border-gray-100"><div className="mb-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="搜尋會員 (姓名、編號、電話)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"/></div><div className="hidden md:block overflow-x-auto"><table className="w-full text-left border-collapse text-sm"><thead><tr className="bg-gray-50 text-gray-500"><th className="p-3">編號</th><th className="p-3">姓名</th><th className="p-3">品牌/職稱</th><th className="p-3">效期</th><th className="p-3">狀態</th><th className="p-3">操作</th></tr></thead><tbody className="divide-y">{filtered.map(m => { const isExpired = m.membership_expiry_date && m.membership_expiry_date < new Date().toISOString().slice(0, 10); const displayStatus = (m.status === 'active' && !isExpired) ? 'active' : 'inactive'; return (<tr key={m.id} className="hover:bg-gray-50"><td className="p-3 font-mono text-gray-500">{(m.member_no || '').toString().padStart(5, '0')}</td><td className="p-3 font-bold">{m.name}</td><td className="p-3"><div>{m.company_title || m.brand_name || m.company}</div><div className="text-xs text-gray-400">{m.job_title}</div></td><td className="p-3">{m.membership_expiry_date || '-'}</td><td className="p-3">{displayStatus === 'active' ? (<span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">有效</span>) : (<span className="bg-gray-200 text-gray-500 px-2 py-1 rounded text-xs font-bold">失效</span>)}</td><td className="p-3 flex gap-2"><button onClick={() => handleEdit(m)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button><button onClick={() => {if(confirm('確定刪除此會員？')) onDelete(m.id)}} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button></td></tr>); })}{filtered.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-400">無相符資料</td></tr>}</tbody></table></div><div className="md:hidden space-y-3">{filtered.map(m => { const isExpired = m.membership_expiry_date && m.membership_expiry_date < new Date().toISOString().slice(0, 10); const displayStatus = (m.status === 'active' && !isExpired) ? 'active' : 'inactive'; return (<div key={m.id} className="border border-gray-100 rounded-xl p-4 shadow-sm"><div className="flex justify-between items-start gap-2"><div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-gray-900">{m.name}</span>{displayStatus === 'active' ? (<span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold shrink-0">有效</span>) : (<span className="bg-gray-200 text-gray-500 px-2 py-0.5 rounded text-xs font-bold shrink-0">失效</span>)}</div><p className="text-xs font-mono text-gray-400 mt-0.5">#{(m.member_no || '').toString().padStart(5, '0')}</p></div><div className="flex gap-1 shrink-0"><button onClick={() => handleEdit(m)} className="text-blue-600 hover:bg-blue-50 p-2 rounded" aria-label="編輯"><Edit size={18}/></button><button onClick={() => {if(confirm('確定刪除此會員？')) onDelete(m.id)}} className="text-red-600 hover:bg-red-50 p-2 rounded" aria-label="刪除"><Trash2 size={18}/></button></div></div><div className="mt-2 text-sm text-gray-600">{m.company_title || m.brand_name || m.company || '-'}{m.job_title && <span className="text-gray-400"> · {m.job_title}</span>}</div><div className="mt-1 text-xs text-gray-400">效期：{m.membership_expiry_date || '-'}</div></div>); })}{filtered.length === 0 && <div className="p-6 text-center text-gray-400">無相符資料</div>}</div></div>
    </div>
  );
};

const CouponManager: React.FC<{
  coupons: Coupon[];
  activities: Activity[];
  memberActivities: MemberActivity[];
  members: Member[];
  onGenerate?: (activityId: string, amount: number, memberIds: string[], sendEmail: boolean, note?: string) => void;
  onGenerateVip?: (activityId: string, count: number, note?: string) => Promise<Coupon[]>;
}> = ({ coupons, activities, memberActivities, members, onGenerate, onGenerateVip }) => {
  const [amount, setAmount] = useState(100);
  const [actId, setActId] = useState('');
  const [target, setTarget] = useState('all');
  const [note, setNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // VIP 免費邀請
  const [vipActId, setVipActId] = useState('');
  const [vipCount, setVipCount] = useState(1);
  const [vipNote, setVipNote] = useState('');
  const [vipGenerating, setVipGenerating] = useState(false);
  const [vipResult, setVipResult] = useState<Coupon[]>([]);
  const [copiedCode, setCopiedCode] = useState('');

  const allActs = [...activities, ...memberActivities].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const vipLink = (c: Coupon) => `${window.location.origin}/#/activity/${c.activity_id}?c=${c.code}`;
  const copyLink = async (c: Coupon) => {
    try { await navigator.clipboard.writeText(vipLink(c)); setCopiedCode(c.code); setTimeout(() => setCopiedCode(''), 2000); }
    catch { alert('複製失敗，請手動複製：' + vipLink(c)); }
  };

  const handleGenerate = () => {
     if(!onGenerate) return;
     if(!actId) { alert('請選擇活動'); return; }
     setIsGenerating(true);
     const memberIds = target === 'all' ? members.filter(m => m.status === 'active').map(m => String(m.id)) : [target];
     onGenerate(actId, amount, memberIds, false, note.trim() || undefined);
     setNote('');
     setIsGenerating(false);
  };

  const handleGenerateVip = async () => {
     if(!onGenerateVip) return;
     if(!vipActId) { alert('請選擇活動'); return; }
     if(vipCount < 1 || vipCount > 100) { alert('數量請介於 1~100'); return; }
     setVipGenerating(true);
     const created = await onGenerateVip(vipActId, vipCount, vipNote.trim() || undefined);
     setVipResult(created);
     setVipGenerating(false);
  };

  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-bold">折扣券管理</h1>

       {/* VIP 免費邀請 */}
       <div className="bg-amber-50/60 p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2 text-amber-800"><Crown size={18} /> VIP 免費邀請連結</h3>
          <p className="text-sm text-amber-700/80">為特殊嘉賓產生免費報名連結。每條連結單次使用，嘉賓開啟後自動套用、免付款（仍需填寫報名資料）。</p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
             <div className="lg:col-span-2"><label className="block text-sm font-bold mb-1">選擇活動</label><select className="w-full p-2 border rounded" value={vipActId} onChange={e=>setVipActId(e.target.value)}><option value="">請選擇...</option>{allActs.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></div>
             <div><label className="block text-sm font-bold mb-1">產生數量</label><input type="number" min={1} max={100} className="w-full p-2 border rounded" value={vipCount} onChange={e=>setVipCount(Number(e.target.value))} /></div>
             <div className="flex items-end"><button onClick={handleGenerateVip} disabled={vipGenerating} className="w-full bg-amber-600 text-white p-2 rounded font-bold hover:bg-amber-700 disabled:opacity-50">{vipGenerating ? '處理中...' : '產生邀請連結'}</button></div>
             <div className="md:col-span-3 lg:col-span-4"><label className="block text-sm font-bold mb-1">備註（選填，記錄發送對象 / 原因）</label><input type="text" className="w-full p-2 border rounded" value={vipNote} onChange={e=>setVipNote(e.target.value)} placeholder="例：受邀講者 王大明、贊助商代表" /></div>
          </div>
          {vipResult.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-100 p-3 space-y-2">
              <p className="text-xs font-bold text-amber-700">已產生 {vipResult.length} 條連結，請複製後分送給嘉賓：</p>
              {vipResult.map(c => (
                <div key={c.code} className="flex items-center gap-2">
                  <input readOnly value={vipLink(c)} className="flex-grow px-2 py-1.5 rounded border border-gray-200 bg-gray-50 text-xs font-mono text-gray-600" onFocus={e=>e.target.select()} />
                  <button type="button" onClick={()=>copyLink(c)} className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap ${copiedCode===c.code ? 'bg-green-100 text-green-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>{copiedCode===c.code ? '已複製' : '複製'}</button>
                </div>
              ))}
            </div>
          )}
       </div>

       <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-lg">產生折扣券</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <div><label className="block text-sm font-bold mb-1">選擇活動</label><select className="w-full p-2 border rounded" value={actId} onChange={e=>setActId(e.target.value)}><option value="">請選擇...</option>{allActs.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></div>
             <div><label className="block text-sm font-bold mb-1">折扣金額</label><input type="number" className="w-full p-2 border rounded" value={amount} onChange={e=>setAmount(Number(e.target.value))} /></div>
             <div><label className="block text-sm font-bold mb-1">發送對象</label><select className="w-full p-2 border rounded" value={target} onChange={e=>setTarget(e.target.value)}><option value="all">全體有效會員</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
             <div className="flex items-end"><button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-red-600 text-white p-2 rounded font-bold hover:bg-red-700">{isGenerating ? '處理中' : '產生折扣券'}</button></div>
             <div className="md:col-span-2 lg:col-span-4"><label className="block text-sm font-bold mb-1">備註（選填，記錄發送對象 / 原因）</label><input type="text" className="w-full p-2 border rounded" value={note} onChange={e=>setNote(e.target.value)} placeholder="例：年度貴賓、合作夥伴優惠" /></div>
          </div>
       </div>
       <div className="bg-white p-6 rounded-2xl border border-gray-100">
         <h3 className="font-bold text-lg mb-4">折扣券列表 ({coupons.length})</h3>
         <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead><tr className="bg-gray-50"><th className="p-3">代碼</th><th className="p-3">活動</th><th className="p-3">類型 / 金額</th><th className="p-3">備註</th><th className="p-3">狀態</th><th className="p-3">操作</th></tr></thead>
               <tbody>
                  {coupons.slice(0, 50).map(c => {
                    const act = allActs.find(a => String(a.id) === String(c.activity_id));
                    return (
                      <tr key={c.id} className="border-b">
                         <td className="p-3 font-mono">{c.code}</td>
                         <td className="p-3">{act?.title || c.activity_id}</td>
                         <td className="p-3">{c.is_free ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">VIP 免費</span> : `NT$ ${c.discount_amount}`}</td>
                         <td className="p-3 text-gray-500 max-w-[200px] truncate" title={c.note || ''}>{c.note || '—'}</td>
                         <td className="p-3">{c.is_used ? '已使用' : '未使用'}</td>
                         <td className="p-3">{c.is_free && !c.is_used && <button type="button" onClick={()=>copyLink(c)} className={`px-2 py-1 rounded text-xs font-bold ${copiedCode===c.code ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>{copiedCode===c.code ? '已複製' : '複製連結'}</button>}</td>
                      </tr>
                    )
                  })}
               </tbody>
            </table>
         </div>
         {/* 手機版卡片視圖 */}
         <div className="md:hidden space-y-2">
            {coupons.slice(0, 50).map(c => {
              const act = allActs.find(a => String(a.id) === String(c.activity_id));
              return (
                <div key={c.id} className="border border-gray-100 rounded-xl p-3 flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-gray-900">{c.code}</div>
                    <div className="text-xs text-gray-500 truncate">{act?.title || c.activity_id}</div>
                    <div className="text-xs text-gray-400">{c.is_free ? 'VIP 免費邀請' : `折抵 NT$ ${c.discount_amount}`}</div>
                    {c.note && <div className="text-xs text-gray-500 mt-0.5 truncate">備註：{c.note}</div>}
                    {c.is_free && !c.is_used && <button type="button" onClick={()=>copyLink(c)} className={`mt-1 px-2 py-1 rounded text-xs font-bold ${copiedCode===c.code ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{copiedCode===c.code ? '已複製連結' : '複製邀請連結'}</button>}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold shrink-0 ${c.is_used ? 'bg-gray-200 text-gray-500' : (c.is_free ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700')}`}>{c.is_used ? '已使用' : '未使用'}</span>
                </div>
              );
            })}
            {coupons.length === 0 && <div className="p-6 text-center text-gray-400">尚無折扣券</div>}
         </div>
       </div>
    </div>
  );
};

const FinancialManager: React.FC<{
  records: FinancialRecord[];
  onAdd: (r: FinancialRecord) => void;
  onUpdate: (r: FinancialRecord) => void;
  onDelete: (id: string | number) => void;
  onUploadImage: (file: File) => Promise<string>;
}> = ({ records, onAdd, onUpdate, onDelete, onUploadImage }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Partial<FinancialRecord>>({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | FinancialType>('all');

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesMonth = r.date.startsWith(selectedMonth);
      const matchesType = filterType === 'all' || r.type === filterType;
      const matchesSearch = 
        r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.party?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (r.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (r.invoice_no?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      return matchesMonth && matchesType && matchesSearch;
    });
  }, [records, selectedMonth, filterType, searchTerm]);

  const monthlySummary = useMemo(() => {
    const monthRecords = records.filter(r => r.date.startsWith(selectedMonth));
    const income = monthRecords.filter(r => r.type === FinancialType.INCOME).reduce((sum, r) => sum + r.amount, 0);
    const expense = monthRecords.filter(r => r.type === FinancialType.EXPENSE).reduce((sum, r) => sum + r.amount, 0);
    return { income, expense, profit: income - expense };
  }, [records, selectedMonth]);

  const totalBalance = useMemo(() => {
    const income = records.filter(r => r.type === FinancialType.INCOME).reduce((sum, r) => sum + r.amount, 0);
    const expense = records.filter(r => r.type === FinancialType.EXPENSE).reduce((sum, r) => sum + r.amount, 0);
    return income - expense;
  }, [records]);

  const handleSave = () => {
    if (!currentRecord.date || !currentRecord.type || !currentRecord.category || !currentRecord.amount) {
      alert('請填寫完整資訊');
      return;
    }
    if (currentRecord.id) {
      onUpdate(currentRecord as FinancialRecord);
    } else {
      onAdd({ ...currentRecord, id: crypto.randomUUID() } as FinancialRecord);
    }
    setIsEditing(false);
    setCurrentRecord({});
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = await onUploadImage(e.target.files[0]);
      if (url) setCurrentRecord({ ...currentRecord, receipt_url: url });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">收支管理</h2>
        <div className="flex gap-4">
          <input 
            type="month" 
            className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
          <button onClick={() => { setIsEditing(true); setCurrentRecord({ date: new Date().toISOString().split('T')[0], type: FinancialType.INCOME }); }} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-all">
            <Plus size={18} /> 新增記錄
          </button>
        </div>
      </div>

      {/* Monthly P&L Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-bold mb-1">本月總收入</p>
          <p className="text-xl font-bold text-emerald-600">${monthlySummary.income.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-bold mb-1">本月總支出</p>
          <p className="text-xl font-bold text-red-600">${monthlySummary.expense.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-bold mb-1">本月淨損益</p>
          <p className={`text-xl font-bold ${monthlySummary.profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            ${monthlySummary.profit.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-sm text-white">
          <p className="text-xs text-gray-400 font-bold mb-1">目前總餘額</p>
          <p className={`text-xl font-bold ${totalBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${totalBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="搜尋類別、對象、描述..."
              className="pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500 w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">全部類型</option>
            <option value={FinancialType.INCOME}>收入</option>
            <option value={FinancialType.EXPENSE}>支出</option>
          </select>
        </div>
        <div className="text-sm text-gray-500 font-medium">
          顯示 {filteredRecords.length} 筆記錄
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-4">日期</th>
              <th className="p-4">類型</th>
              <th className="p-4">類別</th>
              <th className="p-4">對象</th>
              <th className="p-4">發票編號</th>
              <th className="p-4">金額</th>
              <th className="p-4">單據</th>
              <th className="p-4">描述</th>
              <th className="p-4">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">本月尚無記錄</td></tr>
            ) : (
              filteredRecords.map(r => (
                <tr key={r.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-4">{r.date}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${r.type === FinancialType.INCOME ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {r.type === FinancialType.INCOME ? '收入' : '支出'}
                    </span>
                  </td>
                  <td className="p-4">{r.category}</td>
                  <td className="p-4 text-gray-700 font-medium">{r.party || '-'}</td>
                  <td className="p-4 text-gray-500 font-mono text-xs">{r.invoice_no || '-'}</td>
                  <td className="p-4 font-bold">${r.amount.toLocaleString()}</td>
                  <td className="p-4">
                    {r.receipt_url ? (
                      <a href={r.receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-bold">
                        <ImageIcon size={14} /> 查看
                      </a>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-500 truncate max-w-[200px]">{r.description || '-'}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => { setIsEditing(true); setCurrentRecord(r); }} className="p-1 text-gray-400 hover:text-red-600"><Edit2 size={16} /></button>
                      <button onClick={() => { if (confirm('確定刪除此記錄？')) onDelete(r.id); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* 手機版卡片視圖 */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-400">本月尚無記錄</div>
          ) : (
            filteredRecords.map(r => (
              <div key={r.id} className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${r.type === FinancialType.INCOME ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{r.type === FinancialType.INCOME ? '收入' : '支出'}</span>
                      <span className="font-bold text-gray-900">{r.category}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{r.date}{r.party ? ` · ${r.party}` : ''}</div>
                  </div>
                  <div className={`font-bold shrink-0 ${r.type === FinancialType.INCOME ? 'text-emerald-700' : 'text-red-600'}`}>${r.amount.toLocaleString()}</div>
                </div>
                {(r.invoice_no || r.description) && <div className="mt-1 text-xs text-gray-500">{r.invoice_no ? `發票 ${r.invoice_no}` : ''}{r.invoice_no && r.description ? ' · ' : ''}{r.description || ''}</div>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  {r.receipt_url ? (
                    <a href={r.receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-bold"><ImageIcon size={14} /> 查看單據</a>
                  ) : <span className="text-gray-300 text-xs">無單據</span>}
                  <div className="flex gap-1">
                    <button onClick={() => { setIsEditing(true); setCurrentRecord(r); }} className="p-2 text-gray-400 hover:text-red-600" aria-label="編輯"><Edit2 size={16} /></button>
                    <button onClick={() => { if (confirm('確定刪除此記錄？')) onDelete(r.id); }} className="p-2 text-gray-400 hover:text-red-600" aria-label="刪除"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">{currentRecord.id ? '編輯收支' : '新增收支'}</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">日期</label>
                  <input type="date" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" value={currentRecord.date || ''} onChange={e => setCurrentRecord({ ...currentRecord, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">類型</label>
                  <select className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" value={currentRecord.type || ''} onChange={e => setCurrentRecord({ ...currentRecord, type: e.target.value as FinancialType })}>
                    <option value={FinancialType.INCOME}>收入</option>
                    <option value={FinancialType.EXPENSE}>支出</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">類別</label>
                <input type="text" placeholder="例如：會費、場地費、餐費..." className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" value={currentRecord.category || ''} onChange={e => setCurrentRecord({ ...currentRecord, category: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">收支對象 (選填)</label>
                <input type="text" placeholder="例如：廠商名稱、會員姓名..." className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" value={currentRecord.party || ''} onChange={e => setCurrentRecord({ ...currentRecord, party: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">發票編號 (選填)</label>
                <input type="text" placeholder="例如：AB-12345678" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" value={currentRecord.invoice_no || ''} onChange={e => setCurrentRecord({ ...currentRecord, invoice_no: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">金額</label>
                <input type="number" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" value={currentRecord.amount || ''} onChange={e => setCurrentRecord({ ...currentRecord, amount: parseInt(e.target.value) })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">單據上傳 (選填)</label>
                <div className="flex items-center gap-4">
                  {currentRecord.receipt_url && (
                    <a href={currentRecord.receipt_url} target="_blank" rel="noreferrer" className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border block hover:opacity-80 transition-opacity">
                      {currentRecord.receipt_url.toLowerCase().endsWith('.pdf') ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-red-500 bg-red-50">
                          <span className="font-bold text-xs mt-1">PDF</span>
                        </div>
                      ) : (
                        <img src={currentRecord.receipt_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )}
                    </a>
                  )}
                  <label className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 flex items-center gap-2 text-sm">
                    <UploadCloud size={18} /> 上傳單據
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleImageChange} />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">描述 (選填)</label>
                <textarea className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500 min-h-[80px]" value={currentRecord.description || ''} onChange={e => setCurrentRecord({ ...currentRecord, description: e.target.value })} />
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">取消</button>
              <button onClick={handleSave} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg shadow-red-100">儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MilestoneManager: React.FC<{
  milestones: Milestone[];
  onAdd: (m: Milestone) => void;
  onUpdate: (m: Milestone) => void;
  onDelete: (id: string | number) => void;
  onUploadImage: (file: File) => Promise<string>;
}> = ({ milestones, onAdd, onUpdate, onDelete, onUploadImage }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<Partial<Milestone>>({});
  const [search, setSearch] = useState('');

  const filtered = milestones.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));

  const handleSave = () => {
    if (!currentMilestone.title || !currentMilestone.date) {
      alert('請填寫標題與日期');
      return;
    }
    if (currentMilestone.id) {
      onUpdate(currentMilestone as Milestone);
    } else {
      onAdd({ ...currentMilestone, id: crypto.randomUUID() } as Milestone);
    }
    setIsEditing(false);
    setCurrentMilestone({});
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = await onUploadImage(e.target.files[0]);
      if (url) setCurrentMilestone({ ...currentMilestone, picture: url });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">大事記管理</h2>
        <button onClick={() => { setIsEditing(true); setCurrentMilestone({ date: new Date().toISOString().split('T')[0] }); }} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-all">
          <Plus size={18} /> 新增記錄
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
        <Search className="text-gray-400" size={20} />
        <input type="text" placeholder="搜尋標題..." className="flex-grow outline-none text-gray-700" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(m => (
          <div key={m.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
            <div className="relative h-40 bg-gray-100">
              {m.picture ? (
                <img src={m.picture} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={40} /></div>
              )}
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={() => { setIsEditing(true); setCurrentMilestone(m); }} className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm hover:bg-white transition-colors text-gray-600"><Edit2 size={16} /></button>
                <button onClick={() => { if (confirm('確定刪除此記錄？')) onDelete(m.id); }} className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-sm hover:bg-white transition-colors text-red-500"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 text-red-600 font-bold text-xs mb-1"><Calendar size={14} /> {m.date}</div>
              <h3 className="font-bold text-gray-900 line-clamp-1">{m.title}</h3>
              {m.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{m.description}</p>}
            </div>
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">{currentMilestone.id ? '編輯記錄' : '新增記錄'}</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-bold text-gray-700 mb-1">標題</label><input type="text" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" value={currentMilestone.title || ''} onChange={e => setCurrentMilestone({ ...currentMilestone, title: e.target.value })} /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">日期</label><input type="date" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" value={currentMilestone.date || ''} onChange={e => setCurrentMilestone({ ...currentMilestone, date: e.target.value })} /></div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">圖片</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border">
                    {currentMilestone.picture ? <img src={currentMilestone.picture} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={24} /></div>}
                  </div>
                  <label className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 flex items-center gap-2 text-sm">
                    <UploadCloud size={18} /> 上傳圖片
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                </div>
              </div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">描述 (選填)</label><textarea className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-red-500 min-h-[100px]" value={currentMilestone.description || ''} onChange={e => setCurrentMilestone({ ...currentMilestone, description: e.target.value })} /></div>
            </div>
            <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">取消</button>
              <button onClick={handleSave} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg shadow-red-100">儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UserManager: React.FC<{
  users: AdminUser[];
  onAdd: (u: AdminUser) => Promise<boolean>;
  onDelete: (id: string) => void;
}> = ({ users, onAdd, onDelete }) => {
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', password: '', role: UserRole.STAFF });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const ok = await onAdd({ ...newUser, id: crypto.randomUUID() } as any);
    setSubmitting(false);
    if (ok) setNewUser({ name: '', email: '', phone: '', password: '', role: UserRole.STAFF });
  };

  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-bold">帳號權限管理</h1>
       <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-wrap gap-4 items-end">
          <div><label className="block text-xs font-bold mb-1">姓名</label><input required className="border rounded p-2 text-sm" value={newUser.name} onChange={e=>setNewUser({...newUser, name: e.target.value})} /></div>
          <div><label className="block text-xs font-bold mb-1">Email (登入用)</label><input required type="email" className="border rounded p-2 text-sm" value={newUser.email} onChange={e=>setNewUser({...newUser, email: e.target.value})} /></div>
          <div><label className="block text-xs font-bold mb-1">初始密碼 (至少 6 碼)</label><input required type="text" minLength={6} placeholder="提供給新管理員登入" className="border rounded p-2 text-sm" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} /></div>
          <div><label className="block text-xs font-bold mb-1">權限</label><select className="border rounded p-2 text-sm" value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value as UserRole})}>{Object.values(UserRole).map(r=><option key={r} value={r}>{r}</option>)}</select></div>
          <button disabled={submitting} className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 disabled:opacity-50">{submitting ? '處理中…' : '新增管理員'}</button>
       </form>
       <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
             <thead><tr className="bg-gray-50"><th className="p-4">姓名</th><th className="p-4">權限</th><th className="p-4">操作</th></tr></thead>
             <tbody>
                {users.map(u => (
                   <tr key={u.id} className="border-t">
                      <td className="p-4">{u.name}</td>
                      <td className="p-4">{u.role}</td>
                      <td className="p-4"><button onClick={()=>onDelete(u.id)} className="text-red-600 hover:underline">刪除</button></td>
                   </tr>
                ))}
             </tbody>
          </table>
          </div>
          {/* 手機版卡片視圖 */}
          <div className="md:hidden divide-y divide-gray-100">
             {users.map(u => (
                <div key={u.id} className="p-4 flex justify-between items-center gap-2">
                   <div className="min-w-0">
                      <div className="font-bold text-gray-900">{u.name}</div>
                      <div className="text-xs text-gray-500">{u.role}</div>
                   </div>
                   <button onClick={()=>onDelete(u.id)} className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded text-sm font-bold shrink-0">刪除</button>
                </div>
             ))}
             {users.length === 0 && <div className="p-6 text-center text-gray-400">尚無管理員</div>}
          </div>
       </div>
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  const { currentUser, onLogout, memberApplications, onRefreshRegistrations } = props;
  const pendingCount = memberApplications.filter(m => m.status === 'pending').length;
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // 路由切換時自動關閉手機側邊選單
  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  // 切到「活動管理」/「報到管理」tab 時自動重新拉取 registrations，
  // 避免久未重整頁面 → React state 停留在舊 snapshot → 新報名不顯示
  useEffect(() => {
    if (!onRefreshRegistrations) return;
    if (location.pathname.startsWith('/admin/activities') || location.pathname.startsWith('/admin/check-in')) {
      onRefreshRegistrations();
    }
  }, [location.pathname, onRefreshRegistrations]);

  return (
    <div className="lg:flex min-h-screen bg-gray-50">
      {/* 手機版頂部列 */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-gray-900 text-white px-4 h-14 shadow-md">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-red-600 rounded-md flex items-center justify-center text-white font-bold text-sm">食</div>
          <span className="font-bold tracking-tight text-sm">管理系統</span>
        </Link>
        <button onClick={() => setMobileNavOpen(true)} className="p-2 -mr-2" aria-label="開啟選單"><Menu size={24} /></button>
      </header>

      {/* 手機版遮罩 */}
      {mobileNavOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />}

      <Sidebar user={currentUser} onLogout={onLogout} pendingCount={pendingCount} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <main className="flex-1 lg:h-screen lg:overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0">
        <Routes>
          <Route path="/" element={<DashboardHome {...props} />} />
          
          <Route path="/check-in" element={<ActivityCheckInManager type="unified" activities={[...props.activities, ...props.memberActivities]} registrations={[...props.registrations, ...props.memberRegistrations]} onUpdateReg={(reg: any) => (reg.audience === 'member_only' ? props.onUpdateMemberRegistration(reg) : props.onUpdateRegistration(reg))} members={props.members} />} />
          {/* 向下相容：舊連結 /member-check-in 重導至統一入口 */}
          <Route path="/member-check-in" element={<Navigate to="/admin/check-in" replace />} />

          <Route path="/activities" element={<ActivityManager type="unified" activities={[...props.activities, ...props.memberActivities]} registrations={[...props.registrations, ...props.memberRegistrations]} onAdd={props.onAddActivity} onUpdate={props.onUpdateActivity} onDelete={props.onDeleteActivity} onUpdateReg={(reg: any) => (reg.audience === 'member_only' ? props.onUpdateMemberRegistration(reg) : props.onUpdateRegistration(reg))} onDeleteReg={(id: any) => props.onDeleteRegistration(id)} onAddRegs={(regs: any[]) => regs.every(r => r.audience === 'member_only') ? props.onAddMemberRegistrations?.(regs) : props.onAddRegistrations?.(regs)} onUploadImage={props.onUploadImage} members={props.members} />} />
          {/* 向下相容：舊連結 /member-activities 重導 */}
          <Route path="/member-activities" element={<Navigate to="/admin/activities" replace />} />
          
          <Route path="/members" element={<MemberManager members={props.members} onAdd={props.onAddMember} onUpdate={props.onUpdateMember} onDelete={props.onDeleteMember} onImport={props.onAddMembers!} onAdjustPoints={props.onAdjustPoints} onFetchPointsLedger={props.onFetchPointsLedger} />} />
          <Route path="/club" element={<ClubManager activities={props.clubActivities} onUpdate={props.onUpdateClubActivity} onAdd={props.onAddClubActivity} onDelete={props.onDeleteClubActivity} onUploadImage={props.onUploadImage} />} />
          <Route path="/milestones" element={<MilestoneManager milestones={props.milestones} onAdd={props.onAddMilestone} onUpdate={props.onUpdateMilestone} onDelete={props.onDeleteMilestone} onUploadImage={props.onUploadImage} />} />
          <Route path="/finances" element={<FinancialManager records={props.financialRecords} onAdd={props.onAddFinancialRecord} onUpdate={props.onUpdateFinancialRecord} onDelete={props.onDeleteFinancialRecord} onUploadImage={props.onUploadImage} />} />
          <Route path="/member-applications" element={<MemberApplicationManager applications={props.memberApplications} onApprove={props.onApproveMemberApplication} onDelete={props.onDeleteMemberApplication} />} />
          <Route path="/member-renewals" element={<MemberRenewalManager />} />
          <Route path="/festival-applications" element={<FestivalApplicationManager />} />
          <Route path="/receipts" element={<ReceiptManager />} />
          <Route path="/birthdays" element={<MemberBirthdayManager members={props.members} />} />
          <Route path="/coupons" element={<CouponManager coupons={props.coupons} activities={props.activities} memberActivities={props.memberActivities} members={props.members} onGenerate={props.onGenerateCoupons} onGenerateVip={props.onGenerateVipInvites} />} />
          
          <Route path="/users" element={<UserManager users={props.users} onAdd={props.onAddUser} onDelete={props.onDeleteUser} />} />
          
          <Route path="*" element={<Navigate to="/admin" />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;