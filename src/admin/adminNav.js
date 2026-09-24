// Central navigation model for the Admin Panel.
//
// Keeping the information architecture in one data structure means the sidebar,
// the mobile drawer, the active-route logic and the breadcrumb all read from a
// single source. Add or reorder items here and the whole shell follows.

export const ADMIN_BASE = '/admin';

// A leaf entry has { id, label, path, icon }. A group adds `children` and is
// rendered as an expandable section instead of a direct link.
export const adminNav = [
  { id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: 'grid' },
  {
    id: 'tournaments',
    label: 'Tournaments',
    icon: 'trophy',
    children: [
      { id: 'tournaments-all', label: 'All Tournaments', path: '/admin/tournaments?view=all' },
      { id: 'tournaments-create', label: 'Create Tournament', path: '/admin/tournaments?view=create' },
      { id: 'tournaments-upcoming', label: 'Upcoming', path: '/admin/tournaments?view=upcoming' },
      { id: 'tournaments-ongoing', label: 'Ongoing', path: '/admin/tournaments?view=ongoing' },
      { id: 'tournaments-completed', label: 'Completed', path: '/admin/tournaments?view=completed' },
      { id: 'tournaments-cancelled', label: 'Cancelled', path: '/admin/tournaments?view=cancelled' },
    ],
  },
  { id: 'registrations', label: 'Registrations', path: '/admin/registrations', icon: 'clipboard' },
  { id: 'players', label: 'Players', path: '/admin/players', icon: 'users' },
  { id: 'teams', label: 'Teams', path: '/admin/teams', icon: 'shield' },
  { id: 'turf-owners', label: 'Turf Owners', path: '/admin/turf-owners', icon: 'badge' },
  { id: 'turfs', label: 'Turfs', path: '/admin/turfs', icon: 'turf' },
  { id: 'matches', label: 'Matches & Results', path: '/admin/matches', icon: 'vs' },
  { id: 'reports', label: 'Reports', path: '/admin/reports', icon: 'chart' },
  { id: 'notifications', label: 'Notifications', path: '/admin/notifications', icon: 'bell' },
  { id: 'activity', label: 'Activity Logs', path: '/admin/activity', icon: 'pulse' },
  { id: 'settings', label: 'Settings', path: '/admin/settings', icon: 'cog' },
  { id: 'profile', label: 'Admin Profile', path: '/admin/profile', icon: 'user' },
];

// Split a path into the parts used for matching. Query strings are ignored for
// matching so a sub-view (?view=upcoming) still highlights its parent section.
export const splitAdminPath = (href = '') => {
  const [pathname] = String(href).split('?');
  return pathname.replace(/\/+$/, '') || '/';
};

const isActive = (href, currentPath, currentSearch) => {
  const target = splitAdminPath(href);
  const cleanCurrent = splitAdminPath(currentPath);

  if (target === '/admin/tournaments') {
    // The whole Tournaments group stays open for any of its sub-views.
    if (!cleanCurrent.startsWith('/admin/tournaments')) return false;
    const targetQuery = new URLSearchParams(href.split('?')[1] || '');
    // A specific sub-view only matches when the query also matches.
    if (targetQuery.get('view')) {
      const currentView = new URLSearchParams(currentSearch || '').get('view') || 'all';
      return currentView === targetQuery.get('view');
    }
    return true;
  }

  if (target === '/admin/dashboard') return cleanCurrent === '/admin' || cleanCurrent === '/admin/dashboard';
  return cleanCurrent === target;
};

// Resolve which nav item (leaf or group) is currently active.
export const resolveActiveNav = (path, search = '') => {
  for (const item of adminNav) {
    if (item.children) {
      if (item.children.some((child) => isActive(child.path, path, search))) return item.id;
    } else if (isActive(item.path, path, search)) {
      return item.id;
    }
  }
  return null;
};

// Human-friendly title + breadcrumb for the header, derived from the same model.
export const resolvePageMeta = (path, search = '') => {
  const clean = splitAdminPath(path);

  // Deep pages that are not nav leaves get their own title/breadcrumb.
  if (clean === '/admin/tournaments/create') {
    return { title: 'Create Tournament', crumbs: ['Admin', 'Tournaments', 'Create Tournament'] };
  }
  if (clean.startsWith('/admin/tournaments/')) {
    return { title: 'Tournament Detail', crumbs: ['Admin', 'Tournaments', 'Tournament Detail'] };
  }

  for (const item of adminNav) {
    if (item.children) {
      const activeChild = item.children.find((child) => isActive(child.path, path, search));
      if (activeChild) {
        return { title: activeChild.label, crumbs: ['Admin', item.label, activeChild.label] };
      }
      continue;
    }
    if (isActive(item.path, path, search)) {
      return { title: item.label, crumbs: ['Admin', item.label] };
    }
  }

  return { title: 'Admin Panel', crumbs: ['Admin'] };
};