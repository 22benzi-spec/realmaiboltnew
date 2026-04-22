<template>
  <div class="page-content">
    <h1 class="page-title">返款账单</h1>

    <a-tabs v-model:activeKey="activeTab" @change="onTabChange">
      <a-tab-pane key="giftcard" tab="礼品卡返款">
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-num">{{ gcStats.count }}</div>
            <div class="stat-label">返款笔数</div>
          </div>
          <div class="stat-card highlight-gold">
            <div class="stat-num gold">${{ gcStats.totalUsd.toFixed(2) }}</div>
            <div class="stat-label">礼品卡总面额 (USD)</div>
          </div>
          <div class="stat-card highlight-green">
            <div class="stat-num green">{{ gcStats.resubmitted }}</div>
            <div class="stat-label">已重新申请</div>
          </div>
        </div>

        <div class="card-panel">
          <div class="queue-hint">
            这里已填充礼品卡返款 mock 数据，可直接演示“金额填错后退回礼品卡库，并重新提交返款申请”。
          </div>
          <div class="toolbar">
            <a-range-picker v-model:value="gcDateRange" style="width:240px" @change="reloadGiftCardFromFirstPage" allow-clear />
            <a-input-search v-model:value="gcSearch" placeholder="搜索买手/子订单/产品" style="width:220px" allow-clear @search="reloadGiftCardFromFirstPage" />
            <a-button @click="reloadGiftCardFromFirstPage"><ReloadOutlined /></a-button>
            <a-button @click="exportLedger('giftcard')">导出</a-button>
            <span class="total-hint">共 {{ gcPagination.total }} 条</span>
          </div>

          <a-table
            :columns="gcColumns"
            :data-source="gcRecords"
            :loading="gcLoading"
            :pagination="gcPagination"
            row-key="id"
            size="middle"
            :scroll="{ x: 1320 }"
            @change="handleGcTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'order_info'">
                <div class="cell-info">
                  <div class="cell-sub-row">
                    <div class="cell-subno">{{ record.sub_order_number || '—' }}</div>
                    <a-tag v-if="record._isNew" color="red" class="new-tag">NEW</a-tag>
                  </div>
                  <div class="cell-product">{{ record.product_name || '—' }}</div>
                  <div class="cell-meta">{{ record.asin || '' }}</div>
                  <div v-if="record._batch_label" class="batch-chip">批次 {{ record._batch_label }}</div>
                </div>
              </template>
              <template v-if="column.key === 'buyer'">
                <div>{{ record.buyer_name || '—' }}</div>
                <div v-if="record.chat_account" class="cell-email">聊单号：{{ record.chat_account }}</div>
              </template>
              <template v-if="column.key === 'refund_amount'">
                <div class="amount-cell">
                  <span class="amount-usd">${{ money(record._line_amount_usd) }}</span>
                  <span v-if="record._batch_count > 1" class="amount-sub">本行需返</span>
                </div>
              </template>
              <template v-if="column.key === 'actual_amount'">
                <div v-if="record._actual_amount_row_span !== 0 && record._batch_count > 1" class="batch-card">
                  <div class="batch-card-head">
                    <span class="batch-card-tag">批次 {{ record._batch_label }}</span>
                    <span class="batch-card-count">共 {{ record._batch_count }} 笔</span>
                  </div>
                  <div class="batch-card-row is-total">
                    <span>合计实返</span>
                    <strong>${{ money(record._batch_total_usd) }}</strong>
                  </div>
                </div>
                <div v-else-if="record._actual_amount_row_span !== 0" class="amount-cell">
                  <span class="amount-usd">${{ money(record._actual_amount_usd) }}</span>
                  <span class="amount-sub">单笔实返</span>
                </div>
              </template>
              <template v-if="column.key === 'gift_card'">
                <div v-if="record._gift_card_row_span !== 0" class="gc-cell">
                  <div class="gc-code-text">{{ record._gift_card_code_text || '—' }}</div>
                  <div v-if="record._gift_card_number_text" class="gc-number">{{ record._gift_card_number_text }}</div>
                  <div v-if="record._gift_card_face_text" class="gc-face">{{ record._gift_card_face_text }}</div>
                  <a-button
                    v-if="record._gift_card_code_text"
                    type="link"
                    size="small"
                    class="gift-copy-link"
                    @click="copyGiftCodes(record)"
                  >复制卡密</a-button>
                  <a-button
                    v-if="hasGiftReturnTrail(record)"
                    type="link"
                    size="small"
                    class="gift-history-link"
                    @click="openGiftHistory(record)"
                  >查看回流留痕</a-button>
                </div>
              </template>
              <template v-if="column.key === 'refund_status'">
                <a-select
                  v-if="record._isMock"
                  :value="record.refund_status || '已返款'"
                  size="small"
                  style="width:120px"
                  @change="changeRefundStatus('giftcard', record, $event)"
                >
                  <a-select-option v-for="item in giftRefundStatusOptions" :key="item" :value="item">{{ item }}</a-select-option>
                </a-select>
                <a-tag v-else :color="refundStatusColor(record.refund_status || '已返款')">{{ record.refund_status || '已返款' }}</a-tag>
              </template>
              <template v-if="column.key === 'handled_at'">
                <div class="time-cell">
                  <span class="time-operator">{{ handlerName(record) }}</span>
                  <span class="time-text">{{ fmtTime(record.handled_at) }}</span>
                </div>
              </template>
              <template v-if="column.key === 'notes'">
                <span class="notes-text">{{ record.finance_notes || '—' }}</span>
              </template>
              <template v-if="column.key === 'action'">
                <a-space size="small" wrap>
                  <a-button
                    v-if="record._isMock && record.gift_returned && !record.gift_resubmitted"
                    type="primary"
                    size="small"
                    @click="openGiftReturn(record)"
                  >重新提交</a-button>
                  <a-button
                    v-else-if="record._isMock && record.refund_status === '已返款' && !record.gift_returned"
                    size="small"
                    @click="giftRollback(record)"
                  >回流卡库</a-button>
                  <span v-else class="text-gray">—</span>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <a-tab-pane key="paypal" tab="PayPal 返款">
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-num">{{ ppStats.count }}</div>
            <div class="stat-label">返款笔数</div>
          </div>
          <div class="stat-card highlight-blue">
            <div class="stat-num blue">${{ ppStats.totalUsd.toFixed(2) }}</div>
            <div class="stat-label">返款总金额 (USD)</div>
          </div>
          <div class="stat-card highlight-green">
            <div class="stat-num green">{{ ppStats.resubmitted }}</div>
            <div class="stat-label">已追加水单 / 重新申请</div>
          </div>
        </div>

        <div class="card-panel">
          <div class="queue-hint">
            这里已填充 PayPal 返款 mock 数据，可直接演示“换我方转款贝宝”以及“换买手贝宝后重新提交返款审批”。
          </div>
          <div class="toolbar">
            <a-range-picker v-model:value="ppDateRange" style="width:240px" @change="reloadPaypalFromFirstPage" allow-clear />
            <a-select v-model:value="ppAccountFilter" style="width:220px" allow-clear placeholder="全部 PayPal 账号" @change="reloadPaypalFromFirstPage">
              <a-select-option v-for="acc in ppAccountList" :key="acc.email" :value="acc.email">{{ acc.email }}</a-select-option>
            </a-select>
            <a-input-search v-model:value="ppSearch" placeholder="搜索买手/子订单/产品/邮箱" style="width:220px" allow-clear @search="reloadPaypalFromFirstPage" />
            <a-button @click="reloadPaypalFromFirstPage"><ReloadOutlined /></a-button>
            <a-button @click="exportLedger('paypal')">导出</a-button>
            <span class="total-hint">共 {{ ppPagination.total }} 条</span>
          </div>

          <a-table
            :columns="ppColumns"
            :data-source="ppRecords"
            :loading="ppLoading"
            :pagination="ppPagination"
            row-key="id"
            size="middle"
            :scroll="{ x: 1480 }"
            @change="handlePpTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'order_info'">
                <div class="cell-info">
                  <div class="cell-sub-row">
                    <div class="cell-subno">{{ record.sub_order_number || '—' }}</div>
                    <a-tag v-if="record._isNew" color="red" class="new-tag">NEW</a-tag>
                  </div>
                  <div class="cell-product">{{ record.product_name || '—' }}</div>
                  <div class="cell-meta">{{ record.asin || '' }}</div>
                  <div v-if="record._batch_label" class="batch-chip">批次 {{ record._batch_label }}</div>
                </div>
              </template>
              <template v-if="column.key === 'buyer'">
                <div>{{ record.buyer_name || '—' }}</div>
                <div v-if="record.chat_account" class="cell-email">聊单号：{{ record.chat_account }}</div>
              </template>
              <template v-if="column.key === 'buyer_paypal'">
                <div class="cell-email">{{ record.buyer_paypal_email || '—' }}</div>
              </template>
              <template v-if="column.key === 'refund_amount'">
                <div class="amount-cell">
                  <span class="amount-usd">${{ money(record._line_amount_usd) }}</span>
                  <span v-if="record._batch_count > 1" class="amount-sub">本行需返</span>
                </div>
              </template>
              <template v-if="column.key === 'actual_amount'">
                <div v-if="record._actual_amount_row_span !== 0 && record._batch_count > 1" class="batch-card">
                  <div class="batch-card-head">
                    <span class="batch-card-tag">批次 {{ record._batch_label }}</span>
                    <span class="batch-card-count">共 {{ record._batch_count }} 笔</span>
                  </div>
                  <div class="batch-card-row is-total">
                    <span>合计实返</span>
                    <strong>${{ money(record._batch_total_usd) }}</strong>
                  </div>
                </div>
                <div v-else-if="record._actual_amount_row_span !== 0" class="amount-cell">
                  <span class="amount-usd">${{ money(record._actual_amount_usd) }}</span>
                  <span class="amount-sub">单笔实返</span>
                </div>
              </template>
              <template v-if="column.key === 'paypal_account'">
                <a-select
                  v-if="record._isMock"
                  :value="record.assigned_paypal_email || undefined"
                  size="small"
                  style="width:100%"
                  @change="changeCompanyPaypal(record, $event)"
                >
                  <a-select-option v-for="acc in ppAccountList" :key="acc.email" :value="acc.email">{{ acc.email }}</a-select-option>
                </a-select>
                <div v-else class="pp-account">{{ record.assigned_paypal_email || '—' }}</div>
              </template>
              <template v-if="column.key === 'refund_status'">
                <a-select
                  v-if="record._isMock"
                  :value="record.refund_status || '已返款'"
                  size="small"
                  style="width:120px"
                  @change="changeRefundStatus('paypal', record, $event)"
                >
                  <a-select-option v-for="item in paypalRefundStatusOptions" :key="item" :value="item">{{ item }}</a-select-option>
                </a-select>
                <a-tag v-else :color="refundStatusColor(record.refund_status || '已返款')">{{ record.refund_status || '已返款' }}</a-tag>
              </template>
              <template v-if="column.key === 'screenshot'">
                <div class="water-slip-cell">
                  <a v-if="record.paypal_receipt_screenshot" :href="record.paypal_receipt_screenshot" target="_blank" class="screenshot-link">查看水单</a>
                  <a-tag v-if="record.water_slip_request_pending" color="orange">已申请追加水单</a-tag>
                  <div v-if="record.water_slip_request_note" class="water-slip-note">{{ record.water_slip_request_note }}</div>
                  <span v-if="!record.paypal_receipt_screenshot && !record.water_slip_request_pending" class="text-gray">—</span>
                </div>
              </template>
              <template v-if="column.key === 'handled_at'">
                <div class="time-cell">
                  <span class="time-operator">{{ handlerName(record) }}</span>
                  <span class="time-text">{{ fmtTime(record.handled_at) }}</span>
                </div>
              </template>
              <template v-if="column.key === 'notes'">
                <span class="notes-text">{{ record.finance_notes || '—' }}</span>
              </template>
              <template v-if="column.key === 'action'">
                <a-space size="small" wrap>
                  <a-button
                    v-if="record._isMock && record.refund_status === '返款失败' && !record.buyer_paypal_resubmitted"
                    type="primary"
                    size="small"
                    @click="openBuyerPaypalChange(record)"
                  >重新申请</a-button>
                  <a-button
                    v-if="record._isMock && record.refund_status === '已返款'"
                    size="small"
                    @click="openReceiptSupplement(record)"
                  >追加水单</a-button>
                  <span v-else-if="!record._isMock" class="text-gray">—</span>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>

    <a-modal
      v-model:open="actionOpen"
      :title="actionTitle"
      width="560px"
      :confirm-loading="actionLoading"
      @ok="submitLedgerAction"
    >
      <div v-if="actionRecord" class="action-summary">
        <div>子订单：<strong>{{ actionRecord.sub_order_number || '—' }}</strong></div>
        <div>买手：<strong>{{ actionRecord.buyer_name || '—' }}</strong></div>
        <div>返款金额：<strong>${{ money(actionRecord.refund_amount_usd) }}</strong></div>
      </div>

      <a-form layout="vertical">
        <a-form-item v-if="actionType === 'ppBuyer'" label="新的买手 PayPal">
          <a-input v-model:value="actionForm.buyerPaypalEmail" placeholder="buyer@example.com" />
        </a-form-item>

        <a-form-item v-if="actionType === 'ppReceipt'" label="追加说明">
          <a-input v-model:value="actionForm.reason" placeholder="例如：业务员补充水单，请财务补传" />
        </a-form-item>

        <a-form-item v-if="actionType === 'giftReturn'" label="重新提交的返款金额 (USD)">
          <a-input-number v-model:value="actionForm.correctedAmountUsd" :min="0" :precision="2" style="width:100%" />
        </a-form-item>

        <a-form-item v-if="actionType === 'giftReturn'" label="重新提交说明">
          <a-input v-model:value="actionForm.reason" placeholder="例如：礼品卡金额填错，回流卡库后重提" />
        </a-form-item>

        <a-form-item label="账单备注">
          <a-textarea v-model:value="actionForm.notes" :rows="3" placeholder="可选" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="giftHistoryOpen"
      title="卡密回流留痕"
      width="520px"
      :footer="null"
    >
      <div v-if="giftHistoryRecord" class="action-summary">
        <div>子订单：<strong>{{ giftHistoryRecord.sub_order_number || '—' }}</strong></div>
        <div>回流时间：<strong>{{ fmtTime(giftHistoryRecord.gift_returned_at) }}</strong></div>
        <div>原卡号：<strong>{{ giftHistoryRecord.returned_gift_card_number || '—' }}</strong></div>
        <div>原卡密：<strong>{{ giftHistoryRecord.returned_gift_card_code || '—' }}</strong></div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const MOCK_LEDGER_PAYPAL_KEY = 'refund-ledger-mock-paypal-v2'
