<template>
  <div class="page-content">
    <div class="page-header">
      <h1 class="page-title">客户库</h1>
      <div class="header-actions">
        <a-input-search v-model:value="searchText" placeholder="搜索公司名/品牌/ASIN" style="width:240px" allow-clear @search="load" />
        <a-select v-model:value="filterLevel" style="width:100px" @change="load" allow-clear placeholder="等级">
          <a-select-option v-for="l in ['S','A','B','C']" :key="l" :value="l">{{ l }}级</a-select-option>
        </a-select>
        <a-select v-model:value="filterStatus" style="width:100px" @change="load" allow-clear placeholder="状态">
          <a-select-option value="活跃">活跃</a-select-option>
          <a-select-option value="暂停">暂停</a-select-option>
          <a-select-option value="流失">流失</a-select-option>
        </a-select>
        <a-button @click="load"><ReloadOutlined /></a-button>
        <a-button type="primary" @click="openAddModal"><PlusOutlined /> 添加客户</a-button>
      </div>
    </div>

    <div v-if="loading" class="loading-wrap"><a-spin size="large" /></div>
    <div v-else-if="clients.length === 0" class="empty-wrap"><a-empty description="暂无客户数据" /></div>

    <div v-else class="client-list">
      <div v-for="company in clients" :key="company.id" class="client-card">
        <!-- 左侧：组织信息 -->
        <div class="card-org">
          <div class="org-avatar" :style="{ background: levelBg[company.level || 'C'] }">
            {{ (company.company_name || '?').charAt(0) }}
          </div>
          <div class="org-info">
            <div class="org-name" @click="openDetail(company)">{{ company.company_name }}</div>
            <div class="org-ids">
              <span class="id-badge">{{ company.org_id || '—' }}</span>
              <a-tag :color="levelColor[company.level || 'C']" style="margin:0;font-size:11px">{{ company.level || 'C' }}级</a-tag>
              <a-tag :color="statusColor[company.status || '活跃']" style="margin:0;font-size:11px">{{ company.status || '活跃' }}</a-tag>
            </div>
            <div v-if="company.brand_names?.length" class="org-brands">
              <TagOutlined style="font-size:11px;color:#9ca3af" />
              <span class="brand-text">{{ company.brand_names.slice(0, 3).join('  /  ') }}{{ company.brand_names.length > 3 ? ' ...' : '' }}</span>
            </div>
          </div>
        </div>

        <div class="card-sep" />

        <!-- ASIN 区域 -->
        <div class="card-asins">
          <div class="section-label">ASIN</div>
          <div v-if="company.client_asins?.length" class="asin-list">
            <span v-for="asin in company.client_asins.slice(0, 4)" :key="asin" class="asin-tag">{{ asin }}</span>
            <span v-if="company.client_asins.length > 4" class="asin-more">+{{ company.client_asins.length - 4 }}</span>
          </div>
          <span v-else class="empty-val">暂未录入</span>
        </div>

        <div class="card-sep" />

        <!-- 统计数据 -->
        <div class="card-stats">
          <div class="stat-block">
            <div class="stat-num blue">{{ company.total_order_count || 0 }}</div>
            <div class="stat-lbl">累计下单</div>
          </div>
          <div class="stat-sep" />
          <div class="stat-block">
            <div class="stat-num green">¥{{ formatMoney(company.total_order_amount_cny) }}</div>
            <div class="stat-lbl">累计金额</div>
          </div>
          <div class="stat-sep" />
          <div class="stat-block">
            <div class="stat-num orange">{{ company.monthly_order_count || 0 }}</div>
            <div class="stat-lbl">月均单量</div>
          </div>
          <div class="stat-sep" />
          <div class="stat-block">
            <div class="stat-num teal">{{ company.client_contacts?.length || 0 }}</div>
            <div class="stat-lbl">对接人数</div>
          </div>
        </div>

        <div class="card-sep" />

        <!-- 对接人列表 -->
        <div class="card-contacts">
          <div class="section-label">对接人</div>
          <div v-if="company.client_contacts?.length" class="contact-chips">
            <div v-for="c in company.client_contacts.slice(0, 3)" :key="c.id" class="contact-chip">
              <div class="chip-avatar">{{ c.name.charAt(0) }}</div>
              <div class="chip-info">
                <div class="chip-name">{{ c.name }}</div>
                <div class="chip-id">{{ c.client_id || '—' }}</div>
              </div>
              <a-tag v-if="c.is_primary" color="blue" style="margin:0;font-size:10px;line-height:16px;padding:0 4px">主</a-tag>
            </div>
            <div v-if="company.client_contacts.length > 3" class="contact-more">+{{ company.client_contacts.length - 3 }}人</div>
          </div>
          <span v-else class="empty-val">暂无对接人</span>
        </div>

        <div class="card-sep" />

        <!-- 操作 -->
        <div class="card-actions">
          <a-button type="link" size="small" @click="openDetail(company)">详情</a-button>
          <a-button type="link" size="small" @click="openEditModal(company)">编辑</a-button>
          <a-popconfirm title="确定删除该客户？" @confirm="deleteClient(company.id)">
            <a-button type="link" size="small" danger>删除</a-button>
          </a-popconfirm>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.total > pagination.pageSize" class="pagination-wrap">
      <a-pagination v-model:current="pagination.current" :total="pagination.total" :page-size="pagination.pageSize" @change="handlePageChange" show-quick-jumper />
    </div>

    <!-- 添加/编辑 Modal -->
    <a-modal v-model:open="modalOpen" :title="editingId ? '编辑客户' : '添加客户'" @ok="handleSubmit" :confirm-loading="submitting" ok-text="确定" cancel-text="取消" width="720px">
      <a-form layout="vertical" style="margin-top:8px">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="公司名称" required>
              <a-input v-model:value="form.company_name" placeholder="请输入公司名称" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="客户等级">
              <a-select v-model:value="form.level">
                <a-select-option v-for="l in ['S','A','B','C']" :key="l" :value="l">{{ l }}级</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="状态">
              <a-select v-model:value="form.status">
                <a-select-option value="活跃">活跃</a-select-option>
                <a-select-option value="暂停">暂停</a-select-option>
                <a-select-option value="流失">流失</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="国家/地区">
              <a-input v-model:value="form.country" placeholder="如：美国、德国" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="行业">
              <a-input v-model:value="form.industry" placeholder="如：3C、服装" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="月均下单量">
              <a-input-number v-model:value="form.monthly_order_count" :min="0" style="width:100%" placeholder="月均下单次数" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="下单频次">
              <a-input v-model:value="form.order_frequency" placeholder="如：每周、每月、不定期" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="品牌名称（多个）">
              <a-select v-model:value="form.brand_names" mode="tags" placeholder="输入品牌名称后回车" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="ASIN 列表（多个）">
              <a-select v-model:value="form.client_asins" mode="tags" placeholder="输入ASIN后回车，支持多个" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="form.notes" :rows="2" placeholder="备注信息" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 详情抽屉 -->
    <a-drawer
      v-model:open="detailOpen"
      :title="null"
      placement="right"
      width="600"
      :body-style="{ padding: 0 }"
    >
      <template v-if="currentCompany">
        <div class="drawer-header">
          <div class="drawer-avatar" :style="{ background: levelBg[currentCompany.level || 'C'] }">
            {{ (currentCompany.company_name || '?').charAt(0) }}
          </div>
          <div class="drawer-title-block">
            <div class="drawer-name">{{ currentCompany.company_name }}</div>
            <div class="drawer-sub">
              <span class="id-badge">{{ currentCompany.org_id || '—' }}</span>
              <a-tag :color="levelColor[currentCompany.level || 'C']">{{ currentCompany.level || 'C' }}级</a-tag>
              <a-tag :color="statusColor[currentCompany.status || '活跃']">{{ currentCompany.status }}</a-tag>
            </div>
          </div>
          <a-button type="link" size="small" @click="openEditModal(currentCompany)" style="margin-left:auto">编辑</a-button>
        </div>

        <div class="drawer-body">
          <div class="drawer-stats-row">
            <div class="dstat-card">
              <div class="dstat-num blue">{{ currentCompany.total_order_count || 0 }}</div>
              <div class="dstat-lbl">累计下单</div>
            </div>
            <div class="dstat-card">
              <div class="dstat-num green">¥{{ formatMoney(currentCompany.total_order_amount_cny) }}</div>
              <div class="dstat-lbl">累计金额</div>
            </div>
            <div class="dstat-card">
              <div class="dstat-num orange">{{ currentCompany.monthly_order_count || 0 }}</div>
              <div class="dstat-lbl">月均单量</div>
            </div>
          </div>

          <div class="drawer-section">
            <div class="section-title">基本信息</div>
            <div class="info-grid">
              <div class="info-item"><span class="info-lbl">国家</span><span class="info-val">{{ currentCompany.country || '—' }}</span></div>
              <div class="info-item"><span class="info-lbl">行业</span><span class="info-val">{{ currentCompany.industry || '—' }}</span></div>
              <div class="info-item"><span class="info-lbl">下单频次</span><span class="info-val">{{ currentCompany.order_frequency || '—' }}</span></div>
              <div class="info-item"><span class="info-lbl">最近下单</span><span class="info-val">{{ currentCompany.last_order_date || '—' }}</span></div>
            </div>
            <div v-if="currentCompany.brand_names?.length" style="margin-top:10px">
              <div class="info-lbl" style="margin-bottom:6px">品牌</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                <a-tag v-for="b in currentCompany.brand_names" :key="b" color="blue">{{ b }}</a-tag>
              </div>
            </div>
            <div v-if="currentCompany.notes" style="margin-top:10px">
              <div class="info-lbl">备注</div>
              <div class="info-val" style="margin-top:4px">{{ currentCompany.notes }}</div>
            </div>
          </div>

          <div class="drawer-section">
            <div class="section-title">ASIN 列表</div>
            <div v-if="currentCompany.client_asins?.length" style="display:flex;flex-wrap:wrap;gap:6px">
              <span v-for="asin in currentCompany.client_asins" :key="asin" class="asin-tag-lg">{{ asin }}</span>
            </div>
            <span v-else class="empty-val">暂未录入 ASIN</span>
          </div>

          <div class="drawer-section">
            <div class="section-title-row">
              <span class="section-title" style="margin-bottom:0;border:none;padding:0">对接人</span>
              <a-button type="primary" size="small" @click="openAddContact"><PlusOutlined /> 添加对接人</a-button>
            </div>
            <div v-if="!currentCompany.client_contacts?.length" class="empty-val" style="margin-top:8px">暂无对接人</div>
            <div v-else class="contact-list">
              <div v-for="c in currentCompany.client_contacts" :key="c.id" class="contact-row">
                <div class="contact-avatar-sm">{{ c.name.charAt(0) }}</div>
                <div class="contact-detail">
                  <div class="contact-name-row">
                    <span class="contact-name">{{ c.name }}</span>
                    <a-tag v-if="c.is_primary" color="blue" style="font-size:10px;margin:0;padding:0 4px">主要</a-tag>
                    <span class="contact-client-id">{{ c.client_id || '—' }}</span>
                  </div>
                  <div class="contact-meta">
                    <span v-if="c.role">{{ c.role }}</span>
                    <span v-if="c.phone">{{ c.phone }}</span>
                    <span v-if="c.wechat">微信: {{ c.wechat }}</span>
                    <a-tag :color="contactStatusColor[c.contact_wechat_status || '活跃']" style="font-size:10px;margin:0;padding:0 4px">{{ c.contact_wechat_status || '活跃' }}</a-tag>
                  </div>
                  <div v-if="c.monthly_budget_cny" class="contact-budget">月预算：¥{{ formatMoney(c.monthly_budget_cny) }}</div>
                </div>
                <a-button type="link" size="small" danger @click="deleteContact(c)"><DeleteOutlined /></a-button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </a-drawer>

    <!-- 添加对接人 Modal -->
    <a-modal v-model:open="contactModalOpen" title="添加对接人" @ok="handleAddContact" :confirm-loading="savingContact" ok-text="确定" cancel-text="取消">
      <a-form layout="vertical" style="margin-top:8px">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="姓名" required><a-input v-model:value="contactForm.name" placeholder="对接人姓名" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="角色"><a-input v-model:value="contactForm.role" placeholder="如：采购经理、运营" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="手机"><a-input v-model:value="contactForm.phone" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="微信号"><a-input v-model:value="contactForm.wechat" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="WhatsApp"><a-input v-model:value="contactForm.whatsapp" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="月预算（元）">
              <a-input-number v-model:value="contactForm.monthly_budget_cny" :min="0" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="微信状态">
              <a-select v-model:value="contactForm.contact_wechat_status">
                <a-select-option value="活跃">活跃</a-select-option>
                <a-select-option value="沉默">沉默</a-select-option>
                <a-select-option value="流失">流失</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="是否主要对接人">
              <a-switch v-model:checked="contactForm.is_primary" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注"><a-textarea v-model:value="contactForm.notes" :rows="2" /></a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, DeleteOutlined, TagOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const clients = ref<any[]>([])
