<script setup lang="ts">
import { ref, watch } from 'vue'
import { KeyRound, TriangleAlert, Eye, EyeOff } from '@lucide/vue'
import AppModal from './AppModal.vue'
import AppButton from './AppButton.vue'
import CopyButton from './CopyButton.vue'

const props = defineProps<{
  open: boolean
  title: string
  items: { label: string; value: string; secret?: boolean }[]
}>()
defineEmits<{ close: [] }>()

const ack = ref(false)
const visible = ref<Record<number, boolean>>({})
watch(
  () => props.open,
  () => {
    ack.value = false
    visible.value = {}
  },
)
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    persistent
    size="md"
    description="Kredensial hanya ditampilkan sekali dan tidak dapat dibaca ulang."
  >
    <template #icon>
      <div
        class="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
      >
        <KeyRound class="size-5" />
      </div>
    </template>
    <div class="space-y-4">
      <div
        class="flex gap-3 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0" />
        <p>
          Salin dan simpan ke secret store backend Portal Event. Jangan simpan di browser, chat,
          atau repository. Setelah ditutup, nilai ini dihapus dari aplikasi.
        </p>
      </div>
      <div v-for="(it, i) in items" :key="it.label">
        <p class="label">{{ it.label }}</p>
        <div
          class="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 pl-3 dark:border-slate-700 dark:bg-slate-800/60"
        >
          <code
            class="min-w-0 flex-1 truncate font-mono text-xs text-slate-800 dark:text-slate-200"
          >
            {{ it.secret && !visible[i] ? '•'.repeat(32) : it.value }}
          </code>
          <button
            v-if="it.secret"
            type="button"
            class="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700"
            :aria-label="visible[i] ? 'Sembunyikan' : 'Tampilkan'"
            @click="visible[i] = !visible[i]"
          >
            <EyeOff v-if="visible[i]" class="size-4" />
            <Eye v-else class="size-4" />
          </button>
          <CopyButton :value="it.value" label="Salin" />
        </div>
      </div>
      <label
        class="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
      >
        <input v-model="ack" type="checkbox" class="mt-0.5 size-4 rounded accent-brand-600" />
        Saya sudah menyimpan kredensial ini di tempat yang aman.
      </label>
    </div>
    <template #footer>
      <AppButton :disabled="!ack" @click="$emit('close')">Selesai &amp; hapus dari layar</AppButton>
    </template>
  </AppModal>
</template>
