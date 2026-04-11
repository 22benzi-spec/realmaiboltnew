import { getChangedFiles, summarizeRisk, writeArtifactJson } from './lib/agent-governance.mjs'

const files = getChangedFiles()
const summary = summarizeRisk(files)

const payload = {
  changed_files: files,
  risk_level: summary.riskLevel,
  human_review_required: summary.humanReviewRequired,
  groups: summary.groups,
  checked_at: new Date().toISOString(),
}

writeArtifactJson('risk-summary.json', payload)

console.log(JSON.stringify(payload, null, 2))
