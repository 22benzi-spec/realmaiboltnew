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
          <div class="gbh-meta">
            <span v-if="groupData.customer_name">{{ groupData.customer_name }}</span>
            <span v-if="groupData.sales_person" class="gbh-sep">·</span>
            <span v-if="groupData.sales_person">{{ groupData.sales_person }}</span>
            <span v-if="groupData.batch_date" class="gbh-sep">·</span>
            <span v-if="groupData.batch_date">{{ groupData.batch_date }}</span>
          </div>
        </div>
        <div class="gbh-right">
          <div class="gbh-trio gbh-fund-grid">
            <div class="trio-item">
              <div class="trio-label">实际应收（合计）</div>
              <div class="trio-val">¥{{ groupTotalActualReceivable.toFixed(2) }}</div>
            </div>
            <div class="trio-item">
              <div class="trio-label">累计收款</div>
              <div class="trio-val" :style="{ color: groupCollectedTotal > 0 ? '#16a34a' : '#9ca3af' }">
                ¥{{ groupCollectedTotal.toFixed(2) }}
              </div>
            </div>
            <div class="trio-item">
              <div class="trio-label">账面抵消</div>
              <div class="trio-val" style="color:#2563eb">¥{{ groupOffsetTotal.toFixed(2) }}</div>
            </div>
            <div class="trio-item">
              <div class="trio-label">累计退款</div>
              <div class="trio-val" style="color:#dc2626">¥{{ groupRefundTotal.toFixed(2) }}</div>
            </div>
            <div class="trio-item">
              <div class="trio-label">待结算差额</div>
              <div class="trio-val" :style="{ color: groupSettlementDiff < 0 ? '#dc2626' : groupSettlementDiff > 0 ? '#059669' : '#16a34a' }">
                <template v-if="groupSettlementDiff > 0.005">+¥{{ groupSettlementDiff.toFixed(2) }}</template>
                <template v-else-if="groupSettlementDiff < -0.005">-¥{{ Math.abs(groupSettlementDiff).toFixed(2) }}</template>
                <template v-else>¥0.00</template>
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
        <!-- 区块一：账款一览 -->
        <div class="gb-section">
          <div class="section-header">
            <span class="section-title">账款一览</span>
            <a-tag color="blue" size="small">{{ orders.length }} 个订单</a-tag>
            <div class="section-actions">
              <a-select v-model:value="batchStatusField" size="small" style="width: 96px">
                <a-select-option value="billing">入账状态</a-select-option>
                <a-select-option value="debt">账款情况</a-select-option>
              </a-select>
              <a-select v-if="batchStatusField === 'billing'" v-model:value="batchBillingTarget" size="small" style="width: 96px">
                <a-select-option value="已完成">已完成</a-select-option>
                <a-select-option value="未完成">未完成</a-select-option>
              </a-select>
              <a-select v-else v-model:value="batchDebtTarget" size="small" style="width: 112px">
                <a-select-option value="none">无异常</a-select-option>
                <a-select-option value="owed">客户需补款</a-select-option>
                <a-select-option value="surplus">需退客户</a-select-option>
                <a-select-option value="cleared">已结清</a-select-option>
              </a-select>
              <a-button size="small" :loading="statusSaving" @click="applyBatchStatus">批量应用</a-button>
            </div>
          </div>
          <div class="orders-table">
            <div class="orders-table-head">
              <span class="col-created">创建时间</span>
              <span class="col-num">订单号</span>
              <span class="col-asin">ASIN</span>
              <span class="col-amt">基础应收</span>
              <span class="col-paid">实际应收</span>
              <span class="col-status">入账状态</span>
              <span class="col-debt">账款情况</span>
            </div>
            <div
              v-for="row in orderRows"
              :key="row.order.id"
              class="orders-table-row"
              :class="{ 'row-attention': row.hasIssue }"
            >
              <span class="col-created">{{ formatOrderCreatedAt(row.order.created_at) }}</span>
              <span class="col-num">
                <span class="order-num-text">{{ row.order.order_number }}</span>
              </span>
              <span class="col-asin">{{ row.order.asin || '-' }}</span>
              <span class="col-amt">¥{{ row.baseReceivable.toFixed(2) }}</span>
              <span class="col-paid">
                ¥{{ row.actualReceivable.toFixed(2) }}
              </span>
              <span class="col-status">
                <a-select
                  v-model:value="row.order.billing_status"
                  size="small"
                  style="width: 86px"
                  :disabled="statusSaving"
                  @change="updateOrderBillingStatus(row.order)"
                >
                  <a-select-option value="已完成">已完成</a-select-option>
                  <a-select-option value="未完成">未完成</a-select-option>
                </a-select>
              </span>
              <span class="col-debt">
                <a-select
                  v-model:value="row.order.debt_status"
                  size="small"
                  style="width: 112px"
                  :disabled="statusSaving"
                  @change="updateOrderDebtStatus(row.order)"
                >
                  <a-select-option value="none">无异常</a-select-option>
                  <a-select-option value="owed">客户需补款</a-select-option>
                  <a-select-option value="surplus">需退客户</a-select-option>
                  <a-select-option value="cleared">已结清</a-select-option>
                </a-select>
              </span>
            </div>
          </div>
        </div>

        <!-- 区块二：合并款项录入（正数=补款，负数=退款） -->
        <div class="gb-section">
          <div class="section-header">
            <span class="section-title">合并款项录入</span>
            <span class="section-hint">正数为补款，负数为退款；同一批次可混合录入</span>
          </div>

          <div class="batch-form">
            <!-- 每个订单逐行录入 -->
            <div class="bf-alloc-header">
              <span class="bf-label">各订单款项填写</span>
              <span class="alloc-hint">正数=补款 / 负数=退款，留空则不记录</span>
            </div>
            <div class="bf-alloc-list">
              <div v-for="row in allocRows" :key="row.orderId" class="bf-alloc-row">
                <span class="alloc-order-num">{{ row.orderNumber }}</span>
                <div class="alloc-debt-info">
                  <span class="alloc-debt-tag" :class="row.debtHintType || 'hint-none'">
                    {{ row.debtHint || '欠款/溢款：无' }}
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
                :disabled="allocSupplementTotal <= 0"
                @click="openBatchRecordModal('supplement')"
              >
                录入补款
              </a-button>
              <a-button
                :disabled="allocSupplementTotal <= 0"
                @click="openBatchRecordModal('offset')"
              >
                账面抵消
              </a-button>
              <a-button
                danger
                :disabled="allocRefundTotal <= 0"
                @click="openBatchRecordModal('refund')"
              >
                提交退款
              </a-button>
              <span class="bf-submit-hint" v-if="allocRefundTotal > 0">含退款将生成待审批流水</span>
            </div>
          </div>
        </div>

        <!-- 区块三：整组交易明细 -->
        <div class="gb-section">
          <div class="section-header">
            <span class="section-title">整组交易明细</span>
            <a-tag color="default" size="small">{{ displayGroupPayments.length }} 条</a-tag>
          </div>
          <div v-if="allPayments.length === 0" class="records-mock-tip">暂无真实交易明细，以下为示例渲染</div>
          <div class="payment-lines">
            <div class="payment-line payment-line-head">
              <span>时间</span>
              <span>交易类型</span>
              <span>收支方向</span>
              <span>金额</span>
              <span>方式</span>
              <span>备注</span>
            </div>
            <div v-for="p in displayGroupPayments" :key="p.id" class="payment-line" :class="{ 'payment-line-mock': p._isMock }">
              <span class="payment-line-date">{{ p.payment_date || '-' }}</span>
              <span>
                <a-tag :color="getPaymentTypeColor(p.payment_type)" size="small">{{ getPaymentTransactionType(p) }}</a-tag>
                <a-tag v-if="p._isMock" color="default" size="small">示例</a-tag>
              </span>
              <span>
                <a-tag :color="getPaymentDirectionColor(getPaymentDirection(p))" size="small">{{ getPaymentDirection(p) }}</a-tag>
              </span>
              <span :class="getPaymentDirection(p) === '支出' ? 'payment-line-refund' : getPaymentDirection(p) === '账面抵消' ? 'payment-line-offset' : 'payment-line-income'">
                {{ getPaymentDirection(p) === '支出' ? '-' : getPaymentDirection(p) === '账面抵消' ? '抵 ' : '+' }}¥{{ Math.abs(Number(p.amount_cny || 0)).toFixed(2) }}
              </span>
              <span class="payment-line-meta">
                <template v-if="p.payment_method">{{ p.payment_method }}</template>
                <template v-else>-</template>
              </span>
              <span class="payment-line-notes">
                {{ p.notes || '-' }}
                <template v-if="p._orderNumber">
                  <br />
                  订单：{{ p._orderNumber }}
                </template>
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <a-modal
      v-model:open="batchRecordModalOpen"
      :title="getBatchRecordTitle()"
      :confirm-loading="batchRecordSaving"
      :ok-text="getBatchRecordOkText()"
      :ok-button-props="{ danger: batchRecordMode === 'refund' }"
      cancel-text="取消"
      width="520px"
      @ok="saveBatchRecord"
    >
      <div class="add-record-form">
        <div v-if="batchRecordMode !== 'supplement'" class="add-record-alert" :class="{ 'add-record-alert-offset': batchRecordMode === 'offset' }">
          {{ batchRecordMode === 'refund' ? '退款将生成待审批流水，需财务审批后执行' : '账面抵消不产生实际到账，但会进入交易流水用于对账' }}
        </div>
        <div class="batch-record-summary">
          本次{{ batchRecordMode === 'refund' ? '退款' : batchRecordMode === 'offset' ? '账面抵消目标' : '补款' }}
          {{ selectedBatchRows.length }} 个订单，合计
          ¥{{ selectedBatchTotal.toFixed(2) }}
        </div>
        <div v-if="batchRecordMode !== 'offset'" class="offset-inline-action">
          <span>{{ batchRecordMode === 'refund' ? '如果部分金额已用账面抵消，先录抵消后再提交退款。' : '如果部分金额已用账面抵消，先录抵消后再补款。' }}</span>
          <a-button size="small" @click="openBatchRecordModal('offset', true)">账面抵消</a-button>
        </div>
        <div v-if="batchRecordMode === 'offset'" class="offset-brief-card">
          <div class="offset-brief-head">
            <span>抵消来源任务</span>
            <a-button size="small" @click="addBatchOffsetTaskRow">添加任务</a-button>
          </div>
          <div class="offset-business-list">
            <div v-for="(row, index) in batchRecordForm.offset_task_rows" :key="index" class="offset-business-row">
              <a-input v-model:value="row.task_id" size="small" placeholder="任务ID / 订单号" style="flex:1" />
              <a-input-number v-model:value="row.amount_cny" size="small" :min="0" :precision="2" style="width:120px" placeholder="抵消金额" />
              <a-button
                size="small"
                danger
                :disabled="batchRecordForm.offset_task_rows.length <= 1"
                @click="removeBatchOffsetTaskRow(index)"
              >
                删除
              </a-button>
            </div>
          </div>
          <div class="offset-brief-total">抵消来源合计：¥{{ batchOffsetTaskTotal.toFixed(2) }}</div>
        </div>
        <div v-if="batchRecordMode !== 'offset'" class="ar-field">
          <label class="ar-label">一级分类</label>
          <a-select v-model:value="batchRecordForm.primary_category" style="width:100%" @change="onBatchRecordPrimaryChange">
            <a-select-option v-for="item in batchRecordPrimaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
          </a-select>
        </div>
        <div v-if="batchRecordMode !== 'offset' && batchRecordForm.primary_category !== '行政办公'" class="ar-field">
          <label class="ar-label">二级分类</label>
          <a-select v-model:value="batchRecordForm.secondary_categories" mode="multiple" style="width:100%" placeholder="可多选">
            <a-select-option v-for="item in batchRecordSecondaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
          </a-select>
        </div>
        <div v-if="batchRecordMode === 'supplement'" class="ar-field">
          <label class="ar-label">补款币种</label>
          <a-radio-group v-model:value="batchRecordForm.currency_mode" size="small">
            <a-radio-button value="cny">人民币</a-radio-button>
            <a-radio-button value="usd">美元</a-radio-button>
            <a-radio-button value="both">同时填写</a-radio-button>
          </a-radio-group>
        </div>
        <div v-if="showBatchSupplementCny" class="ar-field">
          <label class="ar-label">补款金额（人民币）</label>
          <a-input-number
            v-model:value="batchRecordForm.amount_cny"
            style="width:100%"
            :min="0"
            :precision="2"
            placeholder="人民币金额"
            @change="syncBatchAmountToSelectedRows"
          />
        </div>
        <div v-if="showBatchSupplementUsd" class="ar-field">
          <label class="ar-label">补款金额（USD）</label>
          <a-input-number
            v-model:value="batchRecordForm.amount_usd"
            style="width:100%"
            :min="0"
            :precision="2"
            placeholder="美金金额"
          />
        </div>
        <div v-if="batchRecordMode === 'refund'" class="ar-field">
          <label class="ar-label">
            退款金额（元）
            <span class="required">*</span>
          </label>
          <a-input-number
            v-model:value="batchRecordForm.amount_cny"
            style="width:100%"
            :min="0"
            :precision="2"
            placeholder="退款金额"
            @change="syncBatchAmountToSelectedRows"
          />
        </div>
        <div v-if="batchRecordMode === 'supplement'" class="add-record-tip">
          默认只展示一种币种；确实需要双币种时选择“同时填写”。
        </div>
        <div v-if="batchRecordMode === 'offset'" class="offset-brief-card">
          <div class="offset-brief-head">
            <span>抵消明细</span>
            <a-button size="small" @click="addBatchOffsetBusinessRow">添加类型</a-button>
          </div>
          <div class="offset-business-list">
            <div v-for="(row, index) in batchRecordForm.offset_business_rows" :key="index" class="offset-business-row">
              <a-select v-model:value="row.business_type" size="small" placeholder="类型" style="flex:1" show-search>
                <a-select-option v-for="item in businessTypeOptions" :key="item" :value="item">{{ item }}</a-select-option>
              </a-select>
              <a-input-number v-model:value="row.order_count" size="small" :min="1" :precision="0" style="width:110px" placeholder="对应单量" />
              <a-button
                size="small"
                danger
                :disabled="batchRecordForm.offset_business_rows.length <= 1"
                @click="removeBatchOffsetBusinessRow(index)"
              >
                删除
              </a-button>
            </div>
          </div>
          <div class="offset-brief-tip">例如：文字对应 3 单，免评对应 1 单。</div>
        </div>
        <div v-if="batchRecordMode !== 'offset'" class="ar-field">
          <label class="ar-label">{{ batchRecordMode === 'refund' ? '退款日期' : '补款日期' }} <span class="required">*</span></label>
          <a-date-picker v-model:value="batchRecordForm.payment_date_picker" style="width:100%" placeholder="选择日期" value-format="YYYY-MM-DD" />
        </div>
        <div v-if="batchRecordMode !== 'offset'" class="ar-field">
          <label class="ar-label">方式</label>
          <a-select v-model:value="batchRecordForm.payment_method" style="width:100%">
            <a-select-option value="银行转账">银行转账</a-select-option>
            <a-select-option value="微信">微信</a-select-option>
            <a-select-option value="支付宝">支付宝</a-select-option>
            <a-select-option value="其他">其他</a-select-option>
          </a-select>
        </div>
        <div v-if="isBatchRefundAccountTransfer" class="refund-account-grid">
          <div class="ar-field">
            <label class="ar-label">退款账号</label>
            <a-input v-model:value="batchRecordForm.refund_account" placeholder="银行账号 / 支付宝账号" />
          </div>
          <div class="ar-field">
            <label class="ar-label">姓氏</label>
            <a-input v-model:value="batchRecordForm.refund_account_surname" placeholder="收款人姓氏" />
          </div>
        </div>
        <div v-if="batchRecordMode !== 'offset'" class="ar-field">
          <label class="ar-label">{{ batchRecordMode === 'refund' ? '退款对象' : '付款人' }}</label>
          <a-input v-model:value="batchRecordForm.payer_name" placeholder="姓名" />
        </div>
        <div class="ar-field">
          <label class="ar-label">操作人</label>
          <a-input v-model:value="batchRecordForm.recorded_by" placeholder="录入人" />
        </div>
        <div v-if="batchRecordMode !== 'offset'" class="ar-field">
          <label class="ar-label">{{ batchRecordMode === 'refund' ? '上传退款二维码' : '上传凭证' }}</label>
          <a-upload
            v-model:file-list="batchRecordFiles"
            list-type="picture-card"
            :before-upload="() => false"
            accept="image/*,.pdf"
            :multiple="true"
          >
            <div v-if="batchRecordFiles.length < 5" class="upload-btn">
              <PlusOutlined />
              <div style="margin-top:4px;font-size:12px">上传</div>
            </div>
          </a-upload>
        </div>
        <div v-if="batchRecordMode !== 'offset' || !offsetOpenedFromNestedBatchAction" class="ar-field">
          <label class="ar-label">备注</label>
          <a-textarea v-model:value="batchRecordForm.notes" :rows="2" placeholder="备注（可选）" />
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
const statusSaving = ref(false)
const batchStatusField = ref<'billing' | 'debt'>('billing')
const batchBillingTarget = ref('已完成')
const batchDebtTarget = ref('cleared')

