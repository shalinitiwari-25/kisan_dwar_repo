import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Icon from '../../components/Icon';
import StatCard from '../../components/StatCard';
import { getCentre, getBookingsByCentre, getNotifications } from '../../services/api';
import { getUser } from '../../utils/auth';
import farmerHero from '../../assets/farmer-hero.png';
import { getDistance } from '../../utils/distanceTable';

function getLastBooking() {
  try {
    return JSON.parse(localStorage.getItem('kd_lastBooking'));
  } catch {
    return null;
  }
}

const ALERT_META = {
  DELAY:    { icon: '⏳', tone: 'orange', label: 'Delay' },
  SHORTAGE: { icon: '⚠️', tone: 'orange', label: 'Shortage' },
  REBOOKED: { icon: '🔄', tone: 'red',    label: 'Booking Moved' },
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} day ago`;
}

function Dashboard() {
  const user = getUser();
  const farmerName = user.name || 'Farmer';

  const [lastBooking, setLastBooking] = useState(getLastBooking());
  const [centre, setCentre] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [rebookNotice, setRebookNotice] = useState(null);

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

  // ── Mandi Alerts: poll for new SMS-mirrored notifications, and detect
  //    if this booking got auto-cancelled + moved to a new centre/token ──
  useEffect(() => {
    if (!user.aadhaar) return;
    let cancelled = false;

    const poll = () => {
      getNotifications(user.aadhaar)
        .then(res => {
          if (cancelled) return;
          setNotifications(res.data);

          // If our active booking was just cancelled by an officer pausing
          // the centre, adopt the auto-assigned replacement booking.
          if (lastBooking?.id) {
            const rebook = res.data.find(
              n => n.type === 'REBOOKED' && n.meta?.oldBookingId === lastBooking.id && n.meta?.newBookingId
            );
            if (rebook) {
              const newRecord = {
                id: rebook.meta.newBookingId,
                tokenId: rebook.meta.newTokenId,
                tokenNo: rebook.meta.newTokenNo,
                centreId: rebook.meta.newCentreId,
                centre: rebook.meta.newCentreName,
                crop: lastBooking.crop,
                quantity: lastBooking.quantity,
                aadhaar: lastBooking.aadhaar,
                slot: lastBooking.slot,
              };
              localStorage.setItem('kd_lastBooking', JSON.stringify(newRecord));
              setRebookNotice({
                oldTokenId: rebook.meta.oldTokenId,
                newTokenId: rebook.meta.newTokenId,
                newCentreName: rebook.meta.newCentreName,
              });
              setLastBooking(newRecord);
            }
          }
        })
        .catch(() => {});
    };

    poll();
    const interval = setInterval(poll, 12000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.aadhaar, lastBooking?.id]);

  const ahead = queuePosition ? queuePosition - 1 : 0;
  const waitMin = ahead * 7;
  const departTime = new Date(Date.now() - waitMin * 60000 + 30 * 60000);
  const departLabel = departTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // ── "What should I do now?" — one clear answer for the top card ──
  const processed = !!lastBooking && !loading && !error && queuePosition === null;
  let status;
  if (!lastBooking) {
    status = { tone: 'gray', iconName: 'book', title: 'You have no booking yet', sub: 'Book a slot to get your token.', cta: { to: '/farmer/booking', label: 'Book a Slot' } };
  } else if (processed) {
    status = { tone: 'green', iconName: 'check', title: 'Your token is done', sub: 'Check when your payment will arrive.', cta: { to: '/farmer/payment', label: 'See Payment' } };
  } else if (queuePosition && queuePosition <= 3) {
    status = { tone: 'green', iconName: 'truck', title: 'Go to the Mandi gate now', sub: `You are number ${queuePosition} in the line.`, cta: { to: '/farmer/queue', label: 'Open Live Queue' } };
  } else if (queuePosition && queuePosition <= 8) {
    status = { tone: 'yellow', iconName: 'clock', title: 'Get ready to leave', sub: `You are number ${queuePosition} in the line.`, cta: { to: '/farmer/queue', label: 'Open Live Queue' } };
  } else {
    status = { tone: 'yellow', iconName: 'clock', title: 'Your turn is later today', sub: 'No action needed yet.', cta: { to: '/farmer/queue', label: 'Open Live Queue' } };
  }

  return (
    <div className="farmer-home">
      {/* Greeting */}
      <div className="dashboard-hero dashboard-hero--compact">
        <img src={farmerHero} alt="Farmer in the field" className="dashboard-hero-img" />
        <div className="dashboard-hero-overlay"></div>
        <div className="dashboard-hero-content">
          <div>
            <div className="dashboard-hero-title">Namaste, {farmerName}!</div>
            <div className="dashboard-hero-subtitle">
              {centre ? centre.name : 'Loading…'}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#b91c1c', fontSize: '14px' }}>
          Couldn't reach the server: {error}
        </div>
      )}

      {/* Auto-rebooking banner — shown once right after it happens */}
      {rebookNotice && (
        <div style={{ background: '#fff7ed', border: '1.5px solid var(--orange-300)', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '22px' }}>🔄</div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--orange-700)' }}>Your booking was moved</div>
            <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginTop: '2px' }}>
              Your Mandi centre stopped accepting crops today, so token {rebookNotice.oldTokenId} was cancelled and
              you were automatically given a new slot — token {rebookNotice.newTokenId} at {rebookNotice.newCentreName}.
              An SMS with the details has been sent to your phone.
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setRebookNotice(null)}>OK</button>
        </div>
      )}

      {/* ── 1. The one thing to do now ───────────────────────────── */}
      <div className={`farmer-status farmer-status--${status.tone}`}>
        <div className="farmer-status-top">
          <div className="farmer-status-icon"><Icon name={status.iconName} size={30} /></div>
          <div>
            <div className="farmer-status-title" data-speak>{status.title}</div>
            <div className="farmer-status-sub" data-speak>{status.sub}</div>
          </div>
        </div>

        {lastBooking && (
          <div className="farmer-status-token">
            <div className="farmer-status-token-label">Your Token</div>
            <div className="farmer-status-token-id" data-speak data-no-translate>{lastBooking.tokenId}</div>
            {queuePosition && (
              <div className="farmer-status-token-meta" data-speak>
                Position #{queuePosition} · {ahead} ahead · about {waitMin} min
              </div>
            )}
          </div>
        )}

        <Link to={status.cta.to} className="farmer-big-btn">{status.cta.label}</Link>
      </div>

      {/* Alerts from the Mandi (same messages sent by SMS) — latest 3 only */}
      {notifications.length > 0 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div className="card-title" style={{ marginBottom: 0 }}>📩 Mandi Alerts</div>
            <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>Also sent by SMS</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {notifications.slice(0, 3).map((n) => {
              const meta = ALERT_META[n.type] || { icon: '📩', tone: 'gray', label: n.type };
              return (
                <div
                  key={n._id}
                  style={{
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                    background: meta.tone === 'red' ? '#fff1f2' : '#fff7ed',
                    border: `1px solid ${meta.tone === 'red' ? '#fecaca' : 'var(--orange-200)'}`,
                    borderRadius: '10px', padding: '10px 14px',
                  }}
                >
                  <div style={{ fontSize: '20px' }}>{meta.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: meta.tone === 'red' ? '#b91c1c' : 'var(--orange-700)' }}>
                      {n.titleEn}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginTop: '2px' }}>{n.messageEn}</div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>{timeAgo(n.createdAt)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 2. Big tiles ─────────────────────────────────────────── */}
      <div className="home-tiles">
        <Link to="/farmer/booking" className="home-tile home-tile--green">
          <span className="home-tile-icon"><Icon name="book" size={46} /></span>
          <span className="home-tile-label">Book a Slot</span>
        </Link>
        <Link to="/farmer/queue" className="home-tile home-tile--blue">
          <span className="home-tile-icon"><Icon name="queue" size={46} /></span>
          <span className="home-tile-label">Queue Status</span>
        </Link>
        <Link to="/farmer/payment" className="home-tile home-tile--orange">
          <span className="home-tile-icon"><Icon name="wallet" size={46} /></span>
          <span className="home-tile-label">Payment Status</span>
        </Link>
        <button
          type="button"
          className="home-tile home-tile--purple"
          onClick={() => window.dispatchEvent(new Event('kd-open-chatbot'))}
        >
          <span className="home-tile-icon"><Icon name="chat" size={46} /></span>
          <span className="home-tile-label">Need Help?</span>
        </button>
      </div>

      {/* ── 3. When to leave home (only while waiting in the queue) ─ */}
      {lastBooking && queuePosition && (
        <div className="ai-card">
          <div className="ai-card-label" data-speak>When to leave home</div>
          <div className="ai-card-time" data-speak>{departLabel}</div>
          <div className="ai-card-sub">Best time to start from home</div>
          <div className="ai-card-pills">
            <div className="ai-pill">⏱️ Gate wait ~{Math.max(ahead * 3, 5)} min</div>
            {(() => {
              const dist = getDistance(user.village, lastBooking.centreId);
              return dist !== null
                ? <div className="ai-pill">🛣️ ~{dist} km to Mandi</div>
                : <div className="ai-pill">🚛 Route Clear</div>;
            })()}
          </div>
        </div>
      )}

      {/* ── 4. My QR Token (show at the gate) ────────────────────── */}
      {qrValue && (
        <div className="card">
          <div className="card-title">📱 My QR Ticket — show at the gate</div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', border: '1.5px solid var(--gray-100)', display: 'inline-block' }}>
              <QRCodeSVG value={qrValue} size={170} level="M" />
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div data-no-translate style={{ fontSize: '26px', fontWeight: 800, color: 'var(--green-700)', letterSpacing: '1px', marginBottom: '10px' }}>
                {lastBooking.tokenId}
              </div>
              {[
                ['Centre', lastBooking.centre],
                ['Crop', lastBooking.crop],
                ['Quantity', `${lastBooking.quantity} Quintals`],
                ['Slot', lastBooking.slot],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', padding: '6px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <span style={{ color: 'var(--gray-500)' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{val}</span>
                </div>
              ))}
              {lastBooking.confirmed && (
                <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: 600, color: 'var(--green-700)' }}>
                  ✅ You confirmed your arrival
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Everything else, tucked away ──────────────────────── */}
      <button type="button" className="more-toggle" onClick={() => setShowMore(v => !v)}>
        {showMore ? '▲ Hide details' : '▼ More details'}
      </button>

      {showMore && (
        <div className="more-body">
          <div className="stat-cards-grid">
            <StatCard label="Queue Position" value={queuePosition ? `#${queuePosition}` : '—'} sub={queuePosition ? `${ahead} farmers ahead` : 'No booking yet'} icon="🔢" color="green" />
            <StatCard label="Yard Capacity" value={centre ? `${centre.yardCapacityUsed}%` : '—'} sub={centre?.yardCapacityUsed >= 90 ? 'Nearly full' : 'Filling up'} icon="🏗️" color={centre?.yardCapacityUsed >= 90 ? 'orange' : 'green'} />
            <StatCard label="Est. Wait Time" value={queuePosition ? `${waitMin} min` : '—'} sub={queuePosition ? `~${(waitMin / 60).toFixed(1)} hours from now` : '—'} icon="⏳" color="gold" />
            <StatCard label="Booking Status" value={lastBooking ? '✓ Confirmed' : 'None'} sub={lastBooking ? 'Active booking' : 'Book a slot to start'} icon="📋" color={lastBooking ? 'green' : 'gray'} />
          </div>

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

      {/* ── Kisan Pehchan Patra (Farmer ID Card) ────────────────────────── */}
      <div className="card">
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

        </div>
      )}

      {loading && <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>Loading live data…</p>}
    </div>
  );
}

export default Dashboard;
