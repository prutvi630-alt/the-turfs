export const getConfiguredTournamentFeeAmount = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string' || !value.trim()) return null;

  const normalized = value
    .trim()
    .replace(/^₹\s*/, '')
    .replace(/,/g, '')
    .replace(/\s+per\s+(?:team|player)$/i, '')
    .trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

export const formatTournamentFeeAmount = (amount) => (
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
);

export const formatTournamentFee = (value, fallback = 'Fee not configured') => {
  const amount = getConfiguredTournamentFeeAmount(value);
  return amount === null ? fallback : `₹${formatTournamentFeeAmount(amount)}`;
};
