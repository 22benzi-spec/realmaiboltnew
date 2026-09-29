<template>
  <div class="page-content">
    <div class="page-header">
      <h2 class="page-title">交易流水</h2>
      <div class="header-actions">
        <a-button :disabled="!selectedRowKeys.length" @click="approveSelectedRows">批量审批</a-button>
        <a-button type="primary" @click="openAdd">手动记账</a-button>
        <a-button @click="exportLedger">导出</a-button>
      </div>
    </div>

    <!-- KPI -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-val green">¥{{ formatNum(stats.totalIncome) }}</div>
        <div class="kpi-subval" v-if="stats.totalIncomeUsd > 0">${{ formatNum(stats.totalIncomeUsd) }}</div>
        <div class="kpi-label">收入合计</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val red">¥{{ formatNum(stats.totalExpense) }}</div>
        <div class="kpi-label">支出合计</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val blue">¥{{ formatNum(stats.totalOffset) }}</div>
        <div class="kpi-subval" v-if="stats.offsetOrderCount > 0">{{ stats.offsetOrderCount }} 单</div>
        <div class="kpi-label">账面抵消</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-split">
          <div class="kpi-split-item">
            <div class="kpi-val blue">{{ stats.count }}</div>
            <div class="kpi-label">交易笔数</div>
          </div>
          <div class="kpi-split-divider"></div>
          <div class="kpi-split-item">
            <div class="kpi-val blue">{{ stats.customerCount }}</div>
            <div class="kpi-label">交易对象</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <a-input v-model:value="search" placeholder="搜索对象 / 任务号 / 流水号 / 备注" style="width:240px" allow-clear @change="loadData" />
      <a-select v-model:value="filterPrimaryCategory" placeholder="一级分类" style="width:140px" allow-clear @change="onPrimaryFilterChange">
        <a-select-option v-for="item in primaryCategoryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
      </a-select>
      <a-select v-model:value="filterType" placeholder="二级分类" style="width:150px" allow-clear @change="loadData">
        <a-select-option v-for="item in filterSecondaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
      </a-select>
      <a-select v-model:value="filterDirection" placeholder="收支方向" style="width:110px" allow-clear @change="loadData">
        <a-select-option value="收入">收入</a-select-option>
        <a-select-option value="支出">支出</a-select-option>
        <a-select-option value="账面抵消">账面抵消</a-select-option>
      </a-select>
      <a-select v-model:value="filterCountry" placeholder="国家" style="width:120px" allow-clear @change="loadData">
        <a-select-option v-for="item in ledgerCountryOptions" :key="item" :value="item">{{ item }}</a-select-option>
      </a-select>
      <a-select v-model:value="filterStatus" placeholder="状态" style="width:120px" allow-clear @change="loadData">
        <a-select-option v-for="item in statusOptions" :key="item" :value="item">{{ item }}</a-select-option>
      </a-select>
      <a-range-picker v-model:value="dateRange" @change="loadData" style="width:240px" />
    </div>

    <!-- 表格 -->
    <a-table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="{ current: page, pageSize, total, showSizeChanger: true, showTotal: (t:number) => `共 ${t} 条` }"
      :row-selection="rowSelection"
      row-key="id"
      size="middle"
      :scroll="{ x: 1600 }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'direction'">
          <div class="direction-tags">
            <a-tag v-for="direction in getListDirectionParts(record)" :key="direction" :color="getDirectionColor(direction)">{{ direction }}</a-tag>
          </div>
        </template>
        <template v-if="column.key === 'transaction_type'">
          <div class="type-stack">
            <span class="type-primary">{{ getPrimaryCategoryLabel(record) }}</span>
            <a-tag v-if="record.transaction_type" :color="getTransactionTypeColor(record)">{{ getTransactionTypeLabel(record) }}</a-tag>
          </div>
        </template>
        <template v-if="column.key === 'amount'">
          <div v-if="showSplitOffsetAmount(record)" class="split-amount-with-offset">
            <div class="split-amount-lines">
              <span v-for="line in getSplitCashAmountLines(record)" :key="line.id" class="amount-in">
                +¥{{ formatNum(line.amount) }}
              </span>
            </div>
            <div class="split-offset-side">
              <span class="amount-name">抵消</span>
              <span class="amount-offset">¥{{ formatNum(record._group_offset_amount) }}</span>
            </div>
          </div>
          <div v-else class="amount-stack">
            <template v-if="getMixedAmountLines(record)">
              <span v-for="line in getMixedAmountLines(record)" :key="line.label" :class="line.className">
                <span class="amount-name">{{ line.label }}</span>{{ line.prefix }}¥{{ formatNum(line.amount) }}
              </span>
            </template>
            <template v-else-if="hasAmount(record)">
              <span v-if="Number(record.amount_cny || 0) > 0" :class="getAmountClass(record)">
                {{ getAmountPrefix(record) }}¥{{ formatNum(record.amount_cny) }}
              </span>
              <span v-if="Number(record.amount_usd || 0) > 0" :class="getAmountClass(record)">
                {{ getAmountPrefix(record) }}${{ formatNum(record.amount_usd) }}
              </span>
            </template>
            <span v-else class="text-muted">-</span>
          </div>
        </template>
        <template v-if="column.key === 'countries'">
          <template v-if="showListCountry(record)">
            <a-tooltip v-if="getCountries(record).length > 1" :title="getCountries(record).join('、')">
              <a-tag color="default">{{ getCountrySummary(record) }}</a-tag>
            </a-tooltip>
            <a-tag v-else-if="getCountries(record).length" color="default">{{ getCountrySummary(record) }}</a-tag>
            <span v-else class="text-muted">-</span>
          </template>
          <span v-else class="text-muted">-</span>
        </template>
        <template v-if="column.key === 'order_number'">
          <span v-if="showListTask(record) && getOrderIdSummary(record)">{{ getOrderIdSummary(record) }}</span>
          <span v-else class="text-muted">-</span>
        </template>
        <template v-if="column.key === 'business_summary'">
          <div class="business-summary">
            <span>{{ getBusinessSummary(record) }}</span>
              <span v-if="getBusinessSubSummary(record)" class="business-sub">{{ getBusinessSubSummary(record) }}</span>
          </div>
        </template>
        <template v-if="column.key === 'status'">
          <a-badge :status="statusBadge[record.status] || 'default'" :text="record.status" />
        </template>
        <template v-if="column.key === 'receipt'">
          <a-space v-if="getReceiptUrls(record).length" size="small" wrap>
            <a
              v-for="(url, index) in getReceiptUrls(record)"
              :key="`${url}-${index}`"
              :href="url"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ getReceiptUrls(record).length > 1 ? `查看${index + 1}` : '查看' }}
            </a>
          </a-space>
          <span v-else class="text-muted">-</span>
        </template>
        <template v-if="column.key === 'action'">
          <a-space v-if="canModify(record)">
            <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
            <a-popconfirm v-if="canApprove(record)" :title="record._split_group ? '确认审批通过这组分笔流水？' : '确认审批通过？'" @confirm="approveRow(record)">
              <a-button type="link" size="small" style="color:#059669">审批</a-button>
            </a-popconfirm>
            <a-button type="link" size="small" :disabled="record.status === '已确认'" @click="openEdit(record)">编辑</a-button>
            <a-popconfirm :title="record._split_group ? '确认作废这组分笔流水？' : '确认作废这条流水？'" @confirm="voidSplitRow(record)">
              <a-button type="link" size="small" danger>作废</a-button>
            </a-popconfirm>
          </a-space>
          <a-button v-else type="link" size="small" @click="openDetail(record)">详情</a-button>
        </template>
      </template>
    </a-table>

    <!-- 新增/编辑 弹窗 -->
    <a-modal
      v-model:open="modalOpen"
      :title="editId ? '编辑流水' : '手动记账'"
      width="760px"
      @ok="handleSave"
      :confirm-loading="saving"
    >
      <a-form :model="form" layout="vertical" style="margin-top:8px">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="一级分类" required>
              <a-select v-model:value="form.entry_scope" @change="onScopeChange">
                <a-select-option v-for="item in primaryCategoryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col v-if="!isAdministrativeEntry" :span="12">
            <a-form-item label="二级分类" required>
              <a-select v-model:value="form.transaction_type" @change="onTypeChange">
                <a-select-option v-for="item in manualTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <div class="form-tip">
              {{ isAdministrativeEntry ? '行政办公不设二级分类，请在用途或备注里写清楚具体事项。' : '业务记账可按类型补充对象或任务信息。' }}
            </div>
          </a-col>
          <a-col :span="12">
            <a-form-item label="收支方向">
              <a-select v-model:value="form.direction">
                <a-select-option value="收入">收入</a-select-option>
                <a-select-option value="支出">支出</a-select-option>
                <a-select-option value="账面抵消">账面抵消</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="金额 (CNY)" required>
              <a-input-number v-model:value="form.amount_cny" :min="0" :precision="2" style="width:100%" placeholder="人民币金额" />
            </a-form-item>
          </a-col>
          <a-col v-if="showUsdFields" :span="12">
            <a-form-item label="金额 (USD)">
              <a-input-number v-model:value="form.amount_usd" :min="0" :precision="2" style="width:100%" placeholder="美金金额(可选)" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="交易日期" required>
              <a-input v-model:value="form.transaction_date" placeholder="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="counterpartyLabel">
              <a-input v-model:value="form.customer_name" :placeholder="counterpartyPlaceholder" />
            </a-form-item>
          </a-col>
          <a-col v-if="showOrderNumberField" :span="12">
            <a-form-item label="任务ID">
              <a-input v-model:value="form.order_number" placeholder="任务ID（可选）" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="ownerLabel">
              <a-input v-model:value="form.staff_name" />
            </a-form-item>
          </a-col>
          <a-col v-if="form.direction === '账面抵消'" :span="12">
            <a-form-item label="抵消来源">
              <a-select v-model:value="form.offset_source_type" allow-clear>
                <a-select-option value="客户余款抵消">客户余款抵消</a-select-option>
                <a-select-option value="同事余款抵消">同事余款抵消</a-select-option>
                <a-select-option value="其他抵消">其他抵消</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col v-if="form.direction === '账面抵消'" :span="24">
            <a-form-item label="抵消来源说明">
              <a-input v-model:value="form.offset_source_note" placeholder="例如：上批任务余款抵消本次任务" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="操作人">
              <a-input v-model:value="form.handler_name" placeholder="默认记录当前操作人" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="form.status">
                <a-select-option v-for="item in statusOptions" :key="item" :value="item">{{ item }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="form.notes" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <a-drawer
      v-model:open="detailOpen"
      :title="detailDrawerTitle"
      width="680px"
      :body-style="{ background: '#f5f7fa', padding: '20px' }"
    >
      <div v-if="detailRecord" class="detail-panel">
        <div class="detail-hero">
          <div class="detail-hero-top">
            <div>
              <template v-if="detailRecord._split_receipts?.length">
                <div v-for="line in detailRecord._split_receipts" :key="line.id" class="detail-split-receipt">
                  <div class="detail-amount-line">
                    <span class="detail-amount amount-in">+¥{{ formatNum(line.amount) }}</span>
                    <span class="detail-amount-name">{{ line.no }}</span>
                  </div>
                  <div v-if="detailRecord._split_accounts_differ" class="detail-split-account">{{ line.account || '-' }}</div>
                </div>
                <div v-if="Number(detailRecord._group_offset_amount || 0) > 0" class="detail-amount-line">
                  <span class="detail-amount amount-offset">¥{{ formatNum(detailRecord._group_offset_amount) }}</span>
                  <span class="detail-amount-name">抵消</span>
                </div>
              </template>
              <template v-else-if="getMixedAmountLines(detailRecord)">
                <div v-for="line in getMixedAmountLines(detailRecord)" :key="line.label" class="detail-amount-line">
                  <span class="detail-amount" :class="line.className">{{ line.prefix }}¥{{ formatNum(line.amount) }}</span>
                  <span class="detail-amount-name">{{ line.label }}</span>
                </div>
              </template>
              <div v-else class="detail-amount" :class="getAmountClass(detailRecord)">
                {{ getAmountPrefix(detailRecord) }}¥{{ formatNum(detailRecord.amount_cny) }}
              </div>
              <div class="detail-meta-line">{{ detailRecord.transaction_date || '-' }}</div>
            </div>
            <a-tag :color="getDirectionColor(getDirection(detailRecord))">{{ getDirection(detailRecord) }}</a-tag>
          </div>
        </div>

        <div class="detail-card detail-card-compact">
          <div class="detail-section-title">基础信息</div>
          <div class="detail-info-grid">
            <div class="detail-info-item">
              <span>交易类型</span>
              <strong>{{ getPrimaryCategoryLabel(detailRecord) }}<template v-if="normalizeTransactionCategories(detailRecord).secondary"> / {{ getTransactionTypeLabel(detailRecord) }}</template></strong>
            </div>
            <div class="detail-info-item">
              <span>对象</span>
              <strong>{{ detailRecord.customer_name || '-' }}</strong>
            </div>
            <div v-if="getLandingAccountLabel(detailRecord) && !detailRecord._split_accounts_differ" class="detail-info-item">
              <span>{{ getLandingAccountLabel(detailRecord) }}</span>
              <strong class="mono">{{ getLandingAccount(detailRecord) || '-' }}</strong>
            </div>
            <div v-if="showDetailPaymentAccount(detailRecord)" class="detail-info-item">
              <span>付款账号</span>
              <strong class="mono">{{ getPaymentAccount(detailRecord) || '-' }}</strong>
            </div>
            <div v-if="showDetailTask(detailRecord)" class="detail-info-item">
              <span>任务号</span>
              <strong class="mono">{{ getOrderIdSummary(detailRecord) || '-' }}</strong>
            </div>
            <div v-if="showDetailCountry(detailRecord)" class="detail-info-item">
              <span>国家</span>
              <strong>{{ getCountries(detailRecord).join('、') || '-' }}</strong>
            </div>
            <div v-if="showDetailUsd(detailRecord)" class="detail-info-item">
              <span>外币 / 汇率</span>
              <strong>{{ Number(detailRecord.amount_usd || 0) > 0 ? `$${formatNum(detailRecord.amount_usd)} / ${Number(detailRecord.exchange_rate || 0).toFixed(4)}` : '-' }}</strong>
            </div>
            <div class="detail-info-item">
              <span>申请人</span>
              <strong>{{ detailRecord.staff_name || '-' }}</strong>
            </div>
            <div class="detail-info-item">
              <span>操作人</span>
              <strong>{{ detailRecord.handler_name || '-' }}</strong>
            </div>
            <div class="detail-info-item">
              <span>状态</span>
              <strong>{{ detailRecord.status || '-' }}</strong>
            </div>
          </div>
        </div>

        <div v-if="showDetailTask(detailRecord)" class="detail-card">
          <div class="detail-section-title">业务明细</div>
          <table v-if="getBusinessTaskRows(detailRecord).length" class="detail-merge-table">
            <thead>
              <tr>
                <th>任务号</th>
                <th>国家</th>
                <th v-if="showDetailTypeColumns(detailRecord)">类型</th>
                <th v-if="showDetailTypeColumns(detailRecord)">单量</th>
                <th class="amount">金额</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in getBusinessTaskRows(detailRecord)" :key="index">
                <td v-if="item.showTaskId" class="mono task-cell" :rowspan="item.taskRowSpan">{{ item.taskId || '-' }}</td>
                <td>{{ item.country || '-' }}</td>
                <td v-if="showDetailTypeColumns(detailRecord)">{{ item.type || '-' }}</td>
                <td v-if="showDetailTypeColumns(detailRecord)">{{ item.count }} 单</td>
                <td class="amount"><strong>¥{{ formatNum(item.amount) }}</strong></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="detail-empty">暂无业务明细</div>
        </div>

        <div v-if="showDetailTask(detailRecord) && hasOffsetPart(detailRecord)" class="detail-card">
          <div class="detail-section-title">抵消明细</div>
          <div v-if="getOffsetDetailRows(detailRecord).length" class="breakdown-table">
            <div class="breakdown-table-head">
              <span>抵消来源任务号</span>
              <span>国家</span>
              <span>类型</span>
              <span>单量</span>
              <span>金额</span>
            </div>
            <div v-for="(item, index) in getOffsetDetailRows(detailRecord)" :key="index" class="breakdown-table-row">
              <span class="mono">{{ item.showSourceTaskId ? (item.sourceTaskId || '-') : '' }}</span>
              <span>{{ item.country || '-' }}</span>
              <span>{{ item.type || '-' }}</span>
              <span>{{ item.count }} 单</span>
              <strong>¥{{ formatNum(item.amount) }}</strong>
            </div>
          </div>
          <div v-else class="detail-empty">暂无抵消明细</div>
        </div>

        <div v-if="detailRecord.notes" class="detail-card">
          <div class="detail-section-title">账单备注</div>
          <div class="detail-notes">{{ detailRecord.notes }}</div>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { supabase } from '../lib/supabase'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useCurrentUser } from '../composables/useCurrentUser'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const ledgerRows = ref<any[]>([])
