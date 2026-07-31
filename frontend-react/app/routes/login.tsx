import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, MOCK_MODE } from '../utils/api';
import { saveSession, isLoggedIn, MOCK_USER } from '../utils/auth';

type Tab = 'login' | 'register' | 'forgot';

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => { if (isLoggedIn()) navigate('/dashboard'); }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true); setAlert(null);
    try {
      if (MOCK_MODE) { saveSession('mock-token', MOCK_USER); navigate('/dashboard'); return; }
      const data: any = await api.login({ employeeId: fd.get('empid'), password: fd.get('password') });
      saveSession(data.token, data.employee);
      if (data.employee?.role === 'mr') navigate('/mr-dashboard');
      else navigate('/dashboard');
    } catch (err: any) { setAlert({ msg: err.message, type: 'error' }); }
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true); setAlert(null);
    try {
      if (MOCK_MODE) {
        const mockEmp = { ...MOCK_USER, name: fd.get('name') as string, employeeId: fd.get('empid') as string, email: fd.get('email') as string, department: fd.get('dept') as string || 'Engineering', baseSalary: Number(fd.get('salary')) || 0 };
        saveSession('mock-token', mockEmp); navigate('/dashboard'); return;
      }
      const data: any = await api.register({ name: fd.get('name'), employeeId: fd.get('empid'), email: fd.get('email'), department: fd.get('dept'), baseSalary: Number(fd.get('salary')) || 0, password: fd.get('password') });
      saveSession(data.token, data.employee); navigate('/dashboard');
    } catch (err: any) { setAlert({ msg: err.message, type: 'error' }); }
    setLoading(false);
  }

  async function handleForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true); setAlert(null);
    try {
      const data: any = await api.forgotPassword({ email: fd.get('email') });
      setAlert({ msg: `Reset link sent! (Demo token: ${(data.resetToken || 'N/A').substring(0, 20)}...)`, type: 'success' });
    } catch (err: any) { setAlert({ msg: err.message, type: 'error' }); }
    setLoading(false);
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 transition-all border border-white/8 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 outline-none";
  const inputStyle = { background: 'rgba(255,255,255,0.04)' };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#050b18' }}>
      {/* Background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(29,78,216,0.25) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="w-full max-w-4xl flex rounded-3xl overflow-hidden relative z-10"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>

        {/* Left panel */}
        <div className="hidden md:flex flex-col justify-between flex-1 p-10 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, rgba(29,78,216,0.3) 0%, rgba(124,58,237,0.15) 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 30% 50%, rgba(59,130,246,0.15) 0%, transparent 60%)' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-12">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl glow-blue-sm"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>💼</div>
              <span className="font-bold text-white text-xl">Smart<span className="text-blue-400">Salary</span></span>
            </div>
            <h2 className="text-4xl font-extrabold text-white mb-4 leading-tight">
              Welcome<br /><span className="text-blue-400">Back</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-10">
              Access your salary dashboard, view history, and manage your profile securely.
            </p>
            <div className="space-y-3">
              {['Automated salary calculation', 'Secure JWT authentication', 'Real-time notifications', 'Complete salary history'].map(item => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                    style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)' }}>✓</div>
                  <span className="text-slate-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10 flex gap-6 text-center">
            {[['100%', 'Automated'], ['Secure', 'JWT'], ['24/7', 'Available']].map(([v, l]) => (
              <div key={l}>
                <div className="text-xl font-extrabold text-blue-400">{v}</div>
                <div className="text-xs text-slate-500">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right form */}
        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-8" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {(['login', 'register'] as Tab[]).map(t => (
              <button key={t} onClick={() => { setTab(t); setAlert(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                  tab === t ? 'text-white glow-blue-sm' : 'text-slate-500 hover:text-slate-300'
                }`}
                style={tab === t ? { background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' } : {}}>
                {t === 'login' ? 'Login' : 'Register'}
              </button>
            ))}
          </div>

          {/* Alert */}
          {alert && (
            <div className={`p-3 rounded-xl text-sm mb-5 flex items-center gap-2 ${
              alert.type === 'error'
                ? 'text-red-300 border border-red-500/20'
                : 'text-green-300 border border-green-500/20'
            }`} style={{ background: alert.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }}>
              {alert.type === 'error' ? '⚠️' : '✅'} {alert.msg}
            </div>
          )}

          {/* Login */}
          {tab === 'login' && (
            <>
              <h3 className="text-2xl font-bold text-white mb-1">Sign In</h3>
              <p className="text-slate-500 text-sm mb-6">Enter your Employee ID and password</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Employee ID</label>
                  <input name="empid" type="text" placeholder="e.g. EMP001" required className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
                  <div className="relative">
                    <input name="password" type={showPwd ? 'text' : 'password'} placeholder="Your password" required className={`${inputCls} pr-10`} style={inputStyle} />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showPwd ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <button type="button" onClick={() => { setTab('forgot'); setAlert(null); }}
                  className="text-xs text-blue-400 hover:text-blue-300 block text-right transition-colors">
                  Forgot password?
                </button>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 glow-blue"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                  {loading ? 'Signing in...' : 'Sign In →'}
                </button>
              </form>
              <p className="text-center text-sm text-slate-600 mt-6">
                <Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors">← Back to Home</Link>
                <span className="mx-2 text-slate-700">·</span>
                <Link to="/mr-login" className="text-green-400 hover:text-green-300 transition-colors">MR Login →</Link>
                <span className="mx-2 text-slate-700">·</span>
                <Link to="/owner-login" className="text-purple-400 hover:text-purple-300 transition-colors">Owner Login →</Link>
              </p>
            </>
          )}

          {/* Register */}
          {tab === 'register' && (
            <>
              <h3 className="text-2xl font-bold text-white mb-1">Create Account</h3>
              <p className="text-slate-500 text-sm mb-6">Register your employee profile</p>
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Full Name</label>
                    <input name="name" type="text" placeholder="John Doe" required className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Employee ID</label>
                    <input name="empid" type="text" placeholder="EMP001" required className={inputCls} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
                  <input name="email" type="email" placeholder="you@company.com" required className={inputCls} style={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Department</label>
                    <input name="dept" type="text" placeholder="Engineering" className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Base Salary (₹)</label>
                    <input name="salary" type="number" placeholder="50000" min="0" className={inputCls} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
                  <input name="password" type="password" placeholder="Min 6 characters" required minLength={6} className={inputCls} style={inputStyle} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50 glow-blue"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                  {loading ? 'Creating...' : 'Create Account →'}
                </button>
              </form>
            </>
          )}

          {/* Forgot */}
          {tab === 'forgot' && (
            <>
              <button onClick={() => setTab('login')} className="text-sm text-blue-400 hover:text-blue-300 mb-6 flex items-center gap-1 transition-colors">← Back to Login</button>
              <h3 className="text-2xl font-bold text-white mb-1">Reset Password</h3>
              <p className="text-slate-500 text-sm mb-6">Enter your registered email address</p>
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Email Address</label>
                  <input name="email" type="email" placeholder="you@company.com" required className={inputCls} style={inputStyle} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50 glow-blue"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                  {loading ? 'Sending...' : 'Send Reset Link →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
