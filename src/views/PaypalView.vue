<template>
  <div class="page-content">
    <div class="page-header">
      <h1 class="page-title">PayPal</h1>
      <a-space>
        <a-button @click="openSingle">
          <PlusOutlined /> 新增账号
        </a-button>
        <a-button type="primary" @click="importOpen = true">
          <ImportOutlined /> 批量导入
        </a-button>
      </a-space>
    </div>

    <!-- 顶部统计 -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-val">{{ stats.total }}</div>
        <div class="kpi-label">账号总数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val green">{{ stats.active }}</div>
        <div class="kpi-label">正常使用</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val orange">{{ stats.limited }}</div>
        <div class="kpi-label">受限</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val red">{{ stats.closed }}</div>
        <div class="kpi-label">已挂掉</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val blue">{{ stats.avg_life_days }} 天</div>
        <div class="kpi-label">平均存货天数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val red">{{ stats.total_refunded.toFixed(2) }}</div>
        <div class="kpi-label">累计退款 USD</div>
      </div>
    </div>

    <!-- 主表格 -->
    <div class="card-panel">
      <div class="toolbar">
        <a-input-search
          v-model:value="search"
          placeholder="搜索邮箱 / 持有人"
          style="width:260px"
          allow-clear
          @search="loadAccounts"
          @change="onSearchChange"
        />
        <a-select v-model:value="filterStatus" style="width:110px" allow-clear placeholder="状态" @change="loadAccounts">
          <a-select-option value="正常">正常</a-select-option>
          <a-select-option value="受限">受限</a-select-option>
          <a-select-option value="已关闭">已关闭</a-select-option>
        </a-select>
        <a-select v-model:value="filterBatch" style="width:180px" allow-clear placeholder="导入批次" @change="loadAccounts">
          <a-select-option v-for="b in batchOptions" :key="b" :value="b">{{ b }}</a-select-option>
        </a-select>
      </div>

      <a-table
        :columns="columns"
        :data-source="accounts"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="pagination"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'email'">
            <div class="email-cell">
              <span class="email-text">{{ record.email }}</span>
              <a-tag v-if="record.import_batch" class="batch-mini">{{ record.import_batch }}</a-tag>
            </div>
          </template>
          <template v-if="column.key === 'owner'">
            <div>{{ record.owner_name || '-' }}</div>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColor[record.status] || 'default'">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'refund'">
            <div class="refund-cell">
              <span class="refund-usd">${{ Number(record.total_refunded_usd || 0).toFixed(2) }}</span>
              <span class="refund-cnt">{{ record.refund_count || 0 }} 次</span>
            </div>
          </template>
          <template v-if="column.key === 'life_days'">
            <LifeDaysCell :started-at="record.started_at" :died-at="record.died_at" />
          </template>
          <template v-if="column.key === 'notes'">
            <span class="notes-preview">{{ record.notes || '-' }}</span>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-popconfirm title="确定删除此账号?" @confirm="deleteAccount(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 详情抽屉 -->
    <a-drawer
      v-model:open="detailOpen"
      :title="`账号详情 — ${activeRecord?.email}`"
      width="560"
      placement="right"
    >
      <template v-if="activeRecord">
        <div class="detail-section">
          <div class="section-title">基本信息</div>
          <div class="detail-grid">
            <DetailRow label="持有人" :value="activeRecord.owner_name" />
            <DetailRow label="邮箱" :value="activeRecord.email" />
            <DetailRow label="密码" sensitive :value="activeRecord.password" />
            <DetailRow label="二步验证码" sensitive :value="activeRecord.totp_secret" />
            <DetailRow label="状态">
              <a-tag :color="statusColor[activeRecord.status]">{{ activeRecord.status }}</a-tag>
            </DetailRow>
          </div>
        </div>

        <div class="detail-section">
          <div class="section-title">服务器 / 代理</div>
          <div class="detail-grid">
            <DetailRow label="服务器 IP" sensitive :value="activeRecord.server_ip" />
            <DetailRow label="服务器账号" :value="activeRecord.server_username" />
            <DetailRow label="服务器密码" sensitive :value="activeRecord.server_password" />
          </div>
        </div>

        <div class="detail-section">
          <div class="section-title">绑定银行卡</div>
          <div class="detail-grid">
            <DetailRow label="银行名称" :value="activeRecord.bank_name" />
            <DetailRow label="持卡人" :value="activeRecord.bank_card_holder" />
            <DetailRow label="卡号" sensitive :value="activeRecord.bank_card_number" />
          </div>
        </div>

        <div class="detail-section">
          <div class="section-title">使用记录</div>
          <div class="detail-grid">
            <DetailRow label="累计退款" :value="`$${Number(activeRecord.total_refunded_usd || 0).toFixed(2)}`" />
            <DetailRow label="退款次数" :value="`${activeRecord.refund_count || 0} 次`" />
            <DetailRow label="开始使用" :value="activeRecord.started_at || '-'" />
            <DetailRow v-if="activeRecord.status === '已关闭'" label="挂掉日期" :value="activeRecord.died_at || '-'" />
            <DetailRow label="存货天数">
              <LifeDaysCell :started-at="activeRecord.started_at" :died-at="activeRecord.died_at" show-text />
            </DetailRow>
          </div>
        </div>

        <div class="detail-section" v-if="activeRecord.notes">
          <div class="section-title">备注</div>
          <div class="notes-text">{{ activeRecord.notes }}</div>
        </div>

        <div class="detail-section">
          <div class="section-title">导入批次</div>
          <span v-if="activeRecord.import_batch" class="batch-tag">{{ activeRecord.import_batch }}</span>
          <span v-else class="text-muted">未分配批次</span>
        </div>
      </template>
    </a-drawer>

    <!-- 新增/编辑 Modal -->
    <a-modal
      v-model:open="formOpen"
      :title="editingId ? '编辑PayPal账号' : '新增PayPal账号'"
      @ok="handleSave"
      :confirm-loading="saving"
      width="640px"
      ok-text="保存"
    >
      <a-form layout="vertical" :model="form">
        <div class="form-section-title">基本信息</div>
        <a-row :gutter="12">
          <a-col :span="12"><a-form-item label="持有人"><a-input v-model:value="form.owner_name" /></a-form-item></a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="form.status" style="width:100%">
                <a-select-option value="正常">正常</a-select-option>
                <a-select-option value="受限">受限</a-select-option>
                <a-select-option value="已关闭">已关闭</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12"><a-form-item label="邮箱" required><a-input v-model:value="form.email" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="密码"><a-input-password v-model:value="form.password" /></a-form-item></a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="24"><a-form-item label="二步验证码 (TOTP)"><a-input v-model:value="form.totp_secret" placeholder="TOTP密钥或备用验证码" /></a-form-item></a-col>
        </a-row>

        <div class="form-section-title">服务器 / 代理</div>
        <a-row :gutter="12">
          <a-col :span="12"><a-form-item label="服务器 IP"><a-input v-model:value="form.server_ip" placeholder="如：192.168.1.1" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="服务器账号"><a-input v-model:value="form.server_username" /></a-form-item></a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12"><a-form-item label="服务器密码"><a-input-password v-model:value="form.server_password" /></a-form-item></a-col>
        </a-row>

        <div class="form-section-title">绑定银行卡</div>
        <a-row :gutter="12">
          <a-col :span="12"><a-form-item label="银行名称"><a-input v-model:value="form.bank_name" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="持卡人姓名"><a-input v-model:value="form.bank_card_holder" /></a-form-item></a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12"><a-form-item label="银行卡号"><a-input v-model:value="form.bank_card_number" placeholder="卡号" /></a-form-item></a-col>
        </a-row>

        <div class="form-section-title">使用记录</div>
        <a-row :gutter="12">
          <a-col :span="12"><a-form-item label="累计退款 (USD)"><a-input-number v-model:value="form.total_refunded_usd" :min="0" :precision="2" style="width:100%" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="退款次数"><a-input-number v-model:value="form.refund_count" :min="0" style="width:100%" /></a-form-item></a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="开始使用日期">
              <a-date-picker v-model:value="form.started_at_day" style="width:100%" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="挂掉日期">
              <a-date-picker v-model:value="form.died_at_day" style="width:100%" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注"><a-textarea v-model:value="form.notes" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 批量导入 Modal -->
    <a-modal
      v-model:open="importOpen"
      title="批量导入 PayPal 账号"
      @ok="handleImport"
      :confirm-loading="importing"
      width="700px"
      ok-text="确认导入"
    >
      <a-alert type="info" style="margin-bottom:14px" show-icon>
        <template #message>
          每行一条记录，字段用英文逗号分隔，顺序：<br />
          <code>持有人, 邮箱, 密码, 服务器IP, 服务器账号, 服务器密码, 银行名称, 持卡人, 卡号, 开始日期(YYYY-MM-DD)</code>
        </template>
      </a-alert>
      <a-form layout="vertical">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="导入批次号（选填，留空自动生成）">
              <a-input v-model:value="importForm.batch" placeholder="如：PP-20260308-001" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="默认状态">
              <a-select v-model:value="importForm.status" style="width:100%">
                <a-select-option value="正常">正常</a-select-option>
                <a-select-option value="受限">受限</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="账号数据">
          <a-textarea v-model:value="importForm.text" :rows="10" placeholder="张三,zhang@gmail.com,Pass123!,1.2.3.4,admin,serverPass,招商银行,张三,6222***1234,2026-01-01" />
        </a-form-item>
        <div class="import-preview" v-if="importLines > 0">
          预计导入 <strong>{{ importLines }}</strong> 条账号
          <template v-if="!importForm.batch"> — 批次号将自动生成</template>
          <template v-else> — 批次号：<span class="batch-tag">{{ importForm.batch }}</span></template>
        </div>
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

