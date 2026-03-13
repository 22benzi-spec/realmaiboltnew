<template>
  <div class="page-content">
    <h1 class="page-title">业务员数据分析</h1>

    <div class="filter-bar">
      <a-month-picker v-model:value="monthVal" style="width:160px" placeholder="选择月份" @change="onMonthChange" />
      <a-select v-model:value="selectedStaffId" style="width:180px" allow-clear placeholder="筛选业务员" @change="loadData">
        <a-select-option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
      </a-select>
      <a-button @click="loadData" :loading="loading">刷新数据</a-button>
    </div>

    <div class="summary-cards">
      <div class="s-card">
        <div class="s-label">总完成单量</div>
        <div class="s-val">{{ summaryData.totalCompleted }}</div>
        <div class="s-sub">
          <span class="s-tag s-tag-review">留评 {{ summaryData.totalReviewType }}</span>
          <span class="s-tag s-tag-free">免评 {{ summaryData.totalFreeType }}</span>
          <span class="s-tag s-tag-fb">FB {{ summaryData.totalFeedbackType }}</span>
        </div>
      </div>
      <div class="s-card">
        <div class="s-label">业绩完成率</div>
        <div class="s-val" :class="rateClass(summaryData.avgCompletionRate)">{{ summaryData.avgCompletionRate }}%</div>
        <div class="s-sub-small">目标 {{ summaryData.totalTarget }} 单</div>
      </div>
      <div class="s-card">
        <div class="s-label">平均留评率</div>
        <div class="s-val" :class="rateClass(summaryData.avgReviewRate)">{{ summaryData.avgReviewRate }}%</div>
        <div class="s-sub-small">已留评 {{ summaryData.totalReviewed }} 单</div>
      </div>
      <div class="s-card">
        <div class="s-label">掉评数</div>
        <div class="s-val warn">{{ summaryData.totalDropped }}</div>
      </div>
      <div class="s-card">
        <div class="s-label">售后问题单</div>
        <div class="s-val warn">{{ summaryData.totalAfterSale }}</div>
      </div>
      <div class="s-card">
        <div class="s-label">被骗本金</div>
        <div class="s-val danger">&yen;{{ summaryData.totalStolenPrincipal.toFixed(2) }}</div>
      </div>
    </div>

    <div class="card-panel">
      <div class="panel-header">
        <span class="panel-title">{{ displayMonth }} 业务员明细</span>
        <div class="panel-actions">
          <a-radio-group v-model:value="viewMode" button-style="solid" size="small">
            <a-radio-button value="table">表格</a-radio-button>
            <a-radio-button value="compare">对比</a-radio-button>
          </a-radio-group>
        </div>
      </div>

      <a-table
        v-if="viewMode === 'table'"
        :columns="columns"
        :data-source="filteredRows"
        :loading="loading"
        row-key="staff_id"
        size="middle"
        :pagination="false"
        :scroll="{ x: 1400 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="name-cell">
              <div class="av" :style="{ background: record.avatar_color || '#2563eb' }">{{ record.name.charAt(0) }}</div>
              <span>{{ record.name }}</span>
            </div>
          </template>
          <template v-if="column.key === 'buyer_new'">
            <span v-if="record.buyer_new > 0" class="num-new-main">+{{ record.buyer_new }}</span>
            <span v-else class="tc-empty">0</span>
          </template>
          <template v-if="column.key === 'completed'">
            <div class="completed-cell">
              <div class="completed-top">
                <div class="completed-counts">
                  <span class="cc-num cc-main">{{ record.completed }}</span>
                  <span class="cc-sep">/</span>
                  <span class="cc-target">{{ record.target || '--' }}</span>
                </div>
                <span v-if="record.target > 0" class="completion-rate-badge" :class="completionRateClass(record.completed, record.target)">
                  {{ Math.min(100, Math.round(record.completed / record.target * 100)) }}%
                </span>
              </div>
              <a-progress
                v-if="record.target > 0"
                :percent="Math.min(100, Math.round(record.completed / record.target * 100))"
                :stroke-color="record.completed >= record.target ? '#059669' : record.completed / record.target >= 0.6 ? '#2563eb' : '#d97706'"
                size="small"
                :show-info="false"
                style="margin: 4px 0 2px"
              />
              <div class="type-breakdown">
                <span class="tb-item tb-review" title="留评（文字/图片/视频）">
                  <span class="tb-dot tb-dot-review"></span>留评 {{ record.review_type_count }}
                </span>
                <span class="tb-item tb-free" title="免评">
                  <span class="tb-dot tb-dot-free"></span>免评 {{ record.free_type_count }}
                </span>
                <span class="tb-item tb-fb" title="Feedback">
                  <span class="tb-dot tb-dot-fb"></span>FB {{ record.feedback_type_count }}
                </span>
              </div>
            </div>
          </template>
          <template v-if="column.key === 'review_rate'">
            <span :class="rateClass(record.review_rate)">{{ record.review_rate }}%</span>
          </template>
          <template v-if="column.key === 'drop_count'">
            <span :class="{ 'num-warn': record.drop_count > 0 }">{{ record.drop_count }}</span>
            <span class="rate-sub" v-if="record.reviewed > 0">({{ record.drop_rate }}%)</span>
          </template>
          <template v-if="column.key === 'after_sale_count'">
            <span :class="{ 'num-warn': record.after_sale_count > 0 }">{{ record.after_sale_count }}</span>
            <span class="rate-sub" v-if="record.completed > 0">({{ record.after_sale_rate }}%)</span>
          </template>
          <template v-if="column.key === 'stolen_principal'">
            <span :class="{ 'num-danger': record.stolen_principal > 0 }">
              &yen;{{ record.stolen_principal.toFixed(2) }}
            </span>
          </template>
        </template>
      </a-table>

      <div v-if="viewMode === 'compare'" class="compare-view">
        <div class="compare-section">
          <div class="cs-title">留评率排名</div>
          <div class="bar-list">
            <div v-for="r in sortedByReviewRate" :key="r.staff_id" class="bar-row">
              <span class="bar-name">{{ r.name }}</span>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: r.review_rate + '%', background: r.review_rate >= 80 ? '#059669' : r.review_rate >= 50 ? '#d97706' : '#dc2626' }"></div>
              </div>
              <span class="bar-val">{{ r.review_rate }}%</span>
            </div>
          </div>
        </div>
        <div class="compare-section">
          <div class="cs-title">售后率排名 (越低越好)</div>
          <div class="bar-list">
            <div v-for="r in sortedByAfterSaleRate" :key="r.staff_id" class="bar-row">
              <span class="bar-name">{{ r.name }}</span>
              <div class="bar-track">
                <div class="bar-fill bar-warn" :style="{ width: Math.min(100, r.after_sale_rate * 2) + '%' }"></div>
              </div>
              <span class="bar-val">{{ r.after_sale_rate }}%</span>
            </div>
          </div>
        </div>
        <div class="compare-section">
          <div class="cs-title">被骗本金排名</div>
          <div class="bar-list">
            <div v-for="r in sortedByStolenPrincipal" :key="r.staff_id" class="bar-row">
              <span class="bar-name">{{ r.name }}</span>
              <div class="bar-track">
                <div class="bar-fill bar-danger" :style="{ width: stolenPct(r) + '%' }"></div>
              </div>
              <span class="bar-val">&yen;{{ r.stolen_principal.toFixed(0) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card-panel" style="margin-top:16px">
      <div class="panel-header">
        <span class="panel-title">月度趋势（近6个月）</span>
      </div>
      <div class="trend-table-wrap">
        <table class="trend-table">
          <thead>
            <tr>
              <th>业务员</th>
              <th v-for="m in trendMonths" :key="m">{{ m }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in trendData" :key="s.staff_id">
              <td class="trend-name">{{ s.name }}</td>
              <td v-for="m in trendMonths" :key="m">
                <div class="trend-cell" v-if="s.months[m]">
                  <span class="tc-main">{{ s.months[m].completed }}</span>
                  <span class="tc-rate" :class="rateClass(s.months[m].review_rate)">{{ s.months[m].review_rate }}%</span>
                </div>
                <span v-else class="tc-empty">--</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'

interface StaffRow {
  staff_id: string
  name: string
  avatar_color: string
  buyer_new: number
  target: number
  completed: number
  reviewed: number
  review_rate: number
  review_type_count: number
  free_type_count: number
  feedback_type_count: number
  drop_count: number
  drop_rate: number
  after_sale_count: number
  after_sale_rate: number
  stolen_principal: number
}

const loading = ref(false)
const staffList = ref<any[]>([])
const monthVal = ref<any>(dayjs())
const selectedMonth = ref(dayjs().format('YYYY-MM'))
const selectedStaffId = ref<string | undefined>(undefined)
const rows = ref<StaffRow[]>([])
const viewMode = ref<'table' | 'compare'>('table')
const trendData = ref<any[]>([])
const trendMonths = ref<string[]>([])

const displayMonth = computed(() => selectedMonth.value)

const filteredRows = computed(() => {
  if (!selectedStaffId.value) return rows.value
  return rows.value.filter(r => r.staff_id === selectedStaffId.value)
})

const summaryData = computed(() => {
  const list = filteredRows.value
  const totalCompleted = list.reduce((s, r) => s + r.completed, 0)
  const totalReviewed = list.reduce((s, r) => s + r.reviewed, 0)
  const totalTarget = list.reduce((s, r) => s + r.target, 0)
  const totalReviewType = list.reduce((s, r) => s + r.review_type_count, 0)
  const totalFreeType = list.reduce((s, r) => s + r.free_type_count, 0)
  const totalFeedbackType = list.reduce((s, r) => s + r.feedback_type_count, 0)
  const avgReviewRate = totalCompleted > 0 ? Math.round(totalReviewed / totalCompleted * 100) : 0
  const avgCompletionRate = totalTarget > 0 ? Math.min(100, Math.round(totalCompleted / totalTarget * 100)) : 0
  const totalDropped = list.reduce((s, r) => s + r.drop_count, 0)
  const totalAfterSale = list.reduce((s, r) => s + r.after_sale_count, 0)
  const totalStolenPrincipal = list.reduce((s, r) => s + r.stolen_principal, 0)
  return { totalCompleted, totalReviewed, totalTarget, totalReviewType, totalFreeType, totalFeedbackType, avgReviewRate, avgCompletionRate, totalDropped, totalAfterSale, totalStolenPrincipal }
})

const sortedByReviewRate = computed(() =>
  [...filteredRows.value].sort((a, b) => b.review_rate - a.review_rate)
)
const sortedByAfterSaleRate = computed(() =>
  [...filteredRows.value].sort((a, b) => b.after_sale_rate - a.after_sale_rate)
)
const sortedByStolenPrincipal = computed(() =>
  [...filteredRows.value].sort((a, b) => b.stolen_principal - a.stolen_principal)
)

function stolenPct(r: StaffRow): number {
  const max = Math.max(...filteredRows.value.map(x => x.stolen_principal), 1)
  return Math.round(r.stolen_principal / max * 100)
}

function rateClass(rate: number): string {
  if (rate >= 80) return 'rate-good'
  if (rate >= 50) return 'rate-mid'
  return 'rate-low'
}

function completionRateClass(completed: number, target: number): string {
  if (!target) return ''
  const rate = completed / target
  if (rate >= 1) return 'cr-full'
  if (rate >= 0.6) return 'cr-mid'
  return 'cr-low'
}

const columns = [
  { title: '业务员', key: 'name', width: 140, fixed: 'left' as const },
  { title: '本月新增买手', key: 'buyer_new', width: 110 },
  { title: '完成/目标（类型明细）', key: 'completed', width: 260 },
  { title: '留评率', key: 'review_rate', width: 90 },
  { title: '掉评数(率)', key: 'drop_count', width: 110 },
  { title: '售后数(率)', key: 'after_sale_count', width: 110 },
  { title: '被骗本金', key: 'stolen_principal', width: 120 },
]

function onMonthChange(_: any, dateStr: string) {
  selectedMonth.value = dateStr
  loadData()
}

async function loadStaffList() {
  const { data } = await supabase
    .from('staff')
    .select('id, name, avatar_color, status')
    .in('status', ['在职', '休假'])
    .order('created_at')
  staffList.value = data || []
}

async function loadData() {
  loading.value = true
  try {
    const month = selectedMonth.value
    const monthStart = dayjs(month).startOf('month').toISOString()
    const monthEnd = dayjs(month).endOf('month').toISOString()

    const staffIds = staffList.value.map(s => s.id)
    if (!staffIds.length) { rows.value = []; return }

    const [subOrdersRes, buyersNewRes, reviewsRes, afterSaleRes, targetsRes] = await Promise.all([
      supabase
        .from('sub_orders')
        .select('staff_id, status, review_submitted_at, order_types')
        .in('staff_id', staffIds)
        .gte('updated_at', monthStart)
        .lte('updated_at', monthEnd),
      supabase
        .from('erp_buyers')
        .select('staff_id')
        .in('staff_id', staffIds)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd),
      supabase
        .from('buyer_reviews')
        .select('buyer_id, review_status')
        .eq('review_status', '掉评')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd),
      supabase
        .from('after_sale_issues')
        .select('staff_id, principal_stolen, principal_amount')
        .in('staff_id', staffIds)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd),
      supabase
        .from('staff_monthly_targets')
        .select('staff_id, monthly_target')
        .in('staff_id', staffIds)
        .eq('year_month', month),
    ])

    const subOrders = subOrdersRes.data || []
    const newBuyers = buyersNewRes.data || []
    const droppedReviews = reviewsRes.data || []
    const afterSaleIssues = afterSaleRes.data || []
    const targets = targetsRes.data || []

    const buyerStaffMap = await loadBuyerStaffMap()

    const targetMap = new Map(targets.map(t => [t.staff_id, t.monthly_target]))

    const result: StaffRow[] = staffList.value.map(staff => {
      const sid = staff.id
      const staffSubOrders = subOrders.filter(o => o.staff_id === sid)
      const completedOrders = staffSubOrders.filter(o => ['已完成', '已留评'].includes(o.status))
      const completed = completedOrders.length
      const reviewed = staffSubOrders.filter(o => o.status === '已留评' || o.review_submitted_at).length
      const buyerNew = newBuyers.filter(b => b.staff_id === sid).length

      const REVIEW_TYPES = new Set(['文字评', '图片评', '视频评'])
      const review_type_count = completedOrders.filter(o => (o.order_types || []).some((t: string) => REVIEW_TYPES.has(t))).length
      const free_type_count = completedOrders.filter(o => (o.order_types || []).includes('免评')).length
      const feedback_type_count = completedOrders.filter(o => (o.order_types || []).includes('Feedback')).length

      const staffBuyerIdList = buyerStaffMap.get(sid) || []
      const staffBuyerIdSet = new Set(staffBuyerIdList)

      const dropCount = droppedReviews.filter(r => staffBuyerIdSet.has(r.buyer_id)).length

      const staffAfterSale = afterSaleIssues.filter(a => a.staff_id === sid)
      const afterSaleCount = staffAfterSale.length
      const stolenPrincipal = staffAfterSale
        .filter(a => a.principal_stolen)
        .reduce((sum, a) => sum + (Number(a.principal_amount) || 0), 0)

      const reviewRate = completed > 0 ? Math.round(reviewed / completed * 100) : 0
      const dropRate = reviewed > 0 ? Math.round(dropCount / reviewed * 100) : 0
      const afterSaleRate = completed > 0 ? Math.round(afterSaleCount / completed * 100) : 0

      return {
        staff_id: sid,
        name: staff.name,
        avatar_color: staff.avatar_color,
        buyer_new: buyerNew,
        target: targetMap.get(sid) || 0,
        completed,
        reviewed,
        review_rate: reviewRate,
        review_type_count,
        free_type_count,
        feedback_type_count,
        drop_count: dropCount,
        drop_rate: dropRate,
        after_sale_count: afterSaleCount,
        after_sale_rate: afterSaleRate,
        stolen_principal: stolenPrincipal,
      }
    })

    rows.value = result
  } finally {
    loading.value = false
  }
}

