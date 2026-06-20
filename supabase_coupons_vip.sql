-- =========================================================
-- VIP 免費邀請券
-- =========================================================
-- coupons.is_free = true 代表此券為 VIP 免費邀請（100% 免費）。
-- 不依賴 discount_amount 計算，活動價格變動也不會失準。
-- 沿用既有 is_used 單次使用機制：一條連結用過即失效。

ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;
