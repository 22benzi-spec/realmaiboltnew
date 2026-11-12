<template>
  <a-drawer
    :open="open"
    width="960"
    placement="right"
    :body-style="{ padding: '0', background: '#f5f7fa' }"
    @close="emit('close')"
  >
    <template #title>
      <div class="gbd-drawer-title">
        <span>{{ drawerTitle }}</span>
        <span v-if="headerCompanyName" class="gbd-drawer-company">{{ headerCompanyName }}</span>
      </div>
    </template>
    <div class="gbd">
      <div class="gbd-body">
        <!-- 一级：按组统计，可展开任务 -->
        <section class="gbd-section">
          <div class="gbd-section-header">
            <div class="gbd-section-title">
              组资金一览
              <span class="gbd-section-count">{{ totalOrderCount }}条</span>
            </div>
            <div v-if="writable" class="gbd-batch-actions">
              <a-select
                v-model:value="batchBillingTarget"
                size="small"
                style="width: 120px"
                placeholder="基础入账状态"
                allow-clear
              >
                <a-select-option value="已完成">已完成</a-select-option>
                <a-select-option value="未完成">未完成</a-select-option>
              </a-select>
              <a-select
                v-model:value="batchDebtTarget"
                size="small"
                style="width: 112px"
                placeholder="账款情况"
                allow-clear
              >
                <a-select-option value="none">无异常</a-select-option>
                <a-select-option value="owed">有欠款</a-select-option>
                <a-select-option value="surplus">有余款</a-select-option>
                <a-select-option value="cleared">已结清</a-select-option>
              </a-select>
              <a-button size="small" :loading="statusSaving" @click="applyBatchStatus">批量应用</a-button>
            </div>
          </div>

          <div class="gbd-group-table" :class="{ 'has-refund': showRefundColumn }">
            <div class="gbd-group-head">
              <span class="col-exp" />
              <span class="col-batch">组任务号</span>
              <span class="col-num">任务数</span>
              <span class="col-amt">实际应收</span>
              <span class="col-amt">累计实收</span>
              <span class="col-amt">累计抵消</span>
              <span v-if="showRefundColumn" class="col-amt">累计退款</span>
              <span class="col-amt">待结差额</span>
              <span class="col-customer">客户</span>
            </div>

            <div v-for="(group, gi) in groupStates" :key="group.batchNumber" class="gbd-group-block">
              <div
                class="gbd-group-row"
                :class="{ 'is-active': activeBatch === group.batchNumber, 'is-open': group.expanded }"
                @click="toggleGroup(gi)"
              >
                <span class="col-exp">{{ group.expanded ? '▼' : '▶' }}</span>
                <span class="col-batch">{{ group.batchNumber }}</span>
                <span class="col-num">{{ group.orders.length }}</span>
                <span class="col-amt">¥{{ group.fund.receivable.toFixed(2) }}</span>
                <span class="col-amt">
                  <template v-if="group.fund.mergeOperation">合并操作</template>
                  <template v-else>¥{{ group.fund.collected.toFixed(2) }}</template>
                </span>
                <span class="col-amt">
                  <template v-if="group.fund.mergeOperation">合并操作</template>
                  <template v-else>¥{{ group.fund.offset.toFixed(2) }}</template>
                </span>
                <span v-if="showRefundColumn" class="col-amt">
                  <template v-if="group.fund.mergeOperation">合并操作</template>
                  <template v-else-if="group.fund.refunded > 0.005">¥{{ group.fund.refunded.toFixed(2) }}</template>
                  <template v-else>-</template>
                </span>
                <span class="col-amt">
                  <template v-if="group.fund.mergeOperation">合并操作</template>
                  <template v-else-if="group.fund.diff > 0.005">+¥{{ group.fund.diff.toFixed(2) }}</template>
                  <template v-else-if="group.fund.diff < -0.005">-¥{{ Math.abs(group.fund.diff).toFixed(2) }}</template>
                  <template v-else>¥0.00</template>
                </span>
                <span class="col-customer">{{ group.customerName || '-' }}</span>
              </div>

              <!-- 展开：任务维度（可写）；不展示任务编号 -->
              <div v-if="group.expanded" class="gbd-task-wrap" @click.stop>
                <div class="gbd-task-head">
                  <span class="t-asin">Asin</span>
                  <span class="t-amt">实际应收</span>
                  <span class="t-status">基础入账状态</span>
                  <span class="t-debt">账款情况</span>
                  <span class="t-debt-amt">差价金额（元）</span>
                  <span class="t-debt-usd">差价金额（美元）</span>
                </div>
                <div v-for="row in group.taskRows" :key="row.id" class="gbd-task-row">
                  <span class="t-asin">{{ row.asin }}</span>
                  <span class="t-amt">¥{{ row.receivable.toFixed(2) }}</span>
                  <span class="t-status">
                    <a-select
                      v-model:value="row.billing_status"
                      size="small"
                      style="width: 86px"
                      :disabled="!writable || statusSaving"
                      @change="saveOrderField(row, 'billing_status')"
                    >
                      <a-select-option value="已完成">已完成</a-select-option>
                      <a-select-option value="未完成">未完成</a-select-option>
                    </a-select>
                  </span>
                  <span class="t-debt">
                    <a-select
                      v-model:value="row.debt_status"
                      size="small"
                      style="width: 112px"
                      :disabled="!writable || statusSaving"
                      @change="onDebtStatusChange(row)"
                    >
                      <a-select-option value="none">无异常</a-select-option>
                      <a-select-option value="owed">有欠款</a-select-option>
                      <a-select-option value="surplus">有余款</a-select-option>
                      <a-select-option value="cleared">已结清</a-select-option>
                    </a-select>
                  </span>
                  <span class="t-debt-amt">
                    <a-input-number
                      v-model:value="row.debt_amount"
                      size="small"
                      :min="0"
                      :precision="2"
                      style="width: 96px"
                      :disabled="!writable || statusSaving || row.debt_status === 'none' || row.debt_status === 'cleared'"
                      @change="saveOrderField(row, 'debt_amount')"
                    />
                  </span>
                  <span class="t-debt-usd">
                    <a-input-number
                      v-model:value="row._debt_amount_usd"
                      size="small"
                      :min="0"
                      :precision="2"
                      style="width: 96px"
                      placeholder="仅展示"
                      :disabled="!writable || statusSaving || row.debt_status === 'none' || row.debt_status === 'cleared'"
                      @change="saveOrderField(row, '_debt_amount_usd')"
                    />
                  </span>
                </div>
              </div>
            </div>

            <div class="gbd-group-foot">
              <span class="col-exp" />
              <span class="col-batch">合计</span>
              <span class="col-num">{{ tableTotals.orderCount }}</span>
              <span class="col-amt">¥{{ tableTotals.receivable.toFixed(2) }}</span>
              <span class="col-amt" :class="tableTotals.collectedSummable ? 'gbd-in' : 'gbd-muted'">
                <template v-if="tableTotals.collectedSummable">¥{{ tableTotals.collected.toFixed(2) }}</template>
                <template v-else>—</template>
              </span>
              <span class="col-amt" :class="tableTotals.offsetSummable ? 'gbd-pos' : 'gbd-muted'">
                <template v-if="tableTotals.offsetSummable">¥{{ tableTotals.offset.toFixed(2) }}</template>
                <template v-else>—</template>
              </span>
              <span v-if="showRefundColumn" class="col-amt" :class="tableTotals.refundSummable ? 'gbd-neg' : 'gbd-muted'">
                <template v-if="tableTotals.refundSummable">¥{{ tableTotals.refunded.toFixed(2) }}</template>
                <template v-else>—</template>
              </span>
              <span
                class="col-amt"
                :class="!tableTotals.diffSummable
                  ? 'gbd-muted'
                  : (tableTotals.diff < -0.005 ? 'gbd-neg' : tableTotals.diff > 0.005 ? 'gbd-pos' : 'gbd-in')"
              >
                <template v-if="!tableTotals.diffSummable">—</template>
                <template v-else-if="tableTotals.diff > 0.005">+¥{{ tableTotals.diff.toFixed(2) }}</template>
                <template v-else-if="tableTotals.diff < -0.005">-¥{{ Math.abs(tableTotals.diff).toFixed(2) }}</template>
                <template v-else>¥0.00</template>
              </span>
              <span class="col-customer" />
            </div>
          </div>

          <div class="gbd-fund-actions">
            <a-button size="small" class="gbd-btn-in" @click="openRecordModal('supplement')">录入补款</a-button>
            <a-button size="small" class="gbd-btn-offset" @click="openRecordModal('offset')">账面抵消</a-button>
            <a-button size="small" class="gbd-btn-out" @click="openRecordModal('refund')">提交退款</a-button>
          </div>
        </section>

        <!-- 交易流水：同流水号合并展示；合并操作流水备注写关联组 -->
        <section class="gbd-section">
          <div class="gbd-section-title">
            交易流水
            <span class="gbd-section-count">{{ paymentFlowCount }}条</span>
          </div>
          <div class="gbd-pay-table">
            <div class="gbd-pay-head">
              <span>流水号</span>
              <span>日期</span>
              <span>交易类型</span>
              <span>方向</span>
              <span>金额</span>
              <span>备注</span>
            </div>
            <div
              v-for="p in paymentDisplayRows"
              :key="p.id"
              class="gbd-pay-row"
              :class="{ 'is-merged': !p.showFlow }"
            >
              <span class="gbd-batch-cell">{{ p.showFlow ? p.flow_no : '' }}</span>
              <span>{{ p.payment_date }}</span>
              <span>{{ p.transaction_type }}</span>
              <span>{{ p.direction }}</span>
              <span class="gbd-pay-amt">{{ formatPaymentAmount(p) }}</span>
              <span class="gbd-muted">{{ p.notes || '-' }}</span>
            </div>
          </div>
        </section>

        <!-- 结算账单：同组任务号合并展示；编辑内容仍不带组号 -->
        <section class="gbd-section">
          <div class="gbd-section-title">结算账单</div>
          <div class="gbd-collect-panel">
            <div class="gbd-collect-preview">
              <div class="gbd-collect-head">
                <span>组任务号</span>
                <span>结算内容</span>
              </div>
              <div
                v-for="(block, bi) in settleDisplayBlocks"
                :key="bi"
                class="gbd-collect-block"
              >
                <div class="gbd-collect-batch">{{ block.batchNumber }}</div>
                <div class="gbd-collect-lines">
                  <div v-for="(line, li) in block.lines" :key="li" class="gbd-collect-line">
                    {{ line.display }}
                  </div>
                </div>
              </div>
              <div v-if="allNeedTotal > 0.005 || allRefundTotal > 0.005" class="gbd-collect-foot">
                <span v-if="allNeedTotal > 0.005">共需补款 ¥{{ allNeedTotal.toFixed(0) }}</span>
                <span v-if="allRefundTotal > 0.005">共需退款 ¥{{ allRefundTotal.toFixed(0) }}</span>
              </div>
            </div>
            <div class="gbd-collect-editor">
              <div class="gbd-edit-row">
                <span class="gbd-copy-label">编辑内容</span>
              </div>
              <a-textarea v-model:value="editableText" :rows="5" class="gbd-copy-text" />
              <div class="gbd-copy-actions">
                <a-button size="small" @click="copyText">复制</a-button>
                <a-button type="primary" @click="saveText">保存</a-button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <a-modal
      v-model:open="recordModalOpen"
      :title="recordModalTitle"
      :ok-text="recordModalOkText"
      :ok-button-props="{ danger: recordMode === 'refund' }"
      :confirm-loading="recordSaving"
      cancel-text="取消"
      width="520px"
      @ok="saveRecordModal"
    >
      <div class="gbd-record-form">
        <div class="gbd-record-summary">
          本次涉及 {{ allLocalOrders.length }} 个任务
          <template v-if="recordMode === 'refund'">（退款提交后待审批）</template>
          <template v-else-if="recordMode === 'offset'">（账面抵消用于对账）</template>
        </div>
        <div class="gbd-record-field">
          <label>金额（元）</label>
          <a-input-number
            v-model:value="recordForm.amount_cny"
            style="width:100%"
            :min="0"
            :precision="2"
            placeholder="请输入金额"
          />
        </div>
        <div class="gbd-record-field">
          <label>备注</label>
          <a-textarea v-model:value="recordForm.notes" :rows="2" placeholder="备注（可选）" />
        </div>
        <div class="gbd-record-field">
          <label>账款状态变更</label>
          <a-radio-group v-model:value="recordForm.update_debt_status" size="small">
            <a-radio-button value="cleared">已结清</a-radio-button>
          </a-radio-group>
          <div class="gbd-record-hint">
            提交后将弹出结清确认清单（按 ASIN）；取消勾选可保留原差价
          </div>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="clearConfirmOpen"
      title="确认结清"
      :confirm-loading="clearConfirmSaving"
      width="520px"
      :mask-closable="false"
      @ok="applyClearConfirm"
    >
      <template #footer>
        <a-button type="primary" :loading="clearConfirmSaving" @click="applyClearConfirm">确认</a-button>
      </template>
      <div class="gbd-clear-bool">
        <span class="gbd-clear-bool-label">是否结清</span>
        <a-radio-group v-model:value="clearConfirmDoClear" size="small">
          <a-radio-button value="yes">是</a-radio-button>
          <a-radio-button value="no">否</a-radio-button>
        </a-radio-group>
      </div>
      <div v-if="clearConfirmDoClear === 'yes'" class="gbd-clear-list">
        <div v-for="row in clearConfirmRows" :key="row.id" class="gbd-clear-row">
          <a-checkbox v-model:checked="row.include">
            <span class="gbd-clear-line">
              {{ row.created_mmdd }} {{ row.asin }} {{ row.debt_label }}
              ¥{{ row.debt_amount.toFixed(2) }}<template v-if="row.debt_amount_usd > 0.005">/${{ row.debt_amount_usd.toFixed(2) }}</template>
            </span>
          </a-checkbox>
        </div>
      </div>
      <div v-else class="gbd-clear-tip">选择「否」后点确认，不变更账款状态。</div>
    </a-modal>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

