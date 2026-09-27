import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ApiError } from '@/lib/http'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  type: ToastType
  title: string
  message?: string
  requestId?: string
  duration: number
}

let seq = 0

export const useToastStore = defineStore('toast', () => {
  const items = ref<Toast[]>([])

  function push(type: ToastType, title: string, message?: string, extra: Partial<Toast> = {}) {
    const toast: Toast = {
      id: ++seq,
      type,
      title,
      message,
      duration: type === 'error' ? 7000 : 4000,
      ...extra,
    }
    items.value = [toast, ...items.value].slice(0, 5)
    if (toast.duration > 0) setTimeout(() => dismiss(toast.id), toast.duration)
    return toast.id
  }

  const dismiss = (id: number) => (items.value = items.value.filter((t) => t.id !== id))

  return {
    items,
    dismiss,
    success: (title: string, message?: string) => push('success', title, message),
    info: (title: string, message?: string) => push('info', title, message),
    warning: (title: string, message?: string) => push('warning', title, message),
    error: (title: string, message?: string) => push('error', title, message),
    /** Shows a safe API error message with request_id for tracing. */
    apiError(err: unknown, title = 'Permintaan gagal') {
      if (err instanceof ApiError) {
        if (err.status === 401) return
        return push('error', title, err.message, { requestId: err.requestId })
      }
      return push('error', title, 'Terjadi kesalahan tak terduga.')
    },
  }
})
