<template>
  <div class="store-manager">
    <div class="section-head">店铺 & ASIN</div>

    <div v-if="loading" class="state-wrap"><a-spin /></div>
    <div v-else-if="!stores.length" class="state-wrap">
      <div class="empty-title">暂无店铺与ASIN数据</div>
      <div class="empty-sub">商务下单选择该客户后，店铺和ASIN将自动同步至此</div>
    </div>

    <template v-else>
      <div class="dim-tabs">
        <button
          v-for="tab in dimensionTabs"
          :key="tab.key"
          type="button"
          :class="['dim-tab', { active: dimension === tab.key }]"
          @click="switchDimension(tab.key)"
        >
          <span>{{ tab.label }}</span>
          <span class="dim-tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <div v-if="previewItems.length" class="dim-list">
        <div v-for="item in previewItems" :key="item.key" class="dim-row">
          <span class="dim-title" :class="{ 'is-code': item.code }" :title="item.title">{{ item.title }}</span>
          <span v-if="item.meta" class="dim-meta" :title="item.meta">{{ item.meta }}</span>
          <span class="dim-count">{{ item.countLabel }}</span>
        </div>
      </div>
      <div v-else class="dim-empty">{{ emptyDimensionText }}</div>

      <button
        v-if="activeItems.length > PREVIEW_LIMIT"
        type="button"
        class="more-link more-link-block"
        @click="openListModal"
      >
        展开更多（还有 {{ activeItems.length - PREVIEW_LIMIT }} 条）
      </button>
    </template>

    <a-modal
      v-model:open="modalOpen"
      :title="modalTitle"
      :footer="null"
      :width="760"
      :z-index="2000"
      :body-style="{ padding: '12px 16px 16px' }"
    >
      <a-input
        v-model:value="modalKeyword"
        class="modal-search"
        allow-clear
        :placeholder="listSearchPlaceholder"
      />
      <div v-if="modalListItems.length" class="modal-list">
        <div v-for="item in modalListItems" :key="item.key" class="dim-row">
          <span class="dim-title" :class="{ 'is-code': item.code }" :title="item.title">{{ item.title }}</span>
          <span v-if="item.meta" class="dim-meta" :title="item.meta">{{ item.meta }}</span>
          <span class="dim-count">{{ item.countLabel }}</span>
        </div>
      </div>
      <div v-else class="dim-empty">没有匹配内容</div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps<{
  companyId: string
  contacts: any[]
}>()

defineEmits<{
  (e: 'updated'): void
}>()

const PREVIEW_LIMIT = 4

type DimKey = 'store' | 'asin' | 'brand'

interface ChildLine {
  key: string
  primary: string
  secondary: string
  extra: string
  status: string
  code: boolean
}

interface DimFact {
  label: string
  value: string
}

interface DimItem {
  key: string
  title: string
  meta: string
  countLabel: string
  status: string
  image: string
  code: boolean
  searchText: string
  facts: DimFact[]
  children: ChildLine[]
  emptyChildren: string
}

interface AsinGroup {
  asin: string
  brand_name: string
  product_name: string
  product_image: string
  product_price: unknown
  category: string
  stores: Array<{
    store_id: string
    store_name: string
    platform: string
    country: string
    status: string
  }>
}

const loading = ref(false)
const stores = ref<any[]>([])
const storeAsinMap = ref<Record<string, any[]>>({})
const dimension = ref<DimKey>('asin')
const modalOpen = ref(false)
const modalKeyword = ref('')

function joinParts(parts: Array<string | null | undefined>) {
  return parts.map(part => String(part || '').trim()).filter(Boolean).join(' · ')
}

function formatPlatform(platform: unknown) {
  const value = String(platform || '').trim()
  if (/^amazon$/i.test(value) || value === '亚马逊') return 'Amz'
  return value
}

function formatChannel(platform: unknown, country: unknown) {
  return joinParts([formatPlatform(platform), String(country || '').trim()])
}

function uniqueTexts(values: Array<string | null | undefined>) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))]
}

function formatPrice(price: unknown) {
  if (price === null || price === undefined || price === '') return ''
  const num = Number(price)
  if (!Number.isFinite(num) || num === 0) return ''
  return `$${num}`
}