export interface GroupBillGroupInput {
  batchNumber: string
  orders: any[]
}

const props = withDefaults(defineProps<{
  open: boolean
  batchNumber?: string
  orders?: any[]
  groups?: GroupBillGroupInput[]
  /** bill=组头账单入口；batch=批量编辑入口 */
  mode?: 'bill' | 'batch'
  /** 任务行是否可写 */
  writable?: boolean
}>(), {
  mode: 'bill',
  writable: true,
})

const emit = defineEmits<{
  close: []
  updated: []
}>()

const statusSaving = ref(false)
const companyNameById = ref<Record<string, string>>({})
const batchBillingTarget = ref<string | undefined>(undefined)
const batchDebtTarget = ref<string | undefined>(undefined)
const activeBatch = ref('')
const editableText = ref('')
const savedOnce = ref(false)
/** 本地可变订单副本，支持可写 */
const localOrdersByBatch = ref<Record<string, any[]>>({})
const expandedMap = ref<Record<string, boolean>>({})

type RecordMode = 'supplement' | 'offset' | 'refund'
const recordModalOpen = ref(false)
const recordSaving = ref(false)
const recordMode = ref<RecordMode>('supplement')
const recordForm = ref({
  amount_cny: undefined as number | undefined,
  notes: '',
  update_debt_status: null as string | null,
})
const clearConfirmOpen = ref(false)
const clearConfirmSaving = ref(false)
const clearConfirmDoClear = ref<'yes' | 'no'>('yes')
type ClearConfirmRow = {
  id: string
  asin: string
  created_mmdd: string
  debt_label: string
  debt_amount: number
  debt_amount_usd: number
  include: boolean
  _is_demo?: boolean
}
const clearConfirmRows = ref<ClearConfirmRow[]>([])

