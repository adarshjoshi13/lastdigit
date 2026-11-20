import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSingaporeResults, getDearResults, API_BASE_URL, type DrawItem } from '../api/client'

export type LotteryType = 'singapore' | 'dear'

function resolveImageUrl(url: string | null): string | null {
    if (!url) return null
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

interface FaxTableRow {
    date: string
    rawDate: string
    morningImage: string | null
    dayImage: string | null
    eveningImage: string | null
}

function formatDate(dateStr: string): string {
    if (!dateStr) return ''
    const parts = String(dateStr).split('-')
    if (parts.length !== 3) return dateStr
    const [year, month, day] = parts
    const dateObj = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
    return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    })
}

export default function LotteryFaxPage() {
    const [lottery, setLottery] = useState<LotteryType>('singapore')
    const [rows, setRows] = useState<FaxTableRow[]>([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState<{
        open: boolean
        date: string
        session: string
        imageUrl: string | null
    } | null>(null)

    // ── Fetch live draws with images from the server ──────────────────────────
    useEffect(() => {
        let isMounted = true
        setLoading(true)

        const fetchFn = lottery === 'singapore' ? getSingaporeResults : getDearResults

        fetchFn()
            .then((data) => {
                if (isMounted && data.success && Array.isArray(data.draws)) {
                    // Group draws by drawDate
                    const dateMap = new Map<string, { morning: string | null; day: string | null; evening: string | null }>()

                    for (const draw of data.draws as DrawItem[]) {
                        const d = draw.drawDate
                        if (!dateMap.has(d)) {
                            dateMap.set(d, { morning: null, day: null, evening: null })
                        }
                        const entry = dateMap.get(d)!
                        if (draw.session === 'morning') entry.morning = draw.resultImage
                        if (draw.session === 'day') entry.day = draw.resultImage
                        if (draw.session === 'evening') entry.evening = draw.resultImage
                    }

                    const formattedRows: FaxTableRow[] = []
                    for (const [dateStr, sessions] of dateMap.entries()) {
                        formattedRows.push({
                            date: formatDate(dateStr),
                            rawDate: dateStr,
                            morningImage: sessions.morning,
                            dayImage: sessions.day,
                            eveningImage: sessions.evening,
                        })
                    }

                    setRows(formattedRows)
                } else if (isMounted) {
                    setRows([])
                }
            })
            .catch((err) => {
                console.error(`Error fetching ${lottery} fax images:`, err)
                if (isMounted) setRows([])
            })
            .finally(() => {
                if (isMounted) setLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [lottery])

    // Keyboard support: Escape closes the image modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setModal(null)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const openImageModal = (date: string, session: string, imageUrl: string | null) => {
        setModal({
            open: true,
            date,
            session,
            imageUrl: resolveImageUrl(imageUrl),
        })
    }

    return (
        <div className="history-shell">
            {/* ── Header ── */}
            <header className="history-header">
                <Link className="back-link" to="/">
                    <span className="back-arrow">←</span>
                    Home
                </Link>
                <span className="official-pill">Official Fax</span>
            </header>

            <main className="history-main">
                {/* ── Title ── */}
                <div className="history-title">
                    <span>Draw sheet archive</span>
                    <h1>Lottery Fax</h1>
                    <p>Official result sheets. Click the eye icon to view image.</p>
                </div>

                {/* ── Toggle between Singapore and Dear ── */}
                <div className="game-toggle digit-toggle " role="group" aria-label="Choose lottery game">
                    <button
                        aria-pressed={lottery === 'singapore'}
                        className={lottery === 'singapore' ? 'active' : ''}
                        onClick={() => setLottery('singapore')}
                        type="button"
                    >
                        <strong>Singapore</strong>
                        <span>Fax Results</span>
                    </button>
                    <button
                        aria-pressed={lottery === 'dear'}
                        className={lottery === 'dear' ? 'active' : ''}
                        onClick={() => setLottery('dear')}
                        type="button"
                    >
                        <strong>Dear Lottery</strong>
                        <span>Fax Results</span>
                    </button>
                </div>

                {/* ── Results Table Card ── */}
                <section className="result-table-card" aria-live="polite">
                    <div className="table-summary">
                        <div>
                            <span>Showing</span>
                            <strong>{lottery === 'singapore' ? 'Singapore' : 'Dear'} Lottery Fax</strong>
                        </div>
                        <span>{loading ? 'Connecting...' : `${rows.length} recent draws`}</span>
                    </div>

                    <div className="result-table-scroll">
                        <table className="result-table">
                            <thead>
                                <tr>
                                    <th scope="col">Date</th>
                                    <th scope="col">
                                        MOR
                                        <span>Morning</span>
                                    </th>
                                    <th scope="col">
                                        DAY
                                        <span>Day</span>
                                    </th>
                                    <th scope="col">
                                        EVN
                                        <span>Evening</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '2.5rem 1rem', color: 'var(--muted)', textAlign: 'center' }}>
                                            Loading live draw sheets from server...
                                        </td>
                                    </tr>
                                ) : rows.length > 0 ? (
                                    rows.map((row, index) => (
                                        <tr className={index === 0 ? 'latest-row' : ''} key={row.rawDate || row.date}>
                                            <th scope="row">
                                                {index === 0 && <span className="latest-label">Latest</span>}
                                                {row.date}
                                            </th>
                                            <td>
                                                <button
                                                    type="button"
                                                    className={`fax-eye-btn ${row.morningImage ? 'has-image' : 'no-image'}`}
                                                    onClick={() => openImageModal(row.date, 'Morning', row.morningImage)}
                                                    title={row.morningImage ? 'View Morning result image' : 'No image available'}
                                                    aria-label={`View Morning result image for ${row.date}`}
                                                >
                                                    <EyeIcon />
                                                </button>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className={`fax-eye-btn ${row.dayImage ? 'has-image' : 'no-image'}`}
                                                    onClick={() => openImageModal(row.date, 'Day', row.dayImage)}
                                                    title={row.dayImage ? 'View Day result image' : 'No image available'}
                                                    aria-label={`View Day result image for ${row.date}`}
                                                >
                                                    <EyeIcon />
                                                </button>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className={`fax-eye-btn ${row.eveningImage ? 'has-image' : 'no-image'}`}
                                                    onClick={() => openImageModal(row.date, 'Evening', row.eveningImage)}
                                                    title={row.eveningImage ? 'View Evening result image' : 'No image available'}
                                                    aria-label={`View Evening result image for ${row.date}`}
                                                >
                                                    <EyeIcon />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '2.5rem 1rem', color: 'var(--muted)', textAlign: 'center' }}>
                                            No published draws found in database.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <p className="table-note">
                    MOR = Morning · DAY = Day · EVN = Evening · Click 👁 to view draw sheet
                </p>
            </main>

            {/* ── Almost Full-Screen Image Modal / Lightbox ── */}
            {modal && (
                <div
                    className="fax-modal-backdrop"
                    onClick={() => setModal(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Lottery result image preview"
                >
                    <div className="fax-modal-content" onClick={(e) => e.stopPropagation()}>
                        <header className="fax-modal-header">
                            <div>
                                <h3 className="fax-modal-title">
                                    {lottery === 'singapore' ? 'Singapore' : 'Dear'} · {modal.session} Draw
                                </h3>
                                <span className="fax-modal-subtitle">{modal.date}</span>
                            </div>
                            <button
                                type="button"
                                className="fax-modal-close"
                                onClick={() => setModal(null)}
                                aria-label="Close image preview"
                            >
                                ✕
                            </button>
                        </header>

                        <div className="fax-modal-body">
                            {modal.imageUrl ? (
                                <img
                                    src={modal.imageUrl}
                                    alt={`${lottery} ${modal.session} result sheet for ${modal.date}`}
                                    className="fax-modal-img"
                                />
                            ) : (
                                <div className="no-image-box">
                                    <div className="no-image-icon-wrap">
                                        <ImageOffIcon />
                                    </div>
                                    <h3>No image available</h3>
                                    <p>
                                        The result image for the {modal.session} draw on {modal.date} has not been uploaded yet.
                                    </p>
                                    <span className="no-image-badge">Image Pending</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function EyeIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    )
}

function ImageOffIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="32"
            height="32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M21 21H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3m3-3h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
    )
}
