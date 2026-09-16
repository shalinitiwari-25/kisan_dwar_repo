import { useEffect, useState } from 'react';
import StatCard from '../../components/StatCard';
import { getAllCentres, updateCentreStatus, getBookingsByCentre } from '../../services/api';

function riskFromCapacity(pct) {
  if (pct >= 90) return { label: 'High', color: 'badge-red' };
  if (pct >= 70) return { label: 'Moderate', color: 'badge-orange' };
  return { label: 'Low', color: 'badge-green' };
}

function OfficerDashboard() {
  const [centreId, setCentreId] = useState(localStorage.getItem('kd_officerCentre') || 'C001');
  const [centres, setCentres] = useState([]);
  const [centre, setCentre] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([getAllCentres(), getBookingsByCentre(centreId)])
      .then(([centresRes, bookingsRes]) => {
        setCentres(centresRes.data);
        setCentre(centresRes.data.find(c => c.centreId === centreId) || null);
        setBookings(bookingsRes.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    localStorage.setItem('kd_officerCentre', centreId);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreId]);

  const save = async (updates) => {
    setSaving(true);
    setError('');
    try {
      const res = await updateCentreStatus(centreId, updates);
      setCentre(res.data);
      setCentres(prev => prev.map(c => c.centreId === centreId ? res.data : c));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = () => {
    const newStatus = centre?.status === 'PAUSED' ? 'OPEN' : 'PAUSED';
    save({ status: newStatus });
  };

  const adjustCapacity = (delta) => {
    if (!centre) return;
    const next = Math.max(0, Math.min(100, centre.yardCapacityUsed + delta));
    save({ yardCapacityUsed: next });
  };

  const processed = bookings.filter(b => b.status === 'processed').length;
  const activeQueue = bookings.filter(b => b.status === 'booked' || b.status === 'arrived').length;
  const noShows = bookings.filter(b => b.status === 'no-show').length;
  const risk = riskFromCapacity(centre?.yardCapacityUsed ?? 0);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div className="page-title">🏛️ Officer Control Center</div>
            <div className="page-subtitle">{centre ? centre.name : 'Loading…'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="form-control"
              style={{ width: 'auto' }}
              value={centreId}
              onChange={(e) => setCentreId(e.target.value)}
            >
              {(centres.length ? centres : [{ centreId: 'C001', name: 'Karnal Mandi' }, { centreId: 'C002', name: 'Panipat Mandi' }, { centreId: 'C003', name: 'Kurukshetra Mandi' }]).map(c => (
                <option key={c.centreId} value={c.centreId}>{c.name}</option>
              ))}
            </select>
            <span className={`badge ${risk.color}`} style={{ fontSize: '13px', padding: '6px 16px' }}>
              {risk.label} Congestion Risk
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Stats — computed from real bookings for this centre */}
      <div className="stat-cards-grid">
        <StatCard label="Today's Bookings"   value={bookings.length}  sub="This centre"          icon="📋" color="green" />
        <StatCard label="Processed"          value={processed}        sub={`of ${bookings.length} bookings`} icon="🚛" color="green" />
        <StatCard label="Active Queue"       value={activeQueue}      sub="Booked + arrived"     icon="🔢" color="orange" />
        <StatCard label="No-Shows"           value={noShows}          sub="Missed slots"         icon="❌" color="gold"   />
      </div>

      {/* Centre Status Hero */}
      {centre && (
        <div className={`status-hero ${centre.status === 'PAUSED' ? 'paused' : 'open'}`}>
          <div className="status-emoji">
            {centre.status === 'PAUSED' ? '🚫' : '✅'}
          </div>
          <div className={`status-text ${centre.status === 'PAUSED' ? 'paused' : 'open'}`}>
            Centre is {centre.status === 'PAUSED' ? 'PAUSED — Bookings Halted' : `${centre.status} — Accepting Bookings`}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '20px' }}>
            {centre.status === 'PAUSED'
              ? 'New farmer bookings are rejected and auto-routed to the nearest open centre.'
              : 'Farmers can book slots. Click below to pause intake when yard is full.'}
          </div>
          <button
            className={`btn ${centre.status === 'PAUSED' ? 'btn-primary' : 'btn-danger'}`}
            onClick={handleStatusToggle}
            disabled={saving}
            style={{ fontSize: '15px', padding: '12px 32px' }}
          >
            {saving ? '⏳ Updating...' :
              centre.status === 'PAUSED' ? '✅ Resume Intake — Open Centre' : '🚫 Simulate Centre Full — Pause Intake'}
          </button>
        </div>
      )}

      <div className="grid-2">
        {/* Yard Capacity Controls */}
        {centre && (
          <div className="capacity-panel">
            <div className="capacity-header">
              <div className="card-title" style={{ marginBottom: 0 }}>🏗️ Yard Capacity Override</div>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '20px', color: centre.yardCapacityUsed >= 85 ? 'var(--orange-600)' : 'var(--green-700)' }}>
                {centre.yardCapacityUsed}%
              </span>
            </div>

            <div style={{ margin: '16px 0' }}>
              <div className="progress-label">
                <span>Yard Fill Level</span>
                <span style={{ fontWeight: 700, color: centre.yardCapacityUsed >= 85 ? 'var(--orange-600)' : 'var(--green-700)' }}>{centre.yardCapacityUsed}%</span>
              </div>
              <div className="progress-bar-track">
                <div
                  className={`progress-bar-fill ${centre.yardCapacityUsed >= 85 ? 'orange' : ''} ${centre.yardCapacityUsed >= 95 ? 'danger' : ''}`}
                  style={{ width: `${centre.yardCapacityUsed}%` }}
                ></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} disabled={saving} onClick={() => adjustCapacity(5)}>
                ➕ +5%
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} disabled={saving} onClick={() => adjustCapacity(-5)}>
                ➖ −5%
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className={`badge ${centre.trucksLiftingToday ? 'badge-green' : 'badge-gray'}`}
                style={{ border: 'none', cursor: 'pointer' }}
                disabled={saving}
                onClick={() => save({ trucksLiftingToday: !centre.trucksLiftingToday })}
              >
                {centre.trucksLiftingToday ? '✓ Trucks Lifting' : '✗ Trucks Halted'}
              </button>
              <button
                className={`badge ${centre.gunnyBagsAvailable ? 'badge-green' : 'badge-gray'}`}
                style={{ border: 'none', cursor: 'pointer' }}
                disabled={saving}
                onClick={() => save({ gunnyBagsAvailable: !centre.gunnyBagsAvailable })}
              >
                {centre.gunnyBagsAvailable ? '✓ Bags Available' : '✗ Bags Low'}
              </button>
              <span className={`badge ${risk.color}`}>{risk.label} Risk</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '8px' }}>
              Tap the badges to toggle — these update instantly on the farmer's app.
            </div>
          </div>
        )}

        {/* Live booking breakdown for this centre */}
        <div className="capacity-panel">
          <div className="card-title">📊 Today's Summary — {centre?.name}</div>
          {[
            { label: 'Total Bookings', value: bookings.length, icon: '📋' },
            { label: 'Processed',      value: processed,        icon: '✅' },
            { label: 'Waiting/Arrived',value: activeQueue,      icon: '⏱️' },
            { label: 'No-Shows',       value: noShows,          icon: '❌' },
            { label: 'Yard Capacity',  value: `${centre?.yardCapacityUsed ?? '—'}%`, icon: '🏗️' },
            { label: 'Centre Status',  value: centre?.status ?? '—', icon: '🚦' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < 5 ? '1px solid var(--gray-100)' : 'none' }}>
              <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>{item.icon} {item.label}</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-800)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {loading && <p style={{ fontSize: '13px', color: 'var(--gray-400)', marginTop: '10px' }}>Loading…</p>}
    </div>
  );
}

export default OfficerDashboard;
