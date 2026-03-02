<template>
  <div class="store-manager">
    <div class="section-title-row">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="section-title" style="margin-bottom:0;border:none;padding:0">店铺 & ASIN</span>
        <span class="store-count-badge">{{ stores.length }} 家店铺</span>
        <span class="asin-count-badge">{{ totalAsinCount }} 个ASIN</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <div class="view-tabs">
          <span :class="['view-tab', { active: viewMode === 'asin' }]" @click="viewMode = 'asin'">按ASIN</span>
          <span :class="['view-tab', { active: viewMode === 'store' }]" @click="viewMode = 'store'">按店铺</span>
        </div>
      </div>
    </div>

    <div v-if="loading" style="text-align:center;padding:20px"><a-spin /></div>
    <div v-else-if="!stores.length" class="empty-state">
      <div class="empty-icon">&#x1F4E6;</div>
      <div class="empty-title">暂无店铺与ASIN数据</div>
      <div class="empty-sub">商务下单选择该客户后，店铺和ASIN将自动同步至此</div>
    </div>

    <template v-else>
      <!-- 顶部概览条 -->
      <div class="overview-bar">
        <div v-for="item in brandSummary" :key="item.brand" class="overview-brand-chip">
          <span class="brand-chip-dot"></span>
          <span class="brand-chip-name">{{ item.brand || '未知品牌' }}</span>
          <span class="brand-chip-count">{{ item.asinCount }}个ASIN</span>
        </div>
      </div>

      <!-- ASIN 视图 -->
      <div v-if="viewMode === 'asin'" class="asin-view">
        <div v-for="asinGroup in asinGroups" :key="asinGroup.asin" class="asin-card">
          <div class="asin-card-header" @click="toggleAsin(asinGroup.asin)">
            <div class="asin-card-left">
              <img v-if="asinGroup.product_image" :src="asinGroup.product_image" class="asin-thumb" />
              <div v-else class="asin-thumb-placeholder">ASIN</div>
              <div class="asin-main-info">
                <div class="asin-code-row">
                  <span class="asin-code">{{ asinGroup.asin }}</span>
                  <a-tag v-if="asinGroup.brand_name" color="blue" style="margin:0;font-size:10px">{{ asinGroup.brand_name }}</a-tag>
                  <a-tag v-if="asinGroup.category" color="default" style="margin:0;font-size:10px">{{ asinGroup.category }}</a-tag>
                  <a-tag v-if="asinGroup.product_price" color="green" style="margin:0;font-size:10px">${{ asinGroup.product_price }}</a-tag>
                </div>
                <div v-if="asinGroup.product_name" class="asin-product-name">{{ asinGroup.product_name }}</div>
                <div class="asin-stores-summary">
                  <ShopOutlined style="font-size:11px;color:#9ca3af" />
                  <span>出现在 {{ asinGroup.stores.length }} 个店铺：</span>
                  <span v-for="(s, i) in asinGroup.stores" :key="s.store_id" class="store-inline-name">
                    {{ s.store_name }}<span v-if="s.country" class="store-inline-country">（{{ s.country }}）</span><span v-if="i < asinGroup.stores.length - 1">、</span>
                  </span>
                </div>
              </div>
            </div>
            <div class="asin-card-right">
              <DownOutlined :class="['expand-icon', { expanded: expandedAsins.has(asinGroup.asin) }]" />
            </div>
          </div>

          <!-- ASIN 详情展开 -->
          <div v-if="expandedAsins.has(asinGroup.asin)" class="asin-detail-panel">
            <div class="asin-detail-stores">
              <div v-for="storeEntry in asinGroup.stores" :key="storeEntry.store_id" class="asin-store-row">
                <div class="asin-store-row-left">
                  <div class="store-dot-icon"><ShopOutlined /></div>
                  <div>
                    <div class="detail-store-name">{{ storeEntry.store_name }}</div>
                    <div class="detail-store-meta">
                      <span v-if="storeEntry.platform" class="meta-tag">{{ storeEntry.platform }}</span>
                      <span v-if="storeEntry.country" class="meta-tag">{{ storeEntry.country }}</span>
                      <a-tag :color="storeEntry.status === '活跃' ? 'green' : 'default'" style="font-size:10px;margin:0">{{ storeEntry.status }}</a-tag>
                    </div>
                  </div>
                </div>
                <div class="asin-store-row-right">
                  <a-tag :color="storeEntry.is_active !== false ? 'green' : 'default'" style="font-size:10px;margin:0">
                    {{ storeEntry.is_active !== false ? '在售' : '停售' }}
                  </a-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 店铺视图 -->
      <div v-if="viewMode === 'store'" class="store-view">
        <div v-for="store in stores" :key="store.id" class="store-card">
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
              <span class="asin-cnt">{{ storeAsinMap[store.id]?.length || 0 }} 个ASIN</span>
              <a-tag :color="store.status === '活跃' ? 'green' : 'default'" style="font-size:11px;margin:0">{{ store.status }}</a-tag>
              <DownOutlined :class="['expand-icon', { expanded: expandedStores.has(store.id) }]" />
            </div>
          </div>

          <div v-if="expandedStores.has(store.id)" class="store-asin-panel">
            <div v-if="!storeAsinMap[store.id]?.length" class="asin-empty">暂无ASIN</div>
            <div v-else class="store-asin-grid">
              <div v-for="item in storeAsinMap[store.id]" :key="item.id" class="store-asin-chip">
                <span class="store-asin-code">{{ item.asin }}</span>
                <span v-if="item.brand_name" class="store-asin-brand">{{ item.brand_name }}</span>
                <span v-if="item.product_name" class="store-asin-name">{{ item.product_name }}</span>
                <a-tag :color="item.is_active !== false ? 'green' : 'default'" style="font-size:10px;margin:0;margin-left:auto">
                  {{ item.is_active !== false ? '在售' : '停售' }}
                </a-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ShopOutlined, UserOutlined, DownOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

