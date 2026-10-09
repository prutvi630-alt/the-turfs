import { useEffect, useMemo, useState } from 'react';
import { sports } from './data/homeData';
import { getAllTurfs, getDemoState, getSession } from './data/demoStore';
import { getAllTournaments } from './data/dashboardSelectors';
import GlobalHeader from './GlobalHeader';
import Footer from './Footer';
import { getTournamentBracket, getTournamentMatches } from './data/matchStore';
import { getPlayerInterestedTournamentIds, savePlayerTournamentInterest } from './data/tournamentInterest';
import {
  createTournamentRegistration,
  getTournamentRegistrationType,
  getTournamentSlotAvailability,
  isTournamentRegistrationOpen,
  PLAYER_TOURNAMENT_REGISTRATION_FEE,
} from './data/adminRegistrations';
import { formatTournamentFee, formatTournamentFeeAmount, getConfiguredTournamentFeeAmount } from './data/tournamentFees';
import scannerImage from './data/scanner.jpeg';
import { normalizePath } from './config/routes';
import { Toast } from './admin/AdminUI';

const filterOptions = {
  sports: ['All Sports', ...sports.map((sport) => sport.name)],
  statuses: ['All', 'Upcoming', 'Registration Open', 'Starting Soon'],
  dates: ['Any Date', 'This Week', 'This Month'],
};

const getVenue = (tournament) => getAllTurfs().find((turf) => turf.id === tournament.venueId) || null;
const getRegistrationFeeSummary = (tournament) => {
  const registrationType = getTournamentRegistrationType(tournament);
  const amount = registrationType === 'Individual'
    ? PLAYER_TOURNAMENT_REGISTRATION_FEE
    : getConfiguredTournamentFeeAmount(tournament.entryFee);
  return {
    label: registrationType === 'Individual' ? 'PLAYER REGISTRATION FEE' : 'TEAM REGISTRATION FEE',
    value: registrationType === 'Individual'
      ? `₹${formatTournamentFeeAmount(amount)} per player`
      : `${formatTournamentFee(tournament.entryFee)} per team`,
  };
};
const getStartTime = (tournament) => new Date(`${tournament.date}T00:00:00`);
const getLoggedInPlayer = () => {
  const session = getSession();
  if (!session || session.role !== 'player') return null;
  const state = getDemoState();
  return (state.players || []).find((player) => player.id === session.userId || String(player.email || '').toLowerCase() === String(session.email || '').toLowerCase()) || null;
};

