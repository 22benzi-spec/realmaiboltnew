<template>
  <div class="after-sale-list">
    <div v-if="props.showStats" class="after-sale-overview">
      <div class="after-sale-overview-head">
        <div>
          <div class="after-sale-overview-title">售后数据概览</div>
          <div class="after-sale-overview-desc">按创建时间筛选问题单，列表和汇总使用同一时间范围</div>
        </div>
        <a-range-picker
          v-model:value="dateRange"
          format="YYYY-MM-DD"
          :allow-clear="false"
          @change="handleDateRangeChange"
        />
      </div>
      <div class="after-sale-overview-grid">
        <div class="after-sale-overview-metric">
          <span>问题单量</span>
          <strong>{{ stats.total }}</strong>
          <em>当前时间范围</em>
        </div>
        <div class="after-sale-overview-metric">
          <span>处理中</span>
          <strong>{{ stats.processing }}</strong>
          <em>含无新单号 {{ stats.needReorder }}</em>
        </div>
        <div class="after-sale-overview-metric is-success">
          <span>今日已处理</span>
          <strong>{{ stats.todayHandled }}</strong>
          <em>按处理时间统计</em>
        </div>
        <div class="after-sale-overview-metric is-danger">
          <span>本金损失金额</span>
          <strong>{{ formatAggregateMoney(stats.principalLossAmount) }}</strong>
          <em>{{ stats.principalLossCount }} 单已损失</em>
        </div>
      </div>
    </div>

    <div class="card-panel">
      <div class="toolbar">
        <a-select v-model:value="filterCountry" style="width: 110px" @change="reloadFromFirstPage" allow-clear placeholder="国家">
          <a-select-option v-for="c in countryOptions" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterType" style="width: 110px" @change="reloadFromFirstPage" allow-clear placeholder="订单状态">
          <a-select-option v-for="t in issueTypes" :key="t" :value="t">{{ t }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterStatus" style="width: 170px" @change="reloadFromFirstPage" allow-clear placeholder="处理进度">
          <a-select-option v-for="s in processStatusOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterResolutionResult" style="width: 130px" @change="reloadFromFirstPage" allow-clear placeholder="处理结果">
          <a-select-option v-for="s in resolutionResultOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterPrincipalStatus" style="width: 120px" @change="reloadFromFirstPage" allow-clear placeholder="本金状态">
          <a-select-option v-for="s in principalStatusOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-input-search
          v-model:value="filterSearch"
          placeholder="搜索订单号/订单ID/买手/客户/ASIN..."
          style="width: 260px"
          @search="reloadFromFirstPage"
          allow-clear
        />
        <div class="toolbar-actions">
          <a-button type="primary" :loading="exporting" @click="exportCurrentView">
            <DownloadOutlined />
            导出
          </a-button>
          <a-button @click="reloadFromFirstPage"><ReloadOutlined /> 刷新</a-button>
          <span class="total-hint">共 {{ pagination.total }} 条</span>
        </div>
      </div>

      <a-table
        :columns="columns"
        :data-source="issues"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: 1400 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'product_info'">
            <div class="cell-info">
              <div class="cell-product-name">{{ record.product_name || '--' }}</div>
              <div class="cell-meta">{{ record.asin || '--' }}</div>
              <div class="cell-country">{{ record.country || '--' }}</div>
            </div>
          </template>
          <template v-if="column.key === 'sub_info'">
            <div class="cell-info">
              <a class="link-text" @click="openDetail(record)">{{ record.old_amazon_order_id || '--' }}</a>
              <div class="cell-meta">订单ID: {{ record.sub_order_number || '--' }}</div>
            </div>
          </template>
          <template v-if="column.key === 'client'">
            <div class="cell-client-name">{{ record.customer_name || '--' }}</div>
            <div v-if="record.business_manager_name" class="cell-meta">商务: {{ record.business_manager_name }}</div>
          </template>
          <template v-if="column.key === 'buyer'">
            <div>{{ record.staff_name || '--' }}</div>
            <div class="cell-meta">买手: {{ record.buyer_name || '--' }}</div>
            <div class="cell-meta">聊单号: {{ getBuyerChatDisplay(record) }}</div>
          </template>
          <template v-if="column.key === 'order_status'">
            <a-tag :color="issueTypeColor[record.issue_type] || 'default'">{{ record.issue_type }}</a-tag>
          </template>
          <template v-if="column.key === 'refund_info'">
            <div class="refund-info-cell">
              <div class="refund-info-main">{{ getRefundDisplayAmount(record) }}</div>
              <div class="refund-info-sub">实付 {{ getActualPaidDisplayAmount(record) }}</div>
              <div class="refund-info-sub">{{ getRefundMethodDisplay(record) }}</div>
            </div>
          </template>
          <template v-if="column.key === 'principal_status'">
            <div class="inline-status-display">
              <a-tag :color="getPrincipalStatusColor(record)">{{ getPrincipalStatus(record) }}</a-tag>
              <div
                v-if="shouldShowPrincipalAmount(record)"
                :class="getPrincipalAmountClass(record)"
              >
                {{ formatMoney(getPrincipalAmount(record), record) }}
              </div>
            </div>
          </template>
          <template v-if="column.key === 'after_sale_progress'">
            <div v-if="editingProgressId === record.id" class="inline-edit-stack">
              <a-select v-model:value="progressDraft.status" size="small">
                <a-select-option v-for="status in getInlineProgressOptions(record)" :key="status" :value="status">
                  {{ formatIssueStatusLabel(status) }}
                </a-select-option>
              </a-select>
              <div class="inline-edit-actions">
                <a-button size="small" type="primary" :loading="saving" @click="saveProgressEdit(record)">保存</a-button>
                <a-button size="small" @click="cancelProgressEdit">取消</a-button>
              </div>
            </div>
            <div v-else class="after-sale-progress-cell" :class="{ 'is-clickable': isProcessEditable(record) }" @click="startProgressEdit(record)">
              <div class="after-sale-progress-main">
                <a-tag :color="afterSaleProgressTagColor(record)" class="after-sale-progress-tag">{{ getAfterSaleProgressMainStatus(record) }}</a-tag>
                <a-tag v-if="showTransferAlert(record)" color="blue" class="after-sale-alert-tag">转给他人</a-tag>
                <a-tag v-if="showPendingReorderAlert(record)" color="red" class="after-sale-alert-tag">无新单号</a-tag>
                <a-tag v-if="showGrabHallAlert(record)" color="purple" class="after-sale-alert-tag">抢单大厅</a-tag>
              </div>
            </div>
          </template>
          <template v-if="column.key === 'remark'">
            <span v-if="record.resolution_notes" class="remark-text">{{ record.resolution_notes }}</span>
            <span v-else class="text-gray">--</span>
          </template>
          <template v-if="column.key === 'resolution_result'">
            <div class="resolution-result-cell">
              <a-tag :color="statusColorMap[normalizeIssueStatus(record.issue_status)] || 'default'" class="resolution-result-tag">
                {{ getResolutionMethodLabel(record) || '--' }}
              </a-tag>
              <div v-if="getResolutionResultSubText(record)" class="resolution-result-sub">{{ getResolutionResultSubText(record) }}</div>
            </div>
          </template>
          <template v-if="column.key === 'handled_at'">
            <span>{{ fmtShortTime(getHandledTime(record)) }}</span>
          </template>
          <template v-if="column.key === 'action'">
            <div class="action-btns">
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button type="link" size="small" @click="openHandle(record)">处理</a-button>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer
      v-model:open="drawerOpen"
      :title="drawerMode === 'handle' ? `操作问题单 · ${currentIssue?.sub_order_number || ''}` : (currentIssue?.sub_order_number || '问题单详情')"
      width="860"
      placement="right"
      destroy-on-close
    >
      <template v-if="currentIssue">
        <div v-if="drawerMode === 'detail'" class="after-sale-detail">
          <div class="after-sale-hero">
            <div class="after-sale-hero-main">
              <div class="after-sale-title-line">
                <span>{{ currentIssue.product_name || currentIssue.asin || '--' }}</span>
                <a-tag :color="issueTypeColor[currentIssue.issue_type] || 'default'">{{ currentIssue.issue_type }}</a-tag>
                <a-tag :color="statusColorMap[normalizeIssueStatus(currentIssue.issue_status)] || 'default'">{{ formatIssueStatusLabel(currentIssue.issue_status) }}</a-tag>
              </div>
              <div class="after-sale-meta">
                <span class="mono">{{ currentIssue.asin || '--' }}</span>
                <span>主任务ID：{{ currentIssue.order_number || '--' }}</span>
              </div>
            </div>
            <div class="after-sale-risk-card">
              <span>本金状态</span>
              <strong>{{ getPrincipalStatus(currentIssue) }}</strong>
              <em v-if="shouldShowPrincipalAmount(currentIssue)">{{ formatMoney(getPrincipalAmount(currentIssue), currentIssue) }}</em>
            </div>
          </div>

          <div class="after-sale-detail-grid">
            <div class="after-sale-card">
              <div class="after-sale-card-title">任务信息</div>
              <div class="after-sale-field-grid">
                <div class="after-sale-field"><span>店铺</span><strong>{{ currentIssue.store_name || '--' }}</strong></div>
                <div class="after-sale-field"><span>产品价格</span><strong class="amount-usd">{{ formatMoney(Number(currentIssue.product_price || 0), currentIssue) }}</strong></div>
                <div class="after-sale-field"><span>客户</span><strong>{{ currentIssue.customer_name || '--' }}</strong></div>
                <div class="after-sale-field"><span>商务</span><strong>{{ currentIssue.business_manager_name || '--' }}</strong></div>
              </div>
            </div>

            <div class="after-sale-card">
              <div class="after-sale-card-title">执行信息</div>
              <div class="after-sale-field-grid">
                <div class="after-sale-field"><span>亚马逊订单号</span><strong class="mono">{{ currentIssue.old_amazon_order_id || '--' }}</strong></div>
                <div class="after-sale-field"><span>买手</span><strong>{{ currentIssue.buyer_name || '--' }}</strong></div>
                <div class="after-sale-field"><span>聊单号</span><strong>{{ getBuyerChatDisplay(currentIssue) }}</strong></div>
                <div class="after-sale-field"><span>业务员</span><strong>{{ currentIssue.staff_name || '--' }}</strong></div>
                <div class="after-sale-field"><span>下单时间</span><strong>{{ fmtDateTime(currentIssue.amazon_order_placed_at) }}</strong></div>
                <div class="after-sale-field"><span>入库时间</span><strong>{{ fmtDateTime(currentIssue.created_at) }}</strong></div>
              </div>
            </div>

            <div class="after-sale-card is-wide">
              <div class="after-sale-card-title">处理详情</div>
              <div class="after-sale-field-grid">
                <div v-if="getResolutionMethodLabel(currentIssue)" class="after-sale-field"><span>处理结果</span><strong>{{ getResolutionMethodLabel(currentIssue) }}</strong></div>
                <template v-if="isOrderNumberReplacement(currentIssue)">
                  <div class="after-sale-field wide"><span>订单号变更</span><strong class="mono">{{ currentIssue.old_amazon_order_id || '--' }} -> {{ currentIssue.new_amazon_order_id || '--' }}</strong></div>
                </template>
                <template v-if="isReorderResult(currentIssue)">
                  <div class="after-sale-field wide"><span>子单ID变更</span><strong class="mono">{{ currentIssue.sub_order_number || '--' }} -> {{ currentIssue.replacement_sub_order_number || '--' }}</strong></div>
                </template>
                <div v-if="shouldShowPrincipalAmount(currentIssue)" class="after-sale-field"><span>{{ currentIssue.issue_type === '本金多返' ? '差价金额' : '损失金额' }}</span><strong class="amount-usd">{{ formatMoney(getPrincipalAmount(currentIssue), currentIssue) }}</strong></div>
                <div v-if="currentIssue.refund_to_client_method" class="after-sale-field"><span>返款方式</span><strong>{{ currentIssue.refund_to_client_method }}</strong></div>
                <div v-if="currentIssue.refund_to_client_amount" class="after-sale-field"><span>返款金额</span><strong class="amount-usd">{{ formatMoney(Number(currentIssue.refund_to_client_amount || 0), currentIssue) }}</strong></div>
                <div v-if="currentIssue.resolution_notes" class="after-sale-field wide"><span>处理备注</span><strong>{{ currentIssue.resolution_notes }}</strong></div>
                <div v-if="currentIssue.refund_to_client_notes" class="after-sale-field wide"><span>返款备注</span><strong>{{ currentIssue.refund_to_client_notes }}</strong></div>
                <div v-if="!hasAfterSaleResult(currentIssue)" class="after-sale-empty-row">暂无处理结果</div>
              </div>
            </div>
          </div>

          <div class="after-sale-flow">
            <div class="after-sale-flow-title">处理动态</div>
            <div class="after-sale-timeline">
              <div v-for="item in getAfterSaleDetailTimeline(currentIssue)" :key="item.key" class="after-sale-timeline-item">
                <div class="after-sale-timeline-axis">
                  <span :class="['after-sale-timeline-dot', `is-${item.type}`]"></span>
                  <span class="after-sale-timeline-line"></span>
                </div>
                <div class="after-sale-timeline-content">
                  <div class="after-sale-timeline-title">
                    <strong>{{ item.title }}</strong>
                    <span>{{ fmtDateTime(item.time) }}</span>
                  </div>
                  <div v-if="item.desc" class="after-sale-timeline-desc">{{ item.desc }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="drawer-section">
          <div class="drawer-section-title">处理动作</div>
          <div class="handle-panel">
            <div class="handle-summary-card">
              <div class="handle-summary-item">
                <span>当前进度</span>
                <strong>{{ formatIssueStatusLabel(currentIssue.issue_status) }}</strong>
              </div>
            </div>

            <div class="handle-action-group">
              <div class="handle-group-title">业务操作</div>
              <div class="handle-action-grid">
                <button
                  v-for="action in visibleBusinessHandleActionOptions"
                  :key="action.key"
                  type="button"
                  :class="['handle-action-card', handleAction === action.key ? 'active' : '', action.tone]"
                  @click="setHandleAction(action.key)"
                >
                  <strong>{{ action.label }}</strong>
                  <span>{{ action.desc }}</span>
                </button>
              </div>
            </div>

            <div class="handle-action-group">
              <div class="handle-group-title">商务结果</div>
              <div class="handle-action-grid compact">
                <button
                  v-for="action in resultHandleActionOptions"
                  :key="action.key"
                  type="button"
                  :class="['handle-action-card', handleAction === action.key ? 'active' : '', action.tone]"
                  @click="setHandleAction(action.key)"
                >
                  <strong>{{ action.label }}</strong>
                  <span>{{ action.desc }}</span>
                </button>
              </div>
            </div>

            <div class="handle-principal-section">
              <div class="handle-box-title">本金情况</div>
              <a-form layout="vertical" class="handle-note-form">
                <div class="handle-form-grid">
                  <a-form-item label="本金状态">
                    <a-select v-model:value="editForm.principal_status" @change="onPrincipalChange">
                      <a-select-option v-for="status in getPrincipalStatusOptions(currentIssue)" :key="status" :value="status">{{ status }}</a-select-option>
                    </a-select>
                  </a-form-item>
                  <a-form-item
                    v-if="showPrincipalAmountField(editForm.principal_status)"
                    :label="getPrincipalAmountFieldLabel(editForm.principal_status)"
                  >
                    <a-input-number v-model:value="editForm.principal_amount" :min="0" :precision="2" style="width: 100%" :prefix="getCurrencySymbol(currentIssue)" />
                  </a-form-item>
                  <template v-if="editForm.principal_status === '已追回'">
                    <a-form-item label="追回方式">
                      <a-radio-group v-model:value="editForm.recovery_method" button-style="solid">
                        <a-radio-button value="direct">直接退回</a-radio-button>
                        <a-radio-button value="offset">新订单抵消</a-radio-button>
                      </a-radio-group>
                    </a-form-item>
                    <a-form-item v-if="editForm.recovery_method === 'offset'" label="抵消子订单ID">
                      <a-input v-model:value="editForm.recovery_new_sub_order_number" placeholder="填写抵消子订单ID" />
                    </a-form-item>
                  </template>
                  <a-form-item
                    v-if="showPrincipalNoteField(editForm.principal_status)"
                    label="备注说明"
                  >
                    <a-textarea
                      v-model:value="editForm.resolution_notes"
                      :rows="3"
                      :placeholder="getPrincipalNotePlaceholder(editForm.principal_status)"
                    />
                  </a-form-item>
                </div>
              </a-form>
            </div>

            <div v-if="shouldShowHandleActionPanel" class="handle-box">
              <div v-if="shouldShowHandleActionTitle" class="handle-action-head">
                <div class="handle-box-title">{{ getHandleActionTitle() }}</div>
              </div>
              <template v-if="handleAction === 'replace-order'">
                <a-form layout="vertical">
                  <a-form-item label="原订单号">
                    <a-input :value="currentIssue.old_amazon_order_id || '--'" disabled />
                  </a-form-item>
                  <a-form-item label="新订单号">
                    <a-input v-model:value="editForm.new_amazon_order_id" placeholder="输入新的亚马逊订单号..." />
                  </a-form-item>
                </a-form>
              </template>
              <template v-else-if="handleAction === 'recover-principal'">
                <div class="recover-amount-row">
                  <div class="recover-amount-item">
                    <span>实返金额</span>
                    <strong>{{ getRefundDisplayAmount(currentIssue) }}</strong>
                  </div>
                  <div class="recover-amount-item">
                    <span>后台实付金额</span>
                    <strong>{{ getActualPaidDisplayAmount(currentIssue) }}</strong>
                  </div>
                </div>
              </template>

              <template v-else-if="handleAction === 'transfer-other'">
                <a-form layout="vertical" class="handle-note-form">
                  <a-form-item label="转交给">
                    <a-select
                      v-model:value="editForm.transfer_to_staff"
                      show-search
                      placeholder="选择接手业务员"
                      option-filter-prop="label"
                      :options="staffOptions"
                    />
                  </a-form-item>
                </a-form>
              </template>

              <div v-if="!showPrincipalNoteField(editForm.principal_status)" class="handle-principal-section">
                <div class="handle-box-title">备注说明</div>
                <a-textarea
                  v-model:value="editForm.resolution_notes"
                  :rows="3"
                  :placeholder="getHandleNotePlaceholder()"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <div style="flex: 1"></div>
          <a-button @click="drawerOpen = false">关闭</a-button>
          <a-button v-if="drawerMode === 'handle'" type="primary" :loading="saving" @click="handleUpdate">确认操作</a-button>
        </div>
      </template>
    </a-drawer>

    <a-modal
      v-model:open="actionModalOpen"
      :title="actionModalType === 'replace-order' ? '替换单号' : `补单编辑 · ${currentIssue?.sub_order_number || currentIssue?.sub_order_id || '--'}`"
      :width="actionModalType === 'reorder' ? 1080 : 760"
      :confirm-loading="saving"
      :ok-text="actionModalType === 'reorder' ? '确认补单' : '确认'"
      :footer="actionModalType === 'reorder' ? null : undefined"
      destroy-on-close
      @ok="submitActionModal"
      @cancel="closeActionModal"
    >
      <a-form layout="vertical">
        <template v-if="actionModalType === 'replace-order'">
          <div class="action-modal-summary">
            <div class="action-modal-item">
              <span>原亚马逊订单号</span>
              <strong class="mono">{{ currentIssue?.old_amazon_order_id || '--' }}</strong>
            </div>
          </div>
          <a-form-item label="新亚马逊订单号">
            <a-input v-model:value="editForm.new_amazon_order_id" placeholder="输入新的亚马逊订单号..." />
          </a-form-item>
        </template>
        <template v-if="actionModalType === 'reorder'">
          <SubOrderWorkflowEditor
            v-if="reorderEditorTask"
            :task="reorderEditorTask"
            :buyer-list="reorderBuyerOptions"
            sync-edit-experience
            editor-mode="pending-order"
            :show-processed-refund-list="false"
            :show-correction-action="false"
            :show-replace-product-button="true"
            :replace-product-button-label="'更换产品'"
            :progress-badge-class-fn="getReorderTaskProgressBadgeClass"
            :progress-label-fn="getReorderTaskProgressLabel"
            :format-time="fmtShortTime"
            :get-buyer-block-reason="getReorderBuyerBlockReason"
            :on-buyer-select="onReorderBuyerSelect"
            :assign-buyer="assignReorderBuyer"
            :refund-panel-title="getReorderRefundPanelTitle"
            :is-refund-step-readonly="isReorderRefundStepReadonly"
            :processed-refunds-for-display="getReorderProcessedRefunds"
            :aggregate-processed-refunds="aggregateReorderProcessedRefunds"
            :refund-request-type-label="getReorderRefundRequestTypeLabel"
            :infer-actual-paid-usd="inferReorderActualPaidUsd"
            :refund-status-label="getReorderRefundStatusLabel"
            :start-supplemental-refund="startReorderSupplementalRefund"
            :start-correction-refund="startReorderCorrectionRefund"
            :cancel-refund-special-modes="cancelReorderRefundSpecialModes"
            :sync-refund-computed="syncReorderRefundComputed"
            :is-no-refund-selection="isReorderNoRefundSelection"
            :get-refund-final-amount="getReorderRefundFinalAmount"
            :refund-submit-button-text="getReorderRefundSubmitButtonText"
            :submit-refund-request="submitReorderRefundRequest"
            :is-prepay-mode="isReorderPrepayMode"
            :save-amazon-order="saveReorderAmazonOrder"
            :save-screenshot="saveReorderScreenshot"
            :save-order-notes="saveReorderOrderNotes"
            :submit-all-changes="submitReorderEditorChanges"
            :release-to-hall="releaseReorderToHall"
            :transfer-to-other="transferReorderToOther"
            :on-open-replace-product="openReorderReplaceProductHint"
            :format-audit-edit="formatReorderAuditEdit"
          >
            <template #order-notes-extra>
              <div class="reorder-principal-block">
                <div class="reorder-principal-title">本金情况</div>
                <a-form-item label="本金状态">
                  <a-select v-model:value="editForm.principal_status" @change="onPrincipalChange">
                    <a-select-option v-for="status in getPrincipalStatusOptions(currentIssue)" :key="status" :value="status">{{ status }}</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item
                  v-if="showPrincipalAmountField(editForm.principal_status)"
                  :label="getPrincipalAmountFieldLabel(editForm.principal_status)"
                >
                  <a-input-number v-model:value="editForm.principal_amount" :min="0" :precision="2" style="width: 100%" :prefix="getCurrencySymbol(currentIssue)" />
                </a-form-item>
              </div>
            </template>
          </SubOrderWorkflowEditor>
        </template>
          <a-form-item v-if="actionModalType === 'replace-order'" label="本金状态">
          <a-select v-model:value="editForm.principal_status" @change="onPrincipalChange">
            <a-select-option v-for="status in getPrincipalStatusOptions(currentIssue)" :key="status" :value="status">{{ status }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="actionModalType === 'replace-order' && showPrincipalAmountField(editForm.principal_status)"
          :label="getPrincipalAmountFieldLabel(editForm.principal_status)"
        >
          <a-input-number v-model:value="editForm.principal_amount" :min="0" :precision="2" style="width: 100%" :prefix="getCurrencySymbol(currentIssue)" />
        </a-form-item>
        <a-form-item v-if="actionModalType === 'replace-order'" label="备注说明">
          <a-textarea v-model:value="editForm.resolution_notes" :rows="3" :placeholder="actionModalType === 'replace-order' ? '说明替换单号原因...' : '说明补单原因和安排...'" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'
import SubOrderWorkflowEditor from './SubOrderWorkflowEditor.vue'

const props = withDefaults(defineProps<{
  staffId?: string
  issueId?: string
  subOrder?: string
  showStats?: boolean
}>(), {
  staffId: undefined,
  issueId: undefined,
  subOrder: undefined,
  showStats: true,
})

const emit = defineEmits<{
  (e: 'changed'): void
}>()

const MOCK_AFTER_SALE_ISSUES_KEY = 'mock_after_sale_issue_list_v11'
const MOCK_AFTER_SALE_ISSUES = [
  {
    id: 'mock_after_sale_principal_overpaid',
    issue_number: 'ASI-MOCK-20260415-0001',
    sub_order_id: 'mock_sub_order_principal_overpaid',
    sub_order_number: 'SUB-MOCK-AS-2001',
    order_number: 'MOCK-AS-2001',
    buyer_name: 'Liam Carter',
    staff_name: '王浩',
    customer_name: '深圳云帆科技',
    business_manager_name: '陈婷',
    asin: 'B0MOCKAS2001',
    store_name: 'US-Store-09',
    product_price: 18.9,
    issue_type: '本金多返',
    issue_status: '待处理',
    principal_status: '待追回',
    principal_amount: 4.5,
    principal_reason: '原应返 18.90 USD，误返 23.40 USD，待追回差价。',
    old_amazon_order_id: '333-3333333-3333333',
    amazon_order_placed_at: dayjs().subtract(20, 'day').hour(16).minute(10).second(0).millisecond(0).toISOString(),
    resolution_notes: '已联系买手确认退回多返本金，等待到账。',
    description: '财务多返了 4.50 USD，本金差价待追回。',
    created_at: dayjs().subtract(18, 'day').hour(9).minute(30).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(18, 'day').hour(10).minute(20).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '本金多返，待追回差价', time: dayjs().subtract(18, 'day').hour(9).minute(30).toISOString(), type: 'created' },
      { title: '联系买手', desc: '确认多返 $4.50，等待买手退回', time: dayjs().subtract(18, 'day').hour(10).minute(20).toISOString(), type: 'processing' },
    ],
  },
  {
    id: 'mock_after_sale_replace_order',
    issue_number: 'ASI-MOCK-20260502-0002',
    sub_order_id: 'mock_sub_order_replace_order',
    sub_order_number: 'SUB-MOCK-AS-2002',
    order_number: 'MOCK-AS-2002',
    buyer_name: 'Emma Wilson',
    staff_name: '李娜',
    customer_name: '杭州晨星贸易',
    business_manager_name: '赵蕾',
    asin: 'B0MOCKAS2002',
    store_name: 'US-Store-12',
    product_name: 'Wireless Milk Frother',
    product_price: 25.99,
    commission_fee: 42,
    issue_type: '无此订单',
    issue_status: '已替换单号',
    principal_status: '正常',
    old_amazon_order_id: '111-1111111-1111111',
    amazon_order_placed_at: dayjs().subtract(12, 'day').hour(9).minute(45).second(0).millisecond(0).toISOString(),
    new_amazon_order_id: '222-2222222-2222222',
    buyer_chat_id: 'CHAT-US-2002',
    description: '客户核对后台无此订单，需要业务员确认买手填写的订单号。',
    resolution_notes: '买手确认填写错误，已将订单号从 111-1111111-1111111 修改为 222-2222222-2222222。',
    created_at: dayjs().subtract(10, 'day').hour(14).minute(10).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(9, 'day').hour(11).minute(25).second(0).millisecond(0).toISOString(),
    resolved_at: dayjs().subtract(9, 'day').hour(11).minute(25).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '无此订单，订单号待核对', time: dayjs().subtract(10, 'day').hour(14).minute(10).toISOString(), type: 'created' },
      { title: '核对订单号', desc: '买手反馈原订单号填写错误', time: dayjs().subtract(10, 'day').hour(17).minute(40).toISOString(), type: 'processing' },
      { title: '已替换单号', desc: '订单号：111-1111111-1111111 -> 222-2222222-2222222', time: dayjs().subtract(9, 'day').hour(11).minute(25).toISOString(), type: 'resolved' },
    ],
  },
  {
    id: 'mock_after_sale_reorder',
    issue_number: 'ASI-MOCK-20260505-0003',
    sub_order_id: 'mock_sub_order_reorder',
    sub_order_number: 'SUB-MOCK-AS-2003',
    order_number: 'MOCK-AS-2003',
    buyer_name: 'Noah Brown',
    staff_name: '周敏',
    customer_name: '宁波艾森家居',
    business_manager_name: '黄思',
    asin: 'B0MOCKAS2003',
    store_name: 'CA-Store-03',
    product_name: 'Pet Grooming Glove',
    product_price: 14.5,
    commission_fee: 36,
    issue_type: '不下单',
    issue_status: '已补单',
    principal_status: '正常',
    old_amazon_order_id: '',
    new_amazon_order_id: '777-7777777-7777777',
    amazon_order_placed_at: '',
    replacement_buyer_name: 'Olivia Davis',
    replacement_sub_order_number: 'SUB-MOCK-AS-2103',
    buyer_chat_id: 'CHAT-CA-2003',
    description: '原买手接单后未下单且失联，需要重新安排补单。',
    resolution_notes: '已从 SUB-MOCK-AS-2003 补单到 SUB-MOCK-AS-2103，新订单号为 777-7777777-7777777。',
    created_at: dayjs().subtract(7, 'day').hour(10).minute(5).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(6, 'day').hour(15).minute(15).second(0).millisecond(0).toISOString(),
    resolved_at: dayjs().subtract(6, 'day').hour(15).minute(15).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '原买手未下单', time: dayjs().subtract(7, 'day').hour(10).minute(5).toISOString(), type: 'created' },
      { title: '判定无新单号', desc: '原买手失联，转补单处理', time: dayjs().subtract(7, 'day').hour(16).minute(30).toISOString(), type: 'processing' },
      { title: '已补单', desc: '订单号：-- -> 777-7777777-7777777；子单ID：SUB-MOCK-AS-2003 -> SUB-MOCK-AS-2103', time: dayjs().subtract(6, 'day').hour(15).minute(15).toISOString(), type: 'resolved' },
    ],
  },
  {
    id: 'mock_after_sale_refund_loss',
    issue_number: 'ASI-MOCK-20260508-0004',
    sub_order_id: 'mock_sub_order_refund_loss',
    sub_order_number: 'SUB-MOCK-AS-2004',
    order_number: 'MOCK-AS-2004',
    buyer_name: 'Mia Taylor',
    staff_name: '王浩',
    customer_name: '广州星河电子',
    business_manager_name: '陈婷',
    asin: 'B0MOCKAS2004',
    store_name: 'UK-Store-02',
    product_name: 'USB C Desk Charger',
    product_price: 31.8,
    commission_fee: 48,
    issue_type: '退款',
    issue_status: '无需处理',
    principal_status: '已损失',
    principal_amount: 31.8,
    principal_reason: '买手已退款但本金无法追回，确认为本金损失。',
    old_amazon_order_id: '444-4444444-4444444',
    amazon_order_placed_at: dayjs().subtract(6, 'day').hour(10).minute(30).second(0).millisecond(0).toISOString(),
    buyer_chat_id: 'CHAT-UK-2004',
    refund_to_client_method: '余额抵扣',
    refund_to_client_amount: 31.8,
    refund_to_client_notes: '客户同意转为余额抵扣。',
    description: '买手退款导致客户订单无法继续，需确认客户处理方式和本金损失。',
    resolution_notes: '客户已确认余额抵扣，本金记录为损失。',
    created_at: dayjs().subtract(4, 'day').hour(13).minute(0).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(3, 'day').hour(16).minute(45).second(0).millisecond(0).toISOString(),
    resolved_at: dayjs().subtract(3, 'day').hour(16).minute(45).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '退款导致订单无法继续', time: dayjs().subtract(4, 'day').hour(13).minute(0).toISOString(), type: 'created' },
      { title: '确认本金损失', desc: '本金损失 $31.80', time: dayjs().subtract(4, 'day').hour(18).minute(10).toISOString(), type: 'processing' },
      { title: '无需处理', desc: '客户已确认余额抵扣 $31.80', time: dayjs().subtract(3, 'day').hour(16).minute(45).toISOString(), type: 'resolved' },
    ],
  },
  {
    id: 'mock_after_sale_cancel_pending',
    issue_number: 'ASI-MOCK-20260511-0005',
    sub_order_id: 'mock_sub_order_cancel_pending',
    sub_order_number: 'SUB-MOCK-AS-2005',
    order_number: 'MOCK-AS-2005',
    buyer_name: 'Lucas Moore',
    staff_name: '李娜',
    customer_name: '厦门蓝鲸科技',
    business_manager_name: '赵蕾',
    asin: 'B0MOCKAS2005',
    store_name: 'DE-Store-04',
    product_name: 'Kitchen Timer Digital',
    product_price: 12.99,
    commission_fee: 30,
    issue_type: '取消',
    issue_status: '处理中',
    principal_status: '待确定',
    old_amazon_order_id: '555-5555555-5555555',
    amazon_order_placed_at: dayjs().subtract(2, 'day').hour(18).minute(20).second(0).millisecond(0).toISOString(),
    buyer_chat_id: 'CHAT-DE-2005',
    description: '客户临时取消订单，需要确认是否已下单、是否涉及本金损失。',
    resolution_notes: '已联系买手确认取消节点，等待买手回复。',
    created_at: dayjs().subtract(1, 'day').hour(11).minute(20).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(1, 'day').hour(15).minute(5).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '客户取消，待确认执行状态', time: dayjs().subtract(1, 'day').hour(11).minute(20).toISOString(), type: 'created' },
      { title: '处理中', desc: '等待买手确认是否已下单', time: dayjs().subtract(1, 'day').hour(15).minute(5).toISOString(), type: 'processing' },
    ],
  },
  {
    id: 'mock_after_sale_need_reorder',
    issue_number: 'ASI-MOCK-20260513-0006',
    sub_order_id: 'mock_sub_order_need_reorder',
    sub_order_number: 'SUB-MOCK-AS-2006',
    order_number: 'MOCK-AS-2006',
    buyer_name: 'Sophia Miller',
    staff_name: '周敏',
    customer_name: '苏州新禾贸易',
    business_manager_name: '黄思',
    asin: 'B0MOCKAS2006',
    store_name: 'US-Store-18',
    product_name: 'Portable Neck Fan',
    keyword: 'portable neck fan',
    keyword_type: 'keyword',
    order_type: '图片评',
    review_type: '图片评',
    review_level: 'B',
    product_price: 19.8,
    commission_fee: 34,
    issue_type: '退款',
    issue_status: '无新单号',
    principal_status: '待确定',
    principal_amount: 19.8,
    principal_reason: '客户要求补单，但原单是否已退款仍在核对。',
    old_amazon_order_id: '666-1234567-7654321',
    amazon_order_placed_at: dayjs().subtract(5, 'day').hour(12).minute(35).second(0).millisecond(0).toISOString(),
    buyer_chat_id: 'CHAT-US-2006',
    description: '买手已反馈原订单无法继续，先标记无新单号，等待业务员补齐新单信息。',
    resolution_notes: '已先标记无新单号，待确认新买手与新子订单。',
    created_at: dayjs().subtract(3, 'day').hour(10).minute(15).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(2, 'day').hour(18).minute(20).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '退款导致原单无法继续', time: dayjs().subtract(3, 'day').hour(10).minute(15).toISOString(), type: 'created' },
      { title: '判定无新单号', desc: '先进入无新单号状态，等待补齐新单资料', time: dayjs().subtract(2, 'day').hour(18).minute(20).toISOString(), type: 'processing' },
    ],
  },
  {
    id: 'mock_after_sale_grab_hall',
    issue_number: 'ASI-MOCK-20260515-0010',
    sub_order_id: 'mock_sub_order_grab_hall',
    sub_order_number: 'SUB-MOCK-AS-2010',
    order_number: 'MOCK-AS-2010',
    buyer_name: 'Charlotte Green',
    staff_name: '陈晨',
    customer_name: '佛山易行家居',
    business_manager_name: '黄思',
    asin: 'B0MOCKAS2010',
    store_name: 'UK-Store-11',
    country: '英国',
    product_name: 'Wireless Doorbell Kit',
    product_price: 22.5,
    commission_fee: 33,
    issue_type: '退款',
    issue_status: '处理中',
    transfer_to_staff: 'GRAB_HALL',
    principal_status: '已损失',
    principal_amount: 22.5,
    actual_paid_usd: 22.5,
    old_amazon_order_id: '101-2020202-3030303',
    amazon_order_placed_at: dayjs().subtract(4, 'day').hour(13).minute(15).second(0).millisecond(0).toISOString(),
    buyer_chat_id: 'CHAT-UK-2010',
    description: '原买手退款后无法继续下单，已转入抢单大厅等待其他业务员接手。',
    resolution_notes: '已放入抢单大厅，保留原责任人可追溯信息，等待接手人继续补单。',
    created_at: dayjs().subtract(4, 'day').hour(15).minute(0).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(3, 'day').hour(11).minute(30).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '退款后需要重新安排处理', time: dayjs().subtract(4, 'day').hour(15).minute(0).toISOString(), type: 'created' },
      { title: '放入抢单大厅', desc: '当前单继续展示在问题单列表，等待大厅接手', time: dayjs().subtract(3, 'day').hour(11).minute(30).toISOString(), type: 'processing' },
    ],
  },
  {
    id: 'mock_after_sale_transfer_other',
    issue_number: 'ASI-MOCK-20260515-0011',
    sub_order_id: 'mock_sub_order_transfer_other',
    sub_order_number: 'SUB-MOCK-AS-2011',
    order_number: 'MOCK-AS-2011',
    buyer_name: 'Henry Clark',
    staff_name: '李娜',
    customer_name: '东莞创想数码',
    business_manager_name: '赵蕾',
    asin: 'B0MOCKAS2011',
    store_name: 'US-Store-21',
    country: '美国',
    product_name: 'LED Strip Lights',
    product_price: 16.8,
    commission_fee: 28,
    issue_type: '取消',
    issue_status: '处理中',
    transfer_to_staff: 'mock_staff_li_na',
    principal_status: '已损失',
    principal_amount: 16.8,
    actual_paid_usd: 16.8,
    old_amazon_order_id: '112-3344556-7788990',
    amazon_order_placed_at: dayjs().subtract(3, 'day').hour(10).minute(20).second(0).millisecond(0).toISOString(),
    buyer_chat_id: 'CHAT-US-2011',
    description: '当前业务员无法继续跟进，已转交给其他业务员处理。',
    resolution_notes: '已转交给李娜继续处理，等待补单或关闭结论。',
    created_at: dayjs().subtract(3, 'day').hour(12).minute(0).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(2, 'day').hour(9).minute(40).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '取消后待确认后续处理', time: dayjs().subtract(3, 'day').hour(12).minute(0).toISOString(), type: 'created' },
      { title: '转给他人', desc: '转交给李娜继续处理', time: dayjs().subtract(2, 'day').hour(9).minute(40).toISOString(), type: 'processing' },
    ],
  },
  {
    id: 'mock_after_sale_principal_recovered_open',
    issue_number: 'ASI-MOCK-20260516-0016',
    sub_order_id: 'mock_sub_order_principal_recovered_open',
    sub_order_number: 'SUB-MOCK-AS-2016',
    order_number: 'MOCK-AS-2016',
    buyer_name: 'Isabella Reed',
    staff_name: '王浩',
    customer_name: '珠海远航电商',
    business_manager_name: '陈婷',
    asin: 'B0MOCKAS2016',
    store_name: 'US-Store-25',
    country: '美国',
    product_name: 'Magnetic Phone Mount',
    product_price: 21.5,
    commission_fee: 32,
    issue_type: '退款',
    issue_status: '处理中',
    principal_status: '已追回',
    principal_amount: 8.6,
    recovered_amount: 8.6,
    recovery_method: 'direct',
    actual_paid_usd: 21.5,
    old_amazon_order_id: '113-6677889-4455667',
    amazon_order_placed_at: dayjs().subtract(4, 'day').hour(14).minute(10).second(0).millisecond(0).toISOString(),
    buyer_chat_id: 'CHAT-US-2016',
    description: '买手已退回部分本金，本金状态记为已追回，问题单仍在跟进后续处理。',
    resolution_notes: '已追回本金 $8.60，方式：直接退回。',
    created_at: dayjs().subtract(4, 'day').hour(15).minute(20).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(1, 'day').hour(11).minute(5).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '退款后存在本金待确认', time: dayjs().subtract(4, 'day').hour(15).minute(20).toISOString(), type: 'created' },
      { title: '已追回', desc: '买手直接退回 $8.60', time: dayjs().subtract(1, 'day').hour(11).minute(5).toISOString(), type: 'processing' },
    ],
  },
  {
    id: 'mock_after_sale_recovered_principal',
    issue_number: 'ASI-MOCK-20260516-0007',
    sub_order_id: 'mock_sub_order_recovered_principal',
    sub_order_number: 'SUB-MOCK-AS-2007',
    order_number: 'MOCK-AS-2007',
    buyer_name: 'Ethan Walker',
    staff_name: '王浩',
    customer_name: '深圳蓝图电商',
    business_manager_name: '陈婷',
    asin: 'B0MOCKAS2007',
    store_name: 'US-Store-20',
    product_name: 'Mini Label Printer',
    product_price: 27.6,
    commission_fee: 40,
    issue_type: '本金多返',
    issue_status: '已追回本金',
    principal_status: '已追回',
    principal_amount: 6.2,
    principal_reason: '原多返金额已通过新单抵扣追回。',
    old_amazon_order_id: '777-1111222-3333444',
    amazon_order_placed_at: dayjs().subtract(9, 'day').hour(15).minute(10).second(0).millisecond(0).toISOString(),
    buyer_chat_id: 'CHAT-US-2007',
    recovered_amount: 6.2,
    recovery_method: 'offset',
    recovery_new_sub_order_number: 'SUB-MOCK-AS-2207',
    replacement_sub_order_number: 'SUB-MOCK-AS-2207',
    description: '财务误多返本金，已通过后续订单抵扣追回。',
    resolution_notes: '追回本金 $6.20，方式：新订单抵消，抵消子订单ID：SUB-MOCK-AS-2207',
    created_at: dayjs().subtract(8, 'day').hour(11).minute(40).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(6, 'day').hour(9).minute(18).second(0).millisecond(0).toISOString(),
    resolved_at: dayjs().subtract(6, 'day').hour(9).minute(18).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '检测到多返本金 $6.20', time: dayjs().subtract(8, 'day').hour(11).minute(40).toISOString(), type: 'created' },
      { title: '处理中', desc: '确认通过新单 SUB-MOCK-AS-2207 抵扣追回', time: dayjs().subtract(7, 'day').hour(14).minute(5).toISOString(), type: 'processing' },
      { title: '已追回本金', desc: '已通过新单抵扣追回 $6.20', time: dayjs().subtract(6, 'day').hour(9).minute(18).toISOString(), type: 'resolved' },
    ],
  },
  {
    id: 'mock_after_sale_closed_case',
    issue_number: 'ASI-MOCK-20260519-0008',
    sub_order_id: 'mock_sub_order_closed_case',
    sub_order_number: 'SUB-MOCK-AS-2008',
    order_number: 'MOCK-AS-2008',
    buyer_name: 'Ava Martinez',
    staff_name: '李娜',
    customer_name: '青岛智联家居',
    business_manager_name: '赵蕾',
    asin: 'B0MOCKAS2008',
    store_name: 'UK-Store-07',
    product_name: 'Smart Cabinet Light',
    product_price: 16.4,
    commission_fee: 28,
    issue_type: '取消',
    issue_status: '已关闭',
    principal_status: '正常',
    old_amazon_order_id: '888-5555666-1111222',
    amazon_order_placed_at: dayjs().subtract(11, 'day').hour(8).minute(55).second(0).millisecond(0).toISOString(),
    buyer_chat_id: 'CHAT-UK-2008',
    description: '客户主动取消并确认不再补单，问题单直接关闭。',
    resolution_notes: '客户确认终止执行，不补单也不追加返款，售后单关闭。',
    created_at: dayjs().subtract(10, 'day').hour(13).minute(25).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(8, 'day').hour(17).minute(50).second(0).millisecond(0).toISOString(),
    resolved_at: dayjs().subtract(8, 'day').hour(17).minute(50).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '客户取消订单，待确认后续是否继续', time: dayjs().subtract(10, 'day').hour(13).minute(25).toISOString(), type: 'created' },
      { title: '客户确认终止', desc: '客户明确不再补单，结束本次处理', time: dayjs().subtract(8, 'day').hour(17).minute(50).toISOString(), type: 'resolved' },
    ],
  },
  {
    id: 'mock_after_sale_pending_replace',
    issue_number: 'ASI-MOCK-20260522-0009',
    sub_order_id: 'mock_sub_order_pending_replace',
    sub_order_number: 'SUB-MOCK-AS-2009',
    order_number: 'MOCK-AS-2009',
    buyer_name: 'Benjamin Young',
    staff_name: '陈晨',
    customer_name: '温州麦禾科技',
    business_manager_name: '黄思',
    asin: 'B0MOCKAS2009',
    store_name: 'CA-Store-09',
    product_name: 'Travel Pill Organizer',
    product_price: 13.7,
    commission_fee: 26,
    issue_type: '无此订单',
    issue_status: '待处理',
    principal_status: '待确定',
    old_amazon_order_id: '999-0000111-2222333',
    amazon_order_placed_at: dayjs().subtract(2, 'day').hour(9).minute(12).second(0).millisecond(0).toISOString(),
    buyer_chat_id: 'CHAT-CA-2009',
    description: '客户后台未查到订单，待业务员联系买手核对是否填错订单号。',
    resolution_notes: '',
    created_at: dayjs().subtract(2, 'day').hour(16).minute(45).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(2, 'day').hour(16).minute(45).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '后台无此订单，待联系买手核对', time: dayjs().subtract(2, 'day').hour(16).minute(45).toISOString(), type: 'created' },
    ],
  },
  {
    id: 'mock_after_sale_pending_overpaid_waiting',
    issue_number: 'ASI-MOCK-20260524-0011',
    sub_order_id: 'mock_sub_order_pending_overpaid_waiting',
    sub_order_number: 'SUB-MOCK-AS-2011',
    order_number: 'MOCK-AS-2011',
    buyer_name: 'Mason Hall',
    staff_name: '王浩',
    customer_name: '上海起帆贸易',
    business_manager_name: '陈婷',
    asin: 'B0MOCKAS2011',
    store_name: 'JP-Store-01',
    country: 'JP',
    product_name: 'Mini Desk Humidifier',
    product_price: 2980,
    actual_paid_usd: 2980,
    issue_type: '本金多返',
    issue_status: '待处理',
    principal_status: '待追回',
    principal_amount: 420,
    old_amazon_order_id: '201-1010101-9090909',
    amazon_order_placed_at: dayjs().subtract(3, 'day').hour(10).minute(20).second(0).millisecond(0).toISOString(),
    description: '财务多返了 420 日元，待业务员确认追回路径。',
    resolution_notes: '',
    created_at: dayjs().subtract(3, 'day').hour(11).minute(0).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(3, 'day').hour(11).minute(0).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '检测到本金多返，等待确认追回方式', time: dayjs().subtract(3, 'day').hour(11).minute(0).toISOString(), type: 'created' },
    ],
  },
  {
    id: 'mock_after_sale_processing_refund_contact',
    issue_number: 'ASI-MOCK-20260526-0012',
    sub_order_id: 'mock_sub_order_processing_refund_contact',
    sub_order_number: 'SUB-MOCK-AS-2012',
    order_number: 'MOCK-AS-2012',
    buyer_name: 'Ella King',
    staff_name: '周敏',
    customer_name: '成都赛远电子',
    business_manager_name: '黄思',
    asin: 'B0MOCKAS2012',
    store_name: 'CA-Store-13',
    country: '加拿大',
    product_name: 'Travel Neck Pillow',
    product_price: 24.6,
    actual_paid_usd: 24.6,
    issue_type: '退款',
    issue_status: '处理中',
    principal_status: '待确定',
    old_amazon_order_id: '202-4545454-6767676',
    amazon_order_placed_at: dayjs().subtract(2, 'day').hour(8).minute(40).second(0).millisecond(0).toISOString(),
    buyer_chat_id: 'CHAT-CA-2012',
    description: '买手反馈原订单已退款，正在确认客户是否改补单。',
    resolution_notes: '已联系客户确认是否继续执行，等待答复。',
    created_at: dayjs().subtract(2, 'day').hour(9).minute(10).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(1, 'day').hour(14).minute(25).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '退款后待确认客户下一步要求', time: dayjs().subtract(2, 'day').hour(9).minute(10).toISOString(), type: 'created' },
      { title: '处理中', desc: '已向客户和买手同步确认进度', time: dayjs().subtract(1, 'day').hour(14).minute(25).toISOString(), type: 'processing' },
    ],
  },
  {
    id: 'mock_after_sale_no_need_processed',
    issue_number: 'ASI-MOCK-20260527-0013',
    sub_order_id: 'mock_sub_order_no_need_processed',
    sub_order_number: 'SUB-MOCK-AS-2013',
    order_number: 'MOCK-AS-2013',
    buyer_name: 'Henry Scott',
    staff_name: '李娜',
    customer_name: '南京柏域科技',
    business_manager_name: '赵蕾',
    asin: 'B0MOCKAS2013',
    store_name: 'DE-Store-06',
    country: '德国',
    product_name: 'Kitchen Sink Caddy',
    product_price: 18.3,
    actual_paid_usd: 18.3,
    issue_type: '无此订单',
    issue_status: '无需处理',
    principal_status: '正常',
    old_amazon_order_id: '203-7878787-5656565',
    new_amazon_order_id: '203-9090909-3434343',
    amazon_order_placed_at: dayjs().subtract(6, 'day').hour(12).minute(30).second(0).millisecond(0).toISOString(),
    description: '客户误查旧后台，核对后确认订单正常，无需继续处理。',
    resolution_notes: '已与客户核对真实订单号，原问题单关闭为无需处理。',
    created_at: dayjs().subtract(6, 'day').hour(13).minute(0).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(5, 'day').hour(10).minute(40).second(0).millisecond(0).toISOString(),
    resolved_at: dayjs().subtract(5, 'day').hour(10).minute(40).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '客户后台未查到订单', time: dayjs().subtract(6, 'day').hour(13).minute(0).toISOString(), type: 'created' },
      { title: '无需处理', desc: '核对后确认订单正常，无需补单', time: dayjs().subtract(5, 'day').hour(10).minute(40).toISOString(), type: 'resolved' },
    ],
  },
  {
    id: 'mock_after_sale_recent_replace_processed',
    issue_number: 'ASI-MOCK-20260703-0014',
    sub_order_id: 'mock_sub_order_recent_replace_processed',
    sub_order_number: 'SUB-MOCK-AS-2014',
    order_number: 'MOCK-AS-2014',
    buyer_name: 'Grace Turner',
    staff_name: '陈晨',
    customer_name: '杭州星舟贸易',
    business_manager_name: '黄思',
    asin: 'B0MOCKAS2014',
    store_name: 'US-Store-22',
    country: '美国',
    product_name: 'Foldable Laptop Stand',
    product_price: 29.9,
    actual_paid_usd: 29.9,
    issue_type: '无此订单',
    issue_status: '已替换单号',
    principal_status: '正常',
    old_amazon_order_id: '204-1111222-3333444',
    new_amazon_order_id: '204-9999888-7777666',
    amazon_order_placed_at: dayjs().subtract(5, 'day').hour(10).minute(15).second(0).millisecond(0).toISOString(),
    buyer_chat_id: 'CHAT-US-2014',
    description: '买手原订单号填错，已核对并更正。',
    resolution_notes: '已完成订单号替换并同步客户。',
    created_at: dayjs().subtract(4, 'day').hour(9).minute(20).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(3, 'day').hour(15).minute(45).second(0).millisecond(0).toISOString(),
    resolved_at: dayjs().subtract(3, 'day').hour(15).minute(45).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '客户未查到原订单号', time: dayjs().subtract(4, 'day').hour(9).minute(20).toISOString(), type: 'created' },
      { title: '已替换单号', desc: '已更新为正确的新订单号', time: dayjs().subtract(3, 'day').hour(15).minute(45).toISOString(), type: 'resolved' },
    ],
  },
  {
    id: 'mock_after_sale_recent_reorder_processed',
    issue_number: 'ASI-MOCK-20260704-0015',
    sub_order_id: 'mock_sub_order_recent_reorder_processed',
    sub_order_number: 'SUB-MOCK-AS-2015',
    order_number: 'MOCK-AS-2015',
    buyer_name: 'Jack Brooks',
    staff_name: '周敏',
    customer_name: '宁波蓝湾科技',
    business_manager_name: '陈婷',
    asin: 'B0MOCKAS2015',
    store_name: 'CA-Store-16',
    country: '加拿大',
    product_name: 'Portable Blender Bottle',
    product_price: 26.4,
    actual_paid_usd: 26.4,
    issue_type: '不下单',
    issue_status: '已补单',
    principal_status: '已损失',
    principal_amount: 26.4,
    old_amazon_order_id: '',
    new_amazon_order_id: '205-1234432-5678876',
    replacement_sub_order_number: 'SUB-MOCK-AS-2215',
    replacement_buyer_name: 'Amelia White',
    amazon_order_placed_at: '',
    buyer_chat_id: 'CHAT-CA-2015',
    description: '原买手未下单，已重新安排补单。',
    resolution_notes: '已补新单并生成新的子订单。',
    created_at: dayjs().subtract(3, 'day').hour(11).minute(10).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(2, 'day').hour(16).minute(5).second(0).millisecond(0).toISOString(),
    resolved_at: dayjs().subtract(2, 'day').hour(16).minute(5).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '原买手超时未下单', time: dayjs().subtract(3, 'day').hour(11).minute(10).toISOString(), type: 'created' },
      { title: '已补单', desc: '已回流到新子订单继续执行', time: dayjs().subtract(2, 'day').hour(16).minute(5).toISOString(), type: 'resolved' },
    ],
  },
]

