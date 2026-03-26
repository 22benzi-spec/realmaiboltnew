<template>
  <div class="page-content">
    <div class="page-header">
      <h1 class="page-title">创建任务</h1>
      <div class="order-number-badge" v-if="currentOrderNumber">
        <span class="badge-label">任务编号</span>
        <span class="badge-value">{{ currentOrderNumber }}</span>
      </div>
    </div>
    <a-form
      :model="form"
      :rules="rules"
      ref="formRef"
      layout="vertical"
      @finish="handleSubmit"
    >
      <a-row :gutter="24">
        <a-col :span="16">
          <!-- 客户信息（锁定区域） -->
          <div class="card-panel customer-panel" :class="{ 'customer-locked': customerLocked }">
            <div class="customer-panel-header">
              <h3 class="section-title" style="margin-bottom:0;border-bottom:none">客户信息</h3>
              <div class="customer-lock-area">
                <template v-if="customerLocked">
                  <div class="customer-locked-info">
                    <span class="locked-name">{{ form.customer_name || '客户' }}</span>
                    <span v-if="form.customer_id_str" class="locked-id">ID: {{ form.customer_id_str }}</span>
                    <span v-if="form.sales_person" class="locked-sales">销售: {{ form.sales_person }}</span>
                  </div>
                  <a-button size="small" @click="customerLocked = false" class="unlock-btn">修改客户</a-button>
                </template>
                <template v-else>
                  <a-button
                    size="small"
                    type="primary"
                    :disabled="!form.customer_name && !form.customer_id_str"
                    @click="customerLocked = true"
                    class="lock-btn"
                  >锁定客户</a-button>
                  <span class="lock-hint">锁定后可连续为同一客户创建多个ASIN任务</span>
                </template>
              </div>
            </div>
            <div v-if="!customerLocked" class="customer-fields">
              <!-- 选择客户公司 -->
              <div class="quick-select-bar">
                <div class="quick-select-label"><ShopOutlined /> 关联客户</div>
                <a-row :gutter="10" style="flex:1">
                  <a-col :span="10">
                    <a-select
                      v-model:value="form.company_id"
                      placeholder="选择客户公司（选填）"
                      show-search
                      :filter-option="(input: string, option: any) => option.label?.toLowerCase().includes(input.toLowerCase())"
                      :loading="loadingCompanies"
                      allow-clear
                      style="width:100%"
                      @change="onCompanyChange"
                      @focus="!companyOptions.length && loadCompanies()"
                    >
                      <a-select-option
                        v-for="c in companyOptions" :key="c.id" :value="c.id"
                        :label="c.company_name"
                      >
                        <span>{{ c.company_name }}</span>
                        <span v-if="c.org_id" style="color:#9ca3af;font-size:11px;margin-left:6px">{{ c.org_id }}</span>
                      </a-select-option>
                    </a-select>
                  </a-col>
                  <a-col :span="14">
                    <div v-if="form.company_id" class="client-lib-hint client-lib-hint--loaded">
                      <span>已加载 {{ storeSuggestions.length }} 家历史店铺</span>
                      <span v-if="allAsinRecords.length"> · {{ allAsinRecords.length }} 个历史ASIN</span>
                      <span style="color:#9ca3af">，下方字段填写时提供建议（可不选择）</span>
                    </div>
                    <div v-else class="client-lib-hint">
                      选择客户后，店铺/ASIN/品牌字段将根据历史数据给出建议
                    </div>
                  </a-col>
                </a-row>
              </div>
              <a-divider style="margin:10px 0"><span style="font-size:11px;color:#9ca3af">填写客户信息</span></a-divider>
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-form-item label="客户名称" style="margin-bottom:0">
                    <a-input v-model:value="form.customer_name" placeholder="客户名称（选填）" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="客户ID" style="margin-bottom:0">
                    <a-input v-model:value="form.customer_id_str" placeholder="客户ID（选填）" />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="销售人员" style="margin-bottom:0">
                    <a-input v-model:value="form.sales_person" placeholder="销售人员（选填）" />
                  </a-form-item>
                </a-col>
              </a-row>
            </div>
          </div>

          <div class="card-panel">
            <h3 class="section-title">基本信息</h3>
            <!-- 选中ASIN时显示产品预览 -->
            <div v-if="form.asin && (form.product_name || form.product_image)" class="asin-preview-bar">
              <img v-if="form.product_image" :src="form.product_image" class="asin-preview-img" />
              <div class="asin-preview-info">
                <div class="asin-preview-code">{{ form.asin }}</div>
                <div v-if="form.product_name" class="asin-preview-name">{{ form.product_name }}</div>
                <div class="asin-preview-meta">
                  <span v-if="form.brand_name" class="asin-preview-brand">{{ form.brand_name }}</span>
                  <span v-if="form.store_name" class="asin-preview-store"><ShopOutlined /> {{ form.store_name }}</span>
                </div>
              </div>
              <a-button type="link" size="small" @click="form.asin = ''; form.product_name = ''; form.product_image = ''">清除</a-button>
            </div>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="ASIN" name="asin">
                  <a-auto-complete
                    v-model:value="form.asin"
                    :options="asinSuggestions"
                    placeholder="请输入ASIN"
                    @select="onAsinSuggestionSelect"
                    style="width:100%"
                  >
                    <template #option="item">
                      <div style="display:flex;align-items:center;gap:8px">
                        <span style="font-family:monospace;font-weight:700">{{ item.value }}</span>
                        <span v-if="item.brand_name" style="color:#2563eb;font-size:11px">{{ item.brand_name }}</span>
                      </div>
                    </template>
                  </a-auto-complete>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="店铺名称" name="store_name">
                  <a-auto-complete
                    v-model:value="form.store_name"
                    :options="storeSuggestions"
                    placeholder="请输入店铺名称"
                    @select="onStoreSuggestionSelect"
                    @change="onStoreNameChange"
                    style="width:100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="品牌名称" name="brand_name">
                  <a-auto-complete
                    v-model:value="form.brand_name"
                    :options="brandSuggestions"
                    placeholder="请输入品牌名称"
                    style="width:100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="产品图片URL" name="product_image">
                  <a-input v-model:value="form.product_image" placeholder="图片链接（选填）" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="产品名称" name="product_name">
                  <a-input v-model:value="form.product_name" placeholder="产品名称（选填）" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="产品价格(USD)" name="product_price">
                  <a-input-number v-model:value="form.product_price" :min="0" style="width:100%" placeholder="0.00" @change="recalc" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="国家/站点" name="country">
                  <a-select v-model:value="form.country">
                    <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="汇率" name="exchange_rate">
                  <a-input-number v-model:value="form.exchange_rate" :min="1" :step="0.01" style="width:100%" @change="recalc" />
                </a-form-item>
              </a-col>
            </a-row>
          </div>

          <div class="card-panel">
            <h3 class="section-title">评测设置</h3>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="测评类型" name="review_type">
                  <a-select v-model:value="form.review_type">
                    <a-select-option value="普通测评">普通测评</a-select-option>
                    <a-select-option value="变参测评">变参测评</a-select-option>
                    <a-select-option value="议定参测评">议定参测评</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="下单数量（总量）" name="order_quantity">
                  <a-input-number v-model:value="form.order_quantity" :min="1" style="width:100%" @change="recalc" />
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item label="下单类型（可多选）" name="order_types">
                  <div class="order-type-selector">
                    <div
                      v-for="ot in orderTypeOptions"
                      :key="ot.value"
                      :class="['order-type-chip', form.order_types.includes(ot.value) ? 'selected' : '']"
                      @click="toggleOrderType(ot.value)"
                    >
                      <span class="chip-icon">{{ ot.icon }}</span>
                      <span class="chip-label">{{ ot.value }}</span>
                      <CheckOutlined v-if="form.order_types.includes(ot.value)" class="chip-check" />
                    </div>
                  </div>
                  <div v-if="form.order_types.length === 0" class="order-type-hint">请至少选择一种下单类型</div>
                </a-form-item>
              </a-col>
            </a-row>
          </div>

          <div class="card-panel">
            <h3 class="section-title">佣金设置</h3>
            <div class="price-table">
              <div class="price-table-row" v-for="item in priceTableItems" :key="item.label"
                :class="{ 'price-active': form.order_types.includes(item.type) }">
                <span class="price-table-label">{{ item.label }}</span>
                <a-input-number
                  v-model:value="item.modelRef.value"
                  :min="0"
                  :step="1"
                  size="small"
                  style="width:90px"
                  @change="recalc"
                  prefix="¥"
                />
              </div>
            </div>

            <div class="bill-summary">
              <h4 class="bill-title">账单计算（多类型汇总）</h4>
              <div class="bill-formula">
                <span class="formula-text">
                  产品回款 = ${{ form.product_price || 0 }} × {{ form.exchange_rate }} × {{ form.order_quantity }} 单
                </span>
              </div>
              <div class="bill-rows">
                <div class="bill-row">
                  <span class="bill-row-label">产品回款小计</span>
                  <span>¥{{ productSubtotal.toFixed(2) }}</span>
                </div>
                <div class="bill-divider"></div>
                <template v-if="form.order_types.length > 0">
                  <div class="bill-section-label">佣金明细</div>
                  <template v-for="ot in form.order_types" :key="ot">
                    <div class="bill-row bill-row-commission">
                      <span class="bill-row-label">
                        <span class="bill-type-dot" :style="{ background: orderTypeColor(ot) }"></span>
                        {{ ot }}（{{ form.order_quantity }} 单 × ¥{{ priceMap[ot] || 0 }}/单）
                      </span>
                      <span class="commission-val">¥{{ ((priceMap[ot] || 0) * form.order_quantity).toFixed(2) }}</span>
                    </div>
                  </template>
                  <div class="bill-row bill-row-commission-sub">
                    <span class="bill-row-label">佣金小计</span>
                    <span class="commission-val">¥{{ commissionSubtotal.toFixed(2) }}</span>
                  </div>
                  <div class="bill-divider"></div>
                </template>
                <div class="bill-row total-row">
                  <span>合计总金额
                    <span v-if="form.order_types.length > 0" class="total-formula-hint">
                      （产品回款 ¥{{ productSubtotal.toFixed(2) }} + 佣金 ¥{{ commissionSubtotal.toFixed(2) }}）
                    </span>
                  </span>
                  <strong class="total-amount">¥{{ form.total_amount.toFixed(2) }}</strong>
                </div>
              </div>
            </div>
          </div>

          <div class="card-panel">
            <h3 class="section-title">排期设置</h3>

            <!-- 快速排期区域 -->
            <div class="quick-schedule-box">
              <div class="quick-schedule-header">
                <span class="quick-schedule-title">快速排期</span>
                <span class="quick-schedule-desc">适合每天任务相同的情况，一键批量生成</span>
              </div>
              <div class="quick-schedule-form">
                <div class="qs-field">
                  <label class="qs-label">开始日期</label>
                  <a-date-picker
                    v-model:value="quickSchedule.startDate"
                    style="width:100%"
                    placeholder="选择开始日期"
                  />
                </div>
                <div class="qs-field">
                  <label class="qs-label">持续天数</label>
                  <a-input-number
                    v-model:value="quickSchedule.days"
                    :min="1"
                    :max="60"
                    style="width:100%"
                    placeholder="天数"
                    @change="updateQuickPreview"
                  />
                </div>
                <div class="qs-field">
                  <label class="qs-label">每天数量</label>
                  <a-input-number
                    v-model:value="quickSchedule.dailyQty"
                    :min="1"
                    style="width:100%"
                    placeholder="单/天"
                    @change="updateQuickPreview"
                  />
                </div>
                <div class="qs-field qs-field-wide">
                  <label class="qs-label">每天下单类型</label>
                  <div class="schedule-type-chips">
                    <div
                      v-for="ot in orderTypeOptions"
                      :key="ot.value"
                      :class="['sched-type-chip', quickSchedule.order_types.includes(ot.value) ? 'selected' : '',
                        !form.order_types.includes(ot.value) ? 'disabled' : '']"
                      @click="toggleQuickType(ot.value)"
                    >{{ ot.value }}</div>
                  </div>
                </div>
                <div class="qs-field qs-field-wide">
                  <label class="qs-label">每天关键词（可选）</label>
                  <div v-for="(_, i) in quickSchedule.keywords" :key="i" class="keyword-row">
                    <a-input
                      v-model:value="quickSchedule.keywords[i]"
                      placeholder="输入关键词"
                      style="flex:1"
                    />
                    <a-button type="text" danger @click="quickSchedule.keywords.splice(i,1)">
                      <DeleteOutlined />
                    </a-button>
                  </div>
                  <a-button type="dashed" size="small" @click="quickSchedule.keywords.push('')" style="margin-top:4px">
                    <PlusOutlined /> 添加关键词
                  </a-button>
                </div>
              </div>

              <!-- 预览 -->
              <div v-if="quickPreviewDays.length" class="qs-preview">
                <div class="qs-preview-info">
                  <span>共 <strong>{{ quickPreviewDays.length }}</strong> 天</span>
                  <span>合计 <strong>{{ quickPreviewDays.length * (quickSchedule.dailyQty || 0) }}</strong> 单</span>
                  <span v-if="quickPreviewDays.length * (quickSchedule.dailyQty || 0) > form.order_quantity" class="qs-over">
                    超出总量 {{ quickPreviewDays.length * (quickSchedule.dailyQty || 0) - form.order_quantity }} 单
                  </span>
                  <span v-else-if="quickPreviewDays.length * (quickSchedule.dailyQty || 0) === form.order_quantity" class="qs-ok">
                    恰好排满
                  </span>
                </div>
                <div class="qs-preview-dates">
                  <span v-for="d in quickPreviewDays" :key="d" class="qs-date-chip">{{ d }}</span>
                </div>
              </div>

              <div class="qs-actions">
                <a-button
                  type="primary"
                  :disabled="!quickSchedule.startDate || !quickSchedule.days || !quickSchedule.dailyQty"
                  @click="applyQuickSchedule"
                >
                  <ThunderboltOutlined /> 一键生成排期
                </a-button>
                <a-button @click="clearScheduleEntries" v-if="scheduleEntries.length">
                  清空已排期
                </a-button>
              </div>
            </div>

            <div class="schedule-section-divider">
              <span>或手动按日设置</span>
            </div>

            <div class="schedule-summary-bar">
              <div class="summary-item">
                <span class="summary-label">任务总订单量</span>
                <span class="summary-val total">{{ form.order_quantity }}</span>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-item">
                <span class="summary-label">已排订单数</span>
                <span class="summary-val scheduled" :class="{ over: scheduledTotal > form.order_quantity }">{{ scheduledTotal }}</span>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-item">
                <span class="summary-label">剩余未排数</span>
                <span class="summary-val" :class="remainingClass">{{ form.order_quantity - scheduledTotal }}</span>
              </div>
              <div class="summary-progress">
                <div
                  class="summary-progress-bar"
                  :class="{ over: scheduledTotal > form.order_quantity }"
                  :style="{ width: Math.min((scheduledTotal / (form.order_quantity || 1)) * 100, 100) + '%' }"
                ></div>
              </div>
            </div>

            <!-- 关键词模板区域 -->
            <div class="kw-groups-section">
              <div class="kw-groups-header">
                <span class="kw-groups-title">关键词模板</span>
                <span class="kw-groups-hint">预设多组关键词，排期时可按组一键填入各下单类型（每行支持关键词+链接）</span>
                <a-button type="primary" ghost size="small" @click="addKwGroup" style="margin-left:auto">
                  <PlusOutlined /> 新增关键词组
                </a-button>
              </div>

              <div v-if="kwGroups.length === 0" class="kw-groups-empty">
                暂无关键词组，点击「新增关键词组」添加
              </div>

              <div v-for="(group, gi) in kwGroups" :key="gi" class="kw-group-card">
                <div class="kw-group-card-header">
                  <a-input
                    v-model:value="group.name"
                    size="small"
                    style="width:160px;font-weight:600"
                    placeholder="组名（如：主关键词、长尾词）"
                  />
                  <div class="kw-group-actions">
                    <a-button
                      size="small"
                      type="primary"
                      ghost
                      :disabled="editingTypeDetails.length === 0"
                      @click="applyGroupToAll(gi)"
                    >填入所有类型</a-button>
                    <a-button size="small" danger type="text" @click="removeKwGroup(gi)">
                      <DeleteOutlined />
                    </a-button>
                  </div>
                </div>
                <div class="kw-group-items">
                  <div v-for="(item, ii) in group.items" :key="ii" class="kw-group-item-row">
                    <div class="kw-mode-toggle">
                      <span
                        :class="['kw-mode-btn', item.mode === 'keyword' ? 'active' : '']"
                        @click="item.mode = 'keyword'"
                      >关键词</span>
                      <span
                        :class="['kw-mode-btn', item.mode === 'link' ? 'active' : '']"
                        @click="item.mode = 'link'"
                      >链接</span>
                    </div>
                    <a-input
                      v-model:value="item.value"
                      size="small"
                      :placeholder="item.mode === 'keyword' ? '输入搜索关键词' : '粘贴操作链接'"
                      style="flex:1"
                    />
                    <a-button type="text" danger size="small" @click="removeKwGroupItem(gi, ii)" style="flex-shrink:0">
                      <DeleteOutlined />
                    </a-button>
                  </div>
                  <div class="kw-group-add-btns">
                    <a-button type="dashed" size="small" @click="() => { kwGroups[gi].items.push({ mode: 'keyword', value: '' }) }">
                      <PlusOutlined /> 添加关键词行
                    </a-button>
                    <a-button type="dashed" size="small" @click="() => { kwGroups[gi].items.push({ mode: 'link', value: '' }) }">
                      <PlusOutlined /> 添加链接行
                    </a-button>
                  </div>
                </div>
              </div>
            </div>

            <div class="schedule-layout">
              <div class="calendar-area">
                <a-calendar
                  v-model:value="calendarValue"
                  :fullscreen="false"
                  @select="handleDateSelect"
                >
                  <template #dateCellRender="{ current }">
                    <div
                      :class="['cal-cell-wrap', selectedDates.includes(current.format('YYYY-MM-DD')) ? 'cal-selected' : '']"
                    >
                      <div v-if="getScheduleForDate(current)" class="cal-cell">
                        <span class="cal-qty">{{ getScheduleForDate(current)!.quantity }}单</span>
                        <div class="cal-types">
                          <span
                            v-for="t in getScheduleForDate(current)!.order_types"
                            :key="t"
                            class="cal-type-dot"
                            :style="{ background: orderTypeColor(t) }"
                          ></span>
                        </div>
                      </div>
                    </div>
                  </template>
                </a-calendar>
              </div>
              <div class="schedule-form-area">
                <!-- 已选日期展示 -->
                <div class="selected-date-header">
                  <span class="selected-date-label">已选日期</span>
                  <div v-if="selectedDates.length" class="selected-dates-list">
                    <span
                      v-for="d in [...selectedDates].sort()" :key="d"
                      class="selected-date-chip"
                      :class="{ 'has-schedule': scheduleEntries.some(e=>e.date===d) }"
                    >{{ d }}</span>
                    <a-button type="text" size="small" @click="clearDateSelection" style="color:#9ca3af;font-size:11px;margin-left:4px">清除选择</a-button>
                  </div>
                  <span v-else class="selected-date-value">点击日历选择，可多选</span>
                </div>

                <template v-if="selectedDates.length > 0">
                  <div v-if="selectedDates.length > 1" class="multi-day-tip">
                    已选 <strong>{{ selectedDates.length }}</strong> 天，以下设置将应用到所有选中日期
                  </div>

                  <!-- 类型选择 -->
                  <div class="type-select-label">选择下单类型（点击添加/移除）</div>
                  <div class="schedule-type-chips" style="margin-bottom:12px">
                    <div
                      v-for="ot in orderTypeOptions"
                      :key="ot.value"
                      :class="['sched-type-chip', editingTypeDetails.some(d=>d.type===ot.value) ? 'selected' : '']"
                      @click="toggleManualType(ot.value)"
                    >{{ ot.value }}</div>
                  </div>

                  <!-- 每个类型的数量+关键词/链接 -->
                  <div
                    v-for="(td, ti) in editingTypeDetails"
                    :key="td.type"
                    class="type-detail-block"
                    :style="{ borderLeftColor: orderTypeColor(td.type) }"
                  >
                    <div class="type-detail-header">
                      <span class="type-detail-name" :style="{ color: orderTypeColor(td.type) }">{{ td.type }}</span>
                      <div class="type-detail-qty-row">
                        <span class="type-detail-qty-label">数量</span>
                        <a-input-number
                          v-model:value="td.qty"
                          :min="1"
                          size="small"
                          style="width:72px"
                        />
                        <span class="type-detail-qty-unit">单</span>
                      </div>
                    </div>
                    <div class="type-detail-keywords">
                      <div class="kw-quick-actions">
                        <template v-if="kwGroups.length > 0">
                          <span style="font-size:11px;color:#6b7280;margin-right:2px">继承关键词组：</span>
                          <a-button
                            v-for="(grp, gi) in kwGroups"
                            :key="gi"
                            size="small"
                            type="primary"
                            ghost
                            style="font-size:11px;height:22px;padding:0 8px"
                            @click="fillFromGroup(ti, gi)"
                          >{{ grp.name || `组${gi+1}` }}</a-button>
                        </template>
                        <a-select
                          v-if="copyFromDateOptions(td.type).length > 0"
                          size="small"
                          placeholder="从已排期复制"
                          style="width:130px;font-size:11px"
                          :options="copyFromDateOptions(td.type)"
                          @select="(val: string) => copyKeywordsFromDate(ti, val)"
                        />
                      </div>
                      <div v-for="(entry, ei) in td.kwEntries" :key="ei" class="kw-group-item-row" style="margin-top:4px">
                        <div class="kw-mode-toggle">
                          <span
                            :class="['kw-mode-btn', entry.mode === 'keyword' ? 'active' : '']"
                            @click="entry.mode = 'keyword'"
                          >关键词</span>
                          <span
                            :class="['kw-mode-btn', entry.mode === 'link' ? 'active kw-mode-link' : '']"
                            @click="entry.mode = 'link'"
                          >链接</span>
                        </div>
                        <a-input
                          v-model:value="entry.value"
                          :placeholder="entry.mode === 'keyword' ? '输入搜索关键词' : '粘贴操作链接'"
                          size="small"
                          style="flex:1"
                        />
                        <a-button type="text" danger size="small" @click="removeTypeKwEntry(ti, ei)" style="flex-shrink:0">
                          <DeleteOutlined />
                        </a-button>
                      </div>
                      <div class="kw-group-add-btns" style="margin-top:6px">
                        <a-button type="dashed" size="small" @click="() => editingTypeDetails[ti].kwEntries.push({ mode: 'keyword', value: '' })">
                          <PlusOutlined /> 关键词行
                        </a-button>
                        <a-button type="dashed" size="small" @click="() => editingTypeDetails[ti].kwEntries.push({ mode: 'link', value: '' })">
                          <PlusOutlined /> 链接行
                        </a-button>
                      </div>
                    </div>
                  </div>

                  <!-- 合计 -->
                  <div v-if="editingTypeDetails.length" class="type-total-row">
                    <span>每天合计</span>
                    <strong>{{ editingQuantityTotal }} 单</strong>
                    <span v-if="selectedDates.length > 1" class="type-total-sub">× {{ selectedDates.length }} 天 = {{ editingQuantityTotal * selectedDates.length }} 单</span>
                  </div>

                  <div class="schedule-actions">
                    <a-button
                      type="primary"
                      :disabled="editingTypeDetails.length === 0"
                      @click="saveScheduleEntry"
                    >保存排期</a-button>
                    <a-button
                      danger
                      v-if="selectedDates.some(d => scheduleEntries.some(e=>e.date===d))"
                      @click="removeScheduleEntries"
                    >删除所选日期排期</a-button>
                    <a-button @click="clearDateSelection">取消选择</a-button>
                  </div>
                </template>

                <template v-else>
                  <div class="no-date-placeholder">
                    <span>请在左侧日历点击选择日期</span>
                    <span v-if="scheduleEntries.length > 0" style="font-size:12px;color:#9ca3af;margin-top:4px">点击已排期日期可查看/修改该日配置</span>
                  </div>
                </template>
              </div>
            </div>

            <div v-if="scheduleEntries.length > 0" class="schedule-list">
              <h4 class="schedule-list-title">已排期 ({{ scheduleEntries.length }} 天)</h4>
              <div class="schedule-tags">
                <div
                  v-for="entry in scheduleEntriesSorted"
                  :key="entry.date"
                  class="schedule-tag"
                  :class="{ 'is-selected': selectedDates.includes(entry.date) }"
                  @click="handleDateSelect(dayjs(entry.date))"
                >
                  <span class="schedule-tag-date">{{ entry.date }}</span>
                  <span class="schedule-tag-qty">{{ entry.quantity }}单</span>
                  <template v-if="entry.typeDetails?.length">
                    <span
                      v-for="td in entry.typeDetails"
                      :key="td.type"
                      class="schedule-tag-type"
                      :style="{ background: orderTypeColor(td.type) + '22', color: orderTypeColor(td.type), borderColor: orderTypeColor(td.type) + '44' }"
                    >{{ td.type }}×{{ td.qty }}<template v-if="td.keywords.filter(k=>k).length"> ({{ td.keywords.filter(k=>k).join('·') }})</template></span>
                  </template>
                  <template v-else>
                    <span
                      v-for="t in entry.order_types"
                      :key="t"
                      class="schedule-tag-type"
                      :style="{ background: orderTypeColor(t) + '22', color: orderTypeColor(t), borderColor: orderTypeColor(t) + '44' }"
                    >{{ t }}</span>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </a-col>

        <a-col :span="8">
          <div class="card-panel">
            <h3 class="section-title">其他信息</h3>
            <a-form-item label="Seller">
              <a-input v-model:value="form.seller" placeholder="Seller（选填）" />
            </a-form-item>
            <a-form-item label="类目">
              <a-input v-model:value="form.category" placeholder="产品类目（选填）" />
            </a-form-item>
            <a-form-item label="备注">
              <a-textarea v-model:value="form.notes" :rows="3" placeholder="备注信息（选填）" />
            </a-form-item>
          </div>

          <div class="card-panel">
            <h3 class="section-title">关键词</h3>
            <div v-for="(_kw, i) in keywords" :key="i" class="keyword-row">
              <a-input v-model:value="keywords[i]" placeholder="输入关键词" style="flex:1" />
              <a-button type="text" danger @click="removeKeyword(i)">
                <DeleteOutlined />
              </a-button>
            </div>
            <a-button type="dashed" block @click="addKeyword" style="margin-top:8px">
              <PlusOutlined /> 添加关键词
            </a-button>
          </div>

          <div class="card-panel order-type-summary-card">
            <h3 class="section-title">下单类型汇总</h3>
            <div v-if="form.order_types.length === 0" class="no-type-hint">请先选择下单类型</div>
            <template v-else>
              <div v-for="ot in form.order_types" :key="ot" class="type-summary-row">
                <span class="type-dot" :style="{ background: orderTypeColor(ot) }"></span>
                <span class="type-name">{{ ot }}</span>
                <span class="type-price">佣金 ¥{{ priceMap[ot] || 0 }}/单</span>
              </div>
              <div class="type-summary-total">
                <span>共 {{ form.order_types.length }} 种类型</span>
                <span class="type-total-qty">{{ form.order_quantity }} 单总量</span>
              </div>
            </template>
          </div>

          <div v-if="customerLocked" class="multi-asin-tip">
            <span class="multi-asin-icon">&#x1F4CB;</span>
            <span>客户已锁定：<strong>{{ form.customer_name || form.customer_id_str }}</strong></span>
            <span class="multi-asin-sub">提交后可一键切换下一个ASIN</span>
          </div>

          <div class="form-actions">
            <a-button @click="resetForm">重置全部</a-button>
            <a-button type="primary" html-type="submit" :loading="submitting">
              提交任务
            </a-button>
          </div>
        </a-col>
      </a-row>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, DeleteOutlined, CheckOutlined, ThunderboltOutlined, ShopOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'
