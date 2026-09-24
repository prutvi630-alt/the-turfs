import { useEffect, useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { resolveActiveNav, resolvePageMeta } from './adminNav';
import { route } from '../config/routes';

// AdminLayout is the persistent shell for every protected /admin/* page.
// Responsibilities:
//   - own the responsive sidebar state (persistent / collapsed / drawer)
//   - compute the active nav id and page meta from the current URL
//   - close the mobile drawer after navigation
// It renders only the chrome + <main>; the routed AdminPage decides its content.

const DESKTOP_QUERY = '(min-width: 1100px)';
const MOBILE_QUERY = '(max-width: 820px)';

function AdminLayout({ children, admin, notificationCount = 0, onLogout, onNavigate }) {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY).matches : false));
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(DESKTOP_QUERY).matches : true));
  // On tablet the rail collapses to icons by default; on mobile it is a drawer.
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentPath = window.location.pathname.replace(/^\/The-Turf-/, '') || '/';
  const currentSearch = window.location.search || '';
  const activeId = resolveActiveNav(currentPath, currentSearch);
  const meta = resolvePageMeta(currentPath, currentSearch);

  useEffect(() => {
    const desktopMq = window.matchMedia(DESKTOP_QUERY);
    const mobileMq = window.matchMedia(MOBILE_QUERY);
    const onDesktop = (event) => setIsDesktop(event.matches);
    const onMobile = (event) => {
      setIsMobile(event.matches);
      if (!event.matches) setDrawerOpen(false);
    };
    desktopMq.addEventListener('change', onDesktop);
    mobileMq.addEventListener('change', onMobile);
    return () => {
      desktopMq.removeEventListener('change', onDesktop);
      mobileMq.removeEventListener('change', onMobile);
    };
  }, []);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [drawerOpen]);

  const handleNavigate = (href) => {
    setDrawerOpen(false);
    if (onNavigate) onNavigate(href);
    else window.location.href = route(href);
  };

  const handleToggleSidebar = () => {
    if (isMobile) setDrawerOpen((value) => !value);
    else setCollapsed((value) => !value);
  };

  const sidebarCollapsed = !isMobile && (collapsed || (!isDesktop && false));

  return (
    <div className={`admin-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobile ? 'is-mobile' : ''}`}>
      {/* Desktop / tablet rail */}
      {!isMobile && (
        <AdminSidebar
          activeId={activeId}
          path={currentPath}
          search={currentSearch}
          onNavigate={handleNavigate}
          onLogout={onLogout}
          collapsed={sidebarCollapsed}
          admin={admin}
        />
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <>
          <div className={`admin-drawer-scrim ${drawerOpen ? 'open' : ''}`} onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className={`admin-drawer ${drawerOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Admin navigation">
            <AdminSidebar
              activeId={activeId}
              path={currentPath}
              search={currentSearch}
              onNavigate={handleNavigate}
              onLogout={onLogout}
              admin={admin}
              onCloseDrawer={() => setDrawerOpen(false)}
            />
          </div>
        </>
      )}

      <div className="admin-main">
        <AdminHeader
          title={meta.title}
          crumbs={meta.crumbs}
          admin={admin}
          notificationCount={notificationCount}
          onToggleSidebar={handleToggleSidebar}
          onNavigate={handleNavigate}
          onLogout={onLogout}
        />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

export default AdminLayout;