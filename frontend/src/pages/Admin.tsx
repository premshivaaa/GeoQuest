import { useState, useEffect } from 'react';
import axios from 'axios';
import useStore from '../store';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Activity, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export default function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalXpEarned: 0 });
  const token = useStore((state) => state.token);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [usersRes, statsRes] = await Promise.all([
          axios.get(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setUsers(usersRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Failed to fetch admin data', error);
      }
    };
    if (token) fetchAdminData();
  }, [token]);

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`${API_URL}/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(users.filter(u => u.id !== id));
      setStats(prev => ({ ...prev, totalUsers: prev.totalUsers - 1 }));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-20 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="text-3xl font-bold text-slate-100">Admin Panel</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
            <div className="p-4 bg-sky-500/20 text-sky-400 rounded-xl"><Users className="w-8 h-8" /></div>
            <div>
              <div className="text-slate-400">Total Users</div>
              <div className="text-2xl font-bold text-slate-100">{stats.totalUsers}</div>
            </div>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
            <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-xl"><Activity className="w-8 h-8" /></div>
            <div>
              <div className="text-slate-400">Total XP Earned Platform-wide</div>
              <div className="text-2xl font-bold text-slate-100">{stats.totalXpEarned} XP</div>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-100 mb-4">User Management</h2>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-300">
              <thead className="bg-slate-900/50 text-slate-400 text-sm">
                <tr>
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Level</th>
                  <th className="p-4 font-medium">XP</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-750 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img src={u.avatar} className="w-8 h-8 rounded bg-slate-700" alt="avatar"/>
                      <div>
                        <div className="font-bold text-slate-200">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-sky-400">{u.level}</td>
                    <td className="p-4 font-bold text-indigo-400">{u.xp}</td>
                    <td className="p-4">
                      <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
