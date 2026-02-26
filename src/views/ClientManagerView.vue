<template>
  <div class="page-content">
    <div class="page-header">
      <h1 class="page-title">客户库</h1>
      <div class="header-actions">
        <a-input-search v-model:value="searchText" placeholder="搜索公司名/品牌/ASIN" style="width:240px" allow-clear @search="load" />
        <a-select v-model:value="filterLevel" style="width:100px" @change="load" allow-clear placeholder="等级">
          <a-select-option v-for="l in ['S','A','B','C']" :key="l" :value="l">{{ l }}级</a-select-option>
        </a-select>
        <a-select v-model:value="filterStatus" style="width:100px" @change="load" allow-clear placeholder="状态">
          <a-select-option value="活跃">活跃</a-select-option>
          <a-select-option value="暂停">暂停</a-select-option>
          <a-select-option value="流失">流失</a-select-option>
        </a-select>
        <a-button @click="load"><ReloadOutlined /></a-button>
        <a-button type="primary" @click="openAddModal"><PlusOutlined /> 添加客户</a-button>
      </div>
    </div>

    <div v-if="loading" class="loading-wrap"><a-spin size="large" /></div>
    <div v-else-if="clients.length === 0" class="empty-wrap"><a-empty description="暂无客户数据" /></div>

    <div v-else class="client-list">
      <div v-for="company in clients" :key="company.id" class="client-card">
        <!-- 左侧：组织信息 -->
        <div class="card-org">
          <div class="org-avatar" :style="{ background: levelBg[company.level || 'C'] }">
            {{ (company.company_name || '?').charAt(0) }}
          </div>
          <div class="org-info">
            <div class="org-name" @click="openDetail(company)">{{ company.company_name }}</div>
            <div class="org-ids">
              <span class="id-badge">{{ company.org_id || '—' }}</span>
              <a-tag :color="levelColor[company.level || 'C']" style="margin:0;font-size:11px">{{ company.level || 'C' }}级</a-tag>
              <a-tag :color="statusColor[company.status || '活跃']" style="margin:0;font-size:11px">{{ company.status || '活跃' }}</a-tag>
            </div>
            <div v-if="company.brand_names?.length" class="org-brands">
              <TagOutlined style="font-size:11px;color:#9ca3af" />
              <span class="brand-text">{{ company.brand_names.slice(0, 3).join('  /  ') }}{{ company.brand_names.length > 3 ? ' ...' : '' }}</span>
            </div>
          </div>
        </div>

        <div class="card-sep" />

        <!-- ASIN 区域 -->
        <div class="card-asins">
          <div class="section-label">ASIN</div>
          <div v-if="company.client_asins?.length" class="asin-list">
            <span v-for="asin in company.client_asins.slice(0, 4)" :key="asin" class="asin-tag">{{ asin }}</span>
            <span v-if="company.client_asins.length > 4" class="asin-more">+{{ company.client_asins.length - 4 }}</span>
          </div>
          <span v-else class="empty-val">暂未录入</span>
        </div>

        <div class="card-sep" />

        <!-- 统计数据 -->
        <div class="card-stats">
          <div class="stat-block">
            <div class="stat-num blue">{{ company.total_order_count || 0 }}</div>
            <div class="stat-lbl">累计下单</div>
          </div>
          <div class="stat-sep" />
          <div class="stat-block">
            <div class="stat-num green">¥{{ formatMoney(company.total_order_amount_cny) }}</div>
            <div class="stat-lbl">累计金额</div>
          </div>
          <div class="stat-sep" />
          <div class="stat-block">
            <div class="stat-num orange">{{ company.monthly_order_count || 0 }}</div>
            <div class="stat-lbl">月均单量</div>
          </div>
          <div class="stat-sep" />
          <div class="stat-block">
            <div class="stat-num teal">{{ company.client_contacts?.length || 0 }}</div>
            <div class="stat-lbl">对接人数</div>
          </div>
        </div>

        <div class="card-sep" />

        <!-- 负责商务经理 -->
        <div class="card-manager">
          <div class="section-label">负责商务</div>
          <div v-if="company.business_owner_name" class="manager-assigned" @click="openAssignManager(company)">
            <div class="manager-dot" />
            <span class="manager-name">{{ company.business_owner_name }}</span>
            <EditOutlined class="manager-edit-icon" />
          </div>
          <div v-else class="manager-unassigned" @click="openAssignManager(company)">
            <PlusOutlined style="font-size:11px" />
            <span>分配经理</span>
          </div>
        </div>

        <div class="card-sep" />

        <!-- 员工列表 -->
        <div class="card-contacts">
          <div class="section-label">员工</div>
          <div v-if="company.client_contacts?.filter((c: any) => c.employment_status !== '离职').length" class="contact-chips">
            <div v-for="c in company.client_contacts.filter((c: any) => c.employment_status !== '离职').slice(0, 2)" :key="c.id" class="contact-chip">
              <div class="chip-avatar">{{ c.name.charAt(0) }}</div>
              <div class="chip-info">
                <div class="chip-name">{{ c.name }}</div>
                <div class="chip-sub">
                  <span v-if="c.wechat" class="chip-wechat">
                    <WechatOutlined style="font-size:10px;color:#07c160" /> {{ c.wechat }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="company.client_contacts.filter((c: any) => c.employment_status !== '离职').length > 2" class="contact-more">+{{ company.client_contacts.filter((c: any) => c.employment_status !== '离职').length - 2 }}人</div>
          </div>
          <span v-else class="empty-val">暂无在职员工</span>
        </div>

        <div class="card-sep" />

        <!-- 拜访状态 -->
        <div class="card-visit">
          <div class="section-label">拜访</div>
          <div class="visit-status-badge" :class="'visit-' + (company.visit_status || '未接触').replace(/\s/g, '')">
            <span class="visit-dot" />
            <span>{{ company.visit_status || '未接触' }}</span>
          </div>
        </div>

        <div class="card-sep" />

        <!-- 操作 -->
        <div class="card-actions">
          <a-button type="link" size="small" @click="openDetail(company)">详情</a-button>
          <a-button type="link" size="small" @click="openEditModal(company)">编辑</a-button>
          <a-popconfirm title="确定删除该客户？" @confirm="deleteClient(company.id)">
            <a-button type="link" size="small" danger>删除</a-button>
          </a-popconfirm>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.total > pagination.pageSize" class="pagination-wrap">
      <a-pagination v-model:current="pagination.current" :total="pagination.total" :page-size="pagination.pageSize" @change="handlePageChange" show-quick-jumper />
    </div>

    <!-- 添加/编辑 Modal -->
    <a-modal v-model:open="modalOpen" :title="editingId ? '编辑客户' : '添加客户'" @ok="handleSubmit" :confirm-loading="submitting" ok-text="确定" cancel-text="取消" width="720px">
      <a-form layout="vertical" style="margin-top:8px">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="公司名称" required>
              <a-input v-model:value="form.company_name" placeholder="请输入公司名称" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="客户等级">
              <a-select v-model:value="form.level">
                <a-select-option v-for="l in ['S','A','B','C']" :key="l" :value="l">{{ l }}级</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="状态">
              <a-select v-model:value="form.status">
                <a-select-option value="活跃">活跃</a-select-option>
                <a-select-option value="暂停">暂停</a-select-option>
                <a-select-option value="流失">流失</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="国家/地区">
              <a-input v-model:value="form.country" placeholder="如：美国、德国" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="行业">
              <a-input v-model:value="form.industry" placeholder="如：3C、服装" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="月均下单量">
              <a-input-number v-model:value="form.monthly_order_count" :min="0" style="width:100%" placeholder="月均下单次数" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="下单频次">
              <a-input v-model:value="form.order_frequency" placeholder="如：每周、每月、不定期" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="品牌名称（多个）">
              <a-select v-model:value="form.brand_names" mode="tags" placeholder="输入品牌名称后回车" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="ASIN 列表（多个）">
              <a-select v-model:value="form.client_asins" mode="tags" placeholder="输入ASIN后回车，支持多个" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="form.notes" :rows="2" placeholder="备注信息" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider style="margin:10px 0"><span style="font-size:12px;color:#6b7280">地址（选填，客户愿意提供时录入）</span></a-divider>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="国家">
              <a-input v-model:value="form.address_country" placeholder="如：中国" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="省/州">
              <a-input v-model:value="form.address_province" placeholder="如：广东省" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="城市">
              <a-input v-model:value="form.address_city" placeholder="如：深圳市" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="详细地址">
              <a-input v-model:value="form.address_detail" placeholder="街道、楼号等详细地址" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider style="margin:10px 0"><span style="font-size:12px;color:#6b7280">拜访意向</span></a-divider>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="拜访状态">
              <a-select v-model:value="form.visit_status">
                <a-select-option value="未接触">未接触</a-select-option>
                <a-select-option value="待拜访">待拜访</a-select-option>
                <a-select-option value="已拜访">已拜访</a-select-option>
                <a-select-option value="不接受拜访">不接受拜访</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 添加拜访记录 Modal -->
    <a-modal
      v-model:open="visitModalOpen"
      title="记录拜访"
      @ok="handleAddVisit"
      :confirm-loading="savingVisit"
      ok-text="保存"
      cancel-text="取消"
      width="580px"
    >
      <a-form layout="vertical" style="margin-top:8px">
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
    </a-modal>

    <!-- 详情抽屉 -->
    <a-drawer
      v-model:open="detailOpen"
      :title="null"
      placement="right"
      width="620"
      :body-style="{ padding: 0 }"
    >
      <template v-if="currentCompany">
        <div class="drawer-header">
          <div class="drawer-avatar" :style="{ background: levelBg[currentCompany.level || 'C'] }">
            {{ (currentCompany.company_name || '?').charAt(0) }}
          </div>
          <div class="drawer-title-block">
            <div class="drawer-name">{{ currentCompany.company_name }}</div>
            <div class="drawer-sub">
              <span class="id-badge">{{ currentCompany.org_id || '—' }}</span>
              <a-tag :color="levelColor[currentCompany.level || 'C']">{{ currentCompany.level || 'C' }}级</a-tag>
              <a-tag :color="statusColor[currentCompany.status || '活跃']">{{ currentCompany.status }}</a-tag>
            </div>
          </div>
          <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
            <div class="assign-btn-wrapper" @click="openAssignManager(currentCompany)">
              <div v-if="currentCompany.business_owner_name" class="assign-btn assigned">
                <div class="assign-btn-icon"><UserOutlined /></div>
                <div class="assign-btn-body">
                  <div class="assign-btn-label">负责商务</div>
                  <div class="assign-btn-name">{{ currentCompany.business_owner_name }}</div>
                </div>
                <EditOutlined class="assign-btn-edit" />
              </div>
              <div v-else class="assign-btn unassigned">
                <div class="assign-btn-icon"><UserOutlined /></div>
                <div class="assign-btn-body">
                  <div class="assign-btn-label">暂未分配</div>
                  <div class="assign-btn-name">点击分配商务经理</div>
                </div>
                <PlusOutlined class="assign-btn-edit" />
              </div>
            </div>
            <a-button type="link" size="small" @click="openEditModal(currentCompany)">编辑</a-button>
          </div>
        </div>

        <div class="drawer-body">
          <div class="drawer-stats-row">
            <div class="dstat-card">
              <div class="dstat-num blue">{{ currentCompany.total_order_count || 0 }}</div>
              <div class="dstat-lbl">累计下单</div>
            </div>
            <div class="dstat-card">
              <div class="dstat-num green">¥{{ formatMoney(currentCompany.total_order_amount_cny) }}</div>
              <div class="dstat-lbl">累计金额</div>
            </div>
            <div class="dstat-card">
              <div class="dstat-num orange">{{ currentCompany.monthly_order_count || 0 }}</div>
              <div class="dstat-lbl">月均单量</div>
            </div>
          </div>

          <div class="drawer-section">
            <div class="section-title">基本信息</div>
            <div class="info-grid">
              <div class="info-item"><span class="info-lbl">国家</span><span class="info-val">{{ currentCompany.country || '—' }}</span></div>
              <div class="info-item"><span class="info-lbl">行业</span><span class="info-val">{{ currentCompany.industry || '—' }}</span></div>
              <div class="info-item"><span class="info-lbl">下单频次</span><span class="info-val">{{ currentCompany.order_frequency || '—' }}</span></div>
              <div class="info-item"><span class="info-lbl">最近下单</span><span class="info-val">{{ currentCompany.last_order_date || '—' }}</span></div>
            </div>
            <div v-if="currentCompany.brand_names?.length" style="margin-top:10px">
              <div class="info-lbl" style="margin-bottom:6px">品牌</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                <a-tag v-for="b in currentCompany.brand_names" :key="b" color="blue">{{ b }}</a-tag>
              </div>
            </div>
            <div v-if="currentCompany.notes" style="margin-top:10px">
              <div class="info-lbl">备注</div>
              <div class="info-val" style="margin-top:4px">{{ currentCompany.notes }}</div>
            </div>
          </div>

          <!-- 店铺 & ASIN 管理 -->
          <div class="drawer-section" style="padding-bottom:0">
            <ClientStoreManager
              :company-id="currentCompany.id"
              :contacts="currentCompany.client_contacts || []"
              @updated="load"
            />
          </div>

          <!-- 地址 -->
          <div class="drawer-section">
            <div class="section-title-row">
              <span class="section-title" style="margin-bottom:0;border:none;padding:0">公司地址</span>
              <a-button type="link" size="small" @click="openEditModal(currentCompany)">编辑</a-button>
            </div>
            <div v-if="currentCompany.address_city || currentCompany.address_detail" class="address-display">
              <EnvironmentOutlined class="address-icon" />
              <span>
                {{ [currentCompany.address_country, currentCompany.address_province, currentCompany.address_city, currentCompany.address_detail].filter(Boolean).join(' · ') }}
              </span>
            </div>
            <span v-else class="empty-val">未录入地址</span>
          </div>

          <!-- 拜访记录 -->
          <div class="drawer-section">
            <div class="section-title-row">
              <div style="display:flex;align-items:center;gap:8px">
                <span class="section-title" style="margin-bottom:0;border:none;padding:0">拜访记录</span>
                <a-tag :color="visitStatusColor[currentCompany.visit_status || '未接触']" style="font-size:11px">
                  {{ currentCompany.visit_status || '未接触' }}
                </a-tag>
              </div>
              <div style="display:flex;gap:6px;align-items:center">
                <a-select
                  :value="currentCompany.visit_status"
                  size="small"
                  style="width:120px"
                  @change="(v: string) => updateVisitStatus(v)"
                >
                  <a-select-option value="未接触">未接触</a-select-option>
                  <a-select-option value="待拜访">待拜访</a-select-option>
                  <a-select-option value="已拜访">已拜访</a-select-option>
                  <a-select-option value="不接受拜访">不接受拜访</a-select-option>
                </a-select>
                <a-button
                  v-if="currentCompany.visit_status !== '不接受拜访'"
                  type="primary"
                  size="small"
                  @click="openAddVisit"
                ><PlusOutlined /> 记录拜访</a-button>
              </div>
            </div>
            <div v-if="!visitRecords.length" class="empty-val" style="margin-top:8px">暂无拜访记录</div>
            <div v-else class="visit-list">
              <div v-for="v in visitRecords" :key="v.id" class="visit-row">
                <div class="visit-date-col">
                  <div class="visit-date">{{ v.visit_date }}</div>
                  <div class="visit-type-tag">{{ v.visit_type }}</div>
                </div>
                <div class="visit-body">
                  <div class="visit-header-row">
                    <span class="visit-visitor"><UserOutlined /> {{ v.visitor_name }}</span>
                    <span v-if="v.contact_names" class="visit-contacts">对接：{{ v.contact_names }}</span>
                  </div>
                  <div v-if="v.purpose" class="visit-purpose">目的：{{ v.purpose }}</div>
                  <div v-if="v.summary" class="visit-summary">{{ v.summary }}</div>
                  <div v-if="v.next_visit_date" class="visit-next">下次拜访：{{ v.next_visit_date }}</div>
                </div>
                <a-popconfirm title="确定删除该拜访记录？" @confirm="deleteVisit(v.id)">
                  <a-button type="link" size="small" danger style="flex-shrink:0"><DeleteOutlined /></a-button>
                </a-popconfirm>
              </div>
            </div>
          </div>

          <div class="drawer-section">
            <div class="section-title-row">
              <span class="section-title" style="margin-bottom:0;border:none;padding:0">员工 / 对接人</span>
              <div style="display:flex;gap:6px;align-items:center">
                <a-switch
                  v-model:checked="showResignedContacts"
                  size="small"
                  checked-children="含离职"
                  un-checked-children="仅在职"
                />
                <a-button type="primary" size="small" @click="openAddContact"><PlusOutlined /> 添加员工</a-button>
              </div>
            </div>
            <div v-if="!filteredContacts.length" class="empty-val" style="margin-top:8px">
              {{ showResignedContacts ? '暂无员工' : '暂无在职员工' }}
            </div>
            <div v-else class="contact-list">
              <div
                v-for="c in filteredContacts"
                :key="c.id"
                class="contact-row"
                :class="{ 'contact-resigned': c.employment_status === '离职' || c.employment_status === '停止合作' }"
              >
                <div class="contact-avatar-sm" :class="{ 'avatar-resigned': c.employment_status !== '在职' }">
                  {{ c.name.charAt(0) }}
                </div>
                <div class="contact-detail">
                  <div class="contact-name-row">
                    <span class="contact-name">{{ c.name }}</span>
                    <a-tag v-if="c.is_primary && c.employment_status === '在职'" color="blue" style="font-size:10px;margin:0;padding:0 4px">主要</a-tag>
                    <a-tag
                      :color="employmentStatusColor[c.employment_status || '在职']"
                      style="font-size:10px;margin:0;padding:0 4px"
                    >{{ c.employment_status || '在职' }}</a-tag>
                    <a-tag :color="contactStatusColor[c.contact_wechat_status || '活跃']" style="font-size:10px;margin:0;padding:0 4px">微信{{ c.contact_wechat_status || '活跃' }}</a-tag>
                  </div>
                  <div class="contact-meta">
                    <span v-if="c.role" class="meta-item"><TeamOutlined /> {{ c.role }}</span>
                    <span v-if="c.phone" class="meta-item"><PhoneOutlined /> {{ c.phone }}</span>
                    <span v-if="c.wechat" class="meta-item"><WechatOutlined style="color:#07c160" /> {{ c.wechat }}</span>
                    <span v-if="c.join_date" class="meta-item">入职: {{ c.join_date }}</span>
                    <span v-if="c.resigned_at" class="meta-item resigned-date">离职: {{ c.resigned_at }}</span>
                  </div>

                  <!-- 负责店铺/品牌 -->
                  <div v-if="c.responsible_stores?.length || c.responsible_brands?.length" class="contact-scope">
                    <span class="scope-label">负责范围：</span>
                    <span v-for="s in c.responsible_stores" :key="s" class="scope-tag scope-store">{{ s }}</span>
                    <span v-for="b in c.responsible_brands" :key="b" class="scope-tag scope-brand">{{ b }}</span>
                  </div>
                  <div v-else-if="c.employment_status === '在职'" class="contact-scope-empty">未设置负责店铺/品牌</div>

                  <div v-if="c.monthly_budget_cny" class="contact-budget">月预算：¥{{ formatMoney(c.monthly_budget_cny) }}</div>
                </div>
                <div class="contact-row-actions">
                  <a-button type="link" size="small" @click="openEditContact(c)"><EditOutlined /></a-button>
                  <a-button
                    v-if="c.employment_status === '在职'"
                    type="link"
                    size="small"
                    style="color:#f59e0b"
                    @click="openResignModal(c)"
                  >离职</a-button>
                  <a-popconfirm title="确定删除该员工记录？" @confirm="deleteContact(c)">
                    <a-button type="link" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
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
      title="分配负责商务经理"
      @ok="handleAssignManager"
      :confirm-loading="assigning"
      ok-text="确定"
      cancel-text="取消"
      width="400px"
    >
      <div style="padding:16px 0">
        <div style="margin-bottom:8px;font-size:13px;color:#374151">
          客户：<strong>{{ assignTarget?.company_name }}</strong>
        </div>
        <a-select
          v-model:value="assignManagerId"
          placeholder="选择负责商务经理"
          style="width:100%"
          allow-clear
          :options="managerOptions.map(m => ({ value: m.id, label: m.name }))"
        />
        <div v-if="assignManagerId" style="margin-top:10px">
          <div style="font-size:12px;color:#6b7280;margin-bottom:6px">选择对接微信号（可选）</div>
          <a-select
            v-model:value="assignWechatId"
            placeholder="选择该经理的商务微信"
            style="width:100%"
            allow-clear
          >
            <a-select-option v-for="w in managerWechatOptions" :key="w.id" :value="w.id">
              {{ w.wechat_id }}{{ w.wechat_nickname ? `（${w.wechat_nickname}）` : '' }}
            </a-select-option>
          </a-select>
        </div>
      </div>
    </a-modal>

    <!-- 添加/编辑员工 Modal -->
    <a-modal
      v-model:open="contactModalOpen"
      :title="editingContactId ? '编辑员工' : '添加员工'"
      @ok="handleAddContact"
      :confirm-loading="savingContact"
      ok-text="确定"
      cancel-text="取消"
      width="620px"
    >
      <a-form layout="vertical" style="margin-top:8px">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="姓名" required><a-input v-model:value="contactForm.name" placeholder="员工姓名" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="职位/角色"><a-input v-model:value="contactForm.role" placeholder="如：采购经理、运营" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="手机"><a-input v-model:value="contactForm.phone" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="微信号">
              <a-input v-model:value="contactForm.wechat" placeholder="员工本人微信号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="在职状态">
              <a-select v-model:value="contactForm.employment_status">
                <a-select-option value="在职">在职</a-select-option>
                <a-select-option value="离职">离职</a-select-option>
                <a-select-option value="停止合作">停止合作</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="开始对接日期">
              <a-date-picker v-model:value="contactForm.join_date" style="width:100%" placeholder="选择日期" />
            </a-form-item>
          </a-col>
          <a-col v-if="contactForm.employment_status === '离职'" :span="12">
            <a-form-item label="离职日期">
              <a-date-picker v-model:value="contactForm.resigned_at" style="width:100%" placeholder="选择离职日期" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="微信状态">
              <a-select v-model:value="contactForm.contact_wechat_status">
                <a-select-option value="活跃">活跃</a-select-option>
                <a-select-option value="沉默">沉默</a-select-option>
                <a-select-option value="流失">流失</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="月预算（元）">
              <a-input-number v-model:value="contactForm.monthly_budget_cny" :min="0" style="width:100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider style="margin:10px 0"><span style="font-size:12px;color:#6b7280">负责范围（归属公司，不随员工变动）</span></a-divider>

        <!-- 负责店铺 -->
        <a-form-item label="负责店铺">
          <div class="scope-input-area">
            <div class="scope-tags-wrap">
              <span
                v-for="(s, i) in contactForm.responsible_stores"
                :key="i"
                class="scope-input-tag scope-store"
              >
                {{ s }}
                <span class="scope-tag-del" @click="contactForm.responsible_stores.splice(i, 1)">×</span>
              </span>
              <a-input
                v-model:value="storeInputVal"
                class="scope-inline-input"
                placeholder="输入店铺名称回车添加"
                @keydown.enter.prevent="addStore"
                @blur="addStore"
              />
            </div>
          </div>
        </a-form-item>

        <!-- 负责品牌 -->
        <a-form-item label="负责品牌">
          <div class="scope-input-area">
            <div class="scope-tags-wrap">
              <span
                v-for="(b, i) in contactForm.responsible_brands"
                :key="i"
                class="scope-input-tag scope-brand"
              >
                {{ b }}
                <span class="scope-tag-del" @click="contactForm.responsible_brands.splice(i, 1)">×</span>
              </span>
              <a-input
                v-model:value="brandInputVal"
                class="scope-inline-input"
                placeholder="输入品牌名称回车添加"
                @keydown.enter.prevent="addBrand"
                @blur="addBrand"
              />
            </div>
          </div>
        </a-form-item>

        <a-form-item label="备注">
          <a-textarea v-model:value="contactForm.notes" :rows="2" />
        </a-form-item>
      </a-form>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, DeleteOutlined, TagOutlined, UserOutlined, WechatOutlined, PhoneOutlined, TeamOutlined, EditOutlined, EnvironmentOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'
import dayjs, { type Dayjs } from 'dayjs'
import ClientStoreManager from '../components/ClientStoreManager.vue'

const loading = ref(false)
const clients = ref<any[]>([])
const searchText = ref('')
const filterLevel = ref('')
const filterStatus = ref('')
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

const defaultForm = () => ({
  company_name: '',
  country: '',
  industry: '',
  level: 'B',
  status: '活跃',
  brand_names: [] as string[],
  client_asins: [] as string[],
  order_frequency: '',
  monthly_order_count: 0,
  notes: '',
  address_country: '',
  address_province: '',
  address_city: '',
  address_detail: '',
  visit_status: '未接触',
})
const form = reactive(defaultForm())

const defaultContactForm = () => ({
  name: '',
  role: '联系人',
  phone: '',
  wechat: '',
  is_primary: false,
  contact_wechat_status: '活跃',
  monthly_budget_cny: 0,
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
      query = query.or(`company_name.ilike.%${searchText.value}%`)
    }
    if (filterLevel.value) query = query.eq('level', filterLevel.value)
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)
    const { data, count, error } = await query
    if (error) throw error
    clients.value = data || []
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
  })
  modalOpen.value = true
}

