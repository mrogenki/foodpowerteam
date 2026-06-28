-- 通用收入連動：各繳費來源付款成功 → 新增收入到收支管理（已透過 MCP 套用，留底）
-- 涵蓋 registration（活動）/ application（入會）/ renewal（續費）/ festival（燒肉火鍋祭）
CREATE OR REPLACE FUNCTION public.add_income_for_order(p_order_no text, p_source text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE r record; v_inv text; v_payer text; v_amount int; v_category text; v_desc text;
BEGIN
  IF EXISTS (SELECT 1 FROM financial_records WHERE order_no = p_order_no) THEN
    RETURN json_build_object('ok', true, 'already', true);
  END IF;

  IF p_source = 'registration' THEN
    SELECT * INTO r FROM registrations WHERE merchant_order_no = p_order_no LIMIT 1;
    IF NOT FOUND THEN RETURN json_build_object('ok', false, 'reason', 'not_found'); END IF;
    v_amount := COALESCE(r.paid_amount,0)::int;
    v_payer := COALESCE(NULLIF(r.name,''), r.member_name, '');
    IF COALESCE(NULLIF(r.company_title,''), r.company, '') <> '' THEN
      v_payer := v_payer || '（' || COALESCE(NULLIF(r.company_title,''), r.company) || '）';
    END IF;
    v_category := '活動收入';
    v_desc := '活動：' || COALESCE(r.title,'') || '（' || COALESCE(NULLIF(r.name,''), r.member_name,'') || '）';

  ELSIF p_source = 'application' THEN
    SELECT * INTO r FROM member_applications WHERE merchant_order_no = p_order_no LIMIT 1;
    IF NOT FOUND THEN RETURN json_build_object('ok', false, 'reason', 'not_found'); END IF;
    v_amount := COALESCE(r.paid_amount,0)::int;
    v_payer := COALESCE(r.name,'');
    IF COALESCE(r.company_title,'') <> '' THEN v_payer := v_payer || '（' || r.company_title || '）'; END IF;
    v_category := '入會費';
    v_desc := '入會費（' || COALESCE(r.name,'') || '）';

  ELSIF p_source = 'renewal' THEN
    SELECT mr.amount AS amount, m.name AS name, COALESCE(NULLIF(m.company_title,''), m.company) AS comp
      INTO r FROM member_renewals mr LEFT JOIN members m ON m.id = mr.member_id WHERE mr.merchant_order_no = p_order_no LIMIT 1;
    IF NOT FOUND THEN RETURN json_build_object('ok', false, 'reason', 'not_found'); END IF;
    v_amount := COALESCE(r.amount,0)::int;
    v_payer := COALESCE(r.name,'');
    IF COALESCE(r.comp,'') <> '' THEN v_payer := v_payer || '（' || r.comp || '）'; END IF;
    v_category := '會籍年費';
    v_desc := '會籍年費（' || COALESCE(r.name,'') || '）';

  ELSIF p_source = 'festival' THEN
    SELECT * INTO r FROM festival_registrations
      WHERE merchant_order_no = p_order_no OR (order_no_history IS NOT NULL AND order_no_history ILIKE '%' || p_order_no || '%') LIMIT 1;
    IF NOT FOUND THEN RETURN json_build_object('ok', false, 'reason', 'not_found'); END IF;
    v_amount := COALESCE(r.paid_amount,0)::int;
    v_payer := COALESCE(NULLIF(r.brand_name,''), r.contact_name, '');
    v_category := '燒肉/火鍋祭';
    v_desc := (CASE r.festival_type WHEN 'hotpot' THEN '火鍋祭' WHEN 'both' THEN '燒肉祭與火鍋祭' ELSE '燒肉祭' END)
              || '合作報名（' || COALESCE(NULLIF(r.brand_name,''), r.contact_name,'') || '）';

  ELSE
    RETURN json_build_object('ok', false, 'reason', 'bad_source');
  END IF;

  IF v_amount <= 0 THEN RETURN json_build_object('ok', false, 'reason', 'no_amount'); END IF;

  SELECT receipt_no INTO v_inv FROM receipts WHERE order_no = p_order_no AND status IS DISTINCT FROM 'cancelled' LIMIT 1;

  INSERT INTO financial_records (date, type, category, amount, description, party, invoice_no, order_no)
  VALUES (to_char(now() AT TIME ZONE 'Asia/Taipei','YYYY-MM-DD'), 'income', v_category, v_amount, v_desc, v_payer, v_inv, p_order_no);

  RETURN json_build_object('ok', true, 'amount', v_amount, 'category', v_category);
END; $function$;

REVOKE ALL ON FUNCTION public.add_income_for_order(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_income_for_order(text, text) TO service_role;
