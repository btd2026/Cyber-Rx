/**
 * Tag Component
 *
 * Simple tag/label component for categorization and filtering.
 * Supports color coding and remove action.
 *
 * @param {ReactNode} props.children - Tag content
 * @param {string} props.color - Tag color (hex code)
 * @param {boolean} props.removable - Show remove button
 * @param {function} props.onRemove - Remove callback
 * @param {string} props.size - Tag size: 'sm' | 'md' (default) | 'lg'
 */

import React from 'react';

const Tag = ({ children, color = '#3B9EFF', removable = false, onRemove, size = 'md' }) => {
  const sizes = {
    sm: {
      padding: '2px 6px',
      fontSize: 8,
      borderRadius: 4,
      gap: 4
    },
    md: {
      padding: '4px 10px',
      fontSize: 10,
      borderRadius: 5,
      gap: 6
    },
    lg: {
      padding: '6px 12px',
      fontSize: 11,
      borderRadius: 6,
      gap: 8
    }
  };

  const sizeStyle = sizes[size] || sizes.md;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: `${color}15`,
        border: `1px solid ${color}30`,
        color: color,
        fontWeight: 600,
        ...sizeStyle
      }}
    >
      {children}
      {removable && (
        <button
          onClick={onRemove}
          style={{
            background: 'none',
            border: 'none',
            color: color,
            cursor: 'pointer',
            padding: 0,
            fontSize: '1.2em',
            lineHeight: 1,
            marginLeft: 2,
            opacity: 0.7,
            transition: 'opacity 0.2s ease'
          }}
          onMouseOver={(e) => (e.target.style.opacity = '1')}
          onMouseOut={(e) => (e.target.style.opacity = '0.7')}
        >
          ×
        </button>
      )}
    </span>
  );
};

export default Tag;
