<template>
  <a-drawer
    :open="open"
    :title="groupDrawerTitle"
    width="1100"
    placement="right"
    :body-style="{ padding: '0', background: 'var(--eva-bg-soft, #f8f9fb)' }"
    @close="emit('close')"
  >
    <a-spin :spinning="loading">
    <template v-if="displayGroupData">
      <div class="gbh">
        <div class="gbh-left">
          <div class="gbh-meta">
            <span v-if="displayGroupData.customer_name">{{ displayGroupData.customer_name }}</span>
            <span v-if="displayGroupData.customer_name && displayGroupData.batch_date" class="gbh-sep">·</span>
            <span v-if="displayGroupData.batch_date">{{ displayGroupData.batch_date }}</span>
          </div>
        </div>
      </div>

      <div v-if="pendingDiffOrderCount > 0" class="gbh-alert-wrap">
        <div class="gbh-alert">
          <span class="alert-icon">!</span>
          <span>含{{ pendingDiffOrderCount }}个任务存在差价，请及时处理</span>
        </div>
      </div>

      <div class="gb-body">
        <div class="gb-section">
          <div class="section-header">
            <span class="section-title">账款核对与处理</span>
            <a-tag color="blue" size="small">{{ billGroupRows.length }} 个组</a-tag>
            <div class="section-actions">
              <a-select
                v-model:value="batchBillingTarget"
                size="small"
                style="width: 120px"
                placeholder="基础入账状态"
                allow-clear
                @change="applyBatchBillingStatus"
              >
                <a-select-option v-for="item in BILLING_STATUS_OPTIONS" :key="item.value" :value="item.value">
                  {{ item.label }}
                </a-select-option>
              </a-select>
              <a-button size="small" type="primary" :loading="statusSaving" @click="saveStatusEdits">保存修改</a-button>
            </div>
          </div>

          <div class="gbd-group-table" :class="{ 'has-refund': showGroupRefundColumn }">
            <div class="gbd-group-head">
              <span class="col-exp" />
              <span class="col-batch">组任务号</span>
              <span class="col-num">任务数</span>
              <span class="col-amt">实际应收</span>
              <span class="col-amt">累计实收</span>
              <span class="col-amt">累计抵消</span>
              <span v-if="showGroupRefundColumn" class="col-amt">累计退款</span>
              <span class="col-amt">待结差额</span>
              <span class="col-customer">客户</span>
            </div>
            <div v-for="group in billGroupRows" :key="group.key" class="gbd-group-block">
              <div class="gbd-group-row" :class="{ 'is-open': isGroupExpanded(group.key) }">
                <button
                  type="button"
                  class="col-exp group-expand-btn"
                  :aria-label="isGroupExpanded(group.key) ? '折叠组任务' : '展开组任务'"
                  :aria-expanded="isGroupExpanded(group.key)"
                  @click="toggleGroup(group.key)"
                >
                  <span aria-hidden="true">{{ isGroupExpanded(group.key) ? '▼' : '▶' }}</span>
                </button>
                <button type="button" class="col-batch group-batch-btn" @click="toggleGroup(group.key)">{{ group.batchNumber }}</button>
                <span class="col-num">{{ group.taskCount }}</span>
                <span class="col-amt">¥{{ formatGroupMoney(group.receivable) }}</span>
                <span class="col-amt">{{ group.merge ? '合并操作' : `¥${formatGroupMoney(group.collected)}` }}</span>
                <span class="col-amt">{{ group.merge ? '合并操作' : `¥${formatGroupMoney(group.offset)}` }}</span>
                <span v-if="showGroupRefundColumn" class="col-amt">{{ group.merge ? '合并操作' : (Number(group.refunded) > 0 ? `¥${formatGroupMoney(group.refunded)}` : '-') }}</span>
                <span class="col-amt">{{ group.merge ? '合并操作' : formatGroupDiff(group.diff) }}</span>
                <span class="col-customer">{{ group.customerName || '-' }}</span>
              </div>
              <div v-if="isGroupExpanded(group.key)" class="gbd-task-wrap">
                <div class="gbd-task-head">
                  <span class="t-asin">Asin</span>
                  <span class="t-amt">实际应收</span>
                  <span class="t-status">基础入账状态</span>
                  <span class="t-debt">差价状态</span>
                  <span class="t-debt-amt">差价金额（元）</span>
                  <span class="t-debt-usd">差价金额（美元）</span>
                </div>
                <div v-for="order in group.orders" :key="order.id" class="gbd-task-row">
                  <span class="t-asin">{{ order.product?.asin || '-' }}</span>
                  <span class="t-amt">¥{{ formatGroupMoney(order._actualReceivable) }}</span>
                  <span class="t-status">
                    <a-select v-model:value="order._groupBillingStatus" size="small" style="width: 86px" :disabled="statusSaving">
                      <a-select-option v-for="item in BILLING_STATUS_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
                    </a-select>
                  </span>
                  <span class="t-debt">
                    <a-select v-model:value="order._groupPaymentStatus" size="small" style="width: 112px" :disabled="statusSaving" @change="onGroupPaymentStatusChange(order)">
                      <a-select-option v-for="item in groupDiffStatusOptions(order)" :key="item.value" :value="item.value" :disabled="item.disabled">{{ item.label }}</a-select-option>
                    </a-select>
                  </span>
                  <span class="t-debt-amt">
                    <a-input-number v-model:value="order._groupArrearsAmount" size="small" :min="0" :precision="2" style="width: 96px" :disabled="statusSaving || !canEditGroupDebt(order)" />
                  </span>
                  <span class="t-debt-usd">
                    <a-input v-model:value="order._groupArrearsUsd" size="small" style="width: 96px" :disabled="statusSaving || !canEditGroupDebt(order)" />
                  </span>
                </div>
              </div>
            </div>
            <div v-if="billGroupRows.length === 0" class="orders-empty">暂无任务组账单数据</div>
            <div v-else class="gbd-group-foot">
              <span class="col-exp" />
              <span class="col-batch">合计</span>
              <span class="col-num">{{ apiBillTotal?.task_count || localOrders.length }}</span>
              <span class="col-amt">¥{{ formatGroupMoney(apiBillTotal?.actual_receivable_amount) }}</span>
              <span class="col-amt">{{ groupTotalsMerged ? '—' : `¥${formatGroupMoney(apiBillTotal?.income_flow_amount)}` }}</span>
              <span class="col-amt">{{ groupTotalsMerged ? '—' : `¥${formatGroupMoney(apiBillTotal?.offset_amount)}` }}</span>
              <span v-if="showGroupRefundColumn" class="col-amt">{{ groupTotalsMerged ? '—' : `¥${formatGroupMoney(apiBillTotal?.refund_amount)}` }}</span>
              <span class="col-amt">{{ groupTotalsMerged ? '—' : formatGroupDiff(apiBillTotal?.pending_settlement_diff) }}</span>
              <span class="col-customer" />
            </div>
          </div>

          <div class="gb-section settle-section">
            <div class="section-header"><span class="section-title">结算账单</span></div>
            <a-textarea :value="settleBillSourceText" readonly :rows="Math.max(4, settleBillSourceText.split('\n').length || 1)" class="bill-editable-text" placeholder="账单内容..." />
            <div class="settle-actions">
              <a-button size="small" @click="copySettleBill">复制账单</a-button>
            </div>
          </div>

          <div class="batch-form">
            <div class="bf-submit">
              <a-button type="primary" @click="openRecordModal('supplement')">录入补款</a-button>
              <a-button @click="openRecordModal('offset')">账面抵消</a-button>
              <a-button danger @click="openRecordModal('refund')">提交退款</a-button>
            </div>
          </div>
        </div>

        <div class="gb-section">
          <div class="section-header">
            <span class="section-title">整组交易明细</span>
            <a-tag color="default" size="small">{{ displayGroupPayments.length }} 条</a-tag>
          </div>
          <div v-if="displayGroupPayments.length === 0" class="records-mock-tip">暂无交易明细</div>
          <div v-else class="payment-lines">
            <div class="payment-line payment-line-head">
              <span>时间</span>
              <span>流水号</span>
              <span>交易类型</span>
              <span>收支方向</span>
              <span>金额</span>
              <span>方式</span>
              <span>账单备注</span>
            </div>
            <div v-for="payment in displayGroupPayments" :key="payment.id" class="payment-line">
              <span class="payment-line-date">{{ payment.payment_date || '-' }}</span>
              <span class="payment-line-number">{{ payment.flow_no }}</span>
              <span><a-tag :color="getPaymentTypeColor(payment.payment_type)" size="small">{{ payment.payment_type }}</a-tag></span>
              <span><a-tag :color="getPaymentDirectionColor(payment.direction)" size="small">{{ payment.direction }}</a-tag></span>
              <span :class="payment.direction === '支出' ? 'payment-line-refund' : payment.direction === '账面抵消' ? 'payment-line-offset' : 'payment-line-income'">
                {{ payment.direction === '支出' ? '-' : payment.direction === '账面抵消' ? '抵 ' : '+' }}¥{{ Math.abs(Number(payment.amount_cny || 0)).toFixed(2) }}
              </span>
              <span class="payment-line-meta">{{ payment.payment_method || '-' }}</span>
              <span class="payment-line-notes">{{ payment.finance_remark }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
    </a-spin>

    <a-modal
      :open="recordModalOpen"
      :title="recordModalTitle"
      :ok-text="recordModalOkText"
      :ok-button-props="{ danger: recordMode === 'refund' }"
      :confirm-loading="recordSaving || uploading"
      cancel-text="取消"
      width="560px"
      @ok="openSupplementDiffModal()"
      @cancel="handleRecordCancel"
    >
      <div
        class="add-record-form"
        tabindex="0"
        title="二维码支持点击此区域后按 Ctrl+V 粘贴图片"
        @paste="handleQrPaste"
      >
        <div v-if="recordMode === 'refund'" class="batch-record-summary">{{ recordSummaryLine }}</div>
        <div v-if="recordMode === 'supplement'" class="offset-inline-action">
          <span>如果部分金额已用账面抵消，录入后与本次补款一起提交。</span>
          <a-button size="small" @click="openNestedOffset">账面抵消</a-button>
        </div>
        <div v-if="recordMode === 'supplement' && pendingOffset" class="offset-brief-card">
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
        <div v-if="recordMode !== 'offset'" class="ar-field">
          <label class="ar-label">一级分类</label>
          <a-select v-model:value="recordForm.primary_category" style="width:100%" :loading="recordMode === 'supplement' && supplementCategoryLoading" @change="onPrimaryCategoryChange">
            <a-select-option v-for="item in primaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
          </a-select>
        </div>
        <div v-if="recordMode !== 'offset'" class="ar-field">
          <label class="ar-label">二级分类</label>
          <a-select v-model:value="recordForm.secondary_categories" mode="multiple" style="width:100%" placeholder="可多选" :loading="recordMode === 'supplement' && supplementCategoryLoading">
            <a-select-option v-for="item in secondaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
          </a-select>
        </div>
        <div v-if="recordMode === 'supplement'" class="ar-field">
          <label class="ar-label">补款币种</label>
          <a-radio-group v-model:value="recordForm.currency_mode" size="small">
            <a-radio-button value="cny">人民币</a-radio-button>
            <a-radio-button value="usd">美元</a-radio-button>
            <a-radio-button value="both">同时填写</a-radio-button>
          </a-radio-group>
        </div>
        <div v-if="showSupplementCny" class="ar-field">
          <label class="ar-label">补款金额（人民币）</label>
          <a-input-number v-model:value="recordForm.amount_cny" style="width:100%" :min="0" :precision="2" placeholder="人民币金额" />
        </div>
        <div v-if="showSupplementUsd" class="ar-field">
          <label class="ar-label">补款金额（USD）</label>
          <a-input-number v-model:value="recordForm.amount_usd" style="width:100%" :min="0" :precision="2" placeholder="美金金额" />
        </div>
        <div v-if="recordMode === 'refund'" class="offset-brief-card">
          <div class="offset-brief-head">
            <span>
              退款明细
              <span v-if="refundDetailsRequired" class="required">*</span>
              <template v-else-if="refundDetailsOptional">（选填）</template>
            </span>
          </div>
          <div class="offset-business-list">
            <div v-for="(row, index) in recordForm.business_rows" :key="index" class="offset-business-row">
              <a-select v-model:value="row.country_id" size="small" placeholder="国家" style="width:120px" show-search option-filter-prop="label">
                <a-select-option v-for="item in countryOptions" :key="item.id" :value="item.id" :label="item.country">{{ item.country }}</a-select-option>
              </a-select>
              <a-select v-model:value="row.review_type" size="small" placeholder="测评类型" style="flex:1">
                <a-select-option v-for="item in businessTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
              </a-select>
              <a-input-number v-model:value="row.quantity" size="small" :min="1" :precision="0" style="width:105px" placeholder="单量" />
              <a-button v-if="index === 0" size="small" aria-label="添加退款明细" @click="addBusinessRow">+</a-button>
              <a-button v-else size="small" danger aria-label="删除退款明细" @click="removeBusinessRow(index)">-</a-button>
            </div>
          </div>
        </div>
        <div v-if="recordMode === 'supplement'" class="ar-field">
          <label class="ar-label">补款日期 <span class="required">*</span></label>
          <a-date-picker v-model:value="recordForm.payment_date" value-format="YYYY-MM-DD" style="width:100%" />
        </div>
        <div v-if="recordMode !== 'offset'" class="ar-field">
          <label class="ar-label">方式</label>
          <a-select v-model:value="recordForm.payment_method" style="width:100%" placeholder="请选择方式">
            <a-select-option value="银行转账">银行转账</a-select-option>
            <a-select-option value="微信">微信</a-select-option>
            <a-select-option value="支付宝">支付宝</a-select-option>
            <a-select-option value="其他">其他</a-select-option>
          </a-select>
        </div>
        <div v-if="recordMode === 'refund' && ['银行转账', '支付宝'].includes(recordForm.payment_method)" class="refund-account-grid">
          <div class="ar-field"><label class="ar-label">退款账号</label><a-input v-model:value="recordForm.receive_account" /></div>
          <div class="ar-field"><label class="ar-label">姓氏</label><a-input v-model:value="recordForm.surname" /></div>
        </div>
        <div v-if="recordMode === 'refund'" class="ar-field">
          <label class="ar-label">退款金额 <span class="required">*</span></label>
          <a-input-number v-model:value="recordForm.amount_cny" style="width:100%" :min="0" :precision="2" placeholder="退款金额" />
        </div>
        <div v-if="recordMode !== 'offset'" class="ar-field">
          <label class="ar-label">{{ recordMode === 'refund' ? '退款对象' : '付款人' }}</label>
          <a-input v-model:value="recordForm.receive_name" placeholder="姓名" />
        </div>
        <div v-if="recordMode !== 'offset'" class="ar-field">
          <label class="ar-label">二维码</label>
          <a-upload v-model:file-list="recordFiles" list-type="picture-card" :before-upload="() => false" accept="image/*,.pdf" :multiple="true" :max-count="5">
            <div v-if="recordFiles.length < 5"><PlusOutlined /><div class="upload-text">上传/粘贴</div></div>
          </a-upload>
        </div>
        <div class="ar-field"><label class="ar-label">账单备注</label><a-textarea v-model:value="recordForm.remark" :rows="2" placeholder="账单备注（可选）" /></div>
      </div>
    </a-modal>
    <a-modal
      :open="supplementDiffOpen"
      title="确认结清"
      ok-text="确定"
      cancel-text="取消"
      width="860px"
      :confirm-loading="recordSaving || uploading"
      @ok="saveBatchRecord(undefined, 'submit')"
      @cancel="closeSupplementDiff"
    >
      <div class="supplement-diff-toolbar">
        <a-button size="small" @click="selectAllSupplementDiff">全选</a-button>
        <a-button size="small" @click="invertSupplementDiff">反选</a-button>
        <span class="supplement-diff-summary">{{ supplementDiffSummaryText }}</span>
      </div>
      <a-table
        :columns="supplementDiffColumns"
        :data-source="supplementDiffRows"
        :row-selection="supplementDiffRowSelection"
        row-key="id"
        size="small"
        :pagination="{ pageSize: 20, hideOnSinglePage: true }"
        :locale="{ emptyText: '暂无有欠款或有余款的数据' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'paymentStatus'">
            {{ supplementDiffStatusLabel(record.paymentStatus) }}
          </template>
          <template v-else-if="column.key === 'amountCny'">
            {{ supplementDiffAmountText(record.amountCny) }}
          </template>
          <template v-else-if="column.key === 'amountUsd'">
            {{ supplementDiffAmountText(record.amountUsd) }}
          </template>
        </template>
      </a-table>
    </a-modal>
    <OffsetRecordModal
      v-model:open="directOffsetOpen"
      v-model:draft="offsetDraft"
      v-model:debt-status="recordForm.update_debt_status"
      v-model:debt-amount="recordForm.debt_amount"
      v-model:debt-amount-usd="recordForm.debt_amount_usd"
      v-model:remark="recordForm.remark"
      :countries="countryOptions"
      :review-types="businessTypeOptions"
      :summary="offsetSummaryLine"
      :show-debt-amounts="false"
      :show-debt-status="false"
      :show-flow-categories="true"
      :flow-category-loading="supplementCategoryLoading"
      :flow-primary="offsetFlowPrimaryValue"
      :flow-primary-options="offsetFlowPrimaryOptions"
      :flow-secondary-options="offsetFlowSecondaryOptions"
      v-model:flow-secondary="recordForm.secondary_categories"
      ok-text="保存抵消"
      :confirm-loading="recordSaving || uploading"
      @cancel="handleDirectOffsetCancel"
    >
      <template #footer>
        <div class="offset-record-footer">
          <a-button v-show="false" data-group-offset-log @click="exportOffsetLog">导出日志</a-button>
          <a-button @click="handleDirectOffsetCancel">取消</a-button>
          <span @click.capture="captureOffsetSaveClick">
            <a-button type="primary" :loading="recordSaving || uploading" @click="saveOffsetFromFooter">保存抵消</a-button>
          </span>
        </div>
      </template>
    </OffsetRecordModal>
    <OffsetRecordModal
      v-model:open="nestedOffsetOpen"
      v-model:draft="nestedOffsetDraft"
      v-model:debt-status="nestedDebtStatus"
      v-model:debt-amount="nestedDebtAmount"
      v-model:debt-amount-usd="nestedDebtAmountUsd"
      v-model:remark="nestedRemark"
      :countries="countryOptions"
      :review-types="businessTypeOptions"
      :summary="offsetSummaryLine"
      :show-debt-amounts="false"
      ok-text="加入补款"
      :confirm-loading="nestedOffsetSaving"
      @ok="confirmNestedOffset"
      @cancel="nestedOffsetOpen = false"
    />
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

import { getCommonOptions, searchTaskGroup, uploadCommonFile } from '../prototypeService'
import { getTransactionFlowEnums } from '../prototypeService'
import { parseTransactionFlowCategories, supplementCategoryDefaults, supplementPrimaryCategories, type FlowCategory } from '../transactionFlowCategories'
import {
  createReceiveBillRecord,
  getReceiveList,
  postReceiveBatchBill,
  saveReceiveBillStatus,
} from '../prototypeService'
import { submittedArrearsUsdAmount } from '../billStatusPayload'
import { changedGroupStatusOrders, groupArrearsInputText, groupDiffStatusOptions, groupStatusEditKey } from '../groupBillSave'
import { billTaskIds, buildSupplementDiffOpenState, checkedDiffSummaryText, invertDiffIds, selectAllDiffIds } from '../supplementDiffConfirm'
import { readReceiveBillGroups } from '../receiveBillResponse'
import { buildBillCopyText } from './billAmountText'
import OffsetRecordModal from './OffsetRecordModal.vue'
import { cloneOffsetDraft, createOffsetDraft, describeAttachedOffset, prepareOffsetDraft, type OffsetDraft } from './offsetDraft'
import { createGroupOffsetTrace, downloadGroupOffsetLog, groupOffsetErrorLocation, startGroupOffsetLogRetention, type GroupOffsetTrace } from './groupOffsetLog'
import {
  getFirstBill,
  getPaymentDirectionColor,
  getPaymentTypeColor,
  hasRealDebt,
  hasRealSurplus,
  isPaymentCleared,
  mapBillRecords,
} from '../helpers'
import {
  appendPastedImages,
  BASIC_BILLING_STATUS_OPTIONS,
  resolveMarkedBusinessName,
  resolveSupplementPayerName,
} from './billingFormUtils'

const props = defineProps<{
  open: boolean
  groupData: any | null
  groupOrders: any[]
  billData?: any | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated'): void
}>()

const localOrders = ref<any[]>([])
const statusSaving = ref(false)
const savedStatusSnapshot = ref<Record<string, string>>({})
const batchBillingTarget = ref<number | undefined>(undefined)
const refreshedBillData = ref<any | null>(null)

const BILLING_STATUS_OPTIONS = BASIC_BILLING_STATUS_OPTIONS

const PAYMENT_STATUS_OPTIONS = [
  { label: '无异常', value: 1 },
  { label: '有欠款', value: 2 },
  { label: '有余款', value: 3 },
  { label: '已结清', value: 4 },
]
const DIFF_STATUS_OPTIONS = PAYMENT_STATUS_OPTIONS.filter(item => item.value === 2 || item.value === 3)

const effectiveBillData = computed(() => refreshedBillData.value || props.billData)
const apiTaskBasic = computed(() => effectiveBillData.value?.task_basic || null)
const apiBillPayload = computed(() => readReceiveBillGroups(effectiveBillData.value))
const apiBillTotal = computed(() => apiBillPayload.value.total)
const apiBillOverview = computed(() => apiBillPayload.value.tasks)
const apiFlowLinks = computed(() => Array.isArray(effectiveBillData.value?.flow_links) ? effectiveBillData.value.flow_links : [])
const displayGroupData = computed(() => {
  const taskBasic = apiTaskBasic.value
  if (!taskBasic) return props.groupData
  return {
    ...props.groupData,
    label: props.groupData?.label || props.groupData?.batch_number || apiBillOverview.value[0]?.task_basics_no,
    batch_number: props.groupData?.batch_number || apiBillOverview.value[0]?.task_basics_no,
    customer_name: taskBasic.customer_name,
    employee_name: apiBillPayload.value.groups[0]?.employee_name || props.groupData?.employee_name,
    batch_date: props.groupData?.batch_date,
    order_count: apiBillPayload.value.total?.task_count || apiBillOverview.value.length || props.groupData?.order_count,
  }
})

const groupTitle = computed(() => displayGroupData.value?.label || displayGroupData.value?.batch_number || '')
const groupDrawerTitle = computed(() => apiBillPayload.value.groups.length > 1 ? '组结算工作台' : `组账单：${groupTitle.value || '-'}`)
const expandedGroupKeys = ref<string[]>([])

type GroupBillTableRow = {
  key: string
  batchNumber: string
  taskCount: number
  receivable: unknown
  collected: unknown
  offset: unknown
  refunded: unknown
  diff: unknown
  merge: boolean
  customerName: unknown
  orders: any[]
}

const billGroupRows = computed((): GroupBillTableRow[] => apiBillPayload.value.groups.map((group: any) => ({
  key: String(group.task_basics_no || group.task_basic_id || group.task_no || group.id),
  batchNumber: group.task_basics_no || group.task_no || '-',
  taskCount: group.task_count ?? (Array.isArray(group.tasks) ? group.tasks.length : 1),
  receivable: group.actual_receivable_amount,
  collected: group.income_flow_amount,
  offset: group.offset_amount,
  refunded: group.refund_amount,
  diff: group.pending_settlement_diff,
  merge: Number(group.is_merge_operation) === 1,
  customerName: group.employee_name,
  orders: (Array.isArray(group.tasks) ? group.tasks : [group])
    .map((task: any) => localOrders.value.find(item => String(item.id) === String(task.id)))
    .filter(Boolean),
})))
const showGroupRefundColumn = computed(() =>
  Number(apiBillTotal.value?.refund_amount || 0) > 0
  || billGroupRows.value.some(group => Number(group.refunded || 0) > 0)
)
const groupTotalsMerged = computed(() => billGroupRows.value.some(group => group.merge))

function formatGroupMoney(value: unknown) {
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
}

function formatGroupDiff(value: unknown) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount) || Math.abs(amount) < 0.005) return '¥0.00'
  if (amount > 0) return `+¥${amount.toFixed(2)}`
  return `-¥${Math.abs(amount).toFixed(2)}`
}