const CLEAR_CONFIRM_DEMO_ROWS: ClearConfirmRow[] = [
  { id: '__clear_demo_1', asin: 'B0DEMOAAA01', created_mmdd: '1102', debt_label: '有欠款', debt_amount: 200, debt_amount_usd: 28.5, include: true, _is_demo: true },
  { id: '__clear_demo_2', asin: 'B0DEMOBBB02', created_mmdd: '1105', debt_label: '有余款', debt_amount: 85.5, debt_amount_usd: 12.2, include: true, _is_demo: true },
  { id: '__clear_demo_3', asin: 'B0DEMOCCC03', created_mmdd: '1108', debt_label: '有欠款', debt_amount: 320, debt_amount_usd: 0, include: true, _is_demo: true },
  { id: '__clear_demo_4', asin: 'B0DEMODDD04', created_mmdd: '1110', debt_label: '有余款', debt_amount: 46, debt_amount_usd: 6.5, include: false, _is_demo: true },
]

const allLocalOrders = computed(() => Object.values(localOrdersByBatch.value).flat())
const recordModalTitle = computed(() => ({
  supplement: '录入补款',
  offset: '录入账面抵消',
  refund: '提交退款',
}[recordMode.value]))
const recordModalOkText = computed(() => ({
  supplement: '录入补款',
  offset: '保存抵消',
  refund: '提交退款',
}[recordMode.value]))

