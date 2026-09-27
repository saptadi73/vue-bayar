import { api } from '@/lib/http'
import type {
  AdminUser,
  AuditEntry,
  Client,
  ClientCredentials,
  LoginResponse,
  MeResponse,
  Page,
  Payment,
  PaymentAttempt,
  PaymentHistory,
  PaymentSummary,
  PortalEvent,
  PortalUser,
  ReconciliationCase,
  Refund,
  Role,
  RoleDef,
  Scope,
  Service,
} from '@/types/api'

type Data<T> = { data: T }
export type PageQuery = { limit: number; offset: number }

export const authApi = {
  login: (identifier: string, password: string) =>
    api.post<Data<LoginResponse>>(
      '/admin/auth/login',
      { identifier, password },
      { silent401: true },
    ),
  me: () => api.get<Data<MeResponse>>('/admin/auth/me', undefined, { silent401: true }),
  logout: () =>
    api.post<Data<{ status: string }>>('/admin/auth/logout', undefined, { silent401: true }),
}

export interface UserCreate {
  email: string
  display_name: string
  role: Role
  active: boolean
  password: string
  reason: string
}
export interface UserUpdate {
  display_name: string
  role: Role
  active: boolean
  expected_version: number
  reason: string
}

export const usersApi = {
  list: (q: PageQuery) => api.get<Page<AdminUser>>('/admin/users', q),
  create: (body: UserCreate) => api.post<Data<AdminUser>>('/admin/users', body),
  update: (id: string, body: UserUpdate) => api.patch<Data<AdminUser>>(`/admin/users/${id}`, body),
  revokeSessions: (id: string, expected_version: number, reason: string) =>
    api.post<Data<{ id: string; version: number; status: string }>>(
      `/admin/users/${id}/revoke-sessions`,
      {
        expected_version,
        reason,
      },
    ),
}

export const rolesApi = {
  list: () => api.get<Data<RoleDef[]>>('/admin/roles'),
}

export const auditApi = {
  list: (q: PageQuery) => api.get<Page<AuditEntry>>('/admin/audit', q),
}

export interface ClientConfig {
  name: string
  active: boolean
  scopes: Scope[]
  allowed_return_urls: string[]
  allowed_callback_urls: string[]
  callback_url: string | null
  reason: string
}

export const clientsApi = {
  list: (q: PageQuery) => api.get<Page<Client>>('/admin/clients', q),
  get: (id: string) => api.get<Data<Client>>(`/admin/clients/${id}`),
  create: (body: ClientConfig & { code: string; service_code: string }) =>
    api.post<Data<ClientCredentials>>('/admin/clients', body),
  update: (id: string, body: ClientConfig & { expected_version: number }) =>
    api.patch<Data<Client>>(`/admin/clients/${id}`, body),
  rotateSecret: (id: string, expected_version: number, reason: string) =>
    api.post<Data<ClientCredentials>>(`/admin/clients/${id}/rotate-secret`, {
      expected_version,
      reason,
    }),
  revokeCheckouts: (id: string, reason: string) =>
    api.post<Data<{ client_id: string; checkout_sessions_revoked: number }>>(
      `/admin/clients/${id}/revoke-checkouts`,
      { reason },
    ),
  events: (id: string, q: PageQuery) =>
    api.get<Page<PortalEvent>>(`/admin/clients/${id}/events`, q),
  portalUsers: (id: string, q: PageQuery) =>
    api.get<Page<PortalUser>>(`/admin/clients/${id}/portal-users`, q),
}

export const servicesApi = {
  list: (clientId: string, q: PageQuery) =>
    api.get<Page<Service>>(`/admin/clients/${clientId}/services`, q),
  create: (
    clientId: string,
    body: { code: string; name: string; active: boolean; reason: string },
  ) => api.post<Data<Service>>(`/admin/clients/${clientId}/services`, body),
  update: (
    clientId: string,
    id: string,
    body: { name: string; active: boolean; expected_version: number; reason: string },
  ) => api.patch<Data<Service>>(`/admin/clients/${clientId}/services/${id}`, body),
}

export interface PaymentFilter {
  client_id?: string
  service_id?: string
  event_id?: string
  status?: string
  reference_id?: string
  created_from?: string
  created_to?: string
}

export const paymentsApi = {
  list: (q: PageQuery & PaymentFilter) => api.get<Page<Payment>>('/admin/payments', { ...q }),
  summary: (q: Pick<PaymentFilter, 'client_id' | 'status' | 'created_from' | 'created_to'>) =>
    api.get<Data<PaymentSummary>>('/admin/payments/summary', { ...q }),
  get: (id: string) => api.get<Data<Payment>>(`/admin/payments/${id}`),
  history: (id: string, q: PageQuery) =>
    api.get<Page<PaymentHistory>>(`/admin/payments/${id}/history`, q),
  attempts: (id: string, q: PageQuery) =>
    api.get<Page<PaymentAttempt>>(`/admin/payments/${id}/attempts`, q),
}

export const reconciliationApi = {
  list: (q: PageQuery) => api.get<Page<ReconciliationCase>>('/admin/reconciliation', q),
  request: (attemptId: string, reason: string) =>
    api.post<Data<ReconciliationCase>>(`/admin/reconciliation/${attemptId}/request`, { reason }),
}

export const refundsApi = {
  list: (q: PageQuery & { status?: string; payment_id?: string }) =>
    api.get<Page<Refund>>('/admin/refunds', { ...q }),
  request: (payment_id: string, amount: number | null, reason: string) =>
    api.post<Data<Refund>>('/admin/refunds/request', { payment_id, amount, reason }),
  approve: (id: string, expected_version: number) =>
    api.post<Data<Refund>>(`/admin/refunds/${id}/approve`, { expected_version }),
  reject: (id: string, expected_version: number, reason: string) =>
    api.post<Data<Refund>>(`/admin/refunds/${id}/reject`, { expected_version, reason }),
}
