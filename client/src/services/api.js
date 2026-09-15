import axios from 'axios';

const API = axios.create({
  baseURL: 'https://kisan-dwar-backend.onrender.com/api',
  timeout: 8000,
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

// ── Payment ──────────────────────────────────────────────
export const createPayment = (data) => API.post('/payment', data);
export const getPayment = (bookingId) => API.get(`/payment/${bookingId}`);
export const updatePayment = (bookingId, data) => API.patch(`/payment/${bookingId}`, data);

// ── Procurement (government district targets) ────────────
export const getProcurement = () => API.get('/procurement');

// ── Auth ──────────────────────────────────────────────
export const login = (data) => API.post('/auth/login', data);

export default API;
