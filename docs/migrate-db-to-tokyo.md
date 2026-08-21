# foodpowerteam 資料庫遷移計畫：孟買（ap-south-1）→ 東京（ap-northeast-1）

> 狀態：**✅ 切換完成（2026-07-12 00:10–00:45）**。正式環境已全面運行於東京
> `igowitmbnlvzznqgfpfl`。舊孟買專案保留至 2026-07-26（金流回呼 proxy 待命），屆時 pause、一個月後刪除。
> 收尾驗證：官網/活動頁僅連東京、0 破圖 0 console 錯誤；share OG 正常；筆數全一致；
> 切換窗口內舊庫零新增（無資料遺失）；DB 內 60 筆舊 storage 絕對網址已改寫。
> 待辦：使用者做一筆小額金流實測；2026-07-26 pause 舊專案。
>
> ---（以下為切換前的計畫紀錄）---
> 新專案：`igowitmbnlvzznqgfpfl`（foodpowerteam-tokyo，東京）。
> 乾跑結果：22 張表＋auth 9 帳號筆數全一致；Storage 399 檔／191MB 全同步；
> 9 個 functions 已部署（verify_jwt 對齊線上實況）；10 個 secrets 已複製（經
> migration-env-dump 直搬，該臨時函數已刪）；藍新簽章實測通過；pg_cron 已重建。
>
> ## 切換窗口待辦（預估 15–30 分鐘，選離峰、避開金流交易時段）
> 1. 重跑 `01`（全量補資料）→ `03`（驗證）→ `02`（Storage 增量）
> 2. 前端：`utils/supabaseClient.ts` 預設 URL/anon key 改新專案；Vercel env
>    `VITE_SUPABASE_URL`／`VITE_SUPABASE_ANON_KEY` 更新；`vercel.json` bom1→hnd1；push 部署
>    （新 anon key：`eyJ…igowitmbnlvzznqgfpfl…`，Dashboard API Keys 可查）
> 3. hub：`supabase secrets set FOODPOWER_SUPABASE_URL/FOODPOWER_SERVICE_ROLE_KEY`（rkmk 專案）
>    ＋ hub Vercel env 同步更新 → redeploy
> 4. 金流保險：舊專案 `newebpay-notify` 改部署為轉發 proxy → 新 URL（接住切換前發起的交易回呼）
> 5. 驗證：官網登入/活動/會員名錄、LIFF 綁定、客服 AI 問活動、金流小額實測、`/share/:id`
> 6. 觀察兩週無異常 → pause 舊專案（停止 $10/月×2 併行計費）→ 一個月後刪除

## 為什麼要搬

- 用戶在台灣，DB 在孟買：瀏覽器每次查詢來回 ~100-150ms（本站是 SPA、瀏覽器直連 Supabase，Vercel 區域救不了）。
- mrogenki-hub 客服 AI 每則客訊都跨區查本庫兩次（會員身分＋即時活動），東京→孟買一趟 ~130ms，直接疊在 AI 回覆延遲上。
- 其餘 5 個自家 Supabase 專案都在東京；搬過去後跨系統呼叫變成同機房個位數毫秒。

## 現況盤點（2026-07-10）

| 項目 | 規模 |
|---|---|
| 資料庫 | 25 MB、public 22 張表 |
| Auth 使用者 | 9（管理員） |
| Storage | 399 個檔案、182 MB |
| Edge Functions | 9 個：`newebpay-notify`(v57)、`newebpay-checkout`、`newebpay-query`、`newebpay-refund`、`festival-apply`、`create-admin`、`notify-admin`、`members-directory`、`verify-member` |

**下游依賴（切換時要一起改）：**

