/**
 * SeverityBadge Component
 *
 * Displays severity level with color coding for security findings.
 * Supports: Critical, High, Medium, Low
 *
 * @param {string} props.severity - Severity level: 'Critical' | 'High' | 'Medium' | 'Low'
 * @param {string} props.size - Badge size: 'sm' | 'md' (default) | 'lg'
 * @param {boolean} props.filled - Use filled background instead of outline
 */

import React from 'react';

const SEVERITY_COLORS = {
  Critical: {
    color: '#EF4545',
    bg: '#EF454512',
    border: '#EF4545'
  },
  High: {
    color: '#F5A623',
    bg: '#F5A62312',
    border: '#F5A623'
  },
  Medium: {
    color: '#3B9EFF',
    bg: '#3B9EFF12',
    border: '#3B9EFF'
  },
  Low: {
    color: '#0FBB80',
    bg: '#0FBB8012',
    border: '#0FBB80'
  }
};

const SeverityBadge = ({ severity, size = 'md', filled = false }) => {
  const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.Low;
  const fontSize = size === 'sm' ? 9 : size === 'lg' ? 13 : 11;
  const padding = size === 'sm' ? '1px 6px' : size === 'lg' ? '4px 12px' : '2px 8px';

  return (
    <span
      style={{
        color: filled ? '#FFFFFF' : colors.color,
        fontSize: fontSize,
        fontWeight: 700,
        background: filled ? colors.color : colors.bg,
        border: filled ? 'none' : `1px solid ${colors.border}`,
        borderRadius: 5,
        padding: padding,
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        whiteSpace: 'nowrap'
      }}
    >
      {severity}
    </span>
  );
};

export default SeverityBadge;
