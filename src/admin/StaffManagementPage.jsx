import { useMemo, useState } from 'react';
import AdminIcon from './AdminIcon';
import { ConfirmDialog, FilterSelect, SearchInput, StatusPill, Toast } from './AdminUI';
import { getDemoState, saveDemoState } from '../data/demoStore';

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const rowsForStaff = (state) => {
  const staff = [
    ...(state.coaches || []).map((account) => ({ ...account, kind: 'coach' })),
    ...(state.scorers || []).map((account) => ({ ...account, kind: 'scorer' })),
  ];

  return staff.map((account) => {
    const applications = (state.staffApplications || []).filter((item) => item.applicantId === account.id);
    return {
      ...account,
      status: account.active === false ? 'suspended' : (account.status || 'active'),
      sportsLabel: Array.isArray(account.sports) && account.sports.length ? account.sports.join(', ') : (account.sport || '—'),
      applicationCount: applications.length,
    };
  });
};

export default function StaffManagementPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const state = useMemo(() => getDemoState(), [refreshKey]);
  const rows = useMemo(() => rowsForStaff(state), [state]);
  const applications = (state.staffApplications || []).map((application) => {
    const account = [...(state.coaches || []), ...(state.scorers || [])]
      .find((item) => item.id === application.applicantId);
    return {
      ...application,
      applicantName: account?.name || 'Unknown staff member',
      applicantRole: application.role === 'coach' ? 'Coach' : 'Scorer',
    };
  });
  const filtered = rows.filter((row) => {
    const haystack = [row.name, row.email, row.mobile, row.sportsLabel, row.kind].join(' ').toLowerCase();
    return (!query || haystack.includes(query.trim().toLowerCase()))
      && (roleFilter === 'All' || row.kind === roleFilter)
      && (statusFilter === 'All' || row.status === statusFilter);
  });

  const refresh = () => setRefreshKey((value) => value + 1);

  const updateStatus = (row, nextStatus) => {
    const state = getDemoState();
    const collection = row.kind === 'coach' ? 'coaches' : 'scorers';
    const account = (state[collection] || []).find((item) => item.id === row.id);
    if (!account) {
      setToast({ tone: 'danger', title: 'Action failed', text: 'Account not found.' });
      return;
    }

    account.active = nextStatus !== 'suspended';
    account.status = nextStatus;
    if (nextStatus === 'rejected') account.active = false;
    if (!saveDemoState(state)) {
      setToast({ tone: 'danger', title: 'Action failed', text: 'Unable to save the staff status. Please try again.' });
      return;
    }
    setConfirm(null);
    refresh();
    setToast({ tone: nextStatus === 'suspended' || nextStatus === 'rejected' ? 'warn' : 'success', title: 'Staff updated', text: `${row.name} marked ${nextStatus}.` });
  };

  const updateApplicationStatus = (applicationId, nextStatus) => {
    const state = getDemoState();
    const application = (state.staffApplications || []).find((item) => item.id === applicationId);
    if (!application) {
      setToast({ tone: 'danger', title: 'Action failed', text: 'Application not found.' });
      return;
    }
    if (application.status !== 'pending') {
      setToast({ tone: 'warn', title: 'Already reviewed', text: 'This application is no longer pending.' });
      return;
    }

    const applicantName = [...(state.coaches || []), ...(state.scorers || [])]
      .find((item) => item.id === application.applicantId)?.name || 'Staff member';
    application.status = nextStatus;
    application.respondedAt = new Date().toISOString();
    if (!saveDemoState(state)) {
      setToast({ tone: 'danger', title: 'Action failed', text: 'Unable to save the application decision. Please try again.' });
      return;
    }
    refresh();
    setToast({
      tone: nextStatus === 'approved' ? 'success' : 'warn',
      title: 'Application reviewed',
      text: `${applicantName}'s application marked ${nextStatus}.`,
    });
  };

  const removeStaff = (row) => {
    const state = getDemoState();
    const collection = row.kind === 'coach' ? 'coaches' : 'scorers';
    state[collection] = (state[collection] || []).filter((item) => item.id !== row.id);
    state.staffApplications = (state.staffApplications || []).filter((item) => item.applicantId !== row.id);
    if (!saveDemoState(state)) {
      setToast({ tone: 'danger', title: 'Action failed', text: 'Unable to remove the staff member. Please try again.' });
      return;
    }
    setConfirm(null);
    refresh();
    setToast({ tone: 'warn', title: 'Staff removed', text: `${row.name} was removed from the platform.` });
  };

  return (
    <div className="admin-list-page">
      <div className="admin-dash-head">
        <div>
          <span className="section-kicker">COACHES &amp; SCORERS</span>
          <h2>Staff management</h2>
          <p>Review role-based registrations, activity and tournament applications across every sport.</p>
        </div>
        <div className="admin-stat-mini-grid registration-summary">
          <div className="admin-stat-mini"><strong>{rows.length}</strong><span>Total</span></div>
          <div className="admin-stat-mini"><strong>{rows.filter((row) => row.status === 'pending').length}</strong><span>Pending</span></div>
        </div>
      </div>

      <div className="admin-toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, email or sport…" />
        <div className="admin-toolbar-filters">
          <FilterSelect label="Role" value={roleFilter} options={['All', 'coach', 'scorer']} onChange={setRoleFilter} />
          <FilterSelect label="Status" value={statusFilter} options={['All', 'active', 'pending', 'rejected', 'suspended']} onChange={setStatusFilter} />
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Role</th>
              <th>Sports</th>
              <th>Email</th>
              <th>Applications</th>
              <th>Status</th>
              <th>Joined</th>
              <th className="admin-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td data-label="Staff">
                  <div className="admin-cell-person">
                    <span className="admin-avatar"><AdminIcon name="user" size={16} /></span>
                    <span className="admin-cell-person-text">
                      <strong>{row.name}</strong>
                      <small>{row.mobile}</small>
                    </span>
                  </div>
                </td>
                <td data-label="Role">{row.kind === 'coach' ? 'Coach' : 'Scorer'}</td>
                <td data-label="Sports">{row.sportsLabel}</td>
                <td data-label="Email">{row.email}</td>
                <td data-label="Applications"><span className="admin-count-badge">{row.applicationCount}</span></td>
                <td data-label="Status"><StatusPill status={row.status} /></td>
                <td data-label="Joined">{formatDate(row.createdAt)}</td>
                <td data-label="Actions" className="admin-col-actions">
                  <div className="admin-row-actions">
                    {row.status !== 'suspended' && row.status !== 'rejected' && (
                      <button type="button" className="admin-icon-action warn" title="Suspend" aria-label={`Suspend ${row.name}`} onClick={() => setConfirm({ type: 'suspend', row })}><AdminIcon name="ban" size={15} /></button>
                    )}
                    {row.status === 'suspended' && (
                      <button type="button" className="admin-icon-action ok" title="Activate" aria-label={`Activate ${row.name}`} onClick={() => setConfirm({ type: 'active', row })}><AdminIcon name="check" size={15} /></button>
                    )}
                    <button type="button" className="admin-icon-action danger" title="Remove" aria-label={`Remove ${row.name}`} onClick={() => setConfirm({ type: 'remove', row })}><AdminIcon name="close" size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="admin-empty"><strong>No staff found</strong><p>Adjust the filters or add a new coach or scorer registration to populate this list.</p></div>}
      </div>

      <section className="admin-list-page">
        <div className="admin-dash-head">
          <div>
            <span className="section-kicker">TOURNAMENT ASSIGNMENTS</span>
            <h2>Staff applications</h2>
            <p>Review Coach and Scorer requests for tournament coverage.</p>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Role</th>
                <th>Tournament</th>
                <th>Sport</th>
                <th>Applied</th>
                <th>Status</th>
                <th className="admin-col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td data-label="Applicant">{application.applicantName}</td>
                  <td data-label="Role">{application.applicantRole}</td>
                  <td data-label="Tournament">{application.tournamentName}</td>
                  <td data-label="Sport">{application.sport || '—'}</td>
                  <td data-label="Applied">{formatDate(application.appliedAt)}</td>
                  <td data-label="Status"><StatusPill status={application.status} /></td>
                  <td data-label="Actions" className="admin-col-actions">
                    {application.status === 'pending' ? (
                      <div className="admin-row-actions">
                        <button type="button" className="admin-icon-action ok" title="Approve application" aria-label={`Approve ${application.applicantName}'s application for ${application.tournamentName}`} onClick={() => updateApplicationStatus(application.id, 'approved')}><AdminIcon name="check" size={15} /></button>
                        <button type="button" className="admin-icon-action danger" title="Reject application" aria-label={`Reject ${application.applicantName}'s application for ${application.tournamentName}`} onClick={() => updateApplicationStatus(application.id, 'rejected')}><AdminIcon name="close" size={15} /></button>
                      </div>
                    ) : <span className="admin-cell-muted">Reviewed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!applications.length && <div className="admin-empty"><strong>No applications yet</strong><p>Coach and Scorer tournament applications will appear here for review.</p></div>}
        </div>
      </section>

      {confirm && (
        <ConfirmDialog
          open
          title={confirm.type === 'remove' ? 'Remove staff member?' : confirm.type === 'suspend' ? 'Suspend staff member?' : 'Reactivate staff member?'}
          message={confirm.type === 'remove'
            ? `${confirm.row.name} will be removed from the platform and their tournament applications will be cleared.`
            : confirm.type === 'suspend'
              ? `${confirm.row.name} will be temporarily suspended and unable to access their profile.`
              : `${confirm.row.name} will be reactivated and can continue receiving tournament assignments.`}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.type === 'remove') removeStaff(confirm.row);
            else if (confirm.type === 'suspend') updateStatus(confirm.row, 'suspended');
            else updateStatus(confirm.row, 'active');
          }}
        />
      )}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
