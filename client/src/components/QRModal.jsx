import { QRCodeSVG } from 'qrcode.react';

function QRModal({ booking, onClose }) {
  if (!booking) return null;

  // Encode the key ticket details into the QR code so gate staff can scan
  // it and instantly see the booking, without needing network access.
  const qrValue = JSON.stringify({
    tokenId: booking.tokenId,
    bookingId: booking.id,
    centreId: booking.centreId,
    centre: booking.centre,
    crop: booking.crop,
    quantity: booking.quantity,
    slot: booking.slot,
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-success-icon">🎉</div>
        <div className="modal-title">Slot Booked Successfully!</div>
        <div className="modal-subtitle">Your booking is confirmed at {booking.centre || 'your selected centre'}</div>

        <div className="token-box">
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: 'var(--green-600)', marginBottom: '6px', textTransform: 'uppercase' }}>
            Your Token ID
          </div>
          <div className="token-id">{booking.tokenId || 'KD-10294'}</div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
            <div style={{ background: '#fff', padding: '10px', borderRadius: '10px', display: 'inline-block' }}>
              <QRCodeSVG value={qrValue} size={150} level="M" />
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
            Show this QR code at the Mandi gate
          </div>
        </div>

        <div style={{ textAlign: 'left', background: 'var(--gray-50)', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Centre</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{booking.centre || 'Sirsa Mandi'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Crop</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{booking.crop || 'Wheat'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Quantity</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{booking.quantity || 45} Quintals</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Time Slot</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{booking.slot || '11 AM – 1 PM'}</span>
          </div>
        </div>

        <button className="btn btn-primary btn-lg" onClick={onClose}>
          ✓ Done
        </button>
      </div>
    </div>
  );
}

export default QRModal;
