<script setup lang="ts">
import { computed } from 'vue'
import { toneOf, labelOf, type Tone } from '@/lib/status'

const props = defineProps<{ tone?: Tone; status?: string | null; dot?: boolean }>()

const t = computed<Tone>(() => props.tone ?? toneOf(props.status))
const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-slate-800 dark:text-slate-300',
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/15 dark:bg-brand-500/10 dark:text-brand-300',
  success:
    'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-300',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-300',
  violet:
    'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/10 dark:text-violet-300',
}
</script>

<template>
  <span
    :class="[
      TONES[t],
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap',
    ]"
  >
    <span v-if="dot || status" class="size-1.5 rounded-full bg-current" />
    <slot>{{ labelOf(status) }}</slot>
  </span>
</template>
