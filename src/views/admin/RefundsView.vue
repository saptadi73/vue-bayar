<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Check, X } from '@lucide/vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { usePaged } from '@/composables/usePaged'
import { useConfirm } from '@/composables/useConfirm'
import { refundsApi } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { ApiError } from '@/lib/http'
import { P } from '@/lib/permissions'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Refund } from '@/types/api'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()
const confirm = useConfirm()

const STATUSES = [
  '',
  'REQUESTED',
  'APPROVED',
  'PROVIDER_ACCEPTED',
  'SUCCEEDED',
  'MANUAL_REQUIRED',
  'REJECTED',
  'FAILED',
]
const filter = ref<{ status?: string }>({})
const paged = usePaged<Refund, { status?: string }>((q) => refundsApi.list(q), { filters: filter })
const busy = ref<string | null>(null)

const columns: Column[] = [
  { key: 'refund_no', label: 'Refund' },
  { key: 'payment', label: 'Pembayaran' },
  { key: 'amount', label: 'Nominal', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Diajukan', mobileHidden: true },
]

const isSelf = (r: Refund) => r.requested_by_admin === auth.user?.id
const canDecide = (r: Refund) => auth.can(P.refundsApprove) && r.status === 'REQUESTED'

async function handleConflict(e: unknown, title: string) {
  toast.apiError(e, title)
  if (e instanceof ApiError && e.status === 409) await paged.load()
}

async function approve(r: Refund) {
  const res = await confirm({
    title: 'Setujui refund?',
    message: `${r.refund_no} sebesar ${formatCurrency(r.amount)}.`,
    impacts: [
      'Status menjadi APPROVED dan diteruskan ke worker provider.',
      'Approval internal bukan bukti refund provider berhasil.',
      'Keputusan tercatat di audit log.',
    ],
    tone: 'warning',
    confirmText: 'Setujui',
    typeToConfirm: r.refund_no,
  })
  if (!res) return
  busy.value = r.id
  try {
    await refundsApi.approve(r.id, r.version)
    toast.success('Refund disetujui', 'Menunggu pemrosesan provider.')
    await paged.load()
  } catch (e) {
    await handleConflict(e, 'Gagal menyetujui refund')
  } finally {
    busy.value = null
  }
}

async function reject(r: Refund) {
  const res = await confirm({
    title: 'Tolak refund?',
    message: `${r.refund_no} sebesar ${formatCurrency(r.amount)}.`,
    impacts: ['Status payment dikembalikan ke status sebelum refund diajukan.'],
    confirmText: 'Tolak refund',
    reason: { label: 'Alasan penolakan', required: true },
  })
  if (!res) return
  busy.value = r.id
  try {
    await refundsApi.reject(r.id, r.version, res.reason)
    toast.success('Refund ditolak')
    await paged.load()
  } catch (e) {
    await handleConflict(e, 'Gagal menolak refund')
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Refund"
      subtitle="Maker-checker: pengaju tidak dapat menyetujui refund miliknya sendiri."
    />

    <DataTable
      :columns="columns"
      :paged="paged"
      searchable
      :search-keys="['refund_no', 'reason', 'status']"
      empty-title="Belum ada refund"
    >
      <template #filters>
        <select
          :value="filter.status ?? ''"
          class="input w-full sm:w-52"
          aria-label="Filter status"
          @change="filter = { status: ($event.target as HTMLSelectElement).value || undefined }"
        >
          <option v-for="s in STATUSES" :key="s" :value="s">
            {{ s ? s.replace(/_/g, ' ') : 'Semua status' }}
          </option>
        </select>
      </template>

      <template #cell-refund_no="{ row }">
        <div class="text-left">
          <p class="font-mono text-xs font-semibold text-slate-900 dark:text-white">
            {{ row.refund_no }}
          </p>
          <p class="line-clamp-1 max-w-[14rem] text-xs text-slate-500">{{ row.reason }}</p>
        </div>
      </template>
      <template #cell-payment="{ row }">
        <button
          type="button"
          class="text-left hover:underline"
          @click="router.push(`/admin/payments/${row.payment_id}`)"
        >
          <p class="font-mono text-xs text-brand-600 dark:text-brand-400">
            {{ row.payment?.payment_no ?? row.payment_id.slice(0, 8) }}
          </p>
          <p class="truncate text-xs text-slate-500">{{ row.payment?.client_name ?? '' }}</p>
        </button>
      </template>
      <template #cell-amount="{ value }"
        ><span class="font-semibold tabular-nums">{{ formatCurrency(value) }}</span></template
      >
      <template #cell-status="{ row }">
        <div class="flex flex-col items-end gap-1 md:items-start">
          <AppBadge :status="row.status" />
          <span v-if="row.provider_error_code" class="font-mono text-[10px] text-rose-500">{{
            row.provider_error_code
          }}</span>
        </div>
      </template>
      <template #cell-created_at="{ value }"
        ><span class="text-xs text-slate-500">{{ formatDate(value) }}</span></template
      >

      <template #actions="{ row }">
        <template v-if="canDecide(row)">
          <span
            v-if="isSelf(row)"
            class="text-xs text-slate-400"
            title="Pengaju tidak boleh menyetujui refund sendiri"
            >Pengajuan Anda</span
          >
          <template v-else>
            <AppButton
              size="sm"
              variant="ghost"
              :icon="X"
              :disabled="busy === row.id"
              @click="reject(row)"
              >Tolak</AppButton
            >
            <AppButton size="sm" :icon="Check" :loading="busy === row.id" @click="approve(row)"
              >Setujui</AppButton
            >
          </template>
        </template>
      </template>
    </DataTable>
  </div>
</template>
