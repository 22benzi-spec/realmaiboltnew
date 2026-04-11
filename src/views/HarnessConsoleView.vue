<template>
  <div class="page-content">
    <div class="page-header">
      <div>
        <h1 class="page-title">Harness 调试台</h1>
        <p class="page-subtitle">用于应用内受控执行的联调与演练，不是仓库级 AI 编码工作流的主入口。</p>
      </div>
      <div class="header-tags">
        <a-tag color="blue">Context Engineering</a-tag>
        <a-tag color="purple">Observer Review</a-tag>
        <a-tag color="gold">Risk Guard</a-tag>
      </div>
    </div>

    <a-alert
      class="page-alert"
      type="warning"
      show-icon
      message="仓库级驾驭工程请优先遵循 AGENTS.md、本地 gates 与 CI；此页面仅用于调试现有应用内 Harness。"
    />

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :xl="11">
        <div class="panel-card">
          <div class="panel-title">调试输入</div>
          <a-form layout="vertical">
            <a-form-item label="执行模式">
              <a-radio-group v-model:value="mode" button-style="solid">
                <a-radio-button value="agent">Agent 模式</a-radio-button>
                <a-radio-button value="tool">Direct Tool</a-radio-button>
              </a-radio-group>
              <div class="field-hint">
                `Agent 模式` 会根据你的需求描述自动选工具；`Direct Tool` 才会强制使用当前选中的工具。
              </div>
            </a-form-item>

            <a-form-item label="需求描述">
              <a-textarea
                v-model:value="taskText"
                :rows="5"
                placeholder="例如：给某个子订单设置 PayPal 退款方式，并记录为什么这么做。"
              />
            </a-form-item>

            <a-form-item label="受控工具">
              <a-select v-model:value="selectedToolId" show-search option-filter-prop="label" @change="handleToolChange">
                <a-select-option
                  v-for="tool in harnessToolCatalog"
                  :key="tool.id"
                  :value="tool.id"
                  :label="`${tool.label} ${tool.id}`"
                >
                  <div class="tool-option">
                    <span>{{ tool.label }}</span>
                    <span class="tool-meta">{{ tool.risk_level }} / {{ tool.requires_approval ? '需审批' : '自动' }}</span>
                  </div>
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item v-if="selectedToolId === 'list_staff_tasks'" label="按名字选择业务员">
              <a-select
                v-model:value="selectedStaffId"
                show-search
                allow-clear
                option-filter-prop="label"
                :loading="staffLoading"
                placeholder="选择业务员后会自动回填 staff_id"
                @change="handleStaffChange"
              >
                <a-select-option
                  v-for="staff in staffOptions"
                  :key="staff.id"
                  :value="staff.id"
                  :label="`${staff.name} ${staff.role || ''}`"
                >
                  <div class="tool-option">
                    <span>{{ staff.name }}</span>
                    <span class="tool-meta">{{ staff.role || '业务员' }} / {{ staff.status || '未知' }}</span>
                  </div>
                </a-select-option>
              </a-select>
              <div v-if="selectedStaffId" class="field-hint mono">staff_id: {{ selectedStaffId }}</div>
            </a-form-item>

            <a-form-item label="结构化输入 JSON">
              <a-textarea
                v-model:value="toolInputText"
                :rows="10"
                spellcheck="false"
                placeholder='{"sub_order_id":"","buyer_id":""}'
              />
            </a-form-item>

            <div class="form-actions">
              <a-button @click="previewGuard" :disabled="!selectedToolId">预览 Guard</a-button>
              <a-button type="primary" :loading="submitting" @click="submitRun">调试执行</a-button>
            </div>
          </a-form>
        </div>

        <div class="panel-card">
          <div class="panel-title">受控工具目录</div>
          <div class="tool-grid">
            <div v-for="tool in harnessToolCatalog" :key="tool.id" class="tool-item" @click="pickTool(tool.id)">
              <div class="tool-item-head">
                <strong>{{ tool.label }}</strong>
                <span :class="['risk-pill', `risk-${tool.risk_level}`]">{{ riskLabelMap[tool.risk_level] }}</span>
              </div>
              <div class="tool-desc">{{ tool.description_zh }}</div>
              <div class="tool-foot">{{ tool.id }} · {{ tool.requires_approval ? '需人工审批' : '可自动通过' }}</div>
            </div>
          </div>
        </div>
      </a-col>

      <a-col :xs="24" :xl="13">
        <div class="panel-card">
          <div class="panel-title">当前运行</div>
          <a-empty v-if="!runResult" description="尚未发起执行" />
          <template v-else>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">Run ID</span>
                <span class="summary-value mono">{{ runResult.run_id }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">状态</span>
                <a-tag :color="statusColor(runResult.status)">{{ statusLabel(runResult.status) }}</a-tag>
              </div>
              <div class="summary-item">
                <span class="summary-label">工具</span>
                <span class="summary-value mono">{{ runResult.selected_tool_id || '未选择' }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">风险</span>
                <a-tag :color="riskColor(runResult.review?.risk_level)">{{ riskLabel(runResult.review?.risk_level) }}</a-tag>
              </div>
            </div>

            <a-alert
              class="run-alert"
              :type="runResult.review?.human_review_required ? 'warning' : runResult.status === 'completed' ? 'success' : 'info'"
              show-icon
              :message="runAlertMessage"
            />

            <div class="observer-card">
              <div class="observer-title">Observer 审查</div>
              <div class="observer-row">
                <span>结论</span>
                <a-tag :color="verdictColor(runResult.review?.verdict)">{{ verdictLabel(runResult.review?.verdict) }}</a-tag>
              </div>
              <div class="observer-row">
                <span>置信度</span>
                <span>{{ formatConfidence(runResult.review?.confidence) }}</span>
              </div>
              <div class="observer-row observer-column">
                <span>修复建议</span>
                <div class="observer-text">{{ runResult.review?.repair_instructions || '无' }}</div>
              </div>
              <div class="observer-row observer-column">
                <span>问题列表</span>
                <div v-if="runResult.review?.issues?.length" class="issue-list">
                  <div v-for="issue in runResult.review.issues" :key="issue.code" class="issue-item">
                    <span class="issue-code">{{ issue.code }}</span>
                    <span>{{ issue.message }}</span>
                  </div>
                </div>
                <span v-else class="observer-text">未发现额外问题</span>
              </div>
            </div>

            <div class="result-card">
              <div class="panel-subtitle">最终结果</div>
              <pre class="json-box">{{ formattedResult }}</pre>
            </div>
          </template>
        </div>

        <div class="panel-card">
          <div class="panel-title">Guard 预览</div>
          <a-empty v-if="!guardPreview" description="选择工具后可预览风险和审批结果" />
          <template v-else>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">允许执行</span>
                <a-tag :color="guardPreview.allowed ? 'green' : 'red'">{{ guardPreview.allowed ? '允许' : '阻止' }}</a-tag>
              </div>
              <div class="summary-item">
                <span class="summary-label">风险等级</span>
                <a-tag :color="riskColor(guardPreview.risk_level)">{{ riskLabel(guardPreview.risk_level) }}</a-tag>
              </div>
              <div class="summary-item">
                <span class="summary-label">审批</span>
                <a-tag :color="guardPreview.requires_approval ? 'orange' : 'blue'">{{ guardPreview.requires_approval ? '需要人工确认' : '自动判定' }}</a-tag>
              </div>
            </div>
            <div class="observer-row observer-column" style="margin-top: 12px">
              <span>原因</span>
              <div class="issue-list">
                <div v-for="reason in guardPreview.reasons || []" :key="reason" class="issue-item">
                  <span>{{ reason }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  executeHarness,
  getToolTemplate,
  guardCheck,
  harnessToolCatalog,
  listHarnessStaffOptions,
} from '../lib/harness'
import { useCurrentUser } from '../composables/useCurrentUser'
import type { HarnessReview, HarnessRiskLevel, HarnessRunStatus, ReviewVerdict } from '../types/harness'
import type { HarnessStaffOption } from '../lib/harness'

const { currentUser } = useCurrentUser()

const mode = ref<'agent' | 'tool'>('tool')
const taskText = ref('请使用受控工具完成任务，并给出结构化审查结果。')
const selectedToolId = ref('list_staff_tasks')
const toolInputText = ref(JSON.stringify(getToolTemplate('list_staff_tasks'), null, 2))
const submitting = ref(false)
const guardPreview = ref<any>(null)
const staffLoading = ref(false)
const staffOptions = ref<HarnessStaffOption[]>([])
const selectedStaffId = ref('')
const runResult = ref<{
  run_id: string
  status: HarnessRunStatus
  selected_tool_id: string
  review: HarnessReview
  final_output: Record<string, unknown>
} | null>(null)

const riskLabelMap: Record<HarnessRiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
}

const formattedResult = computed(() => JSON.stringify(runResult.value?.final_output || {}, null, 2))

const runAlertMessage = computed(() => {
  if (!runResult.value) return ''
  if (runResult.value.review?.human_review_required) return '当前结果已生成，但被标记为需人工审批。'
  if (runResult.value.status === 'completed') return '执行与审查已完成，可进入回放或继续沉淀为 case。'
  return '运行已结束，请根据 Observer 审查决定是否重试。'
})

function pickTool(toolId: string) {
  selectedToolId.value = toolId
  toolInputText.value = JSON.stringify(getToolTemplate(toolId), null, 2)
  selectedStaffId.value = readToolInputField('staff_id')
  if (toolId === 'list_staff_tasks') {
    void ensureStaffOptions()
  }
}

function handleToolChange(toolId: string) {
  pickTool(toolId)
}

function parseToolInput() {
  try {
    return JSON.parse(toolInputText.value || '{}')
  } catch {
    throw new Error('结构化输入 JSON 解析失败，请检查格式')
  }
}

function parseToolInputSafe() {
  try {
    return JSON.parse(toolInputText.value || '{}') as Record<string, unknown>
  } catch {
    return {}
  }
}

function readToolInputField(field: string) {
  const parsed = parseToolInputSafe()
  return typeof parsed[field] === 'string' ? parsed[field] : ''
}

function updateToolInput(patch: Record<string, unknown>) {
  const merged = {
    ...parseToolInputSafe(),
    ...patch,
  }
  toolInputText.value = JSON.stringify(merged, null, 2)
}

async function ensureStaffOptions() {
  if (staffOptions.value.length > 0 || staffLoading.value) return
  try {
    staffLoading.value = true
    staffOptions.value = await listHarnessStaffOptions()
  } catch (error: any) {
    message.error(error.message || '加载业务员列表失败')
  } finally {
    staffLoading.value = false
  }
}

function handleStaffChange(value: string) {
  selectedStaffId.value = value || ''
  updateToolInput({
    staff_id: value || '',
  })
}

async function previewGuard() {
  if (!selectedToolId.value) return
  try {
    guardPreview.value = await guardCheck(selectedToolId.value, {
      id: currentUser.value.id,
      name: currentUser.value.name,
      role: currentUser.value.role,
    })
  } catch (error: any) {
    message.error(error.message || 'Guard 预览失败')
  }
}

async function submitRun() {
  try {
    submitting.value = true
    const toolInput = parseToolInput()
    runResult.value = await executeHarness({
      task_text: taskText.value,
      mode: mode.value,
      selected_tool_id: mode.value === 'tool' ? selectedToolId.value : undefined,
      tool_input: toolInput,
      requested_by: {
        id: currentUser.value.id,
        name: currentUser.value.name,
        role: currentUser.value.role,
      },
    })
    message.success('Harness 执行完成')
  } catch (error: any) {
    message.error(error.message || 'Harness 执行失败')
  } finally {
    submitting.value = false
  }
}

function riskColor(level?: HarnessRiskLevel) {
  if (level === 'high') return 'red'
  if (level === 'medium') return 'orange'
  return 'blue'
}

function riskLabel(level?: HarnessRiskLevel) {
  if (!level) return '未知'
  return riskLabelMap[level]
}

function verdictLabel(verdict?: ReviewVerdict) {
  if (verdict === 'approved') return '通过'
  if (verdict === 'blocked') return '阻止执行'
  return '需要修正'
}

function verdictColor(verdict?: ReviewVerdict) {
  if (verdict === 'approved') return 'green'
  if (verdict === 'blocked') return 'red'
  return 'gold'
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
  if (status === 'pending_approval') return '待人工审批'
  if (status === 'blocked') return '已阻止'
  if (status === 'failed') return '执行失败'
  if (status === 'needs_revision') return '需要修正'
  if (status === 'running') return '执行中'
  return '排队中'
}

function formatConfidence(value?: number) {
  if (typeof value !== 'number') return '—'
  return `${Math.round(value * 100)}%`
}

onMounted(() => {
  if (selectedToolId.value === 'list_staff_tasks') {
    selectedStaffId.value = readToolInputField('staff_id')
    void ensureStaffOptions()
  }
})
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

.header-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.page-alert {
  margin-bottom: 16px;
}

.field-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.panel-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 14px;
}