function formatClearCreatedMmdd(value: any) {
  if (!value) return '--'
  const d = dayjs(value)
  return d.isValid() ? d.format('MMDD') : '--'
}

function withClearConfirmDemoRows(rows: ClearConfirmRow[]) {
  return [...rows, ...CLEAR_CONFIRM_DEMO_ROWS.map(row => ({ ...row }))]
}

function buildClearCandidateFromOrder(order: any): ClearConfirmRow | null {
  if (!order?.id) return null
  if (order.debt_status !== 'owed' && order.debt_status !== 'surplus') return null
  return {
    id: order.id,
    asin: order.asin || '-',
    created_mmdd: formatClearCreatedMmdd(order.created_at),
    debt_label: order.debt_status === 'owed' ? '有欠款' : '有余款',
    debt_amount: Number(order.debt_amount || 0),
    debt_amount_usd: Number(order._debt_amount_usd || 0),
    include: true,
  }
}

function openClearConfirmModal(rows: ClearConfirmRow[]) {
  clearConfirmDoClear.value = 'yes'
  clearConfirmRows.value = withClearConfirmDemoRows(rows)
  clearConfirmOpen.value = true
}

function openRecordModal(mode: RecordMode) {
  recordMode.value = mode
  recordForm.value = {
    amount_cny: undefined,
    notes: '',
    update_debt_status: null,
  }
  recordModalOpen.value = true
}

async function saveRecordModal() {
  const amount = Number(recordForm.value.amount_cny || 0)
  if (amount <= 0) {
    message.warning('请输入金额')
    return Promise.reject(new Error('amount required'))
  }
  if (!allLocalOrders.value.length) {
    message.warning('当前没有可操作的任务')
    return Promise.reject(new Error('no orders'))
  }
  recordSaving.value = true
  try {
    const isMockOnly = allLocalOrders.value.every(o => o._is_bill_proto_mock)
    message.success(
      recordMode.value === 'refund'
        ? (isMockOnly ? '退款已提交（原型展示，待审批）' : '退款已提交，流水待审批')
        : recordMode.value === 'offset'
          ? (isMockOnly ? '账面抵消已记录（原型展示）' : '账面抵消已记录')
          : (isMockOnly ? '补款已记录（原型展示）' : '补款已记录'),
    )
    recordModalOpen.value = false

    if (recordForm.value.update_debt_status === 'cleared') {
      const candidates = allLocalOrders.value
        .map(o => buildClearCandidateFromOrder(o))
        .filter(Boolean) as ClearConfirmRow[]
      openClearConfirmModal(candidates)
    }
  } finally {
    recordSaving.value = false
  }
}

async function applyClearConfirm() {
  if (clearConfirmDoClear.value !== 'yes') {
    clearConfirmOpen.value = false
    message.info('未结清，账款状态未变更')
    return
  }
  const targets = clearConfirmRows.value.filter(row => row.include && !row._is_demo)
  if (!targets.length) {
    clearConfirmOpen.value = false
    message.info('未勾选真实任务，未变更账款状态')
    return
  }
  clearConfirmSaving.value = true
  try {
    const idSet = new Set(targets.map(row => row.id))
    const sourceOrders = allLocalOrders.value
    const realIds = targets
      .map(row => sourceOrders.find(o => o.id === row.id))
      .filter(o => o && !o._is_bill_proto_mock)
      .map(o => o!.id)
    const updatedAt = new Date().toISOString()
    const nextMap: Record<string, any[]> = {}
    for (const [batch, list] of Object.entries(localOrdersByBatch.value)) {
      nextMap[batch] = list.map(o => (
        idSet.has(o.id)
          ? { ...o, debt_status: 'cleared', debt_amount: 0, _debt_amount_usd: 0 }
          : o
      ))
    }
    localOrdersByBatch.value = nextMap

    if (realIds.length) {
      const { error } = await supabase.from('erp_orders').update({
        debt_status: 'cleared',
        debt_amount: 0,
        updated_at: updatedAt,
      }).in('id', realIds)
      if (error) throw error
    }
    message.success(`已结清 ${targets.length} 个任务`)
    clearConfirmOpen.value = false
    emit('updated')
    refreshUnsavedTexts()
  } catch (e: any) {
    message.error('结清失败：' + e.message)
    return Promise.reject(e)
  } finally {
    clearConfirmSaving.value = false
  }
}

const rawGroups = computed<GroupBillGroupInput[]>(() => {
  if (props.groups && props.groups.length > 0) return props.groups
  return [{
    batchNumber: props.batchNumber || '-',
    orders: props.orders || [],
  }]
})

const isMulti = computed(() => rawGroups.value.length > 1)
const totalOrderCount = computed(() =>
  Object.values(localOrdersByBatch.value).reduce((s, list) => s + list.length, 0)
)

const drawerTitle = computed(() => {
  if (props.mode === 'batch' || isMulti.value) return '组结算工作台'
  return `组账单：${rawGroups.value[0]?.batchNumber || '-'}`
})

/** 跨组合并操作原型组（与 001 退款 mock 并存，不覆盖） */
const MERGE_PROTO_BATCHES = ['GRP-20260326-005', 'GRP-20260326-006']
const MERGE_FLOW_NO = 'FT-MOCK-MERGE-20260326-01'

function isMergeProtoBatch(batchNumber: string) {
  const n = String(batchNumber || '')
  return MERGE_PROTO_BATCHES.some((key) => n === key || n.includes(key))
}

