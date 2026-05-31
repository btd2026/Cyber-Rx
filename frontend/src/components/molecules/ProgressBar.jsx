/**
 * ProgressBar Component
 *
 * Visual progress indicator with percentage and color coding.
 * Supports determinate and indeterminate states.
 *
 * @param {number} props.value - Progress value (0-100)
 * @param {boolean} props.indeterminate - Show indeterminate animation
 * @param {string} props.color - Bar color (hex code)
 * @param {string} props.size - Bar height: 'sm' | 'md' (default) | 'lg'
 * @param {boolean} props.showLabel - Show percentage label
 * @param {string} props.label - Custom label text
 */

import React from 'react';

const ProgressBar = ({
  value,
  indeterminate = false,
  color,
  size = 'md',
  showLabel = true,
  label
}) => {
  // Color based on value
  const getColor = () => {
    if (color) return color;
    if (value >= 80) return '#0FBB80';
    if (value >= 60) return '#3B9EFF';
    if (value >= 40) return '#F5A623';
    return '#EF4545';
  };

  const barColor = getColor();

  const sizes = {
    sm: { height: 4, fontSize: 9 },
    md: { height: 6, fontSize: 10 },
    lg: { height: 8, fontSize: 11 }
  };

  const sizeStyle = sizes[size] || sizes.md;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
          gap: 8
        }}
      >
        {label && (
          <span style={{ fontSize: sizeStyle.fontSize, color: '#6B7280', fontWeight: 500 }}>
            {label}
          </span>
        )}
        {showLabel && !indeterminate && (
          <span style={{ fontSize: sizeStyle.fontSize, color: '#374151', fontWeight: 600 }}>
            {Math.round(value)}%
          </span>
        )}
      </div>

      <div
        style={{
          width: '100%',
          height: sizeStyle.height,
          backgroundColor: '#E5E7EB',
          borderRadius: sizeStyle.height / 2,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            height: '100%',
            width: indeterminate ? '100%' : `${Math.max(0, Math.min(100, value))}%`,
            backgroundColor: barColor,
            borderRadius: sizeStyle.height / 2,
            transition: indeterminate
              ? 'none'
              : 'width 0.3s ease, background-color 0.3s ease',
            animation: indeterminate ? 'progress-slide 1.5s ease-in-out infinite' : 'none'
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
