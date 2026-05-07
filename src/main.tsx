import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import './index.css'
import App from './App.tsx'
import { AnimeListProvider } from './context/AnimeListContext.tsx'
import { AuthProvider } from './context/AuthContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AnimeListProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#09090b',
              color: '#f4f4f5',
              border: '1px solid #27272a',
            },
          }}
        />
      </AnimeListProvider>
    </AuthProvider>
  </StrictMode>,
)
