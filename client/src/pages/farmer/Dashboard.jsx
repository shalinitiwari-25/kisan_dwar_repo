import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../../components/StatCard';
import { getCentre, getBookingsByCentre } from '../../services/api';

const CENTRE_MAP = {
  'C001': 'Karnal Mandi',
  'C002': 'Panipat Mandi',
  'C003': 'Kurukshetra Mandi',
};

function getLastBooking() {
  try {
    return JSON.parse(localStorage.getItem('kd_lastBooking'));
  } catch {
    return null;
  }
}

function Dashboard() {
  const lastBooking = getLastBooking();
  const [centre, setCentre] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const centreId = lastBooking?.centreId || 'C001';
    let cancelled = false;
    setLoading(true);

    Promise.all([getCentre(centreId), getBookingsByCentre(centreId)])
      .then(([centreRes, bookingsRes]) => {
        if (cancelled) return;
        setCentre(centreRes.data);
        if (lastBooking) {
          const waiting = bookingsRes.data
            .filter(b => b.status === 'booked' || b.status === 'arrived')
            .sort((a, b) => a.tokenNo - b.tokenNo);
          const idx = waiting.findIndex(b => b.tokenNo === lastBooking.tokenNo);
          setQueuePosition(idx >= 0 ? idx + 1 : null);
        }
      })
      .catch(err => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBooking?.centreId]);

  const ahead = queuePosition ? queuePosition - 1 : 0;
  const waitMin = ahead * 7;
  const departTime = new Date(Date.now() - waitMin * 60000 + 30 * 60000);
  const departLabel = departTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">👨‍🌾 Namaste, Ramesh Kumar!</div>
            <div className="page-subtitle">
              📍 {centre ? centre.name : 'Loading…'}, Haryana
            </div>
          </div>
          <div>
            <span className={`badge ${lastBooking ? 'badge-green' : 'badge-gray'}`}>
              <span className="badge-dot"></span>
              {lastBooking ? 'Booking Active' : 'No Active Booking'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px' }}>
          Couldn't reach the server: {error}
        </div>
      )}

      {/* AI Departure Guidance */}
      <div className="ai-card">
        <div className="ai-card-label">🤖 AI Departure Guidance</div>
        {lastBooking ? (
          <>
            <div className="ai-card-time">{departLabel}</div>
            <div className="ai-card-sub">Best time to depart from home — gate wait is ~{Math.max(ahead * 3, 5)} mins right now</div>
            <div className="ai-card-pills">
              <div className="ai-pill">⏱️ Gate Wait ~{Math.max(ahead * 3, 5)} mins</div>
              <div className="ai-pill">📍 Queue Position #{queuePosition ?? '—'}</div>
              <div className="ai-pill">🚛 Route Clear</div>
            </div>
            <div style={{ marginTop: '14px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
              Calculated from queue position #{queuePosition ?? '—'}, {ahead} farmers ahead, and average processing time per token
            </div>
          </>
        ) : (
          <>
            <div className="ai-card-sub">Book a procurement slot to get a personalised departure time</div>
            <Link to="/farmer/booking" className="btn btn-primary" style={{ marginTop: '12px', display: 'inline-flex' }}>
              + Book a Slot
            </Link>
          </>
        )}
      </div>

      {/* Stat Cards */}
      <div className="stat-cards-grid">
        <StatCard label="Queue Position" value={queuePosition ? `#${queuePosition}` : '—'} sub={queuePosition ? `${ahead} farmers ahead` : 'No booking yet'} icon="🔢" color="green" />
        <StatCard label="Yard Capacity" value={centre ? `${centre.yardCapacityUsed}%` : '—'} sub={centre?.yardCapacityUsed >= 90 ? 'Nearly full' : 'Filling up'} icon="🏗️" color={centre?.yardCapacityUsed >= 90 ? 'orange' : 'green'} />
        <StatCard label="Est. Wait Time" value={queuePosition ? `${waitMin} min` : '—'} sub={queuePosition ? `~${(waitMin / 60).toFixed(1)} hours from now` : '—'} icon="⏳" color="gold" />
        <StatCard label="Booking Status" value={lastBooking ? '✓ Confirmed' : 'None'} sub={lastBooking ? 'Active booking' : 'Book a slot to start'} icon="📋" color={lastBooking ? 'green' : 'gray'} />
      </div>

      <div className="grid-2">
        {/* Active Booking Card */}
        {lastBooking ? (
          <div className="booking-card">
            <div className="booking-card-header">
              <div className="card-title" style={{ marginBottom: 0 }}>📋 Active Booking</div>
              <div className="booking-token">{lastBooking.tokenId}</div>
            </div>
            <div style={{ height: '1px', background: 'var(--gray-100)', margin: '12px 0' }}></div>
            <div className="booking-detail-grid">
              <div className="booking-detail-item">
                <div className="booking-detail-label">Mandi Centre</div>
                <div className="booking-detail-value">{lastBooking.centre}</div>
              </div>
              <div className="booking-detail-item">
                <div className="booking-detail-label">Crop Type</div>
                <div className="booking-detail-value">🌾 {lastBooking.crop}</div>
              </div>
              <div className="booking-detail-item">
                <div className="booking-detail-label">Quantity</div>
                <div className="booking-detail-value">{lastBooking.quantity} Quintals</div>
              </div>
              <div className="booking-detail-item">
                <div className="booking-detail-label">Time Slot</div>
                <div className="booking-detail-value">{lastBooking.slot}</div>
              </div>
            </div>
            <Link to="/farmer/queue" className="btn btn-outline" style={{ marginTop: '14px', width: '100%', justifyContent: 'center' }}>
              Track live queue →
            </Link>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '14px' }}>
              You don't have an active booking yet.
            </div>
            <Link to="/farmer/booking" className="btn btn-primary">Book your slot</Link>
          </div>
        )}

        {/* Mandi Centre Status */}
        <div className="card">
          <div className="card-title">🏛️ Mandi Centre Status</div>

          {centre && (
            <>
              <div className="progress-row">
                <div className="progress-label">
                  <span>Yard Capacity</span>
                  <span style={{ fontWeight: 700, color: 'var(--orange-600)' }}>{centre.yardCapacityUsed}%</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill orange" style={{ width: `${centre.yardCapacityUsed}%` }}></div>
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className={`badge ${centre.trucksLiftingToday ? 'badge-green' : 'badge-red'}`}>
                  {centre.trucksLiftingToday ? '✓ Trucks Operational' : '✗ Trucks Halted'}
                </span>
                <span className={`badge ${centre.gunnyBagsAvailable ? 'badge-green' : 'badge-red'}`}>
                  {centre.gunnyBagsAvailable ? '✓ Bags Available' : '✗ Bags Low'}
                </span>
                <span className={`badge ${centre.status === 'OPEN' ? 'badge-green' : centre.status === 'RESTRICTED' ? 'badge-orange' : 'badge-red'}`}>
                  Centre {centre.status}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {loading && <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>Loading live data…</p>}
    </div>
  );
}

export default Dashboard;
