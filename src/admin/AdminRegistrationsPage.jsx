import { useMemo, useState } from 'react';
import AdminIcon from './AdminIcon';
import { ConfirmDialog, FilterSelect, SearchInput, StatusPill, Toast } from './AdminUI';
import { getAllTournaments } from '../data/dashboardSelectors';
import { approveRegistration, getRegistrationRows, rejectRegistration, removeRegistration } from '../data/adminRegistrations';

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const navigate = (href) => { window.location.href = href; };

function RegistrationActions({ row, onAction }) {
  return (
    <div className="admin-row-actions">
      <button type="button" className="admin-icon-action" title="View" aria-label={`View ${row.teamName}`} onClick={() => onAction('view')}><AdminIcon name="eye" size={15} /></button>
      {row.status === 'pending' && <>
        <button type="button" className="admin-icon-action ok" title="Approve" aria-label={`Approve ${row.teamName}`} onClick={() => onAction('approve')}><AdminIcon name="check" size={15} /></button>
        <button type="button" className="admin-icon-action danger" title="Reject" aria-label={`Reject ${row.teamName}`} onClick={() => onAction('reject')}><AdminIcon name="close" size={15} /></button>
      </>}
      {row.status !== 'cancelled' && <button type="button" className="admin-icon-action danger" title="Remove" aria-label={`Remove ${row.teamName}`} onClick={() => onAction('remove')}><AdminIcon name="ban" size={15} /></button>}
    </div>
  );
}

