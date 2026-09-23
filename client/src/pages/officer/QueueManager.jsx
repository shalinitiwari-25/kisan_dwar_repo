import { useCallback, useEffect, useState } from 'react';
import { getAllCentres, getBookingsByCentre, updateBookingStatus } from '../../services/api';
import { getUser } from '../../utils/auth';

const statusColors = {
  booked:    'badge-gray',
  arrived:   'badge-orange',
  processed: 'badge-green',
  'no-show': 'badge-red',
};

const statusLabels = {
  booked:    '📋 Booked',
  arrived:   '🟡 Arrived',
  processed: '✅ Processed',
  'no-show': '❌ No-Show',
};

function QueueManager() {
  const assignedCentres = getUser().assignedCentres || [];
  const [centreId, setCentreId] = useState(
    (assignedCentres.includes(localStorage.getItem('kd_officerCentre')) && localStorage.getItem('kd_officerCentre'))
      || assignedCentres[0]
      || ''
  );
  const [centres, setCentres] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingId, setLoadingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!centreId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([getAllCentres(), getBookingsByCentre(centreId)])
      .then(([centresRes, bookingsRes]) => {
        setCentres(centresRes.data.filter(c => assignedCentres.includes(c.centreId)));
        setBookings(bookingsRes.data.slice().sort((a, b) => a.tokenNo - b.tokenNo));
      })
      .catch(err => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreId]);

  useEffect(() => {
    if (centreId) localStorage.setItem('kd_officerCentre', centreId);
    load();
  }, [centreId, load]);

  if (assignedCentres.length === 0) {
    return (
      <div className="card" style={{ maxWidth: '520px' }}>
        <div className="card-title">🚫 No Centre Assigned</div>
        <p style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
          Your officer account hasn't been assigned to a centre yet. Ask your Government admin to
          assign you one before you can manage a queue.
        </p>
      </div>
    );
  }

  const handleAction = async (booking, newStatus) => {
    setLoadingId(booking._id + newStatus);
    try {
      await updateBookingStatus(booking._id, newStatus);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingId('');
    }
  };

  const centreName = centres.find(c => c.centreId === centreId)?.name || centreId;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div className="page-title">📋 Live Gate & Queue Management</div>
            <div className="page-subtitle">{centreName} · Token-by-token action board</div>
          </div>
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={centreId}
            onChange={(e) => setCentreId(e.target.value)}
          >
            {centres.map(c => (
              <option key={c.centreId} value={c.centreId}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Summary Row */}
      <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        {[
          { label: 'Booked',    val: bookings.filter(b => b.status === 'booked').length,    icon: '📋', color: 'gray'   },
          { label: 'Arrived',   val: bookings.filter(b => b.status === 'arrived').length,   icon: '🟡', color: 'orange' },
          { label: 'Processed', val: bookings.filter(b => b.status === 'processed').length, icon: '✅', color: 'green'  },
          { label: 'No-Show',   val: bookings.filter(b => b.status === 'no-show').length,   icon: '❌', color: 'red'    },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`} style={{ padding: '14px 18px' }}>
            <div className="stat-card-label">{s.icon} {s.label}</div>
            <div className="stat-card-value" style={{ fontSize: '28px' }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">🚦 Queue Action Board</div>
        {bookings.length === 0 ? (
          <p style={{ color: 'var(--gray-400)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>
            No bookings yet for this centre.
          </p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Token ID</th>
                  <th>Farmer Name</th>
                  <th>Crop & Qty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b._id}>
                    <td style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: 'var(--green-700)', fontSize: '14px' }}>
                      KD-{String(b.tokenNo).padStart(5, '0')}
                    </td>
                    <td style={{ fontWeight: 500 }}>{b.farmerName}</td>
                    <td style={{ color: 'var(--gray-500)' }}>
                      {b.crop} <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>• {b.quantity} Qtl</span>
                    </td>
                    <td>
                      <span className={`badge ${statusColors[b.status]}`}>
                        {statusLabels[b.status]}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {b.status === 'booked' && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleAction(b, 'arrived')}
                            disabled={loadingId === b._id + 'arrived'}
                          >
                            📲 Call Token
                          </button>
                        )}
                        {b.status === 'arrived' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAction(b, 'processed')}
                            disabled={loadingId === b._id + 'processed'}
                          >
                            ✅ Authorize Entry
                          </button>
                        )}
                        {(b.status === 'booked' || b.status === 'arrived') && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleAction(b, 'no-show')}
                            disabled={loadingId === b._id + 'no-show'}
                          >
                            ❌ No-Show
                          </button>
                        )}
                        {b.status === 'processed' && (
                          <span style={{ fontSize: '12px', color: 'var(--green-600)', fontWeight: 600 }}>
                            ✓ Complete
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {loading && <p style={{ fontSize: '13px', color: 'var(--gray-400)', marginTop: '10px' }}>Refreshing…</p>}
    </div>
  );
}

export default QueueManager;
