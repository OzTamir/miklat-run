import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './styles/leaflet-overrides.css'
import './index.css'
import App from '@/App'
import { useRouteStore } from '@/stores/route-store'

document.documentElement.classList.toggle(
  'dark',
  useRouteStore.getState().theme === 'dark',
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
