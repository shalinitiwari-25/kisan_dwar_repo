import { useEffect, useState } from 'react';
import { getFarmerRecord, reviewDocument } from '../services/api';

const DOC_STATUS = {
  uploaded: { text: 'Waiting for check', cls: 'badge-orange' },
  verified: { text: 'Verified', cls: 'badge-green' },
  rejected: { text: 'Rejected', cls: 'badge-red' },
};

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Officer view of one farmer: profile, documents (preview / verify / reject)
// and their bookings (date + time). Works from an Aadhaar number, so the
// Queue Manager, Gate Verification and Farmer Registry can all open it.
function FarmerDetailsModal({ aadhaar, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(null); // doc type
  const [reason, setReason] = useState('');

  const load = () => {
    getFarmerRecord(aadhaar)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message || 'Could not load farmer details.'));
  };
  useEffect(load, [aadhaar]); // eslint-disable-line react-hooks/exhaustive-deps

  const review = async (type, status) => {
    setBusy(type); setError('');
    try {
      await reviewDocument({ aadhaar, type, status, reason: status === 'rejected' ? reason : '' });
      setRejecting(null); setReason('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save.');
    } finally { setBusy(''); }
  };

  const fileOf = (type) => data?.files?.find(f => f.type === type);
  const p = data?.profile;

  const rows = p ? [
    ['Name', p.name], ['Father / husband', p.fatherName], ['Phone', p.phone], ['Aadhaar', p.aadhaar],
    ['Kisan ID', p.kisanId], ['Date of birth', p.dob], ['Gender', p.gender],
    ['Address', p.address], ['Village', p.village], ['Tehsil', p.tehsil], ['District', p.district],
    ['State', p.state], ['PIN', p.pincode], ['Land (acres)', p.landAcres], ['Khasra no.', p.khasraNo],
    ['Crops', (p.crops || []).join(', ')], ['Bank', p.bankName], ['Account no.', p.bankAccount], ['IFSC', p.ifsc],
  ] : [];

  // Printable record the officer can save as PDF / file with the paperwork.
  const printRecord = () => {
    const w = window.open('', '_blank');
    if (!w) { setError('Please allow pop-ups to print.'); return; }
    const docs = (p.documents || []).map(d => `<li>${esc(d.type)} — ${esc(d.status)}${d.verifiedBy ? ` (by ${esc(d.verifiedBy)})` : ''}</li>`).join('');
    const books = (data.bookings || []).map(b =>
      `<tr><td>KD-${String(b.tokenNo).padStart(5, '0')}</td><td>${esc(b.centreId)}</td><td>${esc(b.crop)} ${esc(b.quantity)} Qtl</td><td>${esc(b.slotDate)} ${esc(b.slotLabel)}</td><td>${esc(b.status)}</td></tr>`).join('');
    w.document.write(`<!doctype html><title>Farmer record – ${esc(p.name)}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px}table{border-collapse:collapse;width:100%;margin:10px 0}
      td,th{border:1px solid #ccc;padding:6px 8px;font-size:13px;text-align:left}th{background:#f3f4f6;width:30%}</style>
      <h1>Kisan Dwar – Farmer Record</h1><p>Printed ${esc(new Date().toLocaleString('en-IN'))}</p>
      <table>${rows.map(([l, v]) => `<tr><th>${esc(l)}</th><td>${esc(v) || '—'}</td></tr>`).join('')}</table>
      <h3>Documents</h3><ul>${docs || '<li>None uploaded</li>'}</ul>
      <h3>Bookings</h3><table><tr><th>Token</th><th>Centre</th><th>Crop</th><th>Date / time</th><th>Status</th></tr>${books}</table>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="pf-modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pf-modal-box pf-modal-box--wide" onClick={(e) => e.stopPropagation()}>
        <div className="pf-row-between" style={{ marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>🧑‍🌾 Farmer details</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {p && <button type="button" className="btn btn-outline btn-sm" onClick={printRecord}>🖨 Print / Save PDF</button>}
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>✕ Close</button>
          </div>
        </div>

        {error && <div className="wizard-error">{error}</div>}
        {!data && !error && <p style={{ color: 'var(--gray-400)' }}>Loading…</p>}

        {p && (
          <>
            <div className="fd-grid">
              {rows.map(([l, v]) => (
                <div key={l} className="fd-cell">
                  <div className="fd-label">{l}</div>
                  <div className="fd-val">{v || '—'}</div>
                </div>
              ))}
            </div>

            <div className="card-title" style={{ marginTop: 18 }}>📄 Documents</div>
            {(p.docTypes || []).map(dt => {
              const d = (p.documents || []).find(x => x.type === dt.type);
              const st = d ? DOC_STATUS[d.status] : null;
              return (
                <div key={dt.type} className="pf-doc">
                  <div className="pf-doc-top">
                    <div>
                      <div className="pf-doc-title">{dt.label}{dt.required && <span className="pf-req"> *</span>}</div>
                      {d?.verifiedBy && <div className="pf-hint">Checked by {d.verifiedBy}</div>}
                      {d?.status === 'rejected' && d.rejectReason && <div className="pf-reject">Reason: {d.rejectReason}</div>}
                    </div>
                    {st ? <span className={`badge ${st.cls}`}>{st.text}</span> : <span className="badge badge-gray">Not uploaded</span>}
                  </div>
                  {d && (
                    <div className="pf-doc-actions">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setViewing(fileOf(dt.type))}>👁 View</button>
                      <button type="button" className="btn btn-primary btn-sm" disabled={busy === dt.type || d.status === 'verified'} onClick={() => review(dt.type, 'verified')}>✅ Verify</button>
                      <button type="button" className="btn btn-danger btn-sm" disabled={busy === dt.type} onClick={() => { setRejecting(dt.type); setReason(''); }}>✕ Reject</button>
                    </div>
                  )}
                  {rejecting === dt.type && (
                    <div className="pf-inline" style={{ marginTop: 8 }}>
                      <input className="form-control" placeholder="Reason (e.g. photo is blurry)" value={reason} onChange={e => setReason(e.target.value)} maxLength={120} />
                      <button type="button" className="btn btn-danger btn-sm" disabled={!reason.trim() || busy === dt.type} onClick={() => review(dt.type, 'rejected')}>Send</button>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="card-title" style={{ marginTop: 18 }}>🗓 Bookings</div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Token</th><th>Centre</th><th>Crop</th><th>Date &amp; time</th><th>Status</th></tr></thead>
                <tbody>
                  {(data.bookings || []).map((b, i) => (
                    <tr key={i}>
                      <td>KD-{String(b.tokenNo).padStart(5, '0')}</td>
                      <td>{b.centreId}</td>
                      <td>{b.crop} • {b.quantity} Qtl</td>
                      <td>{[b.slotDate, b.slotLabel].filter(Boolean).join(' ') || new Date(b.createdAt).toLocaleString('en-IN')}</td>
                      <td>{b.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {viewing && (
          <div className="pf-modal" onClick={() => setViewing(null)}>
            <div className="pf-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="pf-row-between" style={{ marginBottom: 10 }}>
                <strong>{viewing.fileName}</strong>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setViewing(null)}>✕ Close</button>
              </div>
              {viewing.mimeType === 'application/pdf'
                ? <a className="btn btn-primary" href={viewing.data} download={viewing.fileName || 'document.pdf'}>⬇ Download PDF</a>
                : <img src={viewing.data} alt={viewing.fileName} className="pf-modal-img" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FarmerDetailsModal;
