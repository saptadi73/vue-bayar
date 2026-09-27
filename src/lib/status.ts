export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'violet'

const MAP: Record<string, Tone> = {
  // payment
  CREATED: 'neutral',
  PENDING: 'warning',
  PAID: 'success',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
  FAILED: 'danger',
  REFUND_PENDING: 'violet',
  PARTIALLY_REFUNDED: 'info',
  REFUNDED: 'info',
  // attempt
  INITIATED: 'brand',
  UNKNOWN: 'danger',
  // reconciliation
  REQUESTED: 'brand',
  RUNNING: 'info',
  RETRY_WAIT: 'warning',
  COMPLETED: 'success',
  // refund
  APPROVED: 'info',
  REJECTED: 'danger',
  PROVIDER_ACCEPTED: 'info',
  SUCCEEDED: 'success',
  MANUAL_REQUIRED: 'warning',
}

export const toneOf = (status: string | null | undefined): Tone =>
  status ? (MAP[status] ?? 'neutral') : 'neutral'

export const labelOf = (status: string | null | undefined) =>
  status
    ? status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase())
    : '-'

/** Hex colors aligned with tones, used by charts. */
export const TONE_HEX: Record<Tone, string> = {
  neutral: '#94a3b8',
  brand: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#f43f5e',
  info: '#0ea5e9',
  violet: '#8b5cf6',
}
