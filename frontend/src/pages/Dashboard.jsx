import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Clock, CheckCircle2, AlertTriangle, User, Camera, Upload, MapPin, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AIAnalysisCard from '../components/AIAnalysisCard';

import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [toast, setToast] = useState('');
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [deletingReportId, setDeletingReportId] = useState(null);

  useEffect(() => {
    if (location.state?.aiAnalysis) setLatestAnalysis(location.state.aiAnalysis);
    if (location.state?.toast) {
      setToast(location.state.toast);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    fetchReports();
  }, [user]);

  const fetchReports = () => {
    if (user && user.role !== 'Admin') {
      axios.get('http://localhost:8000/api/reports/')
        .then(res => setReports(res.data))
        .catch(err => console.error("Failed to fetch reports", err));
    }
  }

  const handleDeleteReport = async (report) => {
    const confirmed = window.confirm('Delete this complaint? This will permanently remove your report and its uploaded photos.');
    if (!confirmed) return;

    setDeletingReportId(report._id);
    try {
      await axios.delete(`http://localhost:8000/api/reports/${report._id}`);
      setReports(current => current.filter(item => item._id !== report._id));
      setToast('Your complaint was deleted.');
    } catch (error) {
      const message = error.response?.data?.detail || 'Could not delete this complaint.';
      alert(message);
    } finally {
      setDeletingReportId(null);
    }
  }

  if (!user) return null;

  const categories = [
    "Road Damage",
    "Garbage & Sanitation",
    "Water Issues",
    "Electricity Hazards"
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto py-16 px-6 relative z-10">
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed right-6 top-24 z-50 max-w-md rounded-2xl border border-emerald-400/25 bg-[#101a18]/95 px-5 py-4 text-sm font-semibold text-emerald-200 shadow-[0_16px_50px_rgba(16,185,129,0.18)] backdrop-blur-xl"
        >
          {toast}
        </motion.div>
      )}
      <div className="mb-12 flex flex-col md:flex-row justify-between md:items-end gap-6 border-b border-white/10 pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-5xl font-black text-white tracking-tight">Dashboard</h1>
          <p className="text-xl text-slate-400 mt-2 flex items-center gap-2">
            <User size={20}/> Welcome back, {user.name} 
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs text-white border border-white/20 uppercase tracking-widest ml-2">
              {user.role}
            </span>
          </p>
        </motion.div>
      </div>

      {latestAnalysis && <div className="mb-10 max-w-3xl"><AIAnalysisCard report={latestAnalysis} showSignals={user.role === 'Officer'} /></div>}

      {user.role === 'Admin' ? (
        <AdminDashboard user={user} />
      ) : (
        <div className="flex flex-col gap-16">
          
          {/* Top Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard title="Total Reports" count={reports.length} />
            <StatCard title="Road Damage" count={reports.filter(r => r.category === 'Road Damage').length} />
            <StatCard title="Garbage" count={reports.filter(r => r.category === 'Garbage & Sanitation').length} />
            <StatCard title="Resolved" count={reports.filter(r => r.status === 'Resolved' || r.status === 'Closed').length} color="text-green-400" />
          </div>

          {user.role === 'Officer' && (
            <div className="flex items-center justify-end gap-3">
              <label htmlFor="report-status-filter" className="text-sm font-semibold text-slate-400">Filter tickets</label>
              <select
                id="report-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-white/10 bg-[#131315] px-4 py-2 text-sm text-white outline-none focus:border-blue-400/40"
              >
                <option value="All">All statuses</option>
                <option value="Needs Review">Needs Review</option>
              </select>
            </div>
          )}

          {/* Categorized Domains */}
          <div className="flex flex-col gap-12">
            {categories.map((cat) => {
              const categoryReports = reports.filter(r =>
                r.category === cat && (user.role !== 'Officer' || statusFilter === 'All' || r.status === statusFilter)
              );
              // For Officers, only show their department's category (if assigned, handled by API)
              // But visually we can just hide empty categories if they are an Officer
              if (user.role === 'Officer' && categoryReports.length === 0) return null;

              return (
                <div key={cat} className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold text-white border-l-4 border-blue-500 pl-4">{cat}</h2>
                    <span className="bg-white/5 px-4 py-1 rounded-full text-slate-400 text-sm font-medium border border-white/10">
                      {categoryReports.length} {categoryReports.length === 1 ? 'Issue' : 'Issues'}
                    </span>
                  </div>
                  
                  {categoryReports.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center border-dashed">
                      <p className="text-slate-500">No issues reported in this domain.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {categoryReports.map((report, idx) => (
                        <ReportCard 
                          key={report._id} 
                          report={report} 
                          idx={idx} 
                          user={user}
                          onClick={() => user.role === 'Officer' && setSelectedReport(report)}
                          onDelete={() => handleDeleteReport(report)}
                          deleting={deletingReportId === report._id}
                          isCitizen={user.role === 'Citizen'}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Officer Update Modal */}
      <AnimatePresence>
        {selectedReport && (
          <OfficerUpdateModal 
            report={selectedReport} 
            onClose={() => setSelectedReport(null)} 
            onUpdated={() => { setSelectedReport(null); fetchReports(); }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({ title, count, color = "text-white" }) {
  return (
    <motion.div whileHover={{ y: -5 }} className="p-6 rounded-[2rem] bg-[#131315] border border-white/5 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
      <h3 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">{title}</h3>
      <p className={`text-5xl font-black ${color}`}>{count}</p>
    </motion.div>
  )
}

function ReportCard({ report, idx, user, onClick, onDelete, deleting, isCitizen }) {
  const isOfficer = user.role === 'Officer';
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.05 }}
      onClick={onClick}
      className={`rounded-3xl bg-[#131315] border border-white/5 flex flex-col overflow-hidden ${isOfficer ? 'cursor-pointer hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all' : ''}`}
    >
      <div className="w-full h-48 bg-black/50 relative">
        <img src={`http://localhost:8000${report.image_url}`} alt="Issue" className="w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#131315] via-transparent to-transparent" />
        <div className="absolute top-4 right-4">
          <StatusBadge status={report.status} />
        </div>
        {report.severity === 'High' && (
          <div className="absolute top-4 left-4 bg-red-500/90 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded border border-red-400">
            High Priority
          </div>
        )}
        {isCitizen && report.duplicate_of && (
          <div className="absolute bottom-3 left-3 rounded-full border border-violet-300/20 bg-violet-950/80 px-3 py-1 text-[10px] font-bold text-violet-200 backdrop-blur-md">
            {report.status === 'Merged' ? 'Merged with ticket' : 'Related ticket'} #{String(report.duplicate_of).slice(0, 4)}
          </div>
        )}
      </div>
      
      <div className="p-5 flex flex-col flex-1">
        <p className="text-slate-300 text-sm mb-4 flex-1 line-clamp-3">{report.description || "No description provided."}</p>

        {isOfficer && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-blue-400/10 bg-blue-500/5 px-3 py-2 text-xs">
            <span className="font-bold text-blue-300">+{report.duplicate_count || 0} reports</span>
            <span className="text-slate-400">Priority <strong className="text-white">{report.priority_score ?? 0}</strong></span>
          </div>
        )}
        
        {report.location && report.location.address && (
          <p className="text-xs text-slate-500 mb-4 line-clamp-1 truncate" title={report.location.address}>
            <MapPin size={12} className="inline mr-1" /> {report.location.address}
          </p>
        )}

        <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5">
          <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <Clock size={12}/> {new Date(report.created_at).toLocaleDateString()}
          </span>
          {isOfficer && (
            <span className="text-xs text-blue-400 font-bold uppercase tracking-wider group-hover:text-blue-300">Update ›</span>
          )}
          {isCitizen && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              aria-label={`Delete complaint ${String(report._id).slice(0, 8)}`}
              className="inline-flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-50"
            >
              <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function StatusBadge({ status }) {
  let color = "bg-slate-800 text-slate-300 border-slate-700";
  if (status === 'Verified') color = "bg-blue-900/50 text-blue-300 border-blue-500/50";
  if (status === 'In Progress') color = "bg-orange-900/50 text-orange-300 border-orange-500/50";
  if (status === 'Resolved' || status === 'Closed') color = "bg-green-900/50 text-green-300 border-green-500/50";
  
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md ${color}`}>
      {status}
    </span>
  )
}

function OfficerUpdateModal({ report, onClose, onUpdated }) {
  const [status, setStatus] = useState(report.status);
  const [remarks, setRemarks] = useState('');
  const [afterImage, setAfterImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('status', status);
    formData.append('remarks', remarks);
    if (status === 'Resolved' && afterImage) {
      formData.append('after_image', afterImage);
    }

    try {
      await axios.put(`http://localhost:8000/api/reports/${report._id}/status`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onUpdated();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#0A0A0B] border border-white/10 p-8 rounded-3xl w-full max-w-4xl shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">✕</button>
        
        <h2 className="text-2xl font-bold text-white mb-6">Update Issue Status</h2>

        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <img
            src={`http://localhost:8000${report.image_url}`}
            alt="Reported issue"
            className="h-full min-h-56 w-full rounded-2xl border border-white/10 object-cover"
          />
          <AIAnalysisCard report={report} compact showSignals />
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">New Status</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
            >
              <option value="Verified">Verified</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">Officer Remarks</label>
            <textarea 
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[100px]"
              placeholder="What actions were taken?"
            />
          </div>

          {status === 'Resolved' && (
            <div>
              <label className="block text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">Resolution Photo (After)</label>
              <input 
                type="file" 
                onChange={(e) => setAfterImage(e.target.files[0])} 
                accept="image/*"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 transition-colors cursor-pointer"
                required
              />
            </div>
          )}

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mt-2 transition-colors"
          >
            {isSubmitting ? "Updating..." : "Save Update"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}
