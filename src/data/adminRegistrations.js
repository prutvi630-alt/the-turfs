import { tournaments as staticTournaments } from './tournaments';
import { createId, getDemoState, saveDemoState } from './demoStore';
import { getAllTournaments } from './dashboardSelectors';
import { ACTIVITY_TYPES, recordActivity } from './activityStore';

export const REGISTRATION_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

const nameForTournament = (id) => getAllTournaments().find((item) => item.id === id)?.name || 'Unknown tournament';

export const getRegistrationRows = () => {
  const state = getDemoState();
  const tournaments = getAllTournaments();
  return (state.registrations || []).map((registration) => ({
    ...registration,
    tournament: tournaments.find((item) => item.id === registration.tournamentId) || staticTournaments.find((item) => item.id === registration.tournamentId),
    tournamentName: nameForTournament(registration.tournamentId),
  }));
};

const syncTournament = (state, registration) => {
  const tournament = (state.tournaments || []).find((item) => item.id === registration.tournamentId);
  if (!tournament) return;
  const approved = (state.registrations || []).filter((item) => item.tournamentId === tournament.id && item.status === 'approved');
  tournament.registeredTeams = approved.length;
  tournament.teams = approved.map((item) => ({ name: item.teamName, captain: item.captain, status: 'Registered' }));
};

const updateStatus = (id, status, reason = '') => {
  const state = getDemoState();
  const registration = (state.registrations || []).find((item) => item.id === id);
  if (!registration) return { ok: false, error: 'Registration not found.' };
  if (registration.status === status) return { ok: false, error: `Registration is already ${status}.` };
  registration.status = status;
  registration.updatedAt = new Date().toISOString();
  if (reason) registration.reason = reason;
  syncTournament(state, registration);
  const activityType = status === 'approved' ? ACTIVITY_TYPES.REGISTRATION_APPROVED : ACTIVITY_TYPES.REGISTRATION_REJECTED;
  recordActivity({
    state,
    type: activityType,
    actorRole: 'admin',
    actorName: 'Platform Admin',
    message: `Registration ${status}: ${registration.teamName}`,
    targetPath: `/admin/tournaments/${registration.tournamentId}`,
    meta: { registrationId: id, tournamentId: registration.tournamentId, reason },
  });
  saveDemoState(state);
  return { ok: true, registration };
};

export const approveRegistration = (id) => updateStatus(id, 'approved');
export const rejectRegistration = (id, reason) => updateStatus(id, 'rejected', reason);
export const cancelRegistration = (id) => updateStatus(id, 'cancelled');

export const removeRegistration = (id) => {
  const state = getDemoState();
  const registration = (state.registrations || []).find((item) => item.id === id);
  if (!registration) return { ok: false, error: 'Registration not found.' };
  state.registrations = state.registrations.filter((item) => item.id !== id);
  syncTournament(state, registration);
  recordActivity({
    state,
    type: ACTIVITY_TYPES.REGISTRATION_REJECTED,
    actorRole: 'admin',
    actorName: 'Platform Admin',
    message: `Registration removed: ${registration.teamName}`,
    targetPath: '/admin/registrations',
    meta: { registrationId: id, tournamentId: registration.tournamentId },
  });
  saveDemoState(state);
  return { ok: true };
};

export const createRegistration = (input) => {
  const state = getDemoState();
  const registration = {
    id: createId('registration'),
    tournamentId: input.tournamentId,
    teamName: input.teamName,
    captain: input.captain,
    players: input.players || [],
    registeredAt: new Date().toISOString(),
    entryFee: input.entryFee || '',
    status: 'pending',
  };
  state.registrations = [...(state.registrations || []), registration];
  recordActivity({
    state,
    type: ACTIVITY_TYPES.REGISTRATION_CREATED,
    actorRole: 'player',
    actorName: registration.captain || 'Player',
    message: `New tournament registration: ${registration.teamName}`,
    targetPath: `/admin/tournaments/${registration.tournamentId}`,
    meta: { registrationId: registration.id, tournamentId: registration.tournamentId },
  });
  saveDemoState(state);
  return registration;
};