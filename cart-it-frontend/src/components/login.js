import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, requestPasswordReset } from '../services/api';
import '../styles/auth.css';

/**
 * Login Component
 * Handles user authentication, standard login and password reset requests.
 */

const Login = () => {
  const navigate = useNavigate(); // For navigation after login
  const [email, setEmail] = useState(''); // State for email input
  const [password, setPassword] = useState(''); // State for password input
  const [statusMessage, setStatusMessage] = useState(''); // State for displaying status messages (errors/success)
  const [isLoading, setIsLoading] = useState(false); // State to indicate loading status
  const [isForgotPassword, setIsForgotPassword] = useState(false); // State to toggle between login and forgot password views

  // Handle login form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage("");
    try {
      const data = await login(email, password); // Call the login API function
      localStorage.setItem('token', data.token); // Store the JWT token in localStorage for authenticated requests
      localStorage.setItem('user', JSON.stringify(data.user)); // Store user info in localStorage for easy access across the app
      const extensionId = "objilaloanbgdonaepejdfeahohkknhe";
      // Sync with browser extension
      if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(extensionId, {
          type: "LOGIN_SUCCESS",
          token: data.token,
          user: data.user
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log("Extension not found or inactive.");
          } else {
            console.log("Extension session synchronized:", response);
          }
        });
      }
      navigate('/dashboard');
    } catch (error) {
      setStatusMessage(error.message); // Display error message if login fails
    } finally {
      setIsLoading(false); // Reset loading state after API call completes
    }
  };

  // Handle forgot password form submission
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage("");
    try {
      const message = await requestPasswordReset(email); // Call the API function to request a password reset link
      setStatusMessage(message); // Display success message returned from the API 
      setIsForgotPassword(false); // Switch back to login view after requesting reset link
    } catch (error) {
      setStatusMessage("Failed to send reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  // Render the login form or forgot password form based on the state 
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
            {statusMessage && <div className="status-message">{statusMessage}</div>}
            {!isForgotPassword ? (
              <>
                <h2 className="auth-title">Log in to your account</h2>
                <p className="auth-subtitle">
                  Don’t have an account? <Link to="/signup" className="link-styled">Sign up here.</Link>
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

                  <button type="submit" className="btn-primary" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Log In"}
                  </button>
                </form>

                <p className="mt-4 text-center">
                  <button
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-gray-500 hover:text-solar-orange transition-colors"
                  >
                    Forgot Password?
                  </button>
                </p>
              </>
            ) : (
              <>
                <h2 className="auth-title">Reset Password</h2>
                <p className="auth-subtitle">Enter your email to receive a reset link.</p>

                <form onSubmit={handleForgotPasswordSubmit} className="auth-form-group">
                  <div>
                    <label className="auth-label">Email</label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary">Send Reset Link</button>
                </form>

                <button
                  onClick={() => setIsForgotPassword(false)}
                  className="w-full text-sm text-gray-500 mt-6 hover:text-gray-800 transition-colors"
                >
                  Back to Login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;