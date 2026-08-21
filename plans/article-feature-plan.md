# 文章/專欄功能 + SEO 實作計畫

> 目標：官網新增「文章/專欄」（產業資訊、專家觀點），小編後台代發，作者為 byline 欄位。
> SEO 全套：每篇獨立 meta + JSON-LD Article + **build 時逐篇預渲染成含內容的靜態 HTML** + 自動加進 sitemap。
>
> 技術棧：React 19 + TS + Vite（SSR 預渲染）+ Tailwind + Supabase。
> 部署：前端 push `main` → Vercel（build 會跑預渲染）；DB 走 Supabase MCP `apply_migration` / CLI。
> 每階段跑 `npx tsc --noEmit`；SEO 階段跑 `npm run build` 並檢查 `dist/article/<slug>/index.html`。

---

## 已確認範圍（不可偏離）
1. **作者 = byline 欄位**（author_name / author_title / author_bio / author_avatar），不需專家登入。
2. **SEO 全套**：per-article meta + JSON-LD + build 預渲染（內容進 HTML）+ sitemap 自動加。
3. **文章要分類**（constants 預設清單選）。

---

## Phase 0 — Discovery（已完成，Allowed APIs 與關鍵事實）

### A. 內容編輯器（複用，SSR 安全）
- `Block` 型別定義在 **`components/BlockEditor.tsx:4-11`**（`{ id, type:'text'|'image'|'video', content, caption? }`），`BlockRenderer` 由此 import。
- **`BlockRenderer`（`components/BlockRenderer.tsx:1-72`）是純渲染、無 useEffect/window/document → `renderToString` 可輸出真 HTML**（SSR 安全）。value = **JSON string of `Block[]`**。
- **`BlockEditor` 不可進 SSR**（用 useState/useEffect/file input + lucide-react）。
- ⚠️ **關鍵**：`BlockRenderer` 目前 `import { Block } from './BlockEditor'` → 會把編輯器的 lucide 拉進 SSR bundle。**Phase 2 要把 `Block`/`BlockType` 抽到獨立檔（`types.ts` 或 `components/blockTypes.ts`）**，讓 BlockRenderer 與 SSR 路徑不 import 編輯器。
- 圖片上傳：`App.tsx:544-566` `handleUploadImage(file)→Promise<string>`，bucket **`activity-images`**、folder `activity-covers`，回傳 publicUrl（失敗回 `''`）。直接複用同一個 handler。
- 複用點：後台表單接 BlockEditor `AdminDashboard.tsx:1786-1794`；顯示 `ActivityDetail.tsx:416` `<BlockRenderer value={...} />`。

### B. SSR / 預渲染機制
- build：`vite build && vite build --ssr entry-server.tsx --outDir dist-server && node scripts/prerender.mjs`（`package.json` build）。
- `entry-server.tsx:11-29` `render(url)`：設 `globalThis.__SSR_URL__=url` → `renderToPipeableStream(<App/>)`，**`onAllReady` 等 React.lazy Suspense，但不等 useEffect**。→ **useEffect 抓的資料在預渲染 HTML 是空的**。
- `App.tsx:1039-1042`：`typeof window==='undefined'` → StaticRouter + `location=__SSR_URL__`；SSR 時繞過 loading gate（`1044`）直接渲染。
- `seo/routeMeta.ts`：`ROUTE_META` 靜態 map、`PRERENDER_ROUTES=Object.keys(ROUTE_META)`、`headTagsHtml(path)`（`:25-46`）同步產 head meta（title/desc/canonical/og/twitter，`esc()` 防注入）。
- `scripts/prerender.mjs:26-45`：讀 `dist/index.html` 當 template → 對每個 route `render()` → 塞 headHtml 進 `</head>`、body 進 `<div id="root">` → 寫 `dist/<route>/index.html`。每頁失敗非致命。
- `scripts/prerender.mjs` 是 Node ESM，**可 `import { createClient } from '@supabase/supabase-js'`**（是 dependency `2.48.1`），用 **`process.env.*`**（非 `import.meta.env`）。
- **`sitemap.xml` 目前是 `public/sitemap.xml` 靜態檔**（8 筆），Vite 原樣複製到 dist。要含動態文章 → 在 prerender.mjs 產出 `dist/sitemap.xml`。
- client entry `index.tsx:19-24` 用 `createRoot`（非 `hydrateRoot`）→ **不強制 hydration match**，SSR 只為爬蟲產靜態 HTML，client 掛載後自行重抓即可。