import dayjs, { type Dayjs } from 'dayjs'

const formRef = ref()
const submitting = ref(false)
const keywords = ref<string[]>([''])
const kwGroups = ref<KwGroup[]>([])
const currentOrderNumber = ref('')
const customerLocked = ref(false)

const companyOptions = ref<any[]>([])
const storeRecords = ref<any[]>([])
const allAsinRecords = ref<any[]>([])
const currentStoreAsins = ref<any[]>([])
const loadingCompanies = ref(false)

const storeSuggestions = computed(() =>
  storeRecords.value.map(s => ({ value: s.store_name, storeId: s.id, country: s.country }))
)

const asinSuggestions = computed(() =>
  currentStoreAsins.value.map(a => ({
    value: a.asin,
    brand_name: a.brand_name || '',
    product_name: a.product_name || '',
    product_image: a.product_image || '',
    product_price: a.product_price || 0,
  }))
)

const brandSuggestions = computed(() => {
  const brands = new Set<string>()
  allAsinRecords.value.forEach(a => { if (a.brand_name) brands.add(a.brand_name) })
  return [...brands].map(b => ({ value: b }))
})

async function loadCompanies() {
  loadingCompanies.value = true
  const { data } = await supabase
    .from('client_companies')
    .select('id, company_name, org_id')
    .eq('status', '活跃')
    .order('company_name')
  companyOptions.value = data || []
  loadingCompanies.value = false
}

