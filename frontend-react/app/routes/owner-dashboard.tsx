import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import * as XLSX from 'xlsx';
import { api } from '../utils/api';
import { isOwner, clearSession } from '../utils/auth';

type Tab = 'overview' | 'employees' | 'attendance' | 'salaries' | 'deductions' | 'issues' | 'excel' | 'holidays' | 'leaves';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [employees, setEmployees] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: string } | null>(null);
  const [deductionInputs, setDeductionInputs] = useState<Record<string, number>>({});
  const [allIssues, setAllIssues] = useState<any[]>([]);
  const [resolveNote, setResolveNote] = useState<Record<string, string>>({});

  // ── Excel Sheet State ──────────────────────────────────────────────────
  type ExcelRow = {
    id: string;
    acNo: string; name: string; joiningDate: string; lastIncrDate: string;
    salary: number; incre: number; arrears: number;
    totalSal: number; // auto: salary + incre + arrears
    netSalary: number; // auto: totalSal - all deductions
    eePfDeduction: number; pTax: number; advance: number; deduction: number;
    remarks: string; total: number; // auto: sum of deductions
    remarksApproval: string; paidDate: string;
    dayAllowance: number; leaves: number; noCallReport: number;
    leavesNotApproved: number; paidLeaves: number;
    sala: number; basicSalary: number; epfDeduction: number;
  };

  const emptyRow = (id: string): ExcelRow => ({
    id, acNo: '', name: '', joiningDate: '', lastIncrDate: '',
    salary: 0, incre: 0, arrears: 0, totalSal: 0, netSalary: 0,
    eePfDeduction: 0, pTax: 0, advance: 0, deduction: 0,
    remarks: '', total: 0, remarksApproval: '', paidDate: '',
    dayAllowance: 0, leaves: 0, noCallReport: 0,
    leavesNotApproved: 0, paidLeaves: 0,
    sala: 0, basicSalary: 0, epfDeduction: 0,
  });

  const STORAGE_KEY = `ssp_excel_${selectedMonth}`;
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);

  // Load rows from localStorage when month changes
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setExcelRows(JSON.parse(saved));
    } else {
      // Pre-fill from existing employees
      const rows = employees.map(e => ({
        ...emptyRow(e.employeeId),
        acNo: e.bankDetails?.accountNo || '',
        name: e.name,
        salary: e.baseSalary || 0,
        basicSalary: e.baseSalary || 0,
        dayAllowance: e.travelDistance > 50 ? e.travelDistance * 2 : 0,
      }));
      setExcelRows(rows.length ? rows : [emptyRow('1')]);
    }
  }, [selectedMonth, employees]);

  function calcRow(row: ExcelRow): ExcelRow {
    const totalSal = row.salary + row.incre + row.arrears;
    const leaveDeduction = row.leaves * 250;
    const total = row.eePfDeduction + row.pTax + row.advance + row.deduction + leaveDeduction;
    const netSalary = totalSal + row.dayAllowance - total;
    const epfDeduction = Math.round(row.basicSalary * 0.12);
    return { ...row, totalSal, total, netSalary, epfDeduction };
  }

  function updateRow(id: string, field: keyof ExcelRow, value: any) {
    setExcelRows(prev => {
      const updated = prev.map(r => r.id === id ? calcRow({ ...r, [field]: field === 'name' || field === 'acNo' || field === 'joiningDate' || field === 'lastIncrDate' || field === 'remarks' || field === 'remarksApproval' || field === 'paidDate' ? value : Number(value) || 0 }) : r);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  function addRow() {
    const newRow = emptyRow(Date.now().toString());
    setExcelRows(prev => {
      const updated = [...prev, newRow];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  function deleteRow(id: string) {
    setExcelRows(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  // Totals
  const totals = excelRows.reduce((acc, r) => ({
    salary: acc.salary + r.salary, incre: acc.incre + r.incre, arrears: acc.arrears + r.arrears,
    totalSal: acc.totalSal + r.totalSal, netSalary: acc.netSalary + r.netSalary,
    eePfDeduction: acc.eePfDeduction + r.eePfDeduction, pTax: acc.pTax + r.pTax,
    advance: acc.advance + r.advance, deduction: acc.deduction + r.deduction,
    total: acc.total + r.total, dayAllowance: acc.dayAllowance + r.dayAllowance,
    leaves: acc.leaves + r.leaves, basicSalary: acc.basicSalary + r.basicSalary,
    epfDeduction: acc.epfDeduction + r.epfDeduction,
  }), { salary: 0, incre: 0, arrears: 0, totalSal: 0, netSalary: 0, eePfDeduction: 0, pTax: 0, advance: 0, deduction: 0, total: 0, dayAllowance: 0, leaves: 0, basicSalary: 0, epfDeduction: 0 });

  function exportXLSX() {
    const monthLabel = new Date(selectedMonth + '-01').toLocaleString('default', { month: 'short', year: '2-digit' });
    const headers = ['A/c No', 'Name', 'Joining Date', 'Last Incr Date', 'Salary', 'INCRE', 'Arrears', 'Total Sal', 'Net Salary', 'EE PF Deductions', 'P TAX', 'Advance', 'DEDUCTION', 'REMARKS', 'TOTAL', 'REMARKS (Approval)', 'PAID Date', 'DAY ALLOWANCE', 'LEAVES', 'NO CALL REPORT', 'LEAVES NOT APPROVED', 'PAID LEAVES', 'SALA', 'BASIC SALARY', 'EPF Deduction'];
    const dataRows = excelRows.map(r => [
      r.acNo, r.name, r.joiningDate, r.lastIncrDate,
      r.salary, r.incre, r.arrears, r.totalSal, r.netSalary,
      r.eePfDeduction, r.pTax, r.advance, r.deduction, r.remarks,
      r.total, r.remarksApproval, r.paidDate,
      r.dayAllowance, r.leaves, r.noCallReport, r.leavesNotApproved,
      r.paidLeaves, r.sala, r.basicSalary, r.epfDeduction,
    ]);
    const totalsRow = [
      'TOTAL', '', '', '',
      totals.salary, totals.incre, totals.arrears, totals.totalSal, totals.netSalary,
      totals.eePfDeduction, totals.pTax, totals.advance, totals.deduction, '',
      totals.total, '', '',
      totals.dayAllowance, totals.leaves, '', '', '', '', totals.basicSalary, totals.epfDeduction,
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows, totalsRow]);

    // Column widths
    ws['!cols'] = headers.map((h, i) => ({ wch: [10, 20, 14, 14, 10, 8, 8, 10, 10, 14, 8, 8, 10, 16, 8, 18, 12, 14, 8, 14, 18, 12, 8, 12, 14][i] || 12 }));

    // Style header row (bold)
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
      if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: '1E3A5F' } }, alignment: { horizontal: 'center' } };
    }
    // Style totals row
    const lastRow = dataRows.length + 1;
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: lastRow, c: C })];
      if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: 'FFD700' } } };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Salary ${monthLabel}`);
    XLSX.writeFile(wb, `salary-sheet-${selectedMonth}.xlsx`);
  }

  useEffect(() => {
    if (!isOwner()) { navigate('/owner-login'); return; }
    loadAll();
    api.getAllIssues().then((d: any) => setAllIssues(d)).catch(() => {});
  }, [selectedMonth]);

  async function loadAll() {
    setLoading(true);
    try {
      const [emps, sals, att] = await Promise.all([
        api.getEmployees(),
        api.getAllSalaries(selectedMonth),
        api.getAllAttendance(selectedMonth),
      ]);
      setEmployees(emps as any[]);
      setSalaries(sals as any[]);
      setAttendance(att as any[]);
    } catch {}
    setLoading(false);
  }

  async function creditSalary(employeeId: string) {
    const deductions = deductionInputs[employeeId] || 0;
    try {
      await api.buildSalary(selectedMonth, employeeId, deductions);
      setAlert({ msg: `Salary credited for ${employeeId}`, type: 'success' });
      loadAll();
    } catch (err: any) { setAlert({ msg: err.message, type: 'error' }); }
  }

  async function saveDeduction(employeeId: string, month: string) {
    const deductions = deductionInputs[`${employeeId}-${month}`] || 0;
    try {
      await api.setDeductions({ employeeId, month, deductions });
      setAlert({ msg: 'Deduction saved', type: 'success' });
      loadAll();
    } catch (err: any) { setAlert({ msg: err.message, type: 'error' }); }
  }

  // Export all salaries as CSV (Excel-compatible)
  function exportExcel() {
    const headers = ['Month', 'Employee ID', 'Name', 'Days', 'Base Salary', 'Incentive', 'Travel', 'Absent Ded.', 'Deductions', 'Tax', 'Net Salary', 'Status'];
    const rows = salaries.map(r => [
      r.month, r.employeeId, r.employeeName, r.daysWorked,
      r.baseSalary, r.incentive || 0, r.travelAllowance || 0,
      r.absentDeduction || 0, r.deductions || 0, r.tax, r.netSalary, r.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `salary-report-${selectedMonth}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // Export individual salary as HTML (printable PDF)
  function exportPDF(r: any) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Salary Report - ${r.employeeId} - ${r.month}</title>
    <style>
      body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#1e293b}
      h1{color:#7c3aed;border-bottom:2px solid #7c3aed;padding-bottom:8px}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e2e8f0}
      .total{font-weight:bold;font-size:1.1em;color:#7c3aed;border-top:2px solid #7c3aed;margin-top:8px}
      .badge{background:#ede9fe;color:#5b21b6;padding:2px 10px;border-radius:999px;font-size:0.85em}
    </style></head><body>
    <h1>👑 Owner Salary Report</h1>
    <p><strong>Employee:</strong> ${r.employeeName} &nbsp;|&nbsp; <strong>ID:</strong> ${r.employeeId}</p>
    <p><strong>Month:</strong> ${r.month} &nbsp;|&nbsp; <span class="badge">${r.status}</span></p><br/>
    <div class="row"><span>Base Salary</span><span>₹${r.baseSalary?.toLocaleString()}</span></div>
    <div class="row"><span>Days Worked</span><span>${r.daysWorked}/26</span></div>
    <div class="row"><span>Incentive</span><span style="color:green">+₹${(r.incentive||0).toLocaleString()}</span></div>
    <div class="row"><span>Travel Allowance</span><span style="color:green">+₹${(r.travelAllowance||0).toLocaleString()}</span></div>
    <div class="row"><span>Absent Deduction</span><span style="color:red">-₹${(r.absentDeduction||0).toLocaleString()}</span></div>
    <div class="row"><span>Other Deductions</span><span style="color:red">-₹${(r.deductions||0).toLocaleString()}</span></div>
    <div class="row"><span>Tax (10%)</span><span style="color:red">-₹${(r.tax||0).toLocaleString()}</span></div>
    <div class="row total"><span>Net Salary</span><span>₹${r.netSalary?.toLocaleString()}</span></div>
    <br/><p style="color:#94a3b8;font-size:0.8em">Generated by Owner · Smart Salary Processor · ${new Date().toLocaleDateString('en-IN')}</p>
    </body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `report-${r.employeeId}-${r.month}.html`; a.click();
    URL.revokeObjectURL(url);
  }

  const totalNetSalary = salaries.reduce((s, r) => s + (r.netSalary || 0), 0);
  const totalEmployees = employees.length;
  const creditedCount = salaries.filter(r => r.status === 'credited').length;

  const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };
  const inputCls = "px-3 py-2 rounded-xl text-sm text-white border border-white/8 outline-none w-28";
  const inputStyle = { background: 'rgba(255,255,255,0.04)' };

  const tabs: [Tab, string][] = [
    ['overview', '📊 Overview'],
    ['employees', '👥 Employees'],
    ['attendance', '📅 Attendance'],
    ['salaries', '💰 Salaries'],
    ['deductions', '✂️ Deductions'],
    ['issues', '🚨 Issues'],
    ['excel', '📋 Excel Sheet'],
    ['holidays', '🎉 Holidays'],
    ['leaves', '🏖️ Leaves'],
  ];

  return (
    <div className="min-h-screen" style={{ background: '#050b18' }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] opacity-10"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-8"
          style={{ background: 'radial-gradient(circle, #1d4ed8 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Owner Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/5"
        style={{ background: 'rgba(5,11,24,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}>👑</div>
            <span className="font-bold text-white text-lg">Smart<span className="text-purple-400">Salary</span> <span className="text-xs text-purple-400 font-normal">Owner</span></span>
          </div>
          <div className="flex items-center gap-3">
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm text-white border border-white/8 outline-none"
              style={{ background: 'rgba(255,255,255,0.04)' }} />
            <Link to="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Employee View</Link>
            <button onClick={() => { clearSession(); navigate('/owner-login'); }}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {alert && (
          <div className={`p-3 rounded-xl text-sm mb-5 flex items-center gap-2 ${alert.type === 'error' ? 'text-red-300 border border-red-500/20' : 'text-green-300 border border-green-500/20'}`}
            style={{ background: alert.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }}
            onClick={() => setAlert(null)}>
            {alert.type === 'error' ? '⚠️' : '✅'} {alert.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap p-1 rounded-2xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {tabs.map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
              style={tab === t ? { background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.3)' } : {}}>
              {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { icon: '👥', label: 'Total Employees', value: totalEmployees, color: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', text: 'text-blue-400' },
                { icon: '💰', label: 'Total Payroll', value: `₹${totalNetSalary.toLocaleString()}`, color: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: 'text-green-400' },
                { icon: '✅', label: 'Salaries Credited', value: `${creditedCount}/${salaries.length}`, color: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)', text: 'text-purple-400' },
                { icon: '📅', label: 'Month', value: selectedMonth, color: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)', text: 'text-yellow-400' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-5 flex items-center gap-4"
                  style={{ background: s.color, border: `1px solid ${s.border}` }}>
                  <div className="text-3xl">{s.icon}</div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{s.label}</div>
                    <div className={`text-lg font-bold ${s.text}`}>{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={exportExcel}
                className="px-5 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 0 15px rgba(16,185,129,0.3)' }}>
                📊 Export Excel (CSV)
              </button>
            </div>
          </div>
        )}

        {/* Employees */}
        {tab === 'employees' && (
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="p-5 border-b border-white/5 font-bold text-white">👥 All Employees</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['ID', 'Name', 'Department', 'Designation', 'Base Salary', 'Travel (km)'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e, i) => (
                    <tr key={i} className="border-t border-white/4 hover:bg-white/2">
                      <td className="px-5 py-3 text-blue-400 font-semibold">{e.employeeId}</td>
                      <td className="px-5 py-3 text-white">{e.name}</td>
                      <td className="px-5 py-3 text-slate-400">{e.department || '—'}</td>
                      <td className="px-5 py-3 text-slate-400">{e.designation || '—'}</td>
                      <td className="px-5 py-3 text-green-400 font-semibold">₹{(e.baseSalary || 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-300">{e.travelDistance || 0} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Attendance */}
        {tab === 'attendance' && (
          <OwnerAttendance attendance={attendance} selectedMonth={selectedMonth} employees={employees} onRefresh={loadAll} />
        )}

        {/* Salaries */}
        {tab === 'salaries' && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={exportExcel}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                📊 Export Excel
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="p-5 border-b border-white/5 font-bold text-white">💰 Salary Records — {selectedMonth}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      {['Employee', 'Days', 'Incentive', 'Travel', 'Absent Ded.', 'Deductions', 'Tax', 'Net', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {salaries.length === 0 ? (
                      <tr><td colSpan={10} className="text-center py-10 text-slate-600">No salary data for this month.</td></tr>
                    ) : salaries.map((r, i) => (
                      <tr key={i} className="border-t border-white/4 hover:bg-white/2">
                        <td className="px-4 py-3">
                          <div className="text-white font-semibold text-xs">{r.employeeName}</div>
                          <div className="text-slate-500 text-xs">{r.employeeId}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{r.daysWorked}/26</td>
                        <td className="px-4 py-3 text-purple-400">+₹{(r.incentive||0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-green-400">+₹{(r.travelAllowance||0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-400">-₹{(r.absentDeduction||0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-400">-₹{(r.deductions||0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-400">-₹{(r.tax||0).toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-white">₹{r.netSalary?.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${r.status === 'credited' ? 'text-green-400' : r.status === 'processed' ? 'text-blue-400' : 'text-yellow-400'}`}
                            style={{ background: r.status === 'credited' ? 'rgba(34,197,94,0.1)' : r.status === 'processed' ? 'rgba(59,130,246,0.1)' : 'rgba(234,179,8,0.1)' }}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          {r.status !== 'credited' && (
                            <button onClick={() => creditSalary(r.employeeId)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-green-400 transition-all hover:text-white whitespace-nowrap"
                              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                              ✅ Credit
                            </button>
                          )}
                          <button onClick={() => exportPDF(r)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-400 transition-all hover:text-white"
                            style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                            📄 PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Deductions */}
        {tab === 'deductions' && (
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="p-5 border-b border-white/5">
              <div className="font-bold text-white mb-1">✂️ Manage Deductions — {selectedMonth}</div>
              <div className="text-xs text-slate-500">Set additional deductions per employee. Absent deductions (₹250/day) are automatic.</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Employee', 'Absent Days', 'Auto Deduction', 'Extra Deduction (₹)', 'Action'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salaries.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-slate-600">No salary data for this month.</td></tr>
                  ) : salaries.map((r, i) => {
                    const key = `${r.employeeId}-${r.month}`;
                    return (
                      <tr key={i} className="border-t border-white/4 hover:bg-white/2">
                        <td className="px-5 py-3">
                          <div className="text-white font-semibold">{r.employeeName}</div>
                          <div className="text-slate-500 text-xs">{r.employeeId}</div>
                        </td>
                        <td className="px-5 py-3 text-red-400">{r.absentDays || 0} days</td>
                        <td className="px-5 py-3 text-yellow-400">₹{(r.absentDeduction || 0).toLocaleString()}</td>
                        <td className="px-5 py-3">
                          <input type="number" min="0" placeholder="0"
                            defaultValue={r.deductions || 0}
                            onChange={e => setDeductionInputs(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                            className={inputCls} style={inputStyle} />
                        </td>
                        <td className="px-5 py-3">
                          <button onClick={() => saveDeduction(r.employeeId, r.month)}
                            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-blue-400 transition-all hover:text-white"
                            style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                            Save
                          </button>
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
          <OwnerIssues allIssues={allIssues} setAllIssues={setAllIssues} />
        )}

        {/* Holidays */}
        {tab === 'holidays' && <OwnerHolidays selectedMonth={selectedMonth} />}

        {/* Leaves */}
        {tab === 'leaves' && <OwnerLeaves selectedMonth={selectedMonth} />}

        {/* Excel Sheet */}
        {tab === 'excel' && (
          <div>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-white font-bold text-lg">📋 Salary Sheet — {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <p className="text-slate-500 text-xs mt-0.5">Editable spreadsheet · Auto-calculates · Saves per month</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={addRow}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                  + Add Row
                </button>
                <button onClick={exportXLSX}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 0 15px rgba(16,185,129,0.3)' }}>
                  📥 Download Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* Spreadsheet */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse" style={{ minWidth: '2400px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(124,58,237,0.2)', borderBottom: '2px solid rgba(124,58,237,0.4)' }}>
                      {[
                        'A/c No', 'Name', 'Joining Date', 'Last Incr Date',
                        'Salary', 'INCRE', 'Arrears', 'Total Sal ▶', 'Net Salary ▶',
                        'EE PF Ded.', 'P TAX', 'Advance', 'DEDUCTION', 'REMARKS',
                        'TOTAL ▶', 'REMARKS (Approval)', 'PAID Date',
                        'DAY ALLOW.', 'LEAVES', 'NO CALL RPT', 'LEAVES N/A', 'PAID LEAVES',
                        'SALA', 'BASIC SAL', 'EPF Ded. ▶', '🗑',
                      ].map((h, i) => (
                        <th key={i} className={`px-2 py-2.5 text-left font-bold whitespace-nowrap ${h.includes('▶') ? 'text-yellow-300' : 'text-purple-200'}`}
                          style={{ minWidth: ['80px','140px','100px','100px','80px','70px','70px','90px','90px','90px','70px','70px','90px','120px','80px','140px','90px','90px','70px','90px','90px','90px','70px','90px','90px','40px'][i] }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {excelRows.map((row, ri) => (
                      <tr key={row.id} className={`border-b border-white/5 ${ri % 2 === 0 ? '' : ''}`}
                        style={{ background: ri % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)' }}>
                        {/* Text fields */}
                        {(['acNo', 'name', 'joiningDate', 'lastIncrDate'] as const).map(f => (
                          <td key={f} className="px-1 py-1">
                            <input value={row[f] as string} onChange={e => updateRow(row.id, f, e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg text-white text-xs border border-transparent focus:border-purple-500/50 outline-none transition-all"
                              style={{ background: 'rgba(255,255,255,0.05)', minWidth: f === 'name' ? '130px' : '90px' }}
                              placeholder={f === 'name' ? 'Employee name' : f === 'acNo' ? 'Account No' : 'DD/MM/YYYY'} />
                          </td>
                        ))}
                        {/* Number fields */}
                        {(['salary', 'incre', 'arrears'] as const).map(f => (
                          <td key={f} className="px-1 py-1">
                            <input type="number" value={row[f] || ''} onChange={e => updateRow(row.id, f, e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg text-white text-xs border border-transparent focus:border-purple-500/50 outline-none transition-all text-right"
                              style={{ background: 'rgba(255,255,255,0.05)', minWidth: '70px' }} placeholder="0" />
                          </td>
                        ))}
                        {/* Auto: Total Sal */}
                        <td className="px-2 py-1 text-right font-bold text-yellow-300 whitespace-nowrap">
                          {row.totalSal.toLocaleString()}
                        </td>
                        {/* Auto: Net Salary */}
                        <td className="px-2 py-1 text-right font-bold text-green-400 whitespace-nowrap">
                          {row.netSalary.toLocaleString()}
                        </td>
                        {/* Deduction number fields */}
                        {(['eePfDeduction', 'pTax', 'advance', 'deduction'] as const).map(f => (
                          <td key={f} className="px-1 py-1">
                            <input type="number" value={row[f] || ''} onChange={e => updateRow(row.id, f, e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg text-red-300 text-xs border border-transparent focus:border-red-500/50 outline-none transition-all text-right"
                              style={{ background: 'rgba(239,68,68,0.06)', minWidth: '70px' }} placeholder="0" />
                          </td>
                        ))}
                        {/* Remarks text */}
                        <td className="px-1 py-1">
                          <input value={row.remarks} onChange={e => updateRow(row.id, 'remarks', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg text-slate-300 text-xs border border-transparent focus:border-white/20 outline-none"
                            style={{ background: 'rgba(255,255,255,0.04)', minWidth: '110px' }} placeholder="Remarks" />
                        </td>
                        {/* Auto: Total deductions */}
                        <td className="px-2 py-1 text-right font-bold text-red-400 whitespace-nowrap">
                          {row.total.toLocaleString()}
                        </td>
                        {/* Remarks approval + paid date */}
                        {(['remarksApproval', 'paidDate'] as const).map(f => (
                          <td key={f} className="px-1 py-1">
                            <input value={row[f] as string} onChange={e => updateRow(row.id, f, e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg text-slate-300 text-xs border border-transparent focus:border-white/20 outline-none"
                              style={{ background: 'rgba(255,255,255,0.04)', minWidth: f === 'remarksApproval' ? '130px' : '85px' }}
                              placeholder={f === 'paidDate' ? 'DD/MM/YYYY' : 'Approval'} />
                          </td>
                        ))}
                        {/* Day allowance + leave fields */}
                        {(['dayAllowance', 'leaves', 'noCallReport', 'leavesNotApproved', 'paidLeaves', 'sala'] as const).map(f => (
                          <td key={f} className="px-1 py-1">
                            <input type="number" value={row[f] || ''} onChange={e => updateRow(row.id, f, e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg text-xs border border-transparent focus:border-blue-500/50 outline-none transition-all text-right"
                              style={{ background: 'rgba(59,130,246,0.06)', color: f === 'leaves' || f === 'leavesNotApproved' ? '#f87171' : '#93c5fd', minWidth: '65px' }}
                              placeholder="0" />
                          </td>
                        ))}
                        {/* Basic salary */}
                        <td className="px-1 py-1">
                          <input type="number" value={row.basicSalary || ''} onChange={e => updateRow(row.id, 'basicSalary', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg text-white text-xs border border-transparent focus:border-purple-500/50 outline-none text-right"
                            style={{ background: 'rgba(255,255,255,0.05)', minWidth: '80px' }} placeholder="0" />
                        </td>
                        {/* Auto: EPF */}
                        <td className="px-2 py-1 text-right font-bold text-yellow-300 whitespace-nowrap">
                          {row.epfDeduction.toLocaleString()}
                        </td>
                        {/* Delete */}
                        <td className="px-2 py-1 text-center">
                          <button onClick={() => deleteRow(row.id)}
                            className="text-red-500/50 hover:text-red-400 transition-colors text-base">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals row */}
                  <tfoot>
                    <tr style={{ background: 'rgba(124,58,237,0.15)', borderTop: '2px solid rgba(124,58,237,0.4)' }}>
                      <td className="px-2 py-2.5 font-bold text-purple-300 text-xs" colSpan={4}>TOTAL</td>
                      <td className="px-2 py-2.5 font-bold text-yellow-300 text-right text-xs">{totals.salary.toLocaleString()}</td>
                      <td className="px-2 py-2.5 font-bold text-yellow-300 text-right text-xs">{totals.incre.toLocaleString()}</td>
                      <td className="px-2 py-2.5 font-bold text-yellow-300 text-right text-xs">{totals.arrears.toLocaleString()}</td>
                      <td className="px-2 py-2.5 font-bold text-yellow-300 text-right text-xs">{totals.totalSal.toLocaleString()}</td>
                      <td className="px-2 py-2.5 font-bold text-green-400 text-right text-xs">{totals.netSalary.toLocaleString()}</td>
                      <td className="px-2 py-2.5 font-bold text-red-400 text-right text-xs">{totals.eePfDeduction.toLocaleString()}</td>
                      <td className="px-2 py-2.5 font-bold text-red-400 text-right text-xs">{totals.pTax.toLocaleString()}</td>
                      <td className="px-2 py-2.5 font-bold text-red-400 text-right text-xs">{totals.advance.toLocaleString()}</td>
                      <td className="px-2 py-2.5 font-bold text-red-400 text-right text-xs">{totals.deduction.toLocaleString()}</td>
                      <td className="px-2 py-2.5" />
                      <td className="px-2 py-2.5 font-bold text-red-400 text-right text-xs">{totals.total.toLocaleString()}</td>
                      <td className="px-2 py-2.5" colSpan={2} />
                      <td className="px-2 py-2.5 font-bold text-blue-400 text-right text-xs">{totals.dayAllowance.toLocaleString()}</td>
                      <td className="px-2 py-2.5 font-bold text-red-400 text-right text-xs">{totals.leaves.toLocaleString()}</td>
                      <td className="px-2 py-2.5" colSpan={4} />
                      <td className="px-2 py-2.5 font-bold text-yellow-300 text-right text-xs">{totals.basicSalary.toLocaleString()}</td>
                      <td className="px-2 py-2.5 font-bold text-yellow-300 text-right text-xs">{totals.epfDeduction.toLocaleString()}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-3 text-xs text-slate-600 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400/30 inline-block" /> Auto-calculated</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400/20 inline-block" /> Deductions</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400/20 inline-block" /> Attendance fields</span>
              <span className="text-slate-700">· Data saved per month in browser · Export to .xlsx preserves all columns</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Owner Issues Chat Component ────────────────────────────────────────────
import { useRef } from 'react';

function OwnerIssues({ allIssues, setAllIssues }: { allIssues: any[]; setAllIssues: (v: any[]) => void }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'replied' | 'resolved'>('all');
  const [openThread, setOpenThread] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [replying, setReplying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = filter === 'all' ? allIssues : allIssues.filter((t: any) => t.status === filter);

  async function handleReply() {
    if ((!replyText.trim() && !attachments.length) || !openThread) return;
    setReplying(true);
    try {
      const updated = await api.replyToIssue(openThread.id, { text: replyText, attachments }, true);
      setOpenThread(updated);
      setReplyText(''); setAttachments([]);
      const list: any[] = await api.getAllIssues();
      setAllIssues(list);
    } catch {}
    setReplying(false);
  }

  async function handleStatus(status: string) {
    if (!openThread) return;
    const updated = await api.setIssueStatus(openThread.id, status);
    setOpenThread(updated);
    const list: any[] = await api.getAllIssues();
    setAllIssues(list);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files || []).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setAttachments(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  const statusCfg: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'rgba(234,179,8,0.1)', text: 'text-yellow-400', label: '⏳ Pending' },
    replied: { bg: 'rgba(59,130,246,0.1)', text: 'text-blue-400', label: '💬 Replied' },
    resolved: { bg: 'rgba(34,197,94,0.1)', text: 'text-green-400', label: '✅ Resolved' },
  };
  const cs = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ minHeight: '560px' }}>
      {/* Left */}
      <div className="lg:col-span-2 flex flex-col gap-3">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['all', 'pending', 'replied', 'resolved'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${filter === f ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
              style={filter === f ? { background: 'linear-gradient(135deg, #7c3aed, #a855f7)' } : {}}>
              {f}
            </button>
          ))}
        </div>
        <div className="rounded-2xl overflow-hidden flex-1" style={cs}>
          <div className="px-4 py-3 border-b border-white/5 text-xs font-bold text-white">{filtered.length} Issue{filtered.length !== 1 ? 's' : ''}</div>
          <div className="overflow-y-auto" style={{ maxHeight: '460px' }}>
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-slate-600 text-xs">No issues</div>
            ) : filtered.map((t: any) => {
              const sc = statusCfg[t.status] || statusCfg.pending;
              const isOpen = openThread?.id === t.id;
              const lastMsg = t.messages?.[t.messages.length - 1];
              return (
                <button key={t.id} onClick={() => setOpenThread(t)}
                  className={`w-full text-left px-4 py-3.5 border-b border-white/4 transition-all hover:bg-white/3 ${isOpen ? 'bg-purple-500/8' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-white truncate">{t.title}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${sc.text}`} style={{ background: sc.bg }}>{sc.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-400 font-medium">{t.employeeName}</span>
                    <span className="text-xs text-blue-400">{t.month}</span>
                  </div>
                  {lastMsg && <p className="text-xs text-slate-600 mt-1 truncate">{lastMsg.senderName}: {lastMsg.text}</p>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Chat */}
      <div className="lg:col-span-3 rounded-2xl flex flex-col overflow-hidden" style={{ ...cs, minHeight: '480px' }}>
        {!openThread ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8">
            <div className="text-5xl mb-3 opacity-20">💬</div>
            <p className="text-sm">Select an issue to view conversation</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <div className="font-bold text-white text-sm">{openThread.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{openThread.employeeName} · {openThread.month} · {new Date(openThread.createdAt).toLocaleDateString('en-IN')}</div>
              </div>
              <div className="flex gap-2">
                {openThread.status !== 'resolved' ? (
                  <button onClick={() => handleStatus('resolved')} className="px-3 py-1.5 rounded-lg text-xs font-bold text-green-400 transition-all hover:text-white" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>✅ Resolve</button>
                ) : (
                  <button onClick={() => handleStatus('pending')} className="px-3 py-1.5 rounded-lg text-xs font-bold text-yellow-400 transition-all hover:text-white" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>↩ Reopen</button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '340px' }}>
              {(openThread.messages || []).map((msg: any) => {
                const isEmp = msg.sender === 'employee';
                return (
                  <div key={msg.id} className={`flex ${isEmp ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] flex flex-col gap-1 ${isEmp ? 'items-start' : 'items-end'}`}>
                      <div className="flex items-center gap-2 px-1">
                        <span className={`text-xs font-semibold ${isEmp ? 'text-blue-400' : 'text-purple-400'}`}>{msg.senderName}</span>
                        <span className="text-xs text-slate-700">{new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                      {msg.text && (
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed text-white ${isEmp ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}
                          style={{ background: isEmp ? 'rgba(59,130,246,0.15)' : 'rgba(124,58,237,0.2)', border: `1px solid ${isEmp ? 'rgba(59,130,246,0.2)' : 'rgba(124,58,237,0.3)'}` }}>
                          {msg.text}
                        </div>
                      )}
                      {msg.attachments?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {msg.attachments.map((att: string, ai: number) => (
                            att.startsWith('data:image') ? (
                              <img key={ai} src={att} className="w-28 h-28 rounded-xl object-cover cursor-pointer border border-white/10 hover:scale-105 transition-transform" onClick={() => window.open(att)} />
                            ) : (
                              <a key={ai} href={att} download className="px-3 py-1.5 rounded-lg text-xs text-blue-400 border border-blue-500/20 hover:bg-blue-500/10" style={{ background: 'rgba(59,130,246,0.06)' }}>📎 File</a>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-3 border-t border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              {attachments.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {attachments.map((a, i) => (
                    <div key={i} className="relative">
                      {a.startsWith('data:image') ? <img src={a} className="w-12 h-12 rounded-lg object-cover border border-white/10" /> : <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg" style={{ background: 'rgba(59,130,246,0.1)' }}>📎</div>}
                      <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <button onClick={() => fileRef.current?.click()} className="p-2 rounded-xl text-slate-400 hover:text-white transition-colors flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} title="Attach image/file">📎</button>
                <input ref={fileRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleFileChange} />
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                  placeholder="Reply to employee... (Enter to send)" rows={2}
                  className="flex-1 px-3 py-2 rounded-xl text-sm text-white placeholder-slate-600 border border-white/8 outline-none resize-none focus:border-purple-500/40 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)' }} />
                <button onClick={handleReply} disabled={replying || (!replyText.trim() && !attachments.length)}
                  className="px-4 py-2 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-40 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                  {replying ? '...' : '➤'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Owner Attendance with Override ────────────────────────────────────────
function OwnerAttendance({ attendance, selectedMonth, employees, onRefresh }: any) {
  const [overrideAlert, setOverrideAlert] = useState('');
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
  const [year, monthNum] = selectedMonth.split('-').map(Number);
  const totalDays = new Date(year, monthNum, 0).getDate();
  const cs = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };

  async function override(employeeId: string, date: string, checkedIn: boolean) {
    try {
      await api.overrideAttendance({ employeeId, date, checkedIn });
      setOverrideAlert(`✅ Attendance ${checkedIn ? 'marked Present' : 'marked Absent'} for ${employeeId} on ${date}`);
      onRefresh();
      setTimeout(() => setOverrideAlert(''), 3000);
    } catch (err: any) { setOverrideAlert(`⚠️ ${err.message}`); }
  }

  return (
    <div>
      {overrideAlert && (
        <div className="p-3 rounded-xl text-sm mb-4 text-green-300 border border-green-500/20" style={{ background: 'rgba(34,197,94,0.08)' }}>{overrideAlert}</div>
      )}
      <div className="rounded-2xl overflow-hidden" style={cs}>
        <div className="p-5 border-b border-white/5">
          <div className="font-bold text-white mb-1">📅 Attendance — {selectedMonth}</div>
          <div className="text-xs text-slate-500">Click any employee to view daily records and override attendance</div>
        </div>
        <div className="divide-y divide-white/4">
          {employees.map((emp: any) => {
            const empAtt = attendance.find((a: any) => a.employeeId === emp.employeeId);
            const presentDays = empAtt?.days?.length || 0;
            const absentDays = Math.max(0, totalDays - presentDays);
            const isExpanded = expandedEmp === emp.employeeId;
            return (
              <div key={emp.employeeId}>
                <button onClick={() => setExpandedEmp(isExpanded ? null : emp.employeeId)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{emp.name}</div>
                      <div className="text-slate-500 text-xs">{emp.employeeId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-green-400 font-bold">{presentDays} Present</span>
                    <span className="text-red-400">{absentDays} Absent</span>
                    <span className="text-slate-500">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-5 pb-4">
                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: totalDays }, (_, i) => {
                        const d = `${selectedMonth}-${String(i + 1).padStart(2, '0')}`;
                        const isPresent = empAtt?.days?.includes(d);
                        return (
                          <div key={d} className="text-center">
                            <div className={`rounded-lg py-1.5 text-xs font-semibold mb-1 ${isPresent ? 'text-green-300' : 'text-red-400'}`}
                              style={{ background: isPresent ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.08)', border: `1px solid ${isPresent ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.04)'}` }}>
                              {i + 1}
                            </div>
                            <button onClick={() => override(emp.employeeId, d, !isPresent)}
                              className={`w-full text-xs py-0.5 rounded transition-all hover:opacity-80 ${isPresent ? 'text-red-400' : 'text-green-400'}`}
                              style={{ background: isPresent ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', fontSize: '9px' }}>
                              {isPresent ? '→ Absent' : '→ Present'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {employees.length === 0 && <div className="text-center py-10 text-slate-600 text-sm">No employees found</div>}
        </div>
      </div>
    </div>
  );
}

// ── Owner Holidays ─────────────────────────────────────────────────────────
function OwnerHolidays({ selectedMonth }: { selectedMonth: string }) {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [alert, setAlert] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const cs = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };

  useEffect(() => { api.getHolidays(selectedMonth).then((h: any) => setHolidays(h)).catch(() => {}); }, [selectedMonth]);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const h = await api.addHoliday({ date: fd.get('date'), reason: fd.get('reason') });
      setHolidays(prev => [...prev, h as any]);
      setAlert('✅ Holiday added');
      (e.target as HTMLFormElement).reset();
    } catch (err: any) { setAlert(`⚠️ ${err.message}`); }
    setTimeout(() => setAlert(''), 3000);
  }

  async function handleDelete(id: string) {
    await api.deleteHoliday(id);
    setHolidays(prev => prev.filter(h => h.id !== id));
  }

  const inputCls = "w-full px-3 py-2 rounded-xl text-sm text-white border border-white/8 outline-none";
  const inputStyle = { background: 'rgba(255,255,255,0.04)' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl p-6" style={cs}>
        <div className="font-bold text-white mb-1">🎉 Add Holiday</div>
        <div className="text-xs text-slate-500 mb-4">Holidays are excluded from working days — no deduction</div>
        {alert && <div className="p-2.5 rounded-xl text-xs mb-3 text-green-300 border border-green-500/20" style={{ background: 'rgba(34,197,94,0.08)' }}>{alert}</div>}
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Date</label>
            <input name="date" type="date" required className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Reason / Festival Name</label>
            <input name="reason" type="text" placeholder="e.g. Diwali, Republic Day" required className={inputCls} style={inputStyle} />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
            + Add Holiday
          </button>
        </form>
      </div>
      <div className="rounded-2xl overflow-hidden" style={cs}>
        <div className="p-4 border-b border-white/5 font-bold text-white text-sm">📋 Holidays — {selectedMonth}</div>
        {holidays.length === 0 ? (
          <div className="text-center py-10 text-slate-600 text-sm">No holidays this month</div>
        ) : (
          <div className="divide-y divide-white/4">
            {holidays.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/2">
                <div>
                  <div className="text-white text-sm font-medium">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                  <div className="text-blue-400 text-xs">🎉 {h.reason}</div>
                </div>
                <button onClick={() => handleDelete(h.id)} className="text-red-400/60 hover:text-red-400 transition-colors text-sm">🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Owner Leaves ───────────────────────────────────────────────────────────
function OwnerLeaves({ selectedMonth }: { selectedMonth: string }) {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [alert, setAlert] = useState('');
  const cs = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' };

  useEffect(() => { api.getAllLeaves(undefined, selectedMonth).then((l: any) => setLeaves(l)).catch(() => {}); }, [selectedMonth]);

  async function handleAction(id: string, status: string) {
    try {
      await api.updateLeave(id, status);
      setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      setAlert(`✅ Leave ${status}`);
      setTimeout(() => setAlert(''), 3000);
    } catch (err: any) { setAlert(`⚠️ ${err.message}`); }
  }

  const filtered = filter === 'all' ? leaves : leaves.filter(l => l.status === filter);

  return (
    <div>
      {alert && <div className="p-3 rounded-xl text-sm mb-4 text-green-300 border border-green-500/20" style={{ background: 'rgba(34,197,94,0.08)' }}>{alert}</div>}
      <div className="flex gap-1 p-1 rounded-xl mb-4 w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${filter === f ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            style={filter === f ? { background: 'linear-gradient(135deg, #7c3aed, #a855f7)' } : {}}>
            {f}
          </button>
        ))}
      </div>
      <div className="rounded-2xl overflow-hidden" style={cs}>
        <div className="p-4 border-b border-white/5 font-bold text-white text-sm">🏖️ Leave Requests — {selectedMonth} ({filtered.length})</div>
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-600 text-sm">No {filter === 'all' ? '' : filter} leave requests</div>
        ) : (
          <div className="divide-y divide-white/4">
            {filtered.map((l: any) => (
              <div key={l.id} className="px-5 py-4 hover:bg-white/2 transition-colors">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="text-white font-semibold text-sm">{l.employeeName}</span>
                      <span className="text-slate-500 text-xs">{l.employeeId}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${l.leaveType === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}
                        style={{ background: l.leaveType === 'paid' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)' }}>
                        {l.leaveType === 'paid' ? '🏖️ Paid' : '📋 Unpaid'}
                      </span>
                    </div>
                    <div className="text-blue-400 text-xs mb-1">📅 {l.dates?.join(', ')}</div>
                    <div className="text-slate-400 text-xs">{l.reason}</div>
                    {l.ownerNote && <div className="text-slate-500 text-xs mt-1">Note: {l.ownerNote}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {l.status === 'pending' ? (
                      <>
                        <button onClick={() => handleAction(l.id, 'approved')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-green-400 transition-all hover:text-white"
                          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                          ✅ Approve
                        </button>
                        <button onClick={() => handleAction(l.id, 'rejected')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 transition-all hover:text-white"
                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                          ❌ Reject
                        </button>
                      </>
                    ) : (
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${l.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}
                        style={{ background: l.status === 'approved' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
                        {l.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
