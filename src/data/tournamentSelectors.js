import { getAllTurfs, getDemoState } from './demoStore';
import { getAllTournaments, tournamentStage } from './dashboardSelectors';
import { TOURNAMENT_STATUS, isDraft, isPublished } from './adminTournaments';

// ---------------------------------------------------------------------------
// Admin tournament selectors
// ---------------------------------------------------------------------------
// Derives the enriched rows the admin tournament table + detail render, from the
// merged tournament list (static catalogue + admin-created in state.tournaments).

const formatDate = (iso) => {
  if (!iso) return '—';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Admin lifecycle label derived from status + dates. Keeps the "stage" the user
// filters by consistent with the dashboard's tournamentStage().
const adminStatus = (tournament) => {
  const status = tournament.status || '';
  if (status) return status;
  const stage = tournamentStage(tournament);
  return stage.charAt(0).toUpperCase() + stage.slice(1);
};

export const getTournamentRows = () => {
  const state = getDemoState();
  const allTurfs = getAllTurfs();
  const created = state.tournaments || [];
  const createdIds = new Set(created.map((item) => item.id));

  return getAllTournaments().map((tournament) => {
    const venue = allTurfs.find((turf) => turf.id === tournament.venueId);
    const registrations = (state.registrations || []).filter((reg) => reg.tournamentId === tournament.id);
    const registrationOpen = ['Registration Open', 'Published', 'Upcoming'].includes(tournament.status)
      || (!isDraft(tournament) && tournament.status === undefined);

    return {
      id: tournament.id,
      name: tournament.name || 'Tournament',
      sport: tournament.sport || '—',
      format: tournament.format || tournament.matchType || '—',
      venueId: tournament.venueId || '',
      venue: tournament.venueName || venue?.name || '—',
      area: tournament.area || venue?.area || 'Vadodara',
      startDate: tournament.date || tournament.startDate || '',
      startLabel: tournament.dateLabel || formatDate(tournament.date || tournament.startDate),
      registrationStatus: registrationOpen ? 'Open' : (isDraft(tournament) ? 'Draft' : 'Closed'),
      registeredTeams: tournament.registeredTeams || (tournament.teams || []).length || 0,
      teamCapacity: tournament.teamCapacity || tournament.maxTeams || 0,
      registrationCount: registrations.length,
      status: adminStatus(tournament),
      managed: createdIds.has(tournament.id),
      published: isPublished(tournament),
      draft: isDraft(tournament),
      cancellationReason: tournament.cancellationReason || '',
      prizePool: tournament.prizePool || '',
      image: tournament.image || '',
      description: tournament.description || '',
      teams: tournament.teams || [],
      stage: tournamentStage(tournament),
      _tournament: tournament,
    };
  });
};

export const getTournamentFilterOptions = (rows) => ({
  sports: ['All', ...new Set(rows.map((row) => row.sport).filter((sport) => sport && sport !== '—'))],
  statuses: ['All', TOURNAMENT_STATUS.DRAFT, TOURNAMENT_STATUS.PUBLISHED, TOURNAMENT_STATUS.REGISTRATION_OPEN, TOURNAMENT_STATUS.REGISTRATION_CLOSED, TOURNAMENT_STATUS.UPCOMING, TOURNAMENT_STATUS.ONGOING, TOURNAMENT_STATUS.COMPLETED, TOURNAMENT_STATUS.CANCELLED],
  venues: ['All', ...new Set(rows.map((row) => row.venue).filter((venue) => venue && venue !== '—'))],
  dates: ['Any date', 'This week', 'This month', 'Past'],
});

// The sidebar sub-view (?view=) maps to a status/lifecycle filter.
export const filterByView = (rows, view) => {
  if (!view || view === 'all' || view === 'create') return rows;
  return rows.filter((row) => row.stage === view);
};

export { formatDate as formatTournamentDate };