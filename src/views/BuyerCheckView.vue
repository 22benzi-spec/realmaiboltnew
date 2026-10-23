<template>
  <div class="check-page">
    <div class="page-header">
      <div class="header-text">
        <h1 class="page-title">买手校验中心</h1>
        <p class="page-desc">填写买手和要查的内容，查看能不能下单，或者以前有没有买过。</p>
      </div>
      <a-button @click="downloadCheckSheet">下载检查表</a-button>
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
            <label class="field-label">买手姓名 / ID <span class="required">*</span></label>
            <div class="buyer-input-wrap">
              <a-textarea
                v-model:value="buyerInput"
                placeholder="姓名和 ID 只能选一种，不能混填；多个买手用逗号隔开"
                size="large"
                allow-clear
                :auto-size="{ minRows: 1, maxRows: 3 }"
                @input="onBuyerInput"
              />
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
                    <div class="suggestion-name">{{ buyerDisplayName(s) }}</div>
                    <div class="suggestion-meta">{{ s.total_orders }} 单 / 售后率 {{ formatAfterSaleRate(s) }}</div>
                  </div>
                  <span :class="['suggestion-status', buyerStatusClass(s.status)]">
                    {{ buyerStatusText(s.status) }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="buyerInputMixed" class="buyer-input-error">姓名和 ID 请分开查询。</div>
          </div>

          <div v-if="selectedBuyer && buyerNames.length === 1" class="buyer-profile-card">
            <div class="profile-avatar" :style="{ background: getAvatarColor(selectedBuyer.name) }">
              {{ selectedBuyer.name.charAt(0) }}
            </div>
            <div class="profile-info">
              <div class="profile-name">{{ buyerDisplayName(selectedBuyer) }}</div>
            </div>
            <CloseOutlined class="profile-clear" @click="clearBuyer" />
          </div>

          <div class="check-mode-panel">
            <div class="field-label">校验方式 <span class="required">*</span></div>
            <div class="check-mode-grid cols-2">
              <button
                v-for="mode in mainCheckModes"
                :key="mode.key"
                type="button"
                :class="['check-mode-card', { active: activeCheckMode === mode.key }]"
                @click="setCheckMode(mode.key)"
              >
                <component :is="mode.icon" />
                <span>{{ mode.shortLabel }}</span>
              </button>
            </div>
          </div>

          <div v-if="activeCheckMode === 'task'" class="field">
            <label class="field-label">任务号 <span class="required">*</span></label>
            <a-input
              v-model:value="dimValues.task_id"
              placeholder="输入任务号"
              size="large"
              allow-clear
              @press-enter="runSingleCheck"
            >
              <template #prefix><SafetyCertificateOutlined style="color:#bbb" /></template>
            </a-input>
            <div class="asin-lookup-hint">
              填任务号。只有这里会按这个任务的排重规则决定能不能下单。
            </div>
          </div>

          <div v-else class="multi-query-panel">
            <div class="multi-query-head">
              <div class="field-label">多维度查询条件 <span class="required">*</span></div>
              <a-checkbox v-model:checked="fullAutoLookup">全选快捷</a-checkbox>
            </div>

            <template v-if="fullAutoLookup">
              <div class="field compact-field">
                <label class="field-label">ASIN <span class="required">*</span></label>
                <a-textarea
                  v-model:value="dimValues.asin"
                  placeholder="每行一个 ASIN"
                  allow-clear
                  :auto-size="{ minRows: 2, maxRows: 5 }"
                />
                <div class="asin-lookup-hint">根据 ASIN 关联出店铺、品牌、客户和公司。</div>
              </div>
            </template>

            <template v-else>
              <div class="multi-dim-selector">
                <button
                  v-for="dim in queryDimensionOptions"
                  :key="dim.key"
                  type="button"
                  :class="['multi-dim-chip', { active: selectedQueryDims.includes(dim.key) }]"
                  @click="toggleQueryDim(dim.key)"
                >
                  <component :is="dim.icon" />
                  <span>{{ dim.label }}</span>
                </button>
              </div>

              <div class="multi-input-grid">
                <div v-for="dim in visibleQueryDimensions" :key="dim.key" class="field compact-field">
                  <label class="field-label">{{ dim.label }} <span class="required">*</span></label>
                  <a-textarea
                    v-model:value="dimValues[dim.key]"
                    :placeholder="dim.placeholder"
                    allow-clear
                    :auto-size="{ minRows: 2, maxRows: 5 }"
                  />
                </div>
              </div>
            </template>
          </div>

          <a-button
            type="primary"
            size="large"
            block
            class="run-btn"
            :loading="checking || batchChecking"
            :disabled="!canRunCheck"
            @click="runSingleCheck"
          >
            <template #icon><ThunderboltOutlined /></template>
            {{ runButtonText }}
          </a-button>
        </div>
      </div>

      <div class="result-section">
        <template v-if="singleResult">
          <div class="result-hero" :class="resultHeroClass(singleResult)">
            <div class="hero-left">
              <div class="hero-avatar" :style="{ background: getAvatarColor(singleResult.buyerName) }">
                {{ singleResult.buyerName.charAt(0) }}
              </div>
              <div>
                <div class="hero-name">{{ resultBuyerDisplayName(singleResult) }}</div>
                <div v-if="singleResult.checkLabel" class="hero-check-label">{{ singleResult.checkLabel }}</div>
                <div class="hero-info">
                  <template v-if="singleResult.buyerInfo">
                    <a-tag :color="buyerStatusColor(singleResult.buyerInfo.status)" size="small">
                      {{ buyerStatusText(singleResult.buyerInfo.status) }}
                    </a-tag>
                    <a-tag :color="singleResult.buyerInfo.is_prime_member ? 'gold' : 'default'" size="small">
                      {{ singleResult.buyerInfo.is_prime_member ? 'Prime' : '非Prime' }}
                    </a-tag>
                    <span class="hero-stat">{{ singleResult.buyerInfo.total_orders }} 单</span>
                    <span class="hero-stat">售后率 {{ formatAfterSaleRate(singleResult.buyerInfo) }}</span>
                  </template>
                  <span v-else class="hero-unknown">系统无此买手档案</span>
                </div>
              </div>
            </div>
            <div class="hero-right">
              <div :class="['hero-badge', heroBadgeClass(singleResult)]">
                <ExclamationCircleOutlined v-if="isHistoryOnlyResult(singleResult) && hasHistoryRecords(singleResult)" />
                <CheckCircleOutlined v-else-if="singleResult.overallPass" />
                <CloseCircleOutlined v-else />
                {{ heroStatusText(singleResult) }}
              </div>
              <div v-if="showHeroCounts(singleResult)" class="hero-counts">
                <span class="hc-pass">{{ heroPassCount(singleResult) }} 通过</span>
                <span class="hc-fail">{{ heroFailCount(singleResult) }} 拦截</span>
              </div>
              <div v-if="primaryResultReason(singleResult)" class="hero-reason">
                {{ primaryResultReason(singleResult) }}
              </div>
            </div>
          </div>

          <div v-if="showContextCard(singleResult)" class="context-card">
            <div class="section-title-row">
              <div class="section-title-text">{{ contextCardTitle(singleResult) }}</div>
              <span v-if="singleResult.usingMock" class="mock-tag">示例</span>
            </div>
            <div v-if="contextItems(singleResult).length > 0" class="context-grid">
              <div v-for="item in contextItems(singleResult)" :key="item.label" class="context-item">
                <span class="context-label">{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>

          <div v-if="detailRisks(singleResult).length > 0" class="history-section">
            <div class="section-title-row">
              <div>
                <div class="section-title-text">{{ detailSectionTitle(singleResult) }}</div>
                <div v-if="detailSectionSubtitle(singleResult)" class="section-subtitle">{{ detailSectionSubtitle(singleResult) }}</div>
              </div>
              <span
                v-if="!isSingleDimensionDemoResult(singleResult)"
                :class="['history-summary', blockingRisks(singleResult).length > 0 ? 'fail' : 'pass']"
              >
                {{ blockingRisks(singleResult).length > 0 ? '拦截' : '历史记录' }}
              </span>
            </div>
            <div class="risk-board">
              <div
                v-for="risk in detailRisks(singleResult)"
                :key="risk.key"
                :class="['risk-card-v2', riskVisualStatus(risk), riskDimensionClass(risk)]"
              >
                <div v-if="!isHistoryOnlyResult(singleResult)" class="risk-card-top">
                  <span class="risk-dim-badge">{{ riskDimensionLabel(risk) }}</span>
                  <span v-if="showRiskStatusBadge(singleResult, risk)" :class="['history-risk-badge', riskVisualStatus(risk)]">
                    {{ riskBadgeText(risk) }}
                  </span>
                </div>
                <div v-if="!isSingleDimensionDemoResult(singleResult)" class="risk-reason-v2">{{ risk.reason }}</div>
                <div v-if="risk.records.length > 0" class="risk-evidence-list">
                  <div class="risk-evidence-title">历史订单</div>
                  <div v-for="record in risk.records.slice(0, 4)" :key="record.id" class="risk-evidence-card">
                    <div v-for="field in historyEvidenceFields(record, isHistoryOnlyResult(singleResult))" :key="field.label" class="risk-evidence-field">
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

        <template v-else-if="batchResults.length > 0">
          <div class="batch-results-section right-batch-results">
            <div v-if="isSingleBuyerBatch && batchBuyerSummary" class="batch-buyer-hero">
              <div class="hero-left">
                <div class="hero-avatar" :style="{ background: getAvatarColor(batchBuyerSummary.buyerName) }">
                  {{ batchBuyerSummary.buyerName.charAt(0) }}
                </div>
                <div>
                  <div class="hero-name">{{ resultBuyerDisplayName(batchBuyerSummary) }}</div>
                  <div class="hero-info">
                    <template v-if="batchBuyerSummary.buyerInfo">
                      <a-tag :color="buyerStatusColor(batchBuyerSummary.buyerInfo.status)" size="small">
                        {{ buyerStatusText(batchBuyerSummary.buyerInfo.status) }}
                      </a-tag>
                      <a-tag :color="batchBuyerSummary.buyerInfo.is_prime_member ? 'gold' : 'default'" size="small">
                        {{ batchBuyerSummary.buyerInfo.is_prime_member ? 'Prime' : '非Prime' }}
                      </a-tag>
                      <span class="hero-stat">{{ batchBuyerSummary.buyerInfo.total_orders }} 单</span>
                      <span class="hero-stat">售后率 {{ formatAfterSaleRate(batchBuyerSummary.buyerInfo) }}</span>
                    </template>
                    <span v-else class="hero-unknown">系统无此买手档案</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="batch-results-header">
              <div class="batch-results-title">{{ isSingleBuyerBatch ? '多目标校验结果' : '校验结果' }}</div>
              <div class="batch-stats-row">
                <span class="bs-item bs-total">共 {{ batchResults.length }} {{ batchResultUnitText }}</span>
                <template v-if="batchHistoryOnly">
                  <span class="bs-item bs-pass">{{ batchResults.filter(r => !hasHistoryRecords(r)).length }} 无记录</span>
                  <span class="bs-item bs-fail">{{ batchResults.filter(r => hasHistoryRecords(r)).length }} 有记录</span>
                </template>
                <template v-else>
                  <span class="bs-item bs-pass">{{ batchResults.filter(r => r.overallPass).length }} 通过</span>
                  <span class="bs-item bs-fail">{{ batchResults.filter(r => !r.overallPass).length }} 拦截</span>
                </template>
              </div>
              <div class="batch-filter-row">
                <span
                  :class="['bf-tab', batchFilter === 'all' ? 'active' : '']"
                  @click="batchFilter = 'all'"
                >全部</span>
                <span
                  :class="['bf-tab', batchFilter === 'pass' ? 'active' : '']"
                  @click="batchFilter = 'pass'"
                >{{ batchHistoryOnly ? '无记录' : '通过' }}</span>
                <span
                  :class="['bf-tab', batchFilter === 'fail' ? 'active' : '']"
                  @click="batchFilter = 'fail'"
                >{{ batchHistoryOnly ? '有记录' : '拦截' }}</span>
              </div>
            </div>

            <div class="batch-results-list" :class="{ compact: isSingleBuyerBatch }">
              <div
                v-for="br in filteredBatchResults"
                :key="batchResultKey(br)"
                :class="['batch-result-card', batchCardTone(br) === 'fail' ? 'card-fail' : 'card-pass', { 'single-buyer-target-card': isSingleBuyerBatch }]"
              >
                <div v-if="!isSingleBuyerBatch" class="brc-left">
                  <div class="brc-avatar" :style="{ background: getAvatarColor(br.buyerName) }">
                    {{ br.buyerName.charAt(0) }}
                  </div>
                  <div class="brc-info">
                    <div class="brc-name">{{ resultBuyerDisplayName(br) }}</div>
                    <div v-if="br.checkLabel" class="brc-check-label">{{ br.checkLabel }}</div>
                    <div class="brc-meta">
                      <template v-if="br.buyerInfo">
                        {{ br.buyerInfo.total_orders }} 单 / {{ br.buyerInfo.is_prime_member ? 'Prime' : '非Prime' }} / 售后率 {{ formatAfterSaleRate(br.buyerInfo) }}
                      </template>
                      <span v-else class="brc-no-record">无档案</span>
                    </div>
                  </div>
                </div>
                <div v-else class="brc-target-main">
                  <div class="brc-check-label">{{ br.checkLabel || resultBuyerDisplayName(br) }}</div>
                </div>
                <div class="brc-dims" :class="{ 'is-empty': !showBatchRiskChips(br) }">
                  <template v-if="showBatchRiskChips(br)">
                    <span
                      v-for="risk in visibleRisks(br).slice(0, 4)"
                      :key="risk.key"
                      :class="['brc-dim-tag', riskVisualStatus(risk)]"
                    >
                      {{ riskDimensionLabel(risk) }}:
                      {{ riskBadgeText(risk) }}
                    </span>
                  </template>
                </div>
                <div :class="['brc-verdict', batchCardTone(br)]">
                  <ExclamationCircleOutlined v-if="isHistoryOnlyResult(br) && hasHistoryRecords(br)" />
                  <CheckCircleOutlined v-else-if="br.overallPass" />
                  <CloseCircleOutlined v-else />
                  {{ isHistoryOnlyResult(br) ? heroStatusText(br) : br.overallPass ? '通过' : '拦截' }}
                </div>
                <div v-if="canExpandBatchResult(br)" class="brc-expand" @click="toggleExpand(batchResultKey(br))">
                  <DownOutlined :class="{ rotated: expandedBatch.includes(batchResultKey(br)) }" />
                </div>
                <div v-if="expandedBatch.includes(batchResultKey(br))" class="brc-detail">
                  <div class="risk-board batch-risk-board">
                    <div
                      v-for="risk in visibleRisks(br)"
                      :key="risk.key"
                      :class="['risk-card-v2', riskVisualStatus(risk), riskDimensionClass(risk)]"
                    >
                      <div v-if="!isHistoryOnlyResult(br)" class="risk-card-top">
                        <span class="risk-dim-badge">{{ riskDimensionLabel(risk) }}</span>
                        <span v-if="!isHistoryLookupRisk(risk)" :class="['history-risk-badge', riskVisualStatus(risk)]">
                          {{ riskBadgeText(risk) }}
                        </span>
                      </div>
                      <div v-if="!isHistoryOnlyResult(br)" class="risk-reason-v2">{{ risk.reason }}</div>
                      <div v-if="risk.records.length > 0" class="risk-evidence-list">
                        <div class="risk-evidence-title">历史订单</div>
                        <div v-for="record in risk.records.slice(0, 4)" :key="record.id" class="risk-evidence-card">
                          <div v-for="field in historyEvidenceFields(record, isHistoryOnlyResult(br))" :key="field.label" class="risk-evidence-field">
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
        </template>

        <div v-else class="empty-state">
          <div class="empty-visual">
            <SafetyCertificateOutlined class="empty-main-icon" />
          </div>
          <div class="empty-title">选择校验方式后开始排查</div>
          <div class="empty-desc">输入买手姓名或买手 ID，再填写 ASIN、任务号、店铺、品牌、客户或公司主体。</div>
          <div class="empty-dims">
            <span class="empty-dim-tag"><SafetyCertificateOutlined style="font-size:12px" />任务校验</span>
            <span class="empty-dim-tag"><BarcodeOutlined style="font-size:12px" />全面排查</span>
            <span class="empty-dim-tag"><ShopOutlined style="font-size:12px" />店铺/品牌</span>
            <span class="empty-dim-tag"><ContactsOutlined style="font-size:12px" />客户/公司主体</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import {
  SearchOutlined, CloseOutlined,
  ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined, SafetyCertificateOutlined,
  DownOutlined,
  BarcodeOutlined, ShopOutlined, TagOutlined,
  ContactsOutlined, BankOutlined,
} from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

interface BuyerInfo {
  id: string
  buyer_number?: string
  name: string
  status: string
  rating: number
  total_orders: number
  is_prime_member?: boolean
  after_sale_rate?: number
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

type CheckMode = 'full' | 'task' | 'multi' | 'asin' | 'store' | 'brand' | 'customer' | 'company'
type DimensionInputKey = 'asin' | 'task_id' | 'store' | 'brand' | 'client_contact' | 'client_company'

interface CheckModeConfig {
  key: CheckMode
  label: string
  shortLabel: string
  inputKey: DimensionInputKey
  inputLabel: string
  placeholder: string
  hint: string
  icon: any
}

interface CheckResult {
  buyerName: string
  buyerInfo: BuyerInfo | null
  checkLabel?: string
  items: DimResult[]
  asinAssociations: AsinAssociation[]
  buyerHistory: BuyerHistorySummary
  overallPass: boolean
  passCount: number
  failCount: number
  warnCount: number
  usingMock: boolean
}

interface CheckContext {
  asin?: string
  associations?: AsinAssociation[]
  scope?: ScopeOptions
  mode?: CheckMode
  dimKeys?: string[]
  targetOverrides?: Record<string, string[]>
  checkLabel?: string
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
  asin: '', task_id: '', store: '', brand: '', client_contact: '', client_company: '',
})
const activeCheckMode = ref<CheckMode>('multi')
const selectedQueryDims = ref<DimensionInputKey[]>(['asin'])
const fullAutoLookup = ref(false)
const scopeOptions = reactive<ScopeOptions>({
  sameCustomerOtherStores: false,
  sameCompanyAllStores: false,
  partialCustomerStores: false,
  partialStoreNames: '',
})
const checking = ref(false)
const singleResult = ref<CheckResult | null>(null)

const batchChecking = ref(false)
const batchResults = ref<CheckResult[]>([])
const batchFilter = ref('all')
const expandedBatch = ref<string[]>([])

let suggestTimer: ReturnType<typeof setTimeout> | null = null

const buyerNames = computed(() =>
  buyerInput.value.split(/[,，\n]+/).map(name => name.trim()).filter(Boolean)
)

function isBuyerIdToken(value: string) {
  const text = value.trim()
  if (isUuidLike(text)) return true
  return !/[\u4e00-\u9fa5\s]/.test(text) && /[0-9]/.test(text)
}

const buyerInputMixed = computed(() => {
  const kinds = buyerNames.value.map(name => isBuyerIdToken(name))
  return kinds.some(Boolean) && kinds.some(kind => !kind)
})

const batchNames = computed(() => buyerNames.value)

const batchHistoryOnly = computed(() =>
  batchResults.value.length > 0 && batchResults.value.every(result => isHistoryOnlyResult(result))
)

const filteredBatchResults = computed(() => {
  if (batchHistoryOnly.value) {
    if (batchFilter.value === 'pass') return batchResults.value.filter(r => !hasHistoryRecords(r))
    if (batchFilter.value === 'fail') return batchResults.value.filter(r => hasHistoryRecords(r))
    return batchResults.value
  }
  if (batchFilter.value === 'pass') return batchResults.value.filter(r => r.overallPass)
  if (batchFilter.value === 'fail') return batchResults.value.filter(r => !r.overallPass)
  return batchResults.value
})

const batchResultUnitText = computed(() =>
  batchResults.value.some(result => result.checkLabel) ? '条' : '人'
)

const batchBuyerKeys = computed(() =>
  [...new Set(batchResults.value.map(result => result.buyerInfo?.id || result.buyerName))]
)

const isSingleBuyerBatch = computed(() =>
  batchResults.value.length > 1 && batchBuyerKeys.value.length === 1
)

const batchBuyerSummary = computed(() =>
  isSingleBuyerBatch.value ? batchResults.value[0] : null
)

const checkModeOptions: CheckModeConfig[] = [
  {
    key: 'task',
    label: '任务校验',
    shortLabel: '任务校验',
    inputKey: 'task_id',
    inputLabel: '任务号',
    placeholder: '输入任务号',
    hint: '读取当前任务规则，只有这里才判断全店排重/组织级排重是否开启。',
    icon: SafetyCertificateOutlined,
  },
  {
    key: 'multi',
    label: '多维度查询',
    shortLabel: '多维查询',
    inputKey: 'asin',
    inputLabel: '查询条件',
    placeholder: '选择维度后填写查询值',
    hint: '支持单个或多个维度查询；各输入框可多行批量填写。',
    icon: SearchOutlined,
  },
  {
    key: 'full',
    label: '全面排查',
    shortLabel: '全面',
    inputKey: 'asin',
    inputLabel: 'ASIN',
    placeholder: '输入 ASIN，自动关联店铺、品牌、客户信息',
    hint: '适合下单前最终判断：ASIN、店铺、品牌等风险会一起校验。',
    icon: SafetyCertificateOutlined,
  },
  {
    key: 'asin',
    label: 'ASIN 校验',
    shortLabel: 'ASIN',
    inputKey: 'asin',
    inputLabel: 'ASIN',
    placeholder: '输入要查询的 ASIN',
    hint: '只查该买手是否购买过这个 ASIN。',
    icon: BarcodeOutlined,
  },
  {
    key: 'store',
    label: '店铺校验',
    shortLabel: '店铺',
    inputKey: 'store',
    inputLabel: '店铺',
    placeholder: '输入店铺名称',
    hint: '只查该买手是否买过这个店铺，以及店铺 3 个月/终身限制。',
    icon: ShopOutlined,
  },
  {
    key: 'brand',
    label: '品牌校验',
    shortLabel: '品牌',
    inputKey: 'brand',
    inputLabel: '品牌',
    placeholder: '输入品牌名称，General 不进入品牌限制',
    hint: '只查该买手 1 个月内是否购买过这个品牌。',
    icon: TagOutlined,
  },
  {
    key: 'customer',
    label: '客户校验',
    shortLabel: '客户',
    inputKey: 'client_contact',
    inputLabel: '客户',
    placeholder: '输入客户名称或客户编号',
    hint: '只查该买手是否有该客户历史订单；是否拦截需结合任务规则。',
    icon: ContactsOutlined,
  },
  {
    key: 'company',
    label: '客户公司主体',
    shortLabel: '公司',
    inputKey: 'client_company',
    inputLabel: '客户公司主体',
    placeholder: '输入客户公司主体名称或编号',
    hint: '只查该买手是否有同公司主体历史订单；是否拦截需结合任务规则。',
    icon: BankOutlined,
  },
]

const mainCheckModes = checkModeOptions.filter(mode => ['task', 'multi'].includes(mode.key))

const queryDimensionOptions = [
  { key: 'asin' as DimensionInputKey, mode: 'asin' as CheckMode, label: 'ASIN', icon: BarcodeOutlined, placeholder: '每行一个 ASIN' },
  { key: 'store' as DimensionInputKey, mode: 'store' as CheckMode, label: '店铺', icon: ShopOutlined, placeholder: '每行一个店铺名称' },
  { key: 'brand' as DimensionInputKey, mode: 'brand' as CheckMode, label: '品牌', icon: TagOutlined, placeholder: '每行一个品牌名称，General 不进入品牌限制' },
  { key: 'client_contact' as DimensionInputKey, mode: 'customer' as CheckMode, label: '客户', icon: ContactsOutlined, placeholder: '每行一个客户名称或客户编号' },
  { key: 'client_company' as DimensionInputKey, mode: 'company' as CheckMode, label: '公司主体', icon: BankOutlined, placeholder: '每行一个公司主体名称或编号' },
]

const visibleQueryDimensions = computed(() =>
  queryDimensionOptions.filter(dim => selectedQueryDims.value.includes(dim.key))
)

const multiDemoHistoryOnly = computed(() => {
  if (fullAutoLookup.value) return false
  const dims = visibleQueryDimensions.value
  return dims.length > 0 && dims.every(dim => dim.mode === 'customer' || dim.mode === 'company')
})

const activeModeConfig = computed(() => checkModeOptions.find(mode => mode.key === activeCheckMode.value) || checkModeOptions[0])

const activeTargetValue = computed(() => dimValues[activeModeConfig.value.inputKey] || '')

const canRunCheck = computed(() => {
  if (buyerNames.value.length === 0 || buyerInputMixed.value) return false
  if (activeCheckMode.value === 'task') return Boolean(dimValues.task_id.trim())
  if (fullAutoLookup.value) return parseMultiValues(dimValues.asin, 'asin').length > 0
  return selectedQueryDims.value.some(key => parseMultiValues(dimValues[key], key).length > 0)
})

const canRunBatchCheck = computed(() => canRunCheck.value)

const currentQueryTargetCount = computed(() => {
  if (activeCheckMode.value === 'task') return parseMultiValues(dimValues.task_id, 'task_id').length
  if (fullAutoLookup.value) return parseMultiValues(dimValues.asin, 'asin').length
  return selectedQueryDims.value.reduce((total, key) => total + parseMultiValues(dimValues[key], key).length, 0)
})

const runButtonText = computed(() => {
  const count = buyerNames.value.length
  const targetCount = currentQueryTargetCount.value
  const action = activeCheckMode.value === 'task'
      ? '任务校验'
      : fullAutoLookup.value
        ? '全选排查'
        : '多维查询'
  if (count > 1 || targetCount > 1) {
    if (activeCheckMode.value === 'task') return `批量任务校验 ${count} 人`
    return `批量查询 ${count} 人 / ${targetCount} 项`
  }
  return action
})

const singleDimPassDemoText = computed(() =>
  selectedSingleDimensionMode.value === 'customer' || selectedSingleDimensionMode.value === 'company'
    ? '无购买记录演示'
    : '当前维度通过演示'
)

const singleDimFailDemoText = computed(() =>
  selectedSingleDimensionMode.value === 'customer' || selectedSingleDimensionMode.value === 'company'
    ? '有购买记录演示'
    : '当前维度拦截演示'
)

const selectedSingleDimensionMode = computed<Exclude<CheckMode, 'full' | 'task' | 'multi'>>(() => {
  if (['asin', 'store', 'brand', 'customer', 'company'].includes(activeCheckMode.value)) {
    return activeCheckMode.value as Exclude<CheckMode, 'full' | 'task' | 'multi'>
  }
  return 'asin'
})

const isHistoryOnlyMode = computed(() =>
  selectedSingleDimensionMode.value === 'customer' || selectedSingleDimensionMode.value === 'company'
)

const avatarColors = ['#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#be185d']

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function buyerDisplayName(buyer: BuyerInfo | null | undefined) {
  if (!buyer) return ''
  const displayId = buyer.buyer_number || buyer.id
  return displayId ? `${buyer.name}（ID: ${displayId}）` : buyer.name
}

function resultBuyerDisplayName(result: CheckResult) {
  return result.buyerInfo ? buyerDisplayName(result.buyerInfo) : result.buyerName
}

function batchResultKey(result: CheckResult) {
  return `${result.buyerInfo?.id || result.buyerName}|${result.checkLabel || 'single'}`
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
}

function normalizeBuyerInfo(row: any): BuyerInfo {
  return {
    id: row.id,
    buyer_number: row.buyer_number || '',
    name: row.name || '',
    status: row.status || '活跃',
    rating: Number(row.success_rate ?? row.rating ?? 0),
    total_orders: Number(row.total_completed ?? row.total_orders ?? 0),
    is_prime_member: Boolean(row.is_prime_member),
    after_sale_rate: Number(row.after_sale_rate ?? 0),
  }
}

function buyerStatusText(status: string) {
  if (status === 'active') return '活跃'
  if (status === 'inactive') return '暂停'
  if (['活跃', '暂停', '黑名单'].includes(status)) return status
  return status || '活跃'
}

function buyerStatusColor(status: string) {
  const text = buyerStatusText(status)
  if (text === '黑名单') return 'red'
  if (text === '暂停') return 'orange'
  return 'green'
}

function buyerStatusClass(status: string) {
  const text = buyerStatusText(status)
  if (text === '黑名单') return 'blacklist'
  if (text === '暂停') return 'inactive'
  return 'active'
}

function formatAfterSaleRate(buyer: BuyerInfo | null | undefined) {
  const value = Number(buyer?.after_sale_rate ?? 0)
  return `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`
}

function isBuyerActive(status: string) {
  return buyerStatusText(status) === '活跃'
}

function toggleDim(key: string) {
  const idx = selectedDims.value.indexOf(key)
  if (idx >= 0) selectedDims.value.splice(idx, 1)
  else selectedDims.value.push(key)
}

function onBuyerInput() {
  selectedBuyer.value = null
  if (suggestTimer) clearTimeout(suggestTimer)
  if (!buyerInput.value.trim() || buyerNames.value.length !== 1) {
    buyerSuggestions.value = []
    return
  }
  suggestTimer = setTimeout(fetchSuggestions, 300)
}

async function fetchSuggestions() {
  const keyword = buyerNames.value[0]
  if (!keyword) return
  const [nameResult, idResult] = await Promise.all([
    supabase
      .from('erp_buyers')
      .select('id, buyer_number, name, status, total_completed, success_rate, after_sale_rate, is_prime_member')
      .or(`name.ilike.%${keyword}%,buyer_number.ilike.%${keyword}%`)
      .limit(8),
    keyword
      ? supabase
        .from('erp_buyers')
        .select('id, buyer_number, name, status, total_completed, success_rate, after_sale_rate, is_prime_member')
        .eq(isUuidLike(keyword) ? 'id' : 'buyer_number', keyword.trim())
        .limit(1)
      : Promise.resolve({ data: [] }),
  ])
  const rows = [...((idResult.data || []) as any[]), ...((nameResult.data || []) as any[])].map(normalizeBuyerInfo)
  const seen = new Set<string>()
  buyerSuggestions.value = rows.filter(row => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
}

async function fetchBuyerById(id: string): Promise<BuyerInfo | null> {
  if (!id.trim()) return null
  const { data } = await supabase
    .from('erp_buyers')
    .select('id, buyer_number, name, status, total_completed, success_rate, after_sale_rate, is_prime_member')
    .eq(isUuidLike(id) ? 'id' : 'buyer_number', id.trim())
    .maybeSingle()
  return data ? normalizeBuyerInfo(data) : null
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

async function fetchBuyerInfo(buyerKey: string): Promise<BuyerInfo | null> {
  const keyword = buyerKey.trim()
  const buyerById = await fetchBuyerById(keyword)
  if (buyerById) return buyerById

  const { data } = await supabase
    .from('erp_buyers')
    .select('id, buyer_number, name, status, total_completed, success_rate, after_sale_rate, is_prime_member')
    .ilike('name', keyword)
    .limit(1)
  return ((data || []) as any[]).map(normalizeBuyerInfo)[0] || null
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

function parseMultiValues(value: string, key?: string) {
  return uniqueFilled(
    String(value || '')
      .split(/[\n,，]+/)
      .map(item => key === 'asin' ? normalizeAsin(item) : item.trim()),
  )
}

function dimensionOptionByKey(key: DimensionInputKey) {
  return queryDimensionOptions.find(dim => dim.key === key)
}

function toggleQueryDim(key: DimensionInputKey) {
  const index = selectedQueryDims.value.indexOf(key)
  if (index >= 0) {
    if (selectedQueryDims.value.length === 1) return
    selectedQueryDims.value.splice(index, 1)
  } else {
    selectedQueryDims.value.push(key)
  }
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

function buildDimensionTargets(dimKey: string, associations: AsinAssociation[], targetOverrides: Record<string, string[]> = {}) {
  if (targetOverrides[dimKey]?.length) return targetOverrides[dimKey]
  const manual = dimValues[dimKey] || ''
  if (dimKey === 'asin') return uniqueFilled([manual])
  if (dimKey === 'store') return uniqueFilled([manual, ...associations.map(a => a.storeName)])
  if (dimKey === 'client_contact') return uniqueFilled([manual, ...associations.map(a => a.contactName)])
  if (dimKey === 'client_company') return uniqueFilled([manual, ...associations.map(a => a.companyName || a.customerIdStr)])
  return uniqueFilled([manual])
}

function setCheckMode(mode: CheckMode) {
  activeCheckMode.value = mode
}

function buildManualAssociation(mode: CheckMode, targetValue: string): AsinAssociation {
  const value = targetValue.trim()
  return {
    key: `manual|${mode}|${value}`,
    asin: mode === 'asin' ? normalizeAsin(value) : '—',
    storeId: '',
    storeName: mode === 'store' ? value : '',
    brandName: mode === 'brand' ? value : '',
    contactId: '',
    contactName: '',
    companyId: '',
    companyName: mode === 'customer' || mode === 'company' ? value : '',
    customerIdStr: mode === 'customer' || mode === 'company' ? value : '',
    productName: '',
    productImage: '',
    productPrice: 0,
    source: 'order_snapshot',
    lastOrderAt: '',
    orderCount: 0,
  }
}

function truthyRuleValue(value: any) {
  if (value === true) return true
  if (typeof value === 'number') return value > 0
  const text = normalizeText(value)
  return ['true', '1', 'yes', 'y', 'on', 'enabled', 'enable', '开启', '已开启', '是'].includes(text)
}

function readTaskRuleFlag(row: any, keys: string[]) {
  for (const key of keys) {
    if (row && Object.prototype.hasOwnProperty.call(row, key)) return truthyRuleValue(row[key])
  }
  return false
}

function extractTaskScopeOptions(taskRow: any): ScopeOptions {
  return {
    ...scopeOptions,
    sameCustomerOtherStores: readTaskRuleFlag(taskRow, [
      'same_customer_other_stores',
      'same_customer_dedupe',
      'customer_dedupe',
      'full_store_dedupe',
      'all_store_dedupe',
      'dedupe_customer',
      'enable_customer_dedupe',
    ]),
    sameCompanyAllStores: readTaskRuleFlag(taskRow, [
      'same_company_all_stores',
      'same_company_dedupe',
      'company_dedupe',
      'organization_dedupe',
      'org_dedupe',
      'dedupe_company',
      'enable_company_dedupe',
    ]),
  }
}

function restrictionDimKeysForMode(mode: CheckMode) {
  if (mode === 'full' || mode === 'task') return ['asin', 'store', 'brand', 'client_company']
  if (mode === 'customer' || mode === 'company') return ['client_company']
  return [mode]
}

function scopeOptionsForMode(mode: CheckMode): ScopeOptions {
  return {
    ...scopeOptions,
    sameCustomerOtherStores: mode === 'customer' ? false : scopeOptions.sameCustomerOtherStores,
    sameCompanyAllStores: mode === 'company' ? false : scopeOptions.sameCompanyAllStores,
  }
}

async function buildTaskCheckContext(taskId: string) {
  const normalizedTaskId = taskId.trim()
  const { data: taskRow } = await supabase
    .from('erp_orders')
    .select('*')
    .eq('id', normalizedTaskId)
    .maybeSingle()

  if (!taskRow) {
    return {
      asin: '',
      associations: [buildManualAssociation('task', normalizedTaskId)],
      mode: 'task' as CheckMode,
      scope: scopeOptionsForMode('task'),
      dimKeys: restrictionDimKeysForMode('task'),
    }
  }

  const { data: subRows } = await supabase
    .from('sub_orders')
    .select('asin, store_name, brand_name, customer_name, customer_id_str, product_name, product_image, product_price, created_at')
    .eq('order_id', normalizedTaskId)
    .order('created_at', { ascending: true })
    .limit(1)

  const firstSub = (subRows || [])[0] || {}
  const asin = normalizeAsin(firstSub.asin || (taskRow as any).asin || '')
  const association: AsinAssociation = {
    key: `task|${normalizedTaskId}`,
    asin,
    storeId: (taskRow as any).store_id || '',
    storeName: firstSub.store_name || (taskRow as any).store_name || '',
    brandName: firstSub.brand_name || (taskRow as any).brand_name || '',
    contactId: '',
    contactName: '',
    companyId: (taskRow as any).company_id || '',
    companyName: firstSub.customer_name || (taskRow as any).customer_name || '',
    customerIdStr: firstSub.customer_id_str || (taskRow as any).customer_id_str || '',
    productName: firstSub.product_name || (taskRow as any).product_name || '',
    productImage: firstSub.product_image || (taskRow as any).product_image || '',
    productPrice: Number(firstSub.product_price || (taskRow as any).product_price || 0),
    source: 'order_snapshot',
    lastOrderAt: firstSub.created_at || (taskRow as any).created_at || '',
    orderCount: 1,
  }

  return {
    asin,
    associations: [association],
    mode: 'task' as CheckMode,
    scope: extractTaskScopeOptions(taskRow),
    dimKeys: restrictionDimKeysForMode('task'),
  }
}

async function buildCheckContextForMode(mode: CheckMode) {
  const config = checkModeOptions.find(item => item.key === mode) || checkModeOptions[0]
  const rawValue = dimValues[config.inputKey].trim()
  const targetValue = config.inputKey === 'asin' ? normalizeAsin(rawValue) : rawValue
  if (!targetValue) return null

  if (mode === 'task') return buildTaskCheckContext(targetValue)

  if (mode === 'full' || mode === 'asin') {
    const foundAssociations = await fetchAsinAssociations(targetValue)
    const associations = foundAssociations.length > 0
      ? foundAssociations
      : mode === 'full'
        ? buildMockAssociations(targetValue)
        : [buildManualAssociation('asin', targetValue)]
    return {
      asin: targetValue,
      associations,
      mode,
      scope: scopeOptionsForMode(mode),
      dimKeys: restrictionDimKeysForMode(mode),
    }
  }

  return {
    asin: '',
    associations: [buildManualAssociation(mode, targetValue)],
    mode,
    scope: scopeOptionsForMode(mode),
    dimKeys: restrictionDimKeysForMode(mode),
  }
}

async function buildContextForDimension(dim: (typeof queryDimensionOptions)[number], targetValue: string): Promise<CheckContext> {
  const value = dim.key === 'asin' ? normalizeAsin(targetValue) : targetValue.trim()
  const mode = dim.mode

  if (mode === 'asin') {
    const foundAssociations = await fetchAsinAssociations(value)
    const associations = foundAssociations.length > 0 ? foundAssociations : [buildManualAssociation('asin', value)]
    return {
      asin: value,
      associations,
      mode,
      scope: scopeOptionsForMode(mode),
      dimKeys: restrictionDimKeysForMode(mode),
      targetOverrides: { asin: [value] },
      checkLabel: `ASIN：${value}`,
    }
  }

  const association = buildManualAssociation(mode, value)
  const dimKey = mode === 'customer' || mode === 'company' ? 'client_company' : dim.key
  return {
    asin: '',
    associations: [association],
    mode,
    scope: scopeOptionsForMode(mode),
    dimKeys: restrictionDimKeysForMode(mode),
    targetOverrides: { [dimKey]: [value] },
    checkLabel: `${dim.label}：${value}`,
  }
}

async function buildCheckContextsForCurrent(): Promise<CheckContext[]> {
  if (activeCheckMode.value === 'task') {
    const taskIds = parseMultiValues(dimValues.task_id, 'task_id')
    const contexts = await Promise.all(taskIds.map(async taskId => {
      const context = await buildTaskCheckContext(taskId)
      return { ...context, checkLabel: `任务：${taskId}`, targetOverrides: { task_id: [taskId] } }
    }))
    return contexts
  }

  if (fullAutoLookup.value) {
    const asins = parseMultiValues(dimValues.asin, 'asin')
    const contexts = await Promise.all(asins.map(async asin => {
      const foundAssociations = await fetchAsinAssociations(asin)
      const associations = foundAssociations.length > 0 ? foundAssociations : buildMockAssociations(asin)
      return {
        asin,
        associations,
        mode: 'full' as CheckMode,
        scope: scopeOptionsForMode('full'),
        dimKeys: restrictionDimKeysForMode('full'),
        targetOverrides: {
          asin: [asin],
          store: uniqueFilled(associations.map(a => a.storeName)),
          brand: uniqueFilled(associations.map(a => a.brandName)),
          client_company: uniqueFilled(associations.map(a => a.companyName || a.customerIdStr)),
        },
        checkLabel: `全选：${asin}`,
      }
    }))
    return contexts
  }

  const contexts: CheckContext[] = []
  for (const dimKey of selectedQueryDims.value) {
    const dim = dimensionOptionByKey(dimKey)
    if (!dim) continue
    const values = parseMultiValues(dimValues[dim.key], dim.key)
    for (const value of values) {
      contexts.push(await buildContextForDimension(dim, value))
    }
  }
  return contexts
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

function formatNamedId(name?: string, id?: string) {
  const label = String(name || '').trim()
  const code = String(id || '').trim()
  if (label && code && label !== code) return `${label}（ID: ${code}）`
  return label || code
}

function historyEvidenceFields(record: BuyerHistoryRecord, partyOnly = false) {
  const fields = [
    { label: '订单ID', value: displayOrderId(record) },
    { label: '时间', value: fmtDate(record.date) },
    { label: 'ASIN', value: record.asin || '未知ASIN' },
    { label: '店铺', value: record.storeName || '未知店铺' },
    { label: '品牌', value: record.brandName || '未知品牌' },
    { label: '客户', value: formatNamedId(record.customerName, record.customerIdStr) || '未知客户' },
  ]
  if (!partyOnly) return fields
  return fields.filter(field => field.label === '订单ID' || field.label === '时间')
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
      key: 'mock-full-customer-history',
      title: '客户历史查询',
      status: 'pass',
      reason: `该买手有购买过客户「${formatNamedId(assoc.companyName, assoc.customerIdStr)}」下的历史订单，是否拦截需使用任务校验判断。`,
      records: [sameCustomerRecord],
    },
    {
      key: 'mock-full-company-history',
      title: '客户公司历史查询',
      status: 'pass',
      reason: '该买手有购买过公司主体「Demo Trading Group（ID: ORG-GROUP）」下的历史订单，是否拦截需使用任务校验判断。',
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
      reason: `此任务开启了“全店排重”，${buyerName} 命中客户「${assoc.companyName}」其他店铺限制。`,
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
      reason: `此任务开启了“组织级排重”，${buyerName} 命中同公司主体限制。`,
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

function mockModeTarget(mode: CheckMode) {
  if (mode === 'store') return 'FreshJoy Home'
  if (mode === 'brand') return 'FreshJoy'
  if (mode === 'customer') return 'Demo Trading LLC'
  if (mode === 'company') return 'Demo Trading Group'
  if (mode === 'task') return '00000000-0000-0000-0000-000000000001'
  return 'B0MOCKSINGLE01'
}

function buildSingleDimensionMockAssociations(mode: CheckMode): AsinAssociation[] {
  const target = mockModeTarget(mode)
  if (mode === 'task') {
    return [{
      key: `mock-single|task|${target}`,
      asin: 'B0MOCKTASK01',
      storeId: '',
      storeName: 'FreshJoy Home',
      brandName: 'FreshJoy',
      contactId: '',
      contactName: '',
      companyId: '',
      companyName: 'Demo Trading Group',
      customerIdStr: 'ORG-GROUP',
      productName: '',
      productImage: '',
      productPrice: 0,
      source: 'order_snapshot',
      lastOrderAt: '',
      orderCount: 0,
      isMock: true,
    }]
  }
  return [{
    key: `mock-single|${mode}|${target}`,
    asin: mode === 'asin' ? target : '—',
    storeId: '',
    storeName: mode === 'store' ? target : '',
    brandName: mode === 'brand' ? target : '',
    contactId: '',
    contactName: '',
    companyId: '',
    companyName: mode === 'customer' || mode === 'company' ? target : '',
    customerIdStr: mode === 'customer' ? 'ORG-DEMO' : mode === 'company' ? 'ORG-GROUP' : '',
    productName: '',
    productImage: '',
    productPrice: 0,
    source: 'order_snapshot',
    lastOrderAt: '',
    orderCount: 0,
    isMock: true,
  }]
}

function buildSingleDimensionRisk(
  mode: Exclude<CheckMode, 'full'>,
  status: 'pass' | 'fail' | 'enabled-pass' | 'disabled-pass',
  targetOverride?: string,
  targetId?: string,
): BuyerHistoryRisk {
  const target = targetOverride || mockModeTarget(mode)
  const partyId = String(targetId || '').trim()
  const record: BuyerHistoryRecord = {
    id: `mock-single-${mode}`,
    orderNumber: `SUB-MOCK-${mode.toUpperCase()}-01`,
    asin: mode === 'asin' ? target : mode === 'task' ? 'B0MOCKTASK01' : `B0MOCK${mode.toUpperCase()}01`,
    storeName: mode === 'store' ? target : 'FreshJoy History Store',
    brandName: mode === 'brand' ? target : 'FreshJoy',
    customerName: mode === 'customer' || mode === 'company' ? target : mode === 'task' ? 'Demo Trading Group' : 'Demo Trading LLC',
    customerIdStr: mode === 'customer' || mode === 'company' ? partyId : mode === 'task' ? 'ORG-GROUP' : 'ORG-DEMO',
    date: mockRiskDate(mode === 'brand' ? 8 : 21),
    isMock: true,
  }

  if (mode === 'task') {
    return {
      key: 'mock-task-company-dedupe',
      title: '任务排重规则',
      status: status === 'fail' ? 'fail' : 'pass',
      reason: status === 'fail'
        ? '此任务开启了“组织级排重”，该买手已购买过当前公司主体下的订单，不可下单。'
        : status === 'enabled-pass'
          ? '此任务开启了“全店排重”和“组织级排重”，未发现该买手命中客户或公司主体历史，可下单。'
          : '此任务未开启“全店排重”和“组织级排重”，可下单。',
      records: status === 'fail' ? [record] : [],
    }
  }
  const normalizedStatus: BuyerHistoryRisk['status'] = status === 'fail' ? 'fail' : 'pass'

  if (mode === 'asin') {
    return {
      key: 'mock-single-asin',
      title: '同买手重复 ASIN',
      status: normalizedStatus,
      reason: status === 'fail'
        ? `该买手已购买过 ASIN ${target}，不可下单。`
        : `该买手未购买过 ASIN ${target}，可下单。`,
      records: status === 'fail' ? [record] : [],
    }
  }

  if (mode === 'store') {
    return {
      key: 'mock-single-store',
      title: '同店铺历史限制',
      status: normalizedStatus,
      reason: status === 'fail'
        ? `3 个月内已购买过店铺「${target}」。`
        : `该买手 3 个月内未购买过店铺「${target}」，可下单。`,
      records: status === 'fail' ? [record] : [],
    }
  }

  if (mode === 'brand') {
    return {
      key: 'mock-single-brand',
      title: '同品牌 1 个月限制',
      status: normalizedStatus,
      reason: status === 'fail'
        ? `1 个月内已购买过品牌「${target}」。`
        : `该买手未在 1 个月内购买过品牌「${target}」的 ASIN，可下单。`,
      records: status === 'fail' ? [record] : [],
    }
  }

  if (mode === 'customer') {
    return {
      key: 'mock-single-customer',
      title: '客户历史查询',
      status: 'pass',
      reason: status === 'fail'
        ? `该买手有购买过客户「${formatNamedId(target, partyId)}」下的历史订单，是否拦截需结合任务规则判断。`
        : `未发现该买手购买过客户「${formatNamedId(target, partyId)}」下的历史订单。`,
      records: status === 'fail' ? [record] : [],
    }
  }

  return {
    key: 'mock-single-company',
    title: '客户公司历史查询',
    status: 'pass',
    reason: status === 'fail'
      ? `该买手有购买过公司主体「${formatNamedId(target, partyId)}」下的历史订单，是否拦截需结合任务规则判断。`
      : `未发现该买手购买过公司主体「${formatNamedId(target, partyId)}」下的历史订单。`,
    records: status === 'fail' ? [record] : [],
  }
}

function buildSingleDimensionMockResult(
  mode: Exclude<CheckMode, 'full'>,
  status: 'pass' | 'fail' | 'enabled-pass' | 'disabled-pass',
  associations: AsinAssociation[],
  options: { target?: string, targetId?: string, buyerName?: string, checkLabel?: string } = {},
): CheckResult {
  const targetName = options.target || mockModeTarget(mode)
  const associationId = associations[0]?.customerIdStr || ''
  const targetId = options.targetId || (associationId && associationId !== targetName ? associationId : '')
  const risk = buildSingleDimensionRisk(mode, status, options.target, targetId)
  const buyerName = options.buyerName || 'Michael Brown'
  return {
    buyerName,
    buyerInfo: {
      id: 'mock-buyer',
      name: buyerName,
      status: 'active',
      rating: 4.8,
      total_orders: 13,
    },
    checkLabel: options.checkLabel || subjectCheckLabel(mode, targetName, targetId),
    items: [],
    asinAssociations: associations,
    buyerHistory: {
      total: risk.records.length,
      risks: [risk],
      hasBlockingRisk: risk.status === 'fail',
    },
    overallPass: risk.status !== 'fail',
    passCount: risk.status === 'pass' ? 1 : 0,
    failCount: risk.status === 'fail' ? 1 : 0,
    warnCount: 0,
    usingMock: true,
  }
}

function buildTaskMockDemo(status: 'pass' | 'fail'): CheckResult {
  const associations = [{
    ...buildMockAssociations('B0MOCKTASK01')[0],
    key: 'mock-task-context',
    asin: 'B0MOCKTASK01',
    storeName: 'FreshJoy Home',
    brandName: 'FreshJoy',
    companyName: 'Demo Trading Group',
    customerIdStr: 'ORG-GROUP',
    isMock: true,
  }]
  const assoc = associations[0]
  const sameAsinRecord: BuyerHistoryRecord = {
    id: 'mock-task-same-asin',
    orderNumber: 'SUB-TASK-ASIN-01',
    asin: assoc.asin,
    storeName: assoc.storeName,
    brandName: assoc.brandName,
    customerName: assoc.companyName,
    customerIdStr: assoc.customerIdStr,
    date: mockRiskDate(26),
    isMock: true,
  }
  const sameStoreRecord: BuyerHistoryRecord = {
    id: 'mock-task-same-store',
    orderNumber: 'SUB-TASK-STORE-01',
    asin: 'B0TASKSTORE02',
    storeName: assoc.storeName,
    brandName: 'OtherBrand',
    customerName: assoc.companyName,
    customerIdStr: assoc.customerIdStr,
    date: mockRiskDate(42),
    isMock: true,
  }
  const companyRecord: BuyerHistoryRecord = {
    id: 'mock-task-company',
    orderNumber: 'SUB-TASK-ORG-01',
    asin: 'B0TASKORG03',
    storeName: 'FreshJoy Company Store',
    brandName: 'KitchenPeak',
    customerName: assoc.companyName,
    customerIdStr: assoc.customerIdStr,
    date: mockRiskDate(58),
    isMock: true,
  }
  const comboRecord: BuyerHistoryRecord = {
    id: 'mock-task-combo',
    orderNumber: 'SUB-TASK-COMBO-01',
    asin: 'B0MOCKCOMBO01',
    storeName: assoc.storeName,
    brandName: assoc.brandName,
    customerName: assoc.companyName,
    customerIdStr: assoc.customerIdStr,
    date: mockRiskDate(7),
    isMock: true,
  }

  const risks: BuyerHistoryRisk[] = status === 'pass'
    ? [
        {
          key: 'mock-task-pass-asin',
          title: '同买手重复 ASIN',
          status: 'pass',
          reason: `该买手未购买过任务 ASIN ${assoc.asin}。`,
          records: [],
        },
        {
          key: 'mock-task-pass-store',
          title: '同店铺历史限制',
          status: 'pass',
          reason: `该买手 3 个月内未购买过任务店铺「${assoc.storeName}」。`,
          records: [],
        },
        {
          key: 'mock-task-pass-brand',
          title: '同品牌 1 个月限制',
          status: 'pass',
          reason: `该买手 1 个月内未购买过任务品牌「${assoc.brandName}」。`,
          records: [],
        },
        {
          key: 'mock-task-pass-customer',
          title: '任务排重规则',
          status: 'pass',
          reason: '此任务开启了“全店排重”和“组织级排重”，未发现客户或公司主体历史命中，可下单。',
          records: [],
        },
      ]
    : [
        {
          key: 'mock-task-fail-asin',
          title: '同买手重复 ASIN',
          status: 'fail',
          reason: `该买手已购买过任务 ASIN ${assoc.asin}，不可下单。`,
          records: [sameAsinRecord],
        },
        {
          key: 'mock-task-fail-store',
          title: '同店铺历史限制',
          status: 'fail',
          reason: `3 个月内已购买过任务店铺「${assoc.storeName}」，不可下单。`,
          records: [sameStoreRecord],
        },
        {
          key: 'mock-task-fail-company',
          title: '同客户公司限制',
          status: 'fail',
          reason: '此任务开启了“组织级排重”，该买手已购买过当前公司主体下的订单，不可下单。',
          records: [companyRecord],
        },
        {
          key: 'mock-task-fail-combo',
          title: 'ASIN 组合购买风险',
          status: 'fail',
          reason: '该买手继续接此任务会形成高风险 ASIN 组合购买轨迹，不可下单。',
          records: [comboRecord],
          detailLines: [
            '组合：B0MOCKCOMBO01 + B0MOCKTASK01',
            '历史轨迹：该买手已购买组合内产品 B0MOCKCOMBO01',
            '本次任务：继续购买 B0MOCKTASK01 会形成相同组合购买轨迹。',
          ],
        },
      ]

  return {
    buyerName: 'Michael Brown',
    buyerInfo: {
      id: 'mock-buyer',
      name: 'Michael Brown',
      status: 'active',
      rating: 4.8,
      total_orders: 13,
    },
    items: [],
    asinAssociations: associations,
    buyerHistory: {
      total: status === 'fail' ? 4 : 0,
      risks,
      hasBlockingRisk: status === 'fail',
    },
    overallPass: status === 'pass',
    passCount: risks.filter(r => r.status === 'pass').length,
    failCount: risks.filter(r => r.status === 'fail').length,
    warnCount: 0,
    usingMock: true,
  }
}

function showTaskMockDemo(status: 'pass' | 'fail') {
  activeCheckMode.value = 'task'
  dimValues.task_id = mockModeTarget('task')
  buyerInput.value = 'Michael Brown'
  selectedBuyer.value = {
    id: 'mock-buyer',
    name: 'Michael Brown',
    status: 'active',
    rating: 4.8,
    total_orders: 13,
  }
  buyerSuggestions.value = []
  batchResults.value = []
  expandedBatch.value = []
  singleResult.value = buildTaskMockDemo(status)
}

function showSingleDimensionGroupDemo(status: 'pass' | 'fail') {
  activeCheckMode.value = selectedSingleDimensionMode.value
  showMockSingleDimensionDemo(status)
}

function showMockSingleDimensionDemo(status: 'pass' | 'fail' | 'enabled-pass' | 'disabled-pass') {
  const mode = activeCheckMode.value === 'full' ? 'asin' : activeCheckMode.value
  const target = mockModeTarget(mode)
  const associations = buildSingleDimensionMockAssociations(mode)
  activeCheckMode.value = mode
  dimValues[activeModeConfig.value.inputKey] = target
  buyerInput.value = 'Michael Brown'
  selectedBuyer.value = {
    id: 'mock-buyer',
    name: 'Michael Brown',
    status: 'active',
    rating: 4.8,
    total_orders: 13,
  }
  buyerSuggestions.value = []
  batchResults.value = []
  expandedBatch.value = []
  singleResult.value = buildSingleDimensionMockResult(mode, status, associations)
}

function activeCustomDemoDimensions() {
  const dims = visibleQueryDimensions.value.length > 0
    ? visibleQueryDimensions.value
    : queryDimensionOptions.filter(dim => dim.key === 'asin')
  return dims.map(dim => ({
    ...dim,
    mode: dim.mode as Exclude<CheckMode, 'full' | 'task' | 'multi'>,
  }))
}

function mockPartyId(mode: Exclude<CheckMode, 'full' | 'task' | 'multi'>, name: string) {
  return mockTargetsForMode(mode).find(item => item.name === name)?.id || ''
}

function subjectCheckLabel(mode: CheckMode, name: string, id = '') {
  if (mode !== 'customer' && mode !== 'company') return undefined
  const label = mode === 'customer' ? '客户' : '公司主体'
  return `${label}：${formatNamedId(name, id) || name}`
}

function buildMultiDimensionCustomDemo(status: 'pass' | 'fail'): CheckResult {
  const dims = activeCustomDemoDimensions()
  const subjects = dims.map(dim => {
    const name = mockModeTarget(dim.mode)
    const id = mockPartyId(dim.mode, name)
    return { dim, name, id }
  })
  const associations = subjects.flatMap(item => [buildAssociationForTarget(item.dim.mode, item.name, item.id)])
  const risks = subjects.map(item => buildSingleDimensionRisk(item.dim.mode, status, item.name, item.id))
  const blocking = risks.filter(risk => risk.status === 'fail' && !isHistoryLookupRisk(risk))
  return {
    buyerName: 'Michael Brown',
    buyerInfo: {
      id: 'mock-buyer',
      name: 'Michael Brown',
      status: 'active',
      rating: 4.8,
      total_orders: 13,
    },
    checkLabel: subjects.length === 1
      ? (subjectCheckLabel(subjects[0].dim.mode, subjects[0].name, subjects[0].id) || subjects[0].dim.label)
      : subjects.map(item => item.dim.label).join(' + '),
    items: [],
    asinAssociations: associations,
    buyerHistory: {
      total: risks.reduce((sum, risk) => sum + risk.records.length, 0),
      risks,
      hasBlockingRisk: blocking.length > 0,
    },
    overallPass: blocking.length === 0,
    passCount: risks.filter(risk => risk.status === 'pass').length,
    failCount: blocking.length,
    warnCount: 0,
    usingMock: true,
  }
}

function showMultiDimensionDemo(status: 'pass' | 'fail') {
  if (fullAutoLookup.value) {
    if (status === 'pass') showFullPassDemo()
    else showMockBlockingDemo()
    return
  }

  activeCheckMode.value = 'multi'
  buyerInput.value = 'Michael Brown'
  selectedBuyer.value = {
    id: 'mock-buyer',
    name: 'Michael Brown',
    status: 'active',
    rating: 4.8,
    total_orders: 13,
  }
  activeCustomDemoDimensions().forEach(dim => {
    dimValues[dim.key] = mockModeTarget(dim.mode)
  })
  buyerSuggestions.value = []
  batchResults.value = []
  expandedBatch.value = []
  singleResult.value = buildMultiDimensionCustomDemo(status)
}

function mockTargetsForMode(mode: Exclude<CheckMode, 'full' | 'task' | 'multi'>): Array<{ name: string, id: string }> {
  if (mode === 'asin') return ['B0MOCKMULTI01', 'B0MOCKMULTI02', 'B0MOCKMULTI03'].map(name => ({ name, id: '' }))
  if (mode === 'store') return ['FreshJoy Home', 'NorthPeak Store', 'UrbanLife Outlet'].map(name => ({ name, id: '' }))
  if (mode === 'brand') return ['FreshJoy', 'KitchenPeak', 'UrbanLife'].map(name => ({ name, id: '' }))
  if (mode === 'customer') {
    return [
      { name: 'Demo Trading LLC', id: 'ORG-DEMO' },
      { name: 'Bright Client Group', id: 'ORG-BRIGHT' },
      { name: 'NorthPeak Customer', id: 'ORG-NORTH' },
    ]
  }
  return [
    { name: 'Demo Trading Group', id: 'ORG-GROUP' },
    { name: 'Bright Holdings', id: 'ORG-BRIGHT-CO' },
    { name: 'NorthPeak Global', id: 'ORG-NORTH-CO' },
  ]
}

function buildAssociationForTarget(mode: Exclude<CheckMode, 'full' | 'task' | 'multi'>, target: string, targetId = '') {
  const association = buildManualAssociation(mode, target)
  if ((mode === 'customer' || mode === 'company') && targetId) {
    association.customerIdStr = targetId
  }
  return {
    ...association,
    key: `mock-multi-target|${mode}|${target}`,
    isMock: true,
  }
}

function showSingleBuyerMultiTargetDemo() {
  activeCheckMode.value = 'multi'
  fullAutoLookup.value = false
  buyerInput.value = 'Michael Brown'
  selectedBuyer.value = {
    id: 'mock-buyer',
    name: 'Michael Brown',
    status: 'active',
    rating: 4.8,
    total_orders: 13,
  }
  buyerSuggestions.value = []
  singleResult.value = null
  expandedBatch.value = []

  const dims = activeCustomDemoDimensions()
  batchResults.value = dims.flatMap(dim => {
    const targets = mockTargetsForMode(dim.mode)
    dimValues[dim.key] = targets.map(item => item.name).join('\n')
    return targets.map((item, index) => {
      const status = index % 2 === 0 ? 'fail' : 'pass'
      const associations = [buildAssociationForTarget(dim.mode, item.name, item.id)]
      return buildSingleDimensionMockResult(dim.mode, status, associations, {
        target: item.name,
        targetId: item.id,
        buyerName: 'Michael Brown',
        checkLabel: `${dim.label}：${formatNamedId(item.name, item.id)}`,
      })
    })
  })
}

function withMockBuyer(result: CheckResult, buyerName: string): CheckResult {
  return {
    ...result,
    buyerName,
    buyerInfo: result.buyerInfo
      ? {
          ...result.buyerInfo,
          id: `mock-${normalizeText(buyerName).replace(/\s+/g, '-')}`,
          name: buyerName,
        }
      : null,
  }
}

function showMockBatchDemo() {
  const mode = activeCheckMode.value
  buyerInput.value = 'Michael Brown, Emily Stone, James Wilson'
  selectedBuyer.value = null
  buyerSuggestions.value = []
  singleResult.value = null
  expandedBatch.value = []

  if (mode === 'task') {
    dimValues.task_id = mockModeTarget('task')
    batchResults.value = [
      withMockBuyer(buildTaskMockDemo('fail'), 'Michael Brown'),
      withMockBuyer(buildTaskMockDemo('pass'), 'Emily Stone'),
      withMockBuyer(buildTaskMockDemo('fail'), 'James Wilson'),
    ]
    return
  }

  if (mode !== 'full' && !(mode === 'multi' && fullAutoLookup.value)) {
    const firstDimKey = mode === 'multi' ? (selectedQueryDims.value[0] || 'asin') : activeModeConfig.value.inputKey
    const singleMode = (dimensionOptionByKey(firstDimKey)?.mode || selectedSingleDimensionMode.value) as Exclude<CheckMode, 'full' | 'task' | 'multi'>
    const target = mockModeTarget(singleMode)
    const associations = buildSingleDimensionMockAssociations(singleMode)
    activeCheckMode.value = 'multi'
    fullAutoLookup.value = false
    dimValues[firstDimKey] = target
    batchResults.value = [
      withMockBuyer(buildSingleDimensionMockResult(singleMode, 'fail', associations), 'Michael Brown'),
      withMockBuyer(buildSingleDimensionMockResult(singleMode, 'pass', associations), 'Emily Stone'),
      withMockBuyer(buildSingleDimensionMockResult(singleMode, 'fail', associations), 'James Wilson'),
    ]
    return
  }

  const asin = 'B0MOCKBATCH01'
  const associations = buildMockAssociations(asin)
  activeCheckMode.value = 'multi'
  fullAutoLookup.value = true
  dimValues.asin = asin
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
  activeCheckMode.value = 'multi'
  fullAutoLookup.value = true
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

function buildFullPassDemo(): CheckResult {
  const asin = 'B0MOCKPASS01'
  const buyerName = 'Michael Brown'
  const associations = buildMockAssociations(asin)
  const assoc = associations[0]
  const risks: BuyerHistoryRisk[] = [
    {
      key: 'mock-full-pass-asin',
      title: '同买手重复 ASIN',
      status: 'pass',
      reason: `该买手未购买过 ASIN ${asin}，可下单。`,
      records: [],
    },
    {
      key: 'mock-full-pass-store',
      title: '同店铺历史限制',
      status: 'pass',
      reason: `该买手 3 个月内未购买过店铺「${assoc.storeName}」，可下单。`,
      records: [],
    },
    {
      key: 'mock-full-pass-brand',
      title: '同品牌 1 个月限制',
      status: 'pass',
      reason: `该买手 1 个月内未购买过品牌「${assoc.brandName}」的 ASIN，可下单。`,
      records: [],
    },
    {
      key: 'mock-full-customer-history',
      title: '客户/公司历史查询',
      status: 'pass',
      reason: '未发现客户或公司主体历史购买记录；如需最终排重结论，请使用任务校验。',
      records: [],
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
      total: 0,
      risks,
      hasBlockingRisk: false,
    },
    overallPass: true,
    passCount: risks.length,
    failCount: 0,
    warnCount: 0,
    usingMock: true,
  }
}

function showFullPassDemo() {
  activeCheckMode.value = 'multi'
  fullAutoLookup.value = true
  buyerInput.value = 'Michael Brown'
  dimValues.asin = 'B0MOCKPASS01'
  selectedBuyer.value = {
    id: 'mock-buyer',
    name: 'Michael Brown',
    status: 'active',
    rating: 4.8,
    total_orders: 13,
  }
  buyerSuggestions.value = []
  batchResults.value = []
  expandedBatch.value = []
  singleResult.value = buildFullPassDemo()
}

async function fetchBuyerAsinHistory(
  buyerInfo: BuyerInfo | null,
  asin: string,
  associations: AsinAssociation[],
  options: ScopeOptions,
  mode: CheckMode = 'full',
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
  const shouldCheckAsin = Boolean(currentAsin) && (mode === 'full' || mode === 'task' || mode === 'asin')
  const shouldCheckStore = currentStores.size > 0 && (mode === 'full' || mode === 'task' || mode === 'store')
  const shouldCheckBrand = currentBrands.size > 0 && (mode === 'full' || mode === 'task' || mode === 'brand')
  const shouldCheckCustomer = mode === 'customer' || (mode === 'task' && options.sameCustomerOtherStores) || (mode === 'full' && options.sameCustomerOtherStores)
  const shouldCheckCompany = mode === 'company' || (mode === 'task' && options.sameCompanyAllStores) || (mode === 'full' && options.sameCompanyAllStores)

  if (shouldCheckAsin) {
    const sameAsinRecords = currentAsin
      ? historyRecords.filter(r => normalizeAsin(r.asin) === currentAsin)
      : []

    risks.push({
      key: 'same-asin',
      title: '同买手重复 ASIN',
      status: sameAsinRecords.length > 0 ? 'fail' : 'pass',
      reason: sameAsinRecords.length > 0
        ? `该买手已购买过当前 ASIN。`
        : `该买手未购买过 ASIN ${currentAsin}，可继续校验下单。`,
      records: sameAsinRecords,
    })
  }

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
  if (shouldCheckStore) {
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
          : '该买手 3 个月内未购买过此店铺，可下单。',
      records: sameStoreRecords,
    })
  }

  const sameBrandRecords = currentBrands.size
    ? historyRecords.filter(r => currentBrands.has(normalizeText(r.brandName)) && isWithinLastMonths(r.date, 1))
    : []
  const currentBrandLabel = associations.find(a => a.brandName && !isGeneralBrand(a.brandName))?.brandName || ''
  if (shouldCheckBrand) {
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
  }

  const sameCustomerRecords = historyRecords.filter(r => matchesCurrentCustomer(r, associations))
  const otherStoreCustomerRecords = sameCustomerRecords.filter(r => !currentStores.has(normalizeText(r.storeName)))
  if (
    mode === 'task'
    && !options.sameCustomerOtherStores
    && !options.sameCompanyAllStores
    && (associations[0]?.companyName || associations[0]?.customerIdStr)
  ) {
    risks.push({
      key: 'task-dedupe-disabled',
      title: '任务排重规则',
      status: 'pass',
      reason: '此任务未开启“全店排重”和“组织级排重”，可下单。',
      records: [],
    })
  } else if (mode === 'task' && !options.sameCustomerOtherStores && (associations[0]?.companyName || associations[0]?.customerIdStr)) {
    risks.push({
      key: 'task-customer-dedupe-disabled',
      title: '同客户其他店铺限制',
      status: 'pass',
      reason: '此任务未开启“全店排重”，可下单。',
      records: [],
    })
  } else if (mode === 'customer') {
    const customerLabel = associations[0]?.companyName || associations[0]?.customerIdStr || '当前客户'
    risks.push({
      key: 'customer-history-query',
      title: '客户历史查询',
      status: 'pass',
      reason: sameCustomerRecords.length > 0
        ? `该买手有购买过客户「${customerLabel}」下的历史订单，是否拦截需结合任务规则判断。`
        : `未发现该买手购买过客户「${customerLabel}」下的历史订单。`,
      records: sameCustomerRecords,
    })
  } else if (shouldCheckCustomer) {
    risks.push({
      key: 'same-customer-other-stores',
      title: '同客户其他店铺限制',
      status: otherStoreCustomerRecords.length > 0 ? 'fail' : 'pass',
      reason: otherStoreCustomerRecords.length > 0
        ? '此任务开启了“全店排重”，该买手已购买过当前客户下其他店铺，不可下单。'
        : '此任务开启了“全店排重”，未发现该买手命中其他店铺历史，可下单。',
      records: otherStoreCustomerRecords,
    })
  }

  if (
    mode === 'task'
    && !options.sameCompanyAllStores
    && options.sameCustomerOtherStores
    && (associations[0]?.companyName || associations[0]?.customerIdStr)
  ) {
    risks.push({
      key: 'task-company-dedupe-disabled',
      title: '同客户公司限制',
      status: 'pass',
      reason: '此任务未开启“组织级排重”，可下单。',
      records: [],
    })
  } else if (mode === 'company') {
    const companyLabel = associations[0]?.companyName || associations[0]?.customerIdStr || '当前公司主体'
    risks.push({
      key: 'company-history-query',
      title: '客户公司历史查询',
      status: 'pass',
      reason: sameCustomerRecords.length > 0
        ? `该买手有购买过公司主体「${companyLabel}」下的历史订单，是否拦截需结合任务规则判断。`
        : `未发现该买手购买过公司主体「${companyLabel}」下的历史订单。`,
      records: sameCustomerRecords,
    })
  } else if (shouldCheckCompany) {
    risks.push({
      key: 'same-company-all-stores',
      title: '同客户公司限制',
      status: sameCustomerRecords.length > 0 ? 'fail' : 'pass',
      reason: sameCustomerRecords.length > 0
        ? '此任务开启了“组织级排重”，该买手已购买过当前公司主体下的订单，不可下单。'
        : '此任务开启了“组织级排重”，未发现该买手命中公司主体历史，可下单。',
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

function isSampleToken(value: string) {
  const text = value.trim()
  return text.startsWith('B0SAMPLE') || text.startsWith('TASK-SAMPLE') || text.startsWith('示例')
}

function sampleTokensInContext(context: CheckContext) {
  return [
    context.asin || '',
    ...(context.targetOverrides?.task_id || []),
    ...(context.targetOverrides?.asin || []),
    ...(context.targetOverrides?.store || []),
    ...(context.targetOverrides?.brand || []),
    ...(context.targetOverrides?.client_company || []),
  ].map(value => String(value || '').trim()).filter(Boolean)
}

function sampleStatusFor(value: string, buyerName: string): 'pass' | 'fail' {
  if (value.includes('混合') || value.includes('MIX')) return /emily stone/i.test(buyerName) ? 'pass' : 'fail'
  if (value.includes('无记录') || value.includes('PASS') || value.includes('通过')) return 'pass'
  if (value.includes('有记录') || value.includes('FAIL') || value.includes('拦截')) return 'fail'
  return 'pass'
}

function samplePartyId(name: string) {
  const ids: Record<string, string> = {
    '示例客户-无记录': 'ORG-SAMPLE-NONE',
    '示例客户-有记录': 'ORG-SAMPLE-HIT',
    '示例客户-混合': 'ORG-SAMPLE-MIX',
    '示例客户-A有记录': 'ORG-SAMPLE-A',
    '示例客户-B无记录': 'ORG-SAMPLE-B',
    '示例客户-C有记录': 'ORG-SAMPLE-C',
    '示例公司-无记录': 'ORG-CO-NONE',
    '示例公司-有记录': 'ORG-CO-HIT',
    '示例公司-混合': 'ORG-CO-MIX',
    '示例公司-A有记录': 'ORG-CO-A',
    '示例公司-B无记录': 'ORG-CO-B',
    '示例公司-C有记录': 'ORG-CO-C',
  }
  return ids[name] || ''
}

function sampleBuyerId(buyerName: string) {
  const ids: Record<string, string> = {
    'michael brown': 'MB-001',
    'emily stone': 'ES-002',
    'james wilson': 'JW-003',
  }
  return ids[buyerName.trim().toLowerCase()] || 'SAMPLE'
}

function buildComboSampleResult(token: string): CheckResult {
  const associations = buildMockAssociations(token)
  associations[0].asin = token
  return {
    buyerName: 'James Wilson',
    buyerInfo: {
      id: 'JW-003',
      name: 'James Wilson',
      status: 'active',
      rating: 4.8,
      total_orders: 13,
    },
    checkLabel: `全选：${token}`,
    items: [],
    asinAssociations: associations,
    buyerHistory: {
      total: 4,
      risks: [{
        key: 'mock-asin-combo',
        title: 'ASIN 组合购买风险',
        status: 'fail',
        reason: '买手 A、买手 B 已购买该组合，当前买手不能购买。',
        records: [],
        detailLines: [
          '组合：B0SAMPLE-P1 + B0SAMPLE-P2',
          '买手 A：已购买 B0SAMPLE-P1、B0SAMPLE-P2',
          '买手 B：已购买 B0SAMPLE-P1、B0SAMPLE-P2',
          '当前买手：不能再购买 B0SAMPLE-P2',
        ],
      }],
      hasBlockingRisk: true,
    },
    overallPass: false,
    passCount: 0,
    failCount: 1,
    warnCount: 0,
    usingMock: true,
  }
}

function buildSampleResult(buyerName: string, context: CheckContext): CheckResult | null {
  const token = sampleTokensInContext(context).find(isSampleToken)
  if (!token) return null
  const status = sampleStatusFor(token, buyerName)
  const mode = context.mode || 'asin'
  let result: CheckResult
  if (token.includes('COMBO')) {
    result = buildComboSampleResult(token)
  } else if (mode === 'task' || token.startsWith('TASK-SAMPLE')) {
    result = buildTaskMockDemo(status)
    result.checkLabel = `任务：${token}`
  } else if (mode === 'full' || token.includes('FULL')) {
    result = status === 'pass' ? buildFullPassDemo() : buildMockBlockingDemo()
    result.checkLabel = `全选：${token}`
  } else {
    const dimMode = (mode === 'multi' ? 'asin' : mode) as Exclude<CheckMode, 'full' | 'task' | 'multi'>
    const partyId = samplePartyId(token)
    const label = dimMode === 'customer' ? '客户' : dimMode === 'company' ? '公司主体' : dimMode === 'store' ? '店铺' : dimMode === 'brand' ? '品牌' : 'ASIN'
    result = buildSingleDimensionMockResult(dimMode, status, [buildAssociationForTarget(dimMode, token, partyId)], {
      target: token,
      targetId: partyId,
      buyerName,
      checkLabel: `${label}：${formatNamedId(token, partyId) || token}`,
    })
  }
  const named = withMockBuyer(result, buyerName)
  if (named.buyerInfo) named.buyerInfo = { ...named.buyerInfo, id: sampleBuyerId(buyerName) }
  return named
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function downloadCheckSheet() {
  const headers = ['编号', '场景', '怎么查', '买手', '要勾选的维度', 'ASIN', '店铺', '品牌', '客户', '公司主体', '任务号', '右边应看到']
  const rows = [
    ['1', '单买手，一个 ASIN，通过', '多维查询', 'Michael Brown', 'ASIN', 'B0SAMPLE-PASS', '', '', '', '', '', '一张卡，结论通过。不要再出现第二个通过数字，也不要出现任务上下文'],
    ['2', '单买手，一个 ASIN，拦截', '多维查询', 'Michael Brown', 'ASIN', 'B0SAMPLE-FAIL', '', '', '', '', '', '一张卡，结论拦截'],
    ['3', '单买手，一个店铺，通过', '多维查询', 'Michael Brown', '店铺', '', '示例店铺-通过', '', '', '', '', '一张卡，结论通过'],
    ['4', '单买手，一个店铺，拦截', '多维查询', 'Michael Brown', '店铺', '', '示例店铺-拦截', '', '', '', '', '一张卡，结论拦截'],
    ['5', '单买手，一个品牌，通过', '多维查询', 'Michael Brown', '品牌', '', '', '示例品牌-通过', '', '', '', '一张卡，结论通过'],
    ['6', '单买手，一个品牌，拦截', '多维查询', 'Michael Brown', '品牌', '', '', '示例品牌-拦截', '', '', '', '一张卡，结论拦截'],
    ['7', '单买手，一个客户，无记录', '多维查询', 'Michael Brown', '客户', '', '', '', '示例客户-无记录', '', '', '绿色无购买记录，客户后面带 ID：ORG-SAMPLE-NONE'],
    ['8', '单买手，一个客户，有记录', '多维查询', 'Michael Brown', '客户', '', '', '', '示例客户-有记录', '', '', '红色有购买记录，客户后面带 ID：ORG-SAMPLE-HIT'],
    ['9', '单买手，一个公司，无记录', '多维查询', 'Michael Brown', '公司主体', '', '', '', '', '示例公司-无记录', '', '绿色无购买记录，公司后面带 ID：ORG-CO-NONE'],
    ['10', '单买手，一个公司，有记录', '多维查询', 'Michael Brown', '公司主体', '', '', '', '', '示例公司-有记录', '', '红色有购买记录，公司后面带 ID：ORG-CO-HIT'],
    ['11', '单买手，多个 ASIN', '多维查询', 'Michael Brown', 'ASIN', 'B0SAMPLE-A-FAIL\nB0SAMPLE-B-PASS\nB0SAMPLE-C-FAIL', '', '', '', '', '', '买手只在顶部出现一次。三行分别是拦截、通过、拦截'],
    ['12', '单买手，多个店铺', '多维查询', 'Michael Brown', '店铺', '', '示例店铺-A拦截\n示例店铺-B通过\n示例店铺-C拦截', '', '', '', '', '三行：拦截、通过、拦截'],
    ['13', '单买手，多个品牌', '多维查询', 'Michael Brown', '品牌', '', '', '示例品牌-A拦截\n示例品牌-B通过\n示例品牌-C拦截', '', '', '', '三行：拦截、通过、拦截'],
    ['14', '单买手，多个客户', '多维查询', 'Michael Brown', '客户', '', '', '', '示例客户-A有记录\n示例客户-B无记录\n示例客户-C有记录', '', '', '三行都带客户 ID。有记录为红色，无记录为绿色'],
    ['15', '单买手，多个公司', '多维查询', 'Michael Brown', '公司主体', '', '', '', '', '示例公司-A有记录\n示例公司-B无记录\n示例公司-C有记录', '', '三行都带公司 ID。有记录为红色，无记录为绿色'],
    ['16', '单买手，ASIN 加店铺，都拦截', '多维查询', 'Michael Brown', 'ASIN 和店铺', 'B0SAMPLE-FAIL', '示例店铺-拦截', '', '', '', '', '右边两行，一行 ASIN、一行店铺，都是拦截。不要出现品牌或客户'],
    ['17', '单买手，ASIN 加店铺，都通过', '多维查询', 'Michael Brown', 'ASIN 和店铺', 'B0SAMPLE-PASS', '示例店铺-通过', '', '', '', '', '右边两行，都是通过'],
    ['18', '单买手，ASIN 和店铺都有多个', '多维查询', 'Michael Brown', 'ASIN 和店铺', 'B0SAMPLE-A-FAIL\nB0SAMPLE-B-PASS\nB0SAMPLE-C-FAIL', '示例店铺-A拦截\n示例店铺-B通过\n示例店铺-C拦截', '', '', '', '', '右边 6 行。买手只在顶部出现一次'],
    ['19', '全选，一个 ASIN，通过', '勾选全选快捷', 'Michael Brown', '全选', 'B0SAMPLE-FULL-PASS', '', '', '', '', '', '只填了 ASIN，右边要带出店铺、品牌、客户、公司。客户和公司只表示没有购买记录'],
    ['20', '全选，一个 ASIN，拦截', '勾选全选快捷', 'Michael Brown', '全选', 'B0SAMPLE-FULL-FAIL', '', '', '', '', '', '店铺、品牌可以拦截。客户和公司仍然只表示有没有购买记录'],
    ['21', '单买手，一个任务，通过', '任务校验', 'Michael Brown', '任务', '', '', '', '', '', 'TASK-SAMPLE-PASS', '一张卡，结论通过。这里才会看任务排重'],
    ['22', '单买手，一个任务，拦截', '任务校验', 'Michael Brown', '任务', '', '', '', '', '', 'TASK-SAMPLE-FAIL', '一张卡，结论拦截'],
    ['23', '多个买手，一个 ASIN', '多维查询', 'Michael Brown, Emily Stone, James Wilson', 'ASIN', 'B0SAMPLE-MIX', '', '', '', '', '', '三行都显示买手。Michael 拦截，Emily 通过，James 拦截'],
    ['24', '多个买手，一个店铺', '多维查询', 'Michael Brown, Emily Stone, James Wilson', '店铺', '', '示例店铺-混合', '', '', '', '', '三行。Emily 通过，另外两人拦截'],
    ['25', '多个买手，一个品牌', '多维查询', 'Michael Brown, Emily Stone, James Wilson', '品牌', '', '', '示例品牌-混合', '', '', '', '三行。Emily 通过，另外两人拦截'],
    ['26', '多个买手，一个客户', '多维查询', 'Michael Brown, Emily Stone, James Wilson', '客户', '', '', '', '示例客户-混合', '', '', 'Emily 是绿色无购买记录，另外两人是红色有购买记录'],
    ['27', '多个买手，一个公司', '多维查询', 'Michael Brown, Emily Stone, James Wilson', '公司主体', '', '', '', '', '示例公司-混合', '', 'Emily 是绿色无购买记录，另外两人是红色有购买记录'],
    ['28', '多个买手，一个任务', '任务校验', 'Michael Brown, Emily Stone, James Wilson', '任务', '', '', '', '', '', 'TASK-SAMPLE-MIX', '三行。Emily 通过，另外两人拦截'],
    ['29', '多个买手，全选一个 ASIN', '勾选全选快捷', 'Michael Brown, Emily Stone, James Wilson', '全选', 'B0SAMPLE-FULL-MIX', '', '', '', '', '', '三个买手对同一个 ASIN，并带出店铺、品牌、客户、公司'],
    ['30', '多个买手，多个 ASIN', '多维查询', 'Michael Brown, Emily Stone, James Wilson', 'ASIN', 'B0SAMPLE-A-FAIL\nB0SAMPLE-B-PASS\nB0SAMPLE-C-FAIL', '', '', '', '', '', '9 行：每个买手各对应 3 个 ASIN，分别是拦截、通过、拦截'],
    ['31', '多个买手，同时查 ASIN 和店铺', '多维查询', 'Michael Brown, Emily Stone, James Wilson', 'ASIN 和店铺', 'B0SAMPLE-A-FAIL\nB0SAMPLE-B-PASS', '示例店铺-A拦截\n示例店铺-B通过', '', '', '', '', '每个买手都有 ASIN 和店铺两行，一共 12 行'],
    ['32', '多个买手，全选多个 ASIN', '勾选全选快捷', 'Michael Brown, Emily Stone, James Wilson', '全选', 'B0SAMPLE-FULL-A-FAIL\nB0SAMPLE-FULL-B-PASS', '', '', '', '', '', '每个买手两个 ASIN，每个 ASIN 都带出店铺、品牌、客户、公司'],
    ['33', 'ASIN 组合，A 和 B 已买，C 不能买', '勾选全选快捷', 'James Wilson', '全选', 'B0SAMPLE-COMBO', '', '', '', '', '', '拦截。买手 A、买手 B 已购买组合 B0SAMPLE-P1 + B0SAMPLE-P2，当前买手不能再买'],
  ]
  const csv = `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = '买手校验检查表.csv'
  link.click()
  URL.revokeObjectURL(url)
}

async function checkOneBuyer(
  buyerName: string,
  context: CheckContext = {},
  buyerOverride: BuyerInfo | null = null,
): Promise<CheckResult> {
  const sampleResult = buildSampleResult(buyerName, context)
  if (sampleResult) return sampleResult
  const buyerInfo = buyerOverride || await fetchBuyerInfo(buyerName)
  const resolvedBuyerName = buyerInfo?.name || buyerName
  const items: DimResult[] = []
  const associations = context.associations || []

  for (const dimKey of context.dimKeys || selectedDims.value) {
    const targets = buildDimensionTargets(dimKey, associations, context.targetOverrides)
    const targetValue = targets.join(' / ')
    const rules = await fetchRestrictionRules(resolvedBuyerName, dimKey, targets)
    const hasDeny = rules.some(r => r.rule_type === 'deny')
    let status: 'pass' | 'fail' | 'warn' = 'pass'
    if (hasDeny) status = 'fail'
    else if (buyerInfo && !isBuyerActive(buyerInfo.status)) status = 'warn'

    items.push({ dimension: dimKey, targetValue, status, rules })
  }

  if (!context.asin && associations.length === 0) {
    return { ...emptyCheckResult(resolvedBuyerName, buyerInfo, items), checkLabel: context.checkLabel }
  }

  const buyerHistory = await fetchBuyerAsinHistory(
    buyerInfo,
    context.asin || '',
    associations,
    context.scope || scopeOptions,
    context.mode || 'full',
  )
  const riskFailCount = buyerHistory.risks.filter(r => r.status === 'fail').length
  const riskWarnCount = buyerHistory.risks.filter(r => r.status === 'warn').length
  const riskPassCount = buyerHistory.risks.filter(r => r.status === 'pass').length
  const failCount = items.filter(i => i.status === 'fail').length + riskFailCount
  const warnCount = items.filter(i => i.status === 'warn').length + riskWarnCount
  const passCount = items.filter(i => i.status === 'pass').length + riskPassCount

  return {
    buyerName: resolvedBuyerName,
    buyerInfo,
    checkLabel: context.checkLabel,
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
  if (!canRunCheck.value) return
  buyerSuggestions.value = []
  checking.value = true
  batchResults.value = []
  expandedBatch.value = []
  try {
    const contexts = await buildCheckContextsForCurrent()
    if (contexts.length === 0) return
    if (buyerNames.value.length === 1 && contexts.length === 1) {
      singleResult.value = await checkOneBuyer(buyerNames.value[0], contexts[0], selectedBuyer.value)
      return
    }
    singleResult.value = null
    for (const buyerName of buyerNames.value) {
      const buyerOverride = buyerNames.value.length === 1 ? selectedBuyer.value : null
      for (const context of contexts) {
        batchResults.value.push(await checkOneBuyer(buyerName, context, buyerOverride))
      }
    }
  } finally {
    checking.value = false
  }
}

async function runBatchCheck() {
  if (!canRunBatchCheck.value) return
  batchChecking.value = true
  singleResult.value = null
  batchResults.value = []
  expandedBatch.value = []
  try {
    const contexts = await buildCheckContextsForCurrent()
    if (contexts.length === 0) return
    for (const name of batchNames.value) {
      for (const context of contexts) {
        batchResults.value.push(await checkOneBuyer(name, context))
      }
    }
  } finally {
    batchChecking.value = false
  }
}

function primaryAssociationText(result: CheckResult) {
  const assoc = result.asinAssociations[0]
  if (!assoc) return '未找到 ASIN 关联信息'
  return `${assoc.asin} / ${assoc.storeName || '未知店铺'} / ${assoc.brandName || '未知品牌'} / ${assoc.companyName || assoc.customerIdStr || '未知客户'}`
}

function contextItems(result: CheckResult) {
  const assoc = result.asinAssociations[0]
  if (!assoc) return []
  const customerValue = assoc.companyName || assoc.customerIdStr
  return [
    { label: 'ASIN', value: assoc.asin },
    { label: '店铺', value: assoc.storeName },
    { label: '品牌', value: assoc.brandName },
    { label: '客户', value: customerValue },
  ].filter(item => item.value && item.value !== '—')
}

function contextCardTitle(result: CheckResult) {
  if ((result.checkLabel || '').startsWith('任务') || isTaskDemoResult(result)) return '任务里的商品'
  return '带出的信息'
}

function showContextCard(result: CheckResult) {
  return contextItems(result).length > 1
}

function countedRisks(result: CheckResult) {
  return result.buyerHistory.risks.filter(risk => !isHistoryLookupRisk(risk))
}

function showHeroCounts(result: CheckResult) {
  const risks = countedRisks(result)
  return risks.some(risk => risk.status === 'pass') && risks.some(risk => risk.status === 'fail')
}

function heroPassCount(result: CheckResult) {
  return countedRisks(result).filter(risk => risk.status === 'pass').length
}

function heroFailCount(result: CheckResult) {
  return countedRisks(result).filter(risk => risk.status === 'fail').length
}

function isSingleDimensionDemoResult(result: CheckResult) {
  return result.usingMock
    && result.buyerHistory.risks.length === 1
    && contextItems(result).length <= 1
}

function primaryResultReason(result: CheckResult) {
  if (isHistoryOnlyResult(result)) return ''
  if (isTaskDemoResult(result)) {
    return result.overallPass
      ? '此任务的 ASIN、店铺、品牌和已开启排重规则均未命中，可下单。'
      : `此任务命中 ${blockingRisks(result).length} 个拦截维度，不可下单。`
  }
  if (isFullCheckResult(result)) {
    return result.overallPass
      ? '综合排查未命中 ASIN、店铺、品牌等拦截维度；客户/公司主体仅展示历史记录，最终排重请使用任务校验。'
      : `综合排查命中 ${blockingRisks(result).length} 个拦截维度；客户/公司主体仅展示历史记录，不在此处直接拦截。`
  }
  const risks = result.buyerHistory.risks
  if (result.overallPass) return risks.find(risk => risk.status === 'pass')?.reason || '未命中拦截规则。'
  return blockingRisks(result)[0]?.reason || '命中拦截规则。'
}

function isFullCheckResult(result: CheckResult) {
  const isFullDemo = result.usingMock && result.buyerHistory.risks.some(risk => risk.key.startsWith('mock-full-') || risk.key === 'mock-same-asin')
  return (isFullDemo || result.checkLabel?.startsWith('全选'))
    && !isTaskDemoResult(result)
    && !isHistoryOnlyResult(result)
    && !isSingleDimensionDemoResult(result)
    && contextItems(result).some(item => item.label === 'ASIN')
}

function isHistoryLookupRisk(risk: BuyerHistoryRisk) {
  return [
    'customer-history-query',
    'company-history-query',
    'mock-single-customer',
    'mock-single-company',
    'mock-full-customer-history',
    'mock-full-company-history',
  ].includes(risk.key)
}

function isHistoryOnlyResult(result: CheckResult) {
  return result.buyerHistory.risks.length === 1
    && isHistoryLookupRisk(result.buyerHistory.risks[0])
}

function hasHistoryRecords(result: CheckResult) {
  return result.buyerHistory.risks.some(risk => risk.records.length > 0)
}

function resultHeroClass(result: CheckResult) {
  if (isHistoryOnlyResult(result)) return hasHistoryRecords(result) ? 'hero-fail' : 'hero-pass'
  return result.overallPass ? 'hero-pass' : 'hero-fail'
}

function heroBadgeClass(result: CheckResult) {
  if (isHistoryOnlyResult(result)) return hasHistoryRecords(result) ? 'badge-fail' : 'badge-pass'
  return result.overallPass ? 'badge-pass' : 'badge-fail'
}

function batchCardTone(result: CheckResult) {
  if (isHistoryOnlyResult(result)) return hasHistoryRecords(result) ? 'fail' : 'pass'
  return result.overallPass ? 'pass' : 'fail'
}

function showBatchRiskChips(result: CheckResult) {
  return visibleRisks(result).length > 1
}

function showRiskStatusBadge(result: CheckResult, risk: BuyerHistoryRisk) {
  return !isSingleDimensionDemoResult(result) && !isHistoryLookupRisk(risk)
}

function heroStatusText(result: CheckResult) {
  if (isHistoryOnlyResult(result)) return hasHistoryRecords(result) ? '有购买记录' : '无购买记录'
  return result.overallPass ? '通过' : '拦截'
}

function riskBadgeText(risk: BuyerHistoryRisk) {
  if (isHistoryLookupRisk(risk)) return risk.records.length > 0 ? '有记录' : '无记录'
  return risk.status === 'fail' ? '拦截' : '通过'
}

function riskVisualStatus(risk: BuyerHistoryRisk) {
  if (isHistoryLookupRisk(risk) && risk.records.length > 0) return 'fail'
  return risk.status
}

function canExpandBatchResult(result: CheckResult) {
  return !result.overallPass || (isHistoryOnlyResult(result) && hasHistoryRecords(result))
}

function isTaskDemoResult(result: CheckResult) {
  return result.usingMock && result.buyerHistory.risks.some(risk => risk.key.startsWith('mock-task-'))
}

function blockingRisks(result: CheckResult) {
  return result.buyerHistory.risks.filter(r => r.status === 'fail')
}

function detailRisks(result: CheckResult) {
  const blocking = blockingRisks(result)
  if (blocking.length) {
    const historyLookups = result.buyerHistory.risks.filter(risk => isHistoryLookupRisk(risk))
    return [...blocking, ...historyLookups]
  }
  return result.buyerHistory.risks.filter(risk => risk.records.length > 0)
}

function detailSectionTitle(result: CheckResult) {
  return blockingRisks(result).length > 0 ? '拦截明细' : '历史记录'
}

function detailSectionSubtitle(result: CheckResult) {
  if (isHistoryOnlyResult(result)) return ''
  return blockingRisks(result).length > 0
    ? '按维度展示具体原因和历史订单'
    : '仅展示历史购买事实，是否拦截需结合任务规则判断'
}

function visibleRisks(result: CheckResult) {
  const blocking = blockingRisks(result)
  if (blocking.length) {
    const historyLookups = result.buyerHistory.risks.filter(risk => isHistoryLookupRisk(risk))
    return [...blocking, ...historyLookups]
  }
  return result.buyerHistory.risks
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

.buyer-input-wrap :deep(textarea::placeholder) {
  color: #9ca3af;
}

.buyer-input-error {
  margin-top: 6px;
  color: #dc2626;
  font-size: 12px;
  line-height: 1.45;
}

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
.suggestion-name { font-size: 13px; font-weight: 600; color: #1e293b; word-break: break-all; }
.suggestion-meta { font-size: 11px; color: #94a3b8; }

.suggestion-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
  &.active { background: #dcfce7; color: #16a34a; }
  &.inactive { background: #fef3c7; color: #d97706; }
  &.blacklist { background: #fef2f2; color: #dc2626; }
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
.profile-name { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px; word-break: break-all; }
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

.check-mode-panel {
  margin-bottom: 18px;
}

.check-mode-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.check-mode-group {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}

.check-mode-group-title {
  margin-bottom: 8px;
  color: #1a1a2e;
  font-size: 12px;
  font-weight: 900;
}

.check-mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  &.cols-1 {
    grid-template-columns: 1fr;
  }
  &.cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  &.cols-5 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.check-mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 66px;
  padding: 10px 6px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  color: #6b7280;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all .18s ease;
  .anticon {
    font-size: 17px;
    color: #9ca3af;
  }
  &:hover {
    color: #2563eb;
    border-color: rgba(37, 99, 235, .35);
    background: #eff6ff;
    .anticon { color: #2563eb; }
  }
  &.active {
    color: #2563eb;
    border-color: rgba(37, 99, 235, .55);
    background: rgba(37, 99, 235, .08);
    box-shadow: 0 6px 18px rgba(37, 99, 235, .12);
    .anticon { color: #2563eb; }
  }
}

.mode-demo-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.common-demo-row {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.multi-query-panel {
  margin-bottom: 18px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f8fafc;
}

.multi-query-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.multi-dim-selector {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.multi-dim-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  color: #6b7280;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all .18s ease;
  &:hover,
  &.active {
    color: #2563eb;
    border-color: rgba(37, 99, 235, .45);
    background: rgba(37, 99, 235, .08);
  }
}

.multi-input-grid {
  display: grid;
  gap: 12px;
}

.compact-field {
  margin-bottom: 0;
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

.demo-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 10px;
}

.single-dim-demo-btn {
  height: 40px;
  border-radius: 10px;
  color: #2563eb;
  border-color: rgba(37, 99, 235, .35);
  background: rgba(37, 99, 235, .06);
  font-weight: 700;
  &:hover {
    color: #1d4ed8;
    border-color: #2563eb;
    background: rgba(37, 99, 235, .1);
  }
}

.single-dim-demo-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.single-dim-demo-btn.pass {
  color: #059669;
  border-color: rgba(5, 150, 105, .35);
  background: rgba(5, 150, 105, .06);
  &:hover {
    color: #047857;
    border-color: #059669;
    background: rgba(5, 150, 105, .1);
  }
}

.single-dim-demo-btn.fail {
  color: #dc2626;
  border-color: rgba(220, 38, 38, .35);
  background: rgba(220, 38, 38, .06);
  &:hover {
    color: #b91c1c;
    border-color: #dc2626;
    background: rgba(220, 38, 38, .1);
  }
}

.single-dim-demo-btn.neutral {
  color: #2563eb;
  border-color: rgba(37, 99, 235, .35);
  background: rgba(37, 99, 235, .06);
  &:hover {
    color: #1d4ed8;
    border-color: #2563eb;
    background: rgba(37, 99, 235, .1);
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
  &.hero-neutral {
    background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
    border-color: rgba(37, 99, 235, .22);
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

.hero-name { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 6px; word-break: break-all; }
.hero-check-label {
  display: inline-flex;
  max-width: 100%;
  margin-bottom: 8px;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(37, 99, 235, .08);
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  word-break: break-all;
}
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
  &.badge-neutral { background: #dbeafe; color: #2563eb; }
}

.hero-counts {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  font-size: 12px;
  font-weight: 600;
}

.hero-reason {
  max-width: 360px;
  margin-top: 4px;
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
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

.right-batch-results {
  min-height: 400px;
}

.batch-buyer-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f8fafc;
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
  &.compact {
    gap: 6px;
  }
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

.single-buyer-target-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
}

.single-buyer-target-card .brc-target-main {
  flex: 1;
}

.single-buyer-target-card .brc-dims.is-empty {
  display: none;
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
.brc-name { font-size: 14px; font-weight: 700; color: #1e293b; word-break: break-all; }
.brc-target-main {
  min-width: 0;
}
.brc-check-label {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 800;
  color: #2563eb;
  word-break: break-all;
}
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

.single-buyer-target-card .brc-detail {
  grid-column: 1 / -1;
  padding-left: 0;
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
