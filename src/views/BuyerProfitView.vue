<template>
  <div class="page-content">
    <div class="page-head">
      <div>
        <h1 class="page-title">买手盈亏分析</h1>
        <div class="page-subtitle">只看四个金额维度：已损失本金、本金多返、本金少返、裂变佣金</div>
      </div>
    </div>

    <div class="view-note">
      当前统计口径：{{ periodLabel }}。顶部仪表盘、买手明细和单个买手详情使用同一时间范围；清空日期会回到本月，查看历史总计请点“全部历史”。
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-val" :class="summaryStats.net >= 0 ? 'stat-profit' : 'stat-loss'">
          {{ formatSignedMoney(summaryStats.net) }}
        </div>
        <div class="stat-label">净盈亏</div>
        <div class="stat-hint">本金少返 - 其他损失</div>
      </div>
      <div class="stat-card">
        <div class="stat-val stat-loss">{{ formatLossMoney(summaryStats.lostPrincipal) }}</div>
        <div class="stat-label">已损失本金</div>
        <div class="stat-hint">被骗/确认损失</div>
      </div>
      <div class="stat-card">
        <div class="stat-val stat-warning">{{ formatLossMoney(summaryStats.principalOverRefund) }}</div>
        <div class="stat-label">本金多返</div>
        <div class="stat-hint">贝宝 + 礼品卡</div>
      </div>
      <div class="stat-card">
        <div class="stat-val stat-profit">{{ formatProfitMoney(summaryStats.principalShortRefund) }}</div>
        <div class="stat-label">本金少返</div>
        <div class="stat-hint">所有挽损</div>
      </div>
      <div class="stat-card">
        <div class="stat-val stat-loss">{{ formatLossMoney(summaryStats.fissionCommission) }}</div>
        <div class="stat-label">裂变佣金</div>
        <div class="stat-hint">额外奖励买手</div>
      </div>
    </div>

    <div class="card-panel">
      <div class="toolbar">
        <a-radio-group v-model:value="viewDimension" @change="recalc">
          <a-radio-button value="buyer">按买手</a-radio-button>
          <a-radio-button value="staff">按业务员</a-radio-button>
        </a-radio-group>
        <a-range-picker
          v-model:value="dateRange"
          :placeholder="['开始日期', '结束日期']"
          style="width:240px"
          @change="handleDateRangeChange"
          allow-clear
        />
        <a-button @click="showAllHistory">全部历史</a-button>
        <a-select v-model:value="amountFilter" style="width:160px" @change="recalc">
          <a-select-option value="all">全部金额情况</a-select-option>
          <a-select-option value="lostPrincipal">已损失本金</a-select-option>
          <a-select-option value="overRefund">本金多返</a-select-option>
          <a-select-option value="shortRefund">本金少返</a-select-option>
          <a-select-option value="fission">裂变佣金</a-select-option>
        </a-select>
        <a-input-search v-model:value="filterSearch" placeholder="搜索买手/业务员..." style="width:220px" @search="recalc" allow-clear />
        <a-button @click="loadData"><ReloadOutlined /> 刷新</a-button>
      </div>

      <a-table
        v-if="viewDimension === 'buyer'"
        :columns="buyerColumns"
        :data-source="buyerData"
        :loading="loading"
        row-key="buyer_id"
        size="middle"
        :scroll="{ x: 960 }"
        :pagination="{ pageSize: 20 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'buyer'">
            <div class="cell-buyer-name">{{ record.buyer_name }}</div>
            <div class="cell-meta">{{ record.buyer_number || '暂无编号' }}</div>
          </template>
          <template v-else-if="column.key === 'net'">
            <span :class="record.net >= 0 ? 'amount-profit' : 'amount-loss'" class="net-amount">
              {{ formatSignedMoney(record.net) }}
            </span>
          </template>
          <template v-else-if="lossColumnKeys.includes(String(column.key))">
            <span :class="record[column.key] > 0 ? 'amount-loss' : 'text-gray'">
              {{ formatLossMoney(record[column.key]) }}
            </span>
          </template>
          <template v-else-if="profitColumnKeys.includes(String(column.key))">
            <span :class="record[column.key] > 0 ? 'amount-profit' : 'text-gray'">
              {{ formatProfitMoney(record[column.key]) }}
            </span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="buyerStatusColor(record.buyer_status)">{{ record.buyer_status || '--' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space size="small">
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button type="link" size="small" @click="openCommissionModal(record)">提交佣金</a-button>
            </a-space>
          </template>
        </template>
      </a-table>

      <a-table
        v-else-if="viewDimension === 'staff'"
        :columns="staffColumns"
        :data-source="staffData"
        :loading="loading"
        row-key="staff_id"
        size="middle"
        :scroll="{ x: 920 }"
        :pagination="{ pageSize: 20 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'net'">
            <span :class="record.net >= 0 ? 'amount-profit' : 'amount-loss'" class="net-amount">
              {{ formatSignedMoney(record.net) }}
            </span>
          </template>
          <template v-else-if="lossColumnKeys.includes(String(column.key))">
            <span :class="record[column.key] > 0 ? 'amount-loss' : 'text-gray'">
              {{ formatLossMoney(record[column.key]) }}
            </span>
          </template>
          <template v-else-if="profitColumnKeys.includes(String(column.key))">
            <span :class="record[column.key] > 0 ? 'amount-profit' : 'text-gray'">
              {{ formatProfitMoney(record[column.key]) }}
            </span>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer
      v-model:open="detailOpen"
      :title="detailRecord ? `${detailRecord.buyer_name} · 总详情` : '总详情'"
      width="860"
      placement="right"
      destroy-on-close
    >
      <template v-if="detailRecord">
        <div class="drawer-summary-grid">
          <div class="drawer-metric">
            <span>净盈亏</span>
            <strong :class="detailRecord.net >= 0 ? 'amount-profit' : 'amount-loss'">{{ formatSignedMoney(detailRecord.net) }}</strong>
          </div>
          <div class="drawer-metric">
            <span>已损失本金</span>
            <strong class="amount-loss">{{ formatLossMoney(detailRecord.lost_principal) }}</strong>
          </div>
          <div class="drawer-metric">
            <span>本金多返</span>
            <strong class="amount-loss">{{ formatLossMoney(detailRecord.principal_over_refund) }}</strong>
          </div>
          <div class="drawer-metric">
            <span>本金少返</span>
            <strong class="amount-profit">{{ formatProfitMoney(detailRecord.principal_short_refund) }}</strong>
          </div>
          <div class="drawer-metric">
            <span>裂变佣金</span>
            <strong class="amount-loss">{{ formatLossMoney(detailRecord.fission_commission) }}</strong>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-title-row">
            <div>
              <div class="detail-title">具体明细</div>
              <div class="detail-desc">所有来源统一展示，按“金额情况”区分类型</div>
            </div>
            <div class="detail-tools">
              <a-select v-model:value="detailSituationFilter" style="width:150px">
                <a-select-option value="all">全部金额情况</a-select-option>
                <a-select-option value="已损失本金">已损失本金</a-select-option>
                <a-select-option value="本金多返">本金多返</a-select-option>
                <a-select-option value="本金少返">本金少返</a-select-option>
                <a-select-option value="裂变佣金">裂变佣金</a-select-option>
              </a-select>
              <div class="detail-count">{{ filteredDetailRows.length }} 条</div>
            </div>
          </div>
          <a-empty v-if="!filteredDetailRows.length" description="暂无记录" />
          <a-table
            v-else
            :columns="detailColumns"
            :data-source="filteredDetailRows"
            row-key="id"
            size="small"
            :pagination="{ pageSize: 8 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'source'">
                <div class="cell-buyer-name">{{ record.productName }}</div>
                <template v-if="record.situation === '裂变佣金'">
                  <div class="cell-meta">{{ record.meta || '--' }}</div>
                </template>
                <template v-else>
                  <div class="cell-meta">订单号：{{ record.orderNumber || '--' }}</div>
                  <div class="cell-meta">订单ID：{{ record.orderId || '--' }}</div>
                </template>
              </template>
              <template v-else-if="column.key === 'type'">
                <a-tag>{{ record.type || '--' }}</a-tag>
              </template>
              <template v-else-if="column.key === 'situation'">
                <a-tag :color="record.amountType === 'profit' ? 'green' : 'red'">{{ record.situation }}</a-tag>
              </template>
              <template v-else-if="column.key === 'amount'">
                <span :class="record.amountType === 'profit' ? 'amount-profit' : 'amount-loss'">
                  {{ record.amountType === 'profit' ? formatDetailProfitMoney(record.amount, record.country) : formatDetailLossMoney(record.amount, record.country) }}
                </span>
              </template>
              <template v-else-if="column.key === 'time'">
                {{ formatDate(record.refundTime) }}
              </template>
            </template>
          </a-table>
        </div>
      </template>
    </a-drawer>

    <a-modal
      v-model:open="commissionOpen"
      title="提交裂变佣金返款"
      :confirm-loading="commissionSubmitting"
      ok-text="提交"
      cancel-text="取消"
      @ok="submitFissionCommission"
    >
      <a-form layout="vertical">
        <a-form-item label="买手">
          <a-input v-model:value="commissionForm.buyerName" placeholder="填写买手姓名" />
        </a-form-item>
        <a-form-item label="成交子订单ID">
          <a-textarea v-model:value="commissionForm.subOrderIds" :rows="3" placeholder="可填写多个成交子订单ID，一行一个或用逗号分隔" />
        </a-form-item>
        <a-form-item label="推荐人数">
          <a-input-number v-model:value="commissionForm.referralCount" :min="1" :precision="0" style="width:100%" />
        </a-form-item>
        <a-form-item label="返款方式">
          <a-radio-group v-model:value="commissionForm.refundMethod">
            <a-radio value="PayPal">PayPal</a-radio>
            <a-radio value="礼品卡">礼品卡</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="commissionForm.refundMethod === 'PayPal'" label="PayPal账号">
          <a-input v-model:value="commissionForm.paypalAccount" placeholder="买手 PayPal 邮箱" />
        </a-form-item>
        <a-form-item :label="`佣金金额（${commissionCurrencyLabel}）`">
          <a-input-number v-model:value="commissionForm.amountUsd" :min="0" :precision="2" style="width:100%" />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model:value="commissionForm.notes" :rows="3" placeholder="例如：推荐新买手奖励 2 美金" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

type ViewDimension = 'buyer' | 'staff'
type AmountFilter = 'all' | 'lostPrincipal' | 'overRefund' | 'shortRefund' | 'fission'

interface SummaryStats {
  net: number
  lostPrincipal: number
  principalOverRefund: number
  principalShortRefund: number
  fissionCommission: number
}

const emptySummary = (): SummaryStats => ({
  net: 0,
  lostPrincipal: 0,
  principalOverRefund: 0,
  principalShortRefund: 0,
  fissionCommission: 0,
})

const loading = ref(false)
const viewDimension = ref<ViewDimension>('buyer')
const amountFilter = ref<AmountFilter>('all')
const defaultDateRange = (): [dayjs.Dayjs, dayjs.Dayjs] => [dayjs().startOf('month'), dayjs().endOf('day')]
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | null>(defaultDateRange())
const filterSearch = ref('')

const rawIssues = ref<any[]>([])
const rawRefunds = ref<any[]>([])
const buyerData = ref<any[]>([])
const staffData = ref<any[]>([])
const summaryStats = ref<SummaryStats>(emptySummary())
const detailOpen = ref(false)
const detailRecord = ref<any | null>(null)
const detailSituationFilter = ref('all')
const commissionOpen = ref(false)
const commissionSubmitting = ref(false)
const commissionForm = ref({
  buyerName: '',
  country: '美国',
  refundMethod: 'PayPal',
  subOrderIds: '',
  referralCount: 1,
  paypalAccount: '',
  amountUsd: 2,
  notes: '',
})

const lossColumnKeys = ['lost_principal', 'principal_over_refund', 'fission_commission']
const profitColumnKeys = ['principal_short_refund']

const buyerColumns = [
  { title: '买手', key: 'buyer', width: 170, fixed: 'left' as const },
  { title: '业务员', dataIndex: 'staff_name', key: 'staff_name', width: 110 },
  { title: '净盈亏', key: 'net', width: 130, sorter: (a: any, b: any) => a.net - b.net, defaultSortOrder: 'ascend' as const },
  { title: '已损失本金', key: 'lost_principal', width: 130, sorter: (a: any, b: any) => a.lost_principal - b.lost_principal },
  { title: '本金多返', key: 'principal_over_refund', width: 120, sorter: (a: any, b: any) => a.principal_over_refund - b.principal_over_refund },
  { title: '本金少返', key: 'principal_short_refund', width: 120, sorter: (a: any, b: any) => a.principal_short_refund - b.principal_short_refund },
  { title: '裂变佣金', key: 'fission_commission', width: 120, sorter: (a: any, b: any) => a.fission_commission - b.fission_commission },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' as const },
]

const staffColumns = [
  { title: '业务员', dataIndex: 'staff_name', key: 'staff_name', width: 130, fixed: 'left' as const },
  { title: '涉及买手数', dataIndex: 'buyer_count', key: 'buyer_count', width: 110 },
  { title: '净盈亏', key: 'net', width: 130, sorter: (a: any, b: any) => a.net - b.net, defaultSortOrder: 'ascend' as const },
  { title: '已损失本金', key: 'lost_principal', width: 130, sorter: (a: any, b: any) => a.lost_principal - b.lost_principal },
  { title: '本金多返', key: 'principal_over_refund', width: 120, sorter: (a: any, b: any) => a.principal_over_refund - b.principal_over_refund },
  { title: '本金少返', key: 'principal_short_refund', width: 120, sorter: (a: any, b: any) => a.principal_short_refund - b.principal_short_refund },
  { title: '裂变佣金', key: 'fission_commission', width: 120, sorter: (a: any, b: any) => a.fission_commission - b.fission_commission },
]

const detailColumns = [
  { title: '订单信息', key: 'source', width: 280 },
  { title: '类型', key: 'type', width: 110 },
  { title: '金额情况', key: 'situation', width: 120 },
  { title: '金额', key: 'amount', width: 120 },
  { title: '返款时间', key: 'time', width: 120 },
]

const MOCK_ISSUES = [
  {
    id: 'mock-profit-lost-1',
    buyer_id: 'mock-buyer-linda',
    buyer_name: '买手-Linda',
    staff_id: 'mock-staff-chen',
    staff_name: '业务员-陈晨',
    country: '美国',
    sub_order_number: 'SO-MOCK-LOSS-001',
    old_amazon_order_id: 'AMZ-MOCK-LOSS-001',
    product_name: '无线手持吸尘器',
    issue_type: '不下单',
    principal_status: '已损失',
    principal_stolen: true,
    principal_amount: 18.6,
    created_at: dayjs().subtract(2, 'day').toISOString(),
  },
  {
    id: 'mock-profit-lost-2',
    buyer_id: 'mock-buyer-jason',
    buyer_name: '买手-Jason',
    staff_id: 'mock-staff-wang',
    staff_name: '业务员-王薇',
    country: '英国',
    sub_order_number: 'SO-MOCK-CANCEL-001',
    old_amazon_order_id: 'AMZ-MOCK-CANCEL-001',
    product_name: '便携式榨汁机',
    issue_type: '取消',
    principal_status: '已损失',
    principal_stolen: true,
    principal_amount: 12.3,
    created_at: dayjs().subtract(30, 'hour').toISOString(),
  },
  {
    id: 'mock-profit-over-issue-1',
    buyer_id: 'mock-buyer-linda',
    buyer_name: '买手-Linda',
    staff_id: 'mock-staff-chen',
    staff_name: '业务员-陈晨',
    country: '美国',
    sub_order_number: 'SO-MOCK-OVER-001',
    old_amazon_order_id: 'AMZ-MOCK-OVER-001',
    product_name: '防蓝光眼镜',
    issue_type: '本金多返',
    refund_method: 'PayPal',
    principal_status: '待追回',
    principal_amount: 7.4,
    created_at: dayjs().subtract(1, 'day').toISOString(),
  },
  {
    id: 'mock-profit-short-1',
    buyer_id: 'mock-buyer-amy',
    buyer_name: '买手-Amy',
    staff_id: 'mock-staff-li',
    staff_name: '业务员-李妍',
    country: '德国',
    sub_order_number: 'SO-MOCK-SHORT-001',
    old_amazon_order_id: 'AMZ-MOCK-SHORT-001',
    product_name: '全自动咖啡机',
    issue_type: '礼品卡少返',
    refund_method: '礼品卡',
    principal_status: '正常',
    profit_diff: 20,
    created_at: dayjs().subtract(3, 'day').toISOString(),
  },
  {
    id: 'mock-profit-short-linda-1',
    buyer_id: 'mock-buyer-linda',
    buyer_name: '买手-Linda',
    staff_id: 'mock-staff-chen',
    staff_name: '业务员-陈晨',
    country: '美国',
    sub_order_number: 'SO-MOCK-SHORT-LINDA-001',
    old_amazon_order_id: 'AMZ-MOCK-SHORT-LINDA-001',
    product_name: '电动牙刷套装',
    issue_type: '贝宝少返',
    refund_method: 'PayPal',
    principal_status: '正常',
    profit_diff: 15,
    created_at: dayjs().subtract(12, 'hour').toISOString(),
  },
  {
    id: 'mock-profit-short-2',
    buyer_id: 'mock-buyer-amy',
    buyer_name: '买手-Amy',
    staff_id: 'mock-staff-li',
    staff_name: '业务员-李妍',
    country: '德国',
    sub_order_number: 'SO-MOCK-NOORDER-SHORT-001',
    old_amazon_order_id: 'AMZ-MOCK-NOORDER-SHORT-001',
    product_name: '空气炸锅',
    issue_type: '礼品卡少返',
    refund_method: '礼品卡',
    principal_status: '正常',
    profit_diff: 8.5,
    created_at: dayjs().subtract(26, 'hour').toISOString(),
  },
]

const MOCK_REFUNDS = [
  {
    id: 'mock-profit-over-paypal-1',
    buyer_name: '买手-Linda',
    staff_name: '业务员-陈晨',
    country: '美国',
    sub_order_number: 'SO-MOCK-PP-OVER-001',
    product_name: '宠物吹风机',
    refund_method: 'PayPal',
    actual_paid_usd: 15.6,
    refund_amount_usd: 16,
    status: '已处理',
    created_at: dayjs().subtract(20, 'hour').toISOString(),
  },
  {
    id: 'mock-profit-over-gift-1',
    buyer_name: '买手-Amy',
    staff_name: '业务员-李妍',
    country: '德国',
    sub_order_number: 'SO-MOCK-GC-OVER-001',
    product_name: '儿童学习台灯',
    refund_method: '礼品卡',
    actual_paid_usd: 23.2,
    refund_amount_usd: 24,
    gift_card_face_value_usd: 24,
    status: '已处理',
    created_at: dayjs().subtract(18, 'hour').toISOString(),
  },
  {
    id: 'mock-profit-fission-1',
    buyer_name: '买手-Kevin',
    staff_name: '业务员-赵琪',
    country: '英国',
    sub_order_number: '买手裂变佣金',
    product_name: '推荐人数 2 人',
    refund_method: 'PayPal',
    refund_category: '裂变佣金',
    refund_reason: '买手裂变佣金',
    buyer_paypal_email: 'kevin.referral.demo@gmail.com',
    refund_amount_usd: 4,
    status: '待处理',
    notes: '裂变推荐佣金；推荐人数：2人；成交子订单ID：SO-MOCK-DEAL-001, SO-MOCK-DEAL-002',
    created_at: dayjs().subtract(6, 'hour').toISOString(),
  },
  {
    id: 'mock-profit-fission-gift-1',
    buyer_name: '买手-Amy',
    staff_name: '业务员-李妍',
    country: '德国',
    sub_order_number: '买手裂变佣金',
    product_name: '推荐人数 1 人',
    refund_method: '礼品卡',
    refund_category: '裂变佣金',
    refund_reason: '买手裂变佣金',
    refund_amount_usd: 2,
    status: '待处理',
    notes: '礼品卡裂变佣金；推荐人数：1人；成交子订单ID：SO-MOCK-DEAL-003',
    created_at: dayjs().subtract(4, 'hour').toISOString(),
  },
]

function toNumber(value: any) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
}

function positive(value: any) {
  return Math.max(0, toNumber(value))
}

function formatMoney(value: any) {
  return `$${toNumber(value).toFixed(2)}`
}

function formatSignedMoney(value: any) {
  const amount = toNumber(value)
  return `${amount >= 0 ? '+' : '-'}$${Math.abs(amount).toFixed(2)}`
}

function formatLossMoney(value: any) {
  const amount = toNumber(value)
  return amount > 0 ? `-$${amount.toFixed(2)}` : '$0.00'
}

function formatProfitMoney(value: any) {
  const amount = toNumber(value)
  return amount > 0 ? `+$${amount.toFixed(2)}` : '$0.00'
}

function formatDetailLossMoney(value: any, country: any) {
  const amount = toNumber(value)
  return amount > 0 ? `-${currencyLabel(country)}${amount.toFixed(2)}` : `${currencyLabel(country)}0.00`
}

function formatDetailProfitMoney(value: any, country: any) {
  const amount = toNumber(value)
  return amount > 0 ? `+${currencyLabel(country)}${amount.toFixed(2)}` : `${currencyLabel(country)}0.00`
}

function formatDate(value: any) {
  return value ? dayjs(value).format('YYYY-MM-DD') : '--'
}

const allDetailRows = computed(() => detailRecord.value ? getAllDetailRows(detailRecord.value) : [])
const filteredDetailRows = computed(() => {
  if (detailSituationFilter.value === 'all') return allDetailRows.value
  return allDetailRows.value.filter(row => row.situation === detailSituationFilter.value)
})
const commissionCurrencyLabel = computed(() => currencyLabel(commissionForm.value.country))
const periodLabel = computed(() => {
  if (!dateRange.value || !dateRange.value[0] || !dateRange.value[1]) return '全部历史'
  return `${dateRange.value[0].format('YYYY-MM-DD')} 至 ${dateRange.value[1].format('YYYY-MM-DD')}`
})

function normalizeCountry(country: any) {
  const text = String(country || '').trim()
  if (['US', '美国'].includes(text)) return '美国'
  if (['DE', '德国'].includes(text)) return '德国'
  if (['UK', 'GB', '英国'].includes(text)) return '英国'
  if (['CA', '加拿大'].includes(text)) return '加拿大'
  return text || '美国'
}

function currencyLabel(country: any) {
  const map: Record<string, string> = {
    美国: '$',
    英国: '£',
    德国: '€',
    加拿大: 'C$',
    US: '$',
    UK: '£',
    GB: '£',
    DE: '€',
    CA: 'C$',
  }
  return map[normalizeCountry(country)] || '$'
}

function buyerStatusColor(status: string) {
  if (status === '黑名单') return 'red'
  if (status === '暂停') return 'orange'
  if (status === '活跃') return 'green'
  return 'default'
}

function normalizePrincipalStatus(issue: any) {
  if (issue?.principal_status === '损失') return '已损失'
  if (issue?.principal_status) return issue.principal_status
  if (issue?.principal_stolen) return '已损失'
  if (toNumber(issue?.principal_amount) > 0) return '待确定'
  return '正常'
}

function getPrincipalAmount(issue: any) {
  return positive(issue?.principal_amount || issue?.loss_amount)
}

function getIssueLostPrincipal(issue: any) {
  return normalizePrincipalStatus(issue) === '已损失' || issue?.principal_stolen ? getPrincipalAmount(issue) : 0
}

function getIssueManualOverRefund(issue: any) {
  const status = normalizePrincipalStatus(issue)
  if (issue?.issue_type !== '本金多返') return 0
  if (!['待追回', '已损失', '损失'].includes(status)) return 0
  return getPrincipalAmount(issue)
}

function getIssueShortRefund(issue: any) {
  return positive(issue?.profit_diff) + positive(issue?.recovered_amount)
}

function getIssueLossAmount(issue: any) {
  return getIssueLostPrincipal(issue) + getIssueManualOverRefund(issue)
}

function getRefundPaidAmount(refund: any) {
  return positive(refund?.actual_paid_usd || refund?.actual_paid || refund?.product_price)
}

function getRefundReturnAmount(refund: any) {
  if (refund?.refund_method === '礼品卡') {
    return positive(refund?.gift_card_face_value_usd || refund?.refund_amount_usd || refund?.refund_amount)
  }
  return positive(refund?.refund_amount_usd || refund?.refund_amount)
}

function getRefundOverAmount(refund: any) {
  if (!['PayPal', '礼品卡'].includes(refund?.refund_method)) return 0
  if (isFissionCommission(refund)) return 0
  const paid = getRefundPaidAmount(refund)
  if (paid <= 0) return 0
  return positive(getRefundReturnAmount(refund) - paid)
}

function isFissionCommission(refund: any) {
  const text = `${refund?.refund_category || ''} ${refund?.notes || ''} ${refund?.refund_reason || ''}`
  return /裂变|推荐/.test(text)
}

function getFissionCommissionAmount(refund: any) {
  if (!isFissionCommission(refund)) return 0
  return positive(refund?.refund_amount_usd || refund?.refund_amount || refund?.gift_card_face_value_usd)
}

function refundMethodLabel(method: any) {
  const text = String(method || '').trim()
  if (/paypal/i.test(text) || text === '贝宝') return '贝宝'
  if (text === '礼品卡') return '礼品卡'
  return text || '贝宝'
}

function issueRefundMethodLabel(issue: any) {
  const method = issue?.refund_method || issue?.refund_channel || issue?.payment_method
  if (method) return refundMethodLabel(method)
  const type = String(issue?.issue_type || '')
  if (type.includes('礼品卡')) return '礼品卡'
  if (type.includes('贝宝') || /paypal/i.test(type)) return '贝宝'
  return '贝宝'
}

function shortRefundType(issue: any) {
  return `${issueRefundMethodLabel(issue)}少返`
}

function issueTitle(issue: any) {
  return issue?.product_name || issue?.asin || '售后问题单'
}

function refundTitle(refund: any) {
  return refund?.product_name || '买手裂变佣金'
}

function getIssueOrderNumber(issue: any) {
  return issue?.old_amazon_order_id || issue?.amazon_order_id || issue?.sub_order_number || ''
}

function getIssueOrderId(issue: any) {
  return issue?.sub_order_number || issue?.order_number || issue?.sub_order_id || ''
}

function getRefundOrderNumber(refund: any) {
  return refund?.sub_order_number || refund?.sub_orders?.sub_order_number || ''
}

function getRefundOrderId(refund: any) {
  return refund?.sub_order_id || refund?.sub_order_number || ''
}

function getRefundTime(record: any) {
  return record?.handled_at || record?.refund_date || record?.created_at
}

function getAllDetailRows(row: any) {
  const issueRows = row?.issue_details || []
  const refundRows = row?.refund_details || []
  const lostRows = issueRows
    .filter((issue: any) => getIssueLostPrincipal(issue) > 0)
    .map((issue: any) => ({
        id: `lost-${issue.id}`,
        productName: issueTitle(issue),
        orderNumber: getIssueOrderNumber(issue),
        orderId: getIssueOrderId(issue),
        country: issue.country || row.country,
        type: issue.issue_type || '已损失本金',
        meta: issue.issue_type || '已损失本金',
        situation: '已损失本金',
        amount: getIssueLostPrincipal(issue),
        amountType: 'loss',
        refundTime: getRefundTime(issue),
      }))

  const overIssueRows = issueRows
    .filter((issue: any) => getIssueManualOverRefund(issue) > 0)
    .map((issue: any) => ({
      id: `over-issue-${issue.id}`,
      productName: issueTitle(issue),
      orderNumber: getIssueOrderNumber(issue),
      orderId: getIssueOrderId(issue),
      country: issue.country || row.country,
      type: `${issueRefundMethodLabel(issue)}多返`,
      meta: `${issueRefundMethodLabel(issue)}多返`,
      situation: '本金多返',
      amount: getIssueManualOverRefund(issue),
      amountType: 'loss',
      refundTime: getRefundTime(issue),
    }))
  const overRefundRows = refundRows
    .filter((refund: any) => getRefundOverAmount(refund) > 0)
    .map((refund: any) => ({
      id: `over-refund-${refund.id}`,
      productName: refundTitle(refund),
      orderNumber: getRefundOrderNumber(refund),
      orderId: getRefundOrderId(refund),
      country: refund.country || row.country,
      type: `${refundMethodLabel(refund.refund_method)}多返`,
      meta: `${refundMethodLabel(refund.refund_method)} · 实付 ${formatMoney(getRefundPaidAmount(refund))} / 返款 ${formatMoney(getRefundReturnAmount(refund))}`,
      situation: '本金多返',
      amount: getRefundOverAmount(refund),
      amountType: 'loss',
      refundTime: getRefundTime(refund),
    }))

  const shortRows = issueRows
    .filter((issue: any) => getIssueShortRefund(issue) > 0)
    .map((issue: any) => ({
        id: `short-${issue.id}`,
        productName: issueTitle(issue),
        orderNumber: getIssueOrderNumber(issue),
        orderId: getIssueOrderId(issue),
        country: issue.country || row.country,
        type: shortRefundType(issue),
        meta: shortRefundType(issue),
        situation: '本金少返',
        amount: getIssueShortRefund(issue),
        amountType: 'profit',
        refundTime: getRefundTime(issue),
      }))

  const fissionRows = refundRows
    .filter((refund: any) => getFissionCommissionAmount(refund) > 0)
    .map((refund: any) => ({
      id: `fission-${refund.id}`,
      productName: '裂变佣金',
      orderNumber: getRefundOrderNumber(refund),
      orderId: getRefundOrderId(refund),
      country: refund.country || row.country,
      type: '裂变佣金',
      meta: refund.product_name || '推荐人数 --',
      situation: '裂变佣金',
      amount: getFissionCommissionAmount(refund),
      amountType: 'loss',
      refundTime: getRefundTime(refund),
    }))

  return [...lostRows, ...overIssueRows, ...overRefundRows, ...shortRows, ...fissionRows]
    .sort((a, b) => dayjs(b.refundTime || 0).valueOf() - dayjs(a.refundTime || 0).valueOf())
}

function getBuyerKeyFromIssue(issue: any) {
  return issue?.buyer_id || (issue?.buyer_name ? `name:${issue.buyer_name}` : 'unknown')
}

function getBuyerKeyFromRefund(refund: any) {
  const sub = refund?.sub_orders
  return sub?.buyer_id || (sub?.buyer_name ? `name:${sub.buyer_name}` : refund?.buyer_name ? `name:${refund.buyer_name}` : 'unknown')
}

function getStaffKeyFromIssue(issue: any) {
  return issue?.staff_id || (issue?.staff_name ? `name:${issue.staff_name}` : 'unknown')
}

function getStaffKeyFromRefund(refund: any) {
  const sub = refund?.sub_orders
  return sub?.staff_id || (sub?.staff_name ? `name:${sub.staff_name}` : refund?.staff_name ? `name:${refund.staff_name}` : 'unknown')
}

function createAmountRow(seed: Record<string, any> = {}) {
  return {
    issue_count: 0,
    lost_principal: 0,
    principal_over_refund: 0,
    principal_short_refund: 0,
    fission_commission: 0,
    net: 0,
    issue_details: [] as any[],
    refund_details: [] as any[],
    ...seed,
  }
}

function finalizeRow(row: any) {
  row.net = row.principal_short_refund - row.lost_principal - row.principal_over_refund - row.fission_commission
  return row
}

function applyAmountFilter(rows: any[]) {
  if (amountFilter.value === 'lostPrincipal') return rows.filter(row => row.lost_principal > 0)
  if (amountFilter.value === 'overRefund') return rows.filter(row => row.principal_over_refund > 0)
  if (amountFilter.value === 'shortRefund') return rows.filter(row => row.principal_short_refund > 0)
  if (amountFilter.value === 'fission') return rows.filter(row => row.fission_commission > 0)
  return rows
}

function matchesSearch(row: any, kw: string) {
  if (!kw) return true
  return [row.buyer_name, row.buyer_number, row.staff_name]
    .some(value => String(value || '').toLowerCase().includes(kw))
}

async function handleDateRangeChange(value: [dayjs.Dayjs, dayjs.Dayjs] | null) {
  if (!value || !value[0] || !value[1]) {
    dateRange.value = defaultDateRange()
  }
  await loadData()
}

async function showAllHistory() {
  dateRange.value = null
  await loadData()
}

async function loadData() {
  loading.value = true
  try {
    let issueQuery = supabase
      .from('after_sale_issues')
      .select('*')
      .order('created_at', { ascending: false })

    let refundQuery = supabase
      .from('refund_requests')
      .select('*, sub_orders(id, buyer_id, buyer_name, staff_id, staff_name, sub_order_number, country)')
      .order('created_at', { ascending: false })

    if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
      const start = dateRange.value[0].startOf('day').toISOString()
      const end = dateRange.value[1].endOf('day').toISOString()
      issueQuery = issueQuery.gte('created_at', start).lte('created_at', end)
      refundQuery = refundQuery.gte('created_at', start).lte('created_at', end)
    }

    const [{ data: issues, error: issueError }, { data: refunds, error: refundError }] = await Promise.all([
      issueQuery,
      refundQuery,
    ])
    if (issueError) throw issueError
    if (refundError) throw refundError

    rawIssues.value = [...(issues || []), ...MOCK_ISSUES]
    rawRefunds.value = [...(refunds || []), ...MOCK_REFUNDS]
    await recalc()
  } finally {
    loading.value = false
  }
}

