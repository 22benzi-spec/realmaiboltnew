<template>
  <a-drawer
    :open="open"
    :title="detail?.sub_order_number ? `操作详情 - ${detail.sub_order_number}` : '操作详情'"
    width="940"
    placement="right"
    destroy-on-close
    @close="emit('update:open', false)"
  >
    <a-spin :spinning="loading">
      <template v-if="detail">
        <div class="hero-card">
          <div class="hero-top">
            <div class="hero-title-wrap">
              <div class="hero-sub-no">{{ detail.sub_order_number || '—' }}</div>
              <div class="hero-order-no">{{ detail._order_number || detail.order_id || '—' }}</div>
            </div>
            <div class="hero-tags">
              <a-tag color="blue">{{ detail.status || '—' }}</a-tag>
              <a-tag v-if="detail.country">{{ detail.country }}</a-tag>
              <a-tag v-if="detail.order_type">{{ detail.order_type }}</a-tag>
            </div>
          </div>
          <div class="hero-main-grid">
            <div class="hero-item"><span class="hero-label">产品</span><span class="hero-val">{{ detail.product_name || '—' }}</span></div>
            <div class="hero-item"><span class="hero-label">ASIN</span><span class="hero-val mono">{{ detail.asin || '—' }}</span></div>
            <div class="hero-item"><span class="hero-label">店铺</span><span class="hero-val">{{ detail.store_name || '—' }}</span></div>
            <div class="hero-item"><span class="hero-label">品牌</span><span class="hero-val">{{ detail.brand_name || '—' }}</span></div>
            <div class="hero-item"><span class="hero-label">售价</span><span class="hero-val hero-price">${{ money(detail.product_price) }}</span></div>
            <div class="hero-item"><span class="hero-label">类目</span><span class="hero-val">{{ detail.category || '—' }}</span></div>
            <div class="hero-item"><span class="hero-label">客户</span><span class="hero-val">{{ detail.customer_name || '—' }}</span></div>
            <div class="hero-item"><span class="hero-label">商务</span><span class="hero-val">{{ detail.sales_person || '—' }}</span></div>
          </div>
          <div class="hero-sub-grid">
            <div class="hero-item"><span class="hero-label">测评等级</span><span class="hero-val">{{ detail.review_level || '—' }}</span></div>
            <div class="hero-item"><span class="hero-label">变体/变参</span><span class="hero-val">{{ detail.variant_info || '—' }}</span></div>
            <div class="hero-item"><span class="hero-label">任务备注</span><span class="hero-val">{{ detail.task_notes || '—' }}</span></div>
            <div class="hero-item"><span class="hero-label">订单备注</span><span class="hero-val">{{ detail.notes || '—' }}</span></div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">执行人员</div>
          <div class="detail-grid">
            <div class="detail-item"><label>业务员</label><span>{{ detail.staff_name || '—' }}</span></div>
            <div class="detail-item"><label>买手</label><span>{{ detail.buyer_name || '—' }}</span></div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">操作时间</div>
          <div class="detail-grid">
            <div class="detail-item"><label>买手接单时间</label><span>{{ fmtTime(detail.buyer_assigned_at) }}</span></div>
            <div class="detail-item"><label>首次返款完成时间</label><span>{{ fmtTime(firstRefundCompletedTime()) }}</span></div>
            <div class="detail-item"><label>上传订单号时间</label><span>{{ fmtTime(detail.amazon_order_placed_at) }}</span></div>
            <div class="detail-item"><label>留评提交时间</label><span>{{ fmtTime(detail.review_submitted_at) }}</span></div>
            <div class="detail-item"><label>返款申请发起时间</label><span>{{ fmtTime(firstRefundRequestTime()) }}</span></div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">状态变更记录</div>
          <div v-if="statusTimeline.length" class="drawer-timeline">
            <div
              v-for="item in statusTimeline"
              :key="item.key"
              class="drawer-timeline-item"
            >
              <div class="drawer-timeline-axis">
                <span class="drawer-timeline-dot"></span>
                <span class="drawer-timeline-line"></span>
              </div>
              <div class="drawer-timeline-content">
                <div class="drawer-timeline-title">
                  <template v-if="item.kind === 'created'">
                    创建子订单
                  </template>
                  <template v-else>
                    状态由「{{ item.from_status || '初始状态' }}」变更为「{{ item.to_status || '未知状态' }}」
                  </template>
                </div>
                <div class="drawer-timeline-meta">
                  <span>{{ fmtTime(item.changed_at) }}</span>
                  <span v-if="item.reason">原因：{{ item.reason }}</span>
                </div>
              </div>
            </div>
          </div>
          <a-empty v-else description="暂无状态变更记录" />
        </div>

        <div class="detail-section">
          <div class="detail-section-title">修改记录</div>
          <div v-if="editHistory.length" class="drawer-timeline">
            <div
              v-for="item in editHistory"
              :key="item.key"
              class="drawer-timeline-item"
            >
              <div class="drawer-timeline-axis">
                <span class="drawer-timeline-dot edit"></span>
                <span class="drawer-timeline-line"></span>
              </div>
              <div class="drawer-timeline-content">
                <div class="drawer-timeline-title">
                  {{ item.staff_name || '系统' }}修改了 {{ item.changes.length }} 项信息
                </div>
                <div class="drawer-timeline-meta">
                  <span>{{ fmtTime(item.changed_at) }}</span>
                </div>
                <ul class="drawer-edit-list">
                  <li v-for="(change, index) in item.changes" :key="`${item.key}-${index}`">
                    {{ formatEdit(change) }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <a-empty v-else description="暂无修改记录" />
        </div>

        <div class="detail-section">
          <div class="detail-section-title">返款信息</div>
          <div class="detail-grid">
            <div class="detail-item"><label>当前返款方式</label><span>{{ detail.refund_method || '—' }}</span></div>
            <div class="detail-item"><label>返款节点</label><span>{{ detail.refund_sequence || '—' }}</span></div>
            <div class="detail-item"><label>当前返款状态</label><span>{{ refundStatusLabel(detail.refund_status) || '—' }}</span></div>
            <div class="detail-item"><label>子订单返款金额</label><span class="amount-strong">${{ money(detail.refund_amount) }}</span></div>
            <div class="detail-item"><label>返款申请次数</label><span>{{ refundRequests.length }}</span></div>
            <div class="detail-item"><label>累计已返款</label><span class="amount-strong">${{ money(totalProcessedRefund()) }}</span></div>
          </div>
          <div v-if="refundRequests.length" class="request-list">
            <div v-for="(req, idx) in refundRequests" :key="req.id" class="request-card">
              <div class="request-head">
                <a-space size="small" wrap>
                  <span class="request-index">第 {{ idx + 1 }} 次{{ typeLabel(req) ? `${typeLabel(req)}返款` : '返款申请' }}</span>
                  <a-tag :color="req.status === '已处理' ? 'green' : req.status === '待处理' ? 'orange' : 'default'">{{ requestStatusLabel(req.status) }}</a-tag>
                  <a-tag :color="req.refund_method === '礼品卡' ? 'gold' : 'blue'">{{ req.refund_method || '—' }}</a-tag>
                  <span v-if="req.supplement_reason" class="reason-text">{{ req.supplement_reason }}</span>
                </a-space>
                <span class="time-text">{{ fmtTime(req.updated_at || req.created_at) }}</span>
              </div>
              <div class="detail-grid inner">
                <div class="detail-item"><label>申请时间</label><span>{{ fmtTime(req.created_at) }}</span></div>
                <div class="detail-item"><label>处理时间</label><span>{{ fmtTime(req.handled_at || req.updated_at) }}</span></div>
                <div class="detail-item"><label>实付金额</label><span>${{ money(actualPaid(req)) }}</span></div>
                <div class="detail-item"><label>贝宝手续费</label><span>${{ money(req.paypal_fee_usd) }}</span></div>
                <div class="detail-item"><label>本笔合计返款</label><span class="amount-strong">${{ money(req.refund_amount_usd) }}</span></div>
                <div class="detail-item"><label>累计返款</label><span class="amount-strong">${{ money(cumulativeRefund(idx)) }}</span></div>
                <div class="detail-item"><label>收款账号/卡</label><span class="mono">{{ req.buyer_paypal_email || req.assigned_gift_card_number || '—' }}</span></div>
                <div class="detail-item"><label>返款节点</label><span>{{ req.refund_sequence || '—' }}</span></div>
                <div v-if="req.assigned_gift_card_code" class="detail-item"><label>礼品卡密钥</label><span class="mono">{{ req.assigned_gift_card_code }}</span></div>
                <div v-if="req.gift_card_face_value_usd" class="detail-item"><label>礼品卡面额</label><span>${{ money(req.gift_card_face_value_usd) }}</span></div>
                <div v-if="req.notes" class="detail-item full"><label>业务员备注</label><span>{{ req.notes }}</span></div>
                <div v-if="req.finance_notes" class="detail-item full"><label>财务备注</label><span>{{ req.finance_notes }}</span></div>
                <div v-if="req.paypal_receipt_screenshot" class="detail-item full">
                  <label>水单</label>
                  <a :href="req.paypal_receipt_screenshot" target="_blank" rel="noopener noreferrer">查看水单</a>
                </div>
              </div>
              <div v-if="Array.isArray(req.staff_change_log) && req.staff_change_log.length" class="audit-box">
                <div class="audit-title">业务员修改留痕</div>
                <div v-for="(entry, idx) in req.staff_change_log" :key="idx" class="audit-entry">
                  <div class="audit-meta">{{ fmtTime(entry.at) }} · {{ entry.staff_name || '业务员' }}</div>
                  <ul class="audit-list">
                    <li v-for="(edit, eidx) in (entry.edits || [])" :key="eidx">{{ formatAudit(edit) }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <a-empty v-else description="暂无返款申请流水" />
        </div>
      </template>

      <a-empty v-else description="暂无子订单详情" />
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const props = defineProps<{
  open: boolean
  subOrderId?: string | null
  fallbackDetail?: any | null
}>()

const emit = defineEmits<{
  'update:open': [boolean]
}>()

const loading = ref(false)
const detail = ref<any>(null)
const refundRequests = ref<any[]>([])

const statusTimeline = ref<any[]>([])
const editHistory = ref<any[]>([])

watch(() => props.open, async (val) => {
  if (val) await load()
})

async function load() {
  if (!props.subOrderId && !props.fallbackDetail) {
    detail.value = null
    refundRequests.value = []
    statusTimeline.value = []
    editHistory.value = []
    return
  }
  loading.value = true
  try {
    if (props.fallbackDetail?._is_mock || props.fallbackDetail?._is_preview_mock) {
      detail.value = props.fallbackDetail
      refundRequests.value = props.fallbackDetail._refund_requests_list
        || props.fallbackDetail.__mock_refund_requests
        || (props.fallbackDetail.__mock_refund_request ? [props.fallbackDetail.__mock_refund_request] : [])
      hydrateHistory(detail.value)
      return
    }

    const [{ data: sub }, { data: reqs }] = await Promise.all([
      supabase.from('sub_orders').select('*').eq('id', props.subOrderId).maybeSingle(),
      supabase.from('refund_requests').select('*').eq('sub_order_id', props.subOrderId).order('created_at', { ascending: true }),
    ])

    if (sub?.order_id) {
      const { data: order } = await supabase
        .from('erp_orders')
        .select('order_number, sales_person, customer_name, notes')
        .eq('id', sub.order_id)
        .maybeSingle()
      detail.value = {
        ...sub,
        _order_number: order?.order_number || '',
        sales_person: sub.sales_person || order?.sales_person || '',
        customer_name: sub.customer_name || order?.customer_name || '',
        notes: sub.notes || order?.notes || '',
      }
    } else {
      detail.value = sub || props.fallbackDetail || null
    }
    refundRequests.value = reqs || []
    hydrateHistory(detail.value)
  } finally {
    loading.value = false
  }
}

function hydrateHistory(record: any) {
  statusTimeline.value = getSubStatusTimeline(record)
  editHistory.value = getSubEditHistory(record)
}

function money(val: any) {
  return Number(val || 0).toFixed(2)
}

function fmtTime(val: string) {
  return val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '—'
}

function actualPaid(req: any) {
  const stored = Number(req.actual_paid_usd || 0)
  if (stored > 0) return stored
  return Math.max(0, Number(req.refund_amount_usd || 0) - Number(req.paypal_fee_usd || 0))
}

function firstRefundCompletedTime() {
  if (detail.value?.refund_date) return detail.value.refund_date
  const processed = refundRequests.value.find((r: any) => r.status === '已处理')
  return processed?.handled_at || processed?.updated_at || ''
}

function firstRefundRequestTime() {
  return refundRequests.value[0]?.created_at || ''
}

function totalProcessedRefund() {
  return refundRequests.value
    .filter((r: any) => r.status === '已处理')
    .reduce((sum: number, r: any) => sum + Number(r.refund_amount_usd || 0), 0)
}

function cumulativeRefund(index: number) {
  return refundRequests.value
    .slice(0, index + 1)
    .filter((r: any) => r.status === '已处理')
    .reduce((sum: number, r: any) => sum + Number(r.refund_amount_usd || 0), 0)
}

function typeLabel(req: any) {
  if (req.request_type === 'supplement') return '追加'
  if (req.request_type === 'correction') return '更正'
  if (req.request_type === 'initial') return '首笔'
  return ''
}

function refundStatusLabel(status: string) {
  const map: Record<string, string> = {
    '待退款': '待返款',
    '退款中': '返款中',
    '已退款': '已返款',
    '退款失败': '返款失败',
    '未返款': '未返款',
    '返款中': '返款中',
    '已返款': '已返款',
    'On Hold': 'On Hold',
    '返款失败': '返款失败',
    '失误多返': '失误多返',
  }
  return map[status] || status || ''
}

function requestStatusLabel(status: string) {
  if (status === '已处理') return '已完成'
  return status || '—'
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

function getSubStatusTimeline(record: any) {
  const history = Array.isArray(record?.status_change_log)
    ? record.status_change_log.map((item: any, index: number) => ({
      key: `${record.id || record.order_id}-status-${index}-${item?.changed_at || 'unknown'}`,
      kind: 'status',
      from_status: String(item?.from_status || ''),
      to_status: String(item?.to_status || ''),
      reason: String(item?.reason || ''),
      changed_at: item?.changed_at || null,
    }))
    : []

  const createdEntry = record?.created_at
    ? [{
      key: `${record.id || record.order_id}-created`,
      kind: 'created',
      from_status: '',
      to_status: '',
      reason: '',
      changed_at: record.created_at,
    }]
    : []

  return [...history, ...createdEntry].sort((a, b) => {
    const left = a.changed_at ? dayjs(a.changed_at).valueOf() : 0
    const right = b.changed_at ? dayjs(b.changed_at).valueOf() : 0
    return left - right
  })
}

function getSubEditHistory(record: any) {
  const baseHistory = Array.isArray(record?.edit_change_log)
    ? record.edit_change_log
    : Array.isArray(record?.change_log)
      ? record.change_log
      : Array.isArray(record?._edit_change_log)
        ? record._edit_change_log
        : []

  const normalized = baseHistory.map((entry: any, index: number) => ({
    key: `${record.id || record.order_id}-edit-${index}-${entry?.changed_at || entry?.at || 'unknown'}`,
    changed_at: entry?.changed_at || entry?.at || null,
    staff_name: entry?.staff_name || entry?.operator || '系统',
    changes: Array.isArray(entry?.changes)
      ? entry.changes
      : Array.isArray(entry?.edits)
        ? entry.edits
        : [],
  })).filter((entry: any) => entry.changes.length > 0)

  if (normalized.length > 0) return normalized

  const synthetic: any[] = []
  const syntheticKeyBase = record?.id || record?.order_id || 'sub'
  if (record?.buyer_assigned_at && (record?.buyer_name || record?.staff_name)) {
    synthetic.push({
      key: `${syntheticKeyBase}-synthetic-buyer`,
      changed_at: record.buyer_assigned_at,
      staff_name: record.sales_person || record.staff_name || '系统',
      changes: [
        {
          field: 'buyer_name',
          from: '空',
          to: record.buyer_name || '已匹配买手',
        },
      ],
    })
  }
  if (record?.amazon_order_placed_at && record?.amazon_order_id) {
    synthetic.push({
      key: `${syntheticKeyBase}-synthetic-amazon`,
      changed_at: record.amazon_order_placed_at,
      staff_name: record.buyer_name || record.staff_name || '系统',
      changes: [
        {
          field: 'amazon_order_id',
          from: '空',
          to: record.amazon_order_id,
        },
      ],
    })
  }
  if (record?.review_submitted_at && (record?.review_screenshot_url || record?.review_link || record?.fb_link)) {
    synthetic.push({
      key: `${syntheticKeyBase}-synthetic-proof`,
      changed_at: record.review_submitted_at,
      staff_name: record.buyer_name || record.staff_name || '系统',
      changes: [
        {
          field: 'review_screenshot_url',
          from: '空',
          to: '已上传凭证',
        },
      ],
    })
  }
  return synthetic.sort((a, b) => {
    const left = a.changed_at ? dayjs(a.changed_at).valueOf() : 0
    const right = b.changed_at ? dayjs(b.changed_at).valueOf() : 0
    return left - right
  })
}

function formatEdit(change: any) {
  const labels: Record<string, string> = {
    buyer_name: '匹配买手',
    buyer_id: '买手绑定',
    buyer_chat_id: '聊单号',
    staff_name: '业务员',
    amazon_order_id: 'Amazon订单号',
    review_screenshot_url: '留评凭证',
    review_link: '评论链接',
    notes: '订单备注',
    refund_method: '返款方式',
    refund_status: '返款状态',
  }
  const field = change?.field || '字段'
  const fromVal = String(change?.from ?? '空')
  const toVal = String(change?.to ?? '空')

  if ((field === 'buyer_name' || field === 'buyer_id') && (toVal === '空' || toVal === '')) {
    return `解绑了买手（原买手：${fromVal || '空'}）`
  }
  if (field === 'buyer_name' || field === 'buyer_id') {
    return `匹配买手：${fromVal || '空'} -> ${toVal || '空'}`
  }
  if (field === 'amazon_order_id') {
    return `上传了订单号：${fromVal} -> ${toVal}`
  }
  if (field === 'review_screenshot_url' || field === 'review_link') {
    return `上传了留评凭证：${fromVal} -> ${toVal}`
  }
  return `${labels[field] || field}：${fromVal} -> ${toVal}`
}
</script>

<style scoped>
.hero-card {
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}
.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}
.hero-title-wrap { display: flex; flex-direction: column; gap: 4px; }
.hero-sub-no { font-size: 18px; font-weight: 700; color: #1a1a2e; }
.hero-order-no { font-size: 12px; color: #2563eb; font-family: ui-monospace, monospace; }
.hero-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.hero-main-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px 14px;
  margin-bottom: 12px;
}
.hero-sub-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}
.hero-item { display: flex; align-items: center; gap: 8px; min-width: 0; }
.hero-label { font-size: 12px; color: #6b7280; white-space: nowrap; }
.hero-val { color: #1f2937; font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hero-price { color: #059669; font-weight: 700; }
.detail-section { margin-bottom: 20px; }
.detail-section-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f0f0f0; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.detail-grid.inner { padding: 12px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item.full { grid-column: 1 / -1; }
.detail-item label { font-size: 12px; color: #6b7280; }
.detail-item span { color: #1f2937; }
.detail-item a { color: #2563eb; }
.mono { font-family: ui-monospace, monospace; }
.amount-strong { color: #2563eb; font-weight: 700; }
.drawer-timeline { display: flex; flex-direction: column; gap: 0; }
.drawer-timeline-item { display: flex; gap: 12px; }
.drawer-timeline-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 18px;
  flex-shrink: 0;
}
.drawer-timeline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2563eb;
  margin-top: 6px;
}
.drawer-timeline-dot.edit { background: #7c3aed; }
.drawer-timeline-line {
  width: 1px;
  flex: 1;
  background: #e5e7eb;
  margin-top: 6px;
}
.drawer-timeline-content {
  flex: 1;
  padding-bottom: 14px;
}
.drawer-timeline-title {
  font-size: 13px;
  color: #1a1a2e;
  font-weight: 600;
}
.drawer-timeline-meta {
  margin-top: 4px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: #6b7280;
}
.drawer-edit-list {
  margin: 8px 0 0;
  padding-left: 18px;
  color: #374151;
  font-size: 12px;
}
.drawer-edit-list li + li { margin-top: 4px; }
.request-list { display: flex; flex-direction: column; gap: 12px; }
.request-card { border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; overflow: hidden; }
.request-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 12px; background: #f8fafc; border-bottom: 1px solid #f0f0f0; }
.request-index { font-size: 12px; font-weight: 700; color: #1a1a2e; }
.time-text { font-size: 11px; color: #9ca3af; }
.reason-text { font-size: 12px; color: #7c3aed; }
.audit-box { margin: 0 12px 12px; padding: 10px 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; }
.audit-title { font-size: 12px; font-weight: 700; color: #b45309; margin-bottom: 6px; }
.audit-meta { font-size: 11px; color: #6b7280; }
.audit-list { margin: 4px 0 0 18px; padding: 0; color: #374151; }

@media (max-width: 900px) {
  .hero-main-grid,
  .hero-sub-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
