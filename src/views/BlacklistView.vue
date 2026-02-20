<template>
  <div class="page-content">
    <h1 class="page-title">买手黑名单</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search v-model:value="searchText" placeholder="搜索买手姓名" style="width:220px" allow-clear @search="load" />
        <a-button @click="load"><ReloadOutlined /> 刷新</a-button>
      </div>

      <a-table :columns="columns" :data-source="blacklist" :loading="loading" row-key="id" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <a-space>
              <a-popconfirm title="确定将此买手移出黑名单?" @confirm="removeFromBlacklist(record)">
                <a-button type="link" size="small">移出黑名单</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const blacklist = ref<any[]>([])
const searchText = ref('')

const columns = [
  { title: '买手姓名', dataIndex: 'name', key: 'name', width: 130 },
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '平台账号', dataIndex: 'platform_account', key: 'platform_account' },
  { title: 'PayPal邮箱', dataIndex: 'paypal_email', key: 'paypal_email' },
  { title: '黑名单原因', dataIndex: 'blacklist_reason', key: 'blacklist_reason' },
  { title: '加入时间', dataIndex: 'updated_at', key: 'updated_at', width: 130, customRender: ({ text }: any) => text ? dayjs(text).format('YYYY-MM-DD') : '' },
  { title: '操作', key: 'action', width: 120 },
]

async function load() {
  loading.value = true
  try {
    let query = supabase.from('buyers').select('*').eq('status', '黑名单').order('updated_at', { ascending: false })
    if (searchText.value) query = query.ilike('name', `%${searchText.value}%`)
    const { data, error } = await query
    if (error) throw error
    blacklist.value = data || []
  } finally {
    loading.value = false
  }
}

async function removeFromBlacklist(record: any) {
  const { error } = await supabase.from('buyers').update({ status: '暂停', blacklist_reason: null }).eq('id', record.id)
  if (error) { message.error('操作失败'); return }
  message.success('已移出黑名单')
  load()
}

onMounted(load)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
</style>
