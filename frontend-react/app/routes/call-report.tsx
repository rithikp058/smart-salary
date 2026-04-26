import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import Navbar from '../components/Navbar';
import { api } from '../utils/api';
import { isLoggedIn, getUser } from '../utils/auth';

type Tab = 'report' | 'history' | 'stock';

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2-lat1)/2)**2 + Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(r(lon2-lon1)/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

export default function CallReport() {
  const navigate = useNavigate();
  const user = getUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [tab, setTab] = useState<Tab>('report');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [filtered, setFiltered] = useState<any[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [myReports, setMyReports] = useState<any[]>([]);
  const [myStock, setMyStock] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{msg:string;type:'success'|'error'|'warn'}|null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string|null>(null);
  const [stockPhoto, setStockPhoto] = useState<string|null>(null);
  const [stockCam, setStockCam] = useState(false);
  const [gps, setGps] = useState<{lat:number;lng:number;accuracy:number}|null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [proximity, setProximity] = useState<boolean|null>(null);
  const [distance, setDistance] = useState<number|null>(null);
  const [notes, setNotes] = useState('');
  const [sf, setSf] = useState({doctorName:'',hospitalName:'',productName:'',quantity:1,destination:'Medical Shop'});

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return; }
    api.getDoctors(user?.area ? {area: user.area} : undefined).then((d:any) => setDoctors(Array.isArray(d)?d:[])).catch(()=>{});
    loadProgress();
  }, []);

  useEffect(() => {
    if (tab==='history') api.getMyCallReports(month).then((d:any)=>setMyReports(Array.isArray(d)?d:[])).catch(()=>{});
    if (tab==='stock') api.getMyStockRequests(month).then((d:any)=>setMyStock(Array.isArray(d)?d:[])).catch(()=>{});
    loadProgress();
  }, [tab, month]);

  useEffect(() => {
    if (!gps || !selectedDoc?.latitude) { setProximity(null); setDistance(null); return; }
    const d = haversine(gps.lat, gps.lng, selectedDoc.latitude, selectedDoc.longitude);
    setDistance(d); setProximity(d <= 10);
  }, [gps, selectedDoc]);

  function loadProgress() {
    api.getMyProgress(month).then((d:any)=>setProgress(d)).catch(()=>{});
  }

  function searchDoc(val: string) {
    setDoctorSearch(val); setSelectedDoc(null); setProximity(null);
    if (!val.trim()) { setFiltered([]); setShowDrop(false); return; }
    const q = val.toLowerCase();
    const m = doctors.filter(d => d.name.toLowerCase().includes(q) || d.hospital.toLowerCase().includes(q));
    setFiltered(m); setShowDrop(true);
  }

  function pickDoc(doc: any) {
    setSelectedDoc(doc);
    setDoctorSearch(`Dr. ${doc.name} — ${doc.hospital}`);
    setShowDrop(false); setFiltered([]);
  }

  function getGPS() {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      p => { setGps({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}); setGpsLoading(false); },
      e => { setAlert({msg:`GPS: ${e.message}`,type:'error'}); setGpsLoading(false); },
      {enableHighAccuracy:true,timeout:15000}
    );
  }

  async function startCam(forStock=false) {
    try {
      const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
      if (videoRef.current) { videoRef.current.srcObject=s; videoRef.current.play(); }
      forStock ? setStockCam(true) : setCameraActive(true);
    } catch { setAlert({msg:'Camera denied',type:'error'}); }
  }

  function snap(forStock=false) {
    if (!videoRef.current||!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    canvasRef.current.width=videoRef.current.videoWidth;
    canvasRef.current.height=videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current,0,0);
    const url = canvasRef.current.toDataURL('image/jpeg',0.7);
    forStock ? setStockPhoto(url) : setCapturedPhoto(url);
    forStock ? setStockCam(false) : setCameraActive(false);
    (videoRef.current.srcObject as MediaStream)?.getTracks().forEach(t=>t.stop());
    videoRef.current.srcObject=null;
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoc) return setAlert({msg:'Select a doctor first',type:'error'});
    if (!capturedPhoto) return setAlert({msg:'Photo is mandatory',type:'error'});
    if (!gps) return setAlert({msg:'GPS required',type:'error'});
    if (proximity===false) return setAlert({msg:`Too far (${distance}m). Must be within 10m of hospital.`,type:'error'});
    setLoading(true);
    try {
      await api.submitCallReport({
        doctorId: selectedDoc._id||selectedDoc.id,
        doctorName: selectedDoc.name, hospitalName: selectedDoc.hospital,
        doctorType: selectedDoc.type||'Regular',
        latitude: gps.lat, longitude: gps.lng,
        area: user?.area||selectedDoc.area||'',
        pincode: selectedDoc.pincode||'',
        photo: capturedPhoto, notes,
      });
      setAlert({msg:'Report submitted!',type:'success'});
      setSelectedDoc(null); setDoctorSearch(''); setCapturedPhoto(null);
      setGps(null); setNotes(''); setProximity(null); setDistance(null);
      loadProgress();
    } catch(err:any) { setAlert({msg:err.message,type:'error'}); }
    setLoading(false);
  }

  async function submitStock(e: React.FormEvent) {
    e.preventDefault();
    if (!stockPhoto) return setAlert({msg:'Photo required',type:'error'});
    setLoading(true);
    try {
      await api.raiseStockRequest({...sf, photo:stockPhoto});
      setAlert({msg:'Stock request raised!',type:'success'});
      setSf({doctorName:'',hospitalName:'',productName:'',quantity:1,destination:'Medical Shop'});
      setStockPhoto(null); setTab('stock');
    } catch(err:any) { setAlert({msg:err.message,type:'error'}); }
    setLoading(false);
  }

  const cs = {background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'};
  const inp = "w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 border border-white/10 outline-none";
  const is = {background:'rgba(255,255,255,0.04)'};
  const pct = progress?.target>0 ? Math.min(100,Math.round((progress.visited/progress.target)*100)) : 0;
  const sb: Record<string,string> = {pending:'bg-yellow-500/15 text-yellow-300',approved_mr:'bg-blue-500/15 text-blue-300',approved_owner:'bg-green-500/15 text-green-300',rejected:'bg-red-500/15 text-red-300'};

  return (
    <div className="min-h-screen" style={{background:'#050b18'}}>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Field Reports</h1>
            <p className="text-slate-400 text-sm">📍 {user?.area||'No area'}{user?.pincodes?.length>0&&` · ${user.pincodes.join(', ')}`}</p>
          </div>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-sm text-white border border-white/10 outline-none"
            style={{background:'rgba(255,255,255,0.05)'}} />
        </div>

        {progress && (
          <div className="rounded-2xl p-4 mb-5" style={{background:'rgba(59,130,246,0.07)',border:'1px solid rgba(59,130,246,0.2)'}}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-bold">Visited {progress.visited}{progress.target>0&&<span className="text-slate-400 font-normal"> / {progress.target} Doctors</span>}</span>
              {progress.target>0&&<span className={`text-xs font-bold px-2 py-1 rounded-full ${pct>=100?'bg-green-500/20 text-green-300':pct>=60?'bg-blue-500/20 text-blue-300':'bg-yellow-500/20 text-yellow-300'}`}>{pct}%</span>}
            </div>
            {progress.target>0&&(
              <div className="w-full h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{width:`${pct}%`,background:pct>=100?'linear-gradient(90deg,#059669,#10b981)':'linear-gradient(90deg,#1d4ed8,#3b82f6)'}} />
              </div>
            )}
          </div>
        )}

        {alert&&(
          <div className={`p-3 rounded-xl text-sm mb-4 flex items-center gap-2 ${alert.type==='success'?'text-green-300 border border-green-500/20':alert.type==='warn'?'text-yellow-300 border border-yellow-500/20':'text-red-300 border border-red-500/20'}`}
            style={{background:alert.type==='success'?'rgba(34,197,94,0.08)':alert.type==='warn'?'rgba(234,179,8,0.08)':'rgba(239,68,68,0.08)'}}>
            {alert.type==='success'?'✅':'⚠️'} {alert.msg}
            <button onClick={()=>setAlert(null)} className="ml-auto text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {([['report','📋','Report Call'],['history','📅','History'],['stock','📦','Stock']] as const).map(([key,icon,label])=>(
            <button key={key} onClick={()=>setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab===key?'text-blue-400 border border-blue-500/30':'text-slate-400 hover:text-white border border-transparent'}`}
              style={tab===key?{background:'rgba(59,130,246,0.1)'}:{background:'rgba(255,255,255,0.03)'}}>
              {icon} {label}
            </button>
          ))}
        </div>

        {tab==='report'&&(
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={cs}>
              <h3 className="text-white font-semibold mb-3">🔍 Search Doctor</h3>
              <div className="relative">
                <input className={inp} style={is} placeholder="Type doctor name or hospital..."
                  value={doctorSearch} onChange={e=>searchDoc(e.target.value)}
                  onFocus={()=>filtered.length>0&&setShowDrop(true)} />
                {showDrop&&filtered.length>0&&(
                  <div className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-2xl"
                    style={{background:'#0d1829',border:'1px solid rgba(255,255,255,0.1)'}}>
                    {filtered.map(doc=>(
                      <button key={doc._id||doc.id} type="button" onClick={()=>pickDoc(doc)}
                        className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                        <div className="text-white text-sm font-medium">Dr. {doc.name}</div>
                        <div className="text-slate-400 text-xs">🏥 {doc.hospital} · {doc.area}{doc.pincode&&` · ${doc.pincode}`}</div>
                        <span className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block ${doc.type==='VIP'?'bg-yellow-500/15 text-yellow-300':doc.type==='Specialist'?'bg-purple-500/15 text-purple-300':'bg-slate-500/15 text-slate-400'}`}>{doc.type}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showDrop&&filtered.length===0&&doctorSearch.length>1&&(
                  <div className="absolute z-50 w-full mt-1 rounded-xl px-4 py-3 text-sm text-slate-500"
                    style={{background:'#0d1829',border:'1px solid rgba(255,255,255,0.1)'}}>
                    No doctors found for "{doctorSearch}"
                  </div>
                )}
              </div>
              {selectedDoc&&(
                <div className="mt-3 p-3 rounded-xl" style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)'}}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-blue-300 font-medium text-sm">✅ Dr. {selectedDoc.name}</div>
                      <div className="text-slate-400 text-xs mt-0.5">🏥 {selectedDoc.hospital} · {selectedDoc.area}</div>
                      {selectedDoc.latitude
                        ? <div className="text-xs text-green-400 mt-1">📍 GPS on file — 10m validation active</div>
                        : <div className="text-xs text-yellow-400 mt-1">⚠️ No GPS — location check skipped</div>}
                    </div>
                    <button onClick={()=>{setSelectedDoc(null);setDoctorSearch('');setProximity(null);}} className="text-slate-500 hover:text-white text-sm">✕</button>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={submitReport} className="rounded-2xl p-5 space-y-4" style={cs}>
              <h3 className="text-white font-semibold">Report Visit</h3>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">GPS Location *</label>
                {gps ? (
                  <div>
                    <div className="p-3 rounded-xl text-sm border" style={{background:'rgba(34,197,94,0.08)',borderColor:'rgba(34,197,94,0.3)'}}>
                      <div className="text-green-300">✅ {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)} · ±{Math.round(gps.accuracy)}m</div>
                      {selectedDoc?.latitude&&distance!==null&&(
                        <div className={`mt-2 font-semibold text-sm ${proximity?'text-green-400':'text-red-400'}`}>
                          {proximity?`✅ Within range (${distance}m) — reporting allowed`:`🚫 Too far (${distance}m) — must be within 10m`}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={()=>{setGps(null);setProximity(null);}} className="text-xs text-slate-500 hover:text-white mt-1 ml-1">Reset</button>
                  </div>
                ) : (
                  <button type="button" onClick={getGPS} disabled={gpsLoading}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-white border border-blue-500/30 disabled:opacity-50"
                    style={{background:'rgba(59,130,246,0.1)'}}>
                    {gpsLoading?'📡 Getting location...':'📍 Get GPS Location'}
                  </button>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Photo Proof * (mandatory)</label>
                {capturedPhoto ? (
                  <div className="relative">
                    <img src={capturedPhoto} alt="proof" className="w-full max-h-48 object-cover rounded-xl border border-white/10" />
                    <button type="button" onClick={()=>setCapturedPhoto(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center">✕</button>
                  </div>
                ) : cameraActive ? (
                  <div className="relative">
                    <video ref={videoRef} className="w-full rounded-xl border border-white/10" autoPlay playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    <button type="button" onClick={()=>snap(false)} className="absolute bottom-3 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-4 border-white text-2xl flex items-center justify-center" style={{background:'rgba(255,255,255,0.2)'}}>📸</button>
                  </div>
                ) : (
                  <button type="button" onClick={()=>startCam(false)} className="w-full py-8 rounded-xl text-sm text-slate-400 border-2 border-dashed border-white/10 hover:border-white/20">📷 Open Camera</button>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Notes</label>
                <textarea className={inp} style={is} rows={2} placeholder="Visit notes..." value={notes} onChange={e=>setNotes(e.target.value)} />
              </div>
              <button type="submit" disabled={loading||!capturedPhoto||!gps||!selectedDoc||proximity===false}
                className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 transition-all hover:scale-[1.02]"
                style={{background:'linear-gradient(135deg,#1d4ed8,#3b82f6)'}}>
                {loading?'Submitting...':proximity===false?'🚫 Too far from location':'📋 Submit Call Report'}
              </button>
            </form>

            <div className="rounded-2xl p-5" style={cs}>
              <h3 className="text-white font-semibold mb-4">📦 Raise Stock Request</h3>
              <form onSubmit={submitStock} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Doctor Name *</label>
                    <input className={inp} style={is} required value={sf.doctorName} onChange={e=>setSf(f=>({...f,doctorName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Hospital *</label>
                    <input className={inp} style={is} required value={sf.hospitalName} onChange={e=>setSf(f=>({...f,hospitalName:e.target.value}))} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Product *</label>
                    <input className={inp} style={is} required value={sf.productName} onChange={e=>setSf(f=>({...f,productName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Qty *</label>
                    <input type="number" min="1" className={inp} style={is} required value={sf.quantity} onChange={e=>setSf(f=>({...f,quantity:Number(e.target.value)}))} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Destination</label>
                    <select className={inp} style={is} value={sf.destination} onChange={e=>setSf(f=>({...f,destination:e.target.value}))}>
                      <option>Medical Shop</option><option>Hospital</option><option>Clinic</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Photo Proof *</label>
                  {stockPhoto ? (
                    <div className="relative">
                      <img src={stockPhoto} alt="proof" className="w-full max-h-40 object-cover rounded-xl border border-white/10" />
                      <button type="button" onClick={()=>setStockPhoto(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center">✕</button>
                    </div>
                  ) : stockCam ? (
                    <div className="relative">
                      <video ref={videoRef} className="w-full rounded-xl border border-white/10" autoPlay playsInline />
                      <canvas ref={canvasRef} className="hidden" />
                      <button type="button" onClick={()=>snap(true)} className="absolute bottom-3 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-4 border-white text-2xl flex items-center justify-center" style={{background:'rgba(255,255,255,0.2)'}}>📸</button>
                    </div>
                  ) : (
                    <button type="button" onClick={()=>startCam(true)} className="w-full py-6 rounded-xl text-sm text-slate-400 border-2 border-dashed border-white/10 hover:border-white/20">📷 Capture Photo</button>
                  )}
                </div>
                <button type="submit" disabled={loading||!stockPhoto} className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40" style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
                  {loading?'Submitting...':'📦 Raise Stock Request'}
                </button>
              </form>
            </div>
          </div>
        )}

        {tab==='history'&&(
          <div className="space-y-3">
            <h3 className="text-white font-semibold">My Call Reports — {month}</h3>
            {myReports.length===0
              ? <div className="rounded-2xl p-8 text-center text-slate-500" style={cs}>No reports for {month}</div>
              : myReports.map(r=>(
                <div key={r.id||r._id} className="rounded-2xl p-4" style={cs}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">Dr. {r.doctorName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${r.doctorType==='VIP'?'bg-yellow-500/15 text-yellow-300':r.doctorType==='Specialist'?'bg-purple-500/15 text-purple-300':'bg-slate-500/15 text-slate-400'}`}>{r.doctorType}</span>
                        {r.verifiedByMR&&<span className="text-xs text-green-400">✅ Verified</span>}
                      </div>
                      <div className="text-slate-400 text-xs mt-1">🏥 {r.hospitalName} · {r.date}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${r.locationValid?'bg-green-500/15 text-green-300':'bg-red-500/15 text-red-300'}`}>
                        {r.locationValid?'📍 Valid':'⚠️ Invalid location'}
                      </span>
                    </div>
                    {r.photo&&<img src={r.photo} alt="proof" className="w-14 h-14 rounded-xl object-cover border border-white/10" />}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {tab==='stock'&&(
          <div className="space-y-3">
            <h3 className="text-white font-semibold">My Stock Requests — {month}</h3>
            {myStock.length===0
              ? <div className="rounded-2xl p-8 text-center text-slate-500" style={cs}>No stock requests for {month}</div>
              : myStock.map(s=>(
                <div key={s.id||s._id} className="rounded-2xl p-4" style={cs}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">{s.productName}</span>
                        <span className="text-slate-400 text-xs">x{s.quantity}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sb[s.status]||'bg-slate-500/15 text-slate-300'}`}>{s.status.replace('_',' ').toUpperCase()}</span>
                      </div>
                      <div className="text-slate-400 text-xs mt-1">🏥 {s.hospitalName} · Dr. {s.doctorName} · {s.date}</div>
                      {s.returned&&<div className="text-orange-300 text-xs mt-1">↩ {s.returnedQuantity} returned</div>}
                      {s.damaged&&<div className="text-red-300 text-xs mt-1">💥 {s.damagedQuantity} damaged</div>}
                      {s.rejectionReason&&<div className="text-red-400 text-xs mt-1">❌ {s.rejectionReason}</div>}
                    </div>
                    {s.photo&&<img src={s.photo} alt="proof" className="w-14 h-14 rounded-xl object-cover border border-white/10" />}
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
