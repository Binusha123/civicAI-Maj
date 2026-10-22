import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department_id: ''
  });
  const [accountType, setAccountType] = useState('Citizen');
  const [departments, setDepartments] = useState([]);
  const [departmentsError, setDepartmentsError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    axios.get('http://localhost:8000/api/auth/departments')
      .then(response => setDepartments(response.data))
      .catch(() => setDepartmentsError('Could not load government departments.'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const requestedRole = accountType === 'Government' ? 'Officer' : accountType === 'Admin' ? 'Admin' : null;
      await axios.post('http://localhost:8000/api/auth/register', {
        ...formData,
        role: 'Citizen',
        department_id: accountType === 'Government' ? formData.department_id : null,
        requested_role: requestedRole,
      });
      if (requestedRole) {
        setSuccess(`Your Citizen account is ready. Your ${accountType === 'Government' ? 'Government Officer' : 'Admin'} access request is pending administrator approval. You can sign in with Citizen access now.`);
        setIsRegistered(true);
        setFormData(current => ({ ...current, password: '' }));
      } else {
        navigate('/login');
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to backend server. Make sure the backend is running on port 8000.');
      } else {
        setError(err.response?.data?.detail || 'Registration failed. Try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex min-h-[90vh]">
      
      {/* Left Side - Visual Context */}
      <div className="hidden lg:flex w-1/2 relative bg-[#050505] items-center justify-center overflow-hidden border-r border-white/10">
        {/* 3D Glowing Orb Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 rounded-full blur-[100px] opacity-40 animate-pulse" />
        
        {/* CSS Mesh Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(1000px)_rotateX(60deg)_translateY(-100px)] opacity-50" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, type: "spring" }}
          className="relative z-10 p-12 max-w-lg text-center"
        >
          <div className="w-32 h-32 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.3)]">
            <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">AI</span>
          </div>
          <h3 className="text-5xl font-black text-white mb-6 leading-tight tracking-tight">
            Join the Civic<br/>Revolution.
          </h3>
          <p className="text-slate-400 text-lg">Create an account to start reporting issues, tracking resolutions, and keeping our city safe using advanced AI vision.</p>
        </motion.div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-20 relative z-10 bg-[#0A0A0B]">
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-white tracking-tight">Create Account</h2>
            <p className="text-slate-400 text-lg">Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">Sign In</Link></p>
          </div>
          
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 bg-red-400/10 border border-red-400/20 p-4 rounded-xl mb-6">
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-200 bg-emerald-400/10 border border-emerald-400/20 p-4 rounded-xl mb-6">
              {success} <Link to="/login" className="font-bold underline">Sign in</Link>
            </motion.div>
          )}

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">Full Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg hover:bg-white/10" 
                placeholder="John Doe" 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg hover:bg-white/10" 
                placeholder="citizen@civicai.com" 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">Password</label>
              <input 
                type="password" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg hover:bg-white/10" 
                placeholder="••••••••" 
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="account-type" className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">I am signing up as</label>
              <select
                id="account-type"
                value={accountType}
                onChange={(event) => setAccountType(event.target.value)}
                className="w-full bg-[#111116] border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg"
              >
                <option value="Citizen">Citizen</option>
                <option value="Government">Government staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            {accountType === 'Government' && (
              <div>
                <label htmlFor="department" className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">Government Department</label>
                <select
                  id="department"
                  value={formData.department_id}
                  onChange={(event) => setFormData({ ...formData, department_id: event.target.value })}
                  required
                  className="w-full bg-[#111116] border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg"
                >
                  <option value="">Select your department</option>
                  {departments.map(department => (
                    <option key={department._id} value={department._id}>{department.name}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">Officer access is granted after an administrator reviews your request.</p>
                {departmentsError && <p className="mt-2 text-xs text-amber-200">{departmentsError}</p>}
              </div>
            )}
            {accountType === 'Admin' && (
              <p className="-mt-3 text-xs text-slate-500">Admin access is granted only after approval by an existing administrator.</p>
            )}
            
            <motion.button 
              whileHover={{ scale: 1.02, boxShadow: "0px 10px 30px rgba(168, 85, 247, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading || isRegistered}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-5 rounded-2xl mt-4 shadow-lg shadow-purple-900/50 text-xl transition-all"
            >
              {isLoading ? "Creating Account..." : accountType === 'Citizen' ? "Sign Up" : `Create Account & Request ${accountType} Access`}
            </motion.button>
          </form>
        </motion.div>
      </div>

    </div>
  )
}
