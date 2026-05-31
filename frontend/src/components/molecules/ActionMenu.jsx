/**
 * ActionMenu Component
 *
 * Dropdown menu for row actions and contextual actions.
 * Supports icons, dividers, and nested actions.
 *
 * @param {Array} props.actions - Action configuration array
 * @param {boolean} props.disabled - Disable all actions
 * @param {string} props.size - Menu size: 'sm' | 'md' (default) | 'lg'
 * @param {string} props.variant - Button variant: 'icon' | 'text' | 'button'
 */

import React, { useState, useRef, useEffect } from 'react';

const ActionMenu = ({ actions = [], disabled = false, size = 'md', variant = 'icon' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!actions || actions.length === 0) {
    return null;
  }

  const buttonSizes = {
    sm: { padding: '4px', fontSize: 12 },
    md: { padding: '6px', fontSize: 14 },
    lg: { padding: '8px', fontSize: 16 }
  };

  const buttonSize = buttonSizes[size] || buttonSizes.md;

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          padding: buttonSize.padding,
          fontSize: buttonSize.fontSize,
          backgroundColor: 'transparent',
          border: variant === 'button' ? '1px solid #D1D5DB' : 'none',
          borderRadius: variant === 'button' ? 5 : 4,
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: disabled ? '#9CA3AF' : '#6B7280',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.15s ease',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ':hover': !disabled
            ? {
                backgroundColor: variant === 'button' ? '#F3F4F6' : 'transparent',
                color: '#374151'
              }
            : {}
        }}
        onMouseOver={(e) => {
          if (!disabled) {
            e.target.style.backgroundColor = variant === 'button' ? '#F3F4F6' : '#F3F4F6';
            e.target.style.color = '#374151';
          }
        }}
        onMouseOut={(e) => {
          if (!disabled) {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = '#6B7280';
          }
        }}
      >
        {variant === 'text' ? 'Actions' : '⋯'}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 4,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            minWidth: 180,
            maxHeight: 300,
            overflowY: 'auto',
            padding: '4px 0'
          }}
        >
          {actions.map((action, index) => {
            if (action.divider) {
              return (
                <div
                  key={`divider-${index}`}
                  style={{
                    height: 1,
                    backgroundColor: '#E5E7EB',
                    margin: '4px 0'
                  }}
                />
              );
            }

            return (
              <button
                key={action.id || index}
                onClick={() => {
                  if (!action.disabled && action.onClick) {
                    action.onClick();
                    setIsOpen(false);
                  }
                }}
                disabled={action.disabled}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 11,
                  backgroundColor: action.disabled ? '#F3F4F6' : 'transparent',
                  border: 'none',
                  color: action.disabled ? '#9CA3AF' : action.danger ? '#EF4545' : '#374151',
                  cursor: action.disabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  textAlign: 'left',
                  transition: 'background-color 0.15s ease',
                  ':hover': !action.disabled
                    ? {
                        backgroundColor: action.danger ? '#FEF2F2' : '#F9FAFB'
                      }
                    : {}
                }}
                onMouseOver={(e) => {
                  if (!action.disabled) {
                    e.target.style.backgroundColor = action.danger
                      ? '#FEF2F2'
                      : '#F9FAFB';
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                {action.icon && (
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{action.icon}</span>
                )}
                <span style={{ flex: 1 }}>{action.label}</span>
                {action.shortcut && (
                  <span style={{ fontSize: 9, color: '#9CA3AF', opacity: 0.7 }}>
                    {action.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
