<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
</script>

<template>
  <div class="relative grid min-h-dvh place-items-center overflow-hidden px-6">
    <div class="absolute top-4 right-4"><ThemeToggle compact /></div>
    <div
      class="absolute top-1/3 left-1/2 size-96 -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl"
    />
    <div class="relative text-center">
      <p
        class="bg-gradient-to-br from-brand-500 to-violet-600 bg-clip-text text-8xl font-extrabold tracking-tighter text-transparent"
      >
        404
      </p>
      <h1 class="mt-3 text-xl font-bold text-slate-900 dark:text-white">Halaman tidak ditemukan</h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Alamat yang Anda buka tidak tersedia.
      </p>
      <RouterLink to="/admin" class="mt-6 inline-block"
        ><AppButton>Kembali ke Dashboard</AppButton></RouterLink
      >
    </div>
  </div>
</template>
