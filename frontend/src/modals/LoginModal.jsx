import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../style/LoginModal.css";

export default function LoginModal({ onClose }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const change = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/users/login", form);
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data));
      onClose();
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="login-modal" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal__brand">
          <span>H</span>
        </div>

        <h2>Welcome back</h2>
        <p>Sign in to access the Helios platform.</p>

        <form onSubmit={submit}>
          <div className="login-modal__field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={change}
              placeholder="you@institution.com"
              autoComplete="email"
            />
          </div>

          <div className="login-modal__field">
            <div className="login-modal__field-header">
              <label htmlFor="password">Password</label>
              <button type="button" className="login-modal__forgot">
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={change}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <div className="login-modal__error">
              <span className="login-modal__error-icon">!</span>
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="login-modal__submit"
            disabled={loading || !form.email || !form.password}
          >
            {loading ? (
              <>
                <span className="login-modal__spinner" />
                Signing in…
              </>
            ) : (
              "Sign in to Helios →"
            )}
          </button>
        </form>

        <button className="login-modal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <p className="login-modal__footer">
          By signing in you agree to our <span>Terms of Service</span> and <span>Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}