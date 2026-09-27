const files = import.meta.glob<string>('@/assets/images/payment/*.png', {
  eager: true,
  import: 'default',
})

const byName: Record<string, string> = {}
for (const [path, url] of Object.entries(files)) {
  const name = path
    .split('/')
    .pop()!
    .replace(/\.png$/, '')
  byName[name] = url
}

export const logo = (name: string) => byName[name]

export interface LogoInfo {
  src: string
  label: string
}

// Order matters: more specific keywords first.
const RULES: [RegExp, string, string][] = [
  [/QRIS/, 'qris_doku', 'QRIS'],
  [/INDOMARET/, 'indomaret', 'Indomaret'],
  [/ALFA/, 'alfa-group', 'Alfamart'],
  [/AKULAKU/, 'akulaku', 'Akulaku'],
  [/(CARD|CC)/, 'credir_card_doku', 'Kartu Kredit'],
  [/WALLET|DOKU_EWALLET/, 'doku_wallet', 'DOKU Wallet'],
  [/BCA/, 'bca', 'BCA'],
  [/BNI/, 'bni', 'BNI'],
  [/BRI/, 'bri-va', 'BRI'],
  [/BSI|SYARIAH/, 'bsi', 'BSI'],
  [/MANDIRI/, 'mandiri', 'Mandiri'],
  [/CIMB/, 'cimb-niaga', 'CIMB Niaga'],
  [/DANAMON/, 'danamon', 'Danamon'],
  [/PERMATA/, 'permata', 'Permata'],
  [/MAYBANK/, 'maybank', 'Maybank'],
  [/SINARMAS/, 'sinarmas', 'Sinarmas'],
  [/BJB/, 'bjb', 'BJB'],
  [/BNC|NEO/, 'bnc-va', 'Bank Neo Commerce'],
  [/SAMPOERNA|BSS/, 'bss-primary-black', 'Bank Sampoerna'],
  [/MIDTRANS_SNAP|MULTI/, 'multipleBanks_va', 'VA Multi Bank'],
  [/DOKU/, 'doku-va', 'DOKU'],
]

export function channelLogo(code: string | null | undefined): LogoInfo | null {
  if (!code) return null
  const upper = code.toUpperCase()
  for (const [re, name, label] of RULES) {
    const src = byName[name]
    if (re.test(upper) && src) return { src, label }
  }
  return null
}

/** Logo strip for "metode pembayaran didukung". */
export const SUPPORTED_LOGOS: LogoInfo[] = (
  [
    ['qris_doku', 'QRIS'],
    ['bca', 'BCA'],
    ['mandiri', 'Mandiri'],
    ['bni', 'BNI'],
    ['bri-va', 'BRI'],
    ['bsi', 'BSI'],
    ['permata', 'Permata'],
    ['cimb-niaga', 'CIMB Niaga'],
    ['danamon', 'Danamon'],
    ['indomaret', 'Indomaret'],
    ['alfa-group', 'Alfamart'],
    ['credir_card_doku', 'Kartu Kredit'],
  ] as const
)
  .filter(([n]) => byName[n])
  .map(([n, label]) => ({ src: byName[n]!, label }))
