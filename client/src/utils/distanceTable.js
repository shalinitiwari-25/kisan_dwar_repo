/**
 * Static distance table — no external API needed.
 * Key format: "VillageName_CentreId"  →  approximate distance in km
 *
 * Covers villages in Karnal, Panipat and Kurukshetra districts (Haryana).
 * Add more entries here as needed — zero dependency on any mapping service.
 */
const distanceTable = {
  // ── Karnal district → C001 (Karnal Mandi) ──────────────────────────────
  'Dhanora_C001': 12,   'Dhanora_C002': 58,   'Dhanora_C003': 35,
  'Nilokheri_C001': 18, 'Nilokheri_C002': 48, 'Nilokheri_C003': 28,
  'Gharaunda_C001': 22, 'Gharaunda_C002': 42, 'Gharaunda_C003': 32,
  'Assandh_C001': 30,   'Assandh_C002': 52,   'Assandh_C003': 45,
  'Indri_C001': 25,     'Indri_C002': 55,     'Indri_C003': 30,
  'Kunjpura_C001': 8,   'Kunjpura_C002': 52,  'Kunjpura_C003': 40,
  'Nissing_C001': 20,   'Nissing_C002': 50,   'Nissing_C003': 38,
  'Taraori_C001': 14,   'Taraori_C002': 56,   'Taraori_C003': 36,

  // ── Panipat district → C002 (Panipat Mandi) ────────────────────────────
  'Samalkha_C001': 42,    'Samalkha_C002': 15,    'Samalkha_C003': 55,
  'Israna_C001': 48,      'Israna_C002': 18,      'Israna_C003': 60,
  'Bapoli_C001': 50,      'Bapoli_C002': 12,      'Bapoli_C003': 62,
  'Sanauli_C001': 55,     'Sanauli_C002': 10,     'Sanauli_C003': 65,
  'Madlauda_C001': 45,    'Madlauda_C002': 20,    'Madlauda_C003': 58,
  'Ugra Kheri_C001': 38,  'Ugra Kheri_C002': 25,  'Ugra Kheri_C003': 50,

  // ── Kurukshetra district → C003 (Kurukshetra Mandi) ───────────────────
  'Pehowa_C001': 60,      'Pehowa_C002': 75,      'Pehowa_C003': 22,
  'Thanesar_C001': 50,    'Thanesar_C002': 65,    'Thanesar_C003': 8,
  'Shahabad_C001': 45,    'Shahabad_C002': 60,    'Shahabad_C003': 18,
  'Ladwa_C001': 55,       'Ladwa_C002': 70,       'Ladwa_C003': 14,
  'Babain_C001': 48,      'Babain_C002': 68,      'Babain_C003': 20,
  'Ismailabad_C001': 42,  'Ismailabad_C002': 62,  'Ismailabad_C003': 16,
  'Cheeka_C001': 35,      'Cheeka_C002': 58,      'Cheeka_C003': 28,
};

/**
 * Returns approximate distance in km between a village and a centre.
 * Returns null if the combination isn't in the table.
 *
 * @param {string} village  - Village name (must match VILLAGE_LIST label exactly)
 * @param {string} centreId - e.g. 'C001', 'C002', 'C003'
 * @returns {number|null}
 */
export function getDistance(village, centreId) {
  if (!village || !centreId) return null;
  const key = `${village}_${centreId}`;
  return distanceTable[key] ?? null;
}

/**
 * Ordered list of all villages for the registration dropdown.
 * Each entry includes the village name and its home district.
 */
export const VILLAGE_LIST = [
  // Karnal district
  { label: 'Assandh',    district: 'Karnal' },
  { label: 'Dhanora',    district: 'Karnal' },
  { label: 'Gharaunda',  district: 'Karnal' },
  { label: 'Indri',      district: 'Karnal' },
  { label: 'Kunjpura',   district: 'Karnal' },
  { label: 'Nilokheri',  district: 'Karnal' },
  { label: 'Nissing',    district: 'Karnal' },
  { label: 'Taraori',    district: 'Karnal' },
  // Panipat district
  { label: 'Bapoli',     district: 'Panipat' },
  { label: 'Israna',     district: 'Panipat' },
  { label: 'Madlauda',   district: 'Panipat' },
  { label: 'Samalkha',   district: 'Panipat' },
  { label: 'Sanauli',    district: 'Panipat' },
  { label: 'Ugra Kheri', district: 'Panipat' },
  // Kurukshetra district
  { label: 'Babain',     district: 'Kurukshetra' },
  { label: 'Cheeka',     district: 'Kurukshetra' },
  { label: 'Ismailabad', district: 'Kurukshetra' },
  { label: 'Ladwa',      district: 'Kurukshetra' },
  { label: 'Pehowa',     district: 'Kurukshetra' },
  { label: 'Shahabad',   district: 'Kurukshetra' },
  { label: 'Thanesar',   district: 'Kurukshetra' },
];

/** State options for government-role registration */
export const STATE_LIST = [
  'Haryana',
  'Punjab',
  'Uttar Pradesh',
  'Rajasthan',
  'Madhya Pradesh',
  'Himachal Pradesh',
  'Uttarakhand',
  'Delhi',
];
