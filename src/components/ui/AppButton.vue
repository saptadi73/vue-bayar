<script setup lang="ts">
import { computed, type Component } from 'vue'
import { LoaderCircle } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
    size?: 'sm' | 'md' | 'lg' | 'icon'
    type?: 'button' | 'submit'
    loading?: boolean
    disabled?: boolean
    icon?: Component
    block?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
)

const cls = computed(() => [
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-55',
  {
    primary:
      'bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400',
    secondary:
      'border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    danger: 'bg-rose-600 text-white shadow-sm shadow-rose-600/25 hover:bg-rose-500',
    soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20',
  }[props.variant],
  {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-5 text-base',
    icon: 'size-10',
  }[props.size],
  props.block && 'w-full',
])
</script>

<template>
  <button
    :type="type"
    :class="cls"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <LoaderCircle v-if="loading" class="size-4 animate-spin" />
    <component :is="icon" v-else-if="icon" class="size-4 shrink-0" />
    <slot />
  </button>
</template>
