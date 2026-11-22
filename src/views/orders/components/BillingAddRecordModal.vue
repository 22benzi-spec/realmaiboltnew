<template>
  <a-modal
    :open="visible"
    :title="getAddRecordTitle()"
    :confirm-loading="saving || uploading"
    @ok="handleSave"
    @cancel="handleCancel"
    :ok-text="getAddRecordOkText()"
    :ok-button-props="{ danger: addRecordType === '退款' }"
    cancel-text="取消"
    width="520px"
  >
<div
  class="add-record-form"
  tabindex="0"
  title="二维码支持点击此区域后按 Ctrl+V 粘贴图片"
  @paste="handleQrPaste"
>
        <div v-if="addRecordType === '补款'" class="offset-inline-action">
          <span>如有金额需抵消，录入后与本次补款一起提交</span>
          <a-button size="small" @click="openNestedOffset">账面抵消</a-button>
        </div>
        <div v-if="addRecordType === '补款' && pendingOffset" class="offset-brief-card">
          <div class="offset-brief-head">
            <span>随补款提交的账面抵消</span>
            <a-space :size="8">
              <a-button size="small" @click="openNestedOffset">编辑</a-button>
              <a-button size="small" danger @click="clearPendingOffset">移除</a-button>
            </a-space>
          </div>
          <div class="offset-brief-tip">抵消来源：{{ pendingOffset.sourceText }}</div>
          <div class="offset-brief-tip">抵消明细：{{ pendingOffset.detailText }}</div>
          <div class="offset-brief-total">抵消金额合计：¥{{ pendingOffset.totalAmount.toFixed(2) }}</div>
        </div>
        <div v-if="addRecordType === '退款'" class="offset-brief-card">
          <div class="offset-brief-head">
            <span>
              退款明细
              <span v-if="refundDetailsRequired" class="required">*</span>
              <template v-else-if="refundDetailsOptional">（选填）</template>
            </span>
            <a-button size="small" @click="addRefundBusinessRow">添加明细</a-button>
          </div>
          <div class="offset-business-list">
            <div v-for="(row, index) in addRecordForm.refund_business_rows" :key="index" class="offset-business-row">
              <a-select v-model:value="row.country_id" size="small" placeholder="国家" style="width:120px" show-search option-filter-prop="label">
                <a-select-option v-for="item in countryOptions" :key="item.id" :value="item.id" :label="item.country">
                  {{ item.country }}
                </a-select-option>
              </a-select>
              <a-select v-model:value="row.business_type" size="small" placeholder="测评类型" style="flex:1" show-search>
                <a-select-option v-for="item in businessTypeOptions" :key="item" :value="item">{{ item }}</a-select-option>
              </a-select>
              <a-input-number v-model:value="row.order_count" size="small" :min="1" :precision="0" style="width:110px" placeholder="退款单量" />
              <a-button
                size="small"
                danger
                :disabled="addRecordForm.refund_business_rows.length <= 1"
                @click="removeRefundBusinessRow(index)"
              >
                删除
              </a-button>
            </div>
          </div>
        </div>
        <OffsetDraftFields
          v-if="addRecordType === '账面抵消' && createTaskOffset"
          v-model="offsetDraft"
          :countries="countryOptions"
          :review-types="offsetReviewTypes"
        />
        <div v-if="addRecordType === '账面抵消' && !createTaskOffset" class="ar-field">
          <label class="ar-label">类型 <span class="required">*</span></label>
          <a-radio-group v-model:value="addRecordForm.offset_type" button-style="solid">
            <a-radio-button :value="1">截单抵消</a-radio-button>
            <a-radio-button :value="2">余额抵消</a-radio-button>
            <a-radio-button :value="3">补款抵消</a-radio-button>
          </a-radio-group>
        </div>
        <div v-if="addRecordType === '账面抵消' && !createTaskOffset && addRecordForm.offset_type" class="offset-brief-card">
          <div class="offset-brief-head">
            <span>来源任务</span>
            <a-button size="small" @click="addOffsetTaskRow">添加</a-button>
          </div>
          <div class="offset-business-list">
            <div v-for="(row, index) in addRecordForm.offset_task_rows" :key="index" class="offset-business-row">
              <a-input v-model:value="row.task_id" size="small" placeholder="任务号" style="flex:1" />
              <a-input-number v-model:value="row.amount_cny" size="small" :min="0" :precision="2" style="width:120px" placeholder="金额" />
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
          <div class="offset-brief-total">合计：¥{{ offsetTaskTotal.toFixed(2) }}</div>
        </div>
        <div v-if="addRecordType !== '账面抵消'" class="ar-field">
          <label class="ar-label">一级分类</label>
          <a-select v-model:value="addRecordForm.primary_category" style="width:100%" :loading="addRecordType === '补款' && supplementCategoryLoading" @change="onAddRecordPrimaryChange">
            <a-select-option v-for="item in addRecordPrimaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
          </a-select>
        </div>
        <div v-if="addRecordType !== '账面抵消'" class="ar-field">
          <label class="ar-label">二级分类</label>
          <a-select v-model:value="addRecordForm.secondary_categories" mode="multiple" style="width:100%" placeholder="可多选" :loading="addRecordType === '补款' && supplementCategoryLoading">
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
        <div v-if="addRecordType === '账面抵消' && !createTaskOffset && isCutoffOffset" class="offset-brief-card">
          <div class="offset-brief-head">
            <span>明细 <span class="required">*</span></span>
            <a-button size="small" @click="addOffsetBusinessRow">添加</a-button>
          </div>
          <div class="offset-business-list">
            <div v-for="(row, index) in addRecordForm.offset_business_rows" :key="index" class="offset-business-row">
              <a-select v-model:value="row.country_id" size="small" placeholder="国家" style="width:120px" show-search option-filter-prop="label">
                <a-select-option v-for="item in countryOptions" :key="item.id" :value="item.id" :label="item.country">
                  {{ item.country }}
                </a-select-option>
              </a-select>
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
        </div>
        <div v-if="addRecordType === '补款'" class="ar-field">
          <label class="ar-label">补款日期 <span class="required">*</span></label>
          <a-date-picker
            v-model:value="addRecordForm.payment_date_picker"
            style="width:100%"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
          />
        </div>
        <div v-if="addRecordType !== '账面抵消'" class="ar-field">
          <label class="ar-label">方式</label>
          <a-select v-model:value="addRecordForm.payment_method" style="width:100%" placeholder="请选择方式">
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
        <div v-if="showRecordedBy" class="ar-field">
          <label class="ar-label">操作人</label>
          <a-input v-model:value="addRecordForm.recorded_by" placeholder="录入人" />
        </div>
        <div v-if="addRecordType !== '账面抵消'" class="ar-field">
          <label class="ar-label">二维码</label>
          <a-upload
            v-model:file-list="addRecordFiles"
            list-type="picture-card"
            :before-upload="() => false"
            accept="image/*,.pdf"
            :multiple="true"
            :max-count="5"
          >
            <div v-if="addRecordFiles.length < 5" class="upload-btn">
              <PlusOutlined />
              <div style="margin-top:4px;font-size:12px">上传/粘贴</div>
            </div>
          </a-upload>
        </div>
        <div v-if="showCreateTaskOffsetExtras" class="ar-field">
          <label class="ar-label">账款状态变更</label>
          <a-radio-group v-model:value="addRecordForm.update_debt_status" size="small">
            <a-radio-button value="cleared">已结清</a-radio-button>
            <a-radio-button v-if="addRecordType !== '账面抵消'" value="owed">有欠款</a-radio-button>
            <a-radio-button v-if="addRecordType !== '账面抵消'" value="surplus">有余款</a-radio-button>
          </a-radio-group>
          <div v-if="addRecordForm.update_debt_status" class="debt-status-reminder">
            账款状态需手动确认，实际情况请以商务核实为准
          </div>
        </div>
        <div v-if="showCreateTaskOffsetExtras" class="ar-field">
          <label class="ar-label">账单备注</label>
          <a-textarea v-model:value="addRecordForm.notes" :rows="2" placeholder="账单备注（可选）" />
        </div>
      </div>
  </a-modal>
  <OffsetRecordModal
    v-model:open="nestedOffsetOpen"
    v-model:draft="nestedOffsetDraft"
    v-model:debt-status="nestedDebtStatus"
    v-model:debt-amount="nestedDebtAmount"
    v-model:debt-amount-usd="nestedDebtAmountUsd"
    v-model:remark="nestedRemark"
    :countries="countryOptions"
    :review-types="offsetReviewTypes"
    ok-text="加入补款"
    :confirm-loading="nestedOffsetSaving"
    @ok="confirmNestedOffset"
    @cancel="nestedOffsetOpen = false"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import OffsetDraftFields from './OffsetDraftFields.vue'
