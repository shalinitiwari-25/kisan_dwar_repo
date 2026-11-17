import { useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
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
      <EmptyState
        title="No payment to show yet"
        sub="Your payment appears here after you book a slot and your crop is weighed."
        to="/farmer/booking"
        label="Book a Slot"
      />
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

  // The old "J-Form generated" and "DBT initiated" steps always changed together,
  // so farmers now see them as one step: "Payment sent to bank" (5 steps in total).
  const stages = [
    { icon: 'truck',  title: 'Crop arrived at the Mandi', meta: payment ? 'Confirmed at the gate' : 'Waiting for gate entry', done: !!payment },
    { icon: 'scale',  title: `Crop weighed — ${lastBooking.quantity} quintals`, meta: stage2 ? 'Weight recorded' : 'Not yet', done: !!stage2 },
    { icon: 'flask',  title: 'Quality checked', meta: stage3 ? 'Quality passed' : 'Not yet', done: !!stage3 },
    { icon: 'bank',   title: 'Payment sent to your bank', meta: stage5 ? 'With the bank now' : 'Not yet', done: !!stage5 },
    { icon: 'rupee',  title: 'Money in your bank account', meta: stage6 ? 'Money credited' : stage5 ? 'On the way — within 72 hours' : 'Not yet', done: !!stage6, active: !!stage5 && !stage6 },
  ];
  const currentIdx = stages.findIndex((st) => !st.done);

  // One plain sentence answering "where is my money?"
  let headline, subline, tone;
  if (stage6) {
    headline = 'Money credited to your bank!'; subline = 'Please check your bank account.'; tone = 'green';
  } else if (stage5) {
    headline = 'Your payment is on its way to your bank'; subline = 'It should arrive within 72 hours.'; tone = 'yellow';
  } else if (payment) {
    headline = 'Your crop is being checked at the Mandi'; subline = 'Payment starts after the quality check.'; tone = 'yellow';
  } else {
    headline = 'Payment has not started yet'; subline = 'It starts after your crop is weighed at the Mandi.'; tone = 'gray';
  }

  return (
    <div className="pay">
      <div className="page-header">
        <div className="page-title"><Icon name="wallet" size={26} /> Payment</div>
        <div className="page-subtitle">Token <span data-no-translate>{lastBooking.tokenId}</span></div>
      </div>

      {error && <div className="wizard-error">{error}</div>}

      {/* Where is my money? */}
      <div className={`pay-answer pay-answer--${tone}`}>
        <div className="pay-answer-head" data-speak>{headline}</div>
        <div className="pay-answer-sub" data-speak>{subline}</div>
        <div className="pay-answer-amount-label">Amount you will receive</div>
        <div className="pay-answer-amount" data-no-translate data-speak>{`₹${amount.toLocaleString('en-IN')}`}</div>
        <div className="pay-answer-crop">
          <span data-no-translate>{lastBooking.crop}</span> · {lastBooking.quantity} quintals · MSP <span data-no-translate>₹{rate.toLocaleString('en-IN')}</span>/quintal
        </div>
      </div>

      {/* 5 steps */}
      <div className="card">
        <div className="card-title">Where is my payment?</div>
        <div className="pay-steps">
          {stages.map((st, i) => {
            const state = st.done ? 'done' : i === currentIdx ? 'current' : 'todo';
            return (
              <div key={i} className={`pay-step pay-step--${state}`}>
                <div className="pay-step-badge">
                  {st.done ? <Icon name="check" size={22} stroke={3} /> : <Icon name={st.icon} size={22} />}
                </div>
                <div className="pay-step-body">
                  <div className="pay-step-title">{st.title}</div>
                  <div className="pay-step-meta">
                    {state === 'current' ? <span className="pay-here">You are here</span> : null} {st.meta}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help */}
      <a className="pay-call" href="tel:18001802087">
        <span className="pay-call-icon"><Icon name="phone" size={28} /></span>
        <span>
          <span className="pay-call-label">Payment late? Call the helpline</span>
          <span className="pay-call-number" data-no-translate>1800-180-2087</span>
          <span className="pay-call-note">Toll free · 24×7</span>
        </span>
      </a>

      <div className="pay-guarantee">
        <div className="pay-guarantee-title">⚠️ 72-hour payment promise</div>
        <div>
          As per RMS guidelines, payment must be credited within 72 hours of J-Form generation. If delayed, 9% annual interest applies automatically.
        </div>
      </div>

      {/* Demo tools, out of the way */}
      {!stage6 && (
        <details className="pay-demo">
          <summary>Demo tools</summary>
          <button className="btn btn-outline w-full" onClick={advance} disabled={busy} style={{ marginTop: '10px' }}>
            {busy ? '⏳ Updating…' : '⚡ Simulate Next Stage (demo)'}
          </button>
        </details>
      )}

      {loading && <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>Loading payment status…</p>}
    </div>
  );
}

export default PaymentStatus;
