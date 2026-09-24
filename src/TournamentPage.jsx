import { useEffect, useMemo, useState } from 'react';
import { sports } from './data/homeData';
import { getAllTurfs } from './data/demoStore';
import { getAllTournaments } from './data/dashboardSelectors';
import GlobalHeader from './GlobalHeader';
import Footer from './Footer';
import { getTournamentBracket, getTournamentMatches } from './data/matchStore';

const filterOptions = {
  sports: ['All Sports', ...sports.map((sport) => sport.name)],
  statuses: ['All', 'Upcoming', 'Registration Open', 'Starting Soon'],
  dates: ['Any Date', 'This Week', 'This Month'],
};

const getVenue = (tournament) => getAllTurfs().find((turf) => turf.id === tournament.venueId) || null;
const getStartTime = (tournament) => new Date(`${tournament.date}T00:00:00`);
// A tournament is public when it is published/visible AND upcoming. Admin
// drafts and cancelled/completed events are excluded, matching prior behaviour.
const isUpcoming = (tournament) => {
  const status = String(tournament.status || '').toLowerCase();
  if (['draft', 'unpublished', 'cancelled', 'canceled', 'completed', 'live'].includes(status)) return false;
  return getStartTime(tournament) > new Date();
};
const route = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

function TournamentPage() {
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState('All Sports');
  const [status, setStatus] = useState('All');
  const [dateRange, setDateRange] = useState('Any Date');
  const [selectedId, setSelectedId] = useState(null);

  // Read the merged list (static catalogue + admin-created) so tournaments the
  // admin publishes appear here without any duplicated hardcoded data.
  const tournaments = getAllTournaments();

  const path = window.location.pathname.replace(/^\/The-Turf-/, '') || '/';
  const isDetail = path.startsWith('/tournaments/');
  const routeId = path.split('/').filter(Boolean)[1];
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
    window.location.href = route(href);
  };

  const filteredTournaments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tournaments.filter((tournament) => {
      if (!isUpcoming(tournament)) return false;
      const matchesQuery = !normalized || [tournament.name, tournament.sport, tournament.venueName, tournament.area].some((value) => String(value || '').toLowerCase().includes(normalized));
      const matchesSport = sport === 'All Sports' || tournament.sport === sport;
      const matchesStatus = status === 'All' || tournament.status === status;
      const daysAway = Math.ceil((getStartTime(tournament) - new Date()) / 86400000);
      const matchesDate = dateRange === 'Any Date' || (dateRange === 'This Week' && daysAway <= 7) || (dateRange === 'This Month' && daysAway <= 31);
      return matchesQuery && matchesSport && matchesStatus && matchesDate;
    }).sort((first, second) => getStartTime(first) - getStartTime(second));
  }, [dateRange, query, sport, status]);

  const featuredTournament = filteredTournaments[0] || null;

  const clearFilters = () => {
    setQuery('');
    setSport('All Sports');
    setStatus('All');
    setDateRange('Any Date');
  };

  const openTournament = (tournament) => {
    setSelectedId(tournament.id);
    window.location.href = route(`/tournaments/${tournament.id}`);
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
            <h1>UPCOMING<br /><em>TOURNAMENTS.</em></h1>
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

          {featuredTournament && <section className="featured-tournament tournament-reveal" data-tournament-reveal>
            <div className="featured-image"><img src={featuredTournament.image} alt={`${featuredTournament.sport} tournament action`} /></div>
            <div className="featured-content"><span className="section-kicker">THE NEXT BIG GAME</span><span className="sport-chip">{featuredTournament.sport}</span><h2>{featuredTournament.name}</h2><p className="featured-description">{featuredTournament.description}</p><div className="tournament-meta-grid"><Meta icon="◷" label="DATE" value={featuredTournament.dateLabel} /><Meta icon="⌖" label="VENUE" value={featuredTournament.venueName} /><Meta icon="♙" label="TEAMS" value={`${featuredTournament.teamCapacity} Teams`} /><Meta icon="◇" label="FORMAT" value={featuredTournament.format} /><Meta icon="✦" label="PRIZE POOL" value={featuredTournament.prizePool} /></div><div className="featured-footer"><StatusBadge status="UPCOMING" /><button type="button" className="link-button" onClick={() => openTournament(featuredTournament)}>View Tournament</button></div></div>
          </section>}

          <div className="section-heading tournament-list-heading tournament-reveal" data-tournament-reveal><div><span className="section-kicker">UPCOMING IN VADODARA</span><h2>FIND YOUR NEXT COMPETITION.</h2></div><span className="result-count">{filteredTournaments.length} TOURNAMENTS</span></div>
          {filteredTournaments.length ? <div className="tournament-discovery-grid">{filteredTournaments.map((tournament, index) => <TournamentCard key={tournament.id} tournament={tournament} index={index} onOpen={openTournament} />)}</div> : <div className="tournament-empty"><span className="section-kicker">NO UPCOMING TOURNAMENTS</span><p>Check back soon for the next tournament.</p><button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button></div>}
        </section>

        <section className="tournament-page-cta section-spacing tournament-reveal" data-tournament-reveal><div className="container tournament-page-cta-inner"><span className="section-kicker">VADODARA SPORTS PLATFORM</span><h2>YOUR NEXT GAME<br /><em>STARTS HERE.</em></h2><p>Find your sport, discover your venue and join the competition.</p><button type="button" className="btn btn-primary" onClick={() => navigate('/signup')}>Join the Platform</button></div></section>
      </main>
      <Footer />
    </div>
  );
}

