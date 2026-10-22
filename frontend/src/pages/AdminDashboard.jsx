import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Activity, CheckCircle2, Clock, AlertTriangle, ChevronDown, Bell, Mail } from 'lucide-react';

export default function AdminDashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [roleRequests, setRoleRequests] = useState([]);
  const [roleRequestError, setRoleRequestError] = useState('');
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [expandedDomain, setExpandedDomain] = useState("Road Damage");

  const domains = [
    { name: "Road Damage", color: "from-blue-600 to-indigo-600", shadow: "rgba(59,130,246,0.3)" },
    { name: "Garbage & Sanitation", color: "from-emerald-500 to-green-600", shadow: "rgba(16,185,129,0.3)" },
    { name: "Water Issues", color: "from-cyan-500 to-blue-500", shadow: "rgba(6,182,212,0.3)" },
    { name: "Electricity Hazards", color: "from-purple-600 to-pink-600", shadow: "rgba(168,85,247,0.3)" }
  ];

  useEffect(() => {
    // Fetch analytics
    axios.get('http://localhost:8000/api/admin/analytics')
      .then(res => setStats(res.data))
      .catch(err => console.error("Failed to fetch analytics", err));
    
    // Fetch all reports
    axios.get('http://localhost:8000/api/reports/')
      .then(res => setReports(res.data))
      .catch(err => console.error("Failed to fetch reports", err));

    axios.get('http://localhost:8000/api/admin/role-requests')
      .then(res => setRoleRequests(res.data))
      .catch(err => console.error("Failed to fetch role requests", err));
  }, []);

  const decideRoleRequest = async (request, approved) => {
    setProcessingRequestId(request._id);
    setRoleRequestError('');
    try {
      await axios.put(`http://localhost:8000/api/admin/role-requests/${request._id}`, { approved });
      setRoleRequests(current => current.filter(item => item._id !== request._id));
    } catch (error) {
      setRoleRequestError(error.response?.data?.detail || 'Could not update this access request.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  if (!stats) return <div className="text-center p-10 animate-pulse text-blue-400">Loading AI Intelligence...</div>;

  return (
    <div className="w-full flex flex-col gap-10 perspective-1000">
      
      {/* 3D Floating Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Total Issues" value={stats.total} />
        <MetricCard title="Merged Duplicates" value={stats.duplicates || 0} />
        <MetricCard title="Resolved" value={stats.by_status['Resolved'] || 0} />
        <MetricCard title="In Progress" value={stats.by_status['In Progress'] || 0} />
        <MetricCard title="Pending Review" value={stats.by_status['Needs Review'] || 0} />
      </div>

      <section className="rounded-3xl border border-white/10 bg-[#131315] p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">Access requests</h2>
            <p className="mt-1 text-sm text-slate-400">Government and Admin accounts remain Citizens until approved.</p>
          </div>
          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-100">{roleRequests.length} pending</span>
        </div>
        {roleRequestError && <p className="mb-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{roleRequestError}</p>}
        {roleRequests.length === 0 ? (
          <p className="text-sm text-slate-500">No pending access requests.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {roleRequests.map(request => (
              <div key={request._id} className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-black/30 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold text-white">{request.name} <span className="font-normal text-slate-400">· {request.email}</span></p>
                  <p className="mt-1 text-xs text-slate-400">
                    Requests {request.role_request.requested_role === 'Officer' ? 'Government Officer' : 'Admin'} access
                    {request.role_request.department_name ? ` · ${request.role_request.department_name}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={processingRequestId === request._id} onClick={() => decideRoleRequest(request, false)} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 disabled:opacity-50">Deny</button>
                  <button type="button" disabled={processingRequestId === request._id} onClick={() => decideRoleRequest(request, true)} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50">{processingRequestId === request._id ? 'Saving…' : 'Approve'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4 Domains Structure */}
      <div className="flex flex-col gap-6 mt-8">
        <h2 className="text-3xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] flex items-center gap-3">
          <Activity className="text-purple-400" />
          AI Sector Oversight
        </h2>
        
        <div className="grid grid-cols-1 gap-6">
          {domains.map((domain, idx) => {
            const domainReports = reports.filter(r => r.category === domain.name);
            const isExpanded = expandedDomain === domain.name;

            return (
              <motion.div 
                key={domain.name}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`rounded-[2rem] bg-[#131315] border border-white/5 overflow-hidden transition-all duration-500`}
                style={{ boxShadow: isExpanded ? `0 20px 50px -10px ${domain.shadow}` : 'none' }}
              >
                {/* Domain Header */}
                <div 
                  onClick={() => setExpandedDomain(isExpanded ? null : domain.name)}
                  className="p-6 cursor-pointer flex justify-between items-center bg-white/[0.02] hover:bg-white/[0.04] transition-colors relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${domain.color}`} />
                  <div className="flex items-center gap-6 ml-4">
                    <h3 className="text-2xl font-black text-white">{domain.name}</h3>
                    <span className="bg-white/10 px-4 py-1 rounded-full text-sm font-bold text-slate-300">
                      {domainReports.length} Reports
                    </span>
                  </div>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                    <ChevronDown size={28} className="text-slate-400" />
                  </motion.div>
                </div>

                {/* Domain Content (List of Complaints) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5"
                    >
                      <div className="p-6 flex flex-col gap-4 bg-black/40">
                        {domainReports.length === 0 ? (
                          <div className="text-center py-8 text-slate-500 italic">No reports generated by AI yet.</div>
                        ) : (
                          domainReports.map(report => (
                            <AdminReportRow key={report._id} report={report} />
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value }) {
  return (
    <motion.div 
      whileHover={{ y: -10, rotateX: 10, scale: 1.02 }}
      className="p-8 rounded-[2rem] bg-[#131315] border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-visible transform-gpu"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] rounded-[2rem] overflow-hidden opacity-30" />
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-[30px]" />
      
      <div className="relative z-10 [transform:translateZ(30px)] flex flex-col gap-2">
        <h3 className="text-sm uppercase tracking-widest text-slate-400 font-black drop-shadow-md">{title}</h3>
        <p className="text-6xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{value}</p>
      </div>
    </motion.div>
  )
}

function AdminReportRow({ report }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.05)" }}
      className="flex items-center justify-between p-5 rounded-2xl border border-white/5 bg-white/[0.01] transition-all"
    >
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg shrink-0">
          <img src={`http://localhost:8000${report.image_url}`} className="w-full h-full object-cover" alt="Issue" />
        </div>
        <div className="flex flex-col">
          <p className="text-white font-semibold text-lg line-clamp-1">{report.description || "System AI Captured Hazard"}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mt-1">
            <span>{new Date(report.created_at).toLocaleDateString()}</span>
            {report.location?.address && <span className="line-clamp-1 truncate max-w-[200px]">{report.location.address}</span>}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={report.status} />
          {report.severity === 'High' && <span className="text-[10px] text-red-400 font-black uppercase tracking-wider bg-red-400/10 px-2 py-0.5 rounded">High Severity</span>}
        </div>
      </div>
    </motion.div>
  )
}

function StatusBadge({ status }) {
  let color = "bg-slate-800 text-slate-300 border-slate-700";
  if (status === 'Verified') color = "bg-blue-900/50 text-blue-300 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]";
  if (status === 'In Progress') color = "bg-orange-900/50 text-orange-300 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]";
  if (status === 'Resolved' || status === 'Closed') color = "bg-green-900/50 text-green-300 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]";
  
  return (
    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border backdrop-blur-md ${color}`}>
      {status}
    </span>
  )
}
