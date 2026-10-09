import { ACTIVITY_TYPES, recordActivity } from './activityStore.js';
import { sports } from './homeData.js';
import { createId, getAllTurfs, getDemoState, saveDemoState } from './demoStore.js';

const ACTIVE_REGISTRATION_STATUSES = ['pending', 'approved'];
const isTeamRegistrationActive = (state, teamId) => (
  (state.registrations || []).some((registration) => (
    registration.teamId === teamId && ACTIVE_REGISTRATION_STATUSES.includes(registration.status)
  ))
);

const validateMembers = (members) => {
  if (!Array.isArray(members)) return { ok: false, error: 'Team players must be a list.' };
  const ids = new Set();
  const emails = new Set();
  const mobiles = new Set();
  let captainCount = 0;

  for (const member of members) {
    const name = String(member.name || '').trim();
    const email = String(member.email || '').trim().toLowerCase();
    const mobile = String(member.mobile || '').replace(/\D/g, '');
    const age = Number(member.age);
    const role = member.role;
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !/^[6-9]\d{9}$/.test(mobile)
      || !Number.isInteger(age) || age < 1 || age > 120 || !['Player', 'Captain'].includes(role)) {
      return { ok: false, error: 'Each team player needs a valid name, mobile, age, email and role.' };
    }
    if (member.id && ids.has(member.id)) return { ok: false, error: 'Duplicate team player.' };
    if (emails.has(email) || mobiles.has(mobile)) {
      return { ok: false, error: 'A player with that email or mobile is already on this team.' };
    }
    ids.add(member.id);
    emails.add(email);
    mobiles.add(mobile);
    if (role === 'Captain') captainCount += 1;
  }

  if (captainCount > 1) return { ok: false, error: 'This team already has a captain. Update the existing captain before assigning another.' };
  return { ok: true };
};

const normalizeCaptainBankDetails = (values = {}) => {
  const bankDetails = {
    bankName: String(values.bankName || '').trim(),
    accountNumber: String(values.accountNumber || '').trim(),
    ifscCode: String(values.ifscCode || '').trim().toUpperCase(),
  };
  const hasAnyValue = Object.values(bankDetails).some(Boolean);
  if (!hasAnyValue) return { ok: true, bankDetails: null };
  if (!bankDetails.bankName) return { ok: false, error: 'Enter the captain’s bank name.' };
  if (!/^\d{9,18}$/.test(bankDetails.accountNumber)) {
    return { ok: false, error: 'Enter a valid captain account number (9–18 digits).' };
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode)) {
    return { ok: false, error: 'Enter a valid 11-character captain IFSC code.' };
  }
  return { ok: true, bankDetails };
};

