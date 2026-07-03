<template>
  <div class="workflow-editor">
    <div
      v-if="showSummaryHeader"
      class="workflow-edit-header"
    >
      <div class="task-meta">
        <div class="meta-row1">
          <span class="sub-no-text">{{ task.sub_order_number }}</span>
          <a-tag v-if="task.order_type" color="default" style="font-size:10px">{{ task.order_type }}</a-tag>
          <div v-if="task.keyword" class="keyword-badge">{{ task.keyword }}</div>
          <span v-if="task.product_name" class="product-name-sm">{{ task.product_name }}</span>
        </div>
        <div class="meta-row2">
          <span class="mono-sm">{{ task.asin || '—' }}</span>
          <span class="sep">{{ task.store_name || '—' }}</span>
          <span class="price-sm">${{ Number(task.product_price || 0).toFixed(2) }}</span>
          <span v-if="task.category" class="sep text-gray">{{ task.category }}</span>
          <span v-if="task.country" class="sep text-gray">{{ task.country }}</span>
        </div>
        <div class="meta-row3">
          <span class="meta-focus-item"><span class="meta-focus-label">测评等级</span><span class="meta-focus-value">{{ task.review_level || '—' }}</span></span>
          <span class="meta-focus-item"><span class="meta-focus-label">指定变体</span><span class="meta-focus-value">{{ task.variant_info || '—' }}</span></span>
          <span class="meta-focus-item meta-focus-item-wide"><span class="meta-focus-label">任务备注</span><span class="meta-focus-value">{{ task.task_notes || '—' }}</span></span>
        </div>
      </div>
      <div class="workflow-edit-side">
        <span :class="progressBadgeClassFn(task)">{{ progressLabelFn(task) }}</span>
        <span v-if="task.buyer_name" class="assign-name">{{ task.buyer_name }}</span>
      </div>
    </div>

    <div
      v-if="deadlineAlert"
      :class="['task-deadline-alert', deadlineAlert.type === 'danger' ? 'is-danger' : 'is-warning']"
    >
      <span class="task-deadline-alert-label">{{ deadlineAlert.reason }}</span>
      <span class="task-deadline-alert-time">截止 {{ deadlineAlert.deadlineText }}</span>
      <span class="task-deadline-alert-detail">{{ deadlineAlert.detail }}</span>
    </div>

    <div class="product-info-bar">
      <div class="pi-item"><span class="pi-label">产品名称</span><span class="pi-val">{{ task.product_name || '—' }}</span></div>
      <div class="pi-item"><span class="pi-label">品牌</span><span class="pi-val">{{ task.brand_name || '—' }}</span></div>
      <div class="pi-item"><span class="pi-label">类目</span><span class="pi-val">{{ task.category || '—' }}</span></div>
      <div class="pi-item"><span class="pi-label">客户</span><span class="pi-val">{{ task.customer_name || '—' }}</span></div>
      <div class="pi-item"><span class="pi-label">商务</span><span class="pi-val">{{ task.sales_person || '—' }}</span></div>
      <div v-if="showReplaceProductButton" class="pi-actions">
        <a-button size="small" @click="onOpenReplaceProduct(task)">{{ replaceProductButtonLabel }}</a-button>
      </div>
    </div>

    <div class="workflow-steps-modern">
      <div class="wf-panel">
        <div class="wf-panel-head">
          <div class="wf-panel-header">
            <span class="wf-panel-index">1.</span>
            <span>匹配买手</span>
            <span v-if="task.buyer_name" class="wf-panel-status done">已匹配</span>
            <span v-else class="wf-panel-status todo">待处理</span>
          </div>
          <a class="re-edit" @click.stop="task._editing_buyer = true; task._buyer_validation = null">更换买手</a>
        </div>
        <div class="wf-panel-body">
          <div v-if="task.buyer_id && !task._editing_buyer" class="buyer-brief-row">
            <span class="buyer-name-text">{{ task.buyer_name }}</span>
          </div>
          <div v-if="task.buyer_id && !task._editing_buyer" class="buyer-brief-desc">
            {{ task._buyer_country || task.buyer?.country || '—' }} · {{ task._buyer_level || task.buyer?.level || '—' }}
          </div>
          <div v-if="!task.buyer_id || task._editing_buyer" class="buyer-assign-area">
            <div class="step-input-row">
              <a-select
                v-model:value="task._sel_buyer_id"
                style="width:240px"
                show-search
                option-filter-prop="label"
                placeholder="选择买手"
                size="small"
                allow-clear
                @change="(val: string) => onBuyerSelect(task, val)"
              >
                <a-select-option
                  v-for="b in buyerList"
                  :key="b.id"
                  :value="b.id"
                  :label="b.name"
                  :disabled="!!getBuyerBlockReason(task, b.id)"
                >
                  <div class="buyer-opt-row">
                    <span>{{ b.name }}</span>
                    <span class="buyer-opt-meta"> · {{ b.country || '—' }} · {{ b.level || '—' }}</span>
                    <span v-if="getBuyerBlockReason(task, b.id)" class="buyer-opt-blocked">{{ getBuyerBlockReason(task, b.id) }}</span>
                  </div>
                </a-select-option>
              </a-select>
              <a-button
                type="primary"
                size="small"
                :loading="task._saving_buyer || task._validating_buyer"
                :disabled="!task._sel_buyer_id || task._buyer_validation?.blocked"
                @click="assignBuyer(task)"
              >
                确认分配
              </a-button>
            </div>
            <div v-if="task._validating_buyer" class="buyer-validation-hint checking">验证买手资格...</div>
            <div v-else-if="task._buyer_validation?.blocked" class="buyer-validation-hint blocked">{{ task._buyer_validation.reason }}</div>
            <div v-else-if="task._buyer_validation && !task._buyer_validation.blocked" class="buyer-validation-hint passed">
              买手资格验证通过
              <span v-if="task._buyer_validation.monthlyCount !== undefined" class="val-detail">· 本月已接单 {{ task._buyer_validation.monthlyCount }}/2</span>
            </div>
          </div>
        </div>
      </div>

      <div class="wf-panel">
        <div class="wf-panel-head">
          <div class="wf-panel-header">
            <span class="wf-panel-index">2.</span>
            <span>{{ refundPanelTitle(task) }}</span>
            <span v-if="isRefundStepReadonly(task)" class="wf-panel-status done">已完成</span>
            <span v-else-if="task._refund_request_pending" class="wf-panel-status todo">待财务审核</span>
            <span v-else class="wf-panel-status todo">当前待办</span>
          </div>
        </div>
        <div class="wf-panel-body">
          <template v-if="isRefundStepReadonly(task)">
            <div class="refund-compact-card">
              <div class="refund-compact-main">
                <div class="refund-compact-title">已处理返款 {{ processedRefundsForDisplay(task).length }} 笔</div>
                <div class="refund-compact-meta">
                  <span v-if="task.refund_method">当前方式 {{ task.refund_method }}</span>
                  <span v-if="aggregateProcessedRefunds(task).any">累计 ${{ (aggregateProcessedRefunds(task).paypalTotal + aggregateProcessedRefunds(task).giftFace).toFixed(2) }}</span>
                  <span>{{ detailHintText }}</span>
                </div>
              </div>
            </div>
            <div v-if="showProcessedRefundList && processedRefundsForDisplay(task).length" class="refund-processed-list">
              <div v-for="row in processedRefundsForDisplay(task)" :key="row.id" class="refund-processed-card">
                <div class="rpc-head">
                  <div class="rpc-head-main">
                    <span class="rpc-type">{{ refundRequestTypeLabel(row) }}</span>
                    <span class="rpc-method">{{ row.refund_method || '—' }}</span>
                    <span class="rpc-status">{{ refundStatusLabel(row.status) || row.status || '已处理' }}</span>
                  </div>
                  <span class="rpc-time">{{ formatTime(row.updated_at || row.created_at) }}</span>
                </div>
                <div class="rpc-body">
                  <span>返款金额 ${{ Number(row.refund_amount_usd || row.refund_amount || 0).toFixed(2) }}</span>
                  <span v-if="row.refund_method === 'PayPal'">实付 ${{ inferActualPaidUsd(row).toFixed(2) }}</span>
                  <span v-if="row.refund_method === 'PayPal'">手续费 ${{ Number(row.paypal_fee_usd || 0).toFixed(2) }}</span>
                  <span v-if="row.buyer_paypal_email">PayPal {{ row.buyer_paypal_email }}</span>
                </div>
              </div>
            </div>
            <div class="extra-refund-bar">
              <a-button size="small" type="primary" ghost @click="startSupplementalRefund(task)">追加返款</a-button>
              <a-button v-if="showCorrectionAction" size="small" @click="startCorrectionRefund(task)" :disabled="!task._refund_request_latest_processed">更正返款</a-button>
              <a-input-number v-model:value="task._extra_refund_amount" size="small" :min="0" :precision="2" style="width:130px" placeholder="追加基数$" />
              <span class="extra-method-label">追加方式</span>
              <a-radio-group v-model:value="task._extra_refund_method" size="small">
                <a-radio value="同首笔">同首笔</a-radio>
                <a-radio value="礼品卡">礼品卡</a-radio>
                <a-radio value="PayPal">PayPal</a-radio>
              </a-radio-group>
              <a-radio-group v-model:value="task._extra_refund_reason" size="small">
                <a-radio value="产品涨价">产品涨价</a-radio>
                <a-radio value="产品额外佣金">产品额外佣金</a-radio>
              </a-radio-group>
            </div>
          </template>

          <template v-else>
            <a-alert
              v-if="task._refund_supplement_mode"
              type="info"
              show-icon
              style="margin-bottom:8px"
              :message="'追加返款：原因「' + (task._extra_refund_reason || '—') + '」。' + (task._extra_refund_reason === '产品涨价' ? '请务必将「实付金额」改为涨价后的真实金额。' : '')"
            />
            <a-alert
              v-if="task._refund_correction_mode"
              type="warning"
              show-icon
              style="margin-bottom:8px"
              message="更正返款：将生成新的待财务处理申请，请修改邮箱或金额后重新提交。"
            />
            <a-alert
              v-if="task._refund_request_pending && !task._refund_supplement_mode && !task._refund_correction_mode"
              type="info"
              show-icon
              style="margin-bottom:8px"
              message="当前有一条待财务审核的返款申请，更新后会保留修改留痕。"
            />
            <div
              v-if="(task._refund_request_pending?.staff_change_log || []).length && !task._refund_supplement_mode && !task._refund_correction_mode"
              class="refund-audit-trail"
            >
              <div class="rat-title">业务员修改留痕</div>
              <div v-for="(entry, ei) in (task._refund_request_pending.staff_change_log || [])" :key="ei" class="rat-entry">
                <div class="rat-meta">{{ formatTime(entry.at) }} · {{ entry.staff_name }}</div>
                <ul class="rat-ul">
                  <li v-for="(ed, ej) in (entry.edits || [])" :key="ej">{{ formatAuditEdit(ed) }}</li>
                </ul>
              </div>
            </div>
            <div v-if="task._refund_supplement_mode || task._refund_correction_mode" class="refund-action-row" style="margin-bottom:4px">
              <a-button size="small" @click="cancelRefundSpecialModes(task)">取消</a-button>
            </div>
            <div class="refund-setup-row">
              <span class="refund-setup-label">返款节点</span>
              <a-radio-group v-model:value="task._sel_refund_sequence" size="small" @change="syncRefundComputed(task)">
                <a-radio value="预付">预付</a-radio>
                <a-radio value="出单后返">出单后返</a-radio>
                <a-radio value="收货后返">收货后返</a-radio>
                <a-radio value="评后返">评后返</a-radio>
                <a-radio value="无需返款">无需返款</a-radio>
              </a-radio-group>
            </div>
            <div v-if="isNoRefundSelection(task)" class="refund-no-need-tip">选择“无需返款”后，保存将直接标记为无需退款，不会生成新的财务返款申请。</div>
            <div v-if="!isNoRefundSelection(task)" class="refund-setup-row">
              <span class="refund-setup-label">返款方式</span>
              <a-radio-group v-model:value="task._sel_refund_method" size="small" @change="syncRefundComputed(task)">
                <a-radio value="礼品卡">礼品卡</a-radio>
                <a-radio value="PayPal">贝宝(PayPal)</a-radio>
                <a-radio value="其他">其他</a-radio>
              </a-radio-group>
            </div>
            <div v-if="!isNoRefundSelection(task) && task._sel_refund_method === 'PayPal'" class="refund-row">
              <label>买手 PayPal 邮箱</label>
              <a-input v-model:value="task._buyer_paypal_email" size="small" style="width:240px" placeholder="amanda@example.com" />
            </div>
            <div v-if="!isNoRefundSelection(task)" class="refund-amount-box">
              <div class="refund-amount-title">金额明细</div>
              <div class="refund-product-ref">系统产品标价（参考）<span class="refund-product-ref-val">${{ Number(task.product_price || 0).toFixed(2) }}</span></div>
              <div v-if="task._sel_refund_method === 'PayPal'" class="refund-amount-fields">
                <div class="raf-line">
                  <span class="raf-label">实付金额</span>
                  <a-input-number v-model:value="task._refund_amount_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" @change="syncRefundComputed(task)" />
                  <span class="raf-hint">买手实际支付</span>
                </div>
                <div class="raf-line">
                  <span class="raf-label">贝宝手续费</span>
                  <a-input-number v-model:value="task._refund_fee_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" @change="syncRefundComputed(task)" />
                  <span class="raf-hint">由财务承担的手续费，计入打款总额</span>
                </div>
                <div class="raf-line raf-total">
                  <span class="raf-label">合计返款</span>
                  <span class="raf-total-val">${{ getRefundFinalAmount(task).toFixed(2) }}</span>
                </div>
              </div>
              <div v-else class="refund-amount-fields">
                <div class="raf-line">
                  <span class="raf-label">实付金额</span>
                  <a-input-number v-model:value="task._refund_amount_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" @change="syncRefundComputed(task)" />
                  <span class="raf-hint">买手实际支付（可与标价不同）</span>
                </div>
                <div class="raf-line">
                  <span class="raf-label">应返礼品卡面额</span>
                  <a-input-number v-model:value="task._refund_final_amount_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" />
                  <span class="raf-hint">发给买手的卡面金额，可与实付一致或含补贴</span>
                </div>
              </div>
            </div>
            <div class="refund-row">
              <label>备注</label>
              <a-input v-model:value="task._refund_apply_notes" size="small" style="width:360px" placeholder="选填，例如：买手催款..." />
            </div>
            <div v-if="!isNoRefundSelection(task)" class="refund-row">
              <a-checkbox v-model:checked="task._need_finance_screenshot">需财务提供水单</a-checkbox>
            </div>
            <div class="refund-action-row">
              <a-button
                type="primary"
                size="small"
                :loading="task._submitting_refund"
                :disabled="!isNoRefundSelection(task) && !getRefundFinalAmount(task)"
                @click="submitRefundRequest(task)"
              >
                {{ refundSubmitButtonText(task) }}
              </a-button>
            </div>
          </template>
        </div>
      </div>

      <div class="wf-panel">
        <div class="wf-panel-head">
          <div class="wf-panel-header">
            <span class="wf-panel-index">3.</span>
            <span>填写Amazon订单号</span>
            <span v-if="task.amazon_order_id" class="wf-panel-status done">已完成</span>
            <span v-else class="wf-panel-status todo">待处理</span>
          </div>
        </div>
        <div class="wf-panel-body">
          <a-alert
            v-if="isPrepayMode(task) && !isRefundStepReadonly(task)"
            type="info"
            show-icon
            message="预付模式需等待财务返款完成后，才可填写Amazon订单号"
            style="margin-bottom:10px"
          />
          <div class="step-input-row">
            <a-input
              v-model:value="task._input_amazon_order_id"
              size="small"
              style="width:260px"
              placeholder="111-1111111-1111111"
              :disabled="isPrepayMode(task) && !isRefundStepReadonly(task)"
            />
            <a-button
              type="primary"
              size="small"
              :loading="task._saving_amazon"
              :disabled="!task._input_amazon_order_id || (isPrepayMode(task) && !isRefundStepReadonly(task))"
              @click="saveAmazonOrder(task)"
            >
              确认
            </a-button>
          </div>
        </div>
      </div>

      <div class="wf-panel">
        <div class="wf-panel-head">
          <div class="wf-panel-header">
            <span class="wf-panel-index">4.</span>
            <span>留评凭证上传</span>
            <span v-if="task.review_screenshot_url || task.fb_image_url" class="wf-panel-status done">已完成</span>
            <span v-else class="wf-panel-status todo">待处理</span>
          </div>
        </div>
        <div class="wf-panel-body">
          <div class="refund-row">
            <label>凭证类型</label>
            <a-radio-group v-model:value="task._proof_type" size="small">
              <a-radio value="Review">Review(留评)</a-radio>
              <a-radio value="Feedback">Feedback(店铺反馈)</a-radio>
            </a-radio-group>
          </div>
          <div class="refund-row">
            <label>{{ task._proof_type === 'Feedback' ? '反馈链接' : '评论链接' }}</label>
            <a-input v-model:value="task._proof_comment_link" size="small" style="width:360px" placeholder="https://..." />
          </div>
          <div class="refund-row">
            <label>{{ task._proof_type === 'Feedback' ? '反馈图片' : '凭证图片' }}</label>
            <a-input v-model:value="task._input_screenshot_url" size="small" style="width:360px" placeholder="粘贴图片URL（支持多张可用逗号分隔）" />
          </div>
          <div class="refund-action-row">
            <a-button type="primary" size="small" :loading="task._saving_screenshot" :disabled="!task._input_screenshot_url" @click="saveScreenshot(task)">提交</a-button>
          </div>
        </div>
      </div>

      <div class="wf-panel">
        <div class="wf-panel-head">
          <div class="wf-panel-header">
            <span class="wf-panel-index">5.</span>
            <span>子单备注</span>
            <span v-if="task.notes" class="wf-panel-status done">已填写</span>
            <span v-else class="wf-panel-status todo">选填</span>
          </div>
        </div>
        <div class="wf-panel-body">
          <div class="refund-row">
            <label>子单备注</label>
            <a-input
              v-model:value="task._edit_order_notes"
              size="small"
              style="width:360px"
              placeholder="填写子单备注"
              @blur="saveOrderNotes(task)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'

