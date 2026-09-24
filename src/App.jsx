import { useEffect, useMemo, useState } from 'react';
import { sports } from './data/homeData';
import { getAllTournaments } from './data/dashboardSelectors';
import { getAllTurfs } from './data/demoStore';
import AboutPage from './AboutPage';
import TournamentPage from './TournamentPage';
import PlayerApp from './PlayerApp';
import BookingPage from './BookingPage';
import GlobalHeader from './GlobalHeader';
import Footer from './Footer';
import PlayersPage from './PlayersPage';

const formatHeroTitle = (title) => title.split('\n').map((line, index) => <span key={index}>{line}</span>);

const featureItems = [
  {
    title: 'Turf Registration',
    description: <>List your turf or sports complex<br />and reach more players.</>,
    href: `${import.meta.env.BASE_URL}turf-owner/register`,
    icon: 'turf',
  },
  {
    title: 'Player Registration',
    description: <>Register as a player and<br />get tournament updates.</>,
    href: `${import.meta.env.BASE_URL}player/register`,
    icon: 'player',
  },
  {
    title: 'Tournaments',
    description: <>Compete with other turfs<br />and win exciting prizes.</>,
    href: `${import.meta.env.BASE_URL}tournaments`,
    icon: 'trophy',
  },
  {
    title: 'Grow Together',
    description: <>Build your sports community<br />and discover new talent.</>,
    icon: 'growth',
  },
];

const popularSports = ['cricket', 'pickleball', 'football']
  .map((sportId) => sports.find((sport) => sport.id === sportId))
  .filter(Boolean);

const turfs = getAllTurfs();
const tournaments = getAllTournaments();
const upcomingTournaments = tournaments
  .filter((tournament) => {
    const status = String(tournament.status || '').toLowerCase();
    return new Date(`${tournament.date}T00:00:00`) > new Date()
      && !['completed', 'cancelled', 'live'].includes(status);
  })
  .sort((first, second) => new Date(first.date) - new Date(second.date))
  .slice(0, 3);

const platformStats = [
  { value: turfs.length, label: 'TURFS' },
  { value: sports.length, label: 'SPORTS' },
  { value: tournaments.length, label: 'TOURNAMENTS' },
];

const premiumHeroSlides = [
  {
    id: 'cricket',
    eyebrow: 'SPORTS TOURNAMENT PLATFORM',
    title: 'CLIFT',
    tag: 'RISE. PLAY. CONQUER.',
    gameTitle: 'CRICKET',
    gameSubtitle: 'Compete. Perform. Rise through the rankings.',
    description: 'Join exciting cricket tournaments, discover competitive turfs and take your game to the next level.',
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1600&q=80',
    alt: 'Cricket player in action',
    focus: 'center right',
    focusMobile: '60% center',
    primaryLabel: 'Find a Tournament',
    primaryHref: `${import.meta.env.BASE_URL}tournaments`,
    secondaryLabel: 'Register Your Turf',
    secondaryHref: `${import.meta.env.BASE_URL}turf-owner/register`,
  },
  {
    id: 'football',
    eyebrow: 'SPORTS TOURNAMENT PLATFORM',
    title: 'CLIFT',
    tag: 'RISE. PLAY. CONQUER.',
    gameTitle: 'FOOTBALL',
    gameSubtitle: 'Play hard. Compete harder.',
    description: 'Find competitive football tournaments, connect with players and become part of the growing sports community.',
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80',
    alt: 'Football action on a pitch',
    focus: 'center',
    focusMobile: 'center',
    primaryLabel: 'Find a Tournament',
    primaryHref: `${import.meta.env.BASE_URL}tournaments`,
    secondaryLabel: 'Register Your Turf',
    secondaryHref: `${import.meta.env.BASE_URL}turf-owner/register`,
  },
  {
    id: 'pickleball',
    eyebrow: 'SPORTS TOURNAMENT PLATFORM',
    title: 'CLIFT',
    tag: 'RISE. PLAY. CONQUER.',
    gameTitle: 'PICKLEBALL',
    gameSubtitle: 'Fast rallies. Real competition.',
    description: 'Discover pickleball tournaments, meet competitive players and take your game to the next level.',
    image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1600&q=80',
    alt: 'Pickleball player hitting a shot',
    focus: 'center left',
    focusMobile: '40% center',
    primaryLabel: 'Find a Tournament',
    primaryHref: `${import.meta.env.BASE_URL}tournaments`,
    secondaryLabel: 'Register Your Turf',
    secondaryHref: `${import.meta.env.BASE_URL}turf-owner/register`,
  },
];

