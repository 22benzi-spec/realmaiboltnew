<template>
  <div class="buyer-page">
    <!-- 顶部统计面板 -->
    <div class="stats-bar">
      <div v-for="s in summaryStats" :key="s.key" class="stat-card" :class="{ 'stat-active': s.key === activeTab }" @click="setTab(s.key)">
        <div class="stat-num" :style="{ color: s.color }">{{ s.count }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </div>

    <!-- 主表格区 -->
    <div class="card-panel">
      <div class="toolbar">
        <div class="toolbar-left">
          <a-input-search v-model:value="searchText" placeholder="搜索买手姓名/编号/聊单号/Facebook" style="width:240px" allow-clear @search="load" @change="onSearchChange" />
          <a-select v-model:value="filterCountry" style="width:100px" @change="load" allow-clear placeholder="国家">
            <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
          </a-select>
          <a-select v-model:value="filterStaff" style="width:115px" @change="load" allow-clear placeholder="业务员">
            <a-select-option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
          </a-select>
          <a-select v-model:value="filterSource" style="width:115px" @change="load" allow-clear placeholder="来源渠道">
            <a-select-option value="老客推荐">老客推荐</a-select-option>
            <a-select-option value="前端引流">前端引流</a-select-option>
            <a-select-option value="中介介绍">中介介绍</a-select-option>
            <a-select-option value="渠道未知">渠道未知</a-select-option>
          </a-select>
        </div>
        <div class="toolbar-right">
          <span class="total-hint">共 {{ pagination.total }} 人</span>
          <a-button type="primary" @click="openAddModal"><PlusOutlined /> 添加买手</a-button>
        </div>
      </div>

      <a-table
        :columns="columns"
        :data-source="buyers"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="middle"
        @change="handleTableChange"
        :scroll="{ x: 1200 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'buyer_number'">
            <span class="buyer-id-badge">{{ record.buyer_number || '—' }}</span>
          </template>
          <template v-if="column.key === 'name'">
            <div class="buyer-name-cell" @click="openDetail(record)">
              <div class="buyer-avatar" :style="{ background: avatarColor(record.name) }">{{ record.name?.[0] || '?' }}</div>
              <div>
                <div class="buyer-name">{{ record.name }}</div>
                <div class="buyer-sub">
                  {{ record.country }}{{ record.region ? ' · ' + record.region : '' }}
                  <a v-if="record.facebook_link" :href="record.facebook_link" target="_blank" class="fb-inline-link" @click.stop>FB</a>
                </div>
              </div>
            </div>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColor[record.status] || 'default'" size="small">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'total_completed'">
            <span class="num-badge">{{ record.total_completed || 0 }}</span>
          </template>
          <template v-if="column.key === 'after_sale_rate'">
            <span v-if="record.after_sale_rate" class="rate-badge">{{ record.after_sale_rate }}%</span>
            <span v-else class="text-empty">—</span>
          </template>
          <template v-if="column.key === 'source_info'">
            <div class="source-cell">
              <a-tag v-if="record.source_channel" size="small" :color="sourceChannelColor[record.source_channel] || 'default'">{{ record.source_channel }}</a-tag>
              <span v-if="record.referrer_name" class="source-referrer">@{{ record.referrer_name }}</span>
            </div>
          </template>
          <template v-if="column.key === 'is_prime_member'">
            <a-tag v-if="record.is_prime_member" color="gold" size="small">Prime</a-tag>
            <span v-else class="text-empty">—</span>
          </template>
          <template v-if="column.key === 'chat_account'">
            <span class="text-mono">{{ record.chat_account || '—' }}</span>
          </template>
          <template v-if="column.key === 'amazon_profile'">
            <a v-if="record.amazon_profile" :href="record.amazon_profile" target="_blank" class="profile-link" @click.stop>查看</a>
            <span v-else class="text-empty">—</span>
          </template>
          <template v-if="column.key === 'created_at'">
            <span class="date-text">{{ formatDate(record.created_at) }}</span>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button type="link" size="small" @click="openEditModal(record)">编辑</a-button>
              <a-popconfirm v-if="record.status !== '黑名单'" title="拉黑后买手将无法接单，确认?" @confirm="setBlacklist(record)">
                <a-button type="link" size="small" danger>拉黑</a-button>
              </a-popconfirm>
              <a-button v-else type="link" size="small" @click="unBlacklist(record)">恢复</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 快速添加买手弹窗 -->
    <a-modal v-model:open="addModalOpen" title="添加买手" @ok="handleAddSubmit" :confirm-loading="submitting" width="620px">
      <a-form :model="addForm" layout="vertical" ref="addFormRef" :rules="addRules" style="padding-top:8px">
        <a-row :gutter="16">
          <a-col :span="10">
            <a-form-item label="买手名" name="name"><a-input v-model:value="addForm.name" placeholder="真实姓名" /></a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="国家">
              <a-select v-model:value="addForm.country">
                <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="Prime 会员">
              <a-switch v-model:checked="addForm.is_prime_member" checked-children="是" un-checked-children="否" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="来源渠道">
              <a-select v-model:value="addForm.source_channel" allow-clear placeholder="请选择">
                <a-select-option value="老客推荐">老客推荐</a-select-option>
                <a-select-option value="前端引流">前端引流</a-select-option>
                <a-select-option value="中介介绍">中介介绍</a-select-option>
                <a-select-option value="渠道未知">渠道未知</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="介绍人">
              <a-input v-model:value="addForm.referrer_name" placeholder="来源为中介介绍时填写" :disabled="addForm.source_channel !== '中介介绍'" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="所属聊单号">
              <a-input v-model:value="addForm.chat_account" placeholder="聊单账号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Facebook 链接">
              <a-input v-model:value="addForm.facebook_link" placeholder="https://facebook.com/..." />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注"><a-textarea v-model:value="addForm.notes" :rows="2" /></a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 编辑买手弹窗（全字段，分 Tab） -->
    <a-modal v-model:open="editModalOpen" title="编辑买手" @ok="handleEditSubmit" :confirm-loading="submitting" width="760px" :body-style="{ maxHeight: '72vh', overflowY: 'auto', padding: '0 24px 16px' }">
      <a-tabs v-model:activeKey="editTab" size="small" style="margin-top: 4px">

        <!-- Tab 基本信息 -->
        <a-tab-pane key="basic" tab="基本信息">
          <a-form :model="editForm" layout="vertical" style="padding-top:8px">
            <a-row :gutter="14">
              <a-col :span="10">
                <a-form-item label="买手名" required>
                  <a-input v-model:value="editForm.name" @blur="onNameBlur" />
                </a-form-item>
                <div v-if="editForm.former_names && editForm.former_names.length" class="former-names-hint">
                  曾用名：<span v-for="n in editForm.former_names" :key="n" class="former-name-tag">{{ n }}</span>
                </div>
              </a-col>
              <a-col :span="8">
                <a-form-item label="国家">
                  <a-select v-model:value="editForm.country">
                    <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="Prime 会员">
                  <a-switch v-model:checked="editForm.is_prime_member" checked-children="是" un-checked-children="否" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="来源渠道">
                  <a-select v-model:value="editForm.source_channel" allow-clear placeholder="请选择">
                    <a-select-option value="老客推荐">老客推荐</a-select-option>
                    <a-select-option value="前端引流">前端引流</a-select-option>
                    <a-select-option value="中介介绍">中介介绍</a-select-option>
                    <a-select-option value="渠道未知">渠道未知</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="介绍人">
                  <a-input v-model:value="editForm.referrer_name" :disabled="editForm.source_channel !== '中介介绍'" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="所属聊单号"><a-input v-model:value="editForm.chat_account" /></a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Facebook 链接"><a-input v-model:value="editForm.facebook_link" /></a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="状态">
                  <a-select v-model:value="editForm.status">
                    <a-select-option value="活跃">活跃</a-select-option>
                    <a-select-option value="暂停">暂停</a-select-option>
                    <a-select-option value="黑名单">黑名单</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="业务员">
                  <a-select v-model:value="editForm.staff_id" allow-clear placeholder="选择业务员" @change="onStaffChange">
                    <a-select-option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="售后率 (%)">
                  <a-input-number v-model:value="editForm.after_sale_rate" :min="0" :max="100" :precision="1" style="width:100%" />
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item label="画像标签">
                  <a-select v-model:value="editForm.tags" mode="tags" :options="tagPresets.map(t => ({ value: t, label: t }))" placeholder="选择或输入标签" />
                </a-form-item>
              </a-col>
              <a-col :span="24" v-if="editForm.status === '黑名单'">
                <a-form-item label="拉黑原因">
                  <a-textarea v-model:value="editForm.blacklist_reason" :rows="2" />
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item label="备注"><a-textarea v-model:value="editForm.notes" :rows="2" /></a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </a-tab-pane>

        <!-- Tab 扩展信息 -->
        <a-tab-pane key="extended" tab="扩展信息">
          <a-form :model="editForm" layout="vertical" style="padding-top:8px">
            <a-row :gutter="14">
              <a-col :span="8">
                <a-form-item label="配合程度">
                  <a-select v-model:value="editForm.cooperation_level" allow-clear placeholder="请选择">
                    <a-select-option value="高">高</a-select-option>
                    <a-select-option value="中">中</a-select-option>
                    <a-select-option value="低">低</a-select-option>
                    <a-select-option value="待评估">待评估</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="生日"><a-input v-model:value="editForm.birthday" placeholder="YYYY-MM-DD" /></a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="所属地区"><a-input v-model:value="editForm.region" placeholder="如 德州 / 加州" /></a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="对接平台"><a-input v-model:value="editForm.contact_platform" placeholder="如 Amazon / FB" /></a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="邮箱"><a-input v-model:value="editForm.email" /></a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="手机号"><a-input v-model:value="editForm.phone" /></a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item label="Amazon Profile 链接"><a-input v-model:value="editForm.amazon_profile" placeholder="https://www.amazon.com/gp/profile/..." /></a-form-item>
              </a-col>

              <!-- 备用联系方式 -->
              <a-col :span="24">
                <a-form-item label="备用联系方式">
                  <div class="backup-contacts-editor">
                    <div v-for="(bc, idx) in backupContacts" :key="idx" class="bc-row">
                      <a-select v-model:value="bc.type" style="width:120px" size="small">
                        <a-select-option v-for="t in backupContactTypes" :key="t" :value="t">{{ t }}</a-select-option>
                      </a-select>
                      <a-input v-model:value="bc.value" size="small" style="flex:1" :placeholder="bcPlaceholder(bc.type)" />
                      <a-button type="text" size="small" danger @click="removeBackupContact(idx)">删除</a-button>
                    </div>
                    <a-button type="dashed" size="small" @click="addBackupContact" style="margin-top:6px; width:100%">
                      <PlusOutlined /> 添加备用联系方式
                    </a-button>
                  </div>
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </a-tab-pane>

        <!-- Tab 购买记录 -->
        <a-tab-pane key="purchase" tab="购买记录">
          <div style="padding: 12px 0; color: #6b7280; font-size: 13px;">
            <a-alert type="info" show-icon message="已购 ASIN 和已购店铺由系统从订单记录自动汇总，无需手动填写。" style="margin-bottom: 14px;" />
            <div v-if="editOrderStats.asins.length">
              <div class="purchase-section-title">已购 ASIN（{{ editOrderStats.asins.length }} 个）</div>
              <div class="asin-tags" style="margin-bottom:14px">
                <span v-for="asin in editOrderStats.asins" :key="asin" class="asin-tag">{{ asin }}</span>
              </div>
            </div>
            <div v-if="editOrderStats.stores.length">
              <div class="purchase-section-title">已购店铺（{{ editOrderStats.stores.length }} 个）</div>
              <div class="store-tags">
                <span v-for="store in editOrderStats.stores" :key="store" class="store-tag">{{ store }}</span>
              </div>
            </div>
            <div v-if="!editOrderStats.asins.length && !editOrderStats.stores.length" class="ds-empty" style="padding: 24px 0; text-align:center">
              暂无订单记录
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-modal>

    <!-- 详情抽屉 -->
    <a-drawer v-model:open="drawerOpen" title="买手详情" width="560" :body-style="{ padding: '0' }">
      <div v-if="drawerBuyer" class="drawer-body">
        <!-- 头部 -->
        <div class="drawer-header-card">
          <div class="drawer-avatar" :style="{ background: avatarColor(drawerBuyer.name) }">{{ drawerBuyer.name?.[0] || '?' }}</div>
          <div class="drawer-header-info">
            <div class="drawer-name">
              {{ drawerBuyer.name }}
              <span class="drawer-number">{{ drawerBuyer.buyer_number }}</span>
              <a-tag v-if="drawerBuyer.is_prime_member" color="gold" size="small">Prime</a-tag>
            </div>
            <div v-if="drawerBuyer.former_names && drawerBuyer.former_names.length" class="drawer-former-names">
              曾用名：<span v-for="n in drawerBuyer.former_names" :key="n" class="former-name-tag">{{ n }}</span>
            </div>
            <div class="drawer-meta">
              <a-tag :color="statusColor[drawerBuyer.status] || 'default'" size="small">{{ drawerBuyer.status }}</a-tag>
              <span class="drawer-country">{{ drawerBuyer.country }}{{ drawerBuyer.region ? ' · ' + drawerBuyer.region : '' }}</span>
              <a-tag v-if="drawerBuyer.cooperation_level" :color="cooperationColor[drawerBuyer.cooperation_level] || 'default'" size="small">配合度：{{ drawerBuyer.cooperation_level }}</a-tag>
            </div>
            <div class="drawer-tags">
              <a-tag v-for="t in (drawerBuyer.tags || [])" :key="t" color="blue" size="small">{{ t }}</a-tag>
            </div>
          </div>
        </div>

        <a-tabs v-model:activeKey="drawerTab" style="padding: 0 16px;" size="small">
          <a-tab-pane key="info" tab="买手信息">

            <!-- 核心数据 -->
            <div class="kpi-row">
              <div class="kpi-card">
                <div class="kpi-num">{{ drawerBuyer.total_completed || 0 }}</div>
                <div class="kpi-label">已完成合计</div>
              </div>
              <div class="kpi-card kpi-card-sm">
                <div class="kpi-num blue">{{ drawerOrderBreakdown.review }}</div>
                <div class="kpi-label">测评单</div>
              </div>
              <div class="kpi-card kpi-card-sm">
                <div class="kpi-num teal">{{ drawerOrderBreakdown.free }}</div>
                <div class="kpi-label">免评单</div>
              </div>
              <div class="kpi-card kpi-card-sm">
                <div class="kpi-num gold">{{ drawerOrderBreakdown.feedback }}</div>
                <div class="kpi-label">Feedback</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-num" :class="{ 'kpi-warn': (drawerBuyer.after_sale_rate || 0) > 10 }">
                  {{ drawerBuyer.after_sale_rate ? drawerBuyer.after_sale_rate + '%' : '—' }}
                </div>
                <div class="kpi-label">售后率</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-num small">{{ drawerBuyer.staff_name || '—' }}</div>
                <div class="kpi-label">业务员</div>
              </div>
            </div>

            <!-- 渠道信息 -->
            <div class="drawer-section">
              <div class="ds-title">渠道 &amp; 接触方式</div>
              <div class="ds-grid">
                <div class="ds-item">
                  <span class="ds-label">来源渠道</span>
                  <span>
                    <a-tag v-if="drawerBuyer.source_channel" size="small" :color="sourceChannelColor[drawerBuyer.source_channel] || 'default'">{{ drawerBuyer.source_channel }}</a-tag>
                    <span v-if="drawerBuyer.referrer_name" class="ref-name">by {{ drawerBuyer.referrer_name }}</span>
                    <span v-if="!drawerBuyer.source_channel">—</span>
                  </span>
                </div>
                <div class="ds-item">
                  <span class="ds-label">对接平台</span>
                  <span>{{ drawerBuyer.contact_platform || '—' }}</span>
                </div>
                <div class="ds-item">
                  <span class="ds-label">聊单号</span>
                  <span class="text-mono">{{ drawerBuyer.chat_account || '—' }}</span>
                </div>
                <div class="ds-item">
                  <span class="ds-label">Facebook 链接</span>
                  <a v-if="drawerBuyer.facebook_link" :href="drawerBuyer.facebook_link" target="_blank" class="link-text">查看主页</a>
                  <span v-else>—</span>
                </div>
              </div>
            </div>

            <!-- 联系方式 -->
            <div class="drawer-section">
              <div class="ds-title">联系方式</div>
              <div class="ds-grid">
                <div class="ds-item"><span class="ds-label">邮箱</span><span class="text-mono small">{{ drawerBuyer.email || '—' }}</span></div>
                <div class="ds-item"><span class="ds-label">手机号</span><span>{{ drawerBuyer.phone || '—' }}</span></div>
                <div class="ds-item"><span class="ds-label">生日</span><span>{{ drawerBuyer.birthday || '—' }}</span></div>
                <div class="ds-item">
                  <span class="ds-label">Amazon Profile</span>
                  <a v-if="drawerBuyer.amazon_profile" :href="drawerBuyer.amazon_profile" target="_blank" class="link-text">查看 Profile</a>
                  <span v-else>—</span>
                </div>
              </div>
              <!-- 备用联系方式 -->
              <div v-if="parsedBackupContacts(drawerBuyer.backup_contacts).length" class="bc-list">
                <div class="ds-label-full" style="margin-bottom:6px">备用联系方式</div>
                <div v-for="(bc, i) in parsedBackupContacts(drawerBuyer.backup_contacts)" :key="i" class="bc-display-row">
                  <span class="bc-type-badge">{{ bc.type }}</span>
                  <span class="bc-value">{{ bc.value }}</span>
                </div>
              </div>
            </div>

            <!-- 购买记录 -->
            <div class="drawer-section">
              <div class="ds-title">购买记录（来自订单）</div>
              <div v-if="drawerOrderStats.asins.length" class="ds-block">
                <div class="ds-label-full">已购 ASIN（{{ drawerOrderStats.asins.length }} 个）</div>
                <div class="asin-tags">
                  <span v-for="asin in drawerOrderStats.asins" :key="asin" class="asin-tag">{{ asin }}</span>
                </div>
              </div>
              <div v-if="drawerOrderStats.stores.length" class="ds-block">
                <div class="ds-label-full">已购店铺</div>
                <div class="store-tags">
                  <span v-for="store in drawerOrderStats.stores" :key="store" class="store-tag">{{ store }}</span>
                </div>
              </div>
              <div v-if="!drawerOrderStats.asins.length && !drawerOrderStats.stores.length" class="ds-empty">暂无订单记录</div>
            </div>

            <!-- 拉黑 / 备注 -->
            <div v-if="drawerBuyer.blacklist_reason" class="drawer-section blacklist-section">
              <div class="ds-title">拉黑原因</div>
              <div class="blacklist-reason">{{ drawerBuyer.blacklist_reason }}</div>
            </div>
            <div v-if="drawerBuyer.notes" class="drawer-section">
              <div class="ds-title">备注</div>
              <div class="drawer-notes">{{ drawerBuyer.notes }}</div>
            </div>
          </a-tab-pane>

          <a-tab-pane key="reviews" tab="留评轨迹">
            <BuyerReviewTracker :buyer-id="drawerBuyer.id" />
          </a-tab-pane>
        </a-tabs>

        <div class="drawer-actions">
          <a-button type="primary" @click="openEditModal(drawerBuyer); drawerOpen = false">编辑</a-button>
          <a-popconfirm v-if="drawerBuyer.status !== '黑名单'" title="确认拉黑该买手?" @confirm="setBlacklist(drawerBuyer); drawerOpen = false">
            <a-button danger>拉黑</a-button>
          </a-popconfirm>
          <a-button v-else @click="unBlacklist(drawerBuyer); drawerOpen = false">解除拉黑</a-button>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import BuyerReviewTracker from '../components/BuyerReviewTracker.vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'
import { BUYER_TAG_PRESETS } from '../types'

const loading = ref(false)
const buyers = ref<any[]>([])
const searchText = ref('')
const filterCountry = ref('')
const filterStaff = ref('')
const filterSource = ref('')
const activeTab = ref('all')

const addModalOpen = ref(false)
const editModalOpen = ref(false)
const editTab = ref('basic')
const drawerOpen = ref(false)
const drawerBuyer = ref<any>(null)
const drawerTab = ref('info')
const submitting = ref(false)
const editingId = ref('')
const addFormRef = ref()
const pagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })
const staffList = ref<any[]>([])
const allCounts = ref({ all: 0, active: 0, paused: 0, blacklist: 0, today: 0 })
const backupContacts = ref<{ type: string; value: string }[]>([])
const editOrderStats = ref<{ asins: string[]; stores: string[] }>({ asins: [], stores: [] })
const drawerOrderStats = ref<{ asins: string[]; stores: string[] }>({ asins: [], stores: [] })
const drawerOrderBreakdown = ref({ review: 0, free: 0, feedback: 0 })

