import AdminLayout from './AdminLayout';
import AdminIcon from './AdminIcon';
import AdminDashboard from './AdminDashboard';
import PlayersPage from './PlayersPage';
import TurfOwnersPage from './TurfOwnersPage';
import TurfsPage from './TurfsPage';
import TurfsCreatePage from './TurfsCreatePage';
import TeamsPage from './TeamsPage';
import TournamentsPage from './TournamentsPage';
import TournamentFormPage from './TournamentFormPage';
import { splitAdminPath } from './adminNav';
import AdminRegistrationsPage from './AdminRegistrationsPage';
import TournamentDetailPage from './TournamentDetailPage';
import MatchesPage from './MatchesPage';
import ReportsPage from './ReportsPage';
import NotificationsPage from './NotificationsPage';
import ActivityPage from './ActivityPage';
import { getUnreadNotificationCount } from '../data/activityStore';
import SettingsPage from './SettingsPage';

// AdminPage resolves the current /admin/* URL to a section and renders it inside
// the shared AdminLayout.
//
// This milestone builds the SHELL only: authentication, protection, layout,
// sidebar and routing. The individual modules (Dashboard, Players, Tournaments,
// ...) are intentionally stubbed here so they can be implemented one at a time
// in later parts without touching the layout or the route protection.
//
// Each stub reads from the same demo data layer the rest of the app uses, so it
// already behaves like a real (empty/placeholder) screen rather than a mock.

const sectionMeta = {
  '/admin/dashboard': { kicker: 'OVERVIEW', title: 'PLATFORM DASHBOARD', text: 'Key platform metrics, recent activity and quick actions will appear here.' },
  '/admin/tournaments': { kicker: 'TOURNAMENTS', title: 'TOURNAMENT MANAGEMENT', text: 'Create, schedule and manage tournaments across every stage of their lifecycle.' },
  '/admin/registrations': { kicker: 'REGISTRATIONS', title: 'REGISTRATIONS', text: 'Review player, team and tournament registrations awaiting approval.' },
  '/admin/players': { kicker: 'PLAYERS', title: 'PLAYER MANAGEMENT', text: 'Search, verify and manage every registered player on the platform.' },
  '/admin/teams': { kicker: 'TEAMS', title: 'TEAM MANAGEMENT', text: 'Teams created by turf owners and their squads will be managed here.' },
  '/admin/turf-owners': { kicker: 'TURF OWNERS', title: 'TURF OWNER MANAGEMENT', text: 'Verify turf owners and manage their access to the platform.' },
  '/admin/turfs': { kicker: 'TURFS', title: 'TURF MANAGEMENT', text: 'Approve and manage every registered venue and its listing details.' },
  '/admin/matches': { kicker: 'MATCHES & RESULTS', title: 'MATCHES & RESULTS', text: 'Schedule matches and publish results for every tournament.' },
  '/admin/reports': { kicker: 'REPORTS', title: 'REPORTS & ANALYTICS', text: 'Platform-wide reporting and downloadable summaries will live here.' },
  '/admin/notifications': { kicker: 'NOTIFICATIONS', title: 'NOTIFICATIONS', text: 'Compose and broadcast notifications to players, owners and teams.' },
  '/admin/activity': { kicker: 'ACTIVITY', title: 'ACTIVITY LOGS', text: 'A chronological audit trail of administrative actions.' },
  '/admin/settings': { kicker: 'SETTINGS', title: 'PLATFORM SETTINGS', text: 'Configure platform-wide defaults, sports and operational settings.' },
  '/admin/profile': { kicker: 'ACCOUNT', title: 'ADMIN PROFILE', text: 'Manage your administrator account details and preferences.' },
};

