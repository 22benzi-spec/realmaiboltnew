<template>
  <div class="page-content">
    <div class="page-header">
      <h1 class="page-title">买手校验中心</h1>
      <p class="page-desc">输入买手姓名，快速校验该买手在各维度（ASIN、店铺、品牌、客户、公司）的准入情况</p>
    </div>

    <div class="check-layout">
      <!-- 左侧校验面板 -->
      <div class="check-panel">
        <div class="panel-card">
          <div class="panel-title">买手快速校验</div>

          <!-- 买手输入 -->
          <div class="input-section">
            <label class="input-label">买手姓名</label>
            <div class="buyer-input-wrap">
              <a-input
                v-model:value="buyerInput"
                placeholder="输入买手姓名进行校验（支持模糊匹配）"
                size="large"
                allow-clear
                @input="onBuyerInput"
                @press-enter="runCheck"
              />
              <div v-if="buyerSuggestions.length > 0" class="buyer-dropdown">
                <div
                  v-for="s in buyerSuggestions"
                  :key="s.id"
                  class="buyer-suggestion-item"
                  @click="selectBuyer(s)"
                >
                  <span class="s-name">{{ s.name }}</span>
                  <span class="s-stats">{{ s.total_orders }}单 · 评分{{ s.rating }}</span>
                  <span :class="['s-status', s.status === 'active' ? 'active' : 'inactive']">
                    {{ s.status === 'active' ? '正常' : '停用' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 校验维度选择 -->
          <div class="input-section">
            <label class="input-label">校验维度</label>
            <div class="dimension-grid">
              <div
                v-for="dim in dimensions"
                :key="dim.key"
                :class="['dim-card', selectedDims.includes(dim.key) ? 'selected' : '']"
                @click="toggleDim(dim.key)"
              >
                <span class="dim-icon">{{ dim.icon }}</span>
                <span class="dim-label">{{ dim.label }}</span>
              </div>
            </div>
          </div>

          <!-- 目标值输入 -->
          <div v-for="dim in activeDimensions" :key="dim.key" class="input-section">
            <label class="input-label">{{ dim.label }}</label>
            <a-input
              v-model:value="dimValues[dim.key]"
              :placeholder="dim.placeholder"
              size="default"
              allow-clear
            />
          </div>

          <a-button
            type="primary"
            size="large"
            block
            :loading="checking"
            :disabled="!buyerInput.trim()"
            @click="runCheck"
            class="check-btn"
          >
            开始校验
          </a-button>
        </div>

        <!-- 快速批量校验 -->
        <div class="panel-card mt-12">
          <div class="panel-title">批量买手校验</div>
          <a-textarea
            v-model:value="batchInput"
            placeholder="每行一个买手姓名，例如：&#10;小红&#10;小明&#10;阿花"
            :rows="4"
            style="margin-bottom:8px"
          />
          <a-button @click="runBatchCheck" :loading="batchChecking" block>批量校验</a-button>
        </div>
      </div>

      <!-- 右侧结果面板 -->
      <div class="result-panel">
        <!-- 单次校验结果 -->
        <div v-if="checkResult" class="result-card">
          <div class="result-header">
            <div class="result-buyer">
              <span class="buyer-avatar">{{ (checkResult.buyerName || '?').charAt(0) }}</span>
              <div>
                <div class="buyer-name-large">{{ checkResult.buyerName }}</div>
                <div class="buyer-sub">
                  <a-tag v-if="checkResult.buyerInfo" :color="checkResult.buyerInfo.status === 'active' ? 'green' : 'red'">
                    {{ checkResult.buyerInfo.status === 'active' ? '账号正常' : '账号停用' }}
                  </a-tag>
                  <span v-if="checkResult.buyerInfo" class="buyer-meta">
                    历史 {{ checkResult.buyerInfo.total_orders }} 单 · 评分 {{ checkResult.buyerInfo.rating }}
                  </span>
                  <span v-else class="buyer-meta text-gray">（系统中无此买手档案）</span>
                </div>
              </div>
            </div>
            <div class="result-summary">
              <div :class="['summary-badge', checkResult.overallPass ? 'pass' : 'fail']">
                {{ checkResult.overallPass ? '可以接单' : '存在风险' }}
              </div>
              <div class="summary-counts">
                <span class="count-pass">{{ checkResult.passCount }} 通过</span>
                <span class="count-fail">{{ checkResult.failCount }} 拦截</span>
                <span class="count-warn">{{ checkResult.warnCount }} 警告</span>
              </div>
            </div>
          </div>

          <!-- 各维度结果 -->
          <div class="dim-results">
            <div
              v-for="item in checkResult.items"
              :key="item.dimension"
              :class="['dim-result-item', item.status]"
            >
              <div class="dim-result-left">
                <span class="dim-icon-sm">{{ getDimIcon(item.dimension) }}</span>
                <div class="dim-result-info">
                  <div class="dim-name">{{ getDimLabel(item.dimension) }}</div>
                  <div class="dim-value">{{ item.targetValue || '（未指定）' }}</div>
                </div>
              </div>
              <div class="dim-result-right">
                <span :class="['status-badge', item.status]">
                  {{ item.status === 'pass' ? '通过' : item.status === 'fail' ? '拦截' : '警告' }}
                </span>
                <div class="dim-result-rules">
                  <div v-for="(rule, ri) in item.rules" :key="ri" :class="['rule-line', rule.rule_type]">
                    <span class="rule-type-tag">{{ rule.rule_type === 'deny' ? '黑名单' : '白名单' }}</span>
                    <span class="rule-reason">{{ rule.reason }}</span>
                  </div>
                  <div v-if="item.rules.length === 0" class="no-rule">无限制规则</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 批量校验结果 -->
        <div v-if="batchResults.length > 0" class="result-card mt-12">
          <div class="panel-title">批量校验结果</div>
          <div class="batch-list">
            <div
              v-for="br in batchResults"
              :key="br.buyerName"
              :class="['batch-row', br.overallPass ? 'pass' : 'fail']"
            >
              <span class="batch-buyer">{{ br.buyerName }}</span>
              <div class="batch-tags">
                <a-tag v-for="item in br.items" :key="item.dimension" :color="getTagColor(item.status)" style="font-size:11px">
                  {{ getDimLabel(item.dimension) }}: {{ item.status === 'pass' ? '通过' : item.status === 'fail' ? '拦截' : '警告' }}
                </a-tag>
              </div>
              <span :class="['batch-result', br.overallPass ? 'pass' : 'fail']">
                {{ br.overallPass ? '可接单' : '有风险' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!checkResult && batchResults.length === 0" class="empty-result">
          <div class="empty-icon">校</div>
          <div class="empty-text">输入买手姓名并选择校验维度，点击「开始校验」</div>
          <div class="empty-hint">支持 ASIN、店铺、品牌、客户联系人、客户公司 五个维度</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
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

const dimensions = [
  { key: 'asin', label: 'ASIN', icon: 'A', placeholder: '输入ASIN编码，如 B0GM5UVWX4' },
  { key: 'store', label: '店铺', icon: '店', placeholder: '输入店铺名称，如 星辰旗舰店' },
  { key: 'brand', label: '品牌', icon: '牌', placeholder: '输入品牌名，如 优品居家' },
  { key: 'client_contact', label: '客户联系人', icon: '人', placeholder: '输入客户联系人姓名，如 李经理' },
  { key: 'client_company', label: '客户公司', icon: '司', placeholder: '输入客户公司名，如 深圳科技有限公司' },
]

const buyerInput = ref('')
const buyerSuggestions = ref<BuyerInfo[]>([])
const selectedBuyer = ref<BuyerInfo | null>(null)
const selectedDims = ref<string[]>(['asin', 'store', 'brand'])
const dimValues = reactive<Record<string, string>>({
  asin: '',
  store: '',
  brand: '',
  client_contact: '',
  client_company: '',
})
const checking = ref(false)
const checkResult = ref<CheckResult | null>(null)
const batchInput = ref('')
const batchChecking = ref(false)
const batchResults = ref<CheckResult[]>([])

let suggestTimer: ReturnType<typeof setTimeout> | null = null

const activeDimensions = computed(() =>
  dimensions.filter(d => selectedDims.value.includes(d.key))
)

function toggleDim(key: string) {
  const idx = selectedDims.value.indexOf(key)
  if (idx >= 0) {
    selectedDims.value.splice(idx, 1)
  } else {
    selectedDims.value.push(key)
  }
}

function onBuyerInput() {
  selectedBuyer.value = null
  if (suggestTimer) clearTimeout(suggestTimer)
  if (!buyerInput.value.trim()) {
    buyerSuggestions.value = []
    return
  }
  suggestTimer = setTimeout(fetchBuyerSuggestions, 300)
}

async function fetchBuyerSuggestions() {
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

async function fetchBuyerInfo(name: string): Promise<BuyerInfo | null> {
  const { data } = await supabase
    .from('buyers')
    .select('id, name, status, rating, total_orders')
    .ilike('name', name)
    .maybeSingle()
  return data as BuyerInfo | null
}

async function checkBuyer(buyerName: string): Promise<CheckResult> {
  const buyerInfo = await fetchBuyerInfo(buyerName)

  const items: DimResult[] = []

  for (const dim of selectedDims.value) {
    const targetValue = dimValues[dim] || ''
    let rules: RestrictionRule[] = []

    if (targetValue) {
      const { data } = await supabase
        .from('buyer_restrictions')
        .select('rule_type, reason, target_value')
        .ilike('buyer_name', buyerName)
        .eq('dimension', dim)
        .ilike('target_value', targetValue)
        .eq('is_active', true)
      rules = (data || []) as RestrictionRule[]
    } else {
      const { data } = await supabase
        .from('buyer_restrictions')
        .select('rule_type, reason, target_value')
        .ilike('buyer_name', buyerName)
        .eq('dimension', dim)
        .eq('is_active', true)
      rules = (data || []) as RestrictionRule[]
    }

    const hasDeny = rules.some(r => r.rule_type === 'deny')
    const hasAllow = rules.some(r => r.rule_type === 'allow')
    let status: 'pass' | 'fail' | 'warn' = 'pass'
    if (hasDeny) {
      status = 'fail'
    } else if (hasAllow) {
      status = 'pass'
    } else if (buyerInfo && buyerInfo.status !== 'active') {
      status = 'warn'
    }

    items.push({ dimension: dim, targetValue, status, rules })
  }

  const failCount = items.filter(i => i.status === 'fail').length
  const warnCount = items.filter(i => i.status === 'warn').length
  const passCount = items.filter(i => i.status === 'pass').length

  return {
    buyerName,
    buyerInfo,
    items,
    overallPass: failCount === 0,
    passCount,
    failCount,
    warnCount,
  }
}

async function runCheck() {
  if (!buyerInput.value.trim()) return
  buyerSuggestions.value = []
  checking.value = true
  checkResult.value = await checkBuyer(buyerInput.value.trim())
  checking.value = false
}

async function runBatchCheck() {
  const names = batchInput.value.split('\n').map(n => n.trim()).filter(Boolean)
  if (names.length === 0) return
  batchChecking.value = true
  batchResults.value = []
  for (const name of names) {
    const r = await checkBuyer(name)
    batchResults.value.push(r)
  }
  batchChecking.value = false
}

function getDimIcon(dim: string) {
  return dimensions.find(d => d.key === dim)?.icon || '?'
}

function getDimLabel(dim: string) {
  return dimensions.find(d => d.key === dim)?.label || dim
}

function getTagColor(status: string) {
  if (status === 'pass') return 'green'
  if (status === 'fail') return 'red'
  return 'orange'
}
</script>

<style scoped lang="less">
.page-content {
  padding: 24px;
  background: #f5f6fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #111;
  margin: 0 0 6px 0;
}

.page-desc {
  font-size: 13px;
  color: #888;
  margin: 0;
}

.check-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 20px;
  align-items: flex-start;
}

.panel-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 6px rgba(0,0,0,.06);
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #222;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.mt-12 {
  margin-top: 12px;
}

.input-section {
  margin-bottom: 16px;
}

.input-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #444;
  margin-bottom: 6px;
}

.buyer-input-wrap {
  position: relative;
}

.buyer-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e4e4e4;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,.1);
  z-index: 100;
  overflow: hidden;
}

