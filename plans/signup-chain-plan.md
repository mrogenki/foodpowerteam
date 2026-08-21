# 活動接龍報名（Signup Chain）實作計畫

> 目標：為 foodpowerteam「協會活動 `activities`」新增免登入的「接龍報名」機制，
> 參考 foodpowerclub 的 `EventSignupPage`，但**接龍即佔正取名額、確認後仍需付款**，
> 逾時未付款可依「可調參數」自動釋放名額給候補。
>
> 技術棧：React + TS + Vite + Tailwind + Supabase + 藍新金流。
> 部署：前端 push `main` → Vercel；Edge Function → `supabase functions deploy ... --project-ref igowitmbnlvzznqgfpfl`；DB → migration / Supabase MCP。
> 每階段結束跑 `npx tsc --noEmit`。

---

## 已確認範圍（不可偏離）

1. 綁定 **協會活動 `activities`**（`signup_settings.activity_id` FK → `activities.id`）。不綁 `member_activities` / `club_activities`。
2. **免登入**報名；用 `localStorage` 存 `cancel_token` 認領「我的報名 / 取消」。
3. **接龍即佔正取**（`payment_status='unpaid'` 也算佔位）；滿了進 `waitlist`；取消或逾時釋放時自動遞補。
4. 正取者**導去付款**，沿用現有 `merchant_order_no` + `newebpay-notify` 回寫 `paid`。
5. **逾時釋放**：`signup_settings.payment_deadline_hours`（後台可調，NULL = 不自動釋放）。

---

## Phase 0 — Documentation Discovery（已完成，Allowed APIs）

### A. foodpowerclub 參考實作（前端全部可抄，SQL 需自寫）
來源：`/Users/jackhsu/Projects/foodpowerclub/src/App.tsx`、`src/types.ts`

- **RPC 合約（僅前端呼叫形狀，SQL 本體不在 repo，需重寫）**
  - `signup_register({ p_event_id, p_name, p_industry, p_contact })` → 回傳單一物件 `{ id, cancel_token, status }`，`status ∈ 'confirmed'|'waitlist'`。（App.tsx:984-992）
  - `signup_cancel({ p_id, p_token })`（App.tsx:1004）
  - `signup_admin_update({ p_event_id, p_capacity, p_open })`（App.tsx:2945-2965，調高容量會自動遞補候補）
- **`EventSignupPage`** 完整元件 App.tsx:905-1235；localStorage helpers App.tsx:893-903；20 秒輪詢 + `visibilitychange` 重抓 App.tsx:960-966；`confirmed/waitlist/remain/isFull` 推導 App.tsx:969-974。
- **匿名欄位白名單**：`signup_entries` 匿名查詢 **不可 select `contact`**（App.tsx:925-945）。
- **複製接龍文字** 匯出格式（App.tsx:2989-2995）：`1.名字/產業`，額滿加 `額滿————` 分隔線，候補 `候補1 名字/產業`。
- **TS 介面** `SignupSettings` / `SignupEntry` types.ts:82-101（本專案需擴充付款欄位）。
- ⚠️ **SQL 不在 repo**：foodpowerclub 的 tables / RPC / RLS 只存在遠端 Supabase，本專案的 DB 層要**全新自寫**。

### B. foodpowerteam 金流（可整套沿用）
來源：`utils/newebpay.ts`、`pages/ActivityPayment.tsx`、`pages/ActivityDetail.tsx`、`supabase/functions/newebpay-notify/index.ts`、`pages/PaymentResult.tsx`