function getMockCreditParts(batchNumber: string) {
  if (String(batchNumber).includes('GRP-20260326-003')) {
    return { base: 1500, offset: 300, date: '2026-03-26', flowBase: 'FT-MOCK-20260326-003' }
  }
  return { base: 1000, offset: 200, date: '2026-03-26', flowBase: 'FT-MOCK-20260326-001' }
}

function resolveCompanyName(orders: any[]) {
  const direct = [...new Set(orders.map(o => String(o.company_name || '').trim()).filter(Boolean))]
  if (direct.length) return direct.join('、')
  const viaId = [...new Set(
    orders.map(o => companyNameById.value[String(o.company_id || '')] || '').filter(Boolean)
  )]
  return viaId.join('、')
}

async function loadCompanyNames() {
  const ids = [...new Set(
    rawGroups.value.flatMap(g => (g.orders || []).map(o => o.company_id).filter(Boolean).map(String))
  )]
  if (!ids.length) {
    companyNameById.value = {}
    return
  }
  const { data, error } = await supabase.from('client_companies').select('id, company_name').in('id', ids)
  if (error || !data) return
  const map: Record<string, string> = {}
  for (const row of data) {
    const name = String(row.company_name || '').trim()
    if (name) map[String(row.id)] = name
  }
  companyNameById.value = map
}

/** 客户名若等于组任务号则不展示 */
function resolveCustomerName(batchNumber: string, orders: any[]) {
  const raw = String(orders[0]?.customer_name || orders[0]?.group_name || '').trim()
  if (!raw) return ''
  if (raw === batchNumber) return ''
  return raw
}

function buildPayments(batchNumber: string) {
  // 合并操作组：组内不记金额流水，关联流水在共享区展示
  if (isMergeProtoBatch(batchNumber)) return []

  const parts = getMockCreditParts(batchNumber)
  // 同一笔收款：收入 + 抵消共用一个流水号（最多两行）
  const list = [
    {
      id: `${batchNumber}-income`,
      payment_date: parts.date,
      transaction_type: '任务收入',
      direction: '收入',
      amount_cny: parts.base,
      flow_no: `${parts.flowBase}-A`,
      account: '公司对公 · 8801',
      notes: '-',
    },
    {
      id: `${batchNumber}-offset`,
      payment_date: parts.date,
      transaction_type: '任务收入',
      direction: '账面抵消',
      amount_cny: parts.offset,
      flow_no: `${parts.flowBase}-A`,
      account: '账面抵消',
      notes: '客户历史余款转入本组',
    },
  ]
  // 原型 001：另有一条支出流水（退款单独流水号）
  if (String(batchNumber).includes('GRP-20260326-001')) {
    list.push({
      id: `${batchNumber}-refund`,
      payment_date: parts.date,
      transaction_type: '任务退款',
      direction: '支出',
      amount_cny: 150,
      flow_no: `${parts.flowBase}-R`,
      account: '公司对公 · 8801',
      notes: '截单退款（原型 mock）',
    })
  }
  return list
}

/** 跨组合并补款：一条流水，备注写关联组 */
function buildMergeSharedPayments() {
  const hasMerge = rawGroups.value.some((g) => isMergeProtoBatch(g.batchNumber))
  if (!hasMerge) return []
  const related = MERGE_PROTO_BATCHES.join('、')
  return [
    {
      id: 'merge-proto-supplement',
      payment_date: '2026-03-26',
      transaction_type: '补款收入',
      direction: '收入',
      amount_cny: 800,
      flow_no: MERGE_FLOW_NO,
      account: '公司对公 · 8801',
      notes: `合并操作 · 关联组：${related}`,
      batchNumber: related,
      isMergeFlow: true,
    },
  ]
}

function buildTaskRows(orders: any[], credited: number) {
  const receivable = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0)
  const remain = receivable - credited
  return orders.map((o) => {
    const recv = Number(o.total_amount || 0)
    const share = receivable > 0 ? Number(((remain * recv) / receivable).toFixed(2)) : 0
    const signedDiff = Number((-share).toFixed(2))
    const date = o.created_at ? dayjs(o.created_at).format('MMDD') : dayjs().format('MMDD')
    const asin = o.asin || o.order_number || '-'
    let kind: 'supplement' | 'refund' | 'ok' = 'ok'
    let display = `${date} ${asin} 已结清`
    if (share > 0.005) {
      kind = 'supplement'
      display = `${date} ${asin} 需补${share.toFixed(0)}元`
    } else if (share < -0.005) {
      kind = 'refund'
      display = `${date} ${asin} 需退${Math.abs(share).toFixed(0)}元`
    }
    return {
      id: o.id,
      order_number: o.order_number,
      asin,
      receivable: recv,
      signedDiff,
      absAmount: Math.abs(share),
      kind,
      display,
      billing_status: o.billing_status || '已完成',
      debt_status: o.debt_status || 'none',
      debt_amount: Number(o.debt_amount || 0),
      /** 仅前端展示，不入库 */
      _debt_amount_usd: Number(o._debt_amount_usd || 0),
      _is_bill_proto_mock: !!o._is_bill_proto_mock,
      _raw: o,
    }
  })
}

