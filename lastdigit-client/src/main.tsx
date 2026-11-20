import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.tsx'

// ── Capacitor native setup (runs only on actual device/emulator) ──────────────
if (Capacitor.isNativePlatform()) {
  // Dark status bar to match app theme
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
  StatusBar.setBackgroundColor({ color: '#0f0f13' }).catch(() => {})

  // Hide the splash screen once the app is ready
  SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
