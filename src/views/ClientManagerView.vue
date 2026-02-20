<template>
  <div class="page-content">
    <h1 class="page-title">客户库</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search v-model:value="searchText" placeholder="搜索客户名称/品牌" style="width:240px" allow-clear @search="load" />
        <a-select v-model:value="filterLevel" style="width:110px" @change="load" allow-clear placeholder="等级">
          <a-select-option v-for="l in ['S','A','B','C']" :key="l" :value="l">{{ l }}级</a-select-option>
        </a-select>
        <a-select v-model:value="filterStatus" style="width:110px" @change="load" allow-clear placeholder="状态">
          <a-select-option value="活跃">活跃</a-select-option>
          <a-select-option value="暂停">暂停</a-select-option>
          <a-select-option value="流失">流失</a-select-option>
        </a-select>
        <a-button type="primary" @click="openModal()"><PlusOutlined /> 添加客户</a-button>
      </div>

      <a-table :columns="columns" :data-source="clients" :loading="loading" :pagination="pagination" row-key="id" size="middle" @change="handleTableChange">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'company_name'">
            <span class="company-link" @click="openDetail(record)">{{ record.company_name }}</span>
          </template>
          <template v-if="column.key === 'level'">
            <a-tag :color="levelColor[record.level] || 'default'">{{ record.level }}级</a-tag>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColor[record.status] || 'default'">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'total_order_amount_cny'">
            ¥{{ Number(record.total_order_amount_cny || 0).toFixed(0) }}
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openModal(record)">编辑</a-button>
              <a-popconfirm title="确定删除?" @confirm="deleteClient(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal v-model:open="modalOpen" :title="editingId ? '编辑客户' : '添加客户'" @ok="handleSubmit" :confirm-loading="submitting" width="680px">
      <a-form :model="form" layout="vertical" ref="formRef" :rules="rules">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="公司名称" name="company_name"><a-input v-model:value="form.company_name" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="国家"><a-input v-model:value="form.country" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="行业"><a-input v-model:value="form.industry" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="客户等级">
              <a-select v-model:value="form.level">
                <a-select-option v-for="l in ['S','A','B','C']" :key="l" :value="l">{{ l }}级</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="form.status">
                <a-select-option value="活跃">活跃</a-select-option>
                <a-select-option value="暂停">暂停</a-select-option>
                <a-select-option value="流失">流失</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="商务负责人"><a-input v-model:value="form.business_owner_name" /></a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="品牌名称（多个）">
              <a-select v-model:value="form.brand_names" mode="tags" placeholder="输入品牌名称后回车" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注"><a-textarea v-model:value="form.notes" :rows="2" /></a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <a-drawer v-model:open="detailOpen" :title="currentClient?.company_name" width="600" placement="right">
      <template v-if="currentClient">
        <a-descriptions :column="2" bordered size="small" style="margin-bottom:16px">
          <a-descriptions-item label="等级"><a-tag :color="levelColor[currentClient.level]">{{ currentClient.level }}级</a-tag></a-descriptions-item>
          <a-descriptions-item label="状态"><a-tag :color="statusColor[currentClient.status]">{{ currentClient.status }}</a-tag></a-descriptions-item>
          <a-descriptions-item label="国家">{{ currentClient.country || '-' }}</a-descriptions-item>
          <a-descriptions-item label="行业">{{ currentClient.industry || '-' }}</a-descriptions-item>
          <a-descriptions-item label="商务负责人">{{ currentClient.business_owner_name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="订单数">{{ currentClient.total_order_count || 0 }}</a-descriptions-item>
          <a-descriptions-item label="累计金额" :span="2">¥{{ Number(currentClient.total_order_amount_cny || 0).toFixed(2) }}</a-descriptions-item>
          <a-descriptions-item label="备注" :span="2">{{ currentClient.notes || '-' }}</a-descriptions-item>
        </a-descriptions>

        <div class="contact-section">
          <div class="section-header">
            <h4>联系人</h4>
            <a-button size="small" type="primary" @click="addContactOpen = true"><PlusOutlined /> 添加联系人</a-button>
          </div>
          <a-list :data-source="currentClient.client_contacts || []" size="small">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta :title="item.name + (item.is_primary ? ' [主要]' : '')" :description="item.role" />
                <template #actions>
                  <span v-if="item.phone">{{ item.phone }}</span>
                  <span v-if="item.wechat">微信: {{ item.wechat }}</span>
                </template>
              </a-list-item>
            </template>
          </a-list>
        </div>
      </template>
    </a-drawer>

    <a-modal v-model:open="addContactOpen" title="添加联系人" @ok="handleAddContact" :confirm-loading="savingContact">
      <a-form layout="vertical">
        <a-form-item label="姓名"><a-input v-model:value="contactForm.name" /></a-form-item>
        <a-form-item label="角色"><a-input v-model:value="contactForm.role" /></a-form-item>
        <a-form-item label="手机"><a-input v-model:value="contactForm.phone" /></a-form-item>
        <a-form-item label="微信"><a-input v-model:value="contactForm.wechat" /></a-form-item>
        <a-form-item label="主要联系人"><a-switch v-model:checked="contactForm.is_primary" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const clients = ref<any[]>([])
const searchText = ref('')
const filterLevel = ref('')
const filterStatus = ref('')
const modalOpen = ref(false)
const detailOpen = ref(false)
const addContactOpen = ref(false)
const submitting = ref(false)
const savingContact = ref(false)
const editingId = ref('')
const currentClient = ref<any>(null)
const formRef = ref()
const pagination = ref({ current: 1, pageSize: 20, total: 0 })

const levelColor: Record<string, string> = { 'S': 'gold', 'A': 'green', 'B': 'blue', 'C': 'default' }
const statusColor: Record<string, string> = { '活跃': 'green', '暂停': 'orange', '流失': 'red' }

const defaultForm = () => ({ company_name: '', country: '', industry: '', level: 'B', status: '活跃', business_owner_name: '', brand_names: [] as string[], notes: '' })
const form = reactive(defaultForm())
const rules = { company_name: [{ required: true, message: '请输入公司名称' }] }

const contactForm = reactive({ name: '', role: '联系人', phone: '', wechat: '', is_primary: false })

const columns = [
  { title: '公司名称', key: 'company_name', width: 180 },
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '行业', dataIndex: 'industry', key: 'industry', width: 100 },
  { title: '等级', key: 'level', width: 80 },
  { title: '状态', key: 'status', width: 80 },
  { title: '商务', dataIndex: 'business_owner_name', key: 'business_owner_name', width: 100 },
  { title: '订单数', dataIndex: 'total_order_count', key: 'total_order_count', width: 80 },
  { title: '累计金额', key: 'total_order_amount_cny', width: 110 },
  { title: '操作', key: 'action', width: 100 },
]

async function load() {
  loading.value = true
  try {
    let query = supabase.from('client_companies').select('*, client_contacts(*)', { count: 'exact' }).order('created_at', { ascending: false })
    if (searchText.value) query = query.or(`company_name.ilike.%${searchText.value}%`)
    if (filterLevel.value) query = query.eq('level', filterLevel.value)
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)
    const { data, count, error } = await query
    if (error) throw error
    clients.value = data || []
    pagination.value.total = count || 0
  } finally {
    loading.value = false
  }
}

