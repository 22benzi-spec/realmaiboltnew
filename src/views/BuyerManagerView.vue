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
          <a-input-search v-model:value="searchText" placeholder="搜索买手姓名/编号/账号/Facebook" style="width:260px" allow-clear @search="load" @change="onSearchChange" />
          <a-select v-model:value="filterCountry" style="width:110px" @change="load" allow-clear placeholder="国家">
            <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
          </a-select>
          <a-select v-model:value="filterLevel" style="width:100px" @change="load" allow-clear placeholder="等级">
            <a-select-option value="普通">普通</a-select-option>
            <a-select-option value="优质">优质</a-select-option>
            <a-select-option value="VIP">VIP</a-select-option>
          </a-select>
          <a-select v-model:value="filterStaff" style="width:120px" @change="load" allow-clear placeholder="业务员">
            <a-select-option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
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
        :scroll="{ x: 1400 }"
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
                <div class="buyer-sub">{{ record.country }}{{ record.region ? ' · ' + record.region : '' }}</div>
              </div>
            </div>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColor[record.status] || 'default'" class="status-tag">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'tags'">
            <div class="tags-cell">
              <a-tag v-for="tag in (record.tags || []).slice(0,2)" :key="tag" size="small" color="blue">{{ tag }}</a-tag>
              <span v-if="(record.tags || []).length > 2" class="more-tags">+{{ record.tags.length - 2 }}</span>
            </div>
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
          <template v-if="column.key === 'contact_platform'">
            <span class="text-mono small">{{ record.contact_platform || '—' }}</span>
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
    <a-modal v-model:open="addModalOpen" title="添加买手" @ok="handleAddSubmit" :confirm-loading="submitting" width="680px">
      <a-form :model="addForm" layout="vertical" ref="addFormRef" :rules="addRules">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="买手名" name="name"><a-input v-model:value="addForm.name" placeholder="真实姓名" /></a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="买手ID（平台账号）">
              <a-input v-model:value="addForm.platform_account" placeholder="Amazon账号ID" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="国家">
              <a-select v-model:value="addForm.country">
                <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Facebook 链接">
              <a-input v-model:value="addForm.facebook_link" placeholder="https://facebook.com/..." />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="是否 Prime 会员">
              <a-switch v-model:checked="addForm.is_prime_member" checked-children="会员" un-checked-children="非会员" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="对接平台">
              <a-input v-model:value="addForm.contact_platform" placeholder="如 Facebook" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="来源渠道">
              <a-select v-model:value="addForm.source_channel" allow-clear placeholder="选择来源">
                <a-select-option value="老客推荐">老客推荐</a-select-option>
                <a-select-option value="前端引流">前端引流</a-select-option>
                <a-select-option value="中介介绍">中介介绍</a-select-option>
                <a-select-option value="渠道未知">渠道未知</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12" v-if="addForm.source_channel === '中介介绍'">
            <a-form-item label="介绍人">
              <a-input v-model:value="addForm.referrer_name" placeholder="填写介绍人姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="addForm.source_channel === '中介介绍' ? 24 : 12">
            <a-form-item label="所属聊单号">
              <a-input v-model:value="addForm.chat_account" placeholder="聊单账号" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注"><a-textarea v-model:value="addForm.notes" :rows="2" /></a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 编辑买手弹窗（全字段 + 扩展信息） -->
    <a-modal v-model:open="editModalOpen" title="编辑买手" @ok="handleEditSubmit" :confirm-loading="submitting" width="780px" :body-style="{ maxHeight: '75vh', overflowY: 'auto', padding: '0 24px' }">
      <a-tabs v-model:activeKey="editTab" size="small" style="margin-top: 8px">
        <!-- Tab 1: 基本信息 -->
        <a-tab-pane key="basic" tab="基本信息">
          <a-form :model="editForm" layout="vertical">
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="买手名" required><a-input v-model:value="editForm.name" /></a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="买手ID（平台账号）"><a-input v-model:value="editForm.platform_account" /></a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="国家">
                  <a-select v-model:value="editForm.country">
                    <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="Facebook 链接"><a-input v-model:value="editForm.facebook_link" /></a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="是否 Prime 会员">
                  <a-switch v-model:checked="editForm.is_prime_member" checked-children="会员" un-checked-children="非会员" />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="对接平台"><a-input v-model:value="editForm.contact_platform" /></a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="来源渠道">
                  <a-select v-model:value="editForm.source_channel" allow-clear>
                    <a-select-option value="老客推荐">老客推荐</a-select-option>
                    <a-select-option value="前端引流">前端引流</a-select-option>
                    <a-select-option value="中介介绍">中介介绍</a-select-option>
                    <a-select-option value="渠道未知">渠道未知</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="介绍人（中介介绍时填写）">
                  <a-input v-model:value="editForm.referrer_name" :disabled="editForm.source_channel !== '中介介绍'" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="所属聊单号"><a-input v-model:value="editForm.chat_account" /></a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="状态">
                  <a-select v-model:value="editForm.status">
                    <a-select-option value="活跃">活跃</a-select-option>
                    <a-select-option value="暂停">暂停</a-select-option>
                    <a-select-option value="黑名单">黑名单</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="等级">
                  <a-select v-model:value="editForm.level">
                    <a-select-option value="普通">普通</a-select-option>
                    <a-select-option value="优质">优质</a-select-option>
                    <a-select-option value="VIP">VIP</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="业务员">
                  <a-select v-model:value="editForm.staff_id" allow-clear @change="onStaffChange">
                    <a-select-option v-for="s in staffList" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
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

        <!-- Tab 2: 扩展信息 -->
        <a-tab-pane key="extended" tab="扩展信息">
          <a-form :model="editForm" layout="vertical">
            <a-row :gutter="16">
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
                <a-form-item label="生日">
                  <a-input v-model:value="editForm.birthday" placeholder="YYYY-MM-DD" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="所属地区">
                  <a-input v-model:value="editForm.region" placeholder="如：德州/加州" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="Facebook名"><a-input v-model:value="editForm.facebook_name" /></a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="贝宝邮箱"><a-input v-model:value="editForm.paypal_email" /></a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="手机号"><a-input v-model:value="editForm.phone" /></a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="邮箱"><a-input v-model:value="editForm.email" /></a-form-item>
              </a-col>

              <!-- 备用联系方式 -->
              <a-col :span="24">
                <a-form-item label="备用联系方式">
                  <div class="backup-contacts-editor">
                    <div v-for="(bc, idx) in backupContacts" :key="idx" class="bc-row">
                      <a-select v-model:value="bc.type" style="width:130px" size="small">
                        <a-select-option v-for="t in backupContactTypes" :key="t" :value="t">{{ t }}</a-select-option>
                      </a-select>
                      <a-input v-model:value="bc.value" size="small" style="flex:1" :placeholder="bcPlaceholder(bc.type)" />
                      <a-button type="text" size="small" danger @click="removeBackupContact(idx)">删除</a-button>
                    </div>
                    <a-button type="dashed" size="small" @click="addBackupContact" style="margin-top:6px">
                      <PlusOutlined /> 添加备用联系方式
                    </a-button>
                  </div>
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </a-tab-pane>

        <!-- Tab 3: 购买记录 -->
        <a-tab-pane key="purchase" tab="购买记录">
          <a-form :model="editForm" layout="vertical">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="已购ASIN" extra="多个ASIN用逗号分隔">
                  <a-textarea v-model:value="editForm.purchased_asins" :rows="3" placeholder="B0XXXXXXXX, B0YYYYYYYY" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="已购店铺" extra="多个店铺用逗号分隔">
                  <a-textarea v-model:value="editForm.purchased_stores" :rows="3" placeholder="店铺名称" />
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item label="Amazon Profile 链接">
                  <a-input v-model:value="editForm.amazon_profile" placeholder="https://www.amazon.com/gp/profile/..." />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </a-tab-pane>
      </a-tabs>
    </a-modal>

    <!-- 详情抽屉 -->
    <a-drawer v-model:open="drawerOpen" title="买手详情" width="580" :body-style="{ padding: '0' }">
      <div v-if="drawerBuyer" class="drawer-body">
        <div class="drawer-header-card">
          <div class="drawer-avatar" :style="{ background: avatarColor(drawerBuyer.name) }">{{ drawerBuyer.name?.[0] || '?' }}</div>
          <div class="drawer-header-info">
            <div class="drawer-name">
              {{ drawerBuyer.name }}
              <span class="drawer-number">{{ drawerBuyer.buyer_number }}</span>
              <a-tag v-if="drawerBuyer.is_prime_member" color="gold" size="small" style="margin-left:4px">Prime</a-tag>
            </div>
            <div class="drawer-meta">
              <a-tag :color="statusColor[drawerBuyer.status] || 'default'">{{ drawerBuyer.status }}</a-tag>
              <a-tag color="geekblue">{{ drawerBuyer.level }}</a-tag>
              <span class="drawer-country">{{ drawerBuyer.country }}{{ drawerBuyer.region ? ' · ' + drawerBuyer.region : '' }}</span>
            </div>
            <div class="drawer-tags">
              <a-tag v-for="t in (drawerBuyer.tags || [])" :key="t" color="blue" size="small">{{ t }}</a-tag>
              <a-tag v-if="drawerBuyer.cooperation_level" :color="cooperationColor[drawerBuyer.cooperation_level] || 'default'" size="small">配合度：{{ drawerBuyer.cooperation_level }}</a-tag>
            </div>
          </div>
        </div>

        <a-tabs v-model:activeKey="drawerTab" style="padding: 0 16px;" size="small">
          <a-tab-pane key="info" tab="基本信息">
            <div class="drawer-section">
              <div class="ds-title">基本信息</div>
              <div class="ds-grid">
                <div class="ds-item"><span class="ds-label">业务员</span><span>{{ drawerBuyer.staff_name || '—' }}</span></div>
                <div class="ds-item"><span class="ds-label">入库时间</span><span>{{ formatDate(drawerBuyer.created_at) }}</span></div>
                <div class="ds-item"><span class="ds-label">已完成单数</span><span class="ds-value-num">{{ drawerBuyer.total_completed }}</span></div>
                <div class="ds-item"><span class="ds-label">成功率</span><span class="ds-value-num">{{ drawerBuyer.success_rate ? drawerBuyer.success_rate + '%' : '—' }}</span></div>
                <div class="ds-item"><span class="ds-label">来源渠道</span>
                  <span>
                    <a-tag v-if="drawerBuyer.source_channel" size="small" :color="sourceChannelColor[drawerBuyer.source_channel] || 'default'">{{ drawerBuyer.source_channel }}</a-tag>
                    <span v-if="drawerBuyer.referrer_name" class="source-referrer-detail">介绍人：{{ drawerBuyer.referrer_name }}</span>
                  </span>
                </div>
                <div class="ds-item"><span class="ds-label">对接平台</span><span>{{ drawerBuyer.contact_platform || '—' }}</span></div>
                <div class="ds-item"><span class="ds-label">所属聊单号</span><span class="text-mono">{{ drawerBuyer.chat_account || '—' }}</span></div>
                <div class="ds-item"><span class="ds-label">Facebook 链接</span>
                  <a v-if="drawerBuyer.facebook_link" :href="drawerBuyer.facebook_link" target="_blank" class="profile-link-full" style="word-break:break-all">{{ drawerBuyer.facebook_link }}</a>
                  <span v-else>—</span>
                </div>
              </div>
            </div>

            <div class="drawer-section">
              <div class="ds-title">扩展信息</div>
              <div class="ds-grid">
                <div class="ds-item"><span class="ds-label">Facebook名</span><span class="text-mono">{{ drawerBuyer.facebook_name || '—' }}</span></div>
                <div class="ds-item"><span class="ds-label">贝宝邮箱</span><span class="text-mono small">{{ drawerBuyer.paypal_email || '—' }}</span></div>
                <div class="ds-item"><span class="ds-label">手机号</span><span>{{ drawerBuyer.phone || '—' }}</span></div>
                <div class="ds-item"><span class="ds-label">邮箱</span><span class="text-mono small">{{ drawerBuyer.email || '—' }}</span></div>
                <div class="ds-item"><span class="ds-label">生日</span><span>{{ drawerBuyer.birthday || '—' }}</span></div>
                <div class="ds-item"><span class="ds-label">平台账号</span><span>{{ drawerBuyer.platform_account || '—' }}</span></div>
              </div>
              <!-- 备用联系方式 -->
              <div v-if="parsedBackupContacts(drawerBuyer.backup_contacts).length" class="ds-block" style="margin-top:10px">
                <div class="ds-label-full">备用联系方式</div>
                <div class="backup-display">
                  <div v-for="(bc, i) in parsedBackupContacts(drawerBuyer.backup_contacts)" :key="i" class="bc-display-row">
                    <span class="bc-type-badge">{{ bc.type }}</span>
                    <span class="bc-value">{{ bc.value }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="drawer-section">
              <div class="ds-title">购买记录</div>
              <div v-if="drawerBuyer.purchased_asins" class="ds-block">
                <div class="ds-label-full">已购ASIN（{{ asinCount(drawerBuyer.purchased_asins) }} 个）</div>
                <div class="asin-tags">
                  <span v-for="asin in splitValues(drawerBuyer.purchased_asins)" :key="asin" class="asin-tag">{{ asin }}</span>
                </div>
              </div>
              <div v-if="drawerBuyer.purchased_stores" class="ds-block">
                <div class="ds-label-full">已购店铺</div>
                <div class="store-tags">
                  <span v-for="store in splitValues(drawerBuyer.purchased_stores)" :key="store" class="store-tag">{{ store }}</span>
                </div>
              </div>
              <div v-if="drawerBuyer.amazon_profile" class="ds-item" style="grid-column: 1/-1; margin-top:6px">
                <span class="ds-label">Profile</span>
                <a :href="drawerBuyer.amazon_profile" target="_blank" class="profile-link-full">{{ drawerBuyer.amazon_profile }}</a>
              </div>
              <div v-if="!drawerBuyer.purchased_asins && !drawerBuyer.purchased_stores && !drawerBuyer.amazon_profile" class="ds-empty">暂无购买记录</div>
            </div>

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
const filterLevel = ref('')
const filterStaff = ref('')
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
const backupContactTypes = ['邮箱', '小号拉群', '小号加好友', 'WS', 'VIP群组', 'INS']

const countries = ['美国', '德国', '英国', '加拿大', '澳大利亚', '法国', '日本']
const tagPresets = [...BUYER_TAG_PRESETS]
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
  return map[type] || '填写具体信息'
}

