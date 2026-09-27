<script setup lang="ts">
import { computed, watch } from 'vue'
import FormField from '@/components/ui/FormField.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import { splitLines } from '@/lib/format'
import type { Scope } from '@/types/api'
import type { ClientFormModel } from './clientFormModel'

defineProps<{ mode: 'create' | 'edit'; errors: Record<string, string> }>()
const model = defineModel<ClientFormModel>({ required: true })

const SCOPES: { value: Scope; label: string; hint: string }[] = [
  { value: 'payments:read', label: 'payments:read', hint: 'Membaca payment milik client' },
  { value: 'payments:write', label: 'payments:write', hint: 'Membuat, renew checkout, cancel' },
  {
    value: 'payments:refund',
    label: 'payments:refund',
    hint: 'Mengajukan refund dari backend Event',
  },
]

const callbackOptions = computed(() => splitLines(model.value.callbackUrls))
watch(callbackOptions, (opts) => {
  if (model.value.callback_url && !opts.includes(model.value.callback_url))
    model.value.callback_url = ''
})

function toggleScope(s: Scope) {
  const set = new Set(model.value.scopes)
  if (set.has(s)) set.delete(s)
  else set.add(s)
  model.value.scopes = [...set]
}
</script>

<template>
  <div class="space-y-5">
    <div v-if="mode === 'create'" class="grid gap-4 sm:grid-cols-2">
      <FormField
        label="Kode client"
        for="c-code"
        required
        :error="errors.code"
        hint="Menjadi client_id OAuth. Tidak dapat diubah."
      >
        <input
          id="c-code"
          v-model="model.code"
          class="input font-mono"
          :aria-invalid="!!errors.code"
          placeholder="EVENT-CLIENT"
          pattern="[A-Za-z0-9_\-]+"
          maxlength="50"
          autocomplete="off"
        />
      </FormField>
      <FormField
        label="Kode service awal"
        for="c-svc"
        required
        :error="errors.service_code"
        hint="Contoh: EVENT, TICKET"
      >
        <input
          id="c-svc"
          v-model="model.service_code"
          class="input font-mono"
          :aria-invalid="!!errors.service_code"
          placeholder="EVENT"
          pattern="[A-Za-z0-9_\-]+"
          maxlength="100"
          autocomplete="off"
        />
      </FormField>
    </div>

    <FormField label="Nama Portal" for="c-name" required :error="errors.name">
      <input
        id="c-name"
        v-model="model.name"
        class="input"
        :aria-invalid="!!errors.name"
        placeholder="Portal Event"
        maxlength="200"
      />
    </FormField>

    <div class="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <AppSwitch
        v-model="model.active"
        label="Client aktif"
        description="Nonaktif menolak token OAuth dan akses checkout client ini."
      />
    </div>

    <fieldset>
      <legend class="label">Scope yang diizinkan</legend>
      <div class="grid gap-2 sm:grid-cols-3">
        <label
          v-for="s in SCOPES"
          :key="s.value"
          :class="[
            'flex cursor-pointer flex-col rounded-xl border p-3 transition',
            model.scopes.includes(s.value)
              ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/15 dark:bg-brand-500/10'
              : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
          ]"
        >
          <span class="flex items-center gap-2">
            <input
              type="checkbox"
              class="size-4 accent-brand-600"
              :checked="model.scopes.includes(s.value)"
              @change="toggleScope(s.value)"
            />
            <span class="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">{{
              s.label
            }}</span>
          </span>
          <span class="mt-1 text-xs text-slate-500">{{ s.hint }}</span>
        </label>
      </div>
      <p v-if="errors.scopes" class="mt-1.5 text-xs font-medium text-rose-600">
        {{ errors.scopes }}
      </p>
    </fieldset>

    <FormField
      label="Allowed return URLs"
      for="c-ret"
      :error="errors.allowed_return_urls"
      hint="Satu URL per baris, cocok persis (tanpa wildcard). HTTPS; HTTP hanya loopback development."
    >
      <textarea
        id="c-ret"
        v-model="model.returnUrls"
        rows="3"
        class="input font-mono text-xs"
        :aria-invalid="!!errors.allowed_return_urls"
        placeholder="https://event.example.com/payment/result"
      />
    </FormField>

    <FormField
      label="Allowed callback URLs"
      for="c-cb"
      :error="errors.allowed_callback_urls"
      hint="URL server-to-server penerima callback status, bukan redirect browser."
    >
      <textarea
        id="c-cb"
        v-model="model.callbackUrls"
        rows="3"
        class="input font-mono text-xs"
        :aria-invalid="!!errors.allowed_callback_urls"
        placeholder="https://event.example.com/api/payment/callback"
      />
    </FormField>

    <FormField
      label="Callback URL aktif"
      for="c-cbu"
      :error="errors.callback_url"
      hint="Harus salah satu dari allowed callback URLs."
    >
      <select id="c-cbu" v-model="model.callback_url" class="input font-mono text-xs">
        <option value="">— Tidak ada callback —</option>
        <option v-for="u in callbackOptions" :key="u" :value="u">{{ u }}</option>
      </select>
    </FormField>

    <FormField
      label="Alasan perubahan"
      for="c-reason"
      required
      :error="errors.reason"
      hint="Tercatat di audit. Jangan menulis secret/PII."
    >
      <textarea
        id="c-reason"
        v-model="model.reason"
        rows="2"
        maxlength="500"
        class="input resize-none"
        :aria-invalid="!!errors.reason"
      />
    </FormField>
  </div>
</template>
