
export enum ActivityType {
  GATHERING = '講座論壇',
  VISIT = '企業參訪',
  COURSE = '專業課程',
  DINNER = '交流餐敘',
  PROJECT = '專案活動'
}

export enum UserRole {
  STAFF = '工作人員',
  MANAGER = '管理員',
  SUPER_ADMIN = '總管理員'
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
}

export enum PaymentStatus {
  PENDING = 'pending',   // 待付款
  PAID = 'paid',         // 已付款
  FAILED = 'failed',     // 付款失敗
  REFUNDED = 'refunded', // 已退款
  PROCESSED = 'processed', // 已處理 (人工確認)
}

export type ActivityAudience = 'public' | 'member_only' | 'club';

// 統一活動型別 — Phase 3 後三表合一，以 audience 區分對象
export interface Activity {
  id: string | number;
  audience: ActivityAudience;
  title: string;
  date: string;
  picture: string;
  description: string;
  status?: 'active' | 'closed';
  created_at?: string;

  // 報名類活動 (public / member_only) 必填，club 類可缺
  type?: ActivityType;
  time?: string;
  location?: string;
  price?: number;
  member_price?: number;

  // club 類專用
  link?: string;
}

// Back-compat aliases — 舊 code 仍可 import MemberActivity / ClubActivity，型別等同 Activity
export type MemberActivity = Activity;
export type ClubActivity = Activity;

// 統一報名 — 以 audience 區分；會員報名時 member_id / member_name / member_no 必填
export interface Registration {
  id: string | number;
  activityId: string | number;
  audience: ActivityAudience;

  // 個人欄位（公開活動必填，會員活動則從 members 表 join 帶入）
  name: string;
  phone: string;
  email: string;
  company?: string;
  company_title?: string;
  tax_id?: string;
  title?: string;
  referrer?: string;
  notes?: string;
  check_in_status?: boolean;
  paid_amount?: number;
  coupon_code?: string;

  // 點數抵扣
  points_used?: number;
  points_status?: 'frozen' | 'redeemed' | 'refunded';

  // 會員報名專用
  member_id?: string;
  member_name?: string;
  member_no?: string;

  // 金流相關
  payment_status?: PaymentStatus;
  merchant_order_no?: string;
  payment_method?: string;
  paid_at?: string;

  // 收據
  invoice_no?: string;
  invoice_status?: string;

  created_at: string;
}

// Back-compat alias
export type MemberRegistration = Registration & {
  memberId: string | number;
  member_name: string;
  member_no: string;
};

// ── 接龍報名（Signup Chain）綁協會活動 activities ──
export interface SignupSettings {
  activity_id: string;
  capacity: number;
  registration_open: boolean;
  fee_amount: number;
  member_fee_amount?: number | null;  // 會員價（null = 與一般價相同）
  payment_deadline_hours?: number | null;
  payment_mode: 'online' | 'self';   // online=藍新金流 / self=發起人自主收款
  collect_note?: string | null;       // 自主收款說明（匯款帳號/現場繳費等）
  host_name?: string | null;          // 主辦人姓名（報名者可聯絡）
  host_phone?: string | null;         // 主辦人手機
  created_at?: string;
}

export interface SignupEntry {
  id: string;
  activity_id: string;
  name: string;
  company?: string;
  company_title?: string;  // 公司抬頭（收據用）
  tax_id?: string;         // 統一編號
  title?: string;          // 職務
  referrer?: string;       // 引薦人
  notes?: string;          // 備註
  phone?: string;   // 敏感：僅後台（authenticated）可讀，匿名走 signup_entries_public 不含此欄
  email?: string;   // 敏感：同上
  status: 'confirmed' | 'waitlist';
  payment_status: 'unpaid' | 'paid' | 'refunded';
  paid_amount?: number;
  member_id?: string | null;  // 報名當下命中的在會會員（有值＝套用會員價）
  fee_amount?: number | null; // 報名當下鎖定的應付價
  merchant_order_no?: string;
  paid_at?: string;
  check_in_status?: boolean;
  created_at: string;
}

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  password?: string;
}

// 新增：產業分類列舉
export const IndustryCategories = [
  '餐飲服務', // 餐廳/外燴
  '美食產品', // 糕餅/飲品/伴手禮
  '通路行銷', // 團購/零售/社群/行銷工具
  '營運協作', // 設備/包材/物流/檢驗
  '原物料',   // 生鮮/蔬果/雜糧
  '加工製造', // 生產/代工
  '其他'     // 其他
] as const;

export type IndustryCategoryType = typeof IndustryCategories[number];

// --- 文章/專欄 ---
export const ARTICLE_CATEGORIES = [
  '產業資訊',
  '專家觀點',
  '協會動態',
  '活動報導'
] as const;
export type ArticleCategory = typeof ARTICLE_CATEGORIES[number];

