import { useEffect, useMemo, useRef, useState } from 'react';
import AdminIcon from './AdminIcon';
import {
  ConfirmDialog,
  Drawer,
  FilterSelect,
  Modal,
  Pagination,
  SearchInput,
  StatusPill,
  TableEmpty,
  Toast,
} from './AdminUI';
import { getTeamFilterOptions, getTeamRows } from '../data/turfSelectors';
import { TEAM_STATUS, setTeamStatus, updateTeam } from '../data/adminTurfs';
import { getDemoState } from '../data/demoStore';

// TeamsPage — /admin/teams
//
// Admin oversight of the EXISTING teams created by turf owners (state.teams).
// No player records are duplicated: a team references players by memberIds and
// the table/detail resolve those ids against the same state.players collection.

const PAGE_SIZE = 8;

const navigate = (href) => { window.location.href = href; };

function TeamsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const confirmReason = useRef('');

  const refresh = () => setRefreshKey((key) => key + 1);

  const rows = useMemo(() => getTeamRows(), [refreshKey]);
  const options = useMemo(() => getTeamFilterOptions(rows), [rows]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (normalized) {
        const haystack = [row.name, row.captain, row.sport].join(' ').toLowerCase();
        if (!haystack.includes(normalized)) return false;
      }
      if (sport !== 'All' && row.sport !== sport) return false;
      if (status !== 'All' && row.status !== status) return false;
      return true;
    });
  }, [rows, query, sport, status]);

  useEffect(() => { setPage(1); }, [query, sport, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selected = rows.find((row) => row.id === selectedId) || null;
  const editing = rows.find((row) => row.id === editId) || null;
  const hasFilters = query || sport !== 'All' || status !== 'All';

  const clearFilters = () => { setQuery(''); setSport('All'); setStatus('All'); };

  const applyStatus = (row, nextStatus, reason) => {
    const result = setTeamStatus(row.id, nextStatus, { reason });
    if (!result.ok) { setToast({ tone: 'danger', title: 'Action failed', text: result.error }); setConfirm(null); return; }
    setConfirm(null);
    refresh();
    setToast({
      tone: nextStatus === TEAM_STATUS.SUSPENDED ? 'warn' : 'success',
      title: nextStatus === TEAM_STATUS.SUSPENDED ? 'Team suspended' : 'Team activated',
      text: `${row.name} is now ${nextStatus}.`,
    });
  };

  const handleEditSave = (patch) => {
    const result = updateTeam(editId, patch);
    if (!result.ok) { setToast({ tone: 'danger', title: 'Update failed', text: result.error }); return; }
    setEditId(null);
    refresh();
    setToast({ tone: 'success', title: 'Team updated', text: 'Changes saved successfully.' });
  };

  return (
    <div className="admin-list-page">
      <div className="admin-dash-head">
        <div>
          <span className="section-kicker">TEAMS</span>
          <h2>Team management</h2>
          <p>Teams created by turf owners across the platform. {rows.length} total.</p>
        </div>
        <div className="admin-dash-head-actions">
          <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => navigate('/admin/turfs')}>
            <AdminIcon name="turf" size={16} /> Turfs
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search team, captain or sport…" />
        <div className="admin-toolbar-filters">
          <FilterSelect label="Sport" value={sport} options={options.sports} onChange={setSport} />
          <FilterSelect label="Status" value={status} options={options.statuses} onChange={setStatus} />
        </div>
        {hasFilters && <button type="button" className="admin-link-btn" onClick={clearFilters}>Clear all</button>}
      </div>

      {filtered.length === 0 ? (
        rows.length === 0 ? (
          <TableEmpty icon="shield" title="No teams yet" text="Teams created by turf owners will appear here for oversight." />
        ) : (
          <TableEmpty icon="search" title="No matching teams" text="No team matches the current search and filters."
            action={<button type="button" className="btn btn-secondary admin-action-btn" onClick={clearFilters}>Clear filters</button>} />
        )
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Team Name</th>
                  <th>Sport</th>
                  <th>Captain</th>
                  <th>Owner</th>
                  <th>Players</th>
                  <th>Tournament</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Team">
                      <button type="button" className="admin-cell-person" onClick={() => setSelectedId(row.id)}>
                        <span className="admin-avatar"><AdminIcon name="shield" size={16} /></span>
                        <span className="admin-cell-person-text">
                          <strong>{row.name}</strong>
                          <small>{row.turfName}</small>
                        </span>
                      </button>
                    </td>
                    <td data-label="Sport">{row.sport}</td>
                    <td data-label="Captain"><span className="admin-cell-muted">{row.captain}</span></td>
                    <td data-label="Owner"><span className="admin-cell-muted">{row.owner}</span></td>
                    <td data-label="Players"><span className="admin-count-badge">{row.playerCount}</span></td>
                    <td data-label="Tournament"><span className="admin-cell-muted">{row.tournament}</span></td>
                    <td data-label="Status"><StatusPill status={row.status} /></td>
                    <td data-label="Created"><span className="admin-cell-muted">{row.createdLabel}</span></td>
                    <td data-label="Actions" className="admin-col-actions">
                      <div className="admin-row-actions">
                        <button type="button" className="admin-icon-action" title="View" aria-label={`View ${row.name}`} onClick={() => setSelectedId(row.id)}>
                          <AdminIcon name="eye" size={15} />
                        </button>
                        <button type="button" className="admin-icon-action" title="Edit" aria-label={`Edit ${row.name}`} onClick={() => setEditId(row.id)}>
                          <AdminIcon name="edit" size={15} />
                        </button>
                        {row.status === TEAM_STATUS.SUSPENDED ? (
                          <button type="button" className="admin-icon-action ok" title="Activate" aria-label={`Activate ${row.name}`} onClick={() => setConfirm({ row, action: 'activate' })}>
                            <AdminIcon name="check" size={15} />
                          </button>
                        ) : (
                          <button type="button" className="admin-icon-action danger" title="Suspend" aria-label={`Suspend ${row.name}`} onClick={() => setConfirm({ row, action: 'suspend' })}>
                            <AdminIcon name="ban" size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={currentPage} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}

      <TeamDetailDrawer
        team={selected}
        onClose={() => setSelectedId(null)}
        onEdit={(id) => { setSelectedId(null); setEditId(id); }}
        onStatus={(row, action) => { setSelectedId(null); setConfirm({ row, action }); }}
      />

      <TeamEditModal team={editing} onClose={() => setEditId(null)} onSave={handleEditSave} />

      {confirm && (
        <ConfirmDialog
          open
          title={confirm.action === 'suspend' ? 'Suspend team?' : 'Activate team?'}
          tone={confirm.action === 'suspend' ? 'danger' : 'primary'}
          confirmLabel={confirm.action === 'suspend' ? 'Suspend team' : 'Activate team'}
          message={confirm.action === 'suspend'
            ? `${confirm.row.name} will be marked inactive. You can reactivate it at any time.`
            : `${confirm.row.name} will be active again.`}
          onCancel={() => setConfirm(null)}
          onConfirm={() => applyStatus(confirm.row, confirm.action === 'suspend' ? TEAM_STATUS.SUSPENDED : TEAM_STATUS.ACTIVE, confirmReason.current)}
        >
          {confirm.action === 'suspend' && (
            <label className="form-field">
              <span>Reason (optional)</span>
              <textarea rows={3} placeholder="e.g. Ineligible squad / duplicate entry" onChange={(event) => { confirmReason.current = event.target.value; }} />
            </label>
          )}
        </ConfirmDialog>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function TeamDetailDrawer({ team, onClose, onEdit, onStatus }) {
  if (!team) return null;
  const { performance } = team;

  return (
    <Drawer open title="Team details" onClose={onClose}>
      <div className="admin-detail-head">
        <span className="admin-detail-avatar placeholder"><AdminIcon name="shield" size={22} /></span>
        <div>
          <h3>{team.name}</h3>
          <p>{team.sport} · {team.turfName}</p>
          <StatusPill status={team.status} />
        </div>
      </div>

      {team.status === TEAM_STATUS.SUSPENDED && team.suspensionReason && (
        <div className="admin-detail-note danger"><strong>Suspension reason</strong><span>{team.suspensionReason}</span></div>
      )}

      <div className="admin-detail-actions">
        <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => onEdit(team.id)}>
          <AdminIcon name="edit" size={15} /> Edit
        </button>
        {team.status === TEAM_STATUS.SUSPENDED ? (
          <button type="button" className="btn btn-primary admin-action-btn" onClick={() => onStatus(team, 'activate')}>
            <AdminIcon name="check" size={15} /> Activate
          </button>
        ) : (
          <button type="button" className="btn admin-btn-danger" onClick={() => onStatus(team, 'suspend')}>
            <AdminIcon name="ban" size={15} /> Suspend
          </button>
        )}
      </div>

      <section className="admin-detail-section">
        <h4>Overview</h4>
        <div className="admin-detail-grid">
          <DetailField label="Team" value={team.name} />
          <DetailField label="Sport" value={team.sport} />
          <DetailField label="Captain" value={team.captain} />
          <DetailField label="Owner" value={team.owner} />
          <DetailField label="Turf" value={team.turfName} />
          <DetailField label="Players" value={`${team.playerCount}`} />
        </div>
      </section>

      <section className="admin-detail-section">
        <h4>Performance</h4>
        <div className="admin-stat-mini-grid">
          <StatMini label="Matches" value={performance.matches} />
          <StatMini label="Wins" value={performance.wins} />
          <StatMini label="Losses" value={performance.losses} />
        </div>
      </section>

      <section className="admin-detail-section">
        <h4>Players ({team.members.length})</h4>
        {team.members.length ? (
          <ul className="admin-mini-list">
            {team.members.map((member) => (
              <li key={member.id}>
                <span className="admin-mini-dot" />
                <span><strong>{member.name}</strong><small>{member.sport} · {member.email}</small></span>
              </li>
            ))}
          </ul>
        ) : <p className="admin-detail-empty">No players linked to this team yet.</p>}
      </section>

      <section className="admin-detail-section">
        <h4>Tournament history</h4>
        {team.tournament !== '—' ? (
          <ul className="admin-mini-list">
            <li>
              <span className="admin-mini-dot" />
              <span><strong>{team.tournament}</strong><small>{team.sport} · {performance.matches} match(es) played</small></span>
            </li>
          </ul>
        ) : <p className="admin-detail-empty">No tournament recorded for this team.</p>}
      </section>
    </Drawer>
  );
}

function DetailField({ label, value }) {
  return <div className="admin-detail-field"><span>{label}</span><strong>{value || '—'}</strong></div>;
}

function StatMini({ label, value }) {
  return <div className="admin-stat-mini"><strong>{value}</strong><span>{label}</span></div>;
}

function TeamEditModal({ team, onClose, onSave }) {
  const [form, setForm] = useState(null);
  // Candidate players come from the same state.players collection — no duplication.
  const candidates = useMemo(() => {
    const state = getDemoState();
    const accepted = (state.requests || [])
      .filter((request) => request.ownerId === team?.ownerId && request.status === 'accepted')
      .map((request) => request.playerId);
    const pool = (state.players || []).filter((player) => accepted.includes(player.id) || (team?.memberIds || []).includes(player.id));
    return pool.map((player) => ({ id: player.id, name: `${player.firstName || ''} ${player.surname || ''}`.trim() }));
  }, [team]);

  useEffect(() => {
    if (team) setForm({ name: team.name, sport: team.sport, description: team.description, memberIds: team.memberIds });
  }, [team]);

  if (!team || !form) return null;

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleMember = (id) => setForm((current) => ({
    ...current,
    memberIds: current.memberIds.includes(id) ? current.memberIds.filter((item) => item !== id) : [...current.memberIds, id],
  }));

  return (
    <Modal
      open
      title={`Edit ${team.name}`}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => onSave(form)}>Save changes</button>
        </>
      )}
    >
      <div className="admin-form-grid">
        <label className="form-field"><span>Team name</span><input value={form.name} onChange={(e) => update('name', e.target.value)} /></label>
        <label className="form-field"><span>Sport</span><input value={form.sport} onChange={(e) => update('sport', e.target.value)} /></label>
        <label className="form-field admin-field-wide"><span>Description</span><textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} /></label>
      </div>
      <div className="admin-detail-section">
        <h4>Players</h4>
        {candidates.length ? (
          <div className="admin-chip-toggle-row">
            {candidates.map((player) => (
              <button type="button" key={player.id} className={`admin-chip-toggle ${form.memberIds.includes(player.id) ? 'active' : ''}`} onClick={() => toggleMember(player.id)}>{player.name}</button>
            ))}
          </div>
        ) : <p className="admin-detail-empty">No eligible players found for this team's turf.</p>}
      </div>
    </Modal>
  );
}

export default TeamsPage;