<template>
  <div class="page-content">
    <h1 class="page-title">互转管理</h1>

    <div class="stats-row">
      <div class="stat-card stat-pending">
        <div class="stat-card-num">{{ stats.pending }}</div>
        <div class="stat-card-label">待接受</div>
      </div>
      <div class="stat-card stat-accepted">
        <div class="stat-card-num">{{ stats.accepted }}</div>
        <div class="stat-card-label">已接受</div>
      </div>
      <div class="stat-card stat-rejected">
        <div class="stat-card-num">{{ stats.rejected }}</div>
        <div class="stat-card-label">已拒绝</div>
      </div>
      <div class="stat-card stat-cancelled">
        <div class="stat-card-num">{{ stats.cancelled }}</div>
        <div class="stat-card-label">已取消</div>
      </div>
    </div>

    <div class="card-panel">
      <div class="toolbar">
        <a-select v-model:value="filterStatus" style="width:130px" @change="load" allow-clear placeholder="状态">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option value="待接受">待接受</a-select-option>
          <a-select-option value="已接受">已接受</a-select-option>
          <a-select-option value="已拒绝">已拒绝</a-select-option>
          <a-select-option value="已取消">已取消</a-select-option>
        </a-select>
        <a-select v-model:value="filterFromStaff" style="width:140px" @change="load" allow-clear placeholder="发起人">
          <a-select-option value="">全部发起人</a-select-option>
          <a-select-option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterToStaff" style="width:140px" @change="load" allow-clear placeholder="接收人">
          <a-select-option value="">全部接收人</a-select-option>
          <a-select-option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
        </a-select>
        <a-button @click="load"><ReloadOutlined /> 刷新</a-button>
        <span class="total-hint">共 {{ pagination.total }} 条</span>
      </div>

      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: 1100 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sub_order_number'">
            <span class="sub-no">{{ record.sub_order_number }}</span>
          </template>
          <template v-if="column.key === 'transfer_path'">
            <div class="transfer-path">
              <span class="staff-from">{{ record.from_staff_name }}</span>
              <ArrowRightOutlined class="arrow-icon" />
              <span class="staff-to">{{ record.to_staff_name }}</span>
            </div>
          </template>
          <template v-if="column.key === 'reason'">
            <span v-if="record.reason" class="reason-text">{{ record.reason }}</span>
            <span v-else class="text-gray">—</span>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'reject_reason'">
            <span v-if="record.reject_reason" class="reject-reason-text">{{ record.reject_reason }}</span>
            <span v-else class="text-gray">—</span>
          </template>
          <template v-if="column.key === 'created_at'">
            <span class="time-text">{{ fmtTime(record.created_at) }}</span>
          </template>
          <template v-if="column.key === 'responded_at'">
            <span v-if="record.responded_at" class="time-text">{{ fmtTime(record.responded_at) }}</span>
            <span v-else class="text-gray">—</span>
          </template>
          <template v-if="column.key === 'action'">
            <template v-if="record.status === '待接受'">
              <a-space>
                <a-button type="primary" size="small" :loading="record._forcing" @click="forceAccept(record)" style="background:#059669;border-color:#059669">强制接受</a-button>
                <a-button size="small" danger ghost @click="openForceReject(record)">强制拒绝</a-button>
              </a-space>
            </template>
            <span v-else class="text-gray">—</span>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 强制拒绝弹窗 -->
    <a-modal
      v-model:open="forceRejectOpen"
      title="强制拒绝互转请求"
      @ok="submitForceReject"
      :confirm-loading="forceRejectSaving"
      ok-text="确认拒绝"
      ok-type="danger"
    >
      <a-form layout="vertical">
        <a-form-item label="拒绝原因（可选）">
          <a-textarea v-model:value="forceRejectReason" :rows="3" placeholder="管理员填写拒绝原因" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, ArrowRightOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const records = ref<any[]>([])
const staffList = ref<any[]>([])
const filterStatus = ref('待接受')
const filterFromStaff = ref('')
const filterToStaff = ref('')
const pagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] })

const forceRejectOpen = ref(false)
const forceRejectSaving = ref(false)
const forceRejectReason = ref('')
const forceRejectTarget = ref<any>(null)

