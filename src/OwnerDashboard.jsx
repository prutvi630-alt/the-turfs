import { useMemo, useState } from 'react';
import {
  createId,
  getAllTurfs,
  getBookings,
  getDemoState,
  saveBookings,
  saveDemoState,
} from './data/demoStore';
import { sports as configuredSports } from './data/homeData';
import { ACTIVITY_TYPES, recordActivity } from './data/activityStore';
import { getAllTournaments } from './data/dashboardSelectors';
import {
  createTournamentRegistration,
  getTournamentRegistrationType,
  getTournamentSlotAvailability,
  isTournamentRegistrationOpen,
} from './data/adminRegistrations';
import { formatTournamentFeeAmount, getConfiguredTournamentFeeAmount } from './data/tournamentFees';
import { deleteOwnerTeam, saveOwnerTeam } from './data/ownerTeams';
import { createTeamLogoDataUrl } from './data/teamAssets';
import scannerImage from './data/scanner.jpeg';
import { route } from './config/routes';
import { Toast } from './admin/AdminUI';

const sections = ['Overview', 'My Turf', 'Bookings', 'Players', 'Player Requests', 'Teams', 'Tournaments', 'Availability'];
const formatDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not selected';
const fullName = (player) => `${player?.firstName || ''} ${player?.surname || ''}`.trim() || 'Player';
const normalizeTurf = (turf = {}) => ({
  ...turf,
  name: turf.name || turf.turfName,
  sports: turf.sports?.length ? turf.sports : (turf.games || ['Cricket']),
  image: turf.image || turf.images?.[0] || turf.primaryImage || '',
  area: turf.area || turf.turfAddress?.area || turf.location || 'Vadodara',
});

