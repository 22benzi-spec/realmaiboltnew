<template>
  <div class="page-content">
    <div class="page-header">
      <h1 class="page-title">买手规则管理</h1>
      <a-button type="primary" @click="openAdd">+ 新增规则</a-button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <a-input
        v-model:value="searchKeyword"
        placeholder="搜索买手/目标值/原因..."
        style="width:240px"
        allow-clear
        @input="filterRules"
      />
      <a-select v-model:value="filterDim" style="width:140px" allow-clear placeholder="维度" @change="filterRules">
        <a-select-option value="">全部维度</a-select-option>
        <a-select-option v-for="d in dimensions" :key="d.key" :value="d.key">{{ d.label }}</a-select-option>
      </a-select>
      <a-select v-model:value="filterType" style="width:120px" allow-clear placeholder="规则类型" @change="filterRules">
        <a-select-option value="">全部类型</a-select-option>
        <a-select-option value="deny">黑名单</a-select-option>
        <a-select-option value="allow">白名单</a-select-option>
      </a-select>
      <span class="total-hint">共 {{ filtered.length }} 条规则</span>
    </div>

    <!-- 规则列表 -->
    <div class="rules-table">
      <div class="table-header">
        <span class="col-buyer">买手</span>
        <span class="col-dim">维度</span>
        <span class="col-target">目标值</span>
        <span class="col-type">类型</span>
        <span class="col-reason">原因</span>
        <span class="col-status">状态</span>
        <span class="col-op">操作</span>
      </div>

      <div v-if="loading" class="loading-wrap"><a-spin /></div>

      <div v-else-if="filtered.length === 0" class="empty-wrap">
        <a-empty description="暂无规则" />
      </div>

      <div v-else>
        <div
          v-for="rule in filtered"
          :key="rule.id"
          :class="['table-row', rule.rule_type]"
        >
          <span class="col-buyer">
            <span class="buyer-chip">{{ rule.buyer_name }}</span>
          </span>
          <span class="col-dim">
            <span class="dim-badge">
              <span class="dim-icon-sm">{{ getDimIcon(rule.dimension) }}</span>
              {{ getDimLabel(rule.dimension) }}
            </span>
          </span>
          <span class="col-target mono">{{ rule.target_value }}</span>
          <span class="col-type">
            <span :class="['type-badge', rule.rule_type]">
              {{ rule.rule_type === 'deny' ? '黑名单' : '白名单' }}
            </span>
          </span>
          <span class="col-reason">{{ rule.reason || '-' }}</span>
          <span class="col-status">
            <a-switch
              :checked="rule.is_active"
              size="small"
              @change="(v: boolean) => toggleActive(rule, v)"
            />
          </span>
          <span class="col-op">
            <a-button size="small" type="link" @click="openEdit(rule)">编辑</a-button>
            <a-popconfirm title="确认删除该规则？" @confirm="deleteRule(rule.id)">
              <a-button size="small" type="link" danger>删除</a-button>
            </a-popconfirm>
          </span>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingId ? '编辑规则' : '新增规则'"
      @ok="saveRule"
      :confirm-loading="saving"
      ok-text="保存"
      cancel-text="取消"
      width="520px"
    >
      <div class="form-item">
        <label>规则类型</label>
        <a-radio-group v-model:value="form.rule_type">
          <a-radio-button value="deny">黑名单（禁止）</a-radio-button>
          <a-radio-button value="allow">白名单（优先）</a-radio-button>
        </a-radio-group>
      </div>
      <div class="form-item">
        <label>买手姓名 <span class="required">*</span></label>
        <div class="buyer-input-wrap">
          <a-input
            v-model:value="form.buyer_name"
            placeholder="输入买手姓名"
            @input="onModalBuyerInput"
          />
          <div v-if="modalSuggestions.length > 0" class="buyer-dropdown">
            <div
              v-for="s in modalSuggestions"
              :key="s.id"
              class="buyer-suggestion-item"
              @click="selectModalBuyer(s)"
            >
              <span class="s-name">{{ s.name }}</span>
              <span class="s-stats">{{ s.total_orders }}单</span>
            </div>
          </div>
        </div>
      </div>
      <div class="form-item">
        <label>校验维度 <span class="required">*</span></label>
        <a-select v-model:value="form.dimension" style="width:100%" placeholder="选择维度">
          <a-select-option v-for="d in dimensions" :key="d.key" :value="d.key">
            {{ d.label }}
          </a-select-option>
        </a-select>
      </div>
      <div class="form-item">
        <label>目标值 <span class="required">*</span></label>
        <a-input v-model:value="form.target_value" :placeholder="getPlaceholder(form.dimension)" />
      </div>
      <div class="form-item">
        <label>原因说明</label>
        <a-textarea v-model:value="form.reason" :rows="3" placeholder="填写规则原因，方便后续追溯" />
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { message } from 'ant-design-vue'

interface Rule {
  id: string
  rule_type: string
  dimension: string
  buyer_name: string
  target_value: string
  reason: string
  is_active: boolean
  created_at: string
}

const dimensions = [
  { key: 'asin', label: 'ASIN', icon: 'A', placeholder: '如 B0GM5UVWX4' },
  { key: 'store', label: '店铺', icon: '店', placeholder: '如 星辰旗舰店' },
  { key: 'brand', label: '品牌', icon: '牌', placeholder: '如 优品居家' },
  { key: 'client_contact', label: '客户联系人', icon: '人', placeholder: '如 李经理' },
  { key: 'client_company', label: '客户公司', icon: '司', placeholder: '如 深圳科技有限公司' },
]

