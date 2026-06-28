-- 燒肉/火鍋祭納入後台一鍵刷退：補退費追蹤欄位（已透過 MCP 套用，留底）
ALTER TABLE public.festival_registrations ADD COLUMN IF NOT EXISTS refunded_at     timestamptz;
ALTER TABLE public.festival_registrations ADD COLUMN IF NOT EXISTS refund_amount   integer;
ALTER TABLE public.festival_registrations ADD COLUMN IF NOT EXISTS refund_trade_no text;
