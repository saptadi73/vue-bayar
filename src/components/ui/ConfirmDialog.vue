<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { TriangleAlert, ShieldAlert, Info } from '@lucide/vue'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import { confirmState, settleConfirm } from '@/composables/useConfirm'

const reason = ref('')
const typed = ref('')

watch(
  () => confirmState.open,
  (v) => {
    if (v) {
      reason.value = ''
      typed.value = ''
    }
  },
)

const reasonCfg = computed(() => {
  const r = confirmState.reason
  if (!r) return null
  return {
    label: 'Alasan perubahan',
    placeholder: 'Tuliskan alasan (tercatat di audit)',
    required: true,
    ...(r === true ? {} : r),
  }
})

const valid = computed(
  () =>
    (!reasonCfg.value?.required || reason.value.trim().length > 0) &&
    (!confirmState.typeToConfirm || typed.value === confirmState.typeToConfirm),
)

const tone = computed(() => confirmState.tone ?? 'danger')
const ICON = { danger: ShieldAlert, warning: TriangleAlert, brand: Info }
const ICON_CLS = {
  danger: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  brand: 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400',
}

function submit() {
  if (valid.value) settleConfirm({ reason: reason.value.trim() })
}
</script>

<template>
  <AppModal
    :open="confirmState.open"
    :title="confirmState.title"
    size="sm"
    @close="settleConfirm(null)"
  >
    <template #icon>
      <div :class="[ICON_CLS[tone], 'grid size-10 shrink-0 place-items-center rounded-xl']">
        <component :is="ICON[tone]" class="size-5" />
      </div>
    </template>
    <form id="confirm-form" class="space-y-4" @submit.prevent="submit">
      <p v-if="confirmState.message" class="text-sm text-slate-600 dark:text-slate-300">
        {{ confirmState.message }}
      </p>
      <ul
        v-if="confirmState.impacts?.length"
        class="space-y-1.5 rounded-xl bg-slate-50 p-3.5 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
      >
        <li v-for="(i, idx) in confirmState.impacts" :key="idx" class="flex gap-2">
          <span class="mt-2 size-1.5 shrink-0 rounded-full bg-slate-400" />{{ i }}
        </li>
      </ul>
      <div v-if="reasonCfg">
        <label class="label" for="confirm-reason">{{ reasonCfg.label }}</label>
        <textarea
          id="confirm-reason"
          v-model="reason"
          rows="3"
          maxlength="500"
          class="input resize-none"
          :placeholder="reasonCfg.placeholder"
        />
        <p class="mt-1 text-xs text-slate-400">
          Jangan menulis password, secret, atau data pribadi.
        </p>
      </div>
      <div v-if="confirmState.typeToConfirm">
        <label class="label" for="confirm-typed">
          Ketik
          <span class="font-mono font-bold text-rose-600 dark:text-rose-400">{{
            confirmState.typeToConfirm
          }}</span>
          untuk konfirmasi
        </label>
        <input
          id="confirm-typed"
          v-model="typed"
          class="input font-mono"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
    </form>
    <template #footer>
      <AppButton variant="secondary" @click="settleConfirm(null)">{{
        confirmState.cancelText ?? 'Batal'
      }}</AppButton>
      <AppButton
        type="submit"
        form="confirm-form"
        :variant="tone === 'danger' ? 'danger' : 'primary'"
        :disabled="!valid"
      >
        {{ confirmState.confirmText ?? 'Konfirmasi' }}
      </AppButton>
    </template>
  </AppModal>
</template>
