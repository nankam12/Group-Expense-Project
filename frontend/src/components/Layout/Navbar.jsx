import React from 'react';
import { useAuth } from '../../context/AuthContext';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="menu-btn" onClick={onMenuClick} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
        <div className="navbar-brand">
          <span className="brand-icon">💰</span>
          SplitEase
        </div>
      </div>

      <div className="navbar-right">
        <div className="user-chip">
          <div className="user-avatar-sm">{initial}</div>
          <span className="user-chip-name">{user?.name}</span>
        </div>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
