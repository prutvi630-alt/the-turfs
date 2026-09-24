export const route = (path = '') => {
  const normalizedPath = String(path).replace(/^\/The-Turf-/, '').replace(/^\//, '');
  return `${import.meta.env.BASE_URL}${normalizedPath}`;
};
