import { useState, useEffect, useCallback } from 'react';
import type { LotteryType } from '../App';
import { uploadLotteryResult, getExistingDraw } from '../api';
import type { Session, ExistingDraw } from '../api';
import './Form.css';

interface Props {
  lotteryType: LotteryType;
  onChangeLotteryType: (type: LotteryType) => void;
  onBack: () => void;
}

type DigitType = 'single' | 'double' | 'triple';

const SESSIONS: { value: Session; label: string }[] = [
  { value: 'morning', label: '🌅 Morning' },
  { value: 'day', label: '☀️ Day' },
  { value: 'evening', label: '🌆 Evening' },
];

const DIGIT_TYPES: { value: DigitType; label: string; maxLen: number; placeholder: string }[] = [
  { value: 'single', label: 'Single Digit (1 Digit)', maxLen: 1, placeholder: 'e.g. 7' },
  { value: 'double', label: 'Double Digit (2 Digits)', maxLen: 2, placeholder: 'e.g. 27' },
  { value: 'triple', label: 'Triple Digit (3 Digits)', maxLen: 3, placeholder: 'e.g. 827' },
];

const today = () => new Date().toISOString().split('T')[0];

export default function UploadResult({ lotteryType, onChangeLotteryType, onBack }: Props) {
  const [drawDate, setDrawDate] = useState(today());
  const [session, setSession] = useState<Session>('morning');
  const [digitType, setDigitType] = useState<DigitType>('single');
  const [digitNumber, setDigitNumber] = useState('');

  const [existingDraw, setExistingDraw] = useState<ExistingDraw | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Fetch existing draw for current (lottery, drawDate, session)
  const checkExisting = useCallback(async (date: string, sess: Session, signal?: AbortSignal) => {
    setIsChecking(true);
    const existing = await getExistingDraw(lotteryType, date, sess, signal);
    setExistingDraw(existing);

    // Pre-fill digit number based on current digitType
    if (existing) {
      if (digitType === 'single') setDigitNumber(existing.singleDigit || '');
      else if (digitType === 'double') setDigitNumber(existing.doubleDigit || '');
      else if (digitType === 'triple') setDigitNumber(existing.tripleDigit || '');
    } else {
      setDigitNumber('');
    }

    setIsChecking(false);
  }, [lotteryType, digitType]);

  useEffect(() => {
    const controller = new AbortController();
    checkExisting(drawDate, session, controller.signal);
    return () => {
      controller.abort();
    };
  }, [drawDate, session, lotteryType, checkExisting]);

  // When digitType changes, update input to match existing record if present
  const handleDigitTypeChange = (newType: DigitType) => {
    setDigitType(newType);
    if (existingDraw) {
      if (newType === 'single') setDigitNumber(existingDraw.singleDigit || '');
      else if (newType === 'double') setDigitNumber(existingDraw.doubleDigit || '');
      else if (newType === 'triple') setDigitNumber(existingDraw.tripleDigit || '');
    } else {
      setDigitNumber('');
    }
  };

  const currentConfig = DIGIT_TYPES.find(d => d.value === digitType) || DIGIT_TYPES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawDate || !session) {
      setStatus('error');
      setMessage('Date and session are required.');
      return;
    }
    if (!digitNumber.trim()) {
      setStatus('error');
      setMessage('Please enter the winning digit number.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const payload: {
        drawDate: string;
        session: Session;
        singleDigit?: string;
        doubleDigit?: string;
        tripleDigit?: string;
      } = {
        drawDate,
        session,
      };

      if (digitType === 'single') payload.singleDigit = digitNumber.trim();
      else if (digitType === 'double') payload.doubleDigit = digitNumber.trim();
      else if (digitType === 'triple') payload.tripleDigit = digitNumber.trim();

      const res = await uploadLotteryResult(lotteryType, payload);
      setStatus('success');
      setMessage(res.message || 'Result submitted successfully!');
      await checkExisting(drawDate, session);
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Upload failed.');
    }
  };

  const reset = () => {
    setStatus('idle');
    setMessage('');
    checkExisting(drawDate, session);
  };

  const isUpdate = Boolean(existingDraw);

  return (
    <div className="form-page">
      <header className="form-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">
          ← Back
        </button>
        <div>
          <h1 className="form-title">Upload Result</h1>
          <p className="form-subtitle">Enter winning digits</p>
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
          ) : isUpdate ? (
            <div className="status-badge exists">
              <div>
                🔄 <strong>Draw exists for this session</strong> — will <strong>UPDATE</strong>.
              </div>
              <div className="existing-digits-summary">
                Current: Single: <strong>{existingDraw?.singleDigit ?? '—'}</strong> | Double: <strong>{existingDraw?.doubleDigit ?? '—'}</strong> | Triple: <strong>{existingDraw?.tripleDigit ?? '—'}</strong>
              </div>
            </div>
          ) : (
            <div className="status-badge new">
              ✨ <strong>No draw yet for this session</strong> — will <strong>CREATE</strong> new record.
            </div>
          )}
        </div>

        {/* Digit Type Dropdown */}
        <div className="field">
          <label className="field-label">Digit Type</label>
          <select
            className="field-input field-select"
            value={digitType}
            onChange={e => handleDigitTypeChange(e.target.value as DigitType)}
          >
            {DIGIT_TYPES.map(d => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* Digit Number Input */}
        <div className="field">
          <label className="field-label">
            Winning Number ({currentConfig.maxLen} {currentConfig.maxLen === 1 ? 'Digit' : 'Digits'})
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="field-input digit-input large-digit"
            placeholder={currentConfig.placeholder}
            maxLength={currentConfig.maxLen}
            value={digitNumber}
            onChange={e => setDigitNumber(e.target.value.replace(/\D/g, ''))}
            required
          />
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
        ) : (
          <button type="submit" className="submit-btn" disabled={status === 'loading'}>
            {status === 'loading'
              ? (isUpdate ? 'Updating…' : 'Uploading…')
              : (isUpdate ? '🔄 Update Result' : 'Submit Result')}
          </button>
        )}
      </form>
    </div>
  );
}
