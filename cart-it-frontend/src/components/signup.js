import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/auth.css';
import { apiRequest } from './api';

const Signup = () => {
  const navigate = useNavigate(); // Hook for navigation
  const [username, setUsername] = useState(''); // State for username input
  const [email, setEmail] = useState(''); // State for email input
  const [password, setPassword] = useState(''); // State for password input
  const [statusMessage, setStatusMessage] = useState(''); // State for status messages

  // Handle form submission for sign up
  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
      setStatusMessage("Sign up successful! Redirecting to login...");
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      console.error("Connection error:", error);
      setStatusMessage(error.message || "Server is down, please try again later.");
    }
  };

  return (
    <div className="auth-container">
      {/* Visual sidebar with branding */}
      <div className="auth-sidebar">
        <div className="auth-sidebar-content">
          <h1 className="auth-sidebar-title">Start your journey with us!</h1>
          <div className="auth-logo-circle">
            <span className="auth-logo-icon">🛒</span>
          </div>
        </div>
      </div>

      {/* Main sign up card */}
      <div className="auth-form-wrapper">
        <div className="auth-form-container">
          <div className="auth-card">
            <h2 className="auth-title">Create your account</h2>
              {/* Display status messages */}
            {statusMessage && <div className="status-status">{statusMessage}</div>}
            <p className="auth-subtitle">
              Already have an account? <Link to="/login" className="link-styled">Log in here.</Link>
            </p>

            {/* Registration form */}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;