import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/auth.css";
import { apiRequest } from "./api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setIsLoading(true);
    try {
      const data = await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setStatusMessage(data?.message || "If an account exists, a reset link was sent.");
    } catch (error) {
      // Keep response generic for safety.
      setStatusMessage("If an account exists, a reset link was sent.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-sidebar">
        <div className="auth-sidebar-content">
          <h1 className="auth-sidebar-title">Recover your account</h1>
          <div className="auth-logo-circle">
            <span className="auth-logo-icon">🔐</span>
          </div>
        </div>
      </div>
      <div className="auth-form-wrapper">
        <div className="auth-form-container">
          <div className="auth-card">
            <h2 className="auth-title">Forgot your password?</h2>
            {statusMessage ? <div className="status-success">{statusMessage}</div> : null}
            <p className="auth-subtitle">
              Enter your email and we will send a password reset link.
            </p>
            <form onSubmit={handleSubmit} className="auth-form-group">
              <div>
                <label className="auth-label">Email</label>
                <input
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send reset link"}
              </button>
            </form>
            <p className="auth-subtitle" style={{ marginTop: "12px" }}>
              Remembered it? <Link to="/login" className="link-styled">Back to login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
