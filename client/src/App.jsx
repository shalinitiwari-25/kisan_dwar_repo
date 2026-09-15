import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import Navbar  from './components/Navbar';
import Sidebar from './components/Sidebar';

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

function App() {
  const [role, setRole] = useState('farmer');
  const [lang, setLang] = useState('en');

  return (
    <BrowserRouter>
      <Navbar role={role} setRole={setRole} lang={lang} setLang={setLang} />

      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          <Routes>
            {/* Farmer */}
            <Route path="/farmer"          element={<FarmerDashboard />} />
            <Route path="/farmer/booking"  element={<Booking />} />
            <Route path="/farmer/queue"    element={<QueueStatus />} />
            <Route path="/farmer/payment"  element={<PaymentStatus />} />

            {/* Officer */}
            <Route path="/officer"          element={<OfficerDashboard />} />
            <Route path="/officer/queue"    element={<QueueManager />} />
            <Route path="/officer/capacity" element={<CapacityControl />} />

            {/* Government */}
            <Route path="/government"          element={<AnalyticsOverview />} />
            <Route path="/government/district" element={<DistrictMonitor />} />

            {/* Default */}
            <Route path="*" element={<Navigate to="/farmer" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;