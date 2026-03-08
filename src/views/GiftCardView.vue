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
      <div class="kpi-card">
        <div class="kpi-label">今日动态</div>
        <div class="today-stats">
          <span class="today-item used">今日已领用 <strong>{{ stats.today_used }}</strong> 张</span>
          <span class="divider">|</span>
          <span class="today-item remain">剩余可用 <strong>{{ stats.total_remaining }}</strong> 张</span>
        </div>
      </div>
    </div>

    <!-- 主面板：搜索 + Tab -->
    <div class="card-panel">
      <div class="toolbar">
        <a-input-search
          v-model:value="searchCode"
          placeholder="搜索卡密 / 卡号"
          style="width:260px"
          allow-clear
          @search="handleSearch"
          @change="onSearchChange"
        />
        <a-select v-model:value="filterCountry" style="width:120px" allow-clear placeholder="国家" @change="handleSearch">
          <a-select-option value="US">美国 US</a-select-option>
          <a-select-option value="DE">德国 DE</a-select-option>
          <a-select-option value="UK">英国 UK</a-select-option>
          <a-select-option value="CA">加拿大 CA</a-select-option>
        </a-select>
        <a-select v-model:value="filterValue" style="width:130px" allow-clear placeholder="面值" @change="handleSearch">
          <a-select-option v-for="v in faceValueOptions" :key="v" :value="v">{{ v }}</a-select-option>
        </a-select>
      </div>

      <!-- 搜索结果模式 -->
      <template v-if="isSearchMode">
        <div class="search-result-tip">
          搜索 "<strong>{{ lastSearchCode }}</strong>" 的结果
          <a-button type="link" size="small" @click="clearSearch">清除</a-button>
        </div>
        <a-table :columns="searchResultColumns" :data-source="searchResults" :loading="searchLoading" row-key="id" size="small" :pagination="{ pageSize: 20 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'card_number'">
              <SensitiveField :value="record.card_number" :card-id="record.id" field="card_number" />
            </template>
            <template v-if="column.key === 'card_code'">
              <SensitiveField :value="record.card_code" :card-id="record.id" field="card_code" />
            </template>
            <template v-if="column.key === 'country'">
              <a-tag :color="countryColor[record.country]">{{ record.country }}</a-tag>
            </template>
            <template v-if="column.key === 'face_value_usd'">{{ record.face_value_usd }} {{ currencySymbol(record.country) }}</template>
            <template v-if="column.key === 'status'">
              <a-tag :color="statusColor[record.status]">{{ record.status }}</a-tag>
            </template>
            <template v-if="column.key === 'used_at'">{{ record.used_at ? dayjs(record.used_at).format('MM-DD HH:mm') : '-' }}</template>
          </template>
        </a-table>
      </template>

      <!-- 规格列表模式 -->
      <template v-else>
        <a-tabs v-model:activeKey="mainTab" @change="handleMainTabChange">
          <a-tab-pane key="available">
            <template #tab><span>可用库存 <a-badge :count="stats.total_remaining" :overflow-count="9999" color="#52c41a" /></span></template>
            <a-table :columns="specColumns" :data-source="filteredSpecs('available')" :loading="specsLoading" row-key="spec_key" size="middle" :pagination="false">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'country'">
                  <a-tag :color="countryColor[record.country]">{{ countryLabel[record.country] }}</a-tag>
                </template>
                <template v-if="column.key === 'face_value_usd'">{{ record.face_value_usd }} {{ currencySymbol(record.country) }}</template>
                <template v-if="column.key === 'available_count'"><span class="count-available">{{ record.available_count }}</span></template>
                <template v-if="column.key === 'action'">
                  <a-button type="link" size="small" @click="openDetailDrawer(record, 'available')">查看明细</a-button>
                </template>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane key="used">
            <template #tab><span>已使用 <a-badge :count="stats.total_used" :overflow-count="9999" color="#8c8c8c" /></span></template>
            <a-table :columns="specColumnsUsed" :data-source="filteredSpecs('used')" :loading="specsLoading" row-key="spec_key" size="middle" :pagination="false">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'country'">
                  <a-tag :color="countryColor[record.country]">{{ countryLabel[record.country] }}</a-tag>
                </template>
                <template v-if="column.key === 'face_value_usd'">{{ record.face_value_usd }} {{ currencySymbol(record.country) }}</template>
                <template v-if="column.key === 'used_count'"><span class="count-used">{{ record.used_count }}</span></template>
                <template v-if="column.key === 'action'">
                  <a-button type="link" size="small" @click="openDetailDrawer(record, 'used')">查看明细</a-button>
                </template>
              </template>
            </a-table>
          </a-tab-pane>

          <a-tab-pane key="voided">
            <template #tab>已作废</template>
            <a-table :columns="specColumnsVoided" :data-source="filteredSpecs('voided')" :loading="specsLoading" row-key="spec_key" size="middle" :pagination="false">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'country'">
                  <a-tag :color="countryColor[record.country]">{{ countryLabel[record.country] }}</a-tag>
                </template>
                <template v-if="column.key === 'face_value_usd'">{{ record.face_value_usd }} {{ currencySymbol(record.country) }}</template>
                <template v-if="column.key === 'action'">
                  <a-button type="link" size="small" @click="openDetailDrawer(record, 'voided')">查看明细</a-button>
                </template>
              </template>
            </a-table>
          </a-tab-pane>
        </a-tabs>
      </template>
    </div>

    <!-- 明细抽屉 -->
    <a-drawer
      v-model:open="drawerOpen"
      :title="`${drawerSpec?.country} · ${drawerSpec?.face_value_usd} ${currencySymbol(drawerSpec?.country)} — ${drawerTabLabel}`"
      width="1020"
      placement="right"
    >
      <!-- 可用 Tab 明细 -->
      <template v-if="drawerMode === 'available'">
        <a-table :columns="detailAvailableColumns" :data-source="drawerCards" :loading="drawerLoading" row-key="id" size="small" :pagination="drawerPagination" @change="handleDrawerTableChange">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'card_number'"><SensitiveField :value="record.card_number" :card-id="record.id" field="card_number" /></template>
            <template v-if="column.key === 'card_code'"><SensitiveField :value="record.card_code" :card-id="record.id" field="card_code" /></template>
            <template v-if="column.key === 'created_at'">{{ record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD') : '-' }}</template>
            <template v-if="column.key === 'actual_cost'">{{ record.actual_cost ? `¥${Number(record.actual_cost).toFixed(2)}` : '-' }}</template>
            <template v-if="column.key === 'action'">
              <a-popconfirm title="确定作废此卡?" @confirm="openVoidModal(record)">
                <a-button type="link" size="small" danger>作废</a-button>
              </a-popconfirm>
            </template>
          </template>
        </a-table>
      </template>

      <!-- 已使用 Tab 明细 -->
      <template v-if="drawerMode === 'used'">
        <a-table :columns="detailUsedColumns" :data-source="drawerCards" :loading="drawerLoading" row-key="id" size="small" :pagination="drawerPagination" @change="handleDrawerTableChange">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'card_number'"><SensitiveField :value="record.card_number" :card-id="record.id" field="card_number" /></template>
            <template v-if="column.key === 'card_code'"><SensitiveField :value="record.card_code" :card-id="record.id" field="card_code" /></template>
            <template v-if="column.key === 'used_at'">{{ record.used_at ? dayjs(record.used_at).format('YYYY-MM-DD HH:mm') : '-' }}</template>
            <template v-if="column.key === 'sub_order'">
              <div v-if="record.used_for_sub_order_no || record.used_for_sub_order_id">
                <div v-if="record.used_for_sub_order_no" class="sub-order-no">{{ record.used_for_sub_order_no }}</div>
                <div v-if="record.used_for_sub_order_id" class="id-text">{{ record.used_for_sub_order_id.slice(0, 8) }}…</div>
              </div>
              <span v-else class="text-muted">-</span>
            </template>
            <template v-if="column.key === 'buyer'">
              <div v-if="record.used_by_buyer_name || record.used_by_buyer_id">
                <div v-if="record.used_by_buyer_name" class="name-text">{{ record.used_by_buyer_name }}</div>
                <div v-if="record.used_by_buyer_id" class="id-text">{{ record.used_by_buyer_id.slice(0, 8) }}…</div>
              </div>
              <span v-else class="text-muted">-</span>
            </template>
            <template v-if="column.key === 'used_by_operator'">
              <span v-if="record.used_by_operator">{{ record.used_by_operator }}</span>
              <span v-else class="text-muted">-</span>
            </template>
            <template v-if="column.key === 'refund_operator'">
              <div v-if="record.refund_operator">
                <div class="name-text">{{ record.refund_operator }}</div>
                <div v-if="record.refund_at" class="id-text">{{ dayjs(record.refund_at).format('MM-DD HH:mm') }}</div>
              </div>
              <span v-else class="text-muted">-</span>
            </template>
            <template v-if="column.key === 'action'">
              <a-button type="link" size="small" style="color:#fa8c16;padding:0" @click="openVoidModal(record, true)">标记无效</a-button>
            </template>
          </template>
        </a-table>
      </template>

      <!-- 已作废 Tab 明细 -->
      <template v-if="drawerMode === 'voided'">
        <a-table :columns="detailVoidedColumns" :data-source="drawerCards" :loading="drawerLoading" row-key="id" size="small" :pagination="drawerPagination" @change="handleDrawerTableChange">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'card_number'"><SensitiveField :value="record.card_number" :card-id="record.id" field="card_number" /></template>
            <template v-if="column.key === 'card_code'"><SensitiveField :value="record.card_code" :card-id="record.id" field="card_code" /></template>
            <template v-if="column.key === 'created_at'">{{ record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD') : '-' }}</template>
            <template v-if="column.key === 'replacement'">
              <a-tag v-if="record.has_replacement" color="green">已补换</a-tag>
              <a-button v-else type="link" size="small" style="padding:0" @click="openReplaceModal(record)">+ 录入补换卡</a-button>
            </template>
          </template>
        </a-table>
      </template>
    </a-drawer>

    <!-- 作废 Modal（可用 or 标记无效） -->
    <a-modal v-model:open="voidModalOpen" :title="voidIsInvalid ? '标记卡片无效' : '作废礼品卡'" @ok="handleVoid" :confirm-loading="voiding" :ok-text="voidIsInvalid ? '确认标记无效' : '确认作废'">
      <a-alert v-if="voidIsInvalid" type="warning" message="该卡将被作废，您可以在「已作废」列表中为其录入供应商补换的新卡。" style="margin-bottom:14px" show-icon />
      <a-form layout="vertical">
        <a-form-item :label="voidIsInvalid ? '无效原因' : '作废原因（选填）'">
          <a-input v-model:value="voidForm.reason" :placeholder="voidIsInvalid ? '例：卡已被使用 / 余额不足 / 卡号错误' : '选填'" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 录入补换卡 Modal -->
    <a-modal v-model:open="replaceModalOpen" title="录入供应商补换卡" @ok="handleReplaceCard" :confirm-loading="replacingCard" ok-text="保存补换卡" width="500px">
      <a-alert type="info" message="新卡将自动关联原卡的子订单信息，状态为「未使用」。" style="margin-bottom:14px" show-icon />
      <a-form layout="vertical">
        <a-form-item label="新卡号" required>
          <a-input v-model:value="replaceForm.card_number" placeholder="供应商提供的新卡号" />
        </a-form-item>
        <a-form-item label="新卡密">
          <a-input v-model:value="replaceForm.card_code" placeholder="供应商提供的新卡密" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="购买汇率">
              <a-input-number v-model:value="replaceForm.exchange_rate" :min="1" :precision="4" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="实际成本（CNY）">
              <a-input-number v-model:value="replaceForm.actual_cost" :min="0" :precision="2" style="width:100%" placeholder="选填" />
            </a-form-item>
          </a-col>
        </a-row>
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
import { ref, reactive, computed, onMounted, defineComponent, h } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ImportOutlined, EyeOutlined, EyeInvisibleOutlined, CopyOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

// ── Inline sensitive field component ──────────────────────────────────────
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

// ── State ─────────────────────────────────────────────────────────────────
const specsLoading = ref(false)
const drawerLoading = ref(false)
const searchLoading = ref(false)
const importing = ref(false)
const singleImporting = ref(false)
const voiding = ref(false)
const replacingCard = ref(false)

const importOpen = ref(false)
const singleImportOpen = ref(false)
const drawerOpen = ref(false)
const voidModalOpen = ref(false)
const replaceModalOpen = ref(false)

const mainTab = ref<'available' | 'used' | 'voided'>('available')
const filterCountry = ref('')
const filterValue = ref<number | null>(null)
const searchCode = ref('')
const lastSearchCode = ref('')
const isSearchMode = ref(false)

const specs = ref<any[]>([])
const searchResults = ref<any[]>([])
const drawerCards = ref<any[]>([])
const drawerSpec = ref<any>(null)
const drawerMode = ref<'available' | 'used' | 'voided'>('available')
const drawerPagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })

const activeVoidCard = ref<any>(null)
const voidIsInvalid = ref(false)
const activeReplaceCard = ref<any>(null)

const faceValueOptions = [1, 2, 3, 5, 10, 11, 15, 20, 25, 30, 50, 100]

const stats = reactive({ us_total: 0, de_total: 0, uk_total: 0, ca_total: 0, today_used: 0, total_remaining: 0, total_used: 0 })

const countryColor: Record<string, string> = { US: 'blue', DE: 'orange', UK: 'cyan', CA: 'geekblue' }
const countryLabel: Record<string, string> = { US: '美国 US', DE: '德国 DE', UK: '英国 UK', CA: '加拿大 CA' }
const statusColor: Record<string, string> = { '未使用': 'green', '已使用': 'default', '已作废': 'red' }

const voidForm = reactive({ reason: '' })
const replaceForm = reactive({ card_number: '', card_code: '', exchange_rate: 7.25, actual_cost: null as number | null })
const importForm = reactive({ country: 'US', face_value_usd: 10, supplier: '', exchange_rate: 7.25, actual_cost: null as number | null, text: '' })
const singleForm = reactive({ country: 'US', face_value_usd: 10, card_number: '', card_code: '', supplier: '', exchange_rate: 7.25, actual_cost: null as number | null })

// ── Column definitions ────────────────────────────────────────────────────
const specColumns = [
  { title: '国家', key: 'country', width: 120 },
  { title: '面值', key: 'face_value_usd', width: 110 },
  { title: '可用库存', key: 'available_count', dataIndex: 'available_count', width: 100 },
  { title: '平均汇率', dataIndex: 'avg_exchange_rate', key: 'avg_exchange_rate', width: 100 },
  { title: '操作', key: 'action', width: 100 },
]
const specColumnsUsed = [
  { title: '国家', key: 'country', width: 120 },
  { title: '面值', key: 'face_value_usd', width: 110 },
  { title: '已使用数量', key: 'used_count', dataIndex: 'used_count', width: 110 },
  { title: '平均汇率', dataIndex: 'avg_exchange_rate', key: 'avg_exchange_rate', width: 100 },
  { title: '操作', key: 'action', width: 100 },
]
const specColumnsVoided = [
  { title: '国家', key: 'country', width: 120 },
  { title: '面值', key: 'face_value_usd', width: 110 },
  { title: '已作废数量', dataIndex: 'voided_count', key: 'voided_count', width: 110 },
  { title: '操作', key: 'action', width: 100 },
]

const detailAvailableColumns = [
  { title: '卡号', key: 'card_number', width: 210 },
  { title: '卡密', key: 'card_code', width: 210 },
  { title: '入库时间', key: 'created_at', width: 100 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 100 },
  { title: '购买汇率', dataIndex: 'exchange_rate', key: 'exchange_rate', width: 80 },
  { title: '实际成本', key: 'actual_cost', width: 90 },
  { title: '操作', key: 'action', width: 70, fixed: 'right' },
]

const detailUsedColumns = [
  { title: '卡号', key: 'card_number', width: 190 },
  { title: '卡密', key: 'card_code', width: 190 },
  { title: '使用日期', key: 'used_at', width: 120 },
  { title: '关联子订单', key: 'sub_order', width: 130 },
  { title: '买手', key: 'buyer', width: 110 },
  { title: '领用操作人', key: 'used_by_operator', width: 100 },
  { title: '退款操作人', key: 'refund_operator', width: 110 },
  { title: '操作', key: 'action', width: 80, fixed: 'right' },
]

const detailVoidedColumns = [
  { title: '卡号', key: 'card_number', width: 220 },
  { title: '卡密', key: 'card_code', width: 220 },
  { title: '入库时间', key: 'created_at', width: 100 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 100 },
  { title: '作废原因', dataIndex: 'void_reason', key: 'void_reason', width: 150 },
  { title: '补换状态', key: 'replacement', width: 120 },
]

const searchResultColumns = [
  { title: '国家', key: 'country', width: 90 },
  { title: '面值', key: 'face_value_usd', width: 100 },
  { title: '卡号', key: 'card_number', width: 210 },
  { title: '卡密', key: 'card_code', width: 210 },
  { title: '状态', key: 'status', width: 90 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 100 },
  { title: '使用日期', key: 'used_at', width: 120 },
]

// ── Computed ──────────────────────────────────────────────────────────────
const drawerTabLabel = computed(() => {
  return { available: '可用库存', used: '已使用', voided: '已作废' }[drawerMode.value] || ''
})

function filteredSpecs(mode: 'available' | 'used' | 'voided') {
  return specs.value.filter(s => {
    if (filterCountry.value && s.country !== filterCountry.value) return false
    if (filterValue.value && s.face_value_usd !== filterValue.value) return false
    if (mode === 'available') return s.available_count > 0
    if (mode === 'used') return s.used_count > 0
    if (mode === 'voided') return s.voided_count > 0
    return true
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────
function currencySymbol(country: string) {
  const map: Record<string, string> = { US: 'USD', DE: 'EUR', UK: 'GBP', CA: 'CAD' }
  return map[country] || ''
}

// ── Search ────────────────────────────────────────────────────────────────
function onSearchChange() {
  if (!searchCode.value) clearSearch()
}

async function handleSearch() {
  if (!searchCode.value.trim() && !filterCountry.value && !filterValue.value) {
    clearSearch(); return
  }
  if (!searchCode.value.trim()) {
    isSearchMode.value = false; return
  }
  isSearchMode.value = true
  lastSearchCode.value = searchCode.value.trim()
  searchLoading.value = true
  try {
    let query = supabase.from('gift_cards')
      .select('id, country, face_value_usd, card_number, card_code, status, supplier, used_at, used_by_buyer_name, used_by_operator')
      .or(`card_code.ilike.%${lastSearchCode.value}%,card_number.ilike.%${lastSearchCode.value}%`)
      .order('created_at', { ascending: false })
      .limit(50)
    if (filterCountry.value) query = query.eq('country', filterCountry.value)
    if (filterValue.value) query = query.eq('face_value_usd', filterValue.value)
    const { data, error } = await query
    if (error) throw error
    searchResults.value = data || []
  } finally {
    searchLoading.value = false
  }
}

function clearSearch() {
  searchCode.value = ''
  isSearchMode.value = false
  searchResults.value = []
}

// ── Stats + Specs ─────────────────────────────────────────────────────────
async function loadStats() {
  const today = dayjs().format('YYYY-MM-DD')
  const { data } = await supabase.from('gift_cards').select('country, face_value_usd, status, used_at')
  if (!data) return
  let us = 0, de = 0, uk = 0, ca = 0, todayUsed = 0, remaining = 0, totalUsed = 0
  for (const c of data) {
    if (c.status === '未使用') {
      if (c.country === 'US') us += Number(c.face_value_usd)
      if (c.country === 'DE') de += Number(c.face_value_usd)
      if (c.country === 'UK') uk += Number(c.face_value_usd)
      if (c.country === 'CA') ca += Number(c.face_value_usd)
      remaining++
    }
    if (c.status === '已使用') {
      totalUsed++
      if (c.used_at && c.used_at.startsWith(today)) todayUsed++
    }
  }
  stats.us_total = us; stats.de_total = de; stats.uk_total = uk; stats.ca_total = ca
  stats.today_used = todayUsed; stats.total_remaining = remaining; stats.total_used = totalUsed
}

async function loadSpecs() {
  specsLoading.value = true
  try {
    const { data, error } = await supabase.from('gift_cards').select('id, country, face_value_usd, status, exchange_rate')
    if (error) throw error
    const map: Record<string, any> = {}
    for (const card of (data || [])) {
      const key = `${card.country}_${card.face_value_usd}`
      if (!map[key]) {
        map[key] = { spec_key: key, country: card.country, face_value_usd: card.face_value_usd, available_count: 0, used_count: 0, voided_count: 0, rate_sum: 0, rate_count: 0 }
      }
      if (card.status === '未使用') map[key].available_count++
      else if (card.status === '已使用') map[key].used_count++
      else if (card.status === '已作废') map[key].voided_count++
      if (card.exchange_rate) { map[key].rate_sum += Number(card.exchange_rate); map[key].rate_count++ }
    }
    for (const item of Object.values(map)) {
      item.avg_exchange_rate = item.rate_count > 0 ? (item.rate_sum / item.rate_count).toFixed(4) : '-'
    }
    specs.value = Object.values(map).sort((a, b) => a.country.localeCompare(b.country) || a.face_value_usd - b.face_value_usd)
  } finally {
    specsLoading.value = false
  }
}

function handleMainTabChange() {
  // tab change only affects which spec rows are shown
}

// ── Drawer ────────────────────────────────────────────────────────────────
function openDetailDrawer(spec: any, mode: 'available' | 'used' | 'voided') {
  drawerSpec.value = spec
  drawerMode.value = mode
  drawerPagination.value.current = 1
  drawerOpen.value = true
  loadDrawerCards()
}

async function loadDrawerCards() {
  if (!drawerSpec.value) return
  drawerLoading.value = true
  const statusMap: Record<string, string> = { available: '未使用', used: '已使用', voided: '已作废' }
  const status = statusMap[drawerMode.value]
  try {
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
    if (drawerMode.value === 'voided' && cards.length > 0) {
      const ids = cards.map((c: any) => c.id)
      const { data: repData } = await supabase.from('gift_cards').select('replacement_for_id').in('replacement_for_id', ids)
      const replacedSet = new Set((repData || []).map((r: any) => r.replacement_for_id))
      cards = cards.map((c: any) => ({ ...c, has_replacement: replacedSet.has(c.id) }))
    }

    drawerCards.value = cards
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

// ── Void ──────────────────────────────────────────────────────────────────
function openVoidModal(record: any, isInvalid = false) {
  activeVoidCard.value = record
  voidIsInvalid.value = isInvalid
  voidForm.reason = ''
  voidModalOpen.value = true
}

async function handleVoid() {
  if (!activeVoidCard.value) return
  voiding.value = true
  try {
    const { error } = await supabase.from('gift_cards').update({ status: '已作废', void_reason: voidForm.reason }).eq('id', activeVoidCard.value.id)
    if (error) throw error
    message.success('已作废')
    voidModalOpen.value = false
    loadDrawerCards(); loadStats(); loadSpecs()
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    voiding.value = false
  }
}

// ── Replace card ──────────────────────────────────────────────────────────
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

// ── Import ────────────────────────────────────────────────────────────────
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
.kpi-card { background: #fff; border-radius: 10px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.kpi-label { font-size: 12px; color: #888; margin-bottom: 8px; }
.kpi-value { font-size: 22px; font-weight: 700; color: #1677ff; }

.today-stats { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.today-item { font-size: 13px; color: #555; }
.today-item.used strong { color: #ff4d4f; }
.today-item.remain strong { color: #52c41a; }
.divider { color: #d9d9d9; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }

.search-result-tip { font-size: 13px; color: #555; margin-bottom: 12px; }

.count-available { color: #52c41a; font-weight: 700; font-size: 15px; }
.count-used { color: #595959; font-weight: 600; }

.sub-order-no { font-size: 12px; font-weight: 600; color: #333; }
.name-text { font-size: 12px; font-weight: 500; color: #333; }
.id-text { font-size: 11px; color: #999; }
.text-muted { color: #bbb; }
</style>
