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

const { resetDemoData, saveDemoState, getDemoState, createDemoPlayerRegistration, createDemoStaffRegistration, updateStaffBankDetails, authenticateUser, dashboardPathForRole, LOGIN_ROLES, ROLES } = await import('../src/data/demoStore.js');
const { calculateTournamentFee, createTournamentRegistration, getTournamentSlotAvailability, isTournamentRegistrationOpen } = await import('../src/data/adminRegistrations.js');
const { approveRegistration } = await import('../src/data/adminRegistrations.js');
const { createTournament, updateTournament, validateTournamentDates } = await import('../src/data/adminTournaments.js');
const { getConfiguredTournamentFeeAmount, formatTournamentFee } = await import('../src/data/tournamentFees.js');
const { deleteOwnerTeam, deletePlayerTeam, saveOwnerTeam, savePlayerTeam } = await import('../src/data/ownerTeams.js');
const { getAllTournaments, isTournamentInterestActive } = await import('../src/data/dashboardSelectors.js');
const { getPlayerInterestedTournamentIds, savePlayerTournamentInterest } = await import('../src/data/tournamentInterest.js');
const { maskBankAccountNumber, normalizeStaffBankDetails } = await import('../src/data/staffBankDetails.js');

const validBankDetails = {
  bankName: 'State Bank of India',
  accountHolderName: 'Aman Shah',
  accountNumber: '123456789012',
  ifscCode: 'sbin0001234',
  mobileNumber: '9876543210',
};

test('bank detail validation normalizes IFSC and rejects invalid account, IFSC, and mobile values', () => {
  const valid = normalizeStaffBankDetails(validBankDetails);
  assert.equal(valid.valid, true);
  assert.equal(valid.bankDetails.ifscCode, 'SBIN0001234');
  assert.equal(valid.bankDetails.accountNumber, '123456789012');
  assert.equal(maskBankAccountNumber(valid.bankDetails.accountNumber), 'XXXXXXXX 9012');
  assert.equal(normalizeStaffBankDetails({ ...validBankDetails, accountNumber: '12ab' }).valid, false);
  assert.ok(normalizeStaffBankDetails({ ...validBankDetails, ifscCode: 'INVALID' }).errors.ifscCode);
  assert.ok(normalizeStaffBankDetails({ ...validBankDetails, mobileNumber: '1234567890' }).errors.mobileNumber);
  assert.ok(normalizeStaffBankDetails({ ...validBankDetails, bankName: '' }).errors.bankName);
});

test('Coach and Scorer registrations persist their separate bank details and authenticate', () => {
  const state = resetDemoData();
  const coach = createDemoStaffRegistration(state, {
    fullName: 'Casey Coach',
    mobile: '9988776601',
    email: 'casey.coach@example.com',
    address: '12 Sports Road, Vadodara',
    experience: '5',
    sports: ['Football'],
    password: 'coach123',
    bankDetails: validBankDetails,
  }, ROLES.COACH);
  const scorer = createDemoStaffRegistration(state, {
    fullName: 'Sam Scorer',
    mobile: '9988776602',
    email: 'sam.scorer@example.com',
    address: '18 Stadium Road, Vadodara',
    experience: '3',
    sports: ['Cricket'],
    password: 'scorer123',
    bankDetails: { ...validBankDetails, bankName: 'HDFC Bank', accountHolderName: 'Sam Scorer', accountNumber: '876543210123' },
  }, ROLES.SCORER);

  assert.equal(coach.ok, true);
  assert.equal(scorer.ok, true);
  assert.equal(coach.profile.bankDetails.ifscCode, 'SBIN0001234');
  assert.equal(scorer.profile.bankDetails.bankName, 'HDFC Bank');
  saveDemoState(state);
  assert.equal(authenticateUser(ROLES.COACH, 'casey.coach@example.com', 'coach123').ok, true);
  assert.equal(authenticateUser(ROLES.SCORER, 'sam.scorer@example.com', 'scorer123').ok, true);
  assert.equal(createDemoStaffRegistration(state, {
    fullName: 'Invalid Coach',
    mobile: '9988776699',
    email: 'invalid.coach@example.com',
    address: 'Vadodara',
    experience: '1',
    sports: ['Football'],
    password: 'coach123',
    bankDetails: { ...validBankDetails, ifscCode: 'BAD' },
  }, ROLES.COACH).ok, false);
});

