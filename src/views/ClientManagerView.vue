<template>
  <div class="customer-list">
    <div class="flex-between mb-16">
      <div class="flex-center-gap flex-1">
        <a-input-search
          v-model:value="searchText"
          class="customer-search-name"
          allow-clear
          placeholder="客户/客户ID;客户公司/客户公司ID"
          @search="handleSearch"
        />
        <a-input-search
          v-model:value="storeKeyword"
          class="customer-search-asin"
          allow-clear
          placeholder="ASIN/店铺/品牌"
          @search="handleSearch"
        />
        <a-input-search
          v-model:value="contactKeyword"
          class="customer-search-contact"
          allow-clear
          placeholder="微信号/手机号/邮箱"
          @search="handleSearch"
        />
        <a-select v-model:value="filterLevel" class="customer-filter-level" allow-clear placeholder="等级" @change="handleSearch">
          <a-select-option v-for="l in ['S','A','B','C']" :key="l" :value="l">{{ l }}级</a-select-option>
        </a-select>
        <a-select v-model:value="filterStatus" class="customer-filter-status" allow-clear placeholder="状态" @change="handleSearch">
          <a-select-option value="活跃">活跃</a-select-option>
          <a-select-option value="暂停">暂停</a-select-option>
          <a-select-option value="流失">流失</a-select-option>
        </a-select>
      </div>
      <div class="flex-center-gap">
        <a-button type="primary" @click="openAddModal">添加公司</a-button>
        <a-button type="text" :icon="h(ReloadOutlined)" :loading="loading" @click="handleSearch">刷新</a-button>
      </div>
    </div>

    <a-spin :spinning="loading">
      <div class="customer-card-list">
        <div v-for="company in visibleClients" :key="company.id">
          <a-row :gutter="12" class="customer-card-row">
            <a-col :span="1" class="customer-card-avatar">
              <div class="customer-avatar">
                {{ String(company.company_name || '-').slice(0, 1).toUpperCase() }}
              </div>
            </a-col>
            <a-col :span="7" class="customer-main-info">
              <div class="customer-name-row" @click="openDetail(company)">
                <span class="customer-name">{{ company.company_name || '-' }}</span>
              </div>
              <div class="customer-sub-info">
                <span>{{ company.org_id || '—' }}</span>
                <span :class="[customerLevelClass(company.level), 'customer-level-text']">{{ company.level || 'C' }}级</span>
                <a-tag :color="statusColor[company.status || '活跃']">{{ company.status || '活跃' }}</a-tag>
                <span
                  v-if="company.source_channel"
                  class="customer-channel-info ignore-source-detail"
                  :title="sourceDetailText(company) ? `${company.source_channel}：${sourceDetailText(company)}` : company.source_channel"
                >{{ company.source_channel }}<template v-if="sourceDetailText(company)">：{{ sourceDetailText(company) }}</template></span>
              </div>
            </a-col>
            <a-col :span="7">
              <div class="customer-order-group">
                <div class="customer-order-info">
                  <div class="customer-order-info-num customer-order-info-blue">{{ company.total_order_count || 0 }}</div>
                  <div class="customer-order-info-label">累计下单量</div>
                </div>
                <div class="customer-order-info">
                  <div class="customer-order-info-num customer-order-info-green">¥{{ formatListMoney(company.total_order_amount_cny) }}</div>
                  <div class="customer-order-info-label">累计金额</div>
                </div>
                <div class="customer-order-info">
                  <div class="customer-order-info-num customer-order-info-gray">¥{{ formatListMoney(companyBalance(company)) }}</div>
                  <div class="customer-order-info-label">余额</div>
                </div>
              </div>
            </a-col>
            <a-col :span="2">
              <div class="manager-label">商务负责人</div>
              <div class="manager-assigned" @click="openAssignManager(company)">
                <div class="manager-dot" />
                <span class="manager-name">{{ company.business_owner_name || '未分配' }}</span>
                <EditOutlined class="manager-edit-icon" />
              </div>
            </a-col>
            <a-col :span="5">
              <div class="card-contacts">
                <div class="section-label">商务微信</div>
                <div v-if="company.business_wechat_name" class="contact-chips">
                  <div class="contact-chip">
                    <div class="chip-avatar">{{ String(company.business_wechat_name).charAt(0).toUpperCase() }}</div>
                    <div class="chip-info">
                      <div class="chip-name">{{ company.business_wechat_name }}</div>
                      <div class="chip-sub">
                        <span class="chip-wechat">反馈：{{ company.feedback_type || '未填写' }}</span>
                        <span v-if="groupNameList(company).length" class="chip-wechat">群组：{{ groupNameList(company).join('、') }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="empty-val section-label">暂无商务微信</div>
              </div>
            </a-col>
            <a-col :span="2">
              <div class="customer-card-actions">
                <a-button type="link" size="small" @click="openEditModal(company)">编辑</a-button>
                <a-popconfirm title="确定删除该客户？" @confirm="deleteClient(company.id)">
                  <a-button type="link" size="small" danger>删除</a-button>
                </a-popconfirm>
              </div>
            </a-col>
          </a-row>
        </div>
        <a-empty v-if="!loading && visibleClients.length === 0" description="暂无客户数据" />
      </div>
    </a-spin>

    <div class="customer-pagination">
      <a-pagination
        :current="pagination.current"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        :show-total="(total: number) => `共 ${total} 条`"
        show-size-changer
        show-quick-jumper
        @change="handlePageChange"
      />
    </div>

    <!-- 添加/编辑 Modal -->
    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑公司' : '新增公司'"
      :confirm-loading="submitting"
      ok-text="确定"
      cancel-text="取消"
      @ok="handleSubmit"
    >
      <a-form layout="vertical">
        <a-form-item label="客户公司" required>
          <a-input v-model:value="form.company_name" placeholder="请输入客户公司" />
        </a-form-item>
        <a-form-item label="来源方式" required>
          <div class="source-type-options">
            <a-button
              v-for="item in sourceChannelOptions"
              :key="item.value"
              :type="form.source_channel === item.value ? 'primary' : 'default'"
              class="source-type-btn"
              @click="selectSourceChannel(item.value)"
            >
              <span class="source-type-btn-inner">
                <span class="source-type-icon">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </span>
            </a-button>
          </div>
        </a-form-item>
        <a-form-item v-if="form.source_channel !== '其他'" :label="sourceDetailLabel">
          <a-input v-model:value="sourceDetailValue" :placeholder="sourceDetailPlaceholder" />
        </a-form-item>
        <div class="font-bold mb-8">对接信息</div>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="反馈方式">
              <a-select v-model:value="form.feedback_type" placeholder="请选择反馈方式" allow-clear @change="onFeedbackTypeChange">
                <a-select-option value="私聊">私聊</a-select-option>
                <a-select-option value="群聊">群聊</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="对接商务微信">
              <a-select
                v-model:value="form.business_wechat_name"
                :options="businessWechatSelectOptions"
                placeholder="请选择对接商务微信"
                allow-clear
                show-search
                option-filter-prop="label"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item v-if="form.feedback_type === '群聊'" label="群聊名称">
          <div class="group-chat-rows">
            <div v-for="(_, index) in form.group_names" :key="index" class="group-chat-row">
              <a-input v-model:value="form.group_names[index]" placeholder="请输入群聊名称" allow-clear />
              <a-button v-if="index === 0" class="group-chat-btn" type="dashed" @click="addGroupName"><PlusOutlined /></a-button>
              <a-button v-else class="group-chat-btn" type="text" danger @click="removeGroupName(index)"><DeleteOutlined /></a-button>
            </div>
          </div>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="form.notes" class="customer-remark-input" placeholder="请输入备注" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 添加拜访记录 Modal -->
    <a-modal
      v-model:open="visitModalOpen"
      :title="editingVisitId ? '编辑拜访记录' : '记录拜访'"
      @ok="handleAddVisit"
      :confirm-loading="savingVisit"
      ok-text="保存"
      cancel-text="取消"
      width="700px"
    >
      <div class="visit-form">
      <a-form layout="vertical">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="拜访日期" required>
              <a-date-picker v-model:value="visitForm.visit_date" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="拜访方式">
              <a-select v-model:value="visitForm.visit_type">
                <a-select-option value="上门拜访">上门拜访</a-select-option>
                <a-select-option value="视频拜访">视频拜访</a-select-option>
                <a-select-option value="电话拜访">电话拜访</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="拜访人（我方）" required>
              <a-input v-model:value="visitForm.visitor_name" placeholder="我方负责人姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="对接员工（客户方）">
              <a-input v-model:value="visitForm.contact_names" placeholder="被拜访的员工姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="拜访目的">
              <a-input v-model:value="visitForm.purpose" placeholder="如：维护客情、了解需求" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="拜访小结">
              <a-textarea v-model:value="visitForm.summary" :rows="3" placeholder="本次拜访情况记录" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="下次预约拜访日期">
              <a-date-picker v-model:value="visitForm.next_visit_date" style="width:100%" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
      </div>
    </a-modal>

    <a-drawer
      v-model:open="detailOpen"
      width="50%"
      placement="right"
      :body-style="{ padding: '0', background: '#f5f7fb' }"
      :header-style="{ borderBottom: 'none', padding: '14px 16px 0' }"
    >
      <template #title>
        <span class="drawer-title">客户详情</span>
      </template>
      <template v-if="currentCompany">
        <div class="detail-wrap">
          <div class="detail-panel detail-header">
            <div class="header-left">
              <div class="header-avatar">{{ String(currentCompany.company_name || '-').slice(0, 1).toUpperCase() }}</div>
              <div class="header-main">
                <div class="header-name-row">
                  <span class="header-name">{{ currentCompany.company_name }}</span>
                </div>
                <div class="header-sub-row">
                  <span class="org-code">{{ currentCompany.org_id || '—' }}</span>
                  <span :class="['level-tag', detailLevelClass(currentCompany.level)]">{{ currentCompany.level || 'C' }}级</span>
                  <span :class="['status-tag', detailStatusClass(currentCompany.status)]">{{ currentCompany.status || '活跃' }}</span>
                </div>
              </div>
            </div>
            <div class="header-right">
              <div class="manager-card">
                <span class="manager-dot" />
                <span class="manager-text">商务负责人</span>
                <span class="manager-name">{{ currentCompany.business_owner_name || '未分配' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-panel total-stats">
            <div class="total-item">
              <div class="total-num blue">{{ currentCompany.total_order_count || 0 }}</div>
              <div class="total-label">累计下单次</div>
            </div>
            <div class="total-item">
              <div class="total-num cyan">{{ currentCompany.total_order_quantity || 0 }}</div>
              <div class="total-label">累计下单量</div>
            </div>
            <div class="total-item">
              <div class="total-num green">¥{{ formatListMoney(currentCompany.total_order_amount_cny) }}</div>
              <div class="total-label">累计金额</div>
            </div>
            <div class="total-item">
              <div class="total-num gray">{{ currentCompany.total_refund_count || 0 }}</div>
              <div class="total-label">累计退单量</div>
            </div>
            <div class="total-item">
              <div class="total-num green">{{ Number(currentCompany.total_refund_rate || 0).toFixed(1) }}%</div>
              <div class="total-label">退单率</div>
            </div>
          </div>

          <div class="mini-grid">
            <div class="detail-panel mini-card">
              <div class="mini-title">公司资金情况</div>
              <div class="mini-kv-row">
                <div class="mini-kv">
                  <div class="mini-label">欠款</div>
                  <div class="mini-value">¥{{ formatListMoney(currentCompany.debt_amount_cny) }}</div>
                </div>
                <div class="mini-kv">
                  <div class="mini-label">溢余</div>
                  <div class="mini-value">¥{{ formatListMoney(currentCompany.prepaid_amount_cny) }}</div>
                </div>
              </div>
            </div>
            <div class="detail-panel mini-card">
              <div class="mini-title">外部买手库</div>
              <div class="mini-value-lg blue">{{ companyBuyerStats.buyer_count }}</div>
              <div class="mini-sub-link">可用买手数 <a @click.prevent="$router.push('/buyers')">查看详情</a></div>
            </div>
            <div class="detail-panel mini-card">
              <div class="mini-title">掉评率</div>
              <div class="mini-value-lg green">{{ companyBuyerStats.drop_rate.toFixed(1) }}%</div>
              <div class="mini-sub-link">近期订单 <a @click="$router.push('/buyers')">评论监控</a></div>
            </div>
          </div>

          <div class="section-title">基本信息</div>
          <div class="detail-panel basic-info">
            <div class="basic-grid">
              <div class="basic-item">
                <div class="basic-label">首次下单时间</div>
                <div class="basic-value">{{ companyFirstOrderDate || '—' }}</div>
              </div>
              <div class="basic-item">
                <div class="basic-label">最近下单时间</div>
                <div class="basic-value">{{ currentCompany.last_order_date || '—' }}</div>
              </div>
              <div class="basic-item">
                <div class="basic-label">来源渠道</div>
                <div class="basic-value">{{ currentCompany.source_channel || '—' }}</div>
              </div>
              <div class="basic-item">
                <div class="basic-label">渠道详情</div>
                <div class="basic-value">{{ sourceDetailText(currentCompany) || '—' }}</div>
              </div>
              <div class="basic-item basic-item-full">
                <div class="basic-label">备注</div>
                <div class="basic-value customer-remark-text">{{ currentCompany.notes || '—' }}</div>
              </div>
            </div>
          </div>

          <div class="operations-info">
            <div class="section-title">运营信息</div>
            <div class="operations-panel">
              <template v-if="operationHasData">
                <div class="dimension-tabs" role="tablist">
                  <button
                    v-for="tab in operationTabs"
                    :key="tab.key"
                    type="button"
                    :class="['dimension-tab', { active: operationDimension === tab.key }]"
                    @click="operationDimension = tab.key"
                  >
                    <span>{{ tab.label }}</span>
                    <span>{{ tab.count }}</span>
                  </button>
                </div>
                <div v-if="operationPreview.length" class="dimension-list">
                  <div v-for="item in operationPreview" :key="item.key" class="dimension-row">
                    <span :class="['row-title', { 'is-code': operationDimension === 'asin' }]">{{ item.title }}</span>
                    <span v-if="item.meta" class="row-meta">{{ item.meta }}</span>
                    <span class="row-count">{{ item.countLabel }}</span>
                  </div>
                </div>
                <div v-else class="dimension-empty">暂无{{ operationActiveLabel }}</div>
                <button v-if="operationActiveItems.length > 4" type="button" class="more-link" @click="openOperationList">
                  展开更多（还有 {{ operationActiveItems.length - 4 }} 条）
                </button>
              </template>
              <div v-else class="operations-empty">
                <InboxOutlined class="empty-icon" />
                <div>暂无数据</div>
              </div>
            </div>
          </div>

          <div class="section-row mt-14">
            <div class="section-title">员工</div>
            <div class="employee-actions">
              <span class="employee-filter-label">仅在职</span>
              <a-switch :checked="!showResignedContacts" size="small" @change="(checked: boolean) => showResignedContacts = !checked" />
              <a-button size="small" type="primary" @click="openAddContact">+ 添加员工</a-button>
            </div>
          </div>
          <div class="detail-panel employee-panel">
            <div v-if="filteredContacts.length" class="employee-list">
              <div v-for="c in filteredContacts" :key="c.id" class="employee-card">
                <div class="employee-avatar">{{ String(c.name || '?').slice(0, 1).toUpperCase() }}</div>
                <div class="employee-main">
                  <div class="employee-top-row">
                    <div class="employee-name-row">
                      <span class="employee-name">{{ c.name }}</span>
                      <span v-if="c.client_id" class="employee-id">ID: {{ c.client_id }}</span>
                      <span :class="['employee-status-tag', c.employment_status === '在职' || !c.employment_status ? 'employee-status-active' : 'employee-status-leave']">
                        {{ c.employment_status || '在职' }}
                      </span>
                    </div>
                    <div class="employee-ops">
                      <a-button type="link" size="small" class="employee-op-btn" @click="openEditContact(c)">编辑</a-button>
                      <a-button
                        v-if="c.employment_status === '在职' || !c.employment_status"
                        type="link"
                        size="small"
                        class="employee-op-btn employee-op-warn"
                        @click="openResignModal(c)"
                      >离职</a-button>
                      <a-popconfirm title="确定删除该员工记录？" @confirm="deleteContact(c)">
                        <a-button type="link" size="small" danger class="employee-op-btn">删除</a-button>
                      </a-popconfirm>
                    </div>
                  </div>
                  <div class="employee-sub-row">
                    <span class="employee-sub-item">联系人</span>
                    <span v-if="c.wechat" class="employee-sub-item wechat">{{ c.wechat }}</span>
                    <span class="employee-sub-item">首次对接时间: {{ contactOrderStats[c.client_id]?.first_order_date || c.join_date || '—' }}</span>
                  </div>
                </div>
              </div>
            </div>
            <span v-else class="address-empty">暂无员工数据</span>
          </div>

          <div class="section-row mt-14">
            <div class="section-title">公司地址</div>
            <a-button type="link" class="edit-link" :loading="addressSaving" @click="addressEditing ? saveAddress() : startAddressEdit()">
              {{ addressEditing ? '保存' : '编辑' }}
            </a-button>
          </div>
          <div class="detail-panel address-panel">
            <a-input
              v-if="addressEditing"
              v-model:value="addressInput"
              class="address-input"
              :maxlength="200"
              placeholder="请输入公司地址，回车保存"
              @pressEnter="saveAddress"
            />
            <span v-else :class="displayAddress === '未录入地址' ? 'address-empty' : 'address-text'">{{ displayAddress }}</span>
          </div>

          <div class="section-row mt-14">
            <div class="section-title">拜访记录</div>
            <div class="visit-actions">
              <a-select
                :value="currentCompany.visit_status || '未接触'"
                size="small"
                class="visit-select"
                @change="(v: string) => updateVisitStatus(v)"
              >
                <a-select-option value="未接触">未接触</a-select-option>
                <a-select-option value="待拜访">待拜访</a-select-option>
                <a-select-option value="已拜访">已拜访</a-select-option>
                <a-select-option value="不接受拜访">不接受拜访</a-select-option>
              </a-select>
              <a-button size="small" type="primary" @click="openAddVisit">+ 记录拜访</a-button>
            </div>
          </div>
          <div class="detail-panel visit-panel">
            <div v-if="visitRecords.length" class="visit-list">
              <div v-for="v in visitRecords" :key="v.id" class="visit-card">
                <div class="visit-card-head">
                  <div class="visit-card-title">
                    <span class="visit-card-date">{{ v.visit_date }}</span>
                    <span class="visit-type-tag">{{ v.visit_type }}</span>
                  </div>
                  <a-button type="link" size="small" class="visit-edit-btn" @click="openEditVisit(v)">编辑</a-button>
                </div>
                <div class="visit-meta-row">
                  <span class="visit-meta-item">拜访人：{{ v.visitor_name || '—' }}</span>
                  <span class="visit-meta-item">对接员工：{{ v.contact_names || '—' }}</span>
                  <span class="visit-meta-item">下次拜访：{{ v.next_visit_date || '—' }}</span>
                </div>
                <div v-if="v.purpose" class="visit-content-row">
                  <span class="visit-content-label">拜访原因</span>
                  <span class="visit-content-text">{{ v.purpose }}</span>
                </div>
                <div v-if="v.summary" class="visit-content-row">
                  <span class="visit-content-label">拜访小结</span>
                  <span class="visit-content-text">{{ v.summary }}</span>
                </div>
              </div>
            </div>
            <span v-else class="address-empty">暂无拜访记录</span>
          </div>
        </div>
      </template>
    </a-drawer>

    <a-modal v-model:open="operationModalOpen" :title="`全部${operationActiveLabel}（${operationActiveItems.length}）`" :footer="null" :width="760">
      <a-input v-model:value="operationKeyword" allow-clear :placeholder="`筛选${operationActiveLabel}`" class="modal-search" />
      <div v-if="operationModalItems.length" class="dimension-list modal-list">
        <div v-for="item in operationModalItems" :key="item.key" class="dimension-row">
          <span :class="['row-title', { 'is-code': operationDimension === 'asin' }]">{{ item.title }}</span>
          <span class="row-count">{{ item.countLabel }}</span>
        </div>
      </div>
      <div v-else class="dimension-empty">暂无{{ operationActiveLabel }}</div>
    </a-modal>

    <!-- 员工详情抽屉 -->
    <a-drawer
      v-model:open="contactDetailOpen"
      :title="null"
      placement="right"
      width="520"
      :body-style="{ padding: 0 }"
    >
      <template v-if="contactDetailTarget">
        <div class="contact-detail-header">
          <div class="contact-detail-avatar" :class="{ 'avatar-resigned': contactDetailTarget.employment_status !== '在职' }">
            {{ contactDetailTarget.name.charAt(0) }}
          </div>
          <div class="contact-detail-title">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span class="contact-detail-name">{{ contactDetailTarget.name }}</span>
              <a-tag :color="employmentStatusColor[contactDetailTarget.employment_status || '在职']" style="margin:0">{{ contactDetailTarget.employment_status || '在职' }}</a-tag>
              <a-tag :color="contactStatusColor[contactDetailTarget.contact_wechat_status || '活跃']" style="margin:0">微信{{ contactDetailTarget.contact_wechat_status || '活跃' }}</a-tag>
            </div>
            <div class="contact-detail-meta">
              <span v-if="contactDetailTarget.role"><TeamOutlined /> {{ contactDetailTarget.role }}</span>
              <span v-if="contactDetailTarget.wechat"><WechatOutlined style="color:#07c160" /> {{ contactDetailTarget.wechat }}</span>
              <span v-if="contactDetailTarget.phone"><PhoneOutlined /> {{ contactDetailTarget.phone }}</span>
            </div>
          </div>
        </div>

        <div class="contact-detail-body">
          <!-- 下单统计 -->
          <div class="cd-section">
            <div class="cd-section-title">下单统计</div>
            <div v-if="contactOrderStats[contactDetailTarget.client_id]" class="contact-order-stats" style="margin:0">
              <div class="cos-item">
                <span class="cos-num blue">{{ contactOrderStats[contactDetailTarget.client_id].order_count }}</span>
                <span class="cos-lbl">下单次数</span>
              </div>
              <div class="cos-sep"></div>
              <div class="cos-item">
                <span class="cos-num teal">{{ contactOrderStats[contactDetailTarget.client_id].order_quantity }}</span>
                <span class="cos-lbl">下单单量</span>
              </div>
              <div class="cos-sep"></div>
              <div class="cos-item">
                <span class="cos-num green">¥{{ formatMoney(contactOrderStats[contactDetailTarget.client_id].order_amount) }}</span>
                <span class="cos-lbl">下单金额</span>
              </div>
              <div class="cos-sep"></div>
              <div class="cos-item">
                <span class="cos-num gray">{{ contactOrderStats[contactDetailTarget.client_id].first_order_date || '—' }}</span>
                <span class="cos-lbl">首次下单</span>
              </div>
            </div>
            <div v-else class="empty-val">暂无下单记录</div>
          </div>

          <!-- 负责店铺/ASIN/品牌/类目 -->
          <div class="cd-section">
            <div class="cd-section-title">负责范围</div>
            <div v-if="contactDetailStores.length" class="cd-store-list">
              <div v-for="store in contactDetailStores" :key="store.id" class="cd-store-card">
                <div class="cd-store-header">
                  <div class="cd-store-icon"><ShopOutlined /></div>
                  <div>
                    <div class="cd-store-name">{{ store.store_name }}</div>
                    <div class="cd-store-meta">
                      <span v-if="store.platform">{{ store.platform }}</span>
                      <span v-if="store.country">· {{ store.country }}</span>
                    </div>
                  </div>
                  <a-tag :color="store.status === '活跃' ? 'green' : 'default'" style="margin-left:auto;font-size:10px">{{ store.status }}</a-tag>
                </div>
                <div v-if="(contactDetailAsinMap[store.id] || []).length" class="cd-asin-list">
                  <div v-for="asin in contactDetailAsinMap[store.id]" :key="asin.id" class="cd-asin-row">
                    <span class="cd-asin-code">{{ asin.asin }}</span>
                    <span v-if="asin.brand_name" class="cd-asin-brand">{{ asin.brand_name }}</span>
                    <span v-if="asin.category" class="cd-asin-cat">{{ asin.category }}</span>
                    <span v-if="asin.product_name" class="cd-asin-pname">{{ asin.product_name }}</span>
                  </div>
                </div>
                <div v-else class="cd-asin-empty">暂无ASIN</div>
              </div>
            </div>
            <div v-else-if="contactDetailTarget.responsible_stores?.length || contactDetailTarget.responsible_brands?.length" class="cd-scope-tags">
              <a-tag v-for="s in contactDetailTarget.responsible_stores" :key="s" color="blue">{{ s }}</a-tag>
              <a-tag v-for="b in contactDetailTarget.responsible_brands" :key="b" color="geekblue">{{ b }}</a-tag>
            </div>
            <div v-else class="empty-val">未设置负责店铺/品牌</div>
          </div>

          <!-- 下单记录 -->
          <div class="cd-section">
            <div class="cd-section-title">下单记录</div>
            <div v-if="contactDetailOrdersLoading" style="text-align:center;padding:16px"><a-spin size="small" /></div>
            <div v-else-if="!contactDetailOrders.length" class="empty-val">暂无下单记录</div>
            <div v-else class="cd-order-list">
              <div v-for="o in contactDetailOrders" :key="o.id" class="cd-order-row">
                <div class="cd-order-left">
                  <div class="cd-order-num">{{ o.order_number }}</div>
                  <div class="cd-order-info">
                    <span v-if="o.store_name">{{ o.store_name }}</span>
                    <span v-if="o.asin" class="cd-order-asin">{{ o.asin }}</span>
                    <span v-if="o.brand_name">{{ o.brand_name }}</span>
                  </div>
                </div>
                <div class="cd-order-right">
                  <div class="cd-order-qty">×{{ o.total_orders || 0 }}</div>
                  <div class="cd-order-amt">¥{{ formatMoney(o.total_amount) }}</div>
                  <div class="cd-order-date">{{ o.created_at ? o.created_at.slice(0, 10) : '' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </a-drawer>

    <!-- 分配商务经理 Modal -->
    <a-modal
      v-model:open="assignModalOpen"
      title="选择商务负责人"
      :confirm-loading="assigning"
      ok-text="确定"
      cancel-text="取消"
      @ok="handleAssignManager"
    >
      <div class="assign-manager-customer">客户：{{ assignTarget?.company_name }}</div>
      <a-form layout="vertical">
        <a-form-item label="商务负责人">
          <a-select
            v-model:value="assignManagerId"
            :options="managerOptions.map(m => ({ value: m.id, label: m.name }))"
            placeholder="请选择商务负责人"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="选择对接微信名称（可选）">
          <a-select
            v-model:value="assignWechatId"
            placeholder="请选择微信名称"
            allow-clear
            :disabled="!assignManagerId"
          >
            <a-select-option v-for="w in managerWechatOptions" :key="w.id" :value="w.id">
              {{ w.wechat_id }}{{ w.wechat_nickname ? `（${w.wechat_nickname}）` : '' }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 添加/编辑员工 Modal -->
    <a-modal
      v-model:open="contactModalOpen"
      :title="editingContactId ? '编辑员工' : '添加员工'"
      @ok="handleAddContact"
      :confirm-loading="savingContact"
      ok-text="保存"
      cancel-text="取消"
      width="640px"
    >
      <div class="commissioner-form-grid">
        <div class="commissioner-field">
          <div class="commissioner-label commissioner-label-required">姓名</div>
          <a-input v-model:value="contactForm.name" :maxlength="30" placeholder="员工姓名" />
        </div>
        <div class="commissioner-field">
          <div class="commissioner-label">手机</div>
          <a-input v-model:value="contactForm.phone" :maxlength="20" placeholder="请输入手机号" />
        </div>
        <div class="commissioner-field">
          <div class="commissioner-label">微信号</div>
          <a-input v-model:value="contactForm.wechat" :maxlength="40" placeholder="员工本人微信号" />
        </div>
        <div class="commissioner-field">
          <div class="commissioner-label">对接状态</div>
          <a-select v-model:value="contactForm.contact_wechat_status">
            <a-select-option value="活跃">活跃</a-select-option>
            <a-select-option value="沉默">沉默</a-select-option>
            <a-select-option value="流失">流失</a-select-option>
          </a-select>
        </div>
        <div class="commissioner-field">
          <div class="commissioner-label">对接日期</div>
          <a-date-picker v-model:value="contactForm.join_date" style="width:100%" placeholder="选择日期" />
        </div>
      </div>
    </a-modal>

    <!-- 离职转交 Modal -->
    <a-modal
      v-model:open="resignModalOpen"
      title="员工离职 — 转交店铺/品牌"
      @ok="handleResign"
      :confirm-loading="resigning"
      ok-text="确认离职并转交"
      cancel-text="取消"
      width="540px"
    >
      <div v-if="resignTarget" style="padding:8px 0">
        <div class="resign-employee-info">
          <div class="resign-avatar">{{ (resignTarget.name || '?').charAt(0) }}</div>
          <div>
            <div style="font-weight:700;font-size:15px">{{ resignTarget.name }}</div>
            <div style="font-size:12px;color:#6b7280">{{ resignTarget.role }}</div>
          </div>
        </div>

        <div v-if="resignTarget.responsible_stores?.length || resignTarget.responsible_brands?.length" class="resign-scope-box">
          <div class="resign-scope-label">该员工负责的范围（将转交给新对接人）</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
            <a-tag v-for="s in resignTarget.responsible_stores" :key="s" color="blue">{{ s }}</a-tag>
            <a-tag v-for="b in resignTarget.responsible_brands" :key="b" color="geekblue">{{ b }}</a-tag>
          </div>
        </div>
        <div v-else class="resign-scope-box" style="color:#9ca3af">该员工未设置负责店铺/品牌</div>

        <a-divider style="margin:14px 0" />

        <div style="margin-bottom:8px;font-size:13px;font-weight:600;color:#374151">选择新对接人（接手店铺/品牌）</div>
        <a-select
          v-model:value="resignNewContactId"
          placeholder="选择本公司其他在职员工（可不选）"
          style="width:100%"
          allow-clear
        >
          <a-select-option
            v-for="c in currentCompany?.client_contacts?.filter((c: any) => c.id !== resignTarget.id && c.employment_status !== '离职')"
            :key="c.id"
            :value="c.id"
          >
            {{ c.name }}{{ c.role ? `（${c.role}）` : '' }}
          </a-select-option>
        </a-select>

        <div style="margin-top:12px;font-size:13px;font-weight:600;color:#374151">离职日期</div>
        <a-date-picker v-model:value="resignDate" style="width:100%;margin-top:6px" placeholder="选择离职日期" />
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, DeleteOutlined, UserOutlined, WechatOutlined, PhoneOutlined, TeamOutlined, EditOutlined, ShopOutlined, InboxOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'
import dayjs, { type Dayjs } from 'dayjs'

const loading = ref(false)
const clients = ref<any[]>([])
const searchText = ref('')
const storeKeyword = ref('')
const contactKeyword = ref('')
const filterLevel = ref('')
const filterStatus = ref('')
const customerHoverBorderColor = '#2563eb'
const addressEditing = ref(false)
const addressSaving = ref(false)
const addressInput = ref('')
const operationDimension = ref<'asin' | 'store' | 'brand'>('asin')
const operationModalOpen = ref(false)
const operationKeyword = ref('')
const editingVisitId = ref('')
const modalOpen = ref(false)
const detailOpen = ref(false)
const contactModalOpen = ref(false)
const submitting = ref(false)
const savingContact = ref(false)
const editingId = ref('')
const editingContactId = ref('')
const currentCompany = ref<any>(null)
const showResignedContacts = ref(false)
const pagination = ref({ current: 1, pageSize: 15, total: 0 })

const resignModalOpen = ref(false)
const resigning = ref(false)
const resignTarget = ref<any>(null)
const resignNewContactId = ref<string>('')
const resignDate = ref<Dayjs | null>(null)

const visitModalOpen = ref(false)
const savingVisit = ref(false)
const visitRecords = ref<any[]>([])

const storeInputVal = ref('')
const brandInputVal = ref('')

const managerOptions = ref<any[]>([])
const wechatOptions = ref<any[]>([])

const assignModalOpen = ref(false)
const assigning = ref(false)
const assignTarget = ref<any>(null)
const assignManagerId = ref<string>('')
const assignWechatId = ref<string>('')

const managerWechatOptions = computed(() => {
  if (!assignManagerId.value) return []
  return wechatOptions.value.filter(w => w.manager_id === assignManagerId.value)
})

const levelColor: Record<string, string> = { S: 'gold', A: 'green', B: 'blue', C: 'default' }
const levelBg: Record<string, string> = { S: '#d97706', A: '#059669', B: '#2563eb', C: '#6b7280' }
const statusColor: Record<string, string> = { 活跃: 'green', 暂停: 'orange', 流失: 'red' }
const contactStatusColor: Record<string, string> = { 活跃: 'green', 沉默: 'orange', 流失: 'red' }
const employmentStatusColor: Record<string, string> = { 在职: 'green', 离职: 'default', 停止合作: 'red' }
const visitStatusColor: Record<string, string> = { 未接触: 'default', 待拜访: 'orange', 已拜访: 'green', 不接受拜访: 'red' }

const defaultVisitForm = () => ({
  visit_date: dayjs() as Dayjs | null,
  visit_type: '上门拜访',
  visitor_name: '',
  contact_names: '',
  purpose: '',
  summary: '',
  next_visit_date: null as Dayjs | null,
})
const visitForm = reactive(defaultVisitForm())

const filteredContacts = computed(() => {
  if (!currentCompany.value?.client_contacts) return []
  if (showResignedContacts.value) return currentCompany.value.client_contacts
  return currentCompany.value.client_contacts.filter((c: any) => c.employment_status !== '离职' && c.employment_status !== '停止合作')
})

function formatMoney(val: any) {
  const n = Number(val || 0)
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
  return n.toFixed(0)
}

function formatListMoney(val: any) {
  const amount = Number(val || 0)
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
}

function companyBalance(company: any) {
  return Number(company?.prepaid_amount_cny || 0) - Number(company?.debt_amount_cny || 0)
}

function sourceDetailText(company: any) {
  return company?.source_referrer || company?.source_exhibition || company?.source_channel_name || ''
}

function groupNameList(company: any) {
  const raw = company?.group_names
  if (!Array.isArray(raw)) return []
  return raw.map((item: any) => String(item || '').trim()).filter(Boolean)
}

function customerLevelClass(level?: string) {
  if (level === 'S' || level === 'A') return 'customer-level1'
  if (level === 'B') return 'customer-level2'
  return 'customer-level3'
}

function detailLevelClass(level?: string) {
  if (level === 'S' || level === 'A') return 'level-a'
  if (level === 'B') return 'level-b'
  return 'level-c'
}

function detailStatusClass(status?: string) {
  return status === '活跃' ? 'status-active' : 'status-inactive'
}

const visibleClients = computed(() => {
  const storeQ = storeKeyword.value.trim().toLowerCase()
  const contactQ = contactKeyword.value.trim().toLowerCase()
  return clients.value.filter((company: any) => {
    if (storeQ) {
      const stores = (company.client_stores_summary || []).map((item: any) => `${item.store_name || ''} ${(item.brands || []).join(' ')} ${(item.asins || []).join(' ')}`).join(' ')
      const blob = `${stores} ${(company.brand_names || []).join(' ')} ${(company.client_asins || []).join(' ')}`.toLowerCase()
      if (!blob.includes(storeQ)) return false
    }
    if (contactQ) {
      const contacts = (company.client_contacts || []).map((item: any) => `${item.name || ''} ${item.wechat || ''} ${item.phone || ''} ${item.email || ''}`).join(' ')
      const blob = `${contacts} ${company.business_wechat_name || ''} ${company.contact_name || ''} ${company.contact_wechat || ''}`.toLowerCase()
      if (!blob.includes(contactQ)) return false
    }
    return true
  })
})

const businessWechatSelectOptions = computed(() => wechatOptions.value.map((item: any) => ({
  value: item.wechat_id,
  label: item.wechat_nickname ? `${item.wechat_id} (${item.wechat_nickname})` : item.wechat_id,
})))

const displayAddress = computed(() => {
  const company = currentCompany.value
  if (!company) return '未录入地址'
  const text = [company.address_country, company.address_province, company.address_city, company.address_detail].filter(Boolean).join(' · ')
  return text || '未录入地址'
})

const operationGroups = computed(() => {
  const company = currentCompany.value
  const stores = company?.client_stores_summary || []
  const asinMap = new Map<string, Set<string>>()
  const brandMap = new Map<string, Set<string>>()
  for (const store of stores) {
    for (const asin of store.asins || []) {
      if (!asinMap.has(asin)) asinMap.set(asin, new Set())
      asinMap.get(asin)!.add(store.store_name)
    }
    for (const brand of store.brands || []) {
      const name = String(brand)
      if (!brandMap.has(name)) brandMap.set(name, new Set())
      for (const asin of store.asins || []) brandMap.get(name)!.add(asin)
    }
  }
  if (!stores.length) {
    for (const asin of company?.client_asins || []) asinMap.set(String(asin), new Set())
    for (const brand of company?.brand_names || []) brandMap.set(String(brand), new Set())
  }
  return {
    asin: [...asinMap.entries()].map(([title, names]) => ({ key: `asin-${title}`, title, meta: '', countLabel: names.size ? `${names.size} 个店铺` : '—' })),
    store: stores.map((store: any) => ({ key: `store-${store.id}`, title: store.store_name, meta: '', countLabel: `${store.asin_count || 0} 个ASIN` })),
    brand: [...brandMap.entries()].map(([title, names]) => ({ key: `brand-${title}`, title, meta: '', countLabel: names.size ? `${names.size} 个ASIN` : '—' })),
  }
})
const operationTabs = computed(() => [
  { key: 'asin' as const, label: 'ASIN', count: operationGroups.value.asin.length },
  { key: 'store' as const, label: '店铺', count: operationGroups.value.store.length },
  { key: 'brand' as const, label: '品牌', count: operationGroups.value.brand.length },
])
const operationHasData = computed(() => operationTabs.value.some(tab => tab.count > 0))
const operationActiveItems = computed(() => operationGroups.value[operationDimension.value])
const operationPreview = computed(() => operationActiveItems.value.slice(0, 4))
const operationActiveLabel = computed(() => operationTabs.value.find(tab => tab.key === operationDimension.value)?.label || '')
const operationModalItems = computed(() => {
  const keyword = operationKeyword.value.trim().toLowerCase()
  const rows = operationGroups.value[operationDimension.value]
  return keyword ? rows.filter((item: { title: string }) => item.title.toLowerCase().includes(keyword)) : rows
})
function openOperationList() {
  operationKeyword.value = ''
  operationModalOpen.value = true
}

function handleSearch() {
  pagination.value.current = 1
  load()
}

function startAddressEdit() {
  if (!currentCompany.value) return
  addressInput.value = displayAddress.value === '未录入地址' ? '' : displayAddress.value
  addressEditing.value = true
}

async function saveAddress() {
  if (!currentCompany.value) return
  addressSaving.value = true
  try {
    const payload = {
      address_country: '',
      address_province: '',
      address_city: '',
      address_detail: addressInput.value.trim(),
    }
    const { error } = await supabase.from('client_companies').update(payload).eq('id', currentCompany.value.id)
    if (error) throw error
    Object.assign(currentCompany.value, payload)
    addressEditing.value = false
    message.success('地址已保存')
    load()
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    addressSaving.value = false
  }
}

const sourceChannelOptions = [
  { value: '老客介绍', label: '老客介绍', icon: '🤝' },
  { value: '展会', label: '展会添加', icon: '🏛️' },
  { value: '渠道推荐', label: '渠道推荐', icon: '📢' },
  { value: '其他', label: '其他', icon: '📝' },
]

const defaultForm = () => ({
  company_name: '',
  country: '',
  level: 'B',
  status: '活跃',
  brand_names: [] as string[],
  client_asins: [] as string[],
  notes: '',
  address_country: '',
  address_province: '',
  address_city: '',
  address_detail: '',
  visit_status: '未接触',
  debt_amount_cny: 0,
  prepaid_amount_cny: 0,
  source_channel: '',
  source_referrer: '',
  source_exhibition: '',
  source_channel_name: '',
  contact_name: '',
  contact_wechat: '',
  feedback_type: '私聊',
  business_wechat_name: '',
  group_names: [''],
})
const form = reactive(defaultForm())

const sourceDetailLabel = computed(() => {
  if (form.source_channel === '展会') return '展会名称'
  if (form.source_channel === '渠道推荐') return '渠道名称'
  return '介绍人（老客名称）'
})

const sourceDetailPlaceholder = computed(() => {
  if (form.source_channel === '展会') return '如：广交会2024、亚马逊峰会'
  if (form.source_channel === '渠道推荐') return '填写是哪个渠道推荐的'
  return '填写是哪位老客户介绍的'
})

const sourceDetailValue = computed({
  get() {
    if (form.source_channel === '展会') return form.source_exhibition
    if (form.source_channel === '渠道推荐') return form.source_channel_name
    return form.source_referrer
  },
  set(value: string) {
    if (form.source_channel === '展会') form.source_exhibition = value
    else if (form.source_channel === '渠道推荐') form.source_channel_name = value
    else form.source_referrer = value
  },
})

function selectSourceChannel(value: string) {
  form.source_channel = value
  form.source_referrer = ''
  form.source_exhibition = ''
  form.source_channel_name = ''
}

function onFeedbackTypeChange(val: string) {
  if (val === '群聊') {
    if (!form.group_names.length) form.group_names = ['']
  } else {
    form.group_names = ['']
  }
}

function addGroupName() {
  form.group_names.push('')
}

function removeGroupName(idx: number) {
  if (form.group_names.length <= 1) {
    form.group_names[0] = ''
    return
  }
  form.group_names.splice(idx, 1)
}

function normalizedGroupNames() {
  if (form.feedback_type !== '群聊') return [] as string[]
  return form.group_names.map((n) => n.trim()).filter(Boolean)
}

const defaultContactForm = () => ({
  name: '',
  role: '联系人',
  phone: '',
  wechat: '',
  is_primary: false,
  contact_wechat_status: '活跃',
  debt_amount_cny: 0,
  prepaid_amount_cny: 0,
  notes: '',
  employment_status: '在职',
  responsible_stores: [] as string[],
  responsible_brands: [] as string[],
  join_date: null as Dayjs | null,
  resigned_at: null as Dayjs | null,
})
const contactForm = reactive(defaultContactForm())

async function loadManagerOptions() {
  const { data } = await supabase
    .from('business_managers')
    .select('id, name')
    .eq('status', '在职')
    .order('name')
  managerOptions.value = data || []

  const { data: wdata } = await supabase
    .from('business_wechat_accounts')
    .select('id, wechat_id, wechat_nickname, manager_id, status')
    .eq('status', '在用')
  wechatOptions.value = wdata || []
}

async function load() {
  loading.value = true
  try {
    let query = supabase
      .from('client_companies')
      .select('*, client_contacts(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (searchText.value) {
      const keyword = searchText.value.replace(/,/g, ' ')
      query = query.or(`company_name.ilike.%${keyword}%,org_id.ilike.%${keyword}%`)
    }
    if (filterLevel.value) query = query.eq('level', filterLevel.value)
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)
    const { data, count, error } = await query
    if (error) throw error
    const companies = data || []

    if (companies.length) {
      const companyIds = companies.map((c: any) => c.id)
      const { data: storeData } = await supabase
        .from('client_stores')
        .select('id, company_id, store_name, status')
        .in('company_id', companyIds)
        .eq('status', '活跃')
      const { data: asinData } = await supabase
        .from('client_store_asins')
        .select('store_id, asin, brand_name, category')
        .in('store_id', (storeData || []).map((s: any) => s.id))
      const asinByStore: Record<string, any[]> = {}
      for (const a of asinData || []) {
        if (!asinByStore[a.store_id]) asinByStore[a.store_id] = []
        asinByStore[a.store_id].push(a)
      }
      const storeSummaryByCompany: Record<string, any[]> = {}
      for (const s of storeData || []) {
        if (!storeSummaryByCompany[s.company_id]) storeSummaryByCompany[s.company_id] = []
        const asins = asinByStore[s.id] || []
        const brands = [...new Set(asins.map((a: any) => a.brand_name).filter(Boolean))]
        const categories = [...new Set(asins.map((a: any) => a.category).filter(Boolean))]
        storeSummaryByCompany[s.company_id].push({
          id: s.id,
          store_name: s.store_name,
          asin_count: asins.length,
          brands,
          categories,
          asins: asins.map((a: any) => a.asin),
        })
      }
      for (const c of companies) {
        c.client_stores_summary = storeSummaryByCompany[c.id] || []
        const allAsins = (c.client_stores_summary as any[]).flatMap((s: any) => s.asins)
        if (allAsins.length > 0) c.client_asins = [...new Set(allAsins)]
      }
    }

    clients.value = companies
    pagination.value.total = count || 0
    if (currentCompany.value) {
      currentCompany.value = clients.value.find(c => c.id === currentCompany.value.id) || currentCompany.value
    }
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  editingId.value = ''
  Object.assign(form, defaultForm())
  modalOpen.value = true
}

function openEditModal(record: any) {
  editingId.value = record.id
  Object.assign(form, {
    ...defaultForm(),
    ...record,
    brand_names: record.brand_names || [],
    client_asins: record.client_asins || [],
    address_country: record.address_country || '',
    address_province: record.address_province || '',
    address_city: record.address_city || '',
    address_detail: record.address_detail || '',
    visit_status: record.visit_status || '未接触',
    debt_amount_cny: record.debt_amount_cny || 0,
    prepaid_amount_cny: record.prepaid_amount_cny || 0,
    source_channel: record.source_channel || '',
    source_referrer: record.source_referrer || '',
    source_exhibition: record.source_exhibition || '',
    source_channel_name: record.source_channel_name || '',
    contact_name: record.contact_name || '',
    contact_wechat: record.contact_wechat || '',
    feedback_type: record.feedback_type || '私聊',
    business_wechat_name: record.business_wechat_name || '',
    group_names: (record.group_names?.length ? [...record.group_names] : ['']),
  })
  modalOpen.value = true
}

function openDetail(record: any) {
  currentCompany.value = record
  addressEditing.value = false
  operationDimension.value = 'asin'
  operationModalOpen.value = false
  detailOpen.value = true
  loadVisitRecords(record.id)
  loadContactOrderStats(record)
}

const contactOrderStats = ref<Record<string, { order_count: number; order_quantity: number; order_amount: number; first_order_date: string | null }>>({})
const companyBuyerStats = ref({ buyer_count: 0, drop_rate: 0 })
const companyFirstOrderDate = ref<string | null>(null)

const contactDetailOpen = ref(false)
const contactDetailTarget = ref<any>(null)
const contactDetailStores = ref<any[]>([])
const contactDetailAsinMap = ref<Record<string, any[]>>({})
const contactDetailOrders = ref<any[]>([])
const contactDetailOrdersLoading = ref(false)

async function openContactDetail(contact: any) {
  contactDetailTarget.value = contact
  contactDetailOpen.value = true
  contactDetailStores.value = []
  contactDetailAsinMap.value = {}
  contactDetailOrders.value = []
  contactDetailOrdersLoading.value = true

  try {
    const storeNames = contact.responsible_stores || []
    const companyId = currentCompany.value?.id

    const [storeRes, orderRes] = await Promise.all([
      companyId && storeNames.length
        ? supabase.from('client_stores').select('*').eq('company_id', companyId).in('store_name', storeNames)
        : Promise.resolve({ data: [] }),
      contact.client_id
        ? supabase.from('erp_orders').select('id, order_number, asin, store_name, brand_name, total_orders, total_amount, created_at').eq('customer_id_str', contact.client_id).order('created_at', { ascending: false }).limit(50)
        : Promise.resolve({ data: [] }),
    ])

    const stores = storeRes.data || []
    contactDetailStores.value = stores

    if (stores.length) {
      const storeIds = stores.map((s: any) => s.id)
      const { data: asinData } = await supabase.from('client_store_asins').select('*').in('store_id', storeIds)
      const map: Record<string, any[]> = {}
      for (const a of asinData || []) {
        if (!map[a.store_id]) map[a.store_id] = []
        map[a.store_id].push(a)
      }
      contactDetailAsinMap.value = map
    }

    contactDetailOrders.value = orderRes.data || []
  } finally {
    contactDetailOrdersLoading.value = false
  }
}

async function loadContactOrderStats(company: any) {
  const contacts = company.client_contacts || []
  contactOrderStats.value = {}
  companyFirstOrderDate.value = null
  companyBuyerStats.value = { buyer_count: 0, drop_rate: 0 }

  if (!contacts.length) return
  const clientIdStrs = contacts.map((c: any) => c.client_id).filter(Boolean)
  if (!clientIdStrs.length) return

  const [{ data: orderData }, { data: subOrderData }, buyerCountResult] = await Promise.all([
    supabase.from('erp_orders').select('customer_id_str, total_orders, total_amount, created_at, id').in('customer_id_str', clientIdStrs),
    supabase.from('sub_orders').select('order_id, refund_status, status').eq('status', '已完成'),
    supabase.from('erp_buyers').select('*', { count: 'exact', head: true }).eq('status', '活跃'),
  ])

  const map: Record<string, { order_count: number; order_quantity: number; order_amount: number; first_order_date: string | null }> = {}
  const orderIds: string[] = []
  for (const row of orderData || []) {
    const key = row.customer_id_str
    if (!map[key]) map[key] = { order_count: 0, order_quantity: 0, order_amount: 0, first_order_date: null }
    map[key].order_count += 1
    map[key].order_quantity += Number(row.total_orders || 0)
    map[key].order_amount += Number(row.total_amount || 0)
    const d = row.created_at ? row.created_at.slice(0, 10) : null
    if (d && (!map[key].first_order_date || d < map[key].first_order_date!)) {
      map[key].first_order_date = d
    }
    orderIds.push(row.id)
  }
  contactOrderStats.value = map

  const allDates = Object.values(map).map(v => v.first_order_date).filter(Boolean) as string[]
  companyFirstOrderDate.value = allDates.length ? allDates.sort()[0] : null

  const totalOrderCount = Object.values(map).reduce((s, v) => s + v.order_count, 0)
  const totalOrderQty = Object.values(map).reduce((s, v) => s + v.order_quantity, 0)
  const totalOrderAmt = Object.values(map).reduce((s, v) => s + v.order_amount, 0)
  if (currentCompany.value?.id === company.id) {
    currentCompany.value = {
      ...currentCompany.value,
      total_order_count: totalOrderCount,
      total_order_quantity: totalOrderQty,
      total_order_amount_cny: totalOrderAmt,
    }
  }

  const relevantSubs = (subOrderData || []).filter(s => orderIds.includes(s.order_id))
  const totalCompleted = relevantSubs.length
  const refunded = relevantSubs.filter(s => s.refund_status === '已退款').length
  const dropRate = totalCompleted > 0 ? (refunded / totalCompleted) * 100 : 0

  if (currentCompany.value?.id === company.id) {
    currentCompany.value = {
      ...currentCompany.value,
      total_refund_count: refunded,
      total_refund_rate: dropRate,
    }
  }

  companyBuyerStats.value = {
    buyer_count: buyerCountResult.count ?? 0,
    drop_rate: dropRate,
  }
}

async function loadVisitRecords(companyId: string) {
  const { data } = await supabase
    .from('client_visit_records')
    .select('*')
    .eq('company_id', companyId)
    .order('visit_date', { ascending: false })
  visitRecords.value = data || []
}

function openAddVisit() {
  editingVisitId.value = ''
  Object.assign(visitForm, defaultVisitForm())
  visitModalOpen.value = true
}

function openEditVisit(record: any) {
  editingVisitId.value = record.id
  Object.assign(visitForm, {
    visit_date: record.visit_date ? dayjs(record.visit_date) : null,
    visit_type: record.visit_type || '上门拜访',
    visitor_name: record.visitor_name || '',
    contact_names: record.contact_names || '',
    purpose: record.purpose || '',
    summary: record.summary || '',
    next_visit_date: record.next_visit_date ? dayjs(record.next_visit_date) : null,
  })
  visitModalOpen.value = true
}

async function handleAddVisit() {
  if (!visitForm.visit_date) { message.warning('请选择拜访日期'); return }
  if (!visitForm.visitor_name.trim()) { message.warning('请填写拜访人'); return }
  if (!currentCompany.value) return
  savingVisit.value = true
  try {
    const payload = {
      company_id: currentCompany.value.id,
      visit_date: visitForm.visit_date.format('YYYY-MM-DD'),
      visit_type: visitForm.visit_type,
      visitor_name: visitForm.visitor_name,
      contact_names: visitForm.contact_names,
      purpose: visitForm.purpose,
      summary: visitForm.summary,
      next_visit_date: visitForm.next_visit_date ? visitForm.next_visit_date.format('YYYY-MM-DD') : null,
    }
    const query = editingVisitId.value
      ? supabase.from('client_visit_records').update(payload).eq('id', editingVisitId.value)
      : supabase.from('client_visit_records').insert([payload])
    const { error } = await query
    if (error) throw error
    await supabase.from('client_companies').update({ visit_status: '已拜访' }).eq('id', currentCompany.value.id)
    message.success(editingVisitId.value ? '拜访记录已更新' : '拜访记录已保存')
    editingVisitId.value = ''
    visitModalOpen.value = false
    loadVisitRecords(currentCompany.value.id)
    load()
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    savingVisit.value = false
  }
}

async function deleteVisit(id: string) {
  const { error } = await supabase.from('client_visit_records').delete().eq('id', id)
  if (error) { message.error('删除失败'); return }
  message.success('已删除')
  if (currentCompany.value) loadVisitRecords(currentCompany.value.id)
}

async function updateVisitStatus(status: string) {
  if (!currentCompany.value) return
  const { error } = await supabase.from('client_companies').update({ visit_status: status }).eq('id', currentCompany.value.id)
  if (error) { message.error('更新失败'); return }
  currentCompany.value.visit_status = status
  load()
}

async function handleSubmit() {
  if (!form.company_name.trim()) { message.warning('请输入公司名称'); return }
  submitting.value = true
  try {
    const payload: any = {
      company_name: form.company_name.trim(),
      country: form.country,
      level: form.level,
      status: form.status,
      brand_names: form.brand_names,
      client_asins: form.client_asins,
      notes: form.notes,
      address_country: form.address_country,
      address_province: form.address_province,
      address_city: form.address_city,
      address_detail: form.address_detail,
      visit_status: form.visit_status,
      debt_amount_cny: form.debt_amount_cny || 0,
      prepaid_amount_cny: form.prepaid_amount_cny || 0,
      source_channel: form.source_channel,
      source_referrer: form.source_referrer,
      source_exhibition: form.source_exhibition,
      source_channel_name: form.source_channel_name,
      contact_name: form.contact_name,
      contact_wechat: form.contact_wechat,
      business_wechat_name: form.business_wechat_name || '',
      feedback_type: form.feedback_type || '私聊',
      group_names: normalizedGroupNames(),
    }
    if (editingId.value) {
      const { error } = await supabase.from('client_companies').update(payload).eq('id', editingId.value)
      if (error) throw error
      message.success('更新成功')
    } else {
      payload.org_id = 'ORG-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      const { error } = await supabase.from('client_companies').insert([payload])
      if (error) throw error
      message.success('添加成功')
    }
    modalOpen.value = false
    load()
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

async function deleteClient(id: string) {
  const { error } = await supabase.from('client_companies').delete().eq('id', id)
  if (error) { message.error('删除失败'); return }
  message.success('删除成功')
  load()
}

function openAssignManager(company: any) {
  assignTarget.value = company
  assignManagerId.value = company.business_owner_id || ''
  assignWechatId.value = ''
  assignModalOpen.value = true
}

async function handleAssignManager() {
  if (!assignTarget.value) return
  assigning.value = true
  try {
    const mgr = managerOptions.value.find(m => m.id === assignManagerId.value)
    const wSelected = assignWechatId.value ? wechatOptions.value.find(x => x.id === assignWechatId.value) : null
    const payload: any = {
      business_owner_id: assignManagerId.value || null,
      business_owner_name: mgr?.name || null,
      business_wechat_name: wSelected?.wechat_id || '',
    }
    const { error } = await supabase
      .from('client_companies')
      .update(payload)
      .eq('id', assignTarget.value.id)
    if (error) throw error

    if (assignWechatId.value) {
      const w = wSelected
      await supabase
        .from('client_contacts')
        .update({
          business_manager_id: assignManagerId.value || null,
          business_manager_name: mgr?.name || '',
          wechat_account_id: assignWechatId.value || null,
          wechat_account_id_str: w?.wechat_id || '',
          wechat_nickname: w?.wechat_nickname || '',
        })
        .eq('company_id', assignTarget.value.id)
        .eq('is_primary', true)
    }

    message.success('商务经理已分配')
    assignModalOpen.value = false
    load()
  } catch (e: any) {
    message.error('分配失败：' + e.message)
  } finally {
    assigning.value = false
  }
}

function addStore() {
  const v = storeInputVal.value.trim()
  if (v && !contactForm.responsible_stores.includes(v)) {
    contactForm.responsible_stores.push(v)
  }
  storeInputVal.value = ''
}

function addBrand() {
  const v = brandInputVal.value.trim()
  if (v && !contactForm.responsible_brands.includes(v)) {
    contactForm.responsible_brands.push(v)
  }
  brandInputVal.value = ''
}

function openAddContact() {
  editingContactId.value = ''
  storeInputVal.value = ''
  brandInputVal.value = ''
  Object.assign(contactForm, defaultContactForm())
  contactModalOpen.value = true
}

function openEditContact(contact: any) {
  editingContactId.value = contact.id
  storeInputVal.value = ''
  brandInputVal.value = ''
  Object.assign(contactForm, {
    ...defaultContactForm(),
    name: contact.name || '',
    role: contact.role || '联系人',
    phone: contact.phone || '',
    wechat: contact.wechat || '',
    is_primary: contact.is_primary || false,
    contact_wechat_status: contact.contact_wechat_status || '活跃',
    debt_amount_cny: contact.debt_amount_cny || 0,
    prepaid_amount_cny: contact.prepaid_amount_cny || 0,
    notes: contact.notes || '',
    employment_status: contact.employment_status || '在职',
    responsible_stores: contact.responsible_stores || [],
    responsible_brands: contact.responsible_brands || [],
    join_date: contact.join_date ? dayjs(contact.join_date) : null,
    resigned_at: contact.resigned_at ? dayjs(contact.resigned_at) : null,
  })
  contactModalOpen.value = true
}

async function handleAddContact() {
  if (!contactForm.name.trim()) { message.warning('请输入姓名'); return }
  if (!currentCompany.value) return
  savingContact.value = true
  try {
    if (storeInputVal.value.trim()) addStore()
    if (brandInputVal.value.trim()) addBrand()
    const payload: any = {
      company_id: currentCompany.value.id,
      name: contactForm.name,
      role: contactForm.role,
      phone: contactForm.phone,
      wechat: contactForm.wechat,
      is_primary: contactForm.is_primary,
      contact_wechat_status: contactForm.contact_wechat_status,
      debt_amount_cny: contactForm.debt_amount_cny || 0,
      prepaid_amount_cny: contactForm.prepaid_amount_cny || 0,
      notes: contactForm.notes,
      employment_status: contactForm.employment_status,
      responsible_stores: contactForm.responsible_stores,
      responsible_brands: contactForm.responsible_brands,
      join_date: contactForm.join_date ? contactForm.join_date.format('YYYY-MM-DD') : null,
      resigned_at: contactForm.resigned_at ? contactForm.resigned_at.format('YYYY-MM-DD') : null,
    }

    if (editingContactId.value) {
      const { error } = await supabase.from('client_contacts').update(payload).eq('id', editingContactId.value)
      if (error) throw error
      message.success('员工信息已更新')
    } else {
      payload.client_id = 'CLI-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      const { error } = await supabase.from('client_contacts').insert([payload])
      if (error) throw error
      message.success('员工已添加')
    }
    contactModalOpen.value = false
    load()
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    savingContact.value = false
  }
}

function openResignModal(contact: any) {
  resignTarget.value = contact
  resignNewContactId.value = ''
  resignDate.value = dayjs()
  resignModalOpen.value = true
}

async function handleResign() {
  if (!resignTarget.value) return
  resigning.value = true
  try {
    const dateStr = resignDate.value ? resignDate.value.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
    await supabase
      .from('client_contacts')
      .update({
        employment_status: '离职',
        resigned_at: dateStr,
        is_primary: false,
      })
      .eq('id', resignTarget.value.id)

    if (resignNewContactId.value && (resignTarget.value.responsible_stores?.length || resignTarget.value.responsible_brands?.length)) {
      const newContact = currentCompany.value?.client_contacts?.find((c: any) => c.id === resignNewContactId.value)
      if (newContact) {
        const mergedStores = [...new Set([...(newContact.responsible_stores || []), ...(resignTarget.value.responsible_stores || [])])]
        const mergedBrands = [...new Set([...(newContact.responsible_brands || []), ...(resignTarget.value.responsible_brands || [])])]
        await supabase
          .from('client_contacts')
          .update({ responsible_stores: mergedStores, responsible_brands: mergedBrands })
          .eq('id', resignNewContactId.value)
      }
    }

    message.success(`${resignTarget.value.name} 已标记为离职`)
    resignModalOpen.value = false
    load()
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    resigning.value = false
  }
}

function deleteContact(contact: any) {
  Modal.confirm({
    title: `确定删除员工「${contact.name}」的记录？`,
    content: '删除后无法恢复。建议离职员工使用「离职」标记代替删除。',
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      const { error } = await supabase.from('client_contacts').delete().eq('id', contact.id)
      if (error) { message.error('删除失败'); return }
      message.success('已删除')
      load()
    },
  })
}

function handlePageChange(page: number, pageSize?: number) {
  if (pageSize && pageSize !== pagination.value.pageSize) {
    pagination.value.pageSize = pageSize
    pagination.value.current = 1
  } else {
    pagination.value.current = page
  }
  load()
}

onMounted(() => {
  load()
  loadManagerOptions()
})
</script>

<style scoped>
.customer-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 16px 20px 12px;
  box-sizing: border-box;
}
.customer-list > .flex-between { flex-shrink: 0; }
.flex-between { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.flex-center-gap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.flex-1 { flex: 1; min-width: 0; }
.mb-16 { margin-bottom: 16px; }
.customer-search-name { width: 380px; max-width: 380px; }
.customer-search-asin { width: 200px; max-width: 200px; }
.customer-search-contact { width: 230px; max-width: 230px; }
.customer-filter-level, .customer-filter-status { width: 100px; }
.customer-list :deep(.ant-spin-nested-loading) { flex: 1; min-height: 0; }
.customer-list :deep(.ant-spin-container) { height: 100%; min-height: 0; }
.customer-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: 0 15px 8px;
}
.customer-card-row {
  display: flex;
  align-items: center;
  border: 1px solid #e4e4e4;
  border-radius: 10px;
  padding: 10px;
  background: #fff;
}
.customer-card-row:hover { border-color: v-bind(customerHoverBorderColor); }
.customer-card-avatar { text-align: center; }
.customer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #1677ff;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.customer-main-info { min-width: 0; }
.customer-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; cursor: pointer; }
.customer-name { font-size: 15px; font-weight: 600; }
.customer-name:hover { color: v-bind(customerHoverBorderColor); }
.customer-sub-info { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; color: #8c8c8c; font-size: 13px; }
.customer-level-text {
  display: inline-block;
  padding: 0 7px;
  line-height: 20px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.02);
}
.customer-level1 { color: #52c41a; background: #f6ffed; border-color: #b7eb8f; }
.customer-level2, .customer-level3 { color: #0958d9; background: #e6f4ff; border-color: #91caff; }
.customer-channel-info.ignore-source-detail {
  font-size: 14px;
  color: #92400e;
  background: #fef3c7;
  border: 1px solid #fde68a;
  padding: 1px 7px;
  border-radius: 8px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.customer-order-group { display: flex; align-items: center; width: 100%; }
.customer-order-info {
  text-align: center;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  justify-content: center;
  flex: 1;
  min-height: 44px;
}
.customer-order-info::after {
  content: "";
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 32px;
  background: #d9d9d9;
}
.customer-order-info:last-child::after { content: none; }
.customer-order-info-num { font-size: 17px; font-weight: 700; line-height: 1.2; white-space: nowrap; }
.customer-order-info-label { color: #9ca3af; }
.customer-order-info-blue { color: #2563eb; }
.customer-order-info-green { color: #16a34a; }
.customer-order-info-gray { color: #6b7280; }
.manager-label, .section-label { font-size: 11px; color: #9ca3af; margin-bottom: 5px; }
.section-label { text-align: center; }
.manager-assigned {
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}
.manager-assigned:hover { background: #dcfce7; }
.manager-dot { width: 7px; height: 7px; border-radius: 50%; background: #16a34a; flex-shrink: 0; }
.manager-name { font-size: 13px; font-weight: 600; color: #15803d; white-space: nowrap; }
.manager-edit-icon { font-size: 10px; color: #86efac; margin-left: 2px; }
.contact-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.contact-chip { display: flex; align-items: flex-start; gap: 7px; background: #f8fafc; border-radius: 8px; padding: 6px 10px; min-width: 0; }
.chip-avatar { width: 28px; height: 28px; border-radius: 50%; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
.chip-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.chip-name { font-size: 14px; font-weight: 600; color: #1f2937; white-space: nowrap; }
.chip-sub { display: flex; flex-direction: column; gap: 2px; }
.chip-wechat { font-size: 11px; color: #07c160; white-space: nowrap; }
.empty-val { font-size: 14px; color: #c0c4cc; }
.customer-card-actions { display: inline-flex; align-items: center; }
.customer-pagination { flex-shrink: 0; margin-top: 16px; display: flex; justify-content: flex-end; }
.source-type-options { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; width: 100%; }
.source-type-btn { height: 36px; padding: 0 8px; }
.source-type-btn-inner { display: inline-flex; align-items: center; gap: 6px; }
.source-type-icon { line-height: 1; }
.group-chat-rows { display: flex; flex-direction: column; gap: 8px; }
.group-chat-row { display: flex; align-items: center; gap: 8px; }
.group-chat-btn { flex: none; width: 32px; }
.font-bold { font-weight: 500; font-size: 14px; }
.mb-8 { margin-bottom: 8px; }
.assign-manager-customer { margin-bottom: 10px; font-size: 14px; }
.customer-remark-input { color: #b45309; font-size: 15px; font-weight: 700; background: #fff7ed; border-color: #f59e0b; }
.visit-form { margin-top: 8px; }
.drawer-title { font-size: 14px; font-weight: 600; color: #1f2937; }
.detail-wrap { padding: 12px 16px 18px; }
.detail-panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; }
.detail-header { padding: 14px; display: flex; justify-content: space-between; align-items: center; }
.header-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.header-avatar { width: 48px; height: 48px; border-radius: 12px; background: #2563eb; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
.header-name { font-size: 15px; line-height: 1.2; font-weight: 700; color: #111827; }
.header-sub-row { margin-top: 8px; display: flex; align-items: center; gap: 8px; }
.org-code { font-size: 14px; color: #6b7280; }
.level-tag, .status-tag { font-size: 14px; line-height: 18px; padding: 0 7px; border-radius: 4px; border: 1px solid; }
.level-a { color: #2563eb; border-color: #93c5fd; background: #eff6ff; }
.level-b { color: #15803d; border-color: #86efac; background: #f0fdf4; }
.level-c { color: #92400e; border-color: #fcd34d; background: #fffbeb; }
.status-active { color: #15803d; border-color: #86efac; background: #f0fdf4; }
.status-inactive { color: #6b7280; border-color: #d1d5db; background: #f9fafb; }
.header-right { display: flex; align-items: center; gap: 8px; }
.manager-card { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 10px; border: 1px solid #86efac; background: #ecfdf3; cursor: pointer; }
.manager-text { font-size: 14px; color: #22c55e; }
.manager-card .manager-name { font-size: 14px; line-height: 1; font-weight: 700; color: #15803d; }
.edit-link { padding-inline: 2px; }
.total-stats { margin-top: 12px; border-color: #93c5fd; background: #eff6ff; padding: 12px 10px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.total-item { text-align: center; }
.total-num { font-size: 18px; line-height: 1.1; font-weight: 800; }
.total-label { margin-top: 4px; font-size: 14px; color: #4b5563; }
.total-num.blue { color: #2563eb; }
.total-num.cyan { color: #0891b2; }
.total-num.green { color: #059669; }
.total-num.gray { color: #9ca3af; }
.mini-grid { margin-top: 12px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.mini-card { padding: 10px 12px; min-height: 92px; }
.mini-title { font-size: 14px; color: #6b7280; }
.mini-kv-row { margin-top: 8px; display: flex; justify-content: space-between; gap: 10px; }
.mini-label { font-size: 13px; color: #6b7280; }
.mini-value { margin-top: 2px; font-size: 13px; font-weight: 700; color: #374151; }
.mini-value-lg { margin-top: 8px; font-size: 22px; line-height: 1; font-weight: 800; }
.mini-value-lg.blue { color: #2563eb; }
.mini-value-lg.green { color: #059669; }
.mini-sub-link { margin-top: 6px; font-size: 11px; color: #6b7280; }
.mini-sub-link a { color: #2563eb; cursor: pointer; }
.section-row { display: flex; align-items: center; justify-content: space-between; }
.mt-14 { margin-top: 14px; }
.detail-wrap > .section-title, .section-row .section-title { margin-top: 0; font-size: 15px; font-weight: 700; color: #111827; }
.address-panel { margin-top: 8px; }
.address-edit-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.address-input { grid-column: 1 / -1; }
.address-text { color: #111827; }
.address-empty { color: #9ca3af; }
.page-content { padding: 24px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }
.header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

.loading-wrap { display: flex; justify-content: center; padding: 80px 0; }
.empty-wrap { padding: 80px 0; }

.client-list { display: flex; flex-direction: column; gap: 10px; }

.client-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  padding: 16px 20px;
  gap: 0;
  transition: box-shadow 0.2s, border-color 0.2s;
  overflow: hidden;
}
.client-card:hover {
  box-shadow: 0 3px 12px rgba(0,0,0,0.09);
  border-color: #bfdbfe;
}

.card-sep { width: 1px; height: 60px; background: #f0f0f0; margin: 0 18px; flex-shrink: 0; }

/* 左侧：组织 */
.card-org { display: flex; align-items: center; gap: 12px; min-width: 200px; max-width: 230px; flex-shrink: 0; }
.org-avatar {
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 18px; flex-shrink: 0;
}
.org-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.org-name {
  font-size: 14px; font-weight: 700; color: #111827;
  cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.org-name:hover { color: #2563eb; text-decoration: underline; }
.org-ids { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.id-badge {
  font-size: 11px; color: #6b7280; background: #f3f4f6;
  padding: 1px 6px; border-radius: 4px; font-family: monospace; white-space: nowrap;
}
.org-brands { display: flex; align-items: center; gap: 4px; }
.brand-text { font-size: 11px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }

/* 店铺/ASIN/品牌概况区域 */
.card-store-summary { min-width: 180px; max-width: 220px; flex-shrink: 0; }
.section-label { font-size: 11px; color: #9ca3af; margin-bottom: 5px; }
.store-summary-content { display: flex; flex-direction: column; gap: 3px; }
.store-pills { display: flex; flex-direction: column; gap: 3px; }
.store-pill {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: #374151;
}
.store-pill-icon { font-size: 10px; color: #2563eb; flex-shrink: 0; }
.store-pill-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; }
.store-pill-count { color: #9ca3af; white-space: nowrap; }
.store-more { font-size: 11px; color: #9ca3af; }
.brand-pills { display: flex; flex-wrap: wrap; gap: 3px; }
.brand-pill {
  font-size: 11px; background: #eff6ff; color: #2563eb;
  padding: 1px 6px; border-radius: 4px; border: 1px solid #bfdbfe;
  white-space: nowrap;
}
.asin-mini-row { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
.asin-tag {
  font-size: 10px; font-family: monospace; background: #f0fdf4;
  color: #059669; padding: 1px 5px; border-radius: 3px; border: 1px solid #bbf7d0;
  white-space: nowrap;
}
.asin-more { font-size: 11px; color: #6b7280; }

/* 统计 */
.card-stats { display: flex; align-items: center; gap: 0; flex-shrink: 0; }
.stat-block { display: flex; flex-direction: column; align-items: center; min-width: 64px; }
.stat-num { font-size: 17px; font-weight: 700; line-height: 1.2; white-space: nowrap; }
.stat-num.blue { color: #2563eb; }
.stat-num.green { color: #059669; }
.stat-num.orange { color: #d97706; }
.stat-num.teal { color: #0891b2; }
.stat-num.red { color: #dc2626; }
.stat-num.gray { color: #9ca3af; }
.stat-lbl { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.stat-sep { width: 1px; height: 28px; background: #e5e7eb; margin: 0 8px; flex-shrink: 0; }

/* 详情抽屉内分配商务按钮 */
.assign-btn-wrapper { cursor: pointer; }
.assign-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 8px;
  transition: all 0.2s; min-width: 148px;
}
.assign-btn.assigned {
  background: #f0fdf4; border: 1.5px solid #86efac;
}
.assign-btn.assigned:hover { background: #dcfce7; border-color: #4ade80; }
.assign-btn.unassigned {
  background: #fafafa; border: 1.5px dashed #d1d5db;
}
.assign-btn.unassigned:hover { background: #eff6ff; border-color: #3b82f6; border-style: solid; }
.assign-btn-icon {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; flex-shrink: 0;
}
.assigned .assign-btn-icon { background: #16a34a; color: #fff; }
.unassigned .assign-btn-icon { background: #e5e7eb; color: #6b7280; }
.assign-btn-body { flex: 1; min-width: 0; }
.assign-btn-label { font-size: 10px; color: #9ca3af; line-height: 1.2; }
.assigned .assign-btn-label { color: #86efac; }
.assign-btn-name { font-size: 12px; font-weight: 600; white-space: nowrap; }
.assigned .assign-btn-name { color: #15803d; }
.unassigned .assign-btn-name { color: #9ca3af; }
.assign-btn-wechat { font-size: 10px; color: #4b9e6e; white-space: nowrap; line-height: 1.2; }
.assign-btn-edit { font-size: 11px; flex-shrink: 0; }
.assigned .assign-btn-edit { color: #4ade80; }
.unassigned .assign-btn-edit { color: #d1d5db; }

/* 负责商务 */
.card-manager { min-width: 110px; flex-shrink: 0; }
.manager-assigned {
  display: flex; align-items: center; gap: 5px;
  cursor: pointer; padding: 4px 8px;
  border-radius: 6px; background: #f0fdf4; border: 1px solid #bbf7d0;
  transition: background 0.15s;
}
.manager-assigned:hover { background: #dcfce7; }
.manager-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #16a34a; flex-shrink: 0;
}
.manager-info { display: flex; flex-direction: column; gap: 1px; }
.manager-name { font-size: 13px; font-weight: 600; color: #15803d; white-space: nowrap; }
.manager-wechat { font-size: 10px; color: #4b9e6e; white-space: nowrap; }
.manager-edit-icon { font-size: 10px; color: #86efac; margin-left: 2px; }
.manager-unassigned {
  display: flex; align-items: center; gap: 4px;
  cursor: pointer; padding: 4px 8px;
  border-radius: 6px; border: 1px dashed #d1d5db;
  color: #9ca3af; font-size: 12px;
  transition: border-color 0.15s, color 0.15s;
}
.manager-unassigned:hover { border-color: #2563eb; color: #2563eb; }

/* 对接人 */
.card-contacts { flex: 1; min-width: 0; }
.contact-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.contact-chip {
  display: flex; align-items: flex-start; gap: 7px;
  background: #f8fafc; border: 1px solid #e5e7eb;
  border-radius: 8px; padding: 6px 10px;
  min-width: 0;
}
.chip-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: #2563eb; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0; margin-top: 1px;
}
.chip-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.chip-name { font-size: 12px; font-weight: 600; color: #1f2937; white-space: nowrap; display: flex; align-items: center; }
.chip-sub { display: flex; flex-direction: column; gap: 2px; }
.chip-manager { font-size: 11px; color: #374151; white-space: nowrap; display: flex; align-items: center; gap: 3px; }
.chip-wechat { font-size: 11px; color: #07c160; white-space: nowrap; display: flex; align-items: center; gap: 3px; }
.contact-more { font-size: 12px; color: #6b7280; white-space: nowrap; }

/* 操作 */
.card-actions { display: flex; flex-direction: column; gap: 0; flex-shrink: 0; }

.empty-val { font-size: 12px; color: #c0c4cc; }

/* 分页 */
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 20px; }

.group-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.group-name-row .ant-input {
  flex: 1;
}

/* 来源渠道选择 */
.source-channel-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.channel-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 12px 8px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;
}
.channel-opt:hover {
  border-color: #93c5fd;
  background: #eff6ff;
}
.channel-opt.active {
  border-color: #2563eb;
  background: #eff6ff;
}
.channel-opt-icon { font-size: 20px; line-height: 1; }
.channel-opt-label { font-size: 12px; font-weight: 500; color: #374151; text-align: center; }

.org-source { margin-top: 3px; }
.source-badge {
  font-size: 11px; color: #92400e;
  background: #fef3c7; border: 1px solid #fde68a;
  padding: 1px 7px; border-radius: 8px;
  display: inline-block; max-width: 180px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Drawer */
.drawer-header {
  display: flex; align-items: center; gap: 14px;
  padding: 22px 24px 18px; border-bottom: 1px solid #f0f0f0;
  background: #fafbfc;
}
.drawer-avatar {
  width: 52px; height: 52px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 22px; font-weight: 700; flex-shrink: 0;
}
.drawer-title-block { flex: 1; }
.drawer-name { font-size: 17px; font-weight: 700; color: #111827; }
.drawer-sub { display: flex; align-items: center; gap: 6px; margin-top: 5px; flex-wrap: wrap; }

.drawer-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 18px; }

.drawer-stats-row {
  display: flex; gap: 12px;
  background: #f0f7ff; border-radius: 10px;
  border: 1px solid #bfdbfe; padding: 14px 16px;
}
.dstat-card { flex: 1; text-align: center; }
.dstat-num { font-size: 20px; font-weight: 700; line-height: 1.2; }
.dstat-num.blue { color: #2563eb; }
.dstat-num.green { color: #059669; }
.dstat-num.orange { color: #d97706; }
.dstat-num.teal { color: #0891b2; }
.dstat-num.red { color: #dc2626; }
.dstat-num.gray { color: #9ca3af; }
.dstat-lbl { font-size: 12px; color: #6b7280; margin-top: 4px; }

.drawer-section { }
.section-title {
  font-size: 13px; font-weight: 600; color: #374151;
  margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6;
  display: block;
}
.section-title-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6;
}

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.info-item { display: flex; flex-direction: column; gap: 2px; }
.info-lbl { font-size: 11px; color: #9ca3af; }
.info-val { font-size: 13px; color: #1f2937; font-weight: 500; }

.asin-tag-lg {
  font-size: 12px; font-family: monospace;
  background: #eff6ff; color: #2563eb;
  padding: 3px 10px; border-radius: 6px; border: 1px solid #bfdbfe;
}

.contact-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.contact-row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; background: #f8fafc;
  border-radius: 8px; border: 1px solid #e5e7eb;
  transition: opacity 0.2s;
}
.contact-row.contact-resigned {
  background: #f9fafb;
  opacity: 0.75;
  border-color: #e5e7eb;
}
.contact-avatar-sm {
  width: 34px; height: 34px; border-radius: 50%;
  background: #2563eb; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; flex-shrink: 0; margin-top: 2px;
}
.contact-avatar-sm.avatar-resigned {
  background: #9ca3af;
}
.contact-detail { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.contact-name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.contact-name { font-size: 14px; font-weight: 600; color: #1f2937; }
.contact-id-badge { font-size: 10px; color: #9ca3af; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 0 5px; font-family: monospace; }
.contact-client-id { font-size: 11px; color: #9ca3af; font-family: monospace; }
.contact-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.meta-item { font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 4px; }
.resigned-date { color: #f59e0b; }

/* 负责范围 */
.contact-scope {
  display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
  padding: 5px 8px; background: #eff6ff; border-radius: 5px;
  border: 1px solid #bfdbfe;
}
.scope-label { font-size: 11px; color: #6b7280; white-space: nowrap; }
.scope-tag {
  font-size: 11px; padding: 1px 7px; border-radius: 4px; font-weight: 500;
}
.scope-store { background: #dbeafe; color: #1d4ed8; }
.scope-brand { background: #ede9fe; color: #5b21b6; }
.contact-scope-empty { font-size: 11px; color: #d1d5db; }

.contact-row-actions {
  display: flex; flex-direction: column; align-items: center; gap: 2px; flex-shrink: 0;
}

.contact-binding {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 6px 10px; background: #f0fdf4; border-radius: 6px;
  border: 1px solid #bbf7d0; margin-top: 2px;
}
.binding-item {
  display: flex; align-items: center; gap: 4px; font-size: 12px;
}
.manager-binding { color: #1f2937; font-weight: 500; }
.manager-binding::after { content: '›'; margin: 0 4px; color: #9ca3af; font-size: 14px; }
.wechat-binding { color: #059669; font-weight: 500; }
.wechat-nick { color: #9ca3af; font-weight: 400; }
.binding-empty { font-size: 12px; color: #9ca3af; }
.contact-budget { font-size: 11px; color: #059669; }

/* 离职转交 Modal */
.resign-employee-info {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 12px;
}
.resign-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: #f59e0b; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; flex-shrink: 0;
}
.resign-scope-box {
  padding: 10px 12px; background: #fefce8; border: 1px solid #fde68a;
  border-radius: 8px; font-size: 12px;
}
.resign-scope-label {
  font-size: 12px; font-weight: 600; color: #92400e; margin-bottom: 4px;
}

/* 卡片拜访状态 */
.card-visit { display: flex; flex-direction: column; gap: 6px; min-width: 72px; align-items: flex-start; }
.visit-status-badge {
  display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500;
  padding: 2px 8px; border-radius: 20px; white-space: nowrap;
}
.visit-status-badge .visit-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}
.visit-未接触 { background: #f3f4f6; color: #6b7280; }
.visit-未接触 .visit-dot { background: #9ca3af; }
.visit-待拜访 { background: #fff7ed; color: #c2410c; }
.visit-待拜访 .visit-dot { background: #f97316; }
.visit-已拜访 { background: #f0fdf4; color: #15803d; }
.visit-已拜访 .visit-dot { background: #22c55e; }
.visit-不接受拜访 { background: #fef2f2; color: #b91c1c; }
.visit-不接受拜访 .visit-dot { background: #ef4444; }

/* 地址展示 */
.address-display {
  display: flex; align-items: flex-start; gap: 6px;
  font-size: 13px; color: #374151; margin-top: 4px;
}
.address-icon { color: #6b7280; margin-top: 2px; flex-shrink: 0; }

/* 拜访记录 */
.visit-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.visit-row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px; background: #f8fafc;
  border-radius: 8px; border: 1px solid #e5e7eb;
}
.visit-date-col { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 64px; flex-shrink: 0; }
.visit-date { font-size: 12px; font-weight: 700; color: #1f2937; }
.visit-type-tag {
  font-size: 10px; padding: 1px 6px; border-radius: 4px;
  background: #dbeafe; color: #1d4ed8; white-space: nowrap;
}
.visit-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.visit-header-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.visit-visitor { font-size: 12px; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 4px; }
.visit-contacts { font-size: 12px; color: #6b7280; }
.visit-purpose { font-size: 12px; color: #6b7280; }
.visit-summary { font-size: 12px; color: #374151; line-height: 1.5; }
.visit-next { font-size: 11px; color: #f59e0b; font-weight: 500; }

/* 标签输入框样式 */
.scope-input-area {
  border: 1px solid #d1d5db; border-radius: 6px; padding: 4px 8px;
  min-height: 36px; background: #fff; cursor: text;
  transition: border-color 0.2s;
}
.scope-input-area:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
.scope-tags-wrap { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.scope-input-tag {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 1px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;
}
.scope-input-tag .scope-tag-del {
  cursor: pointer; font-size: 13px; line-height: 1; opacity: 0.6; margin-left: 2px;
}
.scope-input-tag .scope-tag-del:hover { opacity: 1; }
.scope-inline-input { border: none !important; outline: none; box-shadow: none !important; padding: 0 4px; height: 24px; min-width: 100px; flex: 1; font-size: 12px; }
.scope-inline-input:focus { box-shadow: none !important; }

/* 财务信息 */
.info-financial { font-weight: 700; }
.info-financial.debt { color: #dc2626; }
.info-financial.prepaid { color: #0891b2; }

.contact-financial {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin-top: 2px;
}
.fin-badge {
  font-size: 11px; font-weight: 600;
  padding: 1px 8px; border-radius: 4px;
  white-space: nowrap;
}
.debt-badge { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
.prepaid-badge { background: #ecfeff; color: #0e7490; border: 1px solid #a5f3fc; }
.zero-badge { background: #f9fafb; color: #9ca3af; border: 1px solid #e5e7eb; }

.contact-order-stats {
  display: flex; align-items: center; gap: 0;
  margin-top: 6px; margin-bottom: 2px;
  background: #f8fafc; border: 1px solid #e5e7eb;
  border-radius: 8px; overflow: hidden;
}
.cos-item {
  display: flex; flex-direction: column; align-items: center;
  padding: 5px 14px; flex: 1;
}
.cos-sep {
  width: 1px; background: #e5e7eb; align-self: stretch;
}
.cos-num {
  font-size: 15px; font-weight: 700; line-height: 1.2;
}
.cos-num.blue { color: #2563eb; }
.cos-num.teal { color: #0891b2; }
.cos-num.green { color: #059669; }
.cos-lbl {
  font-size: 10px; color: #9ca3af; margin-top: 1px; white-space: nowrap;
}
.contact-order-stats-empty {
  font-size: 11px; color: #d1d5db; margin-top: 4px;
}
.contact-row-clickable { transition: box-shadow 0.15s; }
.contact-row-clickable:hover { box-shadow: 0 2px 8px rgba(37,99,235,0.10); border-color: #93c5fd !important; }

.contact-detail-header {
  display: flex; align-items: center; gap: 16px;
  padding: 20px 24px 16px; border-bottom: 1px solid #f0f0f0;
  background: #f8fafc;
}
.contact-detail-avatar {
  width: 52px; height: 52px; border-radius: 50%;
  background: #2563eb; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700; flex-shrink: 0;
}
.contact-detail-avatar.avatar-resigned { background: #9ca3af; }
.contact-detail-title { flex: 1; min-width: 0; }
.contact-detail-name { font-size: 18px; font-weight: 700; color: #111827; }
.contact-detail-meta {
  display: flex; align-items: center; gap: 12px;
  margin-top: 6px; font-size: 12px; color: #6b7280; flex-wrap: wrap;
}
.contact-detail-body { padding: 16px 24px; display: flex; flex-direction: column; gap: 16px; }
.cd-section { display: flex; flex-direction: column; gap: 8px; }
.cd-section-title {
  font-size: 12px; font-weight: 700; color: #6b7280;
  text-transform: uppercase; letter-spacing: 0.5px;
  padding-bottom: 4px; border-bottom: 1px solid #f0f0f0;
}
.cd-store-list { display: flex; flex-direction: column; gap: 8px; }
.cd-store-card {
  border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background: #fff;
}
.cd-store-header {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; background: #f8fafc;
}
.cd-store-icon {
  width: 28px; height: 28px; border-radius: 6px;
  background: #dbeafe; color: #1d4ed8;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; flex-shrink: 0;
}
.cd-store-name { font-size: 13px; font-weight: 600; color: #1f2937; }
.cd-store-meta { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.cd-asin-list { padding: 6px 12px 8px; display: flex; flex-direction: column; gap: 4px; }
.cd-asin-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 8px; background: #f9fafb;
  border: 1px solid #f0f0f0; border-radius: 6px; font-size: 12px;
}
.cd-asin-code { font-family: monospace; font-weight: 700; color: #1f2937; min-width: 80px; }
.cd-asin-brand { padding: 1px 6px; background: #eff6ff; color: #1d4ed8; border-radius: 4px; font-size: 11px; }
.cd-asin-cat { padding: 1px 6px; background: #f0fdf4; color: #15803d; border-radius: 4px; font-size: 11px; }
.cd-asin-pname { flex: 1; color: #6b7280; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cd-asin-empty { text-align: center; padding: 8px; color: #9ca3af; font-size: 12px; }
.cd-scope-tags { display: flex; flex-wrap: wrap; gap: 6px; }

.cd-order-list { display: flex; flex-direction: column; gap: 6px; }
.cd-order-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; background: #f8fafc;
  border: 1px solid #e5e7eb; border-radius: 8px;
}
.cd-order-left { flex: 1; min-width: 0; }
.cd-order-num { font-size: 12px; font-weight: 700; color: #1f2937; font-family: monospace; }
.cd-order-info { display: flex; align-items: center; gap: 6px; margin-top: 2px; font-size: 11px; color: #6b7280; flex-wrap: wrap; }
.cd-order-asin { font-family: monospace; color: #374151; font-weight: 600; }
.cd-order-right { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; gap: 2px; }
.cd-order-qty { font-size: 12px; color: #6b7280; }
.cd-order-amt { font-size: 13px; font-weight: 700; color: #059669; }
.cd-order-date { font-size: 11px; color: #9ca3af; }
.cos-num.gray { color: #6b7280; font-size: 12px; }
.dstat-num.blue2 { color: #0891b2; font-size: 20px; font-weight: 700; }

.company-metrics-row {
  display: flex; gap: 8px; margin: 0 20px 4px; flex-wrap: wrap;
}
.metrics-block {
  flex: 1; min-width: 120px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 10px 14px;
}
.clickable-block {
  cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s;
}
.clickable-block:hover { border-color: #2563eb; box-shadow: 0 1px 6px rgba(37,99,235,0.12); }
.metrics-block-title {
  font-size: 11px; color: #9ca3af; font-weight: 500; margin-bottom: 6px;
}
.metrics-finance-row {
  display: flex; align-items: center; gap: 0;
}
.finance-item {
  display: flex; flex-direction: column; flex: 1;
}
.finance-lbl { font-size: 10px; color: #9ca3af; }
.finance-val { font-size: 14px; font-weight: 700; margin-top: 2px; }
.finance-val.debt { color: #dc2626; }
.finance-val.prepaid { color: #0891b2; }
.finance-val.zero { color: #6b7280; }
.finance-sep { width: 1px; background: #e5e7eb; margin: 0 10px; align-self: stretch; }
.metrics-big-num {
  font-size: 22px; font-weight: 700; line-height: 1.2;
}
.metrics-big-num.blue { color: #2563eb; }
.metrics-big-num.green { color: #059669; }
.metrics-big-num.orange { color: #d97706; }
.metrics-big-num.red { color: #dc2626; }
.metrics-sub {
  font-size: 10px; color: #9ca3af; margin-top: 2px;
  display: flex; align-items: center; gap: 4px;
}
.jump-hint {
  color: #2563eb; font-weight: 500; font-size: 10px;
}
.basic-info { margin-top: 8px; padding: 10px 0; }
.basic-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.basic-item { padding: 10px 14px; }
.basic-item-full { grid-column: span 2; }
.basic-label { font-size: 14px; color: #6b7280; }
.basic-value { margin-top: 4px; font-size: 14px; line-height: 1.25; color: #1f2937; }
.customer-remark-text { display: inline-block; max-width: 100%; padding: 8px 10px; border: 1px solid #fed7aa; border-radius: 8px; background: #fff7ed; color: #b45309; font-size: 15px; font-weight: 700; line-height: 1.5; word-break: break-word; }
.operations-info { margin-top: 14px; }
.operations-panel { margin-top: 8px; padding: 10px 12px 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; }
.dimension-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.dimension-tab { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border: 1px solid #e5e7eb; border-radius: 999px; background: #fff; color: #6b7280; font-size: 14px; line-height: 20px; cursor: pointer; }
.dimension-tab.active { border-color: #2563eb; background: #2563eb; color: #fff; }
.dimension-list { overflow: hidden; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.dimension-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; }
.dimension-row + .dimension-row { border-top: 1px solid #f0f0f0; }
.row-title { max-width: 42%; overflow: hidden; color: #1a1a2e; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.row-title.is-code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.row-count { margin-left: auto; color: #6b7280; font-size: 14px; white-space: nowrap; }
.more-link { display: block; margin: 8px auto 0; padding: 4px 0; border: 0; background: transparent; color: #2563eb; font-size: 14px; cursor: pointer; }
.dimension-empty { padding: 8px 0 2px; color: #9ca3af; font-size: 14px; }
.operations-empty { padding: 32px 8px 24px; text-align: center; color: #111827; font-size: 14px; font-weight: 600; }
.operations-empty .empty-icon { display: block; margin-bottom: 8px; color: #9ca3af; font-size: 21px; }
.modal-search { margin-bottom: 12px; }
.modal-list { max-height: min(50vh, 540px); overflow: auto; }
.employee-actions { display: inline-flex; align-items: center; gap: 8px; }
.employee-filter-label { font-size: 14px; color: #6b7280; }
.employee-panel { margin-top: 8px; }
.employee-list { display: flex; flex-direction: column; gap: 10px; }
.employee-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; background: #f8fafc; display: flex; align-items: flex-start; gap: 10px; }
.employee-avatar { width: 32px; height: 32px; border-radius: 50%; background: #2563eb; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
.employee-main { flex: 1; min-width: 0; }
.employee-top-row, .employee-name-row, .employee-ops, .employee-sub-row { display: flex; align-items: center; gap: 8px; }
.employee-top-row { justify-content: space-between; }
.employee-name { font-size: 14px; font-weight: 700; color: #111827; }
.employee-id { font-size: 12px; color: #6b7280; }
.employee-status-tag { font-size: 12px; line-height: 18px; padding: 0 6px; border-radius: 4px; }
.employee-status-active { color: #15803d; background: #f0fdf4; }
.employee-status-leave { color: #6b7280; background: #f3f4f6; }
.employee-sub-row { margin-top: 6px; flex-wrap: wrap; }
.employee-sub-item { font-size: 13px; color: #6b7280; }
.employee-sub-item.wechat { color: #07c160; }
.visit-actions { display: inline-flex; align-items: center; gap: 8px; }
.visit-select { width: 110px; }
.visit-list { display: flex; flex-direction: column; gap: 10px; width: 100%; }
.visit-card { padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f8fafc; }
.visit-card-head, .visit-card-title, .visit-meta-row, .visit-content-row { display: flex; align-items: center; gap: 8px; }
.visit-card-head { justify-content: space-between; }
.visit-card-date { font-size: 14px; font-weight: 700; color: #111827; }
.visit-type-tag { font-size: 12px; padding: 0 6px; border-radius: 4px; color: #2563eb; background: #eff6ff; }
.visit-meta-row { margin-top: 8px; flex-wrap: wrap; }
.visit-meta-item, .visit-content-label { font-size: 14px; color: #6b7280; }
.visit-content-row { margin-top: 8px; align-items: flex-start; }
.visit-content-text { font-size: 14px; line-height: 1.7; color: #374151; white-space: pre-wrap; }
.commissioner-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; }
.commissioner-label { margin-bottom: 6px; font-size: 14px; color: #374151; }
.commissioner-label-required::before { content: '*'; margin-right: 4px; color: #dc2626; }
.manager-card { cursor: default; }
</style>