function AdminPage({ admin, state, logout }) {
  const path = window.location.pathname.replace(/^\/Turfview-/, '') || '/';
  const clean = splitAdminPath(path);
  // Any deeper path (e.g. /admin/tournaments/123) maps to its parent section.
  const base = clean === '/admin' ? '/admin/dashboard' : clean;
  const tournamentId = clean.startsWith('/admin/tournaments/') ? clean.split('/')[3] : null;
  const meta = sectionMeta[base] || {
    kicker: 'ADMIN',
    title: 'SECTION NOT FOUND',
    text: 'This admin section is not available yet.',
  };

  // Notification badge reflects real pending work rather than a static number.
  const notificationCount = getUnreadNotificationCount();

  // Dashboard is fully implemented; other sections remain scaffolded until
  // their own milestone.
  if (base === '/admin/dashboard') {
    return (
      <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}>
        <AdminDashboard />
      </AdminLayout>
    );
  }

  if (base === '/admin/players') {
    return (
      <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}>
        <PlayersPage />
      </AdminLayout>
    );
  }

  if (base === '/admin/turf-owners') {
    return (
      <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}>
        <TurfOwnersPage />
      </AdminLayout>
    );
  }

  if (base === '/admin/turfs/create') {
    return (
      <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}>
        <TurfsCreatePage />
      </AdminLayout>
    );
  }

  if (base === '/admin/turfs') {
    return (
      <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}>
        <TurfsPage />
      </AdminLayout>
    );
  }

  if (base === '/admin/teams') {
    return (
      <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}>
        <TeamsPage />
      </AdminLayout>
    );
  }

  if (base === '/admin/matches') {
    return <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}><MatchesPage /></AdminLayout>;
  }

  if (base === '/admin/reports') {
    return <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}><ReportsPage /></AdminLayout>;
  }

  if (base === '/admin/notifications') {
    return <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}><NotificationsPage /></AdminLayout>;
  }

  if (base === '/admin/activity') {
    return <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}><ActivityPage /></AdminLayout>;
  }

  if (base === '/admin/settings') {
    return <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}><SettingsPage admin={admin} logout={logout} /></AdminLayout>;
  }

  if (base === '/admin/profile') {
    return <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}><SettingsPage admin={admin} logout={logout} /></AdminLayout>;
  }

  if (base === '/admin/tournaments/create') {
    return (
      <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}>
        <TournamentFormPage />
      </AdminLayout>
    );
  }

  if (base === '/admin/tournaments' && new URLSearchParams(window.location.search).get('view') === 'create') {
    return <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}><TournamentFormPage /></AdminLayout>;
  }

  if (base === '/admin/tournaments') {
    return (
      <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}>
        <TournamentsPage />
      </AdminLayout>
    );
  }

  if (clean.startsWith('/admin/tournaments/') && tournamentId) {
    return <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}><TournamentDetailPage tournamentId={tournamentId} /></AdminLayout>;
  }

  if (base === '/admin/registrations') {
    return <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}><AdminRegistrationsPage /></AdminLayout>;
  }

  return (
    <AdminLayout admin={admin} notificationCount={notificationCount} onLogout={logout}>
      <div className="admin-page">
        <div className="admin-page-hero">
          <div className="admin-page-hero-copy">
            <span className="section-kicker">{meta.kicker}</span>
            <h2>{meta.title}</h2>
            <p>{meta.text}</p>
          </div>
          <div className="admin-page-hero-actions">
            <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => { window.location.href = '/admin/settings'; }}>
              <AdminIcon name="cog" size={16} /> Settings
            </button>
            <button type="button" className="btn btn-primary admin-action-btn" onClick={() => { window.location.href = '/admin/tournaments?view=create'; }}>
              <AdminIcon name="trophy" size={16} /> New Tournament
            </button>
          </div>
        </div>

        <section className="admin-placeholder" aria-label="Module placeholder">
          <span className="admin-placeholder-icon"><AdminIcon name="grid" size={22} /></span>
          <h3>Coming in the next milestone</h3>
          <p>
            The admin shell, protected routing and navigation are live. This module is
            scaffolded and will be implemented in a following part.
          </p>
          {state && (
            <div className="admin-placeholder-stats">
              <span><strong>{(state.players || []).length}</strong> players</span>
              <span><strong>{(state.owners || []).length}</strong> turf owners</span>
              <span><strong>{(state.registeredTurfs || []).length}</strong> registered turfs</span>
              <span><strong>{(state.teams || []).length}</strong> teams</span>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminPage;