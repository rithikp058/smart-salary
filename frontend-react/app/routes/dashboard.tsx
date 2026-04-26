import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Navbar from '../components/Navbar';
import { api } from '../utils/api';
import { isLoggedIn, getUser } from '../utils/auth';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const [stats, setStats] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [pwdAlert, setPwdAlert] = useState<{ msg: string; type: string } | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [doctorProgress, setDoctorProgress] = useState<{ visited: number; target: number; percentage: number } | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return; }
    api.getLatestSalary().then(setStats).catch(() => {});
    api.getProfile().then(setProfile).catch(() => {});
    api.getNotifications().then((n: any) => setNotifs(n)).catch(() => {});
    api.getMyAttendance().then(setAttendance).catch(() => {});
    api.getMyProgress().then((d: any) => setDoctorProgress({ visited: d.visited || 0, target: d.target || 0, percentage: d.percentage || 0 })).catch(() => {});
  }, []);

  async function markAllRead() {
    await api.markNotificationsRead();
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function handlePwdChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPwdLoading(true); setPwdAlert(null);
    try {
      await api.changePassword({ currentPassword: fd.get('cur'), newPassword: fd.get('new') });
      setPwdAlert({ msg: 'Password updated successfully', type: 'success' });
      (e.target as HTMLFormElement).reset();
    } catch (err: any) { setPwdAlert({ msg: err.message, type: 'error' }); }
    setPwdLoading(false);
  }

  const now = new Date();
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const unreadCount = notifs.filter(n => !n.read).length;
  const statusMap: Record<string, string> = { pending: '⏳ Pending', processed: '🔄 Processed', credited: '✅ Credited' };
  const absentDays = Math.max(0, 26 - (attendance?.daysPresent || 0));

  const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };
  const inputCls = "w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 transition-all border border-white/8 outline-none";
  const inputStyle = { background: 'rgba(255,255,255,0.04)' };

  return (
    <div className="min-h-screen" style={{ background: '#050b18' }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[400px] opacity-10"
          style={{ background: 'radial-gradient(circle, #1d4ed8 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] opacity-8"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <Navbar />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl p-7 mb-8 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(29,78,216,0.2) 0%, rgba(124,58,237,0.1) 100%)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 80% 50%, rgba(59,130,246,0.1) 0%, transparent 60%)' }} />
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">👋 Welcome back, <span className="text-blue-400">{user?.name || 'Employee'}</span></h2>
              <p className="text-slate-400 text-sm">Here's your overview for {monthLabel}.</p>
            </div>
            <div className="px-4 py-2 rounded-xl text-sm font-semibold text-blue-300"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              📅 {monthLabel}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: '💰', label: 'Net Salary', value: stats ? `₹${stats.netSalary?.toLocaleString()}` : '—', color: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: 'text-green-400' },
            { icon: '🎯', label: 'Incentive', value: stats ? `₹${(stats.incentive || 0).toLocaleString()}` : '—', color: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)', text: 'text-purple-400' },
            { icon: '✅', label: 'Days Present', value: attendance ? `${attendance.daysPresent}/26` : '—', color: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', text: 'text-blue-400' },
            { icon: '📋', label: 'Status', value: stats ? (statusMap[stats.status] || stats.status) : '—', color: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)', text: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-5 flex items-center gap-4 transition-all hover:-translate-y-0.5"
              style={{ background: s.color, border: `1px solid ${s.border}` }}>
              <div className="text-3xl">{s.icon}</div>
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-0.5">{s.label}</div>
                <div className={`text-lg font-bold ${s.text}`}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Doctor Visit Progress */}
        {doctorProgress !== null && (
          <div className="rounded-2xl p-5 mb-8"
            style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wide font-semibold">🏥 Doctor Visits — {monthLabel}</span>
                <div className="text-white font-bold text-xl mt-0.5">
                  Visited {doctorProgress.visited}
                  {doctorProgress.target > 0
                    ? <span className="text-slate-400 font-normal text-base"> / {doctorProgress.target} Doctors</span>
                    : <span className="text-slate-500 text-sm font-normal ml-2">(No target set)</span>
                  }
                </div>
              </div>
              {doctorProgress.target > 0 && (
                <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${
                  doctorProgress.percentage >= 100 ? 'bg-green-500/20 text-green-300' :
                  doctorProgress.percentage >= 60  ? 'bg-orange-500/20 text-orange-300' :
                  doctorProgress.percentage >= 30  ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {doctorProgress.percentage}% complete
                </span>
              )}
            </div>
            {doctorProgress.target > 0 && (
              <>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${doctorProgress.percentage}%`,
                      background: doctorProgress.percentage >= 100
                        ? 'linear-gradient(90deg,#059669,#10b981)'
                        : doctorProgress.percentage >= 60
                        ? 'linear-gradient(90deg,#ea580c,#f97316)'
                        : doctorProgress.percentage >= 30
                        ? 'linear-gradient(90deg,#d97706,#f59e0b)'
                        : 'linear-gradient(90deg,#dc2626,#ef4444)',
                    }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                  <span>{doctorProgress.visited} visited (GPS + photo verified)</span>
                  <span>{Math.max(0, doctorProgress.target - doctorProgress.visited)} remaining</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { to: '/salary', icon: '💰', title: 'Salary', desc: 'View and process your monthly salary.', color: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.15)' },
            { to: '/attendance', icon: '📅', title: 'Attendance', desc: 'Check in daily and view your attendance.', color: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.15)' },
            { to: '/call-report', icon: '📋', title: 'Field Reports', desc: 'Report doctor visits and raise stock requests.', color: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.15)' },
            { to: '/profile', icon: '👤', title: 'Profile', desc: 'Update personal and bank details.', color: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.15)' },
          ].map(card => (
            <Link key={card.title} to={card.to}
              className="rounded-2xl p-6 block transition-all hover:-translate-y-1 group relative overflow-hidden"
              style={{ background: card.color, border: `1px solid ${card.border}` }}>
              <div className="text-3xl mb-3 transition-transform group-hover:scale-110">{card.icon}</div>
              <h3 className="font-bold text-white mb-1 text-sm">{card.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
              <div className="absolute bottom-4 right-4 text-slate-600 group-hover:text-blue-400 transition-colors text-lg">→</div>
            </Link>
          ))}
        </div>
        {/* Notifications quick access */}
        <div className="mb-8">
          <button onClick={() => setShowNotifs(true)}
            className="rounded-2xl p-5 text-left transition-all hover:-translate-y-1 group relative overflow-hidden cursor-pointer w-full sm:w-auto"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.15)' }}>
            <div className="flex items-center gap-3">
              <div className="text-2xl relative inline-block">
                🔔{unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse-glow" />}
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Notifications</h3>
                <p className="text-xs text-slate-500">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
              </div>
            </div>
          </button>
        </div>

        {/* Incentive Info + Change Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Incentive breakdown */}
          <div className="rounded-2xl p-6" style={cardStyle}>
            <div className="font-bold text-white mb-1">🎯 Incentive Structure</div>
            <div className="text-xs text-slate-500 mb-4">Based on MRP Sales this month</div>
            <div className="space-y-2">
              {[
                ['< ₹1,00,000', 'No incentive', stats?.salesAmount < 100000],
                ['₹1,00,000', '5% of base salary', stats?.salesAmount >= 100000 && stats?.salesAmount < 125000],
                ['₹1,25,000', '7.5% of base salary', stats?.salesAmount >= 125000 && stats?.salesAmount < 150000],
                ['₹1,50,000+', '10% of base salary', stats?.salesAmount >= 150000],
              ].map(([range, reward, active]) => (
                <div key={range as string} className={`flex justify-between items-center p-2.5 rounded-xl text-sm transition-all ${active ? 'border border-purple-500/30' : ''}`}
                  style={{ background: active ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)' }}>
                  <span className={active ? 'text-purple-300 font-semibold' : 'text-slate-500'}>{range as string}</span>
                  <span className={active ? 'text-purple-400 font-bold' : 'text-slate-600'}>{reward as string}</span>
                  {active && <span className="text-purple-400 text-xs">← current</span>}
                </div>
              ))}
            </div>
            {stats && (
              <div className="mt-3 p-2.5 rounded-xl text-xs text-slate-400"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                Your sales: <span className="text-white font-semibold">₹{(stats.salesAmount || 0).toLocaleString()}</span>
                {' · '}Incentive earned: <span className="text-purple-400 font-semibold">₹{(stats.incentive || 0).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="rounded-2xl p-6" style={cardStyle}>
            <div className="font-bold text-white mb-1">🔒 Change Password</div>
            <div className="text-xs text-slate-500 mb-4">Update your login password</div>
            {pwdAlert && (
              <div className={`p-3 rounded-xl text-xs mb-3 ${pwdAlert.type === 'error' ? 'text-red-300 border border-red-500/20' : 'text-green-300 border border-green-500/20'}`}
                style={{ background: pwdAlert.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }}>
                {pwdAlert.type === 'error' ? '⚠️' : '✅'} {pwdAlert.msg}
              </div>
            )}
            <form onSubmit={handlePwdChange} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Current Password</label>
                <input name="cur" type="password" placeholder="Current password" required className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">New Password</label>
                <input name="new" type="password" placeholder="Min 6 characters" required minLength={6} className={inputCls} style={inputStyle} />
              </div>
              <button type="submit" disabled={pwdLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50 glow-blue-sm"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                {pwdLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Notifications Modal */}
      {showNotifs && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowNotifs(false)}>
          <div className="w-full max-w-md rounded-2xl p-6 relative" onClick={e => e.stopPropagation()}
            style={{ background: '#0d1829', border: '1px solid rgba(59,130,246,0.2)' }}>
            <button onClick={() => setShowNotifs(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl">✕</button>
            <h3 className="font-bold text-white text-lg mb-1">🔔 Notifications</h3>
            <p className="text-slate-500 text-xs mb-4">Your recent salary alerts</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {notifs.length === 0 ? (
                <p className="text-center text-slate-600 py-6 text-sm">No notifications yet.</p>
              ) : notifs.map((n, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${!n.read ? 'border border-blue-500/20' : 'border border-white/4'}`}
                  style={{ background: !n.read ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: 'rgba(59,130,246,0.15)' }}>🔔</div>
                  <div>
                    <div className={`text-sm ${!n.read ? 'text-white font-semibold' : 'text-slate-400'}`}>{n.message}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{new Date(n.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={markAllRead}
              className="mt-4 text-xs px-4 py-2 rounded-lg text-blue-400 transition-all hover:text-white"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              Mark all as read
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
