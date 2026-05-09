<template>
  <div class="page-content">
    <template v-if="canView">
      <div class="page-header">
        <div>
          <h1 class="page-title">汇率管理</h1>
          <div class="page-subtitle">按天维护汇率，昨日数据仅作弱提示参考，录入区采用更紧凑的填写布局。</div>
        </div>
      </div>

      <a-alert
        :type="statusMeta.alertType"
        show-icon
        :message="statusMeta.message"
        :description="statusMeta.description"
        class="status-alert"
      />

      <a-alert
        v-if="!canEdit"
        type="info"
        show-icon
        class="status-alert"
        message="当前角色仅可查看"
        description="商务可以查看历史与当天数据，财务和管理员可以录入保存。"
      />

      <a-card class="section-card entry-card" :loading="loadingCurrent" title="当日录入">
        <template #extra>
          <a-button type="primary" @click="saveDailyRates" :loading="saving" :disabled="!canEdit">保存</a-button>
        </template>
        <div class="compact-panel">
          <div class="compact-panel-head">
            <div>
              <div class="section-title">美元现汇牌价</div>
              <div class="section-desc">
                <span>昨日数据仅供参考，保持弱化展示。</span>
                <span v-if="previousSnapshotDate">昨日参考：{{ previousSnapshotDate }}</span>
              </div>
            </div>
          </div>

          <div class="usd-grid">
            <div class="usd-box">
              <div class="mini-label">现汇买入价</div>
              <div class="usd-row">
                <a-input-number
                  v-model:value="dailyForm.usdCashBuyRate"
                  :min="0"
                  :precision="4"
                  :controls="false"
                  size="small"
                  class="small-input"
                  :disabled="!canEdit"
                  placeholder="填写"
                />
                <span class="reference-value">昨日 {{ formatRate(previousDaily.usdCashBuyRate) }}</span>
              </div>
            </div>

            <div class="usd-box">
              <div class="mini-label">现汇卖出价</div>
              <div class="usd-row">
                <a-input-number
                  v-model:value="dailyForm.usdCashSellRate"
                  :min="0"
                  :precision="4"
                  :controls="false"
                  size="small"
                  class="small-input"
                  :disabled="!canEdit"
                  placeholder="填写"
                />
                <span class="reference-value">昨日 {{ formatRate(previousDaily.usdCashSellRate) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="rate-table-wrap">
          <table class="rate-table">
            <thead>
              <tr>
                <th>国家</th>
                <th>币种</th>
                <th>实时汇率</th>
                <th>建议接单汇率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rateRows" :key="row.country_code">
                <td>
                  <div class="country-cell">
                    <span class="country-name">{{ row.country_name }}</span>
                    <a-tag color="blue">{{ row.country_code }}</a-tag>
                  </div>
                </td>
                <td>{{ row.currency_code }}/CNY</td>
                <td>
                  <div class="input-with-reference">
                    <a-input-number
                      v-model:value="row.realtime_rate"
                      :min="0"
                      :precision="4"
                      :controls="false"
                      size="small"
                      class="small-input"
                      :disabled="!canEdit"
                      placeholder="填写"
                    />
                    <span class="reference-value">昨日 {{ formatRate(previousRateMap[row.country_code]?.realtime_rate) }}</span>
                  </div>
                </td>
                <td>
                  <div class="input-with-reference">
                    <a-input-number
                      v-model:value="row.suggested_rate"
                      :min="0"
                      :precision="4"
                      :controls="false"
                      size="small"
                      class="small-input"
                      :disabled="!canEdit"
                      placeholder="填写"
                    />
                    <span class="reference-value">昨日 {{ formatRate(previousRateMap[row.country_code]?.suggested_rate) }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </a-card>

      <a-card class="section-card" title="历史记录查询">
        <div class="filter-bar">
          <a-range-picker v-model:value="historyDateRange" :allow-clear="false" />
          <a-select v-model:value="historyCountry" allow-clear placeholder="国家" style="width: 140px">
            <a-select-option v-for="country in COUNTRY_CONFIGS" :key="country.country_code" :value="country.country_code">
              {{ country.country_name }}
            </a-select-option>
          </a-select>
          <a-button type="primary" @click="loadHistory" :loading="historyLoading">查询</a-button>
        </div>

        <div class="history-hint">
          默认按日期成组展示同一天 4 个国家的数据；只有筛选国家为美国时，表格才额外展示现汇买入价和卖出价。
        </div>

        <a-alert
          v-if="showingHistoryMock"
          type="info"
          show-icon
          class="status-alert"
          message="当前为历史记录展示效果预览"
          description="暂无真实历史数据时，下面使用 mock 数据展示按日期分组，以及美国附带现汇买入价和卖出价时的版式效果。"
        />

        <a-table
          :columns="historyColumns"
          :data-source="historyTableRows"
          :loading="historyLoading"
          row-key="key"
          size="middle"
          :pagination="{ pageSize: 12, showSizeChanger: false, showTotal: (t:number) => `共 ${t} 条` }"
          :scroll="{ x: historyScrollX }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'realtime_rate'">
              <div>{{ formatRate(record.realtime_rate) }}</div>
              <div v-if="record.realtime_delta !== null" class="delta-text" :class="record.realtime_delta >= 0 ? 'delta-up' : 'delta-down'">
                {{ record.realtime_delta >= 0 ? '+' : '' }}{{ record.realtime_delta.toFixed(2) }}
              </div>
            </template>
            <template v-if="column.key === 'suggested_rate'">
              <div>{{ formatRate(record.suggested_rate) }}</div>
              <div v-if="record.suggested_delta !== null" class="delta-text" :class="record.suggested_delta >= 0 ? 'delta-up' : 'delta-down'">
                {{ record.suggested_delta >= 0 ? '+' : '' }}{{ record.suggested_delta.toFixed(2) }}
              </div>
            </template>
            <template v-if="column.key === 'usd_cash_buy_rate'">
              {{ formatRate(record.usd_cash_buy_rate) }}
            </template>
            <template v-if="column.key === 'usd_cash_sell_rate'">
              {{ formatRate(record.usd_cash_sell_rate) }}
            </template>
          </template>
        </a-table>
      </a-card>
    </template>

    <a-result
      v-else
      status="403"
      title="无权查看汇率管理"
      sub-title="当前页面仅支持商务查看，财务和管理员维护。"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { supabase } from '../lib/supabase'
import { useCurrentUser } from '../composables/useCurrentUser'

type CountryCode = 'US' | 'DE' | 'UK' | 'CA'

interface CountryConfig {
  country_code: CountryCode
  country_name: string
  currency_code: string
}

interface DailyFormState {
  usdCashBuyRate: number | null
  usdCashSellRate: number | null
}

interface RateRow {
  country_code: CountryCode
  country_name: string
  currency_code: string
  realtime_rate: number | null
  suggested_rate: number | null
}

interface SnapshotRow {
  id: string
  rate_date: string
  usd_cash_buy_rate: number | null
  usd_cash_sell_rate: number | null
}

interface SnapshotItemRow {
  snapshot_id: string
  country_code: CountryCode
  country_name: string
  currency_code: string
  realtime_rate: number | null
  suggested_rate: number | null
}

interface HistoryRow {
  key: string
  rate_date: string
  country_code: CountryCode
  country_name: string
  currency_code: string
  realtime_rate: number | null
  suggested_rate: number | null
  realtime_delta: number | null
  suggested_delta: number | null
  usd_cash_buy_rate: number | null
  usd_cash_sell_rate: number | null
  date_row_span?: number
}

const COUNTRY_CONFIGS: CountryConfig[] = [
  { country_code: 'US', country_name: '美国', currency_code: 'USD' },
  { country_code: 'DE', country_name: '德国', currency_code: 'EUR' },
  { country_code: 'UK', country_name: '英国', currency_code: 'GBP' },
  { country_code: 'CA', country_name: '加拿大', currency_code: 'CAD' },
]

const { currentUser } = useCurrentUser()
const loadingCurrent = ref(false)
const saving = ref(false)
const historyLoading = ref(false)
const selectedDate = ref<Dayjs>(dayjs())
const historyDateRange = ref<[Dayjs, Dayjs]>([dayjs().subtract(29, 'day'), dayjs()])
const historyCountry = ref<CountryCode | undefined>(undefined)
const rateRows = ref<RateRow[]>(createEmptyRows())
const historyRows = ref<HistoryRow[]>([])
const previousSnapshotDate = ref('')

const dailyForm = reactive<DailyFormState>({
  usdCashBuyRate: null,
  usdCashSellRate: null,
})

const previousDaily = reactive<DailyFormState>({
  usdCashBuyRate: null,
  usdCashSellRate: null,
})

const previousRateMap = reactive<Partial<Record<CountryCode, { realtime_rate: number | null; suggested_rate: number | null }>>>({})

const recordState = reactive({
  mode: 'empty' as 'empty' | 'draft' | 'existing',
})

const canView = computed(() => ['商务', '财务', '管理员'].includes(currentUser.value.role))
const canEdit = computed(() => ['财务', '管理员'].includes(currentUser.value.role))

const historyMockRows: HistoryRow[] = [
  {
    key: 'mock-1-US',
    rate_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    country_code: 'US',
    country_name: '美国',
    currency_code: 'USD',
    realtime_rate: 7.2388,
    suggested_rate: 7.2599,
    realtime_delta: 0.01,
    suggested_delta: 0.01,
    usd_cash_buy_rate: 7.2098,
    usd_cash_sell_rate: 7.2789,
  },
  {
    key: 'mock-1-DE',
    rate_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    country_code: 'DE',
    country_name: '德国',
    currency_code: 'EUR',
    realtime_rate: 7.8921,
    suggested_rate: 7.918,
    realtime_delta: -0.03,
    suggested_delta: -0.02,
    usd_cash_buy_rate: null,
    usd_cash_sell_rate: null,
  },
  {
    key: 'mock-1-UK',
    rate_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    country_code: 'UK',
    country_name: '英国',
    currency_code: 'GBP',
    realtime_rate: 9.1543,
    suggested_rate: 9.1875,
    realtime_delta: 0.04,
    suggested_delta: 0.03,
    usd_cash_buy_rate: null,
    usd_cash_sell_rate: null,
  },
  {
    key: 'mock-1-CA',
    rate_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    country_code: 'CA',
    country_name: '加拿大',
    currency_code: 'CAD',
    realtime_rate: 5.3124,
    suggested_rate: 5.3368,
    realtime_delta: -0.01,
    suggested_delta: 0.02,
    usd_cash_buy_rate: null,
    usd_cash_sell_rate: null,
  },
  {
    key: 'mock-2-US',
    rate_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    country_code: 'US',
    country_name: '美国',
    currency_code: 'USD',
    realtime_rate: 7.2256,
    suggested_rate: 7.2525,
    realtime_delta: null,
    suggested_delta: null,
    usd_cash_buy_rate: 7.2034,
    usd_cash_sell_rate: 7.2712,
  },
  {
    key: 'mock-2-DE',
    rate_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    country_code: 'DE',
    country_name: '德国',
    currency_code: 'EUR',
    realtime_rate: 7.9186,
    suggested_rate: 7.9412,
    realtime_delta: null,
    suggested_delta: null,
    usd_cash_buy_rate: null,
    usd_cash_sell_rate: null,
  },
  {
    key: 'mock-2-UK',
    rate_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    country_code: 'UK',
    country_name: '英国',
    currency_code: 'GBP',
    realtime_rate: 9.1168,
    suggested_rate: 9.1601,
    realtime_delta: null,
    suggested_delta: null,
    usd_cash_buy_rate: null,
    usd_cash_sell_rate: null,
  },
  {
    key: 'mock-2-CA',
    rate_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    country_code: 'CA',
    country_name: '加拿大',
    currency_code: 'CAD',
    realtime_rate: 5.3208,
    suggested_rate: 5.3199,
    realtime_delta: null,
    suggested_delta: null,
    usd_cash_buy_rate: null,
    usd_cash_sell_rate: null,
  },
]

const historyColumns = computed(() => {
  const columns = [
    {
      title: '日期',
      dataIndex: 'rate_date',
      key: 'rate_date',
      width: 110,
      customCell: (record: HistoryRow) => ({ rowSpan: record.date_row_span ?? 1 }),
    },
    { title: '国家', dataIndex: 'country_name', key: 'country_name', width: 100 },
    { title: '币种', dataIndex: 'currency_code', key: 'currency_code', width: 90 },
    { title: '实时汇率', key: 'realtime_rate', width: 150 },
    { title: '建议接单汇率', key: 'suggested_rate', width: 150 },
  ]

  if (historyCountry.value === 'US') {
    columns.push(
      { title: '现汇买入价', key: 'usd_cash_buy_rate', width: 130 },
      { title: '现汇卖出价', key: 'usd_cash_sell_rate', width: 130 },
    )
  }

  return columns
})

const showingHistoryMock = computed(() => historyRows.value.length === 0)

const historyTableRows = computed(() => {
  const baseRows = historyRows.value.length ? historyRows.value : historyMockRows
  const filteredRows = historyCountry.value
    ? baseRows.filter(row => row.country_code === historyCountry.value)
    : baseRows

  return applyHistoryDateGrouping(filteredRows)
})

const historyScrollX = computed(() => (historyCountry.value === 'US' ? 980 : 760))

const statusMeta = computed(() => {
  if (recordState.mode === 'existing') {
    return {
      label: '已保存',
      className: 'green',
      alertType: 'success' as const,
      message: `已加载 ${selectedDate.value.format('YYYY-MM-DD')} 的记录`,
      description: '可以直接微调今日录入值，再重新保存。',
    }
  }
  if (recordState.mode === 'draft') {
    return {
      label: '待保存',
      className: 'orange',
      alertType: 'warning' as const,
      message: previousSnapshotDate.value ? `已找到 ${previousSnapshotDate.value} 的参考值` : '当天暂无记录',
      description: '今日建议价会默认沿用昨日值，仍可按需修改。',
    }
  }
  return {
    label: '待录入',
    className: 'red',
    alertType: 'info' as const,
    message: '当天暂无记录，也没有可参考的昨日数据',
    description: '请直接录入 4 个国家汇率和美元现汇牌价。',
  }
})

function createEmptyRows(): RateRow[] {
  return COUNTRY_CONFIGS.map(country => ({
    ...country,
    realtime_rate: null,
    suggested_rate: null,
  }))
}

function resetCurrentForm() {
  dailyForm.usdCashBuyRate = null
  dailyForm.usdCashSellRate = null
  rateRows.value = createEmptyRows()
}

function resetPreviousReference() {
  previousSnapshotDate.value = ''
  previousDaily.usdCashBuyRate = null
  previousDaily.usdCashSellRate = null
  for (const country of COUNTRY_CONFIGS) {
    previousRateMap[country.country_code] = undefined
  }
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function formatRate(value: number | null | undefined) {
  return value === null || value === undefined ? '-' : Number(value).toFixed(4)
}

function applyHistoryDateGrouping(rows: HistoryRow[]) {
  return rows.map((row, index, list) => {
    const previousDate = index > 0 ? list[index - 1].rate_date : null
    if (row.rate_date === previousDate) {
      return {
        ...row,
        date_row_span: 0,
      }
    }

    const rowSpan = list.slice(index).filter(item => item.rate_date === row.rate_date).length
    return {
      ...row,
      date_row_span: rowSpan,
    }
  })
}

function getCountryOrder(countryCode: CountryCode) {
  return COUNTRY_CONFIGS.findIndex(item => item.country_code === countryCode)
}

function setPreviousReference(snapshot: SnapshotRow | null, items: SnapshotItemRow[]) {
  resetPreviousReference()
  if (!snapshot) return

  previousSnapshotDate.value = snapshot.rate_date
  previousDaily.usdCashBuyRate = toNumber(snapshot.usd_cash_buy_rate)
  previousDaily.usdCashSellRate = toNumber(snapshot.usd_cash_sell_rate)

  for (const country of COUNTRY_CONFIGS) {
    const found = items.find(item => item.country_code === country.country_code)
    previousRateMap[country.country_code] = found
      ? {
          realtime_rate: toNumber(found.realtime_rate),
          suggested_rate: toNumber(found.suggested_rate),
        }
      : undefined
  }
}

function hydrateCurrentForm(snapshot: SnapshotRow | null, items: SnapshotItemRow[]) {
  if (!snapshot) {
    resetCurrentForm()
    rateRows.value = COUNTRY_CONFIGS.map(country => ({
      ...country,
      realtime_rate: null,
      suggested_rate: previousRateMap[country.country_code]?.suggested_rate ?? null,
    }))
    return
  }

  dailyForm.usdCashBuyRate = toNumber(snapshot.usd_cash_buy_rate)
  dailyForm.usdCashSellRate = toNumber(snapshot.usd_cash_sell_rate)
  rateRows.value = COUNTRY_CONFIGS.map(country => {
    const found = items.find(item => item.country_code === country.country_code)
    return {
      ...country,
      realtime_rate: toNumber(found?.realtime_rate),
      suggested_rate: toNumber(found?.suggested_rate),
    }
  })
}

async function fetchSnapshotByDate(dateStr: string) {
  const { data, error } = await supabase
    .from('exchange_rate_daily_snapshots')
    .select('*')
    .eq('rate_date', dateStr)
    .maybeSingle()
  if (error) throw error
  return data as SnapshotRow | null
}

async function fetchSnapshotItems(snapshotId: string) {
  const { data, error } = await supabase
    .from('exchange_rate_daily_items')
    .select('*')
    .eq('snapshot_id', snapshotId)
  if (error) throw error
  return (data || []) as SnapshotItemRow[]
}

async function fetchPreviousSnapshot(dateStr: string) {
  const { data, error } = await supabase
    .from('exchange_rate_daily_snapshots')
    .select('*')
    .lt('rate_date', dateStr)
    .order('rate_date', { ascending: false })
    .limit(1)
  if (error) throw error
  return ((data || [])[0] || null) as SnapshotRow | null
}

async function loadSelectedDate() {
  if (!canView.value) return
  loadingCurrent.value = true
  try {
    const dateStr = selectedDate.value.format('YYYY-MM-DD')
    const [currentSnapshot, previousSnapshot] = await Promise.all([
      fetchSnapshotByDate(dateStr),
      fetchPreviousSnapshot(dateStr),
    ])

    const [currentItems, previousItems] = await Promise.all([
      currentSnapshot ? fetchSnapshotItems(currentSnapshot.id) : Promise.resolve([] as SnapshotItemRow[]),
      previousSnapshot ? fetchSnapshotItems(previousSnapshot.id) : Promise.resolve([] as SnapshotItemRow[]),
    ])

    setPreviousReference(previousSnapshot, previousItems)
    hydrateCurrentForm(currentSnapshot, currentItems)
    recordState.mode = currentSnapshot ? 'existing' : previousSnapshot ? 'draft' : 'empty'
  } catch (error: any) {
    message.error(error.message || '加载汇率数据失败')
  } finally {
    loadingCurrent.value = false
  }
}

function validateBeforeSave() {
  if (dailyForm.usdCashBuyRate === null || dailyForm.usdCashBuyRate <= 0) {
    message.error('请填写美元现汇买入价')
    return false
  }
  if (dailyForm.usdCashSellRate === null || dailyForm.usdCashSellRate <= 0) {
    message.error('请填写美元现汇卖出价')
    return false
  }
  for (const row of rateRows.value) {
    if (row.realtime_rate === null || row.realtime_rate <= 0) {
      message.error(`请填写${row.country_name}的实时汇率`)
      return false
    }
    if (row.suggested_rate === null || row.suggested_rate <= 0) {
      message.error(`请填写${row.country_name}的建议接单汇率`)
      return false
    }
  }
  return true
}

function deriveCopiedFromDate() {
  if (!previousSnapshotDate.value) return null

  const usdCopied =
    dailyForm.usdCashBuyRate === previousDaily.usdCashBuyRate ||
    dailyForm.usdCashSellRate === previousDaily.usdCashSellRate

  const countryCopied = rateRows.value.some(row => {
    const previous = previousRateMap[row.country_code]
    return previous && (
      row.realtime_rate === previous.realtime_rate ||
      row.suggested_rate === previous.suggested_rate
    )
  })

  return usdCopied || countryCopied ? previousSnapshotDate.value : null
}

async function saveDailyRates() {
  if (!canEdit.value) return
  if (!validateBeforeSave()) return

  const now = new Date().toISOString()
  const rateDate = selectedDate.value.format('YYYY-MM-DD')
  saving.value = true
  try {
    const snapshotPayload = {
      rate_date: rateDate,
      usd_cash_buy_rate: dailyForm.usdCashBuyRate,
      usd_cash_sell_rate: dailyForm.usdCashSellRate,
      copied_from_date: deriveCopiedFromDate(),
      operator_name: currentUser.value.name,
      updated_at: now,
    }

    const { data: snapshot, error: snapshotError } = await supabase
      .from('exchange_rate_daily_snapshots')
      .upsert(snapshotPayload, { onConflict: 'rate_date' })
      .select('*')
      .single()
    if (snapshotError) throw snapshotError

    const itemPayloads = rateRows.value.map(row => ({
      snapshot_id: snapshot.id,
      country_code: row.country_code,
      country_name: row.country_name,
      currency_code: row.currency_code,
      realtime_rate: row.realtime_rate,
      suggested_rate: row.suggested_rate,
      updated_at: now,
    }))

    const { error: itemsError } = await supabase
      .from('exchange_rate_daily_items')
      .upsert(itemPayloads, { onConflict: 'snapshot_id,country_code' })
    if (itemsError) throw itemsError

    message.success('当日汇率已保存')
    await Promise.all([loadSelectedDate(), loadHistory()])
  } catch (error: any) {
    message.error(error.message || '保存汇率失败')
  } finally {
    saving.value = false
  }
}

function calcDelta(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null
  return current - previous
}

async function loadHistory() {
  if (!canView.value) return
  historyLoading.value = true
  try {
    const [startDate, endDate] = historyDateRange.value
    const { data: snapshots, error: snapshotError } = await supabase
      .from('exchange_rate_daily_snapshots')
      .select('*')
      .gte('rate_date', startDate.format('YYYY-MM-DD'))
      .lte('rate_date', endDate.format('YYYY-MM-DD'))
      .order('rate_date', { ascending: false })
    if (snapshotError) throw snapshotError

    const snapshotList = (snapshots || []) as SnapshotRow[]
    if (!snapshotList.length) {
      historyRows.value = []
      return
    }

    let itemsQuery = supabase
      .from('exchange_rate_daily_items')
      .select('*')
      .in('snapshot_id', snapshotList.map(item => item.id))
    if (historyCountry.value) {
      itemsQuery = itemsQuery.eq('country_code', historyCountry.value)
    }

    const { data: items, error: itemError } = await itemsQuery
    if (itemError) throw itemError

    const snapshotMap = new Map(snapshotList.map(item => [item.id, item]))
    const previousByCountry: Partial<Record<CountryCode, { realtime: number | null; suggested: number | null }>> = {}

    historyRows.value = ((items || []) as SnapshotItemRow[])
      .sort((a, b) => {
        const aDate = snapshotMap.get(a.snapshot_id)?.rate_date || ''
        const bDate = snapshotMap.get(b.snapshot_id)?.rate_date || ''
        if (aDate !== bDate) return aDate.localeCompare(bDate)
        return getCountryOrder(a.country_code) - getCountryOrder(b.country_code)
      })
      .map(item => {
        const snapshot = snapshotMap.get(item.snapshot_id)
        const previous = previousByCountry[item.country_code]
        const realtimeRate = toNumber(item.realtime_rate)
        const suggestedRate = toNumber(item.suggested_rate)
        const row: HistoryRow = {
          key: `${item.snapshot_id}-${item.country_code}`,
          rate_date: snapshot?.rate_date || '',
          country_code: item.country_code,
          country_name: item.country_name,
          currency_code: item.currency_code,
          realtime_rate: realtimeRate,
          suggested_rate: suggestedRate,
          realtime_delta: calcDelta(realtimeRate, previous?.realtime ?? null),
          suggested_delta: calcDelta(suggestedRate, previous?.suggested ?? null),
          usd_cash_buy_rate: toNumber(snapshot?.usd_cash_buy_rate),
          usd_cash_sell_rate: toNumber(snapshot?.usd_cash_sell_rate),
        }
        previousByCountry[item.country_code] = { realtime: realtimeRate, suggested: suggestedRate }
        return row
      })
      .sort((a, b) => {
        if (a.rate_date !== b.rate_date) return b.rate_date.localeCompare(a.rate_date)
        return getCountryOrder(a.country_code) - getCountryOrder(b.country_code)
      })
  } catch (error: any) {
    message.error(error.message || '加载历史汇率失败')
  } finally {
    historyLoading.value = false
  }
}

function handleDateChange() {
  loadSelectedDate()
}

onMounted(async () => {
  if (!canView.value) return
  await Promise.all([loadSelectedDate(), loadHistory()])
})
</script>

<style scoped>
.page-content {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1a1a2e;
}

.page-subtitle {
  margin-top: 6px;
  color: #6b7280;
  font-size: 13px;
}

.status-alert {
  margin-bottom: 16px;
}

.section-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.entry-card {
  max-width: 1080px;
  margin-right: auto;
}

.compact-panel {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.05), rgba(255, 255, 255, 0.96));
}

.compact-panel-head {
  margin-bottom: 10px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}

.section-desc {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.usd-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.usd-box {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
}

.mini-label {
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 12px;
}

.usd-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.small-input {
  width: 112px;
}

.reference-value {
  color: #6b7280;
  font-size: 11px;
  white-space: nowrap;
}

.rate-table-wrap {
  overflow-x: auto;
}

.rate-table {
  width: 100%;
  min-width: 680px;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.rate-table th,
.rate-table td {
  padding: 10px 10px;
  border-bottom: 1px solid #f0f0f0;
  text-align: left;
  vertical-align: middle;
  font-size: 13px;
}

.rate-table th {
  background: #f8fafc;
  color: #1a1a2e;
  font-weight: 600;
  white-space: nowrap;
}

.rate-table tbody tr:last-child td {
  border-bottom: none;
}

.country-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.country-name {
  font-weight: 600;
  color: #1a1a2e;
}

.input-with-reference {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.history-hint {
  margin-bottom: 12px;
  color: #6b7280;
  font-size: 12px;
}

.delta-text {
  margin-top: 2px;
  font-size: 12px;
}

.delta-up {
  color: #059669;
}

.delta-down {
  color: #dc2626;
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
  }

  .usd-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .page-content {
    padding: 16px;
  }

  .small-input {
    width: 100px;
  }
}
</style>
