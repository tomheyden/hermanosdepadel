import { Routes, Route, Navigate } from 'react-router-dom';
import OnePager from './pages/OnePager';
import Live from './pages/Live';
import LiveView from './pages/LiveView';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<OnePager />} />
      {/* primary, self-explanatory routes */}
      <Route path="/turnier" element={<LiveView />} />
      <Route path="/admin" element={<Live />} />
      {/* keep old links working */}
      <Route path="/live" element={<Navigate to="/admin" replace />} />
      <Route path="/live/view" element={<Navigate to="/turnier" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
