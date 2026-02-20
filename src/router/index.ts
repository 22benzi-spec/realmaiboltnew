import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', name: 'home', component: () => import('../views/DashboardView.vue') },
    { path: '/fba-orders', name: 'fba-orders', component: () => import('../views/OrderFormView.vue') },
    { path: '/my-orders', name: 'my-orders', component: () => import('../views/OrderListView.vue') },
    { path: '/task-management', name: 'task-management', component: () => import('../views/TaskManagementView.vue') },
    { path: '/assignment', name: 'assignment', component: () => import('../views/SubOrderAssignmentView.vue') },
    { path: '/staff-workbench', name: 'staff-workbench', component: () => import('../views/StaffWorkbenchView.vue') },
    { path: '/grab-hall', name: 'grab-hall', component: () => import('../views/GrabHallView.vue') },
    { path: '/staff', name: 'staff', component: () => import('../views/StaffManagerView.vue') },
    { path: '/buyers', name: 'buyers', component: () => import('../views/BuyerManagerView.vue') },
    { path: '/blacklist', name: 'blacklist', component: () => import('../views/BlacklistView.vue') },
    { path: '/gift-cards', name: 'gift-cards', component: () => import('../views/GiftCardView.vue') },
    { path: '/paypal', name: 'paypal', component: () => import('../views/PaypalView.vue') },
    { path: '/refund-queue', name: 'refund-queue', component: () => import('../views/RefundQueueView.vue') },
    { path: '/clients', name: 'clients', component: () => import('../views/ClientManagerView.vue') },
    { path: '/business', name: 'business', component: () => import('../views/BusinessManagerView.vue') },
    { path: '/profile', name: 'profile', component: () => import('../views/ProfileView.vue') },
  ],
})

export default router
