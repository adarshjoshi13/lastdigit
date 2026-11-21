import { useState, useRef, useEffect, useCallback } from 'react';
import type { LotteryType } from '../App';
import { uploadLotteryResult, getExistingDraw } from '../api';
import type { Session, ExistingDraw } from '../api';
import './Form.css';

interface Props {
  lotteryType: LotteryType;
  onChangeLotteryType: (type: LotteryType) => void;
  onBack: () => void;
}

const REQUIRED_WIDTH = 512;
const REQUIRED_HEIGHT = 696;

const SESSIONS: { value: Session; label: string }[] = [
  { value: 'morning', label: '🌅 Morning' },
  { value: 'day', label: '☀️ Day' },
  { value: 'evening', label: '🌆 Evening' },
];

const today = () => new Date().toISOString().split('T')[0];

export default function UploadFax({ lotteryType, onChangeLotteryType, onBack }: Props) {
  const [drawDate, setDrawDate] = useState(today());
  const [session, setSession] = useState<Session>('morning');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [existingDraw, setExistingDraw] = useState<ExistingDraw | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Refresh record after upload or reset
  const refreshExisting = useCallback(async (date: string, sess: Session) => {
    setIsChecking(true);
    try {
      const existing = await getExistingDraw(lotteryType, date, sess);
      setExistingDraw(existing);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setImage(null);
      setDimensions(null);
      if (fileRef.current) fileRef.current.value = '';
    } finally {
      setIsChecking(false);
    }
  }, [lotteryType]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    setIsChecking(true);
    getExistingDraw(lotteryType, drawDate, session, controller.signal)
      .then((existing) => {
        if (!isMounted) return;
        setExistingDraw(existing);
        setPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setImage(null);
        setDimensions(null);
        if (fileRef.current) fileRef.current.value = '';
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsChecking(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [drawDate, session, lotteryType]);

  // Inspect image dimensions when file is selected
  const handleImage = (file: File | null) => {
    setImage(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });

      const img = new Image();
      img.onload = () => {
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = url;
    } else {
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setDimensions(null);
    }
  };

  // One-click client auto-resize to exact 512x696 using HTML5 Canvas
  const handleAutoResize = () => {
    if (!preview) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = REQUIRED_WIDTH;
      canvas.height = REQUIRED_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw image scaled to exactly 512x696
      ctx.drawImage(img, 0, 0, REQUIRED_WIDTH, REQUIRED_HEIGHT);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const resizedFile = new File([blob], image?.name || 'fax-512x696.jpg', {
          type: 'image/jpeg',
        });
        setImage(resizedFile);
        setDimensions({ width: REQUIRED_WIDTH, height: REQUIRED_HEIGHT });
        const newUrl = URL.createObjectURL(resizedFile);
        setPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return newUrl;
        });
      }, 'image/jpeg', 0.92);
    };
    img.src = preview;
  };

  const isExactSize = dimensions && dimensions.width === REQUIRED_WIDTH && dimensions.height === REQUIRED_HEIGHT;

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
      setMessage(res.message || (existingDraw?.resultImage ? 'Fax updated successfully!' : 'Fax uploaded successfully!'));
      await refreshExisting(drawDate, session);
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Upload failed.');
    }
  };

  const reset = () => {
    setStatus('idle');
    setMessage('');
    refreshExisting(drawDate, session);
  };

  const hasExistingFax = Boolean(existingDraw?.resultImage);

  return (
    <div className="form-page">
      <header className="form-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">
          ← Back
        </button>
        <div>
          <h1 className="form-title">Upload Fax</h1>
          <p className="form-subtitle">Size: 512 × 696 px</p>
        </div>
      </header>

      <form className="form-body" onSubmit={handleSubmit}>
        {/* Lottery Switcher */}
        <div className="field">
          <label className="field-label">Lottery Type</label>
          <div className="lottery-tabs">
            <button
              type="button"
              className={`lottery-tab${lotteryType === 'singapore' ? ' active' : ''}`}
              onClick={() => onChangeLotteryType('singapore')}
            >
              🇸🇬 Singapore
            </button>
            <button
              type="button"
              className={`lottery-tab${lotteryType === 'dear' ? ' active' : ''}`}
              onClick={() => onChangeLotteryType('dear')}
            >
              🎯 Dear
            </button>
          </div>
        </div>

        {/* Draw Date */}
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

        {/* Session Tabs */}
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

        {/* Status Indicator */}
        <div className="status-indicator-wrap">
          {isChecking ? (
            <div className="status-badge checking">Checking session record…</div>
          ) : hasExistingFax ? (
            <div className="status-badge exists">
              🔄 <strong>Draw & Fax exist for this session</strong> — Current fax is displayed below. You can replace it anytime.
            </div>
          ) : existingDraw ? (
            <div className="status-badge exists">
              📝 <strong>Draw exists (digits recorded)</strong> — No fax image uploaded yet for this session.
            </div>
          ) : (
            <div className="status-badge new">
              ✨ <strong>No draw yet for this session</strong> — Uploading will <strong>CREATE</strong> it.
            </div>
          )}
        </div>

        {/* Fax Image Upload (512x696) */}
        <div className="field">
          <div className="field-label-row">
            <label className="field-label">
              Fax Image <span className="required">*</span>
            </label>
            <span className="dimension-spec">Required: 512 × 696 px</span>
          </div>

          {/* Unified Preview Container - Zero CLS / Layout Shift */}
          {preview ? (
            <div
              className="fax-preview-container"
              onClick={() => fileRef.current?.click()}
              title="Click to choose a different image"
            >
              <span className="fax-preview-badge">✨ New Fax Preview</span>
              <img src={preview} alt="New fax preview" className="fax-preview-img" />
              <button
                type="button"
                className="fax-preview-overlay-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  fileRef.current?.click();
                }}
              >
                🔄 Choose Different Image
              </button>
            </div>
          ) : hasExistingFax ? (
            <div
              className="fax-preview-container"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleImage(f);
              }}
              title="Click or drop an image to replace this fax"
            >
              <span className="fax-preview-badge">📁 Current Fax on File</span>
              <img src={existingDraw!.resultImage!} alt="Current fax sheet" className="fax-preview-img" />
              <button
                type="button"
                className="fax-preview-overlay-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  fileRef.current?.click();
                }}
              >
                🔄 Tap or Drop to Replace Fax
              </button>
            </div>
          ) : (
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
              <div className="dropzone-hint-block">
                <span className="dropzone-icon">🖼️</span>
                <span className="dropzone-hint">Tap to choose fax image</span>
                <span className="dropzone-sub">Size: 512 × 696 (JPG, PNG, WebP)</span>
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => handleImage(e.target.files?.[0] ?? null)}
          />

          {/* Dimension check & auto-resize action */}
          {dimensions && (
            <div className={`dimension-indicator ${isExactSize ? 'exact' : 'mismatch'}`}>
              {isExactSize ? (
                <span>✅ Exact Size: <strong>512 × 696 px</strong></span>
              ) : (
                <div className="dimension-mismatch-row">
                  <span>⚠️ Current Size: <strong>{dimensions.width} × {dimensions.height} px</strong> (Target: 512 × 696)</span>
                  <button
                    type="button"
                    className="auto-resize-btn"
                    onClick={handleAutoResize}
                  >
                    ⚡ Auto-fit to 512 × 696
                  </button>
                </div>
              )}
            </div>
          )}

          {image && (
            <button
              type="button"
              className="clear-img-btn"
              onClick={() => {
                handleImage(null);
                if (fileRef.current) fileRef.current.value = '';
              }}
            >
              {hasExistingFax ? '✕ Cancel / Keep current fax on file' : '✕ Remove chosen image'}
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
            Done / Add Another
          </button>
        ) : image ? (
          <button type="submit" className="submit-btn btn-fax-color" disabled={status === 'loading'}>
            {status === 'loading'
              ? (hasExistingFax ? 'Updating Fax…' : 'Uploading Fax…')
              : (hasExistingFax ? '🔄 Upload & Replace Fax' : 'Upload Fax')}
          </button>
        ) : hasExistingFax ? (
          <button
            type="button"
            className="submit-btn btn-secondary-outline"
            onClick={() => fileRef.current?.click()}
          >
            🔄 Select New Image to Replace Fax
          </button>
        ) : (
          <button
            type="button"
            className="submit-btn btn-fax-color"
            onClick={() => fileRef.current?.click()}
          >
            📁 Select Fax Image to Upload
          </button>
        )}
      </form>
    </div>
  );
}