const MOCK_LEDGER_GIFT_KEY = 'refund-ledger-mock-gift-v2'
const QUEUE_PAYPAL_EXTRA_KEY = 'refund-queue-extra-paypal-v1'
const QUEUE_GIFT_EXTRA_KEY = 'refund-queue-extra-gift-v1'
const GIFT_NEW_BASELINE_KEY = 'refund-ledger-gift-new-baseline-v1'
const GIFT_NEW_ACK_KEY = 'refund-ledger-gift-new-ack-v1'
const PAYPAL_NEW_BASELINE_KEY = 'refund-ledger-paypal-new-baseline-v1'

const activeTab = ref('giftcard')

const gcLoading = ref(false)
const gcRecords = ref<any[]>([])
const gcSearch = ref('')
const gcDateRange = ref<any>(null)
const gcPagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` })

const ppLoading = ref(false)
const ppRecords = ref<any[]>([])
const ppSearch = ref('')
const ppDateRange = ref<any>(null)
const ppAccountFilter = ref('')
const ppAccountList = ref<any[]>([])
const ppPagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` })

const gcAllStats = ref<any[]>([])
const ppAllStats = ref<any[]>([])

const mockPaypalSeed = [
  {
    id: 'mock-ledger-paypal-1',
    sub_order_id: 'SUB-LEDGER-PP-001',
    sub_order_number: 'SO-LEDGER-PP-001',
    product_name: 'Travel Coffee Mug',
    asin: 'B0LEDGERPP01',
    buyer_name: '买手-Linda',
    chat_account: 'wx-linda-01',
    buyer_paypal_email: 'linda.old@gmail.com',
    refund_amount_usd: 15,
    assigned_paypal_email: 'finance-us-01@company.com',
    paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=PayPal+Receipt',
    handled_at: dayjs().subtract(4, 'hour').toISOString(),
    finance_notes: '演示：支持直接更换我方转款贝宝',
    workflow_label: '原账单',
    workflow_detail: '可直接更换我方转款 PayPal',
    workflow_state: 'origin',
    refund_status: '已返款',
    _isMock: true,
  },
  {
    id: 'mock-ledger-paypal-2',
    sub_order_id: 'SUB-LEDGER-PP-002',
    sub_order_number: 'SO-LEDGER-PP-002',
    product_name: 'Charging Dock',
    asin: 'B0LEDGERPP02',
    buyer_name: '买手-Jack',
    chat_account: 'wx-jack-02',
    buyer_paypal_email: 'jack-old@gmail.com',
    refund_amount_usd: 12.5,
    assigned_paypal_email: 'finance-us-02@company.com',
    paypal_receipt_screenshot: '',
    handled_at: dayjs().subtract(1, 'day').hour(15).minute(10).toISOString(),
    finance_notes: '演示：买手贝宝填错后需要重提审批',
    workflow_label: '原账单',
    workflow_detail: '可修改买手贝宝并重新提交返款审批',
    workflow_state: 'origin',
    refund_status: '返款失败',
    buyer_paypal_resubmitted: false,
    _isMock: true,
  },
  {
    id: 'mock-ledger-paypal-3',
    sub_order_id: 'SUB-LEDGER-PP-003',
    sub_order_number: 'SO-LEDGER-PP-003',
    product_name: 'Air Fryer Liner',
    asin: 'B0LEDGERPP03',
    buyer_name: '买手-Mia',
    chat_account: 'wx-mia-03',
    buyer_paypal_email: 'mia.fix@gmail.com',
    refund_amount_usd: 9.9,
    assigned_paypal_email: 'finance-us-01@company.com',
    paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=PayPal+Receipt',
    handled_at: dayjs().subtract(2, 'day').hour(11).minute(20).toISOString(),
    finance_notes: '演示：已完成纠正案例',
    workflow_label: '已改买手贝宝并重提',
    workflow_detail: '新买手贝宝：mia.fix@gmail.com',
    workflow_state: 'resubmitted',
    refund_status: '已返款',
    buyer_paypal_resubmitted: true,
    _isMock: true,
  },
  {
    id: 'mock-ledger-paypal-4',
    sub_order_id: 'SUB-LEDGER-PP-004',
    sub_order_number: 'SO-LEDGER-PP-004',
    product_name: 'Kitchen Scale',
    asin: 'B0LEDGERPP04',
    buyer_name: '买手-Sophia',
    chat_account: 'wx-sophia-04',
    buyer_paypal_email: 'sophia.pay@gmail.com',
    refund_amount_usd: 18.8,
    assigned_paypal_email: 'finance-us-03@company.com',
    paypal_receipt_screenshot: '',
    handled_at: dayjs().subtract(6, 'hour').toISOString(),
    finance_notes: '演示：已发起追加水单申请，等待财务补传',
    refund_status: '已返款',
    water_slip_request_pending: true,
    water_slip_request_note: '业务员已申请追加水单，财务待补传',
    _isMock: true,
  },
  {
    id: 'mock-ledger-paypal-5',
    sub_order_id: 'SUB-LEDGER-PP-005',
    sub_order_number: 'SO-LEDGER-PP-005',
    product_name: 'Laptop Stand',
    asin: 'B0LEDGERPP05',
    buyer_name: '买手-Linda',
    chat_account: 'wx-linda-01',
    buyer_paypal_email: 'linda.old@gmail.com',
    refund_amount_usd: 11.2,
    assigned_paypal_email: 'finance-us-01@company.com',
    paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=PayPal+Batch',
    handled_at: dayjs().subtract(5, 'hour').toISOString(),
    finance_notes: '演示：与同买手另一笔一起贝宝返款',
    refund_status: '已返款',
    _isMock: true,
  },
  {
    id: 'mock-ledger-paypal-6',
    sub_order_id: 'SUB-LEDGER-PP-006',
    sub_order_number: 'SO-LEDGER-PP-006',
    product_name: 'Phone Holder',
    asin: 'B0LEDGERPP06',
    buyer_name: '买手-Linda',
    chat_account: 'wx-linda-01',
    buyer_paypal_email: 'linda.old@gmail.com',
    refund_amount_usd: 8.8,
    assigned_paypal_email: 'finance-us-01@company.com',
    paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=PayPal+Batch',
    handled_at: dayjs().subtract(5, 'hour').toISOString(),
    finance_notes: '演示：与同买手另一笔一起贝宝返款',
    refund_status: '已返款',
    _demo_new: true,
    _isMock: true,
  },
]