function isGroupExpanded(key: string) {
  return expandedGroupKeys.value.includes(key)
}

function toggleGroup(key: string) {
  expandedGroupKeys.value = isGroupExpanded(key)
    ? expandedGroupKeys.value.filter(item => item !== key)
    : [...expandedGroupKeys.value, key]
}

function canEditGroupDebt(order: any) {
  return [2, 3].includes(Number(order?._groupPaymentStatus))
}

function settleCopyOrders() {
  return billGroupRows.value.flatMap(group => group.orders.map((order: any) => ({
    created_at: order.created_at,
    asin: order.asin || order.product?.asin,
    payment_status: order.bill?.[0]?.payment_status ?? order.payment_status ?? order._groupPaymentStatus,
    arrears_amount: order.bill?.[0]?.arrears_amount ?? order.arrears_amount,
    arrears_usd_amount: order.arrears_usd_amount ?? order.bill?.[0]?.arrears_usd_amount,
  })))
}

const settleBillSourceText = computed(() => buildBillCopyText(settleCopyOrders()))

async function copyBillText(text: string) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('copy-failed')
}

async function copySettleBill() {
  const text = settleBillSourceText.value.trim()
  if (!text) {
    message.warning('没有欠款数据可复制')
    return
  }
  try {
    await copyBillText(text)
    message.success('账单已复制到剪贴板')
  } catch {
    message.error('复制失败，请手动复制')
  }
}

