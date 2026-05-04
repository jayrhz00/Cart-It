import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/auth.css';
import { resetPassword } from '../services/api';

/**
 * ResetPassword Component
 * Allows users to establish a new password using a secure token provided via email.
 */

const ResetPassword = () => {
  // Extract the unique reset token from the URL parameters
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState(''); // State for storing success/error feedback
  const [isLoading, setIsLoading] = useState(false); // State for preventing multiple submissions

  // Validates passwords and submits the new password to the backend
  const handleReset = async (e) => {
    e.preventDefault();
    // Basic client-side validation for password parity
    if (newPassword !== confirmPassword) {
      return setStatusMessage("Passwords do not match.");
    }

    setIsLoading(true);
    setStatusMessage("");

    try {
    // API call to update the password in the database
      await resetPassword(token, newPassword);
      alert("Password reset successful! Please log in.");
      navigate('/login');
    } catch (error) {
    // Capture and display API error messages
      setStatusMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-sidebar">
        {/* Visual sidebar consistent with the Login and Signup pages */}
        <div className="auth-sidebar-content">
          <h1 className="auth-sidebar-title">Secure Your Account</h1>
          <div className="auth-logo-circle">
            <span className="auth-logo-icon">🔒</span>
          </div>
        </div>
      </div>

      <div className="auth-form-wrapper">
        <div className="auth-form-container">
          <div className="auth-card">
            <h2 className="auth-title">Create New Password</h2>
            {/* Conditional rendering for error or status feedback */}
            {statusMessage && <div className="status-message">{statusMessage}</div>}

            <form onSubmit={handleReset} className="auth-form-group">
              <div>
                <label className="auth-label">New Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div>
                <label className="auth-label">Confirm New Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Password"}
              </button>
            </form>

            {/* Navigation toggle to return to the login screen */}
            <button
              onClick={() => navigate('/login')}
              className="w-full text-sm text-gray-500 mt-6 hover:text-gray-800 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;