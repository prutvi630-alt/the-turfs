import { createId, getAllTurfs, getDemoState, saveDemoState } from './demoStore';
import { ACTIVITY_TYPES, recordActivity } from './activityStore';

// ---------------------------------------------------------------------------
// Admin turf & team management
// ---------------------------------------------------------------------------
// Turfs created or edited here are written to `state.registeredTurfs`, which is
// the SAME collection the public app already merges via `getAllTurfs()`
// (homeData.turfs + registeredTurfs). That is the public-synchronisation seam:
// a turf added by an admin immediately flows to every surface that reads
// getAllTurfs() — the player dashboard's turf picker, owner dashboards, etc.
//
// Teams are the EXISTING records created by turf owners in state.teams; this
// module only reads/edits them (never creates duplicate players).

export const TURF_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
};

export const turfStatus = (turf = {}) => {
  if (turf.status === TURF_STATUS.SUSPENDED) return TURF_STATUS.SUSPENDED;
  if (turf.status === TURF_STATUS.PENDING) return TURF_STATUS.PENDING;
  return TURF_STATUS.ACTIVE;
};

// A turf is admin-editable/deletable only when it is a registered record.
export const isRegisteredTurf = (turf) => Boolean(turf && (turf.createdAt || turf.registrationStatus || turf.ownerId));

/* ---------- Create ---------- */
export const createTurf = (input, options = {}) => {
  const state = getDemoState();
  state.registeredTurfs = state.registeredTurfs || [];

  const name = String(input.name || '').trim();
  if (!name) return { ok: false, error: 'Turf name is required.' };

  const ownerId = input.ownerId || '';
  const id = createId('turf');
  const sports = Array.isArray(input.sports) && input.sports.length ? input.sports : ['Cricket'];
  const facilities = Array.isArray(input.facilities) ? input.facilities : [];

  const turfRecord = {
    id,
    ownerId,
    ownerName: input.ownerName || '',
    name,
    area: input.area || 'Vadodara',
    location: `${input.area || 'Vadodara'}, Vadodara`,
    address: input.address || '',
    sports,
    games: sports,
    facilities,
    openingTime: input.openingTime || '',
    closingTime: input.closingTime || '',
    openingHours: input.openingTime && input.closingTime
      ? `${input.openingTime} - ${input.closingTime}`
      : 'Open 24 Hours',
    description: input.description || '',
    price: input.price || '₹550 / hour',
    image: input.primaryImage || (input.images || [])[0] || '',
    images: input.images || (input.primaryImage ? [input.primaryImage] : []),
    turfAddress: {
      area: input.area || '',
      city: input.city || 'Vadodara',
      state: input.state || 'Gujarat',
      pincode: input.pincode || '',
    },
    turfContactNumber: input.contactNumber || '',
    registrationStatus: 'Registered',
    status: TURF_STATUS.ACTIVE,
    createdAt: new Date().toISOString(),
  };

  state.registeredTurfs.push(turfRecord);

  // Link the turf to the chosen owner (existing owner record, no duplication).
  if (ownerId) {
    const owner = (state.owners || []).find((item) => item.id === ownerId);
    if (owner) owner.turfIds = [...new Set([...(owner.turfIds || []), id])];
  }

  recordActivity({
    state,
    type: ACTIVITY_TYPES.TURF_CREATED,
    actorRole: 'admin',
    actorName: options.actorName || 'Platform Admin',
    message: `Turf created: ${name}`,
    targetPath: '/admin/turfs',
    meta: { turfId: id },
  });

  saveDemoState(state);
  return { ok: true, turf: turfRecord };
};

/* ---------- Update ---------- */
export const updateTurf = (id, patch, options = {}) => {
  const state = getDemoState();
  const turf = (state.registeredTurfs || []).find((item) => item.id === id);
  if (!turf) return { ok: false, error: 'Only registered turfs can be edited here.', staticTurf: true };

  const allowed = ['name', 'area', 'address', 'sports', 'facilities', 'openingTime', 'closingTime', 'description', 'price', 'image', 'images', 'ownerId', 'turfContactNumber'];
  Object.entries(patch).forEach(([key, value]) => { if (allowed.includes(key)) turf[key] = value; });
  if (patch.sports) turf.games = patch.sports;
  if (patch.openingTime && patch.closingTime) turf.openingHours = `${patch.openingTime} - ${patch.closingTime}`;
  turf.updatedAt = new Date().toISOString();

  recordActivity({
    state,
    type: ACTIVITY_TYPES.TURF_UPDATED,
    actorRole: 'admin',
    actorName: options.actorName || 'Platform Admin',
    message: `Turf updated: ${turf.name}`,
    targetPath: '/admin/turfs',
    meta: { turfId: id },
  });

  saveDemoState(state);
  return { ok: true, turf };
};

