<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  ShieldCheck,
  RotateCw,
  Clock,
  CircleCheck,
  CircleX,
  LinkIcon,
  ExternalLink,
  ChevronRight,
  Lock,
} from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import PaymentLogo from '@/components/ui/PaymentLogo.vue'
import CopyButton from '@/components/ui/CopyButton.vue'
import { checkoutApi } from '@/api/checkout'
import { ApiError } from '@/lib/http'
import { formatCurrency } from '@/lib/format'
import { SUPPORTED_LOGOS, channelLogo } from '@/lib/paymentLogos'
import type { CheckoutAttempt, CheckoutChannel, CheckoutSummary } from '@/types/api'

const route = useRoute()
const paymentNo = route.params.paymentNo as string
const storageKey = `checkout:${paymentNo}`

// Per FRONTEND_INTEGRATION.md: read token from fragment, keep per-payment in sessionStorage, strip fragment.
function readToken() {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const fromHash = hash.get('token')
  if (fromHash) {
    sessionStorage.setItem(storageKey, fromHash)
    history.replaceState(history.state, '', window.location.pathname + window.location.search)
    return fromHash
  }
  return sessionStorage.getItem(storageKey)
}
const token = readToken()

const summary = ref<CheckoutSummary | null>(null)
const channels = ref<CheckoutChannel[]>([])
const attempt = ref<CheckoutAttempt | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const selecting = ref<string | null>(null)
const fatal = ref<{ title: string; message: string; requestId?: string } | null>(null)
const notice = ref<string | null>(null)

const FINAL_OK = ['PAID', 'PARTIALLY_REFUNDED', 'REFUND_PENDING', 'REFUNDED']
const FINAL_BAD = ['EXPIRED', 'CANCELLED', 'FAILED']
const payable = computed(() => ['CREATED', 'PENDING'].includes(summary.value?.status ?? ''))

function handle(e: unknown) {
  if (!(e instanceof ApiError))
    return (fatal.value = { title: 'Terjadi kesalahan', message: 'Silakan muat ulang halaman.' })
  if (e.status === 401) {
    sessionStorage.removeItem(storageKey)
    fatal.value = {
      title: 'Link pembayaran tidak berlaku',
      message:
        'Link sudah kedaluwarsa atau tidak valid. Minta link pembayaran baru melalui Portal Event.',
    }
  } else if (e.status === 404)
    fatal.value = {
      title: 'Pembayaran tidak ditemukan',
      message: 'Periksa kembali link pembayaran Anda.',
    }
  else if (e.status === 409) notice.value = e.message
  else
    fatal.value = { title: 'Layanan sedang terganggu', message: e.message, requestId: e.requestId }
}