// ── LifeDaysCell ──────────────────────────────────────────────────────────
const LifeDaysCell = defineComponent({
  props: { startedAt: String, diedAt: String, showText: Boolean },
  setup(props) {
    return () => {
      const s = props.startedAt
      if (!s) return h('span', { class: 'text-muted' }, '-')
      const start = dayjs(s)
      const end = props.diedAt ? dayjs(props.diedAt) : dayjs()
      const days = end.diff(start, 'day')
      const color = days >= 90 ? '#52c41a' : days >= 30 ? '#faad14' : '#ff4d4f'
      const suffix = props.diedAt ? '天（已结束）' : '天（使用中）'
      return h('span', { style: `color:${color};font-weight:600` }, `${days} ${props.showText ? suffix : '天'}`)
    }
  },
})

// ── DetailRow ─────────────────────────────────────────────────────────────
const DetailRow = defineComponent({
  props: { label: String, value: String, sensitive: Boolean },
  setup(props: { label?: string; value?: string; sensitive?: boolean }, { slots }: { slots: any }) {
    const revealed = ref(false)
    function mask(v: string) {
      if (!v) return '-'
      if (v.length <= 4) return '****'
      return v.slice(0, 2) + '****' + v.slice(-2)
    }
    async function copy() {
      if (!props.value) return
      try { await navigator.clipboard.writeText(props.value); message.success('已复制') } catch { message.error('复制失败') }
    }
    return () => {
      const hasSlot = !!slots.default
      return h('div', { class: 'detail-row' }, [
        h('div', { class: 'detail-row-label' }, props.label),
        h('div', { class: 'detail-row-val' }, [
          hasSlot
            ? slots.default!()
            : props.sensitive
              ? [
                  h('span', { class: 'mono-val' }, revealed.value ? props.value : mask(props.value || '')),
                  h('a', { onClick: () => (revealed.value = !revealed.value), class: 'icon-btn' }, [revealed.value ? h(EyeInvisibleOutlined) : h(EyeOutlined)]),
                  h('a', { onClick: copy, class: 'icon-btn' }, [h(CopyOutlined)]),
                ]
              : h('span', {}, props.value || '-'),
        ]),
      ])
    }
  },
})

