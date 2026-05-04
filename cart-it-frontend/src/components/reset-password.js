<<<<<<< HEAD
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
=======
import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../styles/auth.css";
import { apiRequest } from "./api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusKind, setStatusKind] = useState("error");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setStatusKind("error");
    if (!token) {
      setStatusMessage("Reset link is invalid. Please request a new one.");
      return;
    }
    if (password.length < 8) {
      setStatusMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setStatusMessage("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          new_password: password,
        }),
      });
      setStatusMessage(data?.message || "Password reset successful. Redirecting to login...");
      setStatusKind("success");
      setTimeout(() => navigate("/login"), 1800);
    } catch (error) {
      setStatusMessage(error.message || "Reset link is invalid or expired.");
      setStatusKind("error");
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-sidebar">
<<<<<<< HEAD
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
=======
        <div className="auth-sidebar-content">
          <h1 className="auth-sidebar-title">Set a new password</h1>
          <div className="auth-logo-circle">
            <span className="auth-logo-icon">🔑</span>
          </div>
        </div>
      </div>
      <div className="auth-form-wrapper">
        <div className="auth-form-container">
          <div className="auth-card">
            <h2 className="auth-title">Reset password</h2>
            {statusMessage ? (
              <div className={statusKind === "success" ? "status-success" : "status-message"}>
                {statusMessage}
              </div>
            ) : null}
            <form onSubmit={handleSubmit} className="auth-form-group-tight">
              <div>
                <label className="auth-label">New password</label>
                <input
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <div>
                <label className="auth-label">Confirm new password</label>
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
                <input
                  type="password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
<<<<<<< HEAD
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
=======
                  disabled={isLoading}
                  required
                />
              </div>
              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? "Resetting..." : "Reset password"}
              </button>
            </form>
            <p className="auth-subtitle" style={{ marginTop: "12px" }}>
              Back to <Link to="/login" className="link-styled">login</Link>
            </p>
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
          </div>
        </div>
      </div>
    </div>
  );
<<<<<<< HEAD
};

export default ResetPassword;
=======
}
>>>>>>> 4c963f342e023986f12ef53383f9a37ed35d6012
