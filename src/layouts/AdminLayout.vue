<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, X, LogOut, Wallet } from '@lucide/vue'
import { NAV } from './nav'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useConfirm } from '@/composables/useConfirm'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import { ROLE_LABEL } from '@/lib/permissions'
import { initials } from '@/lib/format'

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const drawer = ref(false)
const loggingOut = ref(false)

watch(
  () => route.fullPath,
  () => (drawer.value = false),
)

const groups = computed(() =>
  NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.any.length || auth.canAny(...i.any)),
  })).filter((g) => g.items.length),
)

const isActive = (to: string) =>
  to === '/admin' ? route.path === '/admin' : route.path.startsWith(to)
const title = computed(() => (route.meta.title as string | undefined) ?? 'Admin')

async function logout() {
  const ok = await confirm({
    title: 'Keluar dari portal?',
    message: 'Sesi admin akan dicabut di server.',
    tone: 'brand',
    confirmText: 'Keluar',
  })
  if (!ok) return
  loggingOut.value = true
  try {
    await auth.logout()
  } catch {
    // State is cleared regardless; server session may already be gone.
  }
  loggingOut.value = false
  toast.info('Anda telah keluar')
  router.replace('/admin/login')
}
</script>

<template>
  <div class="min-h-dvh">
    <!-- Mobile top bar -->
    <header
      class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200/70 bg-white/80 px-3 backdrop-blur-xl lg:hidden dark:border-slate-800 dark:bg-slate-950/80"
    >
      <button
        type="button"
        class="grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Buka menu"
        @click="drawer = true"
      >
        <Menu class="size-5" />
      </button>
      <p class="flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
        {{ title }}
      </p>
      <ThemeToggle compact />
    </header>

    <!-- Backdrop -->
    <Transition
      enter-active-class="transition"
      enter-from-class="opacity-0"
      leave-active-class="transition"
      leave-to-class="opacity-0"
    >
      <div
        v-if="drawer"
        class="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
        @click="drawer = false"
      />
    </Transition>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col border-r border-slate-200/70 bg-white transition-transform duration-300 ease-out lg:translate-x-0 dark:border-slate-800 dark:bg-slate-950',
        drawer ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
      ]"
    >
      <div class="flex h-16 items-center gap-3 px-5">
        <div
          class="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-700 text-white shadow-lg shadow-brand-600/30"
        >
          <Wallet class="size-5" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-bold text-slate-900 dark:text-white">Payment Portal</p>
          <p class="text-[11px] text-slate-500">Admin Console</p>
        </div>
        <button
          type="button"
          class="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
          aria-label="Tutup menu"
          @click="drawer = false"
        >
          <X class="size-5" />
        </button>
      </div>

      <nav class="flex-1 space-y-5 overflow-y-auto px-3 py-3" aria-label="Navigasi utama">
        <div v-for="g in groups" :key="g.label">
          <p
            class="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500"
          >
            {{ g.label }}
          </p>
          <ul class="space-y-0.5">
            <li v-for="item in g.items" :key="item.to">
              <span
                v-if="item.soon"
                class="flex h-10 cursor-not-allowed items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-400 dark:text-slate-600"
              >
                <component :is="item.icon" class="size-[18px]" />
                <span class="flex-1">{{ item.label }}</span>
                <span
                  class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-slate-800"
                  >Segera</span
                >
              </span>
              <RouterLink
                v-else
                :to="item.to"
                :class="[
                  'group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition',
                  isActive(item.to)
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100',
                ]"
              >
                <span
                  v-if="isActive(item.to)"
                  class="absolute top-2 bottom-2 -left-3 w-1 rounded-r-full bg-brand-600 dark:bg-brand-400"
                />
                <component :is="item.icon" class="size-[18px]" />
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </nav>

      <div class="space-y-3 border-t border-slate-200/70 p-3 dark:border-slate-800">
        <div class="hidden justify-center lg:flex"><ThemeToggle class="w-full" /></div>
        <div class="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900">
          <div
            class="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-brand-600 text-xs font-bold text-white"
          >
            {{ initials(auth.user?.display_name ?? '?') }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {{ auth.user?.display_name }}
            </p>
            <p class="truncate text-xs text-slate-500">
              {{ ROLE_LABEL[auth.user?.role ?? ''] ?? auth.user?.role }}
            </p>
          </div>
          <button
            type="button"
            class="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
            aria-label="Keluar"
            :disabled="loggingOut"
            @click="logout"
          >
            <LogOut class="size-4" />
          </button>
        </div>
      </div>
    </aside>

    <main
      class="px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:ml-[17rem] lg:px-8 lg:py-8"
    >
      <div class="mx-auto max-w-7xl">
        <RouterView v-slot="{ Component }">
          <Transition
            mode="out-in"
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            leave-active-class="transition duration-100"
            leave-to-class="opacity-0"
          >
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </div>
    </main>
  </div>
</template>
