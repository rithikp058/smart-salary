import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Navbar from '../components/Navbar';
import LocationSearch from '../components/LocationSearch';
import type { PlaceResult } from '../components/LocationSearch';
import { api } from '../utils/api';
import { isLoggedIn, isMR, getUser } from '../utils/auth';

type Tab = 'overview' | 'calls' | 'stock' | 'attendance' | 'targets' | 'doctors';

const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };
const badge: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30',
  approved_mr: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  approved_owner: 'bg-green-500/15 text-green-300 border border-green-500/30',
  rejected: 'bg-red-500/15 text-red-300 border border-red-500/30',
};

export default function MRDashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const [tab, setTab] = useState<Tab>('overview');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [teamCalls, setTeamCalls] = useState<any[]>([]);
  const [teamStock, setTeamStock] = useState<any[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<any[]>([]);
  const [teamProgress, setTeamProgress] = useState<any[]>([]);
  const [targetInputs, setTargetInputs] = useState<Record<string, number>>({});
  const [savingTarget, setSavingTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [returnModal, setReturnModal] = useState<any>(null);
  const [returnForm, setReturnForm] = useState({ returnedQuantity: 0, returnReason: '', damagedQuantity: 0, damageNote: '' });

  // Doctor management state
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [doctorForm, setDoctorForm] = useState({
    name: '', hospital: '', type: 'Regular',
    phone: '', area: '', pincode: '',
    latitude: null as number | null,
    longitude: null as number | null,
    locationLabel: '',
  });
  const [savingDoctor, setSavingDoctor] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return; }
    if (!isMR()) { navigate('/dashboard'); return; }
    loadData();
    loadDoctors();
  }, [month]);

  async function loadData() {
    setLoading(true);
    try {
      const [calls, stock, att, progress] = await Promise.all([
        api.getTeamCallReports(month).catch(() => []),
        api.getTeamStockRequests(month).catch(() => []),
        api.getAllAttendance(month).catch(() => []),
        api.getTeamProgress(month).catch(() => []),
      ]);
      setTeamCalls(Array.isArray(calls) ? calls : []);
      setTeamStock(Array.isArray(stock) ? stock : []);
      setTeamAttendance(Array.isArray(att) ? att : []);
      const prog = Array.isArray(progress) ? progress : [];
      setTeamProgress(prog);
      // Pre-fill target inputs with existing targets
      const inputs: Record<string, number> = {};
      prog.forEach((p: any) => { if (p.target > 0) inputs[p.employeeId] = p.target; });
      setTargetInputs(inputs);
    } catch { }
    setLoading(false);
  }

  async function handleVerifyCall(id: string, verified: boolean) {
    try {
      await api.verifyCallReport(id, verified);
      setTeamCalls(prev => prev.map(c => c.id === id || c._id === id ? { ...c, verifiedByMR: verified } : c));
      setAlert({ msg: `Call report ${verified ? 'verified' : 'unverified'}`, type: 'success' });
    } catch (err: any) { setAlert({ msg: err.message, type: 'error' }); }
  }

  async function handleApproveStock(id: string) {
    try {
      await api.approveStockRequest(id);
      setTeamStock(prev => prev.map(s => s.id === id || s._id === id ? { ...s, status: 'approved_mr' } : s));
      setAlert({ msg: 'Stock request approved', type: 'success' });
    } catch (err: any) { setAlert({ msg: err.message, type: 'error' }); }
  }

  async function handleRejectStock(id: string) {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await api.rejectStockRequest(id, reason);
      setTeamStock(prev => prev.map(s => s.id === id || s._id === id ? { ...s, status: 'rejected' } : s));
      setAlert({ msg: 'Stock request rejected', type: 'success' });
    } catch (err: any) { setAlert({ msg: err.message, type: 'error' }); }
  }

  async function handleSaveTarget(employeeId: string, employeeName: string) {
    const target = targetInputs[employeeId];
    if (!target || target < 1) { setAlert({ msg: 'Target must be at least 1', type: 'error' }); return; }
    setSavingTarget(employeeId);
    try {
      await api.setTarget({ employeeId, month, target });
      setTeamProgress(prev => prev.map(p =>
        p.employeeId === employeeId
          ? { ...p, target, percentage: Math.min(100, Math.round((p.visited / target) * 100)) }
          : p
      ));
      setAlert({ msg: `Target set: ${employeeName} → ${target} doctors for ${month}`, type: 'success' });
    } catch (err: any) { setAlert({ msg: err.message, type: 'error' }); }
    setSavingTarget(null);
  }

  async function loadDoctors() {
    try {
      const data = await api.getDoctors();
      setDoctors(Array.isArray(data) ? data : []);
    } catch { }
  }

  function handleLocationSelect(place: PlaceResult) {
    setDoctorForm(f => ({
      ...f,
      hospital: f.hospital || place.name,
      area: place.area || place.city || '',
      pincode: place.pincode || '',
      latitude: place.latitude,
      longitude: place.longitude,
      locationLabel: place.name + (place.area ? ` — ${place.area}` : '') + (place.city ? `, ${place.city}` : ''),
    }));
  }

  function openAddDoctor() {
    setEditingDoctor(null);
    setDoctorForm({ name: '', hospital: '', type: 'Regular', phone: '', area: '', pincode: '', latitude: null, longitude: null, locationLabel: '' });
    setShowDoctorForm(true);
  }

  function openEditDoctor(doc: any) {
    setEditingDoctor(doc);
    setDoctorForm({
      name: doc.name, hospital: doc.hospital, type: doc.type || 'Regular',
      phone: doc.phone || '', area: doc.area || '', pincode: doc.pincode || '',
      latitude: doc.latitude, longitude: doc.longitude,
      locationLabel: doc.hospital + (doc.area ? ` — ${doc.area}` : ''),
    });
    setShowDoctorForm(true);
  }

  async function handleSaveDoctor() {
    if (!doctorForm.name.trim()) { setAlert({ msg: 'Doctor name is required', type: 'error' }); return; }
    if (!doctorForm.hospital.trim()) { setAlert({ msg: 'Hospital name is required', type: 'error' }); return; }
    if (!doctorForm.area.trim()) { setAlert({ msg: 'Please search and select a location first', type: 'error' }); return; }
    if (!doctorForm.pincode.trim()) { setAlert({ msg: 'Pincode is required — select a location with pincode', type: 'error' }); return; }
    setSavingDoctor(true);
    try {
      const payload = {
        name: doctorForm.name.trim(),
        hospital: doctorForm.hospital.trim(),
        type: doctorForm.type,
        phone: doctorForm.phone.trim(),
        area: doctorForm.area.trim(),
        pincode: doctorForm.pincode.trim(),
        latitude: doctorForm.latitude,
        longitude: doctorForm.longitude,
      };
      if (editingDoctor) {
        const updated = await api.updateDoctor(editingDoctor._id || editingDoctor.id, payload);
        setDoctors(prev => prev.map(d => (d._id || d.id) === (editingDoctor._id || editingDoctor.id) ? updated : d));
        setAlert({ msg: 'Doctor updated successfully', type: 'success' });
      } else {
        const created = await api.addDoctor(payload);
        setDoctors(prev => [...prev, created as any]);
        setAlert({ msg: 'Doctor added successfully', type: 'success' });
      }
      setShowDoctorForm(false);
      setEditingDoctor(null);
    } catch (err: any) { setAlert({ msg: err.message, type: 'error' }); }
    setSavingDoctor(false);
  }

  async function handleDeleteDoctor(id: string, name: string) {
    if (!confirm(`Remove Dr. ${name} from the database?`)) return;
    try {
      await api.deleteDoctor(id);
      setDoctors(prev => prev.filter(d => (d._id || d.id) !== id));
      setAlert({ msg: 'Doctor removed', type: 'success' });
    } catch (err: any) { setAlert({ msg: err.message, type: 'error' }); }
  }

  async function handleReturn() {
    if (!returnModal) return;
    try {
      await api.returnStock(returnModal.id || returnModal._id, returnForm);
      setTeamStock(prev => prev.map(s =>
        (s.id === returnModal.id || s._id === returnModal._id)
          ? { ...s, returned: returnForm.returnedQuantity > 0, returnedQuantity: returnForm.returnedQuantity, damaged: returnForm.damagedQuantity > 0, damagedQuantity: returnForm.damagedQuantity }
          : s
      ));
      setAlert({ msg: 'Return recorded successfully', type: 'success' });
      setReturnModal(null);
      setReturnForm({ returnedQuantity: 0, returnReason: '', damagedQuantity: 0, damageNote: '' });
    } catch (err: any) { setAlert({ msg: err.message, type: 'error' }); }
  }

  // Compute overview stats
  const uniqueEmployees = [...new Set(teamCalls.map(c => c.employeeId))];
  const totalCalls = teamCalls.length;
  const verifiedCalls = teamCalls.filter(c => c.verifiedByMR).length;
  const pendingStock = teamStock.filter(s => s.status === 'pending').length;

  const tabs: [Tab, string, string][] = [
    ['overview', '📊', 'Overview'],
    ['targets', '🎯', 'Targets'],
    ['doctors', '👨‍⚕️', 'Doctors'],
    ['calls', '📋', 'Call Reports'],
    ['stock', '📦', 'Stock Requests'],
    ['attendance', '📅', 'Attendance'],
  ];

  return (
    <div className="min-h-screen" style={{ background: '#050b18' }}>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">MR Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Welcome, {user?.name} · Medical Representative</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none"
              style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>

        {alert && (
          <div className={`p-3 rounded-xl text-sm mb-5 flex items-center gap-2 ${alert.type === 'success' ? 'text-green-300 border border-green-500/20' : 'text-red-300 border border-red-500/20'}`}
            style={{ background: alert.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)' }}>
            {alert.type === 'success' ? '✅' : '⚠️'} {alert.msg}
            <button onClick={() => setAlert(null)} className="ml-auto text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map(([key, icon, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${tab === key ? 'text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-white border border-transparent hover:border-white/10'}`}
              style={tab === key ? { background: 'rgba(59,130,246,0.1)' } : { background: 'rgba(255,255,255,0.03)' }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center text-slate-400 py-12">Loading...</div>}

        {/* Overview */}
        {!loading && tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ['👥', 'Team Size', uniqueEmployees.length, 'employees'],
                ['📋', 'Total Calls', totalCalls, 'this month'],
                ['✅', 'Verified', verifiedCalls, 'calls'],
                ['📦', 'Pending Stock', pendingStock, 'requests'],
              ].map(([icon, label, val, sub]) => (
                <div key={label as string} className="rounded-2xl p-5" style={cardStyle}>
                  <div className="text-2xl mb-2">{icon}</div>
                  <div className="text-2xl font-bold text-white">{val}</div>
                  <div className="text-xs text-slate-400 mt-1">{label}</div>
                  <div className="text-xs text-slate-600">{sub}</div>
                </div>
              ))}
            </div>

            {/* Per-employee summary */}
            <div className="rounded-2xl p-6" style={cardStyle}>
              <h3 className="text-white font-semibold mb-4">Team Performance</h3>
              {uniqueEmployees.length === 0 ? (
                <p className="text-slate-500 text-sm">No activity recorded this month.</p>
              ) : (
                <div className="space-y-4">
                  {uniqueEmployees.map(empId => {
                    const empCalls = teamCalls.filter(c => c.employeeId === empId);
                    const empStock = teamStock.filter(s => s.employeeId === empId);
                    const prog = teamProgress.find(p => p.employeeId === empId);
                    const name = empCalls[0]?.employeeName || prog?.employeeName || empId;
                    const visited = prog?.visited ?? empCalls.length;
                    const target = prog?.target ?? 0;
                    const pct = target > 0 ? Math.min(100, Math.round((visited / target) * 100)) : 0;
                    return (
                      <div key={empId} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                          <div>
                            <div className="text-white text-sm font-medium">{name}</div>
                            <div className="text-slate-500 text-xs">{empId}</div>
                          </div>
                          <div className="flex gap-3 text-xs text-slate-400">
                            <span>📋 {empCalls.length} calls</span>
                            <span>✅ {empCalls.filter(c => c.verifiedByMR).length} verified</span>
                            <span>📦 {empStock.length} stock</span>
                          </div>
                        </div>
                        {target > 0 ? (
                          <>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-400">🏥 Doctor visits: <span className="text-white font-semibold">{visited} / {target}</span></span>
                              <span className={`font-bold ${pct >= 100 ? 'text-green-400' : pct >= 60 ? 'text-blue-400' : pct >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>{pct}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  background: pct >= 100 ? 'linear-gradient(90deg,#059669,#10b981)' : pct >= 60 ? 'linear-gradient(90deg,#1d4ed8,#3b82f6)' : pct >= 30 ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,#dc2626,#ef4444)',
                                }} />
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-600">🎯 No target set — go to Targets tab to assign</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Targets Tab */}
        {!loading && tab === 'targets' && (
          <div className="rounded-2xl p-6" style={cardStyle}>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <h3 className="text-white font-semibold">🎯 Monthly Doctor Targets — {month}</h3>
                <p className="text-slate-500 text-xs mt-0.5">Set how many doctors each employee must visit this month</p>
              </div>
            </div>

            {teamProgress.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No employees found under your team. Assign employees to your MR ID first.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Header row */}
                <div className="grid grid-cols-12 gap-3 px-3 text-xs text-slate-500 uppercase tracking-wide font-semibold">
                  <div className="col-span-3">Employee</div>
                  <div className="col-span-2 text-center">Target</div>
                  <div className="col-span-5">Progress</div>
                  <div className="col-span-2 text-center">Action</div>
                </div>

                {teamProgress.map(p => {
                  const pct = p.target > 0 ? Math.min(100, Math.round((p.visited / p.target) * 100)) : 0;
                  return (
                    <div key={p.employeeId} className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      {/* Employee */}
                      <div className="col-span-3">
                        <div className="text-white text-sm font-medium truncate">{p.employeeName}</div>
                        <div className="text-slate-500 text-xs">{p.employeeId}</div>
                        {p.area && <div className="text-slate-600 text-xs">📍 {p.area}</div>}
                      </div>

                      {/* Target input */}
                      <div className="col-span-2 flex justify-center">
                        <input
                          type="number" min="1" max="100"
                          value={targetInputs[p.employeeId] ?? p.target ?? ''}
                          onChange={e => setTargetInputs(prev => ({ ...prev, [p.employeeId]: Number(e.target.value) }))}
                          placeholder="—"
                          className="w-16 text-center px-2 py-1.5 rounded-lg text-sm text-white border border-white/10 outline-none"
                          style={{ background: 'rgba(255,255,255,0.06)' }}
                        />
                      </div>

                      {/* Progress bar */}
                      <div className="col-span-5">
                        {p.target > 0 ? (
                          <>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-400">
                                <span className="text-white font-semibold">{p.visited}</span> / {p.target} visited
                              </span>
                              <span className={`font-bold text-xs ${pct >= 100 ? 'text-green-400' : pct >= 60 ? 'text-blue-400' : pct >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {pct}%
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  background: pct >= 100 ? 'linear-gradient(90deg,#059669,#10b981)' : pct >= 60 ? 'linear-gradient(90deg,#1d4ed8,#3b82f6)' : pct >= 30 ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,#dc2626,#ef4444)',
                                }} />
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-600 text-xs">No target set yet</span>
                        )}
                      </div>

                      {/* Save button */}
                      <div className="col-span-2 flex justify-center">
                        <button
                          onClick={() => handleSaveTarget(p.employeeId, p.employeeName)}
                          disabled={savingTarget === p.employeeId || !targetInputs[p.employeeId]}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 disabled:opacity-40"
                          style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                          {savingTarget === p.employeeId ? '...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Doctors Tab */}
        {tab === 'doctors' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-white font-semibold">👨‍⚕️ Doctor Database</h3>
                <p className="text-slate-500 text-xs mt-0.5">Add and manage doctors for your team's area</p>
              </div>
              <button onClick={openAddDoctor}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                + Add Doctor
              </button>
            </div>

            {/* Add / Edit Form */}
            {showDoctorForm && (
              <div className="rounded-2xl p-5" style={cardStyle}>
                <h4 className="text-white font-semibold mb-4">
                  {editingDoctor ? `Edit Dr. ${editingDoctor.name}` : 'Add New Doctor'}
                </h4>
                <div className="space-y-4">
                  {/* Location search — primary field */}
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">
                      🔍 Search Hospital / Clinic Location *
                    </label>
                    <LocationSearch
                      onSelect={handleLocationSelect}
                      placeholder="Type hospital name, e.g. Yashoda Hitech City..."
                      initialValue={doctorForm.locationLabel}
                    />
                    <p className="text-slate-600 text-xs mt-1">
                      Select from suggestions — area, pincode &amp; coordinates are auto-filled
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Doctor Name *</label>
                      <input
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        placeholder="Dr. Full Name"
                        value={doctorForm.name}
                        onChange={e => setDoctorForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Hospital Name *</label>
                      <input
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        placeholder="Auto-filled from location"
                        value={doctorForm.hospital}
                        onChange={e => setDoctorForm(f => ({ ...f, hospital: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Area</label>
                      <input
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        placeholder="Auto-filled from location"
                        value={doctorForm.area}
                        onChange={e => setDoctorForm(f => ({ ...f, area: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Pincode</label>
                      <input
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        placeholder="Auto-filled from location"
                        value={doctorForm.pincode}
                        onChange={e => setDoctorForm(f => ({ ...f, pincode: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Doctor Type</label>
                      <select
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        value={doctorForm.type}
                        onChange={e => setDoctorForm(f => ({ ...f, type: e.target.value }))}>
                        <option value="Regular">👨‍⚕️ Regular</option>
                        <option value="Specialist">🔬 Specialist</option>
                        <option value="VIP">⭐ VIP</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Phone</label>
                      <input
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/10 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        placeholder="Optional"
                        value={doctorForm.phone}
                        onChange={e => setDoctorForm(f => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Location confirmation badge */}
                  {doctorForm.latitude && doctorForm.longitude && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                      style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <span className="text-green-400">✅</span>
                      <span className="text-green-300">Location coordinates captured — employees will be validated within 10m of this point</span>
                    </div>
                  )}
                  {!doctorForm.latitude && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                      style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                      <span className="text-yellow-400">⚠️</span>
                      <span className="text-yellow-300">Search and select a location above to enable GPS validation for employees</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={handleSaveDoctor} disabled={savingDoctor}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                      {savingDoctor ? 'Saving...' : editingDoctor ? 'Update Doctor' : 'Save Doctor'}
                    </button>
                    <button onClick={() => { setShowDoctorForm(false); setEditingDoctor(null); }}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border border-white/10">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Search filter */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Filter doctors by name or hospital..."
                value={doctorSearch}
                onChange={e => setDoctorSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 border border-white/10 outline-none"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              />
            </div>

            {/* Doctor list */}
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              {doctors.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No doctors yet. Click "+ Add Doctor" to get started.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {doctors
                    .filter(d => !doctorSearch || d.name.toLowerCase().includes(doctorSearch.toLowerCase()) || d.hospital.toLowerCase().includes(doctorSearch.toLowerCase()))
                    .map(doc => (
                      <div key={doc._id || doc.id} className="p-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-medium text-sm">Dr. {doc.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${doc.type === 'VIP' ? 'bg-yellow-500/15 text-yellow-300' : doc.type === 'Specialist' ? 'bg-purple-500/15 text-purple-300' : 'bg-slate-500/15 text-slate-400'}`}>
                              {doc.type}
                            </span>
                            {doc.latitude && (
                              <span className="text-xs text-green-400 flex items-center gap-1">
                                <span>📍</span> GPS set
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-xs mt-1">🏥 {doc.hospital}</div>
                          <div className="text-slate-500 text-xs mt-0.5">
                            {[doc.area, doc.pincode].filter(Boolean).join(' · ')}
                            {doc.phone && ` · 📞 ${doc.phone}`}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => openEditDoctor(doc)}
                            className="px-3 py-1 rounded-lg text-xs font-medium text-blue-300 border border-blue-500/30 hover:bg-blue-500/10 transition-all">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteDoctor(doc._id || doc.id, doc.name)}
                            className="px-3 py-1 rounded-lg text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all">
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Call Reports */}
        {!loading && tab === 'calls' && (
          <div className="rounded-2xl p-6" style={cardStyle}>
            <h3 className="text-white font-semibold mb-4">Team Call Reports — {month}</h3>
            {teamCalls.length === 0 ? (
              <p className="text-slate-500 text-sm">No call reports this month.</p>
            ) : (
              <div className="space-y-3">
                {teamCalls.map(call => (
                  <div key={call.id || call._id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium text-sm">{call.employeeName}</span>
                          <span className="text-slate-500 text-xs">→</span>
                          <span className="text-blue-300 text-sm">Dr. {call.doctorName}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${call.doctorType === 'VIP' ? 'bg-yellow-500/15 text-yellow-300' : call.doctorType === 'Specialist' ? 'bg-purple-500/15 text-purple-300' : 'bg-slate-500/15 text-slate-300'}`}>
                            {call.doctorType}
                          </span>
                        </div>
                        <div className="text-slate-400 text-xs mt-1">🏥 {call.hospitalName} · 📍 {call.area || 'N/A'} · {call.date}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${call.locationValid ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>
                            {call.locationValid ? '📍 Location Valid' : '⚠️ Location Invalid'}
                          </span>
                          {call.distanceFromHospital != null && (
                            <span className="text-xs text-slate-500">{call.distanceFromHospital}m from hospital</span>
                          )}
                        </div>
                        {call.notes && <div className="text-slate-500 text-xs mt-1">📝 {call.notes}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        {call.photo && (
                          <img src={call.photo} alt="proof" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                        )}
                        {call.verifiedByMR ? (
                          <span className="px-3 py-1 rounded-lg text-xs font-medium bg-green-500/15 text-green-300 border border-green-500/30">✅ Verified</span>
                        ) : (
                          <button onClick={() => handleVerifyCall(call.id || call._id, true)}
                            className="px-3 py-1 rounded-lg text-xs font-medium text-white transition-all hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                            Verify
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stock Requests */}
        {!loading && tab === 'stock' && (
          <div className="rounded-2xl p-6" style={cardStyle}>
            <h3 className="text-white font-semibold mb-4">Stock Requests — {month}</h3>
            {teamStock.length === 0 ? (
              <p className="text-slate-500 text-sm">No stock requests this month.</p>
            ) : (
              <div className="space-y-3">
                {teamStock.map(req => (
                  <div key={req.id || req._id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium text-sm">{req.employeeName}</span>
                          <span className="text-slate-500 text-xs">·</span>
                          <span className="text-blue-300 text-sm">{req.productName}</span>
                          <span className="text-slate-400 text-xs">×{req.quantity}</span>
                        </div>
                        <div className="text-slate-400 text-xs mt-1">🏥 {req.hospitalName} · Dr. {req.doctorName} · {req.date}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge[req.status] || 'bg-slate-500/15 text-slate-300'}`}>
                            {req.status.replace('_', ' ').toUpperCase()}
                          </span>
                          {req.returned && <span className="text-xs text-orange-300">↩ {req.returnedQuantity} returned</span>}
                          {req.damaged && <span className="text-xs text-red-300">💥 {req.damagedQuantity} damaged</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {req.photo && (
                          <img src={req.photo} alt="proof" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                        )}
                        {req.status === 'pending' && (
                          <>
                            <button onClick={() => handleApproveStock(req.id || req._id)}
                              className="px-3 py-1 rounded-lg text-xs font-medium text-white"
                              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                              ✅ Approve
                            </button>
                            <button onClick={() => handleRejectStock(req.id || req._id)}
                              className="px-3 py-1 rounded-lg text-xs font-medium text-red-300 border border-red-500/30"
                              style={{ background: 'rgba(239,68,68,0.08)' }}>
                              ❌ Reject
                            </button>
                          </>
                        )}
                        {(req.status === 'approved_mr' || req.status === 'approved_owner') && !req.returned && (
                          <button onClick={() => { setReturnModal(req); setReturnForm({ returnedQuantity: 0, returnReason: '', damagedQuantity: 0, damageNote: '' }); }}
                            className="px-3 py-1 rounded-lg text-xs font-medium text-orange-300 border border-orange-500/30"
                            style={{ background: 'rgba(249,115,22,0.08)' }}>
                            ↩ Return/Damage
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attendance */}
        {!loading && tab === 'attendance' && (
          <div className="rounded-2xl p-6" style={cardStyle}>
            <h3 className="text-white font-semibold mb-4">Team Attendance — {month}</h3>
            {teamAttendance.length === 0 ? (
              <p className="text-slate-500 text-sm">No attendance data this month.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-white/5">
                      <th className="text-left py-2 pr-4">Employee</th>
                      <th className="text-center py-2 px-2">Days Present</th>
                      <th className="text-center py-2 px-2">Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamAttendance.map((emp: any) => (
                      <tr key={emp.employeeId} className="border-b border-white/5">
                        <td className="py-3 pr-4">
                          <div className="text-white font-medium">{emp.employeeName || emp.employeeId}</div>
                          <div className="text-slate-500 text-xs">{emp.employeeId}</div>
                        </td>
                        <td className="text-center py-3 px-2 text-green-400 font-semibold">{emp.daysPresent || 0}</td>
                        <td className="text-center py-3 px-2 text-red-400">{Math.max(0, 26 - (emp.daysPresent || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Return Modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#0d1526', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="text-white font-bold mb-4">Record Return / Damage</h3>
            <p className="text-slate-400 text-sm mb-4">{returnModal.productName} × {returnModal.quantity} — {returnModal.employeeName}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Returned Quantity</label>
                <input type="number" min="0" max={returnModal.quantity} value={returnForm.returnedQuantity}
                  onChange={e => setReturnForm(f => ({ ...f, returnedQuantity: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)' }} />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Return Reason</label>
                <input type="text" value={returnForm.returnReason}
                  onChange={e => setReturnForm(f => ({ ...f, returnReason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)' }} />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Damaged Quantity</label>
                <input type="number" min="0" max={returnModal.quantity} value={returnForm.damagedQuantity}
                  onChange={e => setReturnForm(f => ({ ...f, damagedQuantity: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)' }} />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Damage Note</label>
                <input type="text" value={returnForm.damageNote}
                  onChange={e => setReturnForm(f => ({ ...f, damageNote: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white border border-white/10 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)' }} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleReturn}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
                Save Return
              </button>
              <button onClick={() => setReturnModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border border-white/10">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
