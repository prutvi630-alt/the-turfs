import { getDemoState, saveDemoState } from './demoStore';
import { ACTIVITY_TYPES, recordActivity } from './activityStore';

// ---------------------------------------------------------------------------
// Admin account management
// ---------------------------------------------------------------------------
// Mutations the Admin Panel performs over the EXISTING player / turf-owner
// accounts. These never change the account's role or its dashboard behaviour
// beyond visibility — they only flip an `active` flag (already honoured by the
// login layer via `active !== false`) and record an audit entry.
//
// Status model:
//   - players: 'active' | 'suspended'   (derived from active !== false)
//   - owners:  'active' | 'suspended' | 'pending' (pending until approved)
//
// A future backend would replace these functions with API calls; the UI only
// talks to this module, never to localStorage directly.

export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
};

export const accountStatus = (account = {}) => {
  if (account.active === false) return ACCOUNT_STATUS.SUSPENDED;
  if (account.status === ACCOUNT_STATUS.PENDING) return ACCOUNT_STATUS.PENDING;
  return ACCOUNT_STATUS.ACTIVE;
};

const fullPlayerName = (player = {}) =>
  `${player.firstName || ''} ${player.surname || ''}`.trim() || 'Player';

/**
 * Apply a status change to a player or owner inside demo state.
 *
 * @param {'player'|'owner'} kind
 * @param {string} id
 * @param {'active'|'suspended'|'pending'} status
 * @param {{ reason?: string, actorName?: string }} [options]
 * @returns {{ ok: boolean, account?: object, error?: string }}
 */
export const setAccountStatus = (kind, id, status, options = {}) => {
  const state = getDemoState();
  const collection = kind === 'owner' ? 'owners' : 'players';
  const account = (state[collection] || []).find((item) => item.id === id);

  if (!account) return { ok: false, error: 'Account not found.' };

  account.active = status !== ACCOUNT_STATUS.SUSPENDED;
  if (status === ACCOUNT_STATUS.PENDING) {
    account.active = true;
    account.status = ACCOUNT_STATUS.PENDING;
  } else {
    account.status = status;
  }
  account.statusUpdatedAt = new Date().toISOString();
  if (status === ACCOUNT_STATUS.SUSPENDED) account.suspensionReason = options.reason || '';
  else delete account.suspensionReason;

  const label = kind === 'owner' ? account.name : fullPlayerName(account);
  const names = { [ACCOUNT_STATUS.SUSPENDED]: 'suspended', [ACCOUNT_STATUS.ACTIVE]: 'activated', [ACCOUNT_STATUS.PENDING]: 'marked pending' };
  const typeMap = {
    [ACCOUNT_STATUS.SUSPENDED]: ACTIVITY_TYPES.ACCOUNT_SUSPENDED,
    [ACCOUNT_STATUS.ACTIVE]: ACTIVITY_TYPES.ACCOUNT_ACTIVATED,
    [ACCOUNT_STATUS.PENDING]: ACTIVITY_TYPES.ACCOUNT_PENDING,
  };

  recordActivity({
    state,
    type: typeMap[status],
    actorRole: 'admin',
    actorName: options.actorName || 'Platform Admin',
    message: `${kind === 'owner' ? 'Turf owner' : 'Player'} ${label} ${names[status]}`,
    targetPath: kind === 'owner' ? '/admin/turf-owners' : '/admin/players',
    meta: { kind, id, reason: options.reason || '' },
  });

  saveDemoState(state);
  return { ok: true, account };
};

/**
 * Update editable profile fields for a player or owner. Only a safe subset of
 * fields can be edited from the admin panel.
 */
export const updateAccountProfile = (kind, id, patch, options = {}) => {
  const state = getDemoState();
  const collection = kind === 'owner' ? 'owners' : 'players';
  const account = (state[collection] || []).find((item) => item.id === id);
  if (!account) return { ok: false, error: 'Account not found.' };

  const allowed = kind === 'owner'
    ? ['name', 'email', 'mobile']
    : ['firstName', 'surname', 'email', 'mobile', 'sportId', 'house', 'street', 'city', 'state', 'pincode'];

  Object.entries(patch).forEach(([key, value]) => {
    if (allowed.includes(key)) account[key] = typeof value === 'string' ? value.trim() : value;
  });
  account.updatedAt = new Date().toISOString();

  const label = kind === 'owner' ? account.name : fullPlayerName(account);
  recordActivity({
    state,
    type: ACTIVITY_TYPES.ACCOUNT_UPDATED,
    actorRole: 'admin',
    actorName: options.actorName || 'Platform Admin',
    message: `${kind === 'owner' ? 'Turf owner' : 'Player'} ${label} details updated`,
    targetPath: kind === 'owner' ? '/admin/turf-owners' : '/admin/players',
    meta: { kind, id },
  });

  saveDemoState(state);
  return { ok: true, account };
};

/** Players can only be suspended once they exist; owners may need approval first. */
export const approveOwner = (id, options = {}) => setAccountStatus('owner', id, ACCOUNT_STATUS.ACTIVE, options);