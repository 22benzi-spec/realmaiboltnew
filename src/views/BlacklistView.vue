<template>
  <div class="page-content">
    <div class="page-header">
      <div>
        <h1 class="page-title">买手黑名单</h1>
        <p class="page-subtitle">共 {{ blacklist.length }} 位买手被列入黑名单</p>
      </div>
      <div class="toolbar">
        <a-input-search v-model:value="searchText" placeholder="搜索姓名/账号/原因" style="width:240px" allow-clear @search="load" />
        <a-select v-model:value="filterCountry" style="width:120px" allow-clear placeholder="国家筛选" @change="load">
          <a-select-option v-for="c in countryOptions" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-button @click="load"><ReloadOutlined /></a-button>
      </div>
    </div>

    <div v-if="loading" class="loading-wrap">
      <a-spin size="large" />
    </div>

    <div v-else-if="blacklist.length === 0" class="empty-wrap">
      <a-empty description="暂无黑名单记录" />
    </div>

    <div v-else class="card-panel">
      <a-table
        :columns="columns"
        :data-source="blacklist"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="{ pageSize: 20, showSizeChanger: true, showTotal: (total: number) => `共 ${total} 条` }"
        :scroll="{ x: 1200 }"
        :row-class-name="() => 'clickable-row'"
        @row-click="(record: any) => openDetail(record)"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="name-cell">
              <div class="row-avatar">{{ record.name ? record.name.charAt(0).toUpperCase() : '?' }}</div>
              <div>
                <div class="row-name">{{ record.name || '—' }}</div>
                <div class="row-no">{{ record.buyer_number || '—' }}</div>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'blacklist_reason'">
            <div class="reason-cell">
              <WarningFilled class="reason-cell-icon" />
              <span>{{ record.blacklist_reason || '—' }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'country'">
            <a-tag v-if="record.country" color="default">{{ record.country }}</a-tag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'stats'">
            <span class="pill completed">{{ record.total_completed || 0 }} 单</span>
            <span v-if="record.success_rate != null" class="pill rate" style="margin-left:4px">{{ (Number(record.success_rate) * 100).toFixed(0) }}%</span>
          </template>
          <template v-else-if="column.key === 'updated_at'">
            {{ record.updated_at ? dayjs(record.updated_at).format('YYYY-MM-DD') : '—' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space @click.stop>
              <a-button type="link" size="small" @click.stop="openDetail(record)">详情</a-button>
              <a-popconfirm title="确定将此买手移出黑名单?" @confirm="removeFromBlacklist(record)">
                <a-button type="link" size="small" danger>移出黑名单</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer
      v-model:open="drawerOpen"
      :title="null"
      width="520"
      :body-style="{ padding: 0 }"
    >
      <template v-if="detailRecord">
        <div class="drawer-hero">
          <div class="drawer-avatar">{{ detailRecord.name ? detailRecord.name.charAt(0).toUpperCase() : '?' }}</div>
          <div class="drawer-title-block">
            <div class="drawer-name">{{ detailRecord.name || '—' }}</div>
            <div class="drawer-no">{{ detailRecord.buyer_number || '—' }}</div>
            <div class="drawer-tags">
              <a-tag color="red">黑名单</a-tag>
              <a-tag v-if="detailRecord.country">{{ detailRecord.country }}</a-tag>
              <a-tag v-if="detailRecord.level" :color="levelColor[detailRecord.level] || 'default'">{{ detailRecord.level }}</a-tag>
              <template v-if="detailRecord.tags && detailRecord.tags.length">
                <a-tag v-for="t in detailRecord.tags" :key="t" color="blue">{{ t }}</a-tag>
              </template>
            </div>
          </div>
        </div>

        <div class="drawer-body">
          <div class="reason-banner">
            <WarningFilled class="reason-banner-icon" />
            <div>
              <div class="reason-banner-title">黑名单原因</div>
              <div class="reason-banner-text">{{ detailRecord.blacklist_reason || '未填写原因' }}</div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-title">联系方式</div>
            <div class="detail-grid">
              <div class="detail-row" v-if="detailRecord.phone"><span class="dl">手机号</span><span class="dv">{{ detailRecord.phone }}</span></div>
              <div class="detail-row" v-if="detailRecord.email"><span class="dl">邮箱</span><span class="dv">{{ detailRecord.email }}</span></div>
              <div class="detail-row" v-if="detailRecord.paypal_email"><span class="dl">PayPal邮箱</span><span class="dv">{{ detailRecord.paypal_email }}</span></div>
              <div class="detail-row" v-if="detailRecord.facebook_name"><span class="dl">Facebook名</span><span class="dv">{{ detailRecord.facebook_name }}</span></div>
              <div class="detail-row" v-if="detailRecord.facebook_link"><span class="dl">Facebook链接</span><span class="dv"><a :href="detailRecord.facebook_link" target="_blank">查看主页</a></span></div>
              <div class="detail-row" v-if="detailRecord.chat_account"><span class="dl">聊天账号</span><span class="dv">{{ detailRecord.chat_account }}</span></div>
              <div class="detail-row" v-if="detailRecord.backup_contact"><span class="dl">备用联系</span><span class="dv">{{ detailRecord.backup_contact }}</span></div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-title">平台信息</div>
            <div class="detail-grid">
              <div class="detail-row" v-if="detailRecord.platform_account"><span class="dl">平台账号</span><span class="dv">{{ detailRecord.platform_account }}</span></div>
              <div class="detail-row" v-if="detailRecord.amazon_profile"><span class="dl">亚马逊主页</span><span class="dv"><a :href="detailRecord.amazon_profile" target="_blank">查看</a></span></div>
              <div class="detail-row" v-if="detailRecord.review_history"><span class="dl">评价历史</span><span class="dv">{{ detailRecord.review_history }}</span></div>
              <div class="detail-row" v-if="detailRecord.purchased_asins"><span class="dl">购买过的ASIN</span><span class="dv">{{ detailRecord.purchased_asins }}</span></div>
              <div class="detail-row" v-if="detailRecord.purchased_stores"><span class="dl">购买过的店铺</span><span class="dv">{{ detailRecord.purchased_stores }}</span></div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-title">交易数据</div>
            <div class="stats-row">
              <div class="stat-box">
                <div class="stat-val">{{ detailRecord.total_completed || 0 }}</div>
                <div class="stat-label">完成订单</div>
              </div>
              <div class="stat-box">
                <div class="stat-val">{{ detailRecord.success_rate != null ? (Number(detailRecord.success_rate) * 100).toFixed(0) + '%' : '—' }}</div>
                <div class="stat-label">历史成功率</div>
              </div>
              <div class="stat-box">
                <div class="stat-val">{{ detailRecord.buyer_paid_amount != null ? '¥' + Number(detailRecord.buyer_paid_amount).toFixed(2) : '—' }}</div>
                <div class="stat-label">累计付款</div>
              </div>
              <div class="stat-box">
                <div class="stat-val">{{ detailRecord.actual_refund_amount != null ? '¥' + Number(detailRecord.actual_refund_amount).toFixed(2) : '—' }}</div>
                <div class="stat-label">实际退款</div>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <div class="section-title">其他信息</div>
            <div class="detail-grid">
              <div class="detail-row" v-if="detailRecord.staff_name"><span class="dl">负责业务员</span><span class="dv">{{ detailRecord.staff_name }}</span></div>
              <div class="detail-row" v-if="detailRecord.birthday"><span class="dl">生日</span><span class="dv">{{ detailRecord.birthday }}</span></div>
              <div class="detail-row" v-if="detailRecord.last_order_date"><span class="dl">最后下单日</span><span class="dv">{{ detailRecord.last_order_date }}</span></div>
              <div class="detail-row"><span class="dl">加入黑名单</span><span class="dv">{{ detailRecord.updated_at ? dayjs(detailRecord.updated_at).format('YYYY-MM-DD HH:mm') : '—' }}</span></div>
              <div class="detail-row"><span class="dl">创建时间</span><span class="dv">{{ detailRecord.created_at ? dayjs(detailRecord.created_at).format('YYYY-MM-DD') : '—' }}</span></div>
            </div>
          </div>

          <div v-if="detailRecord.notes" class="detail-section">
            <div class="section-title">备注</div>
            <div class="notes-box">{{ detailRecord.notes }}</div>
          </div>

          <div class="drawer-actions">
            <a-popconfirm title="确定将此买手移出黑名单?" @confirm="removeFromBlacklist(detailRecord); drawerOpen = false">
              <a-button type="primary" danger block>移出黑名单</a-button>
            </a-popconfirm>
          </div>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, WarningFilled } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const blacklist = ref<any[]>([])
const searchText = ref('')
const filterCountry = ref('')
const drawerOpen = ref(false)
const detailRecord = ref<any>(null)

const levelColor: Record<string, string> = { '优质': 'gold', '普通': 'default', '新手': 'cyan' }

const columns = [
  { title: '买手', key: 'name', width: 160 },
  { title: '国家', key: 'country', width: 80 },
  { title: '平台账号', dataIndex: 'platform_account', key: 'platform_account', width: 140 },
  { title: 'PayPal邮箱', dataIndex: 'paypal_email', key: 'paypal_email', width: 180 },
  { title: '手机', dataIndex: 'phone', key: 'phone', width: 130 },
  { title: '黑名单原因', key: 'blacklist_reason', ellipsis: true },
  { title: '完成/成功率', key: 'stats', width: 120 },
  { title: '负责业务员', dataIndex: 'staff_name', key: 'staff_name', width: 100 },
  { title: '加入时间', key: 'updated_at', width: 110 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' },
]

const countryOptions = computed(() => {
  const set = new Set(blacklist.value.map(r => r.country).filter(Boolean))
  return Array.from(set)
})

async function load() {
  loading.value = true
  try {
    let query = supabase.from('erp_buyers').select('*').eq('status', '黑名单').order('updated_at', { ascending: false })
    if (searchText.value) {
      query = query.or(`name.ilike.%${searchText.value}%,platform_account.ilike.%${searchText.value}%,blacklist_reason.ilike.%${searchText.value}%,paypal_email.ilike.%${searchText.value}%`)
    }
    if (filterCountry.value) query = query.eq('country', filterCountry.value)
    const { data, error } = await query
    if (error) throw error
    blacklist.value = data || []
  } finally {
    loading.value = false
  }
}

function openDetail(record: any) {
  detailRecord.value = record
  drawerOpen.value = true
}

async function removeFromBlacklist(record: any) {
  const { error } = await supabase.from('erp_buyers').update({ status: '暂停', blacklist_reason: null }).eq('id', record.id)
  if (error) { message.error('操作失败'); return }
  message.success('已移出黑名单')
  load()
}

onMounted(load)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0 0 4px; }
.page-subtitle { font-size: 13px; color: #6b7280; margin: 0; }
.toolbar { display: flex; gap: 10px; align-items: center; }

.loading-wrap, .empty-wrap { display: flex; justify-content: center; align-items: center; min-height: 300px; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }

.name-cell { display: flex; align-items: center; gap: 8px; }
.row-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0;
}
.row-name { font-weight: 600; font-size: 13px; color: #111827; }
.row-no { font-size: 11px; color: #9ca3af; font-family: monospace; }

.reason-cell { display: flex; align-items: flex-start; gap: 5px; color: #c2410c; font-size: 12px; }
.reason-cell-icon { color: #f97316; flex-shrink: 0; margin-top: 2px; }

.pill { font-size: 11px; padding: 2px 8px; border-radius: 999px; }
.pill.completed { background: #f0fdf4; color: #15803d; }
.pill.rate { background: #eff6ff; color: #1d4ed8; }

/* Drawer */
.drawer-hero {
  background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%);
  border-bottom: 1px solid #fecaca;
  padding: 24px 24px 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.drawer-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 22px; flex-shrink: 0;
}
.drawer-title-block { flex: 1; }
.drawer-name { font-size: 20px; font-weight: 700; color: #111827; }
.drawer-no { font-size: 12px; color: #9ca3af; font-family: monospace; margin: 2px 0 8px; }
.drawer-tags { display: flex; flex-wrap: wrap; gap: 4px; }

.drawer-body { padding: 0 24px 24px; }

.reason-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 10px;
  padding: 14px 16px;
  margin: 16px 0;
}
.reason-banner-icon { color: #f97316; font-size: 20px; flex-shrink: 0; margin-top: 2px; }
.reason-banner-title { font-size: 12px; color: #9a3412; font-weight: 600; margin-bottom: 2px; }
.reason-banner-text { font-size: 13px; color: #c2410c; line-height: 1.5; }

.detail-section { margin-bottom: 20px; }
.section-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6; }

.detail-grid { display: flex; flex-direction: column; gap: 6px; }
.detail-row { display: flex; align-items: baseline; gap: 8px; }
.dl { font-size: 12px; color: #9ca3af; white-space: nowrap; min-width: 90px; }
.dv { font-size: 13px; color: #111827; font-weight: 500; word-break: break-all; }

.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.stat-box { background: #f9fafb; border-radius: 8px; padding: 12px 8px; text-align: center; }
.stat-val { font-size: 18px; font-weight: 700; color: #111827; }
.stat-label { font-size: 11px; color: #9ca3af; margin-top: 2px; }

.notes-box { background: #f9fafb; border-radius: 8px; padding: 12px; font-size: 13px; color: #374151; line-height: 1.6; white-space: pre-wrap; }

.drawer-actions { margin-top: 24px; padding-top: 20px; border-top: 1px solid #f3f4f6; }
</style>
