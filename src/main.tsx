import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BlinkUIProvider, Toaster } from '@blinkdotnew/ui'
import { BlinkProvider } from '@blinkdotnew/react'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BlinkProvider projectId={import.meta.env.VITE_BLINK_PROJECT_ID}>
        <BlinkUIProvider theme="midnight" darkMode="dark">
          <Toaster position="top-right" />
          <AuthProvider>
            <App />
          </AuthProvider>
        </BlinkUIProvider>
      </BlinkProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
