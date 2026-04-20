<template>
  <a-modal
    :open="open"
    title="返款编辑"
    width="720px"
    destroy-on-close
    ok-text="保存返款申请"
    cancel-text="取消"
    :confirm-loading="saving"
    @ok="submit"
    @cancel="emit('update:open', false)"
  >
    <template v-if="subOrder">
      <div class="panel">
        <div class="panel-title">子订单信息</div>
        <div class="info-grid">
          <div><span class="lbl">子单号</span><strong>{{ subOrder.sub_order_number }}</strong></div>
          <div><span class="lbl">产品</span><strong>{{ subOrder.product_name || '-' }}</strong></div>
          <div><span class="lbl">买手</span><strong>{{ subOrder.buyer_name || '-' }}</strong></div>
          <div><span class="lbl">产品标价</span><strong>${{ money(subOrder.product_price) }}</strong></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">编辑动作</div>
        <a-radio-group v-model:value="mode" size="small">
          <a-radio-button value="initial" :disabled="!!pendingRequest || processedRequests.length > 0">首笔申请</a-radio-button>
          <a-radio-button value="pending_update" :disabled="!pendingRequest">修改待审核申请</a-radio-button>
          <a-radio-button value="supplement" :disabled="processedRequests.length === 0">追加返款</a-radio-button>
          <a-radio-button value="correction" :disabled="!canCorrectionResubmit">更正重提</a-radio-button>
        </a-radio-group>
        <div v-if="processedRequests.length > 0 && !canCorrectionResubmit" class="mode-hint">
          只有返款状态改为“返款失败”后，业务员才可重新提交返款申请。
        </div>
      </div>

      <div v-if="pendingRequest && mode === 'pending_update'" class="audit-tip">
        <div class="audit-title">当前待审核申请</div>
        <div>方式：{{ pendingRequest.refund_method || '—' }}，金额：${{ money(pendingRequest.refund_amount_usd) }}</div>
        <div v-if="(pendingRequest.staff_change_log || []).length" class="audit-count">已记录 {{ pendingRequest.staff_change_log.length }} 次业务员修改</div>
      </div>

      <a-form layout="vertical">
        <a-form-item label="返款节点">
          <a-radio-group v-model:value="form.refund_sequence" size="small">
            <a-radio value="预付">预付</a-radio>
            <a-radio value="出单后返">出单后返</a-radio>
            <a-radio value="收货后返">收货后返</a-radio>
            <a-radio value="评后返">评后返</a-radio>
            <a-radio value="无需返款">无需返款</a-radio>
          </a-radio-group>
        </a-form-item>

        <div v-if="noRefundSelected" class="mode-hint">
          选择“无需返款”后，保存将直接标记为无需退款，不生成返款申请。
        </div>

        <a-form-item v-if="!noRefundSelected" label="返款方式">
          <a-radio-group v-model:value="form.refund_method" size="small">
            <a-radio value="礼品卡">礼品卡</a-radio>
            <a-radio value="PayPal">PayPal</a-radio>
            <a-radio value="其他">其他</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item v-if="!noRefundSelected && form.refund_method === 'PayPal'" label="买手 PayPal 邮箱">
          <a-input v-model:value="form.buyer_paypal_email" placeholder="buyer@example.com" />
        </a-form-item>

        <div v-if="!noRefundSelected" class="form-grid">
          <a-form-item label="实付金额 (USD)">
            <a-input-number v-model:value="form.actual_paid_usd" :min="0" :precision="2" style="width:100%" />
          </a-form-item>
          <a-form-item v-if="form.refund_method === 'PayPal'" label="贝宝手续费 (USD)">
            <a-input-number v-model:value="form.paypal_fee_usd" :min="0" :precision="2" style="width:100%" />
          </a-form-item>
          <a-form-item v-else label="应返礼品卡面额 (USD)">
            <a-input-number v-model:value="form.final_amount_usd" :min="0" :precision="2" style="width:100%" />
          </a-form-item>
        </div>

        <div v-if="!noRefundSelected" class="total-row">
          <span>合计返款</span>
          <strong>${{ money(finalAmount) }}</strong>
        </div>

        <a-form-item v-if="mode === 'supplement'" label="追加原因">
          <a-radio-group v-model:value="form.supplement_reason" size="small">
            <a-radio value="产品涨价">产品涨价</a-radio>
            <a-radio value="产品额外佣金">产品额外佣金</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item v-if="mode === 'correction'" label="更正说明">
          <a-input v-model:value="form.supplement_reason" placeholder="如：PayPal 邮箱填错，重新提交" />
        </a-form-item>

        <a-form-item label="备注">
          <a-textarea v-model:value="form.notes" :rows="2" />
        </a-form-item>

        <a-form-item v-if="!noRefundSelected">
          <a-checkbox v-model:checked="form.need_screenshot">需财务补水单</a-checkbox>
        </a-form-item>
      </a-form>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { supabase } from '../lib/supabase'

