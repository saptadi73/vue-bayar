<script setup lang="ts">
defineProps<{ label?: string; description?: string; disabled?: boolean }>()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label
    :class="[
      'flex items-start justify-between gap-4',
      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
    ]"
  >
    <span v-if="label" class="min-w-0">
      <span class="block text-sm font-medium text-slate-800 dark:text-slate-200">{{ label }}</span>
      <span v-if="description" class="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{{
        description
      }}</span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="model"
      :aria-label="label"
      :disabled="disabled"
      :class="[
        'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
        model ? 'bg-brand-600 dark:bg-brand-500' : 'bg-slate-300 dark:bg-slate-700',
      ]"
      @click="model = !model"
    >
      <span
        :class="[
          'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform',
          model && 'translate-x-5',
        ]"
      />
    </button>
  </label>
</template>
