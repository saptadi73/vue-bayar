<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Check, Minus, Info } from '@lucide/vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import StateView from '@/components/ui/StateView.vue'
import { rolesApi } from '@/api/admin'
import { ApiError } from '@/lib/http'
import { ROLE_LABEL } from '@/lib/permissions'
import type { RoleDef } from '@/types/api'

const roles = ref<RoleDef[]>([])
const loading = ref(true)
const error = ref<ApiError | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    roles.value = (await rolesApi.list()).data
  } catch (e) {
    error.value = e instanceof ApiError ? e : new ApiError(0, {})
  } finally {
    loading.value = false
  }
}
onMounted(load)

const permissions = computed(() => [...new Set(roles.value.flatMap((r) => r.permissions))].sort())
</script>

<template>
  <div>
    <PageHeader title="Role & Izin" subtitle="Matriks izin efektif dari server (read-only)." />

    <div
      class="mb-4 flex gap-3 rounded-2xl bg-sky-50 p-4 text-sm text-sky-800 ring-1 ring-sky-200/60 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/20"
    >
      <Info class="mt-0.5 size-4 shrink-0" />
      <p>
        Role editor belum tersedia di backend. Pemetaan izin ditentukan server; frontend tidak
        menyimpulkan akses dari nama role.
      </p>
    </div>

    <AppCard :padded="false">
      <StateView v-if="error" :error="error" @retry="load" />
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-sm">
          <thead>
            <tr
              class="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30"
            >
              <th
                class="sticky left-0 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase dark:bg-slate-900"
              >
                Permission
              </th>
              <th
                v-for="r in roles"
                :key="r.code"
                class="px-4 py-3 text-center text-xs font-semibold whitespace-nowrap text-slate-500 uppercase"
              >
                {{ ROLE_LABEL[r.code] ?? r.code }}
              </th>
              <template v-if="loading">
                <th v-for="i in 4" :key="i" class="px-4 py-3">
                  <div class="skeleton mx-auto h-3 w-16" />
                </th>
              </template>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <template v-if="loading">
              <tr v-for="i in 8" :key="i">
                <td class="px-4 py-3"><div class="skeleton h-3.5 w-48" /></td>
                <td v-for="j in 4" :key="j" class="px-4 py-3">
                  <div class="skeleton mx-auto size-5 rounded-full" />
                </td>
              </tr>
            </template>
            <tr
              v-for="p in permissions"
              v-else
              :key="p"
              class="hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
            >
              <td
                class="sticky left-0 bg-white px-4 py-2.5 font-mono text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {{ p }}
              </td>
              <td v-for="r in roles" :key="r.code" class="px-4 py-2.5 text-center">
                <span
                  v-if="r.permissions.includes(p)"
                  class="inline-grid size-6 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                >
                  <Check class="size-3.5" />
                </span>
                <Minus v-else class="mx-auto size-3.5 text-slate-300 dark:text-slate-700" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AppCard>
  </div>
</template>
