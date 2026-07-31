import { useState } from 'react';
import { useNavigate } from 'react-router';

interface Props {
  employees?: any[];
}

export default function GlobalSearch({ employees = [] }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const navigate = useNavigate();

  function handleSearch(val: string) {
    setQuery(val);
    if (!val.trim()) { setResults([]); return; }
    const q = val.toLowerCase();
    const matches = employees.filter((e: any) =>
      e.name?.toLowerCase().includes(q) ||
      e.employeeId?.toLowerCase().includes(q) ||
      e.mrId?.toLowerCase().includes(q) ||
      e.assignedArea?.toLowerCase().includes(q)
    );
    setResults(matches.slice(0, 8));
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search Employee or MR by name / ID / area…"
          className="w-full pl-9 pr-4 py-2 rounded-xl text-sm text-white placeholder-slate-500 border border-white/10 outline-none focus:border-blue-500/50 transition-all"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        />
      </div>

      {results.length > 0 && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-2xl"
          style={{ background: '#0d1829', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {results.map((e: any, i: number) => (
            <button
              key={e.employeeId || i}
              type="button"
              onClick={() => { setQuery(''); setResults([]); navigate('/owner'); }}
              className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)' }}
                >
                  {e.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="text-white text-sm font-medium">{e.name}</div>
                  <div className="text-slate-500 text-xs">
                    {e.employeeId} {e.assignedArea ? `· ${e.assignedArea}` : ''} {e.mrId ? `· MR: ${e.mrId}` : ''}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {query.length > 1 && results.length === 0 && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl px-4 py-3 text-sm text-slate-500"
          style={{ background: '#0d1829', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          No employees found for "{query}"
        </div>
      )}
    </div>
  );
}
