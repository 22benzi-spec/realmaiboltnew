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
            <div class="country-amount-grid">
              <div v-for="item in gcStats.countryTotals" :key="item.country" class="country-amount-item">
                <span>{{ item.country }}</span>
                <strong>${{ money(item.totalUsd) }}</strong>
              </div>
            </div>
            <div class="stat-label">返款总金额</div>
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
            <a-select v-model:value="gcReturnFilter" style="width:130px" allow-clear placeholder="回流状态" @change="reloadGiftCardFromFirstPage">
              <a-select-option value="yes">是</a-select-option>
              <a-select-option value="no">否</a-select-option>
            </a-select>
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
                </div>
              </template>
              <template v-if="column.key === 'gift_card'">
                <div v-if="record._gift_card_row_span !== 0" class="gc-cell">
                  <div class="gc-code-text">{{ record._gift_card_display_text || record._gift_card_code_text || '—' }}</div>
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
                    v-if="canResubmitGiftCard(record)"
                    type="primary"
                    size="small"
                    @click="openGiftReturn(record)"
                  >重新提交</a-button>
                  <a-button
                    v-if="!canResubmitGiftCard(record) && canProcessGiftCard(record)"
                    size="small"
                    @click="openGiftRollback(record)"
                  >回流卡库</a-button>
                  <span v-if="!canResubmitGiftCard(record) && !canProcessGiftCard(record)" class="text-gray">—</span>
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
            <div class="country-amount-grid">
              <div v-for="item in ppStats.countryTotals" :key="item.country" class="country-amount-item">
                <span>{{ item.country }}</span>
                <strong>${{ money(item.totalUsd) }}</strong>
              </div>
            </div>
            <div class="stat-label">返款总金额</div>
          </div>
          <div class="stat-card highlight-green">
            <div class="stat-num green">{{ ppStats.resubmitted }}</div>
            <div class="stat-label">重新申请</div>
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
            :row-class-name="paypalRowClassName"
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
                    <a-tag v-if="record._isSupplementalRefund" color="gold" class="new-tag">追加</a-tag>
                    <a-tag v-else-if="record._refund_group_count > 1" color="blue" class="new-tag">首笔</a-tag>
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
                    v-if="canResubmitPaypal(record)"
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

        <a-form-item v-if="actionType === 'ppBuyer' && actionForm.paypalReturnItems.length <= 1" label="重新申请的返款金额 (USD)">
          <a-input-number v-model:value="actionForm.correctedAmountUsd" :min="0" :precision="2" style="width:100%" />
        </a-form-item>

        <a-form-item v-if="actionType === 'ppBuyer' && actionForm.paypalReturnItems.length > 1" label="重新申请的返款金额 (USD)">
          <div class="gift-return-amount-list">
            <div v-for="item in actionForm.paypalReturnItems" :key="item.id" class="gift-return-amount-row">
              <div class="gift-return-order">
                <span class="gift-return-order-id">{{ item.subOrderNumber || item.subOrderId || item.id }}</span>
                <span class="gift-return-order-meta">{{ item.productName || '—' }}</span>
              </div>
              <a-input-number v-model:value="item.correctedAmountUsd" :min="0" :precision="2" style="width:160px" />
            </div>
          </div>
        </a-form-item>

        <a-form-item v-if="actionType === 'giftReturn'" label="重新提交的返款金额 (USD)">
          <a-input-number v-model:value="actionForm.correctedAmountUsd" :min="0" :precision="2" style="width:100%" />
        </a-form-item>

        <a-form-item label="账单备注">
          <a-textarea v-model:value="actionForm.notes" :rows="3" placeholder="可选" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="giftRollbackOpen"
      title="处理卡密"
      width="620px"
      ok-text="确认处理"
      cancel-text="取消"
      :confirm-loading="giftRollbackLoading"
      @ok="submitGiftRollback"
    >
      <div v-if="giftRollbackRecord" class="action-summary">
        <div>子订单：<strong>{{ giftRollbackRecord.sub_order_number || '—' }}</strong></div>
        <div>买手：<strong>{{ giftRollbackRecord.buyer_name || '—' }}</strong></div>
        <div>可处理卡密：<strong>{{ giftRollbackOptions.length }} 张</strong></div>
      </div>

      <a-form layout="vertical">
        <a-form-item label="快捷操作">
          <a-space>
            <a-button size="small" @click="setAllGiftProcessActions('return')">全部回流</a-button>
            <a-button size="small" danger @click="setAllGiftProcessActions('void')">全部作废</a-button>
          </a-space>
        </a-form-item>

        <a-form-item label="选择要处理的卡密">
          <a-checkbox-group v-model:value="giftRollbackSelectedIds" class="gift-rollback-list">
            <div v-for="card in giftRollbackOptions" :key="card.id" class="gift-process-option">
              <div class="gift-process-row">
                <a-checkbox :value="card.id" class="gift-process-check">
                  <span class="gift-rollback-main">{{ card.card_code || '无卡密' }}</span>
                  <span class="gift-rollback-sub">${{ money(card.amount) }}</span>
                </a-checkbox>
                <a-radio-group
                  :value="giftRollbackActions[card.id] || 'return'"
                  size="small"
                  :disabled="!giftRollbackSelectedIds.includes(card.id)"
                  @change="setGiftProcessAction(card.id, $event.target.value)"
                >
                  <a-radio-button value="return">回流卡库</a-radio-button>
                  <a-radio-button value="void">标记作废</a-radio-button>
                </a-radio-group>
              </div>
              <div
                v-if="giftRollbackSelectedIds.includes(card.id) && giftRollbackActions[card.id] === 'void'"
                class="gift-void-proof"
              >
                <div
                  class="gift-void-proof-box"
                  tabindex="0"
                  @click="openGiftVoidProofPicker(card.id)"
                  @paste="handleGiftVoidProofPaste(card.id, $event)"
                >
                  <input
                    :id="giftVoidProofInputId(card.id)"
                    type="file"
                    accept="image/*,.pdf"
                    @change="handleGiftVoidProofFile(card.id, $event)"
                  />
                  <span class="gift-void-proof-title">{{ giftVoidProofs[card.id]?.fileName || '上传或粘贴作废凭证' }}</span>
                  <span class="gift-void-proof-desc">{{ giftVoidProofs[card.id]?.note || '点击上传文件，也可以直接 Ctrl+V 粘贴截图或文字说明' }}</span>
                </div>
              </div>
            </div>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="giftHistoryOpen"
      title="卡密处理留痕"
      width="520px"
      :footer="null"
    >
      <div v-if="giftHistoryRecord" class="action-summary">
        <div>子订单：<strong>{{ giftHistoryRecord.sub_order_number || '—' }}</strong></div>
        <div>处理类型：<strong>{{ giftCardProcessLabel(giftHistoryRecord) }}</strong></div>
        <div>处理时间：<strong>{{ fmtTime(giftHistoryRecord.gift_returned_at || giftHistoryRecord.gift_voided_at) }}</strong></div>
        <div>原卡号：<strong>{{ giftHistoryRecord.returned_gift_card_number || giftHistoryRecord.voided_gift_card_number || '—' }}</strong></div>
        <div>原卡密：<strong>{{ giftHistoryRecord.returned_gift_card_code || giftHistoryRecord.voided_gift_card_code || '—' }}</strong></div>
        <div v-if="giftHistoryRecord.gift_void_proof_file_name">作废凭证：<strong>{{ giftHistoryRecord.gift_void_proof_file_name }}</strong></div>
        <div v-if="giftHistoryRecord.gift_void_proof_note">凭证说明：<strong>{{ giftHistoryRecord.gift_void_proof_note }}</strong></div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="giftOverpayOpen"
      title="本次重新申请金额超过回流卡密面值"
      width="640px"
      ok-text="保存实付金额"
      cancel-text="返回修改"
      @ok="confirmGiftActualPaidChange"
    >
      <div class="gift-overpay-alert">
        <div>重新申请金额：<strong>${{ money(giftOverpayRequestedAmount) }}</strong></div>
        <div>回流面值上限：<strong>${{ money(giftOverpayLimitAmount) }}</strong></div>
        <div class="gift-overpay-desc">如产品涨价，请先修改实付金额，保存后重新提交</div>
      </div>
      <div class="gift-paid-edit-list">
        <div v-for="item in giftActualPaidEditRows" :key="item.id" class="gift-paid-edit-row">
          <div class="gift-return-order">
            <span class="gift-return-order-id">{{ item.subOrderNumber || item.subOrderId || item.id }}</span>
            <span class="gift-return-order-meta">{{ item.productName || '—' }}</span>
          </div>
          <a-input-number v-model:value="item.actualPaidUsd" :min="0" :precision="2" style="width:160px" />
        </div>
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

