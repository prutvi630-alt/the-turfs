import { useEffect, useMemo, useRef, useState } from 'react';
import AdminIcon from './AdminIcon';
import { route } from '../config/routes';
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
import {
  getPlayerFilterOptions,
  getPlayerRows,
  getPlayerStats,
  getPlayerTournamentHistory,
} from '../data/peopleSelectors';
import { ACCOUNT_STATUS, setAccountStatus, updateAccountProfile } from '../data/adminAccounts';

// PlayersPage — /admin/players
//
// Admin management over the EXISTING player accounts. It reads the same demo
// state the player experience uses and only mutates an `active`/`status` flag,
// so the player dashboard keeps working normally; a suspended player simply
// cannot sign in (enforced already by the login layer's `active` check).

const PAGE_SIZE = 8;

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
];

const navigate = (href) => { window.location.href = route(href); };

function PlayersPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState('All');
  const [status, setStatus] = useState('All');
  const [team, setTeam] = useState('All');
  const [joined, setJoined] = useState('Any time');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const confirmReason = useRef('');

  const refresh = () => setRefreshKey((key) => key + 1);

  const rows = useMemo(() => getPlayerRows(), [refreshKey]);
  const options = useMemo(() => getPlayerFilterOptions(rows), [rows]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const now = new Date();
    return rows
      .filter((row) => {
        if (normalized) {
          const haystack = [row.name, row.email, row.mobile, row.team].join(' ').toLowerCase();
          if (!haystack.includes(normalized)) return false;
        }
        if (sport !== 'All' && row.sport !== sport) return false;
        if (status !== 'All' && row.status !== status) return false;
        if (team !== 'All' && row.team !== team) return false;
        if (joined !== 'Any time') {
          if (!row.joinedAt) return false;
          const days = (now - new Date(row.joinedAt)) / 86400000;
          if (joined === 'Last 7 days' && days > 7) return false;
          if (joined === 'Last 30 days' && days > 30) return false;
          if (joined === 'Last 90 days' && days > 90) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === 'newest') return new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0);
        if (sort === 'oldest') return new Date(a.joinedAt || 0) - new Date(b.joinedAt || 0);
        if (sort === 'name-asc') return a.name.localeCompare(b.name);
        if (sort === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
      });
  }, [rows, query, sport, status, team, joined, sort]);

  useEffect(() => { setPage(1); }, [query, sport, status, team, joined, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selected = rows.find((row) => row.id === selectedId) || null;
  const editing = rows.find((row) => row.id === editId) || null;

  const applyStatus = (row, nextStatus, reason) => {
    const result = setAccountStatus('player', row.id, nextStatus, { reason });
    if (!result.ok) { setToast({ tone: 'danger', title: 'Action failed', text: result.error }); return; }
    setConfirm(null);
    refresh();
    setToast({
      tone: nextStatus === ACCOUNT_STATUS.SUSPENDED ? 'warn' : 'success',
      title: nextStatus === ACCOUNT_STATUS.SUSPENDED ? 'Player suspended' : 'Player activated',
      text: `${row.name} is now ${nextStatus}.`,
    });
  };

  const handleEditSave = (patch) => {
    const result = updateAccountProfile('player', editId, patch);
    if (!result.ok) { setToast({ tone: 'danger', title: 'Update failed', text: result.error }); return; }
    setEditId(null);
    refresh();
    setToast({ tone: 'success', title: 'Player updated', text: 'Changes saved successfully.' });
  };

  const hasFilters = query || sport !== 'All' || status !== 'All' || team !== 'All' || joined !== 'Any time';

  const clearFilters = () => {
    setQuery(''); setSport('All'); setStatus('All'); setTeam('All'); setJoined('Any time'); setSort('newest');
  };

  return (
    <div className="admin-list-page">
      <div className="admin-dash-head">
        <div>
          <span className="section-kicker">PLAYERS</span>
          <h2>Player management</h2>
          <p>Search, review and manage every registered player. {rows.length} total.</p>
        </div>
        <div className="admin-dash-head-actions">
          <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => navigate('/admin/registrations')}>
            <AdminIcon name="clipboard" size={16} /> Registrations
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, phone or team…" />
        <div className="admin-toolbar-filters">
          <FilterSelect label="Sport" value={sport} options={options.sports} onChange={setSport} />
          <FilterSelect label="Status" value={status} options={options.statuses} onChange={setStatus} />
          <FilterSelect label="Team" value={team} options={options.teams} onChange={setTeam} />
          <FilterSelect label="Joined" value={joined} options={['Any time', 'Last 7 days', 'Last 30 days', 'Last 90 days']} onChange={setJoined} />
          <label className="admin-filter">
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              {SORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        {hasFilters && <button type="button" className="admin-link-btn" onClick={clearFilters}>Clear all</button>}
      </div>

      {filtered.length === 0 ? (
        rows.length === 0 ? (
          <TableEmpty icon="users" title="No players yet" text="Players will appear here as soon as they register on the platform." />
        ) : (
          <TableEmpty icon="search" title="No matching players" text="No player matches the current search and filters."
            action={<button type="button" className="btn btn-secondary admin-action-btn" onClick={clearFilters}>Clear filters</button>} />
        )
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Sport</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Player">
                      <button type="button" className="admin-cell-person" onClick={() => setSelectedId(row.id)}>
                        {row.profileImage
                          ? <img className="admin-avatar-img" src={row.profileImage} alt="" />
                          : <span className="admin-avatar">{row.initials}</span>}
                        <span className="admin-cell-person-text">
                          <strong>{row.name}</strong>
                          <small>{row.locationLabel}</small>
                        </span>
                      </button>
                    </td>
                    <td data-label="Email"><span className="admin-cell-muted">{row.email}</span></td>
                    <td data-label="Phone"><span className="admin-cell-muted">{row.mobile || '—'}</span></td>
                    <td data-label="Sport">{row.sport}</td>
                    <td data-label="Team">{row.team}</td>
                    <td data-label="Status"><StatusPill status={row.status} /></td>
                    <td data-label="Joined"><span className="admin-cell-muted">{row.joinedLabel}</span></td>
                    <td data-label="Actions" className="admin-col-actions">
                      <div className="admin-row-actions">
                        <button type="button" className="admin-icon-action" title="View" aria-label={`View ${row.name}`} onClick={() => setSelectedId(row.id)}>
                          <AdminIcon name="eye" size={15} />
                        </button>
                        <button type="button" className="admin-icon-action" title="Edit" aria-label={`Edit ${row.name}`} onClick={() => setEditId(row.id)}>
                          <AdminIcon name="edit" size={15} />
                        </button>
                        {row.status === ACCOUNT_STATUS.SUSPENDED ? (
                          <button type="button" className="admin-icon-action ok" title="Activate" aria-label={`Activate ${row.name}`}
                            onClick={() => setConfirm({ row, action: 'activate' })}>
                            <AdminIcon name="check" size={15} />
                          </button>
                        ) : (
                          <button type="button" className="admin-icon-action danger" title="Suspend" aria-label={`Suspend ${row.name}`}
                            onClick={() => setConfirm({ row, action: 'suspend' })}>
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

      <PlayerDetailDrawer
        player={selected}
        onClose={() => setSelectedId(null)}
        onEdit={(id) => { setSelectedId(null); setEditId(id); }}
        onStatus={(row, action) => { setSelectedId(null); setConfirm({ row, action }); }}
      />

      <PlayerEditModal player={editing} onClose={() => setEditId(null)} onSave={handleEditSave} />

      {confirm && (
        <ConfirmDialog
          open
          title={confirm.action === 'suspend' ? 'Suspend player?' : 'Activate player?'}
          tone={confirm.action === 'suspend' ? 'danger' : 'primary'}
          confirmLabel={confirm.action === 'suspend' ? 'Suspend player' : 'Activate player'}
          message={confirm.action === 'suspend'
            ? `${confirm.row.name} will no longer be able to sign in to the platform. You can reactivate them at any time.`
            : `${confirm.row.name} will regain access to the platform immediately.`}
          onCancel={() => setConfirm(null)}
          onConfirm={() => applyStatus(confirm.row, confirm.action === 'suspend' ? ACCOUNT_STATUS.SUSPENDED : ACCOUNT_STATUS.ACTIVE, confirmReason.current)}
        >
          {confirm.action === 'suspend' && (
            <label className="form-field">
              <span>Reason (optional)</span>
              <textarea
                rows={3}
                placeholder="e.g. Violation of community guidelines"
                onChange={(event) => { confirmReason.current = event.target.value; }}
              />
            </label>
          )}
        </ConfirmDialog>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

// The suspend dialog reads its optional reason from a ref at confirm time so
// typing does not re-render the whole table.
function PlayerDetailDrawer({ player, onClose, onEdit, onStatus }) {
  if (!player) return null;
  const stats = getPlayerStats(player.id);
  const history = getPlayerTournamentHistory(player.id);

  return (
    <Drawer open title="Player details" onClose={onClose}>
      <div className="admin-detail-head">
        {player.profileImage
          ? <img className="admin-detail-avatar" src={player.profileImage} alt="" />
          : <span className="admin-detail-avatar placeholder">{player.initials}</span>}
        <div>
          <h3>{player.name}</h3>
          <p>{player.sport} player · {player.locationLabel}</p>
          <StatusPill status={player.status} />
        </div>
      </div>

      {player.status === ACCOUNT_STATUS.SUSPENDED && player.suspensionReason && (
        <div className="admin-detail-note danger">
          <strong>Suspension reason</strong>
          <span>{player.suspensionReason}</span>
        </div>
      )}

      <div className="admin-detail-actions">
        <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => onEdit(player.id)}>
          <AdminIcon name="cog" size={15} /> Edit
        </button>
        {player.status === ACCOUNT_STATUS.SUSPENDED ? (
          <button type="button" className="btn btn-primary admin-action-btn" onClick={() => onStatus(player, 'activate')}>
            <AdminIcon name="shield" size={15} /> Activate
          </button>
        ) : (
          <button type="button" className="btn admin-btn-danger" onClick={() => onStatus(player, 'suspend')}>
            <AdminIcon name="close" size={15} /> Suspend
          </button>
        )}
      </div>

      <section className="admin-detail-section">
        <h4>Profile</h4>
        <div className="admin-detail-grid">
          <DetailField label="Email" value={player.email} />
          <DetailField label="Phone" value={player.mobile || '—'} />
          <DetailField label="Sport" value={player.sport} />
          <DetailField label="Age" value={player.age ? `${player.age} years` : '—'} />
          <DetailField label="Location" value={`${player.locationLabel}${player.address.pincode ? ` – ${player.address.pincode}` : ''}`} />
          <DetailField label="Joined" value={player.joinedLabel} />
        </div>
      </section>

      <section className="admin-detail-section">
        <h4>Statistics</h4>
        <div className="admin-stat-mini-grid">
          <StatMini label="Teams joined" value={stats.teamsJoined} />
          <StatMini label="Tournaments" value={stats.tournamentsJoined} />
          <StatMini label="Matches played" value={stats.matchesPlayed} />
          <StatMini label="Wins" value={stats.wins} />
          <StatMini label="Losses" value={stats.losses} />
        </div>
      </section>

      <section className="admin-detail-section">
        <h4>Current team</h4>
        {player._teams.length ? (
          <ul className="admin-mini-list">
            {player._teams.map((team) => (
              <li key={team.id}>
                <span className="admin-mini-dot" />
                <span><strong>{team.name}</strong><small>{team.sport}</small></span>
              </li>
            ))}
          </ul>
        ) : <p className="admin-detail-empty">Not part of any team yet.</p>}
      </section>

      <section className="admin-detail-section">
        <h4>Tournament history</h4>
        {history.length ? (
          <ul className="admin-mini-list">
            {history.map((item) => (
              <li key={item.id}>
                <span className="admin-mini-dot" />
                <span><strong>{item.tournament}</strong><small>{item.sport} · {item.date} · {item.outcome}</small></span>
              </li>
            ))}
          </ul>
        ) : <p className="admin-detail-empty">No tournament history recorded.</p>}
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

function PlayerEditModal({ player, onClose, onSave }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (player) {
      setForm({
        firstName: player.firstName,
        surname: player.surname,
        email: player.email,
        mobile: player.mobile,
        sportId: player.sport,
        street: player.address.street,
        city: player.address.city,
        pincode: player.address.pincode,
      });
    }
  }, [player]);

  if (!player || !form) return null;

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <Modal
      open
      title={`Edit ${player.name}`}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => onSave(form)}>Save changes</button>
        </>
      )}
    >
      <div className="admin-form-grid">
        <label className="form-field"><span>First name</span><input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} /></label>
        <label className="form-field"><span>Surname</span><input value={form.surname} onChange={(e) => update('surname', e.target.value)} /></label>
        <label className="form-field"><span>Email</span><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></label>
        <label className="form-field"><span>Phone</span><input value={form.mobile} onChange={(e) => update('mobile', e.target.value)} /></label>
        <label className="form-field"><span>Sport</span><input value={form.sportId} onChange={(e) => update('sportId', e.target.value)} /></label>
        <label className="form-field"><span>City</span><input value={form.city} onChange={(e) => update('city', e.target.value)} /></label>
        <label className="form-field"><span>Street</span><input value={form.street} onChange={(e) => update('street', e.target.value)} /></label>
        <label className="form-field"><span>Pincode</span><input value={form.pincode} onChange={(e) => update('pincode', e.target.value)} /></label>
      </div>
    </Modal>
  );
}

export default PlayersPage;