async function loadBuyerStaffMap(): Promise<Map<string, string[]>> {
  const { data } = await supabase
    .from('erp_buyers')
    .select('id, staff_id')
    .not('staff_id', 'is', null)

  const map = new Map<string, string[]>()
  for (const b of data || []) {
    if (!map.has(b.staff_id)) map.set(b.staff_id, [])
    map.get(b.staff_id)!.push(b.id)
  }
  return map
}

async function loadTrend() {
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    months.push(dayjs().subtract(i, 'month').format('YYYY-MM'))
  }
  trendMonths.value = months

  const staffIds = staffList.value.map(s => s.id)
  if (!staffIds.length) return

  const startDate = dayjs(months[0]).startOf('month').toISOString()
  const endDate = dayjs(months[months.length - 1]).endOf('month').toISOString()

  const { data: subOrders } = await supabase
    .from('sub_orders')
    .select('staff_id, status, review_submitted_at, updated_at')
    .in('staff_id', staffIds)
    .gte('updated_at', startDate)
    .lte('updated_at', endDate)

  const result = staffList.value.map(staff => {
    const monthsMap: Record<string, { completed: number; review_rate: number }> = {}
    for (const m of months) {
      const mStart = dayjs(m).startOf('month')
      const mEnd = dayjs(m).endOf('month')
      const mOrders = (subOrders || []).filter(o =>
        o.staff_id === staff.id &&
        dayjs(o.updated_at).isAfter(mStart) &&
        dayjs(o.updated_at).isBefore(mEnd)
      )
      const completed = mOrders.filter(o => ['已完成', '已留评'].includes(o.status)).length
      const reviewed = mOrders.filter(o => o.status === '已留评' || o.review_submitted_at).length
      const reviewRate = completed > 0 ? Math.round(reviewed / completed * 100) : 0
      monthsMap[m] = { completed, review_rate: reviewRate }
    }
    return { staff_id: staff.id, name: staff.name, months: monthsMap }
  })

  trendData.value = result
}