import OffsetRecordModal from './OffsetRecordModal.vue'
import { cloneOffsetDraft, createOffsetDraft, describeAttachedOffset, prepareOffsetDraft } from './offsetDraft'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

import { getCommonOptions, uploadCommonFile, searchTaskGroup } from '../prototypeService'
import { getTransactionFlowEnums } from '../prototypeService'
import { parseTransactionFlowCategories, supplementCategoryDefaults, supplementPrimaryCategories, type FlowCategory } from '../transactionFlowCategories'
import { getReceiveList, getReceiveEnums } from '../prototypeService'
import { submittedArrearsUsdAmount } from '../billStatusPayload'
import { useCurrentUser } from '../../../composables/useCurrentUser'
import {
  appendPastedImages,
  resolveSupplementPayerName,
} from './billingFormUtils'

type CountryOption = {
  id: number
  country: string
}

type BusinessDetailRow = {
  country_id: number | undefined
  business_type: string
  order_count: number | undefined
}

type PendingOffset = {
  fields: {
    offset_type: 1 | 2
    surplus_type?: number[]
    offset_details?: { surplus_type: 1 | 2; country_id: number; review_type: string; quantity: number }[]
  }
  offsetBasics: { task_basic_id: number; amount: number }[]
  totalAmount: number
  sourceText: string
  detailText: string
  draft: ReturnType<typeof createOffsetDraft>
  debtAmount: number | null
  debtAmountUsd: string
}

const props = defineProps<{
  order: any | null
  saving?: boolean
  showRecordedBy?: boolean
  createTaskOffset?: boolean
}>()

const emit = defineEmits<{
  save: [payload: { record: any; debtUpdate?: any }]
}>()

const visible = defineModel<boolean>('open', { required: true })
const addRecordType = defineModel<'补款' | '退款' | '账面抵消'>('recordType', { default: '补款' })

const { currentUser } = useCurrentUser()
const uploading = ref(false)
const saving = computed(() => !!props.saving)

