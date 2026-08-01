<template>
  <div class="workflow-editor">
    <div
      v-if="effectiveShowSummaryHeader"
      class="workflow-edit-header"
    >
      <div class="task-meta">
        <div class="meta-row1">
          <span class="product-name-sm">{{ task.product_name || '—' }}</span>
          <span class="mono-sm">{{ task.asin || '—' }}</span>
          <a-tag v-if="getReviewTypeLabel(task.review_type || task.order_type)" color="blue" class="meta-tone-tag">
            {{ syncEditExperience ? getReviewTypeLabel(task.review_type || task.order_type) : `测评类型 · ${getReviewTypeLabel(task.review_type || task.order_type)}` }}
          </a-tag>
          <a-tag v-if="getReviewLevelLabel(task.review_level)" color="gold" class="meta-tone-tag">
            {{ syncEditExperience ? getReviewLevelLabel(task.review_level) : `测评等级 · ${getReviewLevelLabel(task.review_level)}` }}
          </a-tag>
        </div>
        <div class="meta-chip-row">
          <span class="meta-chip meta-chip-price"><span class="meta-chip-label">售价</span><span class="meta-chip-value">${{ Number(task.product_price || 0).toFixed(2) }}</span></span>
          <span class="meta-chip"><span class="meta-chip-label">店铺</span><span class="meta-chip-value">{{ task.store_name || '—' }}</span></span>
          <span class="meta-chip"><span class="meta-chip-label">关键词</span><span class="meta-chip-value">{{ getKeywordDisplay(task) }}</span></span>
          <span v-if="shouldShowVariantInfo(task.variant_info)" class="meta-chip">
            <span class="meta-chip-label">变体信息</span>
            <span class="meta-chip-value">{{ task.variant_info }}</span>
          </span>
          <span class="meta-chip meta-chip-wide"><span class="meta-chip-label">任务备注</span><span class="meta-chip-value">{{ task.task_notes || '—' }}</span></span>
        </div>
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
      <div class="pi-item"><span class="pi-label">品牌</span><span class="pi-val">{{ task.brand_name || '—' }}</span></div>
      <div class="pi-item"><span class="pi-label">客户</span><span class="pi-val">{{ task.customer_name || '—' }}</span></div>
      <div class="pi-item"><span class="pi-label">商务</span><span class="pi-val">{{ task.sales_person || '—' }}</span></div>
      <div v-if="effectiveShowReplaceProductButton" class="pi-actions">
        <a-button size="small" @click="onOpenReplaceProduct(task)">{{ replaceProductButtonLabel }}</a-button>
      </div>
    </div>

    <div class="workflow-steps-modern">
      <div v-if="effectiveShowBuyerStep" class="wf-panel">
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
          <div v-if="task.buyer_id && !task._editing_buyer && getBuyerBriefMeta(task)" class="buyer-brief-desc">
            {{ getBuyerBriefMeta(task) }}
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
                v-if="!effectiveShowUnifiedSubmitButton"
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

      <div v-if="effectiveShowRefundStep" class="wf-panel">
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
            <div class="refund-readonly-summary">
              <span class="refund-readonly-count">已返款 {{ processedRefundsForDisplay(task).length }} 笔</span>
              <span class="refund-readonly-inline">
                <span class="refund-readonly-inline-label">实返金额</span>
                <strong>${{ Number(task._refund_final_amount_usd || task.refund_amount || 0).toFixed(2) }}</strong>
              </span>
              <span class="refund-readonly-inline">
                <span class="refund-readonly-inline-label">方式</span>
                <a-tag :color="(task._sel_refund_method || task.refund_method) === 'PayPal' ? 'blue' : 'orange'" size="small">
                  {{ task._sel_refund_method || task.refund_method || '—' }}
                </a-tag>
              </span>
            </div>
            <div class="refund-readonly-paid-row">
              <label>实付金额</label>
              <a-input-number v-model:value="task._refund_amount_usd" size="small" :min="0" :precision="2" style="width:160px" prefix="$" @change="syncRefundComputed(task)" />
            </div>
            <div class="refund-readonly-extra">
              <button
                v-if="syncEditExperience"
                type="button"
                class="refund-readonly-extra-toggle"
                :aria-expanded="supplementRefundExpanded"
                @click="supplementRefundExpanded = !supplementRefundExpanded"
              >
                <span>追加返款</span>
                <span class="refund-readonly-extra-toggle-text">{{ supplementRefundExpanded ? '收起' : '展开' }}</span>
              </button>
              <div v-else class="refund-readonly-extra-title">追加返款</div>
              <div v-show="!syncEditExperience || supplementRefundExpanded" class="refund-readonly-grid">
                <div class="refund-readonly-item">
                  <label>追加金额</label>
                  <a-input-number v-model:value="task._extra_refund_amount" size="small" :min="0" :precision="2" style="width:160px" prefix="$" />
                </div>
                <div class="refund-readonly-item refund-readonly-item-wide">
                  <label>追加方式</label>
                  <a-radio-group v-model:value="task._extra_refund_method" size="small">
                    <a-radio value="礼品卡">礼品卡</a-radio>
                    <a-radio value="PayPal">Paypal</a-radio>
                  </a-radio-group>
                </div>
                <div v-if="task._extra_refund_method === 'PayPal'" class="refund-readonly-item refund-readonly-item-wide">
                  <label>Paypal邮箱</label>
                  <a-input v-model:value="task._buyer_paypal_email" size="small" placeholder="amanda@example.com" />
                </div>
                <div class="refund-readonly-item refund-readonly-item-wide">
                  <label>追加原因</label>
                  <a-radio-group v-model:value="task._extra_refund_reason" size="small">
                    <a-radio value="产品涨价">产品涨价</a-radio>
                    <a-radio value="产品额外佣金">产品额外佣金</a-radio>
                  </a-radio-group>
                </div>
              </div>
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
            <div v-if="!syncEditExperience && isNoRefundSelection(task)" class="refund-no-need-tip">选择“无需返款”后，保存将直接标记为无需退款，不会生成新的财务返款申请。</div>
            <div v-if="!isNoRefundSelection(task)" class="refund-setup-row">
              <span class="refund-setup-label">返款方式</span>
              <a-radio-group v-model:value="task._sel_refund_method" size="small" @change="syncRefundComputed(task)">
                <a-radio value="礼品卡">礼品卡</a-radio>
                <a-radio value="PayPal">Paypal</a-radio>
                <a-radio value="其他">其他</a-radio>
              </a-radio-group>
            </div>
            <div v-if="!isNoRefundSelection(task) && task._sel_refund_method === 'PayPal'" class="refund-row">
              <label>买手 PayPal 邮箱</label>
              <a-input v-model:value="task._buyer_paypal_email" size="small" style="width:240px" placeholder="amanda@example.com" />
            </div>
            <div v-if="!isNoRefundSelection(task)" class="refund-amount-box">
              <div class="refund-amount-title">金额明细</div>
              <div v-if="task._sel_refund_method === 'PayPal'" class="refund-amount-fields">
                <div class="raf-line">
                  <span class="raf-label">实付金额</span>
                  <a-input-number v-model:value="task._refund_amount_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" @change="syncRefundComputed(task)" />
                </div>
                <div class="raf-line">
                  <span class="raf-label">Paypal手续费</span>
                  <a-input-number v-model:value="task._refund_fee_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" @change="syncRefundComputed(task)" />
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
                </div>
                <div class="raf-line">
                  <span class="raf-label">应返礼品卡面额</span>
                  <a-input-number v-model:value="task._refund_final_amount_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" />
                </div>
              </div>
            </div>
            <div v-if="!isNoRefundSelection(task) && task._sel_refund_method === 'PayPal'" class="refund-row">
              <a-checkbox v-model:checked="task._need_finance_screenshot">需财务提供水单</a-checkbox>
            </div>
            <div v-if="!effectiveShowUnifiedSubmitButton || (syncEditExperience && isDeferredRefundSequence(task))" class="refund-action-row">
              <a-button
                type="primary"
                size="small"
                :loading="task._submitting_refund"
                :disabled="!isNoRefundSelection(task) && !getRefundFinalAmount(task)"
                @click="submitRefundRequest(task)"
              >
                {{ syncEditExperience && isDeferredRefundSequence(task) ? '申请返款' : refundSubmitButtonText(task) }}
              </a-button>
            </div>
          </template>
        </div>
      </div>

      <div v-if="effectiveShowAmazonOrderStep" class="wf-panel">
        <div class="wf-panel-head">
          <div class="wf-panel-header">
            <span class="wf-panel-index">3.</span>
            <span>填写Amazon订单号</span>
            <span v-if="task.amazon_order_id" class="wf-panel-status done">已完成</span>
            <span v-else class="wf-panel-status todo">待处理</span>
          </div>
        </div>
        <div class="wf-panel-body">
          <div class="step-input-row">
            <a-input
              v-model:value="task._input_amazon_order_id"
              size="small"
              style="width:260px"
              placeholder="111-1111111-1111111"
              :disabled="isPrepayMode(task) && !isRefundStepReadonly(task)"
            />
            <a-button
              v-if="!effectiveShowUnifiedSubmitButton"
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

      <div v-if="effectiveShowProofStep" class="wf-panel">
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
            <a-upload
              :file-list="getProofFileList()"
              list-type="picture-card"
              accept="image/*"
              :max-count="1"
              :before-upload="beforeProofUpload"
              @remove="clearProofUpload"
            >
              <div v-if="getProofFileList().length < 1" class="proof-upload-trigger">
                <span class="proof-upload-plus">+</span>
                <span>上传图片</span>
              </div>
            </a-upload>
          </div>
          <div v-if="!effectiveShowUnifiedSubmitButton" class="refund-action-row">
            <a-button type="primary" size="small" :loading="task._saving_screenshot" :disabled="!task._input_screenshot_url" @click="saveScreenshot(task)">提交</a-button>
          </div>
        </div>
      </div>

      <div class="wf-panel">
        <div class="wf-panel-head">
          <div class="wf-panel-header">
            <span class="wf-panel-index">{{ effectiveShowProofStep ? '5.' : '4.' }}</span>
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
              @blur="handleOrderNotesBlur(task)"
            />
          </div>
          <slot name="order-notes-extra" :task="task"></slot>
        </div>
      </div>
      <div v-if="effectiveShowUnifiedSubmitButton" class="workflow-submit-bar">
        <slot name="footer-actions" :task="task" :submitting="unifiedSubmitting" :submit="handleUnifiedSubmit">
          <div class="workflow-footer-actions">
            <a-button type="primary" :loading="unifiedSubmitting" @click="handleUnifiedSubmit">提交</a-button>
            <a-button
              v-if="releaseToHall"
              ghost
              class="workflow-footer-btn workflow-footer-btn-hall"
              @click="releaseToHall(task)"
            >
              放到抢单大厅
            </a-button>
            <a-button
              v-if="transferToOther"
              ghost
              class="workflow-footer-btn workflow-footer-btn-transfer"
              @click="transferToOther(task)"
            >
              转给他人
            </a-button>
          </div>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import { message } from 'ant-design-vue'