async function loadBuyerStatuses(buyerIds: string[]) {
  if (!buyerIds.length) return new Map()
  const { data } = await supabase
    .from('erp_buyers')
    .select('id, status, buyer_number, country')
    .in('id', buyerIds)
  const map = new Map<string, { status: string; buyer_number: string; country: string }>()
  ;(data || []).forEach(b => map.set(b.id, { status: b.status, buyer_number: b.buyer_number || '', country: b.country || '' }))
  return map
}

function buildBuyerRows() {
  const map = new Map<string, any>()

  rawIssues.value.forEach(issue => {
    const key = getBuyerKeyFromIssue(issue)
    if (!map.has(key)) {
      map.set(key, createAmountRow({
        buyer_id: key,
        buyer_name: issue.buyer_name || '未知买手',
        buyer_number: '',
        staff_name: issue.staff_name || '',
        country: normalizeCountry(issue.country),
        buyer_status: '活跃',
      }))
    }
    const row = map.get(key)
    if (!row.country && issue.country) row.country = normalizeCountry(issue.country)
    row.issue_count++
    row.lost_principal += getIssueLostPrincipal(issue)
    row.principal_over_refund += getIssueManualOverRefund(issue)
    row.principal_short_refund += getIssueShortRefund(issue)
    row.issue_details.push(issue)
  })

  rawRefunds.value.forEach(refund => {
    const key = getBuyerKeyFromRefund(refund)
    const sub = refund.sub_orders || {}
    if (!map.has(key)) {
      map.set(key, createAmountRow({
        buyer_id: key,
        buyer_name: sub.buyer_name || refund.buyer_name || '未知买手',
        buyer_number: '',
        staff_name: sub.staff_name || refund.staff_name || '',
        country: normalizeCountry(sub.country || refund.country),
        buyer_status: '活跃',
      }))
    }
    const row = map.get(key)
    if (!row.staff_name) row.staff_name = sub.staff_name || refund.staff_name || ''
    if (!row.country && (sub.country || refund.country)) row.country = normalizeCountry(sub.country || refund.country)
    row.principal_over_refund += getRefundOverAmount(refund)
    row.fission_commission += getFissionCommissionAmount(refund)
    row.refund_details.push({
      ...refund,
      buyer_name: sub.buyer_name || refund.buyer_name,
      staff_name: sub.staff_name || refund.staff_name,
      sub_order_number: refund.sub_order_number || sub.sub_order_number,
    })
  })

  return [...map.values()].map(finalizeRow)
}

