<template>
  <div class="page-content">
    <h1 class="page-title">业务员工作台</h1>

    <div class="workbench-layout">
      <!-- 左侧业务员列表 -->
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

      <!-- 右侧主内容 -->
      <div class="workbench-main">
        <template v-if="selectedStaffId">
          <!-- 统计卡片 -->
          <div class="workbench-stats">
            <div v-for="stat in workbenchStats" :key="stat.label" :class="['stat-mini', stat.colorClass]">
              <div class="stat-mini-value">{{ stat.value }}</div>
              <div class="stat-mini-label">{{ stat.label }}</div>
            </div>
          </div>

          <div class="card-panel">
            <div class="toolbar">
              <a-select v-model:value="taskFilter" style="width:140px" @change="loadTasks">
                <a-select-option value="">全部任务</a-select-option>
                <a-select-option v-for="s in subOrderStatuses" :key="s" :value="s">{{ s }}</a-select-option>
              </a-select>
              <a-input-search v-model:value="taskSearch" placeholder="搜索ASIN/关键词" style="width:200px" @search="loadTasks" allow-clear />
              <a-button @click="loadTasks"><ReloadOutlined /> 刷新</a-button>
              <span class="total-hint">共 {{ tasks.length }} 条子单</span>
            </div>

            <div v-if="tasksLoading" class="loading-wrap"><a-spin /></div>

            <div v-else>
              <div v-if="tasks.length === 0" class="empty-list">
                <a-empty description="暂无任务数据" />
              </div>

              <div v-else class="sub-table-wrap">
                <table class="sub-table">
                  <thead>
                    <tr>
                      <th class="col-no">子订单号</th>
                      <th class="col-asin">ASIN</th>
                      <th class="col-keyword">关键词</th>
                      <th class="col-variant">变参</th>
                      <th class="col-date">排期</th>
                      <th class="col-status">状态</th>
                      <th class="col-amazon">亚马逊订单号</th>
                      <th class="col-price">单价</th>
                      <th class="col-buyer">买手</th>
                      <th class="col-note">任务备注</th>
                      <th class="col-action">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="task in tasks" :key="task.id">
                      <tr
                        :class="['sub-row', editingId === task.id ? 'editing-row' : '', isOverdue(task.scheduled_date) && !['已完成','已取消'].includes(task.status) ? 'overdue-row' : '']"
                      >
                        <td class="col-no">
                          <span class="sub-no">{{ task.sub_order_number }}</span>
                        </td>
                        <td class="col-asin">
                          <div class="asin-cell">
                            <img v-if="task.product_image" :src="task.product_image" class="product-thumb" referrerpolicy="no-referrer" @error="onImgError" />
                            <div>
                              <div class="asin-code">{{ task.asin }}</div>
                              <div class="store-name">{{ task.store_name }}</div>
                            </div>
                          </div>
                        </td>
                        <td class="col-keyword">
                          <template v-if="editingId === task.id">
                            <a-input v-model:value="editForm.keyword" size="small" placeholder="关键词" />
                          </template>
                          <span v-else-if="task.keyword" class="keyword-tag">{{ task.keyword }}</span>
                          <span v-else class="text-gray">—</span>
                        </td>
                        <td class="col-variant">
                          <template v-if="editingId === task.id">
                            <a-input v-model:value="editForm.variant_info" size="small" placeholder="变参" />
                          </template>
                          <span v-else>{{ task.variant_info || '—' }}</span>
                        </td>
                        <td class="col-date">
                          <template v-if="editingId === task.id">
                            <a-date-picker v-model:value="editForm.scheduled_date_obj" size="small" style="width:118px" format="YYYY-MM-DD" value-format="YYYY-MM-DD" />
                          </template>
                          <span v-else-if="task.scheduled_date" :class="isOverdue(task.scheduled_date) && !['已完成','已取消'].includes(task.status) ? 'date-overdue' : 'date-normal'">
                            {{ task.scheduled_date }}
                          </span>
                          <span v-else class="text-gray">—</span>
                        </td>
                        <td class="col-status">
                          <template v-if="editingId === task.id">
                            <a-select v-model:value="editForm.status" size="small" style="width:100px">
                              <a-select-option v-for="s in subOrderStatuses" :key="s" :value="s">{{ s }}</a-select-option>
                            </a-select>
                          </template>
                          <a-tag v-else :color="getStatusColor(task.status)" style="font-size:11px">{{ task.status }}</a-tag>
                        </td>
                        <td class="col-amazon">
                          <template v-if="editingId === task.id">
                            <a-input v-model:value="editForm.amazon_order_id" size="small" placeholder="亚马逊订单号" style="width:145px" />
                          </template>
                          <span v-else-if="task.amazon_order_id" class="amazon-order">{{ task.amazon_order_id }}</span>
                          <span v-else class="text-gray">—</span>
                        </td>
                        <td class="col-price">
                          <div class="price-cell">
                            <span class="price-usd">${{ Number(task.product_price || 0).toFixed(2) }}</span>
                            <span class="price-cny">¥{{ Number(task.unit_price || 0).toFixed(2) }}</span>
                          </div>
                        </td>
                        <td class="col-buyer">
                          <template v-if="editingId === task.id">
                            <a-select v-model:value="editForm.buyer_id" size="small" style="width:90px" allow-clear placeholder="买手" show-search option-filter-prop="label">
                              <a-select-option v-for="b in buyerList" :key="b.id" :value="b.id" :label="b.name">{{ b.name }}</a-select-option>
                            </a-select>
                          </template>
                          <span v-else-if="task.buyer_name" class="buyer-name">{{ task.buyer_name }}</span>
                          <span v-else class="text-gray">—</span>
                        </td>
                        <td class="col-note">
                          <template v-if="editingId === task.id">
                            <a-input v-model:value="editForm.task_notes" size="small" placeholder="备注" />
                          </template>
                          <span v-else class="note-text">{{ task.task_notes || '—' }}</span>
                        </td>
                        <td class="col-action">
                          <template v-if="editingId === task.id">
                            <a-space>
                              <a-button type="primary" size="small" :loading="saveLoading" @click="saveRow(task)"><SaveOutlined /></a-button>
                              <a-button size="small" @click="cancelEdit"><CloseOutlined /></a-button>
                            </a-space>
                          </template>
                          <template v-else>
                            <a-space>
                              <a-button type="link" size="small" @click="startEdit(task)"><EditOutlined /> 编辑</a-button>
                              <a-button type="link" size="small" @click="openDetail(task)">详情</a-button>
                            </a-space>
                          </template>
                        </td>
                      </tr>
                      <!-- 编辑行展开区 - 时间节点 -->
                      <tr v-if="editingId === task.id" class="edit-extra-row">
                        <td colspan="11">
                          <div class="edit-extra-panel">
                            <div class="edit-extra-title">时间节点 & 退款</div>
                            <div class="edit-extra-grid">
                              <div class="edit-field">
                                <label>买手接单时间</label>
                                <a-input v-model:value="editForm.buyer_assigned_at" size="small" placeholder="YYYY-MM-DD HH:mm" />
                              </div>
                              <div class="edit-field">
                                <label>亚马逊下单时间</label>
                                <a-input v-model:value="editForm.amazon_order_placed_at" size="small" placeholder="YYYY-MM-DD HH:mm" />
                              </div>
                              <div class="edit-field">
                                <label>收货确认时间</label>
                                <a-input v-model:value="editForm.delivery_confirmed_at" size="small" placeholder="YYYY-MM-DD HH:mm" />
                              </div>
                              <div class="edit-field">
                                <label>留评提交时间</label>
                                <a-input v-model:value="editForm.review_submitted_at" size="small" placeholder="YYYY-MM-DD HH:mm" />
                              </div>
                              <div class="edit-field">
                                <label>退款状态</label>
                                <a-select v-model:value="editForm.refund_status" size="small" style="width:100%" allow-clear placeholder="无退款">
                                  <a-select-option v-for="s in refundStatuses" :key="s" :value="s">{{ s }}</a-select-option>
                                </a-select>
                              </div>
                              <div class="edit-field">
                                <label>退款金额(¥)</label>
                                <a-input-number v-model:value="editForm.refund_amount" size="small" :min="0" :precision="2" style="width:100%" />
                              </div>
                              <div class="edit-field">
                                <label>留评截图URL</label>
                                <a-input v-model:value="editForm.review_screenshot_url" size="small" placeholder="截图链接" />
                              </div>
                              <div class="edit-field">
                                <label>订单备注</label>
                                <a-input v-model:value="editForm.notes" size="small" placeholder="订单备注" />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="empty-state">
          <TeamOutlined style="font-size:48px; color:#d1d5db" />
          <p>请从左侧选择业务员</p>
        </div>
      </div>
    </div>

    <!-- 子订单详情弹窗（只读） -->
    <a-modal
      v-model:open="detailOpen"
      :title="`子订单详情 - ${detailRecord?.sub_order_number}`"
      :footer="null"
      width="800px"
      :destroy-on-close="true"
    >
      <div v-if="detailRecord" class="detail-modal-body">
        <div class="detail-header">
          <a-tag :color="getStatusColor(detailRecord.status)">{{ detailRecord.status || '已分配' }}</a-tag>
          <span class="detail-sub-number">{{ detailRecord.sub_order_number }}</span>
          <div style="flex:1"></div>
          <a-button type="primary" size="small" @click="detailOpen=false; startEdit(detailRecord)"><EditOutlined /> 编辑</a-button>
        </div>

        <div class="detail-sections">
          <div class="detail-section">
            <div class="detail-section-title">产品 & 订单</div>
            <div class="detail-grid">
              <div class="detail-item"><label>ASIN</label><span class="mono">{{ detailRecord.asin }}</span></div>
              <div class="detail-item"><label>产品名称</label><span>{{ detailRecord.product_name || '—' }}</span></div>
              <div class="detail-item"><label>店铺</label><span>{{ detailRecord.store_name || '—' }}</span></div>
              <div class="detail-item"><label>国家</label><span>{{ detailRecord.country || '—' }}</span></div>
              <div class="detail-item"><label>类型</label><span>{{ detailRecord.order_type || '—' }}</span></div>
              <div class="detail-item"><label>测评类型</label><span>{{ detailRecord.review_type || '—' }}</span></div>
              <div class="detail-item"><label>评价等级</label><span>{{ detailRecord.review_level || '—' }}</span></div>
              <div class="detail-item"><label>关键词</label><span class="keyword-highlight">{{ detailRecord.keyword || '—' }}</span></div>
              <div class="detail-item"><label>变参</label><span>{{ detailRecord.variant_info || '—' }}</span></div>
              <div class="detail-item"><label>排期日期</label><span :class="detailRecord.scheduled_date && isOverdue(detailRecord.scheduled_date) ? 'date-overdue' : ''">{{ detailRecord.scheduled_date || '—' }}</span></div>
              <div class="detail-item"><label>亚马逊订单号</label><span class="mono">{{ detailRecord.amazon_order_id || '—' }}</span></div>
              <div class="detail-item">
                <label>价格</label>
                <span class="price-usd-text">${{ Number(detailRecord.product_price||0).toFixed(2) }} / ¥{{ Number(detailRecord.unit_price||0).toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">人员 & 买手</div>
            <div class="detail-grid">
              <div class="detail-item"><label>业务员</label><span>{{ detailRecord.staff_name || '—' }}</span></div>
              <div class="detail-item"><label>买手</label><span>{{ detailRecord.buyer_name || '—' }}</span></div>
              <div class="detail-item"><label>客户</label><span>{{ detailRecord.customer_name || '—' }}</span></div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">时间节点</div>
            <div class="detail-grid">
              <div class="detail-item"><label>买手接单</label><span>{{ fmtTime(detailRecord.buyer_assigned_at) }}</span></div>
              <div class="detail-item"><label>亚马逊下单</label><span>{{ fmtTime(detailRecord.amazon_order_placed_at) }}</span></div>
              <div class="detail-item"><label>收货确认</label><span>{{ fmtTime(detailRecord.delivery_confirmed_at) }}</span></div>
              <div class="detail-item"><label>留评提交</label><span>{{ fmtTime(detailRecord.review_submitted_at) }}</span></div>
              <div class="detail-item"><label>创建时间</label><span>{{ fmtTime(detailRecord.created_at) }}</span></div>
              <div class="detail-item"><label>更新时间</label><span>{{ fmtTime(detailRecord.updated_at) }}</span></div>
            </div>
          </div>

          <div v-if="detailRecord.refund_status || detailRecord.refund_amount" class="detail-section">
            <div class="detail-section-title">退款信息</div>
            <div class="detail-grid">
              <div class="detail-item"><label>退款状态</label><a-tag color="orange">{{ detailRecord.refund_status }}</a-tag></div>
              <div class="detail-item"><label>退款金额</label><span class="refund-highlight">¥{{ Number(detailRecord.refund_amount||0).toFixed(2) }}</span></div>
              <div class="detail-item"><label>退款方式</label><span>{{ detailRecord.refund_method || '—' }}</span></div>
            </div>
          </div>

          <div v-if="detailRecord.task_notes || detailRecord.notes" class="detail-section">
            <div class="detail-section-title">备注</div>
            <div class="detail-grid">
              <div class="detail-item detail-full"><label>任务备注</label><span>{{ detailRecord.task_notes || '—' }}</span></div>
              <div class="detail-item detail-full"><label>订单备注</label><span>{{ detailRecord.notes || '—' }}</span></div>
            </div>
          </div>

          <div v-if="detailRecord.review_screenshot_url" class="detail-section">
            <div class="detail-section-title">留评截图</div>
            <div style="padding:10px 14px">
              <img :src="detailRecord.review_screenshot_url" class="review-screenshot" referrerpolicy="no-referrer" @error="onImgError" />
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, TeamOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const staffSearch = ref('')
const staffList = ref<any[]>([])
const selectedStaffId = ref('')
const tasks = ref<any[]>([])
const tasksLoading = ref(false)
const taskFilter = ref('')
const taskSearch = ref('')
const buyerList = ref<any[]>([])

const editingId = ref<string | null>(null)
const editForm = ref<any>({})
const saveLoading = ref(false)

const detailOpen = ref(false)
const detailRecord = ref<any>(null)

const subOrderStatuses = ['已分配', '进行中', '已下单', '已留评', '已完成', '已取消']
const refundStatuses = ['待退款', '退款中', '已退款', '退款失败']

const filteredStaff = computed(() =>
  staffList.value.filter(s => !staffSearch.value || s.name.includes(staffSearch.value))
)

const workbenchStats = computed(() => {
  const total = tasks.value.length
  const inProgress = tasks.value.filter(t => ['已分配', '进行中', '已下单', '已留评'].includes(t.status)).length
  const completed = tasks.value.filter(t => t.status === '已完成').length
  const reviewed = tasks.value.filter(t => t.status === '已留评').length
  return [
    { label: '全部任务', value: total, colorClass: 'stat-default' },
    { label: '进行中', value: inProgress, colorClass: 'stat-blue' },
    { label: '已留评', value: reviewed, colorClass: 'stat-geekblue' },
    { label: '已完成', value: completed, colorClass: 'stat-green' },
  ]
})

function getStatusColor(s: string) {
  const map: Record<string, string> = {
    '已分配': 'cyan', '进行中': 'blue', '已下单': 'orange',
    '已留评': 'geekblue', '已完成': 'green', '已取消': 'red', '待分配': 'default'
  }
  return map[s] || 'default'
}

function isOverdue(dateStr: string) {
  if (!dateStr) return false
  return dayjs(dateStr).isBefore(dayjs(), 'day')
}

function fmtTime(t: string | null) {
  if (!t) return '—'
  return dayjs(t).format('YYYY-MM-DD HH:mm')
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

async function loadStaff() {
  const { data } = await supabase
    .from('staff')
    .select('id, name, role, avatar_color, status')
    .in('status', ['在职', '休假'])
    .order('name')
  if (data) {
    const ids = data.map(s => s.id)
    const { data: counts } = await supabase
      .from('sub_orders')
      .select('staff_id')
      .in('staff_id', ids)
      .in('status', ['已分配', '进行中', '已下单', '已留评'])
    const countMap: Record<string, number> = {}
    counts?.forEach(c => { countMap[c.staff_id] = (countMap[c.staff_id] || 0) + 1 })
    staffList.value = data.map(s => ({ ...s, pending_count: countMap[s.id] || 0 }))
  }
}

async function loadBuyers() {
  const { data } = await supabase.from('buyers').select('id, name').eq('status', '活跃')
  buyerList.value = data || []
}

async function selectStaff(id: string) {
  selectedStaffId.value = id
  editingId.value = null
  await loadTasks()
}

async function loadTasks() {
  if (!selectedStaffId.value) return
  tasksLoading.value = true
  try {
    let query = supabase
      .from('sub_orders')
      .select('*')
      .eq('staff_id', selectedStaffId.value)
      .order('scheduled_date', { ascending: true, nullsFirst: false })
    if (taskFilter.value) query = query.eq('status', taskFilter.value)
    if (taskSearch.value) {
      query = query.or(`asin.ilike.%${taskSearch.value}%,keyword.ilike.%${taskSearch.value}%`)
    }
    const { data, error } = await query
    if (error) throw error
    tasks.value = data || []
  } finally {
    tasksLoading.value = false
  }
}

function startEdit(task: any) {
  editingId.value = task.id
  editForm.value = {
    status: task.status || '已分配',
    keyword: task.keyword || '',
    variant_info: task.variant_info || '',
    scheduled_date_obj: task.scheduled_date || null,
    amazon_order_id: task.amazon_order_id || '',
    buyer_id: task.buyer_id || null,
    task_notes: task.task_notes || '',
    notes: task.notes || '',
    buyer_assigned_at: task.buyer_assigned_at ? dayjs(task.buyer_assigned_at).format('YYYY-MM-DD HH:mm') : '',
    amazon_order_placed_at: task.amazon_order_placed_at ? dayjs(task.amazon_order_placed_at).format('YYYY-MM-DD HH:mm') : '',
    delivery_confirmed_at: task.delivery_confirmed_at ? dayjs(task.delivery_confirmed_at).format('YYYY-MM-DD HH:mm') : '',
    review_submitted_at: task.review_submitted_at ? dayjs(task.review_submitted_at).format('YYYY-MM-DD HH:mm') : '',
    refund_status: task.refund_status || '',
    refund_amount: task.refund_amount ? Number(task.refund_amount) : null,
    review_screenshot_url: task.review_screenshot_url || '',
  }
}

function cancelEdit() {
  editingId.value = null
  editForm.value = {}
}

async function saveRow(task: any) {
  saveLoading.value = true
  try {
    const f = editForm.value
    const parseTs = (v: string) => v ? dayjs(v, 'YYYY-MM-DD HH:mm').toISOString() : null

    const buyer = buyerList.value.find(b => b.id === f.buyer_id)
    const payload: any = {
      status: f.status,
      keyword: f.keyword || null,
      variant_info: f.variant_info || null,
      scheduled_date: f.scheduled_date_obj || null,
      amazon_order_id: f.amazon_order_id || null,
      buyer_id: f.buyer_id || null,
      buyer_name: buyer?.name || (f.buyer_id ? task.buyer_name : null),
      task_notes: f.task_notes || null,
      notes: f.notes || null,
      buyer_assigned_at: parseTs(f.buyer_assigned_at),
      amazon_order_placed_at: parseTs(f.amazon_order_placed_at),
      delivery_confirmed_at: parseTs(f.delivery_confirmed_at),
      review_submitted_at: parseTs(f.review_submitted_at),
      refund_status: f.refund_status || null,
      refund_amount: f.refund_amount || null,
      review_screenshot_url: f.review_screenshot_url || null,
    }

    const { error } = await supabase.from('sub_orders').update(payload).eq('id', task.id)
    if (error) throw error

    Object.assign(task, payload)
    editingId.value = null
    editForm.value = {}
    message.success('保存成功')
    await loadStaff()
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    saveLoading.value = false
  }
}

function openDetail(task: any) {
  detailRecord.value = { ...task }
  detailOpen.value = true
}

onMounted(() => { loadStaff(); loadBuyers() })
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }

.workbench-layout { display: flex; gap: 16px; min-height: calc(100vh - 140px); }
.staff-sidebar { width: 220px; flex-shrink: 0; background: #fff; border-radius: 12px; border: 1px solid #f0f0f0; overflow: hidden; display: flex; flex-direction: column; }
.staff-search { padding: 12px; border-bottom: 1px solid #f0f0f0; }
.staff-list { flex: 1; overflow-y: auto; padding: 8px; }
.staff-item { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; cursor: pointer; transition: background 0.15s; margin-bottom: 4px; }
.staff-item:hover { background: #f5f7fa; }
.staff-item.active { background: #eff6ff; }
.staff-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.staff-name { font-size: 13px; font-weight: 600; color: #374151; }
.staff-role { font-size: 11px; color: #9ca3af; }
.staff-info { flex: 1; min-width: 0; }

.workbench-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }

.workbench-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.stat-mini {
  background: #fff;
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: 1px solid #f0f0f0;
  border-left: 4px solid transparent;
}
.stat-mini.stat-default { border-left-color: #9ca3af; }
.stat-mini.stat-blue { border-left-color: #2563eb; }
.stat-mini.stat-geekblue { border-left-color: #6366f1; }
.stat-mini.stat-green { border-left-color: #059669; }
.stat-mini-value { font-size: 28px; font-weight: 700; color: #1a1a2e; line-height: 1.1; }
.stat-mini-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.total-hint { font-size: 13px; color: #6b7280; margin-left: 4px; }
.loading-wrap { display: flex; justify-content: center; padding: 60px 0; }
.empty-list { padding: 40px 0; }

.sub-table-wrap { overflow-x: auto; }
.sub-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  min-width: 1200px;
}
.sub-table thead tr {
  background: #f8fafc;
  border-bottom: 2px solid #e5e7eb;
}
.sub-table th {
  padding: 9px 10px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  white-space: nowrap;
  border-right: 1px solid #f0f0f0;
}
.sub-table th:last-child { border-right: none; }
.sub-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #f4f4f5;
  border-right: 1px solid #f4f4f5;
  vertical-align: middle;
}
.sub-table td:last-child { border-right: none; }
.sub-row:hover td { background: #fafbff; }
.editing-row td { background: #fffbeb !important; }
.overdue-row td:first-child { border-left: 3px solid #ef4444; }

.col-no { width: 155px; }
.col-asin { width: 160px; }
.col-keyword { width: 120px; }
.col-variant { width: 80px; }
.col-date { width: 120px; }
.col-status { width: 105px; }
.col-amazon { width: 150px; }
.col-price { width: 100px; }
.col-buyer { width: 95px; }
.col-note { width: 120px; }
.col-action { width: 120px; }

.sub-no { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; }
.asin-cell { display: flex; align-items: center; gap: 6px; }
.product-thumb { width: 30px; height: 30px; object-fit: cover; border-radius: 4px; border: 1px solid #f0f0f0; flex-shrink: 0; }
.asin-code { font-family: 'Courier New', monospace; font-size: 11px; font-weight: 600; color: #374151; }
.store-name { font-size: 10px; color: #9ca3af; margin-top: 1px; }
.keyword-tag {
  display: inline-block;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 500;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.date-normal { font-size: 12px; color: #374151; }
.date-overdue { font-size: 12px; color: #dc2626; font-weight: 600; }
.amazon-order { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; }
.price-cell { display: flex; flex-direction: column; gap: 1px; }
.price-usd { font-size: 12px; font-weight: 600; color: #16a34a; }
.price-cny { font-size: 11px; color: #9ca3af; }
.buyer-name { font-size: 12px; color: #374151; }
.note-text { font-size: 11px; color: #6b7280; max-width: 110px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.text-gray { color: #9ca3af; font-size: 12px; }

.edit-extra-row td { padding: 0; border-top: none; }
.edit-extra-panel {
  background: #fffbeb;
  border-top: 1px dashed #fbbf24;
  padding: 12px 16px 14px;
}
.edit-extra-title { font-size: 11px; font-weight: 600; color: #92400e; margin-bottom: 10px; }
.edit-extra-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.edit-field { display: flex; flex-direction: column; gap: 4px; }
.edit-field label { font-size: 11px; color: #6b7280; font-weight: 500; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #9ca3af; gap: 12px; font-size: 14px; background: #fff; border-radius: 12px; }

/* 详情弹窗 */
.detail-modal-body { padding: 0; }
.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #f8fafc;
}
.detail-sub-number { font-family: 'Courier New', monospace; font-size: 14px; font-weight: 700; color: #1a1a2e; }
.detail-sections { padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; max-height: 68vh; overflow-y: auto; }
.detail-section { border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden; }
.detail-section-title {
  font-size: 11px; font-weight: 600; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.5px;
  background: #f9fafb; padding: 6px 14px;
  border-bottom: 1px solid #f0f0f0;
}
.detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
.detail-item {
  padding: 8px 14px; border-right: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0;
  display: flex; flex-direction: column; gap: 3px;
}
.detail-item:nth-child(3n) { border-right: none; }
.detail-item label { font-size: 11px; color: #9ca3af; font-weight: 500; }
.detail-item span { font-size: 13px; color: #374151; word-break: break-all; }
.detail-full { grid-column: 1 / -1; }
.mono { font-family: 'Courier New', monospace; font-size: 12px; }
.keyword-highlight { color: #2563eb; font-weight: 600; background: #eff6ff; padding: 1px 6px; border-radius: 4px; font-size: 12px; }
.price-usd-text { color: #16a34a; font-weight: 600; }
.refund-highlight { color: #f59e0b; font-weight: 600; }
.review-screenshot { max-width: 100%; border-radius: 8px; border: 1px solid #f0f0f0; }
</style>
