const idr = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})
const compact = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 })
const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
const rel = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' })

export const formatCurrency = (v: number | null | undefined, currency = 'IDR') =>
  v == null ? '-' : currency === 'IDR' ? idr.format(v) : `${currency} ${v.toLocaleString('id-ID')}`

export const formatCompact = (v: number) => compact.format(v)

export const formatDate = (iso: string | null | undefined) =>
  iso ? dateTime.format(new Date(iso)) : '-'

export function formatRelative(iso: string | null | undefined) {
  if (!iso) return '-'
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, sec] of units)
    if (Math.abs(diff) >= sec) return rel.format(Math.round(diff / sec), unit)
  return 'baru saja'
}

/** Converts a `datetime-local` value into a timezone-aware ISO string (backend rejects naive dates). */
export const localToIso = (v: string) => (v ? new Date(v).toISOString() : undefined)

export const shortId = (id: string | null | undefined) => (id ? id.slice(0, 8) : '-')

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

export const splitLines = (v: string) =>
  v
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
