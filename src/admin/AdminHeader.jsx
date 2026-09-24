import { useEffect, useRef, useState } from 'react';
import AdminIcon from './AdminIcon';

// AdminHeader: page title + breadcrumb, mobile menu button, notifications and
// the admin profile menu. Kept deliberately presentational — it receives the
// title/crumbs and the current admin from AdminLayout.

function AdminHeader({ title, crumbs = [], admin, onToggleSidebar, onNavigate, onLogout, notificationCount = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const handleKey = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  return (
    <header className="admin-header">
      <button
        type="button"
        className="admin-menu-toggle"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation menu"
      >
        <AdminIcon name="menu" size={20} />
      </button>

      <div className="admin-header-heading">
        <nav className="admin-breadcrumb" aria-label="Breadcrumb">
          {crumbs.map((crumb, index) => (
            <span key={`${crumb}-${index}`} className={index === crumbs.length - 1 ? 'is-current' : ''}>
              {crumb}
              {index < crumbs.length - 1 && <i aria-hidden="true">/</i>}
            </span>
          ))}
        </nav>
        <h1 className="admin-header-title">{title}</h1>
      </div>

      <div className="admin-header-actions">
        <button
          type="button"
          className="admin-icon-btn"
          onClick={() => onNavigate('/admin/notifications')}
          aria-label={`Notifications${notificationCount ? `, ${notificationCount} unread` : ''}`}
        >
          <AdminIcon name="bell" size={19} />
          {notificationCount > 0 && <span className="admin-badge-dot">{notificationCount > 9 ? '9+' : notificationCount}</span>}
        </button>

        <div className="admin-profile" ref={menuRef}>
          <button
            type="button"
            className="admin-profile-btn"
            onClick={() => setMenuOpen((value) => !value)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="admin-avatar">{(admin?.name || 'AD').slice(0, 2).toUpperCase()}</span>
            <span className="admin-profile-meta">
              <strong>{admin?.name || 'Administrator'}</strong>
              <small>Administrator</small>
            </span>
            <span className={`admin-nav-chevron ${menuOpen ? 'open' : ''}`}><AdminIcon name="chevron" size={15} /></span>
          </button>

          {menuOpen && (
            <div className="admin-profile-menu" role="menu">
              <div className="admin-profile-menu-head">
                <strong>{admin?.name || 'Administrator'}</strong>
                <small>{admin?.email}</small>
              </div>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onNavigate('/admin/profile'); }}>
                <AdminIcon name="user" size={16} /> Admin Profile
              </button>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onNavigate('/admin/settings'); }}>
                <AdminIcon name="cog" size={16} /> Settings
              </button>
              <button type="button" role="menuitem" className="is-danger" onClick={onLogout}>
                <AdminIcon name="logout" size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;