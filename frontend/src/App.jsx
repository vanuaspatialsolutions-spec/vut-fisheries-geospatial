import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DatasetsPage from './pages/DatasetsPage';
import UploadDatasetPage from './pages/UploadDatasetPage';
import CommunitySurveysPage from './pages/CommunitySurveysPage';
import NewSurveyPage from './pages/NewSurveyPage';
import MarineAreasPage from './pages/MarineAreasPage';
import NewMarineAreaPage from './pages/NewMarineAreaPage';
import MonitoringPage from './pages/MonitoringPage';
import NewMonitoringPage from './pages/NewMonitoringPage';
import AdminPage from './pages/AdminPage';
import FilesPage from './pages/FilesPage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import SchedulePage from './pages/SchedulePage';
import TripsPage from './pages/TripsPage';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-ocean-700">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/datasets" element={<DatasetsPage />} />
        <Route path="/datasets/upload" element={<UploadDatasetPage />} />
        <Route path="/surveys" element={<CommunitySurveysPage />} />
        <Route path="/surveys/new" element={<NewSurveyPage />} />
        <Route path="/surveys/:id/edit" element={<NewSurveyPage />} />
        <Route path="/marine" element={<MarineAreasPage />} />
        <Route path="/marine/new" element={<NewMarineAreaPage />} />
        <Route path="/marine/:id/edit" element={<NewMarineAreaPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/monitoring/new" element={<NewMonitoringPage />} />
        <Route path="/monitoring/:id/edit" element={<NewMonitoringPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/new" element={<Navigate to="/trips" replace />} />
        <Route path="/trips/:id/edit" element={<Navigate to="/trips" replace />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
