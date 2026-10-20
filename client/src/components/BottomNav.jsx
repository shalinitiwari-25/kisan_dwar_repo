import { NavLink } from 'react-router-dom';

// Big, always-visible tabs for farmers on phones (no hidden menu to discover).
const tabs = [
  { to: '/farmer',         icon: '🏠', label: 'Home',    end: true },
  { to: '/farmer/booking', icon: '📋', label: 'Book' },
  { to: '/farmer/queue',   icon: '🔢', label: 'Queue' },
  { to: '/farmer/payment', icon: '💳', label: 'Payment' },
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
          <span className="bottom-nav-icon">{t.icon}</span>
          <span className="bottom-nav-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;
