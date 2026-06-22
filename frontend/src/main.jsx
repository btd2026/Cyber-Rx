import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/cyberrx-design-tokens.css'
import './styles/situation-room.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { initialTheme, applyTheme } from './theme/useTheme.js'

// Apply the resolved theme before first paint to avoid a flash of the wrong theme.
applyTheme(initialTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
