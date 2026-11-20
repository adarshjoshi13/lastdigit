import { useState, useRef } from 'react';
import type { LotteryType } from '../App';
import { uploadLotteryResult } from '../api';
import type { Session } from '../api';
import './Form.css';

interface Props {
  lotteryType: LotteryType;
  onBack: () => void;
}

const LABEL = { singapore: 'Singapore', dear: 'Dear' };
const SESSIONS: { value: Session; label: string }[] = [
  { value: 'morning', label: '🌅 Morning' },
  { value: 'day', label: '☀️ Day' },
  { value: 'evening', label: '🌆 Evening' },
];

const today = () => new Date().toISOString().split('T')[0];

export default function UploadFax({ lotteryType, onBack }: Props) {
  const [drawDate, setDrawDate] = useState(today());
  const [session, setSession] = useState<Session>('morning');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = (file: File | null) => {
    setImage(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      setStatus('error');
      setMessage('Please select a fax image to upload.');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const res = await uploadLotteryResult(lotteryType, {
        drawDate,
        session,
        resultImage: image,
      });
      setStatus('success');
      setMessage(res.message || 'Fax uploaded successfully!');
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Upload failed.');
    }
  };

  const reset = () => {
    setStatus('idle');
    setMessage('');
    setImage(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="form-page">
      <header className="form-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">
          ← Back
        </button>
        <div>
          <h1 className="form-title">{LABEL[lotteryType]} Lottery</h1>
          <p className="form-subtitle">Upload Fax / Image</p>
        </div>
      </header>

      <form className="form-body" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label">Draw Date</label>
          <input
            type="date"
            className="field-input"
            value={drawDate}
            onChange={e => setDrawDate(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="field-label">Session</label>
          <div className="session-row">
            {SESSIONS.map(s => (
              <button
                key={s.value}
                type="button"
                className={`session-btn${session === s.value ? ' active' : ''}`}
                onClick={() => setSession(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">Fax / Image <span className="required">*</span></label>
          <div
            className="dropzone dropzone-large"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleImage(f);
            }}
          >
            {preview ? (
              <img src={preview} alt="fax preview" className="img-preview" />
            ) : (
              <div className="dropzone-hint-block">
                <span className="dropzone-icon">🖼️</span>
                <span className="dropzone-hint">Tap to choose fax image</span>
                <span className="dropzone-sub">JPG, PNG, WebP supported</span>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => handleImage(e.target.files?.[0] ?? null)}
          />
          {image && (
            <button type="button" className="clear-img-btn" onClick={() => { handleImage(null); if (fileRef.current) fileRef.current.value = ''; }}>
              ✕ Remove image
            </button>
          )}
        </div>

        {message && (
          <div className={`alert alert-${status}`}>
            {status === 'success' ? '✅ ' : status === 'error' ? '❌ ' : ''}{message}
          </div>
        )}

        {status === 'success' ? (
          <button type="button" className="submit-btn" onClick={reset}>
            Upload Another
          </button>
        ) : (
          <button type="submit" className="submit-btn btn-fax-color" disabled={status === 'loading'}>
            {status === 'loading' ? 'Uploading…' : 'Upload Fax'}
          </button>
        )}
      </form>
    </div>
  );
}

