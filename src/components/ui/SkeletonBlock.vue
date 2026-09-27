<script setup lang="ts">
withDefaults(defineProps<{ lines?: number; avatar?: boolean }>(), { lines: 3 })
</script>

<template>
  <div class="flex animate-fade-in gap-3" aria-hidden="true">
    <div v-if="avatar" class="skeleton size-10 shrink-0 rounded-full" />
    <div class="flex-1 space-y-2.5">
      <div
        v-for="i in lines"
        :key="i"
        class="skeleton h-3.5"
        :style="{ width: i === lines ? '55%' : i % 2 ? '100%' : '85%' }"
      />
    </div>
  </div>
</template>