function openModal(record?: any) {
  editingId.value = record?.id || ''
  if (record) {
    Object.assign(form, { ...defaultForm(), ...record })
  } else {
    Object.assign(form, defaultForm())
  }
  modalOpen.value = true
}

function openDetail(record: any) {
  currentClient.value = record
  detailOpen.value = true
}

async function handleSubmit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const payload = { ...form }
    if (editingId.value) {
      const { error } = await supabase.from('client_companies').update(payload).eq('id', editingId.value)
      if (error) throw error
      message.success('更新成功')
    } else {
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

async function handleAddContact() {
  if (!currentClient.value) return
  savingContact.value = true
  try {
    const { error } = await supabase.from('client_contacts').insert([{ ...contactForm, company_id: currentClient.value.id }])
    if (error) throw error
    message.success('联系人已添加')
    addContactOpen.value = false
    Object.assign(contactForm, { name: '', role: '联系人', phone: '', wechat: '', is_primary: false })
    load()
    const updated = clients.value.find(c => c.id === currentClient.value.id)
    if (updated) currentClient.value = updated
  } catch (e: any) {
    message.error('添加失败：' + e.message)
  } finally {
    savingContact.value = false
  }
}

async function deleteClient(id: string) {
  const { error } = await supabase.from('client_companies').delete().eq('id', id)
  if (error) { message.error('删除失败'); return }
  message.success('删除成功')
  load()
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  load()
}

onMounted(load)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.company-link { color: #2563eb; cursor: pointer; font-weight: 500; }
.company-link:hover { text-decoration: underline; }
.contact-section { margin-top: 16px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-header h4 { margin: 0; font-size: 14px; font-weight: 600; }
</style>