const summaryStats = computed(() => [
  { key: 'all', label: '全部买手', count: allCounts.value.all, color: '#2563eb' },
  { key: 'active', label: '活跃', count: allCounts.value.active, color: '#059669' },
  { key: 'paused', label: '暂停', count: allCounts.value.paused, color: '#d97706' },
  { key: 'blacklist', label: '黑名单', count: allCounts.value.blacklist, color: '#dc2626' },
  { key: 'today', label: '当日新买手', count: allCounts.value.today, color: '#0891b2' },
])

const defaultAddForm = () => ({
  name: '', platform_account: '', country: '美国', facebook_link: '',
  is_prime_member: false, source_channel: '', referrer_name: '',
  chat_account: '', contact_platform: '', notes: '',
})

const defaultEditForm = () => ({
  name: '', platform_account: '', country: '美国', facebook_link: '',
  is_prime_member: false, source_channel: '', referrer_name: '',
  chat_account: '', contact_platform: '', notes: '',
  status: '活跃', level: '普通', staff_id: null as string | null, staff_name: '',
  tags: [] as string[], blacklist_reason: '',
  facebook_name: '', paypal_email: '', phone: '', email: '',
  cooperation_level: '', birthday: '', region: '',
  purchased_asins: '', purchased_stores: '', amazon_profile: '',
  backup_contacts: '[]',
})

