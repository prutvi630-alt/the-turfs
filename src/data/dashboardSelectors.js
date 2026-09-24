import { tournaments as baseTournaments } from './tournaments';
import { getAllTurfs, getBookings, getDemoState } from './demoStore';

// ---------------------------------------------------------------------------
// Dashboard selectors
// ---------------------------------------------------------------------------
// All dashboard numbers are DERIVED here from the shared demo data layer. No
// value is hardcoded in the UI: add a player, turf, team or tournament to the
// store and the corresponding figure changes on the next render.
//
// Keeping the calculations in one module also means they can later be swapped
// for API calls without touching the components.

// ---- Tournament lifecycle -------------------------------------------------
// A tournament's lifecycle stage is derived from its status and date so the
// overview always agrees with the public tournament pages, which use the same
// `isUpcoming` idea (see TournamentPage).
const CANCELLED_STATUSES = ['cancelled', 'canceled'];
const COMPLETED_STATUSES = ['completed', 'finished', 'concluded'];
const ONGOING_STATUSES = ['live', 'ongoing', 'in progress', 'in-progress'];

const startTime = (tournament) => new Date(`${tournament.date}T00:00:00`);

export const tournamentStage = (tournament, now = new Date()) => {
  const status = String(tournament.status || '').toLowerCase();
  if (CANCELLED_STATUSES.includes(status)) return 'cancelled';
  if (COMPLETED_STATUSES.includes(status)) return 'completed';
  if (ONGOING_STATUSES.includes(status)) return 'ongoing';
  // No explicit ongoing/finished flag: fall back to the date.
  return startTime(tournament) > now ? 'upcoming' : 'completed';
};

// Merge the static catalogue with any admin-created tournaments held in demo
// state, so newly created events count immediately.
export const getAllTournaments = () => {
  const state = getDemoState();
  const created = state.tournaments || [];
  const registrations = state.registrations || [];
  return [...baseTournaments, ...created].map((tournament) => {
    const result = state.tournamentResults?.[tournament.id];
    const approved = registrations.filter((item) => item.tournamentId === tournament.id && item.status === 'approved');
    const withResult = result?.winner ? { ...tournament, status: 'Completed', winner: result.winner, finalResult: result.finalResult } : tournament;
    if (!approved.length) return withResult;
    const registeredNames = new Set((tournament.teams || []).map((team) => team.name));
    const additionalTeams = approved
      .filter((item) => !registeredNames.has(item.teamName))
      .map((item) => ({ name: item.teamName, captain: item.captain, status: 'Registered' }));
    return {
      ...withResult,
      registeredTeams: (tournament.registeredTeams || 0) + additionalTeams.length,
      teams: [...(tournament.teams || []), ...additionalTeams],
    };
  });
};

export const getTournamentCounts = (now = new Date()) => {
  const all = getAllTournaments();
  const counts = { total: all.length, upcoming: 0, ongoing: 0, completed: 0, cancelled: 0 };
  all.forEach((tournament) => {
    counts[tournamentStage(tournament, now)] += 1;
  });
  return counts;
};

// ---- Registrations --------------------------------------------------------
// "Pending registrations" = turf-join requests awaiting an owner/admin decision,
// plus any tournament registration awaiting approval. Both live in demo state.
export const getRegistrationCounts = () => {
  const state = getDemoState();
  const requests = state.requests || [];
  const tournamentRegistrations = state.registrations || [];

  const pendingRequests = requests.filter((request) => request.status === 'pending').length;
  const pendingTournament = tournamentRegistrations.filter((registration) => registration.status === 'pending').length;
  const approved = requests.filter((request) => request.status === 'accepted').length
    + tournamentRegistrations.filter((registration) => registration.status === 'approved' || registration.status === 'accepted').length;
  const rejected = requests.filter((request) => request.status === 'rejected').length
    + tournamentRegistrations.filter((registration) => registration.status === 'rejected').length;

  return {
    total: requests.length + tournamentRegistrations.length,
    pending: pendingRequests + pendingTournament,
    approved,
    rejected,
  };
};

// ---- Aggregate summary ----------------------------------------------------
export const getDashboardSummary = () => {
  const state = getDemoState();
  const tournaments = getTournamentCounts();
  const registrations = getRegistrationCounts();

  return {
    players: (state.players || []).length,
    turfOwners: (state.owners || []).length,
    turfs: getAllTurfs().length,
    teams: (state.teams || []).length,
    tournaments: tournaments.total,
    upcomingTournaments: tournaments.upcoming,
    ongoingTournaments: tournaments.ongoing,
    completedTournaments: tournaments.completed,
    cancelledTournaments: tournaments.cancelled,
    pendingRegistrations: registrations.pending,
    registrations,
    bookings: getBookings().length,
  };
};

// ---- Recent activity ------------------------------------------------------
export const getRecentActivities = (limit = 6) => {
  const state = getDemoState();
  const list = state.activities || [];
  return [...list]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
};

// Relative "time ago" used in the activity feed; falls back to a date string.
export const timeAgo = (iso, now = new Date()) => {
  if (!iso) return '';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const seconds = Math.round((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return then.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};