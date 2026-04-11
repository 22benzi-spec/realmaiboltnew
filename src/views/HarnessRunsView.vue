<template>
  <div class="page-content">
    <div class="page-header">
      <div>
        <h1 class="page-title">Harness 运行观察</h1>
        <p class="page-subtitle">当前以应用内 run 为主，后续会逐步汇总本地 gates、CI、review 与审批结果。</p>
      </div>
      <div class="header-actions">
        <a-button @click="reloadAll" :loading="loading">刷新</a-button>
        <a-button type="primary" @click="loadSelectedRunDetail" :disabled="!selectedRunId || loadingDetail">查看明细</a-button>
      </div>
    </div>

    <a-alert
      class="page-alert"
      type="info"
      show-icon
      message="此页是观察面板，不是仓库级主执行入口；仓库级工作流请结合 AGENTS.md、本地 hooks 与 CI gates。"
    />

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :xl="14">
        <div class="panel-card">
          <div class="panel-title">仓库治理状态</div>
          <div class="governance-grid">
            <div class="governance-item">
              <span class="detail-label">Docs Gate</span>
              <a-tag :color="governanceTagColor(governance.docs?.status)">{{ governanceStatusLabel(governance.docs?.status) }}</a-tag>
              <div class="governance-meta">{{ governance.docs?.checked_at ? fmtTime(governance.docs.checked_at) : '尚未生成' }}</div>
            </div>
            <div class="governance-item">
              <span class="detail-label">Risk Scan</span>
              <a-tag :color="riskColor(governance.risk?.risk_level)">{{ riskLabel(governance.risk?.risk_level) }}</a-tag>
              <div class="governance-meta">
                {{ governance.risk ? `${governance.risk.changed_files?.length || 0} 个文件 / ${governance.risk.human_review_required ? '需人工确认' : '可自动通过'}` : '尚未生成' }}
              </div>
            </div>
            <div class="governance-item">
              <span class="detail-label">Local Reviewer</span>
              <a-tag :color="verdictColor(governance.review?.verdict)">{{ verdictLabel(governance.review?.verdict) }}</a-tag>
              <div class="governance-meta">{{ governance.review?.reviewed_at ? fmtTime(governance.review.reviewed_at) : '尚未生成' }}</div>
            </div>
          </div>

          <div v-if="governance.review" class="block-card governance-block">
            <div class="block-title">Reviewer 建议</div>
            <div class="detail-text">{{ governance.review.repair_instructions || '无' }}</div>
          </div>

          <div v-if="governance.docs?.errors?.length" class="block-card governance-block">
            <div class="block-title">Docs Gate 问题</div>
            <div class="review-list">
              <div v-for="issue in governance.docs.errors" :key="issue" class="review-item">
                <div class="detail-text">{{ issue }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-title">最近运行</div>
          <a-table
            :columns="runColumns"
            :data-source="runs"
            :pagination="{ pageSize: 8 }"
            row-key="id"
            size="small"
            :loading="loading"
            @row-click="() => undefined"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'pick'">
                <a-radio :checked="selectedRunId === record.id" @change="selectedRunId = record.id" />
              </template>
              <template v-if="column.key === 'status'">
                <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
              </template>
              <template v-if="column.key === 'risk'">
                <a-tag :color="riskColor(record.risk_level)">{{ riskLabel(record.risk_level) }}</a-tag>
              </template>
              <template v-if="column.key === 'verdict'">
                <a-tag :color="verdictColor(record.review_verdict)">{{ verdictLabel(record.review_verdict) }}</a-tag>
              </template>
              <template v-if="column.key === 'created_at'">
                {{ fmtTime(record.created_at) }}
              </template>
            </template>
          </a-table>
        </div>

        <div class="panel-card">
          <div class="panel-title">Case 列表</div>
          <a-table :columns="caseColumns" :data-source="cases" row-key="id" size="small" :pagination="{ pageSize: 5 }">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'mode'">
                <a-tag>{{ record.mode }}</a-tag>
              </template>
              <template v-if="column.key === 'action'">
                <a-button type="link" size="small" @click="runCase(record.id)">运行 Case</a-button>
              </template>
            </template>
          </a-table>
        </div>

        <div class="panel-card">
          <div class="panel-title">Case Runs</div>
          <a-table :columns="caseRunColumns" :data-source="caseRuns" row-key="id" size="small" :pagination="{ pageSize: 5 }">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'passed'">
                <a-tag :color="record.passed ? 'green' : 'red'">{{ record.passed ? '通过' : '未通过' }}</a-tag>
              </template>
              <template v-if="column.key === 'created_at'">
                {{ fmtTime(record.created_at) }}
              </template>
            </template>
          </a-table>
        </div>
      </a-col>

      <a-col :xs="24" :xl="10">
        <div class="panel-card">
          <div class="panel-title">运行明细</div>
          <a-empty v-if="!runDetail.run && !loadingDetail" description="选择一个 run 查看详细步骤" />
          <template v-else>
            <a-spin :spinning="loadingDetail">
              <template v-if="runDetail.run">
                <div class="detail-grid">
                  <div class="detail-item">
                    <span class="detail-label">Run ID</span>
                    <span class="detail-value mono">{{ runDetail.run.id }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">工具</span>
                    <span class="detail-value mono">{{ runDetail.run.selected_tool_id || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">状态</span>
                    <a-tag :color="statusColor(runDetail.run.status)">{{ statusLabel(runDetail.run.status) }}</a-tag>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">风险</span>
                    <a-tag :color="riskColor(runDetail.run.risk_level)">{{ riskLabel(runDetail.run.risk_level) }}</a-tag>
                  </div>
                </div>

                <div class="block-card">
                  <div class="block-title">任务摘要</div>
                  <div class="detail-text">{{ runDetail.run.task_text }}</div>
                </div>

                <div class="block-card">
                  <div class="block-title">步骤时间线</div>
                  <a-timeline>
                    <a-timeline-item v-for="step in runDetail.steps" :key="step.id" :color="step.status === 'failed' ? 'red' : 'blue'">
                      <div class="timeline-title">{{ step.step_index }}. {{ step.title }}</div>
                      <div class="timeline-meta">{{ step.step_type }} · {{ step.tool_id || 'system' }}</div>
                      <pre class="json-box small">{{ JSON.stringify(step.output_payload || {}, null, 2) }}</pre>
                    </a-timeline-item>
                  </a-timeline>
                </div>

                <div class="block-card">
                  <div class="block-title">Review 记录</div>
                  <div v-if="runDetail.reviews.length" class="review-list">
                    <div v-for="review in runDetail.reviews" :key="review.id" class="review-item">
                      <div class="review-head">
                        <strong>第 {{ review.attempt_number }} 轮</strong>
                        <a-tag :color="verdictColor(review.verdict)">{{ verdictLabel(review.verdict) }}</a-tag>
                      </div>
                      <div class="detail-text">修复建议：{{ review.repair_instructions || '无' }}</div>
                    </div>
                  </div>
                  <a-empty v-else description="暂无 review 记录" />
                </div>

                <div class="block-card">
                  <div class="block-title">最终结果</div>
                  <pre class="json-box">{{ JSON.stringify(runDetail.run.final_output || {}, null, 2) }}</pre>
                </div>
              </template>
            </a-spin>
          </template>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  executeHarness,
  getHarnessRunDetail,
  listHarnessCaseRuns,
  listHarnessCases,
  listHarnessRuns,
} from '../lib/harness'
import type { HarnessCase, HarnessCaseRun, HarnessRun, HarnessRunReviewRecord, HarnessRunStatus, HarnessRunStep, HarnessRiskLevel, ReviewVerdict } from '../types/harness'

interface GovernanceDocsStatus {
  status: 'passed' | 'failed'
  checked_files: string[]
  errors: string[]
  checked_at?: string
}

interface GovernanceRiskSummary {
  changed_files: string[]
  risk_level: HarnessRiskLevel
  human_review_required: boolean
  groups: Record<string, string[]>
  checked_at?: string
}

interface GovernanceLocalReview {
  verdict: ReviewVerdict | 'needs_revision'
  confidence: number
  risk_level: HarnessRiskLevel
  issues: Array<{ code: string; message: string; severity: string }>
  repair_instructions: string
  human_review_required: boolean
  changed_files: string[]
  reviewed_at?: string
}

const loading = ref(false)
const loadingDetail = ref(false)
const runs = ref<HarnessRun[]>([])
const cases = ref<HarnessCase[]>([])
const caseRuns = ref<HarnessCaseRun[]>([])
const selectedRunId = ref('')
const governance = ref<{
  docs: GovernanceDocsStatus | null
  risk: GovernanceRiskSummary | null
  review: GovernanceLocalReview | null
}>({
  docs: null,
  risk: null,
  review: null,
})
const runDetail = ref<{
  run: HarnessRun | null
  steps: HarnessRunStep[]
  reviews: HarnessRunReviewRecord[]
}>({
  run: null,
  steps: [],
  reviews: [],
})

const runColumns = [
  { title: '', key: 'pick', width: 48 },
  { title: '任务', dataIndex: 'task_text', key: 'task_text', ellipsis: true },
  { title: '状态', key: 'status', width: 110 },
  { title: '风险', key: 'risk', width: 100 },
  { title: '结论', key: 'verdict', width: 110 },
  { title: '时间', key: 'created_at', width: 140 },
]

const caseColumns = [
  { title: 'Case Key', dataIndex: 'case_key', key: 'case_key', width: 170 },
  { title: '标题', dataIndex: 'title', key: 'title' },
  { title: '模式', key: 'mode', width: 90 },
  { title: '操作', key: 'action', width: 90 },
]

const caseRunColumns = [
  { title: 'Case ID', dataIndex: 'case_id', key: 'case_id', width: 160 },
  { title: 'Run ID', dataIndex: 'run_id', key: 'run_id', width: 160 },
  { title: '结果', key: 'passed', width: 90 },
  { title: '时间', key: 'created_at', width: 140 },
]

async function reloadAll() {
  try {
    loading.value = true
    const [runList, caseList, caseRunList, docsStatus, riskSummary, localReview] = await Promise.all([
      listHarnessRuns(30),
      listHarnessCases(),
      listHarnessCaseRuns(30),
      fetchGovernanceJson<GovernanceDocsStatus>('docs-status.json'),
      fetchGovernanceJson<GovernanceRiskSummary>('risk-summary.json'),
      fetchGovernanceJson<GovernanceLocalReview>('local-review.json'),
    ])
    runs.value = runList
    cases.value = caseList
    caseRuns.value = caseRunList
    governance.value = {
      docs: docsStatus,
      risk: riskSummary,
      review: localReview,
    }
    if (!selectedRunId.value && runList.length) {
      selectedRunId.value = runList[0].id
      await loadSelectedRunDetail()
    }
  } catch (error: any) {
    message.error(error.message || '加载运行记录失败')
  } finally {
    loading.value = false
  }
}

async function fetchGovernanceJson<T>(filename: string): Promise<T | null> {
  try {
    const response = await fetch(`/harness-observer/${filename}`, { cache: 'no-store' })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

async function loadSelectedRunDetail() {
  if (!selectedRunId.value) return
  try {
    loadingDetail.value = true
    runDetail.value = await getHarnessRunDetail(selectedRunId.value)
  } catch (error: any) {
    message.error(error.message || '加载运行明细失败')
  } finally {
    loadingDetail.value = false
  }
}

async function runCase(caseId: string) {
  try {
    loading.value = true
    const result = await executeHarness({
      case_id: caseId,
      mode: 'case',
    })
    selectedRunId.value = result.run_id
    await reloadAll()
    await loadSelectedRunDetail()
    message.success('Case 已触发执行')
  } catch (error: any) {
    message.error(error.message || '运行 case 失败')
  } finally {
    loading.value = false
  }
}

function fmtTime(value?: string) {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}

function statusColor(status?: HarnessRunStatus) {
  if (status === 'completed') return 'green'
  if (status === 'pending_approval') return 'orange'
  if (status === 'blocked' || status === 'failed') return 'red'
  if (status === 'needs_revision') return 'gold'
  return 'blue'
}

function statusLabel(status?: HarnessRunStatus) {
  if (status === 'completed') return '已完成'
  if (status === 'pending_approval') return '待审批'
  if (status === 'blocked') return '已阻止'
  if (status === 'failed') return '失败'
  if (status === 'needs_revision') return '需修正'
  if (status === 'running') return '执行中'
  return '排队中'
}

function riskColor(level?: HarnessRiskLevel) {
  if (level === 'high') return 'red'
  if (level === 'medium') return 'orange'
  return 'blue'
}

function riskLabel(level?: HarnessRiskLevel) {
  if (level === 'high') return '高风险'
  if (level === 'medium') return '中风险'
  return '低风险'
}

function verdictColor(verdict?: ReviewVerdict | '') {
  if (verdict === 'approved') return 'green'
  if (verdict === 'blocked') return 'red'
  return 'gold'
}

function verdictLabel(verdict?: ReviewVerdict | '') {
  if (verdict === 'approved') return '通过'
  if (verdict === 'blocked') return '阻止'
  return '需修正'
}

function governanceStatusLabel(status?: 'passed' | 'failed') {
  if (status === 'passed') return '通过'
  if (status === 'failed') return '失败'
  return '未生成'
}

function governanceTagColor(status?: 'passed' | 'failed') {
  if (status === 'passed') return 'green'
  if (status === 'failed') return 'red'
  return 'default'
}

onMounted(reloadAll)
</script>

<style scoped>
.page-content {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.page-alert {
  margin-bottom: 16px;
}

.panel-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 14px;
}

.governance-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.governance-item {
  padding: 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.governance-meta {
  font-size: 11px;
  color: #6b7280;
  margin-top: 6px;
  line-height: 1.6;
}

.governance-block {
  margin-top: 12px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.detail-item {
  padding: 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.detail-label {
  display: block;
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 6px;
}

.detail-value {
  color: #1a1a2e;
  font-size: 13px;
}

.mono {
  font-family: 'Courier New', monospace;
}

.block-card {
  margin-top: 14px;
  padding: 14px;
  border-radius: 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}

.block-title {
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 10px;
}

.detail-text {
  color: #374151;
  font-size: 12px;
  line-height: 1.7;
}

.timeline-title {
  color: #1a1a2e;
  font-size: 12px;
  font-weight: 600;
}

.timeline-meta {
  color: #6b7280;
  font-size: 11px;
  margin: 3px 0 6px;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.review-item {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
}

.review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.json-box {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: #111827;
  color: #e5e7eb;
  font-size: 12px;
  overflow: auto;
}

.json-box.small {
  margin-top: 6px;
  max-height: 160px;
}

@media (max-width: 767px) {
  .page-header {
    flex-direction: column;
  }

  .governance-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
