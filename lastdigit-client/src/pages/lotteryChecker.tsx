import { FormEvent, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

type ResultState = 'idle' | 'winner' | 'not-winner'

type Draw = {
    date: string
    name: string
    winningEndings: string[]
}

const DEFAULT_DRAW: Draw = {
    date: 'Saturday, May 24, 2025',
    name: 'Saturday Weekly Draw',
    winningEndings: ['4827', '1039', '7712'],
}

export default function LotteryChecker({ draw = DEFAULT_DRAW }: { draw?: Draw }) {
    const [digits, setDigits] = useState('')
    const [result, setResult] = useState<ResultState>('idle')
    const [error, setError] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault()

        if (digits.length !== 4) {
            setError('Enter all 4 ending digits to check your ticket.')
            setResult('idle')
            inputRef.current?.focus()
            return
        }

        setError('')
        setResult(draw.winningEndings.includes(digits) ? 'winner' : 'not-winner')
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

    return (
        <div className="app-shell">
            <header className="site-header">
                <Link className="brand" to="/" aria-label="Lucky Check home">
                    <span className="brand-mark">
                        <MarkIcon />
                    </span>
                    <span>Last Digit</span>
                </Link>
                <span className="results-link">Official draw results</span>
            </header>

            <main>
                <section className="hero">
                    <div className="eyebrow">
                        <span className="live-dot" />
                        Latest draw is ready
                    </div>
                    <h1>Did luck find you?</h1>
                    <p className="hero-copy">
                        Enter the last 4 digits on your lottery ticket. We'll check them against the latest draw
                        in seconds.
                    </p>

                    <div className="checker-card">
                        <div className="draw-row">
                            <div className="draw-icon">
                                <CalendarIcon />
                            </div>
                            <div>
                                <span className="field-label">Checking results for</span>
                                <strong>{draw.date}</strong>
                            </div>
                            <span className="draw-status">Change</span>
                        </div>

                        {result === 'idle' ? (
                            <form onSubmit={handleSubmit} noValidate>
                                <label className="input-label" htmlFor="ticket-digits">
                                    Last 4 ticket digits
                                </label>
                                <div className={`digit-input-wrap ${error ? 'has-error' : ''}`}>
                                    <span className="input-prefix">•••• ••••</span>
                                    <input
                                        ref={inputRef}
                                        id="ticket-digits"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        maxLength={4}
                                        value={digits}
                                        onChange={(event) => handleChange(event.target.value)}
                                        placeholder="0000"
                                        aria-describedby={error ? 'input-error' : 'input-hint'}
                                        aria-invalid={Boolean(error)}
                                        autoFocus
                                    />
                                    <span className="digit-count">{digits.length}/4</span>
                                </div>
                                {error ? (
                                    <p className="input-error" id="input-error" role="alert">
                                        {error}
                                    </p>
                                ) : (
                                    <p className="input-hint" id="input-hint">
                                        You'll find these at the far right of your ticket number.
                                    </p>
                                )}
                                <button className="check-button" type="submit">
                                    Check my ticket
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
                                        ? 'Keep your ticket safe and visit an official retailer to verify your prize.'
                                        : "Your ending digits didn't match this draw. Every ticket is a new chance."}
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
                            Your ticket number stays private and is never stored.
                        </div>
                    </div>
                </section>

                <section className="steps" aria-label="How it works">
                    <div className="step">
                        <span>01</span>
                        <div>
                            <strong>Find your number</strong>
                            <p>Look for the ticket number printed near the barcode.</p>
                        </div>
                    </div>
                    <div className="step">
                        <span>02</span>
                        <div>
                            <strong>Enter 4 digits</strong>
                            <p>Type only the four digits at the very end.</p>
                        </div>
                    </div>
                    <div className="step">
                        <span>03</span>
                        <div>
                            <strong>See your result</strong>
                            <p>Get a clear answer instantly. No sign-up needed.</p>
                        </div>
                    </div>
                </section>
            </main>

            <footer>
                <span>Play for fun. Play responsibly.</span>
                <span>Results shown are for reference. Keep your original ticket.</span>
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
