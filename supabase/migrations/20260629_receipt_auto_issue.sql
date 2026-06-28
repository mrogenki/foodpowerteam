-- 線上收據自動開立：欄位 + RPC（已透過 MCP apply_migration 套用，這裡留底）
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS public_token uuid;
ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.receipts ALTER COLUMN public_token SET DEFAULT gen_random_uuid();
UPDATE public.receipts SET public_token = gen_random_uuid() WHERE public_token IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS receipts_public_token_idx ON public.receipts(public_token);

-- 依繳費來源開立收據（伺服端、冪等：每個 order_no 一張未作廢收據）
CREATE OR REPLACE FUNCTION public.issue_receipt_for_order(p_order_no text, p_source text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_existing receipts%rowtype;
  v_prefix text; v_seq int; v_receipt_no text; v_token uuid;
  v_payer text; v_tax text; v_amount int; v_email text; v_pm text; v_fee text; v_note text;
  r record;
BEGIN
  SELECT * INTO v_existing FROM receipts WHERE order_no = p_order_no AND status IS DISTINCT FROM 'cancelled' LIMIT 1;
  IF FOUND THEN
    RETURN json_build_object('ok', true, 'already', true, 'receipt_no', v_existing.receipt_no, 'token', v_existing.public_token, 'email', v_existing.email, 'payer_name', v_existing.payer_name, 'amount', v_existing.amount);
  END IF;

  IF p_source = 'registration' THEN
    SELECT * INTO r FROM registrations WHERE merchant_order_no = p_order_no LIMIT 1;
    IF NOT FOUND THEN RETURN json_build_object('ok', false, 'reason', 'not_found'); END IF;
    v_payer := COALESCE(NULLIF(r.name,''), r.member_name, '');
    IF COALESCE(NULLIF(r.company_title,''), r.company, '') <> '' THEN
      v_payer := v_payer || '（' || COALESCE(NULLIF(r.company_title,''), r.company) || '）';
    END IF;
    v_tax := r.tax_id; v_amount := COALESCE(r.paid_amount,0)::int; v_email := r.email; v_pm := r.payment_method;
    v_fee := 'donation'; v_note := '活動：' || COALESCE(r.title,'');
    IF (v_email IS NULL OR v_email='') AND r.member_id IS NOT NULL THEN
      SELECT email INTO v_email FROM members WHERE id = r.member_id;
    END IF;
  ELSIF p_source = 'application' THEN
    SELECT * INTO r FROM member_applications WHERE merchant_order_no = p_order_no LIMIT 1;
    IF NOT FOUND THEN RETURN json_build_object('ok', false, 'reason', 'not_found'); END IF;
    v_payer := COALESCE(r.name,'');
    IF COALESCE(r.company_title,'') <> '' THEN v_payer := v_payer || '（' || r.company_title || '）'; END IF;
    v_tax := r.tax_id; v_amount := COALESCE(r.paid_amount,0)::int; v_email := r.email; v_pm := r.payment_method;
    v_fee := 'initiation'; v_note := '入會費';
  ELSIF p_source = 'renewal' THEN
    SELECT mr.amount AS amount, mr.payment_method AS payment_method, m.name AS name, m.email AS email, m.tax_id AS tax_id,
           COALESCE(NULLIF(m.company_title,''), m.company) AS comp
      INTO r FROM member_renewals mr LEFT JOIN members m ON m.id = mr.member_id WHERE mr.merchant_order_no = p_order_no LIMIT 1;
    IF NOT FOUND THEN RETURN json_build_object('ok', false, 'reason', 'not_found'); END IF;
    v_payer := COALESCE(r.name,'');
    IF COALESCE(r.comp,'') <> '' THEN v_payer := v_payer || '（' || r.comp || '）'; END IF;
    v_tax := r.tax_id; v_amount := COALESCE(r.amount,0)::int; v_email := r.email; v_pm := r.payment_method;
    v_fee := 'annual'; v_note := '會籍年費';
  ELSE
    RETURN json_build_object('ok', false, 'reason', 'bad_source');
  END IF;

  IF v_amount <= 0 THEN RETURN json_build_object('ok', false, 'reason', 'no_amount'); END IF;

  v_prefix := to_char(now() AT TIME ZONE 'Asia/Taipei', 'YYYYMMDD');
  PERFORM pg_advisory_xact_lock(hashtext('receipt_seq_' || v_prefix));
  SELECT COALESCE(MAX((substring(receipt_no from 9))::int), 0) + 1 INTO v_seq
    FROM receipts WHERE receipt_no LIKE v_prefix || '%' AND length(receipt_no) >= 9 AND substring(receipt_no from 9) ~ '^[0-9]+$';
  v_receipt_no := v_prefix || lpad(v_seq::text, 3, '0');
  v_token := gen_random_uuid();

  v_pm := CASE
    WHEN upper(coalesce(v_pm,'')) LIKE '%CREDIT%' THEN '信用卡'
    WHEN upper(coalesce(v_pm,'')) = 'VACC' THEN 'ATM轉帳'
    WHEN upper(coalesce(v_pm,'')) = 'WEBATM' THEN 'WebATM'
    WHEN upper(coalesce(v_pm,'')) = 'CVS' THEN '超商代碼'
    WHEN upper(coalesce(v_pm,'')) = 'BARCODE' THEN '超商條碼'
    WHEN v_pm = 'manual_admin' THEN '手動標記'
    WHEN coalesce(v_pm,'') = '' THEN '信用卡'
    ELSE v_pm END;

  INSERT INTO receipts (receipt_no, payer_name, tax_id, amount, payment_method, fee_type, order_no, issue_date, handler_name, note, status, email, public_token)
  VALUES (v_receipt_no, v_payer, NULLIF(v_tax,''), v_amount, v_pm, v_fee, p_order_no, (now() AT TIME ZONE 'Asia/Taipei')::date, '系統自動開立', v_note, 'issued', NULLIF(v_email,''), v_token);

  RETURN json_build_object('ok', true, 'already', false, 'receipt_no', v_receipt_no, 'token', v_token, 'email', v_email, 'payer_name', v_payer, 'amount', v_amount);
END; $function$;

-- 公開頁以 token 讀取單張收據
CREATE OR REPLACE FUNCTION public.get_receipt_by_token(p_token uuid)
RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT json_build_object(
    'receipt_no', receipt_no, 'payer_name', payer_name, 'tax_id', tax_id,
    'amount', amount, 'payment_method', payment_method, 'fee_type', fee_type,
    'order_no', order_no, 'issue_date', issue_date, 'handler_name', handler_name,
    'note', note, 'status', status, 'created_at', created_at
  ) FROM receipts WHERE public_token = p_token LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.issue_receipt_for_order(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_receipt_for_order(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_receipt_by_token(uuid) TO anon, authenticated, service_role;
