<template>
  <div class="page-content">
    <div class="page-header">
      <h1 class="page-title">礼品卡管理</h1>
      <a-space>
        <a-button @click="singleImportOpen = true"><PlusOutlined /> 单张导入</a-button>
        <a-button type="primary" @click="importOpen = true"><ImportOutlined /> 批量导入</a-button>
      </a-space>
    </div>

    <!-- 顶部指标看板 -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">库存总额（美国 USD）</div>
        <div class="kpi-value">${{ stats.us_total.toFixed(2) }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">库存总额（德国 EUR）</div>
        <div class="kpi-value">€{{ stats.de_total.toFixed(2) }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">库存总额（英国 GBP）</div>
        <div class="kpi-value">£{{ stats.uk_total.toFixed(2) }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">库存总额（加拿大 CAD）</div>
        <div class="kpi-value">C${{ stats.ca_total.toFixed(2) }}</div>
      </div>
      <div class="kpi-card today-card">
        <div class="kpi-label">今日动态</div>
        <div class="today-stats">
          <span class="today-item used">今日已领用 <strong>{{ stats.today_used }}</strong> 张</span>
          <span class="divider">|</span>
          <span class="today-item remain">剩余库存 <strong>{{ stats.total_remaining }}</strong> 张</span>
        </div>
      </div>
    </div>

    <!-- 规格汇总列表 -->
    <div class="card-panel">
      <div class="toolbar">
        <a-select v-model:value="filterCountry" style="width:120px" allow-clear placeholder="国家" @change="loadSpecs">
          <a-select-option value="US">美国 US</a-select-option>
          <a-select-option value="DE">德国 DE</a-select-option>
          <a-select-option value="UK">英国 UK</a-select-option>
          <a-select-option value="CA">加拿大 CA</a-select-option>
        </a-select>
        <a-input-search v-model:value="searchText" placeholder="搜索卡号/卡码" style="width:220px" allow-clear @search="loadSpecs" />
      </div>

      <a-table
        :columns="specColumns"
        :data-source="specs"
        :loading="specsLoading"
        row-key="spec_key"
        size="middle"
        :pagination="false"
        :expandable="{ expandedRowRender, rowExpandable: () => true, expandedRowKeys: expandedKeys, onExpand: handleExpand }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'country'">
            <a-tag :color="countryColor[record.country]">{{ record.country }}</a-tag>
          </template>
          <template v-if="column.key === 'available_count'">
            <span class="count-available">{{ record.available_count }}</span>
          </template>
          <template v-if="column.key === 'used_count'">
            <span class="count-used">{{ record.used_count }}</span>
          </template>
          <template v-if="column.key === 'action'">
            <a-button type="link" size="small" @click="openDetailDrawer(record)">查看明细</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 明细抽屉 -->
    <a-drawer
      v-model:open="drawerOpen"
      :title="`${drawerSpec?.country} - ${drawerSpec?.face_value_usd} 面值 明细`"
      width="900"
      placement="right"
    >
      <div class="drawer-toolbar">
        <a-select v-model:value="drawerFilterStatus" style="width:130px" allow-clear placeholder="状态" @change="loadDrawerCards">
          <a-select-option value="未使用">未使用</a-select-option>
          <a-select-option value="已使用">已使用</a-select-option>
          <a-select-option value="已作废">已作废</a-select-option>
        </a-select>
      </div>
      <a-table
        :columns="detailColumns"
        :data-source="drawerCards"
        :loading="drawerLoading"
        row-key="id"
        size="small"
        :pagination="drawerPagination"
        @change="handleDrawerTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'card_number'">
            <span class="masked-field">{{ revealedFields[record.id + '_number'] ? record.card_number : maskValue(record.card_number) }}</span>
            <a-button type="link" size="small" class="icon-btn" @click="toggleReveal(record, 'card_number')">
              <EyeOutlined v-if="!revealedFields[record.id + '_number']" />
              <EyeInvisibleOutlined v-else />
            </a-button>
            <a-button type="link" size="small" class="icon-btn" @click="copyField(record, 'card_number')">
              <CopyOutlined />
            </a-button>
          </template>
          <template v-if="column.key === 'card_code'">
            <span class="masked-field">{{ revealedFields[record.id + '_code'] ? record.card_code : maskValue(record.card_code) }}</span>
            <a-button type="link" size="small" class="icon-btn" @click="toggleReveal(record, 'card_code')">
              <EyeOutlined v-if="!revealedFields[record.id + '_code']" />
              <EyeInvisibleOutlined v-else />
            </a-button>
            <a-button type="link" size="small" class="icon-btn" @click="copyField(record, 'card_code')">
              <CopyOutlined />
            </a-button>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="cardStatusColor[record.status] || 'default'">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'actual_cost'">
            {{ record.actual_cost ? `¥${Number(record.actual_cost).toFixed(2)}` : '-' }}
          </template>
          <template v-if="column.key === 'created_at'">
            {{ record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD') : '-' }}
          </template>
          <template v-if="column.key === 'exchange_rate'">
            {{ record.exchange_rate || '-' }}
          </template>
          <template v-if="column.key === 'action'">
            <a-popconfirm v-if="record.status === '未使用'" title="确定作废此卡?" @confirm="voidCard(record.id)">
              <a-button type="link" size="small" danger>作废</a-button>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
    </a-drawer>

    <!-- 批量导入 Modal -->
    <a-modal v-model:open="importOpen" title="批量导入礼品卡" @ok="handleImport" :confirm-loading="importing" width="620px">
      <a-form layout="vertical">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="国家">
              <a-select v-model:value="importForm.country" style="width:100%">
                <a-select-option value="US">美国 US</a-select-option>
                <a-select-option value="DE">德国 DE</a-select-option>
                <a-select-option value="UK">英国 UK</a-select-option>
                <a-select-option value="CA">加拿大 CA</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="面值">
              <a-select v-model:value="importForm.face_value_usd" style="width:100%">
                <a-select-option v-for="v in faceValueOptions" :key="v" :value="v">{{ v }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="供应商">
              <a-input v-model:value="importForm.supplier" placeholder="供应商名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="购买汇率">
              <a-input-number v-model:value="importForm.exchange_rate" :min="1" :precision="4" style="width:100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="实际成本（每张，CNY）">
          <a-input-number v-model:value="importForm.actual_cost" :min="0" :precision="2" style="width:100%" placeholder="选填" />
        </a-form-item>
        <a-form-item label="卡号列表（每行一张，格式: 卡号,卡码）">
          <a-textarea v-model:value="importForm.text" :rows="8" placeholder="B001234567890,ABCD1234EF&#10;B009876543210,WXYZ5678GH" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 单张导入 Modal -->
    <a-modal v-model:open="singleImportOpen" title="单张导入礼品卡" @ok="handleSingleImport" :confirm-loading="singleImporting" width="480px">
      <a-form :model="singleForm" layout="vertical">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="国家">
              <a-select v-model:value="singleForm.country" style="width:100%">
                <a-select-option value="US">美国 US</a-select-option>
                <a-select-option value="DE">德国 DE</a-select-option>
                <a-select-option value="UK">英国 UK</a-select-option>
                <a-select-option value="CA">加拿大 CA</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="面值">
              <a-select v-model:value="singleForm.face_value_usd" style="width:100%">
                <a-select-option v-for="v in faceValueOptions" :key="v" :value="v">{{ v }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="卡号">
          <a-input v-model:value="singleForm.card_number" placeholder="礼品卡号" />
        </a-form-item>
        <a-form-item label="卡密">
          <a-input v-model:value="singleForm.card_code" placeholder="礼品卡密" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="供应商">
              <a-input v-model:value="singleForm.supplier" placeholder="供应商" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="购买汇率">
              <a-input-number v-model:value="singleForm.exchange_rate" :min="1" :precision="4" style="width:100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="实际成本（CNY）">
          <a-input-number v-model:value="singleForm.actual_cost" :min="0" :precision="2" style="width:100%" placeholder="选填" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ImportOutlined, EyeOutlined, EyeInvisibleOutlined, CopyOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const specsLoading = ref(false)
const drawerLoading = ref(false)
const importing = ref(false)
const singleImporting = ref(false)
const importOpen = ref(false)
const singleImportOpen = ref(false)
const drawerOpen = ref(false)
const filterCountry = ref('')
const searchText = ref('')
const drawerFilterStatus = ref('')
const expandedKeys = ref<string[]>([])

const specs = ref<any[]>([])
const drawerCards = ref<any[]>([])
const drawerSpec = ref<any>(null)
const revealedFields = reactive<Record<string, boolean>>({})
const drawerPagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })

const faceValueOptions = [1, 2, 3, 5, 10, 11, 15, 20, 25, 30, 50, 100]

const stats = reactive({
  us_total: 0,
  de_total: 0,
  uk_total: 0,
  ca_total: 0,
  today_used: 0,
  total_remaining: 0,
})

const cardStatusColor: Record<string, string> = { '未使用': 'green', '已使用': 'default', '已作废': 'red' }
const countryColor: Record<string, string> = { US: 'blue', DE: 'orange', UK: 'cyan', CA: 'geekblue' }

const importForm = reactive({
  country: 'US',
  face_value_usd: 10,
  supplier: '',
  exchange_rate: 7.25,
  actual_cost: null as number | null,
  text: '',
})

const singleForm = reactive({
  country: 'US',
  face_value_usd: 10,
  card_number: '',
  card_code: '',
  supplier: '',
  exchange_rate: 7.25,
  actual_cost: null as number | null,
})

const specColumns = [
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '面值', dataIndex: 'face_value_usd', key: 'face_value_usd', width: 90, customRender: ({ text, record }: any) => `${text} ${currencySymbol(record.country)}` },
  { title: '库存（可用）', key: 'available_count', dataIndex: 'available_count', width: 110 },
  { title: '已使用', key: 'used_count', dataIndex: 'used_count', width: 90 },
  { title: '已作废', dataIndex: 'voided_count', key: 'voided_count', width: 90 },
  { title: '平均汇率', dataIndex: 'avg_exchange_rate', key: 'avg_exchange_rate', width: 90 },
  { title: '操作', key: 'action', width: 100 },
]

const detailColumns = [
  { title: '卡号', key: 'card_number', width: 200 },
  { title: '卡密', key: 'card_code', width: 200 },
  { title: '入库时间', key: 'created_at', dataIndex: 'created_at', width: 100 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 100 },
  { title: '购买汇率', key: 'exchange_rate', width: 90 },
  { title: '实际成本', key: 'actual_cost', width: 90 },
  { title: '状态', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 70, fixed: 'right' },
]

function currencySymbol(country: string) {
  const map: Record<string, string> = { US: 'USD', DE: 'EUR', UK: 'GBP', CA: 'CAD' }
  return map[country] || ''
}

function maskValue(val: string) {
  if (!val) return '-'
  if (val.length <= 8) return val.slice(0, 2) + '****'
  return val.slice(0, 4) + '-****-' + val.slice(-4)
}

async function loadStats() {
  const today = dayjs().format('YYYY-MM-DD')
  const { data } = await supabase.from('gift_cards').select('country, face_value_usd, status, used_at')
  if (!data) return
  let us = 0, de = 0, uk = 0, ca = 0, todayUsed = 0, remaining = 0
  for (const c of data) {
    if (c.status === '未使用') {
      if (c.country === 'US') us += Number(c.face_value_usd)
      if (c.country === 'DE') de += Number(c.face_value_usd)
      if (c.country === 'UK') uk += Number(c.face_value_usd)
      if (c.country === 'CA') ca += Number(c.face_value_usd)
      remaining++
    }
    if (c.status === '已使用' && c.used_at && c.used_at.startsWith(today)) {
      todayUsed++
    }
  }
  stats.us_total = us
  stats.de_total = de
  stats.uk_total = uk
  stats.ca_total = ca
  stats.today_used = todayUsed
  stats.total_remaining = remaining
}

async function loadSpecs() {
  specsLoading.value = true
  try {
    let query = supabase.from('gift_cards').select('id, country, face_value_usd, status, exchange_rate')
    if (filterCountry.value) query = query.eq('country', filterCountry.value)
    const { data, error } = await query
    if (error) throw error
    const map: Record<string, any> = {}
    for (const card of (data || [])) {
      const key = `${card.country}_${card.face_value_usd}`
      if (!map[key]) {
        map[key] = { spec_key: key, country: card.country, face_value_usd: card.face_value_usd, total_count: 0, available_count: 0, used_count: 0, voided_count: 0, rate_sum: 0, rate_count: 0 }
      }
      map[key].total_count++
      if (card.status === '未使用') map[key].available_count++
      if (card.status === '已使用') map[key].used_count++
      if (card.status === '已作废') map[key].voided_count++
      if (card.exchange_rate) { map[key].rate_sum += Number(card.exchange_rate); map[key].rate_count++ }
    }
    for (const item of Object.values(map)) {
      item.avg_exchange_rate = item.rate_count > 0 ? (item.rate_sum / item.rate_count).toFixed(4) : '-'
    }
    let result = Object.values(map).sort((a, b) => {
      if (a.country !== b.country) return a.country.localeCompare(b.country)
      return a.face_value_usd - b.face_value_usd
    })
    if (searchText.value) {
      result = result.filter(r => r.country.toLowerCase().includes(searchText.value.toLowerCase()))
    }
    specs.value = result
  } finally {
    specsLoading.value = false
  }
}

function openDetailDrawer(spec: any) {
  drawerSpec.value = spec
  drawerFilterStatus.value = ''
  drawerPagination.value.current = 1
  drawerOpen.value = true
  loadDrawerCards()
}

async function loadDrawerCards() {
  if (!drawerSpec.value) return
  drawerLoading.value = true
  try {
    let query = supabase.from('gift_cards')
      .select('*', { count: 'exact' })
      .eq('country', drawerSpec.value.country)
      .eq('face_value_usd', drawerSpec.value.face_value_usd)
      .order('created_at', { ascending: false })
    if (drawerFilterStatus.value) query = query.eq('status', drawerFilterStatus.value)
    const from = (drawerPagination.value.current - 1) * drawerPagination.value.pageSize
    query = query.range(from, from + drawerPagination.value.pageSize - 1)
    const { data, count, error } = await query
    if (error) throw error
    drawerCards.value = data || []
    drawerPagination.value.total = count || 0
  } finally {
    drawerLoading.value = false
  }
}

function handleDrawerTableChange(pag: any) {
  drawerPagination.value.current = pag.current
  drawerPagination.value.pageSize = pag.pageSize
  loadDrawerCards()
}

async function toggleReveal(record: any, field: 'card_number' | 'card_code') {
  const key = record.id + (field === 'card_number' ? '_number' : '_code')
  const wasRevealed = revealedFields[key]
  revealedFields[key] = !wasRevealed
  if (!wasRevealed) {
    await supabase.from('gift_card_access_logs').insert([{
      gift_card_id: record.id,
      action: 'reveal',
      field,
      operator: 'operator',
    }])
  }
}

async function copyField(record: any, field: 'card_number' | 'card_code') {
  const value = record[field]
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    message.success('已复制')
    await supabase.from('gift_card_access_logs').insert([{
      gift_card_id: record.id,
      action: 'copy',
      field,
      operator: 'operator',
    }])
  } catch {
    message.error('复制失败')
  }
}

async function voidCard(id: string) {
  const { error } = await supabase.from('gift_cards').update({ status: '已作废' }).eq('id', id)
  if (error) { message.error('操作失败'); return }
  message.success('已作废')
  loadDrawerCards()
  loadStats()
  loadSpecs()
}

async function handleImport() {
  const lines = importForm.text.split('\n').filter(l => l.trim())
  if (!lines.length) { message.warning('请输入卡号数据'); return }
  importing.value = true
  try {
    const rows = lines.map(line => {
      const [card_number, card_code] = line.split(',').map(s => s.trim())
      return {
        card_number,
        card_code: card_code || '',
        country: importForm.country,
        face_value_usd: importForm.face_value_usd,
        supplier: importForm.supplier,
        exchange_rate: importForm.exchange_rate,
        actual_cost: importForm.actual_cost ?? 0,
        status: '未使用',
      }
    })
    const { error } = await supabase.from('gift_cards').insert(rows)
    if (error) throw error
    message.success(`成功导入 ${rows.length} 张礼品卡`)
    importOpen.value = false
    importForm.text = ''
    loadSpecs()
    loadStats()
  } catch (e: any) {
    message.error('导入失败：' + e.message)
  } finally {
    importing.value = false
  }
}

async function handleSingleImport() {
  if (!singleForm.card_number) { message.warning('请输入卡号'); return }
  singleImporting.value = true
  try {
    const { error } = await supabase.from('gift_cards').insert([{
      card_number: singleForm.card_number,
      card_code: singleForm.card_code,
      country: singleForm.country,
      face_value_usd: singleForm.face_value_usd,
      supplier: singleForm.supplier,
      exchange_rate: singleForm.exchange_rate,
      actual_cost: singleForm.actual_cost ?? 0,
      status: '未使用',
    }])
    if (error) throw error
    message.success('导入成功')
    singleImportOpen.value = false
    singleForm.card_number = ''
    singleForm.card_code = ''
    loadSpecs()
    loadStats()
  } catch (e: any) {
    message.error('导入失败：' + e.message)
  } finally {
    singleImporting.value = false
  }
}

function handleExpand(_expanded: boolean, _record: any) {
}

function expandedRowRender() {
  return h('div')
}

onMounted(() => {
  loadStats()
  loadSpecs()
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.kpi-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border: 1px solid #f0f0f0;
}

.kpi-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: #1677ff;
}

.today-card {
  grid-column: span 1;
}

.today-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.today-item { font-size: 13px; color: #555; }
.today-item.used strong { color: #ff4d4f; }
.today-item.remain strong { color: #52c41a; }
.divider { color: #d9d9d9; }

.card-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border: 1px solid #f0f0f0;
}

.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
.drawer-toolbar { margin-bottom: 12px; }

.count-available { color: #52c41a; font-weight: 600; }
.count-used { color: #8c8c8c; }

.masked-field {
  font-family: monospace;
  font-size: 12px;
  color: #333;
  margin-right: 2px;
}

.icon-btn {
  padding: 0 4px;
  height: auto;
  color: #bbb;
}
.icon-btn:hover { color: #1677ff; }
</style>
