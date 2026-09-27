import { splitLines } from '@/lib/format'
import type { Client, Scope } from '@/types/api'

export interface ClientFormModel {
  code: string
  service_code: string
  name: string
  active: boolean
  scopes: Scope[]
  returnUrls: string
  callbackUrls: string
  callback_url: string
  reason: string
}

export const emptyClientForm = (): ClientFormModel => ({
  code: '',
  service_code: '',
  name: '',
  active: true,
  scopes: ['payments:read', 'payments:write'],
  returnUrls: '',
  callbackUrls: '',
  callback_url: '',
  reason: '',
})

export const clientToForm = (c: Client): ClientFormModel => ({
  code: c.code,
  service_code: '',
  name: c.name,
  active: c.active,
  scopes: [...c.scopes],
  returnUrls: c.allowed_return_urls.join('\n'),
  callbackUrls: c.allowed_callback_urls.join('\n'),
  callback_url: c.callback_url ?? '',
  reason: '',
})

export const toConfig = (m: ClientFormModel) => ({
  name: m.name.trim(),
  active: m.active,
  scopes: m.scopes,
  allowed_return_urls: splitLines(m.returnUrls),
  allowed_callback_urls: splitLines(m.callbackUrls),
  callback_url: m.callback_url || null,
  reason: m.reason.trim(),
})

/** Client-side checks only; backend remains the source of validation. */
export function validateClientForm(m: ClientFormModel, create: boolean) {
  const e: Record<string, string> = {}
  const codeRe = /^[A-Za-z0-9_-]+$/
  if (create && !codeRe.test(m.code)) e.code = 'Hanya huruf, angka, underscore, dan minus.'
  if (create && !codeRe.test(m.service_code)) e.service_code = 'Hanya huruf, angka, underscore, dan minus.'
  if (!m.name.trim()) e.name = 'Nama wajib diisi.'
  if (!m.scopes.length) e.scopes = 'Pilih minimal satu scope.'
  const urlOk = (u: string) => {
    try {
      const p = new URL(u)
      return p.protocol === 'https:' || (p.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(p.hostname))
    } catch {
      return false
    }
  }
  const ret = splitLines(m.returnUrls)
  const cb = splitLines(m.callbackUrls)
  if (ret.some((u) => !urlOk(u) || u.length > 500)) e.allowed_return_urls = 'Ada URL tidak valid (HTTPS, maks 500 karakter).'
  if (cb.some((u) => !urlOk(u) || u.length > 500)) e.allowed_callback_urls = 'Ada URL tidak valid (HTTPS, maks 500 karakter).'
  if (ret.length > 20) e.allowed_return_urls = 'Maksimal 20 URL.'
  if (cb.length > 20) e.allowed_callback_urls = 'Maksimal 20 URL.'
  if (!m.reason.trim()) e.reason = 'Alasan wajib diisi.'
  return e
}