test('staff bank updates are scoped to the matching profile and role', () => {
  const state = resetDemoData();
  const coach = state.coaches[0];
  const scorer = state.scorers[0];
  const coachUpdate = updateStaffBankDetails(state, coach.id, ROLES.COACH, validBankDetails);
  assert.equal(coachUpdate.ok, true);
  assert.equal(coachUpdate.profile.id, coach.id);
  saveDemoState(state);
  assert.equal(getDemoState().coaches.find((account) => account.id === coach.id).bankDetails.ifscCode, 'SBIN0001234');
  assert.equal(state.scorers.find((account) => account.id === scorer.id).bankDetails, undefined);
  assert.equal(updateStaffBankDetails(state, scorer.id, ROLES.COACH, validBankDetails).ok, false);
  assert.equal(updateStaffBankDetails(state, coach.id, ROLES.SCORER, validBankDetails).ok, false);
});

test('player tournament interest persists a canonical record and ignores duplicates', () => {
  resetDemoData();
  const result = savePlayerTournamentInterest('demo-player', 'vadodara-premier-cup', new Date('2026-10-07T09:00:00.000Z'));

  assert.equal(result.ok, true);
  assert.equal(result.duplicate, false);
  assert.deepEqual(getPlayerInterestedTournamentIds(result.player), ['vadodara-premier-cup']);
  assert.deepEqual(result.player.interestedTournamentRecords, [{
    tournamentId: 'vadodara-premier-cup',
    playerId: 'demo-player',
    savedAt: '2026-10-07T09:00:00.000Z',
    status: 'active',
  }]);

  const duplicate = savePlayerTournamentInterest('demo-player', 'vadodara-premier-cup');
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(getDemoState().players[0].interestedTournamentRecords.length, 1);
});

test('invalid, missing, and expired player tournament interests are rejected', () => {
  resetDemoData();
  assert.equal(savePlayerTournamentInterest('', 'vadodara-premier-cup').ok, false);
  assert.equal(savePlayerTournamentInterest('demo-player', '').ok, false);
  assert.equal(savePlayerTournamentInterest('missing-player', 'vadodara-premier-cup').ok, false);
  assert.equal(savePlayerTournamentInterest('demo-player', 'not-a-tournament').ok, false);
  assert.equal(savePlayerTournamentInterest('demo-player', 'vadodara-premier-cup', new Date('2026-10-19T00:00:00.000Z')).ok, false);
});

test('player tournament interest reports storage failures without persisting success', () => {
  resetDemoData();
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('storage unavailable'); };

  try {
    const result = savePlayerTournamentInterest('demo-player', 'vadodara-premier-cup');
    assert.equal(result.ok, false);
    assert.match(result.error, /unable to save/i);
    assert.equal(getPlayerInterestedTournamentIds(getDemoState().players[0]).includes('vadodara-premier-cup'), false);
  } finally {
    localStorage.setItem = originalSetItem;
  }
});

test('individual registration fee is free while team registration uses its configured fee', () => {
  assert.equal(calculateTournamentFee('₹2,500 per team', 4, 'Individual'), 0);
  assert.equal(calculateTournamentFee('₹2,500 per team', 4, 'Team'), 2500);
  assert.equal(calculateTournamentFee('₹3,000 per team', 1, 'Team'), 3000);
});

test('interested tournament activity respects inclusive registration deadlines and inactive statuses', () => {
  const today = new Date('2026-10-06T12:00:00');
  assert.equal(isTournamentInterestActive({ id: 'open', registrationEnd: '2026-10-06', status: 'Registration Open' }, today), true);
  assert.equal(isTournamentInterestActive({ id: 'expired', registrationEnd: '2026-10-05', status: 'Registration Open' }, today), false);
  assert.equal(isTournamentInterestActive({ id: 'cancelled', date: '2026-10-20', status: 'Cancelled' }, today), false);
  assert.equal(isTournamentInterestActive({ date: '2026-10-20', status: 'Upcoming' }, today), false);
});

