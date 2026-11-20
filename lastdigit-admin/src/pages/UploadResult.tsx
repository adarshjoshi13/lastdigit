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

export default function UploadResult({ lotteryType, onBack }: Props) {
  const [drawDate, setDrawDate] = useState(today());
  const [session, setSession] = useState<Session>('morning');
  const [singleDigit, setSingleDigit] = useState('');
  const [doubleDigit, setDoubleDigit] = useState('');
  const [tripleDigit, setTripleDigit] = useState('');
  const [drawNumber, setDrawNumber] = useState('');
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
    if (!drawDate || !session) {
      setStatus('error');
      setMessage('Date and session are required.');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const res = await uploadLotteryResult(lotteryType, {
        drawDate,
        session,
        singleDigit: singleDigit || undefined,
        doubleDigit: doubleDigit || undefined,
        tripleDigit: tripleDigit || undefined,
        drawNumber: drawNumber || undefined,
        resultImage: image,
      });
      setStatus('success');
      setMessage(res.message || 'Uploaded successfully!');
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Upload failed.');
    }
  };

  const reset = () => {
    setStatus('idle');
    setMessage('');
    setSingleDigit('');
    setDoubleDigit('');
    setTripleDigit('');
    setDrawNumber('');
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
          <p className="form-subtitle">Upload Result</p>
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

        <div className="digits-row">
          <div className="field">
            <label className="field-label">Single Digit</label>
            <input
              type="text"
              className="field-input digit-input"
              placeholder="e.g. 7"
              maxLength={2}
              value={singleDigit}
              onChange={e => setSingleDigit(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">Double Digit</label>
            <input
              type="text"
              className="field-input digit-input"
              placeholder="e.g. 27"
              maxLength={3}
              value={doubleDigit}
              onChange={e => setDoubleDigit(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">Triple Digit</label>
            <input
              type="text"
              className="field-input digit-input"
              placeholder="e.g. 827"
              maxLength={4}
              value={tripleDigit}
              onChange={e => setTripleDigit(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label">Draw Number <span className="optional">(optional)</span></label>
          <input
            type="text"
            className="field-input"
            placeholder="Reference / batch number"
            value={drawNumber}
            onChange={e => setDrawNumber(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">Result Image <span className="optional">(optional)</span></label>
          <div
            className="dropzone"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleImage(f);
            }}
          >
            {preview ? (
              <img src={preview} alt="preview" className="img-preview" />
            ) : (
              <span className="dropzone-hint">📁 Tap to choose or drag image here</span>
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
          <button type="submit" className="submit-btn" disabled={status === 'loading'}>
            {status === 'loading' ? 'Uploading…' : 'Submit Result'}
          </button>
        )}
      </form>
    </div>
  );
}

