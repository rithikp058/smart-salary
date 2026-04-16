import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { isLoggedIn } from '../utils/auth';

export default function Home() {
  const navigate = useNavigate();
  useEffect(() => { if (isLoggedIn()) navigate('/dashboard'); }, []);

  const features = [
    { icon: '🔐', title: 'Secure Auth', desc: 'JWT-based login with bcrypt password hashing.' },
    { icon: '⚙️', title: 'Auto Calculation', desc: 'Bonus, overtime, tax computed automatically.' },
    { icon: '📊', title: 'Salary History', desc: 'Full monthly breakdown with detailed records.' },
    { icon: '🔔', title: 'Notifications', desc: 'Instant alerts when salary is credited.' },
  ];

  const stats = [['100%', 'Automated'], ['Secure', 'JWT Auth'], ['Real-time', 'Processing'], ['Zero', 'Manual Work']];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#050b18' }}>
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #1d4ed8 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg glow-blue-sm"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>💼</div>
          <span className="font-bold text-white text-lg">Smart<span className="text-blue-400">Salary</span></span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-slate-400 hover:text-white text-sm transition-colors">Features</a>
          <a href="#stats" className="text-slate-400 hover:text-white text-sm transition-colors">About</a>
        </div>
        <Link to="/login"
          className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 glow-blue-sm"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
          Get Started →
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-6 pt-16 pb-24 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-blue-300 mb-8"
          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-glow" />
          Automated Payroll System
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6">
          Professional<br />
          <span className="text-glow" style={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Salary
          </span>{' '}
          Processing
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Modern payroll automation for companies. Calculate bonuses, manage records, and credit salaries — all from one sleek dashboard.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap mb-16">
          <Link to="/login"
            className="px-8 py-3.5 rounded-xl font-bold text-white text-base transition-all hover:scale-105 hover:shadow-2xl glow-blue"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
            🚀 Get Started
          </Link>
          <a href="#features"
            className="px-8 py-3.5 rounded-xl font-semibold text-slate-300 text-base transition-all hover:text-white glass gradient-border">
            Learn More
          </a>
        </div>

        {/* Dashboard preview card */}
        <div className="relative max-w-2xl mx-auto animate-float">
          <div className="rounded-2xl p-6 gradient-border glow-blue"
            style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(59,130,246,0.2)' }}>
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 mx-4 h-5 rounded-md text-xs text-slate-500 flex items-center px-3"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                localhost:5173/dashboard
              </div>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-glow" />
            </div>
            {/* Mini dashboard */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[['💰', 'Net Salary', '₹52,400', 'text-green-400'], ['⭐', 'Performance', '85/100', 'text-yellow-400'], ['✅', 'Status', 'Credited', 'text-blue-400']].map(([icon, label, val, cls]) => (
                <div key={label} className="rounded-xl p-3 text-left" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-lg mb-1">{icon}</div>
                  <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                  <div className={`text-sm font-bold ${cls}`}>{val}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Salary Progress</span><span className="text-blue-400">72%</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full w-[72%] rounded-full glow-blue-sm" style={{ background: 'linear-gradient(90deg, #1d4ed8, #60a5fa)' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section id="stats" className="relative z-10 py-12 border-y border-white/5"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(([val, label]) => (
            <div key={label}>
              <div className="text-3xl font-extrabold text-white mb-1" style={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{val}</div>
              <div className="text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">What We Offer</p>
            <h2 className="text-4xl font-extrabold text-white mb-4">Everything for payroll</h2>
            <p className="text-slate-500 max-w-md mx-auto">A complete solution to manage employee salaries with automation and security.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl p-6 gradient-border transition-all hover:-translate-y-1 group"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 transition-all group-hover:scale-110"
                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>{f.icon}</div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto rounded-3xl p-12 gradient-border"
          style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to automate payroll?</h2>
          <p className="text-slate-400 mb-8">Join and experience modern salary processing.</p>
          <Link to="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-all hover:scale-105 glow-blue"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-sm text-slate-600">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span className="text-slate-500">Modern</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span className="text-slate-500">Fast</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span className="text-slate-500">Secure</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span className="text-slate-500">Scalable</span>
        </div>
        © 2026 <span className="text-blue-400 font-semibold">SmartSalary</span> — Built for modern payroll automation
      </footer>
    </div>
  );
}
