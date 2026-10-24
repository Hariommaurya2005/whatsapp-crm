import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/leads', icon: 'leads', label: 'Leads' },
  { to: '/chats', icon: 'chats', label: 'Chats' },
  { to: '/meetings', icon: 'meetings', label: 'Meetings' },
  { to: '/knowledge-base', icon: 'knowledge', label: 'Knowledge Base' },
  { to: '/reminders', icon: 'reminders', label: 'Reminders' },
];

const ADMIN_NAV_ITEMS = [
  { to: '/users', icon: 'users', label: 'Users' },
];

const SidebarIcon = ({ name }) => {
  const shared = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' };
  const paths = {
    dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="4" rx="1.5" /><rect x="13.5" y="10.5" width="7" height="10" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    leads: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" /><circle cx="9.5" cy="7.5" r="4" /><path d="M17 11a4 4 0 0 0 0-7.7M21 20v-1.5a4 4 0 0 0-2.8-3.8" /></>,
    chats: <><path d="M20.5 11.5a7.8 7.8 0 0 1-.9 3.6 8 8 0 0 1-7.1 4.4 7.8 7.8 0 0 1-3.6-.9L3 20l1.4-5.9a7.8 7.8 0 0 1-.9-3.6 8 8 0 0 1 4.4-7.1 7.8 7.8 0 0 1 3.6-.9h.5a8 8 0 0 1 7.6 7.6z" /></>,
    meetings: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h3M8 16.5h3M14 13h2.5" /></>,
    knowledge: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8M8 10h7" /></>,
    reminders: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20v-1.3A4.7 4.7 0 0 1 7.2 14h3.6a4.7 4.7 0 0 1 4.7 4.7V20M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.3a4.7 4.7 0 0 1 3.5 4.4V20" /></>,
  };
  return <svg {...shared}>{paths[name] || paths.dashboard}</svg>;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderNavItem = ({ to, icon, label }) => (
    <NavLink
      key={to}
      to={to}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
    >
      <span className="sidebar-link-icon"><SidebarIcon name={icon} /></span>
      {!collapsed && <span className="sidebar-link-label">{label}</span>}
    </NavLink>
  );

  return (
    <nav className={`sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Main navigation">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark" aria-hidden="true">W</div>
        {!collapsed && (
          <div className="sidebar-brand-copy">
            <span className="sidebar-brand-name">WhatsApp CRM</span>
            <span className="sidebar-brand-caption">CUSTOMER WORKSPACE</span>
          </div>
        )}
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((p) => !p)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <div className="sidebar-nav">
        <div className="sidebar-section-label">WORKSPACE</div>
        {NAV_ITEMS.map(renderNavItem)}
        {user?.role === 'admin' && (
          <>
            <div className="sidebar-section-label sidebar-section-admin">ADMINISTRATION</div>
            {ADMIN_NAV_ITEMS.map(renderNavItem)}
          </>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user-avatar" aria-hidden="true">
          {(user?.name || 'U').trim().charAt(0).toUpperCase()}
        </div>
        {!collapsed && (
          <div className="sidebar-user-info">
            <div className="sidebar-user-name" title={user?.name}>{user?.name}</div>
            <div className="sidebar-user-role">{user?.role || 'member'}</div>
          </div>
        )}
        <button type="button" className="sidebar-logout-btn" onClick={handleLogout} title="Logout" aria-label="Logout">
          <span aria-hidden="true">↗</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