type Fn<T extends any[] = any[], R = any> = (...args: T) => R
type EditorMode = 'default' | 'pending-order'

const props = withDefaults(defineProps<{
  task: any
  buyerList: any[]
  editorMode?: EditorMode
  syncEditExperience?: boolean
  showSummaryHeader?: boolean
  showProcessedRefundList?: boolean
  showCorrectionAction?: boolean
  showReplaceProductButton?: boolean
  showBuyerStep?: boolean
  showRefundStep?: boolean
  showAmazonOrderStep?: boolean
  showProofStep?: boolean
  showUnifiedSubmitButton?: boolean
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
  submitAllChanges?: Fn<[any], void | Promise<void>>
  releaseToHall?: Fn<[any], void>
  transferToOther?: Fn<[any], void>
  onOpenReplaceProduct?: Fn<[any], void>
  formatAuditEdit?: Fn<[any], string>
}>(), {
  editorMode: 'default',
  syncEditExperience: false,
  showSummaryHeader: false,
  showProcessedRefundList: false,
  showCorrectionAction: false,
  showReplaceProductButton: true,
  showBuyerStep: true,
  showRefundStep: true,
  showAmazonOrderStep: true,
  showProofStep: true,
  showUnifiedSubmitButton: false,
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
  submitAllChanges: () => undefined,
  onOpenReplaceProduct: () => undefined,
  formatAuditEdit: (edit: any) => String(edit ?? ''),
})