const stats = computed(() => ({
  pending: records.value.filter(r => r.status === '待接受').length,
  accepted: records.value.filter(r => r.status === '已接受').length,
  rejected: records.value.filter(r => r.status === '已拒绝').length,
  cancelled: records.value.filter(r => r.status === '已取消').length,
}))

const columns = [
  { title: '子订单号', key: 'sub_order_number', width: 170 },
  { title: '互转路径', key: 'transfer_path', width: 200 },
  { title: '原因', key: 'reason', width: 150 },
  { title: '状态', key: 'status', width: 90 },
  { title: '拒绝原因', key: 'reject_reason', width: 140 },
  { title: '发起时间', key: 'created_at', width: 140 },
  { title: '响应时间', key: 'responded_at', width: 140 },
  { title: '管理员操作', key: 'action', width: 180, fixed: 'right' },
]

function getStatusColor(status: string) {
  const map: Record<string, string> = { '待接受': 'orange', '已接受': 'green', '已拒绝': 'red', '已取消': 'default' }
  return map[status] || 'default'
}

function fmtTime(ts: string) {
  if (!ts) return ''
  return dayjs(ts).format('MM-DD HH:mm')
}

async function load() {
  loading.value = true
  try {
    let query = supabase
      .from('transfer_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    if (filterFromStaff.value) query = query.eq('from_staff_id', filterFromStaff.value)
    if (filterToStaff.value) query = query.eq('to_staff_id', filterToStaff.value)

    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)

    const { data, count, error } = await query
    if (error) throw error
    records.value = (data || []).map(r => ({ ...r, _forcing: false }))
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

async function forceAccept(record: any) {
  record._forcing = true
  try {
    const { error: subErr } = await supabase.from('sub_orders').update({
      staff_id: record.to_staff_id,
      staff_name: record.to_staff_name,
    }).eq('id', record.sub_order_id)
    if (subErr) throw subErr

    const { error: reqErr } = await supabase.from('transfer_requests').update({
      status: '已接受',
      responded_at: new Date().toISOString(),
      reject_reason: '管理员强制接受',
    }).eq('id', record.id)
    if (reqErr) throw reqErr

    message.success(`已强制将订单转给 ${record.to_staff_name}`)
    await load()
  } catch (e: any) {
    message.error(e.message)
  } finally {
    record._forcing = false
  }
}

function openForceReject(record: any) {
  forceRejectTarget.value = record
  forceRejectReason.value = ''
  forceRejectOpen.value = true
}

async function submitForceReject() {
  if (!forceRejectTarget.value) return
  forceRejectSaving.value = true
  try {
    const { error } = await supabase.from('transfer_requests').update({
      status: '已拒绝',
      reject_reason: forceRejectReason.value || '管理员强制拒绝',
      responded_at: new Date().toISOString(),
    }).eq('id', forceRejectTarget.value.id)
    if (error) throw error
    forceRejectOpen.value = false
    message.success('已强制拒绝该互转请求')
    await load()
  } catch (e: any) {
    message.error(e.message)
  } finally {
    forceRejectSaving.value = false
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

.stats-row { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px 24px;
  min-width: 110px;
  text-align: center;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.stat-card-num { font-size: 28px; font-weight: 800; line-height: 1.2; }
.stat-card-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
.stat-pending .stat-card-num { color: #f59e0b; }
.stat-accepted .stat-card-num { color: #059669; }
.stat-rejected .stat-card-num { color: #dc2626; }
.stat-cancelled .stat-card-num { color: #9ca3af; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.total-hint { font-size: 13px; color: #6b7280; margin-left: 4px; }

.sub-no { font-family: 'Courier New', monospace; font-size: 12px; font-weight: 700; color: #1a1a2e; }

.transfer-path { display: flex; align-items: center; gap: 8px; }
.staff-from { font-size: 13px; font-weight: 600; color: #374151; }
.staff-to { font-size: 13px; font-weight: 600; color: #059669; }
.arrow-icon { color: #f59e0b; font-size: 12px; }

.reason-text { font-size: 12px; color: #6b7280; }
.reject-reason-text { font-size: 12px; color: #dc2626; }
.time-text { font-size: 12px; color: #374151; }
.text-gray { color: #9ca3af; font-size: 12px; }
</style>
