import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { clearSession, getUser } from '../utils/auth';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  function logout() { clearSession(); navigate('/login'); }

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5"
      style={{ background: 'rgba(5,11,24,0.85)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg glow-blue-sm"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>💼</div>
          <span className="font-bold text-white text-lg tracking-tight">
            Smart<span className="text-blue-400">Salary</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {[['Dashboard', '/dashboard'], ['Salary', '/salary'], ['Attendance', '/attendance'], ['Profile', '/profile']].map(([label, path]) => (
            <Link key={path} to={path}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive(path)
                  ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm text-slate-300 font-medium">{user?.name || 'Employee'}</span>
          </div>
          <button onClick={logout}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all">
            Logout
          </button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2 text-slate-400" onClick={() => setOpen(!open)}>
          <div className="w-5 space-y-1">
            <span className="block h-0.5 bg-current rounded" />
            <span className="block h-0.5 bg-current rounded" />
            <span className="block h-0.5 bg-current rounded" />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/5 px-6 py-4 space-y-1"
          style={{ background: 'rgba(5,11,24,0.95)' }}>
          {[['Dashboard', '/dashboard'], ['Salary', '/salary'], ['Attendance', '/attendance'], ['Profile', '/profile']].map(([label, path]) => (
            <Link key={path} to={path} onClick={() => setOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive(path) ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>{label}</Link>
          ))}
          <button onClick={logout} className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
