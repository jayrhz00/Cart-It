import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/landing-page';
import Login from './components/login';
import Signup from './components/signup';
import ForgotPassword from './components/forgot-password';
import ResetPassword from './components/reset-password';
import Dashboard from './components/dashboard';
import WishlistCategoryPage from './components/wishlist-category';
import CartPage from './components/cart-page';
import SpendingAnalyticsPage from './components/spending-analytics';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/wishlist/:groupId" element={<WishlistCategoryPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/analytics" element={<SpendingAnalyticsPage />} />
      </Routes>
    </Router>
  );
}

export default App;