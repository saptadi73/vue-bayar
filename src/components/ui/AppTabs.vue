<script setup lang="ts">
import type { Component } from 'vue'

export interface TabItem {
  key: string
  label: string
  icon?: Component
  hidden?: boolean
}

defineProps<{ tabs: TabItem[] }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
    <div
      class="inline-flex min-w-full gap-1 rounded-xl bg-slate-100 p-1 sm:min-w-0 dark:bg-slate-800/70"
      role="tablist"
    >
      <button
        v-for="t in tabs.filter((t) => !t.hidden)"
        :key="t.key"
        type="button"
        role="tab"
        :aria-selected="model === t.key"
        :class="[
          'inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap transition sm:flex-none',
          model === t.key
            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
        ]"
        @click="model = t.key"
      >
        <component :is="t.icon" v-if="t.icon" class="size-4" />
        {{ t.label }}
      </button>
    </div>
  </div>
</template>