onMounted(async () => {
  await loadStaffList()
  await Promise.all([loadData(), loadTrend()])
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }

.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }

.summary-cards { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; }
.s-card { background: #fff; border-radius: 10px; padding: 16px; border: 1px solid #f0f0f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.s-label { font-size: 12px; color: #9ca3af; margin-bottom: 6px; }
.s-val { font-size: 22px; font-weight: 700; color: #374151; }
.s-val.warn { color: #d97706; }
.s-val.danger { color: #dc2626; }
.s-sub { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
.s-sub-small { font-size: 11px; color: #9ca3af; margin-top: 4px; }
.s-tag { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 8px; }
.s-tag-review { background: #eff6ff; color: #2563eb; }
.s-tag-free { background: #f3f4f6; color: #6b7280; }
.s-tag-fb { background: #fffbeb; color: #d97706; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.panel-title { font-size: 15px; font-weight: 700; color: #374151; }

.name-cell { display: flex; align-items: center; gap: 8px; }
.av { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12px; flex-shrink: 0; }

.num-main { font-weight: 700; font-size: 14px; color: #374151; }
.num-new { font-size: 11px; color: #059669; font-weight: 600; background: #f0fdf4; padding: 1px 5px; border-radius: 8px; margin-left: 6px; }
.num-new-main { font-size: 15px; font-weight: 700; color: #059669; }
.num-target { font-size: 12px; color: #9ca3af; margin-left: 2px; }
.num-warn { color: #d97706; font-weight: 700; }
.num-danger { color: #dc2626; font-weight: 700; }
.rate-sub { font-size: 11px; color: #9ca3af; margin-left: 4px; }

.rate-good { color: #059669; font-weight: 700; }
.rate-mid { color: #d97706; font-weight: 700; }
.rate-low { color: #dc2626; font-weight: 700; }

.target-cell { display: flex; align-items: center; }

.completed-cell { min-width: 200px; }
.completed-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
.completed-counts { display: flex; align-items: baseline; gap: 2px; }
.cc-num.cc-main { font-size: 16px; font-weight: 700; color: #374151; }
.cc-sep { font-size: 12px; color: #d1d5db; margin: 0 2px; }
.cc-target { font-size: 12px; color: #9ca3af; }
.completion-rate-badge { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 10px; }
.cr-full { background: #f0fdf4; color: #059669; }
.cr-mid { background: #eff6ff; color: #2563eb; }
.cr-low { background: #fffbeb; color: #d97706; }
.type-breakdown { display: flex; gap: 8px; margin-top: 2px; }
.tb-item { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #6b7280; }
.tb-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.tb-dot-review { background: #2563eb; }
.tb-dot-free { background: #9ca3af; }
.tb-dot-fb { background: #d97706; }

.compare-view { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.compare-section { }
.cs-title { font-size: 13px; font-weight: 700; color: #6b7280; margin-bottom: 10px; }
.bar-list { display: flex; flex-direction: column; gap: 6px; }
.bar-row { display: flex; align-items: center; gap: 8px; }
.bar-name { width: 60px; font-size: 12px; font-weight: 600; color: #374151; text-align: right; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-track { flex: 1; height: 18px; background: #f3f4f6; border-radius: 9px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 9px; transition: width 0.4s ease; min-width: 2px; }
.bar-fill.bar-warn { background: #f59e0b; }
.bar-fill.bar-danger { background: #ef4444; }
.bar-val { width: 60px; font-size: 12px; font-weight: 600; color: #6b7280; text-align: right; flex-shrink: 0; }

.trend-table-wrap { overflow-x: auto; }
.trend-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.trend-table th { padding: 8px 12px; text-align: center; font-weight: 600; color: #6b7280; border-bottom: 2px solid #e5e7eb; background: #fafbfc; white-space: nowrap; }
.trend-table td { padding: 8px 12px; text-align: center; border-bottom: 1px solid #f0f0f0; }
.trend-name { font-weight: 600; color: #374151; text-align: left !important; white-space: nowrap; }
.trend-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.tc-main { font-weight: 700; font-size: 14px; color: #374151; }
.tc-rate { font-size: 11px; font-weight: 600; }
.tc-empty { color: #d1d5db; font-size: 12px; }

@media (max-width: 1200px) {
  .summary-cards { grid-template-columns: repeat(3, 1fr); }
  .compare-view { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .summary-cards { grid-template-columns: repeat(2, 1fr); }
}
</style>
