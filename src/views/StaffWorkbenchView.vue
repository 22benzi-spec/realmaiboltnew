<template>
  <div class="page-content">
    <h1 class="page-title">业务员工作台</h1>

    <div class="workbench-layout">
      <div class="staff-sidebar">
        <div class="staff-search">
          <a-input-search v-model:value="staffSearch" placeholder="搜索业务员" allow-clear />
        </div>
        <div class="staff-list">
          <div
            v-for="s in filteredStaff"
            :key="s.id"
            :class="['staff-item', selectedStaffId === s.id ? 'active' : '']"
            @click="selectStaff(s.id)"
          >
            <div class="staff-avatar" :style="{ background: s.avatar_color || '#2563eb' }">
              {{ s.name.charAt(0) }}
            </div>
            <div class="staff-info">
              <div class="staff-name">{{ s.name }}</div>
              <div class="staff-role">{{ s.role || '业务员' }}</div>
            </div>
            <a-badge :count="s.pending_count" :overflow-count="99" />
          </div>
        </div>
      </div>

      <div class="workbench-main">
        <template v-if="selectedStaffId">
          <div class="workbench-stats">
            <div v-for="stat in workbenchStats" :key="stat.label" class="stat-mini">
              <div class="stat-mini-value">{{ stat.value }}</div>
              <div class="stat-mini-label">{{ stat.label }}</div>
            </div>
          </div>

          <div class="card-panel" style="margin-top:16px">
            <div class="toolbar">
              <a-select v-model:value="taskFilter" style="width:140px" @change="loadTasks">
                <a-select-option value="">全部任务</a-select-option>
                <a-select-option v-for="s in subOrderStatuses" :key="s" :value="s">{{ s }}</a-select-option>
              </a-select>
              <a-button @click="loadTasks"><ReloadOutlined /> 刷新</a-button>
            </div>

            <a-table
              :columns="taskColumns"
              :data-source="tasks"
              :loading="tasksLoading"
              row-key="id"
              size="small"
              :pagination="{ pageSize: 15 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
                </template>
                <template v-if="column.key === 'action'">
                  <a-select
                    :value="record.status"
                    size="small"
                    style="width:110px"
                    @change="(val: string) => updateTaskStatus(record.id, val)"
                  >
                    <a-select-option v-for="s in subOrderStatuses" :key="s" :value="s">{{ s }}</a-select-option>
                  </a-select>
                </template>
              </template>
            </a-table>
          </div>
        </template>
        <div v-else class="empty-state">
          <TeamOutlined style="font-size:48px; color:#d1d5db" />
          <p>请从左侧选择业务员</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, TeamOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

const staffSearch = ref('')
const staffList = ref<any[]>([])
const selectedStaffId = ref('')
const tasks = ref<any[]>([])
const tasksLoading = ref(false)
const taskFilter = ref('')

const subOrderStatuses = ['待分配', '已分配', '进行中', '已下单', '已留评', '已完成', '已取消']

const filteredStaff = computed(() =>
  staffList.value.filter(s => !staffSearch.value || s.name.includes(staffSearch.value))
)

const workbenchStats = computed(() => {
  const total = tasks.value.length
  const inProgress = tasks.value.filter(t => ['已分配', '进行中', '已下单', '已留评'].includes(t.status)).length
  const completed = tasks.value.filter(t => t.status === '已完成').length
  const urgent = tasks.value.filter(t => {
    if (!t.scheduled_date) return false
    const diff = new Date(t.scheduled_date).getTime() - Date.now()
    return diff > 0 && diff < 24 * 60 * 60 * 1000
  }).length
  return [
    { label: '全部任务', value: total },
    { label: '进行中', value: inProgress },
    { label: '已完成', value: completed },
    { label: '今日到期', value: urgent },
  ]
})

const taskColumns = [
  { title: '子单号', dataIndex: 'sub_order_number', key: 'sub_order_number', width: 150 },
  { title: 'ASIN', dataIndex: 'asin', key: 'asin', width: 120 },
  { title: '店铺', dataIndex: 'store_name', key: 'store_name' },
  { title: '类型', dataIndex: 'order_type', key: 'order_type', width: 80 },
  { title: '买手', dataIndex: 'buyer_name', key: 'buyer_name', width: 100 },
  { title: '排期', dataIndex: 'scheduled_date', key: 'scheduled_date', width: 100 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 130, fixed: 'right' },
]

function getStatusColor(s: string) {
  const map: Record<string, string> = { '待分配': 'default', '已分配': 'cyan', '进行中': 'blue', '已下单': 'orange', '已留评': 'purple', '已完成': 'green', '已取消': 'red' }
  return map[s] || 'default'
}

async function loadStaff() {
  const { data } = await supabase.from('staff').select('id, name, role, avatar_color, status').in('status', ['在职', '休假']).order('name')
  if (data) {
    const ids = data.map(s => s.id)
    const { data: counts } = await supabase.from('sub_orders').select('staff_id').in('staff_id', ids).in('status', ['已分配', '进行中', '已下单', '已留评'])
    const countMap: Record<string, number> = {}
    counts?.forEach(c => { countMap[c.staff_id] = (countMap[c.staff_id] || 0) + 1 })
    staffList.value = data.map(s => ({ ...s, pending_count: countMap[s.id] || 0 }))
  }
}

async function selectStaff(id: string) {
  selectedStaffId.value = id
  await loadTasks()
}

async function loadTasks() {
  if (!selectedStaffId.value) return
  tasksLoading.value = true
  try {
    let query = supabase.from('sub_orders').select('*').eq('staff_id', selectedStaffId.value).order('scheduled_date', { ascending: true })
    if (taskFilter.value) query = query.eq('status', taskFilter.value)
    const { data, error } = await query
    if (error) throw error
    tasks.value = data || []
  } finally {
    tasksLoading.value = false
  }
}

async function updateTaskStatus(id: string, status: string) {
  const { error } = await supabase.from('sub_orders').update({ status }).eq('id', id)
  if (error) { message.error('更新失败'); return }
  message.success('状态已更新')
  loadTasks()
}

onMounted(loadStaff)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.workbench-layout { display: flex; gap: 16px; height: calc(100vh - 140px); }
.staff-sidebar { width: 220px; flex-shrink: 0; background: #fff; border-radius: 12px; border: 1px solid #f0f0f0; overflow: hidden; display: flex; flex-direction: column; }
.staff-search { padding: 12px; border-bottom: 1px solid #f0f0f0; }
.staff-list { flex: 1; overflow-y: auto; padding: 8px; }
.staff-item { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.15s; margin-bottom: 4px; }
.staff-item:hover { background: #f5f7fa; }
.staff-item.active { background: #eff6ff; }
.staff-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.staff-name { font-size: 13px; font-weight: 600; color: #374151; }
.staff-role { font-size: 11px; color: #9ca3af; }
.workbench-main { flex: 1; overflow-y: auto; }
.workbench-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.stat-mini { background: #fff; border-radius: 10px; padding: 16px; text-align: center; border: 1px solid #f0f0f0; }
.stat-mini-value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
.stat-mini-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #9ca3af; gap: 12px; font-size: 14px; background: #fff; border-radius: 12px; }
</style>