const groupStates = computed(() =>
  rawGroups.value.map((g) => {
    const orders = localOrdersByBatch.value[g.batchNumber] || g.orders || []
    const mergeOperation = isMergeProtoBatch(g.batchNumber)
    const payments = buildPayments(g.batchNumber)
    const collected = payments
      .filter((p) => p.direction === '收入')
      .reduce((s, p) => s + Number(p.amount_cny || 0), 0)
    const offset = payments
      .filter((p) => p.direction === '账面抵消')
      .reduce((s, p) => s + Number(p.amount_cny || 0), 0)
    const refunded = payments
      .filter((p) => p.direction === '支出')
      .reduce((s, p) => s + Number(p.amount_cny || 0), 0)
    // 累计入账=实收+抵消；待结差额按入账扣除退款后对账
    const credited = collected + offset
    const netCredited = credited - refunded
    const receivable = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0)
    // 合并操作组：差价按未入账展示结算文案，但不在资金格显示数字
    const taskRows = buildTaskRows(orders, mergeOperation ? 0 : netCredited)
    return {
      batchNumber: g.batchNumber,
      customerName: resolveCustomerName(g.batchNumber, orders),
      companyName: resolveCompanyName(orders),
      orders,
      payments,
      expanded: !!expandedMap.value[g.batchNumber],
      fund: {
        receivable,
        collected,
        offset,
        refunded,
        credited,
        diff: mergeOperation ? 0 : netCredited - receivable,
        mergeOperation,
      },
      taskRows,
      needTotal: taskRows.filter(r => r.kind === 'supplement').reduce((s, r) => s + r.absAmount, 0),
      refundTotal: taskRows.filter(r => r.kind === 'refund').reduce((s, r) => s + r.absAmount, 0),
    }
  })
)

const headerCompanyName = computed(() =>
  [...new Set(groupStates.value.map(g => g.companyName).filter(Boolean))].join('、')
)

/** 表底合计：实际应收含全部组；其余金额字段合并操作组不参与，无可加总时显示 — */
const tableTotals = computed(() => {
  let orderCount = 0
  let receivable = 0
  let collected = 0
  let offset = 0
  let refunded = 0
  let diff = 0
  let numericGroups = 0
  for (const g of groupStates.value) {
    orderCount += g.orders.length
    receivable += g.fund.receivable
    if (g.fund.mergeOperation) continue
    numericGroups += 1
    collected += g.fund.collected
    offset += g.fund.offset
    refunded += g.fund.refunded
    diff += g.fund.diff
  }
  const summable = numericGroups > 0
  return {
    orderCount,
    receivable,
    collected,
    offset,
    refunded,
    diff,
    collectedSummable: summable,
    offsetSummable: summable,
    refundSummable: summable,
    diffSummable: summable,
  }
})

const showRefundColumn = computed(() =>
  groupStates.value.some((g) => g.fund.mergeOperation || g.fund.refunded > 0.005)
)

const allPayments = computed(() => {
  const perGroup = groupStates.value.flatMap((g) =>
    g.payments.map((p) => ({
      ...p,
      batchNumber: g.batchNumber,
    }))
  )
  return [...perGroup, ...buildMergeSharedPayments()]
})

/** 同流水号只在首行展示流水号；流水条数按流水号去重 */
const paymentDisplayRows = computed(() => {
  let lastFlow = ''
  return allPayments.value.map((p) => {
    const flow = String(p.flow_no || '')
    const showFlow = flow !== lastFlow
    lastFlow = flow
    return { ...p, showFlow }
  })
})

const paymentFlowCount = computed(() =>
  new Set(allPayments.value.map((p) => String(p.flow_no || p.id))).size
)

const allSettleLines = computed(() =>
  groupStates.value.flatMap((g) =>
    g.taskRows.map((row) => ({
      batchNumber: g.batchNumber,
      kind: row.kind,
      amount: row.absAmount,
      display: row.display,
    }))
  )
)

/** 结算预览按组任务号合并成块 */
const settleDisplayBlocks = computed(() => {
  const map = new Map<string, { batchNumber: string; lines: typeof allSettleLines.value }>()
  for (const line of allSettleLines.value) {
    if (!map.has(line.batchNumber)) {
      map.set(line.batchNumber, { batchNumber: line.batchNumber, lines: [] })
    }
    map.get(line.batchNumber)!.lines.push(line)
  }
  return [...map.values()]
})

const allNeedTotal = computed(() =>
  groupStates.value.reduce((s, g) => s + g.needTotal, 0)
)

const allRefundTotal = computed(() =>
  groupStates.value.reduce((s, g) => s + g.refundTotal, 0)
)

function storageKey() {
  const key = rawGroups.value.map(g => g.batchNumber).join('|') || 'unknown'
  return `group_bill_settle_text_v6:${key}`
}

function buildCopyText() {
  // 编辑内容不带组号
  const lines = allSettleLines.value
    .filter((l) => l.kind === 'supplement' || l.kind === 'refund')
    .map((l) => l.display)
  if (allNeedTotal.value > 0.005) lines.push(`共需补款：¥${allNeedTotal.value.toFixed(0)}`)
  if (allRefundTotal.value > 0.005) lines.push(`共需退款：¥${allRefundTotal.value.toFixed(0)}`)
  return lines.join('\n')
}

function loadEditableText() {
  const saved = localStorage.getItem(storageKey())
  if (saved != null && saved !== '') {
    editableText.value = saved
    savedOnce.value = true
    return
  }
  editableText.value = buildCopyText()
  savedOnce.value = false
}

function refreshUnsavedTexts() {
  if (!savedOnce.value) editableText.value = buildCopyText()
}

function syncLocalFromProps() {
  const map: Record<string, any[]> = {}
  const exp: Record<string, boolean> = {}
  const multi = rawGroups.value.length > 1
  rawGroups.value.forEach((g, idx) => {
    map[g.batchNumber] = (g.orders || []).map(o => ({ ...o }))
    // 单组默认展开；多组默认只展开第一组
    exp[g.batchNumber] = !multi || idx === 0
  })
  localOrdersByBatch.value = map
  expandedMap.value = exp
  activeBatch.value = rawGroups.value[0]?.batchNumber || ''
}

watch(
  () => [props.open, props.batchNumber, props.groups] as const,
  ([open]) => {
    if (!open) return
    syncLocalFromProps()
    loadEditableText()
    loadCompanyNames()
  },
  { immediate: true, deep: true }
)

