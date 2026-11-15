import { type FormEvent, useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSingaporeLatest, getDearLatest, type LatestLotteryResponse, type DrawItem } from '../api/client'

type ResultState = 'idle' | 'winner' | 'not-winner'
type LotteryChoice = 'singapore' | 'dear'

export default function LotteryChecker() {
    const [lottery, setLottery] = useState<LotteryChoice>('singapore')
    const [digits, setDigits] = useState('')
    const [result, setResult] = useState<ResultState>('idle')
    const [matchedDetails, setMatchedDetails] = useState<string>('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [latestDraw, setLatestDraw] = useState<LatestLotteryResponse | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // ── Fetch live latest draw from server on lottery switch ───────────────────
    useEffect(() => {
        let isMounted = true
        setLoading(true)
        setError('')
        setResult('idle')

        const fetchLatest = lottery === 'singapore' ? getSingaporeLatest : getDearLatest

        fetchLatest()
            .then((data) => {
                if (isMounted && data.success) {
                    setLatestDraw(data)
                }
            })
            .catch((err) => {
                console.error('Failed to load latest draw from server:', err)
                if (isMounted) setLatestDraw(null)
            })
            .finally(() => {
                if (isMounted) setLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [lottery])

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault()

        if (!digits || digits.length < 1) {
            setError('Please enter your ticket ending digits.')
            setResult('idle')
            inputRef.current?.focus()
            return
        }

        if (!latestDraw || !latestDraw.sessions || latestDraw.sessions.length === 0) {
            setError('No published draws available to check right now.')
            return
        }

        setError('')

        // Search through the latest sessions for a match
        const matchingSessions: string[] = []

        for (const sessionDraw of latestDraw.sessions as DrawItem[]) {
            const sName = sessionDraw.session.toUpperCase()
            if (sessionDraw.singleDigit === digits) {
                matchingSessions.push(`${sName} (Single Digit: ${sessionDraw.singleDigit})`)
            }
            if (sessionDraw.doubleDigit === digits) {
                matchingSessions.push(`${sName} (Double Digit: ${sessionDraw.doubleDigit})`)
            }
            if (sessionDraw.tripleDigit === digits) {
                matchingSessions.push(`${sName} (Triple Digit: ${sessionDraw.tripleDigit})`)
            }
        }

        if (matchingSessions.length > 0) {
            setResult('winner')
            setMatchedDetails(matchingSessions.join(', '))
        } else {
            setResult('not-winner')
            setMatchedDetails('')
        }
    }

    const handleChange = (value: string) => {
        const nextValue = value.replace(/\D/g, '').slice(0, 4)
        setDigits(nextValue)
        setError('')
        if (result !== 'idle') setResult('idle')
    }

    const reset = () => {
        setDigits('')
        setResult('idle')
        setError('')
        window.setTimeout(() => inputRef.current?.focus(), 0)
    }

    const drawDateDisplay = latestDraw?.dateFormatted || (loading ? 'Loading live draw...' : 'No Draw Available')
    const lotteryNameDisplay = lottery === 'singapore' ? 'Singapore Lottery' : 'Dear Lottery'

    return (
        <div className="app-shell">
            <header className="site-header">
                <Link className="brand" to="/" aria-label="Lucky Check home">
                    <span className="brand-mark">
                        <MarkIcon />
                    </span>
                    <span>Last Digit</span>
                </Link>
                <Link className="results-link" to={lottery === 'singapore' ? '/singapore' : '/dear'}>
                    View All Results →
                </Link>
            </header>

            <main>
                <section className="hero">
                    <div className="eyebrow">
                        <span className="live-dot" />
                        Live Server Check
                    </div>
                    <h1>Did luck find you?</h1>
                    <p className="hero-copy">
                        Enter your ticket's last digit(s). We'll check them against the latest official draw from the server.
                    </p>

                    {/* ── Lottery Switcher ── */}
                    <div
                        className="digit-toggle"
                        role="group"
                        aria-label="Choose lottery game"
                        style={{ margin: '0 0 1.25rem' }}
                    >
                        <button
                            className={lottery === 'singapore' ? 'active' : ''}
                            onClick={() => setLottery('singapore')}
                            type="button"
                        >
                            <strong>Singapore</strong>
                            <span>Live Results</span>
                        </button>
                        <button
                            className={lottery === 'dear' ? 'active' : ''}
                            onClick={() => setLottery('dear')}
                            type="button"
                        >
                            <strong>Dear Lottery</strong>
                            <span>Live Results</span>
                        </button>
                    </div>

                    <div className="checker-card">
                        <div className="draw-row">
                            <div className="draw-icon">
                                <CalendarIcon />
                            </div>
                            <div>
                                <span className="field-label">Checking live results for</span>
                                <strong>{drawDateDisplay}</strong>
                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--muted)' }}>
                                    {lotteryNameDisplay}
                                </span>
                            </div>
                        </div>

                        {result === 'idle' ? (
                            <form onSubmit={handleSubmit} noValidate>
                                <label className="input-label" htmlFor="ticket-digits">
                                    Last ticket digit(s) (1 to 3 digits)
                                </label>
                                <div className={`digit-input-wrap ${error ? 'has-error' : ''}`}>
                                    <span className="input-prefix">••••</span>
                                    <input
                                        ref={inputRef}
                                        id="ticket-digits"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        maxLength={4}
                                        value={digits}
                                        onChange={(event) => handleChange(event.target.value)}
                                        placeholder="000"
                                        aria-describedby={error ? 'input-error' : 'input-hint'}
                                        aria-invalid={Boolean(error)}
                                        autoFocus
                                    />
                                    <span className="digit-count">{digits.length}/3</span>
                                </div>
                                {error ? (
                                    <p className="input-error" id="input-error" role="alert">
                                        {error}
                                    </p>
                                ) : (
                                    <p className="input-hint" id="input-hint">
                                        Check single (1), double (2), or triple (3) digits on your ticket.
                                    </p>
                                )}
                                <button className="check-button" type="submit" disabled={loading}>
                                    {loading ? 'Connecting...' : 'Check my ticket'}
                                    <ArrowIcon />
                                </button>
                            </form>
                        ) : (
                            <div className={`result-panel ${result}`} aria-live="polite">
                                <div className="result-icon">{result === 'winner' ? <CheckIcon /> : '—'}</div>
                                <span className="result-kicker">Ticket ending in •••• {digits}</span>
                                <h2>{result === 'winner' ? 'You have a match!' : 'Not this time'}</h2>
                                <p>
                                    {result === 'winner'
                                        ? `Matched in: ${matchedDetails}! Keep your ticket safe and visit an official retailer.`
                                        : "Your ending digits didn't match any session in this draw. Every ticket is a new chance."}
                                </p>
                                <button className="check-button" type="button" onClick={reset}>
                                    Check another ticket
                                    <ArrowIcon />
                                </button>
                            </div>
                        )}

                        <div className="privacy-note">
                            <span className="shield">
                                <CheckIcon />
                            </span>
                            Direct verification against live official database.
                        </div>
                    </div>
                </section>

                <section className="steps" aria-label="How it works">
                    <div className="step">
                        <span>01</span>
                        <div>
                            <strong>Find your number</strong>
                            <p>Look for the ticket number printed on your lottery ticket.</p>
                        </div>
                    </div>
                    <div className="step">
                        <span>02</span>
                        <div>
                            <strong>Enter digits</strong>
                            <p>Type your 1, 2, or 3 ending digits.</p>
                        </div>
                    </div>
                    <div className="step">
                        <span>03</span>
                        <div>
                            <strong>Instant verification</strong>
                            <p>Direct match across Morning, Day, and Evening live draws.</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer>
                <span>Play for fun. Play responsibly.</span>
                <span>Results verified against official database. Keep your original ticket.</span>
            </footer>
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
