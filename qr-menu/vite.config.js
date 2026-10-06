import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' sayesinde site hangi adreste yayınlanırsa (GitHub Pages, Netlify…) çalışır
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
