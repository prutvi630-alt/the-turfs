import { tournaments as staticTournaments } from './tournaments.js';
import { createId, getAllTurfs, getDemoState, saveDemoState } from './demoStore.js';
import { getAllTournaments } from './dashboardSelectors.js';
import { ACTIVITY_TYPES, recordActivity } from './activityStore.js';
import { formatTournamentFee, getConfiguredTournamentFeeAmount } from './tournamentFees.js';

export const REGISTRATION_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];
export const PLAYER_TOURNAMENT_REGISTRATION_FEE = 0;

const nameForTournament = (id) => getAllTournaments().find((item) => item.id === id)?.name || 'Unknown tournament';

export const parseTournamentFeeAmount = (value) => {
  return getConfiguredTournamentFeeAmount(value) ?? 0;
};

export const getTournamentRegistrationType = (tournament) => (
  String(tournament?.registrationType || 'Team').toLowerCase() === 'individual' ? 'Individual' : 'Team'
);

export const calculateTournamentFee = (feeText = '', _participantCount = 1, registrationType = 'Individual') => (
  getTournamentRegistrationType({ registrationType }) === 'Individual'
    ? PLAYER_TOURNAMENT_REGISTRATION_FEE
    : parseTournamentFeeAmount(feeText)
);

const getTournamentForRegistration = (state, tournamentId) => (
  (state.tournaments || []).find((item) => item.id === tournamentId)
  || staticTournaments.find((item) => item.id === tournamentId)
  || null
);

const getCapacityForTournament = (tournament, registrationType) => Number(
  registrationType === 'Individual'
    ? tournament.maxPlayers || tournament.teamCapacity
    : tournament.maxTeams || tournament.teamCapacity
) || 0;

const getSlotAvailability = (state, tournamentId) => {
  const tournament = getTournamentForRegistration(state, tournamentId);
  if (!tournament) return { ok: false, error: 'Tournament not found.', registrationType: null, capacity: 0, availableCount: 0, slots: [] };

  const registrationType = getTournamentRegistrationType(tournament);
  const capacity = getCapacityForTournament(tournament, registrationType);
  const occupiedSlots = new Map();
  const markSlot = (slotNumber, registration = null) => {
    const normalizedSlot = Number(slotNumber);
    if (Number.isInteger(normalizedSlot) && normalizedSlot >= 1 && normalizedSlot <= capacity) {
      occupiedSlots.set(normalizedSlot, registration);
    }
  };

  const baselineCount = Math.min(Math.max(Number(tournament.registeredTeams) || 0, 0), capacity);
  for (let slotNumber = 1; slotNumber <= baselineCount; slotNumber += 1) markSlot(slotNumber);

  const registeredTeamNames = new Set((tournament.teams || []).map((team) => team.name).filter(Boolean));
  const activeRegistrations = (state.registrations || []).filter((registration) => (
    registration.tournamentId === tournamentId && ['pending', 'approved'].includes(registration.status)
  ));

  activeRegistrations.forEach((registration) => {
    const assignedSlots = Array.isArray(registration.slotNumbers) && registration.slotNumbers.length
      ? registration.slotNumbers
      : registration.slotNumber ? [registration.slotNumber] : [];

    if (assignedSlots.length) {
      assignedSlots.forEach((slotNumber) => markSlot(slotNumber, registration));
      return;
    }

    if (registeredTeamNames.has(registration.teamName)) return;

    const count = registrationType === 'Individual'
      ? Math.max(Number(registration.participantCount) || registration.players?.length || 1, 1)
      : 1;
    let remaining = count;
    for (let slotNumber = 1; slotNumber <= capacity && remaining > 0; slotNumber += 1) {
      if (!occupiedSlots.has(slotNumber)) {
        markSlot(slotNumber, registration);
        remaining -= 1;
      }
    }
  });

  const slotLabel = registrationType === 'Individual' ? 'Player' : 'Team';
  const slots = Array.from({ length: capacity }, (_, index) => {
    const slotNumber = index + 1;
    const registration = occupiedSlots.get(slotNumber);
    return {
      slotNumber,
      label: `${slotLabel} slot ${slotNumber}`,
      available: !occupiedSlots.has(slotNumber),
      status: registration ? 'occupied' : 'available',
    };
  });

  return {
    ok: true,
    registrationType,
    slotLabel,
    capacity,
    availableCount: slots.filter((slot) => slot.available).length,
    slots,
  };
};

