import { getDemoState, saveDemoState } from './demoStore';
import { ACTIVITY_TYPES, recordActivity } from './activityStore';

export const getAdminSettings = () => {
  const state = getDemoState();
  const admin = state.admins?.[0] || {};
  return { admin, platform: state.platformSettings || {}, tournament: state.platformSettings?.tournament || {} };
};

export const updateAdminSettings = ({ profile = {}, platform = {}, tournament = {} } = {}) => {
  const state = getDemoState();
  const admin = state.admins?.[0];
  if (!admin) return { ok: false, error: 'Administrator account not found.' };
  ['name', 'email', 'phone', 'profileImage'].forEach((key) => {
    if (profile[key] !== undefined) admin[key] = String(profile[key]).trim();
  });
  state.platformSettings = {
    ...(state.platformSettings || {}), ...platform,
    tournament: { ...(state.platformSettings?.tournament || {}), ...tournament },
  };
  admin.updatedAt = new Date().toISOString();
  recordActivity({ state, type: ACTIVITY_TYPES.ACCOUNT_UPDATED, message: 'Admin settings updated', targetPath: '/admin/settings', meta: { settings: true } });
  saveDemoState(state);
  return { ok: true, settings: getAdminSettings() };
};

export const changeAdminPassword = (currentPassword, nextPassword) => {
  const state = getDemoState();
  const admin = state.admins?.[0];
  if (!admin || admin.password !== currentPassword) return { ok: false, error: 'Current password is incorrect.' };
  if (!nextPassword || nextPassword.length < 6) return { ok: false, error: 'New password must be at least 6 characters.' };
  admin.password = nextPassword;
  recordActivity({ state, type: ACTIVITY_TYPES.ACCOUNT_UPDATED, message: 'Admin password changed', targetPath: '/admin/settings', meta: { security: true } });
  saveDemoState(state);
  return { ok: true };
};