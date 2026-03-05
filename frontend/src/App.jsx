import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import DatasetsPage from './pages/DatasetsPage';
import UploadDatasetPage from './pages/UploadDatasetPage';
import CommunitySurveysPage from './pages/CommunitySurveysPage';
import NewSurveyPage from './pages/NewSurveyPage';
import MarineAreasPage from './pages/MarineAreasPage';
import NewMarineAreaPage from './pages/NewMarineAreaPage';
import MonitoringPage from './pages/MonitoringPage';
import NewMonitoringPage from './pages/NewMonitoringPage';

// DEMO - Login, Register, Admin removed. Restore when backend is ready.
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/register" element={<Navigate to="/dashboard" replace />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/datasets" element={<DatasetsPage />} />
        <Route path="/datasets/upload" element={<UploadDatasetPage />} />
        <Route path="/surveys" element={<CommunitySurveysPage />} />
        <Route path="/surveys/new" element={<NewSurveyPage />} />
        <Route path="/surveys/:id/edit" element={<NewSurveyPage />} />
        <Route path="/marine" element={<MarineAreasPage />} />
        <Route path="/marine/new" element={<NewMarineAreaPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/monitoring/new" element={<NewMonitoringPage />} />
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
