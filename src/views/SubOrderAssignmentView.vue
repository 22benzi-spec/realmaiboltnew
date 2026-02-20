<template>
  <div class="page-content">
    <h1 class="page-title">分配管理</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-select v-model:value="filterStatus" style="width:140px" @change="load" allow-clear placeholder="状态筛选">
          <a-select-option value="待分配">待分配</a-select-option>
          <a-select-option value="已分配">已分配</a-select-option>
        </a-select>
        <a-button type="primary" :disabled="!selectedKeys.length" @click="batchAssignOpen = true">
          <UserAddOutlined /> 批量分配业务员 ({{ selectedKeys.length }})
        </a-button>
        <a-button @click="load"><ReloadOutlined /> 刷新</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="subOrders"
        :loading="loading"
        :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectionChange }"
        :pagination="pagination"
        row-key="id"
        size="small"
        :scroll="{ x: 1200 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'staff'">
            <span v-if="record.staff_name">{{ record.staff_name }}</span>
            <span v-else class="text-gray">未分配</span>
          </template>
          <template v-if="column.key === 'action'">
            <a-button type="link" size="small" @click="openAssign(record)">分配</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal v-model:open="batchAssignOpen" title="批量分配业务员" @ok="handleBatchAssign" :confirm-loading="assigning">
      <a-form layout="vertical">
        <a-form-item label="选择业务员">
          <a-select v-model:value="selectedStaffId" placeholder="请选择业务员" style="width:100%">
            <a-select-option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
      <p style="color:#6b7280; font-size:13px">已选择 {{ selectedKeys.length }} 条子单</p>
    </a-modal>

    <a-modal v-model:open="singleAssignOpen" :title="`分配子单 - ${currentRecord?.sub_order_number}`" @ok="handleSingleAssign" :confirm-loading="assigning">
      <a-form layout="vertical">
        <a-form-item label="选择业务员">
          <a-select v-model:value="selectedStaffId" placeholder="请选择业务员" style="width:100%">
            <a-select-option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { UserAddOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const subOrders = ref<any[]>([])
const staffList = ref<any[]>([])
const filterStatus = ref('待分配')
const selectedKeys = ref<string[]>([])
const batchAssignOpen = ref(false)
const singleAssignOpen = ref(false)
const selectedStaffId = ref<string>('')
const currentRecord = ref<any>(null)
const assigning = ref(false)
const pagination = ref({ current: 1, pageSize: 20, total: 0 })

const columns = [
  { title: '子单号', dataIndex: 'sub_order_number', key: 'sub_order_number', width: 150 },
  { title: 'ASIN', dataIndex: 'asin', key: 'asin', width: 120 },
  { title: '店铺', dataIndex: 'store_name', key: 'store_name' },
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '类型', dataIndex: 'order_type', key: 'order_type', width: 80 },
  { title: '单价', dataIndex: 'unit_price', key: 'unit_price', width: 80, customRender: ({ text }: any) => `¥${Number(text).toFixed(2)}` },
  { title: '业务员', key: 'staff', width: 100 },
  { title: '状态', key: 'status', width: 90 },
  { title: '排期', dataIndex: 'scheduled_date', key: 'scheduled_date', width: 100 },
  { title: '操作', key: 'action', width: 80, fixed: 'right' },
]

function getStatusColor(s: string) {
  const map: Record<string, string> = { '待分配': 'default', '已分配': 'cyan', '进行中': 'blue', '已完成': 'green' }
  return map[s] || 'default'
}

function onSelectionChange(keys: any[]) {
  selectedKeys.value = keys
}

async function load() {
  loading.value = true
  try {
    let query = supabase.from('sub_orders').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)
    const { data, count, error } = await query
    if (error) throw error
    subOrders.value = data || []
    pagination.value.total = count || 0
  } catch (e: any) {
    message.error('加载失败：' + e.message)
  } finally {
    loading.value = false
  }
}

async function loadStaff() {
  const { data } = await supabase.from('staff').select('id, name').eq('status', '在职')
  staffList.value = data || []
}

function openAssign(record: any) {
  currentRecord.value = record
  selectedStaffId.value = record.staff_id || ''
  singleAssignOpen.value = true
}

async function handleBatchAssign() {
  if (!selectedStaffId.value) { message.warning('请选择业务员'); return }
  assigning.value = true
  try {
    const staff = staffList.value.find(s => s.id === selectedStaffId.value)
    const { error } = await supabase.from('sub_orders').update({
      staff_id: selectedStaffId.value,
      staff_name: staff?.name || '',
      status: '已分配',
    }).in('id', selectedKeys.value)
    if (error) throw error
    message.success(`成功分配 ${selectedKeys.value.length} 条子单`)
    batchAssignOpen.value = false
    selectedKeys.value = []
    load()
  } catch (e: any) {
    message.error('分配失败：' + e.message)
  } finally {
    assigning.value = false
  }
}

async function handleSingleAssign() {
  if (!selectedStaffId.value || !currentRecord.value) return
  assigning.value = true
  try {
    const staff = staffList.value.find(s => s.id === selectedStaffId.value)
    const { error } = await supabase.from('sub_orders').update({
      staff_id: selectedStaffId.value,
      staff_name: staff?.name || '',
      status: '已分配',
    }).eq('id', currentRecord.value.id)
    if (error) throw error
    message.success('分配成功')
    singleAssignOpen.value = false
    load()
  } catch (e: any) {
    message.error('分配失败：' + e.message)
  } finally {
    assigning.value = false
  }
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  load()
}

onMounted(() => { load(); loadStaff() })
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.text-gray { color: #9ca3af; font-size: 12px; }
</style>