const props = defineProps<{
  companyId: string
  contacts: any[]
}>()

defineEmits<{
  (e: 'updated'): void
}>()

const loading = ref(false)
const stores = ref<any[]>([])
const storeAsinMap = ref<Record<string, any[]>>({})
const expandedStores = ref<Set<string>>(new Set())
const expandedAsins = ref<Set<string>>(new Set())
const viewMode = ref<'asin' | 'store'>('asin')

const totalAsinCount = computed(() => {
  return Object.values(storeAsinMap.value).reduce((sum, list) => sum + list.length, 0)
})

const asinGroups = computed(() => {
  const map: Record<string, any> = {}
  for (const store of stores.value) {
    const asins = storeAsinMap.value[store.id] || []
    for (const a of asins) {
      if (!map[a.asin]) {
        map[a.asin] = {
          asin: a.asin,
          brand_name: a.brand_name || '',
          product_name: a.product_name || '',
          product_image: a.product_image || '',
          product_price: a.product_price || null,
          category: a.category || '',
          stores: [],
        }
      }
      map[a.asin].stores.push({
        store_id: store.id,
        store_name: store.store_name,
        platform: store.platform,
        country: store.country,
        status: store.status,
        is_active: a.is_active,
      })
    }
  }
  return Object.values(map).sort((a, b) => a.asin.localeCompare(b.asin))
})

const brandSummary = computed(() => {
  const map: Record<string, number> = {}
  for (const g of asinGroups.value) {
    const brand = g.brand_name || '未知品牌'
    map[brand] = (map[brand] || 0) + 1
  }
  return Object.entries(map).map(([brand, asinCount]) => ({ brand, asinCount })).sort((a, b) => b.asinCount - a.asinCount)
})

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

function toggleAsin(asin: string) {
  const s = new Set(expandedAsins.value)
  if (s.has(asin)) s.delete(asin)
  else s.add(asin)
  expandedAsins.value = s
}

watch(() => props.companyId, (id) => { if (id) loadStores() }, { immediate: true })

defineExpose({ loadStores })
</script>

<style scoped>
.store-manager { padding: 0; }

.store-count-badge {
  font-size: 11px; padding: 1px 8px;
  background: #dbeafe; color: #1d4ed8;
  border-radius: 20px;
}
.asin-count-badge {
  font-size: 11px; padding: 1px 8px;
  background: #dcfce7; color: #166534;
  border-radius: 20px;
}

