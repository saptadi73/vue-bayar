<script setup lang="ts">
import { CircleCheck, CircleAlert, TriangleAlert, Info, X } from '@lucide/vue'
import { useToastStore, type ToastType } from '@/stores/toast'

const toast = useToastStore()

const ICON = { success: CircleCheck, error: CircleAlert, warning: TriangleAlert, info: Info }
const CLS: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-rose-500',
  warning: 'text-amber-500',
  info: 'text-sky-500',
}
const BAR: Record<ToastType, string> = {
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
}
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-end sm:p-5"
    aria-live="polite"
  >
    <TransitionGroup
      enter-active-class="animate-toast-in"
      leave-active-class="transition duration-200"
      leave-to-class="opacity-0 translate-x-4"
      move-class="transition duration-300"
    >
      <div
        v-for="t in toast.items"
        :key="t.id"
        role="alert"
        class="pointer-events-auto relative flex w-full max-w-sm overflow-hidden rounded-2xl bg-white/95 shadow-xl ring-1 shadow-slate-900/10 ring-slate-900/5 backdrop-blur dark:bg-slate-900/95 dark:ring-white/10"
      >
        <div :class="[BAR[t.type], 'w-1 shrink-0']" />
        <div class="flex flex-1 gap-3 p-3.5">
          <component :is="ICON[t.type]" :class="[CLS[t.type], 'mt-0.5 size-5 shrink-0']" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ t.title }}</p>
            <p
              v-if="t.message"
              class="mt-0.5 text-sm break-words text-slate-500 dark:text-slate-400"
            >
              {{ t.message }}
            </p>
            <p v-if="t.requestId" class="mt-1 font-mono text-[11px] text-slate-400">
              request_id: {{ t.requestId }}
            </p>
          </div>
          <button
            type="button"
            class="-m-1 grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Tutup notifikasi"
            @click="toast.dismiss(t.id)"
          >
            <X class="size-4" />
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>
