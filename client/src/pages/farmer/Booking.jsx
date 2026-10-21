import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QRModal from '../../components/QRModal';
import CropIcon from '../../components/CropIcon';
import { createBooking, getCentre, getAllCentres, updateBookingStatus } from '../../services/api';
import { getUser } from '../../utils/auth';
import { getDistance } from '../../utils/distanceTable';
import { useLanguage } from '../../context/LanguageContext';
import { VOICE_LANG } from '../../utils/speech';

const CENTRE_MAP = {
  'C001': 'Karnal Mandi',
  'C002': 'Panipat Mandi',
  'C003': 'Kurukshetra Mandi',
};

const slots = [
  { label: '7 AM – 9 AM',  status: 'full' },
  { label: '9 AM – 11 AM', status: 'open' },
  { label: '11 AM – 1 PM', status: 'open' },
  { label: '1 PM – 3 PM',  status: 'open' },
  { label: '3 PM – 5 PM',  status: 'open' },
];

// Values sent to the server stay English; names are shown in the farmer's own script.
const CROPS = ['Wheat', 'Paddy', 'Mustard', 'Cotton', 'Sunflower'];
const CROP_NAMES = {
  Wheat:     { en: 'Wheat',     hi: 'गेहूँ',     pa: 'ਕਣਕ',       or: 'ଗହମ',      bn: 'গম',      mr: 'गहू',      gu: 'ઘઉં' },
  Paddy:     { en: 'Paddy',     hi: 'धान',      pa: 'ਝੋਨਾ',      or: 'ଧାନ',      bn: 'ধান',     mr: 'धान',      gu: 'ડાંગર' },
  Mustard:   { en: 'Mustard',   hi: 'सरसों',    pa: 'ਸਰ੍ਹੋਂ',     or: 'ସୋରିଷ',    bn: 'সরিষা',   mr: 'मोहरी',    gu: 'રાઈ' },
  Cotton:    { en: 'Cotton',    hi: 'कपास',     pa: 'ਕਪਾਹ',      or: 'କପା',      bn: 'তুলা',    mr: 'कापूस',    gu: 'કપાસ' },
  Sunflower: { en: 'Sunflower', hi: 'सूरजमुखी', pa: 'ਸੂਰਜਮੁਖੀ',  or: 'ସୂର୍ଯ୍ୟମୁଖୀ', bn: 'সূর্যমুখী', mr: 'सूर्यफूल', gu: 'સૂર્યમુખી' },
};
// Same figures the old page showed (₹ per quintal). Update each season.
const MSP = { Wheat: 2275, Paddy: 2300, Mustard: 5650, Cotton: 7121 };

