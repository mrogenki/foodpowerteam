// 公開會員名冊資料源：只回「非敏感」商務欄位（無手機/信箱/身分證/生日）。
// 前端公開頁改呼叫本函式，取代直接讀 members 全表。
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1"

declare const Deno: { env: { get(key: string): string | undefined } }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 白名單欄位：只暴露公開名冊需要的商務資訊
const SAFE_COLUMNS =
  'id,member_no,name,brand_name,company,company_title,job_title,industry_category,main_service,intro,website'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, serviceKey)

    const { data, error } = await admin
      .from('members')
      .select(SAFE_COLUMNS)
      .order('member_no', { ascending: true })

    if (error) throw error

    return new Response(JSON.stringify(data ?? []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
