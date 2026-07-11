#!/usr/bin/env bash
# 把舊專案（孟買）的 edge function secrets 複製到新專案（東京）。
# 原理：舊專案的 migration-env-dump 函數（service role 驗證）吐出現值 →
#       直接餵給 `supabase secrets set`。值只存在管線與暫存檔，用後即刪。
# 需求：.env.migration 填 OLD_SERVICE_ROLE_KEY；已 `npx supabase login`。
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; source .env.migration; set +a  # export，讓 supabase CLI 讀到 SUPABASE_ACCESS_TOKEN

OLD_REF=kpltydyspvzozgxfiwra
NEW_REF=igowitmbnlvzznqgfpfl

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

curl -sf "https://${OLD_REF}.supabase.co/functions/v1/migration-env-dump" \
  -H "Authorization: Bearer $OLD_SERVICE_ROLE_KEY" \
  | python3 -c 'import json,sys
d = json.load(sys.stdin)
for k, v in d.items():
    print(f"{k}={v}")
print(f"共 {len(d)} 個 secrets", file=sys.stderr)' > "$TMP"

npx supabase secrets set --project-ref "$NEW_REF" --env-file "$TMP"

echo "✅ secrets 已複製到 $NEW_REF。請提醒 Claude 刪除舊專案的 migration-env-dump 函數。"
