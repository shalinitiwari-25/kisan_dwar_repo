import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Navbar  from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import { getRole } from './utils/auth';

// Farmer
import FarmerDashboard from './pages/farmer/Dashboard';
import Booking         from './pages/farmer/Booking';
import QueueStatus     from './pages/farmer/QueueStatus';
import PaymentStatus   from './pages/farmer/PaymentStatus';

// Officer
import OfficerDashboard from './pages/officer/OfficerDashboard';
import QueueManager     from './pages/officer/QueueManager';
import CapacityControl  from './pages/officer/CapacityControl';

// Government
import AnalyticsOverview from './pages/government/AnalyticsOverview';
import DistrictMonitor   from './pages/government/DistrictMonitor';

// Where an already-logged-in user should land when hitting an unknown
// path (e.g. "/") — falls back to the farmer dashboard if nothing is
// stored yet, in which case ProtectedRoute below sends them to /login.
const ROLE_HOME = {
  farmer: '/farmer',
  officer: '/officer',
  government: '/government',
};

function AppShell() {
  const [role, setRole] = useState(getRole() || 'farmer');
  const [lang, setLang] = useState('en');

  return (
    <>
      <Navbar role={role} setRole={setRole} lang={lang} setLang={setLang} />

      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          <Routes>
            {/* Farmer */}
            <Route path="/farmer" element={
              <ProtectedRoute allowedRole="farmer"><FarmerDashboard /></ProtectedRoute>
            } />
            <Route path="/farmer/booking" element={
              <ProtectedRoute allowedRole="farmer"><Booking /></ProtectedRoute>
            } />
            <Route path="/farmer/queue" element={
              <ProtectedRoute allowedRole="farmer"><QueueStatus /></ProtectedRoute>
            } />
            <Route path="/farmer/payment" element={
              <ProtectedRoute allowedRole="farmer"><PaymentStatus /></ProtectedRoute>
            } />

            {/* Officer */}
            <Route path="/officer" element={
              <ProtectedRoute allowedRole="officer"><OfficerDashboard /></ProtectedRoute>
            } />
            <Route path="/officer/queue" element={
              <ProtectedRoute allowedRole="officer"><QueueManager /></ProtectedRoute>
            } />
            <Route path="/officer/capacity" element={
              <ProtectedRoute allowedRole="officer"><CapacityControl /></ProtectedRoute>
            } />

            {/* Government */}
            <Route path="/government" element={
              <ProtectedRoute allowedRole="government"><AnalyticsOverview /></ProtectedRoute>
            } />
            <Route path="/government/district" element={
              <ProtectedRoute allowedRole="government"><DistrictMonitor /></ProtectedRoute>
            } />

            {/* Default — send to the logged-in user's home; ProtectedRoute
                will bounce to /login if there's no valid session yet. */}
            <Route path="*" element={<Navigate to={ROLE_HOME[getRole()] || '/farmer'} replace />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
