import { useEffect, useState } from 'react';
import { getAllCentres, getBookingsByCentre, updateBookingStatus } from '../../services/api';

function CapacityControl() {
  const [centreId, setCentreId] = useState(localStorage.getItem('kd_officerCentre') || 'C001');
  const [centres, setCentres] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [token, setToken] = useState('');
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [acting, setActing] = useState(false);

  const load = () => {
    Promise.all([getAllCentres(), getBookingsByCentre(centreId)])
      .then(([centresRes, bookingsRes]) => {
        setCentres(centresRes.data);
        setBookings(bookingsRes.data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    localStorage.setItem('kd_officerCentre', centreId);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreId]);

  const handleSearch = () => {
    const digits = token.trim().replace(/\D/g, '');
    const tokenNo = parseInt(digits, 10);
    const found = bookings.find(b => b.tokenNo === tokenNo);
    setResult(found || { valid: false, tokenId: token.trim() });
    setSearched(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const act = async (newStatus) => {
    if (!result || !result._id) return;
    setActing(true);
    try {
      await updateBookingStatus(result._id, newStatus);
      load();
      setResult({ ...result, status: newStatus });
    } catch {
      // keep local UI state even if the network hiccups
    } finally {
      setActing(false);
    }
  };

  const centreName = centres.find(c => c.centreId === centreId)?.name || centreId;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div className="page-title">🔍 QR Gate Verification</div>
            <div className="page-subtitle">{centreName} · Scan or enter token ID to verify farmer gate entry</div>
          </div>
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={centreId}
            onChange={(e) => { setCentreId(e.target.value); setResult(null); setSearched(false); }}
          >
            {(centres.length ? centres : [{ centreId: 'C001', name: 'Karnal Mandi' }, { centreId: 'C002', name: 'Panipat Mandi' }, { centreId: 'C003', name: 'Kurukshetra Mandi' }]).map(c => (
              <option key={c.centreId} value={c.centreId}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Scanner */}
      <div className="card" style={{ maxWidth: '600px', marginBottom: '24px' }}>
        <div className="card-title">🔍 Token Scanner</div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Enter Token ID (e.g. KD-00001)"
            value={token}
            onChange={e => { setToken(e.target.value); setSearched(false); setResult(null); }}
            onKeyDown={handleKeyDown}
            style={{ fontSize: '16px', letterSpacing: '1px' }}
          />
          <button className="btn btn-primary" onClick={handleSearch} style={{ borderRadius: '10px' }}>
            🔍 Verify
          </button>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
          Looks up live tokens booked at {centreName} today.
        </div>
      </div>

      {/* Result */}
      {searched && result && (
        <div style={{ maxWidth: '600px' }}>
          {result._id ? (
            <div className="verify-card">
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div className="verify-badge-valid">✅ VALID TOKEN — KD-{String(result.tokenNo).padStart(5, '0')}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Farmer Name', value: result.farmerName },
                  { label: 'Crop Type',   value: result.crop },
                  { label: 'Quantity',    value: `${result.quantity} Quintals` },
                  { label: 'Aadhaar',     value: result.aadhaar },
                  { label: 'Status',      value: result.status.toUpperCase() },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--gray-400)', marginBottom: '3px' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-800)' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} disabled={acting || result.status !== 'booked'} onClick={() => act('arrived')}>
                  ✅ Allow Gate Entry
                </button>
                <button className="btn btn-danger" style={{ flex: 1 }} disabled={acting || result.status === 'processed'} onClick={() => act('no-show')}>
                  🚫 Deny Entry
                </button>
              </div>
            </div>
          ) : (
            <div className="verify-card" style={{ borderColor: '#fecaca' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="verify-badge-invalid">❌ INVALID TOKEN — {result.tokenId}</div>
                <p style={{ fontSize: '14px', color: 'var(--gray-500)', marginBottom: '16px' }}>
                  This token was not found for {centreName}. Check the token number or select the correct centre.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="card" style={{ maxWidth: '600px', marginTop: '20px' }}>
        <div className="card-title">⚡ Quick Verify — Today's Active Tokens</div>
        {bookings.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>No tokens booked at this centre yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bookings.slice(0, 6).map(b => (
              <button
                key={b._id}
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start', borderRadius: '10px', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}
                onClick={() => { setToken(`KD-${String(b.tokenNo).padStart(5, '0')}`); setResult(b); setSearched(true); }}
              >
                🔍 KD-{String(b.tokenNo).padStart(5, '0')} — {b.farmerName}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CapacityControl;