async function load() {
  if (!token) {
    loading.value = false
    fatal.value = {
      title: 'Link tidak lengkap',
      message: 'Buka halaman ini melalui link pembayaran dari Portal Event.',
    }
    return
  }
  try {
    const [s, c] = await Promise.all([
      checkoutApi.summary(paymentNo, token),
      checkoutApi.channels(paymentNo, token),
    ])
    summary.value = s.data
    channels.value = c.data.channels
  } catch (e) {
    handle(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function refresh() {
  if (!token) return
  refreshing.value = true
  notice.value = null
  try {
    summary.value = (await checkoutApi.status(paymentNo, token)).data
  } catch (e) {
    handle(e)
  } finally {
    refreshing.value = false
  }
}

const MIDTRANS_HOSTS = ['app.midtrans.com', 'app.sandbox.midtrans.com']
const safeUrl = (u: string | null | undefined, hosts?: string[]) => {
  if (!u) return null
  try {
    const p = new URL(u)
    if (p.protocol !== 'https:') return null
    if (hosts && !hosts.includes(p.hostname)) return null
    return p.href
  } catch {
    return null
  }
}

async function choose(ch: CheckoutChannel) {
  if (!token || selecting.value) return
  selecting.value = ch.code
  notice.value = null
  try {
    const res = (await checkoutApi.createAttempt(paymentNo, token, ch.code)).data
    attempt.value = res
    const redirect = safeUrl(res.instructions.redirect_url, MIDTRANS_HOSTS)
    if (res.gateway === 'MIDTRANS' && redirect) {
      window.location.assign(redirect)
      return
    }
  } catch (e) {
    if (e instanceof ApiError && e.code === 'ATTEMPT_IN_PROGRESS') {
      const aid = (e.details as { attempt_id?: string } | null)?.attempt_id
      notice.value =
        'Pembayaran sebelumnya masih diproses. Selesaikan pembayaran tersebut atau cek status.'
      if (aid)
        attempt.value = (await checkoutApi.instructions(aid, token).catch(() => null))?.data ?? null
    } else if (e instanceof ApiError && e.code === 'GATEWAY_OUTCOME_UNKNOWN') {
      notice.value =
        'Hasil dari penyedia pembayaran belum pasti. Jangan membayar ulang; cek status beberapa saat lagi.'
    } else handle(e)
  } finally {
    selecting.value = null
  }
}

const midtransRedirect = computed(() =>
  safeUrl(attempt.value?.instructions.redirect_url, MIDTRANS_HOSTS),
)
const howToPay = computed(() => safeUrl(attempt.value?.instructions.how_to_pay_page))
</script>

<template>
  <div class="relative min-h-dvh overflow-hidden">
    <div
      class="pointer-events-none absolute -top-40 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-brand-500/15 blur-3xl"
    />

    <header class="relative mx-auto flex max-w-lg items-center justify-between px-4 pt-4">
      <div class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Lock class="size-4 text-emerald-500" /> Pembayaran aman
      </div>
      <ThemeToggle compact />
    </header>

    <main class="relative mx-auto max-w-lg px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-4">
        <div class="surface space-y-4 p-6">
          <div class="skeleton h-3 w-24" />
          <div class="skeleton h-10 w-2/3" />
          <div class="skeleton h-3 w-40" />
        </div>
        <div class="surface space-y-3 p-4">
          <div v-for="i in 3" :key="i" class="flex items-center gap-3">
            <div class="skeleton h-9 w-16" />
            <div class="skeleton h-4 flex-1" />
          </div>
        </div>
      </div>

      <!-- Fatal -->
      <div v-else-if="fatal" class="surface animate-slide-up p-8 text-center">
        <div
          class="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
        >
          <LinkIcon class="size-6" />
        </div>
        <h1 class="text-lg font-bold text-slate-900 dark:text-white">{{ fatal.title }}</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ fatal.message }}</p>
        <p v-if="fatal.requestId" class="mt-3 font-mono text-[11px] text-slate-400">
          request_id: {{ fatal.requestId }}
        </p>
      </div>

      <template v-else-if="summary">
        <!-- Summary -->
        <section
          class="relative animate-slide-up overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950 p-6 text-white shadow-xl shadow-slate-900/20 dark:from-slate-900 dark:to-brand-950 dark:ring-1 dark:ring-white/10"
        >
          <div class="absolute -top-12 -right-12 size-40 rounded-full bg-brand-500/30 blur-2xl" />
          <div class="relative flex items-start justify-between gap-3">
            <div>
              <p class="text-xs text-white/60">Total pembayaran</p>
              <p class="mt-1 text-3xl font-bold tracking-tight tabular-nums">
                {{ formatCurrency(summary.amount, summary.currency) }}
              </p>
            </div>
            <AppBadge :status="summary.status" class="!bg-white/10 !text-white !ring-white/20" />
          </div>
          <div
            class="relative mt-5 flex items-center justify-between gap-2 border-t border-white/10 pt-4"
          >
            <div class="min-w-0">
              <p class="text-[11px] text-white/50">No. pembayaran</p>
              <p class="truncate font-mono text-sm">{{ summary.payment_no }}</p>
            </div>
            <button
              type="button"
              class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs font-semibold ring-1 ring-white/15 transition hover:bg-white/15"
              :disabled="refreshing"
              @click="refresh"
            >
              <RotateCw :class="['size-3.5', refreshing && 'animate-spin']" /> Cek status
            </button>
          </div>
        </section>

        <p
          v-if="notice"
          class="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20"
        >
          <Clock class="mt-0.5 size-4 shrink-0" /> {{ notice }}
        </p>

        <!-- Final states -->
        <section v-if="FINAL_OK.includes(summary.status)" class="surface mt-4 p-6 text-center">
          <CircleCheck class="mx-auto size-12 text-emerald-500" />
          <h2 class="mt-3 font-bold text-slate-900 dark:text-white">Pembayaran diterima</h2>
          <p class="mt-1 text-sm text-slate-500">
            Konfirmasi tiket/pesanan dikirim oleh Portal Event setelah verifikasi server.
          </p>
        </section>
        <section
          v-else-if="FINAL_BAD.includes(summary.status)"
          class="surface mt-4 p-6 text-center"
        >
          <CircleX class="mx-auto size-12 text-slate-400" />
          <h2 class="mt-3 font-bold text-slate-900 dark:text-white">Pembayaran tidak aktif</h2>
          <p class="mt-1 text-sm text-slate-500">
            Silakan buat pesanan atau minta link baru melalui Portal Event.
          </p>
        </section>

        <!-- Attempt instructions -->
        <section v-else-if="attempt" class="surface mt-4 animate-slide-up p-5">
          <div class="flex items-center gap-3">
            <PaymentLogo :code="attempt.channel_code" size="lg" />
            <div>
              <p class="font-semibold text-slate-900 dark:text-white">
                {{ channelLogo(attempt.channel_code)?.label ?? attempt.channel_code }}
              </p>
              <AppBadge :status="attempt.status" />
            </div>
          </div>
          <div
            v-if="attempt.instructions.payment_code"
            class="mt-5 rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-800/60"
          >
            <p class="text-xs text-slate-500">Kode pembayaran</p>
            <p
              class="mt-1 font-mono text-2xl font-bold tracking-widest text-slate-900 dark:text-white"
            >
              {{ attempt.instructions.payment_code }}
            </p>
            <CopyButton
              :value="attempt.instructions.payment_code"
              label="Salin kode"
              class="mt-2"
            />
          </div>
          <div class="mt-4 flex flex-col gap-2">
            <a v-if="midtransRedirect" :href="midtransRedirect" rel="noreferrer">
              <AppButton block size="lg"
                >Lanjutkan pembayaran <ExternalLink class="size-4"
              /></AppButton>
            </a>
            <a v-if="howToPay" :href="howToPay" target="_blank" rel="noreferrer noopener">
              <AppButton block variant="secondary"
                >Cara pembayaran <ExternalLink class="size-4"
              /></AppButton>
            </a>
            <AppButton variant="ghost" block :icon="RotateCw" :loading="refreshing" @click="refresh"
              >Saya sudah membayar, cek status</AppButton
            >
          </div>
        </section>

        <!-- Channel selection -->
        <section v-else-if="payable" class="mt-6">
          <h2 class="mb-3 px-1 text-sm font-semibold text-slate-900 dark:text-white">
            Pilih metode pembayaran
          </h2>
          <div v-if="!channels.length" class="surface p-6 text-center text-sm text-slate-500">
            Metode pembayaran belum tersedia. Coba beberapa saat lagi.
          </div>
          <ul v-else class="space-y-2.5">
            <li v-for="ch in channels" :key="ch.code">
              <button
                type="button"
                class="surface group flex w-full items-center gap-4 p-4 text-left transition hover:border-brand-300 hover:shadow-md active:scale-[.99] disabled:opacity-60 dark:hover:border-brand-500/50"
                :disabled="!!selecting"
                @click="choose(ch)"
              >
                <PaymentLogo :code="ch.code" size="lg" />
                <div class="min-w-0 flex-1">
                  <p class="font-semibold text-slate-900 dark:text-white">{{ ch.name }}</p>
                  <p v-if="ch.code === 'MIDTRANS_SNAP'" class="mt-0.5 text-xs text-slate-500">
                    VA bank, QRIS, e-wallet, kartu
                  </p>
                </div>
                <span
                  v-if="selecting === ch.code"
                  class="size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
                />
                <ChevronRight
                  v-else
                  class="size-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
                />
              </button>
            </li>
          </ul>
        </section>

        <div class="mt-8">
          <p
            class="mb-3 text-center text-[11px] font-semibold tracking-wider text-slate-400 uppercase"
          >
            Didukung oleh
          </p>
          <div class="grid grid-cols-4 gap-2 sm:grid-cols-6">
            <div
              v-for="l in SUPPORTED_LOGOS"
              :key="l.label"
              class="grid h-10 place-items-center rounded-lg bg-white p-1.5 ring-1 ring-slate-200 dark:ring-slate-800"
            >
              <img
                :src="l.src"
                :alt="l.label"
                class="max-h-full max-w-full object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <p class="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <ShieldCheck class="size-3.5" /> Jangan bagikan link pembayaran ini kepada siapa pun.
        </p>
      </template>
    </main>
  </div>
</template>
