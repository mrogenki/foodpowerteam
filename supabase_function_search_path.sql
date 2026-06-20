-- =========================================================
-- 修正 function_search_path_mutable 安全警告
-- =========================================================
-- 為既有 function 釘住 search_path（僅設定組態，不更動函式邏輯），
-- 避免 search_path 可被呼叫端竄改的潛在風險。
-- 註：本專案後續新增的 RPC（如點數機制）皆已在定義時加上
--     SET search_path = public，不在此清單內。

ALTER FUNCTION public.get_renewal_payment_info(renewal_id uuid) SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.update_payment_order_no(reg_id uuid, new_order_no text) SET search_path = public;
