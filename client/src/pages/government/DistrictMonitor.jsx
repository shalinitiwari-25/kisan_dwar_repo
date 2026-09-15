import { useEffect, useState } from 'react';
import { getProcurement, getAllCentres } from '../../services/api';

const staticAlerts = [
  {
    type: 'warning',
    icon: '🌦️',
    title: 'Weather Advisory',
    desc: 'Light rain forecast tomorrow. Advise farmers to cover crop before transit.',
    time: 'Today',
  },
];

function DistrictMonitor() {
  const [districts, setDistricts] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getProcurement(), getAllCentres()])
      .then(([procRes, centresRes]) => {
        setDistricts(procRes.data);
        setCentres(centresRes.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const maxVal = Math.max(...districts.map(d => d.target), 1);

  const centreAlerts = centres.flatMap(c => {
    const items = [];
    if (!c.gunnyBagsAvailable) {
      items.push({ type: 'warning', icon: '🧺', title: 'Gunny Bag Low Stock Warning', desc: `${c.name} is out of gunny bags. Replenishment needed within 24 hours.`, time: 'Live' });
    }
    if (c.status === 'PAUSED' || c.yardCapacityUsed >= 95) {
      items.push({ type: 'danger', icon: '🚨', title: 'Overcrowding Alert', desc: `${c.name} at ${c.yardCapacityUsed}% yard capacity. Auto-paused farmer intake.`, time: 'Live' });
    }
    return items;
  });

  const alerts = [...centreAlerts, ...staticAlerts];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">🗺️ District Analytics & Monitor</div>
        <div className="page-subtitle">District-wise procurement performance · live from Kisan Dwar</div>
      </div>

      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px' }}>
          Couldn't reach the server: {error}
        </div>
      )}

      <div className="grid-2">
        {/* Bar Chart */}
        <div className="card">
          <div className="card-title">📊 District Procurement Chart</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px', marginBottom: '14px', fontSize: '12px', color: 'var(--gray-400)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '14px', height: '14px', background: 'var(--gray-200)', borderRadius: '3px', display: 'inline-block' }}></span>
              Target
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '14px', height: '14px', background: 'var(--green-500)', borderRadius: '3px', display: 'inline-block' }}></span>
              Achieved
            </span>
          </div>

          {districts.map((d, i) => {
            const achievedPct = Math.round((d.achieved / d.target) * 100);
            const targetPct = Math.round((d.target / maxVal) * 100);
            const isAlert = achievedPct < 60;
            const isMod = achievedPct >= 60 && achievedPct < 80;
            return (
              <div key={i} className="district-bar">
                <div className="district-name">{d.district}</div>
                <div className="bar-container">
                  <div className="bar-track">
                    <div className="bar-fill target" style={{ width: `${targetPct}%`, background: 'var(--gray-200)' }}></div>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(d.achieved / maxVal) * 100}%`,
                        background: isAlert ? 'linear-gradient(135deg, #ef4444, #f87171)' :
                                    isMod   ? 'var(--grad-orange)' : 'var(--grad-green)',
                      }}
                    ></div>
                  </div>
                  <div style={{ fontSize: '11px', color: isAlert ? '#b91c1c' : isMod ? 'var(--orange-600)' : 'var(--gray-400)' }}>
                    {d.achieved.toLocaleString()} / {d.target.toLocaleString()} MT ({achievedPct}%)
                  </div>
                </div>
                <div className="district-val">{achievedPct}%</div>
              </div>
            );
          })}
        </div>

        {/* Mandi Status Table */}
        <div className="card">
          <div className="card-title">🏛️ Centre Status</div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Centre</th>
                  <th>Yard %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {centres.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ fontWeight: 700, color: c.yardCapacityUsed >= 90 ? '#b91c1c' : 'var(--green-700)' }}>
                      {c.yardCapacityUsed}%
                    </td>
                    <td>
                      <span className={`badge ${
                        c.status === 'OPEN' ? 'badge-green' :
                        c.status === 'RESTRICTED' ? 'badge-orange' : 'badge-red'
                      }`}>
                        {c.status === 'OPEN' ? '✓ Open' : c.status === 'RESTRICTED' ? '⚠ Restricted' : '🚨 Paused'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Alert Feed */}
      <div className="card">
        <div className="card-title">🚨 Critical Alert Feed</div>
        {alerts.length === 0 && <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>No active alerts.</p>}
        {alerts.map((alert, i) => (
          <div key={i} className={`alert-card ${alert.type}`}>
            <div className="alert-card-icon">{alert.icon}</div>
            <div style={{ flex: 1 }}>
              <div className="alert-card-title">{alert.title}</div>
              <div className="alert-card-desc">{alert.desc}</div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--gray-400)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {alert.time}
            </div>
          </div>
        ))}
      </div>

      {loading && <p style={{ fontSize: '13px', color: 'var(--gray-400)', marginTop: '10px' }}>Loading district data…</p>}
    </div>
  );
}

export default DistrictMonitor;
