<template>
  <div class="page-content">
    <h1 class="page-title">分配管理</h1>

    <!-- 紧凑分配概览栏 -->
    <div class="aob" v-if="perfList.length">
      <div class="aob-header">
        <span class="aob-title">分配概览 <span class="aob-month">{{ currentMonthLabel }}</span></span>
        <a-button type="link" size="small" @click="perfExpanded = !perfExpanded">
          {{ perfExpanded ? '收起' : '展开详情' }}
        </a-button>
      </div>
      <div class="aob-pills-wrap">
        <div class="aob-pills">
          <div
            v-for="p in perfList"
            :key="p.staff_id"
            :class="['aob-pill', { 'pill-priority': p.is_priority, 'pill-done': p.today_remaining === 0 && p.daily_target > 0 }]"
            @click="quickSelectStaff(p.staff_id)"
          >
            <div class="pill-av" :style="{ background: p.avatar_color || '#2563eb' }">{{ p.name.charAt(0) }}</div>
            <span class="pill-name">{{ p.name }}</span>
            <span class="pill-nums">{{ p.today_done }}/{{ p.daily_target }}</span>
            <span :class="['pill-remain', { 'remain-urgent': p.today_remaining >= 5, 'remain-ok': p.today_remaining === 0 && p.daily_target > 0 }]">
              {{ p.today_remaining === 0 && p.daily_target > 0 ? '已满' : '剩' + p.today_remaining }}
            </span>
            <span class="pill-review-tag" title="测评单已分配">评{{ p.review_assigned }}</span>
            <span class="pill-free-tag" title="免评单已分配">免{{ p.free_assigned }}</span>
          </div>
        </div>
      </div>
      <div v-if="perfExpanded" class="aob-detail">
        <table class="aob-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>今日已分配</th>
              <th>今日目标</th>
              <th>今日剩余</th>
              <th>本月完成</th>
              <th>月度目标</th>
              <th>月完成率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in perfList" :key="p.staff_id" :class="{ 'row-priority': p.is_priority }">
              <td>
                <div class="aob-t-name">
                  <div class="pill-av-sm" :style="{ background: p.avatar_color || '#2563eb' }">{{ p.name.charAt(0) }}</div>
                  {{ p.name }}
                </div>
              </td>
              <td class="aob-t-center">
                <div class="aob-today-cell">
                  <span class="aob-today-total">{{ p.today_done }}</span>
                  <div class="aob-today-breakdown">
                    <span class="breakdown-item review">测评 {{ p.review_assigned }}</span>
                    <span class="breakdown-item free">免评 {{ p.free_assigned }}</span>
                    <span v-if="p.fb_assigned > 0" class="breakdown-item fb">FB {{ p.fb_assigned }}</span>
                  </div>
                </div>
              </td>
              <td class="aob-t-center">{{ p.daily_target }}</td>
              <td class="aob-t-center">
                <span :class="['remain-badge', { 'remain-badge-urgent': p.today_remaining >= 5, 'remain-badge-ok': p.today_remaining === 0 && p.daily_target > 0 }]">
                  {{ p.today_remaining }}
                </span>
              </td>
              <td class="aob-t-center">{{ p.month_done }}</td>
              <td class="aob-t-center">{{ p.monthly_target }}</td>
              <td class="aob-t-center">
                <div class="aob-t-progress">
                  <div class="aob-t-bar"><div class="aob-t-fill" :style="{ width: getProgressPct(p) + '%', background: getProgressColor(p) }"></div></div>
                  <span class="aob-t-pct" :style="{ color: getProgressColor(p) }">{{ getProgressPct(p) }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card-panel">
      <div class="toolbar">
        <div class="view-toggle">
          <span :class="['view-btn', viewMode === 'grouped' ? 'view-btn-active' : '']" @click="switchView('grouped')">
            <AppstoreOutlined /> 主订单视图
          </span>
          <span :class="['view-btn', viewMode === 'flat' ? 'view-btn-active' : '']" @click="switchView('flat')">
            <UnorderedListOutlined /> 子单平铺
          </span>
        </div>
        <a-input-search v-model:value="searchText" placeholder="搜索订单号/ASIN/店铺" style="width:220px" @search="load" allow-clear />
        <a-select v-model:value="filterStatus" style="width:110px" @change="load" allow-clear placeholder="子单状态">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option v-for="s in subStatuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterOrderType" style="width:105px" @change="load" allow-clear placeholder="测评类型">
          <a-select-option value="">全部类型</a-select-option>
          <a-select-option v-for="t in orderTypeOptions" :key="t" :value="t">{{ t }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterReviewLevel" style="width:95px" @change="load" allow-clear placeholder="等级">
          <a-select-option value="">全部等级</a-select-option>
          <a-select-option value="普通">普通</a-select-option>
          <a-select-option value="高等">高等</a-select-option>
          <a-select-option value="极高等">极高等</a-select-option>
        </a-select>
        <a-select v-model:value="filterCountry" style="width:90px" @change="load" allow-clear placeholder="国家">
          <a-select-option value="">全部</a-select-option>
          <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-button
          type="primary"
          :disabled="!selectedKeys.length"
          @click="openBatchAssign"
        >
          <UserAddOutlined /> 批量分配 ({{ selectedKeys.length }})
        </a-button>
        <a-button
          v-if="viewMode === 'flat' && selectedKeys.length > 0"
          @click="openBatchEdit"
        >
          批量修改 ({{ selectedKeys.length }})
        </a-button>
        <a-button @click="load"><ReloadOutlined /> 刷新</a-button>
        <span class="total-hint">共 {{ pagination.total }} 条子单</span>
      </div>

      <div v-if="loading" class="loading-wrap"><a-spin /></div>

      <!-- 主订单分组视图 -->
      <div v-else-if="viewMode === 'grouped'" class="task-list">
        <div v-for="group in groupedOrders" :key="group.order_id" class="task-card">
          <div class="task-main-row">
            <div class="task-expand-btn" @click="toggleExpand(group.order_id)">
              <RightOutlined :class="['expand-icon', { 'expanded': expandedKeys.includes(group.order_id) }]" />
            </div>

            <div class="task-info">
              <div class="task-top-row">
                <a class="order-num-link">{{ group.order_number }}</a>
                <a-tag :color="getOrderStatusColor(group.order_status)" class="status-tag">{{ group.order_status }}</a-tag>
                <a-tag color="default" class="info-tag">{{ group.country }}</a-tag>
                <a-tag v-if="group.order_type === '免评'" color="green" class="info-tag">免评</a-tag>
                <a-tag v-else-if="group.order_type === '文字评'" color="cyan" class="info-tag">文字评</a-tag>
                <a-tag v-else-if="group.order_type === '图片评'" color="blue" class="info-tag">图片评</a-tag>
                <a-tag v-else-if="group.order_type === '视频评'" color="geekblue" class="info-tag">视频评</a-tag>
                <a-tag v-else-if="group.order_type" color="default" class="info-tag">{{ group.order_type }}</a-tag>
                <a-tag v-if="group.review_level" color="default" class="info-tag">{{ group.review_level }}</a-tag>
                <a-tag v-if="group.review_type" color="default" class="info-tag">{{ group.review_type }}</a-tag>
              </div>
              <div class="task-detail-row">
                <span class="detail-item-text">产品：{{ group.product_name || group.asin }}</span>
                <span class="detail-sep">ASIN：<span class="mono-sm">{{ group.asin }}</span></span>
                <span class="detail-sep">店铺：{{ group.store_name }}</span>
                <span class="detail-sep">品牌：{{ group.brand_name || '—' }}</span>
              </div>
              <div class="task-detail-row">
                <span class="detail-item-text">类目：{{ group.category || '—' }}</span>
                <span class="detail-sep">单价：<span class="price-text">${{ Number(group.product_price || 0).toFixed(2) }}</span></span>
                <span class="detail-sep">客户：{{ group.customer_name || '—' }}</span>
                <span class="detail-sep">商务：{{ group.sales_person || '—' }}</span>
              </div>
            </div>

            <div class="task-stats">
              <div class="stat-item">
                <span class="stat-label">子单</span>
                <span class="stat-val stat-total">{{ group.subs.length }}</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-label">待分配</span>
                <span class="stat-val stat-pending">{{ group.subs.filter((s: any) => s.status === '待分配').length }}</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-label">已分配</span>
                <span class="stat-val stat-assigned">{{ group.subs.filter((s: any) => s.status !== '待分配').length }}</span>
              </div>
            </div>

            <div class="task-actions">
              <a-button
                type="primary"
                size="small"
                class="gen-btn"
                @click.stop="openGroupAssign(group)"
              >
                <UserAddOutlined /> 分配全组
              </a-button>
            </div>
          </div>

          <div v-if="expandedKeys.includes(group.order_id)" class="sub-orders-panel">
            <div class="sub-orders-header">
              <span class="sub-orders-title">子订单列表（{{ group.subs.length }} 单）</span>
              <a-checkbox
                :checked="isAllGroupSelected(group)"
                :indeterminate="isGroupIndeterminate(group)"
                @change="(e: any) => toggleGroupSelect(group, e.target.checked)"
              >全选本组</a-checkbox>
            </div>
            <a-table
              :columns="subColumns"
              :data-source="group.subs"
              :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectionChange, getCheckboxProps: () => ({}) }"
              :pagination="false"
              row-key="id"
              size="small"
              :scroll="{ x: 1400 }"
              style="margin-top:10px"
            >
              <template #bodyCell="{ column, record: sub }">
                <template v-if="column.key === 'sub_no'">
                  <span class="sub-no">{{ sub.sub_order_number }}</span>
                </template>
                <template v-if="column.key === 'sub_product'">
                  <div class="sub-product-cell">
                    <div v-if="sub.product_name" class="sub-product-name">{{ sub.product_name }}</div>
                    <div class="sub-asin mono-sm">{{ sub.asin || '—' }}</div>
                  </div>
                </template>
                <template v-if="column.key === 'sub_keyword'">
                  <div class="kw-cell" @click="openKwEdit(sub)">
                    <template v-if="sub.keyword_type === 'link'">
                      <a-tag color="cyan" size="small" style="cursor:pointer">
                        <LinkOutlined /> 链接
                      </a-tag>
                    </template>
                    <template v-else-if="sub.keyword">
                      <span class="keyword-tag" style="cursor:pointer">{{ sub.keyword }}</span>
                    </template>
                    <template v-else>
                      <span class="text-gray kw-empty" style="cursor:pointer">点击设置</span>
                    </template>
                    <EditOutlined class="kw-edit-icon" />
                  </div>
                </template>
                <template v-if="column.key === 'sub_variant'">
                  <span v-if="sub.variant_info" class="variant-text">{{ sub.variant_info }}</span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_scheduled'">
                  <span v-if="sub.scheduled_date" :class="isOverdue(sub.scheduled_date) ? 'date-overdue' : 'date-normal'">
                    {{ sub.scheduled_date }}
                  </span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_review_type'">
                  <a-tag v-if="sub.order_type" :color="getOrderTypeTagColor(sub.order_type)" size="small">{{ sub.order_type }}</a-tag>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_review_level'">
                  <a-tag v-if="sub.review_level" :color="getReviewLevelTagColor(sub.review_level)" size="small">{{ sub.review_level }}</a-tag>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_price'">
                  <span class="price-main">${{ Number(sub.product_price || 0).toFixed(2) }}</span>
                </template>
                <template v-if="column.key === 'sub_staff'">
                  <span v-if="sub.staff_name" class="staff-assigned">{{ sub.staff_name }}</span>
                  <span v-else class="text-gray">未分配</span>
                </template>
                <template v-if="column.key === 'sub_notes'">
                  <span v-if="sub.task_notes" class="notes-text">{{ sub.task_notes }}</span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_action'">
                  <a-button type="link" size="small" @click="openSingleAssign(sub)">分配</a-button>
                </template>
              </template>
            </a-table>
          </div>
        </div>

        <div v-if="groupedOrders.length === 0" class="empty-list">
          <a-empty description="暂无子单数据" />
        </div>
      </div>

      <!-- 子单平铺视图 -->
      <div v-else-if="viewMode === 'flat'">
        <!-- 操作提示条 -->
        <div class="flat-hint-bar">
          <span class="flat-hint-item"><span class="flat-hint-icon">✓</span> 勾选左侧复选框可多选，选中后工具栏出现"批量分配"和"批量修改"按钮</span>
          <span class="flat-hint-sep">|</span>
          <span class="flat-hint-item"><span class="flat-hint-icon">✎</span> 点击行末"编辑"按钮修改单条子单的关键词、类型、排期等</span>
          <span class="flat-hint-sep">|</span>
          <span class="flat-hint-item"><span class="flat-hint-icon">☰</span> 也可直接点击表格中的字段单元格行内编辑</span>
        </div>
        <!-- 快捷筛选胶囊行 -->
        <div class="qf-bar">
          <div class="qf-group qf-group-date">
            <span class="qf-label">排期</span>
            <span
              v-for="d in quickDateOptions"
              :key="d.value"
              :class="['qf-pill', { 'qf-pill-active': quickDate === d.value }]"
              @click="toggleQuickDate(d.value)"
            >{{ d.label }}</span>
            <span class="qf-date-sep">|</span>
            <span
              v-for="sd in specificDateOptions.slice(2, 10)"
              :key="sd.value"
              :class="['qf-pill', 'qf-pill-date', quickDateSpecific === sd.value ? 'qf-pill-active' : '']"
              @click="toggleSpecificDate(sd.value)"
            >{{ sd.shortLabel }}</span>
          </div>
          <div class="qf-divider"></div>
          <div class="qf-group">
            <span class="qf-label">类型</span>
            <span
              v-for="t in quickTypeOptions"
              :key="t.value"
              :class="['qf-pill', 'qf-pill-type', quickType === t.value ? 'qf-pill-active' : '']"
              @click="toggleQuickType(t.value)"
            >{{ t.label }}</span>
          </div>
          <div class="qf-divider"></div>
          <div class="qf-group">
            <span class="qf-label">等级</span>
            <span
              v-for="l in quickLevelOptions"
              :key="l.value"
              :class="['qf-pill', 'qf-pill-level', quickLevel === l.value ? 'qf-pill-active' : '']"
              @click="toggleQuickLevel(l.value)"
            >{{ l.label }}</span>
          </div>
          <div class="qf-divider"></div>
          <div class="qf-group">
            <span class="qf-label">国家</span>
            <span
              v-for="c in quickCountryOptions"
              :key="c"
              :class="['qf-pill', 'qf-pill-country', quickCountry === c ? 'qf-pill-active' : '']"
              @click="toggleQuickCountry(c)"
            >{{ c }}</span>
          </div>
          <div class="qf-divider"></div>
          <span v-if="hasQuickFilter" class="qf-clear" @click="clearQuickFilters">
            清除筛选
          </span>
          <div class="qf-select-all-wrap">
            <a-checkbox
              :checked="isAllPageSelected"
              :indeterminate="isPageIndeterminate"
              @change="(e: any) => toggleSelectAllPage(e.target.checked)"
            >全选本页 ({{ subOrders.length }})</a-checkbox>
          </div>
        </div>

        <a-table
          :columns="flatColumns"
          :data-source="subOrders"
          :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectionChange, getCheckboxProps: () => ({}) }"
          :pagination="false"
          row-key="id"
          size="small"
          :scroll="{ x: 1600 }"
        >
          <template #bodyCell="{ column, record: sub }">
            <template v-if="column.key === 'flat_order'">
              <span class="flat-order-num">{{ sub._order_number }}</span>
            </template>
            <template v-if="column.key === 'flat_sub_no'">
              <span class="sub-no">{{ sub.sub_order_number }}</span>
            </template>
            <template v-if="column.key === 'flat_product'">
              <div class="sub-product-cell">
                <div v-if="sub.product_name" class="sub-product-name">{{ sub.product_name }}</div>
                <div class="sub-asin mono-sm">{{ sub.asin || '—' }}</div>
              </div>
            </template>

            <!-- 关键词：行内可编辑 -->
            <template v-if="column.key === 'flat_keyword'">
              <div v-if="isEditing(sub.id, 'keyword')" class="ice-wrap" @click.stop>
                <a-input
                  :ref="(el: any) => setEditRef(el)"
                  v-model:value="editingValue"
                  size="small"
                  style="width:100%"
                  @blur="saveInlineEdit(sub, 'keyword')"
                  @keyup.enter="saveInlineEdit(sub, 'keyword')"
                  @keyup.esc="cancelEdit"
                />
              </div>
              <div v-else class="ice-cell" @click="startEdit(sub.id, 'keyword', sub.keyword || '')">
                <template v-if="sub.keyword_type === 'link'">
                  <a-tag color="cyan" size="small"><LinkOutlined /> 链接</a-tag>
                </template>
                <template v-else-if="sub.keyword">
                  <span class="keyword-tag">{{ sub.keyword }}</span>
                </template>
                <template v-else>
                  <span class="ice-placeholder">点击编辑</span>
                </template>
                <EditOutlined class="ice-icon" />
              </div>
            </template>

            <!-- 测评类型：行内 select -->
            <template v-if="column.key === 'flat_type'">
              <div v-if="isEditing(sub.id, 'order_type')" class="ice-wrap" @click.stop>
                <a-select
                  :ref="(el: any) => setEditRef(el)"
                  v-model:value="editingValue"
                  size="small"
                  style="width:90px"
                  @change="saveInlineEdit(sub, 'order_type')"
                  @blur="cancelEdit"
                >
                  <a-select-option v-for="t in orderTypeOptions" :key="t" :value="t">{{ t }}</a-select-option>
                </a-select>
              </div>
              <div v-else class="ice-cell" @click="startEdit(sub.id, 'order_type', sub.order_type || '')">
                <a-tag v-if="sub.order_type" :color="getOrderTypeTagColor(sub.order_type)" size="small">{{ sub.order_type }}</a-tag>
                <span v-else class="ice-placeholder">类型</span>
                <EditOutlined class="ice-icon" />
              </div>
              <span v-if="sub.country" class="flat-country">{{ sub.country }}</span>
            </template>

            <!-- 测评等级：行内 select -->
            <template v-if="column.key === 'flat_level'">
              <div v-if="isEditing(sub.id, 'review_level')" class="ice-wrap" @click.stop>
                <a-select
                  :ref="(el: any) => setEditRef(el)"
                  v-model:value="editingValue"
                  size="small"
                  style="width:80px"
                  @change="saveInlineEdit(sub, 'review_level')"
                  @blur="cancelEdit"
                >
                  <a-select-option value="普通">普通</a-select-option>
                  <a-select-option value="高等">高等</a-select-option>
                  <a-select-option value="极高等">极高等</a-select-option>
                </a-select>
              </div>
              <div v-else class="ice-cell" @click="startEdit(sub.id, 'review_level', sub.review_level || '')">
                <a-tag v-if="sub.review_level" :color="getReviewLevelTagColor(sub.review_level)" size="small">{{ sub.review_level }}</a-tag>
                <span v-else class="ice-placeholder">等级</span>
                <EditOutlined class="ice-icon" />
              </div>
            </template>

            <!-- 排期日期：行内 date input -->
            <template v-if="column.key === 'flat_scheduled'">
              <div v-if="isEditing(sub.id, 'scheduled_date')" class="ice-wrap" @click.stop>
                <input
                  :ref="(el: any) => setEditRef(el)"
                  type="date"
                  v-model="editingValue"
                  class="ice-date-input"
                  @blur="saveInlineEdit(sub, 'scheduled_date')"
                  @keyup.enter="saveInlineEdit(sub, 'scheduled_date')"
                  @keyup.esc="cancelEdit"
                />
              </div>
              <div v-else class="ice-cell" @click="startEdit(sub.id, 'scheduled_date', sub.scheduled_date || '')">
                <span v-if="sub.scheduled_date" :class="isOverdue(sub.scheduled_date) ? 'date-overdue' : 'date-normal'">
                  {{ sub.scheduled_date }}
                </span>
                <span v-else class="ice-placeholder">设置排期</span>
                <EditOutlined class="ice-icon" />
              </div>
            </template>

            <template v-if="column.key === 'flat_price'">
              <span class="price-main">${{ Number(sub.product_price || 0).toFixed(2) }}</span>
            </template>
            <template v-if="column.key === 'flat_staff'">
              <span v-if="sub.staff_name" class="staff-assigned">{{ sub.staff_name }}</span>
              <span v-else class="text-gray">未分配</span>
            </template>

            <!-- 备注：行内编辑 -->
            <template v-if="column.key === 'flat_notes'">
              <div v-if="isEditing(sub.id, 'task_notes')" class="ice-wrap" @click.stop>
                <a-input
                  :ref="(el: any) => setEditRef(el)"
                  v-model:value="editingValue"
                  size="small"
                  style="width:100%"
                  @blur="saveInlineEdit(sub, 'task_notes')"
                  @keyup.enter="saveInlineEdit(sub, 'task_notes')"
                  @keyup.esc="cancelEdit"
                />
              </div>
              <div v-else class="ice-cell" @click="startEdit(sub.id, 'task_notes', sub.task_notes || '')">
                <span v-if="sub.task_notes" class="notes-text">{{ sub.task_notes }}</span>
                <span v-else class="ice-placeholder">点击添加备注</span>
                <EditOutlined class="ice-icon" />
              </div>
            </template>

            <template v-if="column.key === 'flat_action'">
              <div class="flat-action-btns">
                <a-button type="link" size="small" @click="openSingleAssign(sub)">分配</a-button>
                <a-button type="link" size="small" style="color:#059669" @click="openRowEdit(sub)">编辑</a-button>
              </div>
            </template>
          </template>
        </a-table>
        <div v-if="subOrders.length === 0" class="empty-list">
          <a-empty description="暂无子单数据" />
        </div>
      </div>

      <div class="pagination-wrap">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          show-size-changer
          :page-size-options="['20','50','100']"
          @change="onPageChange"
          @show-size-change="onPageChange"
        />
      </div>
    </div>

    <!-- 批量分配弹窗 -->
    <a-modal
      v-model:open="batchAssignOpen"
      title="批量分配业务员"
      @ok="handleBatchAssign"
      :confirm-loading="assigning"
      ok-text="确认分配"
      width="560px"
    >
      <div class="ba-simple-wrap">
        <div class="ba-simple-count">
          已选择 <strong>{{ selectedKeys.length }}</strong> 条子单
          <span v-if="baManualTotal !== selectedKeys.length" style="color:#d97706;font-size:12px;margin-left:6px">（手动调整后实际分配：{{ baManualTotal }} 条）</span>
        </div>
        <div class="ba-simple-field">
          <div class="ba-simple-label">选择业务员（可多选，均分分配）</div>
          <a-select
            v-model:value="selectedStaffIds"
            mode="multiple"
            placeholder="请选择一名或多名业务员"
            style="width:100%"
            show-search
            option-filter-prop="label"
            :max-tag-count="5"
            @change="resetManualCounts"
          >
            <a-select-option v-for="s in staffListWithPerf" :key="s.id" :value="s.id" :label="s.name">
              <div style="display:flex;align-items:center;gap:6px">
                <div :style="{ width:'8px', height:'8px', borderRadius:'50%', background: getStaffColor(s.id), flexShrink: 0 }"></div>
                {{ s.name }}
                <span v-if="s.today_remaining !== undefined" style="color:#9ca3af;font-size:11px;margin-left:auto">(剩 {{ s.today_remaining }})</span>
              </div>
            </a-select-option>
          </a-select>
        </div>
        <div v-if="selectedStaffIds.length > 0 && selectedKeys.length > 0" class="ba-detail-preview">
          <div class="ba-dp-header">
            <span class="ba-dp-title">分配预览</span>
            <span class="ba-dp-hint">可手动调整本次分配数量</span>
          </div>
          <div class="ba-dp-table">
            <div class="ba-dp-thead">
              <span class="ba-dp-col-name">业务员</span>
              <span class="ba-dp-col-stat">今日已有</span>
              <span class="ba-dp-col-add">本次新增</span>
              <span class="ba-dp-col-total">分配后总量</span>
            </div>
            <div v-for="item in baBatchPreviewList" :key="item.staffId" class="ba-dp-row">
              <div class="ba-dp-col-name">
                <div class="ba-dp-av" :style="{ background: getStaffColor(item.staffId) }">{{ item.staffName.charAt(0) }}</div>
                <span class="ba-dp-name">{{ item.staffName }}</span>
              </div>
              <div class="ba-dp-col-stat">
                <span class="ba-dp-existing">{{ item.todayExisting }} 单</span>
              </div>
              <div class="ba-dp-col-add">
                <div class="ba-dp-counter">
                  <button class="ba-cnt-btn" @click="adjustManualCount(item.staffId, -1)" :disabled="(baManualCounts[item.staffId] || 0) <= 0">-</button>
                  <span class="ba-cnt-num">+{{ baManualCounts[item.staffId] ?? item.count }}</span>
                  <button class="ba-cnt-btn" @click="adjustManualCount(item.staffId, 1)">+</button>
                </div>
              </div>
              <div class="ba-dp-col-total">
                <span class="ba-dp-total-num">{{ item.todayExisting + (baManualCounts[item.staffId] ?? item.count) }} 单</span>
              </div>
            </div>
          </div>
          <div class="ba-dp-sum">
            合计本次分配 <strong>{{ baManualTotal }}</strong> 条
            <span v-if="baManualTotal < selectedKeys.length" style="color:#d97706;margin-left:8px">（{{ selectedKeys.length - baManualTotal }} 条将被跳过）</span>
            <span v-if="baManualTotal > selectedKeys.length" style="color:#dc2626;margin-left:8px">（超出 {{ baManualTotal - selectedKeys.length }} 条，将只分配前 {{ selectedKeys.length }} 条）</span>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 批量修改弹窗 -->
    <a-modal
      v-model:open="batchEditOpen"
      title="批量修改子单字段"
      @ok="handleBatchEdit"
      :confirm-loading="batchEditSaving"
      ok-text="确认修改"
      width="560px"
    >
      <div class="bme-wrap">
        <div class="bme-count-bar">
          已选 <strong>{{ selectedKeys.length }}</strong> 条子单，选择要修改的字段后统一设置新值
        </div>
        <div class="bme-fields">
          <div v-for="f in batchEditFields" :key="f.key" class="bme-field-row">
            <a-checkbox v-model:checked="f.enabled" class="bme-chk">{{ f.label }}</a-checkbox>
            <div class="bme-field-input" :class="{ 'bme-disabled': !f.enabled }">
              <a-input
                v-if="f.type === 'text'"
                v-model:value="f.value"
                :disabled="!f.enabled"
                :placeholder="`输入新的${f.label}`"
                size="small"
                style="width:200px"
              />
              <a-select
                v-else-if="f.type === 'select'"
                v-model:value="f.value"
                :disabled="!f.enabled"
                :placeholder="`选择${f.label}`"
                size="small"
                style="width:140px"
                allow-clear
              >
                <a-select-option v-for="opt in f.options" :key="opt" :value="opt">{{ opt }}</a-select-option>
              </a-select>
              <input
                v-else-if="f.type === 'date'"
                type="date"
                v-model="f.value"
                :disabled="!f.enabled"
                class="bme-date-input"
              />
            </div>
            <span v-if="f.enabled && !f.value && f.type !== 'date'" class="bme-hint">留空则清除该字段</span>
          </div>
        </div>
        <div class="bme-preview">
          <span class="bme-preview-label">将修改：</span>
          <template v-if="batchEditActiveFields.length">
            <a-tag v-for="f in batchEditActiveFields" :key="f.key" color="blue" size="small">
              {{ f.label }} → {{ f.value || '（清空）' }}
            </a-tag>
          </template>
          <span v-else style="color:#9ca3af;font-size:12px">请先勾选要修改的字段</span>
        </div>
      </div>
    </a-modal>

    <!-- 单行编辑弹窗 -->
    <a-modal
      v-model:open="rowEditOpen"
      :title="`编辑子单 - ${rowEditRecord?.sub_order_number}`"
      @ok="saveRowEdit"
      :confirm-loading="rowEditSaving"
      ok-text="保存"
      cancel-text="取消"
      width="500px"
    >
      <div v-if="rowEditRecord" class="re-wrap">
        <div class="re-row">
          <label class="re-label">关键词</label>
          <a-input v-model:value="rowEditData.keyword" placeholder="输入搜索关键词" />
        </div>
        <div class="re-row">
          <label class="re-label">测评类型</label>
          <a-select v-model:value="rowEditData.order_type" style="width:100%" allow-clear placeholder="选择类型">
            <a-select-option v-for="t in orderTypeOptions" :key="t" :value="t">{{ t }}</a-select-option>
          </a-select>
        </div>
        <div class="re-row">
          <label class="re-label">测评等级</label>
          <a-select v-model:value="rowEditData.review_level" style="width:100%" allow-clear placeholder="选择等级">
            <a-select-option value="普通">普通</a-select-option>
            <a-select-option value="高等">高等</a-select-option>
            <a-select-option value="极高等">极高等</a-select-option>
          </a-select>
        </div>
        <div class="re-row">
          <label class="re-label">国家</label>
          <a-select v-model:value="rowEditData.country" style="width:100%" allow-clear placeholder="选择国家">
            <a-select-option v-for="c in quickCountryOptions" :key="c" :value="c">{{ c }}</a-select-option>
          </a-select>
        </div>
        <div class="re-row">
          <label class="re-label">排期日期</label>
          <input type="date" v-model="rowEditData.scheduled_date" class="re-date-input" />
        </div>
        <div class="re-row">
          <label class="re-label">备注</label>
          <a-input v-model:value="rowEditData.task_notes" placeholder="输入备注" />
        </div>
      </div>
    </a-modal>

    <!-- 单条分配弹窗 -->
    <a-modal
      v-model:open="singleAssignOpen"
      :title="`分配子单 - ${currentRecord?.sub_order_number}`"
      @ok="handleSingleAssign"
      :confirm-loading="assigning"
      ok-text="确认分配"
      width="480px"
    >
      <div class="assign-modal-body">
        <div v-if="currentRecord" class="assign-sub-info">
          <span class="assign-info-item">
            <template v-if="currentRecord.keyword_type === 'link'">
              操作链接：<a-tag color="cyan" size="small"><LinkOutlined /> 已设置链接</a-tag>
            </template>
            <template v-else>
              关键词：<strong>{{ currentRecord.keyword || '—' }}</strong>
            </template>
          </span>
          <span class="assign-info-item">排期：<strong>{{ currentRecord.scheduled_date || '—' }}</strong></span>
          <span class="assign-info-item">当前业务员：<strong>{{ currentRecord.staff_name || '未分配' }}</strong></span>
        </div>
        <a-form layout="vertical">
          <a-form-item label="选择业务员">
            <a-select v-model:value="selectedStaffId" placeholder="请选择业务员（按剩余量排序）" style="width:100%" show-search option-filter-prop="label" allow-clear>
              <a-select-option v-for="s in staffListWithPerf" :key="s.id" :value="s.id" :label="s.name">{{ s.name }}<span v-if="s.today_remaining !== undefined" style="color:#9ca3af;font-size:11px;margin-left:6px">(剩{{ s.today_remaining }})</span></a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <!-- 分配全组弹窗 -->
    <a-modal
      v-model:open="groupAssignOpen"
      :title="`分配全组 - ${currentGroup?.order_number}`"
      @ok="handleGroupAssign"
      :confirm-loading="assigning"
      ok-text="确认分配"
      width="480px"
    >
      <div class="assign-modal-body">
        <div v-if="currentGroup" class="assign-count-tip">
          将分配该订单下 <strong>{{ currentGroup.subs.filter((s: any) => s.status === '待分配').length }}</strong> 条待分配子单
        </div>
        <a-form layout="vertical">
          <a-form-item label="选择业务员">
            <a-select v-model:value="selectedStaffId" placeholder="请选择业务员（按剩余量排序）" style="width:100%" show-search option-filter-prop="label" allow-clear>
              <a-select-option v-for="s in staffListWithPerf" :key="s.id" :value="s.id" :label="s.name">{{ s.name }}<span v-if="s.today_remaining !== undefined" style="color:#9ca3af;font-size:11px;margin-left:6px">(剩{{ s.today_remaining }})</span></a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <!-- 标记问题单弹窗 -->
    <a-modal
      v-model:open="issueModalOpen"
      title="标记为售后问题单"
      @ok="handleMarkIssue"
      :confirm-loading="markingIssue"
      ok-text="确认创建"
      cancel-text="取消"
      width="520px"
    >
      <div v-if="issueSubOrder" class="issue-modal-body">
        <div class="issue-sub-info">
          <div class="issue-sub-row"><span class="issue-sub-label">子订单号</span><span class="issue-sub-val mono">{{ issueSubOrder.sub_order_number }}</span></div>
          <div class="issue-sub-row"><span class="issue-sub-label">ASIN</span><span class="issue-sub-val">{{ issueSubOrder.asin }}</span></div>
          <div class="issue-sub-row"><span class="issue-sub-label">店铺</span><span class="issue-sub-val">{{ issueSubOrder.store_name }}</span></div>
          <div class="issue-sub-row"><span class="issue-sub-label">产品价格</span><span class="issue-sub-val issue-price">${{ Number(issueSubOrder.product_price || 0).toFixed(2) }}</span></div>
          <div class="issue-sub-row"><span class="issue-sub-label">买手</span><span class="issue-sub-val">{{ issueSubOrder.buyer_name || '未分配' }}</span></div>
          <div class="issue-sub-row"><span class="issue-sub-label">亚马逊订单号</span><span class="issue-sub-val mono">{{ issueSubOrder.amazon_order_id || '--' }}</span></div>
        </div>
        <a-form layout="vertical" style="margin-top:16px">
          <a-form-item label="问题类型">
            <a-radio-group v-model:value="issueType" button-style="solid">
              <a-radio-button value="不下单">不下单</a-radio-button>
              <a-radio-button value="取消">取消</a-radio-button>
              <a-radio-button value="退款">退款</a-radio-button>
              <a-radio-button value="无此订单">无此订单</a-radio-button>
            </a-radio-group>
          </a-form-item>
          <a-form-item label="问题描述（可选）">
            <a-textarea v-model:value="issueDescription" :rows="2" placeholder="简要描述问题..." />
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <!-- 关键词/链接编辑弹窗 -->
    <a-modal
      v-model:open="kwEditOpen"
      title="修改关键词 / 链接"
      @ok="saveKwEdit"
      :confirm-loading="kwEditSaving"
      ok-text="保存"
      cancel-text="取消"
      width="460px"
    >
      <div class="kw-edit-modal-body">
        <div class="kw-edit-sub-no" v-if="kwEditRecord">子单号：{{ kwEditRecord.sub_order_number }}</div>
        <div class="kw-edit-mode-row">
          <span class="kw-edit-label">类型：</span>
          <div class="kw-mode-toggle">
            <span :class="['kw-mode-btn', kwEditMode === 'keyword' ? 'active' : '']" @click="kwEditMode = 'keyword'">关键词搜索</span>
            <span :class="['kw-mode-btn', kwEditMode === 'link' ? 'active kw-mode-link' : '']" @click="kwEditMode = 'link'">操作链接</span>
          </div>
        </div>
        <div class="kw-edit-input-row">
          <span class="kw-edit-label">{{ kwEditMode === 'keyword' ? '关键词：' : '链接：' }}</span>
          <a-input
            v-model:value="kwEditValue"
            :placeholder="kwEditMode === 'keyword' ? '输入搜索关键词' : '粘贴操作链接 (https://...)'"
            allow-clear
            style="flex:1"
          />
        </div>
        <div v-if="kwEditMode === 'link' && kwEditValue" class="kw-link-preview">
          <a :href="kwEditValue" target="_blank" rel="noopener noreferrer">预览链接</a>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { UserAddOutlined, ReloadOutlined, RightOutlined, EditOutlined, LinkOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons-vue'

import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const subOrders = ref<any[]>([])
const staffList = ref<any[]>([])
const viewMode = ref<'grouped' | 'flat'>('flat')

function switchView(mode: 'grouped' | 'flat') {
  viewMode.value = mode
  selectedKeys.value = []
}

const perfList = ref<any[]>([])
const perfExpanded = ref(false)
const currentMonthLabel = dayjs().format('YYYY年MM月')

function getProgressPct(p: any): number {
  if (!p.monthly_target) return 0
  return Math.min(100, Math.round((p.month_done / p.monthly_target) * 100))
}

function getProgressColor(p: any): string {
  const pct = getProgressPct(p)
  if (pct >= 100) return '#059669'
  if (pct >= 60) return '#2563eb'
  if (pct >= 30) return '#d97706'
  return '#dc2626'
}

function quickSelectStaff(staffId: string) {
  selectedStaffId.value = staffId
  const s = staffList.value.find(x => x.id === staffId)
  message.info(`已选中：${s?.name || ''}`)
}

async function loadPerfPanel() {
  const thisMonth = dayjs().format('YYYY-MM')
  const todayStart = dayjs().startOf('day').toISOString()
  const todayEnd = dayjs().endOf('day').toISOString()
  const monthStart = dayjs().startOf('month').toISOString()
  const monthEnd = dayjs().endOf('month').toISOString()

  const { data: staffData } = await supabase
    .from('staff')
    .select('id, name, role, avatar_color')
    .eq('status', '在职')

  if (!staffData?.length) return

  const staffIds = staffData.map(s => s.id)

  const [{ data: targets }, { data: todaySubs }, { data: monthSubs }, { data: pendingSubs }, { data: assignedSubs }] = await Promise.all([
    supabase.from('staff_monthly_targets').select('staff_id, monthly_target').in('staff_id', staffIds).eq('year_month', thisMonth),
    supabase.from('sub_orders').select('staff_id').in('staff_id', staffIds).neq('status', '待分配').gte('updated_at', todayStart).lte('updated_at', todayEnd),
    supabase.from('sub_orders').select('staff_id').in('staff_id', staffIds).in('status', ['已完成', '已留评']).gte('updated_at', monthStart).lte('updated_at', monthEnd),
    supabase.from('sub_orders').select('staff_id').in('staff_id', staffIds).in('status', ['已分配', '进行中', '已下单']),
    supabase.from('sub_orders').select('staff_id, order_type').in('staff_id', staffIds).neq('status', '待分配'),
  ])

  const targetMap: Record<string, number> = {}
  for (const t of targets || []) targetMap[t.staff_id] = t.monthly_target

  const todayMap: Record<string, number> = {}
  for (const s of todaySubs || []) todayMap[s.staff_id] = (todayMap[s.staff_id] || 0) + 1

  const monthMap: Record<string, number> = {}
  for (const s of monthSubs || []) monthMap[s.staff_id] = (monthMap[s.staff_id] || 0) + 1

  const pendingMap: Record<string, number> = {}
  for (const s of pendingSubs || []) pendingMap[s.staff_id] = (pendingMap[s.staff_id] || 0) + 1

  const reviewMap: Record<string, number> = {}
  const freeMap: Record<string, number> = {}
  const fbMap: Record<string, number> = {}
  for (const s of assignedSubs || []) {
    if (s.order_type === '免评') {
      freeMap[s.staff_id] = (freeMap[s.staff_id] || 0) + 1
    } else if (s.order_type === 'FB' || s.order_type === 'Feedback') {
      fbMap[s.staff_id] = (fbMap[s.staff_id] || 0) + 1
    } else {
      reviewMap[s.staff_id] = (reviewMap[s.staff_id] || 0) + 1
    }
  }

  const daysInMonth = dayjs().daysInMonth()

  const list = staffData.map(s => {
    const monthly = targetMap[s.id] || 0
    const daily = monthly ? Math.ceil(monthly / daysInMonth) : 0
    const todayDone = todayMap[s.id] || 0
    return {
      staff_id: s.id,
      name: s.name,
      role: s.role,
      avatar_color: s.avatar_color,
      monthly_target: monthly,
      daily_target: daily,
      today_done: todayDone,
      today_remaining: Math.max(0, daily - todayDone),
      month_done: monthMap[s.id] || 0,
      pending: pendingMap[s.id] || 0,
      review_assigned: reviewMap[s.id] || 0,
      free_assigned: freeMap[s.id] || 0,
      fb_assigned: fbMap[s.id] || 0,
      is_priority: false,
    }
  }).filter(p => p.monthly_target > 0 || p.pending > 0 || p.month_done > 0)
    .sort((a, b) => b.today_remaining - a.today_remaining)

  if (list.length) {
    const maxRemain = list[0].today_remaining
    if (maxRemain > 0) {
      list.forEach(p => { p.is_priority = p.today_remaining === maxRemain })
    }
  }

  perfList.value = list
}
const searchText = ref('')
const filterStatus = ref('待分配')
const filterCountry = ref('')
const filterOrderType = ref('')
const filterReviewLevel = ref('')

const orderTypeOptions = ['文字评', '图片评', '视频评', '免评', 'FB', 'Feedback']

const quickDate = ref('')
const quickType = ref('')
const quickLevel = ref('')
const quickCountry = ref('')

const today = dayjs().format('YYYY-MM-DD')
const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')

const quickDateSpecific = ref('')

function buildSpecificDateOptions() {
  const opts = []
  for (let i = 0; i < 14; i++) {
    const d = dayjs().add(i, 'day')
    opts.push({
      label: i === 0 ? `今日 ${d.format('M.D')}` : i === 1 ? `明日 ${d.format('M.D')}` : d.format('M.D'),
      value: d.format('YYYY-MM-DD'),
      shortLabel: i === 0 ? '今' : i === 1 ? '明' : d.format('M.D'),
    })
  }
  return opts
}

const specificDateOptions = buildSpecificDateOptions()

const quickDateOptions = [
  { label: '今日', value: today },
  { label: '明日', value: tomorrow },
  { label: '本周', value: 'this_week' },
  { label: '逾期', value: 'overdue' },
  { label: '无排期', value: 'none' },
]

const quickTypeOptions = [
  { label: '文字评', value: '文字评' },
  { label: '图片评', value: '图片评' },
  { label: '视频评', value: '视频评' },
  { label: '免评', value: '免评' },
]

const quickLevelOptions = [
  { label: '普通', value: '普通' },
  { label: '高等', value: '高等' },
  { label: '极高等', value: '极高等' },
]

const quickCountryOptions = ['美国', '德国', '英国', '加拿大', '日本', '法国']

const hasQuickFilter = computed(() => !!(quickDate.value || quickDateSpecific.value || quickType.value || quickLevel.value || quickCountry.value))

function toggleQuickDate(v: string) {
  quickDate.value = quickDate.value === v ? '' : v
  if (quickDate.value) quickDateSpecific.value = ''
  applyQuickFilters()
}

function toggleSpecificDate(v: string) {
  quickDateSpecific.value = quickDateSpecific.value === v ? '' : v
  if (quickDateSpecific.value) quickDate.value = ''
  applyQuickFilters()
}
function toggleQuickType(v: string) {
  quickType.value = quickType.value === v ? '' : v
  applyQuickFilters()
}
function toggleQuickLevel(v: string) {
  quickLevel.value = quickLevel.value === v ? '' : v
  applyQuickFilters()
}
function toggleQuickCountry(v: string) {
  quickCountry.value = quickCountry.value === v ? '' : v
  applyQuickFilters()
}

function clearQuickFilters() {
  quickDate.value = ''
  quickDateSpecific.value = ''
  quickType.value = ''
  quickLevel.value = ''
  quickCountry.value = ''
  filterOrderType.value = ''
  filterReviewLevel.value = ''
  filterCountry.value = ''
  pagination.value.current = 1
  load()
}

function applyQuickFilters() {
  filterOrderType.value = quickType.value
  filterReviewLevel.value = quickLevel.value
  filterCountry.value = quickCountry.value
  pagination.value.current = 1
  load()
}

const isAllPageSelected = computed(() =>
  subOrders.value.length > 0 && subOrders.value.every((s: any) => selectedKeys.value.includes(s.id))
)

const isPageIndeterminate = computed(() => {
  const some = subOrders.value.some((s: any) => selectedKeys.value.includes(s.id))
  return some && !isAllPageSelected.value
})

function toggleSelectAllPage(checked: boolean) {
  const ids = subOrders.value.map((s: any) => s.id)
  if (checked) {
    const set = new Set([...selectedKeys.value, ...ids])
    selectedKeys.value = Array.from(set)
  } else {
    selectedKeys.value = selectedKeys.value.filter((k: string) => !ids.includes(k))
  }
}

const selectedKeys = ref<string[]>([])
const batchAssignOpen = ref(false)
const singleAssignOpen = ref(false)
const groupAssignOpen = ref(false)
const selectedStaffIds = ref<string[]>([])
const selectedStaffId = ref<string>('')
const currentRecord = ref<any>(null)
const currentGroup = ref<any>(null)
const assigning = ref(false)
const expandedKeys = ref<string[]>([])
const pagination = ref({ current: 1, pageSize: 50, total: 0 })

const avatarColors = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#c2410c', '#4338ca']
function getStaffColor(staffId: string): string {
  const idx = staffList.value.findIndex(s => s.id === staffId)
  return avatarColors[idx % avatarColors.length] || '#2563eb'
}

const baSubs = ref<any[]>([])
const baAssignMap = ref<Record<string, string>>({})
const baCheckedIds = ref<Set<string>>(new Set())
const baFilterType = ref('')
const baFilterLevel = ref('')
const baFilterCountry = ref('')
const baBulkStaffId = ref('')

const baOrderTypes = computed(() => {
  const types = new Set(baSubs.value.map((s: any) => s.order_type).filter(Boolean))
  return Array.from(types)
})

const baFilteredSubs = computed(() => {
  return baSubs.value.filter((s: any) => {
    if (baFilterType.value && s.order_type !== baFilterType.value) return false
    if (baFilterLevel.value && s.review_level !== baFilterLevel.value) return false
    if (baFilterCountry.value && s.country !== baFilterCountry.value) return false
    return true
  })
})

const isBaFilterAllChecked = computed(() =>
  baFilteredSubs.value.length > 0 && baFilteredSubs.value.every((s: any) => baCheckedIds.value.has(s.id))
)

const isBaFilterIndeterminate = computed(() => {
  const some = baFilteredSubs.value.some((s: any) => baCheckedIds.value.has(s.id))
  return some && !isBaFilterAllChecked.value
})

const baAssignedCount = computed(() => Object.values(baAssignMap.value).filter(Boolean).length)
const baUnassignedCount = computed(() => baSubs.value.length - baAssignedCount.value)

const baSummaryList = computed(() => {
  const map: Record<string, number> = {}
  for (const [, staffId] of Object.entries(baAssignMap.value)) {
    if (staffId) map[staffId] = (map[staffId] || 0) + 1
  }
  return Object.entries(map).map(([staffId, count]) => ({
    staffId,
    staffName: staffList.value.find(s => s.id === staffId)?.name || staffId,
    count,
  })).sort((a, b) => b.count - a.count)
})

function toggleBaCheck(id: string) {
  const next = new Set(baCheckedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  baCheckedIds.value = next
}

function toggleBaFilterAll(checked: boolean) {
  const next = new Set(baCheckedIds.value)
  for (const s of baFilteredSubs.value) {
    if (checked) next.add(s.id)
    else next.delete(s.id)
  }
  baCheckedIds.value = next
}

function applyBulkStaff() {
  if (!baBulkStaffId.value || baCheckedIds.value.size === 0) return
  const next = { ...baAssignMap.value }
  for (const id of baCheckedIds.value) {
    next[id] = baBulkStaffId.value
  }
  baAssignMap.value = next
  baCheckedIds.value = new Set()
  baBulkStaffId.value = ''
}

function setBaSubStaff(subId: string, staffId: string) {
  baAssignMap.value = { ...baAssignMap.value, [subId]: staffId }
}

const baManualCounts = ref<Record<string, number>>({})

const baBatchPreviewList = computed(() => {
  if (!selectedStaffIds.value.length || !selectedKeys.value.length) return []
  const autoCount = Math.floor(selectedKeys.value.length / selectedStaffIds.value.length)
  const remainder = selectedKeys.value.length % selectedStaffIds.value.length
  return selectedStaffIds.value.map((id, idx) => {
    const perf = perfList.value.find(p => p.staff_id === id)
    return {
      staffId: id,
      staffName: staffList.value.find(s => s.id === id)?.name || id,
      count: autoCount + (idx < remainder ? 1 : 0),
      todayExisting: perf?.today_done || 0,
    }
  })
})

const baManualTotal = computed(() => {
  if (!baBatchPreviewList.value.length) return 0
  return baBatchPreviewList.value.reduce((sum, item) => {
    return sum + (baManualCounts.value[item.staffId] ?? item.count)
  }, 0)
})

function resetManualCounts() {
  baManualCounts.value = {}
}

function adjustManualCount(staffId: string, delta: number) {
  const item = baBatchPreviewList.value.find(i => i.staffId === staffId)
  const current = baManualCounts.value[staffId] ?? (item?.count || 0)
  const next = Math.max(0, current + delta)
  baManualCounts.value = { ...baManualCounts.value, [staffId]: next }
}

function openBatchAssign() {
  selectedStaffIds.value = []
  baManualCounts.value = {}
  batchAssignOpen.value = true
}

async function handleBatchAssign() {
  if (!selectedStaffIds.value.length) { message.warning('请选择业务员'); return }
  assigning.value = true
  try {
    const assignments: Array<{ subId: string; staffId: string }> = []
    let pos = 0
    for (const item of baBatchPreviewList.value) {
      const qty = baManualCounts.value[item.staffId] ?? item.count
      for (let i = 0; i < qty && pos < selectedKeys.value.length; i++, pos++) {
        assignments.push({ subId: selectedKeys.value[pos], staffId: item.staffId })
      }
    }
    const updates = assignments.map(({ subId, staffId }) => {
      const staff = staffList.value.find(s => s.id === staffId)
      return supabase.from('sub_orders').update({
        staff_id: staffId,
        staff_name: staff?.name || '',
        status: '已分配',
      }).eq('id', subId)
    })
    await Promise.all(updates)
    message.success(`成功分配 ${assignments.length} 条子单`)
    batchAssignOpen.value = false
    selectedKeys.value = []
    selectedStaffIds.value = []
    baManualCounts.value = {}
    load()
  } catch (e: any) {
    message.error('分配失败：' + e.message)
  } finally {
    assigning.value = false
  }
}

// ---- 行内编辑 (Inline Cell Edit) ----
const editingCell = ref<{ id: string; field: string } | null>(null)
const editingValue = ref<any>('')
let editingRef: any = null

function setEditRef(el: any) {
  if (el) {
    editingRef = el
    nextTick(() => {
      const input = el.$el?.querySelector('input') || el.$el || el
      input?.focus?.()
    })
  }
}

function isEditing(id: string, field: string) {
  return editingCell.value?.id === id && editingCell.value?.field === field
}

function startEdit(id: string, field: string, currentVal: any) {
  editingCell.value = { id, field }
  editingValue.value = currentVal
}

function cancelEdit() {
  editingCell.value = null
  editingValue.value = ''
}

async function saveInlineEdit(sub: any, field: string) {
  if (!editingCell.value) return
  const val = editingValue.value
  editingCell.value = null
  try {
    const { error } = await supabase.from('sub_orders').update({ [field]: val || null }).eq('id', sub.id)
    if (error) throw error
    const row = subOrders.value.find((s: any) => s.id === sub.id)
    if (row) row[field] = val || null
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  }
}

// ---- 批量修改 ----
const batchEditOpen = ref(false)
const batchEditSaving = ref(false)
const batchEditFields = ref([
  { key: 'keyword', label: '关键词', type: 'text', value: '', enabled: false, options: [] as string[] },
  { key: 'order_type', label: '测评类型', type: 'select', value: '', enabled: false, options: ['文字评', '图片评', '视频评', '免评', 'FB', 'Feedback'] },
  { key: 'review_level', label: '测评等级', type: 'select', value: '', enabled: false, options: ['普通', '高等', '极高等'] },
  { key: 'scheduled_date', label: '排期日期', type: 'date', value: '', enabled: false, options: [] as string[] },
  { key: 'country', label: '国家', type: 'select', value: '', enabled: false, options: ['美国', '德国', '英国', '加拿大', '日本', '法国'] },
  { key: 'task_notes', label: '备注', type: 'text', value: '', enabled: false, options: [] as string[] },
])

const batchEditActiveFields = computed(() => batchEditFields.value.filter(f => f.enabled))

function openBatchEdit() {
  batchEditFields.value.forEach(f => { f.value = ''; f.enabled = false })
  batchEditOpen.value = true
}

async function handleBatchEdit() {
  const active = batchEditActiveFields.value
  if (!active.length) { message.warning('请至少勾选一个要修改的字段'); return }
  batchEditSaving.value = true
  try {
    const updates: Record<string, any> = {}
    for (const f of active) updates[f.key] = f.value || null
    await Promise.all(
      selectedKeys.value.map(id => supabase.from('sub_orders').update(updates).eq('id', id))
    )
    message.success(`已批量修改 ${selectedKeys.value.length} 条子单`)
    batchEditOpen.value = false
    selectedKeys.value = []
    load()
  } catch (e: any) {
    message.error('批量修改失败：' + e.message)
  } finally {
    batchEditSaving.value = false
  }
}

// ---- 单行编辑弹窗 ----
const rowEditOpen = ref(false)
const rowEditRecord = ref<any>(null)
const rowEditSaving = ref(false)
const rowEditData = ref<Record<string, any>>({})

function openRowEdit(sub: any) {
  rowEditRecord.value = sub
  rowEditData.value = {
    keyword: sub.keyword || '',
    order_type: sub.order_type || '',
    review_level: sub.review_level || '',
    country: sub.country || '',
    scheduled_date: sub.scheduled_date || '',
    task_notes: sub.task_notes || '',
  }
  rowEditOpen.value = true
}

async function saveRowEdit() {
  if (!rowEditRecord.value) return
  rowEditSaving.value = true
  try {
    const updates: Record<string, any> = {}
    for (const [k, v] of Object.entries(rowEditData.value)) {
      updates[k] = v || null
    }
    const { error } = await supabase.from('sub_orders').update(updates).eq('id', rowEditRecord.value.id)
    if (error) throw error
    const row = subOrders.value.find((s: any) => s.id === rowEditRecord.value.id)
    if (row) Object.assign(row, updates)
    message.success('保存成功')
    rowEditOpen.value = false
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    rowEditSaving.value = false
  }
}

const kwEditOpen = ref(false)
const kwEditRecord = ref<any>(null)
const kwEditMode = ref<'keyword' | 'link'>('keyword')
const kwEditValue = ref('')
const kwEditSaving = ref(false)

const subStatuses = ['待分配', '已分配', '进行中', '已下单', '已留评', '已完成', '已取消']
const countries = ['美国', '德国', '英国', '加拿大']

const subColumns = [
  { title: '子订单号', key: 'sub_no', width: 165 },
  { title: '产品名/ASIN', key: 'sub_product', width: 180 },
  { title: '关键词', key: 'sub_keyword', width: 130 },
  { title: '变体', key: 'sub_variant', width: 80 },
  { title: '排期日期', key: 'sub_scheduled', width: 95 },
  { title: '测评类型', key: 'sub_review_type', width: 80 },
  { title: '测评等级', key: 'sub_review_level', width: 80 },
  { title: '产品售价', key: 'sub_price', width: 90 },
  { title: '商务', key: 'sub_staff', width: 90 },
  { title: '备注', key: 'sub_notes', width: 130 },
  { title: '操作', key: 'sub_action', width: 80, fixed: 'right' as const },
]

const flatColumns = [
  { title: '主订单', key: 'flat_order', width: 150 },
  { title: '子订单号', key: 'flat_sub_no', width: 165 },
  { title: '产品名/ASIN', key: 'flat_product', width: 170 },
  { title: '关键词 (点击编辑)', key: 'flat_keyword', width: 140 },
  { title: '类型/国家 (点击编辑)', key: 'flat_type', width: 130 },
  { title: '等级 (点击编辑)', key: 'flat_level', width: 100 },
  { title: '排期 (点击编辑)', key: 'flat_scheduled', width: 110 },
  { title: '商务', key: 'flat_staff', width: 80 },
  { title: '备注 (点击编辑)', key: 'flat_notes', width: 130 },
  { title: '操作', key: 'flat_action', width: 100, fixed: 'right' as const },
]

const groupedOrders = computed(() => {
  const map = new Map<string, any>()
  for (const sub of subOrders.value) {
    const oid = sub.order_id
    if (!map.has(oid)) {
      map.set(oid, {
        order_id: oid,
        order_number: sub._order_number || '',
        order_status: sub._order_status || '',
        asin: sub.asin,
        product_name: sub.product_name,
        store_name: sub.store_name,
        brand_name: sub.brand_name,
        country: sub.country,
        order_type: sub.order_type,
        review_type: sub.review_type,
        review_level: sub.review_level,
        category: sub.category,
        product_price: sub.product_price,
        customer_name: sub.customer_name,
        sales_person: sub.sales_person,
        subs: [],
      })
    }
    map.get(oid).subs.push(sub)
  }
  return Array.from(map.values())
})

function getOrderStatusColor(status: string) {
  const map: Record<string, string> = { '待处理': 'default', '进行中': 'blue', '已完成': 'green', '已取消': 'red', '暂停': 'orange' }
  return map[status] || 'default'
}

function getOrderTypeTagColor(t: string) {
  const map: Record<string, string> = { '文字': 'cyan', '图片': 'blue', '视频': 'geekblue', '免评': 'green', 'FB': 'gold', 'Feedback': 'gold', '文字评': 'cyan', '图片评': 'blue', '视频评': 'geekblue' }
  return map[t] || 'default'
}

function getReviewLevelTagColor(level: string) {
  const map: Record<string, string> = { '普通': 'default', '高等': 'blue', '极高等': 'gold' }
  return map[level] || 'default'
}

function getSubStatusColor(status: string) {
  const map: Record<string, string> = { '待分配': 'default', '已分配': 'cyan', '进行中': 'blue', '已下单': 'orange', '已留评': 'geekblue', '已完成': 'green', '已取消': 'red' }
  return map[status] || 'default'
}

function isOverdue(dateStr: string) {
  return dayjs(dateStr).isBefore(dayjs(), 'day')
}

function toggleExpand(orderId: string) {
  if (expandedKeys.value.includes(orderId)) {
    expandedKeys.value = expandedKeys.value.filter(k => k !== orderId)
  } else {
    expandedKeys.value = [...expandedKeys.value, orderId]
  }
}

function isAllGroupSelected(group: any) {
  return group.subs.every((s: any) => selectedKeys.value.includes(s.id))
}

function isGroupIndeterminate(group: any) {
  const some = group.subs.some((s: any) => selectedKeys.value.includes(s.id))
  return some && !isAllGroupSelected(group)
}

function toggleGroupSelect(group: any, checked: boolean) {
  const ids = group.subs.map((s: any) => s.id)
  if (checked) {
    const set = new Set([...selectedKeys.value, ...ids])
    selectedKeys.value = Array.from(set)
  } else {
    selectedKeys.value = selectedKeys.value.filter(k => !ids.includes(k))
  }
}

function onSelectionChange(keys: any[]) {
  selectedKeys.value = keys
}

function getLevelColor(level: string) {
  const map: Record<string, string> = { 'VIP': 'gold', '优质': 'blue', '普通': 'default' }
  return map[level] || 'default'
}

function getStatusColor(status: string) {
  const map: Record<string, string> = { '活跃': 'green', '暂停': 'orange', '黑名单': 'red' }
  return map[status] || 'default'
}


function openKwEdit(sub: any) {
  kwEditRecord.value = sub
  kwEditMode.value = (sub.keyword_type === 'link' ? 'link' : 'keyword') as 'keyword' | 'link'
  kwEditValue.value = sub.keyword_type === 'link' ? (sub.search_link || '') : (sub.keyword || '')
  kwEditOpen.value = true
}

async function saveKwEdit() {
  if (!kwEditRecord.value) return
  kwEditSaving.value = true
  try {
    const updates: Record<string, any> = {
      keyword_type: kwEditMode.value,
      keyword: kwEditMode.value === 'keyword' ? kwEditValue.value.trim() : '',
      search_link: kwEditMode.value === 'link' ? kwEditValue.value.trim() : '',
    }
    const { error } = await supabase.from('sub_orders').update(updates).eq('id', kwEditRecord.value.id)
    if (error) throw error
    Object.assign(kwEditRecord.value, updates)
    const sub = subOrders.value.find(s => s.id === kwEditRecord.value.id)
    if (sub) Object.assign(sub, updates)
    message.success('关键词/链接已更新')
    kwEditOpen.value = false
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    kwEditSaving.value = false
  }
}

function openSingleAssign(record: any) {
  currentRecord.value = record
  selectedStaffId.value = record.staff_id || ''
  singleAssignOpen.value = true
}

function openGroupAssign(group: any) {
  currentGroup.value = group
  selectedStaffId.value = ''
  groupAssignOpen.value = true
}

async function load() {
  loading.value = true
  try {
    let query = supabase
      .from('sub_orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    if (filterCountry.value) query = query.eq('country', filterCountry.value)
    if (filterOrderType.value) query = query.eq('order_type', filterOrderType.value)
    if (filterReviewLevel.value) query = query.eq('review_level', filterReviewLevel.value)

    if (quickDateSpecific.value) {
      query = query.eq('scheduled_date', quickDateSpecific.value)
    } else if (quickDate.value) {
      if (quickDate.value === 'overdue') {
        query = query.lt('scheduled_date', today).not('scheduled_date', 'is', null)
      } else if (quickDate.value === 'none') {
        query = query.is('scheduled_date', null)
      } else if (quickDate.value === 'this_week') {
        const weekStart = dayjs().startOf('week').format('YYYY-MM-DD')
        const weekEnd = dayjs().endOf('week').format('YYYY-MM-DD')
        query = query.gte('scheduled_date', weekStart).lte('scheduled_date', weekEnd)
      } else {
        query = query.eq('scheduled_date', quickDate.value)
      }
    }

    if (searchText.value) {
      query = query.or(`asin.ilike.%${searchText.value}%,store_name.ilike.%${searchText.value}%`)
    }

    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)

    const { data, count, error } = await query
    if (error) throw error

    const orderIds = [...new Set((data || []).map((s: any) => s.order_id))]
    let orderMap: Record<string, any> = {}
    if (orderIds.length > 0) {
      const { data: orders } = await supabase
        .from('erp_orders')
        .select('id, order_number, status')
        .in('id', orderIds)
      ;(orders || []).forEach((o: any) => { orderMap[o.id] = o })
    }

    subOrders.value = (data || []).map((s: any) => ({
      ...s,
      _order_number: orderMap[s.order_id]?.order_number || '',
      _order_status: orderMap[s.order_id]?.status || '',
    }))

    if (searchText.value) {
      const orderSearchIds = Object.values(orderMap)
        .filter((o: any) => o.order_number?.toLowerCase().includes(searchText.value.toLowerCase()))
        .map((o: any) => o.id)
      if (orderSearchIds.length > 0) {
        const extra = (data || []).filter((s: any) => orderSearchIds.includes(s.order_id))
        if (extra.length > 0) {
        }
      }
    }

    pagination.value.total = count || 0

    expandedKeys.value = [...new Set((data || []).map((s: any) => s.order_id))]
  } catch (e: any) {
    message.error('加载失败：' + e.message)
  } finally {
    loading.value = false
  }
}

const staffListWithPerf = computed(() => {
  const perfMap = new Map(perfList.value.map(p => [p.staff_id, p]))
  return staffList.value
    .map(s => ({ ...s, today_remaining: perfMap.get(s.id)?.today_remaining }))
    .sort((a, b) => (b.today_remaining ?? -1) - (a.today_remaining ?? -1))
})

async function loadStaff() {
  const { data } = await supabase.from('staff').select('id, name').eq('status', '在职')
  staffList.value = data || []
}

async function handleSingleAssign() {
  if (!selectedStaffId.value || !currentRecord.value) { message.warning('请选择业务员'); return }
  assigning.value = true
  try {
    const staff = staffList.value.find(s => s.id === selectedStaffId.value)
    const { error } = await supabase.from('sub_orders').update({
      staff_id: selectedStaffId.value,
      staff_name: staff?.name || '',
      status: '已分配',
    }).eq('id', currentRecord.value.id)
    if (error) throw error
    message.success('分配成功')
    singleAssignOpen.value = false
    selectedStaffId.value = ''
    load()
  } catch (e: any) {
    message.error('分配失败：' + e.message)
  } finally {
    assigning.value = false
  }
}

async function handleGroupAssign() {
  if (!selectedStaffId.value || !currentGroup.value) { message.warning('请选择业务员'); return }
  assigning.value = true
  try {
    const staff = staffList.value.find(s => s.id === selectedStaffId.value)
    const ids = currentGroup.value.subs
      .filter((s: any) => s.status === '待分配')
      .map((s: any) => s.id)
    if (ids.length === 0) { message.info('本组没有待分配子单'); return }
    const { error } = await supabase.from('sub_orders').update({
      staff_id: selectedStaffId.value,
      staff_name: staff?.name || '',
      status: '已分配',
    }).in('id', ids)
    if (error) throw error
    message.success(`成功分配 ${ids.length} 条子单`)
    groupAssignOpen.value = false
    selectedStaffId.value = ''
    load()
  } catch (e: any) {
    message.error('分配失败：' + e.message)
  } finally {
    assigning.value = false
  }
}

function onPageChange(page: number, pageSize: number) {
  pagination.value.current = page
  pagination.value.pageSize = pageSize
  load()
}

const issueModalOpen = ref(false)
const issueSubOrder = ref<any>(null)
const issueType = ref('不下单')
const issueDescription = ref('')
const markingIssue = ref(false)

function openMarkIssue(sub: any) {
  issueSubOrder.value = sub
  issueType.value = '不下单'
  issueDescription.value = ''
  issueModalOpen.value = true
}

async function handleMarkIssue() {
  if (!issueSubOrder.value) return
  markingIssue.value = true
  try {
    const so = issueSubOrder.value
    const { data: orderData } = await supabase
      .from('erp_orders')
      .select('order_number, sales_person')
      .eq('id', so.order_id)
      .maybeSingle()

    const { data: existing } = await supabase
      .from('after_sale_issues')
      .select('id')
      .eq('sub_order_id', so.id)
      .maybeSingle()

    if (existing) {
      message.warning('该子订单已存在问题单，请前往售后问题单页面查看')
      issueModalOpen.value = false
      return
    }

    const { error } = await supabase.from('after_sale_issues').insert({
      sub_order_id: so.id,
      sub_order_number: so.sub_order_number,
      order_id: so.order_id,
      order_number: orderData?.order_number || so._order_number || '',
      buyer_id: so.buyer_id || null,
      buyer_name: so.buyer_name || '',
      staff_id: so.staff_id || null,
      staff_name: so.staff_name || '',
      customer_name: so.customer_name || '',
      asin: so.asin || '',
      store_name: so.store_name || '',
      product_price: Number(so.product_price || 0),
      commission_fee: Number(so.commission_fee || 0),
      issue_type: issueType.value,
      description: issueDescription.value,
      old_amazon_order_id: so.amazon_order_id || '',
      issue_status: '待处理',
    })
    if (error) throw error
    message.success('问题单已创建，请前往售后问题单页面处理')
    issueModalOpen.value = false
  } catch (e: any) {
    message.error('创建失败：' + e.message)
  } finally {
    markingIssue.value = false
  }
}

onMounted(() => { load(); loadStaff(); loadPerfPanel() })
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }

/* 紧凑分配概览栏 */
.aob { background: #fff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 12px 16px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.aob-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.aob-title { font-size: 13px; font-weight: 700; color: #1f2937; }
.aob-month { font-size: 11px; font-weight: 400; color: #9ca3af; margin-left: 6px; }

.aob-pills-wrap { overflow-x: auto; margin: 0 -4px; padding-bottom: 4px; }
.aob-pills-wrap::-webkit-scrollbar { height: 4px; }
.aob-pills-wrap::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
.aob-pills { display: flex; gap: 8px; padding: 2px 4px; min-width: max-content; }

.aob-pill { display: flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 20px; border: 1.5px solid #e5e7eb; background: #f9fafb; cursor: pointer; transition: all 0.15s; white-space: nowrap; flex-shrink: 0; }
.aob-pill:hover { border-color: #93c5fd; background: #eff6ff; }
.aob-pill.pill-priority { border-color: #fca5a5; background: #fef2f2; }
.aob-pill.pill-priority .pill-remain { color: #dc2626; font-weight: 700; }
.aob-pill.pill-done { border-color: #86efac; background: #f0fdf4; opacity: 0.7; }

.pill-av { width: 22px; height: 22px; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pill-name { font-size: 12px; font-weight: 600; color: #374151; }
.pill-nums { font-size: 11px; color: #6b7280; font-family: monospace; }
.pill-remain { font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 8px; }
.pill-remain.remain-urgent { color: #dc2626; background: #fee2e2; }
.pill-remain.remain-ok { color: #059669; background: #d1fae5; }

/* 展开详情表格 */
.aob-detail { margin-top: 10px; border-top: 1px solid #f0f0f0; padding-top: 10px; }
.aob-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.aob-table th { text-align: left; font-size: 11px; color: #6b7280; font-weight: 600; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
.aob-table td { padding: 7px 8px; border-bottom: 1px solid #f3f4f6; }
.aob-table tr.row-priority { background: #fef2f2; }
.aob-t-center { text-align: center; }
.aob-t-name { display: flex; align-items: center; gap: 6px; font-weight: 600; color: #374151; white-space: nowrap; }
.pill-av-sm { width: 20px; height: 20px; border-radius: 50%; color: #fff; font-size: 9px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }

.remain-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-weight: 700; font-size: 12px; background: #f3f4f6; color: #374151; }
.remain-badge-urgent { background: #fee2e2; color: #dc2626; }
.remain-badge-ok { background: #d1fae5; color: #059669; }

.aob-t-progress { display: flex; align-items: center; gap: 4px; }
.aob-t-bar { flex: 1; height: 5px; background: #e5e7eb; border-radius: 3px; overflow: hidden; min-width: 60px; }
.aob-t-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
.aob-t-pct { font-size: 11px; font-weight: 700; min-width: 30px; text-align: right; }

.pending-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-weight: 700; font-size: 12px; background: #fffbeb; color: #d97706; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.total-hint { font-size: 13px; color: #6b7280; margin-left: 4px; }
.loading-wrap { display: flex; justify-content: center; padding: 60px 0; }

.task-list { display: flex; flex-direction: column; gap: 0; }
.task-card { border-bottom: 1px solid #f0f0f0; }
.task-card:last-child { border-bottom: none; }

.task-main-row {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 14px 4px 14px 0;
  transition: background 0.15s;
}
.task-main-row:hover { background: #fafbff; }

.task-expand-btn {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 3px;
  cursor: pointer;
  color: #9ca3af;
}
.expand-icon { font-size: 11px; transition: transform 0.2s; }
.expand-icon.expanded { transform: rotate(90deg); color: #2563eb; }

.task-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.task-top-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.order-num-link {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #2563eb;
  cursor: default;
  text-decoration: none;
}
.status-tag { font-size: 11px; }
.info-tag { font-size: 11px; }
.task-detail-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
}
.detail-item-text { color: #374151; }
.detail-sep { color: #6b7280; padding-left: 12px; }
.mono-sm { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; }
.price-text { color: #16a34a; font-weight: 600; }

.task-stats {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin: 0 20px;
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
}
.stat-item { display: flex; flex-direction: column; align-items: center; min-width: 48px; gap: 2px; }
.stat-label { font-size: 11px; color: #9ca3af; line-height: 1; }
.stat-val { font-size: 20px; font-weight: 700; line-height: 1.2; }
.stat-total { color: #1a1a2e; }
.stat-pending { color: #f59e0b; }
.stat-assigned { color: #059669; }
.stat-divider { width: 1px; height: 32px; background: #e5e7eb; margin: 0 10px; }

.task-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; padding-left: 8px; }
.gen-btn { font-size: 12px; }

.sub-orders-panel {
  background: #f8fafc;
  border-top: 1px dashed #e5e7eb;
  padding: 12px 16px 16px 32px;
}
.sub-orders-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sub-orders-title { font-size: 12px; font-weight: 600; color: #374151; }

.sub-no { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; }
.order-num-sm { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; }
.keyword-tag {
  display: inline-block;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.variant-text { font-size: 11px; color: #6b7280; }
/* 行内编辑 cell */
.ice-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
  transition: background 0.12s;
  min-height: 22px;
}
.ice-cell:hover {
  background: #f0f7ff;
}
.ice-cell:hover .ice-icon { opacity: 1; }
.ice-icon {
  font-size: 11px;
  color: #9ca3af;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.ice-placeholder {
  font-size: 11px;
  color: #d1d5db;
  font-style: italic;
}
.ice-wrap {
  display: flex;
  align-items: center;
}
.ice-date-input {
  height: 24px;
  border: 1px solid #2563eb;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  color: #374151;
  background: #fff;
  width: 120px;
}
.ice-date-input:focus { box-shadow: 0 0 0 2px #bfdbfe; }

/* 批量修改弹窗 */
.bme-wrap { padding: 4px 0; }
.bme-count-bar {
  font-size: 13px; color: #6b7280; margin-bottom: 16px;
  padding: 8px 12px; background: #fafafa; border-radius: 6px; border: 1px solid #e5e7eb;
}
.bme-count-bar strong { color: #374151; }
.bme-fields { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.bme-field-row {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 8px;
  transition: border-color 0.15s, background 0.15s;
}
.bme-field-row:has(.ant-checkbox-checked) {
  border-color: #2563eb; background: #f0f7ff;
}
.bme-chk { min-width: 90px; font-weight: 600; font-size: 13px; }
.bme-field-input { flex: 1; }
.bme-disabled { opacity: 0.4; pointer-events: none; }
.bme-hint { font-size: 11px; color: #9ca3af; white-space: nowrap; }
.bme-date-input {
  height: 28px; border: 1px solid #d1d5db; border-radius: 6px;
  padding: 0 8px; font-size: 12px; color: #374151; background: #fff; outline: none; width: 140px;
}
.bme-date-input:focus { border-color: #2563eb; box-shadow: 0 0 0 2px #bfdbfe; }
.bme-preview {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  padding: 8px 12px; background: #f9fafb; border-radius: 6px; border: 1px dashed #d1d5db;
}
.bme-preview-label { font-size: 12px; font-weight: 600; color: #374151; margin-right: 4px; }

.kw-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.kw-cell:hover .kw-edit-icon { opacity: 1; }
.kw-edit-icon {
  font-size: 11px;
  color: #9ca3af;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.kw-empty { font-size: 11px; }
.kw-mode-toggle {
  display: flex;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  overflow: hidden;
}
.kw-mode-btn {
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  color: #6b7280;
  background: #f9fafb;
  transition: background 0.15s, color 0.15s;
  user-select: none;
}
.kw-mode-btn:first-child { border-right: 1px solid #d1d5db; }
.kw-mode-btn.active { background: #2563eb; color: #fff; }
.kw-mode-btn.active.kw-mode-link { background: #0891b2; }
.kw-edit-modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;
}
.kw-edit-sub-no { font-size: 12px; color: #9ca3af; font-family: 'Courier New', monospace; }
.kw-edit-mode-row, .kw-edit-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.kw-edit-label { font-size: 13px; color: #374151; white-space: nowrap; min-width: 52px; }
.kw-link-preview { font-size: 12px; color: #0891b2; padding-left: 62px; }
.date-normal { font-size: 12px; color: #374151; }
.date-overdue { font-size: 12px; color: #dc2626; font-weight: 600; }
.price-main { font-size: 11px; font-weight: 600; color: #16a34a; }
.price-sub { font-size: 11px; color: #6b7280; }
.staff-assigned { font-size: 12px; color: #059669; font-weight: 500; }
.notes-text { font-size: 11px; color: #6b7280; max-width: 120px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
.text-gray { color: #9ca3af; font-size: 12px; }

.empty-list { padding: 40px 0; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0; }

.assign-modal-body { padding: 4px 0; }
.assign-count-tip {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 13px;
  color: #1d4ed8;
  margin-bottom: 16px;
}
.assign-sub-info {
  background: #f9fafb;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 10px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}
.assign-info-item { font-size: 12px; color: #6b7280; }
.assign-info-item strong { color: #374151; }

/* 批量分配弹窗简洁版 */
.ba-simple-wrap { padding: 4px 0; }
.ba-simple-count {
  font-size: 13px; color: #6b7280; margin-bottom: 16px;
  padding: 10px 14px; background: #f0f7ff; border-radius: 8px; border: 1px solid #bfdbfe;
}
.ba-simple-count strong { color: #2563eb; font-size: 15px; }
.ba-simple-field { margin-bottom: 12px; }
.ba-simple-label { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; }
.ba-simple-preview {
  background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;
  padding: 10px 14px; margin-top: 8px;
}
.ba-sp-title { font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.ba-sp-list { display: flex; flex-wrap: wrap; gap: 8px; }
.ba-sp-item {
  display: flex; align-items: center; gap: 6px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 20px;
  padding: 4px 12px 4px 5px;
}
.ba-sp-av {
  width: 22px; height: 22px; border-radius: 50%; color: #fff;
  font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center;
}
.ba-sp-name { font-size: 12px; font-weight: 600; color: #374151; }
.ba-sp-count { font-size: 12px; font-weight: 700; color: #2563eb; background: #eff6ff; border-radius: 8px; padding: 1px 6px; }

/* 详细分配预览 */
.ba-detail-preview {
  background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 12px 14px; margin-top: 8px;
}
.ba-dp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.ba-dp-title { font-size: 12px; font-weight: 700; color: #374151; }
.ba-dp-hint { font-size: 11px; color: #9ca3af; }
.ba-dp-table { width: 100%; }
.ba-dp-thead {
  display: grid; grid-template-columns: 1fr 80px 100px 90px;
  padding: 4px 6px; font-size: 11px; font-weight: 600; color: #9ca3af;
  text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 1px solid #e5e7eb; margin-bottom: 4px;
}
.ba-dp-row {
  display: grid; grid-template-columns: 1fr 80px 100px 90px;
  align-items: center; padding: 8px 6px;
  border-bottom: 1px solid #f3f4f6;
}
.ba-dp-row:last-child { border-bottom: none; }
.ba-dp-col-name { display: flex; align-items: center; gap: 8px; }
.ba-dp-col-stat { text-align: center; }
.ba-dp-col-add { text-align: center; }
.ba-dp-col-total { text-align: center; }
.ba-dp-av {
  width: 26px; height: 26px; border-radius: 50%; color: #fff;
  font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ba-dp-name { font-size: 13px; font-weight: 600; color: #111827; }
.ba-dp-existing { font-size: 13px; color: #6b7280; }
.ba-dp-counter { display: flex; align-items: center; gap: 4px; justify-content: center; }
.ba-cnt-btn {
  width: 22px; height: 22px; border-radius: 6px; border: 1px solid #d1d5db;
  background: #fff; cursor: pointer; font-size: 14px; font-weight: 600;
  color: #374151; display: flex; align-items: center; justify-content: center;
  padding: 0; line-height: 1; transition: all 0.15s;
}
.ba-cnt-btn:hover:not(:disabled) { background: #2563eb; border-color: #2563eb; color: #fff; }
.ba-cnt-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ba-cnt-num { font-size: 13px; font-weight: 700; color: #2563eb; min-width: 28px; text-align: center; }
.ba-dp-total-num { font-size: 14px; font-weight: 700; color: #059669; }
.ba-dp-sum {
  margin-top: 10px; padding-top: 8px; border-top: 1px dashed #e5e7eb;
  font-size: 12px; color: #6b7280;
}
.ba-dp-sum strong { color: #2563eb; font-size: 14px; }

/* 单行编辑弹窗 */
.re-wrap { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
.re-row { display: flex; align-items: center; gap: 12px; }
.re-label { width: 72px; font-size: 13px; font-weight: 600; color: #374151; flex-shrink: 0; text-align: right; }
.re-date-input {
  flex: 1; height: 32px; border: 1px solid #d1d5db; border-radius: 6px;
  padding: 0 10px; font-size: 13px; color: #374151; background: #fff; outline: none;
}
.re-date-input:focus { border-color: #2563eb; box-shadow: 0 0 0 2px #bfdbfe; }

/* 操作列按钮 */
.flat-action-btns { display: flex; align-items: center; gap: 0; }

/* 操作提示条 */
.flat-hint-bar {
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
  padding: 8px 14px; background: #fffbeb; border: 1px solid #fde68a;
  border-radius: 8px; margin-bottom: 10px; font-size: 12px; color: #92400e;
}
.flat-hint-item { display: flex; align-items: center; gap: 4px; }
.flat-hint-icon { font-size: 13px; font-weight: 700; color: #d97706; }
.flat-hint-sep { color: #fcd34d; font-weight: 300; }

/* 日期分隔 */
.qf-date-sep { color: #d1d5db; font-size: 12px; margin: 0 2px; }
.qf-pill-date { font-size: 11px; padding: 2px 7px; }

/* 今日分配明细 */
.aob-today-cell { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.aob-today-total { font-size: 15px; font-weight: 700; color: #111827; }
.aob-today-breakdown { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; }
.breakdown-item { font-size: 10px; padding: 1px 5px; border-radius: 8px; font-weight: 600; }
.breakdown-item.review { background: #eff6ff; color: #2563eb; }
.breakdown-item.free { background: #f0fdf4; color: #059669; }
.breakdown-item.fb { background: #fffbeb; color: #d97706; }

/* 旧批量分配（保留 CSS 以防万一） */
.ba-wrap { display: flex; height: 560px; overflow: hidden; }
.ba-left { flex: 1; display: flex; flex-direction: column; border-right: 1px solid #f0f0f0; overflow: hidden; }
.ba-filter-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0; flex-wrap: wrap;
}
.ba-filter-count { font-size: 12px; color: #6b7280; margin-left: 4px; }
.ba-filter-count strong { color: #2563eb; }
.ba-bulk-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px; background: #f8fafc; border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0; gap: 8px;
}
.ba-bulk-assign { display: flex; align-items: center; gap: 6px; }
.ba-sub-list { flex: 1; overflow-y: auto; }
.ba-sub-list::-webkit-scrollbar { width: 4px; }
.ba-sub-list::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
.ba-sub-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 16px; border-bottom: 1px solid #f3f4f6;
  cursor: pointer; transition: background 0.12s;
}
.ba-sub-item:hover { background: #f9fafb; }
.ba-sub-checked { background: #eff6ff !important; }
.ba-sub-info { flex: 1; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0; }
.ba-sub-no { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; font-weight: 600; flex-shrink: 0; }
.ba-sub-country { font-size: 11px; color: #6b7280; }
.ba-sub-kw {
  font-size: 11px; color: #2563eb; background: #eff6ff; border-radius: 3px;
  padding: 1px 5px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ba-sub-staff-pick { flex-shrink: 0; }
.ba-empty { padding: 32px 16px; text-align: center; font-size: 13px; color: #9ca3af; }
.ba-right {
  width: 185px; flex-shrink: 0; padding: 16px 14px; background: #f8fafc;
  display: flex; flex-direction: column; gap: 12px; overflow-y: auto;
}
.ba-summary-title { font-size: 12px; font-weight: 700; color: #374151; }
.ba-summary-total { display: flex; align-items: baseline; gap: 4px; }
.ba-st-num { font-size: 28px; font-weight: 800; color: #2563eb; line-height: 1; }
.ba-st-label { font-size: 11px; color: #6b7280; }
.ba-summary-list { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.ba-summary-empty { font-size: 11px; color: #9ca3af; }
.ba-summary-item {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 8px; background: #fff; border-radius: 6px; border: 1px solid #e5e7eb;
}
.ba-summary-av {
  width: 20px; height: 20px; border-radius: 50%; color: #fff;
  font-size: 9px; font-weight: 700; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0;
}
.ba-summary-name { flex: 1; font-size: 12px; font-weight: 600; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ba-summary-count { font-size: 13px; font-weight: 800; color: #2563eb; background: #eff6ff; border-radius: 10px; padding: 1px 7px; }
.ba-unassigned-tip {
  font-size: 11px; color: #d97706; background: #fffbeb;
  border: 1px solid #fde68a; border-radius: 6px; padding: 6px 8px; line-height: 1.5;
}

.issue-modal-body { padding: 4px 0; }
.issue-sub-info {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.issue-sub-row { display: flex; align-items: center; gap: 8px; }
.issue-sub-label { font-size: 11px; color: #9a3412; min-width: 80px; font-weight: 500; }
.issue-sub-val { font-size: 13px; color: #1c1917; }
.issue-sub-val.mono { font-family: 'Courier New', monospace; font-size: 12px; }
.issue-price { font-weight: 700; color: #dc2626; }

/* 快捷筛选胶囊行 */
.qf-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 0;
  padding: 10px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}
.qf-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.qf-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  white-space: nowrap;
  padding-right: 2px;
}
.qf-pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 11px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  background: #fff;
  border: 1.5px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  user-select: none;
}
.qf-pill:hover {
  border-color: #2563eb;
  color: #2563eb;
  background: #eff6ff;
}
.qf-pill-active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.qf-pill.qf-pill-type.qf-pill-active {
  background: #0891b2;
  border-color: #0891b2;
  color: #fff;
}
.qf-pill.qf-pill-level.qf-pill-active {
  background: #059669;
  border-color: #059669;
  color: #fff;
}
.qf-pill.qf-pill-country.qf-pill-active {
  background: #d97706;
  border-color: #d97706;
  color: #fff;
}
.qf-divider {
  width: 1px;
  height: 18px;
  background: #e5e7eb;
  margin: 0 8px;
  flex-shrink: 0;
}
.qf-clear {
  font-size: 12px;
  color: #dc2626;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 4px;
  transition: background 0.12s;
  white-space: nowrap;
}
.qf-clear:hover { background: #fee2e2; }
.qf-select-all-wrap {
  margin-left: auto;
  padding-left: 12px;
}

/* 视图切换 */
.view-toggle {
  display: flex;
  border: 1.5px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}
.view-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 14px;
  font-size: 13px;
  cursor: pointer;
  color: #6b7280;
  background: #f9fafb;
  transition: background 0.15s, color 0.15s;
  user-select: none;
  white-space: nowrap;
}
.view-btn:first-child { border-right: 1px solid #e5e7eb; }
.view-btn-active { background: #2563eb; color: #fff; }
.view-btn-active:hover { background: #1d4ed8; }

/* 概览面板 - 测评/免评标签 */
.pill-review-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 6px;
  background: #dbeafe;
  color: #1d4ed8;
  white-space: nowrap;
}
.pill-free-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 6px;
  background: #dcfce7;
  color: #166534;
  white-space: nowrap;
}

/* 详情表格 - 测评/免评徽章 */
.review-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 12px;
  background: #dbeafe;
  color: #1d4ed8;
}
.free-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 12px;
  background: #dcfce7;
  color: #166534;
}

/* 平铺视图 */
.flat-order-num {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
}
.sub-product-cell { max-width: 180px; }
.sub-product-name { font-size: 12px; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
.sub-asin { font-family: 'Courier New', monospace; font-size: 11px; color: #6b7280; }
.flat-order-meta {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}
.flat-asin {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #6b7280;
}
.flat-store {
  font-size: 11px;
  color: #9ca3af;
}
.flat-type-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.flat-country {
  font-size: 11px;
  color: #6b7280;
}
</style>
