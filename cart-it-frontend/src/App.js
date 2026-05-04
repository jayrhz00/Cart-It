import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/landing-page';
import Login from './components/login';
import Signup from './components/signup';
import Dashboard from './components/dashboard';
import Wishlist from './components/wishlist';
import PublicWishlist from './components/public-wishlist';
import Cart from './components/cart';
import PublicCart from './components/public-cart';
import SpendingAnalytics from './components/analytics';
import ItemDetailModal from './components/item-modal';
import ResetPassword from './components/reset-password';

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
        <Route path="/share/:token" element={<PublicCart />} />
        <Route path="/analytics" element={<SpendingAnalytics />} />
        <Route path="/item/:id" element={<ItemDetailModal />} /> 
        <Route path="/share-wishlist/:shareToken/:wishlistId" element={<PublicWishlist />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Routes>
    </Router>
  );
}

export default App;