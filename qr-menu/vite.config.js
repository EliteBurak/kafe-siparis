import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const SUPABASE = 'awhdvohpmqhjoosemzxv.supabase.co'

// Yayınlanan sayfaya güvenlik politikası (CSP): sadece kendi dosyalarımız ve Supabase.
// GitHub Pages başlık eklemeye izin vermediği için meta etiketiyle ekleniyor.
const csp = {
  name: 'csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<head>',
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src https://${SUPABASE}; base-uri 'none'; form-action 'none'">\n    <meta name="referrer" content="no-referrer">`
    ),
}

// base './' sayesinde site hangi adreste yayınlanırsa (GitHub Pages, Netlify…) çalışır
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), csp],
})
