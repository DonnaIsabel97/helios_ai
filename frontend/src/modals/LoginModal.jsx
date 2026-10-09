import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../style/LoginModal.css";

function BrandOrb() {
  return (
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mbSG" cx="42%" cy="36%" r="62%">
          <stop offset="0%"   stopColor="#2d1f45"/>
          <stop offset="60%"  stopColor="#1a1128"/>
          <stop offset="100%" stopColor="#080510"/>
        </radialGradient>
        <radialGradient id="mbOG" cx="50%" cy="50%" r="50%">
          <stop offset="55%"  stopColor="#9b6fd4" stopOpacity="0.12"/>
          <stop offset="78%"  stopColor="#e86fa3" stopOpacity="0.55"/>
          <stop offset="92%"  stopColor="#c86fa3" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="mbRL" cx="50%" cy="50%" r="50%">
          <stop offset="72%"  stopColor="transparent" stopOpacity="0"/>
          <stop offset="86%"  stopColor="#9b6fd4"     stopOpacity="0.4"/>
          <stop offset="94%"  stopColor="#e86fa3"     stopOpacity="0.85"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>
        <filter id="mbDG" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="1.2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="mbGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="26" cy="26" r="25" fill="url(#mbOG)" filter="url(#mbGlow)"/>
      <circle cx="26" cy="26" r="18" fill="url(#mbSG)"/>
      <circle cx="26" cy="26" r="18" fill="url(#mbRL)"/>
      <circle cx="31"  cy="21" r="2.2" fill="#e86fa3" opacity="0.8" filter="url(#mbDG)"/>
    </svg>
  );
}

export default function LoginModal({ onClose }) {
  const [form, setForm]       = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const navigate = useNavigate();

  const change = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const submit = async (e) => {
  // Handle submission in React without refreshing the page.
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    // Use the same configured backend as the dashboard.
    const response = await api.post("/users/login", form);

    // Save the token for authenticated API requests.
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data));

    onClose();
    navigate("/dashboard");
  } catch (err) {
    // Display the login failure inside the existing modal.
    setError(
      err.response?.data?.message || "Login failed. Please try again."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="login-modal" onClick={e => e.stopPropagation()}>

        <div className="login-modal__brand"><BrandOrb /></div>

        <h2>Welcome back</h2>
        <p>Sign in to access the Helios platform.</p>

        <form onSubmit={submit}>
          <div className="login-modal__field">
            <label htmlFor="lm-email">Email address</label>
            <input
              id="lm-email" name="email" type="email"
              value={form.email} onChange={change}
              placeholder="you@institution.com" autoComplete="email"
            />
          </div>

          <div className="login-modal__field">
            <div className="login-modal__field-header">
              <label htmlFor="lm-password">Password</label>
              <button type="button" className="login-modal__forgot">Forgot password?</button>
            </div>
            <input
              id="lm-password" name="password" type="password"
              value={form.password} onChange={change}
              placeholder="••••••••" autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="login-modal__error">
              <span className="login-modal__error-icon">!</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-modal__submit"
            disabled={loading || !form.email || !form.password}
          >
            {loading ? (
              <><span className="login-modal__spinner" /> Signing in…</>
            ) : (
              "Sign in to Helios"
            )}
          </button>
        </form>

        <button className="login-modal__close" onClick={onClose} aria-label="Close">✕</button>

        <p className="login-modal__footer">
          By signing in you agree to our <span>Terms of Service</span> and <span>Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}