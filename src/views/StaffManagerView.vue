<template>
  <div class="page-content">
    <h1 class="page-title">业务员管理</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search v-model:value="searchText" placeholder="搜索姓名/编号" style="width:220px" allow-clear @search="load" />
        <a-select v-model:value="filterStatus" style="width:120px" @change="load" allow-clear placeholder="状态筛选">
          <a-select-option value="在职">在职</a-select-option>
          <a-select-option value="休假">休假</a-select-option>
          <a-select-option value="离职">离职</a-select-option>
        </a-select>
        <a-button @click="goToUserMgmt" style="color:#2563eb;border-color:#bfdbfe;background:#eff6ff">
          <SafetyOutlined /> 在用户管理中添加
        </a-button>
      </div>

      <a-table :columns="columns" :data-source="staffList" :loading="loading" row-key="id" size="middle" :pagination="{ pageSize: 20 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'staff_number'">
            <span class="staff-no">{{ record.staff_number || '—' }}</span>
          </template>
          <template v-if="column.key === 'name'">
            <div class="staff-name-cell">
              <div class="avatar" :style="{ background: record.avatar_color || '#2563eb' }">{{ record.name.charAt(0) }}</div>
              <div>
                <div class="name">{{ record.name }}</div>
                <div class="sub">{{ record.role || '业务员' }}</div>
              </div>
            </div>
          </template>
          <template v-if="column.key === 'department'">
            <span>{{ record.department || '业务部' }}</span>
          </template>
          <template v-if="column.key === 'countries'">
            <div class="countries-cell">
              <span
                v-for="c in (record.countries || ['US'])"
                :key="c"
                class="country-badge"
                :style="{ borderColor: countryMap[c]?.color, color: countryMap[c]?.color }"
              >
                {{ countryMap[c]?.flag }} {{ countryMap[c]?.label }}
              </span>
            </div>
          </template>
          <template v-if="column.key === 'monthly_perf'">
            <div class="perf-cell">
              <div class="perf-cell-top">
                <div class="buyer-info">
                  <span class="buyer-count">{{ buyerCountMap[record.id] || 0 }}</span>
                  <span class="buyer-label">名买手</span>
                </div>
                <span class="perf-set-btn" @click.stop="openTargetModal(record)">
                  <SettingOutlined /> 设目标
                  <span v-if="getThisMonthTarget(record.id)" class="target-badge">{{ getThisMonthTarget(record.id) }}单</span>
                </span>
              </div>
            </div>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColor[record.status] || 'default'">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <span class="perf-set-btn-sm" @click.stop="openTargetModal(record)">
                <SettingOutlined /> 设目标
              </span>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer
      v-model:open="detailOpen"
      :title="detailRecord?.name ? `业务员详情 — ${detailRecord.name}` : '业务员详情'"
      width="480px"
      :footer="null"
    >
      <template v-if="detailRecord">
        <div class="detail-header">
          <div class="detail-avatar" :style="{ background: detailRecord.avatar_color || '#2563eb' }">
            {{ detailRecord.name?.charAt(0) }}
          </div>
          <div>
            <div class="detail-name">{{ detailRecord.name }}</div>
            <div class="detail-sub">{{ detailRecord.staff_number }} · {{ detailRecord.role || '业务员' }}</div>
          </div>
          <div style="flex:1" />
          <a-tag :color="statusColor[detailRecord.status] || 'default'">{{ detailRecord.status }}</a-tag>
        </div>
        <a-descriptions :column="2" size="small" style="margin-top:20px">
          <a-descriptions-item label="部门">{{ detailRecord.department || '业务部' }}</a-descriptions-item>
          <a-descriptions-item label="入职日期">{{ detailRecord.join_date || '—' }}</a-descriptions-item>
          <a-descriptions-item label="操作国家" :span="2">
            <div class="countries-cell">
              <span
                v-for="c in (detailRecord.countries || ['US'])"
                :key="c"
                class="country-badge"
                :style="{ borderColor: countryMap[c]?.color, color: countryMap[c]?.color }"
              >
                {{ countryMap[c]?.flag }} {{ countryMap[c]?.label }}
              </span>
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="名下买手数">
            <span style="font-size:16px;font-weight:700;color:#1d4ed8">{{ buyerCountMap[detailRecord.id] || 0 }}</span> 人
          </a-descriptions-item>
          <a-descriptions-item label="本月目标">
            <span v-if="getThisMonthTarget(detailRecord.id)" style="font-size:16px;font-weight:700;color:#059669">{{ getThisMonthTarget(detailRecord.id) }}</span>
            <span v-else style="color:#94a3b8">未设置</span>
            <span v-if="getThisMonthTarget(detailRecord.id)" style="color:#64748b;margin-left:4px">单</span>
          </a-descriptions-item>
          <a-descriptions-item label="备注" :span="2">{{ detailRecord.notes || '—' }}</a-descriptions-item>
        </a-descriptions>
      </template>
    </a-drawer>

    <a-modal
      v-model:open="targetModalOpen"
      :title="`设置月度目标 — ${targetStaff?.name || ''}`"
      @ok="handleSaveTarget"
      :confirm-loading="targetSubmitting"
      ok-text="保存"
      cancel-text="取消"
      width="580px"
    >
      <div style="margin-top:8px">
        <a-form layout="vertical">
          <a-row :gutter="12">
            <a-col :span="12">
              <a-form-item label="选择月份">
                <a-month-picker v-model:value="targetMonthVal" style="width:100%" placeholder="选择年月" @change="onTargetMonthChange" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="月度目标单量">
                <a-input-number
                  v-model:value="targetForm.monthly_target"
                  :min="0"
                  :max="99999"
                  style="width:100%"
                  placeholder="输入当月目标单量"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="12">
            <a-col :span="12">
              <a-form-item label="日目标单量">
                <a-input-number
                  v-model:value="targetForm.daily_target"
                  :min="0"
                  :max="9999"
                  style="width:100%"
                  placeholder="手动填写日均目标"
                  addon-after="单/天"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="备注">
                <a-input v-model:value="targetForm.notes" placeholder="如：旺季冲刺目标" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>

        <div v-if="targetForm.monthly_target > 0" class="workday-plan">
          <div class="wp-header">
            <span class="wp-title">每日任务分配预览</span>
            <span class="wp-hint">系统按工作日（周一至周五）自动均摊</span>
          </div>
          <div class="wp-stats-bar">
            <div class="wp-stat-block">
              <span class="wp-stat-val">{{ workdayCount }}</span>
              <span class="wp-stat-lbl">工作日</span>
            </div>
            <div class="wp-stat-divider"></div>
            <div class="wp-stat-block">
              <span class="wp-stat-val">{{ dailyWorkdayTarget }}</span>
              <span class="wp-stat-lbl">单/天</span>
            </div>
            <div class="wp-stat-divider"></div>
            <div class="wp-stat-block">
              <span class="wp-stat-val">{{ weeklyTarget }}</span>
              <span class="wp-stat-lbl">单/周（5天）</span>
            </div>
            <div class="wp-stat-divider"></div>
            <div class="wp-stat-block">
              <span class="wp-stat-val">{{ targetForm.monthly_target }}</span>
              <span class="wp-stat-lbl">月总目标</span>
            </div>
          </div>
          <div class="wp-calendar">
            <div class="wp-week-row wp-week-header">
              <div v-for="d in ['周一','周二','周三','周四','周五','周六','周日']" :key="d" class="wp-day-header">{{ d }}</div>
            </div>
            <div v-for="(week, wi) in calendarWeeks" :key="wi" class="wp-week-row">
              <div
                v-for="(day, di) in week"
                :key="di"
                class="wp-day-cell"
                :class="{
                  'wp-day-empty': !day,
                  'wp-day-workday': day && isWorkday(day),
                  'wp-day-weekend': day && !isWorkday(day),
                }"
              >
                <template v-if="day">
                  <span class="wp-day-num">{{ day.date() }}</span>
                  <span v-if="isWorkday(day)" class="wp-day-task">{{ dailyWorkdayTarget }} 单</span>
                  <span v-else class="wp-day-rest">休</span>
                </template>
              </div>
            </div>
          </div>
          <div class="wp-legend">
            <span class="wpl-workday"></span><span>工作日（自动分配）</span>
            <span class="wpl-weekend"></span><span>休息日（不分配）</span>
          </div>
        </div>

        <div v-if="historicalTargets.length" class="target-history">
          <div class="th-title">历史目标记录</div>
          <div v-for="t in historicalTargets" :key="t.id" class="th-row">
            <span class="th-month">{{ t.year_month }}</span>
            <span class="th-target">月 {{ t.monthly_target }} 单</span>
            <span class="th-daily" v-if="t.daily_target > 0">日 {{ t.daily_target }} 单</span>
            <span class="th-daily" v-else>日参考 {{ historicalDailyTarget(t) }} 单</span>
            <a-button type="link" size="small" danger style="padding:0;height:auto" @click="deleteTarget(t)">删除</a-button>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { SettingOutlined, SafetyOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'

const router = useRouter()

const loading = ref(false)
const staffList = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('')
const detailOpen = ref(false)
const detailRecord = ref<any>(null)

const targetModalOpen = ref(false)
const targetSubmitting = ref(false)
const targetStaff = ref<any>(null)
const targetMonthVal = ref<any>(dayjs())
const historicalTargets = ref<any[]>([])
const monthlyTargetsMap = ref<Record<string, number>>({})
const buyerCountMap = ref<Record<string, number>>({})
const targetForm = reactive({ monthly_target: 0, daily_target: 0, notes: '', year_month: dayjs().format('YYYY-MM') })

const statusColor: Record<string, string> = { '在职': 'green', '休假': 'orange', '离职': 'red' }

const columns = [
  { title: '编号', key: 'staff_number', dataIndex: 'staff_number', width: 100 },
  { title: '姓名', key: 'name', width: 150 },
  { title: '部门', key: 'department', dataIndex: 'department', width: 80 },
  { title: '操作国家', key: 'countries', width: 160 },
  { title: '名下买手 / 当月目标', key: 'monthly_perf', width: 200 },
  { title: '状态', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 130 },
]

const countryMap: Record<string, { label: string; flag: string; color: string }> = {
  US: { label: '美国', flag: '🇺🇸', color: '#1d4ed8' },
  DE: { label: '德国', flag: '🇩🇪', color: '#dc2626' },
  UK: { label: '英国', flag: '🇬🇧', color: '#059669' },
  CA: { label: '加拿大', flag: '🇨🇦', color: '#d97706' },
}

function isWorkday(d: any): boolean {
  const dow = d.day()
  return dow !== 0 && dow !== 6
}

const calendarWeeks = computed(() => {
  if (!targetForm.year_month) return []
  const first = dayjs(targetForm.year_month).startOf('month')
  const last = dayjs(targetForm.year_month).endOf('month')
  const weeks: (any | null)[][] = []
  let week: (any | null)[] = []
  const startDow = first.day() === 0 ? 6 : first.day() - 1
  for (let i = 0; i < startDow; i++) week.push(null)
  for (let d = first; !d.isAfter(last); d = d.add(1, 'day')) {
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
})

const workdayCount = computed(() => {
  if (!targetForm.year_month) return 0
  const first = dayjs(targetForm.year_month).startOf('month')
  const last = dayjs(targetForm.year_month).endOf('month')
  let count = 0
  for (let d = first; !d.isAfter(last); d = d.add(1, 'day')) {
    if (isWorkday(d)) count++
  }
  return count
})

const dailyWorkdayTarget = computed(() => {
  if (!targetForm.monthly_target || !workdayCount.value) return 0
  return Math.ceil(targetForm.monthly_target / workdayCount.value)
})

const weeklyTarget = computed(() => dailyWorkdayTarget.value * 5)

function historicalDailyTarget(t: any): number {
  if (!t.year_month || !t.monthly_target) return 0
  const first = dayjs(t.year_month).startOf('month')
  const last = dayjs(t.year_month).endOf('month')
  let count = 0
  for (let d = first; !d.isAfter(last); d = d.add(1, 'day')) {
    const dow = d.day()
    if (dow !== 0 && dow !== 6) count++
  }
  return count > 0 ? Math.ceil(t.monthly_target / count) : 0
}

function getThisMonthTarget(staffId: string): number {
  return monthlyTargetsMap.value[staffId] || 0
}

function onTargetMonthChange(_: any, dateStr: string) {
  targetForm.year_month = dateStr
  loadTargetForMonth()
}

async function load() {
  loading.value = true
  try {
    let query = supabase.from('staff').select('*').order('created_at', { ascending: false })
    if (searchText.value) {
      query = query.or(`name.ilike.%${searchText.value}%,staff_number.ilike.%${searchText.value}%`)
    }
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    const { data, error } = await query
    if (error) throw error
    staffList.value = data || []

    await Promise.all([loadAllTargets(), loadBuyerCounts()])
  } finally {
    loading.value = false
  }
}

async function loadAllTargets() {
  const thisMonth = dayjs().format('YYYY-MM')
  const staffIds = staffList.value.map(s => s.id)
  if (!staffIds.length) return

  const { data } = await supabase
    .from('staff_monthly_targets')
    .select('staff_id, monthly_target')
    .in('staff_id', staffIds)
    .eq('year_month', thisMonth)

  const map: Record<string, number> = {}
  for (const t of data || []) {
    map[t.staff_id] = t.monthly_target
  }
  monthlyTargetsMap.value = map
}

async function loadBuyerCounts() {
  const staffIds = staffList.value.map(s => s.id)
  if (!staffIds.length) return

  const { data } = await supabase
    .from('erp_buyers')
    .select('staff_id')
    .in('staff_id', staffIds)
    .neq('status', '黑名单')

  const map: Record<string, number> = {}
  for (const b of data || []) {
    map[b.staff_id] = (map[b.staff_id] || 0) + 1
  }
  buyerCountMap.value = map
}

function openDetail(record: any) {
  detailRecord.value = record
  detailOpen.value = true
}


async function openTargetModal(record: any) {
  targetStaff.value = record
  targetMonthVal.value = dayjs()
  targetForm.year_month = dayjs().format('YYYY-MM')
  targetForm.monthly_target = 0
  targetForm.notes = ''
  targetModalOpen.value = true
  await Promise.all([loadTargetForMonth(), loadHistoricalTargets()])
}

async function loadTargetForMonth() {
  if (!targetStaff.value) return
  const { data } = await supabase
    .from('staff_monthly_targets')
    .select('*')
    .eq('staff_id', targetStaff.value.id)
    .eq('year_month', targetForm.year_month)
    .maybeSingle()

  if (data) {
    targetForm.monthly_target = data.monthly_target
    targetForm.daily_target = data.daily_target || 0
    targetForm.notes = data.notes || ''
  } else {
    targetForm.monthly_target = 0
    targetForm.daily_target = 0
    targetForm.notes = ''
  }
}

async function loadHistoricalTargets() {
  if (!targetStaff.value) return
  const { data } = await supabase
    .from('staff_monthly_targets')
    .select('*')
    .eq('staff_id', targetStaff.value.id)
    .order('year_month', { ascending: false })
    .limit(12)
  historicalTargets.value = data || []
}

async function handleSaveTarget() {
  if (!targetStaff.value || !targetForm.year_month) return
  targetSubmitting.value = true
  try {
    const { error } = await supabase
      .from('staff_monthly_targets')
      .upsert({
        staff_id: targetStaff.value.id,
        year_month: targetForm.year_month,
        monthly_target: targetForm.monthly_target,
        daily_target: targetForm.daily_target || 0,
        notes: targetForm.notes,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'staff_id,year_month' })
    if (error) throw error
    message.success('目标已保存')
    targetModalOpen.value = false
    await loadAllTargets()
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    targetSubmitting.value = false
  }
}

async function deleteTarget(t: any) {
  const { error } = await supabase.from('staff_monthly_targets').delete().eq('id', t.id)
  if (error) { message.error('删除失败'); return }
  message.success('已删除')
  await loadHistoricalTargets()
  await loadAllTargets()
}

function goToUserMgmt() {
  router.push('/user-management')
}

onMounted(load)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }

.staff-name-cell { display: flex; align-items: center; gap: 10px; }
.avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.name { font-weight: 600; font-size: 13px; color: #374151; }
.sub { font-size: 11px; color: #9ca3af; }

.staff-no { font-family: monospace; font-weight: 700; font-size: 13px; color: #1d4ed8; background: #eff6ff; padding: 2px 8px; border-radius: 5px; }

.perf-cell { padding: 4px 0; }
.perf-cell-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.buyer-info { display: flex; align-items: baseline; gap: 3px; }
.buyer-count { font-size: 20px; font-weight: 700; color: #1d4ed8; }
.buyer-label { font-size: 12px; color: #6b7280; }
.perf-set-btn { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #2563eb; cursor: pointer; padding: 3px 8px; border-radius: 5px; border: 1px solid #bfdbfe; transition: background 0.15s; white-space: nowrap; }
.perf-set-btn:hover { background: #eff6ff; }
.target-badge { font-size: 11px; font-weight: 700; color: #059669; background: #f0fdf4; padding: 1px 5px; border-radius: 8px; }

.countries-cell { display: flex; flex-wrap: wrap; gap: 4px; }
.country-badge { display: inline-flex; align-items: center; gap: 2px; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 20px; border: 1.5px solid; background: #fff; white-space: nowrap; }
.country-tag { font-size: 13px; }
.color-picker-row { display: flex; align-items: center; gap: 10px; }
.color-input { width: 40px; height: 32px; border: 1px solid #d9d9d9; border-radius: 6px; cursor: pointer; padding: 2px; }
.avatar-preview { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 14px; }

.workday-plan { margin: 4px 0 16px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
.wp-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border-bottom: 1px solid #e5e7eb; }
.wp-title { font-size: 13px; font-weight: 700; color: #1d4ed8; }
.wp-hint { font-size: 11px; color: #6b7280; }
.wp-stats-bar { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr; align-items: center; padding: 12px 16px; background: #fff; border-bottom: 1px solid #f0f0f0; }
.wp-stat-block { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.wp-stat-val { font-size: 18px; font-weight: 800; color: #1d4ed8; line-height: 1.1; }
.wp-stat-lbl { font-size: 11px; color: #9ca3af; }
.wp-stat-divider { width: 1px; height: 30px; background: #e5e7eb; margin: 0 4px; }
.wp-calendar { padding: 10px 12px; background: #fafbfc; }
.wp-week-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 4px; }
.wp-week-header { margin-bottom: 6px; }
.wp-day-header { text-align: center; font-size: 10px; font-weight: 700; color: #9ca3af; padding: 2px 0; }
.wp-day-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 48px; border-radius: 7px; font-size: 11px; transition: background 0.15s; }
.wp-day-empty { background: transparent; border: 1px solid transparent; }
.wp-day-workday { background: #eff6ff; border: 1px solid #bfdbfe; }
.wp-day-weekend { background: #f9fafb; border: 1px solid #f0f0f0; }
.wp-day-num { font-size: 11px; color: #374151; font-weight: 600; line-height: 1.2; }
.wp-day-weekend .wp-day-num { color: #d1d5db; }
.wp-day-task { font-size: 10px; font-weight: 700; color: #1d4ed8; background: #dbeafe; padding: 1px 5px; border-radius: 4px; margin-top: 3px; white-space: nowrap; }
.wp-day-rest { font-size: 10px; color: #d1d5db; margin-top: 3px; }
.wp-legend { display: flex; align-items: center; gap: 16px; padding: 8px 14px; background: #fff; border-top: 1px solid #f0f0f0; font-size: 11px; color: #6b7280; }
.wpl-workday { display: inline-block; width: 12px; height: 12px; border-radius: 3px; background: #eff6ff; border: 1px solid #bfdbfe; margin-right: 4px; }
.wpl-weekend { display: inline-block; width: 12px; height: 12px; border-radius: 3px; background: #f9fafb; border: 1px solid #e5e7eb; margin-right: 4px; }

.target-history { margin-top: 16px; border-top: 1px solid #f0f0f0; padding-top: 12px; }
.th-title { font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 8px; }
.th-row { display: flex; align-items: center; gap: 12px; padding: 6px 10px; border-radius: 6px; background: #f8fafc; margin-bottom: 4px; font-size: 13px; }
.th-month { font-weight: 600; color: #374151; min-width: 70px; }
.th-target { color: #2563eb; font-weight: 700; min-width: 60px; }
.th-daily { color: #9ca3af; font-size: 12px; flex: 1; }

.detail-header { display: flex; align-items: center; gap: 14px; padding: 16px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; }
.detail-avatar { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 18px; flex-shrink: 0; }
.detail-name { font-size: 16px; font-weight: 700; color: #1e293b; }
.detail-sub { font-size: 12px; color: #94a3b8; margin-top: 3px; }

.perf-set-btn-sm {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 12px; color: #2563eb; cursor: pointer;
  padding: 2px 7px; border-radius: 5px;
  border: 1px solid #bfdbfe; background: #eff6ff;
  transition: background 0.15s; white-space: nowrap;
}
.perf-set-btn-sm:hover { background: #dbeafe; }
</style>
