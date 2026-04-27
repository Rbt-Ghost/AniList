import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/jikan": {
        target: "https://api.jikan.moe",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/jikan/, ""),
      },
    },
  },
});
