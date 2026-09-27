<script setup lang="ts">
import { Info } from '@lucide/vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import PaymentLogo from '@/components/ui/PaymentLogo.vue'
import { usePaged } from '@/composables/usePaged'
import { reconciliationApi } from '@/api/admin'
import { formatDate, formatRelative } from '@/lib/format'
import type { ReconciliationCase } from '@/types/api'

const paged = usePaged<ReconciliationCase>((q) => reconciliationApi.list(q))

const columns: Column[] = [
  { key: 'attempt', label: 'Attempt' },
  { key: 'status', label: 'Antrean' },
  { key: 'result_status', label: 'Hasil' },
  { key: 'reason', label: 'Alasan', mobileHidden: true },
  { key: 'requested_at', label: 'Diminta' },
]
</script>

<template>
  <div>
    <PageHeader
      title="Rekonsiliasi"
      subtitle="Antrean inquiry status gateway yang diproses worker."
    />

    <div
      class="mb-4 flex gap-3 rounded-2xl bg-sky-50 p-4 text-sm text-sky-800 ring-1 ring-sky-200/60 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/20"
    >
      <Info class="mt-0.5 size-4 shrink-0" />
      <p>
        <b>REQUESTED</b> hanya berarti antrean tercatat. <b>RETRY_WAIT</b> berarti worker akan
        mencoba lagi dengan backoff; <b>FAILED</b> berarti batas retry tercapai. Permintaan inquiry
        dibuat dari tab Attempt pada detail pembayaran.
      </p>
    </div>

    <DataTable
      :columns="columns"
      :paged="paged"
      searchable
      :search-keys="['status', 'reason', 'result_status', 'error_code', 'attempt_id']"
      empty-title="Antrean kosong"
      empty-message="Belum ada permintaan inquiry."
    >
      <template #cell-attempt="{ row }">
        <div class="flex items-center gap-3">
          <PaymentLogo :code="row.attempt?.channel_code" size="sm" />
          <div class="min-w-0 text-left">
            <p class="truncate text-sm font-medium text-slate-900 dark:text-white">
              {{ row.attempt?.channel_code ?? '—' }}
            </p>
            <p class="truncate text-xs text-slate-500">
              {{ row.attempt?.gateway }} ·
              <AppBadge :status="row.attempt?.status" class="!px-1.5 !py-0 !text-[10px]" />
            </p>
          </div>
        </div>
      </template>
      <template #cell-status="{ value }"><AppBadge :status="value" /></template>
      <template #cell-result_status="{ row }">
        <AppBadge v-if="row.result_status" :status="row.result_status" />
        <span
          v-else-if="row.error_code"
          class="font-mono text-xs text-rose-600 dark:text-rose-400"
          >{{ row.error_code }}</span
        >
        <span v-else class="text-slate-400">—</span>
      </template>
      <template #cell-reason="{ value }">
        <span class="line-clamp-2 max-w-xs text-xs text-slate-600 dark:text-slate-400">{{
          value
        }}</span>
      </template>
      <template #cell-requested_at="{ value }">
        <span class="text-xs whitespace-nowrap text-slate-500" :title="formatDate(value)">{{
          formatRelative(value)
        }}</span>
      </template>
    </DataTable>
  </div>
</template>
