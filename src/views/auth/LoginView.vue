<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Mail, Lock, Eye, EyeOff, Wallet, ShieldCheck, CircleAlert, ArrowRight } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { ApiError } from '@/lib/http'
import { SUPPORTED_LOGOS } from '@/lib/paymentLogos'

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()

const form = reactive({ identifier: '', password: '' })
const show = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const requestId = ref<string>()
const wait = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

const disabled = computed(() => loading.value || wait.value > 0)

function startCountdown(sec: number) {
  wait.value = sec
  clearInterval(timer)
  timer = setInterval(() => {
    wait.value -= 1
    if (wait.value <= 0) clearInterval(timer)
  }, 1000)
}
onBeforeUnmount(() => clearInterval(timer))

async function submit() {
  if (disabled.value) return
  error.value = null
  requestId.value = undefined
  loading.value = true
  try {
    await auth.login(form.identifier.trim(), form.password)
    toast.success('Selamat datang', auth.user?.display_name)
    const redirect =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/admin')
        ? route.query.redirect
        : '/admin'
    router.replace(redirect)
  } catch (e) {
    if (e instanceof ApiError) {
      requestId.value = e.status >= 500 ? e.requestId : undefined
      if (e.status === 429) {
        startCountdown(e.retryAfter ?? 60)
        error.value = 'Terlalu banyak percobaan masuk. Coba lagi nanti.'
      } else if (e.code === 'ADMIN_DISABLED')
        error.value = 'Portal admin belum diaktifkan di server.'
      else if (e.code === 'ADMIN_ORIGIN_DENIED')
        error.value = 'Origin tidak diizinkan. Akses portal dari domain resmi.'
      else if (e.status === 401 || e.status === 422)
        error.value = 'Email atau password tidak valid.'
      else error.value = e.message
    } else error.value = 'Terjadi kesalahan tak terduga.'
  } finally {
    form.password = ''
    loading.value = false
  }
}
</script>

<template>
  <div class="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
    <!-- Brand panel -->
    <aside class="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
      <div class="absolute -top-40 -left-40 size-[32rem] rounded-full bg-brand-600/40 blur-3xl" />
      <div
        class="absolute -right-32 -bottom-32 size-[28rem] rounded-full bg-violet-600/30 blur-3xl"
      />
      <div
        class="absolute inset-0 opacity-[0.07]"
        style="
          background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0);
          background-size: 24px 24px;
        "
      />
      <div class="relative flex items-center gap-3">
        <div
          class="grid size-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur"
        >
          <Wallet class="size-5" />
        </div>
        <span class="text-lg font-bold">Payment Portal</span>
      </div>
      <div class="relative mt-auto max-w-lg">
        <h1 class="text-4xl leading-tight font-bold tracking-tight">
          Kelola transaksi, integrasi, dan rekonsiliasi dalam satu konsol.
        </h1>
        <p class="mt-4 text-slate-300">
          Akses berbasis izin, audit trail setiap perubahan, dan kredensial client yang aman.
        </p>
        <div class="mt-10 grid grid-cols-4 gap-2.5">
          <div
            v-for="l in SUPPORTED_LOGOS.slice(0, 8)"
            :key="l.label"
            class="grid h-12 place-items-center rounded-xl bg-white p-2 shadow-lg shadow-black/20"
          >
            <img :src="l.src" :alt="l.label" class="max-h-full max-w-full object-contain" />
          </div>
        </div>
      </div>
    </aside>

    <!-- Form -->
    <main class="relative flex flex-col px-5 py-6 sm:px-10">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5 lg:invisible">
          <div
            class="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-700 text-white shadow-lg shadow-brand-600/30"
          >
            <Wallet class="size-5" />
          </div>
          <span class="font-bold text-slate-900 dark:text-white">Payment Portal</span>
        </div>
        <ThemeToggle compact />
      </div>

      <div class="mx-auto my-auto w-full max-w-sm py-10">
        <div class="mb-8">
          <div
            class="mb-4 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
          >
            <ShieldCheck class="size-3.5" /> Khusus pengelola
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Masuk ke Admin
          </h2>
          <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Gunakan akun operator yang diberikan Super Admin.
          </p>
        </div>

        <Transition enter-active-class="animate-fade-in">
          <div
            v-if="error"
            class="mb-5 flex gap-3 rounded-xl bg-rose-50 p-3.5 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20"
            role="alert"
          >
            <CircleAlert class="mt-0.5 size-4 shrink-0" />
            <div>
              <p>{{ error }}</p>
              <p v-if="wait > 0" class="mt-1 font-semibold">Tunggu {{ wait }} detik.</p>
              <p v-if="requestId" class="mt-1 font-mono text-[11px] opacity-70">
                request_id: {{ requestId }}
              </p>
            </div>
          </div>
        </Transition>

        <form class="space-y-4" novalidate @submit.prevent="submit">
          <div>
            <label for="identifier" class="label">Email</label>
            <div class="relative">
              <Mail
                class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400"
              />
              <input
                id="identifier"
                v-model="form.identifier"
                type="email"
                autocomplete="username"
                required
                class="input h-11 pl-10"
                placeholder="nama@perusahaan.com"
              />
            </div>
          </div>
          <div>
            <label for="password" class="label">Password</label>
            <div class="relative">
              <Lock
                class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400"
              />
              <input
                id="password"
                v-model="form.password"
                :type="show ? 'text' : 'password'"
                autocomplete="current-password"
                required
                maxlength="128"
                class="input h-11 pr-11 pl-10"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                class="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                :aria-label="show ? 'Sembunyikan password' : 'Tampilkan password'"
                @click="show = !show"
              >
                <EyeOff v-if="show" class="size-4" />
                <Eye v-else class="size-4" />
              </button>
            </div>
          </div>
          <AppButton
            type="submit"
            size="lg"
            block
            :loading="loading"
            :disabled="disabled || !form.identifier || !form.password"
            class="mt-2"
          >
            {{ wait > 0 ? `Coba lagi dalam ${wait}s` : 'Masuk' }}
            <ArrowRight v-if="!loading && !wait" class="size-4" />
          </AppButton>
        </form>

        <p class="mt-8 text-center text-xs text-slate-400">
          Tidak ada pendaftaran mandiri. Hubungi Super Admin untuk akses.
        </p>
      </div>
    </main>
  </div>
</template>
