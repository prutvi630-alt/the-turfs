import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { API_URL, apiRequest } from './config/api';
import { normalizePath, route } from './config/routes';
import { sports, turfs } from './data/homeData';
import { getAllTournaments, isTournamentInterestActive } from './data/dashboardSelectors';
import { getPlayerInterestedTournamentIds } from './data/tournamentInterest';
import { maskBankAccountNumber, normalizeStaffBankDetails } from './data/staffBankDetails';
import GlobalHeader from './GlobalHeader';
import Footer from './Footer';
import ConnectedOwnerDashboard from './OwnerDashboard';
import PlayerTeams from './PlayerTeams';
import AdminIcon from './admin/AdminIcon';
import AdminLogin from './admin/AdminLogin';
import AdminPage from './admin/AdminPage';
import { ACTIVITY_TYPES, recordActivity } from './data/activityStore';
import {
  authenticateUser,
  calculateAge,
  checkAdminAccess,
  createDemoStaffRegistration,
  createDemoStaffApplication,
  createDemoPlayerRegistration,
  createId,
  dashboardPathForRole,
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
  updateStaffBankDetails,
  LOGIN_ROLES,
  ROLES,
} from './data/demoStore';
import { Toast } from './admin/AdminUI';

const appNav = [
  { label: 'Dashboard', href: '/player/dashboard' },
  { label: 'My Teams', href: '/player/dashboard#player-teams' },
  { label: 'My Profile', href: '/player/profile' },
  { label: 'Find Turf', href: '/player/dashboard#find-turf' },
  { label: 'Tournaments', href: '/tournaments' },
];

const blankForm = {
  firstName: '', surname: '', dob: '', mobile: '', email: '', password: '',
  house: '', street: '', landmark: '', pincode: '', sports: [], sportIds: [], selectedTurfIds: [], profileImage: '',
};

const getPlayerGames = (player) => {
  const values = [player?.sports, player?.games, player?.sportIds].find((items) => Array.isArray(items) && items.length)
    || [player?.sportId];
  return [...new Set(values.filter(Boolean).map((value) => {
    const game = sports.find((item) => item.id === value || item.name.toLowerCase() === String(value).toLowerCase());
    return game?.name || String(value);
  }))];
};

const getPlayerTurfIds = (player) => [...new Set(
  (Array.isArray(player?.selectedTurfIds) && player.selectedTurfIds.length
    ? player.selectedTurfIds
    : [player?.selectedTurfId]).filter(Boolean),
)];

const turfSupportsSport = (turf, sportName) => (turf?.sports || []).some(
  (name) => String(name).toLowerCase() === String(sportName).toLowerCase(),
);

const getGameTurfSelections = (sportNames, turfIds) => sportNames.flatMap((sportName) => {
  const sport = sports.find((item) => item.name === sportName);
  return turfIds
    .map((turfId) => getTurf(turfId))
    .filter((turf) => turf && turfSupportsSport(turf, sportName))
    .map((turf) => ({ sportId: sport?.id || sportName, sportName, turfId: turf.id }));
});

const CLIFT_PLAYER_KEY = 'cliftPlayer';
const CLIFT_PLAYER_LOGGED_IN_KEY = 'cliftPlayerLoggedIn';
const CLIFT_TURF_OWNER_KEY = 'cliftTurfOwner';
const CLIFT_TURF_OWNER_LOGGED_IN_KEY = 'cliftTurfOwnerLoggedIn';

const isBackendConfigured = () => Boolean(API_URL) && !API_URL.includes('PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE');

const sanitizeSessionProfile = (profile) => {
  if (!profile || typeof profile !== 'object') return null;
  const nextProfile = { ...profile };
  delete nextProfile.password;
  delete nextProfile.confirmPassword;
  return nextProfile;
};

const readStoredProfile = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const applySuccessfulSession = (nextSession, role, profile) => {
  const sanitizedProfile = sanitizeSessionProfile(profile);
  if (role === ROLES.PLAYER) {
    localStorage.setItem(CLIFT_PLAYER_KEY, JSON.stringify(sanitizedProfile || profile || {}));
    localStorage.setItem(CLIFT_PLAYER_LOGGED_IN_KEY, 'true');
    localStorage.removeItem(CLIFT_TURF_OWNER_KEY);
    localStorage.removeItem(CLIFT_TURF_OWNER_LOGGED_IN_KEY);
  }

  if (role === ROLES.TURF_OWNER) {
    localStorage.setItem(CLIFT_TURF_OWNER_KEY, JSON.stringify(sanitizedProfile || profile || {}));
    localStorage.setItem(CLIFT_TURF_OWNER_LOGGED_IN_KEY, 'true');
    localStorage.removeItem(CLIFT_PLAYER_KEY);
    localStorage.removeItem(CLIFT_PLAYER_LOGGED_IN_KEY);
  }

  return nextSession;
};

const buildSessionFromProfile = (profile, role = ROLES.PLAYER) => {
  if (!profile || typeof profile !== 'object') return null;

  const email = String(profile.email || profile.userEmail || '').trim().toLowerCase();
  const userId = profile.id || profile.userId || profile.playerId || profile.ownerId || (email ? email : null);

  if (!userId || !email) return null;

  return {
    userId,
    role,
    email,
    issuedAt: profile.issuedAt || new Date().toISOString(),
  };
};

const resolvePlayerForSession = (state, session) => {
  if (!state || !session) return null;
  const sessionEmail = String(session.email || '').trim().toLowerCase();
  return (state.players || []).find((player) => (
    player.id === session.userId
    || String(player.email || '').trim().toLowerCase() === sessionEmail
    || String(player.email || '').trim().toLowerCase() === String(session.userId || '').trim().toLowerCase()
  )) || null;
};

const navigate = (href) => {
  window.location.href = route(href);
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
  const path = normalizePath();
  const [state, setState] = useState(getDemoState);
  const [session, setCurrentSession] = useState(() => {
    const storedSession = getSession();
    if (storedSession) return storedSession;

    const profile = readStoredProfile(CLIFT_PLAYER_KEY);
    return buildSessionFromProfile(profile, ROLES.PLAYER);
  });
  const refresh = () => setState(getDemoState());
  const logout = () => {
    setSession(null);
    setCurrentSession(null);
    localStorage.removeItem(CLIFT_PLAYER_KEY);
    localStorage.removeItem(CLIFT_PLAYER_LOGGED_IN_KEY);
    localStorage.removeItem(CLIFT_TURF_OWNER_KEY);
    localStorage.removeItem(CLIFT_TURF_OWNER_LOGGED_IN_KEY);
    navigate('/login');
  };

  if (path === '/signup') return <SignupPage />;
  if (path === '/scorer/register') return <StaffRegistration role={ROLES.SCORER} />;
  if (path === '/coach/register') return <StaffRegistration role={ROLES.COACH} />;
  if (path === '/player/register') return <PlayerRegistration onCreated={(nextSession) => { setCurrentSession(nextSession); refresh(); }} />;
  if (path === '/turf-owner/register') return <TurfOwnerRegistration />;
  if (path === '/turf-owner/success') return <TurfRegistrationSuccess />;
  if (path === '/login') return <LoginPage onLogin={(nextSession) => { setCurrentSession(nextSession); refresh(); }} />;
  if (path.startsWith('/turf-owner')) {
    if (!session || session.role !== ROLES.TURF_OWNER) return <AccessDenied session={session} />;
    return <ConnectedOwnerDashboard state={state} session={session} refresh={refresh} logout={logout} />;
  }
  if (path.startsWith('/scorer') || path.startsWith('/coach')) {
    const role = path.startsWith('/scorer') ? ROLES.SCORER : ROLES.COACH;
    if (!session || session.role !== role) return <ProtectedMessage role={role === ROLES.COACH ? 'coach' : 'scorer'} />;
    const profile = (role === ROLES.COACH ? state.coaches : state.scorers).find((account) => account.id === session.userId);
    if (!profile) return <ProtectedMessage role={role === ROLES.COACH ? 'coach' : 'scorer'} />;
    return <StaffProfilePage profile={profile} onLogout={logout} refresh={refresh} />;
  }
  // Admin portal: a dedicated login entry point plus the protected shell.
  // Protection is decided by the session role via checkAdminAccess, so a Player
  // or Turf Owner hitting any /admin/* URL is rejected even if they navigate
  // there directly. Guests (no session) are sent to the admin login.
  if (path.startsWith('/admin')) {
    if (path === '/admin/login') {
      const access = checkAdminAccess(session);
      if (access.allowed) {
        navigate(dashboardPathForRole(ROLES.ADMIN));
        return null;
      }
      return <AdminLogin onLogin={(nextSession) => { setCurrentSession(nextSession); refresh(); }} />;
    }
    const access = checkAdminAccess(session);
    if (!access.allowed) {
      if (access.reason === 'guest') {
        navigate('/admin/login');
        return null;
      }
      return <AccessDenied session={session} />;
    }
    const admin = (state.admins || []).find((item) => item.id === session.userId);
    return <AdminPage admin={admin} state={state} logout={logout} />;
  }
  if (path === '/player/profile') {
    if (!session || session.role !== ROLES.PLAYER) return <AccessDenied session={session} />;
    return <ProfilePage state={state} session={session} refresh={refresh} logout={logout} />;
  }
  if (path === '/player/dashboard' || path.startsWith('/player/')) {
    if (!session || session.role !== ROLES.PLAYER) return <AccessDenied session={session} />;
    return <PlayerDashboard state={state} session={session} refresh={refresh} logout={logout} />;
  }
  return <LoginPage onLogin={(nextSession) => { setCurrentSession(nextSession); refresh(); }} />;
}

export function LoginModalHost() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const openModal = () => {
      triggerRef.current = document.activeElement;
      setIsOpen(true);
    };
    window.addEventListener('clift:open-login-modal', openModal);
    return () => window.removeEventListener('clift:open-login-modal', openModal);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const scrollY = window.scrollY;
    const bodyStyle = document.body.style;
    const previousStyles = {
      position: bodyStyle.position,
      top: bodyStyle.top,
      left: bodyStyle.left,
      right: bodyStyle.right,
      width: bodyStyle.width,
      overflow: bodyStyle.overflow,
    };
    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.left = '0';
    bodyStyle.right = '0';
    bodyStyle.width = '100%';
    bodyStyle.overflow = 'hidden';

    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    closeButtonRef.current?.focus?.({ preventScroll: true });

    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      Object.assign(bodyStyle, previousStyles);
      window.scrollTo({ left: 0, top: scrollY, behavior: 'instant' });
      triggerRef.current?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="login-modal-backdrop" onClick={(event) => {
      if (event.target === event.currentTarget) setIsOpen(false);
    }}>
      <section className="login-modal-dialog" role="dialog" aria-modal="true" aria-label="Log in">
        <button ref={closeButtonRef} type="button" className="login-modal-close" onClick={() => setIsOpen(false)} aria-label="Close login">×</button>
        <div className="login-modal-scroll">
          <LoginPage isModal onLogin={() => setIsOpen(false)} />
        </div>
      </section>
    </div>
  );
}

