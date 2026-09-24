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
  compressImageFile,
} from './AdminUI';
import { getTurfFilterOptions, getTurfRows } from '../data/turfSelectors';
import { TURF_STATUS, createTurf, deleteTurf, getOwnerOptions, setTurfStatus, updateTurf } from '../data/adminTurfs';

// TurfsPage — /admin/turfs
//
// Admin management over the turf catalogue (static homeData turfs) plus turfs
// registered through the owner flow. Registered turfs are written to
// state.registeredTurfs, the same collection getAllTurfs() merges, so admin
// changes flow to the public/player surfaces that read from the shared state.

const PAGE_SIZE = 8;

const SPORTS = ['Cricket', 'Football', 'Pickleball', 'Tennis', 'Badminton'];
const FACILITIES = ['Parking', 'Floodlights', 'Washroom', 'Cafeteria', 'Changing Room', 'Seating', 'First Aid', 'Water'];

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
];

const navigate = (href) => { window.location.href = href; };

function TurfsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('All');
  const [sport, setSport] = useState('All');
  const [status, setStatus] = useState('All');
  const [owner, setOwner] = useState('All');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const confirmReason = useRef('');

  // Pick up a toast handed over from the create page (survives the navigation).
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('admin-toast');
      if (pending) { setToast(JSON.parse(pending)); sessionStorage.removeItem('admin-toast'); }
    } catch { /* ignore */ }
  }, []);

  const refresh = () => setRefreshKey((key) => key + 1);

  const rows = useMemo(() => getTurfRows(), [refreshKey]);
  const options = useMemo(() => getTurfFilterOptions(rows), [rows]);
  const owners = useMemo(() => getOwnerOptions(), [refreshKey]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (normalized) {
          const haystack = [row.name, row.owner, row.area].join(' ').toLowerCase();
          if (!haystack.includes(normalized)) return false;
        }
        if (area !== 'All' && row.area !== area) return false;
        if (sport !== 'All' && !row.sports.includes(sport)) return false;
        if (status !== 'All' && row.status !== status) return false;
        if (owner !== 'All' && row.owner !== owner) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        if (sort === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        if (sort === 'name-asc') return a.name.localeCompare(b.name);
        if (sort === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
      });
  }, [rows, query, area, sport, status, owner, sort]);

  useEffect(() => { setPage(1); }, [query, area, sport, status, owner, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selected = rows.find((row) => row.id === selectedId) || null;
  const editing = rows.find((row) => row.id === editId) || null;
  const hasFilters = query || area !== 'All' || sport !== 'All' || status !== 'All' || owner !== 'All';

  const clearFilters = () => { setQuery(''); setArea('All'); setSport('All'); setStatus('All'); setOwner('All'); setSort('newest'); };

  const applyStatus = (row, nextStatus, reason) => {
    const result = setTurfStatus(row.id, nextStatus, { reason });
    if (!result.ok) { setToast({ tone: 'danger', title: 'Action unavailable', text: result.error }); setConfirm(null); return; }
    setConfirm(null);
    refresh();
    const titles = {
      [TURF_STATUS.SUSPENDED]: 'Turf suspended',
      [TURF_STATUS.ACTIVE]: row.status === TURF_STATUS.PENDING ? 'Turf approved' : 'Turf activated',
    };
    setToast({
      tone: nextStatus === TURF_STATUS.SUSPENDED ? 'warn' : 'success',
      title: titles[nextStatus] || 'Turf updated',
      text: `${row.name} is now ${nextStatus}.`,
    });
  };

  const handleDelete = (row) => {
    const result = deleteTurf(row.id);
    if (!result.ok) { setToast({ tone: 'danger', title: 'Delete failed', text: result.error }); setConfirm(null); return; }
    setConfirm(null);
    setSelectedId(null);
    refresh();
    setToast({ tone: 'success', title: 'Turf deleted', text: `${row.name} was removed from the platform.` });
  };

  const handleEditSave = (patch) => {
    const result = updateTurf(editId, patch);
    if (!result.ok) { setToast({ tone: 'danger', title: 'Update failed', text: result.error }); return; }
    setEditId(null);
    refresh();
    setToast({ tone: 'success', title: 'Turf updated', text: 'Changes saved successfully.' });
  };

  return (
    <div className="admin-list-page">
      <div className="admin-dash-head">
        <div>
          <span className="section-kicker">TURFS</span>
          <h2>Turf management</h2>
          <p>Approve and manage every venue on the platform. {rows.length} total.</p>
        </div>
        <div className="admin-dash-head-actions">
          <button type="button" className="btn btn-primary admin-action-btn" onClick={() => navigate('/admin/turfs/create')}>
            <AdminIcon name="turf" size={16} /> Add Turf
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search turf, owner or area…" />
        <div className="admin-toolbar-filters">
          <FilterSelect label="Area" value={area} options={options.areas} onChange={setArea} />
          <FilterSelect label="Sport" value={sport} options={options.sports} onChange={setSport} />
          <FilterSelect label="Status" value={status} options={options.statuses} onChange={setStatus} />
          <FilterSelect label="Owner" value={owner} options={options.owners} onChange={setOwner} />
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
          <TableEmpty icon="turf" title="No turfs yet" text="Turfs appear here once they are registered or added by an admin." />
        ) : (
          <TableEmpty icon="search" title="No matching turfs" text="No turf matches the current search and filters."
            action={<button type="button" className="btn btn-secondary admin-action-btn" onClick={clearFilters}>Clear filters</button>} />
        )
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Turf Name</th>
                  <th>Owner</th>
                  <th>Area</th>
                  <th>Sports</th>
                  <th>Facilities</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="admin-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Turf">
                      <button type="button" className="admin-cell-person" onClick={() => setSelectedId(row.id)}>
                        {row.primaryImage
                          ? <img className="admin-avatar-img" src={row.primaryImage} alt="" />
                          : <span className="admin-avatar"><AdminIcon name="turf" size={16} /></span>}
                        <span className="admin-cell-person-text">
                          <strong>{row.name}</strong>
                          <small>{row.managed ? 'Registered' : 'Catalogue'}</small>
                        </span>
                      </button>
                    </td>
                    <td data-label="Owner"><span className="admin-cell-muted">{row.owner}</span></td>
                    <td data-label="Area">{row.area}</td>
                    <td data-label="Sports"><span className="admin-chip-row">{(row.sports || []).slice(0, 2).map((item) => <span className="admin-mini-chip" key={item}>{item}</span>)}{row.sports.length > 2 && <span className="admin-mini-chip">+{row.sports.length - 2}</span>}</span></td>
                    <td data-label="Facilities"><span className="admin-cell-muted">{row.facilities.length ? `${row.facilities.length} listed` : '—'}</span></td>
                    <td data-label="Status"><StatusPill status={row.status} /></td>
                    <td data-label="Created"><span className="admin-cell-muted">{row.createdLabel}</span></td>
                    <td data-label="Actions" className="admin-col-actions">
                      <div className="admin-row-actions">
                        <button type="button" className="admin-icon-action" title="View" aria-label={`View ${row.name}`} onClick={() => setSelectedId(row.id)}>
                          <AdminIcon name="eye" size={15} />
                        </button>
                        <button type="button" className="admin-icon-action" title={row.managed ? 'Edit' : 'Catalogue turfs cannot be edited'} aria-label={`Edit ${row.name}`} onClick={() => row.managed && setEditId(row.id)} disabled={!row.managed}>
                          <AdminIcon name="edit" size={15} />
                        </button>
                        {row.status === TURF_STATUS.SUSPENDED ? (
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

      <TurfDetailDrawer
        turf={selected}
        onClose={() => setSelectedId(null)}
        onEdit={(id) => { setSelectedId(null); setEditId(id); }}
        onStatus={(row, action) => { setSelectedId(null); setConfirm({ row, action }); }}
        onDelete={(row) => { setSelectedId(null); setConfirm({ row, action: 'delete' }); }}
      />

      {editing && (
        <TurfEditModal turf={editing} owners={owners} onClose={() => setEditId(null)} onSave={handleEditSave} />
      )}

      {confirm && (
        <ConfirmDialog
          open
          title={
            confirm.action === 'suspend' ? 'Suspend turf?'
              : confirm.action === 'delete' ? 'Delete turf?'
                : confirm.action === 'approve' ? 'Approve turf?'
                  : 'Activate turf?'
          }
          tone={confirm.action === 'suspend' || confirm.action === 'delete' ? 'danger' : 'primary'}
          confirmLabel={
            confirm.action === 'suspend' ? 'Suspend turf'
              : confirm.action === 'delete' ? 'Delete turf'
                : confirm.action === 'approve' ? 'Approve turf'
                  : 'Activate turf'
          }
          message={
            confirm.action === 'suspend' ? `${confirm.row.name} will be hidden from players until reactivated.`
              : confirm.action === 'delete' ? `${confirm.row.name} will be permanently removed. This cannot be undone.`
                : confirm.action === 'approve' ? `${confirm.row.name} will be approved and visible to players.`
                  : `${confirm.row.name} will be visible to players again.`
          }
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.action === 'delete') return handleDelete(confirm.row);
            return applyStatus(confirm.row, confirm.action === 'suspend' ? TURF_STATUS.SUSPENDED : TURF_STATUS.ACTIVE, confirmReason.current);
          }}
        >
          {confirm.action === 'suspend' && (
            <label className="form-field">
              <span>Reason (optional)</span>
              <textarea rows={3} placeholder="e.g. Maintenance / verification pending" onChange={(event) => { confirmReason.current = event.target.value; }} />
            </label>
          )}
        </ConfirmDialog>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

/* ---------- Detail drawer ---------- */
function TurfDetailDrawer({ turf, onClose, onEdit, onStatus, onDelete }) {
  const [galleryIndex, setGalleryIndex] = useState(0);
  useEffect(() => { setGalleryIndex(0); }, [turf?.id]);
  if (!turf) return null;

  const gallery = turf.images.length ? turf.images : (turf.primaryImage ? [turf.primaryImage] : []);

  return (
    <Drawer open title="Turf details" onClose={onClose}>
      {gallery.length > 0 && (
        <div className="admin-gallery">
          <img className="admin-gallery-main" src={gallery[galleryIndex]} alt={turf.name} />
          {gallery.length > 1 && (
            <div className="admin-gallery-thumbs">
              {gallery.map((image, index) => (
                <button type="button" key={`${image.slice(0, 24)}-${index}`} className={index === galleryIndex ? 'active' : ''} onClick={() => setGalleryIndex(index)} aria-label={`View image ${index + 1}`}>
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="admin-detail-head">
        <div>
          <h3>{turf.name}</h3>
          <p>{turf.area} · {turf.owner}</p>
          <StatusPill status={turf.status} />
        </div>
      </div>

      {turf.status === TURF_STATUS.SUSPENDED && turf.suspensionReason && (
        <div className="admin-detail-note danger"><strong>Suspension reason</strong><span>{turf.suspensionReason}</span></div>
      )}

      <div className="admin-detail-actions">
        {turf.managed ? (
          <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => onEdit(turf.id)}>
            <AdminIcon name="edit" size={15} /> Edit
          </button>
        ) : (
          <span className="admin-detail-hint">Catalogue turf — read only</span>
        )}
        {turf.status === TURF_STATUS.SUSPENDED ? (
          <button type="button" className="btn btn-primary admin-action-btn" onClick={() => onStatus(turf, 'activate')}>
            <AdminIcon name="check" size={15} /> Activate
          </button>
        ) : (
          <button type="button" className="btn admin-btn-danger" onClick={() => onStatus(turf, 'suspend')}>
            <AdminIcon name="ban" size={15} /> Suspend
          </button>
        )}
        {turf.managed && (
          <button type="button" className="btn admin-btn-danger" onClick={() => onDelete(turf)}>
            <AdminIcon name="close" size={15} /> Delete
          </button>
        )}
      </div>

      <section className="admin-detail-section">
        <h4>Details</h4>
        <div className="admin-detail-grid">
          <DetailField label="Owner" value={turf.owner} />
          <DetailField label="Area" value={turf.area} />
          <DetailField label="Address" value={turf.address} />
          <DetailField label="Operating hours" value={turf.openingHours} />
          <DetailField label="Contact" value={turf.contact} />
          <DetailField label="Starting price" value={turf.price} />
        </div>
      </section>

      <section className="admin-detail-section">
        <h4>Sports</h4>
        {turf.sports.length ? <div className="admin-chip-row">{turf.sports.map((item) => <span className="admin-mini-chip" key={item}>{item}</span>)}</div> : <p className="admin-detail-empty">No sports listed.</p>}
      </section>

      <section className="admin-detail-section">
        <h4>Facilities</h4>
        {turf.facilities.length ? <div className="admin-chip-row">{turf.facilities.map((item) => <span className="admin-mini-chip" key={item}>{item}</span>)}</div> : <p className="admin-detail-empty">No facilities listed.</p>}
      </section>

      {turf.description && (
        <section className="admin-detail-section">
          <h4>Description</h4>
          <p className="admin-detail-text">{turf.description}</p>
        </section>
      )}
    </Drawer>
  );
}

function DetailField({ label, value }) {
  return <div className="admin-detail-field"><span>{label}</span><strong>{value || '—'}</strong></div>;
}

/* ---------- Shared turf form (create + edit) ---------- */
export function TurfForm({ initial, owners, onSubmit, onCancel, submitLabel = 'Save turf' }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [imageError, setImageError] = useState('');

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleIn = (key, value) => setForm((current) => ({
    ...current,
    [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
  }));

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    try {
      const encoded = await Promise.all(files.map((file) => compressImageFile(file)));
      setForm((current) => ({ ...current, images: [...current.images, ...encoded], primaryImage: current.primaryImage || encoded[0] }));
      setImageError('');
    } catch {
      setImageError('One or more images could not be processed.');
    }
  };

  const removeImage = (image) => setForm((current) => {
    const images = current.images.filter((item) => item !== image);
    return { ...current, images, primaryImage: current.primaryImage === image ? (images[0] || '') : current.primaryImage };
  });

  const submit = (event) => {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Turf name is required.';
    if (!form.area.trim()) next.area = 'Area is required.';
    if (!form.address.trim()) next.address = 'Address is required.';
    if (!form.sports.length) next.sports = 'Select at least one sport.';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit(form);
  };

  return (
    <form className="admin-turf-form" onSubmit={submit}>
      <section className="admin-form-section">
        <h4>Basic details</h4>
        <div className="admin-form-grid">
          <label className="form-field"><span>Turf name *</span><input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Riverside Arena" />{errors.name && <small className="admin-field-error">{errors.name}</small>}</label>
          <label className="form-field"><span>Owner</span>
            <select value={form.ownerId} onChange={(e) => { const owner = owners.find((item) => item.id === e.target.value); update('ownerId', e.target.value); update('ownerName', owner?.name || ''); }}>
              <option value="">— Unassigned —</option>
              {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
            </select>
          </label>
          <label className="form-field"><span>Area *</span><input value={form.area} onChange={(e) => update('area', e.target.value)} placeholder="e.g. Bhayli" />{errors.area && <small className="admin-field-error">{errors.area}</small>}</label>
          <label className="form-field"><span>Contact number</span><input value={form.contactNumber} onChange={(e) => update('contactNumber', e.target.value)} placeholder="98765 43210" /></label>
          <label className="form-field admin-field-wide"><span>Address *</span><input value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Street, landmark, city" />{errors.address && <small className="admin-field-error">{errors.address}</small>}</label>
        </div>
      </section>

      <section className="admin-form-section">
        <h4>Sports *</h4>
        <div className="admin-chip-toggle-row">
          {SPORTS.map((sport) => (
            <button type="button" key={sport} className={`admin-chip-toggle ${form.sports.includes(sport) ? 'active' : ''}`} onClick={() => toggleIn('sports', sport)}>{sport}</button>
          ))}
        </div>
        {errors.sports && <small className="admin-field-error">{errors.sports}</small>}
      </section>

      <section className="admin-form-section">
        <h4>Facilities</h4>
        <div className="admin-chip-toggle-row">
          {FACILITIES.map((facility) => (
            <button type="button" key={facility} className={`admin-chip-toggle ${form.facilities.includes(facility) ? 'active' : ''}`} onClick={() => toggleIn('facilities', facility)}>{facility}</button>
          ))}
        </div>
      </section>

      <section className="admin-form-section">
        <h4>Operating hours</h4>
        <div className="admin-form-grid">
          <label className="form-field"><span>Opening time</span><input type="time" value={form.openingTime} onChange={(e) => update('openingTime', e.target.value)} /></label>
          <label className="form-field"><span>Closing time</span><input type="time" value={form.closingTime} onChange={(e) => update('closingTime', e.target.value)} /></label>
        </div>
      </section>

      <section className="admin-form-section">
        <h4>Images</h4>
        <label className="admin-upload-drop">
          <input type="file" accept="image/*" multiple onChange={handleFiles} />
          <AdminIcon name="turf" size={20} />
          <span>Click to upload images</span>
          <small>JPG or PNG · compressed automatically</small>
        </label>
        {imageError && <small className="admin-field-error">{imageError}</small>}
        {form.images.length > 0 && (
          <div className="admin-image-preview-grid">
            {form.images.map((image, index) => (
              <div className={`admin-image-preview ${form.primaryImage === image ? 'is-primary' : ''}`} key={`${image.slice(0, 24)}-${index}`}>
                <img src={image} alt="" />
                {form.primaryImage === image && <span className="admin-image-primary-tag">Primary</span>}
                <div className="admin-image-preview-actions">
                  <button type="button" onClick={() => update('primaryImage', image)} title="Set as primary">Set cover</button>
                  <button type="button" onClick={() => removeImage(image)} title="Remove">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-form-section">
        <h4>Description</h4>
        <label className="form-field"><span>About this turf</span><textarea rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Describe the venue, surface and highlights…" /></label>
      </section>

      <div className="admin-form-foot">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}

/* ---------- Edit modal wraps the shared form ---------- */
function TurfEditModal({ turf, owners, onClose, onSave }) {
  const initial = {
    name: turf.name,
    ownerId: turf.ownerId,
    ownerName: turf.owner,
    area: turf.area,
    address: turf.address,
    contactNumber: turf.contact === '—' ? '' : turf.contact,
    sports: turf.sports,
    facilities: turf.facilities,
    openingTime: turf.openingTime,
    closingTime: turf.closingTime,
    images: turf.images,
    primaryImage: turf.primaryImage,
    description: turf.description,
  };
  return (
    <Modal open title={`Edit ${turf.name}`} onClose={onClose} size="lg">
      <TurfForm initial={initial} owners={owners} onSubmit={onSave} onCancel={onClose} submitLabel="Save changes" />
    </Modal>
  );
}

export default TurfsPage;