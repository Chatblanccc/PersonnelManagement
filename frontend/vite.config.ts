import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const devPort = Number(env.VITE_DEV_SERVER_PORT) || 5173
  const useProxy = env.VITE_DEV_USE_PROXY === 'true'
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8000'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: devPort,
      proxy: useProxy
        ? {
            '/api': {
              target: proxyTarget,
              changeOrigin: true,
              secure: false,
              configure: (proxy) => {
                proxy.on('proxyRes', (_, __, res) => {
                  res.setHeader('Access-Control-Allow-Origin', env.VITE_DEV_PROXY_ORIGIN || `http://localhost:${devPort}`)
                  res.setHeader('Access-Control-Allow-Credentials', 'true')
                  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
                })
              },
            },
          }
        : undefined,
    },
  }
})