- **`utils/newebpay.ts` 與表無關，直接沿用**：`submitNewebPayForm({ MerchantOrderNo, Amt, ItemDesc, Email })`（newebpay.ts:154）；`NewebPayData` = `{ MerchantOrderNo, Amt, ItemDesc, Email }`（newebpay.ts:49-54）。`ClientBackURL` 已固定導到 `/payment-result?order_no=...`。
- **建立付款列的既有樣式**：`ActivityDetail.tsx:266-343`（建 row 帶 `merchant_order_no` + `payment_status='pending'` → `submitNewebPayForm`）；**重新付款頁**：`ActivityPayment.tsx:40-62`（產生新 order no `REPAY_${ts}` → RPC `update_payment_order_no` 回寫 → submit）。
- **order_no 前綴慣例**：`ACT` / `REPAY_` / `JOIN_` / `RENEW_` / `FEST_`。**本功能用新前綴 `SIGNUP_${ts}`**。
- **`newebpay-notify` 分支模型**：唯一用「前綴分支」的是 Festival（`merchantOrderNo.startsWith('FEST_')` → `handle_festival_payment` → `issueAndEmailReceipt('festival',...)` + `addIncome('festival',...)` → 早 return），位置 index.ts:234-283。**signup 照此樣式加一段 `startsWith('SIGNUP_')` 分支**。
- **需擴充 `'signup'` source 的伺服器 RPC**：`add_income_for_order`、`issue_receipt_for_order`、`confirm_payment_paid`、`check_payment_status`（部分僅存於遠端 DB，需用新 migration / MCP 補 `'signup'` arm）。
- **`PaymentResult.tsx` 與來源無關**，DB RPC 認得 `SIGNUP_` 後即自動運作，免改。

### C. foodpowerteam 路由 / 後台
來源：`App.tsx`、`types.ts`、`pages/AdminDashboard.tsx`、`pages/ActivityCheckIn.tsx`、`components/Seo.tsx`

- **lazy import** 樣式 App.tsx:11 區塊；**路由孿生範本** `/checkin/:activityId` App.tsx:1051（`<Route path=... element={<><Seo title=".." noindex /><Comp/></>} />`）。
- **匿名自抓頁範本**：`ActivityCheckIn.tsx:22-62`（`useParams<{activityId}>()` + `useEffect` + `cancelled` guard + anon `supabase.from(...).maybeSingle()`）。MemberList 是 props 灌入、**不是**自抓，勿抄。
- **隱藏 Header/Footer**：`isStandaloneLandingPath`（App.tsx:50-52）目前含 `/festival /design /checkin /receipt`；接龍頁若要無站台導覽，加 `'/signup'`（與 `/pay-signup`）。
- **Seo noindex**：`<Seo title=".." noindex />`（Seo.tsx props `{title, description?, path?, image?, noindex?}`）。接龍頁 + 付款頁都要 `noindex`。
- **後台插入點**：`AdminDashboard.tsx` 的 `ActivityManager`（1116-1729），編輯表單 `<form>` 內、送出按鈕列（line 1721）**之前**插入「接龍報名管理」`<div className="md:col-span-2">`。新欄位寫進 `formData` 即會經 `onUpdate(formData)` 持久化（前提：DB 欄位存在）。
- **角色 gating**：⚠️ enum 是 `UserRole.MANAGER`（值「管理員」）與 `UserRole.SUPER_ADMIN`，**不是** CLAUDE.md 寫的 `ADMIN`。`ActivityManager` 已收到 `isSuperAdmin` prop（line 1129）可直接用；MANAGER 級別目前未 plumbed 進此元件。
- **`Activity.id`** 型別 `string | number`，runtime 是 `crypto.randomUUID()` 字串 → DB `activity_id` 用 `text`（或 uuid，與 `activities.id` 對齊；先確認 `activities.id` 實際型別）。

### 反樣式守則（全程適用）
- 不要發明 foodpowerclub 沒有的 RPC 參數；本專案 RPC 一律**新命名**（見下），不要沿用 `p_event_id`，改 `p_activity_id`。
- 匿名查詢**永遠不要 select `phone/email/contact`**。
- 付款金額**一律以伺服器 `signup_settings.fee_amount` 為準**，不可信任前端傳入的金額。
- `newebpay-notify` 一定要保留 Festival 分支的「早 return」語意，不要讓 signup order 落到 registrations 的 fallthrough。
- 台灣時間：Edge Function 在 UTC，寫入外部台灣時間要補 `+08:00`；DB 內「當下台灣時間」用 `now() AT TIME ZONE 'Asia/Taipei'`（沿用 receipt / income 既有做法）。

---

## Phase 1 — DB Schema + RLS（Supabase migration）

### 實作
建立兩張表（`activity_id` 對齊 `activities.id` 型別）：

