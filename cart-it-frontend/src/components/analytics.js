import React, { useState } from 'react';
import Sidebar from './sidebar'; 
import '../styles/analytics.css';

const SpendingAnalytics = () => {
  const [activeView, setActiveView] = useState('week'); // 'week' | 'month' | 'year'

  return (
    <div className="page-wrapper">
      <div className="sidebar-container-wrapper">
        <Sidebar wishlists={[{ id: 1, name: 'Shoes' }]} showExtension={false} />
      </div>
      
      <main className="detail-main">
        <header className="analytics-header">
          <div>
            <h1 className="wishlist-title">Your Spending Analytics</h1>
            <p className="subtitle">Track your long-term shopping trends.</p>
          </div>
          
          <div className="toggle-group">
            <button className={activeView === 'week' ? 'active' : ''} onClick={() => setActiveView('week')}>This week</button>
            <button className={activeView === 'year' ? 'active' : ''} onClick={() => setActiveView('year')}>This year</button>
            <button className={activeView === 'month' ? 'active' : ''} onClick={() => setActiveView('month')}>This month</button>
          </div>
        </header>

        <section className="stats-summary">
          <p className="total-label">Total amount spent</p>
          <h2 className="total-amount">$145.00</h2>
        </section>

        <section className="charts-grid">
          <div className="chart-card">
            <h3 className="card-header">Spend by product</h3>
            <div className="bar-chart-placeholder">
                <div className="bar"><div className="fill w-[90%]"></div></div>
                <div className="bar"><div className="fill w-[50%]"></div></div>
                <div className="bar"><div className="fill w-[70%]"></div></div>
            </div>
            
            <h3 className="card-header mt-8">Spend by retailer</h3>
            <div className="bar-chart-placeholder">
                <div className="bar"><div className="fill w-[40%]"></div></div>
                <div className="bar"><div className="fill w-[60%]"></div></div>
            </div>
          </div>

          <div className="chart-card pie-container">
            <h3 className="card-header">Breakdown</h3>
            <div className="pie-chart-placeholder">
               {/* This is where you would plug in Recharts or Chart.js */}
               <div className="pie-circle"></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SpendingAnalytics;