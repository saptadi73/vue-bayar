<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Receipt, Wallet, BadgeCheck, Activity, ArrowRight, Sparkles } from '@lucide/vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import StateView from '@/components/ui/StateView.vue'
import AppChart from '@/components/charts/AppChart.vue'
import { paymentsApi } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { NAV } from '@/layouts/nav'
import { P, ROLE_LABEL } from '@/lib/permissions'
import { ApiError } from '@/lib/http'
import { formatCompact, formatCurrency, formatRelative } from '@/lib/format'
import { labelOf, toneOf, TONE_HEX } from '@/lib/status'
import type { Payment, PaymentSummary } from '@/types/api'

const auth = useAuthStore()
const router = useRouter()
const canPayments = computed(() => auth.can(P.paymentsRead))

const RANGES = [
  { key: '7', label: '7 hari' },
  { key: '30', label: '30 hari' },
  { key: '90', label: '90 hari' },
  { key: 'all', label: 'Semua' },
]
const range = ref('30')
const summary = ref<PaymentSummary | null>(null)
const recent = ref<Payment[]>([])
const loading = ref(false)
const error = ref<ApiError | null>(null)

async function load() {
  if (!canPayments.value) return
  loading.value = true
  error.value = null
  const created_from =
    range.value === 'all'
      ? undefined
      : new Date(Date.now() - Number(range.value) * 86400000).toISOString()
  try {
    const [s, r] = await Promise.all([
      paymentsApi.summary({ created_from }),
      paymentsApi.list({ limit: 6, offset: 0, created_from }),
    ])
    summary.value = s.data
    recent.value = r.data
  } catch (e) {
    error.value = e instanceof ApiError ? e : new ApiError(0, {})
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(range, load)

const totals = computed(() => {
  const s = summary.value?.by_status ?? []
  const count = s.reduce((a, b) => a + b.payment_count, 0)
  const amount = s.reduce((a, b) => a + b.amount, 0)
  const paidStatuses = ['PAID', 'PARTIALLY_REFUNDED', 'REFUND_PENDING', 'REFUNDED']
  const paid = s.filter((x) => paidStatuses.includes(x.status))
  const paidCount = paid.reduce((a, b) => a + b.payment_count, 0)
  const paidAmount = paid.reduce((a, b) => a + b.amount, 0)
  return {
    count,
    amount,
    paidCount,
    paidAmount,
    rate: count ? Math.round((paidCount / count) * 1000) / 10 : 0,
  }
})

const donut = computed(() => {
  const s = (summary.value?.by_status ?? []).filter((x) => x.payment_count > 0)
  return {
    series: s.map((x) => x.payment_count),
    options: {
      labels: s.map((x) => labelOf(x.status)),
      colors: s.map((x) => TONE_HEX[toneOf(x.status)]),
      legend: { position: 'bottom' as const },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Transaksi',
                formatter: () => totals.value.count.toLocaleString('id-ID'),
              },
            },
          },
        },
      },
    },
  }
})

const bars = computed(() => {
  const c = (summary.value?.by_client ?? []).slice(0, 8)
  return {
    series: [{ name: 'Nominal', data: c.map((x) => x.amount) }],
    options: {
      colors: ['#6366f1'],
      xaxis: {
        categories: c.map((x) => x.client_name ?? x.client_id.slice(0, 8)),
        labels: { formatter: (v: string) => formatCompact(Number(v)) },
      },
      plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '60%' } },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'horizontal',
          gradientToColors: ['#a855f7'],
          stops: [0, 100],
        },
      },
      tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
    },
  }
})

const radial = computed(() => ({
  series: [totals.value.rate],
  options: {
    colors: ['#10b981'],
    plotOptions: {
      radialBar: {
        hollow: { size: '62%' },
        track: { background: 'rgba(148,163,184,.15)' },
        dataLabels: {
          name: { offsetY: 22, fontSize: '12px' },
          value: {
            offsetY: -12,
            fontSize: '26px',
            fontWeight: 700,
            formatter: (v: number) => `${v}%`,
          },
        },
      },
    },
    stroke: { lineCap: 'round' as const },
    labels: ['Berhasil dibayar'],
  },
}))

const shortcuts = computed(() =>
  NAV.flatMap((g) => g.items).filter((i) => i.to !== '/admin' && !i.soon && auth.canAny(...i.any)),
)
</script>

