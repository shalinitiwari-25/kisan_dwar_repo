import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/api";
import { saveToken, saveRole, saveUser } from "../utils/auth";
import logo from "../assets/logo.png";
import LanguageToggle from "../components/LanguageToggle";

const ROLE_HOME = {
  farmer: "/farmer",
  officer: "/officer",
  government: "/government",
};

// Demo OTP — in production this would be sent via SMS to the phone number.
const DEMO_OTP = "123456";

function Register() {
  const navigate = useNavigate();

  // Step 1: registration details
  const [form, setForm] = useState({
    name: "",
    role: "farmer",
    aadhaar: "",
    phone: "",
    password: "",
  });

  // Step 2: OTP
  const [step, setStep] = useState(1); // 1 = form, 2 = OTP
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  // ── Step 1: validate and "send OTP" ──────────────────────────────────────
  const handleSendOtp = (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) return setError("Please enter your full name.");
    if (form.aadhaar.length !== 12 || !/^\d+$/.test(form.aadhaar))
      return setError("Aadhaar must be exactly 12 digits.");
    if (form.phone.length !== 10 || !/^\d+$/.test(form.phone))
      return setError("Phone number must be exactly 10 digits.");
    if (form.password.length < 6)
      return setError("Password must be at least 6 characters.");

    // Mock OTP sending
    setOtpSent(true);
    setStep(2);
  };

  // ── Step 2: verify OTP and register ──────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (otp !== DEMO_OTP) {
      return setError(`Invalid OTP. (Demo OTP: ${DEMO_OTP})`);
    }

    setLoading(true);
    try {
      const res = await register({ ...form });
      saveToken(res.data.token);
      saveRole(res.data.user.role);
      saveUser(res.data.user);
      navigate(ROLE_HOME[res.data.user.role] || "/farmer", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div style={{ position: "absolute", top: "20px", right: "24px" }}>
        <LanguageToggle />
      </div>
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand" data-no-translate>
          <img src={logo} alt="Kisan Dwar" onError={(e) => { e.target.style.display = "none"; }} />
          <div>
            <div className="login-brand-title">
              <span style={{ color: "var(--green-700)" }}>Kisan</span>
              <span style={{ color: "var(--orange-500)" }}> Dwar</span>
            </div>
            <div className="login-brand-tagline">Smart Mandi Portal</div>
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", alignItems: "center" }}>
          {["Details", "OTP Verify"].map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: step > i ? "var(--green-600)" : step === i + 1 ? "var(--green-700)" : "var(--gray-200)",
                color: step >= i + 1 ? "#fff" : "var(--gray-500)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: 700,
              }}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: "12px", color: step === i + 1 ? "var(--green-700)" : "var(--gray-400)", fontWeight: step === i + 1 ? 600 : 400 }}>
                {label}
              </span>
              {i < 1 && <div style={{ width: 28, height: 2, background: step > 1 ? "var(--green-500)" : "var(--gray-200)" }} />}
            </div>
          ))}
        </div>

        <h2 className="login-heading">
          {step === 1 ? "Create your account" : "Verify OTP"}
        </h2>

        {error && <div className="login-error">{error}</div>}

        {/* ── STEP 1: Registration Form ── */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label className="form-label">Full Name <span className="required">*</span></label>
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="e.g. Ramesh Kumar"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role <span className="required">*</span></label>
              <select name="role" className="form-control" value={form.role} onChange={handleChange}>
                <option value="farmer">👨‍🌾 Farmer</option>
                <option value="officer">🏛️ Officer</option>
                <option value="government">📊 Government Official</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Aadhaar Number <span className="required">*</span></label>
              <input
                type="text"
                name="aadhaar"
                className="form-control"
                placeholder="12-digit Aadhaar"
                maxLength={12}
                value={form.aadhaar}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number <span className="required">*</span></label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", color: "var(--gray-500)", whiteSpace: "nowrap" }}>+91</span>
                <input
                  type="text"
                  name="phone"
                  className="form-control"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Set Password <span className="required">*</span></label>
              <input
                type="password"
                name="password"
                className="form-control"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }}>
              Send OTP →
            </button>
          </form>
        )}

        {/* ── STEP 2: OTP Verify ── */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            {otpSent && (
              <div style={{
                background: "#f0fdf4", border: "1.5px solid var(--green-200)",
                borderRadius: "10px", padding: "12px 16px", marginBottom: "16px",
                fontSize: "13px", color: "var(--green-700)"
              }}>
                📱 OTP sent to <strong>+91-{form.phone}</strong><br />
                <span style={{ color: "var(--gray-500)" }}>(Demo OTP: <strong>123456</strong>)</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Enter OTP <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="6-digit OTP"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value); setError(""); }}
                required
                style={{ letterSpacing: "4px", fontSize: "20px", textAlign: "center" }}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              disabled={loading}
            >
              {loading ? "Creating account…" : "Verify & Register"}
            </button>

            <button
              type="button"
              className="btn btn-outline"
              style={{ width: "100%", marginTop: "10px" }}
              onClick={() => { setStep(1); setError(""); setOtp(""); }}
            >
              ← Back
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "13px", color: "var(--gray-500)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--green-600)", fontWeight: 600, textDecoration: "none" }}>
            Sign in →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
