/**
 * StatusIcon Component
 *
 * Displays status with icon and color coding for various UI states.
 * Supports: pending, approved, routed, complete, and custom statuses.
 *
 * @param {string} props.status - Status identifier
 * @param {string} props.label - Display label (optional, defaults to status)
 * @param {number} props.size - Icon size in pixels (default: 16)
 */

import React from 'react';

const STATUS_CONFIG = {
  pending_approval: {
    icon: '⏳',
    color: '#F5A623',
    label: 'Pending Approval'
  },
  approved: {
    icon: '✓',
    color: '#3B9EFF',
    label: 'Approved'
  },
  routed: {
    icon: '→',
    color: '#A78BFA',
    label: 'Routed'
  },
  complete: {
    icon: '✓',
    color: '#0FBB80',
    label: 'Complete'
  },
  pending: {
    icon: '⏳',
    color: '#F5A623',
    label: 'Pending'
  },
  in_progress: {
    icon: '⚙️',
    color: '#3B9EFF',
    label: 'In Progress'
  },
  error: {
    icon: '✗',
    color: '#EF4545',
    label: 'Error'
  },
  warning: {
    icon: '⚠️',
    color: '#F5A623',
    label: 'Warning'
  },
  success: {
    icon: '✓',
    color: '#0FBB80',
    label: 'Success'
  },
  connected: {
    icon: '●',
    color: '#0FBB80',
    label: 'Connected'
  },
  disconnected: {
    icon: '○',
    color: '#888888',
    label: 'Disconnected'
  },
  syncing: {
    icon: '⟳',
    color: '#F5A623',
    label: 'Syncing'
  }
};

const StatusIcon = ({ status, label, size = 16 }) => {
  const config = STATUS_CONFIG[status] || {
    icon: '•',
    color: '#888888',
    label: status || 'Unknown'
  };

  const displayLabel = label || config.label;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: size,
        color: config.color,
        fontWeight: 600
      }}
    >
      <span style={{ fontSize: size }}>{config.icon}</span>
      {displayLabel && (
        <span style={{ fontSize: size * 0.75 }}>{displayLabel}</span>
      )}
    </span>
  );
};

export default StatusIcon;
