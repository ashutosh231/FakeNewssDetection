import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const nvidiaKey = env.VITE_NVIDIA_API_KEY

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Dev-only proxy — mirrors the Netlify function at /.netlify/functions/nvidia-proxy
        // so LiveNews and the RAG chain can call one unified URL in both envs.
        '/nvidia-proxy': {
          target: 'https://integrate.api.nvidia.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/nvidia-proxy/, '/v1/chat/completions'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (nvidiaKey) {
                proxyReq.setHeader('Authorization', `Bearer ${nvidiaKey}`)
              }
            })
          },
        },
      },
    },
  }
})
