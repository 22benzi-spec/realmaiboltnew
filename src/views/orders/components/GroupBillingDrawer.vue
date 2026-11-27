<template>
  <a-drawer
    :open="open"
    :title="groupDrawerTitle"
    width="1400"
    placement="right"
    :body-style="{ padding: '0', background: 'var(--eva-bg-soft, #f8f9fb)' }"
    @close="emit('close')"
  >
    <a-spin :spinning="loading">
    <template v-if="displayGroupData">
      <div class="gbh">
        <div class="gbh-left">
          <div class="gbh-meta">
            <span v-if="displayGroupData.customer_name">{{ displayGroupData.customer_name }}</span>
            <span v-if="displayGroupData.customer_name && displayGroupData.batch_date" class="gbh-sep">·</span>
            <span v-if="displayGroupData.batch_date">{{ displayGroupData.batch_date }}</span>
          </div>
        </div>
      </div>

      <div v-if="pendingDiffOrderCount > 0" class="gbh-alert-wrap">
        <div class="gbh-alert">
          <span class="alert-icon">!</span>
          <span>含{{ pendingDiffOrderCount }}个任务存在差价，请及时处理</span>
        </div>
      </div>

      <div class="gb-body">
        <div class="gb-section">
          <div class="section-header">
            <span class="section-title">账款核对与处理</span>
            <a-tag color="blue" size="small">{{ billGroupRows.length }} 组</a-tag>
            <div class="section-actions">
              <a-button size="small" type="primary" :loading="statusSaving" @click="saveStatusEdits">保存修改</a-button>
            </div>
          </div>

          <div class="gbd-group-table" :class="{ 'has-refund': showGroupRefundColumn }">
            <div class="gbd-group-head compact-entry-preview">
              <span class="col-exp" />
              <span class="col-batch">组任务号</span>
              <span class="col-num">任务数</span>
              <span class="col-amt">实际应收</span>
              <span class="col-amt">累计实收</span>
              <span class="col-amt">累计抵消</span>
              <span v-if="showGroupRefundColumn" class="col-amt">累计退款</span>
              <span class="col-status">基础入账状态</span>
              <span class="col-entry">{{ showGroupBasicEntryAmountColumns ? groupBasicEntryAmountLabel(localOrders[0]) : '' }}</span>
              <span class="col-amt">待结差额</span>
              <span class="col-customer">客户</span>
            </div>
            <div v-for="group in billGroupRows" :key="group.key" class="gbd-group-block">
              <div
                class="gbd-group-row compact-entry-preview"
                :class="{ 'is-open': isGroupExpanded(group.key) }"
              >
                <button
                  type="button"
                  class="col-exp group-expand-btn"
                  :aria-label="isGroupExpanded(group.key) ? '折叠组任务' : '展开组任务'"
                  :aria-expanded="isGroupExpanded(group.key)"
                  @click="toggleGroup(group.key)"
                >
                  <span aria-hidden="true">{{ isGroupExpanded(group.key) ? '▼' : '▶' }}</span>
                </button>
                <button type="button" class="col-batch group-batch-btn" @click="toggleGroup(group.key)">{{ group.batchNumber }}</button>
                <span class="col-num">{{ group.taskCount }}</span>
                <span class="col-amt">
                  <span v-if="group.merge" class="gbd-amt-cell">合并操作</span>
                  <span v-else class="gbd-amt-cell">
                    <span class="gbd-amt-cny">¥{{ formatGroupMoney(group.receivable) }}</span>
                    <span v-if="hasGroupUsd(group.receivableUsd)" class="gbd-amt-usd">${{ formatGroupMoney(group.receivableUsd) }}</span>
                  </span>
                </span>
                <span class="col-amt">
                  <span v-if="group.merge" class="gbd-amt-cell">合并操作</span>
                  <span v-else class="gbd-amt-cell">
                    <span class="gbd-amt-cny">¥{{ formatGroupMoney(group.collected) }}</span>
                    <span v-if="hasGroupUsd(group.collectedUsd)" class="gbd-amt-usd">${{ formatGroupMoney(group.collectedUsd) }}</span>
                  </span>
                </span>
                <span class="col-amt">{{ group.merge ? '合并操作' : `¥${formatGroupMoney(group.offset)}` }}</span>
                <span v-if="showGroupRefundColumn" class="col-amt">{{ group.merge ? '合并操作' : (Number(group.refunded) > 0 ? `¥${formatGroupMoney(group.refunded)}` : '-') }}</span>
                <template v-if="group.orders[0]">
                  <span class="col-status">
                    <a-select
                      v-model:value="group.orders[0]._groupBillingStatus"
                      size="small"
                      class="gbd-billing-status"
                      :disabled="statusSaving"
                      @change="onGroupBillingStatusChange(group.orders[0])"
                    >
                      <a-select-option
                        v-for="item in groupBillingStatusOptions(group.orders[0])"
                        :key="item.value"
                        :value="item.value"
                        :disabled="item.disabled"
                      >{{ item.label }}</a-select-option>
                    </a-select>
                  </span>
                  <span class="col-entry">
                    <div v-if="canEditGroupBasicEntry(group.orders[0])" class="gbd-entry-stack">
                      <label class="gbd-entry-line">
                        <span class="gbd-entry-unit">元</span>
                        <a-input-number
                          v-model:value="group.orders[0]._groupBasicEntryCny"
                          size="small"
                          :min="0"
                          :precision="2"
                          class="gbd-entry-input"
                          placeholder="0.00"
                          :disabled="statusSaving"
                          @change="() => syncGroupBasicEntry(group.orders[0])"
                        />
                      </label>
                      <label v-if="showBasicEntryUsdInput(group.orders[0])" class="gbd-entry-line">
                        <span class="gbd-entry-unit">美元</span>
                        <a-input-number
                          v-model:value="group.orders[0]._groupBasicEntryUsd"
                          size="small"
                          :min="0"
                          :precision="2"
                          class="gbd-entry-input is-usd"
                          placeholder="0.00"
                          :disabled="statusSaving"
                          @change="() => syncGroupBasicEntry(group.orders[0])"
                        />
                      </label>
                    </div>
                  </span>
                </template>
                <template v-else>
                  <span class="col-status" />
                  <span class="col-entry" />
                </template>
                <span class="col-amt">
                  <span v-if="group.merge" class="gbd-amt-cell">合并操作</span>
                  <span v-else class="gbd-amt-cell">
                    <span class="gbd-amt-cny" :class="moneyClass(Number(group.diff || 0))">{{ formatGroupDiff(group.diff) }}</span>
                    <span v-if="hasGroupUsd(group.diffUsd)" class="gbd-amt-usd" :class="moneyClass(Number(group.diffUsd || 0))">{{ formatGroupDiffUsd(group.diffUsd) }}</span>
                  </span>
                </span>
                <span class="col-customer">{{ group.customerName || '-' }}</span>
              </div>
              <div
                v-if="isGroupExpanded(group.key)"
                class="gbd-task-wrap is-align-preview"
              >
                <div
                  v-for="order in group.orders"
                  :key="order.id"
                  class="gbd-task-align-row compact-entry-preview"
                >
                  <span class="col-exp" />
                  <div class="col-batch gbd-field">
                    <span class="gbd-field-label">任务号</span>
                    <span class="gbd-field-value">{{ order.task_no || '-' }}</span>
                  </div>
                  <div class="col-num gbd-field gbd-asin-field">
                    <span class="gbd-field-label">ASIN</span>
                    <span class="gbd-field-value">{{ order.product?.asin || '-' }}</span>
                  </div>
                  <div class="col-amt gbd-field">
                    <span class="gbd-field-label">实际应收</span>
                    <span class="gbd-amt-cell">
                      <span class="gbd-amt-cny">¥{{ formatGroupMoney(order._actualReceivable) }}</span>
                      <span v-if="isMixedPaymentOrder(order) && hasGroupUsd(order.task_usd_amount)" class="gbd-amt-usd">${{ formatGroupMoney(order.task_usd_amount) }}</span>
                    </span>
                  </div>
                  <span class="col-amt" />
                  <span class="col-amt" />
                  <span v-if="showGroupRefundColumn" class="col-amt" />
                  <div class="col-status gbd-field">
                    <span class="gbd-field-label">尾款状态</span>
                    <a-select
                      v-model:value="order._groupPaymentStatus"
                      size="small"
                      class="gbd-debt-status"
                      :disabled="statusSaving || Number(order._groupPaymentStatus) === 4"
                      @change="onGroupPaymentStatusChange(order)"
                    >
                      <a-select-option
                        v-for="item in groupDiffStatusOptions(order)"
                        :key="item.value"
                        :value="item.value"
                        :disabled="item.disabled"
                      >{{ item.label }}</a-select-option>
                    </a-select>
                  </div>
                  <div class="col-entry gbd-field">
                    <span class="gbd-field-label">尾款金额</span>
                    <div class="gbd-entry-stack">
                      <label class="gbd-entry-line">
                        <span class="gbd-entry-unit">元</span>
                        <a-input-number
                          v-model:value="order._groupArrearsAmount"
                          size="small"
                          :min="0"
                          :precision="2"
                          class="gbd-entry-input"
                          placeholder="0.00"
                          :disabled="statusSaving || !canEditGroupDebt(order)"
                        />
                      </label>
                      <label v-if="showDebtUsdInput(order)" class="gbd-entry-line">
                        <span class="gbd-entry-unit">美元</span>
                        <a-input
                          v-model:value="order._groupArrearsUsd"
                          size="small"
                          class="gbd-entry-input is-usd"
                          placeholder="0"
                          :disabled="statusSaving || !canEditGroupDebt(order)"
                        />
                      </label>
                    </div>
                  </div>
                  <span class="col-amt" />
                  <span class="col-customer" />
                </div>
              </div>
            </div>
            <div v-if="billGroupRows.length === 0" class="orders-empty">暂无任务组账单数据</div>
            <div v-else class="gbd-group-foot compact-entry-preview">
              <span class="col-exp" />
              <span class="col-batch">合计</span>
              <span class="col-num">{{ apiBillTotal?.task_count || localOrders.length }}</span>
              <span class="col-amt">
                <span class="gbd-amt-cell">
                  <span class="gbd-amt-cny">¥{{ formatGroupMoney(apiBillTotal?.actual_receivable_amount) }}</span>
                  <span v-if="hasGroupUsd(groupTableTotals.receivableUsd)" class="gbd-amt-usd">${{ formatGroupMoney(groupTableTotals.receivableUsd) }}</span>
                </span>
              </span>
              <span class="col-amt">
                <span v-if="groupTotalsMerged" class="gbd-amt-cell">—</span>
                <span v-else class="gbd-amt-cell">
                  <span class="gbd-amt-cny">¥{{ formatGroupMoney(apiBillTotal?.income_flow_amount) }}</span>
                  <span v-if="hasGroupUsd(groupTableTotals.collectedUsd)" class="gbd-amt-usd">${{ formatGroupMoney(groupTableTotals.collectedUsd) }}</span>
                </span>
              </span>
              <span class="col-amt">{{ groupTotalsMerged ? '—' : `¥${formatGroupMoney(apiBillTotal?.offset_amount)}` }}</span>
              <span v-if="showGroupRefundColumn" class="col-amt">{{ groupTotalsMerged ? '—' : `¥${formatGroupMoney(apiBillTotal?.refund_amount)}` }}</span>
              <span class="col-status" />
              <span class="col-entry" />
              <span class="col-amt">
                <span v-if="groupTotalsMerged" class="gbd-amt-cell">—</span>
                <span v-else class="gbd-amt-cell">
                  <span class="gbd-amt-cny" :class="moneyClass(Number(apiBillTotal?.pending_settlement_diff || 0))">{{ formatGroupDiff(apiBillTotal?.pending_settlement_diff) }}</span>
                  <span v-if="hasGroupUsd(groupTableTotals.diffUsd)" class="gbd-amt-usd" :class="moneyClass(groupTableTotals.diffUsd)">{{ formatGroupDiffUsd(groupTableTotals.diffUsd) }}</span>
                </span>
              </span>
              <span class="col-customer" />
            </div>
          </div>

          <div class="gb-section settle-section">
            <div class="section-header">
              <span class="section-title">结算账单</span>
              <a-button size="small" class="settle-copy-btn" @click="copySettleBill">复制</a-button>
            </div>
            <a-textarea :value="settleBillSourceText" readonly :rows="Math.max(4, settleBillSourceText.split('\n').length || 1)" class="bill-editable-text" placeholder="账单内容..." />
          </div>

          <div class="batch-form">
            <div class="bf-submit">
              <a-button type="primary" @click="openRecordModal('supplement')">录入补款</a-button>
              <a-button @click="openRecordModal('offset')">账面抵消</a-button>
              <a-button danger @click="openRecordModal('refund')">提交退款</a-button>
            </div>
          </div>
        </div>

        <div class="gb-section">
          <div class="section-header">
            <span class="section-title">整组交易明细</span>
            <a-tag color="default" size="small">{{ displayGroupPayments.length }} 条</a-tag>
          </div>
          <div v-if="displayGroupPayments.length === 0" class="records-mock-tip">暂无交易明细</div>
          <div v-else class="payment-lines">
            <div class="payment-line payment-line-head">
              <span>时间</span>
              <span>流水号</span>
              <span>交易类型</span>
              <span>收支方向</span>
              <span>金额</span>
              <span>方式</span>
              <span>账单备注</span>
            </div>
            <div v-for="payment in displayGroupPayments" :key="payment.id" class="payment-line">
              <span class="payment-line-date">{{ payment.payment_date || '-' }}</span>
              <span class="payment-line-number">{{ payment.flow_no }}</span>
              <span><a-tag :color="getPaymentTypeColor(payment.payment_type)" size="small">{{ payment.payment_type }}</a-tag></span>
              <span><a-tag :color="getPaymentDirectionColor(payment.direction)" size="small">{{ payment.direction }}</a-tag></span>
              <span :class="payment.direction === '支出' ? 'payment-line-refund' : payment.direction === '账面抵消' ? 'payment-line-offset' : 'payment-line-income'">
                {{ payment.direction === '支出' ? '-' : payment.direction === '账面抵消' ? '抵 ' : '+' }}¥{{ Math.abs(Number(payment.amount_cny || 0)).toFixed(2) }}
              </span>
              <span class="payment-line-meta">{{ payment.payment_method || '-' }}</span>
              <span class="payment-line-notes">{{ payment.finance_remark }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
    </a-spin>

    <a-modal
      :open="recordModalOpen"
      :title="recordModalTitle"
      :ok-text="recordModalOkText"
      :ok-button-props="{ danger: recordMode === 'refund' }"
      :confirm-loading="recordSaving || uploading"
      cancel-text="取消"
      width="560px"
      @ok="openSupplementDiffModal()"
      @cancel="handleRecordCancel"
    >
      <div
        class="add-record-form"
        tabindex="0"
        title="二维码支持点击此区域后按 Ctrl+V 粘贴图片"
        @paste="handleQrPaste"
      >
        <div v-if="recordMode === 'refund'" class="batch-record-summary">{{ recordSummaryLine }}</div>
        <div v-if="recordMode === 'supplement'" class="offset-inline-action">
          <span>如果部分金额已用账面抵消，录入后与本次补款一起提交。</span>
          <a-button size="small" @click="openNestedOffset">账面抵消</a-button>
        </div>
        <div v-if="recordMode === 'supplement' && pendingOffset" class="offset-brief-card">
          <div class="offset-brief-head">
            <span>随补款提交的账面抵消</span>
            <a-space :size="8">
              <a-button size="small" @click="openNestedOffset">编辑</a-button>
              <a-button size="small" danger @click="clearPendingOffset">移除</a-button>
            </a-space>
          </div>
          <div class="offset-brief-tip">抵消来源：{{ pendingOffset.sourceText }}</div>
          <div class="offset-brief-tip">抵消明细：{{ pendingOffset.detailText }}</div>
          <div class="offset-brief-total">抵消金额合计：¥{{ pendingOffset.totalAmount.toFixed(2) }}</div>
        </div>
        <div v-if="recordMode !== 'offset'" class="ar-field">
          <label class="ar-label">一级分类</label>
          <a-select v-model:value="recordForm.primary_category" style="width:100%" :loading="recordMode === 'supplement' && supplementCategoryLoading" @change="onPrimaryCategoryChange">
            <a-select-option v-for="item in primaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
          </a-select>
        </div>
        <div v-if="recordMode !== 'offset'" class="ar-field">
          <label class="ar-label">二级分类</label>
          <a-select v-model:value="recordForm.secondary_categories" mode="multiple" style="width:100%" placeholder="可多选" :loading="recordMode === 'supplement' && supplementCategoryLoading">
            <a-select-option v-for="item in secondaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
          </a-select>
        </div>
        <div v-if="recordMode === 'supplement'" class="ar-field">
          <label class="ar-label">补款币种</label>
          <a-radio-group v-model:value="recordForm.currency_mode" size="small">
            <a-radio-button value="cny">人民币</a-radio-button>
            <a-radio-button value="usd">美元</a-radio-button>
            <a-radio-button value="both">同时填写</a-radio-button>
          </a-radio-group>
        </div>
        <div v-if="showSupplementCny" class="ar-field">
          <label class="ar-label">补款金额（人民币）</label>
          <a-input-number v-model:value="recordForm.amount_cny" style="width:100%" :min="0" :precision="2" placeholder="人民币金额" />
        </div>
        <div v-if="showSupplementUsd" class="ar-field">
          <label class="ar-label">补款金额（USD）</label>
          <a-input-number v-model:value="recordForm.amount_usd" style="width:100%" :min="0" :precision="2" placeholder="美金金额" />
        </div>
        <div v-if="recordMode === 'refund'" class="offset-brief-card">
          <div class="offset-brief-head">
            <span>
              退款明细
              <span v-if="refundDetailsRequired" class="required">*</span>
              <template v-else-if="refundDetailsOptional">（选填）</template>
            </span>
          </div>
          <div class="offset-business-list">
            <div v-for="(row, index) in recordForm.business_rows" :key="index" class="offset-business-row">
              <a-select v-model:value="row.country_id" size="small" placeholder="国家" style="width:120px" show-search option-filter-prop="label">
                <a-select-option v-for="item in countryOptions" :key="item.id" :value="item.id" :label="item.country">{{ item.country }}</a-select-option>
              </a-select>
              <a-select v-model:value="row.review_type" size="small" placeholder="测评类型" style="flex:1">
                <a-select-option v-for="item in businessTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
              </a-select>
              <a-input-number v-model:value="row.quantity" size="small" :min="1" :precision="0" style="width:105px" placeholder="单量" />
              <a-button v-if="index === 0" size="small" aria-label="添加退款明细" @click="addBusinessRow">+</a-button>
              <a-button v-else size="small" danger aria-label="删除退款明细" @click="removeBusinessRow(index)">-</a-button>
            </div>
          </div>
        </div>
        <div v-if="recordMode === 'supplement'" class="ar-field">
          <label class="ar-label">补款日期 <span class="required">*</span></label>
          <a-date-picker v-model:value="recordForm.payment_date" value-format="YYYY-MM-DD" style="width:100%" />
        </div>
        <div v-if="recordMode !== 'offset'" class="ar-field">
          <label class="ar-label">方式</label>
          <a-select v-model:value="recordForm.payment_method" style="width:100%" placeholder="请选择方式">
            <a-select-option value="银行转账">银行转账</a-select-option>
            <a-select-option value="微信">微信</a-select-option>
            <a-select-option value="支付宝">支付宝</a-select-option>
            <a-select-option value="其他">其他</a-select-option>
          </a-select>
        </div>
        <div v-if="recordMode === 'refund' && ['银行转账', '支付宝'].includes(recordForm.payment_method)" class="refund-account-grid">
          <div class="ar-field"><label class="ar-label">退款账号</label><a-input v-model:value="recordForm.receive_account" /></div>
          <div class="ar-field"><label class="ar-label">姓氏</label><a-input v-model:value="recordForm.surname" /></div>
        </div>
        <div v-if="recordMode === 'refund'" class="ar-field">
          <label class="ar-label">退款金额 <span class="required">*</span></label>
          <a-input-number v-model:value="recordForm.amount_cny" style="width:100%" :min="0" :precision="2" placeholder="退款金额" />
        </div>
        <div v-if="recordMode !== 'offset'" class="ar-field">
          <label class="ar-label">{{ recordMode === 'refund' ? '退款对象' : '付款人' }}</label>
          <a-input v-model:value="recordForm.receive_name" placeholder="姓名" />
        </div>
        <div v-if="recordMode !== 'offset'" class="ar-field">
          <label class="ar-label">二维码</label>
          <a-upload v-model:file-list="recordFiles" list-type="picture-card" :before-upload="() => false" accept="image/*,.pdf" :multiple="true" :max-count="5">
            <div v-if="recordFiles.length < 5"><PlusOutlined /><div class="upload-text">上传/粘贴</div></div>
          </a-upload>
        </div>
        <div class="ar-field"><label class="ar-label">账单备注</label><a-textarea v-model:value="recordForm.remark" :rows="2" placeholder="账单备注（可选）" /></div>
      </div>
    </a-modal>
    <a-modal
      :open="supplementDiffOpen"
      title="确认本次结算"
      :footer="null"
      width="980px"
      :confirm-loading="recordSaving || uploading"
      class="settlement-confirm-modal"
      @cancel="handleSettlementConfirmBack"
    >
      <div class="sc-head">{{ settlementConfirmMetaText }}</div>
      <div class="sc-summary">
        <div class="sc-summary-main">
          <template v-if="settlementConfirmPhase === 'offset-source' || recordMode === 'offset'">
            <span>账面抵消 <b>¥{{ offsetSourceSettleTotalUse.toFixed(2) }}</b></span>
          </template>
          <template v-else>
            <span>本次{{ settlementConfirmActionLabel }} <b>{{ settlementConfirmSummary.enteredText }}</b></span>
            <template v-if="pendingOffsetTotalCny > 0">
              <span class="sc-summary-sep">·</span>
              <span>账面抵消 <b>¥{{ pendingOffsetTotalCny.toFixed(2) }}</b></span>
            </template>
          </template>
          <template v-if="showSettleSelectDirection">
            <span class="sc-summary-sep">·</span>
            <span>勾选净需补 <b class="sc-need">{{ settlementConfirmSummary.needText }}</b></span>
            <template v-if="settlementConfirmDiffCny != null">
              <span class="sc-summary-sep">·</span>
              <span>差额 <b :class="moneyClass(settlementConfirmDiffCny)">¥{{ Math.abs(settlementConfirmDiffCny).toFixed(2) }}</b></span>
            </template>
          </template>
        </div>
        <button v-if="showSettleSelectDirection" type="button" class="sc-restore" @click="toggleSettlementRecommend">推荐勾选</button>
      </div>

      <template v-if="showSettleSelectDirection">
      <div class="sc-section-title">【1】勾选方向</div>
      <div v-if="!settlementConfirmGroups.length" class="sc-empty">暂无基础未完成/富余或尾款有欠/有余的数据</div>
      <div v-else class="sc-split">
        <div class="sc-left">
          <div class="sc-pane-title">组维度</div>
          <div
            v-for="group in settlementConfirmGroups"
            :key="group.key"
            class="sc-group"
            :class="{ active: String(group.key) === String(settlementActiveGroupKey) }"
            @click="focusSettlementGroup(group)"
          >
            <a-checkbox
              :checked="groupCheckState(group) === 'checked'"
              :indeterminate="groupCheckState(group) === 'indeterminate'"
              @click.stop
              @change="(checked: any) => onSettlementGroupCheck(group, checkboxChecked(checked))"
            />
            <div class="sc-group-body">
              <div class="sc-group-top">
                <span class="sc-group-title">{{ group.batchNumber }}</span>
                <span class="sc-group-sub">
                  基础入账：{{ basicStatusLabel(group.basicStatus) }}
                  <template v-if="canSelectBasic(group.basicStatus)">
                    <span class="sc-basic-amt">
                      {{ group.basicStatus === 3 ? '富余金额' : '待收金额' }}
                      <b :class="moneyClass(groupBasicSigned(group).cny)">{{ formatMoneyPair(groupBasicSigned(group).cny, groupBasicSigned(group).usd) }}</b>
                    </span>
                  </template>
                </span>
              </div>
              <div class="sc-group-metrics">
                <span>尾款合计 <b :class="moneyClass(groupTailNet(group).cny)">{{ formatMoneyPair(groupTailNet(group).cny, groupTailNet(group).usd) }}</b></span>
                <span>组总差额 <b :class="moneyClass(groupTotalNet(group).cny)">{{ formatMoneyPair(groupTotalNet(group).cny, groupTotalNet(group).usd) }}</b></span>
              </div>
              <div class="sc-group-pick">
                <label
                  v-if="canSelectBasic(group.basicStatus)"
                  class="sc-basic-toggle"
                  @click.stop
                >
                  <a-checkbox
                    :checked="group.basicSelected"
                    @change="(checked: any) => {
                      focusSettlementGroup(group)
                      group.basicSelected = checkboxChecked(checked)
                    }"
                  />
                  <span>{{ group.basicSelected ? '基础款已选' : '基础款未选' }}</span>
                </label>
                <span>已选尾款 {{ groupTailSelectedCount(group) }}/{{ group.tasks.length }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="sc-right">
          <div class="sc-pane-title">{{ activeSettlementGroup?.batchNumber || '-' }} · 任务明细</div>
          <div class="sc-task-head">
            <span class="sc-col-check" />
            <span class="sc-col-task">任务</span>
            <span class="sc-col-status">尾款状态</span>
            <span class="sc-col-amt">尾款差额</span>
          </div>
          <template v-if="activeSettlementGroup">
            <div v-if="!activeSettlementGroup.tasks.length" class="sc-empty-sm">本组无尾款差额任务</div>
            <div v-for="task in activeSettlementGroup.tasks" :key="task.id" class="sc-task-row">
              <a-checkbox
                :checked="task.selected"
                @change="(checked: any) => { task.selected = checkboxChecked(checked) }"
              />
              <div class="sc-task-main">
                <div class="sc-task-no">{{ task.taskNo }}</div>
                <div class="sc-task-asin">{{ task.asin }}</div>
              </div>
              <span class="sc-task-status">{{ task.paymentStatus === 2 ? '有欠款' : '有余款' }}</span>
              <b :class="moneyClass(signedTailAmounts(task.paymentStatus, task.amountCny, task.amountUsd).cny)">
                {{ formatMoneyPair(signedTailAmounts(task.paymentStatus, task.amountCny, task.amountUsd).cny, signedTailAmounts(task.paymentStatus, task.amountCny, task.amountUsd).usd) }}
              </b>
            </div>
          </template>
        </div>
      </div>
      </template>

      <div v-if="showSettleOffsetSourceDirection" class="sc-offset-source-block">
        <div class="sc-section-title">【{{ showSettleSelectDirection ? '2' : '1' }}】抵消来源</div>
        <div v-if="!offsetSourceSettleCards.length" class="sc-empty">暂无抵消来源组</div>
        <div v-else class="sc-split">
          <div class="sc-left">
            <div class="sc-pane-title">来源组</div>
            <div
              v-for="card in offsetSourceSettleCards"
              :key="card.key"
              class="sc-group"
              :class="{ active: String(card.key) === String(activeOffsetSourceKey) }"
              @click="activeOffsetSourceKey = String(card.key)"
            >
              <div class="sc-group-body">
                <div class="sc-group-top">
                  <span class="sc-group-title">{{ card.batchNumber }}</span>
                </div>
                <div class="sc-group-metrics">
                  <span>本次抵消 <b>¥{{ card.offsetUseCny.toFixed(2) }}</b></span>
                </div>
                <div class="sc-offset-after">
                  <template v-if="offsetSourceAfterCleared(card)">
                    调整后 <b class="amount-cleared">已结清</b>
                  </template>
                  <template v-else>
                    调整后
                    <template v-if="card.remainBasicCny > 0.009">
                      基础入账：富余
                      <span class="sc-basic-amt">富余金额 <b class="amount-surplus">¥{{ card.remainBasicCny.toFixed(2) }}</b></span>
                      <span class="sc-summary-sep">·</span>
                    </template>
                    <template v-if="card.remainTailCny > 0.009">
                      尾款 <b class="amount-surplus">有余款 ¥{{ card.remainTailCny.toFixed(2) }}</b>
                    </template>
                    <template v-else>
                      尾款 <b>-</b>
                    </template>
                  </template>
                </div>
              </div>
            </div>
          </div>
          <div class="sc-right">
            <div class="sc-pane-title">{{ activeOffsetSourceCard?.batchNumber || '-' }} · 组汇总</div>
            <div v-if="!activeOffsetSourceCard" class="sc-empty-sm">请选择来源组</div>
            <div v-else class="sc-offset-source-card">
              <div class="sc-offset-source-metrics">
                <span>
                  款项净额
                  <b :class="moneyClass(offsetSourceNetBalance(activeOffsetSourceCard))">
                    ¥{{ Math.abs(offsetSourceNetBalance(activeOffsetSourceCard)).toFixed(2) }}
                  </b>
                </span>
                <span>
                  基础富余
                  <b :class="moneyClass(activeOffsetSourceCard.basicSurplusCny)">
                    ¥{{ Number(activeOffsetSourceCard.basicSurplusCny || 0).toFixed(2) }}
                  </b>
                </span>
                <span>
                  尾款余款
                  <b :class="moneyClass(activeOffsetSourceCard.tailSurplusCny)">
                    ¥{{ Number(activeOffsetSourceCard.tailSurplusCny || 0).toFixed(2) }}
                  </b>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="sc-foot">
        <span v-if="showSettleSelectDirection">已选 {{ settlementConfirmSummary.net.basicCount }} 个基础款项 {{ settlementConfirmSummary.net.taskCount }} 个任务尾款</span>
        <span v-else>来源组 {{ offsetSourceSettleCards.length }} 个 · 账面抵消 ¥{{ offsetSourceSettleTotalUse.toFixed(2) }}</span>
        <div class="sc-foot-actions">
          <a-button @click="handleSettlementConfirmBack">返回修改</a-button>
          <a-button type="primary" :loading="recordSaving || uploading || nestedOffsetSaving" @click="handleSettlementConfirmOk">{{ settlementConfirmOkText }}</a-button>
        </div>
      </div>
    </a-modal>
    <OffsetRecordModal
      v-model:open="directOffsetOpen"
      v-model:draft="offsetDraft"
      v-model:debt-status="recordForm.update_debt_status"
      v-model:debt-amount="recordForm.debt_amount"
      v-model:debt-amount-usd="recordForm.debt_amount_usd"
      v-model:remark="recordForm.remark"
      :countries="countryOptions"
      :review-types="businessTypeOptions"
      :summary="offsetSummaryLine"
      :show-debt-amounts="false"
      :show-debt-status="false"
      :show-flow-categories="true"
      :flow-category-loading="supplementCategoryLoading"
      :flow-primary="offsetFlowPrimaryValue"
      :flow-primary-options="offsetFlowPrimaryOptions"
      :flow-secondary-options="offsetFlowSecondaryOptions"
      v-model:flow-secondary="recordForm.secondary_categories"
      ok-text="保存抵消"
      :confirm-loading="recordSaving || uploading"
      @cancel="handleDirectOffsetCancel"
    >
      <template #footer>
        <div class="offset-record-footer">
          <a-button v-show="false" data-group-offset-log @click="exportOffsetLog">导出日志</a-button>
          <a-button @click="handleDirectOffsetCancel">取消</a-button>
          <span @click.capture="captureOffsetSaveClick">
            <a-button type="primary" :loading="recordSaving || uploading" @click="saveOffsetFromFooter">保存抵消</a-button>
          </span>
        </div>
      </template>
    </OffsetRecordModal>
    <OffsetRecordModal
      v-model:open="nestedOffsetOpen"
      v-model:draft="nestedOffsetDraft"
      v-model:debt-status="nestedDebtStatus"
      v-model:debt-amount="nestedDebtAmount"
      v-model:debt-amount-usd="nestedDebtAmountUsd"
      v-model:remark="nestedRemark"
      :countries="countryOptions"
      :review-types="businessTypeOptions"
      :summary="offsetSummaryLine"
      :show-debt-amounts="false"
      ok-text="加入补款"
      :confirm-loading="nestedOffsetSaving"
      @ok="confirmNestedOffset"
      @cancel="nestedOffsetOpen = false"
    />
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

import { getCommonOptions, searchTaskGroup, uploadCommonFile } from '../prototypeService'
import { getTransactionFlowEnums } from '../prototypeService'
import { parseTransactionFlowCategories, supplementCategoryDefaults, supplementPrimaryCategories, type FlowCategory } from '../transactionFlowCategories'
import {
  createReceiveBillRecord,
  getReceiveList,
  postReceiveBatchBill,
  saveReceiveBillStatus,
} from '../prototypeService'
import { submittedArrearsUsdAmount } from '../billStatusPayload'
import {
  canEditGroupBasicEntry,
  changedGroupStatusOrders,
  groupArrearsInputText,
  groupBasicEntryAmountLabel,
  groupBasicEntryInputValue,
  groupDiffStatusOptions,
  groupStatusEditKey,
} from '../groupBillSave'
import {
  applySettlementAutoSelect,
  buildSettlementConfirmGroups,
  canSelectBasic,
  formatMoneyPair,
  groupCheckState,
  groupTailSelectedCount,
  selectedBasicGroupKeys,
  selectedTaskIdsFromGroups,
  setGroupChecked,
  settlementSummaryText,
  signedBasicAmounts,
  signedTailAmounts,
  type SettlementConfirmGroup,
  type SettlementConfirmMode,
} from '../supplementDiffConfirm'
import {
  buildOffsetSettleDemoSourceCard,
  buildOffsetSettleDemoSourceCards,
  hasOffsetSettleDemoDebtOrder,
  OFFSET_SETTLE_DEMO_SRC_TASK,
  type OffsetSourceSettleCard,
} from '../offsetSourceSettlePreview'
import { readReceiveBillGroups } from '../receiveBillResponse'
import { buildBillCopyText } from './billAmountText'
import OffsetRecordModal from './OffsetRecordModal.vue'
import { cloneOffsetDraft, createOffsetDraft, describeAttachedOffset, prepareOffsetDraft, type OffsetDraft } from './offsetDraft'
import { createGroupOffsetTrace, downloadGroupOffsetLog, groupOffsetErrorLocation, startGroupOffsetLogRetention, type GroupOffsetTrace } from './groupOffsetLog'
import {
  getFirstBill,
  getPaymentDirectionColor,
  getPaymentTypeColor,
  hasRealDebt,
  hasRealSurplus,
  isPaymentCleared,
  mapBillRecords,
} from '../helpers'
import {
  appendPastedImages,
  BASIC_BILLING_STATUS_OPTIONS,
  resolveMarkedBusinessName,
  resolveSupplementPayerName,
} from './billingFormUtils'

const props = defineProps<{
  open: boolean
  groupData: any | null
  groupOrders: any[]
  billData?: any | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated'): void
}>()

const localOrders = ref<any[]>([])
const statusSaving = ref(false)
const savedStatusSnapshot = ref<Record<string, string>>({})
const refreshedBillData = ref<any | null>(null)

/** 组账单基础入账不提供「已完成」；若当前已是已完成则只读展示 */
function groupBillingStatusOptions(order: any) {
  const editable = BASIC_BILLING_STATUS_OPTIONS.filter(item => item.value !== 1).map(item => ({
    ...item,
    disabled: false,
  }))
  if (Number(order?._groupBillingStatus) === 1) {
    return [{ label: '已完成', value: 1, disabled: true }, ...editable]
  }
  return editable
}

const PAYMENT_STATUS_OPTIONS = [
  { label: '无异常', value: 1 },
  { label: '有欠款', value: 2 },
  { label: '有余款', value: 3 },
  { label: '已结清', value: 4 },
]
const DIFF_STATUS_OPTIONS = PAYMENT_STATUS_OPTIONS.filter(item => item.value === 2 || item.value === 3)

const effectiveBillData = computed(() => refreshedBillData.value || props.billData)
const apiTaskBasic = computed(() => effectiveBillData.value?.task_basic || null)
const apiBillPayload = computed(() => readReceiveBillGroups(effectiveBillData.value))
const apiBillTotal = computed(() => apiBillPayload.value.total)
const apiBillOverview = computed(() => apiBillPayload.value.tasks)
const apiFlowLinks = computed(() => Array.isArray(effectiveBillData.value?.flow_links) ? effectiveBillData.value.flow_links : [])
const displayGroupData = computed(() => {
  const taskBasic = apiTaskBasic.value
  if (!taskBasic) return props.groupData
  return {
    ...props.groupData,
    label: props.groupData?.label || props.groupData?.batch_number || apiBillOverview.value[0]?.task_basics_no,
    batch_number: props.groupData?.batch_number || apiBillOverview.value[0]?.task_basics_no,
    customer_name: taskBasic.customer_name,
    employee_name: apiBillPayload.value.groups[0]?.employee_name || props.groupData?.employee_name,
    batch_date: props.groupData?.batch_date,
    order_count: apiBillPayload.value.total?.task_count || apiBillOverview.value.length || props.groupData?.order_count,
  }
})

const groupTitle = computed(() => displayGroupData.value?.label || displayGroupData.value?.batch_number || '')
const groupDrawerTitle = computed(() => apiBillPayload.value.groups.length > 1 ? '组结算工作台' : `组账单：${groupTitle.value || '-'}`)
const expandedGroupKeys = ref<string[]>([])

type GroupBillTableRow = {
  key: string
  batchNumber: string
  taskCount: number
  receivable: unknown
  receivableUsd: number
  collected: unknown
  collectedUsd: number
  offset: unknown
  refunded: unknown
  diff: unknown
  diffUsd: number
  merge: boolean
  customerName: unknown
  orders: any[]
}

function isMixedPaymentOrder(order: any) {
  return String(order?.task_basic?.payment_mode || '') === 'mixed'
}

function sumGroupReceivableUsd(orders: any[]) {
  return orders.reduce((sum, order) => {
    if (!isMixedPaymentOrder(order)) return sum
    const amount = Number(order?.task_usd_amount || 0)
    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)
}

function sumGroupCollectedUsd(orders: any[]) {
  return orders.reduce((sum, order) => {
    if (!isMixedPaymentOrder(order)) return sum
    const amount = Number(order?.task_basic?.actual_usd_amount || 0)
    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)
}

function signedOrderDiffUsd(order: any) {
  if (!isMixedPaymentOrder(order)) return 0
  const payment = Number(order?._groupPaymentStatus ?? order?.bill?.[0]?.payment_status ?? order?.payment_status ?? 1)
  const amount = Number(order?._groupArrearsUsd ?? order?.arrears_usd_amount ?? order?.bill?.[0]?.arrears_usd_amount ?? 0)
  if (!Number.isFinite(amount) || Math.abs(amount) < 0.0005) return 0
  if (payment === 2) return -Math.abs(amount)
  if (payment === 3) return Math.abs(amount)
  return 0
}

function sumGroupDiffUsd(orders: any[]) {
  return orders.reduce((sum, order) => sum + signedOrderDiffUsd(order), 0)
}

const billGroupRows = computed((): GroupBillTableRow[] => apiBillPayload.value.groups.map((group: any) => {
  const orders = (Array.isArray(group.tasks) ? group.tasks : [group])
    .map((task: any) => localOrders.value.find(item => String(item.id) === String(task.id)))
    .filter(Boolean)
  return {
    key: String(group.task_basics_no || group.task_basic_id || group.task_no || group.id),
    batchNumber: group.task_basics_no || group.task_no || '-',
    taskCount: group.task_count ?? (Array.isArray(group.tasks) ? group.tasks.length : 1),
    receivable: group.actual_receivable_amount,
    receivableUsd: sumGroupReceivableUsd(orders),
    collected: group.income_flow_amount,
    collectedUsd: sumGroupCollectedUsd(orders),
    offset: group.offset_amount,
    refunded: group.refund_amount,
    diff: group.pending_settlement_diff,
    diffUsd: sumGroupDiffUsd(orders),
    merge: Number(group.is_merge_operation) === 1,
    customerName: group.employee_name,
    orders,
  }
}))
const showGroupRefundColumn = computed(() =>
  Number(apiBillTotal.value?.refund_amount || 0) > 0
  || billGroupRows.value.some(group => Number(group.refunded || 0) > 0)
)
const groupTotalsMerged = computed(() => billGroupRows.value.some(group => group.merge))
const groupTableTotals = computed(() => billGroupRows.value.reduce((acc, group) => {
  if (group.merge) return acc
  return {
    receivableUsd: acc.receivableUsd + Number(group.receivableUsd || 0),
    collectedUsd: acc.collectedUsd + Number(group.collectedUsd || 0),
    diffUsd: acc.diffUsd + Number(group.diffUsd || 0),
  }
}, { receivableUsd: 0, collectedUsd: 0, diffUsd: 0 }))
/** 仅未完成/富余显示待收或富余金额列文案；已完成不展示金额 */
const showGroupBasicEntryAmountColumns = computed(() =>
  localOrders.value.some(order => canEditGroupBasicEntry(order))
)

function showBasicEntryUsdInput(order: any) {
  return isMixedPaymentOrder(order) || hasGroupUsd(order?._groupBasicEntryUsd)
}

function showDebtUsdInput(order: any) {
  const usdText = String(order?._groupArrearsUsd ?? '').trim()
  return isMixedPaymentOrder(order) || !!usdText
}

function formatGroupMoney(value: unknown) {
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
}

function hasGroupUsd(value: unknown) {
  const amount = Number(value || 0)
  return Number.isFinite(amount) && Math.abs(amount) > 0.0005
}

function formatGroupDiff(value: unknown) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount) || Math.abs(amount) < 0.005) return '¥0.00'
  if (amount > 0) return `+¥${amount.toFixed(2)}`
  return `-¥${Math.abs(amount).toFixed(2)}`
}