type Fn<T extends any[] = any[], R = any> = (...args: T) => R

const props = withDefaults(defineProps<{
  task: any
  buyerList: any[]
  showSummaryHeader?: boolean
  showProcessedRefundList?: boolean
  showCorrectionAction?: boolean
  showReplaceProductButton?: boolean
  replaceProductButtonLabel?: string
  detailHintText?: string
  deadlineAlert?: any | null
  progressBadgeClassFn?: Fn<[any], any>
  progressLabelFn?: Fn<[any], string>
  formatTime?: Fn<[string], string>
  getBuyerBlockReason?: Fn<[any, string], string>
  onBuyerSelect?: Fn<[any, string], void>
  assignBuyer?: Fn<[any], void>
  refundPanelTitle?: Fn<[any], string>
  isRefundStepReadonly?: Fn<[any], boolean>
  processedRefundsForDisplay?: Fn<[any], any[]>
  aggregateProcessedRefunds?: Fn<[any], any>
  refundRequestTypeLabel?: Fn<[any], string>
  inferActualPaidUsd?: Fn<[any], number>
  refundStatusLabel?: Fn<[string], string>
  startSupplementalRefund?: Fn<[any], void>
  startCorrectionRefund?: Fn<[any], void>
  cancelRefundSpecialModes?: Fn<[any], void>
  syncRefundComputed?: Fn<[any], void>
  isNoRefundSelection?: Fn<[any], boolean>
  getRefundFinalAmount?: Fn<[any], number>
  refundSubmitButtonText?: Fn<[any], string>
  submitRefundRequest?: Fn<[any], void>
  isPrepayMode?: Fn<[any], boolean>
  saveAmazonOrder?: Fn<[any], void>
  saveScreenshot?: Fn<[any], void>
  saveOrderNotes?: Fn<[any], void>
  onOpenReplaceProduct?: Fn<[any], void>
  formatAuditEdit?: Fn<[any], string>
}>(), {
  showSummaryHeader: false,
  showProcessedRefundList: false,
  showCorrectionAction: false,
  showReplaceProductButton: true,
  replaceProductButtonLabel: '更换产品',
  detailHintText: '明细请点右侧「详情」查看',
  deadlineAlert: null,
  progressBadgeClassFn: () => '',
  progressLabelFn: () => '',
  formatTime: () => '—',
  getBuyerBlockReason: () => '',
  onBuyerSelect: () => undefined,
  assignBuyer: () => undefined,
  refundPanelTitle: () => '返款申请',
  isRefundStepReadonly: () => false,
  processedRefundsForDisplay: () => [],
  aggregateProcessedRefunds: () => ({ any: false, paypalTotal: 0, giftFace: 0 }),
  refundRequestTypeLabel: () => '',
  inferActualPaidUsd: () => 0,
  refundStatusLabel: (status: string) => status || '',
  startSupplementalRefund: () => undefined,
  startCorrectionRefund: () => undefined,
  cancelRefundSpecialModes: () => undefined,
  syncRefundComputed: () => undefined,
  isNoRefundSelection: () => false,
  getRefundFinalAmount: () => 0,
  refundSubmitButtonText: () => '提交返款申请',
  submitRefundRequest: () => undefined,
  isPrepayMode: () => false,
  saveAmazonOrder: () => undefined,
  saveScreenshot: () => undefined,
  saveOrderNotes: () => undefined,
  onOpenReplaceProduct: () => undefined,
  formatAuditEdit: (edit: any) => String(edit ?? ''),
})

