import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// iOS Safari 忽略 user-scalable=no，这里拦住双指缩放整页
const preventGesture = (e: Event) => e.preventDefault()
document.addEventListener('gesturestart', preventGesture)
document.addEventListener('gesturechange', preventGesture)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