watch(() => billGroupRows.value.map(group => group.key).join('|'), (signature) => {
  const keys = signature ? signature.split('|') : []
  expandedGroupKeys.value = expandedGroupKeys.value.filter(key => keys.includes(key))
}, { immediate: true })

watch(
  () => [props.groupOrders, props.billData, refreshedBillData.value] as const,
  ([orders]) => {
    localOrders.value = apiBillOverview.value.length
      ? apiBillOverview.value.map((order: any) => normalizeApiOverviewOrder(order))
      : orders.map(order => normalizeGroupOrder(order))
    rememberStatusSnapshot(localOrders.value)
  },
  { immediate: true, deep: true },
)

function taskBill(order: any) {
  if (Array.isArray(order?.bill) && order.bill.length) return order.bill
  if (order?.basic_bill_status === undefined && order?.payment_status === undefined && order?.arrears_amount === undefined) return []
  return [{
    basic_bill_status: order.basic_bill_status,
    basic_bill_status_label: order.basic_bill_status_label,
    payment_status: order.payment_status,
    payment_status_label: order.payment_status_label,
    arrears_amount: order.arrears_amount,
    arrears_usd_amount: order.arrears_usd_amount,
  }]
}

function normalizeApiOverviewOrder(order: any) {
  const sourceOrder = props.groupOrders.find(item => String(item.id) === String(order.id)) || {}
  const bill = taskBill(order)
  return {
    ...sourceOrder,
    id: String(order.id),
    task_no: order.task_no,
    created_at: order.created_at || sourceOrder.created_at,
    product: { asin: order.asin || sourceOrder.product?.asin },
    task_basic: {
      id: order.task_basic_id,
      task_basics_no: order.task_basics_no,
    },
    bill,
    arrears_usd_amount: order.arrears_usd_amount,
    _groupArrearsUsd: groupArrearsInputText(order.arrears_usd_amount),
    _baseReceivable: Number(order.base_receivable_amount || 0),
    _actualReceivable: Number(order.actual_receivable_amount || 0),
    _settledAmount: Number(order.settled_amount || 0),
    _groupBillingStatus: deriveBillingStatusFromBill(bill),
    _groupPaymentStatus: derivePaymentStatusFromBill(bill),
    _groupArrearsAmount: getBillArrearsAmount(bill),
  }
}

function normalizeGroupOrder(order: any) {
  const bill = getFirstBill(order)
  return {
    ...order,
    _groupBillingStatus: Number(bill?.basic_bill_status || deriveBillingStatusFromBill(bill)),
    _groupPaymentStatus: Number(bill?.payment_status || derivePaymentStatus(order)),
    _groupArrearsAmount: getBillArrearsAmount(bill),
  }
}

function normalizeBillList(bill: any) {
  if (Array.isArray(bill)) return bill
  if (bill && typeof bill === 'object') return [bill]
  return bill === undefined || bill === null || bill === '' ? [] : [bill]
}

function readBillLabels(bill: any) {
  return normalizeBillList(bill).flatMap((item) => {
    if (!item || typeof item !== 'object') return [String(item || '')]
    return [
      String(item.basic_bill_status_label || ''),
      String(item.payment_status_label || ''),
    ]
  })
}

function deriveBillingStatusFromBill(bill: any) {
  const billList = normalizeBillList(bill)
  const status = billList
    .map(item => Number(item?.basic_bill_status))
    .find(value => value === 1 || value === 2 || value === 3)
  if (status) return status

  const labels = readBillLabels(bill)
  if (labels.some(label => label.includes('富余'))) return 3
  return labels.some(label => label.includes('未完成')) ? 2 : 1
}

function derivePaymentStatusFromBill(bill: any) {
  const billList = normalizeBillList(bill)
  const status = billList
    .map(item => Number(item?.payment_status))
    .find(value => [1, 2, 3, 4].includes(value))
  if (status) return status

  const labels = readBillLabels(bill)
  if (labels.some(label => label.includes('欠款') || label.includes('需补'))) return 2
  if (labels.some(label => label.includes('退款') || label.includes('应退') || label.includes('需退') || label.includes('溢收') || label.includes('余款'))) return 3
  if (labels.some(label => label.includes('结清'))) return 4
  return 1
}

function getBillArrearsAmount(bill: any) {
  const amount = normalizeBillList(bill)
    .map(item => Math.abs(Number(item?.arrears_amount || 0)))
    .find(value => value > 0)
  return amount ?? null
}

function derivePaymentStatus(order: any) {
  if (hasRealDebt(order)) return 2
  if (hasRealSurplus(order)) return 3
  if (isPaymentCleared(order)) return 4
  return 1
}

function getBillRecords(order: any) {
  const records = order?.bill_details?.bill_record
  if (!Array.isArray(records)) return []
  return mapBillRecords(records, Number(order?.exchange_rate || 1))
}

function getPaymentDirection(payment: any) {
  const type = payment.payment_type || ''
  if (type === '退款') return '支出'
  if (type === '账面抵消') return '账面抵消'
  return '收入'
}