test('duplicate tournament registration is blocked for the same player', async () => {
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

  const result = await createTournamentRegistration({
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

test('Coach and Scorer profiles are stored, role-authenticated, and never allow public Admin registration', () => {
  const state = resetDemoData();
  const coach = createDemoStaffRegistration(state, {
    fullName: 'Casey Coach',
    mobile: '9988776601',
    email: 'casey.coach@example.com',
    address: '12 Sports Road, Vadodara',
    experience: '5',
    sport: 'Football',
    password: 'coach123',
    bankDetails: validBankDetails,
  }, ROLES.COACH);
  const scorer = createDemoStaffRegistration(state, {
    fullName: 'Sam Scorer',
    mobile: '9988776602',
    email: 'sam.scorer@example.com',
    address: '18 Stadium Road, Vadodara',
    experience: '3',
    sport: 'Basketball',
    password: 'scorer123',
    bankDetails: { ...validBankDetails, bankName: 'HDFC Bank', accountHolderName: 'Sam Scorer', accountNumber: '876543210123' },
  }, ROLES.SCORER);

  assert.equal(coach.ok, true);
  assert.equal(scorer.ok, true);
  assert.equal(coach.profile.registrationType, 'coach');
  assert.equal(scorer.profile.registrationType, 'scorer');
  assert.equal(coach.profile.sport, 'Football');
  assert.equal(scorer.profile.sport, 'Basketball');
  assert.equal(createDemoStaffRegistration(state, {}, ROLES.ADMIN).ok, false);
  saveDemoState(state);

  assert.equal(authenticateUser(ROLES.COACH, 'casey.coach@example.com', 'coach123').session.role, ROLES.COACH);
  assert.equal(authenticateUser(ROLES.SCORER, 'sam.scorer@example.com', 'scorer123').session.role, ROLES.SCORER);
  assert.equal(authenticateUser(ROLES.COACH, 'sam.scorer@example.com', 'scorer123').ok, false);
  assert.equal(dashboardPathForRole(ROLES.COACH), '/coach/profile');
  assert.equal(dashboardPathForRole(ROLES.SCORER), '/scorer/profile');
  assert.deepEqual(LOGIN_ROLES.map((role) => role.label), ['Player', 'Turf', 'Scorer', 'Coach', 'Admin']);
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

test('individual tournament registration ignores the configured team fee', async () => {
  resetDemoData();
  const tournament = createTournament({
    name: 'Fixed Player Fee Test',
    sport: 'Cricket',
    registrationType: 'Individual',
    maxPlayers: 5,
    entryFee: '₹2,500 per team',
  }, { publish: true }).tournament;
  const slot = getTournamentSlotAvailability(tournament.id).slots.find((item) => item.available);

  const result = await createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'fee-test-player',
    playerName: 'Fee Test Player',
    registrationType: 'Team',
    entryFee: '₹9,999 per team',
    slotNumber: slot.slotNumber,
  });

  assert.equal(result.ok, true);
  assert.equal(result.registration.registrationType, 'Individual');
  assert.equal(result.registration.entryFee, '₹0 per player');
  assert.equal(result.registration.totalFee, 0);
});

test('team registration uses the tournament fee and reserves only a selected available slot', async () => {
  resetDemoData();
  const tournament = createTournament({
    name: 'Configured Team Fee Test',
    sport: 'Cricket',
    registrationType: 'Team',
    maxTeams: 2,
    entryFee: '₹2,500 per team',
  }, { publish: true }).tournament;
  const firstSlot = getTournamentSlotAvailability(tournament.id).slots.find((item) => item.available);

  const missingSlot = await createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'team-player-one',
    playerName: 'Team Player One',
    teamName: 'Configured Team',
  });
  assert.equal(missingSlot.ok, false);
  assert.match(missingSlot.error, /select an available slot/i);

  const first = await createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'team-player-one',
    playerName: 'Team Player One',
    teamName: 'Configured Team',
    registrationType: 'Individual',
    entryFee: '₹0 per player',
    slotNumber: firstSlot.slotNumber,
  });
  assert.equal(first.ok, true);
  assert.equal(first.registration.registrationType, 'Team');
  assert.equal(first.registration.totalFee, 2500);
  assert.equal(first.registration.entryFee, '₹2,500 per team');
  assert.equal(first.registration.slotNumber, firstSlot.slotNumber);

  const availability = getTournamentSlotAvailability(tournament.id);
  assert.equal(availability.availableCount, 1);
  assert.equal(availability.slots[firstSlot.slotNumber - 1].status, 'occupied');

  const staleSlot = await createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'team-player-two',
    playerName: 'Team Player Two',
    teamName: 'Another Team',
    slotNumber: firstSlot.slotNumber,
  });
  assert.equal(staleSlot.ok, false);
  assert.match(staleSlot.error, /no longer available/i);
});