const STEPS = 5;
const QTY_CHIPS = [10, 20, 30, 50];

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const localISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function Booking() {
  const currentUser = getUser();
  const { lang } = useLanguage();
  const cropName = (c) => (CROP_NAMES[c] && (CROP_NAMES[c][lang] || CROP_NAMES[c].en)) || c;

  const [step, setStep] = useState(1);
  const [crop, setCrop] = useState('');
  const [qty, setQty] = useState(0);
  const [centreId, setCentreId] = useState('');
  const [dateISO, setDateISO] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [aadhaar, setAadhaar] = useState(currentUser.aadhaar || '');
  const [showOtherDate, setShowOtherDate] = useState(false);

  const [centres, setCentres] = useState(
    Object.entries(CENTRE_MAP).map(([id, name]) => ({ centreId: id, name, status: 'OPEN' }))
  );
  const [centreStatus, setCentreStatus] = useState('OPEN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestedCentre, setSuggestedCentre] = useState(null);
  const [existingBooking, setExistingBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [booking, setBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  // Load live centre status; pre-select the nearest OPEN centre to the farmer's village.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let list = centres;
      try {
        const res = await getAllCentres();
        if (Array.isArray(res.data) && res.data.length) list = res.data;
      } catch { /* keep the built-in list */ }
      if (cancelled) return;
      setCentres(list);
      const open = list.filter(c => c.status !== 'PAUSED');
      const withDist = open
        .map(c => ({ c, d: getDistance(currentUser.village, c.centreId) }))
        .filter(x => x.d !== null)
        .sort((a, b) => a.d - b.d);
      const pick = withDist[0]?.c || open[0] || list[0];
      if (pick) { setCentreId(pick.centreId); setCentreStatus(pick.status || 'OPEN'); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nearestOpenId = (() => {
    const open = centres.filter(c => c.status !== 'PAUSED')
      .map(c => ({ id: c.centreId, d: getDistance(currentUser.village, c.centreId) }))
      .filter(x => x.d !== null).sort((a, b) => a.d - b.d);
    return open[0]?.id || null;
  })();

  const chooseCentre = async (c) => {
    if (c.status === 'PAUSED') return;
    setCentreId(c.centreId);
    setError(''); setSuggestedCentre(null); setExistingBooking(null);
    try {
      const res = await getCentre(c.centreId);
      setCentreStatus(res.data.status);
    } catch { setCentreStatus(c.status || 'OPEN'); }
  };

  const switchToSuggested = () => {
    if (!suggestedCentre) return;
    setCentreId(suggestedCentre.centreId);
    setCentreStatus(suggestedCentre.status);
    setSuggestedCentre(null);
    setError('');
    setStep(5);
  };

  // ── quick dates, shown in the farmer's own language ──
  const dayOptions = [0, 1, 2].map((offset) => {
    const d = new Date(); d.setDate(d.getDate() + offset);
    let text;
    try {
      text = new Intl.DateTimeFormat(VOICE_LANG[lang] || 'en-IN', { weekday: 'long', day: 'numeric', month: 'short' }).format(d);
    } catch { text = d.toDateString(); }
    return { iso: localISO(d), text, label: ['Today', 'Tomorrow', 'Day after tomorrow'][offset] };
  });
  const dateText = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    try {
      return new Intl.DateTimeFormat(VOICE_LANG[lang] || 'en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d));
    } catch { return iso; }
  };

  const canNext =
    (step === 1 && !!crop) ||
    (step === 2 && qty > 0) ||
    (step === 3 && !!centreId && centreStatus !== 'PAUSED') ||
    (step === 4 && !!dateISO && selectedSlot !== null);

  const goNext = () => { if (canNext) { setError(''); setStep(s => Math.min(STEPS, s + 1)); } };
  const goBack = () => { setError(''); setStep(s => Math.max(1, s - 1)); };

  const handleSubmit = async () => {
    setError('');
    setSuggestedCentre(null);
    setExistingBooking(null);

    if (!crop || !qty || !centreId || !dateISO || selectedSlot === null) {
      setError('Please complete all the steps.');
      return;
    }
    if (String(aadhaar).length < 12) {
      setError('Please enter your 12-digit Aadhaar number.');
      return;
    }
    if (centreStatus === 'PAUSED') {
      setError('⚠️ This centre is currently full. Please choose another centre or try later.');
      return;
    }

    setLoading(true);
    try {
      const res = await createBooking({
        farmerName: currentUser.name || 'Farmer',
        aadhaar,
        crop,
        quantity: parseInt(qty, 10),
        centreId,
      });

      const created = res.data;
      const tokenId = `KD-${String(created.tokenNo).padStart(5, '0')}`;
      const bookingRecord = {
        id: created._id,
        tokenId,
        tokenNo: created.tokenNo,
        centreId: created.centreId,
        centre: CENTRE_MAP[created.centreId] || created.centreId,
        crop: created.crop,
        quantity: created.quantity,
        aadhaar: created.aadhaar,
        slot: slots[selectedSlot]?.label,
      };

      // Persist so Dashboard / Queue / Payment pages can find this booking
      localStorage.setItem('kd_lastBooking', JSON.stringify(bookingRecord));

      setBooking(bookingRecord);
      setSmsSent(true);
      setShowModal(true);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || '';

      if (err.response?.status === 400 && data?.centreStatus === 'PAUSED') {
        setError('⚠️ Centre is currently FULL. Bookings are paused.');
        setCentreStatus('PAUSED');
        setSuggestedCentre(data.suggestedCentre || null);
      } else if (err.response?.status === 409) {
        setError(`🚫 ${msg}`);
        setExistingBooking(data?.existingBooking || null);
      } else if (msg) {
        setError(msg);
      } else {
        setError('Could not reach the server. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Demo/reset convenience: frees the one-active-booking-per-Aadhaar slot
  const handleCancelExisting = async () => {
    if (!existingBooking?._id) return;
    setCancelling(true);
    try {
      await updateBookingStatus(existingBooking._id, 'cancelled');
      setError('');
      setExistingBooking(null);
    } catch {
      setError('Could not cancel the existing booking. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // ───────────────────────── Booked! ─────────────────────────
  if (booking && !showModal) {
    return (
      <div className="wizard">
        <div className="wizard-done">
          <div className="wizard-done-icon">✅</div>
          <div className="wizard-done-title" data-speak>Your slot is booked!</div>
          <div className="wizard-done-token" data-speak data-no-translate>{booking.tokenId}</div>
          <div className="wizard-done-sub" data-speak>Show your QR ticket at the Mandi gate.</div>

          {smsSent && currentUser.phone && (
            <div className="wizard-sms">
              📱 SMS sent to <strong data-no-translate>+91-{currentUser.phone.slice(0, 4)}XXXXX{currentUser.phone.slice(-1)}</strong>
            </div>
          )}

          <div className="wizard-summary">
            <SummaryRow icon={<CropIcon crop={booking.crop} size={34} />} label="Crop" value={cropName(booking.crop)} />
            <SummaryRow icon="⚖️" label="Weight" value={`${booking.quantity} Quintals`} />
            <SummaryRow icon="🏛️" label="Centre" value={booking.centre} />
            <SummaryRow icon="🕐" label="Time" value={booking.slot} />
          </div>

          <button type="button" className="farmer-big-btn" onClick={() => setShowModal(true)}>📱 Show my QR ticket</button>
          <Link to="/farmer" className="wizard-secondary-btn">🏠 Go to Home</Link>

          <div className="wizard-checklist">
            <div className="wizard-checklist-title" data-speak>Before you go</div>
            {[
              { icon: '🪪', text: 'Bring your Aadhaar card to the Mandi gate' },
              { icon: '🕐', text: 'Reach 15 minutes before your time' },
              { icon: '🌾', text: 'Bring clean, dry crop for a better price' },
              { icon: '📱', text: 'Show your QR ticket at the gate' },
            ].map((item) => (
              <div key={item.text} className="wizard-checklist-row" data-speak>
                <span>{item.icon}</span><span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const msp = MSP[crop];
  const selectedCentre = centres.find(c => c.centreId === centreId);

  return (
    <div className="wizard">
      {/* Progress */}
      <div className="wizard-progress" aria-label={`Step ${step} of ${STEPS}`}>
        <div className="wizard-progress-text">Step {step} of {STEPS}</div>
        <div className="wizard-progress-bar">
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={`wizard-seg${i < step ? ' on' : ''}`} />
          ))}
        </div>
      </div>

      {error && (
        <div className="wizard-error">
          {error}
          {existingBooking && (
            <div style={{ marginTop: '10px' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleCancelExisting} disabled={cancelling}
                style={{ borderColor: '#b91c1c', color: '#b91c1c' }}>
                {cancelling ? 'Cancelling…' : `✕ Cancel Token #${existingBooking.tokenNo} & Book Again`}
              </button>
            </div>
          )}
        </div>
      )}

      {suggestedCentre && (
        <div className="wizard-suggest">
          <div style={{ fontWeight: 800, color: 'var(--green-700)', marginBottom: '4px' }}>🔄 Nearest open centre found</div>
          <div style={{ fontSize: '15px', color: 'var(--gray-600)', marginBottom: '10px' }}>
            {suggestedCentre.name} is open — {suggestedCentre.yardCapacityUsed}% yard capacity used.
            {(() => {
              const dist = getDistance(currentUser.village, suggestedCentre.centreId);
              return dist !== null ? ` About ${dist} km from your village.` : '';
            })()}
          </div>
          <button type="button" className="farmer-big-btn" style={{ marginTop: 0 }} onClick={switchToSuggested}>
            Book here instead →
          </button>
        </div>
      )}

      {/* ───── Step 1: crop ───── */}
      {step === 1 && (
        <div className="wizard-step">
          <div className="wizard-q" data-speak>Which crop are you bringing?</div>
          <div className="crop-grid">
            {CROPS.map((c) => (
              <button key={c} type="button" className={`crop-tile${crop === c ? ' selected' : ''}`} onClick={() => setCrop(c)}>
                <CropIcon crop={c} />
                <span className="crop-tile-name" data-no-translate>{cropName(c)}</span>
                {crop === c && <span className="crop-tile-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ───── Step 2: weight ───── */}
      {step === 2 && (
        <div className="wizard-step">
          <div className="wizard-q" data-speak>How much crop do you have?</div>
          <div className="wizard-help" data-speak>Weight in quintals (1 quintal = 100 kg)</div>

          <div className="qty-stepper">
            <button type="button" className="qty-btn" onClick={() => setQty(q => Math.max(0, q - 5))} aria-label="Less">−</button>
            <input
              className="qty-input"
              inputMode="numeric"
              value={qty || ''}
              placeholder="0"
              onChange={(e) => setQty(Math.min(9999, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0))}
              aria-label="Quintals"
            />
            <button type="button" className="qty-btn" onClick={() => setQty(q => Math.min(9999, q + 5))} aria-label="More">+</button>
          </div>
          <div className="qty-unit" data-speak>Quintals</div>

          <div className="qty-chips">
            {QTY_CHIPS.map((n) => (
              <button key={n} type="button" className={`qty-chip${qty === n ? ' selected' : ''}`} onClick={() => setQty(n)}>{n}</button>
            ))}
          </div>

          {msp && qty > 0 && (
            <div className="msp-box">
              <div className="msp-box-label">Approx. value at MSP</div>
              <div className="msp-box-value" data-no-translate>{rupees(msp * qty)}</div>
              <div className="msp-box-note">
                <span data-no-translate>{rupees(msp)}</span> per quintal for <span data-no-translate>{cropName(crop)}</span> — final amount depends on weighing and quality check.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───── Step 3: centre ───── */}
      {step === 3 && (
        <div className="wizard-step">
          <div className="wizard-q" data-speak>Which Mandi will you go to?</div>
          <div className="centre-list">
            {centres.map((c) => {
              const full = c.status === 'PAUSED';
              const dist = getDistance(currentUser.village, c.centreId);
              const sel = centreId === c.centreId;
              return (
                <button key={c.centreId} type="button" disabled={full}
                  className={`centre-card${sel ? ' selected' : ''}${full ? ' full' : ''}`} onClick={() => chooseCentre(c)}>
                  <span className="centre-card-icon">🏛️</span>
                  <span className="centre-card-body">
                    <span className="centre-card-name" data-no-translate>{CENTRE_MAP[c.centreId] || c.name}</span>
                    <span className="centre-card-meta">
                      {dist !== null && <span>📍 ~{dist} km</span>}
                      {c.centreId === nearestOpenId && <span className="chip chip-green">Nearest</span>}
                      {full
                        ? <span className="chip chip-red">🔴 Full</span>
                        : <span className="chip chip-green">🟢 Open</span>}
                    </span>
                  </span>
                  {sel && <span className="crop-tile-check" style={{ position: 'static' }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ───── Step 4: day and time ───── */}
      {step === 4 && (
        <div className="wizard-step">
          <div className="wizard-q" data-speak>Which day and time?</div>

          <div className="wizard-sub">Day</div>
          <div className="day-grid">
            {dayOptions.map((d) => (
              <button key={d.iso} type="button" className={`day-btn${dateISO === d.iso ? ' selected' : ''}`} onClick={() => { setDateISO(d.iso); setShowOtherDate(false); }}>
                <span className="day-btn-label">{d.label}</span>
                <span className="day-btn-date" data-no-translate>{d.text}</span>
              </button>
            ))}
          </div>
          <button type="button" className="link-btn" onClick={() => setShowOtherDate(v => !v)}>📅 Another date</button>
          {showOtherDate && (
            <input type="date" className="form-control" style={{ marginTop: '8px', fontSize: '18px', minHeight: '52px' }}
              value={dateISO} min={localISO(new Date())} onChange={(e) => setDateISO(e.target.value)} />
          )}

          <div className="wizard-sub" style={{ marginTop: '18px' }}>Time</div>
          <div className="slot-big-grid">
            {slots.map((slot, i) => (
              <button key={slot.label} type="button" disabled={slot.status === 'full'}
                className={`slot-big${selectedSlot === i ? ' selected' : ''}${slot.status === 'full' ? ' full' : ''}`}
                onClick={() => setSelectedSlot(i)}>
                <span>{slot.label}</span>
                {slot.status === 'full' && <span className="chip chip-red">🔴 Full</span>}
                {selectedSlot === i && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ───── Step 5: check and confirm ───── */}
      {step === 5 && (
        <div className="wizard-step">
          <div className="wizard-q" data-speak>Please check and confirm</div>
          <div className="wizard-summary">
            <SummaryRow icon={<CropIcon crop={crop} size={34} />} label="Crop" value={cropName(crop)} onEdit={() => setStep(1)} raw />
            <SummaryRow icon="⚖️" label="Weight" value={`${qty} Quintals`} onEdit={() => setStep(2)} />
            <SummaryRow icon="🏛️" label="Mandi" value={CENTRE_MAP[centreId] || selectedCentre?.name || centreId} onEdit={() => setStep(3)} raw />
            <SummaryRow icon="📅" label="Day" value={dateText(dateISO)} onEdit={() => setStep(4)} raw />
            <SummaryRow icon="🕐" label="Time" value={slots[selectedSlot]?.label || ''} onEdit={() => setStep(4)} />
          </div>

          {!currentUser.aadhaar && (
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label">Aadhaar Number <span className="required">*</span></label>
              <input type="text" inputMode="numeric" className="form-control" placeholder="XXXX XXXX XXXX" maxLength="12"
                value={aadhaar} onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
                style={{ fontSize: '20px', minHeight: '54px' }} />
            </div>
          )}

          <button type="button" className="farmer-big-btn" onClick={handleSubmit} disabled={loading || centreStatus === 'PAUSED'}>
            {loading ? '⏳ Booking…' : '✓ Confirm Booking'}
          </button>
        </div>
      )}

      {/* Back / Next */}
      {step < STEPS && (
        <div className="wizard-nav">
          {step > 1 ? (
            <button type="button" className="wizard-back" onClick={goBack}>← Back</button>
          ) : <span />}
          <button type="button" className="wizard-next" onClick={goNext} disabled={!canNext}>Next →</button>
        </div>
      )}
      {step === STEPS && (
        <div className="wizard-nav" style={{ justifyContent: 'flex-start' }}>
          <button type="button" className="wizard-back" onClick={goBack}>← Back</button>
        </div>
      )}

      {showModal && (
        <QRModal booking={booking} onClose={() => setShowModal(false)} phone={currentUser.phone} />
      )}
    </div>
  );
}

function SummaryRow({ icon, label, value, onEdit, raw }) {
  return (
    <div className="summary-row">
      <span className="summary-icon">{icon}</span>
      <span className="summary-text">
        <span className="summary-label">{label}</span>
        <span className="summary-value" {...(raw ? { 'data-no-translate': true } : {})}>{value}</span>
      </span>
      {onEdit && <button type="button" className="summary-edit" onClick={onEdit}>✏️</button>}
    </div>
  );
}

export default Booking;
