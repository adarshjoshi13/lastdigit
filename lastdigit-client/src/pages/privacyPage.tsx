import { Link } from 'react-router-dom'

export default function PrivacyPage() {
    return (
        <main className="simple-page privacy-page">
            <Link className="back-link" to="/">← Home</Link>

            <span className="simple-kicker">Privacy Policy</span>
            <h1>Last Digit Lottery</h1>
            <p className="privacy-updated">Last updated: November 2026</p>

            <section className="privacy-section">
                <h2>1. Information We Collect</h2>
                <p>
                    Last Digit Lottery does <strong>not</strong> collect, store, or transmit
                    any personal information. All ticket numbers you enter are processed
                    locally on your device and are never sent to our servers.
                </p>
            </section>

            <section className="privacy-section">
                <h2>2. Lottery Result Data</h2>
                <p>
                    The app fetches publicly available lottery draw results from our server
                    to display them in the app. No personal data is associated with these
                    requests.
                </p>
            </section>

            <section className="privacy-section">
                <h2>3. Analytics</h2>
                <p>
                    We do not use third-party analytics services. No tracking SDKs are
                    embedded in this application.
                </p>
            </section>

            <section className="privacy-section">
                <h2>4. Permissions</h2>
                <p>
                    This app requests <strong>Internet access</strong> only to fetch live
                    lottery results. No other device permissions (camera, contacts,
                    location, etc.) are requested.
                </p>
            </section>

            <section className="privacy-section">
                <h2>5. Third-Party Services</h2>
                <p>
                    This app does not integrate with any third-party advertising,
                    analytics, or social-network SDKs.
                </p>
            </section>

            <section className="privacy-section">
                <h2>6. Children's Privacy</h2>
                <p>
                    This app is not directed at children under 13. We do not knowingly
                    collect any data from children.
                </p>
            </section>

            <section className="privacy-section">
                <h2>7. Changes to This Policy</h2>
                <p>
                    We may update this privacy policy. Any changes will be reflected with
                    an updated date at the top of this page.
                </p>
            </section>

            <section className="privacy-section">
                <h2>8. Contact</h2>
                <p>
                    Questions? Email us at{' '}
                    <a href="mailto:support@lastdigit.com" className="privacy-link">
                        support@lastdigit.com
                    </a>
                </p>
            </section>
        </main>
    )
}