const selectedRowKeys = ref<string[]>([])
const mockRows = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const search = ref('')
const filterPrimaryCategory = ref<string | undefined>(undefined)
const filterType = ref<string | undefined>(undefined)
const filterDirection = ref<string | undefined>(undefined)
const filterCountry = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const stats = reactive({ totalIncome: 0, totalIncomeUsd: 0, totalExpense: 0, totalOffset: 0, offsetOrderCount: 0, count: 0, customerCount: 0 })

const modalOpen = ref(false)
const editId = ref<string | null>(null)
const detailOpen = ref(false)
const detailRecord = ref<any | null>(null)
const detailDrawerTitle = computed(() => {
  if (detailRecord.value?._split_receipts?.length) return '流水详情'
  const no = String(detailRecord.value?.transaction_no || '').trim()
  return no ? `流水详情 - ${no}` : '流水详情'
})

const { currentUser, loadFromStorage } = useCurrentUser()

const transactionCategoryOptions = [
  {
    value: '业务收入',
    label: '业务收入',
    children: [
      { value: '任务收入', label: '任务收入' },
      { value: '补款收入', label: '补款收入' },
    ],
  },
  {
    value: '业务支出',
    label: '业务支出',
    children: [
      { value: '截单退款', label: '截单退款' },
      { value: '赔付佣金', label: '赔付佣金' },
      { value: '退差价', label: '退差价' },
    ],
  },
  {
    value: '运营支出',
    label: '运营支出',
    children: [
      { value: 'IP采购', label: 'IP采购' },
      { value: '服务器', label: '服务器' },
      { value: '账号购买', label: '账号购买' },
      { value: '礼品卡', label: '礼品卡' },
      { value: '信用卡', label: '信用卡' },
    ],
  },
  {
    value: '行政办公',
    label: '行政办公',
    children: [],
  },
  {
    value: '其他收入',
    label: '其他收入',
    children: [
      { value: '开箱视频', label: '开箱视频' },
      { value: '删差评', label: '删差评' },
      { value: '其他', label: '其他' },
    ],
  },
  {
    value: '其他支出',
    label: '其他支出',
    children: [
      { value: '开箱视频', label: '开箱视频' },
      { value: '删差评', label: '删差评' },
      { value: '其他', label: '其他' },
    ],
  },
]

const primaryCategoryOptions = transactionCategoryOptions.map(({ value, label }) => ({ value, label }))
const primaryCategorySet = new Set(primaryCategoryOptions.map(item => item.value))
const secondaryToPrimaryMap = Object.fromEntries(
  transactionCategoryOptions.flatMap(group => group.children.map(item => [item.value, group.value])),
) as Record<string, string>
const incomeTypeValues = new Set(['任务收入', '补款收入', '其他收入'])
const offsetTypeValues = new Set(['账面抵消'])
const usdCapableTypeValues = new Set(['任务收入', '补款收入', 'IP采购', '服务器', '账号购买', '礼品卡', '信用卡', '其他收入', '开箱视频', '删差评', '其他'])
const ledgerCountryOptions = ['美国', '英国', '德国', '加拿大']
const businessTypeOptions = ['文字', '免评', '图片', '视频', 'Feedback']
const transactionTypeMeta: Record<string, { label: string; color: string }> = {
  任务收入: { label: '任务收入', color: 'green' },
  补款收入: { label: '补款收入', color: 'cyan' },
  账面抵消: { label: '账面抵消', color: 'blue' },
  截单退款: { label: '截单退款', color: 'red' },
  赔付佣金: { label: '赔付佣金', color: 'volcano' },
  退差价: { label: '退差价', color: 'orange' },
  IP采购: { label: 'IP采购', color: 'purple' },
  服务器: { label: '服务器', color: 'blue' },
  账号购买: { label: '账号购买', color: 'gold' },
  礼品卡: { label: '礼品卡', color: 'gold' },
  信用卡: { label: '信用卡', color: 'geekblue' },
  行政支出: { label: '行政支出', color: 'default' },
  行政冲销: { label: '行政冲销', color: 'processing' },
  其他收入: { label: '其他收入', color: 'lime' },
  其他支出: { label: '其他支出', color: 'default' },
  开箱视频: { label: '开箱视频', color: 'cyan' },
  删差评: { label: '删差评', color: 'volcano' },
  其他: { label: '其他', color: 'default' },
}
const statusOptions = ['待确认', '已确认', '已修改', '已作废']
const statusBadge: Record<string, string> = { 待确认: 'warning', 已确认: 'success', 已修改: 'processing', 已作废: 'default' }

const emptyForm = () => ({
  entry_scope: '业务收入',
  transaction_type: '任务收入',
  direction: '收入',
  amount_cny: 0,
  amount_usd: 0,
  exchange_rate: null as number | null,
  customer_name: '',
  order_number: '',
  staff_name: '',
  business_countries: [] as string[],
  business_types: [] as string[],
  business_order_count: 0,
  business_breakdown: [] as any[],
  offset_source_type: '',
  offset_source_note: '',
  handler_name: currentUser.value?.name || '',
  status: '待确认',
  notes: '',
  transaction_date: dayjs().format('YYYY-MM-DD'),
})
const form = reactive(emptyForm())

const splitMergedColumnKeys = new Set([
  'transaction_date', 'countries', 'transaction_type', 'direction',
  'customer_name', 'business_summary', 'order_number', 'staff_name', 'handler_name',
  'status', 'notes', 'receipt', 'action',
])