const countries = ['美国', '德国', '英国', '加拿大', '澳大利亚', '法国', '日本']
const tagPresets = [...BUYER_TAG_PRESETS]
const backupContactTypes = ['邮箱', '小号拉群', '小号加好友', 'WS', 'VIP群组', 'INS']
const statusColor: Record<string, string> = { '活跃': 'green', '暂停': 'orange', '黑名单': 'red' }
const cooperationColor: Record<string, string> = { '高': 'green', '中': 'blue', '低': 'orange', '待评估': 'default' }
const sourceChannelColor: Record<string, string> = { '老客推荐': 'green', '前端引流': 'blue', '中介介绍': 'orange', '渠道未知': 'default' }
const avatarColors = ['#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2', '#65a30d']

function avatarColor(name: string) {
  if (!name) return '#9ca3af'
  return avatarColors[name.charCodeAt(0) % avatarColors.length]
}

function bcPlaceholder(type: string): string {
  const map: Record<string, string> = {
    '邮箱': 'xxx@example.com', '小号拉群': '微信号', '小号加好友': '微信号',
    'WS': '+1 234 567 8900', 'VIP群组': '群名/链接', 'INS': '@instagram账号',
  }
  return map[type] || '填写具体内容'
}

const summaryStats = computed(() => [
  { key: 'all', label: '全部买手', count: allCounts.value.all, color: '#2563eb' },
  { key: 'active', label: '活跃', count: allCounts.value.active, color: '#059669' },
  { key: 'paused', label: '暂停', count: allCounts.value.paused, color: '#d97706' },
  { key: 'blacklist', label: '黑名单', count: allCounts.value.blacklist, color: '#dc2626' },
  { key: 'today', label: '今日新增', count: allCounts.value.today, color: '#0891b2' },
])

