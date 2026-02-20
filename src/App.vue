<template>
  <div class="layout-wrapper">
    <AppSidebar />
    <div class="layout-main">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
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
  flex: 1;
  overflow-y: auto;
  background: #f5f7fa;
}
</style>