const rules = ref<Rule[]>([])
const filtered = ref<Rule[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const filterDim = ref('')
const filterType = ref('')

const modalVisible = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)

const form = reactive({
  rule_type: 'deny',
  buyer_name: '',
  dimension: 'store',
  target_value: '',
  reason: '',
})

const modalSuggestions = ref<{ id: string; name: string; total_orders: number }[]>([])
let modalTimer: ReturnType<typeof setTimeout> | null = null

onMounted(loadRules)

async function loadRules() {
  loading.value = true
  const { data } = await supabase
    .from('buyer_restrictions')
    .select('*')
    .order('created_at', { ascending: false })
  rules.value = (data || []) as Rule[]
  filterRules()
  loading.value = false
}

function filterRules() {
  let list = [...rules.value]
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(r =>
      r.buyer_name.toLowerCase().includes(kw) ||
      r.target_value.toLowerCase().includes(kw) ||
      (r.reason || '').toLowerCase().includes(kw)
    )
  }
  if (filterDim.value) list = list.filter(r => r.dimension === filterDim.value)
  if (filterType.value) list = list.filter(r => r.rule_type === filterType.value)
  filtered.value = list
}

function openAdd() {
  editingId.value = null
  Object.assign(form, { rule_type: 'deny', buyer_name: '', dimension: 'store', target_value: '', reason: '' })
  modalVisible.value = true
}

function openEdit(rule: Rule) {
  editingId.value = rule.id
  Object.assign(form, {
    rule_type: rule.rule_type,
    buyer_name: rule.buyer_name,
    dimension: rule.dimension,
    target_value: rule.target_value,
    reason: rule.reason,
  })
  modalVisible.value = true
}

async function saveRule() {
  if (!form.buyer_name.trim() || !form.target_value.trim()) {
    message.warning('买手姓名和目标值不能为空')
    return
  }
  saving.value = true
  if (editingId.value) {
    await supabase.from('buyer_restrictions').update({
      rule_type: form.rule_type,
      buyer_name: form.buyer_name,
      dimension: form.dimension,
      target_value: form.target_value,
      reason: form.reason,
      updated_at: new Date().toISOString(),
    }).eq('id', editingId.value)
    message.success('规则已更新')
  } else {
    await supabase.from('buyer_restrictions').insert({
      rule_type: form.rule_type,
      buyer_name: form.buyer_name,
      dimension: form.dimension,
      target_value: form.target_value,
      reason: form.reason,
    })
    message.success('规则已添加')
  }
  saving.value = false
  modalVisible.value = false
  loadRules()
}

async function deleteRule(id: string) {
  await supabase.from('buyer_restrictions').delete().eq('id', id)
  message.success('已删除')
  loadRules()
}

async function toggleActive(rule: Rule, val: boolean) {
  await supabase.from('buyer_restrictions').update({ is_active: val }).eq('id', rule.id)
  rule.is_active = val
}

function onModalBuyerInput() {
  if (modalTimer) clearTimeout(modalTimer)
  if (!form.buyer_name.trim()) { modalSuggestions.value = []; return }
  modalTimer = setTimeout(async () => {
    const { data } = await supabase
      .from('buyers')
      .select('id, name, total_orders')
      .ilike('name', `%${form.buyer_name.trim()}%`)
      .limit(6)
    modalSuggestions.value = (data || []) as { id: string; name: string; total_orders: number }[]
  }, 300)
}

function selectModalBuyer(b: { name: string }) {
  form.buyer_name = b.name
  modalSuggestions.value = []
}

function getDimIcon(dim: string) {
  return dimensions.find(d => d.key === dim)?.icon || '?'
}

function getDimLabel(dim: string) {
  return dimensions.find(d => d.key === dim)?.label || dim
}

function getPlaceholder(dim: string) {
  return dimensions.find(d => d.key === dim)?.placeholder || '输入目标值'
}
</script>

<style scoped lang="less">
.page-content {
  padding: 24px;
  background: #f5f6fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #111;
  margin: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  background: #fff;
  padding: 12px 16px;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
}

.total-hint { margin-left: auto; font-size: 12px; color: #888; }

.rules-table {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 100px 100px 160px 90px 1fr 70px 100px;
  padding: 10px 16px;
  background: #f8f9fb;
  font-size: 12px;
  color: #888;
  font-weight: 600;
  border-bottom: 1px solid #f0f0f0;
}

.table-row {
  display: grid;
  grid-template-columns: 100px 100px 160px 90px 1fr 70px 100px;
  padding: 12px 16px;
  align-items: center;
  border-bottom: 1px solid #f5f5f5;
  font-size: 13px;
  transition: background .15s;

  &:hover { background: #fafbff; }
  &:last-child { border-bottom: none; }
  &.deny { border-left: 3px solid #fca5a5; }
  &.allow { border-left: 3px solid #86efac; }
}

.buyer-chip {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.dim-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #555;
}

.dim-icon-sm {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: #dbeafe;
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mono { font-family: monospace; font-size: 12px; color: #333; }

.type-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  &.deny { background: #fef2f2; color: #dc2626; }
  &.allow { background: #f0fdf4; color: #16a34a; }
}

.loading-wrap, .empty-wrap {
  padding: 40px;
  text-align: center;
}

.form-item {
  margin-bottom: 16px;
  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: #444;
    margin-bottom: 6px;
  }
  .required { color: #dc2626; }
}

.buyer-input-wrap { position: relative; }

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
}

.buyer-suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  &:hover { background: #f5f7ff; }
}

.s-name { font-weight: 600; flex: 1; }
.s-stats { color: #888; font-size: 12px; }
</style>