### C. App 整合 / 後台（複用樣式，file:line）
- lazy import 區 `App.tsx:9-34`；`Seo` 靜態 import `App.tsx:36`。
- 路由：公開頁樣式 `App.tsx:1079`（`<><Seo .../><Page .../></>`）；`:param` 詳情頁 `App.tsx:1084`。新路由加在 `/milestones`（`1091`）旁。
- `isStandaloneLandingPath()`（`App.tsx:52-54`）**不含** `/articles`、`/article` → 會正常顯示全站 Header/Footer（正確，免改）。
- fetchData：`publicQueries` vs `adminQueries`（`App.tsx:314-330`），**結果用位置索引**（admin `results[1..8]`，`356-365`）。⚠️ 直接往 publicQueries 加 query 會位移所有 admin 索引。→ **改用「獨立抓取」**（比照非登入 members 抓取 `App.tsx:393-407` 或 `refreshArticles()`），不動索引。
- CRUD handler 樣式（樂觀更新 + 寫回）：`App.tsx:666-693`（handleAdd/Update/DeleteActivity）。
- 導覽列：桌機 link `App.tsx:91`、手機 link `App.tsx:128`（含 `onClick={()=>setIsOpen(false)}`）。
- 後台 Manager 模板：**`MilestoneManager`（`AdminDashboard.tsx:3641-3807`）比 ActivityManager 乾淨**，是「列表+表單+圖片上傳」的自足元件，最接近文章管理需求。ActivityManager（`1152-1863`）夾雜報名/收據邏輯，不需要。
- 後台 Manager 內：edit/create/save/imageChange handlers `AdminDashboard.tsx:1219-1227`；BlockEditor 接法 `1786-1794`。
- 後台側邊 link `AdminDashboard.tsx:255`（放進 `isManager` 區塊 `253-286`）；route mount `AdminDashboard.tsx:3854`（catch-all `3865` 之前）；props 介面 `AdminDashboard.tsx:65-104`；從 App 傳入 `App.tsx:1114-1168`。
- `types.ts`：`UserRole`（`10-14`：STAFF/MANAGER/SUPER_ADMIN）；`Activity` 樣式 `32-51`；`IndustryCategories as const` 樣式 `types.ts:148-158`。

### ⚠️ 反樣式守則（全程）
- SSR 路徑（ArticleDetail 的 render + prerender）**只准 import `BlockRenderer` 與抽出的 `Block` 型別**，不准 import `BlockEditor`。
- fetchData **不要**把 articles 塞進 `publicQueries` 陣列（會位移 admin 索引）→ 用獨立抓取。
- 匿名頁一律只讀 `status='published'`（RLS 或 view）。
- prerender 的 Supabase 連線**必須指向與線上前端相同的專案**（見 Phase 0-D）。

### D. 🚨 上線前必查：Supabase 專案 / 環境變數
- 前端 `utils/supabaseClient.ts:5-6` 有 hardcoded `DEFAULT_URL`/`DEFAULT_KEY`（`igowitmbnlvzznqgfpfl`），但正式站以 **Vercel 的 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`** 為準。本專案所有 DB 作業經 MCP 在 `igowitmbnlvzznqgfpfl`（東京）。
- **執行 Phase 1 前，先確認「線上前端實際連的專案 = 建立 articles 表的專案」**（用 MCP 讀 Vercel env，或以線上 admin 能看到本 session 既有資料反推）。若兩者不一致,文章會建在一個專案、前端讀另一個 → 全空。
- prerender.mjs 取 env 用 `process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL`（+ 對應 anon key）；**不要 fallback 到 hardcoded DEFAULT**（可能指向錯的專案）。Vercel build env 要有 `VITE_SUPABASE_*`（build 前確認）。

---

## Phase 1 — DB：articles 表 + RLS

### 實作（Supabase migration）
```sql
create table if not exists public.articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  excerpt       text,                       -- 摘要（列表 + meta description）
  content       text not null default '[]', -- BlockEditor JSON string of Block[]
  cover         text,                        -- 封面圖 URL
  category      text,                        -- 從 ARTICLE_CATEGORIES 選
  author_name   text,
  author_title  text,
  author_bio    text,
  author_avatar text,
  status        text not null default 'draft' check (status in ('draft','published')),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_articles_status_pub on public.articles(status, published_at desc);
create unique index if not exists idx_articles_slug on public.articles(slug);

alter table public.articles enable row level security;
-- 匿名只讀已發布；authenticated（後台）全權
create policy "articles anon read published" on public.articles
  for select to anon, authenticated using (status = 'published');
