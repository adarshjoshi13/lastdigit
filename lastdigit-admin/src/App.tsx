import { useState } from 'react';
import Home from './pages/Home';
import UploadResult from './pages/UploadResult';
import UploadFax from './pages/UploadFax';
import './App.css';

export type LotteryType = 'singapore' | 'dear';
export type Screen = 'home' | 'upload-result' | 'upload-fax';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [lotteryType, setLotteryType] = useState<LotteryType>('singapore');

  const goHome = () => setScreen('home');
  const navigate = (s: Screen) => setScreen(s);

  return (
    <div className="app">
      {screen === 'home' && <Home onNavigate={navigate} />}
      {screen === 'upload-result' && (
        <UploadResult
          lotteryType={lotteryType}
          onChangeLotteryType={setLotteryType}
          onBack={goHome}
        />
      )}
      {screen === 'upload-fax' && (
        <UploadFax
          lotteryType={lotteryType}
          onChangeLotteryType={setLotteryType}
          onBack={goHome}
        />
      )}
    </div>
  );
}
