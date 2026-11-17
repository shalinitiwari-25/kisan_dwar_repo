import { useNavigate, useLocation, Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { removeToken, getUser, getRole, homeFor } from '../utils/auth';
import LanguageToggle from './LanguageToggle';

function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const isFarmer = useLocation().pathname.startsWith('/farmer');

  const user = getUser();
  const role = getRole();
  const homePath = homeFor(role);
  // Only farmers have a profile page; others just go to their own home.
  const profilePath = role === 'farmer' ? '/farmer/profile' : homePath;
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
      {!isFarmer && (
        <button className="navbar-menu-btn" onClick={onMenuClick} aria-label="Open menu">☰</button>
      )}

      {/* Farmers: tap the picture at the top-left to open the Profile page */}
      {isFarmer && (
        <Link to={profilePath} className="navbar-avatar-btn" aria-label="Open my profile" title="My Profile">
          <span className="profile-avatar">{initials}</span>
        </Link>
      )}

      {/* Tapping the logo always goes to the user's home page */}
      <Link to={homePath} className="navbar-logo" aria-label="Kisan Dwar – go to home">
        <img src={logo} alt="Kisan Dwar Logo" onError={(e) => { e.target.style.display='none'; }} />
        <div className="navbar-logo-text" data-no-translate>
          <div>
            <span className="brand-kisan">Kisan</span>
            <span className="brand-dwar"> Dwar</span>
          </div>
          <div className="brand-tagline">Smart Mandi Portal</div>
        </div>
      </Link>

      <div className="navbar-right">
        {/* Language Toggle */}
        <LanguageToggle />

        {/* Profile */}
        <Link to={profilePath} className="profile-chip" aria-label="Open my profile">
          <div className="profile-avatar">{initials}</div>
          <span className="profile-name">{user.name || 'User'}</span>
        </Link>

        <button className="btn btn-outline btn-sm" onClick={handleLogout} title="Logout">
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;