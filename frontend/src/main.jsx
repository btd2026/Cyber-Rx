import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/cyberrx-design-tokens.css'
import './styles/situation-room.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { initialTheme, applyTheme } from './situation-room/useTheme.js'

// Apply the saved situation-room theme before first paint (no flash).
applyTheme(initialTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
