<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Pencil, LogOut, Eye, EyeOff, ShieldCheck } from '@lucide/vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import FormField from '@/components/ui/FormField.vue'
import { usePaged } from '@/composables/usePaged'
import { useConfirm } from '@/composables/useConfirm'
import { authApi, usersApi } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { ApiError } from '@/lib/http'
import { P, ROLES, ROLE_LABEL } from '@/lib/permissions'
import { initials } from '@/lib/format'
import type { AdminUser, Role } from '@/types/api'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()
const confirm = useConfirm()
const canManage = auth.can(P.usersManage)

const paged = usePaged<AdminUser>((q) => usersApi.list(q))

const columns: Column[] = [
  { key: 'display_name', label: 'Pengguna' },
  { key: 'role', label: 'Role' },
  { key: 'version', label: 'Versi', align: 'center', mobileHidden: true },
  { key: 'active', label: 'Status' },
]

const open = ref(false)
const editing = ref<AdminUser | null>(null)
const form = reactive({
  email: '',
  display_name: '',
  role: 'AUDITOR' as Role,
  active: true,
  password: '',
  reason: '',
})
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const showPw = ref(false)
const mfaOpen = ref(false)
const mfaSecret = ref('')
const mfaUri = ref('')
const mfaCode = ref('')
const recoveryCodes = ref<string[]>([])
const mfaBusy = ref(false)

async function enrollMfa() {
  mfaBusy.value = true
  try {
    const result = await authApi.mfaEnroll()
    mfaSecret.value = result.data.secret; mfaUri.value = result.data.otpauth_uri; mfaCode.value = ''; recoveryCodes.value = []; mfaOpen.value = true
  } catch (e) { toast.apiError(e, 'Gagal memulai MFA') } finally { mfaBusy.value = false }
}

async function confirmMfa() {
  if (!mfaCode.value.trim()) return
  mfaBusy.value = true
  try {
    recoveryCodes.value = (await authApi.mfaConfirm(mfaCode.value.trim())).data.recovery_codes
    toast.success('MFA aktif', 'Simpan recovery code di tempat aman.')
  } catch (e) { toast.apiError(e, 'Kode MFA tidak valid') } finally { mfaBusy.value = false }
}

function openForm(u?: AdminUser) {
  editing.value = u ?? null
  Object.assign(form, {
    email: u?.email ?? '',
    display_name: u?.display_name ?? '',
    role: u?.role ?? 'AUDITOR',
    active: u?.active ?? true,
    password: '',
    reason: '',
  })
  errors.value = {}
  showPw.value = false
  open.value = true
}

function close() {
  form.password = ''
  open.value = false
}