const addRecordFiles = ref<any[]>([])
const offsetOpenedFromNestedAction = ref(false)
const nestedReturnRecordType = ref<'补款' | '退款' | null>(null)
const nestedParentRecordFormSnapshot = ref<any | null>(null)
const nestedParentRecordFilesSnapshot = ref<any[]>([])
const pendingOffset = ref<PendingOffset | null>(null)
const nestedOffsetOpen = ref(false)
const nestedOffsetSaving = ref(false)
const nestedOffsetDraft = ref(createOffsetDraft())
const nestedDebtStatus = ref<string | null>(null)
const nestedDebtAmount = ref<number | null>(null)
const nestedDebtAmountUsd = ref('')
const nestedRemark = ref('')
const countryOptions = ref<CountryOption[]>([])
const reviewTypeEnumMap = ref<Record<string, string>>({})
const businessTypeOptions = ['文字', '免评', '图片', '视频', 'Feedback']
const offsetReviewTypes = computed(() => businessTypeOptions.map(label => ({ label, value: mapReviewType(label) })))
const offsetDraft = ref(createOffsetDraft())
const supplementCategories = ref<FlowCategory[]>([])
const supplementCategoryLoading = ref(false)
const billingTransactionCategoryOptions = [
  { value: '业务收入', label: '业务收入', children: [{ value: '任务收入', label: '任务收入' }, { value: '补款收入', label: '补款收入' }] },
  { value: '业务支出', label: '业务支出', children: [{ value: '截单退款', label: '截单退款' }, { value: '退佣金', label: '退佣金' }, { value: '退本金差价', label: '退本金差价' }] },
  { value: '业务结算', label: '业务结算', children: [{ value: '账面抵消', label: '账面抵消' }] },
  { value: '运营支出', label: '运营支出', children: [{ value: 'IP采购', label: 'IP采购' }, { value: '服务器', label: '服务器' }, { value: '账号购买', label: '账号购买' }, { value: '礼品卡', label: '礼品卡' }, { value: '信用卡', label: '信用卡' }] },
  { value: '行政办公', label: '行政办公', children: [{ value: '行政支出', label: '行政支出' }, { value: '行政冲销', label: '行政冲销' }] },
  { value: '其他收入', label: '其他收入', children: [{ value: '其他收入', label: '其他收入' }] },
  { value: '其他支出', label: '其他支出', children: [{ value: '其他支出', label: '其他支出' }] },
]

const addRecordForm = ref({
  primary_category: '业务收入' as string | number,
  secondary_categories: ['补款收入'] as Array<string | number>,
  currency_mode: 'cny' as 'cny' | 'usd' | 'both',
  amount_cny: undefined as number | undefined,
  amount_usd: undefined as number | undefined,
  offset_type: undefined as 1 | 2 | 3 | undefined,
  offset_task_rows: [{ task_id: '', amount_cny: undefined as number | undefined }],
  refund_business_rows: [{ country_id: undefined, business_type: '', order_count: undefined }] as BusinessDetailRow[],
  offset_business_rows: [{ country_id: undefined, business_type: '', order_count: undefined }] as BusinessDetailRow[],
  payment_date_picker: null as any,
  payment_method: '',
  refund_account: '',
  refund_account_surname: '',
  payer_name: '',
  recorded_by: '',
  notes: '',
  update_debt_status: null as string | null,
})

const addRecordPrimaryOptions = computed(() => {
  if (addRecordType.value === '补款') return supplementPrimaryCategories(supplementCategories.value)
  return billingTransactionCategoryOptions.filter(item =>
    addRecordType.value === '退款'
      ? item.value === '业务支出'
      : addRecordType.value === '账面抵消'
        ? ['业务结算'].includes(item.value)
        : ['业务收入', '其他收入'].includes(item.value),
  )
})
const addRecordSecondaryOptions = computed(() =>
  addRecordPrimaryOptions.value.find(item => item.value === addRecordForm.value.primary_category)?.children || [],
)
const showSupplementCny = computed(() => addRecordType.value === '补款' && ['cny', 'both'].includes(addRecordForm.value.currency_mode))
const showSupplementUsd = computed(() => addRecordType.value === '补款' && ['usd', 'both'].includes(addRecordForm.value.currency_mode))
const isRefundAccountTransfer = computed(() => addRecordType.value === '退款' && ['银行转账', '支付宝'].includes(addRecordForm.value.payment_method))
const refundDetailsRequired = computed(() =>
  addRecordType.value === '退款'
  && addRecordForm.value.secondary_categories.includes('截单退款'),
)
const refundDetailsOptional = computed(() =>
  addRecordType.value === '退款'
  && addRecordForm.value.secondary_categories.length > 0
  && !refundDetailsRequired.value,
)
const isCutoffOffset = computed(() => addRecordType.value === '账面抵消' && addRecordForm.value.offset_type === 1)
const showCreateTaskOffsetExtras = computed(() =>
  !(addRecordType.value === '账面抵消' && (offsetOpenedFromNestedAction.value || props.createTaskOffset)),
)
const offsetTaskTotal = computed(() => addRecordForm.value.offset_task_rows.reduce((sum: number, row: any) => sum + Number(row.amount_cny || 0), 0))

function toReviewTypeLabel(value: any) {
  const key = String(value || '').trim()
  if (!key) return ''
  return reviewTypeEnumMap.value[key] || key
}

function normalizeBusinessType(value: any) {
  const raw = toReviewTypeLabel(value)
  if (!raw) return ''
  if (raw === '文字评' || raw === '文字') return '文字'
  if (raw === '图片评' || raw === '图片') return '图片'
  if (raw === '视频评' || raw === '视频') return '视频'
  if (raw === 'FB' || raw === 'Feedback') return 'Feedback'
  if (raw === '免评') return '免评'
  return raw
}