const orderPaymentMap = ref<Record<string, number>>({})

function getOrderBaseReceivable(order: any) {
  return Number(order?.total_amount || 0)
}

function getOrderActualReceivable(order: any) {
  const base = getOrderBaseReceivable(order)
  const adjustment = Number(order?.debt_amount || 0)
  if (order?.debt_status === 'owed') return base + adjustment
  if (order?.debt_status === 'surplus') return base - adjustment
  return base
}

const orderRows = computed(() => {
  return orders.value.map(o => {
    const paid = orderPaymentMap.value[o.id] || 0
    const hasIssue = o.debt_status === 'owed' || o.debt_status === 'surplus'
    return {
      order: o,
      paid,
      hasIssue,
      baseReceivable: getOrderBaseReceivable(o),
      actualReceivable: getOrderActualReceivable(o),
    }
  })
})

const pendingOrders = computed(() =>
  orders.value.filter(o => o.debt_status === 'owed' || o.debt_status === 'surplus')
)

const groupTotalActualReceivable = computed(() =>
  orders.value.reduce((s, o) => s + getOrderActualReceivable(o), 0)
)

const groupCollectedTotal = computed(() =>
  allPayments.value
    .filter(p => !p.payment_type || p.payment_type === '基础收款' || p.payment_type === '补款')
    .reduce((s, p) => s + Number(p.amount_cny || 0), 0)
)

