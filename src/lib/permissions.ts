export const P = {
  usersRead: 'admin.users.read',
  usersManage: 'admin.users.manage',
  rolesRead: 'admin.roles.read',
  auditRead: 'admin.audit.read',
  clientsRead: 'admin.clients.read',
  clientsManage: 'admin.clients.manage',
  clientsRotate: 'admin.clients.rotate_secret',
  servicesRead: 'admin.services.read',
  servicesManage: 'admin.services.manage',
  portalUsersRead: 'admin.portal_users.read',
  paymentsRead: 'admin.payments.read',
  reconRead: 'admin.reconciliation.read',
  reconRequest: 'admin.reconciliation.request',
  refundsRead: 'admin.refunds.read',
  refundsRequest: 'admin.refunds.request',
  refundsApprove: 'admin.refunds.approve',
} as const

export type Permission = (typeof P)[keyof typeof P]

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  INTEGRATION_ADMIN: 'Admin Integrasi',
  FINANCE: 'Finance',
  AUDITOR: 'Auditor',
}

export const ROLES = ['SUPER_ADMIN', 'INTEGRATION_ADMIN', 'FINANCE', 'AUDITOR'] as const
