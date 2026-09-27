# Frontend Admin Portal & Checkout (vue-bayar)

Dokumen milik tim frontend. Kontrak API tetap mengacu pada dokumen backend di folder ini
(ADMIN_API.md, ADMIN_FRONTEND_SPEC.md, API_ERROR_CODES.md, FRONTEND_INTEGRATION.md, dst.)
dan dokumen backend lengkap di repo `fastapi-bayar/docs`. Dokumen ini tidak mengubah kontrak.

## Stack

| Bagian       | Pilihan                                                                           |
| ------------ | --------------------------------------------------------------------------------- |
| Framework    | Vue 3.5 + TypeScript, Vite 8, Pinia, Vue Router                                   |
| Styling      | Tailwind CSS 4 (`@tailwindcss/vite`), dark mode berbasis class `.dark`            |
| Ikon         | Lucide (`@lucide/vue`)                                                            |
| Font         | Plus Jakarta Sans Variable (UI), JetBrains Mono Variable (kode/ID) via Fontsource |
| Grafik       | ApexCharts (`vue3-apexcharts`), hanya di Dashboard (lazy chunk)                   |
| Logo channel | `src/assets/images/payment/*.png`                                                 |

## Menjalankan

```powershell
npm install
Copy-Item .env.example .env   # sesuaikan VITE_API_TARGET / VITE_API_PREFIX
npm run dev                   # http://localhost:5173
npm run build                 # type-check + build produksi
```

Backend: `ADMIN_ENABLED=true` (development), migration terbaru, dan akun dari
`scripts/bootstrap_admin.py`.

### Same-origin & Origin header

Backend mewajibkan header `Origin` sama persis dengan `PUBLIC_BASE_URL` untuk login dan
mutasi, serta cookie sesi dengan path `/api/v1/admin`. Konsekuensinya:

- **Development**: Vite mem-proxy `/api` ke `VITE_API_TARGET` dan menulis ulang header
  `Origin` menjadi origin target (lihat `vite.config.ts`). Nilai `VITE_API_TARGET` harus sama
  dengan `PUBLIC_BASE_URL` backend (`localhost` dan `127.0.0.1` adalah origin berbeda).
- **Production**: sajikan hasil `dist/` dan API pada origin yang sama (reverse proxy),
  misalnya `/` -> static SPA (fallback ke `index.html`), `/api` -> FastAPI. Jangan
  menulis ulang `Origin` di production; jangan mengaktifkan CORS lintas-origin.

## Struktur

```
src/
  api/            admin.ts (semua endpoint admin), checkout.ts (API publik checkout)
  lib/            http.ts (fetch + ApiError + CSRF in-memory), format, status, permissions, paymentLogos
  stores/         auth (me/permission), theme (light/dark/system), toast
  composables/    usePaged (limit/offset/has_more), useConfirm (dialog promise)
  components/ui/  komponen reusable (lihat bawah)
  components/admin/ ClientForm + clientFormModel (validasi & mapping payload)
  components/charts/ AppChart (ApexCharts theme-aware)
  layouts/        AdminLayout (sidebar desktop, drawer mobile), nav.ts (menu + permission)
  views/          auth, admin/*, checkout, Forbidden, NotFound
```

## Komponen reusable