export default function AdminRegistrationsPage({ tournamentId = null }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [tournament, setTournament] = useState('All');
  const [sport, setSport] = useState('All');
  const [status, setStatus] = useState('All');
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState(null);
  const rows = useMemo(() => getRegistrationRows(), [refreshKey]);
  const tournaments = useMemo(() => getAllTournaments(), [refreshKey]);
  const tournamentOptions = ['All', ...tournaments.map((item) => item.name)];
  const sports = ['All', ...new Set(tournaments.map((item) => item.sport))];
  const filtered = rows.filter((row) => {
    const haystack = [row.teamName, row.captain, row.tournamentName, ...(row.players || [])].join(' ').toLowerCase();
    return (!query || haystack.includes(query.toLowerCase()))
      && (tournament === 'All' || row.tournamentName === tournament)
      && (sport === 'All' || row.tournament?.sport === sport)
      && (status === 'All' || row.status === status)
      && (!tournamentId || row.tournamentId === tournamentId);
  });

  const refresh = () => { setRefreshKey((value) => value + 1); setSelected(null); setConfirm(null); setRejectReason(''); };
  const execute = (action, row, reason = '') => {
    const result = action === 'approve' ? approveRegistration(row.id) : action === 'reject' ? rejectRegistration(row.id, reason) : removeRegistration(row.id);
    if (!result.ok) setToast({ tone: 'danger', title: 'Action unavailable', text: result.error });
    else setToast({ tone: action === 'approve' ? 'success' : 'warn', title: `Registration ${action}d`, text: row.teamName });
    refresh();
  };

  return (
    <div className="admin-list-page">
      <div className="admin-dash-head">
        <div><span className="section-kicker">REGISTRATIONS</span><h2>{tournamentId ? 'Tournament registrations' : 'Registration management'}</h2><p>Review every team application and keep tournament capacity current.</p></div>
        <div className="admin-stat-mini-grid registration-summary"><div className="admin-stat-mini"><strong>{filtered.length}</strong><span>Showing</span></div><div className="admin-stat-mini"><strong>{rows.filter((row) => row.status === 'pending').length}</strong><span>Pending</span></div></div>
      </div>
      <div className="admin-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search team, captain or player..." />
        {!tournamentId && <FilterSelect label="Tournament" value={tournament} options={tournamentOptions} onChange={setTournament} />}
        <FilterSelect label="Sport" value={sport} options={sports} onChange={setSport} />
        <FilterSelect label="Status" value={status} options={['All', 'pending', 'approved', 'rejected', 'cancelled']} onChange={setStatus} />
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table registrations-table"><thead><tr><th>Tournament</th><th>Team</th><th>Captain</th><th>Players</th><th>Registered On</th><th>Status</th><th className="admin-col-actions">Actions</th></tr></thead><tbody>
          {filtered.map((row) => <tr key={row.id}>
            <td data-label="Tournament"><button type="button" className="admin-link-btn" onClick={() => navigate(`/admin/tournaments/${row.tournamentId}`)}>{row.tournamentName}</button><small className="admin-cell-muted">{row.tournament?.sport || '—'}</small></td>
            <td data-label="Team"><button type="button" className="admin-cell-person" onClick={() => setSelected(row)}><span className="admin-avatar"><AdminIcon name="shield" size={16} /></span><span className="admin-cell-person-text"><strong>{row.teamName}</strong><small>{row.entryFee || 'No fee recorded'}</small></span></button></td>
            <td data-label="Captain">{row.captain}</td><td data-label="Players"><span className="admin-count-badge">{row.players?.length || 0}</span></td><td data-label="Registered On"><span className="admin-cell-muted">{formatDate(row.registeredAt)}</span></td><td data-label="Status"><StatusPill status={row.status} /></td>
            <td data-label="Actions" className="admin-col-actions"><RegistrationActions row={row} onAction={(action) => action === 'view' ? setSelected(row) : setConfirm({ action, row })} /></td>
          </tr>)}
        </tbody></table>
        {!filtered.length && <div className="admin-empty"><strong>No registrations found</strong><p>Adjust the search or filters to find another application.</p></div>}
      </div>
      {selected && <RegistrationDetail row={selected} onClose={() => setSelected(null)} onAction={(action) => setConfirm({ action, row: selected })} />}
      {confirm && <ConfirmDialog open title={`${confirm.action === 'reject' ? 'Reject' : 'Remove'} registration?`} message={confirm.action === 'reject' ? `${confirm.row.teamName} will be marked rejected. You can keep the optional reason in the audit trail.` : `${confirm.row.teamName} will be removed from this tournament registration list. Player and team records are not deleted.`} onCancel={() => setConfirm(null)} onConfirm={() => execute(confirm.action, confirm.row, rejectReason)}>{confirm.action === 'reject' && <textarea className="admin-confirm-reason" rows={3} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Reason (optional)" />}</ConfirmDialog>}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function RegistrationDetail({ row, onClose, onAction }) {
  return <div className="admin-inline-detail"><div className="admin-inline-detail-head"><div><span className="section-kicker">REGISTRATION DETAIL</span><h3>{row.teamName}</h3><p>{row.tournamentName}</p></div><button type="button" className="admin-icon-action" onClick={onClose} aria-label="Close details"><AdminIcon name="close" size={16} /></button></div><div className="admin-detail-grid"><DetailField label="Tournament" value={row.tournamentName} /><DetailField label="Captain" value={row.captain} /><DetailField label="Registration date" value={formatDate(row.registeredAt)} /><DetailField label="Entry fee" value={row.entryFee || '—'} /><DetailField label="Status" value={row.status} /></div><div className="admin-inline-players"><strong>Players</strong><span>{(row.players || []).join(' · ') || 'No players listed'}</span></div><div className="admin-detail-actions"><button type="button" className="btn btn-secondary admin-action-btn" onClick={() => navigate(`/admin/tournaments/${row.tournamentId}`)}>Open tournament</button>{row.status === 'pending' && <><button type="button" className="btn btn-primary admin-action-btn" onClick={() => onAction('approve')}>Approve</button><button type="button" className="btn admin-btn-danger" onClick={() => onAction('reject')}>Reject</button></>}{row.status !== 'cancelled' && <button type="button" className="btn admin-btn-danger" onClick={() => onAction('remove')}>Remove</button>}</div></div>;
}

function DetailField({ label, value }) {
  return <div className="admin-detail-field"><span>{label}</span><strong>{value || '—'}</strong></div>;
}
