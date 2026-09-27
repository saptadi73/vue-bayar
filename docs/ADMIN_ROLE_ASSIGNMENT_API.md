# Role dan Client Assignment

Endpoint aktif:

- `GET /admin/roles`
- `PATCH /admin/roles/{code}` dengan `display_name`, `permissions`,
  `expected_version`, dan `reason`
- `POST /admin/users/{user_id}/clients` dengan `client_id` dan `reason`

Permission tidak dikenal ditolak. Perubahan role menyimpan audit before/after.
Admin non-SUPER_ADMIN yang mengakses path client wajib memiliki assignment aktif;
assignment dikirim pada `GET /admin/auth/me` sebagai `access_scope.client_ids`.
SUPER_ADMIN memiliki scope semua client.

User dengan `force_password_change` dibatasi ke endpoint password change sampai
password baru berhasil disimpan.

UI Role & Izin memakai `rolesApi.update`; UI Pengguna Admin menyediakan tombol MFA akun
sendiri dan menampilkan recovery code satu kali. Detail client menyediakan tab Gateway &
Channel untuk merchant account, payment channel, routing rule, dan feature flag.
