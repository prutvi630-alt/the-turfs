import { useEffect, useMemo, useRef, useState } from 'react';
import AdminIcon from './AdminIcon';
import {
  ConfirmDialog,
  Drawer,
  FilterSelect,
  Pagination,
  SearchInput,
  StatusPill,
  TableEmpty,
  Toast,
} from './AdminUI';
import { getTournamentFilterOptions, getTournamentRows, filterByView } from '../data/tournamentSelectors';
import {
  TOURNAMENT_STATUS,
  deleteTournament,
  duplicateTournament,
  setTournamentStatus,
} from '../data/adminTournaments';

// TournamentsPage — /admin/tournaments
//
// Admin management of the tournament catalogue (static) plus admin-created
// tournaments held in state.tournaments. Publishing a tournament makes it
// visible to the public TournamentPage, which reads the same merged list.

const PAGE_SIZE = 8;

const SORTS = [
  { value: 'soonest', label: 'Soonest first' },
  { value: 'latest', label: 'Latest first' },
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
];

const navigate = (href) => { window.location.href = href; };

const STATUS_FOR_ACTION = {
  publish: TOURNAMENT_STATUS.PUBLISHED,
  unpublish: TOURNAMENT_STATUS.DRAFT,
  cancel: TOURNAMENT_STATUS.CANCELLED,
  complete: TOURNAMENT_STATUS.COMPLETED,
};

function TournamentsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState('All');
  const [status, setStatus] = useState('All');
  const [venue, setVenue] = useState('All');
  const [dateRange, setDateRange] = useState('Any date');
  const [sort, setSort] = useState('soonest');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const confirmReason = useRef('');

  // The sidebar sub-view (?view=) preselects a lifecycle filter.
  const view = useMemo(() => new URLSearchParams(window.location.search).get('view') || 'all', []);

  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('admin-toast');
      if (pending) { setToast(JSON.parse(pending)); sessionStorage.removeItem('admin-toast'); }
    } catch { /* ignore */ }
  }, []);

  const refresh = () => setRefreshKey((key) => key + 1);

  const rows = useMemo(() => getTournamentRows(), [refreshKey]);
  const options = useMemo(() => getTournamentFilterOptions(rows), [rows]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const now = new Date();
    const byView = filterByView(rows, view);
    return byView
      .filter((row) => {
        if (normalized) {
          const haystack = [row.name, row.sport, row.venue].join(' ').toLowerCase();
          if (!haystack.includes(normalized)) return false;
        }
        if (sport !== 'All' && row.sport !== sport) return false;
        if (status !== 'All' && row.status !== status) return false;
        if (venue !== 'All' && row.venue !== venue) return false;
        if (dateRange !== 'Any date') {
          const start = row.startDate ? new Date(`${row.startDate}T00:00:00`) : null;
          if (!start) return false;
          const days = Math.ceil((start - now) / 86400000);
          if (dateRange === 'This week' && !(days >= 0 && days <= 7)) return false;
          if (dateRange === 'This month' && !(days >= 0 && days <= 31)) return false;
          if (dateRange === 'Past' && days >= 0) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sort === 'soonest') return new Date(a.startDate || 0) - new Date(b.startDate || 0);
        if (sort === 'latest') return new Date(b.startDate || 0) - new Date(a.startDate || 0);
        if (sort === 'name-asc') return a.name.localeCompare(b.name);
        if (sort === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
      });
  }, [rows, view, query, sport, status, venue, dateRange, sort]);

  useEffect(() => { setPage(1); }, [query, sport, status, venue, dateRange, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selected = rows.find((row) => row.id === selectedId) || null;
  const hasFilters = query || sport !== 'All' || status !== 'All' || venue !== 'All' || dateRange !== 'Any date';

  const clearFilters = () => { setQuery(''); setSport('All'); setStatus('All'); setVenue('All'); setDateRange('Any date'); setSort('soonest'); };

  const runAction = (row, action, reason) => {
    if (action === 'delete') {
      const result = deleteTournament(row.id);
      if (!result.ok) { setToast({ tone: 'danger', title: 'Cannot delete', text: result.error }); setConfirm(null); return; }
      setConfirm(null); setSelectedId(null); refresh();
      setToast({ tone: 'success', title: 'Tournament deleted', text: `${row.name} was removed.` });
      return;
    }
    if (action === 'duplicate') {
      const result = duplicateTournament(row._tournament);
      if (!result.ok) { setToast({ tone: 'danger', title: 'Cannot duplicate', text: result.error }); setConfirm(null); return; }
      setConfirm(null); refresh();
      setToast({ tone: 'success', title: 'Tournament duplicated', text: `${result.tournament.name} created as a draft.` });
      return;
    }
    const nextStatus = STATUS_FOR_ACTION[action];
    const result = setTournamentStatus(row.id, nextStatus, { reason });
    if (!result.ok) { setToast({ tone: 'danger', title: 'Action unavailable', text: result.error }); setConfirm(null); return; }
    setConfirm(null); refresh();
    const titles = {
      publish: 'Tournament published', unpublish: 'Tournament unpublished',
      cancel: 'Tournament cancelled', complete: 'Tournament completed',
    };
    setToast({
      tone: action === 'cancel' ? 'warn' : 'success',
      title: titles[action],
      text: `${row.name} is now ${nextStatus}.`,
    });
  };

  return (
    <div className="admin-list-page">
      <div className="admin-dash-head">
        <div>
          <span className="section-kicker">TOURNAMENTS</span>
          <h2>Tournament management</h2>
          <p>Create, publish and run tournaments end to end. {rows.length} total.</p>
        </div>
        <div className="admin-dash-head-actions">
          <button type="button" className="btn btn-primary admin-action-btn" onClick={() => navigate('/admin/tournaments/create')}>
            <AdminIcon name="trophy" size={16} /> Create Tournament
          </button>
        </div>
      </div>

      {view !== 'all' && view !== 'create' && (
        <div className="admin-view-banner">
          <span>Showing <strong>{view}</strong> tournaments</span>
          <button type="button" className="admin-link-btn" onClick={() => navigate('/admin/tournaments?view=all')}>Show all</button>
        </div>
      )}

      <div className="admin-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search tournament, sport or venue…" />
        <div className="admin-toolbar-filters">
          <FilterSelect label="Sport" value={sport} options={options.sports} onChange={setSport} />
          <FilterSelect label="Status" value={status} options={options.statuses} onChange={setStatus} />
          <FilterSelect label="Venue" value={venue} options={options.venues} onChange={setVenue} />
          <FilterSelect label="Date" value={dateRange} options={options.dates} onChange={setDateRange} />
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
        <TableEmpty icon="trophy" title="No tournaments found" text="Adjust the filters or create a new tournament to get started."
          action={<button type="button" className="btn btn-primary admin-action-btn" onClick={() => navigate('/admin/tournaments/create')}>Create Tournament</button>} />
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Sport</th>
                  <th>Venue</th>
                  <th>Start Date</th>
                  <th>Registration</th>
                  <th>Teams</th>
                  <th>Status</th>
                  <th className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Tournament">
                      <button type="button" className="admin-cell-person" onClick={() => setSelectedId(row.id)}>
                        {row.image
                          ? <img className="admin-avatar-img" src={row.image} alt="" />
                          : <span className="admin-avatar"><AdminIcon name="trophy" size={16} /></span>}
                        <span className="admin-cell-person-text">
                          <strong>{row.name}</strong>
                          <small>{row.format} · {row.managed ? 'Admin' : 'Catalogue'}</small>
                        </span>
                      </button>
                    </td>
                    <td data-label="Sport">{row.sport}</td>
                    <td data-label="Venue"><span className="admin-cell-muted">{row.venue}</span></td>
                    <td data-label="Start Date"><span className="admin-cell-muted">{row.startLabel}</span></td>
                    <td data-label="Registration"><span className={`admin-pill tone-${row.registrationStatus === 'Open' ? 'ok' : row.registrationStatus === 'Draft' ? 'neutral' : 'warn'}`}>{row.registrationStatus}</span></td>
                    <td data-label="Teams"><span className="admin-count-badge">{row.registeredTeams}{row.teamCapacity ? `/${row.teamCapacity}` : ''}</span></td>
                    <td data-label="Status"><StatusPill status={row.status} /></td>
                    <td data-label="Actions" className="admin-col-actions">
                      <TournamentRowActions row={row} onView={() => setSelectedId(row.id)} onEdit={() => navigate(`/admin/tournaments/create?edit=${row.id}`)} onAction={(action) => setConfirm({ row, action })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={currentPage} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}

      <TournamentDetailDrawer
        tournament={selected}
        onClose={() => setSelectedId(null)}
        onEdit={(id) => navigate(`/admin/tournaments/create?edit=${id}`)}
        onAction={(row, action) => { setSelectedId(null); setConfirm({ row, action }); }}
      />

      {confirm && (
        <ConfirmDialog
          open
          title={
            confirm.action === 'cancel' ? 'Cancel tournament?'
              : confirm.action === 'delete' ? 'Delete tournament?'
                : confirm.action === 'complete' ? 'Mark tournament complete?'
                  : confirm.action === 'duplicate' ? 'Duplicate tournament?'
                    : confirm.action === 'unpublish' ? 'Unpublish tournament?'
                      : 'Publish tournament?'
          }
          tone={confirm.action === 'cancel' || confirm.action === 'delete' ? 'danger' : 'primary'}
          confirmLabel={
            confirm.action === 'cancel' ? 'Cancel tournament'
              : confirm.action === 'delete' ? 'Delete tournament'
                : confirm.action === 'complete' ? 'Mark complete'
                  : confirm.action === 'duplicate' ? 'Duplicate'
                    : confirm.action === 'unpublish' ? 'Unpublish'
                      : 'Publish'
          }
          message={
            confirm.action === 'cancel' ? `${confirm.row.name} will be marked Cancelled. Connected registrations are kept and can be handled from the Registrations module — nothing is destroyed.`
              : confirm.action === 'delete' ? `${confirm.row.name} will be permanently removed. This cannot be undone.`
                : confirm.action === 'complete' ? `${confirm.row.name} will be marked Completed.`
                  : confirm.action === 'duplicate' ? `A copy of ${confirm.row.name} will be created as a Draft. Registrations, matches, results and winners are NOT copied.`
                    : confirm.action === 'unpublish' ? `${confirm.row.name} will return to Draft and be hidden from the public.`
                      : `${confirm.row.name} will be published and become visible on the public tournaments page.`
          }
          onCancel={() => setConfirm(null)}
          onConfirm={() => runAction(confirm.row, confirm.action, confirmReason.current)}
        >
          {confirm.action === 'cancel' && (
            <label className="form-field">
              <span>Cancellation reason (optional)</span>
              <textarea rows={3} placeholder="e.g. Insufficient registrations" onChange={(event) => { confirmReason.current = event.target.value; }} />
            </label>
          )}
        </ConfirmDialog>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

/* ---------- Row actions ---------- */
function TournamentRowActions({ row, onView, onEdit, onAction }) {
  const isCancelled = row.status === TOURNAMENT_STATUS.CANCELLED;
  const isCompleted = row.status === TOURNAMENT_STATUS.COMPLETED;
  return (
    <div className="admin-row-actions">
      <button type="button" className="admin-icon-action" title="View" aria-label={`View ${row.name}`} onClick={onView}>
        <AdminIcon name="eye" size={15} />
      </button>
      <button type="button" className="admin-icon-action" title={row.managed ? 'Edit' : 'Duplicate to edit'} aria-label={`Edit ${row.name}`} onClick={onEdit}>
        <AdminIcon name="edit" size={15} />
      </button>
      {row.published ? (
        <button type="button" className="admin-icon-action" title="Unpublish" aria-label={`Unpublish ${row.name}`} onClick={() => onAction('unpublish')}>
          <AdminIcon name="ban" size={15} />
        </button>
      ) : (
        <button type="button" className="admin-icon-action ok" title="Publish" aria-label={`Publish ${row.name}`} onClick={() => onAction('publish')}>
          <AdminIcon name="check" size={15} />
        </button>
      )}
      <button type="button" className="admin-icon-action" title="Duplicate" aria-label={`Duplicate ${row.name}`} onClick={() => onAction('duplicate')}>
        <AdminIcon name="clipboard" size={15} />
      </button>
      {!isCancelled && !isCompleted && (
        <>
          <button type="button" className="admin-icon-action danger" title="Cancel" aria-label={`Cancel ${row.name}`} onClick={() => onAction('cancel')}>
            <AdminIcon name="close" size={15} />
          </button>
          <button type="button" className="admin-icon-action ok" title="Mark complete" aria-label={`Complete ${row.name}`} onClick={() => onAction('complete')}>
            <AdminIcon name="shield" size={15} />
          </button>
        </>
      )}
      {row.managed && (
        <button type="button" className="admin-icon-action danger" title="Delete" aria-label={`Delete ${row.name}`} onClick={() => onAction('delete')}>
          <AdminIcon name="close" size={15} />
        </button>
      )}
    </div>
  );
}

/* ---------- Detail drawer ---------- */
function TournamentDetailDrawer({ tournament, onClose, onEdit, onAction }) {
  if (!tournament) return null;
  const t = tournament._tournament || {};

  return (
    <Drawer open title="Tournament details" onClose={onClose}>
      {tournament.image && <img className="admin-gallery-main" src={tournament.image} alt={tournament.name} />}

      <div className="admin-detail-head">
        <div>
          <h3>{tournament.name}</h3>
          <p>{tournament.sport} · {tournament.venue}</p>
          <StatusPill status={tournament.status} />
        </div>
      </div>

      {tournament.status === TOURNAMENT_STATUS.CANCELLED && tournament.cancellationReason && (
        <div className="admin-detail-note danger"><strong>Cancellation reason</strong><span>{tournament.cancellationReason}</span></div>
      )}

      <div className="admin-detail-actions">
        <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => onEdit(tournament.id)}>
          <AdminIcon name="edit" size={15} /> Edit
        </button>
        <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => onAction(tournament, 'duplicate')}>
          <AdminIcon name="clipboard" size={15} /> Duplicate
        </button>
        {tournament.published ? (
          <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => onAction(tournament, 'unpublish')}>
            <AdminIcon name="ban" size={15} /> Unpublish
          </button>
        ) : (
          <button type="button" className="btn btn-primary admin-action-btn" onClick={() => onAction(tournament, 'publish')}>
            <AdminIcon name="check" size={15} /> Publish
          </button>
        )}
      </div>

      <section className="admin-detail-section">
        <h4>Overview</h4>
        <div className="admin-detail-grid">
          <DetailField label="Sport" value={tournament.sport} />
          <DetailField label="Format" value={tournament.format} />
          <DetailField label="Venue" value={tournament.venue} />
          <DetailField label="Area" value={tournament.area} />
          <DetailField label="Start date" value={tournament.startLabel} />
          <DetailField label="Registration" value={tournament.registrationStatus} />
          <DetailField label="Teams" value={`${tournament.registeredTeams}${tournament.teamCapacity ? ` / ${tournament.teamCapacity}` : ''}`} />
          <DetailField label="Prize pool" value={tournament.prizePool || '—'} />
        </div>
      </section>

      {t.description && (
        <section className="admin-detail-section">
          <h4>About</h4>
          <p className="admin-detail-text">{t.description}</p>
        </section>
      )}

      {tournament.teams.length > 0 && (
        <section className="admin-detail-section">
          <h4>Registered teams ({tournament.teams.length})</h4>
          <ul className="admin-mini-list">
            {tournament.teams.map((team, index) => (
              <li key={`${team.name}-${index}`}>
                <span className="admin-mini-dot" />
                <span><strong>{team.name}</strong><small>{team.captain} · {team.status}</small></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Drawer>
  );
}

function DetailField({ label, value }) {
  return <div className="admin-detail-field"><span>{label}</span><strong>{value || '—'}</strong></div>;
}

export default TournamentsPage;