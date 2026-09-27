import { api } from '@/lib/http'
import type { CheckoutAttempt, CheckoutChannel, CheckoutSummary } from '@/types/api'

type Data<T> = { data: T }

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` }, silent401: true })
const enc = encodeURIComponent

export const checkoutApi = {
  summary: (no: string, token: string) =>
    api.get<Data<CheckoutSummary>>(`/public/payments/${enc(no)}`, undefined, auth(token)),
  status: (no: string, token: string) =>
    api.get<Data<CheckoutSummary>>(`/public/payments/${enc(no)}/status`, undefined, auth(token)),
  channels: (no: string, token: string) =>
    api.get<Data<{ channels: CheckoutChannel[] }>>(
      `/public/payments/${enc(no)}/channels`,
      undefined,
      auth(token),
    ),
  createAttempt: (no: string, token: string, channel_code: string) =>
    api.post<Data<CheckoutAttempt>>(
      `/public/payments/${enc(no)}/attempts`,
      { channel_code },
      auth(token),
    ),
  instructions: (attemptId: string, token: string) =>
    api.get<Data<CheckoutAttempt>>(
      `/public/attempts/${enc(attemptId)}/instructions`,
      undefined,
      auth(token),
    ),
}
