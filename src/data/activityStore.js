import { createId, getDemoState, saveDemoState } from './demoStore';

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------
// A single append-only stream of platform events. Every meaningful admin (or
// system) action should push one record here so the dashboard, and later the
// Activity Logs screen, can render a real audit trail from demo state.
//
// Records are stored on the demo state under `activities`. The shape is kept
// intentionally flat so a future backend can persist the same objects.
//
//   {
//     id, type, actorRole, actorName, message, targetPath,
//     meta: {...}, createdAt: ISO string
//   }
//
// `type` drives the icon/colour mapping in the UI; unknown types fall back to
// a neutral "system" look, so adding new event types never breaks the feed.

export const ACTIVITY_TYPES = {
  PLAYER_REGISTERED: 'player-registered',
  TURF_ADDED: 'turf-added',
  OWNER_REGISTERED: 'owner-registered',
  TEAM_CREATED: 'team-created',
  TOURNAMENT_CREATED: 'tournament-created',
  TOURNAMENT_PUBLISHED: 'tournament-published',
  TOURNAMENT_UPDATED: 'tournament-updated',
  TOURNAMENT_CANCELLED: 'tournament-cancelled',
  TOURNAMENT_COMPLETED: 'tournament-completed',
  TOURNAMENT_DUPLICATED: 'tournament-duplicated',
  REGISTRATION_APPROVED: 'registration-approved',
  REGISTRATION_REJECTED: 'registration-rejected',
  REGISTRATION_CREATED: 'registration-created',
  MATCH_RESULT_UPDATED: 'match-result-updated',
  MATCH_SCHEDULED: 'match-scheduled',
  MATCH_RESCHEDULED: 'match-rescheduled',
  MATCH_CANCELLED: 'match-cancelled',
  NOTIFICATION_SENT: 'notification-sent',
  ORGANISATION_UPDATED: 'organisation-updated',
  ACCOUNT_SUSPENDED: 'account-suspended',
  ACCOUNT_ACTIVATED: 'account-activated',
  ACCOUNT_PENDING: 'account-pending',
  ACCOUNT_UPDATED: 'account-updated',
  TURF_CREATED: 'turf-created',
  TURF_UPDATED: 'turf-updated',
  TURF_STATUS: 'turf-status',
  TURF_DELETED: 'turf-deleted',
  TEAM_UPDATED: 'team-updated',
  TEAM_STATUS: 'team-status',
};

// Matching icon names come from AdminIcon so the feed reuses the existing set.
export const ACTIVITY_ICONS = {
  [ACTIVITY_TYPES.PLAYER_REGISTERED]: 'users',
  [ACTIVITY_TYPES.TURF_ADDED]: 'turf',
  [ACTIVITY_TYPES.OWNER_REGISTERED]: 'badge',
  [ACTIVITY_TYPES.TEAM_CREATED]: 'shield',
  [ACTIVITY_TYPES.TOURNAMENT_CREATED]: 'trophy',
  [ACTIVITY_TYPES.TOURNAMENT_PUBLISHED]: 'trophy',
  [ACTIVITY_TYPES.TOURNAMENT_UPDATED]: 'trophy',
  [ACTIVITY_TYPES.TOURNAMENT_CANCELLED]: 'trophy',
  [ACTIVITY_TYPES.TOURNAMENT_COMPLETED]: 'trophy',
  [ACTIVITY_TYPES.TOURNAMENT_DUPLICATED]: 'trophy',
  [ACTIVITY_TYPES.REGISTRATION_APPROVED]: 'clipboard',
  [ACTIVITY_TYPES.REGISTRATION_REJECTED]: 'clipboard',
  [ACTIVITY_TYPES.REGISTRATION_CREATED]: 'clipboard',
  [ACTIVITY_TYPES.MATCH_RESULT_UPDATED]: 'vs',
  [ACTIVITY_TYPES.MATCH_SCHEDULED]: 'vs',
  [ACTIVITY_TYPES.MATCH_RESCHEDULED]: 'vs',
  [ACTIVITY_TYPES.MATCH_CANCELLED]: 'vs',
  [ACTIVITY_TYPES.NOTIFICATION_SENT]: 'bell',
  [ACTIVITY_TYPES.ORGANISATION_UPDATED]: 'cog',
  [ACTIVITY_TYPES.ACCOUNT_SUSPENDED]: 'user',
  [ACTIVITY_TYPES.ACCOUNT_ACTIVATED]: 'user',
  [ACTIVITY_TYPES.ACCOUNT_PENDING]: 'user',
  [ACTIVITY_TYPES.ACCOUNT_UPDATED]: 'user',
  [ACTIVITY_TYPES.TURF_CREATED]: 'turf',
  [ACTIVITY_TYPES.TURF_UPDATED]: 'turf',
  [ACTIVITY_TYPES.TURF_STATUS]: 'turf',
  [ACTIVITY_TYPES.TURF_DELETED]: 'turf',
  [ACTIVITY_TYPES.TEAM_UPDATED]: 'shield',
  [ACTIVITY_TYPES.TEAM_STATUS]: 'shield',
};