// Cross-role access: a signed-in user hitting another role's protected URL is
// redirected to their own authorized dashboard; guests are sent to login.
function AccessDenied({ session }) {
  useEffect(() => {
    if (!session) return undefined;
    const ownDashboard = dashboardPathForRole(session.role);
    const timer = window.setTimeout(() => navigate(ownDashboard), 2200);
    return () => window.clearTimeout(timer);
  }, [session]);

  if (session) {
    return (
      <div className="player-app"><GlobalHeader /><div className="access-denied container"><span className="section-kicker">ACCESS DENIED</span><h1>This area is not available for your account.</h1><p>You are signed in as a {session.role.split('-').join(' ')}. Redirecting you to your own dashboard...</p><button type="button" className="btn btn-primary" onClick={() => navigate(dashboardPathForRole(session.role))}>Go to my dashboard</button></div><Footer /></div>
    );
  }
  return <ProtectedMessage role="member" />;
}

function AuthFrame({ children, eyebrow, title, text, isModal = false }) {
  const pageContent = <><div className="auth-visual"><div className="auth-visual-copy"><span className="eyebrow">VADODARA SPORTS PLATFORM</span><strong>YOUR GAME.<br />YOUR PLACE.</strong><span>Discover. Connect. Compete.</span></div></div><main className="auth-panel"><div className="auth-heading"><span className="section-kicker">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{children}</main></>;

  if (isModal) return <div className="auth-page login-modal-page">{pageContent}</div>;

  return <div className="player-app"><GlobalHeader /><div className="auth-page">{pageContent}</div><Footer /></div>;
}

function SignupPage() {
  const [showTypes, setShowTypes] = useState(false);
  const [registrationType, setRegistrationType] = useState('');
  const routes = {
    player: '/player/register',
    turf: '/turf-owner/register',
    scorer: '/scorer/register',
    coach: '/coach/register',
  };

  return (
    <AuthFrame eyebrow="JOIN THE PLATFORM" title="REGISTER TO THE PLATFORM." text="Choose your registration type to continue.">
      {!showTypes ? (
        <button type="button" className="btn btn-primary form-submit" onClick={() => setShowTypes(true)}>Register</button>
      ) : (
        <div className="auth-form">
          <label className="form-field">
            <span>Registration Type</span>
            <ResponsiveSelect
              value={registrationType}
              placeholder="Select Type Of Register Type"
              ariaLabel="Registration type"
              options={[
                { value: 'player', label: 'Player' },
                { value: 'turf', label: 'Turf' },
                { value: 'scorer', label: 'Scorer' },
                { value: 'coach', label: 'Coach' },
              ]}
              onChange={(selectedType) => {
                setRegistrationType(selectedType);
                if (routes[selectedType]) navigate(routes[selectedType]);
              }}
            />
          </label>
        </div>
      )}
      <p className="auth-footer-note">Already part of the platform? <button type="button" onClick={() => navigate('/login')}>Login here</button></p>
    </AuthFrame>
  );
}

