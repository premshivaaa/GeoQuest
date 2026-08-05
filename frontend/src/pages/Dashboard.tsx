import { useState, useEffect } from 'react';
import axios from 'axios';
import useStore from '../store';
import { useNavigate } from 'react-router-dom';
import { LogOut, Play, Lock, Star, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = 'http://localhost:3001/api';

interface Level {
  level: number;
  unlocked: boolean;
  isBoss: boolean;
}

const levelNames = [
  "Countries", "Capitals", "Flags", "Landmarks", "Mountains (Boss)",
  "Rivers", "Oceans", "Population", "Climate", "Mixed (Boss)"
];

export default function Dashboard() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'levels' | 'leaderboard' | 'achievements'>('levels');
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const token = useStore((state) => state.token);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lvlRes, leadRes, achRes] = await Promise.all([
          axios.get(`${API_URL}/levels`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/leaderboard`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/achievements`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setLevels(lvlRes.data);
        setLeaderboard(leadRes.data);
        setAchievements(achRes.data);
      } catch (error) {
        console.error('Failed to fetch data', error);
      }
    };
    if (token) fetchData();
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Header Profile Section */}
      <div className="bg-slate-800/50 border-b border-slate-700 p-6 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src={user.avatar} alt="Avatar" className="w-16 h-16 rounded-2xl bg-slate-700" />
            <div>
              <h1 className="text-2xl font-bold text-slate-100">{user.name}</h1>
              <p className="text-slate-400 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> {user.rank}
              </p>
            </div>
          </div>
          
          <div className="flex gap-6 text-sm font-medium">
            <div className="flex flex-col items-center p-3 bg-slate-700/30 rounded-xl min-w-[80px]">
              <span className="text-slate-400 text-xs uppercase tracking-wider mb-1">Level</span>
              <span className="text-xl text-sky-400">{user.level}</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-slate-700/30 rounded-xl min-w-[80px]">
              <span className="text-slate-400 text-xs uppercase tracking-wider mb-1">XP</span>
              <span className="text-xl text-indigo-400">{user.xp}</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-slate-700/30 rounded-xl min-w-[80px]">
              <span className="text-slate-400 text-xs uppercase tracking-wider mb-1">Coins</span>
              <span className="text-xl text-amber-400 flex items-center gap-1">
                <CircleCoin /> {user.coins}
              </span>
            </div>
          </div>

          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white transition-colors bg-slate-800 rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-4xl mx-auto px-6 mt-8">
        <div className="flex gap-4 border-b border-slate-700 pb-4 mb-6">
          <button onClick={() => setActiveTab('levels')} className={`font-bold transition-colors ${activeTab === 'levels' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}>Map</button>
          <button onClick={() => setActiveTab('leaderboard')} className={`font-bold transition-colors ${activeTab === 'leaderboard' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}>Leaderboard</button>
          <button onClick={() => setActiveTab('achievements')} className={`font-bold transition-colors ${activeTab === 'achievements' ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'}`}>Achievements</button>
        </div>

        {activeTab === 'levels' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {levels.slice(0, 10).map((l, index) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                key={l.level}
                onClick={() => l.unlocked && navigate(`/game/${l.level}`)}
                className={`relative overflow-hidden rounded-2xl p-6 border ${
                  l.unlocked 
                    ? l.isBoss 
                      ? 'bg-gradient-to-br from-indigo-900 to-purple-900 border-indigo-500/50 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/20' 
                      : 'bg-slate-800 border-slate-700 cursor-pointer hover:border-sky-500/50 hover:bg-slate-750 transition-all'
                    : 'bg-slate-800/30 border-slate-800 opacity-75 cursor-not-allowed'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-sm font-bold px-2 py-1 rounded-md ${
                    l.unlocked ? (l.isBoss ? 'bg-indigo-500/20 text-indigo-300' : 'bg-sky-500/20 text-sky-300') : 'bg-slate-700 text-slate-500'
                  }`}>
                    Level {l.level}
                  </span>
                  {!l.unlocked && <Lock className="w-5 h-5 text-slate-600" />}
                  {l.unlocked && l.isBoss && <Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
                </div>
                
                <h3 className={`text-lg font-semibold ${l.unlocked ? 'text-slate-100' : 'text-slate-500'}`}>
                  {levelNames[l.level - 1] || `Challenge ${l.level}`}
                </h3>
                
                {l.unlocked && (
                  <div className="mt-4 flex justify-end">
                    <div className={`p-2 rounded-full ${l.isBoss ? 'bg-indigo-500' : 'bg-sky-500'} text-white`}>
                      <Play className="w-4 h-4 ml-0.5" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
            {leaderboard.map((u, i) => (
              <div key={u.id} className={`flex items-center justify-between p-4 ${i !== leaderboard.length - 1 ? 'border-b border-slate-700/50' : ''} ${u.id === user.id ? 'bg-sky-500/10' : ''}`}>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold w-6 text-center text-slate-500">#{i + 1}</span>
                  <img src={u.avatar} alt="avatar" className="w-10 h-10 rounded-xl bg-slate-700" />
                  <div>
                    <div className="font-bold text-slate-200">{u.name}</div>
                    <div className="text-xs text-slate-400">Level {u.level} • {u.rank}</div>
                  </div>
                </div>
                <div className="font-bold text-indigo-400">{u.xp} XP</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((a) => (
              <div key={a.id} className={`p-4 rounded-xl border flex items-start gap-4 ${a.earned ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-800 border-slate-700 opacity-60'}`}>
                <div className={`p-3 rounded-full ${a.earned ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h4 className={`font-bold ${a.earned ? 'text-emerald-400' : 'text-slate-400'}`}>{a.badge}</h4>
                  <p className="text-sm text-slate-500 mt-1">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CircleCoin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-dollar-sign"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
  )
}
