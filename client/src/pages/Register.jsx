import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/api";
import { saveToken, saveRole, saveUser } from "../utils/auth";
import logo from "../assets/logo.png";
import LanguageToggle from "../components/LanguageToggle";
import { VILLAGE_LIST, STATE_LIST } from "../utils/distanceTable";

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
    village: "",
    district: "",
    state: "",
  });

  // Step 2: OTP
  const [step, setStep] = useState(1); // 1 = form, 2 = OTP
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "village") {
      // Auto-fill district when village is picked
      const found = VILLAGE_LIST.find((v) => v.label === value);
      setForm((prev) => ({ ...prev, village: value, district: found?.district || "" }));
    } else if (name === "role") {
      // Clear address fields when switching roles to avoid stale data
      setForm((prev) => ({ ...prev, role: value, village: "", district: "", state: "" }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
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

    // Role-specific address validation
    if ((form.role === "farmer" || form.role === "officer") && !form.village)
      return setError("Please select your village/area.");
    if (form.role === "government" && !form.state)
      return setError("Please select your state.");

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

      // Officer/Government registrations don't get a token back — they're
      // pending until a Government user approves them.
      if (res.data.pending) {
        setPendingMessage(res.data.message);
        setStep(3);
        return;
      }

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
          {step === 1 ? "Create your account" : step === 2 ? "Verify OTP" : "Registration submitted"}
        </h2>

        {error && <div className="login-error">{error}</div>}

        {/* ── STEP 3: Pending Government approval (officer / government roles) ── */}
        {step === 3 && (
          <div>
            <div style={{
              background: "#f0fdf4", border: "1.5px solid var(--green-200)",
              borderRadius: "10px", padding: "16px", marginBottom: "16px",
              fontSize: "13px", color: "var(--green-700)", lineHeight: 1.6,
            }}>
              ⏳ {pendingMessage}
            </div>
            <p style={{ fontSize: "13px", color: "var(--gray-500)", marginBottom: "16px" }}>
              You'll be able to log in with this phone number and password once a government
              admin approves your account{form.role === "officer" ? " and assigns you to a centre" : ""}.
            </p>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ width: "100%", display: "block", textAlign: "center", textDecoration: "none" }}>
              ← Back to Login
            </Link>
          </div>
        )}

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

            {/* ── Address fields: conditional on role ── */}
            {(form.role === "farmer" || form.role === "officer") && (
              <div className="form-group">
                <label className="form-label">Village / Area <span className="required">*</span></label>
                <select
                  name="village"
                  className="form-control"
                  value={form.village}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select your village</option>
                  {VILLAGE_LIST.map((v) => (
                    <option key={v.label} value={v.label}>
                      {v.label} ({v.district})
                    </option>
                  ))}
                </select>
                {form.district && (
                  <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--gray-500)", display: "flex", alignItems: "center", gap: "4px" }}>
                    📍 District auto-filled: <strong style={{ color: "var(--green-700)" }}>{form.district}</strong>
                  </div>
                )}
              </div>
            )}

            {form.role === "government" && (
              <div className="form-group">
                <label className="form-label">State <span className="required">*</span></label>
                <select
                  name="state"
                  className="form-control"
                  value={form.state}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select your state</option>
                  {STATE_LIST.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

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
