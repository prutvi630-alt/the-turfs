import { useMemo, useState } from 'react';
import AdminIcon from './AdminIcon';
import { getReportSummary } from '../data/reportSelectors';

const groups = [
  { key: 'players', label: 'Players', icon: 'users', items: [['total', 'Total'], ['active', 'Active'], ['suspended', 'Suspended'], ['new', 'New']] },
  { key: 'owners', label: 'Turf Owners', icon: 'badge', items: [['total', 'Total'], ['active', 'Active'], ['pending', 'Pending'], ['suspended', 'Suspended']] },
  { key: 'turfs', label: 'Turfs', icon: 'turf', items: [['total', 'Total'], ['active', 'Active'], ['pending', 'Pending'], ['suspended', 'Suspended']] },
  { key: 'teams', label: 'Teams', icon: 'shield', items: [['total', 'Total'], ['active', 'Active'], ['suspended', 'Suspended']] },
  { key: 'tournaments', label: 'Tournaments', icon: 'trophy', items: [['total', 'Total'], ['upcoming', 'Upcoming'], ['ongoing', 'Ongoing'], ['completed', 'Completed'], ['cancelled', 'Cancelled']] },
  { key: 'registrations', label: 'Registrations', icon: 'clipboard', items: [['total', 'Total'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['cancelled', 'Cancelled']] },
];

export default function ReportsPage() {
  const [refresh, setRefresh] = useState(0);
  const summary = useMemo(() => getReportSummary(), [refresh]);
  return <div className="admin-list-page report-page">
    <div className="admin-dash-head"><div><span className="section-kicker">REPORTS & ANALYTICS</span><h2>Platform performance</h2><p>Live operational statistics calculated from the shared demo state.</p></div><button type="button" className="btn btn-secondary admin-action-btn" onClick={() => setRefresh((value) => value + 1)}><AdminIcon name="pulse" size={16} /> Refresh data</button></div>
    <div className="report-grid">{groups.map((group) => <ReportGroup key={group.key} group={group} values={summary[group.key]} />)}</div>
    <section className="admin-panel report-chart-panel"><div className="admin-panel-head"><div><span className="section-kicker">VISUAL SUMMARY</span><h3>Platform mix</h3></div><span className="admin-cell-muted">Relative to each category</span></div><div className="report-bars">{groups.map((group) => <div className="report-bar-row" key={group.key}><span>{group.label}</span><div className="report-bar-track"><span style={{ width: `${Math.min(100, (summary[group.key].total / Math.max(...groups.map((item) => summary[item.key].total), 1)) * 100)}%` }} /></div><strong>{summary[group.key].total}</strong></div>)}</div></section>
  </div>;
}

function ReportGroup({ group, values }) {
  return <section className="admin-panel report-group"><div className="admin-panel-head"><div className="report-group-title"><span className="admin-summary-icon"><AdminIcon name={group.icon} size={17} /></span><div><span className="section-kicker">{group.label.toUpperCase()}</span><h3>{group.label}</h3></div></div></div><div className="report-stat-grid">{group.items.map(([key, label]) => <div className="report-stat" key={key}><strong>{values[key] || 0}</strong><span>{label}</span></div>)}</div></section>;
}