function formatGroupDiffUsd(value: unknown) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount) || Math.abs(amount) < 0.0005) return ''
  if (amount > 0) return `+$${amount.toFixed(2)}`
  return `-$${Math.abs(amount).toFixed(2)}`
}

function isGroupExpanded(key: string) {
  return expandedGroupKeys.value.includes(key)
}

function toggleGroup(key: string) {
  expandedGroupKeys.value = isGroupExpanded(key)
    ? expandedGroupKeys.value.filter(item => item !== key)
    : [...expandedGroupKeys.value, key]
}

function canEditGroupDebt(order: any) {
  return [2, 3].includes(Number(order?._groupPaymentStatus))
}

function settleCopyOrders() {
  return billGroupRows.value.flatMap(group => group.orders.map((order: any) => ({
    created_at: order.created_at,
    asin: order.asin || order.product?.asin,
    payment_status: order.bill?.[0]?.payment_status ?? order.payment_status ?? order._groupPaymentStatus,
    arrears_amount: order.bill?.[0]?.arrears_amount ?? order.arrears_amount,
    arrears_usd_amount: order.arrears_usd_amount ?? order.bill?.[0]?.arrears_usd_amount,
  })))
}

const settleBillSourceText = computed(() => buildBillCopyText(settleCopyOrders()))

