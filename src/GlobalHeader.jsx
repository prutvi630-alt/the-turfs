import { useState } from 'react';

export const navItems = [
  { label: 'Home', href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Upcoming Tournaments', href: '/tournaments' },
  { label: 'Book Your Turf', href: '/book-your-turf' },
];

const headerNavItems = [
  { label: 'Home', href: '/' },
  { label: 'Tournaments', href: '/tournaments' },
  { label: 'Turfs', href: '/turfs' },
  { label: 'Players', href: '/players' },
  { label: 'About', href: '/about' },
];

function GlobalHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigate = (href) => {
    setIsMenuOpen(false);
    if (href === '/' && window.location.pathname === '/') {
      document.querySelector('#top')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (href === '/turfs') {
      window.location.href = `${import.meta.env.BASE_URL}book-your-turf`;
      return;
    }
    window.location.href = `${import.meta.env.BASE_URL}${href.replace(/^\//, '')}`;
  };

  const currentPath = window.location.pathname.replace(/^\/The-Turf-/, '') || '/';

  const isCurrent = (href) => (
    href === '/'
      ? currentPath === '/'
      : href === '/tournaments'
        ? currentPath.startsWith('/tournaments')
        : href === '/turfs'
          ? currentPath === '/turfs' || currentPath.startsWith('/book-your-turf')
          : href === '/players'
            ? currentPath.startsWith('/players')
            : currentPath === href
  );

  return (
    <header className="topbar">
      <nav className="navbar container">
        <button type="button" className="brand-wrap" onClick={() => navigate('/')} aria-label="Go to home page">
          <span className="brand-wordmark">CLIFT</span>
        </button>

        <div id="primary-navigation" className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          {headerNavItems.map((item) => (
            <button key={item.label} type="button" className={`nav-link ${isCurrent(item.href) ? 'current' : ''}`} onClick={() => navigate(item.href)}>
              {item.label}
            </button>
          ))}
          <div className="mobile-menu-actions">
            <button type="button" className="nav-login" onClick={() => navigate('/login')}>Login</button>
            <button type="button" className="nav-register" onClick={() => navigate('/signup')}>Register</button>
          </div>
        </div>

        <div className="nav-actions">
          <button type="button" className="search-control" aria-label="Search">
            <span className="search-icon" aria-hidden="true" />
          </button>
          <button type="button" className="nav-login" onClick={() => navigate('/login')}>Login</button>
          <button type="button" className="nav-register" onClick={() => navigate('/signup')}>Register</button>
        </div>

        <button type="button" className="mobile-menu-toggle" aria-label="Toggle navigation menu" aria-expanded={isMenuOpen} aria-controls="primary-navigation" onClick={() => setIsMenuOpen((open) => !open)}>
          <span /><span /><span />
        </button>
      </nav>
    </header>
  );
}

export default GlobalHeader;