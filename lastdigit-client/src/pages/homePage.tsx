import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSingaporeLatest } from '../api/client'

const actions = [
    {
        to: '/singapore',
        label: 'Singapore',
        sublabel: 'Last Digits',
        tone: 'blue',
        icon: <SingaporeIcon />,
    },
    {
        to: '/dear',
        label: 'Dear Lottery',
        sublabel: 'Last Digits',
        tone: 'teal',
        icon: <DearIcon />,
    },
    {
        to: '/today',
        label: 'Number',
        sublabel: 'Combination',
        tone: 'sky',
        icon: <NumberIcon />,
    },
    {
        to: '/fax',
        label: 'Lottery Fax',
        sublabel: 'Show Result',
        tone: 'pink',
        icon: <FaxIcon />,
    },
    {
        to: '/today',
        label: 'Lucky Search',
        sublabel: 'Find Number',
        tone: 'purple',
        icon: <LuckyIcon />,
    },
    {
        to: 'mailto:?subject=Last%20Digit%20Lottery&body=Check%20today%27s%20lottery%20results%20live',
        label: 'Share App',
        sublabel: 'Invite Friends',
        tone: 'orange',
        icon: <ShareIcon />,
        external: true,
    },
    {
        to: '/privacy',
        label: 'Privacy',
        sublabel: 'Policy',
        tone: 'berry',
        icon: <PrivacyIcon />,
    },
    {
        to: 'mailto:?subject=Last%20Digit%20Feedback',
        label: 'Rate Us',
        sublabel: 'Send Feedback',
        tone: 'cyan',
        icon: <StarIcon />,
        external: true,
    },
] as const

export default function HomePage() {
    const [latestDate, setLatestDate] = useState<string>('')

    useEffect(() => {
        let isMounted = true

        // Fetch live latest draw date from server
        getSingaporeLatest()
            .then((res) => {
                if (isMounted && res.success && res.dateFormatted) {
                    setLatestDate(res.dateFormatted)
                }
            })
            .catch(() => {
                // If offline or empty
            })

        return () => {
            isMounted = false
        }
    }, [])

    return (
        <div className="hub-shell">
            {/* ── Header ── */}
            <header className="home-header">
                <div className="home-brand">
                    <span className="brand-mark">
                        <MarkIcon />
                    </span>
                    <div className="home-brand-text">
                        <span className="home-brand-name">Last Digit</span>
                        <span className="home-brand-sub">Lottery Results</span>
                    </div>
                </div>
            </header>

            <main className="hub-main">
                {/* ── Live draw banner ── */}
                <Link className="today-cta" to="/today">
                    <div className="today-cta-inner">
                        <div>
                            <span className="today-kicker">
                                <span className="live-dot" />
                                Live · Latest Draw
                            </span>
                            <strong>Check Your Ticket</strong>
                            <span className="today-cta-hint">
                                {latestDate ? `${latestDate} · Official Draw` : 'Live Draw Check'}
                            </span>
                        </div>
                        <span className="today-arrow">
                            <ChevronIcon />
                        </span>
                    </div>
                </Link>

                {/* ── Section heading ── */}
                <div className="home-section-head">
                    <span className="home-section-label">Quick Access</span>
                    <h1 className="home-section-title">Lottery Tools</h1>
                </div>

                {/* ── Action grid ── */}
                <section className="action-grid" aria-label="Lottery tools and results">
                    {actions.map((action) =>
                        'external' in action && action.external ? (
                            <a
                                className="action-tile"
                                href={action.to}
                                key={`${action.label}-${action.sublabel}`}
                            >
                                <span className={`action-icon ${action.tone}`}>{action.icon}</span>
                                <span className="action-label">
                                    <strong>{action.label}</strong>
                                    <span>{action.sublabel}</span>
                                </span>
                            </a>
                        ) : (
                            <Link
                                className="action-tile"
                                to={action.to}
                                key={`${action.label}-${action.sublabel}`}
                            >
                                <span className={`action-icon ${action.tone}`}>{action.icon}</span>
                                <span className="action-label">
                                    <strong>{action.label}</strong>
                                    <span>{action.sublabel}</span>
                                </span>
                            </Link>
                        )
                    )}
                </section>
            </main>

            {/* ── Footer ── */}
            <footer className="hub-footer">
                <span>🎟 Play responsibly · Keep your original ticket</span>
            </footer>
        </div>
    )
}

/* ─── Icons ───────────────────────────────────── */

function MarkIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    )
}

function ChevronIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
        </svg>
    )
}

function SingaporeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    )
}

function DearIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    )
}

function NumberIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 9h1v6M14 9h2M14 12h2M14 15h2M9 15h1" />
        </svg>
    )
}

function FaxIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z" />
            <path d="M6 17v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="10" y1="10" x2="14" y2="10" />
        </svg>
    )
}

function LuckyIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
            <path d="M11 8v6M8 11h6" />
        </svg>
    )
}

function ShareIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
    )
}

function PrivacyIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}

function StarIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    )
}
