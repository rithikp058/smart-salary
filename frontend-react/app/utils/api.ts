const API_BASE = 'http://localhost:5000/api';

export const MOCK_MODE = false; // MongoDB is connected

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK_SALARY = {
  netSalary: 52400, incentive: 3750, bonus: 3750, status: 'credited',
  baseSalary: 50000, tax: 5390, deductions: 0, absentDeduction: 0,
  travelAllowance: 120, daysWorked: 24, absentDays: 2,
  salesAmount: 125000, travelDistance: 60,
  month: new Date().toISOString().slice(0, 7), creditedAt: new Date().toISOString(),
};

const MOCK_NOTIFICATIONS = [
  { message: '✅ Salary of ₹52,400 credited for April 2026', read: false, createdAt: new Date().toISOString() },
  { message: '🔄 Salary processed for March 2026', read: true, createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
];

const MOCK_HISTORY = [
  { month: '2026-04', baseSalary: 50000, daysWorked: 24, absentDays: 2, absentDeduction: 500, incentive: 3750, travelAllowance: 120, bonus: 3750, tax: 5390, deductions: 0, netSalary: 47980, status: 'credited', creditedAt: new Date().toISOString(), salesAmount: 125000 },
  { month: '2026-03', baseSalary: 50000, daysWorked: 26, absentDays: 0, absentDeduction: 0, incentive: 2500, travelAllowance: 120, bonus: 2500, tax: 5252, deductions: 0, netSalary: 47368, status: 'credited', creditedAt: new Date(Date.now() - 86400000 * 30).toISOString(), salesAmount: 100000 },
  { month: '2026-02', baseSalary: 50000, daysWorked: 25, absentDays: 1, absentDeduction: 250, incentive: 0, travelAllowance: 120, bonus: 0, tax: 5112, deductions: 0, netSalary: 44638, status: 'credited', creditedAt: new Date(Date.now() - 86400000 * 60).toISOString(), salesAmount: 80000 },
];

const MOCK_ISSUES: any[] = [
  {
    id: 'demo-1',
    employeeId: 'EMP001', employeeName: 'Demo Employee',
    month: new Date().toISOString().slice(0, 7),
    title: 'Salary mismatch for this month',
    status: 'replied',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    messages: [
      { id: 'm1', sender: 'employee', senderName: 'Demo Employee', text: 'My incentive was not calculated correctly. I had ₹1,25,000 in sales but only got 5% instead of 7.5%.', attachments: [], timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 'm2', sender: 'owner', senderName: 'Owner', text: 'Thank you for raising this. I have reviewed your sales data and will correct the incentive in the next processing cycle.', attachments: [], timestamp: new Date(Date.now() - 86400000).toISOString() },
    ],
  },
];

const MOCK_HOLIDAYS: any[] = [
  { id: 'h1', date: new Date().toISOString().slice(0, 8) + '15', reason: 'Company Foundation Day' },
];

const MOCK_LEAVES: any[] = [];
const today = new Date().toISOString().slice(0, 10);
const MOCK_ATTENDANCE = {
  daysPresent: 18,
  month: new Date().toISOString().slice(0, 7),
  records: Array.from({ length: 18 }, (_, i) => ({
    date: new Date(Date.now() - (i + 1) * 86400000).toISOString().slice(0, 10), // starts from yesterday
    checkedIn: true,
    checkInTime: new Date(Date.now() - (i + 1) * 86400000 + 32400000).toISOString(), // 9am
    photo: '',
  })),
  todayCheckedIn: false,
};

const MOCK_EMPLOYEES = [
  { _id: '1', employeeId: 'EMP001', name: 'Demo Employee', email: 'demo@company.com', department: 'Engineering', designation: 'Software Engineer', baseSalary: 50000, travelDistance: 60 },
  { _id: '2', employeeId: 'EMP002', name: 'Jane Smith', email: 'jane@company.com', department: 'Sales', designation: 'Sales Executive', baseSalary: 40000, travelDistance: 30 },
];

function getMockProfile() {
  try { return JSON.parse(localStorage.getItem('ssp_user') || 'null'); } catch { return null; }
}

// ── HTTP helper ────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('ssp_token'); }
function getOwnerToken() { return localStorage.getItem('ssp_owner_token'); }

async function request(endpoint: string, options: RequestInit = {}, useOwnerToken = false) {
  const token = useOwnerToken ? getOwnerToken() : getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).message || 'Request failed');
  return data;
}

