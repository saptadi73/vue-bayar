<script setup lang="ts">
defineProps<{ label?: string; for?: string; error?: string; hint?: string; required?: boolean }>()
</script>

<template>
  <div>
    <label v-if="label" class="label" :for="$props.for">
      {{ label }}<span v-if="required" class="text-rose-500"> *</span>
    </label>
    <slot />
    <p v-if="error" class="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
      {{ error }}
    </p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{{ hint }}</p>
  </div>
</template>
