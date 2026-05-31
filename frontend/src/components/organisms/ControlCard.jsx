/**
 * ControlCard Component
 *
 * Displays compliance control with score, status, and evidence.
 * Used for HIPAA, NIST, ISO, and other framework controls.
 *
 * @param {Object} props.control - Control data object
 * @param {function} props.onClick - Click callback
 * @param {boolean} props.showEvidence - Show evidence count
 * @param {boolean} props.showFinding - Show linked finding
 */

import React from 'react';
import { CMMIBadge } from '../atoms/CMMIBadge';
import StatusIcon from '../atoms/StatusIcon';
import Badge from '../atoms/Badge';

const ControlCard = ({ control, onClick, showEvidence = true, showFinding = true }) => {
  const scoreColor = control.score >= 80 ? '#0FBB80' : control.score >= 60 ? '#F5A623' : '#EF4545';

  return (
    <div
      onClick={onClick}
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        padding: 16,
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
      {/* Header with reference and score */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12
        }}
      >
        {/* Control reference and name */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#6B7280',
                fontFamily: 'monospace'
              }}
            >
              {control.ref || control.id}
            </span>
            {control.framework && (
              <Badge variant="info" style={{ fontSize: 8 }}>
                {control.framework}
              </Badge>
            )}
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 600,
              color: '#111827',
              lineHeight: 1.3
            }}
          >
            {control.name || control.title}
          </h3>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: scoreColor,
              lineHeight: 1
            }}
          >
            {control.score}
          </div>
          <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>
            SCORE
          </div>
        </div>
      </div>

      {/* CMMI Badge */}
      <div style={{ marginBottom: 12 }}>
        <CMMIBadge score={control.score} size="sm" />
      </div>

      {/* Status indicators */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid #E5E7EB'
        }}
      >
        {/* Implementation status */}
        {control.implementationStatus && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusIcon
              status={
                control.implementationStatus === 'Implemented'
                  ? 'complete'
                  : control.implementationStatus === 'Partial'
                  ? 'warning'
                  : 'pending'
              }
              size={12}
            />
            <span style={{ fontSize: 10, color: '#6B7280' }}>
              {control.implementationStatus}
            </span>
          </div>
        )}

        {/* Evidence count */}
        {showEvidence && control.evidenceCount !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12 }}>📁</span>
            <span style={{ fontSize: 10, color: '#6B7280' }}>
              {control.evidenceCount} evidence
            </span>
          </div>
        )}

        {/* Linked finding */}
        {showFinding && control.finding && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Badge variant="danger" dot />
            <span style={{ fontSize: 10, color: '#EF4545', fontWeight: 600 }}>
              Finding linked
            </span>
          </div>
        )}

        {/* Test status */}
        {control.testStatus && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusIcon
              status={
                control.testStatus === 'Passed'
                  ? 'success'
                  : control.testStatus === 'Failed'
                  ? 'error'
                  : 'warning'
              }
              size={12}
            />
            <span style={{ fontSize: 10, color: '#6B7280' }}>
              {control.testStatus}
            </span>
          </div>
        )}
      </div>

      {/* Last tested date */}
      {control.lastTested && (
        <div
          style={{
            marginTop: 8,
            fontSize: 9,
            color: '#9CA3AF'
          }}
        >
          Last tested: {new Date(control.lastTested).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default ControlCard;