// Normalize MongoDB _id → id recursively so frontend code works unchanged
function norm(data: any): any {
  if (Array.isArray(data)) return data.map(norm);
  if (data && typeof data === 'object') {
    const out: any = { ...data };
    if (out._id && !out.id) out.id = out._id.toString();
    for (const k of Object.keys(out)) {
      if (Array.isArray(out[k])) out[k] = out[k].map(norm);
    }
    return out;
  }
  return data;
}

async function req(endpoint: string, options: RequestInit = {}, useOwnerToken = false) {
  const data = await request(endpoint, options, useOwnerToken);
  return norm(data);
}

// ── API ────────────────────────────────────────────────────────────────────
export const api = {
  // Auth
  login: (body: object) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body: object) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  changePassword: (body: object) => MOCK_MODE ? Promise.resolve({}) : request('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (body: object) => MOCK_MODE ? Promise.resolve({ resetToken: 'mock-reset-token-demo' }) : request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),

  // Owner auth
  ownerLogin: (body: object) => MOCK_MODE
    ? (((body as any).adminKey === 'owner@admin2026') ? Promise.resolve({ token: 'mock-owner-token', owner: { name: 'Owner', role: 'owner' } }) : Promise.reject(new Error('Invalid admin key')))
    : request('/owner/login', { method: 'POST', body: JSON.stringify(body) }),

  // Employee profile
  getProfile: () => MOCK_MODE ? Promise.resolve(getMockProfile()) : request('/employee/me'),
  updateProfile: (body: any) => {
    if (MOCK_MODE) {
      const current = getMockProfile() || {};
      const updated = { ...current, ...body };
      localStorage.setItem('ssp_user', JSON.stringify(updated));
      return Promise.resolve(updated);
    }
    return request('/employee/me', { method: 'PUT', body: JSON.stringify(body) });
  },
  getNotifications: () => MOCK_MODE ? Promise.resolve(MOCK_NOTIFICATIONS) : request('/employee/notifications'),
  markNotificationsRead: () => { MOCK_NOTIFICATIONS.forEach(n => n.read = true); return Promise.resolve({}); },

  // Salary
  enterData: (body: object) => MOCK_MODE ? Promise.resolve({ success: true }) : request('/salary/enter-data', { method: 'POST', body: JSON.stringify(body) }),
  buildSalary: (month: string, employeeId?: string, deductions?: number) =>
    MOCK_MODE ? Promise.resolve({ record: { ...MOCK_SALARY, month, netSalary: 52400 } })
      : request(`/salary/build/${month}`, { method: 'POST', body: JSON.stringify({ employeeId, deductions }) }, true),
  getSalaryHistory: () => MOCK_MODE ? Promise.resolve(MOCK_HISTORY) : req('/salary/history'),
  getLatestSalary: () => MOCK_MODE ? Promise.resolve(MOCK_SALARY) : req('/salary/latest'),
  getAllSalaries: (month?: string) => MOCK_MODE
    ? Promise.resolve(MOCK_HISTORY.map(h => ({ ...h, employeeId: 'EMP001', employeeName: 'Demo Employee' })))
    : req(`/salary/all${month ? `?month=${month}` : ''}`, {}, true),
  setDeductions: (body: object) => MOCK_MODE ? Promise.resolve({}) : req('/salary/deductions', { method: 'PUT', body: JSON.stringify(body) }, true),

  // Attendance
  checkIn: (photo?: string) => {
    if (!photo) return Promise.reject(new Error('Photo is required to mark attendance. Please capture a photo.'));
    if (MOCK_MODE) {
      const record = { date: today, checkedIn: true, photo, checkInTime: new Date().toISOString() };
      if (!MOCK_ATTENDANCE.records.find((r: any) => r.date === today)) {
        MOCK_ATTENDANCE.todayCheckedIn = true;
        MOCK_ATTENDANCE.daysPresent += 1;
        MOCK_ATTENDANCE.records.unshift(record);
      }
      return Promise.resolve(record);
    }
    return request('/attendance/checkin', { method: 'POST', body: JSON.stringify({ photo }) });
  },
  getMyAttendance: (month?: string) => MOCK_MODE
    ? Promise.resolve({ ...MOCK_ATTENDANCE, month: month || MOCK_ATTENDANCE.month })
    : req(`/attendance/my${month ? `?month=${month}` : ''}`),
  getAllAttendance: (month?: string) => MOCK_MODE
    ? Promise.resolve([{ employeeId: 'EMP001', days: MOCK_ATTENDANCE.records.map((r: any) => r.date) }])
    : req(`/attendance/all${month ? `?month=${month}` : ''}`, {}, true),

  // Issues (thread-based)
  raiseIssue: (body: object) => {
    if (MOCK_MODE) {
      const b = body as any;
      const thread = { id: Date.now().toString(), employeeId: 'EMP001', employeeName: 'Demo Employee', month: b.month, title: b.title || `Issue for ${b.month}`, status: 'pending', createdAt: new Date().toISOString(), messages: [{ id: `${Date.now()}-1`, sender: 'employee', senderName: 'Demo Employee', text: b.message, attachments: [], timestamp: new Date().toISOString() }] };
      MOCK_ISSUES.unshift(thread);
      return Promise.resolve(thread);
    }
    return req('/issues', { method: 'POST', body: JSON.stringify(body) });
  },
  replyToIssue: (id: string, body: { text: string; attachments?: string[] }, asOwner = false) => {
    if (MOCK_MODE) {
      const thread = MOCK_ISSUES.find(i => i.id === id);
      if (!thread) return Promise.reject(new Error('Issue not found'));
      const msg = { id: `${Date.now()}-r`, sender: asOwner ? 'owner' : 'employee', senderName: asOwner ? 'Owner' : 'Demo Employee', text: body.text, attachments: body.attachments || [], timestamp: new Date().toISOString() };
      thread.messages.push(msg);
      thread.status = asOwner ? 'replied' : (thread.status === 'replied' ? 'pending' : thread.status);
      return Promise.resolve(thread);
    }
    return req(`/issues/${id}/reply`, { method: 'POST', body: JSON.stringify(body) }, asOwner);
  },
  setIssueStatus: (id: string, status: string) => {
    if (MOCK_MODE) { const t = MOCK_ISSUES.find(i => i.id === id); if (t) t.status = status; return Promise.resolve(t); }
    return req(`/issues/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }, true);
  },
  resolveIssue: (id: string, note: string) => {
    if (MOCK_MODE) { const t = MOCK_ISSUES.find(i => i.id === id); if (t) { t.status = 'resolved'; if (note) t.messages.push({ id: `${Date.now()}-res`, sender: 'owner', senderName: 'Owner', text: note, attachments: [], timestamp: new Date().toISOString() }); } return Promise.resolve(t); }
    return req(`/issues/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'resolved' }) }, true);
  },
  getMyIssues: () => MOCK_MODE ? Promise.resolve([...MOCK_ISSUES]) : req('/issues/my'),
  getAllIssues: (status?: string) => MOCK_MODE
    ? Promise.resolve(status ? MOCK_ISSUES.filter(i => i.status === status) : [...MOCK_ISSUES])
    : req(`/issues/all${status ? `?status=${status}` : ''}`, {}, true),

  // Owner - employees
  getEmployees: () => MOCK_MODE ? Promise.resolve(MOCK_EMPLOYEES) : req('/owner/employees', {}, true),
  updateEmployee: (id: string, body: object) => MOCK_MODE ? Promise.resolve({}) : req(`/owner/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) }, true),

  // Holidays
  getHolidays: (month?: string) => MOCK_MODE
    ? Promise.resolve(month ? MOCK_HOLIDAYS.filter(h => h.date.startsWith(month)) : [...MOCK_HOLIDAYS])
    : req(`/holidays${month ? `?month=${month}` : ''}`),
  addHoliday: (body: object) => {
    if (MOCK_MODE) {
      const h = { id: Date.now().toString(), ...(body as any), createdAt: new Date().toISOString() };
      MOCK_HOLIDAYS.push(h);
      return Promise.resolve(h);
    }
    return req('/holidays', { method: 'POST', body: JSON.stringify(body) }, true);
  },
  deleteHoliday: (id: string) => {
    if (MOCK_MODE) { const i = MOCK_HOLIDAYS.findIndex(h => h.id === id); if (i !== -1) MOCK_HOLIDAYS.splice(i, 1); return Promise.resolve({}); }
    return req(`/holidays/${id}`, { method: 'DELETE' }, true);
  },
  editHoliday: (id: string, body: object) => {
    if (MOCK_MODE) { const h = MOCK_HOLIDAYS.find(h => h.id === id); if (h) Object.assign(h, body); return Promise.resolve(h); }
    return req(`/holidays/${id}`, { method: 'PUT', body: JSON.stringify(body) }, true);
  },

  // Leaves
  applyLeave: (body: object) => {
    if (MOCK_MODE) {
      const b = body as any;
      const leave = { id: Date.now().toString(), employeeId: 'EMP001', employeeName: 'Demo Employee', ...b, month: b.dates[0].slice(0, 7), status: 'pending', appliedAt: new Date().toISOString() };
      MOCK_LEAVES.unshift(leave);
      return Promise.resolve(leave);
    }
    return req('/leaves', { method: 'POST', body: JSON.stringify(body) });
  },
  getMyLeaves: () => MOCK_MODE ? Promise.resolve([...MOCK_LEAVES]) : req('/leaves/my'),
  getAllLeaves: (status?: string, month?: string) => {
    if (MOCK_MODE) {
      let r = [...MOCK_LEAVES];
      if (status) r = r.filter(l => l.status === status);
      if (month) r = r.filter(l => l.month === month);
      return Promise.resolve(r);
    }
    const q = [status && `status=${status}`, month && `month=${month}`].filter(Boolean).join('&');
    return req(`/leaves/all${q ? `?${q}` : ''}`, {}, true);
  },
  updateLeave: (id: string, status: string, note?: string) => {
    if (MOCK_MODE) {
      const l = MOCK_LEAVES.find(l => l.id === id);
      if (l) { l.status = status; l.ownerNote = note || ''; }
      return Promise.resolve(l);
    }
    return req(`/leaves/${id}`, { method: 'PUT', body: JSON.stringify({ status, note }) }, true);
  },

  // Attendance override (owner)
  overrideAttendance: (body: object) => {
    if (MOCK_MODE) {
      const b = body as any;
      const rec = MOCK_ATTENDANCE.records.find((r: any) => r.date === b.date);
      if (rec) { (rec as any).checkedIn = b.checkedIn; (rec as any).overriddenByOwner = true; }
      else { MOCK_ATTENDANCE.records.push({ date: b.date, checkedIn: b.checkedIn, checkInTime: new Date().toISOString(), photo: '', overriddenByOwner: true } as any); }
      return Promise.resolve({ date: b.date, checkedIn: b.checkedIn, overriddenByOwner: true });
    }
    return request('/attendance/override', { method: 'PUT', body: JSON.stringify(body) }, true);
  },

  // ── Pharma: Doctors ──────────────────────────────────────────────────────
  getDoctors: (filters?: { area?: string; pincode?: string; type?: string; search?: string }) => {
    const q = filters ? Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`).join('&') : '';
    return req(`/doctors${q ? `?${q}` : ''}`);
  },
  searchDoctors: (search: string, area?: string) => {
    const q = [`search=${encodeURIComponent(search)}`, area && `area=${encodeURIComponent(area)}`].filter(Boolean).join('&');
    return req(`/doctors?${q}`);
  },
  addDoctor: (body: object) => req('/doctors', { method: 'POST', body: JSON.stringify(body) }),
  updateDoctor: (id: string, body: object) => req(`/doctors/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDoctor: (id: string) => req(`/doctors/${id}`, { method: 'DELETE' }),

  // ── Pharma: Call Reports ─────────────────────────────────────────────────
  submitCallReport: (body: object) => req('/callreports', { method: 'POST', body: JSON.stringify(body) }),
  getMyCallReports: (month?: string, date?: string) => {
    const q = [month && `month=${month}`, date && `date=${date}`].filter(Boolean).join('&');
    return req(`/callreports/my${q ? `?${q}` : ''}`);
  },
  getTeamCallReports: (month?: string, employeeId?: string) => {
    const q = [month && `month=${month}`, employeeId && `employeeId=${employeeId}`].filter(Boolean).join('&');
    return req(`/callreports/team${q ? `?${q}` : ''}`);
  },
  getAllCallReports: (month?: string, employeeId?: string) => {
    const q = [month && `month=${month}`, employeeId && `employeeId=${employeeId}`].filter(Boolean).join('&');
    return req(`/callreports/all${q ? `?${q}` : ''}`, {}, true);
  },
  verifyCallReport: (id: string, verified: boolean, mrNote?: string) =>
    req(`/callreports/${id}/verify`, { method: 'PUT', body: JSON.stringify({ verified, mrNote }) }),

  // ── Pharma: Stock Requests ───────────────────────────────────────────────
  raiseStockRequest: (body: object) => req('/stockrequests', { method: 'POST', body: JSON.stringify(body) }),
  getMyStockRequests: (month?: string) => req(`/stockrequests/my${month ? `?month=${month}` : ''}`),
  getTeamStockRequests: (month?: string, status?: string) => {
    const q = [month && `month=${month}`, status && `status=${status}`].filter(Boolean).join('&');
    return req(`/stockrequests/team${q ? `?${q}` : ''}`);
  },
  getAllStockRequests: (month?: string, status?: string) => {
    const q = [month && `month=${month}`, status && `status=${status}`].filter(Boolean).join('&');
    return req(`/stockrequests/all${q ? `?${q}` : ''}`, {}, true);
  },
  approveStockRequest: (id: string, destination?: string) =>
    req(`/stockrequests/${id}/approve`, { method: 'PUT', body: JSON.stringify({ destination }) }),
  rejectStockRequest: (id: string, reason: string) =>
    req(`/stockrequests/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }),
  returnStock: (id: string, body: object) =>
    req(`/stockrequests/${id}/return`, { method: 'PUT', body: JSON.stringify(body) }),
  getIncentiveSummary: (employeeId: string, month: string) =>
    req(`/stockrequests/incentive-summary/${employeeId}/${month}`, {}, true),

  // ── Owner: MR management ─────────────────────────────────────────────────
  getMRList: () => req('/owner/mr-list', {}, true),
  getMRTeam: (mrId: string) => req(`/owner/mr/${mrId}/team`, {}, true),

  // ── Doctor Targets & Progress ─────────────────────────────────────────
  getMyProgress: (month?: string) =>
    req(`/targets/my-progress${month ? `?month=${month}` : ''}`),
  setTarget: (body: { employeeId: string; month: string; target: number }) =>
    req('/targets', { method: 'POST', body: JSON.stringify(body) }),
  getTeamProgress: (month?: string) => {
    return req(`/targets/team${month ? `?month=${month}` : ''}`);
  },
  getAllProgress: (month?: string, mrId?: string, area?: string) => {
    const q = [month && `month=${month}`, mrId && `mrId=${mrId}`, area && `area=${area}`].filter(Boolean).join('&');
    return req(`/targets/all${q ? `?${q}` : ''}`, {}, true);
  },
  getTargets: (month?: string) =>
    req(`/targets${month ? `?month=${month}` : ''}`),

  // ── Location / Places search (Nominatim proxy) ────────────────────────
  searchPlaces: (q: string) =>
    req(`/places/search?q=${encodeURIComponent(q)}`),
};