function buildStaffRows(sourceRows: any[]) {
  const map = new Map<string, any>()

  rawIssues.value.forEach(issue => {
    const key = getStaffKeyFromIssue(issue)
    if (!map.has(key)) {
      map.set(key, createAmountRow({
        staff_id: key,
        staff_name: issue.staff_name || '未分配',
        buyer_set: new Set<string>(),
      }))
    }
    const row = map.get(key)
    row.issue_count++
    if (issue.buyer_id) row.buyer_set.add(issue.buyer_id)
    row.lost_principal += getIssueLostPrincipal(issue)
    row.principal_over_refund += getIssueManualOverRefund(issue)
    row.principal_short_refund += getIssueShortRefund(issue)
  })

  rawRefunds.value.forEach(refund => {
    const key = getStaffKeyFromRefund(refund)
    const sub = refund.sub_orders || {}
    if (!map.has(key)) {
      map.set(key, createAmountRow({
        staff_id: key,
        staff_name: sub.staff_name || refund.staff_name || '未分配',
        buyer_set: new Set<string>(),
      }))
    }
    const row = map.get(key)
    const buyerKey = getBuyerKeyFromRefund(refund)
    if (buyerKey !== 'unknown') row.buyer_set.add(buyerKey)
    row.principal_over_refund += getRefundOverAmount(refund)
    row.fission_commission += getFissionCommissionAmount(refund)
  })

  const allowedStaff = new Set(sourceRows.map(row => row.staff_name || row.staff_id))
  return [...map.values()]
    .map(row => finalizeRow({ ...row, buyer_count: row.buyer_set.size }))
    .filter(row => allowedStaff.has(row.staff_name) || amountFilter.value === 'all')
}