function ResponsiveSelect({ value, options, onChange, placeholder, ariaLabel }) {
  const id = useId().replace(/:/g, '');
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  const closeMenu = (restoreFocus = false) => {
    setIsOpen(false);
    setPosition(null);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  };

  const openMenu = (direction = 0) => {
    const nextIndex = selectedIndex >= 0
      ? (selectedIndex + direction + options.length) % options.length
      : direction < 0 ? options.length - 1 : 0;
    setActiveIndex(nextIndex);
    setPosition(null);
    setIsOpen(true);
  };

  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportPadding = 8;
      const gap = 6;
      const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
      const left = Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - width - viewportPadding));
      const desiredHeight = Math.min(options.length * 48 + 10, 260);
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - gap - viewportPadding);
      const spaceAbove = Math.max(0, rect.top - gap - viewportPadding);
      const opensUp = spaceBelow < desiredHeight && spaceAbove >= spaceBelow * 0.9;
      const availableHeight = opensUp ? spaceAbove : spaceBelow;
      const height = Math.min(desiredHeight, availableHeight);
      const top = opensUp ? rect.top - gap - height : rect.bottom + gap;

      setPosition({ top: Math.max(viewportPadding, top), left, width, height });
    };

    updatePosition();
    const focusFrame = window.requestAnimationFrame(() => optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' }));
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [activeIndex, isOpen, options.length]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOutside = (event) => {
      if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      closeMenu();
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeMenu(true);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const moveActive = (index) => {
    const nextIndex = Math.max(0, Math.min(index, options.length - 1));
    setActiveIndex(nextIndex);
    window.requestAnimationFrame(() => optionRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' }));
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (isOpen) moveActive((activeIndex + direction + options.length) % options.length);
      else openMenu(direction);
    } else if (isOpen && event.key === 'Home') {
      event.preventDefault();
      moveActive(0);
    } else if (isOpen && event.key === 'End') {
      event.preventDefault();
      moveActive(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isOpen) {
        onChange(options[activeIndex].value);
        closeMenu(true);
      }
      else openMenu();
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === 'Tab' && isOpen) {
      closeMenu();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={`${id}-trigger`}
        type="button"
        className="responsive-select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={isOpen ? `${id}-option-${activeIndex}` : undefined}
        onClick={() => (isOpen ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={selectedOption ? '' : 'is-placeholder'}>{selectedOption?.label || placeholder}</span>
        <span className={`responsive-select-chevron ${isOpen ? 'is-open' : ''}`} aria-hidden="true" />
      </button>
      {isOpen && position && createPortal(
        <div
          ref={menuRef}
          id={`${id}-listbox`}
          className="responsive-select-menu"
          role="listbox"
          aria-label={ariaLabel}
          style={{ top: position.top, left: position.left, width: position.width, height: position.height }}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              ref={(element) => { optionRefs.current[index] = element; }}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`responsive-select-option ${option.value === value ? 'is-selected' : ''} ${index === activeIndex ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => { onChange(option.value); closeMenu(true); }}
            >
              {option.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function StaffRegistration({ role }) {
  const isCoach = role === ROLES.COACH;
  const roleLabel = isCoach ? 'Coach' : 'Scorer';
  const sportPrompt = isCoach ? 'Which Game/Sport do you coach?' : 'Which Game/Sport do you score?';
  const [form, setForm] = useState({
    fullName: '', mobile: '', email: '', address: '', experience: '', sports: [], password: '', confirmPassword: '',
    bankDetails: { bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', mobileNumber: '' },
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const toggleSport = (sportName) => setForm((current) => {
    const selected = current.sports || [];
    return {
      ...current,
      sports: selected.includes(sportName)
        ? selected.filter((item) => item !== sportName)
        : [...selected, sportName],
    };
  });

  const validate = () => {
    const next = {};
    const selectedSports = Array.isArray(form.sports) ? form.sports.filter(Boolean) : [];
    if (!form.fullName.trim()) next.fullName = 'Full name is required.';
    if (!/^\d{10}$/.test(form.mobile.replace(/\D/g, ''))) next.mobile = 'Enter a valid 10-digit mobile number.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.address.trim()) next.address = 'Address is required.';
    if (form.experience === '' || !Number.isFinite(Number(form.experience)) || Number(form.experience) < 0) next.experience = 'Enter valid years of experience.';
    if (!selectedSports.length) next.sport = 'Select at least one game or sport.';
    if (form.password.length < 6) next.password = 'Password must be at least 6 characters.';
    if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match.';
    const bankValidation = normalizeStaffBankDetails(form.bankDetails);
    Object.assign(next, bankValidation.errors);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (isSubmitting || !validate()) return;
    setIsSubmitting(true);

    const state = getDemoState();
    const registration = createDemoStaffRegistration(state, { ...form, sport: form.sports[0] || '' }, role);
    if (!registration.ok) {
      setErrors({ form: registration.error });
      setIsSubmitting(false);
      return;
    }

    if (isBackendConfigured()) {
      try {
        const action = isCoach ? 'registerCoach' : 'registerScorer';
        const result = await apiRequest({
          action,
          registrationType: role,
          role,
          name: form.fullName.trim(),
          fullName: form.fullName.trim(),
          mobile: form.mobile.replace(/\D/g, ''),
          email: form.email.trim().toLowerCase(),
          address: form.address.trim(),
          experience: Number(form.experience),
          sport: form.sports[0] || '',
          sports: form.sports,
          bankDetails: registration.profile.bankDetails,
          password: form.password,
        }, { timeoutMs: 5000 });

        if (result?.success) {
          const remoteProfile = result.profile || result.coach || result.scorer || result.user || {};
          const previousProfileId = registration.profile.id;
          const remoteProfileId = remoteProfile.id || remoteProfile.userId || previousProfileId;
          registration.profile.id = remoteProfileId;
          const collection = isCoach ? state.coaches : state.scorers;
          const storedProfile = collection.find((account) => account.id === previousProfileId);
          if (storedProfile) storedProfile.id = remoteProfileId;
          registration.session.userId = registration.profile.id;
        }
      } catch {
        // The configured script may not expose these new role actions yet; keep
        // the existing local demo registration path available in that case.
      }
    }

    if (!saveDemoState(state)) {
      setErrors({ form: 'Unable to save your registration. Please try again.' });
      setIsSubmitting(false);
      return;
    }

    setSession(registration.session);
    setIsSubmitting(false);
    navigate(dashboardPathForRole(role));
  };

  return (
    <div className="player-app registration-page">
      <GlobalHeader />
      <main className="registration-main container">
        <div className="registration-heading"><span className="section-kicker">{roleLabel.toUpperCase()} REGISTRATION</span><h1>REGISTER AS A {roleLabel.toUpperCase()}.</h1><p>Create your {roleLabel.toLowerCase()} profile to join the Vadodara sports community.</p></div>
        <form className="registration-form" onSubmit={submit} noValidate>
          {errors.form && <div className="form-alert" role="alert">{errors.form}</div>}
          <section className="form-section">
            <FormSectionTitle number="01" title={`${roleLabel} Information`} />
            <div className="form-grid two">
              <Field label="Full Name" value={form.fullName} onChange={(value) => update('fullName', value)} placeholder="Enter your full name" error={errors.fullName} required />
              <Field label="Mobile Number" value={form.mobile} onChange={(value) => update('mobile', value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" error={errors.mobile} required />
              <Field label="Email Address" type="email" value={form.email} onChange={(value) => update('email', value)} placeholder="you@example.com" error={errors.email} required />
              <Field label="Years of Experience" type="number" value={form.experience} onChange={(value) => update('experience', value)} placeholder="e.g. 3" error={errors.experience} required />
              <Field label="Address" value={form.address} onChange={(value) => update('address', value)} placeholder="Enter your address" error={errors.address} required />
              <Field label="Password" type="password" value={form.password} onChange={(value) => update('password', value)} placeholder="At least 6 characters" error={errors.password} required />
              <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={(value) => update('confirmPassword', value)} placeholder="Re-enter your password" error={errors.confirmPassword} required />
            </div>
          </section>

          <section className="form-section">
            <FormSectionTitle number="02" title="Game / Sport Selection" />
            <p className="form-section-note">Select all the games you {isCoach ? 'coach' : 'score'}.</p>
            <div className="sport-choice-grid">
              {['Cricket', 'Football', 'Pickleball', 'Tennis', 'Badminton', 'Volleyball'].map((sportName) => (
                <button type="button" key={sportName} className={`sport-choice ${form.sports.includes(sportName) ? 'selected' : ''}`} onClick={() => toggleSport(sportName)}>
                  <span>{sportName === 'Cricket' ? '🏏' : sportName === 'Football' ? '⚽' : sportName === 'Pickleball' ? '🏓' : sportName === 'Tennis' ? '🎾' : sportName === 'Badminton' ? '🏸' : '🏐'}</span>
                  <strong>{sportName}</strong>
                  <i>{form.sports.includes(sportName) ? 'Selected' : 'Available'}</i>
                </button>
              ))}
            </div>
            {errors.sport && <small className="inline-error">{errors.sport}</small>}
          </section>

          <section className="form-section">
            <FormSectionTitle number="03" title="Bank Details" />
            <div className="form-grid two">
              <Field label="Bank Name" value={form.bankDetails.bankName} onChange={(value) => update('bankDetails', { ...form.bankDetails, bankName: value })} placeholder="Enter bank name" error={errors.bankName} required />
              <Field label="Account Holder Name" value={form.bankDetails.accountHolderName} onChange={(value) => update('bankDetails', { ...form.bankDetails, accountHolderName: value })} placeholder="Name on bank account" error={errors.accountHolderName} required />
              <Field label="Bank Account Number" value={form.bankDetails.accountNumber} onChange={(value) => update('bankDetails', { ...form.bankDetails, accountNumber: value.replace(/\D/g, '').slice(0, 18) })} placeholder="9–18 digits" error={errors.accountNumber} required inputMode="numeric" maxLength={18} />
              <Field label="IFSC Code" value={form.bankDetails.ifscCode} onChange={(value) => update('bankDetails', { ...form.bankDetails, ifscCode: value.replace(/[^a-z\d]/gi, '').toUpperCase().slice(0, 11) })} placeholder="e.g. SBIN0001234" error={errors.ifscCode} required maxLength={11} />
              <Field label="Bank Mobile Number" value={form.bankDetails.mobileNumber} onChange={(value) => update('bankDetails', { ...form.bankDetails, mobileNumber: value.replace(/\D/g, '').slice(0, 10) })} placeholder="10-digit Indian mobile" error={errors.mobileNumber} required inputMode="numeric" maxLength={10} />
            </div>
          </section>

          <div className="registration-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/signup')}>Back</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'REGISTERING...' : `Register as ${roleLabel}`}</button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}

function StaffProfilePage({ profile, onLogout, refresh }) {
  const roleLabel = profile.role === ROLES.COACH ? 'Coach' : 'Scorer';
  const [notice, setNotice] = useState('');
  const [bankEditorOpen, setBankEditorOpen] = useState(false);
  const [bankForm, setBankForm] = useState(() => ({
    bankName: profile.bankDetails?.bankName || '',
    accountHolderName: profile.bankDetails?.accountHolderName || '',
    accountNumber: profile.bankDetails?.accountNumber || '',
    ifscCode: profile.bankDetails?.ifscCode || '',
    mobileNumber: profile.bankDetails?.mobileNumber || '',
  }));
  const [bankErrors, setBankErrors] = useState({});
  const [bankToast, setBankToast] = useState(null);
  const [isSavingBankDetails, setIsSavingBankDetails] = useState(false);

  const sportMatches = Array.isArray(profile.sports) && profile.sports.length
    ? profile.sports
    : [profile.sport].filter(Boolean);

  const tournaments = useMemo(() => getAllTournaments().filter((tournament) => {
    if (!sportMatches.length) return true;
    return sportMatches.some((sport) => String(tournament.sport).toLowerCase() === String(sport).toLowerCase());
  }), [sportMatches]);

  const [applications, setApplications] = useState(() => (
    (getDemoState().staffApplications || []).filter((item) => item.applicantId === profile.id)
  ));

  const handleApply = (tournament) => {
    const state = getDemoState();
    const duplicate = (state.staffApplications || []).some((item) => (
      item.applicantId === profile.id && item.tournamentId === tournament.id && item.role === profile.role
    ));
    if (duplicate) {
      setApplications((state.staffApplications || []).filter((item) => item.applicantId === profile.id));
      setNotice('You have already applied for this tournament.');
      return;
    }

    const created = createDemoStaffApplication(state, {
      applicantId: profile.id,
      role: profile.role,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      sport: tournament.sport,
      note: `${roleLabel} application for ${tournament.name}`,
    });
    if (!saveDemoState(state)) {
      setNotice('Unable to save your application. Please try again.');
      return;
    }
    setApplications(state.staffApplications.filter((item) => item.applicantId === profile.id));
    setNotice(`Application submitted for ${created.tournamentName}.`);
  };

  const openBankEditor = () => {
    setBankForm({
      bankName: profile.bankDetails?.bankName || '',
      accountHolderName: profile.bankDetails?.accountHolderName || '',
      accountNumber: profile.bankDetails?.accountNumber || '',
      ifscCode: profile.bankDetails?.ifscCode || '',
      mobileNumber: profile.bankDetails?.mobileNumber || '',
    });
    setBankErrors({});
    setBankEditorOpen(true);
  };

  const saveBankDetails = (event) => {
    event.preventDefault();
    if (isSavingBankDetails) return;
    const normalized = normalizeStaffBankDetails(bankForm);
    setBankErrors(normalized.errors);
    if (!normalized.valid) return;

    setIsSavingBankDetails(true);
    const state = getDemoState();
    const result = updateStaffBankDetails(state, profile.id, profile.role, normalized.bankDetails);
    if (!result.ok || !saveDemoState(state)) {
      setBankToast({
        tone: 'danger',
        title: 'Unable to update bank details',
        text: 'Unable to update bank details. Please try again.',
      });
      setIsSavingBankDetails(false);
      return;
    }

    setBankForm(normalized.bankDetails);
    setBankEditorOpen(false);
    setBankToast({ tone: 'success', title: 'Bank details updated successfully.' });
    setIsSavingBankDetails(false);
    refresh();
  };

  return (
    <div className="player-app registration-page">
      <GlobalHeader />
      <main className="registration-main container">
        <div className="registration-heading"><span className="section-kicker">ACCOUNT DETAILS</span><h1>YOUR {roleLabel.toUpperCase()} WORKSPACE.</h1><p>Your {roleLabel.toLowerCase()} account is ready.</p></div>
        <section className="form-section staff-profile-section">
          <FormSectionTitle number="01" title={`${roleLabel} Information`} />
          <div className="review-grid">
            <ReviewItem label="Name" value={profile.name} />
            <ReviewItem label="Mobile" value={profile.mobile} />
            <ReviewItem label="Email" value={profile.email} />
            <ReviewItem label="Address" value={profile.address} />
            <ReviewItem label="Experience" value={`${profile.experience} years`} />
            <ReviewItem label="Game/Sport" value={(Array.isArray(profile.sports) && profile.sports.length ? profile.sports.join(', ') : profile.sport) || '—'} />
            <ReviewItem label="Registration Type" value={roleLabel} />
          </div>
          <button type="button" className="btn btn-secondary staff-profile-logout" onClick={onLogout}>Logout</button>
        </section>

        <section className="form-section staff-profile-section">
          <div className="staff-bank-heading">
            <FormSectionTitle number="02" title="Bank Details" />
            <button type="button" className="btn btn-secondary" onClick={openBankEditor}>
              {profile.bankDetails?.accountNumber ? 'Edit Bank Details' : 'Add Bank Details'}
            </button>
          </div>
          {profile.bankDetails?.accountNumber ? (
            <div className="review-grid staff-bank-details">
              <ReviewItem label="Account Holder Name" value={profile.bankDetails.accountHolderName} />
              <ReviewItem label="Bank Name" value={profile.bankDetails.bankName} />
              <ReviewItem label="Account Number" value={maskBankAccountNumber(profile.bankDetails.accountNumber)} />
              <ReviewItem label="IFSC Code" value={profile.bankDetails.ifscCode} />
              <ReviewItem label="Bank Mobile Number" value={profile.bankDetails.mobileNumber} />
            </div>
          ) : <p className="form-section-note">Bank details not added yet.</p>}
        </section>

        <section className="form-section staff-profile-section">
          <FormSectionTitle number="03" title="Tournament applications" />
          {notice && <div className="form-alert" role="alert">{notice}</div>}
          <div className="staff-tournament-grid">
            {tournaments.length ? tournaments.map((tournament) => {
              const application = applications.find((item) => (
                item.tournamentId === tournament.id && item.applicantId === profile.id && item.role === profile.role
              ));
              const image = tournament.image || tournament.coverImage || tournament.posterImage;
              return (
                <article key={tournament.id} className="staff-tournament-card">
                  {image
                    ? <img className="staff-tournament-image" src={image} alt={`${tournament.name} tournament`} />
                    : <div className="staff-tournament-image staff-tournament-image-fallback" aria-hidden="true" />}
                  <div className="staff-tournament-card-content">
                    <span className="section-kicker">{tournament.sport || 'General'}</span>
                    <h3>{tournament.name}</h3>
                    <div className="staff-tournament-card-footer">
                      <span className={`status-pill status-${application?.status || 'available'}`}>
                        {application?.status || 'Not applied'}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary staff-tournament-apply"
                        onClick={() => handleApply(tournament)}
                        disabled={Boolean(application)}
                      >
                        Select Tournament for {roleLabel}
                      </button>
                    </div>
                  </div>
                </article>
              );
            }) : <p className="admin-cell-muted">No tournaments are currently available for your selected sports.</p>}
          </div>
        </section>
      </main>
      {bankEditorOpen && (
        <div className="review-modal-backdrop">
          <section className="review-modal staff-bank-modal" role="dialog" aria-modal="true" aria-labelledby="staff-bank-title">
            <button type="button" className="modal-close" onClick={() => setBankEditorOpen(false)} aria-label="Close bank details">×</button>
            <span className="section-kicker">{roleLabel.toUpperCase()} PROFILE</span>
            <h2 id="staff-bank-title">{profile.bankDetails?.accountNumber ? 'UPDATE BANK DETAILS' : 'ADD BANK DETAILS'}</h2>
            <form className="form-grid two" onSubmit={saveBankDetails} noValidate>
              <Field label="Bank Name" value={bankForm.bankName} onChange={(value) => setBankForm((current) => ({ ...current, bankName: value }))} placeholder="Enter bank name" error={bankErrors.bankName} required />
              <Field label="Account Holder Name" value={bankForm.accountHolderName} onChange={(value) => setBankForm((current) => ({ ...current, accountHolderName: value }))} placeholder="Name on bank account" error={bankErrors.accountHolderName} required />
              <Field label="Bank Account Number" value={bankForm.accountNumber} onChange={(value) => setBankForm((current) => ({ ...current, accountNumber: value.replace(/\D/g, '').slice(0, 18) }))} placeholder="9–18 digits" error={bankErrors.accountNumber} required inputMode="numeric" maxLength={18} />
              <Field label="IFSC Code" value={bankForm.ifscCode} onChange={(value) => setBankForm((current) => ({ ...current, ifscCode: value.replace(/[^a-z\d]/gi, '').toUpperCase().slice(0, 11) }))} placeholder="e.g. SBIN0001234" error={bankErrors.ifscCode} required maxLength={11} />
              <Field label="Bank Mobile Number" value={bankForm.mobileNumber} onChange={(value) => setBankForm((current) => ({ ...current, mobileNumber: value.replace(/\D/g, '').slice(0, 10) }))} placeholder="10-digit Indian mobile" error={bankErrors.mobileNumber} required inputMode="numeric" maxLength={10} />
              <div className="staff-bank-form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setBankEditorOpen(false)} disabled={isSavingBankDetails}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSavingBankDetails}>{isSavingBankDetails ? 'SAVING...' : 'Save Changes'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
      <Toast toast={bankToast} onDismiss={() => setBankToast(null)} />
      <Footer />
    </div>
  );
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

  const registerTurf = async () => {
    const registerDemoTurf = () => {
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
        && String(turf.turfAddress?.city || turf.area || '').toLowerCase() === String(form.turfCity || 'vadodara').toLowerCase()
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
        price: 'â‚¹550 / hour',
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
        role: ROLES.TURF_OWNER,
        name: turfRecord.ownerName,
        email: turfLoginEmail,
        turfEmail: turfLoginEmail,
        mobile: turfRecord.ownerMobile,
        password,
        turfIds: [turfId],
        createdAt: turfRecord.createdAt,
      });
      recordActivity({
        state,
        type: ACTIVITY_TYPES.TURF_ADDED,
        actorRole: ROLES.TURF_OWNER,
        actorName: turfRecord.ownerName,
        message: `New turf added: ${turfRecord.turfName}`,
        targetPath: '/admin/turfs',
        meta: { turfId },
      });
      saveDemoState(state);
      setSession({ userId: ownerId, role: ROLES.TURF_OWNER, email: turfLoginEmail, turfId, issuedAt: new Date().toISOString() });
      navigate(`/turf-owner/dashboard?turfId=${turfId}`);
    };

    if (!isBackendConfigured()) return registerDemoTurf();

    try {
      const password = document.querySelector('input[name="turf-owner-password"]')?.value || '';
      const confirmPassword = document.querySelector('input[name="turf-owner-confirm-password"]')?.value || '';
      if (!password || !confirmPassword || password !== confirmPassword) {
        setErrors({ duplicate: 'Password and confirm password do not match.' });
        setReview(false);
        return;
      }

      const payload = {
        action: 'registerTurfOwner',
        ownerName: form.ownerName.trim(),
        ownerMobile: form.ownerMobile.replace(/\s/g, ''),
        ownerEmail: form.ownerEmail.trim(),
        password,
        confirmPassword,
        alternateMobile: form.alternateMobile.trim(),
        profilePhoto: form.profilePhoto || '',
        ownerHouse: form.ownerHouse.trim(),
        ownerStreet: form.ownerStreet.trim(),
        ownerCity: form.ownerCity.trim(),
        ownerState: form.ownerState.trim(),
        ownerPincode: form.ownerPincode,
        turfName: form.turfName.trim(),
        turfDescription: form.turfDescription.trim(),
        turfType: form.turfType,
        turfLength: form.turfLength,
        turfWidth: form.turfWidth,
        turfSizeUnit: form.turfSizeUnit,
        playingAreas: form.playingAreas,
        sports: Array.isArray(form.sports) ? form.sports : [],
        facilities: Array.isArray(form.facilities) ? form.facilities : [],
        openingHours: form.openingHours,
        turfHouse: form.turfHouse.trim(),
        turfStreet: form.turfStreet.trim(),
        turfArea: form.turfArea.trim(),
        turfCity: form.turfCity.trim(),
        turfState: form.turfState.trim(),
        turfPincode: form.turfPincode,
        locationLabel: form.locationLabel.trim(),
        turfImages: Array.isArray(form.turfImages) ? form.turfImages : [],
        primaryImage: form.primaryImage || '',
        contactNumber: form.contactNumber.replace(/\s/g, ''),
        turfEmail: (form.turfEmail || form.ownerEmail).trim(),
        bookingInstructions: form.bookingInstructions.trim(),
        rules: form.rules.trim(),
      };

      const result = await apiRequest(payload, { timeoutMs: 5000 });
      if (!result?.success) {
        return registerDemoTurf();
      }

      const profile = sanitizeSessionProfile(result.owner || result.user || payload);
      if (profile && profile.ownerEmail) {
        localStorage.setItem(CLIFT_TURF_OWNER_KEY, JSON.stringify(profile));
        localStorage.setItem(CLIFT_TURF_OWNER_LOGGED_IN_KEY, 'true');
      }

      alert('Turf Owner registered successfully.');
      navigate('/login');
    } catch {
      registerDemoTurf();
    }
  };

  return <div className="player-app registration-page"><GlobalHeader /><main className="registration-main container"><div className="registration-heading"><span className="section-kicker">TURF REGISTRATION</span><h1>REGISTER YOUR TURF.</h1><p>Share the owner details and turf information needed to list your venue on the platform.</p></div><form className="registration-form" onSubmit={submit}>{errors.duplicate && <div className="form-alert">{errors.duplicate}</div>}<section className="form-section"><FormSectionTitle number="01" title="Owner Information" /><div className="form-grid two"><Field label="Full Name" value={form.ownerName} onChange={(value) => setField('ownerName', value)} placeholder="Owner's full name" error={errors.ownerName} required /><Field label="Mobile Number" value={form.ownerMobile} onChange={(value) => setField('ownerMobile', value)} placeholder="98765 43210" error={errors.ownerMobile} required /><Field label="Email Address" type="email" value={form.ownerEmail} onChange={(value) => setField('ownerEmail', value)} placeholder="owner@domain.com" error={errors.ownerEmail} required /><Field label="Alternate Contact Number" value={form.alternateMobile} onChange={(value) => setField('alternateMobile', value)} placeholder="Optional" error={errors.alternateMobile} /><div className="form-field photo-field" style={{ gridColumn: '1 / -1' }}><span>Profile Photo <b>*</b></span><div className="photo-upload"><div className="photo-preview">{form.profilePhoto ? <img src={form.profilePhoto} alt="Owner profile preview" /> : 'OP'}</div><label className="btn btn-secondary upload-button">Upload Photo<input type="file" accept="image/*" onChange={handlePhoto} /></label></div>{errors.profilePhoto && <small className="inline-error">{errors.profilePhoto}</small>}</div></div><div className="form-grid two" style={{ marginTop: '18px' }}><Field label="House / Building / Shop Number" value={form.ownerHouse} onChange={(value) => setField('ownerHouse', value)} placeholder="12 / B-14" error={errors.ownerHouse} required /><Field label="Street / Area" value={form.ownerStreet} onChange={(value) => setField('ownerStreet', value)} placeholder="Alkapuri, Vadodara" error={errors.ownerStreet} required /><Field label="City" value={form.ownerCity} onChange={(value) => setField('ownerCity', value)} placeholder="Vadodara" error={errors.ownerCity} required /><Field label="State" value={form.ownerState} onChange={(value) => setField('ownerState', value)} placeholder="Gujarat" required /><Field label="Pincode" value={form.ownerPincode} onChange={(value) => setField('ownerPincode', value)} placeholder="390001" error={errors.ownerPincode} required /></div></section><section className="form-section"><FormSectionTitle number="02" title="Turf Details" /><div className="form-grid two"><Field label="Turf Name" value={form.turfName} onChange={(value) => setField('turfName', value)} placeholder="ABC Sports Arena" error={errors.turfName} required /><Field label="Turf Type" value={form.turfType} onChange={(value) => setField('turfType', value)} placeholder="Football / Cricket / Multi-sport" /></div><Field label="Turf Description" value={form.turfDescription} onChange={(value) => setField('turfDescription', value)} placeholder="Describe your turf" error={errors.turfDescription} required /><div className="form-grid two" style={{ marginTop: '18px' }}><Field label="Length" value={form.turfLength} onChange={(value) => setField('turfLength', value)} placeholder="120" /><Field label="Width" value={form.turfWidth} onChange={(value) => setField('turfWidth', value)} placeholder="80" /><Field label="Total Size / Area" value={form.playingAreas} onChange={(value) => setField('playingAreas', value)} placeholder="2 courts / 9600 sq ft" /><Field label="Unit" value={form.turfSizeUnit} onChange={(value) => setField('turfSizeUnit', value)} placeholder="ft" /></div>{errors.turfSize && <small className="inline-error">{errors.turfSize}</small>}</section><section className="form-section"><FormSectionTitle number="03" title="Sports / Games Available" /><p className="form-section-note">Select all the sports that can be played on this turf.</p><div className="sport-choice-grid">{['Cricket', 'Football', 'Pickleball', 'Tennis', 'Badminton'].map((sport) => <button type="button" key={sport} className={`sport-choice ${form.sports.includes(sport) ? 'selected' : ''}`} onClick={() => toggleSelection('sports', sport)}><span>{sport === 'Cricket' ? '\u{1F3CF}' : sport === 'Football' ? '\u26BD' : sport === 'Pickleball' ? '\u{1F3D3}' : sport === 'Tennis' ? '\u{1F3BE}' : '\u{1F3F8}'}</span><strong>{sport}</strong><i>{form.sports.includes(sport) ? 'Selected' : 'Available'}</i></button>)}</div>{errors.sports && <small className="inline-error">{errors.sports}</small>}</section><section className="form-section"><FormSectionTitle number="04" title="Facilities / Amenities" /><div className="sport-choice-grid">{['Parking', 'Washroom', 'Changing Room', 'Drinking Water', 'Flood Lights', 'Seating Area', 'Equipment', 'Cafe', 'Other'].map((facility) => <button type="button" key={facility} className={`sport-choice ${form.facilities.includes(facility) ? 'selected' : ''}`} onClick={() => toggleSelection('facilities', facility)}><span>{facility === 'Parking' ? '\u{1F17F}\uFE0F' : facility === 'Washroom' ? '\u{1F6BB}' : facility === 'Changing Room' ? '\u{1F455}' : facility === 'Drinking Water' ? '\u{1F4A7}' : facility === 'Flood Lights' ? '\u{1F4A1}' : facility === 'Seating Area' ? '\u{1FA91}' : facility === 'Equipment' ? '\u2699\uFE0F' : facility === 'Cafe' ? '\u2615' : '\u2728'}</span><strong>{facility}</strong><i>{form.facilities.includes(facility) ? 'Included' : 'Optional'}</i></button>)}</div></section><section className="form-section"><FormSectionTitle number="05" title="Opening Hours" /><div className="form-grid two">{openingDays.map((day) => <div key={day} className="form-field" style={{ display: 'grid', gap: '12px' }}><span>{day}</span><div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><button type="button" className={`btn ${form.openingHours[day].open ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleOpeningToggle(day)}>{form.openingHours[day].open ? 'Open' : 'Closed'}</button>{form.openingHours[day].open && <><input type="time" value={form.openingHours[day].from} onChange={(event) => updateOpeningTime(day, 'from', event.target.value)} /><input type="time" value={form.openingHours[day].to} onChange={(event) => updateOpeningTime(day, 'to', event.target.value)} /></>}</div></div>)}</div>{errors.openingHours && <small className="inline-error">{errors.openingHours}</small>}</section><section className="form-section"><FormSectionTitle number="06" title="Turf Location & Address" /><div className="form-grid two"><Field label="House / Building / Plot" value={form.turfHouse} onChange={(value) => setField('turfHouse', value)} placeholder="Plot 12" error={errors.turfHouse} required /><Field label="Street / Road" value={form.turfStreet} onChange={(value) => setField('turfStreet', value)} placeholder="Near Ring Road" error={errors.turfStreet} required /><Field label="Area / Locality" value={form.turfArea} onChange={(value) => setField('turfArea', value)} placeholder="Alkapuri" /><Field label="City" value={form.turfCity} onChange={(value) => setField('turfCity', value)} placeholder="Vadodara" error={errors.turfCity} required /><Field label="State" value={form.turfState} onChange={(value) => setField('turfState', value)} placeholder="Gujarat" /><Field label="Pincode" value={form.turfPincode} onChange={(value) => setField('turfPincode', value)} placeholder="390001" error={errors.turfPincode} required /><Field label="Location" value={form.locationLabel} onChange={(value) => setField('locationLabel', value)} placeholder="Near Alkapuri, Vadodara" style={{ gridColumn: '1 / -1' }} /></div></section><section className="form-section"><FormSectionTitle number="07" title="Turf Images" /><div className="photo-upload"><div className="photo-preview" style={{ borderRadius: '18px', width: '140px', height: '90px' }}>{form.primaryImage ? <img src={form.primaryImage} alt="Primary turf preview" /> : 'Turf'}</div><label className="btn btn-secondary upload-button">Upload Turf Images<input type="file" accept="image/*" multiple onChange={handleTurfImages} /></label></div>{form.turfImages.length > 0 && <div className="form-grid two" style={{ marginTop: '18px' }}>{form.turfImages.slice(0, 6).map((image, index) => <div key={`${image}-${index}`} className="photo-preview" style={{ width: '100%', height: '120px', borderRadius: '12px' }}><img src={image} alt={`Turf image ${index + 1}`} /></div>)}</div>}{errors.primaryImage && <small className="inline-error">{errors.primaryImage}</small>}</section><section className="form-section"><FormSectionTitle number="08" title="Additional Turf Information" /><div className="form-grid two"><Field label="Contact Number for Turf" value={form.contactNumber || form.ownerMobile} onChange={(value) => setField('contactNumber', value)} placeholder="98765 43210" error={errors.contactNumber} /><Field label="Turf Email" type="email" value={form.turfEmail || form.ownerEmail} onChange={(value) => setField('turfEmail', value)} error={errors.turfEmail} placeholder="hello@turf.com" /><Field label="Booking Instructions" value={form.bookingInstructions} onChange={(value) => setField('bookingInstructions', value)} placeholder="Optional booking guidance for customers" style={{ gridColumn: '1 / -1' }} /><Field label="Rules / Restrictions" value={form.rules} onChange={(value) => setField('rules', value)} placeholder="No outside food, shoes only, etc." style={{ gridColumn: '1 / -1' }} /></div></section><div className="registration-actions"><button type="button" className="btn btn-secondary" onClick={() => navigate('/signup')}>Back</button><button type="submit" className="btn btn-primary">Review Registration</button></div></form>{review && <TurfReviewModal form={form} onClose={() => setReview(false)} onConfirm={registerTurf} />}</main><Footer /></div>;
}

function TurfReviewModal({ form, onClose, onConfirm }) {
  return <div className="review-modal-backdrop"><section className="review-modal"><button type="button" className="modal-close" onClick={onClose}>×</button><span className="section-kicker">REVIEW TURF REGISTRATION</span><h2>FINAL CHECK</h2><div className="review-grid"><ReviewItem label="Owner Name" value={form.ownerName} /><ReviewItem label="Mobile" value={form.ownerMobile} /><ReviewItem label="Email" value={form.ownerEmail} /><ReviewItem label="Owner Address" value={`${form.ownerHouse}, ${form.ownerStreet}, ${form.ownerCity}, ${form.ownerState}`} /><ReviewItem label="Turf Name" value={form.turfName} /><ReviewItem label="Description" value={form.turfDescription} /><ReviewItem label="Sport(s)" value={form.sports.join(' â€¢ ')} /><ReviewItem label="Facilities" value={form.facilities.join(' â€¢ ')} /><ReviewItem label="Opening Hours" value={formatOpeningHours(form.openingHours)} /><ReviewItem label="Turf Address" value={`${form.turfHouse}, ${form.turfStreet}, ${form.turfArea || form.turfCity}, ${form.turfCity}`} /><ReviewItem label="Contact" value={form.contactNumber || form.ownerMobile} /><ReviewItem label="Primary Image" value={form.primaryImage ? 'Uploaded' : 'Not uploaded'} /></div><div className="review-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Edit</button><button type="button" className="btn btn-primary" onClick={onConfirm}>Register Turf</button></div></section></div>;
}

function TurfRegistrationSuccess() {
  const turfId = new URLSearchParams(window.location.search).get('id');
  const registeredTurfs = getDemoState().registeredTurfs || [];
  const turf = registeredTurfs.find((item) => item.id === turfId) || registeredTurfs[registeredTurfs.length - 1] || null;

  return <div className="player-app registration-page"><GlobalHeader /><main className="registration-main container"><div className="registration-heading"><span className="section-kicker">TURF REGISTRATION</span><h1>TURF REGISTERED SUCCESSFULLY</h1><p>Your turf has been successfully registered.</p></div><section className="form-section"><div className="review-grid"><ReviewItem label="Turf Name" value={turf?.turfName || 'Registered turf'} /><ReviewItem label="Owner" value={turf?.ownerName || 'Owner'} /><ReviewItem label="Turf Login Email" value={turf?.turfEmail || turf?.ownerEmail || 'Not available'} /><ReviewItem label="Location" value={turf?.location || turf?.turfAddress?.city || 'Vadodara'} /><ReviewItem label="Sports" value={turf?.sports?.join(' â€¢ ') || 'Cricket'} /><ReviewItem label="Status" value={turf?.registrationStatus || 'Registered'} /></div><p className="form-section-note">Use this Turf Login Email with your owner password to access the Turf Owner Dashboard.</p>{turf && <div style={{ marginTop: '26px' }}><button type="button" className="btn btn-primary" onClick={() => navigate(`/turf-owner/dashboard?turfId=${turf.id}`)}>Open Owner Dashboard</button></div>}</section></main><Footer /></div>;
}

function LoginPage({ onLogin, isModal = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(ROLES.PLAYER);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectAfterLogin = (nextSession) => {
    const pendingTeamRegistration = (() => {
      try {
        const value = JSON.parse(sessionStorage.getItem('cliftPendingTournamentRegistration') || 'null');
        return Date.now() - Number(value?.createdAt || 0) < 30 * 60 * 1000 ? value : null;
      } catch {
        return null;
      }
    })();
    const pendingInterest = (() => {
      try {
        if (!('sessionStorage' in globalThis)) return null;
        return JSON.parse(sessionStorage.getItem('cliftPendingInterest') || 'null');
      } catch {
        return null;
      }
    })();

    if (nextSession.role === ROLES.PLAYER && pendingTeamRegistration?.returnPath) {
      navigate(pendingTeamRegistration.returnPath);
      return;
    }

    if (nextSession.role === ROLES.PLAYER && pendingInterest?.returnPath) {
      navigate(pendingInterest.returnPath);
      return;
    }

    if ('sessionStorage' in globalThis) sessionStorage.removeItem('cliftPendingInterest');
    navigate(dashboardPathForRole(nextSession.role));
  };

  const submit = async (event) => {
    event?.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (!role) {
      setError('Please select the account type you want to log in as.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const localDemoResult = authenticateUser(role, normalizedEmail, password);
      if (localDemoResult.ok) {
        const nextSession = localDemoResult.session;
        applySuccessfulSession(nextSession, role, { ...nextSession, email: normalizedEmail });
        setSession(nextSession);
        onLogin(nextSession);
        setIsSubmitting(false);
        redirectAfterLogin(nextSession);
        return;
      }

      if (!isBackendConfigured()) {
        setError(localDemoResult.error);
        setIsSubmitting(false);
        return;
      }

      const loginActions = {
        [ROLES.PLAYER]: 'loginPlayer',
        [ROLES.TURF_OWNER]: 'loginTurfOwner',
        [ROLES.SCORER]: 'loginScorer',
        [ROLES.COACH]: 'loginCoach',
        [ROLES.ADMIN]: 'loginAdmin',
      };
      const action = loginActions[role];
      const result = await apiRequest({ action, email: normalizedEmail, password });

      if (!result?.success) {
        const fallback = authenticateUser(role, normalizedEmail, password);
        if (fallback.ok) {
          const nextSession = fallback.session;
          applySuccessfulSession(nextSession, role, { ...nextSession, email: normalizedEmail });
          setSession(nextSession);
          onLogin(nextSession);
          setIsSubmitting(false);
          redirectAfterLogin(nextSession);
          return;
        }
        const unsupportedAction = /^invalid action:/i.test(String(result?.message || ''));
        setError(unsupportedAction ? fallback.error : (result?.message || fallback.error || 'Invalid email or password.'));
        setIsSubmitting(false);
        return;
      }

      const profile = sanitizeSessionProfile(result.player || result.owner || result.user || null);
      if (!profile) {
        setError('Login succeeded, but the user profile was not returned by the backend.');
        setIsSubmitting(false);
        return;
      }

      const nextSession = {
        userId: profile.id || profile.userId || profile.playerId || profile.ownerId || profile.email || normalizedEmail,
        role,
        email: profile.email || normalizedEmail,
        issuedAt: new Date().toISOString(),
      };

      applySuccessfulSession(nextSession, role, profile);
      setSession(nextSession);
      onLogin(nextSession);
      setIsSubmitting(false);
      redirectAfterLogin(nextSession);
    } catch (error) {
      const fallback = authenticateUser(role, normalizedEmail, password);
      if (fallback.ok) {
        const nextSession = fallback.session;
        applySuccessfulSession(nextSession, role, { ...nextSession, email: normalizedEmail });
        setSession(nextSession);
        onLogin(nextSession);
        setIsSubmitting(false);
        redirectAfterLogin(nextSession);
        return;
      }
      const errorMessage = String(error?.message || '');
      const unsupportedAction = /^invalid action:/i.test(errorMessage);
      setError(unsupportedAction ? fallback.error : (errorMessage || fallback.error || 'Unable to connect to the backend. Please try again.'));
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFrame eyebrow="WELCOME BACK" title="LOGIN TO YOUR GAME." text="Sign in with your player, turf owner, coach, scorer or admin account." isModal={isModal}>
      <form className="auth-form" onSubmit={submit}>
        <label className="form-field">
          <span>Login As<b>*</b></span>
          <ResponsiveSelect
            value={role}
            options={LOGIN_ROLES}
            onChange={setRole}
            ariaLabel="Login as account type"
          />
        </label>

        <Field
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />

        <label className="form-field">
          <span>Password<b>*</b></span>
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              aria-label="Password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {error && <InlineError aria-live="polite">{error}</InlineError>}
        </label>

        <button type="submit" className="btn btn-primary form-submit" disabled={isSubmitting}>
          {isSubmitting ? 'LOGGING IN...' : 'LOG IN'}
        </button>
      </form>

      <p className="auth-footer-note">New here? <button type="button" onClick={() => navigate('/signup')}>Choose registration</button></p>
    </AuthFrame>
  );
}

function PlayerRegistration({ onCreated }) {
  const [form, setForm] = useState(blankForm);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const [review, setReview] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [turfSearch, setTurfSearch] = useState('');
  const submissionLock = useRef(false);

  const compatibleTurfs = useMemo(() => getAllTurfs().filter((turf) => (
    form.selectedTurfIds.includes(turf.id)
    || form.sports.some((sportName) => turfSupportsSport(turf, sportName))
  )), [form.selectedTurfIds, form.sports]);
  const searchedTurfs = compatibleTurfs.filter((turf) => (
    String(turf.name || '').toLowerCase().includes(turfSearch.trim().toLowerCase())
  ));
  const age = calculateAge(form.dob);
  const redirectAfterPlayerRegistration = (nextSession) => {
    const pending = (() => {
      try {
        return JSON.parse(sessionStorage.getItem('cliftPendingInterest') || 'null');
      } catch {
        return null;
      }
    })();
    const pendingTeamRegistration = (() => {
      try {
        const value = JSON.parse(sessionStorage.getItem('cliftPendingTournamentRegistration') || 'null');
        return Date.now() - Number(value?.createdAt || 0) < 30 * 60 * 1000 ? value : null;
      } catch {
        return null;
      }
    })();

    if (pendingTeamRegistration?.returnPath && nextSession.role === ROLES.PLAYER) {
      navigate(pendingTeamRegistration.returnPath);
      return;
    }

    if (pending?.returnPath && nextSession.role === ROLES.PLAYER) {
      navigate(pending.returnPath);
      return;
    }

    sessionStorage.removeItem('cliftPendingInterest');
    navigate('/player/dashboard');
  };
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleGame = (sportName) => setForm((current) => {
    const selected = current.sports.includes(sportName)
      ? current.sports.filter((name) => name !== sportName)
      : [...current.sports, sportName];
    return {
      ...current,
      sports: selected,
      sportIds: selected.map((name) => sports.find((sport) => sport.name === name)?.id).filter(Boolean),
      sportId: selected[0] || '',
    };
  });
  const toggleTurf = (turfId) => setForm((current) => {
    const selected = current.selectedTurfIds.includes(turfId)
      ? current.selectedTurfIds.filter((id) => id !== turfId)
      : [...current.selectedTurfIds, turfId];
    return { ...current, selectedTurfIds: selected, selectedTurfId: selected[0] || '' };
  });

  const handleReviewSubmit = async () => {
    setReview(false);
    await submit({ preventDefault: () => {} });
  };

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
    if (!form.sports.length) next.sportId = 'Please select at least one game.';
    if (!form.selectedTurfIds.length) next.selectedTurfId = 'Please select at least one compatible turf.';
    const selectedTurfs = form.selectedTurfIds.map((turfId) => getTurf(turfId));
    const selections = getGameTurfSelections(form.sports, form.selectedTurfIds);
    if (form.sports.some((sportName) => !sports.some((sport) => sport.name === sportName))) {
      next.sportId = 'Select games from the available game list.';
    }
    if (form.selectedTurfIds.some((turfId, index) => !selectedTurfs[index])) {
      next.selectedTurfId = 'Select turfs from the available turf list.';
    } else if (form.sports.length && form.selectedTurfIds.length && (
      form.sports.some((sportName) => !selections.some((selection) => selection.sportName === sportName))
      || form.selectedTurfIds.some((turfId) => !selections.some((selection) => selection.turfId === turfId))
    )) {
      next.selectedTurfId = 'Each selected game and turf must have a supported combination.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submissionLock.current) return;
    if (!validate()) {
      setReview(false);
      return;
    }

    submissionLock.current = true;
    try {
      const selectedGames = [...form.sports];
      const selectedTurfIds = [...form.selectedTurfIds];
      const gameTurfSelections = getGameTurfSelections(selectedGames, selectedTurfIds);

      const finalizeLocalRegistration = (state, fallbackResult) => {
        if (!fallbackResult.ok) {
          setErrors({ duplicate: fallbackResult.error || 'Unable to register the player.' });
          return false;
        }

        recordActivity({
          state,
          type: ACTIVITY_TYPES.PLAYER_REGISTERED,
          actorRole: ROLES.PLAYER,
          actorName: `${fallbackResult.player.firstName} ${fallbackResult.player.surname}`.trim(),
          message: `New player registered: ${`${fallbackResult.player.firstName} ${fallbackResult.player.surname}`.trim()}`,
          targetPath: '/admin/players',
          meta: { playerId: fallbackResult.player.id },
        });

        if (!saveDemoState(state)) {
          setErrors({ duplicate: 'Unable to save your registration. Please try again.' });
          return false;
        }

        setSession(fallbackResult.session);
        applySuccessfulSession(fallbackResult.session, ROLES.PLAYER, fallbackResult.player);
        onCreated?.(fallbackResult.session);
        redirectAfterPlayerRegistration(fallbackResult.session);
        return true;
      };

      if (!isBackendConfigured()) {
        const state = getDemoState();
        const result = createDemoPlayerRegistration(state, {
          ...form,
          age,
          sports: selectedGames,
          selectedTurfIds,
          gameTurfSelections,
          mobile: form.mobile.replace(/\s/g, ''),
        });

        if (finalizeLocalRegistration(state, result)) {
          return;
        }
        return;
      }

    try {
      const payload = {
        action: 'registerPlayer',
        firstName: form.firstName.trim(),
        surname: form.surname.trim(),
        dob: form.dob,
        age: String(age || ''),
        mobile: form.mobile.replace(/\s/g, ''),
        email: form.email.trim(),
        password: form.password,
        house: form.house.trim(),
        street: form.street.trim(),
        landmark: form.landmark.trim(),
        pincode: form.pincode,
        sportId: selectedGames[0],
        sports: selectedGames,
        games: selectedGames,
        sportIds: selectedGames.map((name) => sports.find((sport) => sport.name === name)?.id).filter(Boolean),
        selectedTurfId: selectedTurfIds[0],
        selectedTurfIds,
        gameTurfSelections,
        profileImage: form.profileImage || '',
      };

      const result = await apiRequest(payload);
      if (!result?.success) {
        const fallbackState = getDemoState();
        const fallback = createDemoPlayerRegistration(fallbackState, {
          ...form,
          age,
          sports: selectedGames,
          selectedTurfIds,
          gameTurfSelections,
          mobile: form.mobile.replace(/\s/g, ''),
        });
        if (finalizeLocalRegistration(fallbackState, fallback)) {
          return;
        }
        setErrors({ duplicate: result?.message || 'Unable to register the player.' });
        return;
      }

      const profile = sanitizeSessionProfile(result.player || result.user || payload);
      const state = getDemoState();
      const normalizedEmail = (profile?.email || form.email.trim()).toLowerCase();
      const duplicateContact = findDuplicateContact(state, { ...form, email: normalizedEmail, mobile: form.mobile.replace(/\s/g, '') });
      const duplicatePlayer = findDuplicatePlayer(state, { ...form, email: normalizedEmail, mobile: form.mobile.replace(/\s/g, '') });

      if (duplicateContact || duplicatePlayer) {
        setErrors({ duplicate: duplicateContact ? (String(duplicateContact.email || '').toLowerCase() === normalizedEmail ? 'This email is already registered. Please login instead.' : 'This mobile number is already registered. Please login to continue.') : 'A player with this name and date of birth is already registered. Please login instead.' });
        return;
      }

      const player = {
        id: profile?.id || profile?.userId || profile?.playerId || createId('player'),
        role: ROLES.PLAYER,
        firstName: profile?.firstName || form.firstName.trim(),
        surname: profile?.surname || form.surname.trim(),
        dob: profile?.dob || form.dob,
        age: Number(profile?.age ?? age),
        mobile: String(profile?.mobile || form.mobile).replace(/\s/g, ''),
        email: (profile?.email || form.email.trim()).toLowerCase(),
        password: profile?.password || form.password,
        house: profile?.house || form.house.trim(),
        street: profile?.street || form.street.trim(),
        landmark: profile?.landmark || form.landmark.trim(),
        city: profile?.city || 'Vadodara',
        state: profile?.state || 'Gujarat',
        pincode: profile?.pincode || form.pincode,
        sports: selectedGames,
        games: selectedGames,
        sportIds: selectedGames.map((name) => sports.find((sport) => sport.name === name)?.id).filter(Boolean),
        sportId: selectedGames[0],
        selectedTurfIds,
        selectedTurfId: selectedTurfIds[0],
        gameTurfSelections,
        profileImage: profile?.profileImage || form.profileImage || '',
        createdAt: profile?.createdAt || new Date().toISOString(),
      };

      const nextState = getDemoState();
      nextState.players.push(player);
      nextState.requests.push(...gameTurfSelections.map((selection) => ({
        id: createId('request'),
        type: 'PLAYER_TURF_JOIN',
        playerId: player.id,
        turfId: selection.turfId,
        ownerId: getTurfOwnerId(selection.turfId),
        sportId: selection.sportName,
        status: 'pending',
        createdAt: new Date().toISOString(),
        respondedAt: null,
      })));
      recordActivity({
        state: nextState,
        type: ACTIVITY_TYPES.PLAYER_REGISTERED,
        actorRole: ROLES.PLAYER,
        actorName: `${player.firstName} ${player.surname}`.trim(),
        message: `New player registered: ${`${player.firstName} ${player.surname}`.trim()}`,
        targetPath: '/admin/players',
        meta: { playerId: player.id },
      });
      if (!saveDemoState(nextState)) {
        setErrors({ duplicate: 'Unable to save your registration. Please try again.' });
        return;
      }

      const nextSession = {
        userId: player.id,
        role: ROLES.PLAYER,
        email: player.email,
        issuedAt: new Date().toISOString(),
      };

      applySuccessfulSession(nextSession, ROLES.PLAYER, player);
      setSession(nextSession);
      onCreated(nextSession);
      redirectAfterPlayerRegistration(nextSession);
    } catch (error) {
      const fallbackState = getDemoState();
      const fallback = createDemoPlayerRegistration(fallbackState, {
        ...form,
        age,
        sports: selectedGames,
        selectedTurfIds,
        gameTurfSelections,
        mobile: form.mobile.replace(/\s/g, ''),
      });
      if (finalizeLocalRegistration(fallbackState, fallback)) {
        return;
      }
      setErrors({ duplicate: error?.message || fallback?.error || 'Unable to register the player. Please try again.' });
    }
    } finally {
      submissionLock.current = false;
    }
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

  return (
    <div className="player-app registration-page">
      <GlobalHeader />
      <main className="registration-main container">
        <div className="registration-heading"><span className="section-kicker">PLAYER REGISTRATION</span><h1>CREATE YOUR PLAYER PROFILE.</h1><p>Tell us a little about yourself and choose the sport you want to play.</p></div>
        <div className="registration-progress">{['Personal', 'Contact', 'Address', 'Sport & Turf', 'Review'].map((label, index) => <span className={step >= index + 1 ? 'active' : ''} key={label}><b>0{index + 1}</b>{label}</span>)}</div>
        <form className="registration-form" onSubmit={submit}>
          <section className="form-section"><FormSectionTitle number="01" title="Personal Information" /><div className="form-grid two"><Field label="First Name" value={form.firstName} onChange={(value) => update('firstName', value)} placeholder="Enter your first name" error={errors.firstName} required /><Field label="Surname" value={form.surname} onChange={(value) => update('surname', value)} placeholder="Enter your surname" error={errors.surname} required /><Field label="Date of Birth" type="date" value={form.dob} onChange={(value) => update('dob', value)} error={errors.dob} required /><Field label="Age" value={age ? `${age} years` : 'Calculated from date of birth'} readOnly /></div></section>
          <section className="form-section"><FormSectionTitle number="02" title="Contact & Address" /><div className="form-grid two"><Field label="Mobile Number" value={form.mobile} onChange={(value) => update('mobile', value)} placeholder="98765 43210" error={errors.mobile} required /><Field label="Email Address" type="email" value={form.email} onChange={(value) => update('email', value)} placeholder="you@example.com" error={errors.email} required /><Field label="Demo Password" type="password" value={form.password} onChange={(value) => update('password', value)} placeholder="At least 6 characters" error={errors.password} required /><Field label="House / Flat / Building" value={form.house} onChange={(value) => update('house', value)} placeholder="House, flat or building" error={errors.house} required /><Field label="Street / Area" value={form.street} onChange={(value) => update('street', value)} placeholder="Street or area" error={errors.street} required /><Field label="Landmark" value={form.landmark} onChange={(value) => update('landmark', value)} placeholder="Optional landmark" /><Field label="City" value="Vadodara" readOnly /><Field label="State" value="Gujarat" readOnly /><Field label="Pincode" value={form.pincode} onChange={(value) => update('pincode', value.replace(/\D/g, '').slice(0, 6))} placeholder="390001" error={errors.pincode} required /></div></section>
          <section className="form-section">
            <FormSectionTitle number="03" title="Choose Your Sport" />
            <div className="sport-choice-grid">{sports.map((sport) => {
              const selected = form.sports.includes(sport.name);
              return <button type="button" className={`sport-choice ${selected ? 'selected' : ''}`} key={sport.id} aria-pressed={selected} onClick={() => toggleGame(sport.name)}><span>{sport.icon}</span><strong>{sport.name}</strong>{selected && <i>Selected</i>}</button>;
            })}</div>
            {errors.sportId && <InlineError>{errors.sportId}</InlineError>}
          </section>
          <div className="registration-turf-search" role="search">
            <span className="registration-turf-search-icon" aria-hidden="true" />
            <input
              type="text"
              value={turfSearch}
              onChange={(event) => setTurfSearch(event.target.value)}
              placeholder="Search turf..."
              aria-label="Search turfs by name"
            />
            {turfSearch && (
              <button type="button" className="registration-turf-search-clear" onClick={() => setTurfSearch('')} aria-label="Clear turf search" />
            )}
          </div>
          <section className="form-section">
            <FormSectionTitle number="04" title="Select Your Preferred Turfs" />
            <p className="form-section-note">Turfs compatible with at least one selected game{form.sports.length ? `: ${form.sports.join(', ')}` : ''} are shown.</p>
            {form.sports.length ? searchedTurfs.length ? <div className="registration-turf-grid">{searchedTurfs.map((turf) => <TurfCard turf={turf} selected={form.selectedTurfIds.includes(turf.id)} onSelect={() => toggleTurf(turf.id)} key={turf.id} selectLabel="Select Turf" />)}</div> : <div className="form-empty">No turfs found.</div> : <div className="form-empty">Choose one or more games to see compatible Vadodara turfs.</div>}
            {errors.selectedTurfId && <InlineError>{errors.selectedTurfId}</InlineError>}
          </section>
          <section className="form-section"><FormSectionTitle number="05" title="Profile Photo" /><div className="photo-upload"><div className="photo-preview">{form.profileImage ? <img src={form.profileImage} alt="Player preview" /> : <span>VS</span>}</div><div><label className="upload-button btn btn-secondary">{form.profileImage ? 'Change Photo' : 'Upload Profile Photo'}<input type="file" accept="image/*" onChange={handlePhoto} /></label>{form.profileImage && <button type="button" className="text-button danger" onClick={() => update('profileImage', '')}>Remove photo</button>}<p>JPG, PNG, WEBP or GIF. Optional.</p>{photoError && <InlineError>{photoError}</InlineError>}</div></div></section>
          {errors.duplicate && <div className="form-alert">{errors.duplicate}</div>}
          <div className="registration-actions"><button type="button" className="btn btn-secondary" onClick={() => navigate('/signup')}>Back</button><button type="button" className="btn btn-primary" onClick={() => { if (validate()) { setReview(true); setStep(5); } }}>Review Your Details</button></div>
        </form>
        {review && <ReviewModal form={form} age={age} onClose={() => setReview(false)} onSubmit={handleReviewSubmit} />}
      </main>
      <Footer />
    </div>
  );
}

function ReviewModal({ form, age, onClose, onSubmit }) {
  const selectedGames = getPlayerGames(form);
  const selectedTurfs = getPlayerTurfIds(form).map((turfId) => getTurf(turfId)).filter(Boolean);
  return <div className="review-modal-backdrop"><section className="review-modal"><button type="button" className="modal-close" onClick={onClose}>×</button><span className="section-kicker">FINAL CHECK</span><h2>REVIEW YOUR DETAILS.</h2><div className="review-grid"><ReviewItem label="Player" value={`${form.firstName} ${form.surname}`} /><ReviewItem label="Date of Birth" value={formatDate(form.dob)} /><ReviewItem label="Age" value={`${age} years`} /><ReviewItem label="Games" value={selectedGames.join(', ')} /><ReviewItem label="Mobile" value={form.mobile} /><ReviewItem label="Email" value={form.email} /><ReviewItem label="Address" value={`${form.house}, ${form.street}, Vadodara`} /><ReviewItem label="Selected Turfs" value={selectedTurfs.map((turf) => turf.name).join(', ')} /></div><div className="review-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Edit Details</button><button type="button" className="btn btn-primary" onClick={onSubmit}>Create Player Profile</button></div></section></div>;
}

function PlayerDashboard({ state, session, refresh, logout }) {
  const storedPlayer = resolvePlayerForSession(state, session);
  const [turfQuery, setTurfQuery] = useState('');
  if (!storedPlayer) return <ProtectedMessage role="player" />;
  const selectedGames = getPlayerGames(storedPlayer);
  const selectedTurfIds = getPlayerTurfIds(storedPlayer);
  const player = { ...storedPlayer, sportId: selectedGames.join(', ') || storedPlayer.sportId };
  const interestedIds = new Set(getPlayerInterestedTournamentIds(storedPlayer));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const interestedTournaments = getAllTournaments().filter((tournament) => {
    return interestedIds.has(String(tournament.id)) && isTournamentInterestActive(tournament, today);
  });
  const playerRequests = state.requests.filter((request) => request.playerId === player.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const currentRequest = playerRequests[0];
  const playerBookings = getBookings().filter((booking) => booking.userId === player.id || booking.email === player.email).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const selectedTurfs = selectedTurfIds.map((turfId) => getTurf(turfId)).filter(Boolean);
  const selectedTurf = selectedTurfs.length ? {
    name: selectedTurfs.map((turf) => turf.name).join(', '),
    area: [...new Set(selectedTurfs.map((turf) => turf.area).filter(Boolean))].join(', '),
  } : null;
  const matches = state.matches.filter((match) => selectedGames.includes(match.sportId));
  const playerTournaments = getAllTournaments().filter((tournament) => selectedGames.includes(tournament.sport));
  const compatibleTurfs = getAllTurfs().filter((turf) => (turf.sports || []).some((sportName) => selectedGames.includes(sportName)) && [turf.name, turf.area].some((value) => String(value || '').toLowerCase().includes(turfQuery.toLowerCase())));

  const sendRequest = (turf) => {
    if (selectedTurfIds.includes(turf.id) && currentRequest?.status === 'pending') return;
    if (currentRequest?.status === 'accepted' && !window.confirm('You are already connected with this turf. Do you want to change your preferred turf?')) return;
    const nextState = getDemoState();
    const oldPending = nextState.requests.find((request) => request.id === currentRequest?.id && request.status === 'pending');
    if (oldPending) oldPending.status = 'cancelled';
    const nextPlayer = nextState.players.find((item) => item.id === player.id);
    nextPlayer.selectedTurfIds = [...new Set([...getPlayerTurfIds(nextPlayer), turf.id])];
    nextPlayer.selectedTurfId = nextPlayer.selectedTurfIds[0];
    nextState.requests.push(...selectedGames.filter((sportName) => turfSupportsSport(turf, sportName)).map((sportName) => ({ id: createId('request'), type: 'PLAYER_TURF_JOIN', playerId: player.id, turfId: turf.id, ownerId: getTurfOwnerId(turf.id), sportId: sportName, status: 'pending', createdAt: new Date().toISOString(), respondedAt: null })));
    saveDemoState(nextState);
    refresh();
    document.querySelector('#my-turf-request')?.scrollIntoView({ behavior: 'smooth' });
  };

  return <PlayerShell player={player} active="Dashboard" logout={logout}><main className="dashboard-main container"><section className="dashboard-welcome"><div><span className="section-kicker">PLAYER HOME / VADODARA</span><h1>Welcome back, {player.firstName}.</h1><p>Ready for your next game?</p></div></section><section className="dashboard-summary-grid"><article className="player-summary-card"><div className="summary-profile"><span className="large-avatar">{player.firstName.slice(0, 1)}{player.surname.slice(0, 1)}</span><div><h2>{player.firstName} {player.surname}</h2><p>{player.sportId} Player · {player.age} Years</p><span>Vadodara</span></div></div><div className="summary-turf"><span className="section-kicker">SELECTED TURF</span><strong>{selectedTurf?.name || 'Not Selected'}</strong><span>{selectedTurf?.area || 'Choose a turf'}{selectedTurf ? ', Vadodara' : ''}</span></div><button type="button" className="link-button" onClick={() => navigate('/player/profile')}>View Profile</button></article><RequestCard request={currentRequest} /></section><section className="dashboard-columns"><section className="dashboard-block"><SectionHeading kicker="UPCOMING MATCHES" title="YOUR NEXT GAMES." /><div className="match-list">{matches.filter((match) => match.status === 'upcoming').length ? matches.filter((match) => match.status === 'upcoming').map((match) => <MatchCard key={match.id} match={match} />) : <EmptyState title="No upcoming matches" text="Your next match will appear here." />}</div></section><section className="dashboard-block"><SectionHeading kicker="LIVE NOW" title="YOUR SPORT, RIGHT NOW." /><div className="match-list">{matches.filter((match) => match.status === 'live').length ? matches.filter((match) => match.status === 'live').map((match) => <MatchCard key={match.id} match={match} />) : <EmptyState title="No live matches right now" text="Your next match will appear here when available." />}</div></section></section><section className="dashboard-block"><SectionHeading kicker={`${player.sportId.toUpperCase()} TOURNAMENTS`} title="OPPORTUNITIES TO COMPETE." /><div className="mini-tournament-grid">{playerTournaments.length ? playerTournaments.map((tournament) => <article className="mini-tournament" key={tournament.id}><img src={tournament.image} alt={`${tournament.sport} tournament`} /><div><span className="section-kicker">{tournament.sport}</span><h3>{tournament.name}</h3><p>{tournament.dateLabel} · {tournament.venueName}</p><button type="button" className="link-button" onClick={() => navigate(`/tournaments/${tournament.id}`)}>View Tournament</button></div></article>) : <EmptyState title="No upcoming tournaments for your selected sport." text="Choose another sport from your profile when your game changes." />}</div></section><section className="dashboard-block"><SectionHeading kicker="SAVED FOR LATER" title="INTERESTED TOURNAMENTS." /><div className="mini-tournament-grid">{interestedTournaments.length ? interestedTournaments.map((tournament) => <article className="mini-tournament" key={tournament.id}><img src={tournament.image} alt={`${tournament.sport} tournament`} /><div><span className="section-kicker">{tournament.sport}</span><h3>{tournament.name}</h3><p>{tournament.dateLabel} · {tournament.venueName}</p><button type="button" className="link-button" onClick={() => navigate(`/tournaments/${tournament.id}`)}>View Tournament</button></div></article>) : <EmptyState title="No interested tournaments yet" text="Select “I’m Interested” on a tournament to save it here." />}</div></section><section className="dashboard-block" id="find-turf"><div className="find-turf-heading"><SectionHeading kicker="VADODARA TURFS" title="FIND YOUR TURF." /><input className="dashboard-search" value={turfQuery} onChange={(event) => setTurfQuery(event.target.value)} placeholder="Search turf or area..." aria-label="Search turf" /></div><p className="dashboard-subtitle">Showing turfs compatible with {player.sportId}.</p><div className="dashboard-turf-grid">{compatibleTurfs.map((turf) => <TurfCard key={turf.id} turf={turf} selected={turf.id === player.selectedTurfId} requestStatus={playerRequests.find((request) => request.turfId === turf.id)?.status} onSelect={() => sendRequest(turf)} selectLabel={turf.id === player.selectedTurfId ? 'Current Turf' : 'Send Joining Request'} />)}</div></section><section className="dashboard-block request-history"><SectionHeading kicker="TURF REQUESTS" title="REQUEST HISTORY." />{playerRequests.length ? playerRequests.map((request) => <RequestHistoryItem key={request.id} request={request} />) : <EmptyState title="Choose a turf to send your first joining request." text="Your request history will appear here." />}</section></main></PlayerShell>;
}

function ProfilePage({ state, session, refresh, logout }) {
  const storedPlayer = resolvePlayerForSession(state, session);
  const player = storedPlayer ? { ...storedPlayer, sportId: getPlayerGames(storedPlayer).join(', ') || storedPlayer.sportId } : null;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(storedPlayer || {});
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
  return <div className="player-app dashboard-app"><AppTopbar player={player} onLogout={logout} onMenu={() => setOpen((value) => !value)} /><div className={`dashboard-frame ${open ? 'nav-open' : ''}`}><aside className="dashboard-sidebar"><div className="sidebar-profile"><span className="large-avatar">{player.firstName.slice(0, 1)}{player.surname.slice(0, 1)}</span><strong>{player.firstName} {player.surname}</strong><span>{player.sportId} Player</span></div><nav>{appNav.map((item) => <button type="button" className={active === item.label ? 'active' : ''} onClick={() => { setOpen(false); if (item.href.includes('#')) document.getElementById(item.href.split('#')[1])?.scrollIntoView({ behavior: 'smooth' }); else navigate(item.href); }} key={item.label}>{item.label}</button>)}</nav></aside><div className="dashboard-content">{children}{active === 'Dashboard' && <><PlayerTeams state={getDemoState()} player={player} refresh={() => window.location.reload()} /><TournamentRegistrationHistory playerId={player.id} /></>}</div></div></div>;
}

function TournamentRegistrationHistory({ playerId }) {
  const tournamentsById = new Map(getAllTournaments().map((tournament) => [tournament.id, tournament]));
  const registrations = getDemoState().registrations.filter((registration) => registration.playerId === playerId);

  return <section className="dashboard-block container"><SectionHeading kicker="TOURNAMENT REGISTRATIONS" title="YOUR TOURNAMENTS." />{registrations.length ? <div className="request-history-list">{registrations.map((registration) => <article className="request-history-item" key={registration.id}><div><strong>{tournamentsById.get(registration.tournamentId)?.name || 'Tournament'}</strong><span>{registration.registrationType || 'Individual'} · ₹{new Intl.NumberFormat('en-IN').format(registration.totalFee || 0)}</span></div><div><small>Payment: {registration.paymentStatus || 'pending'}</small><StatusPill status={registration.status} /></div></article>)}</div> : <EmptyState title="No tournament registrations" text="Register for a tournament from the detail page to see it here." />}</section>;
}

function AppTopbar({ player, label = 'PLAYER HOME', onLogout, onMenu }) {
  return <header className="app-topbar dashboard-topbar"><button type="button" className="app-brand" onClick={() => navigate(player ? '/player/dashboard' : '/turf-owner/dashboard')}><span className="brand-mark">VS</span><span>{label}</span></button><div className="dashboard-top-actions"><button type="button" className="mobile-dashboard-menu" onClick={onMenu} aria-label="Toggle dashboard navigation"><AdminIcon name="menu" size={20} /></button><button type="button" className="text-button" onClick={onLogout}>Logout</button></div></header>;
}

function RequestCard({ request }) {
  const bookings = request ? getBookings().filter((booking) => booking.userId === request.playerId || booking.turfId === request.turfId) : [];
  return <article className="request-card" id="my-turf-request"><span className="section-kicker">CURRENT TURF CONNECTION</span><h2>{request ? 'Request status' : 'No request yet'}</h2><p>{request ? 'Track your turf connection here.' : 'Choose a compatible turf to send your first request.'}</p>{request ? <><div className="request-card-row"><span>{request.sportId}</span><StatusPill status={request.status} /></div><small>Request sent {new Date(request.createdAt).toLocaleDateString('en-IN')}</small>{bookings.length > 0 && <div className="player-booking-statuses"><span className="section-kicker">BOOKING STATUS</span>{bookings.slice(0, 2).map((booking) => <div className="request-card-row" key={booking.bookingId}><span>{booking.game} · {formatDate(booking.bookingDate)}</span><StatusPill status={booking.bookingStatus} /></div>)}</div>}</> : <small>Select a turf below to get started.</small>}</article>;
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
function InlineError({ children, ...rest }) { return <span className="inline-error" role="alert" {...rest}>{children}</span>; }
function ProtectedMessage({ role }) { return <AuthFrame eyebrow="ACCOUNT ACCESS" title="PLEASE LOGIN TO CONTINUE." text={`This area is available to your ${role} account.`}><button type="button" className="btn btn-primary form-submit" onClick={() => navigate('/login')}>Go to Login</button></AuthFrame>; }
function Field({ label, type = 'text', value = '', onChange = () => {}, placeholder = '', error, required = false, readOnly = false, inputMode, maxLength }) { const ownerEmailField = placeholder === 'owner@domain.com'; return <>{<label className="form-field"><span>{label}{required && <b>*</b>}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} readOnly={readOnly} required={required} inputMode={inputMode} maxLength={maxLength} />{error && <InlineError>{error}</InlineError>}</label>}{ownerEmailField && <><label className="form-field"><span>Password<b>*</b></span><input name="turf-owner-password" type="password" placeholder="Create a password" required /></label><label className="form-field"><span>Confirm Password<b>*</b></span><input name="turf-owner-confirm-password" type="password" placeholder="Re-enter your password" required /></label></>}</>; }

export default PlayerApp;
