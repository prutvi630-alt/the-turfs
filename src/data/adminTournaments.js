import { createId, getDemoState, saveDemoState } from './demoStore';
import { ACTIVITY_TYPES, recordActivity } from './activityStore';

// ---------------------------------------------------------------------------
// Admin tournament management
// ---------------------------------------------------------------------------
// Admin-created / edited tournaments are stored in `state.tournaments`. They are
// merged with the static catalogue by getAllTournaments() (dashboardSelectors)
// and by the public tournament surfaces, so a published tournament flows to the
// Upcoming Tournaments UI without any duplicated hardcoded data.
//
// Admin lifecycle status vs. what the public UI looks for:
//   - DRAFT / UNPUBLISHED : hidden from the public (not "upcoming")
//   - PUBLISHED           : visible; public shows it as "Registration Open"
//   - REGISTRATION_OPEN   : visible & open
//   - REGISTRATION_CLOSED : visible but closed
//   - UPCOMING / ONGOING / COMPLETED / CANCELLED : lifecycle stages
//
// To keep the public `isUpcoming` check (which excludes completed/cancelled/live)
// working, the stored `status` value is chosen so those exclusions behave: a
// draft/unpublished tournament is excluded via a dedicated flag instead.

export const TOURNAMENT_STATUS = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  REGISTRATION_OPEN: 'Registration Open',
  REGISTRATION_CLOSED: 'Registration Closed',
  UPCOMING: 'Upcoming',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

// Every status an admin can pick in filters / forms, in lifecycle order.
export const TOURNAMENT_STATUSES = Object.values(TOURNAMENT_STATUS);

// Statuses considered "not visible to the public".
const HIDDEN_STATUSES = [TOURNAMENT_STATUS.DRAFT, 'Unpublished'];

export const isPublished = (tournament = {}) =>
  !HIDDEN_STATUSES.includes(tournament.status) && tournament.status !== undefined;

export const isDraft = (tournament = {}) =>
  HIDDEN_STATUSES.includes(tournament.status) || tournament.published === false;

// Formats per sport — used by the create/edit form.
export const SPORT_FORMATS = {
  Cricket: ['T10', 'T20', 'Box Cricket'],
  Football: ['5v5', '7v7', '11v11'],
  Pickleball: ['Singles', 'Doubles', 'Mixed Doubles'],
};

export const TOURNAMENT_SPORTS = Object.keys(SPORT_FORMATS);

export const REGISTRATION_TYPES = ['Team', 'Individual'];

const formatDateLabel = (date) => {
  if (!date) return '';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
};

const numeric = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Normalise raw form input into the stored tournament record shape, matching the
// static catalogue's keys (so the public pages render it unchanged) plus the
// richer admin fields.
const buildRecord = (input, existing = {}) => {
  const start = input.startDate || input.date || '';
  const venueName = input.venueName || '';
  return {
    ...existing,
    id: existing.id || createId('tournament'),
    name: String(input.name || '').trim(),
    sport: input.sport || 'Cricket',
    format: input.format || '',
    matchType: input.matchType || input.format || '',
    description: input.description || '',
    rules: input.rules || '',
    eligibilityRules: input.eligibilityRules || '',
    cancellationPolicy: input.cancellationPolicy || '',

    // Venue (existing turf data)
    venueId: input.venueId || '',
    venueName,
    area: input.area || 'Vadodara',

    // Dates
    registrationStart: input.registrationStart || '',
    registrationEnd: input.registrationEnd || '',
    startDate: start,
    endDate: input.endDate || '',
    // `date` / `dateLabel` keep the public pages working unchanged.
    date: start,
    dateLabel: formatDateLabel(start),

    // Registration
    registrationType: input.registrationType || 'Team',
    maxTeams: numeric(input.maxTeams),
    minTeams: numeric(input.minTeams),
    maxPlayers: numeric(input.maxPlayers),
    minPlayers: numeric(input.minPlayers),
    entryFee: input.entryFee || '',

    // Prizes
    prizePool: input.prizePool || '',
    firstPrize: input.firstPrize || '',
    secondPrize: input.secondPrize || '',
    thirdPrize: input.thirdPrize || '',
    winnerTrophy: Boolean(input.winnerTrophy),
    medals: Boolean(input.medals),
    certificate: Boolean(input.certificate),

    // Eligibility
    minAge: input.minAge || '',
    maxAge: input.maxAge || '',
    gender: input.gender || 'Open',
    skillLevel: input.skillLevel || 'Open',

    // Images
    image: input.coverImage || input.image || '',
    coverImage: input.coverImage || '',
    posterImage: input.posterImage || '',

    // Contact
    organizerName: input.organizerName || '',
    contactNumber: input.contactNumber || '',
    contactEmail: input.contactEmail || '',
    whatsappNumber: input.whatsappNumber || '',

    // Capacity aliases the public cards read.
    teamCapacity: numeric(input.maxTeams),
    registeredTeams: existing.registeredTeams || 0,
  };
};