async function copyBillText(text: string) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('copy-failed')
}

async function copySettleBill() {
  const text = settleBillSourceText.value.trim()
  if (!text) {
    message.warning('没有欠款数据可复制')
    return
  }
  try {
    await copyBillText(text)
    message.success('账单已复制到剪贴板')
  } catch {
    message.error('复制失败，请手动复制')
  }
}

watch(() => billGroupRows.value.map(group => group.key).join('|'), (signature) => {
  const keys = signature ? signature.split('|') : []
  expandedGroupKeys.value = expandedGroupKeys.value.filter(key => keys.includes(key))
}, { immediate: true })

watch(
  () => [props.groupOrders, props.billData, refreshedBillData.value] as const,
  ([orders]) => {
    localOrders.value = apiBillOverview.value.length
      ? apiBillOverview.value.map((order: any) => normalizeApiOverviewOrder(order))
      : orders.map(order => normalizeGroupOrder(order))
    rememberStatusSnapshot(localOrders.value)
  },
  { immediate: true, deep: true },
)

function taskBill(order: any) {
  if (Array.isArray(order?.bill) && order.bill.length) return order.bill
  if (order?.basic_bill_status === undefined && order?.payment_status === undefined && order?.arrears_amount === undefined) return []
  return [{
    basic_bill_status: order.basic_bill_status,
    basic_bill_status_label: order.basic_bill_status_label,
    payment_status: order.payment_status,
    payment_status_label: order.payment_status_label,
    arrears_amount: order.arrears_amount,
    arrears_usd_amount: order.arrears_usd_amount,
  }]
}

function normalizeApiOverviewOrder(order: any) {
  const sourceOrder = props.groupOrders.find(item => String(item.id) === String(order.id)) || {}
  const bill = taskBill(order)
  return {
    ...sourceOrder,
    id: String(order.id),
    task_no: order.task_no,
    created_at: order.created_at || sourceOrder.created_at,
    finished_at: sourceOrder.finished_at || order.created_at || sourceOrder.created_at,
    status: sourceOrder.status ?? order.status,
    status_label: sourceOrder.status_label || order.status_label,
    product: { asin: order.asin || sourceOrder.product?.asin },
    task_basic: {
      ...(sourceOrder.task_basic || {}),
      id: order.task_basic_id ?? sourceOrder.task_basic?.id,
      task_basics_no: order.task_basics_no ?? sourceOrder.task_basic?.task_basics_no,
      basic_entry_amount_cny: sourceOrder.task_basic?.basic_entry_amount_cny,
      basic_entry_amount_usd: sourceOrder.task_basic?.basic_entry_amount_usd,
    },
    bill,
    arrears_usd_amount: order.arrears_usd_amount,
    _groupArrearsUsd: groupArrearsInputText(order.arrears_usd_amount),
    _baseReceivable: Number(order.base_receivable_amount || 0),
    _actualReceivable: Number(order.actual_receivable_amount || 0),
    _settledAmount: Number(order.settled_amount || 0),
    _groupBillingStatus: deriveBillingStatusFromBill(bill),
    _groupPaymentStatus: derivePaymentStatusFromBill(bill),
    _groupArrearsAmount: getBillArrearsAmount(bill),
    _groupBasicEntryCny: groupBasicEntryInputValue(sourceOrder.task_basic?.basic_entry_amount_cny),
    _groupBasicEntryUsd: groupBasicEntryInputValue(sourceOrder.task_basic?.basic_entry_amount_usd),
  }
}

function normalizeGroupOrder(order: any) {
  const bill = getFirstBill(order)
  return {
    ...order,
    _groupBillingStatus: Number(bill?.basic_bill_status || deriveBillingStatusFromBill(bill)),
    _groupPaymentStatus: Number(bill?.payment_status || derivePaymentStatus(order)),
    _groupArrearsAmount: getBillArrearsAmount(bill),
    _groupBasicEntryCny: groupBasicEntryInputValue(order.task_basic?.basic_entry_amount_cny),
    _groupBasicEntryUsd: groupBasicEntryInputValue(order.task_basic?.basic_entry_amount_usd),
  }
}

function normalizeBillList(bill: any) {
  if (Array.isArray(bill)) return bill
  if (bill && typeof bill === 'object') return [bill]
  return bill === undefined || bill === null || bill === '' ? [] : [bill]
}

function readBillLabels(bill: any) {
  return normalizeBillList(bill).flatMap((item) => {
    if (!item || typeof item !== 'object') return [String(item || '')]
    return [
      String(item.basic_bill_status_label || ''),
      String(item.payment_status_label || ''),
    ]
  })
}

