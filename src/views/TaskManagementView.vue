<template>
  <div class="page-content">
    <h1 class="page-title">任务管理</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search v-model:value="searchText" placeholder="搜索子单号/ASIN/店铺" style="width:260px" @search="load" allow-clear />
        <a-select v-model:value="filterStatus" style="width:140px" @change="load" allow-clear placeholder="状态">
          <a-select-option value="">全部</a-select-option>
          <a-select-option v-for="s in subOrderStatuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterCountry" style="width:110px" @change="load" allow-clear placeholder="国家">
          <a-select-option value="">全部</a-select-option>
          <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-button type="primary" @click="load"><ReloadOutlined /> 刷新</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="subOrders"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="small"
        :scroll="{ x: 1400 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'refund_status'">
            <a-tag v-if="record.refund_status" :color="getRefundColor(record.refund_status)">{{ record.refund_status }}</a-tag>
            <span v-else>-</span>
          </template>
          <template v-if="column.key === 'action'">
            <a-select
              :value="record.status"
              size="small"
              style="width:110px"
              @change="(val: string) => updateStatus(record.id, val)"
            >
              <a-select-option v-for="s in subOrderStatuses" :key="s" :value="s">{{ s }}</a-select-option>
            </a-select>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const subOrders = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('')
const filterCountry = ref('')
const pagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })

const subOrderStatuses = ['待分配', '已分配', '进行中', '已下单', '已留评', '已完成', '已取消']
const countries = ['美国', '德国', '英国', '加拿大']

const columns = [
  { title: '子单号', dataIndex: 'sub_order_number', key: 'sub_order_number', width: 150 },
  { title: 'ASIN', dataIndex: 'asin', key: 'asin', width: 120 },
  { title: '店铺', dataIndex: 'store_name', key: 'store_name', width: 130 },
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '类型', dataIndex: 'order_type', key: 'order_type', width: 80 },
  { title: '单价', dataIndex: 'unit_price', key: 'unit_price', width: 80, customRender: ({ text }: any) => `¥${Number(text).toFixed(2)}` },
  { title: '业务员', dataIndex: 'staff_name', key: 'staff_name', width: 90 },
  { title: '买手', dataIndex: 'buyer_name', key: 'buyer_name', width: 90 },
  { title: '状态', key: 'status', width: 90 },
  { title: '退款状态', key: 'refund_status', width: 100 },
  { title: '排期日期', dataIndex: 'scheduled_date', key: 'scheduled_date', width: 100 },
  { title: '操作', key: 'action', width: 130, fixed: 'right' },
]

function getStatusColor(status: string) {
  const map: Record<string, string> = { '待分配': 'default', '已分配': 'cyan', '进行中': 'blue', '已下单': 'orange', '已留评': 'purple', '已完成': 'green', '已取消': 'red' }
  return map[status] || 'default'
}

function getRefundColor(status: string) {
  const map: Record<string, string> = { '无需退款': 'default', '待退款': 'orange', '已退款': 'green' }
  return map[status] || 'default'
}

async function load() {
  loading.value = true
  try {
    let query = supabase.from('sub_orders').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (searchText.value) {
      query = query.or(`sub_order_number.ilike.%${searchText.value}%,asin.ilike.%${searchText.value}%,store_name.ilike.%${searchText.value}%`)
    }
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    if (filterCountry.value) query = query.eq('country', filterCountry.value)

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

async function updateStatus(id: string, status: string) {
  const { error } = await supabase.from('sub_orders').update({ status }).eq('id', id)
  if (error) { message.error('更新失败'); return }
  message.success('状态已更新')
  load()
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  load()
}

onMounted(load)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
</style>
