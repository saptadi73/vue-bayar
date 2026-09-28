<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, EyeOff, KeyRound, LogOut, ShieldCheck } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import { ApiError } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const router = useRouter()
const toast = useToastStore()
const form = reactive({ currentPassword: '', newPassword: '', confirmation: '' })
const showPasswords = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const requestId = ref<string>()

const valid = computed(
  () =>
    form.currentPassword.length > 0 &&
    form.newPassword.length >= 15 &&
    form.newPassword.length <= 128 &&
    form.newPassword === form.confirmation &&
    form.newPassword !== form.currentPassword,
)

async function submit() {
  if (!valid.value || loading.value) return
  loading.value = true
  error.value = null
  requestId.value = undefined
  try {
    await auth.changePassword(form.currentPassword, form.newPassword)
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmation = ''
    toast.success('Password berhasil diganti')
    await router.replace('/admin')
  } catch (cause) {
    if (cause instanceof ApiError) {
      requestId.value = cause.status >= 500 ? cause.requestId : undefined
      error.value =
        cause.code === 'ADMIN_PASSWORD_INVALID'
          ? 'Password saat ini tidak valid.'
          : cause.message
    } else {
      error.value = 'Terjadi kesalahan tak terduga.'
    }
  } finally {
    form.currentPassword = ''
    loading.value = false
  }
}

async function logout() {
  await auth.logout()
  await router.replace('/admin/login')
}
</script>

<template>
  <main class="min-h-dvh bg-slate-50 px-5 py-6 dark:bg-slate-950">
    <div class="mx-auto flex max-w-5xl items-center justify-between">
      <div class="flex items-center gap-2.5 text-slate-900 dark:text-white">
        <div class="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
          <KeyRound class="size-5" />
        </div>
        <span class="font-bold">Payment Portal</span>
      </div>
      <ThemeToggle compact />
    </div>

    <div class="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md items-center py-10">
      <section class="surface w-full p-6 sm:p-8" aria-labelledby="password-title">
        <div class="mb-6">
          <div class="mb-4 grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <ShieldCheck class="size-5" />
          </div>
          <h1 id="password-title" class="text-xl font-bold text-slate-900 dark:text-white">
            Ganti password sementara
          </h1>
          <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Buat password baru sebelum melanjutkan ke konsol admin.
          </p>
        </div>

        <div
          v-if="error"
          class="mb-5 rounded-xl bg-rose-50 p-3.5 text-sm text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20"
          role="alert"
        >
          <p>{{ error }}</p>
          <p v-if="requestId" class="mt-1 font-mono text-[11px] opacity-70">
            request_id: {{ requestId }}
          </p>
        </div>

        <form class="space-y-4" novalidate @submit.prevent="submit">
          <div>
            <label for="current-password" class="label">Password saat ini</label>
            <input
              id="current-password"
              v-model="form.currentPassword"
              :type="showPasswords ? 'text' : 'password'"
              autocomplete="current-password"
              maxlength="128"
              required
              class="input"
            />
          </div>
          <div>
            <label for="new-password" class="label">Password baru</label>
            <input
              id="new-password"
              v-model="form.newPassword"
              :type="showPasswords ? 'text' : 'password'"
              autocomplete="new-password"
              minlength="15"
              maxlength="128"
              required
              class="input"
            />
            <p class="mt-1.5 text-xs text-slate-500">Gunakan 15-128 karakter.</p>
          </div>
          <div>
            <label for="password-confirmation" class="label">Ulangi password baru</label>
            <input
              id="password-confirmation"
              v-model="form.confirmation"
              :type="showPasswords ? 'text' : 'password'"
              autocomplete="new-password"
              maxlength="128"
              required
              class="input"
              :aria-invalid="form.confirmation.length > 0 && form.confirmation !== form.newPassword"
            />
            <p
              v-if="form.confirmation && form.confirmation !== form.newPassword"
              class="mt-1.5 text-xs text-rose-600 dark:text-rose-400"
            >
              Konfirmasi password belum sama.
            </p>
          </div>

          <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input v-model="showPasswords" type="checkbox" class="size-4 accent-brand-600" />
            <EyeOff v-if="showPasswords" class="size-4" />
            <Eye v-else class="size-4" />
            Tampilkan password
          </label>

          <AppButton type="submit" size="lg" block :loading="loading" :disabled="!valid">
            Simpan password baru
          </AppButton>
        </form>

        <button
          type="button"
          class="mt-5 flex w-full items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          @click="logout"
        >
          <LogOut class="size-4" /> Keluar dari sesi
        </button>
      </section>
    </div>
  </main>
</template>