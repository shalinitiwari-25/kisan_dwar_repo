import { useEffect, useState } from 'react';
import {
  getPendingOfficers, getAllCentres, approveOfficer, rejectOfficer, getAuditLog,
} from '../../services/api';

function OfficerApprovals() {
  const [pending, setPending] = useState([]);
  const [centres, setCentres] = useState([]);
  const [selected, setSelected] = useState({});     // { userId: [centreId, ...] }
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([getPendingOfficers(), getAllCentres(), getAuditLog()])
      .then(([pendingRes, centresRes, logsRes]) => {
        setPending(pendingRes.data);
        setCentres(centresRes.data);
        setLogs(logsRes.data);
      })
      .catch(err => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleCentre = (userId, centreId) => {
    setSelected(prev => {
      const current = prev[userId] || [];
      const next = current.includes(centreId)
        ? current.filter(c => c !== centreId)
        : [...current, centreId];
      return { ...prev, [userId]: next };
    });
  };

  const handleApprove = async (user) => {
    setError('');
    setNotice('');
    if (user.role === 'officer' && (!selected[user._id] || selected[user._id].length === 0)) {
      setError(`Select at least one centre for ${user.name} before approving.`);
      return;
    }
    setActingId(user._id + 'approve');
    try {
      const res = await approveOfficer(user._id, selected[user._id] || []);
      setNotice(res.data.message);
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setActingId('');
    }
  };

  const handleReject = async (user) => {
    setError('');
    setNotice('');
    const reason = window.prompt(`Reason for rejecting ${user.name}? (optional)`, '');
    if (reason === null) return; // cancelled
    setActingId(user._id + 'reject');
    try {
      const res = await rejectOfficer(user._id, reason);
      setNotice(res.data.message);
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setActingId('');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">✅ Officer & Government Approvals</div>
        <div className="page-subtitle">
          Nobody gets officer or government control powers by signing up alone — every account below is
          waiting on someone with an active government login to verify them and, for officers, assign a centre.
        </div>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {notice && (
        <div style={{ background: '#f0fdf4', border: '1px solid var(--green-200)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: 'var(--green-700)', fontSize: '13px' }}>
          {notice}
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-title">🕓 Pending Requests ({pending.length})</div>

        {loading ? (
          <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>Loading…</p>
        ) : pending.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--gray-400)', padding: '16px 0', textAlign: 'center' }}>
            No pending registrations right now.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {pending.map(user => (
              <div key={user._id} style={{ border: '1px solid var(--gray-100)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--gray-800)' }}>
                      {user.name}{' '}
                      <span className={`badge ${user.role === 'government' ? 'badge-gold' : 'badge-orange'}`} style={{ marginLeft: '6px' }}>
                        {user.role === 'government' ? '📊 Government' : '🏛️ Officer'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                      +91 {user.phone} · {user.village ? `${user.village}, ` : ''}{user.district || '—'}
                    </div>
                  </div>
                </div>

                {user.role === 'officer' && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '6px' }}>
                      Assign to centre(s) before approving:
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {centres.map(c => {
                        const isChecked = (selected[user._id] || []).includes(c.centreId);
                        return (
                          <button
                            key={c.centreId}
                            type="button"
                            className={`badge ${isChecked ? 'badge-green' : 'badge-gray'}`}
                            style={{ border: 'none', cursor: 'pointer' }}
                            onClick={() => toggleCentre(user._id, c.centreId)}
                          >
                            {isChecked ? '✓ ' : ''}{c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={actingId === user._id + 'approve'}
                    onClick={() => handleApprove(user)}
                  >
                    ✅ Approve
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={actingId === user._id + 'reject'}
                    onClick={() => handleReject(user)}
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">🧾 Recent Activity</div>
        {logs.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>No activity recorded yet.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Details</th></tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l._id}>
                    <td style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{new Date(l.createdAt).toLocaleString()}</td>
                    <td>{l.actorName} <span className="badge badge-gray" style={{ marginLeft: '4px' }}>{l.actorRole}</span></td>
                    <td style={{ fontSize: '12px', fontWeight: 600 }}>{l.action.replaceAll('_', ' ')}</td>
                    <td>{l.targetLabel}</td>
                    <td style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default OfficerApprovals;
