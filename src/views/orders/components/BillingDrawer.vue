<template>
  <a-drawer
    :open="open"
    title="账款管理"
    width="680"
    placement="right"
    :body-style="{ padding: '0', background: 'var(--eva-bg-soft, #f8f9fb)' }"
    @close="emit('close')"
  >
    <template v-if="order">
      <div class="billing-header">
        <div class="billing-header-left">
          <div class="billing-order-num">{{ order.task_no || order.id }}</div>
          <div class="billing-order-meta">
            <span>{{ order.employee?.name || '-' }}</span>
            <span v-if="order.product?.asin" class="meta-sep">·</span>
            <span v-if="order.product?.asin" class="meta-asin">{{ order.product?.asin }}</span>
          </div>
        </div>
        <div class="billing-header-right">
          <div class="billing-summary-trio">
            <div class="trio-item">
              <div class="trio-label">实际应收</div>
              <div class="trio-val trio-expect">&yen;{{ actualReceivable.toFixed(2) }}</div>
            </div>
            <div class="trio-divider"></div>
            <div class="trio-item">
              <div class="trio-label">累计入账</div>
              <div class="trio-val trio-received" :style="{ color: cumulativeIncome > 0 ? '#16a34a' : '#9ca3af' }">
                &yen;{{ cumulativeIncome.toFixed(2) }}
              </div>
            </div>
            <div class="trio-divider"></div>
            <div class="trio-item">
              <div class="trio-label">待结算差额</div>
              <div class="trio-val" :style="{ color: settlementDiffColor }">
                <template v-if="settlementDiff > 0.005">+&yen;{{ settlementDiff.toFixed(2) }}</template>
                <template v-else-if="settlementDiff < -0.005">-&yen;{{ Math.abs(settlementDiff).toFixed(2) }}</template>
                <template v-else>&yen;0.00</template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="billing-body">
        <div class="billing-section">
          <div class="section-header">
            <span class="section-title">账款状态</span>
            <a-button v-if="!editingDebt" type="link" size="small" @click="startEditDebt">编辑</a-button>
            <div v-else class="section-actions">
              <a-button size="small" @click="cancelEditDebt">取消</a-button>
              <a-button size="small" type="primary" :loading="debtSaving" @click="saveDebt">保存</a-button>
            </div>
          </div>

          <div v-if="!editingDebt" class="debt-view">
            <div class="debt-view-row">
              <span class="dv-label">实际应收</span>
              <span class="dv-val">&yen;{{ actualReceivable.toFixed(2) }}</span>
            </div>
            <div class="debt-view-row">
              <span class="dv-label">基础入账状态</span>
              <a-tag :color="Number(billStatus?.basic_bill_status) === 2 ? 'red' : Number(billStatus?.basic_bill_status) === 3 ? 'blue' : 'green'" size="small">
                {{ billStatus?.basic_bill_status_label || '已完成' }}
              </a-tag>
            </div>
            <div class="debt-view-row">
              <span class="dv-label">账款情况</span>
              <a-tag v-if="hasRealDebt(order)" color="orange" size="small">
                有欠款 &yen;{{ Number(billStatus?.arrears_amount || 0).toFixed(2) }}
                <template v-if="arrearsUsdAmountText(billStatus?.arrears_usd_amount)"> / ${{ arrearsUsdAmountText(billStatus?.arrears_usd_amount) }}</template>
              </a-tag>
              <a-tag v-else-if="hasRealSurplus(order)" color="blue" size="small">
                有余款 &yen;{{ Number(billStatus?.arrears_amount || 0).toFixed(2) }}
                <template v-if="arrearsUsdAmountText(billStatus?.arrears_usd_amount)"> / ${{ arrearsUsdAmountText(billStatus?.arrears_usd_amount) }}</template>
              </a-tag>
              <a-tag v-else-if="isPaymentCleared(order)" color="green" size="small">已结清</a-tag>
              <a-tag v-else color="default" size="small">{{ billStatus?.payment_status_label || '无异常' }}</a-tag>
            </div>
            <div v-if="billStatus?.remark" class="debt-view-row">
              <span class="dv-label">商务备注</span>
              <span class="dv-val">{{ billStatus.remark }}</span>
            </div>
            <div class="debt-view-row">
              <span class="dv-label">标记商务</span>
              <span class="dv-val">{{ displayMarkedBusiness || '—' }}</span>
            </div>
          </div>

          <div v-else class="debt-edit">
            <div class="edit-field">
              <label class="edit-label">实际应收（元）</label>
              <a-input-number
                v-model:value="debtForm.actual_receivable_amount"
                style="width:200px"
                :min="0"
                :precision="2"
                placeholder="系统计算值，可编辑"
              />
            </div>
            <div class="edit-field">
              <label class="edit-label">基础入账状态</label>
              <a-radio-group v-model:value="debtForm.basic_bill_status" size="small">
                <a-radio-button v-for="item in BASIC_BILLING_STATUS_OPTIONS" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-radio-button>
              </a-radio-group>
            </div>
            <div class="edit-field">
              <label class="edit-label">账款情况</label>
              <a-radio-group v-model:value="debtForm.payment_status" size="small">
                <a-radio-button :value="1">无异常</a-radio-button>
                <a-radio-button :value="2">有欠款</a-radio-button>
                <a-radio-button :value="3">有余款</a-radio-button>
                <a-radio-button :value="4">已结清</a-radio-button>
              </a-radio-group>
            </div>
            <template v-if="debtForm.payment_status === 2 || debtForm.payment_status === 3">
              <div class="edit-field">
                <label class="edit-label">差价金额（元）</label>
                <a-input-number v-model:value="debtForm.arrears_amount" style="width:200px" :min="0" :precision="2" placeholder="输入差价金额" />
              </div>
              <div class="edit-field">
                <label class="edit-label">欠款金额(美元)</label>
                <a-input v-model:value="debtForm.arrears_usd_amount" style="width:200px" placeholder="欠款金额(美元)" />
              </div>
              <div class="edit-field">
                <label class="edit-label">商务备注</label>
                <a-textarea
                  v-model:value="debtForm.remark"
                  :rows="2"
                  placeholder="如：税费、汇率差等需要业务说明的原因"
                />
              </div>
            </template>
          </div>
        </div>

        <div class="billing-section">
          <div class="section-header">
            <span class="section-title">款项操作</span>
          </div>
          <div class="billing-action-row">
            <a-button type="primary" @click="openAddRecord('补款')">录入补款</a-button>
            <a-button danger @click="openAddRecord('退款')">提交退款</a-button>
            <a-button @click="openAddRecord('账面抵消')">账面抵消</a-button>
          </div>
          <div class="payment-action-hint">款项操作的明细请在交易流水页面查看</div>
        </div>
      </div>
    </template>

    <BillingAddRecordModal
      v-model:open="addRecordOpen"
      v-model:record-type="addRecordType"
      :order="order"
      :saving="addRecordSaving"
      @save="handleAddRecordSave"
    />
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'