function FeatureIcon({ type }) {
  const paths = {
    turf: <><path d="M6 20h12" /><path d="M7 20V9l5-4 5 4v11" /><path d="M10 20v-5h4v5" /><path d="M9 11h.01M12 11h.01M15 11h.01" /></>,
    player: <><circle cx="9" cy="8" r="3" /><circle cx="16" cy="10" r="2.5" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M14 15.5a4.5 4.5 0 0 1 6.5 4" /></>,
    trophy: <><path d="M8 5h8v4a4 4 0 0 1-8 0V5Z" /><path d="M8 7H5a3 3 0 0 0 3 3M16 7h3a3 3 0 0 1-3 3M12 13v4M8 20h8M9 17h6" /></>,
    growth: <><path d="M5 19V9M12 19V5M19 19v-8" /><path d="m4 7 5-3 4 2 6-4" /><path d="M16 2h3v3" /></>,
  };

  return <svg className="feature-icon-art" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

function App() {
  const path = window.location.pathname.replace(/^\/Turfview-/, '') || '/';

  if (path === '/about') {
    return <AboutPage />;
  }

  if (path.startsWith('/tournaments')) {
    return <TournamentPage />;
  }

  if (path === '/book-your-turf' || path.startsWith('/book-your-turf/')) {
    return <BookingPage />;
  }

  if (path.startsWith('/players')) {
    return <PlayersPage />;
  }

  if (['/signup', '/login', '/player', '/turf-owner', '/admin'].some((route) => path.startsWith(route))) {
    return <PlayerApp />;
  }

  if (path !== '/') {
    return <NotFoundPage />;
  }

  const [activeSlide, setActiveSlide] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('All');
  const [areaFilter, setAreaFilter] = useState('All');

  const areaOptions = useMemo(
    () => ['All', ...new Set(turfs.map((turf) => turf.area).filter(Boolean))],
    []
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveSlide((prev) => (prev + 1) % premiumHeroSlides.length);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [activeSlide]);

  useEffect(() => {
    const elements = document.querySelectorAll('[data-reveal]');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: '0px 0px -30px 0px' }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const filteredTurfs = turfs.filter((turf) => {
    const matchesSearch = String(turf.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesSport = sportFilter === 'All' || (turf.sports || []).includes(sportFilter);
    const matchesArea = areaFilter === 'All' || turf.area === areaFilter;
    return matchesSearch && matchesSport && matchesArea;
  });

  const goToSlide = (direction) => {
    setActiveSlide((prev) => (prev + direction + premiumHeroSlides.length) % premiumHeroSlides.length);
  };

  const handleNavClick = (href) => {
    if (!href) return;
    if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      if (window.location.hash !== href) {
        window.history.pushState(null, '', href);
      }
    } else if (href.startsWith('/')) {
      if (href === '/about') {
        window.location.href = href;
        return;
      }
      if (href === '/tournaments') {
        window.location.href = href;
        return;
      }
      if (href === '/login' || href === '/signup') {
        window.location.href = href;
        return;
      }
      const hashTarget = href === '/upcoming-tournaments' ? '#upcoming-tournaments' : href === '/login' ? '#login' : href === '/signup' ? '#signup' : href;
      const el = hashTarget.startsWith('#') ? document.querySelector(hashTarget) : null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      if (window.location.hash !== hashTarget) {
        window.history.pushState(null, '', hashTarget);
      }
    }
    setIsMenuOpen(false);
  };

  const handleJoin = (label) => {
    if (label === 'Register Your Turf') {
      window.location.href = `${import.meta.env.BASE_URL}turf-owner/register`;
      return;
    }
    if (label === 'Join as a Player' || label === 'Join Now') {
      window.location.href = `${import.meta.env.BASE_URL}player/register`;
      return;
    }
    window.location.href = `${import.meta.env.BASE_URL}login`;
  };

  return (
    <div id="top" className="page-shell">
      <GlobalHeader />

      <main>
        <section className="hero-section">
          <div className="hero-slider-track" aria-live="polite">
            {premiumHeroSlides.map((slide, index) => (
              <article
                key={slide.id}
                className={`hero-slide ${index === activeSlide ? 'active' : ''}`}
                aria-hidden={index !== activeSlide}
              >
                <div
                  className="hero-slide-media"
                  role="img"
                  aria-label={slide.alt}
                  style={{
                    backgroundImage: `url('${slide.image}')`,
                    '--hero-focus': slide.focus || 'center',
                    '--hero-focus-mobile': slide.focusMobile || slide.focus || 'center',
                  }}
                />
                <div className="hero-slide-overlay" aria-hidden="true" />

                <div className="container hero-slide-inner">
                  <div className="hero-copy hero-slide-copy">
                    <span className="eyebrow">{slide.eyebrow}</span>
                    <h1 className="hero-title">{slide.title}</h1>
                    <div className="hero-tagline" aria-label="Rise play conquer">
                      <span>{slide.tag.split(' ')[0]}.</span>
                      <span className="hero-tagline-accent">{slide.tag.split(' ')[1]}.</span>
                      <span>{slide.tag.split(' ')[2]}.</span>
                    </div>
                    <div className="hero-game-label">{slide.gameTitle}</div>
                    <p className="hero-game-subtitle">{slide.gameSubtitle}</p>
                    <p className="hero-description">{slide.description}</p>
                    <div className="hero-actions">
                      <a className="btn btn-primary" href={slide.primaryHref}>
                        {slide.primaryLabel} <span aria-hidden="true">→</span>
                      </a>
                      <a className="btn btn-secondary" href={slide.secondaryHref}>
                        {slide.secondaryLabel}
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="container hero-slider-footer">
            <div className="hero-progress-wrap" aria-label="Hero slide progress">
              {premiumHeroSlides.map((slide, index) => (
                <button
                  key={`${slide.id}-indicator`}
                  type="button"
                  className={`hero-progress-item ${index === activeSlide ? 'active' : ''}`}
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Go to ${slide.gameTitle} slide`}
                  aria-pressed={index === activeSlide}
                >
                  <span className="hero-progress-index">{String(index + 1).padStart(2, '0')} / {String(premiumHeroSlides.length).padStart(2, '0')}</span>
                  <span className="hero-progress-name">{slide.gameTitle}</span>
                  <span className="hero-progress-bar">
                    <span
                      className={index === activeSlide ? 'hero-progress-fill active' : 'hero-progress-fill'}
                      style={{ animation: index === activeSlide ? 'heroProgress 4s linear forwards' : 'none' }}
                    />
                  </span>
                </button>
              ))}
            </div>

            <div className="hero-nav-arrows" aria-label="Hero navigation">
              <button type="button" className="hero-arrow" onClick={() => goToSlide(-1)} aria-label="Previous slide">←</button>
              <button type="button" className="hero-arrow" onClick={() => goToSlide(1)} aria-label="Next slide">→</button>
            </div>
          </div>
        </section>

        <section className="feature-strip" aria-label="Platform features">
          <div className="container feature-strip-inner">
            {featureItems.map((feature) => {
              const content = (
                <>
                  <span className={`feature-icon feature-icon-${feature.icon}`}><FeatureIcon type={feature.icon} /></span>
                  <span className="feature-copy">
                    <strong>{feature.title}</strong>
                    <span>{feature.description}</span>
                  </span>
                </>
              );

              return feature.href ? <a className="feature-item" href={feature.href} key={feature.title}>{content}</a> : <div className="feature-item" key={feature.title}>{content}</div>;
            })}
          </div>
        </section>

        <section id="sports" className="sports-section section-spacing reveal" data-reveal>
          <div className="container">
            <div className="section-heading split-heading">
              <div>
                <h2>POPULAR SPORTS</h2>
              </div>
            </div>

            <div className="sports-grid">
              {popularSports.map((sport) => (
                <article key={sport.id} className="sport-card reveal" data-reveal>
                  <div className="sport-image-wrap">
                    <img src={sport.image} alt={sport.name} loading="lazy" />
                  </div>
                  <div className="sport-card-body">
                    <div className="sport-header-row">
                      <span className="sport-badge">{sport.icon}</span>
                      <h3>{sport.name}</h3>
                    </div>
                    <p>{sport.description}</p>
                    <button type="button" className="link-button" onClick={() => handleJoin('Join Now')}>
                      Join Now
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="turfs" className="turfs-section section-spacing reveal" data-reveal>
          <div className="container">
            <div className="section-heading">
              <span className="section-kicker">FIND YOUR TURF IN VADODARA</span>
              <h2>Discover sports venues across the city and find the right place for your next game.</h2>
            </div>

            <div className="filter-bar">
              <label className="search-box">
                <span className="search-icon">⌕</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search turfs in Vadodara..."
                />
              </label>

              <div className="select-group">
                <label>
                  <span>Sport</span>
                  <select value={sportFilter} onChange={(e) => setSportFilter(e.target.value)}>
                    <option value="All">All</option>
                    <option value="Cricket">Cricket</option>
                    <option value="Football">Football</option>
                    <option value="Pickleball">Pickleball</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Badminton">Badminton</option>
                  </select>
                </label>

                <label>
                  <span>Area</span>
                  <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
                    {areaOptions.map((area) => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="turfs-grid">
              {filteredTurfs.map((turf) => (
                <article key={turf.id} className="turf-card reveal" data-reveal>
                  <div className="turf-image-wrap">
                    <img src={turf.image} alt={turf.name} loading="lazy" />
                    <span className="area-badge">{turf.area}</span>
                    <div className="sport-badges">
                      {turf.sports.map((sport) => (
                        <span key={sport}>{sport}</span>
                      ))}
                    </div>
                  </div>
                  <div className="turf-card-body">
                    <h3>{turf.name}</h3>
                    <p className="turf-location">📍 {turf.address || `${turf.area}, Vadodara`}</p>
                    <div className="meta-line">
                      <span>Sports:</span>
                      <strong>{turf.sports.join(' • ')}</strong>
                    </div>
                    <div className="meta-line">
                      <span>Facilities:</span>
                      <strong>{turf.facilities.join(' • ')}</strong>
                    </div>
                    <div className="meta-line">
                      <span>Opening:</span>
                      <strong>{turf.openingHours}</strong>
                    </div>
                    <div className="meta-line price-row">
                      <span>Starting price:</span>
                      <strong>{turf.price}</strong>
                    </div>
                    <div className="turf-actions">
                      <button type="button" className="btn btn-primary" onClick={() => handleJoin('Join Now')}>
                        Join Now
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => { window.location.href = `${import.meta.env.BASE_URL}book-your-turf`; }}>
                        View Details
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="upcoming-tournaments" className="tournament-preview section-spacing reveal" data-reveal>
          <div className="container">
            <div className="section-heading tournament-preview-heading">
              <h2>UPCOMING TOURNAMENTS</h2>
              <a className="tournament-view-all" href={`${import.meta.env.BASE_URL}tournaments`}>VIEW ALL TOURNAMENTS <span aria-hidden="true">→</span></a>
            </div>
            {upcomingTournaments.length ? <div className="tournament-discovery-grid">
              {upcomingTournaments.map((tournament, index) => (
                <article key={tournament.id} className="tournament-discovery-card" style={{ '--card-delay': `${index * 80}ms` }}>
                  <div className="discovery-card-image">
                    <img src={tournament.image} alt={`${tournament.sport} tournament`} loading="lazy" />
                    <span className="sport-chip">{tournament.sport}</span>
                  </div>
                  <div className="discovery-card-body">
                    <h3>{tournament.name}</h3>
                    <div className="card-meta">
                      <span>◷ {tournament.dateLabel}</span>
                      <span>⌖ {tournament.area}, Vadodara</span>
                      <span>◇ {tournament.format}</span>
                    </div>
                    <div className="discovery-card-footer">
                      <span className="status-badge status-upcoming">UPCOMING</span>
                      <a className="link-button" href={`${import.meta.env.BASE_URL}tournaments`}>View Tournament</a>
                    </div>
                  </div>
                </article>
              ))}
            </div> : <div className="tournament-empty home-tournament-empty"><span className="section-kicker">UPCOMING TOURNAMENTS</span><p>No upcoming tournaments at the moment.</p></div>}
          </div>
        </section>

        <section className="tournament-cta section-spacing reveal" data-reveal>
          <div className="container tournament-cta-inner">
            <div className="cta-content">
              <span className="section-kicker">UPCOMING TOURNAMENTS</span>
              <h2>YOUR NEXT BIG GAME IS WAITING.</h2>
              <p>Explore upcoming tournaments across Vadodara and find your next opportunity to compete.</p>
              <div className="cta-actions">
                <button type="button" className="btn btn-primary" onClick={() => handleNavClick('/upcoming-tournaments')}>
                  VIEW UPCOMING TOURNAMENTS
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => handleJoin('Join as a Player')}>
                  Join the Platform
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="login" className="final-cta section-spacing reveal" data-reveal>
          <div className="container final-cta-box">
            <div className="final-cta-content">
              <span className="section-kicker">READY TO PLAY?</span>
              <h2>Find your sport. Discover your turf. Join the game.</h2>
              <p>Become part of Vadodara's growing sports community.</p>
              <div className="cta-actions">
                <a className="btn btn-primary" href={`${import.meta.env.BASE_URL}player/register`}>Join as a Player</a>
                <a className="btn btn-secondary" href={`${import.meta.env.BASE_URL}turf-owner/register`}>Register Your Turf</a>
              </div>
            </div>
            <div className="final-cta-stats" aria-label="Platform statistics">
              {platformStats.map((stat) => (
                <div className="final-cta-stat" key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div id="signup" aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: '1px', height: '1px', overflow: 'hidden' }} />
      </main>

      <Footer />
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="page-shell">
      <GlobalHeader />
      <main className="container section-spacing">
        <section className="turf-directory-empty" style={{ maxWidth: 760, margin: '80px auto 0' }}>
          <span className="section-kicker">404</span>
          <h2>PAGE NOT FOUND.</h2>
          <p>The page you are looking for doesn’t exist or is no longer available.</p>
          <button type="button" className="btn btn-primary" onClick={() => { window.location.href = `${import.meta.env.BASE_URL}`; }}>Back to Home</button>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default App;