.buyer-suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background .15s;
  &:hover { background: #f5f7ff; }
}

.s-name { font-weight: 600; color: #222; flex: 1; }
.s-stats { color: #888; font-size: 12px; }
.s-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  &.active { background: #e6f9f0; color: #16a34a; }
  &.inactive { background: #fef2f2; color: #dc2626; }
}

.dimension-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.dim-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border: 1.5px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all .15s;
  background: #fafafa;
  &:hover { border-color: #2563eb; background: #eff6ff; }
  &.selected { border-color: #2563eb; background: #eff6ff; }
}

.dim-icon {
  font-size: 18px;
  font-weight: 700;
  color: #2563eb;
  background: #dbeafe;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dim-label {
  font-size: 11px;
  color: #555;
  text-align: center;
}

.check-btn {
  margin-top: 4px;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 8px;
}

/* Result Panel */
.result-panel { min-height: 300px; }

.result-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 6px rgba(0,0,0,.06);
}

.result-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.result-buyer {
  display: flex;
  align-items: center;
  gap: 12px;
}

.buyer-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.buyer-name-large {
  font-size: 18px;
  font-weight: 700;
  color: #111;
  margin-bottom: 4px;
}

.buyer-sub { display: flex; align-items: center; gap: 8px; }
.buyer-meta { font-size: 12px; color: #888; }
.text-gray { color: #aaa; }

.result-summary { text-align: right; }

.summary-badge {
  font-size: 16px;
  font-weight: 700;
  padding: 4px 16px;
  border-radius: 20px;
  display: inline-block;
  margin-bottom: 6px;
  &.pass { background: #dcfce7; color: #15803d; }
  &.fail { background: #fef2f2; color: #dc2626; }
}

.summary-counts {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  font-size: 12px;
}

.count-pass { color: #16a34a; }
.count-fail { color: #dc2626; }
.count-warn { color: #d97706; }

/* Dim Results */
.dim-results { display: flex; flex-direction: column; gap: 10px; }

.dim-result-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  background: #fafafa;
  gap: 12px;
  transition: border-color .15s;

  &.pass { border-color: #bbf7d0; background: #f0fdf4; }
  &.fail { border-color: #fecaca; background: #fef2f2; }
  &.warn { border-color: #fde68a; background: #fffbeb; }
}

.dim-result-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
}

.dim-icon-sm {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: #dbeafe;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.dim-name { font-size: 13px; font-weight: 600; color: #333; }
.dim-value { font-size: 12px; color: #888; margin-top: 2px; font-family: monospace; }

.dim-result-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: 200px;
}

.status-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 12px;
  &.pass { background: #dcfce7; color: #15803d; }
  &.fail { background: #fef2f2; color: #dc2626; }
  &.warn { background: #fef9c3; color: #a16207; }
}

.dim-result-rules { width: 100%; }

.rule-line {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 3px 0;
  font-size: 12px;
  &.deny .rule-type-tag { background: #fecaca; color: #dc2626; }
  &.allow .rule-type-tag { background: #bbf7d0; color: #16a34a; }
}

.rule-type-tag {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.rule-reason { color: #555; line-height: 1.4; }
.no-rule { font-size: 12px; color: #bbb; text-align: right; }

/* Batch */
.batch-list { display: flex; flex-direction: column; gap: 8px; }

.batch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  background: #fafafa;
  &.pass { border-color: #bbf7d0; }
  &.fail { border-color: #fecaca; }
}

.batch-buyer { font-weight: 600; color: #222; font-size: 13px; min-width: 60px; }
.batch-tags { flex: 1; display: flex; flex-wrap: wrap; gap: 4px; }
.batch-result {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 10px;
  &.pass { background: #dcfce7; color: #15803d; }
  &.fail { background: #fef2f2; color: #dc2626; }
}

/* Empty */
.empty-result {
  background: #fff;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  box-shadow: 0 1px 6px rgba(0,0,0,.06);
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.empty-text { font-size: 15px; color: #444; margin-bottom: 8px; }
.empty-hint { font-size: 13px; color: #aaa; }
</style>