import { createReceiveBillRecord, saveReceiveBillStatus } from '../prototypeService'
import { arrearsUsdAmountText, submittedArrearsUsdAmount } from '../billStatusPayload'
import {
  getFirstBill,
  getReceivableCny,
  getSettledAmount,
  hasRealDebt,
  hasRealSurplus,
  isPaymentCleared,
  mapBillRecords,
  sumBillRecordsNet,
} from '../helpers'
import BillingAddRecordModal from './BillingAddRecordModal.vue'
import {
  BASIC_BILLING_STATUS_OPTIONS,
  resolveMarkedBusinessName,
} from './billingFormUtils'

const props = defineProps<{
  open: boolean
  order: any | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated', payload: any): void
}>()

const addRecordOpen = ref(false)
const addRecordType = ref<'补款' | '退款' | '账面抵消'>('补款')
const addRecordSaving = ref(false)

const billStatus = computed(() => getFirstBill(props.order))
const displayMarkedBusiness = computed(() => resolveMarkedBusinessName(props.order))
const billRecords = computed(() => {
  const detail = props.order?.bill_details
  const records = detail?.bill_record
  if (Array.isArray(records)) return mapBillRecords(records, Number(props.order?.exchange_rate || 1))
  return []
})

const baseReceivable = computed(() => {
  const detail = props.order?.bill_details
  const amount = detail?.base_receivable_amount ?? props.order?.base_receivable_amount
  if (amount !== undefined && amount !== null && amount !== '') return Number(amount || 0)
  return getReceivableCny(props.order || {})
})
const actualReceivable = computed(() => {
  const detail = props.order?.bill_details
  const amount = detail?.actual_receivable_amount ?? props.order?.actual_receivable_amount
  if (amount !== undefined && amount !== null && amount !== '') return Number(amount || 0)
  return baseReceivable.value
})
const incomeFlowAmount = computed(() => Number(props.order?.bill_details?.income_flow_amount || 0))
const offsetAmount = computed(() => Number(props.order?.bill_details?.offset_amount || 0))
/**
 * 累计入账：优先取后端算好的 `settled_amount`（文档定义即「累计入账 = 累计实收 + 账面抵消」），
 * 缺省时才用 income_flow_amount + offset_amount 组合。
 * 禁止前端按四国手续费公式重算实际应收；实际应收仅用 actual_receivable_amount
 */
