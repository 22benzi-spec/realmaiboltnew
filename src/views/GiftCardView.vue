<template>
  <div class="page-content">
    <h1 class="page-title">礼品卡管理</h1>

    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="cards" tab="礼品卡列表">
        <div class="card-panel">
          <div class="toolbar">
            <a-input-search v-model:value="searchText" placeholder="搜索卡号/卡码" style="width:220px" allow-clear @search="loadCards" />
            <a-select v-model:value="filterStatus" style="width:130px" @change="loadCards" allow-clear placeholder="状态">
              <a-select-option value="未使用">未使用</a-select-option>
              <a-select-option value="已使用">已使用</a-select-option>
              <a-select-option value="已作废">已作废</a-select-option>
            </a-select>
            <a-button type="primary" @click="importOpen = true"><ImportOutlined /> 批量导入</a-button>
          </div>

          <a-table :columns="cardColumns" :data-source="cards" :loading="cardsLoading" :pagination="pagination" row-key="id" size="small" @change="handleTableChange">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :color="cardStatusColor[record.status] || 'default'">{{ record.status }}</a-tag>
              </template>
              <template v-if="column.key === 'action'">
                <a-space>
                  <a-popconfirm v-if="record.status === '未使用'" title="确定作废?" @confirm="voidCard(record.id)">
                    <a-button type="link" size="small" danger>作废</a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <a-tab-pane key="batches" tab="批次管理">
        <div class="card-panel">
          <div class="toolbar">
            <a-button type="primary" @click="batchModalOpen = true"><PlusOutlined /> 新增批次</a-button>
          </div>
          <a-table :columns="batchColumns" :data-source="batches" :loading="batchesLoading" row-key="id" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'total_cost_cny'">
                ¥{{ Number(record.total_cost_cny).toFixed(2) }}
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>

    <a-modal v-model:open="importOpen" title="批量导入礼品卡" @ok="handleImport" :confirm-loading="importing" width="600px">
      <a-form layout="vertical">
        <a-form-item label="批次">
          <a-select v-model:value="importBatchId" style="width:100%" placeholder="选择批次（或先创建批次）">
            <a-select-option v-for="b in batches" :key="b.id" :value="b.id">{{ b.batch_number }} - {{ b.supplier }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="卡面值(USD)">
          <a-select v-model:value="importFaceValue" style="width:100%">
            <a-select-option v-for="v in [1,2,3,5,10,11,15,20]" :key="v" :value="v">{{ v }} USD</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="卡号列表（每行一张，格式: 卡号,卡码）">
          <a-textarea v-model:value="importText" :rows="8" placeholder="B001234567890,ABCD1234EF&#10;B009876543210,WXYZ5678GH" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="batchModalOpen" title="新增礼品卡批次" @ok="handleAddBatch" :confirm-loading="submittingBatch">
      <a-form :model="batchForm" layout="vertical">
        <a-form-item label="供应商"><a-input v-model:value="batchForm.supplier" /></a-form-item>
        <a-form-item label="采购日期"><a-date-picker v-model:value="batchForm.purchase_date" style="width:100%" format="YYYY-MM-DD" /></a-form-item>
        <a-form-item label="汇率"><a-input-number v-model:value="batchForm.exchange_rate" :min="1" style="width:100%" /></a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="batchForm.notes" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ImportOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const activeTab = ref('cards')
const cardsLoading = ref(false)
const batchesLoading = ref(false)
const cards = ref<any[]>([])
const batches = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('')
const importOpen = ref(false)
const importing = ref(false)
const importBatchId = ref('')
const importFaceValue = ref(10)
const importText = ref('')
const batchModalOpen = ref(false)
const submittingBatch = ref(false)
const pagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })

const cardStatusColor: Record<string, string> = { '未使用': 'green', '已使用': 'default', '已作废': 'red' }

const batchForm = reactive({ supplier: '', purchase_date: dayjs(), exchange_rate: 7.25, notes: '' })

