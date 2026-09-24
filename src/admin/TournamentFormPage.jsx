import { useEffect, useMemo, useState } from 'react';
import AdminIcon from './AdminIcon';
import { SearchInput, Toast, compressImageFile } from './AdminUI';
import {
  REGISTRATION_TYPES,
  SPORT_FORMATS,
  TOURNAMENT_SPORTS,
  TOURNAMENT_STATUS,
  createTournament,
  updateTournament,
  validateTournamentDates,
} from '../data/adminTournaments';
import { getAllTurfs, getDemoState } from '../data/demoStore';
import { getAdminSettings } from '../data/adminSettings';

// TournamentFormPage — /admin/tournaments/create (also ?edit=<id>)
//
// A multi-section tournament form covering basic info, venue, dates,
// registration, prizes, eligibility, rules, images and contact. On save it
// writes to state.tournaments (draft or published), which the public tournament
// page reads through the shared merged list.

const navigate = (href) => { window.location.href = href; };

const blankForm = {
  name: '',
  sport: 'Cricket',
  format: '',
  matchType: '',
  description: '',
  venueId: '',
  venueName: '',
  area: '',
  registrationStart: '',
  registrationEnd: '',
  startDate: '',
  endDate: '',
  registrationType: 'Team',
  maxTeams: '',
  minTeams: '',
  maxPlayers: '',
  minPlayers: '',
  entryFee: '',
  prizePool: '',
  firstPrize: '',
  secondPrize: '',
  thirdPrize: '',
  winnerTrophy: false,
  medals: false,
  certificate: false,
  minAge: '',
  maxAge: '',
  gender: 'Open',
  skillLevel: 'Open',
  rules: '',
  eligibilityRules: '',
  cancellationPolicy: '',
  coverImage: '',
  posterImage: '',
  organizerName: '',
  contactNumber: '',
  contactEmail: '',
  whatsappNumber: '',
  status: TOURNAMENT_STATUS.DRAFT,
};

// Map a stored tournament record back into the form shape (for editing).
const recordToForm = (record) => ({
  ...blankForm,
  ...record,
  format: record.format || record.matchType || '',
  matchType: record.matchType || record.format || '',
  venueId: record.venueId || '',
  venueName: record.venueName || '',
  area: record.area || '',
  startDate: record.startDate || record.date || '',
  coverImage: record.coverImage || record.image || '',
  posterImage: record.posterImage || '',
});

