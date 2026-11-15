import { useState, useEffect } from 'react'
import { ResultHistory, type ResultSets } from './resultHistory'
import { getSingaporeResults } from '../api/client'

const EMPTY_RESULTS: ResultSets = {
    single: [],
    double: [],
    triple: [],
}

export default function SingaporeResultsPage() {
    const [results, setResults] = useState<ResultSets>(EMPTY_RESULTS)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        getSingaporeResults()
            .then((data) => {
                if (isMounted && data.success && data.results) {
                    setResults(data.results)
                }
            })
            .catch((err) => {
                console.error('Error fetching Singapore lottery results:', err)
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
            title="Singapore Results"
            results={results}
            loading={loading}
        />
    )
}
