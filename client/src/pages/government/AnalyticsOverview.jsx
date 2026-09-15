import { useEffect, useState } from 'react';
import StatCard from '../../components/StatCard';
import { getProcurement, getAllCentres } from '../../services/api';

function AnalyticsOverview() {
  const [districts, setDistricts] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProcurement(), getAllCentres()])
      .then(([procRes, centresRes]) => {
        setDistricts(procRes.data);
        setCentres(centresRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalTarget = districts.reduce((sum, d) => sum + d.target, 0);
  const totalAchieved = districts.reduce((sum, d) => sum + d.achieved, 0);
  const progressPct = totalTarget ? ((totalAchieved / totalTarget) * 100).toFixed(2) : 0;
  const activeCentres = centres.filter(c => c.status !== 'PAUSED').length;

  const KPIS = [
    { label: 'Total MT Procured',        value: loading ? '…' : totalAchieved.toLocaleString('en-IN'), sub: `${progressPct}% of season target`, icon: '🌾', color: 'green'  },
    { label: 'Farmers Paid (DBT)',        value: '18,420',     sub: 'Illustrative · not yet linked to live DBT', icon: '👨‍🌾', color: 'green'  },
    { label: 'Active Procurement Centres',value: loading ? '…' : `${activeCentres} / ${centres.length}`, sub: 'Live from Kisan Dwar', icon: '🏛️', color: 'green'  },
    { label: 'Delayed DBT (>72h)',        value: '187',        sub: '⚠️ Illustrative — roadmap metric',       icon: '⏳', color: 'orange' },
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-title">📊 State-Level Analytics Overview</div>
            <div className="page-subtitle">Haryana Kharif Season 2024-25 · Live Procurement Dashboard</div>
          </div>
          <span className="badge badge-green">
            <span className="badge-dot"></span>
            Live Data
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-cards-grid">
        {KPIS.map((k, i) => (
          <StatCard key={i} label={k.label} value={k.value} sub={k.sub} icon={k.icon} color={k.color} />
        ))}
      </div>

      {/* Season Target Progress */}
      <div className="target-progress mb-20">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.5px', marginBottom: '4px' }}>
              🎯 SEASON PROCUREMENT TARGET
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>Live across {districts.length} districts</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="target-percent">{progressPct}%</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>of {totalTarget.toLocaleString('en-IN')} MT Target</div>
          </div>
        </div>

        <div className="target-bar-track">
          <div className="target-bar-fill" style={{ width: `${Math.min(progressPct, 100)}%` }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
          <span>Achieved: {totalAchieved.toLocaleString('en-IN')} MT</span>
          <span>Remaining: {Math.max(totalTarget - totalAchieved, 0).toLocaleString('en-IN')} MT</span>
        </div>
      </div>

      <div className="grid-2">
        {/* District Breakdown — real data */}
        <div className="card">
          <div className="card-title">🌾 District-Wise Procurement</div>
          {districts.map((d, i) => {
            const pct = Math.round((d.achieved / d.target) * 100);
            return (
              <div key={i} className="progress-row">
                <div className="progress-label">
                  <span>🏛️ {d.district}</span>
                  <span style={{ fontWeight: 700 }}>{d.achieved.toLocaleString()} MT ({pct}%)</span>
                </div>
                <div className="progress-bar-track">
                  <div className={`progress-bar-fill ${pct < 70 ? 'orange' : ''}`} style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Stats — illustrative, roadmap metrics */}
        <div className="card">
          <div className="card-title">💳 DBT Payment Stats <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--gray-400)' }}>(illustrative)</span></div>
          {[
            { label: 'Total MSP Disbursed',   value: '₹1,647 Crore',    color: 'var(--green-700)' },
            { label: 'Credited Today',         value: '₹42.8 Crore',     color: 'var(--green-600)' },
            { label: 'Processing (Bank)',       value: '₹18.4 Crore',     color: 'var(--orange-600)' },
            { label: 'Delayed Payments',        value: '187 cases',       color: '#b91c1c' },
            { label: 'Avg Credit Time',         value: '38 hrs',          color: 'var(--gray-700)' },
            { label: 'Interest Liability',      value: '₹3.2 L (est.)',  color: '#b91c1c' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < 5 ? '1px solid var(--gray-100)' : 'none' }}>
              <span style={{ fontSize: '13px', color: 'var(--gray-500)' }}>{item.label}</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsOverview;
