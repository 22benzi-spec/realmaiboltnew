<template>
  <div class="store-manager">
    <div class="section-title-row">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="section-title" style="margin-bottom:0;border:none;padding:0">店铺 & ASIN</span>
        <span class="store-count-badge">{{ stores.length }} 家店铺</span>
      </div>
      <a-button type="primary" size="small" @click="openAddStore"><PlusOutlined /> 添加店铺</a-button>
    </div>

    <div v-if="loading" style="text-align:center;padding:16px"><a-spin /></div>
    <div v-else-if="!stores.length" class="empty-val" style="margin-top:8px">暂无店铺，点击上方添加</div>

    <div v-else class="store-list">
      <div v-for="store in stores" :key="store.id" class="store-card">
        <!-- 店铺头部 -->
        <div class="store-header" @click="toggleStore(store.id)">
          <div class="store-header-left">
            <div class="store-icon"><ShopOutlined /></div>
            <div class="store-info">
              <div class="store-name">{{ store.store_name }}</div>
              <div class="store-meta">
                <span class="store-platform">{{ store.platform }}</span>
                <span v-if="store.country" class="store-country">{{ store.country }}</span>
                <span v-if="store.contact_name" class="store-owner"><UserOutlined /> {{ store.contact_name }}</span>
              </div>
            </div>
          </div>
          <div class="store-header-right">
            <span class="asin-count">{{ storeAsinMap[store.id]?.length || 0 }} 个ASIN</span>
            <a-tag :color="store.status === '活跃' ? 'green' : 'default'" style="font-size:11px;margin:0">{{ store.status }}</a-tag>
            <a-button type="link" size="small" @click.stop="openEditStore(store)"><EditOutlined /></a-button>
            <a-popconfirm title="删除店铺将同时删除其下所有ASIN，确认？" @confirm.stop="deleteStore(store.id)">
              <a-button type="link" size="small" danger @click.stop><DeleteOutlined /></a-button>
            </a-popconfirm>
            <DownOutlined :class="['expand-icon', { expanded: expandedStores.has(store.id) }]" />
          </div>
        </div>

        <!-- ASIN 列表（展开） -->
        <div v-if="expandedStores.has(store.id)" class="asin-panel">
          <div class="asin-panel-toolbar">
            <span style="font-size:12px;color:#6b7280">共 {{ storeAsinMap[store.id]?.length || 0 }} 个ASIN</span>
            <a-button size="small" @click="openAddAsin(store)"><PlusOutlined /> 添加ASIN</a-button>
          </div>

          <div v-if="!storeAsinMap[store.id]?.length" class="asin-empty">暂无ASIN，点击添加</div>

          <div v-else class="asin-grid">
            <div v-for="item in storeAsinMap[store.id]" :key="item.id" class="asin-row">
              <div class="asin-row-left">
                <img v-if="item.product_image" :src="item.product_image" class="asin-thumb" />
                <div v-else class="asin-thumb-placeholder"><FileImageOutlined /></div>
                <div class="asin-info">
                  <div class="asin-code">{{ item.asin }}</div>
                  <div class="asin-name" v-if="item.product_name">{{ item.product_name }}</div>
                  <div class="asin-brand-price">
                    <span v-if="item.brand_name" class="asin-brand">{{ item.brand_name }}</span>
                    <span v-if="item.product_price" class="asin-price">${{ item.product_price }}</span>
                  </div>
                </div>
              </div>
              <div class="asin-row-right">
                <a-tag :color="item.is_active ? 'green' : 'default'" style="font-size:10px;margin:0">
                  {{ item.is_active ? '在售' : '停售' }}
                </a-tag>
                <a-button type="link" size="small" @click="openEditAsin(item, store)"><EditOutlined /></a-button>
                <a-popconfirm title="确定删除该ASIN？" @confirm="deleteAsin(item.id)">
                  <a-button type="link" size="small" danger><DeleteOutlined /></a-button>
                </a-popconfirm>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑店铺 Modal -->
    <a-modal
      v-model:open="storeModalOpen"
      :title="editingStoreId ? '编辑店铺' : '添加店铺'"
      @ok="handleSaveStore"
      :confirm-loading="savingStore"
      ok-text="确定"
      cancel-text="取消"
      width="500px"
    >
      <a-form layout="vertical" style="margin-top:8px">
        <a-row :gutter="12">
          <a-col :span="14">
            <a-form-item label="店铺名称" required>
              <a-input v-model:value="storeForm.store_name" placeholder="请输入店铺名称" />
            </a-form-item>
          </a-col>
          <a-col :span="10">
            <a-form-item label="平台">
              <a-select v-model:value="storeForm.platform">
                <a-select-option value="亚马逊">亚马逊</a-select-option>
                <a-select-option value="Walmart">Walmart</a-select-option>
                <a-select-option value="eBay">eBay</a-select-option>
                <a-select-option value="其他">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="站点/国家">
              <a-select v-model:value="storeForm.country" allow-clear placeholder="选择站点">
                <a-select-option value="美国">美国</a-select-option>
                <a-select-option value="德国">德国</a-select-option>
                <a-select-option value="英国">英国</a-select-option>
                <a-select-option value="加拿大">加拿大</a-select-option>
                <a-select-option value="法国">法国</a-select-option>
                <a-select-option value="日本">日本</a-select-option>
                <a-select-option value="意大利">意大利</a-select-option>
                <a-select-option value="西班牙">西班牙</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="storeForm.status">
                <a-select-option value="活跃">活跃</a-select-option>
                <a-select-option value="暂停">暂停</a-select-option>
                <a-select-option value="关闭">关闭</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="负责员工（选填）">
              <a-select v-model:value="storeForm.contact_id" allow-clear placeholder="选择负责该店铺的员工">
                <a-select-option v-for="c in activeContacts" :key="c.id" :value="c.id">
                  {{ c.name }}{{ c.role ? `（${c.role}）` : '' }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="storeForm.notes" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 添加/编辑 ASIN Modal -->
    <a-modal
      v-model:open="asinModalOpen"
      :title="editingAsinId ? '编辑ASIN' : '添加ASIN'"
      @ok="handleSaveAsin"
      :confirm-loading="savingAsin"
      ok-text="确定"
      cancel-text="取消"
      width="560px"
    >
      <div v-if="currentStoreForAsin" class="asin-modal-store-hint">
        <ShopOutlined /> 添加到：<strong>{{ currentStoreForAsin.store_name }}</strong>
      </div>
      <a-form layout="vertical" style="margin-top:8px">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="ASIN" required>
              <a-input v-model:value="asinForm.asin" placeholder="如：B08XYZ123" style="font-family:monospace" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="品牌">
              <a-input v-model:value="asinForm.brand_name" placeholder="品牌名称" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="产品名称">
              <a-input v-model:value="asinForm.product_name" placeholder="产品名称（选填）" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="定价（美元）">
              <a-input-number v-model:value="asinForm.product_price" :min="0" :precision="2" style="width:100%" prefix="$" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="asinForm.is_active">
                <a-select-option :value="true">在售</a-select-option>
                <a-select-option :value="false">停售</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="产品图片URL（选填）">
              <a-input v-model:value="asinForm.product_image" placeholder="https://..." />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="asinForm.notes" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ShopOutlined, UserOutlined, DownOutlined, FileImageOutlined
} from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

