const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export const normalizePath = (pathname = window.location.pathname) => {
  if (pathname === basePath) return '/';
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length) || '/';
  return pathname || '/';
};

export const route = (path = '') => {
  const value = String(path);
  const normalizedPath = value.startsWith(`${basePath}/`)
    ? value.slice(basePath.length + 1)
    : value.replace(/^\//, '');
  return `${import.meta.env.BASE_URL}${normalizedPath}`;
};
