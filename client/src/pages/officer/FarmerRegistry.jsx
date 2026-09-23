import { useEffect, useState } from 'react';
import { searchFarmers, verifyFarmerKpp } from '../../services/api';

function FarmerRegistry() {
  const [query, setQuery] = useState('');
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState('');
  const [error, setError] = useState('');

  const load = (q = query) => {
    setLoading(true);
    searchFarmers(q)
      .then(res => setFarmers(res.data))
      .catch(err => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    load(query);
  };

  const toggleVerified = async (farmer) => {
    setActingId(farmer._id);
    setError('');
    try {
      await verifyFarmerKpp(farmer._id, !farmer.kppVerified);
      load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setActingId('');
    }
  };

  const verifiedCount = farmers.filter(f => f.kppVerified).length;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">🪪 Farmer Registry — Kisan Pehchan Patra</div>
        <div className="page-subtitle">Look up any farmer by Aadhaar or name and confirm whether their Farmer ID (KPP) is verified.</div>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSearch} className="card" style={{ maxWidth: '600px', marginBottom: '20px' }}>
        <div className="card-title">🔍 Search Farmers</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or Aadhaar number"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </div>
      </form>

      <div className="stat-cards-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '20px', maxWidth: '500px' }}>
        <div className="stat-card green"><div className="stat-card-label">✅ KPP Verified</div><div className="stat-card-value">{verifiedCount}</div></div>
        <div className="stat-card orange"><div className="stat-card-label">⏳ Unverified</div><div className="stat-card-value">{farmers.length - verifiedCount}</div></div>
      </div>

      <div className="card">
        <div className="card-title">📋 Results ({farmers.length})</div>
        {loading ? (
          <p style={{ fontSize: '13px', color: 'var(--gray-400)' }}>Loading…</p>
        ) : farmers.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--gray-400)', padding: '16px 0', textAlign: 'center' }}>
            No farmers match that search.
          </p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Name</th><th>Aadhaar</th><th>Village / District</th><th>KPP Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {farmers.map(f => (
                  <tr key={f._id}>
                    <td style={{ fontWeight: 600 }}>{f.name}<br /><span style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 400 }}>+91 {f.phone}</span></td>
                    <td style={{ fontFamily: 'Outfit, sans-serif' }}>{f.aadhaar}</td>
                    <td>{f.village || '—'}{f.district ? `, ${f.district}` : ''}</td>
                    <td>
                      <span className={`badge ${f.kppVerified ? 'badge-green' : 'badge-orange'}`}>
                        {f.kppVerified ? '✅ Verified' : '⏳ Unverified'}
                      </span>
                      {f.kppVerified && f.kppVerifiedBy && (
                        <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '3px' }}>by {f.kppVerifiedBy}</div>
                      )}
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${f.kppVerified ? 'btn-outline' : 'btn-primary'}`}
                        disabled={actingId === f._id}
                        onClick={() => toggleVerified(f)}
                      >
                        {f.kppVerified ? 'Mark Unverified' : '✅ Verify KPP'}
                      </button>
                    </td>
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

export default FarmerRegistry;
