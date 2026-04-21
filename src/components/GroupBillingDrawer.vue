<template>
  <a-drawer
    :open="open"
    :title="`任务组账单：${groupData?.label || groupData?.batch_number || ''}`"
    width="820"
    placement="right"
    :body-style="{ padding: '0', background: '#f8f9fb' }"
    @close="emit('close')"
  >
    <template v-if="groupData">
      <!-- 头部：组整体汇总 -->
      <div class="gbh">
        <div class="gbh-left">
          <div class="gbh-title">{{ groupData.label || groupData.batch_number }}</div>
          <div class="gbh-meta">
            <span v-if="groupData.customer_name">{{ groupData.customer_name }}</span>
            <span v-if="groupData.sales_person" class="gbh-sep">·</span>
            <span v-if="groupData.sales_person">{{ groupData.sales_person }}</span>
            <span v-if="groupData.batch_date" class="gbh-sep">·</span>
            <span v-if="groupData.batch_date">{{ groupData.batch_date }}</span>
          </div>
        </div>
        <div class="gbh-right">
          <div class="gbh-trio">
            <div class="trio-item">
              <div class="trio-label">签单应收（合计）</div>
              <div class="trio-val">¥{{ groupTotalExpected.toFixed(2) }}</div>
            </div>
            <div class="trio-div"></div>
            <div class="trio-item">
              <div class="trio-label">累计已收</div>
              <div class="trio-val" :style="{ color: groupTotalPaid > 0 ? '#16a34a' : '#9ca3af' }">
                ¥{{ groupTotalPaid.toFixed(2) }}
              </div>
            </div>
            <div class="trio-div"></div>
            <div class="trio-item">
              <div class="trio-label">{{ groupDiffLabel }}</div>
              <div class="trio-val" :style="{ color: groupDiffColor }">
                ¥{{ Math.abs(groupDiff).toFixed(2) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 警示栏 -->
      <div v-if="pendingOrders.length > 0" class="gbh-alert">
        <span class="alert-icon">!</span>
        <span>有 {{ pendingOrders.length }} 个订单存在欠款或应退款项，请及时处理</span>
      </div>

      <div class="gb-body">
        <!-- 区块一：组内订单账款一览 + 批量变账状态 -->
        <div class="gb-section">
          <div class="section-header">
            <span class="section-title">组内订单账款一览</span>
            <a-tag color="blue" size="small">{{ orders.length }} 个订单</a-tag>
            <a-button
              size="small"
              style="margin-left: auto"
              @click="showBatchStatusModal = true"
            >批量变账状态</a-button>
          </div>
          <div class="orders-table">
            <div class="orders-table-head">
              <span class="col-num">订单号</span>
              <span class="col-asin">ASIN</span>
              <span class="col-amt">签单应收</span>
              <span class="col-paid">累计已收</span>
              <span class="col-status">入账状态</span>
              <span class="col-debt">账款情况</span>
              <span class="col-action">操作</span>
            </div>
            <div
              v-for="row in orderRows"
              :key="row.order.id"
              class="orders-table-row"
              :class="{ 'row-attention': row.hasIssue }"
            >
              <span class="col-num">
                <span class="order-num-text">{{ row.order.order_number }}</span>
              </span>
              <span class="col-asin">{{ row.order.asin || '-' }}</span>
              <span class="col-amt">¥{{ Number(row.order.total_amount || 0).toFixed(2) }}</span>
              <span class="col-paid" :style="{ color: row.paid > 0 ? '#16a34a' : '#9ca3af' }">
                ¥{{ row.paid.toFixed(2) }}
              </span>
              <span class="col-status">
                <a-tag :color="row.order.billing_status === '未完成' ? 'red' : 'green'" size="small">
                  {{ row.order.billing_status || '已完成' }}
                </a-tag>
              </span>
              <span class="col-debt">
                <a-tag v-if="row.order.debt_status === 'owed'" color="orange" size="small">
                  欠¥{{ Number(row.order.debt_amount || 0).toFixed(0) }}
                </a-tag>
                <a-tag v-else-if="row.order.debt_status === 'surplus'" color="blue" size="small">
                  应退¥{{ Number(row.order.debt_amount || 0).toFixed(0) }}
                </a-tag>
                <a-tag v-else-if="row.order.debt_status === 'cleared'" color="green" size="small">已结清</a-tag>
                <a-tag v-else color="default" size="small">无异常</a-tag>
              </span>
              <span class="col-action">
                <a-button type="link" size="small" @click="openSingleBilling(row.order)">账单</a-button>
              </span>
            </div>
          </div>
        </div>

        <!-- 区块二：整组收付款记录 -->
        <div class="gb-section">
          <div class="section-header">
            <span class="section-title">整组收付款记录</span>
            <a-tag v-if="allPayments.length > 0" color="default" size="small">{{ allPayments.length }} 条</a-tag>
          </div>
          <div v-if="allPayments.length === 0" class="records-empty">暂无收付款记录</div>
          <div v-else class="records-list">
            <div
              v-for="p in allPayments"
              :key="p.id"
              class="record-card"
              :class="p.amount_cny < 0 ? 'record-refund' : 'record-supplement'"
            >
              <div class="record-left">
                <div class="record-amount" :class="p.amount_cny < 0 ? 'record-amount-refund' : ''">
                  {{ p.amount_cny < 0 ? '' : '+' }}¥{{ Number(p.amount_cny).toFixed(2) }}
                </div>
                <div class="record-meta">
                  <span class="record-order-tag">{{ p._orderNumber }}</span>
                  <span class="meta-dot">·</span>
                  <span>{{ p.payment_date }}</span>
                  <span v-if="p.payment_method" class="meta-dot">·</span>
                  <span v-if="p.payment_method">{{ p.payment_method }}</span>
                  <span v-if="p.payer_name" class="meta-dot">·</span>
                  <span v-if="p.payer_name">{{ p.payer_name }}</span>
                </div>
                <div v-if="p.notes" class="record-notes">{{ p.notes }}</div>
                <div v-if="p.receipt_urls && p.receipt_urls.length" class="record-receipts">
                  <a v-for="(url, i) in p.receipt_urls" :key="i" :href="url" target="_blank" class="receipt-link">
                    凭证{{ i + 1 }}
                  </a>
                </div>
              </div>
              <div class="record-right">
                <a-tag size="small" :color="p.amount_cny < 0 ? 'orange' : 'green'">
                  {{ p.amount_cny < 0 ? '退款' : '补款' }}
                </a-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- 区块三：合并款项录入（正数=补款，负数=退款） -->
        <div class="gb-section">
          <div class="section-header">
            <span class="section-title">合并款项录入</span>
            <span class="section-hint">正数为补款，负数为退款；同一批次可混合录入</span>
          </div>

          <div class="batch-form">
            <div class="bf-row">
              <div class="bf-field">
                <label class="bf-label">日期 <span class="required">*</span></label>
                <a-date-picker
                  v-model:value="batchDatePicker"
                  style="width: 180px"
                  placeholder="选择日期"
                  value-format="YYYY-MM-DD"
                />
              </div>
              <div class="bf-field">
                <label class="bf-label">支付方式</label>
                <a-select v-model:value="batchPaymentMethod" style="width: 140px">
                  <a-select-option value="银行转账">银行转账</a-select-option>
                  <a-select-option value="微信">微信</a-select-option>
                  <a-select-option value="支付宝">支付宝</a-select-option>
                  <a-select-option value="现金">现金</a-select-option>
                  <a-select-option value="其他">其他</a-select-option>
                </a-select>
              </div>
              <div class="bf-field">
                <label class="bf-label">付款方</label>
                <a-input v-model:value="batchPayerName" style="width: 180px" placeholder="姓名" />
              </div>
              <div class="bf-field">
                <label class="bf-label">操作人</label>
                <a-input v-model:value="batchRecordedBy" style="width: 140px" placeholder="录入人" />
              </div>
            </div>
            <div class="bf-row">
              <div class="bf-field" style="flex: 1">
                <label class="bf-label">备注</label>
                <a-input v-model:value="batchNotes" placeholder="备注（可选）" />
              </div>
            </div>

            <!-- 每个订单逐行录入 -->
            <div class="bf-alloc-header">
              <span class="bf-label">各订单款项填写</span>
              <span class="alloc-hint">正数=补款 / 负数=退款，留空则不记录</span>
            </div>
            <div class="bf-alloc-list">
              <div v-for="row in allocRows" :key="row.orderId" class="bf-alloc-row">
                <span class="alloc-order-num">{{ row.orderNumber }}</span>
                <div class="alloc-debt-info">
                  <span class="alloc-expected">签单¥{{ Number(row.expected).toFixed(2) }}</span>
                  <span v-if="row.debtHint" class="alloc-debt-tag" :class="row.debtHintType">
                    {{ row.debtHint }}
                  </span>
                </div>
                <div class="alloc-input-wrap">
                  <a-input-number
                    v-model:value="row.allocated"
                    :precision="2"
                    style="width: 150px"
                    :placeholder="row.allocPlaceholder"
                    :class="{ 'input-negative': (row.allocated || 0) < 0 }"
                  />
                  <span class="alloc-type-hint" v-if="row.allocated !== undefined && row.allocated !== null">
                    <span v-if="(row.allocated || 0) > 0.005" class="hint-supplement">补款</span>
                    <span v-else-if="(row.allocated || 0) < -0.005" class="hint-refund">退款</span>
                  </span>
                </div>
                <div class="alloc-debt-toggle">
                  <a-select v-model:value="row.updateDebtStatus" size="small" style="width: 120px">
                    <a-select-option value="none">不变账状态</a-select-option>
                    <a-select-option value="cleared">标记已结清</a-select-option>
                    <a-select-option value="owed">标记有欠款</a-select-option>
                    <a-select-option value="surplus">标记溢收</a-select-option>
                  </a-select>
                </div>
              </div>
              <div class="bf-alloc-total">
                <span>本次合计：</span>
                <span :style="{ color: allocNetTotal >= 0 ? '#16a34a' : '#dc2626' }">
                  {{ allocNetTotal >= 0 ? '+' : '' }}¥{{ allocNetTotal.toFixed(2) }}
                </span>
                <span class="alloc-total-breakdown" v-if="allocSupplementTotal > 0 || allocRefundTotal > 0">
                  （补款 +¥{{ allocSupplementTotal.toFixed(2) }}
                  <template v-if="allocRefundTotal > 0">，退款 -¥{{ allocRefundTotal.toFixed(2) }}</template>
                  ）
                </span>
              </div>
            </div>

            <div class="bf-submit">
              <a-button
                type="primary"
                :loading="batchSaving"
                :disabled="!batchDatePicker || !hasAnyAlloc"
                @click="saveBatchRecord"
              >
                提交款项
              </a-button>
              <a-button
                danger
                :loading="batchRefundSaving"
                :disabled="!batchDatePicker || allocRefundTotal <= 0"
                @click="submitRefundRequest"
              >
                退款申请
              </a-button>
              <span class="bf-submit-hint" v-if="allocRefundTotal > 0">含退款将生成待审批流水</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 批量变账状态弹窗 -->
    <a-modal
      v-model:open="showBatchStatusModal"
      title="批量变账状态"
      width="560px"
      :confirm-loading="batchStatusSaving"
      ok-text="确认保存"
      cancel-text="取消"
      @ok="saveBatchStatus"
    >
      <div class="batch-status-modal">
        <div class="bsm-tip">选择要统一变更的账状态，勾选需要变更的订单</div>
        <div class="bsm-target-row">
          <span class="bsm-label">目标账状态：</span>
          <a-radio-group v-model:value="batchStatusTarget" size="small">
            <a-radio value="billing_done">入账状态 → 已完成</a-radio>
            <a-radio value="billing_undone">入账状态 → 未完成</a-radio>
            <a-radio value="debt_cleared">账款情况 → 已结清</a-radio>
            <a-radio value="debt_owed">账款情况 → 有欠款</a-radio>
            <a-radio value="debt_surplus">账款情况 → 溢收</a-radio>
            <a-radio value="debt_none">账款情况 → 无异常</a-radio>
          </a-radio-group>
        </div>
        <div class="bsm-select-all">
          <a-checkbox v-model:checked="batchStatusSelectAll" @change="onSelectAllChange">全选</a-checkbox>
        </div>
        <div class="bsm-order-list">
          <div v-for="o in orders" :key="o.id" class="bsm-order-row">
            <a-checkbox v-model:checked="batchStatusSelected[o.id]" />
            <span class="bsm-order-num">{{ o.order_number }}</span>
            <span class="bsm-order-asin">{{ o.asin || '-' }}</span>
            <div class="bsm-order-tags">
              <a-tag :color="o.billing_status === '未完成' ? 'red' : 'green'" size="small">
                {{ o.billing_status || '已完成' }}
              </a-tag>
              <a-tag v-if="o.debt_status === 'owed'" color="orange" size="small">欠款</a-tag>
              <a-tag v-else-if="o.debt_status === 'surplus'" color="blue" size="small">溢收</a-tag>
              <a-tag v-else-if="o.debt_status === 'cleared'" color="green" size="small">已结清</a-tag>
              <a-tag v-else color="default" size="small">无异常</a-tag>
            </div>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 单订单账单抽屉（嵌套） -->
    <BillingDrawer
      :open="singleBillingOpen"
      :order="singleBillingOrder"
      @close="singleBillingOpen = false"
      @updated="onSingleBillingUpdated"
    />
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { supabase } from '../lib/supabase'
import { useCurrentUser } from '../composables/useCurrentUser'
import dayjs from 'dayjs'
import BillingDrawer from './BillingDrawer.vue'

const props = defineProps<{
  open: boolean
  groupData: any | null
  groupOrders: any[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated'): void
}>()

const { currentUser } = useCurrentUser()

const orders = ref<any[]>([])
const allPayments = ref<any[]>([])

const singleBillingOpen = ref(false)
const singleBillingOrder = ref<any>(null)

function openSingleBilling(order: any) {
  singleBillingOrder.value = order
  singleBillingOpen.value = true
}

function onSingleBillingUpdated(payload: any) {
  const idx = orders.value.findIndex(o => o.id === payload.id)
  if (idx !== -1) {
    orders.value[idx] = { ...orders.value[idx], ...payload }
  }
  loadAllPayments()
}

const orderPaymentMap = ref<Record<string, number>>({})

const orderRows = computed(() => {
  return orders.value.map(o => {
    const paid = orderPaymentMap.value[o.id] || 0
    const hasIssue = o.debt_status === 'owed' || o.debt_status === 'surplus'
    return { order: o, paid, hasIssue }
  })
})

const pendingOrders = computed(() =>
  orders.value.filter(o => o.debt_status === 'owed' || o.debt_status === 'surplus')
)

const groupTotalExpected = computed(() =>
  orders.value.reduce((s, o) => s + Number(o.total_amount || 0), 0)
)

const groupTotalPaid = computed(() =>
  Object.values(orderPaymentMap.value).reduce((s, v) => s + v, 0)
)

const groupDiff = computed(() => groupTotalExpected.value - groupTotalPaid.value)

const groupDiffLabel = computed(() => {
  if (groupDiff.value > 0.005) return '待收差额'
  if (groupDiff.value < -0.005) return '待退差额'
  return '已结清'
})

const groupDiffColor = computed(() => {
  if (groupDiff.value > 0.005) return '#dc2626'
  if (groupDiff.value < -0.005) return '#2563eb'
  return '#16a34a'
})

async function loadOrders() {
  if (props.groupOrders?.length) {
    orders.value = props.groupOrders
    return
  }
  if (!props.groupData?.id) {
    orders.value = []
    return
  }
  const { data } = await supabase
    .from('erp_orders')
    .select('*')
    .eq('batch_id', props.groupData.id)
    .order('created_at')
  orders.value = data || []
}

async function loadAllPayments() {
  if (orders.value.length === 0) {
    allPayments.value = []
    orderPaymentMap.value = {}
    return
  }
  const orderIds = orders.value.map(o => o.id)
  const { data } = await supabase
    .from('batch_payments')
    .select('*')
    .in('batch_id', orderIds)
    .order('payment_date', { ascending: false })

  const payments = data || []
  const orderNumberMap: Record<string, string> = {}
  orders.value.forEach(o => { orderNumberMap[o.id] = o.order_number })

  allPayments.value = payments.map(p => ({
    ...p,
    _orderNumber: orderNumberMap[p.batch_id] || p.batch_id,
  }))

  const map: Record<string, number> = {}
  orders.value.forEach(o => { map[o.id] = 0 })
  for (const p of payments) {
    if (map[p.batch_id] !== undefined) {
      map[p.batch_id] += Number(p.amount_cny || 0)
    }
  }
  orderPaymentMap.value = map
}

watch(() => props.open, async (val) => {
  if (val && props.groupData) {
    await loadOrders()
    await loadAllPayments()
    resetBatchForm()
  }
})

watch(() => props.groupOrders, (val) => {
  if (val && val.length > 0 && props.open) {
    orders.value = val
    loadAllPayments()
  }
}, { immediate: true })

// --- 合并款项录入 ---
const batchDatePicker = ref<any>(null)
const batchPaymentMethod = ref('银行转账')
const batchPayerName = ref('')
const batchRecordedBy = ref('')
const batchNotes = ref('')
const batchSaving = ref(false)
const batchRefundSaving = ref(false)

interface AllocRow {
  orderId: string
  orderNumber: string
  expected: number
  allocated: number | undefined
  updateDebtStatus: string
  debtHint: string
  debtHintType: string
  allocPlaceholder: string
}

const allocRows = ref<AllocRow[]>([])

function buildAllocRows(orderList: any[]): AllocRow[] {
  return orderList.map(o => {
    const debtStatus = o.debt_status
    const debtAmt = Number(o.debt_amount || 0)
    let debtHint = ''
    let debtHintType = ''
    let autoFill: number | undefined = undefined
    let allocPlaceholder = '金额（正=补款 负=退款）'

    if (debtStatus === 'owed' && debtAmt > 0) {
      debtHint = `欠款 +¥${debtAmt.toFixed(2)}`
      debtHintType = 'hint-owed'
      autoFill = debtAmt
      allocPlaceholder = `+${debtAmt.toFixed(2)}（欠款）`
    } else if (debtStatus === 'surplus' && debtAmt > 0) {
      debtHint = `溢收 -¥${debtAmt.toFixed(2)}`
      debtHintType = 'hint-surplus'
      autoFill = -debtAmt
      allocPlaceholder = `-${debtAmt.toFixed(2)}（溢收应退）`
    }

    return {
      orderId: o.id,
      orderNumber: o.order_number,
      expected: Number(o.total_amount || 0),
      allocated: autoFill,
      updateDebtStatus: autoFill !== undefined ? 'cleared' : 'none',
      debtHint,
      debtHintType,
      allocPlaceholder,
    }
  })
}

watch(orders, (val) => {
  allocRows.value = buildAllocRows(val)
})

const allocNetTotal = computed(() =>
  allocRows.value.reduce((s, r) => s + Number(r.allocated || 0), 0)
)

const allocSupplementTotal = computed(() =>
  allocRows.value.filter(r => Number(r.allocated || 0) > 0).reduce((s, r) => s + Number(r.allocated), 0)
)

const allocRefundTotal = computed(() =>
  allocRows.value.filter(r => Number(r.allocated || 0) < 0).reduce((s, r) => s + Math.abs(Number(r.allocated)), 0)
)

const hasAnyAlloc = computed(() =>
  allocRows.value.some(r => r.allocated !== undefined && r.allocated !== null && r.allocated !== 0)
)

const hasRefundAlloc = computed(() =>
  allocRows.value.some(r => Number(r.allocated || 0) < 0)
)

function resetBatchForm() {
  batchDatePicker.value = dayjs()
  batchPaymentMethod.value = '银行转账'
  batchPayerName.value = props.groupData?.customer_name || ''
  batchRecordedBy.value = currentUser.value?.name || ''
  batchNotes.value = ''
  allocRows.value = buildAllocRows(orders.value)
}

function rebuildAllocRowsWithDrafts(draftMap: Record<string, { allocated: number | undefined, updateDebtStatus: string }>) {
  allocRows.value = buildAllocRows(orders.value).map(row => {
    const draft = draftMap[row.orderId]
    return draft
      ? { ...row, allocated: draft.allocated, updateDebtStatus: draft.updateDebtStatus }
      : row
  })
}

async function saveBatchRecord(mode: 'all' | 'refund' = 'all') {
  if (!batchDatePicker.value) {
    message.warning('请选择日期')
    return
  }
  const toProcess = allocRows.value.filter((r) => {
    if (r.allocated === undefined || r.allocated === null || r.allocated === 0) return false
    if (mode === 'refund') return Number(r.allocated) < 0
    return true
  })
  if (toProcess.length === 0) {
    message.warning(mode === 'refund' ? '请至少填写一条退款金额' : '请至少填写一个订单的款项金额')
    return
  }

  if (mode === 'refund' && !hasRefundAlloc.value) {
    message.warning('当前没有可提交的退款项')
    return
  }

  if (mode === 'refund') batchRefundSaving.value = true
  else batchSaving.value = true
  try {
    const paymentDate = typeof batchDatePicker.value === 'string'
      ? batchDatePicker.value
      : batchDatePicker.value?.format('YYYY-MM-DD')

    for (const row of toProcess) {
      const rawAmt = Number(row.allocated)
      const isRefund = rawAmt < 0
      const absAmt = Math.abs(rawAmt)
      const order = orders.value.find(o => o.id === row.orderId)
      if (!order) continue

      const { data: txNo } = await supabase.rpc('generate_transaction_no')
      const transactionNo = txNo || `FT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

      const { data: txData, error: txErr } = await supabase.from('financial_transactions').insert({
        transaction_no: transactionNo,
        transaction_type: isRefund ? '退款' : '批次收款',
        direction: isRefund ? '支出' : '收入',
        amount_cny: absAmt,
        exchange_rate: order.exchange_rate || 7.25,
        customer_name: order.customer_name || '',
        customer_id_str: order.customer_id_str || '',
        order_id: order.id,
        order_number: order.order_number,
        staff_name: batchRecordedBy.value,
        status: isRefund ? '待审批' : '已确认',
        notes: `${isRefund ? '退款' : '补款'}（任务组合并）- ${batchPaymentMethod.value}${batchNotes.value ? ' | ' + batchNotes.value : ''}`,
        transaction_date: paymentDate,
      }).select('id').maybeSingle()
      if (txErr) throw txErr

      const { error: payErr } = await supabase.from('batch_payments').insert({
        batch_id: order.id,
        batch_number: order.order_number,
        transaction_id: txData?.id || null,
        amount_cny: rawAmt,
        payment_date: paymentDate,
        payment_method: batchPaymentMethod.value,
        payer_name: batchPayerName.value,
        recorded_by: batchRecordedBy.value,
        notes: batchNotes.value,
        payment_type: isRefund ? '退款' : '补款',
      })
      if (payErr) throw payErr

      if (row.updateDebtStatus !== 'none') {
        const statusPayload: any = {
          debt_status: row.updateDebtStatus,
          updated_at: new Date().toISOString(),
        }
        if (row.updateDebtStatus === 'cleared') {
          statusPayload.debt_amount = 0
        }
        await supabase.from('erp_orders').update(statusPayload).eq('id', order.id)
        const idx = orders.value.findIndex(o => o.id === order.id)
        if (idx !== -1) {
          orders.value[idx] = { ...orders.value[idx], ...statusPayload }
        }
      }
    }

    const supplementCount = toProcess.filter(r => Number(r.allocated) > 0).length
    const refundCount = toProcess.filter(r => Number(r.allocated) < 0).length
    const parts = []
    if (supplementCount > 0) parts.push(`补款 ${supplementCount} 笔`)
    if (refundCount > 0) parts.push(`退款 ${refundCount} 笔（待审批）`)
    message.success(mode === 'refund' ? `退款申请已提交：${parts.join('，')}` : `款项已记录：${parts.join('，')}`)

    if (mode === 'refund') {
      const remainingDrafts = allocRows.value
        .filter(row => Number(row.allocated || 0) > 0)
        .reduce((acc, row) => {
          acc[row.orderId] = {
            allocated: row.allocated,
            updateDebtStatus: row.updateDebtStatus,
          }
          return acc
        }, {} as Record<string, { allocated: number | undefined, updateDebtStatus: string }>)
      rebuildAllocRowsWithDrafts(remainingDrafts)
    } else {
      resetBatchForm()
    }
    await loadAllPayments()
    emit('updated')
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    batchSaving.value = false
    batchRefundSaving.value = false
  }
}

function submitRefundRequest() {
  saveBatchRecord('refund')
}

// --- 批量变账状态 ---
const showBatchStatusModal = ref(false)
const batchStatusTarget = ref('billing_done')
const batchStatusSelected = ref<Record<string, boolean>>({})
const batchStatusSelectAll = ref(false)
const batchStatusSaving = ref(false)

watch(orders, (val) => {
  const sel: Record<string, boolean> = {}
  val.forEach(o => { sel[o.id] = false })
  batchStatusSelected.value = sel
  batchStatusSelectAll.value = false
})

function onSelectAllChange(e: any) {
  const checked = e.target.checked
  orders.value.forEach(o => {
    batchStatusSelected.value[o.id] = checked
  })
}

async function saveBatchStatus() {
  const selectedIds = Object.entries(batchStatusSelected.value)
    .filter(([, v]) => v)
    .map(([k]) => k)

  if (selectedIds.length === 0) {
    message.warning('请勾选需要变更的订单')
    return
  }

  batchStatusSaving.value = true
  try {
    const updatePayload: any = { updated_at: new Date().toISOString() }
    switch (batchStatusTarget.value) {
      case 'billing_done':
        updatePayload.billing_status = '已完成'
        break
      case 'billing_undone':
        updatePayload.billing_status = '未完成'
        break
      case 'debt_cleared':
        updatePayload.debt_status = 'cleared'
        updatePayload.debt_amount = 0
        break
      case 'debt_owed':
        updatePayload.debt_status = 'owed'
        break
      case 'debt_surplus':
        updatePayload.debt_status = 'surplus'
        break
      case 'debt_none':
        updatePayload.debt_status = 'none'
        updatePayload.debt_amount = 0
        break
    }

    const { error } = await supabase
      .from('erp_orders')
      .update(updatePayload)
      .in('id', selectedIds)
    if (error) throw error

    selectedIds.forEach(id => {
      const idx = orders.value.findIndex(o => o.id === id)
      if (idx !== -1) {
        orders.value[idx] = { ...orders.value[idx], ...updatePayload }
      }
    })

    message.success(`已更新 ${selectedIds.length} 个订单的账状态`)
    showBatchStatusModal.value = false
    emit('updated')
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    batchStatusSaving.value = false
  }
}
</script>

<style scoped>
.gbh {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  gap: 16px;
}

.gbh-left {}

.gbh-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
}

.gbh-meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.gbh-sep { color: #d1d5db; }

.gbh-right {}

.gbh-trio {
  display: flex;
  align-items: center;
  background: #f8f9fb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px 16px;
  gap: 12px;
}

.trio-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 80px;
}

.trio-label {
  font-size: 11px;
  color: #9ca3af;
}

.trio-val {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
}

.trio-div {
  width: 1px;
  height: 32px;
  background: #e5e7eb;
}

.gbh-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: #fffbeb;
  border-bottom: 1px solid #fde68a;
  font-size: 13px;
  color: #92400e;
}

.alert-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: #f59e0b;
  color: #fff;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.gb-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gb-section {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #f0f0f0;
  padding: 16px 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}

.section-hint {
  font-size: 12px;
  color: #9ca3af;
}

.orders-table {}

.orders-table-head {
  display: grid;
  grid-template-columns: 160px 90px 90px 90px 80px 110px 60px;
  padding: 6px 8px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 4px;
}

.orders-table-row {
  display: grid;
  grid-template-columns: 160px 90px 90px 90px 80px 110px 60px;
  padding: 8px 8px;
  border-bottom: 1px solid #f9fafb;
  font-size: 13px;
  align-items: center;
  transition: background 0.15s;
}

.orders-table-row:hover {
  background: #f8f9fb;
}

.orders-table-row.row-attention {
  background: #fffbeb;
}

.orders-table-row:last-child {
  border-bottom: none;
}

.order-num-text {
  font-size: 12px;
  font-family: 'Courier New', monospace;
  color: #1a1a2e;
}

.col-num, .col-asin, .col-amt, .col-paid, .col-status, .col-debt, .col-action {
  display: flex;
  align-items: center;
}

.records-empty {
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
  padding: 16px 0;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.record-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
}

.record-supplement {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.record-refund {
  background: #fff7ed;
  border-color: #fed7aa;
}

.record-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.record-right {
  flex-shrink: 0;
}

.record-amount {
  font-size: 15px;
  font-weight: 700;
  color: #16a34a;
}

.record-amount-refund {
  color: #dc2626;
}

.record-meta {
  font-size: 12px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.record-order-tag {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  background: #e5e7eb;
  padding: 1px 5px;
  border-radius: 3px;
  color: #374151;
}

.meta-dot { color: #d1d5db; }

.record-notes {
  font-size: 12px;
  color: #9ca3af;
}

.record-receipts {
  display: flex;
  gap: 8px;
}

.receipt-link {
  font-size: 12px;
  color: #2563eb;
  text-decoration: underline;
}

.batch-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bf-row {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.bf-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.bf-label {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
}

.required {
  color: #dc2626;
  margin-left: 2px;
}

.bf-alloc-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.alloc-hint {
  font-size: 12px;
  color: #9ca3af;
}

.bf-alloc-list {
  background: #f8f9fb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bf-alloc-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
}

.alloc-order-num {
  font-size: 12px;
  font-family: 'Courier New', monospace;
  color: #1a1a2e;
  min-width: 160px;
  flex-shrink: 0;
}

.alloc-debt-info {
  min-width: 118px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.alloc-expected {
  font-size: 12px;
  color: #6b7280;
}

.alloc-debt-tag {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.hint-owed {
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
}

.hint-surplus {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.alloc-input-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.alloc-type-hint {
  font-size: 11px;
  font-weight: 600;
}

.hint-supplement {
  color: #16a34a;
}

.hint-refund {
  color: #dc2626;
}

:deep(.input-negative input) {
  color: #dc2626;
}

.alloc-debt-toggle {}

.bf-alloc-total {
  font-size: 13px;
  color: #374151;
  font-weight: 600;
  border-top: 1px solid #e5e7eb;
  padding-top: 10px;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.alloc-total-breakdown {
  font-size: 12px;
  color: #6b7280;
  font-weight: 400;
}

.bf-submit {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 4px;
  flex-wrap: wrap;
}

.bf-submit-hint {
  font-size: 12px;
  color: #f59e0b;
}

/* 批量变账状态弹窗 */
.batch-status-modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bsm-tip {
  font-size: 13px;
  color: #6b7280;
}

.bsm-target-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.bsm-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  flex-shrink: 0;
  padding-top: 2px;
}

.bsm-select-all {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.bsm-order-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.bsm-order-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #f9fafb;
  border: 1px solid #f0f0f0;
}

.bsm-order-num {
  font-size: 12px;
  font-family: 'Courier New', monospace;
  color: #1a1a2e;
  min-width: 160px;
}

.bsm-order-asin {
  font-size: 12px;
  color: #6b7280;
  min-width: 80px;
}

.bsm-order-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
</style>