.panel-subtitle {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}

.tool-item {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: #f9fafb;
}

.tool-item:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.tool-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tool-desc {
  font-size: 12px;
  color: #374151;
  margin-top: 8px;
}

.tool-foot,
.tool-meta {
  font-size: 11px;
  color: #6b7280;
}

.tool-foot {
  margin-top: 10px;
}

.tool-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-item {
  padding: 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.summary-label {
  display: block;
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 6px;
}

.summary-value {
  color: #1a1a2e;
  font-size: 13px;
}

.mono {
  font-family: 'Courier New', monospace;
}

.run-alert {
  margin-top: 14px;
}

.observer-card,
.result-card {
  margin-top: 14px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.observer-title {
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 10px;
}

.observer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #374151;
  margin-bottom: 10px;
}

.observer-column {
  align-items: flex-start;
  flex-direction: column;
}

.observer-text {
  color: #6b7280;
  line-height: 1.6;
}

.issue-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.issue-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
}

.issue-code {
  font-family: 'Courier New', monospace;
  color: #2563eb;
  flex-shrink: 0;
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

.risk-pill {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.risk-low {
  background: #eff6ff;
  color: #2563eb;
}

.risk-medium {
  background: #fff7ed;
  color: #d97706;
}

.risk-high {
  background: #fef2f2;
  color: #dc2626;
}

@media (max-width: 767px) {
  .page-header {
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