const groupOffsetTotal = computed(() =>
  allPayments.value
    .filter(p => p.payment_type === '账面抵消')
    .reduce((s, p) => s + Number(p.amount_cny || 0), 0)
)

const groupRefundTotal = computed(() =>
  allPayments.value
    .filter(p => p.payment_type === '退款')
    .reduce((s, p) => s + Number(p.amount_cny || 0), 0)
)

const groupSettledTotal = computed(() => groupCollectedTotal.value + groupOffsetTotal.value - groupRefundTotal.value)

const groupSettlementDiff = computed(() => groupSettledTotal.value - groupTotalActualReceivable.value)

async function updateOrdersStatus(orderIds: string[], payload: any, successText: string) {
  if (orderIds.length === 0) return
  statusSaving.value = true
  try {
    const updatePayload = { ...payload, updated_at: new Date().toISOString() }
    const { error } = await supabase
      .from('erp_orders')
      .update(updatePayload)
      .in('id', orderIds)
    if (error) throw error

    orderIds.forEach((id) => {
      const idx = orders.value.findIndex(o => o.id === id)
      if (idx !== -1) {
        orders.value[idx] = { ...orders.value[idx], ...updatePayload }
      }
    })
    message.success(successText)
    emit('updated')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    statusSaving.value = false
  }
}