function openDetail(record: any) {
  currentCompany.value = record
  detailOpen.value = true
  loadVisitRecords(record.id)
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
  Object.assign(visitForm, defaultVisitForm())
  visitModalOpen.value = true
}

async function handleAddVisit() {
  if (!visitForm.visit_date) { message.warning('请选择拜访日期'); return }
  if (!visitForm.visitor_name.trim()) { message.warning('请填写拜访人'); return }
  if (!currentCompany.value) return
  savingVisit.value = true
  try {
    const { error } = await supabase.from('client_visit_records').insert([{
      company_id: currentCompany.value.id,
      visit_date: visitForm.visit_date.format('YYYY-MM-DD'),
      visit_type: visitForm.visit_type,
      visitor_name: visitForm.visitor_name,
      contact_names: visitForm.contact_names,
      purpose: visitForm.purpose,
      summary: visitForm.summary,
      next_visit_date: visitForm.next_visit_date ? visitForm.next_visit_date.format('YYYY-MM-DD') : null,
    }])
    if (error) throw error
    await supabase.from('client_companies').update({ visit_status: '已拜访' }).eq('id', currentCompany.value.id)
    message.success('拜访记录已保存')
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
      industry: form.industry,
      level: form.level,
      status: form.status,
      brand_names: form.brand_names,
      client_asins: form.client_asins,
      order_frequency: form.order_frequency,
      monthly_order_count: form.monthly_order_count,
      notes: form.notes,
      address_country: form.address_country,
      address_province: form.address_province,
      address_city: form.address_city,
      address_detail: form.address_detail,
      visit_status: form.visit_status,
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
    const payload: any = {
      business_owner_id: assignManagerId.value || null,
      business_owner_name: mgr?.name || null,
    }
    const { error } = await supabase
      .from('client_companies')
      .update(payload)
      .eq('id', assignTarget.value.id)
    if (error) throw error

    if (assignWechatId.value) {
      const w = wechatOptions.value.find(x => x.id === assignWechatId.value)
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
    monthly_budget_cny: contact.monthly_budget_cny || 0,
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
      monthly_budget_cny: contactForm.monthly_budget_cny,
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

function handlePageChange(page: number) {
  pagination.value.current = page
  load()
}

onMounted(() => {
  load()
  loadManagerOptions()
})
</script>

<style scoped>
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

/* ASIN */
.card-asins { min-width: 150px; max-width: 170px; flex-shrink: 0; }
.section-label { font-size: 11px; color: #9ca3af; margin-bottom: 5px; }
.asin-list { display: flex; flex-wrap: wrap; gap: 4px; }
.asin-tag {
  font-size: 11px; font-family: monospace; background: #eff6ff;
  color: #2563eb; padding: 1px 6px; border-radius: 4px; border: 1px solid #bfdbfe;
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
.manager-name { font-size: 13px; font-weight: 600; color: #15803d; white-space: nowrap; }
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
</style>
