import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { removeToken, getUser } from '../utils/auth';

function Navbar() {
  const navigate = useNavigate();
  const [lang, setLang] = useState('en');

  const user = getUser();
  // Build initials from name (e.g. "Ramesh Kumar" → "RK")
  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

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
          <div className="profile-avatar">{initials}</div>
          <span className="profile-name">{user.name || 'User'}</span>
        </div>

        <button className="btn btn-outline btn-sm" onClick={handleLogout} title="Logout">
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;