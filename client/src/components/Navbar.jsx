import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';
import { removeToken } from '../utils/auth';

const roles = [
  { key: 'farmer',     label: '👨‍🌾 Farmer',   path: '/farmer' },
  { key: 'officer',    label: '🏛️ Officer',   path: '/officer' },
  { key: 'government', label: '📊 Govt Admin', path: '/government' },
];

const profiles = {
  farmer:     { initials: 'RK', name: 'Ramesh Kumar' },
  officer:    { initials: 'AS', name: 'Amit Sharma' },
  government: { initials: 'PG', name: 'Priya Gupta' },
};

function Navbar({ role, setRole, lang, setLang }) {
  const navigate = useNavigate();
  const location = useLocation();

  const activeRole = roles.find(r => location.pathname.startsWith(r.path))?.key || role;
  const profile = profiles[activeRole];

  const handleRoleSwitch = (r) => {
    setRole(r.key);
    navigate(r.path);
  };

  const handleLogout = () => {
    removeToken();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <img src={logo} alt="Kisan Dwar Logo" onError={(e) => { e.target.style.display='none'; }} />
        <div className="navbar-logo-text">
          <div>
            <span className="brand-kisan">Kisan</span>
            <span className="brand-dwar"> Dwar</span>
          </div>
          <div className="brand-tagline">Smart Mandi Portal</div>
        </div>
      </div>

      <div className="navbar-right">
        {/* Role Switcher */}
        <div className="role-switcher">
          {roles.map(r => (
            <button
              key={r.key}
              className={`role-btn ${activeRole === r.key ? 'active' : ''}`}
              onClick={() => handleRoleSwitch(r)}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Language Toggle */}
        <button
          className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
          onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
          title="Toggle Language"
        >
          {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
        </button>

        {/* Profile */}
        <div className="profile-chip">
          <div className="profile-avatar">{profile.initials}</div>
          <span className="profile-name">{profile.name}</span>
        </div>

        <button className="btn btn-outline btn-sm" onClick={handleLogout} title="Logout">
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;