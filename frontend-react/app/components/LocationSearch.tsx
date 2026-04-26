/**
 * LocationSearch — Google Maps-style location search using OpenStreetMap/Nominatim.
 * No API key required. Lat/lng are stored internally and passed via onSelect.
 * The user never sees raw coordinates.
 */
import { useEffect, useRef, useState } from 'react';
import { api } from '../utils/api';

export interface PlaceResult {
  placeId: number;
  displayName: string;
  name: string;
  area: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

interface Props {
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
  initialValue?: string;
  className?: string;
}

export default function LocationSearch({ onSelect, placeholder = 'Search hospital or clinic location...', initialValue = '', className = '' }: Props) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PlaceResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    setSelected(null);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchPlaces(value) as PlaceResult[];
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 400); // 400ms debounce — respects Nominatim rate limits
  }

  function handleSelect(place: PlaceResult) {
    setSelected(place);
    setQuery(place.name + (place.area ? ` — ${place.area}` : '') + (place.city ? `, ${place.city}` : ''));
    setResults([]);
    setOpen(false);
    onSelect(place);
  }

  function handleClear() {
    setQuery('');
    setSelected(null);
    setResults([]);
    setOpen(false);
  }

  const inputStyle = { background: 'rgba(255,255,255,0.05)' };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">📍</span>
        <input
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 border border-white/10 outline-none transition-all focus:border-blue-500/50"
          style={inputStyle}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs animate-pulse">⏳</span>
        )}
        {!loading && query && (
          <button type="button" onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors text-sm">
            ✕
          </button>
        )}
      </div>

      {/* Selected confirmation */}
      {selected && (
        <div className="mt-2 px-3 py-2 rounded-xl text-xs flex items-start gap-2"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <span className="text-green-400 mt-0.5">✅</span>
          <div>
            <div className="text-green-300 font-medium">{selected.name}</div>
            <div className="text-slate-400 mt-0.5">
              {[selected.area, selected.city, selected.pincode].filter(Boolean).join(' · ')}
            </div>
            <div className="text-slate-600 mt-0.5 font-mono text-xs">
              {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
            </div>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-2xl"
          style={{ background: '#0d1829', border: '1px solid rgba(255,255,255,0.1)' }}>
          {results.map((place, i) => (
            <button
              key={place.placeId ?? i}
              type="button"
              onClick={() => handleSelect(place)}
              className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              <div className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">📍</span>
                <div className="min-w-0">
                  <div className="text-white text-sm font-medium truncate">{place.name}</div>
                  <div className="text-slate-400 text-xs mt-0.5 truncate">
                    {[place.area, place.city, place.pincode].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-xl px-4 py-3 text-sm text-slate-500"
          style={{ background: '#0d1829', border: '1px solid rgba(255,255,255,0.1)' }}>
          No locations found for "{query}"
        </div>
      )}
    </div>
  );
}