const mockGiftSeed = [
  {
    id: 'mock-ledger-gift-1',
    sub_order_id: 'SUB-LEDGER-GC-001',
    sub_order_number: 'SO-LEDGER-GC-001',
    product_name: 'Ceramic Vase',
    asin: 'B0LEDGERGC01',
    buyer_name: '买手-Amy',
    chat_account: 'wx-amy-01',
    refund_amount_usd: 20,
    assigned_gift_card_id: 'GC-MOCK-001',
    assigned_gift_card_number: 'GC-5566-0011',
    assigned_gift_card_code: 'QWER-ASDF-ZXCV',
    gift_card_face_value_usd: 20,
    handled_at: dayjs().subtract(3, 'hour').toISOString(),
    finance_notes: '演示：已返款，可先回流卡库',
    refund_status: '已返款',
    gift_returned: false,
    _isMock: true,
  },
  {
    id: 'mock-ledger-gift-2',
    sub_order_id: 'SUB-LEDGER-GC-002',
    sub_order_number: 'SO-LEDGER-GC-002',
    product_name: 'Phone Case',
    asin: 'B0LEDGERGC02',
    buyer_name: '买手-Amy',
    chat_account: 'wx-amy-01',
    refund_amount_usd: 15,
    assigned_gift_card_id: null,
    assigned_gift_card_number: '',
    assigned_gift_card_code: '已回流卡库，待重新提交',
    gift_card_face_value_usd: 15,
    returned_gift_card_number: 'GC-5566-0022',
    returned_gift_card_code: 'TYUI-GHJK-BNMM',
    gift_returned_at: dayjs().subtract(1, 'day').hour(14).minute(10).toISOString(),
    handled_at: dayjs().subtract(1, 'day').hour(13).minute(35).toISOString(),
    finance_notes: '演示：已回流卡库，待重新提交',
    refund_status: '返款中',
    gift_returned: true,
    gift_resubmitted: false,
    _isMock: true,
  },
  {
    id: 'mock-ledger-gift-3',
    sub_order_id: 'SUB-LEDGER-GC-003',
    sub_order_number: 'SO-LEDGER-GC-003',
    product_name: 'Bedside Lamp',
    asin: 'B0LEDGERGC03',
    buyer_name: '买手-Kevin',
    chat_account: 'wx-kevin-02',
    refund_amount_usd: 10,
    assigned_gift_card_id: 'GC-MOCK-003',
    assigned_gift_card_number: 'GC-5566-0033',
    assigned_gift_card_code: 'PLKM-NJUI-HYGT',
    gift_card_face_value_usd: 10,
    handled_at: dayjs().subtract(2, 'day').hour(10).minute(15).toISOString(),
    finance_notes: '历史礼品卡账单示例',
    refund_status: '返款中',
    gift_returned: false,
    _isMock: true,
  },
  {
    id: 'mock-ledger-gift-4',
    sub_order_id: 'SUB-LEDGER-GC-004',
    sub_order_number: 'SO-LEDGER-GC-004',
    product_name: 'Storage Basket',
    asin: 'B0LEDGERGC04',
    buyer_name: '买手-Amy',
    chat_account: 'wx-amy-01',
    refund_amount_usd: 10,
    assigned_gift_card_id: 'GC-MOCK-004',
    assigned_gift_card_number: 'GC-5566-0044',
    assigned_gift_card_code: 'ZXCV-BNMM-POIU',
    gift_card_face_value_usd: 10,
    handled_at: dayjs().subtract(8, 'hour').toISOString(),
    finance_notes: '演示：与同买手另一笔一起发礼品卡',
    refund_status: '已返款',
    gift_returned: false,
    _isMock: true,
  },
  {
    id: 'mock-ledger-gift-5',
    sub_order_id: 'SUB-LEDGER-GC-005',
    sub_order_number: 'SO-LEDGER-GC-005',
    product_name: 'Drawer Organizer',
    asin: 'B0LEDGERGC05',
    buyer_name: '买手-Amy',
    chat_account: 'wx-amy-01',
    refund_amount_usd: 5,
    assigned_gift_card_id: 'GC-MOCK-005',
    assigned_gift_card_number: 'GC-5566-0055',
    assigned_gift_card_code: 'QAZX-WSXC-EDCV',
    gift_card_face_value_usd: 5,
    handled_at: dayjs().subtract(8, 'hour').toISOString(),
    finance_notes: '演示：与同买手另一笔一起发礼品卡',
    refund_status: '已返款',
    gift_returned: false,
    _demo_new: true,
    _isMock: true,
  },
]

