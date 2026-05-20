<template>
  <div class="layout-wrapper">
    <AppSidebar />
    <div class="layout-main">
      <div class="global-notification-bar">
        <BusinessNotificationBells />
      </div>
      <div class="layout-content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import BusinessNotificationBells from './components/BusinessNotificationBells.vue'
import { useCurrentUser } from './composables/useCurrentUser'

const { loadFromStorage } = useCurrentUser()

onMounted(() => {
  loadFromStorage()
})
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.layout-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  background: #f5f7fa;
}

.global-notification-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: flex-end;
  padding: 10px 18px 8px;
  background: rgba(245, 247, 250, 0.92);
  border-bottom: 1px solid #e5e7eb;
  backdrop-filter: blur(8px);
}

.layout-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

@media (max-width: 767px) {
  .layout-wrapper {
    display: block;
    height: 100vh;
    overflow: hidden;
  }
  .layout-main {
    height: 100vh;
    padding-bottom: 56px;
    overflow: hidden;
  }

  .global-notification-bar {
    padding: 8px 12px;
  }

  .layout-content {
    overflow-y: auto;
  }
}
</style>