const searchText = ref('')
const filterLevel = ref('')
const filterStatus = ref('')
const modalOpen = ref(false)
const detailOpen = ref(false)
const contactModalOpen = ref(false)
const submitting = ref(false)
const savingContact = ref(false)
const editingId = ref('')
const currentCompany = ref<any>(null)
const pagination = ref({ current: 1, pageSize: 15, total: 0 })

const levelColor: Record<string, string> = { S: 'gold', A: 'green', B: 'blue', C: 'default' }
const levelBg: Record<string, string> = { S: '#d97706', A: '#059669', B: '#2563eb', C: '#6b7280' }
const statusColor: Record<string, string> = { 活跃: 'green', 暂停: 'orange', 流失: 'red' }
const contactStatusColor: Record<string, string> = { 活跃: 'green', 沉默: 'orange', 流失: 'red' }

function formatMoney(val: any) {
  const n = Number(val || 0)
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return n.toFixed(0)
}

const defaultForm = () => ({
  company_name: '',
  country: '',
  industry: '',
  level: 'B',
  status: '活跃',
  brand_names: [] as string[],
  client_asins: [] as string[],
  order_frequency: '',
  monthly_order_count: 0,
  notes: '',
})
const form = reactive(defaultForm())

const defaultContactForm = () => ({
  name: '',
  role: '联系人',
  phone: '',
  wechat: '',
  whatsapp: '',
  is_primary: false,
  contact_wechat_status: '活跃',
  monthly_budget_cny: 0,
  notes: '',
})
const contactForm = reactive(defaultContactForm())

