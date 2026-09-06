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
# ⚠️ 一定要在「專案根目錄」執行，且務必加 --project-ref，避免 CLI 往上層找到
#    /Users/jackhsu/supabase（舊 linked 副本）而部署到過時程式碼。
# 專案 supabase/config.toml 已建立，確保 CLI 以本專案為 workdir。
supabase functions deploy newebpay-notify --no-verify-jwt --project-ref igowitmbnlvzznqgfpfl
```

## 🚨 Supabase 專案（重要）
- **正式站（www.foodpowerteam.com）= 東京 `igowitmbnlvzznqgfpfl`（ap-northeast-1）**。2026-07-12 由印度遷移至此，前端 `VITE_SUPABASE_URL` / `supabaseClient.ts` 預設皆指向東京。
- 舊專案 `kpltydyspvzozgxfiwra`（ap-south-1 印度）為遷移前副本，**已於 2026-08-21 永久刪除**（刪前確認：程式/文件無引用、無 app 流量、東京 DB 無任何印度圖片網址）。
- **所有 DB migration、`execute_sql`、Edge Function 部署一律用 `igowitmbnlvzznqgfpfl`。**

### Edge Functions（部署目標：igowitmbnlvzznqgfpfl）
| Function | 用途 |
|----------|------|
| `newebpay-notify` | 藍新背景通知（NotifyURL）→ 更新付款狀態、發 Telegram/Email、點數核銷 |
| `newebpay-query` | 後備：付款返回頁主動向藍新 QueryTradeInfo 確認，補寫漏接的付款（需帶 User-Agent 過 Akamai WAF）|
| `festival-apply` | 燒肉/火鍋祭合作報名寫入 + Telegram 通知 |
| `create-admin` | 總管理員新增後台帳號（verify_jwt=true）|
| `send-email` | **共用寄信（Resend）**。所有信件 HTML 版型寫在此函式（`templates` map），前端 `supabase.functions.invoke('send-email',{body:{template,params}})`、Edge Function 以 service role JWT POST 呼叫。verify_jwt=true。|

付款相關 RPC（SECURITY DEFINER）：`handle_festival_payment`、`handle_renewal_payment`（含自動延長會籍、冪等）、`confirm_payment_paid`（後備跨表補寫）、`points_commit`/`points_refund`、`check_payment_status`。

### 📧 寄信（2026-09 由 EmailJS 全面改為 Resend）
- **統一走 `send-email` Edge Function（Resend）**，前端已移除 `@emailjs/browser`；信件版型全部在 `supabase/functions/send-email/index.ts` 的 `templates`：
  `signup_confirm`(接龍)、`activity_confirm`(一般活動)、`receipt`(收據)、`payment_notice`(通用繳費/入會/續費補寄)、`paid_confirm`(付款成功)、`renewal_reminder`(續約/喚醒)。
- 需要的 Supabase secrets：`RESEND_API_KEY`（必要）、`RESEND_FROM`（預設 `食在力量 <noreply@foodpowerteam.com>`，網域已在 Resend 驗證）、`RESEND_REPLY_TO`（選填）。
- 新增一種信：在 `send-email` 的 `templates` 加一個 builder → `deploy` → 呼叫端傳 `{template,params}`。**勿再用 EmailJS**。
- 舊的 `EMAILJS_*` secrets 已無用，可自行於後台刪除。

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
- 使用 `BrowserRouter`（乾淨路徑 `/join`）。Vercel 已設 `vercel.json` catch-all rewrite (`/(.*) → /index.html`) 處理 SPA 深連結；`index.tsx` 有 `#/path → /path` 相容轉址保住舊 HashRouter 連結。（SEO/AI 友善，2026/06 由 HashRouter 遷移）
- 每頁 SEO meta 由 `components/Seo.tsx` 提供（React 19 head hoisting；title 走 `document.title` 避免與 index.html 靜態 `<title>` 重複）。付款/收據/報到/後台頁設 `noindex`。`public/sitemap.xml`、`robots.txt` 已配置。
- `ScrollToTop` component 已加入，解決換頁不回頂的問題
- 活動圖片若存為 base64，系統管理員登入後會自動遷移至 Storage

### 時區處理（重要）
- Edge Function 跑在 **UTC** 環境。凡是要儲存「外部來源的台灣時間」（如藍新 `PayTime`，格式 `YYYY-MM-DD HH:mm:ss` 無時區），**必須明確補 `+08:00` 再轉 UTC**，否則會被當成 UTC 存入，前端用 `toLocaleString('zh-TW')` 再 +8，導致時間晚 8 小時。
  - 正解：`new Date(payTime.replace(' ','T') + '+08:00').toISOString()`
