import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// 1. Import the AuthGate component
import AuthGate from './AuthGate.jsx' 

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 2. Replace <App /> with <AuthGate /> */}
    <AuthGate /> 
  </StrictMode>,
)