import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const SUPABASE = 'awhdvohpmqhjoosemzxv.supabase.co'

// Paketlenmiş uygulamaya güvenlik politikası (CSP) ekler.
// Sadece kendi dosyalarımız ve Supabase'e bağlanılabilir.
const csp = {
  name: 'csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<head>',
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; connect-src 'self' https://${SUPABASE} wss://${SUPABASE}">`
    ),
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), csp],
  // Uygulama diskten yüklendiği için tek dosya sorun değil; uyarı sınırını yükseltiyoruz.
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 900 },
})
