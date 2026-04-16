import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../utils/api';
import { saveOwnerSession, isOwner } from '../utils/auth';

export default function OwnerLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => { if (isOwner()) navigate('/owner'); }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true); setError('');
    try {
      const data: any = await api.ownerLogin({ adminKey: fd.get('adminKey') });
      saveOwnerSession(data.token);
      navigate('/owner');
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#050b18' }}>
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(29,78,216,0.2) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="w-full max-w-md rounded-3xl p-10 relative z-10"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(124,58,237,0.2)', backdropFilter: 'blur(20px)' }}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 30px rgba(124,58,237,0.4)' }}>
            👑
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Owner Access</h1>
          <p className="text-slate-500 text-sm">Enter your admin key to continue</p>
          <div className="mt-3 px-4 py-2 rounded-xl text-xs text-purple-300 font-mono"
            style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
            🔑 Demo key: <span className="font-bold text-white select-all">owner@admin2026</span>
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
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Admin Key</label>
            <div className="relative">
              <input name="adminKey" type={showKey ? 'text' : 'password'} placeholder="Enter owner admin key" required
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 border border-white/8 outline-none transition-all pr-12"
                style={{ background: 'rgba(255,255,255,0.04)' }} />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors text-base">
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}>
            {loading ? 'Verifying...' : '👑 Access Owner Dashboard'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6">
          <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">← Employee Login</Link>
        </p>
      </div>
    </div>
  );
}