export const getActivities = () => getDemoState().activities || [];

export const NOTIFICATION_ACTIVITY_TYPES = [
  ACTIVITY_TYPES.PLAYER_REGISTERED,
  ACTIVITY_TYPES.TURF_ADDED,
  ACTIVITY_TYPES.TURF_CREATED,
  ACTIVITY_TYPES.REGISTRATION_CREATED,
  ACTIVITY_TYPES.REGISTRATION_APPROVED,
  ACTIVITY_TYPES.TOURNAMENT_PUBLISHED,
  ACTIVITY_TYPES.TOURNAMENT_CANCELLED,
  ACTIVITY_TYPES.MATCH_RESULT_UPDATED,
];

export const getNotifications = () => {
  const state = getDemoState();
  const readIds = state.notificationReadIds || [];
  return getActivities()
    .filter((activity) => NOTIFICATION_ACTIVITY_TYPES.includes(activity.type))
    .map((activity) => ({ ...activity, read: readIds.includes(activity.id) }));
};

export const markNotificationRead = (id) => {
  const state = getDemoState();
  state.notificationReadIds = [...new Set([...(state.notificationReadIds || []), id])];
  saveDemoState(state);
  return state.notificationReadIds;
};

export const markAllNotificationsRead = () => {
  const state = getDemoState();
  state.notificationReadIds = getNotifications().map((notification) => notification.id);
  saveDemoState(state);
  return state.notificationReadIds;
};

export const getUnreadNotificationCount = () => getNotifications().filter((notification) => !notification.read).length;

/**
 * Append an activity record to the demo state.
 *
 * @param {object} entry
 * @param {string} entry.type      one of ACTIVITY_TYPES
 * @param {string} entry.message   human-readable description
 * @param {string} [entry.targetPath] admin route this event relates to
 * @param {object} [entry.meta]    free-form extra data
 * @param {object} [entry.state]   optional state to mutate in place (avoids a
 *                                 re-read when the caller already has the state)
 * @param {string} [entry.actorRole='admin']
 * @param {string} [entry.actorName='Admin']
 * @returns {object} the created activity record
 */
export const recordActivity = (entry = {}) => {
  const state = entry.state || getDemoState();
  const record = {
    id: createId('activity'),
    type: entry.type || 'system',
    actorRole: entry.actorRole || 'admin',
    actorName: entry.actorName || 'Platform Admin',
    message: entry.message || '',
    targetPath: entry.targetPath || '',
    meta: entry.meta || {},
    createdAt: entry.createdAt || new Date().toISOString(),
  };
  state.activities = Array.isArray(state.activities) ? state.activities : [];
  state.activities.unshift(record);
  // Keep the feed bounded so localStorage never grows without limit.
  state.activities = state.activities.slice(0, 200);
  saveDemoState(state);
  return record;
};

// Seed a believable starting feed when the demo has no activities yet, derived
// from the actual seeded records rather than invented numbers.
export const seedActivities = () => {
  const state = getDemoState();
  if (Array.isArray(state.activities) && state.activities.length) return state.activities;

  const seed = [];

  (state.players || []).forEach((player) => {
    const name = `${player.firstName || ''} ${player.surname || ''}`.trim() || 'Player';
    seed.push({
      id: createId('activity'),
      type: ACTIVITY_TYPES.PLAYER_REGISTERED,
      actorRole: 'player',
      actorName: name,
      message: `New player registered: ${name}`,
      targetPath: '/admin/players',
      meta: { playerId: player.id },
      createdAt: player.createdAt || new Date().toISOString(),
    });
  });

  (state.registeredTurfs || []).forEach((turf) => {
    seed.push({
      id: createId('activity'),
      type: ACTIVITY_TYPES.TURF_ADDED,
      actorRole: 'turf-owner',
      actorName: turf.ownerName || 'Turf Owner',
      message: `New turf added: ${turf.turfName || turf.name || 'Turf'}`,
      targetPath: '/admin/turfs',
      meta: { turfId: turf.id },
      createdAt: turf.createdAt || new Date().toISOString(),
    });
  });

  (state.requests || [])
    .filter((request) => request.respondedAt)
    .forEach((request) => {
      const owner = (state.owners || []).find((item) => item.id === request.ownerId);
      seed.push({
        id: createId('activity'),
        type: request.status === 'accepted' ? ACTIVITY_TYPES.REGISTRATION_APPROVED : ACTIVITY_TYPES.REGISTRATION_REJECTED,
        actorRole: 'turf-owner',
        actorName: owner?.name || 'Turf Owner',
        message: `Registration ${request.status} for ${request.sportId || 'sport'}`,
        targetPath: '/admin/registrations',
        meta: { requestId: request.id },
        createdAt: request.respondedAt,
      });
    });

  seed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  state.activities = seed.slice(0, 200);
  saveDemoState(state);
  return state.activities;
};