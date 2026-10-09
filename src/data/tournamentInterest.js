import { getDemoState, saveDemoState } from './demoStore.js';
import { getAllTournaments, isTournamentInterestActive } from './dashboardSelectors.js';

export const getPlayerInterestedTournamentIds = (player) => {
  if (!player) return [];
  const records = Array.isArray(player.interestedTournamentRecords)
    ? player.interestedTournamentRecords.map((record) => record?.tournamentId)
    : [];
  const values = [
    ...(Array.isArray(player.interestedTournaments) ? player.interestedTournaments : []),
    ...(Array.isArray(player.interestedTournamentIds) ? player.interestedTournamentIds : []),
    ...records,
  ];
  return [...new Set(values.filter(Boolean).map(String))];
};

export const savePlayerTournamentInterest = (playerId, tournamentId, now = new Date()) => {
  if (!playerId) return { ok: false, error: 'Player account could not be identified.' };
  if (!tournamentId) return { ok: false, error: 'A valid tournament could not be identified.' };

  const tournament = getAllTournaments().find((item) => String(item.id) === String(tournamentId));
  if (!tournament) return { ok: false, error: 'This tournament could not be found.' };
  if (!isTournamentInterestActive(tournament, now)) {
    return { ok: false, error: 'Registration for this tournament has closed.' };
  }

  const state = getDemoState();
  const player = (state.players || []).find((candidate) => (
    candidate.id === playerId
    || String(candidate.email || '').trim().toLowerCase() === String(playerId).trim().toLowerCase()
  ));
  if (!player) return { ok: false, error: 'Player profile not found.' };

  const tournamentKey = String(tournament.id);
  const interested = getPlayerInterestedTournamentIds(player);
  if (interested.includes(tournamentKey)) {
    return { ok: true, duplicate: true, player };
  }

  const nextInterest = [...interested, tournamentKey];
  const interestedTournamentRecords = Array.isArray(player.interestedTournamentRecords)
    ? player.interestedTournamentRecords
    : [];
  const matchedIndex = state.players.findIndex((candidate) => candidate.id === player.id);
  state.players[matchedIndex] = {
    ...player,
    interestedTournaments: nextInterest,
    interestedTournamentIds: nextInterest,
    interestedTournamentRecords: [
      ...interestedTournamentRecords,
      {
        tournamentId: tournamentKey,
        playerId: player.id,
        savedAt: now.toISOString(),
        status: 'active',
      },
    ],
  };

  if (!saveDemoState(state)) return { ok: false, error: 'Unable to save your interest right now.' };
  return {
    ok: true,
    duplicate: false,
    player: state.players[matchedIndex],
    interested: nextInterest,
  };
};
