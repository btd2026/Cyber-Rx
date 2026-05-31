/**
 * FindingCard Component
 *
 * Displays security finding with severity, status, and remediation info.
 * Used for vulnerabilities, compliance gaps, and security issues.
 *
 * @param {Object} props.finding - Finding data object
 * @param {function} props.onClick - Click callback
 * @param {boolean} props.compact - Compact layout
 * @param {boolean} props.showRemediation - Show remediation info
 */

import React from 'react';
import SeverityBadge from '../atoms/SeverityBadge';
import StatusIcon from '../atoms/StatusIcon';
import Badge from '../atoms/Badge';
import { formatDateRelative } from '../shared/formatters';

const FindingCard = ({ finding, onClick, compact = false, showRemediation = true }) => {
  const severityConfig = {
    Critical: { color: '#EF4545', icon: '🚨' },
    High: { color: '#F5A623', icon: '⚠️' },
    Medium: { color: '#3B9EFF', icon: '⚡' },
    Low: { color: '#0FBB80', icon: 'ℹ️' }
  };

  const config = severityConfig[finding.severity] || severityConfig.Low;

  return (
    <div
      onClick={onClick}
      style={{
        border: `1.5px solid ${finding.severity === 'Critical' ? config.color + '40' : '#E5E7EB'}`,
        borderLeft: finding.severity === 'Critical' ? `4px solid ${config.color}` : '1px solid #E5E7EB',
        borderRadius: 8,
        padding: compact ? 12 : 16,
        backgroundColor: '#FFFFFF',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        ':hover': onClick
          ? {
              borderColor: config.color,
              boxShadow: `0 4px 12px ${config.color}20`
            }
          : {}
      }}
      onMouseOver={(e) => {
        if (onClick) {
          e.target.style.borderColor = config.color;
          e.target.style.boxShadow = `0 4px 12px ${config.color}20`;
        }
      }}
      onMouseOut={(e) => {
        e.target.style.borderColor = finding.severity === 'Critical' ? config.color + '40' : '#E5E7EB';
        e.target.style.boxShadow = 'none';
      }}
    >
      {/* Header with severity, title, and status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 12
        }}
      >
        {/* Severity icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: `${config.color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0
          }}
        >
          {config.icon}
        </div>

        {/* Title and metadata */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 8,
              marginBottom: 4
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 700,
                color: '#111827',
                flex: 1,
                lineHeight: 1.3
              }}
            >
              {finding.title || finding.name}
            </h3>
            <SeverityBadge severity={finding.severity} size="sm" />
          </div>

          {/* Finding ID and date */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              fontSize: 10,
              color: '#6B7280'
            }}
          >
            <span>ID: {finding.id}</span>
            {finding.detectedDate && (
              <span>Detected: {formatDateRelative(finding.detectedDate)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {!compact && finding.description && (
        <div
          style={{
            fontSize: 11,
            color: '#6B7280',
            marginBottom: 12,
            lineHeight: 1.4
          }}
        >
          {finding.description}
        </div>
      )}

      {/* Affected assets */}
      {finding.assets && finding.assets.length > 0 && (
        <div
          style={{
            marginBottom: 12,
            paddingBottom: 12,
            borderBottom: '1px solid #E5E7EB'
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Affected Assets ({finding.assets.length})
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6
            }}
          >
            {finding.assets.slice(0, 3).map((asset, i) => (
              <Badge key={i} variant="default">
                {asset}
              </Badge>
            ))}
            {finding.assets.length > 3 && (
              <Badge variant="default">+{finding.assets.length - 3} more</Badge>
            )}
          </div>
        </div>
      )}

      {/* Remediation info */}
      {showRemediation && finding.remediation && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              Remediation
            </div>
            <div style={{ fontSize: 10, color: '#6B7280' }}>
              {finding.remediation.action || finding.remediation.recommendation}
            </div>
          </div>

          {/* Status and assignee */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusIcon status={finding.status || 'pending'} size={14} />
            {finding.assignee && (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: '#F5A623',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#FFFFFF'
                }}
              >
                {finding.assignee.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FindingCard;
