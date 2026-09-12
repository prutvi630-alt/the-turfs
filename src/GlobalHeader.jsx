import { useState } from 'react';

export const navItems = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Upcoming Tournaments', href: '/tournaments' },
  { label: 'Book Your Turf', href: '/book-your-turf' },
];

function GlobalHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigate = (href) => {
    setIsMenuOpen(false);
    if (href === '/' && window.location.pathname === '/') {
      document.querySelector('#top')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    window.location.href = href;
  };

  const currentPath = window.location.pathname;

  return (
    <header className="topbar">
      <nav className="navbar container">
        <button type="button" className="brand-wrap" onClick={() => navigate('/')} aria-label="Go to home page">
          <span className="brand-mark">VS</span>
          <span className="brand-copy"><span className="brand-name">Sports Platform</span></span>
        </button>

        <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          {navItems.map((item) => (
            <button key={item.label} type="button" className={`nav-link ${currentPath === item.href || (item.href === '/tournaments' && currentPath.startsWith('/tournaments/')) ? 'current' : ''}`} onClick={() => navigate(item.href)}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="nav-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/login')}>Login</button>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/signup')}>Sign Up</button>
        </div>

        <button type="button" className="mobile-menu-toggle" aria-label="Toggle navigation menu" onClick={() => setIsMenuOpen((open) => !open)}>
          <span /><span /><span />
        </button>
      </nav>
    </header>
  );
}

export default GlobalHeader;