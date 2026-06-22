/**
 * BusinessProcessCard Component
 *
 * Displays a single business process summary with:
 * - Tier badge and criticality indicator
 * - Owner information
 * - Linked systems, data objects, and controls counts
 * - Health score with CMMI badge
 * - Control coverage visualization
 * - Click handler for viewing details
 *
 * @param {Object} props
 * @param {Object} props.process - Business process data
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.compact - Compact layout mode
 */

import React from 'react';
import { CMMIBadge, CMMIBar } from '../atoms/CMMIBadge';
import StatusIcon from '../atoms/StatusIcon';
import Badge from '../atoms/Badge';

const BusinessProcessCard = ({ process, onClick, compact = false }) => {
  if (!process) return null;

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'Critical': return '#EF4545';
      case 'High': return '#F5A623';
      case 'Medium': return '#FFC107';
      case 'Low': return '#0FBB80';
      default: return '#6B7280';
    }
  };

  const getTierColor = (tier) => {
    return tier === 'Primary' ? '#1E40AF' : '#243044';
  };

  const healthScore = process.healthScore || 0;
  const healthColor = healthScore >= 80 ? '#0FBB80' : healthScore >= 60 ? '#F5A623' : '#EF4545';

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
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}
      onMouseOver={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = '#D1D5DB';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = '#E5E7EB';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header with icon, name, tier, and criticality */}
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
            width: compact ? 36 : 40,
            height: compact ? 36 : 40,
            borderRadius: 8,
            backgroundColor: `${healthColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: compact ? 18 : 20,
            flexShrink: 0
          }}
        >
          {process.icon || '⚙️'}
        </div>

        {/* Name, badges, and score */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 8,
              marginBottom: 6
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: compact ? 13 : 14,
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

            {/* Health Score */}
            <div
              style={{
                fontSize: compact ? 16 : 18,
                fontWeight: 700,
                color: healthColor,
                flexShrink: 0,
                lineHeight: 1
              }}
            >
              {healthScore}
            </div>
          </div>

          {/* Tier and Criticality Badges */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              marginBottom: 8
            }}
          >
            <Badge
              variant="info"
              label={process.tier}
              style={{
                backgroundColor: `${getTierColor(process.tier)}15`,
                color: getTierColor(process.tier),
                fontSize: 10,
                padding: '2px 8px',
                fontWeight: 600
              }}
            />
            <Badge
              variant={process.criticality === 'Critical' ? 'danger' : process.criticality === 'High' ? 'warning' : 'info'}
              label={process.criticality}
              style={{
                backgroundColor: `${getCriticalityColor(process.criticality)}15`,
                color: getCriticalityColor(process.criticality),
                fontSize: 10,
                padding: '2px 8px',
                fontWeight: 600
              }}
            />
            <Badge
              variant="info"
              label={process.owner}
              style={{
                backgroundColor: '#F3F4F6',
                color: '#374151',
                fontSize: 10,
                padding: '2px 8px',
                fontWeight: 600
              }}
            />
          </div>

          {/* CMMI Badge */}
          <CMMIBadge score={healthScore} size="sm" />
        </div>
      </div>

      {/* CMMI Bar */}
      <CMMIBar score={healthScore} width="100%" />

      {/* Description */}
      {!compact && process.description && (
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: '#6B7280',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {process.description}
        </div>
      )}

      {/* Metrics */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid #E5E7EB',
          flexWrap: 'wrap'
        }}
      >
        {/* Systems */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <StatusIcon status="info" size="sm" />
          <div>
            <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Systems
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              {process.supportedBySystems?.length || 0}
            </div>
          </div>
        </div>

        {/* Data Objects */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <StatusIcon status="info" size="sm" />
          <div>
            <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Data Objects
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              {process.createsDataObjects?.length || 0}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <StatusIcon status={process.controlGap > 0 ? 'warning' : 'healthy'} size="sm" />
          <div>
            <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Controls
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: process.controlGap > 0 ? '#EF4545' : '#111827' }}>
              {process.governedByControls?.length || 0}
              {process.controlGap > 0 && (
                <span style={{ color: '#EF4545', marginLeft: 2 }}>
                   (-{process.controlGap})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Control Coverage */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <StatusIcon status={process.controlCoverage >= 80 ? 'healthy' : process.controlCoverage >= 60 ? 'warning' : 'critical'} size="sm" />
          <div>
            <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Coverage
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              {process.controlCoverage || 0}%
            </div>
          </div>
        </div>

        {/* Risks */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <StatusIcon status={process.riskCount > 5 ? 'critical' : process.riskCount > 0 ? 'warning' : 'healthy'} size="sm" />
          <div>
            <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Risks
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
              {process.riskCount || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Control Gap Warning */}
      {process.controlGap > 0 && !compact && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <StatusIcon status="critical" size="sm" />
          <div style={{ fontSize: 12, color: '#991B1B' }}>
            <strong>Control Gap:</strong> {process.controlGap} more control{process.controlGap > 1 ? 's' : ''} needed for {process.criticality} criticality
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessProcessCard;