// ── State ─────────────────────────────────────────────────────────────────
const loading = ref(false)
const saving = ref(false)
const importing = ref(false)

const accounts = ref<any[]>([])
const batchOptions = ref<string[]>([])
const pagination = ref({ current: 1, pageSize: 20, total: 0 })

const search = ref('')
const filterStatus = ref('')
const filterBatch = ref('')

const detailOpen = ref(false)
const formOpen = ref(false)
const importOpen = ref(false)
const editingId = ref('')
const activeRecord = ref<any>(null)

const defaultForm = () => ({
  owner_name: '', email: '', password: '', totp_secret: '',
  server_ip: '', server_username: '', server_password: '',
  bank_name: '', bank_card_holder: '', bank_card_number: '',
  total_refunded_usd: 0, refund_count: 0,
  started_at_day: '', died_at_day: '',
  status: '正常', notes: '',
})
const form = reactive(defaultForm())

const importForm = reactive({ batch: '', status: '正常', text: '' })
const importLines = computed(() => importForm.text.split('\n').filter(l => l.trim()).length)

// ── Stats ─────────────────────────────────────────────────────────────────
const stats = reactive({ total: 0, active: 0, limited: 0, closed: 0, avg_life_days: 0, total_refunded: 0 })

async function loadStats() {
  const { data } = await supabase.from('paypal_accounts').select('status, total_refunded_usd, started_at, died_at')
  if (!data) return
  let lifeDaysSum = 0, lifeDaysCount = 0
  stats.total = data.length
  stats.active = data.filter(d => d.status === '正常').length
  stats.limited = data.filter(d => d.status === '受限').length
  stats.closed = data.filter(d => d.status === '已关闭').length
  stats.total_refunded = data.reduce((s, d) => s + Number(d.total_refunded_usd || 0), 0)
  for (const d of data) {
    if (!d.started_at) continue
    const days = dayjs(d.died_at || undefined).diff(dayjs(d.started_at), 'day')
    if (days > 0) { lifeDaysSum += days; lifeDaysCount++ }
  }
  stats.avg_life_days = lifeDaysCount > 0 ? Math.round(lifeDaysSum / lifeDaysCount) : 0
}

