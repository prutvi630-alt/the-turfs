import { tournaments as staticTournaments } from './tournaments.js';
import { createId, getDemoState, saveDemoState } from './demoStore.js';
import { getAllTournaments } from './dashboardSelectors.js';
import { ACTIVITY_TYPES, recordActivity } from './activityStore.js';

export const REGISTRATION_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

const nameForTournament = (id) => getAllTournaments().find((item) => item.id === id)?.name || 'Unknown tournament';

export const parseTournamentFeeAmount = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const amount = Number(String(value).replace(/[^\d.]/g, '').replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : 0;
};

export const calculateTournamentFee = (feeText = '', participantCount = 1, registrationType = 'Individual') => {
  const normalized = String(feeText || '').trim();
  if (!normalized) return 0;
  const lower = normalized.toLowerCase();
  const count = Math.max(Number(participantCount) || 1, 1);
  const amount = parseTournamentFeeAmount(normalized);

  if (amount === 0) return 0;
  if (lower.includes('per player') || registrationType === 'Individual') return amount * count;
  if (lower.includes('per team') || registrationType === 'Team') return amount;
  return amount * count;
};

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
  tournament.registeredTeams = tournament.registrationType === 'Individual'
    ? approved.reduce((total, item) => total + Math.max(Number(item.participantCount) || item.players?.length || 1, 1), 0)
    : approved.length;
  tournament.teams = approved.map((item) => ({ name: item.teamName, captain: item.captain, status: 'Registered' }));
};

const updateStatus = (id, status, reason = '') => {
  const state = getDemoState();
  const registration = (state.registrations || []).find((item) => item.id === id);
  if (!registration) return { ok: false, error: 'Registration not found.' };
  if (status === 'approved' && registration.paymentStatus !== 'verified') {
    return { ok: false, error: 'Payment must be verified by the payment provider before this registration can be approved.' };
  }
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

export const createTournamentRegistration = (input = {}) => {
  const state = getDemoState();
  const tournamentId = input.tournamentId;
  const playerId = input.playerId || input.player?.id || null;

  if (!tournamentId) return { ok: false, error: 'Tournament is required.' };
  if (!playerId) return { ok: false, error: 'You must be logged in to register for a tournament.' };

  const duplicate = (state.registrations || []).find((registration) => (
    registration.tournamentId === tournamentId && registration.playerId === playerId
    && ['pending', 'approved'].includes(registration.status)
  ));

  if (duplicate) {
    return { ok: false, error: 'You are already registered for this tournament.' };
  }

  const tournament = [...staticTournaments, ...(state.tournaments || [])].find((item) => item.id === tournamentId);
  if (!tournament) return { ok: false, error: 'Tournament not found.' };
  const participantCount = Math.max(Number(input.participantCount || input.players?.length || 1) || 1, 1);
  const registrationType = tournament.registrationType || input.registrationType || 'Team';
  const capacity = Number(registrationType === 'Individual'
    ? tournament.maxPlayers || tournament.teamCapacity
    : tournament.maxTeams || tournament.teamCapacity) || 0;
  const reserved = (state.registrations || []).filter((registration) => (
    registration.tournamentId === tournamentId && ['pending', 'approved'].includes(registration.status)
  ));
  const reservedCount = registrationType === 'Individual'
    ? reserved.reduce((total, registration) => total + Math.max(Number(registration.participantCount) || registration.players?.length || 1, 1), 0)
    : reserved.length;
  const slotsRequested = registrationType === 'Individual' ? participantCount : 1;
  if (capacity > 0 && reservedCount + slotsRequested > capacity) {
    return { ok: false, error: `Only ${Math.max(capacity - reservedCount, 0)} registration slot(s) remain.` };
  }
  const teamName = input.teamName || input.playerName || 'Player';
  const captain = input.captain || input.playerName || teamName;
  const players = Array.isArray(input.players) && input.players.length ? input.players : [input.playerName || teamName];
  const entryFee = input.entryFee || '₹200 per player';
  const totalFee = calculateTournamentFee(entryFee, participantCount, registrationType);

  const registration = {
    id: createId('registration'),
    tournamentId,
    playerId,
    teamName,
    captain,
    playerName: input.playerName || teamName,
    email: input.email || '',
    mobile: input.mobile || '',
    players,
    participantCount,
    registrationType,
    registeredAt: new Date().toISOString(),
    entryFee,
    totalFee,
    paymentStatus: 'pending',
    status: 'pending',
  };

  state.registrations = [...(state.registrations || []), registration];
  syncTournament(state, registration);
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
  return { ok: true, registration };
};

export const createRegistration = (input) => createTournamentRegistration({
  ...input,
  playerId: input.playerId || input.player?.id,
  playerName: input.playerName || input.captain || input.teamName,
  participantCount: input.participantCount || input.players?.length || 1,
  registrationType: input.registrationType || 'Team',
});