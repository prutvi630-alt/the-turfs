import { tournaments } from './tournaments';
import { turfs } from './homeData';

const STORAGE_KEY = 'vadodara-sports-demo-store-v1';
const SESSION_KEY = 'vadodara-sports-session-v1';
export const BOOKING_STORAGE_KEY = 'vadodara-sports-bookings-v1';

const ownerIds = turfs.reduce((owners, turf, index) => {
  owners[turf.id] = `owner-${index + 1}`;
  return owners;
}, {});

const createOwners = () => turfs.map((turf) => ({
  id: ownerIds[turf.id],
  role: 'turf-owner',
  name: `${turf.name} Owner`,
  email: `${turf.id}@owner.demo`,
  password: 'owner123',
  turfIds: [turf.id],
}));

const seedState = () => ({
  registeredTurfs: [],
  teams: [],
  availability: [],
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

export const getDemoState = () => readJson(STORAGE_KEY) || seedState();

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

export const getAllTurfs = () => [...turfs, ...getRegisteredTurfs()];

export const getTurf = (turfId) => getAllTurfs().find((turf) => turf.id === turfId) || null;

export const getTournament = (tournamentId) => tournaments.find((tournament) => tournament.id === tournamentId);

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
  player.mobile === form.mobile || player.email.toLowerCase() === form.email.trim().toLowerCase()
));

export const resetDemoData = () => {
  const state = seedState();
  saveDemoState(state);
  setSession(null);
  return state;
};
