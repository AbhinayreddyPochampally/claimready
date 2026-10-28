'use client';
import { usePathname } from 'next/navigation';
const LINKS = [['/desk', 'Desk queue'], ['/insurer', 'Insurer inbox'], ['/how', 'How it works']];
export default function Nav() {
  const p = usePathname() || '/';
  return (
    <nav className="nav" aria-label="Main">
      {LINKS.map(([href, label]) => {
        const on = p.startsWith(href) || (href === '/desk' && p.startsWith('/claim'));
        return <a key={href} href={href} className={on ? 'active' : ''} aria-current={on ? 'page' : undefined}>{label}</a>;
      })}
    </nav>
  );
}
