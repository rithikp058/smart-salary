import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../utils/api';
import { saveMRSession, isMR } from '../utils/auth';

export default function MRLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => { if (isMR()) navigate('/mr-dashboard'); }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true); setError('');
    try {
      const data: any = await api.mrLogin({ mrId: fd.get('mrId'), password: fd.get('password') });
      saveMRSession(data.token, data.mr);
      navigate('/mr-dashboard');
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#050b18' }}>
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(29,78,216,0.2) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="w-full max-w-md rounded-3xl p-10 relative z-10"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16,185,129,0.2)', backdropFilter: 'blur(20px)' }}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 0 30px rgba(16,185,129,0.4)' }}>
            🧑‍💼
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">MR Login</h1>
          <p className="text-slate-500 text-sm">Medical Representative Dashboard</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-sm mb-5 text-red-300 border border-red-500/20 flex items-center gap-2"
            style={{ background: 'rgba(239,68,68,0.08)' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">MR ID</label>
            <input name="mrId" type="text" placeholder="e.g. MR001" required
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 border border-white/8 outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
            <div className="relative">
              <input name="password" type={showPwd ? 'text' : 'password'} placeholder="Your password" required
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 border border-white/8 outline-none transition-all pr-12"
                style={{ background: 'rgba(255,255,255,0.04)' }} />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}>
            {loading ? 'Signing in...' : '🧑‍💼 Access MR Dashboard'}
          </button>
        </form>

        <div className="flex justify-between mt-6 text-sm text-slate-600">
          <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">← Employee Login</Link>
          <Link to="/owner-login" className="text-purple-400 hover:text-purple-300 transition-colors">Owner Login →</Link>
        </div>
      </div>
    </div>
  );
}
