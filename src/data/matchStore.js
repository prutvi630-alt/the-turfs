import { createId, getDemoState, saveDemoState } from './demoStore';
import { recordActivity, ACTIVITY_TYPES } from './activityStore';

export const MATCH_ROUNDS = ['League', 'Quarter Final', 'Semi Final', 'Final'];
const roundOrder = MATCH_ROUNDS.reduce((result, round, index) => ({ ...result, [round]: index }), {});
const asDate = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString().slice(0, 10);
};
export const formatMatchDate = (value) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value || '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const normalizeMatch = (match = {}) => ({
  ...match, id: match.id || createId('match'), round: match.round || 'League',
  teamA: match.teamA || match.teams?.[0] || '', teamB: match.teamB || match.teams?.[1] || '',
  date: asDate(match.date), time: match.time || '', venue: match.venue || match.venueName || '',
  status: match.status || 'upcoming', result: match.result || null,
});
export const getMatches = (tournamentId = null) => {
  const matches = (getDemoState().matches || []).map(normalizeMatch);
  return tournamentId ? matches.filter((match) => match.tournamentId === tournamentId) : matches;
};
const validateMatch = (input) => {
  if (!input.tournamentId) return 'Tournament is required.';
  if (!input.teamA?.trim()) return 'Team A is required.';
  if (!input.teamB?.trim()) return 'Team B is required.';
  if (input.teamA.trim().toLowerCase() === input.teamB.trim().toLowerCase()) return 'Team A and Team B must be different.';
  if (!input.date || !input.time) return 'Date and time are required.';
  return '';
};
const updateState = (mutator) => {
  const state = getDemoState();
  state.matches = (state.matches || []).map(normalizeMatch);
  mutator(state); saveDemoState(state); return state;
};
export const createMatch = (input) => {
  const error = validateMatch(input); if (error) return { ok: false, error };
  const match = normalizeMatch({ ...input, id: createId('match'), status: 'upcoming' });
  const state = updateState((next) => { next.matches.push(match); });
  recordActivity({ state, type: ACTIVITY_TYPES.MATCH_SCHEDULED, message: `Match scheduled: ${match.teamA} vs ${match.teamB}`, targetPath: '/admin/matches', meta: { matchId: match.id, tournamentId: match.tournamentId } });
  return { ok: true, match };
};
export const updateMatch = (id, input) => {
  const error = validateMatch(input); if (error) return { ok: false, error }; let match;
  const state = updateState((next) => { next.matches = next.matches.map((item) => { if (item.id !== id) return item; match = normalizeMatch({ ...item, ...input, id }); return match; }); });
  if (!match) return { ok: false, error: 'Match not found.' };
  recordActivity({ state, type: ACTIVITY_TYPES.MATCH_RESCHEDULED, message: `Match rescheduled: ${match.teamA} vs ${match.teamB}`, targetPath: '/admin/matches', meta: { matchId: id, tournamentId: match.tournamentId } });
  return { ok: true, match };
};
export const cancelMatch = (id) => {
  let match; const state = updateState((next) => { next.matches = next.matches.map((item) => { if (item.id !== id) return item; match = { ...item, status: 'cancelled' }; return match; }); });
  if (!match) return { ok: false, error: 'Match not found.' };
  recordActivity({ state, type: ACTIVITY_TYPES.MATCH_CANCELLED, message: `Match cancelled: ${match.teamA} vs ${match.teamB}`, targetPath: '/admin/matches', meta: { matchId: id, tournamentId: match.tournamentId } });
  return { ok: true, match };
};
const nextRound = (round) => MATCH_ROUNDS[roundOrder[round] + 1];
export const saveMatchResult = (id, result) => {
  let match; const state = updateState((next) => {
    next.matches = next.matches.map((item) => { if (item.id !== id) return item; match = { ...item, result: { ...result, winner: result.winner || '' }, status: 'completed' }; return match; });
    if (!match) return;
    next.tournamentResults = { ...(next.tournamentResults || {}), [match.tournamentId]: { ...next.tournamentResults?.[match.tournamentId], lastUpdated: new Date().toISOString() } };
    const followingRound = nextRound(match.round); if (!match.result.winner || !followingRound) return;
    const candidates = next.matches.filter((item) => item.tournamentId === match.tournamentId && item.round === followingRound && item.status !== 'cancelled');
    const slot = candidates.find((item) => !item.teamA || /^Winner /.test(item.teamA)) || candidates.find((item) => !item.teamB || /^Winner /.test(item.teamB));
    if (slot) { if (!slot.teamA || /^Winner /.test(slot.teamA)) slot.teamA = match.result.winner; else if (!slot.teamB || /^Winner /.test(slot.teamB)) slot.teamB = match.result.winner; }
  });
  if (!match) return { ok: false, error: 'Match not found.' };
  if (match.round === 'Final' && match.result.winner) {
    state.tournamentResults[match.tournamentId] = { ...state.tournamentResults[match.tournamentId], winner: match.result.winner, finalResult: match.result };
    state.tournaments = (state.tournaments || []).map((tournament) => tournament.id === match.tournamentId
      ? { ...tournament, status: 'Completed', winner: match.result.winner, finalResult: match.result }
      : tournament);
  }
  saveDemoState(state);
  recordActivity({ state, type: ACTIVITY_TYPES.MATCH_RESULT_UPDATED, message: `Result entered: ${match.teamA} vs ${match.teamB}`, targetPath: '/admin/matches', meta: { matchId: id, tournamentId: match.tournamentId, winner: match.result.winner } });
  return { ok: true, match };
};
export const getTournamentMatches = (tournamentId) => getMatches(tournamentId).sort((a, b) => roundOrder[a.round] - roundOrder[b.round] || `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
export const getTournamentBracket = (tournament, matches = getTournamentMatches(tournament.id)) => MATCH_ROUNDS.map((round) => {
  const games = matches.filter((match) => match.round === round).map((match) => ({ ...match, teams: [match.teamA, match.teamB] }));
  const fallback = tournament.bracket?.rounds?.find((item) => item.name === round);
  return { name: round, games: games.length ? games : (fallback?.games || []).map((teams) => ({ teams })) };
}).filter((round) => round.games.length);