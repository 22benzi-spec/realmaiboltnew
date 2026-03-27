<template>
  <div class="check-page">
    <div class="page-header">
      <div class="header-text">
        <h1 class="page-title">买手校验中心</h1>
        <p class="page-desc">快速校验买手在各维度的准入情况，支持单个精确校验和批量快速筛查</p>
      </div>
      <div class="mode-switch">
        <span
          :class="['mode-tab', mode === 'single' ? 'active' : '']"
          @click="mode = 'single'"
        >单个校验</span>
        <span
          :class="['mode-tab', mode === 'batch' ? 'active' : '']"
          @click="mode = 'batch'"
        >批量校验</span>
      </div>
    </div>

    <!-- ===== 单个校验 ===== -->
    <div v-if="mode === 'single'" class="single-layout">
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
            <label class="field-label">校验维度</label>
            <p class="field-hint">选择需要校验的维度，并填写对应目标值</p>
          </div>

          <div class="dim-list">
            <div v-for="dim in allDimensions" :key="dim.key" class="dim-row">
              <div class="dim-row-header" @click="toggleDim(dim.key)">
                <a-checkbox :checked="selectedDims.includes(dim.key)" style="pointer-events:none" />
                <component :is="dim.icon" class="dim-row-icon" />
                <span class="dim-row-label">{{ dim.label }}</span>
              </div>
              <div v-if="selectedDims.includes(dim.key)" class="dim-row-input">
                <a-input
                  v-model:value="dimValues[dim.key]"
                  :placeholder="dim.placeholder"
                  allow-clear
                  size="default"
                />
              </div>
            </div>
          </div>

          <a-button
            type="primary"
            size="large"
            block
            class="run-btn"
            :loading="checking"
            :disabled="!buyerInput.trim()"
            @click="runSingleCheck"
          >
            <template #icon><ThunderboltOutlined /></template>
            开始校验
          </a-button>
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

          <div class="result-detail-list">
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

    <!-- ===== 批量校验 ===== -->
    <div v-if="mode === 'batch'" class="batch-layout">
      <div class="batch-form-card">
        <div class="form-card-title">
          <UnorderedListOutlined style="margin-right:6px" />
          批量买手校验
        </div>
        <p class="batch-hint">输入多个买手姓名，系统自动校验所有已选维度，快速筛出有风险的买手</p>

        <div class="batch-cols">
          <div class="batch-left">
            <div class="field">
              <label class="field-label">买手列表 <span class="required">*</span></label>
              <a-textarea
                v-model:value="batchInput"
                placeholder="每行一个买手姓名，例如：&#10;Emily Johnson&#10;Michael Brown&#10;James Davis&#10;Jessica Miller"
                :rows="8"
                class="batch-textarea"
              />
              <div class="batch-count">已填 {{ batchNames.length }} 位买手</div>
            </div>
          </div>
          <div class="batch-right">
            <div class="field">
              <label class="field-label">校验维度</label>
              <div class="batch-dim-checks">
                <div
                  v-for="dim in allDimensions"
                  :key="dim.key"
                  :class="['batch-dim-item', selectedDims.includes(dim.key) ? 'selected' : '']"
                  @click="toggleDim(dim.key)"
                >
                  <a-checkbox :checked="selectedDims.includes(dim.key)" style="pointer-events:none" />
                  <component :is="dim.icon" style="font-size:14px;color:#2563eb" />
                  <span>{{ dim.label }}</span>
                </div>
              </div>
            </div>
            <div v-for="dim in activeBatchDimensions" :key="dim.key" class="field">
              <label class="field-label">{{ dim.label }} 目标值</label>
              <a-input
                v-model:value="dimValues[dim.key]"
                :placeholder="dim.placeholder"
                allow-clear
              />
            </div>
            <a-button
              type="primary"
              size="large"
              block
              class="run-btn"
              :loading="batchChecking"
              :disabled="batchNames.length === 0"
              @click="runBatchCheck"
            >
              <template #icon><ThunderboltOutlined /></template>
              批量校验 ({{ batchNames.length }} 人)
            </a-button>
          </div>
        </div>
      </div>

      <div v-if="batchResults.length > 0" class="batch-results-section">
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
                v-for="item in br.items"
                :key="item.dimension"
                :class="['brc-dim-tag', item.status]"
              >
                {{ getDimLabel(item.dimension) }}:
                {{ item.status === 'pass' ? '通过' : item.status === 'fail' ? '拦截' : '警告' }}
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
              <div v-for="item in br.items.filter(i => i.status === 'fail')" :key="item.dimension" class="brc-detail-row">
                <span class="brc-detail-dim">{{ getDimLabel(item.dimension) }}</span>
                <span v-for="(rule, ri) in item.rules.filter(r => r.rule_type === 'deny')" :key="ri" class="brc-detail-reason">
                  {{ rule.reason }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="batchResults.length === 0 && !batchChecking" class="empty-state batch-empty">
        <div class="empty-visual">
          <TeamOutlined class="empty-main-icon" />
        </div>
        <div class="empty-title">批量校验多位买手</div>
        <div class="empty-desc">在左侧输入多个买手姓名，选择校验维度，一键完成批量风险筛查</div>
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
  UnorderedListOutlined, TeamOutlined, DownOutlined,
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

interface CheckResult {
  buyerName: string
  buyerInfo: BuyerInfo | null
  items: DimResult[]
  overallPass: boolean
  passCount: number
  failCount: number
  warnCount: number
}

const allDimensions = [
  { key: 'asin', label: 'ASIN', icon: BarcodeOutlined, placeholder: '输入ASIN编码，如 B0GM5UVWX4' },
  { key: 'store', label: '店铺', icon: ShopOutlined, placeholder: '输入店铺名称，如 星辰旗舰店' },
  { key: 'brand', label: '品牌', icon: TagOutlined, placeholder: '输入品牌名，如 优品居家' },
  { key: 'client_contact', label: '客户联系人', icon: ContactsOutlined, placeholder: '输入联系人姓名，如 李经理' },
  { key: 'client_company', label: '客户公司', icon: BankOutlined, placeholder: '输入公司名，如 深圳科技有限公司' },
]

const mode = ref<'single' | 'batch'>('single')
const buyerInput = ref('')
const buyerSuggestions = ref<BuyerInfo[]>([])
const selectedBuyer = ref<BuyerInfo | null>(null)
const selectedDims = ref<string[]>(['asin', 'store', 'brand'])
const dimValues = reactive<Record<string, string>>({
  asin: '', store: '', brand: '', client_contact: '', client_company: '',
})
const checking = ref(false)
const singleResult = ref<CheckResult | null>(null)

const batchInput = ref('')
const batchChecking = ref(false)
const batchResults = ref<CheckResult[]>([])
const batchFilter = ref('all')
const expandedBatch = ref<string[]>([])

let suggestTimer: ReturnType<typeof setTimeout> | null = null

const activeBatchDimensions = computed(() =>
  allDimensions.filter(d => selectedDims.value.includes(d.key))
)

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

async function checkOneBuyer(buyerName: string): Promise<CheckResult> {
  const buyerInfo = await fetchBuyerInfo(buyerName)
  const items: DimResult[] = []

  for (const dimKey of selectedDims.value) {
    const targetValue = dimValues[dimKey] || ''
    let query = supabase
      .from('buyer_restrictions')
      .select('rule_type, reason, target_value')
      .ilike('buyer_name', buyerName)
      .eq('dimension', dimKey)
      .eq('is_active', true)

    if (targetValue) {
      query = query.ilike('target_value', targetValue)
    }

    const { data } = await query
    const rules = (data || []) as RestrictionRule[]
    const hasDeny = rules.some(r => r.rule_type === 'deny')
    let status: 'pass' | 'fail' | 'warn' = 'pass'
    if (hasDeny) status = 'fail'
    else if (buyerInfo && buyerInfo.status !== 'active') status = 'warn'

    items.push({ dimension: dimKey, targetValue, status, rules })
  }

  const failCount = items.filter(i => i.status === 'fail').length
  const warnCount = items.filter(i => i.status === 'warn').length
  const passCount = items.filter(i => i.status === 'pass').length

  return { buyerName, buyerInfo, items, overallPass: failCount === 0, passCount, failCount, warnCount }
}

async function runSingleCheck() {
  if (!buyerInput.value.trim()) return
  buyerSuggestions.value = []
  checking.value = true
  singleResult.value = await checkOneBuyer(buyerInput.value.trim())
  checking.value = false
}

async function runBatchCheck() {
  if (batchNames.value.length === 0) return
  batchChecking.value = true
  batchResults.value = []
  expandedBatch.value = []
  for (const name of batchNames.value) {
    batchResults.value.push(await checkOneBuyer(name))
  }
  batchChecking.value = false
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
