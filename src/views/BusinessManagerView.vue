<template>
  <div class="page-content">
    <div class="page-header">
      <h1 class="page-title">商务管理</h1>
      <div class="header-actions">
        <a-input-search v-model:value="searchText" placeholder="搜索微信号/商务经理" style="width:220px" allow-clear @search="load" />
        <a-button @click="load"><ReloadOutlined /></a-button>
        <a-button type="primary" @click="openAddWechat()"><PlusOutlined /> 添加微信号</a-button>
        <a-button @click="openAddManager"><UserAddOutlined /> 添加商务经理</a-button>
      </div>
    </div>

    <!-- 商务经理汇总栏 -->
    <div v-if="managerList.length" class="manager-summary-bar">
      <div
        v-for="mgr in managerList"
        :key="mgr.id"
        :class="['mgr-tab', { active: activeMgrId === mgr.id }]"
        @click="activeMgrId = activeMgrId === mgr.id ? null : mgr.id"
      >
        <div class="mgr-tab-avatar" :style="{ background: mgr.avatar_color || '#2563eb' }">{{ mgr.name.charAt(0) }}</div>
        <div class="mgr-tab-body">
          <div class="mgr-tab-name">{{ mgr.name }}</div>
          <div class="mgr-kpi-grid">
            <div class="mgr-kpi-item">
              <span class="mgr-kpi-val blue">¥{{ formatMoneyShort(getMgrMonthAmount(mgr)) }}</span>
              <span class="mgr-kpi-lbl">本月业绩</span>
            </div>
            <div class="mgr-kpi-item">
              <span class="mgr-kpi-val teal">{{ getMgrMonthOrders(mgr) }}</span>
              <span class="mgr-kpi-lbl">本月下单</span>
            </div>
            <div class="mgr-kpi-item">
              <span :class="['mgr-kpi-val', getMgrRefundRate(mgr) > 10 ? 'red' : 'green']">{{ getMgrRefundRate(mgr) }}%</span>
              <span class="mgr-kpi-lbl">退单率</span>
            </div>
            <div class="mgr-kpi-item">
              <span :class="['mgr-kpi-val', getMgrDebt(mgr) > 0 ? 'red' : 'gray']">¥{{ formatMoneyShort(getMgrDebt(mgr)) }}</span>
              <span class="mgr-kpi-lbl">总欠款</span>
            </div>
            <div class="mgr-kpi-item">
              <span class="mgr-kpi-val orange">{{ getMgrNewClients(mgr) }}</span>
              <span class="mgr-kpi-lbl">本月新客</span>
            </div>
          </div>
        </div>
        <a-button type="link" size="small" @click.stop="openManagerDetail(mgr)" class="mgr-tab-edit"><EllipsisOutlined /></a-button>
      </div>
    </div>

    <div v-if="loading" class="loading-wrap"><a-spin size="large" /></div>

    <div v-else-if="filteredWechatList.length === 0" class="empty-wrap">
      <a-empty description="暂无微信号数据" />
    </div>

    <!-- 微信号主列表 -->
    <div v-else class="wechat-main-grid">
      <div
        v-for="acc in filteredWechatList"
        :key="acc.id"
        class="wechat-main-card"
        @click="openWechatDrawer(acc)"
      >
        <div class="wmc-header">
          <div class="wmc-icon">微</div>
          <div class="wmc-id-block">
            <div class="wmc-id">{{ acc.wechat_id }}</div>
            <div v-if="acc.wechat_nickname" class="wmc-nick">{{ acc.wechat_nickname }}</div>
          </div>
          <div class="wmc-right">
            <a-tag :color="acc.status === '在用' ? 'green' : acc.status === '停用' ? 'orange' : 'red'" style="margin:0">{{ acc.status }}</a-tag>
          </div>
        </div>

        <div class="wmc-manager-row" v-if="acc.manager_name">
          <UserOutlined style="font-size:11px;color:#9ca3af" />
          <span class="wmc-manager-name">{{ acc.manager_name }}</span>
          <a-button type="link" size="small" style="padding:0;height:auto;font-size:11px" @click.stop="openChangeManager(acc)">换人</a-button>
        </div>
        <div class="wmc-manager-row" v-else>
          <UserOutlined style="font-size:11px;color:#e5e7eb" />
          <span class="wmc-no-manager" @click.stop="openChangeManager(acc)">暂无负责商务 +</span>
        </div>

        <div class="wmc-stats">
          <div class="wmc-stat-item">
            <span class="wmc-stat-num blue">{{ acc.wechat_clients?.length || 0 }}</span>
            <span class="wmc-stat-lbl">客户数</span>
          </div>
          <div class="wmc-stat-sep"></div>
          <div class="wmc-stat-item">
            <span class="wmc-stat-num green">{{ getWechatActiveClients(acc) }}</span>
            <span class="wmc-stat-lbl">活跃</span>
          </div>
          <div class="wmc-stat-sep"></div>
          <div class="wmc-stat-item">
            <span class="wmc-stat-num orange">{{ getWechatNewClients(acc) }}</span>
            <span class="wmc-stat-lbl">本月新增</span>
          </div>
          <div class="wmc-stat-sep"></div>
          <div class="wmc-stat-item">
            <span :class="['wmc-stat-num', getWechatBalance(acc) < 0 ? 'red' : getWechatBalance(acc) > 0 ? 'teal' : 'gray']">
              ¥{{ formatMoneyShort(getWechatBalance(acc)) }}
            </span>
            <span class="wmc-stat-lbl">余额</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 微信号客户抽屉 -->
    <a-drawer
      v-model:open="wechatDrawerOpen"
      :title="null"
      placement="right"
      width="840"
      :body-style="{ padding: 0 }"
    >
      <template v-if="currentWechat">
        <div class="wechat-drawer-header">
          <div class="wechat-drawer-icon">微</div>
          <div class="wechat-drawer-title-block">
            <div class="wechat-drawer-id">{{ currentWechat.wechat_id }}</div>
            <div class="wechat-drawer-nick">{{ currentWechat.wechat_nickname || '未设置昵称' }}</div>
          </div>
          <div class="wechat-drawer-tags">
            <a-tag :color="currentWechat.status === '在用' ? 'green' : currentWechat.status === '停用' ? 'orange' : 'red'">{{ currentWechat.status }}</a-tag>
          </div>
          <div class="wechat-drawer-actions">
            <a-button type="link" size="small" danger @click="confirmDeleteWechat(currentWechat)"><DeleteOutlined /></a-button>
          </div>
        </div>

        <!-- 负责商务 -->
        <div class="wechat-manager-bar">
          <span class="wmb-label">负责商务：</span>
          <span v-if="currentWechat.manager_name" class="wmb-name">{{ currentWechat.manager_name }}</span>
          <span v-else class="wmb-empty">暂未分配</span>
          <a-button type="link" size="small" @click="openChangeManager(currentWechat)">更换 ›</a-button>
        </div>

        <!-- 汇总统计 -->
        <div class="wechat-summary-row">
          <div class="wsum-item">
            <div class="wsum-num blue">{{ clientList.length }}</div>
            <div class="wsum-lbl">管理客户</div>
          </div>
          <div class="wsum-sep"></div>
          <div class="wsum-item">
            <div class="wsum-num green">{{ clientList.filter(c => c.status === '活跃').length }}</div>
            <div class="wsum-lbl">活跃客户</div>
          </div>
          <div class="wsum-sep"></div>
          <div class="wsum-item">
            <div class="wsum-num orange">{{ getDrawerNewClients() }}</div>
            <div class="wsum-lbl">本月新增</div>
          </div>
          <div class="wsum-sep"></div>
          <div class="wsum-item">
            <div class="wsum-num teal">{{ clientOrderStats.total_order_count }}</div>
            <div class="wsum-lbl">累计下单次</div>
          </div>
          <div class="wsum-sep"></div>
          <div class="wsum-item">
            <div class="wsum-num orange">{{ clientOrderStats.total_order_quantity }}</div>
            <div class="wsum-lbl">累计单量</div>
          </div>
          <div class="wsum-sep"></div>
          <div class="wsum-item">
            <div class="wsum-num green">¥{{ formatMoney(clientOrderStats.total_order_amount) }}</div>
            <div class="wsum-lbl">累计金额</div>
          </div>
        </div>

        <div class="wechat-drawer-body">
          <div class="wechat-drawer-toolbar">
            <span class="client-count-tip">共 {{ clientList.length }} 位客户</span>
            <a-button type="primary" size="small" @click="openAddClient"><PlusOutlined /> 添加客户</a-button>
          </div>

          <div v-if="clientLoading" style="text-align:center;padding:32px"><a-spin /></div>
          <div v-else-if="!clientList.length" class="wechat-empty">暂无客户数据</div>
          <div v-else class="client-expand-list">
            <div
              v-for="c in clientList"
              :key="c.id"
              :class="['client-expand-item', { 'is-expanded': expandedClientId === c.id, 'is-debt': (clientFinanceMap[c.client_name]?.balance || 0) < 0 }]"
            >
              <!-- 客户行 -->
              <div class="cei-row" @click="toggleClientExpand(c)">
                <div class="cei-avatar">{{ c.client_name.charAt(0) }}</div>
                <div class="cei-main">
                  <div class="cei-name-line">
                    <span class="cei-name">{{ c.client_name }}</span>
                    <a-tag :color="c.status === '活跃' ? 'green' : c.status === '沉默' ? 'orange' : 'default'" style="margin:0;font-size:10px;line-height:18px;padding:0 5px">{{ c.status }}</a-tag>
                    <span v-if="c.feedback_type" class="cei-feedback-tag">{{ c.feedback_type }}</span>
                  </div>
                  <div class="cei-sub-line">
                    <span v-if="c.company_name" class="cei-company"><BankOutlined style="font-size:10px" /> {{ c.company_name }}</span>
                    <span v-if="c.client_wechat" class="cei-wechat">{{ c.client_wechat }}</span>
                    <span v-if="c.remark" class="cei-remark">{{ c.remark }}</span>
                  </div>
                </div>
                <div class="cei-stats">
                  <div class="cei-stat">
                    <span class="cei-stat-val blue">{{ clientOrderStatsMap[c.client_name]?.order_quantity || 0 }}</span>
                    <span class="cei-stat-lbl">下单量</span>
                  </div>
                  <div class="cei-stat">
                    <span :class="['cei-stat-val', (clientOrderStatsMap[c.client_name]?.refund_count || 0) > 0 ? 'orange' : 'gray']">{{ clientOrderStatsMap[c.client_name]?.refund_count || 0 }}</span>
                    <span class="cei-stat-lbl">退单</span>
                  </div>
                  <div class="cei-stat">
                    <span :class="['cei-stat-val', (clientFinanceMap[c.client_name]?.balance || 0) < 0 ? 'red' : (clientFinanceMap[c.client_name]?.balance || 0) > 0 ? 'teal' : 'gray']">
                      ¥{{ formatMoneyShort(clientFinanceMap[c.client_name]?.balance || 0) }}
                    </span>
                    <span class="cei-stat-lbl">余额</span>
                  </div>
                </div>
                <div class="cei-actions" @click.stop>
                  <a-button type="primary" size="small" ghost style="font-size:11px;height:24px;padding:0 8px" @click.stop="openGenerateBill(c)">账单</a-button>
                  <a-button type="link" size="small" danger style="padding:0;height:24px" @click.stop="confirmDeleteClient(c)"><DeleteOutlined /></a-button>
                </div>
                <div class="cei-expand-arrow" :class="{ rotated: expandedClientId === c.id }">
                  <DownOutlined style="font-size:11px;color:#9ca3af" />
                </div>
              </div>

              <!-- 展开详情 -->
              <div v-if="expandedClientId === c.id" class="cei-detail">
                <div class="cei-detail-grid">
                  <!-- 资金情况 -->
                  <div class="ced-block">
                    <div class="ced-block-title">资金情况</div>
                    <div class="ced-finance-row">
                      <div class="ced-fin-item">
                        <div :class="['ced-fin-val', (clientFinanceMap[c.client_name]?.balance || 0) < 0 ? 'red' : (clientFinanceMap[c.client_name]?.balance || 0) > 0 ? 'teal' : 'gray']">
                          ¥{{ formatMoney(clientFinanceMap[c.client_name]?.balance || 0) }}
                        </div>
                        <div class="ced-fin-lbl">余额</div>
                      </div>
                      <div class="ced-fin-sep"></div>
                      <div class="ced-fin-item">
                        <div :class="['ced-fin-val', (clientFinanceMap[c.client_name]?.debt || 0) > 0 ? 'red' : 'gray']">
                          ¥{{ formatMoney(clientFinanceMap[c.client_name]?.debt || 0) }}
                        </div>
                        <div class="ced-fin-lbl">欠款</div>
                      </div>
                      <div class="ced-fin-sep"></div>
                      <div class="ced-fin-item">
                        <div :class="['ced-fin-val', (clientFinanceMap[c.client_name]?.prepaid || 0) > 0 ? 'teal' : 'gray']">
                          ¥{{ formatMoney(clientFinanceMap[c.client_name]?.prepaid || 0) }}
                        </div>
                        <div class="ced-fin-lbl">溢款</div>
                      </div>
                    </div>
                  </div>

                  <!-- 基本信息 -->
                  <div class="ced-block">
                    <div class="ced-block-title">基本信息</div>
                    <div class="ced-info-grid">
                      <div class="ced-info-item">
                        <span class="ced-info-lbl">公司归属</span>
                        <span class="ced-info-val">{{ c.company_name || '—' }}</span>
                      </div>
                      <div class="ced-info-item">
                        <span class="ced-info-lbl">微信号</span>
                        <span class="ced-info-val">{{ c.client_wechat || '—' }}</span>
                      </div>
                      <div class="ced-info-item">
                        <span class="ced-info-lbl">反馈方式</span>
                        <span class="ced-info-val">{{ c.feedback_type || '私发' }}</span>
                      </div>
                      <div class="ced-info-item">
                        <span class="ced-info-lbl">客户ID</span>
                        <span class="ced-info-val mono">{{ clientOrderStatsMap[c.client_name]?.client_id || '—' }}</span>
                      </div>
                      <div class="ced-info-item">
                        <span class="ced-info-lbl">公司ID</span>
                        <span class="ced-info-val mono">{{ clientOrderStatsMap[c.client_name]?.company_id || '—' }}</span>
                      </div>
                      <div class="ced-info-item">
                        <span class="ced-info-lbl">备注标记</span>
                        <span class="ced-info-val">{{ c.remark || '—' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 下单统计 -->
                  <div class="ced-block ced-block-full">
                    <div class="ced-block-title">下单统计</div>
                    <div class="ced-order-stats">
                      <div class="ced-os-item">
                        <div class="ced-os-val blue">{{ clientOrderStatsMap[c.client_name]?.order_count || 0 }}</div>
                        <div class="ced-os-lbl">下单次数</div>
                      </div>
                      <div class="ced-os-sep"></div>
                      <div class="ced-os-item">
                        <div class="ced-os-val teal">{{ clientOrderStatsMap[c.client_name]?.order_quantity || 0 }}</div>
                        <div class="ced-os-lbl">下单单量</div>
                      </div>
                      <div class="ced-os-sep"></div>
                      <div class="ced-os-item">
                        <div class="ced-os-val green">¥{{ formatMoney(clientOrderStatsMap[c.client_name]?.order_amount) }}</div>
                        <div class="ced-os-lbl">下单金额</div>
                      </div>
                      <div class="ced-os-sep"></div>
                      <div class="ced-os-item">
                        <div :class="['ced-os-val', (clientOrderStatsMap[c.client_name]?.refund_count || 0) > 0 ? 'orange' : 'gray']">{{ clientOrderStatsMap[c.client_name]?.refund_count || 0 }}</div>
                        <div class="ced-os-lbl">退单次数</div>
                      </div>
                      <div class="ced-os-sep"></div>
                      <div class="ced-os-item">
                        <div :class="['ced-os-val', (clientOrderStatsMap[c.client_name]?.pending_count || 0) > 0 ? 'blue' : 'gray']">{{ clientOrderStatsMap[c.client_name]?.pending_count || 0 }}</div>
                        <div class="ced-os-lbl">待结任务</div>
                      </div>
                    </div>
                  </div>

                  <div v-if="c.notes" class="ced-block ced-block-full">
                    <div class="ced-block-title">备注</div>
                    <div class="ced-notes">{{ c.notes }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </a-drawer>

    <!-- 商务经理详情/编辑抽屉 -->
    <a-drawer
      v-model:open="managerDetailOpen"
      :title="null"
      placement="right"
      width="480"
      :body-style="{ padding: 0 }"
    >
      <template v-if="detailManager">
        <div class="drawer-header">
          <div class="drawer-avatar" :style="{ background: detailManager.avatar_color || '#2563eb' }">{{ detailManager.name.charAt(0) }}</div>
          <div class="drawer-title-block">
            <div class="drawer-name">{{ detailManager.name }}</div>
            <div class="drawer-sub">
              <a-tag :color="detailManager.status === '在职' ? 'green' : 'default'">{{ detailManager.status }}</a-tag>
              <span v-if="detailManager.join_date" class="drawer-join">入职 {{ formatDate(detailManager.join_date) }}</span>
            </div>
          </div>
          <div class="drawer-header-actions">
            <a-button type="link" size="small" danger @click="confirmDeleteManager(detailManager)"><DeleteOutlined /> 删除</a-button>
          </div>
        </div>

        <div class="drawer-body">
          <div class="drawer-section">
            <div class="section-title">基本信息</div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">手机号</span><span class="info-val">{{ detailManager.phone || '—' }}</span></div>
              <div class="info-item"><span class="info-label">邮箱</span><span class="info-val">{{ detailManager.email || '—' }}</span></div>
              <div class="info-item"><span class="info-label">入职日期</span><span class="info-val">{{ detailManager.join_date ? formatDate(detailManager.join_date) : '—' }}</span></div>
            </div>
          </div>

          <!-- 财务汇总 -->
          <div class="drawer-section">
            <div class="section-title">财务汇总（管理微信名下）</div>
            <div class="mgr-finance-summary">
              <div class="mfs-item">
                <div :class="['mfs-num', getMgrBalance(detailManager) < 0 ? 'red' : getMgrBalance(detailManager) > 0 ? 'teal' : 'gray']">
                  ¥{{ formatMoney(getMgrBalance(detailManager)) }}
                </div>
                <div class="mfs-lbl">总余额</div>
              </div>
              <div class="mfs-sep"></div>
              <div class="mfs-item">
                <div :class="['mfs-num', getMgrDebt(detailManager) > 0 ? 'red' : 'gray']">
                  ¥{{ formatMoney(getMgrDebt(detailManager)) }}
                </div>
                <div class="mfs-lbl">总欠款</div>
              </div>
              <div class="mfs-sep"></div>
              <div class="mfs-item">
                <div :class="['mfs-num', getMgrPrepaid(detailManager) > 0 ? 'teal' : 'gray']">
                  ¥{{ formatMoney(getMgrPrepaid(detailManager)) }}
                </div>
                <div class="mfs-lbl">总溢款</div>
              </div>
            </div>
          </div>

          <!-- 负责微信号 -->
          <div class="drawer-section">
            <div class="section-title-row">
              <span class="section-title" style="border:none;margin:0;padding:0">负责微信号</span>
              <a-button type="primary" size="small" @click="openAddWechat(detailManager)"><PlusOutlined /> 添加微信号</a-button>
            </div>
            <div v-if="!getMgrWechats(detailManager).length" class="empty-text">暂无负责微信号</div>
            <div v-else class="wechat-list">
              <div v-for="acc in getMgrWechats(detailManager)" :key="acc.id" class="wechat-item">
                <div class="witem-left">
                  <div class="witem-id">{{ acc.wechat_id }}</div>
                  <div v-if="acc.wechat_nickname" class="witem-nick">{{ acc.wechat_nickname }}</div>
                </div>
                <div class="witem-mid">
                  <div class="witem-stat">
                    <span class="wstat-num">{{ acc.wechat_clients?.length || 0 }}</span>
                    <span class="wstat-label">客户</span>
                  </div>
                </div>
                <div class="witem-right">
                  <a-tag :color="acc.status === '在用' ? 'green' : acc.status === '停用' ? 'orange' : 'red'" style="margin:0">{{ acc.status }}</a-tag>
                  <a-button type="link" size="small" @click="openWechatDrawer(acc)">查看</a-button>
                </div>
              </div>
            </div>
          </div>

          <div class="drawer-stats-row">
            <div class="dstat-card">
              <div class="dstat-num blue">{{ getMgrWechatCount(detailManager) }}</div>
              <div class="dstat-label">商务微信数</div>
            </div>
            <div class="dstat-card">
              <div class="dstat-num green">{{ getMgrClientCount(detailManager) }}</div>
              <div class="dstat-label">管理客户总数</div>
            </div>
            <div class="dstat-card">
              <div class="dstat-num orange">{{ getMgrActiveClients(detailManager) }}</div>
              <div class="dstat-label">活跃客户数</div>
            </div>
          </div>
        </div>
      </template>
    </a-drawer>

    <!-- 添加商务经理 Modal -->
    <a-modal v-model:open="managerModalOpen" title="添加商务经理" @ok="handleAddManager" :confirm-loading="submitting" ok-text="确定" cancel-text="取消">
      <a-form layout="vertical" style="margin-top:8px">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="姓名" required><a-input v-model:value="managerForm.name" placeholder="请输入姓名" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="手机号"><a-input v-model:value="managerForm.phone" placeholder="请输入手机号" /></a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="邮箱"><a-input v-model:value="managerForm.email" placeholder="请输入邮箱" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="入职日期"><a-date-picker v-model:value="managerForm.join_date" style="width:100%" placeholder="选择入职日期" /></a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注"><a-textarea v-model:value="managerForm.notes" :rows="2" placeholder="备注信息" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 添加微信号 Modal -->
    <a-modal
      v-model:open="wechatModalOpen"
      :title="currentManager ? `为 ${currentManager.name} 添加商务微信号` : '添加商务微信号'"
      @ok="handleAddWechat"
      :confirm-loading="submitting"
      ok-text="确定"
      cancel-text="取消"
    >
      <a-form layout="vertical" style="margin-top:8px">
        <a-form-item label="归属商务经理">
          <a-select v-model:value="wechatForm.manager_id" placeholder="选择负责商务经理（可不选）" allow-clear show-search>
            <a-select-option v-for="m in managerList" :key="m.id" :value="m.id">{{ m.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="微信号" required><a-input v-model:value="wechatForm.wechat_id" placeholder="请输入微信号" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="微信昵称"><a-input v-model:value="wechatForm.wechat_nickname" placeholder="请输入微信昵称" /></a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="状态">
          <a-select v-model:value="wechatForm.status">
            <a-select-option value="在用">在用</a-select-option>
            <a-select-option value="停用">停用</a-select-option>
            <a-select-option value="封号">封号</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="wechatForm.notes" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 更换负责商务 Modal -->
    <a-modal
      v-model:open="changeManagerOpen"
      title="更换负责商务经理"
      @ok="handleChangeManager"
      :confirm-loading="submitting"
      ok-text="确定"
      cancel-text="取消"
    >
      <div style="margin-top:8px">
        <a-select v-model:value="changeManagerId" placeholder="选择商务经理" style="width:100%" allow-clear>
          <a-select-option v-for="m in managerList" :key="m.id" :value="m.id">{{ m.name }}</a-select-option>
        </a-select>
      </div>
    </a-modal>

    <!-- 添加客户 Modal -->
    <a-modal v-model:open="addClientModalOpen" title="添加客户" @ok="handleAddClient" :confirm-loading="submitting" ok-text="确定" cancel-text="取消" width="520px">
      <a-form layout="vertical" style="margin-top:8px">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="客户名称" required><a-input v-model:value="clientForm.client_name" placeholder="请输入客户名称" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="客户微信号"><a-input v-model:value="clientForm.client_wechat" placeholder="请输入客户微信号" /></a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="归属公司"><a-input v-model:value="clientForm.company_name" placeholder="请输入归属公司名称" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="反馈方式">
              <a-select v-model:value="clientForm.feedback_type">
                <a-select-option value="私发">私发</a-select-option>
                <a-select-option value="群聊">群聊</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注标记"><a-input v-model:value="clientForm.remark" placeholder="如：高价值客户、长期合作等" /></a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="clientForm.status">
            <a-select-option value="活跃">活跃</a-select-option>
            <a-select-option value="沉默">沉默</a-select-option>
            <a-select-option value="流失">流失</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="clientForm.notes" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, DeleteOutlined, UserAddOutlined, UserOutlined, BankOutlined, EllipsisOutlined, DownOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'

const loading = ref(false)
const managerList = ref<any[]>([])
const wechatList = ref<any[]>([])
const searchText = ref('')
const activeMgrId = ref<string | null>(null)

const managerModalOpen = ref(false)
const wechatModalOpen = ref(false)
const addClientModalOpen = ref(false)
const changeManagerOpen = ref(false)
const submitting = ref(false)
const clientLoading = ref(false)
const wechatDrawerOpen = ref(false)
const managerDetailOpen = ref(false)

const detailManager = ref<any>(null)
const currentManager = ref<any>(null)
const currentWechat = ref<any>(null)
const changeManagerTarget = ref<any>(null)
const changeManagerId = ref<string>('')
const clientList = ref<any[]>([])
const expandedClientId = ref<string | null>(null)

const managerForm = reactive({ name: '', phone: '', email: '', join_date: null as any, notes: '' })
const wechatForm = reactive({ wechat_id: '', wechat_nickname: '', status: '在用', notes: '', manager_id: '' as string })
const clientForm = reactive({ client_name: '', client_wechat: '', company_name: '', feedback_type: '私发', remark: '', status: '活跃', notes: '' })

const clientOrderStatsMap = ref<Record<string, { order_count: number; order_quantity: number; order_amount: number; refund_count: number; pending_count: number; client_id: string; company_id: string }>>({})
const clientOrderStats = ref({ total_order_count: 0, total_order_quantity: 0, total_order_amount: 0 })
const clientFinanceMap = ref<Record<string, { debt: number; prepaid: number; balance: number }>>({})
const clientContactInfo = ref<Record<string, { client_id: string; company_name: string; company_id: string }>>({})
const mgrMonthStats = ref<Record<string, { amount: number; orders: number; refunds: number; newClients: number }>>({})

const thisMonthStart = dayjs().startOf('month').format('YYYY-MM-DD')
const thisMonthEnd = dayjs().endOf('month').format('YYYY-MM-DD') + ' 23:59:59'

const filteredWechatList = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  let list = wechatList.value
  if (activeMgrId.value) {
    list = list.filter(acc => acc.manager_id === activeMgrId.value)
  }
  if (!q) return list
  return list.filter(acc =>
    acc.wechat_id?.toLowerCase().includes(q) ||
    acc.wechat_nickname?.toLowerCase().includes(q) ||
    acc.manager_name?.toLowerCase().includes(q)
  )
})

function formatMoney(n: any): string {
  const num = Number(n || 0)
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatMoneyShort(n: any): string {
  const num = Number(n || 0)
  const abs = Math.abs(num)
  const sign = num < 0 ? '-' : ''
  if (abs >= 10000) return sign + (abs / 10000).toFixed(1) + 'w'
  return sign + abs.toFixed(0)
}

function formatDate(d: string) {
  return dayjs(d).format('YYYY-MM-DD')
}

function getMgrWechats(mgr: any): any[] {
  return wechatList.value.filter(acc => acc.manager_id === mgr.id)
}

function getMgrWechatCount(mgr: any): number {
  return getMgrWechats(mgr).length
}

function getMgrClientCount(mgr: any): number {
  return getMgrWechats(mgr).reduce((s, acc) => s + (acc.wechat_clients?.length || 0), 0)
}

function getMgrActiveClients(mgr: any): number {
  return getMgrWechats(mgr).reduce((s, acc) => s + (acc.wechat_clients?.filter((c: any) => c.status === '活跃').length || 0), 0)
}

function getMgrDebt(mgr: any): number {
  return getMgrWechats(mgr).reduce((s, acc) => {
    return s + (acc.wechat_clients || []).reduce((ss: number, c: any) => {
      return ss + (clientFinanceMap.value[c.client_name]?.debt || 0)
    }, 0)
  }, 0)
}

function getMgrPrepaid(mgr: any): number {
  return getMgrWechats(mgr).reduce((s, acc) => {
    return s + (acc.wechat_clients || []).reduce((ss: number, c: any) => {
      return ss + (clientFinanceMap.value[c.client_name]?.prepaid || 0)
    }, 0)
  }, 0)
}

function getMgrBalance(mgr: any): number {
  return getMgrPrepaid(mgr) - getMgrDebt(mgr)
}

function getMgrMonthAmount(mgr: any): number {
  return mgrMonthStats.value[mgr.id]?.amount || 0
}

function getMgrMonthOrders(mgr: any): number {
  return mgrMonthStats.value[mgr.id]?.orders || 0
}

function getMgrRefundRate(mgr: any): number {
  const s = mgrMonthStats.value[mgr.id]
  if (!s || !s.orders) return 0
  return Math.round((s.refunds / s.orders) * 100)
}

function getMgrNewClients(mgr: any): number {
  return getMgrWechats(mgr).reduce((s, acc) => {
    return s + (acc.wechat_clients || []).filter((c: any) => {
      if (!c.created_at) return false
      return dayjs(c.created_at).isAfter(dayjs().startOf('month'))
    }).length
  }, 0)
}

function getWechatActiveClients(acc: any): number {
  return (acc.wechat_clients || []).filter((c: any) => c.status === '活跃').length
}

function getWechatBalance(acc: any): number {
  return (acc.wechat_clients || []).reduce((s: number, c: any) => {
    return s + (clientFinanceMap.value[c.client_name]?.balance || 0)
  }, 0)
}

function getWechatNewClients(acc: any): number {
  return (acc.wechat_clients || []).filter((c: any) => {
    if (!c.created_at) return false
    return dayjs(c.created_at).isAfter(dayjs().startOf('month'))
  }).length
}

function getDrawerNewClients(): number {
  return clientList.value.filter(c => {
    if (!c.created_at) return false
    return dayjs(c.created_at).isAfter(dayjs().startOf('month'))
  }).length
}

function toggleClientExpand(c: any) {
  expandedClientId.value = expandedClientId.value === c.id ? null : c.id
}

async function load() {
  loading.value = true
  try {
    const [{ data: managers }, { data: wechats }] = await Promise.all([
      supabase.from('business_managers').select('*').eq('status', '在职').order('created_at', { ascending: false }),
      supabase.from('business_wechat_accounts').select('*, wechat_clients(*)').order('created_at', { ascending: false }),
    ])
    managerList.value = managers || []
    const mgrMap: Record<string, string> = {}
    for (const m of managerList.value) mgrMap[m.id] = m.name
    wechatList.value = (wechats || []).map(acc => ({
      ...acc,
      manager_name: acc.manager_id ? mgrMap[acc.manager_id] || '' : '',
    }))

    await Promise.all([loadAllFinance(), loadMgrMonthStats()])

    if (detailManager.value) {
      detailManager.value = managerList.value.find(m => m.id === detailManager.value.id) || null
    }
  } finally {
    loading.value = false
  }
}

async function loadAllFinance() {
  const allClientNames: string[] = []
  for (const acc of wechatList.value) {
    for (const c of acc.wechat_clients || []) {
      if (c.client_name && !allClientNames.includes(c.client_name)) {
        allClientNames.push(c.client_name)
      }
    }
  }
  if (!allClientNames.length) return

  const { data: contacts } = await supabase
    .from('client_contacts')
    .select('name, client_id, debt_amount_cny, prepaid_amount_cny, company_id')
    .in('name', allClientNames)

  const finMap: Record<string, { debt: number; prepaid: number; balance: number }> = {}
  const infoMap: Record<string, { client_id: string; company_name: string; company_id: string }> = {}
  for (const ct of contacts || []) {
    const debt = Number(ct.debt_amount_cny || 0)
    const prepaid = Number(ct.prepaid_amount_cny || 0)
    finMap[ct.name] = { debt, prepaid, balance: prepaid - debt }
    infoMap[ct.name] = { client_id: ct.client_id || '', company_name: '', company_id: ct.company_id || '' }
  }
  clientFinanceMap.value = finMap
  clientContactInfo.value = infoMap
}

async function loadMgrMonthStats() {
  const statsMap: Record<string, { amount: number; orders: number; refunds: number; newClients: number }> = {}
  for (const mgr of managerList.value) {
    statsMap[mgr.id] = { amount: 0, orders: 0, refunds: 0, newClients: 0 }
  }

  const allClientNames: string[] = []
  for (const acc of wechatList.value) {
    for (const c of acc.wechat_clients || []) {
      if (c.client_name && !allClientNames.includes(c.client_name)) {
        allClientNames.push(c.client_name)
      }
    }
  }
  if (!allClientNames.length) {
    mgrMonthStats.value = statsMap
    return
  }

  const { data: contacts } = await supabase
    .from('client_contacts')
    .select('name, client_id')
    .in('name', allClientNames)

  const nameToClientId: Record<string, string> = {}
  for (const ct of contacts || []) {
    if (ct.client_id) nameToClientId[ct.name] = ct.client_id
  }

  const clientIds = Object.values(nameToClientId).filter(Boolean)
  if (!clientIds.length) {
    mgrMonthStats.value = statsMap
    return
  }

  const [{ data: orderData }, { data: subOrderData }] = await Promise.all([
    supabase.from('erp_orders').select('customer_id_str, total_amount, total_orders').in('customer_id_str', clientIds).gte('created_at', thisMonthStart).lte('created_at', thisMonthEnd),
    supabase.from('sub_orders').select('customer_id_str, refund_status').in('customer_id_str', clientIds).gte('created_at', thisMonthStart).lte('created_at', thisMonthEnd),
  ])

  const clientIdToName: Record<string, string> = {}
  for (const [name, cid] of Object.entries(nameToClientId)) {
    clientIdToName[cid] = name
  }

  const clientNameToMgrId: Record<string, string> = {}
  for (const acc of wechatList.value) {
    if (!acc.manager_id) continue
    for (const c of acc.wechat_clients || []) {
      if (c.client_name) clientNameToMgrId[c.client_name] = acc.manager_id
    }
  }

  for (const o of orderData || []) {
    const name = clientIdToName[o.customer_id_str]
    const mgrId = name ? clientNameToMgrId[name] : null
    if (!mgrId || !statsMap[mgrId]) continue
    statsMap[mgrId].amount += Number(o.total_amount || 0)
    statsMap[mgrId].orders += Number(o.total_orders || 0)
  }
  for (const so of subOrderData || []) {
    const name = clientIdToName[so.customer_id_str]
    const mgrId = name ? clientNameToMgrId[name] : null
    if (!mgrId || !statsMap[mgrId]) continue
    if (so.refund_status && so.refund_status !== '') statsMap[mgrId].refunds += 1
  }

  mgrMonthStats.value = statsMap
}

function openWechatDrawer(acc: any) {
  currentWechat.value = acc
  wechatDrawerOpen.value = true
  expandedClientId.value = null
  loadClients(acc.id)
}

function openManagerDetail(mgr: any) {
  detailManager.value = mgr
  managerDetailOpen.value = true
}

function openAddManager() {
  Object.assign(managerForm, { name: '', phone: '', email: '', join_date: null, notes: '' })
  managerModalOpen.value = true
}

async function handleAddManager() {
  if (!managerForm.name.trim()) { message.warning('请输入姓名'); return }
  submitting.value = true
  try {
    const { error } = await supabase.from('business_managers').insert([{
      name: managerForm.name.trim(),
      phone: managerForm.phone,
      email: managerForm.email,
      join_date: managerForm.join_date ? dayjs(managerForm.join_date).format('YYYY-MM-DD') : null,
      notes: managerForm.notes,
      avatar_color: randomColor(),
    }])
    if (error) throw error
    message.success('商务经理已添加')
    managerModalOpen.value = false
    load()
  } catch (e: any) {
    message.error('添加失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

function confirmDeleteManager(record: any) {
  Modal.confirm({
    title: `确定删除商务经理「${record.name}」？`,
    content: '删除后该经理将被移除，其名下微信号不会被删除。',
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      const { error } = await supabase.from('business_managers').delete().eq('id', record.id)
      if (error) { message.error('删除失败：' + error.message); return }
      message.success('已删除')
      managerDetailOpen.value = false
      load()
    },
  })
}

function openAddWechat(manager?: any) {
  currentManager.value = manager || null
  Object.assign(wechatForm, {
    wechat_id: '',
    wechat_nickname: '',
    status: '在用',
    notes: '',
    manager_id: manager?.id || '',
  })
  wechatModalOpen.value = true
}

async function handleAddWechat() {
  if (!wechatForm.wechat_id.trim()) { message.warning('请输入微信号'); return }
  submitting.value = true
  try {
    const { error } = await supabase.from('business_wechat_accounts').insert([{
      wechat_id: wechatForm.wechat_id,
      wechat_nickname: wechatForm.wechat_nickname,
      status: wechatForm.status,
      notes: wechatForm.notes,
      manager_id: wechatForm.manager_id || null,
      staff_id: null,
      client_count: 0,
    }])
    if (error) throw error
    message.success('微信号已添加')
    wechatModalOpen.value = false
    load()
  } catch (e: any) {
    message.error('添加失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

function confirmDeleteWechat(acc: any) {
  Modal.confirm({
    title: `确定删除微信号「${acc.wechat_id}」？`,
    content: '删除后该微信号下的客户数据也将一并删除。',
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      const { error } = await supabase.from('business_wechat_accounts').delete().eq('id', acc.id)
      if (error) { message.error('删除失败：' + error.message); return }
      message.success('已删除')
      wechatDrawerOpen.value = false
      load()
    },
  })
}

function openChangeManager(acc: any) {
  changeManagerTarget.value = acc
  changeManagerId.value = acc.manager_id || ''
  changeManagerOpen.value = true
}

async function handleChangeManager() {
  if (!changeManagerTarget.value) return
  submitting.value = true
  try {
    const mgr = managerList.value.find(m => m.id === changeManagerId.value)
    const { error } = await supabase
      .from('business_wechat_accounts')
      .update({ manager_id: changeManagerId.value || null })
      .eq('id', changeManagerTarget.value.id)
    if (error) throw error
    message.success('负责商务已更新')
    changeManagerOpen.value = false
    if (currentWechat.value?.id === changeManagerTarget.value.id) {
      currentWechat.value = { ...currentWechat.value, manager_id: changeManagerId.value, manager_name: mgr?.name || '' }
    }
    load()
  } catch (e: any) {
    message.error('更新失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

async function loadClients(wechatAccountId: string) {
  clientLoading.value = true
  clientOrderStatsMap.value = {}
  clientOrderStats.value = { total_order_count: 0, total_order_quantity: 0, total_order_amount: 0 }
  try {
    const { data, error } = await supabase
      .from('wechat_clients')
      .select('*')
      .eq('wechat_account_id', wechatAccountId)
      .order('created_at', { ascending: false })
    if (error) throw error
    clientList.value = data || []

    if (clientList.value.length) {
      const names = clientList.value.map((c: any) => c.client_name).filter(Boolean)

      const { data: contactData } = await supabase
        .from('client_contacts')
        .select('name, client_id, company_id')
        .in('name', names)

      const clientIdToName: Record<string, string> = {}
      const nameToClientId: Record<string, string> = {}
      const nameToCompanyId: Record<string, string> = {}
      for (const ct of contactData || []) {
        if (ct.client_id) {
          clientIdToName[ct.client_id] = ct.name
          nameToClientId[ct.name] = ct.client_id
        }
        if (ct.company_id) nameToCompanyId[ct.name] = ct.company_id
      }

      const companyIds = [...new Set(Object.values(nameToCompanyId).filter(Boolean))]
      const companyIdToOrgId: Record<string, string> = {}
      if (companyIds.length) {
        const { data: compData } = await supabase
          .from('client_companies')
          .select('id, org_id')
          .in('id', companyIds)
        for (const comp of compData || []) {
          companyIdToOrgId[comp.id] = comp.org_id || comp.id
        }
      }

      type StatsEntry = { order_count: number; order_quantity: number; order_amount: number; refund_count: number; pending_count: number; client_id: string; company_id: string }
      const statsMap: Record<string, StatsEntry> = {}
      for (const name of names) {
        const cid = nameToCompanyId[name] || ''
        statsMap[name] = {
          order_count: 0, order_quantity: 0, order_amount: 0,
          refund_count: 0, pending_count: 0,
          client_id: nameToClientId[name] || '',
          company_id: cid ? (companyIdToOrgId[cid] || cid) : '',
        }
      }

      const clientIds = Object.keys(clientIdToName)
      if (clientIds.length) {
        const [{ data: orderData }, { data: subOrderData }] = await Promise.all([
          supabase.from('erp_orders').select('customer_id_str, total_orders, total_amount').in('customer_id_str', clientIds),
          supabase.from('sub_orders').select('customer_id_str, refund_status, status').in('customer_id_str', clientIds),
        ])
        for (const o of orderData || []) {
          const name = clientIdToName[o.customer_id_str]
          if (!name || !statsMap[name]) continue
          statsMap[name].order_count += 1
          statsMap[name].order_quantity += Number(o.total_orders || 0)
          statsMap[name].order_amount += Number(o.total_amount || 0)
        }
        const pendingStatuses = ['待接单', '已接单', '已下单', '待确认', '进行中']
        for (const so of subOrderData || []) {
          const name = clientIdToName[so.customer_id_str]
          if (!name || !statsMap[name]) continue
          if (so.refund_status && so.refund_status !== '') statsMap[name].refund_count += 1
          if (pendingStatuses.includes(so.status)) statsMap[name].pending_count += 1
        }
      }

      clientOrderStatsMap.value = statsMap
      const totals = Object.values(statsMap)
      clientOrderStats.value = {
        total_order_count: totals.reduce((s, v) => s + v.order_count, 0),
        total_order_quantity: totals.reduce((s, v) => s + v.order_quantity, 0),
        total_order_amount: totals.reduce((s, v) => s + v.order_amount, 0),
      }
    }
  } finally {
    clientLoading.value = false
  }
}

function openGenerateBill(c: any) {
  const balance = clientFinanceMap.value[c.client_name]?.balance || 0
  const stats = clientOrderStatsMap.value[c.client_name]
  Modal.info({
    title: `账单生成 — ${c.client_name}`,
    content: `客户ID：${stats?.client_id || '未关联'}\n归属公司：${c.company_name || '—'}\n资金余额：¥${formatMoney(balance)}\n累计下单：${stats?.order_quantity || 0} 单\n待结任务：${stats?.pending_count || 0} 个`,
    okText: '确定',
  })
}

function openAddClient() {
  Object.assign(clientForm, { client_name: '', client_wechat: '', company_name: '', feedback_type: '私发', remark: '', status: '活跃', notes: '' })
  addClientModalOpen.value = true
}

async function handleAddClient() {
  if (!clientForm.client_name.trim()) { message.warning('请输入客户名称'); return }
  submitting.value = true
  try {
    const { error } = await supabase.from('wechat_clients').insert([{
      ...clientForm,
      wechat_account_id: currentWechat.value.id,
    }])
    if (error) throw error
    message.success('客户已添加')
    addClientModalOpen.value = false
    await loadClients(currentWechat.value.id)
    load()
  } catch (e: any) {
    message.error('添加失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

function confirmDeleteClient(record: any) {
  Modal.confirm({
    title: `确定删除客户「${record.client_name}」？`,
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      const { error } = await supabase.from('wechat_clients').delete().eq('id', record.id)
      if (error) { message.error('删除失败：' + error.message); return }
      message.success('已删除')
      await loadClients(currentWechat.value.id)
      load()
    },
  })
}

function randomColor() {
  const colors = ['#2563eb', '#059669', '#dc2626', '#d97706', '#0891b2', '#be185d']
  return colors[Math.floor(Math.random() * colors.length)]
}

onMounted(load)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }
.header-actions { display: flex; gap: 10px; align-items: center; }

.loading-wrap { display: flex; justify-content: center; padding: 80px 0; }
.empty-wrap { padding: 80px 0; }

/* 商务经理汇总栏 */
.manager-summary-bar {
  display: flex; gap: 10px; flex-wrap: wrap;
  margin-bottom: 20px;
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}
.mgr-tab {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 14px; border-radius: 10px;
  border: 1.5px solid #e5e7eb;
  background: #fff; cursor: pointer;
  transition: all 0.15s;
  min-width: 220px;
}
.mgr-tab:hover { border-color: #93c5fd; background: #eff6ff; }
.mgr-tab.active { border-color: #2563eb; background: #eff6ff; }
.mgr-tab-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  color: #fff; font-weight: 700; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 2px;
}
.mgr-tab-body { flex: 1; min-width: 0; }
.mgr-tab-name { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 8px; }
.mgr-kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}
.mgr-kpi-item {
  display: flex; flex-direction: column; align-items: center;
  padding: 4px 2px; background: #f8fafc; border-radius: 6px;
}
.mgr-kpi-val { font-size: 12px; font-weight: 700; line-height: 1.3; }
.mgr-kpi-val.blue { color: #2563eb; }
.mgr-kpi-val.teal { color: #0891b2; }
.mgr-kpi-val.green { color: #059669; }
.mgr-kpi-val.red { color: #dc2626; }
.mgr-kpi-val.orange { color: #d97706; }
.mgr-kpi-val.gray { color: #9ca3af; }
.mgr-kpi-lbl { font-size: 9px; color: #9ca3af; margin-top: 1px; white-space: nowrap; }
.mgr-tab-edit { padding: 0; height: auto; flex-shrink: 0; margin-top: 2px; }

/* 微信号主网格 */
.wechat-main-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.wechat-main-card {
  background: #fff; border-radius: 12px;
  border: 1.5px solid #e5e7eb;
  padding: 16px; cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s;
  display: flex; flex-direction: column; gap: 10px;
}
.wechat-main-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-color: #93c5fd; }

.wmc-header { display: flex; align-items: center; gap: 12px; }
.wmc-icon {
  width: 40px; height: 40px; border-radius: 10px;
  background: #07c160; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; flex-shrink: 0;
}
.wmc-id-block { flex: 1; min-width: 0; }
.wmc-id { font-size: 15px; font-weight: 700; color: #111827; }
.wmc-nick { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.wmc-right { flex-shrink: 0; }

.wmc-manager-row { display: flex; align-items: center; gap: 6px; }
.wmc-manager-name { font-size: 12px; color: #374151; font-weight: 500; flex: 1; }
.wmc-no-manager { font-size: 12px; color: #9ca3af; cursor: pointer; flex: 1; }
.wmc-no-manager:hover { color: #2563eb; }

.wmc-stats { display: flex; align-items: center; padding-top: 10px; border-top: 1px solid #f3f4f6; }
.wmc-stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.wmc-stat-num { font-size: 16px; font-weight: 700; line-height: 1.2; }
.wmc-stat-num.blue { color: #2563eb; }
.wmc-stat-num.green { color: #059669; }
.wmc-stat-num.orange { color: #d97706; }
.wmc-stat-num.teal { color: #0e7490; }
.wmc-stat-num.red { color: #dc2626; }
.wmc-stat-num.gray { color: #9ca3af; }
.wmc-stat-lbl { font-size: 10px; color: #9ca3af; margin-top: 2px; }
.wmc-stat-sep { width: 1px; height: 28px; background: #e5e7eb; flex-shrink: 0; }

/* 微信抽屉 */
.wechat-drawer-header {
  display: flex; align-items: center; gap: 14px;
  padding: 20px 24px 16px; border-bottom: 1px solid #f0f0f0;
  background: #f8fafc;
}
.wechat-drawer-icon {
  width: 44px; height: 44px; border-radius: 10px;
  background: #07c160; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; flex-shrink: 0;
}
.wechat-drawer-title-block { flex: 1; }
.wechat-drawer-id { font-size: 16px; font-weight: 700; color: #111827; }
.wechat-drawer-nick { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.wechat-drawer-tags { flex-shrink: 0; }
.wechat-drawer-actions { flex-shrink: 0; }

.wechat-manager-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 24px; background: #fffbeb;
  border-bottom: 1px solid #fef3c7;
  font-size: 13px;
}
.wmb-label { color: #9ca3af; font-size: 12px; }
.wmb-name { font-weight: 600; color: #111827; }
.wmb-empty { color: #9ca3af; font-style: italic; }

.wechat-summary-row {
  display: flex; align-items: center;
  padding: 12px 24px; background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-wrap: wrap; gap: 0;
}
.wsum-item { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 70px; }
.wsum-num { font-size: 18px; font-weight: 700; line-height: 1.2; }
.wsum-num.blue { color: #2563eb; }
.wsum-num.green { color: #059669; }
.wsum-num.teal { color: #0891b2; }
.wsum-num.orange { color: #d97706; }
.wsum-lbl { font-size: 10px; color: #9ca3af; margin-top: 2px; }
.wsum-sep { width: 1px; height: 30px; background: #e5e7eb; flex-shrink: 0; }

.wechat-drawer-body { padding: 16px; }

.wechat-drawer-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.client-count-tip { font-size: 12px; color: #9ca3af; }
.wechat-empty { text-align: center; padding: 32px; color: #9ca3af; font-size: 13px; }

/* 客户展开列表 */
.client-expand-list { display: flex; flex-direction: column; gap: 6px; }
.client-expand-item {
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.15s;
  background: #fff;
}
.client-expand-item.is-debt { border-color: #fca5a5; background: #fff5f5; }
.client-expand-item.is-expanded { border-color: #93c5fd; }

.cei-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; cursor: pointer;
  transition: background 0.12s;
}
.cei-row:hover { background: #f8fafc; }
.client-expand-item.is-debt .cei-row:hover { background: #fff1f1; }

.cei-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: #2563eb; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; flex-shrink: 0;
}
.client-expand-item.is-debt .cei-avatar { background: #dc2626; }

.cei-main { flex: 1; min-width: 0; }
.cei-name-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 3px; }
.cei-name { font-size: 13px; font-weight: 700; color: #111827; }
.cei-feedback-tag {
  font-size: 10px; padding: 1px 5px; border-radius: 3px;
  background: #f0f9ff; color: #0891b2; border: 1px solid #bae6fd;
}
.cei-sub-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cei-company { font-size: 11px; color: #6b7280; }
.cei-wechat { font-size: 11px; color: #9ca3af; }
.cei-remark {
  font-size: 10px; padding: 1px 5px; border-radius: 3px;
  background: #fffbeb; color: #92400e; border: 1px solid #fde68a;
}

.cei-stats { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.cei-stat { display: flex; flex-direction: column; align-items: center; min-width: 36px; }
.cei-stat-val { font-size: 14px; font-weight: 700; line-height: 1.2; }
.cei-stat-val.blue { color: #2563eb; }
.cei-stat-val.orange { color: #d97706; }
.cei-stat-val.red { color: #dc2626; }
.cei-stat-val.teal { color: #0e7490; }
.cei-stat-val.gray { color: #9ca3af; }
.cei-stat-lbl { font-size: 9px; color: #9ca3af; margin-top: 1px; }

.cei-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.cei-expand-arrow { flex-shrink: 0; transition: transform 0.2s; display: flex; align-items: center; }
.cei-expand-arrow.rotated { transform: rotate(180deg); }

/* 展开详情 */
.cei-detail {
  border-top: 1px solid #e5e7eb;
  padding: 16px 14px;
  background: #fafbfc;
  animation: slideDown 0.15s ease;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.cei-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.ced-block {}
.ced-block-full { grid-column: 1 / -1; }
.ced-block-title {
  font-size: 11px; font-weight: 600; color: #6b7280;
  margin-bottom: 8px; padding-bottom: 4px;
  border-bottom: 1px solid #e5e7eb;
  text-transform: uppercase; letter-spacing: 0.4px;
}

.ced-finance-row { display: flex; align-items: center; padding: 10px; background: #fff; border-radius: 8px; border: 1px solid #e5e7eb; }
.ced-fin-item { flex: 1; text-align: center; }
.ced-fin-val { font-size: 15px; font-weight: 700; }
.ced-fin-val.red { color: #dc2626; }
.ced-fin-val.teal { color: #0e7490; }
.ced-fin-val.gray { color: #9ca3af; }
.ced-fin-lbl { font-size: 10px; color: #9ca3af; margin-top: 2px; }
.ced-fin-sep { width: 1px; height: 28px; background: #e5e7eb; flex-shrink: 0; }

.ced-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ced-info-item { display: flex; flex-direction: column; gap: 2px; }
.ced-info-lbl { font-size: 10px; color: #9ca3af; }
.ced-info-val { font-size: 12px; color: #1f2937; font-weight: 500; }
.ced-info-val.mono { font-family: monospace; font-size: 11px; }

.ced-order-stats { display: flex; align-items: center; padding: 10px 14px; background: #fff; border-radius: 8px; border: 1px solid #e5e7eb; }
.ced-os-item { flex: 1; text-align: center; }
.ced-os-val { font-size: 16px; font-weight: 700; }
.ced-os-val.blue { color: #2563eb; }
.ced-os-val.teal { color: #0891b2; }
.ced-os-val.green { color: #059669; }
.ced-os-val.orange { color: #d97706; }
.ced-os-val.gray { color: #9ca3af; }
.ced-os-lbl { font-size: 10px; color: #9ca3af; margin-top: 2px; }
.ced-os-sep { width: 1px; height: 28px; background: #e5e7eb; flex-shrink: 0; }

.ced-notes { font-size: 12px; color: #374151; line-height: 1.6; padding: 8px 10px; background: #fff; border-radius: 6px; border: 1px solid #e5e7eb; }

/* 经理详情抽屉 */
.drawer-header {
  display: flex; align-items: center; gap: 14px;
  padding: 24px 24px 20px; border-bottom: 1px solid #f0f0f0;
  background: #fafbfc;
}
.drawer-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 22px; font-weight: 700; flex-shrink: 0;
}
.drawer-title-block { flex: 1; }
.drawer-name { font-size: 18px; font-weight: 700; color: #111827; }
.drawer-sub { display: flex; align-items: center; gap: 8px; margin-top: 5px; }
.drawer-join { font-size: 12px; color: #9ca3af; }
.drawer-header-actions { margin-left: auto; }
.drawer-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }
.drawer-section {}
.section-title { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6; }
.section-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.info-item { display: flex; flex-direction: column; gap: 2px; }
.info-label { font-size: 11px; color: #9ca3af; }
.info-val { font-size: 13px; color: #1f2937; font-weight: 500; }
.empty-text { font-size: 13px; color: #9ca3af; padding: 8px 0; }

.mgr-finance-summary {
  display: flex; align-items: center;
  padding: 16px; background: #f8fafc;
  border-radius: 10px; border: 1px solid #e5e7eb;
}
.mfs-item { flex: 1; text-align: center; }
.mfs-num { font-size: 20px; font-weight: 700; line-height: 1.2; }
.mfs-num.red { color: #dc2626; }
.mfs-num.teal { color: #0e7490; }
.mfs-num.gray { color: #9ca3af; }
.mfs-lbl { font-size: 11px; color: #9ca3af; margin-top: 4px; }
.mfs-sep { width: 1px; height: 36px; background: #e5e7eb; flex-shrink: 0; }

.wechat-list { display: flex; flex-direction: column; gap: 8px; }
.wechat-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px; background: #f8fafc;
  border-radius: 8px; border: 1px solid #e5e7eb;
}
.witem-left { min-width: 100px; }
.witem-id { font-weight: 700; font-size: 13px; color: #1f2937; }
.witem-nick { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.witem-mid { display: flex; gap: 16px; }
.witem-stat { display: flex; flex-direction: column; align-items: center; min-width: 32px; }
.wstat-num { font-size: 16px; font-weight: 700; color: #2563eb; }
.wstat-label { font-size: 10px; color: #9ca3af; }
.witem-right { display: flex; align-items: center; gap: 4px; margin-left: auto; }

.drawer-stats-row {
  display: flex; gap: 12px; padding: 16px;
  background: #f0f7ff; border-radius: 10px;
  border: 1px solid #bfdbfe;
}
.dstat-card { flex: 1; text-align: center; }
.dstat-num { font-size: 24px; font-weight: 700; line-height: 1.2; }
.dstat-num.blue { color: #2563eb; }
.dstat-num.green { color: #059669; }
.dstat-num.orange { color: #d97706; }
.dstat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
</style>
