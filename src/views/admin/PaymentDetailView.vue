<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  Clock,
  ListOrdered,
  Undo2,
  RefreshCcw,
  CalendarDays,
  Building,
  Ticket,
  Hash,
  CircleDot,
} from '@lucide/vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppModal from '@/components/ui/AppModal.vue'
import FormField from '@/components/ui/FormField.vue'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import StateView from '@/components/ui/StateView.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import PaymentLogo from '@/components/ui/PaymentLogo.vue'
import CopyButton from '@/components/ui/CopyButton.vue'
import { usePaged } from '@/composables/usePaged'
import { useConfirm } from '@/composables/useConfirm'
import { paymentsApi, reconciliationApi, refundsApi } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { ApiError } from '@/lib/http'
import { P } from '@/lib/permissions'
import { formatCurrency, formatDate, shortId } from '@/lib/format'
import { labelOf } from '@/lib/status'
import type { Payment, PaymentAttempt, PaymentHistory, Refund } from '@/types/api'

const route = useRoute()
const auth = useAuthStore()
const toast = useToastStore()
const confirm = useConfirm()
const id = route.params.id as string

const payment = ref<Payment | null>(null)
const loading = ref(true)
const error = ref<ApiError | null>(null)
const tab = ref('history')

async function load() {
  loading.value = true
  error.value = null
  try {
    payment.value = (await paymentsApi.get(id)).data
  } catch (e) {
    error.value = e instanceof ApiError ? e : new ApiError(0, {})
  } finally {
    loading.value = false
  }
}
onMounted(load)

const history = usePaged<PaymentHistory>((q) => paymentsApi.history(id, q), { pageSize: 50 })
const attempts = usePaged<PaymentAttempt>((q) => paymentsApi.attempts(id, q), { pageSize: 20 })
const refunds = usePaged<Refund>((q) => refundsApi.list({ ...q, payment_id: id }), {
  pageSize: 20,
  immediate: auth.can(P.refundsRead),
})

const tabs = computed(() => [
  { key: 'history', label: 'Riwayat', icon: Clock },
  { key: 'attempts', label: 'Attempt', icon: ListOrdered },
  { key: 'refunds', label: 'Refund', icon: Undo2, hidden: !auth.can(P.refundsRead) },
])

