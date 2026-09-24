import { getAllTurfs, getBookings, getDemoState } from './demoStore';
import { accountStatus } from './adminAccounts';
import { getAllTournaments } from './dashboardSelectors';

// ---------------------------------------------------------------------------
// People selectors (players & turf owners)
// ---------------------------------------------------------------------------
// Derives the enriched rows the admin tables and detail views render. All data
// comes from the shared demo layer; nothing is hardcoded. A future backend
// would return these same shapes from an API.

const fullName = (player = {}) =>
  `${player.firstName || ''} ${player.surname || ''}`.trim() || 'Player';

const initials = (value = '') =>
  value.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P';

const formatDate = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Which teams (from state.teams) a player belongs to, across every owner.
const teamsForPlayer = (state, playerId) =>
  (state.teams || []).filter((team) => (team.memberIds || []).includes(playerId));

// Turf-join requests belonging to a player (their tournament/registration trail).
const requestsForPlayer = (state, playerId) =>
  (state.requests || []).filter((request) => request.playerId === playerId);

// ---- Player rows ----------------------------------------------------------
export const getPlayerRows = () => {
  const state = getDemoState();
  const allTurfs = getAllTurfs();
  const bookings = getBookings();

  return (state.players || []).map((player) => {
    const teams = teamsForPlayer(state, player.id);
    const requests = requestsForPlayer(state, player.id);
    const turf = allTurfs.find((item) => item.id === player.selectedTurfId);
    const playerBookings = bookings.filter((booking) => booking.userId === player.id || booking.email === player.email);

    return {
      id: player.id,
      name: fullName(player),
      initials: initials(fullName(player)),
      firstName: player.firstName || '',
      surname: player.surname || '',
      email: player.email || '',
      mobile: player.mobile || '',
      sport: player.sportId || '—',
      team: teams[0]?.name || '—',
      teamCount: teams.length,
      status: accountStatus(player),
      suspensionReason: player.suspensionReason || '',
      joinedAt: player.createdAt || '',
      joinedLabel: formatDate(player.createdAt),
      profileImage: player.profileImage || '',
      age: player.age || '',
      dob: player.dob || '',
      address: {
        house: player.house || '',
        street: player.street || '',
        landmark: player.landmark || '',
        city: player.city || 'Vadodara',
        state: player.state || 'Gujarat',
        pincode: player.pincode || '',
      },
      locationLabel: [player.street, player.city].filter(Boolean).join(', ') || 'Vadodara',
      turfId: player.selectedTurfId || '',
      turfName: turf?.name || '—',
      bookingCount: playerBookings.length,
      // raw collections for the detail view
      _player: player,
      _teams: teams,
      _requests: requests,
    };
  });
};

// ---- Owner rows -----------------------------------------------------------
export const getOwnerRows = () => {
  const state = getDemoState();
  const allTurfs = getAllTurfs();

  return (state.owners || []).map((owner) => {
    const turfs = allTurfs.filter((turf) => (owner.turfIds || []).includes(turf.id) || turf.ownerId === owner.id);
    const teams = (state.teams || []).filter((team) => team.ownerId === owner.id);
    const requests = (state.requests || []).filter((request) => request.ownerId === owner.id);

    return {
      id: owner.id,
      name: owner.name || 'Turf Owner',
      initials: initials(owner.name || 'TO'),
      email: owner.email || '',
      mobile: owner.mobile || owner.ownerMobile || '',
      turfCount: turfs.length,
      turfNames: turfs.map((turf) => turf.name),
      areas: [...new Set(turfs.map((turf) => turf.area).filter(Boolean))],
      status: accountStatus(owner),
      suspensionReason: owner.suspensionReason || '',
      joinedAt: owner.createdAt || '',
      joinedLabel: formatDate(owner.createdAt),
      teamCount: teams.length,
      requestCount: requests.length,
      _owner: owner,
      _turfs: turfs,
      _teams: teams,
      _requests: requests,
    };
  });
};

// ---- Detail statistics ----------------------------------------------------
// Per-player stats derived from teams, requests and bookings. Wins/losses come
// from match results when present (state.matches[].result); otherwise 0 — never
// invented.
export const getPlayerStats = (playerId) => {
  const state = getDemoState();
  const teams = teamsForPlayer(state, playerId);
  const requests = requestsForPlayer(state, playerId);
  const acceptedRequests = requests.filter((request) => request.status === 'accepted');

  // Tournaments joined: distinct tournaments referenced by the player's matches
  // plus tournaments they have an accepted turf request for (best-effort demo).
  const playerTeamNames = teams.map((team) => team.name);
  const matches = (state.matches || []).filter((match) =>
    (match.teams || []).some((teamName) => playerTeamNames.includes(teamName)));
  const tournamentIds = new Set(matches.map((match) => match.tournamentId).filter(Boolean));

  let wins = 0;
  let losses = 0;
  matches.forEach((match) => {
    if (!match.result) return;
    if (match.result.winner && playerTeamNames.includes(match.result.winner)) wins += 1;
    else if (match.result.loser && playerTeamNames.includes(match.result.loser)) losses += 1;
  });

  return {
    teamsJoined: teams.length,
    tournamentsJoined: tournamentIds.size + acceptedRequests.length,
    matchesPlayed: matches.length,
    wins,
    losses,
    requests: requests.length,
  };
};

// A player's tournament history (from matches) for the detail view.
export const getPlayerTournamentHistory = (playerId) => {
  const state = getDemoState();
  const teams = teamsForPlayer(state, playerId);
  const teamNames = teams.map((team) => team.name);
  const tournaments = getAllTournaments();

  return (state.matches || [])
    .filter((match) => (match.teams || []).some((teamName) => teamNames.includes(teamName)))
    .map((match) => {
      const tournament = tournaments.find((item) => item.id === match.tournamentId);
      const result = match.result || null;
      let outcome = '—';
      if (result?.winner) outcome = teamNames.includes(result.winner) ? 'Won' : 'Lost';
      return {
        id: match.id,
        tournament: tournament?.name || match.tournamentId || 'Match',
        sport: match.sportId || '—',
        date: match.date || '',
        status: match.status || '',
        outcome,
      };
    });
};

// ---- Filter option helpers ------------------------------------------------
export const getPlayerFilterOptions = (rows) => ({
  sports: ['All', ...new Set(rows.map((row) => row.sport).filter((sport) => sport && sport !== '—'))],
  statuses: ['All', 'active', 'suspended'],
  teams: ['All', ...new Set(rows.map((row) => row.team).filter((team) => team && team !== '—'))],
});

export const getOwnerFilterOptions = (rows) => ({
  statuses: ['All', 'active', 'suspended', 'pending'],
  areas: ['All', ...new Set(rows.flatMap((row) => row.areas))],
});

export { fullName as playerFullName, formatDate as formatAdminDate };