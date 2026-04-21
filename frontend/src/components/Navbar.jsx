import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, Video, Upload, BarChart3, Home } from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/detect', icon: Video, label: 'Live Detection' },
  { path: '/upload', icon: Upload, label: 'Image Upload' },
  { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
];

export default function Navbar() {
  return (
    <nav className="navbar" id="main-navbar">
      <div className="nav-brand">
        <Shield size={28} className="brand-icon" />
        <span className="brand-text">Face Shield AI</span>
      </div>

      <ul className="nav-links">
        {navItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              end={item.path === '/'}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
