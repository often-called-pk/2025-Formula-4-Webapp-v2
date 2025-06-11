import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import { RacingTestRunner } from './components/ui/testing-utils'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" storageKey="f4-ui-theme">
        <RacingTestRunner enablePerformanceTests={true} enableA11yTests={true}>
          <App />
        </RacingTestRunner>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