const task = toRef(props, 'task')
const buyerList = toRef(props, 'buyerList')
const {
  showSummaryHeader,
  showProcessedRefundList,
  showCorrectionAction,
  showReplaceProductButton,
  replaceProductButtonLabel,
  detailHintText,
  deadlineAlert,
  progressBadgeClassFn,
  progressLabelFn,
  formatTime,
  getBuyerBlockReason,
  onBuyerSelect,
  assignBuyer,
  refundPanelTitle,
  isRefundStepReadonly,
  processedRefundsForDisplay,
  aggregateProcessedRefunds,
  refundRequestTypeLabel,
  inferActualPaidUsd,
  refundStatusLabel,
  startSupplementalRefund,
  startCorrectionRefund,
  cancelRefundSpecialModes,
  syncRefundComputed,
  isNoRefundSelection,
  getRefundFinalAmount,
  refundSubmitButtonText,
  submitRefundRequest,
  isPrepayMode,
  saveAmazonOrder,
  saveScreenshot,
  saveOrderNotes,
  onOpenReplaceProduct,
  formatAuditEdit,
} = props
</script>

<style scoped>
.workflow-editor {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.workflow-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: linear-gradient(135deg, #f8fbff 0%, #f8fafc 100%);
  margin-bottom: 14px;
}

.task-meta {
  flex: 1;
  min-width: 0;
}

.meta-row1,
.meta-row2,
.meta-row3 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.meta-row2,
.meta-row3 {
  margin-top: 8px;
}

.sub-no-text {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #1a1a2e;
}

.keyword-badge {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-name-sm {
  font-size: 12px;
  color: #374151;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mono-sm {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}

.sep {
  padding-left: 10px;
}

.price-sm {
  font-size: 12px;
  font-weight: 600;
  color: #059669;
  padding-left: 10px;
}

.text-gray {
  color: #9ca3af;
}

.meta-focus-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: #1a1a2e;
}

.meta-focus-item-wide {
  max-width: 420px;
}

.meta-focus-label {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a2e;
  white-space: nowrap;
}

.meta-focus-value {
  font-size: 12px;
  font-weight: 500;
  color: #1a1a2e;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-edit-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.assign-name {
  font-size: 12px;
  color: #6b7280;
}

.task-deadline-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: rgba(217, 119, 6, 0.08);
}

.task-deadline-alert.is-danger {
  background: rgba(220, 38, 38, 0.08);
}

.task-deadline-alert-label {
  font-size: 12px;
  font-weight: 700;
  color: #1a1a2e;
}

.task-deadline-alert-time,
.task-deadline-alert-detail {
  font-size: 12px;
  color: #6b7280;
}

.task-deadline-alert-detail {
  color: #d97706;
  font-weight: 600;
}

.task-deadline-alert.is-danger .task-deadline-alert-detail {
  color: #dc2626;
}

.product-info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  padding: 8px 16px;
}