1. **foodpowerteam 前端**（Vercel env：`VITE_/NEXT_PUBLIC_ SUPABASE_URL`、`ANON_KEY`）＋ `api/share.ts`。
2. **mrogenki-hub Edge secrets**：`FOODPOWER_SUPABASE_URL`、`FOODPOWER_SERVICE_ROLE_KEY`（line-webhook / messenger-webhook 查會員與活動）。
3. **mrogenki-hub Vercel env**：同名兩個變數（LIFF 綁定 `/api/bind-member` 用）。
4. **藍新金流 NeweBPay**：notify/return URL 指向本專案 edge function 網址——**專案 ref 會變，URL 會變**。
5. 其他有存本庫 service key 的地方（請 grep 各專案 env）。

## 遷移原則

- 資料量小（DB 25MB + Storage 182MB），複製本身幾分鐘；風險全在「換 URL/金鑰」與金流。
- 舊專案**保留至少兩週不刪**（先不 pause），隨時可回滾。
- JWT secret 會換：9 位管理員既有登入 session 失效，重新登入即可（會員端無帳號登入，不受影響）。

## 階段一：事前準備（不影響線上，任何時間可做）

- [ ] 東京開新 Supabase 專案（同 org），記下新 ref / URL / anon key / service key
- [ ] 以 repo 的 migrations（或 `supabase db dump --schema-only`）在新專案建 schema，比對 22 張表、RLS policies、DB functions、extensions 一致
- [ ] 建立同名 Storage buckets（含 public/private 設定）
- [ ] 部署 9 個 edge functions 到新專案；`supabase secrets set` 補齊（NeweBPay 金鑰、LINE、SERVICE_ROLE 等——對照舊專案 secrets 清單）
- [ ] Storage 檔案預同步：舊 → 新（181MB，可用腳本列 objects 逐檔搬）
- [ ] 乾跑一次 `pg_dump`（`--schema=public --schema=auth` data-only）→ restore 到新專案，驗證可行與耗時
- [ ] 準備「env 替換清單」：兩邊 Vercel、hub Supabase secrets、本 repo `.env.local`

## 階段二：切換窗口（建議離峰深夜，預估 30–60 分鐘）

- [ ] 前端掛維護公告（或選訊息量最低時段直接切）
- [ ] **金流靜止**：確認窗口內無進行中交易；窗口開始後不再發起新 checkout
- [ ] `pg_dump`（data-only）舊庫 → restore 新庫（覆蓋預同步後的資料差異）
- [ ] Storage 增量同步（比對缺漏檔案）
- [ ] 換 env 並重佈署：
  - [ ] foodpowerteam Vercel env → 新 URL/keys；`vercel.json` regions `bom1` → `hnd1`
  - [ ] mrogenki-hub：`supabase secrets set FOODPOWER_SUPABASE_URL=... FOODPOWER_SERVICE_ROLE_KEY=...`（edge functions 自動吃新值）
  - [ ] mrogenki-hub Vercel env → 同步更新後 redeploy
- [ ] **NeweBPay**：金流後台的 Notify/Return URL 改成新專案 function URL（若 URL 是每筆交易帶入，則確認前端 checkout 已用新 URL）
- [ ] 舊專案 `newebpay-notify` 改成轉發 proxy → 新 URL（接住切換前發起、切換後才回呼的交易），保留兩週

## 階段三：驗證清單

- [ ] 官網登入（管理員重新登入）、活動列表、會員名錄正常
- [ ] hub 客服：LINE 傳「有什麼活動」→ AI 正確報活動（走新庫）；已綁定會員問點數正確
- [ ] LIFF 綁定流程跑一次
- [ ] 金流沙盒（或小額實測）：checkout → notify 入帳 → query/refund
- [ ] `/share/:id` 分享卡 OG 正常
- [ ] Supabase logs 無 401/500 異常

## 回滾

任何驗證失敗：env 全部改回舊專案值並 redeploy（舊專案完好未動），NeweBPay URL 改回。成本≈重佈署時間。

## 事後

- [ ] 兩週無異常 → pause 舊專案；一個月後刪除
- [x] 更新各 repo 交接文件中的 ref（kpltydyspvzozgxfiwra → igowitmbnlvzznqgfpfl，2026-08-21 完成）
- [ ] （次優先）foodpowerclub 新加坡 → 東京，同本計畫流程，無金流、更簡單