```sql
-- signup_settings：每場協會活動一列
create table if not exists public.signup_settings (
  activity_id            text primary key references public.activities(id) on delete cascade,
  capacity               integer not null default 0 check (capacity >= 0),
  registration_open      boolean not null default true,
  fee_amount             integer not null default 0 check (fee_amount >= 0), -- 付款金額（伺服器權威）
  payment_deadline_hours integer,                    -- NULL = 不自動釋放；>0 = 逾時釋放時數
  event_time             text,
  event_location         text,
  event_address          text,
  created_at             timestamptz not null default now()
);

-- signup_entries：每筆接龍報名
create table if not exists public.signup_entries (
  id             uuid primary key default gen_random_uuid(),
  activity_id    text not null references public.activities(id) on delete cascade,
  name           text not null,
  phone          text not null,      -- 敏感，匿名不可讀
  email          text not null,      -- 付款/收據用，敏感，匿名不可讀
  company        text,               -- = foodpowerclub 的 industry（產業/品牌），匿名可讀
  status         text not null default 'confirmed' check (status in ('confirmed','waitlist')),
  payment_status text not null default 'unpaid'    check (payment_status in ('unpaid','paid')),
  merchant_order_no text,
  paid_at        timestamptz,
  cancel_token   uuid not null default gen_random_uuid(),
  created_at     timestamptz not null default now()
);
create index if not exists idx_signup_entries_activity on public.signup_entries(activity_id, created_at);
create index if not exists idx_signup_entries_order on public.signup_entries(merchant_order_no);
```

RLS：
- `signup_settings`：匿名 `SELECT` 允許（全欄位皆非敏感）。寫入僅 `authenticated`。
- `signup_entries`：
  - 匿名 `SELECT` **只透過 view 或欄位授權**避免讀到 `phone/email`。做法：建立匿名安全 view `signup_entries_public`（只含 `id, activity_id, name, company, status, payment_status, created_at`）給前端 anon 查詢；base table 匿名 `SELECT` 關閉。
  - 匿名**不可**直接 `INSERT/UPDATE/DELETE`；所有寫入走 `SECURITY DEFINER` RPC。
  - `authenticated`（後台）可 `SELECT *`（含 `phone/email`）。

```sql
alter table public.signup_settings enable row level security;
alter table public.signup_entries  enable row level security;

create policy "settings anon read"  on public.signup_settings for select to anon, authenticated using (true);
create policy "settings admin write" on public.signup_settings for all to authenticated using (true) with check (true);

create policy "entries admin read" on public.signup_entries for select to authenticated using (true);
-- anon 不給任何 base-table policy（預設拒絕）；改用下方 public view

create view public.signup_entries_public as
  select id, activity_id, name, company, status, payment_status, created_at
  from public.signup_entries;
grant select on public.signup_entries_public to anon, authenticated;
```

### 文件參考
- 欄位語意對照 foodpowerclub types.ts:82-101（本專案改 `event_id→activity_id`、`industry→company`、加 `phone/email/payment_status/merchant_order_no/paid_at/fee_amount/payment_deadline_hours`）。
- 先以 MCP `list_tables` 確認 `activities.id` 實際型別（text vs uuid），據以定 `activity_id` 型別與 FK。

### 驗證
- [ ] MCP `list_tables` 看到兩表 + view。
- [ ] `select * from signup_entries_public` 以 anon key 可讀且**無 phone/email 欄**。
- [ ] anon key 直接 `insert into signup_entries` 被 RLS 拒絕。
- [ ] `get_advisors`（security）無新增高風險項。

### 反樣式守則
- 不要給 `signup_entries` base table 任何 anon policy；匿名讀一律走 view。
- `fee_amount` 用整數（元），與藍新 `Amt` 一致。

---

## Phase 2 — DB Functions（RPC，SECURITY DEFINER）

### 實作（全部 `security definer`，`grant execute` 給 `anon` 者僅限報名/取消）
1. `signup_release_expired(p_activity_id text)` — 內部用：把該活動 `status='confirmed' and payment_status='unpaid' and payment_deadline_hours` 逾時者刪除（或標記），再依 `created_at` 遞補最舊 `waitlist`→`confirmed`。`payment_deadline_hours` 為 NULL 時不動作。
2. `signup_register(p_activity_id text, p_name text, p_phone text, p_email text, p_company text)` → `table(id uuid, cancel_token uuid, status text)`：
   - 先呼叫 `signup_release_expired(p_activity_id)`（機會式回收，免依賴 cron）。
   - 讀 `signup_settings`；`registration_open=false` 或無設定 → `raise exception`。
   - 計 `confirmed_count`（含 unpaid）。`confirmed_count < capacity` → 插入 `status='confirmed'`；否則 `status='waitlist'`。
   - 回傳新列 `id, cancel_token, status`。**grant execute to anon**。
