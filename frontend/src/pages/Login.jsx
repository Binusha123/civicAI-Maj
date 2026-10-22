import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard'); 
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to backend server. Make sure the backend is running on port 8000.');
      } else {
        setError(err.response?.data?.detail || 'Invalid email or password. Try again.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex min-h-[90vh]">
      
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-20 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-white tracking-tight">Welcome Back.</h2>
            <p className="text-slate-400 text-lg">Sign in to report issues or manage civic tasks.</p>
          </div>
          
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 bg-red-400/10 border border-red-400/20 p-4 rounded-xl mb-6">
              {error}
            </motion.div>
          )}

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg" 
                placeholder="citizen@civicai.com" 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-lg" 
                placeholder="••••••••" 
                required
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02, boxShadow: "0px 10px 30px rgba(59, 130, 246, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-5 rounded-2xl mt-4 shadow-lg shadow-blue-900/50 text-xl transition-all"
            >
              {isLoading ? "Authenticating..." : "Sign In"}
            </motion.button>
            
            <div className="mt-8 text-center text-sm text-slate-500">
              <p>Demo Accounts:</p>
              <div className="flex gap-4 justify-center mt-2">
                <span className="bg-white/5 px-3 py-1 rounded-full cursor-pointer hover:bg-white/10" onClick={() => {setEmail('citizen@civicai.com'); setPassword('citizen123')}}>Citizen</span>
                <span className="bg-white/5 px-3 py-1 rounded-full cursor-pointer hover:bg-white/10" onClick={() => {setEmail('roads@civicai.com'); setPassword('officer123')}}>Officer</span>
                <span className="bg-white/5 px-3 py-1 rounded-full cursor-pointer hover:bg-white/10" onClick={() => {setEmail('admin@civicai.com'); setPassword('admin123')}}>Admin</span>
              </div>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Right Side - Visual Context */}
      <div className="hidden lg:flex w-1/2 relative bg-black items-center justify-center overflow-hidden border-l border-white/10">
        <motion.img 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.6 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1600" 
          alt="Cityscape" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-purple-900/50 mix-blend-multiply" />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative z-10 p-12 max-w-lg"
        >
          <h3 className="text-4xl font-black text-white mb-6 leading-tight">
            Empowering communities to maintain their cities.
          </h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-xl font-bold">1</div>
              <p className="text-white font-medium">Spot a civic issue</p>
            </div>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-xl font-bold">2</div>
              <p className="text-white font-medium">AI routes it instantly</p>
            </div>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-xl font-bold">3</div>
              <p className="text-white font-medium">Track resolution timeline</p>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  )
}