const loading = ref(false)
const saving = ref(false)
const exporting = ref(false)
const issues = ref<any[]>([])
const filterStatus = ref<string | undefined>(undefined)
const filterType = ref<string | undefined>(undefined)
const filterCountry = ref<string | undefined>(undefined)
const filterResolutionResult = ref<string | undefined>(undefined)
const filterPrincipalStatus = ref<string | undefined>(undefined)
const filterSearch = ref('')
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(29, 'day'), dayjs()])
const drawerOpen = ref(false)
const currentIssue = ref<any>(null)
const actionModalOpen = ref(false)
const actionModalType = ref<'replace-order' | 'reorder' | ''>('')
const drawerMode = ref<'detail' | 'handle'>('detail')
type HandleActionKey = 'mark-need-reorder' | 'replace-order' | 'reorder' | 'recover-principal' | 'transfer-other' | 'release-grab' | 'mark-closed' | 'mark-no-need' | 'revoke'
const handleAction = ref<HandleActionKey | ''>('')
const editingProgressId = ref('')
const progressDraft = reactive({
  status: '待处理',
})
const pagination = ref({ current: 1, pageSize: 20, total: 0 })

const issueTypes = ['不下单', '取消', '退款', '无此订单', '本金多返']
const countryOptions = ['美国', '德国', '英国', '加拿大']
const COUNTRY_FILTER_ALIASES: Record<string, string[]> = {
  '美国': ['美国', 'US', 'USA'],
  '德国': ['德国', 'DE'],
  '英国': ['英国', 'UK', 'GB'],
  '加拿大': ['加拿大', 'CA'],
}
const processStatusOptions = ['待处理', '处理中', '处理中-转给他人', '处理中-无新单号', '处理中-抢单大厅', '已处理']
const resolutionResultOptions = ['替换单号', '补单', '追回本金', '无需处理', '已关闭']
const principalStatusOptions = ['正常', '待确定', '待追回', '已追回', '已损失']
const inlineProcessStatusOptions = ['待处理', '处理中', '无新单号']

