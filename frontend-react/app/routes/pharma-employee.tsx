import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import Navbar from '../components/Navbar';
import { api } from '../utils/api';
import { isLoggedIn, getUser } from '../utils/auth';
import LocationSearchInput, { type LocationResult } from '../components/LocationSearchInput';

type Tab = 'attendance' | 'calls' | 'stock' | 'doctors';

// ── GPS helpers ────────────────────────────────────────────────────────────
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function useGPS() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState('');
  useEffect(() => {
    if (!navigator.geolocation) { setGpsError('GPS not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      p => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGpsError('Location access denied. Please allow GPS.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);
  return { pos, gpsError };
}

export default function PharmaEmployee() {
  const navigate = useNavigate();
  const user = getUser();
  const [tab, setTab] = useState<Tab>('attendance');
  const { pos, gpsError } = useGPS();
  const [alert, setAlert] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { if (!isLoggedIn()) navigate('/login'); }, []);

  function showAlert(msg: string, type: 'success' | 'error' = 'success') {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 4000);
  }

  const cs = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };

  const tabs: [Tab, string][] = [
    ['attendance', '📅 Attendance'],
    ['calls', '📞 Call Report'],
    ['stock', '📦 Stock Request'],
    ['doctors', '🏥 Doctors'],
  ];

  return (
    <div className="min-h-screen" style={{ background: '#050b18' }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[400px] opacity-10"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] opacity-8"
          style={{ background: 'radial-gradient(circle, #1d4ed8 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>
      <Navbar />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* GPS status banner */}
        {gpsError && (
          <div className="p-3 rounded-xl text-sm mb-4 text-yellow-300 border border-yellow-500/20 flex items-center gap-2"
            style={{ background: 'rgba(234,179,8,0.08)' }}>
            ⚠️ {gpsError}
          </div>
        )}
        {pos && (
          <div className="p-2.5 rounded-xl text-xs mb-4 text-green-400 border border-green-500/20 flex items-center gap-2"
            style={{ background: 'rgba(16,185,129,0.06)' }}>
            📍 GPS Active — {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
          </div>
        )}
        {alert && (
          <div className={`p-3 rounded-xl text-sm mb-4 flex items-center gap-2 ${alert.type === 'error' ? 'text-red-300 border border-red-500/20' : 'text-green-300 border border-green-500/20'}`}
            style={{ background: alert.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }}>
            {alert.type === 'error' ? '⚠️' : '✅'} {alert.msg}
          </div>
        )}
        {/* Welcome */}
        <div className="rounded-2xl p-6 mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(29,78,216,0.1) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <h2 className="text-xl font-bold text-white mb-1">🧑‍💼 Field Portal — <span className="text-green-400">{user?.name}</span></h2>
          <p className="text-slate-400 text-sm">Area: <span className="text-white font-semibold">{user?.assignedArea || 'Not assigned'}</span>
            {user?.assignedPincodes?.length > 0 && <span className="ml-2 text-slate-500">· Pincodes: {user.assignedPincodes.join(', ')}</span>}
          </p>
        </div>
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap p-1 rounded-2xl w-fit"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {tabs.map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
              style={tab === t ? { background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 0 15px rgba(16,185,129,0.3)' } : {}}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'attendance' && <AttendanceTab pos={pos} showAlert={showAlert} />}
        {tab === 'calls' && <CallReportTab pos={pos} gpsError={gpsError} user={user} showAlert={showAlert} />}
        {tab === 'stock' && <StockRequestTab user={user} showAlert={showAlert} />}
        {tab === 'doctors' && <DoctorsTab user={user} showAlert={showAlert} />}
      </div>
    </div>
  );
}

// ── Attendance Tab ─────────────────────────────────────────────────────────
function AttendanceTab({ pos, showAlert }: any) {
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => { loadAtt(); }, []);

  async function loadAtt() {
    try { const d: any = await api.getMyAttendance(); setAttendance(d); } catch {}
  }

  async function startCamera() {
    setCameraOn(true);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      } catch { showAlert('Camera access denied', 'error'); setCameraOn(false); }
    }, 100);
  }

  function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx?.drawImage(videoRef.current, 0, 0);
    setPhoto(canvasRef.current.toDataURL('image/jpeg', 0.6));
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setCameraOn(false);
  }

  async function checkIn() {
    if (!photo) { showAlert('Please capture a selfie first', 'error'); return; }
    setLoading(true);
    try {
      await api.checkIn(photo);
      showAlert('✅ Attendance marked successfully!');
      loadAtt();
      setPhoto('');
    } catch (err: any) { showAlert(err.message, 'error'); }
    setLoading(false);
  }

  const todayCheckedIn = attendance?.records?.some((r: any) => r.date === today && r.checkedIn);
  const cs = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-2xl p-6" style={cs}>
        <div className="font-bold text-white mb-1">📅 Mark Attendance</div>
        <div className="text-xs text-slate-500 mb-4">Today: {today} · {todayCheckedIn ? '✅ Already checked in' : '⏳ Not checked in'}</div>
        {todayCheckedIn ? (
          <div className="p-4 rounded-xl text-center text-green-400 font-semibold"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            ✅ You have already checked in today!
          </div>
        ) : (
          <>
            {!cameraOn && !photo && (
              <button onClick={startCamera}
                className="w-full py-3 rounded-xl font-bold text-white text-sm mb-3"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                📷 Open Camera
              </button>
            )}
            {cameraOn && (
              <div className="mb-3">
                <video ref={videoRef} className="w-full rounded-xl mb-2" style={{ maxHeight: 220, objectFit: 'cover' }} />
                <button onClick={capture}
                  className="w-full py-2.5 rounded-xl font-bold text-white text-sm"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  📸 Capture Selfie
                </button>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            {photo && (
              <div className="mb-3">
                <img src={photo} className="w-full rounded-xl mb-2" style={{ maxHeight: 180, objectFit: 'cover' }} />
                <div className="flex gap-2">
                  <button onClick={() => { setPhoto(''); startCamera(); }}
                    className="flex-1 py-2 rounded-xl text-xs text-slate-400 border border-white/10">Retake</button>
                  <button onClick={checkIn} disabled={loading}
                    className="flex-1 py-2 rounded-xl font-bold text-white text-xs disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                    {loading ? 'Checking in...' : '✅ Mark Present'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="rounded-2xl p-6" style={cs}>
        <div className="font-bold text-white mb-1">📊 This Month</div>
        <div className="text-xs text-slate-500 mb-4">{attendance?.month || '—'}</div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="text-2xl font-bold text-green-400">{attendance?.daysPresent || 0}</div>
            <div className="text-xs text-slate-500">Days Present</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="text-2xl font-bold text-red-400">{Math.max(0, 26 - (attendance?.daysPresent || 0))}</div>
            <div className="text-xs text-slate-500">Absent</div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {(attendance?.records || []).slice(0, 28).map((r: any, i: number) => (
            <div key={i} className={`rounded-lg p-1.5 text-center text-xs font-bold ${r.checkedIn ? 'text-green-400' : 'text-red-400'}`}
              style={{ background: r.checkedIn ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.06)' }}>
              {r.date?.slice(8)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Call Report Tab ────────────────────────────────────────────────────────
function CallReportTab({ pos, gpsError, user, showAlert }: any) {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [form, setForm] = useState({
    doctorName: '', hospitalName: '', doctorType: 'Regular',
    notes: '', pincode: user?.assignedPincodes?.[0] || '', area: user?.assignedArea || '',
  });
  const [selDoctor, setSelDoctor] = useState<any>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [viewMonth, setViewMonth] = useState(today.slice(0, 7));

  useEffect(() => {
    // Load ONLY doctors assigned to this employee
    api.getDoctors({ employeeId: user?.employeeId }).then((d: any) => setDoctors(d)).catch(() => {});
    loadReports();
  }, [viewMonth]);

  async function loadReports() {
    try { const d: any = await api.getMyCallReports({ month: viewMonth }); setReports(d); } catch {}
  }

  const filteredDoctors = doctors.filter(d =>
    !doctorSearch ||
    d.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    d.hospital.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  function selectDoctor(doc: any) {
    setSelDoctor(doc);
    setForm(f => ({
      ...f,
      doctorName: doc.name,
      hospitalName: doc.hospital,
      doctorType: doc.type,
      area: doc.area || f.area,
      pincode: doc.pincode || f.pincode,
    }));
    setDoctorSearch('');
  }

  async function startCamera() {
    setCameraOn(true);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      } catch { showAlert('Camera access denied', 'error'); setCameraOn(false); }
    }, 100);
  }

  function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx?.drawImage(videoRef.current, 0, 0);
    setPhoto(canvasRef.current.toDataURL('image/jpeg', 0.6));
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setCameraOn(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) { showAlert('Photo proof is mandatory', 'error'); return; }
    if (!pos) { showAlert('GPS location required. Please allow location access.', 'error'); return; }
    if (user?.assignedPincodes?.length > 0 && form.pincode && !user.assignedPincodes.includes(form.pincode)) {
      showAlert(`Location restricted. Your assigned pincodes: ${user.assignedPincodes.join(', ')}`, 'error'); return;
    }
    let distanceFromHospital = 0;
    let locationValid = true;
    if (selDoctor?.lat && selDoctor?.lng) {
      distanceFromHospital = Math.round(getDistanceMeters(pos.lat, pos.lng, selDoctor.lat, selDoctor.lng));
      if (distanceFromHospital > 10) {
        showAlert(`🚫 You are ${distanceFromHospital}m away from ${selDoctor.hospital}. You must be within 10 meters to report.`, 'error');
        return;
      }
      locationValid = true;
    } else if (!selDoctor?.lat) {
      // Doctor has no GPS stored — warn but allow (server will not block)
      showAlert('⚠️ This doctor has no GPS location set. Contact your MR to update it.', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.submitCallReport({
        ...form, lat: pos.lat, lng: pos.lng, photo,
        visitDate: today, locationValid, distanceFromHospital,
        locationAddress: `${pos.lat.toFixed(4)},${pos.lng.toFixed(4)}`,
        doctorId: selDoctor?.id || selDoctor?._id || '',
      });
      showAlert('✅ Call report submitted successfully!');
      setForm({ doctorName: '', hospitalName: '', doctorType: 'Regular', notes: '', pincode: user?.assignedPincodes?.[0] || '', area: user?.assignedArea || '' });
      setPhoto(''); setSelDoctor(null); setDoctorSearch('');
      loadReports();
    } catch (err: any) { showAlert(err.message, 'error'); }
    setLoading(false);
  }

  const cs = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };
  const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/8 outline-none focus:border-green-500/40 transition-all';
  const inputStyle = { background: 'rgba(255,255,255,0.04)' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="rounded-2xl p-6" style={cs}>
        <div className="font-bold text-white mb-1">📞 Report Doctor Visit</div>
        <div className="text-xs text-slate-500 mb-4">GPS + Photo required · Only assigned doctors shown</div>

        {/* Doctor search + select */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
            🔍 Search & Select Doctor
          </label>
          {/* Selected doctor badge */}
          {selDoctor ? (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="flex-1">
                <div className="text-green-300 font-semibold text-sm">{selDoctor.name}</div>
                <div className="text-slate-400 text-xs">
                  {selDoctor.hospital}
                  {selDoctor.area && ` · ${selDoctor.area}`}
                  {selDoctor.lat && pos && (() => {
                    const d = Math.round(getDistanceMeters(pos.lat, pos.lng, selDoctor.lat, selDoctor.lng));
                    return <span className={`ml-2 font-bold ${d <= 10 ? 'text-green-400' : 'text-red-400'}`}>
                      {d <= 10 ? `✅ ${d}m — in range` : `🚫 ${d}m away`}
                    </span>;
                  })()}
                </div>
              </div>
              <button type="button" onClick={() => { setSelDoctor(null); setForm(f => ({ ...f, doctorName: '', hospitalName: '' })); }}
                className="text-slate-500 hover:text-red-400 transition-colors text-sm">✕</button>
            </div>
          ) : (
            <>
              <input
                value={doctorSearch}
                onChange={e => setDoctorSearch(e.target.value)}
                placeholder="Type doctor or hospital name…"
                className={inputCls}
                style={inputStyle}
              />
              {/* Nearby indicator */}
              {pos && doctors.length > 0 && !doctorSearch && (
                <div className="mt-2">
                  <div className="text-xs text-slate-500 mb-1.5 uppercase tracking-wide font-semibold">📍 Nearby Assigned Doctors</div>
                  <div className="space-y-1">
                    {[...doctors]
                      .filter(d => d.lat && d.lng)
                      .map(d => ({ ...d, dist: Math.round(getDistanceMeters(pos.lat, pos.lng, d.lat, d.lng)) }))
                      .sort((a, b) => a.dist - b.dist)
                      .slice(0, 5)
                      .map((d: any) => (
                        <button key={d.id || d._id} type="button" onClick={() => selectDoctor(d)}
                          className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-all hover:bg-white/5"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <span className={`text-xs font-bold w-16 text-center py-0.5 rounded flex-shrink-0 ${d.dist <= 10 ? 'text-green-400 bg-green-400/10' : 'text-slate-500 bg-white/5'}`}>
                            {d.dist}m
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-xs font-semibold truncate">{d.name}</div>
                            <div className="text-slate-500 text-xs truncate">{d.hospital}</div>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ${d.type === 'VIP' ? 'text-yellow-400' : d.type === 'Specialist' ? 'text-purple-400' : 'text-slate-400'}`}>
                            {d.type}
                          </span>
                          {d.dist <= 10 && <span className="text-green-400 text-xs">✅</span>}
                        </button>
                      ))}
                    {doctors.filter(d => d.lat && d.lng).length === 0 && (
                      <div className="text-xs text-yellow-500 px-1">⚠️ No doctors have GPS set. MR needs to add location via search.</div>
                    )}
                  </div>
                </div>
              )}
              {doctorSearch.length > 0 && (
                <div className="mt-1 rounded-xl overflow-hidden max-h-44 overflow-y-auto"
                  style={{ background: '#0d1829', border: '1px solid rgba(16,185,129,0.2)' }}>
                  {filteredDoctors.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500">
                      No assigned doctors match "{doctorSearch}"
                    </div>
                  ) : filteredDoctors.map((d: any) => (
                    <button key={d.id || d._id} type="button" onClick={() => selectDoctor(d)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/4 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded
                          ${d.type === 'VIP' ? 'text-yellow-400 bg-yellow-400/10' : d.type === 'Specialist' ? 'text-purple-400 bg-purple-400/10' : 'text-slate-400 bg-white/5'}`}>
                          {d.type}
                        </span>
                        <div>
                          <div className="text-white text-sm font-semibold">{d.name}</div>
                          <div className="text-slate-500 text-xs">{d.hospital}{d.area ? ` · ${d.area}` : ''}</div>
                        </div>
                        {d.lat && pos && (() => {
                          const dist = Math.round(getDistanceMeters(pos.lat, pos.lng, d.lat, d.lng));
                          return <span className={`ml-auto text-xs font-bold ${dist <= 10 ? 'text-green-400' : 'text-slate-500'}`}>{dist}m</span>;
                        })()}
                        {!d.lat && <span className="ml-auto text-xs text-slate-600">No GPS</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {doctors.length === 0 && !doctorSearch && !pos && (
                <div className="mt-2 text-xs text-yellow-500">
                  ⚠️ No doctors assigned to you yet. Contact your MR to assign doctors.
                </div>
              )}
            </>
          )}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Doctor Name *</label>
              <input value={form.doctorName} onChange={e => setForm(f => ({ ...f, doctorName: e.target.value }))}
                required className={inputCls} style={inputStyle} placeholder="Auto-filled on select" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Hospital *</label>
              <input value={form.hospitalName} onChange={e => setForm(f => ({ ...f, hospitalName: e.target.value }))}
                required className={inputCls} style={inputStyle} placeholder="Auto-filled on select" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Doctor Type</label>
              <select value={form.doctorType} onChange={e => setForm(f => ({ ...f, doctorType: e.target.value }))}
                className={inputCls} style={inputStyle}>
                <option value="Regular">Regular</option>
                <option value="VIP">VIP</option>
                <option value="Specialist">Specialist</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Pincode</label>
              <input value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))}
                className={inputCls} style={inputStyle} placeholder="Pincode" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className={inputCls} style={{ ...inputStyle, resize: 'none' }} placeholder="Visit notes…" />
          </div>

          {/* Photo capture */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">📸 Photo Proof (Mandatory)</label>
            {!cameraOn && !photo && (
              <button type="button" onClick={startCamera}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-blue-400 border border-blue-500/20 hover:text-white transition-all"
                style={{ background: 'rgba(59,130,246,0.06)' }}>
                📷 Take Photo at Location
              </button>
            )}
            {cameraOn && (
              <div>
                <video ref={videoRef} className="w-full rounded-xl mb-2" style={{ maxHeight: 180, objectFit: 'cover' }} />
                <button type="button" onClick={capture}
                  className="w-full py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  📸 Capture
                </button>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            {photo && (
              <div className="flex items-center gap-2 mt-1">
                <img src={photo} className="w-16 h-16 rounded-xl object-cover border border-green-500/30" />
                <div className="flex-1">
                  <div className="text-xs text-green-400 font-semibold mb-1">✅ Photo captured</div>
                  <button type="button" onClick={() => { setPhoto(''); startCamera(); }}
                    className="text-xs text-slate-500 hover:text-red-400">Retake</button>
                </div>
              </div>
            )}
          </div>

          {/* GPS */}
          <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${pos ? 'text-green-400' : 'text-yellow-400'}`}
            style={{ background: pos ? 'rgba(16,185,129,0.06)' : 'rgba(234,179,8,0.06)', border: `1px solid ${pos ? 'rgba(16,185,129,0.2)' : 'rgba(234,179,8,0.2)'}` }}>
            {pos
              ? `📍 GPS Active — ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`
              : '⚠️ GPS required — allow location access'}
            {selDoctor?.lat && pos && (() => {
              const d = Math.round(getDistanceMeters(pos.lat, pos.lng, selDoctor.lat, selDoctor.lng));
              return <span className={`ml-auto font-semibold ${d <= 10 ? 'text-green-400' : d <= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {d <= 10 ? `✅ ${d}m — within range` : `🚫 ${d}m — too far (need ≤10m)`}
              </span>;
            })()}
          </div>

          {/* Submit — disabled with clear reason if not within 10m */}
          {(() => {
            const noGPS = !pos;
            const noDoctor = !selDoctor;
            const noPhoto = !photo;
            const tooFar = selDoctor?.lat && pos
              ? Math.round(getDistanceMeters(pos.lat, pos.lng, selDoctor.lat, selDoctor.lng)) > 10
              : false;
            const noDocGPS = selDoctor && !selDoctor.lat;
            const blocked = noGPS || noDoctor || noPhoto || tooFar || noDocGPS;
            const reason = noGPS ? 'Enable GPS first'
              : noDoctor ? 'Select a doctor first'
              : noPhoto ? 'Capture photo first'
              : noDocGPS ? 'Doctor has no GPS — contact MR'
              : tooFar ? 'Move within 10m of the hospital'
              : '';
            return (
              <button type="submit" disabled={loading || blocked}
                className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-50"
                style={{ background: blocked ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #059669, #10b981)', cursor: blocked ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Submitting…' : blocked ? `🚫 ${reason}` : '📤 Submit Call Report'}
              </button>
            );
          })()}
        </form>
      </div>

      {/* Reports list */}
      <div className="rounded-2xl overflow-hidden" style={cs}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="font-bold text-white text-sm">📋 My Reports</div>
          <input type="month" value={viewMonth} onChange={e => setViewMonth(e.target.value)}
            className="px-2 py-1 rounded-lg text-xs text-white border border-white/8 outline-none"
            style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
          {reports.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm">No call reports for {viewMonth}</div>
          ) : reports.map((r: any, i: number) => (
            <div key={i} className="px-4 py-3 border-b border-white/4 hover:bg-white/2 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-white font-semibold text-sm">{r.doctorName}</div>
                  <div className="text-slate-500 text-xs">{r.hospitalName}</div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                      ${r.doctorType === 'VIP' ? 'text-yellow-400' : r.doctorType === 'Specialist' ? 'text-purple-400' : 'text-slate-400'}`}
                      style={{ background: r.doctorType === 'VIP' ? 'rgba(234,179,8,0.1)' : r.doctorType === 'Specialist' ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.05)' }}>
                      {r.doctorType}
                    </span>
                    <span className="text-xs text-slate-500">📅 {r.visitDate}</span>
                    {r.locationValid !== undefined && (
                      <span className={`text-xs ${r.locationValid ? 'text-green-400' : 'text-yellow-400'}`}>
                        {r.locationValid ? '📍 Verified' : '⚠️ Unverified'}
                      </span>
                    )}
                    {r.distanceFromHospital > 0 && (
                      <span className="text-xs text-slate-600">{r.distanceFromHospital}m</span>
                    )}
                  </div>
                  {r.notes && <div className="text-xs text-slate-600 mt-1">{r.notes}</div>}
                </div>
                {r.photo && (
                  <img src={r.photo} className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0 cursor-pointer"
                    onClick={() => window.open(r.photo)} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Stock Request Tab ──────────────────────────────────────────────────────
function StockRequestTab({ user, showAlert }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState('');
  // Camera-only — no file upload allowed
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [form, setForm] = useState({ doctorName: '', hospitalName: '', productName: '', quantity: '', notes: '' });
  const [viewMonth, setViewMonth] = useState(new Date().toISOString().slice(0, 7));
  const [assignedDoctors, setAssignedDoctors] = useState<any[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selDoctor, setSelDoctor] = useState<any>(null);

  useEffect(() => {
    loadRequests();
    api.getDoctors({ employeeId: user?.employeeId }).then((d: any) => setAssignedDoctors(d)).catch(() => {});
  }, [viewMonth]);

  async function loadRequests() {
    try { const d: any = await api.getMyStockRequests({ month: viewMonth }); setRequests(d); } catch {}
  }

  function selectDoctor(doc: any) {
    setSelDoctor(doc);
    setForm(f => ({ ...f, doctorName: doc.name, hospitalName: doc.hospital }));
    setDoctorSearch('');
  }

  const filteredDoctors = assignedDoctors.filter(d =>
    !doctorSearch ||
    d.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
    d.hospital.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  async function startCamera() {
    setCameraOn(true);
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      } catch { showAlert('Camera access denied', 'error'); setCameraOn(false); }
    }, 100);
  }

  function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx?.drawImage(videoRef.current, 0, 0);
    setPhoto(canvasRef.current.toDataURL('image/jpeg', 0.6));
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setCameraOn(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) { showAlert('Camera photo proof is mandatory — file upload not allowed', 'error'); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { showAlert('Enter valid quantity', 'error'); return; }
    setLoading(true);
    try {
      await api.submitStockRequest({ ...form, quantity: Number(form.quantity), photo,
        doctorId: selDoctor?.id || selDoctor?._id || '' });
      showAlert('✅ Stock request submitted!');
      setForm({ doctorName: '', hospitalName: '', productName: '', quantity: '', notes: '' });
      setPhoto(''); setSelDoctor(null);
      loadRequests();
    } catch (err: any) { showAlert(err.message, 'error'); }
    setLoading(false);
  }

  const cs = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };
  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/8 outline-none focus:border-blue-500/40 transition-all";
  const inputStyle = { background: 'rgba(255,255,255,0.04)' };

  const statusColor: Record<string, string> = {
    pending: 'text-yellow-400', mr_approved: 'text-blue-400',
    owner_approved: 'text-green-400', rejected: 'text-red-400',
  };
  const statusBg: Record<string, string> = {
    pending: 'rgba(234,179,8,0.1)', mr_approved: 'rgba(59,130,246,0.1)',
    owner_approved: 'rgba(34,197,94,0.1)', rejected: 'rgba(239,68,68,0.1)',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl p-6" style={cs}>
        <div className="font-bold text-white mb-1">📦 Raise Stock Request</div>
        <div className="text-xs text-slate-500 mb-4">Upload photo of doctor accepting product</div>
        <form onSubmit={submit} className="space-y-3">
          {/* Doctor quick-select from assigned list */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">🔍 Select Doctor</label>
            {selDoctor ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <div className="flex-1">
                  <div className="text-green-300 font-semibold text-sm">{selDoctor.name}</div>
                  <div className="text-slate-400 text-xs">{selDoctor.hospital}</div>
                </div>
                <button type="button"
                  onClick={() => { setSelDoctor(null); setForm(f => ({ ...f, doctorName: '', hospitalName: '' })); }}
                  className="text-slate-500 hover:text-red-400 transition-colors">✕</button>
              </div>
            ) : (
              <div className="relative">
                <input value={doctorSearch} onChange={e => setDoctorSearch(e.target.value)}
                  placeholder="Type doctor or hospital name…"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/8 outline-none focus:border-blue-500/40 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)' }} />
                {doctorSearch.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden max-h-40 overflow-y-auto shadow-xl"
                    style={{ background: '#0d1829', border: '1px solid rgba(59,130,246,0.2)' }}>
                    {filteredDoctors.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-slate-500">No assigned doctors match</div>
                    ) : filteredDoctors.map((d: any) => (
                      <button key={d.id || d._id} type="button" onClick={() => selectDoctor(d)}
                        className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/4 last:border-0">
                        <div className="text-white text-sm font-semibold">{d.name}</div>
                        <div className="text-slate-500 text-xs">{d.hospital}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Doctor Name *</label>
              <input value={form.doctorName} onChange={e => setForm(f => ({ ...f, doctorName: e.target.value }))} required className={inputCls} style={inputStyle} placeholder="Dr. Name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Hospital *</label>
              <input value={form.hospitalName} onChange={e => setForm(f => ({ ...f, hospitalName: e.target.value }))} required className={inputCls} style={inputStyle} placeholder="Hospital" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Product Name *</label>
              <input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} required className={inputCls} style={inputStyle} placeholder="Product" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Quantity *</label>
              <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required className={inputCls} style={inputStyle} placeholder="Qty" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls} style={{ ...inputStyle, resize: 'none' }} placeholder="Additional notes..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">📸 Photo Proof — Camera Only</label>
            {!cameraOn && !photo && (
              <button type="button" onClick={startCamera}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-blue-400 border border-blue-500/20 hover:text-white transition-all"
                style={{ background: 'rgba(59,130,246,0.06)' }}>
                📷 Take Photo (Camera Required)
              </button>
            )}
            {cameraOn && (
              <div>
                <video ref={videoRef} className="w-full rounded-xl mb-2" style={{ maxHeight: 180, objectFit: 'cover' }} />
                <button type="button" onClick={capture}
                  className="w-full py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  📸 Capture Photo
                </button>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            {photo && (
              <div className="flex items-center gap-3">
                <img src={photo} className="w-16 h-16 rounded-xl object-cover border border-blue-500/30" />
                <div>
                  <div className="text-xs text-green-400 font-semibold mb-1">✅ Photo captured</div>
                  <button type="button" onClick={() => { setPhoto(''); startCamera(); }}
                    className="text-xs text-slate-500 hover:text-red-400">Retake</button>
                </div>
              </div>
            )}
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
            {loading ? 'Submitting...' : '📦 Submit Stock Request'}
          </button>
        </form>
      </div>
      <div className="rounded-2xl overflow-hidden" style={cs}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="font-bold text-white text-sm">📋 My Requests</div>
          <input type="month" value={viewMonth} onChange={e => setViewMonth(e.target.value)}
            className="px-2 py-1 rounded-lg text-xs text-white border border-white/8 outline-none" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
          {requests.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm">No requests for {viewMonth}</div>
          ) : requests.map((r: any, i: number) => (
            <div key={i} className="px-4 py-3 border-b border-white/4 hover:bg-white/2 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-white font-semibold text-sm">{r.productName}</div>
                  <div className="text-slate-500 text-xs">{r.doctorName} · {r.hospitalName}</div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[r.status] || 'text-slate-400'}`}
                      style={{ background: statusBg[r.status] || 'rgba(255,255,255,0.05)' }}>
                      {r.status?.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">Qty: {r.quantity}</span>
                    <span className="text-xs text-slate-500">📅 {r.requestDate}</span>
                  </div>
                  {r.approvalNote && <div className="text-xs text-slate-600 mt-1">Note: {r.approvalNote}</div>}
                  {r.returnStatus && r.returnStatus !== 'none' && (
                    <div className="text-xs text-yellow-400 mt-1">↩ Return: {r.returnStatus} ({r.returnQuantity} units)</div>
                  )}
                </div>
                {r.photo && <img src={r.photo} className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Doctors Tab — employee view (read-only, assigned only) ────────────────
function DoctorsTab({ user, showAlert }: any) {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    // Load ONLY doctors assigned to this employee
    api.getDoctors({ employeeId: user?.employeeId })
      .then((d: any) => setDoctors(d))
      .catch(() => {});
  }, []);

  const filtered = doctors.filter(d =>
    (!search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.hospital.toLowerCase().includes(search.toLowerCase())) &&
    (!filterType || d.type === filterType)
  );

  const cs = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };

  return (
    <div>
      <div className="p-3 rounded-xl text-xs text-blue-300 border border-blue-500/20 mb-4"
        style={{ background: 'rgba(59,130,246,0.06)' }}>
        ℹ️ Showing only doctors assigned to you by your MR. Contact your MR to add or update doctors.
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 relative" style={{ minWidth: 180 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by doctor or hospital…"
            className="w-full px-3 py-2 pl-8 rounded-xl text-sm text-white border border-white/8 outline-none"
            style={{ background: 'rgba(255,255,255,0.04)' }} />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white border border-white/8 outline-none"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <option value="">All Types</option>
          <option value="VIP">⭐ VIP</option>
          <option value="Specialist">💊 Specialist</option>
          <option value="Regular">👨‍⚕️ Regular</option>
        </select>
      </div>

      {/* Doctor cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <div className="text-4xl mb-3 opacity-30">🏥</div>
          {doctors.length === 0
            ? 'No doctors assigned to you yet. Ask your MR to assign doctors.'
            : `No doctors match "${search}"`}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d: any, i: number) => (
            <div key={i} className="rounded-2xl p-4 transition-all hover:-translate-y-0.5" style={cs}>
              <div className="flex items-start justify-between mb-2">
                <div className="font-bold text-white text-sm">{d.name}</div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0
                  ${d.type === 'VIP' ? 'text-yellow-400' : d.type === 'Specialist' ? 'text-purple-400' : 'text-slate-400'}`}
                  style={{ background: d.type === 'VIP' ? 'rgba(234,179,8,0.1)' : d.type === 'Specialist' ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.05)' }}>
                  {d.type}
                </span>
              </div>
              <div className="text-slate-400 text-xs mb-1">🏥 {d.hospital}</div>
              <div className="text-slate-500 text-xs">
                📍 {d.area || '—'}{d.pincode ? ` · ${d.pincode}` : ''}
              </div>
              {d.lat && d.lng ? (
                <div className="mt-2 text-xs text-green-600 font-semibold">✅ GPS verified location</div>
              ) : (
                <div className="mt-2 text-xs text-yellow-600">⚠️ No GPS — location not set by MR</div>
              )}
              {d.locationAddress && (
                <div className="mt-1 text-xs text-slate-700 truncate" title={d.locationAddress}>
                  {d.locationAddress}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

