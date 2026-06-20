-- =========================================================
-- 鎖住孤兒表 finance_records
-- =========================================================
-- finance_records 為空且程式碼未使用的孤兒表（真正使用的是 financial_records）。
-- 開啟 RLS 但不加任何 policy → anon / authenticated 完全無法存取，
-- 只有 service_role 能存取，藉此關閉資料外洩風險。
-- 之後若要啟用此表，再補上對應 policy 即可。

ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;