const defaultAddForm = () => ({
  name: '', country: '美国', facebook_link: '',
  is_prime_member: false, source_channel: '', referrer_name: '',
  chat_account: '', notes: '',
})

const defaultEditForm = () => ({
  name: '', country: '美国', facebook_link: '',
  is_prime_member: false, source_channel: '', referrer_name: '',
  chat_account: '', notes: '',
  status: '活跃', staff_id: null as string | null, staff_name: '',
  tags: [] as string[], blacklist_reason: '', after_sale_rate: 0 as number | null,
  email: '', phone: '', platform_account: '',
  cooperation_level: '', birthday: '', region: '', contact_platform: '',
  amazon_profile: '',
  backup_contacts: '[]',
  former_names: [] as string[],
})

const addForm = reactive(defaultAddForm())
const editForm = reactive(defaultEditForm())
const addRules = { name: [{ required: true, message: '请输入买手姓名' }] }

const columns = [
  { title: '买手ID', key: 'buyer_number', dataIndex: 'buyer_number', width: 95, fixed: 'left' },
  { title: '买手姓名', key: 'name', width: 150, fixed: 'left' },
  { title: '状态', key: 'status', width: 70 },
  { title: '已完成', key: 'total_completed', width: 72, align: 'center' as const },
  { title: '售后率', key: 'after_sale_rate', width: 72, align: 'center' as const },
  { title: '来源渠道', key: 'source_info', width: 140 },
  { title: 'Prime', key: 'is_prime_member', width: 65, align: 'center' as const },
  { title: '聊单号', key: 'chat_account', width: 120 },
  { title: 'Profile', key: 'amazon_profile', width: 72 },
  { title: '入库时间', key: 'created_at', width: 100 },
  { title: '操作', key: 'action', width: 155, fixed: 'right' },
]

