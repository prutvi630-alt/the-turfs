import { useEffect, useState } from 'react';
import { sports } from './data/homeData';
import GlobalHeader, { navItems } from './GlobalHeader';

const principles = [
  { icon: '◌', label: 'DISCOVER', text: 'Find sports, venues and opportunities around Vadodara.' },
  { icon: '↗', label: 'CONNECT', text: 'Bring players, sports venues and tournaments closer together.' },
  { icon: '✦', label: 'COMPETE', text: 'Create more opportunities for people to participate and compete.' },
];

const ecosystem = [
  { icon: '◉', label: 'PLAYER', items: ['Discover sports', 'Find venues', 'Join opportunities'] },
  { icon: '⌂', label: 'SPORTS VENUE', items: ['Showcase venue', 'Connect with players', 'Host sporting activity'] },
  { icon: '◇', label: 'TOURNAMENT', items: ['Create competition', 'Bring teams together', 'Give players an opportunity to compete'] },
];

const journey = [
  ['DISCOVER', 'Find your sport and explore opportunities around Vadodara.'],
  ['FIND', 'Discover sports venues where you can play.'],
  ['JOIN', 'Become part of the sports community and participate.'],
  ['COMPETE', 'Take your game into tournaments and competitive events.'],
];

const values = [
  ['COMMUNITY', 'Sports become better when people play together.'],
  ['ACCESS', 'Make sporting opportunities easier to discover.'],
  ['COMPETITION', 'Create more ways for players to challenge themselves.'],
  ['GROWTH', 'Help build a stronger local sporting ecosystem.'],
];

function AboutPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeJourney, setActiveJourney] = useState(0);

  useEffect(() => {
    const elements = document.querySelectorAll('[data-about-reveal]');
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.14, rootMargin: '0px 0px -40px 0px' }
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const steps = document.querySelectorAll('[data-journey-step]');
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveJourney(Number(entry.target.dataset.journeyStep));
      }),
      { threshold: 0.65, rootMargin: '-15% 0px -25% 0px' }
    );
    steps.forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, []);

  const navigate = (href) => {
    setIsMenuOpen(false);
    if (href.startsWith('#')) {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (href === '/login') {
      window.location.href = '/login';
      return;
    }
    if (href === '/signup') {
      window.location.href = '/signup';
      return;
    }
    if (href === '/tournaments') {
      window.location.href = href;
      return;
    }
    window.location.href = href;
  };

  return (
    <div className="page-shell about-page" id="about-top">
      <GlobalHeader />

      <main>
        <section className="about-hero">
          <div className="about-hero-backdrop" />
          <div className="container about-hero-content about-reveal" data-about-reveal>
            <span className="eyebrow">ABOUT THE PLATFORM</span>
            <h1>MORE THAN A GAME.</h1>
            <p>We're building a connected sports ecosystem for Vadodara — bringing players, venues and tournaments closer together.</p>
            <strong>Discover. Connect. Compete.</strong>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary" onClick={() => navigate('/tournaments')}>Explore Upcoming Tournaments</button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/#sports')}>Explore Sports</button>
            </div>
          </div>
        </section>

        <section className="about-editorial section-spacing container about-reveal" data-about-reveal>
          <div className="about-image-frame image-reveal">
            <img src="https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=85" alt="Players sharing a moment on a sports field" />
          </div>
          <div className="about-editorial-copy">
            <span className="section-kicker">WHY WE BUILT THIS</span>
            <h2>SPORTS SHOULD BE EASIER TO DISCOVER.</h2>
            <p>Finding a place to play, discovering tournaments and becoming part of a sporting community can often feel scattered across different platforms and channels.</p>
            <p>The Vadodara Sports Platform is designed to bring these experiences closer together — giving players a simpler way to discover sports opportunities around their city.</p>
            <div className="principles-row">
              {principles.map((principle) => (
                <article className="principle-item" key={principle.label}>
                  <span className="principle-icon" aria-hidden="true">{principle.icon}</span>
                  <strong>{principle.label}</strong>
                  <p>{principle.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="idea-section section-spacing about-reveal" data-about-reveal>
          <div className="idea-backdrop" />
          <div className="container idea-content">
            <span className="section-kicker">THE IDEA</span>
            <h2>ONE CITY.<br /><em>ONE SPORTS COMMUNITY.</em></h2>
            <p>Vadodara has players who want to play, venues that provide places to play, and tournaments that create opportunities to compete.</p>
            <p>The idea is simple: bring these parts of the sporting ecosystem together through one connected platform.</p>
          </div>
        </section>

        <section className="ecosystem-section section-spacing container about-reveal" data-about-reveal>
          <div className="section-heading centered-heading">
            <span className="section-kicker">THE SPORTS ECOSYSTEM</span>
            <h2>EVERY PART OF THE GAME,<br />CLOSER TOGETHER.</h2>
          </div>
          <div className="ecosystem-visual">
            <div className="ecosystem-orbit orbit-one" /><div className="ecosystem-orbit orbit-two" />
            {ecosystem.map((node) => (
              <article className={`ecosystem-node ecosystem-${node.label.toLowerCase().replace(' ', '-')}`} key={node.label}>
                <span className="ecosystem-icon" aria-hidden="true">{node.icon}</span>
                <strong>{node.label}</strong>
                <ul>{node.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
            ))}
            <div className="ecosystem-core"><span>VS</span><strong>SPORTS<br />PLATFORM</strong></div>
            <div className="ecosystem-community">COMMUNITY</div>
          </div>
        </section>

        <section className="journey-section section-spacing about-reveal" data-about-reveal>
          <div className="container">
            <div className="section-heading journey-heading">
              <span className="section-kicker">HOW IT COMES TOGETHER</span>
              <h2>FROM DISCOVERY<br />TO COMPETITION.</h2>
            </div>
            <div className="journey-progress"><span style={{ height: `${((activeJourney + 1) / journey.length) * 100}%` }} /></div>
            <div className="about-journey-list">
              {journey.map(([label, text], index) => (
                <article className={`about-journey-step ${index <= activeJourney ? 'active' : ''}`} data-journey-step={index} key={label}>
                  <span className="journey-number">{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{label}</strong><p>{text}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="about-sports section-spacing container about-reveal" data-about-reveal>
          <div className="section-heading centered-heading">
            <span className="section-kicker">SPORTS WE BRING TOGETHER</span>
            <h2>YOUR GAME HAS A PLACE HERE.</h2>
            <p>Building opportunities across the sports people love to play.</p>
          </div>
          <div className="about-sports-grid">
            {sports.map((sport) => (
              <article className="about-sport-card" key={sport.id}>
                <div className="about-sport-image"><img src={sport.image} alt={`${sport.name} players`} loading="lazy" /></div>
                <div className="about-sport-card-copy"><span>{sport.icon}</span><h3>{sport.name.toUpperCase()}</h3><p>{sport.description.split('.')[0]}.</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="vadodara-section section-spacing about-reveal" data-about-reveal>
          <div className="vadodara-backdrop" />
          <div className="container vadodara-content">
            <span className="section-kicker">STARTING WITH VADODARA</span>
            <h2>BUILT AROUND<br /><em>THE CITY WE CALL HOME.</em></h2>
            <p>The platform begins with Vadodara — connecting the city's players, sports venues and sporting opportunities into one focused ecosystem.</p>
            <span className="city-stamp">VADODARA / 22.30° N, 73.19° E</span>
          </div>
        </section>

        <section className="values-section section-spacing container about-reveal" data-about-reveal>
          <div className="section-heading"><span className="section-kicker">WHAT WE STAND FOR</span><h2>THE PRINCIPLES<br />BEHIND THE PLATFORM.</h2></div>
          <div className="values-grid">{values.map(([label, text], index) => <article className="value-card" key={label}><span>0{index + 1}</span><h3>{label}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className="brand-statement section-spacing about-reveal" data-about-reveal>
          <div className="container brand-statement-inner"><span className="section-kicker">THE REASON WE KEEP BUILDING</span><h2>WE DON'T JUST WANT PEOPLE TO PLAY.<br /><em>WE WANT THEM TO KEEP PLAYING.</em></h2><p>Because every game creates a connection, every tournament creates an opportunity, and every player has a chance to grow.</p></div>
        </section>

        <section className="about-final-cta section-spacing about-reveal" data-about-reveal>
          <div className="about-final-backdrop" />
          <div className="container about-final-content"><span className="section-kicker">VADODARA SPORTS PLATFORM</span><h2>READY TO PLAY?</h2><p>Find your sport. Discover your venue. Join the game.</p><div className="cta-actions"><button type="button" className="btn btn-primary" onClick={() => navigate('/signup')}>Join the Platform</button><button type="button" className="btn btn-secondary" onClick={() => navigate('/tournaments')}>Upcoming Tournaments</button></div></div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand"><h3>SPORTS BELONG TO EVERYONE.</h3><p>Building a connected sports community for Vadodara — one game, one venue and one tournament at a time.</p><div className="socials"><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a><a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook</a><a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a><a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a></div></div>
          <div className="footer-column"><h4>PLATFORM</h4><ul>{navItems.map((item) => <li key={item.label}><button type="button" onClick={() => navigate(item.href)}>{item.label}</button></li>)}</ul></div>
          <div className="footer-column"><h4>SPORTS</h4><ul>{sports.map((sport) => <li key={sport.id}>{sport.name}</li>)}</ul></div>
          <div className="footer-column"><h4>JOIN</h4><ul><li><button type="button" onClick={() => navigate('/login')}>Login</button></li><li><button type="button" onClick={() => navigate('/signup')}>Sign Up</button></li><li><button type="button" onClick={() => navigate('/signup')}>Register Your Turf</button></li></ul></div>
          <div className="footer-column"><h4>ABOUT</h4><ul><li><button type="button" onClick={() => navigate('/about')}>Our Story</button></li><li><button type="button" onClick={() => navigate('/#sports')}>Explore Sports</button></li><li><button type="button" onClick={() => navigate('/tournaments')}>Tournaments</button></li></ul></div>
        </div>
        <div className="footer-bottom"><div className="container footer-bottom-inner"><span>© 2026 Vadodara Sports Platform. All rights reserved.</span><span>Made for the sports community of Vadodara.</span></div></div>
      </footer>
    </div>
  );
}

export default AboutPage;
