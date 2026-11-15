import { useState } from 'react'
import { Link } from 'react-router-dom'

export type DigitType = 'single' | 'double' | 'triple'

export type DrawResult = {
    date: string
    morning: string
    day: string
    evening: string
}

export type ResultSets = Record<DigitType, DrawResult[]>

const digitOptions: { value: DigitType; label: string; hint: string }[] = [
    { value: 'single', label: 'Single', hint: '1 digit' },
    { value: 'double', label: 'Double', hint: '2 digits' },
    { value: 'triple', label: 'Triple', hint: '3 digits' },
]

export function ResultHistory({
    title,
    eyebrow,
    results,
}: {
    title: string
    eyebrow: string
    results: ResultSets
}) {
    const [digitType, setDigitType] = useState<DigitType>('single')
    const activeResults = results[digitType]

    return (
        <div className="history-shell">
            <header className="history-header">
                <Link className="back-link" to="/">
                    <span className="back-arrow">←</span>
                    Home
                </Link>
                <span className="official-pill">Official results</span>
            </header>

            <main className="history-main">
                <div className="history-title">
                    <span>{eyebrow}</span>
                    <h1>{title}</h1>
                    <p>Winning numbers by draw date and time.</p>
                </div>

                <div className="digit-toggle" role="group" aria-label="Choose lottery digit type">
                    {digitOptions.map((option) => (
                        <button
                            aria-pressed={digitType === option.value}
                            className={digitType === option.value ? 'active' : ''}
                            key={option.value}
                            onClick={() => setDigitType(option.value)}
                            type="button"
                        >
                            <strong>{option.label}</strong>
                            <span>{option.hint}</span>
                        </button>
                    ))}
                </div>

                <section className="result-table-card" aria-live="polite">
                    <div className="table-summary">
                        <div>
                            <span>Showing</span>
                            <strong>{digitOptions.find((option) => option.value === digitType)?.label} digit</strong>
                        </div>
                        <span>{activeResults.length} recent draws</span>
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
                                {activeResults.map((result, index) => (
                                    <tr className={index === 0 ? 'latest-row' : ''} key={result.date}>
                                        <th scope="row">
                                            {index === 0 && <span className="latest-label">Latest</span>}
                                            {result.date}
                                        </th>
                                        <td>{result.morning}</td>
                                        <td>{result.day}</td>
                                        <td>{result.evening}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <p className="table-note">
                    MOR = Morning · DAY = Day · EVN = Evening
                </p>
            </main>
        </div>
    )
}
