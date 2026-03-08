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
          <span class="today-item remain">剩余可用 <strong>{{ stats.total_remaining }}</strong> 张</span>
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
      </div>

      <a-table
        :columns="specColumns"
        :data-source="specs"
        :loading="specsLoading"
        row-key="spec_key"
        size="middle"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'country'">
            <a-tag :color="countryColor[record.country]">{{ countryLabel[record.country] || record.country }}</a-tag>
          </template>
          <template v-if="column.key === 'face_value_usd'">
            {{ record.face_value_usd }} {{ currencySymbol(record.country) }}
          </template>
          <template v-if="column.key === 'available_count'">
            <span class="count-available">{{ record.available_count }}</span>
          </template>
          <template v-if="column.key === 'invalid_count'">
            <span v-if="record.invalid_count > 0" class="count-invalid">{{ record.invalid_count }}</span>
            <span v-else class="count-zero">0</span>
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
      :title="`${drawerSpec?.country} · ${drawerSpec?.face_value_usd} ${currencySymbol(drawerSpec?.country)} — 卡片明细`"
      width="980"
      placement="right"
    >
      <a-tabs v-model:activeKey="drawerTab" @change="handleDrawerTabChange">
        <a-tab-pane key="available">
          <template #tab>
            <span>可用库存 <a-badge :count="drawerSpec?.available_count" :overflow-count="9999" color="#52c41a" /></span>
          </template>
          <a-table :columns="availableColumns" :data-source="drawerCards" :loading="drawerLoading" row-key="id" size="small" :pagination="drawerPagination" @change="handleDrawerTableChange">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'card_number'">
                <SensitiveField :value="record.card_number" :card-id="record.id" field="card_number" />
              </template>
              <template v-if="column.key === 'card_code'">
                <SensitiveField :value="record.card_code" :card-id="record.id" field="card_code" />
              </template>
              <template v-if="column.key === 'created_at'">{{ record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD') : '-' }}</template>
              <template v-if="column.key === 'actual_cost'">{{ record.actual_cost ? `¥${Number(record.actual_cost).toFixed(2)}` : '-' }}</template>
              <template v-if="column.key === 'action'">
                <a-popconfirm title="确定作废此卡?" @confirm="voidCard(record.id)">
                  <a-button type="link" size="small" danger>作废</a-button>
                </a-popconfirm>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="used">
          <template #tab>
            <span>已使用 <a-badge :count="drawerSpec?.used_count" :overflow-count="9999" color="#8c8c8c" /></span>
          </template>
          <a-table :columns="usedColumns" :data-source="drawerCards" :loading="drawerLoading" row-key="id" size="small" :pagination="drawerPagination" @change="handleDrawerTableChange">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'card_number'">
                <SensitiveField :value="record.card_number" :card-id="record.id" field="card_number" />
              </template>
              <template v-if="column.key === 'card_code'">
                <SensitiveField :value="record.card_code" :card-id="record.id" field="card_code" />
              </template>
              <template v-if="column.key === 'used_at'">{{ record.used_at ? dayjs(record.used_at).format('YYYY-MM-DD HH:mm') : '-' }}</template>
              <template v-if="column.key === 'sub_order'">
                <div v-if="record.used_for_sub_order_id || record.used_for_sub_order_no" class="sub-order-info">
                  <div v-if="record.used_for_sub_order_no" class="sub-order-no">{{ record.used_for_sub_order_no }}</div>
                  <div v-if="record.used_for_sub_order_id" class="sub-order-id">ID: {{ record.used_for_sub_order_id.slice(0, 8) }}...</div>
                </div>
                <span v-else class="text-muted">-</span>
              </template>
              <template v-if="column.key === 'buyer'">
                <div v-if="record.used_by_buyer_name || record.used_by_buyer_id" class="buyer-info">
                  <div v-if="record.used_by_buyer_name">{{ record.used_by_buyer_name }}</div>
                  <div v-if="record.used_by_buyer_id" class="buyer-id">{{ record.used_by_buyer_id.slice(0, 8) }}...</div>
                </div>
                <span v-else class="text-muted">-</span>
              </template>
              <template v-if="column.key === 'action'">
                <a-button type="link" size="small" style="color:#fa8c16" @click="openInvalidModal(record)">报告无效</a-button>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="invalid">
          <template #tab>
            <span>
              已失效
              <a-badge v-if="drawerSpec?.invalid_count > 0" :count="drawerSpec.invalid_count" color="#f5222d" />
            </span>
          </template>
          <a-table :columns="invalidColumns" :data-source="drawerCards" :loading="drawerLoading" row-key="id" size="small" :pagination="drawerPagination" @change="handleDrawerTableChange">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'card_number'">
                <SensitiveField :value="record.card_number" :card-id="record.id" field="card_number" />
              </template>
              <template v-if="column.key === 'replacement'">
                <a-tag v-if="record.has_replacement" color="green">已补换</a-tag>
                <a-button v-else type="link" size="small" @click="openReplaceModal(record)">+ 录入补换卡</a-button>
              </template>
              <template v-if="column.key === 'sub_order'">
                <span v-if="record.used_for_sub_order_no">{{ record.used_for_sub_order_no }}</span>
                <span v-else class="text-muted">-</span>
              </template>
              <template v-if="column.key === 'buyer'">
                <span v-if="record.used_by_buyer_name">{{ record.used_by_buyer_name }}</span>
                <span v-else class="text-muted">-</span>
              </template>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="voided">
          <template #tab>已作废</template>
          <a-table :columns="availableColumns" :data-source="drawerCards" :loading="drawerLoading" row-key="id" size="small" :pagination="drawerPagination" @change="handleDrawerTableChange">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'card_number'">
                <SensitiveField :value="record.card_number" :card-id="record.id" field="card_number" />
              </template>
              <template v-if="column.key === 'card_code'">
                <SensitiveField :value="record.card_code" :card-id="record.id" field="card_code" />
              </template>
              <template v-if="column.key === 'created_at'">{{ record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD') : '-' }}</template>
              <template v-if="column.key === 'actual_cost'">{{ record.actual_cost ? `¥${Number(record.actual_cost).toFixed(2)}` : '-' }}</template>
              <template v-if="column.key === 'action'"><span class="text-muted">—</span></template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-drawer>

    <!-- 报告无效 Modal -->
    <a-modal v-model:open="invalidModalOpen" title="报告卡片无效" @ok="handleReportInvalid" :confirm-loading="reportingInvalid" ok-text="确认标记为已失效">
      <a-alert type="warning" message="标记后该卡状态变为「已失效」，您可以随后录入供应商补换的新卡。" style="margin-bottom:16px" />
      <a-form layout="vertical">
        <a-form-item label="无效原因">
          <a-input v-model:value="invalidForm.reason" placeholder="例：卡已被使用 / 余额不足 / 卡号错误" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 录入补换卡 Modal -->
    <a-modal v-model:open="replaceModalOpen" title="录入供应商补换卡" @ok="handleReplaceCard" :confirm-loading="replacingCard" ok-text="保存补换卡" width="500px">
      <a-alert type="info" message="新卡将自动关联原无效卡的子订单信息，状态设为「未使用」。" style="margin-bottom:16px" />
      <a-form layout="vertical">
        <a-form-item label="新卡号">
          <a-input v-model:value="replaceForm.card_number" placeholder="输入供应商提供的新卡号" />
        </a-form-item>
        <a-form-item label="新卡密">
          <a-input v-model:value="replaceForm.card_code" placeholder="输入供应商提供的新卡密" />
        </a-form-item>
        <a-form-item label="购买汇率">
          <a-input-number v-model:value="replaceForm.exchange_rate" :min="1" :precision="4" style="width:100%" />
        </a-form-item>
        <a-form-item label="实际成本（CNY）">
          <a-input-number v-model:value="replaceForm.actual_cost" :min="0" :precision="2" style="width:100%" placeholder="选填" />
        </a-form-item>
      </a-form>
    </a-modal>

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
        <a-form-item label="卡号列表（每行一张，格式: 卡号,卡密）">
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
import { ref, reactive, onMounted, defineComponent, h } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ImportOutlined, EyeOutlined, EyeInvisibleOutlined, CopyOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

// ── Sensitive field component ──────────────────────────────────────────────
const SensitiveField = defineComponent({
  props: { value: String, cardId: String, field: String },
  setup(props) {
    const revealed = ref(false)
    function mask(val: string) {
      if (!val) return '-'
      if (val.length <= 8) return val.slice(0, 2) + '****'
      return val.slice(0, 4) + '-****-' + val.slice(-4)
    }
    async function toggle() {
      if (!revealed.value) {
        await supabase.from('gift_card_access_logs').insert([{ gift_card_id: props.cardId, action: 'reveal', field: props.field, operator: 'operator' }])
      }
      revealed.value = !revealed.value
    }
    async function copy() {
      if (!props.value) return
      try {
        await navigator.clipboard.writeText(props.value)
        message.success('已复制')
        await supabase.from('gift_card_access_logs').insert([{ gift_card_id: props.cardId, action: 'copy', field: props.field, operator: 'operator' }])
      } catch { message.error('复制失败') }
    }
    return () => h('span', { style: 'display:inline-flex;align-items:center;gap:2px' }, [
      h('span', { style: 'font-family:monospace;font-size:12px;color:#333' }, revealed.value ? props.value : mask(props.value || '')),
      h('a', { onClick: toggle, style: 'color:#bbb;padding:0 3px;cursor:pointer' }, [revealed.value ? h(EyeInvisibleOutlined) : h(EyeOutlined)]),
      h('a', { onClick: copy, style: 'color:#bbb;padding:0 3px;cursor:pointer' }, [h(CopyOutlined)]),
    ])
  },
})

// ── State ──────────────────────────────────────────────────────────────────
const specsLoading = ref(false)
const drawerLoading = ref(false)
const importing = ref(false)
const singleImporting = ref(false)
const reportingInvalid = ref(false)
const replacingCard = ref(false)

const importOpen = ref(false)
const singleImportOpen = ref(false)
const drawerOpen = ref(false)
const invalidModalOpen = ref(false)
const replaceModalOpen = ref(false)

const filterCountry = ref('')
const drawerTab = ref('available')

const specs = ref<any[]>([])
const drawerCards = ref<any[]>([])
const drawerSpec = ref<any>(null)
const drawerPagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })

const activeInvalidCard = ref<any>(null)
const activeReplaceCard = ref<any>(null)

const faceValueOptions = [1, 2, 3, 5, 10, 11, 15, 20, 25, 30, 50, 100]

const stats = reactive({ us_total: 0, de_total: 0, uk_total: 0, ca_total: 0, today_used: 0, total_remaining: 0 })

const countryColor: Record<string, string> = { US: 'blue', DE: 'orange', UK: 'cyan', CA: 'geekblue' }
const countryLabel: Record<string, string> = { US: '美国 US', DE: '德国 DE', UK: '英国 UK', CA: '加拿大 CA' }

const invalidForm = reactive({ reason: '' })
const replaceForm = reactive({ card_number: '', card_code: '', exchange_rate: 7.25, actual_cost: null as number | null })

const importForm = reactive({ country: 'US', face_value_usd: 10, supplier: '', exchange_rate: 7.25, actual_cost: null as number | null, text: '' })
const singleForm = reactive({ country: 'US', face_value_usd: 10, card_number: '', card_code: '', supplier: '', exchange_rate: 7.25, actual_cost: null as number | null })

// ── Columns ────────────────────────────────────────────────────────────────
const specColumns = [
  { title: '国家', key: 'country', width: 120 },
  { title: '面值', key: 'face_value_usd', width: 100 },
  { title: '可用库存', key: 'available_count', dataIndex: 'available_count', width: 100 },
  { title: '已使用', dataIndex: 'used_count', key: 'used_count', width: 90 },
  { title: '已失效', key: 'invalid_count', width: 90 },
  { title: '平均汇率', dataIndex: 'avg_exchange_rate', key: 'avg_exchange_rate', width: 90 },
  { title: '操作', key: 'action', width: 100 },
]

const availableColumns = [
  { title: '卡号', key: 'card_number', width: 220 },
  { title: '卡密', key: 'card_code', width: 220 },
  { title: '入库时间', key: 'created_at', width: 100 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 100 },
  { title: '购买汇率', dataIndex: 'exchange_rate', key: 'exchange_rate', width: 80 },
  { title: '实际成本', key: 'actual_cost', width: 90 },
  { title: '操作', key: 'action', width: 70, fixed: 'right' },
]

const usedColumns = [
  { title: '卡号', key: 'card_number', width: 200 },
  { title: '卡密', key: 'card_code', width: 200 },
  { title: '使用日期', key: 'used_at', width: 130 },
  { title: '子订单', key: 'sub_order', width: 140 },
  { title: '买手', key: 'buyer', width: 120 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 90 },
  { title: '操作', key: 'action', width: 90, fixed: 'right' },
]

const invalidColumns = [
  { title: '卡号', key: 'card_number', width: 200 },
  { title: '无效原因', dataIndex: 'invalid_reason', key: 'invalid_reason', width: 140 },
  { title: '子订单', key: 'sub_order', width: 130 },
  { title: '买手', key: 'buyer', width: 110 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 90 },
  { title: '补换状态', key: 'replacement', width: 120 },
]

// ── Helpers ────────────────────────────────────────────────────────────────
function currencySymbol(country: string) {
  const map: Record<string, string> = { US: 'USD', DE: 'EUR', UK: 'GBP', CA: 'CAD' }
  return map[country] || ''
}

function drawerStatusForTab() {
  const map: Record<string, string> = { available: '未使用', used: '已使用', invalid: '已失效', voided: '已作废' }
  return map[drawerTab.value] || '未使用'
}

// ── Data loading ───────────────────────────────────────────────────────────
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
    if (c.status === '已使用' && c.used_at && c.used_at.startsWith(today)) todayUsed++
  }
  stats.us_total = us; stats.de_total = de; stats.uk_total = uk; stats.ca_total = ca
  stats.today_used = todayUsed; stats.total_remaining = remaining
}