function getOrderCountryId(order: any): number | undefined {
  const value = order?.country_id ?? order?.country?.id
  if (value === undefined || value === null || value === '') return undefined
  const countryId = Number(value)
  return Number.isFinite(countryId) && countryId > 0 ? countryId : undefined
}

function getOrderCountryName(order: any): string {
  return String(order?.country?.country || order?.country?.name || order?.country_name || '').trim()
}

function ensureOrderCountryOption(order: any) {
  const countryId = getOrderCountryId(order)
  const country = getOrderCountryName(order)
  if (!countryId || !country || countryOptions.value.some(item => item.id === countryId)) return
  countryOptions.value.unshift({ id: countryId, country })
}

async function loadReviewTypeEnumMap(order: any) {
  const injected = order?._reviewTypeEnumMap
  if (injected && typeof injected === 'object' && Object.keys(injected).length) {
    reviewTypeEnumMap.value = injected
    return
  }
  if (Object.keys(reviewTypeEnumMap.value).length) return
  try {
    const response = await getReceiveEnums()
    if (response.code !== 200) throw new Error(response.msg || response.message || '获取测评类型枚举失败')
    const raw = response.data?.review_type || response.data?.review_types
    reviewTypeEnumMap.value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  } catch (error) {
    console.error('获取测评类型枚举失败:', error)
    reviewTypeEnumMap.value = {}
  }
}

async function loadCountryOptions() {
  try {
    const response = await getCommonOptions({ types: 'country' })
    if (response.code !== 200) throw new Error(response.msg || response.message || '获取国家列表失败')
    const countries = Array.isArray(response.data?.country) ? response.data.country : []
    countryOptions.value = countries
      .map((item: any) => {
        const id = Number(item?.id ?? item?.value)
        const country = String(item?.country ?? item?.name ?? item?.label ?? '').trim()
        return Number.isFinite(id) && id > 0 && country ? { id, country } : null
      })
      .filter((item: CountryOption | null): item is CountryOption => item !== null)
  } catch (error) {
    console.error('获取国家选项失败:', error)
    countryOptions.value = []
  }
  ensureOrderCountryOption(props.order)
}

function getAddRecordTitle() {
  const map: Record<string, string> = { 补款: '录入补款', 退款: '提交退款', 账面抵消: '录入账面抵消' }
  return map[addRecordType.value]
}

function getAddRecordOkText() {
  if (addRecordType.value === '账面抵消' && offsetOpenedFromNestedAction.value) return '加入补款'
  const map: Record<string, string> = { 补款: '录入补款', 退款: '提交退款', 账面抵消: '保存抵消' }
  return map[addRecordType.value]
}

async function loadSupplementCategories() {
  supplementCategoryLoading.value = true
  try {
    const response = await getTransactionFlowEnums()
    if (response.code !== 200) throw new Error(response.msg || response.message || '获取分类失败')
    supplementCategories.value = parseTransactionFlowCategories(response.data)
    if (addRecordType.value !== '补款' || addRecordForm.value.primary_category !== '') return
    const defaults = supplementCategoryDefaults(supplementCategories.value)
    addRecordForm.value.primary_category = defaults.primary
    addRecordForm.value.secondary_categories = defaults.secondary
  } catch (error: any) {
    message.error(error?.message || '获取分类失败')
  } finally {
    supplementCategoryLoading.value = false
  }
}

function onAddRecordPrimaryChange() {
  const nextValues = addRecordForm.value.secondary_categories.filter(value => addRecordSecondaryOptions.value.some(item => item.value === value))
  addRecordForm.value.secondary_categories = addRecordType.value === '退款'
    ? nextValues
    : nextValues.length
      ? nextValues
      : (addRecordSecondaryOptions.value[0] ? [addRecordSecondaryOptions.value[0].value] : [])
}

function createEmptyBusinessDetailRow(): BusinessDetailRow {
  return { country_id: undefined, business_type: '', order_count: undefined }
}

function addRefundBusinessRow() { addRecordForm.value.refund_business_rows.push(createEmptyBusinessDetailRow()) }
function removeRefundBusinessRow(index: number) { if (addRecordForm.value.refund_business_rows.length <= 1) return; addRecordForm.value.refund_business_rows.splice(index, 1) }
function addOffsetBusinessRow() { addRecordForm.value.offset_business_rows.push(createEmptyBusinessDetailRow()) }
function removeOffsetBusinessRow(index: number) { if (addRecordForm.value.offset_business_rows.length <= 1) return; addRecordForm.value.offset_business_rows.splice(index, 1) }
function addOffsetTaskRow() { addRecordForm.value.offset_task_rows.push({ task_id: '', amount_cny: undefined }) }
function removeOffsetTaskRow(index: number) { if (addRecordForm.value.offset_task_rows.length <= 1) return; addRecordForm.value.offset_task_rows.splice(index, 1) }

function cloneRecordForm(form: typeof addRecordForm.value) {
  return {
    ...form,
    secondary_categories: [...form.secondary_categories],
    offset_task_rows: form.offset_task_rows.map(row => ({ ...row })),
    refund_business_rows: form.refund_business_rows.map(row => ({ ...row })),
    offset_business_rows: form.offset_business_rows.map(row => ({ ...row })),
  }
}

