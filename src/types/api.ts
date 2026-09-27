export interface ApiErrorBody {
  code: string
  message: string
  request_id?: string
  details?: unknown
}

export interface PageMeta {
  limit: number
  offset: number
  has_more?: boolean
  total_count?: number
}

export interface Page<T> {
  data: T[]
  meta: PageMeta
}

export type Role = 'SUPER_ADMIN' | 'INTEGRATION_ADMIN' | 'FINANCE' | 'AUDITOR'

export interface AdminUser {
  id: string
  email: string
  display_name: string
  active: boolean
  role: Role
  version: number
  force_password_change?: boolean
  mfa_enabled?: boolean
}

export interface MeResponse {
  user: AdminUser
  roles: Role[]
  permissions: string[]
  access_scope: { all_clients: boolean; client_ids: string[] }
  session_expires_at: string
  csrf_token: string
}

export interface LoginResponse {
  status: 'authenticated'
  user: AdminUser
  csrf_token: string
  session_expires_at: string
}

export interface RoleDef {
  code: Role
  display_name?: string
  permissions: string[]
  version?: number
}

export interface AuditEntry {
  id: string
  actor_id: string | null
  action: string
  resource_id: string | null
  reason: string | null
  occurred_at: string
}

export type Scope = 'payments:read' | 'payments:write' | 'payments:refund'

export interface Client {
  id: string
  code: string
  name: string
  active: boolean
  version: number
  callback_secret_version: number
  scopes: Scope[]
  allowed_return_urls: string[]
  allowed_callback_urls: string[]
  callback_url: string | null
}

export interface ClientCredentials extends Client {
  service_code?: string
  client_secret: string
  callback_secret?: string
}

export interface Service {
  id: string
  client_id: string
  code: string
  name: string
  organizer_id: string | null
  active: boolean
  version: number
}

export interface MerchantAccount {
  id: string
  client_id: string
  code: string
  name: string
  gateway: string
  credential_ref: string | null
  active: boolean
  version: number
}

export interface Organizer {
  id: string
  client_id: string
  code: string
  name: string
  active: boolean
  version: number
}

export interface PaymentChannelConfig {
  id: string
  merchant_account_id: string
  gateway: string
  channel_code: string
  name: string
  active: boolean
  min_amount: number | null
  max_amount: number | null
  currencies: string[]
  version: number
}

export interface RoutingRule {
  id: string
  client_id: string
  service_id: string | null
  event_id: string | null
  channel_code: string
  merchant_account_id: string
  priority: number
  active: boolean
  version: number
}

export interface FeatureFlag {
  id: string
  client_id: string
  key: string
  enabled: boolean
  config: Record<string, unknown>
  version: number
}

export interface PortalEvent {
  id: string
  client_id: string
  event_id: string
  name: string
}

export interface PortalUser {
  id: string
  client_id: string
  email: string
  name: string
  version: number
}

export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'PAID'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'CREATED',
  'PENDING',
  'PAID',
  'EXPIRED',
  'CANCELLED',
  'FAILED',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
]

export interface Payment {
  id: string
  payment_no: string
  client_id: string
  client_name: string | null
  service_id: string
  event_id: string | null
  event_name: string | null
  reference_id: string
  amount: number
  currency: string
  status: PaymentStatus
  created_at: string
  expires_at: string | null
}

export interface PaymentHistory {
  id: string
  from_status: string | null
  to_status: string
  source: string
  occurred_at: string
}

export interface PaymentAttempt {
  id: string
  attempt_no: number
  gateway: string
  gateway_order_id: string
  channel_code: string
  status: string
}

export interface PaymentSummary {
  by_status: { status: PaymentStatus; payment_count: number; amount: number }[]
  by_client: {
    client_id: string
    client_name: string | null
    payment_count: number
    amount: number
  }[]
}

export interface ReconciliationCase {
  id: string
  attempt_id: string
  requested_by: string | null
  status: 'REQUESTED' | 'RUNNING' | 'RETRY_WAIT' | 'COMPLETED' | 'FAILED'
  reason: string
  requested_at: string
  started_at: string | null
  completed_at: string | null
  result_status: string | null
  error_code: string | null
  attempt?: { gateway: string; channel_code: string; gateway_order_id: string; status: string }
}

export interface Refund {
  id: string
  refund_no: string
  payment_id: string
  amount: number
  reason: string
  status: string
  requested_by_admin: string | null
  approved_by: string | null
  rejected_by: string | null
  rejection_reason: string | null
  version: number
  provider_ref: string | null
  provider_status: string | null
  provider_error_code: string | null
  created_at: string
  payment?: {
    payment_no: string
    client_id: string
    client_name: string | null
    event_id: string | null
    event_name: string | null
    status: PaymentStatus
  }
}

export interface CheckoutSummary {
  payment_no: string
  amount: number
  currency: string
  status: PaymentStatus
}

export interface CheckoutChannel {
  code: string
  name: string
}

export interface CheckoutAttempt {
  attempt_id: string
  gateway: string
  channel_code: string
  gateway_order_id?: string
  status: string
  instructions: Record<string, string | null | undefined>
}