create policy "articles admin all" on public.articles
  for all to authenticated using (true) with check (true);
```
> 註：`articles admin all` 給所有 authenticated；與專案既有慣例一致（後台登入者可管）。若要更嚴可加 `is_fpt_admin()`（見 festival policy），但先對齊現有 activities/milestones 慣例。

### 驗證
- [ ] MCP `list_tables` 見 `articles`。
- [ ] 匿名（anon key）`select` 只回 `status='published'`；draft 讀不到。
- [ ] `get_advisors`(security) 無新高風險（RLS 已開）。

### 反樣式守則
- slug 唯一（unique index）。content 存 BlockEditor 的 JSON 字串（與 activities.description 同格式）。

---

## Phase 2 — 型別 + 抽出 Block 型別 + 分類常數

### 實作
1. **抽 Block 型別**（讓 SSR/BlockRenderer 不 import 編輯器）：
   - 新增 `components/blockTypes.ts`：`export type BlockType='text'|'image'|'video'; export interface Block {...}`（從 `BlockEditor.tsx:4-11` 搬出）。
   - `BlockEditor.tsx`、`BlockRenderer.tsx` 改 `import { Block } from './blockTypes'`（BlockEditor 可 re-export 保相容）。
2. `types.ts` 加 `Article`（比照 `Activity` 樣式 `types.ts:32-51`）：
```ts
export interface Article {
  id: string | number;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;            // BlockEditor JSON
  cover?: string;
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
```
3. `types.ts` 加分類常數（比照 `IndustryCategories` `148-158`）：
```ts
export const ARTICLE_CATEGORIES = ['產業資訊','專家觀點','協會動態','活動報導'] as const;
export type ArticleCategory = typeof ARTICLE_CATEGORIES[number];
```

### 驗證
- [ ] `npx tsc --noEmit` 通過。
- [ ] `grep "from './BlockEditor'" components/BlockRenderer.tsx` 應為 0（已改 blockTypes）。

### 反樣式守則
- 不要在 BlockRenderer 或 ArticleDetail import BlockEditor。

---

## Phase 3 — 公開頁 + 路由 + 導覽 + 資料抓取

### 實作
1. **App.tsx 狀態 + 抓取**：
   - `const [articles, setArticles] = useState<Article[]>([]);`（`App.tsx:200` 旁）。
   - **獨立抓取**（不動 publicQueries 索引）：加一支永遠執行的 fetch：
     `supabase.from('articles').select('*').eq('status','published').order('published_at',{ascending:false}).then(({data})=> data && setArticles(data as Article[]))`（比照 members fallback `App.tsx:393-407`）。
   - `refreshArticles()` helper（比照 `App.tsx:624-633`）。
2. **`pages/ArticleList.tsx`**（props `articles`）：卡片列表（封面/標題/摘要/分類/作者/日期）+ 分類篩選（ARTICLE_CATEGORIES）。只顯示 published（來源已篩）。空狀態。
3. **`pages/ArticleDetail.tsx`**（props `articles`，`useParams<{slug}>`）：
   - 先從 props `articles` 找該 slug；找不到再 `supabase.from('articles').select('*').eq('slug',slug).eq('status','published').maybeSingle()`（比照 ActivityDetail `:id` 抓法）。
   - 顯示：封面、標題、作者 byline（avatar/name/title/bio）、日期、分類、`<BlockRenderer value={article.content} />`。
   - **SSR 初始資料**：見 Phase 5（讀 `globalThis.__SSR_DATA__`）。
   - `<Seo>` + JSON-LD（Phase 5 統一處理 meta；此處先放前端 Seo）。
4. **路由**（`App.tsx`，加在 `/milestones` 旁 `1091`）：
```tsx
const ArticleList = lazy(() => import('./pages/ArticleList'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));
// ...
<Route path="/articles" element={<><Seo title="專欄文章" path="/articles" description="食在力量專欄：產業資訊與專家觀點分享。" /><ArticleList articles={articles} /></>} />
<Route path="/article/:slug" element={<ArticleDetail articles={articles} />} />
```
（詳情頁的 `<Seo>` 由 ArticleDetail 內部依文章動態設，見 Phase 5。）
5. **導覽列**：桌機 `App.tsx:92` 後加 `<Link to="/articles" ...>專欄</Link>`；手機 `App.tsx:129` 後加對應（含 `onClick={()=>setIsOpen(false)}`）。

### 驗證
- [ ] `npx tsc --noEmit` 通過。
- [ ] 匿名（無痕）`/articles` 顯示已發布文章；`/article/<slug>` 顯示內容（BlockRenderer）。
- [ ] draft 文章不出現在公開列表/詳情。

### 反樣式守則
- articles 抓取用獨立 fetch，勿進 publicQueries 陣列。
- 詳情頁找不到文章要有 404/返回，不可白屏。

---

## Phase 4 — 後台 ArticleManager

### 實作
1. **`ArticleManager`**（放進 `AdminDashboard.tsx`，複用 `MilestoneManager` `3641-3807` 骨架）：
   - state：`view:'list'|'edit'`、`editingId`、`formData`。
   - list：文章卡片（標題/分類/狀態徽章/日期）+ 編輯/刪除 + **發布/取消發布** 切換。
   - edit form 欄位：標題、slug（自動由標題產生、可手動改，見下）、分類（ARTICLE_CATEGORIES select）、摘要 excerpt、封面（`handleImageChange`→onUploadImage）、作者 4 欄、`<BlockEditor value={formData.content} onChange={val=>setFormData({...formData,content:val})} onUploadImage={onUploadImage} />`、狀態（草稿/發布）。
   - handlers 比照 `AdminDashboard.tsx:1219-1227`。
   - **slug 產生**：`slugify(title)`：轉小寫、空白→`-`、移除非 `[a-z0-9-]`；若結果為空（純中文）→ fallback `article-${Date.now().toString(36)}`；可手動覆寫。發布前確保 slug 非空且唯一（存檔衝突時後端 unique index 會擋，前端提示）。
2. **App.tsx CRUD**：`handleAddArticle/handleUpdateArticle/handleDeleteArticle`（比照 `App.tsx:666-693`，樂觀更新 + `supabase.from('articles').insert/update/delete`；發布時設 `published_at=now()`、`status='published'`）。傳入 AdminDashboard。
3. **後台掛載**：
   - props 介面加 `articles` + `onAddArticle/onUpdateArticle/onDeleteArticle`（`AdminDashboard.tsx:65-104`）。
   - 側邊 link（`isManager` 區塊，`AdminDashboard.tsx:257` 後）：`<Link to="/admin/articles" ...><Newspaper size={20}/><span>專欄管理</span></Link>`。
   - route mount（`AdminDashboard.tsx:3854` 樣式，catch-all `3865` 前）：`<Route path="/articles" element={<ArticleManager articles={props.articles} onAdd={...} onUpdate={...} onDelete={...} onUploadImage={props.onUploadImage} />} />`。

### 驗證
- [ ] `npx tsc --noEmit` 通過。
- [ ] 後台可新增文章（用 BlockEditor 編內容、上傳封面、填作者、選分類）、存草稿、發布、取消發布、刪除。
- [ ] 發布後匿名前台 `/articles` 立即可見（重整）。

### 反樣式守則
- 用 `UserRole.MANAGER`/`SUPER_ADMIN`（非 `ADMIN`）。
- 圖片一律走 `onUploadImage`（Supabase Storage），不存 base64。

---

## Phase 5 — SEO 全套（預渲染 + meta + JSON-LD + sitemap）

### 實作
1. **ArticleDetail SSR 初始資料**：
   - `entry-server.tsx` `render(url, data?)`：新增第二參數，`(globalThis as any).__SSR_DATA__ = data;`（在 `__SSR_URL__` 旁）。
   - `ArticleDetail`：SSR 時同步讀初始資料——
     `const ssrArticle = (typeof window==='undefined') ? (globalThis as any).__SSR_DATA__ : undefined;`
     `const [article,setArticle]=useState(ssrArticle);` client 端 `useEffect` 沒有才抓。→ SSR HTML 直接含 `<BlockRenderer>` 內容。
2. **per-article head meta + JSON-LD**：
   - `seo/routeMeta.ts` `headTagsHtml(path, meta?)`：加可選 `meta`（title/description/image/url/type/publishedAt/author），有則短路 ROUTE_META 查表；`og:type=article`；append `<script type="application/ld+json">`（Article schema：headline/description/image/datePublished/author/publisher）。JSON-LD 用 `JSON.stringify` 並防 `</script>`。
3. **`scripts/prerender.mjs` 擴充**：
   - `import { createClient }`，用 `process.env.VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` 建 client；`select` 已發布文章（slug/title/excerpt/cover/content/category/author_*/published_at）。
   - 對 `/articles`（列表，可傳全部已發布給 SSR）與每篇 `/article/<slug>`：呼叫 `render(route, articleData)`，寫 `dist/article/<slug>/index.html`（headHtml 用 per-article meta+JSON-LD）。失敗非致命。
   - **產 `dist/sitemap.xml`**：以 `public/sitemap.xml` 為基底 + 每篇 `<url><loc>${SITE}/article/${slug}</loc><lastmod>${published_at}</lastmod>...`。
   - 若 env 缺（本機無 VITE_SUPABASE_*）→ 印警告、跳過文章預渲染（不 fail build），列表/靜態頁照舊。
4. **entry-server `PRERENDER_ROUTES`**：文章路由是動態的（build 時查 DB），由 prerender.mjs 自行組 route 清單（不寫死在 ROUTE_META）。

### 文件參考
- render 注入：`entry-server.tsx:11-29`；__SSR_URL__ 讀法 `App.tsx:1039-1042`。
- headTagsHtml：`seo/routeMeta.ts:25-46`；prerender 注入 `scripts/prerender.mjs:31-45`。
- supabaseClient env 名稱：`utils/supabaseClient.ts:21-22`（`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`）。

### 驗證
- [ ] `npm run build` 成功（含預渲染）。
- [ ] `cat dist/article/<slug>/index.html`：`<title>` 是文章標題、`<meta name="description">` 是摘要、`<script type="application/ld+json">` 存在、`<div id="root">` 內含**文章正文文字**（BlockRenderer 輸出，非空 shell）。
- [ ] `dist/sitemap.xml` 含每篇 `/article/<slug>`。
- [ ] 用 `grep -c "BlockEditor" dist-server/entry-server.js`（或檢查 SSR bundle）確認 SSR 路徑未拉入編輯器（Block 型別已抽出）。

### 反樣式守則
- prerender 連線用 `process.env.*`，**不 fallback hardcoded DEFAULT**；env 缺就跳過、不編錯資料。
- JSON-LD 要 `</script>` 防注入；meta/title 用 `esc()`。
- SSR 路徑不 import BlockEditor（否則 lucide 進 SSR bundle、可能爆）。

---

## Phase 6 — 驗證與部署

### 檢查
- [ ] `npx tsc --noEmit` 全綠；`npm run build` 成功。
- [ ] `grep -rn "UserRole.ADMIN" pages/ components/` 為 0。
- [ ] 端對端：後台建文章→發布→匿名 `/articles` 見卡片→`/article/<slug>` 見內容→`dist/article/<slug>/index.html` 有正文+meta+JSON-LD→sitemap 有該篇。
- [ ] draft 不外洩（匿名讀不到、不在 sitemap/預渲染）。
- [ ] `get_advisors`(security/performance) 無新高風險。
- [ ] 部署：`git push origin main`（Vercel build 跑預渲染）；DB migration 已套用**線上專案**。
- [ ] 部署後：Google Search Console 提交 sitemap；用「以 Google 檢視」測一篇文章可抓到正文。

### 反樣式守則
- 上 build 前務必確認 Vercel 有 `VITE_SUPABASE_*` 且指向線上專案（Phase 0-D）。

---

## 檔案異動總表
| 類型 | 檔案 | 動作 |
|------|------|------|
| DB | 新 migration | articles 表 + RLS + index |
| 型別 | `components/blockTypes.ts` | 新增（抽 Block 型別） |
| 型別 | `components/BlockEditor.tsx`、`BlockRenderer.tsx` | 改 import blockTypes |
| 型別 | `types.ts` | +Article +ARTICLE_CATEGORIES |
| 前端 | `pages/ArticleList.tsx`、`pages/ArticleDetail.tsx` | 新增 |
| 前端 | `App.tsx` | +state +獨立抓取 +CRUD +2 route +2 lazy +2 nav link +傳 props |
| 後台 | `pages/AdminDashboard.tsx` | +ArticleManager +側邊 link +route mount +props 介面 |
| SEO | `entry-server.tsx` | render(url,data) 注入 __SSR_DATA__ |
| SEO | `seo/routeMeta.ts` | headTagsHtml(path,meta?) + JSON-LD |
| SEO | `scripts/prerender.mjs` | 查 DB 已發布文章、逐篇預渲染、產 sitemap |

## 未決／執行時現場確認
1. **線上 Supabase 專案 = 建表專案**（Phase 0-D）——動 DB 前先確認，最高優先。
2. Vercel build env 是否有 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`（prerender 要用）。
3. slug 策略：純中文標題 fallback 規則（`article-${ts36}`）是否可接受，或要求小編填英文 slug。
4. 文章列表要不要分頁（初期文章少可先不分頁）。
