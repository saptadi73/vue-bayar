<script setup lang="ts">
import StateView from '@/components/ui/StateView.vue'
import AppButton from '@/components/ui/AppButton.vue'
</script>

<template>
  <div class="surface">
    <StateView
      type="forbidden"
      message="Akun Anda tidak memiliki izin untuk membuka halaman ini. Hubungi Super Admin bila Anda membutuhkan akses."
    >
      <template #action>
        <RouterLink to="/admin"
          ><AppButton variant="secondary" size="sm">Ke Dashboard</AppButton></RouterLink
        >
      </template>
    </StateView>
  </div>
</template>