async function recalc() {
  const kw = filterSearch.value.toLowerCase()
  let rows = buildBuyerRows().filter(row => matchesSearch(row, kw))
  rows = applyAmountFilter(rows)

  const buyerIds = rows
    .map(row => row.buyer_id)
    .filter((key: string) => key && key !== 'unknown' && !key.startsWith('name:'))
  const statusMap = await loadBuyerStatuses(buyerIds)
  rows.forEach(row => {
    const info = statusMap.get(row.buyer_id)
    if (info) {
      row.buyer_status = info.status
      row.buyer_number = info.buyer_number
      if (info.country) row.country = normalizeCountry(info.country)
    }
  })

  buyerData.value = rows.sort((a, b) => a.net - b.net)
  staffData.value = applyAmountFilter(buildStaffRows(rows))
    .filter(row => matchesSearch(row, kw))
    .sort((a, b) => a.net - b.net)

  summaryStats.value = rows.reduce((acc, row) => {
    acc.net += row.net
    acc.lostPrincipal += row.lost_principal
    acc.principalOverRefund += row.principal_over_refund
    acc.principalShortRefund += row.principal_short_refund
    acc.fissionCommission += row.fission_commission
    return acc
  }, emptySummary())
}

function openDetail(record: any) {
  detailRecord.value = record
  detailSituationFilter.value = 'all'
  detailOpen.value = true
}

