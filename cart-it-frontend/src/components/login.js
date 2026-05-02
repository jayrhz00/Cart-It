import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/auth.css';
import { apiRequest } from './api';

const Login = () => {
  const navigate = useNavigate(); // Hook for navigation
  const [email, setEmail] = useState(''); // State for email input
  const [password, setPassword] = useState(''); // State for password input
  const [statusMessage, setStatusMessage] = useState(''); // State for status messages
  const [isLoading, setIsLoading] = useState(false);

  // Handle form submission for login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage('');
    setIsLoading(true);
    try {
      const data = await apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (error) {
      console.error("Connection error:", error);
      setStatusMessage(error.message || "Could not connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Visual sidebar with branding */}
      <div className="auth-sidebar">
        <div className="auth-sidebar-content">
          <h1 className="auth-sidebar-title">Hello ... Welcome Back!</h1>
          <div className="auth-logo-circle">
            <span className="auth-logo-icon">🛒</span>
          </div>
        </div>
      </div>

      {/* Main login card */}
      <div className="auth-form-wrapper">
        <div className="auth-form-container">
          <div className="auth-card">
            <h2 className="auth-title">Log in to your account</h2>
              {/* Display status messages */}
            {statusMessage && <div className="status-message">{statusMessage}</div>}
            {isLoading && <div className="status-loading">Signing you in...</div>}
            <p className="auth-subtitle">
              Don’t have an account? <Link to="/signup" className="link-styled">Sign up here.</Link>
            </p>
            <p className="auth-subtitle">
              Forgot password? <Link to="/forgot-password" className="link-styled">Reset it here.</Link>
            </p>

            {/* Authentication form */}
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

              <div>
                <label className="auth-label">Password</label>
                <input 
                  type="password" 
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required 
                />
              </div>

              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Log In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;