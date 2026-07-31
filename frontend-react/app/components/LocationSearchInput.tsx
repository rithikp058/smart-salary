import { useEffect, useRef, useState } from 'react';
import { api } from '../utils/api';

export interface LocationResult {
  placeId: string | number;
  displayName: string;
  name: string;
  area: string;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
}

interface Props {
  value: string;                          // visible input text
  onChange: (val: string) => void;        // raw text change
  onSelect: (loc: LocationResult) => void;// when user picks a suggestion
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export default function LocationSearchInput({
  value, onChange, onSelect, placeholder = 'Search hospital or clinic…', label, required,
}: Props) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function handleInput(val: string) {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await api.locationSearch(val) as LocationResult[];
        setSuggestions(results || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
      setLoading(false);
    }, 400); // 400ms debounce — respects Nominatim rate limit
  }

  function pick(loc: LocationResult) {
    onChange(loc.displayName);
    onSelect(loc);
    setSuggestions([]);
    setOpen(false);
  }

  const inputCls =
    'w-full px-3 py-2.5 rounded-xl text-sm text-white border border-white/8 outline-none ' +
    'focus:border-green-500/40 transition-all';
  const inputStyle = { background: 'rgba(255,255,255,0.04)' };

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">
          {label}{required && ' *'}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={inputCls}
          style={inputStyle}
        />
        {/* search / spinner icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">
          {loading ? '⏳' : '🔍'}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-2xl"
          style={{ background: '#0d1829', border: '1px solid rgba(16,185,129,0.25)', maxHeight: 280, overflowY: 'auto' }}
        >
          {suggestions.map((loc, i) => (
            <button
              key={loc.placeId ?? i}
              type="button"
              onClick={() => pick(loc)}
              className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/4 last:border-0"
            >
              <div className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5 flex-shrink-0 text-sm">📍</span>
                <div className="min-w-0">
                  <div className="text-white text-sm font-semibold truncate">{loc.name}</div>
                  <div className="text-slate-500 text-xs truncate">
                    {[loc.area, loc.city, loc.pincode].filter(Boolean).join(' · ')}
                  </div>
                  <div className="text-slate-700 text-xs truncate mt-0.5">{loc.displayName}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {open && !loading && suggestions.length === 0 && value.trim().length >= 2 && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl px-4 py-3 text-xs text-slate-500"
          style={{ background: '#0d1829', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          No locations found. Try a different search term.
        </div>
      )}
    </div>
  );
}
