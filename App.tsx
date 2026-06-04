
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
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

import { Activity, MemberActivity, Registration, MemberRegistration, AdminUser, Member, Coupon, MemberApplication, UserRole, ClubActivity, Milestone, FinancialRecord } from './types';
import { INITIAL_ACTIVITIES, INITIAL_MEMBERS, EMAIL_CONFIG } from './constants';
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
  pathname.startsWith('/festival') || pathname.startsWith('/design') || pathname.startsWith('/checkin');

// 載入中元件
const PageLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
    <Loader2 className="animate-spin text-red-600" size={40} />
    <p className="text-gray-500 font-medium">頁面載入中...</p>
  </div>
);

// 定義系統擁有者 (白名單)，確保即使資料庫設定錯誤也能登入
const SYSTEM_OWNERS = ['mr.ogenki@gmail.com'];

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
            <Link to="/" className="text-gray-600 hover:text-red-600 transition-colors font-bold text-lg uppercase tracking-widest">首頁</Link>
            <Link to="/about" className="text-gray-600 hover:text-red-600 transition-colors font-bold text-lg uppercase tracking-widest">關於我們</Link>
            <Link to="/milestones" className="text-gray-600 hover:text-red-600 transition-colors font-bold text-lg uppercase tracking-widest">大事記</Link>
            <Link to="/activities" className="text-gray-600 hover:text-red-600 transition-colors font-bold text-lg uppercase tracking-widest">協會活動</Link>
            <Link to="/members" className="text-gray-600 hover:text-red-600 transition-colors font-bold text-lg uppercase tracking-widest">會員列表</Link>
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
            <Link to="/" onClick={() => setIsOpen(false)} className="block text-xl font-bold text-gray-900 px-4 py-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">首頁</Link>
            <Link to="/about" onClick={() => setIsOpen(false)} className="block text-xl font-bold text-gray-900 px-4 py-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">關於我們</Link>
            <Link to="/milestones" onClick={() => setIsOpen(false)} className="block text-xl font-bold text-gray-900 px-4 py-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">大事記</Link>
            <Link to="/activities" onClick={() => setIsOpen(false)} className="block text-xl font-bold text-gray-900 px-4 py-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">協會活動</Link>
            <Link to="/members" onClick={() => setIsOpen(false)} className="block text-xl font-bold text-gray-900 px-4 py-2 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all">會員列表</Link>
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

      // 非管理員時，背景載入會員名單 (用於會員頁面)
      if (!currentUser) {
        supabase.from('members').select('*').then(({ data }) => {
          if (data && data.length > 0) {
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
        });
      }

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

  const validateCoupon = async (code: string, activityId: string): Promise<{valid: boolean, discount?: number, message: string, couponId?: string}> => {
    if (!supabase) return { valid: false, message: '系統連線錯誤' };
    const { data, error } = await supabase.from('coupons').select('*').eq('code', code).single();
    if (error || !data) return { valid: false, message: '無效的折扣碼' };
    if (String(data.activity_id) !== String(activityId)) return { valid: false, message: '此折扣碼不適用於本活動' };
    if (data.is_used) return { valid: false, message: '此折扣碼已被使用' };
    return { valid: true, discount: data.discount_amount, message: '折扣碼適用', couponId: data.id };
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
    const payload = { ...newReg, audience: newReg.audience || 'public' };
    const { error } = await supabase.from('registrations').insert([payload]);
    if (error) { alert('報名失敗：' + error.message); return false; }
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
  const handleAddUser = async (newUser: AdminUser) => { if (!supabase) return; await supabase.from('admins').insert([newUser]); fetchData(); };
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
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m).sort((a, b) => String(a.member_no || '').localeCompare(String(b.member_no || ''), undefined, { numeric: true })));
    if (!supabase) return; 
    const { error } = await supabase.from('members').update(updated).eq('id', updated.id); 
    if (error) { alert('更新會員失敗：' + error.message); fetchMembers(); }
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

  const handleGenerateCoupons = async (activityId: string, amount: number, memberIds: string[], sendEmail: boolean) => {
    if (!supabase) return;
    setLoading(true);
    try {
      const coupons = memberIds.map(mid => ({
        activity_id: activityId,
        member_id: mid,
        discount_amount: amount,
        is_used: false,
        code: `ACT${activityId.slice(-3)}-M${mid.slice(-3)}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      }));
      await supabase.from('coupons').insert(coupons);
      alert(`成功產生 ${coupons.length} 張折扣券`);
      fetchData();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleApproveMemberApplication = async (application: MemberApplication) => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: members, error: fetchError } = await supabase.from('members').select('member_no');
      if (fetchError) throw fetchError;
      const maxNo = members?.reduce((max, m) => {
        const num = parseInt(m.member_no);
        return !isNaN(num) && num > max ? num : max;
      }, 0) || 0;
      const nextNo = (maxNo + 1).toString().padStart(5, '0');

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

      const paymentRecord = {
        id: Date.now(),
        date: application.paid_at ? application.paid_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        amount: application.paid_amount || 0,
        note: `入會費 (${translatePaymentMethod(application.payment_method)}) - 訂單編號: ${application.merchant_order_no || '無'}`
      };

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

  if (loading) return (
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

  if (dbError && activities.length === 0) return (
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
    <Router>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-gray-50/30">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home activities={activities} memberActivities={memberActivities} />} />
              <Route path="/activities" element={<ActivitiesPage activities={activities} memberActivities={memberActivities} loading={loading} />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/members" element={<MemberList members={members} />} />
              <Route path="/join" element={<MemberJoin />} />
              <Route path="/renew" element={<MemberRenewal />} />
              <Route path="/activity/:id" element={<ActivityDetail type="general" activities={activities} members={members} onRegister={handleRegister} registrations={registrations} validateCoupon={validateCoupon} />} />
              <Route path="/member-activity/:id" element={<ActivityDetail type="member" activities={memberActivities} members={members} onMemberRegister={handleMemberRegister} memberRegistrations={memberRegistrations} validateCoupon={validateCoupon} />} />
              <Route path="/pay-application/:id" element={<ApplicationPayment />} />
              <Route path="/pay-renewal/:id" element={<RenewalPayment />} />
              <Route path="/pay-activity/:id" element={<ActivityPayment />} />
              <Route path="/pay-festival/:id" element={<FestivalRegistrationPayment />} />
              <Route path="/payment-result" element={<PaymentResult />} />
              <Route path="/milestones" element={<MilestoneTimeline />} />
              <Route path="/festival" element={<Festival />} />
              <Route path="/festival/pay" element={<FestivalPayment />} />
              <Route path="/festival/apply" element={<FestivalApply />} />
              {/* 隱藏連結：免上架費專案版（不從站內任何地方連出，僅私下提供給特殊品牌） */}
              <Route path="/festival/apply-vip" element={<FestivalApply waiveListingFee />} />
              <Route path="/design" element={<DesignDemoIndex />} />
              <Route path="/design/jp" element={<DesignDemoJP />} />
              <Route path="/design/eu" element={<DesignDemoEU />} />
              <Route path="/design/cn" element={<DesignDemoCN />} />
              <Route path="/checkin/:activityId" element={<ActivityCheckIn />} />

              <Route path="/admin/login" element={currentUser ? <Navigate to="/admin" /> : <LoginPage />} />
              
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
                    onUploadImage={handleUploadImage}
                    onGenerateCoupons={handleGenerateCoupons}
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
    </Router>
  );
};

export default App;