function TournamentFormPage() {
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('edit');
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});
  const [section, setSection] = useState('basic');
  const [venueQuery, setVenueQuery] = useState('');
  const [form, setForm] = useState(null);
  const [savingMode, setSavingMode] = useState('');

  const turfs = useMemo(() => getAllTurfs(), []);
  const isEditing = Boolean(editId);

  useEffect(() => {
    if (editId) {
      const state = getDemoState();
      const record = (state.tournaments || []).find((item) => item.id === editId);
      if (record) setForm(recordToForm(record));
      else setForm({ ...blankForm });
    } else {
      const defaults = getAdminSettings().tournament;
      setForm({
        ...blankForm,
        registrationType: defaults.registrationType || blankForm.registrationType,
        format: defaults.defaultFormat || blankForm.format,
        matchType: defaults.defaultFormat || blankForm.matchType,
        maxTeams: defaults.defaultTeamCapacity || blankForm.maxTeams,
        status: defaults.defaultRegistrationOpen ? TOURNAMENT_STATUS.PUBLISHED : blankForm.status,
      });
    }
  }, [editId]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const formats = SPORT_FORMATS[form?.sport] || [];

  const filteredVenues = useMemo(() => {
    const q = venueQuery.trim().toLowerCase();
    if (!q) return turfs.slice(0, 6);
    return turfs.filter((turf) => [turf.name, turf.area, turf.address].filter(Boolean).some((value) => String(value).toLowerCase().includes(q))).slice(0, 8);
  }, [turfs, venueQuery]);

  const selectedVenue = turfs.find((turf) => turf.id === form?.venueId) || null;

  if (!form) return null;

  const validate = () => {
    const next = validateTournamentDates(form);
    if (!form.name.trim()) next.name = 'Tournament name is required.';
    if (!form.sport) next.sport = 'Sport is required.';
    if (!form.venueId) next.venueId = 'Please select a venue.';
    if (form.minAge && form.maxAge && Number(form.minAge) > Number(form.maxAge)) next.maxAge = 'Maximum age must be greater than minimum age.';
    if (form.minTeams && form.maxTeams && Number(form.minTeams) > Number(form.maxTeams)) next.maxTeams = 'Maximum teams must be greater than minimum teams.';
    ['minTeams', 'maxTeams', 'minPlayers', 'maxPlayers'].forEach((key) => { if (form[key] && Number(form[key]) < 1) next[key] = 'Value must be at least 1.'; });
    ['prizePool', 'firstPrize', 'secondPrize', 'thirdPrize'].forEach((key) => { if (form[key] && !/^[^\d]*\d[\d,]*(?:\.\d+)?/.test(form[key])) next[key] = 'Enter a valid prize amount.'; });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const persist = (publish) => {
    if (savingMode) return;
    // Publish requires a clean pass over dates + required fields; drafts may be partial.
    if (publish && !validate()) { setSection('basic'); return; }
    if (!publish && !form.name.trim()) { setErrors({ name: 'A draft still needs a name.' }); setSection('basic'); return; }
    setSavingMode(publish ? 'publishing' : 'saving');

    const payload = { ...form, status: publish ? TOURNAMENT_STATUS.PUBLISHED : TOURNAMENT_STATUS.DRAFT };
    const result = isEditing
      ? updateTournament(editId, payload, { status: payload.status })
      : createTournament(payload, { publish });

    if (!result.ok) {
      setToast({ tone: 'danger', title: 'Could not save tournament', text: result.error });
      setSavingMode('');
      return;
    }

    try {
      sessionStorage.setItem('admin-toast', JSON.stringify({
        tone: 'success',
        title: publish ? 'Tournament published' : 'Draft saved',
        text: publish
          ? `${result.tournament.name} is now visible on the public tournaments page.`
          : `${result.tournament.name} was saved as a draft.`,
      }));
    } catch { /* ignore */ }
    navigate(isEditing ? '/admin/tournaments?view=all' : '/admin/tournaments');
  };

  const handleCover = async (event, key) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { update(key, await compressImageFile(file, 1000, 0.8)); }
    catch { setToast({ tone: 'danger', title: 'Image error', text: 'That image could not be processed.' }); }
  };

  const SECTIONS = [
    ['basic', 'Basic'],
    ['venue', 'Venue'],
    ['dates', 'Dates'],
    ['registration', 'Registration'],
    ['prizes', 'Prizes'],
    ['eligibility', 'Eligibility'],
    ['rules', 'Rules'],
    ['images', 'Images'],
    ['contact', 'Contact'],
  ];

  return (
    <div className="admin-list-page">
      <div className="admin-dash-head">
        <div>
          <span className="section-kicker">TOURNAMENTS</span>
          <h2>{isEditing ? 'Edit tournament' : 'Create a tournament'}</h2>
          <p>{isEditing ? 'Update the configuration. Changes reflect everywhere the tournament is shown.' : 'Configure every aspect of the event, then save a draft or publish it.'}</p>
        </div>
        <div className="admin-dash-head-actions">
          <button type="button" className="btn btn-secondary admin-action-btn" onClick={() => navigate('/admin/tournaments')}>
            <AdminIcon name="chevron" size={16} className="admin-icon-back" /> Back
          </button>
        </div>
      </div>

      <div className="admin-section-tabs" role="tablist">
        {SECTIONS.map(([key, label]) => (
          <button type="button" key={key} role="tab" aria-selected={section === key} className={`admin-section-tab ${section === key ? 'active' : ''}`} onClick={() => setSection(key)}>{label}</button>
        ))}
      </div>

      <div className="admin-panel">
        {/* A — Basic */}
        {section === 'basic' && (
          <div className="admin-form-section">
            <h4>Basic information</h4>
            <div className="admin-form-grid">
              <label className="form-field admin-field-wide"><span>Tournament name *</span><input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Vadodara Premier Cup" />{errors.name && <small className="admin-field-error">{errors.name}</small>}</label>
              <label className="form-field"><span>Sport *</span>
                <select value={form.sport} onChange={(e) => { update('sport', e.target.value); update('format', ''); update('matchType', ''); }}>
                  {TOURNAMENT_SPORTS.map((sport) => <option key={sport} value={sport}>{sport}</option>)}
                </select>
              </label>
              <label className="form-field"><span>Tournament format</span>
                <select value={form.format} onChange={(e) => { update('format', e.target.value); update('matchType', e.target.value); }}>
                  <option value="">— Select format —</option>
                  {formats.map((fmt) => <option key={fmt} value={fmt}>{fmt}</option>)}
                </select>
              </label>
              <label className="form-field admin-field-wide"><span>Match type</span><input value={form.matchType} onChange={(e) => update('matchType', e.target.value)} placeholder="e.g. Knockout / League" /></label>
              <label className="form-field admin-field-wide"><span>Description</span><textarea rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="What makes this tournament special…" /></label>
            </div>
          </div>
        )}

        {/* B — Venue */}
        {section === 'venue' && (
          <div className="admin-form-section">
            <h4>Venue</h4>
            <SearchInput value={venueQuery} onChange={setVenueQuery} placeholder="Search registered turfs…" />
            {errors.venueId && <small className="admin-field-error">{errors.venueId}</small>}
            <div className="admin-venue-picker">
              {filteredVenues.map((turf) => (
                <button type="button" key={turf.id} className={`admin-venue-option ${form.venueId === turf.id ? 'active' : ''}`}
                  onClick={() => { update('venueId', turf.id); update('venueName', turf.name); update('area', turf.area || ''); }}>
                  {turf.image ? <img src={turf.image} alt="" /> : <span className="admin-venue-option-ph"><AdminIcon name="turf" size={18} /></span>}
                  <span className="admin-venue-option-body">
                    <strong>{turf.name}</strong>
                    <small>{turf.area} · {(turf.sports || []).join(', ')}</small>
                  </span>
                  {form.venueId === turf.id && <AdminIcon name="check" size={16} />}
                </button>
              ))}
            </div>

            {(selectedVenue || form.venueName) && (
              <div className="admin-venue-detail">
                <h5>{selectedVenue?.name || form.venueName}</h5>
                <div className="admin-detail-grid">
                  <div className="admin-detail-field"><span>Area</span><strong>{selectedVenue?.area || form.area || '—'}</strong></div>
                  <div className="admin-detail-field"><span>Address</span><strong>{selectedVenue?.address || '—'}</strong></div>
                </div>
                {selectedVenue?.facilities?.length ? (
                  <div className="admin-chip-row">{selectedVenue.facilities.map((f) => <span className="admin-mini-chip" key={f}>{f}</span>)}</div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* C — Dates */}
        {section === 'dates' && (
          <div className="admin-form-section">
            <h4>Dates</h4>
            <div className="admin-form-grid">
              <label className="form-field"><span>Registration start</span><input type="date" value={form.registrationStart} onChange={(e) => update('registrationStart', e.target.value)} /></label>
              <label className="form-field"><span>Registration end</span><input type="date" value={form.registrationEnd} onChange={(e) => update('registrationEnd', e.target.value)} />{errors.registrationEnd && <small className="admin-field-error">{errors.registrationEnd}</small>}</label>
              <label className="form-field"><span>Tournament start *</span><input type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />{errors.startDate && <small className="admin-field-error">{errors.startDate}</small>}</label>
              <label className="form-field"><span>Tournament end</span><input type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} />{errors.endDate && <small className="admin-field-error">{errors.endDate}</small>}</label>
            </div>
            <p className="admin-detail-empty">Registration must close before the tournament starts. End dates must fall after their start dates.</p>
          </div>
        )}

        {/* D — Registration */}
        {section === 'registration' && (
          <div className="admin-form-section">
            <h4>Registration</h4>
            <div className="admin-chip-toggle-row">
              {REGISTRATION_TYPES.map((type) => (
                <button type="button" key={type} className={`admin-chip-toggle ${form.registrationType === type ? 'active' : ''}`} onClick={() => update('registrationType', type)}>{type}</button>
              ))}
            </div>
            <div className="admin-form-grid">
              {form.registrationType === 'Team' ? (
                <>
                  <label className="form-field"><span>Maximum teams</span><input type="number" min="0" value={form.maxTeams} onChange={(e) => update('maxTeams', e.target.value)} /></label>
                  <label className="form-field"><span>Minimum teams</span><input type="number" min="0" value={form.minTeams} onChange={(e) => update('minTeams', e.target.value)} /></label>
                </>
              ) : (
                <>
                  <label className="form-field"><span>Maximum players</span><input type="number" min="0" value={form.maxPlayers} onChange={(e) => update('maxPlayers', e.target.value)} /></label>
                  <label className="form-field"><span>Minimum players</span><input type="number" min="0" value={form.minPlayers} onChange={(e) => update('minPlayers', e.target.value)} /></label>
                </>
              )}
              <label className="form-field"><span>Entry fee</span><input value={form.entryFee} onChange={(e) => update('entryFee', e.target.value)} placeholder="e.g. ₹1,500 per team" /></label>
            </div>
          </div>
        )}

        {/* E — Prizes */}
        {section === 'prizes' && (
          <div className="admin-form-section">
            <h4>Prizes</h4>
            <div className="admin-form-grid">
              <label className="form-field"><span>Prize pool</span><input value={form.prizePool} onChange={(e) => update('prizePool', e.target.value)} placeholder="e.g. ₹50,000" /></label>
              <label className="form-field"><span>1st prize</span><input value={form.firstPrize} onChange={(e) => update('firstPrize', e.target.value)} /></label>
              <label className="form-field"><span>2nd prize</span><input value={form.secondPrize} onChange={(e) => update('secondPrize', e.target.value)} /></label>
              <label className="form-field"><span>3rd prize</span><input value={form.thirdPrize} onChange={(e) => update('thirdPrize', e.target.value)} /></label>
            </div>
            <h4>Optional</h4>
            <div className="admin-chip-toggle-row">
              {[['winnerTrophy', 'Winner trophy'], ['medals', 'Medals'], ['certificate', 'Certificates']].map(([key, label]) => (
                <button type="button" key={key} className={`admin-chip-toggle ${form[key] ? 'active' : ''}`} onClick={() => update(key, !form[key])}>{label}</button>
              ))}
            </div>
          </div>
        )}

        {/* F — Eligibility */}
        {section === 'eligibility' && (
          <div className="admin-form-section">
            <h4>Eligibility</h4>
            <div className="admin-form-grid">
              <label className="form-field"><span>Minimum age</span><input type="number" min="0" value={form.minAge} onChange={(e) => update('minAge', e.target.value)} /></label>
              <label className="form-field"><span>Maximum age</span><input type="number" min="0" value={form.maxAge} onChange={(e) => update('maxAge', e.target.value)} />{errors.maxAge && <small className="admin-field-error">{errors.maxAge}</small>}</label>
              <label className="form-field"><span>Gender</span>
                <select value={form.gender} onChange={(e) => update('gender', e.target.value)}>
                  {['Open', 'Male', 'Female', 'Mixed'].map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="form-field"><span>Skill level</span>
                <select value={form.skillLevel} onChange={(e) => update('skillLevel', e.target.value)}>
                  {['Beginner', 'Intermediate', 'Advanced', 'Open'].map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            </div>
          </div>
        )}

        {/* G — Rules */}
        {section === 'rules' && (
          <div className="admin-form-section">
            <h4>Rules & policies</h4>
            <label className="form-field"><span>About tournament</span><textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} /></label>
            <label className="form-field"><span>Tournament rules</span><textarea rows={3} value={form.rules} onChange={(e) => update('rules', e.target.value)} /></label>
            <label className="form-field"><span>Eligibility rules</span><textarea rows={3} value={form.eligibilityRules} onChange={(e) => update('eligibilityRules', e.target.value)} /></label>
            <label className="form-field"><span>Cancellation policy</span><textarea rows={3} value={form.cancellationPolicy} onChange={(e) => update('cancellationPolicy', e.target.value)} /></label>
          </div>
        )}

        {/* H — Images */}
        {section === 'images' && (
          <div className="admin-form-section">
            <h4>Images</h4>
            <div className="admin-form-grid">
              <div className="form-field">
                <span>Tournament cover image</span>
                <label className="admin-upload-drop compact">
                  <input type="file" accept="image/*" onChange={(e) => handleCover(e, 'coverImage')} />
                  <AdminIcon name="trophy" size={18} /><span>Upload cover</span>
                </label>
                {form.coverImage && <img className="admin-image-single" src={form.coverImage} alt="Cover preview" />}
              </div>
              <div className="form-field">
                <span>Tournament poster</span>
                <label className="admin-upload-drop compact">
                  <input type="file" accept="image/*" onChange={(e) => handleCover(e, 'posterImage')} />
                  <AdminIcon name="trophy" size={18} /><span>Upload poster</span>
                </label>
                {form.posterImage && <img className="admin-image-single" src={form.posterImage} alt="Poster preview" />}
              </div>
            </div>
          </div>
        )}

        {/* I — Contact */}
        {section === 'contact' && (
          <div className="admin-form-section">
            <h4>Contact</h4>
            <div className="admin-form-grid">
              <label className="form-field"><span>Organizer name</span><input value={form.organizerName} onChange={(e) => update('organizerName', e.target.value)} /></label>
              <label className="form-field"><span>Contact number</span><input value={form.contactNumber} onChange={(e) => update('contactNumber', e.target.value)} /></label>
              <label className="form-field"><span>Contact email</span><input type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} /></label>
              <label className="form-field"><span>WhatsApp number</span><input value={form.whatsappNumber} onChange={(e) => update('whatsappNumber', e.target.value)} /></label>
            </div>
          </div>
        )}
      </div>

      <div className="admin-form-foot sticky">
        <button type="button" className="btn btn-secondary" disabled={Boolean(savingMode)} onClick={() => persist(false)}>{savingMode === 'saving' ? 'Saving...' : 'Save as Draft'}</button>
        <button type="button" className="btn btn-primary" disabled={Boolean(savingMode)} onClick={() => persist(true)}>{savingMode === 'publishing' ? 'Publishing...' : 'Publish Tournament'}</button>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

export default TournamentFormPage;