const props = defineProps<{
  open: boolean
  subOrder: any | null
  actorName?: string
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  saved: []
}>()

const saving = ref(false)
const requests = ref<any[]>([])
const mode = ref<'initial' | 'pending_update' | 'supplement' | 'correction'>('initial')

const form = reactive({
  refund_sequence: '预付',
  refund_method: '礼品卡',
  buyer_paypal_email: '',
  actual_paid_usd: 0,
  paypal_fee_usd: 0,
  final_amount_usd: 0,
  notes: '',
  need_screenshot: false,
  supplement_reason: '产品涨价',
})

const pendingRequest = computed(() => requests.value.find((r) => r.status === '待处理') || null)
const processedRequests = computed(() => requests.value.filter((r) => r.status === '已处理'))
const latestProcessed = computed(() => processedRequests.value[processedRequests.value.length - 1] || null)
const canCorrectionResubmit = computed(() => ['退款失败', '返款失败'].includes(props.subOrder?.refund_status || ''))
const noRefundSelected = computed(() => form.refund_sequence === '无需返款')
const finalAmount = computed(() => form.refund_method === 'PayPal'
  ? Number(form.actual_paid_usd || 0) + Number(form.paypal_fee_usd || 0)
  : Number(form.final_amount_usd || 0))

watch(() => props.open, async (val) => {
  if (val) await init()
})

async function init() {
  requests.value = []
  if (!props.subOrder?.id) return
  const { data } = await supabase
    .from('refund_requests')
    .select('*')
    .eq('sub_order_id', props.subOrder.id)
    .order('created_at', { ascending: true })
  requests.value = data || []

  form.refund_sequence = props.subOrder.refund_sequence || '预付'
  form.refund_method = props.subOrder.refund_method || latestProcessed.value?.refund_method || '礼品卡'
  form.buyer_paypal_email = props.subOrder.buyer?.paypal_email || pendingRequest.value?.buyer_paypal_email || ''
  form.actual_paid_usd = Number(props.subOrder.product_price || 0)
  form.paypal_fee_usd = 0
  form.final_amount_usd = Number(props.subOrder.product_price || 0)
  form.notes = ''
  form.need_screenshot = false
  form.supplement_reason = '产品涨价'

  if (pendingRequest.value) {
    mode.value = 'pending_update'
    fillFromRequest(pendingRequest.value)
  } else if (latestProcessed.value) {
    mode.value = 'supplement'
    form.refund_method = latestProcessed.value.refund_method || form.refund_method
  } else {
    mode.value = 'initial'
  }
}

watch(mode, (val) => {
  if (val === 'pending_update' && pendingRequest.value) fillFromRequest(pendingRequest.value)
  if (val === 'correction' && latestProcessed.value) fillFromRequest(latestProcessed.value)
  if (val === 'supplement') {
    form.notes = ''
    form.paypal_fee_usd = 0
    form.actual_paid_usd = 0
    form.final_amount_usd = 0
  }
})

function fillFromRequest(req: any) {
  form.refund_sequence = req.refund_sequence || '预付'
  form.refund_method = req.refund_method || '礼品卡'
  form.buyer_paypal_email = req.buyer_paypal_email || ''
  form.actual_paid_usd = Number(req.actual_paid_usd || 0) || Math.max(0, Number(req.refund_amount_usd || 0) - Number(req.paypal_fee_usd || 0))
  form.paypal_fee_usd = Number(req.paypal_fee_usd || 0)
  form.final_amount_usd = Number(req.gift_card_face_value_usd || req.refund_amount_usd || 0)
  form.notes = String(req.notes || '').replace(/\s*\[(需财务返款截图|需财务水单)\]\s*$/, '')
  form.need_screenshot = /\[需财务返款截图\]|\[需财务水单\]/.test(req.notes || '')
  form.supplement_reason = req.supplement_reason || '产品涨价'
}

function money(val: any) {
  return Number(val || 0).toFixed(2)
}