const task = toRef(props, 'task')
const buyerList = toRef(props, 'buyerList')
const {
  syncEditExperience,
  showSummaryHeader,
  showProcessedRefundList,
  showCorrectionAction,
  showReplaceProductButton,
  showBuyerStep,
  showRefundStep,
  showAmazonOrderStep,
  showProofStep,
  showUnifiedSubmitButton,
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
  submitAllChanges,
  releaseToHall,
  transferToOther,
  onOpenReplaceProduct,
  formatAuditEdit,
} = props

const unifiedSubmitting = ref(false)
const supplementRefundExpanded = ref(false)
const isPendingOrderMode = computed(() => props.editorMode === 'pending-order')
const effectiveShowSummaryHeader = computed(() => isPendingOrderMode.value || props.showSummaryHeader)
const effectiveShowReplaceProductButton = computed(() => isPendingOrderMode.value || props.showReplaceProductButton)
const effectiveShowBuyerStep = computed(() => isPendingOrderMode.value || props.showBuyerStep)
const effectiveShowRefundStep = computed(() => isPendingOrderMode.value || props.showRefundStep)
const effectiveShowAmazonOrderStep = computed(() => isPendingOrderMode.value || props.showAmazonOrderStep)
const effectiveShowProofStep = computed(() => isPendingOrderMode.value || props.showProofStep)
const effectiveShowUnifiedSubmitButton = computed(() => isPendingOrderMode.value || props.showUnifiedSubmitButton)