const displayGroupPayments = computed<any[]>(() =>
  apiFlowLinks.value.length
    ? apiFlowLinks.value.map((flow: any) => ({
      id: String(flow.flow_id || flow.flow_no),
      amount_cny: Number(flow.cny_amount || flow.offset_amount || flow.signed_cny_amount || 0),
      payment_date: flow.payment_date || flow.created_at || '',
      payment_method: mapTransferChannel(flow.transfer_channel),
      payment_type: flow.transaction_type_label || flow.flow_type_label || '流水',
      direction: flow.direction_label || mapDirection(flow.direction),
      flow_no: flow.flow_no,
      finance_remark: flow.finance_remark,
    }))
    : localOrders.value.flatMap(order =>
      getBillRecords(order).map((record: any) => ({
        ...record,
        direction: getPaymentDirection(record),
        flow_no: undefined,
        finance_remark: undefined,
      })),
    ),
)

const pendingDiffOrderCount = computed(() =>
  localOrders.value.filter(order =>
    [2, 3].includes(Number(order._groupPaymentStatus))
    && Number(order._groupArrearsAmount || 0) > 0.005,
  ).length,
)
function mapDirection(direction: any) {
  const value = Array.isArray(direction) ? Number(direction[0]) : Number(direction)
  if (value === 2) return '支出'
  if (value === 3) return '账面抵消'
  return '收入'
}

function mapTransferChannel(value: any) {
  const map: Record<number, string> = { 1: '银行转账', 2: '支付宝', 3: '微信支付', 4: 'PayPal', 5: '其他' }
  return map[Number(value)] || ''
}

async function saveOrderStatus(order: any) {
  const bill = getFirstBill(order)
  const hasIssue = Number(order._groupPaymentStatus) === 2 || Number(order._groupPaymentStatus) === 3
  const actualReceivable = order.actual_receivable_amount
    ?? order._actualReceivable
    ?? order.bill_details?.actual_receivable_amount
    ?? bill?.actual_receivable_amount
    ?? 0
  const response = await saveReceiveBillStatus({
    task_id: Number(order.id),
    actual_receivable_amount: String(Number(actualReceivable || 0).toFixed(2)),
    basic_bill_status: Number(order._groupBillingStatus || 1),
    payment_status: Number(order._groupPaymentStatus || 1),
    arrears_amount: hasIssue ? String(Number(order._groupArrearsAmount || 0).toFixed(2)) : '0',
    arrears_usd_amount: hasIssue ? String(order._groupArrearsUsd ?? '').trim() : 0,
    remark: hasIssue ? (bill?.remark || '') : '',
    marked_business: hasIssue ? resolveMarkedBusinessName(order) : '',
  })
  if (response.code !== 200) throw new Error(response.msg || response.message || '保存失败')
}

function statusEditKey(order: any) {
  return groupStatusEditKey(order)
}

function rememberStatusSnapshot(orders: any[]) {
  const next: Record<string, string> = {}
  orders.forEach((order) => {
    next[String(order.id)] = statusEditKey(order)
  })
  savedStatusSnapshot.value = next
}

function dirtyStatusOrders() {
  return changedGroupStatusOrders(localOrders.value, savedStatusSnapshot.value)
}

function onGroupPaymentStatusChange(order: any) {
  if (![2, 3].includes(Number(order._groupPaymentStatus))) {
    order._groupArrearsAmount = null
    order._groupArrearsUsd = ''
  }
}

function applyBatchBillingStatus(value?: number) {
  if (!value || !localOrders.value.length) return
  localOrders.value.forEach((order) => {
    order._groupBillingStatus = value
  })
}

async function saveStatusEdits() {
  const dirty = dirtyStatusOrders()
  if (!dirty.length) {
    message.warning('没有需要保存的修改')
    return
  }
  for (const order of dirty) {
    const hasIssue = [2, 3].includes(Number(order._groupPaymentStatus))
    if (hasIssue && !String(order._groupArrearsUsd ?? '').trim()) {
      message.warning('请填写欠款金额(美元)')
      return
    }
  }
  statusSaving.value = true
  try {
    for (const order of dirty) await saveOrderStatus(order)
    rememberStatusSnapshot(localOrders.value)
    message.success('修改已保存')
    emit('updated')
  } catch (error: any) {
    message.error(error?.message || '保存失败')
  } finally {
    statusSaving.value = false
  }
}

type RecordMode = 'supplement' | 'refund' | 'offset'
type SupplementDiffRow = {
  id: string
  dateText: string
  asin: string
  paymentStatus: number
  amountCny: unknown
  amountUsd: string
}
type AllocRow = {
  taskId: number
  taskNo: string
  amount: number | undefined
  hint: string
  hintType: string
}
type CountryOption = { id: number; country: string }
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
  draft: OffsetDraft
}

const recordModalOpen = ref(false)
const recordSaving = ref(false)
const uploading = ref(false)
const recordMode = ref<RecordMode>('supplement')
const supplementDiffOpen = ref(false)
const supplementRecordSubmitted = ref(false)
const supplementDiffSelected = ref<string[]>([])
const supplementDiffRows = ref<SupplementDiffRow[]>([])
const supplementDiffColumns = [
  { title: '日期', dataIndex: 'dateText', width: 120 },
  { title: 'Asin', dataIndex: 'asin', width: 140 },
  { title: '差价状态', key: 'paymentStatus', width: 140 },
  { title: '差价金额（元）', key: 'amountCny', width: 150 },
  { title: '差价金额（美元）', key: 'amountUsd', width: 160 },
]
const supplementDiffRowSelection = computed(() => ({
  selectedRowKeys: supplementDiffSelected.value,
  hideSelectAll: true,
  onChange: (keys: (string | number)[]) => {
    supplementDiffSelected.value = keys.map(String)
  },
}))
const supplementDiffSummaryText = computed(() => checkedDiffSummaryText(
  supplementDiffRows.value,
  supplementDiffSelected.value,
))
const recordFiles = ref<any[]>([])
const pendingOffset = ref<PendingOffset | null>(null)
const directOffsetOpen = ref(false)
const nestedOffsetOpen = ref(false)
const nestedOffsetSaving = ref(false)
const nestedOffsetDraft = ref(createOffsetDraft())
const nestedDebtStatus = ref<string | null>(null)
const nestedDebtAmount = ref<number | null>(null)
const nestedDebtAmountUsd = ref('')
const nestedRemark = ref('')
const countryOptions = ref<CountryOption[]>([])
const allocRows = ref<AllocRow[]>([])
const businessTypeOptions = [
  { label: '文字', value: 'words' },
  { label: '免评', value: 'free_review' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: 'Feedback', value: 'feedback' },
]
const supplementCategories = ref<FlowCategory[]>([])
const supplementCategoryLoading = ref(false)
const categoryOptions = [
  { value: '业务收入', label: '业务收入', children: [{ value: '任务收入', label: '任务收入' }, { value: '补款收入', label: '补款收入' }] },
  { value: '业务支出', label: '业务支出', children: [{ value: '截单退款', label: '截单退款' }, { value: '退佣金', label: '退佣金' }, { value: '退本金差价', label: '退本金差价' }] },
  { value: '其他收入', label: '其他收入', children: [{ value: '其他收入', label: '其他收入' }] },
  { value: '其他支出', label: '其他支出', children: [{ value: '其他支出', label: '其他支出' }] },
]
const recordForm = ref(createRecordForm('supplement'))
const offsetDraft = ref(createOffsetDraft())

function createRecordForm(mode: RecordMode) {
  return {
    primary_category: (mode === 'refund' ? '业务支出' : mode === 'supplement' ? '' : '业务收入') as string | number,
    secondary_categories: [] as Array<string | number>,
    currency_mode: 'cny' as 'cny' | 'usd' | 'both',
    amount_cny: undefined as number | undefined,
    amount_usd: undefined as number | undefined,
    offset_type: undefined as 1 | 2 | 3 | undefined,
    offset_task_rows: [{ task_id: '', amount: undefined as number | undefined }],
    business_rows: [{ country_id: undefined as number | undefined, review_type: '', quantity: undefined as number | undefined }],
    payment_date: dayjs().format('YYYY-MM-DD'),
    payment_method: mode === 'offset' ? '账面抵消' : mode === 'refund' ? '' : '银行转账',
    receive_account: '',
    surname: '',
    receive_name: resolveSupplementPayerName(displayGroupData.value),
    remark: '',
    update_debt_status: null as string | null,
    debt_amount: null as number | null,
    debt_amount_usd: '',
  }
}

function buildAllocRows(orders: any[]): AllocRow[] {
  return orders.map((order) => {
    const bill = getFirstBill(order)
    const paymentStatus = Number(order._groupPaymentStatus || bill?.payment_status || 1)
    const arrears = Math.abs(Number(order._groupArrearsAmount ?? bill?.arrears_amount ?? 0))
    const isDebt = paymentStatus === 2 && arrears > 0
    const isRefund = paymentStatus === 3 && arrears > 0
    return {
      taskId: Number(order.id),
      taskNo: String(order.task_no || order.id),
      amount: isDebt ? arrears : isRefund ? -arrears : undefined,
      hint: isDebt ? `欠款 +¥${arrears.toFixed(2)}` : isRefund ? `溢收 -¥${arrears.toFixed(2)}` : '欠款/余款：无',
      hintType: isDebt ? 'hint-owed' : isRefund ? 'hint-surplus' : 'hint-none',
    }
  })
}

const activeAllocRows = computed(() => allocRows.value.filter(row =>
  recordMode.value === 'refund' ? Number(row.amount || 0) < 0 : Number(row.amount || 0) > 0,
))
const activeAllocTotal = computed(() => activeAllocRows.value.reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0))
const showSupplementCny = computed(() => recordMode.value === 'supplement' && recordForm.value.currency_mode !== 'usd')
const showSupplementUsd = computed(() => recordMode.value === 'supplement' && recordForm.value.currency_mode !== 'cny')