async function onCompanyChange(companyId: string) {
  form.store_id = ''
  form.asin = ''
  form.store_name = ''
  form.brand_name = ''
  form.product_name = ''
  form.product_image = ''
  form.product_price = 0
  storeRecords.value = []
  allAsinRecords.value = []
  currentStoreAsins.value = []

  if (!companyId) {
    form.customer_name = ''
    form.customer_id_str = ''
    return
  }
  const company = companyOptions.value.find(c => c.id === companyId)
  if (company) {
    form.customer_name = company.company_name
    form.customer_id_str = company.org_id || ''
  }

  const { data: storeData } = await supabase
    .from('client_stores')
    .select('id, store_name, country, platform')
    .eq('company_id', companyId)
    .order('store_name')
  storeRecords.value = storeData || []

  if (storeRecords.value.length) {
    const storeIds = storeRecords.value.map(s => s.id)
    const { data: asinData } = await supabase
      .from('client_store_asins')
      .select('id, store_id, asin, brand_name, product_name, product_image, product_price')
      .in('store_id', storeIds)
      .order('asin')
    allAsinRecords.value = asinData || []
  }
}

function onStoreSuggestionSelect(value: string, option: any) {
  form.store_name = value
  if (option.country) form.country = option.country
  if (option.storeId) {
    form.store_id = option.storeId
    currentStoreAsins.value = allAsinRecords.value.filter(a => a.store_id === option.storeId)
  }
}