function deriveBillingStatusFromBill(bill: any) {
  const billList = normalizeBillList(bill)
  const status = billList
    .map(item => Number(item?.basic_bill_status))
    .find(value => value === 1 || value === 2 || value === 3)
  if (status) return status

  const labels = readBillLabels(bill)
  if (labels.some(label => label.includes('富余'))) return 3
  return labels.some(label => label.includes('未完成')) ? 2 : 1
}

function derivePaymentStatusFromBill(bill: any) {
  const billList = normalizeBillList(bill)
  const status = billList
    .map(item => Number(item?.payment_status))
    .find(value => [1, 2, 3, 4].includes(value))
  if (status) return status

  const labels = readBillLabels(bill)
  if (labels.some(label => label.includes('欠款') || label.includes('需补'))) return 2
  if (labels.some(label => label.includes('退款') || label.includes('应退') || label.includes('需退') || label.includes('溢收') || label.includes('余款'))) return 3
  if (labels.some(label => label.includes('结清'))) return 4
  return 1
}

function getBillArrearsAmount(bill: any) {
  const amount = normalizeBillList(bill)
    .map(item => Math.abs(Number(item?.arrears_amount || 0)))
    .find(value => value > 0)
  return amount ?? null
}

function derivePaymentStatus(order: any) {
  if (hasRealDebt(order)) return 2
  if (hasRealSurplus(order)) return 3
  if (isPaymentCleared(order)) return 4
  return 1
}

function getBillRecords(order: any) {
  const records = order?.bill_details?.bill_record
  if (!Array.isArray(records)) return []
  return mapBillRecords(records, Number(order?.exchange_rate || 1))
}

function getPaymentDirection(payment: any) {
  const type = payment.payment_type || ''
  if (type === '退款') return '支出'
  if (type === '账面抵消') return '账面抵消'
  return '收入'
}

const displayGroupPayments = computed<any[]>(() =>
  apiFlowLinks.value.length
    ? apiFlowLinks.value.map((flow: any) => ({
      id: String(flow.flow_id || flow.flow_no),
      amount_cny: Number(flow.cny_amount || flow.offset_amount || flow.signed_cny_amount || 0),
      payment_date: flow.payment_date || flow.created_at || '',
      payment_method: mapTransferChannel(flow.transfer_channel),
      payment_type: flow.transaction_type_label || flow.flow_type_label || '流水',
      direction: flow.direction_label || mapDirection(flow.direction),
      flow_no: flow.flow_no,
      finance_remark: flow.finance_remark,
    }))
    : localOrders.value.flatMap(order =>
      getBillRecords(order).map((record: any) => ({
        ...record,
        direction: getPaymentDirection(record),
        flow_no: undefined,
        finance_remark: undefined,
      })),
    ),
)

const pendingDiffOrderCount = computed(() =>
  localOrders.value.filter(order =>
    [2, 3].includes(Number(order._groupPaymentStatus))
    && Number(order._groupArrearsAmount || 0) > 0.005,
  ).length,
)
function mapDirection(direction: any) {
  const value = Array.isArray(direction) ? Number(direction[0]) : Number(direction)
  if (value === 2) return '支出'
  if (value === 3) return '账面抵消'
  return '收入'
}

function mapTransferChannel(value: any) {
  const map: Record<number, string> = { 1: '银行转账', 2: '支付宝', 3: '微信支付', 4: 'PayPal', 5: '其他' }
  return map[Number(value)] || ''
}

async function saveOrderStatus(order: any) {
  const bill = getFirstBill(order)
  const hasIssue = Number(order._groupPaymentStatus) === 2 || Number(order._groupPaymentStatus) === 3
  const actualReceivable = order.actual_receivable_amount
    ?? order._actualReceivable
    ?? order.bill_details?.actual_receivable_amount
    ?? bill?.actual_receivable_amount
    ?? 0
  const canEditEntry = canEditGroupBasicEntry(order)
  const response = await saveReceiveBillStatus({
    task_id: Number(order.id),
    actual_receivable_amount: String(Number(actualReceivable || 0).toFixed(2)),
    basic_bill_status: Number(order._groupBillingStatus || 1),
    payment_status: Number(order._groupPaymentStatus || 1),
    arrears_amount: hasIssue ? String(Number(order._groupArrearsAmount || 0).toFixed(2)) : '0',
    arrears_usd_amount: hasIssue ? String(order._groupArrearsUsd ?? '').trim() : 0,
    remark: hasIssue ? (bill?.remark || '') : '',
    marked_business: hasIssue ? resolveMarkedBusinessName(order) : '',
    basic_entry_amount_cny: canEditEntry ? Number(order._groupBasicEntryCny || 0) : 0,
    basic_entry_amount_usd: canEditEntry ? Number(order._groupBasicEntryUsd || 0) : 0,
  })
  if (response.code !== 200) throw new Error(response.msg || response.message || '保存失败')
}

function statusEditKey(order: any) {
  return groupStatusEditKey(order)
}

function rememberStatusSnapshot(orders: any[]) {
  const next: Record<string, string> = {}
  orders.forEach((order) => {
    next[String(order.id)] = statusEditKey(order)
  })
  savedStatusSnapshot.value = next
}

function dirtyStatusOrders() {
  return changedGroupStatusOrders(localOrders.value, savedStatusSnapshot.value)
}

function onGroupPaymentStatusChange(order: any) {
  if (![2, 3].includes(Number(order._groupPaymentStatus))) {
    order._groupArrearsAmount = null
    order._groupArrearsUsd = ''
  }
}

function onGroupBillingStatusChange(order: any) {
  const basicId = order?.task_basic_id ?? order?.task_basic?.id
  const status = Number(order._groupBillingStatus || 1)
  // 基础入账为组级：改一行同步同组状态，表头才能跟着变成待收/富余金额
  if (basicId != null) {
    localOrders.value.forEach((item) => {
      const itemBasicId = item?.task_basic_id ?? item?.task_basic?.id
      if (String(itemBasicId) !== String(basicId)) return
      item._groupBillingStatus = status
    })
  }
  if (!canEditGroupBasicEntry(order)) {
    order._groupBasicEntryCny = null
    order._groupBasicEntryUsd = null
    syncGroupBasicEntry(order)
  }
}

/** 待收/富余为组级金额：改一行同步同组其它行 */
function syncGroupBasicEntry(order: any) {
  const basicId = order?.task_basic_id ?? order?.task_basic?.id
  if (basicId == null) return
  const cny = order._groupBasicEntryCny
  const usd = order._groupBasicEntryUsd
  localOrders.value.forEach((item) => {
    const itemBasicId = item?.task_basic_id ?? item?.task_basic?.id
    if (String(itemBasicId) !== String(basicId)) return
    item._groupBasicEntryCny = cny
    item._groupBasicEntryUsd = usd
    if (item.task_basic) {
      item.task_basic.basic_entry_amount_cny = Number(cny || 0)
      item.task_basic.basic_entry_amount_usd = Number(usd || 0)
    }
  })
}

async function saveStatusEdits() {
  const dirty = dirtyStatusOrders()
  if (!dirty.length) {
    message.warning('没有需要保存的修改')
    return
  }
  for (const order of dirty) {
    const hasIssue = [2, 3].includes(Number(order._groupPaymentStatus))
    if (hasIssue && !String(order._groupArrearsUsd ?? '').trim()) {
      message.warning('请填写欠款金额(美元)')
      return
    }
  }
  statusSaving.value = true
  try {
    for (const order of dirty) await saveOrderStatus(order)
    rememberStatusSnapshot(localOrders.value)
    message.success('修改已保存')
    emit('updated')
  } catch (error: any) {
    message.error(error?.message || '保存失败')
  } finally {
    statusSaving.value = false
  }
}

type RecordMode = 'supplement' | 'refund' | 'offset'
type AllocRow = {
  taskId: number
  taskNo: string
  amount: number | undefined
  hint: string
  hintType: string
}
type CountryOption = { id: number; country: string }
type PendingOffset = {
  fields: {
    offset_type: 1 | 2
    surplus_type?: number[]
    offset_details?: { surplus_type: 1 | 2; country_id: number; review_type: string; quantity: number }[]
  }
  offsetBasics: { task_basic_id: number; amount: number }[]
  totalAmount: number
  sourceText: string
  detailText: string
  draft: OffsetDraft
  /** 仅演示例：确认弹窗展示被抵消来源组汇总 */
  previewSourceCards?: OffsetSourceSettleCard[]
}

const recordModalOpen = ref(false)
const recordSaving = ref(false)
const uploading = ref(false)
const recordMode = ref<RecordMode>('supplement')
const supplementDiffOpen = ref(false)
const supplementRecordSubmitted = ref(false)
const settlementConfirmGroups = ref<SettlementConfirmGroup[]>([])
const settlementActiveGroupKey = ref('')
const settlementRecommendSnapshot = ref<SettlementConfirmGroup[]>([])
const settlementEnteredCny = ref(0)
const settlementEnteredUsd = ref(0)

const activeSettlementGroup = computed(() => {
  const key = String(settlementActiveGroupKey.value || '')
  const matched = settlementConfirmGroups.value.find(group => String(group.key) === key)
  return matched || settlementConfirmGroups.value[0] || null
})
const settlementHasAnySelected = computed(() =>
  settlementConfirmGroups.value.some(group =>
    group.basicSelected || group.tasks.some(task => task.selected),
  ),
)
const settlementConfirmMode = computed<SettlementConfirmMode>(() => recordMode.value)
const settlementConfirmActionLabel = computed(() => ({
  supplement: '补款',
  refund: '退款',
  offset: '抵消',
}[settlementConfirmMode.value]))
const settlementConfirmPhase = ref<'submit' | 'offset-source'>('submit')
const nestedOffsetStaging = ref<PendingOffset | null>(null)
const activeOffsetSourceKey = ref('')
const settlementConfirmOkText = computed(() => {
  if (settlementConfirmPhase.value === 'offset-source') return '确认抵消来源'
  return ({
    supplement: '确认录入补款',
    refund: '确认提交退款',
    offset: '确认账面抵消',
  }[settlementConfirmMode.value])
})
const settlementConfirmMetaText = computed(() => {
  if (settlementConfirmPhase.value === 'offset-source') {
    const cards = offsetSourceSettleCards.value
    const companies = Array.from(new Set(cards.map(card => String(card.customerName || '').trim()).filter(Boolean)))
    const companyName = companies[0] || displayGroupData.value?.customer_name || '-'
    const customerCount = Math.max(1, companies.length)
    return `${companyName} · ${customerCount} 个客户 · ${cards.length} 个组`
  }
  const companies = Array.from(new Set(
    settlementConfirmGroups.value.map(group => String(group.customerName || '').trim()).filter(Boolean),
  ))
  const companyName = displayGroupData.value?.customer_name
    || companies[0]
    || '-'
  const confirmGroupKeys = new Set(settlementConfirmGroups.value.map(group => String(group.key)))
  const customerNames = Array.from(new Set(
    localOrders.value
      .filter((order) => {
        const key = String(order?.task_basic_id ?? order?.task_basic?.id ?? order?.task_basic?.task_basics_no ?? order?.id)
        return confirmGroupKeys.has(key)
      })
      .map(order => String(order?.employee?.name || order?.customer?.name || order?.task_basic?.employee_name || '').trim())
      .filter(Boolean),
  ))
  const customerCount = customerNames.length || Math.max(1, companies.length)
  const groupCount = settlementConfirmGroups.value.length
  return `${companyName} · ${customerCount} 个客户 · ${groupCount} 个组`
})
const settlementConfirmSummary = computed(() =>
  settlementSummaryText(settlementConfirmGroups.value, settlementEnteredCny.value, settlementEnteredUsd.value),
)
/** 补款(+抵消) 或纯抵消 与勾选净需补不一致时的差额（cover − need） */
const settlementConfirmDiffCny = computed(() => {
  if (!showSettleSelectDirection.value) return null
  const needCny = -Math.min(0, Number(settlementConfirmSummary.value.net?.cny || 0))
  let coverCny = 0
  if (recordMode.value === 'offset') {
    coverCny = Number(offsetSourceSettleTotalUse.value || 0)
  } else if (recordMode.value === 'supplement') {
    coverCny = Number(settlementEnteredCny.value || 0) + Number(pendingOffsetTotalCny.value || 0)
  } else if (recordMode.value === 'refund') {
    coverCny = Number(settlementEnteredCny.value || 0)
  }
  const diff = Number((coverCny - needCny).toFixed(2))
  return Math.abs(diff) > 0.009 ? diff : null
})
const directOffsetPreviewCards = ref<OffsetSourceSettleCard[]>([])
const offsetSourceSettleCards = computed(() => {
  if (settlementConfirmPhase.value === 'offset-source') {
    return nestedOffsetStaging.value?.previewSourceCards || []
  }
  if (recordMode.value === 'offset') {
    if (directOffsetPreviewCards.value.length) return directOffsetPreviewCards.value
    if (hasOffsetSettleDemoDebtOrder(localOrders.value)) {
      return buildOffsetSettleDemoSourceCards(200)
    }
    return []
  }
  // 最终录入补款确认：来源明细已在「加入补款」确认过，这里不再展示
  return []
})
const offsetSourceSettleTotalUse = computed(() => {
  if (settlementConfirmPhase.value === 'offset-source') {
    return Number(nestedOffsetStaging.value?.totalAmount || 0)
  }
  if (recordMode.value === 'offset') {
    return offsetSourceSettleCards.value.reduce((sum, card) => sum + Number(card.offsetUseCny || 0), 0)
  }
  return Number(pendingOffset.value?.totalAmount || 0)
})
const pendingOffsetTotalCny = computed(() => Number(pendingOffset.value?.totalAmount || 0))
const activeOffsetSourceCard = computed(() => {
  const key = String(activeOffsetSourceKey.value || '')
  return offsetSourceSettleCards.value.find(card => String(card.key) === key) || offsetSourceSettleCards.value[0] || null
})
/** 款项净额：净值（展示为正数绝对值）；基础富余/尾款余款各自可正可负，不与净值符号绑定 */
function offsetSourceNetBalance(card: OffsetSourceSettleCard | null | undefined) {
  if (!card) return 0
  return Number((Number(card.basicSurplusCny || 0) + Number(card.tailSurplusCny || 0)).toFixed(2))
}
function offsetSourceAfterCleared(card: OffsetSourceSettleCard | null | undefined) {
  return Number(card?.remainTotalCny || 0) <= 0.009
}
/** 纯抵消 / 纯补款最终确认 / 退款：展示勾选方向；「加入补款」来源确认阶段不展示 */
const showSettleSelectDirection = computed(() => settlementConfirmPhase.value !== 'offset-source')
/** 纯抵消：展示来源明细；补款内「加入补款」阶段展示来源明细；最终补款确认不展示明细 */
const showSettleOffsetSourceDirection = computed(() => {
  if (settlementConfirmPhase.value === 'offset-source') return offsetSourceSettleCards.value.length > 0
  if (recordMode.value === 'offset') return offsetSourceSettleCards.value.length > 0
  return false
})
const recordFiles = ref<any[]>([])
const pendingOffset = ref<PendingOffset | null>(null)
const directOffsetOpen = ref(false)
const nestedOffsetOpen = ref(false)
const nestedOffsetSaving = ref(false)
const nestedOffsetDraft = ref(createOffsetDraft())
const nestedDebtStatus = ref<string | null>(null)
const nestedDebtAmount = ref<number | null>(null)
const nestedDebtAmountUsd = ref('')
const nestedRemark = ref('')
const countryOptions = ref<CountryOption[]>([])
const allocRows = ref<AllocRow[]>([])
const businessTypeOptions = [
  { label: '文字', value: 'words' },
  { label: '免评', value: 'free_review' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: 'Feedback', value: 'feedback' },
]
const supplementCategories = ref<FlowCategory[]>([])
const supplementCategoryLoading = ref(false)
const categoryOptions = [
  { value: '业务收入', label: '业务收入', children: [{ value: '任务收入', label: '任务收入' }, { value: '补款收入', label: '补款收入' }] },
  { value: '业务支出', label: '业务支出', children: [{ value: '截单退款', label: '截单退款' }, { value: '退佣金', label: '退佣金' }, { value: '退本金差价', label: '退本金差价' }] },
  { value: '其他收入', label: '其他收入', children: [{ value: '其他收入', label: '其他收入' }] },
  { value: '其他支出', label: '其他支出', children: [{ value: '其他支出', label: '其他支出' }] },
]
const recordForm = ref(createRecordForm('supplement'))
const offsetDraft = ref(createOffsetDraft())

