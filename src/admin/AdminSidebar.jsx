import { useEffect, useState } from 'react';
import AdminIcon from './AdminIcon';
import { adminNav } from './adminNav';

// AdminSidebar renders the full information architecture from `adminNav`.
// It is used in two ways by AdminLayout:
//   - desktop/tablet: a persistent rail that collapses on tablet
//   - mobile: a drawer whose open/close state is owned by the layout
// The component itself is presentational + local open/close for the expandable
// Tournaments group; navigation is delegated to the `onNavigate` callback so the
// layout can close the mobile drawer after each selection.

function AdminSidebar({ activeId, path, search, onNavigate, onLogout, collapsed = false, admin, onCloseDrawer }) {
  const [openGroups, setOpenGroups] = useState(() => ({ tournaments: String(search).includes('view=') || String(path).startsWith('/admin/tournaments') }));

  // Keep the Tournaments group open whenever one of its children is active,
  // including on first load of a deep URL.
  useEffect(() => {
    if (activeId === 'tournaments') {
      setOpenGroups((current) => (current.tournaments ? current : { ...current, tournaments: true }));
    }
  }, [activeId]);

  const toggleGroup = (id) => setOpenGroups((current) => ({ ...current, [id]: !current[id] }));

  const isChildActive = (child) => {
    const [childPath, childQuery] = child.path.split('?');
    if (childPath !== path) return false;
    const childView = new URLSearchParams(childQuery || '').get('view');
    if (!childView) return true;
    const currentView = new URLSearchParams(search || '').get('view') || 'all';
    return currentView === childView;
  };

  const renderItem = (item) => {
    if (item.children) {
      const isOpen = Boolean(openGroups[item.id]);
      const groupActive = activeId === item.id;
      return (
        <li className={`admin-nav-group ${groupActive ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`} key={item.id}>
          <button
            type="button"
            className={`admin-nav-item admin-nav-parent ${groupActive ? 'active' : ''}`}
            onClick={() => toggleGroup(item.id)}
            aria-expanded={isOpen}
            title={collapsed ? item.label : undefined}
          >
            <AdminIcon name={item.icon} />
            {!collapsed && <span className="admin-nav-label">{item.label}</span>}
            <span className={`admin-nav-chevron ${isOpen ? 'open' : ''}`}><AdminIcon name="chevron" size={16} /></span>
          </button>
          {!collapsed && isOpen && (
            <ul className="admin-nav-sublist">
              {item.children.map((child) => (
                <li key={child.id}>
                  <button
                    type="button"
                    className={`admin-nav-sublink ${isChildActive(child) ? 'active' : ''}`}
                    onClick={() => onNavigate(child.path)}
                  >
                    <span className="admin-sublink-dot" aria-hidden="true" />
                    {child.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </li>
      );
    }

    return (
      <li key={item.id}>
        <button
          type="button"
          className={`admin-nav-item ${activeId === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.path)}
          title={collapsed ? item.label : undefined}
        >
          <AdminIcon name={item.icon} />
          {!collapsed && <span className="admin-nav-label">{item.label}</span>}
        </button>
      </li>
    );
  };

  return (
    <aside className={`admin-sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label="Admin navigation">
      <div className="admin-sidebar-brand">
        <button type="button" className="admin-brand-btn" onClick={() => onNavigate('/admin/dashboard')} aria-label="Go to admin dashboard">
          <span className="admin-brand-mark">CL</span>
          {!collapsed && (
            <span className="admin-brand-text">
              <strong>CLIFT</strong>
              <small>ADMIN PANEL</small>
            </span>
          )}
        </button>
        {onCloseDrawer && (
          <button type="button" className="admin-drawer-close" onClick={onCloseDrawer} aria-label="Close navigation">
            <AdminIcon name="close" size={18} />
          </button>
        )}
      </div>

      <nav className="admin-sidebar-scroll">
        <ul className="admin-nav-list">
          {adminNav.map(renderItem)}
        </ul>
      </nav>

      <div className="admin-sidebar-footer">
        {!collapsed && admin && (
          <div className="admin-sidebar-account">
            <span className="admin-avatar">{(admin.name || 'AD').slice(0, 2).toUpperCase()}</span>
            <span className="admin-account-meta">
              <strong>{admin.name || 'Administrator'}</strong>
              <small>{admin.email}</small>
            </span>
          </div>
        )}
        <button type="button" className="admin-logout-btn" onClick={onLogout} title={collapsed ? 'Logout' : undefined}>
          <AdminIcon name="logout" size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;