3. `signup_cancel(p_id uuid, p_token uuid)`：`token` 相符才刪；若刪掉的是 `confirmed`，遞補最舊 `waitlist`。**grant execute to anon**。
4. `signup_admin_update(p_activity_id text, p_capacity int, p_open boolean, p_deadline_hours int)`：更新 settings；調高容量時遞補候補。**僅 authenticated**。
5. **付款相關**：
   - `update_signup_order_no(p_id uuid, p_token uuid, p_order_no text)`：報名者付款前回寫自己的 `merchant_order_no`（token 驗證）。**grant execute to anon**。回傳付款所需 `amount(=fee_amount)`, `email`, `item_desc`。
   - `get_signup_payment_info(p_id uuid, p_token uuid)` → 付款頁載入用（金額、活動名、狀態）。**grant execute to anon**。
   - `handle_signup_payment(p_order_no text, p_amount int, p_pay_time text, p_pay_method text)`：notify 呼叫，將對應 entry 設 `payment_status='paid', paid_at=...`（冪等：已 paid 直接回傳）。**僅 service role（notify 用 service key）**。
6. **擴充既有 source union**（新 migration / MCP，先讀遠端現行定義再改）：
   - `add_income_for_order` 加 `elsif p_source='signup' then ...`。
   - `issue_receipt_for_order` 加 `'signup'` arm。
   - `confirm_payment_paid` 加「查 signup_entries by merchant_order_no」並回傳 `'signup'`。
   - `check_payment_status` 加 signup 表查詢分支（讓 PaymentResult 輪詢解析）。

### 文件參考
- 原子判正取/候補的行為對照 foodpowerclub App.tsx:944 / 2944 註解（容量、遞補）。
- notify 分支要 return 的樣式：`newebpay-notify/index.ts:234-283`（Festival）。
- income/receipt source union 現況：`supabase/migrations/20260629_income_all_sources.sql`（`registration|application|renewal|festival`，else `bad_source`）。
- `confirm_payment_paid` / `check_payment_status` 僅存遠端 → 先 MCP `execute_sql` 讀 `pg_get_functiondef` 再擴充。

### 驗證
- [ ] anon key 呼叫 `signup_register` 可報名；容量滿轉 `waitlist`。
- [ ] `signup_cancel` 錯 token 失敗、對 token 成功且遞補。
- [ ] 手動把某 entry `created_at` 調早、設 `payment_deadline_hours=0.001` 後呼叫 `signup_release_expired` → unpaid 正取被釋放、候補遞補。
- [ ] `grant execute` 範圍正確：admin RPC 對 anon 不可執行。
- [ ] `get_advisors` 無 `security definer` 相關高風險新增（search_path 已設 `set search_path = public`）。

### 反樣式守則
- 每個 `security definer` 函式都要 `set search_path = public`。
- `handle_signup_payment` 必須冪等（藍新會重送 notify）。
- 金額一律讀 `fee_amount`，忽略 notify 傳入 amount 之外的前端來源。

---

## Phase 3 — 型別 + 接龍頁 + 路由（前端）

