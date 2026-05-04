import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Sidebar from './sidebar'; 
import '../styles/analytics.css';
import { getAnalytics, getWishlists } from '../services/api';
import { LuArrowLeft } from 'react-icons/lu';

/**
 * SpendingAnalytics Component
 * Provides a visual dashboard for user spending habits, including 
 * categorical and retailer-based breakdowns using Recharts.
 */

const SpendingAnalytics = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('week'); // Filters data by 'week', 'month', or 'year'
  const [data, setData] = useState({ total: 0, byRetailer: [], byCategory: [] }); // Core analytics storage
  const [focus, setFocus] = useState('retailer'); // Determines which data set is featured in the Pie Chart
  const [sidebarWishlists, setSidebarWishlists] = useState([]); // Prop data for Sidebar navigation

  // Use effect to fetch analytics and wishlist metadata. Redirects to login if user session is not found in localStorage.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) return navigate('/login');
        const user = JSON.parse(savedUser);

        // Fetch spending data based on the currently selected timeframe
        const analyticsJson = await getAnalytics(user.user_id, activeView);
        
        // Fetch wishlists to keep the Sidebar updated
        const wishlistJson = await getWishlists(user.user_id);

        setData({
          total: analyticsJson.total || 0,
          byRetailer: analyticsJson.byRetailer || [],
          byCategory: analyticsJson.byCategory || []
        });
        setSidebarWishlists(wishlistJson);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [activeView, navigate]);

  // Helper function to render a placeholder when data arrays are empty.
  const renderEmptyState = (message) => (
    <div className="empty-state-wrapper">
      <p className="empty-state-text">{message}</p>
    </div>
  );

  // Verification check to determine if chart rendering should be skipped or shown
  const hasData = data.total > 0;

  return (
    <div className="page-wrapper">
      {/* Sidebar navigation integrated with application wishlists */}
      <div className="sidebar-container-wrapper">
        <Sidebar wishlists={sidebarWishlists} showExtension={false} />
      </div>
      
      <main className="detail-main">
        {/* Navigation control to return to the main dashboard */}
        <button onClick={() => navigate('/dashboard')} className="back-link">
          <LuArrowLeft /> Back to Dashboard
        </button>

        <header className="analytics-header">
          <div>
            <h1 className="wishlist-title">Your Spending Analytics</h1>
            <p className="subtitle">Track your long-term shopping trends.</p>
          </div>
          
          {/* Timeframe toggle buttons (Week/Month/Year) */}
          <div className="toggle-group">
            {['week', 'month', 'year'].map((v) => (
              <button 
                key={v}
                className={activeView === v ? 'active' : ''} 
                onClick={() => setActiveView(v)}
              >
                This {v}
              </button>
            ))}
          </div>
        </header>

        {/* High-level financial summary */}
        <section className="stats-summary">
          <p className="total-label">Total amount spent</p>
          <h2 className="total-amount">${Number(data.total).toFixed(2)}</h2>
        </section>

        <section className="charts-grid items-start">
          {/* Bar Chart Section: Compares Retailers vs. Categories */}
          <div className="chart-card">
            <div onClick={() => setFocus('retailer')} className="cursor-pointer mb-12 group">
              <h3 className={`card-header transition-colors ${focus === 'retailer' ? 'text-[#DB8046]' : 'text-gray-400'}`}>Spend by Retailer</h3>
              {data.byRetailer.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.byRetailer}>
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        tick={{fontSize: 10}} 
                        hide={data.byRetailer.every(item => item.value <= 0)} 
                      />
                      <Tooltip 
                        formatter={(value) => `$${Number(value).toFixed(2)}`}
                        cursor={{fill: 'rgba(219, 128, 70, 0.05)'}} 
                      />
                      <Bar dataKey="value" fill="#DB8046" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : renderEmptyState("No retailer data for this period")}
            </div>

            <div onClick={() => setFocus('category')} className="cursor-pointer group">
              <h3 className={`card-header transition-colors ${focus === 'category' ? 'text-[#4A103D]' : 'text-gray-400'}`}>Spend by Category</h3>
              {data.byCategory.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.byCategory}>
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        tick={{fontSize: 10}} 
                        hide={data.byCategory.every(item => item.value <= 0)} 
                      />
                      <Tooltip 
                        formatter={(value) => `$${Number(value).toFixed(2)}`}
                        cursor={{fill: 'rgba(74, 16, 61, 0.05)'}} 
                      />
                      <Bar dataKey="value" fill="#4A103D" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : renderEmptyState("No category data for this period")}
            </div>
          </div>

          {/* Pie Chart Section: Visualizes percentage of total spend */}
          <div className="chart-card pie-card-min-height flex flex-col">
            <div className="w-full text-left mb-8">
              <h3 className="card-header">Global Breakdown</h3>
              <p className="focus-indicator">Viewing by {focus}</p>
            </div>
            
            <div className="flex-1 flex items-center justify-center w-full">
              {hasData ? (
                <div className="h-96 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart key={focus}>
                      <Pie
                        data={focus === 'retailer' ? data.byRetailer : data.byCategory}
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={2} 
                        dataKey="value"
                        stroke="none"
                        animationDuration={750}
                      >
                        {(focus === 'retailer' ? data.byRetailer : data.byCategory).map((entry, index) => {
                          const categoryColors = ['#4A103D', '#718096', '#2D3748', '#DB8046'];
                          const retailerColors = ['#DB8046', '#4A103D', '#718096', '#2D3748'];
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={focus === 'retailer' ? retailerColors[index % 4] : categoryColors[index % 4]} 
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => {
                          const percentage = ((value / data.total) * 100).toFixed(1);
                          return [`$${Number(value).toFixed(2)} (${percentage}%)`, name];
                        }} 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="w-full">
                  {renderEmptyState("Nothing to break down yet")}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SpendingAnalytics;