import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Navbar from '../components/Navbar';
import { api } from '../utils/api';
import { isLoggedIn, getUser } from '../utils/auth';

type Tab = 'enter-data' | 'history' | 'issues';

export default function Salary() {
  const navigate = useNavigate();
  const user = getUser();
  const [tab, setTab] = useState<Tab>('enter-data');
  const [enterAlert, setEnterAlert] = useState<{ msg: string; type: string } | null>(null);
  const [enterLoading, setEnterLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [attendance, setAttendance] = useState<any>(null);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  // Detail modal
  const [detailRecord, setDetailRecord] = useState<any>(null);
  // Issue reporting
  const [issues, setIssues] = useState<any[]>([]);
  const [issueAlert, setIssueAlert] = useState<{ msg: string; type: string } | null>(null);
  const [issueLoading, setIssueLoading] = useState(false);
  const [openThread, setOpenThread] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return; }
    api.getMyAttendance(currentMonth).then(setAttendance).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'history') loadHistory();
    if (tab === 'issues') api.getMyIssues().then((d: any) => setIssues(d)).catch(() => {});
  }, [tab]);

  // Auto-calculate preview from attendance + inputs
  async function handlePreview(e: React.ChangeEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    const sales = Number(fd.get('sales')) || 0;
    const distance = Number(fd.get('distance')) || 0;
    let baseSalary = 0;
    try { const emp: any = await api.getProfile(); baseSalary = emp.baseSalary || 0; } catch {}

    const daysWorked = attendance?.daysPresent || 0;
    const dailyRate = baseSalary / 26;
    const absentDays = Math.max(0, 26 - daysWorked);
    const earnedBase = Math.round(Math.min(daysWorked, 26) * dailyRate);
    const absentDeduction = absentDays * 250;
    const travelAllowance = distance > 50 ? distance * 2 : 0;

    let incentiveRate = 0;
    if (sales >= 150000) incentiveRate = 0.10;
    else if (sales >= 125000) incentiveRate = 0.075;
    else if (sales >= 100000) incentiveRate = 0.05;
    const incentive = Math.round(baseSalary * incentiveRate);

    const gross = earnedBase + incentive + travelAllowance;
    const tax = Math.round(gross * 0.1);
    const net = gross - tax - absentDeduction;
    setPreview({ baseSalary, daysWorked, absentDays, earnedBase, absentDeduction, travelAllowance, incentive, gross, tax, net, sales, distance });
  }

  async function handleEnterData(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setEnterLoading(true); setEnterAlert(null);
    try {
      await api.enterData({
        month: fd.get('month'),
        salesAmount: Number(fd.get('sales')) || 0,
        travelDistance: Number(fd.get('distance')) || 0,
      });
      setEnterAlert({ msg: 'Data saved successfully!', type: 'success' });
    } catch (err: any) { setEnterAlert({ msg: err.message, type: 'error' }); }
    setEnterLoading(false);
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try { setHistory(await api.getSalaryHistory() as any[]); } catch {}
    setHistoryLoading(false);
  }

  async function handleRaiseIssue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setIssueLoading(true); setIssueAlert(null);
    try {
      const thread = await api.raiseIssue({ month: fd.get('month'), title: fd.get('title'), message: fd.get('message') });
      setIssueAlert({ msg: 'Issue submitted. Owner will be notified.', type: 'success' });
      (e.target as HTMLFormElement).reset();
      const updated: any[] = await api.getMyIssues();
      setIssues(updated);
      setOpenThread(thread);
    } catch (err: any) { setIssueAlert({ msg: err.message, type: 'error' }); }
    setIssueLoading(false);
  }

  async function handleEmployeeReply() {
    if (!replyText.trim() || !openThread) return;
    setReplying(true);
    try {
      const updated = await api.replyToIssue(openThread.id, { text: replyText }, false);
      setOpenThread(updated);
      setReplyText('');
      const list: any[] = await api.getMyIssues();
      setIssues(list);
    } catch {}
    setReplying(false);
  }

  function downloadSlip(record: any) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Salary Slip - ${record.month}</title>
    <style>
      body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#1e293b}
      h1{color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:8px}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e2e8f0}
      .total{font-weight:bold;font-size:1.1em;color:#1d4ed8;border-top:2px solid #1d4ed8;margin-top:8px}
      .badge{background:#dcfce7;color:#166534;padding:2px 10px;border-radius:999px;font-size:0.85em}
    </style></head><body>
    <h1>💼 Smart Salary Processor</h1>
    <p><strong>Employee:</strong> ${user?.name || 'Employee'} &nbsp;|&nbsp; <strong>ID:</strong> ${user?.employeeId || '—'}</p>
    <p><strong>Month:</strong> ${record.month} &nbsp;|&nbsp; <span class="badge">${record.status}</span></p>
    <br/>
    <div class="row"><span>Base Salary</span><span>₹${record.baseSalary?.toLocaleString()}</span></div>
    <div class="row"><span>Days Worked</span><span>${record.daysWorked}/26</span></div>
    <div class="row"><span>Earned Pay</span><span>₹${Math.round((record.baseSalary/26)*record.daysWorked).toLocaleString()}</span></div>
    <div class="row"><span>Incentive</span><span style="color:green">+₹${(record.incentive||0).toLocaleString()}</span></div>
    <div class="row"><span>Travel Allowance</span><span style="color:green">+₹${(record.travelAllowance||0).toLocaleString()}</span></div>
    <div class="row"><span>Absent Deduction (${record.absentDays||0} days × ₹250)</span><span style="color:red">-₹${(record.absentDeduction||0).toLocaleString()}</span></div>
    <div class="row"><span>Other Deductions</span><span style="color:red">-₹${(record.deductions||0).toLocaleString()}</span></div>
    <div class="row"><span>Tax (10%)</span><span style="color:red">-₹${(record.tax||0).toLocaleString()}</span></div>
    <div class="row total"><span>Net Salary</span><span>₹${record.netSalary?.toLocaleString()}</span></div>
    <br/><p style="color:#94a3b8;font-size:0.8em">Generated on ${new Date().toLocaleDateString('en-IN')} · Smart Salary Processor</p>
    </body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `salary-slip-${record.month}.html`; a.click();
    URL.revokeObjectURL(url);
  }

  const alertBox = (a: { msg: string; type: string } | null) => a && (
    <div className={`p-3 rounded-xl text-sm mb-4 flex items-center gap-2 ${a.type === 'error' ? 'text-red-300 border border-red-500/20' : 'text-green-300 border border-green-500/20'}`}
      style={{ background: a.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }}>
      {a.type === 'error' ? '⚠️' : '✅'} {a.msg}
    </div>
  );

  const inputCls = "w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 transition-all border border-white/8 outline-none";
  const inputStyle = { background: 'rgba(255,255,255,0.04)' };
  const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };
  const statusBadge: Record<string, { bg: string; text: string }> = {
    pending: { bg: 'rgba(234,179,8,0.1)', text: 'text-yellow-400' },
    processed: { bg: 'rgba(59,130,246,0.1)', text: 'text-blue-400' },
    credited: { bg: 'rgba(34,197,94,0.1)', text: 'text-green-400' },
  };

  return (
    <div className="min-h-screen" style={{ background: '#050b18' }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[400px] opacity-8"
          style={{ background: 'radial-gradient(circle, #1d4ed8 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>
      <Navbar />
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">💰 Salary</h1>
          <p className="text-slate-500 mt-1 text-sm">Submit your monthly data and view salary history.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1 rounded-2xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {([['enter-data', '📝 Enter Data'], ['history', '📊 History'], ['issues', '🚨 Report Issue']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'text-white glow-blue-sm' : 'text-slate-500 hover:text-slate-300'}`}
              style={tab === t ? { background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' } : {}}>
              {label}
            </button>
          ))}
        </div>

        {/* Enter Data */}
        {tab === 'enter-data' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl p-6" style={cardStyle}>
              <div className="font-bold text-white mb-1">📝 Monthly Data</div>
              <div className="text-xs text-slate-500 mb-5">Attendance is auto-calculated from check-ins</div>

              {/* Attendance summary */}
              <div className="p-3 rounded-xl mb-4 flex items-center justify-between"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <span className="text-sm text-slate-300">📅 Days Present (auto)</span>
                <span className="font-bold text-blue-400">{attendance?.daysPresent ?? '—'} / 26</span>
              </div>

              {alertBox(enterAlert)}
              <form onSubmit={handleEnterData} onChange={handlePreview} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Month</label>
                  <input name="month" type="month" defaultValue={currentMonth} required className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">MRP Sales Amount (₹)</label>
                  <input name="sales" type="number" placeholder="e.g. 125000" min="0" className={inputCls} style={inputStyle} />
                  <span className="text-xs text-slate-600 mt-1 block">≥₹1L → 5% · ≥₹1.25L → 7.5% · ≥₹1.5L → 10% incentive</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Travel Distance (km)</label>
                  <input name="distance" type="number" placeholder="e.g. 60" min="0" className={inputCls} style={inputStyle} />
                  <span className="text-xs text-slate-600 mt-1 block">&gt;50 km → ₹2/km travel allowance</span>
                </div>
                <button type="submit" disabled={enterLoading}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50 glow-blue-sm"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                  {enterLoading ? 'Saving...' : 'Save Data →'}
                </button>
              </form>
            </div>

            {/* Live Preview */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <div className="font-bold text-white mb-1">📊 Salary Preview</div>
              <div className="text-xs text-slate-500 mb-5">Live calculation as you type</div>
              {preview ? (
                <div className="space-y-1">
                  {[
                    ['Base Salary', `₹${preview.baseSalary.toLocaleString()}`, 'text-slate-400'],
                    [`Days Worked (${preview.daysWorked}/26)`, `₹${preview.earnedBase.toLocaleString()}`, preview.daysWorked < 26 ? 'text-yellow-400' : 'text-slate-300'],
                    [`Absent Deduction (${preview.absentDays} × ₹250)`, `-₹${preview.absentDeduction.toLocaleString()}`, 'text-red-400'],
                    ['Travel Allowance', `+₹${preview.travelAllowance.toLocaleString()}`, 'text-green-400'],
                    ['Incentive', `+₹${preview.incentive.toLocaleString()}`, 'text-purple-400'],
                    ['Tax (10%)', `-₹${preview.tax.toLocaleString()}`, 'text-red-400'],
                  ].map(([label, val, cls]) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-white/4 last:border-0">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className={`text-sm font-semibold ${cls}`}>{val}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 mt-2"
                    style={{ borderTop: '2px solid rgba(59,130,246,0.3)' }}>
                    <span className="font-bold text-white">Net Salary</span>
                    <span className="text-2xl font-extrabold text-blue-400">₹{preview.net.toLocaleString()}</span>
                  </div>
                  {preview.absentDays > 0 && (
                    <div className="mt-3 p-2.5 rounded-lg text-xs text-yellow-300 flex items-center gap-2"
                      style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                      ⚠️ ₹250 deducted per absent day ({preview.absentDays} day{preview.absentDays > 1 ? 's' : ''})
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-52 text-slate-600">
                  <div className="text-5xl mb-3 opacity-20">📊</div>
                  <p className="text-sm">Fill in the form to see a live preview</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="p-6 border-b border-white/5">
              <div className="font-bold text-white mb-1">📊 Salary History</div>
              <div className="text-xs text-slate-500">Click 👁 to view full breakdown · 📥 to download slip</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Month', 'Days', 'Base', 'Incentive', 'Travel', 'Deductions', 'Net Salary', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr><td colSpan={9} className="text-center py-12 text-slate-600">Loading...</td></tr>
                  ) : history.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-slate-600">No salary records found.</td></tr>
                  ) : history.map((r, i) => {
                    const badge = statusBadge[r.status] || statusBadge.processed;
                    return (
                      <tr key={i} className="border-t border-white/4 hover:bg-white/2 transition-colors">
                        <td className="px-4 py-4 font-semibold text-white">{r.month}</td>
                        <td className="px-4 py-4 text-slate-300">{r.daysWorked ?? '—'}/26</td>
                        <td className="px-4 py-4 text-slate-300">₹{(r.baseSalary||0).toLocaleString()}</td>
                        <td className="px-4 py-4 text-purple-400">+₹{(r.incentive||0).toLocaleString()}</td>
                        <td className="px-4 py-4 text-green-400">+₹{(r.travelAllowance||0).toLocaleString()}</td>
                        <td className="px-4 py-4 text-red-400">-₹{((r.absentDeduction||0)+(r.deductions||0)).toLocaleString()}</td>
                        <td className="px-4 py-4 font-bold text-white">₹{r.netSalary?.toLocaleString()}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge.text}`}
                            style={{ background: badge.bg }}>{r.status}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => setDetailRecord(r)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-400 transition-all hover:text-white"
                              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                              👁 Details
                            </button>
                            <button onClick={() => downloadSlip(r)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-400 transition-all hover:text-white"
                              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                              📥 Slip
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Issues */}
        {tab === 'issues' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ minHeight: '520px' }}>

            {/* Left: list + new issue */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* New Issue Form */}
              <div className="rounded-2xl p-5" style={cardStyle}>
                <div className="font-bold text-white mb-1 text-sm">🚨 Raise New Issue</div>
                {issueAlert && (
                  <div className={`p-2.5 rounded-xl text-xs mb-3 ${issueAlert.type === 'error' ? 'text-red-300 border border-red-500/20' : 'text-green-300 border border-green-500/20'}`}
                    style={{ background: issueAlert.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }}>
                    {issueAlert.type === 'error' ? '⚠️' : '✅'} {issueAlert.msg}
                  </div>
                )}
                <form onSubmit={handleRaiseIssue} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Month</label>
                    <select name="month" required className="w-full px-3 py-2 rounded-xl text-xs text-white border border-white/8 outline-none" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {Array.from({ length: 6 }, (_, i) => {
                        const d = new Date(); d.setMonth(d.getMonth() - i);
                        const val = d.toISOString().slice(0, 7);
                        return <option key={val} value={val} style={{ background: '#0d1829' }}>{d.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Title</label>
                    <input name="title" type="text" placeholder="e.g. Salary mismatch" required className="w-full px-3 py-2 rounded-xl text-xs text-white placeholder-slate-600 border border-white/8 outline-none" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Description</label>
                    <textarea name="message" required rows={3} placeholder="Describe the issue in detail..." className="w-full px-3 py-2 rounded-xl text-xs text-white placeholder-slate-600 border border-white/8 outline-none resize-none" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                  <button type="submit" disabled={issueLoading} className="w-full py-2.5 rounded-xl font-bold text-white text-xs transition-all hover:scale-[1.02] disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
                    {issueLoading ? 'Submitting...' : '🚨 Submit Issue'}
                  </button>
                </form>
              </div>

              {/* Issue list */}
              <div className="rounded-2xl overflow-hidden flex-1" style={cardStyle}>
                <div className="px-4 py-3 border-b border-white/5 text-xs font-bold text-white">📋 My Issues ({issues.length})</div>
                <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
                  {issues.length === 0 ? (
                    <div className="text-center py-8 text-slate-600 text-xs">No issues yet</div>
                  ) : issues.map((t: any) => {
                    const statusCfg: Record<string, { bg: string; text: string; label: string }> = {
                      pending: { bg: 'rgba(234,179,8,0.1)', text: 'text-yellow-400', label: '⏳ Pending' },
                      replied: { bg: 'rgba(59,130,246,0.1)', text: 'text-blue-400', label: '💬 Replied' },
                      resolved: { bg: 'rgba(34,197,94,0.1)', text: 'text-green-400', label: '✅ Resolved' },
                    };
                    const sc = statusCfg[t.status] || statusCfg.pending;
                    const isOpen = openThread?.id === t.id;
                    return (
                      <button key={t.id} onClick={() => setOpenThread(t)}
                        className={`w-full text-left px-4 py-3 border-b border-white/4 transition-all hover:bg-white/3 ${isOpen ? 'bg-blue-500/8' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-white truncate max-w-[140px]">{t.title}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.text}`} style={{ background: sc.bg }}>{sc.label}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-400">{t.month}</span>
                          <span className="text-xs text-slate-600">{t.messages?.length || 0} msg{t.messages?.length !== 1 ? 's' : ''}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Chat thread */}
            <div className="lg:col-span-3 rounded-2xl flex flex-col overflow-hidden" style={{ ...cardStyle, minHeight: '480px' }}>
              {!openThread ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8">
                  <div className="text-5xl mb-3 opacity-20">💬</div>
                  <p className="text-sm">Select an issue to view the conversation</p>
                  <p className="text-xs mt-1 text-slate-700">or raise a new issue on the left</p>
                </div>
              ) : (
                <>
                  {/* Thread header */}
                  <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-2"
                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div>
                      <div className="font-bold text-white text-sm">{openThread.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Month: {openThread.month} · {new Date(openThread.createdAt).toLocaleDateString('en-IN')}</div>
                    </div>
                    {(() => {
                      const sc: Record<string, { bg: string; text: string; label: string }> = {
                        pending: { bg: 'rgba(234,179,8,0.1)', text: 'text-yellow-400', label: '⏳ Pending' },
                        replied: { bg: 'rgba(59,130,246,0.1)', text: 'text-blue-400', label: '💬 Replied' },
                        resolved: { bg: 'rgba(34,197,94,0.1)', text: 'text-green-400', label: '✅ Resolved' },
                      };
                      const s = sc[openThread.status] || sc.pending;
                      return <span className={`text-xs font-bold px-3 py-1 rounded-full ${s.text}`} style={{ background: s.bg }}>{s.label}</span>;
                    })()}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '340px' }}>
                    {(openThread.messages || []).map((msg: any) => {
                      const isEmployee = msg.sender === 'employee';
                      return (
                        <div key={msg.id} className={`flex ${isEmployee ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] ${isEmployee ? 'items-start' : 'items-end'} flex flex-col gap-1`}>
                            <div className="flex items-center gap-2 px-1">
                              <span className="text-xs text-slate-500">{msg.senderName}</span>
                              <span className="text-xs text-slate-700">{new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            </div>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isEmployee ? 'rounded-tl-sm text-white' : 'rounded-tr-sm text-white'}`}
                              style={{ background: isEmployee ? 'rgba(59,130,246,0.15)' : 'rgba(124,58,237,0.2)', border: `1px solid ${isEmployee ? 'rgba(59,130,246,0.2)' : 'rgba(124,58,237,0.3)'}` }}>
                              {msg.text}
                            </div>
                            {/* Attachments */}
                            {msg.attachments?.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {msg.attachments.map((att: string, ai: number) => (
                                  att.startsWith('data:image') ? (
                                    <img key={ai} src={att} alt="attachment" className="w-24 h-24 rounded-xl object-cover cursor-pointer border border-white/10 hover:scale-105 transition-transform" onClick={() => window.open(att)} />
                                  ) : (
                                    <a key={ai} href={att} download className="px-3 py-1.5 rounded-lg text-xs text-blue-400 border border-blue-500/20 hover:bg-blue-500/10 transition-colors" style={{ background: 'rgba(59,130,246,0.06)' }}>📎 Attachment</a>
                                  )
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply box — only if not resolved */}
                  {openThread.status !== 'resolved' ? (
                    <div className="px-4 py-3 border-t border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex gap-2 items-end">
                        <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEmployeeReply(); } }}
                          placeholder="Type your reply... (Enter to send)" rows={2}
                          className="flex-1 px-3 py-2 rounded-xl text-sm text-white placeholder-slate-600 border border-white/8 outline-none resize-none transition-all focus:border-blue-500/40"
                          style={{ background: 'rgba(255,255,255,0.04)' }} />
                        <button onClick={handleEmployeeReply} disabled={replying || !replyText.trim()}
                          className="px-4 py-2 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-40 flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                          {replying ? '...' : '➤'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 mt-1.5">Shift+Enter for new line · Enter to send</p>
                    </div>
                  ) : (
                    <div className="px-4 py-3 border-t border-white/5 text-center text-xs text-green-400/60">
                      ✅ This issue has been resolved
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      {detailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => setDetailRecord(null)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}
            style={{ background: '#0d1829', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <div className="font-bold text-white">💰 Salary Details</div>
                <div className="text-xs text-slate-500">{detailRecord.month}</div>
              </div>
              <button onClick={() => setDetailRecord(null)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6 space-y-2">
              {[
                ['Base Salary', `₹${(detailRecord.baseSalary||0).toLocaleString()}`, 'text-slate-300'],
                [`Days Worked (${detailRecord.daysWorked}/26)`, `₹${Math.round((detailRecord.baseSalary/26)*detailRecord.daysWorked).toLocaleString()}`, 'text-slate-300'],
                ['Incentive', `+₹${(detailRecord.incentive||0).toLocaleString()}`, 'text-purple-400'],
                ['Travel Allowance', `+₹${(detailRecord.travelAllowance||0).toLocaleString()}`, 'text-green-400'],
                [`Absent Deduction (${detailRecord.absentDays||0} × ₹250)`, `-₹${(detailRecord.absentDeduction||0).toLocaleString()}`, 'text-red-400'],
                ['Other Deductions', `-₹${(detailRecord.deductions||0).toLocaleString()}`, 'text-red-400'],
                ['Tax (10%)', `-₹${(detailRecord.tax||0).toLocaleString()}`, 'text-red-400'],
              ].map(([label, val, cls]) => (
                <div key={label as string} className="flex justify-between items-center py-2 border-b border-white/4 last:border-0">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className={`text-sm font-semibold ${cls}`}>{val}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-4" style={{ borderTop: '2px solid rgba(59,130,246,0.3)' }}>
                <span className="font-bold text-white">Net Salary</span>
                <span className="text-2xl font-extrabold text-blue-400">₹{detailRecord.netSalary?.toLocaleString()}</span>
              </div>
              <div className="flex gap-2 pt-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge[detailRecord.status]?.text || 'text-blue-400'}`}
                  style={{ background: statusBadge[detailRecord.status]?.bg || 'rgba(59,130,246,0.1)' }}>
                  {detailRecord.status}
                </span>
                {detailRecord.creditedAt && (
                  <span className="text-xs text-slate-500 flex items-center">
                    Credited: {new Date(detailRecord.creditedAt).toLocaleDateString('en-IN')}
                  </span>
                )}
              </div>
            </div>
            <div className="px-6 pb-5">
              <button onClick={() => { downloadSlip(detailRecord); setDetailRecord(null); }}
                className="w-full py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] glow-blue-sm"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                📥 Download Salary Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
