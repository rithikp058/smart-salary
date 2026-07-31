import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../utils/api';
import { isMR, getMR, clearSession } from '../utils/auth';
import LocationSearchInput, { type LocationResult } from '../components/LocationSearchInput';

type Tab = 'overview' | 'calls' | 'stock' | 'employees' | 'doctors';

export default function MRDashboard() {
  const navigate = useNavigate();
  const mr = getMR();
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [alert, setAlert] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { if (!isMR()) { navigate('/mr-login'); return; } loadDashboard(); }, [selectedMonth]);

  async function loadDashboard() {
    setLoading(true);
    try { const d: any = await api.getMRDashboard(selectedMonth); setData(d); } catch {}
    setLoading(false);
  }

  function showAlert(msg: string, type: 'success' | 'error' = 'success') {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 4000);
  }

  const cs = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };

  const tabs: [Tab, string][] = [
    ['overview', '📊 Overview'],
    ['employees', '👥 My Team'],
    ['calls', '📞 Call Reports'],
    ['stock', '📦 Stock Approvals'],
    ['doctors', '🏥 Doctors'],
  ];

  return (
    <div className="min-h-screen" style={{ background: '#050b18' }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] opacity-10"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-8"
          style={{ background: 'radial-gradient(circle, #1d4ed8 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(5,11,24,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 0 15px rgba(16,185,129,0.4)' }}>🧑‍💼</div>
            <span className="font-bold text-white text-lg">Smart<span className="text-green-400">Salary</span> <span className="text-xs text-green-400 font-normal">MR</span></span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                {mr?.name?.charAt(0)?.toUpperCase() || 'M'}
              </div>
              <span className="text-xs text-slate-400">{mr?.name}</span>
            </div>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm text-white border border-white/8 outline-none" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <button onClick={() => { clearSession(); navigate('/mr-login'); }}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {alert && (
          <div className={`p-3 rounded-xl text-sm mb-5 flex items-center gap-2 ${alert.type === 'error' ? 'text-red-300 border border-red-500/20' : 'text-green-300 border border-green-500/20'}`}
            style={{ background: alert.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }}
            onClick={() => setAlert(null)}>
            {alert.type === 'error' ? '⚠️' : '✅'} {alert.msg}
          </div>
        )}

        {/* MR Info Banner */}
        <div className="rounded-2xl p-6 mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(29,78,216,0.1) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">👋 MR Dashboard — <span className="text-green-400">{mr?.name}</span></h2>
              <p className="text-slate-400 text-sm">
                ID: <span className="text-white font-semibold">{mr?.mrId}</span>
                <span className="mx-2">·</span>
                Area: <span className="text-white font-semibold">{mr?.area || 'N/A'}</span>
                {mr?.pincodes?.length > 0 && <span className="ml-2 text-slate-500">Pincodes: {mr.pincodes.join(', ')}</span>}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="text-xl font-bold text-green-400">{data?.totalCalls || 0}</div>
                <div className="text-xs text-slate-500">Total Calls</div>
              </div>
              <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
                <div className="text-xl font-bold text-yellow-400">{data?.pendingStocks || 0}</div>
                <div className="text-xs text-slate-500">Pending Stocks</div>
              </div>
              <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <div className="text-xl font-bold text-blue-400">{data?.employees?.length || 0}</div>
                <div className="text-xs text-slate-500">Employees</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap p-1 rounded-2xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {tabs.map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
              style={tab === t ? { background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 0 15px rgba(16,185,129,0.3)' } : {}}>
              {label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-10 text-slate-500">Loading...</div>}
        {!loading && tab === 'overview' && <MROverview data={data} cs={cs} />}
        {!loading && tab === 'employees' && <MRTeam data={data} cs={cs} showAlert={showAlert} onRefresh={loadDashboard} />}
        {!loading && tab === 'calls' && <MRCallReports selectedMonth={selectedMonth} showAlert={showAlert} cs={cs} mr={mr} />}
        {!loading && tab === 'stock' && <MRStockApprovals selectedMonth={selectedMonth} showAlert={showAlert} onRefresh={loadDashboard} cs={cs} mr={mr} />}
        {!loading && tab === 'doctors' && <MRDoctors data={data} showAlert={showAlert} cs={cs} mr={mr} />}
      </div>
    </div>
  );
}

// ── Overview ───────────────────────────────────────────────────────────────
function MROverview({ data, cs }: any) {
  if (!data) return <div className="text-center py-10 text-slate-600">No data available</div>;
  return (
    <div>
      {/* Employee performance cards */}
      <h3 className="text-white font-bold mb-4">👥 Team Performance — {data.month}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data.employees || []).map((emp: any) => (
          <div key={emp.employeeId} className="rounded-2xl p-5 transition-all hover:-translate-y-0.5" style={cs}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                {emp.employeeName?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <div className="text-white font-semibold text-sm">{emp.employeeName}</div>
                <div className="text-slate-500 text-xs">{emp.employeeId} · {emp.area}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg p-2" style={{ background: 'rgba(34,197,94,0.08)' }}>
                <div className="text-lg font-bold text-green-400">{emp.totalCalls}</div>
                <div className="text-xs text-slate-600">Calls</div>
              </div>
              <div className="rounded-lg p-2" style={{ background: 'rgba(59,130,246,0.08)' }}>
                <div className="text-lg font-bold text-blue-400">{emp.stockRequests}</div>
                <div className="text-xs text-slate-600">Stocks</div>
              </div>
              <div className="rounded-lg p-2" style={{ background: 'rgba(234,179,8,0.08)' }}>
                <div className="text-lg font-bold text-yellow-400">{emp.pendingStocks}</div>
                <div className="text-xs text-slate-600">Pending</div>
              </div>
            </div>
            {/* Daily target progress */}
            {(() => {
              const target = emp.targetCalls || 3;
              const today = new Date().toISOString().slice(0, 10);
              const todayCalls = (emp.recentCalls || []).filter((c: any) => c.visitDate === today).length;
              const pct = Math.min(100, Math.round((todayCalls / target) * 100));
              return (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Today's target</span>
                    <span className={pct >= 100 ? 'text-green-400 font-bold' : 'text-slate-400'}>{todayCalls}/{target} calls</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                </div>
              );
            })()}
            {emp.callsByType && (
              <div className="flex gap-2 mt-2 justify-center flex-wrap">
                {emp.callsByType.VIP > 0 && <span className="px-1.5 py-0.5 rounded text-xs text-yellow-400" style={{ background: 'rgba(234,179,8,0.1)' }}>VIP: {emp.callsByType.VIP}</span>}
                {emp.callsByType.Specialist > 0 && <span className="px-1.5 py-0.5 rounded text-xs text-purple-400" style={{ background: 'rgba(168,85,247,0.1)' }}>Spec: {emp.callsByType.Specialist}</span>}
                {emp.callsByType.Regular > 0 && <span className="px-1.5 py-0.5 rounded text-xs text-slate-400" style={{ background: 'rgba(255,255,255,0.05)' }}>Reg: {emp.callsByType.Regular}</span>}
              </div>
            )}
          </div>
        ))}
        {(!data.employees || data.employees.length === 0) && (
          <div className="col-span-full text-center py-10 text-slate-600">No employees assigned yet</div>
        )}
      </div>
    </div>
  );
}

// ── My Team ────────────────────────────────────────────────────────────────
function MRTeam({ data, cs, showAlert, onRefresh }: any) {
  const [targetInputs, setTargetInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  async function saveTarget(empId: string) {
    const val = Number(targetInputs[empId]);
    if (!val || val < 1) { showAlert('Target must be at least 1', 'error'); return; }
    setSaving(empId);
    try {
      await api.setEmployeeTarget(empId, val);
      showAlert(`✅ Daily target set to ${val} calls for ${empId}`);
      onRefresh();
    } catch (err: any) { showAlert(err.message, 'error'); }
    setSaving(null);
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={cs}>
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <div className="font-bold text-white">👥 My Team Members</div>
        <div className="text-xs text-slate-500">Set daily call targets per employee</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              {['Employee', 'Area', 'Pincodes', 'Total Calls', 'Stock Req', 'Daily Target', 'Set Target'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(!data?.employees || data.employees.length === 0) ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-600">No employees assigned yet</td></tr>
            ) : (data.employees || []).map((emp: any, i: number) => (
              <tr key={i} className="border-t border-white/4 hover:bg-white/2">
                <td className="px-5 py-3">
                  <div className="text-white font-semibold">{emp.employeeName}</div>
                  <div className="text-slate-500 text-xs">{emp.employeeId}</div>
                </td>
                <td className="px-5 py-3 text-slate-300">{emp.area || '—'}</td>
                <td className="px-5 py-3 text-slate-400 text-xs">{emp.pincodes?.join(', ') || '—'}</td>
                <td className="px-5 py-3 text-green-400 font-bold">{emp.totalCalls}</td>
                <td className="px-5 py-3 text-blue-400">{emp.stockRequests}</td>
                <td className="px-5 py-3">
                  <span className="px-2 py-1 rounded-lg text-xs font-bold text-green-400"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    {emp.targetCalls || 3} calls/day
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="1" max="20"
                      placeholder={String(emp.targetCalls || 3)}
                      value={targetInputs[emp.employeeId] || ''}
                      onChange={e => setTargetInputs(p => ({ ...p, [emp.employeeId]: e.target.value }))}
                      className="w-16 px-2 py-1.5 rounded-lg text-xs text-white border border-white/8 outline-none text-center"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    />
                    <button
                      onClick={() => saveTarget(emp.employeeId)}
                      disabled={saving === emp.employeeId || !targetInputs[emp.employeeId]}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-green-400 hover:text-white transition-all disabled:opacity-40"
                      style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      {saving === emp.employeeId ? '...' : 'Set'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// ── Call Reports ───────────────────────────────────────────────────────────
function MRCallReports({ selectedMonth, showAlert, cs, mr }: any) {
  const [reports, setReports] = useState<any[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.getAllCallReports({ month: selectedMonth }).then((d: any) => setReports(d)).catch(() => {});
  }, [selectedMonth]);

  const filtered = filter ? reports.filter((r: any) => r.employeeId === filter) : reports;
  const empIds = [...new Set(reports.map((r: any) => r.employeeId))];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white border border-white/8 outline-none" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <option value="">All Employees</option>
          {empIds.map((id: any) => <option key={id} value={id}>{id}</option>)}
        </select>
        <div className="text-xs text-slate-500">{filtered.length} reports</div>
      </div>
      <div className="rounded-2xl overflow-hidden" style={cs}>
        <div className="p-4 border-b border-white/5 font-bold text-white text-sm">📞 Call Reports — {selectedMonth}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Employee', 'Doctor', 'Hospital', 'Type', 'Date', 'Location', 'Photo'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-600">No call reports</td></tr>
              ) : filtered.map((r: any, i: number) => (
                <tr key={i} className="border-t border-white/4 hover:bg-white/2">
                  <td className="px-4 py-3">
                    <div className="text-white font-semibold text-xs">{r.employeeName}</div>
                    <div className="text-slate-500 text-xs">{r.employeeId}</div>
                  </td>
                  <td className="px-4 py-3 text-white text-xs">{r.doctorName}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{r.hospitalName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.doctorType === 'VIP' ? 'text-yellow-400' : r.doctorType === 'Specialist' ? 'text-purple-400' : 'text-slate-400'}`}
                      style={{ background: r.doctorType === 'VIP' ? 'rgba(234,179,8,0.1)' : r.doctorType === 'Specialist' ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.05)' }}>
                      {r.doctorType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{r.visitDate}</td>
                  <td className="px-4 py-3 text-xs">
                    {r.locationValid !== undefined ? (
                      <span className={r.locationValid ? 'text-green-400' : 'text-yellow-400'}>
                        {r.locationValid ? '✅ Verified' : '⚠️ Unverified'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.photo && <img src={r.photo} className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-white/10" onClick={() => window.open(r.photo)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Stock Approvals ────────────────────────────────────────────────────────
function MRStockApprovals({ selectedMonth, showAlert, onRefresh, cs }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [returnModal, setReturnModal] = useState<any>(null);
  const [returnForm, setReturnForm] = useState({ returnStatus: 'returned', returnQuantity: '', returnNote: '' });

  useEffect(() => { loadRequests(); }, [selectedMonth, filter]);

  async function loadRequests() {
    try {
      const d: any = await api.getAllStockRequests({ month: selectedMonth, status: filter !== 'all' ? filter : undefined });
      setRequests(d);
    } catch {}
  }

  async function approve(id: string) {
    try {
      await api.approveStockRequest(id, { movementType: 'godown_to_shop', destination: 'Medical Shop' });
      showAlert('✅ Stock request approved!');
      loadRequests(); onRefresh();
    } catch (err: any) { showAlert(err.message, 'error'); }
  }

  async function reject(id: string) {
    try {
      await api.rejectStockRequest(id, { approvalNote: 'Rejected by MR' });
      showAlert('Request rejected');
      loadRequests(); onRefresh();
    } catch (err: any) { showAlert(err.message, 'error'); }
  }

  async function submitReturn() {
    if (!returnModal) return;
    try {
      await api.markStockReturn(returnModal.id || returnModal._id, {
        returnStatus: returnForm.returnStatus,
        returnQuantity: Number(returnForm.returnQuantity),
        returnNote: returnForm.returnNote,
      });
      showAlert(`✅ Marked as ${returnForm.returnStatus}`);
      setReturnModal(null);
      setReturnForm({ returnStatus: 'returned', returnQuantity: '', returnNote: '' });
      loadRequests(); onRefresh();
    } catch (err: any) { showAlert(err.message, 'error'); }
  }

  const statusColor: Record<string, string> = { pending: 'text-yellow-400', mr_approved: 'text-blue-400', owner_approved: 'text-green-400', rejected: 'text-red-400' };
  const statusBg: Record<string, string> = { pending: 'rgba(234,179,8,0.1)', mr_approved: 'rgba(59,130,246,0.1)', owner_approved: 'rgba(34,197,94,0.1)', rejected: 'rgba(239,68,68,0.1)' };
  const inputCls = "w-full px-3 py-2 rounded-xl text-sm text-white border border-white/8 outline-none";
  const inputStyle = { background: 'rgba(255,255,255,0.04)' };

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'pending', 'mr_approved', 'owner_approved', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filter === f ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            style={filter === f ? { background: 'linear-gradient(135deg, #059669, #10b981)' } : { background: 'rgba(255,255,255,0.04)' }}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>
      <div className="rounded-2xl overflow-hidden" style={cs}>
        <div className="p-4 border-b border-white/5 font-bold text-white text-sm">📦 Stock Requests — {selectedMonth}</div>
        <div className="divide-y divide-white/4">
          {requests.length === 0 ? (
            <div className="text-center py-10 text-slate-600">No requests</div>
          ) : requests.map((r: any, i: number) => (
            <div key={i} className="px-5 py-4 hover:bg-white/2 transition-colors">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-white font-semibold">{r.productName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[r.status] || 'text-slate-400'}`}
                      style={{ background: statusBg[r.status] || 'rgba(255,255,255,0.05)' }}>
                      {r.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-slate-400 text-xs">{r.employeeName} → {r.doctorName} · {r.hospitalName}</div>
                  <div className="flex gap-3 mt-1 text-xs text-slate-500">
                    <span>Qty: <span className="text-white">{r.quantity}</span></span>
                    <span>📅 {r.requestDate}</span>
                    {r.returnStatus && r.returnStatus !== 'none' && (
                      <span className="text-yellow-400">↩ {r.returnStatus} ({r.returnQuantity})</span>
                    )}
                  </div>
                  {r.approvalNote && <div className="text-xs text-slate-600 mt-1">Note: {r.approvalNote}</div>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {r.photo && <img src={r.photo} className="w-12 h-12 rounded-xl object-cover border border-white/10 cursor-pointer" onClick={() => window.open(r.photo)} />}
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => approve(r.id || r._id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-green-400 hover:text-white transition-all"
                        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        ✅ Approve
                      </button>
                      <button onClick={() => reject(r.id || r._id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:text-white transition-all"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        ❌ Reject
                      </button>
                    </>
                  )}
                  {(r.status === 'mr_approved' || r.status === 'owner_approved') && (!r.returnStatus || r.returnStatus === 'none') && (
                    <button onClick={() => setReturnModal(r)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-yellow-400 hover:text-white transition-all"
                      style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
                      ↩ Mark Return
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Return Modal */}
      {returnModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#0d1829', border: '1px solid rgba(234,179,8,0.2)' }}>
            <div className="font-bold text-white mb-1">↩ Mark Stock Return</div>
            <div className="text-xs text-slate-500 mb-4">{returnModal.productName} · {returnModal.doctorName}</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wide">Return Status</label>
                <select value={returnForm.returnStatus} onChange={e => setReturnForm(f => ({ ...f, returnStatus: e.target.value }))} className={inputCls} style={inputStyle}>
                  <option value="returned">Returned</option>
                  <option value="damaged">Damaged</option>
                  <option value="issue">Issue Reported</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wide">Return Quantity</label>
                <input type="number" min="0" max={returnModal.quantity} value={returnForm.returnQuantity}
                  onChange={e => setReturnForm(f => ({ ...f, returnQuantity: e.target.value }))} className={inputCls} style={inputStyle} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wide">Note</label>
                <textarea value={returnForm.returnNote} onChange={e => setReturnForm(f => ({ ...f, returnNote: e.target.value }))}
                  rows={2} className={inputCls} style={{ ...inputStyle, resize: 'none' }} placeholder="Reason for return..." />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setReturnModal(null)} className="flex-1 py-2.5 rounded-xl text-xs text-slate-400 border border-white/10">Cancel</button>
              <button onClick={submitReturn} className="flex-1 py-2.5 rounded-xl font-bold text-white text-xs" style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
                ↩ Submit Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MR Doctors Tab ─────────────────────────────────────────────────────────
function MRDoctors({ data, showAlert, cs, mr }: any) {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  // Form state
  const [locText, setLocText] = useState('');       // visible location search text
  const [selectedLoc, setSelectedLoc] = useState<LocationResult | null>(null);
  const [form, setForm] = useState({
    name: '', hospital: '', type: 'Regular',
    area: '', pincode: '', assignedEmployeeIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const employees: any[] = data?.employees || [];

  useEffect(() => { loadDoctors(); }, []);

  async function loadDoctors() {
    try { const d: any = await api.getDoctors(); setDoctors(d); } catch {}
  }

  function handleLocSelect(loc: LocationResult) {
    setSelectedLoc(loc);
    // Auto-fill hospital name if blank, area, pincode
    setForm(f => ({
      ...f,
      hospital: f.hospital || loc.name,
      area: loc.area || loc.city || f.area,
      pincode: loc.pincode || f.pincode,
    }));
  }

  function toggleEmployee(empId: string) {
    setForm(f => ({
      ...f,
      assignedEmployeeIds: f.assignedEmployeeIds.includes(empId)
        ? f.assignedEmployeeIds.filter(id => id !== empId)
        : [...f.assignedEmployeeIds, empId],
    }));
  }

  async function saveDoctor(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { showAlert('Doctor name is required', 'error'); return; }
    if (!form.hospital.trim()) { showAlert('Hospital name is required', 'error'); return; }
    setSaving(true);
    try {
      await api.addDoctor({
        name: form.name,
        hospital: form.hospital,
        type: form.type,
        area: form.area,
        pincode: form.pincode,
        lat: selectedLoc?.lat ?? null,
        lng: selectedLoc?.lng ?? null,
        locationAddress: selectedLoc?.displayName || '',
        assignedEmployeeIds: form.assignedEmployeeIds,
      });
      showAlert('✅ Doctor added and assigned!');
      setShowForm(false);
      resetForm();
      loadDoctors();
    } catch (err: any) { showAlert(err.message, 'error'); }
    setSaving(false);
  }

  async function deleteDoctor(id: string) {
    if (!confirm('Delete this doctor?')) return;
    try {
      await api.deleteDoctor(id);
      showAlert('Doctor removed');
      setDoctors(prev => prev.filter((d: any) => (d.id || d._id) !== id));
    } catch (err: any) { showAlert(err.message, 'error'); }
  }

  async function toggleAssignEmployee(doctorId: string, empId: string, currentList: string[]) {
    const newList = currentList.includes(empId)
      ? currentList.filter(id => id !== empId)
      : [...currentList, empId];
    try {
      await api.updateDoctor(doctorId, { assignedEmployeeIds: newList });
      setDoctors(prev => prev.map((d: any) =>
        (d.id || d._id) === doctorId ? { ...d, assignedEmployeeIds: newList } : d
      ));
      showAlert(newList.includes(empId) ? '✅ Employee assigned' : 'Employee unassigned');
    } catch (err: any) { showAlert(err.message, 'error'); }
  }

  function resetForm() {
    setLocText(''); setSelectedLoc(null);
    setForm({ name: '', hospital: '', type: 'Regular', area: '', pincode: '', assignedEmployeeIds: [] });
  }

  const filtered = doctors.filter(d =>
    (!search || d.name.toLowerCase().includes(search.toLowerCase()) || d.hospital.toLowerCase().includes(search.toLowerCase())) &&
    (!filterType || d.type === filterType)
  );

  const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/8 outline-none focus:border-green-500/40 transition-all';
  const inputStyle = { background: 'rgba(255,255,255,0.04)' };

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search doctors or hospitals…"
          className="flex-1 px-3 py-2 rounded-xl text-sm text-white border border-white/8 outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', minWidth: 180 }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white border border-white/8 outline-none"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <option value="">All Types</option>
          <option value="VIP">VIP</option>
          <option value="Specialist">Specialist</option>
          <option value="Regular">Regular</option>
        </select>
        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
          {showForm ? '✕ Cancel' : '+ Add Doctor'}
        </button>
      </div>

      {/* Add Doctor Form */}
      {showForm && (
        <div className="rounded-2xl p-6 mb-6" style={cs}>
          <div className="font-bold text-white mb-1">🏥 Add New Doctor</div>
          <div className="text-xs text-slate-500 mb-4">
            Search the hospital/clinic location — coordinates stored automatically. No manual entry needed.
          </div>
          <form onSubmit={saveDoctor} className="space-y-4">
            {/* Location search — the key field */}
            <LocationSearchInput
              label="Search Hospital / Clinic Location"
              value={locText}
              onChange={setLocText}
              onSelect={handleLocSelect}
              placeholder="e.g. Yashoda Hospital Hitech City"
            />

            {/* Show selected location confirmation */}
            {selectedLoc && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <span className="text-green-400">📍</span>
                <div>
                  <span className="text-green-300 font-semibold">{selectedLoc.name}</span>
                  {selectedLoc.area && <span className="text-slate-400 ml-2">{selectedLoc.area}</span>}
                  {selectedLoc.pincode && <span className="text-slate-500 ml-2">PIN: {selectedLoc.pincode}</span>}
                  <span className="text-slate-700 ml-2 text-xs">
                    ({selectedLoc.lat.toFixed(5)}, {selectedLoc.lng.toFixed(5)})
                  </span>
                </div>
                <button type="button" onClick={() => { setSelectedLoc(null); setLocText(''); }}
                  className="ml-auto text-slate-600 hover:text-red-400 transition-colors">✕</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Doctor Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required className={inputCls} style={inputStyle} placeholder="Dr. Full Name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Hospital Name *</label>
                <input value={form.hospital} onChange={e => setForm(f => ({ ...f, hospital: e.target.value }))}
                  required className={inputCls} style={inputStyle} placeholder="Auto-filled from location" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Area</label>
                <input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="Auto-filled from location" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Pincode</label>
                <input value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="Auto-filled from location" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Doctor Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className={inputCls} style={inputStyle}>
                  <option value="Regular">Regular</option>
                  <option value="VIP">VIP</option>
                  <option value="Specialist">Specialist</option>
                </select>
              </div>
            </div>

            {/* Assign to employees */}
            {employees.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                  Assign to Employees (select one or more)
                </label>
                <div className="flex flex-wrap gap-2">
                  {employees.map((emp: any) => {
                    const assigned = form.assignedEmployeeIds.includes(emp.employeeId);
                    return (
                      <button key={emp.employeeId} type="button" onClick={() => toggleEmployee(emp.employeeId)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={assigned
                          ? { background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7' }
                          : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}>
                        {assigned ? '✓ ' : ''}{emp.employeeName}
                        <span className="ml-1 opacity-60">{emp.employeeId}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button type="submit" disabled={saving}
              className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              {saving ? 'Saving…' : '🏥 Add Doctor & Assign'}
            </button>
          </form>
        </div>
      )}

      {/* Doctor cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          {doctors.length === 0 ? 'No doctors added yet. Click "+ Add Doctor" to get started.' : 'No doctors match your search.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d: any) => {
            const docId = d.id || d._id;
            const assigned: string[] = d.assignedEmployeeIds || [];
            return (
              <div key={docId} className="rounded-2xl p-4 transition-all hover:-translate-y-0.5" style={cs}>
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-white text-sm">{d.name}</div>
                    <div className="text-slate-400 text-xs mt-0.5">🏥 {d.hospital}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0
                    ${d.type === 'VIP' ? 'text-yellow-400' : d.type === 'Specialist' ? 'text-purple-400' : 'text-slate-400'}`}
                    style={{ background: d.type === 'VIP' ? 'rgba(234,179,8,0.1)' : d.type === 'Specialist' ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.05)' }}>
                    {d.type}
                  </span>
                </div>

                {/* Location info */}
                <div className="text-slate-500 text-xs mb-1">
                  📍 {d.area || '—'}{d.pincode ? ` · ${d.pincode}` : ''}
                </div>
                {d.lat && d.lng ? (
                  <div className="text-green-600 text-xs mb-2">✅ GPS stored</div>
                ) : (
                  <div className="text-yellow-600 text-xs mb-2">⚠️ No GPS — search location to set</div>
                )}
                {d.locationAddress && (
                  <div className="text-slate-700 text-xs mb-2 truncate" title={d.locationAddress}>{d.locationAddress}</div>
                )}

                {/* Assigned employees */}
                <div className="mb-3">
                  <div className="text-xs text-slate-500 mb-1.5 font-semibold uppercase tracking-wide">Assigned To</div>
                  <div className="flex flex-wrap gap-1.5">
                    {employees.map((emp: any) => {
                      const isAssigned = assigned.includes(emp.employeeId);
                      return (
                        <button key={emp.employeeId} type="button"
                          onClick={() => toggleAssignEmployee(docId, emp.employeeId, assigned)}
                          title={isAssigned ? 'Click to unassign' : 'Click to assign'}
                          className="px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                          style={isAssigned
                            ? { background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#6ee7b7' }
                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}>
                          {isAssigned ? '✓ ' : '+ '}{emp.employeeName.split(' ')[0]}
                        </button>
                      );
                    })}
                    {employees.length === 0 && <span className="text-slate-600 text-xs">No team members yet</span>}
                  </div>
                </div>

                <button onClick={() => deleteDoctor(docId)}
                  className="text-red-400/50 hover:text-red-400 text-xs transition-colors">
                  🗑 Remove Doctor
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