test('team tournament fees are positive, per-tournament, editable, and persistent', () => {
  resetDemoData();

  assert.equal(createTournament({
    name: 'Missing Fee Team Cup',
    sport: 'Cricket',
    registrationType: 'Team',
  }, { publish: true }).ok, false);
  assert.equal(createTournament({
    name: 'Zero Fee Team Cup',
    sport: 'Cricket',
    registrationType: 'Team',
    entryFee: '0',
  }, { publish: true }).ok, false);

  const first = createTournament({
    name: 'First Fee Cup',
    sport: 'Cricket',
    registrationType: 'Team',
    entryFee: '1250.50',
  }, { publish: true });
  const second = createTournament({
    name: 'Second Fee Cup',
    sport: 'Football',
    registrationType: 'Team',
    entryFee: '2500',
  }, { publish: true });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);

  const updated = updateTournament(first.tournament.id, {
    ...first.tournament,
    entryFee: '875.25',
  }, { status: 'Published' });
  assert.equal(updated.ok, true);
  assert.equal(getDemoState().tournaments.find((item) => item.id === first.tournament.id).entryFee, '875.25');
  assert.equal(getDemoState().tournaments.find((item) => item.id === second.tournament.id).entryFee, '2500');
  assert.equal(getConfiguredTournamentFeeAmount('₹1,250.50 per team'), 1250.5);
  assert.equal(getConfiguredTournamentFeeAmount('0'), null);
  assert.equal(getConfiguredTournamentFeeAmount('invalid'), null);
  assert.equal(formatTournamentFee('875.25'), '₹875.25');
});

test('team registration rejects an unconfigured legacy fee and ignores submitted fee values', async () => {
  resetDemoData();
  const legacyResult = await createTournamentRegistration({
    tournamentId: 'vadodara-premier-cup',
    playerId: 'fee-test-player',
    playerName: 'Fee Test Player',
    teamName: 'Legacy Team',
    slotNumber: 1,
    entryFee: '₹0',
    totalFee: 0,
  });
  assert.equal(legacyResult.ok, false);
  assert.match(legacyResult.error, /fee configured/i);

  const tournament = createTournament({
    name: 'Trusted Fee Cup',
    sport: 'Cricket',
    registrationType: 'Team',
    maxTeams: 2,
    entryFee: '₹1,250.50 per team',
  }, { publish: true }).tournament;
  const slotNumber = getTournamentSlotAvailability(tournament.id).slots.find((slot) => slot.available).slotNumber;
  const result = await createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'fee-test-player',
    playerName: 'Fee Test Player',
    teamName: 'Trusted Team',
    slotNumber,
    entryFee: '₹0',
    totalFee: 0,
  });
  assert.equal(result.ok, true);
  assert.equal(result.registration.totalFee, 1250.5);
  assert.equal(result.registration.entryFee, '₹1,250.50 per team');
});

