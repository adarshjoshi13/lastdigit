import { ResultHistory, type ResultSets } from './resultHistory'

const results: ResultSets = {
    single: [
        { date: 'May 24, 2025', morning: '7', day: '3', evening: '2' },
        { date: 'May 23, 2025', morning: '4', day: '9', evening: '1' },
        { date: 'May 22, 2025', morning: '8', day: '5', evening: '6' },
        { date: 'May 21, 2025', morning: '2', day: '0', evening: '7' },
        { date: 'May 20, 2025', morning: '5', day: '4', evening: '9' },
    ],
    double: [
        { date: 'May 24, 2025', morning: '27', day: '39', evening: '12' },
        { date: 'May 23, 2025', morning: '40', day: '85', evening: '21' },
        { date: 'May 22, 2025', morning: '56', day: '08', evening: '44' },
        { date: 'May 21, 2025', morning: '71', day: '63', evening: '90' },
        { date: 'May 20, 2025', morning: '14', day: '52', evening: '87' },
    ],
    triple: [
        { date: 'May 24, 2025', morning: '827', day: '039', evening: '712' },
        { date: 'May 23, 2025', morning: '340', day: '185', evening: '021' },
        { date: 'May 22, 2025', morning: '456', day: '208', evening: '379' },
        { date: 'May 21, 2025', morning: '512', day: '844', evening: '903' },
        { date: 'May 20, 2025', morning: '104', day: '652', evening: '287' },
    ],
}

export default function SingaporeResultsPage() {
    return (
        <ResultHistory
            eyebrow="Draw archive"
            title="Singapore Results"
            results={results}
        />
    )
}
