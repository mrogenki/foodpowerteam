-- get_payment_info 的參數與回傳 id 皆為 uuid，但 member_applications.id 是 text，
-- 造成 WHERE ma.id(text)=application_id(uuid) 型別錯誤（入會付款頁抓資料失敗，退回直接查詢）。
-- 改為 text。（已透過 MCP 套用，留底）
DROP FUNCTION IF EXISTS public.get_payment_info(uuid);

CREATE OR REPLACE FUNCTION public.get_payment_info(application_id text)
RETURNS TABLE(id text, name text, email text, paid_amount integer, merchant_order_no text, payment_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT ma.id, ma.name, ma.email, ma.paid_amount, ma.merchant_order_no, ma.payment_status
  FROM member_applications ma
  WHERE ma.id = application_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_payment_info(text) TO anon, authenticated, service_role;
