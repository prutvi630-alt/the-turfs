import { useEffect, useMemo, useState } from 'react';
import { sports, turfs } from './data/homeData';
import { tournaments } from './data/tournaments';
import GlobalHeader, { navItems } from './GlobalHeader';

const filterOptions = {
  sports: ['All Sports', ...sports.map((sport) => sport.name)],
  statuses: ['All', 'Upcoming', 'Registration Open', 'Starting Soon'],
  dates: ['Any Date', 'This Week', 'This Month'],
};

const getVenue = (tournament) => turfs.find((turf) => turf.id === tournament.venueId) || null;

function TournamentPage() {
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState('All Sports');
  const [status, setStatus] = useState('All');
  const [dateRange, setDateRange] = useState('Any Date');
  const [selectedId, setSelectedId] = useState(null);

  const isDetail = window.location.pathname.startsWith('/tournaments/');
  const routeId = window.location.pathname.split('/').filter(Boolean)[1];
  const selectedTournament = tournaments.find((tournament) => tournament.id === (selectedId || routeId)) || null;

  useEffect(() => {
    const elements = document.querySelectorAll('[data-tournament-reveal]');
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [isDetail, selectedId]);

  const navigate = (href) => {
    setIsMenuOpen(false);
    if (href === '/login') {
      window.location.href = '/login';
      return;
    }
    if (href === '/signup') {
      window.location.href = '/signup';
      return;
    }
    window.location.href = href;
  };

  const filteredTournaments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tournaments.filter((tournament) => {
      const matchesQuery = !normalized || [tournament.name, tournament.sport, tournament.venueName, tournament.area].some((value) => value.toLowerCase().includes(normalized));
      const matchesSport = sport === 'All Sports' || tournament.sport === sport;
      const matchesStatus = status === 'All' || tournament.status === status;
      const eventDate = new Date(`${tournament.date}T00:00:00`);
      const now = new Date('2026-09-09T00:00:00');
      const daysAway = Math.ceil((eventDate - now) / 86400000);
      const matchesDate = dateRange === 'Any Date' || (dateRange === 'This Week' && daysAway <= 7) || (dateRange === 'This Month' && daysAway <= 31);
      return matchesQuery && matchesSport && matchesStatus && matchesDate;
    });
  }, [dateRange, query, sport, status]);

  const clearFilters = () => {
    setQuery('');
    setSport('All Sports');
    setStatus('All');
    setDateRange('Any Date');
  };

  const openTournament = (tournament) => {
    setSelectedId(tournament.id);
    window.location.href = `/tournaments/${tournament.id}`;
  };

  if (isDetail && selectedTournament) {
    return <TournamentDetail tournament={selectedTournament} navigate={navigate} />;
  }

  return (
    <div className="page-shell tournament-page">
      <GlobalHeader />
      <main>
        <section className="tournament-hero">
          <div className="tournament-hero-backdrop" />
          <div className="container tournament-hero-content tournament-reveal" data-tournament-reveal>
            <span className="eyebrow">UPCOMING TOURNAMENTS</span>
            <h1>PLAY.<br />COMPETE.<br /><em>MAKE YOUR MARK.</em></h1>
            <p>Discover upcoming tournaments across Vadodara and find your next opportunity to compete.</p>
            <div className="hero-actions"><button type="button" className="btn btn-primary" onClick={() => document.querySelector('#upcoming')?.scrollIntoView({ behavior: 'smooth' })}>Explore Tournaments</button><button type="button" className="btn btn-secondary" onClick={() => navigate('/signup')}>Join the Platform</button></div>
          </div>
        </section>

        <section className="tournament-discovery container section-spacing" id="upcoming">
          <div className="tournament-filter-bar tournament-reveal" data-tournament-reveal>
            <label className="tournament-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tournaments, sports or venues..." aria-label="Search tournaments" /></label>
            <label><span>Sport</span><select value={sport} onChange={(event) => setSport(event.target.value)}>{filterOptions.sports.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label><span>Date</span><select value={dateRange} onChange={(event) => setDateRange(event.target.value)}>{filterOptions.dates.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{filterOptions.statuses.map((option) => <option key={option}>{option}</option>)}</select></label>
            {(query || sport !== 'All Sports' || status !== 'All' || dateRange !== 'Any Date') && <button type="button" className="clear-filters" onClick={clearFilters}>Clear All</button>}
          </div>

          <section className="featured-tournament tournament-reveal" data-tournament-reveal>
            <div className="featured-image"><img src={tournaments[0].image} alt="Cricket tournament action" /></div>
            <div className="featured-content"><span className="section-kicker">THE NEXT BIG GAME</span><span className="sport-chip">{tournaments[0].sport}</span><h2>{tournaments[0].name}</h2><p className="featured-description">{tournaments[0].description}</p><div className="tournament-meta-grid"><Meta icon="◷" label="DATE" value={tournaments[0].dateLabel} /><Meta icon="⌖" label="VENUE" value={tournaments[0].venueName} /><Meta icon="♙" label="TEAMS" value={`${tournaments[0].teamCapacity} Teams`} /><Meta icon="◇" label="FORMAT" value={tournaments[0].format} /><Meta icon="✦" label="PRIZE POOL" value={tournaments[0].prizePool} /></div><div className="featured-footer"><StatusBadge status={tournaments[0].status} /><button type="button" className="link-button" onClick={() => openTournament(tournaments[0])}>View Tournament</button></div></div>
          </section>

          <div className="section-heading tournament-list-heading tournament-reveal" data-tournament-reveal><div><span className="section-kicker">UPCOMING IN VADODARA</span><h2>FIND YOUR NEXT COMPETITION.</h2></div><span className="result-count">{filteredTournaments.length} TOURNAMENTS</span></div>
          {filteredTournaments.length ? <div className="tournament-discovery-grid">{filteredTournaments.map((tournament, index) => <TournamentCard key={tournament.id} tournament={tournament} index={index} onOpen={openTournament} />)}</div> : <div className="tournament-empty"><span className="section-kicker">NO TOURNAMENTS FOUND</span><p>Try changing your sport, date or search filters.</p><button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button></div>}
        </section>

        <section className="tournament-page-cta section-spacing tournament-reveal" data-tournament-reveal><div className="container tournament-page-cta-inner"><span className="section-kicker">VADODARA SPORTS PLATFORM</span><h2>YOUR NEXT GAME<br /><em>STARTS HERE.</em></h2><p>Find your sport, discover your venue and join the competition.</p><button type="button" className="btn btn-primary" onClick={() => navigate('/signup')}>Join the Platform</button></div></section>
      </main>
      <TournamentFooter navigate={navigate} />
    </div>
  );
}

function TournamentDetail({ tournament, navigate }) {
  const venue = getVenue(tournament);
  return (
    <div className="page-shell tournament-page tournament-detail-page">
      <GlobalHeader />
      <main>
        <section className="detail-hero"><div className="detail-hero-backdrop" style={{ backgroundImage: `linear-gradient(90deg, rgba(4, 9, 8, 0.94), rgba(4, 9, 8, 0.58)), url('${tournament.image}')` }} /><div className="container detail-hero-content tournament-reveal" data-tournament-reveal><button type="button" className="back-link" onClick={() => navigate('/tournaments')}>← Back to Tournaments</button><span className="eyebrow">{tournament.sport}</span><h1>{tournament.name}</h1><p>{tournament.dateLabel} <span>/</span> {tournament.venueName}</p><StatusBadge status={tournament.status} /></div></section>
        <section className="detail-info-strip"><div className="container detail-info-grid"><Meta icon="◷" label="DATE" value={tournament.dateLabel} /><Meta icon="⌖" label="VENUE" value={venue?.name || tournament.venueName} /><Meta icon="✦" label="SPORT" value={tournament.sport} /><Meta icon="◇" label="FORMAT" value={tournament.format} /><Meta icon="♙" label="TEAMS" value={`${tournament.teamCapacity}`} /><Meta icon="◆" label="PRIZE" value={tournament.prizePool} /></div></section>
        <section className="detail-content container section-spacing"><div className="detail-main-column"><section className="detail-block tournament-reveal" data-tournament-reveal><span className="section-kicker">TOURNAMENT OVERVIEW</span><h2>BUILT FOR THE NEXT<br />GREAT MATCH.</h2><p>{tournament.description}</p><div className="overview-facts"><Meta icon="◇" label="TOURNAMENT FORMAT" value={tournament.format} /><Meta icon="♙" label="TEAM CAPACITY" value={`${tournament.teamCapacity} Teams`} /><Meta icon="⚑" label="MATCH TYPE" value={tournament.matchType} /><Meta icon="✓" label="REGISTRATION" value={tournament.status} /></div></section><section className="detail-block tournament-reveal" data-tournament-reveal><span className="section-kicker">PARTICIPANTS</span><h2>TEAMS IN THE TOURNAMENT.</h2><div className="teams-grid">{tournament.teams.map((team) => <article className="team-card" key={team.name}><span className="team-mark">{team.name.slice(0, 2).toUpperCase()}</span><div><h3>{team.name}</h3><p>Captain <strong>{team.captain}</strong></p><span className="team-status">{team.status}</span></div></article>)}</div></section></div><aside className="detail-side-column"><div className="join-panel"><span className="section-kicker">READY TO COMPETE?</span><h3>Take your place in the next game.</h3><p>Join the platform to discover sporting opportunities in Vadodara.</p><button type="button" className="btn btn-primary" onClick={() => navigate('/signup')}>Join Tournament</button></div><div className="venue-panel"><span className="section-kicker">PLAYING AT</span><h3>{venue?.name || tournament.venueName}</h3><p>{venue?.area || tournament.area}, Vadodara</p><span>{venue?.openingHours || 'Tournament venue'}</span></div></aside></section>
        <section className="format-section section-spacing"><div className="container"><div className="section-heading centered-heading"><span className="section-kicker">TOURNAMENT FORMAT</span><h2>HOW THE TOURNAMENT WORKS.</h2><p>A simple demo structure that makes the route from first round to final easy to follow.</p></div><div className="format-flow">{tournament.bracket.rounds.map((round, index) => <div className="format-step" key={round.name}><span>0{index + 1}</span><strong>{round.name}</strong>{index < tournament.bracket.rounds.length - 1 && <i>↓</i>}</div>)}</div></div></section>
        <section className="bracket-section section-spacing container"><div className="section-heading"><span className="section-kicker">VISUAL BRACKET</span><h2>FOLLOW THE COMPETITION.</h2></div><div className="bracket-scroll"><div className="bracket-board">{tournament.bracket.rounds.map((round) => <div className="bracket-round" key={round.name}><h3>{round.name}</h3>{round.games.map((game) => <div className="bracket-game" key={game.join('-')}><span>{game[0]}</span><span>{game[1]}</span></div>)}</div>)}<div className="bracket-round champion-round"><h3>CHAMPION</h3><div className="bracket-game"><span>Final Winner</span></div></div></div></div></section>
        <section className="detail-bottom-cta section-spacing"><div className="container"><span className="section-kicker">MAKE YOUR MARK</span><h2>READY TO COMPETE?</h2><p>Join the platform and discover upcoming sporting opportunities in Vadodara.</p><div className="cta-actions"><button type="button" className="btn btn-primary" onClick={() => navigate('/signup')}>Join Tournament</button><button type="button" className="btn btn-secondary" onClick={() => navigate('/tournaments')}>Explore More Tournaments</button></div></div></section>
      </main>
      <TournamentFooter navigate={navigate} />
    </div>
  );
}

function TournamentCard({ tournament, index, onOpen }) {
  return <article className="tournament-discovery-card tournament-reveal" data-tournament-reveal style={{ '--card-delay': `${index * 80}ms` }}><div className="discovery-card-image"><img src={tournament.image} alt={`${tournament.sport} tournament`} loading="lazy" /><span className="sport-chip">{tournament.sport}</span></div><div className="discovery-card-body"><h3>{tournament.name}</h3><div className="card-meta"><span>◷ {tournament.dateLabel}</span><span>⌖ {tournament.area}</span><span>◇ {tournament.format}</span></div><div className="discovery-card-footer"><StatusBadge status={tournament.status} /><button type="button" className="link-button" onClick={() => onOpen(tournament)}>View Tournament</button></div></div></article>;
}

function Meta({ icon, label, value }) {
  return <div className="tournament-meta"><span className="meta-icon" aria-hidden="true">{icon}</span><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>;
}

function TournamentFooter({ navigate }) {
  return <footer className="site-footer"><div className="container footer-grid"><div className="footer-brand"><h3>SPORTS BELONG TO EVERYONE.</h3><p>Building a connected sports community for Vadodara — one game, one venue and one tournament at a time.</p><div className="socials"><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a><a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook</a><a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a><a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a></div></div><div className="footer-column"><h4>PLATFORM</h4><ul>{navItems.map((item) => <li key={item.label}><button type="button" onClick={() => navigate(item.href)}>{item.label}</button></li>)}</ul></div><div className="footer-column"><h4>SPORTS</h4><ul>{sports.map((sport) => <li key={sport.id}>{sport.name}</li>)}</ul></div><div className="footer-column"><h4>JOIN</h4><ul><li><button type="button" onClick={() => navigate('/login')}>Login</button></li><li><button type="button" onClick={() => navigate('/signup')}>Sign Up</button></li><li><button type="button" onClick={() => navigate('/signup')}>Register Your Turf</button></li></ul></div><div className="footer-column"><h4>ABOUT</h4><ul><li><button type="button" onClick={() => navigate('/about')}>Our Story</button></li><li><button type="button" onClick={() => navigate('/tournaments')}>Tournaments</button></li></ul></div></div><div className="footer-bottom"><div className="container footer-bottom-inner"><span>© 2026 Vadodara Sports Platform. All rights reserved.</span><span>Made for the sports community of Vadodara.</span></div></div></footer>;
}

export default TournamentPage;
