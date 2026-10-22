import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReportIssue from './pages/ReportIssue';
import { LogOut } from 'lucide-react';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="h-screen w-full flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return children;
}

function Layout() {
  const { user, logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 font-sans selection:bg-blue-500/30 flex flex-col">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <nav className="w-full p-6 flex justify-between items-center relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <Link to="/" className="text-2xl font-black tracking-tighter flex items-center gap-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">CivicAI.</span>
        </Link>
        <div className="flex gap-6 items-center">
          <Link to="/report" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Report Issue</Link>
          <Link to="/dashboard" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Dashboard</Link>
          {user ? (
            <button onClick={logout} className="text-sm font-semibold bg-white/10 hover:bg-red-500/20 hover:text-red-400 px-5 py-2 rounded-full transition-all flex items-center gap-2 border border-white/10 hover:border-red-500/30">
              Log Out <LogOut size={14}/>
            </button>
          ) : (
            <div className="flex gap-3">
              <Link to="/login" className="text-sm font-semibold bg-white/10 hover:bg-white/20 px-5 py-2 rounded-full transition-all border border-white/10">Log In</Link>
              <Link to="/register" className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 px-5 py-2 rounded-full transition-all text-white shadow-lg">Sign Up</Link>
            </div>
          )}
        </div>
      </nav>
      
      <div className="flex-1 w-full relative z-10 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/report" element={
            <ProtectedRoute>
              <ReportIssue />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout />
      </Router>
    </AuthProvider>
  );
}

export default App;
