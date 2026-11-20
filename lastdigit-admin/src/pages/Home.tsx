import type { LotteryType, Screen } from '../App';
import './Home.css';

interface Props {
  onNavigate: (screen: Screen, type: LotteryType) => void;
}

export default function Home({ onNavigate }: Props) {
  return (
    <div className="home">
      <header className="home-header">
        <div className="home-logo">🎯</div>
        <h1 className="home-title">LastDigit Admin</h1>
        <p className="home-sub">Select lottery type and action</p>
      </header>

      <section className="home-section">
        <h2 className="section-label">Singapore Lottery</h2>
        <div className="btn-group">
          <button
            className="action-btn btn-result"
            onClick={() => onNavigate('upload-result', 'singapore')}
          >
            <span className="btn-icon">📋</span>
            <span className="btn-text">
              <strong>Upload Result</strong>
              <small>Enter digits + optional image</small>
            </span>
          </button>
          <button
            className="action-btn btn-fax"
            onClick={() => onNavigate('upload-fax', 'singapore')}
          >
            <span className="btn-icon">🖼️</span>
            <span className="btn-text">
              <strong>Upload Fax</strong>
              <small>Upload fax / result image only</small>
            </span>
          </button>
        </div>
      </section>

      <section className="home-section">
        <h2 className="section-label">Dear Lottery</h2>
        <div className="btn-group">
          <button
            className="action-btn btn-result"
            onClick={() => onNavigate('upload-result', 'dear')}
          >
            <span className="btn-icon">📋</span>
            <span className="btn-text">
              <strong>Upload Result</strong>
              <small>Enter digits + optional image</small>
            </span>
          </button>
          <button
            className="action-btn btn-fax"
            onClick={() => onNavigate('upload-fax', 'dear')}
          >
            <span className="btn-icon">🖼️</span>
            <span className="btn-text">
              <strong>Upload Fax</strong>
              <small>Upload fax / result image only</small>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}

