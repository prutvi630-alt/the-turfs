import { useState } from 'react';
import { sports } from './data/homeData';
import { createId, getDemoState } from './data/demoStore';
import { createTeamLogoDataUrl } from './data/teamAssets';
import { deletePlayerTeam, savePlayerTeam } from './data/ownerTeams';
import { maskBankAccountNumber } from './data/staffBankDetails';
import { getAllTournaments } from './data/dashboardSelectors';
import {
  getTournamentRegistrationType,
  getTournamentSlotAvailability,
  isTournamentRegistrationOpen,
} from './data/adminRegistrations';
import { formatTournamentFee, getConfiguredTournamentFeeAmount } from './data/tournamentFees';
import { route } from './config/routes';
import { Toast } from './admin/AdminUI';

const emptyBankDetails = () => ({ bankName: '', accountNumber: '', ifscCode: '' });
const emptyTeam = () => ({
  name: '',
  sport: '',
  description: '',
  logo: '',
  members: [],
  captainBankDetails: emptyBankDetails(),
});
const fullName = (player) => `${player?.firstName || ''} ${player?.surname || ''}`.trim() || 'Player';
const formatTournamentDate = (value) => {
  if (!value) return 'Not listed';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

function PlayerTeams({ state, player, refresh }) {
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyTeam);
  const [memberEditor, setMemberEditor] = useState(null);
  const [memberForm, setMemberForm] = useState({ name: '', mobile: '', age: '', email: '', role: 'Player' });
  const [formError, setFormError] = useState('');
  const [memberError, setMemberError] = useState('');
  const [toast, setToast] = useState(null);
  const [pendingTournamentId, setPendingTournamentId] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('cliftPendingTournamentRegistration') || 'null')?.tournamentId || '';
    } catch {
      return '';
    }
  });
  const teams = (state.teams || []).filter((team) => team.playerId === player.id && !team.ownerId);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const teamTournaments = getAllTournaments()
    .filter((tournament) => {
      const eventDate = tournament.date || tournament.startDate;
      return getTournamentRegistrationType(tournament) === 'Team'
        && eventDate >= today
        && !['draft', 'unpublished', 'cancelled', 'canceled', 'completed', 'live', 'ongoing'].includes(String(tournament.status || '').toLowerCase())
        && tournament.published !== false;
    })
    .sort((first, second) => String(first.date || first.startDate).localeCompare(String(second.date || second.startDate)));
  const pendingRegistration = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('cliftPendingTournamentRegistration') || 'null');
    } catch {
      return null;
    }
  })();
  const pendingTournament = pendingTournamentId
    ? getAllTournaments().find((tournament) => String(tournament.id) === String(pendingTournamentId))
    : null;

  const getTeamMembers = (team) => {
    if (Array.isArray(team.members)) return team.members;
    return (team.memberIds || []).map((id, index) => {
      const member = (state.players || []).find((candidate) => candidate.id === id);
      return member ? {
        id: member.id,
        playerId: member.id,
        name: fullName(member),
        mobile: member.mobile || '',
        age: member.age || '',
        email: member.email || '',
        role: team.captainId === member.id || (!team.captainId && index === 0) ? 'Captain' : 'Player',
      } : null;
    }).filter(Boolean);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyTeam());
    setFormError('');
    setFormOpen(true);
  };
  const openEdit = (team) => {
    setEditing(team.id);
    setForm({
      name: team.name || '',
      sport: team.sport || '',
      description: team.description || '',
      logo: team.logo || '',
      members: getTeamMembers(team),
      captainBankDetails: {
        bankName: team.captainDetails?.bankDetails?.bankName || team.captainDetails?.bankName || '',
        accountNumber: team.captainDetails?.bankDetails?.accountNumber || team.captainDetails?.accountNumber || '',
        ifscCode: team.captainDetails?.bankDetails?.ifscCode || team.captainDetails?.ifscCode || '',
      },
    });
    setFormError('');
    setFormOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) {
      setFormError('Team name is required.');
      return;
    }
    if (!form.sport) {
      setFormError('Select a game or sport.');
      return;
    }
    const result = savePlayerTeam({ playerId: player.id, teamId: editing, values: form });
    if (!result.ok) {
      setFormError(result.error);
      setToast({ tone: 'danger', title: 'Team not saved', text: result.error });
      return;
    }
    setFormOpen(false);
    setEditing(null);
    setToast({ tone: 'success', title: editing ? 'Team updated successfully.' : 'Team created successfully.' });
    refresh();
  };
  const removeTeam = (team) => {
    if (!window.confirm(`Delete ${team.name}? This will not delete any player account.`)) return;
    const result = deletePlayerTeam({ playerId: player.id, teamId: team.id });
    if (!result.ok) {
      setToast({ tone: 'danger', title: 'Team not deleted', text: result.error });
      return;
    }
    setToast({ tone: 'success', title: 'Team deleted.' });
    refresh();
  };
  const openMemberEditor = (member = null) => {
    setMemberForm(member
      ? { name: member.name || '', mobile: member.mobile || '', age: String(member.age || ''), email: member.email || '', role: member.role || 'Player' }
      : { name: '', mobile: '', age: '', email: '', role: 'Player' });
    setMemberError('');
    setMemberEditor(member?.id || '');
  };
  const saveMember = () => {
    const member = {
      ...memberForm,
      name: memberForm.name.trim(),
      mobile: memberForm.mobile.replace(/\D/g, ''),
      age: Number(memberForm.age),
      email: memberForm.email.trim().toLowerCase(),
    };
    if (!member.name || !/^[6-9]\d{9}$/.test(member.mobile) || !Number.isInteger(member.age) || member.age < 1 || member.age > 120 || !/^\S+@\S+\.\S+$/.test(member.email)) {
      setMemberError('Enter a valid name, 10-digit mobile number, age and email address.');
      return;
    }
    if (member.role === 'Captain' && form.members.some((item) => item.role === 'Captain' && item.id !== memberEditor)) {
      setMemberError('This team already has a captain. Please update the existing captain first.');
      return;
    }
    if (form.members.some((item) => item.id !== memberEditor && (item.email.toLowerCase() === member.email || item.mobile === member.mobile))) {
      setMemberError('A player with this email or mobile number is already on the team.');
      return;
    }
    if (memberEditor) {
      const previousMember = form.members.find((item) => item.id === memberEditor);
      setForm((current) => ({
        ...current,
        members: current.members.map((item) => item.id === memberEditor ? { ...item, ...member } : item),
        captainBankDetails: previousMember?.role === 'Captain' && member.role !== 'Captain'
          ? emptyBankDetails()
          : previousMember?.role !== 'Captain' && member.role === 'Captain'
            ? emptyBankDetails()
            : current.captainBankDetails,
      }));
    } else {
      setForm((current) => ({ ...current, members: [...current.members, { ...member, id: createId('team-player') }] }));
    }
    setMemberEditor(null);
  };
  const removeMember = (member) => {
    if (!window.confirm('Are you sure you want to remove this player from the team?')) return;
    setForm((current) => ({
      ...current,
      members: current.members.filter((item) => item.id !== member.id),
      captainBankDetails: member.role === 'Captain' ? emptyBankDetails() : current.captainBankDetails,
    }));
    setToast({ tone: 'success', title: member.role === 'Captain' ? 'Captain removed from team.' : 'Player removed.' });
  };
  const uploadLogo = async (file) => {
    try {
      const logo = await createTeamLogoDataUrl(file);
      setForm((current) => ({ ...current, logo }));
      setFormError('');
    } catch (error) {
      setFormError(error.message);
      setToast({ tone: 'danger', title: 'Logo upload failed', text: error.message });
    }
  };
  const continueTournamentRegistration = () => {
    if (!pendingTournament) return;
    const returnPath = `/tournaments/${pendingTournament.id}?registerTeam=1`;
    try {
      sessionStorage.setItem('cliftPendingTournamentRegistration', JSON.stringify({
        ...pendingRegistration,
        returnPath,
        createdAt: Date.now(),
      }));
    } catch {
      setToast({ tone: 'danger', title: 'Could not resume registration', text: 'Please allow session storage and try again.' });
      return;
    }
    setPendingTournamentId(pendingTournament.id);
    window.location.href = route(returnPath);
  };
  const createTeamForTournament = (tournament) => {
    if (formOpen && editing !== null) {
      setToast({ tone: 'warn', title: 'Finish the current edit first', text: 'Save or cancel the team edit before creating a team for this tournament.' });
      return;
    }
    const availability = getTournamentSlotAvailability(tournament.id);
    if (!isTournamentRegistrationOpen(tournament) || !availability.ok || availability.availableCount === 0) {
      setToast({
        tone: 'warn',
        title: 'Registration unavailable',
        text: !isTournamentRegistrationOpen(tournament)
          ? 'Tournament registration is closed.'
          : availability.error || 'Tournament registration is full.',
      });
      return;
    }
    const returnPath = `/tournaments/${tournament.id}?registerTeam=1`;
    try {
      sessionStorage.setItem('cliftPendingTournamentRegistration', JSON.stringify({
        tournamentId: tournament.id,
        returnPath,
        createdAt: Date.now(),
      }));
    } catch {
      setToast({ tone: 'danger', title: 'Could not start registration', text: 'Please allow session storage and try again.' });
      return;
    }
    setPendingTournamentId(tournament.id);
    if (formOpen) {
      setForm((current) => ({ ...current, sport: tournament.sport }));
      setFormError('');
    } else {
      openCreate();
      setForm((current) => ({ ...current, sport: tournament.sport }));
    }
  };
  const openTournamentRegistration = (tournament) => {
    const returnPath = `/tournaments/${tournament.id}?registerTeam=1`;
    try {
      sessionStorage.setItem('cliftPendingTournamentRegistration', JSON.stringify({
        tournamentId: tournament.id,
        returnPath,
        createdAt: Date.now(),
      }));
    } catch {
      setToast({ tone: 'danger', title: 'Could not start registration', text: 'Please allow session storage and try again.' });
      return;
    }
    setPendingTournamentId(tournament.id);
    window.location.href = route(returnPath);
  };

  return <section className="dashboard-block player-teams-section" id="player-teams">
    <div className="player-team-section-heading">
      <div><span className="section-kicker">YOUR TEAMS</span><h2>MANAGE YOUR TEAM.</h2><p>Create a roster once, then choose it for eligible team tournaments.</p></div>
      <button type="button" className="btn btn-primary" onClick={openCreate}>Create Team</button>
    </div>
    {pendingTournament && <div className="player-team-pending-link"><span>Continue registration for <strong>{pendingTournament.name}</strong> after creating a team.</span><button type="button" className="btn btn-secondary" onClick={continueTournamentRegistration}>Continue to Tournament</button></div>}
    {formOpen && <article className="owner-form-panel owner-team-form player-team-form">
      <div className="owner-team-form-heading"><div><span className="section-kicker">{editing ? 'UPDATE YOUR TEAM' : 'NEW TEAM'}</span><h3>{editing ? 'Edit Team Details' : 'Create Your Team'}</h3></div><button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button></div>
      <div className="owner-edit-grid">
        <label className="form-field"><span>Team Name<b>*</b></span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Enter team name" /></label>
        <label className="form-field"><span>Game / Sport<b>*</b></span><select value={form.sport} onChange={(event) => setForm((current) => ({ ...current, sport: event.target.value }))}><option value="">Select Game</option>{sports.map((sport) => <option key={sport.id} value={sport.name}>{sport.name}</option>)}</select></label>
        <label className="form-field"><span>Description</span><input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Add a short description" /></label>
        <div className="form-field"><span>Team Logo</span><div className="owner-team-logo-picker">{form.logo ? <img src={form.logo} alt="Team logo preview" /> : <span className="owner-team-logo-placeholder">TEAM</span>}<label className="btn btn-secondary upload-button">{form.logo ? 'Change Logo' : 'Upload Logo'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadLogo(file); event.target.value = ''; }} /></label>{form.logo && <button type="button" className="text-button danger" onClick={() => setForm((current) => ({ ...current, logo: '' }))}>Remove logo</button>}</div></div>
      </div>
      {formError && <p className="inline-error" role="alert">{formError}</p>}
      <div className="owner-team-members-heading"><div><span className="section-kicker">TEAM ROSTER</span><h3>Team Players</h3><p>Add player details and assign no more than one captain.</p></div><button type="button" className="btn btn-secondary" onClick={() => openMemberEditor()}>Add Team Player</button></div>
      {form.members.length ? <div className="owner-team-member-list">{form.members.map((member) => <article className="owner-team-member" key={member.id}><div><strong>{member.name}</strong><span>{member.mobile} · Age {member.age} · {member.email}</span></div><span className={`status-pill ${member.role === 'Captain' ? 'status-approved' : ''}`}>{member.role.toUpperCase()}</span><div className="owner-record-actions"><button type="button" className="btn btn-secondary" onClick={() => openMemberEditor(member)}>Edit</button><button type="button" className="btn btn-secondary" onClick={() => removeMember(member)}>Remove</button></div></article>)}</div> : <div className="dashboard-empty"><strong>No players added yet</strong><span>Use Add Team Player to build your roster.</span></div>}
      <section className="owner-captain-details">
        <div><span className="section-kicker">TEAM LEAD</span><h3>Captain Details</h3></div>
        <div className="owner-captain-fields">
          {(() => {
            const captain = form.members.find((member) => member.role === 'Captain');
            return captain ? <>
              <div className="detail-line"><span>Captain Name</span><strong>{captain.name}</strong></div>
              <div className="detail-line"><span>Captain Age</span><strong>{captain.age}</strong></div>
              <div className="detail-line"><span>Captain Mobile Number</span><strong>{captain.mobile}</strong></div>
              <div className="detail-line"><span>Captain Email ID</span><strong>{captain.email}</strong></div>
            </> : <p className="form-section-note">No captain assigned yet. Add a player and set their role to Captain.</p>;
          })()}
          <label className="form-field"><span>Bank Name</span><input value={form.captainBankDetails.bankName} onChange={(event) => setForm((current) => ({ ...current, captainBankDetails: { ...current.captainBankDetails, bankName: event.target.value } }))} placeholder="Enter bank name" /></label>
          <label className="form-field"><span>Account Number</span><input type="text" inputMode="numeric" maxLength={18} value={form.captainBankDetails.accountNumber} onChange={(event) => setForm((current) => ({ ...current, captainBankDetails: { ...current.captainBankDetails, accountNumber: event.target.value.replace(/\D/g, '').slice(0, 18) } }))} placeholder="Enter account number (9–18 digits)" /></label>
          <label className="form-field"><span>IFSC Code</span><input maxLength={11} value={form.captainBankDetails.ifscCode} onChange={(event) => setForm((current) => ({ ...current, captainBankDetails: { ...current.captainBankDetails, ifscCode: event.target.value.replace(/[^a-z\d]/gi, '').toUpperCase().slice(0, 11) } }))} placeholder="e.g. SBIN0001234" /></label>
        </div>
      </section>
      <button type="button" className="btn btn-primary player-team-submit" onClick={save}>{editing ? 'Update Team' : 'Submit Team'}</button>
    </article>}
    {teams.length ? <div className="player-team-card-grid">{teams.map((team) => {
      const members = getTeamMembers(team);
      const captain = members.find((member) => member.role === 'Captain') || team.captainDetails;
      const hasActiveRegistration = (state.registrations || []).some((registration) => registration.teamId === team.id && ['pending', 'approved'].includes(registration.status));
      const bankDetails = team.captainDetails?.bankDetails || team.captainDetails || {};
      return <article className="player-team-card" key={team.id}>
        <div className="player-team-card-header">{team.logo ? <img src={team.logo} alt={`${team.name} logo`} /> : <span className="owner-team-logo-placeholder">TEAM</span>}<div><span className="sport-chip">{team.sport}</span><h3>{team.name}</h3></div></div>
        <div className="player-team-card-facts"><span>Captain <strong>{captain?.name || 'Not assigned'}</strong></span><span>Players <strong>{members.length}</strong></span></div>
        {captain && <p className="player-team-captain-bank">Bank: {bankDetails.bankName || 'Not provided'} · Account: {bankDetails.accountNumber ? maskBankAccountNumber(bankDetails.accountNumber) : 'Not provided'} · IFSC: {bankDetails.ifscCode || 'Not provided'}</p>}
        <div className="player-team-card-actions"><button type="button" className="btn btn-secondary" onClick={() => openEdit(team)}>View / Edit</button><button type="button" className="btn btn-secondary" disabled={hasActiveRegistration} onClick={() => removeTeam(team)}>{hasActiveRegistration ? 'Registered team' : 'Delete'}</button></div>
      </article>;
    })}</div> : !formOpen && <div className="dashboard-empty"><strong>No teams yet</strong><span>Create a team here to register for team tournaments.</span></div>}
    <section className="player-team-tournament-section">
      <div><span className="section-kicker">TEAM TOURNAMENTS</span><h3>REGISTER YOUR TEAM.</h3><p>Only your own teams with a matching game can be selected.</p></div>
      {teamTournaments.length ? <div className="player-team-tournament-grid">{teamTournaments.map((tournament) => {
        const eligibleTeams = teams.filter((team) => String(team.sport || '').toLowerCase() === String(tournament.sport || '').toLowerCase());
        const alreadyRegistered = eligibleTeams.filter((team) => (state.registrations || []).some((registration) => (
          registration.tournamentId === tournament.id && registration.teamId === team.id && ['pending', 'approved'].includes(registration.status)
        )));
        const slots = getTournamentSlotAvailability(tournament.id);
        const registrationOpen = isTournamentRegistrationOpen(tournament);
        const hasAvailableSlot = slots.ok && slots.availableCount > 0;
        const configuredFee = getConfiguredTournamentFeeAmount(tournament.entryFee);
        const feeConfigured = configuredFee !== null;
        const canRegister = registrationOpen && hasAvailableSlot && feeConfigured
          && eligibleTeams.some((team) => !alreadyRegistered.some((registeredTeam) => registeredTeam.id === team.id));
        const deadline = tournament.registrationEnd || tournament.date || tournament.startDate;
        const eventDate = tournament.dateLabel || tournament.date || tournament.startDate;
        const allEligibleTeamsRegistered = eligibleTeams.length > 0 && alreadyRegistered.length === eligibleTeams.length;
        return <article className="player-team-tournament-card" key={tournament.id}>
          <div className="player-team-tournament-image">
            <span aria-hidden="true">TOURNAMENT</span>
            {tournament.image && <img src={tournament.image} alt={`${tournament.name} tournament`} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
          </div>
          <div className="player-team-tournament-content">
            <span className="sport-chip">{tournament.sport}</span>
            <h4>{tournament.name}</h4>
            <div className="player-team-tournament-details">
              <span><strong>Date</strong>{formatTournamentDate(eventDate)}</span>
              <span><strong>Venue</strong>{tournament.venueName || 'Venue to be announced'}</span>
              <span><strong>Team fee</strong>{feeConfigured ? `${formatTournamentFee(tournament.entryFee)} per team` : 'Not configured'}</span>
              <span><strong>Deadline</strong>{formatTournamentDate(deadline)}</span>
              <span><strong>Available slots</strong>{slots.ok ? slots.availableCount : slots.error || 'Unavailable'}</span>
            </div>
            {eligibleTeams.length ? <small>{eligibleTeams.length} eligible team(s)</small> : <small>No eligible team found for this game.</small>}
            <div className="player-team-tournament-action">
              {eligibleTeams.length ? (
                <button type="button" className="btn btn-primary" disabled={!canRegister} onClick={() => openTournamentRegistration(tournament)}>
                  {allEligibleTeamsRegistered ? 'Already Registered' : !registrationOpen ? 'Registration Closed' : !feeConfigured ? 'Fee Not Configured' : !hasAvailableSlot ? 'No Slots Available' : 'Register Team'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!registrationOpen || !hasAvailableSlot}
                  onClick={() => createTeamForTournament(tournament)}
                >
                  {!registrationOpen ? 'Registration Closed' : !hasAvailableSlot ? 'No Slots Available' : 'Create Matching Team'}
                </button>
              )}
            </div>
          </div>
        </article>;
      })}</div> : <div className="dashboard-empty"><strong>No upcoming team tournaments</strong><span>Published team tournaments will appear here.</span></div>}
    </section>
    {memberEditor !== null && <div className="review-modal-backdrop"><section className="review-modal owner-team-player-modal" role="dialog" aria-modal="true" aria-labelledby="player-team-member-title"><button type="button" className="modal-close" onClick={() => setMemberEditor(null)} aria-label="Close player form">×</button><span className="section-kicker">TEAM ROSTER</span><h2 id="player-team-member-title">{memberEditor ? 'EDIT TEAM PLAYER' : 'ADD TEAM PLAYER'}</h2><div className="owner-team-player-fields">
      <label className="form-field"><span>Player Name</span><input value={memberForm.name} onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))} /></label>
      <label className="form-field"><span>Mobile Number</span><input inputMode="numeric" maxLength={10} value={memberForm.mobile} onChange={(event) => setMemberForm((current) => ({ ...current, mobile: event.target.value.replace(/\D/g, '').slice(0, 10) }))} /></label>
      <label className="form-field"><span>Age</span><input type="number" min="1" max="120" value={memberForm.age} onChange={(event) => setMemberForm((current) => ({ ...current, age: event.target.value }))} /></label>
      <label className="form-field"><span>Email ID</span><input type="email" value={memberForm.email} onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))} /></label>
      <label className="form-field"><span>Player Type / Role</span><select value={memberForm.role} onChange={(event) => setMemberForm((current) => ({ ...current, role: event.target.value }))}><option>Player</option><option>Captain</option></select></label>
    </div>{memberError && <p className="inline-error" role="alert">{memberError}</p>}<div className="owner-team-player-actions"><button type="button" className="btn btn-secondary" onClick={() => setMemberEditor(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={saveMember}>{memberEditor ? 'Save Player' : 'Add Player'}</button></div></section></div>}
    <Toast toast={toast} onDismiss={() => setToast(null)} />
  </section>;
}

export default PlayerTeams;