function tabToStatus(tab: string): string {
  if (tab === 'active') return '活跃'
  if (tab === 'paused') return '暂停'
  if (tab === 'blacklist') return '黑名单'
  return ''
}

async function loadCounts() {
  const today = dayjs().startOf('day').toISOString()
  const [allR, activeR, pausedR, blackR, todayR] = await Promise.all([
    supabase.from('erp_buyers').select('id', { count: 'exact', head: true }),
    supabase.from('erp_buyers').select('id', { count: 'exact', head: true }).eq('status', '活跃'),
    supabase.from('erp_buyers').select('id', { count: 'exact', head: true }).eq('status', '暂停'),
    supabase.from('erp_buyers').select('id', { count: 'exact', head: true }).eq('status', '黑名单'),
    supabase.from('erp_buyers').select('id', { count: 'exact', head: true }).gte('created_at', today),
  ])
  allCounts.value = {
    all: allR.count || 0, active: activeR.count || 0,
    paused: pausedR.count || 0, blacklist: blackR.count || 0, today: todayR.count || 0,
  }
}

async function load() {
  loading.value = true
  try {
    let query = supabase.from('erp_buyers').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (searchText.value) {
      query = query.or(`name.ilike.%${searchText.value}%,platform_account.ilike.%${searchText.value}%,facebook_name.ilike.%${searchText.value}%,chat_account.ilike.%${searchText.value}%,buyer_number.ilike.%${searchText.value}%`)
    }
    const st = tabToStatus(activeTab.value)
    if (st) query = query.eq('status', st)
    if (activeTab.value === 'today') query = query.gte('created_at', dayjs().startOf('day').toISOString())
    if (filterCountry.value) query = query.eq('country', filterCountry.value)
    if (filterStaff.value) query = query.eq('staff_id', filterStaff.value)
    if (filterSource.value) query = query.eq('source_channel', filterSource.value)
    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)
    const { data, count, error } = await query
    if (error) throw error
    buyers.value = data || []
    pagination.value.total = count || 0
  } finally {
    loading.value = false
  }
}

