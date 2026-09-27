<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { SlidersHorizontal, X } from '@lucide/vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import FormField from '@/components/ui/FormField.vue'
import { usePaged } from '@/composables/usePaged'
import { clientsApi, paymentsApi, type PaymentFilter } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { P } from '@/lib/permissions'
import { formatCurrency, formatDate, localToIso } from '@/lib/format'
import { labelOf } from '@/lib/status'
import { PAYMENT_STATUSES, type Client, type Payment } from '@/types/api'

const router = useRouter()
const auth = useAuthStore()

const draft = reactive({
  status: '',
  reference_id: '',
  client_id: '',
  event_id: '',
  from: '',
  to: '',
})
const applied = ref<PaymentFilter>({})
const showFilters = ref(false)
const localError = ref('')

const clients = ref<Client[]>([])
if (auth.can(P.clientsRead))
  clientsApi
    .list({ limit: 100, offset: 0 })
    .then((r) => (clients.value = r.data))
    .catch(() => {})

const paged = usePaged<Payment, PaymentFilter>((q) => paymentsApi.list(q), { filters: applied })

const activeCount = computed(() => Object.values(applied.value).filter(Boolean).length)

function apply() {
  localError.value = ''
  if (draft.event_id && !draft.client_id)
    return (localError.value = 'Filter event wajib disertai client.')
  if (draft.from && draft.to && new Date(draft.from) >= new Date(draft.to))
    return (localError.value = 'Tanggal awal harus sebelum tanggal akhir.')
  applied.value = {
    status: draft.status || undefined,
    reference_id: draft.reference_id.trim() || undefined,
    client_id: draft.client_id || undefined,
    event_id: draft.event_id.trim() || undefined,
    created_from: localToIso(draft.from),
    created_to: localToIso(draft.to),
  }
  showFilters.value = false
}

function clear() {
  Object.assign(draft, {
    status: '',
    reference_id: '',
    client_id: '',
    event_id: '',
    from: '',
    to: '',
  })
  apply()
}

const columns: Column[] = [
  { key: 'payment_no', label: 'No. Payment' },
  { key: 'client_name', label: 'Portal / Event' },
  { key: 'reference_id', label: 'Reference', mobileHidden: true },
  { key: 'amount', label: 'Nominal', align: 'right' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Dibuat', mobileHidden: true },
]
</script>

<template>
  <div>
    <PageHeader
      title="Pembayaran"
      subtitle="Ledger transaksi read-only. Status berasal dari database, bukan inquiry real-time."
    />

    <DataTable
      :columns="columns"
      :paged="paged"
      searchable
      :search-keys="['payment_no', 'reference_id', 'client_name', 'event_name']"
      clickable
      empty-title="Belum ada transaksi"
      empty-message="Transaksi yang dibuat backend Portal Event akan muncul di sini."
      @row-click="(r) => router.push(`/admin/payments/${r.id}`)"
    >
      <template #toolbar>
        <AppButton
          variant="secondary"
          :icon="SlidersHorizontal"
          @click="showFilters = !showFilters"
        >
          Filter
          <span
            v-if="activeCount"
            class="grid size-5 place-items-center rounded-full bg-brand-600 text-[10px] text-white"
            >{{ activeCount }}</span
          >
        </AppButton>
      </template>

      <template v-if="showFilters" #filters>
        <form
          class="grid w-full grid-cols-1 gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-3"
          @submit.prevent="apply"
        >
          <FormField label="Status" for="f-status">
            <select id="f-status" v-model="draft.status" class="input">
              <option value="">Semua status</option>
              <option v-for="s in PAYMENT_STATUSES" :key="s" :value="s">{{ labelOf(s) }}</option>
            </select>
          </FormField>
          <FormField label="Reference ID" for="f-ref" hint="Pencocokan persis">
            <input
              id="f-ref"
              v-model="draft.reference_id"
              class="input"
              placeholder="ORDER-2026-0001"
            />
          </FormField>
          <FormField v-if="clients.length" label="Client" for="f-client">
            <select id="f-client" v-model="draft.client_id" class="input">
              <option value="">Semua client</option>
              <option v-for="c in clients" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.code }})
              </option>
            </select>
          </FormField>
          <FormField v-else label="Client UUID" for="f-client-id">
            <input
              id="f-client-id"
              v-model="draft.client_id"
              class="input font-mono text-xs"
              placeholder="UUID internal client"
            />
          </FormField>
          <FormField label="Event ID" for="f-event" hint="Memerlukan client">
            <input id="f-event" v-model="draft.event_id" class="input" placeholder="EVT-2026-001" />
          </FormField>
          <FormField label="Dibuat dari" for="f-from">
            <input id="f-from" v-model="draft.from" type="datetime-local" class="input" />
          </FormField>
          <FormField label="Dibuat sebelum" for="f-to">
            <input id="f-to" v-model="draft.to" type="datetime-local" class="input" />
          </FormField>
          <div class="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center lg:col-span-3">
            <p v-if="localError" class="text-sm font-medium text-rose-600 dark:text-rose-400">
              {{ localError }}
            </p>
            <div class="flex gap-2 sm:ml-auto">
              <AppButton variant="ghost" :icon="X" @click="clear">Reset</AppButton>
              <AppButton type="submit">Terapkan</AppButton>
            </div>
          </div>
        </form>
      </template>

      <template #cell-payment_no="{ row }">
        <span class="font-mono text-xs font-semibold text-slate-900 dark:text-white">{{
          row.payment_no
        }}</span>
      </template>
      <template #cell-client_name="{ row }">
        <div class="min-w-0">
          <p class="truncate font-medium text-slate-800 dark:text-slate-100">
            {{ row.client_name ?? '—' }}
          </p>
          <p class="truncate text-xs text-slate-500">
            {{ row.event_name ?? row.event_id ?? 'Tanpa event' }}
          </p>
        </div>
      </template>
      <template #cell-reference_id="{ value }">
        <span class="font-mono text-xs text-slate-600 dark:text-slate-400">{{ value }}</span>
      </template>
      <template #cell-amount="{ row }">
        <span class="font-semibold text-slate-900 tabular-nums dark:text-white">{{
          formatCurrency(row.amount, row.currency)
        }}</span>
      </template>
      <template #cell-status="{ value }"><AppBadge :status="value" /></template>
      <template #cell-created_at="{ value }">
        <span class="text-xs whitespace-nowrap text-slate-500">{{ formatDate(value) }}</span>
      </template>
    </DataTable>
  </div>
</template>