async function load() {
  loading.value = true
  try {
    let query = supabase
      .from('client_companies')
      .select('*, client_contacts(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (searchText.value) {
      query = query.or(`company_name.ilike.%${searchText.value}%`)
    }
    if (filterLevel.value) query = query.eq('level', filterLevel.value)
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)
    const { data, count, error } = await query
    if (error) throw error
    clients.value = data || []
    pagination.value.total = count || 0
    if (currentCompany.value) {
      currentCompany.value = clients.value.find(c => c.id === currentCompany.value.id) || currentCompany.value
    }
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  editingId.value = ''
  Object.assign(form, defaultForm())
  modalOpen.value = true
}

function openEditModal(record: any) {
  editingId.value = record.id
  Object.assign(form, {
    ...defaultForm(),
    ...record,
    brand_names: record.brand_names || [],
    client_asins: record.client_asins || [],
  })
  modalOpen.value = true
}

function openDetail(record: any) {
  currentCompany.value = record
  detailOpen.value = true
}

async function handleSubmit() {
  if (!form.company_name.trim()) { message.warning('请输入公司名称'); return }
  submitting.value = true
  try {
    const payload: any = {
      company_name: form.company_name.trim(),
      country: form.country,
      industry: form.industry,
      level: form.level,
      status: form.status,
      brand_names: form.brand_names,
      client_asins: form.client_asins,
      order_frequency: form.order_frequency,
      monthly_order_count: form.monthly_order_count,
      notes: form.notes,
    }
    if (editingId.value) {
      const { error } = await supabase.from('client_companies').update(payload).eq('id', editingId.value)
      if (error) throw error
      message.success('更新成功')
    } else {
      payload.org_id = 'ORG-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      const { error } = await supabase.from('client_companies').insert([payload])
      if (error) throw error
      message.success('添加成功')
    }
    modalOpen.value = false
    load()
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

async function deleteClient(id: string) {
  const { error } = await supabase.from('client_companies').delete().eq('id', id)
  if (error) { message.error('删除失败'); return }
  message.success('删除成功')
  load()
}

function openAddContact() {
  Object.assign(contactForm, defaultContactForm())
  contactModalOpen.value = true
}

async function handleAddContact() {
  if (!contactForm.name.trim()) { message.warning('请输入姓名'); return }
  if (!currentCompany.value) return
  savingContact.value = true
  try {
    const clientId = 'CLI-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    const { error } = await supabase.from('client_contacts').insert([{
      ...contactForm,
      client_id: clientId,
      company_id: currentCompany.value.id,
    }])
    if (error) throw error
    message.success('对接人已添加')
    contactModalOpen.value = false
    load()
  } catch (e: any) {
    message.error('添加失败：' + e.message)
  } finally {
    savingContact.value = false
  }
}

