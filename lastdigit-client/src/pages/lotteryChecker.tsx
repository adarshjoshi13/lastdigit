import { type FormEvent, useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    getSingaporeLatest,
    getDearLatest,
    getLotteryByDate,
    type LatestLotteryResponse,
    type DrawItem,
} from '../api/client'

type ResultState = 'idle' | 'winner' | 'not-winner'
type LotteryChoice = 'singapore' | 'dear'
type SessionChoice = 'morning' | 'day' | 'evening'
type DigitChoice = 'single' | 'double' | 'triple'

// ── Google Material Design DatePicker Modal ──────────────────────────────────
interface GoogleDatePickerProps {
    isOpen: boolean
    initialDate: string // YYYY-MM-DD
    onClose: () => void
    onSelectDate: (date: string) => void
}

function GoogleDatePickerModal({
    isOpen,
    initialDate,
    onClose,
    onSelectDate,
}: GoogleDatePickerProps) {
    const parseInitial = () => {
        if (!initialDate) return new Date()
        const [y, m, d] = initialDate.split('-').map(Number)
        return new Date(y, m - 1, d || 1)
    }

    const [viewDate, setViewDate] = useState<Date>(parseInitial)
    const [selectedDate, setSelectedDate] = useState<string>(
        initialDate || new Date().toISOString().split('T')[0]
    )

    useEffect(() => {
        if (isOpen && initialDate) {
            setSelectedDate(initialDate)
            const [y, m, d] = initialDate.split('-').map(Number)
            setViewDate(new Date(y, m - 1, d || 1))
        }
    }, [isOpen, initialDate])

    if (!isOpen) return null

    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ]
    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayIndex = new Date(year, month, 1).getDay()

    const getFormattedHeaderDate = (isoStr: string) => {
        if (!isoStr) return ''
        const [y, m, d] = isoStr.split('-').map(Number)
        const dateObj = new Date(y, m - 1, d)
        return dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

    const handleDayClick = (dayNum: number) => {
        const mm = String(month + 1).padStart(2, '0')
        const dd = String(dayNum).padStart(2, '0')
        setSelectedDate(`${year}-${mm}-${dd}`)
    }

    const handleConfirm = () => {
        onSelectDate(selectedDate)
        onClose()
    }

    const todayIso = new Date().toISOString().split('T')[0]

    return (
        <div className="g-datepicker-backdrop" onClick={onClose} role="dialog" aria-modal="true">
            <div className="g-datepicker-dialog" onClick={(e) => e.stopPropagation()}>
                {/* ── Google Material 3 Header ── */}
                <header className="g-datepicker-header">
                    <span className="g-datepicker-eyebrow">Select date</span>
                    <h3 className="g-datepicker-headline">
                        {getFormattedHeaderDate(selectedDate) || 'Pick a date'}
                    </h3>
                </header>

                {/* ── Month & Year Navigation ── */}
                <div className="g-datepicker-controls">
                    <span className="g-datepicker-month-label">
                        {monthNames[month]} {year}
                    </span>
                    <div className="g-datepicker-nav-buttons">
                        <button
                            type="button"
                            className="g-datepicker-nav-btn"
                            onClick={prevMonth}
                            aria-label="Previous month"
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            className="g-datepicker-nav-btn"
                            onClick={nextMonth}
                            aria-label="Next month"
                        >
                            ›
                        </button>
                    </div>
                </div>

                {/* ── Weekdays row ── */}
                <div className="g-datepicker-weekdays">
                    {weekdays.map((w, i) => (
                        <span key={`${w}-${i}`}>{w}</span>
                    ))}
                </div>

                {/* ── Calendar Grid ── */}
                <div className="g-datepicker-grid">
                    {Array.from({ length: firstDayIndex }).map((_, i) => (
                        <span key={`empty-${i}`} className="g-day-empty" />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1
                        const mm = String(month + 1).padStart(2, '0')
                        const dd = String(dayNum).padStart(2, '0')
                        const currentDayIso = `${year}-${mm}-${dd}`
                        const isSelected = selectedDate === currentDayIso
                        const isToday = todayIso === currentDayIso

                        return (
                            <button
                                key={currentDayIso}
                                type="button"
                                className={`g-datepicker-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                                onClick={() => handleDayClick(dayNum)}
                            >
                                {dayNum}
                            </button>
                        )
                    })}
                </div>

                {/* ── Bottom action buttons ── */}
                <footer className="g-datepicker-actions">
                    <button type="button" className="g-datepicker-btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className="g-datepicker-btn-ok" onClick={handleConfirm}>
                        OK
                    </button>
                </footer>
            </div>
        </div>
    )
}

// ── Session metadata configuration ───────────────────────────────────────────
const SESSION_OPTIONS = [
    { value: 'morning' as const, label: 'Morning', badge: 'MOR' },
    { value: 'day' as const, label: 'Day', badge: 'DAY' },
    { value: 'evening' as const, label: 'Evening', badge: 'EVN' },
]

// ── Main LotteryChecker Component ────────────────────────────────────────────
export default function LotteryChecker() {
    const [lottery, setLottery] = useState<LotteryChoice>('singapore')
    const [sessionTime, setSessionTime] = useState<SessionChoice>('morning')
    const [digitType, setDigitType] = useState<DigitChoice>('single')
    const [digits, setDigits] = useState('')
    const [result, setResult] = useState<ResultState>('idle')
    const [matchedDetails, setMatchedDetails] = useState<string>('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    // Draw state
    const [drawDateIso, setDrawDateIso] = useState<string>('')
    const [drawDateFormatted, setDrawDateFormatted] = useState<string>('')
    const [sessions, setSessions] = useState<DrawItem[]>([])

    // Date picker state
    const [showDatePicker, setShowDatePicker] = useState(false)

    const inputRef = useRef<HTMLInputElement>(null)

    // ── Fetch latest draw initially or on lottery switch ───────────────────────
    useEffect(() => {
        let isMounted = true
        setLoading(true)
        setError('')
        setResult('idle')

        const fetchLatest = lottery === 'singapore' ? getSingaporeLatest : getDearLatest

        fetchLatest()
            .then((data: LatestLotteryResponse) => {
                if (isMounted && data.success) {
                    setDrawDateIso(data.drawDate)
                    setDrawDateFormatted(data.dateFormatted)
                    setSessions(data.sessions || [])
                }
            })
            .catch((err: unknown) => {
                console.error('Failed to load latest draw from server:', err)
                if (isMounted) {
                    setSessions([])
                    setDrawDateIso('')
                    setDrawDateFormatted('')
                }
            })
            .finally(() => {
                if (isMounted) setLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [lottery])

    // ── Handle Date Selection from Google DatePicker ───────────────────────────
    const handleSelectDate = async (newDateIso: string) => {
        setDrawDateIso(newDateIso)
        setLoading(true)
        setResult('idle')
        setError('')

        try {
            const data = await getLotteryByDate(lottery, newDateIso)
            if (data.success && Array.isArray(data.draws) && data.draws.length > 0) {
                setSessions(data.draws)
                setDrawDateFormatted(data.draws[0]?.dateFormatted || newDateIso)
            } else {
                setSessions([])
                const parts = newDateIso.split('-')
                if (parts.length === 3) {
                    const dateObj = new Date(
                        Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
                    )
                    setDrawDateFormatted(
                        dateObj.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: 'UTC',
                        })
                    )
                } else {
                    setDrawDateFormatted(newDateIso)
                }
            }
        } catch (err: unknown) {
            console.error('Failed to fetch draw for date:', err)
            setSessions([])
        } finally {
            setLoading(false)
        }
    }

    // ── Digit config based on selected digitType ──────────────────────────────
    const digitConfig = {
        single: {
            length: 1,
            label: 'Single digit',
            placeholder: '0',
            prefix: '•••• •••',
            hint: 'Enter 1 ending digit (0-9) to check against single-digit winners.',
        },
        double: {
            length: 2,
            label: 'Double digits',
            placeholder: '00',
            prefix: '•••• ••',
            hint: 'Enter 2 ending digits (00-99) to check against double-digit winners.',
        },
        triple: {
            length: 3,
            label: 'Triple digits',
            placeholder: '000',
            prefix: '•••• •',
            hint: 'Enter 3 ending digits (000-999) to check against triple-digit winners.',
        },
    }[digitType]

    const handleDigitTypeChange = (type: DigitChoice) => {
        setDigitType(type)
        const targetLen = type === 'single' ? 1 : type === 'double' ? 2 : 3
        setDigits((prev) => prev.slice(0, targetLen))
        setError('')
        setResult('idle')
    }

    const handleChange = (value: string) => {
        const nextValue = value.replace(/\D/g, '').slice(0, digitConfig.length)
        setDigits(nextValue)
        setError('')
        if (result !== 'idle') setResult('idle')
    }

    // Active session record for the chosen session time
    const activeSessionDraw = sessions.find((s) => s.session === sessionTime)

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault()

        if (digits.length !== digitConfig.length) {
            setError(
                `Please enter all ${digitConfig.length} digit${digitConfig.length > 1 ? 's' : ''
                }.`
            )
            setResult('idle')
            inputRef.current?.focus()
            return
        }

        const sTitle =
            sessionTime.charAt(0).toUpperCase() + sessionTime.slice(1)

        if (!activeSessionDraw) {
            setError(
                `No published ${sTitle} draw found for ${drawDateFormatted || drawDateIso}. Please choose another session or date.`
            )
            return
        }

        setError('')

        // Resolve winning number for the chosen digit type in this session
        let winningNumber: string | null = null
        if (digitType === 'single') winningNumber = activeSessionDraw.singleDigit
        if (digitType === 'double') winningNumber = activeSessionDraw.doubleDigit
        if (digitType === 'triple') winningNumber = activeSessionDraw.tripleDigit

        if (!winningNumber) {
            setError(
                `Winning ${digitConfig.label} has not been recorded yet for the ${sTitle} draw.`
            )
            return
        }

        if (digits === winningNumber) {
            setResult('winner')
            setMatchedDetails(
                `${sTitle} Draw  Official · Winning ${digitConfig.label}: ${winningNumber}`
            )
        } else {
            setResult('not-winner')
            setMatchedDetails(
                `Winning ${digitConfig.label} for ${sTitle} draw was: ${winningNumber}`
            )
        }
    }

    const reset = () => {
        setDigits('')
        setResult('idle')
        setError('')
        window.setTimeout(() => inputRef.current?.focus(), 0)
    }

    const drawDateDisplay =
        drawDateFormatted || (loading ? 'Loading live draw...' : 'No Date Selected')
    const lotteryNameDisplay =
        lottery === 'singapore' ? 'Singapore Lottery' : 'Dear Lottery'

    const currentSessionLabel =
        sessionTime.charAt(0).toUpperCase() + sessionTime.slice(1)

    return (
        <div className="app-shell">
            <header className="site-header">
                <Link className="brand" to="/" aria-label="Lucky Check home">
                    <span className="brand-mark">
                        <MarkIcon />
                    </span>
                    <span>Last Digit</span>
                </Link>
                <Link
                    className="results-link"
                    to={lottery === 'singapore' ? '/singapore' : '/dear'}
                >
                    View All Results →
                </Link>
            </header>

            <main>
                <section className="hero">
                    <div className="eyebrow">
                        <span className="live-dot" />
                        Live Ticket Checker
                    </div>
                    <h1>Did luck find you?</h1>
                    <p className="hero-copy">
                        Select your draw date, session time, and digit type to check your ticket against the official result.
                    </p>

                    {/* ── 1. Lottery Game Switcher (Singapore | Dear) ── */}
                    <div
                        className="digit-toggle game-toggle"
                        role="group"
                        aria-label="Choose lottery game"
                        style={{ margin: '0 0 1rem' }}
                    >
                        <button
                            className={lottery === 'singapore' ? 'active' : ''}
                            onClick={() => {
                                setLottery('singapore')
                                setResult('idle')
                                setError('')
                            }}
                            type="button"
                        >
                            <strong>Singapore</strong>
                            <span>Live Results</span>
                        </button>
                        <button
                            className={lottery === 'dear' ? 'active' : ''}
                            onClick={() => {
                                setLottery('dear')
                                setResult('idle')
                                setError('')
                            }}
                            type="button"
                        >
                            <strong>Dear Lottery</strong>
                            <span>Live Results</span>
                        </button>
                    </div>

                    <div className="checker-card">
                        {/* ── 2. Selectable Date Row (opens Google DatePicker) ── */}
                        <div className="draw-row">
                            <div className="draw-icon">
                                <CalendarIcon />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <span className="field-label">Checking draw for</span>
                                <strong
                                    style={{
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {drawDateDisplay}
                                </strong>
                                <span
                                    style={{
                                        display: 'block',
                                        fontSize: '0.65rem',
                                        color: 'var(--muted)',
                                    }}
                                >
                                    {lotteryNameDisplay} · {currentSessionLabel} Session
                                </span>
                            </div>
                            <button
                                type="button"
                                className="draw-status draw-change-btn"
                                onClick={() => setShowDatePicker(true)}
                                aria-label="Change draw date using Google date picker"
                            >
                                Change Date ▾
                            </button>
                        </div>

                        {/* ── 3. Small Session Selector ── */}
                        <div className="checker-session-row">

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>


                            </div>
                        </div>

                        {/* ── 4. Digit Type Toggle (Single | Double | Triple) ── */}
                        <div style={{ padding: '0.75rem 0.5rem 0.25rem' }}>

                            <div style={{ marginBottom: '5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <p
                                    style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        color: 'var(--muted)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        margin: 0,
                                    }}
                                >
                                    Choose Digit Type
                                </p>

                                <select
                                    id="session-select"
                                    className="session-small-select"
                                    value={sessionTime}
                                    onChange={(e) => {
                                        setSessionTime(e.target.value as SessionChoice)
                                        setResult('idle')
                                        setError('')
                                    }}
                                    aria-label="Select session time"
                                >
                                    {SESSION_OPTIONS.map((opt) => {
                                        const hasData = sessions.some(
                                            (s) => s.session === opt.value
                                        )
                                        return (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label} {hasData ? '✓' : ''}
                                            </option>
                                        )
                                    })}
                                </select>
                            </div>

                            <div
                                className="digit-toggle"
                                style={{ marginTop: 0 }}
                                role="group"
                                aria-label="Choose digit type"
                            >
                                <button
                                    type="button"
                                    className={
                                        digitType === 'single' ? 'active' : ''
                                    }
                                    onClick={() =>
                                        handleDigitTypeChange('single')
                                    }
                                >
                                    <strong>Single</strong>
                                    <span>1 Digit</span>
                                </button>
                                <button
                                    type="button"
                                    className={
                                        digitType === 'double' ? 'active' : ''
                                    }
                                    onClick={() =>
                                        handleDigitTypeChange('double')
                                    }
                                >
                                    <strong>Double</strong>
                                    <span>2 Digits</span>
                                </button>
                                <button
                                    type="button"
                                    className={
                                        digitType === 'triple' ? 'active' : ''
                                    }
                                    onClick={() =>
                                        handleDigitTypeChange('triple')
                                    }
                                >
                                    <strong>Triple</strong>
                                    <span>3 Digits</span>
                                </button>
                            </div>
                        </div>

                        {/* ── 5. Form / Input ── */}
                        {result === 'idle' ? (
                            <form onSubmit={handleSubmit} noValidate>
                                <label
                                    className="input-label"
                                    htmlFor="ticket-digits"
                                >
                                    Ticket ending for {currentSessionLabel} ({digitConfig.label})
                                </label>
                                <div
                                    className={`digit-input-wrap ${error ? 'has-error' : ''
                                        }`}
                                >
                                    <span className="input-prefix">
                                        {digitConfig.prefix}
                                    </span>
                                    <input
                                        ref={inputRef}
                                        id="ticket-digits"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        maxLength={digitConfig.length}
                                        value={digits}
                                        onChange={(event) =>
                                            handleChange(event.target.value)
                                        }
                                        placeholder={digitConfig.placeholder}
                                        aria-describedby={
                                            error ? 'input-error' : 'input-hint'
                                        }
                                        aria-invalid={Boolean(error)}
                                        autoFocus
                                    />
                                    <span className="digit-count">
                                        {digits.length}/{digitConfig.length}
                                    </span>
                                </div>
                                {error ? (
                                    <p
                                        className="input-error"
                                        id="input-error"
                                        role="alert"
                                    >
                                        {error}
                                    </p>
                                ) : (
                                    <p className="input-hint" id="input-hint">
                                        {digitConfig.hint}
                                    </p>
                                )}
                                <button
                                    className="check-button"
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading
                                        ? 'Connecting...'
                                        : `Check ${currentSessionLabel} ${digitConfig.label}`}
                                    <ArrowIcon />
                                </button>
                            </form>
                        ) : (
                            <div
                                className={`result-panel ${result}`}
                                aria-live="polite"
                            >
                                <div className="result-icon">
                                    {result === 'winner' ? (
                                        <CheckIcon />
                                    ) : (
                                        '—'
                                    )}
                                </div>
                                <span className="result-kicker">
                                    {drawDateDisplay} · {currentSessionLabel} Draw · Ticket ending in{' '}
                                    {digitConfig.prefix} {digits}
                                </span>
                                <h2>
                                    {result === 'winner'
                                        ? 'You have a match!'
                                        : 'Not this time'}
                                </h2>
                                <p>
                                    {result === 'winner'
                                        ? `Matched in ${matchedDetails}! Keep your ticket safe and verify with an official retailer.`
                                        : `${matchedDetails}. Every ticket is a new chance.`}
                                </p>
                                <button
                                    className="check-button"
                                    type="button"
                                    onClick={reset}
                                >
                                    Check another ticket
                                    <ArrowIcon />
                                </button>
                            </div>
                        )}

                        <div className="privacy-note">
                            <span className="shield">
                                <CheckIcon />
                            </span>
                            Live verification against official database draws.
                        </div>
                    </div>
                </section>

                <section className="steps" aria-label="How it works">
                    <div className="step">
                        <span>01</span>
                        <div>
                            <strong>Select Date & Session</strong>
                            <p>Pick draw date and choose Morning (1 PM), Day (6 PM), or Evening (8 PM).</p>
                        </div>
                    </div>
                    <div className="step">
                        <span>02</span>
                        <div>
                            <strong>Choose Digit Type</strong>
                            <p>Select Single (1 digit), Double (2 digits), or Triple (3 digits).</p>
                        </div>
                    </div>
                    <div className="step">
                        <span>03</span>
                        <div>
                            <strong>Instant Answer</strong>
                            <p>Direct match verified against that session's official result.</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer>
                <span>Play for fun. Play responsibly.</span>
                <span>Results verified against official database. Keep your original ticket.</span>
            </footer>

            {/* ── Google Material Design DatePicker Modal ── */}
            <GoogleDatePickerModal
                isOpen={showDatePicker}
                initialDate={drawDateIso}
                onClose={() => setShowDatePicker(false)}
                onSelectDate={handleSelectDate}
            />
        </div>
    )
}

function MarkIcon() {
    return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M16 3.5 19.4 9l6.3-1.1-2.2 6 4.4 4.6-5.8 2.8.8 6.3-6.2-1.6-4.4 4.6-2.1-6.1-6.2-.3 3.2-5.5-3.9-5 6.4-1.1L12.5 5Z" />
            <circle cx="16" cy="16" r="4.3" />
        </svg>
    )
}

function CalendarIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
        </svg>
    )
}

function ArrowIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
        </svg>
    )
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 12 4 4 8-9" />
        </svg>
    )
}
