#!/usr/bin/env bash
# 資料庫搬遷：孟買（kplty…）→ 東京（igow…）
# 需求：brew libpq（pg_dump/psql 18+）、專案根目錄 .env.migration（見 env.migration.example）
# 用法：bash scripts/migrate/01-db-dump-restore.sh
# 可重複執行（restore 前會清掉新庫 public schema 內容重建）。
set -euo pipefail
cd "$(dirname "$0")/../.."
source .env.migration

export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
OLD_REF=kpltydyspvzozgxfiwra   # foodpowerteam（孟買 ap-south-1）
NEW_REF=igowitmbnlvzznqgfpfl   # foodpowerteam-tokyo（東京 ap-northeast-1）
OUT=scripts/migrate/out
mkdir -p "$OUT"

# 依序嘗試直連與 pooler（家用網路常無 IPv6，直連可能失敗）
resolve_conn() { # $1=ref $2=region $3=password → 全域變數 H P U
  local ref=$1 region=$2 pw=$3
  for cand in "db.${ref}.supabase.co|5432|postgres" \
              "aws-1-${region}.pooler.supabase.com|5432|postgres.${ref}" \
              "aws-0-${region}.pooler.supabase.com|5432|postgres.${ref}"; do
    IFS='|' read -r h p u <<<"$cand"
    if PGPASSWORD="$pw" PGCONNECT_TIMEOUT=8 psql -h "$h" -p "$p" -U "$u" -d postgres -Atc "select 1" >/dev/null 2>&1; then
      H=$h; P=$p; U=$u; return 0
    fi
  done
  echo "無法連線 $ref（三種端點都失敗），請確認密碼與網路" >&2; exit 1
}

echo "▶ 解析舊庫連線…";  resolve_conn "$OLD_REF" ap-south-1     "$OLD_DB_PASSWORD"; OH=$H; OP=$P; OU=$U
echo "  舊庫：$OH ($OU)"
echo "▶ 解析新庫連線…";  resolve_conn "$NEW_REF" ap-northeast-1 "$NEW_DB_PASSWORD"; NH=$H; NP=$P; NU=$U
echo "  新庫：$NH ($NU)"

echo "▶ 1/5 dump 舊庫 public schema（結構）…"
PGPASSWORD="$OLD_DB_PASSWORD" pg_dump -h "$OH" -p "$OP" -U "$OU" -d postgres \
  --schema=public --schema-only --no-owner --quote-all-identifiers \
  -f "$OUT/schema.sql"

echo "▶ 2/5 dump auth 使用者（含密碼雜湊）…"
PGPASSWORD="$OLD_DB_PASSWORD" pg_dump -h "$OH" -p "$OP" -U "$OU" -d postgres \
  --data-only --table='auth.users' --table='auth.identities' \
  -f "$OUT/auth-data.sql"

echo "▶ 3/5 dump 舊庫 public 資料…"
PGPASSWORD="$OLD_DB_PASSWORD" pg_dump -h "$OH" -p "$OP" -U "$OU" -d postgres \
  --schema=public --data-only --quote-all-identifiers \
  -f "$OUT/data.sql"

echo "▶ 4/5 重建新庫 public schema…"
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NH" -p "$NP" -U "$NU" -d postgres -v ON_ERROR_STOP=1 <<'SQL'
drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
SQL
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NH" -p "$NP" -U "$NU" -d postgres \
  -v ON_ERROR_STOP=1 -q -f "$OUT/schema.sql"

echo "▶ 5/5 灌資料（auth → public）…"
# auth.users 若已有同 id（重跑）先清掉本批以外不動；這裡採簡單策略：僅在空表時灌入
AUTH_COUNT=$(PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NH" -p "$NP" -U "$NU" -d postgres -Atc "select count(*) from auth.users")
if [ "$AUTH_COUNT" = "0" ]; then
  PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NH" -p "$NP" -U "$NU" -d postgres -v ON_ERROR_STOP=1 -q -f "$OUT/auth-data.sql"
else
  echo "  auth.users 非空（$AUTH_COUNT），略過 auth 匯入（重跑情境）"
fi
PGPASSWORD="$NEW_DB_PASSWORD" psql -h "$NH" -p "$NP" -U "$NU" -d postgres -v ON_ERROR_STOP=1 -q -f "$OUT/data.sql"

echo "✅ 完成。輸出檔在 $OUT/。請接著跑 scripts/migrate/03-verify-counts.sh 逐表比對筆數。"