function openAddRecord(type: '补款' | '退款' | '账面抵消', fromNestedAction = false) {
  if (type === '账面抵消' && fromNestedAction) {
    nestedReturnRecordType.value = '补款'
    nestedParentRecordFormSnapshot.value = cloneRecordForm(addRecordForm.value)
    nestedParentRecordFilesSnapshot.value = [...addRecordFiles.value]
  } else if (!fromNestedAction) {
    nestedReturnRecordType.value = null
    nestedParentRecordFormSnapshot.value = null
    nestedParentRecordFilesSnapshot.value = []
    pendingOffset.value = null
  }
  addRecordType.value = type
  if (props.createTaskOffset) offsetDraft.value = createOffsetDraft()
  offsetOpenedFromNestedAction.value = type === '账面抵消' && fromNestedAction
  addRecordFiles.value = []
  const order = props.order
  addRecordForm.value = {
    primary_category: type === '退款' ? '业务支出' : type === '账面抵消' ? '业务结算' : '',
    secondary_categories: type === '退款' || type === '补款' ? [] : ['账面抵消'],
    currency_mode: 'cny',
    amount_cny: undefined,
    amount_usd: undefined,
    offset_type: undefined,
    offset_task_rows: [{ task_id: '', amount_cny: undefined }],
    refund_business_rows: [createEmptyBusinessDetailRow()],
    // 抵消明细不预填任务类型（如「文字」），默认空行，且非必填（李运侠 改）
    offset_business_rows: [createEmptyBusinessDetailRow()],
    payment_date_picker: dayjs(),
    payment_method: type === '账面抵消' ? '账面抵消' : '',
    refund_account: '',
    refund_account_surname: '',
    payer_name: resolveSupplementPayerName(order),
    recorded_by: props.showRecordedBy
      ? (order?.employee?.name || currentUser.value?.name || '')
      : (currentUser.value?.name || ''),
    notes: '',
    update_debt_status: null,
  }
  if (type === '账面抵消' && fromNestedAction && pendingOffset.value) {
    const draft = pendingOffset.value.draft
    addRecordForm.value.offset_type = draft.type
    const taskRows = draft.sources.map(row => ({ task_id: row.task_id, amount_cny: row.amount }))
    addRecordForm.value.offset_task_rows = taskRows.length
      ? taskRows
      : [{ task_id: '', amount_cny: undefined }]
    const businessRows = ([1, 2] as const).flatMap(key => draft.details[key].map(row => ({
      country_id: row.country_id,
      business_type: row.review_type,
      order_count: row.quantity,
    })))
    addRecordForm.value.offset_business_rows = businessRows.length
      ? businessRows
      : [createEmptyBusinessDetailRow()]
  }
  onAddRecordPrimaryChange()
  if (type === '补款') void loadSupplementCategories()
}

function canReturnToParentRecord() {
  return addRecordType.value === '账面抵消'
    && offsetOpenedFromNestedAction.value
    && !!nestedReturnRecordType.value
    && !!nestedParentRecordFormSnapshot.value
}

function returnToParentRecord() {
  addRecordType.value = nestedReturnRecordType.value as '补款' | '退款'
  addRecordForm.value = cloneRecordForm(nestedParentRecordFormSnapshot.value)
  addRecordFiles.value = [...nestedParentRecordFilesSnapshot.value]
  offsetOpenedFromNestedAction.value = false
  nestedReturnRecordType.value = null
  nestedParentRecordFormSnapshot.value = null
  nestedParentRecordFilesSnapshot.value = []
}

function clearPendingOffset() {
  pendingOffset.value = null
}

function reviewTypeLabel(value: string) {
  return offsetReviewTypes.value.find(item => item.value === value)?.label || value
}

function openNestedOffset() {
  nestedOffsetDraft.value = pendingOffset.value ? cloneOffsetDraft(pendingOffset.value.draft) : createOffsetDraft()
  nestedDebtStatus.value = addRecordForm.value.update_debt_status
  nestedDebtAmount.value = pendingOffset.value?.debtAmount ?? null
  nestedDebtAmountUsd.value = pendingOffset.value?.debtAmountUsd || ''
  nestedRemark.value = addRecordForm.value.notes
  nestedOffsetOpen.value = true
  void loadCountryOptions()
}

async function confirmNestedOffset() {
  if (nestedOffsetSaving.value) return
  const prepared = prepareOffsetDraft(nestedOffsetDraft.value)
  if ('error' in prepared) {
    message.warning(prepared.error)
    return
  }
  const needsAmount = nestedDebtStatus.value === 'owed' || nestedDebtStatus.value === 'surplus'
  if (needsAmount && (nestedDebtAmount.value === null || nestedDebtAmount.value === undefined || Number.isNaN(Number(nestedDebtAmount.value)))) {
    message.warning('请填写差价金额（元）')
    return
  }
  const usd = needsAmount ? submittedArrearsUsdAmount(nestedDebtAmountUsd.value, true) : 0
  if (needsAmount && usd === null) {
    message.warning(String(nestedDebtAmountUsd.value ?? '').trim() ? '欠款金额(美元)请填写整数' : '请填写欠款金额(美元)')
    return
  }
  nestedOffsetSaving.value = true
  try {
    const sources = await resolveOffsetSources(prepared.sources.map(row => ({ task_id: row.task_id, amount_cny: row.amount })))
    const described = describeAttachedOffset(sources.offsetBasics, prepared.fields.offset_details, reviewTypeLabel)
    pendingOffset.value = {
      fields: prepared.fields,
      offsetBasics: sources.offsetBasics.map(({ task_basic_id, amount }) => ({ task_basic_id, amount })),
      totalAmount: described.totalAmount,
      sourceText: described.sourceText,
      detailText: described.detailText,
      draft: cloneOffsetDraft(nestedOffsetDraft.value),
      debtAmount: needsAmount ? Number(nestedDebtAmount.value) : null,
      debtAmountUsd: needsAmount ? nestedDebtAmountUsd.value : '',
    }
    addRecordForm.value.update_debt_status = nestedDebtStatus.value
    addRecordForm.value.notes = nestedRemark.value
    nestedOffsetOpen.value = false
  } catch (error: any) {
    message.error(error?.message || '查询抵消来源失败')
  } finally {
    nestedOffsetSaving.value = false
  }
}