| Komponen                                                                                                               | Kegunaan                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DataTable`                                                                                                            | Tabel generik: kolom, slot `cell-<key>`, slot `actions`/`toolbar`/`filters`, skeleton, empty/error/forbidden state, tampilan kartu di mobile, pencarian, pagination offset + `has_more`, pilihan jumlah baris. Terima `paged` dari `usePaged` atau `rows` statis. |
| `usePaged`                                                                                                             | State pagination; reset otomatis saat filter berubah; abaikan respons usang.                                                                                                                                                                                      |
| `AppModal`                                                                                                             | Dialog (bottom-sheet di mobile), focus trap, Escape, `persistent` saat submit.                                                                                                                                                                                    |
| `ConfirmDialog` + `useConfirm()`                                                                                       | Konfirmasi berbasis promise: daftar dampak, input alasan (audit), dan **double confirmation** `typeToConfirm` (ketik kode/nomor).                                                                                                                                 |
| `SecretModal`                                                                                                          | Tampilan kredensial sekali (client_secret/callback_secret): masked, salin eksplisit, wajib centang "sudah disimpan", dihapus dari state saat ditutup.                                                                                                             |
| `ToastContainer` + `useToastStore()`                                                                                   | Toast sukses/error/warning/info; `apiError()` menampilkan pesan aman + `request_id`.                                                                                                                                                                              |
| `AppCard`, `StatCard`                                                                                                  | Kartu konten dan kartu metrik (dengan skeleton).                                                                                                                                                                                                                  |
| `StateView`                                                                                                            | Empty / error (dengan request_id + retry) / forbidden / not found.                                                                                                                                                                                                |
| `SkeletonBlock`, `.skeleton`                                                                                           | Skeleton shimmer; `SplashLoader` untuk boot aplikasi.                                                                                                                                                                                                             |
| `AppButton`, `AppBadge`, `AppSwitch`, `AppTabs`, `FormField`, `PageHeader`, `CopyButton`, `ThemeToggle`, `PaymentLogo` | Primitive UI.                                                                                                                                                                                                                                                     |

Contoh tabel:

```vue
<script setup lang="ts">
const paged = usePaged<Client>((q) => clientsApi.list(q))
const columns: Column[] = [
  { key: 'name', label: 'Portal' },
  { key: 'active', label: 'Status' },
]
</script>
<template>
  <DataTable :columns="columns" :paged="paged" searchable :search-keys="['name', 'code']">
    <template #cell-active="{ value }"
      ><AppBadge :tone="value ? 'success' : 'neutral'">…</AppBadge></template
    >
    <template #actions="{ row }"><AppButton size="sm" @click="edit(row)">Ubah</AppButton></template>
  </DataTable>
</template>
```

Contoh konfirmasi ganda:

```ts
const res = await confirm({ title: 'Rotasi secret?', impacts: [...], reason: true, typeToConfirm: client.code })
if (res) await clientsApi.rotateSecret(id, client.version, res.reason)
```

## Pemetaan halaman ke API

| Route                   | Permission                                  | Endpoint                                                                                                   |
| ----------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/admin/login`          | -                                           | `POST /admin/auth/login`, `GET /admin/auth/me`                                                             |
| `/admin`                | - (metrik hanya jika `admin.payments.read`) | `GET /admin/payments/summary`, `GET /admin/payments`                                                       |
| `/admin/payments`       | `admin.payments.read`                       | `GET /admin/payments` (search + filter status/reference/client/event/tanggal); export memakai `/export`    |
| `/admin/payments/:id`   | `admin.payments.read`                       | detail, `/history`, `/attempts`; `POST /admin/reconciliation/{attempt}/request`; `GET/POST /admin/refunds` |
| `/admin/reconciliation` | `admin.reconciliation.read`                 | `GET /admin/reconciliation`                                                                                |
| `/admin/refunds`        | `admin.refunds.read`                        | list, `POST /{id}/approve`, `POST /{id}/reject`                                                            |
| `/admin/clients`        | `admin.clients.read`                        | list, `POST` (create + SecretModal)                                                                        |
| `/admin/clients/:id`    | `admin.clients.read`                        | detail, `PATCH`, `rotate-secret`, `revoke-checkouts`, tab services/events/portal-users                     |
| `/admin/users`          | `admin.users.read`                          | list, `POST`, `PATCH`, `revoke-sessions`                                                                   |
| `/admin/roles`          | `admin.roles.read`                          | `GET /admin/roles` (matriks read-only)                                                                     |
| `/admin/audit`          | `admin.audit.read`                          | `GET /admin/audit`                                                                                         |
| `/p/:paymentNo`         | checkout token                              | API `/public/payments/...`                                                                                 |

