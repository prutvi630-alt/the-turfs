import { useEffect, useMemo, useState } from 'react';
import { heroSlides, sports, turfs, tournamentData } from './data/homeData';
import AboutPage from './AboutPage';
import TournamentPage from './TournamentPage';
import PlayerApp from './PlayerApp';
import BookingPage from './BookingPage';
import GlobalHeader from './GlobalHeader';

const formatHeroTitle = (title) => title.split('\n').map((line, index) => <span key={index}>{line}</span>);

function App() {
  if (window.location.pathname === '/about') {
    return <AboutPage />;
  }

  if (window.location.pathname.startsWith('/tournaments')) {
    return <TournamentPage />;
  }

  if (window.location.pathname === '/book-your-turf' || window.location.pathname.startsWith('/book-your-turf/')) {
    return <BookingPage />;
  }

  if (['/signup', '/login', '/player', '/turf-owner'].some((path) => window.location.pathname.startsWith(path))) {
    return <PlayerApp />;
  }

  const [activeSlide, setActiveSlide] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('All');
  const [areaFilter, setAreaFilter] = useState('All');
  const [isPaused, setIsPaused] = useState(false);

  const areaOptions = useMemo(
    () => ['All', ...new Set(turfs.map((turf) => turf.area).filter(Boolean))],
    []
  );

  useEffect(() => {
    if (isPaused) return undefined;

    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused]);

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
    const matchesSearch = turf.name.toLowerCase().includes(search.toLowerCase());
    const matchesSport = sportFilter === 'All' || turf.sports.includes(sportFilter);
    const matchesArea = areaFilter === 'All' || turf.area === areaFilter;
    return matchesSearch && matchesSport && matchesArea;
  });

  const goToSlide = (direction) => {
    setActiveSlide((prev) => {
      if (direction === 'next') return (prev + 1) % heroSlides.length;
      return (prev - 1 + heroSlides.length) % heroSlides.length;
    });
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
    const destination = label === 'Register Your Turf' ? '/signup' : label === 'Join as a Player' ? '/signup' : '/login';
    window.location.href = destination;
  };

  return (
    <div id="top" className="page-shell">
      <GlobalHeader />

      <main>
        <section className="hero-section">
          <div className="hero-slider" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
            {heroSlides.map((slide, index) => (
              <div
                key={slide.label}
                className={`hero-slide ${index === activeSlide ? 'active' : ''}`}
                style={{ backgroundImage: `url(${slide.image})` }}
                aria-hidden={index !== activeSlide}
              >
                <div className="hero-overlay" />
                <div className="container hero-content-wrap">
                  <div className="hero-copy">
                    <span className="eyebrow">{slide.label}</span>
                    <h1>{formatHeroTitle(slide.title)}</h1>
                    <p>{slide.text}</p>
                    <div className="hero-actions">
                      <button type="button" className="btn btn-primary" onClick={() => handleNavClick(slide.primaryTarget)}>
                        {slide.ctaPrimary}
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => handleNavClick(slide.secondaryTarget)}>
                        {slide.ctaSecondary}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="hero-controls container">
              <div className="slider-nav">
                <button type="button" className="slider-arrow" aria-label="Previous slide" onClick={() => goToSlide('prev')}>
                  ‹
                </button>
                <div className="slide-indicators" aria-label="Slide indicators">
                  {heroSlides.map((slide, index) => (
                    <button
                      key={slide.label}
                      type="button"
                      className={`indicator ${index === activeSlide ? 'active' : ''}`}
                      aria-label={`Go to slide ${index + 1}`}
                      onClick={() => setActiveSlide(index)}
                    />
                  ))}
                </div>
                <button type="button" className="slider-arrow" aria-label="Next slide" onClick={() => goToSlide('next')}>
                  ›
                </button>
              </div>

              <div className="slider-meta">
                <span>{String(activeSlide + 1).padStart(2, '0')}</span>
                <div className="progress-track" aria-hidden="true">
                  <span style={{ width: `${((activeSlide + 1) / heroSlides.length) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="intro-section container section-spacing reveal" data-reveal>
          <div className="intro-visual">
            <img
              src="https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80"
              alt="Sports community in Vadodara"
            />
          </div>
          <div className="intro-content">
            <span className="section-kicker">VADODARA. YOUR GAME. YOUR COMMUNITY.</span>
            <h2>The Vadodara Sports Platform is designed to bring players, sports venues and tournaments together in one place.</h2>
            <p>
              Discover where to play, find your sport, explore upcoming tournaments and become part of a growing local sports community.
            </p>
            <div className="benefits-grid">
              <article>
                <span>DISCOVER</span>
                <p>Find sports and venues around Vadodara.</p>
              </article>
              <article>
                <span>CONNECT</span>
                <p>Join the sporting community and discover opportunities to play.</p>
              </article>
              <article>
                <span>COMPETE</span>
                <p>Take part in tournaments and competitive events.</p>
              </article>
            </div>

            <div className="journey-timeline" aria-label="Platform journey timeline">
              <div className="timeline-step">
                <span className="timeline-dot" />
                <div>
                  <strong>01</strong>
                  <p>Discover your sport</p>
                </div>
              </div>
              <div className="timeline-step">
                <span className="timeline-dot" />
                <div>
                  <strong>02</strong>
                  <p>Find the right turf</p>
                </div>
              </div>
              <div className="timeline-step">
                <span className="timeline-dot" />
                <div>
                  <strong>03</strong>
                  <p>Join the next match</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="sports" className="sports-section section-spacing reveal" data-reveal>
          <div className="container">
            <div className="section-heading split-heading">
              <div>
                <span className="section-kicker">PLAY YOUR GAME.</span>
                <h2>Sports &amp; tournaments organized across Vadodara.</h2>
              </div>
            </div>

            <div className="sports-grid">
              {sports.map((sport) => (
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
                    <p className="turf-location">📍 {turf.area}, Vadodara</p>
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
                      <button type="button" className="btn btn-secondary" onClick={() => handleNavClick('/upcoming-tournaments')}>
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
            <div className="section-heading">
              <span className="section-kicker">UPCOMING TOURNAMENTS</span>
              <h2>Find your next opportunity to compete.</h2>
            </div>
            <div className="tournament-grid">
              {tournamentData.map((event) => (
                <article key={event.name} className="tournament-card reveal" data-reveal>
                  <span className="tournament-sport">{event.sport}</span>
                  <h3>{event.name}</h3>
                  <ul>
                    <li>{event.date}</li>
                    <li>{event.venue}</li>
                    <li>{event.location}</li>
                    <li>{event.format}</li>
                    <li>{event.status}</li>
                  </ul>
                  <button type="button" className="link-button" onClick={() => handleNavClick(event.href)}>
                    View Tournament
                  </button>
                </article>
              ))}
            </div>
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
            <div>
              <span className="section-kicker">READY TO PLAY?</span>
              <h2>Find your sport. Discover your turf. Join the game.</h2>
            </div>
            <div className="cta-actions">
              <button type="button" className="btn btn-primary" onClick={() => handleJoin('Join as a Player')}>
                Join as a Player
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => handleJoin('Register Your Turf')}>
                Register Your Turf
              </button>
            </div>
          </div>
        </section>

        <div id="signup" aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: '1px', height: '1px', overflow: 'hidden' }} />
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <h3>SPORTS BELONG TO EVERYONE.</h3>
            <p>Building a connected sports community for Vadodara — one game, one venue and one tournament at a time.</p>
            <div className="socials">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">Instagram</a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">Facebook</a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">LinkedIn</a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">YouTube</a>
            </div>
          </div>

          <div className="footer-column">
            <h4>PLATFORM</h4>
            <ul>
              <li><button type="button" onClick={() => handleNavClick('#top')}>Home</button></li>
              <li><button type="button" onClick={() => handleNavClick('#about')}>About Us</button></li>
              <li><button type="button" onClick={() => handleNavClick('/upcoming-tournaments')}>Upcoming Tournaments</button></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>SPORTS</h4>
            <ul>
              {sports.map((sport) => (
                <li key={sport.id}>{sport.name}</li>
              ))}
            </ul>
          </div>

          <div className="footer-column">
            <h4>JOIN</h4>
            <ul>
              <li><button type="button" onClick={() => handleJoin('Join as a Player')}>Player Signup</button></li>
              <li><button type="button" onClick={() => handleJoin('Register Your Turf')}>Turf Registration</button></li>
              <li><button type="button" onClick={() => handleJoin('Login')}>Login</button></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>SUPPORT</h4>
            <ul>
              <li><button type="button" onClick={() => handleNavClick('#top')}>Contact Us</button></li>
              <li><button type="button" onClick={() => handleNavClick('#top')}>Terms</button></li>
              <li><button type="button" onClick={() => handleNavClick('#top')}>Privacy</button></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="container footer-bottom-inner">
            <span>© 2026 Vadodara Sports Platform. All rights reserved.</span>
            <span>Made for the sports community of Vadodara.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
