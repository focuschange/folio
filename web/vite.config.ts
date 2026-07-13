import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  define: {
    // Injected at build time; shown in 도움말 > Folio 정보.
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
})