export const getTournamentSlotAvailability = (tournamentId) => getSlotAvailability(getDemoState(), tournamentId);

export const isTournamentRegistrationOpen = (tournament, now = new Date()) => {
  if (!tournament?.id || tournament.published === false) return false;
  const status = String(tournament.status || '').trim().toLowerCase();
  if (['draft', 'unpublished', 'cancelled', 'canceled', 'completed', 'finished', 'live', 'ongoing', 'closed', 'registration closed', 'expired'].includes(status)) return false;
  if (tournament.registrationStart && tournament.registrationStart > now.toISOString().slice(0, 10)) return false;
  const endDate = tournament.registrationEnd || tournament.date || tournament.startDate;
  return !endDate || endDate >= now.toISOString().slice(0, 10);
};

export const getRegistrationRows = () => {
  const state = getDemoState();
  const tournaments = getAllTournaments();
  return (state.registrations || []).map((registration) => {
    const team = (state.teams || []).find((item) => item.id === registration.teamId);
    const owner = (state.owners || []).find((item) => item.id === registration.ownerId);
    return {
      ...registration,
      team,
      owner,
      tournament: tournaments.find((item) => item.id === registration.tournamentId) || staticTournaments.find((item) => item.id === registration.tournamentId),
      tournamentName: nameForTournament(registration.tournamentId),
    };
  });
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

const createTournamentRegistrationNow = (input = {}) => {
  const state = getDemoState();
  const tournamentId = input.tournamentId;
  const playerId = input.playerId || input.player?.id || null;
  const ownerId = input.ownerId || null;

  if (!tournamentId) return { ok: false, error: 'Tournament is required.' };
  if (!playerId && !ownerId) return { ok: false, error: 'You must be logged in to register for a tournament.' };

  const tournament = getTournamentForRegistration(state, tournamentId);
  if (!tournament) return { ok: false, error: 'Tournament not found.' };
  const registrationType = getTournamentRegistrationType(tournament);
  const configuredFee = getConfiguredTournamentFeeAmount(tournament.entryFee);
  let team = null;
  if (ownerId) {
    const owner = (state.owners || []).find((account) => account.id === ownerId);
    const turf = getAllTurfs().find((item) => item.id === input.turfId);
    team = (state.teams || []).find((item) => (
      item.id === input.teamId && item.ownerId === ownerId && item.turfId === input.turfId
    ));
    if (!owner || !turf || !(owner.turfIds || []).includes(input.turfId) || !team) {
      return { ok: false, error: 'Select a team owned by your turf account.' };
    }
    if (getTournamentRegistrationType(tournament) !== 'Team') {
      return { ok: false, error: 'Turf teams can only register for team tournaments.' };
    }
    if (String(team.sport || '').trim().toLowerCase() !== String(tournament.sport || '').trim().toLowerCase()) {
      return { ok: false, error: 'The team game must match the tournament game.' };
    }
    if (!isTournamentRegistrationOpen(tournament)) {
      return { ok: false, error: 'Tournament registration is closed.' };
    }
  } else if (input.teamId) {
    const player = (state.players || []).find((account) => account.id === playerId);
    team = (state.teams || []).find((item) => (
      item.id === input.teamId && item.playerId === playerId && !item.ownerId
    ));
    if (!player || !team) return { ok: false, error: 'Select a team belonging to your player account.' };
    if (getTournamentRegistrationType(tournament) !== 'Team') {
      return { ok: false, error: 'Player teams can only register for team tournaments.' };
    }
    if (String(team.sport || '').trim().toLowerCase() !== String(tournament.sport || '').trim().toLowerCase()) {
      return { ok: false, error: 'The team game must match the tournament game.' };
    }
    if (!isTournamentRegistrationOpen(tournament)) {
      return { ok: false, error: 'Tournament registration is closed.' };
    }
  }

  const duplicate = !input.teamId && playerId && (state.registrations || []).find((registration) => (
    registration.tournamentId === tournamentId && registration.playerId === playerId
    && ['pending', 'approved'].includes(registration.status)
  ));

  if (duplicate) {
    return { ok: false, error: 'You are already registered for this tournament.' };
  }
  const duplicateTeam = input.teamId && (state.registrations || []).some((registration) => (
    registration.tournamentId === tournamentId && registration.teamId === input.teamId
    && ['pending', 'approved'].includes(registration.status)
  ));
  if (duplicateTeam) return { ok: false, error: 'This team is already registered for this tournament.' };
  if (registrationType === 'Team' && configuredFee === null) {
    return { ok: false, error: 'This team tournament does not have a valid registration fee configured yet.' };
  }

  const participantCount = registrationType === 'Individual'
    ? 1
    : Math.max(Number(input.participantCount || team?.members?.length || input.players?.length || 1) || 1, 1);
  const slotNumber = Number(input.slotNumber);
  const availability = getSlotAvailability(state, tournamentId);
  if (!availability.ok) return { ok: false, error: availability.error || 'Tournament slot availability could not be checked.' };
  if (!Number.isInteger(slotNumber)) return { ok: false, error: 'Select an available slot before continuing.' };
  const selectedSlot = availability.slots.find((slot) => slot.slotNumber === slotNumber);
  if (!selectedSlot?.available) return { ok: false, error: 'That slot is no longer available. Please select another slot.' };

  const teamName = team?.name || input.teamName || input.playerName || 'Player';
  const captain = team?.captainDetails?.name || team?.captain || input.captain || input.playerName || teamName;
  const players = team?.members?.length
    ? team.members.map((member) => member.name)
    : Array.isArray(input.players) && input.players.length ? input.players : [input.playerName || teamName];
  const entryFee = registrationType === 'Individual'
    ? `₹${PLAYER_TOURNAMENT_REGISTRATION_FEE} per player`
    : `${formatTournamentFee(configuredFee)} per team`;
  const totalFee = registrationType === 'Individual' ? PLAYER_TOURNAMENT_REGISTRATION_FEE : configuredFee;

  const registration = {
    id: createId('registration'),
    tournamentId,
    playerId,
    ownerId,
    turfId: team?.turfId || null,
    teamId: team?.id || null,
    teamSport: team?.sport || tournament.sport,
    ownerName: ownerId ? state.owners.find((item) => item.id === ownerId)?.name || '' : '',
    teamName,
    captain,
    playerName: input.playerName || teamName,
    email: input.email || '',
    mobile: input.mobile || '',
    players,
    participantCount,
    registrationType,
    registrationSource: ownerId ? 'turf-owner' : team ? 'player-team' : 'player',
    slotNumber,
    slotNumbers: [slotNumber],
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
    actorRole: ownerId ? 'turf-owner' : 'player',
    actorName: ownerId ? registration.ownerName : registration.playerName || registration.captain || 'Player',
    message: `New tournament registration: ${registration.teamName}`,
    targetPath: `/admin/tournaments/${registration.tournamentId}`,
    meta: { registrationId: registration.id, tournamentId: registration.tournamentId },
  });
  if (!saveDemoState(state)) return { ok: false, error: 'Unable to save the tournament registration. Please try again.' };
  return { ok: true, registration };
};

export const createTournamentRegistration = (input = {}) => {
  const locks = globalThis.navigator?.locks;
  if (locks?.request && input.tournamentId) {
    return locks.request(`tournament-registration-${input.tournamentId}`, () => createTournamentRegistrationNow(input));
  }
  return Promise.resolve(createTournamentRegistrationNow(input));
};

export const createRegistration = (input) => createTournamentRegistration({
  ...input,
  playerId: input.playerId || input.player?.id,
  playerName: input.playerName || input.captain || input.teamName,
  participantCount: input.participantCount || input.players?.length || 1,
  registrationType: input.registrationType || 'Team',
});