/* ---------- Status ---------- */
export const setTurfStatus = (id, status, options = {}) => {
  const state = getDemoState();
  const turf = (state.registeredTurfs || []).find((item) => item.id === id);
  if (!turf) return { ok: false, error: 'Only registered turfs can be managed here.', staticTurf: true };

  turf.status = status;
  turf.statusUpdatedAt = new Date().toISOString();
  if (status === TURF_STATUS.SUSPENDED) turf.suspensionReason = options.reason || '';
  else delete turf.suspensionReason;

  const names = { active: 'approved / activated', suspended: 'suspended', pending: 'marked pending' };
  recordActivity({
    state,
    type: ACTIVITY_TYPES.TURF_STATUS,
    actorRole: 'admin',
    actorName: options.actorName || 'Platform Admin',
    message: `Turf ${turf.name} ${names[status] || status}`,
    targetPath: '/admin/turfs',
    meta: { turfId: id, status, reason: options.reason || '' },
  });

  saveDemoState(state);
  return { ok: true, turf };
};

/* ---------- Delete ---------- */
export const deleteTurf = (id, options = {}) => {
  const state = getDemoState();
  const turf = (state.registeredTurfs || []).find((item) => item.id === id);
  if (!turf) return { ok: false, error: 'Only registered turfs can be deleted.', staticTurf: true };

  state.registeredTurfs = state.registeredTurfs.filter((item) => item.id !== id);
  // Detach from owner
  (state.owners || []).forEach((owner) => {
    if ((owner.turfIds || []).includes(id)) owner.turfIds = owner.turfIds.filter((turfId) => turfId !== id);
  });

  recordActivity({
    state,
    type: ACTIVITY_TYPES.TURF_DELETED,
    actorRole: 'admin',
    actorName: options.actorName || 'Platform Admin',
    message: `Turf deleted: ${turf.name}`,
    targetPath: '/admin/turfs',
    meta: { turfId: id },
  });

  saveDemoState(state);
  return { ok: true };
};

/* ---------- Team status ---------- */
export const TEAM_STATUS = { ACTIVE: 'active', SUSPENDED: 'suspended' };

export const teamStatus = (team = {}) => (team.status === TEAM_STATUS.SUSPENDED ? TEAM_STATUS.SUSPENDED : TEAM_STATUS.ACTIVE);

export const setTeamStatus = (id, status, options = {}) => {
  const state = getDemoState();
  const team = (state.teams || []).find((item) => item.id === id);
  if (!team) return { ok: false, error: 'Team not found.' };

  team.status = status;
  team.statusUpdatedAt = new Date().toISOString();
  if (status === TEAM_STATUS.SUSPENDED) team.suspensionReason = options.reason || '';
  else delete team.suspensionReason;

  recordActivity({
    state,
    type: ACTIVITY_TYPES.TEAM_STATUS,
    actorRole: 'admin',
    actorName: options.actorName || 'Platform Admin',
    message: `Team ${team.name} ${status === TEAM_STATUS.SUSPENDED ? 'suspended' : 'activated'}`,
    targetPath: '/admin/teams',
    meta: { teamId: id, status },
  });

  saveDemoState(state);
  return { ok: true, team };
};

export const updateTeam = (id, patch, options = {}) => {
  const state = getDemoState();
  const team = (state.teams || []).find((item) => item.id === id);
  if (!team) return { ok: false, error: 'Team not found.' };

  ['name', 'sport', 'description'].forEach((key) => { if (patch[key] !== undefined) team[key] = patch[key]; });
  if (patch.memberIds) team.memberIds = patch.memberIds;
  team.updatedAt = new Date().toISOString();

  recordActivity({
    state,
    type: ACTIVITY_TYPES.TEAM_UPDATED,
    actorRole: 'admin',
    actorName: options.actorName || 'Platform Admin',
    message: `Team updated: ${team.name}`,
    targetPath: '/admin/teams',
    meta: { teamId: id },
  });

  saveDemoState(state);
  return { ok: true, team };
};

// Owner options for the create/edit turf form (existing owner records only).
export const getOwnerOptions = () => {
  const state = getDemoState();
  const allTurfs = getAllTurfs();
  return (state.owners || []).map((owner) => ({
    id: owner.id,
    name: owner.name || 'Turf Owner',
    turfCount: (owner.turfIds || []).filter((id) => allTurfs.some((turf) => turf.id === id)).length,
  }));
};

export { isRegisteredTurf as isSyntheticTurf }; // compatibility alias