import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import { getFarmerHistory, cancelBooking } from '../../services/api';

// One simple label + icon per kind of event (plain words, not technical logs)
const EVENT_META = {
  booked:    { icon: '📝', label: 'Slot booked',        tone: 'blue' },
  confirmed: { icon: '🚚', label: 'Said "I am on my way"', tone: 'blue' },
  arrived:   { icon: '📍', label: 'Arrived at the Mandi', tone: 'orange' },
  processed: { icon: '✅', label: 'Crop accepted – completed', tone: 'green' },
  paid:      { icon: '💰', label: 'Payment received',   tone: 'green' },
  cancelled: { icon: '❌', label: 'Booking cancelled',  tone: 'red' },
  'no-show': { icon: '⚠️', label: 'Missed the slot',    tone: 'red' },
  rebooked:  { icon: '🔄', label: 'Booking moved to a new centre', tone: 'orange' },
};

const STATUS_BADGE = {
  booked:    { text: 'Waiting', tone: 'blue' },
  arrived:   { text: 'At the Mandi', tone: 'orange' },
  processed: { text: 'Completed', tone: 'green' },
  cancelled: { text: 'Cancelled', tone: 'red' },
  'no-show': { text: 'Missed', tone: 'red' },
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'current', label: 'Current' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const isCurrent = (b) => b.status === 'booked' || b.status === 'arrived';

function fmtDateTime(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtSlotDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function eventMeta(ev) {
  if (ev.type === 'booked' && /^Moved from/i.test(ev.note || '')) return EVENT_META.rebooked;
  return EVENT_META[ev.type] || { icon: '•', label: ev.type, tone: 'gray' };
}

function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [confirmId, setConfirmId] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [openIds, setOpenIds] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    getFarmerHistory()
      .then(res => { setItems(res.data); setError(''); })
      .catch(err => setError(err.response?.data?.message || 'Could not load your history. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (b) => {
    setCancelling(true);
    setError('');
    try {
      await cancelBooking(b.id, 'Cancelled by farmer');
      // If this was the booking saved on this phone, forget it so Home resets.
      try {
        const saved = JSON.parse(localStorage.getItem('kd_lastBooking'));
        if (saved?.id === b.id) localStorage.removeItem('kd_lastBooking');
      } catch { /* ignore */ }
      setConfirmId('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // Current booking pinned on top, then newest first
  const sorted = items.slice().sort((a, b) => (isCurrent(b) - isCurrent(a)) || (new Date(b.createdAt) - new Date(a.createdAt)));
  const shown = sorted.filter(b =>
    filter === 'all' ? true
      : filter === 'current' ? isCurrent(b)
      : filter === 'completed' ? b.status === 'processed'
      : (b.status === 'cancelled' || b.status === 'no-show'));

  const counts = {
    all: items.length,
    current: items.filter(isCurrent).length,
    completed: items.filter(b => b.status === 'processed').length,
    cancelled: items.filter(b => b.status === 'cancelled' || b.status === 'no-show').length,
  };

  if (!loading && !error && items.length === 0) {
    return (
      <EmptyState
        title="No bookings yet"
        sub="Your bookings, cancellations and payments will be listed here."
        to="/farmer/booking"
        label="Book a Slot"
      />
    );
  }

  return (
    <div className="hist">
      <div className="page-header">
        <div className="page-title" data-speak>🕘 My History</div>
        <div className="page-subtitle">All your Mandi bookings, in one place</div>
      </div>

      {error && <div className="wizard-error">{error}</div>}

      <div className="hist-filters" role="tablist">
        {FILTERS.map(f => (
          <button type="button" key={f.id} role="tab" aria-selected={filter === f.id}
            className={`hist-filter${filter === f.id ? ' active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label} <span className="hist-count">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--gray-400)' }}>Loading…</p>}
      {!loading && shown.length === 0 && <p className="home-note">Nothing here yet.</p>}

      {shown.map(b => {
        const badge = STATUS_BADGE[b.status] || { text: b.status, tone: 'gray' };
        const expanded = openIds[b.id] !== undefined ? openIds[b.id] : isCurrent(b);
        return (
          <div key={b.id} className={`card hist-card${isCurrent(b) ? ' hist-card--current' : ''}`}>
            <div className="hist-top">
              <div>
                {isCurrent(b) && <span className="hist-current-tag">Current booking</span>}
                <div className="hist-token" data-no-translate>{b.tokenId}</div>
                <div className="hist-meta">{b.centre} · {b.crop} · {b.quantity} Qtl</div>
                {(b.slotDate || b.slotLabel) && (
                  <div className="hist-meta">🗓 {[fmtSlotDate(b.slotDate), b.slotLabel].filter(Boolean).join(' · ')}</div>
                )}
              </div>
              <span className={`pf-status pf-status--${badge.tone}`}>{badge.text}</span>
            </div>

            {b.status === 'cancelled' && b.cancelReason && (
              <div className="pf-reject">Reason: {b.cancelReason}</div>
            )}

            <button type="button" className="hist-toggle" onClick={() => setOpenIds(o => ({ ...o, [b.id]: !expanded }))}>
              {expanded ? '▲ Hide steps' : '▼ Show steps'}
            </button>

            {expanded && (
              <ol className="hist-timeline">
                {b.events.map((ev, i) => {
                  const m = eventMeta(ev);
                  return (
                    <li key={i} className={`hist-event hist-event--${m.tone}`}>
                      <span className="hist-event-icon">{m.icon}</span>
                      <div>
                        <div className="hist-event-label">{m.label}</div>
                        <div className="hist-event-time">{fmtDateTime(ev.at)}{ev.note && ev.type === 'paid' ? ` · ${ev.note}` : ''}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {b.status === 'booked' && (
              confirmId === b.id ? (
                <div className="hist-confirm">
                  <div className="hist-confirm-text">Cancel token {b.tokenId}? You will lose your place in the line.</div>
                  <div className="hist-confirm-btns">
                    <button type="button" className="btn btn-outline" onClick={() => setConfirmId('')}>No, keep it</button>
                    <button type="button" className="btn hist-danger" onClick={() => handleCancel(b)} disabled={cancelling}>
                      {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn btn-outline hist-cancel-btn" onClick={() => setConfirmId(b.id)}>✕ Cancel booking</button>
              )
            )}

            {isCurrent(b) && (
              <Link to="/farmer/queue" className="hist-link">Open live queue →</Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default History;
