import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Game from './pages/Game';
import Login from './pages/Login';
import useStore from './store';

import Admin from './pages/Admin';

function App() {
  const token = useStore((state) => state.token);

  return (
    <Router>
      <div className="w-full min-h-screen bg-slate-900 text-slate-50 font-sans">
        <Routes>
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/game/:levelId" element={token ? <Game /> : <Navigate to="/login" />} />
          <Route path="/admin" element={token ? <Admin /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
