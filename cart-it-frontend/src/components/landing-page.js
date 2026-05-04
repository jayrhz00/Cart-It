import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/landing.css';

const LandingPage = () => {
  return (
    <div className="landing-container">
      {/* Navbar with logo */}
      <header className="landing-header">
        <div className="flex items-center">
          <img src="/logo.png" alt="Cart-It Logo" className="logo-img" />
        </div>
      </header>

      {/* Hero: Main value proposition section */}
      <section className="hero-section">
        <div className="hero-overlay"></div> 
        <div className="hero-content">
          <h1 className="hero-title">Save It. Track It. Cart It.</h1>
          <p className="hero-subtitle">Save items, track prices, and organize everything effortlessly.</p>
          <div className="hero-buttons">
            <Link to="/signup" className="btn-register">Register</Link>
            <Link to="/login" className="btn-login">Login</Link>
          </div>
        </div>
      </section>

      {/* How it works: 3-step process cards */}
      <section className="section-padding">
        <div className="steps-wrapper">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Easily save, track, and manage your shopping in just a few steps.</p>
          
          <div className="steps-grid">
            <div className="step-card">
              <span className="step-number from-orange-400 to-red-500">1</span>
              <h3 className="step-title">Add Items from Any Website</h3>
              <p className="step-desc">Use the Cart-It extension to save products instantly</p>
            </div>
            <div className="step-card">
              <span className="step-number from-purple-400 to-blue-500">2</span>
              <h3 className="step-title">Save & Organize</h3>
              <p className="step-desc">Organize items into groups and add notes</p>
            </div>
            <div className="step-card">
              <span className="step-number from-blue-400 to-orange-500">3</span>
              <h3 className="step-title">Track & Decide</h3>
              <p className="step-desc">Track prices and purchase when ready</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features: Grid display of value add-ons */}
      <section className="features-section">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="features-main-title">Why Choose Cart-It?</h2>
          <p className="features-main-subtitle">A smarter way to save, organize, and track your online shopping.</p>
          
          <div className="features-grid">
            <FeatureCard icon="🛒" title="Save from Any Website" desc="Quickly save products from any online store in one place" />
            <FeatureCard icon="🔔" title="Track Price Drops" desc="Get notified when prices change so you can buy at the right time" />
            <FeatureCard icon="📂" title="Stay Organized" desc="Group items into custom lists for a clean and simple shopping experience" />
            <FeatureCard icon="📝" title="Add Personal Notes" desc="Keep track of sizing, quality, and past experiences" />
            <FeatureCard icon="👥" title="Share & Collaborate" desc="Create shared lists and shop together with friends or family" />
            <FeatureCard icon="📈" title="Shop Smarter" desc="Make better buying decisions with everything in one place" />
          </div>

          {/* Call to Action: Download extension button */}
          <div className="mt-16">
            <button
              type="button"
              className="download-btn"
              onClick={() => window.open("/extension-install.html", "_blank", "noopener,noreferrer")}
            >
              Download Cart-It Extension
            </button>
          </div>
          <p className="mt-10 text-center text-sm text-slate-500">
            <Link to="/privacy" className="font-semibold text-orange-700 underline decoration-orange-200 underline-offset-2 hover:text-orange-900">
              Privacy Policy
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
};

// Reusable card component for the features grid
const FeatureCard = ({ icon, title, desc }) => (
  <div className="feature-card">
    <div className="feature-icon">{icon}</div>
    <h4 className="feature-title">{title}</h4>
    <p className="feature-desc">{desc}</p>
  </div>
);

export default LandingPage;