function calcAllocSettlement(rows: AllocRow[]) {
  const active = rows.filter(row => Math.abs(Number(row.amount || 0)) > 0.005)
  let owedTotal = 0
  let refundTotal = 0
  active.forEach((row) => {
    const amount = Number(row.amount || 0)
    if (amount > 0) owedTotal += amount
    else refundTotal += Math.abs(amount)
  })
  const netRefund = Number((refundTotal - owedTotal).toFixed(2))
  const netSupplement = Number((owedTotal - refundTotal).toFixed(2))
  return {
    rows: active,
    count: active.length,
    owedTotal: Number(owedTotal.toFixed(2)),
    refundTotal: Number(refundTotal.toFixed(2)),
    netRefund: netRefund > 0.005 ? netRefund : 0,
    netSupplement: netSupplement > 0.005 ? netSupplement : 0,
  }
}

const allocSettlement = computed(() => calcAllocSettlement(allocRows.value))
const offsetSummaryLine = computed(() => `本次账面抵消 ${activeAllocRows.value.length} 个任务，合计 ¥${activeAllocTotal.value.toFixed(2)}`)
const recordSummaryLine = computed(() => {
  if (recordMode.value !== 'refund') return ''
  const settlement = allocSettlement.value
  return `本次退款 ${settlement.count} 个任务，合计 ¥${settlement.netRefund.toFixed(2)}`
})
const recordModalTitle = computed(() => ({ supplement: '录入补款', refund: '提交退款', offset: '录入账面抵消' })[recordMode.value])
const recordModalOkText = computed(() => {
  return ({ supplement: '录入补款', refund: '提交退款', offset: '保存抵消' })[recordMode.value]
})
const refundDetailsRequired = computed(() =>
  recordMode.value === 'refund'
  && recordForm.value.secondary_categories.includes('截单退款'),
)
const refundDetailsOptional = computed(() =>
  recordMode.value === 'refund'
  && recordForm.value.secondary_categories.length > 0
  && !refundDetailsRequired.value,
)
const primaryOptions = computed(() => {
  if (recordMode.value === 'supplement') return supplementPrimaryCategories(supplementCategories.value)
  return categoryOptions.filter(item =>
    recordMode.value === 'refund' ? item.value === '业务支出' : ['业务收入', '其他收入'].includes(item.value),
  )
})
const offsetFlowPrimaryOptions = computed(() => supplementPrimaryCategories(supplementCategories.value))
const offsetFlowPrimary = computed(() => offsetFlowPrimaryOptions.value.find(item => item.label === '业务收入'))
const offsetFlowPrimaryValue = computed(() => offsetFlowPrimary.value?.value)
const offsetFlowSecondaryOptions = computed(() => offsetFlowPrimary.value?.children || [])
const secondaryOptions = computed(() => primaryOptions.value.find(item => item.value === recordForm.value.primary_category)?.children || [])

watch(
  localOrders,
  (orders) => {
    allocRows.value = buildAllocRows(orders)
  },
  { immediate: true, deep: true },
)

watch(
  () => props.billData,
  () => {
    refreshedBillData.value = null
  },
)

async function loadCountryOptions() {
  if (countryOptions.value.length) return
  try {
    const response = await getCommonOptions({ types: 'country' })
    if (response.code !== 200) throw new Error(response.msg || response.message || '获取国家列表失败')
    const source = Array.isArray(response.data?.country) ? response.data.country : []
    countryOptions.value = source
      .map((item: any) => ({ id: Number(item.id ?? item.value), country: String(item.country ?? item.name ?? item.label ?? '') }))
      .filter((item: CountryOption) => item.id > 0 && item.country)
  } catch (error) {
    console.error('获取国家选项失败:', error)
  }
}

async function loadSupplementCategories() {
  supplementCategoryLoading.value = true
  try {
    const response = await getTransactionFlowEnums()
    if (response.code !== 200) throw new Error(response.msg || response.message || '获取分类失败')
    supplementCategories.value = parseTransactionFlowCategories(response.data)
    const income = supplementCategoryDefaults(supplementCategories.value)
    if (recordMode.value === 'offset') {
      recordForm.value.primary_category = income.primary
      recordForm.value.secondary_categories = []
      return
    }
    if (recordMode.value !== 'supplement' || recordForm.value.primary_category !== '') return
    recordForm.value.primary_category = income.primary
    recordForm.value.secondary_categories = []
  } catch (error: any) {
    message.error(error?.message || '获取分类失败')
  } finally {
    supplementCategoryLoading.value = false
  }
}

function onPrimaryCategoryChange() {
  recordForm.value.secondary_categories = recordForm.value.secondary_categories.filter(value =>
    secondaryOptions.value.some(item => item.value === value),
  )
}

function addBusinessRow() {
  recordForm.value.business_rows.push({ country_id: undefined, review_type: '', quantity: undefined })
}
function removeBusinessRow(index: number) {
  if (index === 0 || recordForm.value.business_rows.length <= 1) return
  recordForm.value.business_rows.splice(index, 1)
}

function openRecordModal(mode: RecordMode) {
  if (mode === 'offset') createGroupOffsetTrace()('openRecordModal:direct-offset')
  recordMode.value = mode
  resetNestedOffsetState()
  recordFiles.value = []
  recordForm.value = createRecordForm(mode)
  if (mode === 'offset') {
    offsetDraft.value = createOffsetDraft()
    directOffsetOpen.value = true
    void loadCountryOptions()
    void loadSupplementCategories()
    return
  }
  recordForm.value.business_rows = [{ country_id: undefined, review_type: '', quantity: undefined }]
  recordModalOpen.value = true
  if (mode === 'supplement') {
    supplementRecordSubmitted.value = false
    closeSupplementDiff()
    void loadSupplementCategories()
  } else void loadCountryOptions()
}

function resetNestedOffsetState() {
  pendingOffset.value = null
  nestedOffsetOpen.value = false
}

function openNestedOffset() {
  nestedOffsetDraft.value = pendingOffset.value ? cloneOffsetDraft(pendingOffset.value.draft) : createOffsetDraft()
  nestedDebtStatus.value = recordForm.value.update_debt_status
  nestedDebtAmount.value = recordForm.value.debt_amount
  nestedDebtAmountUsd.value = recordForm.value.debt_amount_usd
  nestedRemark.value = recordForm.value.remark
  nestedOffsetOpen.value = true
  void loadCountryOptions()
}

function readOffsetDebtAmounts(status: string | null, amount: number | null, usdText: string, requireAmounts: boolean) {
  const needsAmount = status === 'owed' || status === 'surplus'
  if (!needsAmount) return { ok: true as const, amounts: undefined }
  const hasAmount = amount !== null && amount !== undefined && !Number.isNaN(Number(amount))
  if (!hasAmount) {
    if (!requireAmounts) return { ok: true as const, amounts: undefined }
    return { ok: false as const, message: '请填写差价金额（元）' }
  }
  const usd = submittedArrearsUsdAmount(usdText, true)
  if (usd === null) {
    return { ok: false as const, message: String(usdText ?? '').trim() ? '欠款金额(美元)请填写整数' : '请填写欠款金额(美元)' }
  }
  return { ok: true as const, amounts: { cny: Number(amount), usd } }
}

async function confirmNestedOffset() {
  if (nestedOffsetSaving.value) return
  const prepared = prepareOffsetDraft(nestedOffsetDraft.value)
  if ('error' in prepared) {
    message.warning(prepared.error)
    return
  }
  const debt = readOffsetDebtAmounts(nestedDebtStatus.value, nestedDebtAmount.value, nestedDebtAmountUsd.value, false)
  if (!debt.ok) {
    message.warning(debt.message)
    return
  }
  nestedOffsetSaving.value = true
  try {
    const sources = await resolveOffsetSources(prepared.sources)
    const described = describeAttachedOffset(sources.offsetBasics, prepared.fields.offset_details, reviewTypeLabel)
    pendingOffset.value = {
      fields: prepared.fields,
      offsetBasics: sources.offsetBasics.map(({ task_basic_id, amount }) => ({ task_basic_id, amount })),
      totalAmount: described.totalAmount,
      sourceText: described.sourceText,
      detailText: described.detailText,
      draft: cloneOffsetDraft(nestedOffsetDraft.value),
    }
    recordForm.value.update_debt_status = nestedDebtStatus.value
    recordForm.value.debt_amount = nestedDebtAmount.value
    recordForm.value.debt_amount_usd = nestedDebtAmountUsd.value
    recordForm.value.remark = nestedRemark.value
    nestedOffsetOpen.value = false
  } catch (error: any) {
    message.error(error?.message || '查询抵消来源失败')
  } finally {
    nestedOffsetSaving.value = false
  }
}

function clearPendingOffset() {
  pendingOffset.value = null
}

function handleQrPaste(event: ClipboardEvent) {
  if (recordMode.value === 'offset') return
  const clipboardFiles = Array.from(event.clipboardData?.files || [])
  const imageFiles = clipboardFiles.filter(file => file.type.startsWith('image/'))
  if (!imageFiles.length) return

  event.preventDefault()
  const result = appendPastedImages(recordFiles.value, imageFiles, 5)
  recordFiles.value = result.files
  if (result.addedCount > 0) message.success(`已粘贴 ${result.addedCount} 张图片`)
  if (result.limitReached) message.warning('二维码最多只能上传 5 个文件')
}

function handleDocumentQrPaste(event: ClipboardEvent) {
  if (!recordModalOpen.value || event.defaultPrevented) return
  handleQrPaste(event)
}

let stopOffsetLogRetention: (() => void) | undefined
onMounted(() => {
  document.addEventListener('paste', handleDocumentQrPaste)
  stopOffsetLogRetention = startGroupOffsetLogRetention()
})
onBeforeUnmount(() => {
  document.removeEventListener('paste', handleDocumentQrPaste)
  stopOffsetLogRetention?.()
})

let offsetSaveClickTrace: GroupOffsetTrace | undefined

function captureOffsetSaveClick() {
  offsetSaveClickTrace = createGroupOffsetTrace()
  offsetSaveClickTrace('captureOffsetSaveClick:button-clicked', { busy: recordSaving.value || uploading.value })
}

async function saveOffsetFromFooter() {
  const trace = offsetSaveClickTrace ?? createGroupOffsetTrace()
  offsetSaveClickTrace = undefined
  try {
    await saveBatchRecord(trace, 'open-diff')
  } catch (error) {
    trace('saveOffsetFromFooter:unexpected-error', groupOffsetErrorLocation(error))
    throw error
  }
}

function exportOffsetLog() {
  try {
    downloadGroupOffsetLog()
  } catch {
    message.error('导出日志失败')
  }
}

function handleDirectOffsetCancel() {
  createGroupOffsetTrace()('handleRecordCancel:direct-offset', { busy: recordSaving.value || uploading.value })
  offsetSaveClickTrace = undefined
  directOffsetOpen.value = false
}