function saleLabel(isActive: unknown) {
  return isActive !== false ? '在售' : '停售'
}

function searchBlob(parts: Array<string | null | undefined>) {
  return parts.map(part => String(part || '').trim()).filter(Boolean).join(' ')
}

const asinGroups = computed<AsinGroup[]>(() => {
  const map = new Map<string, AsinGroup>()
  for (const store of stores.value) {
    const asins = storeAsinMap.value[store.id] || []
    for (const item of asins) {
      const code = String(item.asin || '').trim() || '—'
      if (!map.has(code)) {
        map.set(code, {
          asin: code,
          brand_name: item.brand_name || '',
          product_name: item.product_name || '',
          product_image: item.product_image || '',
          product_price: item.product_price,
          category: item.category || '',
          stores: [],
        })
      }
      const group = map.get(code)!
      if (!group.brand_name && item.brand_name) group.brand_name = item.brand_name
      if (!group.product_name && item.product_name) group.product_name = item.product_name
      if (!group.product_image && item.product_image) group.product_image = item.product_image
      if (!formatPrice(group.product_price) && formatPrice(item.product_price)) group.product_price = item.product_price
      if (!group.category && item.category) group.category = item.category
      group.stores.push({
        store_id: store.id,
        store_name: store.store_name || '',
        platform: formatPlatform(store.platform),
        country: store.country || '',
        status: saleLabel(item.is_active),
      })
    }
  }
  return [...map.values()].sort((a, b) => a.asin.localeCompare(b.asin))
})

const storeItems = computed<DimItem[]>(() => {
  return stores.value.map((store) => {
    const asins = storeAsinMap.value[store.id] || []
    const channel = formatChannel(store.platform, store.country)
    const children: ChildLine[] = asins.map((item: any) => ({
      key: String(item.id || `${store.id}-${item.asin}`),
      primary: item.asin || '—',
      secondary: joinParts([item.brand_name, channel]),
      extra: item.product_name || '',
      status: saleLabel(item.is_active),
      code: true,
    }))
    const facts: DimFact[] = []
    if (store.contact_name) facts.push({ label: '负责人', value: store.contact_name })
    if (store.store_code) facts.push({ label: '店铺编码', value: store.store_code })
    if (store.notes) facts.push({ label: '备注', value: store.notes })
    return {
      key: String(store.id),
      title: store.store_name || '未命名店铺',
      meta: channel,
      countLabel: `${asins.length} 个ASIN`,
      status: '',
      image: '',
      code: false,
      searchText: searchBlob([
        store.store_name,
        channel,
        store.platform,
        store.country,
        store.contact_name,
        store.store_code,
        store.notes,
        ...children.flatMap(child => [child.primary, child.secondary, child.extra, child.status]),
      ]),
      facts,
      children,
      emptyChildren: '暂无ASIN',
    }
  })
})

const asinItems = computed<DimItem[]>(() => {
  return asinGroups.value.map((group) => {
    const children: ChildLine[] = group.stores.map((store) => ({
      key: `${group.asin}-${store.store_id}`,
      primary: store.store_name || '未命名店铺',
      secondary: formatChannel(store.platform, store.country),
      extra: '',
      status: store.status,
      code: false,
    }))
    const price = formatPrice(group.product_price)
    const brand = group.brand_name || '未知品牌'
    const storeNames = uniqueTexts(group.stores.map(store => store.store_name))
    const channels = uniqueTexts(group.stores.map(store => formatChannel(store.platform, store.country)))
    const facts: DimFact[] = [{ label: '品牌', value: brand }]
    if (group.product_name) facts.push({ label: '产品', value: group.product_name })
    if (price) facts.push({ label: '价格', value: price })
    if (group.category) facts.push({ label: '类目', value: group.category })
    return {
      key: group.asin,
      title: group.asin,
      meta: channels.join('、'),
      countLabel: `${storeNames.length} 个店铺`,
      status: '',
      image: group.product_image || '',
      code: true,
      searchText: searchBlob([
        group.asin,
        brand,
        group.product_name,
        price,
        group.category,
        ...children.flatMap(child => [child.primary, child.secondary, child.status]),
      ]),
      facts,
      children,
      emptyChildren: '暂无店铺',
    }
  })
})

