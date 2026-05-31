/**
 * Tabs Component
 *
 * Tab navigation for organizing content into sections.
 * Supports horizontal and vertical orientations.
 *
 * @param {Array} props.tabs - Tab configuration array
 * @param {string} props.activeTab - Currently active tab ID
 * @param {function} props.onChange - Tab change callback
 * @param {string} props.variant - Tab style: 'line' | 'pill' | 'card'
 * @param {string} props.size - Tab size: 'sm' | 'md' (default) | 'lg'
 */

import React from 'react';

const Tabs = ({ tabs = [], activeTab, onChange, variant = 'line', size = 'md' }) => {
  const sizes = {
    sm: {
      padding: '6px 12px',
      fontSize: 10,
      gap: 4
    },
    md: {
      padding: '8px 16px',
      fontSize: 11,
      gap: 8
    },
    lg: {
      padding: '10px 20px',
      fontSize: 12,
      gap: 12
    }
  };

  const sizeStyle = sizes[size] || sizes.md;

  const variants = {
    line: {
      container: {
        borderBottom: '1px solid #E5E7EB',
        marginBottom: 16
      },
      tab: (isActive) => ({
        borderBottom: isActive ? '2px solid #0891B2' : '2px solid transparent',
        color: isActive ? '#0891B2' : '#6B7280',
        backgroundColor: 'transparent',
        borderRadius: 0,
        marginBottom: -1
      })
    },
    pill: {
      container: {
        backgroundColor: '#F3F4F6',
        padding: 4,
        borderRadius: 8,
        display: 'flex',
        gap: 4,
        marginBottom: 16
      },
      tab: (isActive) => ({
        backgroundColor: isActive ? '#FFFFFF' : 'transparent',
        color: isActive ? '#0891B2' : '#6B7280',
        border: isActive ? '1px solid #E5E7EB' : '1px solid transparent',
        borderRadius: 6,
        boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
      })
    },
    card: {
      container: {
        marginBottom: 16
      },
      tab: (isActive) => ({
        backgroundColor: isActive ? '#0891B2' : '#FFFFFF',
        color: isActive ? '#FFFFFF' : '#6B7280',
        border: isActive ? '1px solid #0891B2' : '1px solid #E5E7EB',
        borderRadius: 6
      })
    }
  };

  const variantStyle = variants[variant] || variants.line;

  return (
    <div>
      {/* Tab navigation */}
      <div style={variantStyle.container}>
        <div
          style={{
            display: 'flex',
            gap: variant === 'pill' ? 0 : 16
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const tabStyle = variantStyle.tab(isActive);

            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                disabled={tab.disabled}
                style={{
                  padding: sizeStyle.padding,
                  fontSize: sizeStyle.fontSize,
                  fontWeight: isActive ? 600 : 500,
                  cursor: tab.disabled ? 'not-allowed' : 'pointer',
                  opacity: tab.disabled ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: sizeStyle.gap,
                  border: 'none',
                  transition: 'all 0.15s ease',
                  ...tabStyle
                }}
                onMouseOver={(e) => {
                  if (!tab.disabled && !isActive) {
                    if (variant === 'line') {
                      e.target.style.color = '#0891B2';
                    } else if (variant === 'pill') {
                      e.target.style.backgroundColor = '#E5E7EB';
                    } else if (variant === 'card') {
                      e.target.style.backgroundColor = '#F9FAFB';
                      e.target.style.borderColor = '#D1D5DB';
                    }
                  }
                }}
                onMouseOut={(e) => {
                  if (!tab.disabled && !isActive) {
                    if (variant === 'line') {
                      e.target.style.color = '#6B7280';
                    } else if (variant === 'pill') {
                      e.target.style.backgroundColor = 'transparent';
                    } else if (variant === 'card') {
                      e.target.style.backgroundColor = '#FFFFFF';
                      e.target.style.borderColor = '#E5E7EB';
                    }
                  }
                }}
              >
                {tab.icon && (
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{tab.icon}</span>
                )}
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 10,
                      backgroundColor: isActive
                        ? 'rgba(255, 255, 255, 0.2)'
                        : '#F3F4F6',
                      color: isActive ? '#FFFFFF' : '#6B7280'
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {tabs.map((tab) => {
        if (tab.id !== activeTab) return null;
        return (
          <div key={tab.id}>
            {tab.content || tab.children}
          </div>
        );
      })}
    </div>
  );
};

export default Tabs;
