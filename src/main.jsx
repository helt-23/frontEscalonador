import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './tela/escalonador'
import './main.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