export interface Article {
  id: string | number;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;            // BlockEditor JSON string of Block[]
  cover?: string;             // 封面圖 URL
  category?: string;
  author_name?: string;
  author_title?: string;
  author_bio?: string;
  author_avatar?: string;
  status: 'draft' | 'published';
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Member {
  id: string | number;
  
  // --- 會籍管理 ---
  status: 'active' | 'inactive'; // 活躍/失效 (邏輯判斷：若今日 > 到期日 ? inactive : status)
  membership_expiry_date?: string; // 會籍到期日 (YYYY-MM-DD)
  notes?: string; // 備註
  payment_records?: any; // 會籍繳費記錄 (文字描述或 JSON string)
  points_balance?: number; // 會員點數餘額

  // --- 個人資料 ---
  member_no: string; // 會員編號 (系統自動產生)
  name: string; // 中文姓名
  id_number?: string; // 身分證字號
  birthday?: string; // 生日
  phone?: string; // 手機
  email?: string; // 信箱 (新增，用於寄送折扣券)
  address?: string; // 通訊地址
  home_phone?: string; // 室內電話
  referrer?: string; // 引薦人

  // --- 事業資料 ---
  industry_category: IndustryCategoryType | string; // 產業分類 (取代原本的 chain/category)
  brand_name?: string; // 品牌名稱
  company_title?: string; // 公司抬頭
  tax_id?: string; // 統一編號
  job_title?: string; // 職稱
  main_service?: string; // 主要服務/產品
  website?: string; // 網站
  picture?: string; // 大頭照（LINE 電子名片用）

  // 相容性保留 (Optional)
  company?: string; // 對應到 brand_name 或 company_title
  intro?: string;   // 對應到 main_service
  industry_chain?: string; // 舊分類，可選
  join_date?: string;
  quit_date?: string;
}

// 新增：會員申請資料
export interface MemberApplication {
  id: string | number;
  
  // 基本資料
  name: string;
  id_number: string;
  birthday: string;
  referrer: string;
  
  // 聯絡方式
  phone: string;
  email: string;
  home_phone: string;
  address: string;
  
  // 事業資料
  industry_category: IndustryCategoryType | string;
  brand_name: string;
  company_title: string;
  tax_id: string;
  job_title: string;
  main_service: string;
  website: string;
  notes: string;
  
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;

  // 金流相關
  payment_status?: PaymentStatus;
  merchant_order_no?: string;
  paid_amount?: number;
  payment_method?: string;
  paid_at?: string;
}

export interface AttendanceRecord {
  id?: string | number;
  activity_id: string;
  member_id: string;
  status: AttendanceStatus;
  updated_at?: string;
}

export interface Coupon {
  id: string | number;
  code: string;
  activity_id: string;
  member_id?: string;
  discount_amount: number;
  is_free?: boolean; // VIP 免費邀請券（100% 免費）
  note?: string; // 備註：發送對象 / 發放原因
  is_used: boolean;
  created_at: string;
  used_at?: string;
}

// 點數帳本（對應 supabase_points.sql 的 points_ledger 表）
export interface PointsLedgerEntry {
  id: string;
  member_id: string;
  change: number;          // 正=增加, 負=扣除, 0=核銷標記
  balance_after?: number;  // 異動後餘額快照
  type: 'earn' | 'freeze' | 'redeem' | 'refund' | 'adjust';
  reason?: string;
  ref_type?: 'registration' | 'application' | 'renewal' | 'admin';
  ref_id?: string;
  order_no?: string;
  created_by?: string;     // 手動調整時記管理員 email
  created_at: string;
}

export interface Receipt {
  id: string;
  receipt_no: string;
  payer_name: string;
  tax_id?: string;
  amount: number;
  payment_method: string;
  fee_type: string;
  order_no?: string;
  issue_date: string;
  handler_name: string;
  note?: string;
  status?: string;
  email?: string;
  created_at: string;
}

export interface Milestone {
  id: string | number;
  date: string;
  title: string;
  picture?: string;
  description?: string;
  created_at?: string;
}

export enum FinancialType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export interface FinancialRecord {
  id: string | number;
  date: string;
  type: FinancialType;
  category: string;
  amount: number;
  invoice_no?: string;
  party?: string;
  description?: string;
  receipt_url?: string;
  created_at?: string;
}

export interface FinanceRecord {
  id: string | number;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  target: string;
  invoice_no?: string;
  document_url?: string;
  handler_name: string;
  note?: string;
  created_at?: string;
}

export interface Transaction {
  id: string | number;
  date: string;
  type: 'income' | 'expenditure';
  category: string;
  amount: number;
  entity?: string;
  description?: string;
  invoice_number?: string;
  note?: string;
  document_url?: string;
  created_at?: string;
}
