export const saveToken = (token) => localStorage.setItem('token', token);
export const getToken = () => localStorage.getItem('token');
export const saveRole = (role) => localStorage.setItem('role', role);
export const getRole = () => localStorage.getItem('role');

// Persist the logged-in user's profile so pages can read name/phone/aadhaar
export const saveUser = (user) => localStorage.setItem('kd_user', JSON.stringify(user));
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('kd_user')) || {}; } catch { return {}; }
};

export const removeToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('kd_user');
  localStorage.removeItem('kd_lastBooking');
};

// After login/register: farmers with an incomplete profile are sent to the
// Profile page first, everyone else to their role's home page.
export const ROLE_HOME = { farmer: '/farmer', officer: '/officer', government: '/government' };
export const homeFor = (role) => ROLE_HOME[role] || '/farmer';
export const postLoginPath = (user) =>
  user?.role === 'farmer' && user.profileComplete === false ? '/farmer/profile' : homeFor(user?.role);
