export const normalizeStaffBankDetails = (values = {}) => {
  const bankDetails = {
    bankName: String(values.bankName || '').trim(),
    accountHolderName: String(values.accountHolderName || '').trim(),
    accountNumber: String(values.accountNumber || '').trim(),
    ifscCode: String(values.ifscCode || '').trim().toUpperCase(),
    mobileNumber: String(values.mobileNumber || '').trim(),
  };
  const errors = {};

  if (!bankDetails.bankName) errors.bankName = 'Bank name is required.';
  if (!bankDetails.accountHolderName) errors.accountHolderName = 'Account holder name is required.';
  else if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(bankDetails.accountHolderName)) {
    errors.accountHolderName = 'Enter a valid account holder name.';
  }
  if (!/^\d{9,18}$/.test(bankDetails.accountNumber)) {
    errors.accountNumber = 'Enter a valid account number (9–18 digits).';
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode)) {
    errors.ifscCode = 'Enter a valid 11-character IFSC code.';
  }
  if (!/^[6-9]\d{9}$/.test(bankDetails.mobileNumber)) {
    errors.mobileNumber = 'Enter a valid 10-digit Indian mobile number.';
  }

  return { bankDetails, errors, valid: Object.keys(errors).length === 0 };
};

export const maskBankAccountNumber = (accountNumber) => {
  const digits = String(accountNumber || '').replace(/\D/g, '');
  if (!digits) return 'Not provided';
  return `${'X'.repeat(Math.max(4, digits.length - 4))} ${digits.slice(-4)}`;
};
