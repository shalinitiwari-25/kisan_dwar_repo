import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QueueTable from '../../components/QueueTable';
import { getBookingsByCentre, updateBookingStatus, confirmArrival } from '../../services/api';

function getLastBooking() {
  try {
    return JSON.parse(localStorage.getItem('kd_lastBooking'));
  } catch {
    return null;
  }
}

function QueueStatus() {
  const lastBooking = getLastBooking();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(!!lastBooking?.confirmed);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!lastBooking) return;
    setLoading(true);
    getBookingsByCentre(lastBooking.centreId)
      .then(res => setBookings(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBooking?.centreId]);

  useEffect(() => { load(); }, [load]);

  if (!lastBooking) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title">🔢 Live Queue Status</div>
          <div className="page-subtitle">Track your real-time position in the queue</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: 'var(--gray-500)', marginBottom: '16px' }}>You need an active booking to track a queue.</p>
          <Link to="/farmer/booking" className="btn btn-primary">Book a slot</Link>
        </div>
      </div>
    );
  }

  const sorted = bookings.slice().sort((a, b) => a.tokenNo - b.tokenNo);
  const waiting = sorted.filter(b => b.status === 'booked' || b.status === 'arrived');
  const myIndex = waiting.findIndex(b => b.tokenNo === lastBooking.tokenNo);
  const myPosition = myIndex >= 0 ? myIndex + 1 : null;
  const ahead = myPosition ? myPosition - 1 : 0;
  const waitMin = ahead * 7;

  const currentlyServing = sorted.find(b => b.status === 'arrived') || sorted.find(b => b.status === 'processed');

  const rows = sorted
    .filter(b => Math.abs(b.tokenNo - lastBooking.tokenNo) <= 2)
    .map((b, i) => ({
      position: waiting.findIndex(w => w._id === b._id) + 1 || i + 1,
      tokenId: `KD-${String(b.tokenNo).padStart(5, '0')}`,
      name: b.tokenNo === lastBooking.tokenNo ? `${b.farmerName} (You)` : b.farmerName,
      status: b.tokenNo === lastBooking.tokenNo ? 'You'
        : b.status === 'arrived' ? 'Processing'
        : b.status === 'processed' ? 'Arrived'
        : 'Waiting',
      isYou: b.tokenNo === lastBooking.tokenNo,
    }));

  const statusMsg = !myPosition
    ? '✅ Your token has already been processed at the gate.'
    : myPosition <= 3
      ? '🟢 You are almost next! Head to the Mandi gate now.'
      : myPosition <= 8
        ? '🟡 Get ready to depart soon.'
        : '🟡 Your turn is today. No action needed yet.';

  const simulateAdvance = async () => {
    const nextInLine = waiting.find(b => b.tokenNo !== lastBooking.tokenNo);
    if (!nextInLine) return;
    setAdvancing(true);
    try {
      await updateBookingStatus(nextInLine._id, 'processed');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdvancing(false);
    }
  };

  const handleConfirm = async () => {
    if (!lastBooking?.id || alreadyConfirmed) return;
    setConfirming(true);

    // Optimistic update — mark as confirmed in localStorage immediately
    // so the demo works even before the new server endpoint is deployed.
    const updated = { ...lastBooking, confirmed: true };
    localStorage.setItem('kd_lastBooking', JSON.stringify(updated));
    setAlreadyConfirmed(true);
    setConfirming(false);

    // Fire server call in the background (non-blocking)
    // Once the updated server is deployed this will also persist server-side.
    confirmArrival(lastBooking.id).catch(() => {
      // Server not yet deployed — silently ignore; local state is already updated.
    });
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">🔢 Live Queue Status</div>
        <div className="page-subtitle">Your real-time position at {lastBooking.centre}</div>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Queue Hero */}
      <div className="queue-hero">
        <div className="queue-label">Your Queue Position</div>
        <div className="queue-number">{myPosition ? `#${myPosition}` : '—'}</div>
        <div className="queue-meta">
          <div className="queue-meta-item">
            <div className="queue-meta-value">{ahead}</div>
            <div className="queue-meta-label">Ahead</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', height: '40px' }}></div>
          <div className="queue-meta-item">
            <div className="queue-meta-value">{waitMin}m</div>
            <div className="queue-meta-label">Est. Wait</div>
          </div>
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', height: '40px' }}></div>
          <div className="queue-meta-item">
            <div className="queue-meta-value">{lastBooking.tokenId}</div>
            <div className="queue-meta-label">Your Token</div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--green-50)', border: '1.5px solid var(--green-200)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, color: 'var(--green-800)' }}>
        {statusMsg}
      </div>

      {/* ── Arrival Confirmation Button ── */}
      {myPosition && myPosition <= 5 && (
        <div style={{
          background: alreadyConfirmed ? '#f0fdf4' : 'linear-gradient(135deg, #fff7ed, #ffedd5)',
          border: `1.5px solid ${alreadyConfirmed ? 'var(--green-300)' : 'var(--orange-200)'}`,
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: alreadyConfirmed ? 'var(--green-800)' : 'var(--orange-800)', marginBottom: '2px' }}>
              {alreadyConfirmed ? '✅ You\'ve confirmed your arrival!' : '🔔 Your slot is approaching!'}
            </div>
            <div style={{ fontSize: '13px', color: alreadyConfirmed ? 'var(--green-700)' : 'var(--gray-600)' }}>
              {alreadyConfirmed
                ? 'Safe travels — head to the Mandi gate now.'
                : `You are #${myPosition} in queue. Please confirm you are on your way.`}
            </div>
          </div>
          {!alreadyConfirmed && (
            <button
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={confirming}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {confirming ? '⏳ Confirming…' : '✅ I\'m On My Way'}
            </button>
          )}
          {alreadyConfirmed && (
            <span className="badge badge-green" style={{ flexShrink: 0 }}>
              <span className="badge-dot"></span>
              Confirmed
            </span>
          )}
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-title">🎯 Currently Serving</div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: '8px' }}>
              At Gate Right Now
            </div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '36px', fontWeight: 800, color: 'var(--green-700)' }}>
              {currentlyServing ? `KD-${String(currentlyServing.tokenNo).padStart(5, '0')}` : '—'}
            </div>
            <span className="badge badge-orange" style={{ marginTop: '10px' }}>
              <span className="badge-dot"></span>
              {currentlyServing ? currentlyServing.status : 'None'}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">⚡ Demo Controls</div>
          <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '16px' }}>
            Simulate queue advancement — this really marks the next farmer's token as processed on the server.
          </p>
          <button
            className="btn btn-primary w-full"
            onClick={simulateAdvance}
            disabled={advancing || waiting.length <= 1}
            style={{ marginBottom: '10px' }}
          >
            {advancing ? '⏳ Advancing...' : '▶ Simulate Queue Advance'}
          </button>
          <div style={{ fontSize: '12px', color: 'var(--gray-400)', textAlign: 'center' }}>
            Advances the farmer at the front of the line
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">👥 Queue Around You</div>
        {rows.length > 0 ? <QueueTable rows={rows} /> : <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>No other bookings nearby.</p>}
      </div>

      {loading && <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>Refreshing…</p>}
    </div>
  );
}

export default QueueStatus;
