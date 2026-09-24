import { tournaments } from './tournaments';
import { turfs } from './homeData';

const STORAGE_KEY = 'vadodara-sports-demo-store-v1';
const SESSION_KEY = 'vadodara-sports-session-v1';
export const BOOKING_STORAGE_KEY = 'vadodara-sports-bookings-v1';

const ownerIds = turfs.reduce((owners, turf, index) => {
  owners[turf.id] = `owner-${index + 1}`;
  return owners;
}, {});

// Canonical account roles. Player and Turf Owner accounts are created through the
// public registration flows; Admin accounts are provisioned here (never publicly).
export const ROLES = {
  PLAYER: 'player',
  TURF_OWNER: 'turf-owner',
  ADMIN: 'admin',
};

// Roles a user may pick on the login screen.
export const LOGIN_ROLES = [
  { value: ROLES.PLAYER, label: 'Player' },
  { value: ROLES.TURF_OWNER, label: 'Turf Owner' },
  { value: ROLES.ADMIN, label: 'Admin' },
];

const createOwners = () => turfs.map((turf) => ({
  id: ownerIds[turf.id],
  role: ROLES.TURF_OWNER,
  name: `${turf.name} Owner`,
  email: `${turf.id}@owner.demo`,
  password: 'owner123',
  turfIds: [turf.id],
}));

// Admin accounts are provisioned through configuration, NOT public registration.
const createAdmins = () => ([{
  id: 'admin-root',
  role: ROLES.ADMIN,
  name: 'Platform Admin',
  email: 'admin@clift.demo',
  password: 'admin123',
}]);

const seedState = () => ({
  registeredTurfs: [],
  teams: [],
  registrations: [
    {
      id: 'registration-seeded-1',
      tournamentId: 'vadodara-premier-cup',
      teamName: 'Alkapuri Knights',
      captain: 'Vikram Singh',
      players: ['Vikram Singh', 'Amit Rana', 'Sahil Khan', 'Jay Patel'],
      registeredAt: '2026-09-14T10:30:00.000Z',
      entryFee: '₹2,500',
      status: 'pending',
    },
    {
      id: 'registration-seeded-2',
      tournamentId: 'city-league-invitational',
      teamName: 'Manjalpur FC',
      captain: 'Karan Shah',
      players: ['Karan Shah', 'Rishi Mehta', 'Dev Parmar'],
      registeredAt: '2026-09-12T08:15:00.000Z',
      entryFee: '₹1,800',
      status: 'pending',
    },
    {
      id: 'registration-seeded-3',
      tournamentId: 'vmc-pickleball-challenge',
      teamName: 'Rally Rebels',
      captain: 'Ananya Desai',
      players: ['Ananya Desai', 'Maya Joshi'],
      registeredAt: '2026-09-10T14:45:00.000Z',
      entryFee: '₹1,200',
      status: 'approved',
    },
  ],
  availability: [],
  admins: createAdmins(),
  platformSettings: {
    platformName: 'CLIFT',
    contactEmail: 'hello@clift.demo',
    contactPhone: '',
    location: 'Vadodara, Gujarat',
    tournament: {
      registrationType: 'Team',
      defaultFormat: 'Knockout',
      defaultTeamCapacity: 8,
      defaultRegistrationOpen: true,
    },
  },
  players: [
    {
      id: 'demo-player',
      role: 'player',
      firstName: 'Dev',
      surname: 'Shah',
      dob: '2001-05-15',
      age: 25,
      mobile: '9876543210',
      email: 'dev.player@demo.com',
      password: 'demo123',
      house: '12',
      street: 'Alkapuri',
      landmark: 'Near Central Mall',
      city: 'Vadodara',
      state: 'Gujarat',
      pincode: '390007',
      profileImage: '',
      sportId: 'Cricket',
      selectedTurfId: 'united-sports-arena',
      createdAt: '2026-09-01T09:00:00.000Z',
    },
    {
      id: 'demo-player-2',
      role: 'player',
      firstName: 'Nisha',
      surname: 'Patel',
      dob: '2002-08-21',
      age: 24,
      mobile: '9876543211',
      email: 'nisha.player@demo.com',
      password: 'demo123',
      house: '8',
      street: 'Karelibaug',
      landmark: '',
      city: 'Vadodara',
      state: 'Gujarat',
      pincode: '390018',
      profileImage: '',
      sportId: 'Pickleball',
      selectedTurfId: 'huddle-arena',
      createdAt: '2026-09-02T09:00:00.000Z',
    },
  ],
  owners: createOwners(),
  requests: [
    {
      id: 'request-seeded-accepted',
      type: 'PLAYER_TURF_JOIN',
      playerId: 'demo-player',
      turfId: 'united-sports-arena',
      ownerId: ownerIds['united-sports-arena'],
      sportId: 'Cricket',
      status: 'accepted',
      createdAt: '2026-09-03T10:00:00.000Z',
      respondedAt: '2026-09-04T10:00:00.000Z',
    },
    {
      id: 'request-seeded-rejected',
      type: 'PLAYER_TURF_JOIN',
      playerId: 'demo-player-2',
      turfId: 'athletes-arena',
      ownerId: ownerIds['athletes-arena'],
      sportId: 'Pickleball',
      status: 'rejected',
      createdAt: '2026-09-04T10:00:00.000Z',
      respondedAt: '2026-09-05T10:00:00.000Z',
    },
  ],
  matches: [
    {
      id: 'match-cricket-upcoming',
      sportId: 'Cricket',
      tournamentId: 'vadodara-premier-cup',
      turfId: 'united-sports-arena',
      teams: ['Baroda Strikers', 'City Warriors'],
      date: '18 OCT 2026',
      time: '7:00 PM',
      status: 'upcoming',
    },
    {
      id: 'match-cricket-live',
      sportId: 'Cricket',
      tournamentId: 'vadodara-premier-cup',
      turfId: 'the-turf-terra',
      teams: ['Vadodara Titans', 'United XI'],
      date: 'TODAY',
      time: '6:30 PM',
      status: 'live',
      phase: '2nd Innings',
    },
    {
      id: 'match-football-upcoming',
      sportId: 'Football',
      tournamentId: 'city-league-invitational',
      turfId: 'the-turf-terra',
      teams: ['City Warriors', 'Baroda United'],
      date: '25 OCT 2026',
      time: '8:00 PM',
      status: 'upcoming',
    },
    {
      id: 'match-pickleball-upcoming',
      sportId: 'Pickleball',
      tournamentId: 'vmc-pickleball-challenge',
      turfId: 'huddle-arena',
      teams: ['City Paddlers', 'Huddle Pair A'],
      date: '02 NOV 2026',
      time: '6:00 PM',
      status: 'upcoming',
    },
  ],
});