function handleRecordCancel() {
  if (supplementRecordSubmitted.value) {
    supplementRecordSubmitted.value = false
    void refreshBatchBill().then(() => emit('updated'))
  }
  recordModalOpen.value = false
  closeSupplementDiff()
  resetNestedOffsetState()
}

function supplementDiffStatusLabel(status: number) {
  return DIFF_STATUS_OPTIONS.find(item => item.value === status)?.label || ''
}

function supplementDiffAmountText(value: unknown) {
  if (value === undefined || value === null || value === '') return '-'
  return String(value)
}

function selectAllSupplementDiff() {
  supplementDiffSelected.value = selectAllDiffIds(supplementDiffRows.value.map(row => row.id))
}

function invertSupplementDiff() {
  supplementDiffSelected.value = invertDiffIds(
    supplementDiffRows.value.map(row => row.id),
    supplementDiffSelected.value,
  )
}

function openSupplementDiffModal() {
  void saveBatchRecord(undefined, 'open-diff')
}

function closeSupplementDiff() {
  supplementDiffOpen.value = false
  supplementDiffRows.value = []
  supplementDiffSelected.value = []
}

function fillSupplementDiffRows() {
  const next = buildSupplementDiffOpenState(localOrders.value)
  supplementDiffRows.value = next.rows
  supplementDiffSelected.value = next.selectedIds
}

const TRANSACTION_TYPE_MAP: Record<string, number> = {
  业务收入: 1, 业务支出: 2, 其他收入: 5, 其他支出: 6,
}
const FLOW_TYPE_MAP: Record<string, number> = {
  任务收入: 1, 补款收入: 2, 截单退款: 3, 退佣金: 4, 退本金差价: 5, 其他收入: 13, 其他支出: 14,
}
const TRANSFER_CHANNEL_MAP: Record<string, number> = { 银行转账: 1, 支付宝: 2, 微信: 3, 其他: 5, 账面抵消: 5 }
const STATUS_ACTION_MAP: Record<string, number> = { cleared: 1, owed: 2, surplus: 0 }
const PAYMENT_STATUS_MAP: Record<string, number> = { cleared: 4, owed: 2, surplus: 3 }

async function applyDebtStatusToRows(rows: AllocRow[], debtStatus: string, amounts?: { cny: number; usd: number }) {
  const paymentStatus = PAYMENT_STATUS_MAP[debtStatus]
  if (!paymentStatus) return
  const targetIds = new Set(rows.map(row => row.taskId))
  for (const order of localOrders.value) {
    if (!targetIds.has(Number(order.id))) continue
    order._groupPaymentStatus = paymentStatus
    if (amounts) {
      order._groupArrearsAmount = amounts.cny
      order._groupArrearsUsd = amounts.usd
      order.arrears_usd_amount = amounts.usd
      if (order.bill?.[0]) order.bill[0].arrears_usd_amount = amounts.usd
    }
    await saveOrderStatus(order)
  }
}

function extractReceiveList(data: any) {
  if (Array.isArray(data?.list)) return data.list
  if (Array.isArray(data?.data)) return data.data
  return Array.isArray(data) ? data : []
}

async function resolveOffsetSources(rows: { task_id: string; amount: number }[], trace?: GroupOffsetTrace) {
  const taskItems: { task_id: number; amount: number; label: string }[] = []
  const offsetBasics: { task_basic_id: number; amount: number; label: string }[] = []
  for (const row of rows) {
    const keyword = row.task_id.trim()
    if (/TASK_BASIC/i.test(keyword)) {
      trace?.('resolveOffsetSources:before-query', { endpoint: '/admin/common/task_group' })
      const response = await searchTaskGroup(keyword)
      trace?.('resolveOffsetSources:query-result', { code: response.code })
      if (response.code !== 200) throw new Error(response.msg || response.message || '查询任务组失败')
      const groups = Array.isArray(response.data) ? response.data : []
      const group = groups.find((item: any) => String(item.task_basics_no) === keyword)
      if (!group?.id) throw new Error(`未找到任务组：${keyword}`)
      offsetBasics.push({ task_basic_id: Number(group.id), amount: row.amount, label: String(group.task_basics_no || group.id) })
    } else {
      trace?.('resolveOffsetSources:before-query', { endpoint: '/admin/receive/list' })
      const response = await getReceiveList({ keyword, page: 1, page_size: 20 })
      trace?.('resolveOffsetSources:query-result', { code: response.code })
      if (response.code !== 200) throw new Error(response.msg || response.message || '查询任务失败')
      const tasks = extractReceiveList(response.data)
      const task = tasks.find((item: any) => String(item.task_no) === keyword || String(item.id) === keyword)
      if (!task?.id) throw new Error(`未找到任务：${keyword}`)
      const taskBasicId = Number(task.task_basic_id || task.task_basic?.id || 0)
      if (!taskBasicId) throw new Error(`任务缺少任务组：${keyword}`)
      offsetBasics.push({ task_basic_id: taskBasicId, amount: row.amount, label: String(task.task_no || task.id) })
    }
  }
  return { taskItems, offsetBasics }
}

async function uploadRecordFiles() {
  const paths: string[] = []
  for (const item of recordFiles.value) {
    const file = item.originFileObj || item
    if (!file) continue
    const response = await uploadCommonFile(file as File)
    if (response.code !== 200) throw new Error(response.msg || response.message || '上传失败')
    const path = response.data?.url || response.data?.path
    if (path) paths.push(path)
  }
  return paths.join(',')
}

function allocateByRatio(total: number, rowAmount: number, index: number, rows: AllocRow[]) {
  const base = rows.reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0)
  if (base <= 0) return index === rows.length - 1 ? Number(total.toFixed(2)) : 0
  if (index === rows.length - 1) {
    const assigned = rows.slice(0, index).reduce((sum, row) => sum + Number((total * Math.abs(Number(row.amount || 0)) / base).toFixed(2)), 0)
    return Number((total - assigned).toFixed(2))
  }
  return Number((total * rowAmount / base).toFixed(2))
}

function refundSubmitRows() {
  return calcAllocSettlement(allocRows.value).rows
}

function supplementSubmitRows() {
  if (activeAllocRows.value.length) return activeAllocRows.value
  const currency = recordForm.value.currency_mode
  const enteredCny = currency === 'usd' ? 0 : Number(recordForm.value.amount_cny || 0)
  const enteredUsd = currency === 'cny' ? 0 : Number(recordForm.value.amount_usd || 0)
  if (enteredCny <= 0 && enteredUsd <= 0 && !pendingOffset.value) return []
  return allocRows.value
    .filter(row => row.taskId > 0)
    .map(row => ({ ...row, amount: 1 }))
}

async function refreshBatchBill() {
  const ids = localOrders.value.map(item => Number(item.id)).filter(id => Number.isFinite(id))
  if (!ids.length) return
  const response = await postReceiveBatchBill(ids)
  if (response.code === 200) refreshedBillData.value = response.data
}

function reviewTypeLabel(value: string) {
  return businessTypeOptions.find(item => item.value === value)?.label || value
}

function buildRecordRemark(
  attachedOffset: PendingOffset | null,
  sources: { taskItems: { amount: number; label: string }[]; offsetBasics: { amount: number; label: string }[] },
  businessRows: { review_type: string; quantity: number }[],
) {
  const parts: string[] = []
  if (recordMode.value === 'offset') {
    const sourceText = [...sources.taskItems, ...sources.offsetBasics]
      .map(item => `${item.label} ¥${item.amount.toFixed(2)}`)
      .join('、')
    if (sourceText) parts.push(`抵消来源: ${sourceText}`)
    const detailText = businessRows.map(item => `${reviewTypeLabel(item.review_type)}${item.quantity}单`).join('、')
    if (detailText) parts.push(`抵消明细: ${detailText}`)
  }
  if (attachedOffset) {
    parts.push(`抵消来源: ${attachedOffset.sourceText}`)
    if (attachedOffset.detailText) parts.push(`抵消明细: ${attachedOffset.detailText}`)
  }
  if (recordForm.value.remark) parts.push(recordForm.value.remark)
  return parts.join(' | ')
}

