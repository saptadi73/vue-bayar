<script setup lang="ts">
import type { Component } from 'vue'
import type { Tone } from '@/lib/status'

withDefaults(
  defineProps<{
    label: string
    value?: string | number
    hint?: string
    icon?: Component
    tone?: Tone
    loading?: boolean
  }>(),
  { tone: 'brand' },
)

const ICON_TONE: Record<Tone, string> = {
  neutral: 'from-slate-500 to-slate-600 shadow-slate-500/30',
  brand: 'from-brand-500 to-indigo-600 shadow-brand-500/30',
  success: 'from-emerald-500 to-teal-600 shadow-emerald-500/30',
  warning: 'from-amber-400 to-orange-500 shadow-amber-500/30',
  danger: 'from-rose-500 to-pink-600 shadow-rose-500/30',
  info: 'from-sky-500 to-cyan-600 shadow-sky-500/30',
  violet: 'from-violet-500 to-fuchsia-600 shadow-violet-500/30',
}
</script>

<template>
  <div class="surface relative overflow-hidden p-4 sm:p-5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {{ label }}
        </p>
        <div v-if="loading" class="mt-2.5 space-y-2">
          <div class="skeleton h-7 w-3/4" />
          <div class="skeleton h-3 w-1/2" />
        </div>
        <template v-else>
          <p
            class="mt-1.5 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white"
          >
            {{ value ?? '-' }}
          </p>
          <p v-if="hint" class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
            {{ hint }}
          </p>
        </template>
      </div>
      <div
        v-if="icon"
        :class="[
          ICON_TONE[tone],
          'grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg sm:size-11',
        ]"
      >
        <component :is="icon" class="size-5" />
      </div>
    </div>
  </div>
</template>
