import { ref, computed } from 'vue'
import type { StaffRole } from '../types'

export interface CurrentUser {
  id: string
  name: string
  role: StaffRole
}

const currentUser = ref<CurrentUser | null>(null)

export function useCurrentUser() {
  function setCurrentUser(user: CurrentUser) {
    currentUser.value = user
    localStorage.setItem('erp_current_user', JSON.stringify(user))
  }

  function loadFromStorage() {
    const stored = localStorage.getItem('erp_current_user')
    if (stored) {
      try {
        currentUser.value = JSON.parse(stored)
      } catch {
        currentUser.value = null
      }
    }
  }

  function clearCurrentUser() {
    currentUser.value = null
    localStorage.removeItem('erp_current_user')
  }

  const role = computed(() => currentUser.value?.role ?? null)

  const isAdmin = computed(() => role.value === '管理员')
  const isFinance = computed(() => role.value === '财务' || role.value === '管理员')
  const isBusiness = computed(() => role.value === '商务' || role.value === '管理员')
  const isSalesperson = computed(() => role.value === '业务员' || role.value === '管理员')

  return {
    currentUser,
    role,
    isAdmin,
    isFinance,
    isBusiness,
    isSalesperson,
    setCurrentUser,
    loadFromStorage,
    clearCurrentUser,
  }
}