function TournamentDetail({ tournament, navigate }) {
  const venue = getVenue(tournament);
  const matchData = getTournamentMatches(tournament.id);
  const bracketRounds = getTournamentBracket(tournament, matchData);
  const tournamentResult = tournament.finalResult ? { winner: tournament.winner, finalResult: tournament.finalResult } : null;
  return (
    <div className="page-shell tournament-page tournament-detail-page">
      <GlobalHeader />
      <main>
        <section className="detail-hero"><div className="detail-hero-backdrop" style={{ backgroundImage: `linear-gradient(90deg, rgba(4, 9, 8, 0.94), rgba(4, 9, 8, 0.58)), url('${tournament.image}')` }} /><div className="container detail-hero-content tournament-reveal" data-tournament-reveal><button type="button" className="back-link" onClick={() => navigate('/tournaments')}>← Back to Tournaments</button><span className="eyebrow">{tournament.sport}</span><h1>{tournament.name}</h1><p>{tournament.dateLabel} <span>/</span> {tournament.venueName}</p><StatusBadge status={tournament.status} /></div></section>
        <section className="detail-info-strip"><div className="container detail-info-grid"><Meta icon="◷" label="DATE" value={tournament.dateLabel} /><Meta icon="⌖" label="VENUE" value={venue?.name || tournament.venueName} /><Meta icon="✦" label="SPORT" value={tournament.sport} /><Meta icon="◇" label="FORMAT" value={tournament.format} /><Meta icon="♙" label="TEAMS" value={`${tournament.teamCapacity}`} /><Meta icon="◆" label="PRIZE" value={tournament.prizePool} /></div></section>
        <section className="detail-content container section-spacing"><div className="detail-main-column"><section className="detail-block tournament-reveal" data-tournament-reveal><span className="section-kicker">TOURNAMENT OVERVIEW</span><h2>BUILT FOR THE NEXT<br />GREAT MATCH.</h2><p>{tournament.description}</p><div className="overview-facts"><Meta icon="◇" label="TOURNAMENT FORMAT" value={tournament.format} /><Meta icon="♙" label="TEAM CAPACITY" value={`${tournament.teamCapacity} Teams`} /><Meta icon="⚑" label="MATCH TYPE" value={tournament.matchType} /><Meta icon="✓" label="REGISTRATION" value={tournament.status} /></div></section><section className="detail-block tournament-reveal" data-tournament-reveal><span className="section-kicker">PARTICIPANTS</span><h2>TEAMS IN THE TOURNAMENT.</h2><div className="teams-grid">{tournament.teams.map((team) => <article className="team-card" key={team.name}><span className="team-mark">{team.name.slice(0, 2).toUpperCase()}</span><div><h3>{team.name}</h3><p>Captain <strong>{team.captain}</strong></p><span className="team-status">{team.status}</span></div></article>)}</div></section></div><aside className="detail-side-column"><div className="join-panel"><span className="section-kicker">READY TO COMPETE?</span><h3>Take your place in the next game.</h3><p>Join the platform to discover sporting opportunities in Vadodara.</p><button type="button" className="btn btn-primary" onClick={() => navigate('/signup')}>Join Tournament</button></div><div className="venue-panel"><span className="section-kicker">PLAYING AT</span><h3>{venue?.name || tournament.venueName}</h3><p>{venue?.area || tournament.area}, Vadodara</p><span>{venue?.openingHours || 'Tournament venue'}</span></div></aside></section>
        <section className="format-section section-spacing"><div className="container"><div className="section-heading centered-heading"><span className="section-kicker">TOURNAMENT FORMAT</span><h2>HOW THE TOURNAMENT WORKS.</h2><p>A simple demo structure that makes the route from first round to final easy to follow.</p></div><div className="format-flow">{tournament.bracket.rounds.map((round, index) => <div className="format-step" key={round.name}><span>0{index + 1}</span><strong>{round.name}</strong>{index < tournament.bracket.rounds.length - 1 && <i>↓</i>}</div>)}</div></div></section>
        <section className="bracket-section section-spacing container"><div className="section-heading"><span className="section-kicker">VISUAL BRACKET</span><h2>FOLLOW THE COMPETITION.</h2>{tournamentResult?.winner && <p>Champion: <strong>{tournamentResult.winner}</strong></p>}</div><div className="bracket-scroll"><div className="bracket-board">{bracketRounds.map((round) => <div className="bracket-round" key={round.name}><h3>{round.name}</h3>{round.games.map((game, index) => <div className="bracket-game" key={`${round.name}-${index}`}><span>{game.teams[0] || 'TBD'}{game.result?.teamAScore ? ` · ${game.result.teamAScore}` : ''}</span><span>{game.teams[1] || 'TBD'}{game.result?.teamBScore ? ` · ${game.result.teamBScore}` : ''}</span></div>)}</div>)}<div className="bracket-round champion-round"><h3>CHAMPION</h3><div className="bracket-game"><span>{tournamentResult?.winner || 'Final Winner'}</span></div></div></div></div></section>
        <section className="detail-bottom-cta section-spacing"><div className="container"><span className="section-kicker">MAKE YOUR MARK</span><h2>READY TO COMPETE?</h2><p>Join the platform and discover upcoming sporting opportunities in Vadodara.</p><div className="cta-actions"><button type="button" className="btn btn-primary" onClick={() => navigate('/signup')}>Join Tournament</button><button type="button" className="btn btn-secondary" onClick={() => navigate('/tournaments')}>Explore More Tournaments</button></div></div></section>
      </main>
      <Footer />
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

export default TournamentPage;