const props = defineProps<{
  companyId: string
  contacts: any[]
}>()

const emit = defineEmits<{
  (e: 'updated'): void
}>()

const loading = ref(false)
const stores = ref<any[]>([])
const storeAsinMap = ref<Record<string, any[]>>({})
const expandedStores = ref<Set<string>>(new Set())

const activeContacts = computed(() =>
  (props.contacts || []).filter((c: any) => c.employment_status !== '离职' && c.employment_status !== '停止合作')
)

async function loadStores() {
  if (!props.companyId) return
  loading.value = true
  try {
    const { data: storeData } = await supabase
      .from('client_stores')
      .select('*, client_contacts(name, role)')
      .eq('company_id', props.companyId)
      .order('created_at', { ascending: true })

    stores.value = (storeData || []).map((s: any) => ({
      ...s,
      contact_name: s.client_contacts?.name || '',
    }))

    if (stores.value.length) {
      const storeIds = stores.value.map((s: any) => s.id)
      const { data: asinData } = await supabase
        .from('client_store_asins')
        .select('*')
        .in('store_id', storeIds)
        .order('created_at', { ascending: true })

      const map: Record<string, any[]> = {}
      for (const a of asinData || []) {
        if (!map[a.store_id]) map[a.store_id] = []
        map[a.store_id].push(a)
      }
      storeAsinMap.value = map
    } else {
      storeAsinMap.value = {}
    }
  } finally {
    loading.value = false
  }
}

