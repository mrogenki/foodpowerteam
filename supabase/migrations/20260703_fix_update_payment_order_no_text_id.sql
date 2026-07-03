-- 修正付款頁「系統錯誤，無法建立訂單編號」（已透過 MCP 套用，留底）
-- 原因：update_payment_order_no 參數為 uuid，但 member_applications.id 與 registrations.id
--   皆為 text（僅 member_renewals.id 為 uuid）。RPC 內 `member_applications.id(text) = reg_id(uuid)`
--   會拋「operator does not exist: text = uuid」，導致入會/續費/活動再繳費三頁皆無法建立訂單編號。
-- 修法：參數改 text 並正確 cast；並補上 registrations（活動再繳費 REPAY_ 需更新該表訂單號）。
DROP FUNCTION IF EXISTS public.update_payment_order_no(uuid, text);

CREATE OR REPLACE FUNCTION public.update_payment_order_no(reg_id text, new_order_no text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE member_applications SET merchant_order_no = new_order_no WHERE id = reg_id;
  UPDATE registrations       SET merchant_order_no = new_order_no WHERE id = reg_id;
  UPDATE member_renewals     SET merchant_order_no = new_order_no WHERE id::text = reg_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_payment_order_no(text, text) TO anon, authenticated, service_role;