.view-tabs {
  display: flex; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;
}
.view-tab {
  padding: 3px 12px; font-size: 12px; cursor: pointer;
  color: #6b7280; background: #fff; transition: all 0.15s;
}
.view-tab:hover { background: #f3f4f6; }
.view-tab.active { background: #2563eb; color: #fff; }

/* 空状态 */
.empty-state {
  text-align: center; padding: 28px 0;
}
.empty-icon { font-size: 28px; margin-bottom: 6px; }
.empty-title { font-size: 13px; font-weight: 600; color: #374151; }
.empty-sub { font-size: 12px; color: #9ca3af; margin-top: 3px; }

/* 概览品牌条 */
.overview-bar {
  display: flex; flex-wrap: wrap; gap: 6px;
  padding: 8px 0 10px; border-bottom: 1px solid #f0f0f0; margin-bottom: 10px;
}
.overview-brand-chip {
  display: flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 20px;
  background: #f8fafc; border: 1px solid #e5e7eb;
  font-size: 11px; color: #374151;
}
.brand-chip-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #2563eb; flex-shrink: 0;
}
.brand-chip-name { font-weight: 600; }
.brand-chip-count { color: #6b7280; }

/* ASIN 视图 */
.asin-view { display: flex; flex-direction: column; gap: 6px; }

.asin-card {
  border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;
  background: #fff; transition: box-shadow 0.15s;
}
.asin-card:hover { box-shadow: 0 1px 6px rgba(0,0,0,0.07); }

.asin-card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; cursor: pointer; gap: 10px;
}
.asin-card-header:hover { background: #f8fafc; }

.asin-card-left { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0; }

.asin-thumb {
  width: 44px; height: 44px; border-radius: 8px;
  object-fit: cover; flex-shrink: 0; border: 1px solid #f0f0f0;
}
.asin-thumb-placeholder {
  width: 44px; height: 44px; border-radius: 8px;
  background: #f3f4f6; display: flex; align-items: center;
  justify-content: center; color: #9ca3af; font-size: 9px;
  font-weight: 700; flex-shrink: 0; letter-spacing: -0.5px;
}

.asin-main-info { flex: 1; min-width: 0; }
.asin-code-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 3px; }
.asin-code {
  font-size: 13px; font-weight: 700; color: #1f2937;
  font-family: monospace; letter-spacing: 0.5px;
}
.asin-product-name {
  font-size: 12px; color: #6b7280;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  margin-bottom: 3px;
}
.asin-stores-summary {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: #9ca3af; flex-wrap: wrap;
}
.store-inline-name { color: #374151; font-weight: 500; }
.store-inline-country { color: #9ca3af; }

.asin-card-right { flex-shrink: 0; }

/* ASIN 详情展开 */
.asin-detail-panel {
  border-top: 1px solid #f0f0f0;
  padding: 8px 14px 10px;
  background: #fafafa;
}
.asin-detail-stores { display: flex; flex-direction: column; gap: 6px; }

.asin-store-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 10px; background: #fff;
  border: 1px solid #e5e7eb; border-radius: 8px;
}
.asin-store-row-left { display: flex; align-items: center; gap: 8px; }
.store-dot-icon {
  width: 28px; height: 28px; border-radius: 6px;
  background: #dbeafe; color: #1d4ed8;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; flex-shrink: 0;
}
.detail-store-name { font-size: 13px; font-weight: 600; color: #1f2937; }
.detail-store-meta { display: flex; align-items: center; gap: 5px; margin-top: 2px; }
.meta-tag { font-size: 11px; color: #6b7280; }
.asin-store-row-right { flex-shrink: 0; }

/* 店铺视图 */
.store-view { display: flex; flex-direction: column; gap: 6px; }

.store-card {
  border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background: #fff;
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
.asin-cnt { font-size: 11px; color: #6b7280; white-space: nowrap; }

.store-asin-panel {
  border-top: 1px solid #f0f0f0; padding: 8px 12px 10px; background: #fafafa;
}
.asin-empty { text-align: center; color: #9ca3af; font-size: 12px; padding: 8px 0; }

.store-asin-grid { display: flex; flex-direction: column; gap: 5px; }
.store-asin-chip {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; background: #fff;
  border: 1px solid #e5e7eb; border-radius: 8px;
  font-size: 12px;
}
.store-asin-code {
  font-family: monospace; font-weight: 700; font-size: 12px;
  color: #1f2937; min-width: 90px;
}
.store-asin-brand {
  padding: 1px 7px; border-radius: 4px;
  background: #eff6ff; color: #1d4ed8; font-size: 11px;
}
.store-asin-name {
  flex: 1; color: #6b7280; font-size: 11px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.expand-icon {
  font-size: 11px; color: #9ca3af;
  transition: transform 0.2s;
}
.expand-icon.expanded { transform: rotate(180deg); }
</style>