const cardColumns = [
  { title: '卡号', dataIndex: 'card_number', key: 'card_number', width: 150 },
  { title: '卡码', dataIndex: 'card_code', key: 'card_code', width: 130 },
  { title: '面值(USD)', dataIndex: 'face_value_usd', key: 'face_value_usd', width: 90 },
  { title: '成本(CNY)', dataIndex: 'cost_cny', key: 'cost_cny', width: 90, customRender: ({ text }: any) => text ? `¥${Number(text).toFixed(2)}` : '-' },
  { title: '状态', key: 'status', width: 90 },
  { title: '使用买手', dataIndex: 'used_by_buyer_name', key: 'used_by_buyer_name', width: 110 },
  { title: '使用时间', dataIndex: 'used_at', key: 'used_at', width: 120, customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '-' },
  { title: '操作', key: 'action', width: 80, fixed: 'right' },
]

const batchColumns = [
  { title: '批次号', dataIndex: 'batch_number', key: 'batch_number' },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier' },
  { title: '采购日期', dataIndex: 'purchase_date', key: 'purchase_date', width: 110 },
  { title: '汇率', dataIndex: 'exchange_rate', key: 'exchange_rate', width: 70 },
  { title: '总面值(USD)', dataIndex: 'total_face_value_usd', key: 'total_face_value_usd', width: 110 },
  { title: '总成本(CNY)', key: 'total_cost_cny', width: 110 },
  { title: '卡片数量', dataIndex: 'card_count', key: 'card_count', width: 90 },
]

async function loadCards() {
  cardsLoading.value = true
  try {
    let query = supabase.from('gift_cards').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (searchText.value) query = query.or(`card_number.ilike.%${searchText.value}%,card_code.ilike.%${searchText.value}%`)
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

async function loadBatches() {
  batchesLoading.value = true
  const { data } = await supabase.from('gift_card_batches').select('*').order('created_at', { ascending: false })
  batches.value = data || []
  batchesLoading.value = false
}

async function voidCard(id: string) {
  const { error } = await supabase.from('gift_cards').update({ status: '已作废' }).eq('id', id)
  if (error) { message.error('操作失败'); return }
  message.success('已作废')
  loadCards()
}

async function handleImport() {
  if (!importBatchId.value) { message.warning('请选择批次'); return }
  const lines = importText.value.split('\n').filter(l => l.trim())
  if (!lines.length) { message.warning('请输入卡号数据'); return }
  importing.value = true
  try {
    const cards = lines.map(line => {
      const [card_number, card_code] = line.split(',').map(s => s.trim())
      return {
        card_number,
        card_code: card_code || '',
        batch_id: importBatchId.value,
        face_value_usd: importFaceValue.value,
        status: '未使用',
      }
    })
    const { error } = await supabase.from('gift_cards').insert(cards)
    if (error) throw error
    message.success(`成功导入 ${cards.length} 张礼品卡`)
    importOpen.value = false
    importText.value = ''
    loadCards()
  } catch (e: any) {
    message.error('导入失败：' + e.message)
  } finally {
    importing.value = false
  }
}

async function handleAddBatch() {
  submittingBatch.value = true
  try {
    const batchNum = 'GCB-' + Date.now()
    const { error } = await supabase.from('gift_card_batches').insert([{
      batch_number: batchNum,
      supplier: batchForm.supplier,
      purchase_date: batchForm.purchase_date ? batchForm.purchase_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      exchange_rate: batchForm.exchange_rate,
      notes: batchForm.notes,
    }])
    if (error) throw error
    message.success('批次创建成功')
    batchModalOpen.value = false
    loadBatches()
  } catch (e: any) {
    message.error('创建失败：' + e.message)
  } finally {
    submittingBatch.value = false
  }
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  loadCards()
}

onMounted(() => { loadCards(); loadBatches() })
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
</style>
