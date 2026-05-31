/**
 * Badge Component
 *
 * Small count or status indicator badge.
 * Can be used standalone or nested within other components.
 *
 * @param {ReactNode} props.children - Badge content (number or text)
 * @param {string} props.variant - Color variant: 'default' | 'primary' | 'success' | 'warning' | 'danger'
 * @param {boolean} props.dot - Show as dot only
 * @param {boolean} props.overlap - Overlap with parent element
 */

import React from 'react';

const Badge = ({ children, variant = 'default', dot = false, overlap = false }) => {
  const variants = {
    default: {
      backgroundColor: '#6B7280',
      color: '#FFFFFF'
    },
    primary: {
      backgroundColor: '#3B9EFF',
      color: '#FFFFFF'
    },
    success: {
      backgroundColor: '#0FBB80',
      color: '#FFFFFF'
    },
    warning: {
      backgroundColor: '#F5A623',
      color: '#FFFFFF'
    },
    danger: {
      backgroundColor: '#EF4545',
      color: '#FFFFFF'
    },
    info: {
      backgroundColor: '#0891B2',
      color: '#FFFFFF'
    }
  };

  const style = variants[variant] || variants.default;

  if (dot) {
    return (
      <span
        style={{
          ...style,
          width: 8,
          height: 8,
          borderRadius: '50%',
          display: 'inline-block',
          position: overlap ? 'absolute' : 'relative',
          top: overlap ? -4 : 'auto',
          right: overlap ? -4 : 'auto'
        }}
      />
    );
  }

  return (
    <span
      style={{
        ...style,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        padding: '0 5px',
        fontSize: 10,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1
      }}
    >
      {children}
    </span>
  );
};

export default Badge;
