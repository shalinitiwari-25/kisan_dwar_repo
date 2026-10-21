import { Link } from 'react-router-dom';
import MandiScene from './MandiScene';

function EmptyState({ title, sub, to, label }) {
  return (
    <div className="empty-state">
      <MandiScene />
      <div className="empty-state-title" data-speak>{title}</div>
      <div className="empty-state-sub" data-speak>{sub}</div>
      <Link to={to} className="farmer-big-btn">{label}</Link>
    </div>
  );
}

export default EmptyState;