const getPendingInterest = () => {
  try {
    if (!('sessionStorage' in globalThis)) return null;
    const raw = sessionStorage.getItem('cliftPendingInterest');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getPendingTeamRegistration = () => {
  try {
    return JSON.parse(sessionStorage.getItem('cliftPendingTournamentRegistration') || 'null');
  } catch {
    return null;
  }
};

const savePendingTeamRegistration = (tournament) => {
  try {
    sessionStorage.setItem('cliftPendingTournamentRegistration', JSON.stringify({
      tournamentId: tournament.id,
      returnPath: `${window.location.pathname}?registerTeam=1`,
      createdAt: Date.now(),
    }));
  } catch {
    return false;
  }
  return true;
};

const setPendingInterest = (tournamentId) => {
  try {
    if (!('sessionStorage' in globalThis) || !tournamentId) return false;
    const currentPath = `${window.location.pathname}${window.location.search || ''}` || '/tournaments';
    sessionStorage.setItem('cliftPendingInterest', JSON.stringify({ tournamentId: String(tournamentId), returnPath: currentPath }));
    return true;
  } catch {
    return false;
  }
};

const clearPendingInterest = () => {
  try {
    if ('sessionStorage' in globalThis) sessionStorage.removeItem('cliftPendingInterest');
  } catch {
    // no-op
  }
};

// A tournament is public when it is published/visible AND upcoming. Admin
// drafts and cancelled/completed events are excluded, matching prior behaviour.
const isUpcoming = (tournament) => {
  const status = String(tournament.status || '').toLowerCase();
  if (['draft', 'unpublished', 'cancelled', 'canceled', 'completed', 'live'].includes(status)) return false;
  return getStartTime(tournament) > new Date();
};
const route = (path) => `${import.meta.env.BASE_URL}${String(path).replace(/^\//, '')}`;

function TournamentPage() {
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState('All Sports');
  const [status, setStatus] = useState('All');
  const [dateRange, setDateRange] = useState('Any Date');
  const [selectedId, setSelectedId] = useState(null);

  // Read the merged list (static catalogue + admin-created) so tournaments the
  // admin publishes appear here without any duplicated hardcoded data.
  const tournaments = getAllTournaments();

  const path = normalizePath();
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
  const featuredFee = featuredTournament ? getRegistrationFeeSummary(featuredTournament) : null;

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

  const player = getLoggedInPlayer();
  const playerKey = player ? `${player.id}:${player.email || ''}` : 'guest';
  const [, setInterestVersion] = useState(0);
  const interestedTournaments = getPlayerInterestedTournamentIds(player);
  const [interestToast, setInterestToast] = useState(null);

  useEffect(() => {
    const pending = getPendingInterest();
    if (!player || !pending) return;

    const currentPath = `${window.location.pathname}${window.location.search || ''}`;
    if (pending.returnPath !== currentPath) return;

    const tournament = tournaments.find((item) => String(item.id) === String(pending.tournamentId));
    if (!tournament) {
      clearPendingInterest();
      setInterestToast({ tone: 'danger', title: 'Tournament unavailable', text: 'This tournament could not be found.' });
      return;
    }

    const result = savePlayerTournamentInterest(player.id, tournament.id);
    if (!result.ok) {
      setInterestToast({ tone: 'danger', title: 'Could not save tournament', text: result.error || 'Please try again.' });
      return;
    }

    clearPendingInterest();
    setInterestVersion((version) => version + 1);
    setInterestToast({
      tone: 'success',
      title: result.duplicate ? 'Already in your dashboard' : 'Tournament saved',
      text: 'Added to your interested tournaments on your player dashboard.',
      duration: 5500,
    });
  }, [playerKey]);

  const handleTournamentInterest = (tournament) => {
    const session = getSession();
    if (!session || session.role !== 'player') {
      if (session && session.role !== 'player') {
        setInterestToast({ tone: 'warn', title: 'Player account required', text: 'This feature is available for players.' });
        return;
      }
      if (!setPendingInterest(tournament.id)) {
        setInterestToast({ tone: 'danger', title: 'Could not save your selection', text: 'Please enable session storage and try again.' });
        return;
      }
      window.dispatchEvent(new Event('clift:open-login-modal'));
      return;
    }

    const result = savePlayerTournamentInterest(player?.id || session.userId, tournament.id);
    if (!result.ok) {
      setInterestToast({ tone: 'danger', title: 'Could not save tournament', text: result.error || 'Unable to save your interest right now.' });
      return;
    }

    setInterestVersion((version) => version + 1);
    setInterestToast({
      tone: result.duplicate ? 'warn' : 'success',
      title: result.duplicate ? 'Already in your dashboard' : 'Tournament saved',
      text: 'Added to your interested tournaments on your player dashboard.',
      duration: 5500,
    });
  };

  if (isDetail && selectedTournament) {
    return <TournamentDetail
      tournament={selectedTournament}
      navigate={navigate}
      isInterested={interestedTournaments.includes(String(selectedTournament.id))}
      onInterest={handleTournamentInterest}
      interestToast={interestToast}
      onDismissInterestToast={() => setInterestToast(null)}
    />;
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
              <div className="featured-content"><span className="section-kicker">THE NEXT BIG GAME</span><span className="sport-chip">{featuredTournament.sport}</span><h2>{featuredTournament.name}</h2><p className="featured-description">{featuredTournament.description}</p><div className="tournament-meta-grid"><Meta icon="◷" label="DATE" value={featuredTournament.dateLabel} /><Meta icon="⌖" label="VENUE" value={featuredTournament.venueName} /><Meta icon="♙" label={featuredTournament.registrationType === 'Individual' ? 'PLAYERS' : 'TEAMS'} value={`${featuredTournament.teamCapacity} ${featuredTournament.registrationType === 'Individual' ? 'Players' : 'Teams'}`} /><Meta icon="◇" label="FORMAT" value={featuredTournament.format} /><Meta icon="₹" label={featuredFee.label} value={featuredFee.value} /><Meta icon="✦" label="PRIZE POOL" value={featuredTournament.prizePool || '—'} /></div><div className="featured-footer"><StatusBadge status="UPCOMING" /><button type="button" className="link-button" onClick={() => openTournament(featuredTournament)}>View Tournament</button></div></div>
          </section>}

          <div className="section-heading tournament-list-heading tournament-reveal" data-tournament-reveal><div><span className="section-kicker">UPCOMING IN VADODARA</span><h2>FIND YOUR NEXT COMPETITION.</h2></div><span className="result-count">{filteredTournaments.length} TOURNAMENTS</span></div>
          {filteredTournaments.length ? <div className="tournament-discovery-grid">{filteredTournaments.map((tournament, index) => <TournamentCard key={tournament.id} tournament={tournament} index={index} onOpen={openTournament} isInterested={interestedTournaments.includes(String(tournament.id))} onInterested={() => handleTournamentInterest(tournament)} />)}</div> : <div className="tournament-empty"><span className="section-kicker">NO UPCOMING TOURNAMENTS</span><p>Check back soon for the next tournament.</p><button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button></div>}
        </section>

        <section className="tournament-page-cta section-spacing tournament-reveal" data-tournament-reveal><div className="container tournament-page-cta-inner"><span className="section-kicker">VADODARA SPORTS PLATFORM</span><h2>YOUR NEXT GAME<br /><em>STARTS HERE.</em></h2><p>Find your sport, discover your venue and join the competition.</p><button type="button" className="btn btn-primary" onClick={() => navigate('/signup')}>Join the Platform</button></div></section>
      </main>
      <Footer />
      <Toast toast={interestToast} onDismiss={() => setInterestToast(null)} />
    </div>
  );
}

function TournamentDetail({ tournament, navigate, isInterested, onInterest, interestToast, onDismissInterestToast }) {
  const venue = getVenue(tournament);
  const matchData = getTournamentMatches(tournament.id);
  const bracketRounds = getTournamentBracket(tournament, matchData);
  const tournamentResult = tournament.finalResult ? { winner: tournament.winner, finalResult: tournament.finalResult } : null;
  const player = getLoggedInPlayer();
  const playerTeams = player
    ? (getDemoState().teams || []).filter((team) => team.playerId === player.id && !team.ownerId)
    : [];
  const [joinOpen, setJoinOpen] = useState(false);
  const [form, setForm] = useState({ teamName: '', participantCount: 1 });
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [joinStep, setJoinStep] = useState('slots');
  const [slotAvailability, setSlotAvailability] = useState({ slots: [], availableCount: 0 });
  const [selectedSlotNumber, setSelectedSlotNumber] = useState(null);
  const [joinStatus, setJoinStatus] = useState('');

  useEffect(() => {
    if (!joinOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [joinOpen]);

  const existingRegistration = useMemo(() => {
    if (!player || getTournamentRegistrationType(tournament) !== 'Individual') return null;
    const state = getDemoState();
    return (state.registrations || []).find((registration) => (
      registration.tournamentId === tournament.id && registration.playerId === player.id
      && !registration.teamId && ['pending', 'approved'].includes(registration.status)
    )) || null;
  }, [player, tournament.id, tournament.registrationType]);
  const registrationFee = getRegistrationFeeSummary(tournament);

  const registrationType = getTournamentRegistrationType(tournament);
  const isPlayerRegistration = registrationType === 'Individual';
  const totalFee = isPlayerRegistration
    ? PLAYER_TOURNAMENT_REGISTRATION_FEE
    : getConfiguredTournamentFeeAmount(tournament.entryFee) || 0;
  const feeLabel = isPlayerRegistration ? 'Player Registration Fee' : 'Team Registration Fee';
  const formattedFee = `₹${formatTournamentFeeAmount(totalFee)}`;
  const eligibleTeams = playerTeams.filter((team) => String(team.sport || '').trim().toLowerCase() === String(tournament.sport || '').trim().toLowerCase());
  const selectedTeam = eligibleTeams.find((team) => team.id === selectedTeamId) || null;
  const selectedTeamAlreadyRegistered = Boolean(selectedTeam && (getDemoState().registrations || []).some((registration) => (
    registration.tournamentId === tournament.id
    && registration.teamId === selectedTeam.id
    && ['pending', 'approved'].includes(registration.status)
  )));

  const openJoinFlow = () => {
    if (getTournamentRegistrationType(tournament) === 'Team' && getConfiguredTournamentFeeAmount(tournament.entryFee) === null) {
      setJoinStatus('This team tournament does not have a valid registration fee configured yet.');
      return;
    }
    if (!player) {
      if (!savePendingTeamRegistration(tournament)) {
        setJoinStatus('Could not preserve this tournament. Please enable session storage and try again.');
        return;
      }
      window.dispatchEvent(new Event('clift:open-login-modal'));
      return;
    }
    if (!isTournamentRegistrationOpen(tournament)) {
      setJoinStatus('Registration is closed.');
      return;
    }
    const availability = getTournamentSlotAvailability(tournament.id);
    setSlotAvailability(availability);
    if (!availability.ok || availability.availableCount === 0) {
      setJoinStatus(availability.error || 'No slots available.');
      return;
    }
    const isTeamEvent = getTournamentRegistrationType(tournament) === 'Team';
    setSelectedSlotNumber(isTeamEvent ? availability.slots.find((slot) => slot.available)?.slotNumber || null : null);
    setSelectedTeamId('');
    setJoinStep(isTeamEvent ? 'team' : 'slots');
    setJoinOpen(true);
    setJoinStatus('');
    setForm({ teamName: `${player.firstName} ${player.surname}`, participantCount: 1 });
  };

  useEffect(() => {
    const pending = getPendingTeamRegistration();
    const shouldResumeFromUrl = new URLSearchParams(window.location.search).get('registerTeam') === '1';
    if (!player || (!shouldResumeFromUrl && pending?.tournamentId !== tournament.id)) return;
    if (pending?.tournamentId === tournament.id) {
      try {
        sessionStorage.removeItem('cliftPendingTournamentRegistration');
      } catch {
        setJoinStatus('Tournament selected. Continue registration to resume.');
      }
    }
    openJoinFlow();
  }, [Boolean(player), tournament.id]);

  const refreshSelectedSlot = () => {
    if (!isTournamentRegistrationOpen(tournament)) {
      setJoinStatus('Registration is closed.');
      return false;
    }
    const latestAvailability = getTournamentSlotAvailability(tournament.id);
    setSlotAvailability(latestAvailability);
    if (!latestAvailability.slots.some((slot) => slot.slotNumber === selectedSlotNumber && slot.available)) {
      setSelectedSlotNumber(null);
      setJoinStep(getTournamentRegistrationType(tournament) === 'Team' ? 'team' : 'slots');
      setJoinStatus(latestAvailability.ok && latestAvailability.availableCount === 0
        ? 'No slots available.'
        : 'That slot is no longer available. Please select another slot.');
      return false;
    }
    return true;
  };

  const continueToDetails = () => {
    if (!refreshSelectedSlot()) return;
    setJoinStatus('');
    setJoinStep('details');
  };

  const continueToPayment = () => {
    if (getTournamentRegistrationType(tournament) === 'Team') {
      if (!selectedTeam || !playerTeams.some((team) => team.id === selectedTeam.id)) {
        setJoinStatus('Select a team belonging to your player account.');
        return;
      }
      if (String(selectedTeam.sport || '').trim().toLowerCase() !== String(tournament.sport || '').trim().toLowerCase()) {
        setJoinStatus('The team game must match the tournament game.');
        return;
      }
      if (selectedTeamAlreadyRegistered) {
        setJoinStatus('This team is already registered for this tournament.');
        return;
      }
      if (!isTournamentRegistrationOpen(tournament)) {
        setJoinStatus('Registration is closed.');
        return;
      }
      if (!refreshSelectedSlot()) return;
      setJoinStatus('');
      setJoinStep('payment');
      return;
    }
    if (!form.teamName.trim()) {
      setJoinStatus(isPlayerRegistration ? 'Enter the player name to continue.' : 'Enter a team name to continue.');
      return;
    }
    if (!isPlayerRegistration && (!Number.isInteger(Number(form.participantCount)) || Number(form.participantCount) < 1)) {
      setJoinStatus('Enter a valid number of players for this team.');
      return;
    }
    if (!refreshSelectedSlot()) return;
    setJoinStatus('');
    setJoinStep('payment');
  };

  const submitRegistration = async () => {
    if (!player) {
      if (!savePendingTeamRegistration(tournament)) {
        setJoinStatus('Could not preserve this tournament. Please enable session storage and try again.');
        return;
      }
      window.dispatchEvent(new Event('clift:open-login-modal'));
      return;
    }

    if (!isTournamentRegistrationOpen(tournament)) {
      setJoinStatus('Registration is closed.');
      setJoinStep(getTournamentRegistrationType(tournament) === 'Team' ? 'team' : 'slots');
      return;
    }
    if (!refreshSelectedSlot()) return;
    if (getTournamentRegistrationType(tournament) === 'Team' && (!selectedTeam || selectedTeamAlreadyRegistered)) {
      setJoinStatus(selectedTeamAlreadyRegistered
        ? 'This team is already registered for this tournament.'
        : 'Select an eligible team before continuing.');
      setJoinStep('team');
      return;
    }

    let result;
    try {
      result = await createTournamentRegistration({
        tournamentId: tournament.id,
        playerId: player.id,
        playerName: isPlayerRegistration ? form.teamName.trim() : `${player.firstName} ${player.surname}`,
        teamName: form.teamName.trim(),
        captain: `${player.firstName} ${player.surname}`,
        email: player.email,
        mobile: player.mobile,
        teamId: selectedTeam?.id,
        participantCount: isPlayerRegistration ? 1 : Math.max(Number(form.participantCount) || 1, 1),
        slotNumber: selectedSlotNumber,
      });
    } catch (error) {
      setJoinStatus(error?.message || 'Registration could not be completed. Please try again.');
      return;
    }

    if (!result.ok) {
      setJoinStatus(result.error);
      if (/slot/i.test(result.error)) {
        const latest = getTournamentSlotAvailability(tournament.id);
        setSlotAvailability(latest);
        setSelectedSlotNumber(null);
        setJoinStep(getTournamentRegistrationType(tournament) === 'Team' ? 'team' : 'slots');
      }
      return;
    }

    setJoinOpen(false);
    setJoinStatus(getTournamentRegistrationType(tournament) === 'Team'
      ? 'Team registration submitted. Payment is pending verification.'
      : 'Registration created and sent for payment verification.');
    window.location.reload();
  };

  return (
    <div className="page-shell tournament-page tournament-detail-page">
      <GlobalHeader />
      <main>
        <section className="detail-hero"><div className="detail-hero-backdrop" style={{ backgroundImage: `linear-gradient(90deg, rgba(4, 9, 8, 0.94), rgba(4, 9, 8, 0.58)), url('${tournament.image}')` }} /><div className="container detail-hero-content tournament-reveal" data-tournament-reveal><button type="button" className="back-link" onClick={() => navigate('/tournaments')}>← Back to Tournaments</button><span className="eyebrow">{tournament.sport}</span><h1>{tournament.name}</h1><p>{tournament.dateLabel} <span>/</span> {tournament.venueName}</p><StatusBadge status={tournament.status} /></div></section>
        <section className="detail-info-strip"><div className="container detail-info-grid"><Meta icon="◷" label="DATE" value={tournament.dateLabel} /><Meta icon="⌖" label="VENUE" value={venue?.name || tournament.venueName} /><Meta icon="✦" label="SPORT" value={tournament.sport} /><Meta icon="◇" label="FORMAT" value={tournament.format} /><Meta icon="♙" label={tournament.registrationType === 'Individual' ? 'PLAYERS' : 'TEAMS'} value={`${tournament.teamCapacity} ${tournament.registrationType === 'Individual' ? 'Players' : 'Teams'}`} /><Meta icon="₹" label={registrationFee.label} value={registrationFee.value} /><Meta icon="◆" label="PRIZE" value={tournament.prizePool || '—'} /></div></section>
        <section className="detail-content container section-spacing"><div className="detail-main-column"><section className="detail-block tournament-reveal" data-tournament-reveal><span className="section-kicker">TOURNAMENT OVERVIEW</span><h2>BUILT FOR THE NEXT<br />GREAT MATCH.</h2><p>{tournament.description}</p><div className="overview-facts"><Meta icon="◇" label="TOURNAMENT FORMAT" value={tournament.format} /><Meta icon="♙" label="TEAM CAPACITY" value={`${tournament.teamCapacity} Teams`} /><Meta icon="⚑" label="MATCH TYPE" value={tournament.matchType} /><Meta icon="✓" label="REGISTRATION" value={tournament.status} /></div></section><section className="detail-block tournament-reveal" data-tournament-reveal><span className="section-kicker">PARTICIPANTS</span><h2>{tournament.registrationType === 'Individual' ? 'PLAYERS IN THE TOURNAMENT.' : 'TEAMS IN THE TOURNAMENT.'}</h2><div className="teams-grid">{tournament.teams.map((team) => <article className="team-card" key={team.name}><span className="team-mark">{team.name.slice(0, 2).toUpperCase()}</span><div><h3>{team.name}</h3><p>Captain <strong>{team.captain}</strong></p><span className="team-status">{team.status}</span></div></article>)}</div></section></div><aside className="detail-side-column"><div className="join-panel"><span className="section-kicker">READY TO COMPETE?</span><h3>Take your place in the next game.</h3><p>Join the platform to discover sporting opportunities in Vadodara.</p>{existingRegistration ? <button type="button" className="btn btn-secondary" disabled>{existingRegistration.status === 'approved' ? 'Registered' : 'Registration Pending'}</button> : <button type="button" className="btn btn-primary" onClick={openJoinFlow}>Join Tournament</button>}<div className="tournament-interest-inline"><button type="button" className={`btn btn-secondary tournament-interest-btn ${isInterested ? 'is-active' : ''}`} onClick={() => onInterest(tournament)}>{isInterested ? '✓ Interested' : "I'm Interested"}</button><small>Click if you are interested</small></div>{joinStatus && <p className="admin-detail-note" style={{ marginTop: '12px' }}>{joinStatus}</p>}</div><div className="venue-panel"><span className="section-kicker">PLAYING AT</span><h3>{venue?.name || tournament.venueName}</h3><p>{venue?.area || tournament.area}, Vadodara</p><span>{venue?.openingHours || 'Tournament venue'}</span></div></aside></section>
        <section className="format-section section-spacing"><div className="container"><div className="section-heading centered-heading"><span className="section-kicker">TOURNAMENT FORMAT</span><h2>HOW THE TOURNAMENT WORKS.</h2><p>A simple demo structure that makes the route from first round to final easy to follow.</p></div><div className="format-flow">{tournament.bracket.rounds.map((round, index) => <div className="format-step" key={round.name}><span>0{index + 1}</span><strong>{round.name}</strong>{index < tournament.bracket.rounds.length - 1 && <i>↓</i>}</div>)}</div></div></section>
        <section className="bracket-section section-spacing container"><div className="section-heading"><span className="section-kicker">VISUAL BRACKET</span><h2>FOLLOW THE COMPETITION.</h2>{tournamentResult?.winner && <p>Champion: <strong>{tournamentResult.winner}</strong></p>}</div><div className="bracket-scroll"><div className="bracket-board">{bracketRounds.map((round) => <div className="bracket-round" key={round.name}><h3>{round.name}</h3>{round.games.map((game, index) => <div className="bracket-game" key={`${round.name}-${index}`}><span>{game.teams[0] || 'TBD'}{game.result?.teamAScore ? ` · ${game.result.teamAScore}` : ''}</span><span>{game.teams[1] || 'TBD'}{game.result?.teamBScore ? ` · ${game.result.teamBScore}` : ''}</span></div>)}</div>)}<div className="bracket-round champion-round"><h3>CHAMPION</h3><div className="bracket-game"><span>{tournamentResult?.winner || 'Final Winner'}</span></div></div></div></div></section>
        <section className="detail-bottom-cta section-spacing"><div className="container"><span className="section-kicker">MAKE YOUR MARK</span><h2>READY TO COMPETE?</h2><p>Join the platform and discover upcoming sporting opportunities in Vadodara.</p><div className="cta-actions"><button type="button" className="btn btn-primary" onClick={openJoinFlow}>{existingRegistration ? (existingRegistration.status === 'approved' ? 'Registered' : 'Registration Pending') : 'Join Tournament'}</button><button type="button" className="btn btn-secondary" onClick={() => navigate('/tournaments')}>Explore More Tournaments</button></div></div></section>
      </main>
      {joinOpen && (
        <div className="review-modal-backdrop">
          <section className="review-modal payment-modal tournament-registration-modal" role="dialog" aria-modal="true" aria-labelledby="tournament-registration-title">
            <button type="button" className="modal-close" onClick={() => setJoinOpen(false)}>×</button>
            <span className="section-kicker">{joinStep === 'team' ? 'STEP 1 OF 2 · CONFIRM TEAM' : joinStep === 'slots' ? 'STEP 1 OF 3 · SELECT A SLOT' : joinStep === 'details' ? 'STEP 2 OF 3 · REGISTRATION DETAILS' : `STEP ${isPlayerRegistration ? '3 OF 3' : '2 OF 2'} · PAYMENT`}</span>
            <h2 id="tournament-registration-title">{tournament.name}</h2>
            {joinStep === 'team' && (
              <div className="player-team-registration-step">
                <div className="registration-flow-summary">
                  <strong>Tournament:</strong> {tournament.name}<br />
                  <strong>Game:</strong> {tournament.sport}<br />
                  <strong>Registration fee:</strong> {formattedFee}<br />
                  <strong>Deadline:</strong> {tournament.registrationEnd || tournament.date || tournament.startDate || 'Not listed'}<br />
                  <strong>Available slots:</strong> {slotAvailability.availableCount} of {slotAvailability.capacity}
                </div>
                {playerTeams.length === 0 ? (
                  <div className="registration-slot-empty">
                    <p>You need to create a team before registering for a tournament.</p>
                    <button type="button" className="btn btn-secondary" onClick={() => {
                      if (savePendingTeamRegistration(tournament)) navigate('/player/dashboard#player-teams');
                      else setJoinStatus('Could not preserve this tournament. Please enable session storage and try again.');
                    }}>Create Team</button>
                  </div>
                ) : eligibleTeams.length === 0 ? (
                  <div className="registration-slot-empty">
                    <p>No eligible team found for this tournament. Please create a team for {tournament.sport}.</p>
                    <button type="button" className="btn btn-secondary" onClick={() => {
                      if (savePendingTeamRegistration(tournament)) navigate('/player/dashboard#player-teams');
                      else setJoinStatus('Could not preserve this tournament. Please enable session storage and try again.');
                    }}>Create Team</button>
                  </div>
                ) : <>
                  <label className="form-field">
                    <span>Select eligible team</span>
                    <select value={selectedTeamId} onChange={(event) => { setSelectedTeamId(event.target.value); setJoinStatus(''); }}>
                      <option value="">Select your {tournament.sport} team</option>
                      {eligibleTeams.map((team) => {
                        const registered = (getDemoState().registrations || []).some((registration) => (
                          registration.tournamentId === tournament.id && registration.teamId === team.id
                          && ['pending', 'approved'].includes(registration.status)
                        ));
                        return <option key={team.id} value={team.id} disabled={registered}>{team.name}{registered ? ' (already registered)' : ''}</option>;
                      })}
                    </select>
                  </label>
                  {selectedTeam && <article className="player-team-registration-preview">
                    {selectedTeam.logo ? <img src={selectedTeam.logo} alt={`${selectedTeam.name} logo`} /> : <span className="owner-team-logo-placeholder">TEAM</span>}
                    <div><strong>{selectedTeam.name}</strong><span>{selectedTeam.sport} · {selectedTeam.members?.length || selectedTeam.memberIds?.length || 0} players</span><span>Captain: {selectedTeam.captainDetails?.name || selectedTeam.captain || 'Not assigned'}</span></div>
                  </article>}
                  <label className="form-field">
                    <span>Available slot</span>
                    <select value={selectedSlotNumber || ''} onChange={(event) => { setSelectedSlotNumber(Number(event.target.value) || null); setJoinStatus(''); }}>
                      <option value="">Select available slot</option>
                      {slotAvailability.slots.filter((slot) => slot.available).map((slot) => <option key={slot.slotNumber} value={slot.slotNumber}>{slot.label}</option>)}
                    </select>
                  </label>
                </>}
              </div>
            )}
            {joinStep === 'slots' && (
              <div className="registration-slot-step">
                <p className="registration-flow-summary"><strong>Tournament:</strong> {tournament.name}<br /><strong>Registration type:</strong> {isPlayerRegistration ? 'Individual player' : 'Team'}</p>
                <h3>Available slots</h3>
                {slotAvailability.availableCount > 0 ? (
                  <div className="registration-slot-grid">
                    {slotAvailability.slots.map((slot) => (
                      <button
                        key={slot.slotNumber}
                        type="button"
                        className={`registration-slot-option ${slot.available ? 'is-available' : 'is-occupied'} ${selectedSlotNumber === slot.slotNumber ? 'is-selected' : ''}`}
                        disabled={!slot.available}
                        aria-pressed={selectedSlotNumber === slot.slotNumber}
                        onClick={() => { setSelectedSlotNumber(slot.slotNumber); setJoinStatus(''); }}
                      >
                        <strong>{slot.label}</strong>
                        <span>{slot.available ? 'Available' : 'Occupied'}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="registration-slot-empty">No slots are currently available for this tournament.</div>
                )}
                <p className="registration-slot-count">{slotAvailability.availableCount || 0} of {slotAvailability.capacity || 0} slots available</p>
              </div>
            )}

            {joinStep === 'details' && (
              <div className="registration-details-step">
                <div className="registration-flow-summary">
                  <strong>Tournament:</strong> {tournament.name}<br />
                  <strong>Selected slot:</strong> {slotAvailability.slots.find((slot) => slot.slotNumber === selectedSlotNumber)?.label}<br />
                  <strong>Registration type:</strong> {isPlayerRegistration ? 'Individual player' : 'Team'}
                </div>
                <label className="form-field">
                  <span>{isPlayerRegistration ? 'Player name' : 'Team name'}</span>
                  <input value={form.teamName} onChange={(event) => setForm((current) => ({ ...current, teamName: event.target.value }))} placeholder={isPlayerRegistration ? 'Player name' : 'Enter team name'} required />
                </label>
                {!isPlayerRegistration && (
                  <label className="form-field">
                    <span>Number of players</span>
                    <input type="number" min="1" value={form.participantCount} onChange={(event) => setForm((current) => ({ ...current, participantCount: event.target.value }))} required />
                  </label>
                )}
                <div className="registration-fee-summary">
                  <span>{feeLabel}</span>
                  <strong>{formattedFee}</strong>
                </div>
              </div>
            )}

            {joinStep === 'payment' && (
              <div className="player-payment-modal-body">
                <div className="qr-code player-payment-qr" aria-label="Demo payment QR code" style={{ backgroundImage: `url(${scannerImage})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                <div className="player-payment-amount">
                  <strong>{feeLabel}: {formattedFee}</strong>
                  <div className="registration-flow-summary">
                    <strong>Tournament:</strong> {tournament.name}<br />
                    <strong>Selected slot:</strong> {slotAvailability.slots.find((slot) => slot.slotNumber === selectedSlotNumber)?.label}<br />
                    <strong>Registration type:</strong> {isPlayerRegistration ? 'Individual player' : 'Team'}
                  </div>
                  <p>Demo QR only. No payment provider is connected. Submitting requests registration, which stays pending until payment is verified by an existing trusted provider.</p>
                  {!isPlayerRegistration && selectedTeam && <div className="registration-flow-summary"><strong>Team:</strong> {selectedTeam.name}<br /><strong>Captain:</strong> {selectedTeam.captainDetails?.name || selectedTeam.captain || 'Not assigned'}<br /><strong>Players:</strong> {selectedTeam.members?.length || selectedTeam.memberIds?.length || 0}</div>}
                </div>
              </div>
            )}

            {joinStatus && <p className="admin-detail-note danger" style={{ marginBottom: 12 }}>{joinStatus}</p>}
            <div className="review-actions payment-actions">
              {(joinStep === 'slots' || joinStep === 'team') && <button type="button" className="btn btn-secondary" onClick={() => setJoinOpen(false)}>Cancel</button>}
              {joinStep === 'team' && <button type="button" className="btn btn-primary" disabled={!selectedTeam || !selectedSlotNumber || selectedTeamAlreadyRegistered} onClick={continueToPayment}>Continue to payment</button>}
              {joinStep === 'details' && <button type="button" className="btn btn-secondary" onClick={() => { setJoinStatus(''); setJoinStep('slots'); }}>Back to slots</button>}
              {joinStep === 'payment' && <button type="button" className="btn btn-secondary" onClick={() => { setJoinStatus(''); setJoinStep(isPlayerRegistration ? 'details' : 'team'); }}>Back</button>}
              {joinStep === 'slots' && <button type="button" className="btn btn-primary" disabled={!selectedSlotNumber || slotAvailability.availableCount === 0} onClick={continueToDetails}>Continue to details</button>}
              {joinStep === 'details' && <button type="button" className="btn btn-primary" onClick={continueToPayment}>Continue to payment</button>}
              {joinStep === 'payment' && <button type="button" className="btn btn-primary" onClick={submitRegistration}>Submit Registration</button>}
            </div>
          </section>
        </div>
      )}
      <Footer />
      <Toast toast={interestToast} onDismiss={onDismissInterestToast} />
    </div>
  );
}

function TournamentCard({ tournament, index, onOpen, isInterested, onInterested }) {
  const registrationType = getTournamentRegistrationType(tournament);
  const feeValue = registrationType === 'Individual'
    ? `₹${formatTournamentFeeAmount(PLAYER_TOURNAMENT_REGISTRATION_FEE)} per player`
    : `${formatTournamentFee(tournament.entryFee)} per team`;
  return <article className="tournament-discovery-card tournament-reveal" data-tournament-reveal style={{ '--card-delay': `${index * 80}ms` }}><div className="discovery-card-image"><img src={tournament.image} alt={`${tournament.sport} tournament`} loading="lazy" /><span className="sport-chip">{tournament.sport}</span></div><div className="discovery-card-body"><div className="discovery-card-title-row"><h3>{tournament.name}</h3><div className="tournament-card-interest"><button type="button" className={`btn btn-secondary tournament-interest-btn tournament-card-interest-button ${isInterested ? 'is-active' : ''}`} onClick={onInterested}>{isInterested ? '✓ Interested' : "I'm Interested"}</button><small>Interested? Click here.</small></div></div><div className="card-meta"><span>◷ {tournament.dateLabel}</span><span>⌖ {tournament.area}</span><span>◇ {tournament.format}</span><span>{registrationType === 'Individual' ? 'Player fee' : 'Team fee'}: {feeValue}</span></div><div className="discovery-card-footer"><StatusBadge status={tournament.status} /><button type="button" className="link-button" onClick={() => onOpen(tournament)}>View Tournament</button></div></div></article>;
}

function Meta({ icon, label, value }) {
  const tournamentId = normalizePath().split('/').filter(Boolean).at(-1);
  const currentTournament = label === 'TEAM CAPACITY'
    ? getAllTournaments().find((item) => item.id === tournamentId)
    : null;
  const isIndividualCapacity = currentTournament?.registrationType === 'Individual';
  const displayLabel = isIndividualCapacity ? 'PLAYER CAPACITY' : label;
  const displayValue = isIndividualCapacity ? `${currentTournament.teamCapacity} Players` : value;
  return <div className="tournament-meta"><span className="meta-icon" aria-hidden="true">{icon}</span><div><span>{displayLabel}</span><strong>{displayValue}</strong></div></div>;
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>;
}

export default TournamentPage;
