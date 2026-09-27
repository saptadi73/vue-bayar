import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api/admin'
import { setCsrfToken } from '@/lib/http'
import type { MeResponse } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  const me = ref<MeResponse | null>(null)
  const checked = ref(false)

  const user = computed(() => me.value?.user ?? null)
  const permissions = computed(() => new Set(me.value?.permissions ?? []))
  const isAuthenticated = computed(() => !!me.value)

  // Default deny: unknown/missing permissions are never granted.
  const can = (...perms: string[]) => perms.every((p) => permissions.value.has(p))
  const canAny = (...perms: string[]) => perms.some((p) => permissions.value.has(p))

  function apply(data: MeResponse | null) {
    me.value = data
    setCsrfToken(data?.csrf_token ?? null)
  }

  /** Always asks the server; cached profile is never proof of authentication. */
  async function fetchMe() {
    try {
      apply((await authApi.me()).data)
    } catch {
      apply(null)
    } finally {
      checked.value = true
    }
    return !!me.value
  }

  async function login(identifier: string, password: string) {
    const res = await authApi.login(identifier, password)
    setCsrfToken(res.data.csrf_token)
    await fetchMe()
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      clear()
    }
  }

  function clear() {
    apply(null)
    checked.value = true
  }

  return {
    me,
    user,
    checked,
    permissions,
    isAuthenticated,
    can,
    canAny,
    fetchMe,
    login,
    logout,
    clear,
  }
})