const mockPaypalLedgerRecords = ref<any[]>([])
const mockGiftLedgerRecords = ref<any[]>([])
const giftHistoryOpen = ref(false)
const giftHistoryRecord = ref<any | null>(null)

const actionOpen = ref(false)
const actionLoading = ref(false)
const actionType = ref<'ppBuyer' | 'giftReturn' | 'ppReceipt'>('ppBuyer')
const actionRecord = ref<any | null>(null)
const actionForm = ref({
  companyPaypalEmail: '',
  buyerPaypalEmail: '',
  correctedAmountUsd: 0,
  reason: '礼品卡金额填错，已退回礼品卡库后重新提交返款审批',
  notes: '',
})
const paypalRefundStatusOptions = ['未返款', '返款中', '已返款', 'On Hold', '返款失败', '失误多返']
const giftRefundStatusOptions = ['未返款', '返款中', '已返款']

const gcStats = computed(() => {
  const data = gcAllStats.value
  return {
    count: data.length,
    totalUsd: data.reduce((sum, row) => sum + Number(row.gift_card_face_value_usd || row.refund_amount_usd || 0), 0),
    resubmitted: data.filter(row => row.gift_resubmitted).length,
  }
})

const ppStats = computed(() => {
  const data = ppAllStats.value
  return {
    count: data.length,
    totalUsd: data.reduce((sum, row) => sum + Number(row.refund_amount_usd || 0), 0),
    resubmitted: data.filter(row => row.buyer_paypal_resubmitted || row.water_slip_request_pending).length,
  }
})

const actionTitle = computed(() => {
  if (actionType.value === 'ppBuyer') return '更换买手贝宝并重提审批'
  if (actionType.value === 'ppReceipt') return '追加水单申请'
  return '重新提交礼品卡申请'
})

const gcColumns = [
  { title: '子订单 / 产品', key: 'order_info', width: 200 },
  { title: '买手 / 聊单号', key: 'buyer', width: 170 },
  { title: '需返金额', key: 'refund_amount', width: 110 },
  { title: '实返金额', key: 'actual_amount', width: 210, customCell: actualAmountCell },
  { title: '卡密', key: 'gift_card', width: 220, customCell: giftCardCell },
  { title: '返款状态', key: 'refund_status', width: 130 },
  { title: '处理人 / 时间', key: 'handled_at', width: 160 },
  { title: '账单备注', key: 'notes', width: 220 },
  { title: '操作', key: 'action', width: 190, fixed: 'right' as const },
]

const ppColumns = [
  { title: '子订单 / 产品', key: 'order_info', width: 200 },
  { title: '买手 / 聊单号', key: 'buyer', width: 170 },
  { title: '买手贝宝', key: 'buyer_paypal', width: 220 },
  { title: '需返金额', key: 'refund_amount', width: 110 },
  { title: '实返金额', key: 'actual_amount', width: 210, customCell: actualAmountCell },
  { title: '付款 PayPal', key: 'paypal_account', width: 210 },
  { title: '返款状态', key: 'refund_status', width: 130 },
  { title: '水单', key: 'screenshot', width: 160 },
  { title: '处理人 / 时间', key: 'handled_at', width: 160 },
  { title: '账单备注', key: 'notes', width: 220 },
  { title: '操作', key: 'action', width: 240, fixed: 'right' as const },
]

function money(value: any) {
  return Number(value || 0).toFixed(2)
}

function handlerName(record: any) {
  if (!record) return '—'
  return record.refund_operator || record.handled_by || record.processed_by || (record.handled_at ? '财务' : '—')
}

function actualAmountCell(record: any) {
  return {
    rowSpan: record?._actual_amount_row_span ?? 1,
  }
}

function giftCardCell(record: any) {
  return {
    rowSpan: record?._gift_card_row_span ?? 1,
  }
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

function readStorageText(key: string) {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(key) || ''
}

function writeStorageText(key: string, value: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value)
}

function refundStatusColor(status: string) {
  if (status === '已返款') return 'green'
  if (status === '返款中') return 'blue'
  if (status === '返款失败' || status === '失误多返') return 'red'
  if (status === 'On Hold') return 'gold'
  return 'default'
}

function fmtTime(t: string | null) {
  if (!t) return '—'
  return dayjs(t).format('YYYY-MM-DD HH:mm')
}

function buildDateFilter(query: any, field: string, range: any) {
  if (range && range[0] && range[1]) {
    query = query.gte(field, range[0].format('YYYY-MM-DD'))
    query = query.lte(field, range[1].format('YYYY-MM-DD') + 'T23:59:59')
  }
  return query
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function readStorageArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return clone(fallback)
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return clone(fallback)
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : clone(fallback)
  } catch {
    return clone(fallback)
  }
}

function writeStorageArray(key: string, data: any[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(data))
}

function mergeSeedRecords(seed: any[], stored: any[]) {
  const map = new Map<string, any>()
  seed.forEach(item => map.set(item.id, clone(item)))
  stored.forEach(item => map.set(item.id, { ...(map.get(item.id) || {}), ...item }))
  return Array.from(map.values())
}

async function enrichBuyerMeta(rows: any[]) {
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const subOrderIds = Array.from(new Set(rows.map(item => item.sub_order_id).filter((id: string) => uuidLike.test(String(id)))))
  if (!subOrderIds.length) return rows
  const { data: subOrders, error: subOrderError } = await supabase
    .from('sub_orders')
    .select('id, buyer_id')
    .in('id', subOrderIds)
  if (subOrderError) throw subOrderError

  const buyerIds = Array.from(new Set((subOrders || []).map(item => item.buyer_id).filter(Boolean)))
  const buyerMap = new Map<string, any>()
  if (buyerIds.length) {
    const { data: buyers, error: buyerError } = await supabase
      .from('erp_buyers')
      .select('id, chat_account, paypal_email, email')
      .in('id', buyerIds)
    if (buyerError) throw buyerError
    ;(buyers || []).forEach(item => buyerMap.set(item.id, item))
  }

  const subOrderMap = new Map<string, any>()
  ;(subOrders || []).forEach(item => subOrderMap.set(item.id, item))
  return rows.map(item => {
    const buyer = buyerMap.get(subOrderMap.get(item.sub_order_id)?.buyer_id || '')
    return {
      ...item,
      chat_account: item.chat_account || buyer?.chat_account || '',
      buyer_paypal_email: item.buyer_paypal_email || buyer?.paypal_email || buyer?.email || '',
    }
  })
}

