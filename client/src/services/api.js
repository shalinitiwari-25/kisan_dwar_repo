import axios from 'axios';
import { getToken } from '../utils/auth';

// Always talk to the deployed Render backend (not localhost).
// The trailing "/api" here is required — it was missing before, which
// caused every request (including login) to 404 against Render.
// You can still override this per-environment by setting
// VITE_API_BASE_URL in a .env file if you ever need to point at
// localhost for local-only testing.
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://kisan-dwar-backend.onrender.com/api',
  timeout: 8000,
});

// Attach the logged-in user's JWT to every request. This is what lets the
// backend actually enforce "who is allowed to do this" (officer approvals,
// centre assignment, KPP verification) instead of trusting the frontend.
API.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// ── Centre ──────────────────────────────────────────────
export const getCentre = (centreId) => API.get(`/centre/${centreId}`);
export const getAllCentres = () => API.get('/centre');
export const updateCentreStatus = (centreId, data) => API.put(`/centre/${centreId}`, data);

// ── Booking ──────────────────────────────────────────────
export const createBooking = (data) => API.post('/booking', data);
export const getBookingsByCentre = (centreId) => API.get(`/booking/${centreId}`);
export const getBookingsByFarmer = (aadhaar) => API.get(`/booking/farmer/${aadhaar}`);
export const getBookingById = (id) => API.get(`/booking/single/${id}`);
export const updateBookingStatus = (id, status) => API.patch(`/booking/${id}/status`, { status });
export const confirmArrival = (id) => API.patch(`/booking/${id}/confirm`);

// ── Payment ──────────────────────────────────────────────
export const createPayment = (data) => API.post('/payment', data);
export const getPayment = (bookingId) => API.get(`/payment/${bookingId}`);
export const updatePayment = (bookingId, data) => API.patch(`/payment/${bookingId}`, data);

// ── Procurement (government district targets) ────────────
export const getProcurement = () => API.get('/procurement');

// ── Auth ──────────────────────────────────────────────
export const login = (data) => API.post('/auth/login', data);
export const register = (data) => API.post('/auth/register', data);

// ── Translation (English <-> Hindi) ───────────────────────
export const translateTexts = (texts, target) => API.post('/translate', { texts, target });

// ── Notifications (Mandi delay/shortage/rebooking alerts) ─
export const getNotifications = (aadhaar) => API.get(`/notifications/farmer/${aadhaar}`);

// ── Language preference (persisted so SMS alerts match it) ─
export const updateLanguagePref = (aadhaar, preferredLanguage) =>
  API.patch(`/auth/language/${aadhaar}`, { preferredLanguage });

// ── Officer/Government approval workflow (Government only) ─
export const getPendingOfficers = () => API.get('/admin/pending-officers');
export const getOfficers = () => API.get('/admin/officers');
export const approveOfficer = (userId, assignedCentres) =>
  API.patch(`/admin/approve/${userId}`, { assignedCentres });
export const rejectOfficer = (userId, reason) =>
  API.patch(`/admin/reject/${userId}`, { reason });
export const reassignOfficerCentres = (userId, assignedCentres) =>
  API.patch(`/admin/officers/${userId}/centres`, { assignedCentres });

// ── Farmer Registry — Kisan Pehchan Patra verification ─────
export const searchFarmers = (search) => API.get('/admin/farmers', { params: { search } });
export const verifyFarmerKpp = (userId, verified) =>
  API.patch(`/admin/farmers/${userId}/verify-kpp`, { verified });

// ── Audit / activity log ────────────────────────────────────
export const getAuditLog = () => API.get('/admin/audit-log');

export default API;
