import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Navbar from '../components/Navbar';
import { api } from '../utils/api';
import { isLoggedIn, getUser, saveSession } from '../utils/auth';

export default function Profile() {
  const navigate = useNavigate();
  const [emp, setEmp] = useState<any>(null);
  const [alert, setAlert] = useState<{ msg: string; type: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return; }
    loadProfile();
  }, []);

  async function loadProfile() {
    try { setEmp(await api.getProfile()); } catch (err: any) {
      setAlert({ msg: err.message, type: 'error' });
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true); setAlert(null);
    const body = {
      name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'),
      department: fd.get('dept'), designation: fd.get('designation'),
      bankDetails: { bankName: fd.get('bankName'), accountNo: fd.get('accountNo'), ifsc: (fd.get('ifsc') as string)?.toUpperCase() },
    };
    try {
      const updated: any = await api.updateProfile(body);
      const user = getUser();
      if (user) { user.name = updated.name; saveSession(localStorage.getItem('ssp_token')!, user); }
      setAlert({ msg: 'Profile updated successfully', type: 'success' });
      loadProfile();
    } catch (err: any) { setAlert({ msg: err.message, type: 'error' }); }
    setLoading(false);
  }

  const inputCls = "w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 transition-all border border-white/8 outline-none";
  const inputStyle = { background: 'rgba(255,255,255,0.04)' };
  const disabledStyle = { background: 'rgba(255,255,255,0.02)', cursor: 'not-allowed' };
  const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };

  return (
    <div className="min-h-screen" style={{ background: '#050b18' }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] opacity-8"
          style={{ background: 'radial-gradient(circle, #1d4ed8 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <Navbar />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">👤 My Profile</h1>
          <p className="text-slate-500 mt-1 text-sm">View and update your personal and bank details.</p>
        </div>

        {/* Profile Header */}
        <div className="rounded-2xl p-6 flex items-center gap-5 mb-6 flex-wrap"
          style={{ background: 'linear-gradient(135deg, rgba(29,78,216,0.15) 0%, rgba(124,58,237,0.08) 100%)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 glow-blue-sm"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)' }}>
            {emp?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{emp?.name || 'Loading...'}</h2>
            <p className="text-slate-400 text-sm">{emp?.email || '—'}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-xs font-semibold px-3 py-1 rounded-full text-blue-300"
                style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
                {emp?.employeeId || '—'}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full text-green-300"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                {emp?.department || 'No Department'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">Base Salary</div>
            <div className="text-2xl font-extrabold text-green-400">₹{(emp?.baseSalary || 0).toLocaleString()}</div>
          </div>
        </div>

        {alert && (
          <div className={`p-3 rounded-xl text-sm mb-5 flex items-center gap-2 ${alert.type === 'error' ? 'text-red-300 border border-red-500/20' : 'text-green-300 border border-green-500/20'}`}
            style={{ background: alert.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }}>
            {alert.type === 'error' ? '⚠️' : '✅'} {alert.msg}
          </div>
        )}

        {emp && (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Info */}
              <div className="rounded-2xl p-6" style={cardStyle}>
                <div className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-5 pb-3"
                  style={{ borderBottom: '1px solid rgba(59,130,246,0.15)' }}>
                  Personal Information
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Full Name', name: 'name', placeholder: 'Your full name', val: emp.name },
                    { label: 'Email Address', name: 'email', type: 'email', placeholder: 'you@company.com', val: emp.email },
                    { label: 'Phone Number', name: 'phone', type: 'tel', placeholder: '+91 XXXXX XXXXX', val: emp.phone },
                  ].map(f => (
                    <div key={f.name}>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{f.label}</label>
                      <input name={f.name} type={f.type || 'text'} placeholder={f.placeholder} defaultValue={f.val || ''} key={f.val} className={inputCls} style={inputStyle} />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Department</label>
                      <input name="dept" type="text" placeholder="Engineering" defaultValue={emp.department || ''} key={emp.department} className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Designation</label>
                      <input name="designation" type="text" placeholder="Software Engineer" defaultValue={emp.designation || ''} key={emp.designation} className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Employee ID</label>
                    <input type="text" value={emp.employeeId || ''} disabled className={inputCls} style={disabledStyle} readOnly />
                    <span className="text-xs text-slate-600 mt-1 block">Cannot be changed</span>
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="rounded-2xl p-6" style={cardStyle}>
                <div className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-5 pb-3"
                  style={{ borderBottom: '1px solid rgba(59,130,246,0.15)' }}>
                  Bank Details
                </div>
                <div className="p-3 rounded-xl text-xs text-yellow-300 mb-5 flex items-center gap-2"
                  style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                  🔒 Bank details are stored securely for salary credits only.
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Bank Name', name: 'bankName', placeholder: 'State Bank of India', val: emp.bankDetails?.bankName },
                    { label: 'Account Number', name: 'accountNo', placeholder: 'XXXX XXXX XXXX', val: emp.bankDetails?.accountNo },
                    { label: 'IFSC Code', name: 'ifsc', placeholder: 'SBIN0001234', val: emp.bankDetails?.ifsc },
                  ].map(f => (
                    <div key={f.name}>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{f.label}</label>
                      <input name={f.name} type="text" placeholder={f.placeholder} defaultValue={f.val || ''} key={f.val} className={`${inputCls} uppercase`} style={inputStyle} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Base Salary (₹)</label>
                    <input type="number" value={emp.baseSalary || 0} disabled className={inputCls} style={disabledStyle} readOnly />
                    <span className="text-xs text-slate-600 mt-1 block">Set by admin</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 flex-wrap">
              <button type="submit" disabled={loading}
                className="px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50 glow-blue-sm"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                {loading ? 'Saving...' : '💾 Save Changes'}
              </button>
              <button type="button" onClick={loadProfile}
                className="px-6 py-2.5 rounded-xl font-semibold text-slate-300 text-sm transition-all hover:text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                ↺ Reset
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