- DB 內若要「當下台灣日期/時間」，用 `now() AT TIME ZONE 'Asia/Taipei'`（收據 issue_date、財務 date 已採用）。
- 前端顯示一律用 `toLocaleString('zh-TW')`，DB 一律存 UTC `timestamptz`。

### 常見 Bug 與解法
| Bug | 原因 | 解法 |
|-----|------|------|
| 換頁出現大量空白 | SPA 不自動 reset scroll | `ScrollToTop` 已修復 |
| 圖片閃白 | Supabase Storage 冷啟動 | 加 `loading="eager"` |
| 後台無法登入 | session token 過期 | 清除 localStorage 重整 |
| 繳費時間晚 8 小時 | 藍新 PayTime(台灣時間) 在 UTC 環境被當 UTC 存 | notify 解析補 `+08:00`（已修） |
| LINE 會員綁定綁到過期的舊帳號 | 同一人有兩筆 members（沒續約、改用新申請入會），`member_bind_line` 的 `limit 1` 沒有 `order by` | 加排序永遠挑目前有效那筆＋自動搬移（已修，見下節） |


### LINE 會員綁定：一個人有兩筆 members 的情況

**踩過的雷（2026/09）：** 會員沒續約，而是以「新入會」重新申請，於是 `members` 裡同一個人有兩筆——舊的已過期（`inactive`）、新的有效。因為手機／姓名／生日完全一樣，`member_bind_line` 的 `select ... limit 1` **沒有 `order by`**，資料庫回哪一筆是隨機的，結果綁到了過期的舊帳號，會員專區顯示「會籍已過期／前往續費」。

`member_bind_line`（SECURITY DEFINER）現在的規則：

1. **挑「目前有效」那筆**：`active` > 未過期（比 `membership_expiry_date` 與台北today） > 到期日較晚 > `created_at` 較新。
2. **已經綁錯的會自動搬移**：LINE 已綁在一筆失效記錄上時，會找同一身分（手機／姓名／生日）中「有效且未被別的 LINE 綁走」的記錄，把綁定搬過去。所以受影響的人只要重開一次會員專區就會自己修好，不必人工處理。
3. **身分底下任一筆已被別的 LINE 綁走 → 一律擋下**（`此會員已綁定其他 LINE 帳號，請聯絡主辦`），不會退而綁到剩下那筆（多半是過期的舊記錄，綁上去只會看到過期的專區，比報錯更難懂）。
4. `line_user_id` 上有 partial unique index，搬移時**一定要先把舊的清成 null 再寫新的**。

⚠️ **點數與報名記錄是掛在 member id 上的，不會跟著搬。** 目前受影響的只有 1 位（王業勳 00054 → 00333，兩筆點數都是 0，無影響）。日後若遇到舊帳號有點數餘額或報名記錄，要人工併過去。

### 核准入會時的重複偵測（根因處理）

`App.tsx::handleApproveMemberApplication` 在建立新會員前，會先用**姓名 + 手機**找既有會員（姓名 `trim`、手機用 `normalizePhone` 去掉非數字並把 `886` 前綴換回 `0`——與 `member_bind_line` RPC 同一套規則；DB 裡手機格式不一，所以是整批撈回前端比對，不在 SQL 端拼條件）。找到就跳兩段確認：

1. **【確定】沿用舊編號**（建議）→ `handleAdoptApplicationAsRenewal`：把這筆入會申請當成續會。延長會籍一年、用申請表的新資料更新聯絡與事業欄位、把入會費追加進 `payment_records`，並把申請標成 `approved`。**`member_no` / `points_balance` / `line_user_id` / `join_date` 一律不動**，所以點數、報名記錄與 LINE 綁定都留在同一個編號底下。
2. **【取消】→ 第二段確認「仍要另外建立一筆全新的會員資料嗎？」** 只有確定是同名同姓的不同人才選是；會明說兩筆會並存、舊編號的點數與綁定不會轉移。

延長一年的規則與 `handle_renewal_payment` RPC 一致：未過期從原到期日 +1 年，已過期／無日期從台北今天 +1 年。2/29 加一年會溢位到 3/1，程式會退回該月最後一天，與 Postgres 的 `INTERVAL '1 year'` 行為對齊。

有多筆符合時，提示的是「目前最有效」那筆（排序規則同 `member_bind_line`）。

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
foodpowerteam/
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
