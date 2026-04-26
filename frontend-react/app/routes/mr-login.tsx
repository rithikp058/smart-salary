import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../utils/api';
import { saveSession, isLoggedIn, isMR } from '../utils/auth';

export default function MRLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (isLoggedIn() && isMR()) navigate('/mr-dashboard');
    else if (isLoggedIn()) navigate('/dashboard');
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true); setError('');
    try {
      const data: any = await api.login({
        employeeId: fd.get('empid'),
        password: fd.get('password'),
      });
      if (data.employee?.role !== 'mr') {
        setError('This account is not an MR account. Use the Employee Login instead.');
        setLoading(false);
        return;
      }
      saveSession(data.token, data.employee);
      navigate('/mr-dashboard');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 border border-white/8 focus:border-green-500/60 outline-none transition-all";
  const inputStyle = { background: 'rgba(255,255,255,0.04)' };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#050b18' }}>
      {/* Background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.2) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="w-full max-w-md rounded-3xl p-10 relative z-10"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16,185,129,0.2)', backdropFilter: 'blur(20px)' }}>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 0 30px rgba(16,185,129,0.35)' }}>
            🧑‍💼
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">MR Login</h1>
          <p className="text-slate-500 text-sm">Medical Representative Portal</p>
          <div className="mt-3 px-4 py-2 rounded-xl text-xs text-green-300 font-medium"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            🔐 Use your MR Employee ID &amp; password
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-sm mb-5 text-red-300 border border-red-500/20 flex items-center gap-2"
            style={{ background: 'rgba(239,68,68,0.08)' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">MR Employee ID</label>
            <input name="empid" type="text" placeholder="e.g. MR001" required className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
            <div className="relative">
              <input name="password" type={showPwd ? 'text' : 'password'} placeholder="Your password" required
                className={`${inputCls} pr-10`} style={inputStyle} />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}>
            {loading ? 'Signing in...' : '🧑‍💼 Access MR Dashboard →'}
          </button>
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-slate-600">
          <div>
            <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">← Employee Login</Link>
            <span className="mx-2 text-slate-700">·</span>
            <Link to="/owner-login" className="text-purple-400 hover:text-purple-300 transition-colors">Owner Login →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
