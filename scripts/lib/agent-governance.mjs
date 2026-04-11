import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export const requiredDocs = [
  'AGENTS.md',
  'docs/agent-context/task-template.md',
  'docs/agent-context/risk-policy.md',
  'docs/agent-context/architecture-constraints.md',
  'docs/agent-context/definition-of-done.md',
  'docs/agent-context/review-rubric.md',
  'docs/agent-context/business-domain.md',
  'docs/agent-context/tool-contracts.md',
]

export function repoPath(...parts) {
  return path.join(root, ...parts)
}

export function readText(relativePath) {
  return fs.readFileSync(repoPath(relativePath), 'utf8')
}

export function exists(relativePath) {
  return fs.existsSync(repoPath(relativePath))
}

export function extractBacktickPaths(text) {
  const matches = text.match(/`([^`]+)`/g) || []
  return matches
    .map((entry) => entry.slice(1, -1))
    .filter((entry) => entry.includes('/') || entry.endsWith('.md') || entry.endsWith('.json'))
}

export function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    return ''
  }
  return (result.stdout || '').trim()
}

export function getChangedFiles() {
  const staged = runGit(['diff', '--cached', '--name-only']).split(/\r?\n/).filter(Boolean)
  if (staged.length > 0) return filterMeaningfulFiles([...new Set(staged)])

  const working = runGit(['diff', '--name-only']).split(/\r?\n/).filter(Boolean)
  const untracked = runGit(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).filter(Boolean)
  return filterMeaningfulFiles([...new Set([...working, ...untracked])])
}

function filterMeaningfulFiles(files) {
  return files.filter((file) => {
    if (!file) return false
    if (file === '.env') return false
    if (file.startsWith('dist/')) return false
    if (file.endsWith('.tsbuildinfo')) return false
    if (file.startsWith('.harness/')) return false
    return true
  })
}

export function classifyRisk(filePath) {
  if (
    filePath.startsWith('supabase/migrations/') ||
    filePath === 'src/lib/supabase.ts' ||
    filePath.startsWith('src/router/') ||
    filePath.startsWith('supabase/functions/')
  ) {
    return 'high'
  }

  if (
    filePath.startsWith('scripts/') ||
    filePath.startsWith('.cursor/') ||
    filePath.startsWith('.github/workflows/') ||
    filePath === 'package.json' ||
    filePath === 'README.md' ||
    filePath === 'AGENTS.md'
  ) {
    return 'medium'
  }

  return 'low'
}

export function summarizeRisk(files) {
  const groups = {
    high: [],
    medium: [],
    low: [],
  }

  for (const file of files) {
    groups[classifyRisk(file)].push(file)
  }

  const riskLevel = groups.high.length > 0 ? 'high' : groups.medium.length > 0 ? 'medium' : 'low'
  return {
    riskLevel,
    groups,
    humanReviewRequired: groups.high.length > 0,
  }
}

export function ensureDir(relativePath) {
  fs.mkdirSync(repoPath(relativePath), { recursive: true })
}

export function writeJson(relativePath, payload) {
  ensureDir(path.dirname(relativePath))
  fs.writeFileSync(repoPath(relativePath), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

export function writeText(relativePath, content) {
  ensureDir(path.dirname(relativePath))
  fs.writeFileSync(repoPath(relativePath), content, 'utf8')
}

export function writeArtifactJson(filename, payload) {
  writeJson(path.join('.harness', 'reviews', filename), payload)
  writeJson(path.join('public', 'harness-observer', filename), payload)
}
