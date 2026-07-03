<template>
  <div class="page-content">
    <div class="dashboard-header">
      <div class="header-actions">
        <a-date-picker v-model:value="selectedDay" format="YYYY-MM-DD" :allow-clear="false" @change="loadStats" />
      </div>
    </div>

    <a-spin :spinning="loading">
      <div class="month-lite">
        <span class="month-lite-title">{{ selectedDay.format('YYYY年MM月') }}累计</span>
        <template v-for="item in monthCards" :key="item.key">
          <span v-if="item.key === 'income'" class="month-lite-divider">|</span>
          <div class="month-lite-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
            <em v-if="item.sub">{{ item.sub }}</em>
          </div>
        </template>
      </div>

      <a-row :gutter="[16, 16]" class="focus-row">
        <a-col :xs="24" :md="12" :xl="6" v-for="card in focusCards" :key="card.key">
          <div :class="['focus-card', card.className]">
            <div class="focus-card-head">
              <span>{{ card.label }}</span>
              <component :is="card.icon" />
            </div>
            <div class="focus-value">{{ card.value }}</div>
            <div class="focus-sub">{{ card.sub }}</div>
          </div>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]" class="dashboard-grid">
        <a-col :xs="24">
          <div class="card-panel work-panel">
            <div class="panel-header">
              <div>
                <h3>今日做单明细</h3>
              </div>
            </div>
            <div class="work-country-summary">
              <div v-for="country in workCountrySummaryRows" :key="country.label" class="work-country-item">
                <span>{{ country.label }}</span>
                <strong>{{ country.value }}</strong>
                <em>单</em>
              </div>
            </div>

            <div v-if="dailyStaffRows.length === 0" class="empty-lite">今日暂无做单数据</div>
            <a-table
              v-else
              :columns="staffWorkColumns"
              :data-source="dailyStaffRows"
              :pagination="false"
              size="middle"
              row-key="name"
              class="overview-table compact-table"
              :scroll="{ x: 860 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'name'">
                  <div class="staff-table-name">
                    <strong>{{ record.name }}</strong>
                  </div>
                </template>
                <template v-else-if="isTypeGroupColumn(column.key)">
                  <div v-if="getTypeGroup(record, getTypeGroupFromColumnKey(column.key))" class="type-group-cell">
                    <div class="type-group-meta">
                      {{ getTypeGroup(record, getTypeGroupFromColumnKey(column.key))?.total }}单
                    </div>
                    <div class="type-country-list">
                      <span v-for="(country, index) in getVisibleTypeCountries(record, getTypeGroupFromColumnKey(column.key), true)" :key="country.label" class="type-inline-item">
                        {{ country.label }} {{ country.value }}
                        <i v-if="index < getVisibleTypeCountries(record, getTypeGroupFromColumnKey(column.key), true).length - 1">|</i>
                      </span>
                    </div>
                  </div>
                  <span v-else class="empty-cell">—</span>
                </template>
                <template v-else-if="isCountryColumn(column.key)">
                  <div v-if="getCountryType(record, getCountryFromColumnKey(column.key))" class="country-cell">
                    <div class="country-cell-meta">
                      {{ getCountryType(record, getCountryFromColumnKey(column.key))?.total }}单 ·
                      {{ getCountryType(record, getCountryFromColumnKey(column.key))?.asins }} ASIN
                    </div>
                    <div class="country-cell-tags">
                      <span v-for="type in getCountryType(record, getCountryFromColumnKey(column.key))?.types || []" :key="type.label" class="mini-tag type-mini">{{ type.label }} {{ type.value }}</span>
                    </div>
                  </div>
                  <span v-else class="empty-cell">—</span>
                </template>
                <template v-else-if="column.key === 'total'">
                  <strong class="table-total">{{ record.total }}</strong>
                </template>
                <template v-else-if="column.key === 'asins'">{{ record.asins }}</template>
                <template v-else-if="column.key === 'buyerCount'">{{ record.buyerCount }}</template>
              </template>
            </a-table>
          </div>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]" class="dashboard-grid">
        <a-col :xs="24" :xl="14">
          <div class="card-panel">
            <div class="panel-header">
              <div>
                <h3>今日接单明细</h3>
              </div>
            </div>
            <div class="detail-summary-grid order-grid">
              <div v-for="country in targetCountries" :key="country" class="detail-summary-item">
                <span>{{ country }}</span>
                <strong>{{ dailyOrderCountryMap[country] || 0 }}</strong>
                <em>单</em>
              </div>
            </div>
            <a-table
              :columns="salesDetailColumns"
              :data-source="salesDetailRows"
              :pagination="false"
              size="middle"
              row-key="sales"
              class="overview-table detail-table"
              :scroll="{ x: 860 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'sales'">
                  <div class="table-name-cell">
                    <strong>{{ record.sales }}</strong>
                  </div>
                </template>
                <template v-else-if="isTypeGroupColumn(column.key)">
                  <div v-if="getTypeGroup(record, getTypeGroupFromColumnKey(column.key))" class="type-group-cell">
                    <div class="type-group-meta">
                      {{ getTypeGroup(record, getTypeGroupFromColumnKey(column.key))?.total }}单
                    </div>
                    <div class="type-country-list">
                      <span v-for="(country, index) in getVisibleTypeCountries(record, getTypeGroupFromColumnKey(column.key), false)" :key="country.label" class="type-inline-item">
                        {{ country.label }} {{ country.value }}
                        <i v-if="index < getVisibleTypeCountries(record, getTypeGroupFromColumnKey(column.key), false).length - 1">|</i>
                      </span>
                    </div>
                  </div>
                  <span v-else class="empty-cell">—</span>
                </template>
                <template v-else-if="isCountryColumn(column.key)">
                  <div v-if="getCountryType(record, getCountryFromColumnKey(column.key))" class="country-cell">
                    <div class="country-cell-meta">
                      {{ getCountryType(record, getCountryFromColumnKey(column.key))?.total }}单 ·
                      {{ getCountryType(record, getCountryFromColumnKey(column.key))?.asins }} ASIN
                    </div>
                    <div class="country-cell-tags">
                      <span v-for="(type, index) in getCountryType(record, getCountryFromColumnKey(column.key))?.types || []" :key="type.label" class="type-inline-item">
                        {{ type.label }} {{ type.value }}
                        <i v-if="index < (getCountryType(record, getCountryFromColumnKey(column.key))?.types || []).length - 1">|</i>
                      </span>
                    </div>
                  </div>
                  <span v-else class="empty-cell">—</span>
                </template>
                <template v-else-if="column.key === 'asins'">{{ record.asins }}</template>
                <template v-else-if="column.key === 'customerCount'">{{ record.customerCount }}</template>
                <template v-else-if="column.key === 'receivableCny'">¥{{ formatMoney(record.receivableCny) }}</template>
                <template v-else-if="column.key === 'total'">
                  <strong class="table-total">{{ record.total }}</strong>
                </template>
              </template>
            </a-table>
          </div>
        </a-col>

        <a-col :xs="24" :xl="10">
          <div class="card-panel">
            <div class="panel-header">
              <div>
                <h3>今日退单明细</h3>
              </div>
            </div>
            <div class="detail-summary-grid danger-grid">
              <div v-for="country in targetCountries" :key="country" class="detail-summary-item">
                <span>{{ country }}</span>
                <strong>{{ dailyRefundCountryMap[country] || 0 }}</strong>
                <em>单</em>
              </div>
            </div>
            <a-table
              :columns="refundDetailColumns"
              :data-source="refundSalesDetailRows"
              :pagination="false"
              size="middle"
              row-key="sales"
              class="overview-table detail-table"
              :scroll="{ x: 720 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'sales'">
                  <div class="table-name-cell">
                    <strong>{{ record.sales }}</strong>
                  </div>
                </template>
                <template v-else-if="isTypeGroupColumn(column.key)">
                  <div v-if="getTypeGroup(record, getTypeGroupFromColumnKey(column.key))" class="type-group-cell">
                    <div class="type-group-meta danger-name">
                      {{ getTypeGroup(record, getTypeGroupFromColumnKey(column.key))?.total }}单
                    </div>
                    <div class="type-country-list">
                      <span v-for="(country, index) in getVisibleTypeCountries(record, getTypeGroupFromColumnKey(column.key), false)" :key="country.label" class="type-inline-item">
                        {{ country.label }} {{ country.value }}
                        <i v-if="index < getVisibleTypeCountries(record, getTypeGroupFromColumnKey(column.key), false).length - 1">|</i>
                      </span>
                    </div>
                  </div>
                  <span v-else class="empty-cell">—</span>
                </template>
                <template v-else-if="isCountryColumn(column.key)">
                  <div v-if="getCountryType(record, getCountryFromColumnKey(column.key))" class="country-cell">
                    <div class="country-cell-meta danger-name">
                      {{ getCountryType(record, getCountryFromColumnKey(column.key))?.total }}单 ·
                      {{ getCountryType(record, getCountryFromColumnKey(column.key))?.asins }} ASIN
                    </div>
                    <div class="country-cell-tags">
                      <span v-for="(type, index) in getCountryType(record, getCountryFromColumnKey(column.key))?.types || []" :key="type.label" class="type-inline-item">
                        {{ type.label }} {{ type.value }}
                        <i v-if="index < (getCountryType(record, getCountryFromColumnKey(column.key))?.types || []).length - 1">|</i>
                      </span>
                    </div>
                  </div>
                  <span v-else class="empty-cell">—</span>
                </template>
                <template v-else-if="column.key === 'asins'">{{ record.asins }}</template>
                <template v-else-if="column.key === 'customerCount'">{{ record.customerCount }}</template>
                <template v-else-if="column.key === 'total'">
                  <strong class="table-total danger-total">{{ record.total }}</strong>
                </template>
              </template>
            </a-table>
          </div>
        </a-col>
      </a-row>

      <div class="card-panel funds-panel dashboard-grid">
        <div class="panel-header compact">
          <div>
            <h3>今日资金</h3>
          </div>
        </div>
        <div class="funds-list">
          <div class="fund-section income">
            <div class="fund-section-head">
              <span>收款金额</span>
              <div class="fund-amount-stack">
                <strong>¥{{ formatMoney(todayFunds.incomeCny) }}</strong>
                <strong v-if="todayFunds.incomeUsd > 0" class="fund-usd-amount">${{ formatMoney(todayFunds.incomeUsd) }}</strong>
              </div>
            </div>
            <div v-if="accountOffsetAmount > 0" class="fund-offset-line">
              <span>账面抵消</span>
              <strong>¥{{ formatMoney(accountOffsetAmount) }}</strong>
            </div>
            <div class="fund-lines">
              <div class="fund-subtitle">人民币</div>
              <div v-for="item in visibleIncomeCnyBreakdown" :key="item.label" class="fund-line">
                <span>{{ item.label }}</span>
                <strong>¥{{ formatMoney(item.value) }}</strong>
              </div>
              <template v-if="visibleIncomeUsdBreakdown.length">
                <div class="fund-subtitle">美元</div>
                <div v-for="item in visibleIncomeUsdBreakdown" :key="item.label" class="fund-line">
                  <span>{{ item.label }}</span>
                  <strong>${{ formatMoney(item.value) }}</strong>
                </div>
              </template>
            </div>
          </div>
          <div class="fund-section expense">
            <div class="fund-section-head">
              <span>付款金额</span>
              <strong>¥{{ formatMoney(todayFunds.expenseCny) }}</strong>
            </div>
            <div class="fund-lines">
              <div v-for="item in todayFunds.expenseBreakdown" :key="item.label" class="fund-line">
                <span>{{ item.label }}</span>
                <strong>¥{{ formatMoney(item.value) }}</strong>
              </div>
            </div>
          </div>
          <div class="fund-section usd">
            <div class="fund-section-head">
              <span>返款外币</span>
            </div>
            <div class="refund-matrix">
              <div class="refund-matrix-row refund-matrix-head">
                <span>国家</span>
                <span>PayPal</span>
                <span>礼品卡</span>
                <span>合计</span>
              </div>
              <div v-for="row in todayFunds.refundUsdMatrix" :key="row.country" class="refund-matrix-row">
                <span>{{ row.country }}</span>
                <strong>${{ formatMoney(row.paypal) }}</strong>
                <strong>${{ formatMoney(row.giftCard) }}</strong>
                <strong>${{ formatMoney(row.total) }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import {
  CheckCircleOutlined,
  RollbackOutlined,
  ShoppingOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

type CountRow = {
  label: string
  value: number
}

type StaffWorkRow = {
  name: string
  total: number
  asins: number
  buyerCount: number
  review: number
  free: number
  feedback: number
  countryTypes: CountryTypeRow[]
  typeGroups: TypeGroupRow[]
}

type CountryTypeRow = {
  country: string
  total: number
  asins: number
  types: CountRow[]
}

type SalesDetailRow = {
  sales: string
  total: number
  asins: number
  customerCount: number
  receivableCny: number
  countryTypes: CountryTypeRow[]
  typeGroups: TypeGroupRow[]
}

type TypeGroupRow = {
  key: string
  label: string
  total: number
  asins: number
  countries: CountRow[]
}

type TodayFunds = {
  incomeCny: number
  incomeUsd: number
  expenseCny: number
  refundUsd: number
  incomeBreakdown: CountRow[]
  incomeUsdBreakdown: CountRow[]
  expenseBreakdown: CountRow[]
  refundUsdMatrix: Array<{
    country: string
    paypal: number
    giftCard: number
    total: number
  }>
}

const loading = ref(false)
const selectedDay = ref<Dayjs>(dayjs())
const hour = new Date().getHours()
const greeting = computed(() => {
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const targetCountries = ['美国', '德国', '英国', '加拿大']
const REVIEW_TYPES = new Set(['文字评', '图片评', '视频评', '文字', '图片', '视频'])

const dailyOrders = ref<any[]>([])
const dailySubOrders = ref<any[]>([])
const monthOrders = ref<any[]>([])
const monthSubOrders = ref<any[]>([])
const monthFunds = ref<TodayFunds>({
  incomeCny: 0,
  incomeUsd: 0,
  expenseCny: 0,
  refundUsd: 0,
  incomeBreakdown: [],
  incomeUsdBreakdown: [],
  expenseBreakdown: [],
  refundUsdMatrix: [],
})
const todayFunds = ref<TodayFunds>({
  incomeCny: 0,
  incomeUsd: 0,
  expenseCny: 0,
  refundUsd: 0,
  incomeBreakdown: [],
  incomeUsdBreakdown: [],
  expenseBreakdown: [],
  refundUsdMatrix: [],
})
const previousCustomerNames = ref<Set<string>>(new Set())

function buildMockDashboardData(day: Dayjs) {
  const dayIso = day.hour(10).minute(0).second(0).toISOString()
  const monthIso = day.startOf('month').hour(9).toISOString()
  const dailyMockOrders = [
    mockOrder('mock-order-001', '美国', 'B0MOCKUS01', 6, 'Luna', '深圳星河科技', ['文字评', '免评'], { '文字评': 4, '免评': 2 }, dayIso),
    mockOrder('mock-order-002', '德国', 'B0MOCKDE02', 4, 'Ivy', '宁波朗行科技', ['图片评'], { '图片评': 4 }, dayIso),
    mockOrder('mock-order-003', '英国', 'B0MOCKUK03', 5, 'Luna', '杭州云海贸易', ['Feedback', '文字评'], { Feedback: 2, '文字评': 3 }, dayIso),
    mockOrder('mock-order-004', '加拿大', 'B0MOCKCA04', 3, 'Aiden', '广州森语家居', ['免评'], { '免评': 3 }, dayIso),
    mockOrder('mock-order-005', '美国', 'B0MOCKUS05', 7, 'Zoe', '厦门蓝鲸科技', ['视频评', 'Feedback'], { '视频评': 5, Feedback: 2 }, dayIso),
    mockOrder('mock-order-006', '德国', 'B0MOCKDE06', 2, 'Ivy', '深圳星河科技', ['文字评'], { '文字评': 2 }, dayIso),
  ]
  const dailyMockSubs = [
    ...expandMockSubOrders('王浩', '美国', 'Luna', ['文字评'], 5, '已完成', dayIso, '', ['Emma', 'Noah', 'Mia']),
    ...expandMockSubOrders('王浩', '英国', 'Luna', ['免评'], 2, '已完成', dayIso, '', ['Olivia']),
    ...expandMockSubOrders('李娜', '德国', 'Ivy', ['图片评'], 4, '已留评', dayIso, '', ['Sophia', 'Liam']),
    ...expandMockSubOrders('李娜', '美国', 'Ivy', ['免评'], 2, '已完成', dayIso, '', ['Ava']),
    ...expandMockSubOrders('李娜', '加拿大', 'Ivy', ['Feedback'], 1, '已完成', dayIso, '', ['Lucas']),
    ...expandMockSubOrders('周敏', '英国', 'Luna', ['Feedback'], 3, '已完成', dayIso, '', ['Amelia', 'Ethan']),
    ...expandMockSubOrders('周敏', '美国', 'Zoe', ['视频评'], 2, '已留评', dayIso, '', ['Harper']),
    ...expandMockSubOrders('周敏', '德国', 'Ivy', ['文字评'], 1, '已完成', dayIso, '', ['Henry']),
    ...expandMockSubOrders('陈婷', '加拿大', 'Aiden', ['免评'], 3, '已完成', dayIso, '', ['Ella', 'Logan']),
    ...expandMockSubOrders('陈婷', '美国', 'Aiden', ['文字评'], 2, '已完成', dayIso, '', ['Grace']),
    ...expandMockSubOrders('陈婷', '英国', 'Luna', ['Feedback'], 1, '已完成', dayIso, '', ['Jack']),
    ...expandMockSubOrders('王浩', '美国', 'Zoe', ['视频评'], 4, '已留评', dayIso, '', ['Mia', 'Noah']),
    mockSubOrder('mock-refund-001', '美国', 'Luna', '王浩', ['文字评'], '已取消', '取消', dayIso, 0, 'Emma'),
    mockSubOrder('mock-refund-002', '德国', 'Ivy', '李娜', ['图片评'], '进行中', '退款', dayIso, 38.5, 'Sophia'),
    mockSubOrder('mock-refund-003', '英国', 'Luna', '周敏', ['Feedback'], '已取消', '取消', dayIso, 0, 'Amelia'),
  ]
  const extraMonthOrders = [
    mockOrder('mock-month-001', '美国', 'B0MONTHUS1', 42, 'Luna', '深圳星河科技', ['文字评', '免评'], { '文字评': 30, '免评': 12 }, monthIso),
    mockOrder('mock-month-002', '德国', 'B0MONTHDE2', 31, 'Ivy', '宁波朗行科技', ['图片评'], { '图片评': 31 }, monthIso),
    mockOrder('mock-month-003', '英国', 'B0MONTHUK3', 28, 'Zoe', '杭州云海贸易', ['Feedback', '视频评'], { Feedback: 11, '视频评': 17 }, monthIso),
  ]
  const extraMonthSubs = [
    ...expandMockSubOrders('王浩', '美国', 'Luna', ['文字评'], 36, '已完成', monthIso),
    ...expandMockSubOrders('李娜', '德国', 'Ivy', ['图片评'], 29, '已留评', monthIso),
    ...expandMockSubOrders('周敏', '英国', 'Zoe', ['Feedback'], 22, '已完成', monthIso),
    ...expandMockSubOrders('陈婷', '加拿大', 'Aiden', ['免评'], 18, '已完成', monthIso),
    ...expandMockSubOrders('王浩', '美国', 'Luna', ['文字评'], 7, '已取消', monthIso, '取消'),
  ]
  return {
    dailyOrders: dailyMockOrders,
    dailySubOrders: dailyMockSubs,
    monthOrders: [...dailyMockOrders, ...extraMonthOrders],
    monthSubOrders: [...dailyMockSubs, ...extraMonthSubs],
    todayFunds: {
      incomeCny: 18640,
      incomeUsd: 1260,
      expenseCny: 3260,
      refundUsd: 418.5,
      incomeBreakdown: [
        { label: '任务收入', value: 14680 },
        { label: '补款收入', value: 3960 },
        { label: '账面抵消', value: 860 },
      ],
      incomeUsdBreakdown: [
        { label: '任务收入', value: 860 },
        { label: '补款收入', value: 400 },
      ],
      expenseBreakdown: [
        { label: '业务支出', value: 1680 },
        { label: '运营支出', value: 1280 },
        { label: '行政办公', value: 300 },
      ],
      refundUsdMatrix: [
        { country: '美国', paypal: 188.5, giftCard: 60, total: 248.5 },
        { country: '德国', paypal: 0, giftCard: 120, total: 120 },
        { country: '英国', paypal: 50, giftCard: 0, total: 50 },
      ],
    },
    monthFunds: {
      incomeCny: 126800,
      incomeUsd: 8420,
      expenseCny: 28640,
      refundUsd: 3918.5,
      incomeBreakdown: [
        { label: '任务收入', value: 98600 },
        { label: '补款收入', value: 28200 },
        { label: '账面抵消', value: 6000 },
      ],
      incomeUsdBreakdown: [
        { label: '任务收入', value: 6210 },
        { label: '补款收入', value: 2210 },
      ],
      expenseBreakdown: [
        { label: '业务支出', value: 16200 },
        { label: '运营支出', value: 8640 },
        { label: '行政办公', value: 3800 },
      ],
      refundUsdMatrix: [
        { country: '美国', paypal: 1580.5, giftCard: 620, total: 2200.5 },
        { country: '德国', paypal: 310, giftCard: 520, total: 830 },
        { country: '英国', paypal: 480, giftCard: 160, total: 640 },
        { country: '加拿大', paypal: 148, giftCard: 100, total: 248 },
      ],
    },
    previousCustomers: new Set(['宁波朗行科技', '深圳星河科技']),
  }
}

function mockOrder(id: string, country: string, asin: string, quantity: number, sales: string, customer: string, types: string[], typeQuantities: Record<string, number>, createdAt: string) {
  return {
    id,
    order_number: id.toUpperCase(),
    asin,
    country,
    order_quantity: quantity,
    order_type: types[0],
    order_types: types,
    type_quantities: typeQuantities,
    review_type: types[0],
    sales_person: sales,
    customer_name: customer,
    group_name: '',
    feedback_channel: '私聊',
    created_at: createdAt,
    status: '进行中',
    total_amount: quantity * 128,
  }
}

function mockSubOrder(id: string, country: string, sales: string, staff: string, types: string[], status: string, orderStatus: string, updatedAt: string, refundAmount = 0, buyerName = '') {
  return {
    id,
    asin: `B0${id.slice(-8).toUpperCase()}`,
    country,
    status,
    order_status: orderStatus,
    order_type: types[0],
    review_type: types[0],
    order_types: types,
    staff_id: staff,
    staff_name: staff,
    sales_person: sales,
    buyer_name: buyerName,
    customer_name: '演示客户',
    updated_at: updatedAt,
    created_at: updatedAt,
    refund_amount: refundAmount,
    total_amount: 128,
  }
}

function expandMockSubOrders(staff: string, country: string, sales: string, types: string[], count: number, status: string, updatedAt: string, orderStatus = '', buyerNames: string[] = []) {
  return Array.from({ length: count }, (_, index) =>
    mockSubOrder(`mock-sub-${staff}-${country}-${index}`, country, sales, staff, types, status, orderStatus, updatedAt, 0, buyerNames[index % Math.max(buyerNames.length, 1)] || '')
  )
}

function buildTypeColumns(width: number) {
  return [
    { title: '留评', dataIndex: 'type_review', key: 'type:review', width, align: 'center' as const },
    { title: '免评 / FB', dataIndex: 'type_free_fb', key: 'type:freeFb', width, align: 'center' as const },
  ]
}

const salesDetailColumns = [
  { title: '商务', dataIndex: 'sales', key: 'sales', width: 120, fixed: 'left' as const, align: 'center' as const },
  { title: '单量', dataIndex: 'total', key: 'total', width: 86, align: 'center' as const },
  ...buildTypeColumns(220),
  { title: 'ASIN', dataIndex: 'asins', key: 'asins', width: 70, align: 'center' as const },
  { title: '客户', dataIndex: 'customerCount', key: 'customerCount', width: 70, align: 'center' as const },
  { title: '应收', dataIndex: 'receivableCny', key: 'receivableCny', width: 100, align: 'center' as const },
]

const refundDetailColumns = [
  { title: '商务', dataIndex: 'sales', key: 'sales', width: 120, fixed: 'left' as const, align: 'center' as const },
  { title: '单量', dataIndex: 'total', key: 'total', width: 86, align: 'center' as const },
  ...buildTypeColumns(190),
  { title: 'ASIN', dataIndex: 'asins', key: 'asins', width: 70, align: 'center' as const },
  { title: '客户', dataIndex: 'customerCount', key: 'customerCount', width: 70, align: 'center' as const },
]

const staffWorkColumns = [
  { title: '业务员', dataIndex: 'name', key: 'name', width: 120, fixed: 'left' as const, align: 'center' as const },
  { title: '单量', dataIndex: 'total', key: 'total', width: 96, align: 'center' as const },
  ...buildTypeColumns(260),
  { title: 'ASIN', dataIndex: 'asins', key: 'asins', width: 70, align: 'center' as const },
  { title: '买手', dataIndex: 'buyerCount', key: 'buyerCount', width: 70, align: 'center' as const },
]

const dailyWorkRows = computed(() => dailySubOrders.value.filter(isCompletedWork))
const dailyRefundRows = computed(() => dailySubOrders.value.filter(isRefundOrder))
const dailyOrderTotal = computed(() => sumOrderQuantity(dailyOrders.value))
const dailyWorkTotal = computed(() => dailyWorkRows.value.length)
const dailyRefundTotal = computed(() => dailyRefundRows.value.length)
const dailyAsinCount = computed(() => uniqueCount(dailyOrders.value.map(order => normalizeText(order.asin))))

const customerStats = computed(() => {
  const names = uniqueFilled(dailyOrders.value.map(order => getCustomerName(order)))
  const newNames = names.filter(name => !previousCustomerNames.value.has(name))
  const total = names.length
  const newCount = newNames.length
  return {
    total,
    new: newCount,
    returning: Math.max(total - newCount, 0),
    newRate: total ? Math.round((newCount / total) * 100) : 0,
  }
})

const monthCards = computed(() => {
  const monthOrderTotal = sumOrderQuantity(monthOrders.value)
  const monthWorkTotal = monthSubOrders.value.filter(isCompletedWork).length
  const monthRefundTotal = monthSubOrders.value.filter(isRefundOrder).length
  return [
    { key: 'work', label: '做单', value: monthWorkTotal, sub: `${uniqueCount(monthSubOrders.value.filter(isCompletedWork).map(order => normalizeText(order.asin)))} 个ASIN` },
    { key: 'orders', label: '接单', value: monthOrderTotal, sub: `${uniqueCount(monthOrders.value.map(order => normalizeText(order.asin)))} 个ASIN` },
    { key: 'refund', label: '退单', value: monthRefundTotal, sub: `退单率 ${getPercent(monthRefundTotal, monthWorkTotal || monthOrderTotal)}%` },
    { key: 'income', label: '收款', value: `¥${formatCompactMoney(monthFunds.value.incomeCny)}`, sub: monthFunds.value.incomeUsd > 0 ? `$${formatCompactMoney(monthFunds.value.incomeUsd)}` : '已入账' },
    { key: 'expense', label: '付款', value: `¥${formatCompactMoney(monthFunds.value.expenseCny)}`, sub: '' },
  ]
})

const focusCards = computed(() => [
  {
    key: 'work',
    label: '今日做单量',
    value: dailyWorkTotal.value,
    sub: `${dailyStaffRows.value.length} 个业务员`,
    icon: CheckCircleOutlined,
    className: 'focus-green',
  },
  {
    key: 'orders',
    label: '今日接单量',
    value: dailyOrderTotal.value,
    sub: `${dailyAsinCount.value} 个ASIN`,
    icon: ShoppingOutlined,
    className: 'focus-blue',
  },
  {
    key: 'refund',
    label: '今日退单量',
    value: dailyRefundTotal.value,
    sub: `${uniqueCount(dailyRefundRows.value.map(order => normalizeText(order.asin)))} 个ASIN`,
    icon: RollbackOutlined,
    className: 'focus-red',
  },
  {
    key: 'customers',
    label: '今日下单客户',
    value: customerStats.value.total,
    sub: `新客户 ${customerStats.value.new} 个，占比 ${customerStats.value.newRate}%`,
    icon: UsergroupAddOutlined,
    className: 'focus-purple',
  },
])

const dailyStaffRows = computed<StaffWorkRow[]>(() => {
  const map = new Map<string, StaffWorkRow & { _orders: any[] }>()
  dailyWorkRows.value.forEach(order => {
    const name = normalizeText(order.staff_name) || '未分配业务员'
    const row = map.get(name) || { name, total: 0, asins: 0, buyerCount: 0, review: 0, free: 0, feedback: 0, countryTypes: [], typeGroups: [], _orders: [] }
    row.total += 1
    row._orders.push(order)
    const types = getOrderTypes(order)
    if (types.some(type => REVIEW_TYPES.has(type))) row.review += 1
    if (types.includes('免评')) row.free += 1
    if (types.includes('Feedback') || types.includes('FB')) row.feedback += 1
    map.set(name, row)
  })
  return Array.from(map.values())
    .map(row => ({
      name: row.name,
      total: row.total,
      asins: uniqueCount(row._orders.map(order => normalizeText(order.asin))),
      buyerCount: uniqueCount(row._orders.map(order => normalizeText(order.buyer_name || order.buyer_id))),
      review: row.review,
      free: row.free,
      feedback: row.feedback,
      countryTypes: buildCountryTypeRows(row._orders, false),
      typeGroups: buildTypeGroupRows(row._orders, false),
    }))
    .sort((a, b) => b.total - a.total)
})

const dailyOrderCountryMap = computed(() => countryCountMap(dailyOrders.value, order => normalizeText(order.country), true))
const dailyRefundCountryMap = computed(() => countryCountMap(dailyRefundRows.value, order => normalizeText(order.country), false))
const dailyWorkCountryMap = computed(() => countryCountMap(dailyWorkRows.value, order => normalizeText(order.country), false))
const workCountrySummaryRows = computed(() => targetCountries.map(label => ({ label, value: dailyWorkCountryMap.value[label] || 0 })))
const salesDetailRows = computed(() => buildSalesDetailRows(dailyOrders.value))
const refundSalesDetailRows = computed(() => buildSalesDetailRows(dailyRefundRows.value, false))
const accountOffsetAmount = computed(() => getAmountByLabel(todayFunds.value.incomeBreakdown, '账面抵消'))
const visibleIncomeCnyBreakdown = computed(() => orderAmountRows(todayFunds.value.incomeBreakdown.filter(item => item.label !== '账面抵消'), ['任务收入', '补款收入']))
const visibleIncomeUsdBreakdown = computed(() => todayFunds.value.incomeUsdBreakdown.filter(item => item.label !== '补款收入'))

async function loadStats() {
  loading.value = true
  try {
    const dayStart = selectedDay.value.startOf('day').toISOString()
    const dayEnd = selectedDay.value.endOf('day').toISOString()
    const monthStart = selectedDay.value.startOf('month').toISOString()
    const monthEnd = selectedDay.value.endOf('month').toISOString()

    const [dailyOrdersRes, monthOrdersRes, dailySubRes, monthSubRes, ledgerRes, refundReqRes, monthLedgerRes, monthRefundReqRes] = await Promise.all([
      supabase
        .from('erp_orders')
        .select('id, order_number, asin, country, order_quantity, order_type, order_types, type_quantities, review_type, sales_person, customer_name, group_name, feedback_channel, total_amount, created_at, status')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .order('created_at', { ascending: false }),
      supabase
        .from('erp_orders')
        .select('id, asin, country, order_quantity, order_type, order_types, type_quantities, review_type, sales_person, customer_name, group_name, feedback_channel, total_amount, created_at, status')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd),
      supabase
        .from('sub_orders')
        .select('id, asin, country, status, order_status, order_type, review_type, order_types, staff_id, staff_name, sales_person, buyer_id, buyer_name, customer_name, total_amount, updated_at, created_at, refund_amount')
        .gte('updated_at', dayStart)
        .lte('updated_at', dayEnd),
      supabase
        .from('sub_orders')
        .select('id, asin, country, status, order_status, order_type, review_type, order_types, staff_id, staff_name, sales_person, buyer_id, buyer_name, customer_name, total_amount, updated_at, created_at, refund_amount')
        .gte('updated_at', monthStart)
        .lte('updated_at', monthEnd),
      supabase
        .from('financial_transactions')
        .select('entry_scope, transaction_type, direction, amount_cny, amount_usd, transaction_date')
        .eq('transaction_date', selectedDay.value.format('YYYY-MM-DD')),
      supabase
        .from('refund_requests')
        .select('refund_method, refund_amount_usd, refund_amount_cny, refund_amount, country, status, handled_at')
        .eq('status', '已处理')
        .gte('handled_at', dayStart)
        .lte('handled_at', dayEnd),
      supabase
        .from('financial_transactions')
        .select('entry_scope, transaction_type, direction, amount_cny, amount_usd, transaction_date')
        .gte('transaction_date', selectedDay.value.startOf('month').format('YYYY-MM-DD'))
        .lte('transaction_date', selectedDay.value.endOf('month').format('YYYY-MM-DD')),
      supabase
        .from('refund_requests')
        .select('refund_method, refund_amount_usd, refund_amount_cny, refund_amount, country, status, handled_at')
        .eq('status', '已处理')
        .gte('handled_at', monthStart)
        .lte('handled_at', monthEnd),
    ])

    const mock = buildMockDashboardData(selectedDay.value)
    const nextDailyOrders = dailyOrdersRes.data || []
    const nextDailySubOrders = dailySubRes.data || []
    const shouldUseMockDaily = nextDailyOrders.length === 0 && nextDailySubOrders.length === 0

    dailyOrders.value = shouldUseMockDaily ? mock.dailyOrders : nextDailyOrders
    dailySubOrders.value = shouldUseMockDaily ? mock.dailySubOrders : nextDailySubOrders
    monthOrders.value = (monthOrdersRes.data || []).length ? (monthOrdersRes.data || []) : mock.monthOrders
    monthSubOrders.value = (monthSubRes.data || []).length ? (monthSubRes.data || []) : mock.monthSubOrders
    todayFunds.value = shouldUseMockDaily
      ? mock.todayFunds
      : buildTodayFunds(ledgerRes.data || [], refundReqRes.data || [])
    monthFunds.value = shouldUseMockDaily
      ? mock.monthFunds
      : buildTodayFunds(monthLedgerRes.data || [], monthRefundReqRes.data || [])

    if (shouldUseMockDaily) {
      previousCustomerNames.value = mock.previousCustomers
    } else {
      await loadPreviousCustomers(dayStart)
    }
  } finally {
    loading.value = false
  }
}

async function loadPreviousCustomers(dayStart: string) {
  const names = uniqueFilled(dailyOrders.value.map(order => getCustomerName(order)))
  if (!names.length) {
    previousCustomerNames.value = new Set()
    return
  }
  const [customerRes, groupRes] = await Promise.all([
    supabase
      .from('erp_orders')
      .select('customer_name, group_name, feedback_channel')
      .in('customer_name', names)
      .lt('created_at', dayStart),
    supabase
      .from('erp_orders')
      .select('customer_name, group_name, feedback_channel')
      .in('group_name', names)
      .lt('created_at', dayStart),
  ])
  previousCustomerNames.value = new Set(uniqueFilled([...(customerRes.data || []), ...(groupRes.data || [])].map(order => getCustomerName(order))))
}

function isCompletedWork(order: any) {
  return ['已完成', '已留评'].includes(normalizeText(order.status))
}

function isRefundOrder(order: any) {
  const status = normalizeText(order.status)
  const orderStatus = normalizeText(order.order_status)
  return status === '已取消' || orderStatus === '取消' || orderStatus === '退款' || Number(order.refund_amount || 0) > 0
}

function getOrderTypes(order: any): string[] {
  if (Array.isArray(order.order_types) && order.order_types.length) {
    return order.order_types.map(normalizeBusinessType).filter(Boolean)
  }
  return [order.order_type, order.review_type].map(normalizeBusinessType).filter(Boolean)
}

function normalizeBusinessType(value: any) {
  const text = normalizeText(value)
  if (!text) return ''
  if (['文字', '文字评'].includes(text)) return '文字评'
  if (['图片', '图片评'].includes(text)) return '图片评'
  if (['视频', '视频评'].includes(text)) return '视频评'
  if (['Feedback', 'FB', 'feedback'].includes(text)) return 'Feedback'
  return text
}

function getTypeQty(order: any, type: string, countByQuantity = false) {
  if (!countByQuantity) return 1
  const quantityMap = order?.type_quantities && typeof order.type_quantities === 'object' ? order.type_quantities : {}
  const direct = Number(quantityMap[type] || quantityMap[type.replace('评', '')] || 0)
  if (direct > 0) return direct
  if (getOrderTypes(order).length <= 1) return Number(order.order_quantity || 0) || 1
  return 1
}

function sumOrderQuantity(orders: any[]) {
  return orders.reduce((sum, order) => sum + (Number(order.order_quantity || 0) || 1), 0)
}

function countryCountMap(orders: any[], getCountry: (order: any) => string, countByQuantity: boolean) {
  return orders.reduce((acc: Record<string, number>, order) => {
    const country = getCountry(order) || '未知国家'
    acc[country] = (acc[country] || 0) + (countByQuantity ? (Number(order.order_quantity || 0) || 1) : 1)
    return acc
  }, {})
}

function groupCountRows(orders: any[], getLabel: (order: any) => string, countByQuantity = false): CountRow[] {
  const map = new Map<string, number>()
  orders.forEach(order => {
    const label = getLabel(order) || '未分类'
    const count = countByQuantity ? (Number(order.order_quantity || 0) || 1) : 1
    map.set(label, (map.get(label) || 0) + count)
  })
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function buildSalesDetailRows(orders: any[], countByQuantity = true): SalesDetailRow[] {
  const map = new Map<string, any[]>()
  orders.forEach(order => {
    const sales = normalizeText(order.sales_person) || '未填写商务'
    const list = map.get(sales) || []
    list.push(order)
    map.set(sales, list)
  })
  return Array.from(map.entries())
    .map(([sales, list]) => ({
      sales,
      total: countByQuantity ? sumOrderQuantity(list) : list.length,
      asins: uniqueCount(list.map(order => normalizeText(order.asin))),
      customerCount: uniqueCount(list.map(order => getCustomerName(order))),
      receivableCny: list.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      countryTypes: buildCountryTypeRows(list, countByQuantity),
      typeGroups: buildTypeGroupRows(list, countByQuantity),
    }))
    .sort((a, b) => b.total - a.total)
}

function buildTypeGroupRows(orders: any[], countByQuantity: boolean): TypeGroupRow[] {
  const groupMap = new Map<string, { key: string; label: string; total: number; asinSet: Set<string>; countryMap: Map<string, number> }>()
  const ensureGroup = (key: string, label: string) => {
    const existing = groupMap.get(key)
    if (existing) return existing
    const created = { key, label, total: 0, asinSet: new Set<string>(), countryMap: new Map<string, number>() }
    groupMap.set(key, created)
    return created
  }

  orders.forEach(order => {
    const country = normalizeText(order.country) || '未知国家'
    const asin = normalizeText(order.asin)
    const types = getOrderTypes(order)
    types.forEach(type => {
      const group = getTypeGroupMeta(type)
      if (!group) return
      const qty = getTypeQty(order, type, countByQuantity)
      const entry = ensureGroup(group.key, group.label)
      entry.total += qty
      if (asin) entry.asinSet.add(asin)
      entry.countryMap.set(country, (entry.countryMap.get(country) || 0) + qty)
    })
  })

  return Array.from(groupMap.values())
    .map(group => ({
      key: group.key,
      label: group.label,
      total: group.total,
      asins: group.asinSet.size,
      countries: Array.from(group.countryMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
    }))
    .sort((a, b) => {
      const order = ['review', 'freeFb']
      return order.indexOf(a.key) - order.indexOf(b.key)
    })
}

function getTypeGroupMeta(type: string) {
  if (REVIEW_TYPES.has(type)) return { key: 'review', label: '留评' }
  if (['免评', 'Feedback', 'FB'].includes(type)) return { key: 'freeFb', label: '免评 / FB' }
  return null
}

function buildCountryTypeRows(orders: any[], countByQuantity: boolean) {
  const countryMap = new Map<string, { total: number; asinSet: Set<string>; typeMap: Map<string, number> }>()
  orders.forEach(order => {
    const country = normalizeText(order.country) || '未知国家'
    const entry = countryMap.get(country) || { total: 0, asinSet: new Set<string>(), typeMap: new Map<string, number>() }
    const orderTotal = countByQuantity ? (Number(order.order_quantity || 0) || 1) : 1
    entry.total += orderTotal
    const asin = normalizeText(order.asin)
    if (asin) entry.asinSet.add(asin)

    const types = getOrderTypes(order)
    if (!types.length) {
      entry.typeMap.set('未分类', (entry.typeMap.get('未分类') || 0) + orderTotal)
    } else {
      types.forEach(type => {
        entry.typeMap.set(type, (entry.typeMap.get(type) || 0) + getTypeQty(order, type, countByQuantity))
      })
    }
    countryMap.set(country, entry)
  })

  return Array.from(countryMap.entries())
    .map(([country, entry]) => ({
      country,
      total: entry.total,
      asins: entry.asinSet.size,
      types: Array.from(entry.typeMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
    }))
    .sort((a, b) => b.total - a.total)
}

function buildTodayFunds(ledgerRows: any[], refundRows: any[]): TodayFunds {
  const incomeRows = ledgerRows.filter(row => String(row.direction || '').includes('收入'))
  const expenseRows = ledgerRows.filter(row => String(row.direction || '').includes('支出'))
  const incomeBreakdown = groupAmountRows(incomeRows, row => normalizeText(row.transaction_type) || '未分类收入', row => Number(row.amount_cny || 0))
  const incomeUsdBreakdown = groupAmountRows(incomeRows, row => normalizeText(row.transaction_type) || '未分类收入', row => Number(row.amount_usd || 0))
  const ledgerExpenseBreakdown = groupAmountRows(expenseRows, row => normalizeText(row.entry_scope) || '未分类支出', row => Number(row.amount_cny || 0))
  const requestExpenseBreakdown = groupAmountRows(
    refundRows.filter(row => Number(row.refund_amount_cny || 0) > 0 || !['PayPal', '礼品卡'].includes(normalizeText(row.refund_method))),
    row => '业务支出',
    row => Number(row.refund_amount_cny || row.refund_amount || 0),
  )
  const expenseBreakdown = ledgerExpenseBreakdown.length ? ledgerExpenseBreakdown : requestExpenseBreakdown
  const refundUsdRows = refundRows.filter(row => ['PayPal', '礼品卡'].includes(normalizeText(row.refund_method)))
  const refundUsdMatrixFromRequests = buildRefundUsdMatrix(refundUsdRows)
  const refundUsdFromLedger = expenseRows
    .filter(row => String(row.direction || '').includes('支出'))
  const refundUsdLedgerTotal = refundUsdFromLedger.reduce((sum, row) => sum + Number(row.amount_usd || 0), 0)
  const refundUsdMatrix = refundUsdMatrixFromRequests.length
    ? refundUsdMatrixFromRequests
    : (refundUsdLedgerTotal > 0 ? [{ country: '未拆分', paypal: refundUsdLedgerTotal, giftCard: 0, total: refundUsdLedgerTotal }] : [])
  return {
    incomeCny: incomeBreakdown.filter(item => item.label !== '账面抵消').reduce((sum, item) => sum + item.value, 0),
    incomeUsd: incomeUsdBreakdown.reduce((sum, item) => sum + item.value, 0),
    expenseCny: expenseBreakdown.reduce((sum, item) => sum + item.value, 0),
    refundUsd: refundUsdMatrix.reduce((sum, item) => sum + item.total, 0),
    incomeBreakdown,
    incomeUsdBreakdown,
    expenseBreakdown,
    refundUsdMatrix,
  }
}

function isCountryColumn(key: any) {
  return String(key || '').startsWith('country:')
}

function isTypeGroupColumn(key: any) {
  return String(key || '').startsWith('type:')
}

function getCountryFromColumnKey(key: any) {
  return String(key || '').replace('country:', '')
}

function getTypeGroupFromColumnKey(key: any) {
  return String(key || '').replace('type:', '')
}

function getCountryType(record: { countryTypes?: CountryTypeRow[] }, country: string) {
  return (record.countryTypes || []).find(item => item.country === country)
}

function getTypeGroup(record: { typeGroups?: TypeGroupRow[] }, key: string) {
  return (record.typeGroups || []).find(item => item.key === key)
}

function getVisibleTypeCountries(record: { typeGroups?: TypeGroupRow[] }, key: string, hideUsOnly = false) {
  const countries = getTypeGroup(record, key)?.countries || []
  if (hideUsOnly) return countries.filter(country => country.label !== '美国')
  return countries
}

function buildRefundUsdMatrix(rows: any[]) {
  const map = new Map<string, { country: string; paypal: number; giftCard: number; total: number }>()
  rows.forEach(row => {
    const country = normalizeText(row.country) || '未知国家'
    const method = normalizeText(row.refund_method)
    const amount = Number(row.refund_amount_usd || row.refund_amount || 0)
    if (!amount) return
    const entry = map.get(country) || { country, paypal: 0, giftCard: 0, total: 0 }
    if (method === 'PayPal') entry.paypal += amount
    if (method === '礼品卡') entry.giftCard += amount
    entry.total += amount
    map.set(country, entry)
  })
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

function groupAmountRows(rows: any[], getLabel: (row: any) => string, getAmount: (row: any) => number): CountRow[] {
  const map = new Map<string, number>()
  rows.forEach(row => {
    const amount = getAmount(row)
    if (!amount) return
    const label = getLabel(row) || '未分类'
    map.set(label, (map.get(label) || 0) + amount)
  })
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function orderAmountRows(rows: CountRow[], preferredLabels: string[]) {
  const order = new Map(preferredLabels.map((label, index) => [label, index]))
  return [...rows].sort((a, b) => {
    const aOrder = order.has(a.label) ? order.get(a.label)! : preferredLabels.length
    const bOrder = order.has(b.label) ? order.get(b.label)! : preferredLabels.length
    if (aOrder !== bOrder) return aOrder - bOrder
    return b.value - a.value
  })
}

function getAmountByLabel(rows: CountRow[], label: string) {
  return rows.find(item => item.label === label)?.value || 0
}

function getCustomerName(order: any) {
  return normalizeText(order.feedback_channel === '群组' ? (order.group_name || order.customer_name) : order.customer_name)
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatCompactMoney(value: number) {
  const amount = Number(value || 0)
  if (Math.abs(amount) >= 10000) return `${(amount / 10000).toFixed(1)}万`
  return amount.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

function normalizeText(value: any) {
  return String(value || '').trim()
}

function uniqueFilled(values: string[]) {
  return Array.from(new Set(values.map(normalizeText).filter(Boolean)))
}

function uniqueCount(values: string[]) {
  return uniqueFilled(values).length
}

function getPercent(value: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.round((value / total) * 100))
}

function getStackWidth(value: number, total: number) {
  if (!total || !value) return 0
  return Math.max(6, Math.round((value / total) * 100))
}

onMounted(loadStats)
</script>

<style scoped>
.page-content {
  padding: 24px;
}
.dashboard-header {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}
.page-subtitle {
  color: #6b7280;
  font-size: 13px;
  margin-top: 4px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.month-lite,
.card-panel,
.focus-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.month-lite {
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.month-lite-title {
  color: #1a1a2e;
  font-weight: 700;
  padding-right: 12px;
  border-right: 1px solid #e5e7eb;
}
.month-lite-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  color: #6b7280;
  font-size: 12px;
}
.month-lite-divider {
  color: #d1d5db;
  font-size: 14px;
  font-weight: 700;
}
.month-lite-item strong {
  color: #2563eb;
  font-size: 18px;
  line-height: 1;
}
.month-lite-item em {
  color: #6b7280;
  font-size: 12px;
  font-style: normal;
}
.focus-row {
  margin-bottom: 16px;
}
.focus-card {
  border-radius: 16px;
  padding: 18px;
  min-height: 150px;
  position: relative;
  overflow: hidden;
}
.focus-card::after {
  content: '';
  position: absolute;
  width: 120px;
  height: 120px;
  right: -46px;
  bottom: -52px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.08);
}
.focus-card-head {
  display: flex;
  justify-content: space-between;
  color: #6b7280;
  font-size: 13px;
}
.focus-card-head .anticon {
  font-size: 22px;
}
.focus-value {
  color: #1a1a2e;
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
  margin: 18px 0 10px;
}
.focus-sub {
  color: #6b7280;
  font-size: 12px;
}
.focus-blue .anticon { color: #2563eb; }
.focus-green .anticon { color: #059669; }
.focus-red .anticon { color: #dc2626; }
.focus-purple .anticon { color: #7c3aed; }
.dashboard-grid {
  margin-top: 16px;
}
.card-panel {
  border-radius: 14px;
  padding: 20px;
  height: 100%;
}
.work-panel {
  min-height: 0;
}
.quick-panel {
  min-height: 0;
}
.funds-panel {
  height: auto;
}
.funds-list {
  display: grid;
  grid-template-columns: 1fr 1fr 1.35fr;
  gap: 10px;
}
.fund-section {
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 12px;
  background: #f5f7fa;
}
.fund-section-head,
.fund-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.fund-section-head span,
.fund-line span {
  color: #6b7280;
  font-size: 12px;
}
.fund-section-head strong {
  color: #1a1a2e;
  font-size: 18px;
}
.fund-amount-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.fund-amount-stack .fund-usd-amount {
  color: #2563eb;
  font-size: 13px;
}
.fund-offset-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.06);
}
.fund-offset-line span {
  color: #6b7280;
  font-size: 12px;
}
.fund-offset-line strong {
  color: #2563eb;
  font-size: 12px;
}
.fund-lines {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
}
.fund-line strong {
  color: #1a1a2e;
  font-size: 12px;
}
.fund-subtitle {
  color: #9ca3af;
  font-size: 11px;
  font-weight: 700;
}
.fund-section.income .fund-section-head strong {
  color: #059669;
}
.fund-section.expense .fund-section-head strong {
  color: #dc2626;
}
.fund-section.usd .fund-section-head strong {
  color: #2563eb;
}
.refund-matrix {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e5e7eb;
}
.refund-matrix-row {
  display: grid;
  grid-template-columns: 1fr 82px 82px 82px;
  gap: 8px;
  align-items: center;
  padding: 4px 0;
  color: #6b7280;
  font-size: 12px;
}
.refund-matrix-row strong {
  color: #1a1a2e;
  text-align: right;
}
.refund-matrix-head {
  color: #9ca3af;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 4px;
  padding-bottom: 6px;
}
.mt16 {
  margin-top: 16px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}
.panel-header.compact {
  margin-bottom: 12px;
}
.panel-header h3 {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}
.panel-header p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
}
.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.empty-lite {
  padding: 56px 0;
  text-align: center;
  color: #9ca3af;
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
}
.work-country-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.work-country-item {
  border: 1px solid rgba(37, 99, 235, 0.12);
  background: rgba(37, 99, 235, 0.06);
  border-radius: 10px;
  padding: 10px;
}
.work-country-item span,
.work-country-item em {
  color: #6b7280;
  font-size: 12px;
  font-style: normal;
}
.work-country-item strong {
  color: #1a1a2e;
  font-size: 22px;
  margin: 0 2px 0 8px;
}
.staff-performance-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.staff-performance-item {
  display: grid;
  grid-template-columns: minmax(180px, 230px) 1fr 72px;
  gap: 14px;
  align-items: center;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
}
.staff-main {
  display: flex;
  gap: 10px;
  align-items: center;
}
.staff-table-name {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.staff-table-name strong {
  color: #1a1a2e;
}
.staff-name {
  color: #1a1a2e;
  font-weight: 700;
}
.staff-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  color: #6b7280;
  font-size: 12px;
  margin-top: 3px;
}
.staff-bar {
  display: flex;
  height: 9px;
  overflow: hidden;
  background: #f0f2f5;
  border-radius: 999px;
}
.staff-bar span {
  display: block;
  height: 100%;
}
.bar-review { background: #2563eb; }
.bar-free { background: #059669; }
.bar-fb { background: #7c3aed; }
.staff-total {
  text-align: right;
  color: #1a1a2e;
  font-size: 24px;
  font-weight: 800;
}
.staff-total span {
  color: #6b7280;
  font-size: 12px;
  font-weight: 400;
  margin-left: 2px;
}
.country-list,
.business-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.country-name,
.business-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.country-name span,
.business-item span {
  color: #1a1a2e;
  font-weight: 600;
}
.country-name em {
  color: #6b7280;
  font-style: normal;
  font-size: 12px;
}
.business-item {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 10px;
}
.business-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}
.business-item strong {
  color: #2563eb;
}
.quick-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.quick-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #f0f0f0;
  transition: all 0.15s;
  font-size: 13px;
  color: #1a1a2e;
}
.quick-link:hover {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.06);
  color: #2563eb;
}
.quick-link-icon {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.ql-blue { background: rgba(37, 99, 235, 0.12); color: #2563eb; }
.ql-green { background: rgba(5, 150, 105, 0.12); color: #059669; }
.ql-orange { background: rgba(217, 119, 6, 0.14); color: #d97706; }
.ql-purple { background: rgba(124, 58, 237, 0.12); color: #7c3aed; }
.ql-red { background: rgba(220, 38, 38, 0.12); color: #dc2626; }
.ql-cyan { background: rgba(37, 99, 235, 0.12); color: #2563eb; }
.detail-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.detail-summary-item {
  border-radius: 10px;
  background: rgba(37, 99, 235, 0.06);
  border: 1px solid rgba(37, 99, 235, 0.12);
  padding: 10px;
  display: flex;
  align-items: baseline;
  justify-content: center;
}
.danger-grid .detail-summary-item {
  background: rgba(220, 38, 38, 0.06);
  border-color: rgba(220, 38, 38, 0.12);
}
.order-grid .detail-summary-item {
  background: rgba(5, 150, 105, 0.06);
  border-color: rgba(5, 150, 105, 0.12);
}
.detail-summary-item span {
  color: #6b7280;
  font-size: 12px;
}
.detail-summary-item strong {
  color: #1a1a2e;
  font-size: 22px;
  margin: 0 2px 0 8px;
}
.detail-summary-item em {
  color: #6b7280;
  font-size: 12px;
  font-style: normal;
}
.mini-tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 12px;
  line-height: 1;
}
.country-mini {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
}
.type-mini {
  background: rgba(5, 150, 105, 0.10);
  color: #059669;
}
.free-mini {
  background: rgba(217, 119, 6, 0.12);
  color: #d97706;
}
.fb-mini {
  background: rgba(124, 58, 237, 0.10);
  color: #7c3aed;
}
.danger-mini {
  background: rgba(220, 38, 38, 0.08);
  color: #dc2626;
}
.overview-table :deep(.ant-table-thead > tr > th) {
  color: #6b7280;
  font-size: 12px;
  background: #f5f7fa;
}
.detail-table {
  margin-top: 12px;
}
.compact-table :deep(.ant-table-tbody > tr > td),
.detail-table :deep(.ant-table-tbody > tr > td) {
  vertical-align: top;
}
.table-name-cell strong {
  display: block;
  color: #1a1a2e;
  font-size: 14px;
  text-align: center;
}
.table-name-cell span {
  display: block;
  margin-top: 3px;
  color: #6b7280;
  font-size: 12px;
}
.table-tag-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.country-type-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.country-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  text-align: center;
}
.type-group-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  min-width: 0;
  text-align: center;
}
.type-group-meta {
  color: #1a1a2e;
  font-size: 13px;
  font-weight: 700;
}
.type-country-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}
.type-inline-item {
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
}
.type-inline-item i {
  color: #d1d5db;
  font-style: normal;
  margin-left: 6px;
}
.country-cell-meta {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.country-cell-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}
.empty-cell {
  display: block;
  color: #9ca3af;
  font-size: 12px;
  text-align: center;
}
.country-type-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.country-type-name {
  display: inline-flex;
  align-items: center;
  min-width: 46px;
  color: #2563eb;
  font-weight: 700;
  font-size: 12px;
}
.country-type-name::after {
  content: '';
  width: 1px;
  height: 12px;
  background: #e5e7eb;
  margin-left: 8px;
}
.danger-name {
  color: #dc2626;
}
.table-total {
  display: inline-block;
  color: #2563eb;
  font-size: 20px;
  line-height: 1;
}
.danger-total {
  color: #dc2626;
}
@media (max-width: 767px) {
  .page-content {
    padding: 12px;
  }
  .dashboard-header,
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .staff-performance-item {
    grid-template-columns: 1fr;
  }
  .staff-total {
    text-align: left;
  }
  .detail-summary-grid,
  .work-country-summary,
  .quick-links,
  .funds-list {
    grid-template-columns: 1fr 1fr;
  }
  .fund-section.usd {
    grid-column: 1 / -1;
  }
}
</style>