const brandItems = computed<DimItem[]>(() => {
  const map = new Map<string, AsinGroup[]>()
  for (const group of asinGroups.value) {
    const brand = group.brand_name || '未知品牌'
    const list = map.get(brand) || []
    list.push(group)
    map.set(brand, list)
  }
  return [...map.entries()]
    .sort((a, b) => {
      if (a[0] === '未知品牌') return 1
      if (b[0] === '未知品牌') return -1
      return b[1].length - a[1].length || a[0].localeCompare(b[0], 'zh')
    })
    .map(([brand, groups]) => {
      const storeNames = uniqueTexts(groups.flatMap(group => group.stores.map(store => store.store_name)))
      const channels = uniqueTexts(groups.flatMap(group => group.stores.map(store => formatChannel(store.platform, store.country))))
      const children: ChildLine[] = groups.flatMap((group) => group.stores.map((store) => ({
        key: `${brand}-${group.asin}-${store.store_id}`,
        primary: group.asin,
        secondary: joinParts([store.store_name, formatChannel(store.platform, store.country)]),
        extra: group.product_name || '',
        status: '',
        code: true,
      })))
      const storeValue = storeNames.length > 3
        ? `${storeNames.slice(0, 3).join('、')} 等${storeNames.length}家`
        : storeNames.join('、')
      return {
        key: brand,
        title: brand,
        meta: channels.join('、'),
        countLabel: `${groups.length} 个ASIN`,
        status: '',
        image: '',
        code: false,
        searchText: searchBlob([
          brand,
          storeValue,
          ...channels,
          ...storeNames,
          ...children.flatMap(child => [child.primary, child.secondary, child.extra]),
        ]),
        facts: storeNames.length ? [{ label: '涉及店铺', value: storeValue }] : [],
        children,
        emptyChildren: '暂无ASIN',
      }
    })
})

const dimensionTabs = computed(() => [
  { key: 'asin' as const, label: 'ASIN', count: asinItems.value.length },
  { key: 'store' as const, label: '店铺', count: storeItems.value.length },
  { key: 'brand' as const, label: '品牌', count: brandItems.value.length },
])

const activeItems = computed(() => {
  if (dimension.value === 'store') return storeItems.value
  if (dimension.value === 'asin') return asinItems.value
  return brandItems.value
})

const previewItems = computed(() => activeItems.value.slice(0, PREVIEW_LIMIT))

const emptyDimensionText = computed(() => {
  if (dimension.value === 'store') return '暂无店铺'
  if (dimension.value === 'asin') return '暂无ASIN'
  return '暂无品牌'
})

const modalListItems = computed(() => {
  const keyword = modalKeyword.value.trim().toLowerCase()
  if (!keyword) return activeItems.value
  return activeItems.value.filter(item => item.searchText.toLowerCase().includes(keyword))
})

const modalTitle = computed(() => {
  if (dimension.value === 'store') return `全部店铺（${activeItems.value.length}）`
  if (dimension.value === 'asin') return `全部ASIN（${activeItems.value.length}）`
  return `全部品牌（${activeItems.value.length}）`
})

const listSearchPlaceholder = computed(() => {
  if (dimension.value === 'store') return '搜索店铺、负责人或ASIN'
  if (dimension.value === 'asin') return '搜索ASIN、品牌、产品或店铺'
  return '搜索品牌、ASIN或店铺'
})

function switchDimension(next: DimKey) {
  if (dimension.value === next) return
  dimension.value = next
  modalOpen.value = false
}

function openListModal() {
  modalKeyword.value = ''
  modalOpen.value = true
}

