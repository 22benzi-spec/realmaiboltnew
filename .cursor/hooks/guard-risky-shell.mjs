import fs from 'node:fs'

const raw = fs.readFileSync(0, 'utf8')
const payload = raw ? JSON.parse(raw) : {}
const command = String(payload.command || '')

const riskyPatterns = [
  /git\s+reset\s+--hard/i,
  /git\s+checkout\s+--/i,
  /git\s+push\s+--force/i,
  /rm\s+-rf/i,
  /Remove-Item\s+.*-Recurse.*-Force/i,
]

const matched = riskyPatterns.some((pattern) => pattern.test(command))

if (matched) {
  process.stdout.write(JSON.stringify({
    permission: 'ask',
    user_message: '该命令可能造成不可逆更改，请确认它确实符合仓库级风险策略。',
    agent_message: '高风险 shell 命令已被项目 hook 拦截，请先核对 AGENTS.md 与 risk-policy.md。',
  }))
  process.exit(0)
}

process.stdout.write(JSON.stringify({ permission: 'allow' }))
