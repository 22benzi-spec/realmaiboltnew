<template>
  <a-drawer
    :open="open"
    title="账单管理"
    width="680"
    placement="right"
    :body-style="{ padding: '0', background: '#f8f9fb' }"
    @close="emit('close')"
  >
    <template v-if="order">
      <!-- 订单信息头 -->
      <div class="billing-header">
        <div class="billing-header-left">
          <div class="billing-order-num">{{ order.order_number }}</div>
          <div class="billing-order-meta">
            <span>{{ order.customer_name || '-' }}</span>
            <span v-if="order.asin" class="meta-sep">·</span>
            <span v-if="order.asin" class="meta-asin">{{ order.asin }}</span>
          </div>
        </div>
        <div class="billing-header-right">
          <div class="billing-summary-trio">
            <div class="trio-item">
              <div class="trio-label">实际应收</div>
              <div class="trio-val trio-expect">¥{{ Number(order.total_amount || 0).toFixed(2) }}</div>
            </div>
            <div class="trio-divider"></div>
            <div class="trio-item">
              <div class="trio-label">净到账</div>
              <div class="trio-val trio-received" :style="{ color: paymentTotal > 0 ? '#16a34a' : '#9ca3af' }">
                ¥{{ paymentTotal.toFixed(2) }}
              </div>
            </div>
            <div class="trio-divider"></div>
            <div class="trio-item">
              <div class="trio-label">{{ diffLabel }}</div>
              <div class="trio-val" :style="{ color: diffColor }">
                ¥{{ Math.abs(paymentDiff).toFixed(2) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 如有未结清提醒 -->
      <div v-if="needsAttention" class="billing-alert">
        <span class="alert-icon">!</span>
        <span>{{ alertText }}</span>
      </div>

      <div class="billing-body">
        <!-- 区块一：账款状态 -->
        <div class="billing-section">
          <div class="section-header">
            <span class="section-title">账款状态</span>
            <a-button
              v-if="!editingDebt"
              type="link"
              size="small"
              @click="startEditDebt"
            >编辑</a-button>
            <div v-else class="section-actions">
              <a-button size="small" @click="cancelEditDebt">取消</a-button>
              <a-button size="small" type="primary" :loading="debtSaving" @click="saveDebt">保存</a-button>
            </div>
          </div>

          <!-- 查看态 -->
          <div v-if="!editingDebt" class="debt-view">
            <div class="debt-view-row">
              <span class="dv-label">入账状态</span>
              <a-tag :color="order.billing_status === '未完成' ? 'red' : 'green'" size="small">
                {{ order.billing_status || '已完成' }}
              </a-tag>
            </div>
            <div class="debt-view-row">
              <span class="dv-label">账款情况</span>
              <a-tag v-if="order.debt_status === 'owed'" color="orange" size="small">客户需补款 ¥{{ Number(order.debt_amount || 0).toFixed(2) }}</a-tag>
              <a-tag v-else-if="order.debt_status === 'surplus'" color="blue" size="small">需退客户 ¥{{ Number(order.debt_amount || 0).toFixed(2) }}</a-tag>
              <a-tag v-else-if="order.debt_status === 'cleared'" color="green" size="small">已结清</a-tag>
              <a-tag v-else color="default" size="small">无异常</a-tag>
            </div>
            <div v-if="order.debt_notes" class="debt-view-row">
              <span class="dv-label">差价说明</span>
              <span class="dv-val">{{ order.debt_notes }}</span>
            </div>
            <div v-if="order.debt_marked_by" class="debt-view-row">
              <span class="dv-label">标记商务</span>
              <span class="dv-val">
                {{ order.debt_marked_by }}
                <span v-if="order.debt_marked_at" class="dv-time">{{ dayjs(order.debt_marked_at).format('MM-DD HH:mm') }}</span>
              </span>
            </div>
          </div>

          <!-- 编辑态 -->
          <div v-else class="debt-edit">
            <div class="edit-field">
              <label class="edit-label">基础入账状态</label>
              <a-radio-group v-model:value="debtForm.billing_status" size="small">
                <a-radio-button value="已完成">已完成</a-radio-button>
                <a-radio-button value="未完成">未完成</a-radio-button>
              </a-radio-group>
            </div>
            <div class="edit-field">
              <label class="edit-label">账款情况</label>
              <a-radio-group v-model:value="debtForm.debt_status" size="small">
                <a-radio-button value="none">无异常</a-radio-button>
                <a-radio-button value="owed">客户需补款</a-radio-button>
                <a-radio-button value="surplus">需退客户</a-radio-button>
                <a-radio-button value="cleared">已结清</a-radio-button>
              </a-radio-group>
            </div>
            <template v-if="debtForm.debt_status === 'owed' || debtForm.debt_status === 'surplus'">
              <div class="edit-field">
                <label class="edit-label">差价金额（元）</label>
                <a-input-number
                  v-model:value="debtForm.debt_amount"
                  style="width:200px"
                  :min="0"
                  :precision="2"
                />
              </div>
              <div class="edit-field">
                <label class="edit-label">差价说明</label>
                <a-textarea
                  v-model:value="debtForm.debt_notes"
                  :rows="2"
                  placeholder="如：税费差额 ¥120"
                />
              </div>
              <div class="edit-field">
                <label class="edit-label">标记商务</label>
                <a-input v-model:value="debtForm.debt_marked_by" placeholder="商务姓名" style="width:200px" />
              </div>
            </template>
          </div>
        </div>

        <!-- 区块二：款项操作 -->
        <div class="billing-section">
          <div class="section-header">
            <span class="section-title">款项操作</span>
            <span class="section-hint">补款和退款明细请在详情页流水中查看</span>
          </div>
          <div class="billing-action-row">
            <a-button
              type="primary"
              @click="openAddRecord('补款')"
            >
              录入补款
            </a-button>
            <a-button
              danger
              @click="openAddRecord('退款')"
            >
              提交退款
            </a-button>
            <a-button
              @click="openAddRecord('账面抵消')"
            >
              账面抵消
            </a-button>
          </div>
          <div class="refund-hint">退款提交后将生成待审批的退款流水，需财务审批后执行。</div>
        </div>
      </div>
    </template>

    <!-- 新增补款/退款 Modal -->
    <a-modal
      v-model:open="addRecordOpen"
      :title="getAddRecordTitle()"
      :confirm-loading="addRecordSaving"
      @ok="saveRecord"
      :ok-text="getAddRecordOkText()"
      :ok-button-props="{ danger: addRecordType === '退款' }"
      cancel-text="取消"
      width="520px"
    >
      <div class="add-record-form">
        <div v-if="addRecordType !== '补款'" class="add-record-alert" :class="{ 'add-record-alert-offset': addRecordType === '账面抵消' }">
          {{ addRecordType === '退款' ? '退款将生成待审批流水，需财务审批后执行' : '账面抵消不产生实际到账，但会进入交易流水用于对账' }}
        </div>
        <div v-if="addRecordType !== '账面抵消'" class="offset-inline-action">
          <span>{{ addRecordType === '退款' ? '如果部分金额已用账面抵消，先录抵消后再提交退款。' : '如果部分金额已用账面抵消，先录抵消后再补款。' }}</span>
          <a-button size="small" @click="openAddRecord('账面抵消', true)">账面抵消</a-button>
        </div>
        <div v-if="addRecordType === '账面抵消'" class="offset-brief-card">
          <div class="offset-brief-head">
            <span>抵消来源任务</span>
            <a-button size="small" @click="addOffsetTaskRow">添加任务</a-button>
          </div>
          <div class="offset-business-list">
            <div v-for="(row, index) in addRecordForm.offset_task_rows" :key="index" class="offset-business-row">
              <a-input v-model:value="row.task_id" size="small" placeholder="任务ID / 订单号" style="flex:1" />
              <a-input-number v-model:value="row.amount_cny" size="small" :min="0" :precision="2" style="width:120px" placeholder="抵消金额" />
              <a-button
                size="small"
                danger
                :disabled="addRecordForm.offset_task_rows.length <= 1"
                @click="removeOffsetTaskRow(index)"
              >
                删除
              </a-button>
            </div>
          </div>
          <div class="offset-brief-total">抵消金额合计：¥{{ offsetTaskTotal.toFixed(2) }}</div>
        </div>
        <div v-if="addRecordType !== '账面抵消'" class="ar-field">
          <label class="ar-label">一级分类</label>
          <a-select v-model:value="addRecordForm.primary_category" style="width:100%" @change="onAddRecordPrimaryChange">
            <a-select-option v-for="item in addRecordPrimaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
          </a-select>
        </div>
        <div v-if="addRecordType !== '账面抵消'" class="ar-field">
          <label class="ar-label">二级分类</label>
          <a-select v-model:value="addRecordForm.secondary_categories" mode="multiple" style="width:100%" placeholder="可多选">
            <a-select-option v-for="item in addRecordSecondaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
          </a-select>
        </div>
        <div v-if="addRecordType === '补款'" class="ar-field">
          <label class="ar-label">补款币种</label>
          <a-radio-group v-model:value="addRecordForm.currency_mode" size="small">
            <a-radio-button value="cny">人民币</a-radio-button>
            <a-radio-button value="usd">美元</a-radio-button>
            <a-radio-button value="both">同时填写</a-radio-button>
          </a-radio-group>
        </div>
        <div v-if="showSupplementCny" class="ar-field">
          <label class="ar-label">补款金额（人民币）</label>
          <a-input-number
            v-model:value="addRecordForm.amount_cny"
            style="width:100%"
            :min="0"
            :precision="2"
            placeholder="人民币金额"
          />
        </div>
        <div v-if="showSupplementUsd" class="ar-field">
          <label class="ar-label">补款金额（USD）</label>
          <a-input-number
            v-model:value="addRecordForm.amount_usd"
            style="width:100%"
            :min="0"
            :precision="2"
            placeholder="美金金额"
          />
        </div>
        <div v-if="addRecordType === '退款'" class="ar-field">
          <label class="ar-label">
            退款金额（元）
            <span class="required">*</span>
          </label>
          <a-input-number
            v-model:value="addRecordForm.amount_cny"
            style="width:100%"
            :min="0"
            :precision="2"
            placeholder="退款金额"
          />
        </div>
        <div v-if="addRecordType === '补款'" class="add-record-tip">
          默认只展示一种币种；确实需要双币种时选择“同时填写”。
        </div>
        <div v-if="addRecordType === '账面抵消'" class="offset-brief-card">
          <div class="offset-brief-head">
            <span>抵消明细</span>
            <a-button size="small" @click="addOffsetBusinessRow">添加类型</a-button>
          </div>
          <div class="offset-business-list">
            <div v-for="(row, index) in addRecordForm.offset_business_rows" :key="index" class="offset-business-row">
              <a-select v-model:value="row.business_type" size="small" placeholder="类型" style="flex:1" show-search>
                <a-select-option v-for="item in businessTypeOptions" :key="item" :value="item">{{ item }}</a-select-option>
              </a-select>
              <a-input-number v-model:value="row.order_count" size="small" :min="1" :precision="0" style="width:110px" placeholder="对应单量" />
              <a-button
                size="small"
                danger
                :disabled="addRecordForm.offset_business_rows.length <= 1"
                @click="removeOffsetBusinessRow(index)"
              >
                删除
              </a-button>
            </div>
          </div>
          <div class="offset-brief-tip">例如：文字对应 3 单，免评对应 1 单。</div>
        </div>
        <div v-if="addRecordType !== '账面抵消'" class="ar-field">
          <label class="ar-label">{{ addRecordType === '退款' ? '退款日期' : '补款日期' }} <span class="required">*</span></label>
          <a-date-picker
            v-model:value="addRecordForm.payment_date_picker"
            style="width:100%"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
          />
        </div>
        <div v-if="addRecordType !== '账面抵消'" class="ar-field">
          <label class="ar-label">方式</label>
          <a-select v-model:value="addRecordForm.payment_method" style="width:100%">
            <a-select-option value="银行转账">银行转账</a-select-option>
            <a-select-option value="微信">微信</a-select-option>
            <a-select-option value="支付宝">支付宝</a-select-option>
            <a-select-option value="其他">其他</a-select-option>
          </a-select>
        </div>
        <div v-if="isRefundAccountTransfer" class="refund-account-grid">
          <div class="ar-field">
            <label class="ar-label">退款账号</label>
            <a-input v-model:value="addRecordForm.refund_account" placeholder="银行账号 / 支付宝账号" />
          </div>
          <div class="ar-field">
            <label class="ar-label">姓氏</label>
            <a-input v-model:value="addRecordForm.refund_account_surname" placeholder="收款人姓氏" />
          </div>
        </div>
        <div v-if="addRecordType !== '账面抵消'" class="ar-field">
          <label class="ar-label">{{ addRecordType === '退款' ? '退款对象' : '付款人' }}</label>
          <a-input v-model:value="addRecordForm.payer_name" placeholder="姓名" />
        </div>
        <div class="ar-field">
          <label class="ar-label">操作人</label>
          <a-input v-model:value="addRecordForm.recorded_by" placeholder="录入人" />
        </div>
        <div v-if="addRecordType !== '账面抵消'" class="ar-field">
          <label class="ar-label">{{ addRecordType === '退款' ? '上传退款二维码' : '上传凭证' }}</label>
          <a-upload
            v-model:file-list="addRecordFiles"
            list-type="picture-card"
            :before-upload="() => false"
            accept="image/*,.pdf"
            :multiple="true"
          >
            <div v-if="addRecordFiles.length < 5" class="upload-btn">
              <PlusOutlined />
              <div style="margin-top:4px;font-size:12px">上传</div>
            </div>
          </a-upload>
        </div>
        <div v-if="addRecordType !== '账面抵消' || !offsetOpenedFromNestedAction" class="ar-field">
          <label class="ar-label">账单状态变更</label>
          <a-radio-group v-model:value="addRecordForm.update_debt_status" size="small">
            <a-radio-button value="none">不变更</a-radio-button>
            <a-radio-button value="cleared">标记已结清</a-radio-button>
            <a-radio-button value="owed" v-if="addRecordType !== '退款'">标记有欠款</a-radio-button>
            <a-radio-button value="surplus" v-if="addRecordType === '退款'">标记溢收</a-radio-button>
          </a-radio-group>
          <div v-if="addRecordForm.update_debt_status !== 'none'" class="debt-status-reminder">
            账单状态需手动确认，实际情况请以商务核实为准
          </div>
        </div>
        <div v-if="addRecordType !== '账面抵消' || !offsetOpenedFromNestedAction" class="ar-field">
          <label class="ar-label">备注</label>
          <a-textarea v-model:value="addRecordForm.notes" :rows="2" placeholder="备注（可选）" />
        </div>
      </div>
    </a-modal>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'
import { useCurrentUser } from '../composables/useCurrentUser'
import dayjs from 'dayjs'

const props = defineProps<{
  open: boolean
  order: any | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated', payload: any): void
}>()

const { currentUser } = useCurrentUser()

const payments = ref<any[]>([])

const supplementRecords = computed(() => payments.value.filter(p => p.payment_type === '补款'))
const refundRecords = computed(() => payments.value.filter(p => p.payment_type === '退款'))

const supplementTotal = computed(() =>
  supplementRecords.value.reduce((s, p) => s + Number(p.amount_cny || 0), 0)
)
const refundTotal = computed(() =>
  refundRecords.value.reduce((s, p) => s + Number(p.amount_cny || 0), 0)
)

const paymentTotal = computed(() => {
  return payments.value.reduce((s, p) => {
    const amt = Number(p.amount_cny || 0)
    return p.payment_type === '退款' ? s - amt : s + amt
  }, 0)
})

const paymentDiff = computed(() => {
  return Number(props.order?.total_amount || 0) - paymentTotal.value
})

const diffLabel = computed(() => {
  if (paymentDiff.value > 0.005) return '差价金额'
  if (paymentDiff.value < -0.005) return '差价金额'
  return '已结清'
})

const diffColor = computed(() => {
  if (paymentDiff.value > 0) return '#dc2626'
  if (paymentDiff.value < 0) return '#2563eb'
  return '#16a34a'
})

const needsAttention = computed(() => {
  if (!props.order) return false
  const hasPayments = payments.value.length > 0
  const hasDebt = props.order.debt_status === 'owed'
  const hasSurplus = props.order.debt_status === 'surplus'
  if (!hasPayments) return false
  if (hasDebt && props.order.debt_status !== 'cleared') {
    const sumPaid = supplementTotal.value
    const owed = Number(props.order.debt_amount || 0)
    return sumPaid > 0 && sumPaid >= owed && props.order.debt_status === 'owed'
  }
  if (hasSurplus && refundTotal.value >= Number(props.order.debt_amount || 0)) {
    return props.order.debt_status === 'surplus'
  }
  return false
})

const alertText = computed(() => {
  if (!props.order) return ''
  if (props.order.debt_status === 'owed') return '净到账已覆盖差价金额，建议将账款情况标记为已结清'
  if (props.order.debt_status === 'surplus') return '退款已处理，建议将账款情况标记为已结清'
  return ''
})

async function loadPayments() {
  if (!props.order?.id) return
  const { data } = await supabase
    .from('batch_payments')
    .select('*')
    .eq('batch_id', props.order.id)
    .order('payment_date', { ascending: false })
  payments.value = data || []
}

watch(() => props.open, (val) => {
  if (val && props.order) {
    loadPayments()
    cancelEditDebt()
  }
})

watch(() => props.order, (val) => {
  if (val && props.open) {
    loadPayments()
  }
})

// --- 账款状态编辑 ---
const editingDebt = ref(false)
const debtSaving = ref(false)
const debtForm = ref({
  billing_status: '已完成',
  debt_status: 'none',
  debt_amount: 0,
  debt_notes: '',
  debt_marked_by: '',
})

function startEditDebt() {
  if (!props.order) return
  debtForm.value = {
    billing_status: props.order.billing_status || '已完成',
    debt_status: props.order.debt_status || 'none',
    debt_amount: props.order.debt_amount || 0,
    debt_notes: props.order.debt_notes || '',
    debt_marked_by: props.order.debt_marked_by || currentUser.value?.name || '',
  }
  editingDebt.value = true
}

function cancelEditDebt() {
  editingDebt.value = false
}

async function saveDebt() {
  if (!props.order?.id) return
  debtSaving.value = true
  try {
    const hasIssue = debtForm.value.debt_status === 'owed' || debtForm.value.debt_status === 'surplus'
    const payload: any = {
      billing_status: debtForm.value.billing_status,
      debt_status: debtForm.value.debt_status,
      debt_amount: hasIssue ? debtForm.value.debt_amount : 0,
      debt_notes: hasIssue ? debtForm.value.debt_notes : null,
      debt_marked_by: hasIssue ? debtForm.value.debt_marked_by : null,
      debt_marked_at: hasIssue ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('erp_orders').update(payload).eq('id', props.order.id)
    if (error) throw error
    message.success('账款状态已保存')
    editingDebt.value = false
    emit('updated', { id: props.order.id, ...payload })
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    debtSaving.value = false
  }
}

// --- 新增记录 ---
const addRecordOpen = ref(false)
const addRecordSaving = ref(false)
const addRecordType = ref<'补款' | '退款' | '账面抵消'>('补款')
const offsetOpenedFromNestedAction = ref(false)
const addRecordFiles = ref<any[]>([])
const businessTypeOptions = ['文字', '免评', '图片', '视频', 'Feedback']
const billingTransactionCategoryOptions = [
  {
    value: '业务收入',
    label: '业务收入',
    children: [
      { value: '任务收入', label: '任务收入' },
      { value: '补款收入', label: '补款收入' },
    ],
  },
  {
    value: '业务支出',
    label: '业务支出',
    children: [
      { value: '截单退款', label: '截单退款' },
      { value: '赔付佣金', label: '赔付佣金' },
      { value: '退差价', label: '退差价' },
    ],
  },
  {
    value: '业务结算',
    label: '业务结算',
    children: [
      { value: '账面抵消', label: '账面抵消' },
    ],
  },
  {
    value: '运营支出',
    label: '运营支出',
    children: [
      { value: 'IP采购', label: 'IP采购' },
      { value: '服务器', label: '服务器' },
      { value: '账号购买', label: '账号购买' },
      { value: '礼品卡', label: '礼品卡' },
      { value: '信用卡', label: '信用卡' },
    ],
  },
  {
    value: '行政办公',
    label: '行政办公',
    children: [
      { value: '行政支出', label: '行政支出' },
      { value: '行政冲销', label: '行政冲销' },
    ],
  },
  {
    value: '其他收入',
    label: '其他收入',
    children: [{ value: '其他收入', label: '其他收入' }],
  },
  {
    value: '其他支出',
    label: '其他支出',
    children: [{ value: '其他支出', label: '其他支出' }],
  },
]
const addRecordPrimaryOptions = computed(() => billingTransactionCategoryOptions.filter(item =>
  addRecordType.value === '退款'
    ? ['业务支出', '运营支出', '行政办公', '其他支出'].includes(item.value)
    : addRecordType.value === '账面抵消'
      ? ['业务结算'].includes(item.value)
    : ['业务收入', '其他收入'].includes(item.value),
))
const addRecordSecondaryOptions = computed(() =>
  addRecordPrimaryOptions.value.find(item => item.value === addRecordForm.value.primary_category)?.children || [],
)
const addRecordForm = ref({
  primary_category: '业务收入',
  secondary_categories: ['补款收入'] as string[],
  currency_mode: 'cny' as 'cny' | 'usd' | 'both',
  amount_cny: undefined as number | undefined,
  amount_usd: undefined as number | undefined,
  business_countries: [] as string[],
  business_types: [] as string[],
  business_order_count: 0,
  business_breakdown: [] as any[],
  offset_source_type: '客户余款抵消',
  offset_source_note: '',
  offset_related_task_id: '',
  offset_task_rows: [{ task_id: '', amount_cny: undefined as number | undefined }],
  offset_business_rows: [{ business_type: '', order_count: undefined as number | undefined }],
  payment_date_picker: null as any,
  payment_method: '银行转账',
  refund_account: '',
  refund_account_surname: '',
  payer_name: '',
  recorded_by: '',
  notes: '',
  update_debt_status: 'none',
})

const showSupplementCny = computed(() =>
  addRecordType.value === '补款' && ['cny', 'both'].includes(addRecordForm.value.currency_mode),
)
const showSupplementUsd = computed(() =>
  addRecordType.value === '补款' && ['usd', 'both'].includes(addRecordForm.value.currency_mode),
)
const isRefundAccountTransfer = computed(() =>
  addRecordType.value === '退款' && ['银行转账', '支付宝'].includes(addRecordForm.value.payment_method),
)
const offsetTaskTotal = computed(() =>
  addRecordForm.value.offset_task_rows.reduce((sum: number, row: any) => sum + Number(row.amount_cny || 0), 0),
)

function normalizeBusinessType(value: any) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw === '文字评' || raw === '文字') return '文字'
  if (raw === '图片评' || raw === '图片') return '图片'
  if (raw === '视频评' || raw === '视频') return '视频'
  if (raw === 'FB' || raw === 'Feedback') return 'Feedback'
  if (raw === '免评') return '免评'
  return raw
}

function buildOrderBusinessBreakdown(order: any, amountCny: number) {
  const country = String(order?.country || '').trim()
  const orderNumber = String(order?.order_number || order?.id || '').trim()
  const rawTypes = Array.isArray(order?.order_types) && order.order_types.length
    ? order.order_types
    : (order?.review_type || order?.order_type ? [order.review_type || order.order_type] : [])
  const types = rawTypes.map(normalizeBusinessType).filter(Boolean)
  const quantityMap = order?.type_quantities && typeof order.type_quantities === 'object' ? order.type_quantities : {}
  const fallbackCount = Number(order?.order_quantity || 0) || (types.length ? types.length : 0)
  const totalCount = types.reduce((sum: number, type: string) => sum + Number(quantityMap[type] || quantityMap[`${type}评`] || 0), 0) || fallbackCount
  if (!types.length) {
    return {
      countries: country ? [country] : [],
      types: [] as string[],
      orderCount: totalCount,
      breakdown: country || totalCount ? [{ order_id: order?.id || null, order_number: orderNumber, country, business_type: '', order_count: totalCount, amount_cny: amountCny }] : [],
    }
  }
  const breakdown = types.map((type: string) => {
    const count = Number(quantityMap[type] || quantityMap[`${type}评`] || 0) || Math.round(totalCount / types.length)
    const ratio = totalCount > 0 ? count / totalCount : 1 / types.length
    return {
      country,
      order_id: order?.id || null,
      order_number: orderNumber,
      business_type: type,
      order_count: count,
      amount_cny: Number((amountCny * ratio).toFixed(2)),
    }
  })
  return {
    countries: country ? [country] : [],
    types: Array.from(new Set<string>(types)),
    orderCount: totalCount,
    breakdown,
  }
}

function getAddRecordTitle() {
  const map: Record<string, string> = { 补款: '录入补款', 退款: '提交退款', 账面抵消: '录入账面抵消' }
  return map[addRecordType.value]
}

function getAddRecordOkText() {
  const map: Record<string, string> = { 补款: '录入补款', 退款: '提交退款', 账面抵消: '保存抵消' }
  return map[addRecordType.value]
}

function onAddRecordPrimaryChange() {
  const nextValues = addRecordForm.value.secondary_categories.filter(value =>
    addRecordSecondaryOptions.value.some(item => item.value === value),
  )
  addRecordForm.value.secondary_categories = nextValues.length
    ? nextValues
    : (addRecordSecondaryOptions.value[0] ? [addRecordSecondaryOptions.value[0].value] : [])
}

function createOffsetBusinessRows(order: any) {
  const businessDetail = buildOrderBusinessBreakdown(order, 0)
  const rows = businessDetail.types.map((type: string) => ({
    business_type: type,
    order_count: undefined as number | undefined,
  }))
  return rows.length ? rows : [{ business_type: '', order_count: undefined as number | undefined }]
}

function addOffsetBusinessRow() {
  addRecordForm.value.offset_business_rows.push({ business_type: '', order_count: undefined })
}

function removeOffsetBusinessRow(index: number) {
  if (addRecordForm.value.offset_business_rows.length <= 1) return
  addRecordForm.value.offset_business_rows.splice(index, 1)
}

function addOffsetTaskRow() {
  addRecordForm.value.offset_task_rows.push({ task_id: '', amount_cny: undefined })
}

function removeOffsetTaskRow(index: number) {
  if (addRecordForm.value.offset_task_rows.length <= 1) return
  addRecordForm.value.offset_task_rows.splice(index, 1)
}

function openAddRecord(type: '补款' | '退款' | '账面抵消', fromNestedAction = false) {
  addRecordType.value = type
  offsetOpenedFromNestedAction.value = type === '账面抵消' && fromNestedAction
  addRecordFiles.value = []
  const businessDetail = buildOrderBusinessBreakdown(props.order, 0)
  addRecordForm.value = {
    primary_category: type === '退款' ? '业务支出' : type === '账面抵消' ? '业务结算' : '业务收入',
    secondary_categories: [type === '退款' ? '截单退款' : type === '账面抵消' ? '账面抵消' : '补款收入'],
    currency_mode: 'cny',
    amount_cny: undefined,
    amount_usd: undefined,
    business_countries: businessDetail.countries,
    business_types: businessDetail.types,
    business_order_count: businessDetail.orderCount,
    business_breakdown: businessDetail.breakdown,
    offset_source_type: '客户余款抵消',
    offset_source_note: '',
    offset_related_task_id: '',
    offset_task_rows: [{ task_id: '', amount_cny: undefined }],
    offset_business_rows: createOffsetBusinessRows(props.order),
    payment_date_picker: dayjs(),
    payment_method: type === '账面抵消' ? '账面抵消' : '银行转账',
    refund_account: '',
    refund_account_surname: '',
    payer_name: props.order?.customer_name || '',
    recorded_by: props.order?.sales_person || currentUser.value?.name || '',
    notes: '',
    update_debt_status: 'none',
  }
  onAddRecordPrimaryChange()
  addRecordOpen.value = true
}

async function saveRecord() {
  if (!props.order?.id) return
  if (addRecordType.value !== '账面抵消' && !addRecordForm.value.payment_date_picker) {
    message.warning('请选择日期')
    return
  }
  if (!addRecordForm.value.primary_category) {
    message.warning('请选择一级分类')
    return
  }
  if (!addRecordForm.value.secondary_categories.length) {
    message.warning('请选择二级分类')
    return
  }
  addRecordSaving.value = true
  try {
    const paymentDate = typeof addRecordForm.value.payment_date_picker === 'string'
      ? addRecordForm.value.payment_date_picker
      : addRecordForm.value.payment_date_picker?.format('YYYY-MM-DD')

    let receiptUrls: string[] = []
    for (const f of addRecordFiles.value) {
      if (f.originFileObj) {
        const ext = f.name.split('.').pop()
        const path = `receipts/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { data: upData, error: upErr } = await supabase.storage
          .from('payment-receipts')
          .upload(path, f.originFileObj, { upsert: true })
        if (!upErr && upData) {
          const { data: urlData } = supabase.storage.from('payment-receipts').getPublicUrl(upData.path)
          receiptUrls.push(urlData.publicUrl)
        }
      }
    }

    const isRefund = addRecordType.value === '退款'
    const isOffset = addRecordType.value === '账面抵消'
    const offsetTaskRows = addRecordForm.value.offset_task_rows
      .map((row: any) => ({
        task_id: String(row.task_id || '').trim(),
        amount_cny: Number(row.amount_cny || 0),
      }))
      .filter((row: any) => row.task_id || row.amount_cny > 0)
    const offsetAmountCny = offsetTaskRows.reduce((sum: number, row: any) => sum + row.amount_cny, 0)
    const amountCny = isOffset
      ? offsetAmountCny
      : addRecordType.value === '补款' && addRecordForm.value.currency_mode === 'usd'
        ? 0
        : Number(addRecordForm.value.amount_cny || 0)
    const amountUsd = isOffset || isRefund || addRecordForm.value.currency_mode === 'cny'
      ? 0
      : Number(addRecordForm.value.amount_usd || 0)
    const secondaryCategories = addRecordForm.value.secondary_categories
    const categorySummary = secondaryCategories.join(' / ')
    const businessDetail = buildOrderBusinessBreakdown(props.order, amountCny)
    const offsetBusinessRows = addRecordForm.value.offset_business_rows
      .map((row: any) => ({
        business_type: normalizeBusinessType(row.business_type),
        order_count: Number(row.order_count || 0),
      }))
      .filter((row: any) => row.business_type || row.order_count > 0)
    const manualBusinessTypes = addRecordForm.value.business_types.map(normalizeBusinessType).filter(Boolean)
    const businessCountries = isOffset
      ? []
      : (addRecordForm.value.business_countries.length ? addRecordForm.value.business_countries : businessDetail.countries)
    const businessTypes = isOffset
      ? Array.from(new Set<string>(offsetBusinessRows.map((row: any) => row.business_type).filter(Boolean)))
      : (manualBusinessTypes.length ? manualBusinessTypes : businessDetail.types)
    const businessOrderCount = isOffset
      ? offsetBusinessRows.reduce((sum: number, row: any) => sum + row.order_count, 0)
      : (Number(addRecordForm.value.business_order_count || 0) || businessDetail.orderCount)
    const businessBreakdown = isOffset
      ? offsetBusinessRows.map((row: any) => ({
        order_id: props.order?.id || null,
        order_number: offsetTaskRows.map((item: any) => item.task_id).join('、'),
        country: '',
        business_type: row.business_type,
        order_count: row.order_count,
        amount_cny: businessOrderCount > 0 ? Number((amountCny * row.order_count / businessOrderCount).toFixed(2)) : 0,
      }))
      : businessDetail.breakdown.length
      ? businessDetail.breakdown.map((item: any) => ({ ...item, amount_cny: amountCny && businessDetail.breakdown.length === 1 ? amountCny : item.amount_cny }))
      : addRecordForm.value.business_breakdown

    if (isRefund || isOffset) {
      if (amountCny <= 0) {
        message.warning(isRefund ? '请输入退款金额' : '请输入抵消金额')
        addRecordSaving.value = false
        return
      }
      if (isOffset && (offsetTaskRows.length === 0 || offsetTaskRows.some((row: any) => !row.task_id || row.amount_cny <= 0))) {
        message.warning('请完整填写每行抵消任务ID和抵消金额')
        addRecordSaving.value = false
        return
      }
      if (isOffset && businessTypes.length === 0) {
        message.warning('请填写抵消类型')
        addRecordSaving.value = false
        return
      }
      if (isOffset && offsetBusinessRows.some((row: any) => !row.business_type || row.order_count <= 0)) {
        message.warning('请完整填写每行抵消类型和对应单量')
        addRecordSaving.value = false
        return
      }
      if (isOffset && businessOrderCount <= 0) {
        message.warning('请输入对应单量')
        addRecordSaving.value = false
        return
      }
    } else if (amountCny <= 0 && amountUsd <= 0) {
      message.warning('请至少填写人民币或美元补款金额')
      addRecordSaving.value = false
      return
    }

    const noteParts: string[] = []
    if (isOffset) {
      noteParts.push(`抵消来源: ${offsetTaskRows.map((row: any) => `${row.task_id} ¥${row.amount_cny.toFixed(2)}`).join('、')}`)
      noteParts.push(`抵消明细: ${offsetBusinessRows.map((row: any) => `${row.business_type}${row.order_count}单`).join('、')}`)
    }
    if (isRefund && addRecordForm.value.refund_account) {
      noteParts.push(`退款账号: ${addRecordForm.value.refund_account}`)
    }
    if (isRefund && addRecordForm.value.refund_account_surname) {
      noteParts.push(`姓氏: ${addRecordForm.value.refund_account_surname}`)
    }
    if (addRecordForm.value.notes) noteParts.push(addRecordForm.value.notes)
    const recordNotes = noteParts.join(' | ')

    const { data: txNo } = await supabase.rpc('generate_transaction_no')
    const transactionNo = txNo || `FT-${Date.now()}`

    const { data: txData, error: txErr } = await supabase.from('financial_transactions').insert({
      transaction_no: transactionNo,
      entry_scope: addRecordForm.value.primary_category,
      transaction_type: secondaryCategories[0],
      direction: isOffset ? '账面抵消' : (isRefund ? '支出' : '收入'),
      amount_cny: amountCny,
      amount_usd: isRefund || isOffset ? 0 : amountUsd,
      exchange_rate: props.order.exchange_rate || 7.25,
      customer_name: props.order.customer_name || '',
      customer_id_str: props.order.customer_id_str || '',
      order_id: props.order.id,
      order_number: props.order.order_number,
      staff_name: addRecordForm.value.recorded_by,
      status: isRefund ? '待审批' : '已确认',
      business_countries: businessCountries,
      business_types: businessTypes,
      business_order_count: businessOrderCount,
      business_breakdown: businessBreakdown,
      offset_source_type: null,
      offset_source_note: null,
      notes: `${categorySummary} - ${addRecordForm.value.payment_method}${recordNotes ? ' | ' + recordNotes : ''}`,
      transaction_date: paymentDate,
      receipt_urls: receiptUrls,
    }).select('id').maybeSingle()
    if (txErr) throw txErr

    const { error: payErr } = await supabase.from('batch_payments').insert({
      batch_id: props.order.id,
      batch_number: props.order.order_number,
      transaction_id: txData?.id || null,
      amount_cny: amountCny,
      amount_usd: isRefund || isOffset ? 0 : amountUsd,
      payment_date: paymentDate,
      payment_method: addRecordForm.value.payment_method,
      payer_name: addRecordForm.value.payer_name,
      recorded_by: addRecordForm.value.recorded_by,
      notes: [`分类: ${categorySummary}`, recordNotes].filter(Boolean).join(' | '),
      payment_type: addRecordType.value,
      business_countries: businessCountries,
      business_types: businessTypes,
      business_order_count: businessOrderCount,
      business_breakdown: businessBreakdown,
      offset_source_type: null,
      offset_source_note: null,
      receipt_urls: receiptUrls,
    })
    if (payErr) throw payErr

    if (addRecordForm.value.update_debt_status !== 'none') {
      const statusPayload: any = {
        debt_status: addRecordForm.value.update_debt_status,
        updated_at: new Date().toISOString(),
      }
      if (addRecordForm.value.update_debt_status === 'cleared') {
        statusPayload.debt_amount = 0
      }
      const { error: dsErr } = await supabase.from('erp_orders').update(statusPayload).eq('id', props.order.id)
      if (!dsErr) {
        emit('updated', { id: props.order.id, ...statusPayload })
      }
    }

    const label = isOffset ? '账面抵消已记录' : isRefund ? '退款已提交，流水待审批' : '补款已记录'
    message.success(label)
    addRecordOpen.value = false
    await loadPayments()
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    addRecordSaving.value = false
  }
}

async function deleteRecord(payment: any) {
  try {
    if (payment.transaction_id) {
      await supabase.from('financial_transactions').delete().eq('id', payment.transaction_id)
    }
    await supabase.from('batch_payments').delete().eq('id', payment.id)
    message.success('已删除')
    await loadPayments()
  } catch (e: any) {
    message.error('删除失败：' + e.message)
  }
}
</script>

<style scoped>
.billing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  gap: 16px;
}

.billing-header-left {
  min-width: 0;
}

.billing-order-num {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
  font-family: 'Courier New', monospace;
}

.billing-order-meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-sep { color: #d1d5db; }
.meta-asin { color: #2563eb; font-family: monospace; }

.billing-summary-trio {
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
  min-width: 70px;
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

.trio-expect { color: #374151; }
.trio-received { color: #16a34a; }

.trio-divider {
  width: 1px;
  height: 32px;
  background: #e5e7eb;
}

.billing-alert {
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

.billing-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.billing-section {
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
  flex: 1;
}

.section-actions {
  display: flex;
  gap: 6px;
}

.debt-view {}

.debt-view-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid #f9fafb;
}

.debt-view-row:last-child {
  border-bottom: none;
}

.dv-label {
  font-size: 12px;
  color: #6b7280;
  min-width: 64px;
  padding-top: 2px;
}

.dv-val {
  font-size: 13px;
  color: #374151;
}

.dv-time {
  font-size: 11px;
  color: #9ca3af;
  margin-left: 6px;
}

.debt-edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.edit-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.section-hint {
  margin-left: auto;
  font-size: 12px;
  color: #9ca3af;
  font-weight: 400;
}

.billing-action-row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding-top: 2px;
}

.records-empty {
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
  padding: 12px 0;
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
  padding: 12px 14px;
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
  gap: 4px;
}

.record-amount-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.record-amount {
  font-size: 16px;
  font-weight: 700;
  color: #16a34a;
}

.record-amount-usd {
  color: #2563eb;
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

.refund-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 10px;
  margin-top: -6px;
}

.add-record-tip {
  font-size: 12px;
  color: #6b7280;
  margin-top: -6px;
}

.add-record-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;
}

.add-record-alert {
  padding: 8px 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 6px;
  font-size: 13px;
  color: #92400e;
}

.add-record-alert-offset {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.offset-inline-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #6b7280;
  font-size: 12px;
}

.offset-inline-action span {
  min-width: 0;
  line-height: 1.5;
}

.business-brief-card {
  padding: 10px 12px;
  background: #f8f9fb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.offset-brief-card {
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.offset-brief-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  color: #1a1a2e;
  font-size: 12px;
  font-weight: 700;
}

.offset-business-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.offset-business-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.offset-brief-tip {
  margin-top: 8px;
  color: #6b7280;
  font-size: 12px;
}

.offset-brief-total {
  margin-top: 8px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  text-align: right;
}

.refund-account-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.brief-title {
  font-size: 12px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.brief-grid {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.brief-grid > span {
  color: #6b7280;
  font-size: 12px;
}

.ar-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ar-label {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
}

.required {
  color: #dc2626;
  margin-left: 2px;
}

.upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.debt-status-reminder {
  font-size: 11px;
  color: #f59e0b;
  margin-top: 4px;
}

@media (max-width: 560px) {
  .offset-inline-action,
  .refund-account-grid,
  .offset-business-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