function onStoreNameChange(value: string) {
  const matched = storeRecords.value.find(s => s.store_name.toLowerCase() === value.toLowerCase())
  if (matched) {
    form.store_id = matched.id
    currentStoreAsins.value = allAsinRecords.value.filter(a => a.store_id === matched.id)
  } else {
    form.store_id = ''
    currentStoreAsins.value = allAsinRecords.value
  }
}

function onAsinSuggestionSelect(value: string, option: any) {
  form.asin = value
  if (option.brand_name) form.brand_name = option.brand_name
  if (option.product_name) form.product_name = option.product_name
  if (option.product_image) form.product_image = option.product_image
  if (option.product_price) { form.product_price = option.product_price; recalc() }
}

async function syncToClientLibrary() {
  if (!form.company_id || !form.store_name?.trim() || !form.asin?.trim()) return
  try {
    const storePayload = {
      company_id: form.company_id,
      store_name: form.store_name.trim(),
      platform: '亚马逊',
      country: form.country || '美国',
      status: '活跃',
    }
    const { data: storeResult } = await supabase
      .from('client_stores')
      .upsert([storePayload], { onConflict: 'company_id,store_name' })
      .select('id')
      .maybeSingle()

    let storeId = storeResult?.id
    if (!storeId) {
      const { data: existing } = await supabase
        .from('client_stores')
        .select('id')
        .eq('company_id', form.company_id)
        .eq('store_name', form.store_name.trim())
        .maybeSingle()
      storeId = existing?.id
    }
    if (!storeId) return

    await supabase.from('client_store_asins').upsert([{
      store_id: storeId,
      company_id: form.company_id,
      asin: form.asin.trim().toUpperCase(),
      brand_name: form.brand_name?.trim() || '',
      product_name: form.product_name?.trim() || null,
      product_image: form.product_image?.trim() || null,
      product_price: form.product_price || null,
      is_active: true,
    }], { onConflict: 'store_id,asin' })
  } catch {
    // 静默处理，不影响主流程
  }
}

