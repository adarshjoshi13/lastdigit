import { useEffect } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import HomePage from './pages/homePage'
import TodayResultPage from './pages/todayLottery'
import SingaporeResultsPage from './pages/singaporeLottery'
import DearResultsPage from './pages/dearLottery'
import LotteryFaxPage from './pages/lotteryFax'
import PrivacyPage from './pages/privacyPage'
import './style.css'

/**
 * HashRouter is required for Capacitor/WebView:
 * BrowserRouter relies on a real web server to handle deep links (e.g. /singapore),
 * which doesn't exist in an APK. HashRouter keeps everything client-side (#/singapore).
 */
function AppRoutes() {
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return

        let removeListener: (() => void) | undefined

        CapApp.addListener('backButton', () => {
            if (location.pathname === '/' || location.pathname === '') {
                CapApp.exitApp()
            } else {
                navigate(-1)
            }
        }).then((handle) => {
            removeListener = () => handle.remove()
        }).catch(() => {})

        return () => {
            if (removeListener) removeListener()
        }
    }, [navigate, location])

    return (
        <div className="mobile-frame">
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/today" element={<TodayResultPage />} />
                <Route path="/singapore" element={<SingaporeResultsPage />} />
                <Route path="/dear" element={<DearResultsPage />} />
                <Route path="/fax" element={<LotteryFaxPage />} />
                <Route path="/lottery-fax" element={<LotteryFaxPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
            </Routes>
        </div>
    )
}

function App() {
    return (
        <HashRouter>
            <AppRoutes />
        </HashRouter>
    )
}

export default App