function toggleStore(storeId: string) {
  const s = new Set(expandedStores.value)
  if (s.has(storeId)) s.delete(storeId)
  else s.add(storeId)
  expandedStores.value = s
}

watch(() => props.companyId, (id) => { if (id) loadStores() }, { immediate: true })

const storeModalOpen = ref(false)
const savingStore = ref(false)
const editingStoreId = ref('')

const defaultStoreForm = () => ({
  store_name: '',
  platform: '亚马逊',
  country: '美国',
  status: '活跃',
  contact_id: '' as string,
  notes: '',
})
const storeForm = reactive(defaultStoreForm())

function openAddStore() {
  editingStoreId.value = ''
  Object.assign(storeForm, defaultStoreForm())
  storeModalOpen.value = true
}

function openEditStore(store: any) {
  editingStoreId.value = store.id
  Object.assign(storeForm, {
    store_name: store.store_name,
    platform: store.platform,
    country: store.country || '',
    status: store.status,
    contact_id: store.contact_id || '',
    notes: store.notes || '',
  })
  storeModalOpen.value = true
}

async function handleSaveStore() {
  if (!storeForm.store_name.trim()) { message.warning('请输入店铺名称'); return }
  savingStore.value = true
  try {
    const payload: any = {
      company_id: props.companyId,
      store_name: storeForm.store_name.trim(),
      platform: storeForm.platform,
      country: storeForm.country,
      status: storeForm.status,
      contact_id: storeForm.contact_id || null,
      notes: storeForm.notes,
    }
    if (editingStoreId.value) {
      const { error } = await supabase.from('client_stores').update(payload).eq('id', editingStoreId.value)
      if (error) throw error
      message.success('店铺已更新')
    } else {
      const { error } = await supabase.from('client_stores').insert([payload])
      if (error) throw error
      message.success('店铺已添加')
    }
    storeModalOpen.value = false
    loadStores()
    emit('updated')
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    savingStore.value = false
  }
}

async function deleteStore(storeId: string) {
  const { error } = await supabase.from('client_stores').delete().eq('id', storeId)
  if (error) { message.error('删除失败'); return }
  message.success('已删除')
  loadStores()
  emit('updated')
}

const asinModalOpen = ref(false)
const savingAsin = ref(false)
const editingAsinId = ref('')
const currentStoreForAsin = ref<any>(null)

const defaultAsinForm = () => ({
  asin: '',
  brand_name: '',
  product_name: '',
  product_image: '',
  product_price: 0 as number,
  is_active: true,
  notes: '',
})
const asinForm = reactive(defaultAsinForm())

function openAddAsin(store: any) {
  editingAsinId.value = ''
  currentStoreForAsin.value = store
  Object.assign(asinForm, defaultAsinForm())
  asinModalOpen.value = true
}

function openEditAsin(asinItem: any, store: any) {
  editingAsinId.value = asinItem.id
  currentStoreForAsin.value = store
  Object.assign(asinForm, {
    asin: asinItem.asin,
    brand_name: asinItem.brand_name || '',
    product_name: asinItem.product_name || '',
    product_image: asinItem.product_image || '',
    product_price: asinItem.product_price || 0,
    is_active: asinItem.is_active !== false,
    notes: asinItem.notes || '',
  })
  asinModalOpen.value = true
}

