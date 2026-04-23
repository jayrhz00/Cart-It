import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuFilter, LuShare2, LuPen, LuArrowLeft } from "react-icons/lu"; // Added LuArrowLeft
import Sidebar from './sidebar'; 
import '../styles/wishlist.css';

const Cart = () => {
  const navigate = useNavigate(); // Now this will be "used"
  const [items, setItems] = useState([]);
  const [wishlists, setWishlists] = useState([]);
  const [cartInfo] = useState({ 
    total: '$2,325.50', 
    lastUpdated: '12 hours ago' 
  });

  useEffect(() => {
    setItems([
      { id: 1, name: 'High Heel Clogs', store: 'Free People', price: 100.00, img: '/hero1.png' },
      { id: 2, name: 'Button Up Jean Jacket', store: 'Zara', price: 150.00, img: '/hero1.png' },
      { id: 3, name: 'Summer Floral Midi Dress', store: 'Oh Polly', price: 75.50, img: '/hero1.png' }
    ]);
    setWishlists([{ id: 1, name: 'Shoes' }, { id: 2, name: 'Tech' }]);
  }, []);

  return (
    <div className="page-wrapper">
      <div className="sidebar-container-wrapper">
        <Sidebar wishlists={wishlists} showExtension={false} />
      </div>
      
      <main className="detail-main">
        <header className="detail-header">
          {/* This button now uses the 'navigate' hook, satisfying ESLint */}
          <button onClick={() => navigate('/dashboard')} className="back-link">
            <LuArrowLeft /> Back to Dashboard
          </button>

          <div className="header-content">
            <h1 className="wishlist-title">Cart</h1>
            
            <div className="stats">
              <span>Total Price: <strong>{cartInfo.total}</strong></span>
              <span className="text-gray-300">•</span>
              <span>Updated {cartInfo.lastUpdated}</span>
            </div>
          </div>

          <div className="toolbar">
            <button className="tool-btn"><LuFilter size={16}/> Filter</button>
            <button className="tool-btn"><LuShare2 size={16}/> Share</button>
            <button className="tool-btn edit"><LuPen size={16}/> Edit</button>
          </div>
        </header>

        <section className="item-grid">
          {items.map(item => (
            <div key={item.id} className="item-card">
              <div className="img-wrapper">
                <img src={item.img} alt={item.name} />
                <input type="checkbox" className="select-check" />
              </div>
              <div className="item-details">
                <p className="store">{item.store}</p>
                <h3 className="name">{item.name}</h3>
                <p className="price">${item.price.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Cart;