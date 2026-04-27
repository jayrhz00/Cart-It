import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  LuArrowLeft, 
  LuFilter, 
  LuShare2, 
  LuPen, 
  LuUsers 
} from "react-icons/lu";
import Sidebar from './sidebar'; 
import '../styles/wishlist.css';

const Wishlist = () => {
  const { id } = useParams(); // Get wishlist ID from URL params
  const navigate = useNavigate(); // Navigation hook for redirecting
  
  // State initialization
  const [items, setItems] = useState([]);
  const [wishlists, setWishlists] = useState([]);
  // Need this state for stats and title to show up
  const [wishlistInfo, setWishlistInfo] = useState({ name: 'Loading...', total: '$0.00', lastUpdated: '...' });

  useEffect(() => {
    // Mock data - In the future, fetch this based on the 'id' param
    setWishlistInfo({ name: 'Shoes', total: '$900.00', lastUpdated: '4 hours ago' });
    
    setItems([
      { id: 1, name: 'High Heel Clogs', store: 'Free People', price: 100.00, img: '/hero1.png' },
      { id: 2, name: 'Classic Loafers', store: 'Gucci', price: 800.00, img: '/hero1.png' }
    ]);
    
    setWishlists([{ id: 1, name: 'Shoes' }]);
  }, [id]);

  return (
    <div className="page-wrapper">
      {/* Sidebar wrapper keeps width consistent */}
      <div className="sidebar-container-wrapper">
        <Sidebar wishlists={wishlists} showExtension={false} />
      </div>
      
      {/* Main content area handles its own scrolling */}
      <main className="detail-main">
        <header className="detail-header">
          <button onClick={() => navigate('/dashboard')} className="back-link">
            <LuArrowLeft /> Back to Wishlists
          </button>
          
          <div className="header-content">
            <h1 className="wishlist-title">{wishlistInfo.name}</h1>
            
            <div className="stats">
              <span>Total Price: <strong>{wishlistInfo.total}</strong></span>
              <span className="text-gray-300">•</span>
              <span>Updated {wishlistInfo.lastUpdated}</span>
            </div>
          </div>

          <div className="toolbar">
            <button className="tool-btn"><LuFilter size={16}/> Filter</button>
            <button className="tool-btn"><LuShare2 size={16}/> Share</button>
            <button className="tool-btn"><LuUsers size={16}/> Collab</button>
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

export default Wishlist;