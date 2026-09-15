function QueueTable({ rows, highlightToken }) {
  const statusColors = {
    Processing: 'badge-orange',
    Waiting:    'badge-gray',
    You:        'badge-green',
    Arrived:    'badge-gold',
  };

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Token ID</th>
            <th>Farmer</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={row.isYou ? 'highlighted' : ''}>
              <td style={{ fontWeight: 700, color: 'var(--gray-600)' }}>#{row.position}</td>
              <td style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: 'var(--green-700)', fontSize: '15px' }}>
                {row.tokenId}
                {row.isYou && <span style={{ marginLeft: '8px', fontSize: '12px' }}>← You</span>}
              </td>
              <td>{row.name}</td>
              <td>
                <span className={`badge ${statusColors[row.status] || 'badge-gray'}`}>
                  {row.status === 'Processing' && <span className="badge-dot"></span>}
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default QueueTable;
