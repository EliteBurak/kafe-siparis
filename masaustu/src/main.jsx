import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/karla/400.css'
import '@fontsource/karla/500.css'
import '@fontsource/karla/600.css'
import '@fontsource/karla/700.css'
import './index.css'
import App from './App'
import { UyariSaglayici } from './components/ui'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UyariSaglayici>
      <App />
    </UyariSaglayici>
  </StrictMode>
)