async function loadSpecs() {
  specsLoading.value = true
  try {
    let query = supabase.from('gift_cards').select('id, country, face_value_usd, status, exchange_rate, replacement_for_id')
    if (filterCountry.value) query = query.eq('country', filterCountry.value)
    const { data, error } = await query
    if (error) throw error
    const map: Record<string, any> = {}
    for (const card of (data || [])) {
      const key = `${card.country}_${card.face_value_usd}`
      if (!map[key]) {
        map[key] = { spec_key: key, country: card.country, face_value_usd: card.face_value_usd, available_count: 0, used_count: 0, voided_count: 0, invalid_count: 0, rate_sum: 0, rate_count: 0 }
      }
      if (card.status === '未使用') map[key].available_count++
      if (card.status === '已使用') map[key].used_count++
      if (card.status === '已作废') map[key].voided_count++
      if (card.status === '已失效') map[key].invalid_count++
      if (card.exchange_rate) { map[key].rate_sum += Number(card.exchange_rate); map[key].rate_count++ }
    }
    for (const item of Object.values(map)) {
      item.avg_exchange_rate = item.rate_count > 0 ? (item.rate_sum / item.rate_count).toFixed(4) : '-'
    }
    specs.value = Object.values(map).sort((a, b) => {
      if (a.country !== b.country) return a.country.localeCompare(b.country)
      return a.face_value_usd - b.face_value_usd
    })
  } finally {
    specsLoading.value = false
  }
}