function annotateBatchDisplay(rows: any[], type: 'paypal' | 'giftcard') {
  const groups = new Map<string, any[]>()
  rows.forEach(item => {
    const handledAt = item.handled_at ? dayjs(item.handled_at).format('YYYY-MM-DD HH:mm:ss') : ''
    if (!handledAt) return
    const key = type === 'paypal'
      ? ['paypal', item.buyer_paypal_email || '', item.assigned_paypal_email || '', handledAt].join('|')
      : ['giftcard', item.buyer_name || '', handledAt].join('|')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  })

  const metaMap = new Map<string, any>()
  let batchIndex = 1
  groups.forEach(group => {
    const total = group.reduce((sum, item) => sum + Number(item.gift_card_face_value_usd || item.refund_amount_usd || 0), 0)
    const actualAmounts = group.map(item => Number(item.gift_card_face_value_usd || item.refund_amount_usd || 0))
    const mergedGiftCodes = group.map(item => item.assigned_gift_card_code || '').filter(Boolean).join('\n')
    const mergedGiftNumbers = group.map(item => item.assigned_gift_card_number || '').filter(Boolean).join('\n')
    const mergedGiftFaces = group.map(item => item.gift_card_face_value_usd ? `$${money(item.gift_card_face_value_usd)}` : '').filter(Boolean).join(' + ')
    const isBatch = group.length > 1
    const label = isBatch ? `${type === 'paypal' ? 'PP' : 'GC'}-${String(batchIndex).padStart(2, '0')}` : ''
    if (isBatch) batchIndex += 1
    group.forEach((item, index) => metaMap.set(item.id, {
      _batch_label: label,
      _batch_count: group.length,
      _batch_total_usd: total,
      _line_amount_usd: Number(item.refund_amount_usd || item.refund_amount || 0),
      _actual_amount_usd: actualAmounts[index],
      _actual_amount_row_span: isBatch ? (index === 0 ? group.length : 0) : 1,
      _batch_member_ids: group.map(member => member.id),
      _gift_card_row_span: type === 'giftcard' && isBatch ? (index === 0 ? group.length : 0) : 1,
      _gift_card_code_text: type === 'giftcard' && isBatch ? mergedGiftCodes : (item.assigned_gift_card_code || item.assigned_gift_card_number || ''),
      _gift_card_number_text: type === 'giftcard' && isBatch ? mergedGiftNumbers : (item.assigned_gift_card_number || ''),
      _gift_card_face_text: type === 'giftcard' && isBatch ? `批次面额 ${mergedGiftFaces}` : (item.gift_card_face_value_usd ? `面额 $${money(item.gift_card_face_value_usd)}` : ''),
    }))
  })

  return rows.map(item => ({
    ...item,
    _batch_label: metaMap.get(item.id)?._batch_label || '',
    _batch_count: metaMap.get(item.id)?._batch_count || 1,
    _batch_total_usd: metaMap.get(item.id)?._batch_total_usd || Number(item.gift_card_face_value_usd || item.refund_amount_usd || 0),
    _line_amount_usd: metaMap.get(item.id)?._line_amount_usd || Number(item.refund_amount_usd || item.refund_amount || 0),
    _actual_amount_usd: metaMap.get(item.id)?._actual_amount_usd || Number(item.gift_card_face_value_usd || item.refund_amount_usd || 0),
    _actual_amount_row_span: metaMap.get(item.id)?._actual_amount_row_span ?? 1,
    _batch_member_ids: metaMap.get(item.id)?._batch_member_ids || [item.id],
    _gift_card_row_span: metaMap.get(item.id)?._gift_card_row_span ?? 1,
    _gift_card_code_text: metaMap.get(item.id)?._gift_card_code_text || item.assigned_gift_card_code || item.assigned_gift_card_number || '',
    _gift_card_number_text: metaMap.get(item.id)?._gift_card_number_text || item.assigned_gift_card_number || '',
    _gift_card_face_text: metaMap.get(item.id)?._gift_card_face_text || (item.gift_card_face_value_usd ? `面额 $${money(item.gift_card_face_value_usd)}` : ''),
  }))
}

function annotateNewFlags(rows: any[], type: 'giftcard' | 'paypal') {
  const now = new Date().toISOString()
  if (type === 'giftcard') {
    let baseline = readStorageText(GIFT_NEW_BASELINE_KEY)
    if (!baseline) {
      baseline = now
      writeStorageText(GIFT_NEW_BASELINE_KEY, baseline)
    }
    const ackIds = new Set(readStorageArray<string>(GIFT_NEW_ACK_KEY, []))
    return rows.map(item => ({
      ...item,
      _isNew: !ackIds.has(item.id) && (
        Boolean(item._demo_new) ||
        (item.handled_at ? dayjs(item.handled_at).isAfter(dayjs(baseline)) : false)
      ),
    }))
  }

  let baseline = readStorageText(PAYPAL_NEW_BASELINE_KEY)
  const shouldUseDemoFlag = !baseline
  if (!baseline) baseline = now
  const nextRows = rows.map(item => ({
    ...item,
    _isNew: (shouldUseDemoFlag && Boolean(item._demo_new)) || (item.handled_at ? dayjs(item.handled_at).isAfter(dayjs(baseline)) : false),
  }))
  writeStorageText(PAYPAL_NEW_BASELINE_KEY, now)
  return nextRows
}

async function copyGiftCodes(record: any) {
  const text = String(record?._gift_card_code_text || '').trim()
  if (!text) {
    message.warning('暂无可复制卡密')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    const ackIds = Array.from(new Set([
      ...readStorageArray<string>(GIFT_NEW_ACK_KEY, []),
      ...(record._batch_member_ids || [record.id]),
    ]))
    writeStorageArray(GIFT_NEW_ACK_KEY, ackIds)
    gcRecords.value = gcRecords.value.map(item =>
      ackIds.includes(item.id) ? { ...item, _isNew: false } : item,
    )
    message.success('卡密已复制')
  } catch {
    message.error('复制失败')
  }
}

async function fetchGiftLedgerExportRecords() {
  const filteredMock = filterGiftMockRecords().sort((a, b) => dayjs(b.handled_at).valueOf() - dayjs(a.handled_at).valueOf())
  let query = supabase
    .from('refund_requests')
    .select('id, sub_order_id, sub_order_number, product_name, asin, buyer_name, refund_amount_usd, assigned_gift_card_number, assigned_gift_card_code, gift_card_face_value_usd, handled_at, finance_notes')
    .eq('status', '已处理')
    .eq('refund_method', '礼品卡')
    .order('handled_at', { ascending: false })
  query = buildDateFilter(query, 'handled_at', gcDateRange.value)
  if (gcSearch.value) {
    const kw = `%${gcSearch.value}%`
    query = query.or(`buyer_name.ilike.${kw},sub_order_number.ilike.${kw},product_name.ilike.${kw}`)
  }
  const { data, error } = await query
  if (error) throw error
  return annotateBatchDisplay(
    await enrichBuyerMeta([...filteredMock, ...((data || []).map(item => ({ ...item, _isMock: false })))]),
    'giftcard',
  )
}

async function fetchPaypalLedgerExportRecords() {
  const filteredMock = filterPaypalMockRecords().sort((a, b) => dayjs(b.handled_at).valueOf() - dayjs(a.handled_at).valueOf())
  let query = supabase
    .from('refund_requests')
    .select('id, sub_order_id, sub_order_number, product_name, asin, buyer_name, buyer_paypal_email, refund_amount_usd, assigned_paypal_email, paypal_receipt_screenshot, handled_at, finance_notes')
    .eq('status', '已处理')
    .eq('refund_method', 'PayPal')
    .order('handled_at', { ascending: false })
  query = buildDateFilter(query, 'handled_at', ppDateRange.value)
  if (ppAccountFilter.value) query = query.eq('assigned_paypal_email', ppAccountFilter.value)
  if (ppSearch.value) {
    const kw = `%${ppSearch.value}%`
    query = query.or(`buyer_name.ilike.${kw},sub_order_number.ilike.${kw},product_name.ilike.${kw},buyer_paypal_email.ilike.${kw}`)
  }
  const { data, error } = await query
  if (error) throw error
  return annotateBatchDisplay(
    await enrichBuyerMeta([...filteredMock, ...((data || []).map(item => ({ ...item, _isMock: false })))]),
    'paypal',
  )
}

