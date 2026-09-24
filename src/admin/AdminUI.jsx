import { useEffect, useRef } from 'react';
import AdminIcon from './AdminIcon';

// ---------------------------------------------------------------------------
// Shared admin UI primitives
// ---------------------------------------------------------------------------
// Small, dependency-free building blocks reused by every admin module so the
// tables, modals and toasts stay consistent and accessible.

/* ---------- Status pill ---------- */
export function StatusPill({ status }) {
  const label = String(status || 'unknown');
  const normalized = label.toLowerCase();
  const tone = ['active', 'approved', 'accepted', 'published', 'registration open', 'ongoing'].includes(normalized) ? 'ok'
    : ['suspended', 'rejected', 'cancelled', 'inactive'].includes(normalized) ? 'danger'
      : ['pending', 'upcoming', 'draft', 'registration closed'].includes(normalized) ? 'warn'
        : 'neutral';
  return <span className={`admin-pill tone-${tone}`}>{label}</span>;
}

/* ---------- Search input ---------- */
export function SearchInput({ value, onChange, placeholder = 'Search…', label = 'Search' }) {
  return (
    <label className="admin-search">
      <AdminIcon name="search" size={16} />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
      {value && (
        <button type="button" className="admin-search-clear" onClick={() => onChange('')} aria-label="Clear search">
          <AdminIcon name="close" size={14} />
        </button>
      )}
    </label>
  );
}

/* ---------- Select control ---------- */
export function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="admin-filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, title, onClose, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement;
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    const onTab = (event) => {
      if (event.key !== 'Tab' || !ref.current) return;
      const focusable = [...ref.current.querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')].filter((item) => !item.disabled);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('keydown', onTab);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => ref.current?.querySelector('button, input, select, textarea, [href]')?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keydown', onTab);
      document.body.style.overflow = previous;
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="admin-modal-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <div className={`admin-modal admin-modal-${size}`} role="dialog" aria-modal="true" aria-labelledby="admin-modal-title" ref={ref}>
        <div className="admin-modal-head">
          <h3 id="admin-modal-title">{title}</h3>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close dialog">
            <AdminIcon name="close" size={16} />
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer && <div className="admin-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Drawer (side sheet for detail views) ---------- */
export function Drawer({ open, title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="admin-drawer-scrim open" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <aside className="admin-sheet" role="dialog" aria-modal="true" aria-labelledby="admin-drawer-title" ref={ref}>
        <div className="admin-modal-head">
          <h3 id="admin-drawer-title">{title}</h3>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close panel">
            <AdminIcon name="close" size={16} />
          </button>
        </div>
        <div className="admin-sheet-body">{children}</div>
      </aside>
    </div>
  );
}

/* ---------- Toast ---------- */
export function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onDismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div className={`admin-toast tone-${toast.tone || 'success'}`} role="status" aria-live="polite">
      <span className="admin-toast-icon">
        <AdminIcon name={toast.tone === 'danger' ? 'close' : 'shield'} size={16} />
      </span>
      <span className="admin-toast-body">
        <strong>{toast.title}</strong>
        {toast.text && <small>{toast.text}</small>}
      </span>
      <button type="button" className="admin-toast-close" onClick={onDismiss} aria-label="Dismiss">
        <AdminIcon name="close" size={14} />
      </button>
    </div>
  );
}

/* ---------- Pagination ---------- */
export function Pagination({ page, pageCount, total, pageSize, onPage }) {
  if (pageCount <= 1) {
    return <div className="admin-pagination"><span className="admin-pagination-info">{total} {total === 1 ? 'record' : 'records'}</span></div>;
  }
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="admin-pagination">
      <span className="admin-pagination-info">Showing {start}–{end} of {total}</span>
      <div className="admin-pagination-controls">
        <button type="button" className="admin-page-btn" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <AdminIcon name="chevron" size={14} />
        </button>
        {Array.from({ length: pageCount }).map((_, index) => {
          const pageNumber = index + 1;
          return (
            <button
              type="button"
              key={pageNumber}
              className={`admin-page-btn ${pageNumber === page ? 'active' : ''}`}
              onClick={() => onPage(pageNumber)}
              aria-current={pageNumber === page ? 'page' : undefined}
            >
              {pageNumber}
            </button>
          );
        })}
        <button type="button" className="admin-page-btn next" onClick={() => onPage(page + 1)} disabled={page >= pageCount} aria-label="Next page">
          <AdminIcon name="chevron" size={14} />
        </button>
      </div>
    </div>
  );
}

/* ---------- Empty state ---------- */
export function TableEmpty({ icon = 'users', title, text, action }) {
  return (
    <div className="admin-empty">
      <span className="admin-empty-icon"><AdminIcon name={icon} size={20} /></span>
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

/* ---------- Confirm dialog (used by suspend / activate) ---------- */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onCancel, children }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className={`btn ${tone === 'danger' ? 'admin-btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      )}
    >
      {message && <p className="admin-modal-text">{message}</p>}
      {children}
    </Modal>
  );
}/* ---------- Image helper (shared by the turf form) ---------- */
// Compress an uploaded image to a small JPEG data-URL so demo state stays within
// localStorage limits. Mirrors the helper used in the player/turf-owner flow.
export const compressImageFile = (file, maxSize = 720, quality = 0.78) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = reject;
    image.src = reader.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});