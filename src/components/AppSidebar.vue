<template>
  <!-- 移动端遮罩 -->
  <div v-if="isMobile && drawerOpen" class="mobile-overlay" @click="drawerOpen = false"></div>

  <!-- 桌面端 / 移动端侧边抽屉 -->
  <div :class="['sidebar', collapsed ? 'sidebar--collapsed' : '', isMobile ? 'sidebar--mobile' : '', isMobile && drawerOpen ? 'sidebar--mobile-open' : '']">
    <div class="sidebar-logo">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <span v-if="!collapsed" class="logo-text">揽麦 ERP</span>
      <button class="collapse-btn" @click="isMobile ? drawerOpen = false : toggleCollapse()">
        <MenuFoldOutlined v-if="!collapsed" />
        <MenuUnfoldOutlined v-else />
      </button>
    </div>

    <div v-if="!collapsed" class="user-info">
      <div class="user-avatar" :style="{ background: avatarColor }">
        {{ currentUser.name.slice(0, 1) }}
      </div>
      <div class="user-meta">
        <div class="user-name">{{ currentUser.name }}</div>
        <div class="user-role-badge" :class="`role-${currentUser.role}`">{{ currentUser.role }}</div>
      </div>
    </div>

    <div class="sidebar-nav">
      <div class="nav-item home-item" :class="{ active: currentRoute === 'home' }" @click="navigate('home')">
        <HomeOutlined class="nav-icon" />
        <span v-if="!collapsed" class="nav-label">工作台首页</span>
      </div>

      <div v-for="group in visibleNavGroups" :key="group.id" class="nav-group">
        <div class="nav-group-header" @click="toggleGroup(group.id)">
          <div class="nav-group-left">
            <component :is="group.icon" class="nav-icon" />
            <span v-if="!collapsed" class="nav-label">{{ group.label }}</span>
          </div>
          <DownOutlined v-if="!collapsed" :class="['group-arrow', expandedGroups.has(group.id) ? 'rotated' : '']" />
        </div>
        <div v-if="!collapsed && expandedGroups.has(group.id)" class="nav-sub-items">
          <div
            v-for="item in group.items"
            :key="item.id"
            :class="['nav-sub-item', currentRoute === item.id ? 'active' : '']"
            @click="navigate(item.id)"
          >
            <component :is="item.icon" class="nav-sub-icon" />
            <span class="nav-sub-label">{{ item.label }}</span>
          </div>
        </div>
        <div v-if="collapsed" class="collapsed-sub-items">
          <div
            v-for="item in group.items"
            :key="item.id"
            :class="['collapsed-sub-item', currentRoute === item.id ? 'active' : '']"
            @click="navigate(item.id)"
          >
            <a-tooltip :title="item.label" placement="right">
              <component :is="item.icon" />
            </a-tooltip>
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <div
        :class="['nav-item', currentRoute === 'profile' ? 'active' : '']"
        @click="navigate('profile')"
      >
        <UserOutlined class="nav-icon" />
        <span v-if="!collapsed" class="nav-label">个人设置</span>
      </div>
    </div>
  </div>

  <!-- 移动端底部导航栏 -->
  <div v-if="isMobile" class="mobile-bottom-nav">
    <div
      v-for="tab in mobileTabs"
      :key="tab.id"
      :class="['mobile-tab', currentRoute === tab.id ? 'active' : '']"
      @click="navigate(tab.id)"
    >
      <component :is="tab.icon" class="mobile-tab-icon" />
      <span class="mobile-tab-label">{{ tab.label }}</span>
    </div>
    <div class="mobile-tab" @click="drawerOpen = true">
      <MenuOutlined class="mobile-tab-icon" />
      <span class="mobile-tab-label">更多</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  HomeOutlined, UserOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, DownOutlined, MenuOutlined,
  ShoppingOutlined, CheckCircleOutlined, TeamOutlined,
} from '@ant-design/icons-vue'
import { useCurrentUser } from '../composables/useCurrentUser'
import { getNavGroupsForRole } from '../composables/useNavGroups'

const router = useRouter()
const route = useRoute()
const { currentUser } = useCurrentUser()

const collapsed = ref(false)
const drawerOpen = ref(false)
const isMobile = ref(false)

const currentRoute = computed(() => route.name as string)

const visibleNavGroups = computed(() =>
  getNavGroupsForRole(currentUser.value.role)
)

const avatarColor = computed(() => {
  const colors = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed']
  const name = currentUser.value.name
  return colors[name.charCodeAt(0) % colors.length] ?? '#2563eb'
})

const mobileTabs = computed(() => [
  { id: 'home', label: '首页', icon: HomeOutlined },
  { id: 'my-orders', label: '订单', icon: ShoppingOutlined },
  { id: 'task-management', label: '任务', icon: CheckCircleOutlined },
  { id: 'buyers', label: '买手', icon: TeamOutlined },
])

