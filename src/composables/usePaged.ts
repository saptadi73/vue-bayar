import { computed, ref, shallowRef, watch, type Ref } from 'vue'
import { ApiError } from '@/lib/http'
import type { Page } from '@/types/api'

interface Options<F> {
  pageSize?: number
  filters?: Ref<F>
  immediate?: boolean
}

/**
 * Offset pagination driven by backend `has_more`, with optional `total_count`.
 * Search is sent to the backend when the page API exposes a search filter.
 */
export function usePaged<T, F = unknown>(
  fetcher: (q: { limit: number; offset: number } & F) => Promise<Page<T>>,
  opts: Options<F> = {},
) {
  const rows = shallowRef<T[]>([])
  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  const limit = ref(opts.pageSize ?? 20)
  const offset = ref(0)
  const hasMore = ref(false)
  const totalCount = ref<number | undefined>(undefined)
  const page = computed(() => Math.floor(offset.value / limit.value) + 1)
  let seq = 0

  async function load() {
    const id = ++seq
    loading.value = true
    error.value = null
    try {
      const res = await fetcher({
        limit: limit.value,
        offset: offset.value,
        ...(opts.filters?.value as F),
      })
      if (id !== seq) return
      rows.value = res.data
      hasMore.value = res.meta.has_more ?? res.data.length === limit.value
      totalCount.value = res.meta.total_count
    } catch (e) {
      if (id !== seq) return
      error.value = e instanceof ApiError ? e : new ApiError(0, { message: 'Gagal memuat data' })
      rows.value = []
    } finally {
      if (id === seq) loading.value = false
    }
  }

  const go = (p: number) => {
    offset.value = Math.max(0, (p - 1) * limit.value)
    load()
  }
  const next = () => hasMore.value && go(page.value + 1)
  const prev = () => page.value > 1 && go(page.value - 1)
  const setLimit = (n: number) => {
    limit.value = n
    go(1)
  }
  const reset = () => go(1)

  if (opts.filters) watch(opts.filters, reset, { deep: true })
  if (opts.immediate !== false) load()

  return {
    rows,
    loading,
    error,
    limit,
    offset,
    page,
    hasMore,
    totalCount,
    load,
    go,
    next,
    prev,
    setLimit,
    reset,
  }
}

export type PagedState<T> = ReturnType<typeof usePaged<T>>
