-- 退款功能：新增退費追蹤欄位 + 續費退款 RPC
-- 套用方式：Supabase Studio SQL Editor 或 supabase db push / MCP apply_migration

-- 1. 退費追蹤欄位（payment_status='refunded' 仍為主要標記）
ALTER TABLE public.registrations        ADD COLUMN IF NOT EXISTS refunded_at      timestamptz;
ALTER TABLE public.registrations        ADD COLUMN IF NOT EXISTS refund_amount    numeric;
ALTER TABLE public.registrations        ADD COLUMN IF NOT EXISTS refund_trade_no  text;

ALTER TABLE public.member_applications  ADD COLUMN IF NOT EXISTS refunded_at      timestamptz;
ALTER TABLE public.member_applications  ADD COLUMN IF NOT EXISTS refund_amount    integer;
ALTER TABLE public.member_applications  ADD COLUMN IF NOT EXISTS refund_trade_no  text;

ALTER TABLE public.member_renewals      ADD COLUMN IF NOT EXISTS refunded_at      timestamptz;
ALTER TABLE public.member_renewals      ADD COLUMN IF NOT EXISTS refund_amount    integer;
ALTER TABLE public.member_renewals      ADD COLUMN IF NOT EXISTS refund_trade_no  text;

-- 2. 續費退款 RPC：標記已退費 + 縮回會籍 1 年（為 handle_renewal_payment 的對稱反向操作，冪等）
CREATE OR REPLACE FUNCTION public.handle_renewal_refund(
  p_order_no        text,
  p_refund_amount   integer,
  p_refund_trade_no text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_member_id      text;
  v_was_paid       boolean;
  v_current_expiry date;
  v_new_expiry     date;
BEGIN
  SELECT member_id, (payment_status = 'paid')
    INTO v_member_id, v_was_paid
  FROM member_renewals
  WHERE merchant_order_no = p_order_no;

  IF v_member_id IS NULL THEN
    RETURN; -- 找不到續約單
  END IF;

  -- 標記退費
  UPDATE member_renewals
  SET payment_status   = 'refunded',
      refunded_at      = now(),
      refund_amount    = p_refund_amount,
      refund_trade_no  = p_refund_trade_no
  WHERE merchant_order_no = p_order_no;

  -- 冪等：原本就不是 paid（例如已退過）就不重複縮回會籍
  IF NOT v_was_paid THEN
    RETURN;
  END IF;

  -- 縮回會籍 1 年（對稱反向 handle_renewal_payment 的 +1 年）
  SELECT NULLIF(membership_expiry_date, '')::date INTO v_current_expiry
  FROM members WHERE id = v_member_id;

  IF v_current_expiry IS NOT NULL THEN
    v_new_expiry := v_current_expiry - INTERVAL '1 year';
    UPDATE members
    SET membership_expiry_date = to_char(v_new_expiry, 'YYYY-MM-DD'),
        status = CASE WHEN v_new_expiry > CURRENT_DATE THEN 'active' ELSE 'expired' END
    WHERE id = v_member_id;
  END IF;
END;
$function$;
