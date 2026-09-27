<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Pencil,
  KeyRound,
  Ban,
  Settings2,
  Layers,
  CalendarDays,
  Users,
  Plus,
  ShieldAlert,
  Link2,
  Webhook,
} from '@lucide/vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import FormField from '@/components/ui/FormField.vue'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import StateView from '@/components/ui/StateView.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import SecretModal from '@/components/ui/SecretModal.vue'
import CopyButton from '@/components/ui/CopyButton.vue'
import ClientForm from '@/components/admin/ClientForm.vue'
import {
  clientToForm,
  emptyClientForm,
  toConfig,
  validateClientForm,
  type ClientFormModel,
} from '@/components/admin/clientFormModel'
import { usePaged } from '@/composables/usePaged'
import { useConfirm } from '@/composables/useConfirm'
import { clientsApi, servicesApi } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { ApiError } from '@/lib/http'
import { P } from '@/lib/permissions'
import type { Client, PortalEvent, PortalUser, Service } from '@/types/api'

const route = useRoute()
const auth = useAuthStore()
const toast = useToastStore()
const confirm = useConfirm()
const id = route.params.id as string

const client = ref<Client | null>(null)
const loading = ref(true)
const error = ref<ApiError | null>(null)
const tab = ref('config')

async function load() {
  loading.value = true
  error.value = null
  try {
    client.value = (await clientsApi.get(id)).data
  } catch (e) {
    error.value = e instanceof ApiError ? e : new ApiError(0, {})
  } finally {
    loading.value = false
  }
}
onMounted(load)

const tabs = computed(() => [
  { key: 'config', label: 'Konfigurasi', icon: Settings2 },
  { key: 'services', label: 'Service', icon: Layers, hidden: !auth.can(P.servicesRead) },
  { key: 'events', label: 'Event', icon: CalendarDays, hidden: !auth.can(P.paymentsRead) },
  { key: 'payers', label: 'Pembayar', icon: Users, hidden: !auth.can(P.portalUsersRead) },
])

// Lazy tabs: portal-users access is audited as PII read, so only fetch on demand.
const services = usePaged<Service>((q) => servicesApi.list(id, q), { immediate: false })
const events = usePaged<PortalEvent>((q) => clientsApi.events(id, q), { immediate: false })
const payers = usePaged<PortalUser>((q) => clientsApi.portalUsers(id, q), { immediate: false })
const loaded = new Set<string>()
watch(tab, (t) => {
  if (loaded.has(t)) return
  loaded.add(t)
  if (t === 'services') services.load()
  if (t === 'events') events.load()
  if (t === 'payers') payers.load()
})

function onConflict(e: unknown, title: string) {
  if (e instanceof ApiError && e.status === 409 && e.code.endsWith('VERSION_CONFLICT')) {
    toast.warning('Data telah berubah', 'Data dimuat ulang. Periksa lalu ulangi perubahan.')
    return true
  }
  toast.apiError(e, title)
  return false
}

// ---- Edit client
const editOpen = ref(false)
const editForm = ref<ClientFormModel>(emptyClientForm())
const editErrors = ref<Record<string, string>>({})
const saving = ref(false)

function openEdit() {
  if (!client.value) return
  editForm.value = clientToForm(client.value)
  editErrors.value = {}
  editOpen.value = true
}

async function saveEdit() {
  if (!client.value) return
  editErrors.value = validateClientForm(editForm.value, false)
  if (Object.keys(editErrors.value).length) return
  const next = toConfig(editForm.value)
  const deactivating = client.value.active && !next.active
  const ok = await confirm({
    title: 'Simpan perubahan konfigurasi?',
    impacts: [
      'Version naik dan seluruh JWT client lama dicabut; backend Event harus meminta token baru.',
      ...(deactivating ? ['Client nonaktif menolak token OAuth dan akses checkout.'] : []),
    ],
    tone: deactivating ? 'danger' : 'warning',
    confirmText: 'Simpan',
    typeToConfirm: deactivating ? client.value.code : undefined,
  })
  if (!ok) return
  saving.value = true
  try {
    client.value = (
      await clientsApi.update(id, { ...next, expected_version: client.value.version })
    ).data
    editOpen.value = false
    toast.success('Konfigurasi disimpan')
  } catch (e) {
    if (onConflict(e, 'Gagal menyimpan')) {
      editOpen.value = false
      await load()
    } else if (e instanceof ApiError && e.status === 422) editErrors.value = e.fieldErrors
  } finally {
    saving.value = false
  }
}

