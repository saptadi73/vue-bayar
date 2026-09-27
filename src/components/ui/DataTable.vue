<script setup lang="ts" generic="T extends Record<string, any>">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, Search, X, RotateCw } from '@lucide/vue'
import StateView from './StateView.vue'
import type { ApiError } from '@/lib/http'
import type { PagedState } from '@/composables/usePaged'

export interface Column {
  key: string
  label: string
  class?: string
  align?: 'left' | 'right' | 'center'
  /** Hidden in mobile card view. */
  mobileHidden?: boolean
}

const props = withDefaults(
  defineProps<{
    columns: Column[]
    paged?: PagedState<T>
    rows?: T[]
    loading?: boolean
    error?: ApiError | null
    rowKey?: string
    searchable?: boolean
    searchKeys?: string[]
    searchPlaceholder?: string
    emptyTitle?: string
    emptyMessage?: string
    clickable?: boolean
    pageSizes?: number[]
  }>(),
  { rowKey: 'id', pageSizes: () => [10, 20, 50, 100] },
)
const emit = defineEmits<{ rowClick: [row: T] }>()
defineSlots<
  {
    [K in `cell-${string}`]?: (p: { row: T; value: any }) => any
  } & {
    toolbar?: () => any
    filters?: () => any
    actions?: (p: { row: T }) => any
    empty?: () => any
  }
>()

const q = ref('')
const source = computed<T[]>(() => props.paged?.rows.value ?? props.rows ?? [])
const isLoading = computed(() => props.paged?.loading.value ?? props.loading ?? false)
const err = computed(() => props.paged?.error.value ?? props.error ?? null)

const view = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return source.value
  const keys = props.searchKeys ?? props.columns.map((c) => c.key)
  return source.value.filter((r) =>
    keys.some((k) =>
      String(r[k] ?? '')
        .toLowerCase()
        .includes(term),
    ),
  )
})

const alignCls = (a?: string) =>
  a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'
const skeletonRows = computed(() => Math.min(props.paged?.limit.value ?? 6, 8))
</script>