function getReviewTypeLabel(value: any) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (['文字评', '文字'].includes(raw)) return '文字'
  if (['图片评', '图片'].includes(raw)) return '图片'
  if (['视频评', '视频'].includes(raw)) return '视频'
  if (['Feedback评', 'Feedback'].includes(raw)) return 'Feedback'
  return raw
}

function getReviewLevelLabel(value: any) {
  const raw = String(value || '').trim().toUpperCase()
  if (!raw) return ''
  if (raw === 'A') return '普通'
  if (raw === 'B') return '高等'
  if (raw === 'S') return '极高等'
  return String(value || '')
}

function isDeferredRefundSequence(currentTask: any) {
  return ['出单后返', '收货后返', '评后返'].includes(
    String(currentTask?._sel_refund_sequence || currentTask?.refund_sequence || ''),
  )
}

function getKeywordDisplay(currentTask: any) {
  return String(currentTask?.keyword || currentTask?.search_link || '').trim() || '—'
}

function shouldShowVariantInfo(value: any) {
  const raw = String(value || '').trim()
  return !!raw && raw !== '无变体'
}

function getBuyerBriefMeta(currentTask: any) {
  const parts = [
    String(currentTask?._buyer_country || currentTask?.buyer?.country || '').trim(),
    String(currentTask?._buyer_level || currentTask?.buyer?.level || '').trim(),
  ].filter(Boolean)
  return parts.join(' · ')
}

