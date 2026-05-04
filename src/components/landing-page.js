import React from "react";
import { Link } from "react-router-dom";
import "../styles/landing.css";

const FeatureCard = ({ icon, title, desc }) => (
  <div className="feature-card">
    <div className="feature-icon">{icon}</div>
    <h4 className="feature-title">{title}</h4>
    <p className="feature-desc">{desc}</p>
  </div>
);

const LandingPage = () => {
  return (
    <div className="landing-container">
      <header className="landing-header">
        <div>
          <img src="/logo.png" alt="Cart-It Logo" className="logo-img" />
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1 className="hero-title">Save It. Track It. Cart It.</h1>
          <p className="hero-subtitle">Save items, track prices, and organize everything effortlessly.</p>
          <div className="hero-buttons">
            <Link to="/signup" className="btn-register">Register</Link>
            <Link to="/login" className="btn-login">Login</Link>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="steps-wrapper">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Save, track, and manage your shopping in a few steps.</p>
          <div className="steps-grid">
            <div className="step-card">
              <h3 className="step-title">1) Add Items</h3>
              <p className="step-desc">Capture products from any website with your extension.</p>
            </div>
            <div className="step-card">
              <h3 className="step-title">2) Organize</h3>
              <p className="step-desc">Group items by category and keep notes.</p>
            </div>
            <div className="step-card">
              <h3 className="step-title">3) Decide</h3>
              <p className="step-desc">Track prices and purchase when the timing is right.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-grid">
          <FeatureCard icon="🛒" title="Save from any site" desc="Keep all desired items in one place." />
          <FeatureCard icon="🔔" title="Price tracking" desc="Watch price history and react faster." />
          <FeatureCard icon="📂" title="Smart categories" desc="Color-code your lists and stay organized." />
        </div>
        <div className="mt-16">
          <button
            type="button"
            className="download-btn"
            onClick={() => window.open("/extension-install.html", "_blank", "noopener,noreferrer")}
          >
            Download Cart-It Extension
          </button>
        </div>
        <p className="landing-footer-legal">
          <Link to="/privacy">Privacy Policy</Link>
        </p>
      </section>
    </div>
  );
};

export default LandingPage;
