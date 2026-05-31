/**
 * Button Component
 *
 * Reusable button component with variants, sizes, and states.
 * Supports primary, secondary, outline, and ghost variants.
 *
 * @param {ReactNode} props.children - Button content
 * @param {string} props.variant - Button style: 'primary' | 'secondary' | 'outline' | 'ghost'
 * @param {string} props.size - Button size: 'sm' | 'md' (default) | 'lg'
 * @param {boolean} props.disabled - Disabled state
 * @param {function} props.onClick - Click handler
 * @param {string} props.type - Button type: 'button' | 'submit' | 'reset'
 * @param {boolean} props.loading - Show loading state
 */

import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  style,
  ...rest
}) => {
  // Variant styles
  const variants = {
    primary: {
      backgroundColor: disabled || loading ? '#9CA3AF' : '#2563EB',
      color: '#FFFFFF',
      border: 'none'
    },
    secondary: {
      backgroundColor: disabled || loading ? '#E5E7EB' : '#6B7280',
      color: '#FFFFFF',
      border: 'none'
    },
    outline: {
      backgroundColor: 'transparent',
      color: disabled ? '#9CA3AF' : '#374151',
      border: '1px solid #D1D5DB'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: disabled ? '#9CA3AF' : '#6B7280',
      border: 'none'
    },
    danger: {
      backgroundColor: disabled || loading ? '#FCA5A5' : '#EF4545',
      color: '#FFFFFF',
      border: 'none'
    }
  };

  // Size styles
  const sizes = {
    sm: {
      padding: '4px 8px',
      fontSize: 9,
      fontWeight: 600,
      borderRadius: 5
    },
    md: {
      padding: '8px 16px',
      fontSize: 11,
      fontWeight: 600,
      borderRadius: 6
    },
    lg: {
      padding: '12px 24px',
      fontSize: 13,
      fontWeight: 700,
      borderRadius: 8
    }
  };

  const baseStyle = {
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: disabled || loading ? 0.7 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  };

  const variantStyle = variants[variant] || variants.primary;
  const sizeStyle = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      onClick={!disabled && !loading ? onClick : undefined}
      disabled={disabled || loading}
      style={{
        ...baseStyle,
        ...variantStyle,
        ...sizeStyle,
        ...style
      }}
      {...rest}
    >
      {loading && (
        <span
          style={{
            display: 'inline-block',
            animation: 'spin 1s linear infinite',
            fontSize: '0.8em'
          }}
        >
          ⟳
        </span>
      )}
      {children}
    </button>
  );
};

export default Button;