function splitReceiptCell(record: any, key: string) {
  const span = Number(record?._split_row_span ?? 1)
  const mergeAmount = key === 'amount' && Number(record?._group_offset_amount || 0) > 0 && !!record?._split_group
  if (!splitMergedColumnKeys.has(key) && !mergeAmount) return {}
  if (span === 0) return { rowSpan: 0 }
  if (span > 1) return { rowSpan: span }
  return {}
}

const columns = [
  { title: '流水号', dataIndex: 'transaction_no', key: 'transaction_no', width: 160 },
  { title: '日期', dataIndex: 'transaction_date', key: 'transaction_date', width: 100 },
  { title: '国家', key: 'countries', width: 100 },
  { title: '交易类型', key: 'transaction_type', width: 170 },
  { title: '收支方向', key: 'direction', width: 90 },
  { title: '金额', key: 'amount', width: 230 },
  { title: '对象', dataIndex: 'customer_name', key: 'customer_name', width: 140, ellipsis: true },
  { title: '业务摘要', key: 'business_summary', width: 150 },
  { title: '任务号', key: 'order_number', width: 170, ellipsis: true },
  { title: '申请人', dataIndex: 'staff_name', key: 'staff_name', width: 100 },
  { title: '操作人', dataIndex: 'handler_name', key: 'handler_name', width: 100 },
  { title: '状态', key: 'status', width: 90 },
  { title: '备注', dataIndex: 'notes', key: 'notes', width: 140, ellipsis: true },
  { title: '水单', key: 'receipt', width: 110 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' as const },
].map(column => ({
  ...column,
  customCell: (record: any) => splitReceiptCell(record, String(column.key)),
}))

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: string[]) => {
    selectedRowKeys.value = keys
  },
  getCheckboxProps: (record: any) => ({
    disabled: !canApprove(record),
  }),
}))

function formatNum(n: number) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getReceiptUrls(record: any) {
  const raw = record?.receipt_urls ?? record?.receipt_url ?? record?.paypal_receipt_screenshot
  if (Array.isArray(raw)) return raw.map(item => String(item || '').trim()).filter(Boolean)
  return String(raw || '')
    .split(/[|,，\n]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function normalizeBusinessType(value: any) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw === '文字评' || raw === '文字') return '文字'
  if (raw === '图片评' || raw === '图片') return '图片'
  if (raw === '视频评' || raw === '视频') return '视频'
  if (raw === 'FB' || raw === 'Feedback') return 'Feedback'
  if (raw === '免评') return '免评'
  return raw
}

function normalizeTextArray(value: any) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed.map(item => String(item || '').trim()).filter(Boolean)
      } catch {}
    }
    return trimmed.split(/[、,，/]/).map(item => item.trim()).filter(Boolean)
  }
  return []
}