const addForm = reactive(defaultAddForm())
const editForm = reactive(defaultEditForm())
const addRules = { name: [{ required: true, message: '请输入买手姓名' }] }

const columns = [
  { title: '买手ID', key: 'buyer_number', width: 95, fixed: 'left' },
  { title: '买手姓名', key: 'name', width: 160, fixed: 'left' },
  { title: '状态', key: 'status', width: 75 },
  { title: '画像标签', key: 'tags', width: 150 },
  { title: '来源', key: 'source_info', width: 140 },
  { title: 'Prime', key: 'is_prime_member', width: 70 },
  { title: '聊单号', key: 'chat_account', width: 120 },
  { title: '对接平台', key: 'contact_platform', width: 100 },
  { title: 'Profile', key: 'amazon_profile', width: 75 },
  { title: '入库时间', key: 'created_at', width: 100 },
  { title: '操作', key: 'action', width: 160, fixed: 'right' },
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
    if (filterLevel.value) query = query.eq('level', filterLevel.value)
    if (filterStaff.value) query = query.eq('staff_id', filterStaff.value)
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

function openEditModal(record: any) {
  editingId.value = record.id
  editTab.value = 'basic'
  Object.assign(editForm, defaultEditForm(), record)
  backupContacts.value = parsedBackupContacts(record.backup_contacts)
  editModalOpen.value = true
}

function openDetail(record: any) {
  drawerBuyer.value = record
  drawerTab.value = 'info'
  drawerOpen.value = true
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
    const payload = { ...addForm, status: '活跃', level: '普通' }
    const { error } = await supabase.from('erp_buyers').insert([payload])
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
    const payload = {
      ...editForm,
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
  await loadCounts()
  load()
}

async function unBlacklist(record: any) {
  const { error } = await supabase.from('erp_buyers').update({ status: '活跃', blacklist_reason: '', updated_at: new Date().toISOString() }).eq('id', record.id)
  if (error) { message.error('操作失败'); return }
  message.success('已恢复为活跃')
  await loadCounts()
  load()
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  load()
}

function formatDate(d: string) {
  return d ? dayjs(d).format('MM-DD HH:mm') : '—'
}

function asinCount(str: string) {
  return splitValues(str).length
}

function splitValues(str: string) {
  if (!str) return []
  return str.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean)
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
  padding: 12px 20px; min-width: 110px; cursor: pointer; transition: all 0.18s;
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

.buyer-id-badge { font-size: 11px; background: #f3f4f6; color: #374151; padding: 2px 7px; border-radius: 6px; font-family: monospace; font-weight: 600; }
.buyer-name-cell { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.buyer-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.buyer-name { font-weight: 600; color: #1a1a2e; font-size: 13px; }
.buyer-name:hover { color: #2563eb; text-decoration: underline; }
.buyer-sub { font-size: 11px; color: #9ca3af; }
.status-tag { font-size: 11px; }
.tags-cell { display: flex; flex-wrap: wrap; gap: 3px; }
.more-tags { font-size: 11px; color: #9ca3af; }
.source-cell { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.source-referrer { font-size: 11px; color: #6b7280; }
.text-mono { font-family: monospace; font-size: 12px; color: #374151; }
.text-mono.small { font-size: 11px; }
.text-empty { color: #d1d5db; font-size: 12px; }
.profile-link { font-size: 12px; color: #2563eb; }
.date-text { font-size: 12px; color: #6b7280; }

/* Backup contacts editor */
.backup-contacts-editor { display: flex; flex-direction: column; gap: 6px; }
.bc-row { display: flex; align-items: center; gap: 8px; }

/* Drawer */
.drawer-body { display: flex; flex-direction: column; height: 100%; }
.drawer-header-card { display: flex; gap: 14px; padding: 20px; background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%); border-bottom: 1px solid #e5e7eb; }
.drawer-avatar { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 22px; flex-shrink: 0; }
.drawer-header-info { flex: 1; }
.drawer-name { font-size: 17px; font-weight: 700; color: #1a1a2e; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.drawer-number { font-size: 12px; color: #9ca3af; font-family: monospace; font-weight: 400; }
.drawer-meta { display: flex; align-items: center; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.drawer-country { font-size: 12px; color: #6b7280; }
.drawer-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }

.drawer-section { padding: 14px 20px; border-bottom: 1px solid #f0f0f0; }
.ds-title { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
.ds-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ds-item { display: flex; flex-direction: column; gap: 2px; }
.ds-label { font-size: 11px; color: #9ca3af; }
.ds-value-num { font-size: 15px; font-weight: 700; color: #1a1a2e; }
.ds-block { margin-bottom: 10px; }
.ds-label-full { font-size: 11px; color: #9ca3af; margin-bottom: 6px; }
.ds-empty { font-size: 13px; color: #d1d5db; text-align: center; padding: 12px 0; }

.source-referrer-detail { font-size: 11px; color: #6b7280; margin-left: 4px; }

.backup-display { display: flex; flex-direction: column; gap: 5px; }
.bc-display-row { display: flex; align-items: center; gap: 8px; }
.bc-type-badge { font-size: 11px; background: #f0f4ff; color: #2563eb; padding: 1px 7px; border-radius: 5px; border: 1px solid #c7d2fe; white-space: nowrap; }
.bc-value { font-size: 12px; font-family: monospace; color: #374151; }

.asin-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.asin-tag { font-family: monospace; font-size: 11px; background: #eff6ff; color: #2563eb; padding: 2px 7px; border-radius: 5px; border: 1px solid #bfdbfe; }
.store-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.store-tag { font-size: 11px; background: #f0fdf4; color: #059669; padding: 2px 7px; border-radius: 5px; border: 1px solid #bbf7d0; }
.profile-link-full { font-size: 11px; color: #2563eb; word-break: break-all; }
.blacklist-section { background: #fef2f2; }
.blacklist-reason { font-size: 13px; color: #dc2626; }
.drawer-notes { font-size: 13px; color: #374151; line-height: 1.6; white-space: pre-wrap; }
.drawer-actions { display: flex; gap: 10px; padding: 16px 20px; border-top: 1px solid #f0f0f0; margin-top: auto; }
</style>
