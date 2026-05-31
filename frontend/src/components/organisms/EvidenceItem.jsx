/**
 * EvidenceItem Component
 *
 * Displays evidence record with file info, status, and actions.
 * Used for compliance evidence and audit documentation.
 *
 * @param {Object} props.evidence - Evidence data object
 * @param {function} props.onClick - Click callback
 * @param {function} props.onDownload - Download callback
 * @param {function} props.onDelete - Delete callback
 */

import React from 'react';
import StatusIcon from '../atoms/StatusIcon';
import Badge from '../atoms/Badge';
import ActionMenu from '../molecules/ActionMenu';
import { formatFileSize, formatDateRelative } from '../shared/formatters';

const EvidenceItem = ({ evidence, onClick, onDownload, onDelete }) => {
  const actions = [
    {
      id: 'view',
      label: 'View',
      icon: '👁️',
      onClick: onClick
    },
    {
      id: 'download',
      label: 'Download',
      icon: '⬇️',
      onClick: onDownload
    },
    { divider: true },
    {
      id: 'delete',
      label: 'Delete',
      icon: '🗑️',
      danger: true,
      onClick: onDelete
    }
  ];

  const getFileIcon = (type) => {
    const iconMap = {
      'application/pdf': '📄',
      'image/png': '🖼️',
      'image/jpeg': '🖼️',
      'application/vnd.ms-excel': '📊',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
      'application/msword': '📝',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
      'text/plain': '📃',
      'application/zip': '📦'
    };
    return iconMap[type] || '📎';
  };

  return (
    <div
      onClick={onClick}
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 6,
        padding: 12,
        backgroundColor: '#FFFFFF',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        ':hover': {
          borderColor: '#D1D5DB',
          backgroundColor: '#F9FAFB'
        }
      }}
      onMouseOver={(e) => {
        e.target.style.borderColor = '#D1D5DB';
        e.target.style.backgroundColor = '#F9FAFB';
      }}
      onMouseOut={(e) => {
        e.target.style.borderColor = '#E5E7EB';
        e.target.style.backgroundColor = '#FFFFFF';
      }}
    >
      {/* File icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 6,
          backgroundColor: '#F3F4F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0
        }}
      >
        {getFileIcon(evidence.fileType)}
      </div>

      {/* File info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#111827',
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {evidence.name || evidence.fileName}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            fontSize: 10,
            color: '#6B7280',
            alignItems: 'center'
          }}
        >
          <span>{formatFileSize(evidence.size)}</span>
          {evidence.uploadedDate && (
            <span>Uploaded {formatDateRelative(evidence.uploadedDate)}</span>
          )}
          {evidence.controlRef && (
            <Badge variant="info" style={{ fontSize: 8 }}>
              {evidence.controlRef}
            </Badge>
          )}
        </div>
      </div>

      {/* Status */}
      {evidence.status && (
        <div style={{ flexShrink: 0 }}>
          <StatusIcon status={evidence.status} size={14} />
        </div>
      )}

      {/* Actions */}
      <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        <ActionMenu actions={actions} size="sm" />
      </div>
    </div>
  );
};

export default EvidenceItem;