function openDetailDrawer(spec: any) {
  drawerSpec.value = spec
  drawerTab.value = 'available'
  drawerPagination.value.current = 1
  drawerOpen.value = true
  loadDrawerCards()
}

async function loadDrawerCards() {
  if (!drawerSpec.value) return
  drawerLoading.value = true
  try {
    const status = drawerStatusForTab()
    let query = supabase.from('gift_cards')
      .select('*', { count: 'exact' })
      .eq('country', drawerSpec.value.country)
      .eq('face_value_usd', drawerSpec.value.face_value_usd)
      .eq('status', status)
      .order('created_at', { ascending: false })
    const from = (drawerPagination.value.current - 1) * drawerPagination.value.pageSize
    query = query.range(from, from + drawerPagination.value.pageSize - 1)
    const { data, count, error } = await query
    if (error) throw error

    let cards = data || []
    if (status === '已失效') {
      const ids = cards.map((c: any) => c.id)
      if (ids.length > 0) {
        const { data: repData } = await supabase.from('gift_cards').select('replacement_for_id').in('replacement_for_id', ids)
        const replacedIds = new Set((repData || []).map((r: any) => r.replacement_for_id))
        cards = cards.map((c: any) => ({ ...c, has_replacement: replacedIds.has(c.id) }))
      }
    }

    drawerCards.value = cards
    drawerPagination.value.total = count || 0
  } finally {
    drawerLoading.value = false
  }
}

