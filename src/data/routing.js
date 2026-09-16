const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export const normalizePath = (pathname = window.location.pathname) => {
  const hashPath = window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '';
  if (hashPath) return hashPath;
  if (pathname === basePath || pathname === `${basePath}/`) return '/';
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length) || '/';
  return pathname || '/';
};

export const appHref = (path) => `${basePath}#${path === '/' ? '/' : path}`;