function OwnerDashboard({ state, session, refresh, logout }) {
  const allTurfs = getAllTurfs().map(normalizeTurf);
  const owner = state.owners.find((item) => item.id === session.userId);
  const ownerTurfs = allTurfs.filter((turf) => turf.ownerId === owner?.id || owner?.turfIds?.includes(turf.id));
  const [section, setSection] = useState('Overview');
  const [selectedTurfId, setSelectedTurfId] = useState(() => new URLSearchParams(window.location.search).get('turfId') || session.turfId || ownerTurfs[0]?.id);
  const turf = ownerTurfs.find((item) => item.id === selectedTurfId) || ownerTurfs[0];
  const [menuOpen, setMenuOpen] = useState(false);

  if (!owner || !turf) return <OwnerAccessMessage logout={logout} />;

  const chooseSection = (next) => {
    setSection(next);
    setMenuOpen(false);
  };

  return <div className="owner-dashboard dashboard-app">
    <header className="app-topbar dashboard-topbar owner-dashboard-bar"><button type="button" className="app-brand" onClick={() => window.location.href = route('/turf-owner/dashboard')}><span className="brand-mark">VS</span><span>TURF OWNER WORKSPACE</span></button><div className="dashboard-top-actions"><button type="button" className="mobile-dashboard-menu" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle owner navigation">☰</button><button type="button" className="text-button" onClick={logout}>Logout</button></div></header>
    <div className={`dashboard-frame owner-dashboard-frame ${menuOpen ? 'nav-open' : ''}`}>
      <aside className="dashboard-sidebar owner-sidebar"><div className="sidebar-profile"><span className="large-avatar">{owner.name.slice(0, 2).toUpperCase()}</span><strong>{owner.name}</strong><span>Turf owner</span></div><div className="owner-turf-switcher"><span>MANAGE TURF</span><select value={turf.id} onChange={(event) => setSelectedTurfId(event.target.value)}>{ownerTurfs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><nav>{sections.map((item) => <button type="button" className={section === item ? 'active' : ''} onClick={() => chooseSection(item)} key={item}>{item}</button>)}</nav></aside>
      <div className="dashboard-content"><main className="dashboard-main container"><div className="page-title-row"><div><span className="section-kicker">OWNER DASHBOARD / {turf.area}</span><h1>{section.toUpperCase()}.</h1><p>Manage this venue through one connected workspace. Login email: {owner.email}</p></div><span className="owner-badge">{turf.registrationStatus || 'REGISTERED'}</span></div>{section === 'Overview' && <Overview state={state} owner={owner} turf={turf} onNavigate={chooseSection} />}{section === 'My Turf' && <MyTurf state={state} owner={owner} turf={turf} refresh={refresh} />}{section === 'Bookings' && <Bookings state={state} owner={owner} turf={turf} refresh={refresh} />}{section === 'Players' && <Players state={state} owner={owner} turf={turf} />}{section === 'Player Requests' && <PlayerRequests state={state} owner={owner} turf={turf} refresh={refresh} />}{section === 'Teams' && <Teams state={state} owner={owner} turf={turf} refresh={refresh} />}{section === 'Tournaments' && <OwnerTournaments state={state} owner={owner} turf={turf} refresh={refresh} onNavigate={chooseSection} />}{section === 'Availability' && <Availability state={state} owner={owner} turf={turf} refresh={refresh} />}</main></div>
    </div>
  </div>;
}

function Overview({ state, owner, turf, onNavigate }) {
  const bookings = getBookings().filter((booking) => booking.ownerId === owner.id && booking.turfId === turf.id);
  const requests = state.requests.filter((request) => request.ownerId === owner.id && request.turfId === turf.id);
  const players = state.players.filter((player) => requests.some((request) => request.playerId === player.id && request.status === 'accepted'));
  const teams = (state.teams || []).filter((team) => team.ownerId === owner.id && team.turfId === turf.id);
  const cards = [['Players', players.length, 'Players'], ['Pending requests', requests.filter((item) => item.status === 'pending').length, 'Player Requests'], ['Teams', teams.length, 'Teams'], ['Pending bookings', bookings.filter((item) => item.bookingStatus === 'pending').length, 'Bookings'], ['Confirmed bookings', bookings.filter((item) => item.bookingStatus === 'Confirmed').length, 'Bookings'], ["Today's slots", bookings.filter((item) => item.bookingStatus === 'Confirmed' && item.bookingDate === new Date().toISOString().slice(0, 10)).length, 'Availability']];
  return <><section className="owner-overview-hero"><img src={turf.image} alt={turf.name} /><div><span className="section-kicker">YOUR TURF</span><h2>{turf.name}</h2><p>{turf.location || turf.area}, Vadodara · {(turf.sports || []).join(' · ')}</p><strong>{turf.openingHours || 'Opening hours not set'}</strong></div></section><section className="owner-stat-grid">{cards.map(([label, value, target]) => <button type="button" className="owner-stat-card" key={label} onClick={() => onNavigate(target)}><span>{label}</span><strong>{value}</strong><small>Open {target}</small></button>)}</section><section className="owner-overview-grid"><article className="dashboard-block owner-info-panel"><SectionHeading kicker="TURF SUMMARY" title="READY FOR THE NEXT GAME." /><div className="detail-lines"><DetailLine label="Location" value={`${turf.area}, Vadodara`} /><DetailLine label="Games" value={(turf.sports || []).join(' · ')} /><DetailLine label="Facilities" value={(turf.facilities || []).join(' · ') || 'Not listed'} /><DetailLine label="Status" value={turf.registrationStatus || 'Registered'} /></div></article><article className="dashboard-block owner-info-panel"><SectionHeading kicker="RECENT ACTIVITY" title="WHAT NEEDS YOUR ATTENTION." /><ActivityLine label="Booking requests" value={bookings.filter((item) => item.bookingStatus === 'pending').length} onClick={() => onNavigate('Bookings')} /><ActivityLine label="Player requests" value={requests.filter((item) => item.status === 'pending').length} onClick={() => onNavigate('Player Requests')} /><ActivityLine label="Unavailable slots" value={(state.availability || []).filter((item) => item.ownerId === owner.id && item.turfId === turf.id).length} onClick={() => onNavigate('Availability')} /></article></section></>;
}

function MyTurf({ state, owner, turf, refresh }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: turf.name, description: turf.turfDescription || turf.description || '', location: turf.location || '', contact: turf.turfContactNumber || owner.mobile || '', instructions: turf.bookingInstructions || '', rules: turf.rules || '' });
  const save = () => { const next = getDemoState(); const target = next.registeredTurfs.find((item) => item.id === turf.id); if (target) { Object.assign(target, { turfName: form.name.trim(), turfDescription: form.description.trim(), location: form.location.trim(), turfContactNumber: form.contact.trim(), bookingInstructions: form.instructions.trim(), rules: form.rules.trim(), area: target.turfAddress?.area || form.location.trim() }); saveDemoState(next); refresh(); setEditing(false); } };
  return <section className="owner-detail-layout"><article className="owner-profile-card"><img src={turf.image} alt={turf.name} /><span className="section-kicker">REGISTERED TURF</span><h2>{turf.name}</h2><p>{turf.location || turf.area}, Vadodara</p><button type="button" className="btn btn-primary" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancel Editing' : 'Edit Turf'}</button></article><article className="owner-details-panel"><SectionHeading kicker="TURF PROFILE" title="EVERY DETAIL IN ONE PLACE." />{editing ? <div className="owner-edit-grid"><OwnerField label="Turf Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} /><OwnerField label="Location" value={form.location} onChange={(value) => setForm({ ...form, location: value })} /><OwnerField label="Contact" value={form.contact} onChange={(value) => setForm({ ...form, contact: value })} /><OwnerField label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} /><OwnerField label="Booking Instructions" value={form.instructions} onChange={(value) => setForm({ ...form, instructions: value })} /><OwnerField label="Rules" value={form.rules} onChange={(value) => setForm({ ...form, rules: value })} /><button type="button" className="btn btn-primary" onClick={save}>Save Turf Changes</button></div> : <><DetailGroup title="Owner Information"><DetailLine label="Name" value={owner.name} /><DetailLine label="Mobile" value={owner.mobile || turf.ownerMobile} /><DetailLine label="Email" value={owner.email || turf.ownerEmail} /><DetailLine label="Address" value={turf.ownerAddress || 'Not provided'} /></DetailGroup><DetailGroup title="Turf Information"><DetailLine label="Description" value={turf.turfDescription || turf.description || 'Not provided'} /><DetailLine label="Type / size" value={`${turf.turfType || 'Turf'} · ${turf.turfSize || 'Not provided'}`} /><DetailLine label="Sports" value={(turf.sports || []).join(' · ')} /><DetailLine label="Facilities" value={(turf.facilities || []).join(' · ') || 'Not provided'} /><DetailLine label="Opening hours" value={turf.openingHours || 'Not provided'} /><DetailLine label="Turf address" value={formatAddress(turf.turfAddress)} /><DetailLine label="Contact" value={turf.turfContactNumber || 'Not provided'} /><DetailLine label="Instructions / rules" value={`${turf.bookingInstructions || 'None'} / ${turf.rules || 'None'}`} /></DetailGroup></>}</article></section>;
}