function handleDrawerTabChange() {
  drawerPagination.value.current = 1
  loadDrawerCards()
}

function handleDrawerTableChange(pag: any) {
  drawerPagination.value.current = pag.current
  drawerPagination.value.pageSize = pag.pageSize
  loadDrawerCards()
}

// ── Void ───────────────────────────────────────────────────────────────────
async function voidCard(id: string) {
  const { error } = await supabase.from('gift_cards').update({ status: '已作废' }).eq('id', id)
  if (error) { message.error('操作失败'); return }
  message.success('已作废')
  loadDrawerCards(); loadStats(); loadSpecs()
}

// ── Report invalid ─────────────────────────────────────────────────────────
function openInvalidModal(record: any) {
  activeInvalidCard.value = record
  invalidForm.reason = ''
  invalidModalOpen.value = true
}

async function handleReportInvalid() {
  if (!activeInvalidCard.value) return
  reportingInvalid.value = true
  try {
    const { error } = await supabase.from('gift_cards').update({ status: '已失效', invalid_reason: invalidForm.reason }).eq('id', activeInvalidCard.value.id)
    if (error) throw error
    message.success('已标记为无效')
    invalidModalOpen.value = false
    loadDrawerCards(); loadStats(); loadSpecs()
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    reportingInvalid.value = false
  }
}

