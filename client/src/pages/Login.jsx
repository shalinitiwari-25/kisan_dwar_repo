import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { saveToken, saveRole } from '../utils/auth';
import logo from '../assets/logo.png';

// Where each role lands after a successful login
const ROLE_HOME = {
  farmer: '/farmer',
  officer: '/officer',
  government: '/government',
};

const DEMO_ACCOUNTS = [
  { role: 'Farmer', email: 'farmer@test.com' },
  { role: 'Officer', email: 'officer@test.com' },
  { role: 'Government', email: 'govt@test.com' },
];

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login({ email, password });
      saveToken(res.data.token);
      saveRole(res.data.user.role);
      navigate(ROLE_HOME[res.data.user.role] || '/farmer', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
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
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
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

        <div className="login-demo">
          <div className="login-demo-label">Demo accounts (password: password123)</div>
          <div className="login-demo-list">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                type="button"
                key={acc.email}
                className="login-demo-chip"
                onClick={() => fillDemo(acc.email)}
              >
                {acc.role}: {acc.email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