const issueTypeColor: Record<string, string> = {
  '不下单': 'orange',
  '取消': 'red',
  '退款': 'blue',
  '无此订单': 'volcano',
  '本金多返': 'gold',
}

const statusColorMap: Record<string, string> = {
  '待处理': 'orange',
  '处理中': 'processing',
  '已处理': 'blue',
  '已替换单号': 'cyan',
  '替换单号': 'cyan',
  '无新单号': 'red',
  '已补单': 'green',
  '补单': 'green',
  '已追回本金': 'green',
  '追回本金': 'green',
  '无需处理': 'purple',
  '已关闭': 'default',
}

const COUNTRY_CURRENCY_META: Record<string, { code: string; symbol: string; locale: string }> = {
  US: { code: 'USD', symbol: '$', locale: 'en-US' },
  CA: { code: 'CAD', symbol: 'CA$', locale: 'en-CA' },
  UK: { code: 'GBP', symbol: 'GBP', locale: 'en-GB' },
  GB: { code: 'GBP', symbol: 'GBP', locale: 'en-GB' },
  DE: { code: 'EUR', symbol: 'EUR', locale: 'de-DE' },
  FR: { code: 'EUR', symbol: 'EUR', locale: 'fr-FR' },
  IT: { code: 'EUR', symbol: 'EUR', locale: 'it-IT' },
  ES: { code: 'EUR', symbol: 'EUR', locale: 'es-ES' },
  NL: { code: 'EUR', symbol: 'EUR', locale: 'nl-NL' },
  BE: { code: 'EUR', symbol: 'EUR', locale: 'nl-BE' },
  IE: { code: 'EUR', symbol: 'EUR', locale: 'en-IE' },
  JP: { code: 'JPY', symbol: 'JPY', locale: 'ja-JP' },
  AU: { code: 'AUD', symbol: 'A$', locale: 'en-AU' },
}

const stats = ref({
  total: 0,
  pending: 0,
  processing: 0,
  needReorder: 0,
  handled: 0,
  todayHandled: 0,
  principalLossCount: 0,
  principalLossAmount: 0,
})

const buyerResults = ref<any[]>([])
const searchingBuyers = ref(false)
const staffOptions = ref<{ label: string; value: string }[]>([])
const reorderBuyerOptions = ref<any[]>([])
const reorderEditorTask = ref<any | null>(null)

const editForm = reactive({
  principal_status: '待确定',
  principal_reason: '',
  principal_amount: 0,
  recovered_amount: 0,
  recovery_method: 'direct',
  recovery_new_sub_order_number: '',
  new_amazon_order_id: '',
  profit_diff: 0,
  loss_amount: 0,
  replacement_buyer_id: undefined as string | undefined,
  replacement_buyer_name: '',
  replacement_sub_order_number: '',
  refund_to_client_method: '',
  refund_to_client_amount: 0,
  refund_to_client_notes: '',
  resolution_notes: '',
  transfer_to_staff: '',
  issue_status: '待处理',
  blacklist_buyer: false,
})