// ── Batch options ─────────────────────────────────────────────────────────
async function loadBatchOptions() {
  const { data } = await supabase.from('paypal_accounts').select('import_batch').not('import_batch', 'is', null).not('import_batch', 'eq', '')
  const set = new Set((data || []).map((d: any) => d.import_batch as string).filter(Boolean))
  batchOptions.value = Array.from(set).sort().reverse()
}

// ── Accounts ──────────────────────────────────────────────────────────────
async function loadAccounts() {
  loading.value = true
  try {
    let q = supabase.from('paypal_accounts')
      .select('id,email,owner_name,status,total_refunded_usd,refund_count,started_at,died_at,import_batch,server_ip,bank_name,notes', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (search.value) q = q.or(`email.ilike.%${search.value}%,owner_name.ilike.%${search.value}%`)
    if (filterStatus.value) q = q.eq('status', filterStatus.value)
    if (filterBatch.value) q = q.eq('import_batch', filterBatch.value)
    const from = (pagination.value.current - 1) * pagination.value.pageSize
    q = q.range(from, from + pagination.value.pageSize - 1)
    const { data, count, error } = await q
    if (error) throw error
    accounts.value = data || []
    pagination.value.total = count || 0
  } finally { loading.value = false }
}

function onSearchChange() { if (!search.value) loadAccounts() }
function handleTableChange(pag: any) { pagination.value.current = pag.current; loadAccounts() }

// ── Detail ────────────────────────────────────────────────────────────────
async function openDetail(record: any) {
  const { data } = await supabase.from('paypal_accounts').select('*').eq('id', record.id).maybeSingle()
  activeRecord.value = data
  detailOpen.value = true
}

// ── Form ──────────────────────────────────────────────────────────────────
function openSingle() {
  editingId.value = ''
  Object.assign(form, defaultForm())
  formOpen.value = true
}

function openEdit(record: any) {
  editingId.value = record.id
  supabase.from('paypal_accounts').select('*').eq('id', record.id).maybeSingle().then(({ data }) => {
    if (!data) return
    Object.assign(form, {
      owner_name: data.owner_name || '',
      email: data.email || '',
      password: data.password || '',
      totp_secret: data.totp_secret || '',
      server_ip: data.server_ip || '',
      server_username: data.server_username || '',
      server_password: data.server_password || '',
      bank_name: data.bank_name || '',
      bank_card_holder: data.bank_card_holder || '',
      bank_card_number: data.bank_card_number || '',
      total_refunded_usd: data.total_refunded_usd || 0,
      refund_count: data.refund_count || 0,
      started_at_day: data.started_at || '',
      died_at_day: data.died_at || '',
      status: data.status || '正常',
      notes: data.notes || '',
    })
    formOpen.value = true
  })
}

async function handleSave() {
  if (!form.email) { message.warning('请输入邮箱'); return }
  saving.value = true
  const payload: any = {
    owner_name: form.owner_name,
    email: form.email, password: form.password, totp_secret: form.totp_secret,
    server_ip: form.server_ip, server_username: form.server_username, server_password: form.server_password,
    bank_name: form.bank_name, bank_card_holder: form.bank_card_holder, bank_card_number: form.bank_card_number,
    total_refunded_usd: form.total_refunded_usd, refund_count: form.refund_count,
    started_at: form.started_at_day || null, died_at: form.died_at_day || null,
    status: form.status, notes: form.notes,
  }
  try {
    if (editingId.value) {
      const { error } = await supabase.from('paypal_accounts').update(payload).eq('id', editingId.value)
      if (error) throw error
      message.success('更新成功')
    } else {
      const { error } = await supabase.from('paypal_accounts').insert([payload])
      if (error) throw error
      message.success('添加成功')
    }
    formOpen.value = false
    loadAccounts(); loadStats()
  } catch (e: any) { message.error('操作失败：' + e.message) }
  finally { saving.value = false }
}

async function deleteAccount(id: string) {
  const { error } = await supabase.from('paypal_accounts').delete().eq('id', id)
  if (error) { message.error('删除失败'); return }
  message.success('已删除')
  loadAccounts(); loadStats()
}

// ── Bulk import ───────────────────────────────────────────────────────────
async function handleImport() {
  const lines = importForm.text.split('\n').filter(l => l.trim())
  if (!lines.length) { message.warning('请输入账号数据'); return }
  importing.value = true
  try {
    const batchNo = importForm.batch.trim() || `PP-${dayjs().format('YYYYMMDD')}-${String(Date.now()).slice(-4)}`
    const rows = lines.map(line => {
      const parts = line.split(',').map(s => s.trim())
      return {
        owner_name: parts[0] || '',
        email: parts[1] || '',
        password: parts[2] || '',
        server_ip: parts[3] || '',
        server_username: parts[4] || '',
        server_password: parts[5] || '',
        bank_name: parts[6] || '',
        bank_card_holder: parts[7] || '',
        bank_card_number: parts[8] || '',
        started_at: parts[9] || null,
        status: importForm.status,
        import_batch: batchNo,
        total_refunded_usd: 0,
        refund_count: 0,
      }
    })
    const { error } = await supabase.from('paypal_accounts').insert(rows)
    if (error) throw error
    message.success(`成功导入 ${rows.length} 条，批次号：${batchNo}`)
    importOpen.value = false
    importForm.text = ''; importForm.batch = ''
    loadAccounts(); loadStats(); loadBatchOptions()
  } catch (e: any) { message.error('导入失败：' + e.message) }
  finally { importing.value = false }
}

// ── Constants ─────────────────────────────────────────────────────────────
const statusColor: Record<string, string> = { '正常': 'green', '受限': 'orange', '已关闭': 'red' }

const columns = [
  { title: '邮箱 / 批次', key: 'email', width: 220 },
  { title: '持有人', key: 'owner', width: 130 },
  { title: '状态', key: 'status', width: 90 },
  { title: '服务器 IP', dataIndex: 'server_ip', key: 'server_ip', width: 130 },
  { title: '绑定银行', dataIndex: 'bank_name', key: 'bank_name', width: 110 },
  { title: '累计退款', key: 'refund', width: 130 },
  { title: '存货天数', key: 'life_days', width: 110 },
  { title: '开始使用', dataIndex: 'started_at', key: 'started_at', width: 100 },
  { title: '备注', key: 'notes', width: 140 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' as const },
]

onMounted(() => { loadAccounts(); loadStats(); loadBatchOptions() })
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }

.kpi-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 20px; }
.kpi-card { background: #fff; border-radius: 10px; padding: 16px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.kpi-val { font-size: 22px; font-weight: 700; color: #1677ff; line-height: 1.2; }
.kpi-val.green { color: #52c41a; }
.kpi-val.orange { color: #fa8c16; }
.kpi-val.red { color: #ff4d4f; }
.kpi-val.blue { color: #1677ff; }
.kpi-label { font-size: 12px; color: #999; margin-top: 4px; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }

.email-cell { display: flex; flex-direction: column; gap: 2px; }
.email-text { font-size: 13px; color: #333; }
.batch-mini { font-size: 10px; background: #e6f4ff; color: #1677ff; border: 1px solid #91caff; border-radius: 3px; padding: 0 4px; width: fit-content; font-family: monospace; }
.sub-text { font-size: 11px; color: #999; }
.refund-cell { display: flex; flex-direction: column; }
.refund-usd { font-weight: 600; color: #ff4d4f; font-size: 13px; }
.refund-cnt { font-size: 11px; color: #999; }

.detail-section { margin-bottom: 20px; border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden; }
.section-title { font-size: 13px; font-weight: 600; color: #555; background: #fafafa; padding: 8px 14px; border-bottom: 1px solid #f0f0f0; }
.detail-grid { padding: 8px 14px; }
.detail-row { display: flex; padding: 6px 0; border-bottom: 1px solid #f8f8f8; align-items: center; }
.detail-row:last-child { border-bottom: none; }
.detail-row-label { width: 90px; font-size: 12px; color: #999; flex-shrink: 0; }
.detail-row-val { flex: 1; font-size: 13px; color: #333; display: flex; align-items: center; gap: 6px; }
.mono-val { font-family: monospace; font-size: 12px; }
.icon-btn { color: #bbb; cursor: pointer; padding: 0 2px; }
.icon-btn:hover { color: #666; }
.notes-text { padding: 10px 14px; font-size: 13px; color: #555; line-height: 1.6; }

.form-section-title { font-size: 12px; font-weight: 600; color: #666; background: #fafafa; border-left: 3px solid #1677ff; padding: 4px 10px; margin: 12px 0 10px; border-radius: 0 4px 4px 0; }

.batch-tag { background: #e6f4ff; color: #1677ff; border: 1px solid #91caff; border-radius: 4px; padding: 1px 8px; font-size: 12px; font-family: monospace; }
.import-preview { background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 6px; padding: 8px 12px; font-size: 13px; color: #389e0d; }
.text-muted { color: #bbb; }
.notes-preview { font-size: 12px; color: #666; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
</style>
