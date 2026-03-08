import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import 'leaflet/dist/leaflet.css'
import './styles/leaflet-overrides.css'
import './index.css'
import App from '@/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="miklat-run-theme"
    >
      <App />
    </ThemeProvider>
  </StrictMode>,
)