function updateOrderBillingStatus(order: any) {
  updateOrdersStatus([order.id], { billing_status: order.billing_status || '已完成' }, '入账状态已更新')
}

function updateOrderDebtStatus(order: any) {
  const payload: any = { debt_status: order.debt_status || 'none' }
  if (payload.debt_status === 'none' || payload.debt_status === 'cleared') {
    payload.debt_amount = 0
  }
  updateOrdersStatus([order.id], payload, '账款情况已更新')
}

function applyBatchStatus() {
  if (batchStatusField.value === 'billing') {
    updateOrdersStatus(orders.value.map(o => o.id), { billing_status: batchBillingTarget.value }, '整组入账状态已更新')
    return
  }
  const payload: any = { debt_status: batchDebtTarget.value }
  if (batchDebtTarget.value === 'none' || batchDebtTarget.value === 'cleared') {
    payload.debt_amount = 0
  }
  updateOrdersStatus(orders.value.map(o => o.id), payload, '整组账款情况已更新')
}

async function loadOrders() {
  if (props.groupOrders?.length) {
    orders.value = props.groupOrders.map(normalizeOrderBillingFields)
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
  orders.value = (data || []).map(normalizeOrderBillingFields)
}

function normalizeOrderBillingFields(order: any) {
  return {
    ...order,
    billing_status: order.billing_status || '已完成',
    debt_status: order.debt_status || 'none',
  }
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
      const amount = Number(p.amount_cny || 0)
      map[p.batch_id] += p.payment_type === '退款' ? -Math.abs(amount) : amount
    }
  }
  orderPaymentMap.value = map
}

const mockGroupPayments = computed(() => {
  const today = dayjs().format('YYYY-MM-DD')
  const firstOrder = orders.value[0] || {}
  const secondOrder = orders.value[1] || firstOrder
  return [
    {
      id: 'mock-group-supplement',
      _isMock: true,
      _orderNumber: firstOrder.order_number || 'TASK-GRP-示例-001',
      payment_type: '补款',
      amount_cny: 120,
      payment_date: today,
      payment_method: '银行转账',
      payer_name: props.groupData?.customer_name || firstOrder.customer_name || '客户',
      notes: '分类: 补款收入 | 组内补款示例',
    },
    {
      id: 'mock-group-refund',
      _isMock: true,
      _orderNumber: secondOrder.order_number || 'TASK-GRP-示例-002',
      payment_type: '退款',
      amount_cny: 35,
      payment_date: today,
      payment_method: '银行转账',
      payer_name: props.groupData?.customer_name || secondOrder.customer_name || '客户',
      notes: '分类: 截单退款 | 组内退款示例',
    },
  ]
})

const displayGroupPayments = computed(() => allPayments.value.length ? allPayments.value : mockGroupPayments.value)

function getPaymentTypeColor(type: string) {
  const map: Record<string, string> = { '基础收款': 'green', '补款': 'cyan', '退款': 'red', '账面抵消': 'blue' }
  return map[type] || 'green'
}

function getPaymentTransactionType(payment: any) {
  if (payment?.transaction_type) return payment.transaction_type
  const map: Record<string, string> = {
    '基础收款': '任务收入',
    '补款': '补款收入',
    '退款': '截单退款',
    '账面抵消': '账面抵消',
  }
  return map[payment?.payment_type] || payment?.payment_type || '任务收入'
}

function getPaymentDirection(payment: any) {
  const direction = payment?.direction || payment?.transaction_direction
  if (['收入', '支出', '账面抵消'].includes(direction)) return direction
  if (payment?.payment_type === '退款') return '支出'
  if (payment?.payment_type === '账面抵消') return '账面抵消'
  return '收入'
}

function getPaymentDirectionColor(direction: string) {
  const map: Record<string, string> = { '收入': 'green', '支出': 'red', '账面抵消': 'blue' }
  return map[direction] || 'default'
}

function formatOrderCreatedAt(value: any) {
  if (!value) return '-'
  return dayjs(value).format('MM-DD HH:mm')
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
    orders.value = val.map(normalizeOrderBillingFields)
    loadAllPayments()
  }
}, { immediate: true })

// --- 合并款项录入 ---
const batchRecordModalOpen = ref(false)
const batchRecordSaving = ref(false)
const batchRecordMode = ref<'supplement' | 'refund' | 'offset'>('supplement')
const offsetOpenedFromNestedBatchAction = ref(false)
const nestedBatchReturnMode = ref<'supplement' | 'refund' | null>(null)
const nestedBatchParentFormSnapshot = ref<any | null>(null)
const nestedBatchParentFilesSnapshot = ref<any[]>([])
const nestedBatchParentAllocMap = ref<Record<string, number | undefined>>({})
const batchRecordFiles = ref<any[]>([])
const businessTypeOptions = ['文字', '免评', '图片', '视频', 'Feedback']

