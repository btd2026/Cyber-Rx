/**
 * Input Component
 *
 * Reusable input field with label, validation, and helper text.
 * Supports text, number, email, password, and date types.
 *
 * @param {string} props.label - Input label
 * @param {string} props.type - Input type: 'text' | 'number' | 'email' | 'password' | 'date'
 * @param {string} props.value - Input value
 * @param {function} props.onChange - Change callback
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Required field indicator
 * @param {string} props.error - Error message
 * @param {string} props.helperText - Helper text below input
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.size - Input size: 'sm' | 'md' (default) | 'lg'
 */

import React from 'react';

const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helperText,
  disabled = false,
  size = 'md',
  style,
  ...rest
}) => {
  const sizes = {
    sm: {
      padding: '6px 10px',
      fontSize: 11,
      borderRadius: 5
    },
    md: {
      padding: '8px 12px',
      fontSize: 12,
      borderRadius: 6
    },
    lg: {
      padding: '10px 14px',
      fontSize: 13,
      borderRadius: 7
    }
  };

  const sizeStyle = sizes[size] || sizes.md;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Label */}
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            color: '#374151',
            marginBottom: 6
          }}
        >
          {label}
          {required && (
            <span style={{ color: '#EF4545', marginLeft: 2 }}>*</span>
          )}
        </label>
      )}

      {/* Input */}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          border: error ? '1px solid #EF4545' : '1px solid #D1D5DB',
          borderRadius: sizeStyle.borderRadius,
          padding: sizeStyle.padding,
          fontSize: sizeStyle.fontSize,
          backgroundColor: disabled ? '#F3F4F6' : '#FFFFFF',
          color: disabled ? '#9CA3AF' : '#111827',
          outline: 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          boxSizing: 'border-box',
          ...style
        }}
        onFocus={(e) => {
          if (!disabled && !error) {
            e.target.style.borderColor = '#3B9EFF';
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 255, 0.1)';
          }
        }}
        onBlur={(e) => {
          if (!error) {
            e.target.style.borderColor = '#D1D5DB';
            e.target.style.boxShadow = 'none';
          }
        }}
        {...rest}
      />

      {/* Helper text / Error */}
      {(error || helperText) && (
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            color: error ? '#EF4545' : '#6B7280',
            minHeight: 14
          }}
        >
          {error || helperText}
        </div>
      )}
    </div>
  );
};

export default Input;
