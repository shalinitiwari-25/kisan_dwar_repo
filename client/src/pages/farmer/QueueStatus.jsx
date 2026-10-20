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
  const [showMore, setShowMore] = useState(false);

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

  const bannerTone = !myPosition || myPosition <= 3 ? 'green' : 'yellow';

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
    <div className="farmer-queue">
      <div className="page-header">
        <div className="page-title">🔢 Live Queue</div>
        <div className="page-subtitle">{lastBooking.centre}</div>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#b91c1c', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* What to do — icon + words + colour */}
      <div className={`queue-banner queue-banner--${bannerTone}`} data-speak>
        {statusMsg}
      </div>

      {/* Big token + position */}
      <div className="queue-hero queue-hero--big">
        <div className="queue-label">Your Token</div>
        <div className="queue-token-big" data-speak data-no-translate>{lastBooking.tokenId}</div>
        <div className="queue-pos-row">
          <div className="queue-pos-box" data-speak>
            <div className="queue-pos-value">{myPosition ? `#${myPosition}` : '—'}</div>
            <div className="queue-meta-label">Position</div>
          </div>
          <div className="queue-pos-box" data-speak>
            <div className="queue-pos-value">{ahead}</div>
            <div className="queue-meta-label">Ahead of you</div>
          </div>
          <div className="queue-pos-box" data-speak>
            <div className="queue-pos-value">{waitMin}<span className="queue-pos-unit"> min</span></div>
            <div className="queue-meta-label">Wait</div>
          </div>
        </div>
      </div>

      {/* ── Arrival Confirmation ── */}
      {myPosition && myPosition <= 5 && (
        <div className={`arrival-card${alreadyConfirmed ? ' arrival-card--done' : ''}`}>
          <div className="arrival-card-title" data-speak>
            {alreadyConfirmed ? '✅ You confirmed your arrival' : '🔔 Your turn is coming'}
          </div>
          <div className="arrival-card-sub" data-speak>
            {alreadyConfirmed
              ? 'Safe travels — go to the Mandi gate now.'
              : `You are number ${myPosition}. Tap the button when you are on your way.`}
          </div>
          {!alreadyConfirmed && (
            <button className="farmer-big-btn" onClick={handleConfirm} disabled={confirming}>
              {confirming ? '⏳ Please wait…' : '✅ I\'m On My Way'}
            </button>
          )}
        </div>
      )}

      <div className="card" style={{ textAlign: 'center' }}>
        <div className="card-title" style={{ justifyContent: 'center' }}>🎯 At the gate right now</div>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '34px', fontWeight: 800, color: 'var(--green-700)' }}>
          {currentlyServing ? `KD-${String(currentlyServing.tokenNo).padStart(5, '0')}` : '—'}
        </div>
        <span className="badge badge-orange" style={{ marginTop: '10px' }}>
          <span className="badge-dot"></span>
          {currentlyServing ? currentlyServing.status : 'None'}
        </span>
      </div>

      <button type="button" className="more-toggle" onClick={() => setShowMore(v => !v)}>
        {showMore ? '▲ Hide details' : '▼ More details'}
      </button>

      {showMore && (
        <div className="more-body">
          <div className="card">
            <div className="card-title">👥 Queue Around You</div>
            {rows.length > 0 ? <QueueTable rows={rows} /> : <p style={{ color: 'var(--gray-400)', fontSize: '14px' }}>No other bookings nearby.</p>}
          </div>

          <div className="card">
            <div className="card-title">⚡ Demo Controls</div>
            <p style={{ fontSize: '14px', color: 'var(--gray-500)', marginBottom: '16px' }}>
              Simulate queue advancement — this really marks the next farmer's token as processed on the server.
            </p>
            <button
              className="btn btn-primary w-full"
              onClick={simulateAdvance}
              disabled={advancing || waiting.length <= 1}
            >
              {advancing ? '⏳ Advancing...' : '▶ Simulate Queue Advance'}
            </button>
          </div>
        </div>
      )}

      {loading && <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>Refreshing…</p>}
    </div>
  );
}

export default QueueStatus;
