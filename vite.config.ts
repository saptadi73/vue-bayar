import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_TARGET || 'http://localhost:8000'

  return {
    plugins: [vue(), tailwindcss(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vendor-charts',
                test: /node_modules[\\/]apexcharts[\\/]/,
                maxSize: 400_000,
              },
            ],
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          configure: (proxy) => {
            // Dev only: backend requires Origin to equal PUBLIC_BASE_URL (same-origin contract).
            proxy.on('proxyReq', (req) => {
              if (req.getHeader('origin')) req.setHeader('origin', new URL(target).origin)
            })
          },
        },
      },
    },
  }
})