const MOCK_LEDGER_PAYPAL_KEY = 'refund-ledger-mock-paypal-v4'
const MOCK_LEDGER_GIFT_KEY = 'refund-ledger-mock-gift-v6'
const QUEUE_PAYPAL_EXTRA_KEY = 'refund-queue-extra-paypal-v1'
const QUEUE_GIFT_EXTRA_KEY = 'refund-queue-extra-gift-v1'
const GIFT_NEW_BASELINE_KEY = 'refund-ledger-gift-new-baseline-v1'
const GIFT_NEW_ACK_KEY = 'refund-ledger-gift-new-ack-v1'
const PAYPAL_NEW_BASELINE_KEY = 'refund-ledger-paypal-new-baseline-v1'

const activeTab = ref('giftcard')

const gcLoading = ref(false)
const gcRecords = ref<any[]>([])
const gcSearch = ref('')
const gcReturnFilter = ref('')
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
    id: 'mock-ledger-paypal-demo-single-us',
    sub_order_id: 'SUB-MOCK-PP-SINGLE-001',
    sub_order_number: 'MOCK-PP-单次-001',
    product_name: '演示 PayPal 单次返款',
    asin: 'MOCKPPSINGLE01',
    country: '美国',
    buyer_name: '买手-单次PP',
    chat_account: 'mock-pp-single',
    buyer_paypal_email: 'mock.single.pp@gmail.com',
    refund_amount_usd: 16.8,
    assigned_paypal_email: 'finance-us-01@company.com',
    paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=Single+PayPal',
    handled_at: dayjs().subtract(2, 'minute').toISOString(),
    finance_notes: '演示：单次 PayPal 返款，可看单条操作',
    refund_status: '已返款',
    _demo_new: true,
    _isMock: true,
  },
  {
    id: 'mock-ledger-paypal-demo-batch-uk-1',
    sub_order_id: 'SUB-MOCK-PP-BATCH-001',
    sub_order_number: 'MOCK-PP-批量-001',
    product_name: '演示 PayPal 批量返款 A',
    asin: 'MOCKPPBATCH01',
    country: '英国',
    buyer_name: '买手-批量PP',
    chat_account: 'mock-pp-batch',
    buyer_paypal_email: 'mock.batch.pp@gmail.com',
    refund_amount_usd: 10.2,
    assigned_paypal_email: 'finance-us-02@company.com',
    paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=Batch+PayPal',
    handled_at: dayjs().subtract(4, 'minute').toISOString(),
    finance_notes: '演示：批量 PayPal 返款，操作按钮合并展示',
    refund_status: '已返款',
    _demo_new: true,
    _isMock: true,
  },
  {
    id: 'mock-ledger-paypal-demo-batch-uk-2',
    sub_order_id: 'SUB-MOCK-PP-BATCH-002',
    sub_order_number: 'MOCK-PP-批量-002',
    product_name: '演示 PayPal 批量返款 B',
    asin: 'MOCKPPBATCH02',
    country: '英国',
    buyer_name: '买手-批量PP',
    chat_account: 'mock-pp-batch',
    buyer_paypal_email: 'mock.batch.pp@gmail.com',
    refund_amount_usd: 7.8,
    assigned_paypal_email: 'finance-us-02@company.com',
    paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=Batch+PayPal',
    handled_at: dayjs().subtract(4, 'minute').toISOString(),
    finance_notes: '演示：同批 PayPal 返款，追加水单只展示一个按钮',
    refund_status: '已返款',
    _demo_new: true,
    _isMock: true,
  },
  {
    id: 'mock-ledger-paypal-1',
    sub_order_id: 'SUB-LEDGER-PP-001',
    sub_order_number: 'SO-LEDGER-PP-001',
    product_name: 'Travel Coffee Mug',
    asin: 'B0LEDGERPP01',
    country: '美国',
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
    country: '德国',
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
    country: '英国',
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
    country: '加拿大',
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
    request_type: 'initial',
    _isMock: true,
  },
  {
    id: 'mock-ledger-paypal-4-supplement-1',
    sub_order_id: 'SUB-LEDGER-PP-004',
    sub_order_number: 'SO-LEDGER-PP-004',
    product_name: 'Kitchen Scale',
    asin: 'B0LEDGERPP04',
    country: '加拿大',
    buyer_name: '买手-Sophia',
    chat_account: 'wx-sophia-04',
    buyer_paypal_email: 'sophia.pay@gmail.com',
    refund_amount_usd: 15,
    assigned_paypal_email: 'finance-us-03@company.com',
    paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=PayPal+Supplement',
    handled_at: dayjs().subtract(20, 'minute').toISOString(),
    finance_notes: '演示：同一子订单追加返款 $15.00，整组按这笔最新返款排到顶部',
    refund_status: '已返款',
    request_type: 'supplement',
    _isSupplementalRefund: true,
    _demo_new: true,
    _isMock: true,
  },
  {
    id: 'mock-ledger-paypal-5',
    sub_order_id: 'SUB-LEDGER-PP-005',
    sub_order_number: 'SO-LEDGER-PP-005',
    product_name: 'Laptop Stand',
    asin: 'B0LEDGERPP05',
    country: '美国',
    buyer_name: '买手-Linda',
    chat_account: 'wx-linda-01',
    buyer_paypal_email: 'linda.old@gmail.com',
    refund_amount_usd: 11.2,
    assigned_paypal_email: 'finance-us-01@company.com',
    paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=PayPal+Batch',
    handled_at: dayjs().subtract(5, 'hour').toISOString(),
    finance_notes: '演示：与同买手另一笔一起 PayPal 返款',
    refund_status: '已返款',
    _isMock: true,
  },
  {
    id: 'mock-ledger-paypal-6',
    sub_order_id: 'SUB-LEDGER-PP-006',
    sub_order_number: 'SO-LEDGER-PP-006',
    product_name: 'Phone Holder',
    asin: 'B0LEDGERPP06',
    country: '美国',
    buyer_name: '买手-Linda',
    chat_account: 'wx-linda-01',
    buyer_paypal_email: 'linda.old@gmail.com',
    refund_amount_usd: 8.8,
    assigned_paypal_email: 'finance-us-01@company.com',
    paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=PayPal+Batch',
    handled_at: dayjs().subtract(5, 'hour').toISOString(),
    finance_notes: '演示：与同买手另一笔一起 PayPal 返款',
    refund_status: '已返款',
    _demo_new: true,
    _isMock: true,
  },
  {
    id: 'mock-ledger-paypal-batch-ca-1',
    sub_order_id: 'SUB-LEDGER-PP-007',
    sub_order_number: 'SO-LEDGER-PP-007',
    product_name: 'Desk Light',
    asin: 'B0LEDGERPP07',
    country: '加拿大',
    buyer_name: '买手-Olivia',
    chat_account: 'wx-olivia-07',
    buyer_paypal_email: 'olivia.pay@gmail.com',
    refund_amount_usd: 13.4,
    assigned_paypal_email: 'finance-us-02@company.com',
    paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=PayPal+Batch',
    handled_at: dayjs().subtract(35, 'minute').toISOString(),
    finance_notes: '演示：批量 PayPal 付款，操作按钮合并展示',
    refund_status: '已返款',
    _demo_new: true,
    _isMock: true,
  },
  {
    id: 'mock-ledger-paypal-batch-ca-2',
    sub_order_id: 'SUB-LEDGER-PP-008',
    sub_order_number: 'SO-LEDGER-PP-008',
    product_name: 'Cable Clips',
    asin: 'B0LEDGERPP08',
    country: '加拿大',
    buyer_name: '买手-Olivia',
    chat_account: 'wx-olivia-07',
    buyer_paypal_email: 'olivia.pay@gmail.com',
    refund_amount_usd: 6.6,
    assigned_paypal_email: 'finance-us-02@company.com',
    paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=PayPal+Batch',
    handled_at: dayjs().subtract(35, 'minute').toISOString(),
    finance_notes: '演示：批量 PayPal 付款，追加水单只展示一个按钮',
    refund_status: '已返款',
    _demo_new: true,
    _isMock: true,
  },
]

