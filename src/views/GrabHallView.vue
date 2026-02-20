<template>
  <div class="page-content">
    <h1 class="page-title">抢单大厅</h1>

    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="hall" tab="抢单大厅">
        <div class="card-panel">
          <div class="toolbar">
            <a-select v-model:value="grabStaffId" style="width:160px" placeholder="以哪个业务员抢单">
              <a-select-option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
            </a-select>
            <a-button @click="loadHall"><ReloadOutlined /> 刷新</a-button>
            <a-badge :count="hallOrders.length" :overflow-count="999">
              <span style="color:#6b7280;font-size:13px">当前可抢单数</span>
            </a-badge>
          </div>

          <a-table
            :columns="hallColumns"
            :data-source="hallOrders"
            :loading="loading"
            :row-selection="{ selectedRowKeys: selectedKeys, onChange: (keys: any) => selectedKeys = keys }"
            row-key="id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'action'">
                <a-button type="primary" size="small" @click="grabOne(record)" :loading="grabbingId === record.id">
                  <ThunderboltOutlined /> 抢单
                </a-button>
              </template>
            </template>
          </a-table>

          <div v-if="selectedKeys.length" style="margin-top:12px; display:flex; gap:8px">
            <a-button type="primary" @click="batchGrab" :loading="batchGrabbing">
              批量抢单 ({{ selectedKeys.length }})
            </a-button>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="log" tab="抢单记录">
        <div class="card-panel">
          <a-table
            :columns="logColumns"
            :data-source="logs"
            :loading="logLoading"
            row-key="id"
            size="small"
            :pagination="{ pageSize: 20 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'action'">
                <a-tag :color="record.action === 'grab' ? 'green' : 'orange'">
                  {{ record.action === 'grab' ? '抢单' : '释放' }}
                </a-tag>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const activeTab = ref('hall')
const loading = ref(false)
const logLoading = ref(false)
const hallOrders = ref<any[]>([])
const logs = ref<any[]>([])
const staffList = ref<any[]>([])
const grabStaffId = ref('')
const selectedKeys = ref<string[]>([])
const grabbingId = ref('')
const batchGrabbing = ref(false)

const hallColumns = [
  { title: '子单号', dataIndex: 'sub_order_number', key: 'sub_order_number', width: 150 },
  { title: 'ASIN', dataIndex: 'asin', key: 'asin', width: 120 },
  { title: '店铺', dataIndex: 'store_name', key: 'store_name' },
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '类型', dataIndex: 'order_type', key: 'order_type', width: 80 },
  { title: '单价', dataIndex: 'unit_price', key: 'unit_price', width: 80, customRender: ({ text }: any) => `¥${Number(text).toFixed(2)}` },
  { title: '来源业务员', dataIndex: 'released_by_staff_name', key: 'released_by_staff_name', width: 110 },
  { title: '释放原因', dataIndex: 'release_reason', key: 'release_reason' },
  { title: '操作', key: 'action', width: 90, fixed: 'right' },
]

const logColumns = [
  { title: '子单号', dataIndex: 'sub_order_number', key: 'sub_order_number', width: 150 },
  { title: '操作', key: 'action', width: 80 },
  { title: '来源业务员', dataIndex: 'from_staff_name', key: 'from_staff_name', width: 110 },
  { title: '目标业务员', dataIndex: 'to_staff_name', key: 'to_staff_name', width: 110 },
  { title: '原因', dataIndex: 'reason', key: 'reason' },
  { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 130, customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '' },
]

async function loadHall() {
  loading.value = true
  try {
    const { data, error } = await supabase.from('sub_orders').select('*').eq('released_to_hall', true).eq('status', '待分配').order('released_at', { ascending: false })
    if (error) throw error
    hallOrders.value = data || []
  } finally {
    loading.value = false
  }
}

async function loadLogs() {
  logLoading.value = true
  try {
    const { data } = await supabase.from('grab_hall_logs').select('*').order('created_at', { ascending: false }).limit(100)
    logs.value = data || []
  } finally {
    logLoading.value = false
  }
}

async function loadStaff() {
  const { data } = await supabase.from('staff').select('id, name').eq('status', '在职')
  staffList.value = data || []
}

async function grabOne(record: any) {
  if (!grabStaffId.value) { message.warning('请先选择业务员'); return }
  grabbingId.value = record.id
  try {
    const staff = staffList.value.find(s => s.id === grabStaffId.value)
    const { error } = await supabase.from('sub_orders').update({
      staff_id: grabStaffId.value,
      staff_name: staff?.name,
      released_to_hall: false,
      status: '已分配',
    }).eq('id', record.id)
    if (error) throw error

    await supabase.from('grab_hall_logs').insert([{
      sub_order_id: record.id,
      sub_order_number: record.sub_order_number,
      action: 'grab',
      from_staff_id: record.released_by_staff_id,
      from_staff_name: record.released_by_staff_name,
      to_staff_id: grabStaffId.value,
      to_staff_name: staff?.name,
    }])

    message.success('抢单成功')
    loadHall()
  } catch (e: any) {
    message.error('抢单失败：' + e.message)
  } finally {
    grabbingId.value = ''
  }
}

async function batchGrab() {
  if (!grabStaffId.value) { message.warning('请先选择业务员'); return }
  batchGrabbing.value = true
  try {
    const staff = staffList.value.find(s => s.id === grabStaffId.value)
    const { error } = await supabase.from('sub_orders').update({
      staff_id: grabStaffId.value,
      staff_name: staff?.name,
      released_to_hall: false,
      status: '已分配',
    }).in('id', selectedKeys.value)
    if (error) throw error
    message.success(`成功抢取 ${selectedKeys.value.length} 条`)
    selectedKeys.value = []
    loadHall()
  } catch (e: any) {
    message.error('批量抢单失败')
  } finally {
    batchGrabbing.value = false
  }
}

onMounted(() => {
  loadStaff()
  loadHall()
  loadLogs()
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
</style>
