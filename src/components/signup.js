/** Signup: POST /api/register → new row in users table (password stored as hash on server). */
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { apiRequest } from "./api";

const Signup = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });
      setStatusMessage("Sign up successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setStatusMessage(error.message || "Server error, try again.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-sidebar">
        <div className="auth-sidebar-content">
          <h1 className="auth-sidebar-title">Start your journey with us!</h1>
          <div className="auth-logo-circle">
            <span className="auth-logo-icon">🛒</span>
          </div>
        </div>
      </div>

      <div className="auth-form-wrapper">
        <div className="auth-form-container">
          <div className="auth-card">
            <h2 className="auth-title">Create your account</h2>
            {statusMessage && <div className="status-message">{statusMessage}</div>}
            <p className="auth-subtitle">
              Already have an account? <Link to="/login" className="link-styled">Log in here.</Link>
            </p>

            <form onSubmit={handleSignup} className="auth-form-group-tight">
              <div>
                <label className="auth-label">Username</label>
                <input
                  type="text"
                  className="input-field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="auth-label">Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="auth-label">Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary">
                Sign Up
              </button>
            </form>
            <p className="auth-subtitle" style={{ marginTop: "1rem" }}>
              <Link to="/privacy" className="link-styled">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
