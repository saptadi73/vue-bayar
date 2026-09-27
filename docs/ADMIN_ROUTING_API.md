# Admin Routing & Channel API

Detail client admin menyediakan kontrak konfigurasi berikut (permission
`admin.routing.read` / `admin.routing.manage`): merchant accounts, payment channels,
routing rules, dan feature flags. Semua mutasi membutuhkan `reason`; update memakai
`expected_version`.

Frontend memakai `routingApi` dari `src/api/admin.ts`. Jangan mengirim server key,
client secret, atau credential gateway; field `credential_ref` hanya pointer secret
manager. Daftar channel checkout harus berasal dari endpoint backend, bukan hard-coded.
Backend memfilter channel berdasarkan merchant/channel aktif, currency, batas nominal,
dan routing rule; channel tidak eligible menghasilkan `UNSUPPORTED_CHANNEL`.

Runtime provider tetap memerlukan UAT merchant DOKU/Midtrans sebelum konfigurasi live.
