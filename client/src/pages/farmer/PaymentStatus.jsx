import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPayment, getPayment, updatePayment } from '../../services/api';

const MSP_RATE = { Wheat: 2275, Paddy: 2300, Mustard: 5650, Cotton: 7121, Sunflower: 6760 };

function getLastBooking() {
  try {
    return JSON.parse(localStorage.getItem('kd_lastBooking'));
  } catch {
    return null;
  }
}

function PaymentStatus() {
  const lastBooking = getLastBooking();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!lastBooking?.id) return;
    setLoading(true);
    getPayment(lastBooking.id)
      .then(res => setPayment(res.data))
      .catch(() => setPayment(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBooking?.id]);

  if (!lastBooking) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title">💳 Payment Status</div>
          <div className="page-subtitle">Track your MSP payment pipeline</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: 'var(--gray-500)', marginBottom: '16px' }}>No active booking to show payment for.</p>
          <Link to="/farmer/booking" className="btn btn-primary">Book a slot</Link>
        </div>
      </div>
    );
  }

  const rate = MSP_RATE[lastBooking.crop] || 2000;
  const amount = rate * Number(lastBooking.quantity || 0);

  const stage2 = payment?.weighment;
  const stage3 = payment?.qualityCheck;
  const stage4 = payment && payment.status !== 'pending';
  const stage5 = payment && (payment.status === 'processing' || payment.status === 'credited');
  const stage6 = payment?.status === 'credited';

  const advance = async () => {
    setBusy(true);
    setError('');
    try {
      if (!payment) {
        const res = await createPayment({ bookingId: lastBooking.id, amount });
        setPayment(res.data);
      } else if (!payment.weighment) {
        const res = await updatePayment(lastBooking.id, { weighment: true, qualityCheck: false, status: 'pending' });
        setPayment(res.data);
      } else if (!payment.qualityCheck) {
        const res = await updatePayment(lastBooking.id, { weighment: true, qualityCheck: true, status: 'pending' });
        setPayment(res.data);
      } else if (payment.status === 'pending') {
        const res = await updatePayment(lastBooking.id, { weighment: true, qualityCheck: true, status: 'processing' });
        setPayment(res.data);
      } else if (payment.status === 'processing') {
        const res = await updatePayment(lastBooking.id, { weighment: true, qualityCheck: true, status: 'credited' });
        setPayment(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const stages = [
    { icon: '🚛', title: 'Crop Arrived at Mandi', meta: payment ? 'Confirmed at gate' : 'Awaiting gate entry', done: !!payment },
    { icon: '⚖️', title: `Weighment Completed — ${lastBooking.quantity} Quintals`, meta: stage2 ? 'Weighed and logged' : 'Pending', done: !!stage2 },
    { icon: '🔬', title: 'Quality Check Passed', meta: stage3 ? 'Quality verified' : 'Pending', done: !!stage3 },
    { icon: '📄', title: 'J-Form Generated', meta: stage4 ? 'Form issued' : 'Pending', done: !!stage4 },
    { icon: '🏦', title: 'DBT Initiated — Processing at Bank', meta: stage5 ? 'With bank' : 'Pending', done: !!stage5, active: stage5 && !stage6 },
    { icon: '💰', title: 'Amount Credited to Account', meta: stage6 ? 'Credited' : 'Pending — Expected within 72 hours', done: !!stage6 },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">💳 Payment Status</div>
        <div className="page-subtitle">Track your MSP payment pipeline — Token {lastBooking.tokenId}</div>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Payment Summary */}
      <div className="payment-summary-box">
        <div className="payment-amount-label">TOTAL PAYMENT AMOUNT</div>
        <div className="payment-amount">₹{amount.toLocaleString('en-IN')}</div>
        <div className="payment-detail-row">
          <div className="payment-detail-item">🌾 <strong>{lastBooking.crop}</strong> • {lastBooking.quantity} Quintals</div>
          <div className="payment-detail-item">MSP: <strong>₹{rate.toLocaleString('en-IN')}/Qtl</strong></div>
          <div className="payment-detail-item">Status: <strong>{payment?.status ?? 'Not started'}</strong></div>
        </div>

        <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span className={`badge ${stage6 ? 'badge-green' : stage5 ? 'badge-orange' : 'badge-gray'}`}>
            <span className="badge-dot"></span>
            {stage6 ? 'Credited' : stage5 ? 'DBT Processing' : 'Not started'}
          </span>
          {stage3 && <span className="badge badge-green">✓ Quality Checked</span>}
          {stage4 && <span className="badge badge-green">✓ J-Form Generated</span>}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Payment Timeline */}
        <div className="card">
          <div className="card-title">📊 Payment Pipeline</div>
          <div className="payment-timeline">
            {stages.map((stage, i) => (
              <div key={i} className="timeline-item" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className={`timeline-dot ${stage.done ? 'done' : stage.active ? 'active' : 'pending'}`}>
                  {stage.done ? '✓' : stage.active ? '⋯' : ''}
                </div>
                <div className={`timeline-content ${stage.done ? 'done' : ''}`}>
                  <div className="timeline-title">{stage.icon} {stage.title}</div>
                  <div className="timeline-meta">{stage.meta}</div>
                </div>
              </div>
            ))}
          </div>

          {!stage6 && (
            <button className="btn btn-outline w-full" onClick={advance} disabled={busy} style={{ marginTop: '10px' }}>
              {busy ? '⏳ Updating…' : '⚡ Simulate Next Stage (demo)'}
            </button>
          )}
        </div>

        <div>
          <div className="helpline-card">
            <div className="helpline-icon">📞</div>
            <div>
              <div className="helpline-label">Payment Delayed? Contact Food Dept Helpline</div>
              <div className="helpline-number">1800-180-2087</div>
              <div style={{ fontSize: '11px', color: 'var(--orange-500)', marginTop: '2px', fontWeight: 600 }}>
                Toll Free • 24×7 Available
              </div>
            </div>
          </div>

          <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 16px', marginTop: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#b91c1c', marginBottom: '4px' }}>
              ⚠️ 72-Hour Payment Guarantee
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              As per RMS guidelines, payment must be credited within 72 hours of J-Form generation. If delayed, 9% annual interest applies automatically.
            </div>
          </div>
        </div>
      </div>

      {loading && <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>Loading payment status…</p>}
    </div>
  );
}

export default PaymentStatus;
