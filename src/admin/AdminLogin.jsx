import { useState } from 'react';
import GlobalHeader from '../GlobalHeader';
import Footer from '../Footer';
import AdminIcon from './AdminIcon';
import { route } from '../config/routes';
import { authenticateAdmin, dashboardPathForRole, ROLES, setSession } from '../data/demoStore';

// AdminLogin is the dedicated entry point for staff (/admin/login).
//
// It intentionally does NOT offer a role picker: unlike the public login screen,
// the admin portal only ever authenticates the ADMIN role (see authenticateAdmin
// in the demo store). This mirrors how a real deployment would expose a separate
// staff sign-in rather than a public role switcher.

const navigate = (href) => { window.location.href = route(href); };

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const submit = (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) { setError('Email is required.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) { setError('Please enter a valid email address.'); return; }
    if (!password) { setError('Password is required.'); return; }

    setIsSubmitting(true);
    setError('');

    // Fixed role — the portal never accepts a caller-supplied role.
    const result = authenticateAdmin(normalizedEmail, password);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    const nextSession = result.session;
    setSession(nextSession);
    if (onLogin) onLogin(nextSession);
    setIsSubmitting(false);
    navigate(dashboardPathForRole(ROLES.ADMIN));
  };

  return (
    <div className="admin-auth-page">
      <GlobalHeader />
      <main className="admin-auth-main">
        <section className="admin-auth-card" aria-labelledby="admin-login-title">
          <div className="admin-auth-head">
            <span className="admin-brand-mark admin-auth-mark">CL</span>
            <span className="admin-auth-brandline">
              <strong>CLIFT</strong>
              <small>ADMIN PANEL</small>
            </span>
          </div>

          <div className="admin-auth-copy">
            <span className="section-kicker">ADMIN PORTAL</span>
            <h1 id="admin-login-title">Welcome back, Admin</h1>
            <p>Sign in with your administrator credentials to manage the CLIFT platform.</p>
          </div>

          <form className="admin-auth-form" onSubmit={submit} noValidate>
            <label className="form-field">
              <span>Email Address<b>*</b></span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                autoComplete="username"
                required
              />
            </label>

            <label className="form-field">
              <span>Password<b>*</b></span>
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
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
            </label>

            {error && <p className="admin-auth-error" role="alert" aria-live="polite">{error}</p>}

            <div className="admin-auth-row">
              <button type="button" className="admin-link-btn" onClick={() => { setShowForgot(true); setForgotSent(false); }}>
                Forgot password?
              </button>
            </div>

            <button type="submit" className="btn btn-primary admin-auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'SIGNING IN...' : 'SIGN IN'}
              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          {showForgot && (
            <div className="admin-forgot-note" role="status">
              <AdminIcon name="bell" size={16} />
              {forgotSent ? (
                <span>If that email belongs to an administrator, a reset link has been sent. (Demo only — no email is actually delivered.)</span>
              ) : (
                <span>
                  Password recovery is not available in this demo build. Contact a platform administrator to reset your access.
                  <button type="button" className="admin-link-btn" onClick={() => setForgotSent(true)}>Request reset link (demo)</button>
                </span>
              )}
            </div>
          )}

          <p className="admin-auth-footnote">
            <AdminIcon name="shield" size={14} /> This is a restricted area for platform administrators.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default AdminLogin;