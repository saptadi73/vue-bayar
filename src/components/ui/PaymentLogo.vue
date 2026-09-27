<script setup lang="ts">
import { computed } from 'vue'
import { CreditCard } from '@lucide/vue'
import { channelLogo } from '@/lib/paymentLogos'

const props = withDefaults(
  defineProps<{
    code?: string | null
    src?: string
    label?: string
    size?: 'sm' | 'md' | 'lg'
    showLabel?: boolean
  }>(),
  { size: 'md' },
)

const info = computed(() =>
  props.src ? { src: props.src, label: props.label ?? '' } : channelLogo(props.code),
)
const SIZE = { sm: 'h-7 w-12 p-1', md: 'h-9 w-16 p-1.5', lg: 'h-12 w-24 p-2' }
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-2.5">
    <!-- Logos are designed for light backgrounds, so the chip stays white in dark mode. -->
    <span
      :class="[
        SIZE[size],
        'grid shrink-0 place-items-center rounded-lg bg-white ring-1 ring-slate-200 dark:ring-slate-700',
      ]"
    >
      <img
        v-if="info"
        :src="info.src"
        :alt="info.label"
        class="max-h-full max-w-full object-contain"
        loading="lazy"
      />
      <CreditCard v-else class="size-4 text-slate-400" />
    </span>
    <span v-if="showLabel" class="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
      {{ label ?? info?.label ?? code }}
    </span>
  </span>
</template>
