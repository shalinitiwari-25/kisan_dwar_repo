import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getProfile, updateProfile, uploadDocument, getMyDocument, deleteDocument,
} from '../../services/api';
import { getUser, saveUser } from '../../utils/auth';
import { fileToPayload } from '../../utils/fileUpload';

const STEPS = [
  { id: 'personal', icon: '👤', title: 'Personal' },
  { id: 'kisan',    icon: '🌾', title: 'Kisan & Land' },
  { id: 'bank',     icon: '🏦', title: 'Bank' },
  { id: 'docs',     icon: '📄', title: 'Documents' },
];

const CROP_OPTIONS = ['Wheat', 'Paddy', 'Mustard', 'Cotton', 'Sunflower', 'Maize', 'Barley', 'Pulses'];
const EDITABLE = [
  'name', 'fatherName', 'dob', 'gender', 'address', 'village', 'tehsil', 'district', 'state', 'pincode',
  'kisanId', 'landAcres', 'khasraNo', 'bankName', 'bankAccount', 'ifsc',
];

const DOC_HELP = {
  aadhaar: 'Front side, clear and not blurry',
  kisanId: 'Your Kisan Pehchan Patra / Kisan ID card',
  landRecord: 'Khasra or khatauni copy of your land',
  bankPassbook: 'First page showing your name and account number',
  photo: 'Recent passport-size photo',
};

const STATUS_LABEL = {
  none: { text: 'Not uploaded', tone: 'gray' },
  uploaded: { text: 'Uploaded – waiting for check', tone: 'blue' },
  verified: { text: 'Verified ✓', tone: 'green' },
  rejected: { text: 'Rejected – upload again', tone: 'red' },
};

const maskAadhaar = (a) => (a ? `XXXX XXXX ${String(a).slice(-4)}` : '—');
const spaced = (a) => String(a || '').replace(/(\d{4})(?=\d)/g, '$1 ');

function Field({ label, required, hint, children }) {
  return (
    <div className="form-group pf-field">
      <label className="form-label">{label}{required && <span className="pf-req"> *</span>}</label>
      {children}
      {hint && <div className="pf-hint">{hint}</div>}
    </div>
  );
}

