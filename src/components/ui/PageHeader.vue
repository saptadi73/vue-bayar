<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'

defineProps<{ title: string; subtitle?: string; back?: string }>()
</script>

<template>
  <div class="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex min-w-0 items-start gap-3">
      <RouterLink
        v-if="back"
        :to="back"
        class="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-white dark:border-slate-800 dark:hover:bg-slate-900"
        aria-label="Kembali"
      >
        <ArrowLeft class="size-4" />
      </RouterLink>
      <div class="min-w-0">
        <h1
          class="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white"
        >
          <slot name="title">{{ title }}</slot>
        </h1>
        <p
          v-if="subtitle || $slots.subtitle"
          class="mt-1 text-sm text-slate-500 dark:text-slate-400"
        >
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
