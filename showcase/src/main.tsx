import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

// The kit's dark theme is an attribute the host sets; here the host is the OS colour scheme.
const scheme = window.matchMedia('(prefers-color-scheme: dark)')
const applyTheme = () => {
  document.documentElement.dataset.golemTheme = scheme.matches ? 'dark' : 'light'
}
applyTheme()
scheme.addEventListener('change', applyTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
