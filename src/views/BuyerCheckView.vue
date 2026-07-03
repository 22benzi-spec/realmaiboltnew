<template>
  <div class="check-page">
    <div class="page-header">
      <div class="header-text">
        <h1 class="page-title">买手校验中心</h1>
        <p class="page-desc">输入买手和 ASIN，系统按风险维度输出判定原因和历史证据</p>
      </div>
    </div>

    <!-- ===== 单个校验 ===== -->
    <div class="single-layout">
      <div class="form-section">
        <div class="form-card">
          <div class="form-card-title">
            <SearchOutlined style="margin-right:6px" />
            校验信息
          </div>

          <div class="field">
            <label class="field-label">买手姓名 <span class="required">*</span></label>
            <div class="buyer-input-wrap">
              <a-input
                v-model:value="buyerInput"
                placeholder="输入买手姓名（支持模糊搜索）"
                size="large"
                allow-clear
                @input="onBuyerInput"
                @press-enter="runSingleCheck"
              >
                <template #prefix><UserOutlined style="color:#bbb" /></template>
              </a-input>
              <div v-if="buyerSuggestions.length > 0" class="suggestions-panel">
                <div
                  v-for="s in buyerSuggestions"
                  :key="s.id"
                  class="suggestion-row"
                  @click="selectBuyer(s)"
                >
                  <div class="suggestion-avatar" :style="{ background: getAvatarColor(s.name) }">
                    {{ s.name.charAt(0) }}
                  </div>
                  <div class="suggestion-info">
                    <div class="suggestion-name">{{ s.name }}</div>
                    <div class="suggestion-meta">{{ s.total_orders }} 单 / 评分 {{ s.rating }}</div>
                  </div>
                  <span :class="['suggestion-status', s.status === 'active' ? 'active' : 'inactive']">
                    {{ s.status === 'active' ? '正常' : '停用' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedBuyer" class="buyer-profile-card">
            <div class="profile-avatar" :style="{ background: getAvatarColor(selectedBuyer.name) }">
              {{ selectedBuyer.name.charAt(0) }}
            </div>
            <div class="profile-info">
              <div class="profile-name">{{ selectedBuyer.name }}</div>
              <div class="profile-stats">
                <span :class="['profile-status', selectedBuyer.status === 'active' ? 'active' : 'inactive']">
                  {{ selectedBuyer.status === 'active' ? '正常' : '停用' }}
                </span>
                <span class="profile-stat-item">累计 {{ selectedBuyer.total_orders }} 单</span>
                <span class="profile-stat-item">评分 {{ selectedBuyer.rating }}</span>
              </div>
            </div>
            <CloseOutlined class="profile-clear" @click="clearBuyer" />
          </div>

          <div class="field">
            <label class="field-label">ASIN <span class="required">*</span></label>
            <a-input
              v-model:value="dimValues.asin"
              placeholder="输入 ASIN 后自动关联店铺、品牌、客户信息"
              size="large"
              allow-clear
              @press-enter="runSingleCheck"
            >
              <template #prefix><BarcodeOutlined style="color:#bbb" /></template>
            </a-input>
            <div class="asin-lookup-hint">
              系统会自动识别店铺、品牌、客户信息，并输出可下单或拦截原因。
            </div>
          </div>

          <a-button
            type="primary"
            size="large"
            block
            class="run-btn"
            :loading="checking"
            :disabled="!buyerInput.trim() || !dimValues.asin.trim()"
            @click="runSingleCheck"
          >
            <template #icon><ThunderboltOutlined /></template>
            开始校验
          </a-button>
          <a-button
            block
            class="demo-btn"
            @click="showMockBlockingDemo"
          >
            查看多维拦截演示
          </a-button>

          <div class="batch-mini-card">
            <div class="batch-mini-head" @click="batchPanelOpen = !batchPanelOpen">
              <span><UnorderedListOutlined /> 批量校验</span>
              <DownOutlined :class="{ rotated: batchPanelOpen }" />
            </div>
            <div v-if="batchPanelOpen" class="batch-mini-body">
              <a-textarea
                v-model:value="batchInput"
                placeholder="每行一个买手姓名，共用上方 ASIN"
                :rows="4"
              />
              <a-button
                block
                size="small"
                class="batch-mini-btn"
                :loading="batchChecking"
                :disabled="batchNames.length === 0 || !dimValues.asin.trim()"
                @click="runBatchCheck"
              >
                批量校验 {{ batchNames.length }} 人
              </a-button>
              <a-button
                block
                size="small"
                class="batch-demo-btn"
                @click="showMockBatchDemo"
              >
                查看批量多买手演示
              </a-button>
            </div>
          </div>
        </div>
      </div>

      <div class="result-section">
        <template v-if="singleResult">
          <div class="result-hero" :class="singleResult.overallPass ? 'hero-pass' : 'hero-fail'">
            <div class="hero-left">
              <div class="hero-avatar" :style="{ background: getAvatarColor(singleResult.buyerName) }">
                {{ singleResult.buyerName.charAt(0) }}
              </div>
              <div>
                <div class="hero-name">{{ singleResult.buyerName }}</div>
                <div class="hero-info">
                  <template v-if="singleResult.buyerInfo">
                    <a-tag :color="singleResult.buyerInfo.status === 'active' ? 'green' : 'red'" size="small">
                      {{ singleResult.buyerInfo.status === 'active' ? '账号正常' : '账号停用' }}
                    </a-tag>
                    <span class="hero-stat">{{ singleResult.buyerInfo.total_orders }} 单</span>
                    <span class="hero-stat">评分 {{ singleResult.buyerInfo.rating }}</span>
                  </template>
                  <span v-else class="hero-unknown">系统无此买手档案</span>
                </div>
              </div>
            </div>
            <div class="hero-right">
              <div :class="['hero-badge', singleResult.overallPass ? 'badge-pass' : 'badge-fail']">
                <CheckCircleOutlined v-if="singleResult.overallPass" />
                <CloseCircleOutlined v-else />
                {{ singleResult.overallPass ? '可以接单' : '存在风险' }}
              </div>
              <div class="hero-counts">
                <span class="hc-pass">{{ singleResult.passCount }} 通过</span>
                <span class="hc-fail">{{ singleResult.failCount }} 拦截</span>
                <span class="hc-warn">{{ singleResult.warnCount }} 警告</span>
              </div>
            </div>
          </div>

          <div class="context-card">
            <div class="section-title-row">
              <div>
                <div class="section-title-text">任务上下文</div>
                <div class="section-subtitle">只保留校验需要的核心信息</div>
              </div>
              <span v-if="singleResult.usingMock" class="mock-tag">演示数据</span>
            </div>
            <div v-if="singleResult.asinAssociations.length > 0" class="context-grid">
              <div class="context-item">
                <span class="context-label">ASIN</span>
                <strong>{{ singleResult.asinAssociations[0].asin }}</strong>
              </div>
              <div class="context-item">
                <span class="context-label">店铺</span>
                <strong>{{ singleResult.asinAssociations[0].storeName || '未知' }}</strong>
              </div>
              <div class="context-item">
                <span class="context-label">品牌</span>
                <strong>{{ singleResult.asinAssociations[0].brandName || '未知' }}</strong>
              </div>
              <div class="context-item">
                <span class="context-label">客户</span>
                <strong>{{ singleResult.asinAssociations[0].companyName || singleResult.asinAssociations[0].customerIdStr || '未知' }}</strong>
              </div>
            </div>
          </div>

          <div v-if="blockingRisks(singleResult).length > 0" class="blocked-overview">
            <div class="blocked-overview-main">
              <CloseCircleOutlined />
              <div>
                <div class="blocked-title">禁止下单</div>
                <div class="blocked-subtitle">命中 {{ blockingRisks(singleResult).length }} 个拦截维度，先看标签再看明细。</div>
              </div>
            </div>
            <div class="blocked-dim-tags">
              <span
                v-for="risk in blockingRisks(singleResult)"
                :key="risk.key"
                :class="['blocked-dim-tag', riskDimensionClass(risk)]"
              >
                {{ riskDimensionLabel(risk) }}
              </span>
            </div>
          </div>

          <div v-if="singleResult.buyerHistory.risks.length > 0" class="history-section">
            <div class="section-title-row">
              <div>
                <div class="section-title-text">拦截明细</div>
                <div class="section-subtitle">按维度展示具体证据和禁止原因</div>
              </div>
              <span :class="['history-summary', singleResult.buyerHistory.hasBlockingRisk ? 'fail' : 'pass']">
                {{ singleResult.buyerHistory.hasBlockingRisk ? '存在拦截' : '未命中拦截' }}
              </span>
            </div>
            <div class="risk-board">
              <div
                v-for="risk in visibleRisks(singleResult)"
                :key="risk.key"
                :class="['risk-card-v2', risk.status, riskDimensionClass(risk)]"
              >
                <div class="risk-card-top">
                  <span class="risk-dim-badge">{{ riskDimensionLabel(risk) }}</span>
                  <span :class="['history-risk-badge', risk.status]">
                    {{ risk.status === 'fail' ? '拦截' : risk.status === 'warn' ? '提示' : '通过' }}
                  </span>
                </div>
                <div class="risk-reason-v2">{{ risk.reason }}</div>
                <div v-if="risk.records.length > 0" class="risk-evidence-list">
                  <div class="risk-evidence-title">历史订单</div>
                  <div v-for="record in risk.records.slice(0, 4)" :key="record.id" class="risk-evidence-card">
                    <div v-for="field in historyEvidenceFields(record)" :key="field.label" class="risk-evidence-field">
                      <span>{{ field.label }}</span>
                      <strong>{{ field.value }}</strong>
                    </div>
                  </div>
                </div>
                <div v-if="visibleRiskDetailLines(risk).length" class="risk-detail-lines">
                  <div v-for="(line, li) in visibleRiskDetailLines(risk)" :key="li" class="risk-detail-line">
                    {{ line }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="singleResult.items.some(item => item.rules.length > 0)" class="result-detail-list">
            <div
              v-for="item in singleResult.items"
              :key="item.dimension"
              :class="['detail-card', 'status-' + item.status]"
            >
              <div class="detail-header">
                <div class="detail-dim">
                  <component :is="getDimIconComp(item.dimension)" class="detail-dim-icon" />
                  <div>
                    <div class="detail-dim-name">{{ getDimLabel(item.dimension) }}</div>
                    <div class="detail-dim-value">{{ item.targetValue || '未指定目标值' }}</div>
                  </div>
                </div>
                <span :class="['detail-badge', item.status]">
                  <CheckCircleOutlined v-if="item.status === 'pass'" />
                  <CloseCircleOutlined v-else-if="item.status === 'fail'" />
                  <ExclamationCircleOutlined v-else />
                  {{ item.status === 'pass' ? '通过' : item.status === 'fail' ? '拦截' : '警告' }}
                </span>
              </div>
              <div v-if="item.rules.length > 0" class="detail-rules">
                <div v-for="(rule, ri) in item.rules" :key="ri" class="rule-item">
                  <span :class="['rule-tag', rule.rule_type]">
                    {{ rule.rule_type === 'deny' ? '禁止' : '允许' }}
                  </span>
                  <span class="rule-text">{{ rule.reason }}</span>
                </div>
              </div>
              <div v-else class="detail-no-rules">无限制规则，默认通过</div>
            </div>
          </div>
        </template>

        <div v-else class="empty-state">
          <div class="empty-visual">
            <SafetyCertificateOutlined class="empty-main-icon" />
          </div>
          <div class="empty-title">输入买手信息开始校验</div>
          <div class="empty-desc">输入买手姓名、选择校验维度并填写对应值，系统将自动匹配规则库进行准入校验</div>
          <div class="empty-dims">
            <span v-for="dim in allDimensions" :key="dim.key" class="empty-dim-tag">
              <component :is="dim.icon" style="font-size:12px" />
              {{ dim.label }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="batchResults.length > 0" class="batch-results-section left-batch-results">
        <div class="batch-results-header">
          <div class="batch-results-title">校验结果</div>
          <div class="batch-stats-row">
            <span class="bs-item bs-total">共 {{ batchResults.length }} 人</span>
            <span class="bs-item bs-pass">{{ batchResults.filter(r => r.overallPass).length }} 通过</span>
            <span class="bs-item bs-fail">{{ batchResults.filter(r => !r.overallPass).length }} 有风险</span>
          </div>
          <div class="batch-filter-row">
            <span
              :class="['bf-tab', batchFilter === 'all' ? 'active' : '']"
              @click="batchFilter = 'all'"
            >全部</span>
            <span
              :class="['bf-tab', batchFilter === 'pass' ? 'active' : '']"
              @click="batchFilter = 'pass'"
            >通过</span>
            <span
              :class="['bf-tab', batchFilter === 'fail' ? 'active' : '']"
              @click="batchFilter = 'fail'"
            >有风险</span>
          </div>
        </div>

        <div class="batch-results-list">
          <div
            v-for="br in filteredBatchResults"
            :key="br.buyerName"
            :class="['batch-result-card', br.overallPass ? 'card-pass' : 'card-fail']"
          >
            <div class="brc-left">
              <div class="brc-avatar" :style="{ background: getAvatarColor(br.buyerName) }">
                {{ br.buyerName.charAt(0) }}
              </div>
              <div class="brc-info">
                <div class="brc-name">{{ br.buyerName }}</div>
                <div class="brc-meta">
                  <template v-if="br.buyerInfo">
                    {{ br.buyerInfo.total_orders }} 单 / 评分 {{ br.buyerInfo.rating }}
                  </template>
                  <span v-else class="brc-no-record">无档案</span>
                </div>
              </div>
            </div>
            <div class="brc-dims">
              <span
                v-for="risk in visibleRisks(br).slice(0, 4)"
                :key="risk.key"
                :class="['brc-dim-tag', risk.status]"
              >
                {{ riskDimensionLabel(risk) }}:
                {{ risk.status === 'pass' ? '通过' : risk.status === 'fail' ? '拦截' : '警告' }}
              </span>
            </div>
            <div :class="['brc-verdict', br.overallPass ? 'pass' : 'fail']">
              <CheckCircleOutlined v-if="br.overallPass" />
              <CloseCircleOutlined v-else />
              {{ br.overallPass ? '可接单' : '有风险' }}
            </div>
            <div v-if="!br.overallPass" class="brc-expand" @click="toggleExpand(br.buyerName)">
              <DownOutlined :class="{ rotated: expandedBatch.includes(br.buyerName) }" />
            </div>
            <div v-if="expandedBatch.includes(br.buyerName)" class="brc-detail">
              <div class="risk-board batch-risk-board">
                <div
                  v-for="risk in visibleRisks(br)"
                  :key="risk.key"
                  :class="['risk-card-v2', risk.status, riskDimensionClass(risk)]"
                >
                  <div class="risk-card-top">
                    <span class="risk-dim-badge">{{ riskDimensionLabel(risk) }}</span>
                    <span :class="['history-risk-badge', risk.status]">
                      {{ risk.status === 'fail' ? '拦截' : risk.status === 'warn' ? '提示' : '通过' }}
                    </span>
                  </div>
                  <div class="risk-reason-v2">{{ risk.reason }}</div>
                  <div v-if="risk.records.length > 0" class="risk-evidence-list">
                    <div class="risk-evidence-title">历史订单</div>
                    <div v-for="record in risk.records.slice(0, 4)" :key="record.id" class="risk-evidence-card">
                      <div v-for="field in historyEvidenceFields(record)" :key="field.label" class="risk-evidence-field">
                        <span>{{ field.label }}</span>
                        <strong>{{ field.value }}</strong>
                      </div>
                    </div>
                  </div>
                  <div v-if="visibleRiskDetailLines(risk).length" class="risk-detail-lines">
                    <div v-for="(line, li) in visibleRiskDetailLines(risk)" :key="li" class="risk-detail-line">
                      {{ line }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import {
  SearchOutlined, UserOutlined, CloseOutlined,
  ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined, SafetyCertificateOutlined,
  UnorderedListOutlined, DownOutlined,
  BarcodeOutlined, ShopOutlined, TagOutlined,
  ContactsOutlined, BankOutlined,
} from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

interface BuyerInfo {
  id: string
  name: string
  status: string
  rating: number
  total_orders: number
}

interface RestrictionRule {
  rule_type: string
  reason: string
  target_value: string
}

interface DimResult {
  dimension: string
  targetValue: string
  status: 'pass' | 'fail' | 'warn'
  rules: RestrictionRule[]
}

interface AsinAssociation {
  key: string
  asin: string
  storeId: string
  storeName: string
  brandName: string
  contactId: string
  contactName: string
  companyId: string
  companyName: string
  customerIdStr: string
  productName: string
  productImage: string
  productPrice: number
  source: 'client_library' | 'order_snapshot'
  lastOrderAt: string
  orderCount: number
  isMock?: boolean
}

interface BuyerHistoryRecord {
  id: string
  orderNumber?: string
  asin: string
  storeName: string
  brandName: string
  customerName: string
  customerIdStr: string
  date: string
  isMock?: boolean
}

interface BuyerHistoryRisk {
  key: string
  title: string
  status: 'pass' | 'fail' | 'warn'
  reason: string
  records: BuyerHistoryRecord[]
  detailLines?: string[]
}

interface BuyerHistorySummary {
  total: number
  risks: BuyerHistoryRisk[]
  hasBlockingRisk: boolean
}

interface ScopeOptions {
  sameCustomerOtherStores: boolean
  sameCompanyAllStores: boolean
  partialCustomerStores: boolean
  partialStoreNames: string
}

interface CheckResult {
  buyerName: string
  buyerInfo: BuyerInfo | null
  items: DimResult[]
  asinAssociations: AsinAssociation[]
  buyerHistory: BuyerHistorySummary
  overallPass: boolean
  passCount: number
  failCount: number
  warnCount: number
  usingMock: boolean
}

const allDimensions = [
  { key: 'asin', label: 'ASIN', icon: BarcodeOutlined, placeholder: '输入ASIN编码，如 B0GM5UVWX4' },
  { key: 'store', label: '店铺', icon: ShopOutlined, placeholder: '输入店铺名称，如 星辰旗舰店' },
  { key: 'brand', label: '品牌', icon: TagOutlined, placeholder: '输入品牌名，如 优品居家' },
  { key: 'client_contact', label: '客户联系人', icon: ContactsOutlined, placeholder: '输入联系人姓名，如 李经理' },
  { key: 'client_company', label: '客户公司', icon: BankOutlined, placeholder: '输入公司名，如 深圳科技有限公司' },
]

const buyerInput = ref('')
const buyerSuggestions = ref<BuyerInfo[]>([])
const selectedBuyer = ref<BuyerInfo | null>(null)
const selectedDims = ref<string[]>(['asin', 'store', 'client_contact', 'client_company'])
const dimValues = reactive<Record<string, string>>({
  asin: '', store: '', brand: '', client_contact: '', client_company: '',
})
const scopeOptions = reactive<ScopeOptions>({
  sameCustomerOtherStores: false,
  sameCompanyAllStores: false,
  partialCustomerStores: false,
  partialStoreNames: '',
})
const checking = ref(false)
const singleResult = ref<CheckResult | null>(null)

const batchInput = ref('')
const batchChecking = ref(false)
const batchResults = ref<CheckResult[]>([])
const batchFilter = ref('all')
const batchPanelOpen = ref(false)
const expandedBatch = ref<string[]>([])

let suggestTimer: ReturnType<typeof setTimeout> | null = null

const batchNames = computed(() =>
  batchInput.value.split('\n').map(n => n.trim()).filter(Boolean)
)

const filteredBatchResults = computed(() => {
  if (batchFilter.value === 'pass') return batchResults.value.filter(r => r.overallPass)
  if (batchFilter.value === 'fail') return batchResults.value.filter(r => !r.overallPass)
  return batchResults.value
})

const avatarColors = ['#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#be185d']

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function toggleDim(key: string) {
  const idx = selectedDims.value.indexOf(key)
  if (idx >= 0) selectedDims.value.splice(idx, 1)
  else selectedDims.value.push(key)
}

function onBuyerInput() {
  selectedBuyer.value = null
  if (suggestTimer) clearTimeout(suggestTimer)
  if (!buyerInput.value.trim()) {
    buyerSuggestions.value = []
    return
  }
  suggestTimer = setTimeout(fetchSuggestions, 300)
}

async function fetchSuggestions() {
  const { data } = await supabase
    .from('buyers')
    .select('id, name, status, rating, total_orders')
    .ilike('name', `%${buyerInput.value.trim()}%`)
    .limit(8)
  buyerSuggestions.value = data || []
}

function selectBuyer(b: BuyerInfo) {
  buyerInput.value = b.name
  selectedBuyer.value = b
  buyerSuggestions.value = []
}

function clearBuyer() {
  buyerInput.value = ''
  selectedBuyer.value = null
  singleResult.value = null
}

async function fetchBuyerInfo(name: string): Promise<BuyerInfo | null> {
  const { data } = await supabase
    .from('buyers')
    .select('id, name, status, rating, total_orders')
    .ilike('name', name)
    .maybeSingle()
  return data as BuyerInfo | null
}

function normalizeText(value: any) {
  return String(value || '').trim().toLowerCase()
}

function normalizeAsin(value: any) {
  return String(value || '').trim().toUpperCase()
}

function uniqueFilled(values: string[]) {
  return [...new Set(values.map(v => String(v || '').trim()).filter(Boolean))]
}

function isGeneralBrand(value: string) {
  return normalizeText(value) === 'general'
}

function fmtDate(value: string) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toISOString().slice(0, 10)
}

function isWithinLastMonths(value: string, months: number) {
  if (!value) return false
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return false
  const threshold = new Date()
  threshold.setMonth(threshold.getMonth() - months)
  return d >= threshold
}

function emptyBuyerHistory(): BuyerHistorySummary {
  return { total: 0, risks: [], hasBlockingRisk: false }
}

function emptyCheckResult(buyerName: string, buyerInfo: BuyerInfo | null, items: DimResult[]): CheckResult {
  const failCount = items.filter(i => i.status === 'fail').length
  const warnCount = items.filter(i => i.status === 'warn').length
  const passCount = items.filter(i => i.status === 'pass').length
  return {
    buyerName,
    buyerInfo,
    items,
    asinAssociations: [],
    buyerHistory: emptyBuyerHistory(),
    overallPass: failCount === 0,
    passCount,
    failCount,
    warnCount,
    usingMock: false,
  }
}

function makeAssociationKey(row: Partial<AsinAssociation>) {
  return [
    normalizeAsin(row.asin),
    normalizeText(row.storeId || row.storeName),
    normalizeText(row.companyId || row.companyName || row.customerIdStr),
    normalizeText(row.brandName),
  ].join('|')
}

async function fetchAsinAssociations(rawAsin: string): Promise<AsinAssociation[]> {
  const asin = normalizeAsin(rawAsin)
  if (!asin) return []

  const [{ data: asinRows }, { data: orderRows }] = await Promise.all([
    supabase
      .from('client_store_asins')
      .select('id, store_id, company_id, asin, brand_name, product_name, product_image, product_price, updated_at')
      .ilike('asin', asin)
      .eq('is_active', true)
      .limit(80),
    supabase
      .from('erp_orders')
      .select('id, asin, store_name, brand_name, customer_name, customer_id_str, company_id, store_id, product_name, product_image, product_price, created_at')
      .ilike('asin', asin)
      .order('created_at', { ascending: false })
      .limit(80),
  ])

  const clientRows = (asinRows || []) as any[]
  const snapshots = (orderRows || []) as any[]
  const storeIds = uniqueFilled([
    ...clientRows.map(r => r.store_id),
    ...snapshots.map(r => r.store_id),
  ])
  const companyIds = uniqueFilled([
    ...clientRows.map(r => r.company_id),
    ...snapshots.map(r => r.company_id),
  ])

  const [{ data: storeRows }, { data: companyRows }] = await Promise.all([
    storeIds.length
      ? supabase.from('client_stores').select('id, company_id, contact_id, store_name, country, platform').in('id', storeIds)
      : Promise.resolve({ data: [] }),
    companyIds.length
      ? supabase.from('client_companies').select('id, company_name, org_id').in('id', companyIds)
      : Promise.resolve({ data: [] }),
  ])

  const stores = ((storeRows || []) as any[])
  const companies = ((companyRows || []) as any[])
  const contactIds = uniqueFilled(stores.map(s => s.contact_id))
  const contactCompanyIds = uniqueFilled(stores.map(s => s.company_id))
  const { data: contactRows } = contactIds.length || contactCompanyIds.length
    ? await supabase
      .from('client_contacts')
      .select('id, company_id, name, client_id, responsible_stores')
      .in('company_id', contactCompanyIds.length ? contactCompanyIds : [''])
    : { data: [] }

  const storeMap = new Map(stores.map(s => [s.id, s]))
  const companyMap = new Map(companies.map(c => [c.id, c]))
  const contacts = ((contactRows || []) as any[])
  const assocMap = new Map<string, AsinAssociation>()

  function findContact(store: any, companyId: string, storeName: string) {
    return contacts.find(c => c.id === store?.contact_id)
      || contacts.find(c => c.company_id === companyId && Array.isArray(c.responsible_stores) && c.responsible_stores.some((s: string) => normalizeText(s) === normalizeText(storeName)))
      || contacts.find(c => c.company_id === companyId)
      || null
  }

  function matchingSnapshots(row: Partial<AsinAssociation>) {
    return snapshots.filter(s => {
      if (row.storeId && s.store_id === row.storeId) return true
      return normalizeText(s.store_name) === normalizeText(row.storeName)
        && normalizeText(s.customer_name || s.customer_id_str) === normalizeText(row.companyName || row.customerIdStr)
    })
  }

  clientRows.forEach(row => {
    const store = storeMap.get(row.store_id)
    const company = companyMap.get(row.company_id || store?.company_id)
    const contact = findContact(store, row.company_id || store?.company_id, store?.store_name || '')
    const matchedOrders = matchingSnapshots({
      storeId: row.store_id,
      storeName: store?.store_name || '',
      companyName: company?.company_name || '',
      customerIdStr: company?.org_id || '',
    })
    const assoc: AsinAssociation = {
      key: '',
      asin,
      storeId: row.store_id || '',
      storeName: store?.store_name || '',
      brandName: row.brand_name || '',
      contactId: contact?.id || '',
      contactName: contact?.name || '',
      companyId: row.company_id || store?.company_id || '',
      companyName: company?.company_name || '',
      customerIdStr: company?.org_id || contact?.client_id || '',
      productName: row.product_name || '',
      productImage: row.product_image || '',
      productPrice: Number(row.product_price || 0),
      source: 'client_library',
      lastOrderAt: matchedOrders[0]?.created_at || row.updated_at || '',
      orderCount: matchedOrders.length,
    }
    assoc.key = makeAssociationKey(assoc)
    assocMap.set(assoc.key, assoc)
  })

  snapshots.forEach(row => {
    const store = row.store_id ? storeMap.get(row.store_id) : null
    const company = row.company_id ? companyMap.get(row.company_id) : null
    const contact = findContact(store, row.company_id || store?.company_id, row.store_name || store?.store_name || '')
    const assoc: AsinAssociation = {
      key: '',
      asin,
      storeId: row.store_id || '',
      storeName: row.store_name || store?.store_name || '',
      brandName: row.brand_name || '',
      contactId: contact?.id || '',
      contactName: contact?.name || '',
      companyId: row.company_id || store?.company_id || '',
      companyName: company?.company_name || row.customer_name || '',
      customerIdStr: row.customer_id_str || company?.org_id || contact?.client_id || '',
      productName: row.product_name || '',
      productImage: row.product_image || '',
      productPrice: Number(row.product_price || 0),
      source: 'order_snapshot',
      lastOrderAt: row.created_at || '',
      orderCount: snapshots.filter(s =>
        normalizeText(s.store_name) === normalizeText(row.store_name)
        && normalizeText(s.customer_name || s.customer_id_str) === normalizeText(row.customer_name || row.customer_id_str)
      ).length,
    }
    assoc.key = makeAssociationKey(assoc)
    if (!assocMap.has(assoc.key)) assocMap.set(assoc.key, assoc)
  })

  return [...assocMap.values()].sort((a, b) =>
    new Date(b.lastOrderAt || 0).getTime() - new Date(a.lastOrderAt || 0).getTime()
  )
}

function buildMockAssociations(asin: string): AsinAssociation[] {
  const now = new Date()
  now.setDate(now.getDate() - 12)
  return [{
    key: `mock|${asin}`,
    asin,
    storeId: 'mock-store',
    storeName: 'FreshJoy Home',
    brandName: 'FreshJoy',
    contactId: 'mock-contact',
    contactName: 'Linda',
    companyId: 'mock-company',
    companyName: 'Demo Trading LLC',
    customerIdStr: 'ORG-DEMO',
    productName: 'Mock product for buyer check rendering',
    productImage: '',
    productPrice: 19.99,
    source: 'order_snapshot',
    lastOrderAt: now.toISOString(),
    orderCount: 3,
    isMock: true,
  }]
}

function buildDimensionTargets(dimKey: string, associations: AsinAssociation[]) {
  const manual = dimValues[dimKey] || ''
  if (dimKey === 'asin') return uniqueFilled([manual])
  if (dimKey === 'store') return uniqueFilled([manual, ...associations.map(a => a.storeName)])
  if (dimKey === 'client_contact') return uniqueFilled([manual, ...associations.map(a => a.contactName)])
  if (dimKey === 'client_company') return uniqueFilled([manual, ...associations.map(a => a.companyName || a.customerIdStr)])
  return uniqueFilled([manual])
}

async function fetchRestrictionRules(buyerName: string, dimKey: string, targetValues: string[]) {
  const targets = targetValues.length ? targetValues : ['']
  const allRules: RestrictionRule[] = []
  for (const targetValue of targets) {
    let query = supabase
      .from('buyer_restrictions')
      .select('rule_type, reason, target_value')
      .ilike('buyer_name', buyerName)
      .eq('dimension', dimKey)
      .eq('is_active', true)

    if (targetValue) query = query.ilike('target_value', targetValue)
    const { data } = await query
    ;((data || []) as RestrictionRule[]).forEach(rule => {
      const key = `${rule.rule_type}|${rule.reason}|${rule.target_value}`
      if (!allRules.some(r => `${r.rule_type}|${r.reason}|${r.target_value}` === key)) allRules.push(rule)
    })
  }
  return allRules
}

function matchesCurrentCustomer(record: BuyerHistoryRecord, associations: AsinAssociation[]) {
  const currentKeys = new Set<string>()
  associations.forEach(a => {
    if (a.customerIdStr) currentKeys.add(normalizeText(a.customerIdStr))
    if (a.companyName) currentKeys.add(normalizeText(a.companyName))
  })
  return currentKeys.has(normalizeText(record.customerIdStr)) || currentKeys.has(normalizeText(record.customerName))
}

function makeRiskRecordText(record: BuyerHistoryRecord) {
  return `${displayOrderId(record)}，${fmtDate(record.date)}`
}

function displayOrderId(record: BuyerHistoryRecord) {
  return record.orderNumber || record.id || '未知订单'
}

function historyEvidenceFields(record: BuyerHistoryRecord) {
  return [
    { label: '订单ID', value: displayOrderId(record) },
    { label: '时间', value: fmtDate(record.date) },
    { label: 'ASIN', value: record.asin || '未知ASIN' },
    { label: '店铺', value: record.storeName || '未知店铺' },
    { label: '品牌', value: record.brandName || '未知品牌' },
    { label: '客户', value: record.customerName || record.customerIdStr || '未知客户' },
  ]
}

function visibleRiskDetailLines(risk: BuyerHistoryRisk) {
  return (risk.detailLines || []).filter(line => {
    if (line.startsWith('当前店铺：') || line.startsWith('当前公司主体：')) return false
    if (line.startsWith('订单ID：') || line.startsWith('当前买手：订单ID：')) return false
    return true
  })
}

function buildMockHistoryRecords(asin: string, associations: AsinAssociation[]) {
  const assoc = associations[0]
  const sameAsinDate = new Date()
  sameAsinDate.setDate(sameAsinDate.getDate() - 18)
  const brandDate = new Date()
  brandDate.setDate(brandDate.getDate() - 9)
  return [
    {
      id: 'mock-same-asin',
      orderNumber: 'SUB-MOCK-1001',
      asin,
      storeName: assoc?.storeName || 'FreshJoy Home',
      brandName: assoc?.brandName || 'FreshJoy',
      customerName: assoc?.companyName || 'Demo Trading LLC',
      customerIdStr: assoc?.customerIdStr || 'ORG-DEMO',
      date: sameAsinDate.toISOString(),
      isMock: true,
    },
    {
      id: 'mock-brand',
      orderNumber: 'SUB-MOCK-1002',
      asin: 'B0MOCKBRAND02',
      storeName: 'FreshJoy Outlet',
      brandName: assoc?.brandName || 'FreshJoy',
      customerName: assoc?.companyName || 'Demo Trading LLC',
      customerIdStr: assoc?.customerIdStr || 'ORG-DEMO',
      date: brandDate.toISOString(),
      isMock: true,
    },
  ]
}

function mockRiskDate(daysAgo: number) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

function buildMockBlockingDemo(): CheckResult {
  const asin = 'B0MOCKBLOCK01'
  const buyerName = 'Michael Brown'
  const associations = buildMockAssociations(asin)
  const assoc = associations[0]
  const sameAsinRecord: BuyerHistoryRecord = {
    id: 'mock-demo-same-asin',
    orderNumber: 'SUB-MOCK-2001',
    asin,
    storeName: assoc.storeName,
    brandName: assoc.brandName,
    customerName: assoc.companyName,
    customerIdStr: assoc.customerIdStr,
    date: mockRiskDate(18),
    isMock: true,
  }
  const sameStoreSecondRecord: BuyerHistoryRecord = {
    id: 'mock-demo-same-store-2',
    orderNumber: 'SUB-MOCK-2002',
    asin: 'B0MOCKSTORE02',
    storeName: assoc.storeName,
    brandName: 'OtherBrand',
    customerName: assoc.companyName,
    customerIdStr: assoc.customerIdStr,
    date: mockRiskDate(45),
    isMock: true,
  }
  const sameBrandRecord: BuyerHistoryRecord = {
    id: 'mock-demo-same-brand',
    orderNumber: 'SUB-MOCK-2003',
    asin: 'B0MOCKBRAND02',
    storeName: 'FreshJoy Outlet',
    brandName: assoc.brandName,
    customerName: assoc.companyName,
    customerIdStr: assoc.customerIdStr,
    date: mockRiskDate(9),
    isMock: true,
  }
  const sameCustomerRecord: BuyerHistoryRecord = {
    id: 'mock-demo-customer-store',
    orderNumber: 'SUB-MOCK-2004',
    asin: 'B0MOCKCUSTOMER03',
    storeName: 'FreshJoy Mall',
    brandName: 'KitchenPeak',
    customerName: assoc.companyName,
    customerIdStr: assoc.customerIdStr,
    date: mockRiskDate(32),
    isMock: true,
  }
  const sameCompanyRecord: BuyerHistoryRecord = {
    id: 'mock-demo-company',
    orderNumber: 'SUB-MOCK-2006',
    asin: 'B0MOCKCOMPANY04',
    storeName: 'FreshJoy Company Store',
    brandName: 'KitchenPeak',
    customerName: 'Demo Trading Group',
    customerIdStr: 'ORG-GROUP',
    date: mockRiskDate(51),
    isMock: true,
  }
  const comboCurrentRecord: BuyerHistoryRecord = {
    id: 'mock-demo-combo-current',
    orderNumber: 'SUB-MOCK-2005',
    asin: 'B0MOCKCOMBO01',
    storeName: 'FreshJoy Home',
    brandName: 'FreshJoy',
    customerName: assoc.companyName,
    customerIdStr: assoc.customerIdStr,
    date: mockRiskDate(6),
    isMock: true,
  }
  const risks: BuyerHistoryRisk[] = [
    {
      key: 'mock-same-asin',
      title: '同买手重复 ASIN',
      status: 'fail',
      reason: '同一买手不可重复购买相同 ASIN。',
      records: [sameAsinRecord],
    },
    {
      key: 'mock-same-store',
      title: '同店铺历史限制',
      status: 'fail',
      reason: `已达到店铺「${assoc.storeName}」终身限制条件。`,
      records: [sameAsinRecord, sameStoreSecondRecord],
      detailLines: [
        '规则：同店铺累计 2 次后，终身限制该店铺所有 ASIN。',
      ],
    },
    {
      key: 'mock-same-brand',
      title: '同品牌 1 个月限制',
      status: 'fail',
      reason: `1 个月内已购买过品牌「${assoc.brandName}」。`,
      records: [sameBrandRecord],
    },
    {
      key: 'mock-same-customer',
      title: '同客户其他店铺限制',
      status: 'fail',
      reason: `该客户开启了“全店排重”，已购买客户「${assoc.companyName}」下其他店铺。`,
      records: [sameCustomerRecord],
    },
    {
      key: 'mock-same-company',
      title: '同客户公司限制',
      status: 'fail',
      reason: '该客户开启了“组织级排重”，已购买同公司主体下其他店铺。',
      records: [sameCompanyRecord],
    },
    {
      key: 'mock-asin-combo',
      title: 'ASIN 组合购买风险',
      status: 'fail',
      reason: '当前买手已参与高风险 ASIN 组合轨迹。',
      records: [comboCurrentRecord],
      detailLines: [
        '组合：产品1 B0MOCKCOMBO01 + 产品2 B0MOCKCOMBO02',
        '买手 A 历史 1：SUB-COMBO-A01 / 2026-05-18 / B0MOCKCOMBO01',
        '买手 A 历史 2：SUB-COMBO-A02 / 2026-05-26 / B0MOCKCOMBO02',
        '买手 B 历史 1：SUB-COMBO-B01 / 2026-05-20 / B0MOCKCOMBO01',
        '买手 B 历史 2：SUB-COMBO-B02 / 2026-06-02 / B0MOCKCOMBO02',
        '风险：继续传产品2会形成相同两 ASIN 组合轨迹。',
      ],
    },
  ]
  return {
    buyerName,
    buyerInfo: {
      id: 'mock-buyer',
      name: buyerName,
      status: 'active',
      rating: 4.8,
      total_orders: 13,
    },
    items: [],
    asinAssociations: associations,
    buyerHistory: {
      total: 4,
      risks,
      hasBlockingRisk: true,
    },
    overallPass: false,
    passCount: risks.filter(r => r.status === 'pass').length,
    failCount: risks.filter(r => r.status === 'fail').length,
    warnCount: risks.filter(r => r.status === 'warn').length,
    usingMock: true,
  }
}

function buildMockBuyerResult(
  buyerName: string,
  riskKeys: Array<'asin' | 'store' | 'brand' | 'customer' | 'company'>,
  asin: string,
  associations: AsinAssociation[],
): CheckResult {
  const assoc = associations[0]
  const riskMap: Record<string, BuyerHistoryRisk> = {
    asin: {
      key: `${buyerName}-same-asin`,
      title: '同买手重复 ASIN',
      status: 'fail',
      reason: `${buyerName} 已购买过当前 ASIN。`,
      records: [{
        id: `${buyerName}-asin`,
        orderNumber: `SUB-${normalizeText(buyerName).replace(/\s+/g, '-').toUpperCase()}-A01`,
        asin,
        storeName: assoc.storeName,
        brandName: assoc.brandName,
        customerName: assoc.companyName,
        customerIdStr: assoc.customerIdStr,
        date: mockRiskDate(16),
        isMock: true,
      }],
    },
    store: {
      key: `${buyerName}-same-store`,
      title: '同店铺历史限制',
      status: 'fail',
      reason: `${buyerName} 在 3 个月内买过店铺「${assoc.storeName}」的其他 ASIN。`,
      records: [{
        id: `${buyerName}-store`,
        orderNumber: `SUB-${normalizeText(buyerName).replace(/\s+/g, '-').toUpperCase()}-S01`,
        asin: 'B0BATCHSTORE01',
        storeName: assoc.storeName,
        brandName: 'OtherBrand',
        customerName: assoc.companyName,
        customerIdStr: assoc.customerIdStr,
        date: mockRiskDate(39),
        isMock: true,
      }],
    },
    brand: {
      key: `${buyerName}-same-brand`,
      title: '同品牌 1 个月限制',
      status: 'fail',
      reason: `${buyerName} 在 1 个月内买过品牌「${assoc.brandName}」的 ASIN。`,
      records: [{
        id: `${buyerName}-brand`,
        orderNumber: `SUB-${normalizeText(buyerName).replace(/\s+/g, '-').toUpperCase()}-B01`,
        asin: 'B0BATCHBRAND01',
        storeName: 'FreshJoy Outlet',
        brandName: assoc.brandName,
        customerName: assoc.companyName,
        customerIdStr: assoc.customerIdStr,
        date: mockRiskDate(8),
        isMock: true,
      }],
    },
    customer: {
      key: `${buyerName}-same-customer`,
      title: '同客户其他店铺限制',
      status: 'fail',
      reason: `该客户开启了“全店排重”，${buyerName} 命中客户「${assoc.companyName}」其他店铺限制。`,
      records: [{
        id: `${buyerName}-customer`,
        orderNumber: `SUB-${normalizeText(buyerName).replace(/\s+/g, '-').toUpperCase()}-C01`,
        asin: 'B0BATCHCUSTOMER01',
        storeName: 'FreshJoy Mall',
        brandName: 'KitchenPeak',
        customerName: assoc.companyName,
        customerIdStr: assoc.customerIdStr,
        date: mockRiskDate(28),
        isMock: true,
      }],
    },
    company: {
      key: `${buyerName}-same-company`,
      title: '同客户公司限制',
      status: 'fail',
      reason: `该客户开启了“组织级排重”，${buyerName} 命中同公司主体限制。`,
      records: [{
        id: `${buyerName}-company`,
        orderNumber: `SUB-${normalizeText(buyerName).replace(/\s+/g, '-').toUpperCase()}-O01`,
        asin: 'B0BATCHCOMPANY01',
        storeName: 'FreshJoy Company Store',
        brandName: 'KitchenPeak',
        customerName: 'Demo Trading Group',
        customerIdStr: 'ORG-GROUP',
        date: mockRiskDate(44),
        isMock: true,
      }],
    },
  }
  const risks = riskKeys.map(k => riskMap[k])
  return {
    buyerName,
    buyerInfo: {
      id: `mock-${buyerName}`,
      name: buyerName,
      status: 'active',
      rating: 4.6,
      total_orders: 9,
    },
    items: [],
    asinAssociations: associations,
    buyerHistory: {
      total: risks.length,
      risks,
      hasBlockingRisk: risks.some(r => r.status === 'fail'),
    },
    overallPass: false,
    passCount: 0,
    failCount: risks.filter(r => r.status === 'fail').length,
    warnCount: 0,
    usingMock: true,
  }
}

function showMockBatchDemo() {
  const asin = 'B0MOCKBATCH01'
  const associations = buildMockAssociations(asin)
  dimValues.asin = asin
  batchPanelOpen.value = true
  batchInput.value = 'Michael Brown\nEmily Stone\nJames Wilson'
  const michael = buildMockBuyerResult('Michael Brown', ['asin', 'store', 'brand'], asin, associations)
  michael.buyerHistory.risks.push({
    key: 'michael-batch-combo',
    title: 'ASIN 组合购买风险',
    status: 'fail',
    reason: 'Michael Brown 已参与高风险两 ASIN 组合轨迹。',
    records: [],
    detailLines: [
      '组合：产品1 B0MOCKCOMBO01 + 产品2 B0MOCKCOMBO02',
      '买手 A 历史 1：SUB-COMBO-A01 / 2026-05-18 / B0MOCKCOMBO01',
      '买手 A 历史 2：SUB-COMBO-A02 / 2026-05-26 / B0MOCKCOMBO02',
      '买手 B 历史 1：SUB-COMBO-B01 / 2026-05-20 / B0MOCKCOMBO01',
      '买手 B 历史 2：SUB-COMBO-B02 / 2026-06-02 / B0MOCKCOMBO02',
    ],
  })
  michael.failCount += 1
  batchResults.value = [
    michael,
    buildMockBuyerResult('Emily Stone', ['brand', 'customer', 'company'], asin, associations),
    buildMockBuyerResult('James Wilson', ['store'], asin, associations),
  ]
}

function showMockBlockingDemo() {
  buyerInput.value = 'Michael Brown'
  dimValues.asin = 'B0MOCKBLOCK01'
  selectedBuyer.value = {
    id: 'mock-buyer',
    name: 'Michael Brown',
    status: 'active',
    rating: 4.8,
    total_orders: 13,
  }
  buyerSuggestions.value = []
  singleResult.value = buildMockBlockingDemo()
}

async function fetchBuyerAsinHistory(
  buyerInfo: BuyerInfo | null,
  asin: string,
  associations: AsinAssociation[],
  options: ScopeOptions,
): Promise<BuyerHistorySummary> {
  if (!buyerInfo?.id) {
    return {
      total: 0,
      hasBlockingRisk: false,
      risks: [{
        key: 'buyer-profile-missing',
        title: '买手历史',
        status: 'warn',
        reason: '系统无此买手档案，无法按 buyer_id 查询历史购买记录。',
        records: [],
      }],
    }
  }

  const { data } = await supabase
    .from('sub_orders')
    .select('id, sub_order_number, asin, store_name, brand_name, customer_name, customer_id_str, scheduled_date, created_at, status')
    .eq('buyer_id', buyerInfo.id)
    .not('status', 'in', '("已取消")')
    .order('created_at', { ascending: false })
    .limit(800)

  const records: BuyerHistoryRecord[] = ((data || []) as any[]).map(row => ({
    id: row.id,
    orderNumber: row.sub_order_number || row.id,
    asin: row.asin || '',
    storeName: row.store_name || '',
    brandName: row.brand_name || '',
    customerName: row.customer_name || '',
    customerIdStr: row.customer_id_str || '',
    date: row.scheduled_date || row.created_at || '',
  }))
  const usingMockRecords = records.length === 0 && associations.some(a => a.isMock)
  const historyRecords = usingMockRecords ? buildMockHistoryRecords(asin, associations) : records
  const risks: BuyerHistoryRisk[] = []
  const currentAsin = normalizeAsin(asin)
  const currentStores = new Set(associations.map(a => normalizeText(a.storeName)).filter(Boolean))
  const currentBrands = new Set(associations.map(a => a.brandName).filter(b => b && !isGeneralBrand(b)).map(normalizeText))
  const sameAsinRecords = historyRecords.filter(r => normalizeAsin(r.asin) === currentAsin)
  const firstSameAsin = sameAsinRecords[0]

  risks.push({
    key: 'same-asin',
    title: '同买手重复 ASIN',
    status: sameAsinRecords.length > 0 ? 'fail' : 'pass',
    reason: sameAsinRecords.length > 0
      ? `该买手已购买过当前 ASIN。`
      : `该买手未购买过 ASIN ${currentAsin}，可继续校验下单。`,
    records: sameAsinRecords,
  })

  const sameStoreRecords = currentStores.size
    ? historyRecords.filter(r => currentStores.has(normalizeText(r.storeName)))
    : []
  const sameStoreRecentRecords = sameStoreRecords.filter(r => isWithinLastMonths(r.date, 3))
  const firstSameStore = sameStoreRecentRecords[0] || sameStoreRecords[0]
  const storeStatus: BuyerHistoryRisk['status'] = sameStoreRecords.length >= 2 || sameStoreRecentRecords.length > 0
    ? 'fail'
    : sameStoreRecords.length === 1
      ? 'warn'
      : 'pass'
  risks.push({
    key: 'same-store',
    title: '同店铺历史限制',
    status: storeStatus,
    reason: storeStatus === 'fail'
      ? sameStoreRecords.length >= 2
        ? `店铺「${firstSameStore?.storeName || '未知店铺'}」已达到终身限制条件。`
        : `3 个月内已购买过店铺「${firstSameStore?.storeName || '未知店铺'}」。`
      : storeStatus === 'warn'
        ? `该买手历史上已有 1 次同店铺记录（${makeRiskRecordText(firstSameStore)}）；若本次允许，后续将进入该店铺终身限制。`
        : '该买手 3 个月内未购买过此 ASIN 对应店铺，可下单。',
    records: sameStoreRecords,
  })

  const sameBrandRecords = currentBrands.size
    ? historyRecords.filter(r => currentBrands.has(normalizeText(r.brandName)) && isWithinLastMonths(r.date, 1))
    : []
  const currentBrandLabel = associations.find(a => a.brandName && !isGeneralBrand(a.brandName))?.brandName || ''
  const firstBrandRecord = sameBrandRecords[0]
  risks.push({
    key: 'same-brand-1m',
    title: '同品牌 1 个月限制',
    status: currentBrandLabel && sameBrandRecords.length > 0 ? 'fail' : 'pass',
    reason: !currentBrandLabel
      ? '当前品牌为 General 或未识别品牌，不进入同品牌 1 个月限制。'
      : sameBrandRecords.length > 0
        ? `1 个月内已购买过品牌「${currentBrandLabel}」。`
        : `该买手未在 1 个月内购买过品牌「${currentBrandLabel}」的 ASIN，可下单。`,
    records: sameBrandRecords,
  })

  const sameCustomerRecords = historyRecords.filter(r => matchesCurrentCustomer(r, associations))
  const otherStoreCustomerRecords = sameCustomerRecords.filter(r => !currentStores.has(normalizeText(r.storeName)))
  if (options.sameCustomerOtherStores) {
    risks.push({
      key: 'same-customer-other-stores',
      title: '同客户其他店铺限制',
      status: otherStoreCustomerRecords.length > 0 ? 'fail' : 'pass',
      reason: otherStoreCustomerRecords.length > 0
        ? '该客户开启了“全店排重”，已购买过当前客户下其他店铺。'
        : '该客户开启了“全店排重”，未发现该买手命中其他店铺历史。',
      records: otherStoreCustomerRecords,
    })
  }

  if (options.sameCompanyAllStores) {
    risks.push({
      key: 'same-company-all-stores',
      title: '同客户公司限制',
      status: sameCustomerRecords.length > 0 ? 'fail' : 'pass',
      reason: sameCustomerRecords.length > 0
        ? '该客户开启了“组织级排重”，已购买过当前公司主体下的 ASIN。'
        : '该客户开启了“组织级排重”，未发现该买手命中公司主体历史。',
      records: sameCustomerRecords,
    })
  }

  if (options.partialCustomerStores) {
    const partialStores = new Set(options.partialStoreNames.split(/[,，\n]/).map(normalizeText).filter(Boolean))
    const currentInPartial = associations.some(a => partialStores.has(normalizeText(a.storeName)))
    const partialRecords = currentInPartial
      ? sameCustomerRecords.filter(r => partialStores.has(normalizeText(r.storeName)))
      : []
    risks.push({
      key: 'partial-customer-stores',
      title: '同客户指定店铺限制',
      status: partialRecords.length > 0 ? 'fail' : 'pass',
      reason: !partialStores.size
        ? '已启用指定店铺限制，但尚未填写限制店铺。'
        : partialRecords.length > 0
          ? '已购买过指定店铺范围内的 ASIN。'
          : '任务启用了同客户指定店铺限制，未发现该买手命中指定店铺历史。',
      records: partialRecords,
    })
  }

  return {
    total: historyRecords.length,
    risks,
    hasBlockingRisk: risks.some(r => r.status === 'fail'),
  }
}

async function checkOneBuyer(
  buyerName: string,
  context: { asin?: string; associations?: AsinAssociation[]; scope?: ScopeOptions } = {},
): Promise<CheckResult> {
  const buyerInfo = await fetchBuyerInfo(buyerName)
  const items: DimResult[] = []
  const associations = context.associations || []

  for (const dimKey of selectedDims.value) {
    const targets = buildDimensionTargets(dimKey, associations)
    const targetValue = targets.join(' / ')
    const rules = await fetchRestrictionRules(buyerName, dimKey, targets)
    const hasDeny = rules.some(r => r.rule_type === 'deny')
    let status: 'pass' | 'fail' | 'warn' = 'pass'
    if (hasDeny) status = 'fail'
    else if (buyerInfo && buyerInfo.status !== 'active') status = 'warn'

    items.push({ dimension: dimKey, targetValue, status, rules })
  }

  if (!context.asin) return emptyCheckResult(buyerName, buyerInfo, items)

  const buyerHistory = await fetchBuyerAsinHistory(buyerInfo, context.asin, associations, context.scope || scopeOptions)
  const riskFailCount = buyerHistory.risks.filter(r => r.status === 'fail').length
  const riskWarnCount = buyerHistory.risks.filter(r => r.status === 'warn').length
  const riskPassCount = buyerHistory.risks.filter(r => r.status === 'pass').length
  const failCount = items.filter(i => i.status === 'fail').length + riskFailCount
  const warnCount = items.filter(i => i.status === 'warn').length + riskWarnCount
  const passCount = items.filter(i => i.status === 'pass').length + riskPassCount

  return {
    buyerName,
    buyerInfo,
    items,
    asinAssociations: associations,
    buyerHistory,
    overallPass: failCount === 0,
    passCount,
    failCount,
    warnCount,
    usingMock: associations.some(a => a.isMock) || buyerHistory.risks.some(r => r.records.some(rec => rec.isMock)),
  }
}

async function runSingleCheck() {
  const asin = normalizeAsin(dimValues.asin)
  if (!buyerInput.value.trim() || !asin) return
  buyerSuggestions.value = []
  checking.value = true
  try {
    const foundAssociations = await fetchAsinAssociations(asin)
    const associations = foundAssociations.length > 0 ? foundAssociations : buildMockAssociations(asin)
    singleResult.value = await checkOneBuyer(buyerInput.value.trim(), { asin, associations, scope: scopeOptions })
  } finally {
    checking.value = false
  }
}

async function runBatchCheck() {
  const asin = normalizeAsin(dimValues.asin)
  if (batchNames.value.length === 0 || !asin) return
  batchChecking.value = true
  batchResults.value = []
  expandedBatch.value = []
  const foundAssociations = await fetchAsinAssociations(asin)
  const associations = foundAssociations.length > 0 ? foundAssociations : buildMockAssociations(asin)
  for (const name of batchNames.value) {
    batchResults.value.push(await checkOneBuyer(name, { asin, associations, scope: scopeOptions }))
  }
  batchChecking.value = false
}

function primaryAssociationText(result: CheckResult) {
  const assoc = result.asinAssociations[0]
  if (!assoc) return '未找到 ASIN 关联信息'
  return `${assoc.asin} / ${assoc.storeName || '未知店铺'} / ${assoc.brandName || '未知品牌'} / ${assoc.companyName || assoc.customerIdStr || '未知客户'}`
}

function blockingRisks(result: CheckResult) {
  return result.buyerHistory.risks.filter(r => r.status === 'fail')
}

function visibleRisks(result: CheckResult) {
  const blocking = blockingRisks(result)
  return blocking.length ? blocking : result.buyerHistory.risks
}

function riskDimensionLabel(risk: BuyerHistoryRisk) {
  if (risk.key.includes('combo')) return 'ASIN组合'
  if (risk.key.includes('asin')) return 'ASIN'
  if (risk.key.includes('store')) return '店铺'
  if (risk.key.includes('brand')) return '品牌'
  if (risk.key.includes('company')) return '客户公司'
  if (risk.key.includes('customer')) return '客户'
  return risk.title
}

function riskDimensionClass(risk: BuyerHistoryRisk) {
  if (risk.key.includes('combo')) return 'dim-combo'
  if (risk.key.includes('asin')) return 'dim-asin'
  if (risk.key.includes('store')) return 'dim-store'
  if (risk.key.includes('brand')) return 'dim-brand'
  if (risk.key.includes('customer') || risk.key.includes('company')) return 'dim-customer'
  return 'dim-other'
}

function toggleExpand(name: string) {
  const idx = expandedBatch.value.indexOf(name)
  if (idx >= 0) expandedBatch.value.splice(idx, 1)
  else expandedBatch.value.push(name)
}

function getDimLabel(dim: string) {
  return allDimensions.find(d => d.key === dim)?.label || dim
}

function getDimIconComp(dim: string) {
  return allDimensions.find(d => d.key === dim)?.icon || BarcodeOutlined
}
</script>

<style scoped lang="less">
.check-page {
  padding: 28px 32px;
  background: #f7f8fc;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 28px;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 4px 0;
  letter-spacing: -0.5px;
}

.page-desc {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.mode-switch {
  display: flex;
  background: #fff;
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  border: 1px solid #e2e8f0;
}

.mode-tab {
  padding: 8px 24px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  border-radius: 8px;
  transition: all .2s;
  user-select: none;
  &:hover { color: #334155; }
  &.active {
    background: #2563eb;
    color: #fff;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(37,99,235,.3);
  }
}

/* ===== Single Layout ===== */
.single-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
  align-items: flex-start;
}

.form-card {
  background: #fff;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 1px 8px rgba(0,0,0,.05);
  border: 1px solid #e2e8f0;
}

.form-card-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  padding-bottom: 14px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

.field { margin-bottom: 18px; }

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}

.required { color: #ef4444; }

.field-hint {
  font-size: 12px;
  color: #94a3b8;
  margin: 0 0 4px 0;
}

.buyer-input-wrap { position: relative; }

.suggestions-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
  z-index: 100;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
}

.suggestion-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: background .15s;
  &:hover { background: #f1f5f9; }
}

.suggestion-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.suggestion-info { flex: 1; min-width: 0; }
.suggestion-name { font-size: 13px; font-weight: 600; color: #1e293b; }
.suggestion-meta { font-size: 11px; color: #94a3b8; }

.suggestion-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
  &.active { background: #dcfce7; color: #16a34a; }
  &.inactive { background: #fef2f2; color: #dc2626; }
}

.buyer-profile-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 18px;
  position: relative;
}

.profile-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-info { flex: 1; }
.profile-name { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
.profile-stats { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.profile-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
  &.active { background: #dcfce7; color: #16a34a; }
  &.inactive { background: #fef2f2; color: #dc2626; }
}

.profile-stat-item { font-size: 12px; color: #94a3b8; }

.profile-clear {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 12px;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all .15s;
  &:hover { color: #ef4444; background: #fef2f2; }
}

.asin-lookup-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}

.scope-options {
  margin-bottom: 18px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.scope-title {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 10px;
}

.scope-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #334155;
  margin-bottom: 8px;
  cursor: pointer;
  &:last-of-type { margin-bottom: 10px; }
}

.advanced-field {
  padding-top: 4px;
  border-top: 1px dashed #e5e7eb;
}

.dim-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
}

.dim-row {
  border-bottom: 1px solid #f1f5f9;
  &:last-child { border-bottom: none; }
}

.dim-row-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background .15s;
  &:hover { background: #f8fafc; }
}

.dim-row-icon { font-size: 16px; color: #2563eb; }
.dim-row-label { font-size: 13px; font-weight: 500; color: #334155; }

.dim-row-input {
  padding: 0 14px 12px 48px;
}

.run-btn {
  height: 48px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 10px;
  letter-spacing: 0.5px;
}

.demo-btn {
  margin-top: 10px;
  height: 40px;
  border-radius: 10px;
  color: #7c3aed;
  border-color: rgba(124, 58, 237, 0.35);
  background: rgba(124, 58, 237, 0.06);
  font-weight: 700;
  &:hover {
    color: #6d28d9;
    border-color: #7c3aed;
    background: rgba(124, 58, 237, 0.1);
  }
}

.batch-mini-card {
  margin-top: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  overflow: hidden;
}

.batch-mini-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  cursor: pointer;
  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .rotated { transform: rotate(180deg); }
}

.batch-mini-body {
  padding: 0 14px 14px;
}

.batch-mini-btn {
  margin-top: 10px;
  border-radius: 8px;
}

.batch-demo-btn {
  margin-top: 8px;
  border-radius: 8px;
  color: #7c3aed;
  border-color: rgba(124, 58, 237, .3);
  background: rgba(124, 58, 237, .06);
  font-weight: 700;
}

/* ===== Result Area ===== */
.result-section { min-height: 400px; }

.result-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-radius: 14px;
  margin-bottom: 20px;
  border: 1px solid;
  &.hero-pass {
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border-color: #bbf7d0;
  }
  &.hero-fail {
    background: linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%);
    border-color: #fecaca;
  }
}

.hero-left { display: flex; align-items: center; gap: 14px; }

.hero-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
}

.hero-name { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
.hero-info { display: flex; align-items: center; gap: 10px; }
.hero-stat { font-size: 12px; color: #64748b; }
.hero-unknown { font-size: 12px; color: #94a3b8; font-style: italic; }

.hero-right { text-align: right; }

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 18px;
  font-weight: 800;
  padding: 8px 24px;
  border-radius: 24px;
  margin-bottom: 8px;
  &.badge-pass { background: #dcfce7; color: #15803d; }
  &.badge-fail { background: #fecaca; color: #dc2626; }
}

.hero-counts {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  font-size: 12px;
  font-weight: 600;
}

.hc-pass { color: #16a34a; }
.hc-fail { color: #dc2626; }
.hc-warn { color: #d97706; }

.context-card,
.association-section,
.history-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 16px;
}

.context-card {
  padding-bottom: 20px;
}

.context-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.context-item {
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  min-width: 0;
  strong {
    display: block;
    margin-top: 4px;
    color: #1a1a2e;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.context-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 700;
}

.blocked-overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
  margin-bottom: 16px;
  border: 1px solid #fecaca;
  border-radius: 16px;
  background: linear-gradient(135deg, #fff1f2 0%, #fef2f2 100%);
}

.blocked-overview-main {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #dc2626;
  > .anticon {
    font-size: 28px;
  }
}

.blocked-title {
  font-size: 18px;
  font-weight: 900;
  color: #991b1b;
}

.blocked-subtitle {
  margin-top: 2px;
  color: #7f1d1d;
  font-size: 12px;
}

.blocked-dim-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.blocked-dim-tag {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  background: #fff;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.section-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-title-text {
  font-size: 15px;
  font-weight: 800;
  color: #1a1a2e;
}

.section-subtitle {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.association-count,
.history-summary {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.association-count {
  color: #2563eb;
  background: #eff6ff;
}

.mock-tag {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #d97706;
  background: #fef3c7;
}

.history-summary.pass {
  color: #059669;
  background: #dcfce7;
}

.history-summary.fail {
  color: #dc2626;
  background: #fef2f2;
}

.association-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.association-compact-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.association-compact-row {
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}

.association-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}

.association-img {
  width: 58px;
  height: 58px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid #e5e7eb;
  flex-shrink: 0;
  &.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eff6ff;
    color: #2563eb;
    font-size: 22px;
  }
}

.association-body { flex: 1; min-width: 0; }

.association-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.association-asin {
  font-family: 'SF Mono', 'Courier New', monospace;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
}

.association-source {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  &.client_library { color: #059669; background: #dcfce7; }
  &.order_snapshot { color: #d97706; background: #fef3c7; }
}

.association-product {
  font-size: 12px;
  color: #334155;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.association-line {
  font-size: 12px;
  color: #475569;
}

.association-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px 10px;
  font-size: 12px;
  color: #475569;
  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.association-foot {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  font-size: 11px;
  color: #9ca3af;
}

.association-empty {
  padding: 16px;
  background: #f8fafc;
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
  color: #6b7280;
  font-size: 13px;
  text-align: center;
}

.history-risk-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.risk-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
}

.risk-card-v2 {
  position: relative;
  overflow: hidden;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  background: #fff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, .04);
  &::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 5px;
    background: #9ca3af;
  }
  &.fail {
    border-color: #fecaca;
    background: linear-gradient(180deg, #fff 0%, #fff7f7 100%);
    &::before { background: #dc2626; }
  }
  &.warn::before { background: #d97706; }
  &.pass::before { background: #059669; }
}

.risk-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.risk-dim-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  font-size: 12px;
  font-weight: 900;
}

.risk-title-v2 {
  font-size: 15px;
  font-weight: 900;
  color: #1a1a2e;
  margin-bottom: 6px;
}

.risk-reason-v2 {
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
}

.risk-detail-lines {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.risk-evidence-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.risk-evidence-title {
  color: #1a1a2e;
  font-size: 13px;
  font-weight: 900;
}

.risk-evidence-card {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
}

.risk-evidence-field {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px dashed #e5e7eb;
}

.risk-evidence-field:last-child {
  border-bottom: 0;
}

.risk-evidence-field span {
  flex: 0 0 58px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 800;
}

.risk-evidence-field strong {
  flex: 1;
  overflow-wrap: anywhere;
  color: #1a1a2e;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.risk-detail-line {
  padding: 7px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  color: #334155;
  font-size: 12px;
  line-height: 1.45;
}

.risk-card-v2.dim-combo {
  grid-column: 1 / -1;
  border-color: rgba(124, 58, 237, .28);
  background: linear-gradient(135deg, #fff 0%, #f5f3ff 100%);
  &::before { background: #7c3aed; }
}

.batch-cross-section {
  margin-bottom: 18px;
  padding: 16px;
  border: 1px solid #fecaca;
  border-radius: 14px;
  background: #fff7f7;
}

.batch-cross-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #991b1b;
  font-size: 15px;
  font-weight: 900;
}

.batch-cross-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 12px;
}

.batch-cross-card {
  padding: 14px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #fecaca;
}

.batch-cross-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  color: #1a1a2e;
  font-weight: 900;
}

.batch-cross-reason {
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 10px;
}

.blocked-dim-tag.dim-combo,
.risk-card-v2.dim-combo .risk-dim-badge {
  color: #7c3aed;
  border-color: rgba(124, 58, 237, .3);
  background: #f5f3ff;
}

.blocked-dim-tag.dim-store,
.risk-card-v2.dim-store .risk-dim-badge {
  color: #2563eb;
  background: #eff6ff;
}

.blocked-dim-tag.dim-brand,
.risk-card-v2.dim-brand .risk-dim-badge {
  color: #d97706;
  background: #fef3c7;
}

.blocked-dim-tag.dim-customer,
.risk-card-v2.dim-customer .risk-dim-badge {
  color: #0891b2;
  background: #ecfeff;
}

.history-risk-card {
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-left-width: 4px;
  border-radius: 12px;
  background: #fff;
  &.pass { border-left-color: #059669; }
  &.warn { border-left-color: #d97706; }
  &.fail { border-left-color: #dc2626; }
}

.history-risk-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.history-risk-title {
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
}

.history-risk-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  &.pass { color: #059669; background: #dcfce7; }
  &.warn { color: #d97706; background: #fef3c7; }
  &.fail { color: #dc2626; background: #fef2f2; }
}

.history-risk-reason {
  font-size: 12px;
  color: #475569;
  line-height: 1.5;
}

.history-records {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.history-record-pill {
  padding: 3px 8px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  font-size: 11px;
  color: #64748b;
}

.result-detail-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 18px 20px;
  transition: all .2s;
  &.status-pass { border-left: 4px solid #22c55e; }
  &.status-fail { border-left: 4px solid #ef4444; }
  &.status-warn { border-left: 4px solid #f59e0b; }
  &:hover { box-shadow: 0 2px 12px rgba(0,0,0,.06); }
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.detail-dim { display: flex; align-items: center; gap: 10px; }

.detail-dim-icon {
  font-size: 18px;
  color: #2563eb;
  width: 36px;
  height: 36px;
  background: #eff6ff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-dim-name { font-size: 14px; font-weight: 700; color: #1e293b; }
.detail-dim-value { font-size: 12px; color: #94a3b8; margin-top: 1px; font-family: 'SF Mono', monospace; }

.detail-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 14px;
  border-radius: 16px;
  &.pass { background: #dcfce7; color: #15803d; }
  &.fail { background: #fef2f2; color: #dc2626; }
  &.warn { background: #fef9c3; color: #a16207; }
}

.detail-rules {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
}

.rule-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  &.deny { background: #fecaca; color: #dc2626; }
  &.allow { background: #bbf7d0; color: #16a34a; }
}

.rule-text { color: #475569; line-height: 1.5; }

.detail-no-rules {
  margin-top: 8px;
  font-size: 12px;
  color: #cbd5e1;
}

/* ===== Empty State ===== */
.empty-state {
  background: #fff;
  border-radius: 14px;
  padding: 80px 40px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.empty-visual { margin-bottom: 20px; }

.empty-main-icon {
  font-size: 56px;
  color: #cbd5e1;
}

.empty-title {
  font-size: 17px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 20px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

.empty-dims {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.empty-dim-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

/* ===== Batch Layout ===== */
.batch-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.batch-form-card {
  background: #fff;
  border-radius: 14px;
  padding: 24px 28px;
  box-shadow: 0 1px 8px rgba(0,0,0,.05);
  border: 1px solid #e2e8f0;
}

.batch-hint {
  font-size: 13px;
  color: #94a3b8;
  margin: 0 0 20px 0;
}

.batch-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
}

.batch-textarea {
  font-size: 14px;
  border-radius: 10px;
}

.batch-count {
  margin-top: 6px;
  font-size: 12px;
  color: #94a3b8;
  text-align: right;
}

.batch-dim-checks {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
}

.batch-dim-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 13px;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
  transition: background .15s;
  &:last-child { border-bottom: none; }
  &:hover { background: #f8fafc; }
  &.selected { background: #eff6ff; }
}

/* ===== Batch Results ===== */
.batch-results-section {
  background: #fff;
  border-radius: 14px;
  padding: 24px 28px;
  box-shadow: 0 1px 8px rgba(0,0,0,.05);
  border: 1px solid #e2e8f0;
}

.batch-results-header { margin-bottom: 16px; }

.batch-results-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 10px;
}

.batch-stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.bs-item {
  font-size: 13px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 8px;
}

.bs-total { background: #f1f5f9; color: #475569; }
.bs-pass { background: #dcfce7; color: #16a34a; }
.bs-fail { background: #fef2f2; color: #dc2626; }

.batch-filter-row {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #f1f5f9;
}

.bf-tab {
  padding: 8px 20px;
  font-size: 13px;
  color: #94a3b8;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all .15s;
  font-weight: 500;
  &:hover { color: #334155; }
  &.active { color: #2563eb; border-bottom-color: #2563eb; font-weight: 600; }
}

.batch-results-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.batch-result-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all .15s;
  flex-wrap: wrap;
  &:hover { box-shadow: 0 2px 8px rgba(0,0,0,.05); }
  &.card-pass { border-left: 4px solid #22c55e; }
  &.card-fail { border-left: 4px solid #ef4444; }
}

.brc-left { display: flex; align-items: center; gap: 10px; min-width: 160px; }

.brc-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brc-info { min-width: 0; }
.brc-name { font-size: 14px; font-weight: 700; color: #1e293b; }
.brc-meta { font-size: 11px; color: #94a3b8; }
.brc-no-record { font-style: italic; }

.brc-dims { flex: 1; display: flex; gap: 6px; flex-wrap: wrap; }

.brc-dim-tag {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  &.pass { background: #dcfce7; color: #16a34a; }
  &.fail { background: #fef2f2; color: #dc2626; }
  &.warn { background: #fef9c3; color: #a16207; }
}

.brc-verdict {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
  padding: 4px 14px;
  border-radius: 16px;
  flex-shrink: 0;
  &.pass { background: #dcfce7; color: #15803d; }
  &.fail { background: #fecaca; color: #dc2626; }
}

.brc-expand {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 6px;
  color: #94a3b8;
  transition: all .15s;
  &:hover { background: #f1f5f9; color: #334155; }
  .rotated { transform: rotate(180deg); }
}

.brc-detail {
  width: 100%;
  padding: 10px 0 0 60px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.brc-detail-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
}

.brc-detail-dim {
  font-weight: 700;
  color: #ef4444;
  flex-shrink: 0;
  min-width: 50px;
}

.brc-detail-reason {
  color: #64748b;
  background: #f8fafc;
  padding: 2px 8px;
  border-radius: 4px;
}

.batch-empty {
  padding: 60px 40px;
}

@media (max-width: 900px) {
  .single-layout { grid-template-columns: 1fr; }
  .batch-cols { grid-template-columns: 1fr; }
}
</style>