function createRecordForm(mode: RecordMode) {
  return {
    primary_category: (mode === 'refund' ? '业务支出' : mode === 'supplement' ? '' : '业务收入') as string | number,
    secondary_categories: [] as Array<string | number>,
    currency_mode: 'cny' as 'cny' | 'usd' | 'both',
    amount_cny: undefined as number | undefined,
    amount_usd: undefined as number | undefined,
    offset_type: undefined as 1 | 2 | 3 | undefined,
    offset_task_rows: [{ task_id: '', amount: undefined as number | undefined }],
    business_rows: [{ country_id: undefined as number | undefined, review_type: '', quantity: undefined as number | undefined }],
    payment_date: dayjs().format('YYYY-MM-DD'),
    payment_method: mode === 'offset' ? '账面抵消' : mode === 'refund' ? '' : '银行转账',
    receive_account: '',
    surname: '',
    receive_name: resolveSupplementPayerName(displayGroupData.value),
    remark: '',
    update_debt_status: null as string | null,
    debt_amount: null as number | null,
    debt_amount_usd: '',
  }
}

function buildAllocRows(orders: any[]): AllocRow[] {
  return orders.map((order) => {
    const bill = getFirstBill(order)
    const paymentStatus = Number(order._groupPaymentStatus || bill?.payment_status || 1)
    const arrears = Math.abs(Number(order._groupArrearsAmount ?? bill?.arrears_amount ?? 0))
    const isDebt = paymentStatus === 2 && arrears > 0
    const isRefund = paymentStatus === 3 && arrears > 0
    return {
      taskId: Number(order.id),
      taskNo: String(order.task_no || order.id),
      amount: isDebt ? arrears : isRefund ? -arrears : undefined,
      hint: isDebt ? `欠款 +¥${arrears.toFixed(2)}` : isRefund ? `溢收 -¥${arrears.toFixed(2)}` : '欠款/余款：无',
      hintType: isDebt ? 'hint-owed' : isRefund ? 'hint-surplus' : 'hint-none',
    }
  })
}

const activeAllocRows = computed(() => allocRows.value.filter(row =>
  recordMode.value === 'refund' ? Number(row.amount || 0) < 0 : Number(row.amount || 0) > 0,
))
const activeAllocTotal = computed(() => activeAllocRows.value.reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0))
const showSupplementCny = computed(() => recordMode.value === 'supplement' && recordForm.value.currency_mode !== 'usd')
const showSupplementUsd = computed(() => recordMode.value === 'supplement' && recordForm.value.currency_mode !== 'cny')

function calcAllocSettlement(rows: AllocRow[]) {
  const active = rows.filter(row => Math.abs(Number(row.amount || 0)) > 0.005)
  let owedTotal = 0
  let refundTotal = 0
  active.forEach((row) => {
    const amount = Number(row.amount || 0)
    if (amount > 0) owedTotal += amount
    else refundTotal += Math.abs(amount)
  })
  const netRefund = Number((refundTotal - owedTotal).toFixed(2))
  const netSupplement = Number((owedTotal - refundTotal).toFixed(2))
  return {
    rows: active,
    count: active.length,
    owedTotal: Number(owedTotal.toFixed(2)),
    refundTotal: Number(refundTotal.toFixed(2)),
    netRefund: netRefund > 0.005 ? netRefund : 0,
    netSupplement: netSupplement > 0.005 ? netSupplement : 0,
  }
}

const allocSettlement = computed(() => calcAllocSettlement(allocRows.value))
const offsetSummaryLine = computed(() => `本次账面抵消 ${activeAllocRows.value.length} 个任务，合计 ¥${activeAllocTotal.value.toFixed(2)}`)
const recordSummaryLine = computed(() => {
  if (recordMode.value !== 'refund') return ''
  const settlement = allocSettlement.value
  return `本次退款 ${settlement.count} 个任务，合计 ¥${settlement.netRefund.toFixed(2)}`
})
const recordModalTitle = computed(() => ({ supplement: '录入补款', refund: '提交退款', offset: '录入账面抵消' })[recordMode.value])
const recordModalOkText = computed(() => {
  return ({ supplement: '录入补款', refund: '提交退款', offset: '保存抵消' })[recordMode.value]
})
const refundDetailsRequired = computed(() =>
  recordMode.value === 'refund'
  && recordForm.value.secondary_categories.includes('截单退款'),
)
const refundDetailsOptional = computed(() =>
  recordMode.value === 'refund'
  && recordForm.value.secondary_categories.length > 0
  && !refundDetailsRequired.value,
)
const primaryOptions = computed(() => {
  if (recordMode.value === 'supplement') return supplementPrimaryCategories(supplementCategories.value)
  return categoryOptions.filter(item =>
    recordMode.value === 'refund' ? item.value === '业务支出' : ['业务收入', '其他收入'].includes(item.value),
  )
})
const offsetFlowPrimaryOptions = computed(() => supplementPrimaryCategories(supplementCategories.value))
const offsetFlowPrimary = computed(() => offsetFlowPrimaryOptions.value.find(item => item.label === '业务收入'))
const offsetFlowPrimaryValue = computed(() => offsetFlowPrimary.value?.value)
const offsetFlowSecondaryOptions = computed(() => offsetFlowPrimary.value?.children || [])
const secondaryOptions = computed(() => primaryOptions.value.find(item => item.value === recordForm.value.primary_category)?.children || [])

watch(
  localOrders,
  (orders) => {
    allocRows.value = buildAllocRows(orders)
  },
  { immediate: true, deep: true },
)

watch(
  () => props.billData,
  () => {
    refreshedBillData.value = null
  },
)

async function loadCountryOptions() {
  if (countryOptions.value.length) return
  try {
    const response = await getCommonOptions({ types: 'country' })
    if (response.code !== 200) throw new Error(response.msg || response.message || '获取国家列表失败')
    const source = Array.isArray(response.data?.country) ? response.data.country : []
    countryOptions.value = source
      .map((item: any) => ({ id: Number(item.id ?? item.value), country: String(item.country ?? item.name ?? item.label ?? '') }))
      .filter((item: CountryOption) => item.id > 0 && item.country)
  } catch (error) {
    console.error('获取国家选项失败:', error)
  }
}

async function loadSupplementCategories() {
  supplementCategoryLoading.value = true
  try {
    const response = await getTransactionFlowEnums()
    if (response.code !== 200) throw new Error(response.msg || response.message || '获取分类失败')
    supplementCategories.value = parseTransactionFlowCategories(response.data)
    const income = supplementCategoryDefaults(supplementCategories.value)
    if (recordMode.value === 'offset') {
      recordForm.value.primary_category = income.primary
      if (hasOffsetSettleDemoDebtOrder(localOrders.value)) {
        const incomeCat = supplementPrimaryCategories(supplementCategories.value).find(item => item.label === '业务收入')
        const firstChild = incomeCat?.children?.[0]
        recordForm.value.secondary_categories = firstChild ? [firstChild.value] : []
      } else {
        recordForm.value.secondary_categories = []
      }
      return
    }
    if (recordMode.value !== 'supplement' || recordForm.value.primary_category !== '') return
    recordForm.value.primary_category = income.primary
    recordForm.value.secondary_categories = []
  } catch (error: any) {
    message.error(error?.message || '获取分类失败')
  } finally {
    supplementCategoryLoading.value = false
  }
}

function onPrimaryCategoryChange() {
  recordForm.value.secondary_categories = recordForm.value.secondary_categories.filter(value =>
    secondaryOptions.value.some(item => item.value === value),
  )
}

function addBusinessRow() {
  recordForm.value.business_rows.push({ country_id: undefined, review_type: '', quantity: undefined })
}
function removeBusinessRow(index: number) {
  if (index === 0 || recordForm.value.business_rows.length <= 1) return
  recordForm.value.business_rows.splice(index, 1)
}

function openRecordModal(mode: RecordMode) {
  if (mode === 'offset') createGroupOffsetTrace()('openRecordModal:direct-offset')
  recordMode.value = mode
  resetNestedOffsetState()
  recordFiles.value = []
  recordForm.value = createRecordForm(mode)
  if (mode === 'offset') {
    offsetDraft.value = createOffsetDraft()
    directOffsetPreviewCards.value = []
    directOffsetOpen.value = true
    seedDirectOffsetDemoIfNeeded()
    void loadCountryOptions()
    void loadSupplementCategories()
    return
  }
  recordForm.value.business_rows = [{ country_id: undefined, review_type: '', quantity: undefined }]
  recordModalOpen.value = true
  if (mode === 'supplement') {
    supplementRecordSubmitted.value = false
    closeSupplementDiff()
    seedOffsetSettleDemoIfNeeded()
    void loadSupplementCategories()
  } else void loadCountryOptions()
}

/** 仅 RM-TOP-DEBT：预填补款金额；抵消需点「账面抵消 → 加入补款」确认来源 */
function seedOffsetSettleDemoIfNeeded(options?: { silent?: boolean }) {
  if (!hasOffsetSettleDemoDebtOrder(localOrders.value)) return false
  recordForm.value.currency_mode = 'cny'
  if (!(Number(recordForm.value.amount_cny) > 0)) {
    recordForm.value.amount_cny = 100
  }
  recordForm.value.amount_usd = undefined
  if (!options?.silent && !pendingOffset.value) {
    message.info('演示：点「账面抵消」填写后「加入补款」，先确认来源；再点录入补款看勾选确认')
  }
  return true
}

function seedNestedOffsetDemoIfNeeded() {
  if (!hasOffsetSettleDemoDebtOrder(localOrders.value)) return false
  if (pendingOffset.value?.draft) {
    nestedOffsetDraft.value = cloneOffsetDraft(pendingOffset.value.draft)
    return true
  }
  nestedOffsetDraft.value = {
    type: 1,
    surplusTypes: [1, 2],
    sources: [{ task_id: OFFSET_SETTLE_DEMO_SRC_TASK, amount: 200 }],
    details: {
      1: [{ country_id: 1, review_type: 'words', quantity: 1 }],
      2: [{ country_id: 1, review_type: 'words', quantity: 1 }],
    },
  }
  return true
}

/** 仅 RM-TOP-DEBT：预填纯账面抵消草稿 + 多组来源汇总 */
function seedDirectOffsetDemoIfNeeded(options?: { silent?: boolean }) {
  if (!hasOffsetSettleDemoDebtOrder(localOrders.value)) return false
  const cards = buildOffsetSettleDemoSourceCards(200)
  offsetDraft.value = {
    type: 1,
    surplusTypes: [1, 2],
    sources: [{ task_id: OFFSET_SETTLE_DEMO_SRC_TASK, amount: 200 }],
    details: {
      1: [{ country_id: 1, review_type: 'words', quantity: 1 }],
      2: [{ country_id: 1, review_type: 'words', quantity: 1 }],
    },
  }
  directOffsetPreviewCards.value = cards
  activeOffsetSourceKey.value = String(cards[0]?.key || '')
  if (!options?.silent) {
    message.info('已预填演示纯抵消：多组来源汇总（确认页看勾选方向 + 抵消来源）')
  }
  return true
}

function resetNestedOffsetState() {
  pendingOffset.value = null
  nestedOffsetStaging.value = null
  nestedOffsetOpen.value = false
}

function openNestedOffset() {
  nestedOffsetDraft.value = pendingOffset.value ? cloneOffsetDraft(pendingOffset.value.draft) : createOffsetDraft()
  nestedDebtStatus.value = recordForm.value.update_debt_status
  nestedDebtAmount.value = recordForm.value.debt_amount
  nestedDebtAmountUsd.value = recordForm.value.debt_amount_usd
  nestedRemark.value = recordForm.value.remark
  seedNestedOffsetDemoIfNeeded()
  nestedOffsetOpen.value = true
  void loadCountryOptions()
}

function readOffsetDebtAmounts(status: string | null, amount: number | null, usdText: string, requireAmounts: boolean) {
  const needsAmount = status === 'owed' || status === 'surplus'
  if (!needsAmount) return { ok: true as const, amounts: undefined }
  const hasAmount = amount !== null && amount !== undefined && !Number.isNaN(Number(amount))
  if (!hasAmount) {
    if (!requireAmounts) return { ok: true as const, amounts: undefined }
    return { ok: false as const, message: '请填写尾款金额（元）' }
  }
  const usd = submittedArrearsUsdAmount(usdText, true)
  if (usd === null) {
    return { ok: false as const, message: String(usdText ?? '').trim() ? '欠款金额(美元)请填写整数' : '请填写欠款金额(美元)' }
  }
  return { ok: true as const, amounts: { cny: Number(amount), usd } }
}

async function confirmNestedOffset() {
  if (nestedOffsetSaving.value) return
  const prepared = prepareOffsetDraft(nestedOffsetDraft.value)
  if ('error' in prepared) {
    message.warning(prepared.error)
    return
  }
  const debt = readOffsetDebtAmounts(nestedDebtStatus.value, nestedDebtAmount.value, nestedDebtAmountUsd.value, false)
  if (!debt.ok) {
    message.warning(debt.message)
    return
  }
  nestedOffsetSaving.value = true
  try {
    const sources = await resolveOffsetSources(prepared.sources)
    const described = describeAttachedOffset(sources.offsetBasics, prepared.fields.offset_details, reviewTypeLabel)
    const previewSourceCards = hasOffsetSettleDemoDebtOrder(localOrders.value)
      ? [buildOffsetSettleDemoSourceCard(described.totalAmount)]
      : sources.offsetBasics.map(item => ({
          key: String(item.task_basic_id),
          batchNumber: item.label,
          customerName: displayGroupData.value?.customer_name || '-',
          basicSurplusCny: Number(item.amount || 0),
          tailSurplusCny: 0,
          offsetUseCny: Number(item.amount || 0),
          basicUsedCny: Number(item.amount || 0),
          tailUsedCny: 0,
          remainBasicCny: 0,
          remainTailCny: 0,
          remainTotalCny: 0,
          willClear: true,
        }))
    nestedOffsetStaging.value = {
      fields: prepared.fields,
      offsetBasics: sources.offsetBasics.map(({ task_basic_id, amount }) => ({ task_basic_id, amount })),
      totalAmount: described.totalAmount,
      sourceText: described.sourceText,
      detailText: described.detailText,
      draft: cloneOffsetDraft(nestedOffsetDraft.value),
      previewSourceCards,
    }
    recordForm.value.update_debt_status = nestedDebtStatus.value
    recordForm.value.debt_amount = nestedDebtAmount.value
    recordForm.value.debt_amount_usd = nestedDebtAmountUsd.value
    recordForm.value.remark = nestedRemark.value
    nestedOffsetOpen.value = false
    // 先收起录入补款弹窗，避免压在确认结算下面看不见
    recordModalOpen.value = false
    settlementConfirmPhase.value = 'offset-source'
    activeOffsetSourceKey.value = String(previewSourceCards[0]?.key || '')
    supplementDiffOpen.value = true
  } catch (error: any) {
    message.error(error?.message || '查询抵消来源失败')
  } finally {
    nestedOffsetSaving.value = false
  }
}

function commitNestedOffsetStaging() {
  if (!nestedOffsetStaging.value) {
    message.warning('请先确认抵消来源')
    return
  }
  pendingOffset.value = nestedOffsetStaging.value
  nestedOffsetStaging.value = null
  settlementConfirmPhase.value = 'submit'
  supplementDiffOpen.value = false
  recordModalOpen.value = true
  message.success('已加入补款，提交录入补款时顶部会显示账面抵消总额')
}

