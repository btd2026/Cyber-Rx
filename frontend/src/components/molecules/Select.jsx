/**
 * Select Component
 *
 * Reusable select dropdown with label and validation.
 * Supports single and multiple selection modes.
 *
 * @param {string} props.label - Select label
 * @param {Array} props.options - Options array { value, label, disabled }
 * @param {string|Array} props.value - Selected value(s)
 * @param {function} props.onChange - Change callback
 * @param {boolean} props.required - Required field indicator
 * @param {string} props.error - Error message
 * @param {string} props.helperText - Helper text
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.multiple - Multiple selection mode
 * @param {string} props.placeholder - Placeholder text
 */

import React from 'react';

const Select = ({
  label,
  options = [],
  value,
  onChange,
  required = false,
  error,
  helperText,
  disabled = false,
  multiple = false,
  placeholder = 'Select...'
}) => {
  const handleChange = (e) => {
    if (multiple) {
      const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
      onChange(selected);
    } else {
      onChange(e.target.value);
    }
  };

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

      {/* Select */}
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        multiple={multiple}
        style={{
          width: '100%',
          border: error ? '1px solid #EF4545' : '1px solid #D1D5DB',
          borderRadius: 6,
          padding: multiple ? '8px 12px' : '8px 32px 8px 12px',
          fontSize: 12,
          backgroundColor: disabled ? '#F3F4F6' : '#FFFFFF',
          color: disabled ? '#9CA3AF' : '#111827',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          appearance: 'none',
          backgroundImage: multiple
            ? 'none'
            : "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"12\" viewBox=\"0 0 12 12\"><path fill=\"%236B7280\" d=\"M6 9L1 4h10z\"/></svg>')",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          ...(multiple && { height: 'auto', minHeight: 80 })
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
      >
        {!multiple && (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

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

export default Select;
