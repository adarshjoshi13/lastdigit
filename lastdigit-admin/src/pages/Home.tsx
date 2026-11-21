import type { Screen } from '../App';
import './Home.css';

interface Props {
  onNavigate: (screen: Screen) => void;
}

export default function Home({ onNavigate }: Props) {
  return (
    <div className="home">
      <header className="home-header">
        <div className="home-logo">🎯</div>
        <h1 className="home-title">LastDigit Admin</h1>
        <p className="home-sub">Select an action to proceed</p>
      </header>

      <section className="home-section">
        <div className="btn-group">
          <button
            className="action-btn btn-result mb-4"
            onClick={() => onNavigate('upload-result')}
          >
            <span className="btn-icon">📋</span>
            <span className="btn-text">
              <strong>Upload Result</strong>
              <small>Select date, session, digit type & winning number</small>
            </span>
          </button>

          <button
            className="action-btn btn-fax"
            onClick={() => onNavigate('upload-fax')}
          >
            <span className="btn-icon">🖼️</span>
            <span className="btn-text">
              <strong>Upload Fax</strong>
              <small>Upload 512 × 696 fax result image</small>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