test('owner team records validate game, members, captain count, uniqueness, and ownership', () => {
  const state = resetDemoData();
  const owner = state.owners[0];
  const turfId = owner.turfIds[0];
  const values = {
    name: 'Northside XI',
    sport: 'Cricket',
    description: 'Weekend cricket team',
    members: [{
      id: 'northside-captain',
      name: 'Ravi Patel',
      mobile: '9876543210',
      age: 27,
      email: 'ravi.patel@example.com',
      role: 'Captain',
    }],
  };

  const saved = saveOwnerTeam({ ownerId: owner.id, turfId, values });
  assert.equal(saved.ok, true);
  assert.equal(saved.team.captain, 'Ravi Patel');
  assert.equal(getDemoState().teams.some((team) => team.id === saved.team.id), true);
  assert.equal(saveOwnerTeam({ ownerId: owner.id, turfId, values }).ok, false);
  assert.equal(saveOwnerTeam({ ownerId: owner.id, turfId: 'another-owner-turf', values }).ok, false);
  assert.equal(saveOwnerTeam({
    ownerId: owner.id,
    turfId,
    values: { ...values, name: 'Two Captains', members: [...values.members, {
      ...values.members[0],
      id: 'second-captain',
      mobile: '9876543211',
      email: 'second.captain@example.com',
    }] },
  }).ok, false);
  assert.equal(saveOwnerTeam({ ownerId: owner.id, turfId, values: { ...values, sport: 'Unconfigured Game' } }).ok, false);
});

test('player teams are account-scoped and persist roster and optional captain bank details', () => {
  const state = resetDemoData();
  const values = {
    name: 'Player-owned XI',
    sport: 'Cricket',
    members: [{
      id: 'player-team-captain',
      name: 'Dev Shah',
      mobile: '9876543210',
      age: 25,
      email: 'dev.team@example.com',
      role: 'Captain',
    }],
    captainBankDetails: {
      bankName: 'State Bank of India',
      accountNumber: '001234567890',
      ifscCode: 'sbin0001234',
    },
  };
  const created = savePlayerTeam({ playerId: 'demo-player', values });
  assert.equal(created.ok, true);
  assert.equal(created.team.ownerId, null);
  assert.equal(created.team.captainDetails.bankDetails.accountNumber, '001234567890');
  assert.equal(created.team.captainDetails.bankDetails.ifscCode, 'SBIN0001234');
  assert.equal(getDemoState().teams.some((team) => team.id === created.team.id), true);
  assert.equal(savePlayerTeam({ playerId: 'another-player', teamId: created.team.id, values }).ok, false);
  assert.equal(savePlayerTeam({ playerId: 'demo-player', values: { ...values, name: 'Other', captainBankDetails: { ...values.captainBankDetails, ifscCode: 'invalid' } } }).ok, false);

  const updated = savePlayerTeam({
    playerId: 'demo-player',
    teamId: created.team.id,
    values: { ...values, name: 'Player-owned XI Updated', captainBankDetails: { ...values.captainBankDetails, accountNumber: '000987654321' } },
  });
  assert.equal(updated.ok, true);
  const reloaded = getDemoState().teams.find((team) => team.id === created.team.id);
  assert.equal(reloaded.name, 'Player-owned XI Updated');
  assert.equal(reloaded.captainDetails.bankDetails.accountNumber, '000987654321');
  assert.equal(deletePlayerTeam({ playerId: 'another-player', teamId: created.team.id }).ok, false);
  assert.equal(deletePlayerTeam({ playerId: 'demo-player', teamId: created.team.id }).ok, true);
});