const saveTeamForAccount = ({ ownerId = null, playerId = null, turfId = null, teamId = null, values }) => {
  const state = getDemoState();
  const owner = (state.owners || []).find((account) => account.id === ownerId);
  const player = (state.players || []).find((account) => account.id === playerId);
  const turf = ownerId ? getAllTurfs().find((item) => item.id === turfId) : null;
  if (ownerId ? (!owner || !turf || !(owner.turfIds || []).includes(turfId)) : !player) {
    return { ok: false, error: 'You do not have access to manage these teams.' };
  }

  const name = String(values?.name || '').trim().replace(/\s+/g, ' ');
  const sport = String(values?.sport || '').trim();
  const members = (values?.members || []).map((member) => ({
    ...member,
    id: member.id || createId('team-player'),
    name: String(member.name || '').trim(),
    mobile: String(member.mobile || '').replace(/\D/g, ''),
    age: Number(member.age),
    email: String(member.email || '').trim().toLowerCase(),
    role: member.role,
  }));
  if (!name) return { ok: false, error: 'Team name is required.', field: 'name' };
  if (!sports.some((item) => item.name.toLowerCase() === sport.toLowerCase())) {
    return { ok: false, error: 'Select a game configured on the platform.', field: 'sport' };
  }
  if (values.logo && !/^data:image\/jpeg;base64,/.test(values.logo)) {
    return { ok: false, error: 'Upload a valid team logo image.' };
  }
  const memberValidation = validateMembers(members);
  if (!memberValidation.ok) return memberValidation;
  const captain = members.find((member) => member.role === 'Captain') || null;
  const bankValidation = normalizeCaptainBankDetails(values.captainBankDetails);
  if (!bankValidation.ok) return bankValidation;
  if (bankValidation.bankDetails && !captain) {
    return { ok: false, error: 'Assign a captain before adding captain bank details.' };
  }

  const inScope = (team) => playerId
    ? team.playerId === playerId && !team.ownerId
    : team.ownerId === ownerId && team.turfId === turfId;
  const duplicate = (state.teams || []).some((team) => (
    team.id !== teamId && inScope(team)
    && String(team.name || '').trim().toLowerCase() === name.toLowerCase()
  ));
  if (duplicate) return { ok: false, error: 'A team with this name already exists in your teams.' };

  const existingIndex = (state.teams || []).findIndex((team) => (
    team.id === teamId && inScope(team)
  ));
  if (teamId && existingIndex < 0) return { ok: false, error: 'Team not found in your account.' };
  const existing = existingIndex >= 0 ? state.teams[existingIndex] : null;
  if (existing && existing.sport !== sport && isTeamRegistrationActive(state, teamId)) {
    return { ok: false, error: 'The game cannot be changed while this team has an active tournament registration.' };
  }

  const now = new Date().toISOString();
  const record = {
    ...(existing || {}),
    id: existing?.id || createId('team'),
    ownerId: ownerId || null,
    turfId: turfId || null,
    playerId: playerId || null,
    createdByRole: playerId ? 'player' : 'turf-owner',
    name,
    logo: values.logo || '',
    sport,
    description: String(values.description || '').trim(),
    members,
    memberIds: members.map((member) => member.playerId).filter(Boolean),
    captainId: captain?.id || '',
    captain: captain ? captain.name : '',
    captainDetails: captain ? { ...captain, bankDetails: bankValidation.bankDetails } : null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (existingIndex >= 0) state.teams[existingIndex] = record;
  else state.teams = [...(state.teams || []), record];

  recordActivity({
    state,
    type: existing ? ACTIVITY_TYPES.TEAM_UPDATED : ACTIVITY_TYPES.TEAM_CREATED,
    actorRole: playerId ? 'player' : 'turf-owner',
    actorName: player ? `${player.firstName || ''} ${player.surname || ''}`.trim() : owner.name,
    message: `${existing ? 'Team updated' : 'Team created'}: ${record.name}`,
    targetPath: playerId ? '/player/dashboard#player-teams' : '/admin/teams',
    meta: { teamId: record.id, ownerId, playerId, turfId },
  });
  if (!saveDemoState(state)) return { ok: false, error: 'Unable to save the team. Please try again.' };
  return { ok: true, team: record };
};

export const saveOwnerTeam = (input) => saveTeamForAccount(input);
export const savePlayerTeam = (input) => saveTeamForAccount({ ...input, ownerId: null, turfId: null });

const deleteTeamForAccount = ({ ownerId = null, playerId = null, turfId = null, teamId }) => {
  const state = getDemoState();
  const team = (state.teams || []).find((item) => (
    item.id === teamId && (playerId
      ? item.playerId === playerId && !item.ownerId
      : item.ownerId === ownerId && item.turfId === turfId)
  ));
  if (!team) return { ok: false, error: 'Team not found in your account.' };
  if (isTeamRegistrationActive(state, teamId)) {
    return { ok: false, error: 'This team has an active tournament registration and cannot be deleted.' };
  }

  state.teams = state.teams.filter((item) => item.id !== teamId);
  recordActivity({
    state,
    type: ACTIVITY_TYPES.TEAM_UPDATED,
    actorRole: playerId ? 'player' : 'turf-owner',
    actorName: playerId
      ? `${(state.players || []).find((item) => item.id === playerId)?.firstName || ''} ${(state.players || []).find((item) => item.id === playerId)?.surname || ''}`.trim() || 'Player'
      : (state.owners || []).find((item) => item.id === ownerId)?.name || 'Turf Owner',
    message: `Team deleted: ${team.name}`,
    targetPath: playerId ? '/player/dashboard#player-teams' : '/admin/teams',
    meta: { teamId, ownerId, playerId, turfId },
  });
  if (!saveDemoState(state)) return { ok: false, error: 'Unable to delete the team. Please try again.' };
  return { ok: true };
};

export const deleteOwnerTeam = (input) => deleteTeamForAccount(input);
export const deletePlayerTeam = (input) => deleteTeamForAccount({ ...input, ownerId: null, turfId: null });