function Bookings({ state, owner, turf, refresh }) {
  const bookings = getBookings().filter((item) => item.ownerId === owner.id && item.turfId === turf.id);
  const respond = (bookingId, status) => { const next = getBookings(); const booking = next.find((item) => item.bookingId === bookingId && item.ownerId === owner.id && item.turfId === turf.id); if (!booking) return; booking.bookingStatus = status; booking.updatedAt = new Date().toISOString(); saveBookings(next); refresh(); };
  return <section className="dashboard-block"><SectionHeading kicker="BOOKING REQUESTS" title="REVIEW EVERY RESERVATION." />{bookings.length ? <div className="owner-record-list">{bookings.map((booking) => <article className="owner-record" key={booking.bookingId}><div><span className="section-kicker">{booking.bookingId}</span><h3>{booking.userName}</h3><p>{booking.mobile} · {booking.email}</p><p>{booking.game} · {formatDate(booking.bookingDate)} · {booking.fromTime} to {booking.toTime}</p><small>{booking.paymentMethod} · {booking.paymentStatus}</small></div><div className="owner-record-actions"><StatusPill status={booking.bookingStatus} />{booking.bookingStatus === 'pending' && <><button type="button" className="btn btn-primary" onClick={() => respond(booking.bookingId, 'Confirmed')}>Accept</button><button type="button" className="btn btn-secondary" onClick={() => respond(booking.bookingId, 'Rejected')}>Reject</button></>}</div></article>)}</div> : <EmptyState title="No booking requests yet" text="Bookings for this turf will appear here." />}</section>;
}

function PlayerRequests({ state, owner, turf, refresh }) {
  const requests = state.requests.filter((item) => item.ownerId === owner.id && item.turfId === turf.id);
  const respond = (id, status) => { const next = getDemoState(); const request = next.requests.find((item) => item.id === id && item.ownerId === owner.id && item.turfId === turf.id); if (!request) return; request.status = status; request.respondedAt = new Date().toISOString(); recordActivity({ state: next, type: status === 'accepted' ? ACTIVITY_TYPES.REGISTRATION_APPROVED : ACTIVITY_TYPES.REGISTRATION_REJECTED, actorRole: 'turf-owner', actorName: owner.name, message: `Registration ${status} for ${request.sportId || 'sport'}`, targetPath: '/admin/registrations', meta: { requestId: request.id } }); saveDemoState(next); refresh(); };
  return <section className="dashboard-block"><SectionHeading kicker="PLAYER REQUESTS" title="WHO WANTS TO PLAY HERE." />{requests.length ? <div className="owner-record-list">{requests.map((request) => { const player = state.players.find((item) => item.id === request.playerId); return <article className="owner-record" key={request.id}><div className="owner-player-record"><span className="large-avatar">{fullName(player).slice(0, 2).toUpperCase()}</span><div><h3>{fullName(player)}</h3><p>{player?.age} years · {request.sportId} · {player?.mobile}</p><p>{player?.email} · {player?.house}, {player?.street}, {player?.city}</p><small>Requested {formatDate(request.createdAt?.slice(0, 10))}</small></div></div><div className="owner-record-actions"><StatusPill status={request.status} />{request.status === 'pending' && <><button type="button" className="btn btn-primary" onClick={() => respond(request.id, 'accepted')}>Accept</button><button type="button" className="btn btn-secondary" onClick={() => respond(request.id, 'rejected')}>Reject</button></>}</div></article>; })}</div> : <EmptyState title="No player requests yet" text="Requests for this turf stay private to this owner." />}</section>;
}

function Players({ state, owner, turf }) {
  const acceptedIds = state.requests.filter((item) => item.ownerId === owner.id && item.turfId === turf.id && item.status === 'accepted').map((item) => item.playerId);
  const players = state.players.filter((player) => acceptedIds.includes(player.id));
  return <section className="dashboard-block"><SectionHeading kicker="YOUR PLAYERS" title="PLAYERS CONNECTED TO THIS TURF." />{players.length ? <div className="owner-record-list">{players.map((player) => <article className="owner-record" key={player.id}><div className="owner-player-record"><span className="large-avatar">{fullName(player).slice(0, 2).toUpperCase()}</span><div><h3>{fullName(player)}</h3><p>{player.sportId} · {player.mobile} · {player.email}</p></div></div><StatusPill status="accepted" /></article>)}</div> : <EmptyState title="No accepted players yet" text="Accepted player requests will appear here." />}</section>;
}

