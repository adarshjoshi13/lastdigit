import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/homePage'
import TodayResultPage from './pages/todayLottery'
import SingaporeResultsPage from './pages/singaporeLottery'
import DearResultsPage from './pages/dearLottery'
import PrivacyPage from './pages/privacyPage'
import './style.css'

function App() {
    return (
        <BrowserRouter>
            <div className="mobile-frame">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/today" element={<TodayResultPage />} />
                    <Route path="/singapore" element={<SingaporeResultsPage />} />
                    <Route path="/dear" element={<DearResultsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                </Routes>
            </div>
        </BrowserRouter>
    )
}

export default App
