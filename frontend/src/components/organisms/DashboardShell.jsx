/**
 * DashboardShell Component
 *
 * Main dashboard layout with sidebar, header, and content area.
 * Provides consistent structure for all dashboard pages.
 *
 * @param {Array} props.navItems - Navigation items configuration
 * @param {string} props.activeNav - Currently active nav item
 * @param {ReactNode} props.children - Dashboard content
 * @param {ReactNode} props.header - Custom header content
 * @param {function} props.onNavClick - Navigation click handler
 */

import React, { useState } from 'react';

const DashboardShell = ({
  navItems = [],
  activeNav,
  children,
  header,
  onNavClick
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#F8FAFC',
        overflow: 'hidden'
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: sidebarCollapsed ? 60 : 240,
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          overflow: 'hidden'
        }}
      >
        {/* Logo/Brand */}
        <div
          style={{
            padding: sidebarCollapsed ? '16px 12px' : '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            height: 60
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: '#0891B2',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              color: '#FFFFFF',
              fontWeight: 700,
              flexShrink: 0
            }}
          >
            C
          </div>
          {!sidebarCollapsed && (
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#0F172A'
              }}
            >
              CyberRx
            </div>
          )}
        </div>

        {/* Navigation */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: sidebarCollapsed ? '8px 6px' : '8px 12px'
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavClick?.(item.id)}
              style={{
                width: '100%',
                padding: sidebarCollapsed ? '10px' : '10px 12px',
                marginBottom: 2,
                backgroundColor: activeNav === item.id ? '#0891B210' : 'transparent',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: sidebarCollapsed ? 0 : 10,
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                transition: 'background-color 0.15s ease',
                ':hover': {
                  backgroundColor: activeNav === item.id ? '#0891B215' : '#F1F5F9'
                }
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor =
                  activeNav === item.id ? '#0891B215' : '#F1F5F9';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor =
                  activeNav === item.id ? '#0891B210' : 'transparent';
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  lineHeight: 1,
                  color: activeNav === item.id ? '#0891B2' : '#64748B',
                  minWidth: 24,
                  textAlign: 'center'
                }}
              >
                {item.icon}
              </span>
              {!sidebarCollapsed && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: activeNav === item.id ? 600 : 500,
                    color: activeNav === item.id ? '#0891B2' : '#64748B',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            padding: '12px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            gap: 10,
            color: '#64748B',
            fontSize: 10,
            transition: 'color 0.15s ease',
            ':hover': { color: '#0891B2' }
          }}
          onMouseOver={(e) => {
            e.target.style.color = '#0891B2';
          }}
          onMouseOut={(e) => {
            e.target.style.color = '#64748B';
          }}
        >
          <span style={{ fontSize: 16, minWidth: 24, textAlign: 'center' }}>
            {sidebarCollapsed ? '→' : '←'}
          </span>
          {!sidebarCollapsed && 'Collapse'}
        </button>
      </div>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        {header || (
          <div
            style={{
              height: 60,
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <button
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                🔔
              </button>
              <div
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: '#0891B2',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                U
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardShell;