function getProofFileList() {
  if (Array.isArray(task.value?._proof_file_list) && task.value._proof_file_list.length) {
    return task.value._proof_file_list
  }
  const url = String(task.value?._input_screenshot_url || '').trim()
  if (!url) return []
  return [{
    uid: 'existing-proof',
    name: 'proof-image',
    status: 'done',
    url,
  }]
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

async function beforeProofUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    message.error('只能上传图片文件')
    return false
  }
  if (file.size / 1024 / 1024 >= 5) {
    message.error('图片不能超过 5MB')
    return false
  }
  try {
    const dataUrl = await readFileAsDataUrl(file)
    task.value._input_screenshot_url = dataUrl
    task.value._proof_file_list = [{
      uid: `${Date.now()}`,
      name: file.name,
      status: 'done',
      url: dataUrl,
      originFileObj: file,
    }]
  } catch (error: any) {
    message.error(error?.message || '图片读取失败')
  }
  return false
}

function clearProofUpload() {
  task.value._input_screenshot_url = ''
  task.value._proof_file_list = []
}

function handleOrderNotesBlur(currentTask: any) {
  if (effectiveShowUnifiedSubmitButton.value) return
  saveOrderNotes(currentTask)
}

async function handleUnifiedSubmit() {
  if (!submitAllChanges) return
  unifiedSubmitting.value = true
  try {
    await submitAllChanges(task.value)
  } finally {
    unifiedSubmitting.value = false
  }
}
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
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.meta-row1 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.sub-no-text {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
}

.product-name-sm {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mono-sm {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.meta-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 6px 10px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e5e7eb;
}

.meta-chip-price .meta-chip-value {
  color: #059669;
  font-size: 13px;
}

.meta-tone-tag { margin-inline-end: 0; }

.meta-chip-wide {
  max-width: min(100%, 560px);
}

.meta-chip-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  white-space: nowrap;
}

.meta-chip-value {
  font-size: 12px;
  font-weight: 600;
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
  gap: 18px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px 16px;
  margin-bottom: 12px;
}

.pi-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
}

.pi-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
  white-space: nowrap;
}

.pi-val {
  font-size: 12px;
  color: #1a1a2e;
  font-weight: 700;
}

.pi-actions {
  margin-left: auto;
  padding: 0;
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

.proof-upload-trigger {
  width: 96px;
  height: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #6b7280;
  font-size: 12px;
}

.proof-upload-plus {
  font-size: 20px;
  line-height: 1;
  color: #2563eb;
}

.workflow-submit-bar {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.workflow-footer-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  width: 100%;
}

.workflow-footer-btn-hall {
  color: #d97706;
  border-color: rgba(217, 119, 6, 0.32);
}

.workflow-footer-btn-hall:hover,
.workflow-footer-btn-hall:focus {
  color: #b45309 !important;
  border-color: rgba(217, 119, 6, 0.5) !important;
}

.workflow-footer-btn-transfer {
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.28);
}

.workflow-footer-btn-transfer:hover,
.workflow-footer-btn-transfer:focus {
  color: #1d4ed8 !important;
  border-color: rgba(37, 99, 235, 0.5) !important;
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

.refund-readonly-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
}

.refund-readonly-count {
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
}

.refund-readonly-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #1a1a2e;
}

.refund-readonly-inline-label {
  color: #6b7280;
}

.refund-readonly-paid-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.refund-readonly-paid-row label {
  min-width: 88px;
  font-size: 12px;
  color: #6b7280;
}

.refund-readonly-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}

.refund-readonly-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.refund-readonly-item label {
  font-size: 12px;
  color: #6b7280;
}

.refund-readonly-item-wide {
  grid-column: 1 / -1;
}

.refund-readonly-static {
  min-height: 32px;
  display: flex;
  align-items: center;
}

.refund-readonly-extra {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 2px;
}

.refund-readonly-extra-title {
  font-size: 12px;
  font-weight: 700;
  color: #1a1a2e;
}

.refund-readonly-extra-toggle {
  width: 100%;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f5f7fa;
  color: #1a1a2e;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.refund-readonly-extra-toggle-text {
  color: #2563eb;
  font-weight: 600;
}

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