function toggleGroup(gi: number) {
  const batch = groupStates.value[gi]?.batchNumber
  if (!batch) return
  expandedMap.value = {
    ...expandedMap.value,
    [batch]: !expandedMap.value[batch],
  }
  activeBatch.value = batch
}

function patchLocalOrder(row: any, patch: Record<string, any>) {
  for (const batch of Object.keys(localOrdersByBatch.value)) {
    const list = localOrdersByBatch.value[batch]
    const idx = list.findIndex(o => o.id === row.id)
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...patch }
      localOrdersByBatch.value = { ...localOrdersByBatch.value, [batch]: [...list] }
      return list[idx]
    }
  }
  return null
}

async function saveOrderField(
  row: any,
  field: 'billing_status' | 'debt_status' | 'debt_amount' | '_debt_amount_usd',
) {
  const localPatch: any = {}
  const dbPayload: any = { updated_at: new Date().toISOString() }
  if (field === 'billing_status') {
    localPatch.billing_status = row.billing_status
    dbPayload.billing_status = row.billing_status
  }
  if (field === 'debt_status') {
    localPatch.debt_status = row.debt_status
    dbPayload.debt_status = row.debt_status
    if (row.debt_status === 'none' || row.debt_status === 'cleared') {
      localPatch.debt_amount = 0
      localPatch._debt_amount_usd = 0
      row.debt_amount = 0
      row._debt_amount_usd = 0
      dbPayload.debt_amount = 0
    }
  }
  if (field === 'debt_amount') {
    const amount = Number(row.debt_amount || 0)
    localPatch.debt_amount = amount
    dbPayload.debt_amount = amount
  }
  // 美元差价仅前端展示，不写入数据库
  if (field === '_debt_amount_usd') {
    localPatch._debt_amount_usd = Number(Number(row._debt_amount_usd || 0).toFixed(2))
  }

  patchLocalOrder(row, localPatch)

  if (row._is_bill_proto_mock || field === '_debt_amount_usd') {
    message.success(field === '_debt_amount_usd' ? '已更新（仅展示）' : '已更新（原型 mock）')
    if (field !== '_debt_amount_usd' || row._is_bill_proto_mock) emit('updated')
    refreshUnsavedTexts()
    return
  }

  statusSaving.value = true
  try {
    const { error } = await supabase.from('erp_orders').update(dbPayload).eq('id', row.id)
    if (error) throw error
    message.success('已保存')
    emit('updated')
    refreshUnsavedTexts()
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    statusSaving.value = false
  }
}

function onDebtStatusChange(row: any) {
  saveOrderField(row, 'debt_status')
}

async function applyBatchStatus() {
  if (!batchBillingTarget.value && !batchDebtTarget.value) {
    message.warning('请先选择基础入账状态或账款情况')
    return
  }
  const payload: any = {}
  if (batchBillingTarget.value) payload.billing_status = batchBillingTarget.value
  if (batchDebtTarget.value) {
    payload.debt_status = batchDebtTarget.value
    if (batchDebtTarget.value === 'none' || batchDebtTarget.value === 'cleared') {
      payload.debt_amount = 0
      // 美元仅本地清零，不入库
      payload._debt_amount_usd = 0
    }
  }

  const allOrders = Object.values(localOrdersByBatch.value).flat()
  const realIds = allOrders.filter(o => !o._is_bill_proto_mock).map(o => o.id)

  // 先更新本地副本（含美元展示字段）
  const nextMap: Record<string, any[]> = {}
  for (const [batch, list] of Object.entries(localOrdersByBatch.value)) {
    nextMap[batch] = list.map(o => ({ ...o, ...payload }))
  }
  localOrdersByBatch.value = nextMap

  if (!realIds.length) {
    message.success('批量状态已更新（原型 mock）')
    emit('updated')
    refreshUnsavedTexts()
    return
  }

  const { _debt_amount_usd: _usdDisplayOnly, ...dbPayload } = payload
  statusSaving.value = true
  try {
    const { error } = await supabase.from('erp_orders').update({
      ...dbPayload,
      updated_at: new Date().toISOString(),
    }).in('id', realIds)
    if (error) throw error
    message.success('批量状态已更新')
    emit('updated')
    refreshUnsavedTexts()
  } catch (e: any) {
    message.error('批量保存失败：' + e.message)
  } finally {
    statusSaving.value = false
  }
}

function formatPaymentAmount(p: { direction: string; amount_cny: number }) {
  const amt = Number(p.amount_cny || 0).toFixed(2)
  if (p.direction === '账面抵消') return `抵 ¥${amt}`
  if (p.direction === '支出') return `-¥${amt}`
  return `+¥${amt}`
}

function copyText() {
  const text = editableText.value.trim()
  if (!text) {
    message.warning('没有内容可复制')
    return
  }
  navigator.clipboard.writeText(text).then(() => message.success('已复制')).catch(() => message.error('复制失败'))
}

function saveText() {
  localStorage.setItem(storageKey(), editableText.value)
  savedOnce.value = true
  message.success('结算内容已保存')
}
</script>

