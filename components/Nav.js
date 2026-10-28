'use client';
import { usePathname } from 'next/navigation';
const LINKS = [['/desk', 'Desk queue'], ['/insurer', 'Insurer inbox'], ['/how', 'How it works']];
export default function Nav() {
  const p = usePathname() || '/';
  return (
    <nav className="nav">
      {LINKS.map(([href, label]) => (
        <a key={href} href={href} className={p.startsWith(href) || (href === '/desk' && p.startsWith('/claim')) ? 'active' : ''}>{label}</a>
      ))}
    </nav>
  );
}