// ---- Rotate secret
const rotating = ref(false)
const rotated = ref<string | null>(null)

async function rotate() {
  if (!client.value) return
  const res = await confirm({
    title: 'Rotasi client secret?',
    impacts: [
      'Secret OAuth lama dan JWT yang sudah terbit langsung ditolak.',
      'Backend Event wajib mengganti client_secret sebelum meminta token.',
      'Callback secret tidak berubah; checkout token lama tidak dicabut.',
    ],
    confirmText: 'Rotasi sekarang',
    reason: true,
    typeToConfirm: client.value.code,
  })
  if (!res) return
  rotating.value = true
  try {
    const r = await clientsApi.rotateSecret(id, client.value.version, res.reason)
    const { client_secret, ...rest } = r.data
    client.value = rest
    rotated.value = client_secret
  } catch (e) {
    if (onConflict(e, 'Rotasi gagal')) await load()
  } finally {
    rotating.value = false
  }
}

// ---- Revoke checkouts
const revoking = ref(false)
async function revokeCheckouts() {
  if (!client.value) return
  const res = await confirm({
    title: 'Cabut semua checkout aktif?',
    impacts: [
      'Seluruh link checkout aktif milik client ini tidak dapat digunakan lagi.',
      'Ledger, attempt, dan riwayat pembayaran tidak dihapus.',
      'Pembeli perlu link checkout baru dari backend Event.',
    ],
    confirmText: 'Cabut checkout',
    reason: true,
    typeToConfirm: client.value.code,
  })
  if (!res) return
  revoking.value = true
  try {
    const r = await clientsApi.revokeCheckouts(id, res.reason)
    toast.success('Checkout dicabut', `${r.data.checkout_sessions_revoked} sesi checkout dicabut.`)
  } catch (e) {
    toast.apiError(e, 'Gagal mencabut checkout')
  } finally {
    revoking.value = false
  }
}

// ---- Services CRUD
const svcCols: Column[] = [
  { key: 'code', label: 'Kode' },
  { key: 'name', label: 'Nama' },
  { key: 'version', label: 'Versi', align: 'center', mobileHidden: true },
  { key: 'active', label: 'Status' },
]
const svcOpen = ref(false)
const svcEditing = ref<Service | null>(null)
const svcForm = reactive({ code: '', name: '', active: true, reason: '' })
const svcErrors = ref<Record<string, string>>({})
const svcSaving = ref(false)

function openService(s?: Service) {
  svcEditing.value = s ?? null
  Object.assign(svcForm, {
    code: s?.code ?? '',
    name: s?.name ?? '',
    active: s?.active ?? true,
    reason: '',
  })
  svcErrors.value = {}
  svcOpen.value = true
}

async function saveService() {
  const e: Record<string, string> = {}
  if (!svcEditing.value && !/^[A-Za-z0-9_-]{1,100}$/.test(svcForm.code))
    e.code = 'Huruf, angka, underscore, minus (maks 100).'
  if (!svcForm.name.trim()) e.name = 'Nama wajib diisi.'
  if (!svcForm.reason.trim()) e.reason = 'Alasan wajib diisi.'
  svcErrors.value = e
  if (Object.keys(e).length) return

  const s = svcEditing.value
  if (s && s.active && !svcForm.active) {
    const ok = await confirm({
      title: `Nonaktifkan service ${s.code}?`,
      impacts: [
        'Pembuatan payment BARU dengan service ini ditolak (SERVICE_NOT_FOUND).',
        'Order dan checkout yang sudah ada tidak dibatalkan.',
      ],
      tone: 'warning',
      confirmText: 'Nonaktifkan',
    })
    if (!ok) return
  }

  svcSaving.value = true
  try {
    const body = {
      name: svcForm.name.trim(),
      active: svcForm.active,
      reason: svcForm.reason.trim(),
    }
    if (s) await servicesApi.update(id, s.id, { ...body, expected_version: s.version })
    else await servicesApi.create(id, { ...body, code: svcForm.code.trim() })
    svcOpen.value = false
    toast.success(s ? 'Service diperbarui' : 'Service ditambahkan')
    services.load()
  } catch (err) {
    if (err instanceof ApiError && err.code === 'SERVICE_CODE_EXISTS')
      svcErrors.value = { code: 'Kode sudah dipakai client ini.' }
    else if (err instanceof ApiError && err.status === 422) svcErrors.value = err.fieldErrors
    if (onConflict(err, 'Gagal menyimpan service')) {
      svcOpen.value = false
      services.load()
    }
  } finally {
    svcSaving.value = false
  }
}

