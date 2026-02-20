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

    <div v-else class="card-grid">
      <div v-for="record in blacklist" :key="record.id" class="blacklist-card" @click="openDetail(record)">
        <div class="card-header-row">
          <div class="buyer-avatar">{{ record.name ? record.name.charAt(0).toUpperCase() : '?' }}</div>
          <div class="buyer-meta">
            <div class="buyer-name">{{ record.name || '—' }}</div>
            <div class="buyer-no">{{ record.buyer_number || '—' }}</div>
          </div>
          <div class="card-badges">
            <a-tag color="red" style="margin:0">黑名单</a-tag>
            <a-tag v-if="record.country" color="default" style="margin:0;margin-left:4px">{{ record.country }}</a-tag>
          </div>
        </div>

        <div class="reason-box">
          <WarningFilled class="reason-icon" />
          <span>{{ record.blacklist_reason || '未填写原因' }}</span>
        </div>

        <div class="info-grid">
          <div class="info-item" v-if="record.platform_account">
            <span class="info-label">平台账号</span>
            <span class="info-val">{{ record.platform_account }}</span>
          </div>
          <div class="info-item" v-if="record.paypal_email">
            <span class="info-label">PayPal</span>
            <span class="info-val">{{ record.paypal_email }}</span>
          </div>
          <div class="info-item" v-if="record.phone">
            <span class="info-label">手机</span>
            <span class="info-val">{{ record.phone }}</span>
          </div>
          <div class="info-item" v-if="record.facebook_name">
            <span class="info-label">Facebook</span>
            <span class="info-val">{{ record.facebook_name }}</span>
          </div>
          <div class="info-item" v-if="record.staff_name">
            <span class="info-label">负责业务员</span>
            <span class="info-val">{{ record.staff_name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">加入时间</span>
            <span class="info-val">{{ record.updated_at ? dayjs(record.updated_at).format('YYYY-MM-DD') : '—' }}</span>
          </div>
        </div>

        <div class="card-footer">
          <div class="stat-pills">
            <span class="pill completed">完成 {{ record.total_completed || 0 }} 单</span>
            <span v-if="record.success_rate != null" class="pill rate">成功率 {{ (Number(record.success_rate) * 100).toFixed(0) }}%</span>
          </div>
          <a-popconfirm title="确定将此买手移出黑名单?" @confirm.stop="removeFromBlacklist(record)" @click.stop>
            <a-button size="small" type="link" danger>移出黑名单</a-button>
          </a-popconfirm>
        </div>
      </div>
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

.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }

.blacklist-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #fecaca;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.15s;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.blacklist-card:hover { box-shadow: 0 4px 16px rgba(220,38,38,0.12); transform: translateY(-2px); }

.card-header-row { display: flex; align-items: center; gap: 10px; }
.buyer-avatar {
  width: 42px; height: 42px; border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 16px; flex-shrink: 0;
}
.buyer-meta { flex: 1; min-width: 0; }
.buyer-name { font-weight: 700; font-size: 14px; color: #111827; }
.buyer-no { font-size: 11px; color: #9ca3af; font-family: monospace; }
.card-badges { display: flex; align-items: center; flex-shrink: 0; }

.reason-box {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: #c2410c;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.5;
}
.reason-icon { color: #f97316; margin-top: 1px; flex-shrink: 0; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
.info-item { display: flex; flex-direction: column; }
.info-label { font-size: 10px; color: #9ca3af; }
.info-val { font-size: 12px; color: #374151; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 4px; border-top: 1px solid #f3f4f6; }
.stat-pills { display: flex; gap: 6px; }
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