### 實作
1. `types.ts` 新增（放在既有 `Registration` 附近）：
```ts
export interface SignupSettings {
  activity_id: string;
  capacity: number;
  registration_open: boolean;
  fee_amount: number;
  payment_deadline_hours?: number | null;
  event_time?: string;
  event_location?: string;
  event_address?: string;
  created_at?: string;
}
export interface SignupEntry {
  id: string;
  activity_id: string;
  name: string;
  company?: string;
  phone?: string;   // 僅後台可讀
  email?: string;   // 僅後台可讀
  status: 'confirmed' | 'waitlist';
  payment_status: 'unpaid' | 'paid';
  merchant_order_no?: string;
  paid_at?: string;
  created_at: string;
}
```
2. 新頁 `pages/SignupChain.tsx`：**抄 foodpowerclub `EventSignupPage`（App.tsx:893-1235）**，改動：
   - `useParams<{ activityId: string }>()`；查 `activities`（`maybeSingle`）取活動標題/日期，查 `signup_entries_public`（**非** base table）取名單，查 `signup_settings`。自抓樣式抄 `ActivityCheckIn.tsx:22-62`。
   - localStorage key 改 `foodpowerteam_signup_${activityId}`。
   - 表單欄位：姓名 `name`、手機 `phone`、Email `email`（付款/收據必填）、公司/品牌 `company`。
   - `handleRegister` 呼叫 `signup_register({ p_activity_id, p_name, p_phone, p_email, p_company })`；回 `confirmed` → 直接進入付款流程（Phase 4：導 `/pay-signup/:id?token=`）；回 `waitlist` → 顯示候補提示、不付款。
   - 「我的報名」卡片：對 `status='confirmed' && payment_status==='unpaid'` 顯示 **「前往付款」** 按鈕（處理「候補被遞補後回訪付款」情境）；`paid` 顯示已完成；提供「取消報名」。
   - 20 秒輪詢 + `visibilitychange` 重抓（抄 App.tsx:960-966）。
3. `App.tsx`：加 `const SignupChain = lazy(() => import('./pages/SignupChain'));`；加路由 `<Route path="/signup/:activityId" element={<><Seo title="接龍報名" noindex /><SignupChain /></>} />`（孿生 App.tsx:1051）。視需求把 `/signup` 加進 `isStandaloneLandingPath`（App.tsx:51）。

### 文件參考
- 元件主體：foodpowerclub App.tsx:905-1235；輪詢 960-966；推導 969-974；export 格式 2989-2995（後台用）。
- 匿名自抓：`ActivityCheckIn.tsx:22-62`。
- 路由/Seo：App.tsx:1051、`components/Seo.tsx`。

### 驗證
- [ ] `npx tsc --noEmit` 通過。
- [ ] `/signup/<真實活動id>` 可載入、顯示名單、報名成功後名單即時更新。
- [ ] 匿名情況下 DevTools Network 看不到 phone/email 外洩（查的是 `signup_entries_public`）。
- [ ] 關閉報名（settings.registration_open=false）時顯示「報名已關閉」。

### 反樣式守則
- 前端查名單一律用 `signup_entries_public`，不要查 base table。
- 不要在前端算/傳金額；金額由付款 RPC 回。

---

## Phase 4 — 付款串接（前端）

### 實作
1. 新頁 `pages/SignupPayment.tsx`（抄 `ActivityPayment.tsx:1-157`），路由 `/pay-signup/:id`（讀 `?token=`）：
   - `useEffect` 呼叫 `get_signup_payment_info({ p_id, p_token })` 載入金額/活動名/狀態；若已 `paid` 顯示完成。
   - `handlePayment`：產 `SIGNUP_${Date.now()}` → `update_signup_order_no({ p_id, p_token, p_order_no })` 回寫並取回 `amount/email/item_desc` → `submitNewebPayForm({ MerchantOrderNo, Amt, ItemDesc, Email })`。
   - 存 `sessionStorage['last_signup_url']` 供 PaymentResult 返回連結（比照 ActivityDetail.tsx:323）。
2. `App.tsx` 加 lazy import + `<Route path="/pay-signup/:id" element={<><Seo title="接龍付款" noindex /><SignupPayment /></>} />`。
3. 接龍頁「前往付款」與「報名成功(confirmed)」都導向 `/pay-signup/:id?token=<cancel_token>`。

### 文件參考
- 重新付款頁樣式：`ActivityPayment.tsx:40-62`（新 order no → 回寫 → submit）。
- 首次付款導向：`ActivityDetail.tsx:266-343`。
- `submitNewebPayForm` 介面：`utils/newebpay.ts:154 / 49-54`。
- 返回頁：`PaymentResult.tsx`（來源無關，免改）。

