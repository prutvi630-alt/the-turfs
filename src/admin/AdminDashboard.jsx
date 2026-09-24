import { useEffect, useState } from 'react';
import AdminIcon from './AdminIcon';
import {
  getDashboardSummary,
  getRecentActivities,
  getAllTournaments,
  tournamentStage,
  timeAgo,
} from '../data/dashboardSelectors';
import { ACTIVITY_ICONS, seedActivities } from '../data/activityStore';

// AdminDashboard — the /admin (and /admin/dashboard) screen.
//
// Every figure is computed from the shared demo data layer via
// dashboardSelectors; nothing here is hardcoded. Cards and quick actions both
// navigate to the relevant management section, and the activity feed is read
// from the activity stream (activityStore).

const navigate = (href) => { window.location.href = href; };

// Summary cards: title, icon, the selector key that supplies the value, and the
// admin section the card navigates to. Adding a card here is all it takes.
const SUMMARY_CARDS = [
  { id: 'players', label: 'Total Players', icon: 'users', valueKey: 'players', path: '/admin/players' },
  { id: 'turf-owners', label: 'Total Turf Owners', icon: 'badge', valueKey: 'turfOwners', path: '/admin/turf-owners' },
  { id: 'turfs', label: 'Total Turfs', icon: 'turf', valueKey: 'turfs', path: '/admin/turfs' },
  { id: 'teams', label: 'Total Teams', icon: 'shield', valueKey: 'teams', path: '/admin/teams' },
  { id: 'tournaments', label: 'Total Tournaments', icon: 'trophy', valueKey: 'tournaments', path: '/admin/tournaments?view=all' },
  { id: 'upcoming', label: 'Upcoming Tournaments', icon: 'chart', valueKey: 'upcomingTournaments', path: '/admin/tournaments?view=upcoming' },
  { id: 'ongoing', label: 'Ongoing Tournaments', icon: 'pulse', valueKey: 'ongoingTournaments', path: '/admin/tournaments?view=ongoing' },
  { id: 'pending', label: 'Pending Registrations', icon: 'clipboard', valueKey: 'pendingRegistrations', path: '/admin/registrations' },
];

// Quick actions: every button navigates somewhere real in the admin panel.
const QUICK_ACTIONS = [
  { id: 'create-tournament', label: 'Create Tournament', icon: 'trophy', path: '/admin/tournaments?view=create', primary: true },
  { id: 'add-turf', label: 'Add Turf', icon: 'turf', path: '/admin/turfs' },
  { id: 'view-registrations', label: 'View Registrations', icon: 'clipboard', path: '/admin/registrations' },
  { id: 'view-players', label: 'View Players', icon: 'users', path: '/admin/players' },
  { id: 'view-teams', label: 'View Teams', icon: 'shield', path: '/admin/teams' },
];