const countries = ['美国', '德国', '英国', '加拿大']

const orderTypeOptions = [
  { value: '免评', icon: '○', color: '#6b7280' },
  { value: '文字评', icon: '✍', color: '#2563eb' },
  { value: '图片评', icon: '🖼', color: '#7c3aed' },
  { value: '视频评', icon: '▶', color: '#dc2626' },
  { value: 'Feedback', icon: '★', color: '#d97706' },
]

const TYPE_COLORS: Record<string, string> = {
  '免评': '#6b7280',
  '文字评': '#2563eb',
  '图片评': '#9333ea',
  '视频评': '#dc2626',
  'Feedback': '#d97706',
}

function orderTypeColor(t: string): string {
  return TYPE_COLORS[t] || '#6b7280'
}

interface KwEntry {
  mode: 'keyword' | 'link'
  value: string
}

interface KwGroup {
  name: string
  items: KwEntry[]
}

interface TypeDetail {
  type: string
  qty: number
  keywords: string[]
  kwEntries: KwEntry[]
}

interface ScheduleEntry {
  date: string
  quantity: number
  keywords: string[]
  order_types: string[]
  typeDetails: TypeDetail[]
}


const scheduleEntries = ref<ScheduleEntry[]>([])
const calendarValue = ref<Dayjs>(dayjs())
const selectedDates = ref<string[]>([])
const editingTypeDetails = ref<TypeDetail[]>([])

const editingQuantityTotal = computed(() =>
  editingTypeDetails.value.reduce((s, d) => s + (d.qty || 0), 0)
)

function toggleManualType(val: string) {
  const idx = editingTypeDetails.value.findIndex(d => d.type === val)
  if (idx === -1) {
    editingTypeDetails.value.push({ type: val, qty: 1, keywords: [], kwEntries: [{ mode: 'keyword', value: '' }] })
  } else {
    editingTypeDetails.value.splice(idx, 1)
  }
}

function addKwGroup() {
  kwGroups.value.push({ name: `关键词组 ${kwGroups.value.length + 1}`, items: [{ mode: 'keyword', value: '' }] })
}

function removeKwGroup(gi: number) {
  kwGroups.value.splice(gi, 1)
}

function removeKwGroupItem(gi: number, ii: number) {
  kwGroups.value[gi].items.splice(ii, 1)
}

function fillFromGroup(typeIdx: number, gi: number) {
  const group = kwGroups.value[gi]
  const entries = group.items.filter(it => it.value.trim())
  if (!entries.length) return
  editingTypeDetails.value[typeIdx].kwEntries = entries.map(it => ({ mode: it.mode, value: it.value }))
  editingTypeDetails.value[typeIdx].keywords = entries.filter(it => it.mode === 'keyword').map(it => it.value)
}

function applyGroupToAll(gi: number) {
  const group = kwGroups.value[gi]
  const entries = group.items.filter(it => it.value.trim())
  if (!entries.length) return
  editingTypeDetails.value.forEach(td => {
    td.kwEntries = entries.map(it => ({ mode: it.mode, value: it.value }))
    td.keywords = entries.filter(it => it.mode === 'keyword').map(it => it.value)
  })
  message.success(`"${group.name}" 已填入所有类型`)
}

function removeTypeKwEntry(typeIdx: number, ei: number) {
  editingTypeDetails.value[typeIdx].kwEntries.splice(ei, 1)
}

function copyFromDateOptions(typeName: string) {
  return scheduleEntries.value
    .filter(e => e.typeDetails?.some(td => td.type === typeName && (td.kwEntries?.some(e => e.value.trim()) || td.keywords.some(k => k.trim()))))
    .map(e => ({ label: e.date, value: e.date }))
}

function copyKeywordsFromDate(typeIdx: number, dateStr: string) {
  const entry = scheduleEntries.value.find(e => e.date === dateStr)
  const td = entry?.typeDetails?.find(d => d.type === editingTypeDetails.value[typeIdx].type)
  if (td) {
    if (td.kwEntries?.length) {
      editingTypeDetails.value[typeIdx].kwEntries = td.kwEntries.map(e => ({ ...e }))
      editingTypeDetails.value[typeIdx].keywords = td.kwEntries.filter(e => e.mode === 'keyword').map(e => e.value).filter(v => v.trim())
    } else if (td.keywords?.length) {
      editingTypeDetails.value[typeIdx].kwEntries = td.keywords.map(k => ({ mode: 'keyword' as const, value: k }))
      editingTypeDetails.value[typeIdx].keywords = [...td.keywords]
    }
  }
}

const quickSchedule = reactive<{
  startDate: Dayjs | null
  days: number
  dailyQty: number
  order_types: string[]
  keywords: string[]
}>({
  startDate: null,
  days: 1,
  dailyQty: 1,
  order_types: [],
  keywords: [],
})

const quickPreviewDays = computed<string[]>(() => {
  if (!quickSchedule.startDate || !quickSchedule.days || quickSchedule.days < 1) return []
  const result: string[] = []
  for (let i = 0; i < quickSchedule.days; i++) {
    result.push(quickSchedule.startDate.add(i, 'day').format('YYYY-MM-DD'))
  }
  return result
})

function updateQuickPreview() {}

function toggleQuickType(val: string) {
  if (!form.order_types.includes(val)) return
  const idx = quickSchedule.order_types.indexOf(val)
  if (idx === -1) quickSchedule.order_types.push(val)
  else quickSchedule.order_types.splice(idx, 1)
}

function applyQuickSchedule() {
  if (!quickSchedule.startDate || !quickSchedule.days || !quickSchedule.dailyQty) return
  const dates = quickPreviewDays.value
  const totalNew = dates.length * quickSchedule.dailyQty
  const existingOutside = scheduleEntries.value
    .filter(e => !dates.includes(e.date))
    .reduce((s, e) => s + e.quantity, 0)
  const newTotal = existingOutside + totalNew

  const doApply = () => {
    const cleanKws = quickSchedule.keywords.filter(k => k.trim())
    dates.forEach(d => {
      const idx = scheduleEntries.value.findIndex(e => e.date === d)
      const entry: ScheduleEntry = {
        date: d,
        quantity: quickSchedule.dailyQty,
        keywords: [...cleanKws],
        order_types: [...quickSchedule.order_types],
        typeDetails: quickSchedule.order_types.map(t => ({
          type: t,
          qty: quickSchedule.dailyQty,
          keywords: [...cleanKws],
          kwEntries: cleanKws.map(k => ({ mode: 'keyword' as const, value: k })),
        })),
      }
      if (idx >= 0) scheduleEntries.value[idx] = entry
      else scheduleEntries.value.push(entry)
    })
    message.success(`已生成 ${dates.length} 天排期，合计 ${totalNew} 单`)
  }

  if (newTotal > form.order_quantity) {
    Modal.confirm({
      title: '排期数量超出',
      content: `生成后总排期量将达 ${newTotal} 单，超出任务总量 ${newTotal - form.order_quantity} 单。是否继续？`,
      okText: '继续生成',
      cancelText: '取消',
      onOk: doApply,
    })
  } else {
    doApply()
  }
}

function clearScheduleEntries() {
  Modal.confirm({
    title: '确认清空',
    content: '将清空所有已排期数据，确定吗？',
    okText: '清空',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => {
      scheduleEntries.value = []
      message.success('已清空排期')
    },
  })
}

const scheduleEntriesSorted = computed(() =>
  [...scheduleEntries.value].sort((a, b) => a.date.localeCompare(b.date))
)

const scheduledTotal = computed(() =>
  scheduleEntries.value.reduce((sum, e) => sum + (e.quantity || 0), 0)
)

const remainingClass = computed(() => {
  const rem = form.order_quantity - scheduledTotal.value
  if (rem < 0) return 'over'
  if (rem === 0) return 'done'
  return 'remaining'
})

function getScheduleForDate(d: Dayjs): ScheduleEntry | undefined {
  return scheduleEntries.value.find(e => e.date === d.format('YYYY-MM-DD'))
}

function loadTypeDetailsFromEntry(entry: ScheduleEntry) {
  return entry.typeDetails.map(td => ({
    type: td.type,
    qty: td.qty,
    keywords: [...(td.keywords || [])],
    kwEntries: td.kwEntries?.length
      ? td.kwEntries.map(e => ({ ...e }))
      : (td.keywords || []).map(k => ({ mode: 'keyword' as const, value: k })),
  }))
}

function handleDateSelect(d: Dayjs) {
  const dateStr = d.format('YYYY-MM-DD')
  calendarValue.value = d

  const alreadyIdx = selectedDates.value.indexOf(dateStr)
  if (alreadyIdx >= 0) {
    selectedDates.value.splice(alreadyIdx, 1)
    if (selectedDates.value.length === 0) {
      editingTypeDetails.value = []
    } else {
      const lastDate = selectedDates.value[selectedDates.value.length - 1]
      const lastExisting = scheduleEntries.value.find(e => e.date === lastDate)
      if (lastExisting && lastExisting.typeDetails?.length) {
        editingTypeDetails.value = loadTypeDetailsFromEntry(lastExisting)
      }
    }
  } else {
    selectedDates.value.push(dateStr)
    const existing = scheduleEntries.value.find(e => e.date === dateStr)
    if (existing && existing.typeDetails?.length) {
      editingTypeDetails.value = loadTypeDetailsFromEntry(existing)
    } else if (selectedDates.value.length === 1) {
      editingTypeDetails.value = []
    }
  }
}

function clearDateSelection() {
  selectedDates.value = []
  editingTypeDetails.value = []
}

function saveScheduleEntry() {
  if (selectedDates.value.length === 0) {
    message.warning('请先在日历上选择日期')
    return
  }
  if (editingTypeDetails.value.length === 0) {
    message.warning('请至少选择一种下单类型')
    return
  }
  const dayQty = editingQuantityTotal.value
  if (dayQty < 1) {
    message.warning('每天总订单数量不能为 0')
    return
  }

  const datesCount = selectedDates.value.length
  const outsideQty = scheduleEntries.value
    .filter(e => !selectedDates.value.includes(e.date))
    .reduce((s, e) => s + e.quantity, 0)
  const newTotal = outsideQty + datesCount * dayQty
  const total = form.order_quantity

  const doSave = () => {
    const details: TypeDetail[] = editingTypeDetails.value.map(td => ({
      type: td.type,
      qty: td.qty,
      keywords: (td.kwEntries || []).filter(e => e.mode === 'keyword').map(e => e.value).filter(v => v.trim()),
      kwEntries: (td.kwEntries || []).filter(e => e.value.trim()).map(e => ({ ...e })),
    }))
    selectedDates.value.forEach(dateStr => {
      const idx = scheduleEntries.value.findIndex(e => e.date === dateStr)
      const entry: ScheduleEntry = {
        date: dateStr,
        quantity: dayQty,
        keywords: details.flatMap(d => d.keywords),
        order_types: details.map(d => d.type),
        typeDetails: details,
      }
      if (idx >= 0) scheduleEntries.value[idx] = entry
      else scheduleEntries.value.push(entry)
    })
    const remaining = total - newTotal
    if (datesCount > 1) {
      message.success(`已保存 ${datesCount} 天排期，每天 ${dayQty} 单`)
    } else if (remaining > 0) {
      message.success(`${selectedDates.value[0]} 排期已保存，剩余未排 ${remaining} 单`)
    } else {
      message.success(`排期已保存，全部任务已排期完毕！`)
    }
    selectedDates.value = []
    editingTypeDetails.value = []
  }

  if (newTotal > total) {
    Modal.confirm({
      title: '排期数量超出',
      content: `保存后总排期量将达 ${newTotal} 单，超出任务总量 ${newTotal - total} 单。是否继续？`,
      okText: '继续保存',
      cancelText: '取消',
      onOk: doSave,
    })
  } else {
    doSave()
  }
}