async function save() {
  const e: Record<string, string> = {}
  if (!editing.value && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Email tidak valid.'
  if (!form.display_name.trim()) e.display_name = 'Nama wajib diisi.'
  if (!editing.value && (form.password.length < 15 || form.password.length > 128))
    e.password = 'Password 15–128 karakter.'
  if (!form.reason.trim()) e.reason = 'Alasan wajib diisi.'
  errors.value = e
  if (Object.keys(e).length) return

  const u = editing.value
  const self = u?.id === auth.user?.id
  if (u) {
    const ok = await confirm({
      title: 'Simpan perubahan pengguna?',
      impacts: [
        'Seluruh sesi aktif pengguna ini dicabut.',
        ...(self ? ['Ini akun Anda sendiri — Anda harus masuk ulang setelah menyimpan.'] : []),
        ...(u.active && !form.active
          ? ['Pengguna tidak dapat masuk lagi sampai diaktifkan kembali.']
          : []),
      ],
      tone: u.active && !form.active ? 'danger' : 'warning',
      confirmText: 'Simpan',
    })
    if (!ok) return
  }

  saving.value = true
  try {
    if (u) {
      await usersApi.update(u.id, {
        display_name: form.display_name.trim(),
        role: form.role,
        active: form.active,
        expected_version: u.version,
        reason: form.reason.trim(),
      })
    } else {
      await usersApi.create({
        email: form.email.trim().toLowerCase(),
        display_name: form.display_name.trim(),
        role: form.role,
        active: form.active,
        password: form.password,
        reason: form.reason.trim(),
      })
    }
    close()
    if (self) {
      auth.clear()
      toast.info('Profil diperbarui', 'Silakan masuk kembali.')
      router.replace('/admin/login')
      return
    }
    toast.success(
      u ? 'Pengguna diperbarui' : 'Pengguna dibuat',
      u ? undefined : 'Serahkan password awal melalui saluran aman.',
    )
    paged.load()
  } catch (err) {
    form.password = ''
    if (err instanceof ApiError) {
      if (err.code === 'ADMIN_EMAIL_EXISTS') errors.value = { email: 'Email sudah terdaftar.' }
      else if (err.code === 'LAST_SUPER_ADMIN')
        errors.value = { role: 'Super Admin aktif terakhir tidak boleh diturunkan/dinonaktifkan.' }
      else if (err.status === 422) errors.value = err.fieldErrors
      else if (err.code === 'ADMIN_USER_VERSION_CONFLICT') {
        toast.warning('Data telah berubah', 'Daftar dimuat ulang, silakan ulangi.')
        close()
        paged.load()
        return
      }
    }
    toast.apiError(err, 'Gagal menyimpan pengguna')
  } finally {
    saving.value = false
  }
}

const revoking = ref<string | null>(null)
async function revoke(u: AdminUser) {
  const res = await confirm({
    title: `Cabut semua sesi ${u.display_name}?`,
    impacts: [
      'Pengguna keluar dari semua perangkat.',
      'Pengguna aktif tetap dapat masuk lagi; nonaktifkan untuk memblokir.',
    ],
    confirmText: 'Cabut sesi',
    reason: true,
  })
  if (!res) return
  revoking.value = u.id
  try {
    await usersApi.revokeSessions(u.id, u.version, res.reason)
    if (u.id === auth.user?.id) {
      auth.clear()
      router.replace('/admin/login')
      return
    }
    toast.success('Sesi dicabut')
    paged.load()
  } catch (e) {
    toast.apiError(e, 'Gagal mencabut sesi')
    if (e instanceof ApiError && e.status === 409) paged.load()
  } finally {
    revoking.value = null
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Pengguna Admin"
      subtitle="Operator portal. Bukan akun pembayar Portal Event."
    >
      <template v-if="canManage" #actions>
        <AppButton variant="secondary" :icon="ShieldCheck" :loading="mfaBusy" @click="enrollMfa">MFA saya</AppButton>
        <AppButton :icon="Plus" @click="openForm()">Tambah pengguna</AppButton>
      </template>
    </PageHeader>

    <DataTable
      :columns="columns"
      :paged="paged"
      searchable
      :search-keys="['display_name', 'email', 'role']"
      empty-title="Belum ada pengguna"
    >
      <template #cell-display_name="{ row }">
        <div class="flex items-center gap-3 text-left">
          <div
            class="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-brand-600 text-xs font-bold text-white"
          >
            {{ initials(row.display_name) }}
          </div>
          <div class="min-w-0">
            <p class="truncate font-semibold text-slate-900 dark:text-white">
              {{ row.display_name }}
              <span
                v-if="row.id === auth.user?.id"
                class="ml-1 text-xs font-normal text-brand-600 dark:text-brand-400"
                >(Anda)</span
              >
            </p>
            <p class="truncate text-xs text-slate-500">{{ row.email }}</p>
          </div>
        </div>
      </template>
      <template #cell-role="{ value }">
        <AppBadge
          :tone="
            value === 'SUPER_ADMIN'
              ? 'violet'
              : value === 'FINANCE'
                ? 'success'
                : value === 'AUDITOR'
                  ? 'info'
                  : 'brand'
          "
        >
          {{ ROLE_LABEL[value] ?? value }}
        </AppBadge>
      </template>
      <template #cell-version="{ value }"
        ><span class="font-mono text-xs">v{{ value }}</span></template
      >
      <template #cell-active="{ value }">
        <AppBadge :tone="value ? 'success' : 'neutral'" dot>{{
          value ? 'Aktif' : 'Nonaktif'
        }}</AppBadge>
      </template>
      <template v-if="canManage" #actions="{ row }">
        <AppButton
          size="sm"
          variant="ghost"
          :icon="LogOut"
          :loading="revoking === row.id"
          @click="revoke(row)"
          >Cabut sesi</AppButton
        >
        <AppButton size="sm" variant="soft" :icon="Pencil" @click="openForm(row)">Ubah</AppButton>
      </template>
    </DataTable>

    <AppModal
      :open="open"
      :title="editing ? 'Ubah pengguna' : 'Tambah pengguna'"
      :description="editing?.email"
      :persistent="saving"
      @close="close"
    >
      <form id="user-form" class="space-y-4" autocomplete="off" @submit.prevent="save">
        <FormField v-if="!editing" label="Email" for="u-email" required :error="errors.email">
          <input
            id="u-email"
            v-model="form.email"
            type="email"
            class="input"
            autocomplete="off"
            :aria-invalid="!!errors.email"
          />
        </FormField>
        <FormField label="Nama tampilan" for="u-name" required :error="errors.display_name">
          <input
            id="u-name"
            v-model="form.display_name"
            class="input"
            maxlength="200"
            :aria-invalid="!!errors.display_name"
          />
        </FormField>
        <FormField label="Role" for="u-role" required :error="errors.role">
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="r in ROLES"
              :key="r"
              :class="[
                'flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm transition',
                form.role === r
                  ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/15 dark:bg-brand-500/10'
                  : 'border-slate-200 dark:border-slate-700',
              ]"
            >
              <input
                v-model="form.role"
                type="radio"
                name="role"
                :value="r"
                class="accent-brand-600"
              />
              <span class="font-medium">{{ ROLE_LABEL[r] }}</span>
            </label>
          </div>
        </FormField>
        <FormField
          v-if="!editing"
          label="Password awal"
          for="u-pw"
          required
          :error="errors.password"
          hint="15–128 karakter. Tidak disimpan di browser."
        >
          <div class="relative">
            <input
              id="u-pw"
              v-model="form.password"
              :type="showPw ? 'text' : 'password'"
              class="input pr-11"
              autocomplete="new-password"
              maxlength="128"
              :aria-invalid="!!errors.password"
            />
            <button
              type="button"
              class="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              :aria-label="showPw ? 'Sembunyikan' : 'Tampilkan'"
              @click="showPw = !showPw"
            >
              <EyeOff v-if="showPw" class="size-4" /><Eye v-else class="size-4" />
            </button>
          </div>
        </FormField>
        <div class="rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
          <AppSwitch
            v-model="form.active"
            label="Aktif"
            description="Nonaktif memblokir login berikutnya."
          />
        </div>
        <FormField
          label="Alasan"
          for="u-reason"
          required
          :error="errors.reason"
          hint="Tercatat di audit."
        >
          <textarea
            id="u-reason"
            v-model="form.reason"
            rows="2"
            maxlength="500"
            class="input resize-none"
            :aria-invalid="!!errors.reason"
          />
        </FormField>
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="saving" @click="close">Batal</AppButton>
        <AppButton type="submit" form="user-form" :loading="saving">Simpan</AppButton>
      </template>
    </AppModal>

    <AppModal :open="mfaOpen" title="MFA akun saya" size="sm" @close="mfaOpen = false">
      <div class="space-y-4 text-sm">
        <p v-if="!recoveryCodes.length">Scan URI TOTP berikut pada authenticator, lalu masukkan kode 6 digit.</p>
        <p v-if="!recoveryCodes.length" class="break-all rounded-lg bg-slate-50 p-3 font-mono text-xs dark:bg-slate-800">{{ mfaUri }}</p>
        <p v-if="!recoveryCodes.length" class="rounded-lg bg-amber-50 p-3 font-mono text-xs text-amber-800">Secret: {{ mfaSecret }}</p>
        <FormField v-if="!recoveryCodes.length" label="Kode TOTP" for="mfa-code" required>
          <input id="mfa-code" v-model="mfaCode" class="input font-mono" inputmode="numeric" maxlength="6" autocomplete="one-time-code" />
        </FormField>
        <div v-else class="rounded-lg bg-amber-50 p-3 text-amber-900">
          <p class="mb-2 font-semibold">Recovery code — simpan sekarang, hanya tampil sekali:</p>
          <div class="grid grid-cols-2 gap-1 font-mono text-xs"> <span v-for="code in recoveryCodes" :key="code">{{ code }}</span> </div>
        </div>
      </div>
      <template #footer>
        <AppButton v-if="!recoveryCodes.length" :loading="mfaBusy" @click="confirmMfa">Aktifkan MFA</AppButton>
        <AppButton v-else @click="mfaOpen = false">Selesai</AppButton>
      </template>
    </AppModal>
  </div>
</template>
