import { getChangedFiles, summarizeRisk, writeArtifactJson } from './lib/agent-governance.mjs'

const files = getChangedFiles()
const summary = summarizeRisk(files)
const issues = []

if (files.length === 0) {
  issues.push({
    code: 'no_changes_detected',
    message: '当前没有检测到暂存或工作区改动，无法形成有效审查。',
    severity: 'medium',
  })
}

if (summary.groups.high.length > 0) {
  issues.push({
    code: 'high_risk_changes',
    message: `检测到高风险改动：${summary.groups.high.join(', ')}`,
    severity: 'high',
  })
}

if (summary.groups.medium.length > 0) {
  issues.push({
    code: 'medium_risk_changes',
    message: `检测到中风险改动：${summary.groups.medium.join(', ')}`,
    severity: 'medium',
  })
}

const verdict =
  files.length === 0 ? 'needs_revision' : summary.humanReviewRequired ? 'needs_revision' : 'approved'

const review = {
  verdict,
  confidence: summary.humanReviewRequired ? 0.72 : 0.84,
  risk_level: summary.riskLevel,
  issues,
  repair_instructions: summary.humanReviewRequired
    ? '请补充人工确认，并重点检查高风险目录中的改动边界与验证结果。'
    : '继续核对需求满足度与验证结果，即可交付。',
  human_review_required: summary.humanReviewRequired,
  changed_files: files,
  reviewed_at: new Date().toISOString(),
}

writeArtifactJson('local-review.json', review)
console.log(JSON.stringify(review, null, 2))