/* ---------- Create ---------- */
export const createTournament = (input, options = {}) => {
  const state = getDemoState();
  state.tournaments = state.tournaments || [];

  const name = String(input.name || '').trim();
  if (!name) return { ok: false, error: 'Tournament name is required.' };
  if (!input.sport) return { ok: false, error: 'Sport is required.' };

  const status = options.publish && input.status !== TOURNAMENT_STATUS.DRAFT
    ? (input.status || TOURNAMENT_STATUS.PUBLISHED)
    : (input.status || TOURNAMENT_STATUS.DRAFT);

  const record = buildRecord({ ...input, status }, {});
  record.status = status;
  record.createdAt = new Date().toISOString();
  record.published = !HIDDEN_STATUSES.includes(status);
  // New tournaments have no registrations / matches / results yet.
  record.teams = [];
  record.bracket = { rounds: [] };

  state.tournaments.push(record);

  recordActivity({
    state,
    type: status === TOURNAMENT_STATUS.DRAFT ? ACTIVITY_TYPES.TOURNAMENT_CREATED : ACTIVITY_TYPES.TOURNAMENT_PUBLISHED,
    actorRole: 'admin',
    actorName: options.actorName || 'Platform Admin',
    message: `${status === TOURNAMENT_STATUS.DRAFT ? 'Tournament created (draft)' : 'Tournament published'}: ${name}`,
    targetPath: '/admin/tournaments',
    meta: { tournamentId: record.id },
  });

  saveDemoState(state);
  return { ok: true, tournament: record };
};

/* ---------- Update ---------- */
export const updateTournament = (id, input, options = {}) => {
  const state = getDemoState();
  const list = state.tournaments || [];
  const index = list.findIndex((item) => item.id === id);
  if (index < 0) return { ok: false, error: 'Only admin-created tournaments can be edited here.', staticTournament: true };

  const existing = list[index];
  const status = options.status || input.status || existing.status;
  const updated = buildRecord(input, existing);
  updated.status = status;
  updated.published = !HIDDEN_STATUSES.includes(status);
  updated.updatedAt = new Date().toISOString();
  list[index] = updated;

  recordActivity({
    state,
    type: ACTIVITY_TYPES.TOURNAMENT_UPDATED,
    actorRole: 'admin',
    actorName: options.actorName || 'Platform Admin',
    message: `Tournament updated: ${updated.name}`,
    targetPath: '/admin/tournaments',
    meta: { tournamentId: id },
  });

  saveDemoState(state);
  return { ok: true, tournament: updated };
};

