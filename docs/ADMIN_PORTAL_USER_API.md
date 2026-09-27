# PortalUser Administration

Tab Portal User memakai endpoint admin tenant-scoped berikut:

- `GET /admin/clients/{client_id}/portal-users` dengan `admin.portal_users.read`.
- `POST /admin/clients/{client_id}/portal-users` dengan
  `{ email, name, reason }` dan `admin.portal_users.manage`.
- `PATCH /admin/clients/{client_id}/portal-users/{user_id}` dengan
  `{ name, expected_version, reason }`.
- `DELETE /admin/clients/{client_id}/portal-users/{user_id}` dengan
  `{ reason }`.

Email adalah identitas immutable dan dinormalisasi backend. Simpan `version` dari
response, lalu kirim sebagai `expected_version` saat edit. Bila menerima
`PORTAL_USER_VERSION_CONFLICT`, refresh detail sebelum mengulang. Delete dapat
menghasilkan `PORTAL_USER_DELETE_CONFLICT` jika user sudah dipakai transaksi.

Permission manage saat ini hanya diberikan kepada `SUPER_ADMIN`; UI harus
menyembunyikan tombol create/edit/delete bila `auth.can(P.portalUsersManage)` false.
Audit backend tidak menyimpan PII mentah, namun daftar PortalUser tetap merupakan
data PII dan jangan disimpan di localStorage.
