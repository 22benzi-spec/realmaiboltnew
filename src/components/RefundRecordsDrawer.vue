<template>
  <a-drawer
    :open="open"
    :title="titleText"
    width="860"
    placement="right"
    destroy-on-close
    @close="emit('update:open', false)"
  >
    <a-spin :spinning="loading">
      <template v-if="groupedRecords.length">
        <div v-for="group in groupedRecords" :key="group.key" class="detail-section">
          <div class="detail-section-title">
            {{ group.label }}
            <span class="section-summary">共 {{ group.records.length }} 笔</span>
          </div>
          <div class="request-list">
            <div v-for="record in group.records" :key="record.id" class="request-card">
              <div class="request-head">
                <a-space size="small" wrap>
                  <a-tag :color="record.refund_method === '礼品卡' ? 'gold' : 'blue'">{{ record.refund_method || '—' }}</a-tag>
                  <a-tag :color="record.status === '已处理' ? 'green' : record.status === '待处理' ? 'orange' : 'default'">{{ record.status || '—' }}</a-tag>
                  <a-tag v-if="typeLabel(record)" color="purple">{{ typeLabel(record) }}</a-tag>
                  <span v-if="record.supplement_reason" class="reason-text">{{ record.supplement_reason }}</span>
                </a-space>
                <span class="time-text">{{ fmtTime(record.updated_at || record.created_at) }}</span>
              </div>

              <div class="detail-grid">
                <template v-if="record.refund_method === 'PayPal'">
                  <div class="detail-item">
                    <label>实付金额</label>
                    <span>${{ money(actualPaid(record)) }}</span>
                  </div>
                  <div class="detail-item">
                    <label>贝宝手续费</label>
                    <span>${{ money(record.paypal_fee_usd) }}</span>
                  </div>
                  <div class="detail-item">
                    <label>本笔合计</label>
                    <span class="amount-strong">${{ money(record.refund_amount_usd) }}</span>
                  </div>
                  <div class="detail-item">
                    <label>收款 PayPal</label>
                    <span class="mono">{{ record.buyer_paypal_email || '—' }}</span>
                  </div>
                </template>
                <template v-else>
                  <div class="detail-item">
                    <label>实付金额</label>
                    <span>${{ money(record.actual_paid_usd || record.product_price) }}</span>
                  </div>
                  <div class="detail-item">
                    <label>礼品卡面额</label>
                    <span class="amount-strong">${{ money(record.gift_card_face_value_usd || record.refund_amount_usd) }}</span>
                  </div>
                  <div class="detail-item">
                    <label>卡号</label>
                    <span class="mono">{{ record.assigned_gift_card_number || '—' }}</span>
                  </div>
                  <div class="detail-item">
                    <label>Code</label>
                    <span class="mono">{{ record.assigned_gift_card_code || '—' }}</span>
                  </div>
                </template>
                <div class="detail-item">
                  <label>返款节点</label>
                  <span>{{ record.refund_sequence || '—' }}</span>
                </div>
                <div class="detail-item">
                  <label>申请时间</label>
                  <span>{{ fmtTime(record.created_at) }}</span>
                </div>
                <div v-if="record.notes" class="detail-item full">
                  <label>业务员备注</label>
                  <span>{{ record.notes }}</span>
                </div>
                <div v-if="record.finance_notes" class="detail-item full">
                  <label>财务备注</label>
                  <span>{{ record.finance_notes }}</span>
                </div>
              </div>

              <div v-if="Array.isArray(record.staff_change_log) && record.staff_change_log.length" class="audit-box">
                <div class="audit-title">业务员修改留痕</div>
                <div v-for="(entry, index) in record.staff_change_log" :key="index" class="audit-entry">
                  <div class="audit-meta">{{ fmtTime(entry.at) }} · {{ entry.staff_name || '业务员' }}</div>
                  <ul class="audit-list">
                    <li v-for="(edit, eidx) in (entry.edits || [])" :key="eidx">{{ formatAudit(edit) }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section total-box">
          <div class="detail-section-title">累计返款</div>
          <div class="detail-grid">
            <div class="detail-item">
              <label>PayPal 实付累计</label>
              <span>${{ money(summary.paypalActual) }}</span>
            </div>
            <div class="detail-item">
              <label>PayPal 手续费累计</label>
              <span>${{ money(summary.paypalFee) }}</span>
            </div>
            <div class="detail-item">
              <label>PayPal 打款累计</label>
              <span class="amount-strong">${{ money(summary.paypalTotal) }}</span>
            </div>
            <div class="detail-item">
              <label>礼品卡面额累计</label>
              <span class="amount-strong">${{ money(summary.giftTotal) }}</span>
            </div>
          </div>
        </div>
      </template>

      <a-empty v-else description="暂无返款流水" />
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const props = defineProps<{
  open: boolean
  subOrderId?: string | null
  orderId?: string | null
  title?: string
}>()

const emit = defineEmits<{
  'update:open': [boolean]
}>()

const loading = ref(false)
const records = ref<any[]>([])

const titleText = computed(() => props.title || '返款详情')

watch(() => props.open, async (val) => {
  if (val) await load()
})

async function load() {
  if (!props.subOrderId && !props.orderId) {
    records.value = []
    return
  }
  loading.value = true
  try {
    let query = supabase.from('refund_requests').select('*').order('created_at', { ascending: true })
    if (props.subOrderId) query = query.eq('sub_order_id', props.subOrderId)
    if (props.orderId) query = query.eq('order_id', props.orderId)
    const { data } = await query
    records.value = data || []
  } finally {
    loading.value = false
  }
}

const groupedRecords = computed(() => {
  const map: Record<string, any[]> = {}
  for (const row of records.value) {
    const key = row.sub_order_id || row.sub_order_number || 'unknown'
    if (!map[key]) map[key] = []
    map[key].push(row)
  }
  return Object.entries(map).map(([key, list]) => ({
    key,
    label: list[0]?.sub_order_number ? `子订单 ${list[0].sub_order_number}` : '返款流水',
    records: list,
  }))
})

const summary = computed(() => {
  let paypalActual = 0
  let paypalFee = 0
  let paypalTotal = 0
  let giftTotal = 0
  for (const row of records.value.filter((r) => r.status === '已处理')) {
    if (row.refund_method === 'PayPal') {
      paypalActual += actualPaid(row)
      paypalFee += Number(row.paypal_fee_usd || 0)
      paypalTotal += Number(row.refund_amount_usd || 0)
    } else if (row.refund_method === '礼品卡') {
      giftTotal += Number(row.gift_card_face_value_usd || row.refund_amount_usd || 0)
    }
  }
  return { paypalActual, paypalFee, paypalTotal, giftTotal }
})

function actualPaid(row: any) {
  const stored = Number(row.actual_paid_usd || 0)
  if (stored > 0) return stored
  return Math.max(0, Number(row.refund_amount_usd || 0) - Number(row.paypal_fee_usd || 0))
}

function money(val: any) {
  return Number(val || 0).toFixed(2)
}

function fmtTime(val: string) {
  return val ? dayjs(val).format('MM-DD HH:mm') : '—'
}

function typeLabel(row: any) {
  if (row.request_type === 'supplement') return '追加'
  if (row.request_type === 'correction') return '更正'
  return row.request_type === 'initial' ? '首笔' : ''
}

function formatAudit(edit: any) {
  const labels: Record<string, string> = {
    buyer_paypal_email: '买手 PayPal 邮箱',
    actual_paid_usd: '实付金额',
    paypal_fee_usd: '贝宝手续费',
    refund_amount_usd: '合计返款',
    refund_method: '返款方式',
    refund_sequence: '返款节点',
  }
  return `${labels[edit.field] || edit.field}: ${String(edit.from ?? '空')} -> ${String(edit.to ?? '空')}`
}
</script>

<style scoped>
.detail-section { margin-bottom: 18px; }
.detail-section-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f0f0f0; }
.section-summary { margin-left: 8px; font-size: 12px; color: #6b7280; font-weight: 500; }
.request-list { display: flex; flex-direction: column; gap: 12px; }
.request-card { border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; overflow: hidden; }
.request-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 12px; background: #f8fafc; border-bottom: 1px solid #f0f0f0; }
.time-text { font-size: 11px; color: #9ca3af; }
.reason-text { font-size: 12px; color: #7c3aed; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 12px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item.full { grid-column: 1 / -1; }
.detail-item label { font-size: 12px; color: #6b7280; }
.detail-item span { color: #1f2937; }
.amount-strong { color: #2563eb; font-weight: 700; }
.mono { font-family: ui-monospace, monospace; }
.audit-box { margin: 0 12px 12px; padding: 10px 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; }
.audit-title { font-size: 12px; font-weight: 700; color: #b45309; margin-bottom: 6px; }
.audit-entry + .audit-entry { margin-top: 8px; }
.audit-meta { font-size: 11px; color: #6b7280; }
.audit-list { margin: 4px 0 0 18px; padding: 0; color: #374151; }
.total-box { border: 1px solid #bfdbfe; border-radius: 10px; background: #eff6ff; padding: 12px; }
</style>