function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const onboarding = !!location.state?.onboarding;

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [crops, setCrops] = useState([]);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [busyDoc, setBusyDoc] = useState('');
  const [docError, setDocError] = useState('');
  const [preview, setPreview] = useState(null);
  const [dirty, setDirty] = useState(false);

  const applyProfile = (p, resetForm = true) => {
    setProfile(p);
    if (resetForm) {
      const f = {};
      EDITABLE.forEach(k => { f[k] = p[k] || ''; });
      setForm(f);
      setCrops(p.crops || []);
    }
    // keep the small copy used across the app up to date
    saveUser({
      ...getUser(), name: p.name, village: p.village, district: p.district, state: p.state,
      kisanId: p.kisanId, profileComplete: p.profileComplete,
    });
  };

  useEffect(() => {
    getProfile()
      .then(res => applyProfile(res.data))
      .catch(err => setError(err.response?.data?.message || 'Could not load your profile. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setDirty(true); setNotice(''); };
  const setDigits = (k, max) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value.replace(/\D/g, '').slice(0, max) })); setDirty(true); setNotice('');
  };
  const toggleCrop = (c) => {
    setCrops(list => (list.includes(c) ? list.filter(x => x !== c) : [...list, c])); setDirty(true); setNotice('');
  };

  const docOf = (type) => profile?.documents?.find(d => d.type === type);

  // What is still missing, judged from what is typed on screen right now.
  const missing = useMemo(() => {
    if (!profile) return [];
    const list = [];
    const need = [['name', 'Full name', 0], ['village', 'Village', 0], ['district', 'District', 0], ['kisanId', 'Kisan ID', 1]];
    need.forEach(([k, label, st]) => { if (!String(form[k] || '').trim()) list.push({ label, step: st }); });
    (profile.docTypes || []).filter(d => d.required).forEach(d => {
      const doc = docOf(d.type);
      if (!doc || doc.status === 'rejected') list.push({ label: d.label, step: 3 });
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, form]);

  const stepDone = (i) => !missing.some(m => m.step === i);

  const filled = useMemo(() => {
    if (!profile) return { done: 0, total: 1, percent: 0 };
    const keys = ['name', 'fatherName', 'dob', 'gender', 'address', 'village', 'tehsil', 'district', 'pincode', 'kisanId', 'landAcres', 'khasraNo', 'bankName', 'bankAccount', 'ifsc'];
    let done = keys.filter(k => String(form[k] || '').trim()).length;
    if (crops.length) done++;
    done += (profile.docTypes || []).filter(d => docOf(d.type)).length;
    const total = keys.length + 1 + (profile.docTypes || []).length;
    return { done, total, percent: Math.round((done / total) * 100) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, form, crops]);

  const handleSave = async () => {
    setError(''); setNotice(''); setSaving(true);
    try {
      const payload = { ...form, crops };
      const res = await updateProfile(payload);
      const wasIncomplete = profile && !profile.profileComplete;
      applyProfile(res.data);
      setDirty(false);
      if (res.data.profileComplete && (onboarding || wasIncomplete)) {
        setNotice('✅ Profile saved. Taking you to Home…');
        setTimeout(() => navigate('/farmer', { replace: true }), 900);
      } else if (res.data.profileComplete) {
        setNotice('✅ Profile saved. You are ready to book at the Mandi.');
      } else {
        const first = res.data.missing?.[0];
        setNotice(`✅ Saved. Still needed to book: ${res.data.missing.map(m => m.label).join(', ')}.`);
        if (first) setStep(first.kind === 'document' ? 3 : (first.key === 'kisanId' ? 1 : 0));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save. Please check your internet and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (type, file) => {
    if (!file) return;
    setDocError(''); setBusyDoc(type);
    try {
      const payload = await fileToPayload(file);
      const res = await uploadDocument({ type, ...payload });
      applyProfile(res.data, false);
    } catch (err) {
      setDocError(err.response?.data?.message || err.message || 'Upload failed. Please try again.');
    } finally {
      setBusyDoc('');
    }
  };

  const handleView = async (type) => {
    setDocError('');
    try {
      const res = await getMyDocument(type);
      setPreview(res.data);
    } catch (err) {
      setDocError(err.response?.data?.message || 'Could not open the file.');
    }
  };

  const handleRemove = async (type) => {
    setDocError(''); setBusyDoc(type);
    try {
      const res = await deleteDocument(type);
      applyProfile(res.data, false);
    } catch (err) {
      setDocError(err.response?.data?.message || 'Could not remove the file.');
    } finally {
      setBusyDoc('');
    }
  };

  if (loading) return <p style={{ color: 'var(--gray-400)' }}>Loading your profile…</p>;
  if (!profile) {
    return <div className="wizard-error">{error || 'Profile not available.'}</div>;
  }

  const initials = (form.name || profile.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const last = step === STEPS.length - 1;

  return (
    <div className="pf">
      {/* ── Header: who + how complete ── */}
      <div className="pf-header">
        <div className="pf-avatar">{initials}</div>
        <div className="pf-header-main">
          <div className="pf-name" data-speak>{form.name || profile.name}</div>
          <div className="pf-sub" data-no-translate>+91-{profile.phone}</div>
          <div className="pf-progress" aria-label={`Profile ${filled.percent}% complete`}>
            <div className="pf-progress-fill" style={{ width: `${filled.percent}%` }} />
          </div>
          <div className="pf-progress-text" data-speak>Profile {filled.percent}% complete</div>
        </div>
      </div>

      {onboarding && !profile.profileComplete && (
        <div className="pf-welcome" data-speak>
          <strong>Welcome to Kisan Dwar! 🌾</strong> Please fill in your details once. After that you can book
          a slot at any Mandi. Go step by step — it takes about 5 minutes.
        </div>
      )}

      {missing.length > 0 ? (
        <div className="pf-missing" data-speak>
          <strong>Still needed to book at a Mandi:</strong>
          <div className="pf-missing-list">
            {missing.map(m => (
              <button type="button" key={m.label} className="pf-missing-chip" onClick={() => setStep(m.step)}>{m.label}</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="pf-ready" data-speak>✅ Your profile is ready. You can book a Mandi slot.</div>
      )}

      {/* ── My Kisan ID card ── */}
      <div className="card">
        <div className="pf-row-between">
          <div className="card-title" style={{ marginBottom: 0 }}>🪪 My Kisan ID</div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowIdCard(v => !v)}>
            {showIdCard ? '▲ Hide' : '▼ View ID'}
          </button>
        </div>
        {showIdCard && (
          <div className="pf-idcard">
            <div className="pf-id-top">
              <div>
                <div className="pf-id-gov">Kisan Pehchan Patra</div>
                <div className="pf-id-name">{form.name || profile.name}</div>
                <div className="pf-id-role">Farmer / किसान</div>
              </div>
              <div className={`pf-id-badge${profile.kppVerified ? ' ok' : ''}`}>
                {profile.kppVerified ? '✓ Verified' : 'Not verified yet'}
              </div>
            </div>
            <div className="pf-id-grid">
              {[
                ['Kisan ID', form.kisanId || 'Not added yet'],
                ['Aadhaar', maskAadhaar(profile.aadhaar)],
                ['Phone', profile.phone ? `+91-${profile.phone.slice(0, 2)}XXXXXX${profile.phone.slice(-2)}` : '—'],
                ['Village', [form.village, form.district].filter(Boolean).join(', ') || '—'],
                ['Land', form.landAcres ? `${form.landAcres} acres` : '—'],
                ['Bank A/C', form.bankAccount ? `****${String(form.bankAccount).replace(/\D/g, '').slice(-4)}` : '—'],
              ].map(([l, v]) => (
                <div key={l} className="pf-id-cell"><div className="pf-id-label">{l}</div><div className="pf-id-val">{v}</div></div>
              ))}
            </div>
            {profile.kppVerified && profile.kppVerifiedBy && (
              <div className="pf-id-foot">Verified by {profile.kppVerifiedBy}</div>
            )}
          </div>
        )}
      </div>

      {/* ── Step tabs ── */}
      <div className="pf-steps" role="tablist">
        {STEPS.map((s, i) => (
          <button
            type="button" role="tab" key={s.id} aria-selected={step === i}
            className={`pf-step${step === i ? ' active' : ''}${stepDone(i) ? ' done' : ''}`}
            onClick={() => setStep(i)}
          >
            <span className="pf-step-icon">{stepDone(i) ? '✓' : s.icon}</span>
            <span className="pf-step-title">{s.title}</span>
          </button>
        ))}
      </div>

      {error && <div className="wizard-error">{error}</div>}
      {notice && <div className="pf-notice" data-speak>{notice}</div>}

      {/* ── Step 1: Personal ── */}
      {step === 0 && (
        <div className="card pf-card">
          <div className="card-title">👤 Personal details</div>
          <Field label="Full name" required>
            <input className="form-control" value={form.name} onChange={set('name')} maxLength={80} autoComplete="name" />
          </Field>
          <Field label="Father / husband name">
            <input className="form-control" value={form.fatherName} onChange={set('fatherName')} maxLength={80} />
          </Field>
          <div className="pf-two">
            <Field label="Phone number" hint="Used to log in – cannot be changed here">
              <input className="form-control" value={profile.phone} readOnly disabled data-no-translate />
            </Field>
            <Field label="Aadhaar number" hint="Used for your bookings – cannot be changed here">
              <div className="pf-inline">
                <input className="form-control" readOnly disabled data-no-translate
                  value={showAadhaar ? spaced(profile.aadhaar) : maskAadhaar(profile.aadhaar)} />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAadhaar(v => !v)}>
                  {showAadhaar ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
          </div>
          <div className="pf-two">
            <Field label="Date of birth">
              <input type="date" className="form-control" value={form.dob} onChange={set('dob')} max={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label="Gender">
              <select className="form-control" value={form.gender} onChange={set('gender')}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
          </div>
          <Field label="Address">
            <input className="form-control" value={form.address} onChange={set('address')} maxLength={200} autoComplete="street-address" />
          </Field>
          <div className="pf-two">
            <Field label="Village" required><input className="form-control" value={form.village} onChange={set('village')} maxLength={60} /></Field>
            <Field label="Tehsil / Block"><input className="form-control" value={form.tehsil} onChange={set('tehsil')} maxLength={60} /></Field>
          </div>
          <div className="pf-two">
            <Field label="District" required><input className="form-control" value={form.district} onChange={set('district')} maxLength={60} /></Field>
            <Field label="State"><input className="form-control" value={form.state} onChange={set('state')} maxLength={60} /></Field>
          </div>
          <Field label="PIN code">
            <input className="form-control" inputMode="numeric" value={form.pincode} onChange={setDigits('pincode', 6)} placeholder="6 digits" />
          </Field>
        </div>
      )}

      {/* ── Step 2: Kisan & land ── */}
      {step === 1 && (
        <div className="card pf-card">
          <div className="card-title">🌾 Kisan ID &amp; land</div>
          <Field label="Kisan ID (Kisan Pehchan Patra number)" required hint="Letters and numbers, as printed on your Kisan ID card">
            <input className="form-control" value={form.kisanId} onChange={(e) => { setForm(f => ({ ...f, kisanId: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 30) })); setDirty(true); setNotice(''); }}
              placeholder="e.g. KP-2025-HR-00429" autoCapitalize="characters" data-no-translate />
          </Field>
          <div className="pf-two">
            <Field label="Land area (acres)">
              <input className="form-control" inputMode="decimal" value={form.landAcres}
                onChange={(e) => { setForm(f => ({ ...f, landAcres: e.target.value.replace(/[^\d.]/g, '').slice(0, 8) })); setDirty(true); }} placeholder="e.g. 2.5" />
            </Field>
            <Field label="Khasra / Khatauni number">
              <input className="form-control" value={form.khasraNo} onChange={set('khasraNo')} maxLength={40} />
            </Field>
          </div>
          <Field label="Crops you grow">
            <div className="pf-chips">
              {CROP_OPTIONS.map(c => (
                <button type="button" key={c} className={`pf-chip${crops.includes(c) ? ' on' : ''}`} onClick={() => toggleCrop(c)}>
                  {crops.includes(c) ? '✓ ' : ''}{c}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {/* ── Step 3: Bank ── */}
      {step === 2 && (
        <div className="card pf-card">
          <div className="card-title">🏦 Bank details</div>
          <div className="pf-hint" style={{ marginBottom: 12 }}>Your crop payment is sent to this account.</div>
          <Field label="Bank name"><input className="form-control" value={form.bankName} onChange={set('bankName')} maxLength={80} /></Field>
          <Field label="Account number">
            <input className="form-control" inputMode="numeric" value={form.bankAccount} onChange={set('bankAccount')} maxLength={30} data-no-translate />
          </Field>
          <Field label="IFSC code" hint="Example: SBIN0001234">
            <input className="form-control" value={form.ifsc} autoCapitalize="characters" data-no-translate
              onChange={(e) => { setForm(f => ({ ...f, ifsc: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })); setDirty(true); }} />
          </Field>
        </div>
      )}

      {/* ── Step 4: Documents ── */}
      {step === 3 && (
        <div className="card pf-card">
          <div className="card-title">📄 Documents for Mandi booking</div>
          <div className="pf-hint" style={{ marginBottom: 12 }}>
            Take a clear photo or choose a file (JPG, PNG or PDF, under 1 MB). The Mandi officer will check them.
            Documents marked * are needed to book.
          </div>
          {docError && <div className="wizard-error">{docError}</div>}
          {(profile.docTypes || []).map(d => {
            const doc = docOf(d.type);
            const st = STATUS_LABEL[doc ? doc.status : 'none'];
            const busy = busyDoc === d.type;
            return (
              <div key={d.type} className="pf-doc">
                <div className="pf-doc-top">
                  <div>
                    <div className="pf-doc-title">{d.label}{d.required && <span className="pf-req"> *</span>}</div>
                    <div className="pf-hint">{DOC_HELP[d.type]}</div>
                  </div>
                  <span className={`pf-status pf-status--${st.tone}`}>{st.text}</span>
                </div>
                {doc?.status === 'rejected' && doc.rejectReason && (
                  <div className="pf-reject">Reason: {doc.rejectReason}</div>
                )}
                {doc && <div className="pf-hint" data-no-translate>{doc.fileName}</div>}
                <div className="pf-doc-actions">
                  {doc?.status !== 'verified' && (
                    <>
                      <label className={`btn btn-primary btn-sm pf-file-btn${busy ? ' disabled' : ''}`}>
                        {busy ? 'Uploading…' : (doc ? '↻ Replace' : '⬆ Choose file')}
                        <input type="file" accept="image/*,application/pdf" hidden disabled={busy}
                          onChange={(e) => { handleFile(d.type, e.target.files?.[0]); e.target.value = ''; }} />
                      </label>
                      <label className={`btn btn-outline btn-sm pf-file-btn${busy ? ' disabled' : ''}`}>
                        📷 Take photo
                        <input type="file" accept="image/*" capture="environment" hidden disabled={busy}
                          onChange={(e) => { handleFile(d.type, e.target.files?.[0]); e.target.value = ''; }} />
                      </label>
                    </>
                  )}
                  {doc && <button type="button" className="btn btn-outline btn-sm" onClick={() => handleView(d.type)}>👁 View</button>}
                  {doc && doc.status !== 'verified' && (
                    <button type="button" className="btn btn-outline btn-sm" style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                      onClick={() => handleRemove(d.type)} disabled={busy}>Remove</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Back / Next + Save ── */}
      <div className="pf-savebar">
        <div className="pf-savebar-nav">
          <button type="button" className="btn btn-outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>← Back</button>
          {!last && <button type="button" className="btn btn-outline" onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}>Next →</button>}
        </div>
        <button type="button" className="farmer-big-btn pf-save" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : (dirty ? '💾 Save my details' : '💾 Save')}
        </button>
      </div>

      {preview && (
        <div className="pf-modal" onClick={() => setPreview(null)} role="dialog" aria-modal="true">
          <div className="pf-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="pf-row-between" style={{ marginBottom: 10 }}>
              <strong data-no-translate>{preview.fileName}</strong>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setPreview(null)}>✕ Close</button>
            </div>
            {preview.mimeType === 'application/pdf'
              ? <a className="btn btn-primary" href={preview.data} download={preview.fileName || 'document.pdf'}>⬇ Download PDF</a>
              : <img src={preview.data} alt={preview.fileName} className="pf-modal-img" />}
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