const cumulativeIncome = computed(() => {
  const detail = props.order?.bill_details
  if (detail) {
    const settled = detail.settled_amount
    if (settled !== undefined && settled !== null && settled !== '') return Number(settled || 0)
    return incomeFlowAmount.value + offsetAmount.value
  }
  if (billRecords.value.length) return sumBillRecordsNet(billRecords.value)
  return getSettledAmount(props.order || {})
})

const settlementDiff = computed(() => {
  if (isPaymentCleared(props.order || {})) return 0
  const amount = props.order?.bill_details?.pending_settlement_diff
  if (amount !== undefined && amount !== null && amount !== '') return Number(amount || 0)
  return cumulativeIncome.value - actualReceivable.value
})

const settlementDiffColor = computed(() => {
  if (settlementDiff.value > 0) return '#059669'
  if (settlementDiff.value < 0) return '#dc2626'
  return '#16a34a'
})

const editingDebt = ref(false)
const debtSaving = ref(false)
const debtForm = ref<{
  actual_receivable_amount: number | null
  basic_bill_status: number
  payment_status: number
  arrears_amount: number | null
  arrears_usd_amount: string
  remark: string
  marked_business: string
}>({
  actual_receivable_amount: null,
  basic_bill_status: 1,
  payment_status: 1,
  arrears_amount: null,
  arrears_usd_amount: '',
  remark: '',
  marked_business: '',
})

function toDebtAmount(value: unknown) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount !== 0 ? amount : null
}

function startEditDebt() {
  const bill = billStatus.value
  debtForm.value = {
    actual_receivable_amount: Number.isFinite(actualReceivable.value) ? Number(actualReceivable.value.toFixed(2)) : null,
    basic_bill_status: Number(bill?.basic_bill_status || 1),
    payment_status: Number(bill?.payment_status || 1),
    arrears_amount: toDebtAmount(bill?.arrears_amount),
    arrears_usd_amount: arrearsUsdAmountText(bill?.arrears_usd_amount),
    remark: bill?.remark || '',
    marked_business: resolveMarkedBusinessName(props.order),
  }
  editingDebt.value = true
}

function cancelEditDebt() {
  editingDebt.value = false
}

async function saveDebt() {
  if (!props.order?.id) return
  const actualAmount = debtForm.value.actual_receivable_amount
  if (actualAmount === null || actualAmount === undefined || Number.isNaN(Number(actualAmount))) {
    message.error('请填写实际应收')
    return
  }
  const hasIssue = debtForm.value.payment_status === 2 || debtForm.value.payment_status === 3
  const arrearsUsdAmount = submittedArrearsUsdAmount(debtForm.value.arrears_usd_amount, hasIssue)
  if (hasIssue && arrearsUsdAmount === null) {
    message.error(String(debtForm.value.arrears_usd_amount ?? '').trim() ? '欠款金额(美元)请填写整数' : '请填写欠款金额(美元)')
    return
  }
  if (debtSaving.value) return
  debtSaving.value = true
  try {
    const markedBusiness = resolveMarkedBusinessName(props.order)
    const response = await saveReceiveBillStatus({
      task_id: Number(props.order.id),
      actual_receivable_amount: String(Number(actualAmount).toFixed(2)),
      basic_bill_status: Number(debtForm.value.basic_bill_status),
      payment_status: Number(debtForm.value.payment_status),
      arrears_amount: hasIssue ? String(debtForm.value.arrears_amount ?? '') : '0',
      arrears_usd_amount: arrearsUsdAmount ?? 0,
      remark: hasIssue ? debtForm.value.remark : '',
      marked_business: hasIssue ? markedBusiness : '',
    })
    if (response.code !== 200) throw new Error(response.msg || response.message || '保存失败')
    message.success('账款状态已保存')
    editingDebt.value = false
    emit('updated', { id: props.order.id })
  } catch (error: any) {
    message.error(error?.message || '保存失败')
  } finally {
    debtSaving.value = false
  }
}

function openAddRecord(type: '补款' | '退款' | '账面抵消') {
  addRecordType.value = type
  addRecordOpen.value = true
}

