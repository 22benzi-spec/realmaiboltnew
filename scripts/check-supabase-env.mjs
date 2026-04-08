/**
 * 启动前检查 Supabase 环境变量；若无 .env/.env.local 则从 .env.example 生成 .env。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function parseEnvFile(filePath) {
  const out = {}
  if (!fs.existsSync(filePath)) return out
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim()
    if (!s || s.startsWith('#')) continue
    const eq = s.indexOf('=')
    if (eq <= 0) continue
    const key = s.slice(0, eq).trim()
    let val = s.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const examplePath = path.join(root, '.env.example')
const envPath = path.join(root, '.env')
const localPath = path.join(root, '.env.local')

let merged = { ...parseEnvFile(envPath), ...parseEnvFile(localPath) }

if (!merged.VITE_SUPABASE_URL && !merged.VITE_SUPABASE_ANON_KEY) {
  if (fs.existsSync(examplePath) && !fs.existsSync(envPath) && !fs.existsSync(localPath)) {
    fs.copyFileSync(examplePath, envPath)
    console.warn('\n[supabase] 已创建 .env（来自 .env.example）。请编辑填入 Supabase 的 URL 与 anon key 后重新运行 npm run dev。\n')
    process.exit(1)
  }
}

merged = { ...parseEnvFile(envPath), ...parseEnvFile(localPath) }
const url = merged.VITE_SUPABASE_URL?.trim()
const key = merged.VITE_SUPABASE_ANON_KEY?.trim()

if (!url || !key) {
  console.error(
    '\n[supabase] 缺少环境变量：VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY\n' +
      '请在项目根目录编辑 .env 或 .env.local（参考 .env.example）。\n'
  )
  process.exit(1)
}

if (url.includes('YOUR_PROJECT_REF') || url.includes('placeholder') || key === 'PASTE_ANON_KEY_FROM_DASHBOARD') {
  console.error(
    '\n[supabase] .env 中仍为占位符，请替换为 Supabase Dashboard → Settings → API 中的真实 Project URL 与 anon public key。\n'
  )
  process.exit(1)
}

try {
  const u = new URL(url)
  if (!u.hostname.endsWith('supabase.co')) {
    console.warn('[supabase] 警告：VITE_SUPABASE_URL 的域名通常应为 *.supabase.co\n')
  }
} catch {
  console.error('\n[supabase] VITE_SUPABASE_URL 不是合法 URL。\n')
  process.exit(1)
}
