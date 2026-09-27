# Admin Security Frontend Contract

Login mengirim `{ identifier, password, otp? }`. Jika MFA aktif tanpa OTP, backend
mengembalikan `ADMIN_MFA_REQUIRED`; tampilkan form OTP lalu ulangi login. Recovery code
dapat dipakai sebagai OTP satu kali.

Security API tersedia melalui `authApi.mfaEnroll`, `authApi.mfaConfirm`, dan
`authApi.reauthenticate` di `src/api/admin.ts`. Secret TOTP dan recovery code hanya
ditampilkan sekali; jangan simpan di localStorage/sessionStorage. Reauthentication
berlaku lima menit dan harus diminta ulang sebelum aksi sensitif.

Reset/invitation admin memakai token sekali pakai dari endpoint admin; UI tidak boleh
menaruh token tersebut di storage. Endpoint konfirmasi harus dipanggil melalui flow
undangan/reset yang dikirim lewat kanal aman operator.

Role editor memakai `rolesApi.update`, dan assignment client memakai
`usersApi.assignClient`; detail kontrak ada di `ADMIN_ROLE_ASSIGNMENT_API.md`.