function openCommissionModal(record?: any) {
  commissionForm.value = {
    buyerName: record?.buyer_name || '',
    country: normalizeCountry(record?.country),
    refundMethod: 'PayPal',
    subOrderIds: '',
    referralCount: 1,
    paypalAccount: '',
    amountUsd: 2,
    notes: record?.buyer_name ? `裂变推荐佣金 - ${record.buyer_name}` : '裂变推荐佣金',
  }
  commissionOpen.value = true
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function parseSubOrderIds(value: string) {
  return String(value || '')
    .split(/[\n,，;；\s]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

async function submitFissionCommission() {
  const buyerName = commissionForm.value.buyerName.trim()
  const amountUsd = positive(commissionForm.value.amountUsd)
  const referralCount = Math.max(1, Math.floor(toNumber(commissionForm.value.referralCount)))
  const subOrderIds = parseSubOrderIds(commissionForm.value.subOrderIds)
  const firstUuidSubOrderId = subOrderIds.find(isUuid) || ''
  if (!buyerName) {
    message.warning('请填写买手')
    return
  }
  if (commissionForm.value.refundMethod === 'PayPal' && !commissionForm.value.paypalAccount.trim()) {
    message.warning('请填写PayPal账号')
    return
  }
  if (amountUsd <= 0) {
    message.warning('请填写佣金金额')
    return
  }
  commissionSubmitting.value = true
  try {
    const now = new Date().toISOString()
    const notes = [
      commissionForm.value.notes.trim() || '裂变推荐佣金',
      `推荐人数：${referralCount}人`,
      subOrderIds.length ? `成交子订单ID：${subOrderIds.join(', ')}` : '',
    ].filter(Boolean).join('；')
    const { error } = await supabase.from('refund_requests').insert({
      sub_order_id: firstUuidSubOrderId || null,
      sub_order_number: '买手裂变佣金',
      country: normalizeCountry(commissionForm.value.country),
      buyer_name: buyerName,
      buyer_paypal_email: commissionForm.value.refundMethod === 'PayPal' ? commissionForm.value.paypalAccount.trim() : '',
      refund_method: commissionForm.value.refundMethod,
      refund_amount: amountUsd,
      refund_amount_usd: amountUsd,
      refund_category: '裂变佣金',
      refund_reason: '买手裂变佣金',
      applicant_name: '买手盈亏分析',
      customer_name: buyerName,
      product_name: `推荐人数 ${referralCount} 人`,
      status: '待处理',
      notes,
      finance_notes: '',
      created_at: now,
      updated_at: now,
    })
    if (error) throw error
    message.success('裂变佣金返款已提交')
    commissionOpen.value = false
    await loadData()
  } catch (e: any) {
    message.error('提交失败：' + (e?.message || e))
  } finally {
    commissionSubmitting.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.page-content { padding: 24px; background: #f5f7fa; min-height: 100%; }
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }
.page-subtitle { margin-top: 6px; font-size: 13px; color: #6b7280; }
.view-note {
  margin: -8px 0 16px;
  padding: 10px 12px;
  color: #6b7280;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 12px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.stat-val { font-size: 22px; font-weight: 800; }
.stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
.stat-hint { margin-top: 4px; font-size: 11px; color: #9ca3af; }
.stat-loss { color: #dc2626; }
.stat-profit { color: #059669; }
.stat-warning { color: #d97706; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.detail-section { margin-top: 22px; }
.detail-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.detail-title { font-size: 16px; font-weight: 700; color: #1a1a2e; }
.detail-desc { margin-top: 4px; font-size: 12px; color: #6b7280; }
.detail-count { font-size: 12px; color: #9ca3af; }
.detail-tools { display: flex; align-items: center; gap: 10px; }

.cell-buyer-name { font-weight: 600; color: #1a1a2e; }
.cell-meta { font-size: 11px; color: #9ca3af; }
.amount-loss { font-weight: 700; color: #dc2626; }
.amount-profit { font-weight: 700; color: #059669; }
.net-amount { font-size: 14px; }
.text-gray { color: #9ca3af; }
.support-counts { font-size: 12px; color: #6b7280; }

.drawer-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.drawer-metric {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f5f7fa;
}
.drawer-metric span {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 6px;
}
.drawer-metric strong {
  font-size: 16px;
  color: #1a1a2e;
}

:deep(.ant-table-row) { cursor: pointer; }

@media (max-width: 767px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .stat-card { padding: 10px; }
  .stat-val { font-size: 16px; }
  .drawer-summary-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
