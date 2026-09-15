import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Navbar  from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
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

// Where an already-logged-in user should land when hitting an unknown path
const ROLE_HOME = {
  farmer: '/farmer',
  officer: '/officer',
  government: '/government',
};

function AppShell() {
  return (
    <>
      <Navbar />

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

            {/* Default — send to the logged-in user's home */}
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
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*"        element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