const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};

const migrateState = (stored) => {
  const defaults = seedState();
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    admins: Array.isArray(stored.admins) && stored.admins.length ? stored.admins : defaults.admins,
    platformSettings: {
      ...defaults.platformSettings,
      ...(stored.platformSettings || {}),
      tournament: { ...defaults.platformSettings.tournament, ...(stored.platformSettings?.tournament || {}) },
    },
  };
};

export const getDemoState = () => migrateState(readJson(STORAGE_KEY));

export const saveDemoState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    return false;
  }
  return true;
};

export const getBookings = () => readJson(BOOKING_STORAGE_KEY) || [];

export const saveBookings = (bookings) => {
  try {
    localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(bookings));
  } catch {
    return false;
  }
  return true;
};

export const getSession = () => readJson(SESSION_KEY);

const GENERIC_LOGIN_ERROR = 'Invalid email, password, or selected account type.';

// Resolve every account of a given role to a uniform shape used for auth checks.
const accountsByRole = (state, role) => {
  if (role === ROLES.PLAYER) {
    return (state.players || []).map((player) => ({
      id: player.id,
      role: ROLES.PLAYER,
      email: player.email,
      password: player.password,
      active: player.active !== false,
    }));
  }
  if (role === ROLES.TURF_OWNER) {
    return (state.owners || []).map((owner) => ({
      id: owner.id,
      role: ROLES.TURF_OWNER,
      email: owner.email,
      password: owner.password,
      active: owner.active !== false,
      turfIds: owner.turfIds || [],
    }));
  }
  if (role === ROLES.ADMIN) {
    return (state.admins || []).map((admin) => ({
      id: admin.id,
      role: ROLES.ADMIN,
      email: admin.email,
      password: admin.password,
      active: admin.active !== false,
    }));
  }
  return [];
};

/**
 * Authenticate a set of credentials against a specific role.
 *
 * is the single authorization choke point: it verifies the account exists,
 * the password matches AND the account's stored role equals the requested role.
 * A valid Player login attempted as "Turf Owner" (or any other mismatch) fails,
 * and every failure returns the same generic message so callers can never learn
 * whether the email exists or which role it belongs to.
 *
 * @returns {{ ok: true, session: object } | { ok: false, error: string }}
 */
export const authenticateUser = (requestedRole, email, password) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password || !requestedRole) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  const state = getDemoState();
  const account = accountsByRole(state, requestedRole).find(
    (candidate) => String(candidate.email || '').trim().toLowerCase() === normalizedEmail
      && candidate.password === password
  );

  // The account must exist, be active, and its stored role must match the
  // requested role (guaranteed here because we only searched that role's set).
  if (!account || !account.active) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  const session = {
    userId: account.id,
    role: account.role,
    email: account.email,
    issuedAt: new Date().toISOString(),
  };
  if (account.role === ROLES.TURF_OWNER) session.turfId = account.turfIds?.[0];

  setSession(session);
  return { ok: true, session };
};

