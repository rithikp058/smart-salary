export const MOCK_USER = {
  name: 'Demo Employee',
  employeeId: 'EMP001',
  email: 'demo@company.com',
  department: 'Engineering',
  designation: 'Software Engineer',
  baseSalary: 50000,
  travelDistance: 60,
  role: 'employee',
  area: 'KPHB',
  pincodes: ['500072', '500073'],
  mrId: '',
  phone: '+91 98765 43210',
  bankDetails: { bankName: 'State Bank of India', accountNo: '1234567890', ifsc: 'SBIN0001234' },
};

export function saveSession(token: string, user: object) {
  localStorage.setItem('ssp_token', token);
  localStorage.setItem('ssp_user', JSON.stringify(user));
}

export function saveOwnerSession(token: string) {
  localStorage.setItem('ssp_owner_token', token);
  localStorage.setItem('ssp_role', 'owner');
}

export function clearSession() {
  localStorage.removeItem('ssp_token');
  localStorage.removeItem('ssp_user');
  localStorage.removeItem('ssp_owner_token');
  localStorage.removeItem('ssp_role');
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem('ssp_user') || 'null'); } catch { return null; }
}

export function isLoggedIn() {
  return !!localStorage.getItem('ssp_token');
}

export function isOwner() {
  return localStorage.getItem('ssp_role') === 'owner';
}

export function isMR() {
  const user = getUser();
  return user?.role === 'mr';
}

export function getOwnerToken() {
  return localStorage.getItem('ssp_owner_token');
}