const findGroupForRoute = (routeName: string) =>
  visibleNavGroups.value.find(g => g.items.some(i => i.id === routeName))?.id

const expandedGroups = ref<Set<string>>(new Set([
  findGroupForRoute(currentRoute.value) ?? 'order-center'
]))

function checkMobile() {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) drawerOpen.value = false
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function toggleGroup(groupId: string) {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId)
  } else {
    expandedGroups.value.add(groupId)
  }
}

function navigate(page: string) {
  router.push({ name: page })
  const group = findGroupForRoute(page)
  if (group) expandedGroups.value.add(group)
  if (isMobile.value) drawerOpen.value = false
}
</script>

<style scoped>
.sidebar {
  width: 220px;
  min-width: 220px;
  height: 100vh;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  transition: width 0.25s ease, min-width 0.25s ease;
  overflow: hidden;
  flex-shrink: 0;
}
.sidebar--collapsed {
  width: 60px;
  min-width: 60px;
}

/* 移动端：侧边抽屉模式 */
.sidebar--mobile {
  position: fixed;
  left: -240px;
  top: 0;
  z-index: 1001;
  width: 240px !important;
  min-width: 240px !important;
  height: 100vh;
  transition: left 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: none;
}
.sidebar--mobile-open {
  left: 0;
  box-shadow: 4px 0 24px rgba(0,0,0,0.35);
}

/* 遮罩 */
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 999;
}

.sidebar-logo {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}
.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  flex: 1;
  white-space: nowrap;
}
.collapse-btn {
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  font-size: 14px;
  transition: color 0.2s;
  flex-shrink: 0;
}
.collapse-btn:hover {
  color: #fff;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.user-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.user-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}
.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-role-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 500;
  display: inline-block;
  width: fit-content;
}
.role-业务员 { background: rgba(5,150,105,0.25); color: #34d399; }
.role-商务 { background: rgba(37,99,235,0.25); color: #60a5fa; }
.role-财务 { background: rgba(217,119,6,0.25); color: #fbbf24; }
.role-管理员 { background: rgba(220,38,38,0.25); color: #f87171; }

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
}
.sidebar-nav::-webkit-scrollbar {
  width: 3px;
}
.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: 8px;
  margin: 2px 8px;
  transition: background 0.15s;
  color: rgba(255,255,255,0.65);
  font-size: 13px;
  white-space: nowrap;
}
.nav-item:hover {
  background: rgba(255,255,255,0.07);
  color: #fff;
}
.nav-item.active {
  background: rgba(37,99,235,0.25);
  color: #60a5fa;
}

.home-item {
  margin-bottom: 4px;
}

.nav-icon {
  font-size: 15px;
  flex-shrink: 0;
}
.nav-label {
  font-size: 13px;
}

.nav-group {
  margin-bottom: 2px;
}
.nav-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  cursor: pointer;
  color: rgba(255,255,255,0.4);
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  transition: color 0.15s;
  white-space: nowrap;
}
.nav-group-header:hover {
  color: rgba(255,255,255,0.7);
}
.nav-group-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.group-arrow {
  font-size: 10px;
  transition: transform 0.2s;
}
.group-arrow.rotated {
  transform: rotate(180deg);
}

.nav-sub-items {
  padding: 2px 0;
}
.nav-sub-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px 8px 36px;
  cursor: pointer;
  border-radius: 6px;
  margin: 1px 8px;
  transition: background 0.15s;
  color: rgba(255,255,255,0.55);
  font-size: 13px;
  white-space: nowrap;
}
.nav-sub-item:hover {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.9);
}
.nav-sub-item.active {
  background: rgba(37,99,235,0.2);
  color: #60a5fa;
}
.nav-sub-icon {
  font-size: 13px;
  flex-shrink: 0;
}
.nav-sub-label {
  font-size: 13px;
}

.collapsed-sub-items {
  padding: 2px 0;
}
.collapsed-sub-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  margin: 1px 4px;
  border-radius: 6px;
  cursor: pointer;
  color: rgba(255,255,255,0.5);
  transition: background 0.15s;
  font-size: 15px;
}
.collapsed-sub-item:hover {
  background: rgba(255,255,255,0.07);
  color: #fff;
}
.collapsed-sub-item.active {
  background: rgba(37,99,235,0.2);
  color: #60a5fa;
}

.sidebar-footer {
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 8px 0;
  flex-shrink: 0;
}

/* 移动端底部导航栏 */
.mobile-bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  z-index: 999;
  flex-direction: row;
  align-items: stretch;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.08);
}
.mobile-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  color: #9ca3af;
  transition: color 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.mobile-tab:active {
  background: #f9fafb;
}
.mobile-tab.active {
  color: #2563eb;
}
.mobile-tab-icon {
  font-size: 20px;
}
.mobile-tab-label {
  font-size: 10px;
  font-weight: 500;
}

@media (max-width: 767px) {
  .mobile-bottom-nav {
    display: flex;
  }
}
</style>