### 驗證
- [ ] `npx tsc --noEmit` 通過。
- [ ] 走一次沙盒付款：接龍(confirmed) → 付款 → 返回 `/payment-result?order_no=SIGNUP_...` → 輪詢顯示成功（需 Phase 5 notify 就緒）。
- [ ] `merchant_order_no` 已在跳轉前寫入 entry。

### 反樣式守則
- 每次付款產新 order no（藍新 order no 不可重用），舊值不覆蓋歷史即可。
- `token` 不符時 `get_signup_payment_info` / `update_signup_order_no` 必須拒絕（避免他人代付/竄改）。

---

## Phase 5 — newebpay-notify signup 分支 + 部署（Edge Function）

### 實作
在 `supabase/functions/newebpay-notify/index.ts` 的分支串接中，**於 Festival 分支同層**加：
```ts
// 6.x Signup（接龍報名）— 前綴分支，抄 6.0 Festival 結構
if (merchantOrderNo.startsWith('SIGNUP_')) {
  const { data, error } = await supabase.rpc('handle_signup_payment', {
    p_order_no: merchantOrderNo, p_amount: amount, p_pay_time: payTime, p_pay_method: paymentMethod,
  });
  // sendTelegram / sendEmail（比照 festival）
  await issueAndEmailReceipt('signup', merchantOrderNo);
  await addIncome('signup', merchantOrderNo);
  return new Response('OK', { status: 200, headers: corsHeaders });
}
```
放在 registrations fallthrough（index.ts:285）**之前**，確保 signup 不誤入 registrations 更新。
部署：`supabase functions deploy newebpay-notify --no-verify-jwt --project-ref igowitmbnlvzznqgfpfl`（**專案根目錄執行**）。

### 文件參考
- 樣式來源：`newebpay-notify/index.ts:234-283`（Festival 前綴分支 + 早 return）。
- helper `issueAndEmailReceipt`（index.ts:202）、`addIncome`（index.ts:225）已存在，Phase 2 已在其 RPC 加 `'signup'` arm。

### 驗證
- [ ] `supabase functions deploy` 成功。
- [ ] 沙盒付款後 `get_logs`（edge function）看到走 signup 分支、`handle_signup_payment` 成功。
- [ ] entry `payment_status='paid'`、`paid_at` 為台灣時間正確（+08:00 已處理）。
- [ ] 重送同一 notify（冪等）不重複記收入/開收據。

### 反樣式守則
- 一定要早 `return`，不要 fallthrough 到 registrations。
- `payTime` 轉 UTC 記得 `+08:00`（沿用檔內既有 `paidAtISO` 做法）。

---

## Phase 6 — 逾時釋放排程（pg_cron）

### 實作
- 啟用 `pg_cron`（Supabase：`create extension if not exists pg_cron;`，或 Dashboard 啟用）。
- 建 `signup_release_all_expired()`：對所有 `payment_deadline_hours is not null` 的活動呼叫 `signup_release_expired(activity_id)`。
- 排程每 10 分鐘：`select cron.schedule('signup-release', '*/10 * * * *', $$ select public.signup_release_all_expired(); $$);`
- 註：Phase 2 的 `signup_register` 已做「機會式回收」，cron 是保險（無新報名時也能釋放）。

### 文件參考
- 釋放/遞補邏輯：Phase 2 `signup_release_expired`。
- 時區：cron 以 UTC 觸發，但釋放判斷用 `created_at + (payment_deadline_hours || ' hours')::interval < now()`（皆 timestamptz，免手動 +8）。

### 驗證
- [ ] `select * from cron.job` 看到排程。
- [ ] 造一筆逾時 unpaid 正取 → 等一輪 cron（或手動 `select signup_release_all_expired()`）→ 被釋放且候補遞補。
- [ ] `payment_deadline_hours = NULL` 的活動不受影響。

### 反樣式守則
- 釋放判斷用 `timestamptz` 比較，不要把 hours 轉字串再拼台灣時間。
- cron 函式要冪等、可重入（多次執行結果一致）。

---

## Phase 7 — 後台管理面板（AdminDashboard）