function removeScheduleEntries() {
  const toRemove = selectedDates.value.filter(d =>
    scheduleEntries.value.some(e => e.date === d)
  )
  if (toRemove.length === 0) {
    message.warning('所选日期没有排期数据')
    return
  }
  Modal.confirm({
    title: `删除排期确认`,
    content: `确定删除 ${toRemove.length} 天的排期数据？此操作不可恢复。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => {
      scheduleEntries.value = scheduleEntries.value.filter(e => !toRemove.includes(e.date))
      message.success(`已删除 ${toRemove.length} 天排期`)
      selectedDates.value = []
      editingTypeDetails.value = []
    },
  })
}


function toggleOrderType(val: string) {
  const idx = form.order_types.indexOf(val)
  if (idx === -1) {
    form.order_types.push(val)
  } else {
    form.order_types.splice(idx, 1)
  }
  recalc()
}

function generateOrderNumber(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `ORD${y}${m}${d}${h}${min}${s}${rand}`
}

const priceNoReview = ref(25)
const priceText = ref(88)
const priceImage = ref(100)
const priceVideo = ref(150)
const priceFeedback = ref(20)

const priceTableItems = computed(() => [
  { label: '免评佣金', type: '免评', modelRef: priceNoReview },
  { label: '文字评佣金', type: '文字评', modelRef: priceText },
  { label: '图片评佣金', type: '图片评', modelRef: priceImage },
  { label: '视频评佣金', type: '视频评', modelRef: priceVideo },
  { label: 'Feedback佣金', type: 'Feedback', modelRef: priceFeedback },
])

const priceMap = computed<Record<string, number>>(() => ({
  '免评': priceNoReview.value,
  '文字评': priceText.value,
  '图片评': priceImage.value,
  '视频评': priceVideo.value,
  'Feedback': priceFeedback.value,
}))

const defaultForm = () => ({
  asin: '',
  store_name: '',
  brand_name: '',
  product_image: '',
  product_name: '',
  product_price: 0,
  country: '美国',
  exchange_rate: 7.25,
  review_type: '普通测评' as const,
  review_mode: '免评模式' as const,
  order_type: '免评',
  order_types: [] as string[],
  order_quantity: 1,
  price_no_review: 25,
  price_text: 88,
  price_image: 100,
  price_video: 150,
  price_feedback: 20,
  commission_fee: 0,
  unit_price: 0,
  total_price: 0,
  total_orders: 0,
  total_amount: 0,
  fixed_daily_orders: 0,
  new_daily_orders: 0,
  notes: '',
  daily_feedback: false,
  comprehensive_label: false,
  delivery_label: false,
  seller: '',
  category: '',
  customer_name: '',
  customer_id_str: '',
  sales_person: '',
  status: '待处理',
  product_cost_cny: 0,
  company_id: '' as string,
  store_id: '' as string,
})

const form = reactive(defaultForm())

const rules = {
  asin: [{ required: true, message: '请输入ASIN' }],
  store_name: [{ required: true, message: '请输入店铺名称' }],
  order_quantity: [{ required: true, message: '请输入下单数量' }],
}

const productSubtotal = computed(() =>
  (form.product_price || 0) * form.exchange_rate * form.order_quantity
)

const commissionSubtotal = computed(() =>
  form.order_types.reduce((sum, t) => sum + (priceMap.value[t] || 0) * form.order_quantity, 0)
)

function recalc() {
  form.price_no_review = priceNoReview.value
  form.price_text = priceText.value
  form.price_image = priceImage.value
  form.price_video = priceVideo.value
  form.price_feedback = priceFeedback.value
  form.product_cost_cny = (form.product_price || 0) * form.exchange_rate
  const firstType = form.order_types[0] || '免评'
  form.commission_fee = priceMap.value[firstType] || 0
  form.unit_price = form.product_cost_cny + form.commission_fee
  form.total_amount = productSubtotal.value + commissionSubtotal.value
}

function addKeyword() {
  keywords.value.push('')
}
function removeKeyword(i: number) {
  keywords.value.splice(i, 1)
}

async function handleSubmit() {
  if (form.order_types.length === 0) {
    message.warning('请至少选择一种下单类型')
    return
  }
  if (scheduleEntries.value.length > 0 && scheduledTotal.value < form.order_quantity) {
    Modal.confirm({
      title: '排期数量不足',
      content: `任务总订单量为 ${form.order_quantity} 单，当前仅排期了 ${scheduledTotal.value} 单，还有 ${form.order_quantity - scheduledTotal.value} 单未排期。是否仍要提交？`,
      okText: '继续提交',
      cancelText: '返回补充',
      onOk: () => doSubmit(),
    })
    return
  }
  await doSubmit()
}

async function doSubmit() {
  submitting.value = true
  try {
    recalc()
    const orderNumber = currentOrderNumber.value
    const submitData = {
      ...form,
      order_number: orderNumber,
      total_orders: form.order_quantity,
      order_type: form.order_types[0] || '',
      order_types: form.order_types,
    }
    const { data, error } = await supabase.from('erp_orders').insert([submitData]).select().single()

    if (error) throw error

    if (data && keywords.value.filter(k => k.trim()).length > 0) {
      await supabase.from('order_keywords').insert(
        keywords.value.filter(k => k.trim()).map(kw => ({ order_id: data.id, keyword: kw.trim() }))
      )
    }

    if (data && scheduleEntries.value.length > 0) {
      await supabase.from('order_schedules').insert(
        scheduleEntries.value.map(e => {
          const allKwEntries = (e.typeDetails || []).flatMap(td => td.kwEntries || []).filter(en => en.value.trim())
          return {
            order_id: data.id,
            schedule_date: e.date,
            quantity: e.quantity,
            keywords: e.keywords,
            order_types: e.order_types,
            kw_entries: allKwEntries,
          }
        })
      )
    }

    await syncToClientLibrary()
    message.success(`任务 ${orderNumber} 创建成功！`)
    if (customerLocked.value) {
      const savedCustomer = {
        customer_name: form.customer_name,
        customer_id_str: form.customer_id_str,
        sales_person: form.sales_person,
        company_id: form.company_id,
        store_id: form.store_id,
      }
      Modal.confirm({
        title: '继续为同一客户创建任务？',
        content: `客户「${savedCustomer.customer_name || savedCustomer.customer_id_str}」还有其他ASIN需要创建任务吗？`,
        okText: '继续下一个ASIN',
        cancelText: '完成',
        onOk: () => {
          continueNextAsin(savedCustomer)
        },
        onCancel: () => {
          customerLocked.value = false
          resetForm()
          currentOrderNumber.value = generateOrderNumber()
        },
      })
    } else {
      resetForm()
      currentOrderNumber.value = generateOrderNumber()
    }
  } catch (e: any) {
    message.error('创建失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  customerLocked.value = false
  Object.assign(form, defaultForm())
  priceNoReview.value = 25
  priceText.value = 88
  priceImage.value = 100
  priceVideo.value = 150
  priceFeedback.value = 20
  keywords.value = ['']
  scheduleEntries.value = []
  selectedDates.value = []
  editingTypeDetails.value = []
  currentStoreAsins.value = []
  storeRecords.value = []
  allAsinRecords.value = []
  quickSchedule.startDate = null
  quickSchedule.days = 1
  quickSchedule.dailyQty = 1
  quickSchedule.order_types = []
  quickSchedule.keywords = []
  formRef.value?.resetFields()
}

function continueNextAsin(savedCustomer: {
  customer_name: string
  customer_id_str: string
  sales_person: string
  company_id: string
  store_id: string
}) {
  const savedStoreRecords = [...storeRecords.value]
  const savedAllAsinRecords = [...allAsinRecords.value]
  Object.assign(form, defaultForm())
  priceNoReview.value = 25
  priceText.value = 88
  priceImage.value = 100
  priceVideo.value = 150
  priceFeedback.value = 20
  keywords.value = ['']
  scheduleEntries.value = []
  selectedDates.value = []
  editingTypeDetails.value = []
  currentStoreAsins.value = []
  quickSchedule.startDate = null
  quickSchedule.days = 1
  quickSchedule.dailyQty = 1
  quickSchedule.order_types = []
  quickSchedule.keywords = []
  formRef.value?.resetFields()
  form.customer_name = savedCustomer.customer_name
  form.customer_id_str = savedCustomer.customer_id_str
  form.sales_person = savedCustomer.sales_person
  form.company_id = savedCustomer.company_id
  form.store_id = savedCustomer.store_id
  storeRecords.value = savedStoreRecords
  allAsinRecords.value = savedAllAsinRecords
  customerLocked.value = true
  currentOrderNumber.value = generateOrderNumber()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  currentOrderNumber.value = generateOrderNumber()
  recalc()
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}
.order-number-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 6px 14px;
}
.badge-label {
  font-size: 12px;
  color: #6b7280;
}
.badge-value {
  font-size: 14px;
  font-weight: 700;
  color: #2563eb;
  letter-spacing: 0.5px;
  font-family: 'Courier New', monospace;
}
.card-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border: 1px solid #f0f0f0;
  margin-bottom: 16px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

/* 下单类型多选 */
.order-type-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.order-type-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1.5px solid #e5e7eb;
  background: #f9fafb;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.15s;
  user-select: none;
}
.order-type-chip:hover {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #2563eb;
}
.order-type-chip.selected {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}
.chip-icon { font-size: 14px; }
.chip-label { font-weight: 600; }
.chip-check {
  font-size: 11px;
  color: #2563eb;
  margin-left: 2px;
}
.order-type-hint {
  font-size: 12px;
  color: #f59e0b;
  margin-top: 6px;
}

/* 价格表 */
.price-table {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}
.price-table-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  border: 1.5px solid transparent;
  transition: all 0.15s;
}
.price-table-row.price-active {
  border-color: #bfdbfe;
  background: #eff6ff;
}
.price-table-label {
  color: #64748b;
  white-space: nowrap;
}

.bill-summary {
  background: #f8fafc;
  border-radius: 10px;
  padding: 16px;
  margin-top: 12px;
  border: 1px solid #e2e8f0;
}
.bill-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 10px 0;
}
.bill-formula {
  background: #fff;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  border: 1px dashed #cbd5e1;
}
.formula-text {
  font-size: 12px;
  color: #64748b;
  font-family: 'Courier New', monospace;
}
.bill-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bill-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #374151;
}
.bill-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 4px 0;
}
.total-row {
  font-size: 14px;
  font-weight: 600;
}
.total-amount {
  font-size: 18px;
  color: #2563eb;
  font-weight: 700;
}

/* 快速排期 */
.quick-schedule-box {
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%);
  border: 1.5px solid #bfdbfe;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 16px;
}
.quick-schedule-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.quick-schedule-title {
  font-size: 13px;
  font-weight: 700;
  color: #1d4ed8;
  display: flex;
  align-items: center;
  gap: 5px;
}
.quick-schedule-title::before {
  content: '⚡';
  font-size: 14px;
}
.quick-schedule-desc {
  font-size: 12px;
  color: #64748b;
}
.quick-schedule-form {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
.qs-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.qs-field-wide {
  grid-column: 1 / -1;
}
.qs-label {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
}
.qs-preview {
  background: #fff;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 1px dashed #93c5fd;
}
.qs-preview-info {
  display: flex;
  gap: 14px;
  align-items: center;
  font-size: 13px;
  color: #374151;
  margin-bottom: 8px;
}
.qs-preview-info strong {
  color: #1d4ed8;
}
.qs-over {
  color: #dc2626;
  font-weight: 600;
}
.qs-ok {
  color: #16a34a;
  font-weight: 600;
}
.qs-preview-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.qs-date-chip {
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 5px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  font-family: monospace;
}
.qs-actions {
  display: flex;
  gap: 8px;
}
.schedule-section-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 14px 0;
  font-size: 12px;
  color: #9ca3af;
}
.schedule-section-divider::before,
.schedule-section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

/* 排期 */
.schedule-summary-bar {
  display: flex;
  align-items: center;
  gap: 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 20px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0 16px;
}
.summary-label {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}
.summary-val {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}
.summary-val.total { color: #374151; }
.summary-val.scheduled { color: #2563eb; }
.summary-val.scheduled.over { color: #dc2626; }
.summary-val.remaining { color: #f59e0b; }
.summary-val.done { color: #16a34a; }
.summary-val.over { color: #dc2626; }
.summary-divider {
  width: 1px;
  height: 36px;
  background: #e2e8f0;
  margin: 0 4px;
}
.summary-progress {
  flex: 1;
  min-width: 80px;
  height: 6px;
  background: #e2e8f0;
  border-radius: 99px;
  overflow: hidden;
  align-self: center;
  margin-left: 8px;
}
.summary-progress-bar {
  height: 100%;
  background: #2563eb;
  border-radius: 99px;
  transition: width 0.3s ease;
}
.summary-progress-bar.over {
  background: #dc2626;
}
.schedule-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.calendar-area {
  flex: 0 0 280px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.schedule-form-area {
  flex: 1;
  min-width: 0;
}
.cal-cell-wrap {
  min-height: 22px;
  border-radius: 4px;
  transition: background 0.15s;
}
.cal-cell-wrap.cal-selected {
  background: #dbeafe;
  border-radius: 4px;
}
.selected-date-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 10px 14px;
  flex-wrap: wrap;
  min-height: 38px;
}
.selected-dates-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
  align-items: center;
}
.selected-date-chip {
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  font-family: monospace;
  font-weight: 600;
  border: 1px solid #bfdbfe;
}
.selected-date-chip.has-schedule {
  background: #dcfce7;
  color: #15803d;
  border-color: #bbf7d0;
}
.selected-date-label {
  font-size: 12px;
  color: #64748b;
  flex-shrink: 0;
  padding-top: 2px;
}
.multi-day-tip {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: #1d4ed8;
  margin-bottom: 10px;
}
.type-select-label {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}
.type-detail-block {
  border-left: 3px solid #e5e7eb;
  padding: 10px 12px;
  margin-bottom: 10px;
  background: #f9fafb;
  border-radius: 0 8px 8px 0;
}
.type-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.type-detail-name {
  font-weight: 700;
  font-size: 13px;
}
.type-detail-qty-row {
  display: flex;
  align-items: center;
  gap: 5px;
}
.type-detail-qty-label {
  font-size: 12px;
  color: #6b7280;
}
.type-detail-qty-unit {
  font-size: 12px;
  color: #6b7280;
}
.type-detail-keywords {
  padding-top: 4px;
}
.kw-quick-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.kw-groups-section {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}
.kw-groups-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.kw-groups-title {
  font-size: 13px;
  font-weight: 600;
  color: #0369a1;
  white-space: nowrap;
}
.kw-groups-hint {
  font-size: 11px;
  color: #0284c7;
  opacity: 0.8;
}
.kw-groups-empty {
  color: #94a3b8;
  font-size: 12px;
  text-align: center;
  padding: 8px 0;
}
.kw-group-card {
  background: #fff;
  border: 1px solid #e0f2fe;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.kw-group-card:last-child {
  margin-bottom: 0;
}
.kw-group-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.kw-group-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.kw-group-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.kw-group-item-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.kw-mode-toggle {
  display: flex;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}
.kw-mode-btn {
  padding: 0 7px;
  font-size: 11px;
  line-height: 22px;
  cursor: pointer;
  color: #6b7280;
  background: #f9fafb;
  transition: background 0.15s, color 0.15s;
  user-select: none;
  white-space: nowrap;
}
.kw-mode-btn:first-child {
  border-right: 1px solid #d1d5db;
}
.kw-mode-btn.active {
  background: #2563eb;
  color: #fff;
}
.kw-mode-btn.active.kw-mode-link {
  background: #0891b2;
}
.kw-group-add-btns {
  display: flex;
  gap: 6px;
}
.no-date-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: #9ca3af;
  font-size: 13px;
  gap: 4px;
}
.type-total-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f0fdf4;
  border-radius: 6px;
  border: 1px solid #bbf7d0;
  margin-bottom: 12px;
  font-size: 13px;
  color: #374151;
}
.type-total-row strong {
  font-size: 15px;
  color: #15803d;
}
.type-total-sub {
  color: #6b7280;
  font-size: 12px;
}
.schedule-tag.is-selected {
  border-color: #3b82f6;
  background: #eff6ff;
  cursor: pointer;
}
.schedule-tag {
  cursor: pointer;
}
.selected-date-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e40af;
}
.schedule-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

/* 排期类型芯片 */
.schedule-type-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}
.sched-type-chip {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1.5px solid #e5e7eb;
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
  cursor: not-allowed;
  background: #f9fafb;
  transition: all 0.15s;
}
.sched-type-chip:not(.disabled) {
  cursor: pointer;
  color: #374151;
  border-color: #d1d5db;
}
.sched-type-chip:not(.disabled):hover {
  border-color: #2563eb;
  color: #2563eb;
  background: #eff6ff;
}
.sched-type-chip.selected {
  border-color: #2563eb !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
  font-weight: 700;
}
.sched-type-hint {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
}

/* 日历格子 */
.cal-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.cal-qty {
  font-size: 10px;
  color: #2563eb;
  font-weight: 600;
  line-height: 1;
}
.cal-types {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  justify-content: center;
}
.cal-type-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

/* 排期标签 */
.schedule-list {
  margin-top: 16px;
  border-top: 1px solid #f0f0f0;
  padding-top: 14px;
}
.schedule-list-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 10px 0;
}
.schedule-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.schedule-tag {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
}
.schedule-tag-date {
  font-weight: 600;
  color: #1d4ed8;
}
.schedule-tag-qty {
  color: #2563eb;
  background: #dbeafe;
  border-radius: 4px;
  padding: 1px 6px;
  font-weight: 600;
}
.schedule-tag-type {
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid transparent;
}
.schedule-tag-kw {
  color: #64748b;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.keyword-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}

/* 客户信息面板 */
.customer-panel {
  border: 1.5px solid #e5e7eb;
  transition: border-color 0.2s;
}
.customer-panel.customer-locked {
  border-color: #16a34a;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}
.customer-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.customer-panel-header .section-title {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}
.customer-lock-area {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: flex-end;
}
.customer-locked-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.locked-name {
  font-size: 14px;
  font-weight: 700;
  color: #15803d;
}
.locked-id, .locked-sales {
  font-size: 12px;
  color: #16a34a;
  background: #dcfce7;
  border-radius: 4px;
  padding: 1px 6px;
}
.lock-hint {
  font-size: 11px;
  color: #9ca3af;
}
.lock-btn {}
.unlock-btn {}
.customer-fields {
  padding-top: 4px;
}

/* 三级联动快速选择 */
.quick-select-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #eff6ff;
  border-radius: 8px;
  border: 1px solid #bfdbfe;
  margin-bottom: 4px;
}
.quick-select-label {
  font-size: 12px;
  font-weight: 600;
  color: #1d4ed8;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 5px;
}
.client-lib-hint {
  font-size: 12px;
  color: #6b7280;
  padding: 4px 0;
  line-height: 1.5;
}
.client-lib-hint--loaded {
  color: #374151;
}

/* ASIN 选中预览条 */
.asin-preview-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 8px;
  margin-bottom: 14px;
}
.asin-preview-img {
  width: 48px; height: 48px;
  border-radius: 6px; object-fit: cover;
  border: 1px solid #d1fae5; flex-shrink: 0;
}
.asin-preview-info { flex: 1; min-width: 0; }
.asin-preview-code {
  font-family: monospace; font-size: 14px; font-weight: 700; color: #1f2937;
}
.asin-preview-name {
  font-size: 12px; color: #374151;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.asin-preview-meta { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.asin-preview-brand {
  font-size: 11px; padding: 0 6px; background: #eff6ff;
  color: #1d4ed8; border-radius: 3px;
}
.asin-preview-store { font-size: 11px; color: #6b7280; display: flex; align-items: center; gap: 3px; }

/* 多ASIN提示 */
.multi-asin-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #15803d;
}
.multi-asin-icon { font-size: 15px; }
.multi-asin-sub {
  font-size: 11px;
  color: #4ade80;
  margin-left: auto;
}

/* 账单明细增强 */
.bill-section-label {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 4px 0 2px 0;
}
.bill-row-label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.bill-type-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.bill-row-commission {
  padding-left: 4px;
  font-size: 12px;
  color: #4b5563;
}
.bill-row-commission-sub {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 4px;
}
.commission-val { color: #d97706; font-weight: 600; }
.total-formula-hint {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 400;
  margin-left: 4px;
}

/* 右侧类型汇总卡 */
.order-type-summary-card {}
.no-type-hint {
  font-size: 13px;
  color: #9ca3af;
  padding: 8px 0;
}
.type-summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid #f3f4f6;
}
.type-summary-row:last-of-type { border-bottom: none; }
.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.type-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.type-price {
  font-size: 12px;
  color: #6b7280;
}
.type-summary-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
  font-size: 13px;
  color: #6b7280;
}
.type-total-qty {
  font-weight: 700;
  color: #2563eb;
}
</style>
