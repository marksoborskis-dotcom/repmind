import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import LogWorkout from './pages/LogWorkout';
import History from './pages/History';
import Progress from './pages/Progress';
import AISuggestion from './pages/AISuggestion';
import Profile, { loadProfile } from './pages/Profile';
import Settings from './pages/Settings';

function RequireProfile({ children }: { children: React.ReactNode }) {
  const hasProfile = loadProfile() !== null;
  if (!hasProfile) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={<Profile isSetup />} />
        <Route path="/" element={<Layout />}>
          <Route index element={
            loadProfile() ? <Navigate to="/dashboard" replace /> : <Navigate to="/setup" replace />
          } />
          <Route path="dashboard"  element={<RequireProfile><Dashboard /></RequireProfile>} />
          <Route path="log"        element={<RequireProfile><LogWorkout /></RequireProfile>} />
          <Route path="history"    element={<RequireProfile><History /></RequireProfile>} />
          <Route path="progress"   element={<RequireProfile><Progress /></RequireProfile>} />
          <Route path="ai"         element={<RequireProfile><AISuggestion /></RequireProfile>} />
          <Route path="profile"    element={<Profile />} />
          <Route path="settings"   element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
