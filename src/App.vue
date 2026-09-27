<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import SplashLoader from '@/components/ui/SplashLoader.vue'

const route = useRoute()
// Before the first navigation (session check) resolves, route is the START_LOCATION.
const booting = computed(() => !route.matched.length && route.path === '/')
</script>

<template>
  <SplashLoader v-if="booting" />
  <RouterView v-else />
  <ToastContainer />
  <ConfirmDialog />
</template>