function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tournamentStages, setTournamentStages] = useState(null);

  // Simulate the async read a real backend call would make, so the loading
  // state is exercised and future API integration needs no UI changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Ensure a starting feed exists (derived from seeded records only).
    seedActivities();

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setSummary(getDashboardSummary());
      setActivities(getRecentActivities(6));
      setTournamentStages(getAllTournaments().map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        sport: tournament.sport,
        dateLabel: tournament.dateLabel,
        stage: tournamentStage(tournament),
      })));
      setLoading(false);
    }, 260);

    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);

  if (loading || !summary) return <DashboardSkeleton />;
  return (
    <div className="admin-dashboard">
      <div className="admin-dash-head">
        <div>
          <span className="section-kicker">OVERVIEW</span>
          <h2>Here’s the platform at a glance.</h2>
          <p>Live figures computed from the current platform data.</p>
        </div>
        <div className="admin-dash-head-actions">
          <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => navigate('/admin/reports')}>
            <AdminIcon name="chart" size={16} /> View Reports
          </button>
        </div>
      </div>

      {/* 1. Summary cards */}
      <section aria-label="Platform summary">
        <div className="admin-summary-grid">
          {SUMMARY_CARDS.map((card) => (
            <button
              type="button"
              className="admin-summary-card"
              key={card.id}
              onClick={() => navigate(card.path)}
            >
              <span className="admin-summary-icon"><AdminIcon name={card.icon} size={20} /></span>
              <span className="admin-summary-body">
                <strong>{summary[card.valueKey]}</strong>
                <span>{card.label}</span>
              </span>
              <span className="admin-summary-arrow" aria-hidden="true"><AdminIcon name="chevron" size={16} /></span>
            </button>
          ))}
        </div>
      </section>

      <div className="admin-dash-columns">
        {/* 2. Tournament overview */}
        <section className="admin-panel" aria-label="Tournament overview">
          <div className="admin-panel-head">
            <div>
              <span className="section-kicker">TOURNAMENTS</span>
              <h3>Tournament overview</h3>
            </div>
            <button type="button" className="admin-link-btn" onClick={() => navigate('/admin/tournaments?view=all')}>View all</button>
          </div>

          <div className="admin-lifecycle-grid">
            <LifecycleStat label="Upcoming" value={summary.upcomingTournaments} tone="upcoming" onClick={() => navigate('/admin/tournaments?view=upcoming')} />
            <LifecycleStat label="Ongoing" value={summary.ongoingTournaments} tone="ongoing" onClick={() => navigate('/admin/tournaments?view=ongoing')} />
            <LifecycleStat label="Completed" value={summary.completedTournaments} tone="completed" onClick={() => navigate('/admin/tournaments?view=completed')} />
            <LifecycleStat label="Cancelled" value={summary.cancelledTournaments} tone="cancelled" onClick={() => navigate('/admin/tournaments?view=cancelled')} />
          </div>

          {tournamentStages && tournamentStages.length > 0 ? (
            <ul className="admin-tournament-list">
              {tournamentStages.slice(0, 5).map((tournament) => (
                <li key={tournament.id}>
                  <button type="button" onClick={() => navigate(`/admin/tournaments?view=${tournament.stage}`)}>
                    <span className="admin-tournament-name">
                      <strong>{tournament.name}</strong>
                      <small>{tournament.sport} · {tournament.dateLabel}</small>
                    </span>
                    <span className={`admin-stage-pill tone-${tournament.stage}`}>{tournament.stage}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="trophy"
              title="No tournaments yet"
              text="Create your first tournament to see it appear here."
              action={{ label: 'Create Tournament', path: '/admin/tournaments?view=create' }}
            />
          )}
        </section>

        {/* 3. Recent activity */}
        <section className="admin-panel" aria-label="Recent activity">
          <div className="admin-panel-head">
            <div>
              <span className="section-kicker">ACTIVITY</span>
              <h3>Recent activity</h3>
            </div>
            <button type="button" className="admin-link-btn" onClick={() => navigate('/admin/activity')}>View all</button>
          </div>

          {activities.length > 0 ? (
            <ul className="admin-activity-list">
              {activities.map((activity) => (
                <li key={activity.id}>
                  <span className="admin-activity-icon"><AdminIcon name={ACTIVITY_ICONS[activity.type] || 'pulse'} size={16} /></span>
                  <span className="admin-activity-body">
                    <strong>{activity.message}</strong>
                    <small>{activity.actorName} · {timeAgo(activity.createdAt)}</small>
                  </span>
                  {activity.targetPath && (
                    <button type="button" className="admin-activity-go" onClick={() => navigate(activity.targetPath)} aria-label="Open related section">
                      <AdminIcon name="chevron" size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="pulse"
              title="No activity yet"
              text="Platform events will appear here as players register, turfs are added and tournaments are created."
            />
          )}
        </section>
      </div>

      {/* 4. Quick actions */}
      <section className="admin-panel" aria-label="Quick actions">
        <div className="admin-panel-head">
          <div>
            <span className="section-kicker">SHORTCUTS</span>
            <h3>Quick actions</h3>
          </div>
        </div>
        <div className="admin-quick-actions">
          {QUICK_ACTIONS.map((action) => (
            <button
              type="button"
              key={action.id}
              className={`admin-quick-btn ${action.primary ? 'is-primary' : ''}`}
              onClick={() => navigate(action.path)}
            >
              <AdminIcon name={action.icon} size={18} />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function LifecycleStat({ label, value, tone, onClick }) {
  return (
    <button type="button" className={`admin-lifecycle-stat tone-${tone}`} onClick={onClick}>
      <strong>{value}</strong>
      <span>{label}</span>
    </button>
  );
}

function EmptyState({ icon, title, text, action }) {
  return (
    <div className="admin-empty">
      <span className="admin-empty-icon"><AdminIcon name={icon} size={20} /></span>
      <strong>{title}</strong>
      <p>{text}</p>
      {action && (
        <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => navigate(action.path)}>
          {action.label}
        </button>
      )}
    </div>
  );
}

// Skeleton shown while the (simulated) data read completes. Mirrors the real
// layout so there is no shift when content arrives.
function DashboardSkeleton() {
  return (
    <div className="admin-dashboard" aria-busy="true" aria-live="polite">
      <div className="admin-dash-head">
        <div>
          <span className="admin-skel admin-skel-kicker" />
          <span className="admin-skel admin-skel-title" />
          <span className="admin-skel admin-skel-sub" />
        </div>
      </div>
      <div className="admin-summary-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <div className="admin-summary-card is-skeleton" key={`sk-${index}`}>
            <span className="admin-skel admin-skel-icon" />
            <span className="admin-summary-body">
              <span className="admin-skel admin-skel-num" />
              <span className="admin-skel admin-skel-label" />
            </span>
          </div>
        ))}
      </div>
      <div className="admin-dash-columns">
        <div className="admin-panel"><span className="admin-skel admin-skel-block" /></div>
        <div className="admin-panel"><span className="admin-skel admin-skel-block" /></div>
      </div>
      <span className="admin-visually-hidden">Loading dashboard data…</span>
    </div>
  );
}

export default AdminDashboard;