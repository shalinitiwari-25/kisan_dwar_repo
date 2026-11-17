/**
 * profile.js — single source of truth for what a farmer must fill in
 * before booking, and how a User is shown to the client.
 */

// Documents a farmer can upload. `required` ones block booking until uploaded.
// Change `required` here to tighten/loosen the booking rule.
const DOC_TYPES = [
  { type: 'aadhaar',      label: 'Aadhaar card',            required: true },
  { type: 'kisanId',      label: 'Kisan ID (Kisan Pehchan Patra)', required: true },
  { type: 'landRecord',   label: 'Land record (khasra / khatauni)', required: false },
  { type: 'bankPassbook', label: 'Bank passbook (first page)', required: false },
  { type: 'photo',        label: 'Passport photo',          required: false },
];

// Fields required before a farmer may book a slot.
const REQUIRED_FIELDS = [
  { key: 'name',     label: 'Full name' },
  { key: 'phone',    label: 'Phone number' },
  { key: 'aadhaar',  label: 'Aadhaar number' },
  { key: 'kisanId',  label: 'Kisan ID' },
  { key: 'village',  label: 'Village' },
  { key: 'district', label: 'District' },
];

function missingItems(user) {
  const missing = [];
  for (const f of REQUIRED_FIELDS) {
    if (!String(user[f.key] || '').trim()) missing.push({ kind: 'field', key: f.key, label: f.label });
  }
  const have = new Set((user.documents || []).filter(d => d.status !== 'rejected').map(d => d.type));
  for (const d of DOC_TYPES.filter(d => d.required)) {
    if (!have.has(d.type)) missing.push({ kind: 'document', key: d.type, label: d.label });
  }
  return missing;
}

// Overall completeness (all fields + all documents, optional ones included)
function completeness(user) {
  const optionalFields = ['fatherName', 'dob', 'gender', 'address', 'tehsil', 'pincode', 'landAcres', 'khasraNo', 'bankName', 'bankAccount', 'ifsc'];
  const total = REQUIRED_FIELDS.length + optionalFields.length + DOC_TYPES.length + 1; // +1 crops
  let done = 0;
  for (const f of REQUIRED_FIELDS) if (String(user[f.key] || '').trim()) done++;
  for (const k of optionalFields) if (String(user[k] || '').trim()) done++;
  if ((user.crops || []).length) done++;
  const have = new Set((user.documents || []).map(d => d.type));
  for (const d of DOC_TYPES) if (have.has(d.type)) done++;
  return { done, total, percent: Math.round((done / total) * 100) };
}

// Small user object used in login/register responses and kept in localStorage.
function publicUser(user) {
  const missing = missingItems(user);
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    aadhaar: user.aadhaar || '',
    village: user.village || '',
    district: user.district || '',
    state: user.state || '',
    kisanId: user.kisanId || '',
    preferredLanguage: user.preferredLanguage || 'en',
    assignedCentres: user.assignedCentres || [],
    kppVerified: user.kppVerified || false,
    profileComplete: user.role === 'farmer' ? missing.length === 0 : true,
  };
}

// Full profile for the farmer's own Profile page (documents without file bodies).
function fullProfile(user) {
  const o = user.toObject ? user.toObject() : user;
  const missing = missingItems(o);
  return {
    ...publicUser(user),
    address: o.address || '',
    bankAccount: o.bankAccount || '',
    fatherName: o.fatherName || '', dob: o.dob || '', gender: o.gender || '',
    tehsil: o.tehsil || '', pincode: o.pincode || '',
    landAcres: o.landAcres || '', khasraNo: o.khasraNo || '',
    crops: o.crops || [], bankName: o.bankName || '', ifsc: o.ifsc || '',
    kppVerifiedBy: o.kppVerifiedBy || '',
    documents: (o.documents || []).map(d => ({
      type: d.type, fileName: d.fileName, mimeType: d.mimeType, status: d.status,
      rejectReason: d.rejectReason, uploadedAt: d.uploadedAt, verifiedBy: d.verifiedBy, verifiedAt: d.verifiedAt,
    })),
    missing,
    completeness: completeness(o),
    docTypes: DOC_TYPES,
  };
}

module.exports = { DOC_TYPES, REQUIRED_FIELDS, missingItems, completeness, publicUser, fullProfile };
