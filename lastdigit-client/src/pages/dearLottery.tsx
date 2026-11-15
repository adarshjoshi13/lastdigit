import { ResultHistory, type ResultSets } from './resultHistory'

const results: ResultSets = {
    single: [
        { date: 'May 24, 2025', morning: '4', day: '1', evening: '7' },
        { date: 'May 23, 2025', morning: '2', day: '6', evening: '3' },
        { date: 'May 22, 2025', morning: '8', day: '5', evening: '0' },
        { date: 'May 21, 2025', morning: '9', day: '2', evening: '6' },
        { date: 'May 20, 2025', morning: '1', day: '7', evening: '8' },
    ],
    double: [
        { date: 'May 24, 2025', morning: '94', day: '31', evening: '77' },
        { date: 'May 23, 2025', morning: '02', day: '61', evening: '53' },
        { date: 'May 22, 2025', morning: '88', day: '45', evening: '20' },
        { date: 'May 21, 2025', morning: '10', day: '79', evening: '36' },
        { date: 'May 20, 2025', morning: '42', day: '17', evening: '68' },
    ],
    triple: [
        { date: 'May 24, 2025', morning: '194', day: '831', evening: '077' },
        { date: 'May 23, 2025', morning: '902', day: '461', evening: '753' },
        { date: 'May 22, 2025', morning: '288', day: '045', evening: '920' },
        { date: 'May 21, 2025', morning: '610', day: '579', evening: '136' },
        { date: 'May 20, 2025', morning: '342', day: '817', evening: '468' },
    ],
}

export default function DearResultsPage() {
    return (
        <ResultHistory
            eyebrow="Draw archive"
            title="Dear Results"
            results={results}
        />
    )
}
