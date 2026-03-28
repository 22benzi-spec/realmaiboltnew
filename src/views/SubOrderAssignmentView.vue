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
              <th>测评单</th>
              <th>免评单</th>
              <th>本月完成</th>
              <th>月度目标</th>
              <th>月完成率</th>
              <th>待处理</th>
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
              <td class="aob-t-center">{{ p.today_done }}</td>
              <td class="aob-t-center">{{ p.daily_target }}</td>
              <td class="aob-t-center">
                <span :class="['remain-badge', { 'remain-badge-urgent': p.today_remaining >= 5, 'remain-badge-ok': p.today_remaining === 0 && p.daily_target > 0 }]">
                  {{ p.today_remaining }}
                </span>
              </td>
              <td class="aob-t-center"><span class="review-badge">{{ p.review_assigned }}</span></td>
              <td class="aob-t-center"><span class="free-badge">{{ p.free_assigned }}</span></td>
              <td class="aob-t-center">{{ p.month_done }}</td>
              <td class="aob-t-center">{{ p.monthly_target }}</td>
              <td class="aob-t-center">
                <div class="aob-t-progress">
                  <div class="aob-t-bar"><div class="aob-t-fill" :style="{ width: getProgressPct(p) + '%', background: getProgressColor(p) }"></div></div>
                  <span class="aob-t-pct" :style="{ color: getProgressColor(p) }">{{ getProgressPct(p) }}%</span>
                </div>
              </td>
              <td class="aob-t-center"><span class="pending-badge">{{ p.pending }}</span></td>
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
        <a-input-search v-model:value="searchText" placeholder="搜索订单号/ASIN/店铺" style="width:240px" @search="load" allow-clear />
        <a-select v-model:value="filterStatus" style="width:130px" @change="load" allow-clear placeholder="子单状态">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option v-for="s in subStatuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterCountry" style="width:100px" @change="load" allow-clear placeholder="国家">
          <a-select-option value="">全部</a-select-option>
          <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-button
          type="primary"
          :disabled="!selectedKeys.length"
          @click="batchAssignOpen = true"
        >
          <UserAddOutlined /> 批量分配 ({{ selectedKeys.length }})
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
                <span class="detail-sep">业务员：{{ group.sales_person || '—' }}</span>
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
                  <span style="font-size:12px">{{ sub.review_type || '—' }}</span>
                </template>
                <template v-if="column.key === 'sub_review_level'">
                  <span style="font-size:12px">{{ sub.review_level || '—' }}</span>
                </template>
                <template v-if="column.key === 'sub_price'">
                  <span class="price-main">${{ Number(sub.product_price || 0).toFixed(2) }}</span>
                </template>
                <template v-if="column.key === 'sub_staff'">
                  <span v-if="sub.staff_name" class="staff-assigned">{{ sub.staff_name }}</span>
                  <span v-else class="text-gray">未分配</span>
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
            <template v-if="column.key === 'flat_keyword'">
              <div class="kw-cell" @click="openKwEdit(sub)">
                <template v-if="sub.keyword_type === 'link'">
                  <a-tag color="cyan" size="small" style="cursor:pointer"><LinkOutlined /> 链接</a-tag>
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
            <template v-if="column.key === 'flat_type'">
              <div class="flat-type-cell">
                <span style="font-size:12px">{{ sub.review_type || '—' }}</span>
                <span v-if="sub.country" class="flat-country">{{ sub.country }}</span>
              </div>
            </template>
            <template v-if="column.key === 'flat_level'">
              <span style="font-size:12px">{{ sub.review_level || '—' }}</span>
            </template>
            <template v-if="column.key === 'flat_scheduled'">
              <span v-if="sub.scheduled_date" :class="isOverdue(sub.scheduled_date) ? 'date-overdue' : 'date-normal'">
                {{ sub.scheduled_date }}
              </span>
              <span v-else class="text-gray">—</span>
            </template>
            <template v-if="column.key === 'flat_price'">
              <span class="price-main">${{ Number(sub.product_price || 0).toFixed(2) }}</span>
            </template>
            <template v-if="column.key === 'flat_staff'">
              <span v-if="sub.staff_name" class="staff-assigned">{{ sub.staff_name }}</span>
              <span v-else class="text-gray">未分配</span>
            </template>
            <template v-if="column.key === 'flat_action'">
              <a-button type="link" size="small" @click="openSingleAssign(sub)">分配</a-button>
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
      <div class="assign-modal-body">
        <div class="assign-count-tip">
          已选择 <strong>{{ selectedKeys.length }}</strong> 条子单
        </div>
        <a-form layout="vertical">
          <a-form-item label="选择业务员">
            <a-select v-model:value="selectedStaffId" placeholder="请选择业务员（按剩余量排序）" style="width:100%" show-search option-filter-prop="label">
              <a-select-option v-for="s in staffListWithPerf" :key="s.id" :value="s.id" :label="s.name">{{ s.name }}<span v-if="s.today_remaining !== undefined" style="color:#9ca3af;font-size:11px;margin-left:6px">(剩{{ s.today_remaining }})</span></a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="分配买手（可选）">
            <div class="buyer-search-wrap">
              <a-input
                v-model:value="buyerSearchText"
                placeholder="搜索买手ID / 姓名 / 邮箱"
                allow-clear
                @input="onBuyerSearch"
              >
                <template #prefix><SearchOutlined style="color:#9ca3af" /></template>
              </a-input>
              <div v-if="buyerSearchText" class="buyer-result-list">
                <div v-if="buyerSearchLoading" class="buyer-search-loading"><a-spin size="small" /> 搜索中...</div>
                <template v-else-if="buyerSearchResults.length">
                  <div
                    v-for="b in buyerSearchResults"
                    :key="b.id"
                    class="buyer-result-item"
                    :class="{ selected: selectedBuyerId === b.id }"
                    @click="selectBuyer(b)"
                  >
                    <div class="buyer-result-main">
                      <span class="buyer-result-num">{{ b.buyer_number }}</span>
                      <span class="buyer-result-name">{{ b.name }}</span>
                      <a-tag :color="getLevelColor(b.level)" size="small">{{ b.level }}</a-tag>
                      <a-tag :color="getStatusColor(b.status)" size="small">{{ b.status }}</a-tag>
                    </div>
                    <div class="buyer-result-sub">
                      <span>{{ b.country }}</span>
                      <span v-if="b.email" class="buyer-result-email">{{ b.email }}</span>
                      <span v-if="b.staff_name" class="buyer-result-staff">归属：{{ b.staff_name }}</span>
                    </div>
                  </div>
                </template>
                <div v-else class="buyer-no-result">未找到匹配买手</div>
              </div>
              <div v-if="selectedBuyerId" class="buyer-selected-chip">
                <CheckCircleOutlined style="color:#059669" />
                已选买手：<strong>{{ selectedBuyerName }}</strong>（{{ selectedBuyerNumber }}）
                <a-button type="link" size="small" danger @click="clearBuyer">取消</a-button>
              </div>
            </div>
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <!-- 单条分配弹窗 -->
    <a-modal
      v-model:open="singleAssignOpen"
      :title="`分配子单 - ${currentRecord?.sub_order_number}`"
      @ok="handleSingleAssign"
      :confirm-loading="assigning"
      ok-text="确认分配"
      width="560px"
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
          <span v-if="currentRecord.buyer_name" class="assign-info-item">当前买手：<strong>{{ currentRecord.buyer_name }}</strong></span>
        </div>
        <a-form layout="vertical">
          <a-form-item label="选择业务员">
            <a-select v-model:value="selectedStaffId" placeholder="请选择业务员（按剩余量排序）" style="width:100%" show-search option-filter-prop="label" allow-clear>
              <a-select-option v-for="s in staffListWithPerf" :key="s.id" :value="s.id" :label="s.name">{{ s.name }}<span v-if="s.today_remaining !== undefined" style="color:#9ca3af;font-size:11px;margin-left:6px">(剩{{ s.today_remaining }})</span></a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="分配买手（可选）">
            <div class="buyer-search-wrap">
              <a-input
                v-model:value="buyerSearchText"
                placeholder="搜索买手ID / 姓名 / 邮箱"
                allow-clear
                @input="onBuyerSearch"
              >
                <template #prefix><SearchOutlined style="color:#9ca3af" /></template>
              </a-input>
              <div v-if="buyerSearchText" class="buyer-result-list">
                <div v-if="buyerSearchLoading" class="buyer-search-loading"><a-spin size="small" /> 搜索中...</div>
                <template v-else-if="buyerSearchResults.length">
                  <div
                    v-for="b in buyerSearchResults"
                    :key="b.id"
                    class="buyer-result-item"
                    :class="{ selected: selectedBuyerId === b.id }"
                    @click="selectBuyer(b)"
                  >
                    <div class="buyer-result-main">
                      <span class="buyer-result-num">{{ b.buyer_number }}</span>
                      <span class="buyer-result-name">{{ b.name }}</span>
                      <a-tag :color="getLevelColor(b.level)" size="small">{{ b.level }}</a-tag>
                      <a-tag :color="getStatusColor(b.status)" size="small">{{ b.status }}</a-tag>
                    </div>
                    <div class="buyer-result-sub">
                      <span>{{ b.country }}</span>
                      <span v-if="b.email" class="buyer-result-email">{{ b.email }}</span>
                      <span v-if="b.staff_name" class="buyer-result-staff">归属：{{ b.staff_name }}</span>
                    </div>
                  </div>
                </template>
                <div v-else class="buyer-no-result">未找到匹配买手</div>
              </div>
              <div v-if="selectedBuyerId" class="buyer-selected-chip">
                <CheckCircleOutlined style="color:#059669" />
                已选买手：<strong>{{ selectedBuyerName }}</strong>（{{ selectedBuyerNumber }}）
                <a-button type="link" size="small" danger @click="clearBuyer">取消</a-button>
              </div>
            </div>
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
      width="560px"
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
          <a-form-item label="分配买手（可选）">
            <div class="buyer-search-wrap">
              <a-input
                v-model:value="buyerSearchText"
                placeholder="搜索买手ID / 姓名 / 邮箱"
                allow-clear
                @input="onBuyerSearch"
              >
                <template #prefix><SearchOutlined style="color:#9ca3af" /></template>
              </a-input>
              <div v-if="buyerSearchText" class="buyer-result-list">
                <div v-if="buyerSearchLoading" class="buyer-search-loading"><a-spin size="small" /> 搜索中...</div>
                <template v-else-if="buyerSearchResults.length">
                  <div
                    v-for="b in buyerSearchResults"
                    :key="b.id"
                    class="buyer-result-item"
                    :class="{ selected: selectedBuyerId === b.id }"
                    @click="selectBuyer(b)"
                  >
                    <div class="buyer-result-main">
                      <span class="buyer-result-num">{{ b.buyer_number }}</span>
                      <span class="buyer-result-name">{{ b.name }}</span>
                      <a-tag :color="getLevelColor(b.level)" size="small">{{ b.level }}</a-tag>
                      <a-tag :color="getStatusColor(b.status)" size="small">{{ b.status }}</a-tag>
                    </div>
                    <div class="buyer-result-sub">
                      <span>{{ b.country }}</span>
                      <span v-if="b.email" class="buyer-result-email">{{ b.email }}</span>
                      <span v-if="b.staff_name" class="buyer-result-staff">归属：{{ b.staff_name }}</span>
                    </div>
                  </div>
                </template>
                <div v-else class="buyer-no-result">未找到匹配买手</div>
              </div>
              <div v-if="selectedBuyerId" class="buyer-selected-chip">
                <CheckCircleOutlined style="color:#059669" />
                已选买手：<strong>{{ selectedBuyerName }}</strong>（{{ selectedBuyerNumber }}）
                <a-button type="link" size="small" danger @click="clearBuyer">取消</a-button>
              </div>
            </div>
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
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { UserAddOutlined, ReloadOutlined, RightOutlined, SearchOutlined, CheckCircleOutlined, EditOutlined, LinkOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons-vue'

import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const subOrders = ref<any[]>([])
const staffList = ref<any[]>([])
const viewMode = ref<'grouped' | 'flat'>('grouped')

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
  for (const s of assignedSubs || []) {
    if (s.order_type === '免评') {
      freeMap[s.staff_id] = (freeMap[s.staff_id] || 0) + 1
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
const selectedKeys = ref<string[]>([])
const batchAssignOpen = ref(false)
const singleAssignOpen = ref(false)
const groupAssignOpen = ref(false)
const selectedStaffId = ref<string>('')
const currentRecord = ref<any>(null)
const currentGroup = ref<any>(null)
const assigning = ref(false)
const expandedKeys = ref<string[]>([])
const pagination = ref({ current: 1, pageSize: 50, total: 0 })

const buyerSearchText = ref('')
const buyerSearchLoading = ref(false)
const buyerSearchResults = ref<any[]>([])
const selectedBuyerId = ref('')
const selectedBuyerName = ref('')
const selectedBuyerNumber = ref('')
let buyerSearchTimer: ReturnType<typeof setTimeout> | null = null

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
  { title: '业务员', key: 'sub_staff', width: 90 },
  { title: '操作', key: 'sub_action', width: 80, fixed: 'right' as const },
]

const flatColumns = [
  { title: '主订单', key: 'flat_order', width: 160 },
  { title: '子订单号', key: 'flat_sub_no', width: 165 },
  { title: '产品名/ASIN', key: 'flat_product', width: 180 },
  { title: '关键词', key: 'flat_keyword', width: 130 },
  { title: '测评类型/国家', key: 'flat_type', width: 115 },
  { title: '测评等级', key: 'flat_level', width: 80 },
  { title: '排期日期', key: 'flat_scheduled', width: 95 },
  { title: '产品售价', key: 'flat_price', width: 90 },
  { title: '业务员', key: 'flat_staff', width: 90 },
  { title: '操作', key: 'flat_action', width: 80, fixed: 'right' as const },
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
  const map: Record<string, string> = { '免评': 'green', '文字评': 'cyan', '图片评': 'blue', '视频评': 'geekblue', 'Feedback': 'gold' }
  return map[t] || 'default'
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

function clearBuyer() {
  selectedBuyerId.value = ''
  selectedBuyerName.value = ''
  selectedBuyerNumber.value = ''
  buyerSearchText.value = ''
  buyerSearchResults.value = []
}

function resetBuyerSearch() {
  buyerSearchText.value = ''
  buyerSearchResults.value = []
  selectedBuyerId.value = ''
  selectedBuyerName.value = ''
  selectedBuyerNumber.value = ''
}

function selectBuyer(b: any) {
  selectedBuyerId.value = b.id
  selectedBuyerName.value = b.name
  selectedBuyerNumber.value = b.buyer_number
  buyerSearchText.value = ''
  buyerSearchResults.value = []
}

function onBuyerSearch() {
  if (buyerSearchTimer) clearTimeout(buyerSearchTimer)
  const kw = buyerSearchText.value.trim()
  if (!kw) { buyerSearchResults.value = []; return }
  buyerSearchLoading.value = true
  buyerSearchTimer = setTimeout(async () => {
    try {
      const { data } = await supabase
        .from('erp_buyers')
        .select('id, buyer_number, name, email, country, level, status, staff_name')
        .or(`buyer_number.ilike.%${kw}%,name.ilike.%${kw}%,email.ilike.%${kw}%`)
        .neq('status', '黑名单')
        .limit(10)
      buyerSearchResults.value = data || []
    } finally {
      buyerSearchLoading.value = false
    }
  }, 300)
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
  resetBuyerSearch()
  if (record.buyer_id) {
    selectedBuyerId.value = record.buyer_id
    selectedBuyerName.value = record.buyer_name || ''
    selectedBuyerNumber.value = ''
  }
  singleAssignOpen.value = true
}

function openGroupAssign(group: any) {
  currentGroup.value = group
  selectedStaffId.value = ''
  resetBuyerSearch()
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

async function handleBatchAssign() {
  if (!selectedStaffId.value) { message.warning('请选择业务员'); return }
  assigning.value = true
  try {
    const staff = staffList.value.find(s => s.id === selectedStaffId.value)
    const updateData: any = {
      staff_id: selectedStaffId.value,
      staff_name: staff?.name || '',
      status: '已分配',
    }
    if (selectedBuyerId.value) {
      updateData.buyer_id = selectedBuyerId.value
      updateData.buyer_name = selectedBuyerName.value
    }
    const { error } = await supabase.from('sub_orders').update(updateData).in('id', selectedKeys.value)
    if (error) throw error
    message.success(`成功分配 ${selectedKeys.value.length} 条子单`)
    batchAssignOpen.value = false
    selectedKeys.value = []
    selectedStaffId.value = ''
    resetBuyerSearch()
    load()
  } catch (e: any) {
    message.error('分配失败：' + e.message)
  } finally {
    assigning.value = false
  }
}

async function handleSingleAssign() {
  if (!selectedStaffId.value || !currentRecord.value) { message.warning('请选择业务员'); return }
  assigning.value = true
  try {
    const staff = staffList.value.find(s => s.id === selectedStaffId.value)
    const updateData: any = {
      staff_id: selectedStaffId.value,
      staff_name: staff?.name || '',
      status: '已分配',
    }
    if (selectedBuyerId.value) {
      updateData.buyer_id = selectedBuyerId.value
      updateData.buyer_name = selectedBuyerName.value
    }
    const { error } = await supabase.from('sub_orders').update(updateData).eq('id', currentRecord.value.id)
    if (error) throw error
    message.success('分配成功')
    singleAssignOpen.value = false
    selectedStaffId.value = ''
    resetBuyerSearch()
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
    const updateData: any = {
      staff_id: selectedStaffId.value,
      staff_name: staff?.name || '',
      status: '已分配',
    }
    if (selectedBuyerId.value) {
      updateData.buyer_id = selectedBuyerId.value
      updateData.buyer_name = selectedBuyerName.value
    }
    const { error } = await supabase.from('sub_orders').update(updateData).in('id', ids)
    if (error) throw error
    message.success(`成功分配 ${ids.length} 条子单`)
    groupAssignOpen.value = false
    selectedStaffId.value = ''
    resetBuyerSearch()
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

.buyer-search-wrap { display: flex; flex-direction: column; gap: 8px; }

.buyer-result-list {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  max-height: 220px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.buyer-search-loading {
  padding: 12px 16px;
  font-size: 13px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 8px;
}

.buyer-result-item {
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;
}
.buyer-result-item:last-child { border-bottom: none; }
.buyer-result-item:hover { background: #f0f7ff; }
.buyer-result-item.selected { background: #eff6ff; border-left: 3px solid #2563eb; }

.buyer-result-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
}
.buyer-result-num {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 1px 5px;
  border-radius: 3px;
}
.buyer-result-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}
.buyer-result-sub {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #9ca3af;
}
.buyer-result-email { color: #6b7280; }
.buyer-result-staff { color: #059669; }

.buyer-no-result {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
}

.buyer-selected-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  color: #166534;
}
.buyer-selected-chip strong { color: #15803d; }

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