function Teams({ state, owner, turf, refresh }) {
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', sport: '', description: '', logo: '', members: [], captainBankDetails: { bankName: '', accountNumber: '', ifscCode: '' } });
  const [memberEditor, setMemberEditor] = useState(null);
  const [memberForm, setMemberForm] = useState({ name: '', mobile: '', age: '', email: '', role: 'Player' });
  const [formError, setFormError] = useState('');
  const [memberError, setMemberError] = useState('');
  const [toast, setToast] = useState(null);
  const teams = (state.teams || []).filter((team) => team.ownerId === owner.id && team.turfId === turf.id);
  const getTeamMembers = (team) => {
    if (Array.isArray(team.members)) return team.members;
    return (team.memberIds || []).map((id, index) => {
      const player = state.players.find((item) => item.id === id);
      return player ? {
        id: player.id,
        playerId: player.id,
        name: fullName(player),
        mobile: player.mobile || '',
        age: player.age || '',
        email: player.email || '',
        role: team.captainId === player.id || (!team.captainId && index === 0) ? 'Captain' : 'Player',
      } : null;
    }).filter(Boolean);
  };
  const blankTeam = () => ({
    name: '',
    sport: '',
    description: '',
    logo: '',
    members: [],
    captainBankDetails: { bankName: '', accountNumber: '', ifscCode: '' },
  });
  const openCreate = () => {
    setEditing(null);
    setForm(blankTeam());
    setFormError('');
    setFormOpen(true);
  };
  const edit = (team) => {
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
    const result = saveOwnerTeam({ ownerId: owner.id, turfId: turf.id, teamId: editing, values: form });
    if (!result.ok) {
      setFormError(result.error);
      setToast({ tone: 'danger', title: 'Team not saved', text: result.error });
      return;
    }
    setFormOpen(false);
    setEditing(null);
    setFormError('');
    setToast({ tone: 'success', title: editing ? 'Team updated successfully.' : 'Team created successfully.' });
    refresh();
  };
  const remove = (team) => {
    if (!window.confirm(`Delete ${team.name}? Players will remain in their own profiles.`)) return;
    const result = deleteOwnerTeam({ ownerId: owner.id, turfId: turf.id, teamId: team.id });
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
    const duplicateCaptain = member.role === 'Captain' && form.members.some((item) => item.role === 'Captain' && item.id !== memberEditor);
    if (duplicateCaptain) {
      setMemberError('This team already has a captain. Update the existing captain before assigning another.');
      return;
    }
    const duplicatePerson = form.members.some((item) => (
      item.id !== memberEditor && (item.email.toLowerCase() === member.email || item.mobile === member.mobile)
    ));
    if (duplicatePerson) {
      setMemberError('A player with this email or mobile number is already on the team.');
      return;
    }
    if (memberEditor) {
      const previousMember = form.members.find((item) => item.id === memberEditor);
      setForm((current) => ({
        ...current,
        members: current.members.map((item) => item.id === memberEditor ? { ...item, ...member } : item),
        captainBankDetails: previousMember?.role === 'Captain' && member.role !== 'Captain'
          ? { bankName: '', accountNumber: '', ifscCode: '' }
          : current.captainBankDetails,
      }));
      setToast({ tone: 'success', title: 'Player updated.' });
    } else {
      setForm((current) => ({ ...current, members: [...current.members, { ...member, id: createId('team-player') }] }));
      setToast({ tone: 'success', title: 'Player added.' });
    }
    setMemberEditor(null);
  };
  const removeMember = (member) => {
    if (!window.confirm(`Are you sure you want to remove ${member.name} from the team?`)) return;
    setForm((current) => ({
      ...current,
      members: current.members.filter((item) => item.id !== member.id),
      captainBankDetails: member.role === 'Captain'
        ? { bankName: '', accountNumber: '', ifscCode: '' }
        : current.captainBankDetails,
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

  return <section className="dashboard-block">
    <div className="section-action-row"><SectionHeading kicker="TEAM MANAGEMENT" title="BUILD TEAMS FOR YOUR GAMES." /><button type="button" className="btn btn-primary" onClick={openCreate}>Create Team</button></div>
    {formOpen && <article className="owner-form-panel owner-team-form">
      <div className="owner-team-form-heading"><SectionHeading kicker={editing ? 'UPDATE YOUR TEAM' : 'NEW TEAM'} title={editing ? 'EDIT TEAM DETAILS.' : 'CREATE YOUR TEAM.'} /><button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button></div>
      <div className="owner-edit-grid">
        <label className="form-field"><span>Team Name<b>*</b></span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Enter team name" aria-invalid={Boolean(formError && !form.name.trim())} /></label>
        <label className="form-field"><span>Game / Sport<b>*</b></span><select value={form.sport} onChange={(event) => setForm((current) => ({ ...current, sport: event.target.value }))}><option value="">Select Game</option>{configuredSports.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
        <label className="form-field"><span>Description</span><input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Add a short description" /></label>
        <div className="form-field"><span>Team Logo</span><div className="owner-team-logo-picker">{form.logo ? <img src={form.logo} alt="Team logo preview" /> : <span className="owner-team-logo-placeholder">TEAM</span>}<label className="btn btn-secondary upload-button">{form.logo ? 'Change Logo' : 'Upload Logo'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadLogo(file); event.target.value = ''; }} /></label>{form.logo && <button type="button" className="text-button danger" onClick={() => setForm((current) => ({ ...current, logo: '' }))}>Remove logo</button>}</div></div>
      </div>
      {formError && <p className="inline-error" role="alert">{formError}</p>}
      <div className="owner-team-members-heading"><div><SectionHeading kicker="TEAM ROSTER" title="TEAM PLAYERS." /><p>Add player details and assign no more than one captain.</p></div><button type="button" className="btn btn-secondary" onClick={() => openMemberEditor()}>Add Team Player</button></div>
      {form.members.length ? <div className="owner-team-member-list">{form.members.map((member) => <article className="owner-team-member" key={member.id}><div><strong>{member.name}</strong><span>{member.mobile} · Age {member.age} · {member.email}</span></div><span className={`status-pill ${member.role === 'Captain' ? 'status-approved' : ''}`}>{member.role.toUpperCase()}</span><div className="owner-record-actions"><button type="button" className="btn btn-secondary" onClick={() => openMemberEditor(member)}>Edit</button><button type="button" className="btn btn-secondary" onClick={() => removeMember(member)}>Remove</button></div></article>)}</div> : <EmptyState title="No players added yet" text="Use Add Team Player to build the roster." />}
      <div className="owner-captain-details">
        <SectionHeading kicker="TEAM LEAD" title="CAPTAIN DETAILS." />
        <div className="owner-captain-fields">
          {(() => {
            const captain = form.members.find((member) => member.role === 'Captain');
            return captain ? <>
              <DetailLine label="Captain Name" value={captain.name} />
              <DetailLine label="Captain Age" value={captain.age} />
              <DetailLine label="Captain Mobile Number" value={captain.mobile} />
              <DetailLine label="Captain Email ID" value={captain.email} />
            </> : <p className="form-section-note">No captain assigned yet. Add a team player and set their role to Captain.</p>;
          })()}
          <OwnerField
            label="Bank Name"
            value={form.captainBankDetails.bankName}
            onChange={(value) => setForm((current) => ({ ...current, captainBankDetails: { ...current.captainBankDetails, bankName: value } }))}
            placeholder="Enter bank name"
          />
          <OwnerField
            label="Account Number"
            type="text"
            value={form.captainBankDetails.accountNumber}
            onChange={(value) => setForm((current) => ({ ...current, captainBankDetails: { ...current.captainBankDetails, accountNumber: value.replace(/\D/g, '').slice(0, 18) } }))}
            placeholder="Enter account number (9–18 digits)"
            inputMode="numeric"
            maxLength={18}
          />
          <OwnerField
            label="IFSC Code"
            value={form.captainBankDetails.ifscCode}
            onChange={(value) => setForm((current) => ({ ...current, captainBankDetails: { ...current.captainBankDetails, ifscCode: value.replace(/[^a-z\d]/gi, '').toUpperCase().slice(0, 11) } }))}
            placeholder="e.g. SBIN0001234"
            maxLength={11}
          />
        </div>
      </div>
      <button type="button" className="btn btn-primary" onClick={save}>{editing ? 'Update Team' : 'Submit Team'}</button>
    </article>}
    {teams.length ? <div className="team-grid">{teams.map((team) => {
      const members = getTeamMembers(team);
      const captain = members.find((member) => member.role === 'Captain') || team.captainDetails;
      const hasActiveRegistration = (state.registrations || []).some((registration) => registration.teamId === team.id && ['pending', 'approved'].includes(registration.status));
      return <article className="team-card owner-team-card" key={team.id}><div className="owner-team-card-heading">{team.logo ? <img className="owner-team-logo" src={team.logo} alt={`${team.name} logo`} /> : <span className="owner-team-logo-placeholder">TEAM</span>}<div><span className="sport-chip">{team.sport}</span><h3>{team.name}</h3></div></div><p>{team.description || 'No description added.'}</p><small>{members.length} player(s) · Captain: {captain?.name || 'Not assigned'}</small><div className="owner-record-actions"><button type="button" className="btn btn-secondary" onClick={() => edit(team)}>View / Edit</button><button type="button" className="btn btn-secondary" onClick={() => remove(team)} disabled={hasActiveRegistration}>{hasActiveRegistration ? 'Active registration' : 'Delete'}</button></div></article>;
    })}</div> : !formOpen && <EmptyState title="No teams yet" text="Create a team for your turf and games." />}
    {memberEditor !== null && <div className="review-modal-backdrop"><section className="review-modal owner-team-player-modal" role="dialog" aria-modal="true" aria-labelledby="owner-team-player-title"><button type="button" className="modal-close" onClick={() => setMemberEditor(null)} aria-label="Close player form">×</button><span className="section-kicker">TEAM ROSTER</span><h2 id="owner-team-player-title">{memberEditor ? 'EDIT TEAM PLAYER' : 'ADD TEAM PLAYER'}</h2><div className="owner-team-player-fields"><OwnerField label="Player Name" value={memberForm.name} onChange={(value) => setMemberForm((current) => ({ ...current, name: value }))} /><label className="form-field"><span>Mobile Number</span><input inputMode="numeric" maxLength={10} value={memberForm.mobile} onChange={(event) => setMemberForm((current) => ({ ...current, mobile: event.target.value.replace(/\D/g, '').slice(0, 10) }))} /></label><label className="form-field"><span>Age</span><input type="number" min="1" max="120" value={memberForm.age} onChange={(event) => setMemberForm((current) => ({ ...current, age: event.target.value }))} /></label><OwnerField label="Email ID" type="email" value={memberForm.email} onChange={(value) => setMemberForm((current) => ({ ...current, email: value }))} /><label className="form-field"><span>Player Type / Role</span><select value={memberForm.role} onChange={(event) => setMemberForm((current) => ({ ...current, role: event.target.value }))}><option>Player</option><option>Captain</option></select></label></div>{memberError && <p className="inline-error" role="alert">{memberError}</p>}<div className="owner-team-player-actions"><button type="button" className="btn btn-secondary" onClick={() => setMemberEditor(null)}>Cancel</button><button type="button" className="btn btn-primary" onClick={saveMember}>{memberEditor ? 'Save Player' : 'Add Player'}</button></div></section></div>}
    <Toast toast={toast} onDismiss={() => setToast(null)} />
  </section>;
}

function OwnerTournaments({ state, owner, turf, refresh, onNavigate }) {
  const [registering, setRegistering] = useState(null);
  const [step, setStep] = useState('team');
  const [teamId, setTeamId] = useState('');
  const [slotNumber, setSlotNumber] = useState('');
  const [availability, setAvailability] = useState({ slots: [], availableCount: 0 });
  const [toast, setToast] = useState(null);
  const teams = (state.teams || []).filter((team) => team.ownerId === owner.id && team.turfId === turf.id);
  const currentDate = new Date();
  const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const tournaments = getAllTournaments()
    .filter((item) => {
      const start = item.date || item.startDate;
      if (!start || start < today) return false;
      return !['draft', 'unpublished', 'cancelled', 'canceled', 'completed', 'live'].includes(String(item.status || '').toLowerCase())
        && item.published !== false;
    })
    .sort((first, second) => new Date(`${first.date || first.startDate}T00:00:00`) - new Date(`${second.date || second.startDate}T00:00:00`));
  const selectedTeam = teams.find((team) => team.id === teamId);
  const fee = registering ? getConfiguredTournamentFeeAmount(registering.entryFee) || 0 : 0;

  const openRegistration = (tournament) => {
    if (getTournamentRegistrationType(tournament) !== 'Team') {
      setToast({ tone: 'warn', title: 'Team registration unavailable', text: 'This tournament accepts individual players, not turf teams.' });
      return;
    }
    if (getConfiguredTournamentFeeAmount(tournament.entryFee) === null) {
      setToast({ tone: 'warn', title: 'Registration fee unavailable', text: 'This tournament needs a valid registration fee before teams can register.' });
      return;
    }
    if (!isTournamentRegistrationOpen(tournament)) {
      setToast({ tone: 'warn', title: 'Registration closed', text: 'Tournament registration is closed.' });
      return;
    }
    const slots = getTournamentSlotAvailability(tournament.id);
    if (!slots.ok) {
      setToast({ tone: 'danger', title: 'Unable to check slots', text: slots.error });
      return;
    }
    if (slots.availableCount === 0) {
      setToast({ tone: 'warn', title: 'Tournament full', text: 'Tournament registration is full.' });
      return;
    }
    setRegistering(tournament);
    setAvailability(slots);
    setSlotNumber(String(slots.slots.find((slot) => slot.available)?.slotNumber || ''));
    setTeamId('');
    setStep('team');
  };
  const submitRegistration = async () => {
    if (!registering || !selectedTeam) return;
    if (!isTournamentRegistrationOpen(registering)) {
      setToast({ tone: 'warn', title: 'Registration closed', text: 'Tournament registration is closed.' });
      return;
    }
    const latest = getTournamentSlotAvailability(registering.id);
    setAvailability(latest);
    if (!latest.ok || latest.availableCount === 0) {
      setToast({ tone: 'warn', title: 'Tournament full', text: latest.error || 'Tournament registration is full.' });
      return;
    }
    const result = await createTournamentRegistration({
      tournamentId: registering.id,
      ownerId: owner.id,
      turfId: turf.id,
      teamId: selectedTeam.id,
      slotNumber: Number(slotNumber),
      participantCount: selectedTeam.members?.length || selectedTeam.memberIds?.length || 1,
    });
    if (!result.ok) {
      setToast({ tone: 'danger', title: 'Registration not submitted', text: result.error });
      if (/full|no longer available/i.test(result.error)) {
        const refreshedAvailability = getTournamentSlotAvailability(registering.id);
        setAvailability(refreshedAvailability);
        setSlotNumber(String(refreshedAvailability.slots.find((slot) => slot.available)?.slotNumber || ''));
      }
      return;
    }
    setRegistering(null);
    setToast({ tone: 'success', title: 'Team registration submitted', text: 'Payment is pending verification in the demo flow.' });
    refresh();
  };

  return <section className="dashboard-block owner-tournaments">
    <SectionHeading kicker="UPCOMING TOURNAMENTS" title="REGISTER YOUR TEAM." />
    {tournaments.length ? <div className="owner-tournament-grid">{tournaments.map((tournament) => {
      const eligibleTeams = teams.filter((team) => String(team.sport || '').toLowerCase() === String(tournament.sport || '').toLowerCase());
      const registeredIds = new Set((state.registrations || []).filter((registration) => registration.tournamentId === tournament.id && ['pending', 'approved'].includes(registration.status)).map((registration) => registration.teamId));
      const available = getTournamentSlotAvailability(tournament.id);
      const isTeamTournament = getTournamentRegistrationType(tournament) === 'Team';
      const feeConfigured = getConfiguredTournamentFeeAmount(tournament.entryFee) !== null;
      const open = isTeamTournament && feeConfigured && isTournamentRegistrationOpen(tournament) && available.ok && available.availableCount > 0;
      const endDate = tournament.registrationEnd || tournament.date || tournament.startDate;
      const eventDate = tournament.date || tournament.startDate;
      const tournamentFee = getConfiguredTournamentFeeAmount(tournament.entryFee);
      const alreadyRegisteredTeams = eligibleTeams.filter((team) => registeredIds.has(team.id));
      return <article className="owner-tournament-card" key={tournament.id}>
        <div className="owner-tournament-art">
          <span aria-hidden="true">TOURNAMENT</span>
          {tournament.image && <img className="owner-tournament-image" src={tournament.image} alt={`${tournament.name} tournament`} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
        </div>
        <div className="owner-tournament-card-content">
          <span className="sport-chip">{tournament.sport}</span>
          <h3>{tournament.name}</h3>
          <div className="owner-tournament-facts">
            <span><strong>Date</strong>{formatDate(eventDate)}</span>
            <span><strong>Venue</strong>{tournament.venueName || 'Venue to be announced'}</span>
            <span><strong>Team fee</strong>{tournamentFee === null ? 'Not configured' : `₹${formatTournamentFeeAmount(tournamentFee)} per team`}</span>
            <span><strong>Deadline</strong>{formatDate(endDate)}</span>
            <span><strong>Available slots</strong>{available.ok ? available.availableCount : 'Unavailable'}</span>
          </div>
          {!open && <span className="status-pill status-cancelled">{!isTeamTournament ? 'Individual Registration' : !feeConfigured ? 'Fee Not Configured' : available.ok && available.availableCount === 0 ? 'Full' : 'Registration Closed'}</span>}
          {eligibleTeams.length ? <>
            <small>{eligibleTeams.length} game-matched team(s)</small>
            {alreadyRegisteredTeams.length > 0 && <small>Already registered: {alreadyRegisteredTeams.map((team) => team.name).join(', ')}</small>}
            <div className="owner-tournament-action"><button type="button" className="btn btn-primary" onClick={() => openRegistration(tournament)} disabled={!open || alreadyRegisteredTeams.length === eligibleTeams.length}>{alreadyRegisteredTeams.length === eligibleTeams.length ? 'Already Registered' : !open ? 'Registration Unavailable' : 'Register Team'}</button></div>
          </> : isTeamTournament
            ? <div className="owner-tournament-action"><button type="button" className="btn btn-primary" onClick={() => onNavigate('Teams')}>Create Matching Team</button></div>
            : <p className="owner-no-eligible-team">This tournament accepts individual player registrations.</p>}
        </div>
      </article>;
    })}</div> : <EmptyState title="No upcoming tournaments" text="Published tournaments will appear here when they are available." />}
    {registering && <div className="review-modal-backdrop"><section className="review-modal owner-registration-modal" role="dialog" aria-modal="true" aria-labelledby="owner-registration-title"><button type="button" className="modal-close" onClick={() => setRegistering(null)} aria-label="Close registration">×</button><span className="section-kicker">{step === 'team' ? 'STEP 1 OF 2 · SELECT YOUR TEAM' : 'STEP 2 OF 2 · PAYMENT'}</span><h2 id="owner-registration-title">{registering.name}</h2>{step === 'team' ? <><div className="owner-registration-summary"><DetailLine label="Tournament game" value={registering.sport} /><DetailLine label="Registration fee" value={`₹${formatTournamentFeeAmount(fee)} per team`} /><DetailLine label="Registration" value={`${availability.availableCount} slot(s) available`} /></div><label className="form-field owner-team-select"><span>Select Team</span><select value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Select eligible team</option>{teams.filter((team) => String(team.sport || '').toLowerCase() === String(registering.sport || '').toLowerCase()).map((team) => <option key={team.id} value={team.id} disabled={(state.registrations || []).some((registration) => registration.teamId === team.id && registration.tournamentId === registering.id && ['pending', 'approved'].includes(registration.status))}>{team.name}</option>)}</select></label>{selectedTeam && <article className="owner-team-preview">{selectedTeam.logo ? <img src={selectedTeam.logo} alt={`${selectedTeam.name} logo`} /> : <span className="owner-team-logo-placeholder">TEAM</span>}<div><strong>{selectedTeam.name}</strong><span>{selectedTeam.sport} · {selectedTeam.members?.length || selectedTeam.memberIds?.length || 0} player(s)</span><span>Captain: {selectedTeam.captainDetails?.name || selectedTeam.captain || 'Not assigned'}</span></div></article>}<label className="form-field owner-team-select"><span>Available Slot</span><select value={slotNumber} onChange={(event) => setSlotNumber(event.target.value)}>{availability.slots.filter((slot) => slot.available).map((slot) => <option key={slot.slotNumber} value={slot.slotNumber}>{slot.label}</option>)}</select></label><div className="owner-registration-actions"><button type="button" className="btn btn-secondary" onClick={() => setRegistering(null)}>Cancel</button><button type="button" className="btn btn-primary" disabled={!selectedTeam || !slotNumber} onClick={() => setStep('payment')}>Continue to Payment</button></div></> : <><div className="owner-payment-preview"><div className="qr-code player-payment-qr" aria-label="Demo payment QR code" style={{ backgroundImage: `url(${scannerImage})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} /><div><strong>{registering.name}</strong><p>{selectedTeam?.name} · {selectedTeam?.sport}</p><p>Turf Owner: {owner.name}</p><strong>Registration Fee: ₹{formatTournamentFeeAmount(fee)} per team</strong><p>Demo QR only. The app does not connect to a payment provider; registrations are saved as pending until payment is verified.</p></div></div><div className="owner-registration-actions"><button type="button" className="btn btn-secondary" onClick={() => setStep('team')}>Back</button><button type="button" className="btn btn-primary" onClick={submitRegistration}>Submit Registration</button></div></>}</section></div>}
    <Toast toast={toast} onDismiss={() => setToast(null)} />
  </section>;
}

function Availability({ state, owner, turf, refresh }) {
  const [form, setForm] = useState({ sport: turf.sports[0] || 'Cricket', date: '', fromTime: '', toTime: '', reason: '' });
  const slots = (state.availability || []).filter((item) => item.ownerId === owner.id && item.turfId === turf.id);
  const save = () => { if (!form.date || !form.fromTime || !form.toTime) return; const next = getDemoState(); next.availability = next.availability || []; next.availability.push({ id: createId('availability'), ownerId: owner.id, turfId: turf.id, ...form, createdAt: new Date().toISOString() }); saveDemoState(next); setForm({ ...form, date: '', fromTime: '', toTime: '', reason: '' }); refresh(); };
  const remove = (id) => { if (!window.confirm('Delete this unavailable slot?')) return; const next = getDemoState(); next.availability = (next.availability || []).filter((item) => item.id !== id); saveDemoState(next); refresh(); };
  return <section className="dashboard-block"><SectionHeading kicker="AVAILABILITY" title="PROTECT THE TIME SLOTS YOU CONTROL." /><article className="owner-form-panel"><div className="owner-edit-grid"><label className="form-field"><span>Game / Sport</span><select value={form.sport} onChange={(event) => setForm({ ...form, sport: event.target.value })}>{turf.sports.map((sport) => <option key={sport}>{sport}</option>)}</select></label><OwnerField label="Date" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} /><OwnerField label="From Time" type="time" value={form.fromTime} onChange={(value) => setForm({ ...form, fromTime: value })} /><OwnerField label="To Time" type="time" value={form.toTime} onChange={(value) => setForm({ ...form, toTime: value })} /><OwnerField label="Reason" value={form.reason} onChange={(value) => setForm({ ...form, reason: value })} /></div><button type="button" className="btn btn-primary" onClick={save}>Add Unavailable Slot</button></article>{slots.length ? <div className="owner-record-list">{slots.map((slot) => <article className="owner-record" key={slot.id}><div><h3>{slot.sport} · {formatDate(slot.date)}</h3><p>{slot.fromTime} to {slot.toTime}</p><small>{slot.reason || 'Owner blocked slot'}</small></div><button type="button" className="btn btn-secondary" onClick={() => remove(slot.id)}>Delete</button></article>)}</div> : <EmptyState title="No manual unavailable slots" text="Add sport-specific unavailable times above." />}</section>;
}

function OwnerAccessMessage({ logout }) { return <div className="player-app"><GlobalHeader /><main className="registration-main container"><div className="registration-heading"><span className="section-kicker">ACCOUNT ACCESS</span><h1>OWNER DASHBOARD UNAVAILABLE.</h1><p>Log in with a turf owner account to manage a venue.</p><button type="button" className="btn btn-primary" onClick={() => { logout(); }}>Go to Login</button></div></main></div>; }
function SectionHeading({ kicker, title }) { return <div className="dashboard-section-heading"><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>; }
function DetailGroup({ title, children }) { return <section className="detail-group"><h3>{title}</h3>{children}</section>; }
function DetailLine({ label, value }) { return <div className="detail-line"><span>{label}</span><strong>{value || 'Not provided'}</strong></div>; }
function ActivityLine({ label, value, onClick }) { return <button type="button" className="activity-line" onClick={onClick}><span>{label}</span><strong>{value}</strong></button>; }
function OwnerField({ label, type = 'text', value, onChange, placeholder, inputMode, maxLength }) { return <label className="form-field"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} maxLength={maxLength} /></label>; }
function StatusPill({ status }) { return <span className={`status-pill status-${String(status).replaceAll(' ', '-')}`}>{status}</span>; }
function EmptyState({ title, text }) { return <div className="dashboard-empty"><strong>{title}</strong><span>{text}</span></div>; }
function formatAddress(address = {}) { return [address.house, address.street, address.area, address.city, address.state, address.pincode].filter(Boolean).join(', ') || 'Not provided'; }

export default OwnerDashboard;
