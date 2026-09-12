import { useEffect, useMemo, useState } from 'react';
import { sports, turfs } from './data/homeData';
import { tournaments } from './data/tournaments';
import GlobalHeader from './GlobalHeader';
import ConnectedOwnerDashboard from './OwnerDashboard';
import {
  calculateAge,
  createId,
  findDuplicateContact,
  findDuplicatePlayer,
  getDemoState,
  getAllTurfs,
  getBookings,
  getSession,
  getTournament,
  getTurf,
  getTurfOwnerId,
  saveDemoState,
  setSession,
} from './data/demoStore';

const appNav = [
  { label: 'Dashboard', href: '/player/dashboard' },
  { label: 'My Profile', href: '/player/profile' },
  { label: 'Find Turf', href: '/player/dashboard#find-turf' },
  { label: 'Tournaments', href: '/tournaments' },
];

const blankForm = {
  firstName: '', surname: '', dob: '', mobile: '', email: '', password: '',
  house: '', street: '', landmark: '', pincode: '', sportId: '', selectedTurfId: '', profileImage: '',
};

const navigate = (href) => {
  window.location.href = href;
};

const formatDate = (value) => {
  if (!value) return '';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const compressImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 720 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    image.onerror = reject;
    image.src = reader.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

function PlayerApp() {
  const path = window.location.pathname;
  const [state, setState] = useState(getDemoState);
  const [session, setCurrentSession] = useState(getSession);
  const refresh = () => setState(getDemoState());
  const logout = () => {
    setSession(null);
    setCurrentSession(null);
    navigate('/login');
  };

  if (path === '/signup') return <SignupPage />;
  if (path === '/player/register') return <PlayerRegistration onCreated={(nextSession) => { setCurrentSession(nextSession); refresh(); }} />;
  if (path === '/turf-owner/register') return <TurfOwnerRegistration />;
  if (path === '/turf-owner/success') return <TurfRegistrationSuccess />;
  if (path === '/login') return <LoginPage onLogin={(nextSession) => { setCurrentSession(nextSession); refresh(); }} />;
  if (path.startsWith('/turf-owner')) {
    if (!session || session.role !== 'turf-owner') return <ProtectedMessage role="turf owner" />;
    return <ConnectedOwnerDashboard state={state} session={session} refresh={refresh} logout={logout} />;
  }
  if (path === '/player/profile') {
    if (!session || session.role !== 'player') return <ProtectedMessage role="player" />;
    return <ProfilePage state={state} session={session} refresh={refresh} logout={logout} />;
  }
  if (path === '/player/dashboard' || path.startsWith('/player/')) {
    if (!session || session.role !== 'player') return <ProtectedMessage role="player" />;
    return <PlayerDashboard state={state} session={session} refresh={refresh} logout={logout} />;
  }
  return <LoginPage onLogin={(nextSession) => { setCurrentSession(nextSession); refresh(); }} />;
}

function AuthFrame({ children, eyebrow, title, text }) {
  return <div className="player-app"><GlobalHeader /><div className="auth-page"><div className="auth-visual"><div className="auth-visual-copy"><span className="eyebrow">VADODARA SPORTS PLATFORM</span><strong>YOUR GAME.<br />YOUR PLACE.</strong><span>Discover. Connect. Compete.</span></div></div><main className="auth-panel"><div className="auth-heading"><span className="section-kicker">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{children}</main></div></div>;
}

function SignupPage() {
  return <AuthFrame eyebrow="JOIN THE PLATFORM" title="HOW DO YOU WANT TO JOIN?" text="Choose how you want to be part of the Vadodara Sports Platform."><div className="registration-choice-grid"><RegistrationChoice icon="◉" title="Player Registration" text="Create your player profile, choose your sport, discover turfs and stay connected with upcoming matches and tournaments." action="Register as Player" onClick={() => navigate('/player/register')} /><RegistrationChoice icon="⌂" title="Turf Registration" text="Register your sports venue and connect with players looking for a place to play." action="Register Your Turf" onClick={() => navigate('/turf-owner/register')} /></div><p className="auth-footer-note">Already part of the platform? <button type="button" onClick={() => navigate('/login')}>Login here</button></p></AuthFrame>;
}

function RegistrationChoice({ icon, title, text, action, onClick }) {
  return <article className="registration-choice"><span className="choice-icon">{icon}</span><span className="choice-number">01</span><h2>{title}</h2><p>{text}</p><button type="button" className="btn btn-primary" onClick={onClick}>{action} <span>→</span></button></article>;
}

const defaultOpeningHours = () => ({
  Monday: { open: true, from: '06:00', to: '23:00' },
  Tuesday: { open: true, from: '06:00', to: '23:00' },
  Wednesday: { open: true, from: '06:00', to: '23:00' },
  Thursday: { open: true, from: '06:00', to: '23:00' },
  Friday: { open: true, from: '06:00', to: '23:00' },
  Saturday: { open: true, from: '07:00', to: '22:30' },
  Sunday: { open: false, from: '09:00', to: '21:00' },
});

const openingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const formatTimeLabel = (value) => {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
};

const formatOpeningHours = (hours) => openingDays
  .filter((day) => hours[day]?.open)
  .map((day) => `${day} ${formatTimeLabel(hours[day].from)} to ${formatTimeLabel(hours[day].to)}`)
  .join(' • ');

function TurfOwnerRegistration() {
  const [form, setForm] = useState({
    ownerName: '',
    ownerMobile: '',
    ownerEmail: '',
    password: '',
    confirmPassword: '',
    alternateMobile: '',
    profilePhoto: '',
    ownerHouse: '',
    ownerStreet: '',
    ownerCity: 'Vadodara',
    ownerState: 'Gujarat',
    ownerPincode: '',
    turfName: '',
    turfDescription: '',
    turfType: '',
    turfLength: '',
    turfWidth: '',
    turfSizeUnit: 'ft',
    playingAreas: '',
    sports: ['Cricket'],
    facilities: ['Parking'],
    openingHours: defaultOpeningHours(),
    turfHouse: '',
    turfStreet: '',
    turfArea: '',
    turfCity: 'Vadodara',
    turfState: 'Gujarat',
    turfPincode: '',
    locationLabel: '',
    turfImages: [],
    primaryImage: '',
    contactNumber: '',
    turfEmail: '',
    bookingInstructions: '',
    rules: '',
  });
  const [errors, setErrors] = useState({});
  const [review, setReview] = useState(false);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const toggleSelection = (key, value) => setForm((current) => {
    const list = current[key] || [];
    return {
      ...current,
      [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
    };
  });

  const handleOpeningToggle = (day) => {
    setForm((current) => ({
      ...current,
      openingHours: {
        ...current.openingHours,
        [day]: {
          ...current.openingHours[day],
          open: !current.openingHours[day].open,
        },
      },
    }));
  };

  const updateOpeningTime = (day, field, value) => {
    setForm((current) => ({
      ...current,
      openingHours: {
        ...current.openingHours,
        [day]: {
          ...current.openingHours[day],
          [field]: value,
        },
      },
    }));
  };

  const validate = () => {
    const nextErrors = {};
    const ownerMobile = form.ownerMobile.replace(/\s/g, '');
    const turfMobile = (form.contactNumber || ownerMobile).replace(/\s/g, '');
    const password = document.querySelector('input[name="turf-owner-password"]')?.value || '';
    const confirmPassword = document.querySelector('input[name="turf-owner-confirm-password"]')?.value || '';

    if (!form.ownerName.trim()) nextErrors.ownerName = 'Owner name is required.';
    if (!/^\d{10}$/.test(ownerMobile)) nextErrors.ownerMobile = 'Enter a valid 10-digit mobile number.';
    if (!/^\S+@\S+\.\S+$/.test(form.ownerEmail.trim())) nextErrors.ownerEmail = 'Enter a valid email address.';
    if (!password) nextErrors.ownerEmail = 'Password is required.';
    if (!confirmPassword) nextErrors.ownerEmail = 'Confirm password is required.';
    if (password && confirmPassword && password !== confirmPassword) nextErrors.ownerEmail = 'Passwords do not match.';
    if (!form.ownerHouse.trim()) nextErrors.ownerHouse = 'House or shop number is required.';
    if (!form.ownerStreet.trim()) nextErrors.ownerStreet = 'Street or area is required.';
    if (!/^\d{6}$/.test(form.ownerPincode)) nextErrors.ownerPincode = 'Enter a valid 6-digit pincode.';
    if (!form.turfName.trim()) nextErrors.turfName = 'Turf name is required.';
    if (!form.turfDescription.trim()) nextErrors.turfDescription = 'A short description is required.';
    if (!form.turfLength && !form.turfWidth && !form.turfType) nextErrors.turfSize = 'Enter turf size or dimensions.';
    if (!form.sports.length) nextErrors.sports = 'Select at least one sport.';
    if (!Object.values(form.openingHours).some((day) => day.open)) nextErrors.openingHours = 'Set at least one open day.';
    if (!form.turfHouse.trim()) nextErrors.turfHouse = 'Turf house or plot number is required.';
    if (!form.turfStreet.trim()) nextErrors.turfStreet = 'Turf street or locality is required.';
    if (!form.turfCity.trim()) nextErrors.turfCity = 'Turf city is required.';
    if (!/^\d{6}$/.test(form.turfPincode)) nextErrors.turfPincode = 'Enter a valid 6-digit turf pincode.';
    if (!form.primaryImage) nextErrors.primaryImage = 'Please upload a primary turf image.';
    if (!/^\d{10}$/.test(turfMobile)) nextErrors.contactNumber = 'Turf contact number should be a valid 10-digit mobile number.';
    if (!/^\S+@\S+\.\S+$/.test((form.turfEmail || form.ownerEmail).trim())) nextErrors.turfEmail = 'Enter a valid turf email address.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const image = new Image();
          image.onload = () => {
            const scale = Math.min(1, 900 / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          image.onerror = reject;
          image.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setField('profilePhoto', result);
      setErrors((current) => ({ ...current, profilePhoto: '' }));
    } catch {
      setErrors((current) => ({ ...current, profilePhoto: 'This profile photo could not be processed.' }));
    }
  };

  const handleTurfImages = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    try {
      const processed = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const image = new Image();
          image.onload = () => {
            const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          image.onerror = reject;
          image.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })));
      const nextImages = [...(form.turfImages || []), ...processed];
      setForm((current) => ({
        ...current,
        turfImages: nextImages,
        primaryImage: current.primaryImage || nextImages[0] || '',
      }));
      setErrors((current) => ({ ...current, primaryImage: '' }));
    } catch {
      setErrors((current) => ({ ...current, primaryImage: 'One or more turf images could not be processed.' }));
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (validate()) setReview(true);
  };

  const registerTurf = () => {
    const state = getDemoState();
    const normalizedMobile = form.ownerMobile.replace(/\s/g, '');
    const turfLoginEmail = (form.turfEmail || form.ownerEmail).trim().toLowerCase();
    const emailAlreadyRegistered = state.owners.some((owner) => owner.email?.trim().toLowerCase() === turfLoginEmail)
      || state.registeredTurfs.some((turf) => (turf.turfEmail || turf.ownerEmail || '').trim().toLowerCase() === turfLoginEmail);

    if (emailAlreadyRegistered) {
      setErrors({ duplicate: 'This email is already registered as a turf owner. Please use a different email.' });
      setReview(false);
      return;
    }

    const duplicate = state.registeredTurfs.some((turf) => (
      turf.name?.trim().toLowerCase() === form.turfName.trim().toLowerCase()
      && (turf.ownerMobile || '').replace(/\s/g, '') === normalizedMobile
      && (turf.turfAddress?.city || turf.area || '').toLowerCase() === (form.turfCity || 'vadodara').toLowerCase()
    ));

    if (duplicate) {
      setErrors({ duplicate: 'A likely duplicate of this turf is already registered. Please review the existing listing instead of creating another one.' });
      setReview(false);
      return;
    }

    const turfId = createId('registered-turf');
    const ownerId = createId('registered-owner');
    const password = document.querySelector('input[name="turf-owner-password"]')?.value || '';
    const turfRecord = {
      id: turfId,
      ownerId,
      ownerName: form.ownerName.trim(),
      ownerMobile: normalizedMobile,
      ownerEmail: form.ownerEmail.trim(),
      turfEmail: turfLoginEmail,
      ownerAddress: `${form.ownerHouse.trim()}, ${form.ownerStreet.trim()}, ${form.ownerCity}, ${form.ownerState} - ${form.ownerPincode}`,
      turfName: form.turfName.trim(),
      name: form.turfName.trim(),
      turfDescription: form.turfDescription.trim(),
      turfType: form.turfType || 'Multi-sport turf',
      turfSize: [
        form.turfLength ? `${form.turfLength} ${form.turfSizeUnit}` : '',
        form.turfWidth ? `${form.turfWidth} ${form.turfSizeUnit}` : '',
        form.playingAreas ? `${form.playingAreas} playing area${Number(form.playingAreas) > 1 ? 's' : ''}` : '',
      ].filter(Boolean).join(' × '),
      sports: form.sports,
      games: form.sports,
      facilities: form.facilities,
      openingHours: formatOpeningHours(form.openingHours),
      area: form.turfArea || form.turfCity || 'Vadodara',
      location: form.locationLabel || `${form.turfArea || 'Vadodara'}, ${form.turfCity || 'Vadodara'}`,
      price: '₹550 / hour',
      image: form.primaryImage || (form.turfImages[0] || ''),
      images: form.turfImages.length ? form.turfImages : [form.primaryImage],
      primaryImage: form.primaryImage || (form.turfImages[0] || ''),
      turfAddress: {
        house: form.turfHouse.trim(),
        street: form.turfStreet.trim(),
        area: form.turfArea.trim(),
        city: form.turfCity.trim(),
        state: form.turfState.trim(),
        pincode: form.turfPincode,
      },
      turfContactNumber: (form.contactNumber || normalizedMobile).replace(/\s/g, ''),
      bookingInstructions: form.bookingInstructions.trim(),
      rules: form.rules.trim(),
      registrationStatus: 'Registered',
      createdAt: new Date().toISOString(),
    };

    state.registeredTurfs.push(turfRecord);
    state.owners.push({
      id: ownerId,
      role: 'turf-owner',
      name: turfRecord.ownerName,
      email: turfLoginEmail,
      turfEmail: turfLoginEmail,
      mobile: turfRecord.ownerMobile,
      password,
      turfIds: [turfId],
      createdAt: turfRecord.createdAt,
    });
    saveDemoState(state);
    setSession({ userId: ownerId, ownerId, turfId, role: 'turf-owner', email: turfLoginEmail });
    navigate(`/turf-owner/dashboard?turfId=${turfId}`);
  };

  return <div className="player-app registration-page"><header className="app-topbar"><button type="button" className="app-brand" onClick={() => navigate('/')}><span className="brand-mark">VS</span><span>SPORTS PLATFORM</span></button><button type="button" className="text-button" onClick={() => navigate('/login')}>Already registered? Login</button></header><main className="registration-main container"><div className="registration-heading"><span className="section-kicker">TURF REGISTRATION</span><h1>REGISTER YOUR TURF.</h1><p>Share the owner details and turf information needed to list your venue on the platform.</p></div><form className="registration-form" onSubmit={submit}>{errors.duplicate && <div className="form-alert">{errors.duplicate}</div>}<section className="form-section"><FormSectionTitle number="01" title="Owner Information" /><div className="form-grid two"><Field label="Full Name" value={form.ownerName} onChange={(value) => setField('ownerName', value)} placeholder="Owner's full name" error={errors.ownerName} required /><Field label="Mobile Number" value={form.ownerMobile} onChange={(value) => setField('ownerMobile', value)} placeholder="98765 43210" error={errors.ownerMobile} required /><Field label="Email Address" type="email" value={form.ownerEmail} onChange={(value) => setField('ownerEmail', value)} placeholder="owner@domain.com" error={errors.ownerEmail} required /><Field label="Alternate Contact Number" value={form.alternateMobile} onChange={(value) => setField('alternateMobile', value)} placeholder="Optional" error={errors.alternateMobile} /><div className="form-field photo-field" style={{ gridColumn: '1 / -1' }}><span>Profile Photo <b>*</b></span><div className="photo-upload"><div className="photo-preview">{form.profilePhoto ? <img src={form.profilePhoto} alt="Owner profile preview" /> : 'OP'}</div><label className="btn btn-secondary upload-button">Upload Photo<input type="file" accept="image/*" onChange={handlePhoto} /></label></div>{errors.profilePhoto && <small className="inline-error">{errors.profilePhoto}</small>}</div></div><div className="form-grid two" style={{ marginTop: '18px' }}><Field label="House / Building / Shop Number" value={form.ownerHouse} onChange={(value) => setField('ownerHouse', value)} placeholder="12 / B-14" error={errors.ownerHouse} required /><Field label="Street / Area" value={form.ownerStreet} onChange={(value) => setField('ownerStreet', value)} placeholder="Alkapuri, Vadodara" error={errors.ownerStreet} required /><Field label="City" value={form.ownerCity} onChange={(value) => setField('ownerCity', value)} placeholder="Vadodara" error={errors.ownerCity} required /><Field label="State" value={form.ownerState} onChange={(value) => setField('ownerState', value)} placeholder="Gujarat" required /><Field label="Pincode" value={form.ownerPincode} onChange={(value) => setField('ownerPincode', value)} placeholder="390001" error={errors.ownerPincode} required /></div></section><section className="form-section"><FormSectionTitle number="02" title="Turf Details" /><div className="form-grid two"><Field label="Turf Name" value={form.turfName} onChange={(value) => setField('turfName', value)} placeholder="ABC Sports Arena" error={errors.turfName} required /><Field label="Turf Type" value={form.turfType} onChange={(value) => setField('turfType', value)} placeholder="Football / Cricket / Multi-sport" /></div><Field label="Turf Description" value={form.turfDescription} onChange={(value) => setField('turfDescription', value)} placeholder="Describe your turf" error={errors.turfDescription} required /><div className="form-grid two" style={{ marginTop: '18px' }}><Field label="Length" value={form.turfLength} onChange={(value) => setField('turfLength', value)} placeholder="120" /><Field label="Width" value={form.turfWidth} onChange={(value) => setField('turfWidth', value)} placeholder="80" /><Field label="Total Size / Area" value={form.playingAreas} onChange={(value) => setField('playingAreas', value)} placeholder="2 courts / 9600 sq ft" /><Field label="Unit" value={form.turfSizeUnit} onChange={(value) => setField('turfSizeUnit', value)} placeholder="ft" /></div>{errors.turfSize && <small className="inline-error">{errors.turfSize}</small>}</section><section className="form-section"><FormSectionTitle number="03" title="Sports / Games Available" /><p className="form-section-note">Select all the sports that can be played on this turf.</p><div className="sport-choice-grid">{['Cricket', 'Football', 'Pickleball', 'Tennis', 'Badminton'].map((sport) => <button type="button" key={sport} className={`sport-choice ${form.sports.includes(sport) ? 'selected' : ''}`} onClick={() => toggleSelection('sports', sport)}><span>{sport === 'Cricket' ? '🏏' : sport === 'Football' ? '⚽' : sport === 'Pickleball' ? '🏓' : sport === 'Tennis' ? '🎾' : '🏸'}</span><strong>{sport}</strong><i>{form.sports.includes(sport) ? 'Selected' : 'Available'}</i></button>)}</div>{errors.sports && <small className="inline-error">{errors.sports}</small>}</section><section className="form-section"><FormSectionTitle number="04" title="Facilities / Amenities" /><div className="sport-choice-grid">{['Parking', 'Washroom', 'Changing Room', 'Drinking Water', 'Flood Lights', 'Seating Area', 'Equipment', 'Cafe', 'Other'].map((facility) => <button type="button" key={facility} className={`sport-choice ${form.facilities.includes(facility) ? 'selected' : ''}`} onClick={() => toggleSelection('facilities', facility)}><span>{facility === 'Parking' ? '🚗' : facility === 'Washroom' ? '🚻' : facility === 'Changing Room' ? '🧴' : facility === 'Drinking Water' ? '💧' : facility === 'Flood Lights' ? '💡' : facility === 'Seating Area' ? '🪑' : facility === 'Equipment' ? '🏋️' : facility === 'Cafe' ? '☕' : '✨'}</span><strong>{facility}</strong><i>{form.facilities.includes(facility) ? 'Included' : 'Optional'}</i></button>)}</div></section><section className="form-section"><FormSectionTitle number="05" title="Opening Hours" /><div className="form-grid two">{openingDays.map((day) => <div key={day} className="form-field" style={{ display: 'grid', gap: '12px' }}><span>{day}</span><div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><button type="button" className={`btn ${form.openingHours[day].open ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleOpeningToggle(day)}>{form.openingHours[day].open ? 'Open' : 'Closed'}</button>{form.openingHours[day].open && <><input type="time" value={form.openingHours[day].from} onChange={(event) => updateOpeningTime(day, 'from', event.target.value)} /><input type="time" value={form.openingHours[day].to} onChange={(event) => updateOpeningTime(day, 'to', event.target.value)} /></>}</div></div>)}</div>{errors.openingHours && <small className="inline-error">{errors.openingHours}</small>}</section><section className="form-section"><FormSectionTitle number="06" title="Turf Location & Address" /><div className="form-grid two"><Field label="House / Building / Plot" value={form.turfHouse} onChange={(value) => setField('turfHouse', value)} placeholder="Plot 12" error={errors.turfHouse} required /><Field label="Street / Road" value={form.turfStreet} onChange={(value) => setField('turfStreet', value)} placeholder="Near Ring Road" error={errors.turfStreet} required /><Field label="Area / Locality" value={form.turfArea} onChange={(value) => setField('turfArea', value)} placeholder="Alkapuri" /><Field label="City" value={form.turfCity} onChange={(value) => setField('turfCity', value)} placeholder="Vadodara" error={errors.turfCity} required /><Field label="State" value={form.turfState} onChange={(value) => setField('turfState', value)} placeholder="Gujarat" /><Field label="Pincode" value={form.turfPincode} onChange={(value) => setField('turfPincode', value)} placeholder="390001" error={errors.turfPincode} required /><Field label="Location" value={form.locationLabel} onChange={(value) => setField('locationLabel', value)} placeholder="Near Alkapuri, Vadodara" style={{ gridColumn: '1 / -1' }} /></div></section><section className="form-section"><FormSectionTitle number="07" title="Turf Images" /><div className="photo-upload"><div className="photo-preview" style={{ borderRadius: '18px', width: '140px', height: '90px' }}>{form.primaryImage ? <img src={form.primaryImage} alt="Primary turf preview" /> : 'Turf'}</div><label className="btn btn-secondary upload-button">Upload Turf Images<input type="file" accept="image/*" multiple onChange={handleTurfImages} /></label></div>{form.turfImages.length > 0 && <div className="form-grid two" style={{ marginTop: '18px' }}>{form.turfImages.slice(0, 6).map((image, index) => <div key={`${image}-${index}`} className="photo-preview" style={{ width: '100%', height: '120px', borderRadius: '12px' }}><img src={image} alt={`Turf image ${index + 1}`} /></div>)}</div>}{errors.primaryImage && <small className="inline-error">{errors.primaryImage}</small>}</section><section className="form-section"><FormSectionTitle number="08" title="Additional Turf Information" /><div className="form-grid two"><Field label="Contact Number for Turf" value={form.contactNumber || form.ownerMobile} onChange={(value) => setField('contactNumber', value)} placeholder="98765 43210" error={errors.contactNumber} /><Field label="Turf Email" type="email" value={form.turfEmail || form.ownerEmail} onChange={(value) => setField('turfEmail', value)} error={errors.turfEmail} placeholder="hello@turf.com" /><Field label="Booking Instructions" value={form.bookingInstructions} onChange={(value) => setField('bookingInstructions', value)} placeholder="Optional booking guidance for customers" style={{ gridColumn: '1 / -1' }} /><Field label="Rules / Restrictions" value={form.rules} onChange={(value) => setField('rules', value)} placeholder="No outside food, shoes only, etc." style={{ gridColumn: '1 / -1' }} /></div></section><div className="registration-actions"><button type="button" className="btn btn-secondary" onClick={() => navigate('/signup')}>Back</button><button type="submit" className="btn btn-primary">Review Registration</button></div></form>{review && <TurfReviewModal form={form} onClose={() => setReview(false)} onConfirm={registerTurf} />}</main></div>;
}

function TurfReviewModal({ form, onClose, onConfirm }) {
  return <div className="review-modal-backdrop"><section className="review-modal"><button type="button" className="modal-close" onClick={onClose}>×</button><span className="section-kicker">REVIEW TURF REGISTRATION</span><h2>FINAL CHECK</h2><div className="review-grid"><ReviewItem label="Owner Name" value={form.ownerName} /><ReviewItem label="Mobile" value={form.ownerMobile} /><ReviewItem label="Email" value={form.ownerEmail} /><ReviewItem label="Owner Address" value={`${form.ownerHouse}, ${form.ownerStreet}, ${form.ownerCity}, ${form.ownerState}`} /><ReviewItem label="Turf Name" value={form.turfName} /><ReviewItem label="Description" value={form.turfDescription} /><ReviewItem label="Sport(s)" value={form.sports.join(' • ')} /><ReviewItem label="Facilities" value={form.facilities.join(' • ')} /><ReviewItem label="Opening Hours" value={formatOpeningHours(form.openingHours)} /><ReviewItem label="Turf Address" value={`${form.turfHouse}, ${form.turfStreet}, ${form.turfArea || form.turfCity}, ${form.turfCity}`} /><ReviewItem label="Contact" value={form.contactNumber || form.ownerMobile} /><ReviewItem label="Primary Image" value={form.primaryImage ? 'Uploaded' : 'Not uploaded'} /></div><div className="review-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Edit</button><button type="button" className="btn btn-primary" onClick={onConfirm}>Register Turf</button></div></section></div>;
}

function TurfRegistrationSuccess() {
  const turfId = new URLSearchParams(window.location.search).get('id');
  const registeredTurfs = getDemoState().registeredTurfs || [];
  const turf = registeredTurfs.find((item) => item.id === turfId) || registeredTurfs[registeredTurfs.length - 1] || null;

  return <div className="player-app registration-page"><header className="app-topbar"><button type="button" className="app-brand" onClick={() => navigate('/')}><span className="brand-mark">VS</span><span>SPORTS PLATFORM</span></button><button type="button" className="text-button" onClick={() => navigate('/login')}>Login</button></header><main className="registration-main container"><div className="registration-heading"><span className="section-kicker">TURF REGISTRATION</span><h1>TURF REGISTERED SUCCESSFULLY</h1><p>Your turf has been successfully registered.</p></div><section className="form-section"><div className="review-grid"><ReviewItem label="Turf Name" value={turf?.turfName || 'Registered turf'} /><ReviewItem label="Owner" value={turf?.ownerName || 'Owner'} /><ReviewItem label="Turf Login Email" value={turf?.turfEmail || turf?.ownerEmail || 'Not available'} /><ReviewItem label="Location" value={turf?.location || turf?.turfAddress?.city || 'Vadodara'} /><ReviewItem label="Sports" value={turf?.sports?.join(' • ') || 'Cricket'} /><ReviewItem label="Status" value={turf?.registrationStatus || 'Registered'} /></div><p className="form-section-note">Use this Turf Login Email with your owner password to access the Turf Owner Dashboard.</p>{turf && <div style={{ marginTop: '26px' }}><button type="button" className="btn btn-primary" onClick={() => navigate(`/turf-owner/dashboard?turfId=${turf.id}`)}>Open Owner Dashboard</button></div>}</section></main></div>;
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const submit = (event) => {
    event?.preventDefault();
    const state = getDemoState();
    const normalizedEmail = email.trim().toLowerCase();
    const player = state.players.find((item) => item.email.toLowerCase() === normalizedEmail && item.password === password);
    const owner = state.owners.find((item) => item.email?.trim().toLowerCase() === normalizedEmail && item.password === password);
    const account = player || owner;
    if (!account) {
      const registeredOwnerEmail = state.owners.some((item) => item.email?.trim().toLowerCase() === normalizedEmail);
      setError(registeredOwnerEmail ? 'The password does not match this turf owner account.' : 'No registered turf owner account found with this email.');
      return;
    }
    const turfId = account.role === 'turf-owner' ? account.turfIds?.[0] : undefined;
    const nextSession = account.role === 'player'
      ? { userId: account.id, role: account.role, email: normalizedEmail }
      : { userId: account.id, ownerId: account.id, turfId, role: 'turf-owner', email: normalizedEmail };
    setSession(nextSession);
    onLogin(nextSession);
    navigate(account.role === 'player' ? '/player/dashboard' : `/turf-owner/dashboard?turfId=${turfId}`);
  };

  return <AuthFrame eyebrow="WELCOME BACK" title="LOGIN TO YOUR GAME." text="Continue to your player account or turf owner workspace."><form className="auth-form" onSubmit={submit}><Field label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required /><Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Enter your demo password" required />{error && <InlineError>{error}</InlineError>}<button type="submit" className="btn btn-primary form-submit">Login</button></form><button type="button" className="demo-hint-toggle" onClick={() => setShowDemo((value) => !value)}>{showDemo ? 'Hide' : 'Show'} demo accounts</button>{showDemo && <div className="demo-hint"><strong>Player</strong><span>dev.player@demo.com / demo123</span><strong>Turf owner</strong><span>united-sports-arena@owner.demo / owner123</span></div>}<p className="auth-footer-note">New here? <button type="button" onClick={() => navigate('/signup')}>Choose registration</button></p></AuthFrame>;
}

function PlayerRegistration({ onCreated }) {
  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const [review, setReview] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const compatibleTurfs = useMemo(() => getAllTurfs().filter((turf) => turf.sports.includes(form.sportId)), [form.sportId]);
  const age = calculateAge(form.dob);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const validate = () => {
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required.';
    if (!form.surname.trim()) next.surname = 'Surname is required.';
    if (!form.dob || !age) next.dob = 'Please enter a valid date of birth.';
    if (!/^\d{10}$/.test(form.mobile.replace(/\s/g, ''))) next.mobile = 'Enter a valid 10-digit Indian mobile number.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Please enter a valid email address.';
    if (form.password.length < 6) next.password = 'Use at least 6 characters for your demo password.';
    if (!form.house.trim()) next.house = 'House or flat is required.';
    if (!form.street.trim()) next.street = 'Street or area is required.';
    if (!/^\d{6}$/.test(form.pincode)) next.pincode = 'Enter a valid 6-digit Indian pincode.';
    if (!form.sportId) next.sportId = 'Please select one sport.';
    if (!form.selectedTurfId) next.selectedTurfId = 'Please select a compatible turf.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (event) => {
    event.preventDefault();
    if (!validate()) {
      setReview(false);
      return;
    }
    const state = getDemoState();
    if (findDuplicatePlayer(state, form)) {
      setErrors({ duplicate: 'A player with this name and date of birth is already registered. Please login instead.' });
      return;
    }
    const duplicateContact = findDuplicateContact(state, form);
    if (duplicateContact) {
      setErrors({ duplicate: duplicateContact.email.toLowerCase() === form.email.trim().toLowerCase() ? 'This email is already registered. Please login instead.' : 'This mobile number is already registered. Please login to continue.' });
      return;
    }
    const player = { id: createId('player'), role: 'player', ...form, mobile: form.mobile.replace(/\s/g, ''), age, city: 'Vadodara', state: 'Gujarat', createdAt: new Date().toISOString() };
    state.players.push(player);
    state.requests.push({ id: createId('request'), type: 'PLAYER_TURF_JOIN', playerId: player.id, turfId: player.selectedTurfId, ownerId: getTurfOwnerId(player.selectedTurfId), sportId: player.sportId, status: 'pending', createdAt: new Date().toISOString(), respondedAt: null });
    saveDemoState(state);
    const nextSession = { userId: player.id, role: 'player' };
    setSession(nextSession);
    onCreated(nextSession);
    navigate('/player/dashboard');
  };

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      update('profileImage', await compressImage(file));
      setPhotoError('');
    } catch {
      setPhotoError('This image could not be processed. Try another file.');
    }
  };

  return <div className="player-app registration-page"><header className="app-topbar"><button type="button" className="app-brand" onClick={() => navigate('/')}><span className="brand-mark">VS</span><span>SPORTS PLATFORM</span></button><button type="button" className="text-button" onClick={() => navigate('/login')}>Already registered? Login</button></header><main className="registration-main container"><div className="registration-heading"><span className="section-kicker">PLAYER REGISTRATION</span><h1>CREATE YOUR PLAYER PROFILE.</h1><p>Tell us a little about yourself and choose the sport you want to play.</p></div><div className="registration-progress">{['Personal', 'Contact', 'Address', 'Sport & Turf', 'Review'].map((label, index) => <span className={step >= index + 1 ? 'active' : ''} key={label}><b>0{index + 1}</b>{label}</span>)}</div><form className="registration-form" onSubmit={submit}><section className="form-section"><FormSectionTitle number="01" title="Personal Information" /><div className="form-grid two"><Field label="First Name" value={form.firstName} onChange={(value) => update('firstName', value)} placeholder="Enter your first name" error={errors.firstName} required /><Field label="Surname" value={form.surname} onChange={(value) => update('surname', value)} placeholder="Enter your surname" error={errors.surname} required /><Field label="Date of Birth" type="date" value={form.dob} onChange={(value) => update('dob', value)} error={errors.dob} required /><Field label="Age" value={age ? `${age} years` : 'Calculated from date of birth'} readOnly /></div></section><section className="form-section"><FormSectionTitle number="02" title="Contact & Address" /><div className="form-grid two"><Field label="Mobile Number" value={form.mobile} onChange={(value) => update('mobile', value)} placeholder="98765 43210" error={errors.mobile} required /><Field label="Email Address" type="email" value={form.email} onChange={(value) => update('email', value)} placeholder="you@example.com" error={errors.email} required /><Field label="Demo Password" type="password" value={form.password} onChange={(value) => update('password', value)} placeholder="At least 6 characters" error={errors.password} required /><Field label="House / Flat / Building" value={form.house} onChange={(value) => update('house', value)} placeholder="House, flat or building" error={errors.house} required /><Field label="Street / Area" value={form.street} onChange={(value) => update('street', value)} placeholder="Street or area" error={errors.street} required /><Field label="Landmark" value={form.landmark} onChange={(value) => update('landmark', value)} placeholder="Optional landmark" /><Field label="City" value="Vadodara" readOnly /><Field label="State" value="Gujarat" readOnly /><Field label="Pincode" value={form.pincode} onChange={(value) => update('pincode', value.replace(/\D/g, '').slice(0, 6))} placeholder="390001" error={errors.pincode} required /></div></section><section className="form-section"><FormSectionTitle number="03" title="Choose Your Sport" /><div className="sport-choice-grid">{sports.map((sport) => <button type="button" className={`sport-choice ${form.sportId === sport.name ? 'selected' : ''}`} key={sport.id} onClick={() => { update('sportId', sport.name); update('selectedTurfId', ''); }}><span>{sport.icon}</span><strong>{sport.name}</strong>{form.sportId === sport.name && <i>Selected</i>}</button>)}</div>{errors.sportId && <InlineError>{errors.sportId}</InlineError>}</section><section className="form-section"><FormSectionTitle number="04" title="Select Your Preferred Turf" /><p className="form-section-note">Only Vadodara turfs supporting {form.sportId || 'your selected sport'} are shown.</p>{form.sportId ? <div className="registration-turf-grid">{compatibleTurfs.map((turf) => <TurfCard turf={turf} selected={form.selectedTurfId === turf.id} onSelect={() => update('selectedTurfId', turf.id)} key={turf.id} selectLabel="Select Turf" />)}</div> : <div className="form-empty">Choose one sport to see compatible Vadodara turfs.</div>}{errors.selectedTurfId && <InlineError>{errors.selectedTurfId}</InlineError>}</section><section className="form-section"><FormSectionTitle number="05" title="Profile Photo" /><div className="photo-upload"><div className="photo-preview">{form.profileImage ? <img src={form.profileImage} alt="Player preview" /> : <span>VS</span>}</div><div><label className="upload-button btn btn-secondary">{form.profileImage ? 'Change Photo' : 'Upload Profile Photo'}<input type="file" accept="image/*" onChange={handlePhoto} /></label>{form.profileImage && <button type="button" className="text-button danger" onClick={() => update('profileImage', '')}>Remove photo</button>}<p>JPG, PNG, WEBP or GIF. Optional.</p>{photoError && <InlineError>{photoError}</InlineError>}</div></div></section>{errors.duplicate && <div className="form-alert">{errors.duplicate}</div>}<div className="registration-actions"><button type="button" className="btn btn-secondary" onClick={() => navigate('/signup')}>Back</button><button type="button" className="btn btn-primary" onClick={() => { if (validate()) { setReview(true); setStep(5); } }}>Review Your Details</button></div></form>{review && <ReviewModal form={form} age={age} onClose={() => setReview(false)} onSubmit={submit} />}</main></div>;
}

function ReviewModal({ form, age, onClose, onSubmit }) {
  const turf = getTurf(form.selectedTurfId);
  return <div className="review-modal-backdrop"><section className="review-modal"><button type="button" className="modal-close" onClick={onClose}>×</button><span className="section-kicker">FINAL CHECK</span><h2>REVIEW YOUR DETAILS.</h2><div className="review-grid"><ReviewItem label="Player" value={`${form.firstName} ${form.surname}`} /><ReviewItem label="Date of Birth" value={formatDate(form.dob)} /><ReviewItem label="Age" value={`${age} years`} /><ReviewItem label="Sport" value={form.sportId} /><ReviewItem label="Mobile" value={form.mobile} /><ReviewItem label="Email" value={form.email} /><ReviewItem label="Address" value={`${form.house}, ${form.street}, Vadodara`} /><ReviewItem label="Selected Turf" value={`${turf?.name || ''} · ${turf?.area || ''}`} /></div><div className="review-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Edit Details</button><button type="button" className="btn btn-primary" onClick={onSubmit}>Create Player Account</button></div></section></div>;
}

function PlayerDashboard({ state, session, refresh, logout }) {
  const player = state.players.find((item) => item.id === session.userId);
  const [turfQuery, setTurfQuery] = useState('');
  if (!player) return <ProtectedMessage role="player" />;
  const playerRequests = state.requests.filter((request) => request.playerId === player.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const currentRequest = playerRequests[0];
  const playerBookings = getBookings().filter((booking) => booking.userId === player.id || booking.email === player.email).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const selectedTurf = getTurf(player.selectedTurfId);
  const matches = state.matches.filter((match) => match.sportId === player.sportId);
  const playerTournaments = tournaments.filter((tournament) => tournament.sport === player.sportId);
  const compatibleTurfs = getAllTurfs().filter((turf) => turf.sports.includes(player.sportId) && [turf.name || turf.turfName, turf.area || turf.location].some((value) => value.toLowerCase().includes(turfQuery.toLowerCase())));

  const sendRequest = (turf) => {
    if (turf.id === player.selectedTurfId && currentRequest?.status === 'pending') return;
    if (currentRequest?.status === 'accepted' && !window.confirm('You are already connected with this turf. Do you want to change your preferred turf?')) return;
    const nextState = getDemoState();
    const oldPending = nextState.requests.find((request) => request.id === currentRequest?.id && request.status === 'pending');
    if (oldPending) oldPending.status = 'cancelled';
    const nextPlayer = nextState.players.find((item) => item.id === player.id);
    nextPlayer.selectedTurfId = turf.id;
    nextState.requests.push({ id: createId('request'), type: 'PLAYER_TURF_JOIN', playerId: player.id, turfId: turf.id, ownerId: getTurfOwnerId(turf.id), sportId: player.sportId, status: 'pending', createdAt: new Date().toISOString(), respondedAt: null });
    saveDemoState(nextState);
    refresh();
    document.querySelector('#my-turf-request')?.scrollIntoView({ behavior: 'smooth' });
  };

  return <PlayerShell player={player} active="Dashboard" logout={logout}><main className="dashboard-main container"><section className="dashboard-welcome"><div><span className="section-kicker">PLAYER HOME / VADODARA</span><h1>Welcome back, {player.firstName}.</h1><p>Ready for your next game?</p></div><img className="dashboard-avatar" src={player.profileImage || ''} alt={player.profileImage ? `${player.firstName} profile` : ''} onError={(event) => { event.currentTarget.style.display = 'none'; }} />{!player.profileImage && <span className="dashboard-avatar fallback">{player.firstName.slice(0, 1)}{player.surname.slice(0, 1)}</span>}</section><section className="dashboard-summary-grid"><article className="player-summary-card"><div className="summary-profile"><span className="large-avatar">{player.firstName.slice(0, 1)}{player.surname.slice(0, 1)}</span><div><h2>{player.firstName} {player.surname}</h2><p>{player.sportId} Player · {player.age} Years</p><span>Vadodara</span></div></div><div className="summary-turf"><span className="section-kicker">SELECTED TURF</span><strong>{selectedTurf?.name || 'Not Selected'}</strong><span>{selectedTurf?.area || 'Choose a turf'}{selectedTurf ? ', Vadodara' : ''}</span></div><div className="summary-request"><span className="section-kicker">REQUEST</span><StatusPill status={currentRequest?.status || 'not selected'} /></div><button type="button" className="link-button" onClick={() => navigate('/player/profile')}>View Profile</button></article><RequestCard request={currentRequest} /></section><section className="dashboard-columns"><section className="dashboard-block"><SectionHeading kicker="UPCOMING MATCHES" title="YOUR NEXT GAMES." /><div className="match-list">{matches.filter((match) => match.status === 'upcoming').length ? matches.filter((match) => match.status === 'upcoming').map((match) => <MatchCard key={match.id} match={match} />) : <EmptyState title="No upcoming matches" text="Your next match will appear here." />}</div></section><section className="dashboard-block"><SectionHeading kicker="LIVE NOW" title="YOUR SPORT, RIGHT NOW." /><div className="match-list">{matches.filter((match) => match.status === 'live').length ? matches.filter((match) => match.status === 'live').map((match) => <MatchCard key={match.id} match={match} />) : <EmptyState title="No live matches right now" text="Your next match will appear here when available." />}</div></section></section><section className="dashboard-block"><SectionHeading kicker={`${player.sportId.toUpperCase()} TOURNAMENTS`} title="OPPORTUNITIES TO COMPETE." /><div className="mini-tournament-grid">{playerTournaments.length ? playerTournaments.map((tournament) => <article className="mini-tournament" key={tournament.id}><img src={tournament.image} alt={`${tournament.sport} tournament`} /><div><span className="section-kicker">{tournament.sport}</span><h3>{tournament.name}</h3><p>{tournament.dateLabel} · {tournament.venueName}</p><button type="button" className="link-button" onClick={() => navigate(`/tournaments/${tournament.id}`)}>View Tournament</button></div></article>) : <EmptyState title="No upcoming tournaments for your selected sport." text="Choose another sport from your profile when your game changes." />}</div></section><section className="dashboard-block" id="find-turf"><div className="find-turf-heading"><SectionHeading kicker="VADODARA TURFS" title="FIND YOUR TURF." /><input className="dashboard-search" value={turfQuery} onChange={(event) => setTurfQuery(event.target.value)} placeholder="Search turf or area..." aria-label="Search turf" /></div><p className="dashboard-subtitle">Showing turfs compatible with {player.sportId}.</p><div className="dashboard-turf-grid">{compatibleTurfs.map((turf) => <TurfCard key={turf.id} turf={turf} selected={turf.id === player.selectedTurfId} requestStatus={playerRequests.find((request) => request.turfId === turf.id)?.status} onSelect={() => sendRequest(turf)} selectLabel={turf.id === player.selectedTurfId ? 'Current Turf' : 'Send Joining Request'} />)}</div></section><section className="dashboard-block request-history"><SectionHeading kicker="MY TURF REQUEST" title="REQUEST HISTORY." />{playerRequests.length ? playerRequests.map((request) => <RequestHistoryItem key={request.id} request={request} />) : <EmptyState title="Choose a turf to send your first joining request." text="Your request history will appear here." />}</section></main></PlayerShell>;
}

function ProfilePage({ state, session, refresh, logout }) {
  const player = state.players.find((item) => item.id === session.userId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(player || {});
  if (!player) return <ProtectedMessage role="player" />;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = () => {
    const nextState = getDemoState();
    const target = nextState.players.find((item) => item.id === player.id);
    Object.assign(target, form, { age: calculateAge(form.dob), city: 'Vadodara', state: 'Gujarat' });
    saveDemoState(nextState);
    setEditing(false);
    refresh();
  };
  return <PlayerShell player={player} active="My Profile" logout={logout}><main className="dashboard-main container"><div className="page-title-row"><div><span className="section-kicker">PLAYER ACCOUNT</span><h1>MY PROFILE.</h1><p>Keep your player details current and connected to the same account.</p></div><button type="button" className="btn btn-primary" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancel Editing' : 'Edit Profile'}</button></div><section className="profile-layout"><article className="profile-card"><div className="profile-avatar-large">{player.profileImage ? <img src={player.profileImage} alt={`${player.firstName} profile`} /> : <span>{player.firstName.slice(0, 1)}{player.surname.slice(0, 1)}</span>}</div><h2>{player.firstName} {player.surname}</h2><p>{player.sportId} Player</p><span className="profile-location">Vadodara, Gujarat</span></article><article className="profile-details">{editing ? <div className="profile-edit-grid"><Field label="First Name" value={form.firstName} onChange={(value) => update('firstName', value)} /><Field label="Surname" value={form.surname} onChange={(value) => update('surname', value)} /><Field label="Date of Birth" type="date" value={form.dob} onChange={(value) => update('dob', value)} /><Field label="Mobile" value={form.mobile} onChange={(value) => update('mobile', value)} /><Field label="Email" value={form.email} onChange={(value) => update('email', value)} /><Field label="House / Flat" value={form.house} onChange={(value) => update('house', value)} /><Field label="Street / Area" value={form.street} onChange={(value) => update('street', value)} /><Field label="Landmark" value={form.landmark} onChange={(value) => update('landmark', value)} /><Field label="Pincode" value={form.pincode} onChange={(value) => update('pincode', value)} /></div> : <><DetailGroup title="Personal Information"><DetailLine label="Name" value={`${player.firstName} ${player.surname}`} /><DetailLine label="Date of Birth" value={formatDate(player.dob)} /><DetailLine label="Age" value={`${player.age} years`} /></DetailGroup><DetailGroup title="Contact"><DetailLine label="Mobile" value={player.mobile} /><DetailLine label="Email" value={player.email} /></DetailGroup><DetailGroup title="Address"><DetailLine label="Address" value={`${player.house}, ${player.street}${player.landmark ? `, ${player.landmark}` : ''}`} /><DetailLine label="City / State" value={`${player.city}, ${player.state}`} /><DetailLine label="Pincode" value={player.pincode} /></DetailGroup><DetailGroup title="Sport & Turf"><DetailLine label="Selected Sport" value={player.sportId} /><DetailLine label="Selected Turf" value={getTurf(player.selectedTurfId)?.name || 'Not selected'} /></DetailGroup><DetailGroup title="Account"><DetailLine label="Registered" value={new Date(player.createdAt).toLocaleDateString('en-IN')} /></DetailGroup></>}{editing && <button type="button" className="btn btn-primary" onClick={save}>Save Profile</button>}</article></section></main></PlayerShell>;
}

function PlayerBookingStatuses({ bookings }) {
  return <section className="dashboard-block player-bookings"><SectionHeading kicker="MY BOOKINGS" title="YOUR TURF RESERVATIONS." />{bookings.length ? <div className="owner-record-list">{bookings.map((booking) => <article className="owner-record" key={booking.bookingId}><div><h3>{booking.turfName}</h3><p>{booking.game} · {formatDate(booking.bookingDate)} · {booking.fromTime} to {booking.toTime}</p><small>{booking.bookingId}</small></div><StatusPill status={booking.bookingStatus} /></article>)}</div> : <EmptyState title="No bookings yet" text="Your turf reservations will appear here." />}</section>;
}

function OwnerDashboard({ state, session, refresh, logout }) {
  const owner = state.owners.find((item) => item.id === session.userId);
  const ownerTurf = turfs.find((turf) => owner?.turfIds.includes(turf.id));
  const requests = state.requests.filter((request) => request.ownerId === owner?.id && request.turfId === ownerTurf?.id);
  const respond = (requestId, status) => {
    const nextState = getDemoState();
    const request = nextState.requests.find((item) => item.id === requestId && item.ownerId === owner.id && item.turfId === ownerTurf.id);
    if (!request) return;
    request.status = status;
    request.respondedAt = new Date().toISOString();
    saveDemoState(nextState);
    refresh();
  };
  if (!owner || !ownerTurf) return <ProtectedMessage role="turf owner" />;
  return <div className="player-app owner-page"><AppTopbar label="TURF OWNER WORKSPACE" onLogout={logout} /><main className="dashboard-main container"><div className="page-title-row"><div><span className="section-kicker">SPECIFIC TURF OWNER</span><h1>{ownerTurf.name}.</h1><p>Review joining requests for {ownerTurf.area}, Vadodara.</p></div><div className="owner-badge">OWNER VIEW</div></div><section className="owner-venue-banner"><img src={ownerTurf.image} alt={ownerTurf.name} /><div><span className="section-kicker">YOUR VENUE</span><h2>{ownerTurf.name}</h2><p>{ownerTurf.area}, Vadodara · {ownerTurf.sports.join(' · ')}</p></div></section><section className="dashboard-block owner-requests"><SectionHeading kicker="PLAYER REQUESTS" title="WHO WANTS TO PLAY HERE." />{requests.length ? requests.map((request) => <OwnerRequest key={request.id} request={request} player={state.players.find((item) => item.id === request.playerId)} turf={ownerTurf} onRespond={respond} />) : <EmptyState title="No joining requests yet" text="Requests for this specific turf will appear here." />}</section></main></div>;
}

function OwnerRequest({ request, player, turf, onRespond }) {
  if (!player) return null;
  return <article className="owner-request"><div className="large-avatar">{player.firstName.slice(0, 1)}{player.surname.slice(0, 1)}</div><div className="owner-request-main"><span className="section-kicker">PLAYER REQUEST</span><h3>{player.firstName} {player.surname}</h3><p>{player.age} years · {player.sportId} · Registered {new Date(player.createdAt).toLocaleDateString('en-IN')}</p><span>{turf.name} · {turf.area}</span></div><div className="owner-request-actions"><StatusPill status={request.status} />{request.status === 'pending' && <><button type="button" className="btn btn-primary" onClick={() => onRespond(request.id, 'accepted')}>Accept</button><button type="button" className="btn btn-secondary" onClick={() => onRespond(request.id, 'rejected')}>Reject</button></>}</div></article>;
}

function PlayerShell({ player, active, logout, children }) {
  const [open, setOpen] = useState(false);
  return <div className="player-app dashboard-app"><AppTopbar player={player} onLogout={logout} onMenu={() => setOpen((value) => !value)} /><div className={`dashboard-frame ${open ? 'nav-open' : ''}`}><aside className="dashboard-sidebar"><div className="sidebar-profile"><span className="large-avatar">{player.firstName.slice(0, 1)}{player.surname.slice(0, 1)}</span><strong>{player.firstName} {player.surname}</strong><span>{player.sportId} Player</span></div><nav>{appNav.map((item) => <button type="button" className={active === item.label ? 'active' : ''} onClick={() => navigate(item.href.split('#')[0])} key={item.label}>{item.label}</button>)}</nav><button type="button" className="sidebar-logout" onClick={logout}>Logout</button></aside><div className="dashboard-content">{children}</div></div></div>;
}

function AppTopbar({ player, label = 'PLAYER HOME', onLogout, onMenu }) {
  return <header className="app-topbar dashboard-topbar"><button type="button" className="app-brand" onClick={() => navigate(player ? '/player/dashboard' : '/turf-owner/dashboard')}><span className="brand-mark">VS</span><span>{label}</span></button><div className="dashboard-top-actions">{player && <span className="topbar-user">{player.firstName} {player.surname}</span>}<button type="button" className="mobile-dashboard-menu" onClick={onMenu} aria-label="Toggle dashboard navigation">☰</button><button type="button" className="text-button" onClick={onLogout}>Logout</button></div></header>;
}

function RequestCard({ request }) {
  const turf = request ? getTurf(request.turfId) : null;
  const bookings = request ? getBookings().filter((booking) => booking.userId === request.playerId || booking.turfId === request.turfId) : [];
  return <article className="request-card" id="my-turf-request"><span className="section-kicker">MY TURF REQUEST</span><h2>{turf?.name || 'No turf selected'}</h2><p>{turf ? `${turf.area}, Vadodara` : 'Choose a compatible turf to send your first request.'}</p>{request ? <><div className="request-card-row"><span>{request.sportId}</span><StatusPill status={request.status} /></div><small>Request sent {new Date(request.createdAt).toLocaleDateString('en-IN')}</small>{bookings.length > 0 && <div className="player-booking-statuses"><span className="section-kicker">BOOKING STATUS</span>{bookings.slice(0, 2).map((booking) => <div className="request-card-row" key={booking.bookingId}><span>{booking.game} · {formatDate(booking.bookingDate)}</span><StatusPill status={booking.bookingStatus} /></div>)}</div>}</> : <small>Select a turf below to get started.</small>}</article>;
}

function MatchCard({ match }) {
  const tournament = getTournament(match.tournamentId);
  const turf = getTurf(match.turfId);
  return <article className={`match-card ${match.status === 'live' ? 'live' : ''}`}><div className="match-card-top"><span className="sport-chip">{match.sportId}</span>{match.status === 'live' ? <StatusPill status="live" /> : <span>{match.date}</span>}</div><h3>{tournament?.name}</h3><div className="match-teams"><strong>{match.teams[0]}</strong><span>VS</span><strong>{match.teams[1]}</strong></div><p>{match.status === 'live' ? match.phase : `${match.time} · ${turf?.name || 'Vadodara'}`}</p></article>;
}

function TurfCard({ turf, selected, requestStatus, onSelect, selectLabel }) {
  const disabled = selected && requestStatus === 'pending';
  const selectedLabel = requestStatus === 'accepted' ? 'Approved' : requestStatus === 'rejected' ? 'Request Rejected' : requestStatus === 'pending' ? 'Request Pending' : 'Selected';
  return <article className={`dashboard-turf-card ${selected ? 'selected' : ''}`}><img src={turf.image} alt={turf.name} loading="lazy" /><div className="dashboard-turf-copy"><h3>{turf.name}</h3><p>{turf.area}, Vadodara</p><span>{turf.sports.join(' · ')}</span><small>{turf.facilities?.slice(0, 2).join(' · ')}{turf.openingHours ? ` · ${turf.openingHours}` : ''}</small><button type="button" className={`btn ${selected ? 'btn-secondary' : 'btn-primary'}`} onClick={onSelect} disabled={disabled}>{selected ? selectedLabel : selectLabel}</button></div></article>;
}

function RequestHistoryItem({ request }) {
  const turf = getTurf(request.turfId);
  return <article className="request-history-item"><div><strong>{turf?.name}</strong><span>{request.sportId} · {turf?.area}, Vadodara</span></div><div><small>{new Date(request.createdAt).toLocaleDateString('en-IN')}</small><StatusPill status={request.status} /></div></article>;
}

function SectionHeading({ kicker, title }) { return <div className="dashboard-section-heading"><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>; }
function FormSectionTitle({ number, title }) { return <div className="form-section-title"><span>{number}</span><h2>{title}</h2></div>; }
function ReviewItem({ label, value }) { return <div><span>{label}</span><strong>{value || 'Not provided'}</strong></div>; }
function DetailGroup({ title, children }) { return <section className="detail-group"><h3>{title}</h3>{children}</section>; }
function DetailLine({ label, value }) { return <div className="detail-line"><span>{label}</span><strong>{value}</strong></div>; }
function StatusPill({ status }) { return <span className={`status-pill status-${String(status).replaceAll(' ', '-')}`}>{status}</span>; }
function EmptyState({ title, text }) { return <div className="dashboard-empty"><strong>{title}</strong><span>{text}</span></div>; }
function InlineError({ children }) { return <span className="inline-error">{children}</span>; }
function ProtectedMessage({ role }) { return <AuthFrame eyebrow="ACCOUNT ACCESS" title="PLEASE LOGIN TO CONTINUE." text={`This area is available to your ${role} account.`}><button type="button" className="btn btn-primary form-submit" onClick={() => navigate('/login')}>Go to Login</button></AuthFrame>; }
function Field({ label, type = 'text', value = '', onChange = () => {}, placeholder = '', error, required = false, readOnly = false }) { const ownerEmailField = placeholder === 'owner@domain.com'; return <>{<label className="form-field"><span>{label}{required && <b>*</b>}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} readOnly={readOnly} required={required} />{error && <InlineError>{error}</InlineError>}</label>}{ownerEmailField && <><label className="form-field"><span>Password<b>*</b></span><input name="turf-owner-password" type="password" placeholder="Create a password" required /></label><label className="form-field"><span>Confirm Password<b>*</b></span><input name="turf-owner-confirm-password" type="password" placeholder="Re-enter your password" required /></label></>}</>; }

export default PlayerApp;