function handleQrPaste(event: ClipboardEvent) {
  if (addRecordType.value === '账面抵消') return
  const clipboardFiles = Array.from(event.clipboardData?.files || [])
  const imageFiles = clipboardFiles.filter(file => file.type.startsWith('image/'))
  if (!imageFiles.length) return

  event.preventDefault()
  const result = appendPastedImages(addRecordFiles.value, imageFiles, 5)
  addRecordFiles.value = result.files
  if (result.addedCount > 0) message.success(`已粘贴 ${result.addedCount} 张图片`)
  if (result.limitReached) message.warning('二维码最多只能上传 5 个文件')
}

function handleDocumentQrPaste(event: ClipboardEvent) {
  if (!visible.value || event.defaultPrevented) return
  handleQrPaste(event)
}

onMounted(() => document.addEventListener('paste', handleDocumentQrPaste))
onBeforeUnmount(() => document.removeEventListener('paste', handleDocumentQrPaste))

function handleCancel() {
  if (canReturnToParentRecord()) {
    returnToParentRecord()
    return
  }

  visible.value = false
  offsetOpenedFromNestedAction.value = false
  nestedReturnRecordType.value = null
  nestedParentRecordFormSnapshot.value = null
  nestedParentRecordFilesSnapshot.value = []
  pendingOffset.value = null
}

watch(() => [visible.value, props.order?.id] as const, async ([open]) => {
  if (open && props.order) {
    if (countryOptions.value.length) ensureOrderCountryOption(props.order)
    else void loadCountryOptions()
    await loadReviewTypeEnumMap(props.order)
    openAddRecord(addRecordType.value)
  }
})

const TRANSFER_CHANNEL_MAP: Record<string, number> = { 银行转账: 1, 支付宝: 2, 微信: 3, 微信支付: 3, PayPal: 4, 其他: 5, 账面抵消: 5 }

const TRANSACTION_TYPE_BY_LABEL: Record<string, number> = {
  业务收入: 1,
  业务支出: 2,
  运营支出: 3,
  行政办公: 4,
  其他收入: 5,
  其他支出: 6,
  业务结算: 1,
}

const FLOW_TYPE_BY_LABEL: Record<string, number> = {
  任务收入: 1,
  补款收入: 2,
  截单退款: 3,
  退佣金: 4,
  退本金差价: 5,
  IP采购: 6,
  服务器: 7,
  账号购买: 8,
  礼品卡: 9,
  信用卡: 10,
  行政支出: 11,
  行政冲销: 12,
  其他收入: 13,
  其他支出: 14,
  账面抵消: 2,
}

const REVIEW_TYPE_BY_LABEL: Record<string, string> = {
  文字: 'words',
  免评: 'free_review',
  图片: 'image',
  视频: 'video',
  Feedback: 'feedback',
}

function resolveTransactionType(primaryLabel: string) {
  return TRANSACTION_TYPE_BY_LABEL[primaryLabel] || 1
}

function resolveFlowTypes(labels: string[]) {
  const ids = labels.map(label => FLOW_TYPE_BY_LABEL[label]).filter((id): id is number => id !== undefined)
  return ids.length ? ids : [2]
}

function mapReviewType(label: string) {
  const normalized = normalizeBusinessType(label)
  return REVIEW_TYPE_BY_LABEL[normalized] || normalized || 'words'
}

function extractReceiveList(data: any) {
  if (Array.isArray(data?.list)) return data.list
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data
  return []
}

function matchReceiveTask(list: any[], input: string) {
  const keyword = input.trim()
  if (!keyword) return null
  return list.find((item: any) => String(item.task_no || '') === keyword)
    || list.find((item: any) => String(item.id || '') === keyword)
}

async function resolveOffsetSources(rows: { task_id: string; amount_cny: number }[]) {
  const taskItems: { task_id: number; amount: number; label: string }[] = []
  const offsetBasics: { task_basic_id: number; amount: number; label: string }[] = []

  for (const row of rows) {
    const input = String(row.task_id || '').trim()
    const amount = row.amount_cny
    if (!input) continue
    if (amount <= 0) throw new Error(`请填写 ${input} 的抵消金额`)

    if (/TASK_BASIC/i.test(input)) {
      const response = await searchTaskGroup(input)
      if (response.code !== 200) throw new Error(response.msg || response.message || '查询任务组失败')
      const groups = Array.isArray(response.data) ? response.data : []
      const group = groups.find((item: any) => String(item.task_basics_no || '') === input)
      if (!group?.id) throw new Error(`未找到任务组：${input}`)
      offsetBasics.push({
        task_basic_id: Number(group.id),
        amount,
        label: String(group.task_basics_no || group.id),
      })
      continue
    }

    const response = await getReceiveList({ keyword: input, page: 1, page_size: 20 })
    if (response.code !== 200) throw new Error(response.msg || response.message || '查询任务失败')
    const task = matchReceiveTask(extractReceiveList(response.data), input)
    if (!task?.id) throw new Error(`未找到任务：${input}，请填写有效任务号或任务ID`)
    const taskBasicId = Number(task.task_basic_id || task.task_basic?.id || 0)
    if (!taskBasicId) throw new Error(`任务缺少任务组：${input}`)
    offsetBasics.push({
      task_basic_id: taskBasicId,
      amount,
      label: String(task.task_no || task.id),
    })
  }

  if (!taskItems.length && !offsetBasics.length) {
    throw new Error('请至少填写一行有效的抵消来源任务')
  }

  return { taskItems, offsetBasics }
}

