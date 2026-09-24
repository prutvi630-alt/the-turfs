import { accountStatus } from './adminAccounts';
import { getAllTurfs, getDemoState } from './demoStore';
import { isRegisteredTurf, turfStatus, teamStatus } from './adminTurfs';
import { getAllTournaments, getRegistrationCounts, tournamentStage } from './dashboardSelectors';

const countBy = (items, getStatus) => items.reduce((counts, item) => {
  const status = getStatus(item);
  counts[status] = (counts[status] || 0) + 1;
  return counts;
}, {});

export const getReportSummary = () => {
  const state = getDemoState();
  const players = state.players || [];
  const owners = state.owners || [];
  const turfs = getAllTurfs();
  const teams = state.teams || [];
  const tournaments = getAllTournaments();
  const registrations = state.registrations || [];
  const registrationCounts = getRegistrationCounts();
  const recentCutoff = Date.now() - (30 * 86400000);

  const playerStatuses = countBy(players, accountStatus);
  const ownerStatuses = countBy(owners, accountStatus);
  const turfStatuses = countBy(turfs, (turf) => isRegisteredTurf(turf) ? turfStatus(turf) : 'active');
  const teamStatuses = countBy(teams, teamStatus);
  const tournamentStatuses = countBy(tournaments, (tournament) => tournamentStage(tournament));
  const registrationStatuses = countBy(registrations, (registration) => registration.status || 'pending');

  return {
    players: { total: players.length, active: playerStatuses.active || 0, suspended: playerStatuses.suspended || 0, new: players.filter((player) => new Date(player.createdAt || 0).getTime() >= recentCutoff).length },
    owners: { total: owners.length, active: ownerStatuses.active || 0, pending: ownerStatuses.pending || 0, suspended: ownerStatuses.suspended || 0 },
    turfs: { total: turfs.length, active: turfStatuses.active || 0, pending: turfStatuses.pending || 0, suspended: turfStatuses.suspended || 0 },
    teams: { total: teams.length, active: teamStatuses.active || 0, suspended: teamStatuses.suspended || 0 },
    tournaments: { total: tournaments.length, upcoming: tournamentStatuses.upcoming || 0, ongoing: tournamentStatuses.ongoing || 0, completed: tournamentStatuses.completed || 0, cancelled: tournamentStatuses.cancelled || 0 },
    registrations: { total: registrations.length + (state.requests || []).length, pending: registrationCounts.pending, approved: registrationCounts.approved, rejected: registrationCounts.rejected, cancelled: registrationStatuses.cancelled || 0 },
  };
};
