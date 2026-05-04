import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../services/api'; 
import '../styles/auth.css';
import { apiRequest } from './api';

/**
 * Signup Component
 * Handles new user registration. 
 */

const Signup = () => {
  const navigate = useNavigate(); // Navigation hook for redirecting after signup
  const [username, setUsername] = useState(''); // State for username input
  const [email, setEmail] = useState(''); // State for email input
  const [password, setPassword] = useState(''); // State for password input
<<<<<<< HEAD
  const [statusMessage, setStatusMessage] = useState(''); // State for displaying status messages 
  const [isLoading, setIsLoading] = useState(false); // State for loading status during signup process

=======
  const [statusMessage, setStatusMessage] = useState(''); // State for status messages
  const [statusKind, setStatusKind] = useState('error');
  const [isLoading, setIsLoading] = useState(false);
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012

  const handleSignup = async (e) => {
<<<<<<< HEAD
  e.preventDefault();
  setIsLoading(true); // Start loading
  setStatusMessage(""); // Clear previous status messages
  // Basic client-side validation for password strength
  if (password.length < 8) {
    setStatusMessage("Password must be at least 8 characters long.");
    return;
  }
  // Check for at least one number in the password
  if (!/\d/.test(password)) {
    setStatusMessage("Password must contain at least one number.");
    return;
  }
  try {
    await signup(username, email, password);
    setStatusMessage("Sign up successful! Redirecting...");
    setTimeout(() => navigate('/login'), 2000);
  } catch (error) {
    setStatusMessage(error.message);
  } finally {
    setIsLoading(false);
  }
};
=======
    e.preventDefault();
    setStatusMessage('');
    setStatusKind('error');
    setIsLoading(true);
    try {
      await apiRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
      setStatusMessage("Sign up successful! Redirecting to login...");
      setStatusKind('success');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      console.error("Connection error:", error);
      setStatusMessage(error.message || "Server is down, please try again later.");
      setStatusKind('error');
    } finally {
      setIsLoading(false);
    }
  };
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012

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
            {statusMessage && <div className={statusKind === 'success' ? 'status-success' : 'status-message'}>{statusMessage}</div>}
            <p className="auth-subtitle">
              Already have an account? <Link to="/login" className="link-styled">Log in here.</Link>
            </p>

            {/* Registration form */}
            <form onSubmit={handleSignup} className="auth-form-group-tight">
              <div>
                <label className="auth-label">Username</label>
                <input 
                  className="input-field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
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
                {isLoading ? "Signing up..." : "Sign Up"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;