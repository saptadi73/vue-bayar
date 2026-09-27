<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@lucide/vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import SecretModal from '@/components/ui/SecretModal.vue'
import ClientForm from '@/components/admin/ClientForm.vue'
import {
  emptyClientForm,
  toConfig,
  validateClientForm,
  type ClientFormModel,
} from '@/components/admin/clientFormModel'
import { usePaged } from '@/composables/usePaged'
import { clientsApi } from '@/api/admin'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { ApiError } from '@/lib/http'
import { P } from '@/lib/permissions'
import type { Client, ClientCredentials } from '@/types/api'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()
const paged = usePaged<Client>((q) => clientsApi.list(q))

const columns: Column[] = [
  { key: 'name', label: 'Portal' },
  { key: 'scopes', label: 'Scope', mobileHidden: true },
  { key: 'callback_url', label: 'Callback', mobileHidden: true },
  { key: 'version', label: 'Versi', align: 'center' },
  { key: 'active', label: 'Status' },
]

const modal = ref(false)
const form = ref<ClientFormModel>(emptyClientForm())
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const created = ref<ClientCredentials | null>(null)

function openCreate() {
  form.value = emptyClientForm()
  errors.value = {}
  modal.value = true
}

async function submit() {
  errors.value = validateClientForm(form.value, true)
  if (Object.keys(errors.value).length) return
  saving.value = true
  try {
    const res = await clientsApi.create({
      ...toConfig(form.value),
      code: form.value.code.trim(),
      service_code: form.value.service_code.trim(),
    })
    modal.value = false
    created.value = res.data
    toast.success('Client terdaftar', res.data.name)
    paged.reset()
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === 'CLIENT_CODE_EXISTS') errors.value = { code: 'Kode sudah terdaftar.' }
      else if (e.status === 422) errors.value = e.fieldErrors
    }
    toast.apiError(e, 'Gagal mendaftarkan client')
  } finally {
    saving.value = false
  }
}

function closeSecret() {
  const id = created.value?.id
  created.value = null
  if (id) router.push(`/admin/clients/${id}`)
}
</script>

<template>
  <div>
    <PageHeader
      title="Client Portal"
      subtitle="Integrasi backend Portal Event (OAuth client credentials)."
    >
      <template v-if="auth.can(P.clientsManage)" #actions>
        <AppButton :icon="Plus" @click="openCreate">Daftarkan client</AppButton>
      </template>
    </PageHeader>

    <DataTable
      :columns="columns"
      :paged="paged"
      searchable
      :search-keys="['name', 'code', 'callback_url']"
      clickable
      empty-title="Belum ada client"
      empty-message="Daftarkan Portal Event pertama untuk mulai menerima pembayaran."
      @row-click="(r) => router.push(`/admin/clients/${r.id}`)"
    >
      <template #cell-name="{ row }">
        <div class="flex items-center gap-3 text-left">
          <div
            class="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-600 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300"
          >
            {{ row.code.slice(0, 2).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <p class="truncate font-semibold text-slate-900 dark:text-white">{{ row.name }}</p>
            <p class="truncate font-mono text-xs text-slate-500">{{ row.code }}</p>
          </div>
        </div>
      </template>
      <template #cell-scopes="{ row }">
        <div class="flex flex-wrap gap-1">
          <span
            v-for="s in row.scopes"
            :key="s"
            class="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >{{ s }}</span
          >
        </div>
      </template>
      <template #cell-callback_url="{ value }">
        <span class="block max-w-[16rem] truncate font-mono text-xs text-slate-500">{{
          value ?? '—'
        }}</span>
      </template>
      <template #cell-version="{ value }"
        ><span class="font-mono text-xs">v{{ value }}</span></template
      >
      <template #cell-active="{ value }">
        <AppBadge :tone="value ? 'success' : 'neutral'" dot>{{
          value ? 'Aktif' : 'Nonaktif'
        }}</AppBadge>
      </template>
    </DataTable>

    <AppModal
      :open="modal"
      title="Daftarkan client baru"
      description="Secret OAuth dan callback akan ditampilkan sekali setelah berhasil."
      size="lg"
      :persistent="saving"
      @close="modal = false"
    >
      <form id="client-create" @submit.prevent="submit">
        <ClientForm v-model="form" mode="create" :errors="errors" />
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="saving" @click="modal = false">Batal</AppButton>
        <AppButton type="submit" form="client-create" :loading="saving">Daftarkan</AppButton>
      </template>
    </AppModal>

    <SecretModal
      :open="!!created"
      title="Kredensial client baru"
      :items="
        created
          ? [
              { label: 'client_id (OAuth)', value: created.code },
              { label: 'client_secret', value: created.client_secret, secret: true },
              ...(created.callback_secret
                ? [{ label: 'callback_secret', value: created.callback_secret, secret: true }]
                : []),
            ]
          : []
      "
      @close="closeSecret"
    />
  </div>
</template>
