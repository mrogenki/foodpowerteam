
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { StaticRouter } from 'react-router';
import { Menu, X, Loader2, UserPlus, MessageCircle, XCircle, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// 使用 React.lazy 進行程式碼分割，減少初始載入體積
const Home = lazy(() => import('./pages/Home'));
const ActivitiesPage = lazy(() => import('./pages/Activities'));
const ActivityDetail = lazy(() => import('./pages/ActivityDetail'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const MemberList = lazy(() => import('./pages/MemberList'));
const MemberJoin = lazy(() => import('./pages/MemberJoin'));
const PaymentResult = lazy(() => import('./pages/PaymentResult'));
const ApplicationPayment = lazy(() => import('./pages/ApplicationPayment'));
const ActivityPayment = lazy(() => import('./pages/ActivityPayment'));
const MemberRenewal = lazy(() => import('./pages/MemberRenewal'));
const RenewalPayment = lazy(() => import('./pages/RenewalPayment'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const MilestoneTimeline = lazy(() => import('./pages/MilestoneTimeline'));
const Festival = lazy(() => import('./pages/Festival'));
const FestivalPayment = lazy(() => import('./pages/FestivalPayment'));
const FestivalApply = lazy(() => import('./pages/FestivalApply'));
const FestivalRegistrationPayment = lazy(() => import('./pages/FestivalRegistrationPayment'));
const DesignDemoIndex = lazy(() => import('./pages/DesignDemoIndex'));
const DesignDemoJP = lazy(() => import('./pages/DesignDemoJP'));
const DesignDemoEU = lazy(() => import('./pages/DesignDemoEU'));
const DesignDemoCN = lazy(() => import('./pages/DesignDemoCN'));
const ActivityCheckIn = lazy(() => import('./pages/ActivityCheckIn'));
const ReceiptView = lazy(() => import('./pages/ReceiptView'));
const SignupChain = lazy(() => import('./pages/SignupChain'));
const SignupPayment = lazy(() => import('./pages/SignupPayment'));
const ArticleList = lazy(() => import('./pages/ArticleList'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));
const LiffCard = lazy(() => import('./pages/LiffCard'));
const LiffMember = lazy(() => import('./pages/LiffMember'));

import Seo from './components/Seo';

import { Activity, MemberActivity, Registration, MemberRegistration, AdminUser, Member, Coupon, MemberApplication, UserRole, ClubActivity, Milestone, FinancialRecord, PointsLedgerEntry, SignupEntry, Article } from './types';
import { INITIAL_ACTIVITIES, INITIAL_MEMBERS } from './constants';
import { notifyAdmin } from './utils/notification';
import { supabase } from './utils/supabaseClient';

// 換頁自動回頂：解決 HashRouter SPA 切換不 reset scroll 的問題
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

// Landing page (例：燒肉祭/火鍋祭、設計風格 demo) 使用自帶 Header/Footer，不顯示全站導覽
const isStandaloneLandingPath = (pathname: string) =>
  pathname.startsWith('/festival') || pathname.startsWith('/design') || pathname.startsWith('/checkin') || pathname.startsWith('/receipt') || pathname.startsWith('/signup') || pathname.startsWith('/pay-signup');

// 載入中元件
const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
    <Loader2 className="animate-spin text-red-600" size={40} />
    <p className="text-gray-500 font-medium">頁面載入中...</p>
  </div>
);

// 定義系統擁有者 (白名單)，確保即使資料庫設定錯誤也能登入
const SYSTEM_OWNERS = ['mr.ogenki@gmail.com'];

// 手機正規化：去掉非數字、把 886 前綴換回 0。
// 規則與 Supabase 的 member_bind_line RPC 一致，兩邊比對結果才會相同。
const normalizePhone = (v?: string | null) =>
  String(v ?? '').replace(/\D/g, '').replace(/^886/, '0');

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

// 這筆入會申請要記進 payment_records 的那一行
const buildJoinPaymentRecord = (application: MemberApplication) => {
  const isWaived = (application.paid_amount || 0) === 0;
  return {
    id: Date.now(),
    date: application.paid_at ? application.paid_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
    amount: application.paid_amount || 0,
    note: `入會費 (${translatePaymentMethod(application.payment_method)}${isWaived ? '/會費減免' : ''}) - 訂單編號: ${application.merchant_order_no || '無'}`
  };
};

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  if (isAdminPage) return null;
  if (isStandaloneLandingPath(location.pathname)) return null;

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                <img src="/logo.svg" alt="" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-gray-900 whitespace-nowrap">食在力量</span>
            </Link>
          </div>
          <div className="hidden lg:flex items-center space-x-10">
            <Link to="/about" className="text-gray-600 hover:text-red-600 transition-colors font-bold text-lg uppercase tracking-widest">關於我們</Link>
            <Link to="/milestones" className="text-gray-600 hover:text-red-600 transition-colors font-bold text-lg uppercase tracking-widest">大事記</Link>
            <Link to="/activities" className="text-gray-600 hover:text-red-600 transition-colors font-bold text-lg uppercase tracking-widest">協會活動</Link>
            <Link to="/members" className="text-gray-600 hover:text-red-600 transition-colors font-bold text-lg uppercase tracking-widest">會員列表</Link>
            <Link to="/articles" className="text-gray-600 hover:text-red-600 transition-colors font-bold text-lg uppercase tracking-widest">專欄</Link>
            <a href="https://www.foodpowerclub.com/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-red-600 transition-colors font-bold text-lg uppercase tracking-widest">食在俱樂部</a>
            <Link
              to="/festival"
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full text-base font-bold shadow-md shadow-orange-100 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              title="燒肉祭・火鍋祭 招商頁"
            >
              <Flame size={16} className="animate-pulse" />
              <span>燒肉祭・火鍋祭</span>
            </Link>
            <Link to="/join" className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-full text-lg font-bold hover:bg-red-700 shadow-lg shadow-red-100 transition-all hover:-translate-y-0.5 active:translate-y-0">
              <UserPlus size={20} />
              <span>加入會員</span>
            </Link>
          </div>
          <div className="lg:hidden flex items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="text-gray-500 hover:text-red-600 p-2 rounded-lg hover:bg-gray-50 transition-all"
              aria-label="切換選單"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden bg-white border-t px-4 py-6 space-y-4 shadow-2xl absolute top-full left-0 w-full"
          >
            <Link to="/about" onClick={() => setIsOpen(false)} className="block text-xl font-bold text-gray-900 px-4 py-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">關於我們</Link>
            <Link to="/milestones" onClick={() => setIsOpen(false)} className="block text-xl font-bold text-gray-900 px-4 py-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">大事記</Link>
            <Link to="/activities" onClick={() => setIsOpen(false)} className="block text-xl font-bold text-gray-900 px-4 py-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">協會活動</Link>
            <Link to="/members" onClick={() => setIsOpen(false)} className="block text-xl font-bold text-gray-900 px-4 py-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">會員列表</Link>
            <Link to="/articles" onClick={() => setIsOpen(false)} className="block text-xl font-bold text-gray-900 px-4 py-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">專欄</Link>
            <a href="https://www.foodpowerclub.com/" target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)} className="block text-xl font-bold text-gray-900 px-4 py-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">食在俱樂部</a>
            <Link
              to="/festival"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 text-xl font-bold text-white px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl transition-all shadow-md"
            >
              <Flame size={20} className="animate-pulse" />
              燒肉祭・火鍋祭
            </Link>
            <Link to="/join" onClick={() => setIsOpen(false)} className="block text-xl font-bold text-red-600 px-4 py-2 bg-red-50 rounded-xl transition-all">加入會員</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer: React.FC = () => {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) return null;
  if (isStandaloneLandingPath(location.pathname)) return null;
  return (
    <footer className="bg-white border-t py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
              <img src="/logo.svg" alt="食在力量" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-bold text-gray-900 text-base">食在力量</span>
              <p className="text-gray-400 text-xs mt-0.5">
                &copy; 2026 食在力量活動報名系統 v2.0.&nbsp;
                <Link to="/admin" className="hover:text-red-600 transition-colors">All rights reserved.</Link>
              </p>
            </div>
          </div>

          {/* LINE Official Account */}
          <a
            href="https://lin.ee/oIeFIMO"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#05A044]/10 hover:bg-[#05A044]/20 border border-[#05A044]/20 px-5 py-2.5 rounded-full transition-all group"
          >
            <img
              src="https://qr-official.line.me/gs/M_736bgkpm_BW.png?oat__id=6378179&oat_content=qr"
              alt="LINE QR Code"
              className="w-7 h-7 rounded"
              width={28}
              height={28}
              loading="lazy"
            />
            <div>
              <p className="text-[#05A044] font-bold text-sm leading-tight">LINE 官方帳號</p>
              <p className="text-gray-500 text-xs">掌握最新動態</p>
            </div>
            <MessageCircle size={18} className="text-[#05A044] group-hover:scale-110 transition-transform" />
          </a>
        </div>
      </div>
    </footer>
  );
};

const SetupGuide: React.FC = () => {
  return <div>Setup Guide</div>; 
};

const App: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [memberActivities, setMemberActivities] = useState<MemberActivity[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [signupEntries, setSignupEntries] = useState<SignupEntry[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [memberRegistrations, setMemberRegistrations] = useState<MemberRegistration[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberApplications, setMemberApplications] = useState<MemberApplication[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [clubActivities, setClubActivities] = useState<ClubActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const isFetching = React.useRef(false);
  
  // Supabase Auth Session
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  if (!supabase) {
    return <SetupGuide />;
  }

  // 1. 監聽 Supabase Auth 狀態
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn("Session check failed:", error.message);
        if (error.message.includes("Refresh Token")) {
          supabase.auth.signOut();
          setSession(null);
        }
      } else {
        setSession(session);
      }
      setSessionChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
         console.warn('Token refresh failed');
      }
      setSession(session);
      setSessionChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. 當 Session 存在時，查詢 admins 表格確認權限
  useEffect(() => {
    const fetchAdminRole = async () => {
      if (!sessionChecked) return;

      if (session?.user?.email) {
        try {
          const { data: adminData, error } = await supabase!
            .from('admins')
            .select('*')
            .ilike('email', session.user.email)
            .single();

          if (adminData) {
            setCurrentUser({
              id: adminData.id,
              name: adminData.name,
              role: adminData.role as UserRole,
              phone: adminData.phone,
              password: ''
            });
          } else {
            const isSystemOwner = SYSTEM_OWNERS.some(email => 
              email.toLowerCase() === session.user.email.toLowerCase()
            );

            if (isSystemOwner) {
               setCurrentUser({
                 id: session.user.id,
                 name: '總管理員 (System)',
                 role: UserRole.SUPER_ADMIN,
                 phone: '',
               });
            } else {
               setCurrentUser(null);
            }
          }
        } catch (err) {
          console.error('Error fetching admin role:', err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthResolved(true);
    };

    fetchAdminRole();
  }, [sessionChecked, session?.user?.id, session?.user?.email]);

  const fetchData = React.useCallback(async (isInitialLoad = false) => {
    // 移除 isFetching.current 的阻擋，改用更靈活的狀態管理
    if (isInitialLoad) setLoading(true);
    setDbError(null);
    
    try {
      if (!supabase) throw new Error("Supabase client not initialized");

      // 統一活動表（含 audience='public' / 'member_only' / 'club'）
      const publicQueries = [
        supabase.from('activities').select('*').order('date', { ascending: true }),
      ];

      // 只有在確定有 currentUser 時才加入管理員查詢
      const adminQueries = currentUser ? [
        supabase.from('registrations').select('*').order('created_at', { ascending: false }),
        supabase.from('admins').select('*'),
        supabase.from('coupons').select('*').order('created_at', { ascending: false }),
        supabase.from('member_applications').select('*').order('created_at', { ascending: false }),
        supabase.from('members').select('*'),
        supabase.from('financial_records').select('*').order('date', { ascending: false }),
        supabase.from('milestones').select('*').order('date', { ascending: false }),
        supabase.from('signup_entries').select('*').order('created_at', { ascending: true }),
      ] : [];

      const results = await Promise.all([...publicQueries, ...adminQueries]);

      const allActData = results[0].data;

      // 將統一表依 audience 切回三個 state slice，維持下游元件相容
      if (allActData && allActData.length > 0) {
        const normalized = allActData.map((a: any) => ({ ...a, status: a.status || 'active' }));
        setActivities(normalized.filter((a: any) => a.audience === 'public'));
        setMemberActivities(normalized.filter((a: any) => a.audience === 'member_only'));
        setClubActivities(normalized.filter((a: any) => a.audience === 'club'));
      } else if (currentUser?.role === UserRole.SUPER_ADMIN) {
         const { data: hasAny } = await supabase.from('activities').select('id').limit(1);
         if (!hasAny || hasAny.length === 0) {
            const seed = INITIAL_ACTIVITIES.map(a => ({ ...a, audience: 'public' as const }));
            await supabase.from('activities').insert(seed);
            const { data: reload } = await supabase.from('activities').select('*');
            if (reload) {
              const normalized = reload.map((a: any) => ({ ...a, status: a.status || 'active' }));
              setActivities(normalized.filter((a: any) => a.audience === 'public'));
              setMemberActivities(normalized.filter((a: any) => a.audience === 'member_only'));
              setClubActivities(normalized.filter((a: any) => a.audience === 'club'));
            }
         }
      }

      // 處理管理員資料 (索引從 1 開始)
      if (currentUser && results.length > 1) {
        const allRegData = results[1]?.data;
        const userData = results[2]?.data;
        const couponData = results[3]?.data;
        const applicationData = results[4]?.data;
        const memberData = results[5]?.data;
        const financialData = results[6]?.data;
        const milestoneData = results[7]?.data;
        const signupData = results[8]?.data;
        if (signupData) setSignupEntries(signupData as SignupEntry[]);

        // 統一報名表，依 audience 切回兩組
        if (allRegData) {
          setRegistrations(allRegData.filter((r: any) => r.audience !== 'member_only'));
          setMemberRegistrations(allRegData.filter((r: any) => r.audience === 'member_only'));
        }
        if (userData) setUsers(userData);
        if (couponData) setCoupons(couponData as Coupon[]);
        if (applicationData) setMemberApplications(applicationData as MemberApplication[]);
        if (financialData) setFinancialRecords(financialData as FinancialRecord[]);
        if (milestoneData) setMilestones(milestoneData);
        
        if (memberData && memberData.length > 0) {
          const sortedMembers = memberData.sort((a: any, b: any) => {
            const valA = String(a.member_no || '');
            const valB = String(b.member_no || '');
            if (!valA && !valB) return 0;
            if (!valA) return 1;
            if (!valB) return -1;
            return valA.localeCompare(valB, undefined, { numeric: true });
          });
          setMembers(sortedMembers);
        }
      }

      // 非管理員時，公開會員名冊只取「非敏感」商務欄位（走 members-directory edge function，
      // 不含手機/信箱/身分證）。會員價改由 verify-member 於報名頁精準驗證，不再整表下載。
      if (!currentUser) {
        supabase.functions.invoke('members-directory').then(({ data }) => {
          if (Array.isArray(data) && data.length > 0) {
            const sortedMembers = [...data].sort((a: any, b: any) => {
              const valA = String(a.member_no || '');
              const valB = String(b.member_no || '');
              if (!valA && !valB) return 0;
              if (!valA) return 1;
              if (!valB) return -1;
              return valA.localeCompare(valB, undefined, { numeric: true });
            });
            setMembers(sortedMembers as Member[]);
          }
        });
      }

      // 專欄文章：獨立抓取。RLS 讓匿名只拿到 published；登入管理員拿到全部（含草稿，供後台管理）。
      supabase.from('articles').select('*').order('created_at', { ascending: false })
        .then(({ data }) => { if (Array.isArray(data)) setArticles(data as Article[]); });

    } catch (err: any) {
      console.error('Fetch error:', err);
      if (isInitialLoad) {
        setDbError("連線不穩定，請檢查網路或稍後再試。");
      }
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!authResolved) return;

    // 安全機制：如果 60 秒後還在載入，強制停止轉圈圈並顯示錯誤
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setDbError("連線逾時，請檢查網路或資料庫設定。");
      }
    }, 60000);

    // 背景執行 Base64 圖片轉移至 Supabase Storage
    const runMigrationAndFetch = async () => {
      if (currentUser && currentUser.role === UserRole.SUPER_ADMIN && supabase) {
        let hasMigrationError = false;
        // 1. 轉移 picture 欄位 (Phase 3 後 member_activities / club_activities 已合併至 activities)
        const tables = ['activities', 'milestones'];
        for (const table of tables) {
          try {
            const { data, error } = await supabase.from(table).select('id').like('picture', 'data:image/%');
            if (error || !data || data.length === 0) continue;
            
            console.log(`Found ${data.length} base64 images in ${table}. Migrating...`);
            setMigrationStatus(`正在轉移 ${table} 的圖片 (${data.length} 筆)...`);
            for (const row of data) {
              const { data: rowData } = await supabase.from(table).select('picture').eq('id', row.id).single();
              if (!rowData || !rowData.picture) continue;
              
              try {
                const base64Data = rowData.picture.split(',')[1];
                const mimeType = rowData.picture.split(';')[0].split(':')[1];
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: mimeType });
                
                const fileExt = mimeType.split('/')[1] || 'jpg';
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const filePath = `activity-covers/${fileName}`;
                
                const { error: uploadError } = await supabase.storage.from('activity-images').upload(filePath, blob, { contentType: mimeType, upsert: false });
                if (uploadError) throw uploadError;
                
                const { data: urlData } = supabase.storage.from('activity-images').getPublicUrl(filePath);
                await supabase.from(table).update({ picture: urlData.publicUrl }).eq('id', row.id);
                console.log(`Migrated image for ${table} ID ${row.id}`);
              } catch (err) {
                console.error(`Failed to migrate image for ${table} ID ${row.id}:`, err);
                hasMigrationError = true;
              }
            }
          } catch (err) {
            console.error(`Migration error on ${table}:`, err);
            hasMigrationError = true;
          }
        }

        // 2. 轉移 financial_records 的 receipt_url 欄位
        try {
          const { data, error } = await supabase.from('financial_records').select('id').like('receipt_url', 'data:image/%');
          if (!error && data && data.length > 0) {
            console.log(`Found ${data.length} base64 images in financial_records. Migrating...`);
            setMigrationStatus(`正在轉移財務紀錄的單據 (${data.length} 筆)...`);
            for (const row of data) {
              const { data: rowData } = await supabase.from('financial_records').select('receipt_url').eq('id', row.id).single();
              if (!rowData || !rowData.receipt_url) continue;
              
              try {
                const base64Data = rowData.receipt_url.split(',')[1];
                const mimeType = rowData.receipt_url.split(';')[0].split(':')[1];
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: mimeType });
                
                const fileExt = mimeType.split('/')[1] || 'jpg';
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const filePath = `transactions/${fileName}`;
                
                const { error: uploadError } = await supabase.storage.from('activity-images').upload(filePath, blob, { contentType: mimeType, upsert: false });
                if (uploadError) throw uploadError;
                
                const { data: urlData } = supabase.storage.from('activity-images').getPublicUrl(filePath);
                await supabase.from('financial_records').update({ receipt_url: urlData.publicUrl }).eq('id', row.id);
                console.log(`Migrated document for financial_records ID ${row.id}`);
              } catch (err) {
                console.error(`Failed to migrate document for financial_records ID ${row.id}:`, err);
                hasMigrationError = true;
              }
            }
          }
        } catch (err) {
          console.error(`Migration error on financial_records:`, err);
          hasMigrationError = true;
        }
        
        if (hasMigrationError) {
          setMigrationStatus('圖片轉移過程中發生錯誤，請確保已在 Supabase 建立 activity-images Bucket。');
          await new Promise(resolve => setTimeout(resolve, 5000));
          setMigrationStatus(null);
        } else {
          setMigrationStatus(null);
        }
      }
      // 每次 authResolved 或 currentUser 改變時都重新抓取資料
      // 確保管理員權限生效後能抓到管理員專屬資料
      fetchData(true);
    };
    
    runMigrationAndFetch();
    
    return () => clearTimeout(timer);
  }, [authResolved, currentUser, fetchData]);

  const handleLogout = async () => {
    if (supabase) {
       await supabase.auth.signOut();
       setCurrentUser(null);
       setSession(null);
    }
  };

  // 圖片上傳
  const handleUploadImage = async (file: File): Promise<string> => {
    if (!supabase) return '';
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const folder = fileExt === 'pdf' ? 'documents' : 'activity-covers';
      const filePath = `${folder}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('activity-images').upload(filePath, file, { cacheControl: '3600', upsert: false });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert(`圖片上傳失敗！\n請至 Supabase 後台建立名為 "activity-images" 的 Public Bucket，並設定允許上傳的 RLS 政策。\n錯誤訊息：${uploadError.message}`);
        return '';
      }
      
      const { data } = supabase.storage.from('activity-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error: any) {
      console.error('Unexpected upload error:', error);
      alert('圖片上傳發生未預期錯誤：' + error.message);
      return '';
    }
  };

  const validateCoupon = async (code: string, activityId: string): Promise<{valid: boolean, discount?: number, message: string, couponId?: string, isFree?: boolean}> => {
    if (!supabase) return { valid: false, message: '系統連線錯誤' };
    const { data, error } = await supabase.from('coupons').select('*').eq('code', code).single();
    if (error || !data) return { valid: false, message: '無效的折扣碼' };
    if (String(data.activity_id) !== String(activityId)) return { valid: false, message: '此折扣碼不適用於本活動' };
    if (data.is_used) return { valid: false, message: data.is_free ? '此邀請連結已被使用' : '此折扣碼已被使用' };
    if (data.is_free) return { valid: true, discount: 0, isFree: true, message: 'VIP 免費邀請已套用，本次報名免費', couponId: data.id };
    return { valid: true, discount: data.discount_amount, message: '折扣碼適用', couponId: data.id };
  };

  // 產生 VIP 免費邀請券（單次使用、不綁會員），回傳產生的券供後台複製連結
  const handleGenerateVipInvites = async (activityId: string, count: number, note?: string): Promise<Coupon[]> => {
    if (!supabase) return [];
    const rows = Array.from({ length: count }, () => ({
      activity_id: activityId,
      member_id: null,
      discount_amount: 0,
      is_free: true,
      is_used: false,
      note: note || null,
      code: `VIP${String(activityId).slice(-3)}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    }));
    const { data, error } = await supabase.from('coupons').insert(rows).select();
    if (error) { alert('產生 VIP 邀請失敗：' + error.message); return []; }
    fetchData();
    return (data || []) as Coupon[];
  };

  // 產生會籍/入會券（不綁活動，activity_id = null）。amount=0 → 全額免費券
  const handleGenerateMembershipCoupons = async (amount: number, count: number, note?: string): Promise<Coupon[]> => {
    if (!supabase) return [];
    const rows = Array.from({ length: count }, () => ({
      activity_id: null,
      member_id: null,
      discount_amount: amount > 0 ? amount : 0,
      is_free: amount <= 0,
      is_used: false,
      note: note || null,
      code: `MEM-${Math.random().toString(36).substr(2, 7).toUpperCase()}`
    }));
    const { data, error } = await supabase.from('coupons').insert(rows).select();
    if (error) { alert('產生會籍券失敗：' + error.message); return []; }
    fetchData();
    return (data || []) as Coupon[];
  };

  // 事後編輯折扣券備註
  const handleUpdateCouponNote = async (couponId: string, note: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('coupons').update({ note: note.trim() || null }).eq('id', couponId);
    if (error) { alert('更新備註失敗：' + error.message); return; }
    fetchData();
  };

  // Phase 3：統一 fetch — 一次讀 activities 全表，依 audience 切回三個 slice
  const refreshActivities = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('activities').select('*').order('date', { ascending: true });
    if (data) {
      const normalized = data.map((a: any) => ({ ...a, status: a.status || 'active' }));
      setActivities(normalized.filter((a: any) => a.audience === 'public'));
      setMemberActivities(normalized.filter((a: any) => a.audience === 'member_only'));
      setClubActivities(normalized.filter((a: any) => a.audience === 'club'));
    }
  };

  const refreshRegistrations = async () => {
    if (!supabase || !currentUser) return;
    const { data } = await supabase.from('registrations').select('*').order('created_at', { ascending: false });
    if (data) {
      setRegistrations(data.filter((r: any) => r.audience !== 'member_only'));
      setMemberRegistrations(data.filter((r: any) => r.audience === 'member_only'));
    }
  };

  const refreshSignupEntries = async () => {
    if (!supabase || !currentUser) return;
    const { data } = await supabase.from('signup_entries').select('*').order('created_at', { ascending: true });
    if (data) setSignupEntries(data as SignupEntry[]);
  };

  const refreshArticles = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    if (data) setArticles(data as Article[]);
  };

  const handleAddArticle = async (art: any) => {
    if (!supabase) return;
    const now = new Date().toISOString();
    const payload = { ...art, published_at: art.status === 'published' ? (art.published_at || now) : null, updated_at: now };
    const { data, error } = await supabase.from('articles').insert(payload).select().single();
    if (error) { console.error(error); alert('新增文章失敗：' + (error.message || '未知錯誤')); return; }
    if (data) setArticles(prev => [data as Article, ...prev]);
  };

  const handleUpdateArticle = async (art: any) => {
    if (!supabase) return;
    const now = new Date().toISOString();
    const payload = { ...art, published_at: art.status === 'published' ? (art.published_at || now) : null, updated_at: now };
    setArticles(prev => prev.map(a => a.id === art.id ? { ...a, ...payload } : a));
    const { error } = await supabase.from('articles').update(payload).eq('id', art.id);
    if (error) { console.error(error); alert('更新文章失敗'); refreshArticles(); }
  };

  const handleDeleteArticle = async (id: string | number) => {
    if (!supabase) return;
    setArticles(prev => prev.filter(a => a.id !== id));
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) { console.error(error); alert('刪除文章失敗'); refreshArticles(); }
  };

  const handleToggleSignupCheckin = async (id: string, value: boolean) => {
    if (!supabase) return;
    setSignupEntries(prev => prev.map(s => s.id === id ? { ...s, check_in_status: value } : s));  // 樂觀更新
    const { error } = await supabase.rpc('signup_set_checkin', { p_id: id, p_value: value });
    if (error) { console.error(error); refreshSignupEntries(); alert('報到更新失敗'); }
  };

  // 活動 CRUD — 全部走統一的 activities 表，audience 在傳入物件中決定
  const writeActivity = async (act: Activity, mode: 'insert' | 'update') => {
    if (!supabase) return { error: null as any };
    if (mode === 'insert') {
      return supabase.from('activities').insert([act]);
    }
    return supabase.from('activities').update(act).eq('id', act.id);
  };

  const handleUpdateActivity = async (updated: Activity) => {
    const withAudience = { ...updated, audience: updated.audience || 'public' };
    if (withAudience.audience === 'public') setActivities(prev => prev.map(a => a.id === withAudience.id ? withAudience : a));
    else if (withAudience.audience === 'member_only') setMemberActivities(prev => prev.map(a => a.id === withAudience.id ? withAudience : a));
    else setClubActivities(prev => prev.map(a => a.id === withAudience.id ? withAudience : a));
    const { error } = await writeActivity(withAudience, 'update');
    if (error) { console.error(error); refreshActivities(); }
  };

  const handleAddActivity = async (newAct: Activity) => {
    const withAudience: Activity = { ...newAct, audience: newAct.audience || 'public', id: newAct.id || crypto.randomUUID() };
    if (withAudience.audience === 'public') setActivities(prev => [...prev, withAudience].sort((a, b) => a.date.localeCompare(b.date)));
    else if (withAudience.audience === 'member_only') setMemberActivities(prev => [...prev, withAudience].sort((a, b) => a.date.localeCompare(b.date)));
    else setClubActivities(prev => [...prev, withAudience].sort((a, b) => a.date.localeCompare(b.date)));
    const { error } = await writeActivity(withAudience, 'insert');
    if (error) { alert('新增活動失敗: ' + error.message); refreshActivities(); }
  };

  const handleDeleteActivity = async (id: string | number) => {
    setActivities(prev => prev.filter(a => a.id !== id));
    setMemberActivities(prev => prev.filter(a => a.id !== id));
    setClubActivities(prev => prev.filter(a => a.id !== id));
    if (!supabase) return;
    // Cascade：先刪該活動所有報名
    await supabase.from('registrations').delete().eq('activityId', id);
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) refreshActivities();
  };

  // 會員/俱樂部活動 handler — 內部標好 audience 後走 handleAddActivity / handleUpdateActivity
  const handleAddMemberActivity = (newAct: Activity) => handleAddActivity({ ...newAct, audience: 'member_only' });
  const handleUpdateMemberActivity = (updated: Activity) => handleUpdateActivity({ ...updated, audience: 'member_only' });
  const handleDeleteMemberActivity = (id: string | number) => handleDeleteActivity(id);
  const handleAddClubActivity = (newAct: Activity) => handleAddActivity({ ...newAct, audience: 'club' });
  const handleUpdateClubActivity = (updated: Activity) => handleUpdateActivity({ ...updated, audience: 'club' });
  const handleDeleteClubActivity = (id: string | number) => handleDeleteActivity(id);

  // 報名 CRUD — 統一 registrations 表，audience 區分公開／會員專屬
  const handleRegister = async (newReg: Registration, couponId?: string): Promise<boolean> => {
    if (!supabase) return false;
    // 名額合併：若此活動有開接龍且已額滿（接龍正取 + 一般報名合計），擋下並引導去接龍候補
    if (newReg.activityId != null) {
      const { data: cap } = await supabase.rpc('activity_signup_capacity', { p_activity_id: String(newReg.activityId) });
      const c = Array.isArray(cap) ? cap[0] : cap;
      if (c?.enabled && c?.is_full) {
        alert('此活動名額已滿，請改用「接龍報名」排候補。');
        return false;
      }
    }
    const payload = { ...newReg, audience: newReg.audience || 'public' };
    const { error } = await supabase.from('registrations').insert([payload]);
    if (error) { alert('報名失敗：' + error.message); return false; }

    const usedPoints = !!(newReg.points_used && newReg.points_used > 0 && newReg.member_id);

    // 點數預扣（reserve）：原子檢查餘額並凍結；失敗則回滾剛建立的報名單
    if (usedPoints) {
      const { data: rr, error: re } = await supabase.rpc('points_reserve', {
        p_member_id: newReg.member_id,
        p_points: newReg.points_used,
        p_order_no: newReg.merchant_order_no
      });
      if (re || !rr?.ok) {
        await supabase.from('registrations').delete().eq('id', newReg.id);
        alert('報名失敗：' + (rr?.reason === 'insufficient' ? '點數餘額不足' : '點數扣抵失敗'));
        return false;
      }
    }

    // 0 元訂單（VIP 免費 / 折扣全免 / 點數全抵）：標記已付、不進金流；有預扣點數則一併核銷
    // 匿名報名者無 registrations UPDATE 權限，改走 SECURITY DEFINER RPC（僅對金額 0 的單標記）
    if ((newReg.paid_amount ?? 0) === 0) {
      await supabase.rpc('mark_free_registration_paid', { p_id: String(newReg.id) });
      if (usedPoints) await supabase.rpc('points_commit', { p_order_no: newReg.merchant_order_no });
    }
    if (usedPoints) fetchMembers(); // 更新會員餘額顯示

    if (couponId) await supabase.from('coupons').update({ is_used: true, used_at: new Date().toISOString() }).eq('id', couponId);
    refreshRegistrations();
    return true;
  };

  const handleMemberRegister = async (newReg: Registration, couponId?: string): Promise<boolean> => {
    return handleRegister({ ...newReg, audience: 'member_only' }, couponId);
  };

  const handleUpdateRegistration = async (updated: Registration) => {
    if (updated.audience === 'member_only') {
      setMemberRegistrations(prev => prev.map(r => r.id === updated.id ? updated : r));
    } else {
      setRegistrations(prev => prev.map(r => r.id === updated.id ? updated : r));
    }
    if (!supabase) return;
    const { error } = await supabase.from('registrations').update(updated).eq('id', updated.id);
    if (error) { console.error(error); refreshRegistrations(); alert('更新失敗'); }
  };

  const handleDeleteRegistration = async (id: string | number) => {
    setRegistrations(prev => prev.filter(r => r.id !== id));
    setMemberRegistrations(prev => prev.filter(r => r.id !== id));
    if (!supabase) return;
    const { error } = await supabase.from('registrations').delete().eq('id', id);
    if (error) { console.error(error); fetchData(); }
  };

  const handleUpdateMemberRegistration = (updated: Registration) =>
    handleUpdateRegistration({ ...updated, audience: 'member_only' });
  const handleDeleteMemberRegistration = (id: string | number) => handleDeleteRegistration(id);

  const handleAddRegistrations = async (newRegs: Registration[]) => {
    if (!supabase) return;
    setLoading(true);
    const payload = newRegs.map(r => ({ ...r, audience: r.audience || 'public' }));
    const { error } = await supabase.from('registrations').insert(payload);
    if (!error) { alert(`成功匯入 ${newRegs.length} 筆報名資料`); await fetchData(); } else alert('匯入失敗：' + error.message);
    setLoading(false);
  };

  const handleAddMemberRegistrations = async (newRegs: Registration[]) => {
    const tagged = newRegs.map(r => ({ ...r, audience: 'member_only' as const }));
    return handleAddRegistrations(tagged);
  };

  const fetchMilestones = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('milestones').select('*').order('date', { ascending: false });
    if (data) setMilestones(data);
  };

  const fetchFinancialRecords = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('financial_records').select('*').order('date', { ascending: false });
    if (data) setFinancialRecords(data);
  };

  const handleAddMilestone = async (newMilestone: Milestone) => {
    setMilestones(prev => [newMilestone, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    if (!supabase) return;
    const { error } = await supabase.from('milestones').insert([newMilestone]);
    if (error) { console.error(error); alert('新增失敗'); fetchMilestones(); }
  };

  const handleUpdateMilestone = async (updated: Milestone) => {
    setMilestones(prev => prev.map(m => m.id === updated.id ? updated : m).sort((a, b) => b.date.localeCompare(a.date)));
    if (!supabase) return;
    const { error } = await supabase.from('milestones').update(updated).eq('id', updated.id);
    if (error) { console.error(error); alert('更新失敗'); fetchMilestones(); }
  };

  const handleDeleteMilestone = async (id: string | number) => {
    setMilestones(prev => prev.filter(m => m.id !== id));
    if (!supabase) return;
    const { error } = await supabase.from('milestones').delete().eq('id', id);
    if (error) { console.error(error); alert('刪除失敗'); fetchMilestones(); }
  };

  const handleAddFinancialRecord = async (newRecord: FinancialRecord) => {
    setFinancialRecords(prev => [newRecord, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    if (!supabase) return;
    const { error } = await supabase.from('financial_records').insert([newRecord]);
    if (error) { console.error(error); alert('新增失敗'); fetchFinancialRecords(); }
  };

  const handleUpdateFinancialRecord = async (updated: FinancialRecord) => {
    setFinancialRecords(prev => prev.map(r => r.id === updated.id ? updated : r).sort((a, b) => b.date.localeCompare(a.date)));
    if (!supabase) return;
    const { error } = await supabase.from('financial_records').update(updated).eq('id', updated.id);
    if (error) { console.error(error); alert('更新失敗'); fetchFinancialRecords(); }
  };

  const handleDeleteFinancialRecord = async (id: string | number) => {
    setFinancialRecords(prev => prev.filter(r => r.id !== id));
    if (!supabase) return;
    const { error } = await supabase.from('financial_records').delete().eq('id', id);
    if (error) { console.error(error); alert('刪除失敗'); fetchFinancialRecords(); }
  };

  // User management (only for recording, not auth)
  // 透過 create-admin Edge Function：同時建立 Supabase Auth 登入帳號 + 寫入 admins 權限表
  const handleAddUser = async (newUser: AdminUser): Promise<boolean> => {
    if (!supabase) return false;
    const u = newUser as any;
    const { data, error } = await supabase.functions.invoke('create-admin', {
      body: { name: u.name, email: u.email, password: u.password, phone: u.phone || '', role: u.role },
    });
    if (error || !data?.ok) {
      let msg = data?.error || error?.message || '請稍後再試';
      // FunctionsHttpError 會把後端回應放在 context，取出真正的錯誤原因
      const ctx = (error as any)?.context;
      if (ctx && typeof ctx.json === 'function') {
        try { const b = await ctx.json(); if (b?.error) msg = b.error; } catch (_) {}
      }
      alert(`新增管理員失敗：${msg}`);
      return false;
    }
    await fetchData();
    return true;
  };
  const handleDeleteUser = async (id: string) => { if (!supabase) return; await supabase.from('admins').delete().eq('id', id); fetchData(); };
  
  const fetchMembers = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('members').select('*');
    if (data) {
      const sortedMembers = data.sort((a: any, b: any) => {
        const valA = String(a.member_no || '');
        const valB = String(b.member_no || '');
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;
        return valA.localeCompare(valB, undefined, { numeric: true });
      });
      setMembers(sortedMembers);
    }
  };

  const handleAddMember = async (newMember: Member) => { 
    if (!supabase) return; 
    const memberToInsert = { ...newMember, id: newMember.id || crypto.randomUUID() };
    setMembers(prev => [...prev, memberToInsert].sort((a, b) => String(a.member_no || '').localeCompare(String(b.member_no || ''), undefined, { numeric: true })));
    const { error } = await supabase.from('members').insert([memberToInsert]); 
    if (error) { alert('新增會員失敗：' + error.message); fetchMembers(); }
  };

  const handleUpdateMember = async (updated: Member) => {
    setMembers(prev => prev.map(m => m.id === updated.id ? { ...updated, points_balance: m.points_balance } : m).sort((a, b) => String(a.member_no || '').localeCompare(String(b.member_no || ''), undefined, { numeric: true })));
    if (!supabase) return;
    // points_balance 僅能透過 RPC 異動，會員表單存檔不得覆寫
    const { points_balance, ...memberUpdate } = updated;
    const { error } = await supabase.from('members').update(memberUpdate).eq('id', updated.id);
    if (error) { alert('更新會員失敗：' + error.message); fetchMembers(); }
  };

  // 後台手動調整點數（走 RPC，留痕於 points_ledger）
  const handleAdjustPoints = async (memberId: string, delta: number, reason: string): Promise<boolean> => {
    if (!supabase) return false;
    const { data, error } = await supabase.rpc('points_adjust', {
      p_member_id: memberId, p_delta: delta, p_reason: reason, p_admin: currentUser?.name || 'admin'
    });
    if (error || !data?.ok) {
      alert('調整點數失敗：' + (data?.reason === 'negative_balance' ? '餘額不足以扣除' : (error?.message || data?.reason || '未知錯誤')));
      return false;
    }
    fetchMembers();
    return true;
  };

  // 讀取某會員的點數明細
  const fetchPointsLedger = async (memberId: string): Promise<PointsLedgerEntry[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('points_ledger').select('*').eq('member_id', memberId).order('created_at', { ascending: false });
    if (error) { console.error('讀取點數明細失敗：', error); return []; }
    return (data || []) as PointsLedgerEntry[];
  };

  const handleDeleteMember = async (id: string | number) => { 
    setMembers(prev => prev.filter(m => m.id !== id));
    if (!supabase) return; 
    const { error } = await supabase.from('members').delete().eq('id', id); 
    if (error) { alert('刪除會員失敗：' + error.message); fetchMembers(); }
  };
  const handleAddMembers = async (newMembers: Member[]) => {
    if (!supabase) return;
    setLoading(true);
    const ms = newMembers.map(m => ({ ...m, id: m.id ? String(m.id) : crypto.randomUUID() }));
    const { error } = await supabase.from('members').insert(ms);
    if (!error) { alert(`成功匯入 ${ms.length} 筆`); await fetchData(); } else alert(error.message);
    setLoading(false);
  };

  const handleGenerateCoupons = async (activityId: string, amount: number, memberIds: string[], sendEmail: boolean, note?: string) => {
    if (!supabase) return;
    setLoading(true);
    try {
      const coupons = memberIds.map(mid => ({
        activity_id: activityId,
        member_id: mid,
        discount_amount: amount,
        is_used: false,
        note: note || null,
        code: `ACT${activityId.slice(-3)}-M${mid.slice(-3)}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      }));
      await supabase.from('coupons').insert(coupons);
      alert(`成功產生 ${coupons.length} 張折扣券`);
      fetchData();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  // 沿用既有會員編號，把一筆入會申請當成續會處理。
  // 這樣舊帳號的點數、報名記錄與 LINE 綁定都留著，不會分裂成兩個編號。
  const handleAdoptApplicationAsRenewal = async (application: MemberApplication, existing: Member) => {
    if (!supabase) return;
    try {
      // 延長一年的規則與 handle_renewal_payment RPC 一致：
      // 還沒過期就從原到期日加一年，已過期／沒日期就從今天加一年。
      const todayTpe = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
      const current = existing.membership_expiry_date || '';
      const base = current > todayTpe ? current : todayTpe;
      const [by, bm, bd] = base.split('-').map(Number);
      const next = new Date(by + 1, bm - 1, bd);
      // 2/29 加一年會溢位到 3/1，退回該月最後一天，與 Postgres 的 +1 year 行為一致
      if (next.getMonth() !== bm - 1) next.setDate(0);
      const newExpiry = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;

      // payment_records 是 text 欄位存 JSON 陣列，舊資料可能是空的或壞的，解不開就從頭來
      let records: any[] = [];
      try {
        const parsed = JSON.parse(existing.payment_records || '[]');
        if (Array.isArray(parsed)) records = parsed;
      } catch { /* 忽略壞掉的舊值 */ }
      records.push(buildJoinPaymentRecord(application));

      // 用新申請的資料更新聯絡與事業欄位（這些通常就是他重新申請的原因），
      // 但 member_no / points_balance / line_user_id / join_date 一律不動。
      const { error: updErr } = await supabase.from('members').update({
        status: 'active',
        membership_expiry_date: newExpiry,
        id_number: application.id_number,
        birthday: application.birthday,
        phone: application.phone,
        email: application.email,
        home_phone: application.home_phone,
        address: application.address,
        industry_category: application.industry_category,
        brand_name: application.brand_name,
        company_title: application.company_title,
        tax_id: application.tax_id,
        job_title: application.job_title,
        website: application.website,
        main_service: application.main_service,
        payment_records: JSON.stringify(records)
      }).eq('id', existing.id);
      if (updErr) throw updErr;

      const { error: appErr } = await supabase
          .from('member_applications')
          .update({ status: 'approved' })
          .eq('id', application.id);
      if (appErr) throw appErr;

      alert(`已沿用會員編號 ${existing.member_no}\n會籍延長至 ${newExpiry}`);
      await fetchData();
    } catch (error: any) {
      console.error(error);
      alert('沿用舊會員失敗：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMemberApplication = async (application: MemberApplication) => {
    if (!supabase) return;
    setLoading(true);
    try {
      // 防重複建立：若已有會員用此入會訂單號建立過，代表已核准，直接中止（避免同一申請被核准兩次產生重複會員）
      const joinOrderNo = (application as any).merchant_order_no;
      if (joinOrderNo) {
        const { data: dup } = await supabase.from('members').select('member_no').ilike('payment_records', `%${joinOrderNo}%`).limit(1);
        if (dup && dup.length > 0) {
          alert(`此申請已建立會員（編號 ${dup[0].member_no}），不重複建立。`);
          setLoading(false);
          return;
        }
      }

      // 重複入會偵測：沒續約而是重新申請入會的人，手機／姓名／生日會跟舊會員完全一樣。
      // 直接核准會產生第二筆 members，舊那筆的點數、報名記錄與 LINE 綁定都會跟新編號分家。
      const applicantPhone = normalizePhone(application.phone);
      const applicantName = (application.name || '').trim();
      const todayTpe = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
      let existing: Member | null = null;
      if (applicantPhone && applicantName) {
        // 姓名前後可能有空白、手機格式也不一（有的帶 -、有的帶 +886），
        // 所以整批撈回來在前端正規化比對，比在 SQL 端拼條件可靠。
        const { data: allMembers, error: dupErr } = await supabase
            .from('members')
            .select('id, member_no, name, phone, status, membership_expiry_date, payment_records');
        if (dupErr) throw dupErr;
        const matches = (allMembers || []).filter(
            (m: any) => (m.name || '').trim() === applicantName
                && normalizePhone(m.phone) === applicantPhone
        );
        // 有多筆時挑目前最有效的那筆來提示（排序規則與 member_bind_line RPC 一致）
        matches.sort((a: any, b: any) => {
          const rank = (m: any) => [
            m.status === 'active' ? 1 : 0,
            (m.membership_expiry_date || '') >= todayTpe ? 1 : 0,
          ].join('');
          if (rank(a) !== rank(b)) return rank(b).localeCompare(rank(a));
          return (b.membership_expiry_date || '').localeCompare(a.membership_expiry_date || '');
        });
        existing = (matches[0] as Member) || null;
      }

      if (existing) {
        const expiry = existing.membership_expiry_date || '';
        const stillValid = existing.status === 'active' && expiry >= todayTpe;
        const stateText = stillValid ? `會籍有效，到期 ${expiry}` : `已失效${expiry ? `，到期 ${expiry}` : ''}`;

        const adopt = confirm(
            `${applicantName} 已經是會員了。\n\n` +
            `　會員編號：${existing.member_no}（${stateText}）\n\n` +
            `【確定】沿用這個編號，把這筆申請當成續會：延長會籍一年、更新資料、\n` +
            `　　　　保留原有的點數／報名記錄／LINE 綁定。（建議）\n\n` +
            `【取消】不要沿用，另外處理。`
        );

        if (adopt) {
          await handleAdoptApplicationAsRenewal(application, existing);
          return;
        }

        const createAnyway = confirm(
            `仍要另外建立一筆全新的會員資料嗎？\n\n` +
            `⚠️ 系統裡會同時存在兩筆「${applicantName}」，` +
            `舊編號 ${existing.member_no} 的點數、報名記錄與 LINE 綁定不會轉移過來。\n\n` +
            `只有在確定是「同名同姓的不同人」時才這樣做。`
        );
        if (!createAnyway) { setLoading(false); return; }
      }

      const { data: members, error: fetchError } = await supabase.from('members').select('member_no');
      if (fetchError) throw fetchError;
      const maxNo = members?.reduce((max, m) => {
        const num = parseInt(m.member_no);
        return !isNaN(num) && num > max ? num : max;
      }, 0) || 0;
      const nextNo = (maxNo + 1).toString().padStart(5, '0');

      const paymentRecord = buildJoinPaymentRecord(application);

      const newMember = {
        id: crypto.randomUUID(),
        member_no: nextNo,
        status: 'active',
        membership_expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
        join_date: new Date().toISOString().slice(0, 10),
        name: application.name,
        id_number: application.id_number,
        birthday: application.birthday,
        referrer: application.referrer,
        phone: application.phone,
        email: application.email,
        home_phone: application.home_phone,
        address: application.address,
        industry_category: application.industry_category,
        brand_name: application.brand_name,
        company_title: application.company_title,
        tax_id: application.tax_id,
        job_title: application.job_title,
        website: application.website,
        main_service: application.main_service,
        notes: application.notes,
        payment_records: JSON.stringify([paymentRecord])
      };

      const { error: insertError } = await supabase.from('members').insert([newMember]);
      if (insertError) throw insertError;
      const { error: updateError } = await supabase.from('member_applications').update({ status: 'approved' }).eq('id', application.id);
      if (updateError) throw updateError;

      alert(`核准成功！\n會員編號：${nextNo}`);
      await fetchData();
    } catch (error: any) { console.error(error); alert('核准失敗：' + error.message); } finally { setLoading(false); }
  };

  const handleDeleteMemberApplication = async (id: string | number) => {
    if (!supabase) return;
    if (!confirm('確定刪除此申請？')) return;
    setLoading(true);
    try {
       const { error } = await supabase.from('member_applications').delete().eq('id', id);
       if (error) throw error;
       await fetchData();
    } catch (error: any) { alert('刪除失敗：' + error.message); } finally { setLoading(false); }
  };

  // SSR 預渲染：伺服端（無 window）以 StaticRouter 渲染，並繞過 loading/錯誤 gate 直接出路由內容。
  // 客戶端維持 BrowserRouter 與原本的 loading 行為。
  const ssrUrl = typeof window === 'undefined' ? ((globalThis as any).__SSR_URL__ || '/') : null;
  const isSSR = ssrUrl !== null;
  const ChosenRouter: any = isSSR ? StaticRouter : Router;
  const routerProps: any = isSSR ? { location: ssrUrl } : {};

  if (loading && !isSSR) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
      <Loader2 className="animate-spin text-red-600" size={56} />
      {migrationStatus ? (
        <p className="text-gray-600 font-medium animate-pulse">{migrationStatus}</p>
      ) : (
        <p className="text-gray-500 font-medium">系統載入中...</p>
      )}
      {dbError && <p className="text-red-500 font-medium">{dbError}</p>}
    </div>
  );

  if (!isSSR && dbError && activities.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
      <XCircle className="text-red-500 mb-4" size={64} />
      <h2 className="text-2xl font-bold mb-2">系統連線錯誤</h2>
      <p className="text-gray-600 mb-6">{dbError}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="bg-red-600 text-white px-6 py-2 rounded-full font-bold hover:bg-red-700 transition-colors"
      >
        重新整理
      </button>
    </div>
  );

  return (
    <ChosenRouter {...routerProps}>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-gray-50/30">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<><Seo title="食在力量 - 連結產業，創造共好" path="" /><Home activities={activities} memberActivities={memberActivities} /></>} />
              <Route path="/activities" element={<><Seo title="協會活動" path="/activities" description="食在力量協會活動：講座論壇、企業參訪、美食小聚等，立即線上報名。" /><ActivitiesPage activities={activities} memberActivities={memberActivities} loading={loading} /></>} />
              <Route path="/about" element={<><Seo title="關於我們" path="/about" description="認識食在力量美食產業交流協會的理念、組織與服務，連結餐飲與美食產業菁英。" /><AboutUs /></>} />
              <Route path="/members" element={<><Seo title="會員名單" path="/members" description="食在力量會員名單，匯聚餐飲服務、美食產品、通路行銷等各領域產業夥伴。" /><MemberList members={members} /></>} />
              <Route path="/join" element={<><Seo title="加入會員" path="/join" description="加入食在力量會員，共享產業資源、活動優惠與商務連結。年費 NT$ 5,000。" /><MemberJoin /></>} />
              <Route path="/renew" element={<><Seo title="會員續費" path="/renew" description="食在力量會員續費，延續會籍與產業夥伴連結。" /><MemberRenewal /></>} />
              <Route path="/activity/:id" element={<ActivityDetail type="general" activities={activities} members={members} onRegister={handleRegister} registrations={registrations} validateCoupon={validateCoupon} />} />
              <Route path="/member-activity/:id" element={<ActivityDetail type="member" activities={memberActivities} members={members} onMemberRegister={handleMemberRegister} memberRegistrations={memberRegistrations} validateCoupon={validateCoupon} />} />
              <Route path="/pay-application/:id" element={<><Seo title="入會繳費" path="/join" noindex /><ApplicationPayment /></>} />
              <Route path="/pay-renewal/:id" element={<><Seo title="續費繳費" noindex /><RenewalPayment /></>} />
              <Route path="/pay-activity/:id" element={<><Seo title="活動繳費" noindex /><ActivityPayment /></>} />
              <Route path="/pay-festival/:id" element={<><Seo title="燒肉/火鍋祭繳費" noindex /><FestivalRegistrationPayment /></>} />
              <Route path="/payment-result" element={<><Seo title="付款結果" noindex /><PaymentResult /></>} />
              <Route path="/milestones" element={<><Seo title="協會大事記" path="/milestones" description="食在力量發展歷程與重要里程碑回顧。" /><MilestoneTimeline /></>} />
              <Route path="/articles" element={<><Seo title="產業專欄" path="/articles" description="食在力量產業專欄：產業資訊、專家觀點與協會動態，掌握餐飲與美食產業第一手洞見。" /><ArticleList articles={articles} /></>} />
              <Route path="/article/:slug" element={<ArticleDetail articles={articles} />} />
              <Route path="/festival" element={<><Seo title="燒肉祭・火鍋祭" path="/festival" description="食在力量燒肉祭・火鍋祭，匯聚美食品牌的產業合作盛會。" image="https://www.foodpowerteam.com/og-brand.jpg" /><Festival /></>} />
              <Route path="/festival/pay" element={<FestivalPayment />} />
              <Route path="/festival/apply" element={<FestivalApply />} />
              {/* 隱藏連結：免上架費專案版（不從站內任何地方連出，僅私下提供給特殊品牌） */}
              <Route path="/festival/apply-vip" element={<FestivalApply waiveListingFee />} />
              <Route path="/design" element={<DesignDemoIndex />} />
              <Route path="/design/jp" element={<DesignDemoJP />} />
              <Route path="/design/eu" element={<DesignDemoEU />} />
              <Route path="/design/cn" element={<DesignDemoCN />} />
              <Route path="/checkin/:activityId" element={<><Seo title="活動報到" noindex /><ActivityCheckIn /></>} />
              <Route path="/signup/:activityId" element={<><Seo title="接龍報名" noindex /><SignupChain /></>} />
              <Route path="/signup" element={<><Seo title="接龍報名" noindex /><SignupChain /></>} />
              <Route path="/pay-signup/:id" element={<><Seo title="接龍報名繳費" noindex /><SignupPayment /></>} />
              <Route path="/receipt/:token" element={<><Seo title="電子收據" noindex /><ReceiptView /></>} />

              <Route path="/admin/login" element={currentUser ? <Navigate to="/admin" /> : <><Seo title="後台登入" noindex /><LoginPage /></>} />
              
              <Route path="/admin/*" element={
                !authResolved ? (
                  <div className="min-h-screen flex items-center justify-center bg-white">
                    <Loader2 className="animate-spin text-red-600" size={48} />
                  </div>
                ) : currentUser ? (
                  <AdminDashboard 
                    currentUser={currentUser}
                    onLogout={handleLogout}
                    activities={activities} 
                    memberActivities={memberActivities}
                    clubActivities={clubActivities}
                    registrations={registrations}
                    signupEntries={signupEntries}
                    onRefreshSignupEntries={refreshSignupEntries}
                    onToggleSignupCheckin={handleToggleSignupCheckin}
                    articles={articles}
                    onAddArticle={handleAddArticle}
                    onUpdateArticle={handleUpdateArticle}
                    onDeleteArticle={handleDeleteArticle}
                    memberRegistrations={memberRegistrations}
                    users={users}
                    members={members}
                    memberApplications={memberApplications}
                    milestones={milestones}
                    coupons={coupons}
                    onUpdateActivity={handleUpdateActivity}
                    onAddActivity={handleAddActivity}
                    onDeleteActivity={handleDeleteActivity}
                    onUpdateMemberActivity={handleUpdateMemberActivity}
                    onAddMemberActivity={handleAddMemberActivity}
                    onDeleteMemberActivity={handleDeleteMemberActivity}
                    onUpdateClubActivity={handleUpdateClubActivity}
                    onAddClubActivity={handleAddClubActivity}
                    onDeleteClubActivity={handleDeleteClubActivity}
                    onUpdateRegistration={handleUpdateRegistration}
                    onDeleteRegistration={handleDeleteRegistration}
                    onUpdateMemberRegistration={handleUpdateMemberRegistration}
                    onDeleteMemberRegistration={handleDeleteMemberRegistration}
                    onAddRegistrations={handleAddRegistrations}
                    onAddMemberRegistrations={handleAddMemberRegistrations}
                    onRefreshRegistrations={refreshRegistrations}
                    onAddUser={handleAddUser}
                    onDeleteUser={handleDeleteUser}
                    onAddMember={handleAddMember}
                    onAddMembers={handleAddMembers}
                    onUpdateMember={handleUpdateMember}
                    onDeleteMember={handleDeleteMember}
                    onAdjustPoints={handleAdjustPoints}
                    onFetchPointsLedger={fetchPointsLedger}
                    onUploadImage={handleUploadImage}
                    onGenerateCoupons={handleGenerateCoupons}
                    onGenerateVipInvites={handleGenerateVipInvites}
                    onGenerateMembershipCoupons={handleGenerateMembershipCoupons}
                    onUpdateCouponNote={handleUpdateCouponNote}
                    onApproveMemberApplication={handleApproveMemberApplication}
                    onDeleteMemberApplication={handleDeleteMemberApplication}
                    onAddMilestone={handleAddMilestone}
                    onUpdateMilestone={handleUpdateMilestone}
                    onDeleteMilestone={handleDeleteMilestone}
                    financialRecords={financialRecords}
                    onAddFinancialRecord={handleAddFinancialRecord}
                    onUpdateFinancialRecord={handleUpdateFinancialRecord}
                    onDeleteFinancialRecord={handleDeleteFinancialRecord}
                  />
                ) : (
                  <Navigate to="/admin/login" />
                )
              } />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </ChosenRouter>
  );
};

// LIFF 電子名片：在 LINE App 內開啟時，短路成獨立全頁（跳過全站資料載入與導覽）。
// 支援直接進入 /liff/card，或 OAuth 重導回來時參數包在 liff.state 的情況。
const Root: React.FC = () => {
  if (typeof window !== 'undefined') {
    const p = window.location.pathname;
    const s = window.location.search;
    // 會員專區 LIFF（獨立全頁）
    if (p.startsWith('/liff/member') || /liff\.state=.*(%2F|\/)liff(%2F|\/)member/i.test(s)) {
      return (<Suspense fallback={<PageLoader />}><LiffMember /></Suspense>);
    }
    // 電子名片 LIFF：/liff/card，或 OAuth 重導回來時 ?member=／?ids= 包在 liff.state
    const isCardPath =
      p.startsWith('/liff/card') ||
      (s.includes('liff.state') && /(member|ids)(=|%3D)/.test(s));
    if (isCardPath) {
      return (
        <Suspense fallback={<PageLoader />}>
          <LiffCard />
        </Suspense>
      );
    }
  }
  return <App />;
};

export default Root;
