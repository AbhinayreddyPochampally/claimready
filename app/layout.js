import './globals.css';
import Nav from '@/components/Nav';

export const metadata = {
  title: 'ClaimReady',
  description: 'ClaimReady checks a cashless health claim against the patient’s policy and the clinical record before it leaves the hospital, so clean claims can be approved on arrival.'
};

function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect x="4" y="2.5" width="17" height="23" rx="3" fill="#0b6e69" />
      <path d="M8 9h9M8 13h9M8 17h5" stroke="#bfe3df" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="21" cy="20" r="6" fill="#fff" stroke="#0b6e69" strokeWidth="1.8" />
      <path d="M18.3 20.1l1.9 1.9 3.6-3.8" stroke="#0b6e69" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <div className="wrap">
            <a href="/" className="mark" aria-label="ClaimReady home"><Mark />ClaimReady</a>
            <Nav />
            <span className="env" title="Patients, hospital, insurer and policy are fictional. The insurer is simulated.">Demo: synthetic claims, simulated insurer</span>
          </div>
        </header>
        <main><div className="wrap">{children}</div></main>
        <footer className="foot">
          <div className="wrap">
            <span>ClaimReady prototype. All patients, documents, the hospital, the insurer and the policy are fictional. The agent never denies a claim.</span>
            <span>Abhikalp 2026, Case 8 entry by Team StarGaze</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