<style scoped>
.gbd { min-height: 100%; }
.gbd-drawer-title {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}
.gbd-drawer-company {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}
.gbd-fund-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 20px;
}
.gbd-fund-actions :deep(.gbd-btn-in.ant-btn) {
  color: #fff;
  background: #059669;
  border-color: #059669;
}
.gbd-fund-actions :deep(.gbd-btn-in.ant-btn:hover) {
  color: #fff;
  background: #059669;
  border-color: #059669;
  opacity: 0.88;
}
.gbd-fund-actions :deep(.gbd-btn-offset.ant-btn) {
  color: #fff;
  background: #2563eb;
  border-color: #2563eb;
}
.gbd-fund-actions :deep(.gbd-btn-offset.ant-btn:hover) {
  color: #fff;
  background: #2563eb;
  border-color: #2563eb;
  opacity: 0.88;
}
.gbd-fund-actions :deep(.gbd-btn-out.ant-btn) {
  color: #fff;
  background: #dc2626;
  border-color: #dc2626;
}
.gbd-fund-actions :deep(.gbd-btn-out.ant-btn:hover) {
  color: #fff;
  background: #dc2626;
  border-color: #dc2626;
  opacity: 0.88;
}
.gbd-body { padding: 16px 16px 28px; display: flex; flex-direction: column; gap: 20px; }
.gbd-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px 16px 18px;
}
.gbd-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.gbd-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.gbd-section-header .gbd-section-title { margin-bottom: 0; }
.gbd-section-count {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}
.gbd-batch-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.gbd-group-table {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}
.gbd-group-head,
.gbd-group-row,
.gbd-group-foot {
  display: grid;
  grid-template-columns: 28px 1.35fr 52px 0.9fr 0.9fr 0.9fr 0.9fr 1fr;
  gap: 8px;
  padding: 10px 12px;
  font-size: 12px;
  align-items: center;
}
.gbd-group-table.has-refund .gbd-group-head,
.gbd-group-table.has-refund .gbd-group-row,
.gbd-group-table.has-refund .gbd-group-foot {
  grid-template-columns: 28px 1.25fr 48px 0.85fr 0.85fr 0.85fr 0.85fr 0.85fr 0.95fr;
}
.gbd-group-head {
  background: #fafafa;
  color: #6b7280;
  font-weight: 600;
}
.gbd-group-row {
  border-top: 1px solid #f0f0f0;
  cursor: pointer;
  color: #1a1a2e;
}
.gbd-group-foot {
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
  color: #1a1a2e;
  font-weight: 700;
}
.gbd-group-foot .col-batch {
  font-family: inherit;
  font-weight: 700;
  color: #1a1a2e;
}
.gbd-group-row:hover { background: #f8fafc; }
.gbd-group-row.is-active { background: #f8fafc; }
.gbd-group-row .col-batch {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  color: #1a1a2e;
}
.gbd-in { color: #059669; font-weight: 650; }
.gbd-neg { color: #dc2626; font-weight: 650; }
.gbd-pos { color: #2563eb; font-weight: 650; }
.gbd-task-wrap {
  border-top: 1px solid #e5e7eb;
  background: #f5f7fa;
  padding: 0 8px 10px 28px;
}
.gbd-task-head,
.gbd-task-row {
  display: grid;
  grid-template-columns: 1fr 0.8fr 0.9fr 1.05fr 0.85fr 0.85fr;
  gap: 8px;
  padding: 7px 6px;
  font-size: 11px;
  align-items: center;
}
.gbd-task-head {
  color: #6b7280;
  font-weight: 600;
}
.gbd-task-row {
  border-top: 1px solid #f0f0f0;
  color: #1a1a2e;
}
.gbd-pay-table {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
}
.gbd-pay-head,
.gbd-pay-row {
  display: grid;
  grid-template-columns: 1.2fr 96px 88px 80px 100px 1.1fr;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  align-items: center;
}
.gbd-batch-cell {
  font-family: 'Courier New', monospace;
  font-weight: 650;
  color: #1a1a2e;
  word-break: break-all;
  min-height: 1em;
}
.gbd-pay-row.is-merged .gbd-batch-cell {
  border-left: 2px solid #e5e7eb;
  padding-left: 6px;
}
.gbd-collect-head {
  display: grid;
  grid-template-columns: 1.2fr 2fr;
  gap: 10px;
  padding: 4px 0 6px;
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 6px;
}
.gbd-collect-block {
  display: grid;
  grid-template-columns: 1.2fr 2fr;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid #fafafa;
  align-items: start;
}
.gbd-collect-block:last-of-type { border-bottom: none; }
.gbd-collect-batch {
  font-family: 'Courier New', monospace;
  font-weight: 650;
  color: #1a1a2e;
  font-size: 12px;
  word-break: break-all;
}
.gbd-collect-lines {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.gbd-pay-head {
  color: #6b7280;
  font-weight: 600;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}
.gbd-pay-row { border-bottom: 1px solid #fafafa; }
.gbd-pay-row:last-child { border-bottom: none; }
.gbd-pay-amt { color: #1a1a2e; font-weight: 650; }
.gbd-muted { color: #9ca3af; font-weight: 600; word-break: break-all; }
.gbd-collect-panel {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}
.gbd-collect-preview {
  padding: 12px 14px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}
.gbd-collect-line {
  font-size: 13px;
  line-height: 1.7;
  color: #1a1a2e;
  font-family: 'Courier New', monospace;
}
.gbd-collect-foot {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  color: #1a1a2e;
  font-weight: 700;
  font-size: 14px;
}
.gbd-collect-editor { padding: 12px 14px 14px; }
.gbd-edit-row {
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.gbd-copy-label { font-size: 12px; color: #6b7280; }
.gbd-copy-text { font-size: 13px; }
.gbd-copy-actions { margin-top: 10px; display: flex; justify-content: flex-end; gap: 8px; }

.gbd-record-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.gbd-record-summary {
  font-size: 12px;
  color: #6b7280;
  padding: 8px 10px;
  background: #f8fafc;
  border-radius: 8px;
}
.gbd-record-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.gbd-record-field label {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
}
.gbd-record-hint {
  font-size: 11px;
  color: #f59e0b;
}
.gbd-clear-bool {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.gbd-clear-bool-label {
  font-size: 13px;
  color: #1a1a2e;
  font-weight: 500;
}
.gbd-clear-tip {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}
.gbd-clear-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow: auto;
}
.gbd-clear-row {
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}
.gbd-clear-line {
  color: #1a1a2e;
  font-size: 13px;
  line-height: 1.4;
}
</style>