async function uploadReceiptFiles() {
  const urls: string[] = []
  for (const f of addRecordFiles.value) {
    const file = f.originFileObj || f
    if (!file) continue
    const response = await uploadCommonFile(file as File)
    if (response.code !== 200) throw new Error(response.msg || response.message || '上传失败')
    urls.push(response.data?.url || response.data?.path || '')
  }
  return urls.filter(Boolean).join(',')
}

async function handleSave() {
  if (uploading.value) return
  if (!props.order?.id) return
  if (addRecordType.value !== '账面抵消' && !addRecordForm.value.payment_date_picker) {
    message.warning('请选择日期')
    return
  }
  if (addRecordType.value !== '账面抵消' && !addRecordForm.value.secondary_categories.length) {
    message.warning('请选择二级分类')
    return
  }
  if (addRecordType.value !== '账面抵消' && !addRecordForm.value.payment_method) {
    message.warning('请选择方式')
    return
  }

  const isRefund = addRecordType.value === '退款'
  const isOffset = addRecordType.value === '账面抵消'
  const preparedOffset = isOffset && props.createTaskOffset ? prepareOffsetDraft(offsetDraft.value) : undefined
  if (preparedOffset?.error) {
    message.warning(preparedOffset.error)
    return
  }
  if (isOffset && !preparedOffset && !addRecordForm.value.offset_type) {
    message.warning('请选择抵消类型')
    return
  }
  const attachedOffset = addRecordType.value === '补款' ? pendingOffset.value : null
  const offsetTaskRows = preparedOffset?.sources?.map(({ task_id, amount }) => ({ task_id, amount_cny: amount }))
    ?? addRecordForm.value.offset_task_rows
    .map((row: any) => ({ task_id: String(row.task_id || '').trim(), amount_cny: Number(row.amount_cny || 0) }))
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
  const offsetBusinessRows = (isCutoffOffset.value ? addRecordForm.value.offset_business_rows : [])
    .map((row: any) => ({ country_id: Number(row.country_id || 0), business_type: normalizeBusinessType(row.business_type), order_count: Number(row.order_count || 0) }))
    .filter((row: any) => row.country_id > 0 || row.business_type || row.order_count > 0)
  const refundBusinessRows = addRecordForm.value.refund_business_rows
    .map((row: any) => ({ country_id: Number(row.country_id || 0), business_type: normalizeBusinessType(row.business_type), order_count: Number(row.order_count || 0) }))
    .filter((row: any) => row.country_id > 0 || row.business_type || row.order_count > 0)

  if (isRefund || isOffset) {
    if (amountCny <= 0) { message.warning(isRefund ? '请输入退款金额' : '请输入抵消金额'); return }
    if (isRefund && !refundDetailsOptional.value && refundBusinessRows.length === 0) { message.warning('请至少填写一行退款明细'); return }
    if (isRefund && !refundDetailsOptional.value && refundBusinessRows.some((row: any) => row.country_id <= 0 || !row.business_type || row.order_count <= 0)) { message.warning('请完整填写每行退款国家、类型和退款单量'); return }
    if (isOffset && (offsetTaskRows.length === 0 || offsetTaskRows.some((row: any) => !row.task_id || row.amount_cny <= 0))) { message.warning('请完整填写每行抵消任务号和抵消金额'); return }
    if (isOffset && isCutoffOffset.value && offsetBusinessRows.length === 0) { message.warning('请至少填写一行抵消明细'); return }
    if (isOffset && isCutoffOffset.value && offsetBusinessRows.some((row: any) => row.country_id <= 0 || !row.business_type || row.order_count <= 0)) { message.warning('请完整填写每行抵消国家、类型和对应单量'); return }
  } else if (amountCny <= 0 && amountUsd <= 0 && !attachedOffset) {
    message.warning('请至少填写人民币或美元补款金额')
    return
  }

  try {
    uploading.value = true
    const voucherPath = addRecordType.value !== '账面抵消' ? await uploadReceiptFiles() : ''
    const resolvedOffset = isOffset ? await resolveOffsetSources(offsetTaskRows) : null

    const noteParts: string[] = []
    if (isOffset && resolvedOffset) {
      const sourceLabels = [
        ...resolvedOffset.taskItems.map(item => `${item.label} ¥${item.amount.toFixed(2)}`),
        ...resolvedOffset.offsetBasics.map(item => `${item.label} ¥${item.amount.toFixed(2)}`),
      ]
      noteParts.push(`抵消来源: ${sourceLabels.join('、')}`)
      if (offsetBusinessRows.length) {
        noteParts.push(`抵消明细: ${offsetBusinessRows.map((row: any) => `${row.business_type}${row.order_count}单`).join('、')}`)
      }
    }
    if (attachedOffset) {
      noteParts.push(`抵消来源: ${attachedOffset.sourceText}`)
      if (attachedOffset.detailText) noteParts.push(`抵消明细: ${attachedOffset.detailText}`)
    }
    if (props.showRecordedBy && addRecordForm.value.recorded_by) {
      noteParts.push(`操作人: ${addRecordForm.value.recorded_by}`)
    }
    if (addRecordForm.value.notes) noteParts.push(addRecordForm.value.notes)

    const paymentDate = typeof addRecordForm.value.payment_date_picker === 'string'
      ? addRecordForm.value.payment_date_picker
      : addRecordForm.value.payment_date_picker?.format('YYYY-MM-DD')

    const statusActionMap: Record<string, number> = { cleared: 1, owed: 2, surplus: 0 }
    const billTypeMap: Record<string, number> = { 补款: 1, 退款: 2, 账面抵消: 3 }
    const isSupplement = addRecordType.value === '补款'
    const transactionType = isOffset
      ? 1
      : isSupplement
        ? Number(addRecordForm.value.primary_category)
        : resolveTransactionType(String(addRecordForm.value.primary_category))
    const flowType = isOffset
      ? [2]
      : isSupplement
        ? addRecordForm.value.secondary_categories.map(item => Number(item)).filter(value => Number.isInteger(value) && value > 0)
        : resolveFlowTypes(addRecordForm.value.secondary_categories.map(String))

    if (!transactionType) {
      message.warning('请选择一级分类')
      return
    }
    if (!flowType.length) {
      message.warning('请选择二级分类')
      return
    }

    // 契约字段是 offset_details（抵消/退款业务明细：country_id、review_type、quantity）。
    // refund_details 不在 POST /admin/receive/bill_record 请求体里，后端不读。（李运侠 改；Apifox 2026-09-24T10:02:43.124Z）
    const refundDetailRows = isRefund
      ? (refundDetailsOptional.value
        ? refundBusinessRows.filter((row: any) => row.country_id > 0 && row.business_type && row.order_count > 0)
        : refundBusinessRows
      ).map((row: any) => ({
        country_id: row.country_id,
        review_type: mapReviewType(row.business_type),
        order_count: Number(row.order_count || 0),
      }))
      : []

    const record = {
      bill_type: billTypeMap[addRecordType.value] || 1,
      offset_type: isOffset ? Number(addRecordForm.value.offset_type) : (attachedOffset?.fields.offset_type || 0),
      ...(attachedOffset?.fields.surplus_type ? { surplus_type: attachedOffset.fields.surplus_type } : {}),
      task_id: Number(props.order.id),
      task_items: [],
      offset_task_basics: isOffset
        ? (resolvedOffset?.offsetBasics.map(item => ({ task_basic_id: item.task_basic_id, amount: item.amount })) || [])
        : (attachedOffset?.offsetBasics || []),
      offset_details: isOffset
        ? offsetBusinessRows.map((row: any) => ({
          country_id: row.country_id,
          review_type: mapReviewType(row.business_type),
          quantity: Number(row.order_count || 0),
        }))
        : isRefund
          ? refundDetailRows.map((row: { country_id: number; review_type: string; order_count: number }) => ({
            country_id: row.country_id,
            review_type: row.review_type,
            quantity: row.order_count,
          }))
          : (attachedOffset?.fields.offset_details || []),
      transaction_type: transactionType,
      flow_type: flowType,
      bill_cny_amount: amountCny,
      bill_usd_amount: amountUsd,
      payment_date: isOffset ? dayjs().format('YYYY-MM-DD') : paymentDate,
      transfer_channel: TRANSFER_CHANNEL_MAP[addRecordForm.value.payment_method] || 5,
      receive_account: isRefund ? (addRecordForm.value.refund_account || '') : '',
      surname: isRefund ? (addRecordForm.value.refund_account_surname || '') : '',
      receive_name: addRecordForm.value.payer_name.trim() || resolveSupplementPayerName(props.order),
      voucher_path: voucherPath,
      status_action: addRecordForm.value.update_debt_status
        ? (statusActionMap[addRecordForm.value.update_debt_status] ?? 0)
        : 0,
      remark: isOffset ? addRecordForm.value.notes : noteParts.join(' | '),
    }

    let debtUpdate: any
    if (addRecordForm.value.update_debt_status) {
      const paymentStatusMap: Record<string, number> = { cleared: 4, owed: 2, surplus: 3 }
      debtUpdate = {
        task_id: Number(props.order.id),
        payment_status: paymentStatusMap[addRecordForm.value.update_debt_status] || 1,
        arrears_amount: addRecordForm.value.update_debt_status === 'cleared'
          ? '0'
          : attachedOffset?.debtAmount != null
            ? String(Number(attachedOffset.debtAmount).toFixed(2))
            : String(amountCny || 0),
        ...(attachedOffset?.debtAmount != null && addRecordForm.value.update_debt_status !== 'cleared'
          ? { arrears_usd_amount: submittedArrearsUsdAmount(attachedOffset.debtAmountUsd, true) ?? 0 }
          : {}),
      }
    }

    if (preparedOffset?.fields) {
      const { offset_type, offset_details, ...rest } = record
      emit('save', { record: { ...rest, ...preparedOffset.fields }, debtUpdate })
    } else {
      emit('save', { record, debtUpdate })
    }
  } catch (error: any) {
    message.error(error?.message || '操作失败')
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.add-record-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;
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
  font-size: 14px;
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
  font-size: 14px;
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
  font-size: 14px;
}

.offset-brief-total {
  margin-top: 8px;
  color: #2563eb;
  font-size: 14px;
  font-weight: 700;
  text-align: right;
}

.refund-account-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.brief-title {
  font-size: 14px;
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
  font-size: 14px;
}

.ar-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ar-label {
  font-size: 14px;
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
