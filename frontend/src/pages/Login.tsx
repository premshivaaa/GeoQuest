import { useState } from 'react';
import axios from 'axios';
import useStore from '../store';
import { useNavigate } from 'react-router-dom';
import { Map, User, KeyRound, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleGuestLogin = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/guest`);
      setAuth(response.data.token, response.data.user);
      navigate('/');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 rounded-2xl bg-slate-800/50 backdrop-blur-xl border border-slate-700 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-sky-400 to-indigo-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
            <Map className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
            GeoQuest AI
          </h1>
          <p className="text-slate-400 mt-2 text-center">Travel the world by answering AI-generated geography questions.</p>
        </div>

        <div className="space-y-4">
          <button 
            disabled={isLoading}
            className="w-full py-3 px-4 flex items-center justify-center gap-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-600 disabled:opacity-50"
          >
            <User className="w-5 h-5" />
            Continue with Google
          </button>
          
          <button 
            disabled={isLoading}
            className="w-full py-3 px-4 flex items-center justify-center gap-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-600 disabled:opacity-50"
          >
            <LogIn className="w-5 h-5" />
            Login with Email
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-400">or</span>
            </div>
          </div>

          <button 
            onClick={handleGuestLogin}
            disabled={isLoading}
            className="w-full py-3 px-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <KeyRound className="w-5 h-5" />
            {isLoading ? 'Loading...' : 'Play as Guest'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
