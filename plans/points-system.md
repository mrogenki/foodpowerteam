# 實作計畫：會員點數機制（報名活動可用點數抵扣）

> 目標：會員報名活動付款時，可用點數抵扣費用。
> 已確認設計：**「付款成功才核銷」** — 報名時預扣（reserve），藍新回呼成功才核銷（commit），付款失敗/逾時回補（refund）。點數全程有獨立帳本 `points_ledger` 可稽核。

---

## ⚠️ 開工前必須拍板的兩個商業規則

這兩個規則計畫已給「預設值」，寫死在 `constants.tsx`，可隨時改；但開工前請確認：

1. **點數面額（換算率）**：預設 **1 點 = NT$ 1**（`POINT_TO_TWD = 1`）。
2. **賺取點數規則**（先給保守預設，可全設 0 等之後再開）：
   - 入會贈點 `POINTS_ON_JOIN`：預設 `0`
   - 續費贈點 `POINTS_ON_RENEWAL`：預設 `0`
   - 活動消費回饋 `POINTS_EARN_RATE`（每消費 N 元回饋 1 點）：預設 `0`（不回饋）
   - 抵扣上限規則：預設「**點數最多折抵到 0 元為止**」，且可與折扣券**疊加**（折扣券先扣、點數後扣）。

> 若這兩項未定，仍可先做 Phase 1–5 的「抵扣/核銷骨架」，賺點規則（Phase 6）最後再接。

---

## 核心架構決策（不可妥協的三點）

1. **點數異動一律走 DB 端 `SECURITY DEFINER` RPC**，不在前端直接 UPDATE `members.points_balance`。
   - 原因：前端用 anon/authenticated key，直接改餘額有競態與被竄改風險；且 `newebpay-notify` 在沒有 service role key 時會**降級成 anon key**（[index.ts:44](supabase/functions/newebpay-notify/index.ts)），只有 `SECURITY DEFINER` RPC 能保證不論誰呼叫都能正確、安全地改餘額。

2. **採「預扣即減餘額」模型（Model A）**，避免重複折抵（double-spend）：
   - **reserve（報名時）**：原子檢查 `points_balance >= points_used` 後**立即扣除餘額**，寫 ledger `type='freeze'`（change 為負），報名單標記 `points_status='frozen'`。
   - **commit（付款成功）**：寫 ledger `type='redeem'`（change=0，僅作核銷標記），報名單 `points_status='redeemed'`。餘額在 freeze 時已扣，不再變動。
   - **refund（付款失敗/取消/逾時/退款）**：餘額加回，寫 ledger `type='refund'`（change 為正），報名單 `points_status='refunded'`。
   - 好處：餘額永遠反映「已預留」狀態 → 不可能同一批點數報名兩個活動把錢折兩次；語意上仍是「成功才真正消耗、失敗會還你」。

3. **所有 commit / refund / reserve RPC 必須冪等**（用 `merchant_order_no` + `points_status` 當狀態機關卡）。
   - 原因：[index.ts](supabase/functions/newebpay-notify/index.ts) **目前沒有任何重複回呼防護**（任務 A 確認）。藍新可能重送同一筆 → commit 必須只在 `frozen→redeemed` 轉換一次。

---

## Phase 0：事實基礎（已完成，僅供後續 phase 引用）

### 金流回呼 `supabase/functions/newebpay-notify/index.ts`
- 解密與分流：[index.ts:28-85](supabase/functions/newebpay-notify/index.ts) 解密；前綴分流 `FEST_`→festival(196-236)、預設→`registrations`(239-305)、無前綴→`member_applications`(308-344)、續約→`member_renewals` via RPC(347-415)。
- 成功通用 payload：[index.ts:108-114](supabase/functions/newebpay-notify/index.ts)（`payment_status:'paid'` 等）。
- 一般活動報名成功分支：[index.ts:239-305](supabase/functions/newebpay-notify/index.ts)，可由 `regData.member_id || regData.memberId` 取得會員（行 276）。
- **失敗分支：無**（[index.ts:417-419](supabase/functions/newebpay-notify/index.ts) 只 log，不更新、不通知）。← refund 切入點要新增。
- **冪等防護：無**。Client key：service role 優先、否則 anon（行 44）。已用 RPC：`handle_renewal_payment`（行 352）。

