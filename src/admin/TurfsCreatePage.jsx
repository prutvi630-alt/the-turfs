import { useState } from 'react';
import AdminIcon from './AdminIcon';
import { Toast } from './AdminUI';
import { TurfForm } from './TurfsPage';
import { createTurf, getOwnerOptions } from '../data/adminTurfs';

// TurfsCreatePage — /admin/turfs/create
//
// A dedicated full-page form (the sidebar "Add Turf" / dashboard quick action
// target). On save it writes to state.registeredTurfs via createTurf(), which
// feeds the public getAllTurfs() seam and records an activity, then returns to
// the turf list with a success toast.

const navigate = (href) => { window.location.href = href; };

const blankTurf = {
  name: '',
  ownerId: '',
  ownerName: '',
  area: '',
  address: '',
  contactNumber: '',
  sports: ['Cricket'],
  facilities: [],
  openingTime: '',
  closingTime: '',
  images: [],
  primaryImage: '',
  description: '',
};

export function TurfsCreatePage() {
  const owners = getOwnerOptions();
  const [toast, setToast] = useState(null);

  const handleSubmit = (form) => {
    const result = createTurf(form);
    if (!result.ok) { setToast({ tone: 'danger', title: 'Could not create turf', text: result.error }); return; }
    // Persist the toast across the navigation so the list page confirms the save.
    try { sessionStorage.setItem('admin-toast', JSON.stringify({ tone: 'success', title: 'Turf created', text: `${result.turf.name} was added to the platform.` })); } catch { /* ignore */ }
    navigate('/admin/turfs');
  };

  return (
    <div className="admin-list-page">
      <div className="admin-dash-head">
        <div>
          <span className="section-kicker">TURFS</span>
          <h2>Add a new turf</h2>
          <p>Create a venue listing. It becomes available to players through the shared platform data.</p>
        </div>
        <div className="admin-dash-head-actions">
          <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => navigate('/admin/turfs')}>
            <AdminIcon name="chevron" size={16} className="admin-icon-back" /> Back to turfs
          </button>
        </div>
      </div>

      <div className="admin-panel">
        <TurfForm initial={blankTurf} owners={owners} onSubmit={handleSubmit} onCancel={() => navigate('/admin/turfs')} submitLabel="Create turf" />
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

export default TurfsCreatePage;