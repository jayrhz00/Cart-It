/** Login: POST /api/login → server checks password → returns JWT; we save token for apiRequest(). */
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/auth.css";
import { apiRequest } from "./api";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (error) {
      setStatusMessage(error.message || "Could not connect to server");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-sidebar">
        <div className="auth-sidebar-content">
          <h1 className="auth-sidebar-title">Hello ... Welcome Back!</h1>
          <div className="auth-logo-circle">
            <span className="auth-logo-icon">🛒</span>
          </div>
        </div>
      </div>

      <div className="auth-form-wrapper">
        <div className="auth-form-container">
          <div className="auth-card">
            <h2 className="auth-title">Log in to your account</h2>
            {statusMessage && <div className="status-message">{statusMessage}</div>}
            <p className="auth-subtitle">
              Don&apos;t have an account? <Link to="/signup" className="link-styled">Sign up here.</Link>
            </p>

            <form onSubmit={handleSubmit} className="auth-form-group">
              <div>
                <label className="auth-label">Email</label>
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
                Log In
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
