<template>
  <div class="page-content">
    <h1 class="page-title">分配管理</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search v-model:value="searchText" placeholder="搜索订单号/ASIN/店铺" style="width:260px" @search="load" allow-clear />
        <a-select v-model:value="filterStatus" style="width:130px" @change="load" allow-clear placeholder="子单状态">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option v-for="s in subStatuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterCountry" style="width:100px" @change="load" allow-clear placeholder="国家">
          <a-select-option value="">全部</a-select-option>
          <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-button
          type="primary"
          :disabled="!selectedKeys.length"
          @click="batchAssignOpen = true"
        >
          <UserAddOutlined /> 批量分配 ({{ selectedKeys.length }})
        </a-button>
        <a-button @click="load"><ReloadOutlined /> 刷新</a-button>
        <span class="total-hint">共 {{ pagination.total }} 条子单</span>
      </div>

      <div v-if="loading" class="loading-wrap"><a-spin /></div>

      <div v-else class="task-list">
        <div v-for="group in groupedOrders" :key="group.order_id" class="task-card">
          <div class="task-main-row">
            <div class="task-expand-btn" @click="toggleExpand(group.order_id)">
              <RightOutlined :class="['expand-icon', { 'expanded': expandedKeys.includes(group.order_id) }]" />
            </div>

            <div class="task-info">
              <div class="task-top-row">
                <a class="order-num-link">{{ group.order_number }}</a>
                <a-tag :color="getOrderStatusColor(group.order_status)" class="status-tag">{{ group.order_status }}</a-tag>
                <a-tag color="default" class="info-tag">{{ group.country }}</a-tag>
                <a-tag v-if="group.order_type === '免评'" color="green" class="info-tag">免评</a-tag>
                <a-tag v-else-if="group.order_type === '文字评'" color="cyan" class="info-tag">文字评</a-tag>
                <a-tag v-else-if="group.order_type === '图片评'" color="blue" class="info-tag">图片评</a-tag>
                <a-tag v-else-if="group.order_type === '视频评'" color="geekblue" class="info-tag">视频评</a-tag>
                <a-tag v-else-if="group.order_type" color="default" class="info-tag">{{ group.order_type }}</a-tag>
                <a-tag v-if="group.review_level" color="default" class="info-tag">{{ group.review_level }}</a-tag>
                <a-tag v-if="group.review_type" color="default" class="info-tag">{{ group.review_type }}</a-tag>
              </div>
              <div class="task-detail-row">
                <span class="detail-item-text">产品：{{ group.product_name || group.asin }}</span>
                <span class="detail-sep">ASIN：<span class="mono-sm">{{ group.asin }}</span></span>
                <span class="detail-sep">店铺：{{ group.store_name }}</span>
                <span class="detail-sep">品牌：{{ group.brand_name || '—' }}</span>
              </div>
              <div class="task-detail-row">
                <span class="detail-item-text">类目：{{ group.category || '—' }}</span>
                <span class="detail-sep">单价：<span class="price-text">${{ Number(group.product_price || 0).toFixed(2) }}</span></span>
                <span class="detail-sep">客户：{{ group.customer_name || '—' }}</span>
                <span class="detail-sep">业务员：{{ group.sales_person || '—' }}</span>
              </div>
            </div>

            <div class="task-stats">
              <div class="stat-item">
                <span class="stat-label">子单</span>
                <span class="stat-val stat-total">{{ group.subs.length }}</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-label">待分配</span>
                <span class="stat-val stat-pending">{{ group.subs.filter((s: any) => s.status === '待分配').length }}</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-label">已分配</span>
                <span class="stat-val stat-assigned">{{ group.subs.filter((s: any) => s.status !== '待分配').length }}</span>
              </div>
            </div>

            <div class="task-actions">
              <a-button
                type="primary"
                size="small"
                class="gen-btn"
                @click.stop="openGroupAssign(group)"
              >
                <UserAddOutlined /> 分配全组
              </a-button>
            </div>
          </div>

          <div v-if="expandedKeys.includes(group.order_id)" class="sub-orders-panel">
            <div class="sub-orders-header">
              <span class="sub-orders-title">子订单列表（{{ group.subs.length }} 单）</span>
              <a-checkbox
                :checked="isAllGroupSelected(group)"
                :indeterminate="isGroupIndeterminate(group)"
                @change="(e: any) => toggleGroupSelect(group, e.target.checked)"
              >全选本组</a-checkbox>
            </div>
            <a-table
              :columns="subColumns"
              :data-source="group.subs"
              :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectionChange, getCheckboxProps: () => ({}) }"
              :pagination="false"
              row-key="id"
              size="small"
              :scroll="{ x: 1400 }"
              style="margin-top:10px"
            >
              <template #bodyCell="{ column, record: sub }">
                <template v-if="column.key === 'sub_no'">
                  <span class="sub-no">{{ sub.sub_order_number }}</span>
                </template>
                <template v-if="column.key === 'sub_keyword'">
                  <span v-if="sub.keyword" class="keyword-tag">{{ sub.keyword }}</span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_variant'">
                  <span v-if="sub.variant_info" class="variant-text">{{ sub.variant_info }}</span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_scheduled'">
                  <span v-if="sub.scheduled_date" :class="isOverdue(sub.scheduled_date) ? 'date-overdue' : 'date-normal'">
                    {{ sub.scheduled_date }}
                  </span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_status'">
                  <a-tag :color="getSubStatusColor(sub.status)" size="small">{{ sub.status || '待分配' }}</a-tag>
                </template>
                <template v-if="column.key === 'sub_price'">
                  <div>
                    <div class="price-main">${{ Number(sub.product_price || 0).toFixed(2) }}</div>
                    <div class="price-sub">¥{{ Number(sub.unit_price || 0).toFixed(2) }}</div>
                  </div>
                </template>
                <template v-if="column.key === 'sub_staff'">
                  <span v-if="sub.staff_name" class="staff-assigned">{{ sub.staff_name }}</span>
                  <span v-else class="text-gray">未分配</span>
                </template>
                <template v-if="column.key === 'sub_buyer'">
                  <span v-if="sub.buyer_name">{{ sub.buyer_name }}</span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_amazon_order'">
                  <span v-if="sub.amazon_order_id" class="order-num-sm">{{ sub.amazon_order_id }}</span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_action'">
                  <a-button type="link" size="small" @click="openSingleAssign(sub)">分配</a-button>
                </template>
              </template>
            </a-table>
          </div>
        </div>

        <div v-if="groupedOrders.length === 0" class="empty-list">
          <a-empty description="暂无子单数据" />
        </div>
      </div>

      <div class="pagination-wrap">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          show-size-changer
          :page-size-options="['20','50','100']"
          @change="onPageChange"
          @show-size-change="onPageChange"
        />
      </div>
    </div>

    <!-- 批量分配弹窗 -->
    <a-modal
      v-model:open="batchAssignOpen"
      title="批量分配业务员"
      @ok="handleBatchAssign"
      :confirm-loading="assigning"
      ok-text="确认分配"
    >
      <div class="assign-modal-body">
        <div class="assign-count-tip">
          已选择 <strong>{{ selectedKeys.length }}</strong> 条子单
        </div>
        <a-form layout="vertical">
          <a-form-item label="选择业务员">
            <a-select v-model:value="selectedStaffId" placeholder="请选择业务员" style="width:100%" show-search option-filter-prop="label">
              <a-select-option v-for="s in staffList" :key="s.id" :value="s.id" :label="s.name">{{ s.name }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <!-- 单条分配弹窗 -->
    <a-modal
      v-model:open="singleAssignOpen"
      :title="`分配子单 - ${currentRecord?.sub_order_number}`"
      @ok="handleSingleAssign"
      :confirm-loading="assigning"
      ok-text="确认分配"
    >
      <div class="assign-modal-body">
        <div v-if="currentRecord" class="assign-sub-info">
          <span class="assign-info-item">关键词：<strong>{{ currentRecord.keyword || '—' }}</strong></span>
          <span class="assign-info-item">排期：<strong>{{ currentRecord.scheduled_date || '—' }}</strong></span>
          <span class="assign-info-item">当前业务员：<strong>{{ currentRecord.staff_name || '未分配' }}</strong></span>
        </div>
        <a-form layout="vertical">
          <a-form-item label="选择业务员">
            <a-select v-model:value="selectedStaffId" placeholder="请选择业务员" style="width:100%" show-search option-filter-prop="label" allow-clear>
              <a-select-option v-for="s in staffList" :key="s.id" :value="s.id" :label="s.name">{{ s.name }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <!-- 分配全组弹窗 -->
    <a-modal
      v-model:open="groupAssignOpen"
      :title="`分配全组 - ${currentGroup?.order_number}`"
      @ok="handleGroupAssign"
      :confirm-loading="assigning"
      ok-text="确认分配"
    >
      <div class="assign-modal-body">
        <div v-if="currentGroup" class="assign-count-tip">
          将分配该订单下 <strong>{{ currentGroup.subs.filter((s: any) => s.status === '待分配').length }}</strong> 条待分配子单
        </div>
        <a-form layout="vertical">
          <a-form-item label="选择业务员">
            <a-select v-model:value="selectedStaffId" placeholder="请选择业务员" style="width:100%" show-search option-filter-prop="label" allow-clear>
              <a-select-option v-for="s in staffList" :key="s.id" :value="s.id" :label="s.name">{{ s.name }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { UserAddOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const subOrders = ref<any[]>([])
const staffList = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('待分配')
const filterCountry = ref('')
const selectedKeys = ref<string[]>([])
const batchAssignOpen = ref(false)
const singleAssignOpen = ref(false)
const groupAssignOpen = ref(false)
const selectedStaffId = ref<string>('')
const currentRecord = ref<any>(null)
const currentGroup = ref<any>(null)
const assigning = ref(false)
const expandedKeys = ref<string[]>([])
const pagination = ref({ current: 1, pageSize: 50, total: 0 })

const subStatuses = ['待分配', '已分配', '进行中', '已下单', '已留评', '已完成', '已取消']
const countries = ['美国', '德国', '英国', '加拿大']

const subColumns = [
  { title: '子订单号', key: 'sub_no', width: 165 },
  { title: '关键词', key: 'sub_keyword', width: 130 },
  { title: '变参', key: 'sub_variant', width: 80 },
  { title: '排期日期', key: 'sub_scheduled', width: 95 },
  { title: '状态', key: 'sub_status', width: 85 },
  { title: '产品价/单价', key: 'sub_price', width: 105 },
  { title: '业务员', key: 'sub_staff', width: 90 },
  { title: '买手', key: 'sub_buyer', width: 80 },
  { title: '亚马逊订单号', key: 'sub_amazon_order', width: 145 },
  { title: '操作', key: 'sub_action', width: 80, fixed: 'right' },
]

const groupedOrders = computed(() => {
  const map = new Map<string, any>()
  for (const sub of subOrders.value) {
    const oid = sub.order_id
    if (!map.has(oid)) {
      map.set(oid, {
        order_id: oid,
        order_number: sub._order_number || '',
        order_status: sub._order_status || '',
        asin: sub.asin,
        product_name: sub.product_name,
        store_name: sub.store_name,
        brand_name: sub.brand_name,
        country: sub.country,
        order_type: sub.order_type,
        review_type: sub.review_type,
        review_level: sub.review_level,
        category: sub.category,
        product_price: sub.product_price,
        customer_name: sub.customer_name,
        sales_person: sub.sales_person,
        subs: [],
      })
    }
    map.get(oid).subs.push(sub)
  }
  return Array.from(map.values())
})

function getOrderStatusColor(status: string) {
  const map: Record<string, string> = { '待处理': 'default', '进行中': 'blue', '已完成': 'green', '已取消': 'red', '暂停': 'orange' }
  return map[status] || 'default'
}

function getSubStatusColor(status: string) {
  const map: Record<string, string> = { '待分配': 'default', '已分配': 'cyan', '进行中': 'blue', '已下单': 'orange', '已留评': 'geekblue', '已完成': 'green', '已取消': 'red' }
  return map[status] || 'default'
}

function isOverdue(dateStr: string) {
  return dayjs(dateStr).isBefore(dayjs(), 'day')
}

function toggleExpand(orderId: string) {
  if (expandedKeys.value.includes(orderId)) {
    expandedKeys.value = expandedKeys.value.filter(k => k !== orderId)
  } else {
    expandedKeys.value = [...expandedKeys.value, orderId]
  }
}

function isAllGroupSelected(group: any) {
  return group.subs.every((s: any) => selectedKeys.value.includes(s.id))
}

function isGroupIndeterminate(group: any) {
  const some = group.subs.some((s: any) => selectedKeys.value.includes(s.id))
  return some && !isAllGroupSelected(group)
}

function toggleGroupSelect(group: any, checked: boolean) {
  const ids = group.subs.map((s: any) => s.id)
  if (checked) {
    const set = new Set([...selectedKeys.value, ...ids])
    selectedKeys.value = Array.from(set)
  } else {
    selectedKeys.value = selectedKeys.value.filter(k => !ids.includes(k))
  }
}

function onSelectionChange(keys: any[]) {
  selectedKeys.value = keys
}

function openSingleAssign(record: any) {
  currentRecord.value = record
  selectedStaffId.value = record.staff_id || ''
  singleAssignOpen.value = true
}

function openGroupAssign(group: any) {
  currentGroup.value = group
  selectedStaffId.value = ''
  groupAssignOpen.value = true
}

async function load() {
  loading.value = true
  try {
    let query = supabase
      .from('sub_orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    if (filterCountry.value) query = query.eq('country', filterCountry.value)
    if (searchText.value) {
      query = query.or(`asin.ilike.%${searchText.value}%,store_name.ilike.%${searchText.value}%`)
    }

    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)

    const { data, count, error } = await query
    if (error) throw error

    const orderIds = [...new Set((data || []).map((s: any) => s.order_id))]
    let orderMap: Record<string, any> = {}
    if (orderIds.length > 0) {
      const { data: orders } = await supabase
        .from('erp_orders')
        .select('id, order_number, status')
        .in('id', orderIds)
      ;(orders || []).forEach((o: any) => { orderMap[o.id] = o })
    }

    subOrders.value = (data || []).map((s: any) => ({
      ...s,
      _order_number: orderMap[s.order_id]?.order_number || '',
      _order_status: orderMap[s.order_id]?.status || '',
    }))

    if (searchText.value) {
      const orderSearchIds = Object.values(orderMap)
        .filter((o: any) => o.order_number?.toLowerCase().includes(searchText.value.toLowerCase()))
        .map((o: any) => o.id)
      if (orderSearchIds.length > 0) {
        const extra = (data || []).filter((s: any) => orderSearchIds.includes(s.order_id))
        if (extra.length > 0) {
        }
      }
    }

    pagination.value.total = count || 0

    expandedKeys.value = [...new Set((data || []).map((s: any) => s.order_id))]
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
    selectedStaffId.value = ''
    load()
  } catch (e: any) {
    message.error('分配失败：' + e.message)
  } finally {
    assigning.value = false
  }
}

async function handleSingleAssign() {
  if (!selectedStaffId.value || !currentRecord.value) { message.warning('请选择业务员'); return }
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
    selectedStaffId.value = ''
    load()
  } catch (e: any) {
    message.error('分配失败：' + e.message)
  } finally {
    assigning.value = false
  }
}

async function handleGroupAssign() {
  if (!selectedStaffId.value || !currentGroup.value) { message.warning('请选择业务员'); return }
  assigning.value = true
  try {
    const staff = staffList.value.find(s => s.id === selectedStaffId.value)
    const ids = currentGroup.value.subs
      .filter((s: any) => s.status === '待分配')
      .map((s: any) => s.id)
    if (ids.length === 0) { message.info('本组没有待分配子单'); return }
    const { error } = await supabase.from('sub_orders').update({
      staff_id: selectedStaffId.value,
      staff_name: staff?.name || '',
      status: '已分配',
    }).in('id', ids)
    if (error) throw error
    message.success(`成功分配 ${ids.length} 条子单`)
    groupAssignOpen.value = false
    selectedStaffId.value = ''
    load()
  } catch (e: any) {
    message.error('分配失败：' + e.message)
  } finally {
    assigning.value = false
  }
}

function onPageChange(page: number, pageSize: number) {
  pagination.value.current = page
  pagination.value.pageSize = pageSize
  load()
}

onMounted(() => { load(); loadStaff() })
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.total-hint { font-size: 13px; color: #6b7280; margin-left: 4px; }
.loading-wrap { display: flex; justify-content: center; padding: 60px 0; }

.task-list { display: flex; flex-direction: column; gap: 0; }
.task-card { border-bottom: 1px solid #f0f0f0; }
.task-card:last-child { border-bottom: none; }

.task-main-row {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 14px 4px 14px 0;
  transition: background 0.15s;
}
.task-main-row:hover { background: #fafbff; }

.task-expand-btn {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 3px;
  cursor: pointer;
  color: #9ca3af;
}
.expand-icon { font-size: 11px; transition: transform 0.2s; }
.expand-icon.expanded { transform: rotate(90deg); color: #2563eb; }

.task-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.task-top-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.order-num-link {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #2563eb;
  cursor: default;
  text-decoration: none;
}
.status-tag { font-size: 11px; }
.info-tag { font-size: 11px; }
.task-detail-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
}
.detail-item-text { color: #374151; }
.detail-sep { color: #6b7280; padding-left: 12px; }
.mono-sm { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; }
.price-text { color: #16a34a; font-weight: 600; }

.task-stats {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin: 0 20px;
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
}
.stat-item { display: flex; flex-direction: column; align-items: center; min-width: 48px; gap: 2px; }
.stat-label { font-size: 11px; color: #9ca3af; line-height: 1; }
.stat-val { font-size: 20px; font-weight: 700; line-height: 1.2; }
.stat-total { color: #1a1a2e; }
.stat-pending { color: #f59e0b; }
.stat-assigned { color: #059669; }
.stat-divider { width: 1px; height: 32px; background: #e5e7eb; margin: 0 10px; }

.task-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; padding-left: 8px; }
.gen-btn { font-size: 12px; }

.sub-orders-panel {
  background: #f8fafc;
  border-top: 1px dashed #e5e7eb;
  padding: 12px 16px 16px 32px;
}
.sub-orders-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sub-orders-title { font-size: 12px; font-weight: 600; color: #374151; }

.sub-no { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; }
.order-num-sm { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; }
.keyword-tag {
  display: inline-block;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.variant-text { font-size: 11px; color: #6b7280; }
.date-normal { font-size: 12px; color: #374151; }
.date-overdue { font-size: 12px; color: #dc2626; font-weight: 600; }
.price-main { font-size: 11px; font-weight: 600; color: #16a34a; }
.price-sub { font-size: 11px; color: #6b7280; }
.staff-assigned { font-size: 12px; color: #059669; font-weight: 500; }
.text-gray { color: #9ca3af; font-size: 12px; }

.empty-list { padding: 40px 0; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0; }

.assign-modal-body { padding: 4px 0; }
.assign-count-tip {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 13px;
  color: #1d4ed8;
  margin-bottom: 16px;
}
.assign-sub-info {
  background: #f9fafb;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 10px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}
.assign-info-item { font-size: 12px; color: #6b7280; }
.assign-info-item strong { color: #374151; }
</style>
