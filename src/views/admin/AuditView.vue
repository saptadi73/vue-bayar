<script setup lang="ts">
import PageHeader from '@/components/ui/PageHeader.vue'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import CopyButton from '@/components/ui/CopyButton.vue'
import { usePaged } from '@/composables/usePaged'
import { auditApi } from '@/api/admin'
import { formatDate, shortId } from '@/lib/format'
import type { Tone } from '@/lib/status'
import type { AuditEntry } from '@/types/api'

const paged = usePaged<AuditEntry>((q) => auditApi.list(q), { pageSize: 50 })

const columns: Column[] = [
  { key: 'action', label: 'Aksi' },
  { key: 'actor_id', label: 'Aktor' },
  { key: 'resource_id', label: 'Resource', mobileHidden: true },
  { key: 'reason', label: 'Alasan', mobileHidden: true },
  { key: 'occurred_at', label: 'Waktu (lokal)' },
]

function actionTone(a: string): Tone {
  if (/FAILED|REJECTED|REVOKED/.test(a)) return 'danger'
  if (/LOGIN|LOGOUT/.test(a)) return 'neutral'
  if (/VIEWED/.test(a)) return 'info'
  if (/ROTATED|SESSIONS/.test(a)) return 'warning'
  if (/CREATED|APPROVED|SUCCEEDED|BOOTSTRAP/.test(a)) return 'success'
  return 'brand'
}
</script>

<template>
  <div>
    <PageHeader
      title="Audit Log"
      subtitle="Jejak aksi admin (read-only). Tidak memuat password, token, atau secret."
    />

    <DataTable
      :columns="columns"
      :paged="paged"
      searchable
      :search-keys="['action', 'actor_id', 'resource_id', 'reason']"
      empty-title="Belum ada catatan audit"
    >
      <template #cell-action="{ value }">
        <AppBadge :tone="actionTone(value)"
          ><span class="font-mono text-[11px]">{{ value }}</span></AppBadge
        >
      </template>
      <template #cell-actor_id="{ value }">
        <span
          v-if="value"
          class="inline-flex items-center font-mono text-xs text-slate-600 dark:text-slate-300"
          :title="value"
        >
          {{ shortId(value) }} <CopyButton :value="value" />
        </span>
        <span v-else class="text-xs text-slate-400">sistem / anonim</span>
      </template>
      <template #cell-resource_id="{ value }">
        <span class="font-mono text-xs text-slate-500" :title="value">{{
          value ? (value.length > 20 ? shortId(value) + '…' : value) : '—'
        }}</span>
      </template>
      <template #cell-reason="{ value }">
        <span class="line-clamp-2 max-w-xs text-xs text-slate-600 dark:text-slate-400">{{
          value ?? '—'
        }}</span>
      </template>
      <template #cell-occurred_at="{ value }">
        <span class="text-xs whitespace-nowrap text-slate-500">{{ formatDate(value) }}</span>
      </template>
    </DataTable>
  </div>
</template>