async function loadStaff() {
  const { data } = await supabase.from('staff').select('id, name').eq('status', '在职').order('name')
  staffList.value = data || []
}

function setTab(tab: string) {
  activeTab.value = tab
  pagination.value.current = 1
  load()
}

function onSearchChange() {
  if (!searchText.value) load()
}

function onStaffChange(val: string) {
  const s = staffList.value.find(s => s.id === val)
  editForm.staff_name = s?.name || ''
}

function openAddModal() {
  Object.assign(addForm, defaultAddForm())
  addModalOpen.value = true
}

async function loadEditOrderStats(buyerId: string) {
  editOrderStats.value = { asins: [], stores: [] }
  const { data } = await supabase
    .from('sub_orders')
    .select('asin, store_name')
    .eq('buyer_id', buyerId)
  if (data) {
    const asins = [...new Set(data.map((r: any) => r.asin).filter(Boolean))]
    const stores = [...new Set(data.map((r: any) => r.store_name).filter(Boolean))]
    editOrderStats.value = { asins, stores }
  }
}

const originalBuyerName = ref('')

function onNameBlur() {
  const newName = editForm.name.trim()
  if (!newName || newName === originalBuyerName.value) return
  if (!editForm.former_names.includes(originalBuyerName.value) && originalBuyerName.value) {
    editForm.former_names = [...editForm.former_names, originalBuyerName.value]
  }
  originalBuyerName.value = newName
}

