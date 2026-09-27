<script setup lang="ts">
import { ref } from 'vue'
import { Copy, Check } from '@lucide/vue'

const props = defineProps<{ value: string; label?: string }>()
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    :aria-label="label ?? 'Salin'"
    @click.stop="copy"
  >
    <Check v-if="copied" class="size-3.5 text-emerald-500" />
    <Copy v-else class="size-3.5" />
    <span v-if="label">{{ copied ? 'Tersalin' : label }}</span>
  </button>
</template>