function handleSettlementConfirmBack() {
  if (settlementConfirmPhase.value === 'offset-source') {
    supplementDiffOpen.value = false
    settlementConfirmPhase.value = 'submit'
    recordModalOpen.value = true
    nestedOffsetOpen.value = true
    return
  }
  closeSupplementDiff()
  // 确认页返回：恢复被收起的录入弹窗
  if (recordMode.value === 'offset') directOffsetOpen.value = true
  else recordModalOpen.value = true
}

function handleSettlementConfirmOk() {
  if (settlementConfirmPhase.value === 'offset-source') {
    commitNestedOffsetStaging()
    return
  }
  void saveBatchRecord(undefined, 'submit')
}

function clearPendingOffset() {
  pendingOffset.value = null
}

function handleQrPaste(event: ClipboardEvent) {
  if (recordMode.value === 'offset') return
  const clipboardFiles = Array.from(event.clipboardData?.files || [])
  const imageFiles = clipboardFiles.filter(file => file.type.startsWith('image/'))
  if (!imageFiles.length) return

  event.preventDefault()
  const result = appendPastedImages(recordFiles.value, imageFiles, 5)
  recordFiles.value = result.files
  if (result.addedCount > 0) message.success(`已粘贴 ${result.addedCount} 张图片`)
  if (result.limitReached) message.warning('二维码最多只能上传 5 个文件')
}

function handleDocumentQrPaste(event: ClipboardEvent) {
  if (!recordModalOpen.value || event.defaultPrevented) return
  handleQrPaste(event)
}

let stopOffsetLogRetention: (() => void) | undefined
onMounted(() => {
  document.addEventListener('paste', handleDocumentQrPaste)
  stopOffsetLogRetention = startGroupOffsetLogRetention()
})
onBeforeUnmount(() => {
  document.removeEventListener('paste', handleDocumentQrPaste)
  stopOffsetLogRetention?.()
})

let offsetSaveClickTrace: GroupOffsetTrace | undefined

function captureOffsetSaveClick() {
  offsetSaveClickTrace = createGroupOffsetTrace()
  offsetSaveClickTrace('captureOffsetSaveClick:button-clicked', { busy: recordSaving.value || uploading.value })
}

async function saveOffsetFromFooter() {
  const trace = offsetSaveClickTrace ?? createGroupOffsetTrace()
  offsetSaveClickTrace = undefined
  try {
    if (recordMode.value === 'offset') seedDirectOffsetDemoIfNeeded({ silent: true })
    await saveBatchRecord(trace, 'open-diff')
  } catch (error) {
    trace('saveOffsetFromFooter:unexpected-error', groupOffsetErrorLocation(error))
    throw error
  }
}

function exportOffsetLog() {
  try {
    downloadGroupOffsetLog()
  } catch {
    message.error('导出日志失败')
  }
}

function handleDirectOffsetCancel() {
  createGroupOffsetTrace()('handleRecordCancel:direct-offset', { busy: recordSaving.value || uploading.value })
  offsetSaveClickTrace = undefined
  directOffsetOpen.value = false
  directOffsetPreviewCards.value = []
}

function handleRecordCancel() {
  if (supplementRecordSubmitted.value) {
    supplementRecordSubmitted.value = false
    void refreshBatchBill().then(() => emit('updated'))
  }
  recordModalOpen.value = false
  closeSupplementDiff()
  resetNestedOffsetState()
}

function basicStatusLabel(status: number) {
  if (status === 2) return '未完成'
  if (status === 3) return '富余'
  return '已完成'
}

function checkboxChecked(checked: any) {
  if (typeof checked === 'boolean') return checked
  return !!checked?.target?.checked
}

function moneyClass(value: number) {
  if (value > 0.0005) return 'is-plus'
  if (value < -0.0005) return 'is-minus'
  return ''
}

function groupBasicSigned(group: SettlementConfirmGroup) {
  if (!canSelectBasic(group.basicStatus)) return { cny: 0, usd: 0 }
  return signedBasicAmounts(group.basicStatus, group.basicCny, group.basicUsd)
}

function groupTailNet(group: SettlementConfirmGroup) {
  return group.tasks.reduce((sum, task) => {
    const signed = signedTailAmounts(task.paymentStatus, task.amountCny, task.amountUsd)
    return { cny: sum.cny + signed.cny, usd: sum.usd + signed.usd }
  }, { cny: 0, usd: 0 })
}

function groupTotalNet(group: SettlementConfirmGroup) {
  const basic = canSelectBasic(group.basicStatus)
    ? signedBasicAmounts(group.basicStatus, group.basicCny, group.basicUsd)
    : { cny: 0, usd: 0 }
  const tail = groupTailNet(group)
  return { cny: basic.cny + tail.cny, usd: basic.usd + tail.usd }
}

function focusSettlementGroup(group: SettlementConfirmGroup) {
  settlementActiveGroupKey.value = String(group.key)
}

function onSettlementGroupCheck(group: SettlementConfirmGroup, checked: boolean) {
  // 勾选/取消组时同步切到右侧对应明细（checkbox 本身 stop 了冒泡）
  focusSettlementGroup(group)
  setGroupChecked(group, checked)
}

function cloneSettlementGroups(groups: SettlementConfirmGroup[]) {
  return groups.map(group => ({
    ...group,
    tasks: group.tasks.map(task => ({ ...task })),
  }))
}

function openSupplementDiffModal() {
  if (recordMode.value === 'supplement') seedOffsetSettleDemoIfNeeded({ silent: true })
  settlementConfirmPhase.value = 'submit'
  void saveBatchRecord(undefined, 'open-diff')
}

function closeSupplementDiff() {
  if (settlementConfirmPhase.value === 'offset-source') {
    // 来源确认未点确认就关：不写入 pendingOffset，回到录入补款 + 抵消编辑
    nestedOffsetStaging.value = null
    settlementConfirmPhase.value = 'submit'
    supplementDiffOpen.value = false
    recordModalOpen.value = true
    nestedOffsetOpen.value = true
    return
  }
  supplementDiffOpen.value = false
  settlementConfirmPhase.value = 'submit'
  settlementConfirmGroups.value = []
  settlementRecommendSnapshot.value = []
  settlementActiveGroupKey.value = ''
  settlementEnteredCny.value = 0
  settlementEnteredUsd.value = 0
  activeOffsetSourceKey.value = ''
}

function fillSettlementConfirmRows() {
  const currency = recordForm.value.currency_mode
  const enteredCny = currency === 'usd' ? 0 : Number(recordForm.value.amount_cny || 0)
  const enteredUsd = currency === 'cny' ? 0 : Number(recordForm.value.amount_usd || 0)
  const refundCny = recordMode.value === 'refund' ? Number(recordForm.value.amount_cny || 0) : enteredCny
  settlementEnteredCny.value = recordMode.value === 'refund' ? Math.max(0, refundCny) : Math.max(0, enteredCny)
  settlementEnteredUsd.value = recordMode.value === 'refund' ? 0 : Math.max(0, enteredUsd)
  const baseGroups = buildSettlementConfirmGroups(localOrders.value)
  const recommended = applySettlementAutoSelect(
    baseGroups,
    settlementEnteredCny.value,
    settlementEnteredUsd.value,
    recordMode.value,
  )
  settlementConfirmGroups.value = recommended
  settlementRecommendSnapshot.value = cloneSettlementGroups(recommended)
  settlementActiveGroupKey.value = String(recommended[0]?.key || '')
  if (recordMode.value === 'offset' && offsetSourceSettleCards.value.length) {
    activeOffsetSourceKey.value = String(offsetSourceSettleCards.value[0]?.key || '')
  }
}

/** 有勾选 → 全部取消；无勾选 → 恢复系统推荐勾选 */
function toggleSettlementRecommend() {
  if (settlementHasAnySelected.value) {
    settlementConfirmGroups.value.forEach((group) => {
      group.basicSelected = false
      group.tasks.forEach((task) => { task.selected = false })
    })
    return
  }
  const currentKey = String(settlementActiveGroupKey.value || '')
  settlementConfirmGroups.value = cloneSettlementGroups(settlementRecommendSnapshot.value)
  if (!settlementConfirmGroups.value.some(group => String(group.key) === currentKey)) {
    settlementActiveGroupKey.value = String(settlementConfirmGroups.value[0]?.key || '')
  } else {
    settlementActiveGroupKey.value = currentKey
  }
}

/** 勾选基础→已完成；勾选尾款→已结算（列表尾款显示 -）；未勾选的尾款差额保留 */
async function applySettlementConfirmSelections() {
  const basicKeys = new Set(selectedBasicGroupKeys(settlementConfirmGroups.value))
  const tailIds = new Set(selectedTaskIdsFromGroups(settlementConfirmGroups.value).map(String))
  const touched = new Map<string, any>()

  for (const order of localOrders.value) {
    const basicId = String(order?.task_basic_id ?? order?.task_basic?.id ?? '')
    if (basicKeys.has(basicId)) {
      order._groupBillingStatus = 1
      order._groupBasicEntryCny = null
      order._groupBasicEntryUsd = null
      if (order.task_basic) {
        order.task_basic.basic_entry_amount_cny = 0
        order.task_basic.basic_entry_amount_usd = 0
      }
      touched.set(String(order.id), order)
    }
    if (tailIds.has(String(order.id))) {
      order._groupPaymentStatus = 4
      order._groupArrearsAmount = null
      order._groupArrearsUsd = ''
      touched.set(String(order.id), order)
    }
  }

  for (const order of touched.values()) await saveOrderStatus(order)
}

const TRANSACTION_TYPE_MAP: Record<string, number> = {
  业务收入: 1, 业务支出: 2, 其他收入: 5, 其他支出: 6,
}
const FLOW_TYPE_MAP: Record<string, number> = {
  任务收入: 1, 补款收入: 2, 截单退款: 3, 退佣金: 4, 退本金差价: 5, 其他收入: 13, 其他支出: 14,
}
const TRANSFER_CHANNEL_MAP: Record<string, number> = { 银行转账: 1, 支付宝: 2, 微信: 3, 其他: 5, 账面抵消: 5 }
const STATUS_ACTION_MAP: Record<string, number> = { cleared: 1, owed: 2, surplus: 0 }
const PAYMENT_STATUS_MAP: Record<string, number> = { cleared: 4, owed: 2, surplus: 3 }

async function applyDebtStatusToRows(rows: AllocRow[], debtStatus: string, amounts?: { cny: number; usd: number }) {
  const paymentStatus = PAYMENT_STATUS_MAP[debtStatus]
  if (!paymentStatus) return
  const targetIds = new Set(rows.map(row => row.taskId))
  for (const order of localOrders.value) {
    if (!targetIds.has(Number(order.id))) continue
    order._groupPaymentStatus = paymentStatus
    if (amounts) {
      order._groupArrearsAmount = amounts.cny
      order._groupArrearsUsd = amounts.usd
      order.arrears_usd_amount = amounts.usd
      if (order.bill?.[0]) order.bill[0].arrears_usd_amount = amounts.usd
    }
    await saveOrderStatus(order)
  }
}

function extractReceiveList(data: any) {
  if (Array.isArray(data?.list)) return data.list
  if (Array.isArray(data?.data)) return data.data
  return Array.isArray(data) ? data : []
}

async function resolveOffsetSources(rows: { task_id: string; amount: number }[], trace?: GroupOffsetTrace) {
  const taskItems: { task_id: number; amount: number; label: string }[] = []
  const offsetBasics: { task_basic_id: number; amount: number; label: string }[] = []
  for (const row of rows) {
    const keyword = row.task_id.trim()
    if (/TASK_BASIC/i.test(keyword)) {
      trace?.('resolveOffsetSources:before-query', { endpoint: '/admin/common/task_group' })
      const response = await searchTaskGroup(keyword)
      trace?.('resolveOffsetSources:query-result', { code: response.code })
      if (response.code !== 200) throw new Error(response.msg || response.message || '查询任务组失败')
      const groups = Array.isArray(response.data) ? response.data : []
      const group = groups.find((item: any) => String(item.task_basics_no) === keyword)
      if (!group?.id) throw new Error(`未找到任务组：${keyword}`)
      offsetBasics.push({ task_basic_id: Number(group.id), amount: row.amount, label: String(group.task_basics_no || group.id) })
    } else {
      trace?.('resolveOffsetSources:before-query', { endpoint: '/admin/receive/list' })
      const response = await getReceiveList({ keyword, page: 1, page_size: 20 })
      trace?.('resolveOffsetSources:query-result', { code: response.code })
      if (response.code !== 200) throw new Error(response.msg || response.message || '查询任务失败')
      const tasks = extractReceiveList(response.data)
      const task = tasks.find((item: any) => String(item.task_no) === keyword || String(item.id) === keyword)
      if (!task?.id) throw new Error(`未找到任务：${keyword}`)
      const taskBasicId = Number(task.task_basic_id || task.task_basic?.id || 0)
      if (!taskBasicId) throw new Error(`任务缺少任务组：${keyword}`)
      offsetBasics.push({ task_basic_id: taskBasicId, amount: row.amount, label: String(task.task_no || task.id) })
    }
  }
  return { taskItems, offsetBasics }
}

async function uploadRecordFiles() {
  const paths: string[] = []
  for (const item of recordFiles.value) {
    const file = item.originFileObj || item
    if (!file) continue
    const response = await uploadCommonFile(file as File)
    if (response.code !== 200) throw new Error(response.msg || response.message || '上传失败')
    const path = response.data?.url || response.data?.path
    if (path) paths.push(path)
  }
  return paths.join(',')
}

function allocateByRatio(total: number, rowAmount: number, index: number, rows: AllocRow[]) {
  const base = rows.reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0)
  if (base <= 0) return index === rows.length - 1 ? Number(total.toFixed(2)) : 0
  if (index === rows.length - 1) {
    const assigned = rows.slice(0, index).reduce((sum, row) => sum + Number((total * Math.abs(Number(row.amount || 0)) / base).toFixed(2)), 0)
    return Number((total - assigned).toFixed(2))
  }
  return Number((total * rowAmount / base).toFixed(2))
}

function refundSubmitRows() {
  return calcAllocSettlement(allocRows.value).rows
}

function supplementSubmitRows() {
  if (activeAllocRows.value.length) return activeAllocRows.value
  const currency = recordForm.value.currency_mode
  const enteredCny = currency === 'usd' ? 0 : Number(recordForm.value.amount_cny || 0)
  const enteredUsd = currency === 'cny' ? 0 : Number(recordForm.value.amount_usd || 0)
  if (enteredCny <= 0 && enteredUsd <= 0 && !pendingOffset.value) return []
  return allocRows.value
    .filter(row => row.taskId > 0)
    .map(row => ({ ...row, amount: 1 }))
}

async function refreshBatchBill() {
  const ids = localOrders.value.map(item => Number(item.id)).filter(id => Number.isFinite(id))
  if (!ids.length) return
  const response = await postReceiveBatchBill(ids)
  if (response.code === 200) refreshedBillData.value = response.data
}

function reviewTypeLabel(value: string) {
  return businessTypeOptions.find(item => item.value === value)?.label || value
}

function buildRecordRemark(
  attachedOffset: PendingOffset | null,
  sources: { taskItems: { amount: number; label: string }[]; offsetBasics: { amount: number; label: string }[] },
  businessRows: { review_type: string; quantity: number }[],
) {
  const parts: string[] = []
  if (recordMode.value === 'offset') {
    const sourceText = [...sources.taskItems, ...sources.offsetBasics]
      .map(item => `${item.label} ¥${item.amount.toFixed(2)}`)
      .join('、')
    if (sourceText) parts.push(`抵消来源: ${sourceText}`)
    const detailText = businessRows.map(item => `${reviewTypeLabel(item.review_type)}${item.quantity}单`).join('、')
    if (detailText) parts.push(`抵消明细: ${detailText}`)
  }
  if (attachedOffset) {
    parts.push(`抵消来源: ${attachedOffset.sourceText}`)
    if (attachedOffset.detailText) parts.push(`抵消明细: ${attachedOffset.detailText}`)
  }
  if (recordForm.value.remark) parts.push(recordForm.value.remark)
  return parts.join(' | ')
}

