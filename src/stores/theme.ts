import { defineStore } from 'pinia'
import { computed, ref, watchEffect } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>((localStorage.getItem('theme') as ThemeMode) || 'system')
  const media = matchMedia('(prefers-color-scheme: dark)')
  const systemDark = ref(media.matches)
  media.addEventListener('change', (e) => (systemDark.value = e.matches))

  const isDark = computed(
    () => mode.value === 'dark' || (mode.value === 'system' && systemDark.value),
  )

  watchEffect(() => {
    document.documentElement.classList.toggle('dark', isDark.value)
    localStorage.setItem('theme', mode.value)
  })

  const set = (m: ThemeMode) => (mode.value = m)
  const toggle = () => (mode.value = isDark.value ? 'light' : 'dark')

  return { mode, isDark, set, toggle }
})
