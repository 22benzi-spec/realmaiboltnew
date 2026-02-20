<template>
  <div class="page-content">
    <h1 class="page-title">个人设置</h1>
    <div class="card-panel" style="max-width:500px">
      <div class="profile-placeholder">
        <UserOutlined style="font-size:48px; color:#d1d5db" />
        <p style="color:#6b7280; margin-top:12px">个人设置功能开发中...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UserOutlined } from '@ant-design/icons-vue'
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.profile-placeholder { text-align: center; }
</style>