.pi-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 12px;
  border-right: 1px solid #e5e7eb;
}

.pi-item:last-child {
  border-right: none;
}

.pi-label {
  font-size: 12px;
  color: #1a1a2e;
  font-weight: 600;
  white-space: nowrap;
}

.pi-val {
  font-size: 12px;
  color: #1a1a2e;
  font-weight: 500;
}

.pi-actions {
  margin-left: auto;
  padding: 3px 0 3px 12px;
}

.workflow-steps-modern {
  padding: 14px 16px 6px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wf-panel {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
}

.wf-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #f8fafc;
}

.wf-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #1a1a2e;
  font-weight: 600;
}

.wf-panel-index {
  color: #2563eb;
  min-width: 18px;
}

.wf-panel-status {
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
}

.wf-panel-status.done {
  color: #059669;
  background: rgba(5, 150, 105, 0.12);
}

.wf-panel-status.todo {
  color: #d97706;
  background: rgba(217, 119, 6, 0.12);
}

.wf-panel-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}

.re-edit {
  font-size: 12px;
  color: #2563eb;
}

.buyer-brief-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.buyer-name-text {
  font-weight: 600;
  color: #1a1a2e;
}

.buyer-brief-desc {
  font-size: 12px;
  color: #6b7280;
  margin-top: -2px;
}