async function saveBatchRecord(trace?: GroupOffsetTrace, phase: 'open-diff' | 'submit' = 'submit') {
  trace?.('saveBatchRecord:entered')
  if (recordSaving.value || uploading.value) {
    trace?.('saveBatchRecord:blocked', { reason: 'already-saving' })
    return
  }
  const isSupplement = recordMode.value === 'supplement'
  const currency = recordForm.value.currency_mode
  const enteredCny = currency === 'usd' ? 0 : Number(recordForm.value.amount_cny || 0)
  const enteredUsd = currency === 'cny' ? 0 : Number(recordForm.value.amount_usd || 0)
  const isDirectOffset = recordMode.value === 'offset'
  if (isDirectOffset && !(Number(recordForm.value.primary_category) > 0)) {
    message.warning('请选择一级分类')
    return
  }
  if (isDirectOffset && !recordForm.value.secondary_categories.length) {
    message.warning('请选择二级分类')
    return
  }
  trace?.('saveBatchRecord:before-prepareOffsetDraft')
  const preparedOffset = isDirectOffset ? prepareOffsetDraft(offsetDraft.value) : undefined
  if (preparedOffset?.error) {
    trace?.('saveBatchRecord:blocked', { reason: preparedOffset.error })
    message.warning(preparedOffset.error)
    return
  }
  let rows = isSupplement ? supplementSubmitRows() : recordMode.value === 'refund' ? refundSubmitRows() : activeAllocRows.value
  if (isDirectOffset && !rows.length) {
    rows = allocRows.value.filter(row => Number(row.taskId) > 0)
  }
  let refundBillCnyAmount = 0
  if (recordMode.value === 'refund' && rows.length) {
    const netRefund = Number(rows.reduce((sum, row) => sum + (-Number(row.amount || 0)), 0).toFixed(2))
    if (netRefund <= 0.005) {
      message.warning('轧差后无需退款')
      return
    }
    const enteredRefundAmount = recordForm.value.amount_cny
    if (typeof enteredRefundAmount !== 'number' || !(enteredRefundAmount > 0)) {
      trace?.('saveBatchRecord:blocked', { reason: 'missing-refund-amount' })
      message.warning('请输入退款金额')
      return
    }
    refundBillCnyAmount = enteredRefundAmount
  }
  if (!rows.length) {
    trace?.('saveBatchRecord:blocked', { reason: 'no-target-rows' })
    if (isSupplement) {
      message.warning(currency === 'usd' ? '请填写补款金额（USD）' : '请填写补款金额（人民币）')
    }
    return
  }
  if (isSupplement && currency === 'cny' && enteredCny <= 0 && !pendingOffset.value) {
    message.warning('请填写补款金额（人民币）')
    return
  }
  if (isSupplement && currency === 'usd' && enteredUsd <= 0) {
    message.warning('请填写补款金额（USD）')
    return
  }
  if (isSupplement && currency === 'both' && enteredCny <= 0 && enteredUsd <= 0 && !pendingOffset.value) {
    message.warning('请至少填写人民币或美元补款金额')
    return
  }
  if (recordMode.value !== 'offset' && !recordForm.value.payment_date) {
    message.warning('请选择日期')
    return
  }
  if (recordMode.value === 'supplement' && !(Number(recordForm.value.primary_category) > 0)) {
    message.warning('请选择一级分类')
    return
  }
  if (recordMode.value !== 'offset' && !recordForm.value.secondary_categories.length) {
    message.warning('请选择二级分类')
    return
  }
  if (recordMode.value !== 'offset' && !recordForm.value.payment_method) {
    message.warning('请选择方式')
    return
  }
  const businessRows = (recordMode.value === 'refund' ? recordForm.value.business_rows : [])
    .map(row => ({ country_id: Number(row.country_id || 0), review_type: row.review_type, quantity: Number(row.quantity || 0) }))
    .filter(row => row.country_id || row.review_type || row.quantity)
  const completeRefundRows = businessRows.filter(row => row.country_id && row.review_type && row.quantity > 0)
  if (recordMode.value === 'refund' && !refundDetailsOptional.value && (!businessRows.length || businessRows.some(row => !row.country_id || !row.review_type || row.quantity <= 0))) {
    message.warning('请完整填写退款国家、类型和单量')
    return
  }
  const sourceRows = preparedOffset?.sources ?? []
  if (recordMode.value === 'offset') {
    if (!sourceRows.length || sourceRows.some(row => !row.task_id || row.amount <= 0)) {
      trace?.('saveBatchRecord:blocked', { reason: 'invalid-source-rows' })
      message.warning('请完整填写抵消来源任务和金额')
      return
    }
  }

  const attachedOffset = recordMode.value === 'supplement' ? pendingOffset.value : null
  const debtStatus = isSupplement || isDirectOffset || recordMode.value === 'refund' ? null : recordForm.value.update_debt_status
  const debtAmounts = readOffsetDebtAmounts(
    debtStatus,
    recordForm.value.debt_amount,
    recordForm.value.debt_amount_usd,
    false,
  )
  if (!debtAmounts.ok) {
    trace?.('saveBatchRecord:blocked', { reason: debtAmounts.message })
    message.warning(debtAmounts.message)
    return
  }

  trace?.('saveBatchRecord:validation-passed', { targetCount: rows.length, sourceCount: sourceRows.length })
  if (phase === 'open-diff' && (isSupplement || isDirectOffset || recordMode.value === 'refund')) {
    fillSettlementConfirmRows()
    // 收起下层录入弹窗，避免确认结算被挡住
    if (isDirectOffset) directOffsetOpen.value = false
    if (isSupplement || recordMode.value === 'refund') recordModalOpen.value = false
    supplementDiffOpen.value = true
    return
  }
  const markedTaskIds = isSupplement || isDirectOffset || recordMode.value === 'refund'
    ? selectedTaskIdsFromGroups(settlementConfirmGroups.value)
    : []
  recordSaving.value = true
  uploading.value = true
  try {
    const voucherPath = recordMode.value === 'offset' || (isSupplement && supplementRecordSubmitted.value) ? '' : await uploadRecordFiles()
    trace?.('saveBatchRecord:before-resolveOffsetSources')
    const sources = recordMode.value === 'offset' ? await resolveOffsetSources(sourceRows, trace) : { taskItems: [], offsetBasics: [] }
    trace?.('saveBatchRecord:after-resolveOffsetSources')

    const flowTypes = recordMode.value === 'offset' || recordMode.value === 'supplement'
      ? recordForm.value.secondary_categories.map(item => Number(item)).filter(value => Number.isInteger(value) && value > 0)
      : recordForm.value.secondary_categories.map(label => FLOW_TYPE_MAP[String(label)]).filter((value): value is number => Boolean(value))
    // 退款明细写入契约字段 offset_details（quantity）。refund_details 不在 bill_record 请求体里。（李运侠 改；Apifox 2026-09-24T10:02:43.124Z）
    const refundSourceRows = refundDetailsOptional.value ? completeRefundRows : businessRows
    const buildRecordPayload = (row: AllocRow, index: number) => {
      const amount = Math.abs(Number(row.amount || 0))
      const cnyAmount = !isSupplement
        ? (recordMode.value === 'refund' ? Number((-Number(row.amount || 0)).toFixed(2)) : amount)
        : currency === 'usd'
          ? 0
          : enteredCny > 0
            ? allocateByRatio(enteredCny, amount, index, rows)
            : 0
      const usdAmount = isSupplement && currency !== 'cny'
        ? allocateByRatio(enteredUsd, amount, index, rows)
        : 0
      return {
        bill_type: recordMode.value === 'refund' ? 2 : recordMode.value === 'offset' ? 3 : 1,
        task_id: row.taskId,
        transaction_type: recordMode.value === 'offset' || recordMode.value === 'supplement'
          ? Number(recordForm.value.primary_category)
          : (TRANSACTION_TYPE_MAP[String(recordForm.value.primary_category)] || 1),
        flow_type: recordMode.value === 'offset' || recordMode.value === 'supplement'
          ? flowTypes
          : (flowTypes.length ? flowTypes : [2]),
        bill_cny_amount: cnyAmount,
        bill_usd_amount: usdAmount,
        payment_date: recordMode.value === 'offset' ? dayjs().format('YYYY-MM-DD') : recordForm.value.payment_date,
        transfer_channel: TRANSFER_CHANNEL_MAP[recordForm.value.payment_method] || 5,
        receive_account: recordMode.value === 'refund' ? recordForm.value.receive_account : '',
        surname: recordMode.value === 'refund' ? recordForm.value.surname : '',
        receive_name: recordForm.value.receive_name,
        voucher_path: voucherPath,
        status_action: isSupplement ? 0 : (debtStatus ? (STATUS_ACTION_MAP[debtStatus] ?? 0) : 0),
        remark: recordMode.value === 'offset' ? recordForm.value.remark : buildRecordRemark(attachedOffset, sources, businessRows),
      }
    }

    const taskPayloads = rows.map(buildRecordPayload)
    const batchPayload = { ...taskPayloads[0], task_id: undefined }
    // bill_record 的 task_items 承载本次批量操作的目标任务；三种批量账款动作均只提交一次。
    // 返款/抵消来源分别使用 offset_details / offset_task_basics，禁止与目标任务混写。（禅道 #177）
    const batchRecordPayload = {
      ...batchPayload,
      task_items: taskPayloads.map((payload, index) => ({
        task_id: rows[index].taskId,
        amount: Number((payload.bill_cny_amount || payload.bill_usd_amount || 0).toFixed(2)),
      })),
      ...(preparedOffset?.fields
        ? {
            ...preparedOffset.fields,
            offset_task_basics: sources.offsetBasics.map(({ task_basic_id, amount }) => ({ task_basic_id, amount })),
          }
        : attachedOffset
          ? {
              ...attachedOffset.fields,
              offset_task_basics: attachedOffset.offsetBasics.map(({ task_basic_id, amount }) => ({ task_basic_id, amount })),
            }
          : recordMode.value === 'refund'
            ? {
                offset_type: 0,
                offset_task_basics: [],
                offset_details: refundSourceRows.map(({ country_id, review_type, quantity }) => ({ country_id, review_type, quantity })),
              }
            : {}),
      bill_cny_amount: recordMode.value === 'refund'
        ? refundBillCnyAmount
        : Number(taskPayloads.reduce((sum, payload) => sum + payload.bill_cny_amount, 0).toFixed(2)),
      bill_usd_amount: Number(taskPayloads.reduce((sum, payload) => sum + payload.bill_usd_amount, 0).toFixed(2)),
      ...(isSupplement || isDirectOffset || recordMode.value === 'refund' ? { bill_task_ids: markedTaskIds } : {}),
    }
    if (isSupplement) {
      console.log('[接单管理-批量录入补款] /admin/receive/bill_record 请求参数', batchRecordPayload)
    }
    trace?.('saveBatchRecord:before-createReceiveBillRecord')
    if (!(isSupplement && supplementRecordSubmitted.value)) {
      const response = await createReceiveBillRecord(batchRecordPayload, trace)
      trace?.('saveBatchRecord:bill-record-result', { code: response.code })
      if (response.code !== 200) throw new Error(response.msg || response.message || '批量账款保存失败')
      if (isSupplement) supplementRecordSubmitted.value = true
    }
    if (debtStatus) {
      trace?.('saveBatchRecord:before-applyDebtStatusToRows')
      await applyDebtStatusToRows(rows, debtStatus, debtAmounts.amounts)
      trace?.('saveBatchRecord:after-applyDebtStatusToRows')
    }
    if (isSupplement || isDirectOffset || recordMode.value === 'refund') {
      trace?.('saveBatchRecord:before-applySettlementConfirmSelections')
      await applySettlementConfirmSelections()
      trace?.('saveBatchRecord:after-applySettlementConfirmSelections')
    }
    trace?.('saveBatchRecord:before-refreshBatchBill')
    await refreshBatchBill()
    trace?.('saveBatchRecord:after-refreshBatchBill')
    message.success(recordMode.value === 'refund' ? '退款申请已提交' : recordMode.value === 'offset' ? '账面抵消已记录' : '补款已记录')
    recordModalOpen.value = false
    closeSupplementDiff()
    if (isSupplement) supplementRecordSubmitted.value = false
    directOffsetOpen.value = false
    resetNestedOffsetState()
    const processed = new Set(rows.map(row => row.taskId))
    allocRows.value = allocRows.value.map(row => processed.has(row.taskId) ? { ...row, amount: undefined } : row)
    emit('updated')
    trace?.('saveBatchRecord:completed')
  } catch (error: any) {
    trace?.('saveBatchRecord:failed', groupOffsetErrorLocation(error))
    message.error(error?.message || '操作失败')
  } finally {
    uploading.value = false
    recordSaving.value = false
    trace?.('saveBatchRecord:loading-reset')
  }
}
</script>

