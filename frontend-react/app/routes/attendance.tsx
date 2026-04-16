import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import Navbar from '../components/Navbar';
import { api } from '../utils/api';
import { isLoggedIn } from '../utils/auth';

type View = 'calendar' | 'list';

export default function Attendance() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [view, setView] = useState<View>('calendar');
  const [alert, setAlert] = useState<{ msg: string; type: string } | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const isCurrentMonth = selectedMonth === new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return; }
    loadAttendance();
    api.getHolidays(selectedMonth).then((h: any) => setHolidays(h)).catch(() => {});
    api.getMyLeaves().then((l: any) => setMyLeaves(l)).catch(() => {});
  }, [selectedMonth]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [stream]);

  async function loadAttendance() {
    setLoading(true);
    try { setData(await api.getMyAttendance(selectedMonth)); } catch {}
    setLoading(false);
  }

  // ── Camera ──────────────────────────────────────────────────────────────
  async function openCamera() {
    setCameraError(''); setCapturedPhoto(null); setShowCamera(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError('Camera access denied. Please allow camera permission and try again.');
    }
  }

  // Location state
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  async function fetchLocation(): Promise<{ lat: number; lng: number; address: string } | null> {
    return new Promise(resolve => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const lat = parseFloat(pos.coords.latitude.toFixed(5));
          const lng = parseFloat(pos.coords.longitude.toFixed(5));
          let address = `${lat}, ${lng}`;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const data = await res.json();
            const a = data.address || {};
            address = [a.road, a.suburb, a.city || a.town || a.village, a.state].filter(Boolean).join(', ');
            if (!address) address = `${lat}, ${lng}`;
          } catch {}
          resolve({ lat, lng, address });
        },
        () => resolve(null),
        { timeout: 6000, enableHighAccuracy: true }
      );
    });
  }

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    setLocLoading(true);

    // Get location before drawing
    const loc = await fetchLocation();
    setLocation(loc);
    setLocLoading(false);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;

    // Draw the video frame
    ctx.drawImage(video, 0, 0);

    // ── Overlay: dark semi-transparent banner at bottom ──────────────────
    const bannerH = Math.round(canvas.height * 0.18);
    const y = canvas.height - bannerH;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
    ctx.fillRect(0, y, canvas.width, bannerH);

    // Thin accent line at top of banner
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(0, y, canvas.width, 3);

    const pad = Math.round(canvas.width * 0.03);
    const baseFontSize = Math.round(canvas.height * 0.045);

    // Timestamp
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    ctx.font = `bold ${baseFontSize}px Arial`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`📅 ${dateStr}  ⏰ ${timeStr}`, pad, y + bannerH * 0.38);

    // Location
    const locText = loc ? `📍 ${loc.address}` : '📍 Location unavailable';
    ctx.font = `${Math.round(baseFontSize * 0.78)}px Arial`;
    ctx.fillStyle = '#a5b4fc';

    // Truncate long address to fit canvas width
    const maxWidth = canvas.width - pad * 2;
    let displayLoc = locText;
    while (ctx.measureText(displayLoc).width > maxWidth && displayLoc.length > 20) {
      displayLoc = displayLoc.slice(0, -4) + '...';
    }
    ctx.fillText(displayLoc, pad, y + bannerH * 0.72);

    // Coordinates (small)
    if (loc) {
      ctx.font = `${Math.round(baseFontSize * 0.6)}px Arial`;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(`${loc.lat}°N  ${loc.lng}°E`, pad, y + bannerH * 0.95);
    }

    const photo = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(photo);
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  }

  function retakePhoto() {
    setCapturedPhoto(null);
    openCamera();
  }

  function closeCamera() {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setShowCamera(false);
    setCapturedPhoto(null);
    setCameraError('');
  }

  async function submitAttendance() {
    if (!capturedPhoto) {
      setAlert({ msg: '📷 Photo is required. Please capture your photo to mark attendance.', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await api.checkIn(capturedPhoto);
      setAlert({ msg: '✅ Attendance marked successfully with photo proof!', type: 'success' });
      closeCamera();
      loadAttendance();
    } catch (err: any) {
      setAlert({ msg: err.message, type: 'error' });
    }
    setSubmitting(false);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const todayRecord = data?.records?.find((r: any) => r.date === today);
  const todayCheckedIn = !!todayRecord?.checkedIn;

  // Dynamic working days = total days in month - holidays
  const [year, monthNum] = selectedMonth.split('-').map(Number);
  const totalDaysInMonth = new Date(year, monthNum, 0).getDate();
  const holidayDates = new Set(holidays.map((h: any) => h.date));
  const workingDays = totalDaysInMonth - holidayDates.size;

  // Approved leaves
  const approvedLeaves = myLeaves.filter((l: any) => l.status === 'approved' && l.month === selectedMonth);
  const approvedPaidDates = new Set(approvedLeaves.filter((l: any) => l.leaveType === 'paid').flatMap((l: any) => l.dates));
  const approvedUnpaidDates = new Set(approvedLeaves.filter((l: any) => l.leaveType === 'unpaid').flatMap((l: any) => l.dates));

  const daysPresent = data?.daysPresent || 0;
  const absentDays = Math.max(0, workingDays - daysPresent - approvedPaidDates.size - approvedUnpaidDates.size);
  const absentDeduction = (absentDays + approvedUnpaidDates.size) * 250;

  async function handleApplyLeave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const dateVal = fd.get('date') as string;
    const leaveType = fd.get('leaveType') as string;
    const reason = fd.get('reason') as string;
    if (!dateVal || !leaveType || !reason) return;
    setLeaveLoading(true);
    try {
      await api.applyLeave({ dates: [dateVal], leaveType, reason });
      setAlert({ msg: '✅ Leave request submitted successfully!', type: 'success' });
      setShowLeaveForm(false);
      const updated: any[] = await api.getMyLeaves();
      setMyLeaves(updated);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) { setAlert({ msg: err.message, type: 'error' }); }
    setLeaveLoading(false);
  }

  function buildCalendar() {
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const recordMap: Record<string, any> = {};
    (data?.records || []).forEach((r: any) => { recordMap[r.date] = r; });
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = `${selectedMonth}-${String(i + 1).padStart(2, '0')}`;
      const isHoliday = holidayDates.has(d);
      const isPaidLeave = approvedPaidDates.has(d);
      const isUnpaidLeave = approvedUnpaidDates.has(d);
      return { date: d, day: i + 1, record: recordMap[d], isHoliday, isPaidLeave, isUnpaidLeave, isFuture: d > today, holidayReason: holidays.find((h: any) => h.date === d)?.reason };
    });
  }

  const calendar = buildCalendar();
  const [photoPreview, setPhotoPreview] = useState<{ date: string; photo: string } | null>(null);
  const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };

  // Month options — last 12 months
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  return (
    <div className="min-h-screen" style={{ background: '#050b18' }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] opacity-8"
          style={{ background: 'radial-gradient(circle, #1d4ed8 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>
      <Navbar />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">📅 Attendance</h1>
            <p className="text-slate-500 mt-1 text-sm">Camera-verified daily attendance tracking.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Month selector */}
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-xl text-sm text-white border border-white/8 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              {monthOptions.map(m => (
                <option key={m} value={m} style={{ background: '#0d1829' }}>
                  {new Date(m + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
            {/* View toggle */}
            <div className="flex p-1 rounded-xl gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {(['calendar', 'list'] as View[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${view === v ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  style={view === v ? { background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' } : {}}>
                  {v === 'calendar' ? '📅 Calendar' : '📋 List'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <div className={`p-3 rounded-xl text-sm mb-5 flex items-center gap-2 ${alert.type === 'error' ? 'text-red-300 border border-red-500/20' : 'text-green-300 border border-green-500/20'}`}
            style={{ background: alert.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }}>
            {alert.msg}
            <button onClick={() => setAlert(null)} className="ml-auto text-slate-500 hover:text-white">✕</button>
          </div>
        )}

        {/* Check-in card — only for current month */}
        {isCurrentMonth && (
          <div className="rounded-2xl p-6 mb-6 flex items-center justify-between flex-wrap gap-4"
            style={{ background: todayCheckedIn ? 'rgba(34,197,94,0.08)' : 'rgba(59,130,246,0.08)', border: `1px solid ${todayCheckedIn ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)'}` }}>
            <div className="flex items-center gap-4">
              {todayCheckedIn && todayRecord?.photo ? (
                <img src={todayRecord.photo} alt="Today's attendance"
                  className="w-14 h-14 rounded-xl object-cover border-2 border-green-500/40 cursor-pointer"
                  onClick={() => setPhotoPreview({ date: today, photo: todayRecord.photo })} />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: todayCheckedIn ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)' }}>
                  {todayCheckedIn ? '✅' : '📷'}
                </div>
              )}
              <div>
                <div className="font-bold text-white text-lg">
                  {todayCheckedIn ? 'Checked in today' : 'Not checked in yet'}
                </div>
                <div className="text-slate-400 text-sm">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                {todayCheckedIn && todayRecord?.checkInTime && (
                  <div className="text-green-400 text-xs mt-0.5">
                    ⏰ {new Date(todayRecord.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {!todayCheckedIn && (
                  <div className="text-yellow-400 text-xs mt-1 flex items-center gap-1">
                    ⚠️ Photo capture required — no photo = marked Absent
                  </div>
                )}
              </div>
            </div>
            {!todayCheckedIn && (
              <button onClick={openCamera}
                className="px-6 py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] flex items-center gap-2 glow-blue-sm"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                📷 Mark Attendance with Photo
              </button>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: '✅', label: 'Days Present', value: daysPresent, color: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: 'text-green-400' },
            { icon: '❌', label: 'Days Absent', value: absentDays, color: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: 'text-red-400' },
            { icon: '📅', label: 'Working Days', value: workingDays, color: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', text: 'text-blue-400' },
            { icon: '💸', label: 'Deduction', value: `₹${absentDeduction}`, color: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)', text: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: s.color, border: `1px solid ${s.border}` }}>
              <div className="text-2xl">{s.icon}</div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</div>
                <div className={`text-lg font-bold ${s.text}`}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Leave summary + Apply button */}
        <div className="rounded-2xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3"
          style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
          <div className="flex gap-4 flex-wrap text-sm">
            <span className="text-slate-400">🏖️ Paid Leaves: <span className="text-green-400 font-bold">{approvedPaidDates.size}</span></span>
            <span className="text-slate-400">📋 Unpaid Leaves: <span className="text-yellow-400 font-bold">{approvedUnpaidDates.size}</span></span>
            <span className="text-slate-400">🎉 Holidays: <span className="text-blue-400 font-bold">{holidayDates.size}</span></span>
          </div>
          <button onClick={() => setShowLeaveForm(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
            + Apply Leave
          </button>
        </div>

        {/* Calendar View */}
        {view === 'calendar' && (
          <div className="rounded-2xl p-6" style={cardStyle}>
            <div className="font-bold text-white mb-4">
              {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
            {loading ? (
              <div className="text-center py-8 text-slate-600">Loading...</div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-bold text-slate-600 py-1">{d}</div>
                ))}
                {Array.from({ length: new Date(`${selectedMonth}-01`).getDay() }, (_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {calendar.map(({ date, day, record, isHoliday, isPaidLeave, isUnpaidLeave, isFuture, holidayReason }) => {
                  const present = record?.checkedIn;
                  const hasPhoto = !!record?.photo;
                  const overridden = record?.overriddenByOwner;
                  let bg = 'rgba(255,255,255,0.02)';
                  let textCls = 'text-slate-700';
                  let borderStyle = '1px solid rgba(255,255,255,0.04)';
                  if (isHoliday) { bg = 'rgba(59,130,246,0.12)'; textCls = 'text-blue-400'; borderStyle = '1px solid rgba(59,130,246,0.25)'; }
                  else if (isPaidLeave) { bg = 'rgba(34,197,94,0.1)'; textCls = 'text-green-400'; borderStyle = '1px solid rgba(34,197,94,0.2)'; }
                  else if (isUnpaidLeave) { bg = 'rgba(234,179,8,0.1)'; textCls = 'text-yellow-400'; borderStyle = '1px solid rgba(234,179,8,0.2)'; }
                  else if (present) { bg = 'rgba(34,197,94,0.15)'; textCls = 'text-green-300'; borderStyle = '1px solid rgba(34,197,94,0.3)'; }
                  else if (!isFuture) { bg = 'rgba(239,68,68,0.08)'; textCls = 'text-red-400'; borderStyle = '1px solid rgba(255,255,255,0.04)'; }
                  if (date === today) borderStyle = '1px solid rgba(59,130,246,0.5)';
                  return (
                    <div key={date} title={isHoliday ? `🎉 ${holidayReason}` : isPaidLeave ? '🏖️ Paid Leave' : isUnpaidLeave ? '📋 Unpaid Leave' : ''}
                      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all ${hasPhoto ? 'cursor-pointer hover:scale-105' : ''} ${textCls}`}
                      style={{ background: bg, border: borderStyle }}
                      onClick={() => hasPhoto && setPhotoPreview({ date, photo: record.photo })}>
                      {day}
                      {isHoliday && <div className="absolute bottom-0.5 text-xs">🎉</div>}
                      {isPaidLeave && <div className="absolute bottom-0.5 text-xs">🏖</div>}
                      {isUnpaidLeave && <div className="absolute bottom-0.5 text-xs">📋</div>}
                      {hasPhoto && !isHoliday && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />}
                      {overridden && <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-orange-400" title="Overridden by owner" />}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-4 mt-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/30 inline-block" /> Present</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/20 inline-block" /> Absent</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/20 inline-block" /> 🎉 Holiday</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/15 inline-block" /> 🏖 Paid Leave</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/15 inline-block" /> 📋 Unpaid Leave</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" /> Photo</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" /> Owner override</span>
            </div>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="p-5 border-b border-white/5 font-bold text-white">
              Daily Attendance — {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
            {loading ? (
              <div className="text-center py-10 text-slate-600">Loading...</div>
            ) : (
              <div className="divide-y divide-white/4">
                {calendar.filter(c => !c.isFuture).reverse().map(({ date, day, record, isHoliday, isPaidLeave, isUnpaidLeave, holidayReason }) => {
                  const present = record?.checkedIn;
                  const label = new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
                  const overridden = record?.overriddenByOwner;
                  return (
                    <div key={date} className="flex items-center gap-4 px-5 py-3 hover:bg-white/2 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isHoliday ? 'text-blue-400' : isPaidLeave ? 'text-green-400' : isUnpaidLeave ? 'text-yellow-400' : present ? 'text-green-300' : 'text-red-400'
                      }`} style={{ background: isHoliday ? 'rgba(59,130,246,0.12)' : isPaidLeave ? 'rgba(34,197,94,0.1)' : isUnpaidLeave ? 'rgba(234,179,8,0.1)' : present ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.08)' }}>
                        {day}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-white font-medium">{label}</div>
                        {isHoliday && <div className="text-xs text-blue-400">🎉 Holiday — {holidayReason}</div>}
                        {isPaidLeave && <div className="text-xs text-green-400">🏖️ Approved Paid Leave — No deduction</div>}
                        {isUnpaidLeave && <div className="text-xs text-yellow-400">📋 Approved Unpaid Leave — ₹250 deducted</div>}
                        {!isHoliday && !isPaidLeave && !isUnpaidLeave && present && record?.checkInTime && (
                          <div className="text-xs text-slate-500">
                            Checked in at {new Date(record.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            {overridden && <span className="ml-2 text-orange-400">· Owner override</span>}
                          </div>
                        )}
                        {!isHoliday && !isPaidLeave && !isUnpaidLeave && !present && <div className="text-xs text-red-400/70">Absent — ₹250 deducted</div>}
                      </div>
                      <div className="flex items-center gap-3">
                        {record?.photo && (
                          <img src={record.photo} alt="attendance" className="w-10 h-10 rounded-lg object-cover border border-green-500/30 cursor-pointer hover:scale-110 transition-transform" onClick={() => setPhotoPreview({ date, photo: record.photo })} />
                        )}
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isHoliday ? 'text-blue-400' : isPaidLeave ? 'text-green-400' : isUnpaidLeave ? 'text-yellow-400' : present ? 'text-green-400' : 'text-red-400'
                        }`} style={{ background: isHoliday ? 'rgba(59,130,246,0.1)' : isPaidLeave ? 'rgba(34,197,94,0.1)' : isUnpaidLeave ? 'rgba(234,179,8,0.1)' : present ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)' }}>
                          {isHoliday ? '🎉 Holiday' : isPaidLeave ? '🏖 Paid Leave' : isUnpaidLeave ? '📋 Unpaid Leave' : present ? '✅ Present' : '❌ Absent'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Leave Apply Modal ────────────────────────────────────────── */}
      {showLeaveForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowLeaveForm(false)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ background: '#0d1829', border: '1px solid rgba(124,58,237,0.25)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="font-bold text-white">🏖️ Apply for Leave</div>
              <button onClick={() => setShowLeaveForm(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Date</label>
                <input name="date" type="date" required className="w-full px-4 py-2.5 rounded-xl text-sm text-white border border-white/8 outline-none" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Leave Type</label>
                <select name="leaveType" required className="w-full px-4 py-2.5 rounded-xl text-sm text-white border border-white/8 outline-none" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <option value="paid" style={{ background: '#0d1829' }}>🏖️ Paid Leave (No deduction)</option>
                  <option value="unpaid" style={{ background: '#0d1829' }}>📋 Unpaid Leave (₹250 deducted)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Reason</label>
                <textarea name="reason" required rows={3} placeholder="Reason for leave..." className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 border border-white/8 outline-none resize-none" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
              <button type="submit" disabled={leaveLoading} className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                {leaveLoading ? 'Submitting...' : '📤 Submit Leave Request'}
              </button>
            </form>
            {/* My leave requests */}
            {myLeaves.length > 0 && (
              <div className="px-6 pb-5">
                <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">My Leave Requests</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {myLeaves.slice(0, 5).map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between p-2.5 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <span className="text-white font-medium">{l.dates?.join(', ')}</span>
                        <span className="text-slate-500 ml-2">{l.leaveType === 'paid' ? '🏖️ Paid' : '📋 Unpaid'}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${l.status === 'approved' ? 'text-green-400' : l.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}
                        style={{ background: l.status === 'approved' ? 'rgba(34,197,94,0.1)' : l.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)' }}>
                        {l.status === 'approved' ? '✅' : l.status === 'rejected' ? '❌' : '⏳'} {l.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Camera Modal ─────────────────────────────────────────────────── */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
          <div className="w-full max-w-md rounded-3xl overflow-hidden relative"
            style={{ background: '#0d1829', border: '1px solid rgba(59,130,246,0.25)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <div className="font-bold text-white">📷 Mark Attendance</div>
                <div className="text-xs text-slate-500 mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              </div>
              <button onClick={closeCamera} className="text-slate-500 hover:text-white text-xl transition-colors">✕</button>
            </div>

            <div className="p-6">
              {cameraError ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📷</div>
                  <p className="text-red-400 text-sm mb-4">{cameraError}</p>
                  <button onClick={openCamera}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                    Try Again
                  </button>
                </div>
              ) : capturedPhoto ? (
                /* Photo preview */
                <div className="text-center">
                  <div className="relative inline-block mb-3">
                    <img src={capturedPhoto} alt="Captured" className="w-full max-w-xs rounded-2xl mx-auto border-2 border-green-500/40" />
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">✓ Stamped</div>
                  </div>
                  <div className="text-xs text-slate-400 mb-1 flex items-center justify-center gap-1">
                    ⏰ {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </div>
                  {location && (
                    <div className="text-xs text-purple-400 mb-4 flex items-center justify-center gap-1">
                      📍 {location.address}
                    </div>
                  )}
                  <p className="text-slate-400 text-sm mb-5">Timestamp & location stamped. Submit to mark attendance.</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={retakePhoto}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 transition-all hover:text-white"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      🔄 Retake
                    </button>
                    <button onClick={submitAttendance} disabled={submitting}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 0 15px rgba(16,185,129,0.3)' }}>
                      {submitting ? 'Submitting...' : '✅ Submit Attendance'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Live camera */
                <div className="text-center">
                  <div className="relative rounded-2xl overflow-hidden mb-4 bg-black"
                    style={{ border: '2px solid rgba(59,130,246,0.3)' }}>
                    <video ref={videoRef} autoPlay playsInline muted
                      className="w-full rounded-2xl" style={{ maxHeight: '300px', objectFit: 'cover' }} />
                    {/* Overlay guide */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-40 h-48 rounded-2xl border-2 border-blue-400/60"
                        style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)' }} />
                    </div>
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                      <span className="text-xs text-white/70 bg-black/50 px-3 py-1 rounded-full">Position your face in the frame</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mb-4 flex items-center justify-center gap-1">
                    🔒 Camera only · No file upload · Photo required for attendance
                  </div>
                  <button onClick={capturePhoto} disabled={locLoading}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto transition-all hover:scale-110 active:scale-95 disabled:opacity-70 disabled:scale-100`}
                    style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', boxShadow: '0 0 25px rgba(59,130,246,0.5)' }}>
                    {locLoading ? '⏳' : '📸'}
                  </button>
                  <p className="text-xs text-slate-600 mt-3">
                    {locLoading ? 'Getting location...' : 'Tap to capture · Timestamp & location will be stamped'}
                  </p>
                </div>
              )}
            </div>
          </div>
          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* ── Photo Preview Modal ──────────────────────────────────────────── */}
      {photoPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}
          onClick={() => setPhotoPreview(null)}>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPhotoPreview(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm hover:bg-slate-600 z-10">
              ✕
            </button>
            <img src={photoPreview.photo} alt="Attendance photo"
              className="max-w-sm w-full rounded-2xl border-2 border-blue-500/30" />
            <div className="text-center mt-3 text-slate-400 text-sm">
              📅 {new Date(photoPreview.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
