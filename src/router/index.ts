import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { P } from '@/lib/permissions'
import AdminLayout from '@/layouts/AdminLayout.vue'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    auth?: boolean
    guestOnly?: boolean
    /** Requires any of these permissions. */
    any?: string[]
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', redirect: '/admin' },
    {
      path: '/admin/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { title: 'Masuk', guestOnly: true },
    },
    {
      path: '/admin/password-change',
      name: 'password-change',
      component: () => import('@/views/auth/PasswordChangeView.vue'),
      meta: { title: 'Ganti Password', auth: true },
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { auth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/admin/DashboardView.vue'),
          meta: { title: 'Dashboard' },
        },
        {
          path: 'payments',
          name: 'payments',
          component: () => import('@/views/admin/PaymentsView.vue'),
          meta: { title: 'Pembayaran', any: [P.paymentsRead] },
        },
        {
          path: 'payments/:id',
          name: 'payment-detail',
          component: () => import('@/views/admin/PaymentDetailView.vue'),
          meta: { title: 'Detail Pembayaran', any: [P.paymentsRead] },
        },
        {
          path: 'reconciliation',
          name: 'reconciliation',
          component: () => import('@/views/admin/ReconciliationView.vue'),
          meta: { title: 'Rekonsiliasi', any: [P.reconRead] },
        },
        {
          path: 'refunds',
          name: 'refunds',
          component: () => import('@/views/admin/RefundsView.vue'),
          meta: { title: 'Refund', any: [P.refundsRead] },
        },
        {
          path: 'clients',
          name: 'clients',
          component: () => import('@/views/admin/ClientsView.vue'),
          meta: { title: 'Client Portal', any: [P.clientsRead] },
        },
        {
          path: 'clients/:id',
          name: 'client-detail',
          component: () => import('@/views/admin/ClientDetailView.vue'),
          meta: { title: 'Detail Client', any: [P.clientsRead] },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/admin/UsersView.vue'),
          meta: { title: 'Pengguna Admin', any: [P.usersRead] },
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('@/views/admin/RolesView.vue'),
          meta: { title: 'Role & Izin', any: [P.rolesRead] },
        },
        {
          path: 'audit',
          name: 'audit',
          component: () => import('@/views/admin/AuditView.vue'),
          meta: { title: 'Audit Log', any: [P.auditRead] },
        },
        {
          path: 'forbidden',
          name: 'forbidden',
          component: () => import('@/views/ForbiddenView.vue'),
          meta: { title: 'Akses Ditolak' },
        },
      ],
    },
    {
      path: '/p/:paymentNo',
      name: 'checkout',
      component: () => import('@/views/checkout/CheckoutView.vue'),
      meta: { title: 'Pembayaran' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Tidak ditemukan' },
    },
  ],
})

router.beforeEach(async (to) => {
  const needsAuth = to.matched.some((r) => r.meta.auth)
  if (!needsAuth && !to.meta.guestOnly) return true

  const auth = useAuthStore()
  if (!auth.checked) await auth.fetchMe()

  if (to.meta.guestOnly) return auth.isAuthenticated ? { path: '/admin' } : true
  if (!auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } }
  if (auth.user?.force_password_change && to.name !== 'password-change')
    return { name: 'password-change' }
  if (!auth.user?.force_password_change && to.name === 'password-change')
    return { name: 'dashboard' }

  // Guard direct URLs too, not only menu visibility.
  const any = to.meta.any
  if (any?.length && !auth.canAny(...any))
    return { name: 'forbidden', query: { from: to.fullPath } }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Payment Portal` : 'Payment Portal'
})

export default router
