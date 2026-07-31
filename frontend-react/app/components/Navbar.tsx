import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { getUser, clearSession } from '../utils/auth';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    clearSession();
    navigate('/login');
  }

  const links = [
    { to: '/dashboard', label: '🏠 Dashboard' },
    { to: '/salary', label: '💰 Salary' },
    { to: '/attendance', label: '📅 Attendance' },
    { to: '/pharma-employee', label: '💊 Field Portal' },
    { to: '/profile', label: '👤 Profile' },
  ];

  return (
    <nav
      className="sticky top-0 z-40 w-full"
      style={{
        background: 'rgba(5,11,24,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          to="/dashboard"
          className="text-white font-extrabold text-base tracking-tight flex items-center gap-2 flex-shrink-0"
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)' }}
          >
            💼
          </span>
          <span className="hidden sm:inline">SmartSalary</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ to, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                style={active ? { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' } : {}}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* User badge */}
          {user && (
            <div className="hidden sm:flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)' }}
              >
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="text-xs text-slate-400 max-w-[120px] truncate">{user.name}</span>
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all hover:bg-red-500/10 hover:border-red-500/20 border border-transparent"
          >
            🚪 Logout
          </button>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-slate-400 hover:text-white transition-colors p-1"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className="md:hidden px-4 pb-4 pt-2 flex flex-col gap-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {links.map(({ to, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                style={active ? { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' } : {}}
              >
                {label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="mt-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all text-left"
          >
            🚪 Logout
          </button>
        </div>
      )}
    </nav>
  );
}