const handleActionOptions: Array<{
  key: HandleActionKey
  label: string
  desc: string
  tone?: string
}> = [
  { key: 'reorder', label: '补单', desc: '生成新子订单并回流处理', tone: 'is-primary' },
  { key: 'replace-order', label: '替换单号', desc: '同个买手需替换订单号' },
  { key: 'transfer-other', label: '转给他人', desc: '当前业务员处理不了，转交他人', tone: 'is-purple' },
  { key: 'release-grab', label: '放入抢单大厅', desc: '释放给所有业务员处理', tone: 'is-purple' },
  { key: 'recover-principal', label: '追回本金', desc: '记录追回金额和方式', tone: 'is-success' },
  { key: 'mark-closed', label: '关闭', desc: '不再继续处理此单', tone: 'is-purple' },
  { key: 'mark-no-need', label: '无需处理', desc: '卖家已确定无需补单', tone: 'is-purple' },
  { key: 'revoke', label: '撤销', desc: '彻底删除此问题单', tone: 'is-danger' },
]

const businessHandleActionOptions = computed(() =>
  handleActionOptions.filter(action => !['mark-closed', 'mark-no-need', 'revoke'].includes(action.key))
)

const resultHandleActionOptions = computed(() =>
  handleActionOptions.filter(action => ['mark-closed', 'mark-no-need', 'revoke'].includes(action.key))
)

const visibleBusinessHandleActionOptions = computed(() => {
  if (currentIssue.value?.issue_type === '本金多返') {
    return businessHandleActionOptions.value.filter(action => action.key === 'recover-principal')
  }
  return businessHandleActionOptions.value.filter(action => action.key !== 'recover-principal')
})

const columns = computed(() => {
  const baseColumns: any[] = [
  { title: '产品信息', key: 'product_info', width: 200 },
  { title: '订单信息', key: 'sub_info', width: 180 },
  { title: '客户/商务', key: 'client', width: 140 },
  { title: '业务员 / 买手 / 聊单号', key: 'buyer', width: 180 },
  { title: '返款信息', key: 'refund_info', width: 150 },
  { title: '订单状态', key: 'order_status', width: 95 },
  { title: '本金状态', key: 'principal_status', width: 110 },
  { title: '售后进度', key: 'after_sale_progress', width: 220 },
  { title: '备注', key: 'remark', width: 180 },
  {
    title: '下单时间',
    dataIndex: 'amazon_order_placed_at',
    key: 'amazon_order_placed_at',
    width: 100,
    customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '',
  },
  {
    title: '入库时间',
    dataIndex: 'updated_at',
    key: 'updated_at',
    width: 100,
    customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '',
  },
  ]
  if (filterStatus.value === '已处理') {
    baseColumns.splice(6, 0, { title: '处理结果', key: 'resolution_result', width: 220 })
  }
  baseColumns.push({ title: '操作', key: 'action', width: 300, fixed: 'right' as const })
  return baseColumns
})

function getBuyerChatDisplay(record: any) {
  return record?.buyer_chat_id || record?.buyer_number || record?.buyer_id || '--'
}

function getDateRangeBounds() {
  const [start, end] = dateRange.value
  return {
    start: start.startOf('day').toISOString(),
    end: end.endOf('day').toISOString(),
  }
}

function handleDateRangeChange() {
  pagination.value.current = 1
  load()
}

function reloadFromFirstPage() {
  pagination.value.current = 1
  load()
}

async function loadStats() {
  let query = supabase.from('after_sale_issues').select('issue_status, principal_status, principal_amount, profit_diff, loss_amount, issue_type, updated_at, resolved_at, created_at')
  query = applyIssueFilters(query, { includeStatusFilter: false, includeClosedStatuses: true })
  const { data } = await query
  const filteredMockIssues = filterMockIssues(loadMockIssuesState(), { includeStatusFilter: false, includeClosedStatuses: true })
  const rows = [...filteredMockIssues, ...(data || [])]
  const lossRows = rows.filter(record => getPrincipalStatus(record) === '已损失')
  stats.value = {
    total: rows.length,
    pending: rows.filter(d => getAfterSaleProgressMainStatus(d) === '待处理').length,
    processing: rows.filter(d => getAfterSaleProgressMainStatus(d) === '处理中').length,
    needReorder: rows.filter(d => showPendingReorderAlert(d)).length,
    handled: rows.filter(isIssueFullyHandled).length,
    todayHandled: rows.filter(record => {
      const handledAt = record.resolved_at || record.updated_at
      return isIssueFullyHandled(record) && handledAt && dayjs(handledAt).isSame(dayjs(), 'day')
    }).length,
    principalLossCount: lossRows.length,
    principalLossAmount: lossRows.reduce((sum, record) => sum + getPrincipalAmount(record), 0),
  }
}

function getSearchValue() {
  return props.subOrder ? String(props.subOrder) : filterSearch.value.trim()
}

function applyIssueFilters<T>(query: T, options?: { includeStatusFilter?: boolean; includeClosedStatuses?: boolean }) {
  let nextQuery: any = query
  const { start, end } = getDateRangeBounds()
  if (props.staffId) nextQuery = nextQuery.eq('staff_id', props.staffId)
  if (props.issueId) nextQuery = nextQuery.eq('id', props.issueId)
  if (!props.issueId) nextQuery = nextQuery.gte('created_at', start).lte('created_at', end)
  if (!props.issueId && !options?.includeClosedStatuses && !filterStatus.value && !filterResolutionResult.value) {
    nextQuery = nextQuery.in('issue_status', ['待处理', '处理中', '无新单号', '需补单'])
  }
  if (options?.includeStatusFilter !== false && filterStatus.value) nextQuery = applyProcessStatusFilter(nextQuery, filterStatus.value)
  if (filterResolutionResult.value) nextQuery = applyResolutionResultFilter(nextQuery, filterResolutionResult.value)
  if (filterType.value) nextQuery = nextQuery.eq('issue_type', filterType.value)
  if (filterCountry.value) nextQuery = nextQuery.in('country', getCountryFilterValues(filterCountry.value))
  if (filterPrincipalStatus.value) nextQuery = applyPrincipalStatusFilter(nextQuery, filterPrincipalStatus.value)

  const searchVal = getSearchValue()
  if (searchVal) {
    filterSearch.value = searchVal
    const kw = `%${searchVal}%`
    nextQuery = nextQuery.or(`sub_order_number.ilike.${kw},order_number.ilike.${kw},buyer_name.ilike.${kw},customer_name.ilike.${kw},asin.ilike.${kw},old_amazon_order_id.ilike.${kw},new_amazon_order_id.ilike.${kw},business_manager_name.ilike.${kw}`)
  }

  return nextQuery
}

function applyProcessStatusFilter<T>(query: T, status: string) {
  let nextQuery: any = query
  if (status === '处理中') return nextQuery.in('issue_status', ['处理中', '无新单号', '需补单'])
  if (status === '处理中-无新单号') return nextQuery.in('issue_status', ['无新单号', '需补单'])
  if (status === '处理中-抢单大厅') return nextQuery.eq('transfer_to_staff', 'GRAB_HALL').in('issue_status', ['处理中', '无新单号', '需补单'])
  if (status === '处理中-转给他人') {
    return nextQuery
      .in('issue_status', ['处理中', '无新单号', '需补单'])
      .not('transfer_to_staff', 'is', null)
      .neq('transfer_to_staff', '')
      .neq('transfer_to_staff', 'GRAB_HALL')
  }
  if (status === '已处理') return nextQuery.in('issue_status', ['已处理', '已替换单号', '已替换订单', '已补单', '已追回本金', '已关闭', '无需处理', '已退款给客户'])
  return nextQuery.eq('issue_status', status)
}

function applyResolutionResultFilter<T>(query: T, result: string) {
  let nextQuery: any = query
  if (result === '替换单号') return nextQuery.in('issue_status', ['已替换单号', '已替换订单'])
  if (result === '补单') return nextQuery.eq('issue_status', '已补单')
  if (result === '追回本金') return nextQuery.eq('issue_status', '已追回本金')
  if (result === '无需处理') return nextQuery.in('issue_status', ['无需处理', '已退款给客户'])
  if (result === '已关闭') return nextQuery.eq('issue_status', '已关闭')
  return nextQuery.eq('issue_status', result)
}

function applyPrincipalStatusFilter<T>(query: T, status: string) {
  let nextQuery: any = query
  if (status === '已损失') return nextQuery.in('principal_status', ['已损失', '损失'])
  return nextQuery.eq('principal_status', status)
}

async function load() {
  loading.value = true
  try {
    const filteredMockIssues = filterMockIssues(loadMockIssuesState())
    const mockCount = filteredMockIssues.length
    const pageStart = (pagination.value.current - 1) * pagination.value.pageSize
    const mockOnEarlierPages = Math.min(mockCount, pageStart)
    const mockOnCurrentPage = Math.max(Math.min(mockCount - pageStart, pagination.value.pageSize), 0)
    const dbPageSize = pagination.value.pageSize - mockOnCurrentPage

    let query = supabase
      .from('after_sale_issues')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    query = applyIssueFilters(query, { includeStatusFilter: true })

    if (dbPageSize > 0) {
      const dbFrom = Math.max(pageStart - mockOnEarlierPages, 0)
      query = query.range(dbFrom, dbFrom + dbPageSize - 1)
    } else {
      query = query.range(0, 0)
    }

    const { data, count, error } = await query
    if (error) throw error
    const mockPageRows = filteredMockIssues.slice(pageStart, pageStart + mockOnCurrentPage)
    const dbRows = dbPageSize > 0 ? (data || []) : []
    issues.value = [...mockPageRows, ...dbRows]
    pagination.value.total = (count || 0) + mockCount

    if ((props.issueId || props.subOrder) && issues.value.length === 1) {
      openDetail(issues.value[0])
    }
  } finally {
    loading.value = false
  }

  if (props.showStats) {
    await loadStats()
  }
}

function loadMockIssuesState() {
  if (typeof window === 'undefined') return MOCK_AFTER_SALE_ISSUES.map(item => ({ ...item }))
  try {
    const raw = window.localStorage.getItem(MOCK_AFTER_SALE_ISSUES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const seeded = Array.isArray(parsed)
      ? parsed.map((item: any) => {
          const seed = MOCK_AFTER_SALE_ISSUES.find(candidate => candidate.id === item?.id)
          const normalized = item?.issue_status === '需补单'
            ? { ...item, issue_status: '无新单号' }
            : item
          return seed ? { ...seed, ...normalized } : normalized
        })
      : []
    const merged = [...seeded]
    MOCK_AFTER_SALE_ISSUES.forEach(seed => {
      if (!merged.some((item: any) => item.id === seed.id)) {
        merged.push({ ...seed })
      }
    })
    window.localStorage.setItem(MOCK_AFTER_SALE_ISSUES_KEY, JSON.stringify(merged))
    return merged
  } catch {
    return MOCK_AFTER_SALE_ISSUES.map(item => ({ ...item }))
  }
}

function saveMockIssuesState(nextIssues: any[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MOCK_AFTER_SALE_ISSUES_KEY, JSON.stringify(nextIssues))
}

function isMockIssue(record: any) {
  return String(record?.id || '').startsWith('mock_after_sale_')
}

function filterMockIssues(records: any[], options?: { includeStatusFilter?: boolean; includeClosedStatuses?: boolean }) {
  const keyword = getSearchValue().toLowerCase()
  const { start, end } = getDateRangeBounds()
  return records.filter(record => {
    if (props.issueId && record.id !== props.issueId) return false
    if (!props.issueId) {
      const createdAt = record.created_at ? dayjs(record.created_at).valueOf() : 0
      if (createdAt < dayjs(start).valueOf() || createdAt > dayjs(end).valueOf()) return false
      if (!options?.includeClosedStatuses && !filterStatus.value && !filterResolutionResult.value && getAfterSaleProgressMainStatus(record) === '已处理') return false
    }
    if (filterType.value && record.issue_type !== filterType.value) return false
    if (filterCountry.value && !matchCountryFilter(record.country, filterCountry.value)) return false
    if (options?.includeStatusFilter !== false && filterStatus.value) {
      if (filterStatus.value === '处理中') {
        if (getAfterSaleProgressMainStatus(record) !== '处理中') return false
      } else if (filterStatus.value === '处理中-无新单号') {
        if (!showPendingReorderAlert(record)) return false
      } else if (filterStatus.value === '处理中-抢单大厅') {
        if (!showGrabHallAlert(record)) return false
      } else if (filterStatus.value === '处理中-转给他人') {
        if (!showTransferAlert(record)) return false
      } else if (getAfterSaleProgressMainStatus(record) !== filterStatus.value) {
        return false
      }
    }
    if (filterResolutionResult.value) {
      const resolutionLabel = getResolutionMethodLabel(record)
      if (resolutionLabel !== filterResolutionResult.value) return false
    }
    if (filterPrincipalStatus.value && getPrincipalStatus(record) !== filterPrincipalStatus.value) return false
    if (!keyword) return true

    const haystack = [
      record.sub_order_number,
      record.buyer_name,
      record.customer_name,
      record.asin,
      record.order_number,
      record.old_amazon_order_id,
      record.new_amazon_order_id,
      record.business_manager_name,
    ].join(' ').toLowerCase()
    return haystack.includes(keyword)
  })
}

let buyerSearchTimer: ReturnType<typeof setTimeout> | null = null
function searchBuyers(keyword: string) {
  if (buyerSearchTimer) clearTimeout(buyerSearchTimer)
  if (!keyword) {
    buyerResults.value = []
    return
  }
  buyerSearchTimer = setTimeout(async () => {
    searchingBuyers.value = true
    const kw = `%${keyword}%`
    const { data } = await supabase
      .from('erp_buyers')
      .select('id, buyer_number, name, country, total_completed')
      .neq('status', '黑名单')
      .or(`name.ilike.${kw},buyer_number.ilike.${kw}`)
      .limit(20)
    buyerResults.value = data || []
    searchingBuyers.value = false
  }, 300)
}

function onReplacementBuyerChange(buyerId: string) {
  const buyer = buyerResults.value.find(item => item.id === buyerId)
  editForm.replacement_buyer_name = buyer?.name || ''
}

async function loadStaffOptions() {
  if (staffOptions.value.length) return
  const { data } = await supabase.from('staff').select('id, name').eq('status', '在职').order('name')
  staffOptions.value = (data || []).map((item: any) => ({
    label: item.name,
    value: item.id,
  }))
}

function generateReplacementSubOrderNumber(record: any) {
  const base = String(record?.sub_order_number || 'SUB')
    .replace(/[^A-Z0-9-]/gi, '')
    .slice(0, 18)
  return `${base}-R${dayjs().format('MMDDHHmmss')}`
}

function getSelectedStaffName(staffId: string) {
  return staffOptions.value.find(item => item.value === staffId)?.label || staffId
}

function getCountryFilterValues(filter: string) {
  return COUNTRY_FILTER_ALIASES[filter] || [filter]
}

function matchCountryFilter(recordCountry: any, filter: string) {
  const raw = String(recordCountry || '').trim()
  const aliases = getCountryFilterValues(filter)
  return aliases.some(alias => alias === raw || alias.toUpperCase() === raw.toUpperCase())
}

function normalizeCountryKey(source: any) {
  const raw = String(typeof source === 'string' ? source : source?.country || 'US').trim()
  const mapped: Record<string, string> = {
    '美国': 'US',
    US: 'US',
    USA: 'US',
    '德国': 'DE',
    DE: 'DE',
    '英国': 'UK',
    UK: 'UK',
    GB: 'UK',
    '加拿大': 'CA',
    CA: 'CA',
    '日本': 'JP',
    JP: 'JP',
  }
  return mapped[raw] || mapped[raw.toUpperCase()] || 'US'
}

function getCurrencyMeta(source: any) {
  return COUNTRY_CURRENCY_META[normalizeCountryKey(source)] || COUNTRY_CURRENCY_META.US
}

function getCurrencySymbol(source: any) {
  return getCurrencyMeta(source).symbol
}

function formatMoney(amount: number, source: any) {
  const numeric = Number(amount || 0)
  const meta = getCurrencyMeta(source)
  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency: meta.code,
    minimumFractionDigits: meta.code === 'JPY' ? 0 : 2,
    maximumFractionDigits: meta.code === 'JPY' ? 0 : 2,
  }).format(numeric)
}

function formatAggregateMoney(amount: number) {
  return amount ? amount.toFixed(2) : '0.00'
}

function getIssueActualPaidAmount(record: any) {
  return Number(
    record?.actual_paid_usd
    || record?._refund_amount_usd
    || record?.refund_amount_usd
    || record?.refund_to_client_amount
    || record?.product_price
    || 0,
  )
}

function getActivePrincipalBaseAmount(record: any = currentIssue.value) {
  if (actionModalType.value === 'reorder' && reorderEditorTask.value) {
    return Number(reorderEditorTask.value._refund_amount_usd || reorderEditorTask.value.product_price || 0)
  }
  return getIssueActualPaidAmount(record)
}

function getIssueRefundAmount(record: any) {
  return Number(
    record?.refund_amount_usd
    || record?.refund_to_client_amount
    || record?.actual_paid_usd
    || record?.product_price
    || 0,
  )
}

function getRefundMethodDisplay(record: any) {
  const raw = String(record?.refund_method || record?.refund_to_client_method || '').trim().toLowerCase()
  if (raw.includes('paypal') || raw.includes('pay pal') || raw.includes('贝宝')) return 'PayPal'
  if (raw.includes('礼品卡') || raw.includes('gift')) return '礼品卡'
  return '礼品卡'
}

function getRefundDisplayAmount(record: any) {
  return formatMoney(getIssueRefundAmount(record), record)
}

function getActualPaidDisplayAmount(record: any) {
  return formatMoney(getIssueActualPaidAmount(record), record)
}

function buildExportRow(record: any) {
  return {
    '产品信息': `${record.asin || '--'} / ${record.product_name || '--'} / ${record.country || '--'}`,
    '订单信息': `${record.sub_order_number || '--'} / ${record.old_amazon_order_id || '--'}`,
    '客户/商务': `${record.customer_name || '--'} / ${record.business_manager_name || '--'}`,
    '业务员/买手/聊单号': `${record.staff_name || '--'} / ${record.buyer_name || '--'} / ${getBuyerChatDisplay(record)}`,
    '实返金额': getRefundDisplayAmount(record),
    '实付金额': getActualPaidDisplayAmount(record),
    '返款方式': getRefundMethodDisplay(record),
    '订单状态': record.issue_type || '--',
    '本金状态': getPrincipalStatus(record),
    '售后进度': getAfterSaleProgressMainStatus(record),
    '处理结果': getResolutionMethodLabel(record) || '--',
    '处理结果详情': getResolutionResultSubText(record) || '',
    '备注': record.resolution_notes || '',
    '下单时间': record.amazon_order_placed_at ? dayjs(record.amazon_order_placed_at).format('YYYY-MM-DD HH:mm') : '',
    '入库时间': record.updated_at ? dayjs(record.updated_at).format('YYYY-MM-DD HH:mm') : '',
  }
}

function toCsvValue(value: unknown) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

