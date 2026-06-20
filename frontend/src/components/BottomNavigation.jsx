/**
 * BottomNavigation Component
 *
 * Fixed bottom navigation bar for mobile devices.
 * Provides quick access to key app sections.
 *
 * @param {string} props.currentRoute - Current active route
 * @param {function} props.onNavigate - Navigation callback
 */

import React from 'react';

const BottomNavigation = ({ currentRoute = '/', onNavigate }) => {
  const navItems = [
    { id: 'vendors', label: 'Vendors', icon: '🏢', route: '/vendors' },
    { id: 'alerts', label: 'Alerts', icon: '🔔', route: '/alerts' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊', route: '/dashboard' },
    { id: 'settings', label: 'Settings', icon: '⚙️', route: '/settings' }
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #ebecf0',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 0',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
        boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.05)',
        zIndex: 50,
        minHeight: 60
      }}
    >
      {navItems.map((item) => {
        const isActive = currentRoute.includes(item.route);

        return (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.route)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 12px',
              minHeight: 44,
              gap: 4,
              transition: 'all 0.2s ease',
              opacity: isActive ? 1 : 0.6
            }}
            onTouchStart={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.transform = 'scale(0.95)';
              }
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span
              style={{
                fontSize: 20,
                lineHeight: 1,
                filter: isActive ? 'none' : 'grayscale(100%)'
              }}
            >
              {item.icon}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#5e6ad2' : '#5c6066',
                textAlign: 'center',
                lineHeight: 1
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;
