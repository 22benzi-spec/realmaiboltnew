<template>
  <div class="page-content">
    <h1 class="page-title">售后问题单</h1>
    <AfterSaleIssueList :issue-id="routeIssueId" :sub-order="routeSubOrder" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AfterSaleIssueList from '../components/AfterSaleIssueList.vue'

const route = useRoute()

const routeIssueId = computed(() => typeof route.query.issue === 'string' ? route.query.issue : undefined)
const routeSubOrder = computed(() => typeof route.query.subOrder === 'string' ? route.query.subOrder : undefined)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
</style>
