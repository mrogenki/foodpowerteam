import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1"

declare const Deno: { env: { get(key: string): string | undefined } }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// 與前端 App.tsx 的 SYSTEM_OWNERS 白名單一致
const SYSTEM_OWNERS = ['mr.ogenki@gmail.com']
const VALID_ROLES = ['工作人員', '管理員', '總管理員']

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  const fail = (msg: string, status = 400) => json({ ok: false, error: msg }, status)

  if (req.method !== 'POST') return fail('Method Not Allowed', 405)

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!url || !serviceKey) throw new Error('Missing Supabase env')

    // 1. 驗證呼叫者身分（必須是已登入且為總管理員）
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim()
    if (!token) return fail('未授權', 401)

    const authClient = createClient(url, anonKey ?? serviceKey)
    const { data: userData, error: userErr } = await authClient.auth.getUser(token)
    const callerEmail = userData?.user?.email?.toLowerCase()
    if (userErr || !callerEmail) return fail('未授權', 401)

    const admin = createClient(url, serviceKey)

    let isSuper = SYSTEM_OWNERS.includes(callerEmail)
    if (!isSuper) {
      const { data: me } = await admin.from('admins').select('role').ilike('email', callerEmail).maybeSingle()
      isSuper = me?.role === '總管理員'
    }
    if (!isSuper) return fail('權限不足，僅總管理員可新增帳號', 403)

    // 2. 驗證輸入
    const body = await req.json()
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const phone = String(body.phone || '')
    const role = String(body.role || '工作人員')
    if (!name) return fail('缺少姓名')
    if (!email) return fail('缺少 Email')
    if (password.length < 6) return fail('密碼至少需 6 碼')
    if (!VALID_ROLES.includes(role)) return fail('權限值不正確')

    // 3. 建立 Supabase Auth 登入帳號
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createErr || !created?.user) {
      return fail(`建立登入帳號失敗：${createErr?.message || '未知錯誤'}（Email 可能已被使用）`, 400)
    }

    // 4. 寫入 admins 權限表（id 對應 Auth user id，方便日後關聯）
    const id = created.user.id
    const { error: insErr } = await admin
      .from('admins')
      .insert([{ id, name, email, phone, role, password: '' }])
    if (insErr) {
      // 寫入失敗 → 回收剛建立的 Auth 帳號，避免殘留孤兒帳號
      await admin.auth.admin.deleteUser(id)
      return fail(`寫入權限資料失敗：${insErr.message}`, 500)
    }

    return json({ ok: true, id })
  } catch (e) {
    console.error('[create-admin] error:', e)
    return fail((e as Error).message, 500)
  }
})
