import { MantineProvider } from '@mantine/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { theme } from './theme.ts'
import '@mantine/core/styles.css'
import './print.css'

const colorSchemeManager = {
  get: (defaultValue: 'light' | 'dark' | 'auto') => defaultValue,
  set: () => {},
  subscribe: () => {},
  unsubscribe: () => {},
  clear: () => {},
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} forceColorScheme="light" colorSchemeManager={colorSchemeManager}>
      <App />
    </MantineProvider>
  </StrictMode>,
)