/* ---------- Status transitions ---------- */
export const setTournamentStatus = (id, status, options = {}) => {
  const state = getDemoState();
  const list = state.tournaments || [];
  const tournament = list.find((item) => item.id === id);
  if (!tournament) {
    // Static catalogue tournaments: only lifecycle overrides on the catalogue are
    // out of scope, so report clearly rather than mutating shared seed data.
    return { ok: false, error: 'Only admin-created tournaments can change status here.', staticTournament: true };
  }

  tournament.status = status;
  tournament.published = !HIDDEN_STATUSES.includes(status);
  tournament.statusUpdatedAt = new Date().toISOString();
  if (status === TOURNAMENT_STATUS.CANCELLED) tournament.cancellationReason = options.reason || '';
  else delete tournament.cancellationReason;
  if (status === TOURNAMENT_STATUS.COMPLETED) tournament.completedAt = new Date().toISOString();

  const typeMap = {
    [TOURNAMENT_STATUS.PUBLISHED]: ACTIVITY_TYPES.TOURNAMENT_PUBLISHED,
    [TOURNAMENT_STATUS.DRAFT]: ACTIVITY_TYPES.TOURNAMENT_UPDATED,
    [TOURNAMENT_STATUS.CANCELLED]: ACTIVITY_TYPES.TOURNAMENT_CANCELLED,
  };
  recordActivity({
    state,
    type: typeMap[status] || ACTIVITY_TYPES.TOURNAMENT_UPDATED,
    actorRole: 'admin',
    actorName: options.actorName || 'Platform Admin',
    message: `Tournament ${tournament.name} → ${status}`,
    targetPath: '/admin/tournaments',
    meta: { tournamentId: id, status },
  });

  saveDemoState(state);
  return { ok: true, tournament };
};

/* ---------- Duplicate ---------- */
// Copies the CONFIGURATION only — never registrations, matches, results or winner.
// `sourceRecord` is passed by the caller from the merged list so static
// catalogue tournaments can be duplicated too.
export const duplicateTournament = (sourceRecord, options = {}) => {
  const state = getDemoState();
  if (!sourceRecord) return { ok: false, error: 'Tournament not found.' };

  const copy = buildRecord({
    ...sourceRecord,
    name: `${sourceRecord.name} (Copy)`,
  }, {});
  copy.id = createId('tournament');
  copy.status = TOURNAMENT_STATUS.DRAFT;   // duplicated tournaments start as draft
  copy.published = false;
  copy.createdAt = new Date().toISOString();
  // Strip competition data from the copy.
  copy.teams = [];
  copy.bracket = { rounds: [] };
  copy.registeredTeams = 0;
  delete copy.winner;
  delete copy.results;
  delete copy.matches;

  state.tournaments = state.tournaments || [];
  state.tournaments.push(copy);

  recordActivity({
    state,
    type: ACTIVITY_TYPES.TOURNAMENT_DUPLICATED,
    actorRole: 'admin',
    actorName: options.actorName || 'Platform Admin',
    message: `Tournament duplicated: ${sourceRecord.name} → ${copy.name}`,
    targetPath: '/admin/tournaments',
    meta: { tournamentId: copy.id, fromId: sourceRecord.id },
  });

  saveDemoState(state);
  return { ok: true, tournament: copy };
};

/* ---------- Delete ---------- */
export const deleteTournament = (id, options = {}) => {
  const state = getDemoState();
  const tournament = (state.tournaments || []).find((item) => item.id === id);
  if (!tournament) return { ok: false, error: 'Only admin-created tournaments can be deleted.', staticTournament: true };

  state.tournaments = state.tournaments.filter((item) => item.id !== id);
  recordActivity({
    state,
    type: ACTIVITY_TYPES.TOURNAMENT_UPDATED,
    actorRole: 'admin',
    actorName: options.actorName || 'Platform Admin',
    message: `Tournament deleted: ${tournament.name}`,
    targetPath: '/admin/tournaments',
    meta: { tournamentId: id },
  });
  saveDemoState(state);
  return { ok: true };
};

// Validate registration/tournament date ordering.
export const validateTournamentDates = (form) => {
  const errors = {};
  const toTime = (value) => (value ? new Date(`${value}T00:00:00`).getTime() : null);
  const regStart = toTime(form.registrationStart);
  const regEnd = toTime(form.registrationEnd);
  const start = toTime(form.startDate);
  const end = toTime(form.endDate);

  if (regStart && regEnd && regEnd < regStart) errors.registrationEnd = 'Registration end must be after registration start.';
  if (start && end && end < start) errors.endDate = 'Tournament end must be after tournament start.';
  if (regEnd && start && start < regEnd) errors.startDate = 'Tournament start must be on or after registration end.';
  if (regStart && start && start < regStart) errors.startDate = 'Tournament start must be after registration start.';
  return errors;
};