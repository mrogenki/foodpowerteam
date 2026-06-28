
import { Activity, ActivityType, AdminUser, UserRole, Member } from './types';

// ==========================================
// 點數機制設定
// ==========================================
export const POINT_TO_TWD = 1;        // 1 點 = NT$ 多少（換算率）
export const POINTS_ON_JOIN = 0;      // 入會贈點（0 = 不贈）
export const POINTS_ON_RENEWAL = 0;   // 續費贈點（0 = 不贈）
export const POINTS_EARN_RATE = 0;    // 每消費 N 元回饋 1 點（0 = 不回饋）

// ==========================================
// EmailJS 設定 (已更新為正式金鑰)
// ==========================================
export const EMAIL_CONFIG = {
  SERVICE_ID: 'service_z0iyas9',
  TEMPLATE_ID: 'template_ih0plai', // 一般活動報名用的模板
  MEMBER_JOIN_TEMPLATE_ID: 'template_gu7mwvm', // 新增：會員申請專用的模板
  RENEWAL_TEMPLATE_ID: 'template_3bgk8ts', // 新增：會員續約通知模板 (45天前)
  RECEIPT_TEMPLATE_ID: 'template_4eq02vf', // 更新為使用者提供的 Template ID
  PUBLIC_KEY: 'ajJknYqtnk3p1_WmI'
};

// ==========================================
// 收據印章（存 Supabase Storage 公開路徑，線上收據頁與後台共用）
// ==========================================
export const RECEIPT_STAMP_BUCKET = 'receipts';
export const RECEIPT_STAMP_PATH = '_assets/receipt-stamp.png';

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: '1',
    audience: 'public',
    type: ActivityType.GATHERING,
    title: '食在力量 - 十月講座論壇',
    date: '2025-10-18',
    time: '14:00',
    location: '台北市大安區忠孝東路四段 (食在力量總部)',
    price: 500,
    picture: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=2070&auto=format&fit=crop',
    description: '匯聚食品產業上下游夥伴，透過輕鬆的下午茶形式，交流近期市場動態與合作機會。',
    status: 'active'
  },
  {
    id: '2',
    audience: 'public',
    type: ActivityType.DINNER,
    title: '年終感恩交流餐敘',
    date: '2025-12-20',
    time: '18:00',
    location: '台北市信義區知名飯店',
    price: 1200,
    picture: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop',
    description: '感謝一年來的支持與陪伴，食在力量邀請您共度溫馨晚宴，展望來年新計畫。',
    status: 'active'
  }
];

// 已移除密碼欄位，此列表僅供系統初始化參考，不具登入功能
export const INITIAL_ADMINS: AdminUser[] = [
  {
    id: 'super-admin-01',
    name: '初始管理員',
    phone: '0900000000',
    role: UserRole.SUPER_ADMIN
  }
];

// 為了相容新舊資料結構，將舊資料對應到新欄位
// 預設將既有資料 map 到 '其他' 或接近的分類
export const INITIAL_MEMBERS: Member[] = [];