async function handleSaveAsin() {
  if (!asinForm.asin.trim()) { message.warning('请输入ASIN'); return }
  if (!currentStoreForAsin.value) return
  savingAsin.value = true
  try {
    const payload: any = {
      store_id: currentStoreForAsin.value.id,
      company_id: props.companyId,
      asin: asinForm.asin.trim().toUpperCase(),
      brand_name: asinForm.brand_name,
      product_name: asinForm.product_name,
      product_image: asinForm.product_image,
      product_price: asinForm.product_price,
      is_active: asinForm.is_active,
      notes: asinForm.notes,
    }
    if (editingAsinId.value) {
      const { error } = await supabase.from('client_store_asins').update(payload).eq('id', editingAsinId.value)
      if (error) throw error
      message.success('ASIN已更新')
    } else {
      const { error } = await supabase.from('client_store_asins').insert([payload])
      if (error) throw error
      message.success('ASIN已添加')
    }
    asinModalOpen.value = false
    loadStores()
    emit('updated')
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    savingAsin.value = false
  }
}

async function deleteAsin(asinId: string) {
  const { error } = await supabase.from('client_store_asins').delete().eq('id', asinId)
  if (error) { message.error('删除失败'); return }
  message.success('已删除')
  loadStores()
}

defineExpose({ loadStores })
</script>

<style scoped>
.store-manager { padding: 0; }

.store-count-badge {
  font-size: 11px; padding: 1px 8px;
  background: #dbeafe; color: #1d4ed8;
  border-radius: 20px;
}

.store-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }

.store-card {
  border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;
  background: #fff;
}

.store-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; cursor: pointer; gap: 8px;
  transition: background 0.15s;
}
.store-header:hover { background: #f8fafc; }

.store-header-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }

.store-icon {
  width: 32px; height: 32px; border-radius: 8px;
  background: #dbeafe; color: #1d4ed8;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
}

.store-info { min-width: 0; }
.store-name { font-size: 13px; font-weight: 600; color: #1f2937; }
.store-meta { display: flex; align-items: center; gap: 8px; margin-top: 2px; flex-wrap: wrap; }
.store-platform { font-size: 11px; color: #6b7280; }
.store-country { font-size: 11px; color: #6b7280; }
.store-owner { font-size: 11px; color: #6b7280; display: flex; align-items: center; gap: 3px; }

.store-header-right { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.asin-count { font-size: 11px; color: #6b7280; white-space: nowrap; }

.expand-icon {
  font-size: 11px; color: #9ca3af;
  transition: transform 0.2s; margin-left: 4px;
}
.expand-icon.expanded { transform: rotate(180deg); }

.asin-panel {
  border-top: 1px solid #f0f0f0;
  padding: 10px 14px;
  background: #fafafa;
}

.asin-panel-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}

.asin-empty {
  text-align: center; color: #9ca3af;
  font-size: 12px; padding: 12px 0;
}

.asin-grid { display: flex; flex-direction: column; gap: 6px; }

.asin-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 10px; background: #fff;
  border: 1px solid #e5e7eb; border-radius: 8px;
  gap: 8px;
}

.asin-row-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }

.asin-thumb {
  width: 40px; height: 40px; border-radius: 6px;
  object-fit: cover; flex-shrink: 0; border: 1px solid #f0f0f0;
}
.asin-thumb-placeholder {
  width: 40px; height: 40px; border-radius: 6px;
  background: #f3f4f6; display: flex; align-items: center;
  justify-content: center; color: #9ca3af; flex-shrink: 0;
}

.asin-info { min-width: 0; }
.asin-code {
  font-size: 13px; font-weight: 700; color: #1f2937;
  font-family: monospace; letter-spacing: 0.5px;
}
.asin-name {
  font-size: 11px; color: #6b7280;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 200px;
}
.asin-brand-price { display: flex; align-items: center; gap: 8px; margin-top: 1px; }
.asin-brand {
  font-size: 11px; padding: 0 6px; border-radius: 3px;
  background: #eff6ff; color: #1d4ed8;
}
.asin-price { font-size: 11px; color: #059669; font-weight: 600; }

.asin-row-right { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }

.asin-modal-store-hint {
  padding: 8px 12px; background: #eff6ff; border-radius: 8px;
  font-size: 12px; color: #1d4ed8;
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 4px;
}
</style>