const attemptCols: Column[] = [
  { key: 'attempt_no', label: '#' },
  { key: 'channel_code', label: 'Channel' },
  { key: 'gateway_order_id', label: 'Order gateway', mobileHidden: true },
  { key: 'status', label: 'Status' },
]
const refundCols: Column[] = [
  { key: 'refund_no', label: 'No. Refund' },
  { key: 'amount', label: 'Nominal', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Diajukan', mobileHidden: true },
]

const reconBusy = ref<string | null>(null)
const reconcilable = (a: PaymentAttempt) =>
  ['MIDTRANS', 'DOKU'].includes(a.gateway) && ['INITIATED', 'UNKNOWN', 'PENDING'].includes(a.status)

async function requestRecon(a: PaymentAttempt) {
  const res = await confirm({
    title: 'Minta inquiry rekonsiliasi?',
    message: `Attempt #${a.attempt_no} (${a.channel_code}) akan dimasukkan ke antrean inquiry gateway.`,
    impacts: [
      'Status REQUESTED hanya berarti antrean tercatat, bukan pembayaran lunas.',
      'Worker memproses secara asinkron.',
    ],
    tone: 'brand',
    confirmText: 'Masukkan antrean',
    reason: true,
  })
  if (!res) return
  reconBusy.value = a.id
  try {
    const r = await reconciliationApi.request(a.id, res.reason)
    toast.success('Inquiry dicatat', `Status antrean: ${labelOf(r.data.status)}`)
  } catch (e) {
    toast.apiError(e, 'Gagal meminta inquiry')
  } finally {
    reconBusy.value = null
  }
}

// Refund request
const canRefund = computed(
  () =>
    auth.can(P.refundsRequest) &&
    ['PAID', 'PARTIALLY_REFUNDED'].includes(payment.value?.status ?? ''),
)
const refundModal = ref(false)
const refundForm = reactive({ amount: '' as string | number, reason: '' })
const refundErr = ref<Record<string, string>>({})
const refundBusy = ref(false)

function openRefund() {
  refundForm.amount = ''
  refundForm.reason = ''
  refundErr.value = {}
  refundModal.value = true
}

async function submitRefund() {
  refundErr.value = {}
  const amt = refundForm.amount === '' ? null : Number(refundForm.amount)
  if (amt !== null && (!Number.isInteger(amt) || amt <= 0))
    return (refundErr.value.amount = 'Nominal harus bilangan bulat positif.')
  if (amt !== null && payment.value && amt > payment.value.amount)
    return (refundErr.value.amount = 'Melebihi nominal pembayaran.')
  if (!refundForm.reason.trim()) return (refundErr.value.reason = 'Alasan wajib diisi.')
  refundBusy.value = true
  try {
    await refundsApi.request(id, amt, refundForm.reason.trim())
    toast.success('Refund diajukan', 'Menunggu persetujuan approver lain (maker-checker).')
    refundModal.value = false
    await Promise.all([load(), refunds.load(), history.load()])
    tab.value = 'refunds'
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) refundErr.value = e.fieldErrors
    toast.apiError(e, 'Gagal mengajukan refund')
  } finally {
    refundBusy.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader :title="payment?.payment_no ?? 'Detail Pembayaran'" back="/admin/payments">
      <template #subtitle>
        <span v-if="payment" class="inline-flex items-center gap-1 font-mono text-xs">
          {{ payment.id }} <CopyButton :value="payment.id" />
        </span>
      </template>
      <template v-if="canRefund" #actions>
        <AppButton variant="secondary" :icon="Undo2" @click="openRefund">Ajukan refund</AppButton>
      </template>
    </PageHeader>

    <div v-if="error" class="surface"><StateView :error="error" @retry="load" /></div>

    <template v-else>
      <div class="grid gap-4 lg:grid-cols-3">
        <!-- Amount hero -->
        <div
          class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-indigo-600 to-violet-700 p-5 text-white shadow-lg shadow-brand-600/20 sm:p-6"
        >
          <div class="absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-2xl" />
          <div
            class="absolute -bottom-16 -left-10 size-40 rounded-full bg-violet-400/20 blur-2xl"
          />
          <template v-if="loading">
            <div class="skeleton h-3 w-20 bg-white/20" />
            <div class="skeleton mt-3 h-9 w-2/3 bg-white/20" />
            <div class="skeleton mt-5 h-6 w-24 rounded-full bg-white/20" />
          </template>
          <template v-else-if="payment">
            <p class="relative text-xs font-medium tracking-wider text-white/70 uppercase">
              Nominal
            </p>
            <p class="relative mt-1 text-3xl font-bold tracking-tight tabular-nums">
              {{ formatCurrency(payment.amount, payment.currency) }}
            </p>
            <div class="relative mt-4 flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25 backdrop-blur"
              >
                <CircleDot class="size-3" /> {{ labelOf(payment.status) }}
              </span>
              <span class="text-xs text-white/70">{{ payment.currency }}</span>
            </div>
          </template>
        </div>

        <AppCard title="Informasi transaksi" class="lg:col-span-2">
          <SkeletonBlock v-if="loading" :lines="4" />
          <dl v-else-if="payment" class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div class="flex gap-3">
              <Building class="mt-0.5 size-4 shrink-0 text-slate-400" />
              <div class="min-w-0">
                <dt class="text-xs text-slate-500">Portal (client)</dt>
                <dd class="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {{ payment.client_name ?? '—' }}
                </dd>
              </div>
            </div>
            <div class="flex gap-3">
              <Ticket class="mt-0.5 size-4 shrink-0 text-slate-400" />
              <div class="min-w-0">
                <dt class="text-xs text-slate-500">Event</dt>
                <dd class="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {{ payment.event_name ?? '—' }}
                </dd>
                <dd v-if="payment.event_id" class="truncate font-mono text-xs text-slate-500">
                  {{ payment.event_id }}
                </dd>
              </div>
            </div>
            <div class="flex gap-3">
              <Hash class="mt-0.5 size-4 shrink-0 text-slate-400" />
              <div class="min-w-0">
                <dt class="text-xs text-slate-500">Reference</dt>
                <dd class="truncate font-mono text-sm text-slate-900 dark:text-white">
                  {{ payment.reference_id }}
                </dd>
              </div>
            </div>
            <div class="flex gap-3">
              <CalendarDays class="mt-0.5 size-4 shrink-0 text-slate-400" />
              <div class="min-w-0">
                <dt class="text-xs text-slate-500">Dibuat · Kedaluwarsa</dt>
                <dd class="text-sm text-slate-900 dark:text-white">
                  {{ formatDate(payment.created_at) }}
                </dd>
                <dd class="text-xs text-slate-500">{{ formatDate(payment.expires_at) }}</dd>
              </div>
            </div>
          </dl>
          <p
            class="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400"
          >
            Data customer (PII) tidak ditampilkan pada modul ini sesuai kontrak API.
          </p>
        </AppCard>
      </div>

      <div class="mt-6 space-y-4">
        <AppTabs v-model="tab" :tabs="tabs" />

        <!-- History timeline -->
        <AppCard
          v-if="tab === 'history'"
          title="Riwayat status"
          subtitle="Urutan perubahan status ledger"
        >
          <div v-if="history.loading.value" class="space-y-5">
            <SkeletonBlock v-for="i in 3" :key="i" :lines="2" avatar />
          </div>
          <StateView
            v-else-if="history.error.value"
            :error="history.error.value"
            compact
            @retry="history.load()"
          />
          <StateView
            v-else-if="!history.rows.value.length"
            type="empty"
            title="Belum ada riwayat"
            message="Data lama tanpa riwayat ditampilkan kosong."
            compact
          />
          <ol
            v-else
            class="relative space-y-5 border-l-2 border-slate-100 pl-6 dark:border-slate-800"
          >
            <li v-for="h in history.rows.value" :key="h.id" class="relative">
              <span
                class="absolute top-1 -left-[31px] grid size-4 place-items-center rounded-full bg-white ring-2 ring-brand-500 dark:bg-slate-900"
              >
                <span class="size-1.5 rounded-full bg-brand-500" />
              </span>
              <div class="flex flex-wrap items-center gap-2">
                <AppBadge v-if="h.from_status" :status="h.from_status" />
                <span v-if="h.from_status" class="text-slate-400">→</span>
                <AppBadge :status="h.to_status" />
              </div>
              <p class="mt-1.5 text-xs text-slate-500">
                {{ formatDate(h.occurred_at) }} · sumber
                <span class="font-semibold">{{ h.source }}</span>
              </p>
            </li>
          </ol>
        </AppCard>

        <DataTable
          v-if="tab === 'attempts'"
          :columns="attemptCols"
          :paged="attempts"
          empty-title="Belum ada attempt"
        >
          <template #cell-attempt_no="{ value }"
            ><span class="font-semibold">#{{ value }}</span></template
          >
          <template #cell-channel_code="{ row }">
            <div class="flex items-center gap-3">
              <PaymentLogo :code="row.channel_code" size="sm" />
              <div class="min-w-0 text-left">
                <p class="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {{ row.channel_code }}
                </p>
                <p class="text-xs text-slate-500">{{ row.gateway }}</p>
              </div>
            </div>
          </template>
          <template #cell-gateway_order_id="{ value }"
            ><span class="font-mono text-xs">{{ value }}</span></template
          >
          <template #cell-status="{ value }"><AppBadge :status="value" /></template>
          <template v-if="auth.can(P.reconRequest)" #actions="{ row }">
            <AppButton
              v-if="reconcilable(row)"
              size="sm"
              variant="soft"
              :icon="RefreshCcw"
              :loading="reconBusy === row.id"
              @click="requestRecon(row)"
            >
              Inquiry
            </AppButton>
          </template>
        </DataTable>

        <DataTable
          v-if="tab === 'refunds'"
          :columns="refundCols"
          :paged="refunds"
          empty-title="Belum ada refund"
        >
          <template #cell-refund_no="{ value }"
            ><span class="font-mono text-xs font-semibold">{{ value }}</span></template
          >
          <template #cell-amount="{ value }"
            ><span class="font-semibold tabular-nums">{{ formatCurrency(value) }}</span></template
          >
          <template #cell-status="{ value }"><AppBadge :status="value" /></template>
          <template #cell-created_at="{ row }">
            <span class="text-xs text-slate-500"
              >{{ formatDate(row.created_at) }} · {{ shortId(row.requested_by_admin) }}</span
            >
          </template>
        </DataTable>
      </div>
    </template>

    <AppModal
      :open="refundModal"
      title="Ajukan refund"
      description="Permintaan ini perlu disetujui admin lain (maker-checker)."
      :persistent="refundBusy"
      @close="refundModal = false"
    >
      <form id="refund-form" class="space-y-4" @submit.prevent="submitRefund">
        <FormField
          label="Nominal refund"
          for="r-amount"
          :error="refundErr.amount"
          :hint="`Kosongkan untuk refund penuh (${formatCurrency(payment?.amount)})`"
        >
          <input
            id="r-amount"
            v-model="refundForm.amount"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            class="input"
            :aria-invalid="!!refundErr.amount"
            placeholder="Refund penuh"
          />
        </FormField>
        <FormField label="Alasan" for="r-reason" required :error="refundErr.reason">
          <textarea
            id="r-reason"
            v-model="refundForm.reason"
            rows="3"
            maxlength="500"
            class="input resize-none"
            :aria-invalid="!!refundErr.reason"
          />
        </FormField>
        <p
          class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
        >
          Status payment menjadi REFUND_PENDING. Approval internal bukan bukti refund provider
          berhasil.
        </p>
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="refundBusy" @click="refundModal = false"
          >Batal</AppButton
        >
        <AppButton type="submit" form="refund-form" :loading="refundBusy">Ajukan refund</AppButton>
      </template>
    </AppModal>
  </div>
</template>