async function exportLedger(type: 'paypal' | 'giftcard') {
  try {
    const rows = type === 'paypal' ? await fetchPaypalLedgerExportRecords() : await fetchGiftLedgerExportRecords()
    const headers = type === 'paypal'
      ? ['子订单号', '产品', '买手', '聊单号', '买手贝宝', '需返金额', '实返金额', '批次', '付款PayPal', '返款状态', '处理时间', '账单备注']
      : ['子订单号', '产品', '买手', '聊单号', '需返金额', '实返金额', '批次', '卡号', '卡密', '返款状态', '处理时间', '账单备注']
    const dataRows = rows.map(item => type === 'paypal'
      ? [
          item.sub_order_number || '',
          item.product_name || '',
          item.buyer_name || '',
          item.chat_account || '',
          item.buyer_paypal_email || '',
          money(item._line_amount_usd),
          money(item._batch_count > 1 ? item._batch_total_usd : item._actual_amount_usd),
          item._batch_label || '',
          item.assigned_paypal_email || '',
          item.refund_status || '',
          fmtTime(item.handled_at),
          item.finance_notes || '',
        ]
      : [
          item.sub_order_number || '',
          item.product_name || '',
          item.buyer_name || '',
          item.chat_account || '',
          money(item._line_amount_usd),
          money(item._batch_count > 1 ? item._batch_total_usd : item._actual_amount_usd),
          item._batch_label || '',
          item._gift_card_number_text || '',
          item._gift_card_code_text || '',
          item.refund_status || '',
          fmtTime(item.handled_at),
          item.finance_notes || '',
        ])
    downloadCsv(`返款账单_${type === 'paypal' ? 'PayPal' : '礼品卡'}_${dayjs().format('YYYYMMDD_HHmm')}.csv`, headers, dataRows)
    message.success('导出成功')
  } catch (e: any) {
    message.error(`导出失败：${e.message || e}`)
  }
}

function loadMockLedgerState() {
  mockPaypalLedgerRecords.value = mergeSeedRecords(mockPaypalSeed, readStorageArray(MOCK_LEDGER_PAYPAL_KEY, []))
  mockGiftLedgerRecords.value = mergeSeedRecords(mockGiftSeed, readStorageArray(MOCK_LEDGER_GIFT_KEY, []))
}

function persistMockLedgerState(type: 'paypal' | 'giftcard') {
  writeStorageArray(type === 'paypal' ? MOCK_LEDGER_PAYPAL_KEY : MOCK_LEDGER_GIFT_KEY, type === 'paypal' ? mockPaypalLedgerRecords.value : mockGiftLedgerRecords.value)
}

function changeCompanyPaypal(record: any, email: string) {
  mockPaypalLedgerRecords.value = mockPaypalLedgerRecords.value.map(item =>
    item.id === record.id
      ? {
          ...item,
          assigned_paypal_email: email,
          finance_notes: [`付款 PayPal 已切换至 ${email}`, item.finance_notes].filter(Boolean).join('；'),
        }
      : item,
  )
  persistMockLedgerState('paypal')
  loadPaypalRefunds()
  loadPaypalStats()
  message.success('付款 PayPal 已直接更新')
}

function changeRefundStatus(type: 'paypal' | 'giftcard', record: any, status: string) {
  const updater = (item: any) =>
    item.id === record.id
      ? {
          ...item,
          refund_status: status,
          finance_notes: status === '返款失败'
            ? [item.finance_notes, '返款状态已改为返款失败，业务员可重新申请'].filter(Boolean).join('；')
            : item.finance_notes,
        }
      : item
  if (type === 'paypal') {
    mockPaypalLedgerRecords.value = mockPaypalLedgerRecords.value.map(updater)
  } else {
    mockGiftLedgerRecords.value = mockGiftLedgerRecords.value.map(updater)
  }
  persistMockLedgerState(type)
  if (type === 'paypal') {
    loadPaypalRefunds()
    loadPaypalStats()
  } else {
    loadGiftCardRefunds()
    loadGiftCardStats()
  }
}

function hasGiftReturnTrail(record: any) {
  return Boolean(record.returned_gift_card_number || record.returned_gift_card_code || record.gift_returned_at)
}

function openGiftHistory(record: any) {
  giftHistoryRecord.value = record
  giftHistoryOpen.value = true
}

function giftRollback(record: any) {
  const now = new Date().toISOString()
  mockGiftLedgerRecords.value = mockGiftLedgerRecords.value.map(item =>
    item.id === record.id
      ? {
          ...item,
          gift_returned: true,
          gift_resubmitted: false,
          returned_gift_card_number: item.assigned_gift_card_number,
          returned_gift_card_code: item.assigned_gift_card_code,
          gift_returned_at: now,
          assigned_gift_card_id: null,
          assigned_gift_card_number: '',
          assigned_gift_card_code: '已回流卡库，待重新提交',
          refund_status: '返款中',
          finance_notes: [item.finance_notes, '原卡密已回流卡库，待业务重新提交'].filter(Boolean).join('；'),
          updated_at: now,
        }
      : item,
  )
  persistMockLedgerState('giftcard')
  loadGiftCardRefunds()
  loadGiftCardStats()
  message.success('礼品卡已回流卡库，可继续重新提交')
}

function appendQueueExtra(type: 'paypal' | 'gift', row: any) {
  const key = type === 'paypal' ? QUEUE_PAYPAL_EXTRA_KEY : QUEUE_GIFT_EXTRA_KEY
  const current = readStorageArray<any>(key, [])
  const next = [row, ...current.filter(item => item.id !== row.id)]
  writeStorageArray(key, next)
}

function filterPaypalMockRecords() {
  return mockPaypalLedgerRecords.value.filter(item => {
    if (ppDateRange.value?.[0] && ppDateRange.value?.[1]) {
      const current = dayjs(item.handled_at)
      if (current.isBefore(ppDateRange.value[0], 'day') || current.isAfter(ppDateRange.value[1], 'day')) return false
    }
    if (ppAccountFilter.value && item.assigned_paypal_email !== ppAccountFilter.value) return false
    if (ppSearch.value) {
      const kw = ppSearch.value.trim().toLowerCase()
      const haystack = [item.buyer_name, item.chat_account, item.buyer_paypal_email, item.sub_order_number, item.product_name].join(' ').toLowerCase()
      if (!haystack.includes(kw)) return false
    }
    return true
  })
}

function filterGiftMockRecords() {
  return mockGiftLedgerRecords.value.filter(item => {
    if (gcDateRange.value?.[0] && gcDateRange.value?.[1]) {
      const current = dayjs(item.handled_at)
      if (current.isBefore(gcDateRange.value[0], 'day') || current.isAfter(gcDateRange.value[1], 'day')) return false
    }
    if (gcSearch.value) {
      const kw = gcSearch.value.trim().toLowerCase()
      const haystack = [item.buyer_name, item.chat_account, item.sub_order_number, item.product_name].join(' ').toLowerCase()
      if (!haystack.includes(kw)) return false
    }
    return true
  })
}

function reloadGiftCardFromFirstPage() {
  gcPagination.value.current = 1
  loadGiftCardRefunds()
  loadGiftCardStats()
}

function reloadPaypalFromFirstPage() {
  ppPagination.value.current = 1
  loadPaypalRefunds()
  loadPaypalStats()
}