### 實作
在 `pages/AdminDashboard.tsx` `ActivityManager` 編輯表單送出按鈕列（line 1721）**之前**，插入 `<div className="md:col-span-2">` 面板：
- 「開啟接龍報名」toggle（`registration_open`）
- 容量 `capacity`（`<input type="number" min="0">`）
- `payment_deadline_hours`（`<input type="number">`，空 = 不自動釋放）
- `fee_amount` 付款金額
- **複製接龍文字** 按鈕（抄 foodpowerclub App.tsx:2989-2995 的格式），CSV 匯出可選（App.tsx:2973-2987）
- 名單表格（後台 `select *`，可讀 `phone/email/status/payment_status`）
儲存：呼叫 `signup_admin_update({ p_activity_id, p_capacity, p_open, p_deadline_hours })`（首次無設定則先 `upsert signup_settings`）。用已在 scope 的 `isSuperAdmin`（line 1129）決定是否顯示（或放寬給登入即可，依現況只 plumb 了 `isSuperAdmin`）。

### 文件參考
- 插入點：`AdminDashboard.tsx:1720`（form 內、送出列前）。
- 複製/CSV 匯出格式：foodpowerclub App.tsx:2989-2995 / 2973-2987。
- 後台 admin 讀取（含敏感欄）：直接 `supabase.from('signup_entries').select('*')`（authenticated policy 允許）。

### 驗證
- [ ] `npx tsc --noEmit` 通過。
- [ ] 後台可開啟接龍、設容量/deadline/費用並儲存；重整後值保留。
- [ ] 複製接龍文字格式正確（`1.名字/公司`、`額滿————`、`候補1 ...`）。
- [ ] 名單顯示 phone/email/付款狀態（後台限定）。

### 反樣式守則
- 後台寫入走 `signup_admin_update` / `upsert`，不要讓前端匿名路徑碰到這些。
- 用 `UserRole.MANAGER` / `UserRole.SUPER_ADMIN`，不要用不存在的 `UserRole.ADMIN`。

---

## Phase 8 — 驗證與部署

### 實作 / 檢查
- [ ] `npx tsc --noEmit` 全綠。
- [ ] `grep -rn "UserRole.ADMIN" pages/ components/` 應為 0（確認沒用錯 enum）。
- [ ] 端對端：開啟接龍 → 匿名報名(正取) → 付款 → notify 回寫 paid → 收據/收入產生；容量滿 → 候補；取消 → 遞補；逾時未付款 → 釋放 → 遞補。
- [ ] anon 讀名單無 phone/email 外洩（查 `signup_entries_public`）。
- [ ] `get_advisors`（security + performance）無新高風險。
- [ ] 部署：前端 `git push origin main`（Vercel）；Edge Function `supabase functions deploy newebpay-notify --no-verify-jwt --project-ref igowitmbnlvzznqgfpfl`；DB migration 已套用遠端。

### 反樣式守則
- 上線前務必在沙盒金鑰跑完整付款；勿用正式金鑰測試。
- 部署 Edge Function 一定在專案根目錄且帶 `--project-ref`（避免部署到舊 linked 副本）。

---

## 檔案異動總表

| 類型 | 檔案 | 動作 |
|------|------|------|
| DB | 新 migration（tables+RLS+view） | Phase 1 |
| DB | 新 migration（RPCs + source union 擴充） | Phase 2 |
| DB | pg_cron 排程 | Phase 6 |
| 前端 | `types.ts` | +SignupSettings/SignupEntry |
| 前端 | `pages/SignupChain.tsx` | 新增 |
| 前端 | `pages/SignupPayment.tsx` | 新增 |
| 前端 | `App.tsx` | +2 lazy import、+2 route、（選）isStandaloneLandingPath |
| 前端 | `pages/AdminDashboard.tsx` | ActivityManager 加接龍面板 |
| Edge | `supabase/functions/newebpay-notify/index.ts` | +SIGNUP_ 分支 |

## 未決／執行時要現場確認
1. `activities.id` 實際型別（text vs uuid）→ 決定 `activity_id` 欄位型別（Phase 1 用 MCP `list_tables` 確認）。
2. 遠端 `confirm_payment_paid` / `issue_receipt_for_order` / `check_payment_status` 現行定義（Phase 2 用 MCP `execute_sql` + `pg_get_functiondef` 讀出再擴充）。
3. 接龍面板權限：目前 `ActivityManager` 只 plumb 了 `isSuperAdmin`；若要 MANAGER 也能管，需多傳一個 prop。
