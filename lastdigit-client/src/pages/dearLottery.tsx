import { useState, useEffect } from 'react'
import { ResultHistory, type ResultSets } from './resultHistory'
import { getDearResults } from '../api/client'

const EMPTY_RESULTS: ResultSets = {
    single: [],
    double: [],
    triple: [],
}

export default function DearResultsPage() {
    const [results, setResults] = useState<ResultSets>(EMPTY_RESULTS)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        getDearResults()
            .then((data) => {
                if (isMounted && data.success && data.results) {
                    setResults(data.results)
                }
            })
            .catch((err) => {
                console.error('Error fetching Dear lottery results:', err)
            })
            .finally(() => {
                if (isMounted) setLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [])

    return (
        <ResultHistory
            eyebrow="Draw archive"
            title="Dear Results"
            results={results}
            loading={loading}
        />
    )
}
