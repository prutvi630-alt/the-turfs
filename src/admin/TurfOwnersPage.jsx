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
import { getOwnerFilterOptions, getOwnerRows } from '../data/peopleSelectors';
import { ACCOUNT_STATUS, setAccountStatus, updateAccountProfile } from '../data/adminAccounts';
import { getActivities } from '../data/activityStore';

// TurfOwnersPage — /admin/turf-owners
//
// Admin management over the EXISTING turf-owner accounts. Status changes only
// flip the `active`/`status` flag the owner login already reads, so an owner's
// dashboard keeps working; a suspended owner simply cannot sign in.

const PAGE_SIZE = 8;

const navigate = (href) => { window.location.href = href; };

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
];

function TurfOwnersPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [area, setArea] = useState('All');
  const [joined, setJoined] = useState('Any time');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const confirmReason = useRef('');

  const refresh = () => setRefreshKey((key) => key + 1);

  const rows = useMemo(() => getOwnerRows(), [refreshKey]);
  const options = useMemo(() => getOwnerFilterOptions(rows), [rows]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const now = new Date();
    return rows
      .filter((row) => {
        if (normalized) {
          const haystack = [row.name, row.email, row.mobile, ...row.turfNames].join(' ').toLowerCase();
          if (!haystack.includes(normalized)) return false;
        }
        if (status !== 'All' && row.status !== status) return false;
        if (area !== 'All' && !row.areas.includes(area)) return false;
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
  }, [rows, query, status, area, joined, sort]);

  useEffect(() => { setPage(1); }, [query, status, area, joined, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selected = rows.find((row) => row.id === selectedId) || null;
  const editing = rows.find((row) => row.id === editId) || null;
  const hasFilters = query || status !== 'All' || area !== 'All' || joined !== 'Any time';

  const clearFilters = () => { setQuery(''); setStatus('All'); setArea('All'); setJoined('Any time'); setSort('newest'); };

  const applyStatus = (row, nextStatus, reason) => {
    const result = setAccountStatus('owner', row.id, nextStatus, { reason });
    if (!result.ok) { setToast({ tone: 'danger', title: 'Action failed', text: result.error }); return; }
    setConfirm(null);
    refresh();
    const titles = {
      [ACCOUNT_STATUS.SUSPENDED]: 'Owner suspended',
      [ACCOUNT_STATUS.ACTIVE]: row.status === ACCOUNT_STATUS.PENDING ? 'Owner approved' : 'Owner activated',
    };
    setToast({
      tone: nextStatus === ACCOUNT_STATUS.SUSPENDED ? 'warn' : 'success',
      title: titles[nextStatus] || 'Owner updated',
      text: `${row.name} is now ${nextStatus}.`,
    });
  };

  const handleEditSave = (patch) => {
    const result = updateAccountProfile('owner', editId, patch);
    if (!result.ok) { setToast({ tone: 'danger', title: 'Update failed', text: result.error }); return; }
    setEditId(null);
    refresh();
    setToast({ tone: 'success', title: 'Owner updated', text: 'Changes saved successfully.' });
  };

  return (
    <div className="admin-list-page">
      <div className="admin-dash-head">
        <div>
          <span className="section-kicker">TURF OWNERS</span>
          <h2>Turf owner management</h2>
          <p>Verify turf owners and manage their access. {rows.length} total.</p>
        </div>
        <div className="admin-dash-head-actions">
          <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => navigate('/admin/turfs')}>
            <AdminIcon name="turf" size={16} /> Turfs
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, phone or turf…" />
        <div className="admin-toolbar-filters">
          <FilterSelect label="Status" value={status} options={options.statuses} onChange={setStatus} />
          <FilterSelect label="Area" value={area} options={options.areas} onChange={setArea} />
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
          <TableEmpty icon="badge" title="No turf owners yet" text="Owners appear here once a turf is registered on the platform." />
        ) : (
          <TableEmpty icon="search" title="No matching owners" text="No owner matches the current search and filters."
            action={<button type="button" className="btn btn-secondary admin-action-btn" onClick={clearFilters}>Clear filters</button>} />
        )
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Turfs</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Owner">
                      <button type="button" className="admin-cell-person" onClick={() => setSelectedId(row.id)}>
                        <span className="admin-avatar">{row.initials}</span>
                        <span className="admin-cell-person-text">
                          <strong>{row.name}</strong>
                          <small>{row.areas.join(', ') || 'Vadodara'}</small>
                        </span>
                      </button>
                    </td>
                    <td data-label="Email"><span className="admin-cell-muted">{row.email}</span></td>
                    <td data-label="Phone"><span className="admin-cell-muted">{row.mobile || '—'}</span></td>
                    <td data-label="Turfs">
                      {row.turfCount ? <span className="admin-count-badge">{row.turfCount}</span> : <span className="admin-cell-muted">0</span>}
                    </td>
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
                        {row.status === ACCOUNT_STATUS.PENDING && (
                          <button type="button" className="admin-icon-action ok" title="Approve" aria-label={`Approve ${row.name}`}
                            onClick={() => setConfirm({ row, action: 'approve' })}>
                            <AdminIcon name="check" size={15} />
                          </button>
                        )}
                        {row.status === ACCOUNT_STATUS.SUSPENDED ? (
                          <button type="button" className="admin-icon-action ok" title="Activate" aria-label={`Activate ${row.name}`}
                            onClick={() => setConfirm({ row, action: 'activate' })}>
                            <AdminIcon name="play" size={15} />
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

      <OwnerDetailDrawer
        owner={selected}
        onClose={() => setSelectedId(null)}
        onEdit={(id) => { setSelectedId(null); setEditId(id); }}
        onStatus={(row, action) => { setSelectedId(null); setConfirm({ row, action }); }}
      />

      <OwnerEditModal owner={editing} onClose={() => setEditId(null)} onSave={handleEditSave} />

      {confirm && (
        <ConfirmDialog
          open
          title={confirm.action === 'suspend' ? 'Suspend turf owner?' : confirm.action === 'approve' ? 'Approve turf owner?' : 'Activate turf owner?'}
          tone={confirm.action === 'suspend' ? 'danger' : 'primary'}
          confirmLabel={confirm.action === 'suspend' ? 'Suspend owner' : confirm.action === 'approve' ? 'Approve owner' : 'Activate owner'}
          message={confirm.action === 'suspend'
            ? `${confirm.row.name} will no longer be able to sign in and manage their turf(s). You can reactivate them at any time.`
            : confirm.action === 'approve'
              ? `${confirm.row.name} will be approved and can sign in to manage their turf(s).`
              : `${confirm.row.name} will regain access to the platform immediately.`}
          onCancel={() => setConfirm(null)}
          onConfirm={() => applyStatus(
            confirm.row,
            confirm.action === 'suspend' ? ACCOUNT_STATUS.SUSPENDED : ACCOUNT_STATUS.ACTIVE,
            confirmReason.current
          )}
        >
          {confirm.action === 'suspend' && (
            <label className="form-field">
              <span>Reason (optional)</span>
              <textarea rows={3} placeholder="e.g. Pending document verification"
                onChange={(event) => { confirmReason.current = event.target.value; }} />
            </label>
          )}
        </ConfirmDialog>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function OwnerDetailDrawer({ owner, onClose, onEdit, onStatus }) {
  if (!owner) return null;

  const ownerActivity = getActivities()
    .filter((activity) => activity.meta?.id === owner.id || activity.actorName === owner.name)
    .slice(0, 5);

  return (
    <Drawer open title="Turf owner details" onClose={onClose}>
      <div className="admin-detail-head">
        <span className="admin-detail-avatar placeholder">{owner.initials}</span>
        <div>
          <h3>{owner.name}</h3>
          <p>{owner.turfNames.join(' · ') || 'No turf linked'}</p>
          <StatusPill status={owner.status} />
        </div>
      </div>

      {owner.status === ACCOUNT_STATUS.SUSPENDED && owner.suspensionReason && (
        <div className="admin-detail-note danger">
          <strong>Suspension reason</strong>
          <span>{owner.suspensionReason}</span>
        </div>
      )}

      <div className="admin-detail-actions">
        <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => onEdit(owner.id)}>
          <AdminIcon name="cog" size={15} /> Edit
        </button>
        {owner.status === ACCOUNT_STATUS.PENDING && (
          <button type="button" className="btn btn-primary admin-action-btn" onClick={() => onStatus(owner, 'approve')}>
            <AdminIcon name="shield" size={15} /> Approve
          </button>
        )}
        {owner.status === ACCOUNT_STATUS.SUSPENDED ? (
          <button type="button" className="btn btn-primary admin-action-btn" onClick={() => onStatus(owner, 'activate')}>
            <AdminIcon name="shield" size={15} /> Activate
          </button>
        ) : (
          <button type="button" className="btn admin-btn-danger" onClick={() => onStatus(owner, 'suspend')}>
            <AdminIcon name="close" size={15} /> Suspend
          </button>
        )}
      </div>

      <section className="admin-detail-section">
        <h4>Profile</h4>
        <div className="admin-detail-grid">
          <DetailField label="Email" value={owner.email} />
          <DetailField label="Phone" value={owner.mobile || '—'} />
          <DetailField label="Joined" value={owner.joinedLabel} />
          <DetailField label="Status" value={owner.status} />
        </div>
      </section>

      <section className="admin-detail-section">
        <h4>Turfs ({owner._turfs.length})</h4>
        {owner._turfs.length ? (
          <ul className="admin-mini-list">
            {owner._turfs.map((turf) => (
              <li key={turf.id}>
                <span className="admin-mini-dot" />
                <span><strong>{turf.name}</strong><small>{turf.area} · {(turf.sports || []).join(', ')}</small></span>
              </li>
            ))}
          </ul>
        ) : <p className="admin-detail-empty">No turf linked to this owner.</p>}
      </section>

      <section className="admin-detail-section">
        <h4>Owner activity</h4>
        {ownerActivity.length ? (
          <ul className="admin-mini-list">
            {ownerActivity.map((activity) => (
              <li key={activity.id}>
                <span className="admin-mini-dot" />
                <span><strong>{activity.message}</strong><small>{new Date(activity.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small></span>
              </li>
            ))}
          </ul>
        ) : <p className="admin-detail-empty">No recorded activity for this owner.</p>}
      </section>
    </Drawer>
  );
}

function DetailField({ label, value }) {
  return <div className="admin-detail-field"><span>{label}</span><strong>{value || '—'}</strong></div>;
}

function OwnerEditModal({ owner, onClose, onSave }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (owner) setForm({ name: owner.name, email: owner.email, mobile: owner.mobile });
  }, [owner]);

  if (!owner || !form) return null;

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <Modal
      open
      title={`Edit ${owner.name}`}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => onSave(form)}>Save changes</button>
        </>
      )}
    >
      <div className="admin-form-grid">
        <label className="form-field"><span>Owner name</span><input value={form.name} onChange={(e) => update('name', e.target.value)} /></label>
        <label className="form-field"><span>Email</span><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></label>
        <label className="form-field"><span>Phone</span><input value={form.mobile} onChange={(e) => update('mobile', e.target.value)} /></label>
      </div>
    </Modal>
  );
}

export default TurfOwnersPage;