async function submit() {
  if (!props.subOrder?.id) return
  if (noRefundSelected.value) {
    saving.value = true
    try {
      const { error: subOrderError } = await supabase.from('sub_orders').update({
        refund_method: '',
        refund_sequence: '无需返款',
        refund_status: '无需退款',
        refund_amount: 0,
        refund_amount_usd: 0,
      }).eq('id', props.subOrder.id)
      if (subOrderError) throw subOrderError

      if (mode.value === 'pending_update' && pendingRequest.value?.id) {
        const cancelNotes = [pendingRequest.value.notes, '业务改为无需返款，原待审核返款申请已取消'].filter(Boolean).join('；')
        const { error: cancelError } = await supabase
          .from('refund_requests')
          .update({ status: '已取消', notes: cancelNotes })
          .eq('id', pendingRequest.value.id)
        if (cancelError) throw cancelError
      }

      message.success(mode.value === 'pending_update' ? '已改为无需返款，并取消待审核返款申请' : '已保存为无需返款')
      emit('saved')
      emit('update:open', false)
      return
    } catch (e: any) {
      message.error('保存失败：' + e.message)
      return
    } finally {
      saving.value = false
    }
  }
  if (form.refund_method === 'PayPal' && !form.buyer_paypal_email.trim()) {
    message.error('请填写买手 PayPal 邮箱')
    return
  }
  if (mode.value === 'correction' && !canCorrectionResubmit.value) {
    message.error('只有返款状态为“返款失败”时，才可更正重提')
    return
  }
  saving.value = true
  try {
    const payload = {
      refund_method: form.refund_method,
      refund_sequence: form.refund_sequence,
      buyer_paypal_email: form.refund_method === 'PayPal' ? form.buyer_paypal_email.trim() : '',
      actual_paid_usd: Number(form.actual_paid_usd || 0),
      paypal_fee_usd: form.refund_method === 'PayPal' ? Number(form.paypal_fee_usd || 0) : 0,
      refund_amount_usd: Number(finalAmount.value || 0),
      refund_amount: Number(finalAmount.value || 0),
      notes: `${form.notes || ''}${form.need_screenshot ? ' [需财务水单]' : ''}`.trim(),
      supplement_reason: mode.value === 'supplement' || mode.value === 'correction' ? form.supplement_reason : '',
      product_name: props.subOrder.product_name || '',
      product_price: props.subOrder.product_price || 0,
      asin: props.subOrder.asin || '',
      store_name: props.subOrder.store_name || '',
    }

    await supabase.from('sub_orders').update({
      refund_method: form.refund_method,
      refund_sequence: form.refund_sequence,
    }).eq('id', props.subOrder.id)

    if (mode.value === 'pending_update' && pendingRequest.value) {
      const edits = buildEdits(pendingRequest.value, payload)
      const staffChangeLog = Array.isArray(pendingRequest.value.staff_change_log) ? pendingRequest.value.staff_change_log : []
      const updatePayload: any = { ...payload }
      if (edits.length) {
        updatePayload.staff_change_log = [...staffChangeLog, {
          at: new Date().toISOString(),
          staff_name: props.actorName || '业务员',
          edits,
        }]
      }
      const { error } = await supabase.from('refund_requests').update(updatePayload).eq('id', pendingRequest.value.id)
      if (error) throw error
      message.success('返款申请已更新')
    } else {
      const insertPayload: any = {
        ...payload,
        sub_order_id: props.subOrder.id,
        order_id: props.subOrder.order_id,
        sub_order_number: props.subOrder.sub_order_number,
        buyer_name: props.subOrder.buyer_name || '',
        status: '待处理',
        request_type: mode.value === 'supplement' ? 'supplement' : mode.value === 'correction' ? 'correction' : 'initial',
        supersedes_request_id: mode.value === 'correction' ? latestProcessed.value?.id || null : null,
      }
      const { error } = await supabase.from('refund_requests').insert(insertPayload)
      if (error) throw error
      message.success(mode.value === 'supplement' ? '追加返款申请已提交' : mode.value === 'correction' ? '更正返款申请已提交' : '返款申请已提交')
    }

    emit('saved')
    emit('update:open', false)
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    saving.value = false
  }
}

function buildEdits(oldRow: any, nextRow: any) {
  const fields = ['buyer_paypal_email', 'actual_paid_usd', 'paypal_fee_usd', 'refund_amount_usd', 'refund_method', 'refund_sequence']
  return fields
    .filter((field) => String(oldRow[field] ?? '') !== String(nextRow[field] ?? ''))
    .map((field) => ({ field, from: oldRow[field] ?? '', to: nextRow[field] ?? '' }))
}
</script>

<style scoped>
.panel { margin-bottom: 16px; }
.panel-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 10px; }
.info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f8fafc; }
.lbl { display: inline-block; width: 72px; color: #6b7280; font-size: 12px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.total-row { display: flex; justify-content: space-between; align-items: center; margin: 6px 0 16px; padding: 10px 12px; border-radius: 8px; background: #eff6ff; color: #1e3a8a; }
.total-row strong { font-size: 16px; }
.audit-tip { margin-bottom: 16px; padding: 10px 12px; border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a; font-size: 12px; color: #374151; }
.audit-title { font-weight: 700; color: #b45309; margin-bottom: 4px; }
.audit-count { margin-top: 4px; color: #6b7280; }
.mode-hint { margin-top: 8px; font-size: 12px; color: #6b7280; }
</style>
