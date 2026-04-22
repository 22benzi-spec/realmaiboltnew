<template>
  <div class="page-content">
    <h1 class="page-title">付款审批</h1>

    <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
      <a-tab-pane key="paypal" tab="贝宝返款" />
      <a-tab-pane key="gift" tab="礼品卡返款" />
      <a-tab-pane key="other" tab="其他付款" />
    </a-tabs>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search
          v-model:value="filterSearch"
          :placeholder="searchPlaceholder"
          style="width:260px"
          @search="reloadFromFirstPage"
          allow-clear
          @change="onSearchChange"
        />
        <a-select
          v-if="activeTab === 'other'"
          v-model:value="filterOtherCategory"
          style="width:140px"
          @change="reloadFromFirstPage"
          allow-clear
          placeholder="付款类型"
        >
          <a-select-option v-for="item in otherRefundCategoryOptions" :key="item" :value="item">{{ item }}</a-select-option>
        </a-select>
        <a-select
          v-if="activeTab === 'paypal'"
          v-model:value="selectedPaypalAccountId"
          style="width:280px"
          placeholder="选择我方转款 PayPal 邮箱"
          show-search
          option-filter-prop="label"
        >
          <a-select-option v-for="acc in paypalAccounts" :key="acc.id" :value="acc.id" :label="acc.email">
            <div>{{ acc.email }}</div>
            <div class="select-sub">{{ acc.account_alias }} · {{ acc.owner_name }}</div>
          </a-select-option>
        </a-select>
        <a-button @click="load"><ReloadOutlined /> 刷新</a-button>
        <span class="total-hint">{{ pagination.total }} 条</span>
      </div>

      <div v-if="activeTab === 'paypal'" class="queue-hint">
        <span>先在顶部选择我方转款贝宝邮箱，再针对子订单点击「返款」即可处理。</span>
      </div>
      <div v-if="activeTab === 'gift'" class="queue-hint">
        <span>点击「礼品卡返款」会弹出抽屉，展示礼品卡剩余库存和推荐返款面值组合。</span>
      </div>
      <div v-if="activeTab === 'other'" class="queue-hint">
        <span>其他付款用于商务提交的产品截单付款、佣金付款、任务付款等业务付款场景，当前已填充一组模拟数据供你预览。</span>
      </div>
      <div v-if="selectedBatchRows.length" class="batch-bar">
        <span>已选择 <strong>{{ selectedBatchRows.length }}</strong> 条</span>
        <span>{{ batchTargetLabel }}</span>
        <span>自动合计 <strong>{{ selectedBatchTotalText }}</strong></span>
        <a-button v-if="activeTab === 'paypal'" type="primary" size="small" @click="openPaypalProcess(undefined, true)">批量返款</a-button>
        <a-button v-else-if="activeTab === 'gift'" type="primary" size="small" @click="openGiftProcess(undefined, true)">批量礼品卡返款</a-button>
        <a-button v-else type="primary" size="small" @click="openOtherProcess(undefined, true)">批量处理付款</a-button>
        <a-button size="small" @click="clearBatchSelection">清空</a-button>
      </div>

      <a-table
        :columns="tableColumns"
        :data-source="requests"
        :loading="loading"
        :pagination="pagination"
        :row-selection="rowSelection"
        row-key="id"
        size="middle"
        :scroll="{ x: 1380 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'info'">
            <div class="cell-info">
              <div class="cell-subno">{{ record.sub_order_number || record.sub_order_id || '—' }}</div>
              <div class="cell-product">{{ record.product_name || record.customer_name || '—' }}</div>
              <div class="cell-meta">{{ record.asin || record.refund_reason || '—' }} · {{ record.store_name || record.payout_method || '—' }}</div>
            </div>
          </template>
          <template v-if="column.key === 'buyer'">
            <div>{{ record.buyer_name || '—' }}</div>
          </template>
          <template v-if="column.key === 'paypal_email'">
            <span class="mono-cell">{{ record.buyer_paypal_email || '—' }}</span>
          </template>
          <template v-if="column.key === 'receipt_required'">
            <a-tag :color="record._receipt_required === '需要' ? 'orange' : 'default'">{{ record._receipt_required || '不需要' }}</a-tag>
          </template>
          <template v-if="column.key === 'refund_times'">
            <span>{{ record._refund_times_label || '首次' }}</span>
          </template>
          <template v-if="column.key === 'notes_col'">
            <span class="note-preview">{{ record.notes || '—' }}</span>
          </template>
          <template v-if="column.key === 'receipt'">
            <a-space size="small">
              <a v-if="record.paypal_receipt_screenshot" :href="record.paypal_receipt_screenshot" target="_blank" class="result-link">查看水单</a>
              <a
                v-if="activeTab === 'paypal'"
                class="re-edit-link"
                @click="openPaypalReceipt(record)"
              >{{ record.paypal_receipt_screenshot ? '补传水单' : '上传水单' }}</a>
              <a
                v-else-if="activeTab === 'other' && record.status === '待处理'"
                class="re-edit-link"
                @click="openOtherProcess(record)"
              >{{ record.paypal_receipt_screenshot ? '补传水单' : '上传水单' }}</a>
            </a-space>
          </template>
          <template v-if="column.key === 'refund_method'">
            <a-tag :color="methodColor(record.refund_method)">{{ refundMethodLabel(record) }}</a-tag>
            <div v-if="record.refund_sequence" class="cell-seq">{{ record.refund_sequence }}</div>
          </template>
          <template v-if="column.key === 'refund_amount'">
            <span class="amount-usd">{{ formatRecordAmount(record) }}</span>
            <div v-if="activeTab === 'other' && otherRefundOrderCountLabel(record)" class="cell-product-price">退款单量 {{ otherRefundOrderCountLabel(record) }}</div>
            <div v-else-if="record.product_price" class="cell-product-price">产品售价 ${{ money(record.product_price) }}</div>
          </template>
          <template v-if="column.key === 'refund_category'">
            <span>{{ record.refund_category || '—' }}</span>
          </template>
          <template v-if="column.key === 'payout_account'">
            <div>{{ record.payout_account || '—' }}</div>
            <div class="cell-product-price">{{ record.payout_method || '—' }}</div>
          </template>
          <template v-if="column.key === 'refund_order_count'">
            <span>{{ otherRefundOrderCountLabel(record) || '—' }}</span>
          </template>
          <template v-if="column.key === 'action'">
            <a-space size="small" wrap>
              <a-button
                v-if="activeTab === 'paypal' && record.status === '待处理'"
                type="primary"
                size="small"
                @click="openPaypalProcess(record)"
              >返款</a-button>
              <a-button
                v-else-if="activeTab === 'gift' && record.status === '待处理'"
                type="primary"
                size="small"
                @click="openGiftProcess(record)"
              >礼品卡返款</a-button>
              <a-button
                v-else-if="activeTab === 'other' && record.status === '待处理'"
                type="primary"
                size="small"
                @click="openOtherProcess(record)"
              >处理付款</a-button>
              <span v-else class="text-gray">—</span>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer v-model:open="detailOpen" title="退款详情" width="620" placement="right">
      <template v-if="currentRequest">
        <div class="drawer-section">
          <div class="drawer-section-title">申请信息</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">子订单号</span>
              <span class="detail-val mono">{{ currentRequest.sub_order_number }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">买手</span>
              <span class="detail-val">{{ currentRequest.buyer_name || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">付款方式</span>
              <span class="detail-val">{{ refundMethodLabel(currentRequest) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">申请金额</span>
              <span class="detail-val amount-usd-lg">{{ formatRecordAmount(currentRequest) }}</span>
            </div>
            <div v-if="currentRequest.refund_category" class="detail-item">
              <span class="detail-label">付款类型</span>
              <span class="detail-val">{{ currentRequest.refund_category }}</span>
            </div>
            <div v-if="otherRefundOrderCountLabel(currentRequest)" class="detail-item">
              <span class="detail-label">退款单量</span>
              <span class="detail-val">{{ otherRefundOrderCountLabel(currentRequest) }}</span>
            </div>
            <div v-if="currentRequest.request_type && currentRequest.request_type !== 'initial'" class="detail-item">
              <span class="detail-label">申请类型</span>
              <span class="detail-val">{{ requestTypeLabel(currentRequest.request_type) }}</span>
            </div>
            <div v-if="currentRequest.supplement_reason" class="detail-item full">
              <span class="detail-label">原因说明</span>
              <span class="detail-val">{{ currentRequest.supplement_reason }}</span>
            </div>
            <div v-if="activeTab === 'other'" class="detail-item full">
              <span class="detail-label">付款账号</span>
              <span class="detail-val mono">{{ currentRequest.payout_account || '—' }}</span>
            </div>
            <div v-if="currentRequest.buyer_paypal_email" class="detail-item full">
              <span class="detail-label">买手 PayPal</span>
              <span class="detail-val mono">{{ currentRequest.buyer_paypal_email }}</span>
            </div>
            <div class="detail-item full">
              <span class="detail-label">产品</span>
              <span class="detail-val">{{ currentRequest.product_name || '—' }} ({{ currentRequest.asin || '—' }})</span>
            </div>
            <div v-if="currentRequest.notes" class="detail-item full">
              <span class="detail-label">业务员备注</span>
              <span class="detail-val">{{ currentRequest.notes }}</span>
            </div>
          </div>
        </div>

        <div class="drawer-section">
          <div class="drawer-section-title">处理结果</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">处理人</span>
              <span class="detail-val">{{ handlerName(currentRequest) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">处理时间</span>
              <span class="detail-val">{{ fmtTime(currentRequest.handled_at) }}</span>
            </div>
            <div v-if="currentRequest.assigned_paypal_email" class="detail-item">
              <span class="detail-label">付款贝宝</span>
              <span class="detail-val mono">{{ currentRequest.assigned_paypal_email }}</span>
            </div>
            <div v-if="currentRequest.assigned_gift_card_number" class="detail-item full">
              <span class="detail-label">礼品卡号</span>
              <span class="detail-val pre-wrap mono">{{ currentRequest.assigned_gift_card_number }}</span>
            </div>
            <div v-if="currentRequest.assigned_gift_card_code" class="detail-item full">
              <span class="detail-label">礼品卡 Code</span>
              <span class="detail-val pre-wrap mono">{{ currentRequest.assigned_gift_card_code }}</span>
            </div>
            <div v-if="currentRequest.gift_card_face_value_usd" class="detail-item">
              <span class="detail-label">礼品卡面额</span>
              <span class="detail-val">${{ money(currentRequest.gift_card_face_value_usd) }}</span>
            </div>
            <div v-if="currentRequest.finance_notes" class="detail-item full">
              <span class="detail-label">账单备注</span>
              <span class="detail-val">{{ currentRequest.finance_notes }}</span>
            </div>
          </div>
          <div v-if="currentRequest.paypal_receipt_screenshot" class="detail-screenshot">
            <div class="detail-label">水单</div>
            <a :href="currentRequest.paypal_receipt_screenshot" target="_blank">
              <img :src="currentRequest.paypal_receipt_screenshot" class="screenshot-preview-img" referrerpolicy="no-referrer" @error="onImgError" />
            </a>
          </div>
        </div>
      </template>
    </a-drawer>

    <a-modal
      v-model:open="paypalProcessOpen"
      :title="paypalModalMode === 'receipt' ? '上传水单' : '贝宝返款'"
      width="560px"
      :confirm-loading="processing"
      @ok="handlePaypalProcess"
    >
      <div v-if="currentRequest" class="process-summary">
        <div>返款单数：<strong>{{ currentProcessRequests.length }}</strong></div>
        <div>子订单：<strong>{{ currentProcessSubOrdersText }}</strong></div>
        <div>业务员：<strong>{{ currentProcessRequests[0]?.staff_name || '—' }}</strong></div>
        <div>返款次数：<strong>{{ currentProcessRequests.length > 1 ? '批量' : (currentRequest._refund_times_label || '首次') }}</strong></div>
        <div>申请金额：<strong>{{ currentProcessTotalText }}</strong></div>
        <div>买手邮箱：<strong>{{ currentProcessBuyerLabel }}</strong></div>
      </div>
      <a-form layout="vertical">
        <a-form-item v-if="paypalModalMode !== 'receipt'" label="我方转款贝宝邮箱">
          <a-select v-model:value="selectedPaypalAccountId" style="width:100%" placeholder="选择公司 PayPal 账号" show-search option-filter-prop="label">
            <a-select-option v-for="acc in paypalAccounts" :key="acc.id" :value="acc.id" :label="acc.email">
              <div>{{ acc.email }}</div>
              <div class="select-sub">{{ acc.account_alias }} · {{ acc.owner_name }}</div>
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="水单是否需要">
          <a-select :value="currentRequest?._receipt_required || '不需要'" style="width:100%" disabled>
            <a-select-option v-for="item in receiptNeedOptions" :key="item" :value="item">{{ item }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="水单截图 URL">
          <a-input v-model:value="paypalProcessForm.receipt" placeholder="粘贴水单截图 URL..." />
        </a-form-item>
        <a-form-item label="账单备注">
          <a-textarea v-model:value="paypalProcessForm.notes" :rows="3" placeholder="可选" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer v-model:open="giftProcessOpen" title="礼品卡返款" width="760" placement="right">
      <template v-if="currentRequest">
        <div class="process-summary">
          <div>返款单数：<strong>{{ currentProcessRequests.length }}</strong></div>
          <div>子订单：<strong>{{ currentProcessSubOrdersText }}</strong></div>
          <div>业务员：<strong>{{ currentProcessRequests[0]?.staff_name || '—' }}</strong></div>
          <div>返款次数：<strong>{{ currentProcessRequests.length > 1 ? '批量' : (currentRequest._refund_times_label || '首次') }}</strong></div>
          <div>需返金额：<strong>{{ currentProcessTotalText }}</strong></div>
        </div>

        <div class="drawer-section">
          <div class="gift-filter-row">
            <a-select
              v-model:value="selectedGiftFaceValues"
              mode="multiple"
              allow-clear
              placeholder="筛选参与推荐的面值，不选默认全部"
              style="width:100%"
              @change="handleGiftFaceFilterChange"
            >
              <a-select-option v-for="face in giftFaceOptions" :key="face" :value="face">
                ${{ money(face) }}
              </a-select-option>
            </a-select>
          </div>
          <div class="drawer-section-title">剩余库存</div>
          <div v-if="giftInventorySpecs.length" class="inventory-grid">
            <div v-for="item in giftInventorySpecs" :key="item.faceValue" class="inventory-card">
              <span class="inventory-face">${{ money(item.faceValue) }}</span>
              <span class="inventory-count">剩余 {{ item.count }} 张</span>
            </div>
          </div>
          <a-empty v-else description="当前筛选下暂无可用面额" />
        </div>

        <div class="drawer-section">
          <div class="drawer-section-title">推荐返款组合</div>
          <div v-if="giftRecommendations.length" class="recommend-list">
            <div
              v-for="item in giftRecommendations"
              :key="item.id"
              :class="['recommend-card', selectedGiftRecommendationId === item.id ? 'active' : '']"
              @click="selectedGiftRecommendationId = item.id"
            >
              <div class="recommend-head">
                <span class="recommend-total">合计 ${{ money(item.total) }}</span>
                <span class="recommend-overpay">刚好匹配</span>
              </div>
              <div class="recommend-summary">{{ item.summary }}</div>
            </div>
          </div>
          <a-empty v-else description="当前面额无法支持返款" />
        </div>

        <a-form layout="vertical">
        <a-form-item label="账单备注">
            <a-textarea v-model:value="giftProcessForm.notes" :rows="3" placeholder="可选" />
          </a-form-item>
        </a-form>

        <div class="drawer-footer">
          <a-button @click="giftProcessOpen = false">取消</a-button>
          <a-button type="primary" :loading="processing" @click="handleGiftProcess">确认礼品卡返款</a-button>
        </div>
      </template>
    </a-drawer>

    <a-modal
      v-model:open="otherProcessOpen"
      title="处理其他付款"
      width="560px"
      :confirm-loading="processing"
      @ok="handleOtherProcess"
    >
      <div v-if="currentRequest" class="process-summary">
        <div>付款单数：<strong>{{ currentProcessRequests.length }}</strong></div>
        <div>主订单ID：<strong>{{ currentProcessOrderIdsText }}</strong></div>
        <div>子订单ID：<strong>{{ currentProcessSubOrdersText }}</strong></div>
        <div>客户姓名：<strong>{{ currentProcessRequests[0]?.customer_name || '—' }}</strong></div>
        <div>申请人：<strong>{{ currentProcessRequests[0]?.applicant_name || '—' }}</strong></div>
        <div>付款账号：<strong>{{ currentProcessRequests[0]?.payout_account || '—' }}</strong></div>
        <div>付款方式：<strong>{{ currentProcessRequests[0]?.payout_method || '—' }}</strong></div>
        <div v-if="currentProcessOtherOrderCountText">退款单量：<strong>{{ currentProcessOtherOrderCountText }}</strong></div>
        <div>申请金额：<strong>{{ currentProcessTotalText }}</strong></div>
      </div>
      <a-form layout="vertical">
        <a-form-item label="付款类型">
          <a-select v-model:value="otherProcessForm.category" style="width:100%">
            <a-select-option v-for="item in otherRefundCategoryOptions" :key="item" :value="item">{{ item }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="水单截图 URL">
          <a-input v-model:value="otherProcessForm.receipt" placeholder="粘贴水单截图 URL..." />
        </a-form-item>
        <a-form-item label="账单备注">
          <a-textarea v-model:value="otherProcessForm.notes" :rows="3" placeholder="可选" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const QUEUE_PAYPAL_EXTRA_KEY = 'refund-queue-extra-paypal-v1'
const QUEUE_GIFT_EXTRA_KEY = 'refund-queue-extra-gift-v1'

const activeTab = ref<'paypal' | 'gift' | 'other'>('paypal')
const loading = ref(false)
const processing = ref(false)
const requests = ref<any[]>([])
const currentRequest = ref<any>(null)
const currentProcessRequests = ref<any[]>([])
const detailOpen = ref(false)
const paypalProcessOpen = ref(false)
const giftProcessOpen = ref(false)
const otherProcessOpen = ref(false)
const paypalAccounts = ref<any[]>([])
const availableGiftCards = ref<any[]>([])
const pagination = ref({ current: 1, pageSize: 20, total: 0 })

const filterStatus = ref('待处理')
const filterSearch = ref('')
const filterOtherCategory = ref<string | undefined>(undefined)
const selectedPaypalAccountId = ref('')
const selectedGiftRecommendationId = ref('')
const selectedGiftFaceValues = ref<number[]>([])
const selectedBatchRows = ref<any[]>([])
const paypalModalMode = ref<'process' | 'receipt'>('process')

const otherRefundCategoryOptions = ['佣金付款', '任务付款', '其他业务付款']
const receiptNeedOptions = ['需要', '不需要']
const extraMockPaypalRequests = ref<any[]>([])
const extraMockGiftRequests = ref<any[]>([])

const mockPaypalRequests = ref<any[]>([
  {
    id: 'mock-paypal-1',
    sub_order_id: 'SUB-PP-20260415-001',
    sub_order_number: 'SO-PP-20260415-001',
    buyer_name: '买手-Linda',
    buyer_paypal_email: 'linda.demo@gmail.com',
    product_name: 'USB Desk Lamp',
    asin: 'B0PAYPAL001',
    store_name: 'US Store A',
    staff_name: '业务员-陈晨',
    refund_method: 'PayPal',
    refund_amount_usd: 10,
    product_price: 29.99,
    status: '待处理',
    notes: '产品 1 退款 [需财务返款截图]',
    finance_notes: '',
    paypal_receipt_screenshot: '',
    created_at: dayjs().subtract(3, 'hour').toISOString(),
    handled_at: null,
  },
  {
    id: 'mock-paypal-2',
    sub_order_id: 'SUB-PP-20260415-002',
    sub_order_number: 'SO-PP-20260415-002',
    buyer_name: '买手-Linda',
    buyer_paypal_email: 'linda.demo@gmail.com',
    product_name: 'Portable Blender',
    asin: 'B0PAYPAL002',
    store_name: 'US Store A',
    staff_name: '业务员-陈晨',
    refund_method: 'PayPal',
    refund_amount_usd: 5,
    product_price: 21.5,
    status: '待处理',
    notes: '产品 2 退款，和上面一起打款',
    finance_notes: '',
    paypal_receipt_screenshot: '',
    created_at: dayjs().subtract(170, 'minute').toISOString(),
    handled_at: null,
  },
  {
    id: 'mock-paypal-3',
    sub_order_id: 'SUB-PP-20260414-009',
    sub_order_number: 'SO-PP-20260414-009',
    buyer_name: '买手-Jason',
    buyer_paypal_email: 'jason.demo@gmail.com',
    product_name: 'Mini Air Purifier',
    asin: 'B0PAYPAL003',
    store_name: 'US Store B',
    staff_name: '业务员-王薇',
    refund_method: 'PayPal',
    refund_amount_usd: 8.5,
    product_price: 35,
    status: '已处理',
    notes: '单笔返款示例',
    finance_notes: '已完成贝宝返款',
    paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=PayPal+Receipt',
    created_at: dayjs().subtract(1, 'day').hour(11).minute(10).toISOString(),
    handled_at: dayjs().subtract(1, 'day').hour(12).minute(20).toISOString(),
  },
])

const mockGiftRequests = ref<any[]>([
  {
    id: 'mock-gift-1',
    sub_order_id: 'SUB-GC-20260415-001',
    sub_order_number: 'SO-GC-20260415-001',
    buyer_name: '买手-Amy',
    product_name: 'Silk Pillowcase',
    asin: 'B0GIFT001',
    store_name: 'US Store C',
    staff_name: '业务员-李妍',
    refund_method: '礼品卡',
    refund_amount_usd: 10,
    product_price: 24.8,
    status: '待处理',
    notes: '同一买手批量礼品卡返款示例',
    finance_notes: '',
    created_at: dayjs().subtract(4, 'hour').toISOString(),
    handled_at: null,
  },
  {
    id: 'mock-gift-2',
    sub_order_id: 'SUB-GC-20260415-002',
    sub_order_number: 'SO-GC-20260415-002',
    buyer_name: '买手-Amy',
    product_name: 'Phone Tripod',
    asin: 'B0GIFT002',
    store_name: 'US Store C',
    staff_name: '业务员-李妍',
    refund_method: '礼品卡',
    refund_amount_usd: 5,
    product_price: 18.6,
    status: '待处理',
    notes: '和上面一起退 15 美金，便于看推荐组合',
    finance_notes: '',
    created_at: dayjs().subtract(210, 'minute').toISOString(),
    handled_at: null,
  },
  {
    id: 'mock-gift-3',
    sub_order_id: 'SUB-GC-20260414-011',
    sub_order_number: 'SO-GC-20260414-011',
    buyer_name: '买手-Kevin',
    product_name: 'LED Strip Light',
    asin: 'B0GIFT003',
    store_name: 'US Store D',
    staff_name: '业务员-赵琪',
    refund_method: '礼品卡',
    refund_amount_usd: 12,
    product_price: 31.2,
    status: '已处理',
    notes: '历史礼品卡返款示例',
    finance_notes: '已发放礼品卡',
    assigned_gift_card_number: 'GC-7788-9900',
    assigned_gift_card_code: 'ABCD-EFGH-IJKL',
    gift_card_face_value_usd: 12,
    created_at: dayjs().subtract(2, 'day').hour(10).minute(5).toISOString(),
    handled_at: dayjs().subtract(2, 'day').hour(10).minute(55).toISOString(),
  },
])

const mockOtherRequests = ref<any[]>([
  {
    id: 'mock-other-1',
    order_id: 'ORD-20260415-001',
    sub_order_id: 'SUB-20260415-001',
    customer_name: '深圳星河科技',
    refund_reason: '产品截单付款',
    applicant_name: '商务-李婷',
    payout_account: 'alipay_shxhekeji@outlook.com',
    payout_method: '支付宝',
    refund_category: '其他业务付款',
    refund_method: '其他付款',
    refund_amount_cny: 268,
    status: '待处理',
    notes: '客户要求当天付款，已提供支付宝收款信息',
    finance_notes: '',
    paypal_receipt_screenshot: '',
    created_at: dayjs().subtract(2, 'hour').toISOString(),
    handled_at: null,
  },
  {
    id: 'mock-other-2',
    order_id: 'ORD-20260414-016',
    sub_order_id: 'SUB-20260414-064',
    customer_name: '宁波优品贸易',
    refund_reason: '任务取消付款',
    applicant_name: '商务-王晨',
    payout_account: '6222 8888 0199 7766',
    payout_method: '银行卡',
    refund_category: '任务付款',
    refund_method: '其他付款',
    refund_amount_cny: 88,
    refund_order_count: 2,
    status: '待处理',
    notes: '同一客户第二笔付款，需要合并打款',
    finance_notes: '',
    paypal_receipt_screenshot: '',
    created_at: dayjs().subtract(1, 'day').hour(15).minute(42).toISOString(),
    handled_at: null,
  },
  {
    id: 'mock-other-2b',
    order_id: 'ORD-20260414-016',
    sub_order_id: 'SUB-20260414-063',
    customer_name: '宁波优品贸易',
    refund_reason: '任务取消付款',
    applicant_name: '商务-王晨',
    payout_account: '6222 8888 0199 7766',
    payout_method: '银行卡',
    refund_category: '任务付款',
    refund_method: '其他付款',
    refund_amount_cny: 132,
    refund_order_count: 3,
    status: '待处理',
    notes: '主订单任务取消，需原路退回客户对公卡',
    finance_notes: '',
    paypal_receipt_screenshot: '',
    created_at: dayjs().subtract(1, 'day').hour(15).minute(30).toISOString(),
    handled_at: null,
  },
  {
    id: 'mock-other-3',
    order_id: 'ORD-20260413-008',
    sub_order_id: 'SUB-20260413-022',
    customer_name: '杭州远帆品牌',
    refund_reason: '佣金差额付款',
    applicant_name: '商务-周敏',
    payout_account: 'hz-yuanfan-finance@alipay',
    payout_method: '支付宝',
    refund_category: '佣金付款',
    refund_method: '其他付款',
    refund_amount_cny: 56,
    refund_order_count: 1,
    status: '待处理',
    notes: '因佣金核算差额补付客户',
    finance_notes: '',
    paypal_receipt_screenshot: '',
    created_at: dayjs().subtract(2, 'day').hour(11).minute(12).toISOString(),
    handled_at: null,
  },
])

const paypalProcessForm = reactive({
  receipt: '',
  notes: '',
})

const giftProcessForm = reactive({
  notes: '',
})

const otherProcessForm = reactive({
  category: '其他业务付款',
  receipt: '',
  notes: '',
})

const giftFaceOptions = computed(() =>
  Array.from(new Set(availableGiftCards.value.map(card => Number(card.face_value_usd || 0))))
    .filter(Boolean)
    .sort((a, b) => b - a),
)

const filteredGiftCards = computed(() => {
  if (!selectedGiftFaceValues.value.length) return availableGiftCards.value
  const faceSet = new Set(selectedGiftFaceValues.value.map(item => Number(item)))
  return availableGiftCards.value.filter(card => faceSet.has(Number(card.face_value_usd || 0)))
})

const giftInventorySpecs = computed(() => {
  const group = new Map<number, any[]>()
  for (const card of filteredGiftCards.value) {
    const face = Number(card.face_value_usd || 0)
    if (!group.has(face)) group.set(face, [])
    group.get(face)!.push(card)
  }
  return Array.from(group.entries())
    .map(([faceValue, cards]) => ({ faceValue, count: cards.length }))
    .sort((a, b) => b.faceValue - a.faceValue)
})

const giftRecommendations = computed(() => {
  const target = Number(currentProcessTotal.value || currentRequest.value?.refund_amount_usd || currentRequest.value?.refund_amount || 0)
  if (!target || !filteredGiftCards.value.length) return []
  const faceMap = new Map<number, any[]>()
  for (const card of filteredGiftCards.value) {
    const face = Number(card.face_value_usd || 0)
    if (!faceMap.has(face)) faceMap.set(face, [])
    faceMap.get(face)!.push(card)
  }
  const faces = Array.from(faceMap.keys()).sort((a, b) => b - a)
  const candidates: Array<{ counts: Record<number, number>; total: number; cardCount: number; values: number[] }> = []
  const maxCards = 8

  function pushCandidate(counts: Record<number, number>, total: number, cardCount: number) {
    const values = Object.entries(counts)
      .flatMap(([face, count]) => Array.from({ length: Number(count) }, () => Number(face)))
      .sort((a, b) => b - a)
    candidates.push({
      counts: { ...counts },
      total,
      cardCount,
      values,
    })
  }

  function dfs(index: number, total: number, counts: Record<number, number>, cardCount: number) {
    if (cardCount > maxCards || total > target) return
    if (total === target) {
      pushCandidate(counts, Number(total.toFixed(2)), cardCount)
      return
    }
    if (index >= faces.length) {
      return
    }

    const face = faces[index]
    const availableCount = faceMap.get(face)?.length || 0
    for (let use = availableCount; use >= 0; use--) {
      const nextTotal = Number((total + face * use).toFixed(2))
      const nextCount = cardCount + use
      if (use > 0) counts[face] = use
      else delete counts[face]
      dfs(index + 1, nextTotal, counts, nextCount)
    }
    delete counts[face]
  }

  dfs(0, 0, {}, 0)

  const unique = new Map<string, any>()
  candidates
    .filter(item => item.cardCount > 0)
    .sort((a, b) => a.cardCount - b.cardCount || b.values[0] - a.values[0])
    .forEach(candidate => {
      const summary = candidate.values.map(value => `$${money(value)}`).join(' + ')
      if (!summary || unique.has(summary)) return
      const cardIds: string[] = []
      const cardNumbers: string[] = []
      const cardCodes: string[] = []
      for (const [face, count] of Object.entries(candidate.counts)) {
        const cards = (faceMap.get(Number(face)) || []).slice(0, count)
        cardIds.push(...cards.map(card => card.id))
        cardNumbers.push(...cards.map(card => card.card_number))
        cardCodes.push(...cards.map(card => card.card_code))
      }
      unique.set(summary, {
        id: summary,
        total: candidate.total,
        summary,
        cardIds,
        cardNumbers,
        cardCodes,
      })
    })

  return Array.from(unique.values()).slice(0, 6)
})

const selectedGiftRecommendation = computed(() =>
  giftRecommendations.value.find(item => item.id === selectedGiftRecommendationId.value) || null,
)
const selectedBatchTotal = computed(() =>
  selectedBatchRows.value.reduce((sum, item) => sum + getAmountValue(item), 0),
)
const selectedBatchTotalText = computed(() => formatCurrency(selectedBatchTotal.value, activeTab.value === 'other' ? 'cny' : 'usd'))
const batchTargetLabel = computed(() => {
  const first = selectedBatchRows.value[0]
  if (!first) return ''
  if (activeTab.value === 'paypal') return `同一邮箱：${first.buyer_paypal_email || '—'}`
  if (activeTab.value === 'gift') return `同一买手：${first.buyer_name || '—'}`
  return `同一客户：${first.customer_name || '—'}`
})
const currentProcessTotal = computed(() =>
  currentProcessRequests.value.reduce((sum, item) => sum + getAmountValue(item), 0),
)
const currentProcessTotalText = computed(() => formatCurrency(currentProcessTotal.value, activeTab.value === 'other' ? 'cny' : 'usd'))
const currentProcessOtherOrderCountText = computed(() => {
  const total = currentProcessRequests.value.reduce((sum, item) => sum + getOtherRefundOrderCountValue(item), 0)
  return total ? `${total}单` : ''
})
const currentProcessSubOrdersText = computed(() =>
  currentProcessRequests.value
    .map(item => item.sub_order_number || item.sub_order_id || '—')
    .filter(Boolean)
    .join(' / '),
)
const currentProcessOrderIdsText = computed(() =>
  currentProcessRequests.value
    .map(item => item.order_id || '—')
    .filter(Boolean)
    .join(' / '),
)
const currentProcessBuyerLabel = computed(() => {
  const first = currentProcessRequests.value[0]
  if (!first) return '—'
  return first.buyer_paypal_email || first.buyer_name || '—'
})
const searchPlaceholder = computed(() =>
  activeTab.value === 'other'
    ? '搜索主订单ID/子订单ID/客户/付款原因/申请人...'
    : '搜索买手/订单号/产品...'
)
const rowSelection = computed(() => ({
  selectedRowKeys: selectedBatchRows.value.map(item => item.id),
  preserveSelectedRowKeys: false,
  onSelect: (record: any, selected: boolean) => {
    if (!selected) {
      selectedBatchRows.value = selectedBatchRows.value.filter(item => item.id !== record.id)
      return
    }
    if (!isSelectableRecord(record)) return
    if (selectedBatchRows.value.length > 0 && getBatchGroupKey(selectedBatchRows.value[0]) !== getBatchGroupKey(record)) {
      message.warning(`仅可勾选${batchGroupLabel()}的退款单进行批量处理`)
      return
    }
    selectedBatchRows.value = [...selectedBatchRows.value, record]
  },
  onSelectAll: (selected: boolean, selectedRows: any[]) => {
    if (!selected) {
      selectedBatchRows.value = []
      return
    }
    const rows = selectedRows.filter(isSelectableRecord)
    if (!rows.length) {
      selectedBatchRows.value = []
      return
    }
    const firstKey = getBatchGroupKey(rows[0])
    selectedBatchRows.value = rows.filter(item => getBatchGroupKey(item) === firstKey)
    if (selectedBatchRows.value.length !== rows.length) {
      message.warning(`已按${batchGroupLabel()}自动筛选可批量处理的记录`)
    }
  },
  getCheckboxProps: (record: any) => {
    const hasSelection = selectedBatchRows.value.length > 0
    const selectedKey = hasSelection ? getBatchGroupKey(selectedBatchRows.value[0]) : ''
    return {
      disabled: !isSelectableRecord(record) || (hasSelection && selectedKey !== getBatchGroupKey(record)),
    }
  },
}))

const tableColumns = computed(() => {
  if (activeTab.value === 'paypal') {
    return [
      { title: '子订单信息', key: 'info', width: 210 },
      { title: '业务员', dataIndex: 'staff_name', key: 'staff_name', width: 110 },
      { title: '返款截图是否需要', key: 'receipt_required', width: 130 },
      { title: '返款次数', key: 'refund_times', width: 90 },
      { title: '买手邮箱', key: 'paypal_email', width: 190 },
      { title: '备注', key: 'notes_col', width: 180 },
      { title: '申请金额', key: 'refund_amount', width: 120 },
      {
        title: '申请时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 120,
        customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '',
      },
      { title: '水单', key: 'receipt', width: 140 },
      { title: '操作', key: 'action', width: 90, fixed: 'right' as const },
    ]
  }
  if (activeTab.value === 'gift') {
    return [
      { title: '子订单信息', key: 'info', width: 220 },
      { title: '业务员', dataIndex: 'staff_name', key: 'staff_name', width: 110 },
      { title: '买手', key: 'buyer', width: 150 },
      { title: '返款次数', key: 'refund_times', width: 90 },
      { title: '备注', key: 'notes_col', width: 180 },
      { title: '申请金额', key: 'refund_amount', width: 120 },
      {
        title: '申请时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 120,
        customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '',
      },
      { title: '操作', key: 'action', width: 120, fixed: 'right' as const },
    ]
  }
  return [
    { title: '主订单ID', dataIndex: 'order_id', key: 'order_id', width: 160 },
    { title: '子订单ID', dataIndex: 'sub_order_id', key: 'sub_order_id', width: 160 },
    { title: '客户姓名', dataIndex: 'customer_name', key: 'customer_name', width: 140 },
    { title: '付款原因', dataIndex: 'refund_reason', key: 'refund_reason', width: 150 },
    { title: '申请人', dataIndex: 'applicant_name', key: 'applicant_name', width: 120 },
    { title: '付款账号', key: 'payout_account', width: 180 },
    { title: '付款类型', key: 'refund_category', width: 120 },
    { title: '退款单量', key: 'refund_order_count', width: 100 },
    { title: '备注', key: 'notes_col', width: 180 },
    { title: '付款金额(人民币)', key: 'refund_amount', width: 130 },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '',
    },
    { title: '水单', key: 'receipt', width: 140 },
    { title: '操作', key: 'action', width: 120, fixed: 'right' as const },
  ]
})

function annotateRefundRequests(data: any[]) {
  const sorted = [...(data || [])].sort((a, b) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf())
  const countMap = new Map<string, number>()
  return sorted.map(row => {
    const key = row.sub_order_id || row.sub_order_number || row.id
    const next = (countMap.get(key) || 0) + 1
    countMap.set(key, next)
    return {
      ...row,
      _refund_times_label: next === 1 ? '首次' : `第${next}次`,
      _receipt_required: /\[需财务返款截图\]|\[需财务水单\]/.test(String(row.notes || '')) ? '需要' : '不需要',
    }
  }).sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf())
}

function money(value: any) {
  return Number(value || 0).toFixed(2)
}

function csvCell(value: any) {
  const text = String(value ?? '').replace(/\r?\n/g, ' / ')
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<any>>) {
  const csv = ['\ufeff' + headers.map(csvCell).join(','), ...rows.map(row => row.map(csvCell).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function getAmountValue(record: any) {
  if (!record) return 0
  if (['其他退款', '其他付款'].includes(record.refund_method) || activeTab.value === 'other') {
    return Number(record.refund_amount_cny || record.refund_amount || record.refund_amount_usd || 0)
  }
  return Number(record.refund_amount_usd || record.refund_amount || 0)
}

function formatCurrency(value: any, currency: 'usd' | 'cny' = 'usd') {
  return `${currency === 'cny' ? '￥' : '$'}${money(value)}`
}

function formatRecordAmount(record: any) {
  return formatCurrency(getAmountValue(record), ['其他退款', '其他付款'].includes(record?.refund_method) || activeTab.value === 'other' ? 'cny' : 'usd')
}

function otherRefundOrderCountLabel(record: any) {
  if (!record) return ''
  if (!['任务退款', '佣金退款', '任务付款', '佣金付款'].includes(record.refund_category || '')) return ''
  const count = record.refund_order_count ?? record.order_count ?? record.sub_order_count ?? record.refund_order_qty
  if (count === undefined || count === null || count === '') return ''
  return `${count}单`
}

function getOtherRefundOrderCountValue(record: any) {
  if (!record || !['任务退款', '佣金退款', '任务付款', '佣金付款'].includes(record.refund_category || '')) return 0
  return Number(record.refund_order_count ?? record.order_count ?? record.sub_order_count ?? record.refund_order_qty ?? 0)
}

function readStoredArray(key: string) {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStoredArray(key: string, value: any[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function hydrateQueueMockStorage() {
  extraMockPaypalRequests.value = readStoredArray(QUEUE_PAYPAL_EXTRA_KEY)
  extraMockGiftRequests.value = readStoredArray(QUEUE_GIFT_EXTRA_KEY)
}

function persistQueueExtra(type: 'paypal' | 'gift') {
  writeStoredArray(type === 'paypal' ? QUEUE_PAYPAL_EXTRA_KEY : QUEUE_GIFT_EXTRA_KEY, type === 'paypal' ? extraMockPaypalRequests.value : extraMockGiftRequests.value)
}

function getActiveMockRequests() {
  if (activeTab.value === 'paypal') return [...mockPaypalRequests.value, ...extraMockPaypalRequests.value]
  if (activeTab.value === 'gift') return [...mockGiftRequests.value, ...extraMockGiftRequests.value]
  return mockOtherRequests.value
}

function filterMockRequests(list: any[]) {
  return list.filter(item => {
    if (filterStatus.value && item.status !== filterStatus.value) return false
    if (activeTab.value === 'other' && filterOtherCategory.value && item.refund_category !== filterOtherCategory.value) return false
    if (filterSearch.value) {
      const kw = filterSearch.value.trim().toLowerCase()
      const haystack = activeTab.value === 'other'
        ? [item.order_id, item.sub_order_id, item.customer_name, item.refund_reason, item.applicant_name]
        : [item.buyer_name, item.sub_order_number, item.product_name, item.buyer_paypal_email]
      if (!haystack.join(' ').toLowerCase().includes(kw)) return false
    }
    return true
  })
}

function batchGroupLabel() {
  if (activeTab.value === 'paypal') return '同一邮箱'
  if (activeTab.value === 'gift') return '同一买手'
  return '同一客户'
}

function handleGiftFaceFilterChange() {
  if (!giftRecommendations.value.find(item => item.id === selectedGiftRecommendationId.value)) {
    selectedGiftRecommendationId.value = giftRecommendations.value[0]?.id || ''
  }
}

function fmtTime(t: string | null) {
  if (!t) return '—'
  return dayjs(t).format('YYYY-MM-DD HH:mm')
}

function methodColor(method: string) {
  if (method === '礼品卡') return 'gold'
  if (method === 'PayPal') return 'blue'
  return 'purple'
}

function refundMethodLabel(record: any) {
  if (record.refund_method === 'PayPal') return '贝宝返款'
  if (record.refund_method === '礼品卡') return '礼品卡返款'
  return '其他付款'
}

function handlerName(record: any) {
  if (!record) return '—'
  return record.refund_operator || record.handled_by || record.processed_by || (record.handled_at ? '财务' : '—')
}

function requestTypeLabel(t: string) {
  if (t === 'supplement') return '追加'
  if (t === 'correction') return '更正'
  if (t === 'initial') return '首笔'
  return t || '—'
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

function onSearchChange() {
  if (!filterSearch.value) reloadFromFirstPage()
}

function handleTabChange() {
  filterOtherCategory.value = undefined
  clearBatchSelection()
  reloadFromFirstPage()
}

function reloadFromFirstPage() {
  pagination.value.current = 1
  clearBatchSelection()
  load()
}

function isSelectableRecord(record: any) {
  return record?.status === '待处理'
}

function getBatchGroupKey(record: any) {
  if (activeTab.value === 'paypal') return ['paypal', record.buyer_paypal_email || ''].join('|')
  if (activeTab.value === 'gift') return ['gift', record.buyer_name || ''].join('|')
  return ['other', record.customer_name || ''].join('|')
}

function clearBatchSelection() {
  selectedBatchRows.value = []
}

async function fetchQueueExportRecords() {
  hydrateQueueMockStorage()
  if (activeTab.value === 'other') {
    return annotateRefundRequests(filterMockRequests(mockOtherRequests.value))
  }

  const filteredMock = annotateRefundRequests(filterMockRequests(getActiveMockRequests()))
  let query = supabase
    .from('refund_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (filterStatus.value) query = query.eq('status', filterStatus.value)
  if (filterSearch.value) {
    const kw = `%${filterSearch.value}%`
    query = query.or(`buyer_name.ilike.${kw},sub_order_number.ilike.${kw},product_name.ilike.${kw},buyer_paypal_email.ilike.${kw}`)
  }

  if (activeTab.value === 'paypal') {
    query = query.eq('refund_method', 'PayPal')
  } else {
    query = query.eq('refund_method', '礼品卡')
  }

  const { data, error } = await query
  if (error) throw error
  return [...filteredMock, ...annotateRefundRequests(data || [])]
}

async function exportQueue() {
  try {
    const rows = await fetchQueueExportRecords()
    const filenameMap: Record<string, string> = {
      paypal: '付款审批_贝宝返款',
      gift: '付款审批_礼品卡返款',
      other: '付款审批_其他付款',
    }
    const headers = activeTab.value === 'paypal'
      ? ['子订单号', '产品', '业务员', '买手邮箱', '返款次数', '申请金额', '申请时间', '水单需求', '账单备注']
      : activeTab.value === 'gift'
        ? ['子订单号', '产品', '业务员', '买手', '返款次数', '申请金额', '申请时间', '账单备注']
        : ['主订单ID', '子订单ID', '客户姓名', '付款类型', '退款单量', '申请金额', '申请时间', '账单备注']
    const dataRows = rows.map(item => activeTab.value === 'paypal'
      ? [
          item.sub_order_number || item.sub_order_id || '',
          item.product_name || '',
          item.staff_name || '',
          item.buyer_paypal_email || '',
          item._refund_times_label || '',
          formatRecordAmount(item),
          fmtTime(item.created_at),
          item._receipt_required || '',
          item.finance_notes || item.notes || '',
        ]
      : activeTab.value === 'gift'
        ? [
            item.sub_order_number || item.sub_order_id || '',
            item.product_name || '',
            item.staff_name || '',
            item.buyer_name || '',
            item._refund_times_label || '',
            formatRecordAmount(item),
            fmtTime(item.created_at),
            item.finance_notes || item.notes || '',
          ]
        : [
            item.order_id || '',
            item.sub_order_id || '',
            item.customer_name || '',
            item.refund_category || '',
            otherRefundOrderCountLabel(item),
            formatRecordAmount(item),
            fmtTime(item.created_at),
            item.finance_notes || item.notes || '',
          ])
    downloadCsv(`${filenameMap[activeTab.value]}_${dayjs().format('YYYYMMDD_HHmm')}.csv`, headers, dataRows)
    message.success('导出成功')
  } catch (e: any) {
    message.error(`导出失败：${e.message || e}`)
  }
}

function setProcessRequests(records: any[]) {
  currentProcessRequests.value = records
  currentRequest.value = records[0] || null
}

async function loadPaypalAccounts() {
  const { data } = await supabase
    .from('paypal_accounts')
    .select('id, email, account_alias, owner_name')
    .eq('status', '正常')
    .order('created_at', { ascending: false })
  paypalAccounts.value = data || []
  if (!selectedPaypalAccountId.value && paypalAccounts.value.length > 0) {
    selectedPaypalAccountId.value = paypalAccounts.value[0].id
  }
}

async function load() {
  loading.value = true
  try {
    hydrateQueueMockStorage()
    if (activeTab.value === 'other') {
      const filtered = annotateRefundRequests(filterMockRequests(mockOtherRequests.value))
      pagination.value.total = filtered.length
      const from = (pagination.value.current - 1) * pagination.value.pageSize
      requests.value = filtered.slice(from, from + pagination.value.pageSize)
      return
    }

    const filteredMock = annotateRefundRequests(filterMockRequests(getActiveMockRequests()))
    const mockCount = filteredMock.length
    const pageStart = (pagination.value.current - 1) * pagination.value.pageSize
    const pageEnd = pageStart + pagination.value.pageSize
    const mockPageRows = filteredMock.slice(pageStart, pageEnd)
    const realStart = Math.max(pageStart - mockCount, 0)
    const realPageSize = pagination.value.pageSize - mockPageRows.length

    let query = supabase
      .from('refund_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    if (filterSearch.value) {
      const kw = `%${filterSearch.value}%`
      query = query.or(`buyer_name.ilike.${kw},sub_order_number.ilike.${kw},product_name.ilike.${kw},buyer_paypal_email.ilike.${kw}`)
    }

    if (activeTab.value === 'paypal') {
      query = query.eq('refund_method', 'PayPal')
    } else if (activeTab.value === 'gift') {
      query = query.eq('refund_method', '礼品卡')
    } else {
      query = query.neq('refund_method', 'PayPal').neq('refund_method', '礼品卡')
      if (filterOtherCategory.value) query = query.eq('refund_category', filterOtherCategory.value)
    }

    if (realPageSize > 0) {
      query = query.range(realStart, realStart + realPageSize - 1)
    } else {
      query = query.range(0, -1)
    }
    const { data, count, error } = await query
    if (error) throw error
    requests.value = [...mockPageRows, ...annotateRefundRequests(data || [])]
    pagination.value.total = (count || 0) + mockCount
  } finally {
    loading.value = false
  }
}

async function loadAvailableGiftCards() {
  const { data, error } = await supabase
    .from('gift_cards')
    .select('id, card_number, card_code, face_value_usd')
    .eq('status', '未使用')
    .order('face_value_usd', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw error
  availableGiftCards.value = data || []
}

function openDetail(record: any) {
  currentRequest.value = record
  detailOpen.value = true
}

function openPaypalProcess(record?: any, useSelection = false) {
  if (!selectedPaypalAccountId.value) {
    message.warning('请先在顶部选择我方转款贝宝邮箱')
    return
  }
  const targets = useSelection ? selectedBatchRows.value : (record ? [record] : [])
  if (!targets.length) {
    message.warning('请先选择要返款的记录')
    return
  }
  setProcessRequests(targets)
  paypalModalMode.value = 'process'
  paypalProcessForm.receipt = targets[0]?.paypal_receipt_screenshot || ''
  paypalProcessForm.notes = targets[0]?.finance_notes || ''
  paypalProcessOpen.value = true
}

function openPaypalReceipt(record: any) {
  setProcessRequests([record])
  paypalModalMode.value = 'receipt'
  paypalProcessForm.receipt = record.paypal_receipt_screenshot || ''
  paypalProcessForm.notes = record.finance_notes || ''
  paypalProcessOpen.value = true
}

async function openGiftProcess(record?: any, useSelection = false) {
  const targets = useSelection ? selectedBatchRows.value : (record ? [record] : [])
  if (!targets.length) {
    message.warning('请先选择要返款的记录')
    return
  }
  setProcessRequests(targets)
  giftProcessForm.notes = targets[0]?.finance_notes || ''
  selectedGiftFaceValues.value = []
  selectedGiftRecommendationId.value = ''
  await loadAvailableGiftCards()
  handleGiftFaceFilterChange()
  giftProcessOpen.value = true
}

function openOtherProcess(record?: any, useSelection = false) {
  const targets = useSelection ? selectedBatchRows.value : (record ? [record] : [])
  if (!targets.length) {
    message.warning('请先选择要处理的退款记录')
    return
  }
  setProcessRequests(targets)
  otherProcessForm.category = targets[0]?.refund_category || '其他业务付款'
  otherProcessForm.receipt = targets[0]?.paypal_receipt_screenshot || ''
  otherProcessForm.notes = targets[0]?.finance_notes || ''
  otherProcessOpen.value = true
}

async function handlePaypalProcess() {
  if (!currentProcessRequests.value.length) return
  if (!selectedPaypalAccountId.value) {
    message.warning('请选择我方转款贝宝邮箱')
    return
  }

  processing.value = true
  try {
    const account = paypalAccounts.value.find(item => item.id === selectedPaypalAccountId.value)
    const total = currentProcessTotal.value
    const nextStatus = paypalModalMode.value === 'receipt' && currentProcessRequests.value.length === 1
      ? currentProcessRequests.value[0]?.status || '待处理'
      : '已处理'
    const handledAt = nextStatus === '已处理' ? new Date().toISOString() : currentProcessRequests.value[0]?.handled_at || null
    const mockIds = currentProcessRequests.value.filter(item => String(item.id).startsWith('mock-paypal-')).map(item => item.id)
    const extraMockIds = currentProcessRequests.value.filter(item => String(item.id).startsWith('mock-paypal-resub-')).map(item => item.id)
    const realIds = currentProcessRequests.value.filter(item => !String(item.id).startsWith('mock-paypal-')).map(item => item.id)

    if (mockIds.length) {
      mockPaypalRequests.value = mockPaypalRequests.value.map(item =>
        mockIds.includes(item.id)
          ? {
              ...item,
              status: nextStatus,
              assigned_paypal_account_id: selectedPaypalAccountId.value,
              assigned_paypal_email: account?.email || '',
              paypal_receipt_screenshot: paypalProcessForm.receipt || '',
              finance_notes: paypalProcessForm.notes,
              handled_at: handledAt,
            }
          : item,
      )
    }

    if (extraMockIds.length) {
      extraMockPaypalRequests.value = extraMockPaypalRequests.value.map(item =>
        extraMockIds.includes(item.id)
          ? {
              ...item,
              status: nextStatus,
              assigned_paypal_account_id: selectedPaypalAccountId.value,
              assigned_paypal_email: account?.email || '',
              paypal_receipt_screenshot: paypalProcessForm.receipt || '',
              finance_notes: paypalProcessForm.notes,
              handled_at: handledAt,
            }
          : item,
      )
      persistQueueExtra('paypal')
    }

    if (realIds.length) {
      const { error } = await supabase
        .from('refund_requests')
        .update({
          status: nextStatus,
          assigned_paypal_account_id: selectedPaypalAccountId.value,
          assigned_paypal_email: account?.email || '',
          paypal_receipt_screenshot: paypalProcessForm.receipt || '',
          finance_notes: paypalProcessForm.notes,
          handled_at: handledAt,
        })
        .in('id', realIds)
      if (error) throw error
    }

    clearBatchSelection()
    currentProcessRequests.value = []
    message.success(paypalModalMode.value === 'receipt' ? '水单已更新' : `贝宝返款已处理，合计 $${money(total)}`)
    paypalProcessOpen.value = false
    await load()
  } catch (e: any) {
    message.error('处理失败：' + e.message)
  } finally {
    processing.value = false
  }
}

async function handleGiftProcess() {
  if (!currentProcessRequests.value.length) return
  if (!selectedGiftRecommendation.value) {
    message.warning('请选择一个推荐返款组合')
    return
  }

  processing.value = true
  try {
    const recommendation = selectedGiftRecommendation.value
    const now = new Date().toISOString()
    const total = currentProcessTotal.value
    const mockIds = currentProcessRequests.value.filter(item => String(item.id).startsWith('mock-gift-')).map(item => item.id)
    const extraMockIds = currentProcessRequests.value.filter(item => String(item.id).startsWith('mock-gift-resub-')).map(item => item.id)
    const realIds = currentProcessRequests.value.filter(item => !String(item.id).startsWith('mock-gift-')).map(item => item.id)

    const { error: cardError } = await supabase
      .from('gift_cards')
      .update({
        status: '已使用',
        used_at: now,
        used_for_sub_order_id: currentProcessRequests.value.map(item => item.sub_order_id).filter(Boolean).join(','),
        used_for_sub_order_no: currentProcessRequests.value.map(item => item.sub_order_number).filter(Boolean).join(','),
        used_by_buyer_name: currentProcessRequests.value[0]?.buyer_name || '',
        used_by_operator: '财务',
        refund_operator: '财务',
        refund_at: now,
      })
      .in('id', recommendation.cardIds)
    if (cardError) throw cardError

    if (mockIds.length) {
      mockGiftRequests.value = mockGiftRequests.value.map(item =>
        mockIds.includes(item.id)
          ? {
              ...item,
              status: '已处理',
              assigned_gift_card_id: recommendation.cardIds[0] || null,
              assigned_gift_card_number: recommendation.cardNumbers.join('\n'),
              assigned_gift_card_code: recommendation.cardCodes.join('\n'),
              gift_card_face_value_usd: recommendation.total,
              finance_notes: giftProcessForm.notes,
              handled_at: now,
            }
          : item,
      )
    }

    if (extraMockIds.length) {
      extraMockGiftRequests.value = extraMockGiftRequests.value.map(item =>
        extraMockIds.includes(item.id)
          ? {
              ...item,
              status: '已处理',
              assigned_gift_card_id: recommendation.cardIds[0] || null,
              assigned_gift_card_number: recommendation.cardNumbers.join('\n'),
              assigned_gift_card_code: recommendation.cardCodes.join('\n'),
              gift_card_face_value_usd: recommendation.total,
              finance_notes: giftProcessForm.notes,
              handled_at: now,
            }
          : item,
      )
      persistQueueExtra('gift')
    }

    if (realIds.length) {
      const { error } = await supabase
        .from('refund_requests')
        .update({
          status: '已处理',
          assigned_gift_card_id: recommendation.cardIds[0] || null,
          assigned_gift_card_number: recommendation.cardNumbers.join('\n'),
          assigned_gift_card_code: recommendation.cardCodes.join('\n'),
          gift_card_face_value_usd: recommendation.total,
          finance_notes: giftProcessForm.notes,
          handled_at: now,
        })
        .in('id', realIds)
      if (error) throw error
    }

    clearBatchSelection()
    currentProcessRequests.value = []
    message.success(`礼品卡返款已处理，合计 $${money(total)}`)
    giftProcessOpen.value = false
    await load()
  } catch (e: any) {
    message.error('处理失败：' + e.message)
  } finally {
    processing.value = false
  }
}

async function handleOtherProcess() {
  if (!currentProcessRequests.value.length) return
  if (!otherProcessForm.category) {
    message.warning('请选择付款类型')
    return
  }

  processing.value = true
  try {
    const total = currentProcessTotal.value
    if (currentProcessRequests.value.every(item => String(item.id).startsWith('mock-other-'))) {
      const now = new Date().toISOString()
      mockOtherRequests.value = mockOtherRequests.value.map(item =>
        currentProcessRequests.value.some(target => target.id === item.id)
          ? {
              ...item,
              status: '已处理',
              refund_method: '其他付款',
              refund_category: otherProcessForm.category,
              paypal_receipt_screenshot: otherProcessForm.receipt || '',
              finance_notes: otherProcessForm.notes,
              handled_at: now,
            }
          : item,
      )
      clearBatchSelection()
      currentProcessRequests.value = []
      message.success(`其他付款已处理，合计 ${formatCurrency(total, 'cny')}`)
      otherProcessOpen.value = false
      await load()
      return
    }

    const { error } = await supabase
      .from('refund_requests')
      .update({
        status: '已处理',
        refund_method: '其他付款',
        refund_category: otherProcessForm.category,
        paypal_receipt_screenshot: otherProcessForm.receipt || '',
        finance_notes: otherProcessForm.notes,
        handled_at: new Date().toISOString(),
      })
      .in('id', currentProcessRequests.value.map(item => item.id))
    if (error) throw error
    clearBatchSelection()
    currentProcessRequests.value = []
    message.success(`其他付款已处理，合计 ${formatCurrency(total, 'cny')}`)
    otherProcessOpen.value = false
    await load()
  } catch (e: any) {
    message.error('处理失败：' + e.message)
  } finally {
    processing.value = false
  }
}

async function cancelRequest(id: string) {
  if (String(id).startsWith('mock-other-')) {
    const idx = mockOtherRequests.value.findIndex(item => item.id === id)
    if (idx >= 0) {
      mockOtherRequests.value[idx] = { ...mockOtherRequests.value[idx], status: '已取消' }
    }
    message.success('已取消')
    await load()
    return
  }
  const { error } = await supabase.from('refund_requests').update({ status: '已取消' }).eq('id', id)
  if (error) {
    message.error('操作失败')
    return
  }
  message.success('已取消')
  await load()
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  clearBatchSelection()
  load()
}

onMounted(async () => {
  hydrateQueueMockStorage()
  await loadPaypalAccounts()
  await load()
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 10px; margin-bottom: 12px; align-items: center; flex-wrap: wrap; }
.total-hint { font-size: 12px; color: #9ca3af; margin-left: auto; }
.queue-hint {
  margin-bottom: 16px;
  padding: 10px 14px;
  font-size: 12px;
  color: #6b7280;
  background: #f5f7fa;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  padding: 10px 14px;
  font-size: 12px;
  color: #374151;
  background: #f8fafc;
  border: 1px solid #dbeafe;
  border-radius: 10px;
}

.cell-info { display: flex; flex-direction: column; gap: 2px; }
.cell-subno { font-family: 'Courier New', monospace; font-size: 11px; font-weight: 700; color: #1a1a2e; }
.cell-product { font-size: 12px; color: #374151; }
.cell-meta { font-size: 11px; color: #9ca3af; }
.cell-email { font-size: 11px; color: #6b7280; }
.cell-seq { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.amount-usd { font-weight: 700; color: #dc2626; font-size: 14px; }
.cell-product-price { font-size: 11px; color: #9ca3af; }
.text-gray { color: #9ca3af; font-size: 12px; }
.select-sub { font-size: 11px; color: #9ca3af; }
.re-edit-link { font-size: 12px; color: #2563eb; cursor: pointer; }
.mono-cell { font-family: 'Courier New', monospace; font-size: 12px; color: #1a1a2e; }
.note-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 12px;
  color: #374151;
}

.result-stack { display: flex; flex-direction: column; gap: 2px; }
.result-acc { font-size: 12px; color: #374151; }
.result-link { font-size: 11px; color: #2563eb; }
.result-code { font-family: 'Courier New', monospace; font-size: 11px; color: #059669; font-weight: 700; white-space: pre-line; }
.clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.drawer-section { margin-bottom: 24px; }
.drawer-section-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f0f0f0; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item.full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; color: #9ca3af; font-weight: 500; }
.detail-val { font-size: 13px; color: #1a1a2e; }
.detail-val.mono { font-family: 'Courier New', monospace; font-size: 12px; }
.detail-val.pre-wrap { white-space: pre-line; }
.detail-screenshot { margin-top: 12px; }
.amount-usd-lg { font-size: 18px; font-weight: 700; color: #dc2626; }
.screenshot-preview-img { max-width: 100%; max-height: 220px; border-radius: 8px; border: 1px solid #e5e7eb; object-fit: contain; }

.process-summary {
  margin-bottom: 16px;
  padding: 12px 14px;
  background: #f5f7fa;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #374151;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.gift-filter-row {
  margin-bottom: 12px;
}
.inventory-card {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.inventory-face { font-size: 16px; font-weight: 700; color: #2563eb; }
.inventory-count { font-size: 12px; color: #6b7280; }

.recommend-list { display: flex; flex-direction: column; gap: 10px; }
.recommend-card {
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
}
.recommend-card.active {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.06);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
}
.recommend-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
.recommend-total { font-size: 14px; font-weight: 700; color: #1a1a2e; }
.recommend-overpay { font-size: 12px; color: #6b7280; }
.recommend-summary { font-size: 12px; color: #374151; }

.drawer-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f0f0f0; }

@media (max-width: 900px) {
  .detail-grid,
  .inventory-grid {
    grid-template-columns: 1fr;
  }
}
</style>
