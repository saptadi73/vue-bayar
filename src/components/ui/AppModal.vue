<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    /** Prevent closing via backdrop/Escape (e.g. while submitting or showing one-time secrets). */
    persistent?: boolean
  }>(),
  { size: 'md' },
)
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
let lastFocus: HTMLElement | null = null

function close() {
  if (!props.persistent) emit('close')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
  if (e.key === 'Tab' && panel.value) {
    const f = panel.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
    )
    const first = f[0]
    const last = f[f.length - 1]
    if (!first || !last) return
    if (e.shiftKey && document.activeElement === first) {
      last.focus()
      e.preventDefault()
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus()
      e.preventDefault()
    }
  }
}

watch(
  () => props.open,
  async (v) => {
    if (v) {
      lastFocus = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onKey)
      await nextTick()
      panel.value?.querySelector<HTMLElement>('[autofocus],input,select,textarea,button')?.focus()
    } else {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
      lastFocus?.focus?.()
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKey)
})

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      >
        <div class="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" @click="close" />
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          :class="[
            SIZES[size],
            'relative flex max-h-[92dvh] w-full animate-slide-up flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-slate-900/5 sm:rounded-2xl dark:bg-slate-900 dark:ring-white/10',
          ]"
        >
          <div
            class="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-300 sm:hidden dark:bg-slate-700"
          />
          <header v-if="title" class="flex items-start gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
            <slot name="icon" />
            <div class="min-w-0 flex-1">
              <h2 class="text-base font-semibold text-slate-900 dark:text-white">{{ title }}</h2>
              <p v-if="description" class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ description }}
              </p>
            </div>
            <button
              v-if="!persistent"
              type="button"
              class="-mt-1 -mr-2 grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              aria-label="Tutup"
              @click="close"
            >
              <X class="size-5" />
            </button>
          </header>
          <div class="flex-1 overflow-y-auto px-5 pb-5 sm:px-6"><slot /></div>
          <footer
            v-if="$slots.footer"
            class="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6 dark:border-slate-800 dark:bg-slate-900/80"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
