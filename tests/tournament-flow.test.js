import test from 'node:test';
import assert from 'node:assert/strict';

const setupLocalStorage = () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
};

setupLocalStorage();

const { resetDemoData, saveDemoState, getDemoState, createDemoPlayerRegistration } = await import('../src/data/demoStore.js');
const { calculateTournamentFee, createTournamentRegistration } = await import('../src/data/adminRegistrations.js');
const { approveRegistration } = await import('../src/data/adminRegistrations.js');
const { createTournament } = await import('../src/data/adminTournaments.js');
const { getAllTournaments } = await import('../src/data/dashboardSelectors.js');

test('per-player fee calculation multiplies the configured amount by participants', () => {
  const total = calculateTournamentFee('₹500 per player', 4, 'Individual');
  assert.equal(total, 2000);
});

test('duplicate tournament registration is blocked for the same player', () => {
  const state = resetDemoData();
  state.registrations = [
    {
      id: 'existing-registration',
      tournamentId: 'vadodara-premier-cup',
      playerId: 'demo-player',
      teamName: 'Dev Shah',
      captain: 'Dev Shah',
      players: ['Dev Shah'],
      status: 'pending',
      paymentStatus: 'pending',
      registeredAt: new Date().toISOString(),
      totalFee: 500,
    },
  ];
  saveDemoState(state);

  const result = createTournamentRegistration({
    tournamentId: 'vadodara-premier-cup',
    playerId: 'demo-player',
    playerName: 'Dev Shah',
    email: 'dev.player@demo.com',
    mobile: '9876543210',
    teamName: 'Dev Shah',
    registrationType: 'Individual',
    participantCount: 1,
    entryFee: '₹500 per player',
  });

  assert.equal(result.ok, false);
  assert.match(String(result.error), /already registered|duplicate/i);
});

test('demo registration creates a player and dashboard session when the backend is unavailable', () => {
  const state = resetDemoData();

  const result = createDemoPlayerRegistration(state, {
    firstName: 'Aarav',
    surname: 'Patel',
    dob: '2010-06-15',
    mobile: '9988776655',
    email: 'aarav.player@demo.com',
    password: 'demo123',
    house: '21',
    street: 'Nizampura',
    landmark: 'Near park',
    pincode: '390002',
    sports: ['Cricket'],
    selectedTurfIds: ['united-sports-arena'],
  });

  assert.equal(result.ok, true);
  assert.equal(result.session.role, 'player');
  assert.equal(result.player.email, 'aarav.player@demo.com');
  assert.ok(state.players.some((player) => player.email === 'aarav.player@demo.com'));
});

test('individual tournaments use maximum players as the published capacity', () => {
  resetDemoData();

  const result = createTournament({
    name: 'Individual Capacity Test',
    sport: 'Cricket',
    registrationType: 'Individual',
    maxPlayers: 32,
    maxTeams: 8,
  }, { publish: true });

  assert.equal(result.ok, true);
  assert.equal(result.tournament.teamCapacity, 32);
  assert.match(result.tournament.image, /images\.unsplash\.com/);
});

test('default tournament registration fee is ₹200 per player', () => {
  resetDemoData();
  const tournament = createTournament({
    name: 'Default Fee Test',
    sport: 'Cricket',
    registrationType: 'Individual',
    maxPlayers: 5,
  }, { publish: true }).tournament;

  const result = createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'fee-test-player',
    playerName: 'Fee Test Player',
    registrationType: 'Individual',
  });

  assert.equal(result.registration.entryFee, '₹200 per player');
  assert.equal(result.registration.totalFee, 200);
});

test('admin cannot approve a registration with unverified payment', () => {
  resetDemoData();
  const created = createTournamentRegistration({
    tournamentId: 'vadodara-premier-cup',
    playerId: 'demo-player',
    playerName: 'Dev Shah',
    teamName: 'Dev Shah',
    registrationType: 'Individual',
    entryFee: '₹500 per player',
  });

  assert.equal(created.ok, true);
  const result = approveRegistration(created.registration.id);

  assert.equal(result.ok, false);
  assert.match(result.error, /payment must be verified/i);
  const persisted = getDemoState().registrations.find((item) => item.id === created.registration.id);
  assert.equal(persisted.status, 'pending');
  assert.equal(persisted.paymentStatus, 'pending');
});

test('pending individual registrations reserve capacity and block excess players', () => {
  resetDemoData();
  const tournament = createTournament({
    name: 'Player Slot Limit Test',
    sport: 'Cricket',
    registrationType: 'Individual',
    maxPlayers: 2,
    entryFee: '₹500 per player',
  }, { publish: true }).tournament;

  const first = createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'player-one',
    playerName: 'Player One',
    participantCount: 2,
    registrationType: 'Individual',
    entryFee: '₹500 per player',
  });
  const second = createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'player-two',
    playerName: 'Player Two',
    participantCount: 1,
    registrationType: 'Individual',
    entryFee: '₹500 per player',
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.match(second.error, /only 0 registration slot/i);
  assert.equal(getAllTournaments().find((item) => item.id === tournament.id).registeredTeams, 2);
});
