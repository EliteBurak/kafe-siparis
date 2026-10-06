import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/karla/400.css'
import '@fontsource/karla/600.css'
import '@fontsource/karla/700.css'
import '@fontsource/playfair-display-sc/700.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