async function saveBatchRecord(trace?: GroupOffsetTrace, phase: 'open-diff' | 'submit' = 'submit') {
  trace?.('saveBatchRecord:entered')
  if (recordSaving.value || uploading.value) {
    trace?.('saveBatchRecord:blocked', { reason: 'already-saving' })
    return
  }
  const isSupplement = recordMode.value === 'supplement'
  const currency = recordForm.value.currency_mode
  const enteredCny = currency === 'usd' ? 0 : Number(recordForm.value.amount_cny || 0)
  const enteredUsd = currency === 'cny' ? 0 : Number(recordForm.value.amount_usd || 0)
  const isDirectOffset = recordMode.value === 'offset'
  if (isDirectOffset && !(Number(recordForm.value.primary_category) > 0)) {
    message.warning('请选择一级分类')
    return
  }
  if (isDirectOffset && !recordForm.value.secondary_categories.length) {
    message.warning('请选择二级分类')
    return
  }
  trace?.('saveBatchRecord:before-prepareOffsetDraft')
  const preparedOffset = isDirectOffset ? prepareOffsetDraft(offsetDraft.value) : undefined
  if (preparedOffset?.error) {
    trace?.('saveBatchRecord:blocked', { reason: preparedOffset.error })
    message.warning(preparedOffset.error)
    return
  }
  let rows = isSupplement ? supplementSubmitRows() : recordMode.value === 'refund' ? refundSubmitRows() : activeAllocRows.value
  if (isDirectOffset && !rows.length) {
    rows = allocRows.value.filter(row => Number(row.taskId) > 0)
  }
  let refundBillCnyAmount = 0
  if (recordMode.value === 'refund' && rows.length) {
    const netRefund = Number(rows.reduce((sum, row) => sum + (-Number(row.amount || 0)), 0).toFixed(2))
    if (netRefund <= 0.005) {
      message.warning('轧差后无需退款')
      return
    }
    const enteredRefundAmount = recordForm.value.amount_cny
    if (typeof enteredRefundAmount !== 'number' || !(enteredRefundAmount > 0)) {
      trace?.('saveBatchRecord:blocked', { reason: 'missing-refund-amount' })
      message.warning('请输入退款金额')
      return
    }
    refundBillCnyAmount = enteredRefundAmount
  }
  if (!rows.length) {
    trace?.('saveBatchRecord:blocked', { reason: 'no-target-rows' })
    if (isSupplement) {
      message.warning(currency === 'usd' ? '请填写补款金额（USD）' : '请填写补款金额（人民币）')
    }
    return
  }
  if (isSupplement && currency === 'cny' && enteredCny <= 0 && !pendingOffset.value) {
    message.warning('请填写补款金额（人民币）')
    return
  }
  if (isSupplement && currency === 'usd' && enteredUsd <= 0) {
    message.warning('请填写补款金额（USD）')
    return
  }
  if (isSupplement && currency === 'both' && enteredCny <= 0 && enteredUsd <= 0 && !pendingOffset.value) {
    message.warning('请至少填写人民币或美元补款金额')
    return
  }
  if (recordMode.value !== 'offset' && !recordForm.value.payment_date) {
    message.warning('请选择日期')
    return
  }
  if (recordMode.value === 'supplement' && !(Number(recordForm.value.primary_category) > 0)) {
    message.warning('请选择一级分类')
    return
  }
  if (recordMode.value !== 'offset' && !recordForm.value.secondary_categories.length) {
    message.warning('请选择二级分类')
    return
  }
  if (recordMode.value !== 'offset' && !recordForm.value.payment_method) {
    message.warning('请选择方式')
    return
  }
  const businessRows = (recordMode.value === 'refund' ? recordForm.value.business_rows : [])
    .map(row => ({ country_id: Number(row.country_id || 0), review_type: row.review_type, quantity: Number(row.quantity || 0) }))
    .filter(row => row.country_id || row.review_type || row.quantity)
  const completeRefundRows = businessRows.filter(row => row.country_id && row.review_type && row.quantity > 0)
  if (recordMode.value === 'refund' && !refundDetailsOptional.value && (!businessRows.length || businessRows.some(row => !row.country_id || !row.review_type || row.quantity <= 0))) {
    message.warning('请完整填写退款国家、类型和单量')
    return
  }
  const sourceRows = preparedOffset?.sources ?? []
  if (recordMode.value === 'offset') {
    if (!sourceRows.length || sourceRows.some(row => !row.task_id || row.amount <= 0)) {
      trace?.('saveBatchRecord:blocked', { reason: 'invalid-source-rows' })
      message.warning('请完整填写抵消来源任务和金额')
      return
    }
  }

  const attachedOffset = recordMode.value === 'supplement' ? pendingOffset.value : null
  const debtStatus = isSupplement || isDirectOffset || recordMode.value === 'refund' ? null : recordForm.value.update_debt_status
  const debtAmounts = readOffsetDebtAmounts(
    debtStatus,
    recordForm.value.debt_amount,
    recordForm.value.debt_amount_usd,
    false,
  )
  if (!debtAmounts.ok) {
    trace?.('saveBatchRecord:blocked', { reason: debtAmounts.message })
    message.warning(debtAmounts.message)
    return
  }

  trace?.('saveBatchRecord:validation-passed', { targetCount: rows.length, sourceCount: sourceRows.length })
  if (phase === 'open-diff' && (isSupplement || isDirectOffset || recordMode.value === 'refund')) {
    fillSupplementDiffRows()
    supplementDiffOpen.value = true
    return
  }
  const markedTaskIds = isSupplement || isDirectOffset || recordMode.value === 'refund'
    ? billTaskIds(supplementDiffRows.value, supplementDiffSelected.value)
    : []
  recordSaving.value = true
  uploading.value = true
  try {
    const voucherPath = recordMode.value === 'offset' || (isSupplement && supplementRecordSubmitted.value) ? '' : await uploadRecordFiles()
    trace?.('saveBatchRecord:before-resolveOffsetSources')
    const sources = recordMode.value === 'offset' ? await resolveOffsetSources(sourceRows, trace) : { taskItems: [], offsetBasics: [] }
    trace?.('saveBatchRecord:after-resolveOffsetSources')

    const flowTypes = recordMode.value === 'offset' || recordMode.value === 'supplement'
      ? recordForm.value.secondary_categories.map(item => Number(item)).filter(value => Number.isInteger(value) && value > 0)
      : recordForm.value.secondary_categories.map(label => FLOW_TYPE_MAP[String(label)]).filter((value): value is number => Boolean(value))
    // 退款明细写入契约字段 offset_details（quantity）。refund_details 不在 bill_record 请求体里。（李运侠 改；Apifox 2026-09-24T10:02:43.124Z）
    const refundSourceRows = refundDetailsOptional.value ? completeRefundRows : businessRows
    const buildRecordPayload = (row: AllocRow, index: number) => {
      const amount = Math.abs(Number(row.amount || 0))
      const cnyAmount = !isSupplement
        ? (recordMode.value === 'refund' ? Number((-Number(row.amount || 0)).toFixed(2)) : amount)
        : currency === 'usd'
          ? 0
          : enteredCny > 0
            ? allocateByRatio(enteredCny, amount, index, rows)
            : 0
      const usdAmount = isSupplement && currency !== 'cny'
        ? allocateByRatio(enteredUsd, amount, index, rows)
        : 0
      return {
        bill_type: recordMode.value === 'refund' ? 2 : recordMode.value === 'offset' ? 3 : 1,
        task_id: row.taskId,
        transaction_type: recordMode.value === 'offset' || recordMode.value === 'supplement'
          ? Number(recordForm.value.primary_category)
          : (TRANSACTION_TYPE_MAP[String(recordForm.value.primary_category)] || 1),
        flow_type: recordMode.value === 'offset' || recordMode.value === 'supplement'
          ? flowTypes
          : (flowTypes.length ? flowTypes : [2]),
        bill_cny_amount: cnyAmount,
        bill_usd_amount: usdAmount,
        payment_date: recordMode.value === 'offset' ? dayjs().format('YYYY-MM-DD') : recordForm.value.payment_date,
        transfer_channel: TRANSFER_CHANNEL_MAP[recordForm.value.payment_method] || 5,
        receive_account: recordMode.value === 'refund' ? recordForm.value.receive_account : '',
        surname: recordMode.value === 'refund' ? recordForm.value.surname : '',
        receive_name: recordForm.value.receive_name,
        voucher_path: voucherPath,
        status_action: isSupplement ? 0 : (debtStatus ? (STATUS_ACTION_MAP[debtStatus] ?? 0) : 0),
        remark: recordMode.value === 'offset' ? recordForm.value.remark : buildRecordRemark(attachedOffset, sources, businessRows),
      }
    }

    const taskPayloads = rows.map(buildRecordPayload)
    const batchPayload = { ...taskPayloads[0], task_id: undefined }
    // bill_record 的 task_items 承载本次批量操作的目标任务；三种批量账款动作均只提交一次。
    // 返款/抵消来源分别使用 offset_details / offset_task_basics，禁止与目标任务混写。（禅道 #177）
    const batchRecordPayload = {
      ...batchPayload,
      task_items: taskPayloads.map((payload, index) => ({
        task_id: rows[index].taskId,
        amount: Number((payload.bill_cny_amount || payload.bill_usd_amount || 0).toFixed(2)),
      })),
      ...(preparedOffset?.fields
        ? {
            ...preparedOffset.fields,
            offset_task_basics: sources.offsetBasics.map(({ task_basic_id, amount }) => ({ task_basic_id, amount })),
          }
        : attachedOffset
          ? {
              ...attachedOffset.fields,
              offset_task_basics: attachedOffset.offsetBasics.map(({ task_basic_id, amount }) => ({ task_basic_id, amount })),
            }
          : recordMode.value === 'refund'
            ? {
                offset_type: 0,
                offset_task_basics: [],
                offset_details: refundSourceRows.map(({ country_id, review_type, quantity }) => ({ country_id, review_type, quantity })),
              }
            : {}),
      bill_cny_amount: recordMode.value === 'refund'
        ? refundBillCnyAmount
        : Number(taskPayloads.reduce((sum, payload) => sum + payload.bill_cny_amount, 0).toFixed(2)),
      bill_usd_amount: Number(taskPayloads.reduce((sum, payload) => sum + payload.bill_usd_amount, 0).toFixed(2)),
      ...(isSupplement || isDirectOffset || recordMode.value === 'refund' ? { bill_task_ids: markedTaskIds } : {}),
    }
    if (isSupplement) {
      console.log('[接单管理-批量录入补款] /admin/receive/bill_record 请求参数', batchRecordPayload)
    }
    trace?.('saveBatchRecord:before-createReceiveBillRecord')
    if (!(isSupplement && supplementRecordSubmitted.value)) {
      const response = await createReceiveBillRecord(batchRecordPayload, trace)
      trace?.('saveBatchRecord:bill-record-result', { code: response.code })
      if (response.code !== 200) throw new Error(response.msg || response.message || '批量账款保存失败')
      if (isSupplement) supplementRecordSubmitted.value = true
    }
    if (debtStatus) {
      trace?.('saveBatchRecord:before-applyDebtStatusToRows')
      await applyDebtStatusToRows(rows, debtStatus, debtAmounts.amounts)
      trace?.('saveBatchRecord:after-applyDebtStatusToRows')
    }
    trace?.('saveBatchRecord:before-refreshBatchBill')
    await refreshBatchBill()
    trace?.('saveBatchRecord:after-refreshBatchBill')
    message.success(recordMode.value === 'refund' ? '退款申请已提交' : recordMode.value === 'offset' ? '账面抵消已记录' : '补款已记录')
    recordModalOpen.value = false
    closeSupplementDiff()
    if (isSupplement) supplementRecordSubmitted.value = false
    directOffsetOpen.value = false
    resetNestedOffsetState()
    const processed = new Set(rows.map(row => row.taskId))
    allocRows.value = allocRows.value.map(row => processed.has(row.taskId) ? { ...row, amount: undefined } : row)
    emit('updated')
    trace?.('saveBatchRecord:completed')
  } catch (error: any) {
    trace?.('saveBatchRecord:failed', groupOffsetErrorLocation(error))
    message.error(error?.message || '操作失败')
  } finally {
    uploading.value = false
    recordSaving.value = false
    trace?.('saveBatchRecord:loading-reset')
  }
}
</script>

