import { Link } from 'react-router-dom'

export default function PrivacyPage() {
    return (
        <main className="simple-page">
            <Link className="back-link" to="/">← Home</Link>
            <span className="simple-kicker">Privacy policy</span>
            <h1>Your ticket stays yours.</h1>
            <p>
                Lucky Check processes the four digits you enter only in your browser.
                This frontend demo does not save ticket numbers, personal details, or
                result searches.
            </p>
        </main>
    )
}
