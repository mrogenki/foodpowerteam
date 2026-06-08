# 食在力量 (foodpowerteam) — Claude Code 專案說明

## 專案概覽
食在力量美食產業交流協會官方網站。  
主要服務：協會會員 & 美食/餐飲產業經營者。  
網址：https://www.foodpowerteam.com

---

## 技術架構

| 層級 | 技術 |
|------|------|
| Frontend | React + TypeScript + Vite + Tailwind CSS + motion/react |
| 後端 | Supabase（PostgreSQL + Auth + Storage + Edge Functions）|
| 金流 | 藍新金流（NewebPay）|
| 部署 | Vercel（GitHub main branch 自動部署）|

---

## 程式碼位置
- **GitHub**：https://github.com/mrogenki/foodpowerteam
- **Vercel 專案 ID**：prj_zTFk42XfHEhkFQ4VJjAQq0mmU7NS
- **Vercel Team slug**：jacks-projects-42fe82a9

---

## 常用指令

```bash
# 安裝依賴
npm install

# 本機開發（port 3000）
npm run dev

# TypeScript 型別檢查（改完一定要跑）
npx tsc --noEmit

# Build
npm run build

# 部署：push 到 main 即自動觸發 Vercel
git push origin main

# Edge Function 部署（需 Supabase CLI）
supabase functions deploy newebpay-notify --no-verify-jwt
```

---

## 頁面結構（pages/）

| 頁面 | 路由 | 說明 |
|------|------|------|
| Home | `/` | 首頁，Hero 輪播 + CTA |
| Activities | `/activities` | 協會活動列表 |
| ActivityDetail | `/activity/:id` | 活動詳情 + 報名 |
| AboutUs | `/about` | 關於我們 |
| MilestoneTimeline | `/milestones` | 大事記（年份折疊）|
| MemberList | `/members` | 會員列表 |
| MemberJoin | `/join` | 加入會員 |
| MemberRenewal | `/renew` | 會員續費 |
| LoginPage | `/admin/login` | 後台登入 |
| AdminDashboard | `/admin/*` | 後台管理（分級權限）|
| PaymentResult | `/payment-result` | 金流回傳結果 |
| ApplicationPayment | `/pay-application/:id` | 入會費付款 |
| ActivityPayment | `/pay-activity/:id` | 活動報名付款 |
| RenewalPayment | `/pay-renewal/:id` | 續費付款 |

---

## 主要功能模組

### 活動管理
- 三種活動類型：協會活動（`activities`）/ 會員專屬（`member_activities`）/ 俱樂部（`club_activities`）
- 狀態：`active`（開放報名）/ `closed`（截止）

### 會員管理
- 流程：申請 → 審核 → 核准（自動產生 5 碼會員編號）→ 續費
- 資料表：`members`、`member_applications`

### 後台權限
- `SUPER_ADMIN`：總管，最高權限
- `ADMIN`：管理員
- `STAFF`：工作人員
- 系統擁有者白名單（不依賴 admins 表）：`mr.ogenki@gmail.com`

### 金流（藍新）
- 付款後回呼：`newebpay-notify` Edge Function
- 測試 / 正式金鑰需區分（`.env` 設定）

---

## 資料庫主要資料表（Supabase）

```
activities          協會活動
member_activities   會員專屬活動
club_activities     俱樂部活動
registrations       協會活動報名
member_registrations 會員活動報名
members             會員資料
member_applications 入會申請
admins              後台管理員
coupons             折扣券
milestones          大事記
financial_records   財務紀錄
```

---

## 圖片管理（Supabase Storage）

- Bucket：`activity-images`（Public）
- 資料夾結構：
  - `activity-covers/` — 活動封面圖
  - `documents/` — PDF 文件
  - `transactions/` — 財務單據

---

## 環境變數（.env）

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_FUNCTION_URL=
```

---

## 維護注意事項

### 部署流程
1. 改 code → `npx tsc --noEmit`（確認無型別錯誤）
2. `git push origin main` → Vercel 自動部署（約 1 分鐘）
3. Edge Function 異動需另外用 Supabase CLI 部署

### RLS 政策
- 公開頁面（活動、會員列表）：匿名可讀
- 管理員資料（報名、財務）：需登入
- 修改 RLS 前先在 Supabase Studio 測試，避免前台讀取異常

### 已知架構決策
- 使用 `HashRouter`（`/#/`）而非 BrowserRouter，部署在 Vercel 無需額外 rewrite 設定
- `ScrollToTop` component 已加入，解決換頁不回頂的問題
- 活動圖片若存為 base64，系統管理員登入後會自動遷移至 Storage

### 常見 Bug 與解法
| Bug | 原因 | 解法 |
|-----|------|------|
| 換頁出現大量空白 | SPA 不自動 reset scroll | `ScrollToTop` 已修復 |
| 圖片閃白 | Supabase Storage 冷啟動 | 加 `loading="eager"` |
| 後台無法登入 | session token 過期 | 清除 localStorage 重整 |

---

## Vite 打包設定（已優化）

```ts
// vite.config.ts - manualChunks 分包
vendor-react    // React 核心
vendor-motion   // motion/react 動畫庫
vendor-supabase // Supabase client
vendor-icons    // lucide-react 圖示
vendor-payment  // crypto-js 金流加密
```
index.js 已從 503KB 優化至 212KB（-58%）

---

## 專案結構

```
foodpowerteam1/
├── App.tsx              # 主路由、全域 state、Header、Footer
├── pages/               # 各頁面元件
├── components/          # 共用元件（BatchReceiptGenerator、BlockEditor 等）
├── utils/
│   ├── supabaseClient.ts
│   ├── newebpay.ts      # 藍新金流工具
│   └── notification.ts
├── types.ts             # 共用 TypeScript 型別
├── constants.tsx        # 常數、初始資料
├── supabase/functions/  # Edge Functions
└── public/
    ├── logo.svg
    └── robots.txt
```

---

## 開發規範

- 新增頁面：在 `pages/` 建立元件 → 在 `App.tsx` 加 `lazy import` + `<Route>`
- 新增資料表：先在 Supabase Studio 建立 + RLS → 在 `types.ts` 加型別 → 在 `App.tsx` `fetchData` 加查詢
- 樣式：優先使用 Tailwind utility classes，動畫用 `motion/react`
- 圖片上傳：一律透過 `handleUploadImage()` 傳至 Supabase Storage，不存 base64
