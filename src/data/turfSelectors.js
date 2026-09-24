import { getAllTurfs, getDemoState } from './demoStore';
import { turfStatus, isRegisteredTurf, teamStatus } from './adminTurfs';
import { getAllTournaments } from './dashboardSelectors';

// ---------------------------------------------------------------------------
// Turf & team selectors
// ---------------------------------------------------------------------------
// Derives the rows the admin Turfs and Teams tables/detail views render, from
// the shared demo layer. Turfs come from getAllTurfs() (static + registered);
// teams come from the existing state.teams collection created by turf owners.

const formatDate = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ownerNameFor = (state, turf) => {
  if (turf.ownerName) return turf.ownerName;
  const owner = (state.owners || []).find((item) => (item.turfIds || []).includes(turf.id));
  return owner?.name || '—';
};

// ---- Turf rows ------------------------------------------------------------
export const getTurfRows = () => {
  const state = getDemoState();
  const allTurfs = getAllTurfs();
  const tournaments = getAllTournaments();

  return allTurfs.map((turf) => {
    const owner = (state.owners || []).find((item) => item.id === turf.ownerId
      || (item.turfIds || []).includes(turf.id));
    const venueTournaments = tournaments.filter((tournament) => tournament.venueId === turf.id);

    return {
      id: turf.id,
      name: turf.name || 'Turf',
      owner: ownerNameFor(state, turf),
      ownerId: owner?.id || turf.ownerId || '',
      area: turf.area || 'Vadodara',
      address: turf.address || turf.location || `${turf.area || 'Vadodara'}, Vadodara`,
      sports: turf.sports || [],
      facilities: turf.facilities || [],
      openingHours: turf.openingHours || 'Open 24 Hours',
      openingTime: turf.openingTime || '',
      closingTime: turf.closingTime || '',
      price: turf.price || '—',
      description: turf.description || '',
      contact: turf.turfContactNumber || turf.contactNumber || owner?.mobile || '—',
      images: turf.images?.length ? turf.images : (turf.image ? [turf.image] : []),
      primaryImage: turf.image || (turf.images || [])[0] || '',
      status: isRegisteredTurf(turf) ? turfStatus(turf) : 'active',
      suspensionReason: turf.suspensionReason || '',
      managed: isRegisteredTurf(turf),
      createdAt: turf.createdAt || '',
      createdLabel: turf.createdAt ? formatDate(turf.createdAt) : 'Catalogue',
      tournamentCount: venueTournaments.length,
      _turf: turf,
    };
  });
};

export const getTurfFilterOptions = (rows) => ({
  areas: ['All', ...new Set(rows.map((row) => row.area).filter(Boolean))],
  sports: ['All', ...new Set(rows.flatMap((row) => row.sports))],
  statuses: ['All', 'active', 'suspended', 'pending'],
  owners: ['All', ...new Set(rows.map((row) => row.owner).filter((owner) => owner && owner !== '—'))],
});

// ---- Team rows ------------------------------------------------------------
export const getTeamRows = () => {
  const state = getDemoState();
  const allTurfs = getAllTurfs();
  const tournaments = getAllTournaments();

  return (state.teams || []).map((team) => {
    const owner = (state.owners || []).find((item) => item.id === team.ownerId);
    const turf = allTurfs.find((item) => item.id === team.turfId);
    const memberIds = team.memberIds || [];
    const members = memberIds
      .map((memberId) => (state.players || []).find((player) => player.id === memberId))
      .filter(Boolean);

    const memberNames = members.map((player) => `${player.firstName || ''} ${player.surname || ''}`.trim());
    // A team's tournament = the first tournament whose venue matches its turf and
    // sport, else the first matching sport. Best-effort link using existing data.
    const tournament = tournaments.find((item) => item.sport === team.sport && item.venueId === team.turfId)
      || tournaments.find((item) => item.sport === team.sport);

    // Performance from match results where the team played (state.matches).
    const matches = (state.matches || []).filter((match) => (match.teams || []).includes(team.name));
    let wins = 0;
    let losses = 0;
    matches.forEach((match) => {
      if (!match.result) return;
      if (match.result.winner === team.name) wins += 1;
      else if (match.result.loser === team.name) losses += 1;
    });

    return {
      id: team.id,
      name: team.name || 'Team',
      sport: team.sport || '—',
      description: team.description || '',
      captain: memberNames[0] || '—',
      captainId: memberIds[0] || '',
      owner: owner?.name || '—',
      ownerId: team.ownerId || '',
      turfName: turf?.name || '—',
      turfId: team.turfId || '',
      memberIds,
      members: members.map((player) => ({
        id: player.id,
        name: `${player.firstName || ''} ${player.surname || ''}`.trim(),
        sport: player.sportId || '—',
        email: player.email || '',
        mobile: player.mobile || '',
      })),
      playerCount: members.length,
      tournament: tournament?.name || '—',
      tournamentId: tournament?.id || '',
      status: teamStatus(team),
      suspensionReason: team.suspensionReason || '',
      createdAt: team.updatedAt || team.createdAt || '',
      createdLabel: team.updatedAt || team.createdAt ? formatDate(team.updatedAt || team.createdAt) : '—',
      performance: { matches: matches.length, wins, losses },
      _team: team,
    };
  });
};

export const getTeamFilterOptions = (rows) => ({
  sports: ['All', ...new Set(rows.map((row) => row.sport).filter((sport) => sport && sport !== '—'))],
  statuses: ['All', 'active', 'suspended'],
});

export { formatDate as formatTurfDate };