test('captain bank details are optional, validated, and persist across team edits and reloads', () => {
  const state = resetDemoData();
  const owner = state.owners[0];
  const turfId = owner.turfIds[0];
  const values = {
    name: 'Bank Details XI',
    sport: 'Cricket',
    members: [{
      id: 'bank-details-captain',
      name: 'Ravi Patel',
      mobile: '9876543210',
      age: 27,
      email: 'ravi.bank@example.com',
      role: 'Captain',
    }],
  };

  const withoutBankDetails = saveOwnerTeam({ ownerId: owner.id, turfId, values });
  assert.equal(withoutBankDetails.ok, true);
  assert.equal(withoutBankDetails.team.captainDetails.bankDetails, null);

  const withBankDetails = saveOwnerTeam({
    ownerId: owner.id,
    turfId,
    teamId: withoutBankDetails.team.id,
    values: {
      ...values,
      captainBankDetails: {
        bankName: ' State Bank of India ',
        accountNumber: '001234567890',
        ifscCode: 'sbin0001234',
      },
    },
  });
  assert.equal(withBankDetails.ok, true);
  assert.deepEqual(withBankDetails.team.captainDetails.bankDetails, {
    bankName: 'State Bank of India',
    accountNumber: '001234567890',
    ifscCode: 'SBIN0001234',
  });

  const reloadedTeam = getDemoState().teams.find((team) => team.id === withBankDetails.team.id);
  assert.deepEqual(reloadedTeam.captainDetails.bankDetails, withBankDetails.team.captainDetails.bankDetails);

  const updated = saveOwnerTeam({
    ownerId: owner.id,
    turfId,
    teamId: reloadedTeam.id,
    values: {
      ...values,
      captainBankDetails: {
        bankName: 'HDFC Bank',
        accountNumber: '000987654321',
        ifscCode: 'HDFC0000123',
      },
    },
  });
  assert.equal(updated.ok, true);
  assert.deepEqual(getDemoState().teams.find((team) => team.id === updated.team.id).captainDetails.bankDetails, {
    bankName: 'HDFC Bank',
    accountNumber: '000987654321',
    ifscCode: 'HDFC0000123',
  });

  const invalidIfsc = saveOwnerTeam({
    ownerId: owner.id,
    turfId,
    values: { ...values, captainBankDetails: { bankName: 'SBI', accountNumber: '001234567890', ifscCode: 'INVALID' } },
  });
  assert.equal(invalidIfsc.ok, false);
  assert.match(invalidIfsc.error, /IFSC/i);
  const incompleteDetails = saveOwnerTeam({
    ownerId: owner.id,
    turfId,
    values: { ...values, captainBankDetails: { bankName: 'SBI', accountNumber: '', ifscCode: '' } },
  });
  assert.equal(incompleteDetails.ok, false);
  assert.match(incompleteDetails.error, /account number/i);
});

