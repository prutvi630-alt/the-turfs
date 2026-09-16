const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export const normalizePath = (pathname = window.location.pathname) => {
  if (pathname === basePath || pathname === `${basePath}/`) return '/';
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length) || '/';
  return pathname || '/';
};

export const appHref = (path) => `${basePath}${path === '/' ? '/' : path}`;