<style scoped>
.offset-record-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.offset-record-footer :deep(.ant-btn + .ant-btn) { margin-inline-start: 0; }
.gbh {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 16px;
  background: var(--eva-bg-container, #fff);
  border-bottom: 1px solid var(--eva-border-light, #f0f0f0);
}
.gbh-left { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.gbh-meta { font-size: 13px; color: var(--eva-text-secondary, #6b7280); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.gbh-sep { color: var(--eva-text-tertiary, #d1d5db); }
.gbh-alert-wrap { padding: 10px 24px 0; }
.gbh-alert { display: inline-flex; align-items: center; gap: 8px; width: fit-content; max-width: 100%; padding: 6px 12px; border: 1px solid var(--ant-color-warning-border, #fde68a); border-radius: 6px; background: var(--ant-color-warning-bg, #fffbeb); color: var(--ant-color-warning-text, #92400e); font-size: 13px; }
.alert-icon { width: 18px; height: 18px; border-radius: 50%; background: #faad14; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; }
.gb-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.gb-section { background: var(--eva-bg-container, #fff); border-radius: 10px; border: 1px solid var(--eva-border-light, #f0f0f0); padding: 16px 20px; }
.section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.section-title { font-size: 14px; font-weight: 600; color: var(--eva-text, #1a1a2e); }
.section-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.orders-table { width: 100%; overflow-x: auto; }
.orders-table-head,
.orders-table-row {
  display: grid;
  grid-template-columns: 78px minmax(120px, 1.3fr) 84px 96px 96px 120px 130px 120px;
  align-items: center;
  column-gap: 12px;
  box-sizing: border-box;
  width: 100%;
  min-width: 1040px;
  padding: 8px 10px;
  font-size: 14px;
}
.orders-table-head { margin-bottom: 4px; padding-block: 6px; border-radius: 6px; background: var(--eva-bg-soft, #f8f9fb); color: var(--eva-text-secondary, #6b7280); font-weight: 600; }
.orders-table-row { border-bottom: 1px solid var(--eva-border-light, #f0f0f0); background: var(--eva-bg-container, #fff); transition: background 0.15s; }
.orders-table-row:hover { background: var(--eva-bg-soft, #f8f9fb); }
.row-attention { background: var(--ant-color-warning-bg, #fffbe6); }
.order-num-text,
.col-asin { font-family: monospace; color: var(--eva-link, #2563eb); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-created,
.col-num,
.col-asin,
.col-paid,
.col-credited,
.col-status,
.col-debt,
.col-diff { display: flex; align-items: center; min-width: 0; }
.col-created { color: var(--eva-text-secondary, #6b7280); font-family: monospace; white-space: nowrap; }
.col-paid,
.col-credited { font-weight: 600; color: var(--eva-text, #374151); }
.orders-empty { padding: 18px; text-align: center; color: var(--eva-text-tertiary, #9ca3af); font-size: 13px; background: var(--eva-bg-soft, #f8f9fb); }
.records-mock-tip { margin-bottom: 8px; padding: 10px 14px; border: 1px dashed var(--eva-border, #e5e7eb); border-radius: 8px; background: var(--eva-bg-soft, #f9fafb); color: var(--eva-text-tertiary, #9ca3af); font-size: 14px; text-align: center; }
.payment-lines { width: 100%; overflow-x: auto; border: 1px solid var(--eva-border, #e5e7eb); border-radius: 10px; background: var(--eva-bg-container, #fff); }
.payment-line { display: grid; grid-template-columns: 110px minmax(145px, 1fr) minmax(96px, 1fr) 90px 104px 92px minmax(96px, 1.5fr); align-items: center; column-gap: 20px; box-sizing: border-box; width: 100%; min-width: 900px; padding: 10px 14px; border-bottom: 1px solid var(--eva-border-light, #f0f0f0); font-size: 14px; background: var(--eva-bg-container, #fff); }
.payment-line:last-child { border-bottom: none; }
.payment-line-head { background: var(--eva-bg-soft, #f8f9fb); color: var(--eva-text-secondary, #6b7280); font-weight: 600; }
.payment-line-date,
.payment-line-number,
.payment-line-meta,
.payment-line-notes { color: var(--eva-text-secondary, #6b7280); }
.payment-line-number,
.payment-line-notes { overflow-wrap: anywhere; }
.payment-line-income { color: #16a34a; font-weight: 700; }
.payment-line-refund { color: #dc2626; font-weight: 700; }
.payment-line-offset { color: #2563eb; font-weight: 700; }
.section-hint { color: var(--eva-text-tertiary, #9ca3af); font-size: 14px; }
.batch-form,
.add-record-form,
.offset-business-list { display: flex; flex-direction: column; gap: 12px; }
.bf-submit,
.offset-brief-head { display: flex; align-items: center; gap: 10px; }
.ar-label { color: var(--eva-text, #374151); font-size: 14px; font-weight: 600; }
.bf-alloc-list,
.offset-brief-card,
.batch-record-summary {
  padding: 12px;
  border: 1px solid var(--eva-border, #e5e7eb);
  border-radius: 8px;
  background: var(--eva-bg-soft, #f8f9fb);
}
.bf-alloc-list { display: flex; flex-direction: column; gap: 10px; }
.bf-alloc-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 2px; }
.bf-label { color: var(--eva-text, #374151); font-size: 14px; font-weight: 600; }
.alloc-hint { color: var(--eva-text-tertiary, #9ca3af); font-size: 14px; }
.bf-alloc-row { display: flex; align-items: center; gap: 12px; }
.alloc-order-num { min-width: 160px; overflow: hidden; color: var(--eva-text, #1a1a2e); font-family: monospace; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.alloc-debt-info { min-width: 130px; }
.alloc-debt-info,
.alloc-input-wrap { display: flex; align-items: center; gap: 6px; }
.alloc-debt-tag { padding: 2px 6px; border: 1px solid var(--eva-border, #e5e7eb); border-radius: 4px; font-size: 14px; font-weight: 600; }
.hint-owed { border-color: #fed7aa; background: #fff7ed; color: #c2410c; }
.hint-surplus { border-color: #bfdbfe; background: #eff6ff; color: #1d4ed8; }
.hint-none { color: var(--eva-text-secondary, #6b7280); }
.hint-supplement { color: #16a34a; font-size: 11px; font-weight: 600; }
.hint-refund { color: #dc2626; font-size: 11px; font-weight: 600; }
:deep(.input-negative input) { color: #dc2626; }
.batch-form { gap: 14px; }
.alloc-total-breakdown { color: var(--eva-text-secondary, #6b7280); font-size: 14px; font-weight: 400; }
.bf-submit { flex-wrap: wrap; padding-top: 4px; }
.batch-record-summary { color: var(--eva-text, #374151); font-size: 13px; font-weight: 600; }
.offset-brief-head { justify-content: space-between; color: var(--eva-text, #1a1a2e); font-size: 14px; font-weight: 700; }
.offset-business-row { display: flex; align-items: center; gap: 8px; }
.offset-brief-total { color: #2563eb; font-size: 14px; font-weight: 700; text-align: right; }
.offset-inline-action { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; border: 1px solid var(--eva-border, #e5e7eb); border-radius: 8px; background: var(--eva-bg-soft, #f8f9fb); color: var(--eva-text-secondary, #6b7280); font-size: 14px; }
.offset-inline-action span { min-width: 0; line-height: 1.5; }
.sc-head { color: var(--eva-text-secondary, #6b7280); font-size: 13px; margin-bottom: 10px; }
.sc-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--eva-bg-soft, #f5f7fa);
  border: 1px solid var(--eva-border-light, #f0f0f0);
  font-size: 14px;
  color: var(--eva-text, #1a1a2e);
}
.sc-summary-main { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; min-width: 0; }
.sc-summary-sep { color: var(--eva-text-secondary, #6b7280); }
.sc-need { color: #dc2626; }
.sc-restore {
  flex-shrink: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--eva-link, #2563eb);
  font-size: 13px;
  cursor: pointer;
}
.sc-restore:hover { color: #1d4ed8; }
.sc-empty { padding: 28px 0; text-align: center; color: var(--eva-text-secondary, #6b7280); }
.sc-empty-sm { padding: 16px 12px; color: var(--eva-text-secondary, #6b7280); font-size: 13px; }
.sc-split { display: grid; grid-template-columns: minmax(300px, 1.1fr) minmax(300px, 1fr); gap: 12px; min-height: 320px; }
.sc-left, .sc-right {
  border: 1px solid var(--eva-border, #e5e7eb);
  border-radius: 10px;
  background: var(--eva-bg-container, #fff);
  overflow: auto;
  max-height: 420px;
}
.sc-pane-title {
  padding: 10px 12px;
  font-weight: 600;
  font-size: 13px;
  color: var(--eva-text-secondary, #6b7280);
  border-bottom: 1px solid var(--eva-border-light, #f0f0f0);
  background: var(--eva-bg-soft, #f8f9fb);
}
.sc-group {
  display: flex;
  gap: 10px;
  margin: 8px;
  padding: 10px 12px;
  border: 1px solid var(--eva-border, #e5e7eb);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}
.sc-group.active {
  border-color: var(--eva-link, #2563eb);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.2);
  background: rgba(37, 99, 235, 0.04);
}
.sc-group-body { min-width: 0; flex: 1; }
.sc-group-top { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.sc-group-title { font-weight: 700; color: var(--eva-text, #1a1a2e); }
.sc-group-sub { font-size: 12px; color: var(--eva-text-secondary, #6b7280); }
.sc-basic-amt {
  margin-left: 8px;
  color: var(--eva-text, #1a1a2e);
}
.sc-basic-amt b { font-weight: 700; }
.sc-group-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--eva-text-secondary, #6b7280);
}
.sc-group-metrics b { font-weight: 700; }
.sc-group-pick {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--eva-text-secondary, #6b7280);
}
.sc-basic-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--eva-text, #1a1a2e);
}
.sc-basic-none { color: var(--eva-text-secondary, #6b7280); }
.sc-task-head, .sc-task-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1.2fr) 72px minmax(110px, 1fr);
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  font-size: 13px;
}
.sc-task-head {
  color: var(--eva-text-secondary, #6b7280);
  font-size: 12px;
  font-weight: 600;
  border-bottom: 1px solid var(--eva-border-light, #f0f0f0);
  background: #fff;
}
.sc-task-row { border-bottom: 1px solid var(--eva-border-light, #f0f0f0); }
.sc-col-amt { text-align: right; }
.sc-task-row > b { text-align: right; justify-self: end; }
.sc-task-no { font-weight: 600; color: var(--eva-text, #1a1a2e); }
.sc-task-asin { font-size: 12px; color: var(--eva-text-secondary, #6b7280); }
.sc-task-status { color: var(--eva-text-secondary, #6b7280); }
.is-minus { color: #dc2626; }
.is-plus { color: #059669; }
.sc-section-title {
  margin: 12px 0 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--eva-text, #1a1a2e);
}
.sc-offset-source-block {
  margin-top: 14px;
  padding-top: 4px;
  border-top: 1px dashed var(--eva-border, #e5e7eb);
}
.sc-offset-source-card {
  padding: 12px 14px;
  border: 1px solid var(--eva-border, #e5e7eb);
  border-radius: 10px;
  background: #f5f7fa;
}
.sc-offset-source-block .sc-group {
  cursor: pointer;
}
.sc-offset-after {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  font-size: 12px;
  color: var(--eva-text-secondary, #6b7280);
}
.sc-offset-source-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 18px;
  font-size: 13px;
  color: var(--eva-text, #1a1a2e);
}
.amount-surplus { color: #059669; font-weight: 700; }
.amount-cleared { color: var(--eva-text-secondary, #6b7280); font-weight: 700; }
.sc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--eva-border, #e5e7eb);
  color: var(--eva-text-secondary, #6b7280);
  font-size: 13px;
}
.sc-foot-actions { display: flex; gap: 8px; }
.offset-brief-tip { color: var(--eva-text-secondary, #6b7280); font-size: 14px; line-height: 1.6; }
.add-record-tip { margin-top: -6px; color: var(--eva-text-secondary, #6b7280); font-size: 14px; line-height: 1.6; }
.debt-status-reminder { color: #f59e0b; font-size: 11px; margin-top: 4px; }
.ar-field { display: flex; flex-direction: column; gap: 6px; }
.required { color: #dc2626; }
.refund-account-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.upload-text { margin-top: 4px; font-size: 14px; }
.gbd-group-table { display: flex; flex-direction: column; gap: 8px; overflow-x: auto; }
.gbd-group-head, .gbd-group-row, .gbd-group-foot, .gbd-task-align-row {
  display: grid;
  /* 组号 任务数 应收 实收 抵消 | 基础入账 待收 | 待结差额 客户 */
  grid-template-columns: 28px minmax(140px, 1.2fr) 56px repeat(3, minmax(88px, 1fr)) 110px 100px 100px minmax(88px, 1fr) minmax(88px, 1fr);
  gap: 8px;
  align-items: center;
  min-width: 1200px;
}
.gbd-group-table.has-refund .gbd-group-head,
.gbd-group-table.has-refund .gbd-group-row,
.gbd-group-table.has-refund .gbd-group-foot,
.gbd-group-table.has-refund .gbd-task-align-row {
  grid-template-columns: 28px minmax(140px, 1.2fr) 56px repeat(4, minmax(88px, 1fr)) 110px 100px 100px minmax(88px, 1fr) minmax(88px, 1fr);
  min-width: 1300px;
}
.gbd-group-head.compact-entry-preview,
.gbd-group-row.compact-entry-preview,
.gbd-group-foot.compact-entry-preview {
  grid-template-columns: 28px minmax(140px, 1.2fr) 56px repeat(3, minmax(88px, 1fr)) 110px minmax(120px, 1fr) minmax(88px, 1fr) minmax(88px, 1fr);
  min-width: 1120px;
}
.gbd-group-table.has-refund .gbd-group-head.compact-entry-preview,
.gbd-group-table.has-refund .gbd-group-row.compact-entry-preview,
.gbd-group-table.has-refund .gbd-group-foot.compact-entry-preview {
  grid-template-columns: 28px minmax(140px, 1.2fr) 56px repeat(4, minmax(88px, 1fr)) 110px minmax(120px, 1fr) minmax(88px, 1fr) minmax(88px, 1fr);
  min-width: 1220px;
}
/* 展开任务行：任务号 | ASIN | 实际应收 …（ASIN 占原任务数列位并加宽） */
.gbd-task-align-row.compact-entry-preview {
  grid-template-columns: 28px minmax(130px, 1.1fr) minmax(110px, 1fr) minmax(88px, 1fr) minmax(72px, 0.8fr) minmax(72px, 0.8fr) 110px minmax(120px, 1fr) minmax(88px, 1fr) minmax(88px, 1fr);
  min-width: 1180px;
}
.gbd-group-table.has-refund .gbd-task-align-row.compact-entry-preview {
  grid-template-columns: 28px minmax(130px, 1.1fr) minmax(110px, 1fr) minmax(88px, 1fr) minmax(72px, 0.8fr) minmax(72px, 0.8fr) minmax(72px, 0.8fr) 110px minmax(120px, 1fr) minmax(88px, 1fr) minmax(88px, 1fr);
  min-width: 1280px;
}
.gbd-group-head, .gbd-group-foot { color: var(--eva-text-secondary, #6b7280); font-size: 13px; font-weight: 600; }
.gbd-group-row, .gbd-group-foot { padding: 8px 0; border-bottom: 1px solid var(--eva-border-light, #f0f0f0); }
.gbd-group-foot {
  border-top: 1px solid var(--eva-border, #e5e7eb);
  background: var(--eva-bg-soft, #f8f9fb);
  color: var(--eva-text, #1a1a2e);
  font-weight: 700;
}
.group-expand-btn { padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; }
.gbd-group-row.is-open {
  background: #eef2f7;
  border-radius: 8px 8px 0 0;
}
.group-batch-btn { padding: 0; border: 0; background: transparent; color: var(--eva-link, #1677ff); font-weight: 700; text-align: left; cursor: pointer; }
.col-status { min-width: 0; }
.gbd-billing-status { width: 100% !important; min-width: 96px; max-width: 110px; }
.col-entry {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}
.gbd-amt-cell {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  max-width: 100%;
  line-height: 1.25;
}
.gbd-field .gbd-amt-cell { align-items: flex-start; }
.gbd-amt-usd {
  font-size: 11px;
  font-weight: 600;
  color: var(--eva-link, #2563eb);
  white-space: nowrap;
}
.gbd-amt-cny {
  font-size: 13px;
  font-weight: 600;
  color: var(--eva-text, #1a1a2e);
  white-space: nowrap;
}
.gbd-amt-usd.is-plus,
.gbd-amt-cny.is-plus { color: var(--eva-success, #059669); }
.gbd-amt-usd.is-minus,
.gbd-amt-cny.is-minus { color: var(--eva-danger, #dc2626); }
.gbd-task-wrap {
  margin: 0 0 8px;
  padding: 10px 12px 8px 28px;
  border-radius: 0 0 8px 8px;
  background: #e8ebf0;
}
.gbd-task-wrap.is-align-preview {
  padding: 8px 8px 10px;
  background: #e8ebf0;
}
.gbd-task-align-row {
  padding: 10px 8px;
  margin-bottom: 6px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid var(--eva-border, #e5e7eb);
  align-items: start;
}
.gbd-task-align-row:last-child { margin-bottom: 0; }
.gbd-asin-field { min-width: 0; }
.gbd-field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}
.col-entry.gbd-field,
.col-status.gbd-field {
  align-items: center;
}
.gbd-field-label {
  font-size: 12px;
  line-height: 1.2;
  color: var(--eva-text-secondary, #6b7280);
}
.gbd-field-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--eva-text, #1a1a2e);
  word-break: break-all;
}
.gbd-debt-status { width: 100% !important; min-width: 96px; max-width: 110px; }
.gbd-entry-stack {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  width: max-content;
  margin: 0 auto;
}
.gbd-entry-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}
.gbd-entry-unit {
  flex: 0 0 28px;
  font-size: 12px;
  color: var(--eva-text-secondary, #6b7280);
  text-align: right;
}
.gbd-entry-input { width: 88px !important; }
.gbd-entry-input.is-usd { width: 72px !important; }
.gbd-entry-input.is-usd :deep(.ant-input-number-input),
.gbd-entry-input.is-usd.ant-input {
  font-size: 12px;
}
.settle-section { margin-top: 16px; }
.settle-section .section-header { justify-content: space-between; }
.settle-copy-btn { margin-left: auto; }
.bill-editable-text { font-family: monospace; font-size: 13px; line-height: 1.8; }

@media (max-width: 700px) {
  .gbh { flex-direction: column; align-items: stretch; }
  .bf-alloc-header,
  .bf-alloc-row { flex-direction: column; align-items: stretch; }
  .alloc-order-num,
  .alloc-debt-info { min-width: 0; }
  .offset-business-row,
  .refund-account-grid { display: flex; flex-direction: column; align-items: stretch; }
}
</style>
