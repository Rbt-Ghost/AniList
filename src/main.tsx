import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './index.css'
import App from './App.tsx'
import { AnimeListProvider } from './context/AnimeListContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AnimeListProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AnimeListProvider>
  </StrictMode>,
)
