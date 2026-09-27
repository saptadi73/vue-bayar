<script setup lang="ts">
import { computed } from 'vue'
// Tree-shaken build: bare core plus only the chart types/features the dashboard uses.
import VueApexCharts from 'vue3-apexcharts/core'
import 'apexcharts/donut'
import 'apexcharts/bar'
import 'apexcharts/radialBar'
import 'apexcharts/features/legend'
import type { ApexOptions } from 'apexcharts'
import { useThemeStore } from '@/stores/theme'

const props = withDefaults(
  defineProps<{
    type: 'donut' | 'bar' | 'radialBar'
    series: ApexOptions['series']
    options?: ApexOptions
    height?: number | string
  }>(),
  { height: 300 },
)

const theme = useThemeStore()

const merged = computed<ApexOptions>(() => {
  const dark = theme.isDark
  const text = dark ? '#94a3b8' : '#64748b'
  const grid = dark ? '#1e293b' : '#f1f5f9'
  const o = props.options ?? {}
  return {
    ...o,
    chart: {
      fontFamily: 'Plus Jakarta Sans Variable, sans-serif',
      toolbar: { show: false },
      background: 'transparent',
      foreColor: text,
      animations: { enabled: true, speed: 500 },
      ...o.chart,
    },
    theme: { mode: dark ? 'dark' : 'light' },
    grid: { borderColor: grid, strokeDashArray: 4, ...o.grid },
    tooltip: { theme: dark ? 'dark' : 'light', ...o.tooltip },
    legend: { fontWeight: 500, labels: { colors: text }, ...o.legend },
    dataLabels: { enabled: false, ...o.dataLabels },
    stroke: {
      colors: props.type === 'donut' ? [dark ? '#0f172a' : '#ffffff'] : undefined,
      ...o.stroke,
    },
  }
})
</script>

<template>
  <VueApexCharts
    :key="theme.isDark ? 'd' : 'l'"
    :type="type"
    :series="series"
    :options="merged"
    :height="height"
  />
</template>
