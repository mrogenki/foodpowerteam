-- =========================================================
-- 燒肉/火鍋祭：訂單號歷史（防止付款找不到列）
-- =========================================================
-- 「重新產生連結」或重複點擊「繳費」會用新的 FEST_ 訂單號覆寫
-- festival_registrations.merchant_order_no。若客戶付的是舊訂單號，
-- 藍新回呼帶舊號回來會找不到列，導致已付款仍顯示待付款。
--
-- 解法：保留每筆報名曾經產生過的所有訂單號，回呼時用
-- 「目前訂單號 或 歷史訂單號包含此號」來比對。

ALTER TABLE public.festival_registrations
  ADD COLUMN IF NOT EXISTS order_no_history text[] NOT NULL DEFAULT '{}';

-- 回填現有列目前的訂單號
UPDATE public.festival_registrations
SET order_no_history = ARRAY[merchant_order_no]
WHERE merchant_order_no IS NOT NULL
  AND NOT (merchant_order_no = ANY(order_no_history));
