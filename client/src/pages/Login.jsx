import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';
import { saveToken, saveRole, saveUser } from '../utils/auth';
import logo from '../assets/logo.png';
import LanguageToggle from '../components/LanguageToggle';

// Where each role lands after a successful login
const ROLE_HOME = {
  farmer: '/farmer',
  officer: '/officer',
  government: '/government',
};

const DEMO_ACCOUNTS = [
  { role: 'Farmer',     phone: '9876543210' },
  { role: 'Officer',    phone: '9876500001' },
  { role: 'Govt Admin', phone: '9876500002' },
];

function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login({ phone, password });
      saveToken(res.data.token);
      saveRole(res.data.user.role);
      saveUser(res.data.user); // persist name / phone / aadhaar
      navigate(ROLE_HOME[res.data.user.role] || '/farmer', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoPhone) => {
    setPhone(demoPhone);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="login-page">
      <div style={{ position: 'absolute', top: '20px', right: '24px' }}>
        <LanguageToggle />
      </div>
      <div className="login-card">
        <div className="login-brand" data-no-translate>
          <img src={logo} alt="Kisan Dwar" onError={(e) => { e.target.style.display = 'none'; }} />
          <div>
            <div className="login-brand-title">
              <span style={{ color: 'var(--green-700)' }}>Kisan</span>
              <span style={{ color: 'var(--orange-500)' }}> Dwar</span>
            </div>
            <div className="login-brand-tagline">Smart Mandi Portal</div>
          </div>
        </div>

        <h2 className="login-heading">Sign in to your dashboard</h2>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>+91</span>
              <input
                type="text"
                className="form-control"
                placeholder="10-digit mobile number"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        {/* Register link */}
        <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '13px', color: 'var(--gray-500)' }}>
          New user?{' '}
          <Link to="/register" style={{ color: 'var(--green-600)', fontWeight: 600, textDecoration: 'none' }}>
            Register here →
          </Link>
        </div>

        <div className="login-demo">
          <div className="login-demo-label">Demo accounts (password: <strong>password123</strong>)</div>
          <div className="login-demo-list">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                type="button"
                key={acc.phone}
                className="login-demo-chip"
                onClick={() => fillDemo(acc.phone)}
              >
                {acc.role}: +91 {acc.phone}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
