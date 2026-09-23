import { useEffect, useState } from 'react';
import { getOfficers, getAllCentres, reassignOfficerCentres } from '../../services/api';

const statusBadge = {
  active: 'badge-green',
  pending: 'badge-orange',
  rejected: 'badge-red',
};

function CentreStaffManagement() {
  const [officers, setOfficers] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([getOfficers(), getAllCentres()])
      .then(([officersRes, centresRes]) => {
        setOfficers(officersRes.data);
        setCentres(centresRes.data);
      })
      .catch(err => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const activeOfficers = officers.filter(o => o.role === 'officer' && o.status === 'active');

  const toggleCentre = async (officer, centreId) => {
    const current = officer.assignedCentres || [];
    const next = current.includes(centreId)
      ? current.filter(c => c !== centreId)
      : [...current, centreId];

    setSaving(officer._id);
    setError('');
    try {
      await reassignOfficerCentres(officer._id, next);
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving('');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">🏢 Centre & Staff Management</div>
        <div className="page-subtitle">Every Mandi centre, and exactly which officer(s) are authorized to control it.</div>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* Centre → officer overview */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        {centres.map(c => {
          const staff = activeOfficers.filter(o => (o.assignedCentres || []).includes(c.centreId));
          return (
            <div key={c.centreId} className="card">
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🏛️ {c.name}</span>
                <span className={`badge ${c.status === 'PAUSED' ? 'badge-red' : c.status === 'RESTRICTED' ? 'badge-orange' : 'badge-green'}`}>{c.status}</span>
              </div>
              {staff.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>⚠️ No officer currently assigned to this centre.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {staff.map(o => (
                    <div key={o._id} style={{ fontSize: '13px', color: 'var(--gray-700)' }}>👤 {o.name} · +91 {o.phone}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Officer roster with reassignable centres */}
      <div className="card">
        <div className="card-title">👥 Officer & Government Roster</div>
        {loading ? (
          <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>Loading…</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Name</th><th>Role</th><th>Status</th><th>Approved By</th><th>Assigned Centres</th></tr>
              </thead>
              <tbody>
                {officers.map(o => (
                  <tr key={o._id}>
                    <td style={{ fontWeight: 600 }}>{o.name}<br /><span style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 400 }}>+91 {o.phone}</span></td>
                    <td>{o.role === 'government' ? '📊 Govt' : '🏛️ Officer'}</td>
                    <td><span className={`badge ${statusBadge[o.status]}`}>{o.status}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{o.approvedBy || '—'}</td>
                    <td>
                      {o.role !== 'officer' ? (
                        <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>N/A</span>
                      ) : o.status !== 'active' ? (
                        <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>Approve first</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {centres.map(c => {
                            const checked = (o.assignedCentres || []).includes(c.centreId);
                            return (
                              <button
                                key={c.centreId}
                                type="button"
                                className={`badge ${checked ? 'badge-green' : 'badge-gray'}`}
                                style={{ border: 'none', cursor: 'pointer' }}
                                disabled={saving === o._id}
                                onClick={() => toggleCentre(o, c.centreId)}
                              >
                                {checked ? '✓ ' : ''}{c.centreId}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '10px' }}>
          Tap a centre badge to instantly grant/revoke that officer's control over it.
        </div>
      </div>
    </div>
  );
}

export default CentreStaffManagement;
