import { exists, extractBacktickPaths, readText, requiredDocs, writeArtifactJson } from './lib/agent-governance.mjs'

const errors = []

for (const doc of requiredDocs) {
  if (!exists(doc)) {
    errors.push(`缺少必需文档: ${doc}`)
  }
}

const agentsText = exists('AGENTS.md') ? readText('AGENTS.md') : ''
const readmeText = exists('README.md') ? readText('README.md') : ''
const referencedPaths = [...new Set([...extractBacktickPaths(agentsText), ...extractBacktickPaths(readmeText)])]

for (const ref of referencedPaths) {
  if (ref.startsWith('http')) continue
  if (!exists(ref)) {
    errors.push(`文档引用不存在: ${ref}`)
  }
}

if (!agentsText.includes('verify:agent')) {
  errors.push('AGENTS.md 未包含 verify:agent 入口')
}

if (!readmeText.includes('AGENTS.md')) {
  errors.push('README.md 未指向 AGENTS.md')
}

if (errors.length > 0) {
  writeArtifactJson('docs-status.json', {
    status: 'failed',
    checked_files: requiredDocs,
    errors,
    checked_at: new Date().toISOString(),
  })
  console.error('[verify:docs] 失败')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

writeArtifactJson('docs-status.json', {
  status: 'passed',
  checked_files: requiredDocs,
  errors: [],
  checked_at: new Date().toISOString(),
})

console.log('[verify:docs] 通过')
