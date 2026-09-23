import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import StatCard from '../../components/StatCard';
import { getCentre, getBookingsByCentre } from '../../services/api';
import { getUser } from '../../utils/auth';
import farmerHero from '../../assets/farmer-hero.png';
import { getDistance } from '../../utils/distanceTable';

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
  const user = getUser();
  const farmerName = user.name || 'Farmer';
  const lastBooking = getLastBooking();
  const [centre, setCentre] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProfile, setShowProfile] = useState(false);

  // Build QR value from saved booking (for gatekeeper scan)
  const qrValue = lastBooking ? JSON.stringify({
    tokenId: lastBooking.tokenId,
    bookingId: lastBooking.id,
    centreId: lastBooking.centreId,
    centre: lastBooking.centre,
    crop: lastBooking.crop,
    quantity: lastBooking.quantity,
    slot: lastBooking.slot,
    farmerName,
  }) : null;

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
      {/* Hero */}
      <div className="dashboard-hero">
        <img src={farmerHero} alt="Farmer in the field" className="dashboard-hero-img" />
        <div className="dashboard-hero-overlay"></div>
        <div className="dashboard-hero-content">
          <div>
            <div className="dashboard-hero-title">Namaste, {farmerName}!</div>
            <div className="dashboard-hero-subtitle">
              {centre ? centre.name : 'Loading…'}
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

      {/* Departure Guidance */}
      <div className="ai-card">
        <div className="ai-card-label">Smart Departure Guidance</div>
        {lastBooking ? (
          <>
            <div className="ai-card-time">{departLabel}</div>
            <div className="ai-card-sub">Best time to depart from home — gate wait is ~{Math.max(ahead * 3, 5)} mins right now</div>
            <div className="ai-card-pills">
              <div className="ai-pill">⏱️ Gate Wait ~{Math.max(ahead * 3, 5)} mins</div>
              <div className="ai-pill">📍 Queue Position #{queuePosition ?? '—'}</div>
              {(() => {
                const dist = getDistance(user.village, lastBooking.centreId);
                return dist !== null
                  ? <div className="ai-pill">🛣️ ~{dist} km to Mandi</div>
                  : <div className="ai-pill">🚛 Route Clear</div>;
              })()}
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
            {lastBooking.confirmed && (
              <div style={{ marginTop: '12px', background: '#f0fdf4', border: '1px solid var(--green-200)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontWeight: 600, color: 'var(--green-700)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ✅ You've confirmed your arrival — safe travels!
              </div>
            )}
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

      {/* ── My QR Token ─────────────────────────────────────────────────── */}
      {qrValue && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div className="card-title" style={{ marginBottom: 0 }}>📱 My Booking QR Token</div>
            <span className="badge badge-green"><span className="badge-dot"></span>Ready to show at gate</span>
          </div>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1.5px solid var(--gray-100)', display: 'inline-block' }}>
              <QRCodeSVG value={qrValue} size={140} level="M" />
            </div>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--green-700)', letterSpacing: '1px', marginBottom: '10px' }}>
                {lastBooking.tokenId}
              </div>
              {[
                ['Centre', lastBooking.centre],
                ['Crop', lastBooking.crop],
                ['Quantity', `${lastBooking.quantity} Quintals`],
                ['Slot', lastBooking.slot],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <span style={{ color: 'var(--gray-500)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{val}</span>
                </div>
              ))}
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                Show this QR at the Mandi gate for entry
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Kisan Pehchan Patra (Farmer ID Card) ────────────────────────── */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>🪪 Kisan Pehchan Patra</div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowProfile(p => !p)}
          >
            {showProfile ? '▲ Hide' : '▼ View ID'}
          </button>
        </div>

        {showProfile && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '2px solid var(--green-300)',
            borderRadius: '14px',
            padding: '20px',
          }}>
            {/* Header strip */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: 'var(--green-700)', textTransform: 'uppercase' }}>
                  Government of India – Kisan Pehchan Patra
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--green-900)', marginTop: '4px' }}>
                  {farmerName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--green-700)', marginTop: '2px' }}>Farmer / किसान</div>
              </div>
              <div style={{
                background: 'var(--green-700)', color: '#fff',
                borderRadius: '8px', padding: '6px 10px',
                fontSize: '11px', fontWeight: 700, textAlign: 'center',
              }}>
                KP-DEMO<br />2025
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                ['Farmer ID', 'KP-2025-HR-00429'],
                ['Aadhaar', user.aadhaar ? `XXXX XXXX ${user.aadhaar.slice(-4)}` : 'XXXX XXXX XXXX'],
                ['Phone', user.phone ? `+91-${user.phone.slice(0,4)}XXXXX${user.phone.slice(-1)}` : 'Not set'],
                ['State', user.state || 'Haryana'],
                ['Address', user.village && user.district
                  ? `${user.village}, ${user.district}, Haryana`
                  : user.address || 'Village Dhanora, Karnal, Haryana'],
                ['Bank A/C', user.bankAccount || '****4321 (Punjab National Bank)'],
              ].map(([label, val]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--green-700)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green-900)' }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--green-700)', borderTop: '1px solid var(--green-200)', paddingTop: '10px' }}>
              ✅ Verified Farmer · MSP Eligible · Kisan Dwar Portal
            </div>
          </div>
        )}
      </div>

      {loading && <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>Loading live data…</p>}
    </div>
  );
}

export default Dashboard;
