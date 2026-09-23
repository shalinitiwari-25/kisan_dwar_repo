import { useState } from 'react';
import QRModal from '../../components/QRModal';
import { createBooking, getCentre, updateBookingStatus } from '../../services/api';
import { getUser } from '../../utils/auth';
import { getDistance } from '../../utils/distanceTable';

const CENTRE_MAP = {
  'C001': 'Karnal Mandi',
  'C002': 'Panipat Mandi',
  'C003': 'Kurukshetra Mandi',
};

const slots = [
  { label: '7 AM – 9 AM',  tag: 'Full', status: 'full' },
  { label: '9 AM – 11 AM', tag: '',     status: 'open' },
  { label: '11 AM – 1 PM', tag: '',     status: 'open' },
  { label: '1 PM – 3 PM',  tag: '',     status: 'open' },
  { label: '3 PM – 5 PM',  tag: '',     status: 'open' },
];

function Booking() {
  const currentUser = getUser();

  const [form, setForm] = useState({
    crop: '',
    quantity: '',
    aadhaar: currentUser.aadhaar || '',
    centreId: 'C001',
    date: '',
  });
  const [selectedSlot, setSelectedSlot] = useState(1); // default first open slot
  const [aadhaarVerified, setAadhaarVerified] = useState(!!currentUser.aadhaar);
  const [loading, setLoading] = useState(false);
  const [centreStatus, setCentreStatus] = useState('OPEN');
  const [error, setError] = useState('');
  const [suggestedCentre, setSuggestedCentre] = useState(null);
  const [existingBooking, setExistingBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [booking, setBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'centreId') {
      setError('');
      setSuggestedCentre(null);
      checkCentreStatus(value);
    }
  };

  const checkCentreStatus = async (centreId) => {
    try {
      const res = await getCentre(centreId);
      setCentreStatus(res.data.status);
    } catch {
      setCentreStatus('OPEN');
    }
  };

  const verifyAadhaar = () => {
    if (form.aadhaar.length >= 12) {
      setAadhaarVerified(true);
    }
  };

  const switchToSuggested = () => {
    if (!suggestedCentre) return;
    setForm(prev => ({ ...prev, centreId: suggestedCentre.centreId }));
    setCentreStatus(suggestedCentre.status);
    setSuggestedCentre(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuggestedCentre(null);
    setExistingBooking(null);

    if (!form.crop || !form.quantity || !form.centreId || !form.date) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!aadhaarVerified) {
      setError('Please verify your Aadhaar number first.');
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
        aadhaar: form.aadhaar,
        crop: form.crop,
        quantity: parseInt(form.quantity),
        centreId: form.centreId,
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
      setSmsSent(true);  // show SMS confirmation banner
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

  // Demo/reset convenience: lets you free up your Aadhaar's one-active-
  // booking slot instantly, without needing to switch to the officer view
  // to process/no-show it manually.
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

  return (
    <div>
      <div className="page-header">
        <div className="page-title">📋 Book Procurement Slot</div>
        <div className="page-subtitle">Reserve your slot at the nearest Mandi procurement centre</div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Form */}
        <div className="card">
          <div className="card-title">📝 Booking Details</div>

          {error && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#b91c1c', fontSize: '14px', fontWeight: 500 }}>
              {error}
              {existingBooking && (
                <div style={{ marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleCancelExisting}
                    disabled={cancelling}
                    style={{ borderColor: '#b91c1c', color: '#b91c1c' }}
                  >
                    {cancelling ? 'Cancelling…' : `✕ Cancel Token #${existingBooking.tokenNo} & Book Again`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SMS confirmation banner */}
          {smsSent && currentUser.phone && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid var(--green-300)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: 'var(--green-700)', fontWeight: 500 }}>
              📱 Booking confirmation SMS sent to <strong>+91-{currentUser.phone.slice(0, 4)}XXXXX{currentUser.phone.slice(-1)}</strong>
            </div>
          )}

          {/* Farmer info strip */}
          {currentUser.name && (
            <div style={{ background: 'var(--gray-50)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--gray-600)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>👨‍🌾 <strong>{currentUser.name}</strong></span>
              {currentUser.aadhaar && <span>🪪 Aadhaar: XXXX XXXX {currentUser.aadhaar.slice(-4)}</span>}
            </div>
          )}

          {suggestedCentre && (
            <div style={{ background: '#f0fdf4', border: '1.5px solid var(--green-200)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green-700)', marginBottom: '4px' }}>
                🔄 Nearest open centre found
              </div>
              <div style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '6px' }}>
                {suggestedCentre.name} is open — {suggestedCentre.yardCapacityUsed}% yard capacity used.
              </div>
              {(() => {
                const dist = getDistance(currentUser.village, suggestedCentre.centreId);
                return dist !== null ? (
                  <div style={{ fontSize: '12px', color: 'var(--green-700)', fontWeight: 500, marginBottom: '10px' }}>
                    📍 ~{dist} km from your village
                  </div>
                ) : <div style={{ marginBottom: '10px' }} />;
              })()}
              <button type="button" className="btn btn-primary btn-sm" onClick={switchToSuggested}>
                Switch &amp; book here instead →
              </button>
            </div>
          )}

          {centreStatus === 'PAUSED' && !suggestedCentre && (
            <div style={{ background: '#fff1f2', border: '1.5px solid #fecaca', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>🚫</div>
              <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: '15px' }}>Centre is Currently FULL</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Bookings have been paused. Please select another centre.</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Crop Type <span className="required">*</span></label>
                <select name="crop" className="form-control" value={form.crop} onChange={handleChange} required>
                  <option value="">Select Crop</option>
                  <option>Wheat</option>
                  <option>Paddy</option>
                  <option>Mustard</option>
                  <option>Cotton</option>
                  <option>Sunflower</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Weight (Quintals) <span className="required">*</span></label>
                <input
                  type="number"
                  name="quantity"
                  className="form-control"
                  placeholder="e.g. 45"
                  min="1"
                  value={form.quantity}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Aadhaar Number <span className="required">*</span></label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  name="aadhaar"
                  className="form-control"
                  placeholder="XXXX XXXX XXXX"
                  maxLength="12"
                  value={form.aadhaar}
                  onChange={handleChange}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className={`btn ${aadhaarVerified ? 'btn-outline' : 'btn-primary'}`}
                  onClick={verifyAadhaar}
                  style={{ whiteSpace: 'nowrap', borderRadius: '10px' }}
                >
                  {aadhaarVerified ? '✅ Verified' : 'Verify'}
                </button>
              </div>
              {aadhaarVerified && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--green-600)', fontWeight: 500 }}>
                  ✓ Aadhaar verified successfully
                </div>
              )}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Procurement Centre <span className="required">*</span></label>
                <select name="centreId" className="form-control" value={form.centreId} onChange={handleChange}>
                  <option value="C001">Karnal Mandi</option>
                  <option value="C002">Panipat Mandi</option>
                  <option value="C003">Kurukshetra Mandi</option>
                </select>
                {(() => {
                  const dist = getDistance(currentUser.village, form.centreId);
                  return dist !== null ? (
                    <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--green-700)', fontWeight: 500 }}>
                      📍 ~{dist} km from your village ({currentUser.village})
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Date <span className="required">*</span></label>
                <input
                  type="date"
                  name="date"
                  className="form-control"
                  value={form.date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            {/* Time Slot Picker */}
            <div className="form-group">
              <label className="form-label">Select Time Slot</label>
              <div className="slot-grid">
                {slots.map((slot, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`slot-pill ${
                      slot.status === 'full' ? 'full' :
                      selectedSlot === i ? 'selected' : ''
                    }`}
                    onClick={() => slot.status !== 'full' && setSelectedSlot(i)}
                    disabled={slot.status === 'full'}
                  >
                    {slot.label}
                    {slot.tag && (
                      <div className="slot-tag">🔴 Full</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || centreStatus === 'PAUSED'}
            >
              {loading ? '⏳ Booking...' : '✓ Confirm Slot Booking'}
            </button>
          </form>
        </div>

        {/* Info Panel */}
        <div>
          <div className="card">
            <div className="card-title">ℹ️ Booking Guide</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { icon: '📋', text: 'Bring your Aadhaar card to the Mandi gate' },
                { icon: '🌾', text: 'Clean & dried crop will get higher MSP grade' },
                { icon: '🕐', text: 'Arrive 15 min before your slot time' },
                { icon: '📱', text: 'Show your token QR code at gate entry' },
                { icon: '🚛', text: 'Ensure your trolley is properly weighed before arrival' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  <span style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.4 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1.5px solid var(--orange-200)' }}>
            <div className="card-title">📊 MSP Rates 2024-25</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { crop: '🌾 Wheat',   rate: '₹2,275/Qtl' },
                { crop: '🌾 Paddy',   rate: '₹2,300/Qtl' },
                { crop: '🌻 Mustard', rate: '₹5,650/Qtl' },
                { crop: '🌱 Cotton',  rate: '₹7,121/Qtl' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: i < 3 ? '1px solid var(--orange-100)' : 'none' }}>
                  <span style={{ color: 'var(--gray-700)' }}>{item.crop}</span>
                  <span style={{ fontWeight: 700, color: 'var(--orange-700)' }}>{item.rate}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <QRModal booking={booking} onClose={() => setShowModal(false)} phone={currentUser.phone} />
      )}
    </div>
  );
}

export default Booking;
