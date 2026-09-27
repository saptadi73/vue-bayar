import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './assets/main.css'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './lib/http'
import { useAuthStore } from './stores/auth'
import { useToastStore } from './stores/toast'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

setUnauthorizedHandler(() => {
  const auth = useAuthStore(pinia)
  const wasLoggedIn = auth.isAuthenticated
  auth.clear()
  const current = router.currentRoute.value
  if (current.name !== 'login' && current.matched.some((r) => r.meta.auth)) {
    if (wasLoggedIn) useToastStore(pinia).warning('Sesi berakhir', 'Silakan masuk kembali.')
    router.replace({ name: 'login', query: { redirect: current.fullPath } })
  }
})

app.mount('#app')
