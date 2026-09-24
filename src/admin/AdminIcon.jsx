// Lightweight inline SVG icon set for the Admin Panel.
//
// These mirror the stroke style used across the public site (24x24 viewBox,
// currentColor, round joins) so the admin shell reads as part of CLIFT rather
// than a bolted-on design system. No icon dependency is introduced.

const paths = {
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></>,
  trophy: <><path d="M8 5h8v4a4 4 0 0 1-8 0V5Z" /><path d="M8 7H5a3 3 0 0 0 3 3M16 7h3a3 3 0 0 1-3 3M12 13v4M8 20h8M9 17h6" /></>,
  clipboard: <><rect x="6" y="4.5" width="12" height="16" rx="2.2" /><path d="M9 4.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4.5" /><path d="M9.5 11h5M9.5 15h3" /></>,
  users: <><circle cx="9" cy="8" r="3" /><circle cx="16" cy="10" r="2.5" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M14 15.5a4.5 4.5 0 0 1 6.5 4" /></>,
  shield: <><path d="M12 3.5 5 6v5.5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-2.5Z" /><path d="m9.5 12 1.8 1.8L15 10" /></>,
  badge: <><circle cx="12" cy="9.5" r="5.5" /><path d="m8 14-1 7 5-2.5L17 21l-1-7" /></>,
  turf: <><path d="M4 20h16" /><path d="M5 20V9l7-5 7 5v11" /><path d="M12 4v16M5 12h14" /></>,
  vs: <><path d="M4 6.5 8 17l4-10.5M12.5 6.5 16 17l4-10.5" /><path d="M4.5 12h6M13.5 12h6" /></>,
  chart: <><path d="M5 19V9M12 19V5M19 19v-8" /><path d="M3.5 19.5h17" /><path d="m4 7 5-3 4 2 6-4" /><path d="M16 2h3v3" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
  pulse: <><path d="M3 12h4l2.5-6 4 12L16 12h5" /></>,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  chevron: <><path d="m9 5 7 7-7 7" /></>,
  logout: <><path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13A1.5 1.5 0 0 1 18.5 20H15" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h9" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  close: <><path d="M6 6l12 12M18 6 6 18" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.5-3.5" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  edit: <><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M13.5 6.5l3 3" /></>,
  ban: <><circle cx="12" cy="12" r="8.5" /><path d="m6.5 6.5 11 11" /></>,
  check: <><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.4 2.4 4.6-5" /></>,
  play: <><circle cx="12" cy="12" r="8.5" /><path d="M10.5 9l4.5 3-4.5 3V9Z" /></>,
};

export function AdminIcon({ name, className = 'admin-icon', size = 20 }) {
  const art = paths[name] || paths.grid;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {art}
    </svg>
  );
}

export default AdminIcon;