### Migration 慣例
- SQL 放**專案根目錄**，命名 `supabase_<功能>_<操作>.sql`（無日期戳）。例：`supabase_renewal_fix.sql`、`supabase_final_fix.sql`、`supabase_activity_payment_rpc.sql`。
- 既有 RPC 範本：`handle_renewal_payment`（[supabase_renewal_fix.sql:6-106](supabase_renewal_fix.sql)）、`get_activity_payment_info`（[supabase_activity_payment_rpc.sql:5-56](supabase_activity_payment_rpc.sql)）；皆 `GRANT EXECUTE` 給 `anon, authenticated`。
- `member_renewals` 完整 CREATE TABLE：[supabase_renewal.sql:6-19](supabase_renewal.sql)。`members` 只找到 ALTER（`payment_records`，[supabase_schema.sql:23](supabase_schema.sql)）；`registrations` 只找到 ALTER（payment_method/notes/invoice）。⚠️ 故新增欄位一律用 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`，不要寫 CREATE TABLE。

### 型別與前端切入點
- `Member` [types.ts:123-158](types.ts)：**無點數欄位**。`Registration` [types.ts:58-93](types.ts)。`Coupon` [types.ts:205-214](types.ts)。`PaymentStatus` enum [types.ts:21-27](types.ts)。
- 金額計算：[ActivityDetail.tsx:115-120](pages/ActivityDetail.tsx) `basePrice` / `finalPrice = Math.max(0, basePrice - discountAmount)`；折扣狀態 [ActivityDetail.tsx:36-41](pages/ActivityDetail.tsx)。
- 折扣券 UI 範本：[ActivityDetail.tsx:489-500](pages/ActivityDetail.tsx)；`checkCoupon()` [ActivityDetail.tsx:175-191](pages/ActivityDetail.tsx)。
- 報名送出 `handleSubmit`：[ActivityDetail.tsx:221-311](pages/ActivityDetail.tsx)，`commonData` 組成 241-259，會員欄位帶入 261-276。
- props 簽名與會員選取：[ActivityDetail.tsx:11-20](pages/ActivityDetail.tsx)（含 `members`、`validateCoupon`）；`handleSelectMember` 130-150（會員是用搜尋選取，非登入態）。
- `validateCoupon()` 範本：[App.tsx:558-565](App.tsx)；`handleRegister`/coupon 標記：[App.tsx:635-647](App.tsx)；route 傳 props：[App.tsx:947-948](App.tsx)；`handleUpdateMember` 範本：[App.tsx:787-792](App.tsx)。
- 後台會員編輯 `MemberManager`：[AdminDashboard.tsx:2197-2706](pages/AdminDashboard.tsx)，會籍資料區 2629-2636、繳費紀錄區 2639-2693、`handleSave` 2318。
- 入會核准贈點切入點：[App.tsx:826-894](App.tsx)（`newMember` 建構 861-884、insert 886）。續費完成：`handle_renewal_payment` RPC（[MemberRenewalManager.tsx:108-114](pages/MemberRenewalManager.tsx)、回呼 [index.ts:347-357](supabase/functions/newebpay-notify/index.ts)）；金額常數皆 5000（[MemberJoin.tsx:13](pages/MemberJoin.tsx)、[MemberRenewal.tsx:52](pages/MemberRenewal.tsx)）。

---

## Phase 1：資料模型 + RPC（DB 層，先行且獨立）

**目標**：建立點數的資料結構與所有原子化、冪等的 RPC。此 phase 完成後，點數系統的「後端契約」即固定，前端與 Edge Function 只是呼叫者。

### 1.1 新建 migration `supabase_points.sql`（專案根目錄）

**A. 欄位（全用 `ADD COLUMN IF NOT EXISTS`）**
```sql
-- 會員點數餘額（唯一真實餘額；含「已預扣」後的可用值）
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS points_balance int NOT NULL DEFAULT 0;