function openEditModal(record: any) {
  editingId.value = record.id
  editTab.value = 'basic'
  Object.assign(editForm, defaultEditForm(), record)
  editForm.former_names = Array.isArray(record.former_names) ? [...record.former_names] : []
  originalBuyerName.value = record.name || ''
  backupContacts.value = parsedBackupContacts(record.backup_contacts)
  editModalOpen.value = true
  loadEditOrderStats(record.id)
}

async function loadDrawerOrderStats(buyerId: string) {
  drawerOrderStats.value = { asins: [], stores: [] }
  drawerOrderBreakdown.value = { review: 0, free: 0, feedback: 0 }
  const { data } = await supabase
    .from('sub_orders')
    .select('asin, store_name, order_type')
    .eq('buyer_id', buyerId)
    .in('status', ['已完成', '已留评'])
  if (data) {
    const asins = [...new Set(data.map((r: any) => r.asin).filter(Boolean))]
    const stores = [...new Set(data.map((r: any) => r.store_name).filter(Boolean))]
    drawerOrderStats.value = { asins, stores }
    let review = 0, free = 0, feedback = 0
    for (const r of data) {
      const t = (r.order_type || '').toLowerCase()
      if (t.includes('feedback')) feedback++
      else if (t.includes('免评')) free++
      else review++
    }
    drawerOrderBreakdown.value = { review, free, feedback }
  }
}