async function exportCurrentView() {
  exporting.value = true
  try {
    const mockRows = filterMockIssues(loadMockIssuesState())
    let query = supabase
      .from('after_sale_issues')
      .select('*')
      .order('created_at', { ascending: false })

    query = applyIssueFilters(query, { includeStatusFilter: true })
    const { data, error } = await query
    if (error) throw error

    const rows = [...mockRows, ...(data || [])]
    const exportRows = rows.map(buildExportRow)
    const headers = Object.keys(exportRows[0] || {
      '产品信息': '',
      '订单信息': '',
      '客户/商务': '',
      '业务员/买手/聊单号': '',
      '实返金额': '',
      '实付金额': '',
      '返款方式': '',
      '订单状态': '',
      '本金状态': '',
      '售后进度': '',
      '处理结果': '',
      '处理结果详情': '',
      '备注': '',
      '下单时间': '',
      '入库时间': '',
    })
    const csv = [
      headers.map(toCsvValue).join(','),
      ...exportRows.map(row => headers.map(header => toCsvValue((row as any)[header])).join(',')),
    ].join('\n')

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `售后问题单_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success(`已导出 ${rows.length} 条数据`)
  } catch (e: any) {
    message.error('导出失败：' + e.message)
  } finally {
    exporting.value = false
  }
}

function buildReorderEditorTask(record: any) {
  const replacementSubOrderNumber = record.replacement_sub_order_number || generateReplacementSubOrderNumber(record)
  const task: any = {
    id: `${record.id || 'after-sale'}-reorder`,
    order_id: record.order_id || record.sub_order_id || record.id,
    sub_order_number: replacementSubOrderNumber,
    status: '待完善',
    staff_name: record.staff_name || '',
    product_name: record.product_name || '',
    brand_name: record.brand_name || '',
    category: record.category || '',
    review_level: record.review_level || 'A',
    asin: record.asin || '',
    store_name: record.store_name || '',
    country: record.country || '',
    product_price: Number(record.product_price || 0),
    scheduled_date: dayjs().format('YYYY-MM-DD'),
    keyword: record.keyword || '',
    keyword_type: record.keyword_type || 'keyword',
    search_link: record.search_link || '',
    order_type: record.order_type || '',
    review_type: record.review_type || record.order_type || '文字评',
    customer_name: record.customer_name || '',
    sales_person: record.business_manager_name || record.sales_person || '',
    variant_info: record.variant_info || '',
    task_notes: record.description || '',
    notes: record.resolution_notes || '',
    amazon_order_id: record.new_amazon_order_id || '',
    review_screenshot_url: record.review_screenshot_url || '',
    fb_image_url: record.fb_image_url || '',
    refund_sequence: record.refund_sequence || '预付',
    refund_method: record.refund_method || '礼品卡',
    buyer_id: record.replacement_buyer_id || '',
    buyer_name: record.replacement_buyer_name || '',
    buyer: null,
  }

  task._expanded = true
  task._edit_variant = task.variant_info || ''
  task._edit_task_notes = task.task_notes || ''
  task._edit_order_notes = task.notes || ''
  task._sel_buyer_id = task.buyer_id || null
  task._editing_buyer = !task.buyer_id
  task._saving_buyer = false
  task._validating_buyer = false
  task._buyer_validation = null
  task._sel_refund_sequence = task.refund_sequence || '预付'
  task._sel_refund_method = task.refund_method || '礼品卡'
  task._editing_refund_method = false
  task._refund_amount_usd = getIssueActualPaidAmount(record)
  task._refund_fee_usd = Number(record.paypal_fee_usd || 0)
  const storedRefundTotal = Number(record.refund_amount_usd ?? record.refund_amount ?? getIssueActualPaidAmount(record))
  task._refund_due_amount_usd = record.refund_due_amount_usd != null
    ? Number(record.refund_due_amount_usd || 0)
    : task._sel_refund_method === 'PayPal'
      ? Math.max(0, Number((storedRefundTotal - task._refund_fee_usd).toFixed(2)))
      : storedRefundTotal
  task._refund_final_amount_usd = task._refund_due_amount_usd
  task._buyer_paypal_email = ''
  task._need_finance_screenshot = false
  task._extra_refund_amount = null
  task._extra_refund_method = '同首笔'
  task._extra_refund_reason = ''
  task._refund_apply_notes = ''
  task._submitting_refund = false
  task._refund_supplement_mode = false
  task._refund_correction_mode = false
  task._refund_correction_target_id = null
  task._refund_requests_list = []
  task._refund_request_pending = null
  task._refund_request_latest_processed = null
  task._refund_request = null
  task._replacement_sub_order_id = record.replacement_sub_order_id || ''
  task._input_amazon_order_id = task.amazon_order_id || ''
  task._editing_amazon = false
  task._saving_amazon = false
  task._saving_delivery = false
  task._show_delivery_estimate = false
  task._proof_type = 'Review'
  task._proof_comment_link = ''
  task._input_screenshot_url = task.review_screenshot_url || ''
  task._editing_screenshot = false
  task._saving_screenshot = false
  task._completing = false

  syncReorderRefundComputed(task)
  applyReorderBuyerMeta(task)
  return task
}

function isDeferredReorderRefundSequence(task: any) {
  return ['出单后返', '收货后返', '评后返'].includes(
    String(task?._sel_refund_sequence || task?.refund_sequence || ''),
  )
}

async function ensureReorderSubOrder(task: any) {
  if (!currentIssue.value) throw new Error('未找到当前售后问题单')
  const existingId = task?._replacement_sub_order_id || currentIssue.value?.replacement_sub_order_id
  if (existingId) {
    const amazonOrderId = String(task.amazon_order_id || task._input_amazon_order_id || '').trim()
    const noRefund = isReorderNoRefundSelection(task)
    const syncPayload = {
      buyer_id: task.buyer_id || null,
      buyer_name: task.buyer_name || '',
      amazon_order_id: amazonOrderId,
      amazon_order_placed_at: amazonOrderId ? new Date().toISOString() : null,
      status: amazonOrderId ? '已下单' : '已分配',
      refund_method: noRefund ? '' : (task._sel_refund_method || task.refund_method || ''),
      refund_sequence: noRefund ? '无需返款' : (task._sel_refund_sequence || task.refund_sequence || '预付'),
      refund_status: noRefund ? '无需退款' : '未返款',
      actual_paid: Number(task._refund_amount_usd || 0),
    }
    if (!isMockIssue(currentIssue.value)) {
      const { error } = await supabase.from('sub_orders').update(syncPayload).eq('id', existingId)
      if (error) throw error
    }
    return {
      id: existingId,
      sub_order_number: task.sub_order_number || currentIssue.value?.replacement_sub_order_number || '',
      order_id: task.order_id || currentIssue.value?.order_id || '',
    }
  }

  if (isMockIssue(currentIssue.value)) {
    const mockSubOrder = {
      id: `mock_replacement_sub_order_${Date.now()}`,
      sub_order_number: task.sub_order_number || generateReplacementSubOrderNumber(currentIssue.value),
      order_id: currentIssue.value.order_id || currentIssue.value.id,
    }
    task._replacement_sub_order_id = mockSubOrder.id
    task.sub_order_number = mockSubOrder.sub_order_number
    Object.assign(currentIssue.value, {
      replacement_sub_order_id: mockSubOrder.id,
      replacement_sub_order_number: mockSubOrder.sub_order_number,
    })
    await persistIssueUpdate(currentIssue.value, {
      replacement_sub_order_id: mockSubOrder.id,
      replacement_sub_order_number: mockSubOrder.sub_order_number,
      replacement_buyer_id: task.buyer_id || null,
      replacement_buyer_name: task.buyer_name || '',
    })
    return mockSubOrder
  }

  let orderId = currentIssue.value.order_id || task.order_id || ''
  if (!orderId && currentIssue.value.sub_order_id) {
    const { data: sourceSubOrder, error: sourceError } = await supabase
      .from('sub_orders')
      .select('order_id')
      .eq('id', currentIssue.value.sub_order_id)
      .maybeSingle()
    if (sourceError) throw sourceError
    orderId = sourceSubOrder?.order_id || ''
  }
  if (!orderId) throw new Error('原子订单缺少主订单ID，无法创建补单')

  const amazonOrderId = String(task.amazon_order_id || task._input_amazon_order_id || '').trim()
  const noRefund = isReorderNoRefundSelection(task)
  const payload = {
    order_id: orderId,
    sub_order_number: '',
    scheduled_date: task.scheduled_date || dayjs().format('YYYY-MM-DD'),
    asin: task.asin || '',
    store_name: task.store_name || '',
    country: task.country || '美国',
    order_type: task.order_type || task.review_type || '免评',
    product_price: Number(task.product_price || 0),
    keyword: task.keyword || '',
    product_name: task.product_name || '',
    brand_name: task.brand_name || '',
    category: task.category || '',
    review_level: task.review_level || '',
    review_type: task.review_type || task.order_type || '',
    variant_info: task.variant_info || '',
    task_notes: task.task_notes || '',
    customer_name: task.customer_name || '',
    sales_person: task.sales_person || '',
    status: amazonOrderId ? '已下单' : '已分配',
    staff_id: currentIssue.value.staff_id || null,
    staff_name: currentIssue.value.staff_name || task.staff_name || '',
    buyer_id: task.buyer_id || null,
    buyer_name: task.buyer_name || '',
    buyer_assigned_at: new Date().toISOString(),
    amazon_order_id: amazonOrderId,
    amazon_order_placed_at: amazonOrderId ? new Date().toISOString() : null,
    notes: `售后补单，源子单 ${currentIssue.value.sub_order_number || currentIssue.value.sub_order_id || ''}`.trim(),
    refund_status: noRefund ? '无需退款' : '未返款',
    refund_method: noRefund ? '' : (task._sel_refund_method || task.refund_method || ''),
    refund_sequence: noRefund ? '无需返款' : (task._sel_refund_sequence || task.refund_sequence || '预付'),
    actual_paid: Number(task._refund_amount_usd || 0),
  }
  const { data: newSubOrder, error: insertError } = await supabase
    .from('sub_orders')
    .insert(payload)
    .select('id, sub_order_number, order_id')
    .single()
  if (insertError) throw insertError

  try {
    await persistIssueUpdate(currentIssue.value, {
      replacement_sub_order_id: newSubOrder.id,
      replacement_sub_order_number: newSubOrder.sub_order_number,
      replacement_buyer_id: task.buyer_id || null,
      replacement_buyer_name: task.buyer_name || '',
    })
  } catch (error) {
    await supabase.from('sub_orders').delete().eq('id', newSubOrder.id)
    throw error
  }

  task._replacement_sub_order_id = newSubOrder.id
  task.order_id = newSubOrder.order_id
  task.sub_order_number = newSubOrder.sub_order_number
  Object.assign(currentIssue.value, {
    replacement_sub_order_id: newSubOrder.id,
    replacement_sub_order_number: newSubOrder.sub_order_number,
  })
  return newSubOrder
}

function applyReorderBuyerMeta(task: any) {
  if (!task?.buyer_id) return
  const buyer = reorderBuyerOptions.value.find(item => item.id === task.buyer_id)
  if (!buyer) return
  task.buyer = buyer
  task._buyer_country = buyer.country || ''
  task._buyer_level = buyer.level || ''
  if (!task._buyer_paypal_email) {
    task._buyer_paypal_email = buyer.paypal_email || ''
  }
}

async function hydrateReorderEditorSource(record: any) {
  if (isMockIssue(record) || !record?.sub_order_id) return
  const { data, error } = await supabase
    .from('sub_orders')
    .select('keyword, keyword_type, search_link, order_type, review_type, review_level')
    .eq('id', record.sub_order_id)
    .maybeSingle()
  if (error) throw error
  if (!data || !reorderEditorTask.value) return

  Object.assign(reorderEditorTask.value, {
    keyword: record.keyword || data.keyword || '',
    keyword_type: record.keyword_type || data.keyword_type || 'keyword',
    search_link: record.search_link || data.search_link || '',
    order_type: record.order_type || data.order_type || '',
    review_type: record.review_type || data.review_type || record.order_type || data.order_type || '文字评',
    review_level: record.review_level || data.review_level || 'A',
  })
}

async function loadReorderBuyerOptions() {
  const { data, error } = await supabase
    .from('erp_buyers')
    .select('id, name, country, level, paypal_email, purchased_asins')
    .neq('status', '黑名单')
    .order('name')
    .limit(300)
  if (error) throw error
  reorderBuyerOptions.value = data || []
  if (reorderEditorTask.value) {
    applyReorderBuyerMeta(reorderEditorTask.value)
  }
}

function getReorderTaskProgressLabel() {
  return '补单处理中'
}

function getReorderTaskProgressBadgeClass() {
  return 'wf-panel-status todo'
}

function getReorderBuyerBlockReason(task: any, buyerId: string) {
  const buyer = reorderBuyerOptions.value.find(item => item.id === buyerId)
  if (!buyer || !task?.asin) return ''
  const purchasedAsins = String(buyer.purchased_asins || '')
    .split(/[,，\s]+/)
    .map(item => item.trim())
    .filter(Boolean)
  if (purchasedAsins.includes(task.asin)) {
    return `该买手历史记录中已购买过 ASIN: ${task.asin}`
  }
  return ''
}

function onReorderBuyerSelect(task: any, buyerId: string) {
  task._sel_buyer_id = buyerId || null
  if (!buyerId) {
    task._buyer_validation = null
    return
  }
  const reason = getReorderBuyerBlockReason(task, buyerId)
  if (reason) {
    task._buyer_validation = { blocked: true, reason }
    return
  }
  task._buyer_validation = { blocked: false }
}

function assignReorderBuyer(task: any) {
  if (!task?._sel_buyer_id) return
  if (task._buyer_validation?.blocked) {
    message.error(task._buyer_validation.reason)
    return
  }
  const buyer = reorderBuyerOptions.value.find(item => item.id === task._sel_buyer_id)
  if (!buyer) {
    message.warning('未找到买手信息，请刷新后重试')
    return
  }
  task.buyer_id = buyer.id
  task.buyer_name = buyer.name || ''
  task._editing_buyer = false
  task._buyer_validation = null
  editForm.replacement_buyer_id = buyer.id
  editForm.replacement_buyer_name = buyer.name || ''
  applyReorderBuyerMeta(task)
  message.success('已选择补单买手')
}

function getReorderRefundPanelTitle() {
  return '返款申请'
}

function isReorderRefundStepReadonly() {
  return false
}

function getReorderProcessedRefunds(task: any) {
  return (task?._refund_requests_list || []).filter((item: any) => item.status === '已处理')
}

function aggregateReorderProcessedRefunds(task: any) {
  const rows = getReorderProcessedRefunds(task)
  const paypalTotal = rows
    .filter((item: any) => item.refund_method === 'PayPal')
    .reduce((sum: number, item: any) => sum + Number(item.refund_amount_usd || item.refund_amount || 0), 0)
  const giftFace = rows
    .filter((item: any) => item.refund_method !== 'PayPal')
    .reduce((sum: number, item: any) => sum + Number(item.refund_amount_usd || item.gift_card_face_value_usd || 0), 0)
  return {
    any: rows.length > 0,
    paypalTotal,
    giftFace,
  }
}

function inferReorderActualPaidUsd(req: any) {
  if (!req) return 0
  const storedActual = Number(req.actual_paid_usd || 0)
  if (storedActual > 0) return storedActual
  if (req.refund_method === 'PayPal') {
    return Math.max(0, Number(req.refund_amount_usd || 0) - Number(req.paypal_fee_usd || 0))
  }
  return Number(req.product_price || req.refund_amount_usd || 0)
}

function inferReorderRefundDueAmountUsd(req: any) {
  if (!req) return 0
  if (req.refund_due_amount_usd != null) return Number(req.refund_due_amount_usd || 0)
  const total = Number(req.refund_amount_usd || req.refund_amount || 0)
  const fee = req.refund_method === 'PayPal' ? Number(req.paypal_fee_usd || 0) : 0
  return Math.max(0, Number((total - fee).toFixed(2)))
}

function getReorderRefundRequestTypeLabel(req: any) {
  if (req?.correction_for_request_id) return '更正返款'
  if (req?.notes?.includes('追加')) return '追加返款'
  return '返款申请'
}

function getReorderRefundStatusLabel(status: string) {
  return status || ''
}

function hydrateReorderRefundFormFromRequest(task: any, req: any) {
  if (!req) return
  task._sel_refund_method = req.refund_method || task._sel_refund_method
  task._sel_refund_sequence = req.refund_sequence || task._sel_refund_sequence || task.refund_sequence
  task._buyer_paypal_email = req.buyer_paypal_email || task._buyer_paypal_email || ''
  const method = req.refund_method || task._sel_refund_method
  task._refund_due_amount_usd = inferReorderRefundDueAmountUsd(req)
  if (method === 'PayPal') {
    const fee = Number(req.paypal_fee_usd || 0)
    const total = Number(req.refund_amount_usd || 0)
    const storedActual = Number(req.actual_paid_usd || 0)
    if (storedActual > 0 || fee > 0) {
      task._refund_amount_usd = storedActual > 0 ? storedActual : Math.max(0, Number((total - fee).toFixed(2)))
      task._refund_fee_usd = fee
    } else {
      task._refund_amount_usd = total
      task._refund_fee_usd = 0
    }
  } else {
    const actual = Number(req.actual_paid_usd || 0)
    task._refund_amount_usd = actual > 0 ? actual : Number(req.product_price || task.product_price || 0)
    const face = Number(req.refund_amount_usd || req.gift_card_face_value_usd || 0)
    if (req.refund_due_amount_usd == null) {
      task._refund_due_amount_usd = face > 0 ? face : Number(task._refund_amount_usd || 0)
    }
    task._refund_final_amount_usd = Number(task._refund_due_amount_usd || 0)
  }
  const rawNotes = req.notes || ''
  task._need_finance_screenshot = /\[需财务返款截图\]|\[需财务水单\]/.test(rawNotes)
  task._refund_apply_notes = rawNotes.replace(/\s*\[(需财务返款截图|需财务水单)\]\s*$/, '').trim()
  syncReorderRefundComputed(task)
}

function startReorderSupplementalRefund(task: any) {
  if (!task._extra_refund_amount || Number(task._extra_refund_amount) <= 0) {
    message.warning('请先填写追加基数金额（美元）')
    return
  }
  task._refund_supplement_mode = true
  task._refund_correction_mode = false
  task._refund_correction_target_id = null
  task._refund_fee_usd = 0
  task._refund_due_amount_usd = Number(task._extra_refund_amount)
  let method = task._refund_request_latest_processed?.refund_method || task.refund_method || '礼品卡'
  if (task._extra_refund_method === '礼品卡') method = '礼品卡'
  else if (task._extra_refund_method === 'PayPal') method = 'PayPal'
  task._sel_refund_method = method
  syncReorderRefundComputed(task)
  if (task._sel_refund_method === '礼品卡') {
    task._refund_final_amount_usd = Number(task._extra_refund_amount)
  }
}

function startReorderCorrectionRefund(task: any) {
  const base = task._refund_request_latest_processed
  if (!base) {
    message.info('暂无已处理的返款记录可关联更正')
    return
  }
  task._refund_correction_mode = true
  task._refund_supplement_mode = false
  task._refund_correction_target_id = base.id
  hydrateReorderRefundFormFromRequest(task, base)
  message.info('已带入上一笔信息，请修改邮箱或金额后提交')
}

function cancelReorderRefundSpecialModes(task: any) {
  task._refund_supplement_mode = false
  task._refund_correction_mode = false
  task._refund_correction_target_id = null
  if (task._refund_request_pending) {
    hydrateReorderRefundFormFromRequest(task, task._refund_request_pending)
  } else {
    task._sel_refund_sequence = task.refund_sequence || '预付'
    task._sel_refund_method = task.refund_method || '礼品卡'
    task._refund_amount_usd = task.product_price ? Number(task.product_price) : 0
    task._refund_fee_usd = 0
    const storedTotal = Number(task.refund_amount || task.product_price || 0)
    task._refund_due_amount_usd = task._sel_refund_method === 'PayPal'
      ? Math.max(0, Number((storedTotal - task._refund_fee_usd).toFixed(2)))
      : storedTotal
    task._refund_final_amount_usd = getReorderRefundFinalAmount(task)
    task._buyer_paypal_email = task.buyer?.paypal_email || ''
    syncReorderRefundComputed(task)
  }
}

function getReorderRefundSubmitButtonText(task: any) {
  if (isReorderNoRefundSelection(task)) return '保存无需返款'
  if (task._refund_supplement_mode) return '提交追加返款申请'
  if (task._refund_correction_mode) return '提交更正返款申请'
  if (task._refund_request_pending && !task._refund_supplement_mode && !task._refund_correction_mode) return '更新返款申请'
  return '提交返款申请'
}

function isReorderNoRefundSelection(task: any) {
  return (task._sel_refund_sequence || task.refund_sequence || '') === '无需返款'
}

function isReorderPrepayMode(task: any) {
  return ['预付', '先退款后给单'].includes(task._sel_refund_sequence || task.refund_sequence || '')
}

function getReorderRefundFinalAmount(task: any) {
  const base = Number(task._refund_due_amount_usd || 0)
  if (task._sel_refund_method === 'PayPal') {
    return Number((base + Number(task._refund_fee_usd || 0)).toFixed(2))
  }
  return base
}

function syncReorderRefundComputed(task: any) {
  if (isReorderNoRefundSelection(task)) {
    task._need_finance_screenshot = false
    if (actionModalType.value === 'reorder' && editForm.principal_status === '已损失') {
      editForm.principal_amount = Number(task._refund_amount_usd || task.product_price || 0)
    }
    return
  }
  if (task._sel_refund_method === 'PayPal') {
    if (!task._buyer_paypal_email) {
      const buyer = reorderBuyerOptions.value.find(item => item.id === task.buyer_id)
      task._buyer_paypal_email = buyer?.paypal_email || ''
    }
    task._refund_final_amount_usd = getReorderRefundFinalAmount(task)
  }
  task._refund_final_amount_usd = getReorderRefundFinalAmount(task)
  if (actionModalType.value === 'reorder' && editForm.principal_status === '已损失') {
    editForm.principal_amount = Number(task._refund_amount_usd || task.product_price || 0)
  }
}

async function saveDeferredReorderRefundConfig(task: any, replacementSubOrder?: any) {
  const newSubOrder = replacementSubOrder || await ensureReorderSubOrder(task)
  const payload = {
    refund_method: task._sel_refund_method || task.refund_method || '',
    refund_sequence: task._sel_refund_sequence || task.refund_sequence || '预付',
    refund_status: '未返款',
    actual_paid: Number(task._refund_amount_usd || 0),
  }
  if (!isMockIssue(currentIssue.value)) {
    const { error } = await supabase.from('sub_orders').update(payload).eq('id', newSubOrder.id)
    if (error) throw error
  }
  Object.assign(task, payload)
  message.success('返款设置已保存，点击“申请返款”后才会进入付款审批')
}

async function submitReorderRefundRequest(task: any) {
  const noRefund = isReorderNoRefundSelection(task)
  if (task?._buyer_validation?.blocked) {
    message.error(task._buyer_validation.reason)
    return false
  }
  if (!task?.buyer_id) {
    message.warning('请先选择补单买手')
    return false
  }
  if (!getReorderRefundFinalAmount(task)) {
    if (!noRefund) message.warning('请先填写返款金额')
    if (!noRefund) return false
  }
  if (!noRefund && task._sel_refund_method === 'PayPal' && !String(task._buyer_paypal_email || '').trim()) {
    message.warning('请填写买手 PayPal 邮箱')
    return false
  }
  task._submitting_refund = true
  try {
    const newSubOrder = await ensureReorderSubOrder(task)
    if (noRefund) {
      const noRefundPayload = {
        refund_method: '',
        refund_sequence: '无需返款',
        refund_status: '无需退款',
        refund_amount: 0,
      }
      if (!isMockIssue(currentIssue.value)) {
        const { error } = await supabase.from('sub_orders').update(noRefundPayload).eq('id', newSubOrder.id)
        if (error) throw error
      }
      Object.assign(task, noRefundPayload)
      task._refund_request_pending = null
      task._refund_request = task._refund_request_latest_processed || null
      task._refund_requests_list = (task._refund_requests_list || []).filter((item: any) => item.status !== '待处理')
      task._refund_apply_notes = ''
      task._need_finance_screenshot = false
      message.success('已标记为无需返款')
      return true
    }

    const now = new Date().toISOString()
    const notes = `${task._refund_apply_notes || ''}${task._need_finance_screenshot ? ' [需财务水单]' : ''}`.trim()
    const commonFields = {
      sub_order_id: newSubOrder.id,
      order_id: newSubOrder.order_id,
      sub_order_number: newSubOrder.sub_order_number,
      buyer_name: task.buyer_name || '',
      buyer_paypal_email: task._buyer_paypal_email || '',
      refund_method: task._sel_refund_method,
      refund_sequence: task._sel_refund_sequence,
      refund_amount_usd: getReorderRefundFinalAmount(task),
      refund_amount: getReorderRefundFinalAmount(task),
      actual_paid_usd: Number(task._refund_amount_usd || 0),
      refund_due_amount_usd: Number(task._refund_due_amount_usd || 0),
      paypal_fee_usd: task._sel_refund_method === 'PayPal' ? Number(task._refund_fee_usd || 0) : 0,
      product_name: task.product_name || '',
      product_price: Number(task.product_price || 0),
      store_name: task.store_name || '',
      staff_name: currentIssue.value?.staff_name || task.staff_name || '',
      asin: task.asin || '',
      notes,
      status: '待处理',
      request_type: 'initial',
      updated_at: now,
    }
    let request: any
    if (isMockIssue(currentIssue.value)) {
      request = {
        ...commonFields,
        id: task._refund_request_pending?.id || `mock_reorder_refund_${Date.now()}`,
        created_at: task._refund_request_pending?.created_at || now,
      }
    } else if (task._refund_request_pending?.id) {
      const { data, error } = await supabase
        .from('refund_requests')
        .update(commonFields)
        .eq('id', task._refund_request_pending.id)
        .select()
        .single()
      if (error) throw error
      request = data
    } else {
      const { data, error } = await supabase
        .from('refund_requests')
        .insert({ ...commonFields, created_at: now })
        .select()
        .single()
      if (error) throw error
      request = data
    }

    const refundConfig = {
      refund_method: task._sel_refund_method,
      refund_sequence: task._sel_refund_sequence,
      refund_status: '未返款',
      actual_paid: Number(task._refund_amount_usd || 0),
    }
    if (!isMockIssue(currentIssue.value)) {
      const { error } = await supabase.from('sub_orders').update(refundConfig).eq('id', newSubOrder.id)
      if (error) throw error
    }
    Object.assign(task, refundConfig)
    task._refund_request_pending = request
    task._refund_request = request
    task._refund_requests_list = [request, ...(task._refund_requests_list || []).filter((item: any) => item.id !== request.id)]
    message.success('返款申请已提交，订单已进入付款审批')
    return true
  } catch (error: any) {
    message.error(`申请返款失败：${error.message}`)
    throw error
  } finally {
    task._submitting_refund = false
  }
}

function saveReorderAmazonOrder(task: any) {
  const value = String(task._input_amazon_order_id || '').trim()
  if (!value) {
    message.warning('请填写新的亚马逊订单号')
    return
  }
  task.amazon_order_id = value
  task._input_amazon_order_id = value
  editForm.new_amazon_order_id = value
  message.success('已记录新订单号')
}

function saveReorderScreenshot(task: any) {
  const value = String(task._input_screenshot_url || '').trim()
  if (!value) {
    message.warning('请填写凭证图片')
    return
  }
  if (task._proof_type === 'Feedback') {
    task.fb_image_url = value
  } else {
    task.review_screenshot_url = value
  }
  message.success('已保存凭证')
}

function saveReorderOrderNotes(task: any) {
  task.notes = String(task._edit_order_notes || '').trim()
  editForm.resolution_notes = task.notes
}

async function submitReorderEditorChanges(task: any) {
  if (task?._buyer_validation?.blocked) {
    message.error(task._buyer_validation.reason)
    return
  }
  if (task?._sel_buyer_id && task._sel_buyer_id !== task.buyer_id) {
    assignReorderBuyer(task)
  }
  if (!task?.buyer_id) {
    message.warning('请选择补单买手')
    return
  }
  saveReorderOrderNotes(task)
  if (String(task._input_amazon_order_id || '').trim()) {
    task.amazon_order_id = String(task._input_amazon_order_id).trim()
    editForm.new_amazon_order_id = task.amazon_order_id
  }
  if (String(task._input_screenshot_url || '').trim()) {
    if (task._proof_type === 'Feedback') {
      task.fb_image_url = task._input_screenshot_url
    } else {
      task.review_screenshot_url = task._input_screenshot_url
    }
  }
  const replacementSubOrder = await ensureReorderSubOrder(task)
  if (isReorderNoRefundSelection(task)) {
    if (!await submitReorderRefundRequest(task)) return
  } else if (isDeferredReorderRefundSequence(task)) {
    await saveDeferredReorderRefundConfig(task, replacementSubOrder)
  } else {
    if (!await submitReorderRefundRequest(task)) return
  }
  await submitActionModal()
}

function releaseReorderToHall() {
  closeActionModal()
  setHandleAction('release-grab')
}

function transferReorderToOther() {
  closeActionModal()
  setHandleAction('transfer-other')
}

function openReorderReplaceProductHint() {
  message.info('当前补单弹框已直接复用工作台编辑页，产品信息沿用原问题单数据')
}

function formatReorderAuditEdit(edit: any) {
  if (!edit) return ''
  if (typeof edit === 'string') return edit
  return `${edit.label || edit.field || '字段'}：${edit.from ?? '—'} -> ${edit.to ?? '—'}`
}

function formatIssueStatusLabel(status: string) {
  const normalized = normalizeIssueStatus(status)
  return normalized
}

function showPrincipalAmountField(status: string) {
  return ['待追回', '已追回', '已损失'].includes(status)
}

function showPrincipalNoteField(status: string) {
  return ['待确定', '待追回', '已追回', '已损失'].includes(status)
}

function getPrincipalAmountFieldLabel(status: string) {
  if (status === '已损失') return '损失金额'
  if (status === '已追回') return '已追回金额'
  return '待追回金额'
}

function getPrincipalNotePlaceholder(status: string) {
  if (status === '已损失') return '说明损失原因...'
  if (status === '已追回') return '说明追回结果或到账情况...'
  if (status === '待追回') return '说明待追回或回收安排...'
  return '说明待确认原因...'
}

function getPrincipalStatusOptions(_record: any) {
  return [...principalStatusOptions]
}

function getDefaultPrincipalStatus(record: any) {
  return record?.issue_type === '本金多返' ? '待追回' : '待确定'
}

function getSuggestedPrincipalStatus(action: HandleActionKey | '', record: any) {
  if (!action) return getDefaultPrincipalStatus(record)
  if (action === 'replace-order') return '正常'
  if (action === 'recover-principal') return '已追回'
  if (action === 'revoke') return '正常'
  if (['transfer-other', 'release-grab'].includes(action)) return '已损失'
  if (['reorder', 'mark-closed', 'mark-no-need'].includes(action)) return '已损失'
  return getPrincipalStatus(record)
}

function onPrincipalChange() {
  if (editForm.principal_status === '正常') {
    editForm.principal_amount = 0
    editForm.loss_amount = 0
    editForm.principal_reason = ''
    editForm.blacklist_buyer = false
    editForm.recovery_method = 'direct'
    editForm.recovery_new_sub_order_number = ''
  } else if (editForm.principal_status === '待确定') {
    editForm.principal_amount = 0
    editForm.loss_amount = 0
  } else if (!editForm.principal_amount || actionModalType.value === 'reorder') {
    editForm.principal_amount = getActivePrincipalBaseAmount(currentIssue.value)
  }
  if (editForm.principal_status === '已损失') {
    editForm.loss_amount = Number(editForm.principal_amount || 0)
  }
  if (editForm.principal_status === '已追回') {
    if (!editForm.recovery_method) editForm.recovery_method = 'direct'
    if (!editForm.principal_amount) {
      editForm.principal_amount = getActivePrincipalBaseAmount(currentIssue.value)
    }
  }
}

function validatePrincipalForm() {
  if (editForm.principal_status === '已损失' && Number(editForm.principal_amount || editForm.loss_amount || 0) <= 0) {
    message.warning('标记为已损失时，请填写损失金额')
    return false
  }
  if (editForm.principal_status === '待追回' && Number(editForm.principal_amount || 0) <= 0) {
    message.warning('待追回状态请填写待追回金额')
    return false
  }
  if (editForm.principal_status === '已追回') {
    if (Number(editForm.principal_amount || 0) <= 0) {
      message.warning('已追回状态请填写已追回金额')
      return false
    }
    if (editForm.recovery_method === 'offset' && !editForm.recovery_new_sub_order_number?.trim()) {
      message.warning('请填写抵消子订单ID')
      return false
    }
  }
  return true
}

function applyRecoveredPrincipalFields(update: any, sharedNote: string) {
  const recoveredAmount = Number(editForm.principal_amount || 0)
  const recoveryDesc = editForm.recovery_method === 'offset'
    ? `追回本金 ${formatMoney(recoveredAmount, currentIssue.value)}，方式：新订单抵消，抵消子订单ID：${editForm.recovery_new_sub_order_number.trim()}`
    : `追回本金 ${formatMoney(recoveredAmount, currentIssue.value)}，方式：直接退回`
  Object.assign(update, buildPrincipalUpdate(
    '已追回',
    recoveredAmount,
    showPrincipalNoteField(editForm.principal_status) ? sharedNote : '',
  ))
  update.recovery_method = editForm.recovery_method || 'direct'
  update.recovery_new_sub_order_number = editForm.recovery_method === 'offset'
    ? editForm.recovery_new_sub_order_number.trim()
    : ''
  update.recovered_amount = recoveredAmount
  if (!update.resolution_notes) {
    update.resolution_notes = sharedNote || recoveryDesc
  }
  if (editForm.recovery_method === 'offset') {
    update.replacement_sub_order_number = editForm.recovery_new_sub_order_number.trim()
  }
}

function isProcessEditable(record: any) {
  if (!record?.id) return false
  return getAfterSaleProgressMainStatus(record) !== '已处理'
}

function getInlineProgressOptions(_record: any) {
  return [...inlineProcessStatusOptions]
}

function startProgressEdit(record: any) {
  if (!isProcessEditable(record)) return
  editingProgressId.value = record.id
  progressDraft.status = normalizeIssueStatus(record.issue_status)
}

function cancelProgressEdit() {
  editingProgressId.value = ''
}

function buildPrincipalUpdate(status: string, amount: number, reason: string) {
  const update: any = {
    principal_status: status,
    principal_reason: reason?.trim() || '',
  }
  if (status === '已损失') {
    const lossAmount = Number(amount || 0)
    update.principal_amount = lossAmount
    update.loss_amount = lossAmount
    update.principal_stolen = true
    return update
  }
  if (status === '待追回' || status === '已追回') {
    update.principal_amount = Number(amount || 0)
    update.loss_amount = 0
    update.principal_stolen = false
    if (status === '已追回') {
      update.recovered_amount = Number(amount || 0)
    }
    return update
  }
  update.principal_amount = 0
  update.loss_amount = 0
  update.principal_stolen = false
  return update
}

async function persistIssueUpdate(record: any, update: any) {
  if (isMockIssue(record)) {
    const nextMockIssues = loadMockIssuesState().map(item => item.id === record.id ? {
      ...item,
      ...update,
      updated_at: new Date().toISOString(),
    } : item)
    saveMockIssuesState(nextMockIssues)
    return
  }
  const dbSafeUpdate = { ...update }
  delete dbSafeUpdate.recovered_amount
  delete dbSafeUpdate.recovery_method
  delete dbSafeUpdate.recovery_new_sub_order_number
  const { error } = await supabase.from('after_sale_issues').update(dbSafeUpdate).eq('id', record.id)
  if (error) throw error
}

async function saveProgressEdit(record: any) {
  const nextStatus = normalizeIssueStatus(progressDraft.status)
  saving.value = true
  try {
    const isProcessStatus = ['待处理', '处理中', '无新单号'].includes(nextStatus)
    const update: any = {
      issue_status: nextStatus,
      resolved_at: isProcessStatus ? null : new Date().toISOString(),
    }
    if (isProcessStatus) {
      const nextPrincipalStatus = getDefaultPrincipalStatus(record)
      Object.assign(update, buildPrincipalUpdate(
        nextPrincipalStatus,
        record.issue_type === '本金多返' ? getPrincipalAmount(record) || getIssueActualPaidAmount(record) : 0,
        '',
      ))
      update.refund_to_client_at = null
    }
    await persistIssueUpdate(record, update)
    message.success(`售后进度已更新为${formatIssueStatusLabel(nextStatus)}`)
    cancelProgressEdit()
    await load()
    emit('changed')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    saving.value = false
  }
}

function openDetail(record: any) {
  drawerMode.value = 'detail'
  hydrateIssueForm(record)
  drawerOpen.value = true
}

function openHandle(record: any) {
  drawerMode.value = 'handle'
  hydrateIssueForm(record)
  handleAction.value = inferHandleAction(normalizeIssueStatus(record.issue_status))
  if (handleAction.value) {
    editForm.principal_status = getSuggestedPrincipalStatus(handleAction.value, record)
    onPrincipalChange()
  }
  loadStaffOptions()
  drawerOpen.value = true
}

function openActionModal(record: any, type: 'replace-order' | 'reorder') {
  currentIssue.value = record
  hydrateIssueForm(record)
  handleAction.value = ''
  if (type === 'reorder') {
    editForm.replacement_sub_order_number = generateReplacementSubOrderNumber(record)
    editForm.principal_status = '已损失'
    editForm.principal_amount = getPrincipalAmount(record) || getIssueActualPaidAmount(record)
    editForm.recovery_method = 'direct'
    editForm.recovery_new_sub_order_number = ''
    reorderEditorTask.value = buildReorderEditorTask({
      ...record,
      replacement_sub_order_number: editForm.replacement_sub_order_number,
    })
    hydrateReorderEditorSource(record).catch((error: any) => {
      message.error(`加载原子订单信息失败：${error.message}`)
    })
    loadReorderBuyerOptions().catch((error: any) => {
      message.error(`加载买手失败：${error.message}`)
    })
  } else {
    editForm.principal_status = '正常'
    reorderEditorTask.value = null
  }
  onPrincipalChange()
  actionModalType.value = type
  actionModalOpen.value = true
}

function closeActionModal() {
  actionModalOpen.value = false
  actionModalType.value = ''
  reorderEditorTask.value = null
}

function hydrateIssueForm(record: any) {
  currentIssue.value = record
  Object.assign(editForm, {
    principal_status: getPrincipalStatus(record),
    principal_reason: record.principal_reason || (record.principal_stolen ? '被骗' : ''),
    principal_amount: getPrincipalAmount(record),
    recovered_amount: getPrincipalAmount(record) || getIssueActualPaidAmount(record),
    recovery_method: record.recovery_method || 'direct',
    recovery_new_sub_order_number: record.recovery_new_sub_order_number || '',
    new_amazon_order_id: record.new_amazon_order_id || '',
    profit_diff: Number(record.profit_diff || 0),
    loss_amount: Number(record.loss_amount || 0),
    replacement_buyer_id: record.replacement_buyer_id || undefined,
    replacement_buyer_name: record.replacement_buyer_name || '',
    replacement_sub_order_number: record.replacement_sub_order_number || '',
    refund_to_client_method: record.refund_to_client_method || '',
    refund_to_client_amount: Number(record.refund_to_client_amount || 0),
    refund_to_client_notes: record.refund_to_client_notes || '',
    resolution_notes: record.resolution_notes || record.principal_reason || '',
    transfer_to_staff: record.transfer_to_staff || '',
    issue_status: normalizeIssueStatus(record.issue_status),
    blacklist_buyer: false,
  })
}

function inferHandleAction(status: string) {
  if (status === '已替换单号') return 'replace-order'
  if (status === '已补单') return 'reorder'
  if (status === '已追回本金') return 'recover-principal'
  if (status === '已关闭') return 'mark-closed'
  if (status === '无需处理') return 'mark-no-need'
  return ''
}

function setHandleAction(action: HandleActionKey) {
  if (action === 'reorder') {
    openActionModal(currentIssue.value, action)
    return
  }
  handleAction.value = action
  const actionStatusMap: Record<HandleActionKey, string> = {
    'replace-order': '已替换单号',
    'reorder': '已补单',
    'mark-need-reorder': '无新单号',
    'recover-principal': '已追回本金',
    'transfer-other': '处理中',
    'release-grab': '处理中',
    'mark-closed': '已关闭',
    'mark-no-need': '无需处理',
    'revoke': '已关闭',
  }
  editForm.issue_status = actionStatusMap[action]
  editForm.principal_status = getSuggestedPrincipalStatus(action, currentIssue.value)
  if (['待追回', '已追回', '已损失'].includes(editForm.principal_status)) {
    editForm.principal_amount = getPrincipalAmount(currentIssue.value) || getActivePrincipalBaseAmount(currentIssue.value)
  }
  onPrincipalChange()
}

function getHandleActionHint() {
  if (handleAction.value === 'recover-principal') return '登记追回金额和追回方式。'
  if (handleAction.value === 'transfer-other') return '转交给其他业务员继续跟进。'
  if (handleAction.value === 'release-grab') return '释放给其他业务员继续接手。'
  if (handleAction.value === 'mark-closed') return '作为最终结果关闭当前问题单。'
  if (handleAction.value === 'mark-no-need') return '作为最终结果确认当前单无需继续处理。'
  if (handleAction.value === 'revoke') return '撤销后此问题单将彻底删除。'
  return ''
}

function getHandleActionTitle() {
  if (handleAction.value === 'recover-principal') return '本金明细'
  return handleActionOptions.find(item => item.key === handleAction.value)?.label || '处理操作'
}

const shouldShowHandleActionTitle = computed(() =>
  ['replace-order', 'recover-principal', 'transfer-other'].includes(handleAction.value)
)

const shouldShowHandleActionPanel = computed(() => {
  if (!handleAction.value) return false
  if (shouldShowHandleActionTitle.value) return true
  return !showPrincipalNoteField(editForm.principal_status)
})

function getHandleNotePlaceholder() {
  if (handleAction.value === 'transfer-other') return '说明为什么需要转交，以及交接重点...'
  if (handleAction.value === 'release-grab') return '说明为什么放入抢单大厅，以及需要注意的事项...'
  if (handleAction.value === 'mark-closed') return '说明关闭原因...'
  if (handleAction.value === 'mark-no-need') return '说明无需处理的原因...'
  if (handleAction.value === 'revoke') return '说明撤销原因...'
  return '填写处理备注...'
}

function getRecoveryMethodLabel(method: string) {
  if (method === 'offset') return '新订单抵消'
  return '直接退回'
}

async function persistIssueDelete(record: any) {
  if (isMockIssue(record)) {
    saveMockIssuesState(loadMockIssuesState().filter(item => item.id !== record.id))
    return
  }
  const { error } = await supabase.from('after_sale_issues').delete().eq('id', record.id)
  if (error) throw error
}

function confirmRevokeIssue(): Promise<boolean> {
  return new Promise(resolve => {
    Modal.confirm({
      title: '确认撤销',
      content: '撤销后此问题单将从售后问题单中彻底删除，且不可恢复。',
      okText: '确认撤销',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    })
  })
}

async function handleUpdate() {
  if (!currentIssue.value) return

  try {
    if (!validatePrincipalForm()) return

    const effectiveAction = handleAction.value
    if (effectiveAction === 'revoke') {
      const confirmed = await confirmRevokeIssue()
      if (!confirmed) return
      saving.value = true
      await persistIssueDelete(currentIssue.value)
      message.success('问题单已撤销删除')
      drawerOpen.value = false
      await load()
      emit('changed')
      return
    }

    const sharedNote = editForm.resolution_notes?.trim() || ''

    // 仅修改本金：无需选择业务操作
    if (!effectiveAction) {
      const update: any = {
        issue_status: currentIssue.value.issue_status,
        ...buildPrincipalUpdate(
          editForm.principal_status,
          Number(editForm.principal_amount || editForm.loss_amount || 0),
          showPrincipalNoteField(editForm.principal_status) ? sharedNote : '',
        ),
      }
      if (editForm.principal_status === '已追回') {
        applyRecoveredPrincipalFields(update, sharedNote)
        update.issue_status = '已追回本金'
      }
      if (sharedNote) update.resolution_notes = sharedNote
      if (showPrincipalNoteField(editForm.principal_status)) {
        update.principal_reason = update.resolution_notes || sharedNote
      }
      const handledPreview = { ...currentIssue.value, ...update }
      update.resolved_at = isIssueFullyHandled(handledPreview) ? new Date().toISOString() : null

      saving.value = true
      await persistIssueUpdate(currentIssue.value, update)
      message.success('本金情况已保存')
      drawerOpen.value = false
      await load()
      emit('changed')
      return
    }

    const actionStatusMap = {
      'replace-order': '已替换单号',
      'reorder': '已补单',
      'mark-need-reorder': '无新单号',
      'recover-principal': '已追回本金',
      'transfer-other': '处理中',
      'release-grab': '处理中',
      'mark-closed': '已关闭',
      'mark-no-need': '无需处理',
      'revoke': '已关闭',
    } as const
    let normalizedStatus = normalizeIssueStatus(
      editForm.issue_status || actionStatusMap[effectiveAction] || currentIssue.value.issue_status
    )
    const update: any = {
      issue_status: normalizedStatus,
      ...buildPrincipalUpdate(
        editForm.principal_status,
        Number(editForm.principal_amount || editForm.loss_amount || 0),
        showPrincipalNoteField(editForm.principal_status) ? sharedNote : ''
      ),
    }

    if (effectiveAction === 'replace-order' || normalizedStatus === '已替换单号') {
      const newAmazonOrderId = editForm.new_amazon_order_id.trim()
      const oldAmazonOrderId = String(currentIssue.value.old_amazon_order_id || '').trim()
      if (!newAmazonOrderId) {
        message.warning('请填写新的亚马逊订单号')
        return
      }
      if (newAmazonOrderId === oldAmazonOrderId) {
        message.warning('新订单号必须与旧订单号不一致')
        return
      }
      update.new_amazon_order_id = newAmazonOrderId
      update.issue_status = '已替换单号'
      normalizedStatus = '已替换单号'
    }

    if (effectiveAction === 'reorder' || normalizedStatus === '已补单') {
      const replacementSubOrderNumber = editForm.replacement_sub_order_number.trim()
      if (!editForm.replacement_buyer_id && !replacementSubOrderNumber) {
        message.warning('请至少填写补单买手或补单子订单号')
        return
      }
      const newAmazonOrderId = editForm.new_amazon_order_id.trim()
      update.replacement_buyer_id = editForm.replacement_buyer_id || null
      update.replacement_buyer_name = editForm.replacement_buyer_name
      update.replacement_sub_order_number = replacementSubOrderNumber
      update.new_amazon_order_id = newAmazonOrderId || null
      update.issue_status = newAmazonOrderId ? '已补单' : '处理中'
      normalizedStatus = update.issue_status
      update.resolution_notes = sharedNote
        || `补单回流：${currentIssue.value.sub_order_number || '原子订单'} -> ${replacementSubOrderNumber || '新子订单待确认'}`
    }

    if (effectiveAction === 'recover-principal' || editForm.principal_status === '已追回') {
      if (effectiveAction === 'recover-principal' && currentIssue.value.issue_type !== '本金多返') {
        message.warning('追回本金仅用于本金多返问题单')
        return
      }
      if (editForm.principal_status === '已追回') {
        applyRecoveredPrincipalFields(update, sharedNote)
        if (effectiveAction === 'recover-principal') {
          update.issue_status = '已追回本金'
          normalizedStatus = '已追回本金'
        }
      }
    }

    if (effectiveAction && ['mark-need-reorder', 'mark-closed', 'mark-no-need'].includes(effectiveAction)) {
      update.resolution_notes = sharedNote || getHandleActionHint()
    }

    if (effectiveAction === 'transfer-other') {
      if (!editForm.transfer_to_staff?.trim()) {
        message.warning('请选择接手业务员')
        return
      }
      update.staff_id = editForm.transfer_to_staff.trim()
      update.staff_name = getSelectedStaffName(editForm.transfer_to_staff.trim())
      update.transfer_to_staff = editForm.transfer_to_staff.trim()
      update.issue_status = '处理中'
      normalizedStatus = '处理中'
      update.resolution_notes = sharedNote || `转交给 ${getSelectedStaffName(editForm.transfer_to_staff.trim())} 继续处理`
    }

    if (effectiveAction === 'release-grab') {
      update.transfer_to_staff = 'GRAB_HALL'
      update.issue_status = '处理中'
      normalizedStatus = '处理中'
      update.resolution_notes = sharedNote || '已放入抢单大厅，等待其他业务员认领处理'
    }

    if (!update.resolution_notes && sharedNote) {
      update.resolution_notes = sharedNote
    }
    if (['待确定', '待追回', '已追回', '已损失'].includes(editForm.principal_status)) {
      update.principal_reason = update.resolution_notes || sharedNote
    }

    const handledPreview = {
      ...currentIssue.value,
      ...update,
    }
    update.resolved_at = isIssueFullyHandled(handledPreview) ? new Date().toISOString() : null
    if (normalizedStatus !== '无需处理') {
      update.refund_to_client_at = null
    }

    saving.value = true
    await persistIssueUpdate(currentIssue.value, update)

    if (!isMockIssue(currentIssue.value) && (effectiveAction === 'replace-order' || normalizedStatus === '已替换单号') && editForm.new_amazon_order_id && currentIssue.value.sub_order_id) {
      await supabase.from('sub_orders').update({
        amazon_order_id: editForm.new_amazon_order_id.trim(),
      }).eq('id', currentIssue.value.sub_order_id)
    }

    message.success('操作已保存')
    drawerOpen.value = false
    await load()
    emit('changed')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    saving.value = false
  }
}

async function submitActionModal() {
  if (!currentIssue.value || !actionModalType.value) return

  saving.value = true
  try {
    const reorderTask = reorderEditorTask.value
    const sharedNote = actionModalType.value === 'reorder'
      ? String(reorderTask?._edit_order_notes || reorderTask?.notes || '').trim()
      : editForm.resolution_notes?.trim() || ''
    if (['待追回', '已追回', '已损失'].includes(editForm.principal_status) && Number(editForm.principal_amount || 0) <= 0) {
      message.warning(
        editForm.principal_status === '已损失'
          ? '请填写损失金额'
          : editForm.principal_status === '已追回'
            ? '请填写已追回金额'
            : '请填写待追回金额',
      )
      return
    }
    if (actionModalType.value === 'replace-order') {
      const newAmazonOrderId = editForm.new_amazon_order_id.trim()
      const oldAmazonOrderId = String(currentIssue.value.old_amazon_order_id || '').trim()
      if (!newAmazonOrderId) {
        message.warning('请填写新的亚马逊订单号')
        return
      }
      if (newAmazonOrderId === oldAmazonOrderId) {
        message.warning('新订单号必须与旧订单号不一致')
        return
      }

      const replaceUpdate = {
        issue_status: '已替换单号',
        new_amazon_order_id: newAmazonOrderId,
        resolution_notes: sharedNote,
        ...buildPrincipalUpdate(editForm.principal_status, Number(editForm.principal_amount || 0), sharedNote),
      }
      await persistIssueUpdate(currentIssue.value, {
        ...replaceUpdate,
        resolved_at: isIssueFullyHandled({ ...currentIssue.value, ...replaceUpdate }) ? new Date().toISOString() : null,
      })

      if (currentIssue.value.sub_order_id) {
        await supabase.from('sub_orders').update({
          amazon_order_id: newAmazonOrderId,
        }).eq('id', currentIssue.value.sub_order_id)
      }
    }

    if (actionModalType.value === 'reorder') {
      const replacementSubOrderNumber = String(reorderTask?.sub_order_number || editForm.replacement_sub_order_number || '').trim() || generateReplacementSubOrderNumber(currentIssue.value)
      const replacementBuyerId = reorderTask?.buyer_id || editForm.replacement_buyer_id
      const replacementBuyerName = reorderTask?.buyer_name || editForm.replacement_buyer_name
      const newAmazonOrderId = String(reorderTask?.amazon_order_id || reorderTask?._input_amazon_order_id || editForm.new_amazon_order_id || '').trim()

      if (!replacementBuyerId) {
        message.warning('请选择补单买手')
        return
      }

      const reorderUpdate = {
        issue_status: newAmazonOrderId ? '已补单' : '处理中',
        replacement_buyer_id: replacementBuyerId || null,
        replacement_buyer_name: replacementBuyerName,
        replacement_sub_order_id: reorderTask?._replacement_sub_order_id || currentIssue.value.replacement_sub_order_id || null,
        replacement_sub_order_number: replacementSubOrderNumber,
        new_amazon_order_id: newAmazonOrderId || null,
        resolution_notes: sharedNote || `补单回流：${currentIssue.value.sub_order_number || '原子订单'} -> ${replacementSubOrderNumber}`,
        ...buildPrincipalUpdate(editForm.principal_status, Number(editForm.principal_amount || 0), sharedNote),
      }
      await persistIssueUpdate(currentIssue.value, {
        ...reorderUpdate,
        resolved_at: isIssueFullyHandled({ ...currentIssue.value, ...reorderUpdate }) ? new Date().toISOString() : null,
      })
    }

    message.success('操作已保存')
    closeActionModal()
    drawerOpen.value = false
    await load()
    emit('changed')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    saving.value = false
  }
}

async function quickUpdateStatus(record: any, status: '无新单号' | '已关闭' | '无需处理') {
  saving.value = true
  try {
    const update: any = {
      issue_status: status,
      resolved_at: status === '无新单号' ? null : new Date().toISOString(),
    }
    if (status !== '无需处理') {
      update.refund_to_client_at = null
    }

    const { error } = await supabase.from('after_sale_issues').update(update).eq('id', record.id)
    if (error) throw error

    message.success('状态已更新')
    await load()
    emit('changed')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    saving.value = false
  }
}

function normalizeIssueStatus(status: string) {
  if (status === '已替换订单') return '已替换单号'
  if (status === '已退款给客户') return '无需处理'
  if (status === '需补单') return '无新单号'
  return status || '待处理'
}

function fmtDateTime(value: string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '--'
}

function fmtShortTime(value: string) {
  return value ? dayjs(value).format('MM-DD HH:mm') : '--'
}

function getHandledTime(record: any) {
  return record.resolved_at || record.updated_at || record.created_at || ''
}

function getAfterSaleDetailTimeline(record: any) {
  if (Array.isArray(record._mock_timeline) && record._mock_timeline.length) {
    return record._mock_timeline.map((item: any, index: number) => ({
      key: `mock-${index}`,
      type: item.type || 'processing',
      title: item.title,
      desc: item.desc || '',
      time: item.time,
    })).filter((item: any) => !!item.time)
  }
  const rows = [
    {
      key: 'created',
      type: 'created',
      title: '创建问题单',
      desc: record.issue_type || '',
      time: record.created_at,
    },
  ]
  const normalized = normalizeIssueStatus(record.issue_status)
  if (normalized !== '待处理') {
    rows.push({
      key: 'processing',
      type: 'processing',
      title: ['处理中', '无新单号'].includes(normalized) ? formatIssueStatusLabel(normalized) : '进入处理',
      desc: record.resolution_notes || '',
      time: record.updated_at || record.created_at,
    })
  }
  if (['已替换单号', '已补单', '已追回本金', '已关闭', '无需处理'].includes(normalized)) {
    rows.push({
      key: 'resolved',
      type: 'resolved',
      title: normalized,
      desc: getResolutionSummary(record) || getAfterSaleProgressSubText(record),
      time: record.resolved_at || record.updated_at || record.created_at,
    })
  }
  return rows.filter(item => !!item.time)
}

function getPrincipalDescription(record: any) {
  if (record.issue_type === '本金多返') return '多返本金待确认或追回'
  if (record.principal_stolen || getPrincipalAmount(record) > 0) return '存在本金损失风险'
  return '暂无本金异常'
}

function isOrderNumberReplacement(record: any) {
  return normalizeIssueStatus(record.issue_status) === '已替换单号' || !!record.new_amazon_order_id
}

function isReorderResult(record: any) {
  return normalizeIssueStatus(record.issue_status) === '已补单' || !!record.replacement_sub_order_number
}

function hasReplacementOrderNumber(record: any) {
  return !!String(record?.new_amazon_order_id || '').trim()
}

function isReplaceOrderHandled(record: any) {
  const newId = String(record?.new_amazon_order_id || '').trim()
  const oldId = String(record?.old_amazon_order_id || '').trim()
  return !!newId && newId !== oldId
}

function isReorderHandled(record: any) {
  const hasReplacement = !!(record?.replacement_sub_order_id || record?.replacement_sub_order_number)
  return hasReplacement && hasReplacementOrderNumber(record)
}

function isRecoverHandled(record: any) {
  if (getPrincipalStatus(record) === '已追回' && getPrincipalAmount(record) > 0) return true
  if (normalizeIssueStatus(record?.issue_status) === '已追回本金' && getPrincipalAmount(record) > 0) return true
  return Number(record?.recovered_amount || 0) > 0
}

function isIssueFullyHandled(record: any) {
  const normalized = normalizeIssueStatus(record?.issue_status)
  if (['已关闭', '无需处理'].includes(normalized)) return true
  if (normalized === '已替换单号' && isReplaceOrderHandled(record)) return true
  if (normalized === '已补单' && isReorderHandled(record)) return true
  if (normalized === '已追回本金' && isRecoverHandled(record)) return true
  if (normalized === '已处理') return true
  if (isReplaceOrderHandled(record) && normalized === '已替换单号') return true
  return false
}

function getResolutionMethodLabel(record: any) {
  const normalized = normalizeIssueStatus(record.issue_status)
  if (normalized === '已处理') {
    if (record.replacement_sub_order_number || isReorderHandled(record)) return '补单'
    if (isReplaceOrderHandled(record) || record.new_amazon_order_id) return '替换单号'
    if (isRecoverHandled(record) || record.recovery_method || record.recovery_new_sub_order_number) return '追回本金'
    if (record.refund_to_client_method || record.refund_to_client_amount || /无需处理/.test(String(record.resolution_notes || ''))) return '无需处理'
    return ''
  }
  if (normalized === '已替换单号') return '替换单号'
  if (normalized === '已补单') return '补单'
  if (normalized === '已追回本金') return '追回本金'
  if (normalized === '已关闭') return '已关闭'
  if (normalized === '无需处理') return '无需处理'
  return ''
}

function getResolutionSummary(record: any) {
  const normalized = normalizeIssueStatus(record.issue_status)
  if (normalized === '已替换单号') {
    return record.new_amazon_order_id
      ? `订单号：${record.old_amazon_order_id || '原订单'} -> ${record.new_amazon_order_id}`
      : '已替换亚马逊订单号'
  }
  if (normalized === '已补单') {
    return record.replacement_sub_order_number
      ? `补单：${record.sub_order_number || '原子订单'} -> ${record.replacement_sub_order_number}`
      : '已安排补单'
  }
  if (normalized === '无新单号') return '已判定当前无新单号，等待补单信息'
  if (normalized === '已追回本金') return `已追回本金 ${formatMoney(getPrincipalAmount(record), record)}`
  if (normalized === '已关闭') return '问题单已关闭'
  if (normalized === '无需处理') return record.refund_to_client_amount
    ? `已处理客户返款 ${formatMoney(Number(record.refund_to_client_amount || 0), record)}`
    : '无需继续处理'
  if (record.issue_type === '不下单') return '待判断补单、关闭或无需处理'
  if (record.issue_type === '取消') return '待确认取消后的本金和客户处理'
  if (record.issue_type === '退款') return '待确认退款方式和客户返款'
  if (record.issue_type === '无此订单') return '待确认订单号修改或补单'
  if (record.issue_type === '本金多返') return '待追回多返本金'
  return ''
}

function getResolutionResultSubText(record: any) {
  const normalized = normalizeIssueStatus(record.issue_status)
  if (normalized === '已替换单号') {
    return record.new_amazon_order_id
      ? `新订单号：${record.new_amazon_order_id}`
      : (record.old_amazon_order_id ? `原订单号：${record.old_amazon_order_id}` : '')
  }
  if (normalized === '已补单') {
    if (record.replacement_sub_order_number && record.new_amazon_order_id) {
      return `新子订单：${record.replacement_sub_order_number} · 新订单号：${record.new_amazon_order_id}`
    }
    if (record.replacement_sub_order_number) return `新子订单：${record.replacement_sub_order_number}`
    if (record.new_amazon_order_id) return `新订单号：${record.new_amazon_order_id}`
    return ''
  }
  if (normalized === '已追回本金') {
    const recovered = Number(record.recovered_amount || getPrincipalAmount(record) || 0)
    return recovered > 0 ? `追回金额：${formatMoney(recovered, record)}` : ''
  }
  if (normalized === '已关闭' || normalized === '无需处理') {
    return record.resolution_notes || ''
  }
  return getResolutionSummary(record)
}

function maskProgressValue(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.length <= 4) return raw
  return `${raw.slice(0, 4)}***`
}

function getAfterSaleProgressMainStatus(record: any) {
  if (isIssueFullyHandled(record)) return '已处理'
  const normalized = normalizeIssueStatus(record.issue_status)
  if (['处理中', '无新单号'].includes(normalized)) return '处理中'
  if (normalized === '已补单' && !isReorderHandled(record)) return '处理中'
  if (normalized === '已替换单号' && !isReplaceOrderHandled(record)) return '处理中'
  if (normalized === '已追回本金' && !isRecoverHandled(record)) return '处理中'
  if (normalized === '待处理') return '待处理'
  return '待处理'
}

function showPendingReorderAlert(record: any) {
  return normalizeIssueStatus(record.issue_status) === '无新单号'
}

function showGrabHallAlert(record: any) {
  if (getAfterSaleProgressMainStatus(record) !== '处理中') return false
  return record.transfer_to_staff === 'GRAB_HALL'
}

function showTransferAlert(record: any) {
  if (getAfterSaleProgressMainStatus(record) !== '处理中') return false
  const transferTo = String(record?.transfer_to_staff || '').trim()
  return !!transferTo && transferTo !== 'GRAB_HALL'
}

function getAfterSaleProgressSubText(record: any) {
  const normalized = normalizeIssueStatus(record.issue_status)
  if (normalized === '已关闭') return '已关闭'
  if (normalized === '无需处理') return '无需处理'
  if (normalized === '已替换单号') {
    return record.new_amazon_order_id
      ? `已换新单号 ${maskProgressValue(record.new_amazon_order_id)}`
      : '已换新单号'
  }
  if (normalized === '已补单') {
    return record.replacement_sub_order_number
      ? `已补新单 ${maskProgressValue(record.replacement_sub_order_number)}`
      : '已补新单'
  }
  if (normalized === '已追回本金') {
    const amount = getPrincipalAmount(record)
    return amount > 0 ? `已追回本金 ${formatMoney(amount, record)}` : '已追回本金'
  }
  if (normalized === '无新单号') return '无新单号'
  if (normalized === '处理中') return record.resolution_notes || '处理中'
  return record.resolution_notes || '待处理'
}

function afterSaleProgressTagColor(record: any) {
  const main = getAfterSaleProgressMainStatus(record)
  if (main === '已处理') return 'green'
  if (main === '处理中') return 'processing'
  return 'orange'
}

function getPrincipalStatus(record: any) {
  if (record.principal_status === '损失') return '已损失'
  if (record.principal_status) return record.principal_status
  if (record.issue_type === '本金多返') return '待追回'
  if (record.principal_stolen || Number(record.principal_amount || 0) > 0) return '已损失'
  return '待确定'
}

function getPrincipalStatusColor(record: any) {
  const status = getPrincipalStatus(record)
  if (status === '正常') return 'green'
  if (status === '已追回') return 'blue'
  if (status === '待追回') return 'orange'
  if (status === '已损失') return 'red'
  return 'default'
}

function getPrincipalAmount(record: any) {
  return Number(record.principal_amount || record.recovered_amount || record.profit_diff || record.loss_amount || 0)
}

function shouldShowPrincipalAmount(record: any) {
  return ['待追回', '已追回', '已损失'].includes(getPrincipalStatus(record)) && getPrincipalAmount(record) > 0
}

function getPrincipalAmountClass(record: any) {
  const status = getPrincipalStatus(record)
  if (status === '已损失') return 'amount-loss'
  if (status === '已追回') return 'amount-recovered'
  if (status === '待追回') return 'amount-pending'
  return 'amount-pending'
}

function hasAfterSaleResult(record: any) {
  return !!getResolutionMethodLabel(record)
    || shouldShowPrincipalAmount(record)
    || !!record.new_amazon_order_id
    || !!record.replacement_sub_order_number
    || !!record.refund_to_client_method
    || !!record.refund_to_client_amount
    || !!record.resolution_notes
    || !!record.refund_to_client_notes
}

async function handleDelete() {
  if (!currentIssue.value) return
  const { error } = await supabase.from('after_sale_issues').delete().eq('id', currentIssue.value.id)
  if (error) {
    message.error('删除失败')
    return
  }
  message.success('已删除')
  drawerOpen.value = false
  await load()
  emit('changed')
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  load()
}

watch(() => [props.issueId, props.subOrder, props.staffId], () => {
  pagination.value.current = 1
  load()
}, { immediate: true })
</script>

<style scoped>
.after-sale-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.status-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
}

.status-filter-btn span {
  font-size: 13px;
  font-weight: 600;
}

.status-filter-btn em {
  font-style: normal;
  font-size: 12px;
  color: #9ca3af;
}

.status-filter-btn:hover {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
}

.status-filter-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
}

.status-filter-btn.active em { color: inherit; }
.status-filter-btn.all.active { background: #eff6ff; }
.status-filter-btn.tone-pending.active { border-color: #d97706; background: rgba(217, 119, 6, 0.1); color: #d97706; }
.status-filter-btn.tone-processing.active { border-color: #2563eb; background: rgba(37, 99, 235, 0.1); color: #2563eb; }
.status-filter-btn.tone-replaced.active { border-color: #06b6d4; background: rgba(6, 182, 212, 0.1); color: #0891b2; }
.status-filter-btn.tone-need-reorder.active { border-color: #dc2626; background: rgba(220, 38, 38, 0.08); color: #dc2626; }
.status-filter-btn.tone-reordered.active { border-color: #059669; background: rgba(5, 150, 105, 0.08); color: #059669; }
.status-filter-btn.tone-closed.active { border-color: #6b7280; background: rgba(107, 114, 128, 0.08); color: #4b5563; }
.status-filter-btn.tone-refunded.active { border-color: #7c3aed; background: rgba(124, 58, 237, 0.08); color: #7c3aed; }

.after-sale-overview {
  padding: 16px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
}
.after-sale-overview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.after-sale-overview-title {
  color: #1a1a2e;
  font-size: 18px;
  font-weight: 800;
}
.after-sale-overview-desc {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}
.after-sale-overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.after-sale-overview-metric {
  min-height: 88px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}
.after-sale-overview-metric span {
  display: block;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
}
.after-sale-overview-metric strong {
  display: block;
  margin-top: 8px;
  color: #1a1a2e;
  font-size: 28px;
  line-height: 1;
}
.after-sale-overview-metric em {
  display: block;
  margin-top: 8px;
  color: #6b7280;
  font-size: 12px;
  font-style: normal;
}
.after-sale-overview-metric.is-success strong { color: #059669; }
.after-sale-overview-metric.is-danger {
  border-color: rgba(220, 38, 38, 0.16);
  background: rgba(220, 38, 38, 0.05);
}
.after-sale-overview-metric.is-danger strong,
.after-sale-overview-metric.is-danger em { color: #dc2626; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.stat-val { font-size: 24px; font-weight: 800; }
.stat-label { font-size: 11px; color: #6b7280; margin-top: 4px; }
.stat-pending .stat-val { color: #d97706; }
.stat-processing .stat-val { color: #2563eb; }
.stat-replaced .stat-val { color: #06b6d4; }
.stat-need-reorder .stat-val { color: #dc2626; }
.stat-reordered .stat-val { color: #059669; }
.stat-closed .stat-val { color: #6b7280; }
.stat-refunded .stat-val { color: #7c3aed; }

.card-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.total-hint { font-size: 12px; color: #9ca3af; }

.link-text { color: #2563eb; cursor: pointer; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 600; }
.cell-info { display: flex; flex-direction: column; gap: 2px; }
.cell-product-name { font-weight: 700; font-size: 13px; color: #1a1a2e; }
.cell-meta { font-size: 11px; color: #9ca3af; }
.cell-amazon-id { font-size: 10px; color: #9ca3af; font-family: 'Courier New', monospace; }
.cell-country { font-size: 11px; color: #6b7280; }
.cell-client-name { font-weight: 600; font-size: 13px; color: #1a1a2e; }
.cell-result-main { color: #1a1a2e; font-size: 12px; font-weight: 700; }
.resolution-result-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.resolution-result-tag {
  width: fit-content;
  margin: 0;
  font-weight: 700;
}
.resolution-result-sub {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.4;
  word-break: break-all;
}
.amount-usd { font-weight: 700; color: #dc2626; }
.amount-loss { font-size: 12px; font-weight: 700; color: #dc2626; }
.amount-recovered { font-size: 12px; font-weight: 700; color: #2563eb; }
.amount-pending { font-size: 12px; font-weight: 700; color: #d97706; }
.text-gray { color: #9ca3af; font-size: 12px; }
.cell-new-order { font-family: 'Courier New', monospace; font-size: 11px; color: #059669; font-weight: 600; }
.cell-profit { font-size: 11px; color: #059669; }
.cell-replacement { font-size: 12px; color: #374151; }
.cell-refund-method { font-size: 12px; color: #7c3aed; font-weight: 600; }
.cell-refund-amount { font-size: 11px; color: #dc2626; font-weight: 700; }
.refund-info-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.refund-info-main {
  color: #dc2626;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
}
.refund-info-sub {
  color: #6b7280;
  font-size: 11px;
  line-height: 1.35;
}
.principal-paid-hint {
  color: #6b7280;
  font-size: 11px;
  line-height: 1.35;
}
.after-sale-progress-cell { display: flex; flex-direction: column; gap: 6px; }
.after-sale-progress-cell.is-clickable { cursor: pointer; }
.inline-status-display {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.inline-edit-actions {
  display: flex;
  gap: 6px;
}
.after-sale-progress-main { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.after-sale-progress-tag { margin: 0; }
.after-sale-alert-tag {
  margin: 0;
  font-weight: 700;
  border-color: #dc2626;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
}
.after-sale-progress-sub {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
  word-break: break-all;
}
.remark-text { font-size: 12px; color: #374151; }
.action-btns { display: flex; flex-wrap: wrap; gap: 2px 6px; }

.drawer-section { margin-bottom: 24px; }
.drawer-section-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f0f0f0; }

.reorder-principal-block {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.reorder-principal-title {
  margin-bottom: 12px;
  color: #1a1a2e;
  font-size: 13px;
  font-weight: 700;
}

.after-sale-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.after-sale-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}
.after-sale-hero-main {
  min-width: 0;
  flex: 1;
}
.after-sale-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: #1a1a2e;
  font-size: 16px;
  font-weight: 800;
}
.after-sale-product {
  margin-top: 6px;
  color: #1f2937;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.after-sale-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
  color: #6b7280;
  font-size: 12px;
}
.after-sale-risk-card {
  min-width: 120px;
  padding: 10px 12px;
  border: 1px solid rgba(220, 38, 38, 0.16);
  border-radius: 12px;
  background: rgba(220, 38, 38, 0.06);
  text-align: right;
}
.after-sale-risk-card span {
  display: block;
  color: #6b7280;
  font-size: 11px;
}
.after-sale-risk-card strong {
  display: block;
  margin-top: 3px;
  color: #dc2626;
  font-size: 16px;
}
.after-sale-risk-card em {
  display: block;
  margin-top: 2px;
  color: #dc2626;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}
.after-sale-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.after-sale-card {
  padding: 10px 12px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.after-sale-card.is-wide {
  grid-column: 1 / -1;
}
.after-sale-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eef2f7;
  color: #1f2937;
  font-size: 13px;
  font-weight: 700;
}
.after-sale-card-title::before {
  content: '';
  width: 4px;
  height: 14px;
  border-radius: 999px;
  background: #2563eb;
}
.after-sale-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.after-sale-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 34px;
  padding: 6px 9px;
  border: 1px solid #eef2f7;
  border-radius: 10px;
  background: #f8fafc;
}
.after-sale-field.wide {
  grid-column: 1 / -1;
  align-items: flex-start;
}
.after-sale-field span {
  min-width: 72px;
  padding-right: 8px;
  border-right: 1px solid #dbe3ee;
  color: #6b7280;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}
.after-sale-field strong {
  min-width: 0;
  flex: 1;
  color: #1f2937;
  font-size: 13px;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.after-sale-field.wide strong {
  text-align: left;
  white-space: normal;
  line-height: 1.5;
}
.after-sale-empty-row {
  grid-column: 1 / -1;
  padding: 10px;
  border: 1px dashed #dbe3ee;
  border-radius: 10px;
  background: #f8fafc;
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
}
.after-sale-flow {
  padding: 4px 2px 0;
}
.after-sale-flow-title {
  margin-bottom: 12px;
  color: #1f2937;
  font-size: 13px;
  font-weight: 800;
}
.after-sale-timeline {
  display: flex;
  flex-direction: column;
  padding-left: 4px;
}
.after-sale-timeline-item {
  display: flex;
  gap: 10px;
}
.after-sale-timeline-item:last-child .after-sale-timeline-line {
  display: none;
}
.after-sale-timeline-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}
.after-sale-timeline-dot {
  width: 10px;
  height: 10px;
  margin-top: 5px;
  border-radius: 50%;
  background: #d97706;
}
.after-sale-timeline-dot.is-processing { background: #2563eb; }
.after-sale-timeline-dot.is-resolved { background: #059669; }
.after-sale-timeline-line {
  width: 2px;
  flex: 1;
  min-height: 26px;
  margin-top: 4px;
  background: #e5e7eb;
}
.after-sale-timeline-content {
  flex: 1;
  min-width: 0;
  padding-bottom: 12px;
}
.after-sale-timeline-title {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #1f2937;
  font-size: 13px;
}
.after-sale-timeline-title span {
  color: #6b7280;
  font-size: 12px;
  white-space: nowrap;
}
.after-sale-timeline-desc {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.detail-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item.full3 { grid-column: 1 / -1; }
.detail-label { font-size: 11px; color: #9ca3af; font-weight: 500; }
.detail-val { font-size: 13px; color: #1a1a2e; }
.detail-val.mono { font-family: 'Courier New', monospace; font-size: 12px; }

.handle-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
}

.handle-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.handle-summary-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
.handle-summary-item {
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}
.handle-summary-item span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}
.handle-summary-item strong {
  display: block;
  margin-top: 4px;
  color: #1a1a2e;
  font-size: 15px;
  font-weight: 800;
}
.handle-action-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
}
.handle-group-title {
  color: #1a1a2e;
  font-size: 13px;
  font-weight: 800;
}
.handle-action-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.handle-action-grid.compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.handle-action-card {
  min-height: 78px;
  padding: 12px 12px 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: all 0.16s ease;
  position: relative;
  overflow: hidden;
}
.handle-action-card:hover {
  border-color: #bfdbfe;
  background: #eff6ff;
}
.handle-action-card.active {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.12);
}
.handle-action-card strong {
  display: block;
  color: #1a1a2e;
  font-size: 14px;
}
.handle-action-card span {
  display: block;
  margin-top: 5px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.4;
}
.handle-action-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #dbeafe;
}
.handle-action-card.is-danger.active {
  border-color: rgba(220, 38, 38, 0.28);
  background: rgba(220, 38, 38, 0.07);
}
.handle-action-card.is-danger::before { background: rgba(220, 38, 38, 0.4); }
.handle-action-card.is-success.active {
  border-color: rgba(5, 150, 105, 0.28);
  background: rgba(5, 150, 105, 0.08);
}
.handle-action-card.is-success::before { background: rgba(5, 150, 105, 0.45); }
.handle-action-card.is-purple.active {
  border-color: rgba(124, 58, 237, 0.28);
  background: rgba(124, 58, 237, 0.08);
}
.handle-action-card.is-purple::before { background: rgba(124, 58, 237, 0.4); }
.handle-action-card.active::before { background: #2563eb; }
.handle-box-title {
  margin-bottom: 12px;
  color: #1f2937;
  font-size: 14px;
  font-weight: 800;
}
.handle-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}
.handle-form-grid :deep(.ant-form-item:last-child) {
  grid-column: 1 / -1;
}
.recover-amount-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-bottom: 4px;
}
.recover-amount-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.recover-amount-item span {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}
.recover-amount-item strong {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;
  white-space: nowrap;
}
.handle-empty-card {
  padding: 20px;
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  color: #6b7280;
  font-size: 13px;
  text-align: center;
}
.handle-action-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}
.handle-principal-section {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e5e7eb;
}
.handle-alert {
  margin-bottom: 12px;
}
.reorder-editor {
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f8fafc;
}
.reorder-editor-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.reorder-editor-title {
  color: #1a1a2e;
  font-size: 15px;
  font-weight: 800;
}
.reorder-editor-sub {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}
.reorder-editor-section {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
}
.reorder-editor-section-title {
  margin-bottom: 10px;
  color: #1f2937;
  font-size: 13px;
  font-weight: 800;
}
.reorder-flow-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 36px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #eff6ff;
}
.reorder-flow-card span {
  display: block;
  color: #6b7280;
  font-size: 11px;
  font-weight: 700;
}
.reorder-flow-card strong {
  display: block;
  margin-top: 4px;
  color: #1a1a2e;
  font-size: 13px;
}
.reorder-arrow {
  color: #2563eb;
  font-size: 18px;
  font-weight: 800;
  text-align: center;
}
.handle-note-form {
  margin-top: 0;
}
.handle-action-hint { font-size: 13px; color: #6b7280; line-height: 1.6; }
.action-modal-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
.action-modal-item {
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}
.action-modal-item span {
  display: block;
  color: #6b7280;
  font-size: 12px;
}
.action-modal-item strong {
  display: block;
  margin-top: 4px;
  color: #1a1a2e;
  font-size: 14px;
  font-weight: 800;
}

.buyer-option { display: flex; flex-direction: column; }
.buyer-option-meta { font-size: 11px; color: #9ca3af; }

.drawer-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f0f0f0; }

@media (max-width: 900px) {
  .after-sale-overview-head { flex-direction: column; }
  .after-sale-overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stats-row { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .stat-card { padding: 10px; }
  .stat-val { font-size: 18px; }
  .after-sale-hero { align-items: flex-start; flex-direction: column; }
  .after-sale-risk-card { width: 100%; text-align: left; }
  .after-sale-detail-grid,
  .after-sale-field-grid { grid-template-columns: 1fr; }
  .handle-action-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .detail-grid-3 { grid-template-columns: 1fr 1fr; }
}
</style>