function deleteContact(contact: any) {
  Modal.confirm({
    title: `确定删除对接人「${contact.name}」？`,
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      const { error } = await supabase.from('client_contacts').delete().eq('id', contact.id)
      if (error) { message.error('删除失败'); return }
      message.success('已删除')
      load()
    },
  })
}

function handlePageChange(page: number) {
  pagination.value.current = page
  load()
}

onMounted(load)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }
.header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

.loading-wrap { display: flex; justify-content: center; padding: 80px 0; }
.empty-wrap { padding: 80px 0; }

.client-list { display: flex; flex-direction: column; gap: 10px; }

.client-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  padding: 16px 20px;
  gap: 0;
  transition: box-shadow 0.2s, border-color 0.2s;
  overflow: hidden;
}
.client-card:hover {
  box-shadow: 0 3px 12px rgba(0,0,0,0.09);
  border-color: #bfdbfe;
}

.card-sep { width: 1px; height: 56px; background: #f0f0f0; margin: 0 18px; flex-shrink: 0; }

/* 左侧：组织 */
.card-org { display: flex; align-items: center; gap: 12px; min-width: 220px; max-width: 240px; flex-shrink: 0; }
.org-avatar {
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 18px; flex-shrink: 0;
}
.org-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.org-name {
  font-size: 14px; font-weight: 700; color: #111827;
  cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.org-name:hover { color: #2563eb; text-decoration: underline; }
.org-ids { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.id-badge {
  font-size: 11px; color: #6b7280; background: #f3f4f6;
  padding: 1px 6px; border-radius: 4px; font-family: monospace; white-space: nowrap;
}
.org-brands { display: flex; align-items: center; gap: 4px; }
.brand-text { font-size: 11px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }

/* ASIN */
.card-asins { min-width: 160px; max-width: 180px; flex-shrink: 0; }
.section-label { font-size: 11px; color: #9ca3af; margin-bottom: 5px; }
.asin-list { display: flex; flex-wrap: wrap; gap: 4px; }
.asin-tag {
  font-size: 11px; font-family: monospace; background: #eff6ff;
  color: #2563eb; padding: 1px 6px; border-radius: 4px; border: 1px solid #bfdbfe;
  white-space: nowrap;
}
.asin-more { font-size: 11px; color: #6b7280; }

/* 统计 */
.card-stats { display: flex; align-items: center; gap: 0; flex-shrink: 0; }
.stat-block { display: flex; flex-direction: column; align-items: center; min-width: 70px; }
.stat-num { font-size: 17px; font-weight: 700; line-height: 1.2; white-space: nowrap; }
.stat-num.blue { color: #2563eb; }
.stat-num.green { color: #059669; }
.stat-num.orange { color: #d97706; }
.stat-num.teal { color: #0891b2; }
.stat-lbl { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.stat-sep { width: 1px; height: 28px; background: #e5e7eb; margin: 0 10px; flex-shrink: 0; }

/* 对接人 */
.card-contacts { flex: 1; min-width: 0; }
.contact-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.contact-chip {
  display: flex; align-items: center; gap: 6px;
  background: #f8fafc; border: 1px solid #e5e7eb;
  border-radius: 8px; padding: 5px 10px;
}
.chip-avatar {
  width: 26px; height: 26px; border-radius: 50%;
  background: #2563eb; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.chip-info { display: flex; flex-direction: column; }
.chip-name { font-size: 12px; font-weight: 600; color: #1f2937; white-space: nowrap; }
.chip-id { font-size: 10px; color: #9ca3af; font-family: monospace; }
.contact-more { font-size: 12px; color: #6b7280; }

/* 操作 */
.card-actions { display: flex; flex-direction: column; gap: 0; flex-shrink: 0; }

.empty-val { font-size: 12px; color: #c0c4cc; }

/* 分页 */
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 20px; }

/* Drawer */
.drawer-header {
  display: flex; align-items: center; gap: 14px;
  padding: 22px 24px 18px; border-bottom: 1px solid #f0f0f0;
  background: #fafbfc;
}
.drawer-avatar {
  width: 52px; height: 52px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 22px; font-weight: 700; flex-shrink: 0;
}
.drawer-title-block { flex: 1; }
.drawer-name { font-size: 17px; font-weight: 700; color: #111827; }
.drawer-sub { display: flex; align-items: center; gap: 6px; margin-top: 5px; flex-wrap: wrap; }

.drawer-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 18px; }

.drawer-stats-row {
  display: flex; gap: 12px;
  background: #f0f7ff; border-radius: 10px;
  border: 1px solid #bfdbfe; padding: 14px 16px;
}
.dstat-card { flex: 1; text-align: center; }
.dstat-num { font-size: 20px; font-weight: 700; line-height: 1.2; }
.dstat-num.blue { color: #2563eb; }
.dstat-num.green { color: #059669; }
.dstat-num.orange { color: #d97706; }
.dstat-lbl { font-size: 12px; color: #6b7280; margin-top: 4px; }

.drawer-section { }
.section-title {
  font-size: 13px; font-weight: 600; color: #374151;
  margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6;
  display: block;
}
.section-title-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6;
}

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.info-item { display: flex; flex-direction: column; gap: 2px; }
.info-lbl { font-size: 11px; color: #9ca3af; }
.info-val { font-size: 13px; color: #1f2937; font-weight: 500; }

.asin-tag-lg {
  font-size: 12px; font-family: monospace;
  background: #eff6ff; color: #2563eb;
  padding: 3px 10px; border-radius: 6px; border: 1px solid #bfdbfe;
}

.contact-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.contact-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; background: #f8fafc;
  border-radius: 8px; border: 1px solid #e5e7eb;
}
.contact-avatar-sm {
  width: 32px; height: 32px; border-radius: 50%;
  background: #2563eb; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; flex-shrink: 0;
}
.contact-detail { flex: 1; min-width: 0; }
.contact-name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.contact-name { font-size: 13px; font-weight: 600; color: #1f2937; }
.contact-client-id { font-size: 11px; color: #9ca3af; font-family: monospace; }
.contact-meta { display: flex; align-items: center; gap: 8px; margin-top: 3px; flex-wrap: wrap; }
.contact-meta span { font-size: 12px; color: #6b7280; }
.contact-budget { font-size: 11px; color: #059669; margin-top: 2px; }
</style>
