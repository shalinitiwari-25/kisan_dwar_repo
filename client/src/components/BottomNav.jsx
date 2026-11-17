import { NavLink } from 'react-router-dom';
import Icon from './Icon';

// Big, always-visible tabs for farmers on phones (no hidden menu to discover).
const tabs = [
  { to: '/farmer',         icon: 'home', label: 'Home',    end: true },
  { to: '/farmer/booking', icon: 'book', label: 'Book' },
  { to: '/farmer/queue',   icon: 'queue', label: 'Queue' },
  { to: '/farmer/history', icon: 'history', label: 'History' },
  { to: '/farmer/profile', icon: 'user', label: 'Profile' },
];

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {tabs.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => `bottom-nav-tab${isActive ? ' active' : ''}`}
        >
          <span className="bottom-nav-icon"><Icon name={t.icon} size={26} /></span>
          <span className="bottom-nav-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;
