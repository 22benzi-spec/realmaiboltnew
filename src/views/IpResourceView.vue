<template>
  <div class="page-content">
    <div class="page-header">
      <h2 class="page-title">行政资源管理</h2>
      <a-button type="primary" @click="openAdd">{{ addBtnLabel }}</a-button>
    </div>

    <!-- KPI -->
    <div class="kpi-row">
      <div class="kpi-card kpi-total">
        <div class="kpi-val">{{ stats.total }}</div>
        <div class="kpi-label">总数</div>
      </div>
      <div class="kpi-card kpi-active">
        <div class="kpi-val green">{{ stats.active }}</div>
        <div class="kpi-label">使用中</div>
      </div>
      <div class="kpi-card kpi-expire7 clickable" @click="filterByExpire(7)" :class="{ active: expireFilter === 7 }">
        <div class="kpi-val red">{{ stats.expire7 }}</div>
        <div class="kpi-label">7 天内到期</div>
      </div>
      <div class="kpi-card kpi-expire15 clickable" @click="filterByExpire(15)" :class="{ active: expireFilter === 15 }">
        <div class="kpi-val orange">{{ stats.expire15 }}</div>
        <div class="kpi-label">15 天内到期</div>
      </div>
      <div class="kpi-card kpi-expire30 clickable" @click="filterByExpire(30)" :class="{ active: expireFilter === 30 }">
        <div class="kpi-val warn2">{{ stats.expire30 }}</div>
        <div class="kpi-label">30 天内到期</div>
      </div>
      <div class="kpi-card kpi-donotrenew">
        <div class="kpi-val warn">{{ stats.doNotRenew }}</div>
        <div class="kpi-label">标记不续费</div>
      </div>
      <div class="kpi-card kpi-disabled">
        <div class="kpi-val gray">{{ stats.disabled }}</div>
        <div class="kpi-label">已停用 / 已替换</div>
      </div>
    </div>

    <a-tabs v-model:activeKey="activeTab" @change="onTabChange" class="res-tabs">

      <!-- ===== 买手 IP ===== -->
      <a-tab-pane key="buyer" tab="买手 IP">
        <div class="filter-bar">
          <a-input v-model:value="search" placeholder="搜索 IP / 供应商 / 聊单号 / 业务员" style="width:300px" allow-clear @change="loadData" />
          <a-select v-model:value="filterRegion" placeholder="地区" style="width:110px" allow-clear @change="loadData">
            <a-select-option v-for="r in regionOptions" :key="r" :value="r">{{ r }}</a-select-option>
          </a-select>
          <a-select v-model:value="filterStatus" placeholder="状态" style="width:120px" allow-clear @change="loadData">
            <a-select-option value="使用中">使用中</a-select-option>
            <a-select-option value="待续费">待续费</a-select-option>
            <a-select-option value="已停用">已停用</a-select-option>
            <a-select-option value="已替换">已替换</a-select-option>
          </a-select>
          <a-select v-model:value="filterDoNotRenew" placeholder="续费标记" style="width:120px" allow-clear @change="loadData">
            <a-select-option :value="true">不续费</a-select-option>
            <a-select-option :value="false">正常</a-select-option>
          </a-select>
        </div>
        <a-table :columns="buyerColumns" :data-source="list" :loading="loading" :pagination="pagination"
          row-key="id" size="middle" :scroll="{ x: 1200 }" @change="onTableChange"
          :row-class-name="(r: any) => r.do_not_renew ? 'row-no-renew' : ''">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'ip_address'">
              <div class="ip-cell">
                <span class="ip-addr">{{ record.ip_address }}</span>
                <a-tag v-if="record.do_not_renew" color="red" size="small">不续费</a-tag>
              </div>
            </template>
            <template v-if="column.key === 'region'">
              <a-tag v-if="record.region" color="geekblue">{{ record.region }}</a-tag>
              <span v-else class="text-empty">—</span>
            </template>
            <template v-if="column.key === 'chat_account'">
              <div v-if="record.chat_account" class="binding-cell">
                <span class="binding-icon chat-icon">聊</span>
                <span class="binding-val">{{ record.chat_account }}</span>
              </div>
              <span v-else class="text-empty">—</span>
            </template>
            <template v-if="column.key === 'staff_name'">
              <span v-if="record.staff_name" class="staff-badge">{{ record.staff_name }}</span>
              <span v-else class="text-empty">—</span>
            </template>
            <template v-if="column.key === 'status'">
              <a-badge :status="statusBadge[record.status] || 'default'" :text="record.status" />
            </template>
            <template v-if="column.key === 'renew'">
              <span class="renew-price">¥{{ Number(record.renew_price || 0).toFixed(0) }}/{{ record.renew_cycle }}</span>
            </template>
            <template v-if="column.key === 'next_renew_at'">
              <span :class="getRenewClass(record.next_renew_at)">{{ record.next_renew_at || '-' }}</span>
            </template>
            <template v-if="column.key === 'action'">
              <a-space size="small" :wrap="false">
                <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
                <a-button type="link" size="small" @click="quickRenew(record)">续费</a-button>
                <a-dropdown :trigger="['click']">
                  <a-button type="link" size="small">更多</a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item @click="openReplace(record)">替换 IP</a-menu-item>
                      <a-menu-item @click="openHistory(record)">替换记录</a-menu-item>
                      <a-menu-divider />
                      <a-menu-item v-if="!record.do_not_renew" @click="markNoRenew(record)" style="color:#dc2626">标记不续费</a-menu-item>
                      <a-menu-item v-else @click="unmarkNoRenew(record)">取消不续费</a-menu-item>
                      <a-menu-divider />
                      <a-menu-item>
                        <a-popconfirm title="确认删除？" @confirm="deleteRow(record)" placement="left">
                          <span style="color:#ff4d4f">删除</span>
                        </a-popconfirm>
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <!-- ===== 服务器管理 ===== -->
      <a-tab-pane key="server" tab="服务器管理">
        <div class="filter-bar">
          <a-input v-model:value="search" placeholder="搜索 IP / 用户名 / 供应商 / 地区" style="width:280px" allow-clear @change="loadData" />
          <a-select v-model:value="filterStatus" placeholder="状态" style="width:120px" allow-clear @change="loadData">
            <a-select-option value="使用中">使用中</a-select-option>
            <a-select-option value="待续费">待续费</a-select-option>
            <a-select-option value="已停用">已停用</a-select-option>
            <a-select-option value="已替换">已替换</a-select-option>
          </a-select>
          <a-select v-model:value="filterUsage" placeholder="用途" style="width:130px" allow-clear @change="loadData">
            <a-select-option value="PayPal专用">PayPal专用</a-select-option>
            <a-select-option value="混用">混用</a-select-option>
            <a-select-option value="其他">其他</a-select-option>
          </a-select>
          <a-select v-model:value="filterRegion" placeholder="地区" style="width:110px" allow-clear @change="loadData">
            <a-select-option v-for="r in regionOptions" :key="r" :value="r">{{ r }}</a-select-option>
          </a-select>
        </div>
        <a-table :columns="serverColumns" :data-source="list" :loading="loading" :pagination="pagination"
          row-key="id" size="middle" :scroll="{ x: 1200 }" @change="onTableChange">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'server_ip'">
              <div class="server-cell">
                <span class="ip-addr">{{ record.server_ip || '—' }}</span>
                <div v-if="record.username" class="server-username">用户名: {{ record.username }}</div>
              </div>
            </template>
            <template v-if="column.key === 'region'">
              <a-tag v-if="record.region" color="geekblue">{{ record.region }}</a-tag>
              <span v-else class="text-empty">—</span>
            </template>
            <template v-if="column.key === 'status'">
              <a-badge :status="statusBadge[record.status] || 'default'" :text="record.status" />
            </template>
            <template v-if="column.key === 'usage_type'">
              <a-tag :color="usageColor[record.usage_type] || 'default'">{{ record.usage_type }}</a-tag>
            </template>
            <template v-if="column.key === 'renew'">
              <span class="renew-price">¥{{ Number(record.renew_price || 0).toFixed(0) }}/{{ record.renew_cycle }}</span>
            </template>
            <template v-if="column.key === 'next_renew_at'">
              <span :class="getRenewClass(record.next_renew_at)">{{ record.next_renew_at || '-' }}</span>
            </template>
            <template v-if="column.key === 'action'">
              <a-space size="small">
                <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
                <a-button type="link" size="small" @click="quickRenew(record)">续费</a-button>
                <a-popconfirm title="确认删除？" @confirm="deleteRow(record)" placement="left">
                  <a-button type="link" size="small" danger>删除</a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <!-- ===== 手机号管理（SIM + Pingme 合并） ===== -->
      <a-tab-pane key="phone" tab="手机号">
        <div class="filter-bar">
          <a-input v-model:value="search" placeholder="搜索手机号 / 账号名称 / 聊单号 / 业务员" style="width:300px" allow-clear @change="loadData" />
          <a-select v-model:value="filterPhoneType" placeholder="类型" style="width:110px" allow-clear @change="loadData">
            <a-select-option value="SIM">SIM 卡</a-select-option>
            <a-select-option value="Pingme">Pingme</a-select-option>
          </a-select>
          <a-select v-model:value="filterStatus" placeholder="状态" style="width:120px" allow-clear @change="loadData">
            <a-select-option value="使用中">使用中</a-select-option>
            <a-select-option value="待激活">待激活</a-select-option>
            <a-select-option value="已停用">已停用</a-select-option>
            <a-select-option value="已替换">已替换</a-select-option>
          </a-select>
          <a-select v-model:value="filterRegion" placeholder="归属地" style="width:110px" allow-clear @change="loadData">
            <a-select-option v-for="r in regionOptions" :key="r" :value="r">{{ r }}</a-select-option>
          </a-select>
        </div>
        <a-table :columns="phoneColumns" :data-source="list" :loading="loading" :pagination="pagination"
          row-key="_uid" size="middle" :scroll="{ x: 1300 }" @change="onTableChange"
          :row-class-name="(r: any) => r.do_not_renew ? 'row-no-renew' : ''">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'phone_number'">
              <div class="phone-cell">
                <a-tag v-if="record._source === 'SIM'" color="green" size="small">SIM</a-tag>
                <a-tag v-else color="blue" size="small">PM</a-tag>
                <div class="phone-cell-info">
                  <span class="ip-addr">{{ record.phone_number || record.account_name || '—' }}</span>
                  <div v-if="record._source === 'Pingme' && record.phone_number && record.account_name" class="account-sub-num">{{ record.account_name }}</div>
                  <a-tag v-if="record.do_not_renew" color="red" size="small" style="margin-left:4px">不续费</a-tag>
                </div>
              </div>
            </template>
            <template v-if="column.key === 'purchase_account'">
              <span v-if="record.purchase_account" class="account-text">{{ record.purchase_account }}</span>
              <span v-else class="text-empty">—</span>
            </template>
            <template v-if="column.key === 'chat_account'">
              <div v-if="record.chat_account" class="binding-cell">
                <span class="binding-icon chat-icon">聊</span>
                <span class="binding-val">{{ record.chat_account }}</span>
              </div>
              <span v-else class="text-empty">—</span>
            </template>
            <template v-if="column.key === 'staff_name'">
              <span v-if="record.staff_name" class="staff-badge">{{ record.staff_name }}</span>
              <span v-else class="text-empty">—</span>
            </template>
            <template v-if="column.key === 'region_supplier'">
              <div class="region-supplier-cell">
                <a-tag v-if="record.region" color="geekblue" size="small">{{ record.region }}</a-tag>
                <span v-if="record.supplier" class="supplier-text">{{ record.supplier }}</span>
                <span v-if="!record.region && !record.supplier" class="text-empty">—</span>
              </div>
            </template>
            <template v-if="column.key === 'extra'">
              <template v-if="record._source === 'SIM'">
                <span class="renew-price">¥{{ Number(record.renew_price || 0).toFixed(0) }}/年</span>
              </template>
              <template v-else>
                <div class="balance-cell">
                  <span :class="Number(record.balance) < 10 ? 'balance-low' : 'balance-ok'">¥{{ Number(record.balance || 0).toFixed(2) }}</span>
                  <span class="balance-hint">账号余额</span>
                </div>
              </template>
            </template>
            <template v-if="column.key === 'status'">
              <a-badge :status="statusBadge[record.status] || 'default'" :text="record.status" />
            </template>
            <template v-if="column.key === 'next_renew_at'">
              <template v-if="record._source === 'SIM'">
                <span :class="getRenewClass(record.next_renew_at)">{{ record.next_renew_at || '-' }}</span>
              </template>
              <template v-else>
                <span class="text-empty">—</span>
              </template>
            </template>
            <template v-if="column.key === 'notes'">
              <span v-if="record.notes" class="notes-ellipsis">{{ record.notes }}</span>
              <span v-else class="text-empty">—</span>
            </template>
            <template v-if="column.key === 'action'">
              <a-space size="small" :wrap="false">
                <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
                <a-button v-if="record._source === 'Pingme'" type="link" size="small" @click="openRecharge(record)">充值</a-button>
                <a-button v-else type="link" size="small" @click="quickRenew(record)">续费</a-button>
                <a-dropdown :trigger="['click']">
                  <a-button type="link" size="small">更多</a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item v-if="record._source === 'Pingme'" @click="openRechargeLogs(record)">充值记录</a-menu-item>
                      <a-menu-item @click="openPhoneReplace(record)">替换号码</a-menu-item>
                      <a-menu-divider />
                      <a-menu-item v-if="!record.do_not_renew" @click="markNoRenew(record)" style="color:#dc2626">标记不续费</a-menu-item>
                      <a-menu-item v-else @click="unmarkNoRenew(record)">取消标记</a-menu-item>
                      <a-menu-divider />
                      <a-menu-item>
                        <a-popconfirm title="确认删除？" @confirm="deleteRow(record)" placement="left">
                          <span style="color:#ff4d4f">删除</span>
                        </a-popconfirm>
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>

    <!-- ===== 新增/编辑 弹窗 ===== -->
    <a-modal v-model:open="modalOpen" :title="editId ? `编辑${modalTitle}` : `新增${modalTitle}`"
      width="640px" @ok="handleSave" :confirm-loading="saving">

      <!-- 买手IP 表单 -->
      <a-form v-if="activeTab === 'buyer'" :model="buyerForm" layout="vertical" style="margin-top:8px">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="IP 地址" required>
              <a-input v-model:value="buyerForm.ip_address" placeholder="如 192.168.1.1" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="地区">
              <a-select v-model:value="buyerForm.region" allow-clear show-search placeholder="选择地区">
                <a-select-option v-for="r in regionOptions" :key="r" :value="r">{{ r }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="供应商">
              <a-input v-model:value="buyerForm.supplier" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="绑定手机号">
              <a-input v-model:value="buyerForm.phone_number" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="绑定聊单号">
              <a-input v-model:value="buyerForm.chat_account" placeholder="微信号 / 账号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="绑定业务员">
              <a-input v-model:value="buyerForm.staff_name" placeholder="业务员姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="续费周期">
              <a-select v-model:value="buyerForm.renew_cycle">
                <a-select-option value="月付">月付</a-select-option>
                <a-select-option value="季付">季付</a-select-option>
                <a-select-option value="年付">年付</a-select-option>
                <a-select-option value="不定期">不定期</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="续费金额（¥）">
              <a-input-number v-model:value="buyerForm.renew_price" :min="0" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="上次续费日期">
              <a-input v-model:value="buyerForm.last_renewed_at" placeholder="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="下次到期日期">
              <a-input v-model:value="buyerForm.next_renew_at" placeholder="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="buyerForm.status">
                <a-select-option value="使用中">使用中</a-select-option>
                <a-select-option value="待续费">待续费</a-select-option>
                <a-select-option value="已停用">已停用</a-select-option>
                <a-select-option value="已替换">已替换</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="分配给">
              <a-input v-model:value="buyerForm.assigned_to" placeholder="人名或用途" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item>
              <a-checkbox v-model:checked="buyerForm.do_not_renew">
                <span style="color:#dc2626;font-weight:600">标记不续费</span>
              </a-checkbox>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="buyerForm.notes" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <!-- 服务器管理 表单 -->
      <a-form v-else-if="activeTab === 'server'" :model="serverForm" layout="vertical" style="margin-top:8px">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="服务器 IP" required>
              <a-input v-model:value="serverForm.server_ip" placeholder="IP 地址" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="用户名">
              <a-input v-model:value="serverForm.username" placeholder="登录用户名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="地区">
              <a-select v-model:value="serverForm.region" allow-clear show-search placeholder="选择地区">
                <a-select-option v-for="r in regionOptions" :key="r" :value="r">{{ r }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="供应商">
              <a-input v-model:value="serverForm.supplier" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="用途">
              <a-select v-model:value="serverForm.usage_type">
                <a-select-option value="PayPal专用">PayPal专用</a-select-option>
                <a-select-option value="混用">混用</a-select-option>
                <a-select-option value="其他">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="serverForm.status">
                <a-select-option value="使用中">使用中</a-select-option>
                <a-select-option value="待续费">待续费</a-select-option>
                <a-select-option value="已停用">已停用</a-select-option>
                <a-select-option value="已替换">已替换</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="续费周期">
              <a-select v-model:value="serverForm.renew_cycle">
                <a-select-option value="月付">月付</a-select-option>
                <a-select-option value="季付">季付</a-select-option>
                <a-select-option value="年付">年付</a-select-option>
                <a-select-option value="不定期">不定期</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="续费金额（¥）">
              <a-input-number v-model:value="serverForm.renew_price" :min="0" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="上次续费日期">
              <a-input v-model:value="serverForm.last_renewed_at" placeholder="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="下次到期日期">
              <a-input v-model:value="serverForm.next_renew_at" placeholder="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="serverForm.notes" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <!-- 手机号表单（SIM / Pingme 统一） -->
      <a-form v-else-if="activeTab === 'phone'" layout="vertical" style="margin-top:8px">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="类型" required>
              <a-select v-model:value="phoneForm.phone_type" :disabled="!!editId">
                <a-select-option value="SIM">SIM 卡</a-select-option>
                <a-select-option value="Pingme">Pingme 账号</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col v-if="phoneForm.phone_type === 'SIM'" :span="12">
            <a-form-item label="手机号码" required>
              <a-input v-model:value="phoneForm.phone_number" placeholder="如 138xxxx0001" />
            </a-form-item>
          </a-col>
          <template v-if="phoneForm.phone_type === 'Pingme'">
            <a-col :span="12">
              <a-form-item label="账号名称" required>
                <a-input v-model:value="phoneForm.account_name" placeholder="账号名称（如 PM001）" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="Pingme 号码">
                <a-input v-model:value="phoneForm.phone_number" placeholder="该账号下的号码（可选）" />
              </a-form-item>
            </a-col>
          </template>
          <a-col :span="12">
            <a-form-item label="绑定聊单号">
              <a-input v-model:value="phoneForm.chat_account" placeholder="微信号 / 账号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="绑定业务员">
              <a-input v-model:value="phoneForm.staff_name" placeholder="业务员姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="归属地">
              <a-select v-model:value="phoneForm.region" allow-clear show-search placeholder="选择地区">
                <a-select-option v-for="r in regionOptions" :key="r" :value="r">{{ r }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="供应商">
              <a-input v-model:value="phoneForm.supplier" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="购买账号">
              <a-input v-model:value="phoneForm.purchase_account" placeholder="号码归属的采购账号" />
            </a-form-item>
          </a-col>
          <a-col v-if="phoneForm.phone_type === 'SIM'" :span="12">
            <a-form-item label="设备信息">
              <a-input v-model:value="phoneForm.device_info" placeholder="手机型号等" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="phoneForm.status">
                <a-select-option value="使用中">使用中</a-select-option>
                <a-select-option value="待激活">待激活</a-select-option>
                <a-select-option value="已停用">已停用</a-select-option>
                <a-select-option value="已替换">已替换</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <template v-if="phoneForm.phone_type === 'SIM'">
            <a-col :span="12">
              <a-form-item label="年租费用（¥）">
                <a-input-number v-model:value="phoneForm.renew_price" :min="0" style="width:100%" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="上次续费日期">
                <a-input v-model:value="phoneForm.last_renewed_at" placeholder="YYYY-MM-DD" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="下次到期日期">
                <a-input v-model:value="phoneForm.next_renew_at" placeholder="YYYY-MM-DD" />
              </a-form-item>
            </a-col>
          </template>
          <template v-if="phoneForm.phone_type === 'Pingme'">
            <a-col :span="12">
              <a-form-item label="账号当前余额（¥）">
                <a-input-number v-model:value="phoneForm.balance" :min="0" :precision="2" style="width:100%" />
              </a-form-item>
            </a-col>
          </template>
          <a-col :span="24">
            <a-form-item>
              <a-checkbox v-model:checked="phoneForm.do_not_renew">
                <span style="color:#dc2626;font-weight:600">标记不续费</span>
              </a-checkbox>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="phoneForm.notes" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 手机号替换弹窗 -->
    <a-modal v-model:open="phoneReplaceOpen" title="替换号码" width="500px" @ok="handlePhoneReplace" :confirm-loading="saving">
      <div class="replace-info" style="margin-bottom:16px">
        <div>
          <div class="replace-label">当前号码</div>
          <div class="ip-addr">{{ phoneReplaceTarget?.phone_number || phoneReplaceTarget?.account_name }}</div>
        </div>
        <div style="color:#d1d5db;font-size:20px">→</div>
      </div>
      <a-form layout="vertical">
        <a-form-item v-if="phoneReplaceTarget?._source === 'SIM'" label="新手机号码" required>
          <a-input v-model:value="phoneReplaceForm.new_phone" placeholder="新号码" />
        </a-form-item>
        <a-form-item v-else label="新账号名称" required>
          <a-input v-model:value="phoneReplaceForm.new_phone" placeholder="新账号名称" />
        </a-form-item>
        <a-form-item label="替换原因">
          <a-input v-model:value="phoneReplaceForm.reason" placeholder="如：被封号、换供应商等" />
        </a-form-item>
        <a-form-item label="操作人">
          <a-input v-model:value="phoneReplaceForm.operated_by" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="phoneReplaceForm.notes" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 快速续费弹窗 -->
    <a-modal v-model:open="renewOpen" title="记录续费" width="400px" @ok="handleRenew" :confirm-loading="saving">
      <a-form layout="vertical" style="margin-top:8px">
        <a-form-item label="续费日期">
          <a-input v-model:value="renewForm.last_renewed_at" placeholder="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item label="下次到期日期">
          <a-input v-model:value="renewForm.next_renew_at" placeholder="YYYY-MM-DD" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Pingme 充值弹窗 -->
    <a-modal v-model:open="rechargeOpen" title="Pingme 账号充值" width="440px" @ok="handleRecharge" :confirm-loading="saving">
      <div class="recharge-header">
        <div>
          <div class="ip-addr">{{ rechargeTarget?.account_name || rechargeTarget?.phone_number }}</div>
          <div v-if="rechargeTarget?.phone_number && rechargeTarget?.account_name" class="recharge-sub-num">{{ rechargeTarget?.phone_number }}</div>
        </div>
        <span class="recharge-balance">账号余额：<strong>¥{{ Number(rechargeTarget?.balance || 0).toFixed(2) }}</strong></span>
      </div>
      <a-form layout="vertical" style="margin-top:12px">
        <a-row :gutter="14">
          <a-col :span="12">
            <a-form-item label="充值金额（¥）" required>
              <a-input-number v-model:value="rechargeForm.amount" :min="0.01" :precision="2" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="充值日期">
              <a-input v-model:value="rechargeForm.date" placeholder="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="操作人">
              <a-input v-model:value="rechargeForm.operator" placeholder="姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="备注">
              <a-input v-model:value="rechargeForm.notes" placeholder="可选" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- Pingme 充值记录抽屉 -->
    <a-drawer v-model:open="rechargeLogsOpen" :title="`充值记录 — ${rechargeLogsTarget?.account_name || rechargeLogsTarget?.phone_number}`" width="520" placement="right">
      <div v-if="!rechargeLogsTarget?.recharge_logs?.length" class="drawer-empty">暂无充值记录</div>
      <div v-else>
        <div class="recharge-summary">
          累计充值：<strong>¥{{ rechargeTotalAmount.toFixed(2) }}</strong>
          &nbsp;&nbsp;当前余额：<strong>¥{{ Number(rechargeLogsTarget?.balance || 0).toFixed(2) }}</strong>
        </div>
        <a-timeline style="margin-top:16px">
          <a-timeline-item v-for="(log, idx) in [...(rechargeLogsTarget?.recharge_logs || [])].reverse()" :key="idx" color="green">
            <div class="log-header">
              <span class="log-date">{{ log.date }}</span>
              <span class="recharge-amount">+¥{{ Number(log.amount).toFixed(2) }}</span>
              <span v-if="log.operator" class="log-operator">操作人：{{ log.operator }}</span>
            </div>
            <div v-if="log.notes" class="log-notes">{{ log.notes }}</div>
          </a-timeline-item>
        </a-timeline>
      </div>
    </a-drawer>

    <!-- IP 替换弹窗 -->
    <a-modal v-model:open="replaceOpen" title="IP 替换" width="520px"
      @ok="handleReplace" :confirm-loading="saving" ok-text="确认替换">
      <div class="replace-info">
        <div class="replace-old">
          <span class="replace-label">旧 IP</span>
          <span class="ip-addr">{{ replaceTarget?.ip_address }}</span>
          <a-tag v-if="replaceTarget?.region" color="geekblue" size="small">{{ replaceTarget?.region }}</a-tag>
        </div>
        <div class="replace-arrow">→</div>
        <div class="replace-new">
          <span class="replace-label">新 IP</span>
          <a-input v-model:value="replaceForm.new_ip_address" placeholder="新 IP 地址" style="width:180px" />
        </div>
      </div>
      <a-form layout="vertical" style="margin-top:16px">
        <a-row :gutter="14">
          <a-col :span="12">
            <a-form-item label="替换日期">
              <a-input v-model:value="replaceForm.replaced_at" placeholder="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="操作人">
              <a-input v-model:value="replaceForm.operated_by" placeholder="姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="替换原因">
              <a-select v-model:value="replaceForm.reason" allow-clear>
                <a-select-option value="聊单号封号">聊单号封号</a-select-option>
                <a-select-option value="贝宝封号">贝宝封号</a-select-option>
                <a-select-option value="IP 被封">IP 被封</a-select-option>
                <a-select-option value="到期未续">到期未续</a-select-option>
                <a-select-option value="主动更换">主动更换</a-select-option>
                <a-select-option value="其他">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="replaceForm.notes" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
      <a-alert type="info" show-icon>
        <template #message>替换后旧 IP 状态将自动设为「已替换」，并新增一条替换记录</template>
      </a-alert>
    </a-modal>

    <!-- 替换记录抽屉 -->
    <a-drawer v-model:open="historyOpen" :title="`替换记录 — ${historyTarget?.ip_address}`" width="620" placement="right">
      <div v-if="historyLoading" class="drawer-loading"><a-spin /></div>
      <div v-else-if="historyList.length === 0" class="drawer-empty">暂无替换记录</div>
      <div v-else>
        <a-timeline>
          <a-timeline-item v-for="log in historyList" :key="log.id" color="blue">
            <div class="log-header">
              <span class="log-date">{{ log.replaced_at }}</span>
              <a-tag v-if="log.reason" color="orange">{{ log.reason }}</a-tag>
              <span v-if="log.operated_by" class="log-operator">操作人：{{ log.operated_by }}</span>
            </div>
            <div class="log-body">
              <div class="log-ip-row">
                <span class="log-ip old">{{ log.old_ip_address }}</span>
                <span class="log-arrow">→</span>
                <span class="log-ip new">{{ log.new_ip_address }}</span>
              </div>
              <div v-if="log.notes" class="log-notes">{{ log.notes }}</div>
            </div>
          </a-timeline-item>
        </a-timeline>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'

type TabKey = 'buyer' | 'server' | 'phone'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const search = ref('')
const filterStatus = ref<string | undefined>(undefined)
const filterRegion = ref<string | undefined>(undefined)
const filterDoNotRenew = ref<boolean | undefined>(undefined)
const filterUsage = ref<string | undefined>(undefined)
const filterPhoneType = ref<string | undefined>(undefined)
const activeTab = ref<TabKey>('buyer')

const regionOptions = ['美国', '日本', '英国', '德国', '加拿大', '澳大利亚', '法国', '意大利', '西班牙', '墨西哥', '印度', '新加坡', '其他']
const stats = reactive({ total: 0, active: 0, expire7: 0, expire15: 0, expire30: 0, disabled: 0, doNotRenew: 0 })
const expireFilter = ref<number | null>(null)

const modalOpen = ref(false)
const editId = ref<string | null>(null)
const renewOpen = ref(false)
const renewId = ref<string | null>(null)
const renewTable = ref<string>('ip_resources')
const renewForm = reactive({ last_renewed_at: '', next_renew_at: '' })

const replaceOpen = ref(false)
const replaceTarget = ref<any>(null)
const replaceForm = reactive({ new_ip_address: '', replaced_at: '', reason: '', operated_by: '', notes: '' })

const historyOpen = ref(false)
const historyTarget = ref<any>(null)
const historyLoading = ref(false)
const historyList = ref<any[]>([])

const rechargeOpen = ref(false)
const rechargeTarget = ref<any>(null)
const rechargeForm = reactive({ amount: 0, date: '', operator: '', notes: '' })

const phoneReplaceOpen = ref(false)
const phoneReplaceTarget = ref<any>(null)
const phoneReplaceForm = reactive({ new_phone: '', reason: '', operated_by: '', notes: '' })

const rechargeLogsOpen = ref(false)
const rechargeLogsTarget = ref<any>(null)
const rechargeTotalAmount = computed(() =>
  (rechargeLogsTarget.value?.recharge_logs || []).reduce((s: number, l: any) => s + Number(l.amount || 0), 0)
)

const buyerForm = reactive({
  ip_address: '', ip_type: '买手IP', region: '', supplier: '', phone_number: '',
  chat_account: '', staff_name: '', renew_cycle: '月付', renew_price: 0,
  last_renewed_at: '', next_renew_at: '', status: '使用中', assigned_to: '',
  notes: '', do_not_renew: false,
})

const serverForm = reactive({
  server_ip: '', username: '', region: '', supplier: '', renew_cycle: '月付', renew_price: 0,
  last_renewed_at: '', next_renew_at: '', status: '使用中', usage_type: 'PayPal专用', notes: '',
})

const phoneForm = reactive({
  phone_type: 'SIM' as 'SIM' | 'Pingme',
  phone_number: '', account_name: '', purchase_account: '', region: '', supplier: '',
  chat_account: '', staff_name: '', device_info: '', status: '使用中',
  renew_price: 0, renew_cycle: '年付', last_renewed_at: '', next_renew_at: '',
  balance: 0, do_not_renew: false, notes: '',
})

const addBtnLabel = computed(() => {
  const map: Record<TabKey, string> = { buyer: '新增 IP', server: '新增服务器', phone: '新增手机号' }
  return map[activeTab.value]
})
const modalTitle = computed(() => {
  const map: Record<TabKey, string> = { buyer: 'IP', server: '服务器', phone: '手机号' }
  return map[activeTab.value]
})

const pagination = computed(() => ({
  current: page.value, pageSize: pageSize.value, total: total.value,
  showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条`,
}))

const statusBadge: Record<string, string> = { '使用中': 'success', '待续费': 'warning', '待激活': 'processing', '已停用': 'error', '已替换': 'default' }
const usageColor: Record<string, string> = { 'PayPal专用': 'blue', '混用': 'cyan', '其他': 'default' }

const buyerColumns = [
  { title: 'IP 地址', key: 'ip_address', width: 170 },
  { title: '地区', key: 'region', width: 90 },
  { title: '绑定聊单号', key: 'chat_account', width: 150 },
  { title: '业务员', key: 'staff_name', width: 90 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 90 },
  { title: '状态', key: 'status', width: 90 },
  { title: '续费', key: 'renew', width: 100 },
  { title: '下次到期', key: 'next_renew_at', width: 110 },
  { title: '备注', dataIndex: 'notes', key: 'notes', width: 110, ellipsis: true },
  { title: '操作', key: 'action', width: 150, fixed: 'right' as const },
]

const serverColumns = [
  { title: '服务器 IP / 用户名', key: 'server_ip', width: 200 },
  { title: '地区', key: 'region', width: 90 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 110 },
  { title: '用途', key: 'usage_type', width: 110 },
  { title: '状态', key: 'status', width: 100 },
  { title: '续费', key: 'renew', width: 110 },
  { title: '下次到期', key: 'next_renew_at', width: 110 },
  { title: '备注', dataIndex: 'notes', key: 'notes', width: 120, ellipsis: true },
  { title: '操作', key: 'action', width: 140, fixed: 'right' as const },
]

const phoneColumns = [
  { title: '手机号码 / 账号', key: 'phone_number', width: 200 },
  { title: '绑定聊单号', key: 'chat_account', width: 150 },
  { title: '业务员', key: 'staff_name', width: 90 },
  { title: '归属地 / 供应商', key: 'region_supplier', width: 140 },
  { title: '购买账号', key: 'purchase_account', width: 130 },
  { title: '费用 / 余额', key: 'extra', width: 100 },
  { title: '状态', key: 'status', width: 90 },
  { title: '到期日', key: 'next_renew_at', width: 100 },
  { title: '备注', key: 'notes', width: 110, ellipsis: true },
  { title: '操作', key: 'action', width: 150, fixed: 'right' as const },
]

function currentTable() {
  const map: Record<TabKey, string> = { buyer: 'ip_resources', server: 'servers', phone: 'sim_cards' }
  return map[activeTab.value]
}

function phoneRowTable(row: any) {
  return row._source === 'Pingme' ? 'pingme_numbers' : 'sim_cards'
}

function getRenewClass(date: string) {
  if (!date) return ''
  const days = dayjs(date).diff(dayjs(), 'day')
  if (days < 0) return 'expired'
  if (days <= 7) return 'expiring-soon'
  if (days <= 15) return 'expiring-warn'
  return ''
}

async function loadData() {
  loading.value = true
  try {
    if (activeTab.value === 'buyer') {
      let q = supabase.from('ip_resources').select('*', { count: 'exact' }).eq('ip_type', '买手IP').order('created_at', { ascending: false })
      if (search.value) q = q.or(`ip_address.ilike.%${search.value}%,supplier.ilike.%${search.value}%,chat_account.ilike.%${search.value}%,staff_name.ilike.%${search.value}%`)
      if (filterStatus.value) q = q.eq('status', filterStatus.value)
      if (filterRegion.value) q = q.eq('region', filterRegion.value)
      if (filterDoNotRenew.value !== undefined && filterDoNotRenew.value !== null) q = q.eq('do_not_renew', filterDoNotRenew.value)
      q = q.range((page.value - 1) * pageSize.value, page.value * pageSize.value - 1)
      const { data, count } = await q
      list.value = data || []
      total.value = count || 0
    } else if (activeTab.value === 'server') {
      let q = supabase.from('servers').select('*', { count: 'exact' }).order('created_at', { ascending: false })
      if (search.value) q = q.or(`server_ip.ilike.%${search.value}%,username.ilike.%${search.value}%,supplier.ilike.%${search.value}%,region.ilike.%${search.value}%`)
      if (filterStatus.value) q = q.eq('status', filterStatus.value)
      if (filterUsage.value) q = q.eq('usage_type', filterUsage.value)
      if (filterRegion.value) q = q.eq('region', filterRegion.value)
      q = q.range((page.value - 1) * pageSize.value, page.value * pageSize.value - 1)
      const { data, count } = await q
      list.value = data || []
      total.value = count || 0
    } else {
      let simQ = supabase.from('sim_cards').select('*').order('created_at', { ascending: false })
      let pingmeQ = supabase.from('pingme_numbers').select('*').order('created_at', { ascending: false })
      if (search.value) {
        simQ = simQ.or(`phone_number.ilike.%${search.value}%,chat_account.ilike.%${search.value}%,staff_name.ilike.%${search.value}%,purchase_account.ilike.%${search.value}%`)
        pingmeQ = pingmeQ.or(`account_name.ilike.%${search.value}%,phone_number.ilike.%${search.value}%,chat_account.ilike.%${search.value}%,staff_name.ilike.%${search.value}%`)
      }
      if (filterStatus.value) { simQ = simQ.eq('status', filterStatus.value); pingmeQ = pingmeQ.eq('status', filterStatus.value) }
      if (filterRegion.value) { simQ = simQ.eq('region', filterRegion.value); pingmeQ = pingmeQ.eq('region', filterRegion.value) }
      const [simRes, pingmeRes] = await Promise.all([simQ, pingmeQ])
      let simRows = (simRes.data || []).map((r: any) => ({ ...r, _source: 'SIM', _uid: `sim_${r.id}` }))
      let pingmeRows = (pingmeRes.data || []).map((r: any) => ({ ...r, _source: 'Pingme', _uid: `pm_${r.id}` }))
      if (filterPhoneType.value === 'SIM') pingmeRows = []
      if (filterPhoneType.value === 'Pingme') simRows = []
      const combined = [...simRows, ...pingmeRows].sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''))
      total.value = combined.length
      const start = (page.value - 1) * pageSize.value
      list.value = combined.slice(start, start + pageSize.value)
    }
  } finally { loading.value = false }
}

async function loadStats() {
  let rows: any[] = []
  if (activeTab.value === 'buyer') {
    const { data } = await supabase.from('ip_resources').select('status, next_renew_at, do_not_renew').eq('ip_type', '买手IP')
    rows = data || []
  } else if (activeTab.value === 'server') {
    const { data } = await supabase.from('servers').select('status, next_renew_at, do_not_renew')
    rows = data || []
  } else {
    const [s1, s2] = await Promise.all([
      supabase.from('sim_cards').select('status, next_renew_at, do_not_renew'),
      supabase.from('pingme_numbers').select('status, do_not_renew'),
    ])
    rows = [...(s1.data || []), ...(s2.data || [])]
  }
  stats.total = rows.length
  stats.active = rows.filter((r: any) => r.status === '使用中').length
  stats.disabled = rows.filter((r: any) => r.status === '已停用' || r.status === '已替换').length
  stats.doNotRenew = rows.filter((r: any) => r.do_not_renew).length
  stats.expire7 = rows.filter((r: any) => {
    if (!r.next_renew_at) return false
    const d = dayjs(r.next_renew_at).diff(dayjs(), 'day')
    return d >= 0 && d <= 7
  }).length
  stats.expire15 = rows.filter((r: any) => {
    if (!r.next_renew_at) return false
    const d = dayjs(r.next_renew_at).diff(dayjs(), 'day')
    return d > 7 && d <= 15
  }).length
  stats.expire30 = rows.filter((r: any) => {
    if (!r.next_renew_at) return false
    const d = dayjs(r.next_renew_at).diff(dayjs(), 'day')
    return d > 15 && d <= 30
  }).length
}

function filterByExpire(days: number) {
  if (expireFilter.value === days) {
    expireFilter.value = null
    loadData()
    return
  }
  expireFilter.value = days
  const today = dayjs()
  const filtered = list.value.filter(r => {
    if (!r.next_renew_at) return false
    const d = dayjs(r.next_renew_at).diff(today, 'day')
    if (days === 7) return d >= 0 && d <= 7
    if (days === 15) return d > 7 && d <= 15
    if (days === 30) return d > 15 && d <= 30
    return false
  })
  list.value = filtered
}

function onTabChange() {
  page.value = 1
  search.value = ''
  filterStatus.value = undefined
  filterRegion.value = undefined
  filterDoNotRenew.value = undefined
  filterUsage.value = undefined
  filterPhoneType.value = undefined
  expireFilter.value = null
  loadData()
  loadStats()
}

function onTableChange(p: any) {
  page.value = p.current
  pageSize.value = p.pageSize
  loadData()
}

function resetForms() {
  Object.assign(buyerForm, { ip_address: '', ip_type: '买手IP', region: '', supplier: '', phone_number: '', chat_account: '', staff_name: '', renew_cycle: '月付', renew_price: 0, last_renewed_at: '', next_renew_at: '', status: '使用中', assigned_to: '', notes: '', do_not_renew: false })
  Object.assign(serverForm, { server_ip: '', username: '', region: '', supplier: '', renew_cycle: '月付', renew_price: 0, last_renewed_at: '', next_renew_at: '', status: '使用中', usage_type: 'PayPal专用', notes: '' })
  Object.assign(phoneForm, { phone_type: 'SIM', phone_number: '', account_name: '', purchase_account: '', region: '', supplier: '', chat_account: '', staff_name: '', device_info: '', status: '使用中', renew_price: 0, renew_cycle: '年付', last_renewed_at: '', next_renew_at: '', balance: 0, do_not_renew: false, notes: '' })
}

function openAdd() {
  editId.value = null
  resetForms()
  modalOpen.value = true
}

function openEdit(row: any) {
  editId.value = row.id
  if (activeTab.value === 'buyer') {
    Object.assign(buyerForm, { ip_address: row.ip_address || '', ip_type: row.ip_type || '买手IP', region: row.region || '', supplier: row.supplier || '', phone_number: row.phone_number || '', chat_account: row.chat_account || '', staff_name: row.staff_name || '', renew_cycle: row.renew_cycle || '月付', renew_price: row.renew_price || 0, last_renewed_at: row.last_renewed_at || '', next_renew_at: row.next_renew_at || '', status: row.status || '使用中', assigned_to: row.assigned_to || '', notes: row.notes || '', do_not_renew: row.do_not_renew || false })
  } else if (activeTab.value === 'server') {
    Object.assign(serverForm, { server_ip: row.server_ip || '', username: row.username || '', region: row.region || '', supplier: row.supplier || '', renew_cycle: row.renew_cycle || '月付', renew_price: row.renew_price || 0, last_renewed_at: row.last_renewed_at || '', next_renew_at: row.next_renew_at || '', status: row.status || '使用中', usage_type: row.usage_type || 'PayPal专用', notes: row.notes || '' })
  } else {
    const src = row._source || 'SIM'
    Object.assign(phoneForm, {
      phone_type: src,
      phone_number: row.phone_number || '',
      account_name: row.account_name || '',
      purchase_account: row.purchase_account || '',
      region: row.region || '',
      supplier: row.supplier || '',
      chat_account: row.chat_account || '',
      staff_name: row.staff_name || '',
      device_info: row.device_info || '',
      status: row.status || '使用中',
      renew_price: row.renew_price || 0,
      renew_cycle: row.renew_cycle || '年付',
      last_renewed_at: row.last_renewed_at || '',
      next_renew_at: row.next_renew_at || '',
      balance: row.balance || 0,
      do_not_renew: row.do_not_renew || false,
      notes: row.notes || '',
    })
  }
  modalOpen.value = true
}

async function handleSave() {
  saving.value = true
  try {
    if (activeTab.value === 'buyer') {
      if (!buyerForm.ip_address.trim()) { message.error('IP 地址不能为空'); saving.value = false; return }
      const payload = { ...buyerForm, updated_at: new Date().toISOString() } as any
      if (!payload.last_renewed_at) payload.last_renewed_at = null
      if (!payload.next_renew_at) payload.next_renew_at = null
      if (editId.value) { await supabase.from('ip_resources').update(payload).eq('id', editId.value); message.success('已更新') }
      else { await supabase.from('ip_resources').insert(payload); message.success('已新增') }
    } else if (activeTab.value === 'server') {
      if (!serverForm.server_ip.trim()) { message.error('服务器 IP 不能为空'); saving.value = false; return }
      const payload = { ...serverForm, updated_at: new Date().toISOString() } as any
      if (!payload.last_renewed_at) payload.last_renewed_at = null
      if (!payload.next_renew_at) payload.next_renew_at = null
      if (editId.value) { await supabase.from('servers').update(payload).eq('id', editId.value); message.success('已更新') }
      else { await supabase.from('servers').insert(payload); message.success('已新增') }
    } else {
      const isSIM = phoneForm.phone_type === 'SIM'
      if (isSIM && !phoneForm.phone_number.trim()) { message.error('手机号码不能为空'); saving.value = false; return }
      if (!isSIM && !phoneForm.account_name.trim()) { message.error('账号名称不能为空'); saving.value = false; return }
      const { phone_type, ...rest } = phoneForm
      if (isSIM) {
        const { account_name, balance, ...simPayload } = { ...rest, updated_at: new Date().toISOString() } as any
        if (!simPayload.last_renewed_at) simPayload.last_renewed_at = null
        if (!simPayload.next_renew_at) simPayload.next_renew_at = null
        if (editId.value) { await supabase.from('sim_cards').update(simPayload).eq('id', editId.value); message.success('已更新') }
        else { await supabase.from('sim_cards').insert(simPayload); message.success('已新增') }
      } else {
        const { device_info, renew_price, renew_cycle, last_renewed_at, next_renew_at, purchase_account, ...pmPayload } = { ...rest, updated_at: new Date().toISOString() } as any
        if (editId.value) { await supabase.from('pingme_numbers').update(pmPayload).eq('id', editId.value); message.success('已更新') }
        else { await supabase.from('pingme_numbers').insert(pmPayload); message.success('已新增') }
      }
    }
    modalOpen.value = false
    loadData(); loadStats()
  } finally { saving.value = false }
}

function quickRenew(row: any) {
  renewId.value = row.id
  renewTable.value = activeTab.value === 'phone' ? phoneRowTable(row) : currentTable()
  renewForm.last_renewed_at = dayjs().format('YYYY-MM-DD')
  renewForm.next_renew_at = row.next_renew_at || ''
  renewOpen.value = true
}

async function handleRenew() {
  if (!renewId.value) return
  saving.value = true
  try {
    const fields: any = { status: '使用中', updated_at: new Date().toISOString() }
    if (renewTable.value !== 'pingme_numbers') {
      fields.last_renewed_at = renewForm.last_renewed_at || null
      fields.next_renew_at = renewForm.next_renew_at || null
    }
    await supabase.from(renewTable.value).update(fields).eq('id', renewId.value)
    message.success('续费记录已更新')
    renewOpen.value = false
    loadData(); loadStats()
  } finally { saving.value = false }
}

function openReplace(row: any) {
  replaceTarget.value = row
  replaceForm.new_ip_address = ''
  replaceForm.replaced_at = dayjs().format('YYYY-MM-DD')
  replaceForm.reason = ''
  replaceForm.operated_by = ''
  replaceForm.notes = ''
  replaceOpen.value = true
}

async function handleReplace() {
  if (!replaceForm.new_ip_address.trim()) { message.error('请输入新 IP 地址'); return }
  if (!replaceTarget.value) return
  saving.value = true
  try {
    const oldRow = replaceTarget.value
    const { data: newIp } = await supabase.from('ip_resources').insert({
      ip_address: replaceForm.new_ip_address.trim(), ip_type: oldRow.ip_type,
      region: oldRow.region || '', supplier: oldRow.supplier || '',
      phone_number: oldRow.phone_number || '', chat_account: oldRow.chat_account || '',
      staff_name: oldRow.staff_name || '', renew_cycle: oldRow.renew_cycle || '月付',
      renew_price: oldRow.renew_price || 0, status: '使用中',
      assigned_to: oldRow.assigned_to || '', notes: '', do_not_renew: false,
    }).select().single()
    await supabase.from('ip_resources').update({ status: '已替换', updated_at: new Date().toISOString() }).eq('id', oldRow.id)
    await supabase.from('ip_replacement_logs').insert({
      old_ip_id: oldRow.id, new_ip_id: newIp?.id || null,
      old_ip_address: oldRow.ip_address, new_ip_address: replaceForm.new_ip_address.trim(),
      ip_type: oldRow.ip_type, replaced_at: replaceForm.replaced_at || dayjs().format('YYYY-MM-DD'),
      reason: replaceForm.reason || '', operated_by: replaceForm.operated_by || '', notes: replaceForm.notes || '',
    })
    message.success('替换成功，已新增新 IP 并记录替换日志')
    replaceOpen.value = false
    loadData(); loadStats()
  } finally { saving.value = false }
}

async function openHistory(row: any) {
  historyTarget.value = row
  historyOpen.value = true
  historyLoading.value = true
  try {
    const { data } = await supabase.from('ip_replacement_logs').select('*')
      .or(`old_ip_id.eq.${row.id},new_ip_id.eq.${row.id}`)
      .order('replaced_at', { ascending: false })
    historyList.value = data || []
  } finally { historyLoading.value = false }
}

function openRecharge(row: any) {
  rechargeTarget.value = row
  rechargeForm.amount = 0
  rechargeForm.date = dayjs().format('YYYY-MM-DD')
  rechargeForm.operator = ''
  rechargeForm.notes = ''
  rechargeOpen.value = true
}

async function handleRecharge() {
  if (!rechargeForm.amount || rechargeForm.amount <= 0) { message.error('请输入充值金额'); return }
  if (!rechargeTarget.value) return
  saving.value = true
  try {
    const row = rechargeTarget.value
    const logs = Array.isArray(row.recharge_logs) ? [...row.recharge_logs] : []
    logs.push({ date: rechargeForm.date, amount: rechargeForm.amount, operator: rechargeForm.operator, notes: rechargeForm.notes })
    const newBalance = Number(row.balance || 0) + Number(rechargeForm.amount)
    await supabase.from('pingme_numbers').update({
      balance: newBalance, recharge_logs: logs, updated_at: new Date().toISOString(),
    }).eq('id', row.id)
    message.success(`充值成功，余额更新为 ¥${newBalance.toFixed(2)}`)
    rechargeOpen.value = false
    loadData()
  } finally { saving.value = false }
}

function openRechargeLogs(row: any) {
  rechargeLogsTarget.value = row
  rechargeLogsOpen.value = true
}

function openPhoneReplace(row: any) {
  phoneReplaceTarget.value = row
  phoneReplaceForm.new_phone = ''
  phoneReplaceForm.reason = ''
  phoneReplaceForm.operated_by = ''
  phoneReplaceForm.notes = ''
  phoneReplaceOpen.value = true
}

async function handlePhoneReplace() {
  if (!phoneReplaceForm.new_phone.trim()) { message.error('请输入新号码/账号名称'); return }
  if (!phoneReplaceTarget.value) return
  saving.value = true
  try {
    const row = phoneReplaceTarget.value
    const isSIM = row._source === 'SIM'
    const tbl = isSIM ? 'sim_cards' : 'pingme_numbers'
    const newRecord: any = { ...row }
    delete newRecord.id
    delete newRecord._source
    delete newRecord._uid
    newRecord.status = '使用中'
    newRecord.do_not_renew = false
    newRecord.notes = phoneReplaceForm.notes || ''
    newRecord.updated_at = new Date().toISOString()
    newRecord.created_at = new Date().toISOString()
    if (isSIM) {
      newRecord.phone_number = phoneReplaceForm.new_phone.trim()
    } else {
      newRecord.account_name = phoneReplaceForm.new_phone.trim()
    }
    await supabase.from(tbl).update({ status: '已替换', updated_at: new Date().toISOString() }).eq('id', row.id)
    await supabase.from(tbl).insert(newRecord)
    message.success('替换成功')
    phoneReplaceOpen.value = false
    loadData(); loadStats()
  } finally { saving.value = false }
}

async function markNoRenew(row: any) {
  const tbl = activeTab.value === 'phone' ? phoneRowTable(row) : currentTable()
  await supabase.from(tbl).update({ do_not_renew: true, updated_at: new Date().toISOString() }).eq('id', row.id)
  message.warning('已标记')
  loadData(); loadStats()
}

async function unmarkNoRenew(row: any) {
  const tbl = activeTab.value === 'phone' ? phoneRowTable(row) : currentTable()
  await supabase.from(tbl).update({ do_not_renew: false, updated_at: new Date().toISOString() }).eq('id', row.id)
  message.success('已取消标记')
  loadData(); loadStats()
}

async function deleteRow(row: any) {
  const tbl = activeTab.value === 'phone' ? phoneRowTable(row) : currentTable()
  await supabase.from(tbl).delete().eq('id', row.id)
  message.success('已删除')
  loadData(); loadStats()
}

onMounted(() => { loadData(); loadStats() })
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }

.kpi-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; margin-bottom: 20px; }
.kpi-card { background: #fff; border-radius: 10px; padding: 14px 10px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); border: 1px solid #f0f0f0; transition: border-color .2s, box-shadow .2s; }
.kpi-card.clickable { cursor: pointer; }
.kpi-card.clickable:hover { border-color: #1677ff; box-shadow: 0 2px 8px rgba(22,119,255,.12); }
.kpi-card.active { border-color: #1677ff; background: #e6f4ff; box-shadow: 0 2px 8px rgba(22,119,255,.15); }
.kpi-card.kpi-expire7.active { border-color: #ff4d4f; background: #fff1f0; }
.kpi-card.kpi-expire15.active { border-color: #fa8c16; background: #fff7e6; }
.kpi-card.kpi-expire30.active { border-color: #faad14; background: #fffbe6; }
.kpi-val { font-size: 22px; font-weight: 700; color: #1677ff; }
.kpi-val.green { color: #52c41a; }
.kpi-val.orange { color: #fa8c16; }
.kpi-val.red { color: #ff4d4f; }
.kpi-val.gray { color: #8c8c8c; }
.kpi-val.warn { color: #dc2626; }
.kpi-val.warn2 { color: #faad14; }
.kpi-label { font-size: 12px; color: #8c8c8c; margin-top: 4px; }

.res-tabs { background: #fff; border-radius: 10px; padding: 0 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); border: 1px solid #f0f0f0; }
.filter-bar { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; padding-top: 4px; }

.ip-cell { display: flex; align-items: center; gap: 6px; }
.ip-addr { font-family: monospace; font-weight: 600; font-size: 13px; color: #1a1a2e; }

.binding-cell { display: flex; align-items: center; gap: 6px; }
.binding-icon { width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0; }
.chat-icon { background: #07c160; }
.binding-val { font-size: 13px; color: #374151; }

.staff-badge { font-size: 12px; background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
.account-text { font-size: 12px; color: #374151; font-family: monospace; }
.renew-price { font-size: 12px; color: #555; }
.text-empty { color: #d1d5db; font-size: 13px; }

.balance-ok { font-size: 13px; font-weight: 600; color: #16a34a; }
.balance-low { font-size: 13px; font-weight: 600; color: #dc2626; }
.balance-cell { display: flex; flex-direction: column; gap: 1px; }
.balance-hint { font-size: 10px; color: #9ca3af; }

.account-sub-num { font-size: 11px; color: #9ca3af; font-family: monospace; }
.recharge-sub-num { font-size: 11px; color: #9ca3af; font-family: monospace; margin-top: 2px; }

.expired { color: #ff4d4f; font-weight: 600; }
.expiring-soon { color: #ff4d4f; font-weight: 500; }
.expiring-warn { color: #fa8c16; }

:deep(.row-no-renew) td { background: #fff7ed !important; }
:deep(.row-no-renew):hover td { background: #ffedd5 !important; }

.replace-info { display: flex; align-items: center; gap: 12px; background: #f8faff; border: 1px solid #e0e7ff; border-radius: 8px; padding: 12px 16px; }
.replace-label { font-size: 11px; color: #9ca3af; margin-right: 6px; }
.replace-arrow { font-size: 20px; color: #6b7280; flex-shrink: 0; }
.replace-old, .replace-new { display: flex; align-items: center; gap: 6px; }

.recharge-header { display: flex; align-items: center; gap: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; }
.recharge-balance { font-size: 13px; color: #374151; }
.recharge-balance strong { color: #16a34a; }
.recharge-summary { background: #f9fafb; border-radius: 6px; padding: 8px 14px; font-size: 13px; color: #374151; }
.recharge-amount { font-weight: 700; color: #16a34a; font-size: 14px; margin-left: 8px; }

.drawer-loading { display: flex; justify-content: center; padding: 40px; }
.drawer-empty { text-align: center; color: #9ca3af; padding: 40px; }

.log-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.log-date { font-size: 13px; font-weight: 600; color: #374151; }
.log-operator { font-size: 12px; color: #9ca3af; }
.log-body { background: #f9fafb; border-radius: 6px; padding: 8px 12px; }
.log-ip-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.log-ip { font-family: monospace; font-size: 13px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
.log-ip.old { background: #fee2e2; color: #b91c1c; }
.log-ip.new { background: #dcfce7; color: #166534; }
.log-arrow { color: #9ca3af; font-size: 14px; }
.log-notes { font-size: 12px; color: #6b7280; margin-top: 4px; }

.server-cell { display: flex; flex-direction: column; gap: 2px; }
.server-username { font-size: 11px; color: #9ca3af; font-family: monospace; }

.phone-cell { display: flex; align-items: flex-start; gap: 6px; }
.phone-cell-info { display: flex; flex-direction: column; gap: 2px; }

.region-supplier-cell { display: flex; flex-direction: column; gap: 3px; }
.supplier-text { font-size: 12px; color: #6b7280; }

.notes-ellipsis { font-size: 12px; color: #555; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
</style>
