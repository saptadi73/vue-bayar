<script setup lang="ts">
defineProps<{ title?: string; subtitle?: string; padded?: boolean }>()
</script>

<template>
  <section class="surface">
    <header
      v-if="title || $slots.header || $slots.actions"
      class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5 dark:border-slate-800"
    >
      <slot name="header">
        <div class="min-w-0">
          <h2 class="truncate text-sm font-semibold text-slate-900 dark:text-white">{{ title }}</h2>
          <p v-if="subtitle" class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {{ subtitle }}
          </p>
        </div>
      </slot>
      <div v-if="$slots.actions" class="flex items-center gap-2"><slot name="actions" /></div>
    </header>
    <div :class="padded !== false && 'p-4 sm:p-5'"><slot /></div>
    <footer
      v-if="$slots.footer"
      class="border-t border-slate-100 px-4 py-3 sm:px-5 dark:border-slate-800"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>