async function handleAddRecordSave(payload: { record: any; debtUpdate?: any }) {
  if (addRecordSaving.value) return
  addRecordSaving.value = true
  try {
    const response = await createReceiveBillRecord(payload.record)
    if (response.code !== 200) throw new Error(response.msg || response.message || '保存账单记录失败')

    if (payload.debtUpdate) {
      const bill = billStatus.value
      const debtResponse = await saveReceiveBillStatus({
        task_id: payload.debtUpdate.task_id,
        actual_receivable_amount: String(Number(actualReceivable.value || 0).toFixed(2)),
        basic_bill_status: Number(bill?.basic_bill_status || 1),
        payment_status: Number(payload.debtUpdate.payment_status),
        arrears_amount: String(payload.debtUpdate.arrears_amount ?? '0'),
        arrears_usd_amount: payload.debtUpdate.arrears_usd_amount != null
          ? Number(payload.debtUpdate.arrears_usd_amount)
          : (submittedArrearsUsdAmount(
            bill?.arrears_usd_amount,
            Number(payload.debtUpdate.payment_status) === 2 || Number(payload.debtUpdate.payment_status) === 3,
          ) ?? 0),
        remark: bill?.remark || '',
        marked_business: resolveMarkedBusinessName(props.order),
      })
      if (debtResponse.code !== 200) throw new Error(debtResponse.msg || debtResponse.message || '保存失败')
    }

    const billType = Number(payload.record.bill_type)
    const label = billType === 2 ? '退款已提交，流水待审批' : billType === 3 ? '账面抵消已记录' : '补款已记录'
    message.success(label)
    addRecordOpen.value = false
    emit('updated', { id: props.order!.id })
  } catch (error: any) {
    message.error(error?.message || '保存账单记录失败')
  } finally {
    addRecordSaving.value = false
  }
}

watch(() => props.open, (val) => {
  if (val) cancelEditDebt()
})
</script>

<style scoped>
.billing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  background: var(--eva-bg-container, #fff);
  border-bottom: 1px solid var(--eva-border-light, #f0f0f0);
  gap: 16px;
}

.billing-header-left { min-width: 0; }
.billing-order-num { font-size: 15px; font-weight: 700; color: var(--eva-text, #1a1a2e); font-family: 'Courier New', monospace; }
.billing-order-meta { font-size: 14px; color: var(--eva-text-secondary, #6b7280); margin-top: 3px; display: flex; align-items: center; gap: 4px; }
.meta-sep { color: var(--eva-text-tertiary, #d1d5db); }
.meta-asin { color: var(--eva-link, #2563eb); font-family: monospace; }
.billing-summary-trio { display: flex; align-items: center; background: var(--eva-bg-soft, #f8f9fb); border: 1px solid var(--eva-border, #e5e7eb); border-radius: 10px; padding: 8px 16px; gap: 12px; }
.trio-item { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 70px; }
.trio-label { font-size: 11px; color: var(--eva-text-tertiary, #9ca3af); }
.trio-val { font-size: 15px; font-weight: 700; color: var(--eva-text, #1a1a2e); }
.trio-expect { color: var(--eva-text, #374151); }
.trio-divider { width: 1px; height: 32px; background: var(--eva-border, #e5e7eb); }
.billing-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.billing-section { background: var(--eva-bg-container, #fff); border-radius: 10px; border: 1px solid var(--eva-border-light, #f0f0f0); padding: 16px 20px; }
.section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.section-title { font-size: 14px; font-weight: 600; color: var(--eva-text, #1a1a2e); flex: 1; }
.section-actions { display: flex; gap: 6px; }
.section-hint { margin-left: auto; font-size: 14px; color: var(--eva-text-tertiary, #9ca3af); font-weight: 400; }
.debt-view-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--eva-bg-soft, #f9fafb); }
.debt-view-row:last-child { border-bottom: none; }
.dv-label { font-size: 14px; line-height: 22px; color: var(--eva-text-secondary, #6b7280); flex: 0 0 96px; }
.dv-val { font-size: 14px; line-height: 22px; color: var(--eva-text, #374151); }
.debt-edit { display: flex; flex-direction: column; gap: 12px; }
.edit-field { display: flex; flex-direction: column; gap: 6px; }
.edit-label { font-size: 14px; color: var(--eva-text-secondary, #6b7280); font-weight: 500; }
.billing-action-row { display: flex; gap: 10px; align-items: center; padding-top: 2px; flex-wrap: wrap; }
.payment-action-hint { font-size: 14px; color: var(--eva-text-tertiary, #9ca3af); margin-top: 8px; }
</style>