test('owner tournament registration checks ownership, game, deadlines, slots, duplicates, and preserves roster details', async () => {
  resetDemoData();
  const state = getDemoState();
  const owner = state.owners[0];
  const turfId = owner.turfIds[0];
  const team = saveOwnerTeam({
    ownerId: owner.id,
    turfId,
    values: {
      name: 'Registration XI',
      sport: 'Cricket',
      members: [
        { id: 'registration-captain', name: 'Ravi Patel', mobile: '9876543210', age: 27, email: 'ravi.registration@example.com', role: 'Captain' },
        { id: 'registration-player', name: 'Aman Shah', mobile: '9876543211', age: 25, email: 'aman.registration@example.com', role: 'Player' },
      ],
    },
  });
  const dateOffset = (days) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const tournament = createTournament({
    name: 'Owner Team Cup',
    sport: 'Cricket',
    registrationType: 'Team',
    registrationStart: dateOffset(-1),
    registrationEnd: dateOffset(10),
    date: dateOffset(14),
    maxTeams: 3,
    entryFee: '₹2,500 per team',
  }, { publish: true }).tournament;
  const mismatchedTournament = createTournament({
    name: 'Owner Football Cup',
    sport: 'Football',
    registrationType: 'Team',
    registrationStart: dateOffset(-1),
    registrationEnd: dateOffset(10),
    date: dateOffset(14),
    maxTeams: 3,
    entryFee: '₹2,500 per team',
  }, { publish: true }).tournament;
  const slot = getTournamentSlotAvailability(tournament.id).slots.find((item) => item.available);
  const mismatchedSlot = getTournamentSlotAvailability(mismatchedTournament.id).slots.find((item) => item.available);

  const mismatch = await createTournamentRegistration({
    tournamentId: tournament.id,
    ownerId: owner.id,
    turfId: 'not-owned',
    teamId: team.team.id,
    slotNumber: slot.slotNumber,
  });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.error, /owned by your turf/i);
  const gameMismatch = await createTournamentRegistration({
    tournamentId: mismatchedTournament.id,
    ownerId: owner.id,
    turfId,
    teamId: team.team.id,
    slotNumber: mismatchedSlot.slotNumber,
  });
  assert.equal(gameMismatch.ok, false);
  assert.match(gameMismatch.error, /game must match/i);

  const registered = await createTournamentRegistration({
    tournamentId: tournament.id,
    ownerId: owner.id,
    turfId,
    teamId: team.team.id,
    slotNumber: slot.slotNumber,
  });
  assert.equal(registered.ok, true);
  assert.equal(registered.registration.ownerName, owner.name);
  assert.equal(registered.registration.teamSport, 'Cricket');
  assert.equal(registered.registration.captain, 'Ravi Patel');
  assert.deepEqual(registered.registration.players, ['Ravi Patel', 'Aman Shah']);
  assert.equal(registered.registration.paymentStatus, 'pending');

  const duplicate = await createTournamentRegistration({
    tournamentId: tournament.id,
    ownerId: owner.id,
    turfId,
    teamId: team.team.id,
    slotNumber: slot.slotNumber,
  });
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.error, /already registered/i);
  assert.equal(deleteOwnerTeam({ ownerId: owner.id, turfId, teamId: team.team.id }).ok, false);
  assert.equal(saveOwnerTeam({
    ownerId: owner.id,
    turfId,
    teamId: team.team.id,
    values: { ...team.team, sport: 'Football' },
  }).ok, false);

  assert.equal(isTournamentRegistrationOpen({
    id: 'expired-owner-cup',
    registrationEnd: dateOffset(-1),
    status: 'Registration Open',
  }), false);
});

test('player team tournament registration enforces ownership and game and persists pending registration', async () => {
  resetDemoData();
  const values = {
    name: 'Player Registration XI',
    sport: 'Cricket',
    members: [
      { id: 'player-reg-captain', name: 'Dev Shah', mobile: '9876543210', age: 25, email: 'dev.reg@example.com', role: 'Captain' },
      { id: 'player-reg-member', name: 'Ravi Patel', mobile: '9876543211', age: 27, email: 'ravi.reg@example.com', role: 'Player' },
    ],
  };
  const team = savePlayerTeam({ playerId: 'demo-player', values });
  assert.equal(team.ok, true);
  const dateOffset = (days) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const tournament = createTournament({
    name: 'Player Team Registration Cup',
    sport: 'Cricket',
    registrationType: 'Team',
    registrationStart: dateOffset(-1),
    registrationEnd: dateOffset(10),
    date: dateOffset(14),
    maxTeams: 2,
    entryFee: '₹1,500 per team',
  }, { publish: true }).tournament;
  const footballTournament = createTournament({
    name: 'Player Team Football Cup',
    sport: 'Football',
    registrationType: 'Team',
    registrationStart: dateOffset(-1),
    registrationEnd: dateOffset(10),
    date: dateOffset(14),
    maxTeams: 2,
    entryFee: '₹1,500 per team',
  }, { publish: true }).tournament;
  const cricketSlot = getTournamentSlotAvailability(tournament.id).slots.find((item) => item.available);
  const footballSlot = getTournamentSlotAvailability(footballTournament.id).slots.find((item) => item.available);

  const unauthorized = await createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'another-player',
    teamId: team.team.id,
    slotNumber: cricketSlot.slotNumber,
  });
  assert.equal(unauthorized.ok, false);
  assert.match(unauthorized.error, /belonging to your player account/i);
  const gameMismatch = await createTournamentRegistration({
    tournamentId: footballTournament.id,
    playerId: 'demo-player',
    teamId: team.team.id,
    slotNumber: footballSlot.slotNumber,
  });
  assert.equal(gameMismatch.ok, false);
  assert.match(gameMismatch.error, /game must match/i);

  const registered = await createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'demo-player',
    teamId: team.team.id,
    slotNumber: cricketSlot.slotNumber,
  });
  assert.equal(registered.ok, true);
  assert.equal(registered.registration.registrationSource, 'player-team');
  assert.equal(registered.registration.captain, 'Dev Shah');
  assert.deepEqual(registered.registration.players, ['Dev Shah', 'Ravi Patel']);
  assert.equal(registered.registration.paymentStatus, 'pending');
  const duplicate = await createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'demo-player',
    teamId: team.team.id,
    slotNumber: cricketSlot.slotNumber,
  });
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.error, /already registered/i);
  assert.equal(deletePlayerTeam({ playerId: 'demo-player', teamId: team.team.id }).ok, false);
});

