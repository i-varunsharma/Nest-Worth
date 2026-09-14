import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'
import ErrorBoundary from './components/shared/ErrorBoundary.jsx'

/*
  Where the React app starts. It finds the empty <div id="root"> in index.html
  and draws everything inside it.

  StrictMode is a development-only check. It runs effects twice to make it obvious
  when one is not safe to run again, which is why hooks/useAsyncData.js ignores
  answers from an earlier run. It does nothing in a build.

  ErrorBoundary goes outside App rather than inside, so a crash in the router
  itself is caught too.
*/
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
