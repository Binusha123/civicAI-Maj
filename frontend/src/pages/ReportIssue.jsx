import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, MapPin, Upload, X, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ location, setLocation, currentLocation }) {
  const map = useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setLocation({ lat, lng });
      reverseGeocode(lat, lng);
    },
  });

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (res.data && res.data.display_name) {
        setLocation(prev => ({ ...prev, address: res.data.display_name }));
      }
    } catch (err) {
      console.error("Failed to reverse geocode", err);
    }
  }

  useEffect(() => {
    if (currentLocation) {
      map.flyTo([currentLocation.lat, currentLocation.lng], Math.max(map.getZoom(), 15), { duration: 1.2 });
    }
  }, [currentLocation?.lat, currentLocation?.lng, map]);

  return (
    <>
      {location && <Marker position={[location.lat, location.lng]} />}
      {currentLocation && (
        <>
          <CircleMarker
            center={[currentLocation.lat, currentLocation.lng]}
            radius={15}
            pathOptions={{ color: '#60a5fa', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.2 }}
            interactive={false}
          />
          <CircleMarker
            center={[currentLocation.lat, currentLocation.lng]}
            radius={7}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#4285f4', fillOpacity: 1 }}
            interactive={false}
          />
        </>
      )}
    </>
  );
}

export default function ReportIssue() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [category, setCategory] = useState('Road Damage');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nearbyReports, setNearbyReports] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [joiningReportId, setJoiningReportId] = useState(null);

  useEffect(() => {
    if (!location) {
      setNearbyReports([]);
      return undefined;
    }

    let active = true;
    setNearbyLoading(true);
    axios.get('http://localhost:8000/api/reports/nearby', {
      params: { latitude: location.lat, longitude: location.lng, category }
    })
      .then(res => {
        if (active) setNearbyReports(res.data);
      })
      .catch(err => {
        if (active) {
          console.error('Failed to find nearby reports', err);
          setNearbyReports([]);
        }
      })
      .finally(() => {
        if (active) setNearbyLoading(false);
      });

    return () => { active = false; };
  }, [category, location?.lat, location?.lng]);

  useEffect(() => {
    // Auto-detect location on mount
    getLocation();
  }, []);

  const categories = [
    "Road Damage",
    "Garbage & Sanitation",
    "Water Issues",
    "Electricity Hazards"
  ];

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCurrentLocation({ lat, lng });
          setLocation({ lat, lng });
          
          try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            if (res.data && res.data.display_name) {
              setLocation({ lat, lng, address: res.data.display_name });
            }
          } catch (err) {
            console.error("Failed to reverse geocode", err);
          }
        },
        (error) => console.warn("Error getting location: " + error.message)
      );
    } else {
      console.warn("Geolocation is not supported by this browser.");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image || !location) {
      alert("Please provide an image and select a location on the map.");
      return;
    }

    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('image', image);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('latitude', location.lat);
    formData.append('longitude', location.lng);
    if (location.address) {
      formData.append('address', location.address);
    }

    try {
      const response = await axios.post('http://localhost:8000/api/reports/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data?.duplicate_of) {
        alert(response.data?.duplicate_message || 'A similar report exists nearby. An officer will review your photo and report alongside it.');
        navigate('/dashboard', {
          state: {
            toast: 'An officer will review your photo and report.',
            aiAnalysis: response.data,
          }
        });
        return;
      }
      navigate('/dashboard', {
        state: {
          toast: response.data?.status === 'Needs Review'
            ? 'An officer will review your photo and report.'
            : 'Your report was submitted successfully.',
          aiAnalysis: response.data,
        }
      });
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || (!err.response ? "Cannot reach backend server. Ensure backend is running on port 8000." : "Failed to submit report");
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMeToo = async (report) => {
    setJoiningReportId(report.id);
    try {
      await axios.post(`http://localhost:8000/api/reports/${report.id}/me-too`);
      navigate('/dashboard', { state: { toast: 'You have been added as affected by this issue.' } });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Could not join this report.';
      alert(msg);
    } finally {
      setJoiningReportId(null);
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-row min-h-[90vh] bg-[#0A0A0B]">
      
      {/* Left Side - Visual Context */}
      <div className="w-full lg:w-1/3 bg-[#050505] border-r border-white/10 p-10 flex flex-col justify-center relative overflow-hidden">
        {/* 3D Glowing Orb Effect */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 rounded-full blur-[100px] opacity-30 animate-pulse" />
        
        {/* CSS Mesh Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(1000px)_rotateX(60deg)_translateY(-100px)] opacity-50" />
        
        <div className="relative z-10 max-w-sm mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-8 drop-shadow-2xl"
          >
            Report an <br/>Issue.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-300 text-xl font-light leading-relaxed"
          >
            Help keep the city safe and clean. Your report will be automatically analyzed by AI and routed to the correct department.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 mt-16 max-w-sm mx-auto bg-blue-500/10 border border-blue-500/20 p-6 rounded-3xl"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-400 shrink-0 mt-1" size={24} />
            <p className="text-sm text-blue-200 leading-relaxed font-medium">
              For immediate life-threatening emergencies (e.g., active fires, severe accidents), please dial 911 immediately instead of using this platform.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-2/3 p-6 md:p-12 lg:p-20 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="max-w-2xl mx-auto"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-10">
            
            {/* Image Upload Area */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="text-xl font-bold text-white flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-sm">1</span> 
                  Photographic Evidence
                </label>
              </div>
              <div 
                onClick={() => !preview && fileInputRef.current?.click()}
                className={`w-full h-72 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all ${
                  preview ? 'border-transparent p-0 bg-black' : 'border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer hover:border-blue-500/50'
                } relative overflow-hidden group`}
              >
                {preview ? (
                  <>
                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setImage(null); setPreview(null); }}
                      className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                      <Camera size={32} className="text-blue-400" />
                    </div>
                    <p className="text-white font-semibold text-xl mb-2">Tap to take a photo</p>
                    <p className="text-slate-500 text-sm">or upload from your gallery (JPEG, PNG)</p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>

            {/* Location Area (Map) */}
            <div className="flex flex-col gap-4">
              <label className="text-xl font-bold text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-sm">2</span> 
                  Pin Exact Location
                </div>
                <button 
                  type="button" 
                  onClick={getLocation}
                  className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all flex items-center gap-2"
                >
                  <MapPin size={16} className="text-purple-400" />
                  Auto-Detect Device Location
                </button>
              </label>
              <p className="text-slate-400 text-sm -mt-2 ml-11">Click on the map to place a pin where the issue occurred, or use auto-detect.</p>
              
              <div className="w-full h-80 rounded-3xl overflow-hidden border border-white/10 z-0 relative ml-11" style={{ width: 'calc(100% - 44px)' }}>
                <MapContainer center={location ? [location.lat, location.lng] : [40.7128, -74.0060]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationMarker location={location} setLocation={setLocation} currentLocation={currentLocation} />
                </MapContainer>
              </div>

              {location && location.address && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 ml-11 flex items-start gap-3">
                  <MapPin className="text-purple-400 mt-1 shrink-0" />
                  <div>
                    <p className="text-slate-200 text-sm font-medium mb-1">{location.address}</p>
                    <p className="text-slate-500 text-xs">Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Category & Description */}
            <div className="flex flex-col gap-4">
              <label className="text-xl font-bold text-white flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-sm">3</span> 
                Additional Details
              </label>
              <div className="ml-11 flex flex-col gap-4">
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none text-lg transition-all hover:bg-white/10"
                >
                  {categories.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                </select>

                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any specific landmarks or context? (Optional)"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[120px] text-lg transition-all"
                />
              </div>
            </div>

            {nearbyReports.length > 0 && (
              <div className="flex flex-col gap-4 rounded-3xl border border-blue-400/20 bg-[#11151f]/90 p-5 shadow-[0_20px_60px_rgba(37,99,235,0.12)] backdrop-blur-xl">
                <div>
                  <h2 className="text-lg font-black text-white">Similar issues reported nearby</h2>
                  <p className="mt-1 text-xs text-slate-400">Join an existing ticket, or submit yours as a new report.</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {nearbyReports.map(report => (
                    <div key={report.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/40 p-3 sm:flex-row sm:items-center">
                      <img
                        src={`http://localhost:8000${report.image_url}`}
                        alt="Nearby issue"
                        className="h-28 w-full rounded-xl object-cover sm:h-20 sm:w-28"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold text-white">{report.address || report.description || 'Nearby issue'}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{report.status}</span>
                          <span>{report.affected_users_count} {report.affected_users_count === 1 ? 'citizen' : 'citizens'} affected</span>
                          <span>{Math.round(report.distance)} m away</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMeToo(report)}
                        disabled={joiningReportId === report.id}
                        className="shrink-0 rounded-xl border border-blue-400/30 bg-blue-500/15 px-4 py-3 text-sm font-bold text-blue-200 transition hover:bg-blue-500/25 disabled:opacity-50"
                      >
                        {joiningReportId === report.id ? 'Joining...' : "I'm affected too"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {nearbyLoading && nearbyReports.length === 0 && (
              <p className="text-center text-sm text-slate-500">Checking for similar issues nearby...</p>
            )}

            <motion.button 
              whileHover={{ scale: 1.02, boxShadow: "0px 10px 30px rgba(59, 130, 246, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-white font-black py-6 rounded-2xl shadow-lg text-2xl transition-all flex items-center justify-center gap-3 mt-4 ${
                isSubmitting ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
              }`}
            >
              {isSubmitting ? "AI is processing..." : "Submit as new report"} {!isSubmitting && <Upload size={28} />}
            </motion.button>
          </form>
        </motion.div>
      </div>

    </div>
  )
}
