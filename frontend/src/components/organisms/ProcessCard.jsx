/**
 * ProcessCard Component
 *
 * Displays business process information with health score,
 * risk indicators, and trend visualization.
 * Used across CISO, CIO, and CLO dashboards.
 *
 * @param {Object} props.process - Process data object
 * @param {function} props.onClick - Click callback
 * @param {boolean} props.compact - Compact layout
 * @param {boolean} props.showTrend - Show trend chart
 */

import React from 'react';
import { CMMIBadge, CMMIBar } from '../atoms/CMMIBadge';
import StatusIcon from '../atoms/StatusIcon';
import Badge from '../atoms/Badge';

const ProcessCard = ({ process, onClick, compact = false, showTrend = true }) => {
  const healthColor = process.score >= 80 ? '#0FBB80' : process.score >= 60 ? '#F5A623' : '#EF4545';

  return (
    <div
      onClick={onClick}
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        padding: compact ? 12 : 16,
        backgroundColor: '#FFFFFF',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        ':hover': onClick
          ? {
              borderColor: '#D1D5DB',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
            }
          : {}
      }}
      onMouseOver={(e) => {
        if (onClick) {
          e.target.style.borderColor = '#D1D5DB';
          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        }
      }}
      onMouseOut={(e) => {
        e.target.style.borderColor = '#E5E7EB';
        e.target.style.boxShadow = 'none';
      }}
    >
      {/* Header with icon, name, and score */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 12
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: `${healthColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0
          }}
        >
          {process.icon || '⚕'}
        </div>

        {/* Name and score */}
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
                fontSize: 13,
                fontWeight: 700,
                color: '#111827',
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {process.name}
            </h3>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: healthColor,
                flexShrink: 0,
                lineHeight: 1
              }}
            >
              {process.score}
            </div>
          </div>

          {/* Business line */}
          {process.bizLine && (
            <div
              style={{
                fontSize: 10,
                color: '#6B7280',
                marginBottom: 6
              }}
            >
              {process.bizLine}
            </div>
          )}

          {/* CMMI Badge */}
          <CMMIBadge score={process.score} size="sm" />
        </div>
      </div>

      {/* CMMI Bar */}
      <CMMIBar score={process.score} width="100%" />

      {/* Critical and High findings */}
      {(process.crits > 0 || process.highs > 0) && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid #E5E7EB'
          }}
        >
          {process.crits > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Badge variant="danger" dot />
              <span style={{ fontSize: 10, color: '#EF4545', fontWeight: 600 }}>
                {process.crits} Critical
              </span>
            </div>
          )}
          {process.highs > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Badge variant="warning" dot />
              <span style={{ fontSize: 10, color: '#F5A623', fontWeight: 600 }}>
                {process.highs} High
              </span>
            </div>
          )}
        </div>
      )}

      {/* Trend visualization */}
      {showTrend && process.trend && !compact && (
        <div
          style={{
            marginTop: 12,
            height: 40,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 2,
            opacity: 0.7
          }}
        >
          {process.trend.slice(0, 30).map((val, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${(val / 100) * 100}%`,
                backgroundColor:
                  val >= 80 ? '#0FBB80' : val >= 60 ? '#F5A623' : '#EF4545',
                borderRadius: 2,
                minWidth: 2
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProcessCard;