<template>
  <div>
    <PageHeader :title="`Halo, ${auth.user?.display_name?.split(' ')[0] ?? 'Admin'}`">
      <template #subtitle>
        Masuk sebagai
        <span class="font-semibold text-slate-700 dark:text-slate-200">{{
          ROLE_LABEL[auth.user?.role ?? '']
        }}</span>
      </template>
      <template v-if="canPayments" #actions>
        <div class="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">
          <button
            v-for="r in RANGES"
            :key="r.key"
            type="button"
            :class="[
              'h-8 rounded-lg px-3 text-xs font-semibold transition',
              range === r.key
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 dark:text-slate-400',
            ]"
            @click="range = r.key"
          >
            {{ r.label }}
          </button>
        </div>
      </template>
    </PageHeader>

    <template v-if="canPayments">
      <div v-if="error" class="surface mb-6"><StateView :error="error" @retry="load" /></div>
      <template v-else>
        <div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Transaksi"
            :value="totals.count.toLocaleString('id-ID')"
            hint="Semua status"
            :icon="Receipt"
            :loading="loading"
          />
          <StatCard
            label="Nominal"
            :value="formatCurrency(totals.amount)"
            hint="Gross, semua status"
            :icon="Wallet"
            tone="violet"
            :loading="loading"
          />
          <StatCard
            label="Terbayar"
            :value="formatCurrency(totals.paidAmount)"
            :hint="`${totals.paidCount.toLocaleString('id-ID')} transaksi`"
            :icon="BadgeCheck"
            tone="success"
            :loading="loading"
          />
          <StatCard
            label="Success rate"
            :value="`${totals.rate}%`"
            hint="Terbayar / total"
            :icon="Activity"
            tone="warning"
            :loading="loading"
          />
        </div>

        <div class="mt-4 grid gap-4 sm:mt-6 lg:grid-cols-3">
          <AppCard title="Distribusi status" subtitle="Jumlah transaksi per status ledger">
            <div v-if="loading" class="grid h-[300px] place-items-center">
              <div class="skeleton size-48 rounded-full" />
            </div>
            <StateView v-else-if="!donut.series.length" type="empty" compact />
            <AppChart
              v-else
              type="donut"
              :series="donut.series"
              :options="donut.options"
              :height="300"
            />
          </AppCard>

          <AppCard
            title="Nominal per client"
            subtitle="Top 8 Portal berdasarkan nominal"
            class="lg:col-span-2"
          >
            <div v-if="loading" class="flex h-[300px] flex-col justify-around py-2">
              <div
                v-for="i in 6"
                :key="i"
                class="skeleton h-6"
                :style="{ width: `${90 - i * 11}%` }"
              />
            </div>
            <StateView v-else-if="!bars.series[0]?.data.length" type="empty" compact />
            <AppChart
              v-else
              type="bar"
              :series="bars.series"
              :options="bars.options"
              :height="300"
            />
          </AppCard>
        </div>

        <div class="mt-4 grid gap-4 sm:mt-6 lg:grid-cols-3">
          <AppCard title="Tingkat keberhasilan" class="order-2 lg:order-1">
            <div v-if="loading" class="grid h-[260px] place-items-center">
              <div class="skeleton size-44 rounded-full" />
            </div>
            <AppChart
              v-else
              type="radialBar"
              :series="radial.series"
              :options="radial.options"
              :height="260"
            />
          </AppCard>

          <AppCard
            title="Transaksi terbaru"
            :padded="false"
            class="order-1 lg:order-2 lg:col-span-2"
          >
            <template #actions>
              <RouterLink
                to="/admin/payments"
                class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400"
              >
                Lihat semua <ArrowRight class="size-3.5" />
              </RouterLink>
            </template>
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">
              <template v-if="loading">
                <li v-for="i in 5" :key="i" class="flex items-center gap-3 px-5 py-3.5">
                  <div class="skeleton size-9 rounded-xl" />
                  <div class="flex-1 space-y-2">
                    <div class="skeleton h-3.5 w-1/2" />
                    <div class="skeleton h-3 w-1/3" />
                  </div>
                  <div class="skeleton h-5 w-16 rounded-full" />
                </li>
              </template>
              <li v-else-if="!recent.length"><StateView type="empty" compact /></li>
              <li
                v-for="p in recent"
                v-else
                :key="p.id"
                class="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5 dark:hover:bg-slate-800/40"
                @click="router.push(`/admin/payments/${p.id}`)"
              >
                <div
                  class="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800"
                >
                  <Receipt class="size-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {{ p.event_name ?? p.reference_id }}
                  </p>
                  <p class="truncate text-xs text-slate-500">
                    {{ p.client_name ?? '-' }} · {{ formatRelative(p.created_at) }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-semibold text-slate-900 tabular-nums dark:text-white">
                    {{ formatCurrency(p.amount, p.currency) }}
                  </p>
                  <AppBadge :status="p.status" class="mt-1" />
                </div>
              </li>
            </ul>
          </AppCard>
        </div>
      </template>
    </template>

    <!-- Users without payment access see module shortcuts only (no transaction metrics). -->
    <div v-else>
      <div class="surface relative mb-6 overflow-hidden p-6">
        <div class="absolute -top-16 -right-16 size-48 rounded-full bg-brand-500/10 blur-2xl" />
        <div class="relative flex items-start gap-4">
          <div
            class="grid size-11 place-items-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
          >
            <Sparkles class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-slate-900 dark:text-white">
              Modul yang tersedia untuk Anda
            </h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Menu ditampilkan sesuai izin efektif dari server.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="shortcuts.length" class="mt-6">
      <h2 class="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Akses cepat</h2>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <RouterLink
          v-for="s in shortcuts"
          :key="s.to"
          :to="s.to"
          class="surface group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div
            class="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-brand-600 group-hover:text-white dark:bg-slate-800 dark:text-slate-300"
          >
            <component :is="s.icon" class="size-5" />
          </div>
          <span class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{
            s.label
          }}</span>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
