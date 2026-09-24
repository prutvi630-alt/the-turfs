import { useEffect, useState } from 'react';
import { sports } from './data/homeData';
import GlobalHeader from './GlobalHeader';
import Footer from './Footer';

const baseUrl = import.meta.env.BASE_URL;
const route = (path) => `${baseUrl}${path.replace(/^\//, '')}`;

const principles = [
  { icon: '◌', label: 'DISCOVER', text: 'Find sports, venues and opportunities around Vadodara.' },
  { icon: '↗', label: 'CONNECT', text: 'Bring players, sports venues and tournaments closer together.' },
  { icon: '✦', label: 'COMPETE', text: 'Create more opportunities for people to participate and compete.' },
];

const ecosystem = [
  { icon: '◉', label: 'PLAYER', href: route('/players'), items: ['Discover sports', 'Find venues', 'Join opportunities'] },
  { icon: '⌂', label: 'TURF', href: route('/book-your-turf'), items: ['Showcase venue', 'Connect with players', 'Host sporting activity'] },
  { icon: '◇', label: 'TOURNAMENT', href: route('/tournaments'), items: ['Create competition', 'Bring teams together', 'Give players an opportunity to compete'] },
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
      window.location.href = route('/login');
      return;
    }
    if (href === '/signup') {
      window.location.href = route('/signup');
      return;
    }
    if (href === '/tournaments' || href === '/players' || href === '/book-your-turf' || href === '/turf-owner/register' || href === '/player/register') {
      window.location.href = route(href === '/book-your-turf' ? '/book-your-turf' : href);
      return;
    }
    window.location.href = route(href);
  };

  return (
    <div className="page-shell about-page" id="about-top">
      <GlobalHeader />

      <main>
        <section className="about-hero">
          <div className="about-hero-backdrop" />
          <div className="container about-hero-content about-reveal" data-about-reveal>
            <span className="eyebrow">ABOUT CLIFT</span>
            <h1>MORE THAN JUST A GAME.</h1>
            <p>CLIFT brings players, turfs and tournaments together in one connected sports platform for Vadodara.</p>
            <strong>Discover. Connect. Compete.</strong>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary" onClick={() => navigate('/tournaments')}>Explore Tournaments</button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/book-your-turf')}>Explore Turfs</button>
            </div>
          </div>
        </section>

        <section className="about-editorial section-spacing container about-reveal" data-about-reveal>
          <div className="about-image-frame image-reveal">
            <img src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=85" alt="Players sharing a moment on a sports field" />
          </div>
          <div className="about-editorial-copy">
            <span className="section-kicker">WHAT IS CLIFT?</span>
            <h2>SPORTS SHOULD BE EASIER TO DISCOVER.</h2>
            <p>CLIFT is a sports platform built to connect the people and places that make local sport happen. It brings together players, venue owners and tournament communities in one place.</p>
            <p>Instead of treating discovery, booking and competition as separate experiences, the platform connects them into one clear sports journey for Vadodara.</p>
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
            <span className="section-kicker">THE PROBLEM</span>
            <h2>ONE CITY.<br /><em>ONE SPORTS COMMUNITY.</em></h2>
            <p>Players often struggle to discover the right turf, tournament or opportunity at the right time. Turf owners need better visibility, and communities are fragmented across disconnected channels.</p>
            <p>CLIFT exists to make local sports easier to discover, easier to join and easier to build around.</p>
          </div>
        </section>

        <section className="ecosystem-section section-spacing container about-reveal" data-about-reveal>
          <div className="section-heading centered-heading">
            <span className="section-kicker">THE CLIFT ECOSYSTEM</span>
            <h2>EVERY PART OF THE GAME,<br />CLOSER TOGETHER.</h2>
          </div>
          <div className="ecosystem-visual">
            <div className="ecosystem-orbit orbit-one" /><div className="ecosystem-orbit orbit-two" />
            {ecosystem.map((node) => (
              <a href={node.href} className={`ecosystem-node ecosystem-${node.label.toLowerCase().replace(' ', '-')}`} key={node.label} onClick={(event) => { if (node.href.startsWith('http')) return; event.preventDefault(); window.location.href = node.href; }}>
                <span className="ecosystem-icon" aria-hidden="true">{node.icon}</span>
                <strong>{node.label}</strong>
                <ul>{node.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </a>
            ))}
            <div className="ecosystem-core"><span>VS</span><strong>SPORTS<br />PLATFORM</strong></div>
            <div className="ecosystem-community">COMMUNITY</div>
          </div>
        </section>

        <section className="journey-section section-spacing about-reveal" data-about-reveal>
          <div className="container">
            <div className="section-heading journey-heading">
              <span className="section-kicker">HOW CLIFT CONNECTS EVERYONE</span>
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
            <span className="section-kicker">MISSION</span>
            <h2>TO MAKE LOCAL SPORTS<br /><em>EASIER TO DISCOVER.</em></h2>
            <p>CLIFT’s mission is to make local sports easier to discover, easier to participate in and more connected for everyone.</p>
            <span className="city-stamp">VADODARA SPORTS COMMUNITY</span>
          </div>
        </section>

        <section className="values-section section-spacing container about-reveal" data-about-reveal>
          <div className="section-heading"><span className="section-kicker">VISION</span><h2>BUILDING A SPORTS ECOSYSTEM<br />WHERE EVERYONE CAN GROW.</h2></div>
          <div className="values-grid">{values.map(([label, text], index) => <article className="value-card" key={label}><span>0{index + 1}</span><h3>{label}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className="brand-statement section-spacing about-reveal" data-about-reveal>
          <div className="container brand-statement-inner"><span className="section-kicker">WHY CLIFT</span><h2>DISCOVER.<br /><em>CONNECT.</em><br />COMPETE.<br />GROW.</h2><p>Because playing together creates better communities, stronger opportunities and a richer local sports culture.</p></div>
        </section>

        <section className="about-final-cta section-spacing about-reveal" data-about-reveal>
          <div className="about-final-backdrop" />
          <div className="container about-final-content">
            <span className="section-kicker">READY TO BE PART OF THE GAME?</span>
            <h2>JOIN THE PLATFORM.</h2>
            <p>Whether you play, host or compete, CLIFT gives you a place to get started.</p>
            <div className="cta-actions">
              <button type="button" className="btn btn-primary" onClick={() => navigate('/tournaments')}>Explore Tournaments</button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/turf-owner/register')}>Register Your Turf</button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/player/register')}>Register as a Player</button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default AboutPage;