async function loadGiftCardRefunds() {
  gcLoading.value = true
  try {
    const filteredMock = filterGiftMockRecords().sort((a, b) => dayjs(b.handled_at).valueOf() - dayjs(a.handled_at).valueOf())
    const mockCount = filteredMock.length
    const pageStart = (gcPagination.value.current - 1) * gcPagination.value.pageSize
    const pageEnd = pageStart + gcPagination.value.pageSize
    const mockPageRows = filteredMock.slice(pageStart, pageEnd)
    const realStart = Math.max(pageStart - mockCount, 0)
    const realPageSize = gcPagination.value.pageSize - mockPageRows.length

    let query = supabase
      .from('refund_requests')
      .select('id, sub_order_id, sub_order_number, product_name, asin, buyer_name, refund_amount_usd, assigned_gift_card_number, assigned_gift_card_code, gift_card_face_value_usd, handled_at, finance_notes', { count: 'exact' })
      .eq('status', '已处理')
      .eq('refund_method', '礼品卡')
      .order('handled_at', { ascending: false })
    query = buildDateFilter(query, 'handled_at', gcDateRange.value)
    if (gcSearch.value) {
      const kw = `%${gcSearch.value}%`
      query = query.or(`buyer_name.ilike.${kw},sub_order_number.ilike.${kw},product_name.ilike.${kw}`)
    }
    if (realPageSize > 0) query = query.range(realStart, realStart + realPageSize - 1)
    else query = query.range(0, -1)
    const { data, count, error } = await query
    if (error) throw error
    gcRecords.value = annotateNewFlags(
      annotateBatchDisplay(
        await enrichBuyerMeta([...mockPageRows, ...((data || []).map(item => ({ ...item, _isMock: false })) )]),
        'giftcard',
      ),
      'giftcard',
    )
    gcPagination.value.total = (count || 0) + mockCount
  } finally {
    gcLoading.value = false
  }
}

async function loadGiftCardStats() {
  const filteredMock = filterGiftMockRecords()
  let query = supabase
    .from('refund_requests')
    .select('refund_amount_usd, gift_card_face_value_usd')
    .eq('status', '已处理')
    .eq('refund_method', '礼品卡')
  query = buildDateFilter(query, 'handled_at', gcDateRange.value)
  const { data } = await query
  gcAllStats.value = [...filteredMock, ...(data || [])]
}

async function loadPaypalRefunds() {
  ppLoading.value = true
  try {
    const filteredMock = filterPaypalMockRecords().sort((a, b) => dayjs(b.handled_at).valueOf() - dayjs(a.handled_at).valueOf())
    const mockCount = filteredMock.length
    const pageStart = (ppPagination.value.current - 1) * ppPagination.value.pageSize
    const pageEnd = pageStart + ppPagination.value.pageSize
    const mockPageRows = filteredMock.slice(pageStart, pageEnd)
    const realStart = Math.max(pageStart - mockCount, 0)
    const realPageSize = ppPagination.value.pageSize - mockPageRows.length

    let query = supabase
      .from('refund_requests')
      .select('id, sub_order_id, sub_order_number, product_name, asin, buyer_name, buyer_paypal_email, refund_amount_usd, assigned_paypal_email, paypal_receipt_screenshot, handled_at, finance_notes', { count: 'exact' })
      .eq('status', '已处理')
      .eq('refund_method', 'PayPal')
      .order('handled_at', { ascending: false })
    query = buildDateFilter(query, 'handled_at', ppDateRange.value)
    if (ppAccountFilter.value) query = query.eq('assigned_paypal_email', ppAccountFilter.value)
    if (ppSearch.value) {
      const kw = `%${ppSearch.value}%`
      query = query.or(`buyer_name.ilike.${kw},sub_order_number.ilike.${kw},product_name.ilike.${kw},buyer_paypal_email.ilike.${kw}`)
    }
    if (realPageSize > 0) query = query.range(realStart, realStart + realPageSize - 1)
    else query = query.range(0, -1)
    const { data, count, error } = await query
    if (error) throw error
    ppRecords.value = annotateNewFlags(
      annotateBatchDisplay(
        await enrichBuyerMeta([...mockPageRows, ...((data || []).map(item => ({ ...item, _isMock: false })) )]),
        'paypal',
      ),
      'paypal',
    )
    ppPagination.value.total = (count || 0) + mockCount
  } finally {
    ppLoading.value = false
  }
}

async function loadPaypalStats() {
  const filteredMock = filterPaypalMockRecords()
  let query = supabase
    .from('refund_requests')
    .select('refund_amount_usd')
    .eq('status', '已处理')
    .eq('refund_method', 'PayPal')
  query = buildDateFilter(query, 'handled_at', ppDateRange.value)
  if (ppAccountFilter.value) query = query.eq('assigned_paypal_email', ppAccountFilter.value)
  const { data } = await query
  ppAllStats.value = [...filteredMock, ...(data || [])]
}

async function loadPaypalAccounts() {
  const mockAccounts = [
    { email: 'finance-us-01@company.com' },
    { email: 'finance-us-02@company.com' },
    { email: 'finance-us-03@company.com' },
  ]
  const { data } = await supabase.from('paypal_accounts').select('email').eq('status', '正常').order('email')
  const emails = new Set<string>([...mockAccounts.map(item => item.email), ...((data || []).map(item => item.email))])
  ppAccountList.value = Array.from(emails).sort().map(email => ({ email }))
}

function openBuyerPaypalChange(record: any) {
  actionType.value = 'ppBuyer'
  actionRecord.value = record
  actionForm.value = {
    companyPaypalEmail: '',
    buyerPaypalEmail: record.buyer_paypal_email || '',
    correctedAmountUsd: Number(record.refund_amount_usd || 0),
    reason: '',
    notes: '买手 PayPal 修改后重新提交返款审批',
  }
  actionOpen.value = true
}

function openReceiptSupplement(record: any) {
  actionType.value = 'ppReceipt'
  actionRecord.value = record
  actionForm.value = {
    companyPaypalEmail: '',
    buyerPaypalEmail: '',
    correctedAmountUsd: Number(record.refund_amount_usd || 0),
    reason: '业务员补充水单，请财务补传到账单',
    notes: '会在返款审批里生成一条仅补水单的待处理提醒',
  }
  actionOpen.value = true
}

function openGiftReturn(record: any) {
  actionType.value = 'giftReturn'
  actionRecord.value = record
  actionForm.value = {
    companyPaypalEmail: '',
    buyerPaypalEmail: '',
    correctedAmountUsd: Number(record.refund_amount_usd || 0),
    reason: '礼品卡金额填错，已退回礼品卡库后重新提交返款审批',
    notes: '',
  }
  actionOpen.value = true
}