<template>
  <div class="surface overflow-hidden">
    <!-- Toolbar -->
    <div
      v-if="searchable || $slots.toolbar || $slots.filters"
      class="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:p-4 dark:border-slate-800"
    >
      <div v-if="searchable" class="relative flex-1 sm:max-w-xs">
        <Search
          class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
        />
        <input
          v-model="q"
          type="search"
          class="input pr-9 pl-9"
          :placeholder="searchPlaceholder ?? (paged ? 'Cari di halaman ini…' : 'Cari…')"
          aria-label="Cari"
        />
        <button
          v-if="q"
          type="button"
          class="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Bersihkan pencarian"
          @click="q = ''"
        >
          <X class="size-3.5" />
        </button>
      </div>
      <div v-if="$slots.filters" class="flex flex-1 flex-wrap items-center gap-2">
        <slot name="filters" />
      </div>
      <div class="flex items-center gap-2 sm:ml-auto">
        <slot name="toolbar" />
        <button
          v-if="paged"
          type="button"
          class="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          aria-label="Muat ulang"
          :disabled="isLoading"
          @click="paged.load()"
        >
          <RotateCw :class="['size-4', isLoading && 'animate-spin']" />
        </button>
      </div>
    </div>

    <!-- Loading bar for refetch with existing data -->
    <div class="relative h-0.5">
      <div
        v-if="isLoading && source.length"
        class="absolute inset-0 overflow-hidden bg-brand-100 dark:bg-brand-500/10"
      >
        <div class="h-full w-1/3 animate-progress bg-brand-500" />
      </div>
    </div>

    <StateView v-if="err && !isLoading" :error="err" @retry="paged?.load()" />

    <template v-else>
      <!-- Desktop table -->
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full text-sm">
          <thead>
            <tr
              class="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30"
            >
              <th
                v-for="c in columns"
                :key="c.key"
                :class="[
                  alignCls(c.align),
                  c.class,
                  'px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase dark:text-slate-400',
                ]"
              >
                {{ c.label }}
              </th>
              <th v-if="$slots.actions" class="px-4 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <template v-if="isLoading && !source.length">
              <tr v-for="i in skeletonRows" :key="'sk' + i">
                <td v-for="(c, ci) in columns" :key="c.key" class="px-4 py-3.5">
                  <div
                    class="skeleton h-4"
                    :style="{ width: `${50 + ((i * 7 + ci * 13) % 45)}%` }"
                  />
                </td>
                <td v-if="$slots.actions" class="px-4 py-3.5">
                  <div class="skeleton ml-auto h-8 w-16" />
                </td>
              </tr>
            </template>
            <tr
              v-for="row in view"
              v-else
              :key="row[rowKey]"
              :class="[
                'transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40',
                clickable && 'cursor-pointer',
              ]"
              @click="clickable && emit('rowClick', row)"
            >
              <td
                v-for="c in columns"
                :key="c.key"
                :class="[alignCls(c.align), c.class, 'px-4 py-3 align-middle']"
              >
                <slot :name="`cell-${c.key}`" :row="row" :value="row[c.key]">
                  <span class="text-slate-700 dark:text-slate-300">{{ row[c.key] ?? '-' }}</span>
                </slot>
              </td>
              <td v-if="$slots.actions" class="px-4 py-3 text-right whitespace-nowrap" @click.stop>
                <slot name="actions" :row="row" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile cards -->
      <ul class="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
        <template v-if="isLoading && !source.length">
          <li v-for="i in 4" :key="'msk' + i" class="space-y-3 p-4">
            <div class="flex justify-between">
              <div class="skeleton h-4 w-1/2" />
              <div class="skeleton h-5 w-16 rounded-full" />
            </div>
            <div class="skeleton h-3 w-3/4" />
            <div class="skeleton h-3 w-2/5" />
          </li>
        </template>
        <li
          v-for="row in view"
          v-else
          :key="row[rowKey]"
          :class="[
            'p-4 transition-colors active:bg-slate-50 dark:active:bg-slate-800/40',
            clickable && 'cursor-pointer',
          ]"
          @click="clickable && emit('rowClick', row)"
        >
          <dl class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
            <template v-for="c in columns.filter((c) => !c.mobileHidden)" :key="c.key">
              <dt class="text-xs text-slate-500 dark:text-slate-400">{{ c.label }}</dt>
              <dd class="min-w-0 truncate text-right">
                <slot :name="`cell-${c.key}`" :row="row" :value="row[c.key]">
                  <span class="text-slate-700 dark:text-slate-300">{{ row[c.key] ?? '-' }}</span>
                </slot>
              </dd>
            </template>
          </dl>
          <div
            v-if="$slots.actions"
            class="mt-3 flex justify-end gap-2 border-t border-dashed border-slate-100 pt-3 dark:border-slate-800"
            @click.stop
          >
            <slot name="actions" :row="row" />
          </div>
        </li>
      </ul>

      <div v-if="!isLoading && !view.length">
        <slot name="empty">
          <StateView
            type="empty"
            :title="q ? 'Tidak ada hasil' : emptyTitle"
            :message="q ? `Tidak ada data yang cocok dengan “${q}” di halaman ini.` : emptyMessage"
          />
        </slot>
      </div>
    </template>

    <!-- Pagination (offset + has_more; backend has no total count) -->
    <div
      v-if="paged && !err && (paged.page.value > 1 || paged.hasMore.value || source.length)"
      class="flex flex-col-reverse items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row dark:border-slate-800"
    >
      <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>Baris</span>
        <select
          :value="paged.limit.value"
          class="input h-8 w-auto py-0 pr-7 text-xs"
          aria-label="Jumlah baris per halaman"
          @change="paged.setLimit(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="s in pageSizes" :key="s" :value="s">{{ s }}</option>
        </select>
        <span class="hidden sm:inline"
          >· {{ paged.offset.value + 1 }}–{{ paged.offset.value + source.length }}</span
        >
      </div>
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          :disabled="paged.page.value <= 1 || isLoading"
          @click="paged.prev()"
        >
          <ChevronLeft class="size-4" /> <span class="hidden sm:inline">Sebelumnya</span>
        </button>
        <span
          class="grid h-9 min-w-9 place-items-center rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white dark:bg-brand-500"
        >
          {{ paged.page.value }}
        </span>
        <button
          type="button"
          class="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          :disabled="!paged.hasMore.value || isLoading"
          @click="paged.next()"
        >
          <span class="hidden sm:inline">Berikutnya</span> <ChevronRight class="size-4" />
        </button>
      </div>
    </div>
  </div>
</template>
