import './globals.css';
import Nav from '@/components/Nav';

export const metadata = {
  title: 'ClaimReady · hospital claim agent',
  description: 'ClaimReady fixes the health claim file before it leaves the hospital, so clean claims are approved on arrival. Team StarGaze, Abhikalp 2026.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="container">
            <a href="/" className="brand"><span className="brand-mark">C</span>ClaimReady<small>Team StarGaze · Abhikalp 2026</small></a>
            <Nav />
          </div>
        </header>
        <div className="banner">Working prototype on synthetic data. Patients, hospital, insurer and policy are fictional.</div>
        <main><div className="container">{children}</div></main>
        <footer className="container footer">ClaimReady MVP · Case 8: Insurance &amp; InsurTech · The agent never denies a claim; only the insurer&apos;s claims review committee can.</footer>
      </body>
    </html>
  );
}
