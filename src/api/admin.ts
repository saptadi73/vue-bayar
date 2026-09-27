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
  MerchantAccount,
  Organizer,
  PaymentChannelConfig,
  RoutingRule,
  FeatureFlag,
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
  login: (identifier: string, password: string, otp?: string) =>
    api.post<Data<LoginResponse>>(
      '/admin/auth/login',
      { identifier, password, ...(otp ? { otp } : {}) },
      { silent401: true },
    ),
  me: () => api.get<Data<MeResponse>>('/admin/auth/me', undefined, { silent401: true }),
  logout: () =>
    api.post<Data<{ status: string }>>('/admin/auth/logout', undefined, { silent401: true }),
  mfaEnroll: () => api.post<Data<{ secret: string; otpauth_uri: string }>>('/admin/auth/mfa/enroll'),
  mfaConfirm: (code: string) => api.post<Data<{ recovery_codes: string[] }>>('/admin/auth/mfa/confirm', { code }),
  reauthenticate: (password: string) => api.post<Data<{ status: string; valid_for_seconds: number }>>('/admin/auth/reauthenticate', { password }),
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
  assignClient: (id: string, client_id: string, reason: string) =>
    api.post<Data<{ id: string; user_id: string; client_id: string; active: boolean }>>(`/admin/users/${id}/clients`, { client_id, reason }),
}

export const rolesApi = {
  list: () => api.get<Data<RoleDef[]>>('/admin/roles'),
  update: (code: string, body: { display_name: string; permissions: string[]; expected_version: number; reason: string }) =>
    api.patch<Data<RoleDef>>(`/admin/roles/${code}`, body),
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
  rotateCallbackSecret: (id: string, expected_version: number, reason: string) =>
    api.post<Data<ClientCredentials>>(`/admin/clients/${id}/rotate-callback-secret`, {
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
  createPortalUser: (id: string, body: { email: string; name: string; reason: string }) =>
    api.post<Data<PortalUser>>(`/admin/clients/${id}/portal-users`, body),
  updatePortalUser: (clientId: string, userId: string, body: { name: string; expected_version: number; reason: string }) =>
    api.patch<Data<PortalUser>>(`/admin/clients/${clientId}/portal-users/${userId}`, body),
  deletePortalUser: (clientId: string, userId: string, reason: string) =>
    api.delete<Data<{ id: string; status: string }>>(`/admin/clients/${clientId}/portal-users/${userId}`, { reason }),
}

export const servicesApi = {
  list: (clientId: string, q: PageQuery) =>
    api.get<Page<Service>>(`/admin/clients/${clientId}/services`, q),
  create: (
    clientId: string,
    body: { code: string; name: string; organizer_id?: string | null; active: boolean; reason: string },
  ) => api.post<Data<Service>>(`/admin/clients/${clientId}/services`, body),
  update: (
    clientId: string,
    id: string,
    body: { name: string; organizer_id?: string | null; active: boolean; expected_version: number; reason: string },
  ) => api.patch<Data<Service>>(`/admin/clients/${clientId}/services/${id}`, body),
}

export const routingApi = {
  organizers: (clientId: string) => api.get<Data<Organizer[]>>(`/admin/clients/${clientId}/organizers`),
  createOrganizer: (clientId: string, body: { code: string; name: string; active: boolean; reason: string }) =>
    api.post<Data<Organizer>>(`/admin/clients/${clientId}/organizers`, body),
  updateOrganizer: (clientId: string, id: string, body: { name: string; active: boolean; expected_version: number; reason: string }) =>
    api.patch<Data<Organizer>>(`/admin/clients/${clientId}/organizers/${id}`, body),
  merchantAccounts: (clientId: string) => api.get<Data<MerchantAccount[]>>(`/admin/clients/${clientId}/merchant-accounts`),
  createMerchantAccount: (clientId: string, body: { code: string; name: string; gateway: string; credential_ref?: string | null; active: boolean; reason: string }) =>
    api.post<Data<MerchantAccount>>(`/admin/clients/${clientId}/merchant-accounts`, body),
  updateMerchantAccount: (clientId: string, id: string, body: { name: string; credential_ref?: string | null; active: boolean; expected_version: number; reason: string }) =>
    api.patch<Data<MerchantAccount>>(`/admin/clients/${clientId}/merchant-accounts/${id}`, body),
  channels: (clientId: string) => api.get<Data<PaymentChannelConfig[]>>(`/admin/clients/${clientId}/payment-channels`),
  createChannel: (clientId: string, body: { merchant_account_id: string; gateway: string; channel_code: string; name: string; active: boolean; min_amount?: number | null; max_amount?: number | null; currencies: string[]; reason: string }) =>
    api.post<Data<PaymentChannelConfig>>(`/admin/clients/${clientId}/payment-channels`, body),
  updateChannel: (clientId: string, id: string, body: { name: string; active: boolean; min_amount?: number | null; max_amount?: number | null; currencies: string[]; expected_version: number; reason: string }) =>
    api.patch<Data<PaymentChannelConfig>>(`/admin/clients/${clientId}/payment-channels/${id}`, body),
  routingRules: (clientId: string) => api.get<Data<RoutingRule[]>>(`/admin/clients/${clientId}/routing-rules`),
  createRoutingRule: (clientId: string, body: { service_id?: string | null; event_id?: string | null; channel_code: string; merchant_account_id: string; priority: number; active: boolean; reason: string }) =>
    api.post<Data<RoutingRule>>(`/admin/clients/${clientId}/routing-rules`, body),
  updateRoutingRule: (clientId: string, id: string, body: { merchant_account_id: string; priority: number; active: boolean; expected_version: number; reason: string }) =>
    api.patch<Data<RoutingRule>>(`/admin/clients/${clientId}/routing-rules/${id}`, body),
  featureFlags: (clientId: string) => api.get<Data<FeatureFlag[]>>(`/admin/clients/${clientId}/feature-flags`),
  upsertFeatureFlag: (clientId: string, body: { key: string; enabled: boolean; config: Record<string, unknown>; expected_version?: number; reason: string }) =>
    api.put<Data<FeatureFlag>>(`/admin/clients/${clientId}/feature-flags`, body),
}

export interface PaymentFilter {
  search?: string
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
  export: (q: PaymentFilter & { limit?: number; cursor?: string; snapshot_at?: string }) =>
    api.get<{ data: Payment[]; meta: { limit: number; has_more: boolean; next_cursor?: string | null; snapshot_at: string; format: string; source: string } }>(
      '/admin/payments/export',
      { ...q },
    ),
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