// ── Replace card ───────────────────────────────────────────────────────────
function openReplaceModal(record: any) {
  activeReplaceCard.value = record
  replaceForm.card_number = ''
  replaceForm.card_code = ''
  replaceForm.exchange_rate = record.exchange_rate || 7.25
  replaceForm.actual_cost = null
  replaceModalOpen.value = true
}

async function handleReplaceCard() {
  if (!replaceForm.card_number) { message.warning('请输入新卡号'); return }
  const orig = activeReplaceCard.value
  replacingCard.value = true
  try {
    const { error } = await supabase.from('gift_cards').insert([{
      card_number: replaceForm.card_number,
      card_code: replaceForm.card_code,
      country: orig.country,
      face_value_usd: orig.face_value_usd,
      supplier: orig.supplier,
      exchange_rate: replaceForm.exchange_rate,
      actual_cost: replaceForm.actual_cost ?? 0,
      status: '未使用',
      replacement_for_id: orig.id,
      used_for_sub_order_id: orig.used_for_sub_order_id,
      used_for_sub_order_no: orig.used_for_sub_order_no,
    }])
    if (error) throw error
    message.success('补换卡已录入，状态为未使用')
    replaceModalOpen.value = false
    loadDrawerCards(); loadStats(); loadSpecs()
  } catch (e: any) {
    message.error('录入失败：' + e.message)
  } finally {
    replacingCard.value = false
  }
}

// ── Import ─────────────────────────────────────────────────────────────────
async function handleImport() {
  const lines = importForm.text.split('\n').filter(l => l.trim())
  if (!lines.length) { message.warning('请输入卡号数据'); return }
  importing.value = true
  try {
    const rows = lines.map(line => {
      const [card_number, card_code] = line.split(',').map(s => s.trim())
      return { card_number, card_code: card_code || '', country: importForm.country, face_value_usd: importForm.face_value_usd, supplier: importForm.supplier, exchange_rate: importForm.exchange_rate, actual_cost: importForm.actual_cost ?? 0, status: '未使用' }
    })
    const { error } = await supabase.from('gift_cards').insert(rows)
    if (error) throw error
    message.success(`成功导入 ${rows.length} 张礼品卡`)
    importOpen.value = false; importForm.text = ''
    loadSpecs(); loadStats()
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
    const { error } = await supabase.from('gift_cards').insert([{ card_number: singleForm.card_number, card_code: singleForm.card_code, country: singleForm.country, face_value_usd: singleForm.face_value_usd, supplier: singleForm.supplier, exchange_rate: singleForm.exchange_rate, actual_cost: singleForm.actual_cost ?? 0, status: '未使用' }])
    if (error) throw error
    message.success('导入成功')
    singleImportOpen.value = false; singleForm.card_number = ''; singleForm.card_code = ''
    loadSpecs(); loadStats()
  } catch (e: any) {
    message.error('导入失败：' + e.message)
  } finally {
    singleImporting.value = false
  }
}

onMounted(() => { loadStats(); loadSpecs() })
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

.kpi-label { font-size: 12px; color: #888; margin-bottom: 8px; }
.kpi-value { font-size: 22px; font-weight: 700; color: #1677ff; }

.today-stats { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 4px; }
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

.count-available { color: #52c41a; font-weight: 700; font-size: 15px; }
.count-invalid { color: #f5222d; font-weight: 600; }
.count-zero { color: #bbb; }

.sub-order-info, .buyer-info { line-height: 1.4; }
.sub-order-no { font-size: 12px; font-weight: 600; color: #333; }
.sub-order-id, .buyer-id { font-size: 11px; color: #999; }
.text-muted { color: #bbb; }
</style>
