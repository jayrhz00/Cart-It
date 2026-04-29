import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/landing-page';
import Login from './components/login';
import Signup from './components/signup';
import Dashboard from './components/dashboard';
import Wishlist from './components/wishlist';
import Cart from './components/cart';
import SpendingAnalytics from './components/analytics';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/wishlist/:id" element={<Wishlist />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/analytics" element={<SpendingAnalytics />} />
      </Routes>
    </Router>
  );
}

export default App;