const mockGiftSeed = [
  {
    id: 'mock-ledger-gift-demo-single-us',
    sub_order_id: 'SUB-MOCK-GC-SINGLE-001',
    sub_order_number: 'MOCK-GC-单次-001',
    product_name: '演示礼品卡单次返款',
    asin: 'MOCKGCSINGLE01',
    country: '美国',
    buyer_name: '买手-单次GC',
    chat_account: 'mock-gc-single',
    refund_amount_usd: 18,
    assigned_gift_card_id: 'GC-MOCK-DEMO-SINGLE',
    assigned_gift_card_number: 'GC-MOCK-SINGLE-001',
    assigned_gift_card_code: 'MOCK-SINGLE-GC01',
    gift_card_face_value_usd: 18,
    handled_at: dayjs().subtract(1, 'minute').toISOString(),
    finance_notes: '演示：单次礼品卡返款，可看单条回流卡库操作',
    refund_status: '已返款',
    gift_returned: false,
    _demo_new: true,
    _isMock: true,
  },
  {
    id: 'mock-ledger-gift-demo-batch-de-1',
    sub_order_id: 'SUB-MOCK-GC-BATCH-001',
    sub_order_number: 'MOCK-GC-批量-001',
    product_name: '演示礼品卡批量返款 A',
    asin: 'MOCKGCBATCH01',
    country: '德国',
    buyer_name: '买手-批量GC',
    chat_account: 'mock-gc-batch',
    refund_amount_usd: 11,
    assigned_gift_card_id: 'GC-MOCK-DEMO-BATCH-1',
    assigned_gift_card_number: 'GC-MOCK-BATCH-001',
    assigned_gift_card_code: 'MOCK-BATCH-GC01',
    gift_card_face_value_usd: 11,
    handled_at: dayjs().subtract(3, 'minute').toISOString(),
    finance_notes: '演示：批量礼品卡返款，操作按钮合并展示',
    refund_status: '已返款',
    gift_returned: false,
    _demo_new: true,
    _isMock: true,
  },
  {
    id: 'mock-ledger-gift-demo-batch-de-2',
    sub_order_id: 'SUB-MOCK-GC-BATCH-002',
    sub_order_number: 'MOCK-GC-批量-002',
    product_name: '演示礼品卡批量返款 B',
    asin: 'MOCKGCBATCH02',
    country: '德国',
    buyer_name: '买手-批量GC',
    chat_account: 'mock-gc-batch',
    refund_amount_usd: 9,
    assigned_gift_card_id: 'GC-MOCK-DEMO-BATCH-2',
    assigned_gift_card_number: 'GC-MOCK-BATCH-002',
    assigned_gift_card_code: 'MOCK-BATCH-GC02',
    gift_card_face_value_usd: 9,
    handled_at: dayjs().subtract(3, 'minute').toISOString(),
    finance_notes: '演示：同批礼品卡返款，回流卡库只展示一个按钮',
    refund_status: '已返款',
    gift_returned: false,
    _demo_new: true,
    _isMock: true,
  },
  {
    id: 'mock-ledger-gift-1',
    sub_order_id: 'SUB-LEDGER-GC-001',
    sub_order_number: 'SO-LEDGER-GC-001',
    product_name: 'Ceramic Vase',
    asin: 'B0LEDGERGC01',
    country: '美国',
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
    country: '德国',
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
    country: '英国',
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
    country: '加拿大',
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
    country: '加拿大',
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
  {
    id: 'mock-ledger-gift-batch-de-1',
    sub_order_id: 'SUB-LEDGER-GC-006',
    sub_order_number: 'SO-LEDGER-GC-006',
    product_name: 'Table Runner',
    asin: 'B0LEDGERGC06',
    country: '德国',
    buyer_name: '买手-Nina',
    chat_account: 'wx-nina-06',
    refund_amount_usd: 12,
    assigned_gift_card_id: 'GC-MOCK-006',
    assigned_gift_card_number: 'GC-5566-0066',
    assigned_gift_card_code: 'NINA-DEMO-0001',
    gift_card_face_value_usd: 12,
    handled_at: dayjs().subtract(50, 'minute').toISOString(),
    finance_notes: '演示：批量礼品卡付款，操作按钮合并展示',
    refund_status: '已返款',
    gift_returned: false,
    _demo_new: true,
    _isMock: true,
  },
  {
    id: 'mock-ledger-gift-batch-de-2',
    sub_order_id: 'SUB-LEDGER-GC-007',
    sub_order_number: 'SO-LEDGER-GC-007',
    product_name: 'Shelf Basket',
    asin: 'B0LEDGERGC07',
    country: '德国',
    buyer_name: '买手-Nina',
    chat_account: 'wx-nina-06',
    refund_amount_usd: 8,
    assigned_gift_card_id: 'GC-MOCK-007',
    assigned_gift_card_number: 'GC-5566-0077',
    assigned_gift_card_code: 'NINA-DEMO-0002',
    gift_card_face_value_usd: 8,
    handled_at: dayjs().subtract(50, 'minute').toISOString(),
    finance_notes: '演示：批量礼品卡付款，回流卡库只展示一个按钮',
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
const giftRollbackOpen = ref(false)
const giftRollbackLoading = ref(false)
const giftRollbackRecord = ref<any | null>(null)
const giftRollbackSelectedIds = ref<string[]>([])
const giftRollbackActions = ref<Record<string, 'return' | 'void'>>({})
const giftVoidProofs = ref<Record<string, { note?: string; fileName?: string; dataUrl?: string }>>({})
const giftOverpayOpen = ref(false)
const giftOverpayRequestedAmount = ref(0)
const giftOverpayLimitAmount = ref(0)
const giftActualPaidOverrideAmount = ref(0)
const giftActualPaidEditRows = ref<Array<{
  id: string
  subOrderId: string
  subOrderNumber: string
  productName: string
  originalActualPaidUsd: number
  actualPaidUsd: number
}>>([])

const actionOpen = ref(false)
const actionLoading = ref(false)
const actionType = ref<'ppBuyer' | 'giftReturn' | 'ppReceipt'>('ppBuyer')
const actionRecord = ref<any | null>(null)
const actionForm = ref({
  companyPaypalEmail: '',
  buyerPaypalEmail: '',
  correctedAmountUsd: 0,
  paypalReturnItems: [] as Array<{
    id: string
    subOrderId: string
    subOrderNumber: string
    productName: string
    buyerName: string
    buyerPaypalEmail: string
    asin: string
    correctedAmountUsd: number
  }>,
  giftReturnItems: [] as Array<{
    id: string
    subOrderId: string
    subOrderNumber: string
    productName: string
    buyerName: string
    asin: string
    correctedAmountUsd: number
    processedCardNumber: string
    processedLabel: string
  }>,
  reason: '礼品卡金额填错，已退回礼品卡库后重新提交返款审批',
  notes: '',
})
const paypalRefundStatusOptions = ['未返款', '返款中', '已返款', 'On Hold', '返款失败', '返款失败-本金流失', '失误多返']
const giftRefundStatusOptions = ['未返款', '返款中', '已返款']
const refundCountryLabels = ['美国', '德国', '英国', '加拿大']

const giftRollbackOptions = computed(() => {
  if (!giftRollbackRecord.value) return []
  return getGiftRollbackCandidates(giftRollbackRecord.value).map(item => ({
    id: item.id,
    card_code: item.assigned_gift_card_code || '',
    amount: Number(item.gift_card_face_value_usd || item.refund_amount_usd || 0),
  }))
})

const gcStats = computed(() => {
  const data = gcAllStats.value
  return {
    count: data.length,
    totalUsd: data.reduce((sum, row) => sum + Number(row.gift_card_face_value_usd || row.refund_amount_usd || 0), 0),
    countryTotals: buildCountryRefundTotals(data, row => Number(row.gift_card_face_value_usd || row.refund_amount_usd || 0)),
    resubmitted: data.filter(row => row.gift_resubmitted).length,
  }
})

const ppStats = computed(() => {
  const data = ppAllStats.value
  return {
    count: data.length,
    totalUsd: data.reduce((sum, row) => sum + Number(row.refund_amount_usd || 0), 0),
    countryTotals: buildCountryRefundTotals(data, row => Number(row.refund_amount_usd || 0)),
    resubmitted: data.filter(row => row.buyer_paypal_resubmitted).length,
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
  { title: '操作', key: 'action', width: 190, fixed: 'right' as const, customCell: batchActionCell },
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
  { title: '操作', key: 'action', width: 240, fixed: 'right' as const, customCell: batchActionCell },
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

function batchActionCell(record: any) {
  return {
    rowSpan: record?._batch_count > 1 ? (record?._actual_amount_row_span || 0) : 1,
  }
}

function normalizeRefundCountry(country: any) {
  const text = String(country || '').trim().toUpperCase()
  const map: Record<string, string> = {
    US: '美国',
    USA: '美国',
    'UNITED STATES': '美国',
    美国: '美国',
    DE: '德国',
    GER: '德国',
    GERMANY: '德国',
    德国: '德国',
    UK: '英国',
    GB: '英国',
    GBR: '英国',
    'UNITED KINGDOM': '英国',
    英国: '英国',
    CA: '加拿大',
    CAN: '加拿大',
    CANADA: '加拿大',
    加拿大: '加拿大',
  }
  return map[text] || ''
}

function buildCountryRefundTotals(rows: any[], amountGetter: (row: any) => number) {
  const totals = Object.fromEntries(refundCountryLabels.map(label => [label, 0])) as Record<string, number>
  rows.forEach(row => {
    const country = normalizeRefundCountry(row.country)
    if (country) totals[country] += amountGetter(row)
  })
  return refundCountryLabels.map(country => ({ country, totalUsd: totals[country] || 0 }))
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
  if (isPaypalRefundFailed(status) || status === '失误多返') return 'red'
  if (status === 'On Hold') return 'gold'
  return 'default'
}

function isPaypalRefundFailed(status: string) {
  return status === '返款失败' || status === '返款失败-本金流失'
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

function formatGiftCardDisplay(item: any) {
  const code = item.assigned_gift_card_code || item.assigned_gift_card_number || ''
  if (!code) return ''
  const amount = Number(item.gift_card_face_value_usd || item.refund_amount_usd || 0)
  return amount > 0 ? `${code}：$${money(amount)}` : code
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
    const mergedGiftDisplays = group.map(item => formatGiftCardDisplay(item)).filter(Boolean).join('\n')
    const mergedGiftNumbers = group.map(item => item.assigned_gift_card_number || '').filter(Boolean).join('\n')
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
      _gift_card_display_text: type === 'giftcard' && isBatch ? mergedGiftDisplays : formatGiftCardDisplay(item),
      _gift_card_number_text: type === 'giftcard' && isBatch ? mergedGiftNumbers : (item.assigned_gift_card_number || ''),
      _gift_card_face_text: '',
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
    _gift_card_display_text: metaMap.get(item.id)?._gift_card_display_text || formatGiftCardDisplay(item),
    _gift_card_number_text: metaMap.get(item.id)?._gift_card_number_text || item.assigned_gift_card_number || '',
    _gift_card_face_text: metaMap.get(item.id)?._gift_card_face_text || '',
  }))
}

function subOrderGroupKey(item: any) {
  return item.sub_order_id || item.sub_order_number || item.id
}

function sortBySubOrderLatest(rows: any[]) {
  const groups = new Map<string, any[]>()
  rows.forEach(item => {
    const key = subOrderGroupKey(item)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  })

  return Array.from(groups.values())
    .map(group => {
      const sortedGroup = [...group].sort((a, b) => dayjs(b.handled_at).valueOf() - dayjs(a.handled_at).valueOf())
      const latestAt = sortedGroup.reduce((latest, item) => Math.max(latest, dayjs(item.handled_at).valueOf() || 0), 0)
      return { latestAt, rows: sortedGroup }
    })
    .sort((a, b) => b.latestAt - a.latestAt)
    .flatMap(group =>
      group.rows.map((item, index) => ({
        ...item,
        _refund_group_count: group.rows.length,
        _refund_group_index: index,
        _refund_group_latest_at: group.latestAt,
      })),
    )
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
    .select('id, sub_order_id, sub_order_number, product_name, asin, country, buyer_name, refund_amount_usd, assigned_gift_card_number, assigned_gift_card_code, gift_card_face_value_usd, handled_at, finance_notes')
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
  const realRows = gcReturnFilter.value === 'yes' ? [] : (data || [])
  return annotateBatchDisplay(
    await enrichBuyerMeta([...filteredMock, ...(realRows.map(item => ({ ...item, _isMock: false })))]),
    'giftcard',
  )
}

async function fetchPaypalLedgerExportRecords() {
  const filteredMock = sortBySubOrderLatest(filterPaypalMockRecords())
  let query = supabase
    .from('refund_requests')
    .select('id, sub_order_id, sub_order_number, product_name, asin, country, buyer_name, buyer_paypal_email, refund_amount_usd, assigned_paypal_email, paypal_receipt_screenshot, handled_at, finance_notes')
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
  persistMockLedgerState('paypal')
  persistMockLedgerState('giftcard')
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
          finance_notes: isPaypalRefundFailed(status)
            ? [item.finance_notes, `返款状态已改为${status}，业务员可重新申请`].filter(Boolean).join('；')
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
  return Boolean(record.returned_gift_card_number || record.returned_gift_card_code || record.gift_returned_at || record.voided_gift_card_number || record.voided_gift_card_code || record.gift_voided_at)
}

function openGiftHistory(record: any) {
  giftHistoryRecord.value = record
  giftHistoryOpen.value = true
}

function giftCardProcessLabel(record: any) {
  if (record?.gift_voided || record?.gift_card_process_status === 'voided') return '标记作废'
  if (record?.gift_returned || record?.gift_card_process_status === 'returned') return '回流卡库'
  return '未处理'
}

function isProcessedGiftCard(item: any) {
  return Boolean(item?.gift_returned || item?.gift_voided || item?.gift_card_processed)
}

function getGiftGroupRecords(record: any) {
  const ids = Array.isArray(record?._batch_member_ids) && record._batch_member_ids.length
    ? record._batch_member_ids
    : [record?.id]
  const idSet = new Set(ids)
  return mockGiftLedgerRecords.value.filter(item => idSet.has(item.id))
}

function isProcessableGiftCard(item: any) {
  return Boolean(
    item?._isMock &&
    item.refund_status === '已返款' &&
    !isProcessedGiftCard(item) &&
    (item.assigned_gift_card_number || item.assigned_gift_card_code),
  )
}

function getGiftRollbackCandidates(record: any) {
  return getGiftGroupRecords(record).filter(isProcessableGiftCard)
}

function getProcessedGiftCards(record: any) {
  return getGiftGroupRecords(record).filter(item => isProcessedGiftCard(item) && !item.gift_resubmitted)
}

function getGiftReturnedFaceLimit(record: any) {
  const processed = getProcessedGiftCards(record)
  const rows = processed.length ? processed : [record]
  return rows.reduce((sum, item) => sum + Number(item.gift_card_face_value_usd || item.refund_amount_usd || 0), 0)
}

function canResubmitGiftCard(record: any) {
  return record?._isMock && getProcessedGiftCards(record).length > 0
}

function canProcessGiftCard(record: any) {
  return getGiftRollbackCandidates(record).length > 0
}

function getPaypalGroupRecords(record: any) {
  const ids = Array.isArray(record?._batch_member_ids) && record._batch_member_ids.length
    ? record._batch_member_ids
    : [record?.id]
  const idSet = new Set(ids)
  return mockPaypalLedgerRecords.value.filter(item => idSet.has(item.id))
}

function canResubmitPaypal(record: any) {
  if (!record?._isMock) return false
  const group = getPaypalGroupRecords(record)
  if (group.length > 1) {
    return group.some(item => isPaypalRefundFailed(item.refund_status) && !item.buyer_paypal_resubmitted)
  }
  return isPaypalRefundFailed(record.refund_status) && !record.buyer_paypal_resubmitted
}

function openGiftRollback(record: any) {
  const candidates = getGiftRollbackCandidates(record)
  if (!candidates.length) {
    message.warning('暂无可处理的卡密')
    return
  }
  giftRollbackRecord.value = record
  giftRollbackSelectedIds.value = candidates.map(item => item.id)
  giftRollbackActions.value = Object.fromEntries(candidates.map(item => [item.id, 'return']))
  giftRollbackOpen.value = true
}

function setGiftProcessAction(id: string, action: 'return' | 'void') {
  giftRollbackActions.value = { ...giftRollbackActions.value, [id]: action }
}

function setAllGiftProcessActions(action: 'return' | 'void') {
  const ids = giftRollbackOptions.value.map(item => item.id)
  giftRollbackSelectedIds.value = ids
  giftRollbackActions.value = Object.fromEntries(ids.map(id => [id, action]))
}

function setGiftVoidProofNote(id: string, note: string) {
  giftVoidProofs.value = {
    ...giftVoidProofs.value,
    [id]: {
      ...(giftVoidProofs.value[id] || {}),
      note,
    },
  }
}

function giftVoidProofInputId(id: string) {
  return `gift-void-proof-${id}`
}

function openGiftVoidProofPicker(id: string) {
  document.getElementById(giftVoidProofInputId(id))?.click()
}

function setGiftVoidProofFile(id: string, file: File) {
  giftVoidProofs.value = {
    ...giftVoidProofs.value,
    [id]: {
      ...(giftVoidProofs.value[id] || {}),
      fileName: file.name,
    },
  }
  const reader = new FileReader()
  reader.onload = () => {
    giftVoidProofs.value = {
      ...giftVoidProofs.value,
      [id]: {
        ...(giftVoidProofs.value[id] || {}),
        dataUrl: String(reader.result || ''),
      },
    }
  }
  reader.readAsDataURL(file)
}

function handleGiftVoidProofFile(id: string, event: Event) {
  const file = (event.target as HTMLInputElement)?.files?.[0]
  if (file) setGiftVoidProofFile(id, file)
}

function handleGiftVoidProofPaste(id: string, event: ClipboardEvent) {
  const file = Array.from(event.clipboardData?.files || [])[0]
  if (file) {
    setGiftVoidProofFile(id, file)
    return
  }
  const text = event.clipboardData?.getData('text')?.trim()
  if (text) {
    event.preventDefault()
    setGiftVoidProofNote(id, text)
  }
}

function hasGiftVoidProof(id: string) {
  const proof = giftVoidProofs.value[id]
  return Boolean(proof?.fileName || proof?.dataUrl || proof?.note?.trim())
}

async function submitGiftRollback() {
  const optionIds = giftRollbackOptions.value.map(item => item.id)
  const selectedIds = giftRollbackSelectedIds.value.filter(id => optionIds.includes(id))
  if (!selectedIds.length) {
    message.warning('请选择要处理的卡密')
    return
  }
  const missingProof = selectedIds.some(id => (giftRollbackActions.value[id] || 'return') === 'void' && !hasGiftVoidProof(id))
  if (missingProof) {
    message.warning('标记作废的卡密需要上传或粘贴凭证')
    return
  }

  const now = new Date().toISOString()
  const selectedIdSet = new Set(selectedIds)
  giftRollbackLoading.value = true
  try {
    mockGiftLedgerRecords.value = mockGiftLedgerRecords.value.map(item =>
      selectedIdSet.has(item.id)
        ? buildGiftCardProcessedRecord(item, giftRollbackActions.value[item.id] || 'return', now, giftVoidProofs.value[item.id])
        : item,
    )
    persistMockLedgerState('giftcard')
    await loadGiftCardRefunds()
    await loadGiftCardStats()
    giftRollbackOpen.value = false
    giftRollbackRecord.value = null
    giftRollbackSelectedIds.value = []
    giftRollbackActions.value = {}
    giftVoidProofs.value = {}
    message.success('卡密已处理，可继续重新提交')
  } finally {
    giftRollbackLoading.value = false
  }
}

function buildGiftCardProcessedRecord(item: any, action: 'return' | 'void', now: string, proof?: { note?: string; fileName?: string; dataUrl?: string }) {
  const isVoid = action === 'void'
  return {
    ...item,
    gift_returned: !isVoid,
    gift_voided: isVoid,
    gift_card_processed: true,
    gift_card_process_status: isVoid ? 'voided' : 'returned',
    gift_resubmitted: false,
    returned_gift_card_number: isVoid ? item.returned_gift_card_number : item.assigned_gift_card_number,
    returned_gift_card_code: isVoid ? item.returned_gift_card_code : item.assigned_gift_card_code,
    gift_returned_at: isVoid ? item.gift_returned_at : now,
    voided_gift_card_number: isVoid ? item.assigned_gift_card_number : item.voided_gift_card_number,
    voided_gift_card_code: isVoid ? item.assigned_gift_card_code : item.voided_gift_card_code,
    gift_voided_at: isVoid ? now : item.gift_voided_at,
    gift_void_proof_note: isVoid ? proof?.note?.trim() || '' : item.gift_void_proof_note,
    gift_void_proof_file_name: isVoid ? proof?.fileName || '' : item.gift_void_proof_file_name,
    gift_void_proof_data_url: isVoid ? proof?.dataUrl || '' : item.gift_void_proof_data_url,
    assigned_gift_card_id: null,
    assigned_gift_card_number: '',
    assigned_gift_card_code: isVoid ? '已标记作废，待重新提交' : '已回流卡库，待重新提交',
    refund_status: '返款中',
    finance_notes: [
      item.finance_notes,
      isVoid ? '原卡密已标记作废，待业务重新提交' : '原卡密已回流卡库，待业务重新提交',
    ].filter(Boolean).join('；'),
    updated_at: now,
  }
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
    if (gcReturnFilter.value === 'yes' && !hasGiftReturnTrail(item)) return false
    if (gcReturnFilter.value === 'no' && hasGiftReturnTrail(item)) return false
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

async function buildGiftLedgerRows(rows: any[]) {
  return annotateNewFlags(
    annotateBatchDisplay(await enrichBuyerMeta(rows), 'giftcard'),
    'giftcard',
  )
}

async function buildPaypalLedgerRows(rows: any[]) {
  return annotateNewFlags(
    annotateBatchDisplay(await enrichBuyerMeta(rows), 'paypal'),
    'paypal',
  )
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

    gcRecords.value = await buildGiftLedgerRows(mockPageRows)
    gcPagination.value.total = mockCount

    let query = supabase
      .from('refund_requests')
      .select('id, sub_order_id, sub_order_number, product_name, asin, country, buyer_name, refund_amount_usd, assigned_gift_card_number, assigned_gift_card_code, gift_card_face_value_usd, handled_at, finance_notes', { count: 'exact' })
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
    if (error) return
    const realRows = gcReturnFilter.value === 'yes' ? [] : (data || [])
    gcRecords.value = await buildGiftLedgerRows([...mockPageRows, ...(realRows.map(item => ({ ...item, _isMock: false })) )])
    gcPagination.value.total = (gcReturnFilter.value === 'yes' ? 0 : (count || 0)) + mockCount
  } finally {
    gcLoading.value = false
  }
}

async function loadGiftCardStats() {
  const filteredMock = filterGiftMockRecords()
  let query = supabase
    .from('refund_requests')
    .select('refund_amount_usd, gift_card_face_value_usd, country')
    .eq('status', '已处理')
    .eq('refund_method', '礼品卡')
  query = buildDateFilter(query, 'handled_at', gcDateRange.value)
  const { data, error } = await query
  if (error) {
    gcAllStats.value = filteredMock
    return
  }
  gcAllStats.value = [...filteredMock, ...(gcReturnFilter.value === 'yes' ? [] : (data || []))]
}

async function loadPaypalRefunds() {
  ppLoading.value = true
  try {
    const filteredMock = sortBySubOrderLatest(filterPaypalMockRecords())
    const mockCount = filteredMock.length
    const pageStart = (ppPagination.value.current - 1) * ppPagination.value.pageSize
    const pageEnd = pageStart + ppPagination.value.pageSize
    const mockPageRows = filteredMock.slice(pageStart, pageEnd)
    const realStart = Math.max(pageStart - mockCount, 0)
    const realPageSize = ppPagination.value.pageSize - mockPageRows.length

    ppRecords.value = await buildPaypalLedgerRows(mockPageRows)
    ppPagination.value.total = mockCount

    let query = supabase
      .from('refund_requests')
      .select('id, sub_order_id, sub_order_number, product_name, asin, country, buyer_name, buyer_paypal_email, refund_amount_usd, assigned_paypal_email, paypal_receipt_screenshot, handled_at, finance_notes', { count: 'exact' })
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
    if (error) return
    ppRecords.value = await buildPaypalLedgerRows([...mockPageRows, ...((data || []).map(item => ({ ...item, _isMock: false })) )])
    ppPagination.value.total = (count || 0) + mockCount
  } finally {
    ppLoading.value = false
  }
}

async function loadPaypalStats() {
  const filteredMock = filterPaypalMockRecords()
  let query = supabase
    .from('refund_requests')
    .select('refund_amount_usd, country')
    .eq('status', '已处理')
    .eq('refund_method', 'PayPal')
  query = buildDateFilter(query, 'handled_at', ppDateRange.value)
  if (ppAccountFilter.value) query = query.eq('assigned_paypal_email', ppAccountFilter.value)
  const { data, error } = await query
  if (error) {
    ppAllStats.value = filteredMock
    return
  }
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
  const groupRecords = getPaypalGroupRecords(record)
  const targetRecords = groupRecords.length > 1
    ? groupRecords.filter(item => item?._isMock && !item.buyer_paypal_resubmitted)
    : groupRecords.filter(item => item?._isMock && isPaypalRefundFailed(item.refund_status) && !item.buyer_paypal_resubmitted)
  const rows = targetRecords.length ? targetRecords : [record]
  const firstRecord = rows[0]
  actionType.value = 'ppBuyer'
  actionRecord.value = record
  actionForm.value = {
    companyPaypalEmail: '',
    buyerPaypalEmail: firstRecord.buyer_paypal_email || '',
    correctedAmountUsd: Number(firstRecord.refund_amount_usd || 0),
    paypalReturnItems: rows.map(item => ({
      id: item.id,
      subOrderId: item.sub_order_id || '',
      subOrderNumber: item.sub_order_number || '',
      productName: item.product_name || '',
      buyerName: item.buyer_name || '',
      buyerPaypalEmail: item.buyer_paypal_email || '',
      asin: item.asin || '',
      correctedAmountUsd: Number(item.refund_amount_usd || 0),
    })),
    giftReturnItems: [],
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
    paypalReturnItems: [],
    giftReturnItems: [],
    reason: '业务员补充水单，请财务补传到账单',
    notes: '会在返款审批里生成一条仅补水单的待处理提醒',
  }
  actionOpen.value = true
}

function openGiftReturn(record: any) {
  const processedRecords = getProcessedGiftCards(record)
  const groupRecords = getGiftGroupRecords(record)
  const targetRecords = groupRecords.length > 1
    ? groupRecords.filter(item => item?._isMock && !item.gift_resubmitted)
    : (processedRecords.length ? processedRecords : [record])
  giftActualPaidOverrideAmount.value = 0
  actionType.value = 'giftReturn'
  actionRecord.value = record
  actionForm.value = {
    companyPaypalEmail: '',
    buyerPaypalEmail: '',
    correctedAmountUsd: targetRecords.reduce((sum, item) => sum + Number(item.refund_amount_usd || 0), 0),
    paypalReturnItems: [],
    giftReturnItems: targetRecords.map(item => ({
      id: item.id,
      subOrderId: item.sub_order_id || '',
      subOrderNumber: item.sub_order_number || '',
      productName: item.product_name || '',
      buyerName: item.buyer_name || '',
      asin: item.asin || '',
      correctedAmountUsd: Number(item.refund_amount_usd || 0),
      processedCardNumber: item.returned_gift_card_number || item.voided_gift_card_number || item.assigned_gift_card_number || '原卡密',
      processedLabel: giftCardProcessLabel(item),
    })),
    reason: '',
    notes: '',
  }
  actionOpen.value = true
}

function openGiftOverpayModal(requestedAmount: number, limitAmount: number, rows: any[]) {
  giftOverpayRequestedAmount.value = requestedAmount
  giftOverpayLimitAmount.value = limitAmount
  giftActualPaidEditRows.value = rows.map(item => ({
    id: item.id,
    subOrderId: item.subOrderId || item.sub_order_id || '',
    subOrderNumber: item.subOrderNumber || item.sub_order_number || '',
    productName: item.productName || item.product_name || '',
    originalActualPaidUsd: Number(item.actualPaidUsd || item.correctedAmountUsd || item.refund_amount_usd || 0),
    actualPaidUsd: Number(item.actualPaidUsd || item.correctedAmountUsd || item.refund_amount_usd || 0),
  }))
  giftOverpayOpen.value = true
}

function confirmGiftActualPaidChange() {
  const total = giftActualPaidEditRows.value.reduce((sum, item) => sum + Number(item.actualPaidUsd || 0), 0)
  if (giftActualPaidEditRows.value.some(item => Number(item.actualPaidUsd || 0) <= 0)) {
    message.warning('请填写正确的实付金额')
    return
  }
  const hasActualIncrease = giftActualPaidEditRows.value.some(item =>
    Number(item.actualPaidUsd || 0) > Number(item.originalActualPaidUsd || 0),
  )
  if (!hasActualIncrease) {
    message.warning('请至少提高一笔订单的实付金额')
    return
  }
  if (total < giftOverpayRequestedAmount.value) {
    message.warning('实付金额合计仍小于重新申请金额')
    return
  }
  const paidMap = new Map(giftActualPaidEditRows.value.map(item => [item.id, Number(item.actualPaidUsd || 0)]))
  actionForm.value.giftReturnItems = actionForm.value.giftReturnItems.map(item => ({
    ...item,
    correctedAmountUsd: paidMap.get(item.id) ?? item.correctedAmountUsd,
  }))
  mockGiftLedgerRecords.value = mockGiftLedgerRecords.value.map(item =>
    paidMap.has(item.id)
      ? {
          ...item,
          refund_amount_usd: paidMap.get(item.id),
          product_price: paidMap.get(item.id),
          finance_notes: [item.finance_notes, `实付金额已调整为 $${money(paidMap.get(item.id))}`].filter(Boolean).join('；'),
        }
      : item,
  )
  persistMockLedgerState('giftcard')
  giftActualPaidOverrideAmount.value = total
  giftOverpayOpen.value = false
  message.success('实付金额已更新，请重新提交')
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
      const paypalReturnItems = actionForm.value.paypalReturnItems.length > 1
        ? actionForm.value.paypalReturnItems
        : [{
            id: actionForm.value.paypalReturnItems[0]?.id || actionRecord.value.id,
            subOrderId: actionForm.value.paypalReturnItems[0]?.subOrderId || actionRecord.value.sub_order_id || '',
            subOrderNumber: actionForm.value.paypalReturnItems[0]?.subOrderNumber || actionRecord.value.sub_order_number || '',
            productName: actionForm.value.paypalReturnItems[0]?.productName || actionRecord.value.product_name || '',
            buyerName: actionForm.value.paypalReturnItems[0]?.buyerName || actionRecord.value.buyer_name || '',
            buyerPaypalEmail: actionForm.value.paypalReturnItems[0]?.buyerPaypalEmail || actionRecord.value.buyer_paypal_email || '',
            asin: actionForm.value.paypalReturnItems[0]?.asin || actionRecord.value.asin || '',
            correctedAmountUsd: Number(actionForm.value.correctedAmountUsd || 0),
          }]
      if (paypalReturnItems.some(item => !item.correctedAmountUsd || Number(item.correctedAmountUsd) <= 0)) {
        message.warning('请填写重新申请的返款金额')
        return
      }
      const newEmail = actionForm.value.buyerPaypalEmail.trim()
      const amountMap = new Map(paypalReturnItems.map(item => [item.id, Number(item.correctedAmountUsd || 0)]))
      mockPaypalLedgerRecords.value = mockPaypalLedgerRecords.value.map(item =>
        amountMap.has(item.id)
          ? {
              ...item,
              buyer_paypal_email: newEmail,
              refund_amount_usd: amountMap.get(item.id),
              buyer_paypal_resubmitted: true,
              finance_notes: [item.finance_notes, `已重新申请，新买手贝宝：${newEmail}，返款金额：$${money(amountMap.get(item.id))}`, actionForm.value.notes].filter(Boolean).join('；'),
              updated_at: now,
            }
          : item,
      )
      persistMockLedgerState('paypal')
      paypalReturnItems.forEach((item, index) => {
        const amount = Number(item.correctedAmountUsd || 0)
        appendQueueExtra('paypal', {
          id: `mock-paypal-resub-${Date.now()}-${index}`,
          sub_order_id: item.subOrderId,
          sub_order_number: item.subOrderNumber,
          buyer_name: item.buyerName,
          buyer_paypal_email: newEmail,
          product_name: item.productName,
          asin: item.asin,
          store_name: '账单重提',
          staff_name: '财务重提',
          refund_method: 'PayPal',
          refund_amount_usd: amount,
          product_price: amount,
          status: '待处理',
          notes: `返款账单重新申请：买手 PayPal 已修改，返款金额 $${money(amount)}。${actionForm.value.notes || ''}`.trim(),
          finance_notes: '',
          paypal_receipt_screenshot: '',
          request_type: 'correction',
          created_at: now,
          handled_at: null,
        })
      })
      message.success('已重新提交到返款审批中的 PayPal 返款')
    } else if (actionType.value === 'ppReceipt') {
      const resubmitId = `mock-paypal-receipt-${Date.now()}`
      const receiptGroup = getPaypalGroupRecords(actionRecord.value)
      const receiptRecords = receiptGroup.length > 1 ? receiptGroup : [actionRecord.value]
      const receiptSubOrders = receiptRecords.map(item => item.sub_order_number || item.sub_order_id).filter(Boolean).join(' / ')
      const receiptProducts = receiptRecords.map(item => item.product_name).filter(Boolean)
      const receiptAmount = receiptRecords.reduce((sum, item) => sum + Number(item.refund_amount_usd || 0), 0)
      const firstReceiptRecord = receiptRecords[0]
      mockPaypalLedgerRecords.value = mockPaypalLedgerRecords.value.map(item =>
        receiptRecords.some(member => member.id === item.id)
          ? {
              ...item,
              water_slip_request_pending: true,
              water_slip_request_note: '业务员已发起追加水单申请',
              finance_notes: [item.finance_notes, '已申请追加水单', actionForm.value.notes].filter(Boolean).join('；'),
              updated_at: now,
            }
          : item,
      )
      persistMockLedgerState('paypal')
      appendQueueExtra('paypal', {
        id: resubmitId,
        sub_order_id: receiptRecords.map(item => item.sub_order_id).filter(Boolean).join(','),
        sub_order_number: receiptSubOrders || firstReceiptRecord.sub_order_number,
        buyer_name: firstReceiptRecord.buyer_name,
        buyer_paypal_email: firstReceiptRecord.buyer_paypal_email,
        product_name: receiptRecords.length > 1 ? `批次追加水单（${receiptRecords.length} 笔）` : firstReceiptRecord.product_name,
        asin: receiptRecords.length > 1 ? '' : firstReceiptRecord.asin,
        store_name: '账单补水单',
        staff_name: '业务员补传',
        refund_method: 'PayPal',
        refund_amount_usd: receiptAmount,
        product_price: receiptAmount,
        status: '待处理',
        notes: `批次补水单 [需财务水单] [仅补水单无需重新打款] 子订单：${receiptSubOrders || '—'}。${actionForm.value.notes || ''}`.trim(),
        finance_notes: receiptProducts.length > 1 ? `合并 ${receiptRecords.length} 笔追加水单：${receiptProducts.join(' / ')}` : '',
        paypal_receipt_screenshot: '',
        request_type: 'screenshot',
        receipt_only: true,
        payment_blocked: true,
        created_at: now,
        handled_at: null,
      })
      message.success('已发起追加水单申请，财务会在返款审批里看到待处理提醒')
    } else {
      const giftReturnItems = actionForm.value.giftReturnItems.length
        ? actionForm.value.giftReturnItems
        : [{
            id: actionRecord.value.id,
            subOrderId: actionRecord.value.sub_order_id || '',
            subOrderNumber: actionRecord.value.sub_order_number || '',
            productName: actionRecord.value.product_name || '',
            buyerName: actionRecord.value.buyer_name || '',
            asin: actionRecord.value.asin || '',
            correctedAmountUsd: Number(actionForm.value.correctedAmountUsd || 0),
            processedCardNumber: actionRecord.value.returned_gift_card_number || actionRecord.value.voided_gift_card_number || actionRecord.value.assigned_gift_card_number || '原卡密',
            processedLabel: giftCardProcessLabel(actionRecord.value),
          }]
      if (!actionForm.value.correctedAmountUsd || Number(actionForm.value.correctedAmountUsd) <= 0) {
        message.warning('请填写重新提交的返款金额')
        return
      }
      const mergedGiftAmount = Number(actionForm.value.correctedAmountUsd || 0)
      const returnedFaceLimit = getGiftReturnedFaceLimit(actionRecord.value)
      const allowedAmount = Math.max(returnedFaceLimit, giftActualPaidOverrideAmount.value)
      if (mergedGiftAmount > allowedAmount) {
        openGiftOverpayModal(mergedGiftAmount, returnedFaceLimit, giftReturnItems)
        return
      }
      const giftItemIds = new Set(giftReturnItems.map(item => item.id))
      mockGiftLedgerRecords.value = mockGiftLedgerRecords.value.map(item =>
        giftItemIds.has(item.id)
          ? {
              ...item,
              gift_returned: Boolean(item.gift_returned),
              gift_voided: Boolean(item.gift_voided),
              gift_card_processed: true,
              gift_resubmitted: true,
              returned_gift_card_number: item.returned_gift_card_number || item.assigned_gift_card_number,
              returned_gift_card_code: item.returned_gift_card_code || item.assigned_gift_card_code,
              gift_returned_at: item.gift_returned_at,
              assigned_gift_card_number: '',
              assigned_gift_card_code: '已重新提交，待财务重新选卡',
              finance_notes: [item.finance_notes, `已合并重新提交 $${money(mergedGiftAmount)}`, actionForm.value.notes].filter(Boolean).join('；'),
              updated_at: now,
            }
          : item,
      )
      persistMockLedgerState('giftcard')
      const firstGiftItem = giftReturnItems[0]
      const subOrderText = giftReturnItems.map(item => item.subOrderNumber || item.subOrderId).filter(Boolean).join(' / ')
      const cardText = giftReturnItems.map(item => item.processedCardNumber).filter(Boolean).join(' / ')
      const processText = Array.from(new Set(giftReturnItems.map(item => item.processedLabel).filter(Boolean))).join(' / ')
      appendQueueExtra('gift', {
        id: `mock-gift-resub-${Date.now()}`,
        sub_order_id: giftReturnItems.map(item => item.subOrderId).filter(Boolean).join(','),
        sub_order_number: subOrderText || firstGiftItem.subOrderNumber,
        buyer_name: firstGiftItem.buyerName,
        product_name: giftReturnItems.length > 1 ? `合并礼品卡重提（${giftReturnItems.length} 笔）` : firstGiftItem.productName,
        asin: giftReturnItems.length > 1 ? '' : firstGiftItem.asin,
        store_name: '账单重提',
        staff_name: '财务重提',
        refund_method: '礼品卡',
        refund_amount_usd: mergedGiftAmount,
        product_price: mergedGiftAmount,
        status: '待处理',
        notes: `返款账单合并重新提交：子订单 ${subOrderText || '—'}；原礼品卡 ${cardText || '原卡密'} 已处理（${processText || '已处理'}），合并新返款金额 $${money(mergedGiftAmount)}。${actionForm.value.notes || ''}`.trim(),
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

function paypalRowClassName(record: any) {
  if (record?._isSupplementalRefund) return 'supplement-refund-row'
  if (record?._refund_group_count > 1) return 'supplement-base-row'
  return ''
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
.country-amount-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.country-amount-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(229, 231, 235, 0.72);
}
.country-amount-item span {
  font-size: 11px;
  color: #6b7280;
}
.country-amount-item strong {
  font-size: 15px;
  color: #1a1a2e;
  line-height: 1.2;
}

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
.gc-code-text { font-family: 'Courier New', monospace; font-size: 12px; color: #059669; font-weight: 700; white-space: pre-line; }
.gc-face { font-size: 11px; color: #9ca3af; white-space: pre-line; }
.gift-copy-link { padding: 0; align-self: flex-start; }
.gift-return-amount-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.gift-return-amount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}
.gift-return-order {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.gift-return-order-id {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #1a1a2e;
}
.gift-return-order-meta {
  font-size: 11px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gift-overpay-alert {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #fde68a;
  background: #fffbeb;
  color: #374151;
  font-size: 13px;
}
.gift-overpay-desc {
  color: #d97706;
  font-size: 12px;
}
.gift-paid-edit-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.gift-paid-edit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}
.gift-rollback-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.gift-process-option {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}
.gift-process-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.gift-process-check {
  flex: 1;
  min-width: 0;
  margin-inline-start: 0 !important;
}
.gift-rollback-main {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #1a1a2e;
}
.gift-rollback-sub {
  display: block;
  margin-top: 2px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #6b7280;
}
.gift-void-proof {
  margin-top: 2px;
}
.gift-void-proof-box {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px dashed #fbbf24;
  background: #fffbeb;
  cursor: pointer;
  outline: none;
}
.gift-void-proof-box:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
}
.gift-void-proof-box input {
  display: none;
}
.gift-void-proof-title {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a2e;
}
.gift-void-proof-desc {
  font-size: 11px;
  color: #6b7280;
  word-break: break-all;
}

.pp-account { font-size: 12px; color: #374151; }
.screenshot-link { font-size: 12px; color: #2563eb; }
.workflow-cell { display: flex; flex-direction: column; gap: 4px; }
.workflow-detail { font-size: 11px; color: #6b7280; }

:deep(.supplement-refund-row > td) {
  background: #fffbeb !important;
  border-top: 1px solid #fde68a;
}
:deep(.supplement-base-row > td) {
  background: #fffdf5 !important;
  border-bottom: 1px solid #fde68a;
}

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
