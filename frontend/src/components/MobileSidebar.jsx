/**
 * MobileSidebar Component
 *
 * Slide-in sidebar navigation for mobile devices.
 * Provides navigation links when menu button is pressed.
 *
 * @param {boolean} props.isOpen - Sidebar open state
 * @param {function} props.onClose - Close callback
 * @param {function} props.onNavigate - Navigation callback
 * @param {string} props.currentRoute - Current active route
 */

import React, { useEffect } from 'react';

const MobileSidebar = ({ isOpen = false, onClose, onNavigate, currentRoute = '/' }) => {
  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const navSections = [
    {
      title: 'Main',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', route: '/dashboard' },
        { id: 'vendors', label: 'Vendor Portfolio', icon: '🏢', route: '/vendors' },
        { id: 'alerts', label: 'Alert Center', icon: '🔔', route: '/alerts' }
      ]
    },
    {
      title: 'Analytics',
      items: [
        { id: 'trends', label: 'Risk Trends', icon: '📈', route: '/trends' },
        { id: 'reports', label: 'Reports', icon: '📄', route: '/reports' }
      ]
    },
    {
      title: 'Settings',
      items: [
        { id: 'settings', label: 'Settings', icon: '⚙️', route: '/settings' },
        { id: 'profile', label: 'Profile', icon: '👤', route: '/profile' }
      ]
    }
  ];

  const handleNavigate = (route) => {
    onNavigate?.(route);
    onClose?.();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99,
            transition: 'opacity 0.3s ease',
            opacity: isOpen ? 1 : 0
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          backgroundColor: '#FFFFFF',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
          zIndex: 100,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: 56
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#111827',
              margin: 0
            }}
          >
            Menu
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 24,
              color: '#374151',
              transition: 'background-color 0.2s ease'
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ✕
          </button>
        </div>

        {/* Navigation Sections */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {navSections.map((section) => (
            <div key={section.title} style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 8,
                  paddingLeft: 12
                }}
              >
                {section.title}
              </div>
              {section.items.map((item) => {
                const isActive = currentRoute.includes(item.route);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.route)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px',
                      backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      marginBottom: 4,
                      transition: 'background-color 0.2s ease',
                        minHeight: 48
                    }}
                    onTouchStart={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#F3F4F6';
                      }
                    }}
                    onTouchEnd={(e) => {
                      e.currentTarget.style.backgroundColor = isActive ? '#EFF6FF' : 'transparent';
                    }}
                  >
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#3B82F6' : '#374151',
                        textAlign: 'left',
                        flex: 1
                      }}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <div
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          backgroundColor: '#3B82F6'
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid #E5E7EB',
            fontSize: 11,
            color: '#9CA3AF',
            textAlign: 'center'
          }}
        >
          CyberRx v1.0.0
        </div>
      </aside>
    </>
  );
};

export default MobileSidebar;