<style scoped>
.offset-record-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.offset-record-footer :deep(.ant-btn + .ant-btn) { margin-inline-start: 0; }
.gbh {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 16px;
  background: var(--eva-bg-container, #fff);
  border-bottom: 1px solid var(--eva-border-light, #f0f0f0);
}
.gbh-left { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.gbh-meta { font-size: 13px; color: var(--eva-text-secondary, #6b7280); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.gbh-sep { color: var(--eva-text-tertiary, #d1d5db); }
.gbh-alert-wrap { padding: 10px 24px 0; }
.gbh-alert { display: inline-flex; align-items: center; gap: 8px; width: fit-content; max-width: 100%; padding: 6px 12px; border: 1px solid var(--ant-color-warning-border, #fde68a); border-radius: 6px; background: var(--ant-color-warning-bg, #fffbeb); color: var(--ant-color-warning-text, #92400e); font-size: 13px; }
.alert-icon { width: 18px; height: 18px; border-radius: 50%; background: #faad14; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; }
.gb-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.gb-section { background: var(--eva-bg-container, #fff); border-radius: 10px; border: 1px solid var(--eva-border-light, #f0f0f0); padding: 16px 20px; }
.section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.section-title { font-size: 14px; font-weight: 600; color: var(--eva-text, #1a1a2e); }
.section-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.orders-table { width: 100%; overflow-x: auto; }
.orders-table-head,
.orders-table-row {
  display: grid;
  grid-template-columns: 78px minmax(120px, 1.3fr) 84px 96px 96px 120px 130px 120px;
  align-items: center;
  column-gap: 12px;
  box-sizing: border-box;
  width: 100%;
  min-width: 1040px;
  padding: 8px 10px;
  font-size: 14px;
}
.orders-table-head { margin-bottom: 4px; padding-block: 6px; border-radius: 6px; background: var(--eva-bg-soft, #f8f9fb); color: var(--eva-text-secondary, #6b7280); font-weight: 600; }
.orders-table-row { border-bottom: 1px solid var(--eva-border-light, #f0f0f0); background: var(--eva-bg-container, #fff); transition: background 0.15s; }
.orders-table-row:hover { background: var(--eva-bg-soft, #f8f9fb); }
.row-attention { background: var(--ant-color-warning-bg, #fffbe6); }
.order-num-text,
.col-asin { font-family: monospace; color: var(--eva-link, #2563eb); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-created,
.col-num,
.col-asin,
.col-paid,
.col-credited,
.col-status,
.col-debt,
.col-diff { display: flex; align-items: center; min-width: 0; }
.col-created { color: var(--eva-text-secondary, #6b7280); font-family: monospace; white-space: nowrap; }
.col-paid,
.col-credited { font-weight: 600; color: var(--eva-text, #374151); }
.orders-empty { padding: 18px; text-align: center; color: var(--eva-text-tertiary, #9ca3af); font-size: 13px; background: var(--eva-bg-soft, #f8f9fb); }
.records-mock-tip { margin-bottom: 8px; padding: 10px 14px; border: 1px dashed var(--eva-border, #e5e7eb); border-radius: 8px; background: var(--eva-bg-soft, #f9fafb); color: var(--eva-text-tertiary, #9ca3af); font-size: 14px; text-align: center; }
.payment-lines { width: 100%; overflow-x: auto; border: 1px solid var(--eva-border, #e5e7eb); border-radius: 10px; background: var(--eva-bg-container, #fff); }
.payment-line { display: grid; grid-template-columns: 110px minmax(145px, 1fr) minmax(96px, 1fr) 90px 104px 92px minmax(96px, 1.5fr); align-items: center; column-gap: 20px; box-sizing: border-box; width: 100%; min-width: 900px; padding: 10px 14px; border-bottom: 1px solid var(--eva-border-light, #f0f0f0); font-size: 14px; background: var(--eva-bg-container, #fff); }
.payment-line:last-child { border-bottom: none; }
.payment-line-head { background: var(--eva-bg-soft, #f8f9fb); color: var(--eva-text-secondary, #6b7280); font-weight: 600; }
.payment-line-date,
.payment-line-number,
.payment-line-meta,
.payment-line-notes { color: var(--eva-text-secondary, #6b7280); }
.payment-line-number,
.payment-line-notes { overflow-wrap: anywhere; }
.payment-line-income { color: #16a34a; font-weight: 700; }
.payment-line-refund { color: #dc2626; font-weight: 700; }
.payment-line-offset { color: #2563eb; font-weight: 700; }
.section-hint { color: var(--eva-text-tertiary, #9ca3af); font-size: 14px; }
.batch-form,
.add-record-form,
.offset-business-list { display: flex; flex-direction: column; gap: 12px; }
.bf-submit,
.offset-brief-head { display: flex; align-items: center; gap: 10px; }
.ar-label { color: var(--eva-text, #374151); font-size: 14px; font-weight: 600; }
.bf-alloc-list,
.offset-brief-card,
.batch-record-summary {
  padding: 12px;
  border: 1px solid var(--eva-border, #e5e7eb);
  border-radius: 8px;
  background: var(--eva-bg-soft, #f8f9fb);
}
.bf-alloc-list { display: flex; flex-direction: column; gap: 10px; }
.bf-alloc-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 2px; }
.bf-label { color: var(--eva-text, #374151); font-size: 14px; font-weight: 600; }
.alloc-hint { color: var(--eva-text-tertiary, #9ca3af); font-size: 14px; }
.bf-alloc-row { display: flex; align-items: center; gap: 12px; }
.alloc-order-num { min-width: 160px; overflow: hidden; color: var(--eva-text, #1a1a2e); font-family: monospace; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.alloc-debt-info { min-width: 130px; }
.alloc-debt-info,
.alloc-input-wrap { display: flex; align-items: center; gap: 6px; }
.alloc-debt-tag { padding: 2px 6px; border: 1px solid var(--eva-border, #e5e7eb); border-radius: 4px; font-size: 14px; font-weight: 600; }
.hint-owed { border-color: #fed7aa; background: #fff7ed; color: #c2410c; }
.hint-surplus { border-color: #bfdbfe; background: #eff6ff; color: #1d4ed8; }
.hint-none { color: var(--eva-text-secondary, #6b7280); }
.hint-supplement { color: #16a34a; font-size: 11px; font-weight: 600; }
.hint-refund { color: #dc2626; font-size: 11px; font-weight: 600; }
:deep(.input-negative input) { color: #dc2626; }
.batch-form { gap: 14px; }
.alloc-total-breakdown { color: var(--eva-text-secondary, #6b7280); font-size: 14px; font-weight: 400; }
.bf-submit { flex-wrap: wrap; padding-top: 4px; }
.batch-record-summary { color: var(--eva-text, #374151); font-size: 13px; font-weight: 600; }
.offset-brief-head { justify-content: space-between; color: var(--eva-text, #1a1a2e); font-size: 14px; font-weight: 700; }
.offset-business-row { display: flex; align-items: center; gap: 8px; }
.offset-brief-total { color: #2563eb; font-size: 14px; font-weight: 700; text-align: right; }
.offset-inline-action { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; border: 1px solid var(--eva-border, #e5e7eb); border-radius: 8px; background: var(--eva-bg-soft, #f8f9fb); color: var(--eva-text-secondary, #6b7280); font-size: 14px; }
.offset-inline-action span { min-width: 0; line-height: 1.5; }
.supplement-diff-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.supplement-diff-summary { color: var(--eva-text, #1a1a2e); font-size: 14px; }
.offset-brief-tip { color: var(--eva-text-secondary, #6b7280); font-size: 14px; line-height: 1.6; }
.add-record-tip { margin-top: -6px; color: var(--eva-text-secondary, #6b7280); font-size: 14px; line-height: 1.6; }
.debt-status-reminder { color: #f59e0b; font-size: 11px; margin-top: 4px; }
.ar-field { display: flex; flex-direction: column; gap: 6px; }
.required { color: #dc2626; }
.refund-account-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.upload-text { margin-top: 4px; font-size: 14px; }
.gbd-group-table { display: flex; flex-direction: column; gap: 8px; overflow-x: auto; }
.gbd-group-head, .gbd-group-row, .gbd-group-foot { display: grid; grid-template-columns: 28px minmax(160px, 1.4fr) 64px repeat(4, minmax(96px, 1fr)) minmax(100px, 1fr); gap: 8px; align-items: center; min-width: 860px; }
.gbd-group-table.has-refund .gbd-group-head,
.gbd-group-table.has-refund .gbd-group-row,
.gbd-group-table.has-refund .gbd-group-foot { grid-template-columns: 28px minmax(160px, 1.4fr) 64px repeat(5, minmax(96px, 1fr)) minmax(100px, 1fr); }
.gbd-group-head, .gbd-group-foot { color: var(--eva-text-secondary, #6b7280); font-size: 13px; font-weight: 600; }
.gbd-group-row, .gbd-group-foot { padding: 8px 0; border-bottom: 1px solid var(--eva-border-light, #f0f0f0); }
.gbd-group-foot {
  border-top: 1px solid var(--eva-border, #e5e7eb);
  background: var(--eva-bg-soft, #f8f9fb);
  color: var(--eva-text, #1a1a2e);
  font-weight: 700;
}
.group-expand-btn { padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; }
.gbd-group-row.is-open { background: var(--eva-bg-soft, #f8f9fb); }
.group-batch-btn { padding: 0; border: 0; background: transparent; color: var(--eva-link, #1677ff); font-weight: 700; text-align: left; cursor: pointer; }
.gbd-task-wrap { margin: 0 0 8px; padding: 10px 12px 4px 28px; border-radius: 8px; background: #e8ebf0; }
.gbd-task-head, .gbd-task-row { display: grid; grid-template-columns: minmax(110px, 1fr) 90px 100px 126px 110px 110px; gap: 8px; align-items: center; }
.gbd-task-head { color: var(--eva-text-secondary, #6b7280); font-size: 13px; margin-bottom: 6px; }
.gbd-task-row { margin-bottom: 8px; }
.settle-section { margin-top: 16px; }
.settle-actions { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.bill-editable-text { font-family: monospace; font-size: 13px; line-height: 1.8; }

@media (max-width: 700px) {
  .gbh { flex-direction: column; align-items: stretch; }
  .bf-alloc-header,
  .bf-alloc-row { flex-direction: column; align-items: stretch; }
  .alloc-order-num,
  .alloc-debt-info { min-width: 0; }
  .offset-business-row,
  .refund-account-grid { display: flex; flex-direction: column; align-items: stretch; }
}
</style>
