-- =========================================================
-- 會員點數機制：資料結構 + 帳本 + RPC
-- 設計：付款成功才核銷（reserve 預扣 / commit 核銷 / refund 回補）
-- 所有點數異動一律走 SECURITY DEFINER RPC，前端不得直接改 points_balance
-- =========================================================

-- ---------------------------------------------------------
-- 1. 欄位（表已存在，一律 ADD COLUMN IF NOT EXISTS）
-- ---------------------------------------------------------

-- 會員點數餘額（唯一真實餘額；已反映「預扣」後的可用值）
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS points_balance int NOT NULL DEFAULT 0;

-- 報名單的點數抵扣資訊
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS points_used int NOT NULL DEFAULT 0;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS points_status text; -- null | 'frozen' | 'redeemed' | 'refunded'

-- ---------------------------------------------------------
-- 2. 點數帳本表（稽核用，全部異動留痕）
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id text REFERENCES public.members(id) ON DELETE CASCADE, -- members.id 為 text
  change int NOT NULL,                 -- 正=增加, 負=扣除, 0=核銷標記
  balance_after int,                   -- 異動後餘額快照
  type text NOT NULL,                  -- 'earn' | 'freeze' | 'redeem' | 'refund' | 'adjust'
  reason text,
  ref_type text,                       -- 'registration' | 'application' | 'renewal' | 'admin'
  ref_id text,
  order_no text,                       -- 對應 merchant_order_no（冪等用）
  created_by text,                     -- 手動調整時記管理員 email
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_points_ledger_member ON public.points_ledger(member_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_order ON public.points_ledger(order_no);

-- RLS：帳本只能透過 RPC（SECURITY DEFINER）寫入；已登入後台可讀
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read for authenticated" ON public.points_ledger;
CREATE POLICY "Enable read for authenticated" ON public.points_ledger FOR SELECT TO authenticated USING (true);

-- =========================================================
-- 3. RPC（全部 SECURITY DEFINER + GRANT anon/authenticated）
-- =========================================================

-- ---------------------------------------------------------
-- 3.1 points_reserve：報名時預扣（原子檢查餘額 → 扣餘額 → 凍結報名單）
-- 冪等：報名單已 frozen/redeemed 則直接回 ok（不重複扣）
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION points_reserve(
  p_member_id text,
  p_points int,
  p_order_no text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_id text;
  v_status text;
  v_balance int;
  v_new_balance int;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    RETURN json_build_object('ok', true, 'reason', 'noop');
  END IF;

  -- 找報名單
  SELECT id::text, points_status INTO v_reg_id, v_status
  FROM registrations
  WHERE merchant_order_no = p_order_no
  LIMIT 1;

  IF v_reg_id IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'registration_not_found');
  END IF;

  -- 冪等：已凍結或已核銷 → 不重複扣
  IF v_status IN ('frozen', 'redeemed') THEN
    RETURN json_build_object('ok', true, 'reason', 'already_reserved');
  END IF;

  -- 鎖定會員列並檢查餘額
  SELECT points_balance INTO v_balance
  FROM members
  WHERE id = p_member_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'member_not_found');
  END IF;

  IF v_balance < p_points THEN
    RETURN json_build_object('ok', false, 'reason', 'insufficient', 'balance', v_balance);
  END IF;

  v_new_balance := v_balance - p_points;

  UPDATE members SET points_balance = v_new_balance WHERE id = p_member_id;

  UPDATE registrations
  SET points_used = p_points, points_status = 'frozen'
  WHERE id::text = v_reg_id;

  INSERT INTO points_ledger (member_id, change, balance_after, type, reason, ref_type, ref_id, order_no)
  VALUES (p_member_id, -p_points, v_new_balance, 'freeze', '報名預扣點數', 'registration', v_reg_id, p_order_no);

  RETURN json_build_object('ok', true, 'balance', v_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION points_reserve(text, int, text) TO anon;
GRANT EXECUTE ON FUNCTION points_reserve(text, int, text) TO authenticated;

-- ---------------------------------------------------------
-- 3.2 points_commit：付款成功核銷（frozen → redeemed）
-- 餘額在 reserve 時已扣，這裡 change=0 僅作核銷標記
-- 冪等：已 redeemed 或無抵扣 → no-op
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION points_commit(
  p_order_no text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_id text;
  v_status text;
  v_member_id text;
  v_points int;
  v_balance int;
BEGIN
  SELECT id::text, points_status, member_id, points_used
    INTO v_reg_id, v_status, v_member_id, v_points
  FROM registrations
  WHERE merchant_order_no = p_order_no
  LIMIT 1;

  IF v_reg_id IS NULL THEN
    RETURN json_build_object('ok', true, 'reason', 'registration_not_found');
  END IF;

  -- 無點數抵扣或非凍結狀態 → no-op（冪等）
  IF v_status IS DISTINCT FROM 'frozen' OR COALESCE(v_points, 0) <= 0 THEN
    RETURN json_build_object('ok', true, 'reason', 'noop');
  END IF;

  UPDATE registrations SET points_status = 'redeemed' WHERE id::text = v_reg_id;

  SELECT points_balance INTO v_balance FROM members WHERE id = v_member_id;

  INSERT INTO points_ledger (member_id, change, balance_after, type, reason, ref_type, ref_id, order_no)
  VALUES (v_member_id, 0, v_balance, 'redeem', '付款成功核銷點數', 'registration', v_reg_id, p_order_no);

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION points_commit(text) TO anon;
GRANT EXECUTE ON FUNCTION points_commit(text) TO authenticated;

-- ---------------------------------------------------------
-- 3.3 points_refund：付款失敗/取消/逾時回補（frozen → refunded）
-- 餘額加回。冪等：已 redeemed（已核銷不退此路）/refunded/無抵扣 → no-op
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION points_refund(
  p_order_no text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_id text;
  v_status text;
  v_member_id text;
  v_points int;
  v_balance int;
  v_new_balance int;
BEGIN
  SELECT id::text, points_status, member_id, points_used
    INTO v_reg_id, v_status, v_member_id, v_points
  FROM registrations
  WHERE merchant_order_no = p_order_no
  LIMIT 1;

  IF v_reg_id IS NULL THEN
    RETURN json_build_object('ok', true, 'reason', 'registration_not_found');
  END IF;

  IF v_status IS DISTINCT FROM 'frozen' OR COALESCE(v_points, 0) <= 0 THEN
    RETURN json_build_object('ok', true, 'reason', 'noop');
  END IF;

  SELECT points_balance INTO v_balance FROM members WHERE id = v_member_id FOR UPDATE;
  v_new_balance := COALESCE(v_balance, 0) + v_points;

  UPDATE members SET points_balance = v_new_balance WHERE id = v_member_id;
  UPDATE registrations SET points_status = 'refunded' WHERE id::text = v_reg_id;

  INSERT INTO points_ledger (member_id, change, balance_after, type, reason, ref_type, ref_id, order_no)
  VALUES (v_member_id, v_points, v_new_balance, 'refund', '付款未完成回補點數', 'registration', v_reg_id, p_order_no);

  RETURN json_build_object('ok', true, 'balance', v_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION points_refund(text) TO anon;
GRANT EXECUTE ON FUNCTION points_refund(text) TO authenticated;

-- ---------------------------------------------------------
-- 3.4 points_adjust：後台手動加減點數（留痕，記管理員）
-- 不可使餘額 < 0
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION points_adjust(
  p_member_id text,
  p_delta int,
  p_reason text,
  p_admin text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance int;
  v_new_balance int;
BEGIN
  IF p_delta IS NULL OR p_delta = 0 THEN
    RETURN json_build_object('ok', false, 'reason', 'zero_delta');
  END IF;

  SELECT points_balance INTO v_balance FROM members WHERE id = p_member_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'member_not_found');
  END IF;

  v_new_balance := v_balance + p_delta;
  IF v_new_balance < 0 THEN
    RETURN json_build_object('ok', false, 'reason', 'negative_balance', 'balance', v_balance);
  END IF;

  UPDATE members SET points_balance = v_new_balance WHERE id = p_member_id;

  INSERT INTO points_ledger (member_id, change, balance_after, type, reason, ref_type, created_by)
  VALUES (p_member_id, p_delta, v_new_balance, 'adjust', p_reason, 'admin', p_admin);

  RETURN json_build_object('ok', true, 'balance', v_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION points_adjust(text, int, text, text) TO anon;
GRANT EXECUTE ON FUNCTION points_adjust(text, int, text, text) TO authenticated;

-- ---------------------------------------------------------
-- 3.5 points_earn：賺取點數（入會/續費/消費回饋）
-- 冪等：同 ref_type+ref_id 已有 earn 紀錄則 no-op（防重複回呼重複贈點）
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION points_earn(
  p_member_id text,
  p_points int,
  p_reason text,
  p_ref_type text,
  p_ref_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance int;
  v_new_balance int;
  v_exists boolean;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    RETURN json_build_object('ok', true, 'reason', 'noop');
  END IF;

  -- 冪等檢查
  IF p_ref_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM points_ledger
      WHERE type = 'earn' AND ref_type = p_ref_type AND ref_id = p_ref_id
    ) INTO v_exists;
    IF v_exists THEN
      RETURN json_build_object('ok', true, 'reason', 'already_earned');
    END IF;
  END IF;

  SELECT points_balance INTO v_balance FROM members WHERE id = p_member_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'member_not_found');
  END IF;

  v_new_balance := v_balance + p_points;
  UPDATE members SET points_balance = v_new_balance WHERE id = p_member_id;

  INSERT INTO points_ledger (member_id, change, balance_after, type, reason, ref_type, ref_id)
  VALUES (p_member_id, p_points, v_new_balance, 'earn', p_reason, p_ref_type, p_ref_id);

  RETURN json_build_object('ok', true, 'balance', v_new_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION points_earn(text, int, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION points_earn(text, int, text, text, text) TO authenticated;