interface AllocRow {
  orderId: string
  orderNumber: string
  expected: number
  allocated: number | undefined
  debtHint: string
  debtHintType: string
  allocPlaceholder: string
}

const allocRows = ref<AllocRow[]>([])

function buildAllocRows(orderList: any[]): AllocRow[] {
  return orderList.map(o => {
    const debtStatus = o.debt_status
    const debtAmt = Number(o.debt_amount || 0)
    const expected = Number(o.total_amount || 0)
    const paid = Number(orderPaymentMap.value[o.id] || 0)
    const diff = expected - paid
    let debtHint = ''
    let debtHintType = ''
    let autoFill: number | undefined = undefined
    let allocPlaceholder = '金额（正=补款 负=退款）'

    if (debtStatus === 'owed' && (debtAmt > 0 || diff > 0.005)) {
      const amount = debtAmt > 0 ? debtAmt : diff
      debtHint = `欠款 +¥${amount.toFixed(2)}`
      debtHintType = 'hint-owed'
      autoFill = amount
      allocPlaceholder = `+${amount.toFixed(2)}（欠款）`
    } else if (debtStatus === 'surplus' && (debtAmt > 0 || diff < -0.005)) {
      const amount = debtAmt > 0 ? debtAmt : Math.abs(diff)
      debtHint = `溢收 -¥${amount.toFixed(2)}`
      debtHintType = 'hint-surplus'
      autoFill = -amount
      allocPlaceholder = `-${amount.toFixed(2)}（溢收应退）`
    }

    return {
      orderId: o.id,
      orderNumber: o.order_number,
      expected,
      allocated: autoFill,
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

function resetBatchForm() {
  allocRows.value = buildAllocRows(orders.value)
}

function rebuildAllocRowsWithDrafts(draftMap: Record<string, number | undefined>) {
  allocRows.value = buildAllocRows(orders.value).map(row => (
    Object.prototype.hasOwnProperty.call(draftMap, row.orderId)
      ? { ...row, allocated: draftMap[row.orderId] }
      : row
  ))
}

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
    children: [],
  },
  {
    value: '其他收入',
    label: '其他收入',
    children: [
      { value: '开箱视频', label: '开箱视频' },
      { value: '删差评', label: '删差评' },
      { value: '其他', label: '其他' },
    ],
  },
  {
    value: '其他支出',
    label: '其他支出',
    children: [
      { value: '开箱视频', label: '开箱视频' },
      { value: '删差评', label: '删差评' },
      { value: '其他', label: '其他' },
    ],
  },
]

const batchRecordForm = ref({
  primary_category: '业务收入',
  secondary_categories: ['补款收入'] as string[],
  currency_mode: 'cny' as 'cny' | 'usd' | 'both',
  amount_cny: undefined as number | undefined,
  amount_usd: undefined as number | undefined,
  payment_date_picker: null as any,
  payment_method: '银行转账',
  refund_account: '',
  refund_account_surname: '',
  payer_name: '',
  recorded_by: '',
  offset_source_type: '客户余款抵消',
  offset_source_note: '',
  offset_related_task_id: '',
  offset_task_rows: [{ task_id: '', amount_cny: undefined as number | undefined }],
  offset_business_rows: [{ business_type: '', order_count: undefined as number | undefined }],
  notes: '',
})

const isBatchRefundAccountTransfer = computed(() =>
  batchRecordMode.value === 'refund' && ['银行转账', '支付宝'].includes(batchRecordForm.value.payment_method),
)
const showBatchSupplementCny = computed(() =>
  batchRecordMode.value === 'supplement' && ['cny', 'both'].includes(batchRecordForm.value.currency_mode),
)
const showBatchSupplementUsd = computed(() =>
  batchRecordMode.value === 'supplement' && ['usd', 'both'].includes(batchRecordForm.value.currency_mode),
)
const batchOffsetTaskTotal = computed(() =>
  batchRecordForm.value.offset_task_rows.reduce((sum: number, row: any) => sum + Number(row.amount_cny || 0), 0),
)

const selectedBatchRows = computed(() =>
  allocRows.value.filter((row) => {
    const amount = Number(row.allocated || 0)
    if (batchRecordMode.value === 'refund') return amount < 0
    if (batchRecordMode.value === 'offset' && offsetOpenedFromNestedBatchAction.value && nestedBatchReturnMode.value === 'refund') return amount < 0
    return amount > 0
  })
)

const selectedBatchTotal = computed(() =>
  selectedBatchRows.value.reduce((sum, row) => sum + Math.abs(Number(row.allocated || 0)), 0)
)

function syncBatchAmountToSelectedRows() {
  if (batchRecordMode.value === 'offset') return
  const currentRows = selectedBatchRows.value
  if (!currentRows.length) return
  const targetTotal = Number(batchRecordForm.value.amount_cny || 0)
  const currentTotal = currentRows.reduce((sum, row) => sum + Math.abs(Number(row.allocated || 0)), 0)
  if (targetTotal <= 0 || currentTotal <= 0) return
  let assignedTotal = 0
  currentRows.forEach((row, index) => {
    const ratio = Math.abs(Number(row.allocated || 0)) / currentTotal
    const nextAmount = index === currentRows.length - 1
      ? targetTotal - assignedTotal
      : Number((targetTotal * ratio).toFixed(2))
    assignedTotal += nextAmount
    row.allocated = batchRecordMode.value === 'refund' ? -Math.abs(nextAmount) : Math.abs(nextAmount)
  })
}

const batchRecordPrimaryOptions = computed(() => billingTransactionCategoryOptions.filter(item =>
  batchRecordMode.value === 'refund'
    ? ['业务支出', '其他支出'].includes(item.value)
    : batchRecordMode.value === 'offset'
      ? false
    : ['业务收入', '其他收入'].includes(item.value),
))

const batchRecordSecondaryOptions = computed(() =>
  batchRecordPrimaryOptions.value.find(item => item.value === batchRecordForm.value.primary_category)?.children || [],
)

function onBatchRecordPrimaryChange() {
  if (batchRecordForm.value.primary_category === '行政办公') {
    batchRecordForm.value.secondary_categories = []
    return
  }
  const nextValues = batchRecordForm.value.secondary_categories.filter(value =>
    batchRecordSecondaryOptions.value.some(item => item.value === value),
  )
  batchRecordForm.value.secondary_categories = nextValues.length
    ? nextValues
    : (batchRecordSecondaryOptions.value[0] ? [batchRecordSecondaryOptions.value[0].value] : [])
}

function createBatchOffsetBusinessRows() {
  const firstOrder = selectedBatchRows.value
    .map(row => orders.value.find(o => o.id === row.orderId))
    .find(Boolean)
  const businessDetail = buildOrderBusinessBreakdown(firstOrder, 0)
  const rows = businessDetail.types.map((type: string) => ({
    business_type: type,
    order_count: undefined as number | undefined,
  }))
  return rows.length ? rows : [{ business_type: '', order_count: undefined as number | undefined }]
}

function addBatchOffsetBusinessRow() {
  batchRecordForm.value.offset_business_rows.push({ business_type: '', order_count: undefined })
}

function removeBatchOffsetBusinessRow(index: number) {
  if (batchRecordForm.value.offset_business_rows.length <= 1) return
  batchRecordForm.value.offset_business_rows.splice(index, 1)
}

function addBatchOffsetTaskRow() {
  batchRecordForm.value.offset_task_rows.push({ task_id: '', amount_cny: undefined })
}

function removeBatchOffsetTaskRow(index: number) {
  if (batchRecordForm.value.offset_task_rows.length <= 1) return
  batchRecordForm.value.offset_task_rows.splice(index, 1)
}

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

function getBatchRecordTitle() {
  const map: Record<string, string> = { supplement: '录入补款', refund: '提交退款', offset: '录入账面抵消' }
  return map[batchRecordMode.value]
}

function getBatchRecordOkText() {
  const map: Record<string, string> = { supplement: '录入补款', refund: '提交退款', offset: '保存抵消' }
  return map[batchRecordMode.value]
}

function openBatchRecordModal(mode: 'supplement' | 'refund' | 'offset', fromNestedAction = false) {
  if (mode === 'offset' && fromNestedAction) {
    nestedBatchReturnMode.value = batchRecordMode.value === 'refund' ? 'refund' : 'supplement'
    nestedBatchParentFormSnapshot.value = JSON.parse(JSON.stringify(batchRecordForm.value))
    nestedBatchParentFilesSnapshot.value = [...batchRecordFiles.value]
    nestedBatchParentAllocMap.value = allocRows.value.reduce((acc, row) => {
      acc[row.orderId] = row.allocated
      return acc
    }, {} as Record<string, number | undefined>)
  } else if (!fromNestedAction) {
    nestedBatchReturnMode.value = null
    nestedBatchParentFormSnapshot.value = null
    nestedBatchParentFilesSnapshot.value = []
    nestedBatchParentAllocMap.value = {}
  }
  batchRecordMode.value = mode
  offsetOpenedFromNestedBatchAction.value = mode === 'offset' && fromNestedAction
  const needsPositiveAmount = mode === 'supplement' || (mode === 'offset' && (!fromNestedAction || nestedBatchReturnMode.value !== 'refund'))
  const needsRefundAmount = mode === 'refund' || (mode === 'offset' && fromNestedAction && nestedBatchReturnMode.value === 'refund')
  if ((needsPositiveAmount && allocSupplementTotal.value <= 0) || (needsRefundAmount && allocRefundTotal.value <= 0)) {
    message.warning(mode === 'refund' ? '请至少填写一条退款金额' : '请至少填写一条正向金额')
    return
  }
  batchRecordFiles.value = []
  batchRecordForm.value = {
    primary_category: mode === 'refund' ? '业务支出' : mode === 'offset' ? '业务收入' : '业务收入',
    secondary_categories: [mode === 'refund' ? '截单退款' : mode === 'offset' ? '账面抵消' : '补款收入'],
    currency_mode: 'cny',
    amount_cny: mode === 'offset' ? undefined : selectedBatchTotal.value,
    amount_usd: undefined,
    payment_date_picker: dayjs(),
    payment_method: mode === 'offset' ? '账面抵消' : '银行转账',
    refund_account: '',
    refund_account_surname: '',
    payer_name: props.groupData?.customer_name || orders.value[0]?.customer_name || '',
    recorded_by: currentUser.value?.name || '',
    offset_source_type: '客户余款抵消',
    offset_source_note: '',
    offset_related_task_id: '',
    offset_task_rows: [{ task_id: '', amount_cny: undefined }],
    offset_business_rows: createBatchOffsetBusinessRows(),
    notes: '',
  }
  onBatchRecordPrimaryChange()
  batchRecordModalOpen.value = true
}

async function saveBatchRecord() {
  const mode = batchRecordMode.value
  if (mode !== 'offset' && !batchRecordForm.value.payment_date_picker) {
    message.warning('请选择日期')
    return
  }
  if (!batchRecordForm.value.primary_category) {
    message.warning('请选择一级分类')
    return
  }
  if (batchRecordForm.value.primary_category !== '行政办公' && !batchRecordForm.value.secondary_categories.length) {
    message.warning('请选择二级分类')
    return
  }
  const toProcess = selectedBatchRows.value
  if (toProcess.length === 0) {
    message.warning(mode === 'refund' ? '请至少填写一条退款金额' : '请至少填写一条正向金额')
    return
  }
  if (mode === 'refund' && Number(batchRecordForm.value.amount_cny || 0) <= 0) {
    message.warning('请输入退款金额')
    return
  }
  if (mode === 'supplement') {
    const hasCny = ['cny', 'both'].includes(batchRecordForm.value.currency_mode) && Number(batchRecordForm.value.amount_cny || 0) > 0
    const hasUsd = ['usd', 'both'].includes(batchRecordForm.value.currency_mode) && Number(batchRecordForm.value.amount_usd || 0) > 0
    if (!hasCny && !hasUsd) {
      message.warning('请至少填写人民币或美元补款金额')
      return
    }
  }
  const offsetBusinessRows = batchRecordForm.value.offset_business_rows
    .map((row: any) => ({
      business_type: normalizeBusinessType(row.business_type),
      order_count: Number(row.order_count || 0),
    }))
    .filter((row: any) => row.business_type || row.order_count > 0)
  const offsetBusinessCount = offsetBusinessRows.reduce((sum: number, row: any) => sum + row.order_count, 0)
  const offsetTaskRows = batchRecordForm.value.offset_task_rows
    .map((row: any) => ({
      task_id: String(row.task_id || '').trim(),
      amount_cny: Number(row.amount_cny || 0),
    }))
    .filter((row: any) => row.task_id || row.amount_cny > 0)
  const offsetTaskAmount = offsetTaskRows.reduce((sum: number, row: any) => sum + row.amount_cny, 0)
  if (mode === 'offset') {
    if (offsetTaskRows.length === 0 || offsetTaskRows.some((row: any) => !row.task_id || row.amount_cny <= 0)) {
      message.warning('请完整填写每行抵消任务ID和抵消金额')
      return
    }
    if (Math.abs(offsetTaskAmount - selectedBatchTotal.value) > 0.005) {
      message.warning('抵消来源金额需等于本次账面抵消目标合计')
      return
    }
    if (offsetBusinessRows.length === 0 || offsetBusinessRows.some((row: any) => !row.business_type || row.order_count <= 0)) {
      message.warning('请完整填写每行抵消类型和对应单量')
      return
    }
  }

  batchRecordSaving.value = true
  try {
    const paymentDate = typeof batchRecordForm.value.payment_date_picker === 'string'
      ? batchRecordForm.value.payment_date_picker
      : batchRecordForm.value.payment_date_picker?.format('YYYY-MM-DD')
    const secondaryCategories = batchRecordForm.value.primary_category === '行政办公' ? [] : batchRecordForm.value.secondary_categories
    const categorySummary = secondaryCategories.join(' / ')
    let receiptUrls: string[] = []
    for (const f of batchRecordFiles.value) {
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

    const selectedTotalBeforeSave = selectedBatchTotal.value
    const formCnyTotal = mode === 'offset'
      ? selectedBatchTotal.value
      : mode === 'supplement' && batchRecordForm.value.currency_mode === 'usd'
        ? 0
        : Number(batchRecordForm.value.amount_cny || 0)
    const formUsdTotal = mode === 'supplement' && batchRecordForm.value.currency_mode !== 'cny'
      ? Number(batchRecordForm.value.amount_usd || 0)
      : 0
    for (const row of toProcess) {
      const rawAmt = Number(row.allocated)
      const isRefund = mode === 'refund'
      const isOffset = mode === 'offset'
      const ratio = selectedTotalBeforeSave > 0 ? Math.abs(rawAmt) / selectedTotalBeforeSave : 1 / toProcess.length
      const absAmt = isOffset ? Math.abs(rawAmt) : Number((formCnyTotal * ratio).toFixed(2))
      const usdAmt = isRefund || isOffset ? 0 : Number((formUsdTotal * ratio).toFixed(2))
      const order = orders.value.find(o => o.id === row.orderId)
      if (!order) continue
      const businessDetail = buildOrderBusinessBreakdown(order, absAmt)
      const businessTypes = isOffset
        ? Array.from(new Set<string>(offsetBusinessRows.map((item: any) => item.business_type).filter(Boolean)))
        : businessDetail.types
      const businessOrderCount = isOffset ? offsetBusinessCount : businessDetail.orderCount
      const businessBreakdown = isOffset
        ? offsetBusinessRows.map((item: any) => ({
          order_id: order.id,
          order_number: offsetTaskRows.map((task: any) => task.task_id).join('、'),
          country: '',
          business_type: item.business_type,
          order_count: item.order_count,
          amount_cny: offsetBusinessCount > 0 ? Number((absAmt * item.order_count / offsetBusinessCount).toFixed(2)) : 0,
        }))
        : businessDetail.breakdown
      const noteParts: string[] = []
      if (isOffset) {
        noteParts.push(`抵消来源: ${offsetTaskRows.map((task: any) => `${task.task_id} ¥${task.amount_cny.toFixed(2)}`).join('、')}`)
        noteParts.push(`抵消明细: ${offsetBusinessRows.map((item: any) => `${item.business_type}${item.order_count}单`).join('、')}`)
      }
      if (isRefund && batchRecordForm.value.refund_account) {
        noteParts.push(`退款账号: ${batchRecordForm.value.refund_account}`)
      }
      if (isRefund && batchRecordForm.value.refund_account_surname) {
        noteParts.push(`姓氏: ${batchRecordForm.value.refund_account_surname}`)
      }
      if (batchRecordForm.value.notes) noteParts.push(batchRecordForm.value.notes)
      const recordNotes = noteParts.join(' | ')

      const { data: txNo } = await supabase.rpc('generate_transaction_no')
      const transactionNo = txNo || `FT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

      const { data: txData, error: txErr } = await supabase.from('financial_transactions').insert({
        transaction_no: transactionNo,
        entry_scope: batchRecordForm.value.primary_category,
        transaction_type: secondaryCategories[0] || null,
        direction: isOffset ? '账面抵消' : (isRefund ? '支出' : '收入'),
        amount_cny: absAmt,
        amount_usd: usdAmt,
        exchange_rate: order.exchange_rate || 7.25,
        customer_name: order.customer_name || '',
        customer_id_str: order.customer_id_str || '',
        order_id: order.id,
        order_number: order.order_number,
        staff_name: batchRecordForm.value.recorded_by,
        status: isRefund ? '待审批' : '已确认',
        business_countries: isOffset ? [] : businessDetail.countries,
        business_types: businessTypes,
        business_order_count: businessOrderCount,
        business_breakdown: businessBreakdown,
        offset_source_type: null,
        offset_source_note: null,
        notes: `${categorySummary} - ${batchRecordForm.value.payment_method}${recordNotes ? ' | ' + recordNotes : ''}`,
        transaction_date: paymentDate,
        receipt_urls: receiptUrls,
      }).select('id').maybeSingle()
      if (txErr) throw txErr

      const { error: payErr } = await supabase.from('batch_payments').insert({
        batch_id: order.id,
        batch_number: order.order_number,
        transaction_id: txData?.id || null,
        amount_cny: absAmt,
        amount_usd: usdAmt,
        payment_date: paymentDate,
        payment_method: batchRecordForm.value.payment_method,
        payer_name: batchRecordForm.value.payer_name,
        recorded_by: batchRecordForm.value.recorded_by,
        notes: [`分类: ${categorySummary}`, recordNotes].filter(Boolean).join(' | '),
        payment_type: isOffset ? '账面抵消' : (isRefund ? '退款' : '补款'),
        business_countries: isOffset ? [] : businessDetail.countries,
        business_types: businessTypes,
        business_order_count: businessOrderCount,
        business_breakdown: businessBreakdown,
        offset_source_type: null,
        offset_source_note: null,
        receipt_urls: receiptUrls,
      })
      if (payErr) throw payErr

    }

    const supplementCount = toProcess.filter(r => Number(r.allocated) > 0).length
    const refundCount = toProcess.filter(r => Number(r.allocated) < 0).length
    const parts = []
    if (supplementCount > 0) parts.push(`补款 ${supplementCount} 笔`)
    if (refundCount > 0) parts.push(`退款 ${refundCount} 笔（待审批）`)
    message.success(mode === 'refund' ? `退款申请已提交：${parts.join('，')}` : mode === 'offset' ? `账面抵消已记录：${toProcess.length} 笔` : `补款已记录：${parts.join('，')}`)
    await loadAllPayments()

    const processedMap = toProcess.reduce((acc, row) => {
      acc[row.orderId] = Math.abs(Number(row.allocated || 0))
      return acc
    }, {} as Record<string, number>)
    const shouldReturnToParent = mode === 'offset' && offsetOpenedFromNestedBatchAction.value && nestedBatchReturnMode.value
    if (shouldReturnToParent) {
      const returnMode = nestedBatchReturnMode.value!
      const remainingDrafts = Object.entries(nestedBatchParentAllocMap.value).reduce((acc, [orderId, original]) => {
        const originalAmount = Math.abs(Number(original || 0))
        const remaining = Math.max(0, originalAmount - Number(processedMap[orderId] || 0))
        if (remaining > 0.005) {
          acc[orderId] = returnMode === 'refund' ? -remaining : remaining
        }
        return acc
      }, {} as Record<string, number | undefined>)
      rebuildAllocRowsWithDrafts(remainingDrafts)
      if (Object.keys(remainingDrafts).length) {
        batchRecordMode.value = returnMode
        const restoredForm = nestedBatchParentFormSnapshot.value || batchRecordForm.value
        restoredForm.amount_cny = Object.values(remainingDrafts).reduce((sum: number, value) => sum + Math.abs(Number(value || 0)), 0)
        batchRecordForm.value = restoredForm
        batchRecordFiles.value = [...nestedBatchParentFilesSnapshot.value]
        offsetOpenedFromNestedBatchAction.value = false
        nestedBatchReturnMode.value = null
        nestedBatchParentFormSnapshot.value = null
        nestedBatchParentFilesSnapshot.value = []
        nestedBatchParentAllocMap.value = {}
        batchRecordModalOpen.value = true
      } else {
        batchRecordModalOpen.value = false
        nestedBatchReturnMode.value = null
        nestedBatchParentFormSnapshot.value = null
        nestedBatchParentFilesSnapshot.value = []
        nestedBatchParentAllocMap.value = {}
        offsetOpenedFromNestedBatchAction.value = false
      }
    } else {
      batchRecordModalOpen.value = false
      const remainingDrafts = allocRows.value
        .filter(row => mode === 'refund' ? Number(row.allocated || 0) > 0 : Number(row.allocated || 0) < 0)
        .reduce((acc, row) => {
          acc[row.orderId] = row.allocated
          return acc
        }, {} as Record<string, number | undefined>)
      rebuildAllocRowsWithDrafts(remainingDrafts)
    }
    emit('updated')
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    batchRecordSaving.value = false
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

.gbh-trio {
  display: flex;
  align-items: center;
  background: #f8f9fb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px 16px;
  gap: 12px;
}

.gbh-fund-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(82px, 1fr));
  gap: 10px;
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

.section-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.orders-table-head {
  display: grid;
  grid-template-columns: 78px 160px 90px 90px 90px 100px 124px;
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
  grid-template-columns: 78px 160px 90px 90px 90px 100px 124px;
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

.col-created, .col-num, .col-asin, .col-amt, .col-paid, .col-status, .col-debt {
  display: flex;
  align-items: center;
}

.col-created {
  color: #6b7280;
  font-size: 12px;
  font-family: 'Courier New', monospace;
}

.records-empty {
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
  padding: 16px 0;
}

.records-mock-tip {
  text-align: center;
  color: #9ca3af;
  padding: 10px 14px;
  margin-bottom: 8px;
  font-size: 13px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #e5e7eb;
}

.payment-lines {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
}

.payment-line {
  display: grid;
  grid-template-columns: 92px 118px 86px 120px 120px 1fr;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 12px;
  color: #374151;
}

.payment-line:last-child { border-bottom: none; }

.payment-line-head {
  background: #f9fafb;
  color: #6b7280;
  font-weight: 600;
}

.payment-line-mock {
  background: #fcfcfd;
}

.payment-line-date {
  color: #6b7280;
  font-family: 'Courier New', monospace;
}

.payment-line-income {
  color: #16a34a;
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.payment-line-refund {
  color: #dc2626;
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.payment-line-offset {
  color: #2563eb;
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.payment-line-meta,
.payment-line-notes {
  color: #6b7280;
  line-height: 1.5;
  word-break: break-word;
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

.hint-none {
  background: #f8f9fb;
  color: #6b7280;
  border: 1px solid #e5e7eb;
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

.add-record-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.add-record-alert {
  padding: 8px 10px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  color: #c2410c;
  font-size: 13px;
}

.add-record-alert-offset {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.batch-record-summary {
  padding: 8px 10px;
  background: #f8f9fb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #374151;
  font-size: 13px;
  font-weight: 600;
}

.batch-amount-card {
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.batch-amount-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #6b7280;
}

.batch-amount-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.batch-amount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.batch-amount-order {
  min-width: 0;
  color: #1a1a2e;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.upload-btn {
  color: #6b7280;
  font-size: 12px;
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