const eventCols: Column[] = [
  { key: 'event_id', label: 'Event ID' },
  { key: 'name', label: 'Nama event' },
]
const payerCols: Column[] = [
  { key: 'name', label: 'Nama' },
  { key: 'email', label: 'Email' },
]
</script>

<template>
  <div>
    <PageHeader :title="client?.name ?? 'Detail Client'" back="/admin/clients">
      <template #subtitle>
        <span v-if="client" class="inline-flex flex-wrap items-center gap-2">
          <span class="font-mono text-xs">{{ client.code }}</span>
          <AppBadge :tone="client.active ? 'success' : 'neutral'" dot>{{
            client.active ? 'Aktif' : 'Nonaktif'
          }}</AppBadge>
          <span class="font-mono text-xs text-slate-400">v{{ client.version }}</span>
        </span>
      </template>
      <template v-if="client" #actions>
        <AppButton
          v-if="auth.can(P.clientsManage)"
          variant="secondary"
          :icon="Pencil"
          @click="openEdit"
          >Ubah</AppButton
        >
        <AppButton
          v-if="auth.can(P.clientsRotate)"
          variant="secondary"
          :icon="KeyRound"
          :loading="rotating"
          @click="rotate"
          >Rotasi secret</AppButton
        >
        <AppButton
          v-if="auth.can(P.clientsManage)"
          variant="danger"
          :icon="Ban"
          :loading="revoking"
          @click="revokeCheckouts"
          >Cabut checkout</AppButton
        >
      </template>
    </PageHeader>

    <div v-if="error" class="surface"><StateView :error="error" @retry="load" /></div>

    <div v-else class="space-y-4">
      <AppTabs v-model="tab" :tabs="tabs" />

      <!-- Config -->
      <div v-if="tab === 'config'" class="grid gap-4 lg:grid-cols-2">
        <AppCard title="Identitas & akses">
          <SkeletonBlock v-if="loading" :lines="4" />
          <dl v-else-if="client" class="space-y-4 text-sm">
            <div>
              <dt class="text-xs text-slate-500">UUID internal</dt>
              <dd
                class="flex items-center gap-1 font-mono text-xs text-slate-800 dark:text-slate-200"
              >
                {{ client.id }} <CopyButton :value="client.id" />
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">client_id OAuth (kode)</dt>
              <dd
                class="flex items-center gap-1 font-mono text-xs text-slate-800 dark:text-slate-200"
              >
                {{ client.code }} <CopyButton :value="client.code" />
              </dd>
            </div>
            <div>
              <dt class="mb-1.5 text-xs text-slate-500">Scope</dt>
              <dd class="flex flex-wrap gap-1.5">
                <AppBadge v-for="s in client.scopes" :key="s" tone="brand"
                  ><span class="font-mono">{{ s }}</span></AppBadge
                >
              </dd>
            </div>
            <p class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/50">
              Secret tidak pernah ditampilkan ulang. Gunakan rotasi bila secret hilang.
            </p>
          </dl>
        </AppCard>

        <AppCard title="URL terdaftar">
          <SkeletonBlock v-if="loading" :lines="5" />
          <div v-else-if="client" class="space-y-4 text-sm">
            <div>
              <p class="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                <Link2 class="size-3.5" /> Return URLs
              </p>
              <ul v-if="client.allowed_return_urls.length" class="space-y-1">
                <li
                  v-for="u in client.allowed_return_urls"
                  :key="u"
                  class="truncate rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-xs dark:bg-slate-800/60"
                >
                  {{ u }}
                </li>
              </ul>
              <p v-else class="text-xs text-slate-400">Tidak ada</p>
            </div>
            <div>
              <p class="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                <Webhook class="size-3.5" /> Callback URLs
              </p>
              <ul v-if="client.allowed_callback_urls.length" class="space-y-1">
                <li
                  v-for="u in client.allowed_callback_urls"
                  :key="u"
                  class="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-xs dark:bg-slate-800/60"
                >
                  <span class="min-w-0 flex-1 truncate">{{ u }}</span>
                  <AppBadge v-if="u === client.callback_url" tone="success">aktif</AppBadge>
                </li>
              </ul>
              <p v-else class="text-xs text-slate-400">Tidak ada</p>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- Services -->
      <DataTable
        v-if="tab === 'services'"
        :columns="svcCols"
        :paged="services"
        searchable
        :search-keys="['code', 'name']"
        empty-title="Belum ada service"
      >
        <template v-if="auth.can(P.servicesManage)" #toolbar>
          <AppButton :icon="Plus" @click="openService()">Tambah</AppButton>
        </template>
        <template #cell-code="{ value }"
          ><span class="font-mono text-xs font-semibold">{{ value }}</span></template
        >
        <template #cell-version="{ value }"
          ><span class="font-mono text-xs">v{{ value }}</span></template
        >
        <template #cell-active="{ value }">
          <AppBadge :tone="value ? 'success' : 'neutral'" dot>{{
            value ? 'Aktif' : 'Nonaktif'
          }}</AppBadge>
        </template>
        <template v-if="auth.can(P.servicesManage)" #actions="{ row }">
          <AppButton size="sm" variant="ghost" :icon="Pencil" @click="openService(row)"
            >Ubah</AppButton
          >
        </template>
      </DataTable>

      <!-- Events -->
      <DataTable
        v-if="tab === 'events'"
        :columns="eventCols"
        :paged="events"
        searchable
        empty-title="Belum ada event"
        empty-message="Event dibuat otomatis saat backend Portal membuat payment pertama."
      >
        <template #cell-event_id="{ value }"
          ><span class="font-mono text-xs font-semibold">{{ value }}</span></template
        >
      </DataTable>

      <!-- Payers (PII) -->
      <template v-if="tab === 'payers'">
        <div
          class="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200/60 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20"
        >
          <ShieldAlert class="mt-0.5 size-4 shrink-0" />
          <p>
            Data pribadi pembayar. Setiap pemuatan halaman ini tercatat di audit (<span
              class="font-mono"
              >PORTAL_USERS_VIEWED</span
            >). Jangan menyalin ke luar sistem.
          </p>
        </div>
        <DataTable
          :columns="payerCols"
          :paged="payers"
          searchable
          empty-title="Belum ada pembayar"
        />
      </template>
    </div>

    <!-- Edit client modal -->
    <AppModal
      :open="editOpen"
      title="Ubah konfigurasi client"
      size="lg"
      :persistent="saving"
      @close="editOpen = false"
    >
      <form id="client-edit" @submit.prevent="saveEdit">
        <ClientForm v-model="editForm" mode="edit" :errors="editErrors" />
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="saving" @click="editOpen = false"
          >Batal</AppButton
        >
        <AppButton type="submit" form="client-edit" :loading="saving">Simpan</AppButton>
      </template>
    </AppModal>

    <!-- Service modal -->
    <AppModal
      :open="svcOpen"
      :title="svcEditing ? `Ubah service ${svcEditing.code}` : 'Tambah service'"
      size="sm"
      :persistent="svcSaving"
      @close="svcOpen = false"
    >
      <form id="svc-form" class="space-y-4" @submit.prevent="saveService">
        <FormField
          v-if="!svcEditing"
          label="Kode"
          for="s-code"
          required
          :error="svcErrors.code"
          hint="Dipakai sebagai service_code. Tidak dapat diubah."
        >
          <input
            id="s-code"
            v-model="svcForm.code"
            class="input font-mono"
            maxlength="100"
            placeholder="TICKET"
            :aria-invalid="!!svcErrors.code"
          />
        </FormField>
        <FormField label="Nama" for="s-name" required :error="svcErrors.name">
          <input
            id="s-name"
            v-model="svcForm.name"
            class="input"
            maxlength="250"
            :aria-invalid="!!svcErrors.name"
          />
        </FormField>
        <div class="rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
          <AppSwitch
            v-model="svcForm.active"
            label="Aktif"
            description="Nonaktif menolak order baru."
          />
        </div>
        <FormField label="Alasan" for="s-reason" required :error="svcErrors.reason">
          <textarea
            id="s-reason"
            v-model="svcForm.reason"
            rows="2"
            maxlength="500"
            class="input resize-none"
            :aria-invalid="!!svcErrors.reason"
          />
        </FormField>
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="svcSaving" @click="svcOpen = false"
          >Batal</AppButton
        >
        <AppButton type="submit" form="svc-form" :loading="svcSaving">Simpan</AppButton>
      </template>
    </AppModal>

    <SecretModal
      :open="!!rotated"
      title="Client secret baru"
      :items="
        rotated
          ? [
              { label: 'client_id (OAuth)', value: client?.code ?? '' },
              { label: 'client_secret', value: rotated, secret: true },
            ]
          : []
      "
      @close="rotated = null"
    />
  </div>
</template>