function getBusinessBreakdown(record: any) {
  const raw = record?.business_breakdown
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function getCountries(record: any) {
  const fromField = normalizeTextArray(record?.business_countries || record?.countries)
  if (fromField.length) return [...new Set(fromField)]
  const fromBreakdown = getBusinessBreakdown(record).map((item: any) => String(item.country || '').trim()).filter(Boolean)
  return [...new Set(fromBreakdown)]
}

function getBusinessTypes(record: any) {
  const fromField = normalizeTextArray(record?.business_types).map(normalizeBusinessType).filter(Boolean)
  if (fromField.length) return [...new Set(fromField)]
  const fromBreakdown = getBusinessBreakdown(record).map((item: any) => normalizeBusinessType(item.business_type)).filter(Boolean)
  return [...new Set(fromBreakdown)]
}

function getBusinessOrderCount(record: any) {
  const explicit = Number(record?.business_order_count || 0)
  if (explicit > 0) return explicit
  return getBusinessBreakdown(record).reduce((sum: number, item: any) => sum + Number(item.order_count || 0), 0)
}

function isBusinessLedgerRecord(record: any) {
  const primary = normalizeTransactionCategories(record).primary
  return primary.startsWith('业务') || !!record?.order_number || !!record?.order_id
}

function getBreakdownOrderId(item: any) {
  return String(item?.target_order_number || item?.target_task_id || item?.order_number || item?.order_id || item?.task_id || item?.task_number || '').trim()
}

function getBreakdownSourceOrderId(item: any) {
  return String(item?.source_order_number || item?.source_task_id || item?.offset_order_number || item?.offset_task_id || '').trim()
}

function getOffsetSourceSummary(record: any) {
  const ids = getBusinessBreakdown(record).map(getBreakdownSourceOrderId).filter(Boolean)
  return [...new Set(ids)].join('、')
}

function getOffsetRows(record: any) {
  return getBusinessBreakdown(record).filter((item: any) => getBreakdownDirection(item, record) === '账面抵消' || getBreakdownSourceOrderId(item))
}

function getOffsetSourceRows(record: any) {
  const fromNotes = parseOffsetSourceRows(record?.notes)
  if (fromNotes.length) return fromNotes
  const map = getOffsetRows(record).reduce((acc: Record<string, { sourceOrderId: string; amountCny: number }>, item: any) => {
    const sourceOrderId = getBreakdownSourceOrderId(item)
    const key = sourceOrderId || '未填写'
    if (!acc[key]) {
      acc[key] = { sourceOrderId, amountCny: 0 }
    }
    acc[key].amountCny += Number(item.amount_cny || 0)
    return acc
  }, {})
  return Object.values(map)
}

function getOffsetBusinessPairRows(record: any) {
  const fromNotes = parseOffsetBusinessPairRows(record?.notes)
  if (fromNotes.length) return fromNotes
  const map = getOffsetRows(record).reduce((acc: Record<string, { businessType: string; orderCount: number }>, item: any) => {
    const type = normalizeBusinessType(item.source_business_type || item.offset_business_type || item.business_type) || '未分类'
    if (!acc[type]) {
      acc[type] = { businessType: type, orderCount: 0 }
    }
    acc[type].orderCount += Number(item.source_order_count || item.offset_order_count || item.order_count || 0)
    return acc
  }, {})
  return Object.values(map)
}

function parseOffsetSourceRows(notes: any) {
  const section = extractNoteSection(notes, '抵消来源')
  if (!section) return []
  return section.split(/[、,，]/)
    .map(item => item.trim())
    .map((item) => {
      const match = item.match(/^(.+?)\s*[¥￥]\s*([0-9]+(?:\.[0-9]+)?)/)
      return match
        ? { sourceOrderId: match[1].trim(), amountCny: Number(match[2] || 0) }
        : null
    })
    .filter(Boolean) as Array<{ sourceOrderId: string; amountCny: number }>
}

function parseOffsetBusinessPairRows(notes: any) {
  const section = extractNoteSection(notes, '抵消明细')
  if (!section) return []
  return section.split(/[、,，]/)
    .map(item => item.trim())
    .map((item) => {
      const match = item.match(/^(.+?)([0-9]+(?:\.[0-9]+)?)\s*单$/)
      return match
        ? { businessType: normalizeBusinessType(match[1]), orderCount: Number(match[2] || 0) }
        : null
    })
    .filter(Boolean) as Array<{ businessType: string; orderCount: number }>
}

function extractNoteSection(notes: any, label: string) {
  const raw = String(notes || '')
  const match = raw.match(new RegExp(`${label}\\s*:\\s*([^|]+)`))
  return match ? match[1].trim() : ''
}

function getOrderIds(record: any) {
  const fromBreakdown = getBusinessBreakdown(record).map(getBreakdownOrderId).filter(Boolean)
  const ownOrder = String(record?.order_number || record?.order_id || '').trim()
  return [...new Set([...fromBreakdown, ownOrder].filter(Boolean))]
}

function getOrderIdSummary(record: any) {
  const ids = getOrderIds(record)
  if (!ids.length) return ''
  return ids.length === 1 ? ids[0] : `${ids[0]} +${ids.length - 1}`
}

function getDetailBreakdownRows(record: any) {
  const breakdown = getBusinessBreakdown(record)
  if (breakdown.length) return breakdown
  if (!shouldShowBusinessSection(record)) return []
  return [{
    order_number: record?.order_number || record?.order_id || '',
    country: getCountries(record)[0] || '',
    business_type: getBusinessTypes(record)[0] || '',
    order_count: getBusinessOrderCount(record),
    amount_cny: Number(record?.amount_cny || 0),
    direction: getDirection(record),
  }]
}

function isOffsetRecord(record: any) {
  return getDirection(record) === '账面抵消'
}

function shouldShowBusinessSection(record: any) {
  return isBusinessLedgerRecord(record) || hasBusinessInfo(record)
}

function getBreakdownDirection(item: any, record: any) {
  const raw = String(item?.direction || item?.settlement_direction || '').trim()
  if (['收入', '支出', '账面抵消'].includes(raw)) return raw
  if (getBreakdownSourceOrderId(item)) return '账面抵消'
  return getDirection(record)
}

function hasOffsetPart(record: any) {
  return getDirectionParts(record).includes('账面抵消') || getBusinessBreakdown(record).some((item: any) => getBreakdownDirection(item, record) === '账面抵消')
}

function hasSettlementPart(record: any) {
  return getDirectionParts(record).length > 1 || getBusinessBreakdown(record).some((item: any) => !!item.direction || !!item.settlement_direction)
}

function getCountrySummary(record: any) {
  const countries = getCountries(record)
  if (!countries.length) return ''
  return countries.length === 1 ? countries[0] : `${countries[0]} +${countries.length - 1}`
}

function getLedgerDetailGroup(record: any) {
  const primary = normalizeTransactionCategories(record).primary
  if (primary === '运营支出' || primary === '行政办公') return 'operation'
  if (primary === '其他收入' || primary === '其他支出') return 'other'
  return 'business'
}

function showListTask(record: any) {
  return getLedgerDetailGroup(record) === 'business'
}

function showListCountry(record: any) {
  const primary = normalizeTransactionCategories(record).primary
  return getLedgerDetailGroup(record) === 'business' || primary === '运营支出'
}

function showDetailTask(record: any) {
  return showListTask(record)
}

function showDetailCountry(record: any) {
  return showListCountry(record)
}

function showDetailUsd(record: any) {
  return normalizeTransactionCategories(record).primary === '运营支出' || Number(record?.amount_usd || 0) > 0
}

function showDetailTypeColumns(record: any) {
  const secondary = normalizeTransactionCategories(record).secondary
  return !['退差价', '补款收入'].includes(secondary)
}

function showDetailPaymentAccount(record: any) {
  return ['业务支出', '运营支出', '行政办公', '其他支出'].includes(normalizeTransactionCategories(record).primary)
}

function getPaymentAccount(record: any) {
  const direct = String(record?.payment_account || '').trim()
  if (direct) return direct
  return String(record?.notes || '').match(/付款账号:([^|]+)/)?.[1]?.trim() || ''
}

function getLandingAccountLabel(record: any) {
  const parts = getDirectionParts(record)
  if (parts.includes('收入') && !parts.includes('支出')) return '收款账号'
  if (parts.includes('支出') && !parts.includes('收入')) return '对方账号'
  return ''
}

function getLandingAccount(record: any) {
  const direct = String(record?.landing_account || '').trim()
  if (direct) return direct
  const notes = String(record?.notes || '')
  if (getLandingAccountLabel(record) === '对方账号') {
    return notes.match(/(?:对方账号|收款账号|退款账号):([^|]+)/)?.[1]?.trim() || ''
  }
  return notes.match(/(?:收款账号|到账账号):([^|]+)/)?.[1]?.trim() || ''
}

function getBusinessTaskRows(record: any) {
  const rows = getDetailBreakdownRows(record).map((item: any) => ({
    taskId: getBreakdownOrderId(item),
    country: String(item?.country || '').trim(),
    type: normalizeBusinessType(item?.business_type),
    count: Number(item?.order_count || 0),
    amount: Number(item?.amount_cny || 0),
  }))
  const spanByTask = rows.reduce((acc: Record<string, number>, item) => {
    acc[item.taskId] = (acc[item.taskId] || 0) + 1
    return acc
  }, {})
  let lastTaskId = '\0'
  return rows.map((item) => {
    const showTaskId = item.taskId !== lastTaskId
    lastTaskId = item.taskId
    return {
      ...item,
      showTaskId,
      taskRowSpan: showTaskId ? spanByTask[item.taskId] : 0,
    }
  })
}

function getOffsetDetailRows(record: any) {
  let lastSourceTaskId = '\0'
  return getOffsetRows(record).map((item: any) => {
    const sourceTaskId = getBreakdownSourceOrderId(item)
    const showSourceTaskId = sourceTaskId !== lastSourceTaskId
    lastSourceTaskId = sourceTaskId
    return {
      sourceTaskId,
      showSourceTaskId,
      country: String(item?.source_country || item?.country || '').trim(),
      type: normalizeBusinessType(item?.source_business_type || item?.offset_business_type || item?.business_type),
      count: Number(item?.source_order_count || item?.offset_order_count || item?.order_count || 0),
      amount: Number(item?.amount_cny || 0),
    }
  })
}

function getBusinessSummary(record: any) {
  if (!showDetailTypeColumns(record)) return '-'
  const breakdown = getBusinessBreakdown(record)
  if (breakdown.length) {
    const countByType = breakdown.reduce((acc: Record<string, number>, item: any) => {
      const type = normalizeBusinessType(item.business_type) || '未分类'
      acc[type] = (acc[type] || 0) + Number(item.order_count || 0)
      return acc
    }, {})
    return Object.entries(countByType).map(([type, count]) => `${type}${count ? `${count}单` : ''}`).join(' · ')
  }
  const types = getBusinessTypes(record)
  const count = getBusinessOrderCount(record)
  if (!types.length && !count) return '-'
  return `${types.join(' · ') || '业务'}${count ? ` ${count}单` : ''}`
}

function getBusinessSubSummary(record: any) {
  if (!showDetailTypeColumns(record)) return ''
  const count = getBusinessOrderCount(record)
  if (count <= 0) return ''
  return `共${count}单`
}

function hasBusinessInfo(record: any) {
  return getCountries(record).length > 0 || getBusinessTypes(record).length > 0 || getBusinessOrderCount(record) > 0 || getBusinessBreakdown(record).length > 0 || !!record?.offset_source_type || !!record?.offset_source_note
}

function buildLedgerPreviewRows() {
  const now = dayjs()
  const splitShared = {
    _is_preview_mock: true,
    _split_group: 'SPLIT-DEMO-1200',
    entry_scope: '业务收入',
    transaction_type: '任务收入',
    direction: '收入',
    amount_usd: null,
    exchange_rate: 7.25,
    customer_name: '示例客户-分笔实收',
    landing_account: '公司对公 · 8801',
    order_number: 'TASK-SPLIT-1200',
    staff_name: '商务-李婷',
    business_countries: ['美国'],
    business_types: ['文字'],
    business_order_count: 4,
    handler_name: '财务-陈岚',
    status: '待确认',
    notes: '分笔实收',
    _group_offset_amount: 200,
    transaction_date: now.format('YYYY-MM-DD'),
  }
  return [
    {
      ...splitShared,
      id: 'mock-ledger-split-400',
      transaction_no: 'FT-MOCK-SPLIT-0001',
      amount_cny: 400,
      business_breakdown: [
        { direction: '收入', target_order_number: 'TASK-SPLIT-1200', country: '美国', business_type: '文字', order_count: 4, amount_cny: 400 },
      ],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      ...splitShared,
      id: 'mock-ledger-split-800',
      transaction_no: 'FT-MOCK-SPLIT-0002',
      landing_account: '公司支付宝 · 8802',
      amount_cny: 800,
      business_breakdown: [
        { direction: '收入', target_order_number: 'TASK-SPLIT-1200', country: '美国', business_type: '文字', order_count: 4, amount_cny: 800 },
      ],
      created_at: now.subtract(1, 'minute').toISOString(),
      updated_at: now.subtract(1, 'minute').toISOString(),
    },
    {
      id: 'mock-ledger-pending-1',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0001',
      entry_scope: '业务支出',
      transaction_type: '截单退款',
      direction: '支出',
      amount_cny: 268,
      amount_usd: null,
      exchange_rate: null,
      customer_name: '深圳星河科技',
      landing_account: '星河支付宝 · starhe-01',
      payment_account: 'alipay · finance-01',
      order_number: 'ORD-20260507-001',
      staff_name: '商务-李婷',
      business_countries: ['美国'],
      business_types: ['文字'],
      business_order_count: 2,
      business_breakdown: [{ order_number: 'ORD-20260507-001', country: '美国', business_type: '文字', order_count: 2, amount_cny: 268 }],
      handler_name: '',
      status: '待确认',
      notes: '付款审批 | 业务支出 / 截单退款',
      transaction_date: now.format('YYYY-MM-DD'),
      created_at: now.subtract(20, 'minute').toISOString(),
      updated_at: now.subtract(20, 'minute').toISOString(),
    },
    {
      id: 'mock-ledger-pending-2',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0002',
      entry_scope: '运营支出',
      transaction_type: '礼品卡',
      direction: '支出',
      amount_cny: 1450,
      amount_usd: 200,
      exchange_rate: 7.25,
      customer_name: '礼品卡供应商',
      landing_account: '礼品卡供应商 · card-8899',
      payment_account: 'alipay · finance-01',
      order_number: '',
      staff_name: '财务-陈岚',
      business_countries: ['美国'],
      handler_name: '财务-陈岚',
      status: '待确认',
      notes: '运营支出 | 礼品卡采购，国家可不填，这里示例填了美国',
      transaction_date: now.subtract(1, 'day').format('YYYY-MM-DD'),
      created_at: now.subtract(1, 'day').hour(15).toISOString(),
      updated_at: now.subtract(1, 'day').hour(15).toISOString(),
    },
    {
      id: 'mock-ledger-pending-3',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0003',
      entry_scope: '行政办公',
      transaction_type: '行政支出',
      direction: '支出',
      amount_cny: 320,
      amount_usd: null,
      exchange_rate: null,
      customer_name: '办公室供应商',
      landing_account: '办公室供应商 · office-1024',
      payment_account: 'alipay · finance-01',
      order_number: '',
      staff_name: '行政-周宁',
      handler_name: '管理员',
      status: '已修改',
      notes: '办公用品采购，等待复核',
      transaction_date: now.subtract(2, 'day').format('YYYY-MM-DD'),
      created_at: now.subtract(2, 'day').hour(11).toISOString(),
      updated_at: now.subtract(1, 'day').hour(9).toISOString(),
    },
    {
      id: 'mock-ledger-offset-1',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0004',
      entry_scope: '业务收入',
      transaction_type: '任务收入',
      direction: '账面抵消',
      amount_cny: 360,
      amount_usd: null,
      exchange_rate: null,
      customer_name: '杭州云海贸易',
      order_number: 'TASK-20260507-021',
      staff_name: '商务-王晨',
      business_countries: ['美国'],
      business_types: ['文字'],
      business_order_count: 3,
      business_breakdown: [
        { direction: '账面抵消', target_order_number: 'TASK-20260507-021', source_order_number: 'TASK-20260428-008', source_business_type: '文字', source_order_count: 3, country: '美国', business_type: '文字', order_count: 3, amount_cny: 360 },
      ],
      offset_source_type: '客户余款抵消',
      offset_source_note: '上一批任务余款抵消本次这 1 个任务。',
      handler_name: '',
      status: '待确认',
      notes: '账面抵消 | 客户余款抵消',
      transaction_date: now.subtract(3, 'hour').format('YYYY-MM-DD'),
      created_at: now.subtract(3, 'hour').toISOString(),
      updated_at: now.subtract(3, 'hour').toISOString(),
    },
    {
      id: 'mock-ledger-offset-2',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0005',
      entry_scope: '业务收入',
      transaction_type: '任务收入',
      direction: '账面抵消',
      amount_cny: 310,
      amount_usd: null,
      exchange_rate: null,
      customer_name: '深圳森语家居',
      order_number: 'TASK-20260506-118',
      staff_name: '商务-林夕',
      business_countries: ['德国'],
      business_types: ['图片', '文字'],
      business_order_count: 3,
      business_breakdown: [
        { direction: '账面抵消', target_order_number: 'TASK-20260506-118', source_order_number: 'TASK-20260418-031', source_country: '德国', source_business_type: '图片', source_order_count: 1, country: '德国', business_type: '图片', order_count: 1, amount_cny: 120 },
        { direction: '账面抵消', target_order_number: 'TASK-20260506-118', source_order_number: 'TASK-20260418-031', source_country: '德国', source_business_type: '文字', source_order_count: 2, country: '德国', business_type: '文字', order_count: 2, amount_cny: 190 },
      ],
      offset_source_type: '同事余款抵消',
      offset_source_note: '同客户同事历史任务余款抵消本次部分款项。',
      handler_name: '财务-陈岚',
      status: '已修改',
      notes: '账面抵消',
      transaction_date: now.subtract(1, 'day').format('YYYY-MM-DD'),
      created_at: now.subtract(1, 'day').hour(10).toISOString(),
      updated_at: now.subtract(1, 'day').hour(14).toISOString(),
    },
    {
      id: 'mock-ledger-mixed-1',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0006',
      entry_scope: '业务收入',
      transaction_type: '任务收入',
      direction: '收入+账面抵消',
      settlement_directions: ['收入', '账面抵消'],
      amount_cny: 880,
      amount_usd: null,
      exchange_rate: null,
      customer_name: '宁波朗行科技',
      landing_account: '公司对公 · 8801',
      order_number: 'TASK-20260507-060',
      staff_name: '商务-Aiden',
      business_countries: ['美国', '德国'],
      business_types: ['文字', '免评'],
      business_order_count: 6,
      business_breakdown: [
        { direction: '收入', target_order_number: 'TASK-20260507-060', country: '美国', business_type: '文字', order_count: 4, amount_cny: 520 },
        { direction: '账面抵消', target_order_number: 'TASK-20260507-061', source_order_number: 'TASK-20260430-016', source_business_type: '免评', source_order_count: 2, country: '德国', business_type: '免评', order_count: 2, amount_cny: 360 },
      ],
      offset_source_type: '客户余款抵消',
      offset_source_note: '本次新任务部分现金收款，部分使用历史任务余款抵消。',
      handler_name: '',
      status: '待确认',
      notes: '任务结算 | 收入 + 账面抵消',
      transaction_date: now.subtract(2, 'hour').format('YYYY-MM-DD'),
      created_at: now.subtract(2, 'hour').toISOString(),
      updated_at: now.subtract(2, 'hour').toISOString(),
    },
    {
      id: 'mock-ledger-income-task',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0009',
      entry_scope: '业务收入',
      transaction_type: '任务收入',
      direction: '收入',
      amount_cny: 520,
      amount_usd: null,
      exchange_rate: null,
      customer_name: '深圳星河科技',
      landing_account: '公司对公 · 8801',
      order_number: 'TASK-20260507-090',
      staff_name: '商务-李婷',
      business_countries: ['美国'],
      business_types: ['文字'],
      business_order_count: 4,
      business_breakdown: [
        { direction: '收入', target_order_number: 'TASK-20260507-090', country: '美国', business_type: '文字', order_count: 4, amount_cny: 520 },
      ],
      handler_name: '财务-陈岚',
      status: '已确认',
      notes: '业务收入 | 单任务文字评收款',
      transaction_date: now.subtract(4, 'hour').format('YYYY-MM-DD'),
      created_at: now.subtract(4, 'hour').toISOString(),
      updated_at: now.subtract(4, 'hour').toISOString(),
    },
    {
      id: 'mock-ledger-income-topup',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0010',
      entry_scope: '业务收入',
      transaction_type: '补款收入',
      direction: '收入',
      amount_cny: 180,
      amount_usd: null,
      exchange_rate: null,
      customer_name: '广州优品贸易',
      landing_account: '公司对公 · 8801',
      order_number: 'TASK-20260507-091',
      staff_name: '商务-王晨',
      business_countries: ['英国'],
      business_types: [],
      business_order_count: 0,
      business_breakdown: [
        { direction: '收入', target_order_number: 'TASK-20260507-091', country: '英国', amount_cny: 180 },
      ],
      handler_name: '',
      status: '待确认',
      notes: '业务收入 | 图片评补款',
      transaction_date: now.subtract(5, 'hour').format('YYYY-MM-DD'),
      created_at: now.subtract(5, 'hour').toISOString(),
      updated_at: now.subtract(5, 'hour').toISOString(),
    },
    {
      id: 'mock-ledger-expense-commission',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0007',
      entry_scope: '业务支出',
      transaction_type: '赔付佣金',
      direction: '支出',
      amount_cny: 96,
      amount_usd: null,
      exchange_rate: null,
      customer_name: '杭州远帆品牌',
      landing_account: '远帆支付宝 · yuanfan-01',
      payment_account: 'alipay · finance-01',
      order_number: 'TASK-20260507-070',
      staff_name: '商务-周敏',
      business_countries: ['德国'],
      business_types: ['免评'],
      business_order_count: 1,
      business_breakdown: [
        { direction: '支出', target_order_number: 'TASK-20260507-070', country: '德国', business_type: '免评', order_count: 1, amount_cny: 96 },
      ],
      handler_name: '',
      status: '待确认',
      notes: '业务支出 | 佣金差额付给对象',
      transaction_date: now.subtract(6, 'hour').format('YYYY-MM-DD'),
      created_at: now.subtract(6, 'hour').toISOString(),
      updated_at: now.subtract(6, 'hour').toISOString(),
    },
    {
      id: 'mock-ledger-expense-diff',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0008',
      entry_scope: '业务支出',
      transaction_type: '退差价',
      direction: '支出',
      amount_cny: 45,
      amount_usd: null,
      exchange_rate: null,
      customer_name: '宁波优品贸易',
      landing_account: '优品支付宝 · youpin-01',
      payment_account: 'alipay · finance-01',
      order_number: 'TASK-20260507-080',
      staff_name: '商务-王晨',
      business_countries: ['英国'],
      business_types: [],
      business_order_count: 0,
      business_breakdown: [
        { direction: '支出', target_order_number: 'TASK-20260507-080', country: '英国', amount_cny: 45 },
      ],
      handler_name: '财务-陈岚',
      status: '已确认',
      notes: '业务支出 | 退差价',
      transaction_date: now.subtract(1, 'day').format('YYYY-MM-DD'),
      created_at: now.subtract(1, 'day').hour(9).toISOString(),
      updated_at: now.subtract(1, 'day').hour(9).toISOString(),
    },
    {
      id: 'mock-ledger-ops-ip',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0011',
      entry_scope: '运营支出',
      transaction_type: 'IP采购',
      direction: '支出',
      amount_cny: 860,
      amount_usd: 120,
      exchange_rate: 7.1667,
      customer_name: 'IP供应商',
      landing_account: 'IP供应商 · ip-2201',
      payment_account: 'alipay · finance-01',
      order_number: '',
      staff_name: '运营-陈静',
      business_countries: ['美国'],
      handler_name: '',
      status: '待确认',
      notes: '运营支出 | IP采购，无任务号',
      transaction_date: now.subtract(2, 'day').format('YYYY-MM-DD'),
      created_at: now.subtract(2, 'day').hour(16).toISOString(),
      updated_at: now.subtract(2, 'day').hour(16).toISOString(),
    },
    {
      id: 'mock-ledger-ops-server',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0012',
      entry_scope: '运营支出',
      transaction_type: '服务器',
      direction: '支出',
      amount_cny: 2400,
      amount_usd: null,
      exchange_rate: null,
      customer_name: '云服务器供应商',
      landing_account: '云服务器 · cloud-3302',
      payment_account: 'alipay · finance-01',
      order_number: '',
      staff_name: '运营-陈静',
      business_countries: [],
      handler_name: '财务-陈岚',
      status: '已确认',
      notes: '运营支出 | 服务器续费，国家留空',
      transaction_date: now.subtract(3, 'day').format('YYYY-MM-DD'),
      created_at: now.subtract(3, 'day').hour(11).toISOString(),
      updated_at: now.subtract(3, 'day').hour(11).toISOString(),
    },
    {
      id: 'mock-ledger-ops-account',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0013',
      entry_scope: '运营支出',
      transaction_type: '账号购买',
      direction: '支出',
      amount_cny: 300,
      amount_usd: null,
      exchange_rate: null,
      customer_name: '账号供应商',
      landing_account: '账号供应商 · acct-4410',
      payment_account: 'alipay · finance-01',
      order_number: '',
      staff_name: '运营-赵磊',
      business_countries: ['德国'],
      handler_name: '',
      status: '待确认',
      notes: '运营支出 | 账号购买',
      transaction_date: now.subtract(3, 'day').format('YYYY-MM-DD'),
      created_at: now.subtract(3, 'day').hour(15).toISOString(),
      updated_at: now.subtract(3, 'day').hour(15).toISOString(),
    },
    {
      id: 'mock-ledger-ops-card',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0014',
      entry_scope: '运营支出',
      transaction_type: '信用卡',
      direction: '支出',
      amount_cny: 725,
      amount_usd: 100,
      exchange_rate: 7.25,
      customer_name: '信用卡服务商',
      landing_account: '信用卡服务商 · card-5508',
      payment_account: 'alipay · finance-01',
      order_number: '',
      staff_name: '财务-陈岚',
      business_countries: ['英国'],
      handler_name: '',
      status: '待确认',
      notes: '运营支出 | 信用卡费用',
      transaction_date: now.subtract(4, 'day').format('YYYY-MM-DD'),
      created_at: now.subtract(4, 'day').hour(10).toISOString(),
      updated_at: now.subtract(4, 'day').hour(10).toISOString(),
    },
    {
      id: 'mock-ledger-other-income',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0015',
      entry_scope: '其他收入',
      transaction_type: '开箱视频',
      direction: '收入',
      amount_cny: 600,
      amount_usd: null,
      exchange_rate: null,
      customer_name: '开箱视频服务商',
      landing_account: '公司对公 · 8801',
      order_number: '',
      staff_name: '商务-林夕',
      handler_name: '',
      status: '待确认',
      notes: '其他收入 | 开箱视频，无任务号无国家',
      transaction_date: now.subtract(5, 'day').format('YYYY-MM-DD'),
      created_at: now.subtract(5, 'day').hour(13).toISOString(),
      updated_at: now.subtract(5, 'day').hour(13).toISOString(),
    },
    {
      id: 'mock-ledger-other-expense',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0016',
      entry_scope: '其他支出',
      transaction_type: '删差评',
      direction: '支出',
      amount_cny: 260,
      amount_usd: null,
      exchange_rate: null,
      customer_name: '删评供应商',
      landing_account: '删评供应商 · review-6601',
      payment_account: 'alipay · finance-01',
      order_number: '',
      staff_name: '商务-周敏',
      handler_name: '财务-陈岚',
      status: '已确认',
      notes: '其他支出 | 删差评',
      transaction_date: now.subtract(5, 'day').format('YYYY-MM-DD'),
      created_at: now.subtract(5, 'day').hour(17).toISOString(),
      updated_at: now.subtract(5, 'day').hour(17).toISOString(),
    },
    {
      id: 'mock-ledger-other-misc',
      _is_preview_mock: true,
      transaction_no: 'FT-MOCK-20260507-0017',
      entry_scope: '其他支出',
      transaction_type: '其他',
      direction: '支出',
      amount_cny: 80,
      amount_usd: null,
      exchange_rate: null,
      customer_name: '临时供应商',
      landing_account: '临时供应商 · temp-7702',
      payment_account: 'alipay · finance-01',
      order_number: '',
      staff_name: '行政-周宁',
      handler_name: '',
      status: '待确认',
      notes: '其他支出 | 其他',
      transaction_date: now.subtract(6, 'day').format('YYYY-MM-DD'),
      created_at: now.subtract(6, 'day').hour(12).toISOString(),
      updated_at: now.subtract(6, 'day').hour(12).toISOString(),
    },
  ]
}

function inferEntryScope(type: string) {
  return secondaryToPrimaryMap[type] || '其他支出'
}

const isAdministrativeEntry = computed(() => form.entry_scope === '行政办公')
const isBusinessEntry = computed(() => form.entry_scope.startsWith('业务'))
const manualTypeOptions = computed(() => transactionCategoryOptions.find(item => item.value === form.entry_scope)?.children || [])
const filterSecondaryOptions = computed(() => {
  if (filterPrimaryCategory.value) {
    return transactionCategoryOptions.find(item => item.value === filterPrimaryCategory.value)?.children || []
  }
  const map = new Map<string, { value: string; label: string }>()
  transactionCategoryOptions.flatMap(item => item.children).forEach((item) => {
    if (!map.has(item.value)) map.set(item.value, item)
  })
  return Array.from(map.values())
})
const showUsdFields = computed(() => usdCapableTypeValues.has(form.transaction_type))
const showOrderNumberField = computed(() => ['业务收入', '业务支出'].includes(form.entry_scope))
const counterpartyLabel = computed(() => '对象')
const counterpartyPlaceholder = computed(() => '客户、供应商或其他对象')
const ownerLabel = computed(() => '申请人')

function isSecondaryInScope(scope: string, type: string) {
  return (transactionCategoryOptions.find(item => item.value === scope)?.children || [])
    .some(item => item.value === type)
}

function createEmptyBusinessBreakdownRow() {
  return {
    country: '',
    business_type: '',
    order_count: undefined as number | undefined,
  }
}

function ensureBusinessBreakdownRows() {
  if (!isBusinessEntry.value) return
  if (!Array.isArray(form.business_breakdown) || form.business_breakdown.length === 0) {
    form.business_breakdown = [createEmptyBusinessBreakdownRow()]
  }
}

function addBusinessBreakdownRow() {
  form.business_breakdown.push(createEmptyBusinessBreakdownRow())
}

function removeBusinessBreakdownRow(index: number) {
  if (form.business_breakdown.length <= 1) return
  form.business_breakdown.splice(index, 1)
}

function getNormalizedFormBusinessBreakdown() {
  if (!isBusinessEntry.value) return []
  return (Array.isArray(form.business_breakdown) ? form.business_breakdown : [])
    .map((item: any) => ({
      ...item,
      order_number: String(item.order_number || getBreakdownOrderId(item) || form.order_number || '').trim(),
      country: String(item.country || '').trim(),
      business_type: normalizeBusinessType(item.business_type),
      order_count: Number(item.order_count || 0),
    }))
    .filter((item: any) => item.order_number || item.country || item.business_type || item.order_count > 0)
}

function normalizeTransactionStatus(status: any) {
  const raw = String(status || '').trim()
  if (raw === '待审批') return '待确认'
  if (raw === '已取消') return '已修改'
  return statusOptions.includes(raw) ? raw : (raw || '待确认')
}

function normalizeTransactionCategories(record: any) {
  const rawType = String(record?.transaction_type || '').trim()
  const rawScope = String(record?.entry_scope || '').trim()
  const text = `${rawScope} ${rawType} ${record?.notes || ''}`

  if (rawScope === '行政办公') {
    return { primary: '行政办公', secondary: '' }
  }
  if (primaryCategorySet.has(rawScope) && isSecondaryInScope(rawScope, rawType)) {
    return { primary: rawScope, secondary: rawType }
  }
  if (secondaryToPrimaryMap[rawType]) {
    return { primary: secondaryToPrimaryMap[rawType], secondary: rawType }
  }
  if (rawType === '订单收入') return { primary: '业务收入', secondary: '任务收入' }
  if (rawType === '客户充值' || rawType === '批次收款') return { primary: '业务收入', secondary: '补款收入' }
  if (rawType === '退款' || rawType === '退款支出') return { primary: '业务支出', secondary: '截单退款' }
  if (rawType === '返佣支出') return { primary: '业务支出', secondary: '赔付佣金' }
  if (rawType === '任务支出' || rawType === '业务支出') return { primary: '业务支出', secondary: '退差价' }
  if (rawType === '礼品卡采购') return { primary: '运营支出', secondary: '礼品卡' }
  if (rawType === '美金购汇') return { primary: '运营支出', secondary: '信用卡' }
  if (rawType === '行政支出') return { primary: '行政办公', secondary: '' }
  if (rawType === '其他收入') return { primary: '其他收入', secondary: '其他' }
  if (rawType === '其他支出') return { primary: '其他支出', secondary: '其他' }
  if (rawType === '账面抵消' || record?.direction === '账面抵消') return { primary: '业务收入', secondary: '任务收入' }

  if (/行政冲销/.test(text)) return { primary: '行政办公', secondary: '' }
  if (/行政|办公|人事|工资/.test(text)) return { primary: '行政办公', secondary: '' }
  if (/ip|代理|网络/i.test(text)) return { primary: '运营支出', secondary: 'IP采购' }
  if (/服务器|server/i.test(text)) return { primary: '运营支出', secondary: '服务器' }
  if (/账号|账号购买/.test(text)) return { primary: '运营支出', secondary: '账号购买' }
  if (/礼品卡/.test(text)) return { primary: '运营支出', secondary: '礼品卡' }
  if (/信用卡|卡费/.test(text)) return { primary: '运营支出', secondary: '信用卡' }
  if (/退款|截单/.test(text)) return { primary: '业务支出', secondary: '截单退款' }
  if (/佣金|返佣/.test(text)) return { primary: '业务支出', secondary: '赔付佣金' }
  if (/差价|补差/.test(text)) return { primary: '业务支出', secondary: '退差价' }
  if (/收入|补款|收款/.test(text) || record?.direction === '收入') return { primary: '业务收入', secondary: '补款收入' }
  if (rawScope === '行政') return { primary: '行政办公', secondary: '' }
  return record?.direction === '收入'
    ? { primary: '其他收入', secondary: '其他' }
    : { primary: '其他支出', secondary: '其他' }
}

function extractSplitGroup(row: any) {
  const existing = String(row?._split_group || '').trim()
  if (existing) return existing
  const matched = String(row?.notes || '').match(/split:([A-Za-z0-9_-]+)/)
  return matched?.[1] || ''
}

function stripSplitMarker(notes: any) {
  return String(notes || '').replace(/\s*\|?\s*split:[A-Za-z0-9_-]+/g, '').trim()
}

function clusterSplitGroups(rows: any[]) {
  const seen = new Set<string>()
  const result: any[] = []
  rows.forEach(row => {
    const id = String(row?.id || '')
    if (!id || seen.has(id)) return
    const key = String(row?._split_group || '')
    if (!key) {
      result.push(row)
      seen.add(id)
      return
    }
    rows.forEach(item => {
      if (String(item?._split_group || '') !== key) return
      const itemId = String(item?.id || '')
      if (!itemId || seen.has(itemId)) return
      result.push(item)
      seen.add(itemId)
    })
  })
  return result
}

function markVisibleSplitSpans(rows: any[]) {
  rows.forEach(row => { row._split_row_span = 1 })
  let index = 0
  while (index < rows.length) {
    const key = String(rows[index]?._split_group || '')
    if (!key) {
      index += 1
      continue
    }
    let end = index + 1
    while (end < rows.length && String(rows[end]?._split_group || '') === key) end += 1
    const count = end - index
    if (count > 1) {
      rows[index]._split_row_span = count
      for (let cursor = index + 1; cursor < end; cursor += 1) rows[cursor]._split_row_span = 0
    }
    index = end
  }
  return rows
}

function normalizeFinancialRow(row: any) {
  const { primary, secondary } = normalizeTransactionCategories(row)
  const direction = getDirection({ ...row, entry_scope: primary, transaction_type: secondary })
  return {
    ...row,
    entry_scope: primary,
    transaction_type: secondary,
    direction,
    business_countries: getCountries(row),
    business_types: getBusinessTypes(row),
    business_order_count: getBusinessOrderCount(row),
    business_breakdown: getBusinessBreakdown(row),
    status: normalizeTransactionStatus(row?.status),
    handler_name: row?.handler_name || '',
    notes: stripSplitMarker(row?.notes),
    _split_group: extractSplitGroup(row),
  }
}

function getDirection(record: any) {
  const parts = getDirectionParts(record)
  if (parts.length > 1) return parts.join('+')
  if (parts.length === 1) return parts[0]
  if (record?.direction === '账面抵消') return '账面抵消'
  const { secondary } = normalizeTransactionCategories(record)
  if (offsetTypeValues.has(secondary)) return '账面抵消'
  return incomeTypeValues.has(secondary) ? '收入' : '支出'
}

function getListDirectionParts(record: any) {
  const span = Number(record?._split_row_span || 1)
  const key = String(record?._split_group || '')
  const group = span > 1 && key
    ? ledgerRows.value.filter(item => String(item?._split_group || '') === key)
    : [record]
  const parts = group.flatMap(item => getDirectionParts(item))
  if (group.some(item => Number(item?._group_offset_amount || 0) > 0)) parts.push('账面抵消')
  const ordered = ['收入', '支出', '账面抵消'].filter(item => parts.includes(item))
  return ordered.length ? ordered : getDirectionParts(record)
}

function getSplitCashAmountLines(record: any) {
  const key = String(record?._split_group || '')
  const rows = key
    ? ledgerRows.value.filter(item => String(item?._split_group || '') === key)
    : [record]
  const source = rows.length ? rows : [record]
  return source.map(item => ({ id: item.id, amount: Number(item.amount_cny || 0) }))
}

function showSplitOffsetAmount(record: any) {
  return Number(record?._group_offset_amount || 0) > 0 && Number(record?._split_row_span || 0) !== 0
}

function getDirectionParts(record: any) {
  const valid = ['收入', '支出', '账面抵消']
  const rawParts = [
    ...normalizeTextArray(record?.settlement_directions || record?.direction_parts),
    ...String(record?.direction || '').split(/[+、,，/]/).map(item => item.trim()),
    ...getBusinessBreakdown(record).map((item: any) => String(item.direction || item.settlement_direction || '').trim()),
  ].filter(Boolean)
  const matched = rawParts.filter(item => valid.includes(item))
  if (matched.length) return [...new Set(matched)]
  const { secondary } = normalizeTransactionCategories(record)
  if (offsetTypeValues.has(secondary)) return ['账面抵消']
  return [incomeTypeValues.has(secondary) ? '收入' : '支出']
}

function getAmountByDirection(record: any, direction: string, field: 'amount_cny' | 'amount_usd') {
  const breakdown = getBusinessBreakdown(record)
  const matchedBreakdown = breakdown.filter((item: any) => getBreakdownDirection(item, record) === direction)
  if (matchedBreakdown.length) {
    return matchedBreakdown.reduce((sum: number, item: any) => sum + Number(field === 'amount_usd' ? item.amount_usd : item.amount_cny || 0), 0)
  }
  const parts = getDirectionParts(record)
  return parts.length === 1 && parts[0] === direction ? Number(record?.[field] || 0) : 0
}

function getDirectionColor(direction: string) {
  const map: Record<string, string> = { 收入: 'green', 支出: 'red', 账面抵消: 'blue' }
  return map[direction] || 'default'
}

function getAmountClass(record: any) {
  const direction = getDirectionParts(record)[0] || getDirection(record)
  if (direction === '收入') return 'amount-in'
  if (direction === '账面抵消') return 'amount-offset'
  return 'amount-out'
}

function getAmountPrefix(record: any) {
  const parts = getDirectionParts(record)
  if (parts.length > 1) return ''
  const direction = parts[0] || getDirection(record)
  if (direction === '收入') return '+'
  if (direction === '账面抵消') return '抵 '
  return '-'
}

function getMixedAmountLines(record: any) {
  const parts = getDirectionParts(record)
  if (!parts.includes('收入') || !parts.includes('账面抵消')) return null
  const lines = [
    { label: '补款', amount: getAmountByDirection(record, '收入', 'amount_cny'), className: 'amount-in', prefix: '+' },
    { label: '抵消', amount: getAmountByDirection(record, '账面抵消', 'amount_cny'), className: 'amount-offset', prefix: '' },
  ]
  return lines.some(line => line.amount > 0) ? lines : null
}

function getPrimaryCategoryLabel(record: any) {
  return normalizeTransactionCategories(record).primary
}

function getTransactionTypeLabel(record: any) {
  const secondary = normalizeTransactionCategories(record).secondary
  return transactionTypeMeta[secondary]?.label || secondary || '未分类'
}

function getTransactionTypeColor(record: any) {
  const secondary = normalizeTransactionCategories(record).secondary
  return transactionTypeMeta[secondary]?.color || 'default'
}

function hasAmount(record: any) {
  return Number(record?.amount_cny || 0) > 0 || Number(record?.amount_usd || 0) > 0
}

function canApprove(record: any) {
  return ['待确认', '已修改'].includes(String(record?.status || '').trim())
}

function canModify(record: any) {
  return !['已确认', '已作废'].includes(String(record?.status || '').trim())
}

function onScopeChange(scope: string) {
  const nextOptions = transactionCategoryOptions.find(item => item.value === scope)?.children || []
  if (scope === '行政办公') {
    form.transaction_type = ''
  } else if (!nextOptions.some(item => item.value === form.transaction_type)) {
    form.transaction_type = nextOptions[0]?.value || ''
  }
  if (!usdCapableTypeValues.has(form.transaction_type)) {
    form.amount_usd = 0
    form.exchange_rate = null
  } else {
    form.exchange_rate = form.exchange_rate || 7.25
  }
  if (!['业务收入', '业务支出'].includes(scope)) {
    form.order_number = ''
  }
  if (!form.handler_name) form.handler_name = currentUser.value?.name || ''
  ensureBusinessBreakdownRows()
  onTypeChange(form.transaction_type)
}

function onTypeChange(val: string) {
  form.direction = offsetTypeValues.has(val)
    ? '账面抵消'
    : form.entry_scope.includes('收入')
      ? '收入'
      : incomeTypeValues.has(val)
        ? '收入'
        : '支出'
  if (!usdCapableTypeValues.has(val)) {
    form.amount_usd = 0
    form.exchange_rate = null
  } else {
    form.exchange_rate = form.exchange_rate || 7.25
  }
  if (!showOrderNumberField.value) {
    form.order_number = ''
  }
  ensureBusinessBreakdownRows()
}

function onPrimaryFilterChange() {
  if (filterType.value && !filterSecondaryOptions.value.some(item => item.value === filterType.value)) {
    filterType.value = undefined
  }
  page.value = 1
  loadData()
}

async function loadData() {
  loading.value = true
  try {
    let q = supabase.from('financial_transactions').select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (search.value) q = q.or(`customer_name.ilike.%${search.value}%,order_number.ilike.%${search.value}%,notes.ilike.%${search.value}%,transaction_no.ilike.%${search.value}%`)
    if (dateRange.value) {
      q = q.gte('transaction_date', dateRange.value[0].format('YYYY-MM-DD'))
      q = q.lte('transaction_date', dateRange.value[1].format('YYYY-MM-DD'))
    }
    const { data } = await q
    const rows = clusterSplitGroups([...mockRows.value, ...(data || [])]
      .map(normalizeFinancialRow)
      .filter((row: any) => !filterPrimaryCategory.value || row.entry_scope === filterPrimaryCategory.value)
      .filter((row: any) => !filterType.value || row.transaction_type === filterType.value)
      .filter((row: any) => !filterDirection.value || getDirectionParts(row).includes(filterDirection.value))
      .filter((row: any) => !filterCountry.value || getCountries(row).includes(filterCountry.value))
      .filter((row: any) => !filterStatus.value || row.status === filterStatus.value))
    ledgerRows.value = rows
    total.value = rows.length
    if ((page.value - 1) * pageSize.value >= rows.length && page.value > 1) {
      page.value = 1
    }
    const start = (page.value - 1) * pageSize.value
    list.value = markVisibleSplitSpans(rows.slice(start, start + pageSize.value))
    selectedRowKeys.value = selectedRowKeys.value.filter(id => list.value.some(row => row.id === id && canApprove(row)))
  } finally { loading.value = false }
}

function csvCell(value: any) {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<any>>) {
  const csv = ['\ufeff' + headers.map(csvCell).join(','), ...rows.map(row => row.map(csvCell).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function exportLedger() {
  const rows = ledgerRows.value.length ? ledgerRows.value : list.value
  if (!rows.length) {
    message.warning('暂无可导出的流水')
    return
  }
  const headers = ['流水号', '日期', '国家', '交易类型', '收支方向', '金额CNY', '金额USD', '对象', '业务摘要', '任务号', '申请人', '操作人', '状态', '备注']
  const dataRows = rows.map((row: any) => [
    row.transaction_no || '',
    row.transaction_date || '',
    getCountries(row).join('、'),
    `${getPrimaryCategoryLabel(row)} / ${getTransactionTypeLabel(row)}`,
    getDirectionParts(row).join('+'),
    Number(row.amount_cny || 0).toFixed(2),
    row.amount_usd ? Number(row.amount_usd || 0).toFixed(2) : '',
    row.customer_name || '',
    getBusinessSummary(row),
    getOrderIdSummary(row) || row.order_number || '',
    row.staff_name || '',
    row.handler_name || '',
    row.status || '',
    row.notes || '',
  ])
  downloadCsv(`交易流水_${dayjs().format('YYYYMMDD_HHmm')}.csv`, headers, dataRows)
  message.success(`已导出 ${rows.length} 条流水`)
}

async function loadStats() {
  let q = supabase.from('financial_transactions').select('entry_scope, transaction_type, direction, amount_cny, amount_usd, customer_name, status, notes, business_countries, business_types, business_order_count, business_breakdown')
  if (dateRange.value) {
    q = q.gte('transaction_date', dateRange.value[0].format('YYYY-MM-DD'))
    q = q.lte('transaction_date', dateRange.value[1].format('YYYY-MM-DD'))
  }
  const { data } = await q
  const rows = [...mockRows.value, ...(data || [])].map(normalizeFinancialRow)
  stats.count = rows.length
  stats.customerCount = new Set(rows.map((row: any) => String(row.customer_name || '').trim()).filter(Boolean)).size
  stats.totalIncome = rows.reduce((s, r) => s + getAmountByDirection(r, '收入', 'amount_cny'), 0)
  stats.totalIncomeUsd = rows.reduce((s, r) => s + getAmountByDirection(r, '收入', 'amount_usd'), 0)
  stats.totalExpense = rows.reduce((s, r) => s + getAmountByDirection(r, '支出', 'amount_cny'), 0)
  const seenOffsetGroups = new Set<string>()
  const groupOffset = rows.reduce((sum, row) => {
    const amount = Number(row?._group_offset_amount || 0)
    const key = String(row?._split_group || '')
    if (!amount || !key || seenOffsetGroups.has(key)) return sum
    seenOffsetGroups.add(key)
    return sum + amount
  }, 0)
  stats.totalOffset = rows.reduce((s, r) => s + getAmountByDirection(r, '账面抵消', 'amount_cny'), 0) + groupOffset
  stats.offsetOrderCount = rows.filter(r => getDirectionParts(r).includes('账面抵消')).reduce((s, r) => s + getBusinessOrderCount(r), 0)
}

function onTableChange(p: any) {
  page.value = p.current
  pageSize.value = p.pageSize
  loadData()
}

function openAdd() {
  editId.value = null
  Object.assign(form, emptyForm())
  onScopeChange(form.entry_scope)
  modalOpen.value = true
}

function openEdit(row: any) {
  const normalized = normalizeFinancialRow(row)
  if (!canModify(normalized)) {
    message.warning('已审批或已作废的流水不支持修改')
    return
  }
  editId.value = row.id
  Object.assign(form, {
    entry_scope: normalized.entry_scope || inferEntryScope(normalized.transaction_type),
    transaction_type: normalized.transaction_type,
    direction: normalized.direction,
    amount_cny: Number(row.amount_cny || 0),
    amount_usd: Number(row.amount_usd || 0),
    exchange_rate: row.exchange_rate ? Number(row.exchange_rate) : null,
    customer_name: row.customer_name || '',
    order_number: row.order_number || '',
    staff_name: row.staff_name || '',
    business_countries: getCountries(row),
    business_types: getBusinessTypes(row),
    business_order_count: getBusinessOrderCount(row),
    business_breakdown: getBusinessBreakdown(row).length
      ? getBusinessBreakdown(row).map((item: any) => ({
        ...item,
        order_number: getBreakdownOrderId(item),
        country: item.country || '',
        business_type: normalizeBusinessType(item.business_type),
        order_count: Number(item.order_count || 0) || undefined,
      }))
      : [{
        order_number: row.order_number || '',
        country: getCountries(row)[0] || '',
        business_type: getBusinessTypes(row)[0] || '',
        order_count: getBusinessOrderCount(row) || undefined,
      }],
    offset_source_type: row.offset_source_type || '',
    offset_source_note: row.offset_source_note || '',
    handler_name: currentUser.value?.name || row.handler_name || '',
    status: normalized.status === '已确认' ? '已修改' : normalized.status,
    notes: stripSplitMarker(normalized.notes || row.notes || ''),
    transaction_date: row.transaction_date || dayjs().format('YYYY-MM-DD'),
  })
  onScopeChange(form.entry_scope)
  ensureBusinessBreakdownRows()
  modalOpen.value = true
}

async function handleSave() {
  if (Number(form.amount_cny || 0) <= 0 && Number(form.amount_usd || 0) <= 0) { message.error('人民币或美元金额至少填写一项'); return }
  if (!isAdministrativeEntry.value && !String(form.transaction_type || '').trim()) { message.error('请选择二级分类'); return }
  if (!form.transaction_date) { message.error('请填写交易日期'); return }
  const normalizedBreakdown = getNormalizedFormBusinessBreakdown()
  const businessCountries = [...new Set(normalizedBreakdown.map((item: any) => item.country).filter(Boolean))]
  const businessTypes = [...new Set(normalizedBreakdown.map((item: any) => item.business_type).filter(Boolean))]
  const businessOrderCount = normalizedBreakdown.reduce((sum: number, item: any) => sum + Number(item.order_count || 0), 0)
  saving.value = true
  try {
    const payload: any = {
      ...form,
      entry_scope: form.entry_scope,
      transaction_type: isAdministrativeEntry.value ? null : form.transaction_type,
      direction: getDirection(form),
      business_countries: businessCountries,
      business_types: businessTypes,
      business_order_count: businessOrderCount,
      business_breakdown: normalizedBreakdown,
      offset_source_type: form.direction === '账面抵消' ? (form.offset_source_type || null) : null,
      offset_source_note: form.direction === '账面抵消' ? (form.offset_source_note || null) : null,
      handler_name: currentUser.value?.name || form.handler_name || '',
      updated_at: new Date().toISOString(),
    }
    if (!showUsdFields.value) {
      payload.amount_usd = null
      payload.exchange_rate = null
    } else if (!payload.amount_usd) {
      payload.amount_usd = null
    }
    if (!showOrderNumberField.value) {
      payload.order_number = null
    }
    if (editId.value) {
      const target = ledgerRows.value.find(item => item.id === editId.value) || list.value.find(item => item.id === editId.value)
      if (target?._split_group) {
        const note = stripSplitMarker(payload.notes)
        payload.notes = note ? `${note}|split:${target._split_group}` : `分笔实收|split:${target._split_group}`
      }
      if (target && !canModify(target)) {
        message.warning('已审批或已作废的流水不支持修改')
        return
      }
      if (String(editId.value).startsWith('mock-ledger-')) {
        mockRows.value = mockRows.value.map(item =>
          item.id === editId.value
            ? {
                ...item,
                ...payload,
                status: '已修改',
              }
            : item,
        )
        message.success('已更新')
      } else {
      await supabase.from('financial_transactions').update(payload).eq('id', editId.value)
      message.success('已更新')
      }
    } else {
      const { data: noData } = await supabase.rpc('generate_transaction_no')
      payload.transaction_no = noData || `FT-${Date.now()}`
      await supabase.from('financial_transactions').insert(payload)
      message.success('已新增')
    }
    modalOpen.value = false
    loadData(); loadStats()
  } finally { saving.value = false }
}

function getSplitGroupRows(record: any) {
  const key = String(record?._split_group || '')
  if (!key) return [record]
  const rows = ledgerRows.value.filter(item => String(item?._split_group || '') === key)
  return rows.length ? rows : [record]
}

function buildSplitDetailRecord(group: any[]) {
  const first = normalizeFinancialRow(group[0])
  const receipts = group.map(item => ({
    id: item.id,
    no: String(item.transaction_no || ''),
    amount: Number(item.amount_cny || 0),
    account: String(item.landing_account || '').trim(),
  }))
  const accounts = [...new Set(receipts.map(item => item.account))]
  const cash = receipts.reduce((sum, item) => sum + item.amount, 0)
  const offset = Number(first._group_offset_amount || 0)
  const source = getBusinessBreakdown(first)[0] || {}
  return {
    ...first,
    transaction_no: receipts.map(item => item.no).filter(Boolean).join(' / '),
    _split_receipts: receipts,
    _split_accounts_differ: accounts.length > 1,
    _group_offset_amount: offset,
    amount_cny: cash,
    direction: offset > 0 ? '收入+账面抵消' : '收入',
    settlement_directions: offset > 0 ? ['收入', '账面抵消'] : ['收入'],
    business_breakdown: [{
      direction: '收入',
      target_order_number: getBreakdownOrderId(source) || first.order_number,
      country: source.country || getCountries(first)[0] || '',
      business_type: source.business_type || getBusinessTypes(first)[0] || '',
      order_count: Number(source.order_count || first.business_order_count || 0),
      amount_cny: cash,
    }],
  }
}

function openDetail(row: any) {
  const group = getSplitGroupRows(row)
  detailRecord.value = group.length > 1 ? buildSplitDetailRecord(group) : normalizeFinancialRow(row)
  detailOpen.value = true
}

async function approveRow(row: any) {
  const ids = getSplitGroupRows(row).map(item => item.id).filter(Boolean)
  if (!ids.length || !canApprove(row)) return
  const mockIds = ids.filter(id => String(id).startsWith('mock-ledger-'))
  const realIds = ids.filter(id => !String(id).startsWith('mock-ledger-'))
  if (mockIds.length) {
    mockRows.value = mockRows.value.map(item =>
      mockIds.includes(item.id)
        ? {
            ...item,
            status: '已确认',
            handler_name: currentUser.value?.name || row.handler_name || '',
            updated_at: new Date().toISOString(),
          }
        : item,
    )
  }
  if (realIds.length) {
    await supabase
      .from('financial_transactions')
      .update({
        status: '已确认',
        handler_name: currentUser.value?.name || row.handler_name || '',
        updated_at: new Date().toISOString(),
      })
      .in('id', realIds)
  }
  message.success('已审批')
  selectedRowKeys.value = selectedRowKeys.value.filter(id => !ids.includes(id))
  loadData(); loadStats()
}

async function approveSelectedRows() {
  const ids = selectedRowKeys.value.filter(Boolean)
  if (!ids.length) {
    message.warning('请先选择待审批流水')
    return
  }
  const mockIds = ids.filter(id => String(id).startsWith('mock-ledger-'))
  const realIds = ids.filter(id => !String(id).startsWith('mock-ledger-'))
  if (mockIds.length) {
    mockRows.value = mockRows.value.map(item =>
      mockIds.includes(item.id)
        ? {
            ...item,
            status: '已确认',
            handler_name: currentUser.value?.name || '',
            updated_at: new Date().toISOString(),
          }
        : item,
    )
  }
  if (realIds.length) {
  await supabase
    .from('financial_transactions')
    .update({
      status: '已确认',
      handler_name: currentUser.value?.name || '',
      updated_at: new Date().toISOString(),
    })
    .in('id', realIds)
  }
  message.success(`已批量审批 ${ids.length} 条`)
  selectedRowKeys.value = []
  loadData(); loadStats()
}

async function voidSplitRow(row: any) {
  const ids = getSplitGroupRows(row).map(item => item.id).filter(Boolean)
  if (!ids.length) return
  const mockIds = ids.filter(id => String(id).startsWith('mock-ledger-'))
  const realIds = ids.filter(id => !String(id).startsWith('mock-ledger-'))
  if (mockIds.length) {
    mockRows.value = mockRows.value.map(item =>
      mockIds.includes(item.id)
        ? {
            ...item,
            status: '已作废',
            handler_name: currentUser.value?.name || item.handler_name || '',
            updated_at: new Date().toISOString(),
          }
        : item,
    )
  }
  if (realIds.length) {
    await supabase
      .from('financial_transactions')
      .update({
        status: '已作废',
        handler_name: currentUser.value?.name || '',
        updated_at: new Date().toISOString(),
      })
      .in('id', realIds)
  }
  message.success('已作废')
  selectedRowKeys.value = selectedRowKeys.value.filter(key => !ids.includes(key))
  loadData(); loadStats()
}

async function voidRow(id: string) {
  const row = ledgerRows.value.find(item => item.id === id) || { id }
  await voidSplitRow(row)
}

onMounted(() => {
  loadFromStorage()
  mockRows.value = buildLedgerPreviewRows()
  onScopeChange(form.entry_scope)
  loadData()
  loadStats()
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }

.kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; }
.kpi-card { background: #fff; border-radius: 10px; padding: 18px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); border: 1px solid #f0f0f0; }
.kpi-val { font-size: 22px; font-weight: 700; color: #2563eb; }
.kpi-val.green { color: #059669; }
.kpi-val.red { color: #dc2626; }
.kpi-val.blue { color: #2563eb; }
.kpi-subval { margin-top: 4px; font-size: 12px; color: #6b7280; line-height: 1; }
.kpi-label { font-size: 12px; color: #6b7280; margin-top: 6px; }
.kpi-split { display: grid; grid-template-columns: 1fr 1px 1fr; align-items: center; gap: 14px; height: 100%; }
.kpi-split-item { min-width: 0; }
.kpi-split-divider { align-self: stretch; background: #e5e7eb; }

.filter-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }

.form-tip { margin: -4px 0 8px; font-size: 12px; color: #6b7280; }
.business-edit-card {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
}
.business-edit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  color: #1a1a2e;
  font-size: 12px;
  font-weight: 700;
}
.business-edit-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.business-edit-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 90px 54px;
  gap: 8px;
  align-items: center;
}
.business-edit-tip {
  margin-top: 8px;
  color: #6b7280;
  font-size: 12px;
}
.amount-stack { display: flex; flex-direction: column; gap: 2px; }
.split-amount-with-offset {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}
.split-amount-lines {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.split-offset-side {
  display: flex;
  align-items: baseline;
  padding-left: 12px;
  border-left: 1px solid #e5e7eb;
  white-space: nowrap;
}
.amount-name { margin-right: 4px; color: #6b7280; font-weight: 400; }
.amount-in { color: #059669; font-weight: 600; }
.amount-out { color: #dc2626; font-weight: 600; }
.amount-offset { color: #2563eb; font-weight: 600; }
.text-muted { color: #9ca3af; }
.direction-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.type-stack { display: flex; flex-direction: column; gap: 4px; }
.type-primary { font-size: 12px; color: #6b7280; line-height: 1.2; }
.business-summary { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.business-sub { color: #6b7280; font-size: 12px; }
.detail-panel { display: flex; flex-direction: column; gap: 14px; }
.detail-hero {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 18px;
  box-shadow: 0 8px 24px rgba(26, 26, 46, 0.06);
}
.detail-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
.detail-card-compact { padding-bottom: 14px; }
.detail-hero-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.detail-meta-line { margin-top: 8px; color: #6b7280; font-size: 12px; }
.detail-amount-line { display: flex; align-items: baseline; gap: 8px; }
.detail-amount-line + .detail-amount-line { margin-top: 6px; }
.detail-split-receipt + .detail-split-receipt,
.detail-split-receipt + .detail-amount-line { margin-top: 8px; }
.detail-split-account { margin-top: 2px; color: #6b7280; font-size: 12px; }
.detail-amount-name { color: #6b7280; font-size: 12px; }
.detail-amount { font-size: 26px; line-height: 1.1; }
.detail-merge-table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
.detail-merge-table th,
.detail-merge-table td { padding: 9px 10px; font-size: 12px; text-align: left; vertical-align: middle; color: #374151; border-top: 1px solid #f0f0f0; }
.detail-merge-table th { background: #f8f9fb; color: #6b7280; font-weight: 600; border-top: none; }
.detail-merge-table .amount { text-align: right; }
.detail-merge-table .task-cell { border-right: 1px solid #f0f0f0; }
.detail-merge-table strong { color: #1a1a2e; font-weight: 600; }
.detail-section-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 20px; }
.detail-section-title { display: block; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.detail-section-head .detail-section-title { margin-bottom: 0; }
.detail-section-summary { color: #6b7280; font-size: 12px; text-align: right; }
.detail-info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.detail-info-item { background: #f8f9fb; border: 1px solid #f0f0f0; border-radius: 10px; padding: 10px; min-width: 0; }
.detail-info-item span { display: block; color: #6b7280; font-size: 12px; margin-bottom: 5px; }
.detail-info-item strong { color: #1a1a2e; font-weight: 600; word-break: break-all; }
.detail-source-note { margin-bottom: 12px; padding: 10px 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; color: #1d4ed8; font-size: 13px; line-height: 1.5; }
.breakdown-table { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
.breakdown-table-head,
.breakdown-table-row { display: grid; grid-template-columns: 1.4fr .7fr .7fr 52px 80px; gap: 8px; align-items: center; padding: 9px 10px; }
.breakdown-table-plain .breakdown-table-head,
.breakdown-table-plain .breakdown-table-row { grid-template-columns: 1.6fr 1fr 90px; }
.breakdown-table-head { background: #f8f9fb; color: #6b7280; font-size: 12px; font-weight: 600; }
.breakdown-table-row { color: #374151; font-size: 12px; border-top: 1px solid #f0f0f0; }
.breakdown-table-row strong { color: #1a1a2e; text-align: right; }
.offset-source-table { margin-top: 10px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
.offset-source-title { padding: 10px 12px; background: #eff6ff; color: #1d4ed8; font-size: 13px; font-weight: 700; border-bottom: 1px solid #bfdbfe; }
.offset-source-head,
.offset-source-row { display: grid; grid-template-columns: 1.4fr 1fr 76px 96px; gap: 8px; align-items: center; padding: 9px 10px; }
.offset-source-head-simple,
.offset-source-row-simple { grid-template-columns: minmax(0, 1fr) 120px; }
.offset-source-head { background: #f8f9fb; color: #6b7280; font-size: 12px; font-weight: 600; }
.offset-source-row { color: #374151; font-size: 12px; border-top: 1px solid #f0f0f0; }
.offset-source-row strong { color: #1a1a2e; text-align: right; }
.mono { font-family: 'Courier New', monospace; color: #1a1a2e; }
.detail-empty { padding: 16px; text-align: center; color: #9ca3af; background: #f8f9fb; border-radius: 10px; }
.detail-notes { color: #374151; line-height: 1.6; white-space: pre-wrap; }
</style>
