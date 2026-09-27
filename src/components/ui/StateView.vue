<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Inbox, Lock, ServerCrash, SearchX, WifiOff, RotateCw } from '@lucide/vue'
import AppButton from './AppButton.vue'
import type { ApiError } from '@/lib/http'

const props = defineProps<{
  type?: 'empty' | 'error' | 'forbidden' | 'notfound'
  error?: ApiError | null
  title?: string
  message?: string
  icon?: Component
  compact?: boolean
}>()
defineEmits<{ retry: [] }>()

const kind = computed(() => {
  if (props.type) return props.type
  const s = props.error?.status
  if (s === 403) return 'forbidden'
  if (s === 404) return 'notfound'
  return 'error'
})

const view = computed(() => {
  const e = props.error
  const base = {
    empty: {
      icon: Inbox,
      title: 'Belum ada data',
      message: 'Data akan muncul di sini setelah tersedia.',
      tone: 'slate',
    },
    forbidden: {
      icon: Lock,
      title: 'Akses ditolak',
      message: 'Akun Anda tidak memiliki izin untuk melihat bagian ini.',
      tone: 'amber',
    },
    notfound: {
      icon: SearchX,
      title: 'Tidak ditemukan',
      message: 'Resource tidak tersedia atau sudah dihapus.',
      tone: 'slate',
    },
    error: {
      icon: e?.status === 0 ? WifiOff : ServerCrash,
      title: e?.status === 0 ? 'Koneksi terputus' : 'Terjadi kesalahan',
      message: e?.message ?? 'Gagal memuat data.',
      tone: 'rose',
    },
  }[kind.value]
  return {
    ...base,
    icon: props.icon ?? base.icon,
    title: props.title ?? base.title,
    message:
      props.message ?? (kind.value === 'error' ? base.message : (e?.message ?? base.message)),
  }
})

const TONE: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
}
</script>

<template>
  <div
    :class="[
      compact ? 'py-8' : 'py-14',
      'flex animate-fade-in flex-col items-center justify-center px-6 text-center',
    ]"
    role="status"
  >
    <div :class="[TONE[view.tone], 'relative mb-4 grid size-14 place-items-center rounded-2xl']">
      <div
        :class="[TONE[view.tone], 'absolute inset-0 -z-0 scale-125 rounded-3xl opacity-40 blur-md']"
      />
      <component :is="view.icon" class="relative size-6" />
    </div>
    <h3 class="text-sm font-semibold text-slate-900 dark:text-white">{{ view.title }}</h3>
    <p class="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{{ view.message }}</p>
    <p
      v-if="error?.requestId && kind === 'error'"
      class="mt-2 font-mono text-[11px] text-slate-400"
    >
      request_id: {{ error.requestId }}
    </p>
    <div class="mt-4 flex gap-2">
      <slot name="action">
        <AppButton
          v-if="kind === 'error'"
          variant="secondary"
          size="sm"
          :icon="RotateCw"
          @click="$emit('retry')"
        >
          Coba lagi
        </AppButton>
      </slot>
    </div>
  </div>
</template>
