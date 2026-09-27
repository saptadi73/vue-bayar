import type { Component } from 'vue'
import {
  LayoutDashboard,
  CreditCard,
  RefreshCcw,
  Undo2,
  Building,
  Users,
  ShieldCheck,
  ScrollText,
  Settings,
} from '@lucide/vue'
import { P } from '@/lib/permissions'

export interface NavItem {
  label: string
  to: string
  icon: Component
  /** User needs any of these permissions. Empty = always visible. */
  any: string[]
  soon?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    label: 'Ringkasan',
    items: [{ label: 'Dashboard', to: '/admin', icon: LayoutDashboard, any: [] }],
  },
  {
    label: 'Transaksi',
    items: [
      { label: 'Pembayaran', to: '/admin/payments', icon: CreditCard, any: [P.paymentsRead] },
      { label: 'Rekonsiliasi', to: '/admin/reconciliation', icon: RefreshCcw, any: [P.reconRead] },
      { label: 'Refund', to: '/admin/refunds', icon: Undo2, any: [P.refundsRead] },
    ],
  },
  {
    label: 'Integrasi',
    items: [{ label: 'Client Portal', to: '/admin/clients', icon: Building, any: [P.clientsRead] }],
  },
  {
    label: 'Akses & Audit',
    items: [
      { label: 'Pengguna Admin', to: '/admin/users', icon: Users, any: [P.usersRead] },
      { label: 'Role & Izin', to: '/admin/roles', icon: ShieldCheck, any: [P.rolesRead] },
      { label: 'Audit Log', to: '/admin/audit', icon: ScrollText, any: [P.auditRead] },
      {
        label: 'Pengaturan',
        to: '/admin/settings',
        icon: Settings,
        any: ['admin.settings.manage'],
        soon: true,
      },
    ],
  },
]