function openDetail(record: any) {
  drawerBuyer.value = record
  drawerTab.value = 'info'
  drawerOpen.value = true
  loadDrawerOrderStats(record.id)
}

function addBackupContact() {
  backupContacts.value.push({ type: '邮箱', value: '' })
}

function removeBackupContact(idx: number) {
  backupContacts.value.splice(idx, 1)
}

function parsedBackupContacts(raw: any): { type: string; value: string }[] {
  if (!raw) return []
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return [] }
  }
  if (Array.isArray(raw)) return raw
  return []
}

async function handleAddSubmit() {
  await addFormRef.value?.validate()
  submitting.value = true
  try {
    const { error } = await supabase.from('erp_buyers').insert([{ ...addForm, status: '活跃' }])
    if (error) throw error
    message.success('添加成功')
    addModalOpen.value = false
    await loadCounts()
    load()
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

async function handleEditSubmit() {
  if (!editForm.name) { message.error('买手名不能为空'); return }
  submitting.value = true
  try {
    const formerNames = editForm.former_names.filter(n => n && n !== editForm.name)
    const payload = {
      ...editForm,
      former_names: formerNames,
      backup_contacts: JSON.stringify(backupContacts.value.filter(bc => bc.value)),
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('erp_buyers').update(payload).eq('id', editingId.value)
    if (error) throw error
    message.success('更新成功')
    editModalOpen.value = false
    if (drawerBuyer.value?.id === editingId.value) {
      const { data } = await supabase.from('erp_buyers').select('*').eq('id', editingId.value).maybeSingle()
      drawerBuyer.value = data
    }
    await loadCounts()
    load()
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

async function setBlacklist(record: any) {
  const { error } = await supabase.from('erp_buyers').update({ status: '黑名单', updated_at: new Date().toISOString() }).eq('id', record.id)
  if (error) { message.error('操作失败'); return }
  message.success('已拉黑')
  await loadCounts(); load()
}

async function unBlacklist(record: any) {
  const { error } = await supabase.from('erp_buyers').update({ status: '活跃', blacklist_reason: '', updated_at: new Date().toISOString() }).eq('id', record.id)
  if (error) { message.error('操作失败'); return }
  message.success('已恢复为活跃')
  await loadCounts(); load()
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  load()
}

function formatDate(d: string) {
  return d ? dayjs(d).format('MM-DD HH:mm') : '—'
}


onMounted(async () => {
  await Promise.all([loadStaff(), loadCounts()])
  load()
})
</script>

<style scoped>
.buyer-page { padding: 20px 24px; }

.stats-bar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.stat-card {
  background: #fff; border: 1.5px solid #e5e7eb; border-radius: 10px;
  padding: 12px 22px; min-width: 108px; cursor: pointer; transition: all 0.18s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.stat-card:hover { border-color: #2563eb; box-shadow: 0 2px 8px rgba(37,99,235,0.10); }
.stat-active { border-color: #2563eb !important; background: #eff6ff !important; }
.stat-num { font-size: 22px; font-weight: 700; line-height: 1.2; }
.stat-label { font-size: 12px; color: #6b7280; margin-top: 2px; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.toolbar-left { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.toolbar-right { display: flex; gap: 10px; align-items: center; }
.total-hint { font-size: 13px; color: #6b7280; }

.buyer-id-badge { font-size: 11px; background: #f3f4f6; color: #374151; padding: 2px 7px; border-radius: 5px; font-family: monospace; font-weight: 600; }
.buyer-name-cell { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.buyer-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.buyer-name { font-weight: 600; color: #1a1a2e; font-size: 13px; }
.buyer-name:hover { color: #2563eb; }
.buyer-sub { font-size: 11px; color: #9ca3af; display: flex; align-items: center; gap: 4px; }
.fb-inline-link { font-size: 10px; padding: 1px 5px; background: #1877f2; color: #fff !important; border-radius: 3px; line-height: 1.4; text-decoration: none; font-weight: 600; flex-shrink: 0; }
.fb-inline-link:hover { background: #0c5de8; }
.num-badge { font-weight: 700; font-size: 14px; color: #1a1a2e; }
.rate-badge { font-weight: 600; font-size: 13px; color: #059669; }
.source-cell { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.source-referrer { font-size: 11px; color: #6b7280; }
.text-mono { font-family: monospace; font-size: 12px; color: #374151; }
.text-mono.small { font-size: 11px; }
.text-empty { color: #d1d5db; font-size: 12px; }
.profile-link { font-size: 12px; color: #2563eb; }
.date-text { font-size: 12px; color: #6b7280; }

.backup-contacts-editor { display: flex; flex-direction: column; gap: 6px; }
.bc-row { display: flex; align-items: center; gap: 8px; }

/* Drawer */
.drawer-body { display: flex; flex-direction: column; height: 100%; }
.drawer-header-card { display: flex; gap: 14px; padding: 18px 20px; background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%); border-bottom: 1px solid #e5e7eb; }
.drawer-former-names { font-size: 11px; color: #9ca3af; margin: 2px 0 4px; }
.former-name-tag { display: inline-block; background: #f3f4f6; color: #6b7280; border-radius: 3px; padding: 0 5px; margin-right: 4px; font-size: 11px; }
.former-names-hint { font-size: 11px; color: #9ca3af; margin-top: -6px; margin-bottom: 8px; }
.drawer-avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 20px; flex-shrink: 0; }
.drawer-header-info { flex: 1; min-width: 0; }
.drawer-name { font-size: 16px; font-weight: 700; color: #1a1a2e; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.drawer-number { font-size: 11px; color: #9ca3af; font-family: monospace; font-weight: 400; }
.drawer-meta { display: flex; align-items: center; gap: 6px; margin-top: 5px; flex-wrap: wrap; }
.drawer-country { font-size: 12px; color: #6b7280; }
.drawer-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }

/* KPI row */
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-bottom: 1px solid #f0f0f0; }
.kpi-card { padding: 14px 12px; text-align: center; border-right: 1px solid #f0f0f0; }
.kpi-card:last-child { border-right: none; }
.kpi-num { font-size: 20px; font-weight: 700; color: #1a1a2e; line-height: 1.2; }
.kpi-num.small { font-size: 13px; font-weight: 600; }
.kpi-num.kpi-warn { color: #dc2626; }
.kpi-card-sm { min-width: 60px; }
.kpi-num.blue { color: #2563eb; }
.kpi-num.teal { color: #0891b2; }
.kpi-num.gold { color: #d97706; }
.kpi-label { font-size: 11px; color: #8c8c8c; margin-top: 3px; }

.drawer-section { padding: 14px 20px; border-bottom: 1px solid #f0f0f0; }
.ds-title { font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
.ds-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.ds-item { display: flex; flex-direction: column; gap: 2px; }
.ds-label { font-size: 11px; color: #9ca3af; }
.ds-label-full { font-size: 11px; color: #9ca3af; }
.ds-block { margin-bottom: 10px; }
.ds-empty { font-size: 13px; color: #d1d5db; text-align: center; padding: 10px 0; }

.ref-name { font-size: 11px; color: #6b7280; margin-left: 4px; }
.link-text { font-size: 12px; color: #2563eb; }

.bc-list { margin-top: 10px; }
.bc-display-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.bc-type-badge { font-size: 11px; background: #f0f4ff; color: #2563eb; padding: 1px 7px; border-radius: 5px; border: 1px solid #c7d2fe; white-space: nowrap; }
.bc-value { font-size: 12px; font-family: monospace; color: #374151; }

.purchase-section-title { font-size: 11px; color: #9ca3af; margin-bottom: 6px; }
.asin-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.asin-tag { font-family: monospace; font-size: 11px; background: #eff6ff; color: #2563eb; padding: 2px 7px; border-radius: 5px; border: 1px solid #bfdbfe; }
.store-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.store-tag { font-size: 11px; background: #f0fdf4; color: #059669; padding: 2px 7px; border-radius: 5px; border: 1px solid #bbf7d0; }
.blacklist-section { background: #fef2f2; }
.blacklist-reason { font-size: 13px; color: #dc2626; }
.drawer-notes { font-size: 13px; color: #374151; line-height: 1.6; white-space: pre-wrap; }
.drawer-actions { display: flex; gap: 10px; padding: 14px 20px; border-top: 1px solid #f0f0f0; margin-top: auto; }
</style>