Menu "Pengaturan" ditampilkan sebagai "Segera" karena backend belum tersedia.

## Aturan keamanan yang diterapkan

- Sesi admin hanya cookie HttpOnly; `csrf_token` disimpan di memory dan dikirim sebagai
  `X-CSRF-Token` pada mutasi `/admin/*`. Reload selalu memanggil `GET /auth/me`.
- Tidak ada password/token di localStorage/sessionStorage. localStorage hanya menyimpan
  preferensi tema. Password form dikosongkan setelah submit.
- Route guard memeriksa permission pada direct URL (default deny) dan menu disembunyikan
  sesuai permission efektif.
- 401 -> state dibersihkan, redirect login (`redirect` hanya diterima bila diawali `/admin`).
  403 -> forbidden tanpa logout. 409 version conflict -> muat ulang dan minta konfirmasi ulang.
  422 -> error per field dari `details`. 429 -> hitung mundur `Retry-After`.
- Tidak ada auto-retry mutasi; tombol dinonaktifkan saat submit.
- Mutasi mengirim `expected_version` dari data terakhir dan `reason` untuk audit.
- Refund: tombol approve disembunyikan untuk pengaju sendiri (backend tetap menolak
  `REFUND_SELF_APPROVAL`).
- Tab Pembayar (PII) dimuat hanya saat dibuka karena setiap akses diaudit.

### Checkout (`/p/:paymentNo`)

Mengikuti FRONTEND_INTEGRATION.md: token dibaca dari fragment `#token=`, disimpan di
sessionStorage per payment, lalu fragment dihapus via `history.replaceState`.
Redirect Midtrans hanya ke HTTPS `app.midtrans.com`/`app.sandbox.midtrans.com`; link
instruksi DOKU hanya HTTPS. UI tidak menandai PAID dari redirect/klik; status hanya dari API.
Backend juga menyajikan halaman checkout bawaan di `/p/{payment_no}`; bila SPA ini dipakai
di origin yang sama, atur reverse proxy agar `/p/*` diarahkan ke SPA. Jangan memasang
analytics/script pihak ketiga pada halaman checkout.

## Logo channel

`lib/paymentLogos.ts` memetakan `channel_code` ke logo berdasarkan kata kunci
(mis. `DOKU_INDOMARET` -> indomaret, `*_BCA*` -> bca, `MIDTRANS_SNAP` -> VA multi bank).
Tambah logo baru: taruh PNG di `src/assets/images/payment/` lalu tambahkan aturan di `RULES`.
Logo selalu dirender di atas chip putih agar tetap terbaca di dark mode.

## Batasan yang diketahui

- Payment mendukung pencarian server-side melalui parameter `search` dan mengembalikan
  `meta.total_count`; pagination tetap memakai `has_more` sebagai sumber tombol next.
- Endpoint export payment menggunakan cursor: `GET /admin/payments/export` dengan filter
  yang sama termasuk `search`, `limit` maksimal 5000, serta `cursor` dari `meta.next_cursor`.
- Dashboard hanya memakai agregasi `summary` (per status & per client); belum ada deret
  waktu. Setiap pemuatan summary tercatat `PAYMENT_SUMMARY_VIEWED` di audit.
- MFA, role editor, settings, dan export CSV belum diimplementasikan di UI.
- ApexCharts di-import secara tree-shaken (`vue3-apexcharts/core` + `apexcharts/donut`,
  `apexcharts/bar`, `apexcharts/radialBar`, `apexcharts/features/legend`) di
  `components/charts/AppChart.vue`. Jenis chart/fitur baru (mis. `line`, `area`,
  `features/toolbar`) harus di-import di file tersebut. `vite.config.ts` memecah
  ApexCharts menjadi chunk `vendor-charts` (maks ~400 kB) yang hanya dimuat saat
  Dashboard dibuka.
