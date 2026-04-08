import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '缺少 Supabase 环境变量：请在项目根目录创建 .env 或 .env.local，设置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY（参见 .env.example）。'
  )
}

if (
  supabaseUrl.includes('YOUR_PROJECT_REF') ||
  supabaseUrl.includes('your_project_ref') ||
  supabaseUrl.includes('placeholder') ||
  supabaseAnonKey === 'PASTE_ANON_KEY_FROM_DASHBOARD'
) {
  throw new Error(
    'Supabase 配置仍为占位符：请编辑项目根目录 .env，把 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 替换成真实值后重启 dev 服务。'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