async function submitLedgerAction() {
  if (!actionRecord.value?._isMock) {
    message.info('当前仅对模拟数据开放交互演示')
    return
  }
  actionLoading.value = true
  try {
    const now = new Date().toISOString()
    if (actionType.value === 'ppBuyer') {
      if (!actionForm.value.buyerPaypalEmail.trim()) {
        message.warning('请填写新的买手 PayPal')
        return
      }
      const newEmail = actionForm.value.buyerPaypalEmail.trim()
      const resubmitId = `mock-paypal-resub-${Date.now()}`
      mockPaypalLedgerRecords.value = mockPaypalLedgerRecords.value.map(item =>
        item.id === actionRecord.value.id
          ? {
              ...item,
              buyer_paypal_email: newEmail,
              buyer_paypal_resubmitted: true,
              finance_notes: [item.finance_notes, `已重新申请，新买手贝宝：${newEmail}`, actionForm.value.notes].filter(Boolean).join('；'),
              updated_at: now,
            }
          : item,
      )
      persistMockLedgerState('paypal')
      appendQueueExtra('paypal', {
        id: resubmitId,
        sub_order_id: actionRecord.value.sub_order_id,
        sub_order_number: actionRecord.value.sub_order_number,
        buyer_name: actionRecord.value.buyer_name,
        buyer_paypal_email: newEmail,
        product_name: actionRecord.value.product_name,
        asin: actionRecord.value.asin,
        store_name: '账单重提',
        staff_name: '财务重提',
        refund_method: 'PayPal',
        refund_amount_usd: Number(actionRecord.value.refund_amount_usd || 0),
        product_price: Number(actionRecord.value.refund_amount_usd || 0),
        status: '待处理',
        notes: `返款账单重新申请：买手 PayPal 已修改。${actionForm.value.notes || ''}`.trim(),
        finance_notes: '',
        paypal_receipt_screenshot: '',
        request_type: 'correction',
        created_at: now,
        handled_at: null,
      })
      message.success('已重新提交到返款审批中的贝宝返款')
    } else if (actionType.value === 'ppReceipt') {
      const resubmitId = `mock-paypal-receipt-${Date.now()}`
      mockPaypalLedgerRecords.value = mockPaypalLedgerRecords.value.map(item =>
        item.id === actionRecord.value.id
          ? {
              ...item,
              water_slip_request_pending: true,
              water_slip_request_note: actionForm.value.reason || '业务员已发起追加水单申请',
              finance_notes: [item.finance_notes, '已申请追加水单', actionForm.value.notes].filter(Boolean).join('；'),
              updated_at: now,
            }
          : item,
      )
      persistMockLedgerState('paypal')
      appendQueueExtra('paypal', {
        id: resubmitId,
        sub_order_id: actionRecord.value.sub_order_id,
        sub_order_number: actionRecord.value.sub_order_number,
        buyer_name: actionRecord.value.buyer_name,
        buyer_paypal_email: actionRecord.value.buyer_paypal_email,
        product_name: actionRecord.value.product_name,
        asin: actionRecord.value.asin,
        store_name: '账单补水单',
        staff_name: '业务员补传',
        refund_method: 'PayPal',
        refund_amount_usd: Number(actionRecord.value.refund_amount_usd || 0),
        product_price: Number(actionRecord.value.refund_amount_usd || 0),
        status: '待处理',
        notes: `${actionForm.value.reason || '补水单'} [需财务水单] [仅补水单无需重新打款] ${actionForm.value.notes || ''}`.trim(),
        finance_notes: '',
        paypal_receipt_screenshot: '',
        request_type: 'screenshot',
        created_at: now,
        handled_at: null,
      })
      message.success('已发起追加水单申请，财务会在返款审批里看到待处理提醒')
    } else {
      if (!actionForm.value.correctedAmountUsd || Number(actionForm.value.correctedAmountUsd) <= 0) {
        message.warning('请填写重新提交的返款金额')
        return
      }
      const resubmitId = `mock-gift-resub-${Date.now()}`
      const returnedCardNumber = actionRecord.value.returned_gift_card_number || actionRecord.value.assigned_gift_card_number || '原卡密'
      mockGiftLedgerRecords.value = mockGiftLedgerRecords.value.map(item =>
        item.id === actionRecord.value.id
          ? {
              ...item,
              gift_returned: true,
              gift_resubmitted: true,
              returned_gift_card_number: item.returned_gift_card_number || item.assigned_gift_card_number,
              returned_gift_card_code: item.returned_gift_card_code || item.assigned_gift_card_code,
              gift_returned_at: item.gift_returned_at || now,
              assigned_gift_card_number: '',
              assigned_gift_card_code: '已重新提交，待财务重新选卡',
              finance_notes: [item.finance_notes, `已重新提交 $${money(actionForm.value.correctedAmountUsd)}`, actionForm.value.reason, actionForm.value.notes].filter(Boolean).join('；'),
              updated_at: now,
            }
          : item,
      )
      persistMockLedgerState('giftcard')
      appendQueueExtra('gift', {
        id: resubmitId,
        sub_order_id: actionRecord.value.sub_order_id,
        sub_order_number: actionRecord.value.sub_order_number,
        buyer_name: actionRecord.value.buyer_name,
        product_name: actionRecord.value.product_name,
        asin: actionRecord.value.asin,
        store_name: '账单重提',
        staff_name: '财务重提',
        refund_method: '礼品卡',
        refund_amount_usd: Number(actionForm.value.correctedAmountUsd || 0),
        product_price: Number(actionForm.value.correctedAmountUsd || 0),
        status: '待处理',
        notes: `返款账单重新提交：原礼品卡 ${returnedCardNumber} 已回流卡库。${actionForm.value.reason || ''}`.trim(),
        finance_notes: '',
        request_type: 'correction',
        created_at: now,
        handled_at: null,
      })
      message.success('礼品卡已重新提交到返款审批')
    }
    actionOpen.value = false
    if (activeTab.value === 'paypal') {
      await loadPaypalRefunds()
      await loadPaypalStats()
    } else {
      await loadGiftCardRefunds()
      await loadGiftCardStats()
    }
  } finally {
    actionLoading.value = false
  }
}

function handleGcTableChange(pag: any) {
  gcPagination.value.current = pag.current
  gcPagination.value.pageSize = pag.pageSize
  loadGiftCardRefunds()
}

function handlePpTableChange(pag: any) {
  ppPagination.value.current = pag.current
  ppPagination.value.pageSize = pag.pageSize
  loadPaypalRefunds()
}

function onTabChange(key: string) {
  if (key === 'giftcard') {
    reloadGiftCardFromFirstPage()
  } else {
    reloadPaypalFromFirstPage()
  }
}

onMounted(async () => {
  loadMockLedgerState()
  await loadPaypalAccounts()
  await loadGiftCardRefunds()
  await loadGiftCardStats()
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }

.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px 24px;
  text-align: center;
}
.stat-card.highlight-gold { background: #fffbeb; border-color: #fde68a; }
.stat-card.highlight-blue { background: #eff6ff; border-color: #bfdbfe; }
.stat-card.highlight-green { background: #f0fdf4; border-color: #bbf7d0; }

.stat-num { font-size: 26px; font-weight: 700; color: #1a1a2e; }
.stat-num.gold { color: #d97706; }
.stat-num.blue { color: #2563eb; }
.stat-num.green { color: #059669; }
.stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
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

.cell-info { display: flex; flex-direction: column; gap: 2px; }
.cell-sub-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.cell-subno { font-family: 'Courier New', monospace; font-size: 11px; font-weight: 700; color: #1a1a2e; }
.cell-product { font-size: 12px; color: #374151; }
.cell-meta { font-size: 11px; color: #9ca3af; }
.cell-email { font-size: 11px; color: #6b7280; }
.new-tag { margin: 0; line-height: 16px; }
.batch-chip {
  display: inline-flex;
  align-self: flex-start;
  margin-top: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.18);
}

.amount-cell { display: flex; flex-direction: column; gap: 2px; }
.amount-usd { font-weight: 700; color: #dc2626; font-size: 14px; }
.amount-sub { font-size: 11px; color: #6b7280; }
.text-gray { color: #9ca3af; font-size: 12px; }
.time-cell { display: flex; flex-direction: column; gap: 2px; }
.time-operator { font-size: 11px; color: #6b7280; }
.time-text { font-size: 12px; color: #374151; }
.notes-text { font-size: 12px; color: #6b7280; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.batch-card {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
}
.batch-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.batch-card-tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
}
.batch-card-count {
  font-size: 11px;
  color: #6b7280;
}
.batch-card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #1a1a2e;
}
.batch-card-row + .batch-card-row {
  margin-top: 4px;
}
.batch-card-row strong {
  font-size: 13px;
  color: #1a1a2e;
}
.batch-card-row.is-total {
  padding-top: 4px;
  border-top: 1px dashed #bfdbfe;
}
.batch-card-row.is-total strong {
  color: #2563eb;
}

.gc-cell { display: flex; flex-direction: column; gap: 2px; }
.gc-number { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; font-weight: 600; white-space: pre-line; }
.gc-code-text { font-family: 'Courier New', monospace; font-size: 12px; color: #059669; font-weight: 700; white-space: pre-line; }
.gc-face { font-size: 11px; color: #9ca3af; white-space: pre-line; }
.gift-copy-link { padding: 0; align-self: flex-start; }

.pp-account { font-size: 12px; color: #374151; }
.screenshot-link { font-size: 12px; color: #2563eb; }
.workflow-cell { display: flex; flex-direction: column; gap: 4px; }
.workflow-detail { font-size: 11px; color: #6b7280; }

.action-summary {
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

@media (max-width: 900px) {
  .stats-row {
    flex-direction: column;
  }
}
</style>
