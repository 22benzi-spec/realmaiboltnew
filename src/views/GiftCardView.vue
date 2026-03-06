<template>
  <div class="page-content">
    <div class="page-header">
      <h1 class="page-title">礼品卡管理</h1>
      <div class="header-actions">
        <a-button @click="loadAll"><ReloadOutlined /></a-button>
        <a-button @click="openSingleImport"><PlusOutlined /> 单张录入</a-button>
        <a-button type="primary" @click="openBatchImport"><ImportOutlined /> 批量导入</a-button>
      </div>
    </div>

    <!-- 库存统计面板 -->
    <div class="stock-panel">
      <div class="stock-panel-header">
        <span class="stock-panel-title">库存概览（未使用）</span>
        <span class="stock-hint">按国家 + 面值汇总，方便提前囤卡</span>
      </div>
      <div v-if="stockLoading" class="stock-loading"><a-spin size="small" /></div>
      <div v-else-if="!stockGroups.length" class="stock-empty">暂无库存数据</div>
      <div v-else class="stock-grid">
        <div v-for="group in stockGroups" :key="group.key" class="stock-country-block">
          <div class="stock-country-label">
            <span class="stock-flag">{{ countryFlag(group.country) }}</span>
            <span class="stock-country-name">{{ group.country }}</span>
          </div>
          <div class="stock-values">
            <div
              v-for="item in group.values"
              :key="item.fv"
              :class="['stock-value-chip', item.count <= 5 ? 'stock-low' : item.count <= 20 ? 'stock-mid' : 'stock-ok']"
              @click="quickFilter(group.country, item.fv)"
            >
              <span class="stock-fv">${{ item.fv }}</span>
              <span class="stock-count">× {{ item.count }}</span>
              <span v-if="item.count <= 5" class="stock-warn-dot"></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 列表 -->
    <div class="card-panel">
      <div class="toolbar">
        <a-input-search v-model:value="searchText" placeholder="搜索卡密/关联订单" style="width:200px" allow-clear @search="loadCards" />
        <a-select v-model:value="filterCountry" style="width:100px" allow-clear placeholder="国家" @change="loadCards">
          <a-select-option v-for="c in countryOptions" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterFaceValue" style="width:110px" allow-clear placeholder="面值" @change="loadCards">
          <a-select-option v-for="v in faceValueOptions" :key="v" :value="v">${{ v }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterStatus" style="width:110px" allow-clear placeholder="状态" @change="loadCards">
          <a-select-option value="未使用">未使用</a-select-option>
          <a-select-option value="已使用">已使用</a-select-option>
          <a-select-option value="已作废">已作废</a-select-option>
        </a-select>
        <span v-if="filterCountry || filterFaceValue || filterStatus" class="filter-active-tip">
          已筛选 {{ pagination.total }} 条
          <a-button type="link" size="small" @click="clearFilters">清除</a-button>
        </span>
      </div>

      <a-table
        :columns="cardColumns"
        :data-source="cards"
        :loading="cardsLoading"
        :pagination="pagination"
        row-key="id"
        size="small"
        :scroll="{ x: 900 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="cardStatusColor[record.status] || 'default'" style="margin:0">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'cost_cny'">
            <span v-if="record.cost_cny">¥{{ Number(record.cost_cny).toFixed(2) }}</span>
            <span v-else class="text-gray">—</span>
          </template>
          <template v-if="column.key === 'sub_order_id'">
            <span v-if="record.used_for_sub_order_id" class="sub-order-id-tag">{{ record.used_for_sub_order_id.slice(0,8) }}…</span>
            <span v-else class="text-gray">—</span>
          </template>
          <template v-if="column.key === 'used_at'">
            <span v-if="record.used_at">{{ dayjs(record.used_at).format('MM-DD HH:mm') }}</span>
            <span v-else class="text-gray">—</span>
          </template>
          <template v-if="column.key === 'action'">
            <div class="action-btns">
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-popconfirm v-if="record.status === '未使用'" title="确定作废?" @confirm="voidCard(record.id)">
                <a-button type="link" size="small" danger>作废</a-button>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 单张录入 Modal -->
    <a-modal v-model:open="singleImportOpen" title="单张录入礼品卡" @ok="handleSingleImport" :confirm-loading="importing" ok-text="确定" cancel-text="取消" width="480px">
      <a-form layout="vertical" style="margin-top:8px">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="国家" required>
              <a-select v-model:value="singleForm.country" style="width:100%">
                <a-select-option v-for="c in allCountries" :key="c" :value="c">{{ c }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="面值(USD)" required>
              <a-select v-model:value="singleForm.face_value_usd" style="width:100%">
                <a-select-option v-for="v in allFaceValues" :key="v" :value="v">${{ v }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="卡密" required>
          <a-input v-model:value="singleForm.card_code" placeholder="请输入卡密" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="汇率">
              <a-input-number v-model:value="singleForm.exchange_rate" :min="1" :step="0.01" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="成本(CNY)">
              <a-input-number v-model:value="singleForm.cost_cny" :min="0" :step="0.01" style="width:100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="供应商">
          <a-input v-model:value="singleForm.supplier" placeholder="供应商名称" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批量导入 Modal -->
    <a-modal v-model:open="batchImportOpen" title="批量导入礼品卡" @ok="handleBatchImport" :confirm-loading="importing" ok-text="确定导入" cancel-text="取消" width="760px">
      <div class="batch-import-tip">
        每行一张卡，格式：<code>国家,卡密,面值,汇率,成本,供应商</code>（成本和供应商可为空）<br/>
        示例：<code>US,ABCD1234EFGH,10,7.25,72.5,某供应商</code>
      </div>
      <div class="batch-import-body">
        <div class="batch-import-left">
          <div class="batch-input-label">粘贴数据（每行一张）</div>
          <a-textarea
            v-model:value="batchImportText"
            :rows="12"
            placeholder="US,ABCD1234EFGH,10,7.25,72.5,某供应商&#10;UK,WXYZ5678IJKL,5,9.1,45.5,"
            class="batch-textarea"
            @input="parseBatchPreview"
          />
        </div>
        <div class="batch-import-right">
          <div class="batch-input-label">预览（{{ batchPreview.length }} 张）</div>
          <div class="batch-preview-wrap">
            <div v-if="!batchPreview.length" class="batch-preview-empty">粘贴数据后自动预览</div>
            <table v-else class="preview-table">
              <thead>
                <tr>
                  <th>国家</th>
                  <th>卡密</th>
                  <th>面值</th>
                  <th>成本</th>
                  <th>供应商</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in batchPreview" :key="i" :class="{ 'preview-error': row._error }">
                  <td>{{ row.country }}</td>
                  <td class="preview-code">{{ row.card_code }}</td>
                  <td>${{ row.face_value_usd }}</td>
                  <td>{{ row.cost_cny ? '¥' + row.cost_cny : '—' }}</td>
                  <td>{{ row.supplier || '—' }}</td>
                  <td>
                    <span v-if="row._error" class="preview-err-tip">{{ row._error }}</span>
                    <span v-else class="preview-ok">✓</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 编辑 Modal -->
    <a-modal v-model:open="editOpen" title="编辑礼品卡" @ok="handleEdit" :confirm-loading="submitting" ok-text="保存" cancel-text="取消" width="480px">
      <a-form layout="vertical" style="margin-top:8px" v-if="editForm">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="国家">
              <a-select v-model:value="editForm.country" style="width:100%">
                <a-select-option v-for="c in allCountries" :key="c" :value="c">{{ c }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="面值(USD)">
              <a-select v-model:value="editForm.face_value_usd" style="width:100%">
                <a-select-option v-for="v in allFaceValues" :key="v" :value="v">${{ v }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="卡密">
          <a-input v-model:value="editForm.card_code" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="汇率">
              <a-input-number v-model:value="editForm.exchange_rate" :min="1" :step="0.01" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="成本(CNY)">
              <a-input-number v-model:value="editForm.cost_cny" :min="0" :step="0.01" style="width:100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="供应商">
          <a-input v-model:value="editForm.supplier" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="editForm.status" style="width:100%">
            <a-select-option value="未使用">未使用</a-select-option>
            <a-select-option value="已使用">已使用</a-select-option>
            <a-select-option value="已作废">已作废</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ImportOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const cardsLoading = ref(false)
const stockLoading = ref(false)
const importing = ref(false)
const submitting = ref(false)

const cards = ref<any[]>([])
const stockData = ref<any[]>([])

const searchText = ref('')
const filterCountry = ref('')
const filterFaceValue = ref<number | null>(null)
const filterStatus = ref('')
const pagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true, pageSizeOptions: ['20','50','100'] })

const singleImportOpen = ref(false)
const batchImportOpen = ref(false)
const editOpen = ref(false)

const batchImportText = ref('')
const batchPreview = ref<any[]>([])
const editForm = ref<any>(null)

const allCountries = ['US', 'UK', 'DE', 'JP', 'CA', 'FR', 'IT', 'ES', 'AU', 'MX']
const allFaceValues = [1, 2, 3, 5, 10, 11, 15, 20, 25, 50, 100]

const countryOptions = computed(() => {
  const set = new Set(stockData.value.map((r: any) => r.country).filter(Boolean))
  return [...set].sort()
})

const faceValueOptions = computed(() => {
  const set = new Set(stockData.value.map((r: any) => Number(r.face_value_usd)).filter(Boolean))
  return [...set].sort((a, b) => a - b)
})

const singleForm = reactive({
  country: 'US',
  card_code: '',
  face_value_usd: 10,
  exchange_rate: 7.25,
  cost_cny: null as number | null,
  supplier: '',
})

const cardStatusColor: Record<string, string> = { '未使用': 'green', '已使用': 'default', '已作废': 'red' }

const cardColumns = [
  { title: '国家', dataIndex: 'country', key: 'country', width: 70 },
  { title: '卡密', dataIndex: 'card_code', key: 'card_code', width: 160, ellipsis: true },
  { title: '面值(USD)', dataIndex: 'face_value_usd', key: 'face_value_usd', width: 90, customRender: ({ text }: any) => `$${text}` },
  { title: '成本(CNY)', key: 'cost_cny', width: 90 },
  { title: '状态', key: 'status', width: 80 },
  { title: '关联子订单ID', key: 'sub_order_id', width: 130 },
  { title: '使用买手', dataIndex: 'used_by_buyer_name', key: 'used_by_buyer_name', width: 100, customRender: ({ text }: any) => text || '—' },
  { title: '使用时间', key: 'used_at', width: 110 },
  { title: '编辑', key: 'action', width: 100, fixed: 'right' },
]

const stockGroups = computed(() => {
  const map: Record<string, Record<number, number>> = {}
  for (const row of stockData.value) {
    if (row.status !== '未使用') continue
    const c = row.country || 'US'
    const fv = Number(row.face_value_usd)
    if (!map[c]) map[c] = {}
    map[c][fv] = (map[c][fv] || 0) + 1
  }
  return Object.entries(map).map(([country, fvMap]) => ({
    key: country,
    country,
    values: Object.entries(fvMap).sort((a, b) => Number(a[0]) - Number(b[0])).map(([fv, count]) => ({ fv: Number(fv), count })),
  })).sort((a, b) => a.country.localeCompare(b.country))
})

function countryFlag(country: string): string {
  const flags: Record<string, string> = { US: '🇺🇸', UK: '🇬🇧', DE: '🇩🇪', JP: '🇯🇵', CA: '🇨🇦', FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸', AU: '🇦🇺', MX: '🇲🇽' }
  return flags[country] || '🏳️'
}

function quickFilter(country: string, fv: number) {
  filterCountry.value = country
  filterFaceValue.value = fv
  filterStatus.value = '未使用'
  pagination.value.current = 1
  loadCards()
}

function clearFilters() {
  filterCountry.value = ''
  filterFaceValue.value = null
  filterStatus.value = ''
  pagination.value.current = 1
  loadCards()
}

async function loadAll() {
  await Promise.all([loadCards(), loadStock()])
}

async function loadStock() {
  stockLoading.value = true
  const { data } = await supabase.from('gift_cards').select('country, face_value_usd, status').order('country')
  stockData.value = data || []
  stockLoading.value = false
}

async function loadCards() {
  cardsLoading.value = true
  try {
    let query = supabase.from('gift_cards').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (searchText.value) query = query.or(`card_code.ilike.%${searchText.value}%,used_for_sub_order_id::text.ilike.%${searchText.value}%`)
    if (filterCountry.value) query = query.eq('country', filterCountry.value)
    if (filterFaceValue.value) query = query.eq('face_value_usd', filterFaceValue.value)
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)
    const { data, count, error } = await query
    if (error) throw error
    cards.value = data || []
    pagination.value.total = count || 0
  } finally {
    cardsLoading.value = false
  }
}

function openSingleImport() {
  Object.assign(singleForm, { country: 'US', card_code: '', face_value_usd: 10, exchange_rate: 7.25, cost_cny: null, supplier: '' })
  singleImportOpen.value = true
}

async function handleSingleImport() {
  if (!singleForm.card_code.trim()) { message.warning('请输入卡密'); return }
  importing.value = true
  try {
    const { error } = await supabase.from('gift_cards').insert([{
      country: singleForm.country,
      card_code: singleForm.card_code.trim(),
      face_value_usd: singleForm.face_value_usd,
      exchange_rate: singleForm.exchange_rate,
      cost_cny: singleForm.cost_cny,
      supplier: singleForm.supplier,
      status: '未使用',
    }])
    if (error) throw error
    message.success('录入成功')
    singleImportOpen.value = false
    loadAll()
  } catch (e: any) {
    message.error('录入失败：' + e.message)
  } finally {
    importing.value = false
  }
}

function openBatchImport() {
  batchImportText.value = ''
  batchPreview.value = []
  batchImportOpen.value = true
}

function parseBatchPreview() {
  const lines = batchImportText.value.split('\n').filter(l => l.trim())
  batchPreview.value = lines.map(line => {
    const parts = line.split(',').map(s => s.trim())
    const [country, card_code, face_value_str, exchange_rate_str, cost_cny_str, supplier] = parts
    const face_value_usd = Number(face_value_str)
    const exchange_rate = Number(exchange_rate_str) || 7.25
    const cost_cny = cost_cny_str ? Number(cost_cny_str) : null

    if (!country) return { country, card_code, face_value_usd, exchange_rate, cost_cny, supplier, _error: '缺少国家' }
    if (!card_code) return { country, card_code, face_value_usd, exchange_rate, cost_cny, supplier, _error: '缺少卡密' }
    if (!face_value_usd || isNaN(face_value_usd)) return { country, card_code, face_value_usd, exchange_rate, cost_cny, supplier, _error: '面值无效' }

    return { country, card_code, face_value_usd, exchange_rate, cost_cny, supplier: supplier || '', _error: null }
  })
}

async function handleBatchImport() {
  const valid = batchPreview.value.filter(r => !r._error)
  if (!valid.length) { message.warning('没有有效数据可导入'); return }
  const errorCount = batchPreview.value.length - valid.length
  if (errorCount > 0) {
    message.warning(`存在 ${errorCount} 条错误数据将被跳过，继续导入 ${valid.length} 条`)
  }
  importing.value = true
  try {
    const rows = valid.map(r => ({
      country: r.country,
      card_code: r.card_code,
      face_value_usd: r.face_value_usd,
      exchange_rate: r.exchange_rate,
      cost_cny: r.cost_cny,
      supplier: r.supplier,
      status: '未使用',
    }))
    const { error } = await supabase.from('gift_cards').insert(rows)
    if (error) throw error
    message.success(`成功导入 ${rows.length} 张礼品卡`)
    batchImportOpen.value = false
    batchImportText.value = ''
    batchPreview.value = []
    loadAll()
  } catch (e: any) {
    message.error('导入失败：' + e.message)
  } finally {
    importing.value = false
  }
}

function openEdit(record: any) {
  editForm.value = { ...record }
  editOpen.value = true
}

async function handleEdit() {
  if (!editForm.value) return
  submitting.value = true
  try {
    const { error } = await supabase.from('gift_cards').update({
      country: editForm.value.country,
      card_code: editForm.value.card_code,
      face_value_usd: editForm.value.face_value_usd,
      exchange_rate: editForm.value.exchange_rate,
      cost_cny: editForm.value.cost_cny,
      supplier: editForm.value.supplier,
      status: editForm.value.status,
    }).eq('id', editForm.value.id)
    if (error) throw error
    message.success('保存成功')
    editOpen.value = false
    loadAll()
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

async function voidCard(id: string) {
  const { error } = await supabase.from('gift_cards').update({ status: '已作废' }).eq('id', id)
  if (error) { message.error('操作失败'); return }
  message.success('已作废')
  loadAll()
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  loadCards()
}

onMounted(loadAll)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }
.header-actions { display: flex; gap: 10px; align-items: center; }

/* 库存统计 */
.stock-panel {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.stock-panel-header {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 14px;
}
.stock-panel-title { font-size: 14px; font-weight: 700; color: #1a1a2e; }
.stock-hint { font-size: 12px; color: #9ca3af; }
.stock-loading { padding: 12px; text-align: center; }
.stock-empty { font-size: 13px; color: #9ca3af; text-align: center; padding: 12px 0; }
.stock-grid { display: flex; flex-wrap: wrap; gap: 14px; }
.stock-country-block { display: flex; align-items: flex-start; gap: 10px; }
.stock-country-label {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  min-width: 36px; padding-top: 4px;
}
.stock-flag { font-size: 20px; line-height: 1; }
.stock-country-name { font-size: 10px; font-weight: 700; color: #374151; }
.stock-values { display: flex; flex-wrap: wrap; gap: 6px; max-width: 280px; }
.stock-value-chip {
  position: relative;
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 20px;
  cursor: pointer; transition: all 0.15s;
  border: 1.5px solid transparent;
}
.stock-value-chip:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.stock-ok { background: #d1fae5; border-color: #6ee7b7; color: #065f46; }
.stock-mid { background: #fef3c7; border-color: #fcd34d; color: #92400e; }
.stock-low { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
.stock-fv { font-size: 12px; font-weight: 700; }
.stock-count { font-size: 11px; font-weight: 600; }
.stock-warn-dot {
  position: absolute; top: -3px; right: -3px;
  width: 7px; height: 7px; border-radius: 50%;
  background: #ef4444; border: 1.5px solid #fff;
}

/* 列表 */
.card-panel {
  background: #fff; border-radius: 12px;
  padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border: 1px solid #f0f0f0;
}
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.filter-active-tip { font-size: 12px; color: #6b7280; }
.text-gray { color: #9ca3af; font-size: 12px; }
.sub-order-id-tag {
  font-family: monospace; font-size: 11px;
  background: #f0f9ff; color: #0891b2;
  padding: 1px 5px; border-radius: 3px;
  border: 1px solid #bae6fd;
}
.action-btns { display: flex; align-items: center; gap: 2px; }

/* 批量导入 */
.batch-import-tip {
  font-size: 12px; color: #6b7280;
  background: #f8fafc; border-radius: 6px;
  padding: 8px 12px; margin-bottom: 14px;
  border: 1px solid #e5e7eb; line-height: 1.8;
}
.batch-import-tip code {
  background: #e5e7eb; padding: 1px 4px;
  border-radius: 3px; font-size: 11px; color: #374151;
}
.batch-import-body { display: flex; gap: 16px; }
.batch-import-left { flex: 1; }
.batch-import-right { flex: 1; }
.batch-input-label { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; }
.batch-textarea { font-family: monospace; font-size: 12px; }
.batch-preview-wrap {
  border: 1px solid #e5e7eb; border-radius: 6px;
  overflow: auto; height: 240px;
  background: #fafbfc;
}
.batch-preview-empty { padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; }
.preview-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.preview-table th {
  background: #f3f4f6; padding: 5px 8px;
  text-align: left; color: #6b7280; font-weight: 600;
  position: sticky; top: 0; white-space: nowrap;
}
.preview-table td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }
.preview-table .preview-error td { background: #fff5f5; }
.preview-code { font-family: monospace; color: #374151; }
.preview-ok { color: #059669; font-weight: 700; }
.preview-err-tip { color: #dc2626; font-size: 10px; }
</style>