test('tournament date validation enforces registration and event date boundaries', () => {
  const valid = validateTournamentDates({
    registrationStart: '2099-01-01',
    registrationEnd: '2099-01-01',
    startDate: '2099-01-02',
    endDate: '2099-01-02',
  });
  assert.deepEqual(valid, {});

  const invalid = validateTournamentDates({
    registrationStart: '2099-01-01',
    registrationEnd: '2099-01-05',
    startDate: '2099-01-05',
    endDate: '2099-01-04',
  });
  assert.match(invalid.startDate, /after registration end/i);
  assert.match(invalid.endDate, /after tournament start/i);

  const missingStart = validateTournamentDates({});
  assert.match(missingStart.startDate, /required/i);

  const past = validateTournamentDates({ startDate: '2000-01-01' });
  assert.match(past.startDate, /cannot be in the past/i);
});

test('admin cannot approve a registration with unverified payment', async () => {
  resetDemoData();
  const tournament = createTournament({
    name: 'Unverified Payment Test',
    sport: 'Cricket',
    registrationType: 'Team',
    maxTeams: 2,
    entryFee: '₹500 per team',
  }, { publish: true }).tournament;
  const slot = getTournamentSlotAvailability(tournament.id).slots.find((item) => item.available);
  const created = await createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'demo-player',
    playerName: 'Dev Shah',
    teamName: 'Dev Shah',
    slotNumber: slot.slotNumber,
  });

  assert.equal(created.ok, true);
  const result = approveRegistration(created.registration.id);

  assert.equal(result.ok, false);
  assert.match(result.error, /payment must be verified/i);
  const persisted = getDemoState().registrations.find((item) => item.id === created.registration.id);
  assert.equal(persisted.status, 'pending');
  assert.equal(persisted.paymentStatus, 'pending');
});

test('pending individual registrations reserve selected slots and block stale choices', async () => {
  resetDemoData();
  const tournament = createTournament({
    name: 'Player Slot Limit Test',
    sport: 'Cricket',
    registrationType: 'Individual',
    maxPlayers: 2,
    entryFee: '₹500 per player',
  }, { publish: true }).tournament;

  const first = await createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'player-one',
    playerName: 'Player One',
    teamName: 'Player One',
    slotNumber: 1,
  });
  const secondSlot = getTournamentSlotAvailability(tournament.id).slots.find((item) => item.available);
  const second = await createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'player-two',
    playerName: 'Player Two',
    teamName: 'Player Two',
    slotNumber: secondSlot.slotNumber,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(getTournamentSlotAvailability(tournament.id).availableCount, 0);
  assert.equal(getAllTournaments().find((item) => item.id === tournament.id).registeredTeams, 2);

  const third = await createTournamentRegistration({
    tournamentId: tournament.id,
    playerId: 'player-three',
    playerName: 'Player Three',
    teamName: 'Player Three',
    slotNumber: secondSlot.slotNumber,
  });
  assert.equal(third.ok, false);
  assert.match(third.error, /no longer available/i);
});
