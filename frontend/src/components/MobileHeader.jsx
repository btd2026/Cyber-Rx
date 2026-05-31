/**
 * MobileHeader Component
 *
 * Sticky header for mobile views with hamburger menu,
 * title, and refresh button.
 *
 * @param {string} props.title - Header title
 * @param {function} props.onMenuClick - Menu button callback
 * @param {function} props.onRefresh - Refresh button callback
 * @param {boolean} props.refreshing - Refresh status
 * @param {string} props.badge - Optional badge text
 */

import React from 'react';

const MobileHeader = ({
  title = 'Dashboard',
  onMenuClick,
  onRefresh,
  refreshing = false,
  badge
}) => {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
        minHeight: 56
      }}
    >
      {/* Menu Button */}
      <button
        onClick={onMenuClick}
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
        ☰
      </button>

      {/* Title */}
      <div style={{ flex: 1, textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#111827',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {title}
        </h1>
        {badge && (
          <div style={{
            display: 'inline-block',
            marginTop: 2,
            padding: '2px 8px',
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 600
          }}>
            {badge}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={refreshing}
        style={{
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: refreshing ? '#F3F4F6' : 'transparent',
          border: 'none',
          borderRadius: 8,
          cursor: refreshing ? 'not-allowed' : 'pointer',
          fontSize: 20,
          color: refreshing ? '#9CA3AF' : '#374151',
          transition: 'all 0.2s ease'
        }}
        onTouchStart={(e) => {
          if (!refreshing) {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
          }
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.backgroundColor = refreshing ? '#F3F4F6' : 'transparent';
        }}
      >
        {refreshing ? (
          <div style={{
            width: 20,
            height: 20,
            border: '2px solid #9CA3AF',
            borderTopColor: '#3B82F6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        ) : (
          '↻'
        )}
      </button>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
};

export default MobileHeader;
