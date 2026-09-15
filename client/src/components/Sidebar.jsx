import { NavLink, useLocation } from 'react-router-dom';

const farmerLinks = [
  { to: '/farmer',          icon: '🏠', label: 'Dashboard' },
  { to: '/farmer/booking',  icon: '📋', label: 'Book a Slot' },
  { to: '/farmer/queue',    icon: '🔢', label: 'Queue Status' },
  { to: '/farmer/payment',  icon: '💳', label: 'Payment Status' },
];

const officerLinks = [
  { to: '/officer',          icon: '📊', label: 'Officer Dashboard' },
  { to: '/officer/queue',    icon: '📋', label: 'Queue Manager' },
  { to: '/officer/capacity', icon: '🔍', label: 'Gate Verification' },
];

const govtLinks = [
  { to: '/government',         icon: '📈', label: 'Analytics Overview' },
  { to: '/government/district',icon: '🗺️', label: 'District Monitor' },
];

function Sidebar() {
  const location = useLocation();

  let links = farmerLinks;
  let sectionLabel = 'Farmer Portal';
  let sectionEmoji = '👨‍🌾';

  if (location.pathname.startsWith('/officer')) {
    links = officerLinks;
    sectionLabel = 'Officer Control';
    sectionEmoji = '🏛️';
  } else if (location.pathname.startsWith('/government')) {
    links = govtLinks;
    sectionLabel = 'Govt. Dashboard';
    sectionEmoji = '📊';
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section-label">{sectionEmoji} {sectionLabel}</div>
      {links.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/farmer' || link.to === '/officer' || link.to === '/government'}
          className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
        >
          <span className="link-icon">{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </aside>
  );
}

export default Sidebar;