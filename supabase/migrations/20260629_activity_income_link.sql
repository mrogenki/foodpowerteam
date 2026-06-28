-- 活動收入連動收支管理（已透過 MCP apply_migration 套用，這裡留底）
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS order_no text;
CREATE INDEX IF NOT EXISTS financial_records_order_no_idx ON public.financial_records(order_no);

-- 活動報名付款成功 → 新增一筆「活動收入」（冪等：同一 order_no 只建一次）
CREATE OR REPLACE FUNCTION public.add_activity_income(p_order_no text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE r record; v_receipt text; v_payer text; v_amount int;
BEGIN
  IF EXISTS (SELECT 1 FROM financial_records WHERE order_no = p_order_no) THEN
    RETURN json_build_object('ok', true, 'already', true);
  END IF;

  SELECT * INTO r FROM registrations WHERE merchant_order_no = p_order_no LIMIT 1;
  IF NOT FOUND THEN RETURN json_build_object('ok', false, 'reason', 'not_found'); END IF;

  v_amount := COALESCE(r.paid_amount, 0)::int;
  IF v_amount <= 0 THEN RETURN json_build_object('ok', false, 'reason', 'no_amount'); END IF;

  v_payer := COALESCE(NULLIF(r.name,''), r.member_name, '');
  IF COALESCE(NULLIF(r.company_title,''), r.company, '') <> '' THEN
    v_payer := v_payer || '（' || COALESCE(NULLIF(r.company_title,''), r.company) || '）';
  END IF;

  SELECT receipt_no INTO v_receipt FROM receipts
    WHERE order_no = p_order_no AND status IS DISTINCT FROM 'cancelled' LIMIT 1;

  INSERT INTO financial_records (date, type, category, amount, description, party, invoice_no, order_no)
  VALUES (
    to_char(now() AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD'),
    'income', '活動收入', v_amount,
    '活動：' || COALESCE(r.title,'') || '（' || COALESCE(NULLIF(r.name,''), r.member_name, '') || '）',
    v_payer, v_receipt, p_order_no
  );

  RETURN json_build_object('ok', true, 'amount', v_amount);
END; $function$;

REVOKE ALL ON FUNCTION public.add_activity_income(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_activity_income(text) TO service_role;
