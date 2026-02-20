<template>
  <div class="page-content">
    <h1 class="page-title">买手库</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search v-model:value="searchText" placeholder="搜索买手姓名/平台账号" style="width:240px" allow-clear @search="load" />
        <a-select v-model:value="filterStatus" style="width:120px" @change="load" allow-clear placeholder="状态">
          <a-select-option value="活跃">活跃</a-select-option>
          <a-select-option value="暂停">暂停</a-select-option>
        </a-select>
        <a-select v-model:value="filterCountry" style="width:120px" @change="load" allow-clear placeholder="国家">
          <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-button type="primary" @click="openModal()"><PlusOutlined /> 添加买手</a-button>
      </div>

      <a-table :columns="columns" :data-source="buyers" :loading="loading" :pagination="pagination" row-key="id" size="middle" @change="handleTableChange" :scroll="{ x: 1100 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="buyer-name" @click="openDetail(record)">{{ record.name }}</div>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColor[record.status] || 'default'">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'tags'">
            <div class="tags-cell">
              <a-tag v-for="tag in (record.tags || []).slice(0,3)" :key="tag" size="small" color="blue">{{ tag }}</a-tag>
              <span v-if="(record.tags || []).length > 3" class="more-tags">+{{ record.tags.length - 3 }}</span>
            </div>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openModal(record)">编辑</a-button>
              <a-popconfirm title="确定删除?" @confirm="deleteBuyer(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal v-model:open="modalOpen" :title="editingId ? '编辑买手' : '添加买手'" @ok="handleSubmit" :confirm-loading="submitting" width="700px">
      <a-form :model="form" layout="vertical" ref="formRef" :rules="rules">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="买手姓名" name="name"><a-input v-model:value="form.name" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="国家">
              <a-select v-model:value="form.country">
                <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="平台账号"><a-input v-model:value="form.platform_account" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="PayPal邮箱"><a-input v-model:value="form.paypal_email" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="手机号"><a-input v-model:value="form.phone" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="邮箱"><a-input v-model:value="form.email" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Facebook姓名"><a-input v-model:value="form.facebook_name" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="聊天账号"><a-input v-model:value="form.chat_account" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="等级">
              <a-select v-model:value="form.level">
                <a-select-option value="普通">普通</a-select-option>
                <a-select-option value="优质">优质</a-select-option>
                <a-select-option value="VIP">VIP</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="form.status">
                <a-select-option value="活跃">活跃</a-select-option>
                <a-select-option value="暂停">暂停</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="标签">
              <a-select v-model:value="form.tags" mode="tags" :options="tagPresets.map(t => ({ value: t, label: t }))" placeholder="选择或输入标签" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注"><a-textarea v-model:value="form.notes" :rows="2" /></a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'
import { BUYER_TAG_PRESETS } from '../types'

const loading = ref(false)
const buyers = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('')
const filterCountry = ref('')
const modalOpen = ref(false)
const submitting = ref(false)
const editingId = ref('')
const formRef = ref()
const pagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })

const countries = ['美国', '德国', '英国', '加拿大']
const tagPresets = [...BUYER_TAG_PRESETS]
const statusColor: Record<string, string> = { '活跃': 'green', '暂停': 'orange', '黑名单': 'red' }

const defaultForm = () => ({
  name: '', country: '美国', platform_account: '', paypal_email: '', phone: '', email: '',
  facebook_name: '', chat_account: '', level: '普通', status: '活跃', tags: [] as string[], notes: ''
})
const form = reactive(defaultForm())
const rules = { name: [{ required: true, message: '请输入买手姓名' }] }

const columns = [
  { title: '买手姓名', key: 'name', width: 130 },
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '平台账号', dataIndex: 'platform_account', key: 'platform_account', width: 130 },
  { title: 'PayPal邮箱', dataIndex: 'paypal_email', key: 'paypal_email' },
  { title: '等级', dataIndex: 'level', key: 'level', width: 80 },
  { title: '已完成', dataIndex: 'total_completed', key: 'total_completed', width: 80 },
  { title: '成功率', dataIndex: 'success_rate', key: 'success_rate', width: 80, customRender: ({ text }: any) => text ? `${text}%` : '-' },
  { title: '标签', key: 'tags', width: 180 },
  { title: '状态', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 100, fixed: 'right' },
]

async function load() {
  loading.value = true
  try {
    let query = supabase.from('buyers').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (searchText.value) query = query.or(`name.ilike.%${searchText.value}%,platform_account.ilike.%${searchText.value}%`)
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    if (filterCountry.value) query = query.eq('country', filterCountry.value)
    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)
    const { data, count, error } = await query
    if (error) throw error
    buyers.value = data || []
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
  openModal(record)
}

async function handleSubmit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const payload = { ...form }
    if (editingId.value) {
      const { error } = await supabase.from('buyers').update(payload).eq('id', editingId.value)
      if (error) throw error
      message.success('更新成功')
    } else {
      const { error } = await supabase.from('buyers').insert([payload])
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

async function deleteBuyer(id: string) {
  const { error } = await supabase.from('buyers').delete().eq('id', id)
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
.buyer-name { color: #2563eb; cursor: pointer; font-weight: 500; }
.buyer-name:hover { text-decoration: underline; }
.tags-cell { display: flex; flex-wrap: wrap; gap: 4px; }
.more-tags { font-size: 11px; color: #9ca3af; }
</style>
