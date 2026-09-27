<script setup lang="ts">
import { Sun, Moon, Monitor } from '@lucide/vue'
import { useThemeStore, type ThemeMode } from '@/stores/theme'

defineProps<{ compact?: boolean }>()
const theme = useThemeStore()
const OPTIONS: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
  { mode: 'light', icon: Sun, label: 'Terang' },
  { mode: 'dark', icon: Moon, label: 'Gelap' },
  { mode: 'system', icon: Monitor, label: 'Sistem' },
]
</script>

<template>
  <button
    v-if="compact"
    type="button"
    class="grid size-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
    :aria-label="theme.isDark ? 'Mode terang' : 'Mode gelap'"
    @click="theme.toggle()"
  >
    <Transition
      mode="out-in"
      enter-active-class="transition duration-200"
      enter-from-class="rotate-90 opacity-0"
    >
      <Moon v-if="theme.isDark" class="size-5" />
      <Sun v-else class="size-5" />
    </Transition>
  </button>
  <div
    v-else
    class="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
    role="radiogroup"
    aria-label="Tema"
  >
    <button
      v-for="o in OPTIONS"
      :key="o.mode"
      type="button"
      role="radio"
      :aria-checked="theme.mode === o.mode"
      :title="o.label"
      :class="[
        'grid h-8 flex-1 place-items-center rounded-lg px-2.5 transition',
        theme.mode === o.mode
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
      ]"
      @click="theme.set(o.mode)"
    >
      <component :is="o.icon" class="size-4" />
    </button>
  </div>
</template>