-- 報名單的點數抵扣資訊
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS points_used int NOT NULL DEFAULT 0;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS points_status text; -- null | 'frozen' | 'redeemed' | 'refunded'
```

**B. 帳本表 `points_ledger`**（仿 `member_renewals` 的 CREATE 風格，[supabase_renewal.sql:6-19](supabase_renewal.sql)）
```sql
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  change int NOT NULL,                 -- 正=增加, 負=扣除, 0=核銷標記
  balance_after int,                   -- 異動後餘額快照（稽核用）
  type text NOT NULL,                  -- 'earn' | 'freeze' | 'redeem' | 'refund' | 'adjust'
  reason text,
  ref_type text,                       -- 'registration' | 'application' | 'renewal' | 'admin'
  ref_id text,
  order_no text,                       -- 對應 merchant_order_no（冪等用）
  created_by text,                     -- 手動調整時記管理員 email
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_points_ledger_member ON public.points_ledger(member_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_order ON public.points_ledger(order_no);
```

**C. RLS**（仿 [supabase_final_fix.sql](supabase_final_fix.sql) 風格）
- `points_ledger`：`ENABLE ROW LEVEL SECURITY`；**不開放 anon 直接寫**（只能透過 RPC）。可加「authenticated 可 SELECT」供後台讀明細。RPC 用 `SECURITY DEFINER` 繞過 RLS。
- `members.points_balance`：沿用 members 既有 RLS；**禁止**前端直接 UPDATE 此欄（靠流程約束 + 一律走 RPC）。

### 1.2 RPC（全部 `SECURITY DEFINER`，`GRANT EXECUTE` 給 `anon, authenticated`，仿 [supabase_renewal_fix.sql:6-106](supabase_renewal_fix.sql) 寫法）

> 每個 RPC 內部都要寫 `points_ledger` 並更新 `balance_after`。冪等靠先 SELECT 現況再判斷。

1. **`points_reserve(p_member_id uuid, p_points int, p_order_no text, p_registration_id text) returns json`**
   - 原子：`SELECT points_balance ... FOR UPDATE`；若 `points_balance < p_points` → 回 `{ok:false, reason:'insufficient'}` 不動任何資料。
   - 否則：`points_balance -= p_points`；`registrations.points_used=p_points, points_status='frozen'`（where id=p_registration_id）；insert ledger `type='freeze', change=-p_points, order_no=p_order_no, ref_type='registration', ref_id=p_registration_id`。回 `{ok:true}`。
   - 冪等：若該 registration 已是 `frozen`/`redeemed` → 直接回 `{ok:true}`（不重複扣）。

2. **`points_commit(p_order_no text) returns json`**
   - 找 `registrations where merchant_order_no=p_order_no`；若 `points_status='frozen'` → 設 `'redeemed'`，insert ledger `type='redeem', change=0, order_no=p_order_no`。
   - 冪等：若已 `redeemed` 或無點數抵扣 → no-op 回 `{ok:true}`。

3. **`points_refund(p_order_no text) returns json`**
   - 找 `registrations where merchant_order_no=p_order_no`；若 `points_status='frozen'` → `members.points_balance += points_used`；報名單設 `'refunded'`；insert ledger `type='refund', change=+points_used, order_no=p_order_no`。
   - 冪等：若 `redeemed`（已核銷）或 `refunded` 或無抵扣 → no-op。（注意：已 redeemed 不退；退款情境屬另一條 admin 流程。）

4. **`points_adjust(p_member_id uuid, p_delta int, p_reason text, p_admin text) returns json`**
   - 後台手動加減：`points_balance += p_delta`（不可使餘額 < 0，否則回錯）；insert ledger `type='adjust', change=p_delta, reason=p_reason, created_by=p_admin, ref_type='admin'`。

5. **`points_earn(p_member_id uuid, p_points int, p_reason text, p_ref_type text, p_ref_id text) returns json`**
   - 賺點：`points_balance += p_points`；insert ledger `type='earn'`。冪等：同 `order_no`/`ref_id` 已有 earn 紀錄則 no-op（防續費重複回呼重複贈點）。

### 驗證清單（Phase 1）
- [ ] 在 Supabase Studio 跑 `supabase_points.sql` 無錯誤。
- [ ] 手動 SQL 測 `points_reserve` 餘額不足回 `insufficient` 且不改資料。
- [ ] `points_commit` 連呼兩次只產生一筆 redeem ledger（冪等）。
- [ ] `points_refund` 對已 redeemed 的單 no-op。
- [ ] `points_adjust` 使餘額變負時報錯。

### Anti-pattern 守則
- 🚫 不要在前端直接 `supabase.from('members').update({points_balance})`。
- 🚫 不要寫 `CREATE TABLE members/registrations`（表已存在，只能 ALTER）。
- 🚫 RPC 不要漏 `SECURITY DEFINER` 與 `GRANT EXECUTE`，否則 anon 回呼會失敗。

---

## Phase 2：型別與常數

### 2.1 `types.ts`
- `Member`（[types.ts:123-158](types.ts)）新增：`points_balance?: number;`
- `Registration`（[types.ts:58-93](types.ts)）新增：`points_used?: number;` `points_status?: 'frozen' | 'redeemed' | 'refunded';`
- 新增型別 `PointsLedgerEntry`（對應 1.1.B 欄位）。

### 2.2 `constants.tsx`
新增（即 §開頭兩個商業規則）：
```ts
export const POINT_TO_TWD = 1;          // 1 點 = NT$1
export const POINTS_ON_JOIN = 0;        // 入會贈點
export const POINTS_ON_RENEWAL = 0;     // 續費贈點
export const POINTS_EARN_RATE = 0;      // 每消費 N 元回饋 1 點；0=不回饋
```

### 驗證清單
- [ ] `npx tsc --noEmit` 通過。

---

## Phase 3：前台報名抵扣 UI + reserve 串接

### 3.1 `pages/ActivityDetail.tsx`
- **狀態**：仿折扣狀態（[ActivityDetail.tsx:36-41](pages/ActivityDetail.tsx)）新增 `pointsToUse`、`pointsApplied`。
- **可用點數來源**：會員是用 `handleSelectMember`（[ActivityDetail.tsx:130-150](pages/ActivityDetail.tsx)）選取，選取後 `formData.memberId` 有值。從 `props.members` 找出該會員的 `points_balance` 顯示。**未選會員時隱藏點數區**。
- **金額計算**（改 [ActivityDetail.tsx:115-120](pages/ActivityDetail.tsx)）：
  ```ts
  const maxPoints = Math.min(memberPointsBalance, basePrice - discountAmount); // 不可超過剩餘金額
  const pointsDiscount = pointsApplied * POINT_TO_TWD;
  const finalPrice = Math.max(0, basePrice - discountAmount - pointsDiscount);
  ```
- **UI**：複製折扣券區塊（[ActivityDetail.tsx:489-500](pages/ActivityDetail.tsx)）做「使用點數」區：顯示餘額、輸入要折抵點數（上限 `maxPoints`）、套用/取消按鈕、顯示折抵金額。
- **送出**（`commonData` [ActivityDetail.tsx:241-259](pages/ActivityDetail.tsx)）：加入 `points_used: pointsApplied`，並確保有帶 `member_id`（公開活動用會員價或會員報名時）。順手補 `member_no`（目前送空字串，從選取的 member 取）。

### 3.2 `App.tsx` `handleRegister`（[App.tsx:635-647](App.tsx)）
順序（reserve 在 insert 之後、redirect 之前）：
1. insert registration（pending）如現況。
2. 若 `newReg.points_used > 0`：呼叫 `supabase.rpc('points_reserve', {...})`。
   - 失敗（餘額不足）→ alert、刪除剛 insert 的 pending 報名單、`return false`。
3. coupon 標記維持原狀（行 640）。
4. **0 元訂單特例**：若 `finalPrice === 0`（全額用點數+折扣抵掉）→ 直接把報名單 `payment_status='paid'`、`paid_at=now`，並呼叫 `points_commit(order_no)`，**跳過藍新導向**，導去成功頁。

> 由於前端拿不到 RPC 內最終餘額的權威值，reserve 成功後可 `refreshRegistrations()` 並重抓會員餘額更新畫面。

### 驗證清單
- [ ] 選會員後顯示正確餘額；輸入超過上限會被夾住。
- [ ] 折扣券 + 點數可疊加，金額正確。
- [ ] 餘額不足時報名被擋、不留下孤兒報名單。
- [ ] 0 元訂單不進藍新、直接完成且 ledger 出現 freeze→redeem。

### Anti-pattern 守則
- 🚫 不要在前端自己把 `points_balance` 減掉再 update；只呼叫 `points_reserve`。
- 🚫 點數區不要在「沒有選會員」時出現（無 member_id 無法 reserve）。

---

## Phase 4：Edge Function 核銷 / 回補

### `supabase/functions/newebpay-notify/index.ts`
- **成功 + 一般活動報名分支**（[index.ts:239-305](supabase/functions/newebpay-notify/index.ts)）：在更新 `payment_status='paid'` 後，新增
  `await supabase.rpc('points_commit', { p_order_no: merchantOrderNo })`。
- **失敗分支**（目前只 log，[index.ts:417-419](supabase/functions/newebpay-notify/index.ts)）：新增——若該 `merchant_order_no` 對應 `registrations` 且有點數凍結，呼叫 `points_refund`。（可不分前綴直接呼叫 refund，RPC 內部自會對非 frozen 單 no-op。）
- commit/refund 皆冪等（Phase 1 保證），所以重複回呼安全。

> ⚠️ 部署：Edge Function 改完要 `supabase functions deploy newebpay-notify --no-verify-jwt`（CLAUDE.md）。需確認線上有設 `SUPABASE_SERVICE_ROLE_KEY`；即使沒有，RPC 為 `SECURITY DEFINER` 仍可運作（這正是用 RPC 的理由）。

### 驗證清單
- [ ] 用測試金鑰跑一筆有點數抵扣的報名→付款成功→ledger 出現 redeem、餘額不再變動。
- [ ] 模擬付款失敗回呼→餘額被加回、ledger 出現 refund。
- [ ] 對同一筆重送回呼兩次→餘額與 ledger 不重複。

---

## Phase 5：後台點數管理

### `pages/AdminDashboard.tsx` `MemberManager`（[AdminDashboard.tsx:2197-2706](pages/AdminDashboard.tsx)）
- 會籍資料區（[AdminDashboard.tsx:2629-2636](pages/AdminDashboard.tsx)）加「**目前點數**」唯讀顯示。
- 仿繳費紀錄區（[AdminDashboard.tsx:2639-2693](pages/AdminDashboard.tsx)）做「**點數調整**」：輸入 ±點數 + 原因 → 呼叫 `points_adjust`（帶當前管理員 email）。**不要**直接改 `formData.points_balance` 走 `handleUpdateMember`（[App.tsx:787-792](App.tsx)），那會繞過帳本。
- 「**點數明細**」：讀 `points_ledger`（where member_id）列出異動。
- 「**釋放逾時預扣**」工具：列出 `registrations` 中 `points_status='frozen'` 且 `payment_status='pending'` 且超過 N 天者，一鍵 `points_refund`（解決使用者放棄付款導致點數卡住；藍新放棄不會回呼）。可選：之後接 Supabase cron 自動化。

### 驗證清單
- [ ] 後台手動加點→餘額更新、ledger 出現 adjust 且記錄管理員。
- [ ] 明細正確顯示各類異動。
- [ ] 逾時預扣可被釋放回補。

---

## Phase 6：賺取點數（商業規則，最後接）

> 依 §開頭規則；若全為 0 可先跳過，僅保留呼叫點。

- **入會贈點**：`handleApproveMemberApplication`（[App.tsx:826-894](App.tsx)）insert member（行 886）後，若 `POINTS_ON_JOIN>0` → 呼叫 `points_earn(member_id, POINTS_ON_JOIN, '入會贈點', 'application', app_id)`。
- **續費贈點**：在 `handle_renewal_payment` RPC（[supabase_renewal_fix.sql:6-106](supabase_renewal_fix.sql)）內部，續費成功後加 `points_earn` 邏輯（直接寫在 RPC 內最安全，避免前端/回呼兩路各贈一次）。冪等靠 order_no。
- **活動消費回饋**：`points_commit` 內或回呼成功後，若 `POINTS_EARN_RATE>0`，依 `paid_amount` 回饋（建議寫進 `points_commit` RPC，與核銷同一交易）。

### 驗證清單
- [ ] 對應規則 >0 時才贈點；續費重複回呼不重複贈點。

---

## Phase 7：總驗證

- [ ] `npx tsc --noEmit` 全綠。
- [ ] grep 確認**沒有**前端直接寫 `points_balance`：`grep -rn "points_balance" pages App.tsx | grep -i update` 應只出現在「顯示」或 RPC 呼叫，無直接 `.update({points_balance`。
- [ ] 端到端：選會員→用點數+折扣→付款成功→餘額正確、ledger freeze+redeem 各一。
- [ ] 端到端：用點數→放棄付款→（手動釋放或失敗回呼）→餘額回補。
- [ ] 冪等：重送成功回呼、重送失敗回呼，餘額與帳本不亂。
- [ ] 0 元訂單流程完整。
- [ ] RLS：確認 anon 無法直接改 `members.points_balance` 或寫 `points_ledger`，但 RPC 正常。
- [ ] 部署：push main（前端）；`supabase functions deploy newebpay-notify --no-verify-jwt`（回呼）；`supabase_points.sql` 已套用到正式 DB。

---

## 變更檔案清單總覽

| 檔案 | Phase | 動作 |
|------|-------|------|
| `supabase_points.sql`（新增） | 1 | 欄位 + points_ledger + RLS + 5 個 RPC |
| `types.ts` | 2 | Member/Registration 加欄位、新增 PointsLedgerEntry |
| `constants.tsx` | 2 | 4 個點數常數 |
| `pages/ActivityDetail.tsx` | 3 | 點數抵扣 UI + 金額計算 + 送出帶 points_used |
| `App.tsx` | 3,6 | handleRegister reserve + 0 元特例；入會贈點 |
| `supabase/functions/newebpay-notify/index.ts` | 4 | 成功 commit / 失敗 refund |
| `pages/AdminDashboard.tsx` | 5 | 點數顯示/調整/明細/釋放逾時 |
| `supabase_renewal_fix.sql` | 6 | handle_renewal_payment 內加續費贈點 |