.buyer-assign-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-input-row,
.refund-action-row,
.refund-setup-row,
.refund-row,
.extra-refund-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.refund-row label,
.refund-setup-label {
  min-width: 88px;
  font-size: 12px;
  color: #6b7280;
}

.buyer-opt-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.buyer-opt-meta {
  color: #6b7280;
}

.buyer-opt-blocked {
  color: #dc2626;
  font-size: 11px;
}

.buyer-validation-hint {
  font-size: 12px;
}

.buyer-validation-hint.checking { color: #2563eb; }
.buyer-validation-hint.blocked { color: #dc2626; }
.buyer-validation-hint.passed { color: #15803d; }

.refund-compact-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
}

.refund-compact-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.refund-compact-title {
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
}

.refund-compact-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: #6b7280;
}

.refund-processed-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.refund-processed-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}

.rpc-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px;
  background: #f8fafc;
  border-bottom: 1px solid #f0f0f0;
}

.rpc-head-main,
.rpc-body {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rpc-type,
.rpc-method,
.rpc-status {
  font-size: 11px;
  font-weight: 600;
}

.rpc-type { color: #2563eb; }
.rpc-method { color: #7c3aed; }
.rpc-status { color: #059669; }
.rpc-time { margin-left: auto; font-size: 11px; color: #9ca3af; }
.rpc-body { padding: 8px 10px; font-size: 12px; color: #374151; }

.refund-audit-trail {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fafafa;
}

.rat-title {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 8px;
}

.rat-entry + .rat-entry {
  margin-top: 8px;
}

.rat-meta {
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
}

.rat-ul {
  margin: 0;
  padding-left: 18px;
  color: #374151;
  font-size: 12px;
}

.refund-no-need-tip {
  font-size: 12px;
  color: #6b7280;
  background: #f5f7fa;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
}

.refund-amount-box {
  border: 1px dashed #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  padding: 10px 12px;
}

.refund-amount-title {
  font-size: 12px;
  color: #1a1a2e;
  font-weight: 600;
  margin-bottom: 8px;
}

.refund-product-ref {
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 8px;
}

.refund-product-ref-val {
  font-weight: 600;
  color: #1a1a2e;
  margin-left: 6px;
}

.refund-amount-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.raf-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.raf-label {
  min-width: 100px;
  font-size: 12px;
  color: #374151;
  font-weight: 500;
}

.raf-hint {
  font-size: 11px;
  color: #9ca3af;
  flex: 1 1 140px;
}

.raf-line.raf-total {
  padding-top: 6px;
  border-top: 1px dashed #bfdbfe;
  margin-top: 2px;
}

.raf-total-val {
  font-size: 14px;
  font-weight: 700;
  color: #2563eb;
}

.extra-method-label {
  font-size: 12px;
  color: #6b7280;
}

@media (max-width: 900px) {
  .workflow-edit-header {
    flex-direction: column;
  }

  .workflow-edit-side {
    align-items: flex-start;
  }

  .product-info-bar {
    gap: 8px;
  }

  .pi-item {
    border-right: none;
    padding: 0;
  }
}
</style>