async function loadStores() {
  if (!props.companyId) return
  loading.value = true
  try {
    const { data: storeData } = await supabase
      .from('client_stores')
      .select('*, client_contacts(name, role)')
      .eq('company_id', props.companyId)
      .order('created_at', { ascending: true })

    stores.value = (storeData || []).map((store: any) => ({
      ...store,
      contact_name: store.client_contacts?.name || '',
    }))

    if (stores.value.length) {
      const storeIds = stores.value.map((store: any) => store.id)
      const { data: asinData } = await supabase
        .from('client_store_asins')
        .select('*')
        .in('store_id', storeIds)
        .order('created_at', { ascending: true })

      const map: Record<string, any[]> = {}
      for (const item of asinData || []) {
        if (!map[item.store_id]) map[item.store_id] = []
        map[item.store_id].push(item)
      }
      storeAsinMap.value = map
    } else {
      storeAsinMap.value = {}
    }
  } finally {
    loading.value = false
  }
}

watch(() => props.companyId, (id) => {
  dimension.value = 'asin'
  modalOpen.value = false
  if (id) loadStores()
}, { immediate: true })

defineExpose({ loadStores })
</script>

<style scoped>
.store-manager { padding: 0; }

.section-head {
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
}

.state-wrap { text-align: center; padding: 20px 0; }
.empty-title { font-size: 13px; font-weight: 600; color: #1a1a2e; }
.empty-sub { font-size: 12px; color: #9ca3af; margin-top: 4px; }

.dim-tabs { display: flex; gap: 8px; margin-bottom: 10px; }
.dim-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #6b7280;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}
.dim-tab:hover { border-color: #2563eb; color: #2563eb; }
.dim-tab.active { background: #2563eb; border-color: #2563eb; color: #fff; }
.dim-tab.active:hover { color: #fff; }
.dim-tab-count { font-size: 11px; color: #6b7280; }
.dim-tab.active .dim-tab-count { color: #fff; }

.dim-list,
.modal-list {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.modal-list { max-height: min(64vh, 640px); overflow: auto; }

.dim-row + .dim-row { border-top: 1px solid #f0f0f0; }

.dim-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
}

.dim-title {
  max-width: 42%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
}
.dim-title.is-code,
.dim-child-primary.is-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.3px;
}
.dim-meta,
.dim-child-extra {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #6b7280;
}
.dim-status,
.dim-count,
.dim-child-status {
  flex-shrink: 0;
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}
.dim-status.is-on,
.dim-child-status.is-on { color: #059669; }
.dim-status.is-off,
.dim-child-status.is-off { color: #9ca3af; }

.expand-icon {
  flex-shrink: 0;
  font-size: 11px;
  color: #9ca3af;
  transition: transform 0.2s;
}
.expand-icon.expanded { transform: rotate(180deg); }

.dim-detail {
  padding: 8px 12px 10px;
  background: #f5f7fa;
  border-top: 1px solid #f0f0f0;
}
.dim-facts { display: flex; gap: 10px; margin-bottom: 8px; }
.dim-image {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  flex-shrink: 0;
  background: #fff;
}
.dim-fact-list { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.dim-fact { display: flex; gap: 8px; font-size: 12px; min-width: 0; }
.dim-fact-label { flex-shrink: 0; width: 56px; color: #9ca3af; }
.dim-fact-value { color: #1a1a2e; word-break: break-word; }

.dim-children.scroll { max-height: 320px; overflow: auto; }
.dim-child {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 6px 0;
}
.dim-child + .dim-child { border-top: 1px solid #f0f0f0; }
.dim-child-primary {
  flex-shrink: 0;
  max-width: 46%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
  color: #1a1a2e;
}
.dim-child-secondary {
  flex-shrink: 0;
  max-width: 34%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #6b7280;
}

.dim-empty,
.dim-empty-line { font-size: 12px; color: #9ca3af; }
.dim-empty { padding: 8px 0 2px; }
.dim-empty-line { padding: 4px 0; }

.more-link {
  display: inline-block;
  margin-top: 6px;
  padding: 0;
  border: none;
  background: transparent;
  color: #2563eb;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}
.more-link:hover { text-decoration: underline; }
.more-link-block {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;
  background: #fff;
  text-align: center;
}
.more-link-block:hover { border-color: #2563eb; background: #f5f7fa; }

.modal-search { margin-bottom: 10px; }
.focus-children {
  max-height: min(60vh, 520px);
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 2px 12px;
  background: #fff;
}
</style>