// Role → dashboard route. Used for redirects and cross-role access denial.
export const dashboardPathForRole = (role) => {
  if (role === ROLES.PLAYER) return '/player/dashboard';
  if (role === ROLES.TURF_OWNER) return '/turf-owner/dashboard';
  if (role === ROLES.ADMIN) return '/admin/dashboard';
  return '/login';
};

// ---------------------------------------------------------------------------
// Admin authorization
// ---------------------------------------------------------------------------
// The Admin Portal does NOT share the public login screen: admins authenticate
// through a dedicated entry point and are never offered a self-service role
// picker. This keeps the demo behaviour symmetrical with a future backend where
// an admin staff endpoint would be separate from the public player/owner one.
//
export const ADMIN_LOGIN_PATH = '/admin/login';

/**
 * Authenticate an admin from the dedicated Admin Portal.
 *
 * Unlike `authenticateUser`, the role is fixed (never taken from the caller),
 * so an admin session can only ever be minted for the ADMIN role. This is the
 * demo stand-in for a backend staff-auth endpoint and can be replaced later
 * without touching the routing or UI layers.
 *
 * @returns {{ ok: true, session: object } | { ok: false, error: string }}
 */
export const authenticateAdmin = (email, password) => {
  const result = authenticateUser(ROLES.ADMIN, email, password);
  if (!result.ok) {
    // Surface a clearer message for the staff portal without leaking whether
    // the email exists (the underlying check already returns a generic error).
    return { ok: false, error: 'Invalid admin credentials. Please try again.' };
  }
  return result;
};

/**
 * Frontend route guard for every /admin/* location.
 *
 * A location is only accessible when a session exists AND its stored role is
 * ADMIN. Players and turf owners are rejected here even if they somehow reach
 * an admin URL directly, because protection is decided by the session role —
 * not by which sidebar links happen to be rendered.
 *
 * @returns {{ allowed: boolean, reason: 'ok' | 'guest' | 'wrong-role', session: object|null }}
 */
export const checkAdminAccess = (session = getSession()) => {
  if (!session) return { allowed: false, reason: 'guest', session: null };
  if (session.role !== ROLES.ADMIN) return { allowed: false, reason: 'wrong-role', session };
  return { allowed: true, reason: 'ok', session };
};

export const setSession = (session) => {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    return false;
  }
  return true;
};

export const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const getTurfOwnerId = (turfId) => ownerIds[turfId] || 'registered-owner';

export const getRegisteredTurfs = () => getDemoState().registeredTurfs || [];

export const getPlayers = () => getDemoState().players || [];
export const getTurfOwners = () => getDemoState().owners || [];
export const getTeams = () => getDemoState().teams || [];
export const getRegistrations = () => getDemoState().registrations || [];
export const getMatches = () => getDemoState().matches || [];

export const normalizeTurf = (turf = {}) => ({
  ...turf,
  name: turf.name || turf.turfName || 'Sports Turf',
  area: turf.area || turf.turfAddress?.area || turf.location || 'Vadodara',
  address: turf.address || turf.location || turf.turfAddress?.area || 'Vadodara',
  city: turf.city || turf.turfAddress?.city || 'Vadodara',
  sports: Array.isArray(turf.sports) && turf.sports.length ? turf.sports : (Array.isArray(turf.games) ? turf.games : []),
  facilities: Array.isArray(turf.facilities) ? turf.facilities : [],
});

export const getAllTurfs = () => [...turfs, ...getRegisteredTurfs()].map(normalizeTurf);

export const getTurf = (turfId) => getAllTurfs().find((turf) => turf.id === turfId) || null;

export const getTournament = (tournamentId) => [...tournaments, ...(getDemoState().tournaments || [])].find((tournament) => tournament.id === tournamentId) || null;

export const calculateAge = (dob) => {
  if (!dob) return '';
  const today = new Date();
  const birthDate = new Date(`${dob}T00:00:00`);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? age : '';
};

export const normalizePlayerKey = (value) => value.trim().toLowerCase().replace(/\s+/g, ' ');

export const findDuplicatePlayer = (state, form) => state.players.find((player) => (
  normalizePlayerKey(player.firstName) === normalizePlayerKey(form.firstName)
  && normalizePlayerKey(player.surname) === normalizePlayerKey(form.surname)
  && player.dob === form.dob
));

export const findDuplicateContact = (state, form) => state.players.find((player) => (
  player.mobile === form.mobile || String(player.email || '').toLowerCase() === form.email.trim().toLowerCase()
));

export const resetDemoData = () => {
  const state = seedState();
  // Admins are re-seeded but never wiped from a running store.
  state.admins = state.admins || createAdmins();
  saveDemoState(state);
  setSession(null);
  return state;
};
