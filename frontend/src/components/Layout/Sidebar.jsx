import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/',         label: 'Dashboard', icon: '📊' },
  { path: '/expenses', label: 'Expenses',  icon: '💳' },
  { path: '/friends',  label: 'Friends',   icon: '👥' },
  { path: '/payments', label: 'Payments',  icon: '💸' },
];

const Sidebar = ({ isOpen, onClose }) => (
  <>
    {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
    <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            onClick={onClose}
          >
            <span className="sidebar-icon">{icon}</span>
            <span className="sidebar-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  </>
);

export default Sidebar;
